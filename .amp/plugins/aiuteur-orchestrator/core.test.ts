// Run: node --test .amp/plugins/aiuteur-orchestrator/core.test.ts   (deliberately outside the required `verify` CI job)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  afterRepairSent, buildVerdict, ciState, classifyFailure, computeFrontier, decide, invalidateVerdict, mergeArgs, mergeGuard,
  mergeRejectedForHead, newRun, parseVerifierReply, routeVerifier, routeWorker, selectTickets, workerStartArgs,
  extractThreadId, initThreadId, hasClaim, launchWorker, workerErrorText, type LaunchDeps,
  mergeModeFrom, smokeReplyOk, smokeVerifierPrompt,
  type Finding, type IssueNode, type PrFacts, type TicketRun,
} from "./core.ts";

const issue = (n: number, o: Partial<IssueNode> & { mode?: string; coord?: string } = {}): IssueNode => ({
  number: n, title: `[T0-${n}] t`, labels: ["ready-for-agent"], assignees: [], blockedBy: [],
  body: `**Execution mode:** ${o.mode ?? "Agent"}\n**Coordination (not a blocker):** ${o.coord ?? "none"}`, ...o,
});
const SHA_A = "a".repeat(40), SHA_B = "b".repeat(40);
const pr = (headSha: string, o: Partial<PrFacts> = {}): PrFacts => ({ number: 7, headSha, state: "OPEN", draft: false, ...o });
const violation: Finding = { class: "REQUIREMENT_VIOLATION", summary: "s", requirement: "AC-1", evidence: "run x" };
const models = { workerModel: "claude-opus-5-5", verifierModel: "openai/gpt-6-astra", independence: "cross-family" as const };
const verified = (findings: Finding[], sha = SHA_A): TicketRun => ({ ...newRun(1), state: "VERIFYING", verdict: buildVerdict(findings, { pr: 7, sha }, models) });

test("blocked tickets cannot start; only unblocked Agent tickets are runnable", () => {
  const f = computeFrontier([issue(1, { blockedBy: [{ number: 9, state: "OPEN" }] }), issue(2, { blockedBy: [{ number: 9, state: "CLOSED" }] }), issue(3, { mode: "Mixed" })], [], []);
  assert.deepEqual(f.runnable.map((t) => t.number), [2]);
  assert.deepEqual(f.blocked.map((t) => t.number), [1]);
  assert.deepEqual(f.humanGated.map((t) => t.number), [3]);
});

test("existing ticket branch or PR (even unassigned) prevents duplicate work", () => {
  const f = computeFrontier([issue(1), issue(2), issue(3), issue(4)], ["ticket/1-x"], [{ number: 5, headRefName: "ticket/2-y", headRefOid: SHA_A, isDraft: true }]);
  assert.deepEqual(f.runnable.map((t) => t.number), [3, 4]);
  assert.deepEqual(f.inFlight.map((x) => x.ticket.number), [1, 2]);
  assert.equal(computeFrontier([issue(10)], ["ticket/100-x"], []).runnable.length, 1); // 100 must not claim 10
});

test("concurrency cap holds", () => {
  const f = computeFrontier([issue(1), issue(2), issue(3)], [], []);
  assert.equal(selectTickets(f, 0, 1).length, 1);
  assert.equal(selectTickets(f, 1, 1).length, 0);
  assert.equal(selectTickets(f, 1, 2).length, 1);
});

test("a serial ticket in flight defers other serial tickets", () => {
  const f = computeFrontier([issue(1, { coord: "Release path: serial" }), issue(2, { coord: "serial" }), issue(3)], ["ticket/1-x"], []);
  assert.deepEqual(f.runnable.map((t) => t.number), [3]);
  assert.deepEqual(f.deferredSerial.map((t) => t.number), [2]);
});

test("worker routing is Claude Code subscription mode and never a paid fallback", () => {
  const avail = ["anthropic/claude-opus-5-5", "anthropic/claude-sonnet-5-5", "openai/gpt-6-astra"];
  assert.deepEqual(routeWorker(avail), { mode: "claude-code", model: "claude-opus-5-5", effort: "high" });
  assert.equal(routeWorker(avail, ["claude-opus-5-5"])?.model, "claude-sonnet-5-5");
  assert.equal(routeWorker(avail, ["claude-opus-5-5", "claude-sonnet-5-5"]), null); // stop, do not route elsewhere
  assert.equal(routeWorker(["openai/gpt-6-astra"]), null);
  const args = workerStartArgs("/implement #9", "claude-opus-5-5", "t");
  assert.equal(args[args.indexOf("--mode") + 1], "claude-code");
  assert.ok(args.includes("model:claude-opus-5-5,effort:high"));
  assert.equal(args[args.indexOf("-ox") + 1], "/implement #9");
});

test("provider/runtime failure is distinct from implementation failure", () => {
  assert.equal(classifyFailure("Claude usage limit reached"), "provider");
  assert.equal(classifyFailure("HTTP 529 overloaded"), "provider");
  assert.equal(classifyFailure("typecheck failed in packages/api"), "implementation");
});

test("verifier routing is deterministic, OpenAI only, no silent downgrade", () => {
  const all = ["openai/gpt-6-astra", "openai/gpt-6.1-sol", "anthropic/claude-opus-5-5"];
  assert.equal(routeVerifier(all)?.model, "openai/gpt-6-astra");
  assert.equal(routeVerifier(all)?.independence, "cross-family");
  assert.equal(routeVerifier(all, ["openai/gpt-6-astra"])?.model, "openai/gpt-6.1-sol");
  assert.equal(routeVerifier(["anthropic/claude-opus-5-5"]), null);
});

test("every new candidate SHA gets a fresh verification; a verdict never carries to another SHA", () => {
  const r = verified([]);
  assert.deepEqual(decide(newRun(1), pr(SHA_A), "pass"), { type: "verify", pr: 7, sha: SHA_A });
  assert.deepEqual(decide(r, pr(SHA_A), "pass"), { type: "merge", pr: 7, sha: SHA_A });
  assert.deepEqual(decide(r, pr(SHA_B), "pass"), { type: "verify", pr: 7, sha: SHA_B }); // HEAD moved: old PASS invalid
});

test("verdict is bound to the exact PR and SHA", () => {
  const body = (o: object) => "```json\n" + JSON.stringify({ pr: 7, verifiedSha: SHA_A, findings: [], ...o }) + "\n```";
  assert.equal(parseVerifierReply(body({}), { pr: 7, sha: SHA_A }).ok, true);
  assert.equal(parseVerifierReply(body({}), { pr: 7, sha: SHA_B }).ok, false);
  assert.equal(parseVerifierReply(body({ pr: 8 }), { pr: 7, sha: SHA_A }).ok, false);
  assert.equal(parseVerifierReply("PASS", { pr: 7, sha: SHA_A }).ok, false);
});

test("finding taxonomy: only a REQUIREMENT_VIOLATION blocks, and only with requirement + evidence", () => {
  const soft: Finding[] = [{ class: "HARDENING_OPPORTUNITY", summary: "h" }, { class: "IMPROVEMENT", summary: "i" }];
  const v = buildVerdict(soft, { pr: 7, sha: SHA_A }, models);
  assert.equal(v.blocking.length, 0);
  assert.equal(v.nonBlocking.length, 2);
  assert.equal(decide(verified(soft), pr(SHA_A), "pass").type, "merge");
  const unowned = "```json\n" + JSON.stringify({ pr: 7, verifiedSha: SHA_A, findings: [{ class: "REQUIREMENT_VIOLATION", summary: "x" }] }) + "\n```";
  assert.equal(parseVerifierReply(unowned, { pr: 7, sha: SHA_A }).ok, false);
  const bad = "```json\n" + JSON.stringify({ pr: 7, verifiedSha: SHA_A, findings: [{ class: "NICE", summary: "x" }] }) + "\n```";
  assert.equal(parseVerifierReply(bad, { pr: 7, sha: SHA_A }).ok, false);
});

test("REQUIREMENT_VIOLATION routes back to the same Worker; a repair waits for a new commit", () => {
  const r = verified([violation]);
  const a = decide(r, pr(SHA_A), "pass");
  assert.equal(a.type, "repair");
  assert.deepEqual(a.type === "repair" && a.level, "repair");
  const sent = afterRepairSent(r, a as Extract<typeof a, { type: "repair" }>);
  assert.equal(sent.repairAttempt, 1);
  assert.equal(decide(sent, pr(SHA_A), "pass").type, "wait");
  assert.equal(decide(sent, pr(SHA_B), "pass").type, "verify"); // new SHA -> fresh verifier
});

test("same root failing: repair, then diagnose, then escalate; provider limits are not counted", () => {
  let r = verified([violation]);
  const send = () => { const a = decide(r, pr(SHA_A), "pass"); assert.equal(a.type, "repair"); r = afterRepairSent(r, a as never); return a as { level: string }; };
  assert.equal(send().level, "repair");
  r = { ...r, verdict: buildVerdict([violation], { pr: 7, sha: SHA_A }, models), repairSentForSha: undefined };
  assert.equal(send().level, "diagnose");
  r = { ...r, verdict: buildVerdict([violation], { pr: 7, sha: SHA_A }, models), repairSentForSha: undefined };
  assert.equal(decide(r, pr(SHA_A), "pass").type, "escalate");
});

test("red required CI is repaired before spending a verifier; pending CI blocks merge", () => {
  assert.equal(decide(newRun(1), pr(SHA_A), "fail").type, "repair");
  const r = verified([]);
  assert.equal(decide(r, pr(SHA_A), "pending").type, "wait");
  assert.equal(decide(r, pr(SHA_A), "fail").type, "repair");
  assert.equal(ciState([{ name: "verify", status: "completed", conclusion: "success" }]), "pass");
  assert.equal(ciState([{ name: "verify", status: "in_progress", conclusion: null }]), "pending");
  assert.equal(ciState([]), "pending");
  assert.equal(ciState([{ name: "verify", status: "completed", conclusion: "failure" }]), "fail");
});

test("exact-head mismatch prevents merge and invalidates the verdict", () => {
  const r = verified([]);
  assert.deepEqual(mergeGuard(r.verdict, pr(SHA_A), "pass"), { ok: true });
  assert.deepEqual(mergeGuard(r.verdict, pr(SHA_B), "pass"), { ok: false, reason: "head-moved" });
  assert.deepEqual(mergeGuard(r.verdict, pr(SHA_A), "pending"), { ok: false, reason: "ci-not-green" });
  assert.deepEqual(mergeGuard(undefined, pr(SHA_A), "pass"), { ok: false, reason: "no-pass-verdict" });
  assert.deepEqual(mergeGuard(verified([violation]).verdict, pr(SHA_A), "pass"), { ok: false, reason: "no-pass-verdict" });
  assert.equal(invalidateVerdict(r).verdict, undefined);
  assert.ok(mergeArgs(7, SHA_A).join(" ").endsWith(`--match-head-commit ${SHA_A}`));
  assert.equal(mergeRejectedForHead("GraphQL: Head branch was modified. Review and try the merge again."), true);
});

test("manual-merge mode stops at MERGE_READY; auto mode still merges", () => {
  const r = verified([]);
  assert.deepEqual(decide(r, pr(SHA_A), "pass", "manual"), { type: "merge-ready", pr: 7, sha: SHA_A });
  assert.deepEqual(decide(r, pr(SHA_A), "pass", "auto"), { type: "merge", pr: 7, sha: SHA_A });
  assert.deepEqual(decide(r, pr(SHA_A), "pass"), { type: "merge", pr: 7, sha: SHA_A });
  // manual mode never emits a merge action, whatever the facts
  const facts: [TicketRun, PrFacts | null, "pass" | "fail" | "pending"][] = [
    [r, pr(SHA_A), "pass"], [r, pr(SHA_B), "pass"], [r, pr(SHA_A), "pending"], [r, pr(SHA_A), "fail"],
    [verified([violation]), pr(SHA_A), "pass"], [newRun(1), pr(SHA_A), "pass"], [r, null, "pass"],
  ];
  for (const [run, p, ci] of facts) assert.notEqual(decide(run, p, ci, "manual").type, "merge");
  assert.notEqual(decide(r, pr(SHA_A), "fail", "manual").type, "merge-ready"); // red CI or moved head is not merge-ready
  assert.equal(decide(r, pr(SHA_B), "pass", "manual").type, "verify");
});

test("merge mode defaults to manual; only AIUTEUR_MERGE=auto enables autonomous merge", () => {
  assert.equal(mergeModeFrom(undefined), "manual");
  assert.equal(mergeModeFrom("yes"), "manual");
  assert.equal(mergeModeFrom("auto"), "auto");
});

test("verifier smoke prompt names no ticket, PR, SHA or skill, and only an exact token reply passes", () => {
  const p = smokeVerifierPrompt("SMOKE-abc");
  assert.ok(!/#\d|\/implement|pull|PR |[0-9a-f]{40}/i.test(p));
  assert.equal(smokeReplyOk(" SMOKE-abc\n", "SMOKE-abc"), true);
  assert.equal(smokeReplyOk("SMOKE-abc and more", "SMOKE-abc"), false);
});

// ---- Worker launch: the defect found in independent verification of PR #227 ----------------------------------------
const TID = "T-01a19059-b730-7542-bd8f-fcfc74a58524";
const ev = (o: object) => JSON.stringify(o);
// A realistic failing run: ordinary transcript words that look like provider words, a real thread id, an implementation failure.
const noisyTranscript = [
  ev({ type: "system", subtype: "init", session_id: TID }),
  ev({ type: "user", message: { content: [{ type: "text", text: "ticket: quota, capacity, billing, subscription, 503" }] }, session_id: TID }),
  ev({ type: "assistant", message: { content: [{ type: "text", text: "pushed ticket/103-t0-06; typecheck failed in packages/api (quota capacity billing subscription 503)" }] }, session_id: TID }),
  ev({ type: "result", subtype: "error_during_execution", is_error: true, result: "typecheck failed in packages/api", session_id: TID }),
].join("\n");
const providerStart = ev({ type: "system", subtype: "init", session_id: TID });
const providerResult = ev({ type: "result", is_error: true, result: "Claude usage limit reached", session_id: TID });

function harness(runs: { code: number; stdout: string; stderr?: string }[], claimed: boolean[] = []) {
  const launches: string[][] = [];
  const persisted: string[] = [];
  let n = 0, c = 0;
  const deps: LaunchDeps = {
    ticket: 103,
    models: ["anthropic/claude-opus-5-5", "anthropic/claude-opus-5", "anthropic/claude-sonnet-5-5"],
    exec: async (args, onLine) => {
      launches.push(args);
      const r = runs[Math.min(n++, runs.length - 1)]!;
      for (const line of r.stdout.split("\n")) onLine(line);
      return { stderr: "", ...r };
    },
    persistThread: (id) => persisted.push(id),
    claimed: async () => claimed[Math.min(c++, claimed.length - 1)] ?? false,
  };
  return { deps, launches, persisted };
}

test("transcript words like quota/billing/503 are not provider evidence; implementation failure stays implementation", () => {
  assert.equal(extractThreadId(noisyTranscript), TID);
  assert.equal(classifyFailure(workerErrorText(noisyTranscript, "")), "implementation");
  assert.equal(classifyFailure(workerErrorText(providerStart + "\n" + providerResult, "")), "provider");
  assert.equal(classifyFailure(workerErrorText("", "Error: 429 rate limit")), "provider"); // stderr is the error channel
  // thread ids quoted inside transcript text are not the worker's id
  assert.equal(extractThreadId(ev({ type: "assistant", message: { text: `see ${TID}` } })), undefined);
});

test("implementation failure with a thread: no second /implement, thread id kept", async () => {
  const h = harness([{ code: 1, stdout: noisyTranscript }]);
  const out = await launchWorker(h.deps);
  assert.equal(h.launches.length, 1);
  assert.deepEqual(h.persisted, [TID]);
  assert.equal(out.kind, "blocked");
  assert.equal(out.kind === "blocked" && out.threadId, TID);
  assert.ok(out.kind === "blocked" && !/subscription unavailable/.test(out.reason));
});

test("provider failure AFTER a thread exists: no fresh Worker, thread preserved", async () => {
  const h = harness([{ code: 1, stdout: providerStart + "\n" + providerResult }]);
  const out = await launchWorker(h.deps);
  assert.equal(h.launches.length, 1);
  assert.deepEqual(h.persisted, [TID]);
  assert.equal(out.kind === "blocked" && out.threadId, TID);
  assert.match(out.kind === "blocked" ? out.reason : "", /provider\/runtime condition.*not launching another Worker/);
});

test("implementation failure before any thread: no model fallback", async () => {
  const h = harness([{ code: 1, stdout: "", stderr: "Error: cannot read project settings" }]);
  assert.equal((await launchWorker(h.deps)).kind, "blocked");
  assert.equal(h.launches.length, 1);
});

test("genuine provider failure before any thread or claim falls back to the next subscription Claude model", async () => {
  const h = harness([
    { code: 1, stdout: "", stderr: "Claude usage limit reached" },
    { code: 0, stdout: providerStart },
  ]);
  const out = await launchWorker(h.deps);
  assert.equal(h.launches.length, 2);
  assert.ok(h.launches[0]!.includes("model:claude-opus-5-5,effort:high"));
  assert.ok(h.launches[1]!.includes("model:claude-opus-5,effort:high"));
  assert.ok(h.launches.every((a) => a[a.indexOf("--mode") + 1] === "claude-code"));
  assert.deepEqual(out, { kind: "started", threadId: TID, model: "claude-opus-5" });
});

test("a branch/PR that appears before fallback prevents another Worker", async () => {
  const h = harness([{ code: 1, stdout: "", stderr: "HTTP 529 overloaded" }], [true]);
  const out = await launchWorker(h.deps);
  assert.equal(h.launches.length, 1);
  assert.equal(out.kind, "blocked");
  assert.match(out.kind === "blocked" ? out.reason : "", /now has a branch\/PR/);
  assert.equal(hasClaim(103, ["ticket/103-t0-06"], []), true);
  assert.equal(hasClaim(10, ["ticket/103-t0-06"], []), false);
  assert.equal(hasClaim(103, [], [{ number: 1, headRefName: "ticket/103-x", headRefOid: "a", isDraft: true }]), true);
});

test("every provider failure with no thread or claim exhausts the models and stops without paid fallback", async () => {
  const h = harness([{ code: 1, stdout: "", stderr: "usage limit" }]);
  const out = await launchWorker(h.deps);
  assert.equal(h.launches.length, 3);
  assert.match(out.kind === "blocked" ? out.reason : "", /not falling back to paid usage/);
});

test("only a system/init event establishes Worker identity", () => {
  for (const e of [
    { type: "assistant", session_id: TID }, { type: "user", session_id: TID }, { type: "tool_result", session_id: TID },
    { type: "result", subtype: "success", session_id: TID }, { type: "system", subtype: "other", session_id: TID },
    { type: "system", subtype: "init", session_id: `x ${TID}` }, { type: "system", subtype: "init", session_id: "not-a-thread" },
  ]) assert.equal(initThreadId(ev(e)), undefined, ev(e));
  assert.equal(initThreadId(providerStart), TID);
  assert.equal(initThreadId("not json"), undefined);
});

test("an earlier non-init session_id cannot win over the real init event", async () => {
  const other = "T-0aaaaaaa-b730-7542-bd8f-fcfc74a58524";
  const stream = [ev({ type: "assistant", session_id: other }), ev({ type: "result", session_id: other }), providerStart].join("\n");
  assert.equal(extractThreadId(stream), TID);
  const h = harness([{ code: 1, stdout: stream }]);
  await launchWorker(h.deps);
  assert.deepEqual(h.persisted, [TID]);
});

test("thread id is persisted while the Worker process is still running, before it exits", async () => {
  const persisted: string[] = [];
  let persistedWhileAlive: string[] | undefined;
  const deps: LaunchDeps = {
    ticket: 103,
    models: ["anthropic/claude-opus-5-5"],
    exec: async (_args, onLine) => {
      onLine(providerStart);
      await new Promise((r) => setTimeout(r, 50)); // process still alive
      persistedWhileAlive = [...persisted];
      return { code: 1, stdout: providerStart, stderr: "" };
    },
    persistThread: (id) => persisted.push(id),
    claimed: async () => false,
  };
  const out = await launchWorker(deps);
  assert.deepEqual(persistedWhileAlive, [TID]);
  assert.equal(out.kind === "blocked" && out.threadId, TID);
});
