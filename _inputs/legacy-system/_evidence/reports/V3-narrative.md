# V3 — Writing / Story / Script system (Stages 1-4, Stage 6 Script Hub, scene extraction)

Reporter: V3. HEAD only. Facts from code; comments treated as claims. `file:line` evidence throughout.
Verification runs: I compiled `src/lib/utils/screenplay-converter.ts`, `src/lib/services/scriptService.ts` and `backend/src/utils/scriptManifest.ts` with esbuild into /tmp and executed them on sample screenplays (results quoted in §6/§7). No DB, network, or server was touched.

---

## 0. Executive facts (most load-bearing)

1. **Phase A narrative artifacts (Stage 1 input, Stage 2 treatment, Stage 3 beats, Stage 4 script) live only in `stage_states.content` JSONB**, one row per save (append-only versions keyed `(branch_id, stage_number, version)`). They are **not** in `text_field_versions` (that table is limited by CHECK to `frame_prompt|video_prompt|end_frame_prompt|description_override`, `backend/migrations/036_text_field_versions.sql:7-9`). Project-level config is written to `projects` columns. Scenes live in the `scenes` table, written only by `PUT /api/projects/:id/scenes`.
2. **Every autosave inserts a new `stage_states` row**; `useStageState` autosaves ~1 s after the stage *loads* (not only after edits) for Stages 2/3, and Stage 4's editor fires a debounced `save({status:'draft'})` ~2 s after it hydrates. Backend preserves `locked` when a draft save hits a locked row but turns `outdated` into `draft` (`backend/src/routes/stageStates.ts:211-222`). So merely opening an outdated Stage 2/3/4 converts it to `draft` (inferred from code; runtime UNKNOWN).
3. **Locked Stage 2 and Stage 3 stay editable**. Stage 2's "Generate New Variation", variation switching and Edit Mode, and all of Stage 3's beat editing, reordering, add/delete and brainstorm stay active while locked. Autosave then writes new rows that keep `status='locked'`. Locked content is changed without an unlock and without downstream invalidation (§5).
4. **Scene re-parse is positional.** `PUT /scenes` matches existing rows by `slug:scene_number` and falls back to **`scene_number` only**. The slug embeds the scene number (`int-kitchen-day-3`), so inserting, deleting or reordering a scene re-points every later scene's ID (and its shots, frames, videos, asset instances, stage_locks, deferral) at different narrative content. Unmatched trailing rows are **hard-DELETEd**, which CASCADEs through shots, frames, video jobs and scene_asset_instances. Matched rows get only `slug`, `script_excerpt` and dependency fields updated. `status`, `stage_locks` and `shot_list_locked_at` are never touched, so editing a scene's text invalidates nothing (§6).
5. **The TipTap round-trip loses information and is not idempotent** (executed). Dialogue lines are merged into one line. `tiptapJsonToPlainText` puts blank lines between character, parenthetical and dialogue, and re-parsing that output turns the dialogue into `action` nodes. `formattedScript` in Stage 4 content, and therefore `scenes.script_excerpt`, always holds the normalized output, never the raw AI or user text (§7).
6. **Dependency extraction and scene splitting use two different parsers.** The manifest (from tiptapDoc, backend) and `extractScenes` (from plain text, frontend) count scene headings differently. Dependencies are joined by `sceneNumber`, so they can land on the wrong scene. Executed example: frontend found 2 scenes, the manifest found 4 (§6.4).
7. **Regeneration guidance is likely silently dropped.** Stages 2, 3 and 4 send `regeneration_guidance`, but none of the seeded templates contain `{regeneration_guidance}`. The interpolator only replaces placeholders that exist, so full-regenerate is effectively a re-roll with no guidance. This holds if the live DB templates match the seed. The `beat_sheet_reference` variable injected for stage>=4 is not in the template either (`backend/scripts/seed-templates.ts`, `backend/src/routes/llm.ts:218-221`).
8. **`storyContextService` reads non-existent content keys** (`content.treatmentProse` on Stage 3; `content.treatments`/`selectedTreatmentId` on Stage 2). The real shapes are `treatmentSource.content` and `variations[activeVariation].content`, so `treatmentSection` is always `''` (`backend/src/services/storyContextService.ts:94-126` vs `src/components/pipeline/Stage2Treatment.tsx:26-33`, `Stage3BeatSheet.tsx:46-57`, `src/lib/utils/streamlineRouting.ts:166-172`).
9. **Ask Auteur "established facts"**: `contextManager.assembleGlobalContext` loads them, but `/api/llm/generate-from-template` (the only Stage 2/3/4 generation path) never puts them into the prompt. The only production consumer is streamline backfill, and only when a writing style capsule exists (`backend/src/services/streamlineBackfillService.ts:61-63`).
10. **"Script Skip" input mode has no special behavior.** It flows through `treatment_expansion` like the other modes; the UI text claims "parse it directly and skip to the Master Script" (`src/lib/services/inputProcessingService.ts:174-175`, only references are UI strings). The "Video for Audio" project type sends `'audio-visual'`, which the backend rejects (`'audio_visual'` expected), so Stage 1 Continue fails silently (`src/types/project.ts:31`, `backend/src/routes/projects.ts:683-686`).

---

## 1. Files inspected (slice)

Frontend: `src/components/pipeline/{Stage1InputMode(925),Stage2Treatment(888),Stage3BeatSheet(933),Stage4MasterScript(1265),Stage6ScriptHub(646),ScreenplayToolbar(86),VersionedTextarea(283),ContentAccessCarousel(1335; lines 1-420, 985-1145 read, rest grepped)}.tsx`, `src/lib/tiptap-extensions/*` (all), `src/lib/utils/{screenplay-converter,scriptConfidence}.ts`, `src/lib/services/{treatmentService,beatService,scriptService,inputProcessingService,sceneService,textFieldVersionService}.ts`, `src/types/scene.ts` (skimmed). Support files read for tracing: `src/lib/hooks/useStageState.ts`, `src/lib/services/stageStateService.ts`, `src/pages/ProjectView.tsx:440-975`, `src/components/pipeline/{LockedStageHeader,FileStagingArea}.tsx` (partial), `src/lib/utils/streamlineRouting.ts:155-175`.
Backend: `services/{storyContextService,contextManager,sceneDependencyExtraction,textFieldVersionService,streamlineBackfillService}.ts`, `utils/{scriptManifest,scriptConfidence,resolveConflict}.ts`, `utils/llmJson.ts` (structure only), `routes/projects.ts:1013-1533` (+ `:640-800` project PUT validation, `:1711-1775` consumer), `routes/llm.ts` (full), `routes/stageStates.ts:120-670`, `scripts/seed-templates.ts`, migrations 001/003/011/014/027/036 + FK grep.
Tests: `backend/src/tests/{storyContextService,contextManagerAuteurResolutions,textFieldVersionService}.test.ts`, `scriptManifest.smoke.ts`, `backend/src/utils/__tests__/{scriptManifest,resolveConflict,llmJson}.test.ts` (names only for the latter two), frontend `__tests__` for VersionedTextarea, textFieldVersionService, scriptService, screenplay-converter, scriptConfidence (test names).

---

## 2. Artifact map: where each narrative artifact lives

| Artifact | Storage | Shape / keys | Created by | AI-generated by | Manual edit | Versioned | Approved/locked | Overwritten by |
|---|---|---|---|---|---|---|---|---|
| Project config (type, rating, genre[], tonal_precision, target_length_min/max s, aspect_ratio) | `projects` columns (`001_initial_schema.sql:11-16`; aspect_ratio later) | — | Stage 1 Continue → `projectService.updateProject` → `PUT /api/projects/:id` (`projects.ts:640-800`); streamline commit RPC (V4) | no | Stage 1 form only | no (single row) | no | each Stage 1 Continue; streamline commit (`043/044` RPC `COALESCE`) |
| Writing style capsule id | `stage_states(1).content.writingStyleCapsuleId` and `.processedInput.projectParams.writingStyleCapsuleId`; `projects.writing_style_capsule_id` exists (`004_style_capsule_system.sql:62`) but Stage 1 never writes it | uuid | Stage 1 | — | Stage 1 selector | via stage_states rows | with Stage 1 | Stage 1 Continue |
| Source material / idea ("input") | `stage_states(stage 1).content`: `ideaText`, `uploadedFiles[]` (full text content embedded), `processedInput{mode, primaryContent, contextFiles[], projectParams}` | `Stage1InputMode.tsx:122-134`, `inputProcessingService.ts:4-21` | Stage 1 Continue: `stageStateService.saveStageState(...,1,{content, status:'draft'})` then lock (`Stage1InputMode.tsx:278-291`, `ProjectView.tsx:446-449`) | no | textarea (expansion) / FileStagingArea | stage_states row per save | lock route copies content (`stageStates.ts:380-391`) | re-Continue; streamline commit `stage1Draft` (V4) |
| Story idea / logline | **No dedicated field.** Expansion mode's `ideaText` == `processedInput.primaryContent`. Project title is set to `"${mode} Project - date"` only in the `projectId==='new'` path (`Stage1InputMode.tsx:209-211`), which is unreachable via router (§12) | — | — | — | — | — | — | — |
| Treatment | `stage_states(2).content.variations[] {id, content, structuralEmphasis, estimatedRuntimeSeconds, createdAt}`, `activeVariation`, `processedInput` (copy of Stage 1's at generation time), `langsmithTraceId`, `promptTemplateVersion` (`Stage2Treatment.tsx:26-33`, `treatmentService.ts:5-11`) | — | auto on mount when `variations.length===0` (`Stage2Treatment.tsx:121-149`) | `treatment_expansion` template (AI-01) | textarea in Edit Mode, persisted only via "Save Changes" (`:400-416`) | stage_states row per autosave | Approve & Continue → `handleStageComplete(2)` → lock | Generate New Variation, Full Regenerate, section edits, streamline treatment import, streamline backfill |
| Beat sheet | `stage_states(3).content.beats[] {id, order, text, rationale, estimatedScreenTimeSeconds, originalTreatmentExcerpt?, isExpanded}`, `totalEstimatedRuntime`, `narrativeStructure`, `treatmentSource{content, variantId}` (snapshot) (`Stage3BeatSheet.tsx:46-57`) | — | auto on mount when `beats.length===0` (`:273-284`) | `beat_extraction` (AI-04) | inline textarea, drag reorder, add, delete (min 3) | stage_states row per autosave | Confirm & Lock (`:502-515`) | Regenerate All, brainstorm select, streamline import/backfill |
| Master script | `stage_states(4).content.formattedScript` (plain text, **normalized**), `tiptapDoc` (TipTap JSON, canonical for editor), `scenes[]` (in-memory extraction copy, ids `scene-N-<ts>`), `syncStatus` (always `'synced'`; `'out_of_date_with_beats'` never set), `beatSheetSource{beats, stageId}`, trace ids (`Stage4MasterScript.tsx:49-61`) | — | auto on first visit when no script and deps loaded (`:354-373`) | `master_script_generation` (AI-07) | TipTap editor + ScreenplayToolbar | stage_states row per 2 s debounced save (`:157-171`) | Approve Script (`:641-687`) persists scenes, then locks | Regenerate, section edits, streamline script import; every editor update normalizes `formattedScript` |
| Scenes | `scenes` table: `id, branch_id, scene_number (UNIQUE per branch), slug, script_excerpt, status, end_state_summary, end_frame_id, expected_characters[], expected_location, expected_props[], dependencies_extracted_at, shot_list_locked_at, end_frame_thumbnail_url, is_deferred, stage_locks(jsonb, quickies-sql)` (`003:5-34`, `011`, `013`, `014`, `027`) | — | `PUT /api/projects/:id/scenes` from Stage 4 approve or streamline commit | deps: deterministic manifest; LLM fallback effectively dead | none in this slice (no scene text editor in Phase B) | no history; rows updated in place | scene stage locks are V-other | every Stage 4 approve / streamline commit (§6) |

Phase A version history UI: none. ProjectHeader "Version History" and "Create Branch" only show "coming soon" toasts (`ProjectView.tsx:857-859, 879-881`).

---

## 3. Per-stage call chains (UI → service → route → backend → table/provider)

### Stage 1 (manual modes: expansion / condensation / transformation / script-skip; streamline = V4)
- Form state: `useStageState({stageNumber:1, autoSave:false})` (`Stage1InputMode.tsx:140-156`). The form is not persisted until Continue. On load, existing `stage_states(1).content` hydrates the form.
- Continue gate `canProceed`: mode, project type, tonal ≥10 chars, and either files or (expansion && idea ≥20) (`:175-176`). Then `inputProcessingService.validateInput`; failures only reach `console.error`, with no UI message (`:196-200`).
- Continue (`handleComplete`, `:180-298`) runs these hops:
  1. `projectService.updateProject(projectId, {project_type, content_rating, genre, tonal_precision, target_length_min/max (min×60), aspect_ratio})` → `PUT /api/projects/:id` → validation `projects.ts:683-730` → `projects` UPDATE.
  2. `inputProcessingService.processInput` (pure). Expansion: primary = ideaText and all files become context. Other modes: primary = `isPrimary` file, the rest become context (`inputProcessingService.ts:39-103`).
  3. `stageStateService.saveStageState(project.id,1,{content:{...content, processedInput}, status:'draft'})` → `PUT /api/projects/:id/stages/1` → INSERT `stage_states` (`stageStates.ts:120-294`).
  4. `cancelAutoSave`.
  5. `onComplete` → `ProjectView.handleStageComplete(1)` → `POST /stages/1/lock` → INSERT a locked copy (`stageStates.ts:297-412`) → navigate to Stage 2.
- File reading (`FileStagingArea.tsx:92-113`): FileReader `readAsText` for txt/md/doc/docx/rtf. **PDF resolves `''`**, so a PDF primary file fails validation ("Primary file content could not be read") with console output only. `.doc/.docx` are read as text (binary content). Max 10 files of 10 MB.
- `'audio-visual'` project type → backend 400 → caught → `console.error` only (`Stage1InputMode.tsx:292-294`).
- `script-skip`: identical path to the others; goes to Stage 2 treatment generation with `input_mode:'script-skip'`.
- While Stage 1 is locked/outdated the form controls stay interactive but the Continue button is hidden (`:892`), and with autoSave off the edits are ephemeral. "Unlock & Edit" → `handlePhaseAUnlock(1)` (V2).
- Streamline (V4) cross-hop in my area: after commit, if a script file has non-low confidence, `scriptService.extractScenes(rawText)` then `persistScenes(projectId, scenes, detectScriptConfidence(rawText).tiptapDoc)` (`:487-498`); throws if 0 scenes.

### Stage 2 Treatment
- Load: `useStageState({stageNumber:2, autoSave:true})`. If no variations, `generateInitialTreatments` (`:151-230`):
  1. GET `/stages/1` for `processedInput`.
  2. `treatmentService.generateTreatments` → GET `/stages/2` (for `stageStateId` metadata).
  3. POST `/api/llm/generate-from-template` `{templateName:'treatment_expansion', variables:{input_mode, primary_content, context_files (joined "name (tag):\ncontent" with `---`), target_length_min/max, project_type, content_rating, genres (joined), tonal_precision, writing_style_context:'', writing_style_capsule_id}, metadata:{projectId, branchId:'main', stage:2, stageStateId, inputMode}}` (`treatmentService.ts:55-101`).
  4. `llm.ts:139-315`: `prompt_templates` active by name, then `validateVariables` (missing variables → 400), then `ContextManager.assembleGlobalContext` (writing capsule → `writing_style_context`), then `interpolateTemplate`, then `llmClient.generate` (Gemini via `@langchain/google-genai`, model `GEMINI_MODEL || 'gemini-1.5-flash'`, temperature 0.7, maxOutputTokens 4096 default; `llm-client.ts:106, 133-138`).
  5. Frontend `parseTreatmentResponse` (`treatmentService.ts:351-456`): strip fences, `JSON.parse`, `treatments[].prose|content|text`. On parse failure: split on `/(?:TREATMENT|VARIATION)\s*[123]/i`; if fewer than 3 parts, a single variation containing the raw text. If JSON has no `treatments`, a single variation containing `JSON.stringify(parsed)`.
  6. `setStageContent` → autosave 1 s → PUT `/stages/2` with `_styleCapsuleMetadata` split out → `style_capsule_applications` INSERT (`stageStates.ts:259-281`).
- **Generate New Variation** (`:534-547`) calls `generateInitialTreatments`. It replaces all variations (no confirm) and re-reads the *current* Stage 1 `processedInput`. It is the only Stage 2 action that picks up later Stage 1 edits.
- **Full Regenerate** (dialog, guidance ≥10 chars; `:348-398`): `treatmentService.regenerateTreatments` sends the same template plus `regeneration_guidance`, using **Stage 2's stored `processedInput` copy** (stale relative to later Stage 1 edits). Replaces all variations and resets `activeVariation=0`. The dialog says guidance "will be saved as the commit message for this version", but nothing is saved: `regeneration_guidance` on stage_states is always `''` from these saves (`stageStateService.ts:111-116`).
- **Edit Selection** (Edit Mode textarea selection, `:258-346`): with count 1, `treatmentService.regenerateSection` → POST `/api/llm/generate` (frontend-authored prompt, AI-02) and the reply is spliced into `editableContent` by character offsets. With count 3, `regenerateSectionAlternatives` (AI-03) and the user clicks one to splice. Neither persists until **Save Changes** (`handleSaveChanges` writes `variations[active].content`).
- **Approve & Continue** (`:504-512`) calls `onComplete` directly. Unsaved `editableContent` is **discarded** (no save, no prompt). The lock copies the last DB row.
- "Sync with Beat Sheet" button: `isOutdated` is never set to true, so the button never renders (DEAD). `mockTreatments` const is unused (DEAD).

### Stage 3 Beat Sheet
- Load: autosave on. If `beats.length===0`, `generateInitialBeats` (`:286-364`): GET `/stages/2`, then `selectedTreatment = variations[activeVariation||0]`, then `beatService.generateBeats` → GET `/stages/3`, then POST `generate-from-template` `{templateName:'beat_extraction', variables:{treatment_prose, selected_variant_id, target_length_min/max, genres, tonal_precision, writing_style_context:'', writing_style_capsule_id}}` (`beatService.ts:55-83`). Params come from `stage2.content.processedInput.projectParams`, else a hardcoded `{180,300,['Drama'],'Emotional and contemplative'}`. Parse (`:303-441`): JSON `beats[]`. Fallback: numbered/`Beat N` lines. Last resort: one beat holding the whole text. `beat.id` takes the LLM `beat_id` if present.
- Edits: textarea per beat (`onContentChange`), dnd-kit reorder (renumbers `order`), add after (placeholder text "New beat - describe what happens here..."), delete (blocked below 3 beats). All write `stage_states` through autosave.
- **Brainstorm** (`:455-493`): `beatService.brainstormBeatAlternatives` → `/api/llm/generate` (AI-05). Picking an alternative replaces only `beat.text`.
- **Regenerate All** (`:517-573`): `beatService.regenerateBeats` with `stageContent.treatmentSource` (the snapshot from first generation, **not the current Stage 2**) and **hardcoded** `projectParams {180,300,['Drama'],'Emotional and contemplative'}` (`:539-544`, marked TODO) plus `regeneration_guidance` (AI-06). Replaces all beats. Drops `_styleCapsuleMetadata`.
- **Confirm & Lock** (`:502-515`): checks every beat ≥10 chars and ≥3 beats, shows a success toast *before* calling `onComplete` → lock (toast fires even if the lock then fails).
- `beatService.splitBeat` (`:246-298`, AI-x) has no callers (DEAD).
- `originalTreatmentExcerpt` is never populated by any parser, so "View original treatment context" never renders (practically dead).

### Stage 4 Master Script
- `useStageState({stageNumber:4, autoSave:false})` plus its own 2 s debounce inside editor `onUpdate` (`:145-172`).
- Editor: `useEditor` with StarterKit, Placeholder, SceneHeading, Action, Transition, DialogueLine, DialogueLineDecorations (`:120-178`). `editable: !isStageLockedOrOutdated` is evaluated at creation only. `useEditor` has no deps, and TipTap React 3.15.3 preserves `isEditable` on re-render (`node_modules/@tiptap/react/src/useEditor.ts:235-242`). So editability does not follow later status changes, e.g. after Unlock & Edit without a remount (runtime UNKNOWN).
- Dependency load on every mount (`:228-306`):
  1. GET `/stages/3` → `beatSheetSource = latest stage 3 row (any status)`.
  2. GET `/stages/2` (writingStyleCapsuleId).
  3. GET `/api/projects/:id` → `projectParams {targetLength.min/max || 180/300, contentRating || 'PG-13', genres, tonalPrecision, writingStyleCapsuleId}`.
- Hydration sync effect (`:188-216`): if `tiptapDoc` is present → `editor.commands.setContent(tiptapDoc)`; else if only `formattedScript` → `parseScriptToTiptapJson(formattedScript)`. TipTap v3 `setContent` defaults `emitUpdate=true` (`node_modules/@tiptap/core/src/commands/setContent.ts:51`), so hydration fires `onUpdate`. That sets `formattedScript = tiptapJsonToPlainText(doc)` and `scenes = extractScenes(...)`, then **saves after 2 s** (a new stage_states version on every visit, `status:'draft'` requested).
- **Auto-generate / Generate Master Script** (`:309-373`): `scriptService.generateScript` → GET `/stages/4`, then POST `generate-from-template` `{templateName:'master_script_generation', variables:{beat_sheet_content (formatted "Beat N: text\nRationale..\nEstimated screen time.."), target_length_min/max, content_rating, genres, tonal_precision, writing_style_context:'', writing_style_capsule_id}, metadata:{stage:4,...}}` (`scriptService.ts:65-129`) (AI-07). `parseScriptResponse` (`:474-548`): if the response is JSON, use `formatted_script|formattedScript|script` and `scenes`; else the whole text after `stripHtmlTags`, with scenes from `extractScenes`. Then `parseScriptToTiptapJson`, `setStageContent` and editor sync. The emitted update normalizes the text and persists it.
- **Regenerate** (guidance ≥10; `:376-423`): same template plus `regeneration_guidance` (AI-08). Replaces the entire script/tiptapDoc with no extra confirmation beyond the guidance dialog; manual edits are lost (only earlier `stage_states` rows retain them, and no UI exposes those).
- **Edit Selection** (`:426-489`): selection text plus 500 chars before/after via `doc.textBetween`. Count 1: `scriptService.regenerateSection` (AI-09) → `/api/llm/generate` → strip fences → `editor.chain().deleteRange().insertContent(string)`. Count 3: `regenerateSectionAlternatives` (AI-10) → JSON array → click → `insertContent`. How `insertContent` structures a multi-line plain string inside a block node is UNKNOWN (needs runtime). Newlines inside one node would later be re-split by `extractScenes` but not by the manifest.
- **Preview Scenes** (`:494-538`): `sceneService.previewScenes(plainText)` (in-memory `extractScenes`) → dialog. It also writes `content.scenes` into local state (persisted only by the next editor-triggered save).
- **Approve Script** (`:641-687`):
  1. `plainText = tiptapJsonToPlainText(editor.getJSON())`.
  2. `extractScenes`; reject if 0 scenes or any scene has empty content (content always includes the heading line, so the empty check is effectively unreachable).
  3. If DB Stage 4 is `locked` and any scene status is in {shot_list_ready, frames_locked, video_complete}, show the "Downstream Impact Warning" dialog. When Stage 4 is locked the header with this button is not rendered, so this branch is reachable only if UI status ≠ DB status (practically DEAD/UNKNOWN).
  4. `proceedWithApproval`: `scriptService.persistScenes(projectId, scenes, editor.getJSON())` → `PUT /api/projects/:id/scenes` (§6), then `stageStateService.lockStage(4)`, then `onComplete` → `handleStageComplete(4)` → **`lockStage(4)` again** (two locked versions per approve).
  - Non-atomic. If stage 3 is not locked/skipped, the lock fails after the scenes were already rewritten.
  - The lock copies the last *saved* row. Edits made within 2 s of approving are in the scenes table but not in the locked content. Unmount clears the pending debounce timer (`:219-225`), so those edits never reach stage_states.
- Beat Alignment panel: `handleBeatClick` scrolls to `beatIndex × (lines/beats)`, a proportional guess with no real beat-to-script mapping (`:690-717`).
- Locked view: toolbar hidden (`:871`), editor non-editable if mounted locked, header buttons replaced by LockedStageHeader.

### Stage 6 Script Hub
- `Stage6ScriptHub` takes projectId from `useParams` (`:56`). On mount: `sceneService.fetchScenes` → GET `/api/projects/:id/scenes` (`projects.ts:1013-1132`), plus `projectAssetService.listAssets` and `checkoutService.getBatchRenderStatus` polled every 10 s (`:115-130`).
- GET scenes reads the scenes columns (`:1040-1044`) and the stage_states(1-4) rows (all versions, `:1052-1056`). It derives `header` (first non-empty line) and `openingAction` (lines 2-6), sets `shots:[]` always, and computes `continuityRisk` with `ContinuityRiskAnalyzer`. Rule 3 compares max `stage_states.created_at` for stages 1-4 with `scene.updated_at`, so the load-time autosaves from §0.2 can flip risk to `broken` (cross-slice). It also returns `priorSceneEndState` and `isDeferred`.
- Displayed dependencies are **filtered to names matching existing project assets** (case-insensitive) (`:463-473`). Unmatched extracted names are hidden, shown as "None".
- Defer/Restore: `sceneService.deferScene/restoreScene` → `PUT /scenes/:sceneId/defer|restore` (`projects.ts:1134-1214`) → `scenes.is_deferred` toggled. No other side effects. "Enter Scene Pipeline" is disabled for deferred scenes. Deferral is keyed to the row id, which the positional re-parse re-points (§6).
- Outdated modal: shown when `scene.status==='outdated'`. No code in the repo ever writes `scenes.status='outdated'` or `'continuity_broken'` (grep over backend/src), so it is effectively DEAD.
- `ContentAccessCarousel` rendered with `stageNumber=6` (`:527-534`).
- "Narrative & Style Engine" button → `onBack` → stage 5.

---

## 4. Persistence and versioning mechanics (stage_states)

- PUT `/stages/:n` **always INSERTs** `version = latest+1` (`stageStates.ts:188-249`). There is no update-in-place. Status = request status or `'draft'`; if the latest row is `locked` and the request is `draft`, the new row keeps `locked` (`:211-222`). `outdated`→`draft` is not guarded. `origin` is null unless provided. `regeneration_guidance` comes from the request (always `''` from this slice's callers). `inherited_from_stage_id` = previous id.
- Autosave (`stageStateService.ts:230-262`): 1 s debounce per `projectId-stage`. The `useStageState` effect (`useStageState.ts:100-143`) depends on `[content, isLoading,...]`. The isLoading true→false transition after loading triggers a save of the loaded or initial content. The cleanup cancels the pending save on unmount, so edits made <1 s before navigating away are lost.
- `_styleCapsuleMetadata` stays in React state and is stripped only from the request copy (`stageStateService.ts:104-109`). Every subsequent autosave re-sends it, so `style_capsule_applications` gets one INSERT per autosave (duplication; inferred).
- Lock (`:297-412`) INSERTs a copy of the latest content with `status:'locked'`. It requires the previous stage to be `locked|skipped`. It does not copy `origin`.
- Unlock (`:523-667`): impact phase (409 with downstream list), then confirm: INSERT `draft` copy plus INSERT `outdated` copies for downstream stages ≤5 that are `locked|outdated`. **Scenes are not touched.** Unlock rejects stages not `locked|skipped`, so "Edit" on an `outdated` Stage returns 400 (`:564-566`) (V2's area).
- Readers pick "latest version" (any status) or "latest locked" depending on the caller. contextManager, storyContextService, shot extract and streamline backfill read **latest `status='locked'`** (`contextManager.ts:534-567`, `storyContextService.ts:66-109`, `projects.ts:1744-1765`, `streamlineBackfillService.ts:29-49`). Frontend stages read latest of any status.

---

## 5. User-authored text: every preserve/transform/replace/regenerate/overwrite/parse/normalize path

| # | Text | Path | Effect | Evidence |
|---|---|---|---|---|
| U1 | Stage 1 idea / tonal / files | Continue | **preserved** verbatim in `stage_states(1).content` + `processedInput` (copy) | `Stage1InputMode.tsx:268-281` |
| U2 | Stage 1 uploaded file | FileReader | **transformed**: PDF → `''`; docx read as text (binary garbage) | `FileStagingArea.tsx:105-111` |
| U3 | Stage 1 edits while locked | form | **discarded** (no save path) | `:140-143,892` |
| U4 | tonal_precision, genres, rating, length | Continue | **overwrites** `projects` columns | `:225-233` |
| U5 | Stage 2 treatment edits | Edit Mode textarea | **transient** until "Save Changes"; **discarded** by Approve, variation switch (confirm), or Generate New Variation | `Stage2Treatment.tsx:253-256,400-416,504-512` |
| U6 | Stage 2 selection | Edit Selection ×1/×3 | **replaced** span by AI text (offset splice) | `:299-301,335-337` |
| U7 | All 3 variations incl. saved edits | Generate New Variation | **regenerated/replaced**, no confirm, also when locked | `:534-547,198-205` |
| U8 | All variations | Full Regenerate | **regenerated/replaced**, activeVariation→0; guidance likely ignored by template | `:365-378` |
| U9 | Locked Stage 2 | autosave after variation switch / regenerate | **overwrites** locked content (new row stays `locked`) | `stageStates.ts:211-222` |
| U10 | Stage 2 treatment (when Stage 2 skipped) | streamline backfill ("Generate this now") | **generated** from locked script and locked (V4) | `ProjectView.tsx:673-688`, `streamlineBackfillService.ts:57-100` |
| U11 | Beat text | inline edit/add/delete/reorder | **preserved** via autosave; **renumbered** `order` | `Stage3BeatSheet.tsx:366-446` |
| U12 | Single beat | brainstorm pick | **replaced** text only | `:476-493` |
| U13 | All beats | Regenerate All | **regenerated/replaced** from stale `treatmentSource` with hardcoded params | `:534-562` |
| U14 | Locked Stage 3 | any beat edit | **overwrites** locked content (new locked row), no downstream invalidation | `:733` (disabled only by generating flags) |
| U15 | Stage 2 edits after Stage 3 exists | — | **not propagated**: Stage 3 never regenerates automatically (only when beats empty); Regenerate All uses old snapshot | `:273-284,523-538` |
| U16 | Stage 3 edits after Stage 4 exists | Stage 4 mount | beat **panel** refreshes to latest Stage 3; script not regenerated; `syncStatus` never set to out-of-date | `Stage4MasterScript.tsx:291-297` |
| U17 | Script (AI or typed) | every editor update / hydration | **normalized**: `formattedScript = tiptapJsonToPlainText(doc)`; headings and transitions uppercased; dialogue merged to one line; blank-line separation | `:145-155`, `screenplay-converter.ts:164-232` |
| U18 | Script imported as plain text (legacy rows without tiptapDoc, streamline) | `parseScriptToTiptapJson` | **parsed** into nodes. Multi-line dialogue joined with spaces; `FADE IN:` becomes `action`; any line starting `INT.`/`EXT.` (case-insensitive) becomes `sceneHeading`; character detection heuristic `CHARACTER_RE`; leading `>` stripped; HTML tags stripped | `screenplay-converter.ts:19-157` |
| U19 | Script | Regenerate | **replaced** entirely | `Stage4MasterScript.tsx:393-412` |
| U20 | Script selection | Edit Selection | **replaced** span; structure of inserted multi-line text UNKNOWN | `:450,482` |
| U21 | Script AI output | `parseScriptResponse` | **stripHtmlTags** (removes anything `<...>`), fence strip; if JSON, uses `formatted_script` | `scriptService.ts:487-524` |
| U22 | Script edits <2 s before Approve / navigation | debounce cleared on unmount | **lost** from stage_states (present in scenes if approved) | `:157-171,219-225` |
| U23 | Scene text | Approve → PUT scenes | `scenes.script_excerpt` **overwritten** with normalized plain text slice (heading + following lines, trimmed) | `projects.ts:1444-1474` |
| U24 | Scene identity / downstream work | re-approve with inserted/removed/reordered scenes | **re-pointed** by scene_number; trailing rows **deleted** with cascade (§6) | `projects.ts:1378-1442` |
| U25 | Lines before first scene heading (e.g. `FADE IN:`, title) | extractScenes | **dropped** from all scenes | `scriptService.ts:409-447` |
| U26 | Text in an unrecognized heading (`INT./EXT.`, `I/E`, `EXT.HOUSE`, heading with unknown time token is fine) | extractScenes | **merged** into previous scene's excerpt | executed §6.4 |
| U27 | Scene deps | every PUT | `expected_characters/props` **overwritten**; `expected_location` overwritten only if non-empty (stale kept otherwise) | `projects.ts:1452-1463` |
| U28 | Stage 1 config changes after Stage 2 exists | Full Regenerate | **ignored** (uses Stage 2's stored processedInput); Generate New Variation does pick them up | `Stage2Treatment.tsx:354-369` vs `:159` |

No path performs a three-way merge, diff or confirmation of user edits before AI replacement, except Stage 2's `confirm()` on variation switch with unsaved changes (`:233-235`).

---

## 6. Screenplay → scenes: parsing, IDs, dependencies, idempotency (rigorous)

### 6.1 Frontend splitter `scriptService.extractScenes(plainText)` (`scriptService.ts:401-469`)
- Heading regex (per trimmed line): `/^(INT\.|EXT\.)\s+(.+?)(?:\s*-\s*(DAY|NIGHT|CONTINUOUS|LATER|MOMENTS LATER|DAWN|DUSK|MORNING|AFTERNOON|EVENING))?$/i` (`:378`). `INT./EXT.`, `I/E.`, `INT.HOUSE` (no space) and `EST.` are **not** headings. Lowercase `int. barn` is.
- Scene content = the heading line plus all following raw lines up to the next heading, `.join('\n').trim()`. Lines before the first heading are discarded.
- `sceneNumber` = 1-based sequence. `slug = ${int|ext}-${sanitizedLocation}[-${timeOfDay}]-${sceneNumber}` (`:576-605`). Location sanitize: lowercase, strip `[^a-z0-9\s-]`, spaces→`-`. Unknown suffixes such as `(FLASHBACK)` stay in the location slug.
- `id = scene-${n}-${Date.now()}` (transient; never sent to the backend).
- Request body to backend: `{scenes:[{sceneNumber, slug, scriptExcerpt}], tiptapDoc}` (`:630-640`).

### 6.2 Backend `PUT /api/projects/:id/scenes` (`projects.ts:1216-1529`)
1. Ownership check; requires `active_branch_id`.
2. Load existing scenes on branch `(id, scene_number, slug, status)` (`:1248-1251`).
3. Maps: `existingSceneMap[slug:number]` and `existingByNumber[number]` (`:1259-1265`).
4. Dependencies (`:1293-1364`):
   - If `tiptapDoc`: `extractManifest(tiptapDoc)`, then for each manifest scene find the input scene with the **same `sceneNumber`** and set its deps. Input scenes not matched get empty deps.
   - If the manifest throws, fall through. LLM fallback only if `dependenciesMap.size===0`, i.e. no tiptapDoc, a manifest exception, or zero input scenes. Both in-repo callers always send tiptapDoc, so `sceneDependencyExtractionService` is effectively unreachable (deprecated per its own header).
5. Per input scene (`:1367-1417`): primary match `slug:number`, else fallback **match by `scene_number` alone** (logs "Slug mismatch"). Matched → `scenesToUpdate {id, slug, script_excerpt, deps}`. Unmatched → `scenesToInsert {branch_id, scene_number, slug, script_excerpt, status:'draft', deps}`.
6. Existing rows not matched → **`DELETE ... WHERE id IN (...)`** (`:1420-1442`). A delete error is logged and processing continues.
7. UPDATE each matched row: `slug`, `script_excerpt`, plus `expected_characters` / `expected_props` if truthy (empty arrays are truthy → overwritten), `expected_location` only if a non-empty string, `dependencies_extracted_at` (`:1445-1474`). Trigger `scenes_updated_at` bumps `updated_at`. Trigger `trg_sync_scene_lock_status` is unaffected since `shot_list_locked_at` is unchanged (`014:32-61`).
8. INSERT new rows (`:1478-1499`).
9. Response `{success, sceneCount, scenes, idMapping, deletedScenesCount}`. The frontend ignores the body (`scriptService.ts:653-658`).
- No transaction. Steps 6→7→8 are sequential round trips; a mid-failure (e.g. UPDATE error returns 500 at `:1470-1473`) leaves deletes applied and later updates/inserts not applied.
- **Never written by this route**: `status`, `stage_locks`, `shot_list_locked_at`, `end_state_summary`, `end_frame_id`, `end_frame_thumbnail_url`, `is_deferred`, `scene_number` of matched rows.

### 6.3 Consequences on re-save/re-approve (derived from 6.1 + 6.2 + FKs)
FKs with `ON DELETE CASCADE` to `scenes(id)`: `shots` (`006:7`), `scene_asset_instances` (`015:15`), `image_generation_jobs` (`007:13`), `video_generation_jobs` (`021:10`), `scene_asset_suggestions` (`024:6`), `transformation_events` (`030:17`), `039:88`. Via `shots(id)` CASCADE: `frames` (`019:8`), `video_generation_jobs` (`021:11`), `shot_asset_assignments` (`033:11`), `image_generation_jobs` (`007:14`), `transformation_events.trigger_shot_id` (`030:20`), `039:89`.

| Scenario | IDs | Content | Downstream (shots/frames/videos/assets/locks/status) |
|---|---|---|---|
| Identical re-approve | all preserved (slug:number match) | same excerpt (already normalized) | untouched; `updated_at` and `dependencies_extracted_at` bumped |
| Edit text inside scene k | preserved | excerpt k replaced | **untouched**: no invalidation, no status change, stage_locks unchanged |
| Change heading of scene k | preserved via number fallback | slug + excerpt replaced | untouched |
| Insert scene at position k (N→N+1) | rows 1..N keep ids by **number**; one new row N+1 inserted (`draft`) | row k now holds the *inserted* scene; row k+1 holds old scene k; … row N holds old N-1; new row holds old N | every row ≥k keeps shots/frames/videos/asset instances/stage_locks/is_deferred/end_state built for **different** content. Old scene N's work is attached to old N-1's text; the new row (old N's text) starts empty |
| Delete scene k (N→N-1) | rows 1..N-1 matched by number; **row N deleted** | rows ≥k shift up by one | **old scene N's** shots, frames, videos, asset instances are CASCADE-deleted, not deleted scene k's. Deleted scene k's work stays attached to old k+1's text |
| Reorder scenes | by number | content permuted across ids | production work stays with positions, not stories |
| Delete all but one heading | rows 2..N deleted | — | cascade of all but row 1 |
| Script with 0 headings | blocked client-side ("No scenes found") | — | — |

The Stage 4 warning dialog text "Deleted scenes will be marked as `continuity_broken`" and "IDs preserved where possible" (`Stage4MasterScript.tsx:1232-1235`) is **CONTRADICTED** by the hard delete at `projects.ts:1431-1434`. The dialog is also practically unreachable (§3 Stage 4).

### 6.4 Dependency extraction `extractManifest(tiptapDoc)` (`backend/src/utils/scriptManifest.ts`)
- Scenes: every `sceneHeading` node starts a scene (any text, including a non-INT/EXT line converted via the toolbar). `intExt` from `/^(INT|EXT)\.?\s+/i`, default `'INT'`. `timeOfDay` from a fixed suffix list. Location = remainder (`:111-151`).
- Characters: `dialogueLine` nodes parsed at the first `:` → base name with parentheticals stripped, upper-cased key (`:74-105,157-186`). Characters are also added to a scene's list when an `action` node contains the key as a substring (`:192-208,316-321`; substring match, so `AL` would match `ALICE`).
- Props: CAPS runs `/\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g` in action nodes, minus an ignore set and known character keys (`:214-270`). Scene props = props whose lowercase key appears as a substring in that scene's action text (`:323-327`).
- **Parser mismatch, executed** with the script `INT. KITCHEN - DAY / INT./EXT. CAR - NIGHT / EXT.HOUSE - DAY / int. barn - dawn`:
  - frontend `extractScenes` → `[1 int-kitchen-day-1 (11 lines, absorbs CAR and HOUSE), 2 int-barn-dawn-2]`
  - `extractManifest` → `[1 KITCHEN, 2 'INT./EXT. CAR', 3 'EXT.HOUSE' (props ['HOUSE']), 4 barn]`
  - PUT joins by sceneNumber, so input scene 2 (barn) receives manifest scene 2's (CAR) deps.
- Streamline path: `extractScenes(rawText)` + `tiptapDoc = parseScriptToTiptapJson(rawText)` (`Stage1InputMode.tsx:490-497`). The same mismatch class applies.
- Legacy LLM path `SceneDependencyExtractionService.extractDependencies` (AI-11): first 20 lines, 15 s race timeout, temperature 0.3, maxTokens 500. On failure: empty chars/props and a regex location.

### 6.5 Other scene-heading parsers (DUPLICATED, mutually inconsistent)
`scriptService.parseSceneHeading` (`scriptService.ts:375-396`); `screenplay-converter SCENE_HEADING_RE` (`:19`); backend `utils/scriptConfidence.ts:17` (mirror of the frontend counting rule, not of the TipTap parse); `scriptManifest.extractScenes` (`:111-151`); `ContentAccessCarousel.parseScriptLines` (`:204-259`, also accepts `INT/EXT.` and `I/E.`, and treats any ALL-CAPS line as a character); `contextManager.fetchMasterScriptSummary` (`:555-603`); duplicate summary in `projects.ts:1756-1775` (shots/extract); `sceneDependencyExtraction.parseLocationFromHeading` (`:124-141`); GET scenes header/openingAction (`projects.ts:1060-1070`); `sceneService.previewScenes` (`sceneService.ts:151-175`). Plus deprecated `tiptapToPlainText` / `plainTextToTiptap` (`screenplay-converter.ts:246-329`, no callers, DEAD).

---

## 7. TipTap editor and round-trip

- Node schema: custom block nodes `sceneHeading`, `action`, `transition`, `dialogueLine` (all `content:'text*'`, `group:'block'`), plus StarterKit `paragraph`/headings/lists etc. (`src/lib/tiptap-extensions/*.ts`). `Character`, `Dialogue`, `Parenthetical` extensions exist but are **not exported from index.ts and not registered** (ORPHANED).
- Dialogue model: one `dialogueLine` node with inline text `NAME (EXT): (paren) "dialogue"`. `DialogueLineDecorations` adds inline decorations `dialogue-char` / `dialogue-paren` / `dialogue-text` by parsing the colon and quotes on every doc change (`DialogueLineDecorations.ts:8-118`). Styling lives in `src/styles/screenplay.css` (imported in `main.tsx:4`).
- Toolbar (`ScreenplayToolbar.tsx`): `setNode(sceneHeading|action|dialogueLine|transition)`. On an empty line Dialogue inserts the template `CHARACTER: "Dialogue"`. Shortcuts Mod-Shift-H/D/T (`SceneHeading.ts`, `DialogueLine.ts`, `Transition.ts`). There is no Character/Parenthetical button. The toolbar does not validate that a heading starts with INT/EXT.
- Plain→JSON `parseScriptToTiptapJson` (state machine IDLE/ACTION/CHARACTER/DIALOGUE, `screenplay-converter.ts:66-157`): blank line flushes dialogue; `^(INT\.|EXT\.)`i → sceneHeading; `^(FADE\s+(IN|OUT)\.?|.*TO:)\s*$`i → transition (so `FADE IN:` with colon is an **action**); `CHARACTER_RE` and length<60 → character; `(..)` after a character → parenthetical; following lines → dialogue (joined by space); otherwise action.
- JSON→plain `tiptapJsonToPlainText` (`:164-232`): heading/transition uppercased; dialogueLine split at the first `:` into `NAME`, `(paren)`, and dialogue (outer quotes stripped); parts joined with `'\n'` after each ends with `'\n'`, producing a blank line between every element including character→dialogue; `\n{3,}`→`\n\n`; trim.
- **Executed round-trip** (input: `JOHN (V.O.)\n(quietly)\nI never wanted this.\nNot like this.`):
  - pass 1 → `dialogueLine "JOHN (V.O.): (quietly) \"I never wanted this. Not like this.\""` → text `JOHN (V.O.)\n\n(quietly)\n\nI never wanted this. Not like this.`
  - pass 2 parse of that text → `dialogueLine "JOHN (V.O.):"`, `action "(quietly)"`, `action "I never wanted this. Not like this."`.
  - So plain text produced by the serializer is not re-parseable into the same structure. Where it is re-parsed:
    - Stage 4's legacy branch (rows with `formattedScript` but no `tiptapDoc`, `Stage4MasterScript.tsx:203-212`).
    - Any consumer that re-parses `script_excerpt` or `formattedScript`. ContentAccessCarousel's own line classifier would label `(quietly)` as a parenthetical and the dialogue as dialogue, so it is tolerant.
  - Stage 4 itself prefers `tiptapDoc`, so the editor content is stable across reloads. The persisted `formattedScript` and `script_excerpt` are the lossy form.
- Tests: `screenplay-converter.test.ts` (23 its) covers single-pass parse and "Round-trip fidelity" only for headings, action and character names (`:180-200`). There is no test for dialogue round-trip or double round-trip.

---

## 8. AI affordances and prompt-building paths (narrative-side view; E owns registry)

Provider for all: `llmClient.generate` (Gemini via `ChatGoogleGenerativeAI`, model `request.model || GEMINI_MODEL || 'gemini-1.5-flash'`, default temperature 0.7, maxOutputTokens 4096, `executeWithRetry`; `backend/src/services/llm-client.ts:103-138`). No caller in this slice passes `model`/`maxTokens` except AI-11/12/13/14/15. Templates come from the `prompt_templates` table. Seed content is in `backend/scripts/seed-templates.ts` and `backend/src/routes/seed.ts` (POST `/api/seed`). The live DB template text is UNKNOWN (settle by querying `prompt_templates where is_active`).

| id | Trigger (UI) | Callsite | Endpoint / template | Context inputs | Output parse | Persistence |
|---|---|---|---|---|---|---|
| AI-01 | Stage 2 mount (no variations) / "Generate New Variation" / "Generate Treatments" / Full Regenerate | `src/lib/services/treatmentService.ts:generateTreatments` & `:regenerateTreatments` | `/api/llm/generate-from-template` `treatment_expansion` v1.0.0 (system: "narrative expansion specialist … exactly 3 distinct treatment variations … 800-1200 words … Return JSON {treatments:[{variant_id, prose, structural_emphasis, estimated_runtime_seconds}]}") | Stage 1 processedInput (mode, primary, context files, params), writing capsule (server-injected via `assembleGlobalContext`) | `parseTreatmentResponse` fallbacks | stage_states(2) via autosave |
| AI-02 | Stage 2 Edit Selection ×1 | `treatmentService.ts:regenerateSection` | `/api/llm/generate` frontend-authored system "You are a narrative editor…" and user "FULL TREATMENT CONTEXT … SELECTED TEXT … USER GUIDANCE" | full treatment text, selection, guidance (default "Rewrite this section") | raw `content` string | local until Save Changes |
| AI-03 | Stage 2 Edit Selection ×3 | `treatmentService.ts:regenerateSectionAlternatives` | `/api/llm/generate` "generate exactly 3 alternative rewrites … JSON array" | same | `parseAlternatives` (JSON, `alternatives`, numbered split, single) | local |
| AI-04 | Stage 3 mount (no beats) / "Generate Beat Sheet" | `beatService.ts:generateBeats` | `beat_extraction` ("narrative structure analyst … 15-30 beats … JSON {beats:[{beat_id, order, text, rationale, estimated_screen_time_seconds}], total_estimated_runtime, narrative_structure}") | active Stage 2 variation prose, variant id, Stage 2 processedInput params or hardcoded defaults | `parseBeatsResponse` | stage_states(3) |
| AI-05 | Stage 3 brainstorm (Sparkles) | `beatService.ts:brainstormBeatAlternatives` | `/api/llm/generate` "brainstorm alternative versions of a specific story beat … exactly 3 … JSON array of {text}" | the beat and ALL beats as "SURROUNDING CONTEXT", optional guidance | `parseAlternativesResponse` (JSON, header split, fallback original beat) | replaces beat.text on pick |
| AI-06 | Stage 3 Regenerate All | `beatService.ts:regenerateBeats` | `beat_extraction` + `regeneration_guidance` (no placeholder) + client-computed `writing_style_context` (overwritten server-side) | **stale** `treatmentSource`, **hardcoded** params | same | stage_states(3) |
| AI-07 | Stage 4 auto/Generate | `scriptService.ts:generateScript` | `master_script_generation` ("screenplay formatting specialist … VISUAL VERBOSITY … Return ONLY the formatted screenplay text"); server also adds `beat_sheet_reference` (stage≥4) with no placeholder | `beatSheetSource.beats` (latest Stage 3 row), project params from `projects` | `parseScriptResponse` (JSON or plain; stripHtmlTags) → `parseScriptToTiptapJson` | stage_states(4) after editor round-trip |
| AI-08 | Stage 4 Regenerate | `scriptService.ts:regenerateScript` | same + `regeneration_guidance` | same | same | same |
| AI-09 | Stage 4 Edit Selection ×1 | `scriptService.ts:regenerateSection` | `/api/llm/generate` "screenplay editor … rewrite only the highlighted section … Return ONLY the rewritten section" | 500 chars before/after, selection, request | fence strip | editor insertContent → debounce save |
| AI-10 | Stage 4 Edit Selection ×3 | `scriptService.ts:regenerateSectionAlternatives` | `/api/llm/generate` "exactly 3 alternative rewrites … JSON array" | same | `parseAlternatives` | editor on pick |
| AI-11 | (effectively unreachable) PUT scenes without tiptapDoc | `backend/src/services/sceneDependencyExtraction.ts:extractWithLLM` | system "script analysis assistant … characters/location/props JSON" | heading, first 20 lines | fence strip + JSON.parse | scenes.expected_* |
| AI-12 | Stage 8 "Infer from Story" (V-other UI) | `backend/src/services/storyContextService.ts:callInferenceLLM` (route `sceneAssets.ts:2253-2254`) | system "visual continuity specialist…"; user `buildInferencePrompt` (asset + script excerpt + all beats + treatment[≤2000, always empty, §0.8] + shot list) temp 0.3, 2048 | scenes.script_excerpt, latest locked Stage 3 beats, shots | regex `{...}` + JSON.parse | returned to client (suggestion) |
| AI-13 | Stage 8 bulk update (≤4 assets) | `storyContextService.ts:callBulkInferenceLLM` (`sceneAssets.ts:2315-2316`) | batch prompt, temp 0.3, 4096 | same | `results[]` | returned |
| AI-14 | Skipped Stage 2 → "Generate this now" | `streamlineBackfillService.ts:backfillTreatment` | "script analyst … single cohesive prose treatment (2-4 paragraphs)" temp 0.5, 2048 | locked Stage 4 `formattedScript` (normalized), genres, rating, length, style (+facts) only if writing capsule | trim | locked stage 2 (V4 route) |
| AI-15 | Skipped Stage 3 → "Generate this now" | `streamlineBackfillService.ts:backfillBeatSheet` | "extract its major structural beats as a JSON array" temp 0.4, 4096 | locked script, length | `extractJsonArray` | locked stage 3 |
| AI-16 | DEAD | `beatService.ts:splitBeat` | `/api/llm/generate` "split a single story beat into 2-3" | — | numbered lines | none |

Notes:
- `/api/llm/generate` accepts arbitrary `systemPrompt`/`userPrompt` from any authenticated client (`llm.ts:64-133`), so prompts for AI-02/03/05/09/10/16 live in frontend code.
- 4096 default output tokens vs. 3×800-1200-word treatments (≈4-6k tokens): truncation is plausible, and truncated JSON falls into the text-split fallback (runtime UNKNOWN).
- `metadata.branchId:'main'` is resolved to `project.active_branch_id` (`contextManager.ts:114`). `fetchProject` also requires an `is_main` branch to exist and reads Stage 1 from that branch, not the active one (`:465-484`).

---

## 9. ContentAccessCarousel

What it is: a read-only, collapsible, drag-resizable bottom panel with Embla carousel tabs (`ContentAccessCarousel.tsx:1-10, 988-1335`). Tabs:
- **Script**: all scenes' `scriptExcerpt` from `sceneService.fetchScenes` (react-query key `['scenes', projectId]`, staleTime 60 s). Sorted by sceneNumber and parsed with its own `parseScriptLines` classifier. The current scene is highlighted, other scenes are faded by distance (`getSceneOpacity`), with auto-scroll to the current scene.
- **Stills**: for every *other* scene, `frameService.fetchFrames`; start/end frame images with continuity de-dupe (`:103-158`).
- **Clips**: `checkoutService.getVideoJobs` completed jobs for other scenes (`:160-191`).
- **Shots**: `shotService.fetchShots(projectId, sceneId)` (only `stageNumber>=8`).

Default scene for stills/clips at stage≥7 is the nearest prior scene (`:265-284`). Panel height and active tab are kept in module-level variables (session-only, reset on reload, `:95-97`). There are no mutation calls (imports are fetch-only).

Render sites: `Stage6ScriptHub.tsx:528` (stageNumber 6), `Stage7ShotList.tsx:921`, `Stage8VisualDefinition.tsx:773`, `Stage9PromptSegmentation.tsx:443`, `Stage10FrameGeneration.tsx:891`, `Stage11Confirmation.tsx:164`, `Stage12VideoGeneration.tsx:243`. Status: IMPLEMENTED / REACHABLE (Stage 6 confirmed; others per import + JSX grep).

---

## 10. contextManager and storyContextService: what they assemble and who consumes

### ContextManager (`backend/src/services/contextManager.ts`)
- `assembleGlobalContext(projectId, branchId|'main', userId)` (`:102-202`):
  - `projectParams`: `projects` columns first, else Stage 1 `processedInput.projectParams` from the **is_main** branch's latest Stage 1 row (any status), else defaults 180/300/'narrative'/'PG-13'.
  - Writing and visual style capsules by id.
  - `beatSheet` = latest **locked** Stage 3 `content.beats`.
  - `masterScriptSummary` = headings + first non-ALLCAPS line (≤100 chars) from latest **locked** Stage 4 `formattedScript`.
  - `auteurResolutions` = `intake_resolutions` rows for the branch.
  - Any failure inside → `ContextManagerError`.
- `assembleLocalContext(sceneId)` (`:208-269`): scene `script_excerpt`, `end_state_summary` (labelled `previousSceneEndState` but it is the scene's *own* end state), scene_asset_instances + project_asset. **No production callers.**
- `prepareStageContext`, `assembleFullContext`, `formatPromptGenerationContext`: **no production callers** (tests only for prepareStageContext/formatForInjection).

Consumers (production):
- `backend/src/routes/llm.ts:192-231`: `/generate-from-template` (Stages 2/3/4 generation, AI-01/04/06/07/08). It uses only `writingStyleCapsule` (→ `writing_style_context`) and `beatSheet` (→ `beat_sheet_reference`, stage≥4). If assembly throws, `writing_style_context=''` and the request continues.
- `backend/src/services/streamlineBackfillService.ts:59-63,108`: AI-14/15. Uses `projectParams`; `formatForInjection` (style + auteur facts) only when a writing capsule exists.
- `backend/src/routes/projects.ts:3753-3755`: only `estimateContextSize` (token estimate).

### StoryContextService (`backend/src/services/storyContextService.ts`)
- `assembleSceneStoryContext(sceneId, branchId)` (`:52-146`): `scenes.script_excerpt`; all beats (`Beat N: text`) from latest locked Stage 3; `treatmentSection` from non-existent keys, always `''` (§0.8); shots `(shot_id, action, dialogue, setting, camera, characters_foreground)` ordered by `shot_order`.
- Consumers: `backend/src/routes/sceneAssets.ts:2253-2254` (`inferAssetContext`) and `:2315-2316` (`bulkInferAssetContext`), feeding Stage 8 "Infer from Story" / "Bulk Update from Context" (frontend side: `sceneAssetService.inferContext`, test `src/lib/services/__tests__/sceneAssetService.inferContext.test.ts`; e2e `e2e/story-context-update.spec.ts`). Output is suggestions only; acceptance is V-other.

### Other direct narrative readers (not via these services)
- `projects.ts:1711-1775` POST `/scenes/:sceneId/shots/extract`: locked Stage 3 beats + its own copy of the master-script summary logic (DUPLICATED).
- `projectAssets.ts:93-100,185-200` and `assetExtractionService.ts:71-73,277-295`: Stage 4 `formattedScript`/`tiptapDoc` → `extractManifest` fallback.
- `frames.ts:259-265` queries `stage_states.state_data` with `project_id`, columns that do not exist in `stage_states` (V-other; always null).
- `sceneAssetRelevanceService.ts:115-198` and `transformationEventService.ts:349-486`: `script_excerpt`.

---

## 11. VersionedTextarea and text_field_versions

- `VersionedTextarea` (`src/components/pipeline/VersionedTextarea.tsx`): controlled textarea with version arrows (newest-first list, displayed as v1=oldest), optional lock toggle, and a Save button when `value !== selectedVersion.content`. Save → `createVersion(value,'user_save')`. Arrows → `selectVersion(id)` then `onVersionChange(content)`. Uses react-query `queryKey` with staleTime 30 s. Render sites: `Stage8/VisualStateEditorPanel.tsx:562`, `Stage9PromptSegmentation.tsx:816,897`, `Stage10FrameGeneration.tsx:1509,1554,1576,1599,1647`. **It is not used by any narrative Stage 1-4 component.**
- Frontend client (`src/lib/services/textFieldVersionService.ts`): shot fields → `/api/projects/:p/scenes/:s/shots/:shot/field-versions/:field[/:vid/select]` (`frames.ts:2293-2410`). Asset `description_override` → `/scenes/:s/assets/:instanceId/field-versions/description_override` (`sceneAssets.ts:2108-2215`).
- Backend service (`backend/src/services/textFieldVersionService.ts`):
  - `MAX_VERSIONS=8`. `createVersion`: cap check, which deletes the oldest non-selected row if count≥8 *before* inserting; next version_number; deselect all; insert selected; **write back** to `shots.<field>` or `scene_asset_instances.description_override` (`:62-104,226-241`). The write-back error is only logged.
  - `selectVersion`: deselect, select, write back.
  - `backfillIfNeeded`: lazily creates v1 `source:'ai_generation'` from the current column on GET.
  - Not transactional. The partial unique index `(entity_id, field_name) WHERE is_selected` (`036:17-19`) would reject a concurrent double-select.
  - RLS policy `USING (true)` for all (`036:28-33`); ownership is checked only at the API layer.
  - AI writers: `frames.ts:646` (end_frame_prompt), `projects.ts:3872-3880` (frame/video prompts).

---

## 12. Dead / orphaned / duplicated / half-wired

- DEAD: `mockTreatments` (`Stage2Treatment.tsx:36-78`); Stage 2 "Sync with Beat Sheet" (`isOutdated` never true, `:107,467`); Stage 3 "Sync with Script" (`:260,621`); `beatService.splitBeat`/`parseSplitBeatsResponse`; `sceneService.getScene` (throws), `sceneService.updateSceneStatus` (calls non-existent `/api/scenes/:id/status`, no callers); `tiptapToPlainText`, `plainTextToTiptap`; `syncStatus:'out_of_date_with_beats'` never assigned; `originalTreatmentExcerpt` never populated; `scenes.status` 'outdated'/'continuity_broken' never written (so the Stage 6 outdated modal is unreachable); contextManager `assembleLocalContext`/`prepareStageContext`/`assembleFullContext`/`formatPromptGenerationContext` (tests only); LLM dependency fallback (§6.2).
- ORPHANED: tiptap `Character`, `Dialogue`, `Parenthetical` extensions; `backend/src/utils/resolveConflict.ts` (no non-test importer; tested by `resolveConflict.test.ts`); `src/pages/Index.tsx` (not routed in `App.tsx`), which makes Stage 1's `projectId==='new'` create-project branch unreachable via routes (Dashboard creates the project first via `NewProjectDialog`).
- DUPLICATED: scene-heading parsers (§6.5); master-script summary (`contextManager.ts:555-603` ≈ `projects.ts:1756-1775`); `parseAlternatives` identical in treatmentService and scriptService; script-confidence rule in frontend and backend (by design, comment `backend/src/utils/scriptConfidence.ts:1-8`); beat formatting (`scriptService.formatBeatSheetForPrompt` ≈ `contextManager.formatBeatSheet`); double `lockStage(4)` per approve.
- Half-wired: regeneration guidance (no placeholder); `beat_sheet_reference` (no placeholder); auteur facts not in template path; storyContext treatment lookup; Stage 3 regenerate hardcoded params; `writing_style_capsule_id` project column never written by Stage 1.

---

## 13. Tests touching this slice

| Test | Asserts | Imports real code? |
|---|---|---|
| `src/lib/utils/__tests__/screenplay-converter.test.ts` (23) | stripHtml, parse headings/action/dialogue/parenthetical/transition/multi-line dialogue, serializer uppercase, round-trip for headings/action/character names | yes |
| `src/lib/utils/__tests__/scriptConfidence.test.ts` (4) | high/ambiguous/low + tiptapDoc returned | yes |
| `src/lib/services/__tests__/scriptService.test.ts` (11) | `extractScenes` slug format, MOMENTS LATER, uniqueness via number, sanitization, sequential numbering | yes |
| `src/lib/services/__tests__/textFieldVersionService.test.ts` (11) | client URLs/mapping via MSW | yes |
| `src/components/pipeline/__tests__/VersionedTextarea.test.tsx` (19) | render, nav, save, lock | yes |
| `backend/src/utils/__tests__/scriptManifest.test.ts` (25) | getNodeText, parseDialogueLine, extractManifest scenes/chars/props/locations/compound headings | yes |
| `backend/src/tests/scriptManifest.smoke.ts` | manual tsx smoke (not matched by jest `testMatch` `*.test.ts`) | yes (not run by jest) |
| `backend/src/tests/contextManagerAuteurResolutions.test.ts` (7) | formatAuteurResolutions, formatForInjection, prepareStageContext 2/3/4 include facts | yes (pure methods) |
| `backend/src/tests/storyContextService.test.ts` | parse + shot formatting, **on local copies of the logic** (file comment `:10-12`) | **no** |
| `backend/src/tests/textFieldVersionService.test.ts` | constants/mapping/cap logic **re-declared locally** | **no** |
| `backend/src/utils/__tests__/resolveConflict.test.ts` (8), `llmJson.test.ts` (12) | tiers / JSON repair | yes |

No tests for: Stage 1-4 components, treatmentService/beatService parsing, `PUT/GET /scenes`, defer/restore, stage_states versioning interplay with narrative stages, double round-trip, manifest-vs-extractScenes numbering.

---

## 14. Cross-slice references

- `backend/src/routes/stageStates.ts:211-222`: `outdated` is not protected from `draft` overwrite (V2 state machine).
- `backend/src/routes/stageStates.ts:564-566`: unlock rejects `outdated` stages, while LockedStageHeader offers "Edit" on outdated (`LockedStageHeader.tsx:117-122`) (V2).
- `backend/src/routes/stageStates.ts:380-391`: lock does not copy `origin` (V4/V2).
- `backend/src/services/continuityRiskAnalyzer.ts:59-84`: rule 3 compares stage 1-4 `created_at` with `scene.updated_at`; Phase A load-time autosaves bump `created_at` (continuity slice).
- `backend/src/routes/frames.ts:259-265`: queries `stage_states.state_data`/`project_id` (non-existent columns) for a visual capsule id (frames slice).
- `backend/src/routes/projects.ts:1711-1775`: shot extraction consumes the locked beats and a script summary (V-shot list).
- `src/pages/ProjectView.tsx:649-688`: skipped-stage "Write this myself" / "Generate this now" (V4 streamline backfill).
- `quickies-sql/add_stage_locks.sql`: `scenes.stage_locks` column defined outside migrations (DB slice).
- `backend/src/routes/projects.ts:3148`, `sceneStageLocks.ts:248`, `shotAssetAssignmentService.ts:333`: write `stage_locks` `outdated` (scene lock slice). None are triggered by script re-approval.
- `backend/migrations/036_text_field_versions.sql:28-33`: RLS `USING (true)` (security slice).
- `/api/llm/generate` arbitrary-prompt passthrough (`llm.ts:64-133`) (E / security).
- `backend/src/services/llm-client.ts:106` vs `:76, 310`: default model differs (`gemini-1.5-flash` in generate vs `gemini-2.5-flash-lite` elsewhere) (E).

---

## 15. Contradictions / unknowns

- CONTRADICTED: the Stage 4 warning says deleted scenes become `continuity_broken`; the code hard-deletes them (`projects.ts:1431`).
- CONTRADICTED: the script-skip instructions vs actual flow.
- CONTRADICTED: `'audio-visual'` vs backend `'audio_visual'`.
- CONTRADICTED: the Stage 2 regenerate dialog says guidance "will be saved as the commit message"; it is not saved.
- CONTRADICTED: `contextManager.ts` header claims "Manages Global Context (Phase A) and Local Context (Phase B)"; local context has no callers.
- UNKNOWN: live `prompt_templates` content. If the DB templates were edited to include `{regeneration_guidance}`/`{beat_sheet_reference}`, §0.7 changes. Settle by querying `prompt_templates`.
- UNKNOWN: whether React batching on load always triggers the Stage 2/3 autosave (code reading says yes) and whether TipTap's hydration `setContent` emits `onUpdate` in the non-editable state (v3 default `emitUpdate:true`). Settle with a runtime network trace.
- UNKNOWN: `insertContent(plainString)` structure for multi-line AI section rewrites in Stage 4.
- UNKNOWN: whether truncation at 4096 output tokens occurs for treatment generation in practice.
- UNKNOWN: derivePhaseAStages handling of a `draft` row that follows `outdated` (V2).
