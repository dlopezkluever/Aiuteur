# Shot identity survives split, merge and redraft by keep-first retirement and Options

Status: accepted (Wayfinder #55)

A Shot has its own id and its parent Scene. Order is the Scene's Shot plan, and labels such as "4B" are derived. Split keeps the original id on the first part and gives the second part a new id with `split_from`. Merge keeps the earlier id and retires the later with `merged_into`. Both are one atomic action group that is undone by reversing it, and neither moves, copies or deletes Frames or Takes: those are immutable Attempts that stay on the id that made them, and the survivor is marked possibly out of date through its changed slices. A redraft (re-running shot drafting) may change only **drafted** slices, never creator-touched ones and never creator settings (composition references, frame skip, overrides, pinned continuity, selection, locks). A Shot with untouched AI output and no Frames or Takes accepts the result as an AI-made Revision; every other result is a proposed Revision **Option** the creator applies whole, per slice or not at all, and a shot the new draft omits is listed, never retired. Details: `docs/domain/SHOT-MODEL.md` §5.

## Considered options

- **Delete and re-insert, with fresh ids (V1).** Rejected: non-transactional, cascaded Frames and Jobs, lost structured camera and manual links, and duplicated the full duration into each part (legacy 08 §§3.2–3.4).
- **Both parts get new ids; the original is retired.** Rejected: severs the Shot's Frames, Takes and selection from the part that is still the shot, and makes every split a work-moving event.
- **Move Frames and Takes to whichever part "owns" them.** Rejected: Attempts are immutable and ownership of an artifact depends on a judgement about what it depicts. Frame reuse as lineage is the explicit, creator-driven way.
- **Redraft replaces the plan.** Rejected: V1 regeneration overwrote creator choices (legacy 08 §6.7, 07 §11.2). Matching by handle with Options preserves the creator and still gives the "just redraft it" path when there is nothing to protect.
- **Keep-first with Options (chosen).** The same pattern as blocks, scenes and entities, so one mental model and one set of tests covers every structural edit.

## Consequences

- Split and merge need a deterministic, transactional operation in the shot module and a verifier for dialogue exactly-once coverage (guards G3, G5).
- Every Shot slice needs a defined carry rule on split and merge, listed in the shot model.
- Redraft needs the protected-slice rule shared with story documents and a handle-matching step shared with scene mapping.
- The Board and Peek must show "from merged shot" Takes read-only: they are not eligible for the survivor's selection.
