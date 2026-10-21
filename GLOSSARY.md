# Aiuteur V2

Aiuteur is a web application in which an individual creator makes an intentional AI-generated film while remaining its author. This glossary is the shared vocabulary for V2 planning and specification. It starts from Appendix B of the Product Constitution and adds the terms the domain model needs. Relationships, ownership, cardinality and identity rules live in `docs/domain/DOMAIN-MODEL.md`.

Terms marked **(Wayfinder)** are not constitutional glossary terms; they were proposed during V2 design and are defined in `docs/adr/0001-revisions-attempts-generations-jobs.md` and `docs/domain/LINEAGE-AND-STALENESS.md`.

## People and project

**Creator**:
The person making the film; the author. Every project has exactly one, and every creator has exactly one account.
_Avoid_: User, director

**Account (studio)**:
A creator's isolated space: their projects, media, settings, spend caps and usage records. Every project and every record belongs to exactly one account, and one account can never see or change another's data. Aiuteur serves many independent accounts, but there are no teams, shared projects, shared editing or permission roles. A project can later be purged with its media as a unit (see Purge).
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
One step of the creative workflow (Input, Interview, Treatment, and so on). A phase is a stage of work, never an object that holds creative content.
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
A binding statement of the creator's intent, from an interview answer or stated by the creator elsewhere. No generation may contradict it.
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
A reusable creative element with persistent identity that appears on screen: a Character, Location, Prop or Extra type. In the broad sense of Constitution §6.2, Visual Style, Writing Style and Voice are also entity types, but this glossary names them separately.
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
A Location's set of directional views (walls or angles). Multi-direction by default; a single establishing image by choice.

**Direction**:
A named place to look from within a Location's coverage (for example "toward the window"), with a View Slot for each Look of the Location. A shot refers to a Direction, never to one particular View.
_Avoid_: Angle, camera direction

**View**:
One image (an Attempt) filling a Direction's Slot for a given Look or the base appearance of a Location; one is active.
_Avoid_: Angle, camera direction

**Presence**:
The fact that an entity, in a particular Look, appears in a Scene or Shot. A Presence refers to the entity and Look; it never holds its own copy of their description.
_Avoid_: Scene asset, asset instance, assignment

**Visual Style**:
The project-wide look: medium, palette, mood, lighting and so on. Required, easy to set. Identity outranks style.
_Avoid_: Style capsule, art style

**Writing Style**:
Optional guidance for the voice of the written documents and dialogue.
_Avoid_: Style capsule (for writing)

**Voice**:
A Character's persistent voice identity.

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
A blocking capture, sketch, storyboard frame or reference image or video attached to a shot to control its framing and staging.

**Frame**:
A still image for a shot, in a role such as opening or ending. A frame is an Attempt: every frame is kept, and the creator approves which one stands. It records its source (generated, uploaded, reused, edited, extracted from a Take, or captured from a composition reference) and, for reuse and editing, the Frame it was derived from.
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
A shot's declared relation to the previous shot (cut, continues, or same place with a new view), with an optionally pinned source Frame or Take end. Resolved by one rule for single and batch generation, and for the first shot of a scene against the previous scene's last shot.
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
The take the creator designates as a shot's final one; review and export use it. A shot has at most one.
_Avoid_: Final take

**Approve**:
The creator endorsing a frame, or an entity's identity, as standing. Distinct from Accept (documents) and Select (takes).

**Performance**:
A creator-recorded or uploaded voice or dialogue performance that a take can follow.
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
The permanent record of one request to an AI model to produce content: what was asked (the exact inputs), who initiated it, its cost, and what came of it. Its outputs are Attempts, Options, or the content of an AI-made Revision. A failed Generation has no outputs.
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
Generation cost the creator must initiate and see the estimate for first: any Generation estimated at $0.05 or more, and all video. A separate confirm step applies at $2.00 or more in total, 10 or more Generations, bulk regenerate by filter, an unknown price, or reaching a cap (`docs/domain/BUSINESS-AND-OPERATIONS.md` §3).

**Trivial spend**:
A Generation estimated below $0.05. Needs no confirmation and may auto-retry when otherwise safe.
_Avoid_: Free, cheap

**Account**:
A creator's identity and isolated studio: its projects, media, settings, caps and usage. Accounts are invite-only and never share data; there are no teams or shared editing.
_Avoid_: User, tenant, workspace

**Operator**:
The deployment role that runs the service and pays provider bills with server-held keys. Not a collaborator in creators' projects.

**Spend cap**:
A limit a creator sets on their own Account's spend (daily, monthly, optionally per action). Reaching one needs the creator's explicit confirmation to proceed.

**Operator ceiling**:
A small hidden per-Account limit on operator-paid spend that exists only until BYOK. Not creator-adjustable.

**BYOK**:
Bring your own provider key: a creator pays providers with their own key. A priority follow-on to the core build; the seam exists from the start.

**Retire**:
To take an object out of active use while keeping it, and everything attached to it, recoverable. V2 retires; it does not delete creative work.
_Avoid_: Delete, remove (for creative objects)
"Never destroyed" applies inside a project. Whole-project and account removal is a Purge, a separate deliberate operation. Each project's data and media must stay separable so a purge can be added later.

**Protected span**:
Text the AI must not alter in an operation: everything outside a targeted rewrite's selection, and creator-written or imported dialogue inside a regenerated region. Preserved by construction (the AI refers to it, code restores it), not by instruction. Defined in `docs/ai/AI-RESPONSIBILITY-MAP.md`.
_Avoid_: Locked text (Lock is protection on committed work)

**Held result**:
An AI output withheld from the project because it conflicts with an Established Fact, its base text changed during the call, or its target is in a locked scope. It is kept recoverable as an Option on its Generation, nothing is applied, and the creator decides to use it anyway, adjust the Fact, regenerate or discard.
_Avoid_: Rejected (a rejected output failed a guard and is not offered)

**Fact check**:
An independent AI check of new content against Established Facts, whose verdict must quote the content it objects to. It is the enforcement point for "no generation contradicts an Established Fact".
_Avoid_: Validation (alone; validations are deterministic)

**Open question**:
One item the Interview still needs the creator to resolve, with its evidence and the AI-made choice that would result if skipped. "Sufficiently informed" means no material open question remains; it is advisory, and only the creator moves the project on.
_Avoid_: Clarification

**Ledger**:
The side panel of the Interview listing Established Facts and AI-made choices, grouped by topic and editable in place. Defined in `docs/ux/INTAKE-AND-INTERVIEW.md`.

**Workflow operation**:
A defined, code-bounded action the creator invokes: a button, an enabled auto-trigger, a targeted instruction field or a scope-then-invoke batch (for example Generate Master Narrative, Draft all scene plans, Regenerate flagged shots, Auto-block all, Generate missing location views, Rewrite this selection). The application fixes its steps and scope; the model makes creative choices only inside it, and the operation runs end to end without repeated permission prompts. Spend rules still apply to batches. It is not an agent: the model never chooses steps or scope. V2 has no universal chat agent; the project-aware assistant is LATER.
_Avoid_: Agent, agentic loop, autopilot (a LATER end-to-end mode)

**Interview topic**:
A grouping of open questions (for example story, characters and locations, visual and audio style) that the creator can answer personally or delegate to Aiuteur. A guiding label, not a fixed schema; later decisions may supersede the list.

## Navigation

**Outline** **(Wayfinder)**:
The persistent left sidebar inside a project: the film as a document, listing every phase and every scene in one tree, with each phase's honest status. Opens whatever is selected in the centre workspace.
_Avoid_: Phase rail, wizard, stage list

**Board** **(Wayfinder)**:
The whole-film centre view: every shot as one mark, one row per scene, coloured by derived status. Where scope is selected for batch actions.
_Avoid_: Script Hub, dashboard

**Scene workspace** **(Wayfinder)**:
The main centre workspace for one scene, where the creator preps and makes its shots: shot list, plan, optional direction, frames, takes, optional audio. Shot work is never confined to a side drawer.

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
Before Master Narrative acceptance, the creator-pressed action that brings a beat and its passage back into agreement without deleting or overwriting protected spans. One Generation, one undoable Revision per target.

**Disagreement check**:
Before drafting or accepting the Master Narrative, if Treatment and Beat Sheet disagree, Aiuteur shows it and asks which to follow; it never guesses.

**Reverse generation**:
An explicit AI generation of a bypassed or development-history document (for example beats) from the Master Narrative.

## Reference

**Design reference**:
A legacy idea that design may adopt, adapt or replace; neither mandated nor banned.

**Media**:
The stored image, video or audio content itself, distinct from the object that gives it meaning. Media is immutable; reusing it shares it.
_Avoid_: File, asset
