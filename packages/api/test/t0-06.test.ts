import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { blockSchema, chooseOutcomeSchema, commitOutcomeSchema, draftTreatmentResultSchema, generationReadSchema, projectSchema, redeemedInvitationSchema, treatmentOptionReadSchema, treatmentPreviewSchema, WORKFLOW_OPERATIONS, type GenerationRead, type WorkflowOperation } from "@aiuteur/contract";
import { createPostgresScheduler, createPostgresStore, type Scope, type Store, type WriteTx } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createHistory } from "@aiuteur/history";
import { sourceMaterialKind, treatmentOptionKind } from "@aiuteur/story";
import { createWorkflows, REGISTRY } from "@aiuteur/workflows";
import { canonicalJson, sha256, type SubmitInput } from "@aiuteur/providers";
import { describeSchedulerConformance, FakeMailer, FAKE_TEXT_PROFILE, GP_S_COMMANDS, GP_S_PROPOSALS, ManualClock, syntheticCatalogue, TEST_PRICE_POLICY, uuidv7, type RecordedProposal } from "@aiuteur/testing";
import { createDispatch } from "@aiuteur/generation";
import { createJobs } from "@aiuteur/jobs";
import { createApi } from "@aiuteur/api";
import type { Caps } from "@aiuteur/spend";
import { freshDatabase, snapshot, testExecution, NO_CAPS } from "./database.ts";

// T0-06 (#103): Treatment drafting is guarded (G1 to G4, G7, one bounded repair; REJECTED and HELD keep their output), admitted
// against caps in the creating transaction (spend.admit) and de-duplicated (action id; input fingerprint). Explicit test values only.

const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const clock = new ManualClock(Date.now());
const ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };
const synthetic = (step: number, response: string): RecordedProposal => ({ operation: "treatment.draft", step, response, source: { kind: "synthetic", note: "T0-05 harness case" } });
let database: Awaited<ReturnType<typeof freshDatabase>>;
let adapter: Awaited<ReturnType<typeof createBetterAuth>>;
let store: Awaited<ReturnType<typeof createPostgresStore>>;
let accounts: ReturnType<typeof createAccounts>;
const closers: (() => Promise<void>)[] = [];

beforeAll(async () => {
  database = await freshDatabase();
  adapter = await createBetterAuth({ connectionString: database.url("identity"), baseURL: origin, secret: "synthetic-test-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86400 });
  store = await createPostgresStore(database.url("app"));
  const generous = { max: 1_000_000, windowMs: 60_000 };
  const limit = { address: generous, email: generous };
  accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: [], mailer: new FakeMailer(), limits: { signIn: limit, recovery: limit, redemption: limit }, recoveryTtlMs: 600_000, recoveryPage: `${origin}/recover`, onMailFailure: (error) => { throw error; } });
});
afterAll(async () => { for (const close of closers) await close(); await store?.close(); await adapter?.close(); await database?.close(); });

/** One composition root: a fake text transport with its own recorded proposals, optionally a spy and a faulty Store for workflows. */
async function world(proposals: readonly RecordedProposal[], options: { beforeSubmit?: (input: SubmitInput) => Promise<void>; workflowStore?: Store; providerCap?: number; caps?: Caps } = {}) {
  const run = await testExecution(database, clock, ids, proposals, options.beforeSubmit, options.providerCap, options.caps);
  closers.push(run.close);
  const workflows = createWorkflows({ store: options.workflowStore ?? store, history: createHistory([sourceMaterialKind, treatmentOptionKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution });
  const api = createApi({ accounts, views: createViews(store), workflows, handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: () => "203.0.113.5" });
  const call = (method: "GET" | "POST", path: string, cookie: string, body?: unknown, key: string = ids.uuid()) =>
    api.request(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": key, cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { api, call, transport: run.transport, workflows, execution: run.execution };
}
type World = Awaited<ReturnType<typeof world>>;

/** An isolated Account signed in, through the real #99 path. */
async function creator(w: World) {
  const email = `${ids.uuid()}@example.test`;
  const token = ids.token();
  await adapter.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: clock.now(), expiresAt: clock.now() + 60_000, issuedBy: null, auditId: ids.uuid() });
  const { accountId } = redeemedInvitationSchema.parse(await (await w.call("POST", "/api/invitations/redeem", "", { token, email, name: "Synthetic creator", password })).json());
  const cookie = (await w.call("POST", "/api/auth/sign-in/email", "", { email, password })).headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  return { accountId, cookie, studio: `/api/studios/${accountId}` };
}
/** A project with one pasted paragraph. */
async function pasted(w: World, text = "Mara runs the night ferry between two islands that no longer speak to each other.\n") {
  const c = await creator(w);
  const project = projectSchema.parse(await (await w.call("POST", `${c.studio}/projects`, c.cookie)).json());
  const base = `${c.studio}/projects/${project.projectId}`;
  const paste = commitOutcomeSchema.parse(await (await w.call("POST", `${base}/source-material`, c.cookie, { text })).json());
  if (paste.result !== "Applied") throw new Error("not applied");
  return { ...c, base, projectId: project.projectId, source: `${base}/source-material/${paste.revision.objectId}` };
}
async function draft(w: World, c: { source: string; cookie: string }, key?: string) {
  const response = await w.call("POST", `${c.source}/treatment-drafts`, c.cookie, {}, key);
  return { status: response.status, body: draftTreatmentResultSchema.parse(await response.json()) };
}
function generationOf(result: ReturnType<typeof draftTreatmentResultSchema.parse>): GenerationRead {
  if (result.result !== "generation") throw new Error(`expected a Generation, got ${result.result}`);
  return result.generation;
}


const SOURCES = fileURLToPath(new URL("../../", import.meta.url));
function productSources(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (dir: string): void => { for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path); else if (name.endsWith(".ts")) out.push({ path: relative(SOURCES, path), text: readFileSync(path, "utf8") });
  } };
  for (const pkg of readdirSync(SOURCES)) if (pkg !== "testing") { try { walk(join(SOURCES, pkg, "src")); } catch { /* no src */ } }
  return out;
}
const rows = async (table: string, accountId: string) => Number((await database.inspect.query(`SELECT count(*) AS n FROM accounts.${table} WHERE account_id = $1`, [accountId])).rows[0].n);
const GOOD = "Mara ferries a stranger who carries one letter for two mayors.\n\nShe reads it aloud to both shores at once.";
const SOURCE = "Mara runs the night ferry. A passenger boards and says, \u201cDeliver it, or nobody crosses again.\u201d\n";
const ALTERED = "A stranger boards and says, \u201cDeliver it, or somebody crosses again.\u201d";

describe("VC2 guards over recorded adversarial proposals", () => {
  it("altered dialogue is REJECTED after one repair; both raw outputs and verdicts stay on the call log; no Option; no use-anyway route", async () => {
    const w = await world([synthetic(1, ALTERED), synthetic(2, ALTERED)]);
    const c = await pasted(w, SOURCE);
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.outcome).toMatchObject({ outcome: "failed", reason: "rejected:G3:dialogue-altered", outputs: [] });
    expect(generation.calls.map((call) => [call.index, call.role, call.response, call.verdict])).toEqual([
      [1, "draft", ALTERED, { pass: false, guard: "G3", reason: "dialogue-altered" }],
      [2, "repair", ALTERED, { pass: false, guard: "G3", reason: "dialogue-altered" }],
    ]);
    expect(generation.calls[1]!.renderedRequest!.textParts.at(-1)!.layerKey).toBe("repair");
    expect(w.transport.control.sentWireBodies()).toHaveLength(2);
    expect(await rows("object", c.accountId)).toBe(1); // the Source Material only
  });

  it("one repair is the bound: a malformed draft that the repair fixes lands an Option; a second failure is never retried", async () => {
    const fixed = await world([synthetic(1, ALTERED), synthetic(2, GOOD)]);
    const c = await pasted(fixed, SOURCE);
    const generation = generationOf((await draft(fixed, c)).body);
    expect(generation.outcome).toMatchObject({ outcome: "succeeded" });
    expect(generation.calls.map((call) => call.role)).toEqual(["draft", "repair"]);
    expect(generation.calls[1]!.verdict).toMatchObject({ pass: true, guards: expect.arrayContaining(["G1", "G2", "G3", "G4", "G7"]) });
    expect(generation.runs).toHaveLength(1);
    const bound = await world([synthetic(1, ALTERED), synthetic(2, ALTERED), synthetic(3, GOOD)]);
    const d = await pasted(bound, SOURCE);
    await draft(bound, d);
    expect(bound.transport.control.sentWireBodies()).toHaveLength(2);
  });

  it("G3 accepts verbatim dialogue in source order and refuses a reordered pair", async () => {
    const two = "Mara says, \u201cOne.\u201d Then he says, \u201cTwo.\u201d\n";
    const ok = await world([synthetic(1, "She hears \u201cOne.\u201d and later \u201cTwo.\u201d")]);
    expect(generationOf((await draft(ok, await pasted(ok, two))).body).outcome).toMatchObject({ outcome: "succeeded" });
    const swapped = await world([synthetic(1, "\u201cTwo.\u201d then \u201cOne.\u201d"), synthetic(2, "\u201cTwo.\u201d then \u201cOne.\u201d")]);
    expect(generationOf((await draft(swapped, await pasted(swapped, two))).body).outcome).toMatchObject({ reason: "rejected:G3:dialogue-out-of-order" });
  });

  it("G2: an invented handle is REJECTED", async () => {
    const w = await world([synthetic(1, "See [D12] for the line."), synthetic(2, "See [D12] for the line.")]);
    expect(generationOf((await draft(w, await pasted(w))).body).outcome).toMatchObject({ reason: "rejected:G2:unresolved-handle" });
  });

  it("HELD: when the base changed while the call ran, the output is retained on the call log, nothing is committed, the Generation settles", async () => {
    let c!: Awaited<ReturnType<typeof pasted>>;
    const w = await world([synthetic(1, GOOD)], { beforeSubmit: async () => {
      // The Source Material moves on while the model works (appended directly: the API keeps originals immutable).
      await database.inspect.query(`INSERT INTO accounts.revision (object_id, sequence, account_id, project_id, parent, cause, actor_kind, action_group, generation_id, schema_version, body, body_hash, fingerprints, created_at)
        SELECT object_id, 2, account_id, project_id, 1, cause, actor_kind, action_group, generation_id, schema_version, jsonb_set(body, '{text}', '"Changed while working."'), 'changed', '{"content":"changed"}', created_at FROM accounts.revision WHERE account_id = $1 AND sequence = 1`, [c.accountId]);
    } });
    c = await pasted(w);
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.outcome).toMatchObject({ outcome: "succeeded", reason: "held:G4:base-changed", outputs: [] });
    expect(generation.calls).toEqual([expect.objectContaining({ response: GOOD, verdict: { pass: "held", guard: "G4", reason: "base-changed" } })]);
    expect(await rows("object", c.accountId)).toBe(1);
    expect(w.transport.control.sentWireBodies()).toHaveLength(1);
  });
});

describe("spend.admit", () => {
  async function upper(w: World, c: { source: string; cookie: string }) {
    const preview = treatmentPreviewSchema.parse(await (await w.call("GET", `${c.source}/treatment-preview`, c.cookie)).json());
    if (preview.result !== "ready" || preview.estimate.form !== "range") throw new Error("expected a range estimate");
    return preview.estimate.maxMicros;
  }
  const none = (c: { accountId: string }) => Promise.all(["generation", "job", "capture", "generation_call"].map((t) => rows(t, c.accountId)));

  it("an over-cap request creates no Generation, Job or capture and sends nothing; the creator cap offers no Start", async () => {
    const probe = await world([]);
    const max = await upper(probe, await pasted(probe));
    expect(max).toBeGreaterThan(1);
    const w = await world([synthetic(1, GOOD)], { caps: { ...NO_CAPS, creator: { dailyMicros: max - 1, monthlyMicros: null, perActionMicros: null } } });
    const c = await pasted(w);
    const { status, body } = await draft(w, c);
    expect(status).toBe(422);
    expect(body).toEqual({ result: "cap-reached", cap: "daily", remainingMicros: max - 1 });
    expect(await none(c)).toEqual([0, 0, 0, 0]);
    expect(w.transport.control.sentWireBodies()).toHaveLength(0);
    const action = await world([], { caps: { ...NO_CAPS, creator: { dailyMicros: null, monthlyMicros: null, perActionMicros: max - 1 } } });
    expect((await draft(action, await pasted(action))).body).toMatchObject({ result: "cap-reached", cap: "action" });
  });

  it("the hidden ceiling refuses as a studio limit, whatever the creator cap", async () => {
    const probe = await world([]);
    const max = await upper(probe, await pasted(probe));
    const w = await world([], { caps: { creator: { dailyMicros: 10 * max, monthlyMicros: null, perActionMicros: null }, ceiling: { dailyMicros: null, monthlyMicros: max - 1 } } });
    const c = await pasted(w);
    expect((await draft(w, c)).body).toEqual({ result: "studio-limit" });
    expect(await none(c)).toEqual([0, 0, 0, 0]);
  });

  it("cap race: two simultaneous creations never jointly exceed the cap", async () => {
    const probe = await world([]);
    const max = await upper(probe, await pasted(probe));
    const w = await world([synthetic(1, GOOD), synthetic(2, GOOD)], { caps: { ...NO_CAPS, creator: { dailyMicros: max, monthlyMicros: null, perActionMicros: null } } });
    const c = await pasted(w);
    const second = commitOutcomeSchema.parse(await (await w.call("POST", `${c.base}/source-material`, c.cookie, { text: "Another, different story." })).json());
    if (second.result !== "Applied") throw new Error("not applied");
    const other = `${c.base}/source-material/${second.revision.objectId}`;
    const results = await Promise.all([draft(w, c), draft(w, { ...c, source: other })]);
    expect(results.map((r) => r.body.result).sort()).toEqual(["cap-reached", "generation"]);
    expect(await rows("generation", c.accountId)).toBe(1);
    expect(await rows("job", c.accountId)).toBe(1);
    expect(w.transport.control.sentWireBodies()).toHaveLength(1);
  });
});

describe("duplicate suppression", () => {
  it("the same action id, even concurrently, yields one Generation and one wire request", async () => {
    const w = await world([synthetic(1, GOOD), synthetic(2, GOOD)]);
    const c = await pasted(w);
    const key = ids.uuid();
    const results = await Promise.all([draft(w, c, key), draft(w, c, key), draft(w, c, key)]);
    expect(new Set(results.map((r) => generationOf(r.body).generationId)).size).toBe(1);
    expect(await rows("generation", c.accountId)).toBe(1);
    expect(w.transport.control.sentWireBodies()).toHaveLength(1);
  });

  it("a new action id with identical inputs while the first is in progress is refused as already generating; after it settles it is a deliberate new Generation", async () => {
    const stuck = await world([synthetic(1, GOOD)], { providerCap: 0 });
    const c = await pasted(stuck);
    const first = generationOf((await draft(stuck, c)).body);
    const [a, b] = await Promise.all([draft(stuck, c), draft(stuck, c)]);
    for (const r of [a, b]) { expect(r.status).toBe(409); expect(r.body).toEqual({ result: "already-generating", generationId: first.generationId }); }
    expect(await rows("generation", c.accountId)).toBe(1);
    expect(await rows("job", c.accountId)).toBe(1);
    const w = await world([synthetic(1, GOOD), synthetic(2, GOOD)]);
    const d = await pasted(w);
    const one = generationOf((await draft(w, d)).body);
    const two = generationOf((await draft(w, d)).body);
    expect(two.generationId).not.toBe(one.generationId);
  });
});

it("G10: only an api-minted Initiation reaches generation.create, and the repair path creates no Generation", () => {
  const creators = productSources().filter((f) => /\.insertGeneration\(/.test(f.text)).map((f) => f.path);
  expect(creators).toEqual(["generation/src/record.ts", "store/src/index.ts", "store/src/postgres.ts"].filter((p) => creators.includes(p)));
  expect(creators).toContain("generation/src/record.ts");
  expect(productSources().filter((f) => /\brecord\.create\(/.test(f.text)).map((f) => f.path)).toEqual(["workflows/src/index.ts"]);
  expect(productSources().filter((f) => /\bworkflows\.execute\(/.test(f.text)).map((f) => f.path)).toEqual(["api/src/index.ts"]);
});
