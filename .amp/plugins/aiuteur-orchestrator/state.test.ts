// Run: node --test .amp/plugins/aiuteur-orchestrator/state.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { newRun, type IssueNode } from "./core.ts";
import { createStore, reserveLaunch } from "./state.ts";

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
  await s.put(newRun(2)); // lock was released
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
  await s.put(newRun(1));
  (await import("node:fs")).writeFileSync(join(dir, "runs.json"), "{ not json");
  await assert.rejects(s.update(() => {}));
  rmSync(dir, { recursive: true });
});
