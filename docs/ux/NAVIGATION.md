# Aiuteur V2: Information Architecture and Navigation

Resolution of Wayfinder ticket #56. Authority: the Product Constitution, then the [Creator Ratification Record](../product/CREATOR-RATIFICATION-RECORD.md) §2 (#56), which controls where it differs from the prototype or from any earlier recommendation. The document names surfaces and behaviour, never components, routes or pixel layout. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md).

Constitutional anchors: §2.2–2.3, §4.1–4.4, §7.1, §12.1, §17.1–17.2. No constitutional requirement was found unworkable; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.**

## 1. Decision

The shell is **Model C: an outline tree plus a production board**, as chosen by the creator after comparing three throwaway prototypes (A phase rail with scene hub, B hub-and-spoke rooms, C outline plus board; source on the never-merged branch `prototype/56-navigation-models`).

1. **A persistent left sidebar, the Outline, is the film as a document.** It holds every phase and every scene in one tree. The creator especially asked for it to stay on screen everywhere inside a project.
2. **The centre is the workspace for whatever is selected.** A story phase opens its document there. A scene opens its **scene workspace** there. The board and review are centre views of the whole film.
3. **Inside a scene, prepping and making shots is the main centre workspace.** This corrects the prototype, where a shot opened in a cramped right-hand drawer. A side **Peek** exists only as a lightweight preview (thumbnail, status, one-line plan, open-in-workspace). No shot work needs the Peek.
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
│  Treatment  │   · Scene workspace (plan / frames / takes / audio)  │
│  Beats      │   · Review & Export (playback, export)               │
│  Narrative  │                                                      │
│ WORLD       │                                       ┌────────────┐ │
│ SCENES      │                                       │ optional   │ │
│  1 … 22     │                                       │ Peek       │ │
│   (shots of │                                       │ (preview)  │ │
│   open one) │                                       └────────────┘ │
│ OUTPUT      │                                                      │
│  Review     │                                                      │
└─────────────┴──────────────────────────────────────────────────────┘
```

- **Outline.** Sections: Story (Input, Interview, Treatment, Beat Sheet, Master Narrative), World (World Definition), Scenes (every scene, expanding to its shots only for the open scene), Output (Review & Export). Treatment and Beat Sheet remain in the tree after Master Narrative acceptance as development history (§4.4.5).
- **Overview** is the project's first centre view when a project opens that has shots: the Board. A project with no scenes opens at Input.
- **Board.** Every shot of the film as one mark, one row per scene, status by colour, runtime per scene, a quiet marker on possibly-out-of-date shots. A mark opens the Peek on hover or select; opening it fully moves the centre to the scene workspace on that shot. Batch actions (draft plans for scenes, generate approved shots, regenerate flagged) are scope-then-invoke here and on the scene rows. The board is the 150–250-shot answer: the whole film fits on one screen without paging.
- **Scene workspace.** The scene's Master Narrative text, its shot list, and a per-shot work area in the centre. Shot work (plan, optional direction, frames, takes, optional audio) happens here. Previous and next shot and scene are one key or click. Scene progress (planned, framed, generated, selected, missing, possibly out of date) and scene runtime against the plan are always shown at the top.
- **Peek.** Read-only preview next to the centre. Never the only way to do anything.

## 3. What the shell must show honestly

| Need | Rule |
|---|---|
| Recommended, optional, skipped, bypassed phases | Each phase row shows one of: not started, in progress, done, **skipped by you** (Interview, Treatment, Beat Sheet when declined), **bypassed** (covered by supplied material, e.g. "your screenplay became the Master Narrative"), optional (Visual Direction, Audio, shown as available, never as missing). Skipped and bypassed read as intentional (dashed or italic, with a reason on hover and in the phase page), never as errors. A bypassed phase offers "fill it from the Master Narrative" on request only; nothing is backfilled or spent automatically (§4.3). |
| Progress at a glance | Derived, never stored in screens: a whole-film bar and runtime-vs-target in the top strip, a per-scene bar on each board row and Outline scene, per-phase status in the Outline. The same derivation feeds all of them (§17.2: the UI shows workflow truth and never owns it). |
| Moving backward | Free. Clicking any earlier phase or scene opens it, editable, with no unlock, no re-lock, no save step, no confirmation for viewing. Locks follow the Locks rules in `docs/domain/LINEAGE-AND-STALENESS.md` §6 and the ratified lock behaviour; navigation never triggers one. Reading never writes. |
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
     │   └─ Scene N ─► Shot list ─► Shot work area
     │                  (plan · direction · frames · takes · audio)
     ├─ Review & Export      (scene or whole-film playback, export package)
     ├─ Cmd/Ctrl-K           (jump to any phase, scene, shot, entity)
     └─ Cross-cutting, reachable from anywhere: review-all tray (on demand),
        spend and usage, project settings
```

Moves that must be one step from anywhere: any phase, any scene, any shot (Outline or Cmd-K); Board from any view; previous and next shot or scene inside the workspace; Review jumping to a shot to fix it and returning.

## 5. Scale: 150–250 shots

- The Outline lists scenes, not shots; only the open scene expands. A filter, "needs attention" (failed, needs a pick, possibly out of date), narrows the scene list.
- The Board is the only place all shots appear together, as marks, not cards.
- Batch actions are scope-then-invoke (select scenes, a filter, or the whole film); the spend sum and the separate confirmation rule from #68 apply at the invoke point.
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
| **Story documents / writing experience** (#58) | Each story phase is a centre document opened from the Outline. Treatment and Beat Sheet stay in the tree after acceptance as development history. Interview-skipped and bypassed states, and the disagreement check before Master Narrative drafting or acceptance (Ratification R10), appear on the phase pages and in the Outline status, never as modals. Master Narrative acceptance is a commitment point that offers a default lock (Ratification, #63 item 3). |
| **World Definition** (#59) | One centre surface opened from the Outline under World, deferrable, with no gate in front of production. A scene needing a missing entity or view shows it quietly in the scene workspace and links to World Definition; it does not block (readiness explains and never gates, R5). Bulk coverage generation uses the batch spend rule. |
| **Scene hub and shot planning** (#60) | The "scene hub" is now **two centre views plus the Outline**: the **Board** (all shots, all scenes, batch scope selection) and the **scene workspace** (shot list and the main shot-making area). Design the accept-the-draft path as scope-then-invoke on board rows and the Outline, and the precise path as the shot work area in the centre. **Do not design a drawer-based shot editor**: the Peek is preview only. Define what the Board marks show, the batch-draft interaction that does not clobber edited shots, runtime awareness in the top strip and scene header, and reorder, split and merge in the scene workspace. 150–250 shots are handled by the Board and the scene-only Outline expansion above. |
| **Composition and previs entry** (#61) | Previs, storyboard and shot-list imports attach to shots in the scene workspace (Direction is optional and available, never a required step) and may also be offered from Input for bulk routing to Scenes & Shots. They add no new top-level section. **CineBlock** is a module of Aiuteur that opens in its own tab under the same account from the scene workspace at frame generation (Record 2 D61); see [`SHOT-PLANNING-INPUTS.md`](../domain/SHOT-PLANNING-INPUTS.md). |
| **Candidate review and playback** (#62) | Frames and takes are reviewed in the centre of the scene workspace for a shot, not in the Peek. Sequence playback is the Review & Export centre view and is reachable for one scene from the scene workspace; "jump to the shot" from playback lands in the scene workspace on that shot and can return. Progress and failure state come from the same derivations as the Board. Cost appears at the initiating control; the Peek never initiates spend. Detail: [`CANDIDATE-REVIEW-AND-PLAYBACK.md`](CANDIDATE-REVIEW-AND-PLAYBACK.md). |
| **Trust signals and locks** (#63) | Flags are whispers in the Outline, Board and workspace (M1). The on-demand review-all tray is cross-cutting; its entry is the quiet footer line already specified in `docs/ux/TRUST-SIGNALS-AND-LOCKS.md`. The Interview Ledger (`docs/ux/INTAKE-AND-INTERVIEW.md`) lives beside the Interview conversation. Lock indicators sit on the scope they lock and do not interrupt navigation. |
| **Intake and Interview** (#57) | The first-run path is the normal Input phase (§7). Input must show how each item was understood and propose the entry point; the routing lives there, with no router screen before it. |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)) and **persistence** (#72) | Status, progress, runtime totals, needs-attention filters and out-of-date markers shown by the shell are derived reads of server truth. The Board needs a whole-project, shot-level summary read that is cheap at 250 shots, and Outline/Board status must not depend on loading each shot's full record. |

## Record 2 amendments

- The Outline gains **Ad-hoc shots** (intentionally created shots outside the narrative; SHOT-MODEL) and **Removed from Story** (retired scenes that keep work; SCENE-IDENTITY).
- The whole-film overview is to be redesigned from the V1 Script Hub (scene cards with number and slug, status, last approved end-frame thumbnail, asset dependencies, Master Narrative excerpt). The earlier Board renditions are rejected and #60 is open for the redo.
- CineBlock is a module of Aiuteur that opens in its own tab or window under the same account and session (D61).
- Prototypes are structural sketches only; V1 is the visual and interaction reference (Record 2 section 3.1, X10).
