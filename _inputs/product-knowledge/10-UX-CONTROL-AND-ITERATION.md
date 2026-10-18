# 10 UX, Control & Iteration

> Scope: approvals, locking, staleness and invalidation, versioning and branching, overrides, automation levels, navigation, layout, review flows, onboarding, dashboard, cost and collaboration UX. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Control principles

- **WD-IDEA-UX-001** [voice] Browsing is free of side effects: moving through past or completed stages never triggers regeneration, re-saving, or pushing data downstream unless the user deliberately edited something. ‹src: describing-ideal-locking-behavior›
- **WD-IDEA-UX-002** [voice, impl] No lock rituals: the user is never forced to unlock and re-lock, sit through warning loops, or wait on no-op saves just to move through stages already completed. Completed scene states persist across navigation, especially in the production cycle. Locking keeps its data-protection purpose but must never become bureaucracy. The user's time belongs to creative work, not to unlock and relock rituals. ‹src: describing-ideal-locking-behavior, Tickets, master-mvp-tasklist›
- **WD-IDEA-UX-003** [voice] Lock and unlock look and behave the same on every stage. The creator invites better designs, especially visual ones, as long as the experience stays consistent. ‹src: describing-ideal-locking-behavior›
- **WD-IDEA-UX-004** Trust requires visibility: routing or decisions made without a confirmation step feel like "magic in the bad sense" because the user cannot trace what the system decided. ‹src: streamlined-input-analysis-5-10›
- **WD-IDEA-UX-005** Trust builds when the system catches inconsistency early. It erodes when users keep discovering late-stage mismatches they believed were settled, or keep having to "fix obvious links". ‹src: 4-15-location-analysis›
- **WD-IDEA-UX-006** [planned] Avoid both too much hidden magic and too much duplicated UI. Each stage gets one clear job; if several stages become the same editor (e.g. all of them location editors), the product feels fragmented (see 02).
- **WD-IDEA-UX-007** [planned] Advisory calibration: warnings are stronger than hidden fragility but lighter than premature blocking. Default users get warnings and recommendations; hard gates are reserved for advanced mode or explicitly strict settings. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-UX-008** [voice,impl] Avoid alarm fatigue: informational risk (e.g. "Risky") is a subtle dot with an explanatory tooltip, not a prominent badge, and is visually separate from real breakage. ‹src: ui-fixes›
- **WD-IDEA-UX-009** [planned] Calibrate confidence thresholds from real usage before enforcing anything; tune badge language, cut warning fatigue, and rewrite copy users misread (e.g. about fallback behavior). ‹src: 5-3-location-implementation-plan›
- **WD-IDEA-UX-011** Quick-start flows target laymen, not power users, so they need progressive disclosure and plain-language copy.
- **WD-IDEA-UX-012** Do not build another step-by-step wizard on top of a pipeline that already has 12 stages; build a workspace instead (e.g. an intake workspace). ‹src: streamlined-input-analysis-5-10›
- **WD-IDEA-UX-013** [voice] Every UI change gets reviewed for what is poorly designed or unintuitive and what would make it easier to use; UX recommendations are expected after each build. Manual test guides should be short and time-efficient. ‹src: goated-prompts›
- **WD-IDEA-UX-014** [voice] A feature counts as done only after a real end-to-end run in the live app, not on mocked tests alone ("a lot of problems occurred after implementation"). The creator doubted an AI "ready to ship" claim built on mocked tests. For continuity features, done means a live run covering the reuse/edit loop, the continuity-base suggestions strip, and the strict-mode (Advanced) lock. ‹src: 8-1-location-continuity-phase-5-6-audit, 7-19-location-stabilization-master-plan›

## Status vocabulary and indicators

- **WD-IDEA-UX-015** One status vocabulary per stage, shown in a timeline-style progress display.
  - Display states: locked, active, pending, outdated.
  - Underlying states: draft, locked, invalidated, outdated, and skipped for Phase A stages bypassed by imported material (a terminal, intended outcome rather than a hole; see WD-IDEA-FLOW-078).
  - Progress labels such as "Completed" and "In Progress".
- **WD-IDEA-UX-017** [planned] Pipeline status colors (e.g. green vs yellow) have one documented meaning everywhere, so users see where they are at a glance.

## Locking and unlocking

- **WD-IDEA-UX-018** [impl] Approving a stage locks it and advances the user to the next stage automatically.
- **WD-IDEA-UX-019** [impl,planned] Universal lock control: one lock/unlock button in the same place (e.g. top right) on every stage. One click, no warning loops, a clear locked vs unlocked state, and "locked" shown separately from ordinary status flags. A confirmation appears only when unlocking would invalidate downstream work (see WD-IDEA-UX-029 and WD-IDEA-UX-033); with no downstream work the unlock is immediate.
- **WD-IDEA-UX-020** [voice] Every production stage (7–12) gets lock and unlock, not only the shot list.
- **WD-IDEA-UX-021** [voice] In production stages the auto-save "Proceed" button becomes "Lock & Proceed": save, lock, and advance in one action, matching Stages 1–5.
- **WD-IDEA-UX-022** [voice,impl] A locked stage shows a prominent "LOCKED-IN" flag in its header with "Unlock & Edit" to the right. Header layout: [Back] [Stage Title] … [LOCKED-IN] [Unlock & Edit] [Next →]. The stage's action buttons (Regenerate, Approve Script, etc.) are replaced while locked. ‹src: describing-ideal-locking-behavior›
- **WD-IDEA-UX-023** [voice] Locked content stays readable: white, or at most slightly greyed. The creator hates heavily greyed-out locked text.
- **WD-IDEA-UX-024** [voice] While locked, tool buttons (e.g. Preview Scenes, Regenerate, Approve Script) cannot be pressed, but text can still be selected and highlighted, just not edited. Related: WD-IDEA-UX-022 (same locked state; there the action buttons are replaced).
- **WD-IDEA-UX-025** [voice,rejected] The button was first named "Unlock-2-Edit"; replaced by "Unlock & Edit".
- **WD-IDEA-UX-026** [impl] Locking is idempotent: locking an already-locked stage has no further effect.
- **WD-IDEA-UX-027** Locking is an explicit, auditable event recording who locked, a required reason, and when. A stage locks once and the lock record cannot be overwritten. ‹src: database-schema-state-transition-matrix›
- **WD-IDEA-UX-028** [impl] Stages made outdated by upstream changes stay viewable with an "OUTDATED" badge plus edit and relock controls.
- **WD-IDEA-UX-029** [impl] Unlocking a Phase A stage first computes downstream impact; if later work is affected, a dialog explains it before the user confirms. Confirming makes the stage editable and marks every downstream locked stage outdated (forward-only cascade). Tension with WD-IDEA-PHIL-047 (completed stages are never changed in place). ‹src: current-app-user-flow›
- **WD-IDEA-UX-030** [voice] Unlocking a production stage (e.g. Stage 8) marks already-completed later stages (9–12) outdated, and they can be re-locked without redoing work if nothing actually changed. ‹src: describing-ideal-locking-behavior›
- **WD-IDEA-UX-031** [voice,rejected] Rejected: unlocking a production stage sends every later stage back to needing re-completion. Replaced by "mark outdated".
- **WD-IDEA-UX-032** [impl] Scene stages have their own lock system; unlocking a scene stage can show an impact warning and marks downstream scene work outdated.
- **WD-IDEA-UX-033** [impl] Unlocking a shot list with no downstream work is immediate. With existing frames or videos it asks for confirmation detailing what will be affected (e.g. frame count, cost), and "Unlock & Invalidate" marks that work invalid without deleting it. A locked shot list is read-only with a lock banner; locking moves the scene to "shot list ready"; locked or outdated lists can be unlocked and relocked.
- **WD-IDEA-UX-034** [impl] Unlocking a scene's shot list returns the scene to draft only if it had not progressed further, so later statuses (frames locked, video complete) are never accidentally rolled back.
- **WD-IDEA-UX-035** [planned] Editing a locked stage is deliberate: a "This will affect downstream work" acknowledgment with proceed or cancel. The edit is logged and, once branching exists, creates a new branch automatically.
- **WD-IDEA-UX-036** [voice] The global asset stage and scene asset stage use a soft lock (like frame prompts) instead of hard locking, because users make mistakes and change their minds quickly; Stage 5 assets stay editable (see 06). Stage 5 also has a hard gate ("Lock All Assets and Proceed", WD-IDEA-FLOW-024 and WD-IDEA-FLOW-025); which rule governs asset editing after that gate is open. ‹src: new-tasks, master-mvp-tasklist›

### Options: can a locked stage be reopened on the same branch?
- **WD-IDEA-UX-037** [alt] Monotonic locking: a locked stage can never return to unlocked; changing it requires a new branch. ‹src: database-schema-state-transition-matrix›
- **WD-IDEA-UX-038** [alt,voice] "Unlock & Edit" on the same branch: warn first, then invalidate downstream stages immediately. Branching on unlock is deferred to later. ‹src: describing-ideal-locking-behavior›
- **WD-IDEA-UX-039** [rejected,voice] Unlock without an immediate cascade and invalidate downstream only when the user actually saves changes. Replaced by warn-then-invalidate.

### Options: lock ordering in Phase A
- **WD-IDEA-UX-040** [alt,impl] Strictly sequential: a stage cannot lock unless its predecessor is locked; locked stages show a "Confirm & Proceed" header; unlocking is two-step with an impact preview; every save is a new version and locked cannot revert to draft. Related: WD-IDEA-FLOW-029 (same strict-order rule), with the locking-UI and versioning consequences added here. ‹src: planning-wif-lawrence›

### Options: when to overhaul locking relative to branching
- **WD-IDEA-UX-042** [alt] Hold the full locking overhaul until branching and versioning are built, since the two are intertwined. ‹src: Tickets›
- **WD-IDEA-UX-043** [alt,voice,planned] Overhaul locking early because it is "extremely tedious": build the deliberate-edit acknowledgment foundations now and integrate full branching later (the creator's choice). ‹src: injecting-org-tickets-into-plan›

## Invalidation and staleness

Edits propagate staleness downstream. Invalidated work is flagged and kept, never deleted, and regenerates only when the user acts.

- **WD-IDEA-UX-044** Invalidation follows the layer where the change happened: a global-intent change invalidates every stage, a narrative change only downstream stages, a scene change only media stages, and a media change nothing. ‹src: inheritance_contract›
- **WD-IDEA-UX-045** Three invalidation scopes: global (all downstream stages; Phase A edits), local scene (the current scene), and continuity break (all later scenes; Phase B edits also hit downstream scenes).
- **WD-IDEA-UX-046** Invalidated work is never deleted. It stays viewable and accessible, marked stale.
- **WD-IDEA-UX-047** [planned] Cascade map by trigger:
  - Beat sheet (Stage 3) change: partial invalidation.
  - Master script (Stage 4) change: all scene-level work.
  - Asset definition (Stage 5) change: scene asset instances.
  - Shot list (Stage 7) change: that scene's frames and videos. Open blast-radius options: WD-IDEA-UX-063, WD-IDEA-UX-064, WD-IDEA-UX-065; also WD-IDEA-CONT-235.
  - Scene visual state (Stage 8) change: downstream frames.
  - Prompt (Stage 9) change: flags a need to regenerate.
- **WD-IDEA-UX-048** [impl] Changing an asset's presence in a shot invalidates the prompt stage and everything downstream.
- **WD-IDEA-UX-049** Editing a beat by hand marks the master script out of date, shown as a yellow "Not Up-to-Date with Current Beat Sheet" flag on Stage 4. Nothing regenerates automatically.
- **WD-IDEA-UX-050** Mutual staleness flags: after a beat edit following script approval, Stage 3 shows "Not Up-to-Date with Current Script" and Stage 4 shows "Not Up-to-Date with Current Beat Sheet". The flags also appear on the Phase A timeline nodes. ‹src: AI-agent-registry-context-flow-architecture, project-overview›
- **WD-IDEA-UX-051** Editing the master script by hand flags the beat sheet out of date, marks every scene outdated, and marks scenes after the first edited scene continuity-broken. Before saving, a modal warns: "This edit will invalidate all approved videos. Estimated regen cost: $X.XX. Proceed?" ‹src: database-schema-state-transition-matrix›
- **WD-IDEA-UX-052** Regenerating a treatment creates a new version on the same branch at low cost (LLM only).
- **WD-IDEA-UX-053** Editing a scene-specific asset (Stage 8) for scene N invalidates that scene's frames and video.
- **WD-IDEA-UX-054** Going back from video review (Stage 12) to the shot list (Stage 7) for a narrative or audio problem invalidates all of that scene's Stage 8–12 work.
- **WD-IDEA-UX-056** [planned] Continuity-break detection on edits: removing an asset later scenes depend on, or changing a state so a scene's end no longer matches the next scene's start, triggers warnings (see 04). Related: WD-IDEA-CONT-212 (continuity breaks are flagged, never silently ignored).
- **WD-IDEA-UX-057** Outdated scenes are never blocked. Opening one shows a non-blocking warning: why it is outdated, which upstream artifacts changed, and which downstream scenes may be affected. The user proceeds after acknowledging. Related: the correction-loop example is WD-IDEA-FLOW-060. ‹src: project-overview, user-flow›
- **WD-IDEA-UX-060** [planned] Keep a log of every invalidation: what was invalidated and why.

### Options: blast radius of editing scene N's shot list
- **WD-IDEA-UX-063** [alt] Only scene N's video becomes outdated. ‹src: database-schema-state-transition-matrix›
- **WD-IDEA-UX-064** [alt] Scene N's frames and videos are invalidated (on unlock after frames exist). ‹src: architecture-and-rules› — see WD-IDEA-UX-033.
- **WD-IDEA-UX-065** [alt] Scene N's Stages 8–12 become outdated and every later scene "continuity broken", because the end-frame anchor chain is disrupted; scene N's frame costs are recalculated and the downstream impact warned. The same local cascade applies to a script edit touching scene N. ‹src: AI-agent-registry-context-flow-architecture, project-overview›

### Options: blast radius of regenerating a frame in scene N
- **WD-IDEA-UX-066** [alt] Scene N's video becomes outdated, the scene's end frame updates, and every later scene becomes continuity-broken: a high-cost cascade. Related: WD-IDEA-CONT-235 (same cascade; also covers start and end frame regeneration). ‹src: database-schema-state-transition-matrix›
- **WD-IDEA-UX-067** [alt] That shot's video and every later shot in the scene become outdated; the scene drops from frames-locked to draft, its end frame clears, and the next scene becomes continuity-broken. After approval, a drift detector compares the regenerated frame to the previous shot's end frame; if it passes, that shot is ready for video, and later shots stay outdated until regenerated in sequence. ‹src: AI-agent-registry-context-flow-architecture›

### Options: resolving beat sheet / script drift
- **WD-IDEA-UX-068** [alt] "Retroactively Revise Script": regenerate the script from the edited beats plus Stage 1–2 context as a new version; the Stage 3 flag clears. Related: WD-IDEA-STORY-103 (same action, listed as the sync action).
- **WD-IDEA-UX-069** [alt] "Retroactively Revise Beat Sheet": re-extract beats from the current script (reverse sync) as a new version; the Stage 4 flag clears. Related: WD-IDEA-STORY-104 (same action).

## Warnings, cost previews and invalidation review

- **WD-IDEA-UX-070** Cost-aware editing: every invalidating change shows a regeneration warning with estimated cost before it is committed, and the user must acknowledge it. The Cost & Dependency Warning is meant to encourage users to "lock in everything" first.
- **WD-IDEA-UX-071** High-impact cost modal estimates from what is affected (frames ≈ shots × 2 × image price; videos ≈ shots × video price): "This will invalidate all Phase B work. Estimated cost: $X. Proceed?"
- **WD-IDEA-UX-072** [planned] Cost of regenerating invalidated content is broken down by stage and scene and compares "regenerate all" with selective regeneration.
- **WD-IDEA-UX-073** [planned] Invalidation review: invalidated stages marked orange/red; a "Review Invalidations" view listing affected content with reasons; batch regeneration with cost preview; and the option to proceed with partial invalidation after acknowledging the risk.

## Versioning, branching and history

- **WD-IDEA-UX-074** Story Timelines: git-style branching for non-linear, non-destructive evolution with a full audit trail. A Main (approved, linear) timeline plus experimental branches for alternate structural realities isolates expensive production work from destructive early narrative pivots; users switch branches without losing data.
- **WD-IDEA-UX-075** A branch has a unique name (user-given or auto-generated, e.g. "Main", "Experiment 1"), a parent branch, the stage where it diverged, and a commit message holding the user's "why".
- **WD-IDEA-UX-076** [impl] Every project starts with a single "Main" branch, which is active; a project has exactly one main branch and one active branch.
- **WD-IDEA-UX-077** Mandatory branching: regenerating the master script from an edited beat sheet first forces a new branch. A modal asks for branch name and commit message; Stages 1–3 are copied, the script is regenerated there. This is the main structural fork point.
- **WD-IDEA-UX-078** On a forced branch, all production artifacts on the new branch are invalidated (high cost) while the original branch stays untouched.
- **WD-IDEA-UX-079** Branch policy by edit type:
  - Manual beat sheet edit: saves to the current branch, only the not-up-to-date flag.
  - Manual script edit: stays on the current branch, with a soft "Create New Branch" suggestion if the edit is significant.
  - Edits in Stages 5–12: save to the current branch with local invalidation; the user may branch first.
- **WD-IDEA-UX-080** Switching to a previous version always creates a new fork and never overwrites existing data.
- **WD-IDEA-UX-081** Every regeneration adds a new version of the stage output; older versions are kept.
- **WD-IDEA-UX-082** [planned] Version checkpoints: "Save as New Version" / "Create New Branch" at key decision points, automatic branching before destructive actions (e.g. master script regeneration), and user-initiated branching from any stage.
- **WD-IDEA-UX-083** [planned] Story Timelines view (version history): a visual tree of trunk and branches whose nodes show the guidance text (commit message) and timestamp, with "Switch to this Version", branch names and descriptions, basic comparison, and safeguarded deletion.
- **WD-IDEA-UX-084** [planned] Branches keep their own asset generations and cost tracking; completed stages are protected from accidental overwrite.
- **WD-IDEA-UX-085** [future] Artifact Vault: every generated artifact (scripts, shot lists, frames, videos, prompts) grouped by branch, then stage and scene, each with origin branch, timestamp, and credit cost. Includes search and filtering across generated content; post-MVP (see WD-IDEA-UX-086).
- **WD-IDEA-UX-086** [future, voice] The Artifact Vault is post-MVP and its usefulness is questioned. Reconsider it if style capsules work well. ‹src: Totally-New-Features›
- **WD-IDEA-UX-087** Conceived: the project header shows Artifact Vault, Version History, and Create New Branch (instant fork of the current state) top-right; the master script's downstream warning points to branching as an escape hatch. Status: future; in the recorded app flow these header entries were only "coming soon" placeholders.
- **WD-IDEA-UX-088** Inactive non-main branches move to cold storage after 90 days.
- **WD-IDEA-UX-089** [rejected] A fixed "5 previous states" undo history; replaced by non-linear branching history.
- **WD-IDEA-UX-090** [future] Full git-style branching (merge conflicts, rebasing, cherry-picking) is deferred past the MVP as too complex. Related: WD-IDEA-PHIL-049 (Git-style branching with a full audit trail); the full branch toolkit is WD-IDEA-UX-091.
- **WD-IDEA-UX-091** [future] Full branch toolkit: side-by-side script diffs, visual asset differences, highlighted shot list comparison, merge with user-resolved conflicts, rebase, cherry-pick across branches, and tagging important versions.
- **WD-IDEA-UX-092** [voice] Scene-preserving pivot: unlocking the script to branch opens a modal asking which scenes to keep valid and unchanged (rather than what to invalidate); the system knows which script parts tie to which scenes. ‹src: Section-of-story-branch›
- **WD-IDEA-UX-093** [voice] Kept scenes stay locked against editing while the user revises the script. When the revised script is approved, kept scenes stay in the new branch's Script Hub with all their assets, frames, and videos, and new scenes fill the rest. ‹src: Section-of-story-branch›
- **WD-IDEA-UX-094** [voice] Re-extraction after a scene-preserving pivot never wipes existing asset descriptions or images; the user chooses which assets to keep or remove for the new scenes and can add new characters or assets. Assets of kept scenes are never removed. ‹src: Section-of-story-branch›
- **WD-IDEA-UX-095** [future] Asset version history in the UI. Related: WD-IDEA-CONT-056 (the asset change log and per-asset rollback this UI would surface).
- **WD-IDEA-UX-096** [future] A visual tree of an asset's inheritance chain across scenes.

## Regeneration guidance and iteration

- **WD-IDEA-UX-099** Announce the chosen mode when a regeneration starts ("Regenerating with reference image..." vs "Regenerating from description only..."), since generation takes 15–30 seconds and users forget what they picked.
- **WD-IDEA-UX-101** Iteration discipline: change one variable per regeneration (camera OR lighting OR action) so the cause of each change is clear. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-UX-102** [voice] Projected runtime display: sum of beat durations on the beat sheet, a projected runtime in the Script Hub, and/or a running tally of all shots and their durations in the shot list stage. Purpose: track runtime ballooning against the target length (see WD-IDEA-FLOW-042). ‹src: new-tasks›

### Options: is regeneration guidance mandatory?

Held with their owning topic in other documents: WD-IDEA-STORY-077 (see 05), WD-IDEA-STORY-078 (see 05).

## Provenance and skipped stages

- **WD-IDEA-UX-107** Provenance badges distinguish SKIPPED (content absent, bypassed), IMPORTED (user supplied the stage directly), AUTO-FILLED (generated or inferred from the submission, e.g. beats reverse-generated from a script), and authored (plain checkmark), all distinct from pending. Users need to know whether to trust a stage's content.
- **WD-IDEA-UX-108** [planned] Every stage's content carries a provenance tag (imported, AI-generated, authored); the badge is a pure function of stage status plus provenance, so no separate "backfilled" status is needed.
- **WD-IDEA-UX-109** [planned] Badge precedence: a staleness/outdated warning always outranks a provenance badge, which becomes subtext ("Outdated · Imported"). Safety beats provenance.
- **WD-IDEA-UX-110** [planned] Provenance badges appear on every stage-status surface: pipeline sidebar/timeline, dashboard project cards, and the Script Hub.
- **WD-IDEA-UX-111** [planned] Backfill never re-syncs, so the AUTO-FILLED badge carries a static note: "Generated from script on [date] — won't update automatically if the script changes later."

## Intake review before commit

- **WD-IDEA-UX-114** Route-plan preview in plain terms ("Stage 2 skipped, Stage 3 generated, Stage 4 imported, Stage 5 seeded"); after confirm the pipeline opens at the most relevant review stage (e.g. a messy bundle may land at Stage 3 with Stage 2 auto-filled).
- **WD-IDEA-UX-115** [planned] Three-click target for a finished script: pick Streamline, drop the PDF, confirm a one-line summary ("This looks like a complete screenplay. We'll skip Treatment and Beat Sheet and take you straight to Stage 4 for review."). Related: the one-shot "Import Script" path is WD-IDEA-INPUT-051 and WD-IDEA-INPUT-087.
- **WD-IDEA-UX-116** [planned] A credit estimate appears on the review screen before confirm whenever commit will spend credits (AI formatting, backfill, image analysis), matching cost confirmations before Stage 8 and Stage 11 generation. It is a trust issue, not a nice-to-have.
- **WD-IDEA-UX-117** [planned] The intake estimate is itemized by real cost drivers (e.g. "N assets × visual-distillation cost", standalone notes, clarification edit scope), not a flat per-file charge, and becomes authoritative only once asset selection and clarification edits are known. Script parsing and scene and dependency extraction are free; the cost is selected assets times visual distillation plus per-edit reconciliation.
- **WD-IDEA-UX-118** [planned] Confirm is all-or-nothing: stage locks and skips, imported content, accepted assets, and recorded answers apply together or not at all, so a half-applied project never blocks the user.
- **WD-IDEA-UX-119** [planned] Atomicity covers project configuration and the Stage 1 draft too: a failed commit must not leave partial changes while reporting failure, so retries don't run on half-changed state and the user is never unsure what succeeded.
- **WD-IDEA-UX-133** [future] Quality completeness score after routing: "Your project is 72% ready to produce: Stage 4 complete, Stage 5 has 8 of 11 assets filled, Stages 2–3 auto-generated from your script", to prioritize refinement.

## Navigation

- **WD-IDEA-UX-137** [impl] Once a project has reached Phase B, the Phase A timeline offers a direct return to the Script Hub; the Script Hub's button back to Phase A is labeled "Narrative & Style Engine" rather than "Phase A".
- **WD-IDEA-UX-138** In scene mode a vertical rail lists that scene's production stages (7–12) plus "Back to Script Hub". A stage is reachable if it is current, completed, locked/outdated, or every prior scene stage is complete; unreachable stages appear disabled with a lock.
- **WD-IDEA-UX-140** [voice] A "Next →" button, styled like Back, sits at the right end of the stage header and appears only on stages the user already locked and returns to.
- **WD-IDEA-UX-141** [voice] Next always goes to the immediately following stage, even if it is locked or completed, rather than skipping to the first incomplete stage.
- **WD-IDEA-UX-142** [impl,voice] Back goes to the previous stage number (Stage 8 → Stage 7), not contextual targets like "Back to Shot List"; the shot list stage goes back to the Script Hub, and the Script Hub back to Stage 5.
- **WD-IDEA-UX-143** [voice] Production stages put Back, Next, and the lock indicator in the top header like Stages 1–5, and drop the footer bar; scrolling to the bottom to navigate is annoying.
- **WD-IDEA-UX-144** [voice,alt] Considered: keep Back/Next in the production footer and move only the lock flag and Unlock button to the top. The creator chose everything in the top header.
- **WD-IDEA-UX-145** [voice] The graphical stage navigation (production right sidebar) stays alongside the header buttons.
- **WD-IDEA-UX-149** Navigation chrome: breadcrumbs, a project header, and a sidebar.
- **WD-IDEA-UX-150** [impl] A persistent global sidebar offers Projects, Style Capsule Library, Asset Library, Sign Out, a light/dark theme toggle, and collapse/expand.
- **WD-IDEA-UX-151** [impl] The project header always shows the project title, current branch, and aspect ratio.
- **WD-IDEA-UX-152** Context-aware UI: toolbars, sidebars, and feedback adapt to the current workflow stage.
- **WD-IDEA-UX-153** Conceived: the stage navigation sidebar shows a badge/dot on stages with pending actions (e.g. Stage 8 when shots lack a direction), like existing status dots.
- **WD-IDEA-UX-156** [planned,future] Keyboard shortcuts: Ctrl+1–12 jump to a stage, Ctrl+Left/Right previous/next stage, Ctrl+S save, Ctrl+R regenerate, Ctrl+G generate; bindings are hinted in tooltips and work on all platforms. The Ctrl+/ or ? shortcut help modal and customizable bindings are deferred. Related: WD-IDEA-PHIL-096 (basic shortcuts in MVP scope).
- **WD-IDEA-UX-157** [impl] Signed-out visitors see a public landing page; signed-in users go straight to their dashboard.
- **WD-IDEA-UX-158** [impl] Email/password sign-in and sign-up share one screen with a mode toggle, show/hide password, email-format and 6-character minimum checks, and inline errors.
- **WD-IDEA-UX-159** [impl] Protected pages send signed-out users to sign in and remember the page they were trying to reach.

## Layout and persistent context

- **WD-IDEA-UX-160** [impl,planned] Content Access Space (carousel): one collapsible panel across the production stages that replaces the old rearview mirror. Tabs cycle left/right: rearview (previous scene's frames, assets, end state), the current scene's script excerpt in screenplay format (scrollable, to remind the user where they are in the story), and the shot list.
- **WD-IDEA-UX-161** [impl] Inside the shot list tab, a nested carousel steps through the scene's shots with up/down arrows, separate from the left/right tab arrows.
- **WD-IDEA-UX-162** [impl] The panel works like a pull-down curtain: collapse and expand, and drag to resize how much screen it takes.
- **WD-IDEA-UX-163** [planned] Resizing follows the mouse instantly; only collapse/expand animates. Double-clicking the handle snaps back to a default of 25% of viewport height.
- **WD-IDEA-UX-164** [planned] The selected tab persists across collapse/expand and across scene and stage changes, remembered by tab identity so it still resolves when the set of available tabs changes.
- **WD-IDEA-UX-166** [planned] Long script or rearview text scrolls inside the panel.
- **WD-IDEA-UX-168** Shared pipeline components named in the architecture without description: "Rearview Mirror", "Asset Drawer", "Regeneration Guidance" input, "Continuity Flags" displays.
- **WD-IDEA-UX-169** Script Hub scene list: number and slug, status, thumbnail of the last approved end frame, and asset dependencies.
- **WD-IDEA-UX-170** Scene overview panel: read-only opening excerpt, expected characters at scene start, expected location, and the prior scene's end-state summary; actions to enter the scene, jump to an upstream scene, or branch. ‹src: project-overview›
- **WD-IDEA-UX-171** [impl,planned] Script Hub cards fit their container: the panel widens, tabs scroll, cards resize, and labels truncate progressively by width ("ext-launchpad-day-6" → "ext-launchpad.." → "ext-lau..").
- **WD-IDEA-UX-172** [impl,planned] Scene headers read like screenplay sluglines with the scene number in front ("Exterior [Location] Day"), with the encoded slug (e.g. EXT-LOC-DAY-1) as a smaller subheading, consistently wherever scene headers appear.
- **WD-IDEA-UX-174** [voice] In narrow windows cards and panels stack vertically instead of squeezing into one row; e.g. the shot list could be two columns on wide screens and one when narrow.
- **WD-IDEA-UX-175** [impl] Stage 8 three-panel layout: grouped, multi-selectable asset list with status badges (left), visual state editor (center), add-asset and proceed controls (right), under a scene header with slug and status.
- **WD-IDEA-UX-176** [idea] Camera metadata appears as scannable color-coded tags per category (distance, height, movement), e.g. [MS] [Eye Level] [Slow Dolly In], or small icons, instead of one text string.
- **WD-IDEA-UX-177** Long shot lists stay responsive with many items.
- **WD-IDEA-UX-178** [planned] Asset drawer: renaming assets, better performance, and search and filtering (see 06).
- **WD-IDEA-UX-179** [future] Image thumbnails/compression and paginated lists for browsing large projects and libraries.
- **WD-IDEA-UX-180** [voice,planned] Opening an asset in scene asset definition must be fast: ideas include prefetching an asset's reference chain on hover and loading all its details in one request. Hovering an asset would prefetch both its reference chain and its generation attempts; the creator spared this latency work for later because the changes touch too many moving parts while the stage was still in flux. ‹src: stage-8›
- **WD-IDEA-UX-181** [future] Customizable workspace: drag-and-drop layout, resizable/dockable panels, role presets (Director, Writer…), synced across devices.

### Options: which Content Access tabs appear where
- **WD-IDEA-UX-182** [alt] Script excerpt and shot list tabs available throughout Stages 6–12. ‹src: master-mvp-tasklist›
- **WD-IDEA-UX-183** [alt] Script excerpt in Stages 7–12; shot list tab in Stages 8–12 only (not 7, possibly not 12). ‹src: Tickets›
- **WD-IDEA-UX-184** [alt,planned] Script tab always available, first, and the default (it is consulted most); Rearview tab only from scene 2 onward; Shots tab only from Stage 8 onward. ‹src: ContentAccessCarousel-improve›

## Continuity and location control surfaces

Each production stage owns one kind of continuity decision: the shot list checks that each shot belongs to the right space, scene visuals diagnose and repair coverage, prompts show what will be relied on, and frames make continuity real and reusable (see 06B, 04).

### Shot list (Stage 7)
- **WD-IDEA-UX-185** [planned,impl] Stage 7 owns shot extraction and editing, setting text, the initial location-link suggestion with basic confidence display, lightweight correction, and lock-time warnings about unresolved or suspicious links. Promise: "make sure each shot basically belongs to the right space."
- **WD-IDEA-UX-186** [planned] Stage 7 does not own full location-view management, coverage diagnosis, heavy direction reassignment, or continuity curation.
- **WD-IDEA-UX-196** Past failure to avoid: free editing of setting text with no check against known locations, so drift surfaced late in Stage 8 as a "silent mismatch".

### Scene visuals coverage (Stage 8)
- **WD-IDEA-UX-199** [planned,impl] Stage 8 owns coverage analysis, direction/view assignment review, missing-view surfacing, one-step entry into advanced controls, and repair of repeated or high-risk continuity problems. Promise: "decide whether your planned shots have enough spatial coverage before you spend generation effort."
- **WD-IDEA-UX-200** [planned] Stage 8 does not own baseline shot editing, detailed prompt/reference transparency, or frame-level curation.

### Prompt review (Stage 9)
- **WD-IDEA-UX-217** [planned,impl] Stage 9 is a transparency surface: it shows which continuity references will actually be used, whether the shot relies on baseline location context, a matched direction, or a fallback/delta adaptation, and any weak-reference risk. Promise: "the last clear look at what the system will rely on".
- **WD-IDEA-UX-218** [planned,impl] Stage 9 does not edit locations, directions, views, or assignments and does not duplicate shot management or coverage planning; repair stays in Stages 7–8. It should feel calm and confidence-building, linking back to Stage 8 for repair.
- **WD-IDEA-UX-219** [planned] Users understand weak continuity before they spend generation effort.
- **WD-IDEA-UX-220** [planned] Users may override the matched view in Stage 9. Related: WD-IDEA-LOC-176 (editable matched-view override); the read-only default is WD-IDEA-LOC-175. ‹src: 5-1-location-system-intent-source›
- **WD-IDEA-UX-221** [impl] Per-shot continuity-strength badge: strong, usable, weak, or missing.
- **WD-IDEA-UX-222** [impl,planned] Per-shot generation-mode badge: fresh, match copy, camera change, or reuse/edit. Related: WD-IDEA-CONT-139 (the classification it reflects).
- **WD-IDEA-UX-224** [planned] Stage 9 previews which two location reference images will be sent per frame and shows delta descriptions for imperfect matches, so the strategy can be verified before spending; reported missing.
- **WD-IDEA-UX-227** [impl] Stage 9 shows the selected continuity base (or the top suggestion) as a card with thumbnail, source shot, and match reason.
- **WD-IDEA-UX-228** [impl] The preview is rebuilt from current shot and asset state each time and refreshes after prompts regenerate or assignments change.
- **WD-IDEA-UX-229** Conceived edge case: prompts generated before a continuity upgrade keep their old reference lists until regenerated.

### Frame workspace (Stage 10)
- **WD-IDEA-UX-232** [voice,planned] Stage 10 is the primary creative control and curation space: earlier stages get things generally right; here the user makes final decisions, moves things in and out, and grabs frames or prompts from earlier or later shots to reuse.
- **WD-IDEA-UX-234** [planned] Stage 10 does not own resolver repair or scene-wide coverage planning and must not be the first place users discover location drift. Related: WD-IDEA-FLOW-064 (stage ownership split).
- **WD-IDEA-UX-235** [planned] Stage 10 feels creative and momentum-oriented, not bureaucratic: it suggests reuse/edit when a strong prior frame exists and offers view promotion without forcing it.
- **WD-IDEA-UX-236** [impl] The continuity-base chooser shows up to 3 candidate thumbnails, each with a suitability badge, match reason ("Same location, similar reverse angle"), and source (scene/shot/approved), a Use/Using button, and a "Fresh" button that clears the base. Related: WD-IDEA-CONT-200 and WD-IDEA-CONT-201 (candidate tiers and ranking).
- **WD-IDEA-UX-238** [impl] Removing the base entry in the manual reference editor clears the base selection; the editor cannot forge a base not chosen through the chooser; selection and reference list stay in sync.
- **WD-IDEA-UX-239** [planned] Stage 10 shows the selected shot's reference package (primary base, blocking, direction, establishing, fallback, manual) and warns when it differs from the Stage 9 preview. Related: WD-IDEA-LOC-200 (reference package and preview parity).
- **WD-IDEA-UX-242** [impl] Users can manually edit start- and end-frame reference lists, upload their own references, add an existing frame as a continuity reference, and chain a shot from the previous shot's end frame.

### Promoting frames to established views
- **WD-IDEA-UX-245** If a direction already has a user-uploaded reference, locking a frame needs defined behavior: replace, coexist as an alternative, or let the user choose. Related: WD-IDEA-LOC-239 to WD-IDEA-LOC-241 (same open question).

### Options: when the establish-view prompt appears

Held with their owning topic in other documents: WD-IDEA-LOC-233 (see 06B), WD-IDEA-LOC-234 (see 06B).

### Continuity links and chaining

Held with their owning topic in other documents: WD-IDEA-CONT-171 (see 04), WD-IDEA-CONT-167 (see 04), WD-IDEA-CONT-168 (see 04), WD-IDEA-CONT-161 (see 04), WD-IDEA-CONT-187 (see 04), WD-IDEA-CONT-127 (see 04), WD-IDEA-CONT-128 (see 04), WD-IDEA-CONT-129 (see 04).

### Options: continuity link exclusivity

Held with their owning topic in other documents: WD-IDEA-CONT-176 (see 04), WD-IDEA-CONT-177 (see 04).

## Automation levels and modes

- **WD-IDEA-UX-265** [future] Per-scene continuity-mode overrides on top of the project setting. Related: WD-IDEA-LOC-221 (noted as the future extension).
- **WD-IDEA-UX-270** [planned] Confidence is visible wherever automation makes a decision: users can always tell whether a link is explicit, inferred, weak, or missing.
- **WD-IDEA-UX-273** [impl] In Advanced mode strict validation turns continuity issues into a gate: Stage 10's Lock & Proceed is disabled while issues exist, an amber badge with tooltip lists them, and switching back to Basic unblocks. Related: WD-IDEA-LOC-213 (advanced mode gives stronger warnings); strict mode is future per WD-IDEA-LOC-226; WD-IDEA-UX-278 and WD-IDEA-UX-279 remain open.
- **WD-IDEA-UX-275** [future] Strict-mode polish beyond the basic Advanced gate.
- **WD-IDEA-UX-277** [impl] Locked or outdated Stage 8 is never auto-populated; lock state is respected.

### Options: what triggers hard gates
- **WD-IDEA-UX-278** [alt] Hard gates in Advanced mode or under a separate, explicitly strict project setting. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-UX-279** [alt,impl] Strict validation tied only to Advanced mode, no separate strict setting. ‹src: 7-19-location-stabilization-master-plan›

## Reference controls and manual overrides

- **WD-IDEA-UX-280** [voice] The main concerns with the "Use as ref" toggle: the checkbox is too small to notice and nothing explains it; the creator wanted all options and tradeoffs discussed before fixing it. ‹src: goated-prompts›
- **WD-IDEA-UX-281** [planned,impl] The reference control is a noticeable switch (not a tiny checkbox) with a larger label, a highlight when on, and an info tooltip explaining that the current image is sent as a style reference to keep visual consistency.
- **WD-IDEA-UX-282** One label for the reference toggle everywhere (e.g. "Use current as reference"), or the short label plus a tooltip, instead of variants like "Use as ref" and "Use current image as reference".
- **WD-IDEA-UX-283** Stage 8 must say what "Generate Image" uses as input (master reference, scene instance, or description): an inline label ("Generate new scene image from description") or a button that changes with the toggle ("Generate from Description" vs "Generate from Description + Current Image").
- **WD-IDEA-UX-284** Stage 10 frame upload is discoverable: a visible label or an empty frame slot that is itself a drop zone ("Upload or drag image"), matching Stage 8's "Drop image or click to upload".
- **WD-IDEA-UX-285** [future] Batch reference toggle at the top of frame generation ("Use existing frames as reference for all regenerations") sets the session default.
- **WD-IDEA-UX-286** [voice] Edit which asset references are attached to a frame prompt on a whim, right in the frame-prompt stage. Applies in Stages 9 and 10, swapping between master and scene-instance images without returning to Stage 8. ‹src: 3.7-tasks-part-3, 3.7-location-pre-planning›
- **WD-IDEA-UX-287** [voice,planned] Better UI to see and control which assets are in which shots and their presence status, since it drives start vs end prompt tagging.
- **WD-IDEA-UX-288** [planned] Show relevant visual assets (master reference and scene-instance images) beside each prompt, filtered by shot presence in a collapsible panel, so users don't edit blind. When shot-presence data is missing, show all of the scene's assets instead (fallback in WD-IDEA-UX-289).
- **WD-IDEA-UX-289** [alt] Fallback without per-shot presence data: all scene assets in a collapsible side panel grouped by type (characters, locations, props), master + scene image each.
- **WD-IDEA-UX-290** [planned] Assets-by-shots matrices can get unwieldy for big scenes; consider pagination or collapsible sections.
- **WD-IDEA-UX-291** [planned] Show the end-frame reference set (which assets, which images), highlight the pre-to-post transformation image swap, and allow manual override of end-frame asset images.
- **WD-IDEA-UX-292** [planned] Per-asset-per-shot image picker chooses which image is sent (master, scene instance, angle variants, named location shots) without returning to scene visuals.

### Options: shot-asset presence UI
- **WD-IDEA-UX-293** [alt,planned] Matrix: rows = assets, columns = shots, color-coded presence cells.
- **WD-IDEA-UX-294** [alt,planned] Per-shot cards with asset thumbnails and presence badges. Either shows which image is actually sent.

### Options: reference toggle default
- **WD-IDEA-UX-296** [alt] The same default everywhere, preferably ON: a user regenerating already has an image they probably like and can uncheck for a fresh result.

### Options: reference toggle before the first image exists
- **WD-IDEA-UX-297** [alt,impl] Hidden until an image exists (it only applies to re-generation). Related: WD-IDEA-GEN-202 (toggle appears only once an image exists).
- **WD-IDEA-UX-298** [alt] Shown disabled with the tooltip "Available after first image is generated", teaching that the feature exists. Related: the alternative to the hidden-until-image behaviour in WD-IDEA-GEN-202.

## Comparison, variants and media review

- **WD-IDEA-UX-300** [future] Rich media preview: inline video with scrubbing, image comparison sliders, storyboard visualization, timeline overview with thumbnails.

## Checkout and approvals

- **WD-IDEA-UX-302** [impl] Checkout lets the user expand shot details, go back to frames, and confirm; confirming queues one video job per shot and reports how many were queued.
- **WD-IDEA-UX-303** Expected checkout behavior: cost scales with shot count, complexity, and duration; every prompt is visible for review; audio-driven projects show audio timestamp references and verify sync.
- **WD-IDEA-UX-304** [future] Collaborative approval workflows: approval requests, status tracking, approver notifications, approval history, custom workflows.

### Options: continuity issues at checkout
- **WD-IDEA-UX-305** [alt] Hard gate: all continuity warnings resolved before checkout approval. Related: WD-IDEA-FLOW-027 (also a pipeline quality gate). ‹src: golden-test-evaluation-framework›
- **WD-IDEA-UX-306** [alt,impl] Warn or block depending on readiness; overridable warnings ("proceed anyway") as elsewhere. ‹src: current-app-user-flow›

## Preserving authored work

- **WD-IDEA-UX-307** Conceived: project state saves automatically after every critical user action.
- **WD-IDEA-UX-308** [planned] Quiet auto-save in Stages 1–3: debounced (about 2 seconds after the last keystroke) with a subtle save indicator instead of repeated notifications.
- **WD-IDEA-UX-309** [planned] Leaving a page with unsaved changes warns and offers save-and-continue or discard.

## Onboarding, help and feedback

- **WD-IDEA-UX-312** [future] Onboarding: a welcome modal explaining the 12-stage pipeline; a guided tour of Stages 1–4 that can be dismissed and resumed; highlights of style capsules, the asset library, and the scene pipeline. Related: WD-IDEA-PHIL-096 (defers onboarding and help-system work from MVP).
- **WD-IDEA-UX-313** [future] First-visit overlays highlight key buttons (Generate, Lock, Approve), with "Don't show again" and progressive disclosure of advanced features once basics are mastered.
- **WD-IDEA-UX-314** [future] Example projects (short film, music video, commercial) with sample treatments, beat sheets, and assets; "Clone Example" to learn by exploring, with "How This Was Made" annotations. ‹src: MVP-tasklist-v1.1, missing_todos-not-sure›
- **WD-IDEA-UX-315** [future] Contextual help: (?) icons beside complex features, a searchable help panel, embedded video tutorials, and external docs links.
- **WD-IDEA-UX-316** [planned] Helpful empty states: "Create Your First Project" CTA, guidance in empty asset libraries, example inputs in empty fields, a suggested next step at each stage.
- **WD-IDEA-UX-317** [impl] Every action button and key label in the image upload review (action buttons, confidence badge, "Extracted from Image", "Final Description", Cancel, Accept) carries a short explanatory tooltip.
- **WD-IDEA-UX-318** A short cooldown between consecutive tooltips keeps them from fighting when the pointer sweeps across adjacent buttons.
- **WD-IDEA-UX-319** Teach gated features: controls not yet usable appear disabled with an explanation ("Available after first image is generated") rather than hidden.
- **WD-IDEA-UX-320** [voice,impl] Selection modes always show their action bar (e.g. asset Merge/Split greyed out with "select assets to merge or split") so users know the actions exist before selecting. ‹src: ui-fixes›
- **WD-IDEA-UX-321** Error messages name the failing stage and a specific reason (validation, service, permission), never "something went wrong"; failures degrade gracefully.
- **WD-IDEA-UX-322** [planned] Loading and progress states for save, regenerate, and generate, with clear user-visible errors.
- **WD-IDEA-UX-323** Gap: failed validation on submit (e.g. Stage 1) must tell the user what is wrong.
- **WD-IDEA-UX-324** [future] Smart suggestions: context-aware next actions, template suggestions, workflow tips, learning from behavior.
- **WD-IDEA-UX-325** [future] Advanced search: full-text fuzzy search across all project content with filters, recent items, favorites, and keyboard-driven navigation.
- **WD-IDEA-UX-326** [future] Accessibility: WCAG 2.1 AA, screen reader support, full keyboard navigation, high-contrast theme.

## Dashboard and project management

- **WD-IDEA-UX-327** [impl] The dashboard lists projects as cards with search by title or description; "+ New Project" is prominent; the empty state suggests adjusting the search or creating a first project.
- **WD-IDEA-UX-328** [planned] Dashboard organization: folders (create, rename, delete, drag projects in, counts), search, filter, and sort.
- **WD-IDEA-UX-329** [impl] Hovering a card reveals delete; permanent deletion requires confirmation.
- **WD-IDEA-UX-330** [planned] Cards show at a glance where a project is in both phases: Phase A progress and per-scene production progress, with a mini pipeline graphic and branch status.
- **WD-IDEA-UX-331** [impl] In Phase A the card shows "Stage X of 5" with one status dot per Phase A stage; the right side stays blank.
- **WD-IDEA-UX-332** [impl] In production the card's left side reads "Narrative & Style Set" with the Phase A dots; the right shows the current scene and stage ("Scene 3: Stage 8") and "N/M Scenes Complete".
- **WD-IDEA-UX-333** [voice,idea] Show the human stage title on the card (e.g. "The Beat Sheet", "Asset Definition") instead of "Stage 3 of 5".
- **WD-IDEA-UX-334** [impl,rejected] A progress percentage on cards was removed as unclear; replaced by stage label, dots, and scene counts.
- **WD-IDEA-UX-335** [impl] Card dots reflect true per-stage status (green locked, orange outdated, yellow active) rather than all green once Phase A is done.
- **WD-IDEA-UX-336** [planned] Edge cases: zero scenes leaves the right side blank; all complete shows only "M/M Scenes Complete"; an outdated or continuity-broken current scene shows that status instead of a stage number.
- **WD-IDEA-UX-337** [voice,planned] The card's current scene is where the user actually left off (last-worked scene and stage), tracked per project on every scene entry, not the lowest-numbered incomplete scene.
- **WD-IDEA-UX-338** [voice,planned] Completed-scene counts stay accurate (never "0/15" with 2 done), and "last updated" reflects any production activity (shot edits, prompt or frame generation, video rendering).
- **WD-IDEA-UX-339** [voice,planned] Cards refresh to reflect work done after opening a project.
- **WD-IDEA-UX-340** Cards and the in-project pipeline graphic always agree on stage status (same branch, latest version per stage).
- **WD-IDEA-UX-341** [future] A precomputed per-project summary for fast card display if needs grow.
- **WD-IDEA-UX-342** [idea,future] Cards show a cover image generated or pulled from a representative frame or asset, so projects are visually distinguishable.
- **WD-IDEA-UX-343** [idea,future] Fallback cover: a gradient or color derived from the project's visual style.

### Options: which scene the card calls "current"
- **WD-IDEA-UX-344** [alt] The lowest-numbered incomplete scene. ‹src: project-cards-in-dashboard-Ui-issue›
- **WD-IDEA-UX-345** [alt,voice] The scene and stage the user last worked on (users may be on scene 8 with scene 1 unfinished).

## Credits and cost visibility

- **WD-IDEA-UX-346** Conceived: running cost estimates and cost tracking are visible to the user.
- **WD-IDEA-UX-347** [impl] Frame generation is limited by credits: with zero credits nothing generates, and per-scene frame progress (e.g. 0/6 frames) is shown.
- **WD-IDEA-UX-348** [future] User-facing project analytics: progress statistics, timeline, cost breakdown, stage completion, regeneration frequency, time-to-completion, efficiency recommendations.

## Collaboration, notifications and audit

- **WD-IDEA-UX-349** [future] Teams: create and manage teams, invite users, role-based permissions, team switching.
- **WD-IDEA-UX-350** [future] Project sharing with view/edit/admin levels, share links, revocation, and notifications. Share links must respect the private, time-limited, authenticated access rule in WD-IDEA-ALT-013.
- **WD-IDEA-UX-351** [future] Real-time collaboration: simultaneous editing with presence, live cursors, conflict resolution, activity feed.
- **WD-IDEA-UX-352** [future] Comment threads, @mentions, resolution workflow, filtering; stylus annotations on tablets. Related: WD-IDEA-ALT-004 (tablet platform option).
- **WD-IDEA-UX-353** [future] Cross-project comparison, best-practice identification, template effectiveness, and stakeholder reports (PDF, scheduled delivery, shareable dashboards, presentation mode).
- **WD-IDEA-UX-354** [future] In-app or email notification when long-running generation jobs finish.
- **WD-IDEA-UX-355** [future] Audit logging of user actions across the app. Related: WD-IDEA-ALT-016 (enterprise audit logging).

## Visual identity

- **WD-IDEA-UX-356** [voice] Custom icons instead of common emoji/stock or generic icons (e.g. custom AI-made icons), so the app keeps a distinct look; generic icons make it look bad.
- **WD-IDEA-UX-357** Typography echoes film credits and screenplays; the theme is dark-first for long creative sessions.
- **WD-IDEA-UX-358** Restrained motion: springy animation only for moments of delight; reduced-motion preferences respected.
- **WD-IDEA-UX-359** [future] Animated stage transitions, micro-interactions, and loading/progress animations.

## Virtual set studio

- **WD-IDEA-UX-361** [impl] World generation shows staged progress (uploading images, "Building your set (~30-45s)", loading world) and an error state with a clear message and retry.
- **WD-IDEA-UX-363** [impl] "Generate World & Enter Studio" stays disabled until enough location input and at least one named shot exist; a tooltip explains what is missing.
