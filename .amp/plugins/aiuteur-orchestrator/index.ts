// Aiuteur orchestrator: a boring state-machine operator. core.ts decides; this file performs the I/O the decision names.
// Worker = Claude Code mode on the user's subscription, launched through the Amp CLI (a plugin cannot select that mode,
// and raw Anthropic models are refused under claude_usage=subscription-only). Verifier = fresh OpenAI Orb thread per SHA.
// Must run inside a live Amp process; it starts nothing on load. Commands: see registerCommand below.
// @amp-agent-mode {"key":"aiu-verifier-1","label":"aiuteur verifier 1"}
// @amp-agent-mode {"key":"aiu-verifier-2","label":"aiuteur verifier 2"}
// @amp-agent-mode {"key":"aiu-verifier-3","label":"aiuteur verifier 3"}
import type { PluginAPI, ThreadID } from "@ampcode/plugin";
import {
  DEFAULT_CAP, REPO, mergeModeFrom, smokeReplyOk, smokeVerifierPrompt, VERIFIER_EFFORT, VERIFIER_INSTRUCTIONS, VERIFIER_MODELS, VERIFIER_TOOLS, WORKER_EFFORT,
  afterRepairSent, buildVerdict, holdsSlot, ownsTicket, classifyFailure, computeFrontier, hasClaim, launchWorker, workerErrorText, decide, extractThreadId, invalidateVerdict, mergeGuard,
  mergeRejectedForHead, parseVerifierReply, repairPrompt, routeVerifier, routeWorker, selectTickets, verifierModeKey,
  verifierPrompt, workerContinueArgs, workerPrompt, workerStartArgs, type TicketRun,
} from "./core.ts";
import { createStore, reserveLaunch } from "./state.ts";
import { dryRunReport } from "./dry-run.ts";
import { availableModels, ciFor, closeIssue, commentOnPr, githubSnapshot, issueState, mergePr, prForTicket, run as exec, runStreaming } from "./github.ts";

export const description = "Runs the Aiuteur ticket graph: Claude Code worker, fresh OpenAI verifier per SHA, exact-SHA merge.";

const CAP = Number(process.env.AIUTEUR_CAP ?? DEFAULT_CAP);
const MERGE_MODE = mergeModeFrom(process.env.AIUTEUR_MERGE); // manual (default) stops at MERGE_READY; AIUTEUR_MERGE=auto merges
const WORKER_TURN_MS = 3 * 60 * 60 * 1000;
const VERIFIER_TURN_MS = 60 * 60 * 1000;
const CI_POLL_MS = 60_000;
const CI_TIMEOUT_MS = 45 * 60 * 1000;

export default function (amp: PluginAPI) {
  const store = createStore(amp.system.cacheDirectory); // sole writer of run state (serialized, atomic)
  const load = () => store.read();
  const save = (r: TicketRun) => store.put(r);
  const log = (t: number, msg: string) => amp.logger.log(`#${t} ${msg}`);

  // One agent per verifier model; each is a registered mode because Orb-backed custom agents must be.
  const verifierAgents = VERIFIER_MODELS.map((model, i) => {
    const agent = amp.createAgent({ name: "aiuteur-verifier", model, instructions: VERIFIER_INSTRUCTIONS, tools: [...VERIFIER_TOOLS], reasoningEffort: VERIFIER_EFFORT });
    amp.registerAgentMode({ key: verifierModeKey(i), label: `aiuteur verifier ${i + 1}`, description: "Leaf verifier of one Aiuteur PR at one exact SHA. Used only by the Aiuteur orchestrator.", color: "", agent: agent.definition });
    return agent;
  });

  const block = async (r: TicketRun, reason: string, state: "BLOCKED" | "UNRESOLVED" = "BLOCKED"): Promise<TicketRun> => {
    log(r.ticket, `${state}: ${reason}`);
    const next: TicketRun = { ...r, state, blockedReason: reason };
    await save(next);
    return next;
  };

  // Killing the local CLI proves nothing about the remote Orb. Ask Amp to cancel the thread, then count it stopped only if
  // Amp reports it idle. Unproven against a live Worker; any doubt returns false and the reservation stays.
  const cancelRemote = async (id: string): Promise<boolean> => {
    try { const t = amp.threads.get(id as ThreadID); await t.cancel(); return (await t.state.get()) === "idle"; } catch { return false; }
  };

  // ---- Worker ------------------------------------------------------------------------------------------------------

  /** Precondition: `r` is the RESERVED run committed by reserveLaunch. */
  async function startWorker(r: TicketRun, models: string[]): Promise<TicketRun> {
    const out = await launchWorker({
      ticket: r.ticket,
      models,
      exec: (args, onLine, signal) => runStreaming("amp", args, onLine, WORKER_TURN_MS, signal),
      persistThread: (workerThreadId, workerModel) => store.update((runs) => { runs[r.ticket] = { ...(runs[r.ticket] ?? r), state: "ACTIVE", workerThreadId, workerModel }; }),
      cancelRemote,
      claimed: async () => { const g = await githubSnapshot(); return hasClaim(r.ticket, g.branches, g.prs); },
    });
    const cur = load()[r.ticket] ?? r;
    if (out.kind === "started") return cur;
    if (out.kind === "unresolved") return block({ ...cur, workerThreadId: out.threadId, workerModel: out.model }, out.reason, "UNRESOLVED");
    return block(cur, out.reason);
  }

  async function repairWorker(r: TicketRun, prompt: string): Promise<TicketRun> {
    const res = await exec("amp", workerContinueArgs(r.workerThreadId!, prompt), { timeoutMs: WORKER_TURN_MS });
    if (res.code === 0) return r;
    const out = workerErrorText(res.stdout, res.stderr);
    return await block(r, `${classifyFailure(out) === "provider" ? "provider/runtime condition" : "worker continuation failed"} (Worker thread ${r.workerThreadId} kept): ${out.trim().slice(-400)}`);
  }

  // ---- Verifier (fresh Orb thread for every call) -------------------------------------------------------------------

  async function verify(r: TicketRun, pr: number, sha: string, models: string[]): Promise<TicketRun> {
    const exhausted: string[] = [];
    for (let invalid = 0; invalid < 2; ) {
      const route = routeVerifier(models, exhausted);
      if (!route) return await block(r, "no OpenAI verifier model available; independence is never downgraded");
      const agent = verifierAgents[VERIFIER_MODELS.indexOf(route.model as (typeof VERIFIER_MODELS)[number])]!;
      let text: string;
      try {
        const thread = await agent.createThread({ executor: "orb", project: REPO, features: [] });
        await thread.appendUserMessage({ type: "user-message", content: verifierPrompt(r.ticket, pr, sha) });
        const reply = await thread.waitForResponse({ timeoutMs: VERIFIER_TURN_MS });
        text = reply.content.map((b) => ("text" in b ? b.text : "")).join("\n");
      } catch (e) {
        if (classifyFailure(String(e)) === "provider") { exhausted.push(route.model); continue; }
        return await block(r, `verifier run failed: ${String(e).slice(0, 400)}`);
      }
      const parsed = parseVerifierReply(text, { pr, sha });
      if (!parsed.ok) { log(r.ticket, `invalid verdict (${parsed.reason}); fresh verifier`); invalid++; continue; }
      const withModels = { ...r, verifierModel: route.model, independence: route.independence };
      const verdict = buildVerdict(parsed.findings, { pr, sha }, withModels);
      await commentOnPr(pr, `Aiuteur verifier verdict for \`${sha}\`\n\n\`\`\`json\n${JSON.stringify(verdict, null, 2)}\n\`\`\``).catch(() => undefined);
      const next: TicketRun = { ...withModels, state: "VERIFYING", verdict, lastVerifiedSha: sha };
      await save(next);
      return next;
    }
    return await block(r, "verifier returned an invalid verdict twice (fresh verifier each time)");
  }

  // ---- one ticket, end to end ---------------------------------------------------------------------------------------

  async function drive(ticket: number): Promise<TicketRun> {
    const models = await availableModels();
    let r = load()[ticket];
    if (!r) throw new Error(`no run recorded for #${ticket}; launches go through run-next's reservation`);
    if (r.state === "RESERVED" || (!r.workerThreadId && r.state !== "BLOCKED" && r.state !== "UNRESOLVED" && r.state !== "DONE")) {
      // Worker identity was never recorded: a Worker may exist. Hold the ticket and slot; never relaunch.
      return block(r, "launch reserved but no Worker thread was recorded (coordinator stopped mid-launch?); a Worker may exist. Resolve manually before re-running.", "UNRESOLVED");
    }
    if (r.state === "UNRESOLVED") return r;
    const ciDeadline = Date.now() + CI_TIMEOUT_MS;
    for (let step = 0; step < 100 && r.state !== "DONE" && r.state !== "BLOCKED" && r.state !== "UNRESOLVED" && r.state !== "MERGE_READY"; step++) {
      const pr = await prForTicket(ticket);
      const ci = pr ? await ciFor(pr.headSha) : "pending";
      if (pr) r = { ...r, currentPR: pr.number, lastCandidateSha: pr.headSha };
      const action = decide(r, pr, ci, MERGE_MODE);
      log(ticket, `action ${action.type}${"reason" in action ? `: ${action.reason}` : ""}`);
      switch (action.type) {
        case "done":
          r = { ...r, state: "DONE" };
          await save(r);
          break;
        case "escalate":
          r = await block(r, action.reason);
          break;
        case "wait":
          if (action.for !== "ci" || Date.now() > ciDeadline) { r = await block(r, action.reason); break; }
          await new Promise((res) => setTimeout(res, CI_POLL_MS));
          break;
        case "verify":
          r = await verify({ ...r, state: "VERIFYING" }, action.pr, action.sha, models);
          break;
        case "repair": {
          r = afterRepairSent(r, action);
          await save(r);
          r = await repairWorker(r, repairPrompt(action, pr!.number));
          break;
        }
        case "merge-ready": {
          const live = (await prForTicket(ticket))!;
          const guard = mergeGuard(r.verdict, live, await ciFor(live.headSha));
          if (!guard.ok) { r = (guard.reason === "head-moved" || guard.reason === "wrong-pr") ? invalidateVerdict(r) : await block(r, `not merge-ready: ${guard.reason}`); await save(r); break; }
          r = { ...r, state: "MERGE_READY" };
          await save(r);
          log(ticket, `MERGE_READY: would run gh pr merge ${action.pr} --match-head-commit ${action.sha}; stopping (manual-merge mode)`);
          break;
        }
        case "merge": {
          const live = (await prForTicket(ticket))!;
          const guard = mergeGuard(r.verdict, live, await ciFor(live.headSha));
          if (!guard.ok) { r = (guard.reason === "head-moved" || guard.reason === "wrong-pr") ? invalidateVerdict(r) : await block(r, `merge refused: ${guard.reason}`); await save(r); break; }
          const res = await mergePr(action.pr, action.sha);
          if (res.code === 0) {
            if ((await issueState(ticket)) === "OPEN") await closeIssue(ticket, `Merged via PR #${action.pr} at ${action.sha}; independent verifier PASS on that SHA and required CI green.`);
            r = { ...r, state: "DONE" };
          } else if (mergeRejectedForHead(res.stderr)) r = invalidateVerdict(r); // new SHA => fresh verifier, no blind retry
          else r = await block(r, `merge failed: ${res.stderr.slice(0, 400)}`);
          await save(r);
          break;
        }
      }
    }
    return r;
  }

  // ---- commands ----------------------------------------------------------------------------------------------------

  const heldSlots = () => Object.values(load()).filter(holdsSlot).length;
  const ownedTickets = () => Object.values(load()).filter(ownsTicket).map((r) => r.ticket);

  amp.registerCommand("dry-run", { title: "Dry run", category: "aiuteur", description: "Read-only: show the live GitHub frontier and what would run." }, async (ctx) => {
    const report = await dryRunReport(CAP, heldSlots(), ownedTickets());
    amp.logger.log(report);
    await ctx.ui.notify(report);
  });

  amp.registerCommand("run-next", { title: "Run next ticket", category: "aiuteur", description: "Start ONE untouched eligible ticket end to end (Worker, verifier, merge). Asks for confirmation." }, async (ctx) => {
    const { issues, branches, prs } = await githubSnapshot();
    const pick = selectTickets(computeFrontier(issues, branches, prs, ownedTickets()), heldSlots(), CAP)[0];
    if (!pick) return void (await ctx.ui.notify("No eligible ticket or no free concurrency slot."));
    const ok = await ctx.ui.confirm({ title: `Run #${pick.number}?`, message: `${pick.title}\n\nCreates a Claude Code worker Orb, runs /implement #${pick.number}, verifies with a fresh OpenAI Orb per SHA, and merges only after exact-SHA PASS + required CI.`, confirmButtonText: "Run" });
    if (!ok) return;
    // Confirmation authorizes THIS ticket only. Revalidate it on fresh GitHub state inside the lock, reserve, and only then launch.
    const models = await availableModels();
    const reservation = await reserveLaunch(store, githubSnapshot, pick.number, CAP);
    if (!reservation.ok) return void (await ctx.ui.notify(`Not launching #${pick.number}: ${reservation.reason}. State changed after confirmation; nothing started.`));
    const started = await startWorker(load()[pick.number]!, models);
    const result = started.state === "ACTIVE" ? await drive(pick.number) : started;
    await ctx.ui.notify(`#${pick.number}: ${result.state}${result.blockedReason ? ` (${result.blockedReason})` : ""}`);
  });

  amp.registerCommand("resume", { title: "Resume runs", category: "aiuteur", description: "Continue every unfinished run recorded in the orchestrator state file." }, async (ctx) => {
    for (const r of Object.values(load()).filter(holdsSlot)) await ctx.ui.notify(`#${r.ticket}: ${(await drive(r.ticket)).state}`);
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
