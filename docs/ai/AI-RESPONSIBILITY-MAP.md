# Aiuteur V2: AI Responsibility Map

Resolution of Wayfinder ticket #64. It decides, for every operation family, whether the work is deterministic application logic, LLM reasoning or a specialised generative model, which outputs must be structured, and which deterministic validations guard creator truth. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md); objects, ownership and Generation/Job semantics are in [`docs/domain/DOMAIN-MODEL.md`](../domain/DOMAIN-MODEL.md) and [ADR 0001](../adr/0001-revisions-attempts-generations-jobs.md). The trade-off behind the enforcement approach is [ADR 0007](../adr/0007-models-propose-code-commits.md). No schemas, prompts, model names or code are chosen here.

## 1. The ruling idea: models propose, code commits

V1 relied on prompt wording for every creator-truth guarantee (legacy 09 §1.9): user text was rewritten by AI calls on a click, no model output was schema-validated (FACT-0203), failures returned empty success or raw model text (09 §1.5), and tests mocked the LLM (legacy 13). V2 moves each guarantee from a request ("please keep the dialogue") to an enforcement point in code.

Five rules hold for every AI operation:

1. **Models have no tools and no write access.** A model call takes a snapshot of inputs and returns data. It cannot invoke another operation, read the project, or write anything. Only application code commits results. This is what makes "never acts on its own initiative" (§13.1, §14.3) structural rather than behavioural: there is no path from model output to a next step except through code that a creator action started.
2. **Every operation is `propose → validate → commit`.** The model's output is a proposal. Deterministic validators (§3) decide whether it may be committed. Commit is a single code path that creates a Revision, Option or Attempt only together with its Generation and provenance.
3. **Preserve by construction before verifying by comparison.** Text that must not change never passes through the model's output channel. The model is shown it, refers to it by handle or span, and code inserts the original (§4). A comparison check then confirms the property, but the guarantee does not rest on the check.
4. **Deterministic is the default; the model does only what code cannot.** Parsing, formatting, assembling, matching, splitting at known offsets, ordering, packaging and reference resolution are code. A model is used for judgement and language (classify, question, draft, summarise, propose) and for synthesis (media).
5. **No agentic loops.** Flows are fixed pipelines chosen by code. A model never chooses the next step, never chooses or widens the scope, never decides to retry, and never decides it is done. The only loops are creator-paced (the Interview) and one bounded repair attempt (§5). Each multi-step flow is justified in §6. This does not forbid code-defined end-to-end batch operations or creative choices made inside a requested operation: see the workflow-operation model in §6 (creator ratification M3).

```diagram
 creator action (explicit)
        │
        ▼
 ┌─────────────┐  snapshot of inputs   ┌──────────────┐
 │ application │ ────────────────────▶ │ model (no    │
 │ code        │                       │ tools, no    │
 │ (compile,   │ ◀──────────────────── │ write access)│
 │  handles)   │   proposal (data)     └──────────────┘
 └──────┬──────┘
        │ validate (deterministic guards G1–G9; one independent fact check)
        ├── pass ──▶ commit: Revision / Option / Attempt + Generation + provenance
        ├── malformed ──▶ one repair call, else REJECTED (output kept on the Generation)
        └── conflict / stale base ──▶ HELD result (nothing applied, nothing lost)
```

## 2. Execution kinds

| Kind | Meaning | Used for |
|---|---|---|
| **D** | Deterministic application logic. Same inputs, same output, testable without any model. | Text extraction from files, routing rules, handle substitution and splicing, span resolution, context compilation, provider translation, validation, packaging and export assembly, pointer and state changes. |
| **L** | Language-model reasoning: understanding, judgement and writing text. Includes perception (reading an image or transcribing audio to text) when the output is text for the creator. | Classification, interview questioning, drafting, rewriting, extraction proposals, description compilation, shot drafting, the fact check. |
| **M** | Specialised generative model producing media. | Images, video and audio. |

Every L and M call is a **Generation** (it produces creator-visible content). D operations are not (domain model §10, row #64). A Generation carries an ordered log of the model calls it needed (draft, repair, check), each with its exact input, model and cost; the shape of that log is for #65.

Operations name the **capabilities** they need (structured output, long context, image input, maximum duration), never a vendor (§16 principle 13). Selecting a model for a capability profile belongs to the provider-capability work.

## 3. The guards

Deterministic validators sit between a proposal and its commit. They are pure functions of (proposal, input snapshot, current project state) and are testable without a model (hand-off to #76).

| Id | Guard | What it enforces |
|---|---|---|
| **G1 Schema** | Output parses and conforms to the operation's declared schema; enums are legal; no field missing. A response cut off at the token limit is a failure, never accepted (V1 truncated silently). | Structured outputs are real structure. |
| **G2 Reference integrity** | Every id, handle, span and entity reference resolves in the input snapshot. Every quoted evidence string is an exact substring of the span it cites. | The model cannot invent a scene, entity, source passage or quotation. |
| **G3 Verbatim** | Each verbatim-constrained segment of the result is byte-equal to its source segment, in the same order and count. | Dialogue preserved on conversion and export (§5.4, §5.6). |
| **G4 Splice** | The committed document equals base prefix + replacement + base suffix, the base Revision is still current, and creator-protected spans outside or inside the target are present unchanged. | Targeted rewrites touch only the selection (§13.3); regeneration keeps protected spans. |
| **G5 Coverage** | Every verbatim source element is referenced exactly once. Source text that is not carried over is listed for the creator, never dropped. | Conversion loses no dialogue or story. |
| **G6 Fact check** | An independent check call reports, per Established Fact, whether the new content contradicts it (§4.3). Code validates the verdict (G1, G2) and enforces the outcome. | Established Facts are binding (§14.3). |
| **G7 Provenance and record** | The commit path refuses any AI-made content lacking a Generation and span provenance. Provenance of spans is computed by code from the splice, never reported by the model. | Provenance is always knowable (§13.2). |
| **G8 Accounting** | Every material open question left unresolved appears in the draft's `ai_choices`; each becomes an AI-made choice record linked to its question. | Material assumptions are not hidden (§14.3). |
| **G9 Output sanity** | Non-empty; not a placeholder or truncation marker; values in range (for example a shot duration); media decodes and matches the requested type, size and duration; media is persisted to project storage before an Attempt exists. | No empty "success" (V1's shot extraction timeout returned an empty success). |
| **G10 Initiation** | Every Generation names the creator action that started it. No timer, event handler or model output may create a Generation. Meaningful spend also needs its confirmed estimate (#68 defines "meaningful"). | Nothing happens on the AI's own initiative; no unconfirmed spend. |

Guards that apply to creator-visible results never block a **creator's own** edits. Creator typing is not validated against anything.

## 4. Enforcement approach for creator truth

### 4.1 Verbatim preservation: spans by reference, text by splice

Mechanism (the **verbatim handle**): wherever the AI works on text that must come out unchanged, the compiler shows the model that text for context but labels each protected unit with a handle (for example `[D12] MARCUS: "I never left."`). The model must emit the handle in its output where the unit belongs. Code replaces handles with the original text. The model can reorder or omit a handle (G3 and G5 catch that) but cannot alter the text, because it never emits the text.

**Screenplay conversion** (§4.3, §5.6):

1. **D**: extract text from the file and normalise only mechanical artifacts (line wraps, page numbers, `(MORE)`, `CONT'D`). The normalised extraction is shown to the creator and is the text "verbatim" is measured against; the original file remains untouched.
2. **L**: segment the extracted text into typed blocks (scene heading, action, dialogue with speaker and parenthetical, transition). Output carries source offsets, not copied text.
3. **D**: slice each block's text from the source by offset. Dialogue (speaker, parenthetical and line) and the screenplay's own action lines are therefore byte-identical, with *imported* provenance.
4. **L**: for each scene, propose *additions* only: descriptive detail the screenplay lacks (appearance, setting, visible action), placed between existing blocks. Additions never replace or rewrite a sliced block; they carry *AI-generated* provenance and are reviewable (§5.6).
5. **Guards**: G1, G2 (offsets in range, blocks non-overlapping), G3, G5 (every non-format source character is covered once; remainder is reported), G6 on the additions, G7.

A screenplay that is badly formatted or ambiguous yields low segmentation confidence; the creator is shown the extraction and the segmentation, never a silently corrected result.

**Screenplay export** (§5.4):

1. **D**: take the Master Narrative Revision; split into scenes and typed blocks (requires the dialogue-addressability constraint below).
2. **L** (per scene): condense the *non-dialogue* material (action, setting, appearance) to screenplay norms, outputting condensed text for each action slot between dialogue handles.
3. **D**: assemble the screenplay: headings and transitions generated by code, dialogue blocks (speaker, parenthetical, line) copied from the Master Narrative by handle, condensed action from step 2, standard layout.
4. **Guards**: G1, G2, G3 (the ordered list of dialogue blocks in the export equals that of the Master Narrative Revision, exactly). The export records which Master Narrative Revision it was built from. It is a view; it stores nothing the narrative does not own.

Delivery notes are carried as parentheticals unchanged: simpler and more reliable than condensing them. Revisit only if real exports prove unreadable.

**Constraint on the document model (hand-off to #51):** dialogue (speaker, delivery note, line) must be a machine-addressable unit inside the Master Narrative, whatever representation #51 picks (blocks, anchored spans). Conversion, export, shot drafting and protected spans all depend on it. Without it, G3 degrades to fuzzy matching, which this design rejects.

### 4.2 Protected creator spans and targeted rewrites

- **Targeted rewrite** (§13.3): the model receives the selection, the creator's instruction and the surrounding text as read-only context. It returns one replacement string. Code splices it at the selection's offsets against the base Revision (G4). Everything outside the selection is preserved by construction, not by instruction. If the base Revision changed while the call ran, the result is HELD, not applied over the newer text.
- **Regeneration of a region that contains creator-authored or imported spans** (a scene of the Master Narrative, a document section): creator dialogue is passed through as handles and restored by code (G3, G4); other creator-written spans in the region are passed as handles when the call's mode is "keep my edits". The default mode for a region regenerate is "keep my dialogue"; replacing everything is the creator's explicit choice (the Revision makes it recoverable). How the mode is presented belongs to #51 and the story-document UX.
- **Span provenance** after any AI operation is computed from the splice: replaced spans become *AI-edited at the creator's request* (or *AI-generated* for new text), handled spans keep their origin. The model reports nothing about provenance.

### 4.3 Established Facts

Honest limit first: whether free-text prose contradicts a free-text statement is semantic and cannot be decided by code alone. The design therefore guarantees that the check happens, that it is well-formed and grounded, and that its outcome is acted on. It does not claim a zero false-negative rate.

0. **What a Fact is (Record 2 P10/X3).** Facts are development knowledge from inputs, Interview answers, creator edits and explicit decisions. They bind AI drafting and revision (Treatment, Beat Sheet, Master Narrative, World Definition, Visual Style) and are fact-checked. They are not injected into media generation, which reads canonical state. A creator's own edit that contradicts a Fact wins; the Fact is quietly marked **superseded** (a Revision), with Undo, and no question is raised.
1. **Inclusion**: every drafting operation receives all Established Facts as binding context (layer precedence is #65's). Facts that are typed project settings (runtime, format, aspect, rating) travel as typed fields, and checks against them are deterministic (for example a scene-duration sum against the intended runtime is displayed, not blocked).
2. **Independent check (G6)**: after a drafting, rewrite, conversion-addition, entity-description or shot-plan operation, a separate L call receives only the Facts and the new or changed content (for a rewrite, the replacement and a short window) and returns a structured verdict per Fact: `consistent`, `not touched` or `contradicts`, with, for `contradicts`, a quote from the content. Code verifies the quote is an exact substring (G2); an unverifiable "contradicts" is discarded as a malformed verdict. A different prompt (and, where useful, a cheaper model) means the drafter cannot "agree with itself".
3. **Outcome**:
   - `contradicts` (verified): one automatic repair call, naming the Fact and the quote. If the repair still contradicts, the result becomes **HELD**: kept on the Generation, not applied or offered as clean. The creator chooses: use it anyway (recorded as the creator's acceptance of a conflict with that Fact), revise the Fact (a new Revision; its dependants become *possibly out of date*), regenerate, or discard. For Options, a held output may simply sit flagged beside the others.
   - The check itself fails or is unavailable: the result is committed with a visible **not checked against Established Facts** marker and a "check now" action. Infrastructure failure never traps the creator (§16 principle 9), and it is never silent.
4. **Inputs that conflict with a Fact** (new Source Material, a creator edit that the AI later reads): surfaced as a new open question (§7), per §4.2 Phase 2. Creator edits themselves are never rejected.
5. **Media steps** receive no Facts and do not re-judge them. They compile only from owned truth and may not alter identity or narrative truth (§14.3). A vision check of generated media against Facts is not part of this design; the creator inspects media. Automatic scoring or rejection of takes by a model is excluded (§10.2 gives selection to the creator).

### 4.4 Provenance and the initiative guard

Provenance is written by the single commit path (G7) from the splice and the operation's kind, not by prompt output. The initiative guard (G10) is a precondition on creating a Generation; since models have no tools, there is no other route to AI work. The "draft ahead on explicit request" case (§14.1, §14.4) is one creator action that fans out to many Generations (one batch grouping, #67).

## 5. Failure and override rules

| Situation | Rule |
|---|---|
| Model call transient failure or provider refusal | Classification and retry policy are #67's. A refusal is a failure with its reason visible, never a retry loop. |
| Malformed or schema-invalid output (G1) | One automatic repair call that includes the validation error. If still invalid: **REJECTED**, existing content untouched, failure shown with retry. The raw output stays on the Generation for inspection. |
| A guard G2–G5 fails after the repair | **REJECTED** the same way. There is no "use anyway" for altered dialogue or a damaged splice; the creator can retry or edit by hand. |
| Fact conflict persists after repair (G6) | **HELD**: output kept as a recoverable Option, nothing applied; creator decides (see §4.3). Choosing "use anyway" is a recorded creator Decision (lineage class 4). |
| Base Revision changed during the call | **HELD**: "this changed while I was working"; creator may apply to the new text or discard. |
| Target is in a locked scope when the result arrives | **HELD** as an Option, the rule in [`LINEAGE-AND-STALENESS.md`](../domain/LINEAGE-AND-STALENESS.md) §6; the write gate there, not this document, decides. |
| Any failure | Existing creator content is unchanged. A failed Generation has no outputs (domain model). No silent fallback to a different model or to raw model text. A different model is a creator-visible change; for M it also changes cost. No empty success. |
| Mechanical failure inside a creator-triggered operation | The single bounded repair above runs without interrupting the creator, in a batch as in a single action. Only an unresolved consequential conflict (HELD) or a REJECTED item reaches the creator, and partial results survive individual failures. |
| Repair or text retries and spend | Repair calls and text retries inside one operation are part of its Generation. Whether they fall under "meaningful spend" is #68's; the repair attempt is capped at one so cost is bounded and predictable. M retries follow #67 and #68. |
| Creator overrides | The creator may always: hand-edit any result; skip the Interview or a question; use a held fact conflict anyway; revise or withdraw a Fact; regenerate; choose a model; edit a compiled prompt (#65). The creator cannot switch guards off: they protect the creator, and each can be sidestepped by editing by hand. |
| Source Material that contains instructions | It is data, not instructions: delimited in the prompt, and the damage an injected instruction could do is bounded by rule 1 (no tools) plus the guards. |

## 6. Multi-step AI flows and their justification

### 6.0 Workflow operations (creator ratification M3)

Aiuteur is built from **defined workflow operations**: Generate Master Narrative, Draft all scene plans, Regenerate flagged shots, Auto-block all, Generate missing location views, Rewrite this selection, and others of the same shape. Each is invoked by a creator action: a button, an auto-trigger the creator enabled, a targeted instruction field, or a scope-then-invoke batch action.

- **Code defines the operation and its scope.** The steps, the set of items it touches and the order are fixed by application code before any model is called. The model makes creative choices **inside** the operation (what the scene plan contains, how a passage is rewritten); it never chooses a step, widens the scope, or starts unrelated changes (G10 and rule 1 make this structural).
- **No repeated permission prompts.** A creator-triggered targeted or batch operation is carried through end to end. The invocation is the permission. Spend rules still apply: a batch is approved as a sum (#68), and bulk operations show scope and price first.
- **Failures.** Mechanical failures get the one bounded repair (§5) without interruption; only unresolved consequential conflicts reach the creator.
- **No universal chat agent in V2.** There is no free-form conversational agent that decides what to do. The **project-aware assistant is LATER** (Constitution §14.4) and, when it exists, still proposes reviewable change-sets.

This is the meaning of "no agentic loops" in rule 5: a ban on model-chosen steps and scope, not on end-to-end operations that code defines.

### 6.1 Multi-step flows

| Flow | Steps | Why it is not one call |
|---|---|---|
| Interview turn | One L call per creator reply: ingests answers, returns the updated open questions. | Creator-paced conversation. No autonomous continuation. |
| Treatment options | N independent parallel drafts, each with a code-assigned divergence axis (for example ending, tone, structure) and the other axes named. | One call returning all options is long and tends toward near-duplicates. Axes in code give guaranteed distinctness. No step depends on another. |
| Master Narrative draft | outline (scene list with entering state) → scene drafts (serial or batched with a rolling state summary) → G6 per scene | Output limits and quality for long films; V1's single-call script is a lesson (legacy 09 §2.1.4). A fixed pipeline; code advances it; each scene is a recoverable Job step. |
| Screenplay conversion | segment → per-scene additions → G6 | Segmentation must be separable so text can be sliced by offset. |
| Entity and Look extraction | extract with mentions → per-entity description compilation (parallel) | Description compilation needs the per-entity evidence set. |
| Shot drafting | one call per scene; batch = fan-out per scene | Scenes are independent given continuity input from the previous scene's end. |
| Draft + fact check | draft → check → at most one repair | Contradiction is semantic and needs an independent judge. |
| Generation with M | compile (D) → one provider request | No LLM in the middle by default (§8, context compilation). |

Anything beyond these, such as self-critique cycles, "improve until good" loops, or planner/executor agents, is out of the design. Each addition would need its own justification against §16 principle 12.

## 7. "Sufficiently informed": the Interview mechanism

(Consistent with Intake and Interview, #57; that ticket owns presentation.)

**Principle.** The model never decides that the Interview is over. It maintains a list of what it still needs to ask; code computes a status from that list; the creator decides when to proceed.

1. **Each turn is one L call** with all Source Material (with roles and maturity), project settings, Established Facts and the answers so far. It returns the current **open questions** as structured data: `id`, `kind` (missing, ambiguous, contradictory, underspecified), `materiality`, `question text`, `evidence` (spans of Source Material or Facts, verified by G2), optional suggested answers, and the `AI-made choice` that would be recorded if the question is not answered.
2. **Materiality** is a rubric over fixed categories, not a free score: a question is *material* when its unanswered resolution would be a material invention under §14.2 (an ending, a central character's motive, central relationships, tone or genre, runtime or format, a major visual identity) and the supplied material does not already settle it. Liberty scales inversely with supplied material: a detailed screenplay yields few or no material questions; a two-line idea yields many. Minor connective detail is never asked about.
3. **Status (code).** *Sufficiently informed* = no material open question remains. It is advisory: the creator sees "I think I understand; ready to continue?" with the remaining items, can continue sooner (skip), or can keep going. The Interview is offered every time and skippable (§4.2). Reaching the status never advances the project.
4. **Answers.** An answer is stored verbatim as the creator's own words with the question it answered. The Established Fact is that statement. A model may offer a normalised one-line restatement, shown and editable at the time; it replaces the verbatim form only if the creator accepts it. Revising a Fact is a Revision.
5. **Skipped material questions** become AI-made choices when a drafting operation actually decides them: the drafter must return `ai_choices` for every unresolved material question (G8). Code records them linked to their question. Minor gaps need no flag.
6. **New conflicts.** When new Source Material or a later creator input conflicts with an Established Fact, the next turn raises an open question (contradictory); nothing is overwritten.
7. **Topics and delegation (#57, Record 1).** Each open question carries a `topic` (for example story and plot; characters and locations; visual and audio style) and expected suggested answers including the skip default. Per-topic "you decide" delegation is recorded through the normal drafting path as AI-made choices (G8). Questions stay at intent level; detailed design belongs to World Definition. Conflicts raise contradictory open questions.
8. **Bounds.** Questions per turn are capped in code so the conversation stays a conversation. The numbers are tuning defaults (spec-level), not product decisions.

## 8. Operation-family table

Kinds: D deterministic, L language model, M generative model. Failure codes: REJ = rejected after one repair (existing content untouched), HELD = withheld for creator decision, FAIL = visible failure with retry. Every L or M operation also passes G7 (provenance and record) and G10 (initiation); they are omitted from the Validation column.

| Operation family | Kind | Inputs | Structured output | Deterministic validation | Failure | Override |
|---|---|---|---|---|---|---|
| **Text extraction from files** | D (L-perception only for scanned pages or audio, on request) | File bytes | Extracted text plus extraction report (pages, character count, warnings) | Non-empty; mismatch with page count warns visibly (V1 yielded empty PDFs silently) | FAIL with warning "extraction incomplete"; original always kept | Creator pastes text instead |
| **Material classification** | L | Extracted text, item role if given | `kind`, `maturity`, `proposed entry phase`, `confidence`, `evidence spans` | G1; entry phase must be legal for the kind under §4.3; G2 evidence; low confidence → `unclassified` | REJ → item stays unclassified and the creator is asked; original untouched | Creator sets kind and entry; routing is always a proposal |
| **Interview questioning and "sufficiently informed"** | L (status in D) | Source Material, settings, Facts, answers | Open questions (§7) | G1, G2; status computed by code | REJ → previous question list kept; FAIL shown | Skip anything; creator ends interview; edit or withdraw Facts |
| **Treatment drafting / options** | L, parallel | Material, Facts, settings, Writing Style, axis | Prose, `ai_choices` | G1, G6, G8, G9 | HELD on conflict; REJ on malformed | Choose, edit, regenerate; "just one" |
| **Beat Sheet drafting; reverse-generation** | L | Treatment or Master Narrative, Facts | Ordered beats, `ai_choices` | G1, G6, G8; reverse-generation only on request | as above | Edit beats; skip phase |
| **Treatment ↔ Beat Sheet sync (pre-acceptance)** | L proposes, D applies | Both documents, edit state | Proposed Revision to the other document | G4 with creator-authored spans protected; G6 | HELD if a protected span would change | Creator turns sync off or declines (mechanism: #51) |
| **Master Narrative drafting** | L, fixed pipeline | Beats, Treatment, Facts, source, settings, Writing Style | Outline, then scene blocks with addressable dialogue, `ai_choices` | G1, G6, G8, G9; dialogue from creator-authored source passed by handle | HELD / REJ per scene; completed scenes kept | Edit anything; regenerate a scene; accept is creator-only |
| **Targeted rewrite** | L | Selection, instruction, read-only context | One replacement string | G4, G6, G9 | HELD (stale base, fact conflict); REJ otherwise; nothing applied | "Use anyway" for fact conflict; undo via Revision |
| **Screenplay conversion** | D + L | Extracted screenplay | Typed blocks with source offsets; per-scene additions | G1–G3, G5, G6 (additions), G7 | REJ with reported uncovered source; nothing partial | Creator edits the result; may re-run segmentation |
| **Screenplay export** | D + L | Master Narrative Revision | Condensed action slots; assembled screenplay | G1–G3 (dialogue identical) | REJ → no export produced | Creator edits the exported file elsewhere; the narrative is untouched |
| **Entity and Look extraction** | L + D matching | Master Narrative Revision | Entities with type, aliases, mentions (spans); proposed Looks with trigger spans | G1, G2 (mentions exist), name-collision detection in D; extraction never creates entities | REJ; creator can add or merge entities | Add, merge, defer, change type (#53) |
| **Description compilation** | L | Mention excerpts, Facts, Look | Description with per-claim evidence; claims without evidence flagged AI-made | G1, G2, G6; conflicting evidence surfaced, not resolved | HELD / REJ | Creator edits and approves; identity is theirs |
| **Shot drafting** | L | Scene text, entities, Looks, location coverage, previous shot | Shots: action, dialogue by handle, presence ids, location and View ids, camera intent, duration, narrative anchor | G1, G2 (ids resolve, anchors valid), G3 + G5 (every scene dialogue line appears once, in order, verbatim), G9 (duration range), runtime sum shown | REJ; unknown entity becomes a *suggestion*, never a created entity | Accept, edit, regenerate |
| **Shot split / merge** | split: L chooses boundaries, D cuts; merge: D | Shot, instruction | Split offsets and new camera intent; merged shot | G3 (dialogue multiset and order preserved), G2, action text only partitioned or concatenated | REJ | Edit result; no new story is possible by construction |
| **Context compilation** | D | Owned truth (shot, entities and Looks, style, Facts, previous frames) | Generation package (#65) | Every referenced item exists; nothing silently truncated; claimed references equal carried references | FAIL listing what cannot fit (#65) | Creator edits compiled prompt (#65) |
| **Image generation** | M | Package | Attempt (Frame / entity image / View) | G9 media check, persisted before Attempt | FAIL / provider refusal per #67; failed Generation has no outputs | Choose model, edit prompt, retry, upload instead |
| **Video generation** | M | Package, selected frames, performance | Attempt (Take) | G9 | as above | as above |
| **Audio generation and transformation** | M | Package, Voice, Performance, authorisation | Attempt | G9; only authorised voices (#69) | as above | as above |
| **Validation** | D (G6 uses L) | Proposal + snapshot | Pass, HELD or REJ with reasons | Pure functions, versioned with the app | n/a | See §5 |

## 9. Hand-offs

| Ticket | Receives |
|---|---|
| **Intake and Interview** (#57) | §7: the status is advisory and code-computed; open questions are structured with evidence; answers stored verbatim; skipped material questions become AI-made choices through G8; conflicts become new questions. Presentation (chat versus cards, how "ready?" is shown) is #57's. |
| **Story document representation** (#51) | Dialogue must be a machine-addressable unit in the Master Narrative; span provenance is computed by the commit path from the splice; protected-span semantics (§4.2); the verbatim-handle mechanism for sync and regeneration; the fixed pre-acceptance sync is an L proposal committed by G4. |
| **Scene identity** (#52) | Screenplay conversion and re-import produce typed blocks with offsets; matching to existing scenes should be deterministic first, with ambiguity surfaced. |
| **Entities and Looks** (#53) | Extraction output shape (mentions as verified spans; no entity created by a model); description compilation requires per-claim evidence; unsupported claims are AI-made choices. |
| **Lineage and staleness** (#54, closed) | Its optional "looks like an identity change" assist is an L suggestion under these rules (never a prerequisite, never an automatic write). A Generation's captured inputs also cover a call log, validator results, fact-check verdicts, held and rejected outputs; a "conflict with Fact accepted by creator" record; editing a Fact makes dependants possibly out of date; "not checked against Facts" marker. |
| **Shot model** (#55) | Dialogue by handle with exactly-once coverage; split chooses boundaries and merge is code; unknown-entity suggestion; long-shot splitting for generator limits is not decided here. Resolved in [`SHOT-MODEL.md`](../domain/SHOT-MODEL.md): long-shot Segment prompts are an L partition of the shot's own action and dialogue, verified by code (G2, G3, G9) and adding no story; plan-level redraft matches existing shots by handle and yields Options for anything touched (§5.4); continuity intent and the frame-plan suggestion are drafted as AI-made choices; the deterministic assembly of Segments and the extraction of a last still are code, not model calls. |
| **Generation package** (#65, resolved in [`GENERATION-PACKAGE.md`](../domain/GENERATION-PACKAGE.md), ADR 0014) | Context compilation is deterministic by default. If deterministic assembly proves insufficient, an LLM-authored shot prompt is admitted only as a creator-visible, editable stored Revision, never as a hidden send-time transformation. Package lists exactly the references carried (G9 rule). Facts are binding context. |
| **Job lifecycle** (#67, closed) | Consistent with its rule that every Generation, quick text included, runs as Jobs through one state machine (text uses the fast path). This map adds: the repair and fact-check calls are steps inside one Generation and need no separate creator action; a malformed or guard-failing output is a validation outcome (REJ / HELD), not a Job failure to retry blindly; a long pipeline (Master Narrative draft, conversion, batch drafting) is a batch of per-step Generations so completed scenes survive a later failure. |
| **Business and operations** (#68) | Repair and check calls are text actions expected to fall under the trivial-spend threshold in the job lifecycle, but they are real cost and must be recorded in the spend tracker; the repair cap of one is the cost bound. |
| **Voice and performance** (#69) | Dialogue reaches M by handle (verbatim). Authorisation check is a deterministic precondition for voice transformation. |
| **Verification architecture** (#76) | Guards G1–G10 are pure functions: unit-testable without any model. Golden fixtures (a screenplay with tricky dialogue; a rewrite with surrounding protected spans; facts with deliberate contradictions) test the guards against recorded model outputs, including adversarial outputs that alter dialogue. L and M operations additionally need real-model smoke tests; fake models may never become a default. G6's recall can only be evaluated with real-model sampling, so it needs an evaluation set. Tracing: the Generation call log is the trace. |

## 10. V1 failures this design answers

| V1 failure | Answer |
|---|---|
| User text rewritten by AI calls on a click with no diff (09 §1.9) | Splice and handles (G3, G4); rewrite touches only the selection. |
| No schema validation of model output (FACT-0203); structured-output modes unused (09 §1.5) | G1 on every structured output; structured output modes used where available. |
| Empty success on timeout; raw model text used on failure (09 §1.5) | G9 and the failure rules: no empty success, no raw fallback. |
| Ad hoc JSON parsers per service (09 §1.5) | One validation layer for all operations. |
| LLM mocked in tests (legacy 13) | Guards testable without a model; real-model smoke tests required (#76). |
| Hidden prompt-wrapping LLM steps (legacy 09 §2.5) | Deterministic compilation; any LLM prompt text is a visible, stored Revision. |
| Clarification silently rewrote uploaded documents (§17.5) | Interview never edits Source Material; answers become Facts; originals immutable. |

## 11. Constitution check

No CORE or IMPORTANT requirement was found unworkable or contradictory. One honest limit, not an amendment: §14.3 "never silently contradict Established Facts" cannot be guaranteed to zero misses by any deterministic means. The design guarantees the check runs, its evidence is real, and outcomes are enforced and visible; recall depends on the checking model and is a verification target (#76). No `CONSTITUTION AMENDMENT REQUIRED` is raised.
