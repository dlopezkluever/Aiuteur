import { randomBytes, randomUUID } from "node:crypto";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { createApi } from "@aiuteur/api";
import { createHistory } from "@aiuteur/history";
import { createPostgresScheduler, createPostgresStore } from "@aiuteur/store";
import { sourceMaterialKind } from "@aiuteur/story";
import { createViews } from "@aiuteur/views";
import { createWorkflows, type Execution } from "@aiuteur/workflows";
import { FAKE_TEXT_PROFILE, FakeMailer, FakeTransport, syntheticCatalogue, TEST_PRICE_POLICY, testCredential, uuidv7 } from "@aiuteur/testing";

/**
 * The CI composition root of `web` (R19: the only place besides tests that wires doubles; R24: where configuration is
 * chosen). Real Postgres under the three runtime roles, the real API, the fake mailer and the fake text provider.
 * `databaseUrl(role)` is the connection string for a runtime role of one database.
 */
export async function composeCi(options: { databaseUrl(role?: string): string; origin: string }) {
  const clock = { now: () => Date.now() };
  const ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };
  const mailer = new FakeMailer();
  const adapter = await createBetterAuth({ connectionString: options.databaseUrl("identity"), baseURL: options.origin, secret: "synthetic-ci-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86_400 });
  const store = await createPostgresStore(options.databaseUrl("app"));
  const scheduler = await createPostgresScheduler(options.databaseUrl("scheduler"), { clock, ids, leaseMs: 60_000, admission: { accountInFlight: 100, providerInFlight: { [FAKE_TEXT_PROFILE.adapterId]: 1_000 } } });
  const transport = new FakeTransport({ profile: FAKE_TEXT_PROFILE, clock, webhookSecret: "synthetic-webhook-secret", proposals: [] });
  const execution: Execution = { scheduler, transportFor: (offeringId) => (offeringId === transport.profile.offeringId ? transport : undefined), credential: () => testCredential(), environment: "local" };
  const window = 60_000;
  // Generous: one browser, one address. The limits themselves are exercised by T0-02's suite.
  const limit = { address: { max: 1_000, windowMs: window }, email: { max: 1_000, windowMs: window } };
  const accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 3_600_000, operatorEmails: [], mailer, limits: { signIn: limit, recovery: limit, redemption: limit }, recoveryTtlMs: 600_000, recoveryPage: `${options.origin}/recover`, onMailFailure: () => undefined });
  const api = createApi({
    accounts, views: createViews(store), workflows: createWorkflows({ store, history: createHistory([sourceMaterialKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution }),
    handleAuth: adapter.handle, origin: options.origin, requestId: ids.uuid, now: () => clock.now(),
    // One local test browser: the trusted edge a deployment would provide does not exist here.
    clientAddress: () => "127.0.0.1",
  });
  return {
    fetch: (request: Request) => api.fetch(request),
    /** Test seam: the invitation the operator would have issued. */
    identity: adapter.identity,
    ids, clock, mailer,
    async close() { await scheduler.close(); await store.close(); await adapter.close(); },
  };
}
