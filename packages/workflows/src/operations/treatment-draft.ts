import { objectIdSchema, projectIdSchema, type ObjectId } from "@aiuteur/contract";
import { checkTreatment, g4Splice } from "@aiuteur/guards";
import { planTreatmentOption, resolveSourceMaterial, treatmentOptionKind } from "@aiuteur/story";
import { z } from "zod";
import type { OperationRecord } from "../operation.ts";

const commandSchema = z.strictObject({ projectId: projectIdSchema, objectId: objectIdSchema, expectedDigest: z.string().min(1).optional() });
type Command = z.infer<typeof commandSchema>;

/**
 * "Draft Treatment" (BUILD T0a): one Treatment Option from the creator's Source Material, on the text fast path. One
 * request, no divergence axis: N options and axes are VS2-2 / #132. Guards (AI-map §3, §8): G1 schema, G2 reference
 * integrity, G3 verbatim dialogue and G4 splice over the proposal here; G7 provenance runs on the attach plan in dispatch.
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
  validate(response, inputs) {
    const checked = checkTreatment(response, inputs.sourceMaterial.text);
    return { verdict: checked.verdict, proposal: checked.passages };
  },
  current: (tx, scope, projectId, inputs) => treatmentDraft.resolve(tx, scope, projectId, { objectId: inputs.sourceMaterial.captured.objectId as ObjectId }),
  base: (inputs, current) => g4Splice(inputs.sourceMaterial.captured, current && current.sourceMaterial.captured),
  attach: (proposal, generationId, newId) => ({ kind: treatmentOptionKind.kind, body: planTreatmentOption(proposal, generationId, newId) }),
};
