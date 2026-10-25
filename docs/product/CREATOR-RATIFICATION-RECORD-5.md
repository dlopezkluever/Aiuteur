# Aiuteur Wayfinder V2: Creator Ratification Record 5

Date: 2026-10-25. Source: the final creator comparison and ratification grill for Wayfinder ticket #60 with Daniel Lopez-Kluever, creator and owner. The creator personally used the v3 scene-production prototype (branch `prototype/v2-60-scene-production-v3`, commit `64bd655b5dd909e9c28520a9e57847d6d396a733`, `prototypes/v2-ux/60-scene-production-v3/`) and compared its Scene Prep layouts A, B and C and its Generate layouts 1, 2 and 3. [Session thread](https://ampcode.com/threads/T-01a170ed-ec4e-72cd-a2a4-19f24fd003bf).

Status: **authoritative creator-decision source.** This record controls where it changes [Record 1](CREATOR-RATIFICATION-RECORD.md), [Record 2](CREATOR-RATIFICATION-RECORD-2.md), [Record 3](CREATOR-RATIFICATION-RECORD-3.md), [Record 4](CREATOR-RATIFICATION-RECORD-4.md), an ADR, a domain or UX doc, or a prototype. Where it is silent, earlier decisions stand. The Product Constitution remains above all records. **No Constitution amendment is made or required** (§11).

Identifiers: scene architecture **A5**, Scene Prep **SP1–SP8**, Generate **GN1–GN9**, reference library **RL1–RL4**, Generate and Review boundary **RB1–RB4**, voice and performance placement **VP1–VP5**.

## 1. What this record settles

Record 4 ratified the #60 **capabilities** (W60 §§5.2–5.8) and left the scene workspace's **interaction model and layout** pending a prototype comparison (W60 §5.1, §5.9). This record settles that interaction model. Record 4 W60 §§5.2–5.8 are not reopened; every capability listed there is kept and placed below.

The comparison did not pick a single prototype layout. The creator found the strongest parts of the layouts composable, so the result combines them (§9). Prototype visuals remain unapproved (Record 2 §3.1); this record fixes structure and behaviour, not visual polish.

## 2. A5 Scene architecture: Script Hub → Scene Prep → Generate → Review

The creator ratified the v3 architecture over the earlier Plan · Frames · Takes modes (Record 4 §5.9 Variant U) and over the Shots & Assets → Frames & Prompts → Takes split (Variant S):

1. **Script Hub** (Record 4 W60 §5.2, unchanged): find and understand the scene.
2. **Scene Prep** (V1 stages 7 and 8): plan the shots and prepare what is in each one: action, dialogue, camera, cut, frame strategy, the asset roster, Looks and Views, references, blocking and shot-only states.
3. **Generate** (V1 stages 9 to 12, including Take creation): one selected shot's production: references and inputs → frames → prompts → Takes.
4. **Review** (Record 4 W62, #62-A): judge Takes in sequence for a scene or the whole film.

The scene header shows the three scene steps as a pipeline with their counts (for example "Generate · frames 9/18", "Review · 3/10 picked"). There is **no separate #60 Takes tab**. A persistent **horizontal shot strip** sits at the top of Scene Prep and Generate. Previous and next shot and scene stay one key or click.

**Ad-hoc shots** (Record 2 X5) use the same Scene Prep and Generate surfaces, with the Ad-hoc shots section in place of a scene: their strip lists the section's shots, Looks are explicit, and no write-back or deviation is asked. They have no Review step, because they are not in any scene timeline or sequence playback; their Takes are picked in Generate. This follows from X5 and needed no separate creator question.

## 3. SP Scene Prep

1. **SP1 Arriving at a scene opens the Storyboard.** Arrival from the Script Hub, the Outline or previous/next scene opens a storyboard of the scene's shots: one card per shot in story order, with its number, title, size, movement and lens, cut into the shot, duration, status, cast avatars, an excerpt of the action and its first dialogue line. **Each card shows the shot's opening Frame**: a blank placeholder until one exists, and for a shot set to skip frames, a still of its selected Take or blank. Reading a fresh plan as a sequence happens here, and **Accept plan** lives here (SP8).
2. **SP2 Clicking a card opens the Shot editor** for that shot. The **horizontal shot strip stays across the top** while editing, carrying each shot's grammar (size, lens, movement, angle, cut kind, status, cast) before any frame exists. B's vertical shot rail is rejected. **Arriving at a specific shot** (Edit in Scene Prep from Generate, Fix this shot → Open in Scene Prep from Review, Cmd-K to a shot, a link from World Definition) opens that shot's editor directly.
3. **SP3 The Storyboard is not a mode toggle.** A small, quiet "Storyboard" link returns to it; with the strip always present it is rarely needed. **Frames | Takes in Generate is the product's one prominent mode toggle** (GN1).
4. **SP4 The Shot editor** is v3 layout A's selected-shot inspector. Left: what happens (full prose), dialogue with delivery, camera (size, movement, lens pickers), cut into this shot (cut, continues, new view, match with its kind, source and note), frame strategy, duration, add, split, merge, reorder and remove (single actions with undo, SHOT-MODEL §5), with location, Direction, angle, notes, visual and sound under "More detail". Right: **In this shot**, the asset roster as image cards (Record 4 W60 §5.5). A compact card mode for shots with many assets is spec-level.
5. **SP5 Cast & Looks matrix** (layout C's asset × shot sequence): a **fold-down panel under the shot strip, collapsed by default**, opened and closed at will. Assets are rows and shots are columns, with presence bars and Look changes, so the creator sees who and what appears where and how appearances change across the scene. Clicking a cell selects that shot and opens that asset in the asset drawer. It is an inspection and planning tool, never the primary editing surface.
6. **SP6 The right-side asset drawer is kept** as in v3: a visual library, never text-only dropdowns. Add asset from the World library by type (characters, locations, props, extra types), with images; the Look gallery for **Starts as** and **Ends as** (looks the same / temporary change, just this shot / changes to another Look, which stays); **During this shot** presence (stays, enters, exits, opening only, ending only); "from here on" Look; the View gallery for locations; blocking note; references; and **Create new Look** inline, which writes to the shared asset library and is usable in every scene.
7. **SP7 The Scale/rhythm bar is removed.** In v3 it encoded shot tightness as height, runtime as width and cut kind as colour; all three are already on the shot cards, and the creator could not read it. Runtime against the target stays as the header figure.
8. **SP8 Accept plan and write-back.** **Accept plan** appears only in Scene Prep and reads **"Plan accepted"** afterwards; it gates nothing and ends inline AI-chose marks (SHOT-MODEL §3.1, Record 4 Y2). It is not shown in Generate. **Write-back vs deviation** keeps its existing placement: one quiet note under the edited field, or under a Look change in the asset drawer ([`TRUST-SIGNALS-AND-LOCKS.md`](../ux/TRUST-SIGNALS-AND-LOCKS.md) §2).

## 4. GN Generate

Base: **v3 Generate layout 2** (canvas plus drawer), organised by **layout 1's production order**, with a separate canvas and drawer per mode.

```diagram
 Generate  ─  7B Marta at the door        [ Frames | Takes ]   Frames 1/2 · prompts ready
┌ horizontal shot strip (frame thumbnails, status) ──────────────────────────────┐
├──────────────────────────────────────────────┬─────────────────────────────────┤
│ FRAMES MODE                                  │ Drawer: References · Prompts ·  │
│  canvas: prev end │ opening │ ending │ next  │         Scene frames            │
│          large selected frame + attempts     │                                 │
├──────────────────────────────────────────────┼─────────────────────────────────┤
│ TAKES MODE                                   │ Drawer: one panel               │
│  canvas: large player (no Take yet = the     │  video prompt (open)            │
│          approved opening → ending)          │  ingredients · frame inputs ·   │
│          this shot's Takes underneath        │  references · guidance · model  │
│                                              │  row · price · Dialogue (VP)    │
│                                              │  [Generate Take · $x]           │
└──────────────────────────────────────────────┴─────────────────────────────────┘
```

1. **GN1 A prominent Frames | Takes toggle** at the top of Generate switches the canvas and the drawer together. Beside it, a short **readiness status** ("Inputs ✓ · Frames 1/2 · prompts ready", from layout 3's dock) replaces layout 1's Inputs step and layout 2's Inputs tab; a problem opens the drawer tab that fixes it. Readiness explains and never gates. Nothing switches mode automatically.
2. **GN2 Frames mode canvas** is the full-width frame workspace (Record 4 W60 §5.7): the neighbour row (previous ending │ this opening │ this ending │ next opening) with compare pairs and the cut editor, the frame-role switch, a large selected frame, attempts, **Another attempt · $x**, Approve and Unapprove.
3. **GN3 Frames mode drawer has three intentional tabs:**
   - **References:** the assets for this frame role (identity, Look, View, with per-frame toggles), attached references by origin, **Add reference image** (opens the reference library, §5), and **Block scene in CineBlock** / **Block this shot** (Record 4 W60 §5.8).
   - **Prompts:** the frame prompts **and** the video prompt, both readable together, each with Edit (an explicit override marked "prompt overridden", with Back to generated). **Ingredients show inline** under each prompt as small thumbnails, not as a tab.
   - **Scene frames:** the scene frame gallery, for matching against shots further away and attaching any frame as a reference with a recompose note.
4. **GN4 Takes mode canvas** is the video workspace: a **large player** and, beneath it, **this shot's Takes** in a row (Selected, ready not selected, generating, failed or partial "2 of 3 parts made" with **Retry part · $x**), with **Use this Take** / Unselect, Compare (Y6) and **Open in Review**. Before any Take exists, the canvas shows the approved opening → ending (or the shot's inputs when frames are skipped), so the creator still sees the frames while refining the video prompt.
5. **GN5 Takes mode drawer is one panel, no tabs**, because making a Take is one job: the **video prompt open by default** (Edit, override, Back to generated), its ingredients as thumbnails, the frame inputs, the references that ride along, optional guidance, **model as one row** showing the default and changeable, duration and parts, the price, the **Dialogue** section (VP2–VP3), and **Generate Take · $x** with the inline spend ticket (Record 1 #68, X2). Model and Ingredients are never their own tabs.
6. **GN6 When a Take is generated**, a "Generating Take N…" card appears in the Takes row. When it is ready the player can show it with **Use this Take**; it is **never selected automatically** (Record 4 W62.8, JOB-LIFECYCLE §11).
7. **GN7 Generate shows only the selected shot's Takes.** Scene-wide and film-wide Take judgment is Review's (RB1).
8. **GN8 One take composer.** The Takes-mode drawer is the take composer. Review's **Make another take** (Record 4 W62.3) opens the same composer, wide, over Review's timeline context. There is one composer component.
9. **GN9 Rejected from Generate:** layout 1's long scrolling page (its order survives in the toggle, tabs and status), layout 2's unordered References / Prompts / Inputs / Scene gallery / CineBlock tabs and its footer generation dock, layout 3's scene-wide frame carousel (it duplicates the shot strip and the Scene frames tab) and its side readiness panel, and Accept plan in the Generate header.

## 5. RL Reference library

1. **RL1 Add reference image opens a visual reference drawer**, the counterpart of Scene Prep's asset drawer, from the Frames References tab and from the Takes drawer's references. The creator browses thumbnails and never has to remember file names.
2. **RL2 Sections by origin, each image badged with what it is:**
   - **Frames from this film:** this scene first, then the whole project through scope and search; approved frames by default, with a toggle to show other attempts.
   - **Uploaded references:** the project's Reference Media.
   - **Storyboard panels:** panels matched to this scene's shots first, then unmatched panels from the import tray.
   - **CineBlock captures.**
3. **RL3 Picking an image attaches a Composition reference** (SHOT-MODEL §8.1) to the whole shot or one frame role, with notes (how to recompose) and subject mapping. A reference never contributes identity (SHOT-MODEL §8.2). Uploading from the drawer adds Reference Media.
4. **RL4 No new domain object.** Every source is already modelled: Frame Attempts, Reference Media, storyboard panels (imported Media and import-tray items, [`SHOT-PLANNING-INPUTS.md`](../domain/SHOT-PLANNING-INPUTS.md) §6) and CineBlock captures. The library is a derived, project-scoped read over them; its paging and search are spec-level.

## 6. Storyboard ingest: already decided, no new ticket

Storyboard ingestion and assignment were settled by #61 and Record 2 D61. Uploads, whether a whole storyboard, a folder, a few panels or reference illustrations, can be imported in bulk from Input or per scene. They are matched deterministically first, with AI only for ambiguous panels, and the creator confirms one list of ambiguous or work-affecting items. Many-to-one matches flag both rows. Unmatched panels stay in the import tray, visible, quiet and assignable later, and the source file is kept ([`SHOT-PLANNING-INPUTS.md`](../domain/SHOT-PLANNING-INPUTS.md) §6, [`NAVIGATION.md`](../ux/NAVIGATION.md) §8). The only consequence for #60 is RL2: storyboard panels, matched or not, are browsable in the reference library. No new Wayfinder concern is opened.

## 7. RB Generate and Review boundary

1. **RB1 Generate works deeply on one shot and makes its Takes; Review judges Takes in sequence** for a scene or the whole film (Record 4 W62): pick, compare, Mark final, next/previous unsettled, gap actions, unsettled list on demand.
2. **RB2 One selection.** Use this Take in Generate and picking in Review are the same selection Decision on the same pointer (TRUST-SIGNALS §6). Neither surface keeps a separate preview state.
3. **RB3 Review's quick fixes** are its existing W62 actions, including Make another take with the shared composer (GN8). Serious work goes through **Fix this shot ▾ → Open in Generate** or **Open in Scene Prep**, and **Back to Review** returns to the same scene, shot, playhead and Scene / Whole film state.
4. **RB4 Generate has Open in Review**, which lands on that shot under the playhead.

## 8. VP Voice and performance placement

The capabilities are settled by Constitution §11 (native dialogue in Takes CORE; consistent voices, recorded or uploaded performances and voice transformation preserving delivery IMPORTANT), and their mechanics (voice identity seam, performance as protected creator material, consent and authorisation, timing, realization paths and fallbacks, audio capability contract) belong to Wayfinder ticket #69, which this record does not open. This record fixes only **where the creator touches them**:

1. **VP1 A character's Voice is defined in World Definition**, on the Character beside its Looks. The creator can upload a short sample or as much material as they have, and the Voice applies across the whole film for that character (ENTITIES-AND-LOOKS §1: Voice 0..1, owned by the Character).
2. **VP2 Recording or uploading a performance of a line** happens in **Generate → Takes drawer → Dialogue**: each line of the shot with Record, Upload and Play, and the chosen performance per line (SHOT-MODEL §10 Performance link).
3. **VP3 Transforming a performance's voice** while keeping its delivery is in the same Dialogue section, per performance ("Speak as: Marta's voice · $x"), a priced, creator-initiated Generation.
4. **VP4 Scene Prep's dialogue line** shows a quiet 🎙 mark when a performance is attached and has no recording controls.
5. **VP5 The default path needs none of this.** With no performance attached, a Take uses native dialogue from the line and its delivery note. If #69 finds a capability infeasible, the placement above adapts to its fallback; a `CONSTITUTION AMENDMENT REQUIRED` proposal remains #69's route.

## 9. v3 components: retained, combined, changed, rejected

| v3 component | Disposition |
|---|---|
| Script Hub → Scene Prep → Generate → Review architecture, scene-header pipeline | **Retained** (A5) |
| Prep A rich horizontal shot strip | **Retained**, persistent across Scene Prep and Generate (SP2, GN) |
| Prep A selected-shot inspector | **Retained** as the Shot editor (SP4) |
| Prep A Scale/rhythm bar | **Rejected** (SP7) |
| Prep B storyboard overview | **Retained** as the scene arrival view, cards showing opening Frames (SP1) |
| Prep B focused editor with vertical rail | **Changed**: focus kept, rail replaced by the horizontal strip (SP2) |
| Prep C cast × sequence matrix | **Changed**: fold-down, collapsed by default (SP5) |
| Shared right asset drawer, inline Create Look, World library add | **Retained** (SP6) |
| Accept plan in every scene step header | **Changed**: Scene Prep only (SP8) |
| Generate 1 vertical pipeline | **Combined**: its order organises the toggle, the tabs and the status; the long page is rejected (GN1, GN9) |
| Generate 2 canvas plus tabbed drawer | **Retained as the shell**, tabs redesigned per mode (GN2–GN5) |
| Generate 2 footer generation dock and Takes tray | **Rejected**; replaced by the Takes mode canvas and drawer (GN4–GN5) |
| Generate 3 pipeline dock status | **Combined** into the readiness status text (GN1) |
| Generate 3 scene-wide frame carousel, side readiness panel | **Rejected** (GN9) |
| Continuity row, compare pairs, cut editor, scene frame gallery, attach-as-reference | **Retained** (GN2–GN3) |
| CineBlock Block scene / Block this shot, captures returned as references | **Retained** (GN3) |
| Prompt with Edit / override and Ingredients | **Retained**; ingredients inline, both prompts on one tab (GN3, GN5) |
| Selected-shot Takes in Generate with Open in Review | **Retained** (GN4, GN7, RB4) |
| Review (#62-A), Fix this shot ▾, Back to Review | **Retained** (RB) |
| Wide take composer | **Combined**: one composer shared by Generate's Takes drawer and Review (GN8) |
| Reference tray by origin | **Changed** into the visual reference library (RL) |

## 10. Prototype recommendations changed or rejected

| Agent recommendation (v3 README) | Creator decision |
|---|---|
| Prep A as base with B's storyboard as an optional overview toggle; C's matrix as a scene-level view | Storyboard is the **arrival view** with a quiet return link, not a toggle; horizontal strip persists in focus; C's matrix is a collapsed fold-down |
| Generate 2 (canvas, tools, dock) | Generate 2 shell with a **Frames \| Takes toggle**, a canvas and drawer per mode, and Generate 1's order; dock removed; Take gets the full canvas |
| Readiness hidden behind a tab in 2 | Readiness is status text beside the toggle |

## 11. Constitution check

No amendment. §7.3 (plans simply accepted) is kept by SP8. §8 (composition references) is served by RL. §10 (frames recommended, video mandatory, inspect and revise, the take composer) and Record 4 W60 §5.3 (each job gets essentially the full workspace when active) are met by GN. §11 is met by VP: the default path works without voice capabilities and the IMPORTANT capabilities have a place. §12.1 (playback of selected Takes only) is unchanged.

## 12. Recorded in this session

Applied: this record; [Record 4](CREATOR-RATIFICATION-RECORD-4.md) status notes on §5.1, §5.9 and §8; `docs/ux/NAVIGATION.md`, `CANDIDATE-REVIEW-AND-PLAYBACK.md`, `WORLD-DEFINITION.md`, `WRITING-EXPERIENCE.md` (stale "#60 redo" wording); `docs/domain/SHOT-MODEL.md`, `SHOT-PLANNING-INPUTS.md`; `docs/architecture/MODULE-ARCHITECTURE.md` (stale "#60 redo" wording only); `GLOSSARY.md`; Wayfinder ticket #60 resolved and the map's Decisions so far updated. Checked with no change needed: `docs/ai/AI-RESPONSIBILITY-MAP.md` (no new AI operation) and the rest of `docs/architecture/` (the reference library and the Cast & Looks matrix are derived reads over existing records). Not done: #69, #76, #77, #78, #79, `/to-spec`, `/to-tickets`, implementation.

## 13. Still deferred

Everything deferred in Records 1–4 stays deferred. Spec-level: the compact asset-card mode for many assets; the matrix's horizontal scrolling past about 12 shots; the reference library's paging and search; the exact list of match kinds; the scene frame gallery's ordering; take-composer layout details; keyboard shortcuts.
