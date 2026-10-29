import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { createApi } from "@aiuteur/api";
import { createHistory } from "@aiuteur/history";
import { createSmtpMailer } from "@aiuteur/mail";
import { createHostedErrorSink, createLogger, createSecretRegistry, type ErrorSink, type Logger } from "@aiuteur/observability";
import { readiness } from "@aiuteur/providers";
import { assertRuntimeRole, createPostgresScheduler, createPostgresStore, type Clock, type Ids } from "@aiuteur/store";
import { sourceMaterialKind, treatmentOptionKind } from "@aiuteur/story";
import { FAKE_TEXT_PROFILE, FakeTransport, syntheticCatalogue, TEST_PRICE_POLICY, testCredential, uuidv7 } from "@aiuteur/testing";
import { createViews } from "@aiuteur/views";
import { createWorkflows, type Execution } from "@aiuteur/workflows";
import { readConfig, type RuntimeConfig } from "../config.ts";
import { createHeartbeat } from "../heartbeat.ts";
import { serve } from "../http.ts";
import { createWebApp } from "../web.ts";
import { runWorker } from "../worker.ts";

/**
 * The staging composition root (R24, R19): the only place the host's environment values, the real adapters and the
 * staging-only doubles meet. Staging serves the fake provider on synthetic data; the production root, which refuses every
 * fake, is a later ticket and is not wired here. Values with no settled default (OPERATIONAL-BASELINE §2.3, RUNTIME-PLATFORM
 * §4.3) are named constants below, for the creator to tune.
 */
const SESSION = { idleSeconds: 24 * 60 * 60, absoluteSeconds: 14 * 24 * 60 * 60 };
const ABUSE = { signIn: { address: { max: 20, windowMs: 15 * 60_000 }, email: { max: 10, windowMs: 15 * 60_000 } }, recovery: { address: { max: 10, windowMs: 60 * 60_000 }, email: { max: 3, windowMs: 60 * 60_000 } }, redemption: { address: { max: 10, windowMs: 60 * 60_000 }, email: { max: 5, windowMs: 60 * 60_000 } } };
const ADMISSION = { accountInFlight: 20, providerInFlight: { [FAKE_TEXT_PROFILE.adapterId]: 100 } };
const TICK_MS = 10_000;
const SHUTDOWN_FLUSH_MS = 3_000;

type Env = Readonly<Record<string, string | undefined>>;
const clock: Clock = { now: () => Date.now() };
const ids: Ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };

function observe(config: RuntimeConfig, write: (line: string) => void): { logger: Logger; sink: ErrorSink } {
  const secrets = createSecretRegistry(config.secretValues);
  const deployment = { environment: config.environment, role: config.role, release: config.release };
  const logger = createLogger({ ...deployment, write, clock, secrets });
  const sink = createHostedErrorSink({ ...deployment, dsn: config.errorSinkDsn, secrets, onFailure: (code) => logger.warn("error-sink.delivery-failed", { code }) });
  return { logger, sink };
}

export interface Running { readonly port: number; stop(): Promise<void> }

/** The `web` role: contract API, deep health, staging fakes. */
export async function composeWeb(env: Env, write: (line: string) => void): Promise<Running> {
  const config = readConfig(env, "web");
  const { logger, sink } = observe(config, write);
  const adapter = await createBetterAuth({ connectionString: config.databases.identity, baseURL: config.origin, secret: config.authSecret, clock, ids, idleSessionSeconds: SESSION.idleSeconds, absoluteSessionSeconds: SESSION.absoluteSeconds });
  const store = await createPostgresStore(config.databases.app);
  const scheduler = await createPostgresScheduler(config.databases.scheduler, { clock, ids, leaseMs: 60_000, admission: ADMISSION });
  const mailer = createSmtpMailer(config.smtp);
  const catalogue = syntheticCatalogue();
  const transport = new FakeTransport({ profile: FAKE_TEXT_PROFILE, clock, webhookSecret: "synthetic-staging-webhook-secret", proposals: [] });
  const execution: Execution = { scheduler, transportFor: (offeringId) => (offeringId === transport.profile.offeringId ? transport : undefined), credential: () => testCredential(), environment: config.environment };
  const accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 7 * 24 * 60 * 60_000, operatorEmails: config.operatorEmails, mailer, limits: ABUSE, recoveryTtlMs: 30 * 60_000, recoveryPage: `${config.origin}/recover`, onMailFailure: () => logger.warn("web.request-failed", { code: "mail-delivery-failed" }) });
  let socketAddress = (_: Request) => "unknown";
  const api = createApi({
    accounts, views: createViews(store), handleAuth: adapter.handle, origin: config.origin, requestId: ids.uuid, now: clock.now,
    workflows: createWorkflows({ store, history: createHistory([sourceMaterialKind, treatmentOptionKind]), clock, ids, catalogue, pricePolicy: TEST_PRICE_POLICY, execution }),
    clientAddress: (request) => (config.clientAddressHeader !== null ? request.headers.get(config.clientAddressHeader)?.split(",").at(-1)?.trim() : undefined) ?? socketAddress(request),
    onUnexpectedError: (error) => { logger.error("web.request-failed", { code: "unexpected-error" }); sink.capture(error, { code: "unexpected-error" }); },
  });
  const probe = new Pool({ connectionString: config.databases.app, max: 1, connectionTimeoutMillis: 3_000 });
  probe.on("error", () => {});
  const app = createWebApp({ api, deep: async () => {
    const database = await probe.query("SELECT 1").then(() => "ok" as const, () => "unreachable" as const);
    const ready = readiness(config.environment, catalogue);
    return { ok: database === "ok" && ready.ready, environment: config.environment, release: config.release, database, fakeOfferings: ready.ready ? 0 : ready.fakeOfferings.length };
  } });
  const listening = await serve({ fetch: (request) => app.fetch(request), port: config.port, onError: (error) => { logger.error("web.request-failed", { code: "unexpected-error" }); sink.capture(error, { code: "unexpected-error" }); } });
  socketAddress = listening.socketAddress;
  logger.info("web.listening");
  return {
    port: listening.port,
    async stop() {
      await listening.close();
      await Promise.allSettled([probe.end(), store.close(), scheduler.close(), adapter.close()]);
      mailer.close();
      logger.info("web.stopped");
      await sink.flush(SHUTDOWN_FLUSH_MS);
    },
  };
}

/** The `worker` role: liveness proof and the external heartbeat. */
export async function composeWorker(env: Env, write: (line: string) => void, intervalMs: number = TICK_MS): Promise<Running & { done: Promise<void> }> {
  const config = readConfig(env, "worker");
  const { logger, sink } = observe(config, write);
  const pool = new Pool({ connectionString: config.databases.scheduler, max: 1, connectionTimeoutMillis: 3_000 });
  pool.on("error", () => {});
  try { await assertRuntimeRole(pool, "scheduler"); } catch (error) { await pool.end(); throw error; }
  const stopping = new AbortController();
  const heartbeat = createHeartbeat({ url: config.heartbeatUrl ?? "" });
  const done = runWorker({ check: async () => { await pool.query("SELECT 1"); }, heartbeat, logger, sink, intervalMs, signal: stopping.signal });
  return {
    port: 0, done,
    async stop() { stopping.abort(); await done; await pool.end(); await sink.flush(SHUTDOWN_FLUSH_MS); },
  };
}
