import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { createApi } from "@aiuteur/api";
import { createHistory } from "@aiuteur/history";
import { createSmtpMailer } from "@aiuteur/mail";
import { createHostedErrorSink, createLogger, createSecretRegistry, indexSource, type ErrorSink, type Logger } from "@aiuteur/observability";
import { readiness } from "@aiuteur/providers";
import { createLiveness, createPostgresScheduler, createPostgresStore, type Clock, type Ids } from "@aiuteur/store";
import { sourceMaterialKind, treatmentOptionKind } from "@aiuteur/story";
import { FAKE_TEXT_PROFILE, FakeTransport, syntheticCatalogue, TEST_PRICE_POLICY, testCredential, uuidv7, type RecordedProposal } from "@aiuteur/testing";
import { createViews } from "@aiuteur/views";
import { createWorkflows, type Execution } from "@aiuteur/workflows";
import { readWebConfig, readWorkerConfig, type WebConfig, type WorkerConfig } from "../config.ts";
import { judgeDeep } from "../health.ts";
import { createEventStream } from "../stream.ts";
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
const STREAM = { pollMs: 2_000, keepAliveMs: 20_000 };
/** The model fake's script on staging: one synthetic recorded proposal (VERIFICATION §3.5), replayed from step 1 for every Job. */
const STAGING_PROPOSALS: readonly RecordedProposal[] = [{ operation: "treatment.draft", step: 1, response: "Mara carries the sealed letter across the harbour.\n\nNeither clerk looks up.", source: { kind: "synthetic", note: "staging smoke Treatment draft" } }];
const SHUTDOWN_FLUSH_MS = 3_000;

type Env = Readonly<Record<string, string | undefined>>;
/** The files of this image's own code, indexed once; the ErrorSink reports a stack frame only for one of them. */
const SOURCE = indexSource(fileURLToPath(new URL("../../../..", import.meta.url)));
const clock: Clock = { now: () => Date.now() };
const ids: Ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };

function observe(config: WebConfig | WorkerConfig, write: (line: string) => void): { logger: Logger; sink: ErrorSink } {
  const secrets = createSecretRegistry(config.secretValues);
  const deployment = { environment: config.environment, role: config.role, release: config.release };
  const logger = createLogger({ ...deployment, write, clock, secrets });
  const sink = createHostedErrorSink({ ...deployment, dsn: config.errorSinkDsn, secrets, source: SOURCE, onFailure: (code) => logger.warn("error-sink.delivery-failed", { code }) });
  return { logger, sink };
}

export interface Running { readonly port: number; stop(): Promise<void> }

/** The `web` role: contract API, progress stream, deep health, staging fakes. */
export async function composeWeb(env: Env, write: (line: string) => void): Promise<Running> {
  const config = readWebConfig(env);
  const { logger, sink } = observe(config, write);
  const adapter = await createBetterAuth({ connectionString: config.databases.identity, baseURL: config.origin, secret: config.authSecret, clock, ids, idleSessionSeconds: SESSION.idleSeconds, absoluteSessionSeconds: SESSION.absoluteSeconds });
  const store = await createPostgresStore(config.databases.app);
  const scheduler = await createPostgresScheduler(config.databases.scheduler, { clock, ids, leaseMs: 60_000, admission: ADMISSION });
  const liveness = await createLiveness(config.databases.scheduler);
  const mailer = createSmtpMailer(config.smtp);
  const catalogue = syntheticCatalogue();
  // A text fake replays its recorded proposals once per instance, so each Job gets a fresh one (a text run completes inside one submit).
  const transportFor = (offeringId: string) => (offeringId === FAKE_TEXT_PROFILE.offeringId ? new FakeTransport({ profile: FAKE_TEXT_PROFILE, clock, webhookSecret: "synthetic-staging-webhook-secret", proposals: STAGING_PROPOSALS }) : undefined);
  const execution: Execution = { scheduler, transportFor, credential: () => testCredential(), environment: config.environment };
  const accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 7 * 24 * 60 * 60_000, operatorEmails: config.operatorEmails, mailer, limits: ABUSE, recoveryTtlMs: 30 * 60_000, recoveryPage: `${config.origin}/recover`, onMailFailure: () => logger.warn("web.request-failed", { code: "mail-delivery-failed" }) });
  const report = (error: unknown, requestId: string) => { logger.error("web.request-failed", { code: "unexpected-error", requestId }); sink.capture(error, { code: "unexpected-error", requestId }); };
  let socketAddress = (_: Request) => "unknown";
  const api = createApi({
    accounts, views: createViews(store), handleAuth: adapter.handle, origin: config.origin, requestId: ids.uuid, now: clock.now,
    workflows: createWorkflows({ store, history: createHistory([sourceMaterialKind, treatmentOptionKind]), clock, ids, catalogue, pricePolicy: TEST_PRICE_POLICY, execution }),
    clientAddress: (request) => (config.clientAddressHeader !== null ? request.headers.get(config.clientAddressHeader)?.split(",").at(-1)?.trim() : undefined) ?? socketAddress(request),
    onUnexpectedError: (error, { requestId }) => report(error, requestId),
  });
  const probe = new Pool({ connectionString: config.databases.app, max: 1, connectionTimeoutMillis: 3_000 });
  probe.on("error", () => {});
  const app = createWebApp({ api, routes: createEventStream({ accounts, store, ...STREAM }), deep: async () => {
    const database = await probe.query("SELECT 1").then(() => "ok" as const, () => "unreachable" as const);
    const ready = readiness(config.environment, catalogue);
    const signal = database === "ok" ? await liveness.read().catch((): null => null) : null;
    return judgeDeep({ environment: config.environment, release: config.release, database, fakeOfferings: ready.ready ? 0 : ready.fakeOfferings.length, liveness: signal, workerStaleAfterMs: config.workerStaleAfterMs, overdueAfterMs: config.overdueAfterMs });
  } });
  const listening = await serve({ fetch: (request) => app.fetch(request), port: config.port, onError: (error) => report(error, ids.uuid()) });
  socketAddress = listening.socketAddress;
  logger.info("web.listening");
  return {
    port: listening.port,
    async stop() {
      await listening.close();
      await Promise.allSettled([probe.end(), store.close(), scheduler.close(), liveness.close(), adapter.close()]);
      mailer.close();
      logger.info("web.stopped");
      await sink.flush(SHUTDOWN_FLUSH_MS);
    },
  };
}

/** The `worker` role: the durable tick that `/healthz/deep` reads, and the external heartbeat after each healthy tick. */
export async function composeWorker(env: Env, write: (line: string) => void, intervalMs: number = TICK_MS): Promise<Running & { done: Promise<void> }> {
  const config = readWorkerConfig(env);
  const { logger, sink } = observe(config, write);
  const liveness = await createLiveness(config.schedulerUrl);
  const stopping = new AbortController();
  const heartbeat = createHeartbeat({ url: config.heartbeatUrl });
  const done = runWorker({ check: () => liveness.tick(), heartbeat, logger, sink, intervalMs, signal: stopping.signal });
  return {
    port: 0, done,
    async stop() { stopping.abort(); await done; await liveness.close(); await sink.flush(SHUTDOWN_FLUSH_MS); },
  };
}
