import { actionGroupIdSchema, objectIdSchema, projectIdSchema, type CommitOutcome, type ObjectId, type Project, type ProjectId } from "@aiuteur/contract";
import type { CommitContext, CommitResult, History } from "@aiuteur/history";
import { sourceMaterialKind, sourceMaterialRevision, type SourceMaterialBody } from "@aiuteur/story";
import type { Clock, Ids, Scope, Store } from "@aiuteur/store";

export function toOutcome(result: CommitResult): CommitOutcome {
  switch (result.result) {
    case "Applied": return { result: "Applied", appended: result.appended, revision: sourceMaterialRevision(result.revision) };
    case "NeedsConfirmation": return { result: "NeedsConfirmation", impact: { version: result.impact.version, reached: [...result.impact.reached] } };
    case "HeldAsOption": return { result: "HeldAsOption", attemptId: result.attemptId };
    case "StaleBase": return { result: "StaleBase", head: result.head, attemptId: result.attemptId };
    case "Refused": return { result: "Refused", reason: result.reason };
  }
}

/** Use cases. Every creative write goes through `history.commit`; the project row is not creative history. */
export function createWorkflows(options: { store: Store; history: History; clock: Clock; ids: Ids }) {
  const { store, history, clock, ids } = options;
  // Each command is one creator action, so it gets one action group (MODULE §5.1; LINEAGE §1).
  const context = (cause: CommitContext["cause"]): CommitContext => ({ actor: "creator", cause, actionGroup: actionGroupIdSchema.parse(ids.ordered()), at: clock.now(), ids });
  return {
    async createProject(scope: Scope): Promise<Project> {
      const project: Project = { projectId: projectIdSchema.parse(ids.ordered()), createdAt: new Date(clock.now()).toISOString() };
      await store.write(scope, (tx) => tx.insertProject(project));
      return project;
    },
    /** Pasted text becomes the first Revision of a new Source Material object. */
    async paste(scope: Scope, projectId: ProjectId, text: string): Promise<CommitOutcome> {
      const objectId = objectIdSchema.parse(ids.ordered());
      return toOutcome(await store.write(scope, (tx) => history.commit(tx, scope, { kind: sourceMaterialKind.kind, projectId, objectId, base: 0, body: { text, role: "primary" } }, context("import"))));
    },
    /** The role is the only editable part of a supplied original; the gate carries the text over from the head. */
    async changeRole(scope: Scope, projectId: ProjectId, objectId: ObjectId, base: number, role: SourceMaterialBody["role"]): Promise<CommitOutcome> {
      const body = (current: unknown) => {
        const head = sourceMaterialKind.parse(current);
        return head && { text: head.text, role };
      };
      return toOutcome(await store.write(scope, (tx) => history.commit(tx, scope, { kind: sourceMaterialKind.kind, projectId, objectId, base, body }, context("creator_edit"))));
    },
  };
}
export type Workflows = ReturnType<typeof createWorkflows>;
