// Command-level tests: the real index.ts commands against stub `gh`/`amp` binaries and a disposable state dir.
// Run: node --test .amp/plugins/aiuteur-orchestrator/commands.test.mjs   (no real Orb, Worker, Verifier or GitHub write)
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  writeFileSync(join(dir, "amp"), `#!/bin/sh\ncase "$*" in\n"plugins show-agent-options"*) printf '%s' "$AIUTEUR_TEST_MODELS";;\n*) echo "$*" >> "${dir}/amp.log";;\nesac\n`, { mode: 0o755 });
  const w = {
    dir,
    state: join(dir, "state"),
    setIssues: (ns) => writeFileSync(join(dir, "issues.ndjson"), ns.map(issueLine).join("\n")),
    setPrs: (list) => writeFileSync(join(dir, "prs.json"), JSON.stringify(list)),
    setCi: (ok) => writeFileSync(join(dir, "ci.json"), JSON.stringify([{ name: "verify", status: "completed", conclusion: ok ? "success" : "failure" }])),
    runs: () => JSON.parse(readFileSync(join(w.state, "runs.json"), "utf8")),
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
  process.env.PATH = `${w.dir}:${process.env.ORIG_PATH}`;
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
    const { stdout } = await exec("node", [script], { env: process.env });
    assert.equal(stdout.trim(), b.notices[0].trim()); // same function, same durable state, same answer
    assert.match(stdout, /free slots 0/);
    assert.match(stdout, /Would create Worker Orb: no/);
    assert.match(stdout, /#7 .*local run\/reservation/);
    cleanup(w);
  }
  const w = world();
  boot(w, []);
  await assert.rejects(exec("node", [script], { env: process.env }), (e) => e.code === 1 && /dry run refused/.test(e.stderr) && !/Would create/.test(e.stdout));
  cleanup(w);
});
