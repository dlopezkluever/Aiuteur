# #60 Scene workspace: two-variant comparison (throwaway prototype)

Decision support for the creator comparison (Record 4 §5.9). **Neither variant is ratified.** Only the capabilities in Record 4 §5.2–§5.8 are. Visuals are not approved (placeholder gradients stand for images). Mock film "The Salt Line": 20 scenes, 162 shots; scene 7 is hand-built (10 shots).

## Run
```
cd prototypes/v2-ux && python3 -m http.server 8760
open http://localhost:8760/60-scene-workspace/index.html            # hub; ?v=U or ?v=S
open ".../index.html?v=S&scene=7&shot=7F&job=plan"                   # job=plan|frames|takes, role=open|end|key, script=1, ctl=1
```
Top strip: **U · Unified / S · Staged** switch (same data, same scene, same selected shot), **AI vs Mine** toggle, daily-cap meter, **⚙ prototype controls** (state jumps: scene 14 auto-draft under $0.05, scene 17 "Draft plan · $0.08", cap breach on scene 19 / cheap scene 16, 7F match cut + persistent change + shot-only state, 7H reference shot, 7B partly approved frames, 7G CineBlock capture, "Block this shot" ready, wide composer, 7G part-3 failure, toggle plan accepted, next generation fails quietly, cap nearly reached, reset). Everything is in memory; reload resets.

## Files
`data.js` one data module (assets, Looks incl. description-only, scenes, hand-built scene 7) · `core.js` one state + derived rules (Look carry-forward, frame asset sets derived from roster, prompts and ingredients, ending image, spend gate, auto-draft, undo) · `ui.js` shared pieces (accordions, prompt block, ticket, shot strip, script drawer) · `plan.js` shot content, roster, references · `frames.js` frame workspace, continuity, CineBlock, gallery · `takes.js` #62-A Takes stage · `hub.js` Script Hub · `app.js` **the only variant-specific code** (U and S layouts, controls) · `style.css` · `screens/`.

Parity is structural: both variants call the same `P.*`, `F.*`, `T.*`, `H.*` components; `app.js` decides only where they sit.

## The two layouts
- **U**: scene header; **Plan · Frames · Takes** tabs; a persistent shot strip (cell width = runtime, status per mode) with a selected-shot context bar (frames, cut, every asset with Look and any change); each mode gets the full body width. Plan is one wide column of expandable sections (Shot content, Roster, References).
- **S**: stepper **Shots & Assets → Frames & Prompts → Takes** (each shows progress); a collapsible vertical shot rail is the shared navigation (Plan and Frames); the context bar persists; Plan is two columns (content | roster + references, closer to V1 stages 7+8 on one page). In Takes the rail collapses to chips and the runtime-proportional timeline is the navigator (A pattern).
- Shared in both: script drawer (collapsed by default, resizable grip, collapse), Accept plan, ‹ › scene stepping (counts as entry, Y4), "Back to review" after Fix this shot.

## Parity checklist (every row clicked in both variants in a browser; see screens/)
| # | Requirement | U | S |
|---|---|---|---|
| 1 | Full shot detail: action, dialogue + delivery (add/remove), location, Direction, camera facets + notes, visual, sound, duration, frame strategy; no short shots | Plan › Shot content (`u-plan-7B`) | Shots & Assets left column (`s-plan-7B`) |
| 2 | Roster + state plan: 5 on-screen modes, Look at opening/ending, blocking note, manual add, remove; frame asset sets derive and can be overridden per frame | Plan › Roster (`u-plan-7F-roster`); Frames › assets checkboxes | Roster column (`s-plan-7F-roster`); Frames & Prompts |
| 3 | Persistent change (A→B, carries; "From here on: Look Y"; description-only Look; write-back choice) and shot-only change (does not carry) | 7G Marta wet→dry carries to 7H/7J; 7F lamp cracks; 7F dust shot-only (`u-plan-7G-persistent`) | same (`s-plan-7G-persistent`) |
| 4 | References for whole shot or one frame; reference shot with recompose note; gallery attaches a frame as reference | 7H, Plan › References (`u-plan-7H-refshot`); gallery attach | `s-plan-7H-refshot` |
| 5 | Frame and video prompts collapsed; editing = "prompt overridden" (+ Back to generated); ingredients beside | Frames (`u-frames-prompts`) | same, plus in composer |
| 6 | Previous ending │ this opening │ this ending │ next opening; scene frame gallery | Frames (`u-frames-7B`, `u-frames-gallery`) | `s-frames-7B`, `s-frames-gallery` |
| 7 | Continuity: cut / continues / new view / match (graphic, action, eyeline) + pinned source + free note | 7F (match, source 7E:end) | same |
| 8 | Block scene in CineBlock / Block this shot; mocked return lands as references on matching roles, marked "not ready" until description + assets | `u-cineblock-return`, `u-frames-cineblock-7G` | `s-cineblock-return` |
| 9 | Transition into Takes: A pattern, wide composer, no persistent right sidebar; Scene / Whole film; unsettled count opens list on demand; compare; Mark final edit-through confirmation; Fix this shot → Back to review | tab Takes (`u-takes-*`) | Next: Takes (`s-takes-*`) |
| 10 | Spend/trust: price on controls; inline ticket (unknown price, $2+); no Start on cap breach; quiet failure ("Failed, not charged", partial "2 of 3 parts", Retry part · $); whisper dots; AI-chose marks only until Accept plan (then only via AI vs Mine); auto-draft on entry under $0.05, else "Draft plan · $x" | `u-autodraft-14`, `u-draft-plan-17`, `u-cap-breach-19`, `u-takes-cap-breach`, `u-plan-accepted` | `s-*` equivalents |
| Hub | B list + width=runtime ribbon (no per-shot ticks) + big summary: scrollable Master Narrative portion, assets, planned vs as-made, progress, key-frame carousel, ending image (frame → take still → world image → none) , Open scene, "No shots yet", Cards toggle | `hub-scene7`, `hub-no-shots`, `hub-cards` (shared by both) | |

Verification: both variants driven with agent-browser at 1440×900@2x; scripted click-through of roster add/remove/presence/persistent change, dialogue add, reference shot, per-frame asset override, Block this shot + return, auto-draft, empty scene, select / mark final / confirm, unknown-price ticket, cap breach (no Start), quiet failure, Retry part, compare, whole-film ribbon, unsettled list, Fix this shot/back. No JS console errors, no "[object" text.

## Honest tradeoffs
**U (Plan · Frames · Takes).** + One persistent strip and context bar make "which shot am I on and what is its state" constant; switching jobs is a tab, no loss of place; Plan has the whole width so long action prose and the roster breathe; fewer concepts to learn. − The strip plus context bar plus tabs spend ~170px of height on every job; the roster is long and sits under the content form (scrolling); in Frames the sticky role bar sits under three bands of chrome; "three jobs, one screen" invites mode-hopping with no sense of order or completion.
**S (Shots & Assets → Frames & Prompts → Takes).** + Reads like V1 and gives a clear order and per-stage progress; two-column Plan puts content and roster side by side; the rail gives every shot a title (not just an id); Takes drops the chrome and is closest to #62-A. − A stepper implies a sequence the product does not require (plan edits during frames are normal); the rail steals 250px (collapsible) and cramps Plan's two columns at 1440 (selects truncated); the stepper "Next" button on an empty scene is meaningless; more navigation surface to keep in sync.
**Both:** the shot strip/rail is the same data; frame work is full width in both; neither needed a persistent right sidebar. Biggest real difference is orientation (tabs = tools, stages = pipeline), not capability.

## Recommendation (a recommendation, not a decision)
Lean **U for the workspace shell with S's two-column Plan layout when width allows** and S's per-job progress summary shown as tab badges (e.g. "Frames 9/18"). Reason: the product's rule is that jobs interleave (fix a roster entry while looking at frames), tabs support that with no implied order, and the strip is already the shared navigation. If the creator wants V1-like ordering and guidance, S is the cleaner base and the "7+8 / 9+10" outcome is the same code. Not tested with a real creator.

## Open creator questions
1. Where does "plan accepted" (Y2) happen? The prototype adds an **Accept plan** button in the scene header; the records name the event but not the control.
2. Persistent-change write-back vs deviation: per roster row (prototype) or one prompt per shot or at plan acceptance?
3. If shot 7B sets Marta's ending to dry but 7C explicitly opens in wet, is that a conflict to flag? Prototype lets explicit opening Looks win and stops "carries to".
4. Scene frame gallery ordering (in story order here; by asset, by role?).
5. Is shot reorder by drag wanted in the workspace strip (here: ↑ earlier / ↓ later only)?
6. Should the context bar list every asset, or only changes?
7. Stage order as a gate for S: purely navigational (as built), or soft guidance?
8. Match kinds list (graphic, action, eyeline used here).

## Doc contradictions and gaps found (I read the Records and the glossary, not every doc end to end)
- Record 4 §5.6.2 says a transient ending state is the *default* unless the creator picks a Look; §5.5 also lists "transformation" as a roster field. The prototype folds both into one: ending Look empty = same Look plus an optional shot-only note. Spec should say whether these are one field or two.
- Y2 ties AI-chose marks to "plan accepted" but no doc defines the accept gesture (question 1).
- Y4 lists "Fix this shot" as entering a scene; Fix this shot starts in a scene, so it matters only from Review & Export (whole film).
- Record 4 §5.2.3 ending image order puts "approved ending Frame" first, but the last *active* shot may skip frames; prototype checks only the last shot, then falls back to its Take still, then the world image (the doc could mean "last shot that has an approved ending").
- Scene hub status ("In progress", "Complete") is not defined in any record; derived here from frames approved / Takes selected.

## Could not verify / limits
Resizing the script drawer by dragging was not exercised in a browser; images are gradients; no drag-reorder; Draft all, Peek, ad-hoc and Removed-from-Story from the earlier hub work are out of scope here; Look generation and uploads are mocked.
