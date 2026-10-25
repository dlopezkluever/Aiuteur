# Shots: model, realization pipeline, identity, long shots, composition and hooks

Resolution of Wayfinder ticket #55. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). The two hard-to-reverse choices are recorded in [ADR 0012](../adr/0012-shot-identity-survives-split-merge-and-redraft-by-keep-first-and-options.md) and [ADR 0013](../adr/0013-a-take-is-an-assembly-of-segments-so-long-shots-stay-one-clip.md). This is a design contract, not a schema; field names are illustrative and no screen is designed (the scene workspace is #60, planning inputs #61, review #62, the generation package #65, voice #69).

Authority: Constitution §§4.4 (6, 7), 6.4, 7.2–7.3, 8.1–8.3, 9, 10.1–10.3, 11.1, 13, 16; [`CREATOR-RATIFICATION-RECORD.md`](../product/CREATOR-RATIFICATION-RECORD.md) R1–R3, R8–R9, M1, M3; [`CREATOR-RATIFICATION-RECORD-2.md`](../product/CREATOR-RATIFICATION-RECORD-2.md) P1–P3, P5, P7, X3, X5, X8, D60.4–D60.6, D61.3, D61.5; [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md); [`ENTITIES-AND-LOOKS.md`](ENTITIES-AND-LOOKS.md); [`LINEAGE-AND-STALENESS.md`](LINEAGE-AND-STALENESS.md); [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md); [`STORY-DOCUMENTS.md`](STORY-DOCUMENTS.md); [`JOB-LIFECYCLE.md`](JOB-LIFECYCLE.md); [`../ai/AI-RESPONSIBILITY-MAP.md`](../ai/AI-RESPONSIBILITY-MAP.md); [`../ux/NAVIGATION.md`](../ux/NAVIGATION.md); [`../ux/TRUST-SIGNALS-AND-LOCKS.md`](../ux/TRUST-SIGNALS-AND-LOCKS.md). V1 (legacy 07 §11, legacy 08 §§1–3, 5–8, 11) is cited only as failure evidence. Provider facts come from the video research (#5, 2026-10-18) and were re-checked on 2026-10-21 where a decision hinges on them (§7.6).

**No `CONSTITUTION AMENDMENT REQUIRED`.** Nothing here makes a CORE or IMPORTANT requirement impossible. The "may not reopen" items are all kept: one continuous camera moment is one clip, duration is flexible, frames are recommended and never mandatory, there is no fixed two-anchor structure, takes accumulate, and split and merge invent no story. Two honest limits are recorded as limits, not amendments: how faithfully a generator follows a composition reference (§8.4) and audio continuity across the joins of a stitched long shot (§7.4).

## 1. V1 failures and the rule that answers each

| V1 failure | Rule here |
|---|---|
| The shot had seven shapes (legacy 08 §1; legacy 15 SP-09) | One Shot (§2) with one owner per slice. Compiled prompts and manifests are derived, never stored as a second truth. |
| Split deleted the original and re-inserted rows, non-transactionally, cascading frames and jobs; merge cascaded too (08 §§3.2–3.4) | Split and merge are one atomic action group with explicit identities (§5). Nothing is deleted; Frames and Takes stay attached. |
| Each split part got the full duration, so the scene grew; merge summed to 16 s (08 §§3.2–3.3) | Durations are partitioned and summed by code, with provenance (§5.2). |
| Split and merge dropped structured camera, direction and manual location links (08 §1.4) | Every shot field has a defined carry rule on split and merge (§5.2–5.3). |
| Shot lineage was only the label `1A-M` (08 §1.4) | Identity is an id plus `split_from` and `merged_into` (§5). Labels are derived from order. |
| Regenerating prompts overwrote the creator's continuity choice and reference order (08 §6.7; 07 §11.2) | Creator-touched fields and settings are never changed by a redraft (§5.4). |
| Chaining depended on the entry point (bulk vs single regenerate vs control mode) (07 §11.5) | One explicit Continuity link on the Shot, resolved by one rule everywhere (§6.4). |
| Reuse-as-base silently ignored when the base went missing; UI contradicted persistence (07 §11.4) | Frame reuse is lineage on a new Frame (§6.3); the shot refers to the Frame it uses, and drift is derived (§6.3, §9). |
| Approval was half-wired; video did not honour approved frames (08 §§7, 11) | Required frames are defined by the Frame plan and enforced by the batch dependency rule (§6.5). |
| A 3-way `start_continuity` enum rewritten by a regex (07 §11.2) | Continuity intent is a creator-visible, AI-made-choice field (§6.4); no regex decides it. |
| An 8-second clamp was product law (08 §11; research A3) | Duration is a flexible target; a generator's limit is handled inside the Take (§7). |

## 2. The Shot

A **Shot** is an Editable object: one continuous camera moment that becomes one clip. It has its own permanent id, never derived from position, label or text. Its parent is a Scene id ([`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) §3), or none for an **ad-hoc shot** (Record 2 X5; see "Record 2 amendments" at the end). Its order is the order of its Scene's **Shot plan** (§3). "Shot 4B" is a label computed from order.

### 2.1 Fields: structured, free, derived

Each field below is a **slice**: the smallest unit that lineage captures and compares ([`LINEAGE-AND-STALENESS.md`](LINEAGE-AND-STALENESS.md) §2.1). A slice is **narrative-bearing** (an edit below the owning level raises the write-back or deviation choice, Record 1 R3) or **shot-owned** (an edit never does).

| Slice | Form | Class | Notes |
|---|---|---|---|
| **anchor** | block ids of the Master Narrative within the Scene (§3.2) | structure | The Shot's link to the story. Not a text copy. |
| **action** | free text, what a viewer sees | narrative-bearing | AI-drafted from the anchored passage; the creator edits freely. |
| **dialogue** | ordered **Dialogue lines**, each: own id, anchor to a Master Narrative dialogue block (optional text span), speaker (Entity reference or plain name), line text, delivery | line text and speaker narrative-bearing; delivery shot-owned (see below) | Exactly-once, verbatim coverage by default (guards AI-map G3, AI-map G5). |
| **presence** | explicit differences from the derived Presence (§4) | narrative-bearing | Entity add, remove, Look override. |
| **location** | explicit Location, else derived (ENTITIES §5.3) | narrative-bearing | Which place. |
| **direction** | explicit Direction slot, else the persisted AI-made choice | shot-owned | Which wall or view of the place. It is a cinematic choice, not story. |
| **camera** | optional facets (shot size, angle, movement, each from a closed list) plus free **camera notes** | shot-owned | Any depth (§7.2 of the Constitution). Facets are never parsed out of notes, and notes are never parsed into facets: both are stored as written (V1 never parsed `SHOT - ANGLE - MOVEMENT` back, legacy 08 §1.2). |
| **duration** | approximate seconds with provenance (creator or AI estimate) | shot-owned | A target, not a promise (§7). |
| **continuity** | the **Continuity link** (§6.4) | shot-owned | |
| **composition** | the Shot's **Composition references** (§8) | shot-owned | The CORE slot. |
| **frame plan** | which Frame roles are wanted, or an explicit skip (§6.1) | shot-owned | |
| **visual notes**, **sound notes** | free text | shot-owned | Look, lighting, staging, ambience and effects that are not story. They exist so the creator can add detail without raising the narrative choice. |
| **prompt override**, **model override** | free text; a model choice | shot-owned | Reserved here; shaped by #65 as layer-addressed Override items and compile rules in [`GENERATION-PACKAGE.md`](GENERATION-PACKAGE.md) §8. A prompt override is recorded on each Generation and shown as "prompt overridden" (Record 1 R3 limit). |

Judgement call on delivery: the Master Narrative's dialogue block carries a delivery note, and the shot's refinement of it (a sharper note for the generator) is shot-owned. The narrative delivery is the default and the shot's value, when set, is shown as an override. Line text and speaker are narrative truth and raise the choice. This is reversible by moving one slice's tag. **Ratified (Record 2 P1):** changing delivery never raises the write-back/deviation choice, and a shot's delivery override carries one quiet **Copy to narrative** action, so writing it back is always available and never asked. **Record 2 P2:** a shot's Direction is shot-owned and never asks.

**Free text is not semantically checked.** `action` edits are compared to the Basis, so any change raises the choice (LINEAGE §5.5). To keep this from nagging, the choice is one quiet line under the field, "Decide later" is the resting state, and the deviation record covers the field-to-anchor relation so further edits to the same field stay deviant without re-asking ([`LINEAGE-AND-STALENESS.md`](LINEAGE-AND-STALENESS.md) §5.4). Detail the creator adds that does not change the story belongs in visual and camera notes, which never ask.

### 2.2 Not on the Shot

The Shot holds no entity description, no image, no style text, no compiled prompt and no status. Entity facts are referenced through Presences (ENTITIES §6). Status, runtime and readiness are derived (§6.6). The selected Take is a Decision on the Shot, not a flag in a Take (DOMAIN-MODEL §4.3).

### 2.3 Basis

When AI drafts or redrafts a Shot, its **Basis** is stamped: the fingerprints of the anchored blocks, the Generation that drafted it, and the content of each drafted slice at that moment. The creator's own edits never re-stamp it. Only a redraft or an explicit reconcile does ([`LINEAGE-AND-STALENESS.md`](LINEAGE-AND-STALENESS.md) §2.1). A Shot a creator adds by hand has no Basis and no AI draft.

## 3. The Shot plan and narrative anchoring

### 3.1 Shot plan

Each Scene has one **Shot plan**: an Editable ordered list of Shot ids (active and retired), changed by Revisions (insert, reorder, retire, un-retire, split and merge records). The plan is where order, the last-edit action group and the **plan accepted** Decision live. It is the scope that a shot-plan lock covers ([`../ux/TRUST-SIGNALS-AND-LOCKS.md`](../ux/TRUST-SIGNALS-AND-LOCKS.md) §3): structure and the planning slices of its shots are protected; new Frames and Takes are not.

- **Plan accepted** is a lightweight Decision (the creator pressed accept, or edited the plan). It lets the overview and scene workspace tell "AI drafted, untouched" from "confirmed". It gates nothing, so a drafted plan is usable as it stands (Constitution §7.3: "simply accepted"). It is not a commitment point and not a lock.
- A Scene with zero shots is valid. The last shot can be retired (V1's `LAST_SHOT` 409 is not carried).
- **Initial draft (Record 2 D60.5, refined by [Record 3 CR-2](../product/CREATOR-RATIFICATION-RECORD-3.md)).** When the creator enters a Scene that has **no** Shot plan, the initial plan drafts automatically only if its estimate is **below $0.05** and no exceptional spend condition applies. At **$0.05 or more**, show **Draft plan · $x** and wait for the click. Exceptional conditions use the existing inline spend ticket, and a cap breach offers no Start (BUSINESS-AND-OPERATIONS §3). This is a text operation for that Scene only. It never redrafts or replaces an existing plan (a plan the creator emptied by retiring its shots is an existing plan), and it never triggers frames, images, worlds, Takes or audio (Record 2 X8). **Draft all** drafts shot plans only (Record 2 D60.4); on a Scene that already has a plan it is a redraft under §5.4.

### 3.2 The anchor

A Shot's **anchor** is a contiguous run of blocks in its Scene, stored as (document, first block id, last block id), with optional character offsets in the first and last block when the Shot covers only part of a block. A dialogue line anchors to exactly one dialogue block, with an optional span.

- **The Shot owns the anchor.** The narrative holds no reference to shots, so a rewrite never needs to know about them.
- **Overlap is allowed.** Several shots may anchor to one block (an action paragraph covered by three shots). **Coverage is derived**: blocks anchored by no active Shot are listed quietly as "not covered by a shot" in the plan. It is information, never a gate.
- **Block lifecycle follows ids** ([`STORY-DOCUMENTS.md`](STORY-DOCUMENTS.md) §2.2): a block split keeps the anchor on the id-keeping upper part and surfaces the new lower block as uncovered; a block merge redirects through `merged_into`; a retired block makes the anchor `input-retired`. Any change to an anchored block marks the Shot `narrative-changed` through its Basis. Nothing is guessed.
- **Unanchored shots** are allowed (an insert or cutaway the creator adds to a Scene that the narrative does not mention; ad-hoc shots, which have no Scene, are outside this rule while ad-hoc, Record 2 X5). They have no Basis, so nothing can drift, but they are not in the story either, so they get the same three-way choice once: write it back (the creator or an AI-edited request adds a passage, a new Master Narrative Revision), keep it as a deliberate deviation, or decide later. The Constitution requires the shot plan to stay consistent with the Master Narrative (§7.3), and this is the quiet way to keep it so.
- **Re-homing** between scenes is a Decision with the rules of SCENE-IDENTITY §3.

## 4. Per-shot entities: derived, with explicit overrides

Presence at shot level is **derived**, and only the differences are stored.

1. **Derived Presence** = the Scene's on-screen and setting Presences whose Mentions fall inside the Shot's anchored passage. A Shot with no anchor derives all of the Scene's.
2. **Look** for each derived entity is resolved by the carry-forward rule at the Shot's anchor position ([ADR 0002](../adr/0002-looks-and-carry-forward-derived-from-narrative-position.md)). Look changes inside the Scene follow, because the anchor sits at a passage.
3. **Overrides** are the only stored Presence data: `(entity, add | remove | Look: <Look or base>, optional prominence, optional density for an Extra type)`. Each has provenance. An AI-proposed add ("the action says Marcus enters, but the passage does not name him") is an **AI-made choice**; an unknown name becomes a suggestion, never an entity (AI map, shot drafting). Overrides are local and explicit: they do not carry forward and are not change points.
4. **Prominence** (featured, supporting, background) is an optional hint for #65's reference priority. It defaults from the Mention and is stored only when the creator or AI sets it.
5. **No duplication.** There is no per-shot copy of a Presence list: if the Scene's Presence or a Look assignment changes, the Shot's derived Presence changes with it, and work that captured the old resolution drifts through Generation inputs (`look-changed`, `identity-changed`).
6. **Identity edits below the level.** A Look override that expresses a new appearance ("Marcus has a scar here") raises the identity choice (ENTITIES §6): create or edit a Look (write-back) or keep a deviation on this Presence. Readiness for a needed entity follows ENTITIES §7 and never gates.

### 4a Asset roster and state plan (Record 4 W60 §§5.5–5.6)

The creator sees and edits the shot's entities as one **asset roster**: the derived Presences plus overrides above, each extended with a **state plan**. The AI initializes it from the anchored passage and World Definition; every entry is inspectable and editable, and manual add and remove are overrides (item 3).

| Roster field | Meaning | Class |
|---|---|---|
| **on screen** | throughout · enters during · leaves during · opening frame only · ending frame only | shot-owned |
| **state at opening**, **state at ending** | a **Look** (persistent) or a **shot-only state note** (transient); default: the resolved Look at opening, no change at ending | Look: see below; note: shot-owned |
| **action note** | the asset's action or blocking in this shot | shot-owned |

- **Frame asset sets derive from the roster.** A Frame role's entities are those on screen at that role's moment (opening, ending, or a keyframe's position), each in its state there. The frame work may override composition details per Frame role; it does not edit the roster.
- **Persistent change (a transformation).** An ending state that is a different Look means the entity changes Look during this shot. Opening frames use the opening Look, ending frames the ending Look, and the video prompt describes the change. It is stored as a **Look assignment** (ENTITIES §4.1) at a position refined to the end of this shot's anchored passage, so it **carries forward** to later shots until changed again. Because it changes story state it is narrative-bearing: it raises the write-back or deviation choice (Record 1 R3) once, with write-back the natural answer. A target Look that does not exist yet is created with **Add Look** from the roster (description-only is allowed, ENTITIES §3).
- **Transient change.** A shot-only state note ("glass shattered", "soaked") shapes this shot's ending frames and prompts only. It is not a Look, is not a change point and **never carries**. It is the default kind of ending state.
- **Switching Look for a later shot.** "From here on: Look Y" in the roster writes an open-ended Look assignment at this shot's position. A change that happens off screen is set the same way from World Definition at any narrative position (ENTITIES §4.1).
- The roster, its state plan and each Frame role's derived set are inputs a Generation captures, so changing them drifts work through lineage like any other slice.

Location and Direction: the Shot stores only the creator's explicit Location and Direction. Absent those, location derives from the setting Mention and Direction is the AI's choice at planning, persisted as an AI-made choice that does not re-derive silently ([`ENTITIES-AND-LOOKS.md`](ENTITIES-AND-LOOKS.md) §5.3). The Shot points to a **Direction slot**, never to a View Attempt.

## 5. Shot identity under split, merge, reorder and redraft

Identity is the Shot id. These rules make it survive every structural edit, using the same keep-first and retire-with-redirect pattern as blocks, scenes and entities ([ADR 0012](../adr/0012-shot-identity-survives-split-merge-and-redraft-by-keep-first-and-options.md)).

### 5.1 Operations and ids

| Operation | Ids | Atomicity |
|---|---|---|
| **Insert** | New id. | One Shot plan Revision. |
| **Reorder** | Ids unchanged; only the plan changes. | One Revision. |
| **Retire** (delete) | Retired in the plan. Frames, Takes, anchors, Decisions stay attached and reachable. Excluded from runtime, batch scopes and the default export. Un-retire restores it with its id. | One Revision. |
| **Split** | The first part **keeps the id**. The second part is a new Shot with `split_from`. Dialogue lines keep their ids with the part that contains them. A line cut across the boundary keeps its id in the first part and gets a new line id with `split_from` in the second. | One action group: the plan Revision plus both Shot Revisions. All or nothing. |
| **Merge** (two adjacent shots in one Scene) | The **earlier keeps the id**. The later is retired with `merged_into`. All line ids survive. | One action group. |
| **Move to another Scene** | Id unchanged; a re-homing Decision. | One Decision. |
| **Duplicate shot** | New id, `duplicated_from`, planning slices copied, no Frames or Takes. | One Revision. |
| **Redraft** (§5.4) | Ids of matched shots unchanged; new shots get new ids; nothing is retired automatically. | One action group. |

Split and merge are undoable by reversing the action group: parentage, ids and content are restored exactly (a fixture in §12). A cross-scene merge is a Scene merge, not a Shot merge.

### 5.2 What a split does

Code cuts at boundaries the creator picks or an L call proposes (AI map: split chooses boundaries, code cuts). It only partitions; it invents no story (AI-map G3: the dialogue multiset and order are preserved; the action text is partitioned or kept whole, never rewritten).

| Slice | Carry rule |
|---|---|
| anchor | Partitioned along the cut; a boundary inside a block uses offsets. |
| action, dialogue | Partitioned; creator-written runs keep their provenance. |
| presence overrides | Copied to both parts (they describe the whole); the creator trims. |
| location, direction | Copied to both. |
| camera, visual and sound notes | Copied to both as the starting point, with their provenance. |
| duration | **Partitioned, never duplicated:** the parts sum to the original, split in proportion to the text each received (by code), marked as estimates. If the original was creator-set the parts are marked as derived from a creator value. The scene's total does not grow. |
| continuity | The first part keeps the link; the second part continues from the first (`continues`, §6.4). |
| composition references | Stay with the id-keeping part, with a quiet "Copy to the other part" offer. |
| frame plan | Both get the original's roles; existing Frames stay on the first part. |
| Frames, Takes, selected take | **Stay on the first part's id.** They are not moved: Attempts are immutable. The first part is marked by lineage (`shot-changed`) because its action and duration slices changed, and the exits apply (Regenerate, Keep). |
| lock | A lock on the Shot plan covers both. |

Frames can be **reused** into the second part as ordinary lineage (§6.3): an offer, "reuse the ending frame as the new shot's ending", never automatic.

### 5.3 What a merge does

Code concatenates in order: anchors union (the run must be contiguous or the merge spans the gap, which keeps the blocks between and flags nothing as lost); actions and dialogue lines concatenate in order with their ids; durations sum, still an estimate; presence overrides union; composition references union. A merged shot is one camera moment, so there is **one camera**: the survivor's facets and notes stay, and the retired shot's camera intent is appended to the survivor's camera notes as a quoted note so nothing is lost. Frames and Takes of both stay on their own shots. The survivor shows the retired shot's Frames and Takes as "from the merged shot", reachable and viewable, and not eligible as the survivor's selected take (a pointer references a Take of its own Shot only). The merge marks the survivor `shot-changed`. A merge adds no story by construction.

### 5.4 Redraft never overwrites the creator

Redrafting a shot or a whole plan ("update from narrative", "Draft all scene plans" again, a re-run after the Master Narrative changed) is a defined workflow operation (Record 1 M3). Its rules:

1. **Drafted fields vs creator settings.** A redraft may propose changes only to the **drafted slices**: action, dialogue partition, presence suggestions, camera, duration, direction, continuity intent, frame plan suggestion. It never touches **creator settings**: composition references, an explicit skip of frames, the model and prompt overrides, a pinned continuity source, locks, Decisions, the selected Take, or any Frame or Take.
2. **Protected fields.** A drafted slice whose latest Revision is creator-written, imported or AI-edited at the creator's request is protected, exactly like protected spans ([`STORY-DOCUMENTS.md`](STORY-DOCUMENTS.md) §3): passed to the model as handles and restored by code.
3. **Apply vs Option.** For a Shot whose drafted slices are all untouched AI output and which has no dependants (no Frame or Take), the result applies as an AI-made Revision with the Basis re-stamped. In every other case the result is a **proposed Shot Revision Option**: the creator applies it whole, per slice, or not at all. Applying re-stamps the Basis for the slices applied; the rest stay.
4. **Plan-level redraft is matched, not replaced.** The model receives each existing shot as a handle and returns, per drafted shot, the handle it continues or `new` (the same handle pattern as scene mapping, [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) §4.2). Code checks the handles (AI-map G2). Shots with dependants or creator edits are only ever offered through Options; new shots are added as proposals; **an existing shot the new draft omits is listed, never retired**. A plan with nothing to protect applies directly as one action group, undoable.
5. **Locks.** A shot plan lock holds the result as an Option (ADR 0005).
6. **Batches and dismissals (Record 2 D60.6).** A batch redraft (Draft all) follows these rules per Scene, its applied results are undoable, and its spend follows the batch rules. A dismissed Option or proposed shot is retired, never deleted (Record 1 R1).

## 6. The realization pipeline

### 6.1 Frame plan, roles and the skip path

A Shot's **Frame plan** lists the **Frame roles** the creator or AI wants. A role is an entry with its own id: a kind (**opening**, **ending**, or **keyframe**), a label, and for a keyframe a position in the clip. The default drafted plan is an opening role, plus an ending role when the AI judges one useful (an AI-made choice). Any structure is allowed: opening only, opening and ending, several keyframes, or none.

- **Each role is a Slot.** Its Attempts are Frames; one is **approved** (Decision, the creator's). The shot refers to the role's Slot, never to a Frame.
- **Skipping frames** is a Decision on the Shot (the whole plan) or on one role. A skip is not the same as undecided: the derived state reads it as intended (§6.2). A creator can un-skip at any time.
- **Direct-to-video** is therefore just a Shot whose Frame plan is skipped. It shares every other step with the framed path.
- **Provider honesty.** Roles express intent, independent of a provider. The compiler (#65) maps opening and ending to first and last frame where the model supports them, and a keyframe only where a model documents pinned keyframes (research: some do, many do not). A role the chosen model cannot pin is used as a reference instead and reported quietly ("this model can't pin a middle frame; used as a reference"). It never blocks. Models that cannot combine frames with identity references (research A2) are handled by the compiler's capability profile (#66), not by the Shot.

### 6.2 State description

The state of a Shot's realization is **derived** from recorded facts (Frame plan, Frame Decisions, Generations and Jobs, Takes and the selection). Nothing below is a stored status column.

```diagram
                         Shot exists (drafted or added; anchored or not)
                                         │
                       ┌─────────────────┴─────────────────┐
                       │ Frame plan: roles planned          │ Frame plan: skipped
                       ▼                                    │ (creator Decision, whole or per role)
            ┌───────────────────────┐                       │
            │ Framing                │                       │
            │ per role: no Frame →   │                       │
            │ Frames made →          │                       │
            │ one approved           │                       │
            └──────────┬────────────┘                       │
                       │ every planned role is approved      │
                       │ or skipped                          │
                       ▼                                    ▼
                 ┌─────────────────────────────────────────────────┐
                 │ Ready for video                                 │
                 │ (inputs: approved Frames, entities and Looks,   │
                 │ Direction/View, composition, continuity, style) │
                 └──────────────────────┬──────────────────────────┘
                                        │ creator initiates (price shown)
                                        ▼
                 ┌─────────────────────────────────────────────────┐
                 │ Generating: derived from a non-terminal Job      │
                 │ (one Generation, or a Batch of Segment           │
                 │ Generations for a long shot, §7)                 │
                 └──────────────────────┬──────────────────────────┘
                                        │ media persisted, Take assembled
                                        ▼
                 ┌─────────────────────────────────────────────────┐
                 │ Has Takes ── compare ── reject ── regenerate     │
                 └──────────────────────┬──────────────────────────┘
                                        │ select (Decision, reversible)
                                        ▼
                 ┌─────────────────────────────────────────────────┐
                 │ Selected take ── optional Mark final (lock)      │
                 └─────────────────────────────────────────────────┘

 Any state can return to an earlier one: edit the shot, approve a different Frame, regenerate.
 Upstream changes add a quiet "possibly out of date" overlay; they never change the state.
```

| Derived state | Defined by |
|---|---|
| **Planned** | The Shot is active in its Scene's plan. |
| **Framing** | At least one planned role has no approved Frame and frames are not skipped for it. |
| **Frames skipped** | The creator's Decision, whole plan or per role. |
| **Ready for video** | Every planned role is approved or skipped. A Shot with an empty Frame plan is ready. |
| **Generating** | A non-terminal Job exists for a Generation targeting this Shot's video Slot (JOB-LIFECYCLE §1). |
| **Has takes** | At least one non-rejected Take exists. |
| **Needs a pick** | Has takes and no selection. |
| **Selected** | A selection pointer references a non-rejected Take of this Shot. |
| **Final** | The selected Take's slot is locked (Mark final). |
| **Attention overlays** | Failed Generation; possibly out of date; unresolved write-back or deviation. |

Ready for video is an explanation, not a gate (principle: readiness explains, never gates). The creator may initiate video on a Shot that is still in Framing: the action offers "Generate without the unapproved opening frame", which records the skip for that role as a Decision and proceeds. The one place readiness shapes behaviour is the batch dependency rule in §6.5.

### 6.3 Frames: sources, reuse and lineage

A Frame is an immutable Attempt for a role Slot. It records how it came to exist (its **source**):

| Source | Made by | Generation? |
|---|---|---|
| **generated** | An image Generation from the Shot's package (identity, Look, Direction View, style, composition, continuity base) | yes |
| **uploaded** | The creator | no |
| **reused** | The same Media taken as-is from another Frame (any shot, including the previous scene's last shot) | no |
| **edited** | A Generation whose input names a base Frame (change a pose, add a character, new angle on the same background) | yes |
| **extracted** | A deterministic still taken from a Take at a time, typically its last frame | no |

There is no "captured" source. A previs capture (e.g. a CineBlock start composition) is a Composition reference (§8), never a Frame: a Frame made from it is **generated**, with the capture among its inputs and placeholders replaced by the project's entities (Record 2 D61.3; [`SHOT-PLANNING-INPUTS.md`](SHOT-PLANNING-INPUTS.md) §§1, 4).

Rules:

- **Reuse and editing are ordinary and explicit.** A reused or edited Frame is a new Frame in the later shot with `derived_from` naming the source Frame (or Take), a role (**base** or **reference**) and the Generation if any. Identical pixels do not merge two Frames. The source is never touched. Reuse as-is creates no Generation and costs nothing.
- **The shot's chosen base is a persisted explicit selection** in the Continuity link (§6.4), the same for single and batch generation. Whatever a package carries is recorded on its Generation, so what ran is always knowable (V1's preview and persisted lists disagreed, legacy 07 §11.8).
- **A source whose approval moves drifts.** If a different Frame becomes approved for the source role, Frames and Takes derived from the old one are marked `frame-changed` (derived, quiet, with Keep/Regenerate exits). A reused Frame with the unchanged Media does not change appearance, so it is only marked if the creator wants it to follow.
- **Promotion.** A Frame can be promoted to a location View (ENTITIES §5.1); that records lineage and shares the Media.
- Every attempt is kept (Constitution §9.2).

### 6.4 Continuity link

The **Continuity link** is a Shot-owned slice with two parts:

1. **Intent** (the creator's or an AI-made choice, overridable):
   - **cut**: no visual dependency on the previous shot (a new place, a time jump);
   - **continues**: the opening should match how the previous shot ended;
   - **same place, new view**: keep the previous frame's background and place, recompose for the new view or pose;
   - **match** (Record 4 W60 §5.7): a compositional match cut, with a kind such as graphic, action or eyeline (the final list is spec-level) and an optional free-text cut note. It echoes the previous ending's shape, motion or eyeline in a new place or subject.
2. **Source** (optional pin): a specific Frame, or a Take's end still. Absent a pin, the source is **derived**: the previous active shot in narrative order, which for the first shot of a Scene is the last active shot of the previous Scene (the scene-boundary rule, Constitution §9.2). The derived source is, in order: the previous shot's approved ending Frame; else the last still extracted from its selected Take; else none (reported quietly, never blocking).

How the intent is used is one rule everywhere: **match** feeds the source as a framing Composition reference (§8, uses: framing and staging), never as a base image; **continues** feeds the source as the opening Frame's base (reused as-is when the camera and view match, edited when they differ), **same place, new view** feeds it as a base for a recomposed Frame, **cut** feeds nothing. In the **skip-frames** path the same source is captured on the video Generation as a derived still input (not a Frame of this shot), so direct-to-video shots chain too. The captured source is part of the Generation's inputs, so a change to the previous shot's approved Frame or selected Take marks this shot's work `frame-changed` with the source named (no new reason code is needed).

The intent is drafted by L as part of shot drafting (AI map: no regex decides). A redraft does not change an intent the creator touched (§5.4).

### 6.5 Batches and required frames

Video Generations are created in a batch only for Shots that are **ready for video**, that is, every planned role approved or skipped by a recorded Decision (JOB-LIFECYCLE §8: "video members never depend on unapproved frames"). Shots in the scope that are still in Framing are listed ("3 shots not included: waiting for a frame") with one action, "Include them anyway (skips their frames)", which records the skip Decisions. Still-image batches may carry real data-flow dependencies (shot 4's opening reuses shot 3's ending). A batch never depends on an unapproved Frame for video.

## 7. Over-length shots: one Shot, one Take, several Segments

### 7.1 The problem and the decision

A shot is one continuous camera moment and one clip in the edit (settled). A generator accepts a limited duration per call, and the limit varies by model (research A3: Veo 4/6/8 s, Kling 3–15 s, Wan 3.0 2–30 s, Luma 5 or 10 s, LTX up to 20 s). Extension exists on some models only, with constraints (§7.6). **Aiuteur handles it; the creator never has to split a shot for a generator's sake** (Constitution §7.3).

**Decision (ADR 0013):** the Shot is unchanged. The limit is absorbed below the Shot, in the Take. A **Take is an assembly of one or more Segments**. A **Segment** is one generator output (an immutable Attempt-class artifact: media, its time range in the Take, the input still it started from). For a shot that fits one call the Take has one Segment and its media is that Segment's media (no copy, no assembly step). For a longer shot, several Segment Generations run as a dependency-ordered Batch and a final deterministic assembly produces the Take's single clip. The edit, review, selection and export see only the Take.

Rejected: splitting the long shot into several Shots in the plan (changes the creator's shot structure and the edit, breaks "one clip", and invents plan structure the narrative never had), and forcing a shorter shot (the V1 8-second law).

### 7.2 Realization plan

The **realization plan** is computed by code at package time, from the Shot's target duration, the selected model's capability profile (#66) and the Shot's inputs. It is recorded on the Generations, not on the Shot, so changing the model changes the plan without touching the Shot.

1. **Fits one call:** one Segment. If the target is below the generator's minimum, generate the minimum. The delivered duration is recorded and never silently trimmed (an NLE export may carry the planned in-out as a hint, #70).
2. **Native extension available** (the model supports continuing a clip it generated, within its constraints): Segment 1 is a normal generation; each further Segment extends the previous output. The provider may return the combined clip (Veo returns input plus extension as one video).
3. **Otherwise stitch:** each further Segment starts from the last still of the previous Segment as its first frame (extracted deterministically) and the same identity references. The Segments are concatenated at assembly.
4. **Keyframed** models that pin several frames may reduce Segment count; the same Segment model applies.

The creator sees one thing before spend: one estimate for the Take ("about 18 s · 3 parts · $X"), under the batch-as-a-sum rule (Record 1 R9). The plan and each Segment prompt are inspectable and overridable (§10.3 of the Constitution), never required reading.

**Segment prompts add no story.** They are partitions of the Shot's own action and dialogue by time: an L call proposes the partition and code verifies it (every dialogue line exactly once and in order, AI-map G3; action text only partitioned; AI-map G2 references; durations within the generator's range, AI-map G9). Boundaries prefer a dialogue-line or action-beat break. Segments never create a Shot and never change the Shot plan.

### 7.3 Segments, Takes and Generations

```diagram
 Shot S (target 18 s)                       one Batch (creator action, one approved sum)
   │                                         ┌──────────────────────────────────────────────┐
   │  package: refs, approved Frames,        │ Generation g1 ──► Segment A (0–6 s)           │
   │  segment plan, per-segment prompts ───► │ Generation g2 ──► Segment B (6–12 s)  waits g1│
   │                                         │ Generation g3 ──► Segment C (12–18 s) waits g2│
   │                                         └─────────────────────┬────────────────────────┘
   │                                                               │ all succeeded, media persisted
   │                                                               ▼
   └──────────────── Take T1 = assemble( A, B, C ) ──► ONE clip. Selected-take pointer targets T1.
```

- **Segment** is an Attempt-class artifact on the Shot. It is immutable and every Segment is kept. It belongs to the Shot, is made by exactly one Generation, and records its index, time range, input still or extended-from Segment, and its Generation. A Segment's index and time range form a **slot** that holds candidates. On the lip-synced path (VOICE §4, path L) the slot holds two: the plain video Attempt and, derived from it by an `audio.lipsync` Generation, a lip-synced Attempt. The chosen candidate feeds assembly (default: the lip-synced one once it succeeded; the creator may pick the plain one). If the lip-sync step fails the plain Attempt stays chosen and Retry is offered; the Take is assembled from whatever is chosen per slot.
- **Take** records its ordered Segment references, the assembly record (a deterministic Record: method, crossfade, order), the probed media facts (frame rate, constant frame rate, frame count, audio layout; #70 freezes these per Take at ingest) and its delivered duration. A Take has `origin`: generated or uploaded (an uploaded clip is a Take with no Segments or Generation).
- A **Take exists only when assembly succeeded.** Until then the Shot reads "2 of 3 parts made", derived from the Batch and its Segments, never a Take.
- **Partial failure** follows the Job lifecycle: Segments that succeeded survive (Record 1 R9). A failed Segment shows its price on Retry and the click is the approval (Record 1 R8); later Segments become cancelled (`upstream_failed`, no cost) and are re-queued by "continue the batch" (JOB-LIFECYCLE §8). Cancelling the Batch cancels the waiting members; finished Segments stay as reachable Attempts. A late result after timeout or cancel attaches as an unselected Segment and notifies quietly (Record 1 R9, Record 1 M2).
- **Regenerate from part k:** a new Take can reuse Segments 1..k−1 of an earlier Take (shared immutable Media, lineage recorded) and regenerate from k on. The earlier Take is untouched. This is the per-part fix, without any per-part state on the Shot. Reusing Segments saves money and is the default offer when a creator reports a problem "after the first half".
- **Spend.** Each Segment is a Generation with its own record and cost, rolled up to the Take. For the "10 or more" confirm threshold, a long shot realized as several Segments counts as **one Take** (Record 2 P3); the $2.00 money threshold still sums every Segment's cost. The creator always sees the total.

### 7.4 Dialogue and audio across Segments

Dialogue is assigned to Segments by the partition, and a line is not split across a join when it can be avoided. A single dialogue line longer than one generator call cannot be kept whole and is a recorded limitation of that model. With a supplied Performance (#69), the Performance audio is sliced to the Segments and is not regenerated, so the delivery is continuous. With native audio, the join can change room tone or voice slightly: the assembly applies a short audio crossfade, and the audio continuity of a stitched long shot is **not guaranteed**. Extension-native Segments preserve it better, which is a reason the plan prefers extension where it exists. This is a capability limit to report on the Take, not a constitutional failure.

### 7.5 Runtime

Runtime awareness is derived and quiet. Per Shot: the target duration, replaced by the selected Take's delivered duration once one exists. Per Scene: the sum over active Shots (ad-hoc shots count toward no total, Record 2 X5), displayed beside the Master Narrative's scene estimate (SCENE-IDENTITY §2.1), independent of it. Per film: the sum against the project's intended runtime. The two figures, planned and as made, can both show. Nothing blocks or auto-trims.

### 7.6 Provider facts this depends on (re-checked 2026-10-21)

Single-call duration ranges vary by model, from a few seconds to roughly 30 s (research #5). Extension is vendor-specific and constrained: the Veo 3.1 documentation (re-fetched 2026-10-21) still describes extending Veo-generated clips by 7 s up to 20 times, on the non-Lite models, 720p, 16:9 or 9:16; the Kling API changelog excerpt describes extension of clips made by its older V1.0 model by 4–5 s. Some models document no extension. These constraints are why the plan has a stitch fallback and why the Shot never encodes a method. The design does not depend on any one of these facts staying true; it depends only on "a single call has a finite, model-specific limit and extension is optional".

## 8. Composition references

### 8.1 One object, two ways to use it

A **Composition reference** is an Editable link: (Shot, media, target, uses, subject mapping, notes). It is the CORE slot (Constitution §8.1: the shot concept supports composition references from the start, before any previs tool exists), and it is also how a reference-driven shot is expressed. There is no separate object.

| Part | Rule |
|---|---|
| **media** | Reference Media (supplied), a previs or sketch capture (an Attempt from a tool, e.g. CineBlock; see §10), or **any existing Frame of the project** (a **reference shot**, Record 4 W60 §5.7: e.g. shot 1's over-the-shoulder frame of Bob used to compose shot 4's clean medium shot, with notes saying how to recompose). Immutable. |
| **target** | The whole shot, or one Frame role (a start composition for the opening role, an end composition for the ending role, a sketch for a keyframe). |
| **kind** | **layout**: authored for this shot (sketch, blocking capture, storyboard frame, photo of a set). **footage**: found material to recreate (a reference image or video whose subjects are replaced). |
| **uses** | Which facets the creator wants from it: framing, staging and pose, motion or camera movement, lighting and style. Defaults depend on the kind. |
| **subject mapping** | Each subject or placeholder in the media is mapped to a Presence (entity and Look), or to *remove*, or to *generic extra* ([`ENTITIES-AND-LOOKS.md`](ENTITIES-AND-LOOKS.md) §9). The mapping lives with this link. Unmapped subjects default to a generic extra as an AI-made choice. |
| **notes** | Free text. |

Placeholders (mannequins, primitives, sketch marks) are layout guides only. The same mapping that replaces a reference's real subjects replaces placeholders.

### 8.2 Division of authority, structurally

- **Composition owns framing**: angle, crop, placement, rough pose, screen direction.
- **Entities own appearance**: identity inputs to a Generation come only from the mapped Presences' canonical identity and Look. Reference media contributes composition, staging, motion or style, **never identity**, and the Generation records both lists so this is auditable.
- **Locations own environment**: the Direction's View, not the reference's background, supplies the place unless the creator's `uses` includes it.
- A composition reference never overrides an entity's canonical identity or Look, or an explicit Presence. (Established Facts reach media generation only through that canonical state, never as prompt text, Record 2 X3.)

### 8.3 Lineage and staleness

The `composition` slice is shot-owned. Adding, removing or replacing a reference marks Frames and Takes made with the earlier one as `shot-changed` (slice `composition`). A reference attached to a role is part of that role's Frame inputs. Retiring a reference detaches it, nothing is deleted.

### 8.4 Capability honesty

No reviewed image or video model documents adherence to a whole-frame blocking still as a composition reference (research #6: only region control is documented, and camera-angle recomposition from a reference is not documented by any vendor). The slot therefore records **intent and mapping**, and the compiler delivers it best-effort: as a layout image with replace-the-placeholder instructions, as a conditioning input where a model supports one (for a previs capture, image models only: a capture is never sent to video, Record 2 D61.3), or through the frame path (a composition reference is the strongest reason to use frames, since the creator can approve the result before video spend). The package reports the delivery quality quietly, as with the View ladder, and never blocks. This is a design abstraction, not a constitutional failure.

## 9. Lineage: what a Generation captures from a Shot

A Generation targeting a Shot records, in addition to LINEAGE §3.3, the slices it read: anchor passage fingerprint, action, dialogue lines (ids and text), resolved Presences (entity Revision, Look), location and Direction (and the View Attempt used), camera, duration, continuity (intent and the resolved source with its Attempt id), composition references with mappings, the Frame role Slots and the approved Frames used, prompt and model overrides (the model override is recorded for provenance only; a change of model choice never marks work, [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md) §8.4), and for a Segment, its index and input Segment or still. A change to a slice marks only work that read it: a duration edit does not mark a Frame that never read duration (LINEAGE §3.2). `shot-changed` names the slices. Split, merge and redraft produce slice changes and therefore marks through this one mechanism; there is no special marking for them.

## 10. IMPORTANT hooks reserved

Each hook is optional, absent by default, and needs no redesign of the core when it arrives.

| Hook | What the model reserves | Owner of detail |
|---|---|---|
| **Performance link** | A Dialogue line has its own id (kept through split and merge). A Performance (Supplied) links to a line, 0..* per line; with its Transformed performances and Spoken lines it forms the line's **Line audio Slot**, one chosen (a Decision; none chosen = native dialogue). Changing the chosen Line audio or the line marks Takes `performance-changed`. Line audio supplies the audio and timing for its line and is never trimmed or stretched: if it runs longer than the Shot, the Take is made longer and the Shot's duration is unchanged, with a quiet "Set shot to N s" offer (VOICE-AND-PERFORMANCE §3.2). A line with a chosen Performance that is split keeps the Performance on the id-keeping part and marks it. An ad-lib is written back to the line or recorded as a deviation (LINEAGE §5.5). Segments slice the Performance audio (§7.4). | #69 |
| **CineBlock capture** | A Composition reference whose media is a previs capture, with optional opaque, versioned **capture metadata**: placeholder list (each with an id), per-placeholder placement, camera pose, lens and path. A capture start and end map to the opening and ending role targets. Placeholders enter the subject mapping. A camera path or lens may propose camera facets as an AI-made choice, never silently. The metadata is never required and is ignored when absent. | #61 (entry), later CineBlock work |
| **Storyboard import** | Each imported panel becomes a layout Composition reference on one Shot (target: opening role or the whole shot). Panel-to-shot assignment is a Decision recorded with evidence (deterministic by order or label first, AI only for ambiguity, the creator confirms ambiguous items), the pattern of scene mapping. | #61 |
| **Shot-list import** | Imported rows become draft Shots with `imported` provenance, anchored by mapping to narrative passages, with an optional external label (a label, never identity) so export can round-trip to a production's numbering. Rows matching an existing Shot (by id for a round trip, else by label and anchor) are proposals through the redraft rules (§5.4): Options, never overwrites. | #61 |
| **Reference-driven shot** | A footage-kind Composition reference with subject mapping (§8). | #61, #65 |
| **Per-shot model and prompt override** | Shot-owned slices recorded on the Generation. | #65, #66 |

## 11. Hand-offs

| Ticket | Receives |
|---|---|
| **Scene and shot workspace** (#60) | The Shot plan as the list and plan-accepted Decision; the initial-draft and Draft all rules (§3.1); derived states of §6.2 for the status the Script Hub and scene workspace show (Record 4 W60, Record 5); split and merge as single actions with undo and a whisper ("2 shots now; 1 follows its text"); redraft as Options; unanchored and uncovered indicators; the narrative choice as one quiet line; runtime figures (§7.5). |
| **Shot planning inputs** (#61) | The hooks of §10; Composition reference fields; subject mapping; capture metadata as optional. |
| **Candidate review and playback** (#62) | Take as an assembly of Segments (a partial realization shows "2 of 3 parts made" with retry); Take comparison on delivered duration; selection as a Decision; reject/un-reject; regenerate from part k; "arrived after cancel" labels on Segments; frame comparison per role. |
| **Generation package** (#65, resolved in [`GENERATION-PACKAGE.md`](GENERATION-PACKAGE.md)) | The slices of §9; segment planning inputs and the realization plan recorded on Generations (§7.2); continuity source resolution (§6.4); composition delivery (§8.4); prominence hints; per-segment prompts as verified partitions; deterministic assembly as a Record; derived still inputs for skip-frames chaining. |
| **Providers and models** (#66, resolved in [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md) §11) | The capability profile must expose: min and max duration and step set, extension (same-model, input constraints, resolution), first and last frame support, pinned keyframes, reference-image compatibility with frames, audio on or off, so the realization plan (§7.2) and frame-role mapping (§6.1) are computed, never hard-coded. |
| **Voice and performance seams** (#69, resolved in [`VOICE-AND-PERFORMANCE.md`](VOICE-AND-PERFORMANCE.md)) | The Performance link of §10 as the Line audio Slot; Segment slicing of the Dialogue track at pauses; the dialogue straddling limit; audio length versus Shot duration (§3.2 there). |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)), **persistence** (#72) | Shot, Shot plan, Segment, Take, Frame source and derived-from as append-only; split and merge as one transaction with the plan Revision; indices on Shot parent, anchor block ids and `derived_from`; Segment Media sharing between Takes (purge rule is #72's); the Board needs a cheap whole-project derived-state read at 250 shots. |
| **Runtime** (#74) | A long shot's Batch is a dependency-ordered chain: durable and restartable per Segment. |
| **Verification** (#76) | The invariants and fixtures of §12. |
| **Lineage and staleness** (#54, closed) | Slice tagging of §2.1 (including the refinement that direction is shot-owned and delivery is a shot-owned override); `frame-changed` reused for a Take-end source; no new reason code. |
| **Entities** (#53, closed), **Scene identity** (#52, closed), **Story documents** (#51, closed) | Presence overrides stored only as differences; the Shot's anchor as block ids with spans; unanchored shots; uncovered-block information. |
| **Export and review** (later) | The selected Take (one clip) is the only link from a Shot to delivery; Segment structure is invisible to export. |

## 12. Invariants and fixtures the spec should test

1. A Shot's id never changes under reorder, renumbering, text edit, redraft, split (first part) or merge (survivor).
2. Split then undo, and merge then undo, restore Shots, Dialogue line ids, anchors and the plan exactly. A split failure partway leaves the plan unchanged.
3. Split parts' durations sum to the original; merge sums them; neither grows or shrinks the scene silently.
4. Split and merge preserve the multiset and order of Dialogue lines and add no action text (AI-map G3).
5. A redraft never changes a creator-touched slice or a creator setting; matched handles keep ids; an omitted shot is never retired; a Shot with Frames or Takes only receives Options.
6. A Shot anchored to a retired block shows `input-retired`; one whose anchored block text changed shows `narrative-changed`; blocks covered by no active Shot are listed and block nothing.
7. Derived Presence changes when the Scene's Presence changes; overrides survive; no per-shot copy of a Presence exists.
8. A Take with n>1 Segments never exists until assembly succeeds; a failed Segment leaves earlier Segments reachable; "regenerate from part k" shares Segment Media and leaves the earlier Take untouched.
9. The selected-take pointer can reference only a non-rejected Take of its own Shot; rejecting the selected Take deselects it in the same action group.
10. Skipping frames then generating produces a Take with the same lifecycle as the framed path; a batch includes only ready shots.
11. A Composition reference never contributes identity inputs; the Generation lists mapped Presences as the only identity sources.
12. Reading or opening a Shot writes nothing.
13. Entering a Scene with no Shot plan drafts its initial plan once at a $0.04 estimate, but a $0.05 estimate offers Draft plan · $x without generating. Unknown price, $2.00 or more, or a cap condition stops automatic drafting under the spend rules. Entering a Scene with any plan (including one emptied by retirement) drafts nothing. No automatic draft creates a frame, image, world, Take or audio Generation (Record 3 CR-2, Record 2 X8).

Golden fixtures: a 22-second shot on a model capped at 8 s (stitch) and on one with extension; a shot whose third Segment fails; a dialogue line crossing a Segment boundary; split of a shot with a Performance-linked line; merge of two shots with different camera; redraft after the Master Narrative changed a passage under a creator-edited shot; a plan lock holding a redraft as an Option; a continuity chain across a scene boundary where the previous scene's last shot has only a selected Take; a storyboard import with one ambiguous panel.

## Record 2 amendments

- **Ad-hoc shots (Record 2 X5).** A Shot may have no parent Scene. The per-project **Ad-hoc shots** section holds intentionally created shots outside the narrative (establishing, B-roll, inserts, transitions, pickups, atmospheric, experimental). While ad-hoc a shot anchors to no passage and never raises the write-back/deviation question; it uses World Definition, entities, Looks, style, references and the normal frame and take tools. It has no narrative position, so Looks do not follow the story: the creator picks each entity's Look, defaulting to base. Ad-hoc shots are excluded from runtime totals and sequence playback, exported in a separate "Ad-hoc" folder, and can be moved into a scene with **Move to scene...**, after which normal anchoring applies. They are distinct from Removed from Story. They use the Scene Prep and Generate surfaces with no Review step ([Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md) §2).
  - *Consequences of existing rules, not new behaviour.* With no narrative order, an ad-hoc shot's Continuity link has no derived source (§6.4); a pinned source still works. After **Move to scene...** the shot is an ordinary unanchored shot of that Scene (§3.2) until the creator anchors it; derivation of Presence and Looks resumes (ENTITIES §4.3), and the creator's explicit Look picks are kept as visible local Presence overrides (Record 1 R4, §4), never silently dropped; the creator clears any they do not want. An entity left at the default (base, never picked) carries no override and follows derivation.
- **Captures always go through image generation (Record 2 D61).** A CineBlock capture is a composition reference only: never the frame itself and never sent directly to video. Placeholders are replaced by the project's real entities in the frame generation step.

## Record 2 / #61 alignment (Record 2 D61)

CineBlock is a module of Aiuteur opened in its own tab under the same account, not a separate tool. The "e.g. CineBlock" capture sources and the reserved CineBlock hook in sections 8 and 10 refer to that module: captures reach shots through the internal package contract (auto-linked by shot id) and are always an input to image generation, never the frame itself. See `SHOT-PLANNING-INPUTS.md` and ADR 0024.

## Record 4 amendments

[Record 4](../product/CREATOR-RATIFICATION-RECORD-4.md) W60 ratifies the scene workspace's **capabilities** (its layout, then pending W60 §5.9, is ratified by [Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md)). Model consequences applied above:

- **Asset roster and state plan** (§4a): on-screen timing per asset, state at opening and ending, action notes; frame asset sets derive from it.
- **Persistent vs transient change** (§4a): a Look change during a shot is a Look assignment at the shot's end that carries forward; a shot-only state note never carries.
- **Match** continuity intent (§6.4) and **reference shots** from any Frame (§8.1).
- **Prompts and their ingredients** are shown per Frame role and in the take composer: the compiled prompts, readable together, with the video prompt open by default in the Takes drawer (Record 5 GN3, GN5), overridable, and the inputs it was built from (assets and their Looks or states, references, continuity source, camera, frame role). Ingredients are read from the Generation package (GENERATION-PACKAGE), never stored on the Shot.
- **Detail.** Shot drafts carry full action prose from the anchored passage, the initialized roster, camera facets and a frame strategy; terse drafts are a defect, not a style.
- **Plan accepted** is kept (it is where AI-made choice marks stop showing inline, Record 4 Y2). A hand edit to a locked plan uses edit-through (Y5). A scene with no shots reads "No shots yet" on screen.

## Record 5 amendments

[Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md) ratifies the scene workspace's interaction model (Scene Prep → Generate → Review). It adds **no** field, object or rule to this model. Consequences for the model's readers:

- The **Storyboard** in Scene Prep is a view of the Shot plan (§3.1) whose cards show the shot's opening Frame (the approved one if any; §6.1), else a blank placeholder; for a skip-frames shot, a still of its selected Take. It is not an imported storyboard (§10).
- **Plan accepted** (§3.1) is offered only in Scene Prep.
- The **Cast & Looks** matrix is a derived read of Presences, Look assignments and shot-only state notes across the scene (§4, §4a).
- The **reference library** in Generate lists existing media that can become a Composition reference (§8.1): Frame Attempts of the project, Reference Media, storyboard panels (matched or in the import tray) and CineBlock captures. Picking one creates the Composition reference; nothing new is stored on the Shot.
- The **Performance link** (§10) is set from Generate's Takes drawer, per Dialogue line; a line with a chosen Performance shows a quiet mark in Scene Prep. Voice and performance mechanics are in [`VOICE-AND-PERFORMANCE.md`](VOICE-AND-PERFORMANCE.md) (#69).
