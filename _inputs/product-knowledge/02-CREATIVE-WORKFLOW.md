# 02 End-to-End Creative Workflow

> Scope: how a filmmaker moves from idea or source material through the 12-stage pipeline to finished scenes and export: stage order, handoffs, gates, skip paths, shortcuts and workflow variants. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Stage map

| Stage | Purpose | Takes in | Hands off | Gate / exit |
|---|---|---|---|---|
| **Phase A: Global Narrative & Style Engine** (linear, project-wide, run once) | | | | |
| 1 Input | Configure project, supply source | Idea text or files, input mode, length, rating, genre, tone, optional writing style | Initialized narrative state, frozen project config | Never skippable; config freezes when Stage 2 starts |
| 2 Treatment | Explore the story as prose | Stage 1 input | One selected, edited treatment | Accept a version; skippable |
| 3 Beat Sheet | Structural lock | Selected treatment | Confirmed beats | Confirm Beat Sheet (critical lock); skippable |
| 4 Master Script | Authoritative narrative blueprint | Confirmed beats (or imported script) | Approved screenplay split into scenes with expected characters, location, props | Approve = Phase A to B transition; skippable only by import |
| 5 Global Assets & Style | Global visual truth | Script, scene dependencies, style capsule | Locked style plus master assets with image keys (global context) | Every active asset has an image key; never skippable |
| **Phase B: Production Engine** (repeated per scene) | | | | |
| 6 Script Hub | Pick a scene | Scene list, status, continuity warnings | Selected scene | No lock; navigation only |
| 7 Shot List | Define what happens, as timed shots | Global context, scene content and beats, previous scene end state | Locked shot list | Lock with validation; covers scene duration |
| 8 Visual Definition | Scene start-state visuals | Locked shots, master assets, prior scene instances | Scene asset states and visual references | Every scene asset has a usable reference |
| 9 Prompt Segmentation | Inspect model inputs | Shots, scene assets, references | Frame and video prompts, per-shot reference set | Review only; no generation |
| 10 Frames | Anchor start (and optional end) frames | Prompts, references | Approved anchor frames | All frames approved; no blocking continuity issue |
| 11 Confirmation | Checkout before expensive compute | Shots, frames, prompts, cost estimate | Queued video jobs | Confirm cost |
| 12 Video Review | Evaluate the scene | Rendered clips | Completed scene, or a routed fix | Complete Scene returns to hub; end state seeds next scene |
| Wrap / Export | Leave the app | Completed scenes | Video and project artifacts | Undefined |

## Pipeline shape

- **WD-IDEA-FLOW-001** [impl] Twelve fixed stages in two phases: Phase A, the Global Narrative & Style Engine (Stages 1-5: input, treatment, beat sheet, master script, global assets and style), linear and project-wide; Phase B, the Production Engine (Stage 6 Script Hub plus scene-specific Stages 7-12: shot list, visual definition, prompt segmentation, frames, confirmation, video review), run scene by scene.
- **WD-IDEA-FLOW-002** [idea] Phase A in brief: pick a style with the narrative input, generate a treatment, atomize it into beats, format the script, extract assets with visual keys; the style is then locked and every output becomes immutable global context. ‹src: architecture-and-rules›
- **WD-IDEA-FLOW-004** [idea] Phase B in brief: break the script into scenes, generate a shot list, inherit assets, merge shot data and assets into provider prompts, generate anchor frames with continuity validation, generate video clips, then the user reviews and approves or iterates.
- **WD-IDEA-FLOW-005** [impl] One account of production-stage roles: Stage 9 writes an image prompt and a video prompt per shot, Stage 10 generates frames, Stage 11 generates video, Stage 12 reviews video with batch render and routes issues back upstream. Most accounts instead make Stage 11 a cost checkpoint and put generation plus review in Stage 12 (see WD-IDEA-FLOW-058). ‹src: master-mvp-tasklist›
- **WD-IDEA-FLOW-006** [idea] Separation of concerns: "global context" means the project-wide constraints of Stages 1-5, "narrative structure" means beat sheet and script (Stages 3-4), "scene-local context" means shot-specific data (Stages 6-12). ‹src: database-schema-state-transition-matrix›
- **WD-IDEA-FLOW-007** [idea] Iteration cost rises through Phase A: treatment and beat iteration is expected and lightweight; once a script exists, changes cost more and more downstream.
- **WD-IDEA-FLOW-008** [planned] Crisp stage boundaries: each stage owns one kind of decision, and full editing surfaces are not duplicated across stages (e.g. shot list, visual definition and prompts must not all become location editors, or the product feels fragmented). Phase B is controlled translation, not creative exploration, and each stage's agentic tooling is scoped strictly to its one question. ‹src: project-overview›
- **WD-IDEA-FLOW-009** [future] The pipeline is built to accept added stages, e.g. a Stage 13 "Audio Mixing" (see 09). ‹src: database-schema-state-transition-matrix›

### Options: how to group the stages

The dominant grouping is the Phase A/B split (WD-IDEA-FLOW-001).

- **WD-IDEA-FLOW-010** [alt] Group by authority in four tiers: Global Intent (1-3: narrative intent, tonal constraints, visual philosophy, high-level pacing); Narrative Structure (4-6: master script, beat sheets, act-level pacing); Scene & Shot Specialization (7-10: shot lists, scene visual descriptions, character blocking and emphasis); Media Realization (11-12: image and video prompts, render jobs). Its stage numbers disagree with the canonical list (see WD-IDEA-FLOW-001). ‹src: inheritance_contract›

## Entry, navigation and wrap

- **WD-IDEA-FLOW-011** [idea] Entry is a project dashboard: view projects and their progress, resume one, or start a new project through an input mode (intake detail in 02B).
- **WD-IDEA-FLOW-012** [idea] Global tools (style capsule library, asset library, version history, artifact vault) sit in persistent navigation and are never required to move through the pipeline.
- **WD-IDEA-FLOW-013** [impl, planned] Reopening or refreshing a project lands on the exact stage last worked on, never auto-advanced one ahead or behind. This covers partially finished stages, locked stages and production-cycle scenes. The saved position is checked against real status: an unreachable Phase A stage redirects to the furthest allowed stage, a scene stage with no scene falls back to the shot list, and scene progress is rebuilt from actual lock state.
- **WD-IDEA-FLOW-014** [idea] Project wrap/export follows completion; its mechanics are left open on purpose: downloadable video, structured project artifacts, formats for external editing or delivery (see 09). A detailed Project Wrap spec (editor-ready package, NLE timeline descriptors, manifest, checksums, README) is recorded in WD-IDEA-AV-065 to AV-076; this bullet does not decide its status. ‹src: user-flow›

## Phase A: handoffs and gates

Story stages are detailed in 05, assets and style in 06; this section covers only what passes between stages and what blocks progress.

- **WD-IDEA-FLOW-015** [impl] Stage 1 offers four input modes (Expansion, Condensation, Transformation, Script Skip) plus project parameters; detail in 02B. ‹src: user-flow, current-app-user-flow›
- **WD-IDEA-FLOW-017** [idea] The user picks one treatment variant and iterates on it; only that variant's prose flows into beat extraction.
- **WD-IDEA-FLOW-018** [idea] Beat sheet confirmation is the primary structural lock: no script is generated until beats are confirmed.
- **WD-IDEA-FLOW-019** [idea] Master script approval freezes the narrative as the single source of truth for Phase B and must precede asset extraction.
- **WD-IDEA-FLOW-021** [impl] Approving Stage 4 is the Phase A to B transition: the script is split into scenes deterministically (no AI), each with a stable identity, and those scenes become Phase B's production units. Each scene keeps its heading and its own script excerpt.
- **WD-IDEA-FLOW-022** [planned] Scenes are saved at script approval already populated with their expected characters, location and props, so Stage 5 extraction and later scene stages read ready dependencies instead of re-detecting them; manual additions stay possible (see 05, 06). The pre-approval preview of extracted scenes is WD-IDEA-STORY-050.
- **WD-IDEA-FLOW-023** [impl] Stage 5 opens with a visual style lock (style capsule or manual visual tone); asset extraction and image generation stay unavailable until the style is locked (see 06). The locked style is a global constraint for all later image and video generation; example styles include Neo-Noir, Pixar Animation, and Hyper-realistic VFX.
- **WD-IDEA-FLOW-024** [impl] Stage 5 gate into Phase B: a visual style is selected, at least one asset is active, and every active (required) master asset has a confirmed image key; confirmation soft-locks assets and locks style for production (see WD-IDEA-FLOW-025).
- **WD-IDEA-FLOW-025** [impl] Stage 5 ends with a "Finalize Assets" action (not "Lock All Assets and Proceed", so users do not expect rendering to start; see WD-IDEA-ASSET-110) that moves the user on to the Script Hub, with a visible transition state. Stage 5 assets use a soft lock and stay editable (WD-IDEA-UX-036); each project asset can also be locked individually during Stage 5.
- **WD-IDEA-FLOW-026** [impl] Location views are built mainly at Stage 5 but are not a gate: the user may define all views, only an establishing shot, or none; Stage 7 infers placeholder directions when none exist and views can be added later from Stage 8, so skipping view setup never dead-ends (see 06B).
- **WD-IDEA-FLOW-027** [idea] Pipeline-wide quality gates: valid image keys for all assets before Phase B; shot list covers the full scene duration before approval; continuity issues resolved at checkout; final video meets technical specs. This is the strict form: continuity warnings are advisory first, and strict enforcement is optional for advanced continuity or high-value projects (WD-IDEA-LOC-226); a hard checkout gate is only the alternative in WD-IDEA-UX-305. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-FLOW-028** [idea] Edit scope: Phase A edits trigger global invalidation (every downstream stage is marked outdated, never deleted); a new branch is forced only when the master script is regenerated from edited beats (WD-IDEA-UX-077), while other Phase A edits stay on the current branch with a soft branch suggestion (WD-IDEA-UX-079). Phase B edits invalidate the current scene and, for continuity-breaking changes, later scenes (WD-IDEA-UX-045).

### Options: how strict is stage order
- **WD-IDEA-FLOW-029** [alt, impl] Strict order: a stage cannot start or lock until its predecessor is locked (or invalidated); any reached stage can be revisited, pending (unreached) stages cannot be clicked, and later scene stages stay locked until earlier ones finish.
- **WD-IDEA-FLOW-030** [alt, planned] Flexible order: strict chains ("Stage 2 can't lock until Stage 1 is locked") create dead ends; allow some freedom in lock order, give actionable errors, auto-resolve simple lock chains, and remove the sequential-lock error messages. Conflicts with the sequential-locking clause in WD-IDEA-FLOW-072 (Streamline keeps sequential locking); this alternative stays open.

- **WD-IDEA-FLOW-031** [planned] Whatever the order rule, prerequisites hold for every transition, imported content included: a later stage (e.g. an imported, locked Stage 4) cannot be committed while earlier stages are still pending, so downstream stages never look ready with incomplete inherited context. Enforcement must not depend on client-side routing alone. ‹src: streamline-implementation-findings›

## Phase B: Script Hub and the scene cycle

Loop: pick a scene in the hub, run Stages 7-12, Complete Scene, back to the hub; the finished scene's end state seeds the next scene.

- **WD-IDEA-FLOW-032** [idea,voice] Phase B is a repeated per-scene cycle entered from the hub and resumable later; when a scene completes, its end state is saved and passed to the next scene as its "previous scene" (see 04).
- **WD-IDEA-FLOW-033** [idea] Scene order is free: work scenes in sequence, skip ahead, return to earlier ones, or branch before a high-impact change.
- **WD-IDEA-FLOW-034** [voice,impl] The Script Hub is a navigation and overview hub with no lock state and no Unlock & Edit; it lists every scene with its status (refreshed periodically) and is the entry into scene production. ‹src: describing-ideal-locking-behavior›
- **WD-IDEA-FLOW-035** [impl] Hub actions per scene: open its pipeline, jump to a specific stage, defer or restore it, review its finished video.
- **WD-IDEA-FLOW-036** [idea] Expected hub content: each scene's slug and summary; no dependency warnings on first scenes; continuity warnings on later scenes tied to earlier scenes' end states; for audio-driven projects, each scene's audio timestamps and transcript. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-FLOW-037** [voice, alt] Revamp the hub, where nothing is edited, with tabs that show the "master ULTRA detailed script". ‹src: post-tickets›
- **WD-IDEA-FLOW-038** [impl] Entering a scene resumes at its first stage that is neither locked nor outdated, or at video review if everything is done.
- **WD-IDEA-FLOW-039** [voice, impl] Free re-entry: returning from the hub to a scene finished through Stage 11, the user jumps straight to any completed stage from the stage sidebar (read-only browsing) without re-locking 7, 8, 9 one by one or waiting on no-op saves; nobody is forced to unlock and re-lock just to pass through finished stages. Return resumes at the last position (see WD-IDEA-FLOW-013). ‹src: master-mvp-tasklist, describing-ideal-locking-behavior›
- **WD-IDEA-FLOW-040** [impl,planned] Scene deferral: a scene can be sidelined in the hub (greyed out, ignored as if deleted) while its data is kept and it can be restored; deleting a scene's last shot offers this instead (see 07).
- **WD-IDEA-FLOW-041** [impl] Batch operations skip deferred scenes.
- **WD-IDEA-FLOW-042** [voice] Runtime control: the project's target length is respected (a 2-3 minute project producing 6 scenes of 6-10 eight-second shots is unwanted); an on-screen counter shows how far the project is ballooning, and the user may still extend on purpose when the story needs it. ‹src: new-tasks›

### Options: tracking scene progress
- **WD-IDEA-FLOW-043** [alt, impl] Explicit scene lifecycle: draft (shot list) → shot list ready (visual definition) → frames locked (frames) → video complete (done), with side states outdated and continuity broken. Scene status labels include "shot list ready" and "shot list locked".
- **WD-IDEA-FLOW-044** [alt] Derived progress: infer a scene's position from which artifacts exist (shots exist = shot list stage or later, frames exist = frame stage or later, videos exist = final stage). ‹src: project-cards-in-dashboard-Ui-issue›

### Options: when a project counts as "in production"
- **WD-IDEA-FLOW-045** [voice,planned] Requirement: a project is "in production" only once Stage 5 has been locked at least once. Existing scenes are not a valid signal, because scenes are created at Stage 4; a project still on Stage 5 shows "Stage 5 of 5". ‹src: project-cards-in-dashboard-Ui-issue›
- **WD-IDEA-FLOW-046** [alt] Signal (a): Stage 5 has ever been locked (recommended; survives later stages becoming outdated).
- **WD-IDEA-FLOW-047** [alt] Signal (b): any Stage 6+ activity, or any scene past draft.
- **WD-IDEA-FLOW-048** [alt] Signal (c): a one-time project-level "entered production at" timestamp set when Stage 5 is first locked.
- **WD-IDEA-FLOW-049** [rejected] Requiring all five Phase A stages to be currently locked was dropped: re-editing an upstream stage marks downstream stages outdated, which would hide real production progress.

## Phase B: handoffs and gates

Shot detail lives in 07, scene assets in 06, generation in 08.

- **WD-IDEA-FLOW-050** [idea] Stage 7 for Scene N receives the global context, Scene N's content and the beats it covers, and Scene N-1's end state.
- **WD-IDEA-FLOW-051** [idea] The shot list is locked before scene asset work (Stage 8) begins.
- **WD-IDEA-FLOW-052** [impl] Stage 8 never opens on a blocking "No Assets Defined Yet" screen: scene assets auto-populate on entry because dependencies are known from the script and master assets are locked at Stage 5 (Scene 1 bootstraps from locked project assets matched by name). Stage 8 auto-populates once per scene entry with a "Populating assets..." indicator; a genuinely empty scene shows the normal layout with an empty list and add actions.

### Options: what Stage 8 requires before moving on
- **WD-IDEA-FLOW-053** [alt,impl] Every scene asset needs a visual reference; the block message says how many are missing.
- **WD-IDEA-FLOW-054** [alt, planned] No scene image is required per asset; assets may proceed on their master reference alone.
- **WD-IDEA-FLOW-055** [alt,planned] Tiered: primary characters must be generated, secondary props and locations may use master references, non-critical assets get "Generate Later", and the user can override to force generation (fallback order and proceed-anyway handling in 06).

- **WD-IDEA-FLOW-056** [idea] The user reviews and edits the full prompt set (frame prompts and video prompts) before any frame is generated; Stage 9 itself generates nothing.
- **WD-IDEA-FLOW-057** [impl] Stage 10 gate: every frame approved and no strict continuity check blocking (start-frame-only projects skip end frames; see 08).
- **WD-IDEA-FLOW-058** [impl] Stage 11 is a checkpoint, not an iteration stage: the user confirms the scene and its cost before video generation; Stage 12 is where the final video is reviewed. Checkout shows shot cards with frame and prompt status (start and end frame pairs, final prompts), warnings (unapproved frames, mismatch with the prior scene, dependency warnings), and the render model variant with a cost breakdown and total credits; it has no agentic tooling. The user can expand shot details or return to frames before confirming; confirming queues one video job per shot (see WD-IDEA-UX-302).
- **WD-IDEA-FLOW-059** [idea] Stage 12 resolves a scene one of three ways:
  - Complete Scene is terminal: it marks the scene video-complete, a final status that invalidates nothing, and returns to the hub; if some jobs failed it still completes, with a warning.
  - Minor visual issue: back to frames, regenerate anchors, re-queue video (credits charged again).
  - Major narrative or audio issue: back to the shot list, which invalidates that scene's Stage 8-12 work and may cascade through assets, prompts and frames.

## Correction loops

- **WD-IDEA-FLOW-060** [idea] Downstream correction: e.g. after spotting dialogue-timing problems in Scene 3's video review, the user returns to that scene's shot list, makes targeted edits and re-runs Stages 8-12; later scenes are flagged as possibly outdated but not blocked. The general non-blocking rule for outdated scenes is WD-IDEA-UX-057. ‹src: user-flow›
- **WD-IDEA-FLOW-061** [idea] After a shot-list edit, downstream AI steps re-run in order: asset relevance, then scene visual states (only where descriptions changed), then frame prompts; the user then regenerates frames.
- **WD-IDEA-FLOW-062** [impl] Script-mistake repair: mid-production, the user returns to Phase A, unlocks the master script, sees the downstream warning, edits and re-approves, then repairs affected scene stages from the hub. Re-splitting tries to keep stable scene identities; removed scenes become continuity-broken. Stable scene identity on re-approval and continuity-broken removed scenes are detailed in WD-IDEA-CONT-238. ‹src: current-app-user-flow›
- **WD-IDEA-FLOW-063** [impl, planned] Repair links route back to the stage that owns the fix: when continuity is weak or missing, Stage 9 offers "Repair in Stage 8" / "Back to Coverage"; shot-list location warnings link to coverage repair, whose repair set is WD-IDEA-LOC-212; frame promotion links back into advanced continuity context.

## Continuity ownership across production stages

Location and continuity mechanics live in 06B and 04; this is the per-stage division of labor.

- **WD-IDEA-FLOW-064** [planned] Stage ownership map: Stage 7 confirms basic shot-to-location truth (lightweight review); Stage 8 diagnoses and repairs advanced spatial coverage; Stage 9 shows which references the generator will use (transparency, not editing); Stage 10 is where continuity is reused, edited and strengthened over time. Heavy editing UI is not duplicated across stages; each stage owns one kind of decision (see WD-IDEA-FLOW-008). Per-stage detail: Stage 7 in WD-IDEA-UX-185, Stage 8 in WD-IDEA-UX-199, Stage 9 in WD-IDEA-UX-217, Stage 10 in WD-IDEA-UX-232 and WD-IDEA-CONT-210.
- **WD-IDEA-FLOW-065** [planned,voice] Stage 10 graduates from a generation endpoint to the main creative control and continuity workspace: earlier stages get things generally right, and in Stage 10 the user approves frames, establishes frames as views, reuses frames from earlier or later shots as edit bases, and curates continuity across shots. Detail: WD-IDEA-UX-232 and WD-IDEA-CONT-210 (continuity-workspace framing). ‹src: post-clean-location-rethink, 5-1-location-system-intent-source›

## Script revision mid-production

- **WD-IDEA-FLOW-067** [future] Script revision reconciliation: push a second draft without losing Stage 7-12 work. Diff old and new script, flag changed scenes, keep untouched scenes, and mark only changed scenes for Stage 7 re-entry: a controlled update, not a fork. Open question: WD-IDEA-CONT-243 and WD-IDEA-CONT-244 treat revision reconciliation as branch work (fork versus mutate); WD-IDEA-UX-077 mandates a branch for beat-driven regeneration. ‹src: streamline-master-plan-8-1, streamline-plan-critique-8-1›
- **WD-IDEA-FLOW-068** [future] Revision staleness has a different shape from the usual forward cascade: a scattered, non-contiguous set of scenes across Stages 7-12 goes stale at once. Its deliberate re-sync must be reconciled with backfill's no-re-sync stance (WD-IDEA-FLOW-089).

### Options: where a script revision lands
- **WD-IDEA-FLOW-069** [alt,future] Fork a new branch at the revision point: preserves the pre-revision state, but leaves two branches to reconcile. Revision reconciliation is structurally branch work: forking a new branch and mutating the active branch (WD-IDEA-FLOW-070) are the two ways to do it.
- **WD-IDEA-FLOW-070** [alt,future] Mutate the active branch in place: cleaner mental model, but needs a rollback story.

## Variant: Streamline and script skip

Intake mechanics (classification, upload, clarifying questions, review, commit) live in 02B. Flow-level rules follow.

- **WD-IDEA-FLOW-072** [planned] Streamline feeds the pipeline rather than replacing it: the 12 stages, the Phase A/B split, stage locking and per-stage tools stay; it only lets users arrive at the right point with more work done. Stage locking stays sequential; the flexible-order alternative remains open (see WD-IDEA-FLOW-030).
- **WD-IDEA-FLOW-074** [planned] Land the user as far into the pipeline as their material earns, with everything upstream clearly marked rather than silently absent; detected inputs map to stage artifacts, and upstream stages are skipped or marked when a later artifact is supplied. Upstream stages read as deliberately skipped, never as incomplete or broken (see WD-IDEA-FLOW-078). ‹src: streamline-master-plan-8-1›
  - A finished script lands at Stage 4 for review.
  - A treatment fragment may land at Stage 3 with Stage 2 auto-filled from it.
- **WD-IDEA-FLOW-075** [planned,voice] Power-user path: a user with a script goes straight to Stage 4 or beyond (not wrongly into Stage 2); importing a script routes to Stage 4 with Stages 2 and 3 marked skipped (not "incomplete"), and context still flows downstream across the skipped stages.
- **WD-IDEA-FLOW-076** [planned] Fixing skip routing may be merged with structured document identification and routing, since structured upload builds on skip routing (see 02B).
- **WD-IDEA-FLOW-077** [planned] Only Stages 2, 3 and 4 are skippable. Stage 1 never is, even via Streamline, because it configures the project (mode, rating, genre, target length); Streamline is a Stage 1 input mode, not a replacement for Stage 1. Stage 5 (assets) is never skipped in any scenario. ‹src: streamline-plan-critique-8-1›
- **WD-IDEA-FLOW-078** [planned] "Skipped" is a real stage state, distinct from not-started, draft and locked: a terminal, intended outcome, not a hole. It counts as passed for gating (a stage may lock if its predecessor is locked or skipped).
- **WD-IDEA-FLOW-079** [planned] The user's current stage is the first Phase A stage not yet passed (locked or skipped); when all five are passed they land on the Script Hub.
- **WD-IDEA-FLOW-080** [planned] A stage can become skipped only from not-started; skipping over existing approved content is refused and the user must unlock it explicitly first. Skip is never a way to discard content.
- **WD-IDEA-FLOW-081** [planned,future] Skip is a Phase A concept only, never applied to scene Stages 7-12; contextual intake straight into scene stages might later need scene-level skipping, which needs its own analysis.

### Options: how a skip is recorded
- **WD-IDEA-FLOW-082** [alt, planned] Chosen: a skipped stage is a normal stage version with empty content. Nothing downstream may read real data from a skipped stage; it may only read whatever a later backfill replaces it with. ‹src: streamline-plan-critique-8-1›
- **WD-IDEA-FLOW-083** [alt,rejected] Record skipped stages as project/branch metadata: avoids empty-content confusion but forks the progression logic.

### Options: how skipped stages behave
- **WD-IDEA-FLOW-084** [alt,voice] Locked and not enterable, with a "SKIPPED" badge or overlay showing they were bypassed on purpose (the creator's stated choice). ‹src: planning-wif-lawrence, Input-Methods-Task›
- **WD-IDEA-FLOW-085** [alt,voice] Marked "optional" rather than locked, enterable so the user can add content manually later.
- **WD-IDEA-FLOW-086** [alt,voice] Auto-populate backwards: reverse-generate treatment and beat sheet from the script (AI back-fill, costs credits) for a complete pipeline the user can review and edit.
- **WD-IDEA-FLOW-087** [alt, planned] Enterable in a third view mode, a read-only placeholder ("This stage was skipped") distinct from both the editor and the locked view, offering "Write this myself" (back to an empty editable draft, no credits) or "Generate from script" / "Generate this now" (AI backfill straight to locked, spends credits). The AI backfill result is marked AI-generated (see WD-IDEA-UX-107). ‹src: streamline-plan-critique-8-1, streamline-implementation-spec-8-3›

- **WD-IDEA-FLOW-088** [planned] Backfill is optional and never automatic: a user who skipped Treatment and Beat Sheet may later ask for them to be reverse-generated from the script (for documentation, later editing, or before branching); nothing runs or spends credits without an explicit request.
- **WD-IDEA-FLOW-089** [planned] Backfilled content has no live dependency on the script: later script edits never mark it outdated or re-sync it; drift is an accepted limitation because staleness only flows forward. Each backfilled item carries a static note: "Generated from script on [date], won't update automatically if the script changes later" (see WD-IDEA-UX-111). ‹src: streamline-plan-critique-8-1, streamline-implementation-spec-8-3›

## Variant: storyboard-driven production

- **WD-IDEA-FLOW-090** [voice, future, alt] The user uploads a storyboard (even rough "shitty-quick" sketches) as a Stage 1 input, plus written material, and the system builds the plot around the storyboard. ‹src: Issues, truly strech›
- **WD-IDEA-FLOW-091** [voice,future] Storyboard panels labeled like 1A, 1B, 1C, 2A are matched to the same labels in the script or outline, aligning each panel with the moment it depicts. ‹src: Issues›
- **WD-IDEA-FLOW-092** [voice,future] In this mode Stages 2-4 are bypassed, and scene breakdown and shot list (Stages 6-7) distill and categorize rather than invent.

## Variant: "Super Spec'd Out" intake

Held with their owning topic in other documents: WD-IDEA-INPUT-054 (see 02B).


## Variant: YOLO / auto-pipeline

- **WD-IDEA-FLOW-094** [voice,future] YOLO ("speed racer") mode: the user submits their material (script, recorded audio lines, and storyboard and frame stills if available) as in Streamline; the system then moves through the pipeline end to end like an agent from that bundle, keeping characters consistent (fill-in scaling: WD-IDEA-INPUT-041). ‹src: Yolo-mode›
- **WD-IDEA-FLOW-095** [voice,future] YOLO accepts whatever partial production material exists (script, recorded audio lines, storyboard, self-generated frame stills, "look of the film" stills, provided sound) and fills in around it. ‹src: Yolo-mode›
- **WD-IDEA-FLOW-097** [future] YOLO is a later automation layer on top of Streamline: Streamline builds the scaffold and routes to review checkpoints; YOLO auto-advances through those checkpoints with fewer interruptions, and only after Streamline is proven.

## Other workflow variants

- **WD-IDEA-FLOW-099** [future] Quick Mode vs Control Mode: Control Mode is the primary focus; Quick Mode gets later polish (grid view, bulk actions, flow refinements). Related: WD-IDEA-GEN-189 presents Quick Mode as an explicit frame-generation mode choice; status is open. ‹src: truly strech›
- **WD-IDEA-FLOW-100** [voice,future] Provider-tailored pipeline: when targeting Sora or another video model, the UI, prompting and context adapt to how that model generates video (see 08). The start-only path for Sora-style models is WD-IDEA-SHOT-029. ‹src: Totally-New-Features›
- **WD-IDEA-FLOW-101** [future] Audio-first projects: visuals generated to match a transcript or narration timeline, with the script secondary to audio cadence. This inverts the pipeline and is a fundamentally different product mode (see 09).
- **WD-IDEA-FLOW-102** [idea] Scenario playbooks as structural templates:
  - 30-second brand montage: 5-6 shots, product and talent references, licensed music and VO replacing native audio.
  - Vertical social teaser: 3-4 shots of 4-6 s, strong subject isolation, punchy actions, text-safe zones for captions.
  - Short narrative with continuity: 4 shots (establishing, action, reaction, resolve), identical character blocks, first/last-frame handoffs, character and setting references.
  ‹src: Frame_Video_Prompt_Format_Guide›

## Variant: 3D blocking studio (CineBlock) in the flow

Blocking itself is covered in 07; this is where it plugs into the pipeline.

- **WD-IDEA-FLOW-103** [planned] The studio is optional and non-blocking: users can skip it and go to frame generation as before; when used, it adds a spatial reference layer without replacing existing stage logic. ‹src: prd-1›
- **WD-IDEA-FLOW-104** [impl] Inside the studio the flow is three linear views, Setup (inputs) → Studio (3D blocking) → Results (review/export), with back-navigation allowed at any point.

### Options: where the studio sits
- **WD-IDEA-FLOW-105** [alt, planned] A dedicated step between visual definition (Stage 8) and prompts/frames (Stages 9-10), so frame prompts carry spatial references. The dedicated step is entered per location. ‹src: prd-1›
- **WD-IDEA-FLOW-106** [alt,planned] A full-screen modal launched from frame generation (Stage 10) for the selected shot, refreshing the scene's frames on close. ‹src: prd-revised›

### Options: when the studio unlocks
- **WD-IDEA-FLOW-107** [alt] Per scene, after Stage 8 completes for that scene. ‹src: prd-1›
- **WD-IDEA-FLOW-108** [alt] Globally, after Stage 5 once asset extraction has run. ‹src: prd-1›

### Options: how the studio integrates
- **WD-IDEA-FLOW-109** [alt] Embed it as a separate app that receives credentials and posts its export back. ‹src: CineBlock-system-overview›
- **WD-IDEA-FLOW-110** [alt] Extract it as modules whose views the host app mounts and navigates. ‹src: CineBlock-system-overview›
- **WD-IDEA-FLOW-111** [alt] Treat it as a black box whose structured per-shot export is the contract, with hero frames used as image references for generation (recommended). ‹src: CineBlock-system-overview›

## Proposed restructurings of the stage order

### Options: closing the "scripts are insufficient for production" gap (Master Document)
- **WD-IDEA-FLOW-112** [future,voice] The Master Document: turn the screenplay into a super-descriptive production document that becomes the source of truth for every later stage, describing every scene and every moment of change (dialogue moments included) with full character, wardrobe, prop and setting descriptions (e.g. Persephone's appearance, glow, smile, tunic, flower crown, berry basket and the forest setting all spelled out). Legacy framing marks it rejected as an MVP path; the chosen path is deferral past MVP (WD-IDEA-FLOW-117), not rejection of the idea. ‹src: Tickets, injecting-org-tickets-into-plan›
- **WD-IDEA-FLOW-113** [future] Its generation: finalize the master script, check inputs for character, asset, location and action descriptions, then generate the master document from the base script. ‹src: Tickets›
- **WD-IDEA-FLOW-114** [alt] Option 1: insert it as a new stage between Script (4) and Assets (5) and renumber later stages.
- **WD-IDEA-FLOW-115** [alt] Option 2: replace Stage 4 so the script stage outputs a master document instead of a screenplay; no renumbering.
- **WD-IDEA-FLOW-116** [alt] Option 3: Stage 4 outputs both a screenplay for the human to read and an enriched master document for the AI to consume downstream.
- **WD-IDEA-FLOW-117** [alt,voice] Option 4 (chosen): defer the Master Document past MVP and keep 12 stages, with the master script still the source of truth.
- **WD-IDEA-FLOW-118** [planned] What covers the gap meanwhile: structured shot prompts plus per-scene adaptive asset descriptions. ‹src: master-mvp-tasklist›

### Options: other reorderings
- **WD-IDEA-FLOW-119** [alt, voice, future] Merge Treatment (2) and Beat Sheet (3) into one split-screen stage so they inform each other. Concern: a beat edit made without the treatment could confuse script generation. The creator deferred the decision: fix both stages' bugs and don't merge for now.
- **WD-IDEA-FLOW-120** [alt, voice] Move the source of truth after asset definition: the user defines all assets first (upload or generate images, edit descriptions, or derive descriptions from images), then the master script is written from those asset descriptions to produce a meticulous master document. Also: a hidden, backend-only master descriptive document generated after assets exist, only if needed. ‹src: post-tickets, new-tasks›
- **WD-IDEA-FLOW-121** [alt,voice] Swap visual definition (8) and prompt segmentation (9) so shot-by-shot prompts exist before scene assets are edited; the creator notes the two depend on each other, which makes the order hard to settle. ‹src: post-tickets›

### Options: which stage decides sub-locations
- **WD-IDEA-FLOW-122** [alt,voice] In the script itself, so later stages inherit sub-location precision (the creator's lean, with Stage 4). Related: WD-IDEA-LOC-069 (06B), which lists script or dependency extraction. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-FLOW-123** [alt,voice] At dependency extraction on script approval (Stage 4), so Stage 5 knows exactly which sub-location establishing shots and recommended (not required) direction views to make. Related: WD-IDEA-LOC-069 (06B). ‹src: 3.7-location-pre-planning›
- **WD-IDEA-FLOW-124** [alt] At shot-list generation (Stage 7), the option selected in the questionnaire; the creator also felt Stage 7 may need to make these distinctions. ‹src: 3.7-location-pre-planning›

## Sequencing principles

How the legacy roadmaps ordered the work; each reveals a product priority.

- **WD-IDEA-FLOW-125** [planned,voice] Remove the biggest friction first, and make each phase deliver something a user can feel on its own.
  - Overall roadmap: unblock progress (bugs, locking, navigation), then overhaul assets, then smarter production stages, then continuity and versioning, then polish; deferred nice-to-haves last.
  - Streamline: real script skip, then intake foundation, then smart routing, then Ask Auteur, then reach features.
  ‹src: injecting-org-tickets-into-plan, streamline-master-plan-8-1›
- **WD-IDEA-FLOW-126** [planned] Production roadmap order after the asset system: prompt engineering (Stage 9), frame generation (10), cost management (11), video generation (12), version control/branching UI, then polish, performance and export. ‹src: development-progress›
- **WD-IDEA-FLOW-127** [idea] Streamline MVP as a pyramid where each level stands alone: (1) structured upload panel, (2) routing to Stages 2-5, (3) script skip that really works, (4) clarifying questions, (5) review before commit.

### Options: Streamline build order
- **WD-IDEA-FLOW-128** [alt] Infrastructure first: intake data model and file storage, extraction/classification, route planner, real script skip, review UI, clarification, image routing, audio, storyboard routing, per-shot assignment from blocking. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-FLOW-129** [alt] Visible value first: real script skip (plus a prominent Import Script entry on Stage 1 and the dashboard), then upload panel with review, credit estimate and partial success, then classification, routing and image routing, then clarification, conflict UI and streaming, then reach features. ‹src: streamlined-input-analysis-5-10, streamline-implementation-spec-8-3›

- **WD-IDEA-FLOW-130** [future] Post-MVP Streamline candidates: storyboard-driven mode, audio transcription and dialogue import, voice sample mapping, blocking-package import, per-shot asset assignment from storyboard or blocking, an "organize my notes" assistant, YOLO, lore library, creative DNA, film sample/reference deconstruction, live-action hybrid intake, remix, collaborative intake (see 02B).
- **WD-IDEA-FLOW-132** [voice,planned] Fix the chain before amplifying it: asset reference inheritance first (better prompts are pointless if references never reach the generator), then richer shot-list descriptions, then structured prompts and limits; location multi-angle, non-adjacent continuity and shot asset UI follow independently. ‹src: 3.8-threads, 3.8-phase1-asset-inheritance-fix›
- **WD-IDEA-FLOW-133** [planned] Shot chaining amplifies whatever prompt quality exists, so frame prompt quality is improved first. ‹src: 3.7-phase-6-shot-chaining›
- **WD-IDEA-FLOW-134** [voice,impl] Verify before building: investigate existing generation and inheritance chains first, write up findings and fixes from each verification pass, and only then build features on working infrastructure. ‹src: 3.7-threads, 3.7-phase-0-investigation›
- **WD-IDEA-FLOW-135** [planned] Ship additive behavior before replacing old behavior, and add telemetry before strict enforcement. ‹src: 5-3-location-implementation-plan›
