import type { RecordedProposal } from "./proposals.ts";

// GP-S, the seed golden project (VERIFICATION-AND-OBSERVABILITY §5.1; BUILD-SEQUENCE §7), authored as the sequence of
// creator commands that make it, replayed through `api` → `workflows` → `history.commit`, so it can only hold states
// the product can reach. It grows append-only per slice; T0-05 begins it with the T0a leg: paste, draft, choose.
// Ids are not part of a command: each step names earlier results by step label.

export type GpSCommand =
  | { readonly step: "project"; readonly command: "project.create" }
  | { readonly step: "source"; readonly command: "source-material.paste"; readonly text: string }
  | { readonly step: "draft"; readonly command: "treatment.draft"; readonly source: "source" }
  | { readonly step: "choose"; readonly command: "treatment-option.choose"; readonly option: "draft" };

export const GP_S_SOURCE_TEXT =
  "Mara runs the night ferry between two islands that no longer speak to each other. One winter a passenger boards " +
  "with no ticket and a letter addressed to both mayors. \u201cDeliver it,\u201d he says, \u201cor nobody crosses again.\u201d\n";

export const GP_S_COMMANDS: readonly GpSCommand[] = Object.freeze([
  { step: "project", command: "project.create" },
  { step: "source", command: "source-material.paste", text: GP_S_SOURCE_TEXT },
  { step: "draft", command: "treatment.draft", source: "source" },
  { step: "choose", command: "treatment-option.choose", option: "draft" },
]);

/** The model output GP-S replays, in scenario-step order (one per model call). */
export const GP_S_PROPOSALS: readonly RecordedProposal[] = Object.freeze([
  {
    operation: "treatment.draft", step: 1,
    response: "Mara ferries a stranger who carries one letter for two mayors who have not spoken in years.\n\n" +
      "Halfway across, the storm turns them back, and Mara must choose which island hears the letter first.\n\n" +
      "She reads it aloud to both shores at once, from the middle of the strait.",
    source: { kind: "synthetic", note: "Authored for GP-S before any staging capture exists (no real adapter until T0-11)" },
  },
]);
