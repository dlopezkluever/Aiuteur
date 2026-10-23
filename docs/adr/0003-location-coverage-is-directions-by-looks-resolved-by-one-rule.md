# Location coverage is Directions by Looks, and a shot's view is resolved by one rule

Status: accepted (Wayfinder #53); amended by Creator Ratification Record 2 D59 (Wayfinder #59), which controls. The text below states the current decision; the amendment note at the end records what changed.

A Location must be seen from many angles. A Location starts with one canonical reference image, and coverage follows the shots: the views the planned shots need become its coverage, generated from the canonical reference and cheap to accept in bulk. The creator may add more views at any time. A single image is a per-location choice, and shots must know their location and direction without manual management (Constitution §6.4 as amended by Record 2 §8). V1 modelled views as rows with their own camera fields, resolved a shot's location through a fuzzy resolver with stored confidences, and had two classifiers that disagreed on the threshold (legacy 07 §§2.7, 10.2, 10.3).

V2 makes **Coverage** part of the Location: a set of **Directions** (named places to look from, with an optional opposite), each with a **View** Slot per Look (or the base), filled by Attempts (generated, uploaded, or promoted from an approved Frame) with one active. Single-image mode is coverage with one Direction. Coverage is a sparse matrix: Views for a Look are made only when a shot needs that Direction in that Look.

A Location starts with one approved **canonical reference image** (its identity, which is its base Look) and **no Directions are proposed up front**. **Shot planning picks an existing named Direction or proposes a new named one**. A new Direction's empty View becomes a **coverage need**. Views are generated from the canonical reference only when the creator asks (no automatic media spend, Record 2 X8). They arrive as draft Attempts and are accepted in bulk, reversibly. The creator may add Directions or generate more Views at any time, including before any shots exist. Two readiness levels are derived and never gate (X9): **Identity readiness** and **Production coverage readiness** (the shots' Direction-by-Look Slots that have no View yet). A location variant may be an alternate Look or a separate Location entity. The creator chooses, and neither is privileged (D59.6).

A shot refers to a **Direction Slot**, never to a View Attempt, so selecting a different active View never breaks it. A shot's Direction is shot-owned: changing it never raises write-back (Record 2 P2). Resolution is one rule: the location is the setting Mention at the shot's anchor (explicit beats derived; states are explicit, derived or unresolved, with no stored confidence). The Direction is the creator's explicit one, else the AI's choice persisted as an AI-made choice, else the primary one if coverage has one (single-image mode's one Direction). With no Direction, the ladder starts at the identity image. The View follows a fixed ladder down to the identity image and then text only. Falling down the ladder is reported quietly and never blocks.

## Considered options

- **Views as per-shot images.** Rejected: contradicts "shots know their direction without manual management" and loses frame reuse as a normal path.
- **Resolver confidences and thresholds stored on shots** (V1). Rejected: two consumers applied different thresholds; the only things worth storing are the creator's explicit choices.
- **Re-deriving the AI's Direction choice on every read.** Rejected: it would silently change when unrelated inputs change; persisting it as an AI-made choice makes it visible and overridable.
- **Sub-locations borrowing the parent's Views.** Rejected: a kitchen is not the house's exterior. The parent's identity image is only a "same place" reference for generating the sub-location's own coverage.

## Consequences

- Image models do not document camera-angle re-rendering from a reference (research #6, 2026-10-18), so every generated View is an Attempt the creator reviews, regeneration of one Direction is cheap, and Frames can be promoted into coverage. The model depends on no specific provider.
- Coverage need is known only once shots exist, so it is derived from the shot plan, not predicted. Rejected: inferring needed Directions from Mentions before shots exist (the creator chose identity first, coverage from the actual shots later).
- Coverage quality varies without breaking shot resolution, because the ladder always yields something.
- The Location's coverage lives inside the Location, so copy-on-use takes it along.

## Amendment (Record 2 D59, 2026-10-22)

As first accepted under #53 (detailed in `ENTITIES-AND-LOOKS.md` §5.1 at that time), the AI proposed each Location's Direction set up front from its description and the Master Narrative (for a room, typically its walls plus an establishing view). All Directions were then generated in one batch during World Definition. The creator replaced this with identity first and shot-driven coverage (D59.1, D59.5, D59.11), and Constitution §6.4 and §15.1 were amended to match. The structure, the one-rule resolution, the fallback ladder and R5 are unchanged; only when Directions come into being changed.
