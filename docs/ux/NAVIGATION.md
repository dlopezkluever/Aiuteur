# Aiuteur V2: Information Architecture and Navigation

Resolution of Wayfinder ticket #56. Authority: the Product Constitution, then the [Creator Ratification Record](../product/CREATOR-RATIFICATION-RECORD.md) §2 (#56), which controls where it differs from the prototype or from any earlier recommendation, and [Creator Ratification Record 2](../product/CREATOR-RATIFICATION-RECORD-2.md) (D58–D62, X5, X6, X8, §3.1), which controls where it changes either. The document names surfaces and behaviour, never components, routes or pixel layout. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md).

[Record 4](../product/CREATOR-RATIFICATION-RECORD-4.md) controls the Script Hub form, scene-entry meaning, whole-film grain (Y3) and the scene workspace's ratified capabilities. [Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md) controls the scene workspace's interaction model: Scene Prep → Generate → Review.

[Record 3](../product/CREATOR-RATIFICATION-RECORD-3.md) controls initial Treatment drafting and initial scene-plan spend. Stage-entry authorization does not require penny-level Treatment price labels or an extra Draft button. The scene plan retains its stricter below-$0.05 automatic boundary.

Constitutional anchors: §2.2–2.3, §4.1–4.4, §7.1, §12.1, §17.1–17.2. No constitutional requirement was found unworkable; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.**

## 1. Decision

The shell is **Model C: an outline tree plus a production board**, as chosen by the creator after comparing three throwaway prototypes (A phase rail with scene hub, B hub-and-spoke rooms, C outline plus board; source on the never-merged branch `prototype/56-navigation-models`).

1. **A persistent left sidebar, the Outline, is the film as a document.** It holds every phase and every scene in one tree. The creator especially asked for it to stay on screen everywhere inside a project.
2. **The centre is the workspace for whatever is selected.** A story phase opens its document there. A scene opens its **scene workspace** there. The board and review are centre views of the whole film (the board is the Script Hub, §2).
3. **Inside a scene, prepping and making shots is the main centre workspace.** This corrects the prototype, where a shot opened in a cramped right-hand drawer. A side **Peek** exists only as a lightweight preview (thumbnail, status, one-line plan, open-in-workspace). No shot work needs the Peek, and the Peek never initiates spend. The rejected drawer is the Peek-style side editor; Record 5's asset and Generate drawers are panels inside the centre workspace. This drawer prohibition is about shot work; a version-history panel inside a writing page is allowed (Record 2 D58.11).
4. **Cmd/Ctrl-K jumps** to any phase, scene, shot or entity.
5. **Nothing from prototype B is required.** The "suggested next" card is a stretch goal and not part of the main design.
6. **No first-run chooser, no tour, no tutorial video.** See §7.

## 2. The shell

```diagram
┌─────────────┬──────────────────────────────────────────────────────┐
│ OUTLINE     │  Top strip: title · runtime vs target · film         │
│ (always     │  progress · quiet "N possibly out of date" · spend   │
│  visible)   │──────────────────────────────────────────────────────│
│ Overview    │  CENTRE WORKSPACE                                    │
│ STORY       │   · story phase document, or                         │
│  Input      │   · World Definition, or                             │
│  Interview  │   · Board (whole film), or                           │
│  Treatment  │   · Scene workspace (Prep → Generate → Review)       │
│  Beats      │   · Review & Export (playback, export)               │
│  Narrative  │                                                      │
│ WORLD       │                                       ┌────────────┐ │
│ SCENES      │                                       │ optional   │ │
│  1 … 22     │                                       │ Peek       │ │
│   (shots of │                                       │ (preview)  │ │
│   open one) │                                       └────────────┘ │
│  Ad-hoc     │                                                      │
│  shots      │                                                      │
│  Removed    │                                                      │
│  from Story │                                                      │
│ OUTPUT      │                                                      │
│  Review     │                                                      │
└─────────────┴──────────────────────────────────────────────────────┘
```

- **Outline.** Sections: Story (Input, Interview, Treatment, Beat Sheet, Master Narrative), World (World Definition), Scenes (every active scene, expanding to its shots only for the open scene), Output (Review & Export). Treatment and Beat Sheet remain in the tree after Master Narrative acceptance as development history (§4.4.5). The Scenes section also holds two distinct groups (Record 2 X5, D52.4): **Ad-hoc shots**, intentionally created shots outside the narrative (SHOT-MODEL; they use the Scene Prep and Generate surfaces with no Review step, Record 5 §2), and **Removed from Story**, a collapsed, low-contrast group of scenes retired by a narrative change that keep all their work, with Bring back and Adopt work (SCENE-IDENTITY §5.1).
- **Treatment entry.** Entering the active Treatment stage with no Treatment, generated options or upload explicitly designated in Input as the Treatment automatically drafts the Settings count, default 3 (Record 3 CR-1; WRITING-EXPERIENCE §2.1). Ordinary cost such as $0.18 total adds no navigation price label, Draft button or confirmation. Exceptional spend conditions still stop generation for the inline ticket. Existing work and intentional skipped or bypassed phases are not automatically regenerated or backfilled.
- **Overview** is the project's first centre view when a project opens that has shots: the Board. A project with no scenes opens at Input. After that, Resume (§3) returns to the last centre view.
- **Board (whole-film overview), the Script Hub.** Ratified concept (Record 1 #56; Record 2 D60.2), form ratified by [Record 4](../product/CREATOR-RATIFICATION-RECORD-4.md) W60 §5.2: one centre view of the whole film where scope is chosen for batch actions and from which any scene opens. It is a compact **scene list** with the **scene ribbon** above it (one block per scene, width = runtime, a quiet picked / needs-a-pick / missing bar; never one mark per shot, D60.1). **One click selects a scene** and fills a large **summary panel** at the top: the scene's Master Narrative portion (scrollable), its assets, planned vs as-made runtime, progress, a carousel of the scene's key frames, and **Open scene**. Rows carry no per-row excerpts; a card view is an optional toggle. The scene's image is its **ending image** (the last active shot's approved ending Frame, else a still from its selected Take, else the main location's identity image, else none). A scene with no shots reads **"No shots yet"**. Batch actions are scope-then-invoke: **Draft all** drafts **shot plans only** (D60.4); generating frames or takes and regenerating flagged work are separate creator-initiated actions under the spend rules (X2, X8). It must stay usable at 150–250 shots (§5).
- **Scene workspace.** (Canonical visual and interaction reference: [`prototypes/v2-ux/60-scene-production-canonical/`](../../prototypes/v2-ux/60-scene-production-canonical/README.md); this document and Records 5 and 6 outrank it; it predates later decisions in places, see [PROTOTYPE-RECONCILIATION.md](../product/PROTOTYPE-RECONCILIATION.md).) Where the creator plans and makes one scene's shots. Its capabilities are ratified by Record 4 W60 §§5.3–5.8; its interaction model by [Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md). The scene header shows three steps as a pipeline, with no separate Takes tab:
  - **Scene Prep** (Record 5 SP): arrival at the scene opens a **Storyboard** of shot cards showing each shot's opening Frame (blank until one exists); a card opens the **Shot editor** (action, dialogue and delivery, camera, cut, frame strategy, duration, the **asset roster** as image cards) under a persistent **horizontal shot strip**; a **Cast & Looks** matrix folds down under the strip, collapsed by default; the right **asset drawer** handles Looks, Views, presence, blocking, references and Create Look. **Accept plan** lives here. Arrival at a specific shot opens its Shot editor directly. Script context is collapsible and never dominant by default.
  - **Generate** (Record 5 GN): one selected shot, with the same strip. A prominent **Frames | Takes** toggle switches canvas and drawer together. Frames: full-width frame work with the neighbour row and attempts; drawer tabs References (with the visual **reference library**, RL, and Block scene / Block this shot), Prompts (frame and video prompts with inline ingredients) and Scene frames. Takes: a large player with this shot's Takes beneath; the drawer is the **take composer** (video prompt open, ingredients, frame inputs, references, guidance, model, price, Dialogue). Readiness is status text beside the toggle and never gates.
  - **Review** (#62-A, D62, Record 4 W62, [`CANDIDATE-REVIEW-AND-PLAYBACK.md`](CANDIDATE-REVIEW-AND-PLAYBACK.md)): Takes judged in sequence. Fix this shot opens Generate or Scene Prep and Back to Review returns to the same shot and playhead (Record 5 RB).

  Previous and next shot and scene are one key or click. Scene progress (planned, framed, generated, selected, missing, possibly out of date) and scene runtime against the plan are always shown. **Entering** a scene means any arrival at its workspace: Outline, previous/next, Cmd-K, Fix this shot or a link from World; Peek, hub selection, hover and whole-film playback do not count (Record 4 Y4). Entering a scene with **no** shot plan drafts its initial plan automatically only below $0.05 and with no exceptional spend condition. At $0.05 or more it offers **Draft plan · $x** instead. Exceptional conditions use the inline ticket, with no Start on a cap breach (Record 3 CR-2). An emptied plan is an existing plan. This is text only, never a redraft or automatic media (D60.5, X8). CineBlock opens from the frame work in its own Aiuteur tab, as **Block scene in CineBlock** or **Block this shot** (D61.1, Record 4 W60 §5.8).
- **Peek.** Read-only preview next to the centre. Never the only way to do anything; never initiates spend.

## 3. What the shell must show honestly

| Need | Rule |
|---|---|
| Recommended, optional, skipped, bypassed phases | Each phase row shows one of: not started, in progress, done, **skipped by you** (Interview, Treatment, Beat Sheet when declined), **bypassed** (covered by supplied material, e.g. "your screenplay became the Master Narrative"), optional (Visual Direction, Audio, shown as available, never as missing). Skipped and bypassed read as intentional (dashed or italic, with a reason on hover and in the phase page), never as errors. A bypassed phase offers "fill it from the Master Narrative" on request only; nothing is backfilled or spent automatically (§4.3). |
| Progress at a glance | Derived, never stored in screens: a whole-film bar and runtime-vs-target in the top strip, a per-scene bar on each board row and Outline scene, per-phase status in the Outline. The same derivation feeds all of them (§17.2: the UI shows workflow truth and never owns it). |
| Moving backward | Free. Clicking any earlier phase or scene opens it, editable, with no unlock, no re-lock, no save step, no confirmation for viewing. Locks follow the Locks rules in `docs/domain/LINEAGE-AND-STALENESS.md` §6 and the ratified lock behaviour; navigation never triggers one. Reading never writes. Eligible empty-stage entry can initiate only the two initial-content operations above, under Record 3; it is not a read-only query. |
| Effect of editing upstream | The editing surface shows a small inline note of what will be marked possibly out of date. Markers are **whispers**: subtle, low-contrast, near the affected work, never a banner or modal, never blocking (Ratification M1). An on-demand review-all tray opens from the quiet footer line (docs/ux/TRUST-SIGNALS-AND-LOCKS.md), never shown by default. |
| Resume | Opening a project returns to the last centre view. "Last viewed" is non-creative UI state, kept per creator, never versioned, and never used to decide any gate. |

## 4. Navigation map

```diagram
Projects (account home)
 └─ Project
     ├─ Overview (Board)  ──────────────► Scene workspace (any scene, any shot)
     ├─ Story
     │   ├─ Input            (project settings, source material, routing)
     │   ├─ Interview        (skippable)
     │   ├─ Treatment        (skippable / bypassable)
     │   ├─ Beat Sheet       (skippable / bypassable)
     │   └─ Master Narrative (mandatory; acceptance)
     ├─ World Definition     (entities, Looks, location coverage, style)
     ├─ Scenes
     │   ├─ Scene N ─► Scene Prep ─► Generate ─► Review
     │   │              (storyboard,    (Frames | Takes, (scene timeline)
     │   │               shot editor)    one shot)
     │   │              Generate frames ─► CineBlock (own Aiuteur tab, same session)
     │   ├─ Ad-hoc shots       (outside the narrative; Prep and Generate only)
     │   └─ Removed from Story (collapsed; Bring back · Adopt work)
     ├─ Review & Export      (scene or whole-film playback, export package)
     ├─ Cmd/Ctrl-K           (jump to any phase, scene, shot, entity)
     └─ Cross-cutting, reachable from anywhere: review-all tray (on demand),
        Settings (account settings, spend caps and usage; project settings)
```

**Settings (ruling, #79).** There is one **Settings** area in the app, reachable from anywhere. Account settings: Treatment option count (WRITING-EXPERIENCE §2.2) and per-family model choice. Spend caps and the usage view sit beside them. Project settings (including the project's **Writing Style**, ENTITIES-AND-LOOKS §8) are the Input phase's project-settings block, also reachable from Settings. Layout is spec-level; this fixes the home, not the screen design.

**Package inspector (ruling, #79).** The Generation package inspector is an on-demand panel opened from either prompt view (the Prompts tab or the Takes drawer), not a destination. It shows the stored Rendered request and Package layers read-only (VERIFICATION-AND-OBSERVABILITY "shown equals sent" tests run through it); its internal layout is spec-level.

Moves that must be one step from anywhere: any phase, any scene, any shot (Outline or Cmd-K); Board from any view; previous and next shot or scene inside the workspace; Review jumping to a shot to fix it and returning.

## 5. Scale: 150–250 shots

- The Outline lists scenes, not shots; only the open scene expands. A filter, "needs attention" (failed, needs a pick, possibly out of date), narrows the scene list.
- The Board summarises every scene without opening each shot: a scene list plus a per-scene ribbon, with detail for the selected scene only (Record 4 W60 §5.2). The whole-film review (#62) uses the same per-scene ribbon with next/previous unsettled shot stepping. Above a scene the film is always drawn per scene; filtering dims scenes with no match (Record 4 Y3).
- Batch actions are scope-then-invoke (select scenes, a filter, or the whole film); the spend sum and the separate confirmation rule from #68 (10 or more counts Takes, Record 2 P3) apply at the invoke point, as an inline ticket at that control (X2).
- Per-scene shot lists are virtualised in the spec; this is a spec-level performance budget, not a navigation decision.

## 6. Out of scope here

The content of each surface (#58–#63), the review-all tray design (#63) and the Interview Ledger (#57), cost presentation (#62, #68), CineBlock entry (#61). This ticket fixes where they live and how the creator moves between them.

## 7. First run and onboarding

The creator **rejected a first-run chooser**. The outline is therefore:

1. After sign-in (accounts are invite-only), a creator with no projects sees the Projects page with one primary action: **New project**.
2. New project creates a project and opens the **normal Input phase** in the same shell. The Outline shows the full journey from the start, with only Input active. Nothing is gated behind it.
3. **Routing happens inside Input.** The creator adds whatever they have (typed text, files, transcripts) and optional project settings. For each item Aiuteur shows how it understood it (what it is, what role it plays, how mature it is) and proposes where the material enters the workflow (Constitution §4.2 Phase 1, §4.3). The creator confirms or changes it. Phases the material covers then appear in the Outline as **bypassed**; declined ones appear as **skipped by you** later.
4. Two sentences of text is a complete start. Input must be clear enough that no router screen is needed; its design is #57's, and it must carry this constraint.
5. **No tour, no tutorial video, no welcome modal, no coach marks.** Orientation comes from the Outline itself: every phase is visible, labelled with its status, and each phase page opens with one line saying what it is for and that it can be skipped where it can be.
6. The empty states of Board, World and Review say what makes them appear ("scenes appear once the Master Narrative is accepted"); they never block.
7. A "suggested next" card is a stretch goal, if ever added, and must stay dismissible and quiet.

## 8. Hand-offs

Each receiving ticket places its surface **inside this shell**.

| Ticket | Receives |
|---|---|
| **Story documents / writing experience** (#58, resolved by Record 2 D58 in [`WRITING-EXPERIENCE.md`](WRITING-EXPERIENCE.md)) | Each story phase is one centre document opened from the Outline. The **Beat Sheet** is the centre workspace with the chosen Treatment in a **collapsible right-hand reference sidebar**, not two equal editing surfaces (D58.6); the **Master Narrative** uses the same pattern with a Beat Sheet sidebar (D58.8). A version-history panel inside a writing page is allowed; the drawer prohibition of §1 item 3 applies to shot work only (D58.11). Treatment and Beat Sheet stay in the tree after acceptance as development history. Interview-skipped and bypassed states, and the disagreement check before Master Narrative drafting or acceptance (Ratification R10), appear on the phase pages and in the Outline status, never as modals. Master Narrative acceptance is one concise sheet whose Lock checkbox is **checked by default** (D58.9; Record 1 #63 item 3). |
| **World Definition** (#59, resolved by Record 2 D59 in [`WORLD-DEFINITION.md`](WORLD-DEFINITION.md)) | One centre surface opened from the Outline under World, deferrable, with no gate in front of production (R5, X9). Inside it (D59.9): a **World Definition home** of entity tiles, the **per-entity workspace** (Identity / Looks / Coverage, with the extraction review and manual Add), and an optional **project-wide coverage view**, two views over the same data. **Identity comes first**; location coverage needs are derived from the planned shots, not set up front, and the creator may add views at any time (D59.1, D59.5). A scene needing a missing entity or view shows it quietly in the scene workspace and links to World Definition; it does not block (readiness explains and never gates, R5). Coverage generation is creator-initiated with the price on the control and the batch spend rule as an inline ticket (X2); nothing generates by itself (X8). |
| **Scene hub and shot planning** (#60, resolved by Record 4 W60 and [Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md); Record 2 D60, Record 3 CR-2) | All earlier #60 UX (Board renditions, batch-drafting UIs) is rejected. Ratified and binding on the redo: a whole-film overview (the Board) plus per-scene workspaces, with prepping and making shots as the main centre workspace; **no drawer-based shot editor**, the Peek is preview only; the overview redesigned from the V1 Script Hub (D60.3); **Draft all** = shot plans only (D60.4); initial-plan auto-draft only for a scene with no plan and an estimate below $0.05, otherwise **Draft plan · $x**, with exceptional conditions using the inline ticket and a cap breach offering no Start (CR-2); never redrafting even an emptied plan, never triggering media (D60.5, X8); the D60.6 invariants (redraft never overwrites creator-touched fields and returns Options; omitted shots listed, not retired; locked plans hold results as Options; batch results undoable; dismissed proposals retired; batch spend rules); the Ad-hoc shots section (X5); one scene timeline shared with review as intent (X6). Record 4 W60 then ratified the Script Hub form and the workspace's capabilities (asset roster, persistent vs transient changes, references, prompt ingredients, wide frame work, neighbour comparison, match cuts, explicit CineBlock entry). Record 5 ratified the interaction model: Scene Prep (Storyboard arrival, Shot editor under a horizontal strip, fold-down Cast & Looks, asset drawer) → Generate (Frames \| Takes, reference library, take composer) → Review (§2). |
| **Composition and previs entry** (#61) | Previs, storyboard and shot-list imports attach to shots in the scene workspace (Direction is optional and available, never a required step) and may also be offered from Input for bulk routing to Scenes & Shots. They add no new top-level section. **CineBlock** is a module of Aiuteur that opens in its own tab under the same account and session from the scene workspace at frame generation, and Send back returns the creator there (Record 2 D61); see [`SHOT-PLANNING-INPUTS.md`](../domain/SHOT-PLANNING-INPUTS.md). |
| **Candidate review and playback** (#62, resolved by Record 2 D62) | Takes are reviewed in the centre of the scene workspace, as its **Review** step after Scene Prep and Generate (Record 5 RB), not in the Peek, **sequence-first** (variant A, Record 4 W62; frames are made and approved in the #60 frame work, not in review): a scene timeline with a main viewer, the selected shot's other takes under the timeline, and swapping a take in is selecting it (D62.1–3). The same timeline and viewer, with a scene-or-whole-film scope and the export package, form the Review & Export centre view; "jump to the shot" from playback lands in the scene workspace on that shot and can return. Ad-hoc shots are not in the timeline or sequence playback (X5). Progress and failure state come from the same derivations as the Board. Cost appears at the initiating control; the Peek never initiates spend. Detail: [`CANDIDATE-REVIEW-AND-PLAYBACK.md`](CANDIDATE-REVIEW-AND-PLAYBACK.md). |
| **Trust signals and locks** (#63) | Flags are whispers in the Outline, Board and workspace (M1). The on-demand review-all tray is cross-cutting; its entry is the quiet footer line already specified in `docs/ux/TRUST-SIGNALS-AND-LOCKS.md`. The Interview Ledger (`docs/ux/INTAKE-AND-INTERVIEW.md`) lives beside the Interview conversation. Lock indicators sit on the scope they lock and do not interrupt navigation. |
| **Intake and Interview** (#57) | The first-run path is the normal Input phase (§7). Input must show how each item was understood and propose the entry point; the routing lives there, with no router screen before it. |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)) and **persistence** (#72) | Status, progress, runtime totals, needs-attention filters and out-of-date markers shown by the shell are derived reads of server truth. The Board needs a whole-project, shot-level summary read that is cheap at 250 shots, and Outline/Board status must not depend on loading each shot's full record. |

**Rearview Mirror (Constitution §18.1).** Replaced by the neighbour-comparison row, the scene frame gallery and the Continuity link (Record 5 GN2–GN3). No separate panel.

## Record 2 amendments

Summary of the Record 2 changes now applied in §§1–8 above.

- The Outline gains **Ad-hoc shots** (intentionally created shots outside the narrative; SHOT-MODEL) and **Removed from Story** (retired scenes that keep work; SCENE-IDENTITY).
- The whole-film overview is to be redesigned from the V1 Script Hub (scene cards with number and slug, status, last approved end-frame thumbnail, asset dependencies, Master Narrative excerpt). Record 4 replaced the thumbnail with the frame-independent ending image (see Record 4 amendments). The earlier Board renditions are rejected and #60 is open for the redo.
- CineBlock is a module of Aiuteur that opens in its own tab or window under the same account and session (D61).
- Prototypes are structural sketches only; V1 is the visual and interaction reference (Record 2 section 3.1, X10).

## Record 4 amendments

Summary of the [Record 4](../product/CREATOR-RATIFICATION-RECORD-4.md) changes now applied above.

- The Board is the Script Hub: a scene list with a per-scene ribbon, and a large summary panel for the selected scene (Master Narrative portion, assets, runtime, progress, key-frame carousel). Its image is the frame-independent **ending image**; "No shots yet" replaces "no plan" on screen.
- Any arrival at a scene's workspace counts as entering it for the initial-plan auto-draft (Y4).
- The scene workspace's capabilities are ratified; its layout was then pending a prototype comparison (W60 §5.9), since resolved by Record 5.
- Frames are made in the #60 frame work; review (#62-A) is for Takes.

## Record 5 amendments

Summary of the [Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md) changes now applied above.

- The scene workspace is three steps, **Scene Prep → Generate → Review**, shown as a pipeline in the scene header; there is no separate Takes tab (A5).
- Scene Prep: arrival opens the Storyboard; a card opens the Shot editor under a persistent horizontal shot strip; Cast & Looks folds down, collapsed by default; the right asset drawer stays; the Scale bar is removed; Accept plan lives only here (SP).
- Generate: one shot; a prominent Frames | Takes toggle switches canvas and drawer; the Takes drawer is the take composer shared with Review; Add reference image opens the visual reference library (GN, RL).
- Voice is defined in World Definition; performances are recorded or uploaded in the Takes drawer (VP).
- Ad-hoc shots use Scene Prep and Generate with no Review step.
