// Live GitHub and Amp CLI reads. Reads only, except mergePr/closeIssue/commentOnPr, which index.ts calls after the
// deterministic merge guard. Nothing here caches: every call asks GitHub.
import { execFile, spawn } from "node:child_process";
import { ciState, REPO, ticketOfBranch, type CiState, type IssueNode, type PrFacts, type PrNode, mergeArgs } from "./core.ts";

export function run(cmd: string, args: string[], opts: { timeoutMs?: number; input?: string } = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, { maxBuffer: 256 * 1024 * 1024, timeout: opts.timeoutMs ?? 120_000 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === "number" ? error.code : 1) : 0;
      resolve({ stdout, stderr: stderr || (error && typeof error.code !== "number" ? String(error.message) : ""), code });
    });
    if (opts.input !== undefined) child.stdin?.end(opts.input);
  });
}

/** Like `run`, but hands each stdout line to `onLine` as it arrives (the Worker's stream-json). Still returns everything at exit. */
export function runStreaming(cmd: string, args: string[], onLine: (line: string) => void, timeoutMs: number, signal?: AbortSignal): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, ...(signal ? { signal } : {}) });
    let stdout = "", stderr = "", pending = "";
    child.stdout.on("data", (d: Buffer) => {
      const text = d.toString();
      stdout += text;
      pending += text;
      let nl: number;
      while ((nl = pending.indexOf("\n")) >= 0) { onLine(pending.slice(0, nl)); pending = pending.slice(nl + 1); }
    });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("error", (e) => resolve({ stdout, stderr: stderr || String(e.message), code: 1 }));
    child.on("close", (code) => { if (pending) onLine(pending); resolve({ stdout, stderr, code: code ?? 1 }); });
  });
}

async function gh(args: string[]): Promise<string> {
  const r = await run("gh", args);
  if (r.code !== 0) throw new Error(`gh ${args.slice(0, 3).join(" ")} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

const [OWNER, NAME] = REPO.split("/") as [string, string];

const ISSUES_QUERY = `query($o:String!,$n:String!,$endCursor:String){repository(owner:$o,name:$n){issues(states:OPEN,first:100,after:$endCursor){
  pageInfo{hasNextPage endCursor}
  nodes{number title body labels(first:30){nodes{name}} assignees(first:5){nodes{login}} blockedBy(first:50){nodes{number state}}}}}}`;

export async function openIssues(): Promise<IssueNode[]> {
  const out = await gh(["api", "graphql", "--paginate", "-f", `query=${ISSUES_QUERY}`, "-f", `o=${OWNER}`, "-f", `n=${NAME}`,
    "--jq", ".data.repository.issues.nodes[] | {number,title,body,labels:[.labels.nodes[].name],assignees:[.assignees.nodes[].login],blockedBy:.blockedBy.nodes}"]);
  return out.split("\n").filter(Boolean).map((l) => JSON.parse(l) as IssueNode);
}

export async function ticketBranches(): Promise<string[]> {
  const out = await gh(["api", "--paginate", `repos/${REPO}/git/matching-refs/heads/ticket/`, "--jq", ".[].ref"]);
  return out.split("\n").filter(Boolean).map((r) => r.replace(/^refs\/heads\//, ""));
}

export async function openTicketPrs(): Promise<PrNode[]> {
  const out = await gh(["pr", "list", "-R", REPO, "--state", "open", "-L", "200", "--json", "number,headRefName,headRefOid,isDraft"]);
  return (JSON.parse(out) as PrNode[]).filter((p) => ticketOfBranch(p.headRefName) !== null);
}

export async function githubSnapshot() {
  const [issues, branches, prs] = await Promise.all([openIssues(), ticketBranches(), openTicketPrs()]);
  return { issues, branches, prs };
}

/** The PR for a ticket branch, whatever its state; null until the Worker has opened one. */
export async function prForTicket(ticket: number): Promise<PrFacts | null> {
  const out = await gh(["pr", "list", "-R", REPO, "--state", "all", "-L", "100", "--json", "number,headRefName,headRefOid,isDraft,state"]);
  const prs = (JSON.parse(out) as (PrNode & { state: PrFacts["state"] })[]).filter((p) => ticketOfBranch(p.headRefName) === ticket);
  const pr = prs.sort((a, b) => b.number - a.number)[0];
  return pr ? { number: pr.number, headSha: pr.headRefOid, state: pr.state, draft: pr.isDraft } : null;
}

export async function ciFor(sha: string): Promise<CiState> {
  const out = await gh(["api", `repos/${REPO}/commits/${sha}/check-runs`, "--jq", "[.check_runs[]|{name,status,conclusion}]"]);
  return ciState(JSON.parse(out));
}

export async function mergePr(pr: number, sha: string) {
  return run("gh", mergeArgs(pr, sha));
}

export const closeIssue = (n: number, comment: string) => gh(["issue", "close", String(n), "-R", REPO, "--comment", comment]);
export const commentOnPr = (n: number, body: string) => gh(["pr", "comment", String(n), "-R", REPO, "--body", body]);
export const issueState = async (n: number) => (await gh(["issue", "view", String(n), "-R", REPO, "--json", "state", "--jq", ".state"])).trim();

/** Amp model ids available to this account, e.g. "anthropic/claude-opus-5-5". */
export async function availableModels(): Promise<string[]> {
  const r = await run("amp", ["plugins", "show-agent-options", "--json"]);
  if (r.code !== 0) throw new Error(`amp plugins show-agent-options failed: ${r.stderr.trim()}`);
  return (JSON.parse(r.stdout) as { models: { id: string }[] }).models.map((m) => m.id);
}
