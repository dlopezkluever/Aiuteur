import { z } from "zod";
import { LOOKS, objectIdSchema, type ObjectId, type ProjectId } from "@aiuteur/contract";
import { read, type KindDeclaration } from "@aiuteur/history";
import type { AttemptRow, ReadTx, RevisionRow, Scope } from "@aiuteur/store";
import { characterKind, readCharacter } from "@aiuteur/world";

// `production` (MODULE §3.2), T0 thin: the Shot kind with Presence (SHOT-MODEL §2, §4). A Shot made by hand in T0 has no
// Scene, so it is an ad-hoc Shot (Record 2 X5): it derives no Presence, and every Presence on it is an explicit add with
// the Look the creator picked, defaulting to base. VS6 adds Scenes, plans, anchors and derivation on the same kind.

/** One stored Presence: a reference to an entity and a Look, never a copy of either (ENTITIES §6). */
export const presenceSchema = z.strictObject({ entity: objectIdSchema, look: z.enum(LOOKS) });
export const shotBodySchema = z.strictObject({ action: z.string().max(4000), presence: z.array(presenceSchema).max(50) });
export type ShotBody = z.infer<typeof shotBodySchema>;

export const shotKind: KindDeclaration<ShotBody> = {
  kind: "shot",
  schemaVersion: 1,
  parse: (body) => {
    const parsed = shotBodySchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  },
  // An entity is present at most once on a Shot.
  invariants: [(body) => new Set(body.presence.map((p) => p.entity)).size === body.presence.length],
  // Lineage slices of SHOT-MODEL §2.1 that T0 has: action and presence, each narrative-bearing.
  slices: { action: (body) => body.action, presence: (body) => body.presence },
  narrativeBearing: ["action", "presence"],
  declaredIndexes: [],
  extractedColumns: [],
  remap: "new-ids",
  closure: "object",
  separability: "project",
};

/**
 * Sub-resource ids are never trusted (MODULE §7): every Presence must name a Character of this project under the Scope.
 * Run on the write transaction, under the Account's lock, before the commit.
 */
export async function presenceResolves(tx: ReadTx, scope: Scope, projectId: ProjectId, presence: ShotBody["presence"]): Promise<boolean> {
  for (const { entity } of presence) {
    const object = await tx.object(entity);
    if (!object || object.projectId !== projectId || object.kind !== characterKind.kind) return false;
  }
  return true;
}

export interface ResolvedPresence { readonly entity: ObjectId; readonly look: ShotBody["presence"][number]["look"]; readonly name: string }
export interface ShotState {
  readonly objectId: ObjectId;
  readonly head: RevisionRow;
  readonly action: string;
  readonly presence: readonly ResolvedPresence[];
  readonly sideLine: readonly { readonly attempt: AttemptRow; readonly presence: readonly ResolvedPresence[] }[];
  readonly createdAt: string;
}

/** A Shot of this project, with each Presence resolved to the entity's current name when read; reads only (R10). */
export async function readShot(tx: ReadTx, scope: Scope, projectId: ProjectId, objectId: ObjectId): Promise<ShotState | null> {
  const found = await read(tx, scope, objectId);
  if (!found || found.projectId !== projectId || found.kind !== shotKind.kind) return null;
  const resolve = async (body: unknown) => {
    const shot = shotKind.parse(body);
    if (!shot) throw new Error("stored Shot body does not parse");
    const resolved: ResolvedPresence[] = [];
    for (const p of shot.presence) {
      const character = await readCharacter(tx, scope, projectId, p.entity);
      if (!character) throw new Error("a stored Presence names no Character of this project");
      resolved.push({ entity: p.entity, look: p.look, name: character.body.name });
    }
    return { shot, resolved };
  };
  const head = await resolve(found.head.body);
  const sideLine = [];
  for (const attempt of found.sideLine) sideLine.push({ attempt, presence: (await resolve(attempt.body)).resolved });
  const first = await tx.revision(objectId, 1);
  return { objectId, head: found.head, action: head.shot.action, presence: head.resolved, sideLine, createdAt: (first ?? found.head).createdAt };
}
