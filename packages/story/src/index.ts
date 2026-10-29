import { z } from "zod";
import { blockDocumentSchema, ROLES } from "@aiuteur/contract";
import type { BlockDocument, GenerationId, ObjectId, ProjectId } from "@aiuteur/contract";
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

/**
 * EI4: a Treatment Option is a block document with inline provenance runs (STORY-DOCUMENTS §2.2, §2.3). The block shape
 * (including the dialogue block kind) is `contract`'s; Treatment and its Options hold `paragraph` blocks only, so a
 * dialogue block is refused here. An Option's first Revision is generated: every run is `ai_generated`.
 */
export const treatmentOptionKind: KindDeclaration<BlockDocument> = {
  kind: "treatment-option",
  schemaVersion: 1,
  parse: (body) => {
    const parsed = blockDocumentSchema.safeParse(body);
    return parsed.success && parsed.data.blocks.every((block) => block.kind === "paragraph") ? parsed.data : null;
  },
  invariants: [(body, previous) => previous !== null || body.blocks.every((block) => block.kind === "paragraph" && block.fields.text.every((run) => run.provenance === "ai_generated"))],
  slices: { content: (body) => body.blocks },
  narrativeBearing: [],
  declaredIndexes: [],
  extractedColumns: [],
  remap: "new-ids",
  closure: "object",
  separability: "project",
};

/**
 * The planner for a generated Treatment Option (models propose, code commits: ADR 0007). Paragraphs are the proposal's
 * blank-line-separated passages; each becomes one block with a new id and one run whose provenance is computed here,
 * `ai_generated` by the Generation that made it (AI-map G7), never reported by the model.
 */
export function planTreatmentOption(paragraphs: readonly string[], generation: GenerationId, newBlockId: () => string): BlockDocument {
  return { blocks: paragraphs.map((text) => ({ id: newBlockId(), kind: "paragraph" as const, fields: { text: [{ text, provenance: "ai_generated" as const, generation }] } })) };
}
