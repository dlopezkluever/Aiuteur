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
/** `upload`: a creator-supplied artifact for a Slot, its bytes a Media (PERSISTENCE §3 `attempt`; T0-12). */
export const ATTEMPT_ORIGINS = ["stale-base", "held", "upload"] as const;
/** Causes whose content a Generation made (STORY-DOCUMENTS §4); MODULE §5.1 refuses them without a Generation. */
export const AI_CAUSES: readonly RevisionCause[] = ["ai_generation", "ai_targeted_rewrite", "sync"];
/** Writes that carry a client-supplied idempotency key (STORY-DOCUMENTS §4). */
export const IDEMPOTENT_OPERATIONS = ["source-material.paste", "source-material.change-role", "treatment-option.choose", "treatment.draft", "character.create", "character.reference", "shot.create", "shot.presence"] as const;
export type IdempotentOperation = (typeof IDEMPOTENT_OPERATIONS)[number];
// Opaque to the server: chosen by the client for one intended action, never interpreted.
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._~-]{1,128}$/);
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
/** `GET …/projects/:projectId/source-material`: everything the Input screen shows, oldest first (T0-08). */
export const inputReadSchema = z.strictObject({ items: z.array(sourceMaterialReadSchema) });
export type InputRead = z.infer<typeof inputReadSchema>;
export const impactSchema = z.strictObject({ version: z.int().min(0), reached: z.array(objectIdSchema) });
export const commitOutcomeSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("Applied"), appended: z.boolean(), revision: sourceMaterialRevisionSchema }),
  z.strictObject({ result: z.literal("NeedsConfirmation"), impact: impactSchema }),
  z.strictObject({ result: z.literal("HeldAsOption"), attemptId: z.uuidv7() }),
  z.strictObject({ result: z.literal("StaleBase"), head: z.int().min(0), attemptId: z.uuidv7() }),
  z.strictObject({ result: z.literal("Refused"), reason: z.enum(REFUSAL_REASONS) }),
]);
export type CommitOutcome = z.infer<typeof commitOutcomeSchema>;

/** Decision types (DOMAIN-MODEL §2; PERSISTENCE §3 `decision`). Append-only; current state is the latest event. T0 chooses a Treatment Option. */
export const DECISION_TYPES = ["choose"] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

// Draft EI4: block documents with inline provenance runs and dialogue as its own block (STORY-DOCUMENTS §2.2, §3).
/** Span provenance of a run (STORY-DOCUMENTS §3). Computed by code at commit, never reported by a model. */
export const RUN_PROVENANCES = ["creator", "imported", "ai_generated", "ai_edited"] as const;
export type RunProvenance = (typeof RUN_PROVENANCES)[number];
/** Block kinds. A dialogue block is the machine-addressable unit of dialogue; its id is its verbatim handle. */
export const BLOCK_KINDS = ["paragraph", "dialogue"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
const wellFormed = (text: string) => !text.includes("\u0000") && text.isWellFormed();
/** A maximal stretch of one provenance inside a field; AI-made runs name their Generation. */
export const runSchema = z.strictObject({ text: z.string().min(1).refine(wellFormed), provenance: z.enum(RUN_PROVENANCES), generation: generationIdSchema.nullable() })
  .refine((run) => (run.provenance === "ai_generated" || run.provenance === "ai_edited") === (run.generation !== null), { message: "an AI-made run names its Generation, and only an AI-made run does" });
export type Run = z.infer<typeof runSchema>;
const blockIdSchema = z.uuidv7();
export const blockSchema = z.discriminatedUnion("kind", [
  z.strictObject({ id: blockIdSchema, kind: z.literal("paragraph"), fields: z.strictObject({ text: z.array(runSchema).min(1) }) }),
  /** Speaker, delivery note and line are separate fields of one block (STORY-DOCUMENTS §2.2). */
  z.strictObject({ id: blockIdSchema, kind: z.literal("dialogue"), attrs: z.strictObject({ speaker: z.string().min(1) }), fields: z.strictObject({ delivery: z.array(runSchema), line: z.array(runSchema).min(1) }) }),
]);
export type Block = z.infer<typeof blockSchema>;
/** List order is story order; block ids are unique within a document. */
export const blockDocumentSchema = z.strictObject({ blocks: z.array(blockSchema).min(1) })
  .refine((doc) => new Set(doc.blocks.map((block) => block.id)).size === doc.blocks.length, { message: "block ids repeat" });
export type BlockDocument = z.infer<typeof blockDocumentSchema>;

/** `GET …/treatment-options/:objectId`: one Treatment Option's head and whether it is the project's current choice. */
export const treatmentOptionReadSchema = z.strictObject({
  objectId: objectIdSchema,
  sequence: z.int().min(1),
  generationId: generationIdSchema.nullable(),
  document: blockDocumentSchema,
  chosen: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type TreatmentOptionRead = z.infer<typeof treatmentOptionReadSchema>;
export const decisionReadSchema = z.strictObject({ subject: objectIdSchema, sequence: z.int().min(1), type: z.enum(DECISION_TYPES), actionGroup: actionGroupIdSchema, createdAt: z.iso.datetime() });
/** Choose is a Decision through the write gate: Applied, NeedsConfirmation (a lock), or Refused. */
export const chooseOutcomeSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("Applied"), decision: decisionReadSchema }),
  z.strictObject({ result: z.literal("NeedsConfirmation"), impact: impactSchema }),
  z.strictObject({ result: z.literal("Refused"), reason: z.enum(REFUSAL_REASONS) }),
]);
export type ChooseOutcome = z.infer<typeof chooseOutcomeSchema>;
