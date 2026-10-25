# Aiuteur V2

Aiuteur is a web application in which an individual creator makes an intentional AI-generated film while remaining its author. This glossary is the shared vocabulary for V2 planning and specification. It starts from Appendix B of the Product Constitution and adds the terms the domain model needs. Relationships, ownership, cardinality and identity rules live in `docs/domain/DOMAIN-MODEL.md`.

Terms marked **(Wayfinder)** are not constitutional glossary terms; they were proposed during V2 design and are defined in `docs/adr/0001-revisions-attempts-generations-jobs.md` and `docs/domain/LINEAGE-AND-STALENESS.md`.

## People and project

**Creator**:
The person making the film; the author. Every project has exactly one, and every creator has exactly one account.
_Avoid_: User, director

**Account (studio)**:
A creator's isolated space: their projects, media, settings, spend caps and usage records. Every project and every record belongs to exactly one account, and one account can never see or change another's data. Aiuteur serves many independent accounts, but there are no teams, shared projects, shared editing or permission roles. A project can later be purged with its media as a unit (see Purge). Accounts are invite-only.
_Avoid_: Workspace, team, organisation, tenant (as a product term), user

**Invite-only**:
How accounts are created until billing exists: a creator can sign up only with an invitation from the operator. It is an access rule, not a role.
_Avoid_: Waitlist, private beta (as a model term)

**Purge**:
Permanent, deliberate, creator-initiated destruction of a whole project or account with its media. A later requirement, not part of V2 core. It is different from Retire, which governs everything inside a project and never destroys.
_Avoid_: Delete (for a purge), hard delete

**Project**:
One film in progress, with its settings and everything below it. A duplicated project is a new project.
_Avoid_: Film (as an object), timeline, branch

**Project settings**:
The project-wide intent the creator sets at the start and may change: intended runtime, format and aspect, tone, rating, genre, and default model choices.
_Avoid_: Config, preferences

**Phase**:
One step of the creative workflow (Input, Interview, Treatment, and so on). A phase is a stage of work, never an object that holds creative content. "Stage entry" is the ratified Record 3 phrase for entering an eligible empty phase.
_Avoid_: Stage, wizard page

**Phase disposition**:
Whether a project-wide phase was completed, intentionally skipped, or bypassed by supplied material. Skipped and bypassed phases read as intended, never as missing.
_Avoid_: Stage status

## Story

**Source Material**:
One item the creator supplied (typed text or a file), kept as an unaltered original with a role that says what it is and how mature it is.
_Avoid_: Input file, upload, seed

**Interview**:
The conversation in which Aiuteur asks the creator questions until it understands what they want to make.
_Avoid_: Clarification, intake, questionnaire

**Established Fact**:
Development knowledge the AI must remember: a statement from inputs or uploaded documents, an Interview answer, a creator edit or an explicit creator decision. It binds AI drafting and revision (Treatment, Beat Sheet, Master Narrative, World Definition, Visual Style), checked by the fact check, and is never injected into generation prompts for frames, images, takes or audio. The AI never contradicts it; a creator's own contradicting edit supersedes it (Record 2 X3).
_Avoid_: Answer, requirement

**Treatment**:
The story as continuous prose; a development document.

**Beat Sheet**:
The story as a structured sequence of major events; a development document.

**Option**:
An unchosen generated alternative offered for an editable object, such as one of several treatments. Choosing an option makes its content the object's content; unchosen options stay recoverable.
_Avoid_: Variation, candidate

**Development history**:
The status of the Treatment and Beat Sheet after the Master Narrative is accepted: viewable and editable, but no longer kept in sync.

**Master Narrative**:
The single canonical, highly descriptive, scene-organized narrative document; the source of narrative truth for the whole project.
_Avoid_: Master script, script, enriched narrative

**Screenplay export**:
An AI condensation of the Master Narrative into conventional screenplay form with identical dialogue. A view, never a source.
_Avoid_: Screenplay (alone), script

**Accept**:
The creator's commitment of a document as the basis for what follows. Accepting the Master Narrative is a commitment point.

## World

**Entity**:
A reusable creative element with persistent identity that appears on screen: a Character, Location, Prop or Extra type. In the broad sense of Constitution §6.2, Visual Style, Writing Style and Voice are also entity types, but this glossary names them separately. "Asset" survives only as creator-facing UI wording (Asset roster, asset drawer, Record 5 SP6); never as a model term.
_Avoid_: Asset, element

**Character**:
Exactly this person, always: a specific individual with persistent identity.

**Location**:
A narrative space, such as a room, a street or a ship's bridge, seen from many viewpoints. A Location may lie inside another Location (a sub-location).
_Avoid_: Setting, set, background

**Prop**:
An important object with persistent identity.

**Extra type**:
A recognizable kind of background figure generated with natural variation; it has no individual identity.
_Avoid_: Extra archetype, background character

**Canonical identity**:
An entity's single creator-approved description plus its reference images. It is the one source of what the entity is.

**Lightweight entity**:
An entity defined by a text description alone, with no identity image required; generated from its text. Chosen by the creator and promotable to a detailed entity without changing identity.

**Deferred entity**:
An entity the creator chose not to define yet. It affects only the scenes and shots where it is needed and never blocks unrelated work.

**Look**:
A named, story-driven appearance of an entity (for example "Marcus, muddy suit"), anchored to its canonical identity and carried forward until the story changes it. The canonical identity is the base appearance; a Look specializes it.
_Avoid_: State, variant, costume, asset instance

**Look assignment**:
The stored statement that an entity takes a Look (or returns to its base) from a narrative position, either from there on or only for a bounded range such as a flashback. The Look in effect elsewhere is derived from these, never recorded per scene.
_Avoid_: Look state, scene Look

**Carry-forward**:
A Look staying in effect into later scenes until the story changes it. Derived from narrative position and Look assignments.

**Mention**:
A derived link between an entity and a passage of the Master Narrative (on-screen, referenced only, or setting). Rebuilt from the narrative; only the creator's confirmations and rejections are stored.
_Avoid_: Tag, appearance record

**Location coverage**:
The set of visual references needed to preserve a Location's spatial and visual identity: named directional Views. It starts from one canonical reference image; Directions come from the shots and the space their camera reveals (picked or proposed at shot planning, one or more per shot) or are added by the creator at any time; or, per Location, a single establishing image by choice (Constitution §6.4 and Appendix B as amended 2026-10-25, Record 2 D59, Record 6 §3).

**Identity readiness**:
Whether an entity is visually defined enough to use: an approved canonical description and identity image, or a deliberate lightweight text-only definition. Derived, quiet, never blocks. Distinct from Production coverage readiness.

**Production coverage readiness**:
Whether a Location has the additional Views the current shot plan needs (for example "3 production views needed"). Derived from every resolved Direction of each shot (by Look) against existing Views; reappears quietly when the plan changes. Never blocks and never triggers generation by itself.

**Base Look**:
An entity's default appearance. It equals the canonical identity, not a separate object; "no Look assignment in effect" means base. Alternate Looks are added only when needed.

**Direction**:
A named place to look from within a Location's coverage (for example "toward the window"), with a View Slot for each Look of the Location. A shot refers to one or more ordered Directions, as many as the space it reveals needs (Record 6 §3), never to one particular View. Directions may later belong to a Location spatial model (LATER, Constitution §15.3), so V2 never treats them as unrelated images.
_Avoid_: Angle, camera direction

**View**:
One image (an Attempt) filling a Direction's Slot for a given Look or the base appearance of a Location; one is active.
_Avoid_: Angle, camera direction

**Presence**:
The fact that an entity, in a particular Look, appears in a Scene or Shot. A Presence refers to the entity and Look; it never holds its own copy of their description.
_Avoid_: Scene asset, asset instance, assignment

**Asset roster**:
A shot's editable list of the entities in it, each with when it is on screen (throughout, enters, leaves, opening frame only, ending frame only), its state at opening and at ending, and an optional action note. The AI fills it in from the Master Narrative and World Definition; the creator adds, removes and edits. Each frame's entities follow from it.
_Avoid_: Scene assignment, shot assets list

**Shot-only state**:
A transient change to an entity within one shot (glass shatters, clothes soaked) recorded as a note on the asset roster. It shapes that shot only and never carries forward. A change that should persist is a Look change instead.
_Avoid_: Transformation (for a change that does not persist), temporary Look

**Visual Style**:
The project-wide look: medium, palette, mood, lighting and so on. Required, easy to set. Identity outranks style.
_Avoid_: Style capsule, art style

**Writing Style**:
Optional guidance for the voice of the written documents and dialogue.
_Avoid_: Style capsule (for writing)

**Voice**:
A Character's persistent, reusable voice identity: a plain-words description plus the creator's Supplied voice samples, a stock voice, or a designed voice (a chosen voice-design preview saved as its fixed identity), defined in World Definition and applied across the film. Generating speech needs a cloned, stock or designed Voice (Record 6 §1). It is not a provider object; a provider voice handle is created lazily per project (`docs/domain/VOICE-AND-PERFORMANCE.md` §1.1, §6.4).

**Line audio**:
The one chosen audio for a Dialogue line: a Performance, a Transformed performance or a Spoken line. With none chosen the line is native dialogue. Never trimmed or stretched to fit the shot.

**Voice authorisation**:
The creator's recorded, versioned, revocable attestation that they may use a voice (their own, permitted, licensed or synthetic), required before voice transformation or cloning. Revoking stops new use and marks dependants `authorisation-revoked`; it deletes nothing.

**Subject mapping**:
For Reference Media attached to a shot, the assignment of each subject in the media to a project entity (and Look), to removal, or to a generic extra. The media contributes composition, staging, motion or style, never identity.

**Reference Media**:
Creator-supplied images or video used for inspiration, parody or shot recreation. Subjects in it are replaced by project entities.
_Avoid_: Reference image (of an entity; that belongs to canonical identity)

## Production

**Scene**:
A narrative unit with stable identity, defined as a division of the Master Narrative; the organizing unit of production. Its identity is the id of its container block in the Master Narrative. It owns no narrative text of its own. It is active while the current Master Narrative contains it and retired otherwise; either way its production work stays attached.

**Scene mapping**:
The pre-commit step that decides which incoming scenes continue which existing scenes when a Master Narrative is regenerated or a revised screenplay is imported. Deterministic signals first, AI assistance only for ambiguity, and the creator confirms ambiguous or work-affecting items. Position is never identity.
_Avoid_: Scene matching by number, re-extraction

**Re-homing**:
A recorded Decision that changes which Scene a Shot belongs to, because its anchored text moved or the creator adopted work from a retired scene. Automatic only for the creator's own structural edits.

**Shot**:
One continuous camera moment that becomes one clip; the unit of generation. Every take comes from an explicit shot.
_Avoid_: Segment, setup

**Dialogue line**:
One attributed utterance, with delivery notes, inside a shot. It has its own identity so a Performance can be linked to it and a change to it can be written back or recorded as a deviation.
_Avoid_: Line (alone), caption

**Composition reference**:
A blocking capture, sketch, storyboard frame, reference image or video, or another Frame of the project (a reference shot) attached to a shot or one of its frames to control framing and staging.
A CineBlock capture is auto-linked by shot id on Send back, retired (never deleted) with its ✕, and always passes through image generation; it is never the frame itself.

**CineBlock** **(Wayfinder)**:
The Aiuteur module, opened in its own tab under the same account, where the creator blocks a scene with mannequins and primitives and captures start and end compositions. Not a separate app.
_Avoid_: Previs app, external tool

**Previs package** **(Wayfinder)**:
The versioned, internal handoff from the CineBlock tab to a scene's shots (echoed shot ids, captures, placeholders, camera, opaque scene state). An external package is imported with the same matching rules as storyboards and shot lists.

**Import tray** **(Wayfinder)**:
The quiet per-scene list of imported or returned items that matched no shot or matched ambiguously. Unresolved items stay there and block nothing.

**Frame**:
A still image for a shot, in a role such as opening or ending. A frame is an Attempt: every frame is kept, and the creator approves which one stands. It records its source (generated, uploaded, reused, edited, or extracted from a Take; a previs capture is never a Frame, it goes through image generation, Record 2 D61.3) and, for reuse and editing, the Frame it was derived from.
_Avoid_: Anchor, keyframe, frame attempt (a frame is the attempt)

**Frame plan**:
A shot's list of Frame roles the creator or AI wants (typically an opening; an ending optional; keyframes and other structures allowed), or an explicit skip. The skip is a creator Decision, and is different from not having decided yet. Defined in `docs/domain/SHOT-MODEL.md`.
_Avoid_: Frame structure, anchors

**Frame role**:
One entry of a Frame plan (opening, ending, or a keyframe with a position), each a Slot with its own approved Frame.
_Avoid_: Anchor

**Shot plan**:
A scene's ordered list of Shot ids, changed by Revisions, which also holds the plan-accepted Decision. The scope a shot-plan lock covers.
_Avoid_: Shot list (as an object), storyboard

**Continuity link**:
A shot's declared relation to the previous shot (cut, continues, same place with a new view, or match: a compositional match cut such as graphic, action or eyeline), with an optionally pinned source Frame or Take end. Resolved by one rule for single and batch generation, and for the first shot of a scene against the previous scene's last shot.
_Avoid_: Start continuity, chain

**Segment**:
One generator output, an immutable artifact made by one Generation and used to build a Take. A shot that fits one generator call has one Segment; a longer shot has several. Segments are kept and can be reused by a later Take.
_Avoid_: Clip, part (as a model term), shot (a Segment is never a Shot)

**Realization plan**:
The code-computed plan, from a shot's target duration and the chosen model's limits, of how many Segments make the Take and how (native extension or stitching). Recorded on the Generations, never on the Shot.
_Avoid_: Shot splitting (for a generator's limit)

**Unanchored shot**:
A shot with no anchor in the Master Narrative, such as an insert the creator adds. It gets the write-back or deviation choice once and never blocks.
_Avoid_: Orphan shot

**Take**:
One generated video attempt for a shot: one clip in the edit, built from one or more Segments. Takes accumulate and are never overwritten.
_Avoid_: Video, render, generation (a take is a result, not the request)

**Selected take**:
The take the creator currently chooses for a shot; review and export use it. A shot has at most one. Choosing is reversible; Mark final is a separate voluntary lock. Generate's *Use this Take* and Review's pick are the same Decision (Record 5 RB2).
_Avoid_: Final take

**Approve**:
The creator endorsing a frame, or an entity's identity, as standing. Distinct from Accept (documents) and Select (takes).

**Performance**:
A creator-recorded or uploaded voice or dialogue performance that a take can follow. Supplied, immutable creator material, never an Attempt; its voice-transformed version is a separate Attempt.
_Avoid_: Recording, reference audio

**Export package**:
The deliverable bundle: selected takes (named and ordered), frames, prompts and written documents. Built deterministically from existing material; it holds no creative truth of its own.
_Avoid_: Output, render, download

## Change, history and trust

**Revision** **(Wayfinder)**:
One recorded state of an editable object's content. Every change to an editable object adds a Revision; earlier Revisions stay recoverable, and restoring one adds a new Revision. A Revision is never a generated attempt.
_Avoid_: Version (in any model sense), snapshot, draft, save

**Attempt** **(Wayfinder)**:
An immutable generated or uploaded artifact offered for a place in the model that wants one chosen result. Attempts accumulate; one is chosen. Frames, takes and entity images are attempts. Editing an attempt produces a new attempt.
_Avoid_: Version, iteration, variant

**Slot** **(Wayfinder)**:
A place in the model that holds one chosen Attempt among many, such as a shot's video, a shot's opening frame, or a character's canonical image.
_Avoid_: Field, placeholder

**Generation** **(Wayfinder)**:
The permanent record of one request to an AI model to produce content: what was asked (the exact inputs), who initiated it, its cost, and what came of it. Its outputs are Attempts, Options, or the content of an AI-made Revision. A failed Generation has no outputs, unless a late result is later adopted (after a timeout) or attached (after a cancel).
_Avoid_: Take, render, run, job

**Job** **(Wayfinder)**:
One run of the background work that carries out a Generation or other long-running work (such as building an Export package), with its own execution lifecycle. A Generation has one or more Jobs; a retry is a new Job of the same Generation. It is operational, not creative truth, and may be pruned once settled. States, retry and cancellation rules are in `docs/domain/JOB-LIFECYCLE.md`.
_Avoid_: Task, generation, request

**Generation package** **(Wayfinder)**:
The single compiled object behind one request to a model: ordered Layers, carried references with roles, and typed parameters, plus the Fit report. It is derived from owned truth by a pure function and recorded on the Generation before the provider is called. Defined in `docs/domain/GENERATION-PACKAGE.md`.
_Avoid_: Prompt (the package is more than text), context

**Layer** **(Wayfinder)**:
One part of a Generation package, owned by a single domain (identity, place, composition, style and so on), with the captured inputs it was made from and a limited scope of what it may say.

**Fit report** **(Wayfinder)**:
The record of how a Generation package met the chosen model's limits: for each layer and reference whether it was carried, carried by another input, demoted, or omitted, and why. Nothing is cut inside a layer; a request that cannot fit is not sent.

**Rendered request**:
What a provider adapter is given to send: the text parts, media parts, parameters and declared provider rewrites after translation into the model's dialect. It is stored with the Generation and is the object the inspector shows.
_Avoid_: Final prompt

**Model** **(Wayfinder)**:
The product-level identity of a generator ("a video model") that defaults and overrides store. It is reached through one or more Offerings and is never a vendor endpoint. Defined in `docs/domain/PROVIDERS-AND-MODELS.md`.
_Avoid_: Provider (as a synonym), engine, endpoint

**Offering** **(Wayfinder)**:
One Model on one provider surface, with its adapter, price entries, lifecycle status and capability profile. The same Model on two surfaces is two Offerings. The creator never chooses an Offering.

**Capability profile** **(Wayfinder)**:
The reviewed, evidenced, immutable description of an Offering: input modes and the constraints between inputs, reference limits, durations, extension, outputs, audio, controls, limits, cost rule, run behaviour and known limitations. An unknown field means the conservative reading. Identified by a content-hash snapshot id recorded on every Generation.

**Catalogue** **(Wayfinder)**:
All Offerings, their profile snapshots, the operator's editorial quality ranking and tiers, and the operational overlay (status, enablement). Reviewed data, not code.

**Adapter** **(Wayfinder)**:
The per-provider-surface component that serialises a Rendered request, submits, observes, cancels, fetches and maps errors. It never chooses a model, builds content, retries or holds a key.

**Effective model** **(Wayfinder)**:
The Model and Offering that selection resolved for an action (shot override, project choice, or Automatic), with the reason codes, recorded on the Generation and shown on the control.

**Automatic** **(Wayfinder)**:
The default model setting: a policy over the Catalogue, evaluated per shot, with a quality, balanced or lowest-cost bias. It is a system default, not an AI-made choice.

**World model** **(Wayfinder)**:
A provider of the `world.generate` operation class that CineBlock uses to generate a world for blocking. A Model in the Catalogue like any other; operator-paid until BYOK, BYOK-capable afterwards. Its output is a framing source, never a frame or a clip.

**Need** **(Wayfinder)**:
One requirement a shot or operation places on a model, derived by code. Each need ends met, met by a declared fallback, limited, unmet-soft or unmet-blocking; a blocking need creates no Generation and offers exits.

**Override** **(Wayfinder)**:
The creator's persistent, layer-addressed edits to what is sent for a shot (replace a layer's text, add a note, turn a layer off, include or exclude a reference). It stays in effect when upstream changes, shows a quiet "base changed" note, and is never rewritten by regeneration.
_Avoid_: Custom prompt

**Batch** **(Wayfinder)**:
The record of one creator action that created several Generations at once (a scene's takes, a film's frames), with one approved total estimate and any dependencies between members. Members succeed, fail and are cancelled independently.
_Avoid_: Bulk job, queue

**Retry** **(Wayfinder)**:
A new Job for the same Generation after a run that was accepted and failed. Distinct from a regeneration (a new Generation chosen by the creator) and from a deferral (the provider refused before accepting, so the same Job waits and tries again).
_Avoid_: Regenerate (for a retry)

**Provenance**:
Whether content was written by the creator, imported by the creator, generated by AI, or edited by AI at the creator's request. A property of content, always knowable.
_Avoid_: Authorship tag, attribution

**AI-made choice**:
A material decision the AI made where the creator specified nothing; visible and overridable.
_Avoid_: Assumption

**Lineage** **(Wayfinder)**:
The recorded facts of what a piece of work was made from: the exact input slices a Generation captured at dispatch, and the Basis of an editable object drafted from upstream. Possibly out of date is derived from it.
_Avoid_: Dependency flag, invalidation

**Basis** **(Wayfinder)**:
The upstream slices an editable object (such as a Shot) was drafted or last reconciled against. The creator's own edits do not change it.
_Avoid_: Source, parent

**Acknowledgement** **(Wayfinder)**:
The creator's recorded decision to Keep or Reconcile work marked possibly out of date, at the content it was decided against. Clears the marker until that content changes again.
_Avoid_: Dismiss, resolve flag

**Decision** **(Wayfinder)**:
An append-only creator event such as choosing an Attempt, approving, accepting, locking, keeping or recording a deviation. Current state is the latest event; nothing is edited or removed.
_Avoid_: Setting, flag

**Action group** **(Wayfinder)**:
The correlation of every Revision and Decision written by one creator action (a bulk keep, an AI rewrite, a write-back), so the action can be reversed in one step.
_Avoid_: Transaction (for the creator-facing concept), batch

**Edit-through** **(Wayfinder)**:
Making an edit to locked work with a confirmation that carries the server-computed impact, without unlocking.
_Avoid_: Override, force

**Possibly out of date**:
A quiet, non-blocking marker, with a reason, on work an upstream change may have affected.
_Avoid_: Stale (in the UI), invalidated, broken, outdated

**Deliberate local deviation**:
A recorded, intentional difference between downstream work (for example a shot's line) and its upstream truth (for example the Master Narrative).
_Avoid_: Override (for narrative or identity truth), fork

**Write-back**:
Updating upstream truth (Master Narrative or entity) from a change made downstream, at the creator's choice.
_Avoid_: Sync back, propagate up

**Commitment point**:
A moment requiring explicit creator action: accepting the Master Narrative, or initiating meaningful spend.

**Lock**:
Non-blocking, always-unlockable protection on committed work, with friction proportional to the downstream work at risk. Locking is protection only; it is not approval, acceptance or selection.
_Avoid_: Finalize, freeze

**Gap slate**:
What sequence playback shows for a shot with no selected Take: a short slate that says which kind of gap it is, "3 takes · none picked · Pick" or "No take yet · Generate". Defined in `docs/ux/CANDIDATE-REVIEW-AND-PLAYBACK.md`.
_Avoid_: Placeholder, missing clip

**Spend ticket**:
The inline expansion of a generation control that shows the count, total, reasons and cap headroom when a confirm rule fires. Never a modal; a cap breach offers no Start. Defined in `docs/ux/CANDIDATE-REVIEW-AND-PLAYBACK.md`.
_Avoid_: Confirmation dialog

**Mark final**:
An optional, voluntary lock on a shot's chosen Take, for organization. It is not a commitment point: choosing a Take is a reversible selection, and a final Take can always be changed by unlocking, with nothing cascading. Defined in `docs/ux/TRUST-SIGNALS-AND-LOCKS.md`.
_Avoid_: Approve take, finalize

**Whisper**:
The default way Aiuteur shows trust signals: a small, low-contrast indicator beside the affected work, with the reason and the creator's options revealed on demand. It never fades or restyles the work and never blocks.
_Avoid_: Banner, alert, warning badge

**Review-all tray**:
An on-demand panel, opened from the quiet footer line, listing everything possibly out of date or awaiting a write-back or deviation choice, grouped by reason, with per-item and bulk Regenerate, It still fits and Keep. Never shown by default.
_Avoid_: Dashboard, inbox

**Meaningful spend**:
Spend requiring a displayed estimate and explicit creator authorization under the operation's policy, by default any Generation estimated at $0.05 or more and all video. Ordinary initial Treatment drafting is authorized by eligible stage entry without a penny-level price gate, but exceptional conditions still require the inline spend ticket: $2.00 or more in total, 10 or more Generations with take batches counting Takes, bulk regenerate by filter, unknown pricing or reaching a cap ([Record 3](docs/product/CREATOR-RATIFICATION-RECORD-3.md), `docs/domain/BUSINESS-AND-OPERATIONS.md` §3).

**Trivial spend**:
A Generation estimated below $0.05. Needs no confirmation and may auto-retry when otherwise safe.
_Avoid_: Free, cheap

**Scene workspace** **(Wayfinder)**:
The main centre workspace for one scene, where the creator preps and makes its shots, in three steps shown as a pipeline: Scene Prep, Generate and Review (Record 5). Shot work is never confined to a side drawer. The rejected drawer is the Peek-style side editor; Record 5's asset and Generate drawers are panels inside the centre workspace.

**Scene Prep** **(Wayfinder)**:
The scene workspace step where shots are planned and what is in each is set: the Storyboard on arrival, the Shot editor under a horizontal shot strip, the fold-down Cast & Looks matrix and the asset drawer.
_Avoid_: Plan tab, Shots & Assets

**Storyboard (view)** **(Wayfinder)**:
Scene Prep's arrival view: one card per shot of the Shot plan in story order, showing its opening frame. A view of the plan, distinct from an imported storyboard, whose panels become Composition references.

**Generate** **(Wayfinder)**:
The scene workspace step for one selected shot, with a Frames | Takes toggle: Frames makes and approves its frames; Takes makes its Takes with the take composer and shows that shot's Takes.
_Avoid_: Frames & Prompts, Takes tab

**Take composer** **(Wayfinder)**:
The one control set for making a Take: video prompt and ingredients, frame inputs, references, guidance, model, price, dialogue performances, Generate Take. Shown in Generate's Takes drawer and opened wide from Review's Make another take.

**Reference library** **(Wayfinder)**:
The visual drawer opened by Add reference image: the film's frames (this scene first), uploaded Reference Media, storyboard panels and CineBlock captures, each badged by origin. Picking one attaches a Composition reference.

**Peek** **(Wayfinder)**:
A lightweight side preview of a shot or scene. It shows and links; it is never the only way to do anything and never initiates spend.
_Avoid_: Drawer, inspector

**Skipped by you** / **Bypassed** **(Wayfinder)**:
Two honest, intentional phase states. Skipped: the creator declined a recommended phase. Bypassed: supplied material already covers it. Neither means missing or broken.

## Story documents (Wayfinder #51)

**Block**:
An addressable unit of a story document (paragraph, beat, scene, action, dialogue) with a permanent opaque id that survives edits, moves, splits, merges and rewrites.
_Avoid_: Node, section, line (as an identity)

**Run**:
A maximal stretch of text in a block field with one provenance. Provenance lives on runs, so it is exact to the character.
_Avoid_: Span (as the stored unit), annotation

**Working copy**:
The continuously, durably saved current content of a document. It is not a Revision.
_Avoid_: Draft version, autosave version

**Correspondence**:
The links between beats and the chosen Treatment's paragraphs, with a base recording what each side said when they last agreed.
_Avoid_: Sync flag, outdated flag

**Drift**:
The computed, quiet difference between a linked beat and its passage relative to the base. Never a stored flag; never blocks.
_Avoid_: Out of sync (as a stored state)

**Sync**:
Before Master Narrative acceptance, the collective name for the creator-pressed update actions (Update Treatment to match Beat Sheet, primary; Update Beat Sheet from Treatment, reverse) that bring a beat and its passage back into agreement without deleting or overwriting protected spans. One Generation, one undoable Revision per target. Never automatic.

**Disagreement check**:
Before drafting or accepting the Master Narrative, if Treatment and Beat Sheet disagree, Aiuteur shows it and asks which to follow; it never guesses.

**Reverse generation**:
An explicit AI generation of a bypassed or development-history document (for example beats) from the Master Narrative.

**Update Treatment to match Beat Sheet**:
The creator-pressed action (Beat Sheet page, per beat or whole pair) that revises the corresponding Treatment passages to reflect newer Beat Sheet decisions while preserving unrelated detail. Protected spans are held for one-click approval; one Generation and one `sync` Revision. The reverse, "Update Beat Sheet from Treatment", is also available. Never automatic.
_Avoid_: Auto-sync, push to Treatment

**Notes (writing)**:
Creator annotations on a passage or beat in a story document. Not document text, no provenance, not sent to the AI unless the creator ticks "use my notes" on a regeneration request (per request, unticked by default).
_Avoid_: Comments, instructions (those are optional guidance on a request)

## Architecture (Wayfinder #71)

Terms that cross the module boundaries. Defined in `docs/architecture/MODULE-ARCHITECTURE.md` and [ADR 0016](docs/adr/0016-modules-follow-ownership-of-truth-and-every-write-passes-one-history-gate.md).

**Write gate** **(Wayfinder)**:
The single commit path of the `history` module through which every Revision, retirement and Slot choice passes. It checks the Account and project, lock state, the base Revision and the kind's invariants, and appends in one transaction. Nothing else can change creative truth.
_Avoid_: Middleware, validator, save endpoint

**Change** **(Wayfinder)**:
An ordered set of appends (Revisions, Attempts, Decisions, captured inputs, Acknowledgements) that a domain module plans and the write gate commits together or not at all. One creator action is one Change in one action group.
_Avoid_: Patch, transaction (for the creator-facing concept)

**Edit session** **(Wayfinder)**:
The server-held grant created when the creator confirms an edit-through on a locked scope. It carries the impact version the creator saw and ends on unlock, an explicit end, an impact change or idle expiry. It is not a screen flag.
_Avoid_: Unlock, override

**Scope** **(Wayfinder)**:
The Account, project and creator on whose behalf a call runs, obtained only from authentication (or, for background work, from the Account recorded on the Job or event). Every data operation takes one.
_Avoid_: Tenant, permission, role

**Read model** **(Wayfinder)**:
A derived, read-only representation built for a screen (Outline, Board, shell strip, Ledger, review-all tray, inbox). It is computed on read or maintained in the transaction that changes its inputs, and it holds no truth that exists nowhere else.
_Avoid_: View state, store, cache (as a source)

**Initiation** **(Wayfinder)**:
The proof that a creator's action (or a creator-enabled trigger recorded as a Decision) started an operation. Only the application boundary can mint one, and creating a Generation requires one, so no timer, event handler or model output can start AI work.
_Avoid_: Trigger, permission

## Runtime (Wayfinder #74)

Terms for the execution substrate. Defined in `docs/architecture/RUNTIME-PLATFORM.md` and [ADR 0017](docs/adr/0017-the-job-row-is-the-queue-on-plain-postgres-with-own-sse-progress.md).

**Due time** **(Wayfinder)**:
The single stored moment at which a non-terminal Job next needs attention: the earliest of its `not_before`, next poll, lease expiry and state deadline. Finding Jobs whose due time has passed is the whole of scheduling, including the deadline sweep.
_Avoid_: Timer, cron job, schedule

**Lease** **(Wayfinder)**:
The exclusive, time-limited right of one worker to act on a Job, carried as a row value with a fencing token. A worker that loses its lease cannot change the Job, because every transition is checked against the token. It is never a database session or lock.
_Avoid_: Lock (a lock is creative-truth protection, ADR 0005), session lock

**Event stream** **(Wayfinder)**:
The per-Account, gap-free, ordered sequence of content-free events (ids, types, statuses) written in the transaction that causes them, replayed to the browser by server-sent events using the last seen number. It carries hints; read models are the truth.
_Avoid_: Websocket feed, push notification

**Process role** **(Wayfinder)**:
A way of starting the one deployable: `web` (API, event stream, webhook ingress) or `worker` (scheduler tick, provider calls, media and local work). Roles share the module graph and hold no workflow state in memory.
_Avoid_: Service, microservice

## Operations (Wayfinder #75)

Terms for the operational baseline. Defined in `docs/architecture/OPERATIONAL-BASELINE.md` and [ADR 0018](docs/adr/0018-own-auth-in-our-database-envelope-held-credentials-and-an-independent-backup-copy.md).

**Invitation** **(Wayfinder)**:
The single-use, expiring, email-bound token by which the operator lets one person create an Account. Redeeming it creates the sign-in and the Account together; there is no other way in.
_Avoid_: Signup link, waitlist spot

**Credential handle** **(Wayfinder)**:
An opaque, unserialisable reference to a provider key resolved for one Account and provider surface. Adapters receive it and never read a key or the environment.
_Avoid_: API key (in domain code), token

**Isolation gate** **(Wayfinder)**:
A merge-blocking test that proves one Account cannot read, change or learn of another's data on a given path (operations, stream, worker, webhook, media, operator views).
_Avoid_: Security review

**Independent copy** **(Wayfinder)**:
A backup held at a second vendor under credentials that cannot delete. For media it is required before the first non-owner invitation (Backblaze B2, copy-only-new, Record 6 §4); for the database it is a deferred option (Record 2 P12.3) beside the floor of a daily dump plus continuous WAL archiving off the machine (OPERATIONAL-BASELINE §8.1).
_Avoid_: Mirror, replica (as a product term)

## Persistence (Wayfinder #72)

Terms for stored history and media. Defined in `docs/architecture/PERSISTENCE-AND-MEDIA.md` and ADRs 0019 to 0023.

**Committed Media** **(Wayfinder)**:
A piece of media that a Frame, Take, entity image, View, Supplied item or Performance refers to, stored privately under exactly one project. It never changes, never has zero referrers, and is deleted only by a project or account Purge. Identical bytes inside one project are the same Media.
_Avoid_: Asset, file, upload (for the stored object)

**Staging** **(Wayfinder)**:
The temporary holding place for bytes that are being fetched from a provider or uploaded and have not yet been verified. Nothing in staging is creative truth, and it expires on its own.
_Avoid_: Draft media, temp file

**Rendition** **(Wayfinder)**:
A rebuildable derivative of Committed Media made for viewing or delivery (thumbnail, poster, playback copy, export build). It holds no truth, is never referenced by creative work and may be discarded and regenerated.
_Avoid_: Transcode (unless bytes are actually re-encoded), proxy

**Frozen fingerprint** **(Wayfinder)**:
The content fingerprint recorded for a unit of an object at the moment a Revision was written, which later captures compare against. Its meaning never changes: if what a unit covers must change, a new unit is defined.
_Avoid_: Checksum, version hash

**Global reference data** **(Wayfinder)**:
Platform-wide data that belongs to no Account and holds no creator content, such as the model Catalogue snapshots and the price registry. Everything else Aiuteur stores belongs to exactly one Account.
_Avoid_: Shared data, system data

## Verification and observability (Wayfinder #76)

Terms for how Aiuteur is tested and traced. Defined in `docs/architecture/VERIFICATION-AND-OBSERVABILITY.md` and [ADR 0026](docs/adr/0026-the-generation-record-is-the-trace-and-test-providers-are-contract-verified-and-marked.md).

**AI trace** **(Wayfinder)**:
The Generation record read as a chain of stored ids: request, action, Batch, Generation, call, Job and run, provider operation reference, and the Attempt it produced. It is rows written with the work, not a callback or a vendor service. Its content is readable only under the creator's Scope.
_Avoid_: Tracing backend, telemetry (for the record itself)

**Content tier** **(Wayfinder)**:
One of three classes of recorded data: **A** content-free ids, codes, counts, costs and durations (logs, error tracker, alerts, operator views); **B** content such as the Rendered request, call log and raw responses (creator's Scope only); **C** media bytes. Data never moves from B or C into A.
_Avoid_: Log level, privacy level

**Test provider** **(Wayfinder)**:
A fake Offering (`kind: fake`) that stands in for a real provider outside production. It passes the same conformance suite as real adapters, its outputs are visibly watermarked, and every Generation it serves is marked as made by a test provider.
_Avoid_: Mock provider, stub

**Conformance suite** **(Wayfinder)**:
One set of tests for a port, run against its real and its fake adapter so the fake cannot drift unnoticed. For a provider adapter, the real run is a small live probe subset.
_Avoid_: Parity test

**Golden project** **(Wayfinder)**:
A fixed synthetic project used by tests. **GP-S** is a small project authored as replayed commands that covers every kind and state; **GP-L** is a 250-shot project generated from a seed for performance budgets. Never captured from a creator's work.
_Avoid_: Fixture project (for GP-S or GP-L), demo project

**Golden workflow** **(Wayfinder)**:
The seven steps of the "Aiuteur works" bar run as scripted browser scenarios (from a rough paragraph; from the creator's own screenplay) on replay, plus a live **bar run** judged by a person.
_Avoid_: E2E test (alone)

**Live smoke** **(Wayfinder)**:
A scheduled check that sends the cheapest real request to each Offering (or real model) under a spend-capped staging Account. Its content-free result is the evidence that enabling or promoting depends on; it never gates a merge.
_Avoid_: Integration test

**Recorded proposal** **(Wayfinder)**:
A real model output captured from a staging run on synthetic input, stored with its input and model snapshot, and replayed by operation and scenario step to test guards, validation and attach without a model.
_Avoid_: Cassette, mock response

**Eval set** **(Wayfinder)**:
A versioned set of tagged synthetic cases, each naming the risk it probes, used to judge prompt and model changes: code checks rates and invariants, a person judges what only a person can.
_Avoid_: Benchmark, test suite

**Scenario script** **(Wayfinder)**:
A content-free list of provider behaviours exported from a Generation's run history that a test provider replays to reproduce a lifecycle failure.
_Avoid_: Recording, trace dump

**Tracer bullet (T0)** **(Wayfinder)**:
The first, kept (not throwaway) end-to-end path through every layer: a pasted paragraph, a real-model Treatment Option, a Frame and a Take from real providers, run by the worker, stored, streamed and recoverable. It proves the architecture and completes no phase. Defined in `docs/architecture/BUILD-SEQUENCE.md`.
_Avoid_: Prototype, spike, proof of concept

**Vertical slice (VS)** **(Wayfinder)**:
One increment of the build that follows a phase of the Constitution's workflow thinly from interface to storage and moves the golden workflow's seed boundary. Not a lineage slice (the unit a Generation captures).
_Avoid_: Sprint, phase (for build order), layer

**Seed boundary** **(Wayfinder)**:
The point in the golden workflow before which steps are replayed from golden-project commands and after which they run through the real UI. Each vertical slice moves it one phase earlier; at the bar nothing is seeded.

**Early interface (EI)** **(Wayfinder)**:
An interface built in the tracer or a CORE slice so that an IMPORTANT capability lands later without redesign. Listed in `docs/architecture/BUILD-SEQUENCE.md` §5.

## Swarm readiness (Wayfinder #78)

Defined in `docs/architecture/SWARM-READINESS.md`.

**Frozen contract** **(Wayfinder)**:
A module's published surface (FC1 to FC11 at T0 exit, others at the exit of the slice that completes them) that changes only through a contract amendment. Before its freeze it is Draft.
_Avoid_: Locked contract (a Lock is creative domain state)

**Contract amendment** **(Wayfinder)**:
The recorded, owner-approved, version-bumping change to a frozen contract that migrates every caller in one change and is re-verified by every consuming lane.
_Avoid_: Contract update, hotfix

**Lane** **(Wayfinder)**:
A set of modules and paths one agent group owns (story, world, generation, delivery, platform); never a layer.
_Avoid_: Team, layer

**Change record** **(Wayfinder)**:
The content-free note kept with every change: lane, contracts touched, evidence, decisions, and what was raised.
_Avoid_: Report, commit message

## Reference

**Design reference**:
A legacy idea that design may adopt, adapt or replace; neither mandated nor banned.

**Media**:
The stored image, video or audio content itself, distinct from the object that gives it meaning. Media is immutable; reusing it inside a project shares it, while a duplicated project or a copy-on-use gets its own copy.
_Avoid_: File, asset

## Record 2 terms

- **Removed from Story**: Outline group for scenes retired by a narrative change that keep all their work; offers Bring back and Adopt work.
- **Ad-hoc shot**: a shot with no parent scene and no narrative anchor, kept in the project's Ad-hoc shots section; excluded from runtime and playback, exported separately, movable into a scene.
- **Superseded Fact**: an Established Fact quietly marked superseded when the creator's own edit contradicts it (a Revision, with Undo).

## Identifier namespaces

Codes collide across documents, so every cross-document cite carries a document or Record prefix ("Record 2 P3", "AI-map G3", "Package P3"). Codes are never renamed.

| Namespace | Codes | Where defined |
|---|---|---|
| Record 1 | R#, M# | `CREATOR-RATIFICATION-RECORD.md` |
| Record 2 | P#, D#, X# | `CREATOR-RATIFICATION-RECORD-2.md` |
| Records 3 to 5 | CR, W/Y, A5 SP GN RL RB VP | Records 3, 4 and 5 |
| AI-map guards | G1–G10 | `AI-RESPONSIBILITY-MAP.md` |
| Isolation gates | G1–G11 | OPERATIONAL-BASELINE §11 (VC7) |
| Build rules | R1–R26 | MODULE-ARCHITECTURE, PERSISTENCE-AND-MEDIA, VERIFICATION-AND-OBSERVABILITY, SWARM-READINESS (R1–R13, R14–R18, R19–R24, R25–R26) |
| Package checks | P1–P11 | `GENERATION-PACKAGE.md` |
| Persistence | P1–P7 | `PERSISTENCE-AND-MEDIA.md` |
| Provider limitations | L1–L18 | `PROVIDERS-AND-MODELS.md` |
| Provider facts | F1–F12 | `PROVIDERS-AND-MODELS.md` |
| Verification live layers | L1–L3 | VERIFICATION-AND-OBSERVABILITY §5.4 |
| Drift checks | D1–D10 | PERSISTENCE-AND-MEDIA (VC8) |
| Runtime rules | RT1–RT6 | `RUNTIME-PLATFORM.md` |
| Verification, build, slices | VC, FC, EI, VS, IW, S, E1/E2 | VERIFICATION, SWARM-READINESS, BUILD-SEQUENCE |

## Added terms (#79)

**Review** (the step):
The third step of the scene workspace after Scene Prep and Generate: playback and picking of Takes (Record 5 RB). Distinct from **Review & Export**, the project-level section for scene or whole-film playback and the export package.

**Dialogue track**:
The assembled audio of a shot's chosen Line audio (VOICE-AND-PERFORMANCE); not a separate creative object the creator edits.

**Shot editor**:
The centre editor for one shot in Scene Prep (action, dialogue and delivery, camera, cut, frame strategy), opened from a Storyboard card (Record 5 SP).

**Shot strip**:
The persistent horizontal strip of a scene's shots under the Shot editor, used to move between shots.

**Cast & Looks**:
The fold-down panel in Scene Prep (collapsed by default) showing the shot's Presences and their Looks.

**Scene ribbon**:
The per-scene ribbon of the Script Hub (Board); it shares one component with the Review timeline (Record 5 SP7).

**Manifest** / **Export manifest**:
The record of what an export contains, built from the selection: ordered Takes, files, documents, and per-Take `synthetic` provenance read from the Generation (OPERATIONAL-BASELINE §15).

**Dispatch gate** (PROVIDERS F3):
The check immediately before `submit` that refuses a send that is unauthorised, unfit or fake in production.

**Highlight AI vs mine**:
The toggle that shows provenance runs in a document; it changes no stored byte.

**Settings**:
The one app area for account settings (Treatment option count, per-family model choice), spend caps and the usage view, and project settings (including Writing Style). See NAVIGATION §4.

**Draft plan** / **Draft all**:
Creator-initiated AI drafting of a shot plan for a scene (priced, auto only below the $0.05 rule) / the bulk form across scenes.

**Evidence record**:
A stored result of a gate, live run or drill (date, build digest, outcome) that promotion or BAR reads (VERIFICATION-AND-OBSERVABILITY).

**Settler**:
The module-registered function that applies a Job's terminal outcome in the one settling transaction (MODULE-ARCHITECTURE).

**Composition root**:
The one place per process that wires concrete adapters to ports; production roots refuse fakes.

**Outbox**:
Events written in the settling transaction and delivered to the stream; delivery hints, not the source of truth.

**Restore test**:
The required successful restore of off-machine backups into a fresh Postgres, plus a media sample from the independent copy, recorded with date, duration and recovery point; a BAR condition (OPERATIONAL-BASELINE §9).

**FakeTransport**:
The test-only provider transport that the conformance suite holds to the same contract as real adapters; never loaded in production.

**Operation class**:
The closed vocabulary naming a kind of provider operation (`image.frame`, `video.take`, `audio.voice`, `world.generate`, and so on) (PROVIDERS-AND-MODELS).

**Adoption** / **late result**:
Taking a provider result that arrives after its Job ended; it attaches as an unselected Attempt (JOB-LIFECYCLE).

**Transformed performance**:
A Line audio candidate made from a Performance by voice transformation, preserving delivery (VOICE-AND-PERFORMANCE).

**Spoken line**:
A Line audio candidate generated from a line's text and delivery in the Character's Voice, with no Performance ("Generate as Character Voice", `audio.speech`; Record 6 §1).

**Voice sample**:
Uploaded audio used to define or clone a Voice; Supplied media.

**Native dialogue**:
Dialogue spoken by the video model itself from the request, when no Line audio is chosen.

**Revoiced Take**:
A new Take derived from a native Take whose speech was transformed into the Character's Voice; the picture is reused and the source Take is untouched. Not selected automatically and not a Line audio candidate; offered only with one speaking Character or declared speaker isolation; never offers write-back. Optional and best-effort (Record 6 §1).

**Generate unvoiced lines**:
A batch action in a shot's Dialogue section, or for a whole scene, that makes a Spoken line for every line with no chosen Line audio. The control shows the line count and total price first; the usual spend checks apply; results become the chosen Line audio (Record 6 V6.4).

**Designed voice**:
A Voice whose fixed identity is a voice-design preview the creator picked; basis `synthetic`, no attestation (Record 6 V6.1).

**Interview turn**:
One question and answer exchange in the Interview (INTAKE-AND-INTERVIEW).

**Action id**:
The id that makes a repeated creator command idempotent.

**Unselect**:
Clearing a shot's selected Take, returning it to "needs a pick".

**Fix this shot**:
Review's jump to a shot's workspace to repair it, with a way back.
