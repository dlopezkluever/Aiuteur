# Treatment ↔ Beat Sheet sync is explicit, and disagreement is asked about, never guessed

Status: accepted (Wayfinder #51; creator decision R10, `docs/product/CREATOR-RATIFICATION-RECORD.md`)

Before the Master Narrative is accepted, Aiuteur always detects and quietly shows disagreement between the chosen Treatment and the Beat Sheet (computed from content hashes against the last-agreed base), but it changes neither document unless the creator presses Sync. Sync is a normal AI operation: one Generation, one `sync` Revision per target, undoable. It never deletes or reorders blocks and never alters a protected span (`creator`, `imported` or `ai_edited` runs); a change that would touch one is held as an Option. Before drafting or accepting the Master Narrative, if the documents disagree, Aiuteur shows it and asks which to follow. After acceptance neither document is synchronized again.

## Considered options

- **Automatic after editing pauses.** Rejected by the creator: the AI would act unasked and change text the creator is not looking at, with background calls, races against continued typing, and cost (Constitution principles 1 and 11).
- **Per-project setting, default explicit.** Not V2. Sync is already a trigger on an explicit action, so an automatic trigger can be added later without redesign.

## Consequences

- Documents may sit out of step; the always-on drift mark and the disagreement check bound the harm.
- No standing background AI work for sync; reliability follows from the ordinary operation pipeline.
