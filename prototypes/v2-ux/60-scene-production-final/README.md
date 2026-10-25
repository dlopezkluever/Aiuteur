# #60 Scene production, final synthesis (canonical UX reference)

**This is the canonical interaction reference for the resolved Wayfinder #60 direction.** It visualises the model ratified in [Creator Ratification Record 5](../../../docs/product/CREATOR-RATIFICATION-RECORD-5.md) (SP, GN, RL, RB, VP) as amended by [Record 6](../../../docs/product/CREATOR-RATIFICATION-RECORD-6.md) (V6 voice paths, L6 Direction coverage). `/to-spec` and implementation agents should inspect this prototype for the chosen #60 interaction model.

**Authority order is unchanged:** Constitution, Records, ADRs, domain and UX docs all outrank this prototype. Where they differ, the docs win and this prototype is wrong. Visuals (mock inline SVG) are not approved. Nothing here is code to reuse.

The older `prototypes/v2-ux/60-scene-production-v3/` (Prep A/B/C, Generate 1/2/3), kept on branch `prototype/v2-60-scene-production-v3`, is **historical exploration only**. It is not on `main` and must not be read as the chosen design.

## Run
```
cd prototypes/v2-ux && python3 -m http.server 8793
open http://localhost:8793/60-scene-production-final/index.html
?scene=7&shot=7B&view=prep|gen|review&mode=frames|takes&role=open|end&ctl=1
```
No `shot` parameter opens the Storyboard (scene entry); a `shot` parameter opens that shot's editor directly (SP2). `?ctl=1` or the top-right button opens a "jump to a state" list. State is in memory; reload resets. Screenshots are in `screens/`.

## What it shows
- **Scene Prep.** Entering a scene opens the **Storyboard** (cards with opening Frame, blank placeholder, or a still from the selected Take for video-only shots; **Accept plan** → "Plan accepted"; here only). A card opens the **Shot editor** under the persistent **horizontal shot strip**. A small quiet "Storyboard" link returns. **Cast & Looks** matrix folds down under the strip, collapsed by default; a cell selects the shot and opens that asset in the right **asset drawer** (image-forward: add from library, Look galleries, presence, Create Look, blocking, references). **Split** and **Merge** sit in the shot header (keep-first ids). Location cards show **ordered Directions** (one or more), editable, with a priced "missing Views" action. Dialogue shows only a quiet 🎙 mark.
- **Generate** (one shot). Prominent **Frames | Takes** toggle with quiet readiness text beside it ("Inputs · Frames 1/2 · prompts ready"; explains, never gates).
  - *Frames:* neighbour row (previous ending │ opening │ ending │ next opening, compare pairs, cut editor), large frame, attempts, approve. Drawer tabs: **References** (assets, attached references by origin, **Add reference image** → visual reference browser, Block in CineBlock), **Prompts** (frame and video prompt together, ingredients inline as small thumbnails), **Scene frames** (gallery, attach with recompose note).
  - *Takes:* large player (before any Take: the approved opening → ending, or the inputs for video-only shots), this shot's Take row (selected, ready-not-selected, generating, failed, partial with Retry part), **Use this Take** explicit, compare, **Open in Review**. Drawer is **one panel, no tabs**: video prompt open, frame inputs, references sent, guidance, **Dialogue**, model as one row, estimate, **Generate Take / Generate Another Take**.
  - *Dialogue:* per line, native by default; Record / Upload / Play; **Speak line as Character Voice** (no performance needed); **Speak as Character Voice** on a performance (delivery kept); chosen Line audio ("Use"/"Use native"); **Generate unvoiced lines** (count and price, shot and scene); **Native → Character Voice** revoice on a native Take (new Take, source untouched, never auto-selected, limits stated, unavailable with a reason when two speakers). One quiet authorisation line appears only when a cloned Voice is first used. The Voice itself is defined in World Definition (a link out, no authoring here). Long audio shows the "Set shot to N s" offer.
- **Review** (light, only to prove the boundary): Open in Review lands on the shot; Fix this shot → Open in Generate / Scene Prep; Back to Review returns to the same shot. **Make another take** opens the **same composer component** as the Takes drawer (`G.composer`), wide.

## Taken from the old variants
Prep A strip and inspector (shot editor); Prep B storyboard (entry view); Prep C matrix (as fold-down); shared asset drawer and inline Create Look; Generate 2 shell (canvas + drawer); Generate 1 order (toggle, tabs, status); Generate 3 dock status text (readiness line); v3 continuity row, compare pairs, cut editor, scene frame gallery, CineBlock return, prompt override.

## Discarded
Scale/rhythm bar; vertical shot rail; permanent matrix; Storyboard | Shot toggle; Generate long scroll; Inputs/Model/Ingredients/CineBlock tabs; footer generation dock and Takes tray; Generate 3 frame carousel and side readiness panel; Accept plan in Generate; Script Hub (unchanged by Record 5, not redrawn); the v3 prototype-controls layout switchers; the limited "Record, Upload, Speak as" voice model.

## Later decisions incorporated (post-v3)
Record 5 as a whole; Record 6 V6.2 three dialogue paths and V6.4 batch; ADR 0025 (one chosen Line audio, authorisation gate, `performance-changed` marking); Record 6 L6.3 one or more ordered Directions per shot (ADR 0003 amended); L6.6 Directions are not treated as unrelated images (labelled, ordered, no spatial model built); Record 3 stage-entry draft rules (Draft plan · $x / auto under $0.05).

## Deliberately outside this prototype
Backup/replication, Fit algorithm and reference subset selection, provider and Offering internals, observability, job lifecycle, consent revocation UI, the World Definition Voice area, voice design, Location spatial layout/areas (LATER), compact asset-card mode for many assets, matrix scrolling past ~12 shots, reference-library paging and search, keyboard shortcuts, take-composer layout details (all spec-level in Record 5 §13).

## Stale assumptions found in v3 (not carried forward)
Single `direction` per shot; "Accept plan" in every header; Takes dock; scene-wide Take review inside Generate; the pre-Record 6 voice scope. Two small prototype-level choices not in the docs: Split cuts at the middle of the action sentences; revoice is offered on native Takes only.
