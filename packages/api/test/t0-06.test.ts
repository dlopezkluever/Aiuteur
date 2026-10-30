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
import { Pool } from "pg";
import type { Caps } from "@aiuteur/spend";
import { priceEntries, type SubmitResult } from "@aiuteur/providers";
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
async function world(proposals: readonly RecordedProposal[], options: { beforeSubmit?: (input: SubmitInput) => Promise<void>; workflowStore?: Store; providerCap?: number; caps?: Caps; repairOutcome?: SubmitResult; omitUsage?: "repair" | "all" } = {}) {
  const run = await testExecution(database, clock, ids, proposals, options.beforeSubmit, options.providerCap, options.caps);
  closers.push(run.close);
  // A transport that answers the repair request with a scripted outcome (a Proxy: the real fake still captures nothing for it).
  const { repairOutcome, omitUsage } = options;
  const execution = repairOutcome === undefined && omitUsage === undefined ? run.execution : { ...run.execution, transportFor: (offeringId: string) => {
    const real = run.execution.transportFor(offeringId);
    return real && new Proxy(real, { get: (target, key) => {
      if (key !== "submit") return (target as never)[key];
      return async (input: SubmitInput): Promise<SubmitResult> => {
        const isRepair = input.request.request.textParts.some((part) => part.layerKey === "repair");
        if (isRepair && repairOutcome !== undefined) return repairOutcome;
        const result = await target.submit(input);
        // The provider answers without reporting usage: the cost is the Generation's to compute.
        return omitUsage !== undefined && (omitUsage === "all" || isRepair) && result.outcome === "completed" && result.status.status === "succeeded"
          ? { ...result, status: { ...result.status, reportedCost: null } } : result;
      };
    } }) as typeof real;
  } };
  const workflows = createWorkflows({ store: options.workflowStore ?? store, history: createHistory([sourceMaterialKind, treatmentOptionKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution });
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
const LINE = "\u201cDeliver it, or nobody crosses again.\u201d";
const SOURCE = `Mara runs the night ferry. A passenger boards and says, ${LINE}\n`;
const FIXED = `Mara ferries a stranger who says ${LINE}`;
const ALTERED = "A stranger boards and says, \u201cDeliver it, or somebody crosses again.\u201d";
const RESTYLED = "A stranger boards and says, \u2018Deliver it, or nobody crosses again.\u2019";
const PRICES = priceEntries(syntheticCatalogue(), "fake-text", "text.create");
const utf8 = (text: string) => Buffer.byteLength(text, "utf8");
const microsOf = (quantities: readonly { unit: string; amount: number }[]) => quantities.reduce((sum, q) => { const e = PRICES.find((p) => p.unit === q.unit)!; return sum + Math.ceil((q.amount * e.priceMicros) / e.per); }, 0);
/** The most a run can bill, derived here from the request alone: its input bytes and its declared maximum output. */
const upperOfRequest = (request: GenerationRead["renderedRequest"]) => microsOf([{ unit: "input-token", amount: request.textParts.reduce((n, part) => n + utf8(part.text), 0) }, { unit: "output-token", amount: Number(request.parameters["maxOutputTokens"]) }]);
const wire = (w: World) => w.transport.control.sentWireBodies().map((entry) => new TextDecoder().decode(entry.body));
/** The Source Material moves on while the model works (appended directly: the API keeps originals immutable). */
const moveOn = (account: () => string) => async () => {
  await database.inspect.query(`INSERT INTO accounts.revision (object_id, sequence, account_id, project_id, parent, cause, actor_kind, action_group, generation_id, schema_version, body, body_hash, fingerprints, created_at)
    SELECT object_id, 2, account_id, project_id, 1, cause, actor_kind, action_group, generation_id, schema_version, jsonb_set(body, '{text}', '"Changed while working."'), 'changed', '{"content":"changed"}', created_at FROM accounts.revision WHERE account_id = $1 AND sequence = 1`, [account()]);
};

// Authored adversarial proposals (source kind "synthetic"). They are NOT the staging recordings VERIFICATION §3.5 calls recorded
// proposals: no real adapter exists before T0-11. See the evidence stop-line in change-records/T0-06.md.
describe("guards over authored adversarial proposals", () => {
  it("altered dialogue, and dialogue in another quotation style, are REJECTED after one repair; both raw outputs and verdicts stay on the call log; no Option; no use-anyway route", async () => {
    for (const bad of [ALTERED, RESTYLED]) {
      const w = await world([synthetic(1, bad), synthetic(2, bad)]);
      const c = await pasted(w, SOURCE);
      const generation = generationOf((await draft(w, c)).body);
      expect(generation.outcome).toMatchObject({ outcome: "failed", reason: "rejected:G3:dialogue-not-verbatim", outputs: [] });
      expect(generation.calls.map((call) => [call.index, call.role, call.response, call.verdict])).toEqual([
        [1, "draft", bad, { pass: false, guard: "G3", reason: "dialogue-not-verbatim" }],
        [2, "repair", bad, { pass: false, guard: "G3", reason: "dialogue-not-verbatim" }],
      ]);
      expect(wire(w)).toHaveLength(2);
      expect(await rows("object", c.accountId)).toBe(1); // the Source Material only
    }
  });

  it("the repair is run 2 of the same Generation: a real Job, the exact recorded request through F3, and the wire request equals the recorded one", async () => {
    const seen: { id: string; state: string; run: number; digest: string; sending: string }[] = [];
    const w = await world([synthetic(1, ALTERED), synthetic(2, FIXED)], { beforeSubmit: async (input) => {
      const { rows } = await database.inspect.query("SELECT state, run FROM accounts.job WHERE job_id = $1 AND generation_id = $2", [input.idempotencyKey, input.generationId]);
      seen.push({ id: input.idempotencyKey, state: rows[0]?.state, run: rows[0]?.run, digest: sha256(canonicalJson(input.request.request)), sending: input.request.digest });
    } });
    const c = await pasted(w, SOURCE);
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.outcome).toMatchObject({ outcome: "succeeded", reason: null });
    expect(generation.calls.map((call) => call.role)).toEqual(["draft", "repair"]);
    expect(generation.calls[1]!.verdict).toMatchObject({ pass: true, guards: expect.arrayContaining(["G1", "G2", "G3", "G4", "G7"]) });
    // Two Jobs of one Generation, each submitted from `submitting` under its own id; the ids are the provider keys.
    expect(seen.map((entry) => [entry.run, entry.state])).toEqual([[1, "submitting"], [2, "submitting"]]);
    expect(new Set(seen.map((entry) => entry.id)).size).toBe(2);
    expect(generation.runs.map((run) => [run.run, run.state, run.billed])).toEqual([[1, "succeeded", "yes"], [2, "succeeded", "yes"]]);
    expect(generation.runs[0]!.reason).toBe("repair:G3:dialogue-not-verbatim");
    // Shown equals sent: the second wire body is the recorded repair request, and its digest is the recorded one.
    const repair = generation.calls[1]!;
    expect(repair.renderedRequest!.textParts.at(-1)!.layerKey).toBe("repair");
    expect(wire(w)[1]).toBe(canonicalJson(repair.renderedRequest));
    expect(sha256(wire(w)[1]!)).toBe(repair.requestDigest);
    expect(seen[1]!.sending).toBe(repair.requestDigest);
    expect(repair.requestDigest).not.toBe(generation.digest);
  });

  it("one repair is the bound: a second failure is never retried", async () => {
    const bound = await world([synthetic(1, ALTERED), synthetic(2, ALTERED), synthetic(3, FIXED)]);
    await draft(bound, await pasted(bound, SOURCE));
    expect(wire(bound)).toHaveLength(2);
  });

  it("G3 accepts unchanged dialogue, and refuses reordered, omitted and repeated dialogue", async () => {
    const two = "Mara says, \u201cOne.\u201d Then he says, \u201cTwo.\u201d\n";
    const ok = await world([synthetic(1, "She hears \u201cOne.\u201d and later \u201cTwo.\u201d")]);
    expect(generationOf((await draft(ok, await pasted(ok, two))).body).outcome).toMatchObject({ outcome: "succeeded" });
    for (const [bad, reason] of [["\u201cTwo.\u201d then \u201cOne.\u201d", "dialogue-out-of-order"], ["Only \u201cOne.\u201d", "dialogue-not-verbatim"], ["\u201cOne.\u201d \u201cTwo.\u201d \u201cTwo.\u201d", "dialogue-count"]] as const) {
      const w = await world([synthetic(1, bad), synthetic(2, bad)]);
      expect(generationOf((await draft(w, await pasted(w, two))).body).outcome).toMatchObject({ reason: `rejected:G3:${reason}` });
    }
  });

  it("G2: an invented handle is REJECTED", async () => {
    const w = await world([synthetic(1, "See [D12] for the line."), synthetic(2, "See [D12] for the line.")]);
    expect(generationOf((await draft(w, await pasted(w))).body).outcome).toMatchObject({ reason: "rejected:G2:unresolved-handle" });
  });

  it("a non-successful repair stays in the trace and in committed spend: unconfirmed is maybe-billed", async () => {
    const w = await world([synthetic(1, ALTERED)], { repairOutcome: { outcome: "unconfirmed" } });
    const c = await pasted(w, SOURCE);
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.outcome).toMatchObject({ outcome: "failed", reason: "rejected:G3:dialogue-not-verbatim", outputs: [] });
    expect(generation.calls.map((call) => [call.index, call.role, call.response, call.renderedRequest?.textParts.at(-1)?.layerKey ?? null])).toEqual([[1, "draft", ALTERED, null], [2, "repair", null, "repair"]]);
    expect(generation.runs.map((run) => [run.run, run.state, run.billed, run.reason])).toEqual([[1, "succeeded", "yes", "repair:G3:dialogue-not-verbatim"], [2, "failed", "maybe", "submission_unconfirmed"]]);
    expect(generation.outcome!.actual).toMatchObject({ form: "reported" }); // the draft's reported cost survives
    const scope = (await accounts.resolveScope((await accounts.authenticate(new Headers({ cookie: c.cookie })))!))!;
    const facts = await store.read(scope, (tx) => tx.spendFacts(new Date(0).toISOString()));
    expect(facts).toEqual([expect.objectContaining({ generationId: generation.generationId, countedMicros: microsOf(generation.calls[0]!.reportedCost!) + upperOfRequest(generation.calls[1]!.renderedRequest!) })]);
  });

  it("a refused repair keeps its provider reason and billing on the run history", async () => {
    const w = await world([synthetic(1, ALTERED)], { repairOutcome: { outcome: "refused", failureClass: "transient-maybe-billed", billed: "maybe", providerReason: "overloaded" } });
    const generation = generationOf((await draft(w, await pasted(w, SOURCE))).body);
    expect(generation.runs[1]).toMatchObject({ run: 2, state: "failed", failureClass: "transient-maybe-billed", billed: "maybe", reason: "overloaded" });
    expect(generation.outcome).toMatchObject({ outcome: "failed", reason: "rejected:G3:dialogue-not-verbatim" });
  });

  it("HELD: when the base changed while the call ran, the paid output is stored as an Option linked to the Generation, nothing is applied, and the Generation settles succeeded", async () => {
    let account = "";
    const w = await world([synthetic(1, GOOD)], { beforeSubmit: moveOn(() => account) });
    const c = await pasted(w);
    account = c.accountId;
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.outcome).toMatchObject({ outcome: "succeeded", reason: "held:G4:base-changed", outputs: [expect.objectContaining({ kind: "option", sequence: 1 })] });
    expect(generation.calls).toEqual([expect.objectContaining({ response: GOOD, verdict: { pass: "held", guard: "G4", reason: "base-changed" } })]);
    const option = treatmentOptionReadSchema.parse(await (await w.call("GET", `${c.base}/treatment-options/${generation.outcome!.outputs[0]!.objectId}`, c.cookie)).json());
    expect(option).toMatchObject({ generationId: generation.generationId, chosen: false });
    expect(option.document.blocks).toHaveLength(2);
    expect(wire(w)).toHaveLength(1);
  });

  it("a stale base prevents the repair call: the refused proposal is retained as a held Option that cannot be chosen", async () => {
    let account = "";
    // Only step 1 is recorded: a repair call would fail the scenario.
    const w = await world([synthetic(1, ALTERED)], { beforeSubmit: moveOn(() => account) });
    const c = await pasted(w, SOURCE);
    account = c.accountId;
    const generation = generationOf((await draft(w, c)).body);
    expect(wire(w)).toHaveLength(1);
    expect(generation.runs).toHaveLength(1);
    expect(generation.calls).toEqual([expect.objectContaining({ role: "draft", response: ALTERED, verdict: { pass: false, guard: "G3", reason: "dialogue-not-verbatim" } })]);
    expect(generation.outcome).toMatchObject({ outcome: "succeeded", reason: "held:G4:base-changed" });
    const option = generation.outcome!.outputs[0]!.objectId;
    const chosen = await w.call("POST", `${c.base}/treatment-options/${option}/choose`, c.cookie, {});
    expect(chosen.status).toBe(422);
    expect(await chosen.json()).toEqual({ result: "Refused", reason: "invariant-violated" });
  });
});

describe("spend.admit", () => {
  async function upper(w: World, c: { source: string; cookie: string }) {
    const preview = treatmentPreviewSchema.parse(await (await w.call("GET", `${c.source}/treatment-preview`, c.cookie)).json());
    if (preview.result !== "ready" || preview.estimate.form !== "range") throw new Error("expected a range estimate");
    return preview.estimate.maxMicros;
  }
  /** A pasted project whose Account has explicitly configured its timezone (caps have no period without one). */
  async function zoned(w: World, timeZone: string | null = "America/Chicago") {
    const c = await pasted(w);
    const scope = (await accounts.resolveScope((await accounts.authenticate(new Headers({ cookie: c.cookie })))!))!;
    if (timeZone !== null) await store.write(scope, (tx) => tx.putSettings({ treatmentOptionCount: 3, timeZone }));
    return c;
  }
  const none = (c: { accountId: string }) => Promise.all(["generation", "job", "capture", "generation_call"].map((t) => rows(t, c.accountId)));

  it("an over-cap request creates no Generation, Job or capture and sends nothing; the creator cap offers no Start", async () => {
    const probe = await world([]);
    const max = await upper(probe, await pasted(probe));
    expect(max).toBeGreaterThan(1);
    const w = await world([synthetic(1, GOOD)], { caps: { ...NO_CAPS, creator: { dailyMicros: max - 1, monthlyMicros: null, perActionMicros: null } } });
    const c = await zoned(w);
    const { status, body } = await draft(w, c);
    expect(status).toBe(422);
    expect(body).toEqual({ result: "cap-reached", cap: "daily", remainingMicros: max - 1 });
    expect(await none(c)).toEqual([0, 0, 0, 0]);
    expect(w.transport.control.sentWireBodies()).toHaveLength(0);
    const action = await world([], { caps: { ...NO_CAPS, creator: { dailyMicros: null, monthlyMicros: null, perActionMicros: max - 1 } } });
    expect((await draft(action, await zoned(action))).body).toMatchObject({ result: "cap-reached", cap: "action" });
  });

  it("the hidden ceiling refuses as a studio limit, whatever the creator cap", async () => {
    const probe = await world([]);
    const max = await upper(probe, await pasted(probe));
    const w = await world([], { caps: { creator: { dailyMicros: 10 * max, monthlyMicros: null, perActionMicros: null }, ceiling: { dailyMicros: null, monthlyMicros: max - 1 } } });
    const c = await zoned(w);
    expect((await draft(w, c)).body).toEqual({ result: "studio-limit" });
    expect(await none(c)).toEqual([0, 0, 0, 0]);
  });

  it("cap race: two simultaneous creations never jointly exceed the cap", async () => {
    const probe = await world([]);
    const max = await upper(probe, await pasted(probe));
    const w = await world([synthetic(1, GOOD), synthetic(2, GOOD)], { caps: { ...NO_CAPS, creator: { dailyMicros: max, monthlyMicros: null, perActionMicros: null } } });
    const c = await zoned(w);
    const second = commitOutcomeSchema.parse(await (await w.call("POST", `${c.base}/source-material`, c.cookie, { text: "Another, different story." })).json());
    if (second.result !== "Applied") throw new Error("not applied");
    const other = `${c.base}/source-material/${second.revision.objectId}`;
    const results = await Promise.all([draft(w, c), draft(w, { ...c, source: other })]);
    expect(results.map((r) => r.body.result).sort()).toEqual(["cap-reached", "generation"]);
    expect(await rows("generation", c.accountId)).toBe(1);
    expect(await rows("job", c.accountId)).toBe(1);
    expect(w.transport.control.sentWireBodies()).toHaveLength(1);
  });

  it("an Account with a cap but no configured timezone creates nothing (no default is invented)", async () => {
    const w = await world([synthetic(1, GOOD)], { caps: { ...NO_CAPS, creator: { dailyMicros: 1_000_000_000, monthlyMicros: null, perActionMicros: null } } });
    const c = await zoned(w, null);
    expect((await w.call("POST", `${c.source}/treatment-drafts`, c.cookie, {})).status).toBe(500);
    expect(await none(c)).toEqual([0, 0, 0, 0]);
    expect(w.transport.control.sentWireBodies()).toHaveLength(0);
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

describe("a Generation's actual cost covers every run once (BUSINESS §4.4, §5.3, §6.3)", () => {
  const entries = priceEntries(syntheticCatalogue(), "fake-text", "text.create");
  const micros = (quantities: readonly { unit: string; amount: number }[]) => quantities.reduce((sum, q) => {
    const entry = entries.find((e) => e.unit === q.unit)!;
    return sum + Math.ceil((q.amount * entry.priceMicros) / entry.per);
  }, 0);
  const bytes = (text: string) => Buffer.byteLength(text, "utf8");
  /** What a run's own Rendered request and answer bill (fake-text counts UTF-8 bytes): input is every text part sent, output the response. */
  const billed = (request: GenerationRead["renderedRequest"], response: string) => [
    { unit: "input-token", amount: request.textParts.reduce((n, part) => n + bytes(part.text), 0) },
    { unit: "output-token", amount: bytes(response) },
  ];
  async function scopeOf(cookie: string) { return (await accounts.resolveScope((await accounts.authenticate(new Headers({ cookie })))!))!; }
  async function upperOf(w: World, c: { source: string; cookie: string }) {
    const preview = treatmentPreviewSchema.parse(await (await w.call("GET", `${c.source}/treatment-preview`, c.cookie)).json());
    if (preview.result !== "ready" || preview.estimate.form !== "range") throw new Error("expected a range estimate");
    return preview.estimate.maxMicros;
  }

  it("a repair run that omits usage is COMPUTED from its own request and answer; the settled actual is run 1 reported plus run 2 computed, and the next admission sees exactly that", async () => {
    const w = await world([synthetic(1, ALTERED), synthetic(2, FIXED)], { omitUsage: "repair" });
    const c = await pasted(w, SOURCE);
    const scope = await scopeOf(c.cookie);
    await store.write(scope, (tx) => tx.putSettings({ treatmentOptionCount: 3, timeZone: "America/Chicago" }));
    const generation = generationOf((await draft(w, c)).body);
    const [first, repair] = generation.calls;
    expect(first!.reportedCost).not.toBeNull();
    expect(repair!.reportedCost).toBeNull();
    const run1 = micros(first!.reportedCost!);
    const run2 = micros(billed(repair!.renderedRequest!, FIXED));
    expect(run2).toBeGreaterThan(0);
    expect(generation.outcome!.actual).toMatchObject({ form: "computed", amountMicros: run1 + run2 });
    const committedMicros = run1 + run2;

    // The next request near the Account's cap, through the real creating transaction. Same inputs, a new action id: the first has settled.
    const upper = await upperOf(w, c);
    const tight = await world([synthetic(1, FIXED)], { caps: { ...NO_CAPS, creator: { dailyMicros: committedMicros + upper - 1, monthlyMicros: null, perActionMicros: null } } });
    const refused = await draft(tight, c);
    expect(refused.body).toEqual({ result: "cap-reached", cap: "daily", remainingMicros: upper - 1 });
    expect(await rows("generation", c.accountId)).toBe(1);
    const exact = await world([synthetic(1, FIXED)], { caps: { ...NO_CAPS, creator: { dailyMicros: committedMicros + upper, monthlyMicros: null, perActionMicros: null } } });
    expect((await draft(exact, c)).body.result).toBe("generation");
  });

  it("a fully reported repair counts each run once", async () => {
    const w = await world([synthetic(1, ALTERED), synthetic(2, FIXED)]);
    const generation = generationOf((await draft(w, await pasted(w, SOURCE))).body);
    const [first, repair] = generation.calls;
    expect(generation.outcome!.actual).toMatchObject({ form: "reported", amountMicros: micros(first!.reportedCost!) + micros(repair!.reportedCost!) });
  });

  it("a single run that omits usage is computed from its own request and answer", async () => {
    const w = await world([synthetic(1, GOOD)], { omitUsage: "all" });
    const generation = generationOf((await draft(w, await pasted(w))).body);
    expect(generation.calls[0]!.reportedCost).toBeNull();
    expect(generation.outcome!.actual).toMatchObject({ form: "computed", amountMicros: micros(billed(generation.renderedRequest, GOOD)) });
  });

  it("a repair that FAILS billed yes with no usage counts run 1's reported cost plus the repair's own upper bound, once each; the next admission is exact at both sides of that boundary", async () => {
    const w = await world([synthetic(1, ALTERED)], { repairOutcome: { outcome: "refused", failureClass: "unknown", billed: "yes", providerReason: "billed then failed" } });
    const c = await pasted(w, SOURCE);
    const scope = await scopeOf(c.cookie);
    await store.write(scope, (tx) => tx.putSettings({ treatmentOptionCount: 3, timeZone: "America/Chicago" }));
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.runs.map((run) => [run.run, run.state, run.billed])).toEqual([[1, "succeeded", "yes"], [2, "failed", "yes"]]);
    expect(generation.calls.map((call) => [call.role, call.reportedCost === null])).toEqual([["draft", false], ["repair", true]]);
    const run1 = micros(generation.calls[0]!.reportedCost!);
    const repairUpper = upperOfRequest(generation.calls[1]!.renderedRequest!);
    const originalUpper = await upperOf(w, c);
    expect(repairUpper).toBeGreaterThan(originalUpper); // the repair request carries the refused answer too
    // The Generation's actual is unavailable (the repair's output is only the provider's to say); it is never an invented computed value.
    expect(generation.outcome!.actual).toEqual({ form: "unknown", billed: "yes" });
    const committedMicros = run1 + repairUpper;
    const facts = await store.read(scope, (tx) => tx.spendFacts(new Date(0).toISOString()));
    expect(facts).toEqual([expect.objectContaining({ generationId: generation.generationId, countedMicros: committedMicros })]);

    const next = originalUpper; // the same inputs again: the first has settled, so this is a deliberate new request
    const refused = await world([synthetic(1, FIXED)], { caps: { ...NO_CAPS, creator: { dailyMicros: committedMicros + next - 1, monthlyMicros: null, perActionMicros: null } } });
    expect((await draft(refused, c)).body).toEqual({ result: "cap-reached", cap: "daily", remainingMicros: next - 1 });
    expect(await rows("generation", c.accountId)).toBe(1);
    const admitted = await world([synthetic(1, FIXED)], { caps: { ...NO_CAPS, creator: { dailyMicros: committedMicros + next, monthlyMicros: null, perActionMicros: null } } });
    expect((await draft(admitted, c)).body.result).toBe("generation");
    // Neither omitting the repair (run 1 alone) nor substituting the original estimate for the whole Generation would refuse at the first boundary.
    expect(run1 + next).toBeLessThanOrEqual(committedMicros + next - 1);
    expect(originalUpper + next).toBeLessThanOrEqual(committedMicros + next - 1);
  });

  it("a repair refused with billed no adds nothing beyond run 1", async () => {
    const w = await world([synthetic(1, ALTERED)], { repairOutcome: { outcome: "refused", failureClass: "transient-unbilled", billed: "no", providerReason: "rate limited" } });
    const c = await pasted(w, SOURCE);
    const generation = generationOf((await draft(w, c)).body);
    const facts = await store.read(await scopeOf(c.cookie), (tx) => tx.spendFacts(new Date(0).toISOString()));
    expect(facts[0]).toMatchObject({ countedMicros: micros(generation.calls[0]!.reportedCost!) });
  });

  it("a repair that may have been billed keeps the draft's cost as the actual and its own exposure as a maybe-billed run, counted once each", async () => {
    const w = await world([synthetic(1, ALTERED)], { repairOutcome: { outcome: "unconfirmed" } });
    const c = await pasted(w, SOURCE);
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.outcome!.actual).toMatchObject({ form: "reported", amountMicros: micros(generation.calls[0]!.reportedCost!) });
    const facts = await store.read(await scopeOf(c.cookie), (tx) => tx.spendFacts(new Date(0).toISOString()));
    // Run 1 counts its reported cost once; the maybe-billed repair counts ITS OWN request's upper bound (larger than the original estimate's input), not the Generation's estimate.
    expect(facts[0]).toMatchObject({ countedMicros: micros(generation.calls[0]!.reportedCost!) + upperOfRequest(generation.calls[1]!.renderedRequest!), actual: { amountMicros: micros(generation.calls[0]!.reportedCost!) } });
  });
});

describe("migration 7 is an expand step (PERSISTENCE §10; OPERATIONAL-BASELINE §4.2)", () => {
  it("the previous image's Generation and call writes still succeed on the migrated schema, and the new reader reads what they wrote", async () => {
    const w = await world([synthetic(1, GOOD)]);
    const c = await pasted(w);
    const made = generationOf((await draft(w, c)).body);
    const legacy = uuidv7();
    // The previous image's INSERT column lists (T0-05, 338fc79): they have no input_fingerprint; the call insert has no rendered_request.
    const pool = new Pool({ connectionString: database.url("app") });
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [c.accountId]);
        await client.query(`INSERT INTO accounts.generation (generation_id, account_id, project_id, operation, operation_class, initiation, effective_model, versions, test_provider, resolved_inputs, captured, package, fit_report, rendered_request, request_digest, expected_digest, estimate, target, created_at)
          SELECT $2, account_id, project_id, operation, operation_class, initiation, effective_model, versions, test_provider, resolved_inputs, captured, package, fit_report, rendered_request, request_digest, expected_digest, estimate, target, created_at FROM accounts.generation WHERE generation_id = $1`, [made.generationId, legacy]);
        await client.query(`INSERT INTO accounts.generation_call (generation_id, index, account_id, project_id, role, job_id, request_digest, operation_ref, response, verdict, reported_cost, created_at)
          SELECT $2, index, account_id, project_id, role, job_id, request_digest, operation_ref, response, verdict, reported_cost, created_at FROM accounts.generation_call WHERE generation_id = $1`, [made.generationId, legacy]);
        await client.query(`INSERT INTO accounts.job (job_id, account_id, project_id, generation_id, run, class, provider, state, due_at, deadline_at, lease_token, lease_expires_at, operation_ref, failure_class, billed, reason, created_at, updated_at)
          SELECT $2, account_id, project_id, $3, run, class, provider, state, due_at, deadline_at, lease_token, lease_expires_at, operation_ref, failure_class, billed, reason, created_at, updated_at FROM accounts.job WHERE generation_id = $1`, [made.generationId, uuidv7(), legacy]);
        await client.query("COMMIT");
      } finally { client.release(); }
    } finally { await pool.end(); }
    const scope = (await accounts.resolveScope((await accounts.authenticate(new Headers({ cookie: c.cookie })))!))!;
    const read = generationReadSchema.parse(await createViews(store).generation(scope, c.projectId, legacy as never));
    expect(read.inputFingerprint).toBeNull();
    expect(read.calls[0]!.renderedRequest).toBeNull();
    // A pre-migration Generation has no fingerprint, so it never blocks a new request as "already generating".
    expect(await store.read(scope, (tx) => tx.inProgress("anything"))).toBeNull();
  });
});

it("G10: only an api-minted Initiation reaches generation.create, and the repair path creates no Generation", () => {
  const creators = productSources().filter((f) => /\.insertGeneration\(/.test(f.text)).map((f) => f.path);
  expect(creators).toEqual(["generation/src/record.ts", "store/src/index.ts", "store/src/postgres.ts"].filter((p) => creators.includes(p)));
  expect(creators).toContain("generation/src/record.ts");
  expect(productSources().filter((f) => /\brecord\.create\(/.test(f.text)).map((f) => f.path)).toEqual(["workflows/src/index.ts"]);
  expect(productSources().filter((f) => /\bworkflows\.execute\(/.test(f.text)).map((f) => f.path)).toEqual(["api/src/index.ts"]);
});
