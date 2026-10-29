import { renderedRequestSchema, resolvedInputsSchema, type Billed, type Environment, type FailureClass, type GenerationId, type ObjectId, type ProjectId, type Verdict } from "@aiuteur/contract";
import { repairRequest, requestDigest, type ResolvedInputs } from "@aiuteur/compiler";
import { g7Provenance, passed } from "@aiuteur/guards";
import type { History } from "@aiuteur/history";
import { LeaseLost, type Jobs } from "@aiuteur/jobs";
import { gate, priceEntries, type Catalogue, type CredentialHandle, type ProviderTransport, type ReportedCost } from "@aiuteur/providers";
import { actual } from "@aiuteur/spend";
import type { Clock, Ids, Leased, ReadTx, Scope, Store, WriteTx } from "@aiuteur/store";

/** What an operation supplies to settle its output (FC6: `validate` and `attach`); `generation` runs them inside the settling transaction. */
export interface OperationSettler<P> {
  /** G1 to G3 over the raw response and the inputs the Generation read: pure. A failing verdict has no proposal. */
  validate(response: string, inputs: ResolvedInputs): { readonly verdict: Verdict; readonly proposal: P | null };
  /** The current state of what the Generation read, in the settling transaction (null when it is gone). */
  current(rtx: ReadTx, scope: Scope, projectId: ProjectId, inputs: ResolvedInputs): Promise<ResolvedInputs | null>;
  /** G4: is the base the Generation read still current? A changed base is HELD, never applied. */
  base(inputs: ResolvedInputs, current: ResolvedInputs | null): Verdict;
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
    // F3 runs immediately before every send, the repair call included.
    const evaluate = () => gate({
      operationClass: generation.operationClass, status: offering?.status,
      snapshot: { recorded: effective.profileSnapshotId, catalogue: offering?.profile.snapshotId, transport: transport?.profile.snapshotId ?? "" },
      credential, fit: generation.fitReport as never, digest: { expected: generation.expectedDigest, recorded: generation.requestDigest },
      estimate: generation.estimate as never, estimateConfirmed: false, environment: options.environment, transportKind: transport?.kind ?? "real",
    });
    const verdict = evaluate();
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
    const inputs = resolvedInputsSchema.parse(generation.resolvedInputs) as ResolvedInputs;
    const first = status.status === "succeeded" ? { text: status.text ?? "", checked: operation.validate(status.text ?? "", inputs) } : null;

    // The one bounded repair (AI-map §5): a G1 to G3 failure gets exactly one more call that names the failure. It is part of this
    // Generation; if it also fails, or cannot be made, the Generation is REJECTED. A HELD result is never repaired.
    let repair: { readonly request: ReturnType<typeof repairRequest>; readonly digest: string; readonly operationRef: string; readonly reported: readonly ReportedCost[] | null; readonly text: string; readonly checked: ReturnType<typeof operation.validate> } | null = null;
    if (first !== null && first.checked.proposal === null && first.checked.verdict.pass === false && evaluate().result !== "refused") {
      const request2 = repairRequest(request, transport.profile, first.text, first.checked.verdict);
      const digest2 = requestDigest(request2);
      const sent2 = await transport.submit({ request: { digest: digest2, request: request2 }, credential, idempotencyKey: `${lease.jobId}:repair` as never, generationId });
      if (sent2.outcome === "completed" && sent2.status.status === "succeeded") {
        const text = sent2.status.text ?? "";
        repair = { request: request2, digest: digest2, operationRef: sent2.operation, reported: sent2.status.reportedCost, text, checked: operation.validate(text, inputs) };
      }
    }
    const all = [reported, repair?.reported ?? null].filter((r): r is readonly ReportedCost[] => r !== null);
    const reportedAll: readonly ReportedCost[] | null = all.length === 0 ? null : all.flat();

    await store.write(scope, async (wtx) => {
      const call = (index: number, role: "draft" | "repair", digest: string, rendered: unknown, ref: string, response: string | null, v: Verdict | null, cost: readonly ReportedCost[] | null) =>
        wtx.insertCall({ generationId, index, projectId: generation.projectId, role, jobId: lease.jobId, requestDigest: digest, renderedRequest: rendered, operationRef: ref, response, verdict: v, reportedCost: cost, createdAt: iso() });
      if (status.status === "failed" || first === null) {
        await call(1, "draft", generation.requestDigest, null, operationRef, null, null, reported);
        return settleFailed(wtx, lease, generationId, generation.projectId, job.run, "submitting", { failureClass: status.status === "failed" ? status.failureClass : "unknown", billed: status.status === "failed" ? status.billed : "yes", reason: status.status === "failed" ? status.reason : "rejected", operationRef }, actual(null, prices, status.status === "failed" ? status.billed : "yes"));
      }
      const cost = actual(reportedAll, prices, "yes");
      const last = repair ?? first;
      const record = async (final: Verdict) => {
        if (repair) {
          await call(1, "draft", generation.requestDigest, null, operationRef, first.text, first.checked.verdict, reported);
          await call(2, "repair", repair.digest, repair.request, repair.operationRef, repair.text, final, repair.reported);
        } else await call(1, "draft", generation.requestDigest, null, operationRef, first.text, final, reported);
      };
      const settleWith = async (state: "succeeded", outputs: readonly { kind: "option"; objectId: ObjectId; sequence: number }[], reason: string | null) =>
        jobs.settle(wtx, lease, "submitting", state, { operationRef, failureClass: null, billed: "yes", reason }, async () => {
          await wtx.insertRun({ generationId, jobId: lease.jobId, projectId: generation.projectId, run: job.run, state, operationRef, failureClass: null, billed: "yes", reason, createdAt: iso() });
          await wtx.insertSettlement({ generationId, projectId: generation.projectId, outcome: state, reason, actual: cost, outputs, settledAt: iso() });
          await wtx.appendEvent({ type: "generation.settled", generationId, outcome: state, occurredAt: iso() });
        });
      const rejected = (verdict: Verdict) => settleFailed(wtx, lease, generationId, generation.projectId, job.run, "submitting",
        { failureClass: "unknown", billed: "yes", reason: `rejected:${verdict.pass === true ? "" : `${verdict.guard}:${verdict.reason}`}`, operationRef }, cost);
      // REJECTED: the raw output of every call stays on the call log; no Option exists (AI-map §5).
      if (last.checked.proposal === null) { await record(last.checked.verdict); return rejected(last.checked.verdict); }
      // G4 reads the base in this transaction. HELD: the output is retained on the call log with its verdict, and nothing is committed.
      const base = operation.base(inputs, await operation.current(wtx, scope, generation.projectId, inputs));
      if (base.pass !== true) { await record(base); return settleWith("succeeded", [], `held:${base.guard}:${base.reason}`); }
      const plan = operation.attach(last.checked.proposal, generationId, () => ids.ordered());
      const provenance = g7Provenance(plan.body, generationId);
      if (!provenance.pass) { await record(provenance); return rejected(provenance); }
      await record(passed(last.checked.verdict, base, provenance));
      const objectId = ids.ordered() as ObjectId;
      const initiation = generation.initiation as { actionGroup: string };
      const committed = await history.commit(wtx, scope, { kind: plan.kind, projectId: generation.projectId, objectId, base: 0, body: plan.body },
        { actor: "generation", cause: "ai_generation", actionGroup: initiation.actionGroup as never, generationId, at: clock.now(), ids });
      if (committed.result !== "Applied") throw new Error(`attach refused: ${committed.result === "Refused" ? committed.reason : committed.result}`);
      await settleWith("succeeded", [{ kind: "option", objectId, sequence: committed.revision.sequence }], null);
    });
    return { result: "settled", generationId };
  };
}
export type Dispatch = ReturnType<typeof createDispatch>;
