# Aiuteur V2: Entities, Looks, Location Coverage, Style and Reference Media

Resolution of Wayfinder ticket #53. It builds on [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md) (#50), uses the vocabulary of [`GLOSSARY.md`](../../GLOSSARY.md), and records two hard-to-reverse choices in [ADR 0002](../adr/0002-looks-and-carry-forward-derived-from-narrative-position.md) and [ADR 0003](../adr/0003-location-coverage-is-directions-by-looks-resolved-by-one-rule.md). Constitution §6 is settled; nothing here reopens the entity types, Looks versus moment-level change, coverage as the default, the single-image option, lightweight entities, or deferral never blocking unrelated work. No tables, fields or screens are designed: property names below are conceptual. Interaction design is World Definition (#59).

## 1. The model in one page

```diagram
PROJECT
 ├── Entity (Character | Location | Prop | Extra type)        id, type, name + aliases (labels)
 │     ├── canonical identity  (Editable; Revisions)           description, depth, approval
 │     │     └── identity image Slot  ◄── Attempts (1 active)
 │     ├── Look 0..*  (Character, Prop, Location)               name, "what differs from base"
 │     │     └── Look image Slot ◄── Attempts (1 active)
 │     ├── Voice 0..1 (Character; #69)
 │     └── Location only
 │           ├── Coverage (mode: multi-direction | single-image)
 │           │     └── Direction 0..*   (a named place to look from; has opposite?)
 │           │           └── View Slot per (Direction × Look-or-base) ◄── View Attempts (1 active)
 │           └── parent ~> Location 0..1  (sub-location; a project relation)
 │
 ├── Look assignment 0..*   (entity, Look-or-base, narrative position, extent)   ← the carry-forward truth
 ├── Mention   (derived index)  entity ↔ Master Narrative passage; creator decisions stored
 ├── Visual Style (1)       Writing Style (0..1)       ◄── referenced by Generations, never copied
 └── Reference Media 0..*   (Supplied)  ── attached to shots with a Subject mapping (#55)

SCENE / SHOT
 └── Presence ~> (entity, Look-or-base)   derived from Mentions + Look assignments; explicit overrides only
```

Three ownership lines carry the whole design:

1. **The entity owns what it is** (description, images, Looks, Directions, Views). It is self-contained so it can be copied (§10).
2. **The project owns where it is used** (Mentions, Look assignments, Presences, shot location links). None of it lives inside an entity.
3. **Scenes and shots own no description.** They hold references and resolve them when read (§6).

## 2. Entity

| Aspect | Rule |
|---|---|
| Types | Character, Location, Prop, Extra type. Visual Style, Writing Style and Voice are not entities in this narrow sense (glossary). Type is a property of the canonical identity, so a type change is a Revision (§2.4). |
| Identity | Own id, assigned at first creation; never reused; survives rename, merge (as survivor) and type change. Name and **aliases** are labels. Aliases exist for mention matching ("Marcus", "Mr. Hale", "the old man"); two entities may share a name. |
| Canonical identity | The one approved description plus identity images. Editable class (Revisions with Provenance). Images are Attempts for an identity-image Slot, one active. Approving identity is the creator's act (**Approve**), distinct from Accept and Select. |
| Depth | `lightweight` (description only, no image required) or `detailed` (identity image expected). A creator choice, changeable either way at any time; promoting never changes identity. A lightweight entity is generated from its text. |
| Status | `proposed` (extracted, not yet reviewed) → `kept`; or `deferred` (the creator chose not to define it yet); or `retired` (not in use; includes merged-away entities). Status is a creator decision, never inferred. |
| Extra type | An entity with a description (and optionally images), no Looks and no individual identity. A Presence of an Extra type may carry a quantity or density as shot context; that is not entity truth. |

### 2.1 Mentions: how entities link to the Master Narrative

A **Mention** says "this entity is present at this passage of the Master Narrative", with a kind: **on-screen** (appears), **referenced** (named, not seen: a dead mother, an offstage voice), or **setting** (a Location where the passage takes place). Mentions are a **derived index** (Rule 5 of the domain model: no hidden layer). They are rebuilt by an AI-assisted Generation whenever the Master Narrative gains a Revision and are matched through names and aliases.

Only the creator's corrections are truth and are stored as **Mention decisions**: `confirmed` ("this pronoun is Marcus") or `rejected` ("this is a different Marcus; not this entity"), keyed to (entity, passage anchor). Decisions survive re-derivation. If a passage anchor no longer resolves after a narrative edit, the decision is kept and surfaced quietly as needing a look, never dropped (anchor stability across Revisions is **#51**'s).

Mentions are the single basis for four things: scene-level Presence (§6), description compilation, Look proposals (a passage that says "Marcus, now covered in mud" proposes a Look and a Look assignment at that anchor), and "needed for scene" (§7).

### 2.2 Compiling and keeping descriptions consistent

- **Compile** is a Generation reading every on-screen Mention of the entity. It records the passages and Master Narrative Revision it read (the basis for staleness).
- **Output rule:** if the entity's description is still AI-written and unapproved, the output is an AI-made Revision. If the creator wrote, imported or approved any of it, the output is an **Option** the creator can accept, edit or discard. Compile never overwrites creator content (§13.3 of the Constitution).
- **Base versus Look.** Compile separates what is true of the entity everywhere (canonical identity) from what the story changes (proposed Looks, with their change points). Only story-wide facts enter the base description.
- **Consistency over time.** When the Master Narrative Revision a description was compiled from changes in a passage that mentions the entity, the entity is marked **possibly out of date** ("the narrative changed since this description was written"), with the choice to recompile as an Option, write the change back to the entity, or leave it. A downstream edit to identity (a shot prompt that contradicts the description) follows Constitution §4.4(7): written back to the entity (new Revision) or recorded as a Deliberate local deviation. The marking mechanism itself is **#54**'s.

### 2.2a Manual add

Extraction accelerates; it never constrains (Record 2 D59.7). The creator can add a Character, Location, Prop or Extra type by hand at any time: it was missed, it is introduced later, or the creator simply wants to define it directly. A manual entity has no Mentions until the narrative names it; it is otherwise an ordinary entity (status `kept`, no extraction provenance).

### 2.3 Merging duplicates

Merge is within a type and reversible, because nothing is destroyed.

1. The creator picks a **survivor**. The other entity is **retired with a redirect** (`merged into survivor`). References made by id keep working: every read resolves through the redirect, and past Generations keep their recorded ids.
2. **Aliases and Mentions** union into the survivor. The loser's name becomes an alias.
3. **Description:** the survivor's is kept; the loser's text is offered as an Option (an AI-merge, if requested, is a Generation producing an Option).
4. **Images:** the loser's identity-image Attempts appear on the survivor's Slot as candidates with lineage "from merged entity". None is auto-activated.
5. **Looks:** a Look is owned by exactly one entity forever, so each loser Look is either **re-created under the survivor** (new id, lineage note; the old Look is retired and redirected, and Look assignments follow the redirect) or left retired. The creator chooses; the default is to re-create.
6. **Un-merge** is restoring the retired entity and removing the redirect. Mentions re-derive.

### 2.4 Changing type

The entity keeps its id and its Mentions. The type change is a Revision of the canonical identity. What becomes of the parts depends on the target type:

| From → to | Effect |
|---|---|
| Character / Prop ↔ each other | Everything kept. Voice is dormant on a Prop (retired, recoverable). Existing images are marked possibly out of date, because type shapes image prompts. |
| Any → Extra type | Looks are retired (recoverable); Look assignments pause; Voice dormant. |
| Any → Location | Existing identity images stay on the identity Slot; the active one is the Location's canonical reference (§5.1). No Directions are proposed on conversion; coverage comes from the shots or from the creator (Record 2 D59.11). |
| Location → other | Directions and Views are retired but recoverable, with their images as plain Attempts on the identity Slot; sub-location links clear. Any shot using it as its location keeps the reference but reads **needs a Location**, a quiet reason, never silent erasure. |

## 3. Look

A **Look** is a named, story-driven appearance of an entity, anchored to its canonical identity and carried forward until the story changes it.

| Aspect | Rule |
|---|---|
| Applies to | Character, Prop, Location (a place can burn, flood, be redecorated). Not Extra types. |
| Base | The **base Look equals the canonical identity** (Record 2 D59.2): it is the default appearance, not a separate stored object, and needs no assignment; "no assignment in effect" means base. Alternate Looks are added only when needed through "Add Look". |
| Content | A name, a **description of what differs from the base** (not a full copy), and an optional image Slot (Attempts, one active). **A Look may be description-only** (Record 4 W59.4): without an image, generation uses the base identity image with the Look delta in text (§6). Look images are generated with the base identity image as a reference, so identity outranks the Look's styling. The **effective description** of an entity in a Look is *composed at use time* from base plus Look delta; it is never stored. |
| Identity | Own id, owned by exactly one entity forever. Name is a label. |
| Boundary | A Look is a story-level appearance that persists across shots. Transient changes inside a shot (a punch lands, glass shatters) are never modelled as Looks (§6.3); they are shot-only state notes on the shot's asset roster (SHOT-MODEL §4a) and live in the shot and its frames and takes. Lighting and time of day are likewise normally shot or scene context, not Looks. If the creator wants a fixed night-time version of a place, it may be an ordinary Look ("Kitchen, night") or a separate Location; neither is privileged (§5.1, Record 2 D59.6). A **persistent** change that happens during a shot (a costume transforms and stays changed) *is* a Look change: a Look assignment at the end of that shot's passage (SHOT-MODEL §4a, Record 4 W60 §5.6). |
| Created by | AI proposes Looks (with change points) from Mentions during World Definition; the creator accepts, edits or adds in bulk or one at a time. Looks may also be added later from a shot. |

## 4. Carry-forward: derived from narrative position

**Decision (ADR 0002):** the Look in effect is **derived from narrative position** by one rule. The only stored truth is the **Look assignment**, a small creator-or-AI-proposed record that states a change point. Nothing is recorded per scene and nothing is copied scene to scene.

### 4.1 Look assignment

A Look assignment has: the entity, a target (a Look, or **base**), a **start position**, and an **extent**:

- **From here on** (open-ended): in effect from the start position until a later open-ended assignment for the same entity replaces it.
- **Bounded** (to an end position): in effect only between start and end, then the previous state resumes. This is how a flashback or dream works.

A **position** is a place in the Master Narrative: a Scene (by its stable identity) optionally refined to a passage inside it. Scene order is the Master Narrative's order. A scene-level assignment means "from the start of that scene".

### 4.2 Resolution rule

For an entity at position **p** (a scene, or a shot's narrative anchor):

```diagram
1. Collect assignments whose range covers p.
2. If any BOUNDED assignment covers p:      take the one with the latest start  ──► its target.
3. Else take the OPEN-ENDED assignment with the latest start at or before p      ──► its target.
4. If none:                                                                       ──► base.
```

Bounded ones win over open-ended so a flashback overrides without disturbing the story's main timeline; after the bounded range ends, the open-ended timeline is simply what resolves again. The result is **explainable** in one phrase: "Muddy suit, since Scene 4".

```diagram
Scene:      1    2    3    4    5    6    7    8    9
Open-ended: ·    ·    ·  [Muddy suit ──────────────►     (assignment at Scene 4)
                                       └ [Clean ───►     (assignment at Scene 8)
Bounded:                      [Age 12]                    (Scenes 5–6, flashback)
Resolves:  base base base Muddy Age12 Age12 Muddy Clean Clean
```

### 4.3 Properties

- **Absence does not break carry-forward.** A Look persists across scenes where the entity is absent; the story must change it.
- **Reorder and insert are correct by construction.** Because position is read from the narrative, inserting, reordering, splitting or merging scenes changes the derived Look with no per-scene data to repair. Production work whose resolved Look changes is marked possibly out of date through its Generation's recorded inputs (§6.3).
- **Anchors are stable.** Assignments anchor to Scene identity (stable per **#52**) and, when refined, to passage anchors (**#51**). If a refined anchor is lost, the assignment degrades to its scene and is flagged quietly.
- **Creator override is local and explicit.** A shot or scene Presence may name a different Look (§6). That is a deliberate override of the derivation and is visible as such; it is not a change point and does not carry.
- **No narrative position, no derivation.** An **ad-hoc shot** (Record 2 X5; [`SHOT-MODEL.md`](SHOT-MODEL.md)) has no narrative position, so nothing is derived for it: the creator picks each entity's Look, and the default is base. A shot in a **Removed from Story** scene has no current position either, because a retired scene is outside narrative order and its Look assignments are inert ([`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) §§5–6). Its Looks are not re-derived, so the missing position raises no `look-changed` mark. Its work keeps the Looks its Generations recorded. Derivation resumes from the new position on Bring back, Adopt work or Move to scene.
- **Why not record per scene.** V1 copied Look state at scene creation, never updated it, kept the carry-forward prompt in browser storage, and could not return to an earlier Look (legacy 07 §§6.2, 7.2). Per-scene records would reintroduce stale truth and make "return to an earlier Look" a manual copy.

## 5. Location coverage

**Decision (ADR 0003).** Coverage belongs to the Location. A Location has **Directions** (places to look from) and a **View** Slot for each Direction under each Look; resolving a shot's view is one rule.

### 5.1 Structure

| Concept | Rule |
|---|---|
| **Coverage** | Part of the Location, Editable. A **mode**: *multi-direction* (the default outcome) or *single-image* (creator's per-location choice). In single-image mode there is one Direction, "establishing". |
| **Direction** | A named Slot-group within coverage: a label ("toward the window", "north wall"), a short description of what is seen, and optionally an **opposite** Direction (for shot / reverse-shot). Own id; label is a label. **Directions are proposed at shot planning, not up front** (Ratification Record 2, D59.11): for each shot, planning picks an existing named Direction or proposes a new named one ("toward the window" and its reverse). A new Direction's empty View becomes a production coverage need (§7). Adding the Direction is part of the shot's shot-owned Direction choice and raises no write-back (Record 2 P2). The creator may also add Directions by hand at any time, including before any shots exist. |
| **View** | An Attempt (immutable image) for the Slot (Direction × Look-or-base). Sources: AI-generated from the location's identity, uploaded, or **promoted from an approved Frame** (lineage recorded; frame reuse is ordinary). One active per Slot. |
| **Look × Direction** | Coverage is a sparse matrix. A Location Look ("burned down") needs its own Views only when a shot needs that Direction in that Look; that Slot becomes a coverage need, generated when the creator asks, using the base Views as geometry references. Nothing is pre-generated for Looks no shot uses. |
| **Sub-location** | A sub-location is itself a Location (own identity, description, coverage). Its `parent` link is a project relation. Its generation uses the parent's identity image as a "same building or place" reference. A shot in the sub-location never borrows the parent's Views: a kitchen is not the house's front. |
| **Canonical reference** | A non-deferred Location starts with **one approved reference image** (generated or uploaded; a broad view, one wall, a photo, a concept image). That image is the Location's identity and its base Look; it need not be an "establishing shot". It is the geometry and identity reference for every later View. |
| **Bulk acceptance** | The Views the shot plan calls for are generated from the canonical reference as one batch with one estimate; the creator reviews them together as a contact sheet and approves them all in one reversible action ("Accept all N"), then fixes individual tiles. Every View is a draft Attempt. This keeps coverage a default outcome, not a setup ritual. Nothing generates automatically (spend rules, #68; Record 2 X8). |
| **Opt-in before shots** | "Generate more views" or setting up Views by hand is available at any time, including before any shots exist. It is the optional path, not the default. |
| **Location variants** | A variant of a place (night, burned, decorated) may be an **alternate Look of the same Location** or a **separate Location entity**; the creator chooses and neither is privileged. Time of day and lighting normally come from the scene and shot, so Looks are mainly for changes to the place itself, because coverage multiplies across Looks (one View per Direction × Look). |

### 5.2 Capability honesty

Image models do not document camera-angle re-rendering from a reference (research #6, row A5, dated 2026-10-18: "not documented by any reviewed vendor"; this is a fast-moving fact, to be re-checked by the Generation and provider tickets). The model therefore never assumes AI-generated Views are right: every View is an Attempt, regeneration of one Direction is cheap, a Frame can be promoted instead, and the resolution rule has fallbacks (§5.3). Nothing in the design names a vendor.

### 5.3 How a shot resolves its location and view

Two separate resolutions, each a single rule (V1 had two disagreeing classifiers and threshold values; legacy 07 §10.3):

**Location.** A shot's Location is the Location **setting Mention** at the shot's narrative anchor (the scene heading's place, updated by any in-scene setting change). The creator may set an explicit location on the shot; explicit beats derived. An ad-hoc shot has no anchor, so its location is explicit or unresolved. The state is one of **explicit**, **derived**, or **unresolved** (with the candidate Locations listed). There is no stored confidence and no threshold: mentions are an index matched at derivation time, and the only stored fact is the creator's explicit choice or Mention decision.

**View.** Resolve a **Direction**, then the **active View** for (Direction, the Location's resolved Look at that position):

1. **Direction:** the shot's explicit Direction if the creator set one; otherwise the Direction the AI chose at shot planning, which is persisted as an **AI-made choice** (visible, overridable, and not silently re-derived when other things change); otherwise the coverage's primary Direction if it has one (in single-image mode, its one Direction). With no Direction, the ladder starts at the identity image. The shot refers to the **Direction Slot**, never to a View Attempt, so choosing a new active View never invalidates the link. The Direction is shot-owned: changing it never raises the write-back/deviation choice (Record 2 P2).
2. **View ladder** (first that exists): active View of (Direction, Look) → active View of (Direction, base) with the Look's delta in text → the establishing active View, if coverage has one → the Location's identity image → text only (description plus Direction description). The rung reached is reported quietly as reference quality ("no image for this direction yet"); it never blocks.

Frame reuse is an additional, explicit input a shot may carry (#55); it is not part of this resolution.

## 6. Scene and shot usage: reference, not copy

**The usage rule.** A Scene or Shot holds **Presences**, each `(entity, Look-or-base)`, and holds no description, image or style text of an entity. Everything the scene or shot needs is **composed when read** (and when a Generation is built).

| Layer | What it holds | How it is determined |
|---|---|---|
| Scene Presence | entity (+ Look) | Derived: entities with on-screen or setting Mentions inside the scene's span. The Look is derived by §4.2. |
| Shot Presence | entity (+ Look) | Derived from the scene's Presences and the shot's narrative anchor; explicit adds, removals and Look overrides recorded on the shot (#55 owns the shot model). |
| Shot location | Location (+ Direction) | §5.3. |
| Generation | the **exact Revisions** of the entity, Look, Visual Style and the active View/identity Attempts it used (ADR 0001) | Basis for "possibly out of date" (#54). |

**Composition at use time** (the compiled-context specifics are #65's): for each Presence, effective description = base + Look delta; images = Look image (else base identity image, with the Look delta in text); Visual Style applied after identity, never overriding it. Identity references outrank style (§6.1).

**Staleness falls out of references.** An entity or Look Revision newer than the one a Generation recorded is a quiet "possibly out of date" on that frame or take. Nothing is copied, so there is no second description to drift.

**Downstream identity edits.** A creator edit in a shot that changes what an entity is gets one of two outcomes (§4.4(7)): **write-back** (a new Revision of the entity or Look, which then applies everywhere) or a **Deliberate local deviation** attached to that Presence, applying only to that shot. Never a silent local copy.

## 7. Needed versus deferrable, and the two readiness levels

An entity is **needed for a scene** when it has a Presence in that scene that is on-screen or is its setting. A referenced-only Mention never makes an entity needed. "Needed" is derived, never stored.

**Two readiness levels** are derived, quiet and never blocking (Record 2 D59.4, Record 2 X9):

- **Identity readiness:** is the entity visually defined enough to use? (Canonical description plus an approved identity image, or a lightweight text-only definition.)
- **Production coverage readiness:** do the Locations have the additional Views the *current shot plan* needs? Shown as, for example, "Hale Kitchen: Identity ✓ · 3 production views needed". When the shot plan changes and reveals new needs, a quiet attention marker reappears ("1 new view needed"). It is derived from the Slots (resolved Direction × resolved Look, §5.3) that the shots point to, compared against existing Views. Shots of retired (Removed from Story) scenes are excluded, because no new generation is offered there ([`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) §5.1). It is never stored, and it never triggers generation by itself.

**Readiness** is derived per Presence, quietly, from the entity:

| Entity state | Planning scene and shots | Making frames and takes |
|---|---|---|
| `proposed` / `deferred`, never described | Allowed (the extracted name suffices) | The entity reads **needs a decision**: define it, make it lightweight, or generate with the AI's compiled description as an AI-made choice. One action, offered in bulk. |
| Lightweight (description, no image) | Allowed | Allowed; generated from text. |
| Detailed (approved identity image) | Allowed | Allowed. |
| Location with identity, no production Views yet | Allowed | Allowed through the §5.3 ladder (identity image or text only); the missing Views appear as production coverage needs. |
| Look not yet defined for a position that needs it | Allowed (base is used) | Allowed; the base is used and the missing Look is a quiet suggestion. |

Rules:

1. **Deferral is scoped by Presence.** A deferred entity affects only the scenes and shots where it is needed. It never blocks planning, other scenes, other entities or any unrelated work.
2. **Readiness is explanation, not a gate.** The product shows what is missing and offers the one-click fix. Whether a specific action asks for confirmation before spending is the spend rules' (#68).
3. **Deferrable by default:** referenced-only entities; Extra types beyond a text description; Looks (base fills in); Views beyond the one a shot resolves to; Voice (#69); Writing Style; image generation for lightweight entities.
4. **Required before any visual generation:** a Visual Style. If the creator has set none, one is chosen by the AI as a visible **AI-made choice** so a project is never blocked on style, and the choice is easy to replace.

## 8. Visual Style and Writing Style

| | Visual Style | Writing Style |
|---|---|---|
| Count | Exactly 1 per project | 0..1 |
| Class | Editable (Revisions) | Editable (Revisions) |
| Content | Any of: a preset, a plain-English description, reference images (Media), a reusable style definition (library is LATER) | Voice guidance for written documents and dialogue |
| Used by | Entity images, Views, Frames, Takes: always **by reference**, recorded on each Generation as a Style Revision | Text Generations (documents and dialogue), likewise by reference |
| Never | Copied into entities, snapshotted per asset, or stored as a flag | |
| On change | A new Revision. Visual work whose Generation recorded an earlier Style Revision is marked **possibly out of date** (reason: "visual style changed"), derived from recorded inputs, never deleted. | A new Revision. Chosen AI-written text Revisions that captured it are marked `writing-style-changed` (LINEAGE-AND-STALENESS §3); creator-written text is not. |

Identity outranks style by composition order (§6), not by a separate rule: identity inputs enter the Generation as primary references and the style shapes how they are rendered.

## 9. Reference Media

| Aspect | Rule |
|---|---|
| Class | Supplied, immutable: images or video for inspiration, parody or recreating a shot. Optional. |
| Versus entity images | What is supplied **as an entity's appearance** is an Attempt on that entity's identity Slot (an upload). What is supplied **as inspiration or recreation** is Reference Media. Promoting Reference Media to an entity image is an explicit act that creates an Attempt pointing at the same immutable Media. |
| Subjects | The subjects found in it (people, objects, places) are recorded as an Editable annotation (AI-proposed as a Generation, creator-correctable). |
| Subject mapping | When Reference Media is attached to a shot (as a Composition reference, #55), each subject is **mapped to a Presence** (entity and Look), or marked *remove* or *leave as a generic extra*. The mapping lives with the attachment, not with the media, so one media item can be used differently in different shots. |
| What it contributes | Composition, staging, motion and style, as the creator intends. **Never identity**: identity inputs to the Generation come only from the mapped entities' canonical identity and Look. The Generation records both lists. |
| Unmapped subjects | Defaulted by the AI to a generic extra as a recorded AI-made choice, overridable. |
| As style source | A Visual Style may point at Reference Media as one of its reference images (Media is immutable; sharing is safe). |

## 10. Copy-on-use extensibility constraint

For the LATER personal library to make a copy cheaply and safely, **an Entity (and a Visual Style) is a closed unit**:

1. **Closure.** Everything an entity owns is copied together: canonical identity and its Revisions, images (Attempts and their Media), Looks, Coverage with Directions and Views, Voice definition, aliases. The closure has no pointer to anything outside it, with one declared exception: the sub-location `parent` relation, which is a project relation and is dropped on copy unless the parent is copied in the same bundle (links are then remapped to the new ids).
2. **Usage stays outside.** Mentions, Mention decisions, Look **assignments**, Presences, shot location links and Reference Media annotations belong to the project, never to the entity. Look *definitions* travel with the entity; where the story uses them does not.
3. **No narrative inside identity.** Descriptions and Looks carry no scene numbers, anchors or project ids. (Descriptions may mention other characters in prose; that is text.)
4. **Copy gets new ids** plus an informational "copied from" note. There is never a live link between projects, so editing one cannot change another.
5. **Scope.** Entity records are owned by a scope (today, a Project) so a scope above Project can own library items later. Identity ids are globally unique, never project-local counters.
6. **Provenance is preserved** on copied content; the copy adds "copied from" and does not relabel AI content as creator-written.
7. **Media is immutable**, so a copy may share the stored object. Within a project a copy may share it; across projects Media is physically copied, and purge follows the project prefix ([`PERSISTENCE-AND-MEDIA.md`](../architecture/PERSISTENCE-AND-MEDIA.md) §§7–9, ADR 0022).

## 11. Constitutional check and rejected designs

No requirement was found unworkable; no `CONSTITUTION AMENDMENT REQUIRED` is raised. Considered and rejected:

- **Per-scene recorded Look state** (V1's `scene_asset_instances`): copies stale truth, breaks on reorder, makes returning to an earlier Look manual.
- **Looks as full entity copies**: duplicates the description; identity drift.
- **Coverage as per-shot images**: makes frame reuse and "shot knows its direction" manual management.
- **Resolver confidence thresholds stored on shots**: two classifiers disagreed in V1; the model stores only creator choices.
- **Snapshotting a style per entity**: V1 never updated it (legacy 07 §5.5); Generations record the Style Revision instead.

## 12. V1 failures answered

| V1 failure (evidence) | Answer |
|---|---|
| Description in three-plus places; scene value copied once, no staleness (legacy 07 §§6.1, 6.5) | Presences reference; effective description composed at use; Generation records Revisions. |
| Carry-forward in browser localStorage; inherit from scene N−1 only (legacy 07 §§6.1, 7.2) | Derived from narrative position over server-side Look assignments; absence does not break it. |
| Style snapshotted per asset, never updated (legacy 07 §5.5) | Style referenced; change marks dependants possibly out of date. |
| Two location classifiers with different thresholds (legacy 07 §10.3) | One derivation, no thresholds; three states. |
| Extraction never read the script, descriptions from names (legacy 07 §3.4) | Compile reads every Mention and records what it read. |
| Angle generation with no reference image; views lost if the tab closed (legacy 07 §§2.6, 2.7) | Views are Attempts of Generations; lineage and references recorded; Jobs are #67's. |

## 13. Hand-offs

| Ticket | Receives |
|---|---|
| **Shot model** (#55) | Shot Presence is derived from Mentions and Look resolution with explicit overrides; shot location is the §5.3 rule; shot refers to a Direction Slot, never a View; Composition reference carries the Subject mapping (§9); frame promotion to View records lineage. Resolved in [`SHOT-MODEL.md`](SHOT-MODEL.md): Presence overrides stored only as differences (§4), split/merge effect on anchors (§5), frame reuse (§6.3), composition reference (§8). |
| **World Definition** (#59, resolved: [`docs/ux/WORLD-DEFINITION.md`](../ux/WORLD-DEFINITION.md)) | The entity states (`proposed`, `kept`, `deferred`, `retired`), depth, merge/type-change effects (§§2.3–2.4), Look proposal and assignment review, bulk-accept coverage, needed/deferrable readiness (§7), Visual Style default as AI-made choice. |
| **Lineage and staleness** (#54) | Entities, Looks, Directions, Visual Style, Writing Style are Editable; Views, identity and Look images are Attempts; Look assignments and Mention decisions are creator-truth records; "narrative changed since description compiled" and "Look resolved to a different Revision" as marking reasons; writing-style change does not mark documents; write-back/deviation for identity (§6). |
| **Story documents** (#51) and **Scene identity** (#52) | Mentions and Look assignments need passage anchors that survive Master Narrative Revisions, and Scene ids as anchor targets; degrade to scene on anchor loss. |
| **AI responsibility map** (#64) and **Generation package** (#65, resolved in [`GENERATION-PACKAGE.md`](GENERATION-PACKAGE.md)) | Generations introduced: entity extraction and Mention derivation, description compile (Revision or Option), Look proposal, Direction pick-or-propose at shot planning, View generation from the canonical reference, Reference Media subject annotation, merge-text Option. Composition order at use time: base + Look delta, identity before style, exact Revisions recorded. |
| **Voice** (#69, resolved in [`VOICE-AND-PERFORMANCE.md`](VOICE-AND-PERFORMANCE.md)) | Voice is owned by the Character and travels in the entity closure with its samples and authorisation history; a provider voice handle does not travel (created lazily per project). |
| **Persistence** (#72) | Entity closure for copy-on-use; shared immutable Media across a copy; scope owner on entities. |
| **Spend** (#68) | Bulk coverage generation is one creator action with one estimate. |
