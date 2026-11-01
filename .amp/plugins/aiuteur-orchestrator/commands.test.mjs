// Command-level tests: the real index.ts commands against stub `gh`/`amp` binaries and a disposable state dir.
// Run: node --test .amp/plugins/aiuteur-orchestrator/commands.test.mjs   (no real Orb, Worker, Verifier or GitHub write)
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import register from "./index.ts";

const A = "a".repeat(40), C = "c".repeat(40);
const TID = "T-01a19059-b730-7542-bd8f-fcfc74a58524";
const deferred = () => { let go; const p = new Promise((r) => { go = r; }); return { p, go }; };
const issueLine = (n) => JSON.stringify({ number: n, title: `[T0-${n}] t`, body: "**Execution mode:** Agent\n**Coordination (not a blocker):** none", labels: ["ready-for-agent"], assignees: [], blockedBy: [] });
const run = (ticket, o = {}) => ({ ticket, state: "ACTIVE", revision: 0, repairAttempt: 0, failures: {}, workerThreadId: TID, ...o });
const verdict = (pr, sha) => ({ pr, sha, blocking: [], nonBlocking: [], workerMode: "claude-code", workerModel: "m", verifierModel: "v", independence: "cross-family" });
const pass = (pr, sha) => "```json\n" + JSON.stringify({ pr, verifiedSha: sha, findings: [] }) + "\n```";

function world({ issues = [7, 8], prs = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "aiu-cmd-"));
  writeFileSync(join(dir, "gh"), `#!/bin/sh\nD="${dir}"\ncase "$*" in\n*"api graphql"*) cat "$D/issues.ndjson";;\n*matching-refs*) cat "$D/refs.txt";;\n*check-runs*) cat "$D/ci.json";;\n"pr list"*) cat "$D/prs.json";;\n"pr comment"*) :;;\n*) echo "unexpected gh $*" >&2; exit 1;;\nesac\n`, { mode: 0o755 });
  // Fake `amp`. A Worker launch (--mode claude-code) or repair (threads continue) reads its behaviour from $D/mode or $D/repairmode:
  //   kill_before_init | kill_after_init | kill_after_release (SIGKILL itself) | result_ok | result_fail | (absent: exits 1 with no result event)
  // After init it stays alive until $D/release exists. `breakafter` makes the CLI unspawnable (EACCES) once the model list was read.
  const turn = (modeFile, init) => `m=$(cat "${dir}/${modeFile}" 2>/dev/null); [ "$m" = kill_before_init ] && kill -9 $$; ${init ? `echo '{"type":"system","subtype":"init","session_id":"${TID}"}'; ` : ""}[ "$m" = kill_after_init ] && kill -9 $$; while [ ! -f "${dir}/release" ]; do sleep 0.02; done; [ "$m" = kill_after_release ] && kill -9 $$; if [ "$m" = result_ok ]; then echo '{"type":"result","subtype":"success","is_error":false,"result":"done"}'; exit 0; fi; if [ "$m" = result_fail ]; then echo '{"type":"result","subtype":"error_during_execution","is_error":true,"result":"typecheck failed in packages/api"}'; exit 1; fi; echo "typecheck failed in packages/api" >&2; exit 1`;
  writeFileSync(join(dir, "amp"), `#!/bin/sh\ncase "$*" in\n"plugins show-agent-options"*) printf '%s' "$AIUTEUR_TEST_MODELS"; [ -f "${dir}/breakafter" ] && chmod 644 "${dir}/amp"; exit 0;;\n"threads continue"*) echo "$*" >> "${dir}/amp.log"; ${turn("repairmode", false)};;\n*"--mode claude-code"*) echo "$*" >> "${dir}/amp.log"; ${turn("mode", true)};;\n*) echo "$*" >> "${dir}/amp.log";;\nesac\n`, { mode: 0o755 });
  const w = {
    dir,
    state: join(dir, "state"),
    setIssues: (ns) => writeFileSync(join(dir, "issues.ndjson"), ns.map(issueLine).join("\n")),
    setPrs: (list) => writeFileSync(join(dir, "prs.json"), JSON.stringify(list)),
    setCi: (ok) => writeFileSync(join(dir, "ci.json"), JSON.stringify([{ name: "verify", status: "completed", conclusion: ok ? "success" : "failure" }])),
    runs: () => JSON.parse(readFileSync(join(w.state, "runs.json"), "utf8")),
    release: () => writeFileSync(join(dir, "release"), ""),
    mode: (m) => writeFileSync(join(dir, "mode"), m),
    repairMode: (m) => writeFileSync(join(dir, "repairmode"), m),
    ampLog: () => { try { return readFileSync(join(dir, "amp.log"), "utf8"); } catch { return ""; } },
  };
  w.setIssues(issues); w.setPrs(prs); w.setCi(true);
  writeFileSync(join(dir, "refs.txt"), "");
  return w;
}

/** Registers the real plugin; `verifier(prompt)` returns the reply text (may be async). */
function boot(w, runs, verifier = async () => "") {
  mkdirSync(w.state, { recursive: true });
  writeFileSync(join(w.state, "runs.json"), JSON.stringify(runs));
  // Deliberately excludes /usr/local/bin and ~/.amp/bin: the real `amp` must be unreachable even if the stub cannot be spawned.
  process.env.PATH = `${w.dir}:/usr/bin:/bin`;
  process.env.AIUTEUR_STATE_DIR = w.state;
  process.env.AIUTEUR_TEST_MODELS = JSON.stringify({ models: [{ id: "openai/gpt-6-astra" }, { id: "anthropic/claude-opus-5-5" }] });
  const commands = new Map();
  const calls = [];
  register({
    system: { cacheDirectory: w.dir },
    logger: { log() {} },
    createAgent: () => ({
      definition: {},
      async createThread() {
        return {
          id: "verifier-thread",
          async appendUserMessage(m) { calls.push(m.content); this.prompt = m.content; },
          async waitForResponse() { return { content: [{ text: await verifier(this.prompt) }] }; },
        };
      },
    }),
    registerAgentMode() {},
    registerCommand: (name, _o, handler) => commands.set(name, handler),
  });
  const notices = [];
  const ctx = { ui: { notify: async (m) => { notices.push(m); }, confirm: async () => true } };
  return { call: (name) => commands.get(name)(ctx), calls, notices };
}
process.env.ORIG_PATH = process.env.PATH;
const replyFor = (prompt) => { const m = /PR #(\d+) at exact HEAD SHA ([0-9a-f]{40})/.exec(prompt); return pass(Number(m[1]), m[2]); };
const openPr = (sha, o = {}) => ({ number: 70, headRefName: "ticket/7-x", headRefOid: sha, isDraft: false, state: "OPEN", ...o });
const cleanup = (w) => rmSync(w.dir, { recursive: true, force: true });

test("live Worker, no PR yet: resume keeps it ACTIVE and holding the slot; run-next launches nothing", async () => {
  const w = world();
  const b = boot(w, { 7: run(7) });
  await b.call("resume");
  assert.equal(w.runs()[7].state, "ACTIVE");
  assert.match(b.notices[0], /ACTIVE/);
  await b.call("run-next");
  assert.match(b.notices[1], /No eligible ticket or no free concurrency slot/);
  assert.equal(w.ampLog(), ""); // no Worker launch
  assert.equal(Object.keys(w.runs()).length, 1);
  cleanup(w);
});

test("resume vs resume on one run: the stale pass cannot erase the newer verdict and MERGE_READY", async () => {
  const w = world({ prs: [openPr(A)] });
  w.setPrs([openPr(A)]);
  const gate = deferred(), entered = deferred();
  let n = 0;
  const b = boot(w, { 7: run(7) }, async (prompt) => {
    if (++n === 1) { entered.go(); await gate.p; } // first verifier is held mid-flight
    return replyFor(prompt);
  });
  const slow = b.call("resume");
  await entered.p;
  await b.call("resume"); // second pass runs to completion
  assert.equal(w.runs()[7].state, "MERGE_READY");
  gate.go();
  await slow;
  const final = w.runs()[7];
  assert.equal(final.state, "MERGE_READY");
  assert.equal(final.verdict.sha, A);
  assert.equal(final.currentPR, 70);
  assert.ok(b.notices.some((m) => /another command changed this run/.test(m)));
  cleanup(w);
});

test("MERGE_READY is re-checked: same head stays ready without a new verifier; moved head forces a fresh verifier", async () => {
  const w = world({ prs: [openPr(A)] });
  const b = boot(w, { 7: run(7, { state: "MERGE_READY", currentPR: 70, verdict: verdict(70, A) }) }, async (p) => replyFor(p));
  await b.call("resume");
  assert.equal(w.runs()[7].state, "MERGE_READY");
  assert.equal(b.calls.length, 0);
  w.setPrs([openPr(C)]); // live head moves
  await b.call("resume");
  assert.equal(b.calls.length, 1); // fresh verifier for the new head
  assert.match(b.calls[0], new RegExp(C));
  assert.equal(w.runs()[7].verdict.sha, C);
  assert.equal(w.runs()[7].state, "MERGE_READY");
  cleanup(w);
});

test("MERGE_READY reconciles with live PR: merged -> DONE; closed unmerged -> BLOCKED (slot kept, thread known)", async () => {
  for (const [prState, expected] of [["MERGED", "DONE"], ["CLOSED", "BLOCKED"]]) {
    const w = world({ prs: [openPr(A, { state: prState })] });
    const b = boot(w, { 7: run(7, { state: "MERGE_READY", currentPR: 70, verdict: verdict(70, A) }) });
    await b.call("resume");
    assert.equal(w.runs()[7].state, expected, prState);
    assert.equal(b.calls.length, 0);
    cleanup(w);
  }
});

test("standalone dry-run agrees with the plugin about RESERVED / UNRESOLVED capacity, and refuses invalid state", async () => {
  const exec = promisify(execFile);
  const script = join(import.meta.dirname, "dry-run.ts");
  for (const state of ["RESERVED", "UNRESOLVED"]) {
    const w = world({ issues: [7, 8] });
    const b = boot(w, { 7: run(7, { state, workerThreadId: undefined }) });
    await b.call("dry-run");
    const { stdout } = await exec(process.execPath, [script], { env: process.env });
    assert.equal(stdout.trim(), b.notices[0].trim()); // same function, same durable state, same answer
    assert.match(stdout, /free slots 0/);
    assert.match(stdout, /Would create Worker Orb: no/);
    assert.match(stdout, /#7 .*local run\/reservation/);
    cleanup(w);
  }
  const w = world();
  boot(w, []);
  await assert.rejects(exec(process.execPath, [script], { env: process.env }), (e) => e.code === 1 && /dry run refused/.test(e.stderr) && !/Would create/.test(e.stdout));
  cleanup(w);
});

const waitFor = async (fn) => { for (let i = 0; i < 500; i++) { try { if (fn()) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 10)); } throw new Error("timed out"); };
const slots = (b) => /free slots (\d)/.exec(b.notices.at(-1))[1];

test("merged PR while the Worker turn is still running: DONE but the slot stays held; a late failure cannot regress DONE; completion frees the slot", async () => {
  const w = world();
  const b = boot(w, {});
  w.mode("result_fail");
  const launch = b.call("run-next"); // Worker launched and held open by the stub
  await waitFor(() => w.runs()[7]?.workerThreadId);
  assert.equal(w.runs()[7].workerRunning, true);
  w.setPrs([openPr(A, { state: "MERGED" })]);
  await b.call("resume");
  assert.equal(w.runs()[7].state, "DONE");
  assert.equal(w.runs()[7].workerRunning, true);
  await b.call("dry-run");
  assert.equal(slots(b), "0");
  await b.call("run-next"); // CAP=1: must not start a second Worker
  assert.match(b.notices.at(-1), /No eligible ticket or no free concurrency slot/);
  assert.equal(w.ampLog().split("--mode claude-code").length - 1, 1); // exactly one Worker launch
  w.release(); // the Worker now ends with a failed result event, after DONE was recorded
  await launch;
  assert.equal(w.runs()[7].state, "DONE"); // not regressed to BLOCKED
  assert.equal(w.runs()[7].workerRunning, false);
  await b.call("dry-run");
  assert.equal(slots(b), "1"); // known finished: capacity is free again
  cleanup(w);
});

test("late Worker failure cannot regress MERGE_READY or erase its PR/verdict", async () => {
  const w = world();
  const b = boot(w, {}, async (p) => replyFor(p));
  w.mode("result_fail");
  const launch = b.call("run-next");
  await waitFor(() => w.runs()[7]?.workerThreadId);
  w.setPrs([openPr(A)]);
  await b.call("resume");
  assert.equal(w.runs()[7].state, "MERGE_READY");
  w.release();
  await launch;
  const final = w.runs()[7];
  assert.equal(final.state, "MERGE_READY");
  assert.equal(final.verdict.sha, A);
  assert.equal(final.currentPR, 70);
  assert.equal(final.workerRunning, false);
  cleanup(w);
});

test("normal Worker completion (exit 0) frees the slot once the run is blocked or done", async () => {
  const w = world();
  const b = boot(w, {});
  w.mode("result_ok");
  w.release();
  await b.call("run-next"); // Worker exits cleanly; no PR yet -> stays ACTIVE and in flight
  assert.equal(w.runs()[7].workerRunning, false);
  assert.equal(w.runs()[7].state, "ACTIVE");
  w.setPrs([openPr(A, { state: "MERGED" })]);
  await b.call("resume");
  assert.equal(w.runs()[7].state, "DONE");
  await b.call("dry-run");
  assert.equal(slots(b), "1");
  cleanup(w);
});

test("changed head on a Draft PR durably invalidates MERGE_READY; same head on a Draft keeps it", async () => {
  const w = world({ prs: [openPr(C, { isDraft: true })] });
  const b = boot(w, { 7: run(7, { state: "MERGE_READY", currentPR: 70, verdict: verdict(70, A) }) });
  await b.call("resume");
  assert.equal(w.runs()[7].state, "VERIFYING");
  assert.equal(w.runs()[7].verdict, undefined); // old PASS for A no longer persisted
  assert.equal(b.calls.length, 0); // Draft waits; no verifier yet
  cleanup(w);
  const w2 = world({ prs: [openPr(A, { isDraft: true })] });
  const b2 = boot(w2, { 7: run(7, { state: "MERGE_READY", currentPR: 70, verdict: verdict(70, A) }) });
  await b2.call("resume");
  assert.equal(w2.runs()[7].state, "MERGE_READY");
  assert.equal(w2.runs()[7].verdict.sha, A);
  cleanup(w2);
});

// ---- completion evidence comes only from the stream (terminal result event), never from how the local CLI exited -------
const launches = (w) => w.ampLog().split("--mode claude-code").length - 1;
const violation = { class: "REQUIREMENT_VIOLATION", summary: "s", requirement: "AC-1", evidence: "run x" };

test("(a)(b) CLI killed after init, or before init, with no result: UNRESOLVED, slot held, no second Worker", async () => {
  for (const [mode, thread] of [["kill_after_init", TID], ["kill_before_init", undefined]]) {
    const w = world();
    const b = boot(w, {});
    w.mode(mode);
    await b.call("run-next");
    assert.equal(w.runs()[7].state, "UNRESOLVED", mode);
    assert.equal(w.runs()[7].workerRunning, true, mode);
    assert.equal(w.runs()[7].workerThreadId, thread, mode);
    await b.call("dry-run");
    assert.equal(slots(b), "0", mode);
    await b.call("run-next"); // CAP=1: #8 is runnable on GitHub but the slot is held
    assert.match(b.notices.at(-1), /No eligible ticket or no free concurrency slot/);
    assert.equal(launches(w), 1, mode);
    cleanup(w);
  }
});

test("(c) repair turn killed without a result: UNRESOLVED, slot held, no new Worker", async () => {
  const w = world({ prs: [openPr(A)] });
  const b = boot(w, { 7: run(7, { state: "VERIFYING", currentPR: 70, verdict: { ...verdict(70, A), blocking: [violation] } }) });
  w.repairMode("kill_before_init");
  w.release();
  await b.call("resume");
  assert.equal(w.runs()[7].state, "UNRESOLVED");
  assert.equal(w.runs()[7].workerRunning, true);
  await b.call("dry-run");
  assert.equal(slots(b), "0");
  await b.call("run-next");
  assert.match(b.notices.at(-1), /No eligible ticket or no free concurrency slot/);
  assert.equal(launches(w), 0);
  assert.equal(w.ampLog().split("threads continue").length - 1, 1); // one repair attempt, never repeated
  cleanup(w);
});

test("(d) failed result event then non-zero exit: failure applied, slot freed (BLOCKED, not UNRESOLVED)", async () => {
  const w = world();
  const b = boot(w, {});
  w.mode("result_fail");
  w.release();
  await b.call("run-next");
  assert.equal(w.runs()[7].state, "BLOCKED");
  assert.equal(w.runs()[7].workerRunning, false);
  assert.match(w.runs()[7].blockedReason, /typecheck failed/);
  await b.call("dry-run");
  assert.equal(slots(b), "1");
  cleanup(w);
});

test("(f) abnormal exit with no result after the run is MERGE_READY/DONE: lifecycle unchanged, slot held", async () => {
  for (const [expected, pr] of [["DONE", openPr(A, { state: "MERGED" })], ["MERGE_READY", openPr(A)]]) {
    const w = world();
    const b = boot(w, {}, async (p) => replyFor(p));
    w.mode("kill_after_release");
    const launch = b.call("run-next");
    await waitFor(() => w.runs()[7]?.workerThreadId);
    w.setPrs([pr]);
    await b.call("resume");
    assert.equal(w.runs()[7].state, expected);
    w.release(); // the Worker CLI now dies with no result event
    await launch;
    const final = w.runs()[7];
    assert.equal(final.state, expected);
    assert.equal(final.workerRunning, true);
    if (expected === "MERGE_READY") assert.equal(final.verdict.sha, A);
    await b.call("dry-run");
    assert.equal(slots(b), "0");
    cleanup(w);
  }
});

test("(g) CLI cannot be spawned (EACCES): nothing reached Amp, so BLOCKED with the slot freed, never UNRESOLVED", async () => {
  const w = world();
  const b = boot(w, {});
  writeFileSync(join(w.dir, "breakafter"), ""); // amp lists models once, then becomes non-executable
  await b.call("run-next");
  assert.equal(launches(w), 0);
  assert.equal(w.runs()[7].state, "BLOCKED");
  assert.equal(w.runs()[7].workerRunning, false);
  rmSync(join(w.dir, "breakafter"));
  chmodSync(join(w.dir, "amp"), 0o755);
  await b.call("dry-run");
  assert.equal(slots(b), "1");
  cleanup(w);
});
