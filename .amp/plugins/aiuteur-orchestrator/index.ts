// Aiuteur orchestrator: a boring state-machine operator. core.ts decides; this file performs the I/O the decision names.
// Worker = Claude Code mode on the user's subscription, launched through the Amp CLI (a plugin cannot select that mode,
// and raw Anthropic models are refused under claude_usage=subscription-only). Verifier = fresh OpenAI Orb thread per SHA.
// Must run inside a live Amp process; it starts nothing on load. Commands: see registerCommand below.
// @amp-agent-mode {"key":"aiu-verifier-1","label":"aiuteur verifier 1"}
// @amp-agent-mode {"key":"aiu-verifier-2","label":"aiuteur verifier 2"}
// @amp-agent-mode {"key":"aiu-verifier-3","label":"aiuteur verifier 3"}
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PluginAPI } from "@ampcode/plugin";
import {
  DEFAULT_CAP, REPO, mergeModeFrom, smokeReplyOk, smokeVerifierPrompt, VERIFIER_EFFORT, VERIFIER_INSTRUCTIONS, VERIFIER_MODELS, VERIFIER_TOOLS, WORKER_EFFORT,
  afterRepairSent, buildVerdict, classifyFailure, computeFrontier, decide, extractThreadId, invalidateVerdict, mergeGuard,
  mergeRejectedForHead, newRun, parseVerifierReply, repairPrompt, routeVerifier, routeWorker, selectTickets, verifierModeKey,
  verifierPrompt, workerContinueArgs, workerPrompt, workerStartArgs, type TicketRun,
} from "./core.ts";
import { dryRunReport } from "./dry-run.ts";
import { availableModels, ciFor, closeIssue, commentOnPr, githubSnapshot, issueState, mergePr, prForTicket, run as exec } from "./github.ts";

export const description = "Runs the Aiuteur ticket graph: Claude Code worker, fresh OpenAI verifier per SHA, exact-SHA merge.";

const CAP = Number(process.env.AIUTEUR_CAP ?? DEFAULT_CAP);
const MERGE_MODE = mergeModeFrom(process.env.AIUTEUR_MERGE); // manual (default) stops at MERGE_READY; AIUTEUR_MERGE=auto merges
const WORKER_TURN_MS = 3 * 60 * 60 * 1000;
const VERIFIER_TURN_MS = 60 * 60 * 1000;
const CI_POLL_MS = 60_000;
const CI_TIMEOUT_MS = 45 * 60 * 1000;

export default function (amp: PluginAPI) {
  const stateFile = join(amp.system.cacheDirectory, "runs.json");
  const load = (): Record<number, TicketRun> => {
    try { return JSON.parse(readFileSync(stateFile, "utf8")); } catch { return {}; }
  };
  const save = (r: TicketRun) => {
    mkdirSync(amp.system.cacheDirectory, { recursive: true });
    writeFileSync(stateFile, JSON.stringify({ ...load(), [r.ticket]: r }, null, 2));
  };
  const log = (t: number, msg: string) => amp.logger.log(`#${t} ${msg}`);

  // One agent per verifier model; each is a registered mode because Orb-backed custom agents must be.
  const verifierAgents = VERIFIER_MODELS.map((model, i) => {
    const agent = amp.createAgent({ name: "aiuteur-verifier", model, instructions: VERIFIER_INSTRUCTIONS, tools: [...VERIFIER_TOOLS], reasoningEffort: VERIFIER_EFFORT });
    amp.registerAgentMode({ key: verifierModeKey(i), label: `aiuteur verifier ${i + 1}`, description: "Leaf verifier of one Aiuteur PR at one exact SHA. Used only by the Aiuteur orchestrator.", color: "", agent: agent.definition });
    return agent;
  });

  const block = (r: TicketRun, reason: string): TicketRun => {
    log(r.ticket, `BLOCKED: ${reason}`);
    const next: TicketRun = { ...r, state: "BLOCKED", blockedReason: reason };
    save(next);
    return next;
  };

  // ---- Worker ------------------------------------------------------------------------------------------------------

  async function startWorker(r: TicketRun, models: string[]): Promise<TicketRun> {
    const exhausted: string[] = [];
    for (;;) {
      const route = routeWorker(models, exhausted);
      if (!route) return block(r, `Claude subscription unavailable for every preferred model (${exhausted.join(", ") || "none discovered"}); not falling back to paid usage`);
      const res = await exec("amp", workerStartArgs(workerPrompt(r.ticket), route.model, `[orchestrator] #${r.ticket} worker`), { timeoutMs: WORKER_TURN_MS });
      const out = `${res.stdout}\n${res.stderr}`;
      const threadId = extractThreadId(out);
      if (res.code === 0 && threadId) {
        const next: TicketRun = { ...r, state: "ACTIVE", workerThreadId: threadId, workerModel: route.model };
        save(next);
        return next;
      }
      if (classifyFailure(out) === "provider") { exhausted.push(route.model); log(r.ticket, `provider condition on ${route.model}; trying next subscription model`); continue; }
      return block(r, `worker run failed (exit ${res.code}${threadId ? `, thread ${threadId}` : ""}): ${out.slice(-400)}`);
    }
  }

  async function repairWorker(r: TicketRun, prompt: string): Promise<TicketRun> {
    const res = await exec("amp", workerContinueArgs(r.workerThreadId!, prompt), { timeoutMs: WORKER_TURN_MS });
    if (res.code === 0) return r;
    const out = `${res.stdout}\n${res.stderr}`;
    return block(r, `${classifyFailure(out) === "provider" ? "provider/runtime condition" : "worker continuation failed"}: ${out.slice(-400)}`);
  }

  // ---- Verifier (fresh Orb thread for every call) -------------------------------------------------------------------

  async function verify(r: TicketRun, pr: number, sha: string, models: string[]): Promise<TicketRun> {
    const exhausted: string[] = [];
    for (let invalid = 0; invalid < 2; ) {
      const route = routeVerifier(models, exhausted);
      if (!route) return block(r, "no OpenAI verifier model available; independence is never downgraded");
      const agent = verifierAgents[VERIFIER_MODELS.indexOf(route.model as (typeof VERIFIER_MODELS)[number])]!;
      let text: string;
      try {
        const thread = await agent.createThread({ executor: "orb", project: REPO, features: [] });
        await thread.appendUserMessage({ type: "user-message", content: verifierPrompt(r.ticket, pr, sha) });
        const reply = await thread.waitForResponse({ timeoutMs: VERIFIER_TURN_MS });
        text = reply.content.map((b) => ("text" in b ? b.text : "")).join("\n");
      } catch (e) {
        if (classifyFailure(String(e)) === "provider") { exhausted.push(route.model); continue; }
        return block(r, `verifier run failed: ${String(e).slice(0, 400)}`);
      }
      const parsed = parseVerifierReply(text, { pr, sha });
      if (!parsed.ok) { log(r.ticket, `invalid verdict (${parsed.reason}); fresh verifier`); invalid++; continue; }
      const withModels = { ...r, verifierModel: route.model, independence: route.independence };
      const verdict = buildVerdict(parsed.findings, { pr, sha }, withModels);
      await commentOnPr(pr, `Aiuteur verifier verdict for \`${sha}\`\n\n\`\`\`json\n${JSON.stringify(verdict, null, 2)}\n\`\`\``).catch(() => undefined);
      const next: TicketRun = { ...withModels, state: "VERIFYING", verdict, lastVerifiedSha: sha };
      save(next);
      return next;
    }
    return block(r, "verifier returned an invalid verdict twice (fresh verifier each time)");
  }

  // ---- one ticket, end to end ---------------------------------------------------------------------------------------

  async function drive(ticket: number): Promise<TicketRun> {
    const models = await availableModels();
    let r = load()[ticket] ?? newRun(ticket);
    if (!r.workerThreadId && r.state !== "BLOCKED" && r.state !== "DONE") r = await startWorker(r, models);
    const ciDeadline = Date.now() + CI_TIMEOUT_MS;
    for (let step = 0; step < 100 && r.state !== "DONE" && r.state !== "BLOCKED" && r.state !== "MERGE_READY"; step++) {
      const pr = await prForTicket(ticket);
      const ci = pr ? await ciFor(pr.headSha) : "pending";
      if (pr) r = { ...r, currentPR: pr.number, lastCandidateSha: pr.headSha };
      const action = decide(r, pr, ci, MERGE_MODE);
      log(ticket, `action ${action.type}${"reason" in action ? `: ${action.reason}` : ""}`);
      switch (action.type) {
        case "done":
          r = { ...r, state: "DONE" };
          save(r);
          break;
        case "escalate":
          r = block(r, action.reason);
          break;
        case "wait":
          if (action.for !== "ci" || Date.now() > ciDeadline) { r = block(r, action.reason); break; }
          await new Promise((res) => setTimeout(res, CI_POLL_MS));
          break;
        case "verify":
          r = await verify({ ...r, state: "VERIFYING" }, action.pr, action.sha, models);
          break;
        case "repair": {
          r = afterRepairSent(r, action);
          save(r);
          r = await repairWorker(r, repairPrompt(action, pr!.number));
          break;
        }
        case "merge-ready": {
          const live = (await prForTicket(ticket))!;
          const guard = mergeGuard(r.verdict, live, await ciFor(live.headSha));
          if (!guard.ok) { r = guard.reason === "head-moved" ? invalidateVerdict(r) : block(r, `not merge-ready: ${guard.reason}`); save(r); break; }
          r = { ...r, state: "MERGE_READY" };
          save(r);
          log(ticket, `MERGE_READY: would run gh pr merge ${action.pr} --match-head-commit ${action.sha}; stopping (manual-merge mode)`);
          break;
        }
        case "merge": {
          const live = (await prForTicket(ticket))!;
          const guard = mergeGuard(r.verdict, live, await ciFor(live.headSha));
          if (!guard.ok) { r = guard.reason === "head-moved" ? invalidateVerdict(r) : block(r, `merge refused: ${guard.reason}`); save(r); break; }
          const res = await mergePr(action.pr, action.sha);
          if (res.code === 0) {
            if ((await issueState(ticket)) === "OPEN") await closeIssue(ticket, `Merged via PR #${action.pr} at ${action.sha}; independent verifier PASS on that SHA and required CI green.`);
            r = { ...r, state: "DONE" };
          } else if (mergeRejectedForHead(res.stderr)) r = invalidateVerdict(r); // new SHA => fresh verifier, no blind retry
          else r = block(r, `merge failed: ${res.stderr.slice(0, 400)}`);
          save(r);
          break;
        }
      }
    }
    return r;
  }

  // ---- commands ----------------------------------------------------------------------------------------------------

  const activeRuns = () => Object.values(load()).filter((r) => r.state !== "DONE" && r.state !== "BLOCKED");

  amp.registerCommand("dry-run", { title: "Dry run", category: "aiuteur", description: "Read-only: show the live GitHub frontier and what would run." }, async (ctx) => {
    const report = await dryRunReport(CAP, activeRuns().length);
    amp.logger.log(report);
    await ctx.ui.notify(report);
  });

  amp.registerCommand("run-next", { title: "Run next ticket", category: "aiuteur", description: "Start ONE untouched eligible ticket end to end (Worker, verifier, merge). Asks for confirmation." }, async (ctx) => {
    const { issues, branches, prs } = await githubSnapshot();
    const pick = selectTickets(computeFrontier(issues, branches, prs), activeRuns().length, CAP)[0];
    if (!pick) return void (await ctx.ui.notify("No eligible ticket or no free concurrency slot."));
    const ok = await ctx.ui.confirm({ title: `Run #${pick.number}?`, message: `${pick.title}\n\nCreates a Claude Code worker Orb, runs /implement #${pick.number}, verifies with a fresh OpenAI Orb per SHA, and merges only after exact-SHA PASS + required CI.`, confirmButtonText: "Run" });
    if (!ok) return;
    const result = await drive(pick.number);
    await ctx.ui.notify(`#${pick.number}: ${result.state}${result.blockedReason ? ` (${result.blockedReason})` : ""}`);
  });

  amp.registerCommand("resume", { title: "Resume runs", category: "aiuteur", description: "Continue every unfinished run recorded in the orchestrator state file." }, async (ctx) => {
    for (const r of activeRuns()) await ctx.ui.notify(`#${r.ticket}: ${(await drive(r.ticket)).state}`);
  });

  amp.registerCommand("smoke-verifier", { title: "Smoke-test verifier launch", category: "aiuteur", description: "Create a fresh OpenAI verifier Orb with the production agent, tools and routing on a harmless prompt. Touches no ticket, PR or GitHub state." }, async (ctx) => {
    const route = routeVerifier(await availableModels());
    if (!route) return void (await ctx.ui.notify("No OpenAI verifier model available for a fresh Orb run."));
    const nonce = `SMOKE-${Math.random().toString(36).slice(2, 10)}`;
    let threadId: string | undefined;
    try {
      const thread = await verifierAgents[VERIFIER_MODELS.indexOf(route.model as (typeof VERIFIER_MODELS)[number])]!.createThread({ executor: "orb", project: REPO, features: [] });
      threadId = thread.id;
      await thread.appendUserMessage({ type: "user-message", content: smokeVerifierPrompt(nonce) });
      const reply = await thread.waitForResponse({ timeoutMs: 15 * 60 * 1000 });
      const text = reply.content.map((b) => ("text" in b ? b.text : "")).join("\n");
      return void (await ctx.ui.notify(`verifier smoke ${smokeReplyOk(text, nonce) ? "OK" : "UNEXPECTED REPLY"}; thread ${thread.id}; model ${route.model} (${route.modeKey}), independence ${route.independence}; reply: ${text.slice(0, 120)}`));
    } catch (e) {
      await ctx.ui.notify(`verifier smoke failed on ${route.model}; ${threadId ? `thread ${threadId}` : "thread creation outcome unknown"}; no retry: ${String(e).slice(0, 300)}`);
    }
  });

  amp.registerCommand("smoke-worker", { title: "Smoke-test worker launch", category: "aiuteur", description: "Launch a Claude Code subscription worker Orb on a no-op prompt to confirm model flags and thread-id capture. Touches no ticket." }, async (ctx) => {
    const route = routeWorker(await availableModels());
    if (!route) return void (await ctx.ui.notify("No subscription-backed Claude model available."));
    const res = await exec("amp", workerStartArgs("Reply with the single word READY. Do not run any command or change any file.", route.model, "[orchestrator] worker smoke test"), { timeoutMs: 15 * 60 * 1000 });
    await ctx.ui.notify(`exit ${res.code}; thread ${extractThreadId(res.stdout) ?? "NOT CAPTURED"}; model ${route.model}, effort ${WORKER_EFFORT}\n${res.stderr.slice(-300)}`);
  });
}
