import { z } from "zod";
import type { ObjectId, ProjectId } from "@aiuteur/contract";
import { read, type KindDeclaration } from "@aiuteur/history";
import type { AttemptRow, ReadTx, RevisionRow, Scope } from "@aiuteur/store";

// `world` (MODULE §3.2), T0 thin: the Character kind and its identity-image Slot (ENTITIES §2). World Definition, Looks,
// Mentions and depth arrive with VS5, on the same kind.

/** A Character added by hand (ENTITIES §2.2a): its canonical identity is a name for now. */
export const characterBodySchema = z.strictObject({ name: z.string().trim().min(1).max(200) });
export type CharacterBody = z.infer<typeof characterBodySchema>;

export const characterKind: KindDeclaration<CharacterBody> = {
  kind: "character",
  schemaVersion: 1,
  parse: (body) => {
    const parsed = characterBodySchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  },
  invariants: [],
  // The unit a Presence and a later Generation read: the canonical identity.
  slices: { identity: (body) => body },
  narrativeBearing: [],
  declaredIndexes: [],
  extractedColumns: [],
  remap: "new-ids",
  closure: "object",
  separability: "project",
};

export interface CharacterState {
  readonly objectId: ObjectId;
  readonly head: RevisionRow;
  readonly body: CharacterBody;
  /**
   * The identity image the Character shows: its latest upload Attempt (the identity-image Slot; ENTITIES §2). T0 has
   * one way to fill the Slot, so the newest upload is the active one; choosing among several is VS5's.
   */
  readonly reference: AttemptRow | null;
  readonly createdAt: string;
}

/** A Character of this project under the Scope, or null; reads only (R10). */
export async function readCharacter(tx: ReadTx, scope: Scope, projectId: ProjectId, objectId: ObjectId): Promise<CharacterState | null> {
  const found = await read(tx, scope, objectId);
  if (!found || found.projectId !== projectId || found.kind !== characterKind.kind) return null;
  const body = characterKind.parse(found.head.body);
  if (!body) throw new Error("stored Character body does not parse");
  const uploads = found.sideLine.filter((attempt) => attempt.origin === "upload");
  const first = found.sequences[0] === 1 ? await tx.revision(objectId, 1) : null;
  return { objectId, head: found.head, body, reference: uploads.at(-1) ?? null, createdAt: (first ?? found.head).createdAt };
}
