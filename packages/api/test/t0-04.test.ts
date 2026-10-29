import { randomBytes, randomUUID, createHash } from "node:crypto";
import fc from "fast-check";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { commitOutcomeSchema, projectSchema, redeemedInvitationSchema, treatmentPreviewSchema } from "@aiuteur/contract";
import { createPostgresStore } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createHistory } from "@aiuteur/history";
import { sourceMaterialKind } from "@aiuteur/story";
import { createWorkflows } from "@aiuteur/workflows";
import { billedQuantities, canonicalJson, count, NEUTRAL_TEXT_DIALECT, sha256, unwrap } from "@aiuteur/providers";
import { FakeMailer, FAKE_TEXT_PROFILE, ManualClock, syntheticCatalogue, TEST_PRICE_POLICY, uuidv7 } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { freshDatabase, snapshot, testExecution } from "./database.ts";

// T0-04 (#101): a Draft Treatment preview through the API returns the effective Model and
// Offering, the estimate and the exact would-be Rendered request, and writes nothing (P11).

const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const clock = new ManualClock(Date.now());
const ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };
let database: Awaited<ReturnType<typeof freshDatabase>>;
let adapter: Awaited<ReturnType<typeof createBetterAuth>>;
let store: Awaited<ReturnType<typeof createPostgresStore>>;
let run: Awaited<ReturnType<typeof testExecution>>;
let api: ReturnType<typeof createApi>;

beforeAll(async () => {
  database = await freshDatabase();
  run = await testExecution(database, clock, ids);
  adapter = await createBetterAuth({ connectionString: database.url("identity"), baseURL: origin, secret: "synthetic-test-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86400 });
  store = await createPostgresStore(database.url("app"));
  const generous = { max: 1_000_000, windowMs: 60_000 };
  const limit = { address: generous, email: generous };
  const accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: [], mailer: new FakeMailer(), limits: { signIn: limit, recovery: limit, redemption: limit }, recoveryTtlMs: 600_000, recoveryPage: `${origin}/recover`, onMailFailure: (error) => { throw error; } });
  const workflows = createWorkflows({ store, history: createHistory([sourceMaterialKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution });
  api = createApi({ accounts, views: createViews(store), workflows, handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: () => "203.0.113.4" });
});
afterAll(async () => { await run?.close(); await store?.close(); await adapter?.close(); await database?.close(); });

async function call(method: "GET" | "POST", path: string, cookie: string, body?: unknown) {
  return api.request(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": ids.uuid(), cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
/** An isolated Account with one project and one pasted paragraph, through the real #100 path. */
async function creator(text: string) {
  const email = `${ids.uuid()}@example.test`;
  const token = ids.token();
  await adapter.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: clock.now(), expiresAt: clock.now() + 60_000, issuedBy: null, auditId: ids.uuid() });
  const { accountId } = redeemedInvitationSchema.parse(await (await call("POST", "/api/invitations/redeem", "", { token, email, name: "Synthetic creator", password })).json());
  const cookie = (await call("POST", "/api/auth/sign-in/email", "", { email, password })).headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  const base = `/api/studios/${accountId}/projects`;
  const project = projectSchema.parse(await (await call("POST", base, cookie)).json());
  const material = `${base}/${project.projectId}/source-material`;
  const pasted = commitOutcomeSchema.parse(await (await call("POST", material, cookie, { text })).json());
  if (pasted.result !== "Applied") throw new Error("not applied");
  return { accountId, cookie, base, material, object: `${material}/${pasted.revision.objectId}`, revision: pasted.revision };
}

const PARAGRAPH = "Mara runs the night ferry between two islands that no longer speak to each other. “Deliver it,” he says, “or nobody crosses again.”\r\n";

it("demo: Resolve, select, compose, Fit, Render and estimate return the exact would-be request and its price; row counts are unchanged", async () => {
  const c = await creator(PARAGRAPH);
  const before = await snapshot(database.inspect);
  const response = await call("GET", `${c.object}/treatment-preview`, c.cookie);
  expect(response.status).toBe(200);
  const preview = treatmentPreviewSchema.parse(await response.json());
  if (preview.result !== "ready") throw new Error(`expected ready, got ${preview.result}`);

  // Selection before compile: product terms only, with the reasons it skipped the others.
  expect(preview.effectiveModel).toStrictEqual({ operationClass: "text.create", modelId: "fake-text-model", offeringId: "fake-text", profileSnapshotId: FAKE_TEXT_PROFILE.snapshotId, source: "automatic", reasons: [{ code: "default-by-policy" }, { code: "skipped", modelId: "fake-text-undocumented-model", reason: "unknown-identity-critical" }, { code: "skipped", modelId: "fake-text-preview-model", reason: "status" }] });
  expect(preview.versions).toStrictEqual({ compiler: 1, scaffold: { operation: "treatment.draft", version: 1 }, dialect: { id: "neutral-text", version: 1 }, profileSnapshotId: FAKE_TEXT_PROFILE.snapshotId });

  // The exact request: scaffold, then the creator's paragraph byte for byte inside its declared wrapper; no base, no style.
  const request = preview.renderedRequest;
  expect(request.textParts.map((p) => p.layerKey)).toStrictEqual(["scaffold:operation", "source-material"]);
  expect(unwrap(NEUTRAL_TEXT_DIALECT, "source-material", request.textParts[1]!.text)).toBe(PARAGRAPH);
  expect(request.textParts[1]!.layerDigest).toBe(sha256(PARAGRAPH));
  expect(request).toMatchObject({ mediaParts: [], parameters: { maxOutputTokens: 2048 }, rewrites: [] });

  // One compile: the estimate prices exactly the returned request (its digest, its counted input, its output maximum).
  const rule = FAKE_TEXT_PROFILE.cost.billedQuantity;
  if (rule.state !== "declared") throw new Error("rule");
  expect({ digest: preview.digest, priced: preview.estimate.basis.requestDigest, quantities: preview.estimate.basis.quantities, counted: preview.fit.promptLimit.state === "declared" ? preview.fit.promptLimit.counted : null })
    .toStrictEqual({ digest: sha256(canonicalJson(request)), priced: sha256(canonicalJson(request)), quantities: billedQuantities(rule.value, request), counted: request.textParts.reduce((n, p) => n + count(p.text, "utf8-bytes"), 0) });
  const input = request.textParts.reduce((n, p) => n + count(p.text, "utf8-bytes"), 0);
  expect(preview.estimate).toMatchObject({ form: "range", currency: "USD", minMicros: Math.floor(input * 3), maxMicros: Math.ceil(input * 3) + 30_720 });

  expect(await snapshot(database.inspect)).toStrictEqual(before);
});

it("Resolve reads the current head: after a role change the captured Revision moves, the request does not", async () => {
  const c = await creator(PARAGRAPH);
  const first = treatmentPreviewSchema.parse(await (await call("GET", `${c.object}/treatment-preview`, c.cookie)).json());
  expect((await call("POST", `${c.object}/role`, c.cookie, { base: 1, role: "supporting" })).status).toBe(201);
  const second = treatmentPreviewSchema.parse(await (await call("GET", `${c.object}/treatment-preview`, c.cookie)).json());
  if (first.result !== "ready" || second.result !== "ready") throw new Error("not ready");
  // The role is a descriptor, not the content slice: same fingerprint, same request bytes, same digest.
  expect(second.digest).toBe(first.digest);
  expect(second.renderedRequest).toStrictEqual(first.renderedRequest);
});

it("P11: previews and estimates create no record, across repeated previews interleaved with other reads, on real PostgreSQL", async () => {
  const a = await creator(PARAGRAPH);
  const b = await creator("A second creator's paragraph.");
  await call("POST", `${a.object}/role`, a.cookie, { base: 1, role: "supporting" });
  await call("POST", `${a.object}/role`, a.cookie, { base: 1, role: "primary" }); // a stale write: the side line has a row
  const { rows: schemas } = await database.inspect.query<{ schema: string }>("SELECT DISTINCT n.nspname AS schema FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname NOT LIKE 'pg\\_%' AND n.nspname <> 'information_schema' ORDER BY 1");
  // The snapshot covers every schema that holds records (the migrations ledger lives in public and is not a record).
  expect(schemas.map((s) => s.schema).filter((s) => s !== "public")).toStrictEqual(["accounts", "auth", "operator"]);
  const reads = [
    [a, `${a.object}/treatment-preview`], [a, `${a.object}/treatment-preview`], [b, `${b.object}/treatment-preview`],
    [a, `${a.material}/${ids.ordered()}/treatment-preview`], [b, `${a.object}/treatment-preview`.replace(a.accountId, b.accountId)],
    [a, a.object], [a, `${a.object}/revisions/1`], [b, b.base],
  ] as const;
  const before = await snapshot(database.inspect);
  expect(before.counts["accounts.revision"]).toBeGreaterThan(0);
  expect(before.counts["accounts.attempt"]).toBeGreaterThan(0);
  await fc.assert(fc.asyncProperty(fc.array(fc.nat(reads.length - 1), { minLength: 1, maxLength: 12 }), async (order) => {
    const statuses = await Promise.all(order.map(async (i) => (await call("GET", reads[i]![1], reads[i]![0].cookie)).status));
    expect(statuses.every((s) => s === 200 || s === 404)).toBe(true);
    expect(await snapshot(database.inspect)).toStrictEqual(before);
  }), { numRuns: 10 });
  // A preview of another Account's object, or of a missing one, is the standard not-found and also writes nothing.
  expect((await call("GET", `${a.material}/${ids.ordered()}/treatment-preview`, a.cookie)).status).toBe(404);
  expect(await snapshot(database.inspect)).toStrictEqual(before);
});
