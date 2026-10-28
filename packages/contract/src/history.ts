import { z } from "zod";
import { objectIdSchema } from "./studio.ts";

// Draft FC3 wire shapes. The five results of the write gate are a closed union.
export const ROLES = ["primary", "supporting"] as const;
export const REFUSAL_REASONS = ["not-found", "kind-mismatch", "invalid-body", "invariant-violated"] as const;
export const pasteSchema = z.strictObject({ text: z.string().min(1) });
export const changeRoleSchema = z.strictObject({ base: z.int().min(1), role: z.enum(ROLES) });

export const sourceMaterialRevisionSchema = z.strictObject({
  objectId: objectIdSchema,
  sequence: z.int().min(1),
  text: z.string(),
  role: z.enum(ROLES),
  bodyHash: z.string(),
  fingerprints: z.record(z.string(), z.string()),
  createdAt: z.iso.datetime(),
});
export const sideLineEntrySchema = z.strictObject({
  attemptId: z.uuidv7(),
  basedOn: z.int().min(0),
  origin: z.enum(["stale-base", "held"]),
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
