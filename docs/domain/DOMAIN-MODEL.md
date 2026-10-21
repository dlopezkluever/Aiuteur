# Aiuteur V2: Conceptual Domain Model

Resolution of Wayfinder ticket #50. Vocabulary is defined in [`GLOSSARY.md`](../../GLOSSARY.md); the trade-off behind Revision, Attempt, Generation and Job is recorded in [ADR 0001](../adr/0001-revisions-attempts-generations-jobs.md). This document says which objects exist, how they nest, who owns which creative truth, how many of each there can be, and what gives each its identity. It contains no tables, fields or screens. Where a later ticket owns a detail, the line says so.

## 1. Rules the whole model obeys

1. **One owner per truth.** Every piece of creative truth is owned by exactly one object. Everything else refers to it and never keeps its own copy. (V1 kept an asset description in five places, a shot prompt in two, the scene lock in three; legacy 04 §5.)
2. **Identity is not a label.** Every object has a durable identity assigned at creation and never reused. Names, numbers ("scene 4", "shot 1A"), order, text content and file names are labels that may change. V1's scene had four identities (legacy 04 §5 row 26).
3. **Two kinds of change.**
   - An **editable object** changes only by gaining a **Revision**. History is append-only; restoring an earlier Revision adds a new one.
   - A **generated or uploaded artifact** never changes. It is an **Attempt** for a **Slot**; Attempts accumulate and one is chosen. "Editing" an artifact makes a new Attempt that records what it came from.
4. **No hard deletion of creative work inside a project.** Objects are **retired**, with everything attached still reachable. Removing a scene or shot never removes its frames, takes or history (Constitution §7.1, §16 principle 3; V1's cascades, legacy 04 §8, are the counter-example). *Carve-out (creator ratification M7):* "never destroyed" governs everything inside a project. Permanent **project purge** and **account purge** are a deliberate, creator-initiated operation on a whole project or account, scheduled later and not vital to V2 core. They are never a way to remove a part of a project, and they do not make retire-only optional anywhere else. **Separability constraint:** each project's data and media must be separable and purge-able as a unit (no object, shared Media reference or index entangles two projects, and the account's own data stays enumerable), so purge can be added without a rewrite (#72).
5. **No hidden layer.** A derived or compiled representation (a screenplay export, a progress view, a compiled prompt) may be rebuilt from owned truth and holds no truth that exists nowhere else (§5.3).
6. **Reading never writes.** Opening, browsing or refreshing creates no Revision, Attempt or Generation (§16 principle 11).
7. **Provider-neutral.** No object names a vendor or model as a concept. A Generation records which model was used; that is history, not structure.
8. **Account-owned, project-scoped, isolated.** Aiuteur serves multiple independent creators (creator ratification M4). Every project belongs to exactly one **Account** (the creator's studio), and every object in it, including Records such as Generations, spend records and AI-made choices, carries that account as its owner through its project. One account can never read or write another's data. Collaboration, teams, shared editing and a role or permission model are OUT, so an account has exactly one creator and nothing is shared between accounts. Identities inside a project are meaningful only inside it.

## 2. The object classes

Four classes carry the model. The full seven-class taxonomy (adding Decisions, derived representations and commitment/lock state) is in [`LINEAGE-AND-STALENESS.md`](LINEAGE-AND-STALENESS.md) §1.

| Class | Behaviour | Members |
|---|---|---|
| **Editable** | Mutable only through Revisions; Provenance on each Revision | Project settings, Established Fact, Treatment, Beat Sheet, Master Narrative, Shot, Entity canonical identity, Look, Location coverage definition, Visual Style, Writing Style, Voice definition, Dialogue line, Composition reference attachment |
| **Supplied** | Creator-provided originals, immutable; only their role or links are editable | Source Material, Reference Media, Performance |
| **Artifact (Attempt)** | Immutable results, accumulate per Slot, one chosen | Frame, Take, entity image, coverage View, Option, transformed Performance |
| **Record** | Immutable statements of what happened or was decided | Generation, Job, AI-made choice, Deliberate local deviation, Export package (manifest) |

Scene, Interview, Presence and the pointers that choose an Attempt (selected take, approved frame, active image) are structure or state rather than content. Their owners and lifecycle are given below.

## 3. Conceptual diagram

Solid nesting means "owned by and retired with the parent's lifetime" (nothing is deleted). `1`, `0..1`, `0..*`, `1..*` are cardinalities. `~>` is a reference without ownership.

```diagram
Account / studio (1)  ── one creator; invite-only; spend caps and settings
  └─ owns ──────────────────────────────────────────────────────────────┐
                                                                        ▼
PROJECT ── settings (1) ─ intended runtime, format, tone, rating, genre, model defaults
  │
  ├── STORY  (project-wide)
  │    ├── Source Material       1..*   immutable originals + role
  │    ├── Interview             0..1   conversation record
  │    │      └─ produces ~> Established Fact  0..*  (project-owned; creator-edited)
  │    ├── Treatment             0..1 chosen (+ Options 0..*)   development document
  │    ├── Beat Sheet            0..1 chosen (+ Options 0..*)   development document
  │    └── MASTER NARRATIVE      1 (canonical; accepted = commitment point)
  │           └── Scene          1..* once accepted  (stable identity; owns no text)
  │
  ├── WORLD  (project-wide)
  │    ├── Entity: Character | Location | Prop | Extra type        0..*
  │    │      ├─ canonical identity (1): description + images (Attempts, 1 active)
  │    │      ├─ Look                 0..*   (Character, Prop, Location)
  │    │      ├─ Voice                0..1   (Character only)
  │    │      └─ Location only: coverage = View 1..*  (1 = single-image option)
  │    │                         sub-location ~> parent Location 0..1
  │    ├── Visual Style          1      required (default is an AI-made choice if unset)
  │    ├── Writing Style         0..1
  │    └── Reference Media       0..*
  │
  ├── PRODUCTION  (per Scene)
  │    Scene
  │     └── Shot                 0..*   ordered; one continuous camera moment
  │          ├── anchor ~> passage of the Master Narrative within its Scene
  │          ├── location ~> Location (1) [+ View 0..1]
  │          ├── Presence         0..*   ~> Entity [+ Look]
  │          ├── Dialogue line    0..*   └─ Performance ~> 0..*  (one chosen)
  │          ├── Composition reference 0..*   ~> Reference Media / previs capture
  │          ├── Frame            0..*   Attempts, per role (opening, ending, ...)
  │          └── Take             0..*   Attempts; selected take 0..1
  │
  └── RECORDS
       ├── Generation            0..*   ──► outputs: Attempts | Options | AI-made Revision
       │       └── Job           1..*   execution runs (operational, prunable)
       ├── AI-made choice        0..*   ~> the object it concerns
       ├── Deliberate local deviation 0..* ~> (downstream object, upstream truth)
       └── Export package        0..*   ~> exact selected Takes, Frames, document Revisions
```

Nesting at a glance: **Project ▸ Scene ▸ Shot ▸ (Frame, Take, Dialogue line, Composition reference, Presence)** for production; **Project ▸ Entity ▸ (Look, View, Voice, images)** for the world; **Project ▸ Master Narrative ▸ Scene** links the two trees, because scenes come from the narrative but own production.

## 4. Object catalogue

"Owns" is the creative truth that object alone holds. "Identity" is the rule that makes two instances the same or different.

### 4.1 Project and story

| Object | Cardinality | Class | Owns | Identity rule |
|---|---|---|---|---|
| **Account (studio)** | the root; one creator; 1 per creator | Editable (account settings) | The creator's identity and sign-in, the account's own spend caps and settings, usage and spend records, the personal library when it exists (LATER) | Own id, never reused. Every Project, Record and piece of Media is owned by exactly one Account. Nothing is shared across accounts. |
| **Project** | 0..* per Account; each belongs to exactly one Account | Editable (settings) | Intent: intended runtime, format and aspect, tone, rating, genre, default model choices, which phases were skipped or bypassed (Phase disposition) | Own id. The title is a label. A duplicated project is a different project; every object inside gets a new identity and a "duplicated from" record. |
| **Source Material** item | 1..* (typed text counts) | Supplied | The original content, untouched, plus a role (primary or supporting) and understood maturity | Own id per supplied item. Content never defines identity (two identical uploads are two items). The role is editable. |
| **Interview** | 0..1; stays open to take new questions | Record of turns | The conversation: what was asked and answered | One per project; resumed rather than restarted. |
| **Established Fact** | 0..* | Editable | One binding statement of creator intent | Own id. Wording changes are Revisions. A fact is retired, not deleted, if the creator withdraws it. A conflicting new input raises a question and never overwrites the fact. |
| **Treatment** | 0..1 chosen, plus Options | Editable | The story as prose | The Treatment is the chosen one. Choosing an Option adds a Revision to it; unchosen Options remain recoverable. Imported content becomes Revision 1 with import provenance. |
| **Beat Sheet** | 0..1 chosen, plus Options | Editable | The ordered major events | As Treatment. Identity of individual beats is #51's. |
| **Master Narrative** | exactly 1 per project | Editable | All narrative truth: action, dialogue, presence and appearance at that point, setting, props, state changes, approximate duration per scene | Own id, singular by construction. Acceptance and its lock are state on it, not a second narrative. |
| **Scene** | 1..* once the narrative is accepted | Structure | Its identity, order within the narrative and everything produced under it. **Not** any narrative text. | The id of its `scene` container block in the Master Narrative, assigned when the container first appears. Survives insert, delete, reorder, split, merge, rewrite and screenplay re-import. Number and heading are labels. Active or retired is derived from the current narrative; a scene that leaves it is retired with all work attached. Boundaries, mapping and disposition: [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md), [ADR 0011](../adr/0011-scene-identity-is-the-container-block-id-and-mapping-precedes-id-assignment.md). |
| **Screenplay export** | derived on demand | Derived | Nothing | A rebuildable view of one Master Narrative Revision. |

Treatment and Beat Sheet become development history once the Master Narrative is accepted; that is a status, not a different object.

### 4.2 World

| Object | Cardinality | Class | Owns | Identity rule |
|---|---|---|---|---|
| **Entity** (Character, Location, Prop, Extra type) | 0..* per project | Editable | Canonical identity: the one approved description and images (Attempts, one active). Lightweight entities have a description and no image. | Own id. Name is a label. Survives renaming and type change. Merging duplicates keeps one id and retains the other as a redirect (merge and type change are resolved in [`ENTITIES-AND-LOOKS.md`](ENTITIES-AND-LOOKS.md) §§2.3–2.4). Entity type is fixed at any moment. |
| **Look** | 0..* per Character, Prop or Location; none for Extra types | Editable | One named appearance, anchored to the entity | Own id, owned by exactly one entity forever. The base appearance is the canonical identity itself, not a Look. Carry-forward is derived from narrative position over stored Look assignments ([ADR 0002](../adr/0002-looks-and-carry-forward-derived-from-narrative-position.md)). |
| **Location coverage / View** | 1..* Views per Location (1 is the single-image option) | Attempts under a coverage definition | The views a shot's setting can be seen from | Each View has its own id and a direction label; each direction is a Slot with one active View. A View promoted from a Frame records that lineage and does not share the Frame's identity. |
| **Voice** | 0..1 per Character | Editable | The character's persistent voice identity | Owned by the Character; own id. Detail is #69's. |
| **Visual Style** | exactly 1 per project | Editable | The project-wide look and its reference images | Own id. Changing it adds a Revision and marks dependants possibly out of date. |
| **Writing Style** | 0..1 per project | Editable | Voice guidance for written documents | Own id. |
| **Reference Media** | 0..* per project | Supplied | An inspiration, parody or recreation reference | Own id per supplied item. It becomes a Composition reference only by being attached to a shot. |
| **Presence** | 0..* per Scene and Shot | Structure | That an entity, in a Look, appears. No description of its own. | Defined by (container, entity, Look). Derived from the narrative at scene level, derived from the scene with explicit overrides at shot level (#55). |

Entity images and style reference images belong to the entity or style (canonical identity). Reference Media is the creator's separate, shot-facing inspiration material.

### 4.3 Production

| Object | Cardinality | Class | Owns | Identity rule |
|---|---|---|---|---|
| **Shot** | 0..* per Scene, ordered | Editable | Action, camera intent, approximate duration, continuity context, and its links: anchor in the narrative, location and View, Presences | Own id, never derived from position, number or text. Survives reorder and re-drafting without overwriting the creator's edits. Split and merge create and retire identities explicitly and invent no story. A retired shot keeps its Frames and Takes. Full model: [`SHOT-MODEL.md`](SHOT-MODEL.md), [ADR 0012](../adr/0012-shot-identity-survives-split-merge-and-redraft-by-keep-first-and-options.md). |
| **Dialogue line** | 0..* per Shot | Editable | One attributed utterance and its delivery | Own id within the shot, so a Performance can link to it and a changed line can be written back or deviate. |
| **Composition reference** | 0..* per Shot | Editable | That this media guides this shot's framing and staging, and any notes | A link, not a copy: (shot, media, role). The media is Reference Media or a previs or sketch capture. Subjects are replaced by project entities. |
| **Frame** | 0..* per Shot, per role | Attempt | One still image | Own id per Frame. A reused or edited frame is a new Frame in the later shot whose lineage names its source; identical pixels do not merge two Frames. At most one is approved per role; approving is the creator's. |
| **Take** | 0..* per Shot | Attempt | One complete clip for the shot | Own id per Take. Never overwritten. Rejected Takes stay recoverable. The **selected take** is a pointer on the Shot (0..1), not a flag inside a Take. A shot longer than one generator call can produce is still one Take: an assembly of Segments, each made by its own Generation ([`SHOT-MODEL.md`](SHOT-MODEL.md) §7, [ADR 0013](../adr/0013-a-take-is-an-assembly-of-segments-so-long-shots-stay-one-clip.md)). |
| **Performance** | 0..* per Dialogue line, one chosen | Supplied | A creator's recorded or uploaded delivery of a line | Own id per supplied recording. A voice-transformed version is a separate Attempt derived from it. |
| **Export package** | 0..* per project | Record | A manifest of exactly which selected Takes, Frames, prompts and document Revisions it contained when built | Own id per build. Same manifest produces identical contents (deterministic). Holds no creative truth. |

### 4.4 Records of what happened

| Object | Cardinality | Class | Owns | Identity rule |
|---|---|---|---|---|
| **Generation** | 0..* per project; each belongs to exactly one initiating creator action | Record, immutable once it ends | What was asked (exact prompt, references, entities and Look Revisions, style, model choice, parameters), who initiated, estimated and actual cost, outcome | Own id per request. See §5. |
| **Job** | 1..* per Generation, and also per other long-running work | Record, operational | Execution status, the provider's operation reference, timing | Own id per run. May be pruned after it settles. Never referenced by creative objects. |
| **AI-made choice** | 0..* | Record | One material decision the AI made unprompted, what it concerns, and whether the creator overrode it | Own id. An override is a Revision of the concerned object, after which the choice is marked overridden. |
| **Deliberate local deviation** | 0..* | Record | The intentional difference between a downstream object and its upstream truth, with the creator's decision | Own id, tied to (downstream object, upstream anchor). Write-back versus deviation detail is #54's. |

**Provenance** is a property of every Revision and every Attempt, not an object: creator-written, creator-imported, AI-generated or AI-edited at the creator's request, plus the Generation if any. Accepting or approving AI content does not change its provenance. Provenance of spans inside a text is #51's.

## 5. Revision, Attempt, Generation, Job: the new terms

| | **Revision** | **Attempt** | **Generation** | **Job** |
|---|---|---|---|---|
| Is | A recorded state of an editable object | A generated or uploaded artifact competing for a Slot | The record of one AI request and what it produced | One run of the background work executing it |
| Applies to | Editable objects | Frames, Takes, entity images, Views, Options | Any AI content production | Generations and other long work |
| Mutable? | No, but a new one can be added | No, ever | Its request never; its outcome may gain outputs once by adoption of a late result (#67) | Yes, while running |
| Count per thing | Many per object, in a line | Many per Slot, one chosen | One per request | One or more per Generation |
| Restoring | Add a new Revision copying an old one | Choose a different Attempt | n/a | n/a |
| Owns creative truth | Yes | The artifact itself | The inputs and cost | None |
| Survives pruning | Always | Always | Always | May be pruned |

How they differ in the cases that blur:

- **Generation vs Take vs frame attempt.** The Generation is the request and its record. The Take is a result of it: the Take is a video, the Generation is "what we asked Model M for, with these inputs, for this much". A frame attempt is a Frame, a result of a Generation (or an upload). One Generation may yield several Frames; a failed Generation yields none. A Take or Frame points back to the Generation that made it; uploaded Frames have none.
- **Generation vs Job.** The Generation survives forever and answers "what was sent and what did it cost?". The Job answers "is it running, did it fail, should it be retried?" and may be discarded afterwards. A **retry** after a transient failure is a new Job for the same Generation. A **regeneration** the creator chooses, even with identical inputs, is a new Generation. Whether a retry needs fresh spend approval is #67 and #68's.
- **Revision vs Attempt.** Rewriting a treatment passage adds a Revision of the Treatment; regenerating a take adds an Attempt to the shot. Choosing a Treatment Option adds a Revision. Restoring a Revision never deletes the later ones; selecting a different Take never changes any Take.
- **Retired is not deleted.** A removed Take is rejected, a removed scene is retired; both stay recoverable.

The word **version** is not used as a model term. In the interface, "version history" may name the list of an object's Revisions. Template, prompt-template and model versions are not domain objects; where they matter they are recorded on a Generation.

## 6. Ownership of truth: who answers what

| Question | Single owner | Others may only |
|---|---|---|
| What does the creator want overall? | Project settings and Established Facts | Read it; raise a question if input conflicts |
| What did the creator supply? | Source Material, Reference Media, Performance | Reference them |
| What is the story? | Master Narrative (Treatment and Beat Sheet are development history once it is accepted) | Anchor to passages; write back at the creator's choice; record a deviation |
| Which scenes exist and in what order? | The Master Narrative's scene structure (Scene identity owned by the Scene) | Refer to a Scene by its identity |
| What is this character, place or prop? | The Entity's canonical identity | Refer to it; write back; record a deviation |
| What does it look like at this story point? | The Look | Refer to it from a Presence |
| What does the whole film look like? | Visual Style | Be affected by it; identity outranks it |
| What happens, how is it filmed, how long? | The Shot | Be a deviation from the narrative (recorded) |
| What was generated, from what, at what cost? | Generation | Point to it |
| Which result is final for this shot? | The Shot's selected take pointer (creator only) | Read it for review and export |
| What is being delivered? | Export package manifest | Nothing; it is a snapshot |
| Who made this content? | Provenance on the Revision or Attempt | Highlight it |
| What may be out of date and why? | Lineage (#54), shown as a marker | Never blocks |

## 7. Stress scenarios

| Scenario | What the model does |
|---|---|
| The creator rewrites a scene and inserts a new one before it. | Scene identities are unchanged; the new scene gets a new identity; scene numbers are labels and renumber. Dependants are marked possibly out of date. |
| The creator regenerates the same shot's video four times and picks the second. | Four Takes under one Shot, each from its own Generation; the selected-take pointer references take two. Nothing was edited. |
| A video job fails twice and succeeds on the third run. | One Generation, three Jobs; one Take, from the successful run. The failures are visible on the Generation and Jobs. |
| The creator reuses an approved frame from shot 3 as the base for shot 4, edits it. | A new Frame in shot 4 from a Generation that names the source Frame; the shot 3 Frame is untouched. |
| The creator changes Marcus's jacket in the entity description. | A new Revision of Marcus (or of the Look); frames and takes made from earlier Revisions are untouched, and dependants are marked possibly out of date. |
| The creator records a better ad-lib than the scripted line. | The Performance is linked to the Dialogue line. The creator writes the line back to the Master Narrative (new Revision) or the Dialogue line records a deliberate local deviation. |
| The creator duplicates the project to try a bold change. | A new Project; every object gets a new identity with a "duplicated from" record. No shared mutable state. |
| A scene is removed from the revised narrative. | The Scene is retired with its shots, frames and takes attached and reachable; nothing is deleted. |
| The Master Narrative is accepted, then the creator edits it. | A new Revision of the Master Narrative; the lock adds friction scaled by dependants; production objects are untouched and marked possibly out of date. |
| Two characters share a name. | They are two Entities with two identities; names are labels. |

## 8. Coverage of the ticket's object list

Project (settings) §4.1; Source Material §4.1; Interview and Established Fact §4.1; Treatment, Beat Sheet, Master Narrative, Scene §4.1; Shot §4.3; Character, Location, Prop, Extra type §4.2; Visual Style, Writing Style §4.2; Look §4.2; Location coverage §4.2; Reference Media §4.2; Composition reference, Frame, Take (and selected take), Performance, Export package §4.3; Voice §4.2; AI-made choice, Provenance §4.4; Generation, Job, Revision §5. The Constitution's Q16 list is covered unchanged; Dialogue line, Presence, Option, Slot, Attempt, Phase disposition and Deliberate local deviation are additions that exist to make Q16's objects precise.

## 9. LATER extensibility constraints

The model guarantees the following so that LATER capabilities are not precluded. None is designed here.

| LATER capability | Constraint the V2 model must not violate |
|---|---|
| **Personal library, copy-on-use** (§6.7) | An Entity or Visual Style is self-contained: its description, Looks, images and coverage Views are all owned by it, and no project truth (usage, scene links) is stored inside it. Usage lives on the other side (Presence, shot links). Reuse across projects makes a copy with a new identity and a "copied from" note that is informational only; a live link between projects never exists, so editing one project cannot change another. A scope above Project can own library items later. |
| **Project-aware assistant with reviewable change-sets** (§14.4) | Authored truth changes only by adding Revisions to identified objects, so any change can be expressed as a proposed set of Revisions before it is applied, accepted wholly or partly. The assistant's accepted changes carry "AI-edited at the creator's request" provenance. No direct mutation path bypasses Revisions. |
| **In-app assembly / sequence editing** | Shot order is explicit and stable (Scene order, then Shot order within a Scene). Takes and their Media are immutable and addressable. The selected-take pointer is the only link from a shot to delivery. A future sequence can reference Shots or Takes without altering them. No assembly object exists now. |
| **Autopilot** | Every workflow step is an operation with explicit inputs that does not depend on being performed through a screen. Autopilot output is ordinary Revisions, Options and Attempts with AI provenance, started by a creator action that includes the spend approval. It introduces no new kind of truth. |
| **Audio-first projects** | Source Material accepts any media type with a role; nothing in the model assumes a Treatment precedes a Master Narrative, or that audio is added after video. Project settings can carry an entry mode. A Performance or audio Source Material can exist before any Shot. |
| **Features and series** | A container above Scenes (act, sequence, episode) can be inserted because Scenes are ordered members of the narrative, not numbered globally. A group above Project can be added because a Project is already self-contained. Nothing assumes a project is short. |
| **Collaboration (OUT)** | Not modelled: no teams, shared editing or permission hierarchy. Multiple independent creator Accounts are in V2 (M4), each fully isolated. Nothing precludes adding an actor to Revisions and Generations later, since each already records who initiated it. |

## 10. Hand-offs

| Ticket | Receives |
|---|---|
| **Entities and Looks** (#53) | Entity types and the strict meaning of "Entity"; canonical identity as owned truth with Attempts and one active; Look as an owned specialization of the base identity (Character, Prop, Location; none for Extra type); View/coverage as Attempts per direction; Presence as the only usage link; Visual Style exactly one, Writing Style 0..1; the copy-on-use self-containment rule. Still open: how mentions link to the narrative, carry-forward derivation, merge and type change, sub-location representation, "needed vs deferrable", Reference Media versus entity images, location-view resolution for shots. |
| **Lineage and staleness** (#54) | The four classes (Editable, Supplied, Artifact, Record) as input, the full taxonomy and derived and commitment/lock state still to decide; Revision and Attempt semantics (including that restoring adds a Revision); Generation as the record that must capture exact input Revisions; AI-made choice and Deliberate local deviation as Records; retire-not-delete; reading never writes; duplicate-project identity rule. Still open: staleness derived versus stored, reason vocabulary, write-back versus deviation mechanics, selection history, lock state. |
| **Shot model** (#55, resolved) | Resolved in [`SHOT-MODEL.md`](SHOT-MODEL.md): structured and free fields as lineage slices; anchor to Master Narrative blocks; Shot plan per Scene; Presence derived with stored overrides; split, merge and redraft identity (ADR 0012); Frame plan, roles, sources and reuse lineage; the derived realization state; Segment and the Take as an assembly (ADR 0013); the composition-reference slot; reserved hooks for Performance, CineBlock, storyboard and shot-list import. |
| **Scene identity** (#52) | Scene owns identity, order and production; it owns no text; retire-not-delete. Resolved in [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md): Scene id is the container block id; derived active/retired; mapping before id assignment; creator confirms ambiguous or work-affecting items. |
| **Story documents** (#51) | Treatment and Beat Sheet as editable with Options; Master Narrative singular; Revisions as the history mechanism; provenance as a property of Revisions. Still open: span-level provenance, sync, beat identity. |
| **AI responsibility map** (#64) | Generation is the record for every AI call that produces creator-visible content, text or media; deterministic operations are not Generations; AI-made choice as a Record. |
| **Generation package** (#65) | A Generation records the exact inputs; the package definition itself is #65's. |
| **Job lifecycle** (#67) | A Job carries out a Generation or other long work; retry is a new Job for the same Generation; regeneration is a new Generation; a Job holds no creative truth; whether quick inline AI calls get a Job; states, idempotency, cancellation, batch grouping are all #67's. |
| **Voice and performance seams** (#69) | Voice owned by Character; Performance as Supplied linked to a Dialogue line; transformed performance as an Attempt. |
| **Persistence** (#72) | Retire-not-delete, immutability of Attempts and Media, private media, and project duplication as new identities. Account and project ownership and isolation (M4), and project/media separability so a later purge (M7) needs no rewrite. Purge semantics themselves (when Media with no remaining reference is destroyed) remain open. |
| **Workflow-state ownership** (#54, #71) | Phase disposition (done, skipped, bypassed) is server-side project truth; per-scene production progress is derived. |
| **Spend and cost** (#68, resolved) | A Generation records estimated and actual cost, run billing and who paid; the spend-approval commitment point is attached to creator-initiated Generations (a batch is one creator action). Every project and everything under it belongs to one **Account**; no object is shared across Accounts. See [`BUSINESS-AND-OPERATIONS.md`](BUSINESS-AND-OPERATIONS.md). |

## 11. V1 failures this model answers

| V1 failure (evidence) | Answer |
|---|---|
| "Version" with six meanings (legacy 15 §§3, 6) | Revision and Attempt; "version" is not a model term. |
| Shot in seven shapes, scene in four (legacy 15 SP-09, SP-10) | One Shot and one Scene, each with a single owner of truth and a stable identity. |
| Asset description in five places, "locked" with five meanings (legacy 04 §5 rows 8, 29) | One owner per truth; Lock is protection only, distinct from Accept, Approve, Select. |
| Cascade deletion of scenes, shots and frames (legacy 04 §8) | Retire, never delete; artifacts immutable. |
| Same-named character and prop collapsed (legacy 15 SP-12) | Identity is an id, never a name or a name and type key. |

## 12. Constitution check

No constitutional requirement was found unworkable or contradictory; no `CONSTITUTION AMENDMENT REQUIRED` is raised. The model adds terms (Revision, Attempt, Slot, Generation, Job, Presence, Option, Dialogue line, Phase disposition, Retire) without changing the meaning of any Appendix B term. One refinement to flag: unqualified "Entity" means the four on-screen types; Appendix B's broader sense (including Style and Voice) is kept in the glossary.
