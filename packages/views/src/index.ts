import { characterListSchema, characterReadSchema, shotListSchema, shotReadSchema, type CharacterRead, type ShotRead, generationReadSchema, inputReadSchema, projectListSchema, sourceMaterialReadSchema, sourceMaterialRevisionSchema, studioSchema, treatmentOptionReadSchema, type AccountId, type GenerationId, type ObjectId, type ProjectId } from "@aiuteur/contract";
import { readGeneration } from "@aiuteur/generation";
import { read } from "@aiuteur/history";
import { sourceMaterialKind, sourceMaterialRevision, treatmentOptionKind } from "@aiuteur/story";
import type { ReadTx, Scope, Store } from "@aiuteur/store";
import { characterKind, readCharacter } from "@aiuteur/world";
import { readShot, shotKind } from "@aiuteur/production";

/** One Character as the wire read model: name, head and the reference it shows with its frozen Media facts. */
async function characterRead(tx: ReadTx, scope: Scope, projectId: ProjectId, objectId: ObjectId): Promise<CharacterRead | null> {
  const found = await readCharacter(tx, scope, projectId, objectId);
  if (!found) return null;
  const media = found.reference?.media ? await tx.media(projectId, found.reference.media) : null;
  if (found.reference && !media) throw new Error("an upload Attempt names no Media of its project");
  return characterReadSchema.parse({
    objectId, sequence: found.head.sequence, name: found.body.name, createdAt: found.createdAt,
    reference: found.reference && media ? { attemptId: found.reference.attemptId, createdAt: found.reference.createdAt, media: { hash: media.hash, size: media.size, contentType: media.contentType, width: media.width, height: media.height } } : null,
  });
}
async function shotRead(tx: ReadTx, scope: Scope, projectId: ProjectId, objectId: ObjectId): Promise<ShotRead | null> {
  const found = await readShot(tx, scope, projectId, objectId);
  return found && shotReadSchema.parse({
    objectId, sequence: found.head.sequence, action: found.action, presence: found.presence, createdAt: found.createdAt,
    sideLine: found.sideLine.map(({ attempt, presence }) => ({ attemptId: attempt.attemptId, basedOn: attempt.basedOn, presence, createdAt: attempt.createdAt })),
  });
}

/** One Source Material object as the wire read model. */
function sourceMaterialRead(found: NonNullable<Awaited<ReturnType<typeof read>>>) {
  return sourceMaterialReadSchema.parse({
    head: sourceMaterialRevision(found.head),
    sequences: found.sequences,
    sideLine: found.sideLine.map((entry) => {
      const body = sourceMaterialKind.parse(entry.body);
      if (!body) throw new Error("stored side-line body does not parse");
      return { attemptId: entry.attemptId, basedOn: entry.basedOn, origin: entry.origin, generationId: entry.generationId, text: body.text, role: body.role, createdAt: entry.createdAt };
    }),
  });
}

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
      return found && sourceMaterialRead(found);
    },
    /** The Input screen's read model: every Source Material of the project, oldest first; null when this Account has no such project. */
    input: (scope: Scope, projectId: ProjectId) => store.read(scope, async (tx) => {
      if (!await tx.project(projectId)) return null;
      const items = [];
      for (const { objectId } of await tx.objects(projectId, sourceMaterialKind.kind)) {
        const found = await read(tx, scope, objectId);
        if (found) items.push(sourceMaterialRead(found));
      }
      return inputReadSchema.parse({ items });
    }),
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
    /** The project's Characters, oldest first; null when this Account has no such project (T0-12). */
    characters: (scope: Scope, projectId: ProjectId) => store.read(scope, async (tx) => {
      if (!await tx.project(projectId)) return null;
      const characters = [];
      for (const { objectId } of await tx.objects(projectId, characterKind.kind)) characters.push(await characterRead(tx, scope, projectId, objectId));
      return characterListSchema.parse({ characters });
    }),
    character: (scope: Scope, projectId: ProjectId, objectId: ObjectId) => store.read(scope, (tx) => characterRead(tx, scope, projectId, objectId)),
    /** The project's Shots, oldest first; null when this Account has no such project (T0-12). */
    shots: (scope: Scope, projectId: ProjectId) => store.read(scope, async (tx) => {
      if (!await tx.project(projectId)) return null;
      const shots = [];
      for (const { objectId } of await tx.objects(projectId, shotKind.kind)) shots.push(await shotRead(tx, scope, projectId, objectId));
      return shotListSchema.parse({ shots });
    }),
    shot: (scope: Scope, projectId: ProjectId, objectId: ObjectId) => store.read(scope, (tx) => shotRead(tx, scope, projectId, objectId)),
    async sourceMaterialRevision(scope: Scope, projectId: ProjectId, objectId: ObjectId, sequence: number) {
      const found = await sourceMaterial(scope, projectId, objectId, sequence);
      return found?.revision ? sourceMaterialRevisionSchema.parse(sourceMaterialRevision(found.revision)) : null;
    },
  };
}
export type Views = ReturnType<typeof createViews>;
