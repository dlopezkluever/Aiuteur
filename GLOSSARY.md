# Aiuteur V2

Aiuteur is a web application in which an individual creator makes an intentional AI-generated film while remaining its author. This glossary is the shared vocabulary for V2 planning and specification. It starts from Appendix B of the Product Constitution and adds the terms the domain model needs. Relationships, ownership, cardinality and identity rules live in `docs/domain/DOMAIN-MODEL.md`.

Terms marked **(Wayfinder)** are not constitutional glossary terms; they were proposed during V2 design and are defined in `docs/adr/0001-revisions-attempts-generations-jobs.md`.

## People and project

**Creator**:
The person making the film; the author. Every project has exactly one.
_Avoid_: User, director

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
A narrative unit with stable identity, defined as a division of the Master Narrative; the organizing unit of production. It owns no narrative text of its own.

**Shot**:
One continuous camera moment that becomes one clip; the unit of generation. Every take comes from an explicit shot.
_Avoid_: Segment, setup

**Dialogue line**:
One attributed utterance, with delivery notes, inside a shot. It has its own identity so a Performance can be linked to it and a change to it can be written back or recorded as a deviation.
_Avoid_: Line (alone), caption

**Composition reference**:
A blocking capture, sketch, storyboard frame or reference image or video attached to a shot to control its framing and staging.

**Frame**:
A still image for a shot, in a role such as opening or ending. A frame is an Attempt: every frame is kept, and the creator approves which one stands.
_Avoid_: Anchor, keyframe, frame attempt (a frame is the attempt)

**Take**:
One generated video attempt for a shot. Takes accumulate and are never overwritten.
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
The background unit of work that carries out a Generation or other long-running work (such as building an Export package), with its own execution lifecycle. It is operational, not creative truth, and may be repeated.
_Avoid_: Task, generation, request

**Provenance**:
Whether content was written by the creator, imported by the creator, generated by AI, or edited by AI at the creator's request. A property of content, always knowable.
_Avoid_: Authorship tag, attribution

**AI-made choice**:
A material decision the AI made where the creator specified nothing; visible and overridable.
_Avoid_: Assumption

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

**Meaningful spend**:
Generation cost significant enough that the creator must initiate it and see the estimate first.

**Retire**:
To take an object out of active use while keeping it, and everything attached to it, recoverable. V2 retires; it does not delete creative work.
_Avoid_: Delete, remove (for creative objects)

## Reference

**Design reference**:
A legacy idea that design may adopt, adapt or replace; neither mandated nor banned.

**Media**:
The stored image, video or audio content itself, distinct from the object that gives it meaning. Media is immutable; reusing it shares it.
_Avoid_: File, asset
