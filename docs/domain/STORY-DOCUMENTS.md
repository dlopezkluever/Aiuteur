# Story documents: representation, provenance, revisions, targeted rewrite and sync

Resolution of Wayfinder ticket #51. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). The representation trade-off is [ADR 0008](../adr/0008-story-documents-are-block-documents-with-provenance-runs.md); the sync decision is [ADR 0009](../adr/0009-treatment-beat-sheet-sync-is-explicit-and-never-guesses.md). The creator's sync choice is R10 in [`CREATOR-RATIFICATION-RECORD.md`](../product/CREATOR-RATIFICATION-RECORD.md). This is a design contract, not a schema; names of fields are illustrative.

Authority: Constitution §§4.2–4.4, 5.3, 13.2–13.3, 16 (principles 2, 3, 4, 11, 12); R10; [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md) (Revision, Option, Slot); [`../ai/AI-RESPONSIBILITY-MAP.md`](../ai/AI-RESPONSIBILITY-MAP.md) (guards G1–G10, handles, splice). V1 is cited only as failure evidence (legacy 06 §§3, 5–7, 10–12; legacy 10 §6).

No `CONSTITUTION AMENDMENT REQUIRED`: nothing here conflicts with a CORE or IMPORTANT requirement.

## 1. V1 failures and the V2 rule that answers each

| V1 failure | V2 rule |
|---|---|
| Script stored as `tiptapDoc`, `formattedScript`, `scenes[]` and `script_excerpt`; the round trip was not idempotent (06 §7.5) | **One stored form.** Plain text, Markdown, screenplay and editor JSON are projections or import formats, never stored as truth and never parsed back into it. |
| About eight disagreeing heading and scene parsers (06 §§7.5, 8.1, 8.5) | **Structure is explicit** (block kinds and ids). No structure or identity is recovered by pattern-matching prose. |
| Every PUT inserted a version; opening a stage saved one (06 §§1, 11) | **Working copy vs Revision.** Autosave writes the working copy only. Revisions have named causes (§4). Opening, browsing, refreshing and no-op saves create nothing. |
| Narrative history existed but no UI listed it; other text versions were capped at 8 (06 §§3, 10) | **Linear, append-only, uncapped history** per document, listed and restorable. |
| Fallback parser chains (“one beat holds the raw text”, `JSON.stringify` of parsed output) (06 §§5.1, 6.1) | One validation layer (G1); failure is reported, never coerced. |
| Dead sync flags; “Regenerate All” used a stale snapshot (06 §§5.4, 6.4) | Sync is a link model; drift is computed from content hashes (§6). |
| Rewrite inserted a plain string into a block node of unknown structure (06 §7.4) | Targeted-rewrite contract (§5), enforced by splice guard G4. |

## 2. Document representation

### 2.1 Options compared

| Criterion | A. Plain text/Markdown + stand-off anchors | B. Editor-native rich-text JSON as the record, provenance as marks | C. **Owned block document with provenance runs** (chosen) |
|---|---|---|---|
| Hand editing | Good | Best | Good, through a lossless editor adapter |
| Span provenance survives edits | Poor: offsets drift and must be re-derived by diffing on every save | Good (marks move with text) | Good by construction: runs are the content |
| Stable ids for beats, paragraphs, dialogue | None; ids would be heading text (V1) | Not native; bolted onto an editor schema | Native |
| Dialogue as an addressable unit (AI map §4.1) | Needs parsing | Possible, schema-coupled | Native block kind |
| Targeted rewrite: exact locality, checkable | Offsets only | Positions in a library schema | Block id + offsets + hash; splice guard G4 is a pure function |
| Link endpoints for sync, anchors for scenes and shots | Weak | Medium | Strong |
| Independence from the editor library | Independent | Locked to its schema | Independent |
| Cost | Lowest | Medium | One schema we own, one adapter we must prove lossless |

A is rejected: it re-derives structure and provenance and reproduces V1's parser and round-trip failures. B is rejected as the permanent record; the editor holds a transient projection of C.

### 2.2 The model

```
Document  { id, kind: treatment | beat_sheet | master_narrative | treatment_option,
            head: RevisionId, blocks: Block[] }                 // list order = story order
Block     { id (opaque, permanent), kind, attrs (ids, enums, numbers only),
            fields: { name -> Run[] } | children: Block[],
            lineage: split_from? | merged_into? }
Run       { text, provenance: creator | imported | ai_generated | ai_edited,
            generation?: GenerationRef }
```

- **Kinds.** Treatment and options: `paragraph` (optional `heading`). Beat Sheet: `beat`, one block per beat. Master Narrative: `scene` containers whose children are `action`, `setting`, `state_change` and **`dialogue`**; a dialogue block has attrs `speaker` (an Entity reference or a plain name), a `delivery` field and a `line` field. Prose lives only in runs.
- **Dialogue is a machine-addressable unit** (hand-off from #64, AI map §4.1 and §9). A dialogue block's id is its **verbatim handle** for conversion, export, shot drafting and protected-span restore. Speaker, delivery note and line are separate fields of one block, so “the ordered list of dialogue blocks” (guard G3) is a query, not a parse. Shot Dialogue lines anchor to dialogue block ids.
- Order is list order. There is no stored number that can disagree with it. Scene numbers and beat numbers are labels derived from order.
- Adjacent runs with the same (provenance, generation) merge. Display may coalesce whitespace-only runs; stored text is exact.
- **Block lifecycle** is explicit in Revisions: *split* (the first part keeps the id, the second gets a new id with `split_from`), *merge* (the earlier block keeps its id, the other is retired with `merged_into`), *move* (id unchanged), *delete* (retired; recoverable from the Revision).
- **Derived forms** are computed on demand and never authoritative: plain text for AI context (with block-id handles inline), Markdown, screenplay, PDF.
- **AI output enters only through the commit path** (G1 schema, G2 references, G4 splice, G7 provenance). Block structure from the model is validated against the target fragment’s kinds; invalid output is rejected, never coerced.

### 2.3 Treatment options

The domain model’s Treatment is the chosen one, with Options (unchosen alternatives). In this representation a treatment Option is a complete block document with its own Revisions, offered by a Generation and editable while unchosen. **Choosing** copies the Option’s blocks (ids preserved) into the Treatment as one new Revision labelled `chosen from <Option>`, with provenance unchanged. The Option and its history stay recoverable. “Just give me one” is a single Option chosen at once. Whole-treatment regeneration is a new Generation whose output replaces the Treatment head as a new Revision (pre-operation capture, §4) or adds Options, at the creator’s request. Unchosen Options are never synchronized. The number of Options and their presentation belong to Writing experience (#58).

### 2.4 Imported content standing in for a phase

- Source Material originals stay verbatim and untouched. Import creates the phase document as a copy **converted once** into blocks. Every character is an `imported` run; the Revision cause is `import` and references the Source Material item.
- **Verbatim invariant** (G3, G5): concatenated `imported` text equals the normalized extraction shown to the creator. Anything the AI adds in conversion (descriptive detail added to a screenplay, AI map §4.1) is a separate `ai_generated` run, placed between existing blocks, reviewable. If structure cannot be determined, the fallback is coarse paragraph blocks, which is still lossless.
- A skipped or bypassed phase has **no document** and a phase disposition of skipped or bypassed (a workflow fact, not an empty draft). Filling it later is an explicit generation producing `ai_generated` runs. Nothing is backfilled automatically (§4.3).
- Importing one development document never creates the other. Linking (§6) needs both.

## 3. Span provenance

Granularity is the **run**: the maximal stretch of one provenance inside a field. It is exact to the character.

| Event | Resulting provenance |
|---|---|
| Creator types, pastes external text, dictates | `creator`. Typed text never inherits an adjacent AI run. |
| Creator pastes text copied from another Aiuteur document | Original provenance preserved |
| Import (file; supplied treatment, beats or screenplay) | `imported` |
| AI generates text (Options, derived beats, regeneration, reverse generation, a sync that inserts or rewrites) | `ai_generated` |
| AI targeted rewrite at the creator’s request | Replacement is `ai_edited`; the replaced text survives only in earlier Revisions |
| Creator edits inside an AI run | Only the changed characters become `creator`; the rest keeps its provenance |
| Delete, reorder, split, merge, choose an Option, restore a Revision | Surviving text keeps its provenance |
| Creator accepts or chooses AI text | Unchanged. Acceptance never launders provenance (matches [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md) §4.4) |

Provenance is **computed by the commit path from the splice** (G7), never reported by a model. The provenance highlight (IMPORTANT) groups `ai_generated` and `ai_edited` as “AI-made” by default (§13.3) and may distinguish them.

**Protected span** (AI map §4.2, refined here): in any AI operation on a document, runs with provenance `creator`, `imported` or `ai_edited` are protected. They are passed to the model as handles and restored by code; the model cannot alter them. Protection derives from provenance only; nothing else (such as a block-level flag) is needed, and a block with one typed word can still be rewritten around it. `ai_generated` runs the creator never touched are replaceable by sync and by region regeneration. Region regeneration modes (“keep my dialogue”, “keep my edits”, “replace everything”) are the AI map’s; how they are presented belongs to Writing experience (#58).

## 4. Revisions

**Two layers.** The *working copy* is written durably and continuously (crash-safe, nothing lost) and is not a Revision. A **Revision** is an immutable, restorable state of one document with a cause, an actor kind (creator or Generation), a parent, a time, a content hash and optional labels. Storage may delta-compress; that is a persistence concern. This refines the domain model’s “every change adds a Revision” for hand editing: a hand-editing session counts as one change.

| Cause | When |
|---|---|
| `creator_edit` | A hand-editing session settles: idle pause (threshold is spec-level), leaving the document, explicit “save version”, or forced capture by the rule below. At most one per settled session. |
| `ai_generation` | Initial or regenerated Options or Treatment, derived beats, generated or converted Master Narrative, reverse generation |
| `ai_targeted_rewrite` | Each applied rewrite (§5) |
| `sync` | Each applied sync action (§6) |
| `import` | Import or conversion |
| `restore` | Restoring an older Revision adds a new head; history is never rewound |

Labels, which are not new content: `accepted` (Master Narrative), `chosen from …` (Option), named checkpoint.

- **Pre-operation capture.** Before any operation that can replace content (generation, rewrite, sync, restore, import over existing content), unrevised working-copy changes are first captured as a `creator_edit` Revision. Nothing destructive runs over uncaptured work.
- **Creates nothing:** opening, refreshing, browsing, scrolling, selecting, toggling highlight, viewing history, hydrating the editor, and any save whose content hash equals the head. Every write carries an idempotency key; a replay creates nothing new.
- **Retention:** none. No cap and no pruning. Any future compaction may merge `creator_edit` Revisions within a session only and never drops AI-caused, import, sync, labelled or accepted Revisions.
- **After Master Narrative acceptance** editing the Master Narrative adds Revisions as usual; the lock and staleness rules are [ADR 0005](../adr/0005-locks-are-server-enforced-domain-state.md) and [ADR 0004](../adr/0004-possibly-out-of-date-is-derived-from-lineage.md).

## 5. Targeted-rewrite contract

Inputs: document, base Revision, selection (block id + offset to block id + offset), the selection’s text hash, the creator’s instruction (may be empty for “try this passage again”). Surrounding text, Established Facts and Writing Style are read-only context.

1. **Direct apply.** No preview or diff gate (§13.3). The Revision is the safety net.
2. **Model contract.** The model receives the selection, the instruction and context, with protected spans inside the selection as handles. It returns one replacement. It never emits protected text (AI map §4.2).
3. **Base check.** On completion code verifies the base Revision is still head or the selection hash still matches the head. Match: apply at the located range. Mismatch: **held** (“this changed while I was working”), kept as an Option on the Generation, never applied over newer text, never dropped.
4. **Splice and post-condition (G4).** The new document equals prefix + replacement + suffix. Every block, run, provenance and id outside the selection is byte-identical. Failure rejects the result with no Revision.
5. **Provenance.** Replacement text is `ai_edited`; handled protected spans keep theirs.
6. **Block ids.** Selection inside a block: ids unchanged. Whole blocks n replaced by n′: the first min(n, n′) keep their ids in order, extras are new, surplus old blocks are retired. Master Narrative `scene` containers follow Scene identity (#52).
7. **One Revision** (`ai_targeted_rewrite`) per applied rewrite, recording the instruction, the selection, the base Revision and the Generation.
8. **Fact check (G6)** runs on the replacement; outcomes follow R6 (one repair, then held; unavailable check commits with a visible marker; altered dialogue or a damaged splice is rejected with no “use anyway”).
9. **Failure** (model error, invalid structure, timeout): nothing applied, no Revision, failure visible and retryable; the selection is preserved.
10. Regenerating a “larger portion” is the same contract with a larger selection. Regenerating the whole document is `ai_generation` (§4).

## 6. Treatment ↔ Beat Sheet synchronization (before Master Narrative acceptance)

Decision (R10): **explicit only**. Aiuteur detects and shows disagreement automatically but never changes either document unless the creator presses Sync. Rationale and alternatives are in ADR 0009.

### 6.1 What links

A **correspondence** relates each beat of the Beat Sheet to a set of paragraphs of the **chosen** Treatment (many-to-many), with a **base**: the content hash of each side when they last agreed. Links are created by deriving beats from the Treatment, by “align” (an L proposal the creator sees and can edit, for imported or hand-built pairs), and by inheritance through split and merge lineage. Granularity is the paragraph. Choosing a different Treatment leaves the pair unaligned until derive or align runs again.

### 6.2 Drift (always on, free, no AI)

Computed per link by comparing current hashes to the base: *in agreement*, *treatment changed*, *beat changed*, *both changed*; and per document: *passage with no beat*, *beat with no passage*, *order differs*, *not aligned*. Drift is a quiet mark with a reason (M1), never blocking, and is derived, never a stored flag.

### 6.3 What Sync does

Sync is pressed per item or for the whole pair. Each action is a normal AI operation (fixed pipeline, an L proposal committed by guards, AI map §9), so every sync is one Generation and one `sync` Revision per target document, undoable:

- **Update beat from passage(s)** and **update passage(s) from beat**: rewrite the target block with its protected spans passed as handles.
- **Add the missing beat or paragraph** for an uncovered passage or beat; insertion never touches existing blocks.
- **Keep both as they are:** reset the base to the current content; no text changes.

Whole-pair Sync is a batch of per-link Generations, so completed items survive a later failure. Text actions are normally under the trivial-spend threshold; the ordinary spend rules and the 10-Generation confirmation apply.

### 6.4 Protection and conflicts

- Sync never deletes or reorders a block, and never alters a protected span (§3). A block containing only replaceable `ai_generated` text is updated freely.
- If the needed change would alter a protected span, the model returns a structured “needs protected change” outcome and the result is **held** as an Option, per R10 (“a protected-span change is held”). The creator can use it (applied as an ordinary requested rewrite of that range), adjust it by hand, or keep both. A damaged splice or altered protected text is rejected (G3, G4), as always.
- When both sides changed, nothing is chosen for the creator. The pair shows the drift with three explicit choices: update beat from passage, update passage from beat, keep both.
- Sync is recoverable: each result is a Revision, and held results are Options.

### 6.5 The disagreement check

Before **drafting the Master Narrative** and before **accepting** it, if the Treatment and Beat Sheet both exist and drift is present, Aiuteur shows the disagreement and asks which document to follow. It never guesses and never silently picks a primary.

- At drafting, the choice names the primary input; the drafting Generation records the exact Treatment and Beat Sheet Revisions it used. The creator may also run Sync first, or proceed with “follow Treatment” or “follow Beat Sheet”.
- At acceptance, the choice is recorded as a creator Decision; if the creator chooses to follow a document, the Master Narrative is not rewritten by this; the creator can redraft or edit. Acceptance proceeds only by the creator’s explicit click, as now.
- If the pair is *not aligned* (for example both imported), Aiuteur says it cannot compare and offers Align; it does not report agreement it cannot know.
- Both documents are skipped or only one exists: no check is needed.

### 6.6 After acceptance

When the Master Narrative is accepted, the correspondence is frozen as history: drift is no longer computed or shown, nothing is flagged (R2), and neither document is synchronized again. They remain viewable and editable. “Development history” is derived from the project’s accepted state, not stored on the documents. **Reverse generation** (beats or Treatment from the Master Narrative) is an explicit `ai_generation` that adds a Revision after pre-operation capture and records the Master Narrative Revision it derived from; it creates no standing link.

## 7. Invariants the spec should test

Editor adapter round trip is identity. Import preserves source text verbatim. A rewrite leaves everything outside the selection byte-identical, and the ordered dialogue blocks are unchanged unless the selection contains them. Opening or refreshing a document writes nothing and creates no Revision. Replaying a write with the same idempotency key creates nothing. Unchanged text keeps its provenance through every operation, including restore. Sync never removes or alters a protected span; a held outcome applies nothing. Screenplay export’s dialogue list equals the Master Narrative’s (G3). Pressing nothing never changes a document.

## 8. Hand-offs

**Scene identity (#52, resolved in [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md): Scene id equals the container block id; mapping precedes id assignment; the questions below are answered there).** Master Narrative = ordered `scene` container blocks with opaque, permanent ids that survive edits, moves and AI rewrites inside the scene. Split, merge and retire are recorded per Revision. Downstream records refer to (document, Revision, block id) for anchors and to the Scene’s own identity for production. No identity or structure is parsed from text. Dialogue blocks are addressable inside scenes. Left to #52: whether Scene id equals the container block id; matching across whole-narrative regeneration and screenplay re-conversion (the AI map asks for deterministic first, ambiguity surfaced); scene heading attrs; what happens downstream when a scene block is merged or removed (must retire, never delete).

**Writing experience (#58).** Option count and presentation; drift notes, Sync affordances and the disagreement prompt (quiet, M1); region-regeneration mode presentation; highlight rendering; idle threshold feel and save indicators; per-beat alternatives (transient proposals, not document content).

**Persistence and architecture.** Working copy vs Revision; idempotency keys; hash compare-and-set; Generation results retained even when held; derived text view with handles for the compiler; project-separable storage (M7).

**Verification (#76).** The invariants in §7 as pure-function guard tests plus golden fixtures: tricky-dialogue screenplay, rewrite with adjacent protected spans, sync that needs a protected change, and a double round trip through the editor adapter.
