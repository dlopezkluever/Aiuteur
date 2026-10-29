import type { WorkflowOperation } from "@aiuteur/contract";
import type { FakeOutputKind } from "./fake-outputs.ts";

// Recorded proposals (VERIFICATION-AND-OBSERVABILITY §3.5): the model fake for L operations. A proposal is
// replayed by (operation id, scenario step), not by request digest, so a compiler change does not invalidate
// it; a step out of order or a missing step fails the scenario. Content-free of secrets; synthetic input only.

export interface RecordedProposal {
  readonly operation: WorkflowOperation;
  /** 1-based scenario step. */
  readonly step: number;
  /** The model's raw response, exactly as the operation's `validate` receives it. */
  readonly response: string;
  /**
   * Where it came from. `synthetic`: authored for a case before any staging capture exists (no real adapter until T0-11);
   * `staging`: captured from staging on synthetic input, with its model snapshot and date.
   */
  readonly source: { readonly kind: "synthetic"; readonly note: string } | { readonly kind: "staging"; readonly profileSnapshotId: string; readonly capturedOn: string };
}

/** Proposals belong to text fakes only, and run in step order 1, 2, 3 … */
export function validateProposals(kind: FakeOutputKind, proposals: readonly RecordedProposal[]): readonly RecordedProposal[] {
  if (kind !== "text" && proposals.length > 0) throw new Error("recorded proposals are model output for a text fake only");
  proposals.forEach((proposal, index) => {
    if (proposal.step !== index + 1) throw new Error(`recorded proposal steps must run 1, 2, 3 …; found ${proposal.step} at position ${index + 1}`);
  });
  return proposals;
}
