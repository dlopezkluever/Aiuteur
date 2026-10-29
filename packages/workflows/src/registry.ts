import type { WorkflowOperation } from "@aiuteur/contract";
import type { AnyOperationRecord } from "./operation.ts";
import { treatmentDraft } from "./operations/treatment-draft.ts";

/**
 * The `workflows` registry (EI2): one entry per operation, each owned by its entry file (SWARM §4.2). Its keys are the
 * closed WORKFLOW_OPERATIONS, so an operation cannot be named without a record, nor a record added without its name.
 * The operation harness (VC5) and isolation gate G1 are generated from it.
 */
export const REGISTRY: { readonly [O in WorkflowOperation]: AnyOperationRecord } = Object.freeze({
  "treatment.draft": treatmentDraft,
});
