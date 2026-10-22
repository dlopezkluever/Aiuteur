# Aiuteur Wayfinder V2: Creator Ratification Record 2

Date: 2026-10-22. Source: delta-scoped creator grilling session with Daniel Lopez-Kluever (creator and owner), run against map #49 from Wayfinder state at commit `95868d1`, using [`CREATOR-GRILL-HANDOFF-2.md`](CREATOR-GRILL-HANDOFF-2.md). Session thread: https://ampcode.com/threads/T-01a15f3f-a9a7-74aa-8cd3-1bdd95d3ef99.

**Status: authoritative creator-decision source**, of equal standing with [`CREATOR-RATIFICATION-RECORD.md`](CREATOR-RATIFICATION-RECORD.md) (Record 1). Where this record conflicts with Record 1, an ADR, a domain/UX/architecture doc, a ticket body, a child-agent recommendation or a prototype, **this record controls**. Where it is silent, Record 1 and the existing docs stand.

Authority order: Product Constitution → Record 1 and this Record → creator-ratified ADRs → agent-drafted unratified decisions → prototypes and historical material.

Nothing outside this file was edited in the session. Every change listed below is for the Wayfinder parent session to apply (§10). The single Constitution amendment approved here (§8) is to be applied by the parent with the exact text given.

Identifiers: post-ratification items are **P1–P12**, open-ticket decisions are **D58, D59, D60, D61, D62, D66**, cross-ticket rules are **X1–X10**. Record 1's R1–R10 and M1–M7 keep their meaning.

---

## 1. Session scope

1. Review consequential decisions made since Record 1 (§2).
2. Decide the six creator-blocked tickets #58, #59, #60, #61, #62, #66 (§4).
3. Check consistency across the whole system after the answers (§6–§7).

Not done, by instruction: no Wayfinder orchestration, no `/to-spec`, no `/to-tickets`, no implementation, no issue-graph rewrite.

Prototype branches were inspected directly (never merged): `prototype/58-writing-experience`, `prototype/59-world-definition`, `prototype/60-scene-hub-shot-planning`, `prototype/61-shot-planning-inputs`, `prototype/62-candidate-review`. Every variant was run locally and screenshotted for the session (not committed). Several handoff summaries misdescribed the prototypes; see §3.2.

---

## 2. Post-ratification work (decisions since Record 1)

### 2.1 Implementation consequences only (no creator ratification needed)

These implement already-ratified rules (M4 isolation, M7 purge-ability, R1 retire-never-delete) without changing creator-visible behaviour. They stand as agent-drafted technical designs, except where §2.3 or §4 changes them.

| Item | Note |
|---|---|
| #71 modular monolith, one history write gate, pure planners (`MODULE-ARCHITECTURE.md`, ADR 0016) | Stands. Needs a previs (CineBlock) module after D61 (§10). |
| #74 Job row is the queue on plain Postgres, SSE progress per Account (ADR 0017) | Queue design stands. **Hosting choice changed by P11.** |
| #72 one Postgres, append-only spine, forced RLS plus composite keys, private per-project media copied on duplicate (ADR 0019–0023) | Stands. Duplicate needs a second form after D52/P8 (§10). |
| #75 Better Auth self-hosted, envelope-held BYOK keys (ADR 0018) | Auth and key handling stand. **Backup and drill obligations changed by P11/P12.** |
| #67 a timed-out run that later succeeds is adopted | Consistent with M2 and the late-after-timeout notice. The #54 owner never reviewed the DOMAIN-MODEL §5 wording; the parent should confirm it matches LINEAGE. |
| Hidden operator ceiling must explain itself plainly when it blocks | Follows from M6. Design note, kept. |
| #57 hand-off to AI map §7 (topic field, suggested answers on open questions, per-topic "you decide" delegation feeding G8, intent-level questions only) | Writes down what the creator already ratified in #57. **Still unapplied: parent debt.** |

### 2.2 Product-significant, ratified by the creator

| ID | Decision | Source |
|---|---|---|
| **P1** | **Dialogue delivery notes on a shot are shot-owned.** Changing a shot's delivery never raises the write-back/deviation choice. The Master Narrative's delivery note is the default; a shot value shows as an override. **Addition:** the override carries **one quiet "Copy to narrative" action**, so writing it back is always available but never asked. Line text and speaker remain narrative truth and do raise the choice. | #55, SHOT-MODEL §2.1 |
| **P2** | **A shot's location Direction (which wall or view) is shot-owned.** It is a cinematic choice; changing it never asks about write-back. | #55 |
| **P3** | **The "10 or more Generations" confirm threshold counts Takes, not Segments.** A long shot realized as several Segments counts as one toward the 10+ rule. The $2.00 money threshold is unchanged and still sums every Segment's cost. (Changes SHOT-MODEL §7.3, which counted each Segment.) | #55, #68 |
| **P4** | **Block documents with provenance runs, dialogue as its own addressable block, explicit-only sync.** Ratified as drafted (detailed sync behaviour refined by D58). | #51, ADR 0008, 0009 |
| **P5** | **Redraft never overwrites fields the creator touched; it returns an Option.** Ratified. | #55, ADR 0012 |
| **P6** | **Over-limit generation requests are never sent and there is no "send anyway".** The creator gets exits (another model, edit the long part, drop an optional part). **Unknown model capabilities count as unsupported. No model substitution behind the creator's back.** Changing a model never flags work. Ratified. | #65 ADR 0014, #66 ADR 0015 |
| **P7** | **Shots follow their anchored text automatically only on the creator's own structural edits.** When the creator splits, merges or moves passages in the Master Narrative, affected shots re-home to the scene their anchored text now lives in, with a subtle undoable notice ("3 shots moved to Scene 5 · Undo"). AI-driven or imported structural changes **never** move existing production work without the creator's confirmation in the mapping review. Ratified. | #52 |
| **P8** | **Revised-screenplay import: in-place vs duplicate (creator amendment).** See §2.3 and D52 below. | #52 |
| **P9** | **Removed scenes are preserved and labelled "Removed from Story".** See D52 below. | #52 |
| **P10** | **Established Facts are not a prompt layer (creator correction).** See §2.3 and X3. | #65, #57 |

### 2.3 Creator-significant items, decided in this session

#### D52 — Scene revision, re-import and detached work (amends #52, SCENE-IDENTITY)

1. **Normal iteration stays in the same project.** Rewriting or regenerating one scene, moving passages, targeted edits and similar work never push the creator toward a new project. Downstream work is preserved, affected items are flagged possibly out of date (R2), and the creator reconciles.
2. **Major revised-screenplay import: Aiuteur recommends a duplicate, but the creator chooses.**
   - **Trigger (computed, not guessed):** the scene mapping of the incoming screenplay would retire, split or merge scenes that already have production work (shots, frames or takes). The threshold is a tunable, spec-level value; the principle is "applying in place would disturb existing production structure."
   - **What the creator sees:** the import surface leads with two choices, each with impact counts (for example "14 scenes, 96 shots, 210 takes affected"):
     1. **Duplicate into a new version** (highlighted, recommended). The current project stays exactly as it is, with its original narrative and all production work.
     2. **Apply to this project**, accepting that substantial downstream work may become possibly out of date (R2; nothing is deleted, R1).
   - This is a **recommendation, never a hard rule**.
   - **What the new version carries (copied, per copy-on-use and ADR 0022):** Input and source material; Interview and Established Facts; Treatment and Beat Sheet (as development history); World Definition (characters, locations, props, extra types, Looks, Views, Visual Style, reference media); project settings; other upstream reusable material.
   - **What it does not carry:** scenes, shot plans, shots, frames, takes. The imported screenplay becomes the basis of the new Master Narrative (converted per Constitution §4.3) and of the new production structure.
   - The two projects show a quiet **"made from"** link. There is **no cross-project adoption of production work in V2**.
   - Below the trigger, the import applies in place through the normal mapping review.
3. **In-place re-import conflicts default to keeping the creator's text (reverses the agent recommendation).** In the mapping review, for a matched scene whose current text contains creator-written or Aiuteur-edited runs, the default is **Keep current**, with a per-scene choice of **Take incoming**. The other version stays in history either way. (Changes SCENE-IDENTITY §4.4 item 3, which defaulted to "take incoming".)
4. **"Removed from Story".** Scenes retired by a narrative change keep all their work (shots, frames, takes, history). The quiet group in the Outline is named **"Removed from Story"** (replaces "Not in the story now"; never anything like "Junk"). It must stay organized enough to see the old scene and its shots, frames and takes, and offers **Bring back** and **Adopt work** (move its shots into an active scene). Unchanged otherwise from SCENE-IDENTITY §5.1.
5. **Ad-hoc shots (new product concept).** See X5.

#### P10 / X3 — Established Facts and what generation reads (creator correction, rejects the #65 pin)

The agent design had a per-Fact "carry into visual generation" pin, defaulting on for style Facts, that copied pinned Facts verbatim into image and video requests, with a visible pin toggle in the Interview Ledger. **The creator rejected this model.** The ratified model:

1. **Established Facts are development knowledge.** They can originate from inputs and uploaded documents, Interview answers, creator edits or explicit creator decisions. They are a lightweight development/Interview ledger of decisions the AI must remember.
2. **Facts bind AI drafting and revision** of the Treatment, Beat Sheet, Master Narrative, World Definition (entities, Looks) and Visual Style. Those AI outputs are fact-checked (G6) with R6 behaviour (one repair attempt, then held).
3. **Generation consumes the relevant canonical creative state, not raw development history.** For frames, images, takes and audio the compiler reads: the relevant Master Narrative passage and current scene state; the current Shot; the relevant entity definitions and reference images; the current Look of each entity at that point; the Visual Style and its references; composition and reference media; exact dialogue and performance; provider technical requirements. **No Established Fact is injected into a generation prompt.**
4. **Contextual state overrides generic/default state.** Example: "Marcus normally wears a red scarf" shapes Marcus's base Look; a scene where Marcus swims in trunks uses the scene's Look, and no Fact forces the scarf in. A global visual rule ("grainy 1970s documentary realism") lives in the Visual Style and reaches generation from there.
5. **Conflicts:**
   - An **AI draft** that contradicts a Fact: R6 (one repair attempt, then held for the creator).
   - The **creator's own edit** that contradicts a Fact: the edit wins (creator authority, Constitution §13.2); the Fact is quietly marked **superseded**, with Undo. No question is raised.
   - **New source material** that contradicts a Fact: a new Interview question (Constitution Phase 2), never a silent overwrite.
6. **Escape hatch:** no project-level "always include this constraint" in V2. The existing per-shot Override `add(note)` covers one-off needs; global visual rules belong in Visual Style. A broader escape hatch may be added later only if a real need appears, and only as a secondary, exceptional tool.
7. **No pin toggle** is a Ledger or Interview UX requirement.
8. **Constitution:** no amendment. Phase 2 and §14.2 ("Established Facts are never contradicted by later generation") remain true: the AI never contradicts a Fact; only the creator can supersede one, which §13.2 already permits. This interpretation is recorded here.

#### P11 / P12 — Hosting, backups and purge (creator reopened #74/#75 choices)

**P11 Hosting.**
1. **Default target: one VPS** (for example Hetzner) running the web process, the worker and Postgres, with Cloudflare R2 kept for private media. Estimated about $10–25/month before provider bills (unverified estimate). This replaces the drafted Fly.io + Neon default (about $35–40/month).
2. **Stay portable.** The creator wants to be free to change hosting later. The system must keep: plain Docker images, a stateless worker, plain Postgres with no vendor-specific database or host features (RUNTIME-PLATFORM rule RT5 stays in force), vendor SDKs only behind platform adapters (`BlobStore`, host configuration). Fly/Render/Railway/managed Postgres remain valid future moves without code changes.
3. The creator accepted that a VPS means the operator owns OS patching, Postgres upgrades, backups and uptime.

**P12 Backups and restore (floor now, policy later).**
1. **Non-negotiable floor from day one** (because a single VPS disk failure would otherwise lose every creator's work, violating Constitution §16.1 precedence 1 and R1): an automated daily database dump plus continuous WAL archiving to storage **off the machine** (R2 is acceptable).
2. **One successful restore test before any creator other than the owner is invited.**
3. **Deferred to later decisions:** how many backups and copies, retention periods, a second independent vendor, restore-drill cadence, the no-delete backup credentials design, the "full manual drill" gate of OPERATIONAL-BASELINE §9.
4. Cap defaults and the hidden-ceiling size remain parked (Record 1 §5.7) and must still be set before the first invitation.

**P8-purge (Q8).** When project/account purge ships (M7, later), the promise is: **gone from Aiuteur at once; any backup copies expire within the stated retention window**, and that window is stated to the creator at purge time. This applies if backups are kept in a form that cannot delete per project.

**Media duplication** (ADR 0022: duplicating a project copies its media, about 2 s at 250 shots, doubling that project's storage so a purge stays clean) was presented with the hosting question; the creator raised no objection and it stands as agent-drafted.

---

## 3. Prototypes

### 3.1 Standing rule: prototypes are structural sketches only

All five prototypes (#58–#62) are **loose structural prototypes only**, and even their composition is poor. Their beige styling, spacing, typography, component treatment and overall visual design are **not approved**. The creator found them substantially worse than V1.

**The V1 WizardDirector UI is the visual and interaction reference** for the real V2 UI, modernized for V2: in particular its Treatment workspace (hierarchy, treatment summaries and attributes, regeneration controls, notes, the dark cinematic product feel), its Stage 5 asset-definition and angle-generation interfaces, and its Script Hub. Approvals in §4 approve **functional and interaction models**, never visual design. The #56 prototype also remains superseded by `docs/ux/NAVIGATION.md`.

### 3.2 Prototype facts that differ from the handoff summaries

Recorded so nobody builds from the summaries:
- #58: A shows treatment options as tabs; side-by-side columns exist only in B; per-passage "bring back" exists only in C; **the lock is unchecked at acceptance in all variants** (contradicts #63; the ratified default is on).
- #59: A's coverage button generates all missing directions; needed-first exists only in C.
- #60: only B has an Undo control; A's toast claims "undoable" with no control; C has none.
- #61: in the "two panels, one shot" case only one panel is flagged; Retire actually deletes the reference.
- #62: the playback gap slate is identical for "takes but none selected" and "no takes"; a cap breach still offers Start; C's failure styling is louder than the quiet-flag rule allows.

---

## 4. Decisions on the six open tickets

### D58 — Writing Experience (#58)

**Base: Page A interaction structure** (one document per centre page, opened from the persistent Outline), with the changes below. The agent's option-count UI and two-equal-surfaces sync model are rejected.

1. **Treatment workspace keeps V1's functionality.** The Treatment is not a bare giant document: it has a **compact summary/attributes view** around it (V1 showed per-option attributes such as structural emphasis and estimated runtime; the summary should let the creator grasp each option at a glance).
2. **Number of treatment options is a user setting.**
   - An **account-level user setting**, default **3**. The workspace simply generates the configured number.
   - **No on-screen count chrome**: the "default 3 / just one chip / up to 4" UI is rejected. (Setting it to 1 satisfies Constitution Phase 3 "just give me one".)
3. **"New alternative treatment" is an obvious action** that goes through the regeneration box, where the creator may optionally explain what to change or what earlier options misunderstood. The new option is shown in place of the one currently open; the previous options remain available as other options (nothing is discarded, R1).
4. **Regeneration keeps V1's good behaviour, with guidance optional:**
   - regenerate the entire Treatment;
   - regenerate a selected section only, leaving the rest of the document untouched (V1 also offered one replacement or several alternatives for a selection);
   - optional feedback/guidance for any regeneration (V1 required ≥10 characters; V2 keeps it optional per Constitution Phase 3 and §17.2);
   - the previous version is preserved in history.
   - **"Keep my edits" is the safe default** for whole-document regeneration; "replace everything" is an explicit choice, and the replaced text remains in history.
5. **Notes.** The creator can add notes in the writing workflow: annotations on a passage or beat that are **not part of the document text** and are **not sent to the AI**, except when the creator ticks "use my notes" in a regeneration request.
6. **Beat Sheet workspace with the Treatment as a reference sidebar.**
   - The Beat Sheet is the primary centre workspace.
   - The selected Treatment appears in a **collapsible right-hand sidebar**, so the creator can work through beats while referring back to it, and hide it for maximum writing space.
   - This replaces keeping the two documents side by side as equal editing surfaces (prototype B's spread is not adopted).
7. **Explicit sync, Beat Sheet → Treatment as the primary direction.**
   - Prominent action: **"Update Treatment to match Beat Sheet"**. It precisely revises the Treatment to reflect the Beat Sheet's newer creative decisions while preserving unrelated Treatment detail.
   - The reverse, **"Update Beat Sheet from Treatment"**, is also available for when the creator goes back and edits the Treatment.
   - Neither ever runs automatically. R10 stands: creator-written Treatment spans are protected and a change to one is **held** and shown for one-click approval; sync is recoverable through revisions; before Master Narrative drafting or acceptance, a disagreement between the two documents is shown and the creator chooses which to follow; after acceptance neither is synchronized again.
   - **General principle (creator):** later creative work may refine earlier development documents, but the creator explicitly invokes that reconciliation; Aiuteur never rewrites documents behind the scenes.
8. **Master Narrative workspace** uses the same pattern: a collapsible right sidebar showing the Beat Sheet for alignment (V1's beat-alignment panel).
9. **Master Narrative acceptance is one concise sheet**, not a stepwise ceremony: the R10 disagreement ask; optional review of AI additions that **never gates**; **lock checked by default** (Record 1 #63 item 3).
10. **Version restore adds a new current version** and never destroys later history.
11. A version-history panel inside the writing page is acceptable; the drawer prohibition (NAVIGATION §1.3) applies to shot work only.
12. Interaction pieces from the prototypes that survive: the quiet drift indicator between Treatment and Beat Sheet before acceptance; the provenance highlight toggle (IMPORTANT); beat reorder, add, alternatives; Interview "skipped by you" status; Treatment and Beat Sheet become development history after acceptance (no more flags) with "regenerate from the Master Narrative" on request. Per-passage "bring this version back" (from C) was recommended and not objected to; the UX design decides whether it ships.

Agent recommendation changed: count chrome removed (now a setting); sync model changed to a reference sidebar plus explicit directional update actions; notes and V1 summary/attributes added; prototype visual design rejected.

### D59 — World Definition (#59)

**Identity first; production coverage later, driven by the actual shots.** The agent's "needed-first coverage inferred before shots exist" is rejected.

1. **Default flow:**
   Master Narrative → extract proposed entities → creator keeps / defers / keeps lightweight / merges / **manually adds anything missing** / corrects type → each non-deferred visual entity gets its **Identity** (and thereby its base Look) → proceed to shot planning → coverage needs derived from the actual shots → generate missing views when needed → production.
2. **Entity model per visual asset (character, location, prop):**
   - **Identity** = the canonical description plus the main approved reference image(s). The fundamental definition of what the entity is and looks like.
   - **Base Look** = the default appearance. In the domain model this *is* the canonical identity (not a separate object); "no Look assignment" means base.
   - **Alternate Looks** are optional and added only when needed through an **"Add Look"** action (for example funeral clothes, injured, swimwear; for a location fire-damaged, decorated, abandoned). Never forced onto assets that do not need them.
   - **Coverage** = additional production views of a location, mostly needed once a shot plan exists.
3. **Baseline requirement:** for a non-deferred location, **one approved reference image** (generated or uploaded) establishes identity. It is not required to be an "establishing shot"; its job is "this is what the place looks like" (a broad view, one wall, an uploaded photo, a concept image). One approved identity image is enough to start for a character or prop. More references can always be added manually.
4. **Two readiness levels, both quiet, neither blocking:**
   - **Identity readiness:** is the entity visually defined enough to use?
   - **Production coverage readiness:** do we have the additional views the current shot plan needs?
   - Example display: `Hale Kitchen — Identity ✓ · 3 production views needed`.
   - When the shot plan changes and reveals new needs, World Definition shows a quiet attention flag again (`1 new view needed`). This follows the "needs attention" philosophy (M1, R2, R5): surfaced, never blocking.
5. **Coverage generation:**
   - After shot planning, missing views are named production views called for by the shots (for example "toward window", "toward stove", "from doorway", "table close"), not fixed front/side/back counts. They are generated from the approved canonical reference to hold identity.
   - The V1 angle/reference generation view is a concept to keep, adapted to shot-driven named views.
   - Bulk acceptance where useful: a contact sheet with a reversible "Accept all N", per-tile fixes afterwards. Every view is a draft Attempt (R5).
   - **Optional at any time, including before any shots exist:** "Generate more views" / "Complete coverage", or manually setting up as many views as the creator wants. Nothing blocks this. It is the opt-in path, not the default.
6. **Location variants: the creator chooses.** A night (or other) variant of a place may be either an **alternate Look of the same location** or a **separate location entity**. Both must work fine; neither is privileged. Agent recommendation recorded and accepted: time of day and lighting normally come from the scene and shot (compiled from the narrative), and location Looks are mainly for changes to the place itself, because coverage multiplies across Looks (one view per Direction × Look, ADR 0003).
7. **Extraction accelerates; it never constrains.** The creator can always manually add a character, location, prop, extra type or other supported entity, whether extraction missed it, it is introduced later, or the creator simply wants to define it directly.
8. **Preserve from V1's asset workflow:** correcting extraction results including **changing an entity's type**; **multiple generated/uploaded attempts** with one active approved canonical reference; bulk acceptance of generated coverage; a clear distinction between Identity ready and Production coverage needs attention.
9. **Layout (functional only):**
   - **Main entity workspace = A's** per-entity workspace with Identity / Looks / Coverage areas (matches the "V1 Stage 5 is good" reference), including A's extraction review (Keep / Defer / Keep lightweight / Merge suggestion / add missing).
   - **World Definition home** (when not inside one entity): typically **tiles**, one image per entity, with a carousel through that entity's generated/set images.
   - **Alternative overview:** a scrollable project-wide view like the lower half of prototype B (the coverage wall) is acceptable as a second view. B's top table/list is rejected.
   - The project-wide coverage view and the per-entity workspace are **two views over the same canonical World Definition data**.
   - Spend confirmation appears inline at the initiating control (X2), not as a centred modal.
10. **Constitution amendment approved** for §6.4 and §15.1 (§8).
11. Domain consequence: Directions are no longer proposed up front by World Definition. Shot planning picks an existing named Direction or proposes a new named one, whose empty View becomes a coverage need (changes ENTITIES-AND-LOOKS §5 and ADR 0003 wording; the one-rule resolution, the fallback ladder and R5 stay).

### D60 — Scene Hub and Shot Planning (#60): **UX rejected; ticket to be redone**

1. **None of the #60 Board renditions or batch-drafting UIs is approved.** The creator found them visually and compositionally unacceptable. **#60 must be reopened and its UX redone**, with the V1 Script Hub as a primary reference.
2. **What stays (concept, per #56 ratification):** a whole-film overview plus per-scene workspaces, with prepping and making shots as the main centre workspace (no drawer-based shot editor; Peek is preview only).
3. **Redesign the overview from V1's Script Hub**, which the creator rates far better: scene cards/list with number and slug, status, thumbnail of the last approved end frame, asset dependencies, and **the excerpt of the Master Narrative text that makes up the scene** plus other scene information.
4. **"Draft all" is kept.** It drafts **shot plans only** across scenes (Constitution §4.1, §15.1 require batch drafting across scenes). The creator's objection was to the UI and to a misreading that batch meant automatically generating every scene's frames and takes, which is reckless and is **not** the design: frames, images, worlds and takes are always creator-initiated with spend rules (§13.4, Record 1 spend rules, M3).
5. **Auto-draft of the initial plan (approved, clarified by the creator):** when the creator enters a scene that has **no shot plan**, Aiuteur automatically drafts the **initial** shot plan (a text operation, an M3 auto-trigger). It **never** auto-redrafts or replaces an existing plan, and it **never** automatically triggers frames, images, worlds or takes. The #60 redo decides how the initial draft is presented.
6. **Domain invariants unchanged by the rejection:** redraft never overwrites creator-touched fields and returns Options (P5, SHOT-MODEL §5.4); an existing shot the new draft omits is listed, never retired; locked plans hold results as Options; any batch result must be undoable; dismissed proposals are retired, not deleted; batch spend rules apply.
7. The **ad-hoc shot section** (X5) belongs to the #60 redo.
8. The agent's B skeleton, C list lens, run-then-undo tray, ghost marks and A disposition preview are **not ratified**; the redo may reuse ideas but starts from the V1 Script Hub reference and the points above. Shared timeline intent with D62 (X6) should be carried into the redo.

### D61 — Composition and CineBlock (#61)

**CineBlock becomes part of Aiuteur.** The agent's "A file exchange now, B linked app later, C not for V2" is rejected.

1. **One application, one account.** CineBlock is a module of Aiuteur, not a separate app. Users never sign into a second app. For flow and ease of development, the blocking/capture stage opens in a **separate tab/window** of Aiuteur under the same account and session. Its data (scene state, captures) belongs to the same Account and project, so tenant isolation (M4), retire-never-delete (R1) and project purge (M7) cover it.
2. **Entry point and flow:**
   1. In a scene whose shots and assets are determined, the creator goes to frame generation.
   2. If they choose to block with CineBlock, a new window opens, loads, and runs with **all of the scene's shots**.
   3. The creator blocks with **mannequins for characters and blocks/primitives for props**, and captures the **start and end** composition of each shot.
   4. The creator chooses **Send back** and returns to Aiuteur.
   5. Each capture is **automatically linked by shot id** to its shot as the **framing reference for that shot's frame generation** (opening/ending Frame role composition references).
   6. The creator can remove any capture they do not want with an ✕ (this **retires** the reference; it is not deleted).
   7. Leftovers go to a short review list: a capture for a shot that does not exist in Aiuteur, or more than one capture for the same role.
   8. "Re-open in CineBlock" restores the saved scene state (blocking).
3. **Captures are always fed into image generation.** A capture is blocking and framing only; it is never used as the frame itself and never sent directly to video. Every capture must go through image generation to produce the quality frame, with placeholders replaced by the project's real entities (Constitution §8.2; SHOT-MODEL §8).
4. **The world model is a provider in the Catalogue** (a world-model operation class), like every other model. **Payer (Q29):** the operator pays until BYOK ships (M5), and it is BYOK-capable afterwards like any provider. Price is shown on the initiating button and the normal spend rules apply (a world generation under $2.00 is one click; about $1.20 per world is the current estimate).
5. **Settled regardless of transport (ratified):** camera facets from CineBlock fill only empty shot fields (imported provenance); CineBlock duration and action text are never imported (the Master Narrative stays truth); identity, appearance and location never come from previs; placeholder-to-entity mappings are AI-suggested and marked "AI chose"; whole-frame layout adherence is best-effort and checked at the frame step (L11).
6. **The versioned package contract** (echoed shot ids, versioned package, opaque scene state) becomes the internal handoff between the CineBlock tab and Aiuteur's shots. **Importing previs packages, storyboards and shot lists from outside** remains an IMPORTANT entry path (Constitution §4.3, §15.2) and uses the same matching rules.
7. **Matching rule for imports (written down here because the prototype does not implement it):** when two incoming panels or captures point at one shot (many-to-one), **both rows are flagged ambiguous** in the review list and neither is auto-picked. Ambiguity is never auto-picked.
8. Constitution check: consistent with §8.1 ("an integrated, optional tool") and §8.3 (after the core loop works). No amendment.

### D62 — Candidate Review and Playback (#62)

**Base: C (sequence-first) with a main viewer.** The agent's "A viewer plus filmstrip as base" is replaced.

1. **Layout:** a **scene timeline** of the scene's shots with the **main viewer** in the main view. **Under the timeline, for the selected shot, its other generated takes** are shown.
2. **Sequence viewing:** the creator can watch the selected takes in sequence for a scene, and can **swap a different take in** and see that in sequence too, conveniently.
3. **Swapping a take in is selecting it.** Selection is reversible (Record 1 #63 item 4); the sequence immediately plays with the new choice. There is no separate preview state. Changing the selection flags anything built from the previous pick (R2). Optional Mark final is unchanged.
4. **Side-by-side compare** (up to 3 takes) remains as an optional action.
5. **Batch spend** uses the inline ticket at the initiating control (X2).
6. **Takes with none selected play as a gap slate (Q15)**, and the slate says which kind of gap it is: "3 takes · none picked · Pick" versus "No take yet · Generate". Sequence playback stays "selected takes only" (Constitution §12.1). Scope filters separate "needs a pick" from "missing".
7. Carried from the shared constraints: review happens in the centre scene workspace (Peek never spends); no automatic selection; late results after cancel attach unselected, labelled "arrived after cancel", with a quiet notice (M2); price on the initiating control; a long shot is one Take ("3 parts"); failures are visible and quiet (X7).
8. A "show in context" toggle (from B) was part of the earlier recommendation and was not objected to; the UX design decides.

### D66 — Default model policy (#66)

**Video "Automatic" leans balanced:** the best-ranked model whose typical take stays under the $2.00 one-click line. Images, entity images and writing lean to quality; fact-check and utility calls lean to economy; audio leans to quality. The creator can always pick a specific model per project or per shot, and model choice never flags work. **The creator decision on #66 is complete; #66 can close.**

---

## 5. Agent recommendations changed or rejected

| Ticket | Agent recommendation | Creator decision |
|---|---|---|
| #52 | Re-import conflict default "take incoming" | **Keep current**, per-scene Take incoming (D52.3) |
| #52 | Re-import always replaces in place | Major revisions **recommend a duplicate version**; creator chooses (D52.2) |
| #52 | Label "Not in the story now" | **"Removed from Story"** (D52.4) |
| #52/#55 | (none) | **Ad-hoc shots** added (X5) |
| #65 | Per-Fact "carry into visual generation" pin, style Facts pinned by default, visible toggle | **Rejected.** Generation reads canonical state; no Fact injection; no pin toggle (X3) |
| #55/#68 | Each Segment counts toward the 10+ threshold | **Count Takes** (P3) |
| #55 | Delivery shot-owned | Ratified **plus "Copy to narrative"** (P1) |
| #74/#75 | Fly.io + Neon, independent second-vendor backup, full drill gate | **VPS default, portable**; backup floor now, policy later (P11, P12) |
| #58 | A + side-by-side options with count chips (3, just one, up to 4); separate pages with drift line + Review sync | Count is a **user setting** (no chrome); **new alternative via regeneration box**; **Treatment as collapsible right sidebar** in the Beat Sheet; **explicit Update Treatment to match Beat Sheet**; notes; V1 summary/attributes (D58) |
| #59 | A + B wall + C needed-first one-click coverage inferred from mentions before shots | **Identity first; coverage from actual shots later**; optional fuller coverage anytime; Constitution amendment (D59) |
| #60 | B skeleton + A story panel + C list lens; one-click + undo tray + ghost marks | **All UX rejected; #60 redone** from the V1 Script Hub; Draft all (plans only) kept; initial-plan auto-draft (D60) |
| #61 | A file exchange now, B later, C not for V2 | **CineBlock is part of Aiuteur**, separate tab, one account, auto-linked captures, world model as a provider (D61) |
| #62 | A viewer + filmstrip base, compare up to 2 (amended to 3 in session) | **C sequence-first with main viewer**, takes under the timeline, swap = select, compare up to 3 optional (D62) |
| all | Prototype visuals | **Not approved**; V1 is the visual reference (§3.1) |

---

## 6. Cross-ticket consistency rules (settled)

- **X1 Choosing moment.** Where the creator chooses between candidates (treatment options, takes), comparison is available at the choosing moment; side-by-side is optional, never mandatory chrome.
- **X2 Spend presentation.** Price on the initiating button. When a confirm rule fires ($2.00+, 10+ Takes per P3, bulk by filter, unknown price, cap), an **inline ticket at that control**, never a centred modal. **A cap breach offers no Start.**
- **X3 Generation reads canonical state.** Established Facts bind drafting; media generation reads current canonical documents, shot, entities, Looks, style and references (P10).
- **X4 Explicit reconciliation.** Later work may refine earlier documents only when the creator invokes it (D58.7). Nothing rewrites documents behind the scenes. Applies across Treatment/Beat Sheet, Master Narrative write-back (R3), and coverage.
- **X5 Ad-hoc shots.** A per-project **"Ad-hoc shots"** section for intentionally created shots outside the narrative structure (establishing shots, B-roll, inserts, transitions, pickups, atmospheric, experimental shots). They:
  - belong to no scene and anchor to no passage, so they **never raise the write-back/deviation question** while ad-hoc;
  - use the project's World Definition, entities, Looks, style, references and normal frame/take tools;
  - have no narrative position, so Looks do not follow the story automatically: the creator picks each entity's Look, defaulting to base;
  - are excluded from runtime totals and sequence playback;
  - **are exported** in a separate "Ad-hoc" folder, not in sequence order;
  - can be **moved into a scene** (and later a sequence) with "Move to scene…", after which normal anchoring rules apply;
  - are conceptually distinct from "Removed from Story" (previously canonical work detached by a narrative change).
  The UX belongs to the #60 redo; do not overdesign it elsewhere.
- **X6 One scene timeline.** The scene timeline used for review and playback (D62) and the scene runtime view of planning should be one consistent component, as an intent for the #60 redo.
- **X7 Quiet failures.** Failures are visible and quiet (muted mark plus "Retry · $x"), consistent with M1; no red frames or alarm styling.
- **X8 No automatic media spend.** Nothing automatically generates frames, images, worlds, takes or audio: not auto-draft (D60.5), not staleness (R2), not coverage needs (D59), not CineBlock return (D61).
- **X9 Readiness never gates.** Identity readiness, production coverage readiness, entity readiness and scene readiness explain and offer fixes; they never block (R5, D59.4).
- **X10 V1 as design reference.** For the real UI: V1's Treatment workspace and regeneration, Stage 5 asset and angle generation, Script Hub with scene excerpts, beat-alignment panel (§3.1).

---

## 7. Final consistency pass (results)

| Area | Result |
|---|---|
| Constitution | One amendment needed (§8, coverage). Facts interpretation needs none (X3.8). Ad-hoc shots: consistent, since the section is an explicit, visible deviation and every take still comes from an explicit shot (§7.3); export of ad-hoc takes in a separate folder fits §12.3. CineBlock integration matches §8.1 and §8.3. Treatment count setting satisfies Phase 3. Multi-creator: no new single-user assumption introduced. |
| Record 1 | No conflict. R2, R3, R5, R6, R10, M1–M7 and #63 all hold; D58.9 restores the #63 lock default that the prototypes broke; D52.3 refines #52 only; P11/P12 refine agent-drafted technical designs, not ratified decisions. |
| Scene / shot semantics | D52, P7, X5 require SCENE-IDENTITY and SHOT-MODEL edits (§10). A Shot may now have no parent scene (ad-hoc). |
| Writing workflow | D58 consistent with R10 and Constitution §4.4. |
| World definition | D59 changes when Directions are created; R5 fallback ladder unchanged. |
| Scene workspace | #60 reopened; invariants preserved (D60.6). |
| Candidate review | D62 consistent with #63 (reversible selection) and §12.1. |
| CineBlock boundary | D61 removes the cross-app seam; adds a module and a world-model class. |
| Generation / package | Remove pin; count Takes; world-model class. |
| Account isolation | CineBlock data inside the Account/project; BYOK covers the world model. No change to M4. |
| Persistence / history / purge | Fact "superseded" is a Revision; ad-hoc shots retire normally; partial duplicate needed for D52.2; purge promise per P8-purge; backup floor per P12. |
| AI responsibility | Facts bind drafting only (X3); auto-draft of initial plan only (D60.5); no model-chosen steps (M3) unchanged. |

No contradiction requires a further creator choice.

---

## 8. Constitution amendment approved (parent to apply exactly)

**CONSTITUTION AMENDMENT APPROVED: §6.4 and §15.1, location coverage follows the shots.** Reason: generating location coverage before any shot exists asks the system to predict production needs; identity first and shot-driven coverage later is cheaper, faster and avoids a setup ritual (creator decision D59). Verify the current text before editing; change nothing else.

1. **§6.4, first bullet.** Current:
   `- **Default: multi-direction coverage.** By default, a location has coverage from **multiple directions** (its walls/angles/views), so that shots within a scene look like the same place from different angles (shot/reverse-shot, characters moving through the room).`
   Replace with:
   `- **Default: coverage follows the shots.** A location starts with one canonical reference image that establishes what the place looks like. Once shots are planned, the views they need (e.g. "toward the window" and its reverse) become the location's coverage, generated from the canonical reference and cheap to accept in bulk, so that shots within a scene look like the same place from different angles (shot/reverse-shot, characters moving through the room). The creator may add more views at any time, including before any shots exist.`
2. **§6.4, design-requirement bullet.** Current:
   `- **Design requirement:** multi-direction coverage must be **designed well**. In V1 the creator found the setup burden too heavy; in V2 it is the default *outcome*, produced largely by AI and cheap to accept in bulk, never a laborious mandatory setup ritual.`
   Replace with:
   `- **Design requirement:** shot-driven multi-direction coverage must be **designed well**. In V1 the creator found the setup burden too heavy; in V2 it is the default *outcome*, produced largely by AI from the views the planned shots need and cheap to accept in bulk, never a laborious mandatory setup ritual.`
3. **§15.1 CORE table row.** Current:
   `| World definition: characters, locations (multi-direction coverage by default, single-image option, AI-generated angles), props, extra types, named looks; generate/upload with multiple attempts; defer |`
   Replace with:
   `| World definition: characters, locations (canonical reference, then shot-driven multi-direction coverage, single-image option, AI-generated views), props, extra types, named looks; generate/upload with multiple attempts; defer |`
4. **Amendment log.** Add this row (dated 2026-10-22), **and also backfill the three earlier creator-approved amendments**, which were applied to the body but never logged (the log still reads "(none yet)"): §12.3 line on NLE timeline export (CapCut), §15.2 NLE row (CapCut), §16.2 principle 3 (nothing is lost inside a project; purge carve-out). Take their dates and wording from Record 1 and git history.

No other Constitution change is approved.

---

## 9. Remaining reconciliation debt and open items

**Unapplied debts carried forward:**
1. #57 hand-off to `docs/ai/AI-RESPONSIBILITY-MAP.md` §7 (topic field, suggested answers, per-topic delegation feeding G8, intent-level questions).
2. Constitution amendment log backfill (§8.4).
3. Stray duplicate `docs/wayfinder-v2/CREATOR-RATIFICATION-RECORD.md` (identical to `docs/product/`); remove or mark as a stale copy.
4. DOMAIN-MODEL §5 adoption wording from #67 not reviewed by the #54 owner (§2.1).
5. Spec-level tuning values: #63 friction thresholds and quiet-notice wording; the D52.2 "major revision" trigger threshold; cap defaults and hidden-ceiling size (parked, set before first invitation).

**Dissolved:** the #65 pin missing from `docs/ux/INTAKE-AND-INTERVIEW.md` (the pin no longer exists).

**Still unverified facts:** R2 presigned URLs from prefix-scoped credentials (worked around); whether a backup target can scope deletes per project (now only matters when backup policy is decided, P12); NLE editor path and mixed-fps behaviour (#70 recommends a 15-minute hands-on check); items #73 marked unverified; VPS price estimates in P11; vendor facts dated 2026-10-21.

**Deferred by the creator:** backup counts, retention, second vendor, drill cadence (P12.3); project-level "always include" constraint (X3.6); cross-project adoption of production work (D52.2).

---

## 10. Instructions for the Wayfinder parent session

1. Treat this Record and Record 1 as the authoritative creator-decision sources. This Record controls where they differ.
2. **Apply the Constitution amendment in §8 exactly**, including the amendment-log backfill. Nothing else in the Constitution.
3. **Relay and close:**
   - **#58:** relay D58 to its child; child writes `docs/ux/WRITING-EXPERIENCE.md` from D58 and §3.1, then closes #58.
   - **#59:** relay D59; child writes the World Definition UX doc, updates `docs/domain/ENTITIES-AND-LOOKS.md` §5/§7 (Directions proposed at shot planning; Identity vs Production coverage readiness; location variant as Look or separate entity; manual add) and ADR 0003 wording; then closes #59.
   - **#60:** **do not close.** Reopen its UX work as a redo per D60 (V1 Script Hub reference, scene excerpts, Draft all = plans only, initial-plan auto-draft rules, invariants, ad-hoc shot section X5, timeline intent X6). Brief the child that all prior #60 UX is rejected.
   - **#61:** relay D61; child rewrites its resolution for CineBlock-as-module, then closes #61. File the architecture consequences in #71's docs: a previs/CineBlock module, the 3D client served by Aiuteur under one session, internal package contract.
   - **#62:** relay D62; child writes the review/playback UX doc, then closes #62.
   - **#66:** relay D66; child confirms §8.3 of `PROVIDERS-AND-MODELS.md` (remove "awaiting creator confirmation"), adds a **world-model operation class** with operator-paid-until-BYOK payer (D61.4), then closes #66. Then launch #69 and #76 as planned.
4. **Update docs (agent work, within these decisions):**
   - `docs/domain/SCENE-IDENTITY.md`: §4.4 default Keep current; major-revision duplicate path (D52.2); "Removed from Story" label (§5.1); reference to ad-hoc shots.
   - `docs/domain/SHOT-MODEL.md`: P1 "Copy to narrative"; P3 count Takes (§7.3); ad-hoc shots (shot with no parent scene, no write-back ask, explicit Looks, excluded from runtime/playback, exported separately, Move to scene); captures always through image generation (§8).
   - `docs/domain/GENERATION-PACKAGE.md` and **ADR 0014**: remove the per-Fact pin and pinned Facts from the `binding` layer and hand-offs; state X3; remove `fact-changed` as a media-lineage reason where it depended on pinned Facts (update `LINEAGE-AND-STALENESS.md` accordingly).
   - `docs/ai/AI-RESPONSIBILITY-MAP.md` §4.3 and `docs/ux/INTAKE-AND-INTERVIEW.md`: Facts as development knowledge from multiple sources; bind drafting; superseded status on creator edits; no pin toggle. Plus the #57 §7 debt.
   - `docs/domain/BUSINESS-AND-OPERATIONS.md` §3: 10+ rule counts Takes; world-model spend; cost estimates for a VPS.
   - `docs/architecture/RUNTIME-PLATFORM.md`, **ADR 0017**: default hosting a single VPS with R2; portability requirements (P11.2); Fly/Neon as alternatives.
   - `docs/architecture/OPERATIONAL-BASELINE.md`, **ADR 0018**: backup floor and single restore test (P12); defer second vendor and drill cadence; purge promise wording (P8-purge).
   - `docs/architecture/PERSISTENCE-AND-MEDIA.md`: duplicate-without-production form for D52.2.
   - `docs/ux/NAVIGATION.md`: Outline gains "Ad-hoc shots" and "Removed from Story"; overview redesigned from V1 Script Hub (pending #60 redo); CineBlock opens in its own Aiuteur tab.
   - `GLOSSARY.md`: Removed from Story; Ad-hoc shot; Identity readiness; Production coverage readiness; base Look (= canonical identity); superseded Fact; world model; Update Treatment to match Beat Sheet; Notes (writing).
   - Map #49 Notes: add decision lines for D52, P10/X3, P11/P12, D58–D62, D66; record #60 as reopened for redo.
5. Propagate §3.1 (prototypes are structural only; V1 is the visual reference) to every UX child and to any later spec work.
6. Do not turn deferred items (§9) into decisions without asking the creator.
7. After reconciliation, resume orchestration: #66 closes → launch #69 and #76 → #77 → #78; the #60 redo runs in parallel; #79 (Final Consistency Audit) waits on everything, including the #60 redo. Do not run `/to-spec`, `/to-tickets` or implementation as part of this reconciliation.
