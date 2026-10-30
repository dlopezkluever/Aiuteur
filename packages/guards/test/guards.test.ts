import { describe, expect, it } from "vitest";
import { checkTreatment, dialogueSegments, g3Verbatim } from "../src/index.ts";

// G3 over authored adversarial proposals (pure; no model). These are not staging recordings (VERIFICATION §3.5): see change-records/T0-06.md.
const SOURCE = "Mara says \u201cDeliver it.\u201d Later he adds \"Or nobody crosses.\" and ‘Mind the rope.’ She can't wait; Tom's boat leaves.\n";
const VERBATIM = "Mara hears \u201cDeliver it.\u201d, then \"Or nobody crosses.\" and ‘Mind the rope.’ before Tom's boat leaves.";
const verdict = (output: string) => g3Verbatim([output], SOURCE);

describe("G3 verbatim", () => {
  it("finds source segments in every quotation style and ignores apostrophes", () => {
    expect(dialogueSegments(SOURCE)).toEqual(["\u201cDeliver it.\u201d", "\"Or nobody crosses.\"", "‘Mind the rope.’"]);
  });
  it("passes unchanged dialogue", () => expect(verdict(VERBATIM)).toEqual({ pass: true, guards: ["G3"] }));
  it("refuses altered dialogue, including a changed quotation style", () => {
    expect(verdict(VERBATIM.replace("Deliver it.", "Deliver them."))).toMatchObject({ pass: false, guard: "G3", reason: "dialogue-not-verbatim" });
    expect(verdict(VERBATIM.replace("\u201cDeliver it.\u201d", "‘Deliver them.’"))).toMatchObject({ pass: false, reason: "dialogue-not-verbatim" });
    expect(verdict(VERBATIM.replace("\u201cDeliver it.\u201d", "\"Deliver it.\""))).toMatchObject({ pass: false, reason: "dialogue-not-verbatim" });
    expect(verdict(VERBATIM.replace("\u201cDeliver it.\u201d", "Deliver it."))).toMatchObject({ pass: false, reason: "dialogue-not-verbatim" });
  });
  it("refuses omitted, reordered and repeated dialogue", () => {
    expect(verdict("Mara hears \u201cDeliver it.\u201d and \"Or nobody crosses.\"")).toMatchObject({ pass: false, reason: "dialogue-not-verbatim" });
    expect(verdict("‘Mind the rope.’ \"Or nobody crosses.\" \u201cDeliver it.\u201d")).toMatchObject({ pass: false, reason: "dialogue-out-of-order" });
    expect(verdict(`${VERBATIM} \u201cDeliver it.\u201d`)).toMatchObject({ pass: false, reason: "dialogue-count" });
  });
  it("a source with no dialogue constrains nothing", () => expect(g3Verbatim(["Anything."], "No quotes here.")).toMatchObject({ pass: true }));
  it("checkTreatment keeps the parsed passages of a refused result for HELD, and none of an unparseable one", () => {
    expect(checkTreatment("Altered \u201cDeliver them.\u201d", SOURCE)).toMatchObject({ passages: null, retained: ["Altered \u201cDeliver them.\u201d"] });
    expect(checkTreatment("  \n\n ", SOURCE)).toMatchObject({ passages: null, retained: null });
  });
});
