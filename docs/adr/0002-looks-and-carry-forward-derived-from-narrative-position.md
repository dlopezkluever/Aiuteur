# Looks are carried forward by derivation from narrative position, over stored change points

Status: accepted (Wayfinder #53)

A **Look** (a named, story-driven appearance of an entity) stays in effect until the story changes it, and the story may return to an earlier Look (a flashback). V1 copied Look state into a per-scene record at scene creation, never updated it, kept the "carry these tags forward?" answer in browser storage, and could inherit only from the immediately preceding scene (legacy 07 §§6.1, 6.5, 7.2).

V2 stores only **Look assignments**: (entity, Look-or-base, narrative position, extent), where extent is open-ended ("from here on") or bounded (a flashback or dream). The Look in effect at any scene or shot is **derived** by one rule: a covering bounded assignment with the latest start wins; otherwise the latest open-ended assignment at or before the position; otherwise the base appearance. Scenes and shots hold a Presence that refers to the entity and the derived Look; they record nothing per scene. A shot or scene may explicitly override its Look; that is a visible local choice, not a change point.

Assignments live in the project, not inside the entity, so an entity stays a self-contained unit that can later be copied from a personal library (Constitution §6.7).

## Considered options

- **Record the Look on every scene** (V1). Rejected: inserting, reordering or splitting scenes leaves stale per-scene data; every change needs a propagation step; returning to an earlier Look is a manual copy.
- **Open-ended change points only.** Rejected: a flashback would carry into the following scenes unless the creator remembered to add a restoring assignment every time.
- **Store the resolved Look on each Presence as a cache.** Rejected: it is a second copy of derivable truth, and it is exactly the staleness V1 suffered.

## Consequences

- Reordering or inserting scenes changes the derived Look immediately and correctly. Any frame or take whose recorded input Look Revision differs from the newly derived one is marked possibly out of date by lineage (#54); nothing is rewritten.
- The rule is deterministic and explainable ("Muddy suit, since Scene 4"). Absence of the entity from scenes does not interrupt carry-forward.
- Derivation needs a narrative position. An ad-hoc shot (Record 2 X5) has none, so the creator picks each entity's Look, and the default is base. A shot in a Removed from Story scene is not re-derived until the scene is brought back or its work is adopted or moved (ENTITIES-AND-LOOKS §4.3).
- Assignments need anchors that survive Master Narrative edits (Scene ids from #52, passage anchors from #51); when a refined anchor is lost, the assignment degrades to its scene and is flagged.
