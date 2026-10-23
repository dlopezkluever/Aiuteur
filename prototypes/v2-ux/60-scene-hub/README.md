# #60 Scene Hub and Shot Planning: UX redo, three directions

Throwaway interactive prototypes. Structural sketches only (Record 2 §3.1): visuals are the shared dark kit, not a design proposal. The old `prototype/60-scene-hub-shot-planning` branch was not used.

**Serve and view:** `cd prototypes/v2-ux && python3 -m http.server 8761`, then open `http://localhost:8761/60-scene-hub/` (chooser) → `a.html`, `b.html`, `c.html`. Use the **⚙ prototype controls** button (bottom-right) on any page to open a scene in each state, change the daily cap, make scene 19's price known/unknown, switch between ~130 and ~210 shots, or reset. Undo toasts are real (snapshot restore).

Files: `film.js` (22-scene mock film "The Salt Line", scene/shot state and every operation), `parts.js` (shell, Outline, **shared scene timeline**, spend ticket, Options panel, Draft all, ad-hoc, Removed from Story, Peek, controls), `proto.css`, `index.html`, `a.html`, `b.html`, `c.html`, `screens/`.

## Core creator task and minimum on-screen information

Task: *see the film as scenes, get each scene to a shot plan I accept, and start making frames and takes, without paying for surprises or losing edits.*

- **Per scene (overview):** number and slugline, status (derived), last approved end-frame thumbnail, asset dependencies (with a quiet "1 view needed"), the Master Narrative excerpt, runtime, and a plan-state hint (`drafts when opened`, `Draft plan · $0.06`, `locked`, `Options waiting`). Whispers only for out of date.
- **Per scene workspace:** the narrative with quiet coverage, the ordered shot plan, one shot's work area, and the scene timeline. Runtime planned / as made / story estimate sits in the header.
- **Never on screen by default:** costs of things already started, readiness gates, dashboards.

## Fixed across all three (the ratified rules, so only the layout varies)

- Entering a scene (Outline, hub, ‹ ›, `[` `]`) with **no plan** auto-drafts only when the estimate is under $0.05 and no exceptional condition applies (scenes 15, 16). Otherwise **Draft plan · $x** (17, 18). Unknown price (19), $2.00+ (20) or a cap breach use the **inline ticket**; a cap breach has **no Start** (try cap $0.10, scene 18). An emptied plan (12) and a locked plan (9) never auto-draft. An undone auto-draft does not repeat.
- **Draft all = plans only.** Scope-then-invoke, ticket at the control (10+ scenes, $2.00+, unknown price, cap), cap breach offers Trim to fit / Raise cap for this action / Not now. New plans apply; existing plans get **Options** (locked ones held); one Undo reverts the whole batch. Copy says "no frames, worlds or takes".
- **Redraft returns Options:** creator-touched fields are skipped ("kept as yours"), shots with takes only get Options, an omitted shot is listed and kept (retire it yourself), dismissed items are retired and restorable, a locked plan holds Options until unlocked. A plan with nothing to protect applies directly with Undo.
- **Split / merge / reorder / retire** are single undoable actions (first part keeps id and work; durations are partitioned and sum; merge keeps the earlier id and marks "⊕ includes work from a merged shot"; retire keeps work). Locked plans disable them.
- **One timeline component** (`UI.timeline`) at scene and film scope: cells follow runtime, dashed = no take yet, hatched = takes but none picked, whisper dot = possibly out of date, quiet failure text. Same vocabulary as #62.
- Coverage ("not covered by a shot") is informational. Scene 7 has an uncovered block, an overlap (7G covers two blocks), an unanchored case after Move to scene, a creator-edited shot, a failed, a generating, a needs-pick and an out-of-date shot.
- **Ad-hoc shots** (own Outline row; no scene, excluded from runtime and timeline, exported separately, **Move to scene…**) and **Removed from Story** (muted Outline row; Bring back, Adopt work, work counts) are separate views, never mixed.
- **Peek** (A and B) is preview only and has no spend controls. Frames and takes controls live in the shot work area with the price on the button.

## The three directions

| | A · Script Hub cards → three-column workspace | B · Film timeline first → edit the cut | C · Manuscript first → coverage view |
|---|---|---|---|
| **Hub** | V1 Script Hub modernised: card grid or list, checkbox per card for Draft all, filters, Peek. | The whole film as one timeline (scenes sized by runtime, shots as ticks), a focused scene slip with excerpt, and a reel list. Scope = shift-click range. | The Master Narrative itself, scene by scene, with a margin slip per scene; gutter checkbox (shift range); sticky Draft all bar; fold to sluglines. |
| **Scene** | Narrative · shot list · shot work area; timeline underneath. | Timeline on top is the editing surface (drag cells, Split/Merge on selection); shot form and narrative below. | Text blocks on the left, shots bracketed against the passages they cover on the right; selected shot expands in place; timeline pinned below. |
| **Quick** | Fastest to scan and scope; one click into a scene. | Fastest to see the shape and runtime of the film and to brush a range. | Fastest to judge a scene against its text. |

### Assessment (✓ strong · ~ ok · ✗ weak)

| Criterion | A | B | C |
|---|---|---|---|
| Speed to the next action | ✓ scene is one click, scope by ticking | ✓ range brush; ~ opening needs two clicks | ~ long scroll at 22 scenes; fold helps |
| Clarity | ✓ closest to the V1 layout the creator rated well | ~ ticks need a legend | ✓ excerpt is the content, but status is secondary |
| Control | ✓ list rows with ops, plan beside text | ✓ direct manipulation of cells (reorder by drag) | ✓ coverage gaps and overlaps are visible and fixable at the passage |
| Low interruption | ✓ | ✓ | ✓ ticket sits in a sticky bar (can cover text) |
| State legibility | ✓ chips on every card | ~ progress bar plus ticks, less text | ~ status small in margin |
| Recoverability | ✓ same undo everywhere | ✓ same | ✓ same |
| Scale (150–250 shots) | ✓ scene cards stay 22 regardless of shots; ✓ list view | ✓ ticks scale; ✗ resembles the rejected "every shot as a mark" Board | ~ document length grows with story, not shots; fold mode |
| Consistency with #62 | ~ timeline only in workspace | ✓ the film timeline *is* the #62 whole-film view | ~ timeline pinned in workspace |

**Weaknesses worth stating.** A: the options panel makes the middle column long. B: the film strip is the nearest thing to the Board renditions the creator rejected (every shot as a coloured mark, Record 2 D60.1 / NAVIGATION §2); it also hides the excerpt until a scene is focused. C: the hub is the slowest to scan for status, and editing structure (reorder/split) is less direct than on the timeline.

## Recommendation

**Take A as the base**, and borrow two things:

1. From B, a **scene-level** strip above the cards (one segment per scene sized by runtime, coloured by status; **no per-shot ticks**, which avoids the rejected rendition). This is the whole-film view of the shared #62 timeline and a second way to brush a Draft all range.
2. From B, **drag-to-reorder on the workspace timeline cells** (the shot list keeps ↑↓ for keyboard and accessibility).

Keep from C only the **coverage brackets as an optional lens** inside the scene workspace (anchors are the only place overlap and gaps read naturally); do not make the manuscript the hub. Reasons: A matches the V1 Script Hub the creator asked for, keeps the excerpt and thumbnail in view for 22 scenes, scales independent of shot count, and puts the three decisions (open, scope, draft) on the same screen.

## Unresolved creator choices

1. **Does "enter" include stepping through scenes with ‹ › or Cmd-K?** Every entry can spend pennies and write a plan. Prototype: any navigation counts. Alternative: auto-draft only when the scene is opened deliberately from the hub or Outline.
2. **Thumbnail with frames skipped or optional.** "Last approved end frame" has no value for direct-to-video scenes. Prototype falls back to the last selected shot's look; the real rule (extracted last still of the selected take?) needs a decision.
3. **Manual structure edits on a locked plan.** Docs say structure is protected but give no flow for the creator's own split/reorder (TRUST §5 tiers?). Prototype disables them behind a one-click Unlock.
4. **Ad-hoc shot or adopted work moved into a scene with no plan.** The scene would then have a plan (one shot) and would never auto-draft or offer Draft plan. Prototype disallows it. Options: allow it and keep "Draft plan" until the creator accepts, or treat unanchored-only scenes as plan-less.
5. **How Draft all counts toward "10 or more generations".** Record 3 counts Takes for batches; plan drafts are text generations. Prototype counts one generation per scene, so 10+ scenes always shows the ticket.
6. **Runtime figures:** planned, as made, and the Master Narrative estimate all show. Is three too many on the card, or should the estimate only show when it differs?
7. **Redraft on an unprotected plan applies directly (SHOT-MODEL §5.4.3).** Prototype does this with Undo; the creator may prefer Options always.
8. Whether the "plan accepted" chip (AI drafted vs your plan) earns its place, since it gates nothing.

## Contradictions and gaps found in the docs

- **NAVIGATION §2 / D60.1 reject "every shot as a coloured mark, one row per scene"** while D62 and NAVIGATION §5 ask for a whole-film timeline at 150–250 shots and X6 wants one component. Direction B's film strip sits on that line; D62 leaves the whole-film drawing open without saying where it stops being the rejected Board.
- **"Last approved end frame" (D60.3, UX-169)** assumes frames, but frames are optional (SHOT-MODEL §6.1). See choice 2.
- **"Scene with no Shot plan" is undefined for a scene holding only an adopted or moved unanchored shot** (SCENE-IDENTITY §5.1, SHOT-MODEL X5 amendment, §3.1). See choice 4.
- **NAVIGATION §3 "Reading never writes"** and a stage-entry auto-draft that spends: the doc notes the exception, but does not say whether keyboard stepping or Cmd-K counts as entry. See choice 1.
- **Record 3 §2 "10 or more Generations … Take batches count Takes"** does not say what Draft all counts. See choice 5.
- **Cap breach on a trivially cheap scene** (estimate $0.03, cap $0.02): CR-2 says cap breach offers no Start, so the scene shows neither auto-draft nor a Start. The prototype does this; the docs only state it for the ticket.
- **TRUST §4 point 4** offers the plan lock when frame generation begins, but the only plan-lock behaviours specified concern AI results; creator edits on a locked plan are unspecified (choice 3).

## Not covered

Cmd-K, real World Definition readiness, real frame/take generation (buttons only toast), CineBlock entry, a scene-mapping review, keyboard accessibility beyond `[`/`]`, and responsive layouts. Checked by script (`node` against `film.js`): auto-draft boundaries ($0.03/$0.04 draft, $0.06/unknown/$2.40/cap breach do not), emptied/locked never auto-draft, undo of draft/split/merge, touched fields never in Options, omitted shots not retired, batch scope kinds, trim to fit, ad-hoc move, bring back. Screens were reviewed visually in agent-browser at 1440×900@2x.
