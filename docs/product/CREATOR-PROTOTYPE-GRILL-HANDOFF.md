# Creator Prototype Grill Handoff

Date: 2026-10-23. Input to the next creator-grilling session. Nothing here is decided. Prototypes are structural experiments built fresh from Constitution, Records 1–3 and the strong-model audit. Old Haiku-era prototypes were not used as a base. All substantive work used the strong subagent model. No prototype branch is merged to `main`.

## How to view

```
git fetch origin
git worktree add ../v2-<n> origin/prototype/v2-<branch>      # or checkout the branch
cd prototypes/v2-ux && python3 -m http.server 8000           # serves all four; shared kit is ../shared
```

Open `http://localhost:8000/<folder>/` (each folder has `index.html` and a "prototype controls" panel that jumps to states). Screenshots are in each folder's `screens/`. Every folder has a `README.md` with the full tradeoff analysis.

| Ticket | Branch | Path | Directions |
|---|---|---|---|
| #60 Scene hub / planning (deepest) | `prototype/v2-60-scene-hub` | `prototypes/v2-ux/60-scene-hub/` | A Script Hub cards → workspace · B film timeline → edit the cut · C manuscript → coverage |
| #58 Writing | `prototype/v2-58-writing` | `prototypes/v2-ux/58-writing/` | Options: pager / strip / compare · Regeneration: dock / margin · Sync: bar / inline |
| #59 World Definition | `prototype/v2-59-world` | `prototypes/v2-ux/59-world/` | Home: by type / story order · Entity: tabs / ladder · Needs: one line / origin-shot checklist |
| #62 Review / playback | `prototype/v2-62-review` | `prototypes/v2-ux/62-review/` | A strip + tray · B lanes under cells · C thin track + pinned compare |
| shared kit | `prototype/ux-v2-shared-kit` | `prototypes/v2-ux/shared/` | one CSS/JS kit all four use; this handoff lives here |

## Agent recommendations (yours to accept or reject)

- **#60 → A.** V1 Script Hub cards/list (excerpt, thumbnail, dependencies, Draft-all checkbox, Peek) opening into narrative · shot list · shot work area with the shared timeline below. Borrow from B a scene-level strip (no per-shot ticks) and drag-reorder on timeline cells. C survives only as an optional coverage-bracket view inside a scene. B's per-shot ticks are too close to the rejected Board (D60.1).
- **#58 → Pager** (one option full-width, quiet "Option N of M", per-option summary chips, compare on request) + **dock** regeneration box + **bar** sync with per-beat actions behind a whisper. Acceptance = one sheet, Lock checked.
- **#59 → by type, tabs, one needs line** ("Identity ✓ · 3 views needed", naming the shot) with the origin-shot checklist on expand; coverage wall as an optional toggle; the proactive "Complete coverage" one disclosure away.
- **#62 → A** (runtime-proportional strip, Takes as cards below) + C's whole-film minimap with "next unsettled shot" + B's Pick/Generate/Retry on the gap cell. Compare is opt-in.
- **#61 — intentionally not prototyped.** D61, ADR 0024 and SHOT-PLANNING-INPUTS settle the behavior (same account/session, own tab, captures linked by shot id, always through image generation, world model as a provider, import path kept). The #60 and #62 prototypes surfaced no unresolved interaction in the scene/frame workflow; the only creator-facing screen is the Send-back review list, whose rules are written down (D61.7).

## Creator decisions needed (per surface)

**#60**
1. Does stepping through scenes (‹ ›, Cmd-K) count as "entering" for auto-draft? Prototype: any navigation does.
2. Hub thumbnail when a scene has no approved end frame (frames are optional).
3. Restructuring a locked plan by hand: prototype requires a one-click Unlock.
4. Moving an ad-hoc shot into a scene with no plan: prototype refuses, to avoid silently creating an "existing plan".
5. How Draft all counts toward 10+ (prototype: one per scene, so 10+ scenes always show the ticket).
6. Redraft of an untouched plan: apply directly with Undo (SHOT-MODEL §5.4.3) or always Options?
7. Keep the "plan accepted" chip, given it gates nothing? Show all three runtime figures on a card?

**#58**
1. A "Draft treatment options" button on a *skipped* Treatment (creator request, not stage entry), or "Write it myself" only?
2. Cap side-by-side compare when the Settings count exceeds 3?
3. Where "New alternative" lands once an option is already chosen.
4. Regeneration box always visible, or only after a selection?
5. Which attributes each option carries (tone, structure, ending, runtime are a guess from V1).
6. Return to the acceptance sheet after "Update first"?

**#59**
1. Where an alternate Look's own identity image comes from, before it gets views.
2. Do lightweight (text-only) entities count as Identity ✓?
3. Does "new view needed" persist until generated?
4. Tile carousel: browse all attempts, or approved first?
5. Keep "Mark world as set", given it gates nothing?

**#62**
1. Whole-film navigation: ribbon, minimap, or both.
2. Compare: replaces the viewer or opens in the tray.
3. Gap actions on the cell only, in an unsettled list only, or both.
4. May a "ready, not selected" notice carry a one-click "Use this"?
5. Skip-gaps default; keep a "Play in context" button?
6. Changing the pick on a Mark-final shot (prototype: "unlock first").
7. Does dismissing a failure lower the unread count?

## Cross-surface decisions to consider together

- **Whole-film timeline vs overview (#60 × #62).** D60.1 rejects "every shot as a mark" for the overview, while D62/X6 want one timeline component spanning 150–250 shots. Decide where the overview stops and the timeline starts; #60-A (cards) + #62 minimap is the recommended split.
- **One timeline component (X6).** #60's runtime and #62's review share a component in both sets of prototypes; confirm planned-vs-as-made on the same strip.
- **Entry-triggered spend (#58 × #60).** Treatment auto-generates at any ordinary cost; scene plan only below $0.05. Confirm the two stay deliberately different, and whether navigation shortcuts count as entry.
- **Counting rule for the confirm ticket.** "10+ Takes" (X2/P3) vs "10+ Generations" (Record 3) vs Draft-all-per-scene. One definition across Draft all, coverage views and Take batches.
- **Compare pattern (X1).** Treatment options (#58 compare), takes (#62 compare, max 3) and Look/view attempts (#59) should use one compare component with a Select action on each pane.
- **Cap breach / exceptional ticket.** All four use the same inline ticket with no Start on a cap breach; confirm one visual form.
- **Whisper marks and quiet failures.** Same dot and "Retry · $x" everywhere; confirm none escalates.
- **Undo for batches.** Draft all (#60), Accept all coverage (#59), take swap (#62), sync (#58) all offer Undo via toast; confirm one history/recovery idiom and where "revert" lives for each.
- **Locks.** Plan lock (#60), Mark final (#62), Master Narrative lock-by-default (#58): confirm one glyph, placement and unlock gesture.
- **Right sidebar pattern.** #58 reference sidebar, #60 Peek, #62 take tray, #59 coverage wall toggle: one rule for what is collapsible and what a Peek may contain (preview only).

## Contradictions and gaps found while prototyping

- NAVIGATION §3 "reading never writes" vs scene entry auto-drafting; the docs do not say if keyboard stepping or Cmd-K is entry.
- D60.3 "last approved end frame" assumes frames, which are optional (SHOT-MODEL §6.1).
- "A scene with no plan" is undefined for a scene holding only an adopted or moved unanchored shot.
- SHOT-MODEL §7.3 still says each Segment counts toward 10+; Record 2 P3 says Takes. Record 3 says "Generations".
- CR-2: a cap breach for an otherwise-trivial plan (e.g. $0.03 with the cap nearly spent) is unspecified; prototype shows no auto-draft and no Start.
- TRUST §4.4 covers AI results on a locked plan, not the creator's own edits.
- A part Retry has its own price, but whether it counts against the daily cap again is unstated.
- WRITING-EXPERIENCE §2.3: a new alternative "replaces the open option", but after a choice no option is open. "Choose this one" vs "Use this treatment" are both specified for the single-option case.
- "Update Beat Sheet from Treatment" appears on both pages; a held change from a Beat Sheet sync surfaces on the Treatment page, unspecified.
- ENTITIES-AND-LOOKS §7 counts a text-only definition as identity-ready; WORLD-DEFINITION/D59.4 defines readiness by an approved image. D59.4's "3 views needed" vs "1 new" count is ambiguous.
- Review & Export (NAVIGATION) and the scene workspace (D62) are two entry points to the same timeline and could diverge.
- Nothing specifies what the film timeline shows when 150+ shots are filtered.

## Limits

Mock data, canned AI output, no real generation. Interactions were exercised through scripted browser runs and screenshots of key states; not every control was clicked in each prototype (the READMEs list gaps). Prototype visuals are the shared kit's dark cinematic sketch, not an approved design (Record 2 §3.1).
