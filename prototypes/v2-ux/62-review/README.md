# #62 Candidate Review & Playback — throwaway interactive prototype

Fresh build from the ratified sequence-first behavior (D62, X1/X2/X5–X8, P3, Record 3 spend rules). Not based on `prototype/62-candidate-review`. Structural sketch only: visuals are not approved (Record 2 §3.1); look follows V1 (dark, cinematic).

## How to view
```
cd prototypes/v2-ux && python3 -m http.server 8762
open http://localhost:8762/62-review/index.html?v=A        # v=A|B|C, scope=scene|film
```
Mock data: 22 scenes / 171 shots (seeded, scene 7 is hand-built with every state). Everything is in memory; **Reset** reloads.
The dashed **prototype controls** bar: variant A/B/C · Scene/Whole film · Takes/Frames review · *Late result arrives* · *Next generation fails* · *Cap nearly reached* · Reset.
Things to try: Space = play/pause, ←/→ = shot, `c` = compare. Click a Take (swap = select, toast with Undo, playback restarts on that shot) · Unselect · Reject/Restore · Mark final · Compare (≤3, each with Select) · Generate/Retry (ticket when a confirm rule fires; "Generate missing" at film scope = 47 Takes ticket; cap-low → ticket with no Start) · Cancel then *Late result arrives* → "arrived after cancel" · Planned runtime toggle (same timeline component, planning state) · Fix this shot → Back to review (same playhead) · Play in context · Skip gaps · Frames review (Approve per role).

## The core task
One creator watches their cut, swaps a different Take into the sequence, and sees it play in place, with no commit ceremony. Selection is reversible and recorded; nothing is ever auto-selected; the cut is only ever selected Takes.

## Minimum info on screen
Viewer (what is under the playhead) · transport (play, prev/next, skip gaps, Play in context, Fix this shot) · scene header (as made vs planned runtime, N of M selected) · filter chips that separate **Needs a pick** from **Missing** (plus Failed, Possibly out of date) · timeline cells (id, selected Take thumb/duration, or gap kind) · the selected shot's Takes with Select/Unselect, Reject, labels · one "Make another take" row with price on the button · "What's unsettled" quiet list · collapsed *Prompt and references*. Export hint appears only at film scope. Nothing else.

## Behavior implemented (checklist against the brief)
- Gap slates: **"3 takes · none picked · Pick"** vs **"No take yet · Generate · $x"**; failure slate is muted ("2 of 3 parts made · Retry · $0.42 · part 3 of 3").
- New Take arrives unselected with "ready, not selected"; late results labelled "arrived after cancel"/"arrived late", unselected, quiet toast.
- Changing a pick flags the dependent (7A→7B continuity) with a whisper dot; nothing regenerates. Whisper exits: Regenerate · $x / It still fits / Keep.
- Take labels: model, guided (hover shows text), prompt overridden, duration differs, from the merged shot, N parts.
- Long shot (7D, 18 s): one Take, "3 parts", partial "2 of 3 parts made", Retry · $x per part, "From part 3" on a made long Take.
- Spend: price on the control; one click under $2.00/10 Takes; inline ticket at the control for $2.00+, 10+ Takes (Takes, not Segments), unknown price (Experimental X), bulk-by-filter; cap breach = **no Start** (Raise the cap / Trim / Not now); Peek never spends (not shown).
- Ad-hoc and Removed-from-Story are in the Outline as muted groups only, never in the timeline.
- Scene runtime planned vs as made; timeline hosts planning state via *Planned runtime* (X6).
- Frames: same area, Approve ≙ Select, per role; "Generate without the unapproved opening frame" is one explicit action.
- Failures: muted mark + text + Retry · $x, no red frames; unread list in top strip.

## Directions (switch with A/B/C)
**A — Strip + tray (width = runtime).** Continuous runtime-proportional timeline; the shot's Takes are a tray of cards below; compare is a checkbox per card replacing the viewer with panes. Whole film = a ribbon of 22 scene blocks (width=runtime, stacked picked/pick/missing bar) over the scene timeline.
- Best: reads like an edit; Takes have room for labels; spend and failures are in the tray and unsettled list.
- Worst: short shots become tiny cells; film ribbon shows state, not rhythm.

**B — Lanes under cells (equal columns).** One equal-width column per shot; the selected shot's Takes hang as a lane directly under its cell; gap cells carry their own Pick / Generate / Retry. Whole film = a scene rail on the left (runtime, picks, missing).
- Best: fewest clicks, gap actions live on the gap; scales via the rail.
- Worst: loses runtime proportion (not an edit feel), long scenes scroll horizontally, cells get busy, Take labels are cramped.

**C — Thin track + pinned compare.** Slim timeline, Takes in the tray with a pin on each thumb; pinning opens compare in the tray (viewer stays on the cut). Whole film = a one-line minimap of every scene with prev/next scene and "next unsettled shot".
- Best: most room for the viewer; cheapest at 250 shots; compare never replaces the cut.
- Worst: hidden pin affordance; a tiny track gives little state at a glance.

Evaluation (1–5): speed A4 B5 C4 · clarity A5 B3 C4 · control A5 B4 C4 · low interruption A4 B3 C5 · state legibility A5 B3 C3 · recoverability equal (Undo toast, Unselect, Restore) · scale A4 B4 C5 · cross-surface consistency (hosts #60 planned runtime) A5 B3 C4.

## Recommendation
**A as the base**, with two stolen ideas: **C's minimap line plus "Next unsettled shot"** for whole-film navigation (A's ribbon is state-only; C's keyboard-style stepping is faster at 150–250 shots; the ribbon stays drawn per scene, never per shot), and **B's gap actions on the gap cell** (a missing/failed shot's Generate/Retry/Pick sits on the cell, not only in the side list). Compare stays an opt-in checkbox/button that swaps the viewer to panes, each with Select (A), because C's viewer-stays variant hides the swap's result.
Reason: width = runtime is what makes the timeline the same component as planning's runtime view (X6), and it is the strongest "film review, not asset database" feel.

## Unresolved creator choices
1. Whole-film navigation: ribbon (state) vs minimap + next-unsettled (stepping) vs both.
2. Where compare opens: replaces the viewer (A/B) or sits in the tray (C).
3. Gap actions: only on the gap cell (B), only in the unsettled list, or both (recommended).
4. Should a freshly generated Take with no pick on that shot be offered as a one-click "Use this" in the notice? (Brief says nothing auto-selects; a click on the notice is not auto, but adds a second path to Select.)
5. Skip gaps default (doc: off); and whether "Play in context" stays a button.
6. Selection while a shot is Marked final: prototype blocks with "Unlock first"; doc says the creator can always unlock, so confirm the exact gesture.
7. Whether "Dismiss" on a failed mark should hide it from the unread count too.

## Doc contradictions / gaps found
- Cap-breach *Trim the selection* is only meaningful for batches; the doc lists it on every ticket. Prototype shows it only for 2+ items.
- CANDIDATE-REVIEW §5.2 says a single video under $2.00 starts on click; the Record 3 "10 or more Generations" wording says Generations, while P3 says Takes. Prototype counts Takes (P3 wins).
- SHOT-MODEL §7.3 still says each Segment counts toward the 10+ threshold in its original text; Record 2 P3 amended it, so readers of §7.3 alone get the wrong rule unless the amendment note is read.
- CANDIDATE-REVIEW §4 says the Retry for a failed part continues "later parts wait"; Retry price is per part but the batch's approved total was already confirmed. Prototype charges per part and counts it against the cap (no new ticket unless a rule fires); the doc does not say whether a part-Retry re-counts toward the daily cap or only the remaining parts.
- "Generating" slate: §4 says gap slate lasts 2 s; for a long-running generation the 2 s slate cannot show progress. Prototype uses 2 s and shows progress in the cell.
- §2 "Review & Export shows the scene-or-film switch" vs NAVIGATION §8 putting scene review in the scene workspace: the prototype serves both from one screen (the outline entry Review & Export sets film scope). The scene-scope entry point inside the scene workspace and the Review & Export entry could diverge in the real shell.
- NAVIGATION §5 puts scale on the Board *and* on the #62 whole-film timeline, but §2 of the review doc says "left to UX design"; no rule for what the film timeline shows when 150+ shots are filtered (prototype dims non-matching scenes).

## Screens (`screens/`, 1440×900 @2x)
01 gap slate (needs a pick) · 02 swap Take into the cut + Undo · 03 compare 3 · 04 bulk-by-filter ticket · 04b film-scope 47-Take ticket · 05 cap breach (no Start) · 06 partial long shot, Retry per part · 07 late arrival · 08 whole film ribbon + Needs-a-pick filter · 09 planned runtime · 10 frames review · 11 B lanes · 12 B film rail · 13 C compare in tray · 14 C film minimap · 15 Fix this shot.
