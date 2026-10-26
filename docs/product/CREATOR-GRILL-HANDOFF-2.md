# Creator Grill Handoff 2 (delta only)

> **Status: HISTORICAL PROCESS RECORD. SUPERSEDED.** Historical handoff only. Its decisions were ratified by Records 2 to 6, and several of its "Recommended" lines were rejected. Its prototype pointers target branches now ARCHIVED. Do not use it for prototype or design guidance. See [PROTOTYPE-RECONCILIATION.md](PROTOTYPE-RECONCILIATION.md).

Purpose: a fresh session ratifies decisions made since the first Ratification Record and decides six open creator tickets. Not a project brief. Do not resume orchestration; do not run `/to-spec`, `/to-tickets` or implementation.

## Sources

- Constitution: `docs/product/PRODUCT-CONSTITUTION.md` (two CapCut lines and §16.2 principle 3 were amended with creator approval).
- Latest Ratification Record: `docs/product/CREATOR-RATIFICATION-RECORD.md` (`docs/wayfinder-v2/CREATOR-RATIFICATION-RECORD.md` is an identical stray copy).
- Map: issue #49. Glossary: `GLOSSARY.md`. Prototype sources are on pushed, never-merged branches (see each decision).

## 1. Consequential decisions since the Ratification Record (agent-drafted, not yet creator-ratified)

**Story and scenes**
- #51 (`docs/domain/STORY-DOCUMENTS.md`, ADR 0008, 0009): documents are block documents with provenance runs. Dialogue is its own addressable block. Sync is explicit-only (R10).
- #52 (`docs/domain/SCENE-IDENTITY.md`, ADR 0011): scene id = id of its Master Narrative scene container block. Split keeps the upper id; merge keeps the earlier id and retires the later one with `merged_into`. AI maps scenes only in draft, conversion, whole regeneration and revised-screenplay import, and never auto-picks an ambiguous match. A revised screenplay replaces the head via a mapping with no text merge. Removed scenes are retired and their work kept, in a quiet "Not in the story now" group with Bring back and Adopt work. Shots follow their anchored text on the creator's own split, merge or move, but never automatically for AI or import changes.

**Shots and generation**
- #55 (`docs/domain/SHOT-MODEL.md`, ADR 0012, 0013):
  - Each shot field is narrative-bearing (raises write-back or deviation) or shot-owned (never asks).
  - Redraft never overwrites creator-touched fields; it returns an Option.
  - Direct-to-video is a shot with frames skipped.
  - A Take is an assembly of Segments, so a long shot stays one clip.
  - Judgement calls the creator may veto: dialogue text and speaker are narrative truth while delivery notes are shot-owned; a shot's Direction is shot-owned.
  - Recorded limits: no audio continuity across stitched long-shot joins; no vendor documents faithful whole-frame composition adherence.
- #65 (`docs/domain/GENERATION-PACKAGE.md`, ADR 0014): one typed layered Package, compiled by a pure compiler and recorded. What the creator inspects is what the provider receives. An over-limit request is never sent, with no "send anyway". Overrides are layer-addressed and survive upstream change with a quiet "base changed" row. Extension: a per-Fact "carry into visual generation" pin, defaulting on for visual and audio style Facts.
- #66 (`docs/domain/PROVIDERS-AND-MODELS.md`, ADR 0015): models are reviewed catalogue data behind a fail-closed capability contract. Unknown identity-critical fields make a model not default-eligible.
- Operating model decisions already in the record, applied in #67 and #68 (`docs/domain/JOB-LIFECYCLE.md`, `docs/domain/BUSINESS-AND-OPERATIONS.md`, ADR 0006, 0010): a late result after cancel gives a quiet notice (M2, fixed in `5ac9fb2`); spend thresholds as ratified ($0.05 trivial; confirm at $2.00, 10+ Generations, bulk by filter, unknown price or cap). Cap defaults and the hidden operator ceiling size are still parked.

**Shell and trust UX (ratified in the record; docs written)**
- `docs/ux/NAVIGATION.md`, `docs/ux/TRUST-SIGNALS-AND-LOCKS.md`, `docs/ux/INTAKE-AND-INTERVIEW.md`.

**Architecture**
- #71 (`docs/architecture/MODULE-ARCHITECTURE.md`, ADR 0016): a modular monolith cut by owner of truth. One history module owns the write gate, locks, lineage derivation and edit sessions. Domain modules are pure planners that return a Change. The UI holds no workflow state.
- #74 (`docs/architecture/RUNTIME-PLATFORM.md`, ADR 0017): the Job row is the queue on plain Postgres with no engine. Platform is Neon, Cloudflare R2 and Fly.io (about $35–40/month). Progress is SSE replayed per Account.
- #75 (`docs/architecture/OPERATIONAL-BASELINE.md`, ADR 0018): Better Auth self-hosted in our DB. Operator keys are Fly secrets and BYOK keys are envelope ciphertext. A full backup restore drill is required before the first invitation. Backups are Neon history plus an independent no-delete copy at a second vendor.
- #72 (`docs/architecture/PERSISTENCE-AND-MEDIA.md`, ADR 0019–0023): one Postgres with an append-only spine. Isolation is forced RLS plus composite keys. Media is private and per project, and blobs are copied on duplicate so a purge is rows plus a prefix. Spike: Board at 250 shots about 22 ms, duplicate 2.1 s, purge 4.1 s.
- Research (throwaway branches): #70 `research/nle-import-interchange` (Resolve and Premiere import a timeline; CapCut Desktop cannot). #73 `research/platform-execution`. #72 spike `research/persistence-spike`.

## 2. Open creator decisions (six)

Each prototype is a static in-memory HTML app on a pushed branch. Run with `python3 -m http.server` in the folder, or use the `serve.py` where present. The prior portals were orb-hosted and may be dead.

### #58 Writing Experience
- Prototype: branch `origin/prototype/58-writing-experience`, folder `prototypes/writing-experience-58/`. Doc to be written: `docs/ux/WRITING-EXPERIENCE.md`, not yet written.
- Question: which layout is the base (A Page, B Spread, C Margin), and which additions do you want?
  1. Side-by-side option compare at the choosing moment.
  2. Per-passage "bring back" in version history.
  3. A Treatment/Beat spread view.
- Recommended: A as base, with additions 1 and 2. Options are shown side by side only at the choosing moment (default 3, a "just one" chip, up to 4). Treatment and Beat Sheet stay separate pages with a quiet drift line. Accept is one sheet (disagreement ask, optional AI-addition review that never gates, lock on by default). Restore adds a new head.
- Tradeoffs: A is simplest and calmest but hard for comparing. B is best for comparing and agreement but busy and needs width. C is the cleanest text and most precise recovery, but a stepwise accept feels like a ceremony.
- Blocks: #79 only (via the map).

### #59 World Definition
- Prototype: branch `origin/prototype/59-world-definition`, folder `prototypes/59-world-definition/` (`?variant=A|B|C`). Inputs: `docs/domain/ENTITIES-AND-LOOKS.md`, ADR 0003.
- Question: what should the coverage button generate: (1) every direction of every place, (2) only the directions the story needs, with "complete the room" later, or (3) one place at a time? Also, which base layout?
- Recommended: A's entity workspace as base. B's wall as a second project-wide Coverage view. C's needed-first as the default scope of the one-click button. Bulk acceptance is one reversible "Accept all N" on a contact sheet.
- Tradeoffs: option 1 gives complete coverage at higher spend ($0.96 for 12 images, with the confirm step). Option 2 is cheapest ($0.16 per scene) but infers needs from mentions only. Option 3 repeats the ritual per place.
- Blocks: #79.

### #60 Scene Hub and Shot Planning
- Prototype: branch `origin/prototype/60-scene-hub-shot-planning`, folder `prototype-60/` (screenshots in `prototype-60/screens/`).
- Questions:
  1. Scene workspace skeleton: A (passage plus shot stack), B (runtime strip plus stage), C (dense sheet plus focus), or the hybrid?
  2. Batch drafting: pre-flight sheet always, run then review with undo, in-place ghost proposals, or the hybrid?
- Recommended: B skeleton, with A's anchored-passage panel and a C "list" lens. For batches, B's one click plus undo, with A's disposition preview only when the scope includes creator work or a locked plan, and C's ghost marks on the Board. Fixed-size Board marks with runtime numbers.
- Tradeoffs: A has the best story relation and the clearest no-overwrite promise, but a long stack and an extra step. B has the best runtime view and fastest accept, but relies on undo. C is best for bulk at 30+ shots but feels like paperwork (Constitution §2.3).
- Blocks: #79.

### #61 Composition and CineBlock
- Prototype: branch `origin/prototype/61-shot-planning-inputs`, folder `prototype-61/` (`boundary.html?variant=A|B|C`, `matching.html`).
- Questions:
  1. CineBlock boundary: A file exchange, B linked app, or C embedded?
  2. Is a small CineBlock export change acceptable (echo shot ids, versioned package, opaque scene state)? The creator owns CineBlock.
- Recommended: A now, B later on the same package contract, C not for V2. Yes to the export change. Settled regardless: hero captures become composition references, camera facets fill only empty fields, CineBlock duration and action text are not imported, and matching rules go through one review list. Both panels are flagged in the many-to-one case.
- Tradeoffs: A has no hosting but two manual file steps. B removes the manual steps but needs a cross-app sign-in seam. C has no window switch but ships the 3D stack and Marble client (about $1.20 per generation, operator-paid) in the most crowded screen.
- Blocks: #79.

### #62 Candidate Review and Playback
- Prototype: branch `origin/prototype/62-candidate-review`, folder `prototypes/62-candidate-review/` (`?v=A|B|C`).
- Questions:
  1. Direction: A (viewer plus filmstrip), B (take wall plus run tray), C (sequence-first), or a hybrid?
  2. A shot with takes but none selected: play as a hatched gap slate, or stand in the newest take labelled unselected?
- Recommended: A as base, with C's inline ticket for batch spend, B's "show in context" toggle, and A's timeline track for playback. Gap slate.
- Tradeoffs: A is familiar and clearest for compare, but limited to two takes. B suits many takes and batches, but adds a permanent tray. C is best for in-context judging, but cramped with many takes.
- Blocks: #79.

### #66 Default-model policy
- Doc: `docs/domain/PROVIDERS-AND-MODELS.md` §8.3, ADR 0015. The resolution comment is posted on #66, and the ticket is still open.
- Question: for video, should "Automatic" lean to quality, balance, or lowest cost?
- Recommended: balanced, meaning the best-ranked model whose typical take stays under the $2.00 one-click line. Images, entity images and writing lean to quality. Fact-check and utility calls lean to economy.
- Blocks: #69 (voice, performance and audio seams) and #76 (verification and observability), which then block #77, #78 and #79.

## 3. DO NOT REOPEN BY DEFAULT

- Everything in the Ratification Record, notably:
  - R1 to R10: retire never delete, flag-only staleness, write-back vs deviation, Looks follow the story, location coverage, Established Facts, quiet AI-made choices, no automatic retry with money involved, the duplicate-generation guard, and explicit-only sync.
  - M1 to M7: subtle flags, a quiet late-result notice, no universal chat agent, multi-creator isolated accounts, operator pays with BYOK as a priority follow-on, invite-only signup with creator-set caps and a hidden ceiling, and purge later.
  - #56 shell C, no first-run chooser, and the #57 Interview design.
  - #63 Whisper, lock rules, Mark final and the friction tiers.
  - The spend thresholds.
- Constitution amendments already made: the two CapCut lines and §16.2 principle 3.
- Technical designs for #50, #53, #54, #64, #65, #67, #71 to #75 are agent-drafted and unratified, but they are technical. Inspect them only for the specific debts below, not wholesale.

## 4. #49 frontier

- Closed: #50 to #57, #63 to #65, #67, #68, #70 to #75.
- Creator-blocked (open, assigned to a waiting child): #58, #59, #60, #61, #62, #66. Child threads were launched from the parent thread `T-01a1573d-7a9d-715b-b901-e71ef7eb6a24`, and each child waits for its answer to be relayed.
- Not started and blocked:
  - #69 waits on #66.
  - #76 waits on #66, and its other blockers are closed.
  - #77 waits on #76. #77's other blockers (#72, #74 and #75) are closed.
  - #78 waits on #77.
  - #79 (Final Consistency Audit) waits on everything.
- Continuation path: relay each answer into its child thread, and each child closes its ticket. When #66 closes, launch #69 and #76. After #76, launch #77, then #78, then #79.

## 5. Debts and checks for the grilling agent

- The #57 hand-off to `docs/ai/AI-RESPONSIBILITY-MAP.md` §7 is not applied: a topic field and suggested answers on open questions, G8 delegation, and intent-level questions.
- The #65 per-Fact "carry into visual generation" pin is not reflected in `docs/ux/INTAKE-AND-INTERVIEW.md`.
- #63's friction thresholds, and the quiet-notice wording, are tuning values and not fixed.
- #67 amended DOMAIN-MODEL §5 so a timed-out run that later succeeds is adopted. This was reconciled into the lineage doc, but the amendment was not reviewed by the #54 session.
- The hidden operator ceiling must show a clear explanation when it blocks a generation, as a design note from the reconciliation. Cap defaults and ceiling size are parked, as spec-level configuration.
- Unverified platform facts:
  - R2 presigned URLs from prefix-scoped credentials (worked around).
  - Whether the backup vendor can scope delete for purge (else replica objects age out).
  - Editor path and mixed-fps behaviour in the NLEs (#70 research ran no real editors, and §5.6 recommends a 15-minute hands-on check).
  - Items #73 marked unverified.
  - Vendor facts dated 2026-10-21.
- The #56 prototype branch predates the creator's correction (it still shows a right-hand drawer and a first-run chooser). Only `docs/ux/NAVIGATION.md` is authoritative.
- Prototype branches #58, #59 and #62 have source only, with no screenshots committed. #60 has screenshots. #61 has HTML only. Orb-hosted portals may be gone.
- Contradictions flagged and not decided by agents: the two #55 judgement calls above, and #61's refinement for the many-to-one match.
