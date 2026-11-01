// Run: node --test .amp/plugins/aiuteur-orchestrator/state.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildVerdict, newRun, parseVerifierReply, type IssueNode } from "./core.ts";
import { writeFileSync } from "node:fs";
import { createStore, reserveLaunch, StaleRun, validateRuns } from "./state.ts";

const issue = (n: number): IssueNode => ({ number: n, title: `[T0-${n}] t`, labels: ["ready-for-agent"], assignees: [], blockedBy: [], body: "**Execution mode:** Agent\n**Coordination (not a blocker):** none" });
const tmp = () => mkdtempSync(join(tmpdir(), "aiu-state-"));
const deferred = () => { let go!: () => void; const p = new Promise<void>((r) => { go = r; }); return { p, go }; };

test("overlapping updates from two stores on one file both survive; file stays valid JSON", async () => {
  const dir = tmp();
  const a = createStore(dir), b = createStore(dir);
  const gate = deferred();
  const first = a.update(async (runs) => { await gate.p; runs[1] = { ...newRun(1), state: "ACTIVE", workerThreadId: "T-x" }; });
  const second = b.update((runs) => { runs[2] = { ...newRun(2), state: "VERIFYING" }; }); // must wait for the lock
  gate.go();
  await Promise.all([first, second]);
  const final = JSON.parse(readFileSync(join(dir, "runs.json"), "utf8"));
  assert.equal(final[1].workerThreadId, "T-x");
  assert.equal(final[2].state, "VERIFYING");
  rmSync(dir, { recursive: true });
});

test("a throwing update writes nothing and releases the lock", async () => {
  const dir = tmp();
  const s = createStore(dir);
  await assert.rejects(s.update((runs) => { runs[1] = newRun(1); throw new Error("boom"); }));
  assert.deepEqual(s.read(), {});
  await s.update((r) => { r[2] = newRun(2); }); // lock was released
  assert.deepEqual(Object.keys(s.read()), ["2"]);
  rmSync(dir, { recursive: true });
});

test("two concurrent run-next reservations: same ticket, CAP=1 -> exactly one wins", async () => {
  const dir = tmp();
  const aStore = createStore(dir), bStore = createStore(dir);
  const bothRead = deferred();
  let reads = 0;
  const snapshot = async () => { reads++; if (reads === 2) bothRead.go(); return { issues: [issue(7)], branches: [], prs: [] }; };
  // Both selected #7 from the same pre-lock view; the lock forces the second to re-read after the first committed.
  const [x, y] = await Promise.all([reserveLaunch(aStore, snapshot, 7, 1), reserveLaunch(bStore, snapshot, 7, 1)]);
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  assert.equal(Object.values(aStore.read()).length, 1);
  assert.equal(aStore.read()[7]!.state, "RESERVED");
  rmSync(dir, { recursive: true });
});

test("two concurrent reservations for DIFFERENT tickets with CAP=1 -> one reservation total", async () => {
  const dir = tmp();
  const snapshot = async () => ({ issues: [issue(7), issue(8)], branches: [], prs: [] });
  const [x, y] = await Promise.all([reserveLaunch(createStore(dir), snapshot, 7, 1), reserveLaunch(createStore(dir), snapshot, 8, 1)]);
  assert.deepEqual([x.ok, y.ok].sort(), [false, true]);
  assert.equal(Object.keys(createStore(dir).read()).length, 1);
  rmSync(dir, { recursive: true });
});

test("a claim that appears while the human is confirming blocks the launch; nothing is reserved or substituted", async () => {
  const dir = tmp();
  const store = createStore(dir);
  const r = await reserveLaunch(store, async () => ({ issues: [issue(7), issue(8)], branches: ["ticket/7-other"], prs: [] }), 7, 1);
  assert.equal(r.ok, false);
  assert.deepEqual(store.read(), {});
  rmSync(dir, { recursive: true });
});

test("an unresolved reservation survives a restart and keeps the ticket and slot occupied", async () => {
  const dir = tmp();
  const snapshot = async () => ({ issues: [issue(7), issue(8)], branches: [], prs: [] });
  assert.equal((await reserveLaunch(createStore(dir), snapshot, 7, 1)).ok, true);
  const restarted = createStore(dir); // new coordinator process, same state dir, no thread id ever recorded
  assert.equal(restarted.read()[7]!.state, "RESERVED");
  assert.equal(restarted.read()[7]!.workerThreadId, undefined);
  assert.equal((await reserveLaunch(restarted, snapshot, 7, 1)).ok, false); // not free to relaunch
  assert.equal((await reserveLaunch(restarted, snapshot, 8, 1)).ok, false); // slot occupied
  rmSync(dir, { recursive: true });
});

test("corrupt state fails closed instead of reading as empty", async () => {
  const dir = tmp();
  const s = createStore(dir);
  await s.update((r) => { r[1] = newRun(1); });
  (await import("node:fs")).writeFileSync(join(dir, "runs.json"), "{ not json");
  await assert.rejects(s.update(() => {}));
  rmSync(dir, { recursive: true });
});

test("structurally invalid state fails closed: [] / null run / bad status / key mismatch; no launch is possible", async () => {
  for (const bad of ["[]", '{"123":null}', '{"1":{"ticket":1,"state":"WHATEVER","revision":0,"repairAttempt":0,"failures":{}}}', '{"2":{"ticket":1,"state":"ACTIVE","revision":0,"repairAttempt":0,"failures":{}}}']) {
    const dir = tmp();
    writeFileSync(join(dir, "runs.json"), bad);
    const store = createStore(dir);
    assert.throws(() => store.read(), bad);
    const snapshot = async () => ({ issues: [issue(7)], branches: [], prs: [] });
    await assert.rejects(reserveLaunch(store, snapshot, 7, 1), bad);
    assert.equal(readFileSync(join(dir, "runs.json"), "utf8"), bad); // untouched, no sparse-array rewrite
    rmSync(dir, { recursive: true });
  }
});

test("state written by the store validates and reloads; empty/missing file is just no runs", async () => {
  const dir = tmp();
  const s = createStore(dir);
  assert.deepEqual(s.read(), {});
  await s.update((r) => { r[3] = { ...newRun(3), state: "ACTIVE", workerThreadId: "T-x", currentPR: 9, failures: { a: 1 } }; });
  assert.equal(validateRuns(s.read())[3]!.currentPR, 9);
  rmSync(dir, { recursive: true });
});

test("a stale same-run write is rejected and the newer transition survives", async () => {
  const dir = tmp();
  const s = createStore(dir);
  await s.update((r) => { r[1] = { ...newRun(1), state: "ACTIVE", workerThreadId: "T-x" }; });
  const stale = s.read()[1]!; // revision 0, read before a long operation
  await s.mutate(1, (c) => ({ ...c, state: "MERGE_READY", currentPR: 7 }), stale.revision); // newer legitimate transition
  await assert.rejects(s.mutate(1, () => ({ ...stale, state: "BLOCKED" }), stale.revision), StaleRun);
  const final = s.read()[1]!;
  assert.equal(final.state, "MERGE_READY");
  assert.equal(final.currentPR, 7);
  assert.equal(final.revision, 1);
  rmSync(dir, { recursive: true });
});

const SHA = "a".repeat(40);
const models = { workerModel: "claude-opus-5-5", verifierModel: "openai/gpt-6-astra", independence: "cross-family" as const };
const withVerdict = (v: unknown) => ({ 1: { ...newRun(1), state: "MERGE_READY", verdict: v } });
const violation = { class: "REQUIREMENT_VIOLATION", summary: "s", requirement: "AC-1", evidence: "run x" };

test("a verdict produced by the real parser/builder persists and reloads unchanged", async () => {
  const reply = "```json\n" + JSON.stringify({ pr: 7, verifiedSha: SHA, findings: [{ class: "IMPROVEMENT", summary: "nit" }, { class: "HARDENING_OPPORTUNITY", summary: "h" }] }) + "\n```";
  const parsed = parseVerifierReply(reply, { pr: 7, sha: SHA });
  assert.ok(parsed.ok);
  const verdict = buildVerdict(parsed.ok ? parsed.findings : [], { pr: 7, sha: SHA }, models);
  const dir = tmp();
  const s = createStore(dir);
  await s.update((r) => { r[1] = { ...newRun(1), state: "MERGE_READY", verdict }; });
  assert.deepEqual(s.read()[1]!.verdict, JSON.parse(JSON.stringify(verdict)));
  rmSync(dir, { recursive: true });
});

test("malformed persisted verdicts fail closed: violation in nonBlocking, PASS-shaped blocking mismatch, missing provenance, wrong types", () => {
  const good = JSON.parse(JSON.stringify(buildVerdict([], { pr: 7, sha: SHA }, models)));
  assert.doesNotThrow(() => validateRuns(withVerdict(good)));
  const bad: Record<string, unknown> = {
    "violation in nonBlocking": { ...good, nonBlocking: [violation] },
    "improvement in blocking": { ...good, blocking: [{ class: "IMPROVEMENT", summary: "i" }] },
    "violation without evidence": { ...good, blocking: [{ class: "REQUIREMENT_VIOLATION", summary: "s", requirement: "AC-1" }] },
    "missing verifier model": { ...good, verifierModel: undefined },
    "missing independence": { ...good, independence: undefined },
    "wrong independence": { ...good, independence: "same-family" },
    "pr not a number": { ...good, pr: "7" },
    "sha not a sha": { ...good, sha: "abc" },
    "findings not arrays": { ...good, blocking: {} },
  };
  for (const [name, v] of Object.entries(bad)) assert.throws(() => validateRuns(JSON.parse(JSON.stringify(withVerdict(v)))), /runs.json/, name);
});
