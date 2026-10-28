import { actionGroupIdSchema, commitOutcomeSchema, type IdempotentOperation, objectIdSchema, projectIdSchema, type CommitOutcome, type ObjectId, type Project, type ProjectId } from "@aiuteur/contract";
import { bodyHash, type CommitContext, type CommitResult, type History } from "@aiuteur/history";
import { sourceMaterialKind, sourceMaterialRevision, type SourceMaterialBody } from "@aiuteur/story";
import type { Clock, Ids, Scope, Store, WriteTx } from "@aiuteur/store";

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

/** Use cases. Every creative write goes through `history.commit`; the project row is not creative history. */
export function createWorkflows(options: { store: Store; history: History; clock: Clock; ids: Ids }) {
  const { store, history, clock, ids } = options;
  // Each command is one creator action, so it gets one action group (MODULE §5.1; LINEAGE §1).
  const context = (cause: CommitContext["cause"]): CommitContext => ({ actor: "creator", cause, actionGroup: actionGroupIdSchema.parse(ids.ordered()), at: clock.now(), ids });
  /**
   * A keyed write runs at most once per (Account, operation, key). The record and the write commit in
   * one transaction under the Account's write lock, so overlapping duplicates serialize: the second
   * finds the record and replays it. A rolled-back write leaves no record. Key reuse with other input
   * throws, which rolls back and executes nothing.
   */
  async function once(scope: Scope, operation: IdempotentOperation, key: string, request: unknown, run: (tx: WriteTx) => Promise<CommitOutcome>): Promise<CommitOutcome> {
    const fingerprint = bodyHash({ operation, request });
    return store.write(scope, async (tx) => {
      const prior = await tx.idempotency(operation, key);
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new IdempotencyKeyReused();
        return commitOutcomeSchema.parse(prior.result);
      }
      const result = await run(tx);
      await tx.recordIdempotency({ operation, key, fingerprint, result, createdAt: new Date(clock.now()).toISOString() });
      return result;
    });
  }
  return {
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
