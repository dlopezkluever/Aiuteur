// Read-only dry run against the live GitHub graph: `node .amp/plugins/aiuteur-orchestrator/dry-run.ts [cap]`.
// Starts nothing, claims nothing, mutates nothing. index.ts exposes the same report as the `aiuteur: dry run` command.
import { computeFrontier, DEFAULT_CAP, formatDryRun, routeVerifier, routeWorker } from "./core.ts";
import { availableModels, githubSnapshot } from "./github.ts";

export async function dryRunReport(cap: number, activeRuns = 0): Promise<string> {
  const [{ issues, branches, prs }, models] = await Promise.all([githubSnapshot(), availableModels()]);
  return formatDryRun({
    frontier: computeFrontier(issues, branches, prs),
    activeRuns,
    cap,
    workerModel: routeWorker(models)?.model ?? null,
    verifierModel: routeVerifier(models)?.model ?? null,
  });
}

if (process.argv[1]?.endsWith("dry-run.ts")) {
  console.log(await dryRunReport(Number(process.argv[2] ?? process.env.AIUTEUR_CAP ?? DEFAULT_CAP)));
}
