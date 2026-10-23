# Location coverage is Directions by Looks, and a shot's view is resolved by one rule

Status: accepted (Wayfinder #53)

A Location must be seen from many angles, multi-direction coverage is the default outcome, a single image is a per-location choice, and shots must know their location and direction without manual management (Constitution §6.4). V1 modelled views as rows with their own camera fields, resolved a shot's location through a fuzzy resolver with stored confidences, and had two classifiers that disagreed on the threshold (legacy 07 §§2.7, 10.2, 10.3).

V2 makes **Coverage** part of the Location: a set of **Directions** (named places to look from, with an optional opposite), each with a **View** Slot per Look (or the base), filled by Attempts (generated, uploaded, or promoted from an approved Frame) with one active. Single-image mode is coverage with one Direction. Coverage is a sparse matrix: Views for a Look are made only when a shot needs that Direction in that Look.

**Amended by Creator Ratification Record 2 (D59), which controls:** a Location starts with one approved canonical reference image (its identity and base Look), and **Directions are proposed at shot planning, not up front**, from the views the planned shots call for. Views are generated from the canonical reference, only on the creator's initiative (no automatic media spend), and accepted in bulk. The creator may add Directions or generate more Views at any time, including before shots exist. Two readiness levels are derived and never gate: **Identity readiness** and **Production coverage readiness**. A location variant may be an alternate Look or a separate Location entity, at the creator's choice. Constitution §6.4 and §15.1 are amended to match.

A shot refers to a **Direction Slot**, never to a View Attempt, so selecting a different active View never breaks it. Resolution is one rule: the location is the setting Mention at the shot's anchor (explicit beats derived; states are explicit, derived or unresolved, with no stored confidence); the Direction is the creator's explicit one, else the AI's choice persisted as an AI-made choice, else the primary one; the View follows a fixed ladder down to the identity image and then text only. Falling down the ladder is reported quietly and never blocks.

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
