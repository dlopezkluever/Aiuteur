# 14 Product Intent

> Scope: a normalized synthesis of what the creator historically wanted WizardDirector / Aiuteur to become, drawn from the recurring themes across the legacy docs and the creator's voice notes. It describes intent and vision, not delivered features, and introduces no principle the sources do not support. Contradictory positions are kept in 13; the full atomic inventory is 15. Legend: see 00-README.

## Reading guide

- **Strong recurring intent**: stated repeatedly, across several docs or in the creator's own voice. Marked **(strong)**.
- **Exploratory**: floated once, framed as an option, deferred, or explicitly questioned. Marked **(exploratory)**.
- IDs point to the evidence; the thematic documents 01 to 11 hold the full statements.

## 1. What the product was meant to be

- **(strong)** A system that turns a written narrative (or whatever material the filmmaker already has) into an AI-generated short film through a fixed, inspectable, stage-by-stage workflow, instead of open-ended "slot-machine" prompting. Promise: lower cost and real narrative continuity. WD-IDEA-PHIL-001, WD-IDEA-PHIL-005, WD-IDEA-PHIL-007.
- **(strong)** The order of work is the core idea: plan first, lock cheap anchor frames second, spend expensive video generation last, once per shot, only to bridge approved anchors ("the Inversion"). Most of the pipeline's consistency and cost control was argued to follow from this. WD-IDEA-PHIL-006, WD-IDEA-GEN-002, WD-IDEA-GEN-007.
- **(strong)** Most effort belongs in consolidating and controlling story structure and visual identity (the global "truth" phase); video is the result of that process, not the main feature. WD-IDEA-PHIL-007, WD-IDEA-PHIL-009.
- **(exploratory)** A broader creative platform: remixing existing films, live-action hybrids, template marketplaces, domain-specific variants (corporate, educational, marketing), a Voice-Actinator mini-product, a cross-project "creative fingerprint". See 11, WD-IDEA-PHIL-072, WD-IDEA-PHIL-031.

## 2. Who it was for

- **(strong)** The "middle 80%": creative people with a story to tell who lack the patience or technical depth for professional tools, and who do not want a one-click generator either. WD-IDEA-PHIL-013, WD-IDEA-PHIL-014, WD-IDEA-PHIL-016.
- **(strong)** Deliberately not for the top-10% detail-tweakers, not an Adobe replacement, not a UGC/ad "slop" factory, and not an agent-takeover product. A feature only the hyper-detailed would want was called "designed incorrectly" for this product. WD-IDEA-PHIL-021, WD-IDEA-PHIL-022, WD-IDEA-PHIL-023, WD-IDEA-PHIL-024.
- **(exploratory)** Also named in places: power users with existing scripts, storyboard-carrying "true animators", marketing teams, a quick same-day parody workflow. These partly conflict with the mission and are recorded in 13. WD-IDEA-PHIL-017, WD-IDEA-PHIL-018, WD-IDEA-PHIL-019.

## 3. Filmmaker agency and authorship

- **(strong)** The human stays the author. AI accelerates low-care work and never replaces creative judgment; features that deviate from user input or decide without sanction are out of scope. WD-IDEA-PHIL-024, WD-IDEA-PHIL-025, WD-IDEA-PHIL-035.
- **(strong)** Approved and hand-written work is preserved: AI edits touch only what the user selected, the surrounding text is read-only context, and nothing is silently overwritten, re-saved, or regenerated. WD-IDEA-STORY-071, WD-IDEA-UX-001, WD-IDEA-UX-057.
- **(strong)** Transparency over magic: the system shows its assumptions, shows what will be sent to generators, and surfaces conflicts as questions instead of silently choosing. WD-IDEA-GEN-026, WD-IDEA-UX-217, WD-IDEA-INPUT-117, WD-IDEA-INPUT-126.
- **(strong)** Users iterate by saying what should change, and iteration history stays recoverable (versions, revertible attempts, forks that never overwrite). WD-IDEA-STORY-077, WD-IDEA-ASSET-176, WD-IDEA-UX-080.
- **(exploratory)** How far automation should go. A fully autonomous "master mode" was questioned ("then why not use a general agent?") but marked not out of scope; YOLO-style hand-over of whole bundles and agents that propose upstream fixes were floated. WD-IDEA-PHIL-026, WD-IDEA-FLOW-094, WD-IDEA-AV-048.

## 4. Optionality and flexible pacing

- **(strong)** Every domain was meant to have a fast, light default and an opt-in precise path: speed through what you do not care about, slow down on what you do. This pattern recurs for locations (basic vs advanced continuity), camera/shot complexity, asset detail, regeneration guidance, and warnings vs strict gates. WD-IDEA-PHIL-034, WD-IDEA-PHIL-036, WD-IDEA-PHIL-073, WD-IDEA-UX-007.
- **(strong)** Creative liberty for the AI scales inversely with how much material the user supplied. WD-IDEA-INPUT-041.
- **(strong)** Several entry doors lead to the same pipeline: the full step-by-step path, or a "Streamline" intake that lands users as far in as their material earns, with skipped stages clearly marked rather than missing. WD-IDEA-PHIL-066, WD-IDEA-PHIL-067, WD-IDEA-FLOW-074, WD-IDEA-FLOW-078.
- **(strong)** Many decisions were left as open option sets (automatic vs manual, generated vs uploaded, global vs per-scene, start-frame-only vs start+end frames, warn vs block, fork vs mutate). The sources do not crown a single winner; see 13 and the Options blocks in 01 to 11.

## 5. Continuity and persistent creative context

- **(strong)** A global-to-local model: approved project truth (story, style, master assets) is inherited by every scene; scenes add only local specificity and never rewrite global identity. WD-IDEA-CONT-001, WD-IDEA-PHIL-009, WD-IDEA-ASSET-001.
- **(strong)** Characters, props, and locations carry state across scenes (what they wore, what condition they are in, where the previous scene ended), with scene-level overrides that leave the master untouched. WD-IDEA-CONT-059, WD-IDEA-CONT-045, WD-IDEA-CONT-047.
- **(strong)** Continuity should grow from output as much as from up-front setup: reuse and edit approved frames, chain shot to shot, promote good frames to anchors. Tedious per-shot re-supply of images was named as erasing the product's time savings. WD-IDEA-PHIL-041, WD-IDEA-LOC-028, WD-IDEA-LOC-028.
- **(strong)** Changes cascade predictably and visibly: outdated work is explained and costed, not blocked; protection must never become unlock/relock ritual. WD-IDEA-UX-002, WD-IDEA-UX-044, WD-IDEA-UX-070.
- **(exploratory)** Continuity-drift detection, ghost/flicker comparison of end and start frames, region inpainting fixes, professional-grade advanced continuity tooling (all repeatedly deferred as nice-to-have/post-MVP). WD-IDEA-CONT-219, WD-IDEA-CONT-226, WD-IDEA-CONT-231.
- **(exploratory)** Perfect continuity was not always the stated goal: one creator note prioritizes quick, funny, true-to-intent output over professional-grade accuracy. See 13, WD-IDEA-PHIL-028.

## 6. Writing and story

- **(strong)** The script is the single source of truth that everything downstream expands from; approval is the clean hand-off from global planning to per-scene production. WD-IDEA-PHIL-008, WD-IDEA-FLOW-021.
- **(strong)** Scripts are written as visually explicit blueprints for image generation, not theatrical documents; emotions appear as visible physical behavior. WD-IDEA-STORY-034, WD-IDEA-STORY-035, WD-IDEA-GEN-025.
- **(strong)** Surgical AI editing: highlight-and-rewrite with a custom instruction, scoped reconciliation, staleness flags that never rewrite the user's work. WD-IDEA-STORY-069, WD-IDEA-STORY-082, WD-IDEA-STORY-101.
- **(exploratory)** A separate descriptive Master Document stage, lore library for a persistent story world, reverse sync from script to beats. WD-IDEA-STORY-126, WD-IDEA-STORY-104.

## 7. Visual identity, assets, locations, shots

- **(strong)** Identity is locked once and referenced many times: character consistency blocks, explicit style capsules chosen by the user, reference images outranking style text. WD-IDEA-CONT-042, WD-IDEA-ASSET-006, WD-IDEA-ASSET-030.
- **(strong)** Spaces need different handling than objects: canonical location identity early, spatial complexity late and only as needed. WD-IDEA-LOC-001, WD-IDEA-LOC-032, WD-IDEA-LOC-033.
- **(strong)** Shots are directed visually (what a viewer sees, camera position vs movement, blocking), with optional composition control through previs/blocking stills that own framing while other references own identity. WD-IDEA-SHOT-044, WD-IDEA-SHOT-035, WD-IDEA-SHOT-102.
- **(exploratory)** Auteur/film-sampling style capsules, experimental-technique suggestions, camera-complexity modes, integrated 3D blocking tool. WD-IDEA-SHOT-069, WD-IDEA-SHOT-073, WD-IDEA-SHOT-071, WD-IDEA-SHOT-070.

## 8. Generation, performance, and finishing

- **(strong)** Frame prompts and video prompts are separate artifacts: "what it looks like" belongs to the frame, "what happens" belongs to the video. Reference stacks are curated, not overloaded. WD-IDEA-GEN-004, WD-IDEA-GEN-011, WD-IDEA-GEN-124.
- **(strong)** Cost-awareness everywhere: estimate before spending, avoid redundant AI calls, never regenerate what upstream edits have already invalidated, cap retries. WD-IDEA-PHIL-054, WD-IDEA-PHIL-055, WD-IDEA-GEN-272, WD-IDEA-GEN-277.
- **(strong)** Review and repair route problems to the stage that owns them; media stages have no creative authority. WD-IDEA-CONT-027, WD-IDEA-FLOW-059, WD-IDEA-PHIL-037.
- **(strong)** Ultimately export finished video; professional editor hand-off (clean timeline package) is the aspiration beyond MP4. WD-IDEA-PHIL-095, WD-IDEA-PHIL-097, WD-IDEA-AV-066.
- **(exploratory)** Performance-first flows: recorded ad-libs overriding the script, voice-profile consistency, audio-first projects, swapping timbre while keeping inflection. WD-IDEA-AV-010, WD-IDEA-AV-028, WD-IDEA-AV-034.

## 9. Experience feel and product discipline

- **(strong)** Fast-flowing, never friction-inducing; effort is acceptable, tedium is not. A cinematic, editing-suite-like interface that stays intuitive. WD-IDEA-PHIL-032, WD-IDEA-PHIL-033, WD-IDEA-PHIL-029.
- **(strong)** Focus: one product for the middle, a North Star test applied to every feature, and resistance to feature sprawl even when features work well. WD-IDEA-PHIL-083, WD-IDEA-PHIL-084, WD-IDEA-PHIL-086.
- **(strong)** Determinism and explicitness: explicit inspectable inheritance, versioned context packages, no hidden AI memory, immutable-by-default history with branches. WD-IDEA-PHIL-043, WD-IDEA-PHIL-045, WD-IDEA-PHIL-047.
- **(exploratory)** Story Timelines as full git-style branching, collaboration, marketplaces, monitoring analytics. WD-IDEA-PHIL-049, WD-IDEA-UX-090.

## 10. Cross-cutting themes the sources return to

| Theme | Essence |
|---|---|
| Reduce repetitive labor | AI supplies the tedious parts (extraction, defaults, carry-forward, bulk actions); the user spends time on creative choices |
| Persistent context | Nothing the user decided is forgotten: established facts, locks, approved assets, end states |
| Human soul over generic output | Authorship, intent, and specific taste outrank volume and polish |
| Safe iteration | Every step reversible or branchable; costs shown before commitment |
| Honest degradation | When the system lacks a reference or confidence, it says so and falls back visibly instead of guessing silently |
| Shortcuts without breaking structure | Imports and fast paths land inside the pipeline with skipped stages marked |
