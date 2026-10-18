# PK7 coverage: product-knowledge INPUT and STORY ideas vs code

Scope: 259 ideas (WD-IDEA-INPUT: 143, WD-IDEA-STORY: 116) from `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md`, used only as a search checklist. Every idea id is in exactly one cluster (validated by script). Code was searched under `src/`, `backend/src/`, `backend/migrations/`, `backend/scripts/`; `merged2/merged.jsonl` was used as the archaeology map and its WD-IMPL ids are cited.

## Totals by relation

| Relation | Clusters | Ideas |
|---|---:|---:|
| EXACT_MATCH | 2 | 9 |
| PARTIAL_MATCH | 32 | 190 |
| NOT_IMPLEMENTED | 11 | 41 |
| CONTRADICTED_BY_CODE | 3 | 16 |
| UNKNOWN | 1 | 3 |
| **Total** | **49** | **259** |

## Cluster table

| Cluster | Ideas | Relation | WD-IMPL cited | Note (short) |
|---|---:|---|---:|---|
| I-01 Project creation, dashboard and batch operations | 3 | PARTIAL_MATCH | 6 | 001 matches (title-only creation, project cards). 002 is partial: search is title/description only, Filter and Sort buttons have no handler, no fol... |
| I-02 Stage 1 global parameter ownership, lock and project type | 4 | PARTIAL_MATCH | 6 | 005 is CONTRADICTED: Stage 1 is read-only only while locked or outdated (Stage1InputMode.tsx:137), and the unlock route accepts stage 1 at any time... |
| I-03 Stage 1 global parameter fields: length, rating, genre, tonal note, aspect ratio | 5 | PARTIAL_MATCH | 5 | 011 (1-15 min slider stored as seconds), 012 (G/PG/PG-13/M) and 013 (fixed 10-genre multi-select) and 014 (tonal note gated at 10 chars with counte... |
| I-04 Audio-driven project intake (transcript, duration) | 2 | NOT_IMPLEMENTED | 1 | The audio-visual type is selectable in Stage 1 but the backend rejects it, so it cannot be saved. No transcript intake, timestamp handling, or dura... |
| I-05 Writing and visual style selection at intake | 3 | PARTIAL_MATCH | 4 | 016 matches: writing capsule is optional and an empty style context is injected when none is chosen (no explicit neutral instruction exists). 017 i... |
| I-06 Story Rules persistent constraints | 1 | NOT_IMPLEMENTED | 0 | No persistent story-rules field, table, or prompt block exists for 019. |
| I-07 Scene-count inference from input | 1 | NOT_IMPLEMENTED | 0 | No input-time scene-count inference exists; scene count appears only as a by-product of the generated master script. |
| I-08 User content uploads at Stages 1-5 | 1 | PARTIAL_MATCH | 3 | Uploads exist at Stage 1 (staging and Streamline) and Stage 5 (enhanced upload modal) and Stage 8 (scene image upload). Stages 2-4 have no upload c... |
| I-09 Classic input modes and Script Skip | 8 | CONTRADICTED_BY_CODE | 2 | 026-027 are contradicted: Script Skip has no separate pipeline (it returns descriptive text and an accepted-type list only), so it generates treatm... |
| I-10 Multi-file staging with primary and context files | 4 | PARTIAL_MATCH | 3 | 030-032 match: multi-file staging with a primary file (first file is default), context tags, and a 10-file/10 MB limit; primary and context are spl... |
| I-11 Stage 1 gating, autosave and completion | 2 | PARTIAL_MATCH | 1 | 034 matches: the gate requires a mode, project type, 10-char tonal note, and an upload or 20-char expansion idea. 035 is contradicted: Stage 1 auto... |
| I-12 Streamline purpose, general intake pipeline and entry-point options | 16 | PARTIAL_MATCH | 6 | 037-040 partly match: Streamline is a general routing intake for scripts, treatments, beat sheets, character notes and images (not audio). 045 is c... |
| I-13 Streamline intake UI shape and UI principles | 7 | PARTIAL_MATCH | 6 | 053 and 056 approximate the built linear flow (drop or paste, type override, Ask Auteur, review, confirm). 054 (form per document type), 057 (spati... |
| I-14 Upload formats, per-file extraction, partial success and storage | 8 | PARTIAL_MATCH | 6 | 060, 061, 062 (Streamline path) and 063 match: TXT/MD/PDF/DOCX/RTF accepted, legacy .doc rejected, one request per file. 066 is not implemented (ra... |
| I-15 Extraction location (browser vs server) | 2 | EXACT_MATCH | 2 | 069 matches: extraction runs server-side in the extract-file route. 068 (in-browser parsing) is the unchosen alternative; the browser only reads pl... |
| I-16 Accepted text and document source material | 1 | PARTIAL_MATCH | 4 | Text inputs are accepted and classified as script, treatment, beat sheet or character/location notes. Research notes, world-building, style guides ... |
| I-17 Accepted visual inputs and image analysis routing | 3 | PARTIAL_MATCH | 4 | 071-072 partly match: images are classified and become Stage 5 asset drafts, but scene and storyboard images are not routed to Stages 8-10. 073 (mu... |
| I-18 Film-sampling and audio inputs | 6 | NOT_IMPLEMENTED | 0 | Only text document formats are accepted; no audio or video intake, transcription, or audio-note classification exists for 074-079. The name 'whispe... |
| I-19 Document type detection, confidence and script detection thresholds | 8 | PARTIAL_MATCH | 4 | 084 matches: >=3 scene headings and >=1 dialogue line is high, zero headings is low, else ambiguous; 080 detection with override and 081 percent-co... |
| I-20 As-is vs AI-format import | 5 | CONTRADICTED_BY_CODE | 4 | 088-091 per-file as-is / AI-format toggle exists, but routing ignores formatChoice and commits formatted text whenever it exists (FACT-0053), so 08... |
| I-21 Intake output mapping onto stages, landing stage and asset routes | 10 | PARTIAL_MATCH | 6 | 093-099 match the routing matrix: treatment-only lands on Stage 3, a usable script lands on Stage 4, skipped stages can be backfilled from the lock... |
| I-22 Images and storyboards in intake | 7 | PARTIAL_MATCH | 3 | 106 matches: batch review grid for character, location and prop images with type and name editing; heavy image actions are excluded. 103-104 split ... |
| I-23 Ask Auteur clarification session | 13 | PARTIAL_MATCH | 9 | Four question categories exist (contradiction, vague_trait, ambiguous_structure, missing_info), so the fifth 'conflict resolution' category in 113 ... |
| I-24 Source-of-truth ranking and review before commit | 5 | PARTIAL_MATCH | 3 | 124: the four-tier authority ranking is implemented in resolveConflict.ts with a unit test, but has no production caller, so it is not applied to c... |
| I-25 Other structured-input variants and intake beyond project start (future) | 9 | NOT_IMPLEMENTED | 1 | 130 is consistent with the code: Structured Upload is the only new intake mode, and storyboard upload and input template are absent. 132-137 are ab... |
| I-26 CineBlock location image input modes | 6 | NOT_IMPLEMENTED | 3 | No 3D world-generation input modes exist. Stage 5 camera directions (CAP-0158) and location-view generation (CAP-0159) exist but use text and AI im... |
| I-27 Open questions on intake | 3 | UNKNOWN | 0 | These are open questions, not capabilities. 144 is partly answered by limits in code (10 MB and 10 files on staging; 20 MB multer limit on Streamli... |
| S-01 Narrative chain, upstream-only reads and visual storytelling | 4 | PARTIAL_MATCH | 6 | 002 matches: target length, type, rating, genres, tone and capsule are passed to treatment, beat and script templates. 001 is partial: storyContext... |
| S-02 Treatment generation, selection, editing and regeneration | 10 | PARTIAL_MATCH | 10 | 005-009 and 012 match (continuous prose, three labelled variants with runtime, auto-generate, unsaved-change confirm). 011 is contradicted: 'Genera... |
| S-03 Beat generation, beat fields and traceability | 8 | PARTIAL_MATCH | 7 | 015-016 match prompt wording (1-3 sentence beats, 15-30 target, rationale, screen time, narrative_structure). 017 does not scale with complexity (f... |
| S-04 Beat editing, alternatives, split and regeneration rules | 8 | PARTIAL_MATCH | 7 | 022, 025, 027, 029, 030 match (drag reorder, delete, three brainstormed alternatives, guidance gate, confirm rules). 023 partial (in-place edit, re... |
| S-05 Beat durations and projected runtime | 2 | PARTIAL_MATCH | 0 | 032 default 20 s matches, but there is no dial or direct-entry control for beat duration. 033 is partial: the total estimated runtime is shown on t... |
| S-06 Master script content, format and generation context | 7 | EXACT_MATCH | 3 | 034-038 match prompt directives (visually verbose blueprint, ALL CAPS headings, INT./EXT. headings, action detail, purposeful dialogue); output qua... |
| S-07 Sub-location precision and mid-scene location changes | 4 | PARTIAL_MATCH | 0 | 042 partial: the prompt requires only 'INT./EXT. [LOCATION] - [TIME]' with no room-level instruction. 043 partial: prompt asks for detail on every ... |
| S-08 Script editor and workflow | 7 | PARTIAL_MATCH | 4 | 046-049 match (auto-generate, screenplay node types and toolbar, paste-only input, beat alignment panel with click-to-scroll). 050 is partial: prev... |
| S-09 Structured script blocks, scene heading parsing and scene breakdown | 7 | PARTIAL_MATCH | 2 | 053, 054, 058, 060 match (typed blocks, single dialogue-line node with character, parenthetical and dialogue, slug, extensions counted as same char... |
| S-10 Scene manifest, dialogue capture and dependency extraction | 5 | PARTIAL_MATCH | 3 | 061 is partial: one manifest (heading, location, time, characters, props, dialogue, action) is used by Stage 4 approve and Streamline commit, while... |
| S-11 Master Document stage (future) | 1 | NOT_IMPLEMENTED | 0 | The idea defers the Master Document past MVP and keeps 12 stages; no code, table, or stage exists for it. |
| S-12 Partial rewrites and regeneration guidance | 10 | PARTIAL_MATCH | 9 | 070, 071 match (one rewrite or three alternatives; script selection needs 10 chars; only the selection changes). 069 partial: selection rewrite is ... |
| S-13 User edits carried into later AI calls | 2 | PARTIAL_MATCH | 3 | 079 partial: locked content is read-only and becomes the next stage's input, but edits are not marked as manual per beat. 080 is not implemented: r... |
| S-14 Ask Auteur reconciliation of submitted documents | 4 | PARTIAL_MATCH | 5 | 082-083 match in part: reconciliation runs once per session over all documents and the full Q&A; each affected document is rewritten in full. 084 p... |
| S-15 Writing style capsules | 7 | PARTIAL_MATCH | 4 | 086 matches: excerpts, descriptors, avoid-list and notes are formatted as plain text. 091 is partial: writing text is injected only into the treatm... |
| S-16 Audio-driven treatment, beats and script | 3 | NOT_IMPLEMENTED | 1 | No audio-driven treatment, beat, or script branch exists; the audio-visual project type cannot be saved (FACT-0046). |
| S-17 Imported material routing for Stages 2-4 | 4 | PARTIAL_MATCH | 6 | 096 and 099 match the routing (treatment import to Stage 2, beat sheet to Stage 3, screenplay to Stage 4, backfill of skipped stages). 097 partial:... |
| S-18 Drift flags and resync between treatment, beats and script | 8 | PARTIAL_MATCH | 3 | Only the generic unlock cascade (downstream stages marked outdated) exists; 101 mutual flags text, 103-104 resync actions, 106 deviation flag, 107 ... |
| S-19 Downstream impact of script regeneration and partial pivot | 3 | CONTRADICTED_BY_CODE | 4 | 113 is contradicted: scenes removed by a script re-approval are hard-deleted (projects.ts:1433-1440), not marked continuity_broken, although the UI... |
| S-20 Future story-analysis tools | 7 | NOT_IMPLEMENTED | 0 | No code for any listed future story tool. continuityRiskAnalyzer covers production scene continuity, not story logic, so 124 is not matched by it. |
| S-21 Lore library and lore retrieval | 2 | NOT_IMPLEMENTED | 0 | No project-scoped lore library or retrieval exists. The global asset library and style capsules are the nearest existing stores but hold assets and... |
| S-22 Translation, multi-language and script reader TTS (future) | 3 | NOT_IMPLEMENTED | 0 | No translation, multi-language generation, or script read-aloud code exists for 128-130. |

## Concepts the archaeology ledger lacked (new PK7 FACT entries)

- **PK7-FACT-01** Manual staging accepts .doc and reads it as text. The Stage 1 manual FileStagingArea accepts application/msword and reads every non-PDF file with readAsText, so a binary legacy .doc is not rejected on this path. The explicit 'save as .docx or .pdf' rejection exists only in the Streamline extraction service.
- **PK7-FACT-02** Stage 1 autosave is disabled; drafts are written only on Continue. Stage 1 passes autoSave: false to the stage-state hook, with a comment that it is disabled to avoid a race with the manual lock. The draft is written only when the user presses Continue.
- **PK7-FACT-03** Stage 2 'Retroactively Revise Treatment' is a toast-only stub. The retroactive-revision handler in Stage 2 only shows a toast reading 'Retroactive revision triggered' and does not call any service or route.
- **PK7-FACT-04** Beat treatment-excerpt view is never populated. Beats declare an originalTreatmentExcerpt field and Stage 3 renders an expandable 'View original treatment context' block for it, but no code in src assigns that field, so the block never appears.
- **PK7-FACT-05** Aspect ratio has two values and can be changed at any stage. The AspectRatio type and the PUT validator allow only 16:9 and 9:16, and the project update route accepts aspect_ratio with no check on stage lock state, so the setting is editable after Stage 2 has begun.
- **PK7-FACT-06** Stage 1 option sets are fixed in the UI. Stage 1 offers exactly 10 genres, 4 content ratings (G, PG, PG-13, M), 3 project types (narrative, commercial, 'Video for Audio'), and a 1-15 minute target-length slider. Any other value cannot be chosen in the UI.
- **PK7-FACT-07** Stage 4 scene preview shows only number, heading, slug and opening action. The Stage 4 preview dialog renders each previewed scene's number, header or slug, and opening action (or a 150-character excerpt). It does not show characters, location, or props, which the preview idea names.
- **PK7-FACT-08** Streamline raw uploads are never stored; only routed text enters stage content. Streamline documents are held in multer memory storage and only their extracted text is returned to the browser. The commit payload carries stage transitions, project config, Stage 1 draft, asset drafts, and resolutions, not the source files. Only staged reference images are uploaded to storage.
- **PK7-FACT-09** Unclassified and non-routed intake files drop out at routing and commit. computeStreamlineRouting creates lines and stage transitions only for scripts, treatments, beat sheets, character/location notes and images. Files of any other or unclassified type produce no routing line and are not in the commit payload.
- **PK7-FACT-10** Writing style capsule text is injected only into the treatment, beat and master-script templates. The {writing_style_context} placeholder appears only in the treatment_expansion, beat_extraction and master_script_generation seed templates. No Stage 7 or Stage 9 prompt builder in backend/src references writing capsules.
- **PK7-FACT-11** Stage-specific context assembler has no production callers. ContextManager.prepareStageContext, assembleFullContext and formatPromptGenerationContext have no callers outside tests. formatForInjection is called in production only by the Streamline backfill service.
- **PK7-FACT-12** Ask Auteur has four question categories and two-to-four options. The Ask Auteur question schema allows four categories (contradiction, vague_trait, ambiguous_structure, missing_info) and instructs the model to produce 2-4 options per question. There is no separate conflict-resolution category.
- **PK7-FACT-13** New beats default to 20 seconds and fallback beats to 60 seconds. Adding a beat in the UI assigns estimatedScreenTimeSeconds 20. When the beat-sheet response cannot be parsed, the fallback beat uses 60 seconds. No control exists to change a beat's duration.
- **PK7-FACT-14** Beat-sheet narrative_structure is parsed and stored but never rendered. The beat parser reads narrative_structure from the model output (default '3-act structure') and it is carried in Stage 3 content. No component renders it.

## Archaeology claims that did not hold on re-check

- `WD-IMPL-CAP-0132` says Ask Auteur established facts are injected into later prompts. Only `streamlineBackfillService.ts:62` calls `formatForInjection`; the generic llm route and stage prompts do not include them. Consistent with `WD-IMPL-FACT-0043`, so CAP-0132 overstates reach.
- `WD-IMPL-AI-0023` (V3-AI-11) calls the legacy LLM scene-dependency extraction 'effectively unreachable'. It is reachable when a project has no tiptapDoc (`backend/src/routes/projects.ts:1338-1364`), so it is a live legacy fallback, not unreachable.
- The merged AI-0032 citation for the reconciliation service (`streamlineReconciliationService.ts:187-218`) points past end of file (file is 105 lines); `reconcileDocuments` is at lines 74-105. Beat-sheet `narrativeStructure` parse is at `beatService.ts:422`, not 423.
- `resolveConflict` is flagged as unused in `WD-IMPL-FACT-0048`; PK7 relation I-24 records the same, plus the unit test that exists.

## Concepts that are absent from code (searched, not in archaeology as features)

Story Rules; scene-count inference; audio/transcript intake and audio-driven generation; CineBlock 3D world input; storyboard routing from intake; multi-person photo intake; Ask Auteur re-ask across sessions; the 'Master Document' stage; lore library and retrieval; translation and multi-language; script reader TTS; plot-hole, character-development, structure, and alternative-ending tools; cross-project batch operations; dashboard folders; intake templates and collaborative intake. Each is listed under its cluster in PK7-relations.jsonl with the search terms used.

## Ideas not clustered

None. All 259 ids are in exactly one cluster (143 INPUT, 116 STORY). The two intermediate lists are in /tmp and were not written to reports/.

## Method limits

- All code_evidence paths were checked for existence, and line ranges for validity, by script (199 citations; 3 are path-only). Many citations come from wave-1 and merged ledgers; the decisive claims behind each CONTRADICTED and NOT_IMPLEMENTED call were re-read in code.
- Prompt-level idea statements (verbosity, visual storytelling, dialogue quality) are matched to prompt wording only; output quality is UNKNOWN statically and is not counted as a match.
- Relations use the idea's own wording; where the code took a different but related path, the relation is PARTIAL_MATCH and the note names the difference.
