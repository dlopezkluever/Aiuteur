import { renderedRequestSchema, type Billed, type Environment, type FailureClass, type GenerationId, type ObjectId, type ProjectId, type Verdict } from "@aiuteur/contract";
import { requestDigest } from "@aiuteur/compiler";
import type { History } from "@aiuteur/history";
import { LeaseLost, type Jobs } from "@aiuteur/jobs";
import { gate, priceEntries, type Catalogue, type CredentialHandle, type ProviderTransport, type ReportedCost } from "@aiuteur/providers";
import { actual } from "@aiuteur/spend";
import type { Clock, Ids, Leased, Scope, Store, WriteTx } from "@aiuteur/store";

/** What an operation supplies to settle its output (FC6: `validate` and `attach`); `generation` runs them inside the settling transaction. */
export interface OperationSettler<P> {
  /** The guard composition over the raw response (T0-05: G1 schema only). */
  validate(response: string): { readonly verdict: Verdict; readonly proposal: P | null };
  /** Pure: the validated proposal as an AttachPlan for `history.commit` (never selects, approves or accepts). */
  attach(proposal: P, generationId: GenerationId, newId: () => string): { readonly kind: string; readonly body: unknown };
}

export type DispatchOutcome =
  | { readonly result: "settled"; readonly generationId: GenerationId }
  /** Accepted by an asynchronous provider: the Job is `running` and a worker observes it (T0b). */
  | { readonly result: "in-progress"; readonly generationId: GenerationId }
  /** The F3 gate refused before any send; the Generation settled failed and nothing reached the provider. */
  | { readonly result: "refused"; readonly generationId: GenerationId; readonly clause: string };

export interface DispatchOptions {
  readonly store: Store;
  readonly history: History;
  readonly jobs: Jobs;
  readonly catalogue: Catalogue;
  /** The adapter for an Offering (composition root). */
  readonly transportFor: (offeringId: string) => ProviderTransport | undefined;
  /** The credential seam (EI9): a handle for this Account and Offering, or null. */
  readonly credential: (scope: Scope, offeringId: string) => CredentialHandle | null;
  /** Injected (build rule R24): read only at composition roots. */
  readonly environment: Environment;
  readonly clock: Clock;
  readonly ids: Ids;
}

/**
 * The single dispatch path (MODULE §3.3; build rule R5: the only caller of `submit`). For a claimed Job it writes the
 * submission intent (queued → submitting) before any call, reads the Rendered request stored on the Generation, runs the
 * F3 gate immediately before `submit`, sends exactly that request, and settles in ONE transaction: the operation's
 * attach through `history.commit`, the call log, the run history, the actual cost set once, the Job's terminal state and
 * the outbox events (JOB-LIFECYCLE §11).
 */
export function createDispatch(options: DispatchOptions) {
  const { store, history, jobs, catalogue, clock, ids } = options;
  const iso = () => new Date(clock.now()).toISOString();

  async function settleFailed(wtx: WriteTx, lease: Leased, generationId: GenerationId, projectId: ProjectId, run: number, from: "queued" | "submitting", failure: { failureClass: FailureClass; billed: Billed; reason: string; operationRef: string | null }, cost: ReturnType<typeof actual>) {
    await jobs.settle(wtx, lease, from, "failed", failure, async () => {
      await wtx.insertRun({ generationId, jobId: lease.jobId, projectId, run, state: "failed", ...failure, createdAt: iso() });
      await wtx.insertSettlement({ generationId, projectId, outcome: "failed", reason: failure.reason, actual: cost, outputs: [], settledAt: iso() });
      await wtx.appendEvent({ type: "generation.settled", generationId, outcome: "failed", occurredAt: iso() });
    });
  }

  return async function dispatch<P>(scope: Scope, lease: Leased, operation: OperationSettler<P>): Promise<DispatchOutcome> {
    if (lease.accountId !== scope.accountId) throw new Error("the lease belongs to another Account");
    // Write-ahead intent: the Job is `submitting` before the provider is called (JOB-LIFECYCLE §3).
    const record = await store.write(scope, async (wtx) => {
      const job = await wtx.job(lease.jobId);
      const generation = job && await wtx.generation(job.generationId);
      if (!job || !generation) throw new LeaseLost(lease.jobId);
      // Past the admission deadline: fail with the deadline's reason, never submit (RUNTIME §4.2 tick; JOB-LIFECYCLE §2).
      if (job.state === "queued" && job.deadlineAt !== null && Date.parse(job.deadlineAt) <= clock.now()) {
        await settleFailed(wtx, lease, generation.generationId, generation.projectId, job.run, "queued", { failureClass: "transient-unbilled", billed: "no", reason: "queue_timeout", operationRef: null }, { form: "unknown", billed: "no" });
        return { expired: generation.generationId } as const;
      }
      if (!await jobs.transition(wtx, lease, "queued", "submitting")) throw new LeaseLost(lease.jobId);
      return { job, generation };
    });
    if ("expired" in record) return { result: "settled", generationId: record.expired };
    const { job, generation } = record;
    const generationId = generation.generationId;
    const request = renderedRequestSchema.parse(generation.renderedRequest);
    // P1: what is sent is the stored request, identified by its stored digest.
    if (requestDigest(request) !== generation.requestDigest) throw new Error("stored Rendered request does not match its digest");
    const effective = generation.effectiveModel as { offeringId: string; profileSnapshotId: string };
    const offering = catalogue.offerings.find((o) => o.profile.offeringId === effective.offeringId);
    const transport = options.transportFor(effective.offeringId);
    const credential = options.credential(scope, effective.offeringId);
    const verdict = gate({
      operationClass: generation.operationClass, status: offering?.status,
      snapshot: { recorded: effective.profileSnapshotId, catalogue: offering?.profile.snapshotId, transport: transport?.profile.snapshotId ?? "" },
      credential, fit: generation.fitReport as never, digest: { expected: generation.expectedDigest, recorded: generation.requestDigest },
      estimate: generation.estimate as never, estimateConfirmed: false, environment: options.environment, transportKind: transport?.kind ?? "real",
    });
    if (verdict.result === "refused" || !transport || !credential) {
      const reason = verdict.result === "refused" ? `gate:${verdict.clause}:${verdict.reason}` : "gate:transport:absent";
      await store.write(scope, (wtx) => settleFailed(wtx, lease, generationId, generation.projectId, job.run, "submitting", { failureClass: verdict.result === "refused" ? verdict.failureClass : "platform-configuration", billed: "no", reason, operationRef: null }, { form: "unknown", billed: "no" }));
      return { result: "refused", generationId, clause: verdict.result === "refused" ? verdict.clause : "status" };
    }

    const sent = await transport.submit({ request: { digest: generation.requestDigest, request }, credential, idempotencyKey: lease.jobId, generationId });
    const prices = priceEntries(catalogue, effective.offeringId, generation.operationClass);
    if (sent.outcome === "accepted") {
      await store.write(scope, async (wtx) => {
        if (!await jobs.transition(wtx, lease, "submitting", "running", { operationRef: sent.operation })) throw new LeaseLost(lease.jobId);
      });
      await jobs.release(lease);
      return { result: "in-progress", generationId };
    }
    if (sent.outcome === "refused" || sent.outcome === "unconfirmed") {
      const failure = sent.outcome === "refused"
        ? { failureClass: sent.failureClass, billed: sent.billed, reason: sent.providerReason, operationRef: null }
        : { failureClass: "unknown" as const, billed: "maybe" as const, reason: "submission_unconfirmed", operationRef: null };
      await store.write(scope, (wtx) => settleFailed(wtx, lease, generationId, generation.projectId, job.run, "submitting", failure, { form: "unknown", billed: failure.billed }));
      return { result: "settled", generationId };
    }

    // Completed inline (the text fast path).
    const status = sent.status;
    const operationRef = sent.operation;
    const reported: readonly ReportedCost[] | null = status.status === "succeeded" ? status.reportedCost : null;
    await store.write(scope, async (wtx) => {
      const call = (response: string | null, v: Verdict | null) => wtx.insertCall({ generationId, index: 1, projectId: generation.projectId, role: "draft", jobId: lease.jobId, requestDigest: generation.requestDigest, operationRef, response, verdict: v, reportedCost: reported, createdAt: iso() });
      if (status.status === "failed") {
        await call(null, null);
        return settleFailed(wtx, lease, generationId, generation.projectId, job.run, "submitting", { failureClass: status.failureClass, billed: status.billed, reason: status.reason, operationRef }, actual(null, prices, status.billed));
      }
      const response = status.text ?? "";
      const checked = operation.validate(response);
      await call(response, checked.verdict);
      const cost = actual(reported, prices, "yes");
      if (checked.proposal === null) {
        // REJECTED: the raw output stays on the call log; no Option exists (AI-map §5).
        const reason = checked.verdict.pass ? "rejected" : `rejected:${checked.verdict.guard}:${checked.verdict.reason}`;
        return settleFailed(wtx, lease, generationId, generation.projectId, job.run, "submitting", { failureClass: "unknown", billed: "yes", reason, operationRef }, cost);
      }
      const plan = operation.attach(checked.proposal, generationId, () => ids.ordered());
      const objectId = ids.ordered() as ObjectId;
      const initiation = generation.initiation as { actionGroup: string };
      const committed = await history.commit(wtx, scope, { kind: plan.kind, projectId: generation.projectId, objectId, base: 0, body: plan.body },
        { actor: "generation", cause: "ai_generation", actionGroup: initiation.actionGroup as never, generationId, at: clock.now(), ids });
      if (committed.result !== "Applied") throw new Error(`attach refused: ${committed.result === "Refused" ? committed.reason : committed.result}`);
      const outputs = [{ kind: "option", objectId, sequence: committed.revision.sequence }];
      await jobs.settle(wtx, lease, "submitting", "succeeded", { operationRef, failureClass: null, billed: "yes", reason: null }, async () => {
        await wtx.insertRun({ generationId, jobId: lease.jobId, projectId: generation.projectId, run: job.run, state: "succeeded", operationRef, failureClass: null, billed: "yes", reason: null, createdAt: iso() });
        await wtx.insertSettlement({ generationId, projectId: generation.projectId, outcome: "succeeded", reason: null, actual: cost, outputs, settledAt: iso() });
        await wtx.appendEvent({ type: "generation.settled", generationId, outcome: "succeeded", occurredAt: iso() });
      });
    });
    return { result: "settled", generationId };
  };
}
export type Dispatch = ReturnType<typeof createDispatch>;
