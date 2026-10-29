import { renderedRequestSchema, resolvedInputsSchema, verdictSchema, type Billed, type Environment, type Estimate, type FailureClass, type FitReport, type GenerationId, type JobId, type ObjectId, type ProjectId, type RenderedRequest, type Verdict } from "@aiuteur/contract";
import { repairRequest, requestDigest, type ResolvedInputs } from "@aiuteur/compiler";
import { g7Provenance, passed } from "@aiuteur/guards";
import type { History } from "@aiuteur/history";
import { LeaseLost, type Jobs } from "@aiuteur/jobs";
import { gate, priceEntries, type Catalogue, type CredentialHandle, type PriceEntry, type ProviderTransport, type ReportedCost } from "@aiuteur/providers";
import { actual } from "@aiuteur/spend";
import type { Clock, GenerationRow, Ids, JobRow, Leased, ReadTx, Scope, Store, WriteTx } from "@aiuteur/store";

/** What an operation supplies to settle its output (FC6: `validate` and `attach`); `generation` runs them inside the settling transaction. */
export interface OperationSettler<P> {
  /** G1 to G3 over the raw response and the inputs the Generation read: pure. `proposal` is set only when every guard passed; `retained` is what G1 could parse, kept for a HELD result. */
  validate(response: string, inputs: ResolvedInputs): { readonly verdict: Verdict; readonly proposal: P | null; readonly retained: P | null };
  /** The current state of what the Generation read, in the settling transaction (null when it is gone). */
  current(rtx: ReadTx, scope: Scope, projectId: ProjectId, inputs: ResolvedInputs): Promise<ResolvedInputs | null>;
  /** G4: is the base the Generation read still current? A changed base is HELD, never applied. */
  base(inputs: ResolvedInputs, current: ResolvedInputs | null): Verdict;
  /** Pure: the validated proposal as an AttachPlan for `history.commit` (never selects, approves or accepts). */
  attach(proposal: P, generationId: GenerationId, newId: () => string): { readonly kind: string; readonly body: unknown };
}

export type DispatchOutcome =
  | { readonly result: "settled"; readonly generationId: GenerationId }
  /** Accepted by an asynchronous provider, or the repair run is queued: a worker observes it (T0b). */
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

type Failure = { failureClass: FailureClass; billed: Billed; reason: string; operationRef: string | null };
type Quantities = readonly { readonly unit: ReportedCost["unit"]; readonly amount: number }[];

/**
 * The single dispatch path (MODULE §3.3; build rule R5: the only caller of `submit`). For a claimed Job it writes the
 * submission intent (queued → submitting) before any call, sends the Rendered request recorded for that run through the F3
 * gate, and settles in ONE transaction: the operation's attach through `history.commit`, the call log, the run history, the
 * actual cost set once, the Job's terminal state and the outbox events (JOB-LIFECYCLE §11).
 *
 * Run 1 sends the Generation's stored request. When G1 to G3 refuse its answer and the base it read is still current, run 1
 * settles and the one bounded repair is run 2 of the same Generation (AI-map §5; JOB-LIFECYCLE §5): a real Job with its own id
 * (the provider key), claimed through the Scheduler and dispatched here. Its request is rebuilt from the stored draft call.
 */
export function createDispatch(options: DispatchOptions) {
  const { store, history, jobs, catalogue, clock, ids } = options;
  const iso = () => new Date(clock.now()).toISOString();

  async function settleFailed(wtx: WriteTx, lease: Leased, generation: GenerationRow, job: JobRow, from: "queued" | "submitting", failure: Failure, cost: ReturnType<typeof actual>, generationReason: string = failure.reason) {
    await jobs.settle(wtx, lease, from, "failed", failure, async () => {
      await wtx.insertRun({ generationId: generation.generationId, jobId: lease.jobId, projectId: generation.projectId, run: job.run, state: "failed", ...failure, createdAt: iso() });
      await wtx.insertSettlement({ generationId: generation.generationId, projectId: generation.projectId, outcome: "failed", reason: generationReason, actual: cost, outputs: [], settledAt: iso() });
      await wtx.appendEvent({ type: "generation.settled", generationId: generation.generationId, outcome: "failed", occurredAt: iso() });
    });
  }

  /** The actual cost of the Generation so far: every earlier call's reported quantities plus this run's (BUSINESS §4.4). */
  async function spent(wtx: ReadTx, generation: GenerationRow, below: number, extra: Quantities | null, prices: readonly PriceEntry[], billed: Billed) {
    const earlier = (await wtx.calls(generation.generationId)).filter((c) => c.index < below).flatMap((c) => (c.reportedCost as Quantities | null) ?? []);
    const all = [...earlier, ...(extra ?? [])];
    const nominal = (generation.estimate as Estimate).basis.quantities.map((q) => ({ unit: q.unit, amount: q.amount }));
    return actual(all.length === 0 ? null : all, prices, billed, nominal);
  }

  async function dispatch<P>(scope: Scope, lease: Leased, operation: OperationSettler<P>): Promise<DispatchOutcome> {
    if (lease.accountId !== scope.accountId) throw new Error("the lease belongs to another Account");
    const effectiveOf = (g: GenerationRow) => g.effectiveModel as { offeringId: string; profileSnapshotId: string };
    // Write-ahead intent: the Job is `submitting` before the provider is called (JOB-LIFECYCLE §3).
    const record = await store.write(scope, async (wtx) => {
      const job = await wtx.job(lease.jobId);
      const generation = job && await wtx.generation(job.generationId);
      if (!job || !generation) throw new LeaseLost(lease.jobId);
      // Past the admission deadline: fail with the deadline's reason, never submit (RUNTIME §4.2 tick; JOB-LIFECYCLE §2).
      if (job.state === "queued" && job.deadlineAt !== null && Date.parse(job.deadlineAt) <= clock.now()) {
        const prices = priceEntries(catalogue, effectiveOf(generation).offeringId, generation.operationClass);
        await settleFailed(wtx, lease, generation, job, "queued", { failureClass: "transient-unbilled", billed: "no", reason: "queue_timeout", operationRef: null }, await spent(wtx, generation, job.run, null, prices, "no"));
        return { expired: generation.generationId } as const;
      }
      if (!await jobs.transition(wtx, lease, "queued", "submitting")) throw new LeaseLost(lease.jobId);
      return { job, generation };
    });
    if ("expired" in record) return { result: "settled", generationId: record.expired };
    const { job, generation } = record;
    const generationId = generation.generationId;
    const stored = renderedRequestSchema.parse(generation.renderedRequest);
    // P1: what is sent is the stored request, identified by its stored digest.
    if (requestDigest(stored) !== generation.requestDigest) throw new Error("stored Rendered request does not match its digest");
    const effective = effectiveOf(generation);
    const offering = catalogue.offerings.find((o) => o.profile.offeringId === effective.offeringId);
    const transport = options.transportFor(effective.offeringId);
    const credential = options.credential(scope, effective.offeringId);
    const prices = priceEntries(catalogue, effective.offeringId, generation.operationClass);
    const inputs = resolvedInputsSchema.parse(generation.resolvedInputs) as ResolvedInputs;

    // What this run sends. Run 1: the Generation's request. Run 2: the repair request, rebuilt from the refused draft call.
    let outgoing: { request: RenderedRequest; digest: string; fit: FitReport; expected: string | null };
    let priorReason: string | null = null;
    if (job.run === 1) outgoing = { request: stored, digest: generation.requestDigest, fit: generation.fitReport as FitReport, expected: generation.expectedDigest };
    else {
      const first = (await store.read(scope, (rtx) => rtx.calls(generationId))).find((c) => c.index === 1);
      const refused = verdictSchema.safeParse(first?.verdict);
      if (!first || first.response === null || !refused.success || refused.data.pass !== false || !offering) throw new Error("a repair run needs the refused draft call");
      const repair = repairRequest(stored, offering.profile, first.response, refused.data, generation.fitReport as FitReport);
      outgoing = { request: repair.request, digest: requestDigest(repair.request), fit: repair.fit, expected: null };
      priorReason = `rejected:${refused.data.guard}:${refused.data.reason}`;
    }
    const call = (wtx: WriteTx, operationRef: string | null, response: string | null, verdict: Verdict | null, cost: Quantities | null) =>
      wtx.insertCall({ generationId, index: job.run, projectId: generation.projectId, role: job.run === 1 ? "draft" : "repair", jobId: lease.jobId, requestDigest: outgoing.digest, renderedRequest: job.run === 1 ? null : outgoing.request, operationRef, response, verdict, reportedCost: cost, createdAt: iso() });

    // F3 runs immediately before every send, over the request this run sends and its digest.
    const verdict = gate({
      operationClass: generation.operationClass, status: offering?.status,
      snapshot: { recorded: effective.profileSnapshotId, catalogue: offering?.profile.snapshotId, transport: transport?.profile.snapshotId ?? "" },
      credential, fit: outgoing.fit, digest: { expected: outgoing.expected, recorded: outgoing.digest },
      estimate: generation.estimate as never, estimateConfirmed: false, environment: options.environment, transportKind: transport?.kind ?? "real",
    });
    if (verdict.result === "refused" || !transport || !credential) {
      const reason = verdict.result === "refused" ? `gate:${verdict.clause}:${verdict.reason}` : "gate:transport:absent";
      await store.write(scope, async (wtx) => settleFailed(wtx, lease, generation, job, "submitting", { failureClass: verdict.result === "refused" ? verdict.failureClass : "platform-configuration", billed: "no", reason, operationRef: null },
        await spent(wtx, generation, job.run, null, prices, "no"), priorReason ?? reason));
      return { result: "refused", generationId, clause: verdict.result === "refused" ? verdict.clause : "status" };
    }

    const sent = await transport.submit({ request: { digest: outgoing.digest, request: outgoing.request }, credential, idempotencyKey: lease.jobId, generationId });
    if (sent.outcome === "accepted") {
      await store.write(scope, async (wtx) => {
        if (!await jobs.transition(wtx, lease, "submitting", "running", { operationRef: sent.operation })) throw new LeaseLost(lease.jobId);
      });
      await jobs.release(lease);
      return { result: "in-progress", generationId };
    }
    // A refusal or lost response of run 1 leaves no call (as before); every repair invocation is on the call log.
    const failedRun = async (failure: Failure, reported: Quantities | null, logged: boolean) => {
      await store.write(scope, async (wtx) => {
        if (logged || job.run > 1) await call(wtx, failure.operationRef, null, null, reported);
        await settleFailed(wtx, lease, generation, job, "submitting", failure, await spent(wtx, generation, job.run, reported, prices, failure.billed), priorReason ?? failure.reason);
      });
      return { result: "settled", generationId } as const;
    };
    if (sent.outcome === "refused") return failedRun({ failureClass: sent.failureClass, billed: sent.billed, reason: sent.providerReason, operationRef: null }, null, false);
    if (sent.outcome === "unconfirmed") return failedRun({ failureClass: "unknown", billed: "maybe", reason: "submission_unconfirmed", operationRef: null }, null, false);

    // Completed inline (the text fast path).
    const status = sent.status;
    const operationRef = sent.operation;
    if (status.status === "failed") return failedRun({ failureClass: status.failureClass, billed: status.billed, reason: status.reason, operationRef }, null, true);
    const reported = status.reportedCost;
    const text = status.text ?? "";
    const checked = operation.validate(text, inputs);

    // The one bounded repair: only for a G1 to G3 refusal, only while the base the draft read is still current. A result that
    // belongs on the HELD path never costs another call. Run 1 settles; run 2 is a new Job of the same Generation.
    if (job.run === 1 && checked.verdict.pass === false) {
      const stale = operation.base(inputs, await store.read(scope, (rtx) => operation.current(rtx, scope, generation.projectId, inputs))).pass !== true;
      if (!stale) {
        const repairJob = jobs.newJob({ jobId: ids.ordered() as JobId, generationId, projectId: generation.projectId, run: 2, provider: job.provider ?? effective.offeringId });
        const why = `repair:${checked.verdict.guard}:${checked.verdict.reason}`;
        await store.write(scope, async (wtx) => {
          await call(wtx, operationRef, text, checked.verdict, reported);
          await jobs.settle(wtx, lease, "submitting", "succeeded", { operationRef, failureClass: null, billed: "yes", reason: why }, async () => {
            await wtx.insertRun({ generationId, jobId: lease.jobId, projectId: generation.projectId, run: 1, state: "succeeded", operationRef, failureClass: null, billed: "yes", reason: why, createdAt: iso() });
          });
          await jobs.enqueue(wtx, repairJob);
        });
        const [repairLease] = await jobs.claim(1, repairJob.jobId);
        return repairLease ? dispatch(scope, repairLease, operation) : { result: "in-progress", generationId };
      }
    }

    await store.write(scope, async (wtx) => {
      const cost = await spent(wtx, generation, job.run, reported, prices, "yes");
      const settleSucceeded = (outputs: readonly { kind: "option"; objectId: ObjectId; sequence: number }[], reason: string | null) =>
        jobs.settle(wtx, lease, "submitting", "succeeded", { operationRef, failureClass: null, billed: "yes", reason }, async () => {
          await wtx.insertRun({ generationId, jobId: lease.jobId, projectId: generation.projectId, run: job.run, state: "succeeded", operationRef, failureClass: null, billed: "yes", reason, createdAt: iso() });
          await wtx.insertSettlement({ generationId, projectId: generation.projectId, outcome: "succeeded", reason, actual: cost, outputs, settledAt: iso() });
          await wtx.appendEvent({ type: "generation.settled", generationId, outcome: "succeeded", occurredAt: iso() });
        });
      // REJECTED: the raw output of every call stays on the call log; no Option exists (AI-map §5).
      const rejected = async (v: Verdict) => {
        await call(wtx, operationRef, text, v, reported);
        await settleFailed(wtx, lease, generation, job, "submitting", { failureClass: "unknown", billed: "yes", reason: v.pass === true ? "rejected" : `rejected:${v.guard}:${v.reason}`, operationRef }, cost);
      };
      // G4 reads the base in this transaction. A changed base is HELD: the paid output is stored as an Option (HeldAsOption), never applied.
      const base = operation.base(inputs, await operation.current(wtx, scope, generation.projectId, inputs));
      const held = base.pass !== true;
      const proposal = held ? checked.retained : checked.proposal;
      if (proposal === null) return rejected(checked.verdict);
      const plan = operation.attach(proposal, generationId, () => ids.ordered());
      const provenance = g7Provenance(plan.body, generationId);
      if (!provenance.pass) return rejected(provenance);
      // A held result that also failed a guard keeps that failing verdict on the call log, so it can never be chosen as clean.
      await call(wtx, operationRef, text, held ? (checked.verdict.pass === false ? checked.verdict : base) : passed(checked.verdict, base, provenance), reported);
      const objectId = ids.ordered() as ObjectId;
      const initiation = generation.initiation as { actionGroup: string };
      const committed = await history.commit(wtx, scope, { kind: plan.kind, projectId: generation.projectId, objectId, base: 0, body: plan.body },
        { actor: "generation", cause: "ai_generation", actionGroup: initiation.actionGroup as never, generationId, at: clock.now(), ids });
      if (committed.result !== "Applied") throw new Error(`attach refused: ${committed.result === "Refused" ? committed.reason : committed.result}`);
      await settleSucceeded([{ kind: "option", objectId, sequence: committed.revision.sequence }], held ? `held:${base.guard}:${base.reason}` : null);
    });
    return { result: "settled", generationId };
  }
  return dispatch;
}
export type Dispatch = ReturnType<typeof createDispatch>;
