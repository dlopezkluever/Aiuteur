import { actionGroupIdSchema, chooseOutcomeSchema, commitOutcomeSchema, generationIdSchema, type ChooseOutcome, type DraftTreatmentResult, type Environment, type IdempotentOperation, type Initiation, type WorkflowOperation, objectIdSchema, projectIdSchema, type CommitOutcome, type ObjectId, type Project, type ProjectId, type TreatmentPreview } from "@aiuteur/contract";
import { bodyHash, type CommitContext, type CommitResult, type History } from "@aiuteur/history";
import { resolveSourceMaterial, sourceMaterialKind, sourceMaterialRevision, treatmentOptionKind, type SourceMaterialBody } from "@aiuteur/story";
import { createDispatch, createRecord, preview, readGeneration } from "@aiuteur/generation";
import { createJobs } from "@aiuteur/jobs";
import { priceEntries, select, type Catalogue, type CredentialHandle, type ProviderTransport } from "@aiuteur/providers";
import type { PricePolicy } from "@aiuteur/spend";
import type { Clock, Ids, Scheduler, Scope, Store, WriteTx } from "@aiuteur/store";
import { REGISTRY } from "./registry.ts";

export { REGISTRY } from "./registry.ts";
export type { AnyOperationRecord, OperationRecord } from "./operation.ts";

export function toOutcome(result: CommitResult): CommitOutcome {
  switch (result.result) {
    case "Applied": return { result: "Applied", appended: result.appended, revision: sourceMaterialRevision(result.revision) };
    case "NeedsConfirmation": return { result: "NeedsConfirmation", impact: { version: result.impact.version, reached: [...result.impact.reached] } };
    case "HeldAsOption": return { result: "HeldAsOption", attemptId: result.attemptId };
    case "StaleBase": return { result: "StaleBase", head: result.head, attemptId: result.attemptId };
    case "Refused": return { result: "Refused", reason: result.reason };
  }
}

/** The same Account, operation and key arrived with different input. */
export class IdempotencyKeyReused extends Error {
  constructor() { super("idempotency-key-reused"); }
}

/** What running a Generation needs, wired at the composition root (ports and injected values only). */
export interface Execution {
  readonly scheduler: Scheduler;
  readonly transportFor: (offeringId: string) => ProviderTransport | undefined;
  readonly credential: (scope: Scope, offeringId: string) => CredentialHandle | null;
  readonly environment: Environment;
}

/** Use cases. Every creative write goes through `history.commit`; the project row is not creative history. */
export function createWorkflows(options: { store: Store; history: History; clock: Clock; ids: Ids; catalogue: Catalogue; pricePolicy: PricePolicy; execution: Execution }) {
  const { store, history, clock, ids, catalogue, pricePolicy, execution } = options;
  const jobs = createJobs({ scheduler: execution.scheduler, clock });
  const record = createRecord({ history, jobs, clock, ids, pricePolicy });
  const dispatch = createDispatch({ store, history, jobs, catalogue, transportFor: execution.transportFor, credential: execution.credential, environment: execution.environment, clock, ids });
  // Each command is one creator action, so it gets one action group (MODULE §5.1; LINEAGE §1).
  const context = (cause: CommitContext["cause"]): CommitContext => ({ actor: "creator", cause, actionGroup: actionGroupIdSchema.parse(ids.ordered()), at: clock.now(), ids });
  /**
   * A keyed write runs at most once per (Account, operation, key). The record and the write commit in
   * one transaction under the Account's write lock, so overlapping duplicates serialize: the second
   * finds the record and replays it. A rolled-back write leaves no record. Key reuse with other input
   * throws, which rolls back and executes nothing.
   */
  async function once<R>(scope: Scope, operation: IdempotentOperation, key: string, request: unknown, run: (tx: WriteTx) => Promise<R>, replay: (stored: unknown) => R = (stored) => commitOutcomeSchema.parse(stored) as R, keep: (result: R) => boolean = () => true): Promise<R> {
    const fingerprint = bodyHash({ operation, request });
    return store.write(scope, async (tx) => {
      const prior = await tx.idempotency(operation, key);
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new IdempotencyKeyReused();
        return replay(prior.result);
      }
      const result = await run(tx);
      if (keep(result)) await tx.recordIdempotency({ operation, key, fingerprint, result, createdAt: new Date(clock.now()).toISOString() });
      return result;
    });
  }

  type Created = { readonly result: "created"; readonly generationId: string; readonly jobId: string } | Exclude<DraftTreatmentResult, { result: "generation" }>;
  /**
   * FC6 `execute(initiation, command)`: one path for every registry operation (MODULE §6). In ONE transaction, keyed by the
   * Initiation's action id (JOB-LIFECYCLE §4: a replay returns the Generation that already exists): scope, resolve on the
   * write transaction, select, then `generation.create` (compile frozen, record, capture, Job, outbox). Then the text fast
   * path claims its own Job through the Scheduler port and runs the single dispatch path (RUNTIME §4.6). A blocked fit or
   * an unavailable selection creates nothing.
   */
  async function execute(initiation: Initiation, operationId: WorkflowOperation, command: unknown): Promise<DraftTreatmentResult | null> {
    const operation = REGISTRY[operationId];
    const parsed = operation.parse(command);
    if (parsed === null) throw new Error(`not a ${operationId} command`);
    const scope: Scope = { accountId: initiation.accountId as Scope["accountId"], creatorId: initiation.creatorId as Scope["creatorId"] };
    const { projectId, target, expectedDigest } = operation.scope(parsed);
    const created = await once<Created | null>(scope, operationId, initiation.actionId, { projectId, target, expectedDigest }, async (tx) => {
      const inputs = await operation.resolve(tx, scope, projectId, target);
      if (!inputs) return null;
      const selection = select(catalogue, operation.operationClass);
      if (selection.result === "unavailable") return { result: "unavailable", operationClass: selection.operationClass, reasons: [...selection.reasons] };
      const made = await record.create(tx, scope, initiation, {
        projectId, operation: operation.id, inputs, effective: selection.effective, profile: selection.profile,
        prices: priceEntries(catalogue, selection.effective.offeringId, operation.operationClass), expectedDigest,
        target: { output: "option", kind: operation.outputKind }, actionGroup: actionGroupIdSchema.parse(ids.ordered()),
      });
      if (made.result === "blocked") return { result: "blocked", effectiveModel: { ...made.effective, reasons: [...made.effective.reasons] }, versions: made.compiled.versions, fit: made.compiled.fit };
      return made;
    }, (stored) => stored as Created, (result) => result?.result === "created");
    if (!created) return null;
    if (created.result !== "created") return created;
    const generationId = generationIdSchema.parse(created.generationId);
    const [lease] = await jobs.claim(1, created.jobId as never);
    if (lease) await dispatch(scope, lease, operation);
    const generation = await store.read(scope, (tx) => readGeneration(tx, scope, projectId, generationId));
    if (!generation) throw new Error("created Generation is not readable");
    return { result: "generation", generation };
  }
  return {
    execute,
    /** Choose a Treatment Option: one creator Decision through the write gate (STORY-DOCUMENTS §2.3; DOMAIN-MODEL §2). */
    async chooseTreatmentOption(scope: Scope, projectId: ProjectId, objectId: ObjectId, key: string): Promise<ChooseOutcome> {
      return once<ChooseOutcome>(scope, "treatment-option.choose", key, { projectId, objectId }, async (tx) => {
        const head = await tx.head(objectId);
        const result = await history.decide(tx, scope, { projectId, objectId, kind: treatmentOptionKind.kind, type: "choose", payload: { sequence: head?.sequence ?? 0 } }, context("creator_edit"));
        switch (result.result) {
          case "Applied": return { result: "Applied", decision: { subject: result.decision.objectId, sequence: result.decision.sequence, type: result.decision.type, actionGroup: result.decision.actionGroup, createdAt: result.decision.createdAt } };
          case "NeedsConfirmation": return { result: "NeedsConfirmation", impact: { version: result.impact.version, reached: [...result.impact.reached] } };
          case "Refused": return { result: "Refused", reason: result.reason };
        }
      }, (stored) => chooseOutcomeSchema.parse(stored));
    },
    async createProject(scope: Scope): Promise<Project> {
      const project: Project = { projectId: projectIdSchema.parse(ids.ordered()), createdAt: new Date(clock.now()).toISOString() };
      await store.write(scope, (tx) => tx.insertProject(project));
      return project;
    },
    /** Pasted text becomes the first Revision of a new Source Material object. */
    async paste(scope: Scope, projectId: ProjectId, key: string, text: string): Promise<CommitOutcome> {
      return once(scope, "source-material.paste", key, { projectId, text }, async (tx) => {
        const objectId = objectIdSchema.parse(ids.ordered());
        return toOutcome(await history.commit(tx, scope, { kind: sourceMaterialKind.kind, projectId, objectId, base: 0, body: { text, role: "primary" } }, context("import")));
      });
    },
    /**
     * Draft Treatment, previewed (#101): Resolve on a read transaction, select, then compile and
     * estimate in `generation.preview`. One Treatment-option request, no divergence axis (#132).
     * Nothing is written: no Generation, Job, Revision, Attempt, Decision or spend record.
     */
    async previewTreatment(scope: Scope, projectId: ProjectId, objectId: ObjectId): Promise<TreatmentPreview | null> {
      const sourceMaterial = await store.read(scope, (tx) => resolveSourceMaterial(tx, scope, projectId, objectId));
      if (!sourceMaterial) return null;
      const selection = select(catalogue, "text.create");
      if (selection.result === "unavailable") return { result: "unavailable", operationClass: selection.operationClass, reasons: [...selection.reasons] };
      return preview({
        inputs: { operation: "treatment.draft", sourceMaterial, writingStyle: null },
        effective: selection.effective,
        profile: selection.profile,
        prices: priceEntries(catalogue, selection.effective.offeringId, "text.create"),
        today: new Date(clock.now()).toISOString().slice(0, 10),
        pricePolicy,
      });
    },
    /** The role is the only editable part of a supplied original; the gate carries the text over from the head. */
    async changeRole(scope: Scope, projectId: ProjectId, objectId: ObjectId, key: string, base: number, role: SourceMaterialBody["role"]): Promise<CommitOutcome> {
      const body = (current: unknown) => {
        const head = sourceMaterialKind.parse(current);
        return head && { text: head.text, role };
      };
      return once(scope, "source-material.change-role", key, { projectId, objectId, base, role }, async (tx) =>
        toOutcome(await history.commit(tx, scope, { kind: sourceMaterialKind.kind, projectId, objectId, base, body }, context("creator_edit"))));
    },
  };
}
export type Workflows = ReturnType<typeof createWorkflows>;
