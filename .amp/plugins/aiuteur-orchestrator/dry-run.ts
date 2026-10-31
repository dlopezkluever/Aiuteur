// Read-only dry run against the live GitHub graph and the durable orchestrator state:
//   node .amp/plugins/aiuteur-orchestrator/dry-run.ts [cap]      (state dir: $AIUTEUR_STATE_DIR, same default as the plugin)
// Starts nothing, claims nothing, mutates nothing, takes no lock. The plugin's `aiuteur: Dry run` command calls the same function.
import { computeFrontier, DEFAULT_CAP, formatDryRun, holdsSlot, ownsTicket, routeVerifier, routeWorker } from "./core.ts";
import { availableModels, githubSnapshot } from "./github.ts";
import { createStore, stateDir, type Runs } from "./state.ts";

/** `runs` must come from a validated read; an invalid state file throws before any capacity is inferred. */
export async function dryRunReport(cap: number, runs: Runs): Promise<string> {
  const all = Object.values(runs);
  const [{ issues, branches, prs }, models] = await Promise.all([githubSnapshot(), availableModels()]);
  return formatDryRun({
    frontier: computeFrontier(issues, branches, prs, all.filter(ownsTicket).map((r) => r.ticket)),
    activeRuns: all.filter(holdsSlot).length,
    cap,
    workerModel: routeWorker(models)?.model ?? null,
    verifierModel: routeVerifier(models)?.model ?? null,
  });
}

if (process.argv[1]?.endsWith("dry-run.ts")) {
  try {
    console.log(await dryRunReport(Number(process.argv[2] ?? process.env.AIUTEUR_CAP ?? DEFAULT_CAP), createStore(stateDir()).read()));
  } catch (e) {
    console.error(`dry run refused: cannot trust orchestrator state or GitHub: ${String(e)}`);
    process.exit(1);
  }
}
