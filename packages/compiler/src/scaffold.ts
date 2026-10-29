import type { PackageOperation } from "@aiuteur/contract";

// Aiuteur's own wording for each operation (GENERATION-PACKAGE §8.3): versioned data, shown
// like every other layer, carrying no story, appearance or style. Changing a byte of any
// entry changes the Rendered request, so it needs a version bump (VC2) and an `evidence`
// reference (build rule R23). One owner: the layer catalog and this wording.

export interface Scaffold {
  readonly version: number;
  readonly evidence: string;
  readonly text: string;
}

export const SCAFFOLDS: Readonly<Record<PackageOperation, Scaffold>> = Object.freeze({
  "treatment.draft": Object.freeze({
    version: 1,
    evidence: "#101 first Draft Treatment scaffold; GENERATION-PACKAGE §8.3, §14",
    text:
      "Draft one Treatment from the Source Material section below. A Treatment is a short prose account of the whole story, " +
      "in present tense, that a reader can follow from beginning to end. Use the Source Material as the creator supplied it; " +
      "keep any line of dialogue it contains exactly as written. Return only the Treatment text.",
  }),
});

/** The one bounded repair call's wording (AI-RESPONSIBILITY-MAP §5): versioned data, like every scaffold. It names the refusing guard and reason and carries the refused response. */
export const REPAIR_SCAFFOLD = Object.freeze({
  version: 1,
  evidence: "#103 repair call; AI-RESPONSIBILITY-MAP §5, GENERATION-PACKAGE §11",
  text: (failure: { readonly guard: string; readonly reason: string }, previous: string) =>
    `Your previous response was refused by check ${failure.guard} (${failure.reason}). Correct that problem and nothing else. ` +
    `Return only the corrected Treatment text. The refused response follows.\n\n${previous}`,
});
