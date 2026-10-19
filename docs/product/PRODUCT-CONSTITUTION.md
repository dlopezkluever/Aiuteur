# Aiuteur Product Constitution

| | |
|---|---|
| **Status** | Approved by the creator (Daniel), 2026-10-19 |
| **Scope** | Aiuteur V2: product-level intent only |
| **Authority** | Highest-authority product document for all subsequent planning (Wayfinder, PRDs, specs, domain modeling, architecture, tickets) |
| **Origin** | A human-in-the-loop grilling session (30 decisions, recorded in Appendix A) informed by `_inputs/legacy-foundational-docs/`, `_inputs/product-knowledge/` and `_inputs/legacy-system/` |

> **This document defines the authoritative product-level intent of Aiuteur V2. Historical product documents, product-knowledge corpora, and WizardDirector implementation archaeology are supporting evidence only. Where they conflict with this Constitution, the Constitution controls unless it is deliberately amended.**

## How to use this document

- **It defines WHAT Aiuteur is, WHY each part exists, HOW the major pieces fit together conceptually, WHAT principles govern behavior, and WHAT belongs in initial scope.** It deliberately does not define UI layouts, data schemas, endpoints, providers, job systems, or implementation order. Those belong to later design work, which must stay inside the boundaries set here.
- **Treat every statement here as settled.** Downstream agents and documents should build on these decisions, not reopen them. If a later design discovers that a decision here is unworkable, raise it as a proposed amendment (see "Amending this Constitution" at the end), and do not silently design around it.
- **Words with specific meaning** are defined in Appendix B (Glossary). Use those terms.
- **"Design reference"** in this document means: an idea from V1 or the legacy corpora that the creator considers good and that later design may adopt, adapt, or replace. It is neither mandated nor banned.
- **Scope classes** used throughout:
  - **CORE**: must exist for the minimum initial product to be considered working.
  - **IMPORTANT**: part of the intended first real product; the creator *chooses* to use it. Not required to pass the minimum bar, but **the system must be designed and architected from day one to support it**.
  - **LATER**: valued and expected eventually; not part of the first product; nothing in V2 should preclude it.
  - **EXPERIMENTAL**: speculative; explore only after the product works.
  - **OUT**: not pursued for now.
- **Phase status words** used in Section 4:
  - **Mandatory**: every project passes through it; it always produces its output.
  - **Recommended**: offered by default and encouraged; the creator may skip it.
  - **Optional**: available when the creator wants it; not part of the default path.
  - **Bypassable**: the creator may enter the workflow after this phase by supplying material that stands in for it.

---

## 1. Product Thesis

**Aiuteur is a web application in which an individual creative person makes an intentional AI-generated film, from a rough idea to finished, exportable shots, while remaining its author.**

Aiuteur deliberately occupies the middle ground between two existing extremes:

- **One-prompt generators**, where a person types a request and an AI makes every creative decision. The output is cohesive but generic, and the person's ideas are barely visible in it.
- **Professional filmmaking, VFX, animation and editing stacks**, which give total control but demand expertise, time and teams that most creative people do not have.

Aiuteur gives the creator **far more creative control than a one-prompt generator** and is **dramatically easier than a professional stack**. The creator's own ideas, humor, taste and intent must remain visible in the final work. The AI does the tedious translation, organization, drafting and generation, and **never takes creative ownership away from the creator**.

The product is a **guided creative workflow**: the creator's material is progressively refined into one canonical, highly descriptive narrative (the Master Narrative), which is then translated into a defined world (characters, locations, props, style), a scene-and-shot plan, visual frames, and finally generated video takes. Every step is inspectable and editable, and nothing the creator decides is silently lost or overridden.

### What Aiuteur is not

These are explicit identity boundaries, confirmed by the creator:

- **Not a one-prompt generator.** "Type an idea, receive a finished film" is not the product. (AI may draft ahead on explicit request; see Section 14.)
- **Not an autonomous agent.** The AI never advances the work on its own initiative or makes unsanctioned creative decisions.
- **Not an Adobe / NLE / professional VFX replacement.** Aiuteur does not compete on granular, frame-level professional control. Final editing may happen in DaVinci Resolve, CapCut or similar tools.
- **Not a slop or ad factory.** Aiuteur is not designed for high-volume, low-authorship content production (e.g. dozens of UGC ads per hour).

---

## 2. User and Experience Target

### 2.1 Who Aiuteur is for

**The primary user is the individual creative storyteller**: writers, joke-tellers, satirists, sketch makers, hobbyist and independent filmmakers, people with stories, sketches, parodies, ideas and opinions, who lack an animation/VFX/editing team or the time and expertise to learn professional tools. **Aiuteur is their production team.**

- **Commercial projects are valid** when they are authored and intentional (a creator's own spec ad, a small business's deliberate promo). What is excluded is volume content production with no real authorship, not commerce itself.
- **Not designed for:**
  - people who want AI to make everything for them with no involvement;
  - volume ad/UGC factories;
  - professionals who require frame-level granular control of every detail.
- **Design test:** a feature that would appeal only to the top ~10% of detail-obsessed users is designed wrong for this product. Precision tools may exist, but they must be opt-in and must never burden the default path.

### 2.2 The design-target project

- **Length:** roughly **30 seconds to about 20 minutes**. Typical pieces: comedy sketches, parodies, satirical shorts, short narrative films, music-video-like pieces, short authored ads.
- **Effort:** **a motivated creator can get from idea to a finished piece in a day or a few focused sessions**, and can choose to slow down and refine where they care.
- **Scale implication:** a 20-minute project can contain on the order of 150–250 shots. Scene-by-scene work, batch actions, and overview/progress views must remain usable at that size.
- **Not optimized for initially:** feature films and episodic series. **Nothing in V2 may preclude them later** (e.g. reusable characters and styles across projects, Section 6.7).

### 2.3 The intended experience

- **Effort is acceptable; tedium is not.** Making a film should take some time and thought, but the creator should never feel bogged down, stuck, or forced through busywork. Repetitive work (carrying facts forward, filling gaps, bulk generation, organizing) belongs to the AI.
- **Flexible pacing.** The creator speeds through what they don't care about and slows down to be precise where they do. Every area has a light, fast default and an opt-in precise path.
- **Creative empowerment and fun.** Especially in performance and voice (Section 11), the product should feel like play, not paperwork.
- **Trust.** The creator should always be able to tell what they decided, what the AI decided, what will be sent to a generator, and what may be out of date.
- **Platform:** a web application, desktop-first. Native mobile apps are OUT for now.

### 2.4 Balance between AI assistance and creator control

| The creator owns | The AI owns |
|---|---|
| Intent, story, meaning, tone, humor | Translating intent into structured documents |
| Which ideas survive | Drafting options and proposals |
| Approving the canonical narrative | Organizing, extracting, cross-referencing |
| Identity of characters, places, style | Filling gaps the creator leaves, visibly |
| Every meaningful spend | Generating images, video and audio when asked |
| What counts as final | Tedious bulk and carry-forward work |

The governing rule: **AI accelerates the low-care tasks; it never replaces the creator's creative judgment.** (Full policy: Sections 13 and 14.)

---

## 3. Core Promise

Aiuteur must make the following possible:

1. **From any starting point to a finished piece.** A creator can start from a paragraph, scattered notes, a long transcript, research files, an existing story, or a finished screenplay, and end with a complete set of finished video shots for their film.
2. **The deliverable is the finished, selected takes.** The product is judged on whether the creator leaves with **a complete, watchable sequence of finished video takes that is recognizably theirs**, plus everything needed to finish and share it:
   - the selected takes, in order, ready to drop into an editor (DaVinci Resolve, CapCut, etc.);
   - the written materials (Master Narrative, screenplay export, treatment, beats);
   - prompts, frames and other production artifacts.
   Story documents are the means, not the deliverable. **In-app editing/assembly is LATER (a stretch goal)**; Aiuteur relies on external editors for the final cut.
3. **Identity-level consistency.** Characters, locations, props and the visual style stay **recognizably themselves** across the whole piece, and the story reads coherently. Small imperfections are tolerated if they don't break the viewer's immersion. **Professional-grade continuity (frame-accurate state tracking, exhaustive spatial coverage) is not the promise**; precision continuity tools exist but are opt-in and never mandatory setup.
4. **The creator's intent survives translation.** Facts the creator states, answers they give, and material they write are carried faithfully into every later step and are never contradicted or silently replaced.
5. **Controlled spend.** Expensive generation happens only when the creator initiates it, with its cost visible beforehand, and cheaper steps establish visual truth first wherever that improves control or saves money.
6. **Safe iteration.** The creator can explore, regenerate, compare and change direction without ever losing earlier work.

### 3.1 The "Aiuteur works" bar (minimum initial product)

The minimum initial product (everything CORE, nothing else required) works when **all** of the following are true:

> A creator who starts from a rough paragraph can, in one day:
> 1. be interviewed until Aiuteur understands what they want;
> 2. shape a treatment, a beat sheet and a Master Narrative;
> 3. define a small cast and two or three locations;
> 4. plan the shots;
> 5. generate frames and takes in which the characters and locations stay recognizably themselves and the characters speak their lines;
> 6. watch the resulting 2–3 minute piece in order; and
> 7. export the clips plus the written documents into DaVinci Resolve or CapCut.
>
> **The same flow also works when the creator starts from their own existing screenplay.**

Passing this bar is necessary but not sufficient: V2 must be **designed and architected from day one to support every IMPORTANT capability** (Section 15), even though those are not required to pass the bar.

---

## 4. Canonical Creative Workflow

### 4.1 Shape of the workflow

Aiuteur's workflow is a sequence of **phases**, not a fixed, numbered stage count. (V1's stage-based UX is a valid design reference; Section 17.)

```
Input ─► Interview ─► Treatment ─► Beat Sheet ─► MASTER NARRATIVE ─► World Definition
 (M)        (R)         (R/B)        (R/B)            (M)                 (M, deferrable)
                                                       │
                     ┌─────────────────────────────────┘
                     ▼
              Scenes & Shots ─► Visual Direction / Previs ─► Frames ─► Takes ─► Review & Export
                   (M)                  (O)                    (R)      (M)          (M)
                                                     Performance / Voice / Audio (O, alongside Takes)

M = mandatory   R = recommended   O = optional   B = bypassable by supplied material
```

- **Story and world are project-wide.** Input through World Definition operate on the whole project.
- **Production is organized by scene.** Scenes come from the Master Narrative. The creator can work scenes **in any order**, return to any scene, and run **batch actions across scenes** (e.g. "draft shot plans for all scenes", "generate all approved shots").
- **Movement is free in both directions.** The creator can go back to any earlier phase at any time. What happens to downstream work when they change something is governed by Section 4.4.
- **Phases are not lock rituals.** Moving through completed work never forces unlocking, re-locking, re-saving or waiting. (Locks exist only at major commitment points; Section 13.4.)

### 4.2 Phase by phase

#### Phase 1: Input (Source Material)

- **Status:** **Mandatory.** Every project has input, even if it is two sentences.
- **Purpose:** accept whatever the creator already has, at whatever level of preparedness, without forcing everyone through the same starting form.
- **Expected input:** typed text (a paragraph, a rough idea, pages of notes), uploaded files (e.g. txt, docx, pdf, md), long voice-note-derived transcripts, research/context files, an existing story, a treatment, an outline/beat sheet, or a screenplay. Multiple files may be supplied together, with roles (primary material vs supporting context). Project-level settings are also established here (e.g. intended runtime, format/aspect, tone, rating, genre).
- **Expected output:** the project's source material, kept as originals, with each item understood (what it is, what role it plays), and a route into the workflow that matches the material's maturity (Section 4.3).
- **Human role:** supply material; say what each piece is when it matters; set the project's basic intent.
- **AI role:** identify what each piece of material is and how mature it is; propose where it enters the workflow; extract text from files. The AI never acts on the creator's material invisibly.
- **Note:** if the creator supplies a document *as* a treatment or *as* a beat sheet, **its contents become the content of that phase** (Section 4.3). Supplying them does not force the creator to keep those phases.

#### Phase 2: Interview (Clarification)

- **Status:** **Recommended.** Offered every time; skippable.
- **Purpose:** **interview the creator until Aiuteur genuinely understands what they want to make**, so that it does not need to make major arbitrary creative decisions later. This is a conversation, not a form.
- **Expected input:** all source material plus project settings.
- **Expected output:** **Established Facts**: the creator's answers, recorded as binding project knowledge (intent, missing story details, resolved ambiguities and contradictions, character motivation, tone, format, runtime, audience, genre, important creative constraints).
- **Human role:** answer questions; correct the AI's understanding; decide between interpretations when material is ambiguous or contradictory.
- **AI role:** examine the material; find what is ambiguous, missing, contradictory or underspecified; ask useful, targeted questions; keep going until it understands; record the answers. If the creator skips the interview or a question, the AI may fill the gap, and **those choices are recorded as AI-made** (Section 13.2).
- **Binding rule:** Established Facts are never contradicted by later generation, including regenerations long after the interview. New material that conflicts with an established fact triggers a new question rather than a silent overwrite.

#### Phase 3: Treatment

- **Status:** **Recommended; skippable; bypassable** (by supplying a treatment, a beat sheet, or a screenplay).
- **Purpose:** explore and shape the story as continuous prose before committing to structure.
- **Expected input:** source material, Established Facts, project settings, optional writing style.
- **Expected output:** one chosen, refined treatment.
- **Human role:** choose among options; edit freely by hand; direct targeted changes; deliberately regenerate larger portions.
- **AI role:**
  - **offer multiple distinct treatment options by default** (e.g. different endings, tones, structures; the number is a design decision, and "just give me one" is allowed);
  - rewrite only a selected passage when the creator highlights it and gives an instruction;
  - regenerate larger portions or the whole treatment when asked. A "what should change" note is encouraged but **optional**.
- **If imported:** the creator's supplied treatment becomes the treatment content.

#### Phase 4: Beat Sheet (Story Structure)

- **Status:** **Recommended; skippable; bypassable** (by supplying a beat sheet or a screenplay).
- **Purpose:** express the story as a structured, chronological sequence of major story events the creator can inspect, reorder and refine.
- **Expected input:** the chosen treatment (or imported outline / source material when the treatment was skipped).
- **Expected output:** an accepted beat sheet.
- **Human role:** edit, reorder, add, remove and refine beats; direct targeted changes; explore alternatives for a beat.
- **AI role:** derive beats from the treatment; brainstorm alternatives; expand or split beats; rewrite selected material on request.
- **Treatment ↔ beat sheet relationship:** these two documents must remain **meaningfully related**. Before the Master Narrative is accepted, **automatic synchronization between treatment and beat sheet is permitted** if it can be made reliable and transparent (mechanism deferred, Section 18). After the Master Narrative is accepted, see Section 4.4.
- **If imported:** the creator's supplied beat sheet becomes the beat sheet content.

#### Phase 5: Master Narrative

- **Status:** **Mandatory.** Every project has exactly one canonical Master Narrative before production. It is either generated (from treatment, beats and facts) or **converted** from imported material such as a screenplay.
- **Purpose:** become **the single canonical source of narrative truth** from which all production work is derived. (Full definition: Section 5.)
- **Expected input:** beat sheet, treatment, Established Facts, source material, project settings, optional writing style; or an imported screenplay/story.
- **Expected output:** an accepted, highly descriptive, scene-organized Master Narrative.
- **Human role:** read, edit, direct targeted rewrites, and **explicitly accept** it. Acceptance is a commitment point (Section 13.4).
- **AI role:** write it with production-grade descriptive detail; when converting a screenplay, preserve the creator's dialogue and story verbatim and add only missing descriptive detail; produce a conventional screenplay export on request (Section 5.4).

#### Phase 6: World Definition (Creative Entities)

- **Status:** **Mandatory, but deferrable.** Production depends on defined entities, but the creator can defer individual entities, keep minor ones lightweight, and come back later.
- **Purpose:** identify and define the reusable creative entities the film needs (characters, locations, props, background extra types, visual style, and the named looks entities take on through the story) so that they stay recognizably themselves everywhere.
- **Expected input:** the accepted Master Narrative, Established Facts, any images the creator supplies.
- **Expected output:** a defined world: each needed entity with a canonical description and reference image(s), named looks where the story changes an entity's appearance, location coverage (Section 6.4), and a project visual style.
- **Human role:** decide which entities deserve careful definition and which stay lightweight; approve identity (generate, upload, choose among attempts, edit descriptions); add entities the extraction missed; merge duplicates; defer.
- **AI role:** extract entities and their mentions from the Master Narrative; pre-fill descriptions compiled from everything the narrative says; generate reference images and location coverage; propose named looks from story-driven changes; generate missing location angles from a single background image.
- **Design reference:** **V1's Stage 5 asset experience is regarded as good** (extraction with pre-filled descriptions, multiple generate/upload attempts with a chosen active image, defer, merge, change type, extra archetypes, a clear "finalize" moment).

#### Phase 7: Scenes and Shots (Production Planning)

- **Status:** **Mandatory as a concept.** Every generated take comes from an explicit shot the creator can see and edit. The shot plan itself may be AI-drafted and simply accepted.
- **Purpose:** translate each scene into shots: the concrete units of generation that turn narrative intent into media.
- **Expected input:** the Master Narrative's scenes, defined entities and looks, locations and their coverage, style, the previous scene's ending (for continuity), optional composition references.
- **Expected output:** per scene, a shot plan (Section 7).
- **Human role:** accept, edit, reorder, split, merge, add and remove shots; control action, dialogue, composition, camera intent, timing, visible entities and scene/shot structure as much or as little as they want.
- **AI role:** draft shot plans per scene or in batch across scenes; split/merge without inventing new story; keep shots consistent with the Master Narrative.

#### Phase 8: Visual Direction / Previsualization

- **Status:** **Optional**, per shot or per scene.
- **Purpose:** give the creator stronger directorial control over composition, camera placement, character placement, blocking and rough start/end states when they want it. (Section 8.)
- **Expected input:** shots, entities, locations.
- **Expected output:** composition references attached to shots (blocking captures, sketches, storyboard frames, reference images/videos).
- **Human role:** block, sketch, upload or choose references.
- **AI role:** honor composition references while replacing placeholders and reference subjects with the project's real entities.

#### Phase 9: Frames (Image Development)

- **Status:** **Recommended** by default; skippable per shot.
- **Purpose:** establish a shot's visual truth cheaply before expensive video generation, when that improves control, continuity or cost. (Section 9.)
- **Expected input:** shot, entities and looks, location coverage, style, composition references, previous frames.
- **Expected output:** approved frame(s) for the shot.
- **Human role:** generate, compare, approve, reuse, edit, or skip frames.
- **AI role:** generate frames that respect identity, location and composition; reuse/edit prior frames for continuity; surface assumptions.

#### Phase 10: Takes (Video Generation)

- **Status:** **Mandatory.**
- **Purpose:** generate the shot's video. (Section 10.)
- **Expected input:** the shot, its frames and references, entity identities and looks, dialogue and performance, style, model choice.
- **Expected output:** one or more takes per shot; one selected take.
- **Human role:** initiate generation (with cost visible), inspect, compare, select, reject, revise and regenerate deliberately.
- **AI role:** assemble everything the generator needs; generate; keep every take.

#### Phase 11: Performance, Voice and Audio

- **Status:** **Optional** beyond the CORE native dialogue in takes. (Section 11.)
- **Purpose:** let the creator make characters sound right, and let them perform.
- **Human role:** assign voices; record or upload performances; transform voices.
- **AI role:** generate dialogue and sound with takes; keep character voices consistent; make takes follow a supplied performance; transform voice while preserving delivery.

#### Phase 12: Review and Export

- **Status:** **Mandatory.**
- **Purpose:** let the creator watch their film as a sequence, judge it, fix it, and take it out of Aiuteur. (Section 12.)
- **Expected output:** an export package.
- **Human role:** review, route fixes, decide what is final, export.
- **AI role:** assemble playback; package exports deterministically.

### 4.3 Entry by material maturity (bypass paths)

The creator's material lands **as far into the workflow as it earns**. Phases bypassed this way read as **intentionally skipped**, never as broken or missing.

| Creator brings | Enters at | What happens |
|---|---|---|
| Rough idea, notes, transcript, research | Input → Interview | Normal full path |
| An existing story or treatment | Treatment | Supplied text becomes the treatment content |
| An outline / beat sheet | Beat Sheet | Supplied text becomes the beat sheet content |
| A screenplay | Master Narrative | **Converted** into a Master Narrative: dialogue and story preserved verbatim, missing descriptive detail added by AI and reviewable. **A screenplay never bypasses the Master Narrative.** |
| Storyboards or shot lists (IMPORTANT) | Scenes & Shots | Panels/labels (e.g. 1A, 1B) matched to scenes and shots; distilled rather than reinterpreted |
| Previs packages (e.g. CineBlock exports) (IMPORTANT) | Scenes & Shots / Visual Direction | Become composition references and shot data |
| Audio-first sources (podcast, song, narration driving the visuals) (LATER) | Its own entry point | A distinct project mode; the constitution names it so nothing precludes it |

Additional bypass rules:

- **Treatment and Beat Sheet may be skipped entirely** by the creator's choice, even with no imported substitute; the Master Narrative is then generated from the source material and Established Facts.
- **Bypassed phases can be filled later** on request (e.g. reverse-generate beats from the Master Narrative). Nothing is backfilled or spent automatically.
- **Input and the Master Narrative are never bypassed.**

### 4.4 Moving backward and propagating changes

This is where V1 was most fragile. V2's policy is **explicit, creator-triggered propagation with visible staleness**:

1. **Accepted downstream work is never silently rewritten** because something upstream changed. Affected downstream items are marked **possibly out of date, with a reason**. The creator decides (item by item or in bulk) whether to regenerate, reconcile, or keep.
2. **Out-of-date markers are quiet.** They are informative, never alarming, never visually loud, and **never block** work. Outdated work is explained, not prohibited.
3. **Downstream edits never silently rewrite upstream documents.**
4. **Synchronization is permitted where it is reliable and transparent.** In particular, **treatment ↔ beat sheet may synchronize automatically before the Master Narrative is accepted.** Sync must never destroy creator work (Section 16, principle 4).
5. **After the Master Narrative is accepted, the treatment and beat sheet become development history.** They remain viewable and editable, and the creator may explicitly regenerate them from the Master Narrative, but Aiuteur does not promise to keep them synchronized with it.
6. **Narrative changes made later at shot level** (a changed line, a different action) are either **written back to the Master Narrative** at the creator's choice, or **recorded as a deliberate local deviation**. They are never silently divergent.
7. **Identity changes made later** (what a character, location or prop looks like) follow the same rule: written back to the entity, or recorded as a deliberate local deviation.
8. **No automatic Git-style branching.** Safety comes from:
   - recoverable **version history** for documents and entities;
   - **non-destructive regeneration** (previous versions, frames and takes are kept);
   - **duplicating a project** for bold experiments.
9. **Changing direction is always allowed.** The creator can redirect anything at any time. Protection exists to prevent accidents, not to prevent change.

---

## 5. The Master Narrative as Creative Truth

### 5.1 Definition

The **Master Narrative** is **one human-readable, human-editable, highly descriptive, production-oriented document that tells the whole film in scene order**. It is the **single canonical source of narrative truth** for the project.

It is **not** a conventional, concise Hollywood screenplay. Conventional screenplays are deliberately sparse about appearance, position, setting detail and visible action. That sparseness is exactly what makes them insufficient as a production source for AI generation. The Master Narrative is **deliberately much more descriptive**, so that downstream filmmaking work can be derived from it without the AI inventing the missing detail.

### 5.2 What it contains

Organized into **scenes**, in story order, it contains everything narrative and visual-descriptive:

- **Action, described as visible behavior**: what a viewer would actually see (posture, movement, gesture, expression, spatial relationships, who moves where). Emotion is expressed through visible physical behavior, not abstract statements.
- **Exact dialogue**, attributed to speakers, with delivery notes (whispered, deadpan, shouted, etc.).
- **Who is present**, and **their appearance and wardrobe at that point** in the story.
- **Setting**: the specific location and sub-location (e.g. the kitchen, not just "the house"), time of day, lighting feel, atmosphere, important set details.
- **Important props** and their visual significance.
- **Changes of state over time**: someone gets wet, changes clothes, gets injured, moves to another room, ages; a prop breaks.
- **Approximate duration** per scene, so the piece can be kept near its intended runtime.

### 5.3 What it does not contain

- **No camera or shot direction.** Shot types, camera placement and movement, lenses, and shot breakdown belong to Scene & Shot planning (Section 7). The Master Narrative says *what happens and what it looks like*; the shot plan says *how it is filmed*.
- **No hidden layer.** There is **no separate AI-only "enriched" document** behind the human-visible one. What the AI uses as narrative truth is what the creator can read and edit. (A hidden source of truth would undermine authorship and inspectability.)

### 5.4 Screenplay export

- A conventional screenplay is **a view/export of the Master Narrative**, not a separate source.
- On request, AI **condenses** the Master Narrative into standard screenplay form: **dialogue identical**, description reduced to what screenplays normally carry.
- Uses: sharing with others, giving to voice actors, reading in a familiar format.
- The export never replaces or alters the Master Narrative.

### 5.5 Why it is central

- **It is where intent becomes concrete.** Everything the creator said (source material, interview answers, treatment, beats) converges into one document they can read and approve.
- **Everything downstream derives from it**: scenes, entities and their looks, shot plans, and through them frames and takes.
- **It prevents arbitrary late invention.** Because the narrative already states who is where, wearing what, doing what, later steps translate rather than invent.
- **It is the anchor for change.** Downstream deviations are either written back to it or recorded as deliberate deviations from it (Section 4.4), so there is always one place that says what the story is.

### 5.6 Rules

- **Exactly one canonical Master Narrative per project.**
- **Accepting it is a commitment point** (Section 13.4): production is derived from an accepted Master Narrative. After acceptance it is protected by a non-blocking, always-unlockable lock whose friction grows with the amount of downstream work depending on it.
- **When converting a screenplay**, the creator's dialogue and story are preserved verbatim; AI additions are marked as AI-made (Section 13.2) and reviewable.
- **Editing it after production exists** marks dependent production work as possibly out of date (quietly, with reasons); it never deletes or silently rewrites that work.

---

## 6. Creative Entities and Persistent Identity

### 6.1 Principle

**Identity is defined once and referenced everywhere.** Characters, locations, props and style stay recognizably themselves across the film. **Identity references outrank style**: the visual style shapes how things look, but never overrides who or what they are.

### 6.2 Entity types

| Entity | Meaning |
|---|---|
| **Character** | *Exactly this person, always.* A specific individual with persistent identity. |
| **Location** | A narrative space (a room, a street, a ship's bridge), seen from many viewpoints. |
| **Prop** | An important object with persistent identity. |
| **Extra / background type** | *A recognizable kind of background figure* (e.g. "medieval peasant", "Zorblaxian alien"), generated with natural variation; no individual persistent identity. A creator-authored addition to the world. |
| **Visual Style** | The project-wide look: medium, palette, mood, lighting, etc. |
| **Writing Style** (IMPORTANT) | Optional guidance for the voice of the written documents and dialogue. |
| **Voice** (IMPORTANT) | A character's persistent voice identity (Section 11). |

### 6.3 Canonical identity and named looks

- **Canonical identity.** Each entity has one creator-approved description plus reference image(s). It is the single source of what that entity is. Descriptions are pre-filled from everything the Master Narrative says about the entity; the creator edits and approves. Entities may be generated or uploaded; several attempts may exist, with one active.
- **Named looks.** Story-driven appearance changes become **named looks of the same entity**, e.g. "Marcus, muddy suit", "Marcus, age 60", "the vase, broken". They come from what the Master Narrative says, are reviewable during World Definition, and are anchored to the entity's canonical identity.
- **Carry-forward.** A look **carries forward** into later scenes until the story changes it.
- **Moment-level changes are not pre-modeled.** Changes that happen *within* a shot (a punch lands, a face reddens, a glass shatters) are described in the shot and handled by frames and takes. Pre-modeling them as entity states is explicitly discouraged as brittle.
- **Lightweight is allowed.** The creator decides which entities deserve careful definition. Minor entities may remain text-only. Deferring an entity never blocks unrelated work.

### 6.4 Locations and spatial coverage

Locations are different from characters and props: a character reference shows the thing that should appear; a location reference shows **one view of a space that shots must depict from many angles**. Location continuity is therefore a first-class concern.

- **Default: multi-direction coverage.** By default, a location has coverage from **multiple directions** (its walls/angles/views), so that shots within a scene look like the same place from different angles (shot/reverse-shot, characters moving through the room).
- **Per-location simplification.** The creator can choose, **per location**, to use only one establishing/background image instead (e.g. for a location used briefly).
- **AI-generated coverage.** From a single background image, **AI can generate the other walls/angles** automatically.
- **Frame reuse is an ordinary continuity path.** Reusing and editing approved frames from earlier shots to hold a background steady is a normal, everyday tool, not an advanced feature.
- **Shots know their location.** Every shot is associated with its location (and, where coverage exists, the appropriate direction) without the creator having to manage that manually.
- **Design requirement:** multi-direction coverage must be **designed well**. In V1 the creator found the setup burden too heavy; in V2 it is the default *outcome*, produced largely by AI and cheap to accept in bulk, never a laborious mandatory setup ritual.

### 6.5 Visual style

- **Required for every project**, but choosing it is easy: a preset, a plain-English description, reference images, or a reusable style definition are all acceptable.
- Applied consistently to entity references, frames and takes.
- **Identity outranks style.** Style must visibly affect the look without overriding entity identity.
- Changing style later is allowed; it marks dependent visual work as possibly out of date and never deletes it.

### 6.6 Reference media

- **Optional.** The creator may supply reference images or video for **inspiration, parody, or recreating a specific shot**.
- When used to drive a frame or take, **the reference's subjects are replaced by the project's own entities**: the reference contributes composition, staging, motion or style as the creator intends, never the identity of the project's characters.

### 6.7 Reuse across projects

- **Conceptually**, entities and styles belong to a project but can be saved to and pulled from a **personal library** (LATER as a full experience; Section 15).
- **Copy-on-use rule (constitutional):** reusing an entity or style in another project makes a copy. **Editing it in one project never silently changes another.**
- This is what keeps series and recurring characters possible later.

---

## 7. Scene and Shot Production

### 7.1 Scenes

- **Scenes are derived from the accepted Master Narrative.** A scene is a narrative unit (a continuous piece of story in one place and time).
- Scenes have **stable identity**: editing the Master Narrative must not casually destroy scenes or their production work. A scene that is removed or substantially changed is marked, never silently deleted along with its work.
- **Production is organized by scene**, worked in any order, with batch actions across scenes.
- Each scene has a **clear progress view** (how much of it is planned, framed, generated, selected) so the creator always knows where the film stands. This replaces V1's dedicated checkout and "Complete Scene" stages (Section 17).

### 7.2 Shots

A **shot** is **one continuous camera moment, which becomes one clip in the edit**. It is the unit of generation.

Before generation, Aiuteur must enable each shot to express:

- **Action**: what visibly happens, written as what a viewer sees.
- **Dialogue**: exact lines and delivery, attributed to speakers (and, where used, a linked performance; Section 11).
- **Visible entities and their looks**: who and what is in frame.
- **Location**, and where coverage exists, the direction/view.
- **Camera intent**: shot size, angle, movement, framing intent, in whatever depth the creator wants.
- **Approximate duration.**
- **Composition reference(s)**, optionally: blocking captures, sketches, storyboard frames, reference images/videos (Section 8).
- **Continuity context**: how the shot connects to the previous shot and, at scene boundaries, to how the previous scene ended.

### 7.3 Rules

- **Every take comes from an explicit shot** the creator can see and edit. There is no hidden shot layer.
- **Shot plans may be AI-drafted and simply accepted.** A low-control path (accept the AI's plan for a scene, or for all scenes in batch) is legitimate; the creator can engage as deeply as they want.
- **Shot duration is flexible.** There is **no fixed shot length** (V1's mandatory 8-second shot is rejected as product law). If a generator cannot produce a shot's duration in one generation, **Aiuteur handles it** (split, extend, or otherwise) rather than forcing the constraint onto the creator.
- **Split and merge never invent new story.** They redistribute the shot's existing content.
- **Runtime awareness.** The creator can see how the planned shots add up against the intended runtime, so the piece does not balloon unnoticed.
- **Shot plans stay consistent with the Master Narrative.** Narrative changes made at shot level follow Section 4.4 (write back or record as deliberate deviation).

---

## 8. Visual Direction and Previsualization

### 8.1 Product role

Visual direction is **the creator's tool for stronger directorial control when they want it**: roughly establishing camera placement, character placement, composition, blocking and rough start/end states for a shot, so that generation produces the framing the creator intends instead of a generic one.

- **Optional**, per shot or per scene. Never required to make a film.
- **CORE requirement:** the shot concept must support composition references from the start, even before any previs tool is integrated.
- **IMPORTANT capabilities:**
  - **Composition references**: upload a sketch, storyboard frame, photo, or layout to guide a shot.
  - **Reference-driven shots**: supply a reference image or video (inspiration, parody, recreate a shot), with its subjects replaced by the project's entities.
  - **CineBlock-style blocking**: an integrated, optional tool in which the creator blocks a scene in a rough 3D environment with mannequin stand-ins and captures start/end compositions. The creator's existing CineBlock MVP is the design reference.
  - **Previs package import** (e.g. CineBlock exports) into shots.

### 8.2 Division of authority

When a composition reference is used:

- **The composition reference owns framing**: camera angle, crop, subject placement, rough pose, screen direction.
- **Entity references own appearance**: who characters are, what props look like.
- **Location references own environment identity**: what the place looks like, not how the shot is framed.
- **Placeholders are placeholders.** Mannequins, primitives, sketch marks and reference-video subjects are layout guides only, replaced by the project's real entities.

### 8.3 Sequencing

CineBlock integration is IMPORTANT but comes **after the core loop works**. The core shot model reserves room for composition references so that previs inputs need no redesign when they arrive.

---

## 9. Image / Frame Development

### 9.1 Why frames matter

Generating video is expensive and slow; generating images is cheap and fast. **Establishing a shot's visual truth with a frame before generating its video** lets the creator confirm composition, identity, location and continuity cheaply, and gives the video generator a strong visual anchor. This "frame before video" ordering (V1's "Inversion") is a valued design reference.

### 9.2 Principles

- **Recommended by default, never mandatory.** Per shot, the creator can skip frames and go straight to video with references when they prefer.
- **No fixed frame structure.** A shot is not required to have exactly two anchors. Typically a shot has an opening frame; an ending frame is optional; other structures are allowed if they help.
- **Frames are where identity, location and composition converge**: entity references and looks, location coverage, style, composition references and the shot's description combine into an image the creator can approve.
- **Frame reuse and editing is ordinary.** Approved frames from earlier shots can be reused or edited as the base for later shots (same background, a changed pose, a character entering), which is the everyday way to keep shots coherent with previous and subsequent shots.
- **Continuity across shots.** Frames can draw on adjacent shots (and, at scene boundaries, on how the previous scene ended) so consecutive shots feel continuous.
- **Precision continuity tools are opt-in**: finer state tracking, explicit continuity links, region edits and similar tools exist for creators who care about a particular moment; they are never mandatory setup.
- **Nothing is lost.** Every frame attempt is kept and recoverable; the creator chooses which is approved.

---

## 10. Video Generation

### 10.1 Role

Video generation turns an approved shot (its description, dialogue, performance, frames, entity references, location, style and composition references) into **takes**. Takes are the product's deliverable (Section 3).

### 10.2 The iteration loop

For each shot, the creator can:

1. **Generate**: initiated by the creator, with estimated cost visible beforehand. Single shots or batches across a scene or the whole film.
2. **Inspect**: watch the take in context.
3. **Compare**: view takes side by side.
4. **Select**: designate one take as the shot's selected take (used by review and export).
5. **Reject**: discard a take from consideration (it remains recoverable).
6. **Revise**: adjust the shot, frame, prompt, references or performance.
7. **Regenerate deliberately**: produce new takes, with optional guidance about what should change.

### 10.3 Rules

- **Takes accumulate and are never overwritten.** Regeneration adds takes; it never destroys earlier ones.
- **Generation runs in the background.** The creator can keep working elsewhere while takes generate, and is told when results are ready or have failed. Failures are visible and retryable, never silent.
- **No meaningful spend without the creator's initiative**, and cost is shown before spend (Section 13.4).
- **Model choice:** Aiuteur picks a **sensible default** model; the creator may **optionally override per project or per shot** (quality vs cost vs capability). The product never depends on a specific provider.
- **Prompts and references are inspectable and overridable**: the exact prompt and references sent for each take are viewable and editable per shot, never required reading (Section 13.5).
- **Fix in place.** Problems noticed at take level can be fixed there (adjust the shot, frame, prompt, performance). If the fix changes narrative or identity truth, Section 4.4 applies.

---

## 11. Voice, Performance, and Audio

### 11.1 Scope split

| Class | Capability |
|---|---|
| **CORE** | **Dialogue and sound generated with the take**, from the shot's exact dialogue and delivery notes. Characters speak their lines. |
| **IMPORTANT** | **Consistent character voices**: each character has a persistent voice identity so they sound like themselves across all shots. |
| **IMPORTANT** | **Recorded or uploaded performances**: the creator records or uploads a performance of a line, and the take follows that performance (timing, emotion, lip-sync). |
| **IMPORTANT** | **Voice transformation preserving delivery**: a performance's voice (pitch, timbre, etc.) can be transformed to sound like a specific character's voice **while keeping the original delivery**. Example: a man records a line and it comes out sounding like a specific woman saying it, with the same delivery. |
| **LATER** | Separate audio stems (dialogue/SFX/music), music and score generation, audio mixing. |

### 11.2 Product intent

- **Voice and performance are meaningful creative capabilities**, not technical afterthoughts. Letting the creator perform their own characters (any character, any voice) is one of the most fun and differentiating parts of Aiuteur.
- The IMPORTANT capabilities are **the creator's choice to use**; the default path (generated dialogue) must work without them.
- Performances are creator-supplied material and receive the same protection as other creator work (Section 13).
- When a recorded performance deviates from the scripted line (e.g. a better ad-lib), the deviation is handled per Section 4.4: written back to the Master Narrative or recorded as a deliberate local deviation.
- Only performances the creator is authorized to use should be transformed (the creator's own voice, or voices they have rights to).

---

## 12. Review, Assembly, and Delivery

### 12.1 Review (CORE)

- **Sequence playback**: the creator can watch **a scene, or the whole film, as a sequence of selected takes**, in story order.
- From review, the creator can jump to any shot to fix it (revise, regenerate, select a different take).
- **Per-scene and whole-film progress** is always clear: what is planned, framed, generated, selected, missing, or possibly out of date.

### 12.2 Assembly

- **In-app editing/assembly timeline is LATER (stretch goal).** Final editing is expected to happen in external editors (DaVinci Resolve, CapCut, etc.).
- Aiuteur's job is to deliver a complete, ordered, well-organized set of finished takes that an editor can assemble quickly.

### 12.3 Export (CORE)

The **export package** includes:

- **The selected takes**, named and ordered by scene and shot so they arrive organized in an editor;
- **Frames**;
- **Prompts** and other generation context;
- **Written documents**: Master Narrative, screenplay export (when generated), treatment, beat sheet.

Additional:

- **NLE timeline export** (a sequence file for Resolve/Premiere/CapCut that arrives pre-assembled) is **IMPORTANT**.
- **Success test:** a creator (or an editor) can import the export and start cutting within minutes, without renaming, relinking or reorganizing.
- **Deterministic packaging:** the same selected material always produces the same organized export.

---

## 13. Human Creative Authority

### 13.1 The creator is the author

The creator holds final creative authority over the story, the characters, the world, the style, and what counts as final. The AI translates, organizes, drafts, proposes and generates. It **never takes creative ownership and never acts on its own initiative**.

### 13.2 Respect and provenance

- **Creator work is respected.** Anything the creator wrote, edited, uploaded, answered or accepted is never changed by the AI unless the creator asks.
- **The creator can always redirect.** Respecting creator work is not immutability: the creator may change direction at any time, and the system must make that possible, not obstruct it.
- **Provenance is always knowable.** Every piece of content knows whether it was **written by the creator, imported by the creator, generated by AI, or edited by AI at the creator's request**.
- **Provenance highlighting** (IMPORTANT): a toggle that visually distinguishes AI-generated content from creator-originated content (e.g. different highlight colors), so the creator can see at a glance what is theirs.
- **AI-made choices are visible.** When the AI decides something material the creator never specified, it is recorded as an AI-made choice the creator can see and override.

### 13.3 Requested edits apply directly

- When the creator asks the AI to change something (e.g. highlights a passage in the treatment and gives an instruction), **the AI applies the change directly**. There is no mandatory preview/diff/accept ceremony.
- **Targeted edits change only the selection**; surrounding content is read-only context for the AI.
- The changed content is **marked as AI-generated** (provenance), and **version history** makes the previous text recoverable.
- **Recoverable version history is the safety net**, not pageantry: documents, entity definitions and other creative content keep recoverable versions.

### 13.4 Commitment points and locks

Aiuteur uses **few explicit commitment points** instead of pervasive lock rituals:

1. **Accepting the Master Narrative.** Production is derived from an accepted Master Narrative.
2. **Any meaningful spend.** Video generation and large batch image generation are always **creator-initiated, with estimated cost shown first**. Aiuteur never spends significant money on its own initiative.
3. *(To be decided in design: whether selecting a shot's take is a formal commitment point.)*

**Locks:**

- Locks **exist** and are wanted at major commitment points. The first is **after accepting the Master Narrative**. Other lock points are a design decision (Section 18).
- Locks are **non-blocking** and **always unlockable**.
- Locks add **friction proportional to the downstream work at risk**: editing past work that a lot of later work depends on should take a deliberate step and show what depends on it, because careless edits there would wreck downstream work.
- Locks must **never become bureaucracy**: no forced unlock/re-lock cycles to browse or move through completed work, no warning loops, no waiting on no-op saves.
- Lock protection must be real: a lock that the interface shows must actually hold everywhere, not only in one screen.

### 13.5 Inspectability and fixing in place

- **Prompts and references are always inspectable and overridable.** For any image or video generation, the exact prompt and references sent are viewable and editable (per shot). This is an escape hatch, **never a required workflow step**.
- **Fix it where you notice it.** The creator can adjust a shot, edit a frame, tweak a prompt, or regenerate a take in place.
- **Write-back for truth changes.** If an in-place fix changes narrative truth (a line, an action) or identity truth (what an entity looks like), Aiuteur offers to write it back upstream or records it as a deliberate local deviation (Section 4.4).

### 13.6 What remains exclusively human-controlled

- Accepting the Master Narrative.
- Initiating meaningful spend.
- Deciding which take is final for a shot.
- Approving entity identity (or explicitly leaving it to AI).
- Resolving genuine creative ambiguity the interview surfaces (the AI may propose; the creator decides, or explicitly delegates).
- Deciding whether downstream work marked possibly out of date gets regenerated, reconciled, or kept.
- Changing direction.

---

## 14. AI Responsibility

### 14.1 What AI should do

- **Translate**: turn source material into treatment, beats, Master Narrative; the Master Narrative into scenes, entities and shots; shots into frames and takes.
- **Organize and extract**: classify input material; extract entities and their mentions; compile descriptions; keep cross-references consistent.
- **Ask**: interview the creator instead of guessing about material decisions.
- **Propose**: offer options (multiple treatment options by default; alternatives for beats; drafted shot plans).
- **Draft ahead on explicit request**: e.g. "draft shot plans for all scenes". Everything drafted is visible, attributed and revisable. The AI never advances on its own initiative.
- **Compile generation context**: assemble prompts and references for each generation from the project's canonical truth.
- **Generate** images, video and audio when the creator initiates it.
- **Carry forward**: established facts, entity identity, looks, style, continuity context, so the creator never has to re-supply them.
- **Fill gaps visibly**: when the creator has not specified something, apply a sensible choice and record it as AI-made.
- **Handle tedium**: bulk actions, location angle generation, splitting long shots to fit generator limits, packaging exports.
- **Surface rather than silently resolve**: conflicts between sources, contradictions with established facts, possibly-out-of-date work.

### 14.2 How much the AI may invent

- **Creative liberty scales inversely with what the creator supplied.** A two-line idea invites invention; a detailed script gets gap-filling only.
- **Established Facts and creator-stated facts are binding.** No generation, including later regenerations, may contradict them.
- **Material inventions are surfaced**: an ending, a character's motive, a major visual identity the creator never specified are either asked about in the interview or recorded as AI-made choices. Minor connective detail (a line of description, a background extra) needs no flag.

### 14.3 What AI must never do

- **Never silently change** the creator's accepted work, uploaded material, or answers.
- **Never silently contradict** Established Facts or creator-stated facts.
- **Never act on its own initiative**: no autonomous advancing, no unsanctioned creative decisions.
- **Never spend meaningfully** without the creator initiating it.
- **Never silently destroy** prior versions, frames or takes.
- **Never alter identity or narrative truth from inside a media step** on its own.
- **Never hide what it assumed** about something material.

### 14.4 Assistants and automation levels

- **CORE:** scoped, in-place AI actions (rewrite this selection, split this shot, draft this scene's shots, generate these takes) and explicitly requested batch drafting.
- **LATER:** a **project-aware assistant** the creator can talk to that proposes changes across the project (e.g. "make Marcus's jacket red from scene 4 on"). When it exists, multi-item changes it proposes arrive as a reviewable set the creator accepts wholly or partly; it never applies cross-project changes directly.
- **LATER:** a full end-to-end "autopilot" path (supply a bundle, AI drafts the whole film for review). Even then, everything drafted is visible, attributed and revisable.

---

## 15. Initial Product Boundary

Classification at capability-family level. **IMPORTANT items must be supported by V2's design and architecture from day one**, even when built after the CORE.

### 15.1 INITIAL: CORE (required to pass the "Aiuteur works" bar)

| Capability family |
|---|
| Project setup and intake of typed text and files (txt/docx/pdf/md), multiple files with roles |
| Interview / clarification producing binding Established Facts |
| Treatment: multiple options, manual editing, targeted selection rewrite, regeneration, import |
| Beat sheet: editing, reordering, targeted rewrite, alternatives, regeneration, import |
| Master Narrative: generation, editing, targeted rewrite, acceptance; screenplay import → conversion |
| World definition: characters, locations (multi-direction coverage by default, single-image option, AI-generated angles), props, extra types, named looks; generate/upload with multiple attempts; defer |
| Visual style (preset / plain-English / reference images) |
| Scene and shot planning: AI-drafted, editable, split/merge, batch across scenes, runtime awareness, composition-reference support in the shot concept |
| Frames: generation, approval, reuse/edit of prior frames, continuity across adjacent shots |
| Takes: generation (background, creator-initiated, cost shown), compare, select, reject, regenerate; native dialogue and sound |
| Review: scene and whole-film sequence playback of selected takes; progress views |
| Export package: ordered, named takes; frames; prompts; written documents |
| Version history and recovery; non-blocking locks at commitment points; quiet possibly-out-of-date marking |
| Cost estimates before meaningful spend |
| Model default with optional override; provider independence |

### 15.2 INITIAL: IMPORTANT (first real product; creator-chosen; architected from day one)

| Capability family |
|---|
| Screenplay export (AI condensation of the Master Narrative, identical dialogue) |
| Writing style |
| Provenance highlight toggle (AI vs creator content) |
| NLE timeline export (Resolve / Premiere / CapCut sequence) |
| Consistent character voices |
| Recorded / uploaded performances driving takes |
| Voice transformation preserving delivery |
| Composition references and reference-driven shots (image/video, subjects replaced) |
| CineBlock-style blocking integration (after the core loop works) |
| Storyboard and shot-list import into shot planning |
| Previs package import |

### 15.3 LATER

| Capability family |
|---|
| Cross-project personal library of entities and styles (copy-on-use) |
| Project-aware AI assistant with reviewable change-sets |
| In-app editing / assembly timeline (stretch goal) |
| Full end-to-end autopilot ("YOLO") |
| Audio-first projects (audio drives the visuals) |
| Audio stems, music/score generation, mixing |
| Features and episodic series as optimized formats |

### 15.4 EXPERIMENTAL

| Capability family |
|---|
| Video transformation: restyling existing footage |
| Compositing |
| Inserting AI/animated characters into live-action footage (live-action hybrid) |

### 15.5 OUT (for now)

| Capability family |
|---|
| "Remix" of copyrighted films/shows (legal risk) |
| Collaboration / multi-user editing |
| Template marketplace, public gallery, community features |
| Native mobile / tablet apps |

---

## 16. Product Non-Negotiables

Downstream design may not casually violate these. **When they conflict, earlier items in the precedence list win.**

### 16.1 Precedence

1. **Creator authority and no loss of work**
2. **Reliability**
3. **Identity consistency**
4. **Speed and ease of the default path**
5. **Cost efficiency**
6. **Feature breadth**

So "a cheaper path that occasionally loses work" or "a richer feature that is fragile" loses automatically.

### 16.2 The principles

1. **The creator is the author.** AI translates, organizes, drafts and assists. It never takes creative ownership or acts on its own initiative.
2. **Respect and provenance.** AI never changes the creator's accepted work unasked. Requested AI edits apply directly and are marked as AI-made. Who made what is always knowable.
3. **Nothing is lost.** Every document version, entity version, frame and take is recoverable. Regenerating never destroys.
4. **No silent destruction.** Synchronization is allowed where it is reliable and transparent (e.g. treatment ↔ beat sheet before the Master Narrative is accepted), but accepted work is never silently overwritten. Work that may be out of date gets **quiet, non-alarming markers with a reason**, and the creator decides what to do.
5. **One canonical narrative.** The Master Narrative is narrative truth. Scenes, entities and shots derive from it; deviations are explicit.
6. **Identity holds.** Characters, locations, props and style stay recognizably themselves. Identity references outrank style.
7. **Cheap before expensive; the creator controls spend.** Visual truth is established cheaply before expensive generation where that helps. Meaningful spend is always creator-initiated, with cost shown.
8. **Light by default, precise on demand.** Every area has a fast default and opt-in precision. Precision tools are never mandatory setup.
9. **Never trapped.** No hard blocking gates by default. Locks are protective friction proportional to downstream work, and always unlockable. Outdated work is explained, never prohibited.
10. **Inspectable, not magic.** What was sent to a generator, what the AI assumed, and why something may be out of date are always viewable, and never required reading.
11. **What you see is true.** Reopening, refreshing or browsing never changes, re-saves, regenerates or loses anything. The state on screen is the real state, and protections shown on screen hold everywhere.
12. **Reliable over clever.** A simple, explicit workflow beats a sophisticated, fragile one. A feature that cannot be made reliable is simplified or cut.
13. **Provider-independent.** No product concept depends on a specific model or vendor. Model capabilities (frame inputs, references, audio, maximum duration, cost) are assumed to vary and change.
14. **Effort is fine; tedium is not.** Repetitive work (carry-forward, bulk actions, gap-filling, organization) belongs to the AI.

---

## 17. Explicitly Rejected or Demoted Legacy Assumptions

### 17.1 The framing: V1's product design was broadly good

**V1 (WizardDirector) failed on implementation quality, not on product concept.** It was buggy, slow and poorly architected. Its *product ideas and experience design* (the stage-based flow, the Rearview Mirror panel, the Stage 5 asset experience, separate frame and video prompts, frame-before-video ordering, highlight-to-rewrite, location views, scene hub) were broadly good and remain **legitimate design references**.

Therefore: **downstream design may adopt, adapt or replace V1 product ideas on their merits. They are neither mandated nor banned.** Do not treat "it was in V1" as a reason to require something, nor as a reason to avoid it.

### 17.2 Rejected (not to be carried forward)

| Rejected | Why |
|---|---|
| **UI-owned workflow state** | Workflow truth (progress, locks, what is out of date) must not live in, or be enforced only by, screens. V1's state was spread across screen code, URL, local storage and the database, and its locks were enforced only in the interface. This violated "what you see is true." |
| **Hard numbers as product law** | Fixed values such as mandatory 8-second shots, exactly 3 treatment variants, 15–30 beats, and a 10-character minimum guidance note are not product truths. Such values are design or tuning decisions. |
| **Mandatory regeneration guidance** | Guidance on regeneration is encouraged but **optional** (V1 required a "Why box"). |
| **Dedicated per-scene Checkout and "Complete Scene" stages** | Dropped *as stages*. Their behavior is kept: cost is shown wherever generation is triggered, and each scene has a clear progress view. |
| **Automatic Git-style branching as a requirement** | Mandatory forks, branch trees and merges are not required. Safety comes from version history, non-destructive regeneration and project duplication. |
| **Provider-specific product assumptions** | E.g. Veo/Gemini/"Nano Banana"-specific prompt formats, fixed clip lengths, or reference limits as product rules. |

### 17.3 Demoted: the product-knowledge corpus

**The largest legacy risk is not V1's design. It is the volume of unbuilt ideas in `_inputs/product-knowledge/`.** That corpus records about 1,900 historical ideas: many good, many speculative, many contradictory, many never built and never validated.

- **Ideas in the product-knowledge corpus carry no design weight unless this Constitution names them** (directly or as a capability family).
- Downstream work **may consult** the corpus for nuance, lessons and alternatives **within an area this Constitution has already defined**, asking "is there anything here that enriches this already-defined part?".
- Downstream work **must not** treat a corpus idea as a requirement, elevate minor or obsolete ideas into design questions, or ask the creator to adjudicate the corpus's internal contradictions.
- Where the corpus and this Constitution disagree, the Constitution controls.

### 17.4 Status of the other corpora

- **`_inputs/legacy-foundational-docs/`** (the old PRD, user flow, CineBlock overview, prompt inventory): coherent prior product definition; a **design reference**, not authority. Its stage counts, numbers, providers, storage choices, locks and branching schemes are not V2 truth unless reaffirmed here.
- **`_inputs/legacy-system/`** (code archaeology of V1): a **lessons and failure-modes reservoir**. Use it to learn what was fragile and why. It never defines what V2 should do.

### 17.5 Lessons from V1 this Constitution encodes

For traceability, the V1 failure modes that shaped the principles above:

- Locks enforced only in the interface, and an unlock-impact warning that never appeared, so cascades ran silently → principles 9, 11; Section 13.4.
- Re-approving the script hard-deleted unmatched scenes together with all their shots, frames and videos → principle 3; Section 7.1 (stable scene identity).
- Autosave on opening a screen created versions and could rewrite locked content → principle 11.
- The clarification step's reconciliation silently rewrote uploaded documents → principle 2; Section 4.2 Phase 2.
- Sophisticated synchronization, invalidation and branching logic built on a weak foundation, much of it partial or dead → principles 4, 12; Section 4.4.
- Video defaulted to a mock provider; export, stitching and audio did not exist; the product never actually delivered a finished piece → Section 3 (the deliverable) and the "Aiuteur works" bar.
- Background work had no recovery; failures could leave items stuck "generating" forever → Section 10.3 (failures visible and retryable).

---

## 18. Deferred Design Questions

These are intentionally **left to the new Wayfinder process**. They must be answered within the boundaries of this Constitution.

### 18.1 Detailed UX

- Overall information architecture: how phases, the scene hub and per-scene production are navigated; whether V1's stage UX, Rearview Mirror, etc. are adopted, adapted or replaced.
- How the interview conversation is presented and when it ends.
- How multiple treatment options are presented, and how many by default.
- How provenance highlighting, possibly-out-of-date markers and AI-made choices are displayed (subtle by requirement).
- How location coverage is presented, generated and accepted in bulk.
- How take comparison, selection and review playback work.
- How cost is presented before spend.
- How CineBlock integrates into the experience.
- Onboarding and first-run experience.

### 18.2 Workflow details

- **Treatment ↔ beat sheet synchronization mechanics** (before Master Narrative acceptance): what syncs, when, and how creator edits are protected.
- **Exact lock points** beyond the Master Narrative (e.g. world definition, shot plans) and how lock friction scales.
- **Whether selecting a take is a formal commitment point.**
- How write-back vs deliberate local deviation is offered and recorded.
- How "possibly out of date" is determined for each kind of change, and how bulk reconcile/regenerate works.
- How scenes keep stable identity across Master Narrative edits.
- How shots exceeding a generator's duration are handled (split/extend).
- Rules for which entities are "needed" vs "deferrable" before production of a given scene.

### 18.3 Domain modeling

- The V2 domain model and glossary (using Appendix B as the starting vocabulary).
- Representation of entities, looks, location coverage, frames, takes, performances, provenance, Established Facts and versions.

### 18.4 System architecture and persistence

- Application architecture, where workflow truth lives (never in the UI), persistence and storage choices, media storage and access control (user media must be private).
- Versioning implementation (document, entity, frame and take history).

### 18.5 Providers and generation

- Provider/model abstraction and capability modeling.
- Default model selection policy and override UX.
- Prompt and reference assembly strategy.
- Voice/performance and voice-transformation provider strategy.

### 18.6 Async execution and reliability

- Background generation, retries, failure recovery, notifications, concurrency, idempotency.

### 18.7 Business and operations

- Billing/credits model and pricing.
- Usage limits and spend safeguards.
- Observability and cost tracking.

### 18.8 Implementation sequencing

- Build order toward the "Aiuteur works" bar, followed by IMPORTANT capabilities.
- Verification strategy (real end-to-end runs, not only mocked tests).

---

## Appendix A: Decision Log

The decisions made in the grilling session that this Constitution encodes. Recorded for traceability; the body of the Constitution is authoritative.

| # | Topic | Decision |
|---|---|---|
| Q1 | Primary user | The individual creative storyteller. Authored commercial projects allowed; not designed for one-click users, volume ad/UGC factories, or frame-level professionals. |
| Q2 | What the product is judged on | The finished, selected video takes. In-app editing is a stretch goal; external editors (Resolve, CapCut) do the final cut. Written materials, prompts and frames must be exportable. |
| Q3 | Consistency promise | Identity-level: entities and style stay recognizably themselves; story coherent. Precision continuity opt-in, never mandatory setup. |
| Q4 | Design-target project | 30 seconds to ~20 minutes; idea to finished piece in a day or a few sessions; features/series not optimized for initially but not precluded. |
| Q5 | Automation ceiling | AI drafts ahead only on explicit request. Not a one-prompt generator, autonomous agent, Adobe/NLE replacement, or slop factory. |
| Q6 | Story phases | Input and Master Narrative mandatory. Interview recommended (an interview until the AI truly understands). Treatment and beats recommended, fully skippable; imported files become their content. |
| Q7 | Master Narrative | One visible, editable, highly descriptive scene-organized document; canonical narrative truth; no camera direction. Screenplay = AI condensation export with identical dialogue. |
| Q8 | Production phases | World definition mandatory but deferrable (V1 Stage 5 experience as reference). Previs optional. Location multi-direction coverage key. Frames recommended. Video mandatory. Voice/performance and reference media optional. Review/export mandatory. Story/world project-wide; production per scene, any order, batch across scenes. |
| Q9 | Entry points | Notes → Input; story → Treatment; outline → Beats; screenplay → Master Narrative conversion. Storyboard, shot-list, previs and audio-first imports must have places in the pipeline. |
| Q10 | Backward changes | No silent rewriting of downstream work; staleness visible; treatment/beats become history after Master Narrative acceptance; shot-level narrative changes written back or recorded as deviations; no automatic branching (versions + duplicate project). |
| Q11 | AI invention | Liberty scales inversely with supplied material; interview answers binding; material inventions surfaced and recorded as AI-made; provenance highlight toggle wanted. |
| Q12 | Protected work | Creator work respected but redirectable anytime; no preview/diff pageantry; requested edits apply directly and are marked AI-generated; solid recoverable version history. |
| Q13 | Commitment points & locks | Master Narrative acceptance and meaningful spend are commitment points; take selection TBD. Locks kept: non-blocking, unlockable, friction proportional to downstream work, starting after Master Narrative acceptance. |
| Q14 | Fixing late; prompts | Fix in place; narrative/identity changes written back or recorded as deviation; prompts and references always inspectable and overridable, never required. |
| Q15 | Project-aware assistant | LATER (future feature after V2's core). |
| Q16 | Core objects | Project, Source Material, Interview & Established Facts, Treatment, Beat Sheet, Master Narrative, Scene, Shot, Character, Location, Prop, Extra type, Style, Reference Media, Frame, Take, Performance, Export Package. "Take" is the term for a generated video attempt. |
| Q17 | Identity & looks | Canonical identity + named looks that carry forward; moment-level changes live in shots. |
| Q18 | Locations | Multi-direction coverage is the default; per-location option for a single establishing image; AI can generate other walls/angles from one image; frame reuse is an ordinary path; must be designed well. |
| Q19 | Shot / Frame / Take | Shot = one continuous camera moment → one clip; flexible duration; frames optional anchors; takes accumulate, one selected. Reference image/video can drive a frame or take with subjects replaced by project entities. |
| Q20 | Cross-project reuse | Personal library conceptually; copy-on-use; full library LATER. |
| Q21 | Voice & performance | CORE: native dialogue with takes. IMPORTANT (creator's choice): consistent voices, recorded/uploaded performances, voice transformation preserving delivery. LATER: stems, music, mixing. |
| Q22 | Previs & reference shots | Composition references and reference-driven shots IMPORTANT; CineBlock IMPORTANT after the core loop; core shot model reserves room. |
| Q23 | Imports | Storyboard/shot-list import IMPORTANT; previs package import IMPORTANT (with CineBlock); audio-first LATER. |
| Q24 | Model choice | Sensible default with optional per-project/per-shot override; provider-independent. |
| Q25 | "Aiuteur works" bar | Accepted as the minimum bar; V2 must be architected from day one for all IMPORTANT capabilities. |
| Q26 | Non-negotiables | 14 principles accepted; principle 4 reworded: sync allowed where reliable (treatment↔beats), out-of-date markers quiet. |
| Q27 | Precedence | Authority/no loss > reliability > identity > ease > cost > breadth. |
| Round 7 | Legacy | V1 product design broadly good (design references, neither mandated nor banned). Rejected: UI-owned workflow state; hard numbers. Real baggage: unbuilt product-knowledge ideas must not drive design. |
| Q28 | Treatment options | Multiple options are a default feature (count is a design choice). |
| Q29 | Regeneration guidance | Optional. |
| Q30 | Checkout / Complete Scene | Dropped as stages; behavior kept (cost before spend, per-scene progress view). |
| Confirm | Sync timing | Treatment↔beats autosync applies before Master Narrative acceptance; afterwards treatment/beats are development history. |

---

## Appendix B: Glossary

| Term | Meaning in V2 |
|---|---|
| **Creator** | The person making the film; the author. |
| **Project** | One film in progress, with its settings (intended runtime, format/aspect, tone, rating, style) and everything below. |
| **Source Material** | What the creator supplied: typed text and files, kept as originals, each with an understood role. |
| **Interview** | The clarification conversation in which Aiuteur asks the creator questions until it understands what they want to make. |
| **Established Facts** | Interview answers and creator-stated facts, recorded as binding project knowledge that later generation may not contradict. |
| **Treatment** | The story told as continuous prose; a development document. |
| **Beat Sheet** | The story as a structured sequence of major events; a development document. |
| **Development history** | Status of treatment and beat sheet after the Master Narrative is accepted: viewable and editable, not kept in sync. |
| **Master Narrative** | The single canonical, highly descriptive, scene-organized narrative document; the source of narrative truth for production. |
| **Screenplay export** | An AI condensation of the Master Narrative into conventional screenplay form with identical dialogue; a view, not a source. |
| **Entity** | A reusable creative element with persistent identity: character, location, prop, extra type (also style and voice in the broader sense). |
| **Canonical identity** | An entity's single creator-approved description plus reference image(s). |
| **Look** | A named, story-driven appearance of an entity (e.g. "Marcus, muddy suit"), anchored to its canonical identity and carried forward until the story changes it. |
| **Extra type** | A recognizable kind of background figure generated with natural variation; no individual identity. |
| **Location coverage** | A location's set of directional views (walls/angles); multi-direction by default, single image by choice. |
| **Visual Style** | The project-wide look; required, easy to set. Identity outranks style. |
| **Writing Style** | Optional guidance for the voice of written documents and dialogue. |
| **Reference Media** | Creator-supplied images/video used for inspiration, parody or shot recreation; subjects are replaced by project entities. |
| **Composition reference** | A blocking capture, sketch, storyboard frame or reference image/video that controls a shot's framing and staging. |
| **Scene** | A narrative unit derived from the Master Narrative; the organizing unit of production. |
| **Shot** | One continuous camera moment that becomes one clip; the unit of generation. |
| **Frame** | A still image establishing a shot's visual truth before (or instead of) driving video; recommended, not mandatory. |
| **Take** | One generated video attempt for a shot. Takes accumulate; one is the **selected take**. |
| **Performance** | A creator-recorded or uploaded voice/dialogue performance that a take can follow. |
| **Voice** | A character's persistent voice identity. |
| **Provenance** | Whether content was written by the creator, imported, AI-generated, or AI-edited at the creator's request. |
| **AI-made choice** | A material decision the AI made where the creator specified nothing; visible and overridable. |
| **Possibly out of date** | A quiet, non-blocking marker (with a reason) on work that an upstream change may have affected. |
| **Deliberate local deviation** | A recorded, intentional difference between downstream work (e.g. a shot's line) and its upstream truth (e.g. the Master Narrative). |
| **Write-back** | Updating upstream truth (Master Narrative or entity) from a change made downstream, at the creator's choice. |
| **Commitment point** | A moment requiring explicit creator action: accepting the Master Narrative; initiating meaningful spend. |
| **Lock** | Non-blocking, always-unlockable protection on committed work, with friction proportional to the downstream work at risk. |
| **Export package** | The deliverable bundle: selected takes (named, ordered), frames, prompts, written documents. |
| **Design reference** | A legacy idea that design may adopt, adapt or replace; neither mandated nor banned. |

---

## Amending this Constitution

- Only the creator amends this Constitution, deliberately.
- A proposed amendment states: the section affected, the current text, the proposed text, and the reason (e.g. a design discovery that makes a decision unworkable).
- Approved amendments are applied to the body and recorded below with a date.
- Downstream documents that conflict with an amendment must be updated; they do not silently override it.

### Amendment log

| Date | Section | Change | Reason |
|---|---|---|---|
| | | *(none yet)* | |
