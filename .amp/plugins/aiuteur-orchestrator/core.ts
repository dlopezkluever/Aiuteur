// Pure control-plane decisions for the Aiuteur orchestrator. No I/O, no Amp imports: everything here is a function of
// live GitHub facts plus the small TicketRun record. GitHub stays the scheduler; this file never stores a graph.

export const REPO = "dlopezkluever/Aiuteur";
export const REQUIRED_CHECK = "verify";
export const DEFAULT_CAP = 1; // T0: one product ticket at a time (raise only when the live graph shows independence)
export const MAX_REPAIRS = 5; // absolute bound across all roots; the per-root rule below usually stops sooner

// ---- model routing -------------------------------------------------------------------------------------------------

// Claude Code mode on the user's subscription. Only these ids are ever tried, only via `--mode claude-code`, so there
// is no code path that reaches raw Anthropic billing. Strongest first.
export const WORKER_MODELS = ["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"] as const;
export const WORKER_EFFORT = "high";
export const VERIFIER_MODELS = ["openai/gpt-6-astra", "openai/gpt-6.1-sol", "openai/gpt-5.5"] as const;
export const VERIFIER_EFFORT = "high";

/** Verifier agent mode keys are positional so the static `@amp-agent-mode` directives in index.ts stay valid. */
export const verifierModeKey = (index: number) => `aiu-verifier-${index + 1}`;

/** `available` holds Amp model ids from `amp plugins show-agent-options --json`, e.g. "anthropic/claude-opus-5-5". */
export function routeWorker(available: readonly string[], exhausted: readonly string[] = []) {
  const model = WORKER_MODELS.find((m) => available.includes(`anthropic/${m}`) && !exhausted.includes(m));
  return model ? { mode: "claude-code" as const, model, effort: WORKER_EFFORT } : null;
}

export type Independence = "cross-family";

export function routeVerifier(available: readonly string[], exhausted: readonly string[] = []) {
  const index = VERIFIER_MODELS.findIndex((m) => available.includes(m) && !exhausted.includes(m));
  if (index < 0) return null; // never fall back to a Claude verifier: independence is not silently downgraded
  return { model: VERIFIER_MODELS[index]!, modeKey: verifierModeKey(index), independence: "cross-family" as Independence };
}

export type FailureKind = "provider" | "implementation";

/**
 * Provider/runtime conditions (capacity, quota, model gone) are not ticket failures and never count as repairs.
 * Pass ONLY text from the execution/provider error channel (see workerErrorText), never a Worker transcript: ticket
 * text, repo contents and test output routinely contain words like "quota" or "billing".
 */
export function classifyFailure(errorText: string): FailureKind {
  const providerPattern =
    /usage limit|rate.?limit|quota (exceeded|exhausted|reached)|overloaded|at capacity|\b(429|529|503)\b|model.{0,40}(not available|unavailable|not found)|subscription (limit|required|expired|inactive)|credit balance|billing (error|issue|required)|unauthori[sz]ed|login required|not logged in/i;
  return providerPattern.test(errorText) ? "provider" : "implementation";
}

// ---- Worker launch (Claude Code mode, subscription-backed) ----------------------------------------------------------

export const THREAD_ID = /T-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

export function workerStartArgs(prompt: string, model: string, title: string): string[] {
  return [
    "-ox", prompt,
    "--mode", "claude-code",
    "--features", `model:${model},effort:${WORKER_EFFORT}`,
    "--project", REPO,
    "--title", title,
    "--no-archive-after-execute",
    "--stream-json",
  ];
}

export function workerContinueArgs(threadId: string, prompt: string): string[] {
  return ["threads", "continue", threadId, "-ox", prompt, "--stream-json"];
}

/** `--stream-json` is one JSON event per line; the first (`system`/`init`) carries the new thread as `session_id`. */
function streamEvents(stdout: string): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = [];
  for (const line of stdout.split("\n")) {
    try { const e = JSON.parse(line); if (e && typeof e === "object") events.push(e); } catch { /* not an event line */ }
  }
  return events;
}
const EXACT_THREAD_ID = new RegExp(`^${THREAD_ID.source}$`);
/** The only event allowed to establish Worker identity: `{"type":"system","subtype":"init","session_id":"T-..."}`. */
export function initThreadId(line: string): string | undefined {
  try {
    const e = JSON.parse(line);
    if (e?.type === "system" && e.subtype === "init" && typeof e.session_id === "string" && EXACT_THREAD_ID.test(e.session_id)) return e.session_id;
  } catch { /* not an event line */ }
  return undefined;
}
export const extractThreadId = (stdout: string) => stdout.split("\n").map(initThreadId).find((id) => id !== undefined);
/** The execution error channel only: stderr plus the final `result` event when it is flagged is_error. Never assistant/user/tool events. */
export function workerErrorText(stdout: string, stderr: string): string {
  const result = streamEvents(stdout).filter((e) => e.type === "result").at(-1);
  const resultError = result && result.is_error === true && typeof result.result === "string" ? result.result : "";
  return `${stderr}\n${resultError}`;
}

export const hasClaim = (ticket: number, branches: string[], prs: PrNode[]) =>
  branches.some((b) => ticketOfBranch(b) === ticket) || prs.some((p) => ticketOfBranch(p.headRefName) === ticket);

export type LaunchOutcome =
  | { kind: "started"; threadId: string; model: string }
  | { kind: "blocked"; reason: string; threadId?: string; model?: string };

export interface LaunchDeps {
  ticket: number;
  models: readonly string[];
  /** Must call `onLine` for each stdout line as it arrives, not at exit. */
  exec: (args: string[], onLine: (line: string) => void) => Promise<{ code: number; stdout: string; stderr: string }>;
  /** Called the moment the init event arrives, while the Worker is still running, so a crash cannot lose the identity. */
  persistThread: (threadId: string, model: string) => void;
  /** Fresh read of live GitHub: does any ticket/<N>-* branch or PR exist now? */
  claimed: () => Promise<boolean>;
}

/**
 * Launches the Worker. A fresh `/implement #N` on another Claude model is only safe when the previous attempt never
 * established a Worker: no thread id observed, no ticket branch/PR appeared, and the failure is a genuine provider one.
 * Otherwise the existing Worker is preserved (BLOCKED, resumable by thread id) and nothing new is launched.
 */
export async function launchWorker(d: LaunchDeps): Promise<LaunchOutcome> {
  const exhausted: string[] = [];
  for (;;) {
    const route = routeWorker(d.models, exhausted);
    if (!route) return { kind: "blocked", reason: `Claude subscription unavailable for every preferred model (${exhausted.join(", ") || "none discovered"}); not falling back to paid usage` };
    let threadId: string | undefined;
    const res = await d.exec(workerStartArgs(workerPrompt(d.ticket), route.model, `[orchestrator] #${d.ticket} worker`), (line) => {
      const id = threadId ? undefined : initThreadId(line);
      if (id) { threadId = id; d.persistThread(id, route.model); }
    });
    if (res.code === 0 && threadId) return { kind: "started", threadId, model: route.model };
    const errorText = workerErrorText(res.stdout, res.stderr);
    const detail = `exit ${res.code}${threadId ? `, thread ${threadId}` : ""}: ${errorText.trim().slice(-400)}`;
    const provider = classifyFailure(errorText) === "provider";
    if (threadId) return { kind: "blocked", threadId, model: route.model, reason: `${provider ? "provider/runtime condition" : "worker run failed"} after Worker thread ${threadId} existed; not launching another Worker. Resume that thread (amp threads continue ${threadId}). ${detail}` };
    if (!provider) return { kind: "blocked", reason: `worker run failed (implementation): ${detail}` };
    if (await d.claimed()) return { kind: "blocked", reason: `provider condition on ${route.model}, but ticket #${d.ticket} now has a branch/PR; not launching another Worker. ${detail}` };
    exhausted.push(route.model);
  }
}

// ---- GitHub facts -> frontier --------------------------------------------------------------------------------------

export interface IssueNode {
  number: number;
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  blockedBy: { number: number; state: "OPEN" | "CLOSED" }[];
}
export interface PrNode { number: number; headRefName: string; headRefOid: string; isDraft: boolean }
export type ExecutionMode = "Agent" | "Mixed" | "Human" | "Unknown";
export interface Ticket {
  number: number;
  title: string;
  ready: boolean;
  mode: ExecutionMode;
  serial: boolean;
  openBlockers: number[];
  assignees: string[];
}

const TICKET_TITLE = /^\[[A-Za-z0-9]+-\d+\]/; // "[T0-09] ...": excludes the spec (#80), groups and follow-ups
const BRANCH = /^ticket\/(\d+)(?:-|$)/;

/** Returns null for anything that is not an implementation ticket. */
export function parseTicket(issue: IssueNode): Ticket | null {
  if (!TICKET_TITLE.test(issue.title)) return null;
  const mode = /\*\*Execution mode:\*\*\s*(Agent|Mixed|Human)/.exec(issue.body)?.[1] as ExecutionMode | undefined;
  const coordination = /\*\*Coordination[^\n]*?:\*\*([^\n]*)/.exec(issue.body)?.[1] ?? "";
  return {
    number: issue.number,
    title: issue.title,
    ready: issue.labels.includes("ready-for-agent"),
    mode: mode ?? "Unknown",
    serial: /\bserial\b/i.test(coordination),
    openBlockers: issue.blockedBy.filter((b) => b.state === "OPEN").map((b) => b.number),
    assignees: issue.assignees,
  };
}

export const ticketOfBranch = (name: string) => {
  const m = BRANCH.exec(name);
  return m ? Number(m[1]) : null;
};

export interface Claim { branches: string[]; prs: number[]; assignees: string[] }
export interface Frontier {
  runnable: Ticket[];
  blocked: Ticket[];
  inFlight: { ticket: Ticket; claim: Claim }[];
  humanGated: Ticket[];
  deferredSerial: Ticket[];
}

/** An open ticket with a `ticket/<n>-*` branch, an open PR from one, or an assignee is already claimed. */
export function computeFrontier(issues: IssueNode[], branches: string[], prs: PrNode[]): Frontier {
  const claimOf = (n: number): Claim => ({
    branches: branches.filter((b) => ticketOfBranch(b) === n),
    prs: prs.filter((p) => ticketOfBranch(p.headRefName) === n).map((p) => p.number),
    assignees: issues.find((i) => i.number === n)?.assignees ?? [],
  });
  const f: Frontier = { runnable: [], blocked: [], inFlight: [], humanGated: [], deferredSerial: [] };
  const tickets = issues.map(parseTicket).filter((t): t is Ticket => t !== null && t.ready).sort((a, b) => a.number - b.number);
  for (const t of tickets) {
    const claim = claimOf(t.number);
    if (claim.branches.length + claim.prs.length + claim.assignees.length > 0) f.inFlight.push({ ticket: t, claim });
    else if (t.mode !== "Agent") f.humanGated.push(t);
    else if (t.openBlockers.length > 0) f.blocked.push(t);
    else f.runnable.push(t);
  }
  if (f.inFlight.some((x) => x.ticket.serial)) {
    f.deferredSerial = f.runnable.filter((t) => t.serial);
    f.runnable = f.runnable.filter((t) => !t.serial);
  }
  return f;
}

/** Issue-number order is only a deterministic tie-break among tickets GitHub already says are runnable. */
export function selectTickets(frontier: Frontier, activeRuns: number, cap: number): Ticket[] {
  return frontier.runnable.slice(0, Math.max(0, cap - activeRuns));
}

// ---- verdicts ------------------------------------------------------------------------------------------------------

export const FINDING_CLASSES = ["REQUIREMENT_VIOLATION", "HARDENING_OPPORTUNITY", "IMPROVEMENT"] as const;
export type FindingClass = (typeof FINDING_CLASSES)[number];
export interface Finding { class: FindingClass; summary: string; requirement?: string; evidence?: string }

/** Everything we record about one verification; never written into the verified code tree. */
export interface Verdict {
  pr: number;
  sha: string;
  blocking: Finding[]; // REQUIREMENT_VIOLATION only
  nonBlocking: Finding[]; // HARDENING_OPPORTUNITY and IMPROVEMENT: recorded, never sent back
  workerMode: "claude-code";
  workerModel: string;
  verifierModel: string;
  independence: Independence;
}

export type ParsedReply = { ok: true; findings: Finding[] } | { ok: false; reason: string };

/**
 * The verifier ends its reply with one ```json block: {"pr":N,"verifiedSha":"...","findings":[...]}.
 * The verdict is derived from the findings (any REQUIREMENT_VIOLATION blocks), so a mislabelled "PASS" cannot slip by.
 * A reply for another PR or SHA, or a requirement violation without an owning requirement and evidence, is invalid.
 */
export function parseVerifierReply(text: string, expected: { pr: number; sha: string }): ParsedReply {
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  const raw = blocks.at(-1)?.[1];
  if (!raw) return { ok: false, reason: "no json verdict block" };
  let data: { pr?: unknown; verifiedSha?: unknown; findings?: unknown };
  try { data = JSON.parse(raw); } catch { return { ok: false, reason: "verdict block is not valid JSON" }; }
  if (data.pr !== expected.pr || data.verifiedSha !== expected.sha) {
    return { ok: false, reason: `verdict is for PR ${String(data.pr)} @ ${String(data.verifiedSha)}, expected PR ${expected.pr} @ ${expected.sha}` };
  }
  if (!Array.isArray(data.findings)) return { ok: false, reason: "findings must be an array" };
  const findings: Finding[] = [];
  for (const f of data.findings as Record<string, unknown>[]) {
    if (!FINDING_CLASSES.includes(f.class as FindingClass)) return { ok: false, reason: `unknown finding class ${String(f.class)}` };
    if (typeof f.summary !== "string" || f.summary.trim() === "") return { ok: false, reason: "finding without summary" };
    const finding: Finding = { class: f.class as FindingClass, summary: f.summary };
    if (typeof f.requirement === "string") finding.requirement = f.requirement;
    if (typeof f.evidence === "string") finding.evidence = f.evidence;
    if (finding.class === "REQUIREMENT_VIOLATION" && (!finding.requirement?.trim() || !finding.evidence?.trim())) {
      return { ok: false, reason: `requirement violation "${finding.summary}" lacks an owning requirement or reproducible evidence` };
    }
    findings.push(finding);
  }
  return { ok: true, findings };
}

export function buildVerdict(
  findings: Finding[],
  at: { pr: number; sha: string },
  run: Pick<TicketRun, "workerModel" | "verifierModel" | "independence">,
): Verdict {
  return {
    pr: at.pr,
    sha: at.sha,
    blocking: findings.filter((f) => f.class === "REQUIREMENT_VIOLATION"),
    nonBlocking: findings.filter((f) => f.class !== "REQUIREMENT_VIOLATION"),
    workerMode: "claude-code",
    workerModel: run.workerModel ?? "unknown",
    verifierModel: run.verifierModel ?? "unknown",
    independence: run.independence ?? "cross-family",
  };
}

// ---- per-ticket run record and next-action decision ----------------------------------------------------------------

export type RunState = "READY" | "ACTIVE" | "VERIFYING" | "MERGE_READY" | "DONE" | "BLOCKED";
export interface TicketRun {
  ticket: number;
  state: RunState;
  workerThreadId?: string | undefined;
  workerModel?: string | undefined;
  verifierModel?: string | undefined;
  independence?: Independence | undefined;
  repairAttempt: number; // repairs sent so far; > 0 while ACTIVE means "repairing"
  failures: Record<string, number>; // times each root requirement has been sent back
  currentPR?: number | undefined;
  lastCandidateSha?: string | undefined;
  lastVerifiedSha?: string | undefined;
  repairSentForSha?: string | undefined;
  verdict?: Verdict | undefined; // bound to (verdict.pr, verdict.sha); stale if either differs from the live PR
  blockedReason?: string | undefined;
}
export const newRun = (ticket: number): TicketRun => ({ ticket, state: "READY", repairAttempt: 0, failures: {} });

export type CiState = "pass" | "fail" | "pending";
export interface PrFacts { number: number; headSha: string; state: "OPEN" | "MERGED" | "CLOSED"; draft: boolean }

export type Action =
  | { type: "wait"; for: "ci" | "worker" | "blocked"; reason: string }
  | { type: "verify"; pr: number; sha: string }
  | { type: "repair"; level: "repair" | "diagnose"; sha: string; findings: Finding[] }
  | { type: "merge"; pr: number; sha: string }
  | { type: "merge-ready"; pr: number; sha: string } // manual-merge (pilot) mode: report and stop
  | { type: "escalate"; reason: string }
  | { type: "done" };

const rootKey = (f: Finding) => (f.requirement ?? f.summary).trim().toLowerCase();
const ciFinding = (sha: string): Finding => ({
  class: "REQUIREMENT_VIOLATION",
  requirement: `required check "${REQUIRED_CHECK}" must pass`,
  evidence: `check "${REQUIRED_CHECK}" failed on ${sha}`,
  summary: `Required CI check "${REQUIRED_CHECK}" is failing`,
});

/** First failure repairs; the second failure on the same root diagnoses first; the third stops for a human. */
function repairOrEscalate(run: TicketRun, findings: Finding[], sha: string): Action {
  const level = Math.max(...findings.map((f) => (run.failures[rootKey(f)] ?? 0) + 1));
  if (level >= 3) return { type: "escalate", reason: `same root requirement failed ${level} times: ${findings.map(rootKey).join("; ")}` };
  if (run.repairAttempt >= MAX_REPAIRS) return { type: "escalate", reason: `repair budget of ${MAX_REPAIRS} exhausted` };
  return { type: "repair", level: level === 1 ? "repair" : "diagnose", sha, findings };
}

/** Call once per repair actually delivered to the Worker. */
export function afterRepairSent(run: TicketRun, action: Extract<Action, { type: "repair" }>): TicketRun {
  const failures = { ...run.failures };
  for (const f of action.findings) failures[rootKey(f)] = (failures[rootKey(f)] ?? 0) + 1;
  return { ...run, failures, repairAttempt: run.repairAttempt + 1, repairSentForSha: action.sha, state: "ACTIVE" };
}

/** The whole lifecycle as one function of live facts. PR HEAD decides; an old verdict never carries over to a new SHA. */
export type MergeMode = "manual" | "auto";
/** Manual is the default: only an explicit AIUTEUR_MERGE=auto lets the coordinator merge. A runtime option, not a gate. */
export const mergeModeFrom = (env: string | undefined): MergeMode => (env === "auto" ? "auto" : "manual");

export function decide(run: TicketRun, pr: PrFacts | null, ci: CiState, mode: MergeMode = "auto"): Action {
  if (run.state === "DONE") return { type: "done" };
  if (run.state === "BLOCKED") return { type: "wait", for: "blocked", reason: run.blockedReason ?? "blocked" };
  if (!pr) return { type: "wait", for: "worker", reason: "no candidate PR yet" };
  if (pr.state === "MERGED") return { type: "done" };
  if (pr.state === "CLOSED") return { type: "escalate", reason: `PR #${pr.number} was closed without merging` };
  if (pr.draft) return { type: "wait", for: "worker", reason: "PR is still a draft" };

  const sha = pr.headSha;
  const verdict = run.verdict?.sha === sha && run.verdict.pr === pr.number ? run.verdict : undefined; // key = (PR, SHA)
  if (!verdict) {
    if (ci === "fail") return repairOrEscalate(run, [ciFinding(sha)], sha); // no point verifying red code
    return { type: "verify", pr: pr.number, sha };
  }
  if (verdict.blocking.length > 0) {
    if (run.repairSentForSha === sha) return { type: "wait", for: "worker", reason: "repair sent; waiting for a new commit" };
    return repairOrEscalate(run, verdict.blocking, sha);
  }
  if (ci === "pending") return { type: "wait", for: "ci", reason: `required check "${REQUIRED_CHECK}" is not finished` };
  if (ci === "fail") {
    if (run.repairSentForSha === sha) return { type: "wait", for: "worker", reason: "repair sent; waiting for a new commit" };
    return repairOrEscalate(run, [ciFinding(sha)], sha);
  }
  return { type: mode === "manual" ? "merge-ready" : "merge", pr: pr.number, sha };
}

// ---- merge safeguards ----------------------------------------------------------------------------------------------

export type MergeGuard = { ok: true } | { ok: false; reason: "head-moved" | "wrong-pr" | "no-pass-verdict" | "ci-not-green" | "not-open" };

/** Re-check against freshly queried GitHub state immediately before merging. */
export function mergeGuard(verdict: Verdict | undefined, live: PrFacts, ci: CiState): MergeGuard {
  if (!verdict || verdict.blocking.length > 0) return { ok: false, reason: "no-pass-verdict" };
  if (live.state !== "OPEN" || live.draft) return { ok: false, reason: "not-open" };
  if (live.number !== verdict.pr) return { ok: false, reason: "wrong-pr" };
  if (live.headSha !== verdict.sha) return { ok: false, reason: "head-moved" };
  if (ci !== "pass") return { ok: false, reason: "ci-not-green" };
  return { ok: true };
}

export const mergeArgs = (pr: number, sha: string) => ["pr", "merge", String(pr), "-R", REPO, "--merge", "--match-head-commit", sha];

/** GitHub refusing because the head moved invalidates the verdict; it is never retried blindly. */
export const mergeRejectedForHead = (stderr: string) => /head branch was modified|match-head-commit|expected head sha/i.test(stderr);
export const invalidateVerdict = (run: TicketRun): TicketRun => ({ ...run, verdict: undefined, state: "VERIFYING" });

/** Latest required-check state for one SHA from check-runs; a rerun that passes outranks an earlier failure. */
export function ciState(runs: { name: string; status: string; conclusion: string | null }[]): CiState {
  const mine = runs.filter((r) => r.name === REQUIRED_CHECK);
  if (mine.length === 0 || mine.some((r) => r.status !== "completed")) return "pending";
  return mine.some((r) => r.conclusion === "success") ? "pass" : "fail";
}

// ---- prompts -------------------------------------------------------------------------------------------------------

export function workerPrompt(ticket: number): string {
  return `/implement #${ticket}

Delivery contract for this run:
- Work on a branch named \`ticket/${ticket}-<short-slug>\` cut from the latest origin/main, and push it.
- Open one non-draft pull request against main whose body says "Closes #${ticket}". Do not merge it. Do not close the issue.
- An independent verifier will review the exact HEAD SHA of the PR. Keep the PR focused on this ticket's acceptance criteria.
- Do not ask the human about routine decisions: inspect the repo or runtime, or take the smallest reasonable choice consistent with settled architecture. Stop and say so only for a contradiction between settled authorities or a genuinely human prerequisite (credentials, external approval).
- Finish by replying with the PR number.`;
}

const root = (findings: Finding[]) =>
  findings.map((f, i) => `${i + 1}. ${f.summary}\n   Requirement: ${f.requirement}\n   Evidence: ${f.evidence}`).join("\n");

export function repairPrompt(action: Extract<Action, { type: "repair" }>, pr: number): string {
  const head = `The independent verifier found requirement violations on PR #${pr} at ${action.sha}:\n${root(action.findings)}\n\n`;
  const rule = "Fix only these, with the smallest maintainable change that satisfies the owning requirement. Do not adopt the verifier's suggested architecture, add new frameworks, or add persistent global checks. Add a regression test or evidence that reproduces each failure. Push to the same branch and reply with the new HEAD SHA.";
  if (action.level === "repair") return head + rule;
  return `${head}This root requirement has already been repaired once and failed again. Before patching, diagnose why the previous repair did not work: is the cause implementation difficulty, an incorrect assumption, the environment, a missing prerequisite, a misunderstood contract, or an architectural mismatch? State the diagnosis. Repair only if the diagnosis supports it; otherwise stop and report the blocker. ${rule}`;
}

export function verifierPrompt(ticket: number, pr: number, sha: string): string {
  return `YOU ARE A LEAF VERIFIER.

Verify ticket #${ticket} (GitHub issue in ${REPO}) against PR #${pr} at exact HEAD SHA ${sha}.

Setup: \`git fetch origin pull/${pr}/head\`, \`git checkout --detach ${sha}\`, and confirm \`git rev-parse HEAD\` prints ${sha}. Read the issue with \`gh issue view ${ticket} -R ${REPO}\` and the documents it cites.

Treat the Worker's report as claims to reproduce, not proof. A green test suite is evidence, not the verdict. Inspect, as relevant: the ticket's acceptance criteria, the owning specification and docs, the actual diff, real runtime behaviour, current required checks, preservation requirements, test quality, and scope/proportionality.

Do not modify implementation files. Do not repair findings. Do not commit. Do not push. Do not merge. Do not close the ticket. Do not choose another ticket. Do not delegate. Do not spawn another reviewer or verifier. Do not recursively invoke review orchestration.

Classify every finding as exactly one of:
- REQUIREMENT_VIOLATION: a reproducible violation of the ticket's acceptance criteria, the canonical specification, an owning architecture rule, a frozen contract, or a mandatory active gate. You must name the owning requirement (a stable citation) and give reproducible evidence.
- HARDENING_OPPORTUNITY: extra protection against exotic bypasses, unsupported constructions or theoretical edge cases. Not blocking unless settled authority already requires it.
- IMPROVEMENT: elegance, maintainability, optional cleanup, coverage or documentation polish. Not blocking.
Verification proves requirements; it does not create them. Do not turn a clever theoretical bypass into a requirement.

End your reply with exactly one fenced json block and nothing after it:
\`\`\`json
{"pr": ${pr}, "verifiedSha": "${sha}", "findings": [{"class": "REQUIREMENT_VIOLATION", "requirement": "<stable citation>", "evidence": "<how to reproduce>", "summary": "<one line>"}]}
\`\`\`
Use an empty findings array when there is nothing to report.`;
}

/** Commissioning smoke test for the verifier path. Names no ticket, PR or SHA, so it cannot target product work. */
export const smokeVerifierPrompt = (nonce: string) =>
  `Commissioning check. Reply with exactly this token and nothing else: ${nonce}. Do not run any command, read or change any file, or use any GitHub resource.`;
export const smokeReplyOk = (text: string, nonce: string) => text.trim() === nonce;

export const VERIFIER_INSTRUCTIONS = "You are a leaf verifier for Aiuteur pull requests. Follow the task message exactly. You have read-only repository, Git, GitHub and test-running tools only.";
// Narrowest practical allowlist: read, run tests/commands, read-only research. No edit/create/patch, no thread tools.
export const VERIFIER_TOOLS = ["Read", "shell_command", "shell_command_status", "shell_command_kill", "read_web_page", "web_search", "view_media"] as const;

// ---- dry-run report ------------------------------------------------------------------------------------------------

export interface DryRunInput {
  frontier: Frontier;
  activeRuns: number;
  cap: number;
  workerModel: string | null;
  verifierModel: string | null;
}

export function formatDryRun({ frontier, activeRuns, cap, workerModel, verifierModel }: DryRunInput): string {
  const line = (t: Ticket) => `  #${t.number} ${t.title}`;
  const list = (items: string[]) => (items.length ? items.join("\n") : "  (none)");
  const selected = selectTickets(frontier, activeRuns, cap);
  const first = selected[0];
  const soon = new Set([...frontier.runnable, ...frontier.inFlight.map((x) => x.ticket)].map((t) => t.number));
  const nextUp = frontier.blocked.filter((t) => t.openBlockers.every((n) => soon.has(n)));
  return [
    "Current runnable frontier:",
    list(frontier.runnable.map(line)),
    "",
    `Excluded as blocked (${frontier.blocked.length} total; listing those whose open blockers are all runnable or in flight):`,
    list(nextUp.map((t) => `${line(t)}  <- blocked by ${t.openBlockers.map((n) => `#${n}`).join(", ")}`)),
    "",
    "Excluded as already in progress (branch, open PR or assignee):",
    list(frontier.inFlight.map(({ ticket, claim }) => `${line(ticket)}  <- ${[...claim.branches, ...claim.prs.map((n) => `PR #${n}`), ...claim.assignees.map((a) => `@${a}`)].join(", ")}`)),
    "",
    "Excluded as human-gated (Execution mode is not Agent):",
    list(frontier.humanGated.map((t) => `${line(t)}  [${t.mode}]`)),
    ...(frontier.deferredSerial.length ? ["", "Deferred (serial surface already in flight):", list(frontier.deferredSerial.map(line))] : []),
    "",
    `Concurrency allowed: cap ${cap}, orchestrator-active ${activeRuns}, free slots ${Math.max(0, cap - activeRuns)}`,
    "",
    "Would select:",
    list(selected.map(line)),
    "",
    "Worker:",
    `  Claude Code / subscription-backed (--mode claude-code, effort ${WORKER_EFFORT})`,
    `  model: ${workerModel ?? "NONE AVAILABLE (would stop: provider limitation)"}`,
    "Verifier:",
    "  OpenAI, fresh Orb per candidate SHA",
    `  model: ${verifierModel ?? "NONE AVAILABLE (would stop: independence is never downgraded)"}`,
    "",
    `Would create Worker Orb: ${first && workerModel && verifierModel ? "yes" : "no"}`,
    `Would invoke: ${first ? `/implement #${first.number}` : "(nothing)"}`,
    "Would require independent verification: yes",
    "Would merge only: after exact-SHA PASS + required CI (gh pr merge --match-head-commit <verified-sha>)",
  ].join("\n");
}
