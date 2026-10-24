# #60 Scene production v3: Hub → Scene Prep → Generate → Review (throwaway prototype)

Decision support only. Not ratified, not implementation. Visuals are not approved. Record 4 §5.2–§5.8 capabilities are the requirements; the previous Plan/Frames/Takes IA is not. Images are mock inline SVG (portraits, location Views, props, frames), generated from the data so Looks and Views visibly differ.

## Run
```
cd prototypes/v2-ux && python3 -m http.server 8793
open http://localhost:8793/60-scene-production-v3/index.html
?scene=7&view=prep|gen|review&shot=7F&prep=A|B|C&gen=1|2|3&role=open|end&drawer=asset:marta|add:x&ctl=1
```
⚙ **prototype controls** (top right): switch Prep layout A/B/C and Generate layout 1/2/3 (same data, same components), and jump to states (auto-draft, cap breach, 7F match cut, 7G Marta wet→dry, Create Look for 7J, 7B partial frames, 7G CineBlock capture, Review 7C, wide take composer, failure, low cap). In-memory; reload resets.

## Architecture
Script Hub → **Scene Prep** (V1 stages 7+8) → **Generate** (9–12 incl. Take creation) → **Review** (#62-A concept, light). Scene header shows the three steps as a pipeline; no separate #60 Takes tab. Generate shows only the selected shot's Takes (preview, generate another, inspect failure, Retry part, Use this Take, Open in Review). Review = Scene / Whole film ribbon, runtime-proportional timeline with gap actions on the cell, playback, pick, compare (≤3, Select each), Mark final (edit-through confirm), next/previous unsettled, unsettled list on demand, wide take composer, **Fix this shot ▾** → Quick adjustment (stay) vs Open in Generate / Open in Scene Prep; **← Back to Review** returns to same scene, shot, playhead, whole-film state.

Files: `art.js` mock imagery · `data.js` one dataset (20 scenes, 162 shots; scene 7 hand-built, 10 shots) · `core.js` state + derivations (Look carry-forward, prompts/ingredients, library ops, spend gate) · `ui.js` shared pieces (rich shot cell, prompt block, ticket) · `assets.js` cast board, asset drawer, inline Create Look, world library · `prep.js` shot content + three Prep layouts · `gen.js` Generate components + three layouts · `review.js` · `hub.js` · `app.js` shell/controls.

## UX alternatives (same data, full parity)
**Prep.** A: persistent rich shot strip + scale/rhythm bar on top, selected-shot inspector below (left: what happens, dialogue, camera, cut, frames; right: cast board + references). B: storyboard cards (overview) → click for a focused editor with a vertical shot rail. C: cast × sequence matrix (assets as rows, shots as columns, presence bars, Look changes) above the inspector. The asset drawer (right) is shared.
**Generate.** 1: vertical pipeline with step rail (Inputs → References → Frames → Video & Take → Takes). 2: frame canvas + tabbed right tools (References / Prompts / Inputs / Scene gallery / CineBlock) + bottom generation dock with Takes tray. 3: scene-wide frame carousel on top, workbench, persistent pipeline dock (inputs/frames/video prompt/model/Generate Take/Takes).

## Interactive
Shot strip cell shows size, lens, movement, angle, continuity kind, status, cast avatars before any frame exists. Selected shot: action, dialogue + delivery, size/movement/lens pickers, cut kind (cut/continues/new view/match + match kind + source + note), frame strategy, duration, reorder, remove; “More detail” holds location, direction, angle, notes, visual, sound. Asset drawer: add (library by type), remove, Starts-as Look gallery, Ends-as (looks same / temporary change in this shot / changes to another Look, stays), “from here on” Look, During-this-shot (stays / enters / exits / opening only / ending only with presence bars), View gallery, blocking note, references, **Create new Look** inline (writes to the shared asset library, usable in every scene, visible in World library with “new”, optional assign, undo toast). Generate: readiness band, continuity row (prev ending │ opening │ ending │ next opening) with compare pairs and cut editor, scene frame gallery with attach-as-reference + recompose note, reference tray by origin (assets/composition/CineBlock/uploads, colour-coded), per-frame asset toggles, Block scene / Block this shot → mock CineBlock → return as references that need a description + confirmed assets, attempts, approve/unapprove, frame prompt + video prompt (concise preview, Edit = “Prompt overridden” + Back to generated, Ingredients with thumbnails), Generate Take · $x, ticket states, takes.

## Mocked
All images; generation (timers); CineBlock window; uploads; playback (Ken Burns over a still); World library editing beyond create. Spend: one representative ticket (unknown price / ≥$2), one cap breach (no Start) via controls.

## Improvements over the previous #60 prototype
Shot strip carries grammar before frames; assets are images with Look/View/presence, not chips and dropdowns; inline Create Look; presence/appearance wording is human (“Stays throughout”, “Temporary change (just this shot)”, “Changes to another Look (stays)”); long forms folded behind “More detail”; frames are large; Take creation lives in Generate; no duplicate Takes tab; AI-chose marks remain quiet.

## Known weaknesses
Prep A at 1440 is still tall (strip + inspector scrolls). Cast cards are big; 8+ assets would need a compact mode. Layout C’s matrix is wide (scrolls horizontally past ~12 shots). Generate 1 is long; 2 and 3 hide readiness behind a tab/side panel. Frame art is schematic (figures, not film frames). V1 WizardDirector screenshots were **not available**; V1 stages 7–12 were taken from `_inputs/legacy-foundational-docs/current-app-user-flow.md` and `_inputs/product-knowledge`. Grammar nit: “1 takes” in Review timeline cells. Script drawer resize drag not exercised.

## Actually exercised (agent-browser, 1440×900@2x, JS console errors = none, no “[object” text)
Hub: select scene by row, Open scene. Prep: shot select from strip, Look switch (Marta wet→dry), Create Look “Bloodied tuxedo” (library count 4, assigned as ending), add asset from library, remove asset, enter/exit presence + blocking note, temporary-change state, reorder shot, Prep layouts A/B/C rendered. Generate (layout 1 clicked; 2 and 3 rendered/screenshotted only): attempt generation ($0.04), approve/unapprove, compare pair toggle, cut editor, scene gallery select + attach reference with recompose note (7H), Block this shot → return capture, prompt Edit/Ingredients, Generate another Take (4 takes, cap debited), preview player, Open in Review, cap-breach ticket with no Start. Review: Fix this shot → Open in Generate and Open in Scene Prep → Back to Review (same shot and playhead), next unsettled, Mark final + edit-through confirm, compare (2 panes), Whole film ribbon.
**Not exercised:** keyboard shortcuts, Draft-plan auto-draft jumps (scene 14/17/19, carried from earlier prototype, rendered unchanged but not re-clicked), AI-vs-Mine toggle, Accept plan, Take reject/restore, take composer interaction, Generate layouts 2/3 click paths, upload buttons, Retry part click.

## Recommendation
**Agent recommendation — not creator decision.** Prep: **A** as base (strip + inspector) with **B’s storyboard** as an optional overview toggle; keep C’s matrix as a scene-level “Look changes” view, not primary. Generate: **layout 2** (canvas + tools + dock) feels most like editing software; 1 is best for first-time guidance. Not tested with a real creator.
