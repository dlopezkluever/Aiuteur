import { generationReadSchema, type ActionGroupId, type GenerationId, type GenerationRead, type Initiation, type JobId, type ProjectId, type WorkflowOperation } from "@aiuteur/contract";
import { compile, type CapturedInput, type ResolvedInputs } from "@aiuteur/compiler";
import type { History } from "@aiuteur/history";
import type { Jobs } from "@aiuteur/jobs";
import type { EffectiveModel, PriceEntry, ProfileSnapshot } from "@aiuteur/providers";
import { estimate, type PricePolicy } from "@aiuteur/spend";
import type { Clock, Ids, ReadTx, Scope, WriteTx } from "@aiuteur/store";

/** What an operation asks `generation.create` to record: the resolved truth, the selection made before compile, the target. */
export interface GenerationPlan {
  readonly projectId: ProjectId;
  readonly operation: WorkflowOperation;
  readonly inputs: ResolvedInputs;
  readonly effective: EffectiveModel;
  readonly profile: ProfileSnapshot;
  readonly prices: readonly PriceEntry[];
  /** The digest the inspector showed, when the creator acted from it. */
  readonly expectedDigest: string | null;
  readonly target: { readonly output: "option"; readonly kind: string };
  readonly actionGroup: ActionGroupId;
}

export type CreateResult =
  | { readonly result: "created"; readonly generationId: GenerationId; readonly jobId: JobId }
  | { readonly result: "blocked"; readonly compiled: Extract<ReturnType<typeof compile>, { result: "blocked" }>; readonly effective: EffectiveModel };

export function createRecord(options: { history: History; jobs: Jobs; clock: Clock; ids: Ids; pricePolicy: PricePolicy }) {
  const { history, jobs, clock, ids, pricePolicy } = options;
  return {
    /**
     * `generation.create` (MODULE §6 step 4): in the caller's ONE transaction, compile again and freeze, record the
     * Generation with every trace field (R22), write the capture edges through `history`, and enqueue its Job with the
     * outbox event. Generation and Job commit together, before any provider call (JOB-LIFECYCLE §4; Package P7). Requires an
     * `Initiation`, which only `api` mints (R6). Spend admission is T0-06's. A blocked fit creates nothing.
     */
    async create(wtx: WriteTx, scope: Scope, initiation: Initiation, plan: GenerationPlan): Promise<CreateResult> {
      if (initiation.accountId !== scope.accountId || initiation.creatorId !== scope.creatorId) throw new Error("the Initiation belongs to another creator");
      const compiled = compile(plan.inputs, plan.profile);
      if (compiled.result === "blocked") return { result: "blocked", compiled, effective: plan.effective };
      const at = clock.now();
      const today = new Date(at).toISOString().slice(0, 10);
      const generationId = ids.ordered() as GenerationId;
      const captured: CapturedInput[] = [...new Map(compiled.package.layers.flatMap((l) => l.sources).map((c) => [`${c.objectId}|${c.unit}`, c])).values()];
      await wtx.insertGeneration({
        generationId, projectId: plan.projectId, operation: plan.operation, operationClass: plan.effective.operationClass,
        initiation: { creatorId: initiation.creatorId, actionId: initiation.actionId, requestId: initiation.requestId, at: initiation.at, actionGroup: plan.actionGroup },
        effectiveModel: { ...plan.effective, reasons: [...plan.effective.reasons] }, versions: compiled.versions, testProvider: plan.profile.kind === "fake",
        resolvedInputs: plan.inputs, captured, package: compiled.package, fitReport: compiled.fit, renderedRequest: compiled.renderedRequest, requestDigest: compiled.digest,
        expectedDigest: plan.expectedDigest,
        estimate: estimate({ request: compiled.renderedRequest, digest: compiled.digest, rule: plan.profile.cost.billedQuantity, entries: plan.prices, today, policy: pricePolicy }),
        target: plan.target, createdAt: new Date(at).toISOString(),
      });
      const captures = await history.capture(wtx, scope, generationId, plan.projectId, captured.map((c) => ({ ...c, objectId: c.objectId as never })), at);
      if (captures.result !== "Applied") throw new Error(`capture refused: ${captures.reason}`);
      const job = jobs.newJob({ jobId: ids.ordered() as JobId, generationId, projectId: plan.projectId, run: 1 });
      await jobs.enqueue(wtx, job);
      return { result: "created", generationId, jobId: job.jobId };
    },
  };
}

/** `generation.read(scope, id)`: the stored record the inspector shows (content tier B), or null outside the Scope's project. */
export async function readGeneration(rtx: ReadTx, _scope: Scope, projectId: ProjectId, generationId: GenerationId): Promise<GenerationRead | null> {
  const row = await rtx.generation(generationId);
  if (!row || row.projectId !== projectId) return null;
  const [jobs, runs, calls, settlement] = await Promise.all([rtx.jobs(generationId), rtx.runs(generationId), rtx.calls(generationId), rtx.settlement(generationId)]);
  const settled = new Set(runs.map((r) => r.jobId));
  return generationReadSchema.parse({
    generationId: row.generationId, projectId: row.projectId, operation: row.operation, initiation: row.initiation, effectiveModel: row.effectiveModel, versions: row.versions,
    testProvider: row.testProvider, resolvedInputs: row.resolvedInputs, captured: row.captured, package: row.package, fit: row.fitReport, renderedRequest: row.renderedRequest,
    digest: row.requestDigest, expectedDigest: row.expectedDigest, estimate: row.estimate, target: row.target,
    // Settled runs from the run history, then any Job still in flight as it stands.
    runs: [...runs.map((r) => ({ jobId: r.jobId, run: r.run, state: r.state, operationRef: r.operationRef, failureClass: r.failureClass, billed: r.billed, reason: r.reason })),
      ...jobs.filter((j) => !settled.has(j.jobId)).map((j) => ({ jobId: j.jobId, run: j.run, state: j.state, operationRef: j.operationRef, failureClass: j.failureClass, billed: j.billed, reason: j.reason }))],
    calls: calls.map((c) => ({ index: c.index, role: c.role, jobId: c.jobId, requestDigest: c.requestDigest, operationRef: c.operationRef, response: c.response, verdict: c.verdict, reportedCost: c.reportedCost })),
    outcome: settlement && { outcome: settlement.outcome, reason: settlement.reason, actual: settlement.actual, outputs: settlement.outputs, settledAt: settlement.settledAt },
    createdAt: row.createdAt,
  });
}
