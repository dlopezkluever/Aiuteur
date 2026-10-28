import { z } from "zod";
import { ROLES } from "@aiuteur/contract";
import type { KindDeclaration } from "@aiuteur/history";
import type { RevisionRow } from "@aiuteur/store";

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
  return { objectId: row.objectId, sequence: row.sequence, text: body.text, role: body.role, bodyHash: row.bodyHash, fingerprints: row.fingerprints, createdAt: row.createdAt };
}
