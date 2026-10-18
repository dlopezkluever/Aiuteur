# V4 — Streamline / Intake System (code archaeology, HEAD of `main`)

Scope: backend `services/streamline*.ts`, `routes/streamline.ts`, `config/streamlineConfig.ts`, `utils/{llmJson,scriptConfidence,resolveConflict}.ts`, `ImageAnalysisService.classifyUploadedImage`; frontend `src/components/pipeline/streamline/*`, `pipeline/shared/EnhancedUploadModal.tsx`, `pipeline/FileStagingArea.tsx`, `pipeline/SkippedStagePlaceholder.tsx`, `lib/services/streamlineService.ts`, `lib/utils/{streamlineConfig,streamlineRouting,scriptConfidence,stageBadge}.ts`, the streamline portion of `Stage1InputMode.tsx`, streamline handlers in `pages/ProjectView.tsx`; migrations 041-044; tests listed in section 11.

## 1. Summary of what exists

Streamline is a fifth Stage-1 input mode (`Stage1InputMode.tsx:80-86`, id `'streamline'`). It lets the user drop up to 10 documents (.txt/.md/.pdf/.docx/.rtf, 20 MB) and up to 20 reference images (PNG/JPEG/WebP, 10 MB). Each document is extracted and classified server-side, one HTTP call per file. The user can override a file's type, choose "as-is" or "AI-format" per treatment/beat-sheet file, and answer AI-generated clarification questions ("Ask Auteur"). The answers are folded back into the document text by an LLM "reconcile" pass. A client-side pure function (`computeStreamlineRouting`) then decides which Phase-A stages get locked with imported content, which get marked `skipped`, and which Stage 5 asset rows get inserted. One "Confirm & Skip Ahead" click sends all of it through a single Postgres RPC (`streamline_commit_atomic`). After the RPC, a separate non-atomic call persists scenes from the script, and the UI jumps to the first unfilled stage. A skipped Stage 2/3 later renders a placeholder offering "Generate this now" (LLM backfill from the locked Stage 4 script) or "Write this myself" (unskip to an empty draft).

No feature flag gates any of this. The only "config" is two constants (`MIN_SCENE_HEADINGS=3`, `MIN_DIALOGUE_LINES=1`), duplicated in `backend/src/config/streamlineConfig.ts:5-6` and `src/lib/utils/streamlineConfig.ts:6-7`. The mode is always offered in the Stage 1 mode grid.

All intake state before commit is React `useState` in `Stage1InputMode`, which makes it transient. Exceptions that persist before commit: images, which are uploaded to Supabase storage the moment they are classified, and LLM calls (tracing/cost only, inside llmClient).

## 2. Complete flow, step by step (UI handler -> service -> route -> backend -> table/provider)

| # | Step | UI handler (file:line) | Frontend service | HTTP route | Backend | Data / provider |
|---|---|---|---|---|---|---|
| 0 | Select mode | mode button `onClick={() => updateField('selectedMode', mode.id)}` `Stage1InputMode.tsx:573` | none (local `content` from `useStageState`, `autoSave:false` `:140-156`) | — | — | React state only |
| 1 | Drop / choose files | `StreamlineDropZone.handleDrop`/`handleFileSelect` `StreamlineDropZone.tsx:196-205` -> `processFiles` `:154-189` (client validation `validateFile` `:81-90`: rejects .doc, unknown types, >20 MB, >10 files) | `streamlineService.extractFile` `streamlineService.ts:153-176` (multipart field `file`) | `POST /api/projects/:projectId/streamline/extract-file` `routes/streamline.ts:196-245` (multer memory, 20 MB `:17-20`; ownership check `projects.user_id`) | `extractText` `streamlineExtractionService.ts:52-81`, then `classifyFile` `streamlineClassificationService.ts:67-75`, then if `character_notes`: `extractStandaloneAssetDraft` `streamlineStandaloneAssetService.ts:19-45` (failure non-fatal `streamline.ts:224-230`) | Libraries: PDF `pdf-parse` v2.4.5 `PDFParse.getText()` `:23-31`; DOCX `mammoth.extractRawText` `:33-36`; RTF `rtf-to-text.stripRtf(buffer utf-8)` `:38-40`; TXT/MD `buffer.toString('utf-8')`. Legacy .doc -> `UnsupportedFileTypeError` -> 400. Nothing persisted. Response `{filename,text,classification,assetDraft?}` |
| 1a | Classification | (server) | — | same call | `detectScriptConfidence` (regex mirror, `backend/src/utils/scriptConfidence.ts:27-64`). If confidence != low -> `{type:'script', confidence: 0.95 (high) or min(0.4+headingScore+dialogueScore,0.75) (ambiguous)}` `streamlineClassificationService.ts:20-28,70-72`. Otherwise one LLM call `classifyProseViaLLM` `:30-60` (AI-01) | LLM failure -> `{type:'unclassified',confidence:0}` |
| 1b | Client post-processing | `extractOne` `StreamlineDropZone.tsx:121-152` | — | — | — | `formatChoice` defaults to `'as-is'` if confidence >= 0.75 else `'ai-format'` (`:128`). AI-format is NOT executed automatically. Status -> `success`/`error`. |
| 2 | Paste text | `addPastedText` `StreamlineDropZone.tsx:253-269` | none | — | — | Creates file with `status:'success'`, `classification:{type:'unclassified',confidence:0}`. Never sent to the server for classification. |
| 3 | Type override | `<select>` -> `setTypeOverride` `:221-223,389-397` | — | — | — | `typeOverride` beats `classification.type` (`effectiveType` `streamlineRouting.ts:31-33`) |
| 4 | Primary / remove | `setPrimary` `:217-219`, `removeFile` `:207-215` | — | — | — | `isPrimary` only feeds the analyze prompt "(PRIMARY)" tag (`streamlineQuestionService.ts:75`); routing ignores it |
| 5 | Retry failed file | `retryFile` `:191-194` | — | — | — | Only shows the toast "Re-select the file to retry". No retry is performed. |
| 6 | AI-format | `setFormatChoice(f,'ai-format')` `:246-251` -> `runAiFormat` `:225-244` (only when no prior formatted result and type is treatment or beat_sheet) | `streamlineService.formatFile` `:182-197` | `POST .../streamline/format-file` `streamline.ts:318-353` (body `{text,targetType}`, targetType must be `treatment` or `beat_sheet`) | `formatAsTreatment` (AI-03) or `formatAsBeatSheet` (AI-04) `streamlineFormattingService.ts:25-70` | Result stored in `file.formattedText` / `file.formattedBeats` (React). Not persisted. |
| 7 | Reference images | `StreamlineImageReviewGrid.processFiles` `StreamlineImageReviewGrid.tsx:66-107` (`Promise.allSettled`, one call per image) | `streamlineService.classifyImage` `:202-225` | `POST .../streamline/classify-image` `streamline.ts:256-308` (multer 10 MB, PNG/JPEG/WebP filter `:24-34`) | Uploads to Supabase storage bucket `asset-images` at `project/{projectId}/streamline-staging/{ts}-{rand}{ext}` (`:276-281`), gets public URL, then `new ImageAnalysisService().classifyUploadedImage(buffer,mime)` (AI-09). Constructor throw or model error -> fallback `{name:'Unnamed subject',type:'character',description:'',confidence:0}` `:290-297` | Storage object PERSISTED immediately, never cleaned up (see 8). Card `{id,imageUrl,name,type,description,accepted:true}` in React. Name is replaced by a fuzzy match against `knownEntityNames` (character-notes draft names) `:25-48,87`. |
| 8 | Edit image cards | name/type/description inputs, accept toggle, remove `:119-125,175-208` | — | — | — | React only |
| 9 | Ask Auteur analysis (automatic) | `StreamlineDropZone` effect fires `onBatchSettled` when files go from in-flight to all settled (`:105-116`) -> `runAskAuteurAnalysis` `Stage1InputMode.tsx:319-337`. Guarded by `askAuteurRequestedRef` (runs once per component mount) and `projectId !== 'new'` | `streamlineService.analyze` `:231-246` (`files:[{id,name,text,isPrimary}]` for success files) | `POST .../streamline/analyze` `streamline.ts:363-390` | `analyzeBatch` `streamlineQuestionService.ts:79-113` (AI-05). Any failure returns `[]`. | Questions held in React state `askAuteurQuestions`. Frontend errors are swallowed (`:332-334`). |
| 10 | Answer questions | `AskAuteurQuestionUI.handleSubmit` `AskAuteurQuestionUI.tsx:56-66` (all questions must be answered `:47-54`) -> `handleAskAuteurSubmit` `Stage1InputMode.tsx:347-406` | `streamlineService.reconcile` `:252-271` | `POST .../streamline/reconcile` `streamline.ts:400-430` | `reconcileDocuments` `streamlineReconciliationService.ts:74-105` (AI-06). Throws on LLM/parse failure -> 500 | Before the call, builds `resolutionsForCommit` (client_id `r{i}`, answer_source `option`/`freetext`) `:357-371`. After it, builds `resolutionEditsForCommit`, ALL attributed to `r0` with `target_type:'stage'` and no `target_stage_number` `:386-394`. Non-cascade docs are applied immediately (`file.text = reconciledText`) `:339-345,396`. Cascade docs wait in `pendingCascade` `:397`. |
| 11 | Decline | "Skip these questions" -> `handleAskAuteurDecline` `:408-424` | — | — | — | Every question becomes a resolution with `selected_answer:null`, `answer_source:'ai_inferred'`. No reconcile call. |
| 12 | Structural cascade dialog | `StructuralCascadeConfirmDialog` `StructuralCascadeConfirmDialog.tsx:22-50`, open when `pendingCascade` is set `Stage1InputMode.tsx:699-704` | — | — | — | Confirm -> `applyReconciledDocuments(pendingCascade)` `:426-429`. Cancel -> drop edits whose `fileId` is in the cascade set; document text untouched `:431-442`. |
| 13 | Review screen | `StreamlineReviewScreen` `StreamlineReviewScreen.tsx:37-116`, shown when there are files/images and no open questions `Stage1InputMode.tsx:682-697` | — | — | — | Routing preview from `computeStreamlineRouting(files, images, projectConfigReady)` `Stage1InputMode.tsx:444-445`. `projectConfigReady` = project type set and tonalPrecision length >= 10. Credit estimate is fixed text, not computed (`streamlineRouting.ts:143-152`). |
| 14 | Confirm & Skip Ahead | `onConfirm` -> `handleStreamlineCommit` `Stage1InputMode.tsx:450-512`. Early return unless `canConfirm`, `projectId!=='new'`, no open questions, no pending cascade (`:451`). | `streamlineService.commit` `:111-126` | `POST .../streamline/commit` `streamline.ts:45-89` (requires `stageTransitions` object; ownership check) | `supabase.rpc('streamline_commit_atomic',{payload})` `:77`. RPC exception -> 400 with the PG message. | See section 4 for the tables written |
| 15 | Scene persistence (post-RPC, non-atomic) | same handler `:487-498` | `scriptService.extractScenes` + `scriptService.persistScenes(projectId, scenes, tiptapDoc)` `scriptService.ts:623-659` | `PUT /api/projects/:id/scenes` `routes/projects.ts:1217-` | `extractManifest(tiptapDoc)` deterministic dependencies (`projects.ts:1301-1336`). Scenes missing from the new extraction are DELETED (`~projects.ts:1419-1440`). | `scenes` table (cross-slice). Runs only if a script file passes FE `detectScriptConfidence != 'low'`. Zero scenes -> throws an error after the RPC has already committed. |
| 16 | Navigate | `onStreamlineComplete(targetStage)` -> `ProjectView.handleStreamlineComplete` `ProjectView.tsx:487-503` | `stageStateService.getStageStates` | `GET /api/projects/:id/stages` (latest per stage) | — | targetStage = 5 if transitions exist for 1-4, else the first of 2,3,4 without a transition, else 2 (`Stage1InputMode.tsx:502-504`). Script route -> 5. Beat-sheet-only -> 4. Treatment-only -> 3. Notes/images-only -> 2. |
| 17 | Skipped stage visit | `ProjectView.tsx:902-965` renders `SkippedStagePlaceholder` when stage status is `skipped` | — | — | — | Buttons: "Generate this now" (stages 2,3; `allowGenerate=false` for 4) and "Write this myself" |
| 18 | Backfill | `handleGenerateFromScript` `ProjectView.tsx:673-688` | `streamlineService.backfillStage` `:132-146` | `POST .../streamline/backfill/:stageNumber` `streamline.ts:99-184` (stage in {2,3}; latest row must be `skipped`) | `streamlineBackfillService.backfillTreatment` (AI-07) / `backfillBeatSheet` (AI-08). Requires a locked Stage 4 with a non-empty `formattedScript`, else `StreamlineBackfillError` -> 400 with `code` | INSERT `stage_states` {version+1, status `locked`, origin `ai-generated`, content, inherited_from_stage_id = skipped row id}. `projects.updated_at` bumped. |
| 19 | Unskip | `handleWriteMyself` `ProjectView.tsx:654-669` | `stageStateService.unlockStage(projectId,n,true)` | `POST /api/projects/:projectId/stages/:n/unlock` (confirm=true) `stageStates.ts:523-672` | Inserts a draft row (content `{}` copied from the skipped row, origin NOT set). Marks every downstream stage <=5 whose latest status is locked or outdated as `outdated` (new rows) `:568-655` | Frontend updates only the unskipped stage's local status (`:659-661`). Downstream outdated rows are not reflected until the stages are reloaded. |

## 3. AI calls (distinct prompts)

All except AI-09 go through `llmClient.generate` (`backend/src/services/llm-client.ts:104`). Provider: Google Gemini via LangChain, with optional LangSmith tracing. Model resolves to `request.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash'` in `generate()` (`:106`). The constructor default is `'gemini-2.5-flash-lite'` (`:76`), which disagrees with that fallback. Retry: maxRetries 3, exponential backoff 1 s to 10 s, on errors classified retryable (`:45-50,214-233`). No streamline caller sets `model`.

| id | callsite | temp / maxTokens | system prompt (excerpt) | user prompt | parse | failure behavior | persistence |
|---|---|---|---|---|---|---|---|
| AI-01 | `streamlineClassificationService.ts:classifyProseViaLLM` (`:30-60`) | 0.2 / 200 | "You are classifying an uploaded document for a film pre-production intake pipeline… exactly one of: treatment / beat_sheet / character_notes / unclassified … Return ONLY a JSON object … {"type":…,"confidence":0.0-1.0}" | `FILENAME: …\n\nDOCUMENT TEXT:\n\n` + first 6000 chars | `extractJsonObject`; invalid type -> unclassified; confidence clamped to [0,1], default 0.5 | catch -> `{unclassified,0}` | none |
| AI-02 | `streamlineStandaloneAssetService.ts:extractStandaloneAssetDraft` (`:19-45`) | 0.3 / 500 | "pre-filling a single film production asset record from a standalone note file … identify the single primary subject … {"name","type":"character"\|"prop"\|"location","description":"2-4 sentence…"}" | filename + first 4000 chars | `extractJsonObject`; invalid type -> character; missing name -> filename without extension | throws; route catches as non-fatal (`streamline.ts:224-230`) | Only if committed as a `project_assets` row (source `extracted`) |
| AI-03 | `streamlineFormattingService.ts:formatAsTreatment` (`:25-37`) | 0.5 / 2048 | "You are a script editor. Reformat the given document into a single cohesive prose treatment (2-4 paragraphs)… do not invent new plot points… plain prose only" | full text, untruncated | `.trim()` | throws -> 500 -> FE toast; `isFormatting` reset | Stage 2 `variations[0].content` on commit |
| AI-04 | `streamlineFormattingService.ts:formatAsBeatSheet` (`:42-70`) | 0.4 / 4096 | "Reformat the given document into a JSON array of structured narrative beats. Ground every beat… [{order,text,rationale,estimatedScreenTimeSeconds}]" | full text | `extractJsonArray` (fence strip + 3 repair strategies, `utils/llmJson.ts:111-129`); uuid ids; total runtime summed | throws -> 500 | Stage 3 `beats` with `narrativeStructure:'derived_from_streamline_intake'` |
| AI-05 | `streamlineQuestionService.ts:analyzeBatch` (`:79-113`) | 0.3 / 2048 | "You are Ask Auteur, a clarification assistant… Four trigger categories: contradiction / vague_trait / ambiguous_structure / missing_info … 2-4 short, concrete options — never yes/no … Return ONLY a JSON array … If nothing rises to the level of a real question, return an empty array []" | per file `--- FILE: name (PRIMARY) ---` + first 4000 chars | `extractJsonArray`; drops invalid categories; ids `q-{i}-{Date.now()}`, options `opt-{i}-{j}`; invalid entity type -> undefined | any error -> `[]` (never blocks) | Questions only reach the DB as `intake_resolutions` at commit |
| AI-06 | `streamlineReconciliationService.ts:reconcileDocuments` (`:74-105`) | 0.2 / 8192 | "You are applying a filmmaker's clarification answers back into the documents… Classify the change's scope: word_patch / paragraph_rewrite / structural_cascade … Emit the FULL revised document text (not a diff)… one-line diff_summary… Do not include documents that need no change" | `Q&A TRANSCRIPT:` (Q/A/about) + `DOCUMENTS:` full untruncated text of every file | `extractJsonArray`; matches by `fileName` (unknown names dropped); invalid scope -> `paragraph_rewrite`; missing summary -> "Updated to reflect your answer." | Empty files or qaPairs -> `[]` with no LLM call. Otherwise errors propagate -> 500 -> FE `streamlineError`; questions stay open | Reconciled text replaces `file.text` in React. `intake_resolution_edits` rows at commit |
| AI-07 | `streamlineBackfillService.ts:backfillTreatment` (`:57-100`) | 0.5 / 2048 | "You are a script analyst. Given a finished screenplay, write a single cohesive prose treatment (2-4 paragraphs)… Do not invent events" | genre, content rating, target length; `formatForInjection` (writing style + ESTABLISHED FACTS) ONLY if `globalContext.writingStyleCapsule` exists (`:61-63`); full `formattedScript` | `.trim()`; variation with `structuralEmphasis:'balanced'`, runtime = midpoint of target lengths | `StreamlineBackfillError` (SCRIPT_NOT_LOCKED / SCRIPT_EMPTY) -> 400; others -> 500 | `stage_states` locked, origin `ai-generated` |
| AI-08 | `streamlineBackfillService.ts:backfillBeatSheet` (`:106-147`) | 0.4 / 4096 | "extract its major structural beats as a JSON array… setup, inciting incident, turns, climax, resolution…" | target length + full screenplay. No style capsule or facts injection. | `extractJsonArray`; uuid ids; `narrativeStructure:'derived_from_script'` | as AI-07 | `stage_states` locked, origin `ai-generated` |
| AI-09 | `imageAnalysisService.ts:classifyUploadedImage` (`:165-201`) | SDK defaults | Direct `@google/generative-ai`, model hard-coded `gemini-2.5-flash`, key `GOOGLE_AI_API_KEY`. Prompt: "You are cataloguing a reference image for film pre-production… return ONLY a JSON object… {name,type,description,confidence}… If the image shows a person, type is "character"…" | inline base64 image + prompt | regex `\{[\s\S]*\}` + `JSON.parse` (no llmJson repair); invalid type -> character | Constructor throws without a key; any error is caught by the route -> fallback guess. Image already stored. | `project_assets.image_key_url` + description on commit if accepted |

Deterministic, no LLM: script detection (backend regex), frontend TipTap parse (`src/lib/utils/scriptConfidence.ts:24-45` via `parseScriptToTiptapJson`), routing, Stage 4 content build (`streamlineRouting.ts:157-165`), scene manifest extraction at PUT /scenes.

## 4. Atomic commit: exactly what is written

Route `streamline.ts:45-89` builds `payload = {project_id, user_id, stage_transitions, project_config?, stage_1_draft?, assets?, resolutions?, resolution_edits?}` and calls `streamline_commit_atomic(payload)` (migration 044 `:38-100`). The backend client uses the service-role key (`config/supabase.ts:10,17`), so RLS is bypassed and the RPC runs with no auth context. Ownership is checked only in Node.

`streamline_commit_atomic` (044) runs these steps in one plpgsql call, so they form one transaction:
1. Resolves `branch_id = projects.active_branch_id`. A null branch raises.
2. `SELECT … FROM stage_states WHERE branch_id AND stage_number 1..5 FOR UPDATE` row lock. It locks only rows that already exist.
3. If `project_config` is present: `UPDATE projects SET project_type, content_rating, genre(text[]), tonal_precision, target_length_min, target_length_max, aspect_ratio, updated_at`, each wrapped in COALESCE with the existing value. Frontend sends minutes*60 (`Stage1InputMode.tsx:456-464`). `writing_style_capsule_id` is NOT included.
4. If `stage_1_draft` is present: INSERT `stage_states` (stage 1, version max+1, status `draft`, origin `COALESCE(origin,'authored')`, content = the full Stage 1 hook `content` object (`Stage1InputMode.tsx:477`), regeneration_guidance '').
5. `RETURN streamline_commit(payload - 'project_config' - 'stage_1_draft')`. This uses the 043 definition (`043:137-460`):
   - The `stage_transitions` loop runs in ascending stage order, 1..5 only.
     - `'skip'`: stage must be in {2,3,4}. Raises if the latest row is `locked`. Raises if stage n-1 is not locked or skipped. INSERT {status `skipped`, origin `skipped`, content `{}`, regen ''}.
     - `'locked'`: raises if no row exists. For n>1, stage n-1 must be locked or skipped. INSERT a copy of the latest content with status `locked`, origin `COALESCE(current_origin,'authored')`.
     - object `{status,content,origin,regenerationGuidance}`: status validated against the enum. If locked and n>1, stage n-1 must be locked or skipped. Origin validated. INSERT with the supplied content. There is NO check that the stage is already locked, so existing locked content is superseded by a new version.
     - Every inserted row has `version = latest+1`, `created_by = user_id`, `inherited_from_stage_id = NULL`.
   - `assets[]`: INSERT `project_assets` {project_id, branch_id, name, asset_type, description, image_key_url, visual_style_capsule_id (FE never sends it), locked FALSE, source (default `streamline_import`; FE sends `streamline_import` for image cards and `extracted` for note drafts, `Stage1InputMode.tsx:466-472`), scene_numbers (FE never sends; `'{}'`)}. No dedupe against existing assets.
   - `resolutions[]`: INSERT `intake_resolutions` {branch_id, question_text, question_category, options jsonb (array of labels), selected_answer, answer_source, subject_entity_type/name, conflicting_sources, created_by}. Builds a client_id -> uuid map.
   - `resolution_edits[]`: resolves `resolution_client_id` through the map (an unknown id raises) and INSERTs `intake_resolution_edits` {resolution_id, target_type, target_stage_number, target_asset_name, edit_scope, diff_summary}. The extra key `fileId` the FE sends is ignored.
   - `UPDATE projects SET updated_at`. Returns `{success, project_id, branch_id, stages[], assets[], resolutions[]}`. The FE type `StreamlineCommitResult` (`streamlineService.ts:18-23`) omits assets and resolutions, and the FE ignores the result.
6. Migration 044 also adds a global BEFORE INSERT trigger `trg_streamline_stage_lock_prerequisite` on `stage_states` (`044:4-36`). Any INSERT with `status='locked'` and `stage_number>1` raises unless stage n-1's latest status is locked or skipped. This applies to every writer of `stage_states`, not only Streamline (cross-slice).

Stage transitions produced by `computeStreamlineRouting` (`streamlineRouting.ts:53-155`):

| Material (first match of each type wins) | 1 | 2 | 3 | 4 | lands on |
|---|---|---|---|---|---|
| usable script (+opt. treatment/beat sheet) | locked | treatment ? locked/imported : skip | beat ? locked/imported : skip | locked/imported `{formattedScript:text, tiptapDoc, scenes:[], syncStatus:'synced'}` | 5 |
| beat sheet, no script | locked | treatment ? locked/imported : skip | locked/imported | — | 4 |
| treatment only | locked | locked/imported | — | — | 3 |
| only notes/images | locked | — | — | — | 2 |
| nothing routable / config incomplete | blocked (`canConfirm:false`) | | | | |

Stage 2 content: `{variations:[{id:'sf-<fileId>', content: formattedText ?? text, structuralEmphasis:'balanced', estimatedRuntimeSeconds:0, createdAt}], activeVariation:0}` (`:167-173`). Stage 3 content: the AI-formatted beats, or one beat holding the raw text with `narrativeStructure:'imported_as_single_beat'` (`:175-190`). No `processedInput` is written into Stage 1 or Stage 2 content.

"Usable script" means `effectiveType==='script'` and either `typeOverride==='script'` or FE `detectScriptConfidence != 'low'` (`:35-42`).

## 5. Existing project content on commit (overwrite / merge / preserve)

- Stage rows are append-only. Every transition INSERTs a new version, and older versions stay as history rows. Latest-version reads (`GET /stages` dedupe, `stageStates.ts:26-34`) mean imported content supersedes any previous locked content for stages 2-4. The only overwrite guard is the skip guard: skip over a locked stage raises and rolls back everything.
- Stage 1: always receives two new rows per commit (a draft, then a locked copy of it). This happens even when Stage 1 was already locked. `Stage1InputMode` puts no lock guard on mode selection (`:573`) or on the Streamline review/confirm UI (`:659-709`). Only the normal "Continue" button is hidden when locked (`:892`).
- `projects` config columns: overwritten when the FE value is non-null (COALESCE).
- `project_assets`: appended. Committing twice inserts duplicates.
- `scenes`: the post-commit `PUT /scenes` matches by slug+number or number, updates matched rows, inserts new ones, and hard-deletes scenes no longer present (cross-slice route).
- Stage 5 and Phase B: the RPC writes nothing and marks nothing `outdated`. There is no downstream invalidation from a commit.
- User-authored content that can be rewritten: (a) uploaded document text is rewritten in memory by AI-06 reconciliation (cascade scope needs confirmation, the other scopes apply silently); (b) AI-format replaces the text used for Stage 2/3; (c) previously locked Stage 2-4 content is superseded.

## 6. Structural cascade confirmation

What it protects against: a reconcile result whose `editScope==='structural_cascade'` (an LLM self-classification meaning a plot or structure change rewrote a larger section) is held in `pendingCascade` rather than being applied to `file.text` (`Stage1InputMode.tsx:379-397`). `StructuralCascadeConfirmDialog` lists each file with its diffSummary. "Apply and continue" writes the LLM's full revised text into the in-memory file text, which is later committed as stage content. "Cancel" (or closing the dialog) keeps the original text and drops those files' `resolution_edits`. The commit button is blocked while the dialog is open (`:451`). The dialog triggers no backend call. It covers only `structural_cascade`. `word_patch` and `paragraph_rewrite` edits also replace full document text, but silently; their only signal is the "N edits applied from your answers" list on the review screen (`StreamlineReviewScreen.tsx:82-94`).

## 7. intake_resolutions (what they are, where they go)

`intake_resolutions` (043 `:19-45`) is the per-branch "facts ledger" of Ask Auteur questions and answers. `answer_source` is one of `option`, `freetext`, `ai_inferred` (decline). The category CHECK also allows `conflict_resolution`, which no code produces. `intake_resolution_edits` (043 `:51-68`) is an audit row per reconciled document. RLS policies are defined (`:74-111`) but the backend uses the service role. Both tables are written ONLY by the commit RPC. They are read only by `ContextManager.fetchAuteurResolutions` (`contextManager.ts:512-529`, ordered by created_at) inside `assembleGlobalContext` (`:181-192`). `formatAuteurResolutions` renders `ESTABLISHED FACTS (do not contradict):\n- {subject}: {selected_answer ?? question_text}` (`:415-421`). For declined rows (selected_answer null), the question text itself is injected as an "established fact".

Where the block actually reaches a prompt:
- `formatForInjection` (`:381-408`): non-test callers are `assembleFullContext` (which has no non-test callers) and `streamlineBackfillService.backfillTreatment`. The latter calls it only when a writing style capsule exists.
- `formatTreatmentContext` / `formatBeatSheetContext` / `formatScriptContext` (`:608-664`): reachable only through `prepareStageContext`, which has no non-test caller (grep of `backend/src`).
- `/api/llm/generate-from-template` (`routes/llm.ts:191-225`) calls `assembleGlobalContext` but injects only the writing style and the beat sheet, not the resolutions.

So the ledger is PERSISTED but its consumption is narrow: only AI-07, and only when a style capsule is set. `resolutions` are never shown in the UI after commit. `resolveConflict` (`utils/resolveConflict.ts`) is used only by its own test.

## 8. Transient vs persisted

| Item | Where | Lifetime |
|---|---|---|
| streamlineFiles (text, classification, override, formatChoice, formattedText/Beats, assetDraft, isPrimary) | `useState` `Stage1InputMode.tsx:301` | Lost on unmount (stage navigation, reload). Never written to stage 1 content. |
| streamlineImages cards | `useState` `:302` | Lost on unmount, but the image bytes are already in storage `asset-images/project/{id}/streamline-staging/*`. No delete path for removed, rejected, or abandoned cards (grep found no delete of `streamline-staging`). |
| askAuteurQuestions, pendingCascade, editSummaries, resolutionsForCommit, resolutionEditsForCommit, askAuteurRequestedRef | `:310-317` | Transient. The ref permits one analysis per mount. |
| Stage 1 form fields (mode, type, rating, genres, length, tonal precision, aspect ratio, writing capsule) | `useStageState` content, autoSave off | Persisted only by the commit (`stage_1_draft`) or by the non-streamline `handleComplete` |
| LLM calls | llmClient (LangSmith trace when enabled) | No app-table persistence |
| Committed result | `stage_states` (1-4), `projects` config, `project_assets`, `intake_resolutions`, `intake_resolution_edits`; then `scenes` | Persisted |

## 9. Failure / retry / refresh behavior

- Extraction: per-file; an error marks only that file `error`. The Retry button is a toast only, so the user must re-select the file. The review screen shows "N file(s) failed … you can still proceed" (`StreamlineReviewScreen.tsx:61-66`). Multer size or filter errors reach Express default handling (no error middleware for multer found in `server.ts` or the route). Tests assert only `status >= 400`, so the exact status is UNKNOWN.
- Classification LLM failure: degrades to `unclassified`. Standalone draft failure: omitted. Image classification failure: fallback guess, upload kept. Image upload failure: 500, toast per image.
- AI-format failure: toast, `isFormatting` reset, `formatChoice` stays `'ai-format'` with no formatted result, so the raw text is used.
- Analyze failure: no questions and no message. Reconcile failure: `streamlineError` shown, questions remain, and the user can resubmit or decline. The commit stays blocked while questions are open.
- Commit RPC failure (any RAISE): whole transaction rolled back -> 400 with the PG message -> `streamlineError`. In-memory state is kept, so the user can retry.
- Post-RPC scene failure (zero scenes or PUT error): the RPC has already committed, `onStreamlineComplete` is NOT called, and the user stays on Stage 1 with an error. Pressing Confirm again re-runs the whole RPC: new stage 1 draft+lock versions, a new stage 4 version, skips allowed again over `skipped`, and assets and resolutions inserted again (duplicates).
- Post-commit refresh failure: toast "Streamline committed, but the pipeline view failed to refresh — try reloading" (`ProjectView.tsx:499-502`).
- Backfill failure: toast with the server message. Unskip failure: toast.
- Browser refresh before commit: all intake work is lost except the orphaned staged images.

## 10. Gating / config flags

No env or feature flag gates Streamline (grep of `streamline` in config found only the two threshold constants). Behavioral gates:
- `projectId === 'new'`: analyze, reconcile, and commit are no-ops (`:320,348,451`). Extract-file and classify-image would 404, because `/projects/new` is reachable only by URL. The `DashboardWrapper.handleNewProject` in `App.tsx` is a TODO.
- `projectConfigReady` (project type + tonal precision of 10 or more characters).
- Open questions or a pending cascade block confirm.
- `isAnalyzing` does NOT block confirm (the guard at `:451` omits it), so a commit can race ahead of question generation.
- Thresholds `MIN_SCENE_HEADINGS=3`, `MIN_DIALOGUE_LINES=1`, defined in both FE and BE.

## 11. Tests

Backend jest (`testMatch` covers `src/tests/**/*.test.ts` and `src/**/__tests__/**/*.test.ts`, `backend/jest.config.js:34-37`):
- `streamlineCommit.test.ts`: commit validation, 404, RPC called as `streamline_commit_atomic`, project_config + stage_1_draft forwarding, RPC error -> 400; backfill rejects stage not in {2,3}, 404, not-skipped. The SQL itself is untested (header says "exercised by the migration itself").
- `streamlineExtractFile.test.ts`: txt, character_notes draft enrichment, draft failure non-fatal, .doc reject, no file, oversized (>=400), 404.
- `streamlineClassifyImage.test.ts`: upload + classify, non-image reject (>=400), fallback guess, 404.
- `streamlineFormatFile.test.ts`, `streamlineFormatting.test.ts`, `streamlineClassification.test.ts`, `streamlineStandaloneAsset.test.ts`, `streamlineQuestion.test.ts`, `streamlineReconciliation.test.ts`, `streamlineAnalyzeReconcileRoutes.test.ts` (LLM mocked).
- `streamlineSkip.test.ts`: `/stages/:n/skip` rules and the lock route accepting a skipped predecessor.
- `utils/__tests__/streamlineExtraction.test.ts`: txt/md/rtf/docx, .doc reject, unsupported, corrupted PDF throws.
- `contextManagerAuteurResolutions.test.ts`: ESTABLISHED FACTS formatting, including the `prepareStageContext` paths that production never reaches.
- `utils/__tests__/resolveConflict.test.ts`: orphan util.
- `src/tests/scriptManifest.smoke.ts` is NOT a jest test (no `.test.ts`). It is a manual `npx tsx` script for `extractManifest` (used by PUT /scenes in step 15); `utils/__tests__/scriptManifest.test.ts` is the jest one (not inspected in detail).

Frontend vitest: `streamline/__tests__/{StreamlineDropZone,StreamlineImageReviewGrid,StreamlineReviewScreen,AskAuteurQuestionUI,StructuralCascadeConfirmDialog}.test.tsx`, `lib/utils/__tests__/streamlineRouting.test.ts` (routing matrix including override-to-script), `pages/__tests__/derivePhaseAStages.test.ts` (skipped counts as passed), `components/pipeline/__tests__/SkippedStagePlaceholder.test.tsx`, `lib/utils/__tests__/stageBadge.test.ts`, `shared/__tests__/EnhancedUploadModal.test.tsx`. No test covers `Stage1InputMode`'s streamline handlers (handleStreamlineCommit, handleAskAuteurSubmit, decline, cascade cancel), the ProjectView backfill/unskip handlers, or the SQL functions and trigger.

E2E (Playwright, needs live servers and a real account): `e2e/enhanced-upload-modal.spec.ts` (Stage 5 and Stage 8 modal) and `e2e/story-context-update.spec.ts` (Stage 8 "Infer from Story", other slice). No e2e covers Streamline intake.

## 12. Shared components in slice

- `EnhancedUploadModal.tsx` (`:80-522`) is a presentational dialog shown after a manual image upload in Stage 5 (`Stage5Assets.tsx:416-452` -> `projectAssetService.uploadImage` then `analyzeImage` -> `/assets/:assetId/analyze-image`) and in Stage 8 (`VisualStateEditorPanel.tsx:811-851`, sceneAssetService). It shows current, extracted, and final descriptions (final defaults to suggestedMerge || extracted) and a confidence badge. Actions Edit Image (instructions), Apply Style, Remove BG (hidden for `location`), and Regenerate (with a "Use as ref" toggle) all call `startEditImageJob` (projectAssetService or sceneAssetService) and poll `getImageJobStatus` every 2 s, up to 90 times (about 3 min). It keeps an in-memory image history carousel. Accept calls `onAccept(finalDescription, currentImageUrl)`: in Stage 5, `handleUpdateDescription` plus selection of the matching attempt (`Stage5Assets.tsx:616-642`). Cancel sets `cancelledRef`, which stops the poll but not the server job. Streamline never opens it (per `StreamlineImageReviewGrid.tsx:50-55`, verified by grep).
- `FileStagingArea.tsx` is used by the non-streamline modes (`Stage1InputMode.tsx:652-655,711-714`). It reads files client-side with `FileReader.readAsText`. PDF gets `content=''` (`:105-108`). It accepts `application/msword` and .docx and reads them as text, which yields binary garbage for docx (UNKNOWN downstream effect; V3). Files are stored in Stage 1 `content.uploadedFiles`, with primary and tag selection. No server extraction.

## 13. Dead / orphaned / duplicated

- `resolveConflict` (`backend/src/utils/resolveConflict.ts`): ORPHANED (test only).
- `stageStateService.skipStage` (`src/lib/services/stageStateService.ts:204-221`): no caller. The `/stages/:n/skip` route is reachable only over raw HTTP.
- `ContextManager.prepareStageContext`, `assembleFullContext`, and `format{Treatment,BeatSheet,Script}Context`: no production caller, so the facts injection there is test-only.
- `streamline_commit` from 041 and 042: superseded in place (CREATE OR REPLACE) by 043, which is called via the 044 wrapper. 043's own project_config and stage_1_draft blocks are never exercised through the wrapper because the wrapper strips them.
- Stage 4 skip: routing never emits `'4':'skip'`, so `SkippedStagePlaceholder` for stage 4 (`ProjectView.tsx:945-954`) is reachable only if such a row exists from raw API use.
- The OUTDATED badge origin subtext (`stageBadge.ts:31-36`) is effectively unreachable: the unlock cascade inserts outdated rows without `origin` (`stageStates.ts:644-653`), and the normal lock route also drops `origin` (`:380-391`).
- `retryFile`: no-op apart from the toast.
- `conflict_resolution` category: allowed by the CHECK constraint, never produced.
- DUPLICATED: script-confidence detector (FE TipTap-parse based vs BE regex mirror; can diverge); thresholds (FE and BE); asset-draft and question types (`streamlineService.ts`, `streamlineRouting.ts`, `StreamlineDropZone.tsx:50`, `AskAuteurQuestionUI.tsx:7-15`); image MIME/size validation (FE grid + BE multer); sequential-lock checks (Node `stageStates.ts` lock/skip, RPC, and the 044 trigger, i.e. three layers).

## 14. Notable behaviors (verified from code)

1. `formatChoice` is never consulted by routing. `buildTreatmentContent` uses `formattedText ?? text` (`streamlineRouting.ts:168`) and `buildBeatSheetContent` uses `formattedBeats` if present (`:176`). Switching back to "As-is" after an AI-format still commits the AI-formatted text. A file defaulted to `'ai-format'` (confidence < 0.75) is never formatted unless the user clicks the button, so its raw text is committed while the UI shows AI-format selected.
2. Reconciliation updates `file.text` only (`Stage1InputMode.tsx:340-343`). If AI-format already ran, the stale `formattedText`/`formattedBeats` is committed and the reconciled edits are lost, yet `intake_resolution_edits` are still written. Character-notes `assetDraft` is computed at extract time and is not re-derived from reconciled text.
3. Override-to-script on a low-confidence file: routing locks Stage 4 (`isUsableScript` honors the override), but the post-commit scene step uses `detectScriptConfidence != 'low'` without the override clause (`:487-488`). Scenes are silently not persisted and the user lands on Stage 5.
4. Ask Auteur runs once per mount and only after an extraction transition. Paste-only batches never trigger it, and files added after the first settle are never analyzed.
5. All `resolution_edits` are attributed to resolution `r0`, `target_type:'stage'`, `target_stage_number` null (`:386-393`).
6. The writing style capsule selected in Stage 1 is stored only in Stage 1 content (`writingStyleCapsuleId`). `projectConfig` omits it and no `processedInput` is written. `ContextManager.fetchProject` reads `project.writing_style_capsule_id || stage1.processedInput.projectParams.writingStyleCapsuleId` (`contextManager.ts:498`). Stage 3 and 4 read it from `stage2.content.processedInput` (`Stage3BeatSheet.tsx:324`, `Stage4MasterScript.tsx:285`). For Streamline projects all of these are absent unless `projects.writing_style_capsule_id` is set elsewhere (UNKNOWN).
7. Imported Stage 2 has no `processedInput`, so Stage 3 forward generation after a treatment-only commit uses hard-coded fallback params (180-300 s, `['Drama']`, "Emotional and contemplative") (`Stage3BeatSheet.tsx:316-321`). Stage 2 generation after a notes/images-only commit throws "No processed input found from Stage 1" (`Stage2Treatment.tsx:172-175`).
8. Unskip ("Write this myself") confirms the unlock, which marks downstream locked or outdated stages `outdated`, e.g. the imported Stage 4 when un-skipping Stage 2. The UI does not refresh those statuses (`ProjectView.tsx:659-661`).
9. Backfill writes the LLM output directly as `locked` (no draft review), does not invalidate later stages, and the AUTO-FILLED tooltip says it "won't update automatically if the script changes later" (`stageBadge.ts:63`).
10. `origin` provenance is lost on any normal lock/unlock cycle: the Node lock and unlock routes do not copy `origin`.

## Cross-slice references

- `backend/migrations/044_streamline_atomic_intake_fix.sql:32-36`: the global BEFORE INSERT trigger enforces lock prerequisites on ALL `stage_states` inserts (DB slice C; any branch-copy or bulk writer is affected).
- `backend/src/routes/stageStates.ts:124-160,230`: the generic PUT stage-state route accepts and validates `origin`. `:344-370`: lock prerequisite accepts `skipped`. `:414-519`: `/skip` route. `:523-672`: unlock with an outdated cascade, also used for skipped rows (Phase-A slice).
- `src/pages/ProjectView.tsx:44-76`: `derivePhaseAStages` treats `skipped` as passed. `:892-965`: placeholder render switch (stage host slice).
- `src/components/pipeline/PhaseTimeline.tsx:29` + `src/lib/utils/stageBadge.ts`: SKIPPED / IMPORTED / AUTO-FILLED badges.
- `backend/src/routes/projects.ts:1217-~1530`: PUT /scenes with deterministic `extractManifest` and hard-delete of removed scenes (scenes slice).
- `backend/src/services/contextManager.ts:181-192,381-421,512-529,608-664`: Ask Auteur facts injection, mostly unreachable (context/LLM slice). `routes/llm.ts:191-225` does not inject facts.
- `backend/src/services/imageAnalysisService.ts:35-116`: `analyzeAssetImage`/`mergeDescriptions` (Stage 5/8 slice) feed `EnhancedUploadModal`.
- `src/components/pipeline/Stage2Treatment.tsx:172-175`, `Stage3BeatSheet.tsx:312-325`, `Stage4MasterScript.tsx:244-286`: dependence on `processedInput` that Streamline never writes (V3 / Phase A).
- `src/App.tsx` `DashboardWrapper.handleNewProject`: TODO / no-op; `src/pages/Index.tsx:21-23` sets `'new'` but Index is not routed in App.tsx.
- `backend/src/services/llm-client.ts:76 vs :106`: default model mismatch (`gemini-2.5-flash-lite` vs `gemini-1.5-flash`).
- `e2e/story-context-update.spec.ts`: Stage 8 "Infer from Story" e2e (Stage 8 slice).

## Contradictions / unknowns

- Comment vs code: `streamline.ts:36-44` says "via the streamline_commit RPC". The code calls `streamline_commit_atomic`.
- Comment `streamlineRouting.ts:44-51` says "Stage 4 stays free of the AI-format choice… only decides routing". In fact routing silently picks formatted text regardless of `formatChoice` (see 14.1).
- `StreamlineDropZone` comment `:41-42` "Per-file as-is vs AI-format choice". The choice flag has no effect on what is committed.
- `stageBadge.ts` doc table says OUTDATED shows the origin subtext. No writer sets origin on outdated rows.
- Migration header 041 lists the payload as Phase 1 only. The actual live function is 043's body via the 044 wrapper. Which migrations are applied in any environment is UNKNOWN (only the DB would settle it).
- Whether `(branch_id, stage_number, version)` is unique, and whether concurrent first-time commits (no rows to lock FOR UPDATE) can collide: UNKNOWN (check base schema / C slice).
- PostgREST `EXECUTE` grants on `streamline_commit`/`streamline_commit_atomic` for `anon`/`authenticated` roles are not set in the migrations. Whether the browser client could call the RPC directly with an arbitrary `project_id`/`user_id` is UNKNOWN (check DB grants).
- Exact HTTP status and body for multer limit/filter errors: UNKNOWN (no error middleware found; tests assert only >=400).
- Whether Stage 5 asset UI correctly handles `project_assets` rows with `source='streamline_import'`, empty `scene_numbers`, and an `image_key_url` pointing at `streamline-staging/` with no attempt rows: UNKNOWN (V5 slice).
- Whether credits/costs are charged for Streamline LLM calls: no credit code in the streamline route or services. llmClient cost accounting is not inspected (UNKNOWN).
- FE vs BE script detectors can disagree (TipTap parse vs regex). The size of that divergence is UNKNOWN without running both on a corpus.
