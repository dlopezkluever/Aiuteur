# Location coverage is Directions by Looks, and a shot's view is resolved by one rule

Status: accepted (Wayfinder #53)

A Location must be seen from many angles, multi-direction coverage is the default outcome, a single image is a per-location choice, and shots must know their location and direction without manual management (Constitution §6.4). V1 modelled views as rows with their own camera fields, resolved a shot's location through a fuzzy resolver with stored confidences, and had two classifiers that disagreed on the threshold (legacy 07 §§2.7, 10.2, 10.3).

V2 makes **Coverage** part of the Location: a set of **Directions** (named places to look from, with an optional opposite), each with a **View** Slot per Look (or the base), filled by Attempts (generated, uploaded, or promoted from an approved Frame) with one active. Single-image mode is coverage with one Direction. Coverage is a sparse matrix: Views for a Look are made only when a shot needs that Direction in that Look.

A shot refers to a **Direction Slot**, never to a View Attempt, so selecting a different active View never breaks it. Resolution is one rule: the location is the setting Mention at the shot's anchor (explicit beats derived; states are explicit, derived or unresolved, with no stored confidence); the Direction is the creator's explicit one, else the AI's choice persisted as an AI-made choice, else the primary one; the View follows a fixed ladder down to the identity image and then text only. Falling down the ladder is reported quietly and never blocks.

## Considered options

- **Views as per-shot images.** Rejected: contradicts "shots know their direction without manual management" and loses frame reuse as a normal path.
- **Resolver confidences and thresholds stored on shots** (V1). Rejected: two consumers applied different thresholds; the only things worth storing are the creator's explicit choices.
- **Re-deriving the AI's Direction choice on every read.** Rejected: it would silently change when unrelated inputs change; persisting it as an AI-made choice makes it visible and overridable.
- **Sub-locations borrowing the parent's Views.** Rejected: a kitchen is not the house's exterior. The parent's identity image is only a "same place" reference for generating the sub-location's own coverage.

## Consequences

- Image models do not document camera-angle re-rendering from a reference (research #6, 2026-10-18), so every generated View is an Attempt the creator reviews, regeneration of one Direction is cheap, and Frames can be promoted into coverage. The model depends on no specific provider.
- Coverage quality varies without breaking shot resolution, because the ladder always yields something.
- The Location's coverage lives inside the Location, so copy-on-use takes it along.
