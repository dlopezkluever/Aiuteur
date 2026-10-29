import { z } from "zod";
import { ROLES } from "@aiuteur/contract";
import type { ObjectId, ProjectId } from "@aiuteur/contract";
import { read, type KindDeclaration } from "@aiuteur/history";
import type { ReadTx, RevisionRow, Scope } from "@aiuteur/store";

/** Source Material: an unaltered original plus its role. JSON cannot carry NUL or lone surrogates, so they are refused, never altered. */
export const sourceMaterialBodySchema = z.strictObject({
  text: z.string().min(1).refine((text) => !text.includes("\u0000") && text.isWellFormed()),
  role: z.enum(ROLES),
});
export type SourceMaterialBody = z.infer<typeof sourceMaterialBodySchema>;

export const sourceMaterialKind: KindDeclaration<SourceMaterialBody> = {
  kind: "source-material",
  schemaVersion: 1,
  parse: (body) => {
    const parsed = sourceMaterialBodySchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  },
  // Supplied originals are immutable (LINEAGE §1 class 2): only the role may differ from the Revision continued.
  invariants: [(body, previous) => previous === null || body.text === previous.text],
  // The unit a consumer reads is the original's text; the role is a descriptor.
  slices: { content: (body) => body.text },
  narrativeBearing: [],
  declaredIndexes: [],
  extractedColumns: [],
  remap: "new-ids",
  closure: "object",
  separability: "project",
};

/** The wire form of a Source Material Revision. */
export function sourceMaterialRevision(row: RevisionRow) {
  const body = sourceMaterialKind.parse(row.body);
  if (!body) throw new Error("stored Source Material body does not parse");
  return { objectId: row.objectId, sequence: row.sequence, text: body.text, role: body.role, actionGroup: row.actionGroup, generationId: row.generationId, bodyHash: row.bodyHash, fingerprints: row.fingerprints, createdAt: row.createdAt };
}

/**
 * Resolve for Source Material (GENERATION-PACKAGE §3 step 1; MODULE §2.1: Resolve lives in the owner).
 * Reads the head through `history.read` on a `ReadTx` and returns the text with the unit read, its
 * Revision and its frozen fingerprint. Writes nothing; null when the Scope has no such object.
 */
export async function resolveSourceMaterial(tx: ReadTx, scope: Scope, projectId: ProjectId, objectId: ObjectId) {
  const found = await read(tx, scope, objectId);
  if (!found || found.projectId !== projectId || found.kind !== sourceMaterialKind.kind) return null;
  const body = sourceMaterialKind.parse(found.head.body);
  const fingerprint = found.head.fingerprints["content"];
  if (!body || fingerprint === undefined) throw new Error("stored Source Material does not parse");
  return { text: body.text, captured: { unit: "content", objectId, sequence: found.head.sequence, fingerprint } };
}
