import { objectIdSchema, projectIdSchema, type ObjectId } from "@aiuteur/contract";
import { planTreatmentOption, resolveSourceMaterial, treatmentOptionKind } from "@aiuteur/story";
import { z } from "zod";
import type { OperationRecord } from "../operation.ts";

const commandSchema = z.strictObject({ projectId: projectIdSchema, objectId: objectIdSchema, expectedDigest: z.string().min(1).optional() });
type Command = z.infer<typeof commandSchema>;

/** One passage per blank-line-separated block of the response; surrounding whitespace is not content. */
const passages = (response: string) => response.split(/\r?\n[ \t]*(?:\r?\n[ \t]*)+/).map((p) => p.trim()).filter((p) => p.length > 0);

/**
 * "Draft Treatment" (BUILD T0a): one Treatment Option from the creator's Source Material, on the text fast path. One
 * request, no divergence axis: N options and axes are VS2-2 / #132. Guards beyond G1 (schema) are T0-06's.
 */
export const treatmentDraft: OperationRecord<Command, { objectId: ObjectId }, string[]> = {
  id: "treatment.draft",
  operationClass: "text.create",
  outputKind: treatmentOptionKind.kind,
  parse: (command) => {
    const parsed = commandSchema.safeParse(command);
    return parsed.success ? parsed.data : null;
  },
  scope: (command) => ({ projectId: command.projectId, target: { objectId: command.objectId }, expectedDigest: command.expectedDigest ?? null }),
  async resolve(tx, scope, projectId, target) {
    const sourceMaterial = await resolveSourceMaterial(tx, scope, projectId, target.objectId);
    return sourceMaterial && { operation: "treatment.draft", sourceMaterial, writingStyle: null };
  },
  // AI-map G1 (schema): the model returns Treatment prose; it must be well-formed text with at least one passage.
  validate(response) {
    if (response.includes("\u0000") || !response.isWellFormed()) return { verdict: { pass: false, guard: "G1", reason: "not-well-formed-text" }, proposal: null };
    const proposal = passages(response);
    if (proposal.length === 0) return { verdict: { pass: false, guard: "G1", reason: "empty" }, proposal: null };
    return { verdict: { pass: true, guards: ["G1"] }, proposal };
  },
  attach: (proposal, generationId, newId) => ({ kind: treatmentOptionKind.kind, body: planTreatmentOption(proposal, generationId, newId) }),
};
