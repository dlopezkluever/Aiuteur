import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { characterReadSchema, entityOutcomeSchema, referenceOutcomeSchema, shotReadSchema, uploadSchema, blockSchema, chooseOutcomeSchema, commitOutcomeSchema, draftTreatmentResultSchema, generationReadSchema, projectSchema, redeemedInvitationSchema, treatmentOptionReadSchema, treatmentPreviewSchema, WORKFLOW_OPERATIONS, type GenerationRead, type WorkflowOperation } from "@aiuteur/contract";
import { createPostgresScheduler, createPostgresStore, fakeGenerationCount, type Scope, type Store, type WriteTx } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createHistory } from "@aiuteur/history";
import { sourceMaterialKind, treatmentOptionKind } from "@aiuteur/story";
import { characterKind } from "@aiuteur/world";
import { shotKind } from "@aiuteur/production";
import { createWorkflows, REGISTRY } from "@aiuteur/workflows";
import { canonicalJson, sha256, type SubmitInput } from "@aiuteur/providers";
import { describeSchedulerConformance, FakeMailer, FAKE_TEXT_PROFILE, GP_S_COMMANDS, GP_S_PROPOSALS, ManualClock, syntheticImage, syntheticCatalogue, TEST_PRICE_POLICY, uuidv7, type RecordedProposal } from "@aiuteur/testing";
import { createDispatch } from "@aiuteur/generation";
import { createJobs } from "@aiuteur/jobs";
import { createApi } from "@aiuteur/api";
import { freshDatabase, snapshot, testExecution, contracted } from "./database.ts";

// T0-05 (#102): Draft Treatment runs end to end on the fake and lands a choosable Option. Through the API: the
// Generation and its Job commit together, the text fast path claims its own Job through the Scheduler port, the one
// dispatch path sends the stored Rendered request through the F3 gate, and settlement lands the Option, the call
// log, the run history, the actual cost and the outbox in one transaction. Choose is a Decision.

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
async function world(proposals: readonly RecordedProposal[], options: { beforeSubmit?: (input: SubmitInput) => Promise<void>; workflowStore?: Store; providerCap?: number } = {}) {
  const run = await testExecution(database, clock, ids, proposals, options.beforeSubmit, options.providerCap);
  closers.push(run.close);
  const workflows = createWorkflows({ store: options.workflowStore ?? store, history: createHistory([sourceMaterialKind, treatmentOptionKind, characterKind, shotKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution, media: run.media });
  const api = contracted(createApi({ accounts, views: createViews(store), workflows, handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: () => "203.0.113.5" }));
  const call = (method: "GET" | "POST", path: string, cookie: string, body?: unknown, key: string = ids.uuid()) =>
    api.request(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": key, cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { api, call, transport: run.transport, workflows, execution: run.execution, media: run.media };
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

describeSchedulerConformance("Postgres, migrated database", async ({ admission }) => {
  // Its own virtual clock, so moving time for leases touches no session in the other tests.
  const virtual = new ManualClock(Date.now());
  const leaseMs = 60_000;
  const make = async () => {
    const made = await createPostgresScheduler(database.url("scheduler"), { clock: virtual, ids, leaseMs, admission });
    closers.push(made.close);
    return made;
  };
  const scheduler = await make();
  const w = await world([]);
  const scope = async (): Promise<Scope> => {
    const c = await creator(w);
    const subject = await accounts.authenticate(new Headers({ cookie: c.cookie }));
    const resolved = subject && await accounts.resolveScope(subject);
    if (!resolved) throw new Error("no scope");
    return resolved;
  };
  // The breaker row's write path (S7) is not built; the seam writes it as the bootstrap role, as the lock seam does.
  const setBreaker = async (provider: string, open: boolean) => {
    await database.inspect.query("INSERT INTO operator.breaker (provider, open, opened_at, updated_at) VALUES ($1, $2, CASE WHEN $2 THEN now() END, now()) ON CONFLICT (provider) DO UPDATE SET open = EXCLUDED.open, opened_at = EXCLUDED.opened_at, updated_at = EXCLUDED.updated_at", [provider, open]);
  };
  return { store, scheduler, clock: virtual, leaseMs, a: await scope(), b: await scope(), setBreaker, another: make };
});

it("demo: Draft Treatment on the fake returns an Option; choose it; the stored Rendered request equals the fake's wire capture", async () => {
  const w = await world([synthetic(1, "Mara carries a stranger's letter across the strait.\n\nNeither mayor will open it first.")]);
  const c = await pasted(w);
  const { status, body } = await draft(w, c);
  expect(status).toBe(201);
  const generation = generationOf(body);
  expect(generation.outcome).toMatchObject({ outcome: "succeeded", reason: null });
  expect(generation.runs).toEqual([expect.objectContaining({ run: 1, state: "succeeded", billed: "yes" })]);
  const output = generation.outcome!.outputs[0]!;

  const option = treatmentOptionReadSchema.parse(await (await w.call("GET", `${c.base}/treatment-options/${output.objectId}`, c.cookie)).json());
  expect(option).toMatchObject({ objectId: output.objectId, sequence: 1, generationId: generation.generationId, chosen: false });
  expect(option.document.blocks.map((block) => block.kind === "paragraph" && block.fields.text.map((r) => [r.text, r.provenance, r.generation]))).toEqual([
    [["Mara carries a stranger's letter across the strait.", "ai_generated", generation.generationId]], [["Neither mayor will open it first.", "ai_generated", generation.generationId]],
  ]);

  const chosen = await w.call("POST", `${c.base}/treatment-options/${output.objectId}/choose`, c.cookie, {});
  expect(chosen.status).toBe(201);
  expect(chooseOutcomeSchema.parse(await chosen.json())).toMatchObject({ result: "Applied", decision: { subject: output.objectId, sequence: 1, type: "choose" } });
  expect(treatmentOptionReadSchema.parse(await (await w.call("GET", `${c.base}/treatment-options/${output.objectId}`, c.cookie)).json()).chosen).toBe(true);

  // Shown equals sent: the bytes the fake captured are the stored request's canonical JSON, and hash to its digest.
  const stored = generationReadSchema.parse(await (await w.call("GET", `${c.base}/generations/${generation.generationId}`, c.cookie)).json());
  const sent = w.transport.control.sentWireBodies().filter((entry) => entry.generationId === generation.generationId);
  expect(sent).toHaveLength(1);
  expect(new TextDecoder().decode(sent[0]!.body)).toBe(canonicalJson(stored.renderedRequest));
  expect(sha256(new TextDecoder().decode(sent[0]!.body))).toBe(stored.digest);
});

/**
 * VC5, the operation harness (VERIFICATION §3.4, §14 step 4), generated from the registry: every operation needs a case
 * here, so an operation cannot join the registry unexercised. Each case is the command for a fresh pasted project.
 */
const HARNESS: { readonly [O in WorkflowOperation]: (c: Awaited<ReturnType<typeof pasted>>) => { readonly path: string; readonly body: unknown } } = {
  "treatment.draft": (c) => ({ path: `${c.source}/treatment-drafts`, body: {} }),
};
const SOURCES = fileURLToPath(new URL("../../", import.meta.url));
/** Every product source file (packages/*\/src, without the testing package). */
function productSources(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (dir: string): void => { for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path); else if (name.endsWith(".ts")) out.push({ path: relative(SOURCES, path), text: readFileSync(path, "utf8") });
  } };
  for (const pkg of readdirSync(SOURCES)) if (pkg !== "testing") { try { walk(join(SOURCES, pkg, "src")); } catch { /* no src */ } }
  return out;
}

describe("VC5 operation harness", () => {
  it("covers exactly the registry", () => {
    expect(Object.keys(REGISTRY).sort()).toEqual([...WORKFLOW_OPERATIONS].sort());
    expect(Object.keys(HARNESS).sort()).toEqual(Object.keys(REGISTRY).sort());
  });

  it("R6: an Initiation is required, and only api mints one", () => {
    // Type level: a plain object with the right fields is not an Initiation (compiled by `pnpm typecheck`, never run).
    const typeOnly = (workflows: World["workflows"]) => workflows.execute(
      // @ts-expect-error R6: only api's `initiate` produces an Initiation
      { accountId: "a", creatorId: "c", actionId: "k", requestId: "r", at: "t" }, "treatment.draft", {});
    expect(typeof typeOnly).toBe("function");
    const minted = productSources().filter((file) => /as (unknown as )?Initiation\b/.test(file.text)).map((file) => file.path);
    expect(minted).toEqual(["api/src/index.ts"]);
    const callers = productSources().filter((file) => /\bworkflows\.execute\(/.test(file.text)).map((file) => file.path);
    expect(callers).toEqual(["api/src/index.ts"]);
  });

  it("R5: one send path; a replayed action sends nothing again", async () => {
    const senders = productSources().filter((file) => /\.submit\(\s*\{/.test(file.text)).map((file) => file.path);
    expect(senders).toEqual(["generation/src/dispatch.ts"]);
    for (const operation of Object.keys(REGISTRY) as WorkflowOperation[]) {
      const w = await world([synthetic(1, "One passage.")]);
      const c = await pasted(w);
      const { path, body } = HARNESS[operation](c);
      const key = ids.uuid();
      const first = draftTreatmentResultSchema.parse(await (await w.call("POST", path, c.cookie, body, key)).json());
      const again = draftTreatmentResultSchema.parse(await (await w.call("POST", path, c.cookie, body, key)).json());
      expect(generationOf(again).generationId).toBe(generationOf(first).generationId);
      expect(w.transport.control.sentWireBodies()).toHaveLength(1);
      expect(Number((await database.inspect.query("SELECT count(*) AS n FROM accounts.generation WHERE account_id = $1", [c.accountId])).rows[0].n)).toBe(1);
    }
  });

  it("P7: the Generation and its Job are recorded, and the Job is submitting, before the first byte is sent", async () => {
    for (const operation of Object.keys(REGISTRY) as WorkflowOperation[]) {
      const seen: unknown[] = [];
      const w = await world([synthetic(1, "One passage.")], {
        beforeSubmit: async (input) => {
          const { rows } = await database.inspect.query("SELECT g.request_digest AS digest, j.state FROM accounts.generation g JOIN accounts.job j ON j.generation_id = g.generation_id WHERE g.generation_id = $1 AND j.job_id = $2", [input.generationId, input.idempotencyKey]);
          seen.push(...rows.map((row) => ({ ...row, sending: input.request.digest })));
        },
      });
      const c = await pasted(w);
      const { path, body } = HARNESS[operation](c);
      generationOf(draftTreatmentResultSchema.parse(await (await w.call("POST", path, c.cookie, body)).json()));
      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatchObject({ state: "submitting" });
      expect((seen[0] as { digest: string }).digest).toBe((seen[0] as { sending: string }).sending);
    }
  });

  it("P1 and P11: the preview shows the request that is recorded and sent; the preview writes nothing", async () => {
    for (const operation of Object.keys(REGISTRY) as WorkflowOperation[]) {
      const w = await world([synthetic(1, "One passage.")]);
      const c = await pasted(w);
      const before = await snapshot(database.inspect);
      const preview = treatmentPreviewSchema.parse(await (await w.call("GET", `${c.source}/treatment-preview`, c.cookie)).json());
      expect(await snapshot(database.inspect)).toStrictEqual(before);
      if (preview.result !== "ready") throw new Error("preview not ready");
      const { path, body } = HARNESS[operation](c);
      const generation = generationOf(draftTreatmentResultSchema.parse(await (await w.call("POST", path, c.cookie, { ...(body as object), expectedDigest: preview.digest })).json()));
      expect(generation.digest).toBe(preview.digest);
      expect(generation.expectedDigest).toBe(preview.digest);
      expect(generation.renderedRequest).toStrictEqual(preview.renderedRequest);
      const [sent] = w.transport.control.sentWireBodies();
      expect(new TextDecoder().decode(sent!.body)).toBe(canonicalJson(preview.renderedRequest));
      // With a Generation now recorded, the preview still writes nothing.
      const after = await snapshot(database.inspect);
      await w.call("GET", `${c.source}/treatment-preview`, c.cookie);
      expect(await snapshot(database.inspect)).toStrictEqual(after);
    }
  });

  it("JOB-LIFECYCLE §2: a queued Job that admission never let in times out with queue_timeout through the same claim and dispatch, sending nothing", async () => {
    // No provider capacity: the fast path's own claim is not admitted, so the Generation stays in progress.
    const w = await world([synthetic(1, "One passage.")], { providerCap: 0 });
    const c = await pasted(w);
    const created = generationOf((await draft(w, c)).body);
    expect(created.outcome).toBeNull();
    expect(created.runs).toEqual([expect.objectContaining({ state: "queued" })]);
    const jobs = createJobs({ scheduler: w.execution.scheduler, clock });
    const dispatch = createDispatch({ store, history: createHistory([sourceMaterialKind, treatmentOptionKind, characterKind, shotKind]), jobs, catalogue: syntheticCatalogue(), transportFor: w.execution.transportFor, credential: w.execution.credential, environment: "local", clock, ids });
    const jobId = created.runs[0]!.jobId as never;
    expect(await jobs.claim(1, jobId)).toEqual([]);
    clock.advance(60 * 60_000);
    const [lease] = await jobs.claim(1, jobId);
    expect(lease).toMatchObject({ stateSeen: "queued" });
    const subject = await accounts.authenticate(new Headers({ cookie: c.cookie }));
    const scope = (await accounts.resolveScope(subject!))!;
    expect(await dispatch(scope, lease!, REGISTRY["treatment.draft"])).toEqual({ result: "settled", generationId: created.generationId });
    const settled = generationReadSchema.parse(await (await w.call("GET", `${c.base}/generations/${created.generationId}`, c.cookie)).json());
    expect(settled.outcome).toMatchObject({ outcome: "failed", reason: "queue_timeout", outputs: [] });
    expect(settled.runs).toEqual([expect.objectContaining({ state: "failed", failureClass: "transient-unbilled", billed: "no", reason: "queue_timeout" })]);
    expect(settled.calls).toEqual([]);
    expect(w.transport.control.sentWireBodies()).toHaveLength(0);
  });

  it("an inspector digest that no longer matches is refused by the gate and sends nothing", async () => {
    const w = await world([synthetic(1, "One passage.")]);
    const c = await pasted(w);
    const generation = generationOf(draftTreatmentResultSchema.parse(await (await w.call("POST", `${c.source}/treatment-drafts`, c.cookie, { expectedDigest: "sha256:stale" })).json()));
    expect(generation.outcome).toMatchObject({ outcome: "failed", reason: expect.stringMatching(/^gate:inspector-digest:/) });
    expect(generation.calls).toEqual([]);
    expect(w.transport.control.sentWireBodies()).toHaveLength(0);
  });

  it("completion is one transaction: a fault while settling leaves no Option, call, run, settlement or event, and the Job unsettled", async () => {
    for (const operation of Object.keys(REGISTRY) as WorkflowOperation[]) {
      // Fault injected at the Store port: the transaction that writes the settlement throws after doing all its writes.
      const faulty: Store = {
        read: (scope, run) => store.read(scope, run),
        write: (scope, run) => store.write(scope, async (tx) => {
          let settling = false;
          const spy = new Proxy(tx, { get(target, key: keyof WriteTx) {
            if (key === "insertSettlement") return async (row: Parameters<WriteTx["insertSettlement"]>[0]) => { settling = true; await target.insertSettlement(row); };
            const value = target[key];
            return typeof value === "function" ? value.bind(target) : value;
          } });
          const result = await run(spy);
          if (settling) throw new Error("injected settle fault");
          return result;
        }),
      };
      const w = await world([synthetic(1, "One passage.")], { workflowStore: faulty });
      const c = await pasted(w);
      const { path, body } = HARNESS[operation](c);
      expect((await w.call("POST", path, c.cookie, body)).status).toBe(500);
      const count = async (table: string, where = "") => Number((await database.inspect.query(`SELECT count(*) AS n FROM accounts.${table} WHERE account_id = $1 ${where}`, [c.accountId])).rows[0].n);
      expect(w.transport.control.sentWireBodies()).toHaveLength(1);
      expect(await count("generation")).toBe(1);
      expect({ option: await count("object", `AND kind = '${treatmentOptionKind.kind}'`), call: await count("generation_call"), run: await count("generation_run"), settlement: await count("generation_settlement"), settled: await count("event", "AND type = 'generation.settled'") })
        .toEqual({ option: 0, call: 0, run: 0, settlement: 0, settled: 0 });
      expect((await database.inspect.query("SELECT state FROM accounts.job WHERE account_id = $1", [c.accountId])).rows).toEqual([{ state: "submitting" }]);
    }
  });

  it("an adversarial proposal (empty) is REJECTED by G1: no Option, the raw output stays on the call log", async () => {
    const raw = "  \n\n\t \n";
    const w = await world([synthetic(1, raw)]);
    const c = await pasted(w);
    const generation = generationOf((await draft(w, c)).body);
    expect(generation.outcome).toMatchObject({ outcome: "failed", reason: "rejected:G1:empty", outputs: [] });
    expect(generation.calls).toEqual([expect.objectContaining({ index: 1, role: "draft", response: raw, verdict: { pass: false, guard: "G1", reason: "empty" } })]);
    expect(Number((await database.inspect.query(`SELECT count(*) AS n FROM accounts.object WHERE account_id = $1 AND kind = '${treatmentOptionKind.kind}'`, [c.accountId])).rows[0].n)).toBe(0);
  });
});

it("EI4: the block document has paragraph and dialogue blocks; a T0a Treatment Option holds paragraphs only", () => {
  const generation = uuidv7();
  const run = { text: "Deliver it.", provenance: "ai_generated", generation };
  const dialogue = { id: uuidv7(), kind: "dialogue", attrs: { speaker: "Passenger" }, fields: { delivery: [], line: [run] } };
  expect(blockSchema.safeParse(dialogue).success).toBe(true);
  expect(blockSchema.safeParse({ ...dialogue, fields: { delivery: [], line: [{ ...run, generation: null }] } }).success).toBe(false);
  expect(treatmentOptionKind.parse({ blocks: [dialogue] })).toBeNull();
});

it("GP-S: the seed project replays as commands through the API and lands a chosen Option", async () => {
  const w = await world(GP_S_PROPOSALS);
  const c = await creator(w);
  const results = new Map<string, { project?: string; object?: string; generation?: GenerationRead }>();
  for (const step of GP_S_COMMANDS) {
    switch (step.command) {
      case "project.create": results.set(step.step, { project: projectSchema.parse(await (await w.call("POST", `${c.studio}/projects`, c.cookie)).json()).projectId }); break;
      case "source-material.paste": {
        const project = results.get("project")!.project!;
        const paste = commitOutcomeSchema.parse(await (await w.call("POST", `${c.studio}/projects/${project}/source-material`, c.cookie, { text: step.text })).json());
        if (paste.result !== "Applied") throw new Error("GP-S paste refused");
        results.set(step.step, { project, object: paste.revision.objectId });
        break;
      }
      case "treatment.draft": {
        const { project, object } = results.get(step.source)!;
        const generation = generationOf(draftTreatmentResultSchema.parse(await (await w.call("POST", `${c.studio}/projects/${project}/source-material/${object}/treatment-drafts`, c.cookie, {})).json()));
        results.set(step.step, { project: project!, object: generation.outcome!.outputs[0]!.objectId, generation });
        break;
      }
      case "treatment-option.choose": {
        const { project, object } = results.get(step.option)!;
        expect((await w.call("POST", `${c.studio}/projects/${project}/treatment-options/${object}/choose`, c.cookie, {})).status).toBe(201);
        break;
      }
      case "character.create": {
        const project = results.get("project")!.project!;
        const made = entityOutcomeSchema.parse(await (await w.call("POST", `${c.studio}/projects/${project}/characters`, c.cookie, { name: step.name })).json());
        if (made.result !== "Applied") throw new Error("GP-S character refused");
        results.set(step.step, { project, object: made.objectId });
        break;
      }
      case "character.reference": {
        const { project, object } = results.get(step.character)!;
        const upload = uploadSchema.parse(await (await w.call("POST", `${c.studio}/projects/${project}/uploads`, c.cookie, {})).json());
        expect((await fetch(upload.link.url, { method: "PUT", body: new Uint8Array(syntheticImage(step.image)), headers: { "content-type": "image/png" } })).status).toBe(200);
        const attached = referenceOutcomeSchema.parse(await (await w.call("POST", `${c.studio}/projects/${project}/characters/${object}/reference`, c.cookie, { uploadId: upload.uploadId })).json());
        if (attached.result !== "Applied") throw new Error(`GP-S reference refused: ${JSON.stringify(attached)}`);
        break;
      }
      case "shot.create": {
        const project = results.get("project")!.project!;
        const presence = step.presence.map((label) => ({ entity: results.get(label)!.object!, look: "base" as const }));
        const made = entityOutcomeSchema.parse(await (await w.call("POST", `${c.studio}/projects/${project}/shots`, c.cookie, { action: step.action, presence })).json());
        if (made.result !== "Applied") throw new Error("GP-S shot refused");
        results.set(step.step, { project, object: made.objectId });
        break;
      }
    }
  }
  // The T0b hand step landed: the Character shows its reference, and the Shot carries that Character's Presence.
  const character = characterReadSchema.parse(await (await w.call("GET", `${c.studio}/projects/${results.get("project")!.project}/characters/${results.get("character")!.object}`, c.cookie)).json());
  expect(character.reference?.media).toMatchObject({ contentType: "image/png", width: 64, height: 48 });
  const shot = shotReadSchema.parse(await (await w.call("GET", `${c.studio}/projects/${results.get("project")!.project}/shots/${results.get("shot")!.object}`, c.cookie)).json());
  expect(shot.presence).toEqual([{ entity: character.objectId, look: "base", name: "Mara" }]);
  const { project, object, generation } = results.get("draft")!;
  const option = treatmentOptionReadSchema.parse(await (await w.call("GET", `${c.studio}/projects/${project}/treatment-options/${object}`, c.cookie)).json());
  expect(option.chosen).toBe(true);
  expect(option.document.blocks).toHaveLength(3);
  expect(generation!.resolvedInputs.sourceMaterial.text).toBe(GP_S_COMMANDS.find((s) => s.command === "source-material.paste")!.text);
});

it("trace fields (R22): every Generation recorded in this run reads back with its full trace", async () => {
  const { rows } = await database.inspect.query<{ account_id: string; project_id: string; generation_id: string; creator_id: string }>("SELECT account_id, project_id, generation_id, initiation->>'creatorId' AS creator_id FROM accounts.generation WHERE request_digest <> 'sha256:conformance' ORDER BY created_at");
  // The Scheduler conformance seeds rows with placeholder content (its subject is the Job row); every other row came from execute.
  expect(rows.length).toBeGreaterThanOrEqual(8);
  const views = createViews(store);
  for (const row of rows) {
    const read = await views.generation({ accountId: row.account_id, creatorId: row.creator_id } as Scope, row.project_id as never, row.generation_id as never);
    const trace = generationReadSchema.parse(read);
    expect(trace.initiation.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(trace.initiation.actionId.length).toBeGreaterThan(0);
    expect(trace).toMatchObject({ testProvider: true, effectiveModel: { profileSnapshotId: FAKE_TEXT_PROFILE.snapshotId }, versions: { profileSnapshotId: FAKE_TEXT_PROFILE.snapshotId } });
    expect(trace.captured.length).toBeGreaterThan(0);
    expect(trace.runs.length).toBeGreaterThan(0);
    expect(trace.digest).toBe(sha256(canonicalJson(trace.renderedRequest)));
  }
});

it("VC10 line 8: the nightly derived check counts every Generation that carries a fake snapshot", async () => {
  const total = Number((await database.inspect.query("SELECT count(*) AS n FROM accounts.generation")).rows[0].n);
  expect(total).toBeGreaterThanOrEqual(8);
  // Every Generation in this database was served by a fake, so the check must find all of them and a clean database none.
  expect(await fakeGenerationCount(database.url("backup"))).toBe(total);
  const clean = await freshDatabase();
  try { expect(await fakeGenerationCount(clean.url("backup"))).toBe(0); } finally { await clean.close(); }
});
