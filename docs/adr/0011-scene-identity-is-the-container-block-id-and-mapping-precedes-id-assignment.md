# Scene identity is the Master Narrative container block id, and mapping is decided before ids are assigned

Status: accepted (Wayfinder #52)

A Scene is the identity of a `scene` container block in the Master Narrative; there is no second id. Active or retired is derived from whether the head Revision contains that container. Production work hangs off that id and is never touched when a scene leaves the narrative. When incoming structure carries no ids (whole-narrative regeneration, revised screenplay import), matching runs before the Revision is committed: deterministic signals first, AI assistance only for what remains ambiguous, and the creator confirms every ambiguous or work-affecting item, because an identity merge cannot be undone once ids exist. Position is never an identity source. Details: `docs/domain/SCENE-IDENTITY.md`.

## Considered options

- **Separate Scene row bound to a container block.** Rejected: two ids for one thing, a binding to keep in step through split, merge and restore, and restoring an older Revision would not reactivate a scene by itself.
- **Identity from heading, number, or content hash.** Rejected: V1 matched `slug:number` then number (legacy 06 §8.3), so renaming or editing was an identity change, and an insert re-pointed later scenes' work to different text.
- **AI picks the match silently.** Rejected: ids are permanent, so a wrong merge is the one error that cannot be repaired afterwards, only worked around by moving work.
- **Always ask on every re-import.** Rejected: most matches are exact; confirming them is noise.
- **Container block id (chosen).** One id; restore reactivates scenes by id; split, merge and move are the block lifecycle already defined for story documents; retire needs no new mechanism.

## Consequences

- The Master Narrative editor must treat cut and paste inside the app as a move, and the splice guard must keep scene containers and boundaries out of targeted-rewrite output.
- Every Shot's parent is a Scene id and its anchor is a block id; re-homing is a recorded Decision (automatic only for the creator's own structural edits).
- Retired scenes are never destroyed inside a project (project purge excepted, M7); the Outline shows them only as the quiet "Removed from Story" group (Record 2 D52.4), distinct from Ad-hoc shots (X5).
- Mapping thresholds are tuned on golden fixtures in verification (#76).
