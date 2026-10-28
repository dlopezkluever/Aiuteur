import { z } from "zod";
import { actionGroupIdSchema, generationIdSchema, objectIdSchema } from "./studio.ts";

// Closed vocabularies of the write gate. `history`, `store` and the wire schemas derive from these.

// Draft FC3 wire shapes. The five results of the write gate are a closed union.
export const ROLES = ["primary", "supporting"] as const;
export const REFUSAL_REASONS = ["not-found", "unknown-kind", "kind-mismatch", "invalid-body", "invariant-violated", "missing-provenance"] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];
export const ACTOR_KINDS = ["creator", "generation", "import"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];
/** STORY-DOCUMENTS §4. */
export const REVISION_CAUSES = ["creator_edit", "ai_generation", "ai_targeted_rewrite", "sync", "import", "restore"] as const;
export type RevisionCause = (typeof REVISION_CAUSES)[number];
export const ATTEMPT_ORIGINS = ["stale-base", "held"] as const;
/** Causes whose content a Generation made (STORY-DOCUMENTS §4); MODULE §5.1 refuses them without a Generation. */
export const AI_CAUSES: readonly RevisionCause[] = ["ai_generation", "ai_targeted_rewrite"];
export type AttemptOrigin = (typeof ATTEMPT_ORIGINS)[number];
export const pasteSchema = z.strictObject({ text: z.string().min(1) });
export const changeRoleSchema = z.strictObject({ base: z.int().min(1), role: z.enum(ROLES) });

export const sourceMaterialRevisionSchema = z.strictObject({
  objectId: objectIdSchema,
  sequence: z.int().min(1),
  text: z.string(),
  role: z.enum(ROLES),
  actionGroup: actionGroupIdSchema,
  generationId: generationIdSchema.nullable(),
  bodyHash: z.string(),
  fingerprints: z.record(z.string(), z.string()),
  createdAt: z.iso.datetime(),
});
export const sideLineEntrySchema = z.strictObject({
  attemptId: z.uuidv7(),
  basedOn: z.int().min(0),
  origin: z.enum(ATTEMPT_ORIGINS),
  generationId: generationIdSchema.nullable(),
  text: z.string(),
  role: z.enum(ROLES),
  createdAt: z.iso.datetime(),
});
export const sourceMaterialReadSchema = z.strictObject({
  head: sourceMaterialRevisionSchema,
  sequences: z.array(z.int().min(1)),
  sideLine: z.array(sideLineEntrySchema),
});
export const impactSchema = z.strictObject({ version: z.int().min(0), reached: z.array(objectIdSchema) });
export const commitOutcomeSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("Applied"), appended: z.boolean(), revision: sourceMaterialRevisionSchema }),
  z.strictObject({ result: z.literal("NeedsConfirmation"), impact: impactSchema }),
  z.strictObject({ result: z.literal("HeldAsOption"), attemptId: z.uuidv7() }),
  z.strictObject({ result: z.literal("StaleBase"), head: z.int().min(0), attemptId: z.uuidv7() }),
  z.strictObject({ result: z.literal("Refused"), reason: z.enum(REFUSAL_REASONS) }),
]);
export type CommitOutcome = z.infer<typeof commitOutcomeSchema>;
