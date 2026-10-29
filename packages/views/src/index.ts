import { generationReadSchema, projectListSchema, sourceMaterialReadSchema, sourceMaterialRevisionSchema, studioSchema, treatmentOptionReadSchema, type AccountId, type GenerationId, type ObjectId, type ProjectId } from "@aiuteur/contract";
import { readGeneration } from "@aiuteur/generation";
import { read } from "@aiuteur/history";
import { sourceMaterialKind, sourceMaterialRevision, treatmentOptionKind } from "@aiuteur/story";
import type { Scope, Store } from "@aiuteur/store";

export function createViews(store: Store) {
  /** Source Material of one project, or null when this Account has no such object in that project. */
  const sourceMaterial = (scope: Scope, projectId: ProjectId, objectId: ObjectId, sequence?: number) => store.read(scope, async (tx) => {
    const found = await read(tx, scope, objectId, sequence);
    return found && found.projectId === projectId && found.kind === sourceMaterialKind.kind ? found : null;
  });
  return {
    studio: (scope: Scope, id: AccountId) => store.read(scope, async (tx) => {
      const account = await tx.account(id);
      return account ? studioSchema.parse({ account, settings: await tx.settings() }) : null;
    }),
    projects: (scope: Scope, id: AccountId) => store.read(scope, async (tx) =>
      await tx.account(id) ? projectListSchema.parse({ projects: await tx.projects() }) : null),
    async sourceMaterial(scope: Scope, projectId: ProjectId, objectId: ObjectId) {
      const found = await sourceMaterial(scope, projectId, objectId);
      if (!found) return null;
      return sourceMaterialReadSchema.parse({
        head: sourceMaterialRevision(found.head),
        sequences: found.sequences,
        sideLine: found.sideLine.map((entry) => {
          const body = sourceMaterialKind.parse(entry.body);
          if (!body) throw new Error("stored side-line body does not parse");
          return { attemptId: entry.attemptId, basedOn: entry.basedOn, origin: entry.origin, generationId: entry.generationId, text: body.text, role: body.role, createdAt: entry.createdAt };
        }),
      });
    },
    /** The Generation's full trace (FC7/R22), or null when this Account has no such Generation in that project. */
    generation: (scope: Scope, projectId: ProjectId, generationId: GenerationId) => store.read(scope, async (tx) => {
      const found = await readGeneration(tx, scope, projectId, generationId);
      return found && generationReadSchema.parse(found);
    }),
    /** A Treatment Option's head; `chosen` when the project's latest choose Decision on a Treatment Option names it. */
    treatmentOption: (scope: Scope, projectId: ProjectId, objectId: ObjectId) => store.read(scope, async (tx) => {
      const found = await read(tx, scope, objectId);
      if (!found || found.projectId !== projectId || found.kind !== treatmentOptionKind.kind) return null;
      const document = treatmentOptionKind.parse(found.head.body);
      if (!document) throw new Error("stored Treatment Option body does not parse");
      const latest = await tx.latestDecision(projectId, "choose", treatmentOptionKind.kind);
      return treatmentOptionReadSchema.parse({ objectId, sequence: found.head.sequence, generationId: found.head.generationId, document, chosen: latest?.objectId === objectId, createdAt: found.head.createdAt });
    }),
    async sourceMaterialRevision(scope: Scope, projectId: ProjectId, objectId: ObjectId, sequence: number) {
      const found = await sourceMaterial(scope, projectId, objectId, sequence);
      return found?.revision ? sourceMaterialRevisionSchema.parse(sourceMaterialRevision(found.revision)) : null;
    },
  };
}
export type Views = ReturnType<typeof createViews>;
