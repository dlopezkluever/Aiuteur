# V2: Style Capsules + Global Asset Library + Seeding

Reporter: V2. Scope: `backend/src/routes/{styleCapsules,assets,seed}.ts`, `backend/src/services/styleCapsuleService.ts`, `backend/src/transformers/styleCapsule.ts`, `backend/scripts/{seed-style-capsules,seed-templates,update-templates-style-capsule,test-style-capsule-influence}.ts`, `src/pages/{StyleCapsuleLibrary,AssetLibrary}.tsx`, `src/components/styleCapsules/*`, `src/components/assets/*`, `src/lib/services/{styleCapsuleService,assetService}.ts`, `src/types/{styleCapsule,asset}.ts` (global parts). Plus the repo-wide cross-cutting trace of every capsule injection point.

Status flags per BRIEF. All `path:Lx-Ly` are HEAD.

---

## 1. What a style capsule is (data + code)

### 1.1 Tables (migration `backend/migrations/004_style_capsule_system.sql`, amended by `005_make_library_optional.sql`)

| Table | Columns (verbatim names) | Notes |
|---|---|---|
| `style_capsule_libraries` | `id, user_id (FK auth.users ON DELETE CASCADE, nullable), name, description, is_preset bool default false, created_at, updated_at` | `004:11-19`. Trigger `style_capsule_libraries_updated_at` (`004:182-185`). |
| `style_capsules` | `id, library_id (FK libraries ON DELETE CASCADE, nullable), user_id (FK auth.users ON DELETE CASCADE, nullable), name, type CHECK IN ('writing','visual')`; writing: `example_text_excerpts TEXT[], style_labels TEXT[], negative_constraints TEXT[], freeform_notes TEXT`; visual: `design_pillars JSONB, reference_image_urls TEXT[], descriptor_strings TEXT`; meta: `is_preset, is_favorite, created_at, updated_at` | `004:22-48`. One row type with both field groups; `type` selects which are used. `UNIQUE(library_id,name)` (004:47) replaced in 005 by deferrable `style_capsules_library_name_unique` + attempted `style_capsules_user_name_unique UNIQUE(user_id,name) WHERE library_id IS NULL` (`005:23-26`). |
| `style_capsule_applications` | `id, stage_state_id (FK stage_states ON DELETE CASCADE), style_capsule_id (FK style_capsules, no ON DELETE), applied_at, injection_context JSONB` | `004:51-57`. Write-only audit log (see 4.6). |
| `projects` (+2 cols) | `writing_style_capsule_id`, `visual_style_capsule_id` (FK style_capsules, no ON DELETE) | `004:61-63`. **Never written by any code path** (see 3.1). |
| `global_assets.visual_style_capsule_id`, `project_assets.visual_style_capsule_id` | FK ON DELETE SET NULL | `008:22,63`. |
| `image_generation_jobs.visual_style_capsule_id` | FK style_capsules, no ON DELETE | `007:54`. |

JSONB shape of `design_pillars` (by convention, not enforced): `{colorPalette, mood, medium, lighting, cameraLanguage}` strings (`src/types/styleCapsule.ts:8-15`; seed `backend/scripts/seed-style-capsules.ts:88-94`; editor `VisualStyleCapsuleEditor.tsx:34-95` restricts values to a fixed dropdown list of 10 per key). Seeded preset pillar values (e.g. "Monochrome with cyan/blue accents") are not in the dropdown option lists, so a duplicated preset opened in the editor shows those selects with a value that matches no `SelectItem` (UNKNOWN rendering; Radix behavior).

`reference_image_urls`: array of public URLs in Supabase bucket `style-capsule-images`, path `${userId}/${capsuleId}/${Date.now()}-${rand}${ext}` (`styleCapsules.ts:384-403`). Bucket public-read (`backend/quickies-sql/Storage-RLS-policies.sql:29-30`, `backend/scripts/setup-storage-buckets.ts:63`).

Migration 005 Step 4 uses `ADD CONSTRAINT ... UNIQUE (user_id, name) WHERE library_id IS NULL` (`005:23-26`); PostgreSQL table UNIQUE constraints do not accept a WHERE clause, so this statement is invalid SQL as written. Whether 005 applied (partially or at all) is UNKNOWN; settle by inspecting the live schema.

### 1.2 Text vs image anchors
- **Writing capsule**: text only (excerpts, labels, negative constraints, notes). Uploading images is rejected for non-visual capsules (`styleCapsules.ts:375-377`).
- **Visual capsule**: text anchors = `descriptor_strings` + `design_pillars`; image anchors = `reference_image_urls`. Image anchors are sent as inline image parts to Gemini only via `ImageGenerationService.getVisualStyleContext()` (`ImageGenerationService.ts:639-689`). Every LLM text-prompt path uses only the text fields; `formatVisualStyleInjection()` only emits a count "Reference imagery available: N image(s) provided" (`styleCapsuleService.ts:386-389`) and is never called.

### 1.3 Preset vs user, libraries, favorites, duplicate
- **Presets**: rows with `is_preset=true, user_id=NULL, library_id=<'System Presets' library>`, created only by operator script `seed-style-capsules.ts` (Section 6). Presets cannot be updated/deleted via API (403, `styleCapsules.ts:178-180, 236-238`).
- **User capsules**: `POST /api/style-capsules` always inserts `library_id:null, user_id:<caller>, is_preset:false` (`styleCapsules.ts:109-115`).
- **Libraries**: vestigial. `GET /api/style-capsules/libraries/all` auto-inserts a "My Style Capsules" library for any user with none (`styleCapsules.ts:489-518`) and returns libraries with nested capsule stubs; `POST /libraries` exists (`:554-584`) but frontend `createLibrary()` has no caller; the page passes `libraries` to `VisualStyleCapsuleEditor` which destructures and never uses it (`VisualStyleCapsuleEditor.tsx:97-98`). New capsules never get a library; `PUT` accepts `libraryId` (`styleCapsules.ts:196`) but no UI sends it. The list query joins `style_capsule_libraries(name,user_id)` (`:40-43`) but `capsuleToApi()` drops it (`transformers/styleCapsule.ts:6-32`).
- **Favorites**: `is_favorite` is a column on the capsule row itself (`004:43`). `POST /:id/favorite` toggles it for own capsules **and presets** (access filter `user_id.eq.X OR is_preset.eq.true`, `styleCapsules.ts:269-287`). With the service-role client, toggling a preset's favorite flips it for every user (single shared row). No per-user favorites table exists.
- **Duplicate**: `POST /:id/duplicate` only works on presets (`.eq('is_preset', true)`, `styleCapsules.ts:309-318`; non-preset → 404 "Preset capsule not found"); copies all content fields incl. `reference_image_urls` (same URLs, no file copy), `library_id:null`, name `newName || "<name> (Copy)"` (`:321-340`). UI shows Duplicate only for presets (`StyleCapsuleLibrary.tsx:259-263`, editors `readOnly && onDuplicate`).
- **Delete**: own non-preset only (`styleCapsules.ts:220-260`). FKs without ON DELETE from `projects`, `image_generation_jobs` (007:54) and `style_capsule_applications` (004:53) mean deleting a capsule that has been used in any image job or logged application is expected to fail with an FK violation → 500 "Failed to delete style capsule" (inferred from schema; runtime UNKNOWN). Storage files are never removed (comment `styleCapsules.ts:474-475`).

### 1.4 Code inventory
| Component | Status | Evidence |
|---|---|---|
| Router `styleCapsules.ts` (11 endpoints) mounted at `/api/style-capsules` with `authenticateUser` | REACHABLE | `server.ts:80-81` |
| `StyleCapsuleService` class | Only `getCapsuleById()` and `formatWritingStyleInjection()` are called anywhere. `getUserCapsules, createCapsule, updateCapsule, deleteCapsule, toggleFavorite, duplicatePreset, formatVisualStyleInjection, recordApplication, getUserLibraries, createLibrary` are DEAD (routes reimplement logic inline). `createCapsule/duplicatePreset` require a library and so contradict the routes' library-less behavior. | grep callers: `frames.ts:571,2218`, `projects.ts:3742`, `llm.ts:206-250`, `contextManager.ts:130-651`, `frameGenerationService.ts:779-784` |
| Transformer `capsuleToApi` snake→camel | REACHABLE | `transformers/styleCapsule.ts` |
| Frontend `styleCapsuleService` (fetch wrapper, 11 methods) | REACHABLE except `createLibrary` (no caller). Does NOT define `formatWritingStyleInjection` or `recordApplication`, which other frontend code calls (Section 4.7). | `src/lib/services/styleCapsuleService.ts` |
| `src/types/styleCapsule.ts` | `PRESET_CAPSULE_IDS` ('preset-hemingway-minimalist' etc., `:141-154`) unused anywhere and not UUIDs (DEAD). `StyleCapsuleFilter.isFavorite` has no UI control. | grep |

---

## 2. Style Capsule Library UI (`/style-capsules`)

Routes: `src/App.tsx:111-119` (ProtectedRoute + MainLayout); sidebar `src/components/layout/GlobalSidebar.tsx:25`. `src/pages/Index.tsx:46-49` also renders it but Index is not imported anywhere (ORPHANED).

Call chains:
- **Load**: `loadData()` → `styleCapsuleService.getCapsules()` + `getLibraries()` → `GET /api/style-capsules` (+ `GET /libraries/all`, which may INSERT a default library) (`StyleCapsuleLibrary.tsx:52-71`). The list endpoint selects only `id,name,type,is_preset,is_favorite,created_at,updated_at` (`styleCapsules.ts:30-47`), so card bodies that render `styleLabels`, `exampleTextExcerpts`, `designPillars`, `referenceImageUrls` (`StyleCapsuleLibrary.tsx:292-344`) never have data: cards show name/badges only. Same limitation for `StyleCapsuleSelector` previews/summary (`StyleCapsuleSelector.tsx:53, 106-162, 337-348`) and its search value (labels/pillars absent).
- **Filters**: client-side search by name, type select, preset/custom select (`:74-96`); sort favorites → custom → presets → name (`:99-110`); tabs Writing/Visual. Grid/list toggle only changes columns.
- **Open card** → `getCapsule(id)` → `GET /:id` (full row) → edit dialog; presets open read-only (`:193-206, 572-628`).
- **Create** → dropdown Writing/Visual → `WritingStyleCapsuleEditor` / `VisualStyleCapsuleEditor` → `POST /api/style-capsules`.
- **Favorite** heart (hover) → `POST /:id/favorite` → reload. **Duplicate** (presets) → `POST /:id/duplicate {newName}`. **Delete** (custom) → AlertDialog → `DELETE /:id`.

Editors:
- Writing (`WritingStyleCapsuleEditor.tsx`): name, excerpts (≥1 textarea), "Advanced Mode" toggle reveals style labels + negative constraints, freeform notes. Validation: name required, non-empty excerpts (`types/styleCapsule.ts:166-179`; empty strings filtered before validation so effectively only name). Save → create or `PUT /:id` (`:128-169`). "Show Preview" renders a client-side reconstruction of the injection text (`:171-207`) that differs from backend formatting (always prints "Style characteristics:" line; backend omits empty sections and joins with blank lines, `styleCapsuleService.ts:330-361`).
- Visual (`VisualStyleCapsuleEditor.tsx`): name, 5 pillar dropdowns, reference images, descriptor textarea. Create mode: selected files held as `pendingImageFiles`, uploaded after `POST` one by one via `POST /:id/upload-image` (`:218-242`). Edit mode: `ImageUploader` with `capsuleId` uploads immediately (persisted before "Update" is pressed) (`ImageUploader.tsx:107-162`), remove → immediate `DELETE /:id/images/:index` (`:151-173`); "Update" then PUTs `referenceImageUrls: existingImages` overwriting the array (`:198-209`). Client limit 5 files per batch, 5MB (`:444`; server multer 5MB, PNG/JPEG/WebP `styleCapsules.ts:11-23`); no server cap on total images.

---

## 3. How a capsule is selected for a project

### 3.1 The `projects.*_style_capsule_id` columns are never set
- `PUT /api/projects/:id` destructures only `title, project_type, content_rating, genre, tonal_precision, target_length_min/max, aspect_ratio` (`backend/src/routes/projects.ts:640-653`). No backend/frontend/script/SQL code writes `projects.visual_style_capsule_id` or `projects.writing_style_capsule_id` (repo-wide grep; only migrations 004 define them). Consequently every reader of `project.visual_style_capsule_id` gets NULL in practice: `projects.ts:3584,3738-3749` (Stage 9 prompt gen), `frames.ts:527,567-576` (end-frame prompt), `frames.ts:2156,2214-2223` (continuity prompt). `contextManager.fetchProject()` reads `project.writing_style_capsule_id || stage1ProjectParams.writingStyleCapsuleId` (`contextManager.ts:498-499`), so writing works only via the Stage 1 fallback.

### 3.2 Writing capsule (Stage 1)
- UI: `StyleCapsuleSelector type="writing"` in `Stage1InputMode.tsx:873-889` (optional; not disabled when Stage 1 locked).
- Persist: on "proceed", `inputProcessingService.processInput()` puts `writingStyleCapsuleId` into `processedInput.projectParams` (`inputProcessingService.ts:88-101`); `stageStateService.saveStageState(project.id, 1, {content:{...content, processedInput}})` (`Stage1InputMode.tsx:267-281`). Stored in `stage_states(stage_number=1).content.writingStyleCapsuleId` and `.content.processedInput.projectParams.writingStyleCapsuleId`. Stage 1 autosave disabled (`:139-156`), so selector changes persist only on proceed.
- Resolution at generation time: `ContextManager.fetchProject()` reads latest-version Stage 1 row of the project's `is_main` branch (not necessarily active branch) (`contextManager.ts:465-489`), then `getCapsuleById(id, userId)` (own or preset) (`:127-141`).
- Streamline-mode Stage 1 path: UNKNOWN whether `writingStyleCapsuleId` is carried into the committed Stage 1 content (V1 owns `Stage1InputMode` streamline commit / streamline routes; grep finds no capsule handling in `routes/streamline.ts` or `services/streamline*.ts` other than backfill reading GlobalContext).

### 3.3 Visual capsule (Stage 5)
- UI: `Stage5Assets.tsx:866-896` "Style Capsule" vs "Manual Tone" toggle. Selecting a capsule in `StyleCapsuleSelector type="visual"` immediately calls `handleStyleLock(styleId)` (no confirm) → `setContent({locked_visual_style_capsule_id, manual_visual_tone:null, manual_tone_preset:null, style_locked_at})` with `autoSave:true` (`:99-107, 220-233`). Manual tone: preset description + custom text → `manual_visual_tone` (`:236-259`). Stored only in `stage_states(stage_number=5).content`.
- Extraction / asset creation snapshot the capsule id into `project_assets.visual_style_capsule_id`: `POST /assets/extract` (requires capsule, `projectAssets.ts:78-85,126`), `extract-confirm` (capsule or manual, `:305-310,350`), `POST /assets` (body or Stage 5, `:1163-1186`), clone-from-global (Stage 5 lock or global asset's, `:1835,1915,1960`), split copies (`:1049`), sync-from-global overwrites with global's (`:2209-2219`).
- Gate: Stage 5 `canProceed = isStyleLocked && allGateHaveImages && gateAssets.length>0` (`Stage5Assets.tsx:218`); `style_outdated` does not block.

### 3.4 Global asset capsule
- `AssetDialog` `StyleCapsuleSelector type="visual"` optional (`AssetDialog.tsx:463-479`) → `global_assets.visual_style_capsule_id` via POST/PUT `/api/assets`. Clearing the selector sends `undefined` (`:317`), and `PUT` only updates when `!== undefined` (`assets.ts:244`), so a global asset's capsule cannot be cleared from the UI.

---

## 4. EVERY injection point (cross-cutting trace)

Legend: W = writing capsule, V = visual capsule. "Effective" = whether the capsule actually reaches the model given 3.1 and the frames bug below.

| # | Injection site | Capsule source | What is injected | Model | Effective? |
|---|---|---|---|---|---|
| 1 | `backend/src/routes/llm.ts:194-215` POST `/api/llm/generate-from-template` (metadata projectId+branchId present) | W via `ContextManager.assembleGlobalContext()` (`contextManager.ts:127-141`) | `variables.writing_style_context = formatWritingStyleInjection(capsule)` (`styleCapsuleService.ts:330-361`) interpolated into DB template `{writing_style_context}` | Gemini via `llmClient.generate` (`llm.ts:272-286`) | Y (Stage 1 fallback path). Used by Stage 2 `treatment_expansion`, Stage 3 `beat_extraction`, Stage 4 `master_script_generation` (frontend `treatmentService.ts:55-90,137-165`, `beatService.ts:55-74,131-150`, `scriptService.ts:79-99,147-167`). Frontend sends `writing_style_context:''` placeholder because `validateVariables()` runs before injection (`llm.ts:176-187` vs `:205-215`). |
| 2 | `llm.ts:232-262` same route, no project metadata | W from `variables.writing_style_capsule_id` + `getCapsuleById(id, user)` | same formatter | same | Reached only when frontend sends empty `projectId` (`beatService.ts:52,68`, `scriptService.ts:76,94` when `projectParams.projectId` missing). |
| 3 | `services/streamlineBackfillService.ts:57-80` `backfillTreatment()` | W via `assembleGlobalContext` | `formatForInjection({...ctx, beatSheet:undefined, masterScriptSummary:undefined})` → "WRITING STYLE GUIDANCE:\n…" + Ask-Auteur facts, appended to user prompt; only if a writing capsule exists (so without a capsule the facts are also omitted here) | Gemini `llmClient.generate` | Y. `backfillBeatSheet()` (`:106-125`) does NOT inject style. |
| 4 | `services/assetExtractionService.ts:520-548,657-683` `distillVisualSummary()` (Stage 5 extract / extract-confirm Pass 2) | V id from Stage 5 lock (`projectAssets.ts:78,305`) | `getStyleContext()` direct table read (no ownership check): name + `[descriptor_strings, pillars 'k: v; k: v'].join('. ')`; system prompt "STYLE-ALIGNED: Consider the {name} visual style"; user prompt "Style Context: …". Manual-tone fallback `{name:'Manual Tone', description: tone || 'Cinematic, high-quality visual style'}` | Gemini `llmClient.generate` (temp 0.4) | Y. The style is baked into the generated `project_assets.description` text (user-editable later); not re-distilled on style change. |
| 5 | `ImageGenerationService.executeJobInBackground()` `ImageGenerationService.ts:307-359` for project jobs (`master_asset, scene_asset, angle_variant, transformation_post, start_frame, end_frame, inpaint`) | V id passed by caller; or `manualVisualTone` | `getVisualStyleContext()` (`:639-689`, no ownership/type check): `textContext = [descriptor_strings, pillars 'k: v; …'].join('. ')`; `referenceImages` = capsule URLs (no `role`). Identity refs (`referenceImageUrls`, role) and `referenceImageUrl` are unshifted before capsule images (`:319-345`). Enforced: master_asset/scene_asset/transformation_post require capsule or manual tone (`:137-141`). | Gemini `gemini-2.5-flash-image` via `NanoBananaClient.generateImage()` (`NanoBananaClient.ts:29-139`) | See per-caller rows 5a-5h. |
| 5a | `projectAssets.ts:1210-1279` POST `/assets/:assetId/generate-image` (Stage 5 master image) | `asset.visual_style_capsule_id` only; Stage 5 consulted only for manual tone when asset has no capsule id (`:1244-1260`) | as 5 | | Y, but uses the asset's snapshot id, not the current Stage 5 lock (Section 5). |
| 5b | `projectAssets.ts:1436-1520` `/edit-image` | asset id, else Stage 5 lock, else manual | as 5 + optional referenceImageUrl | | Y |
| 5c | `projectAssets.ts:2520-2630` `/angle-variants/generate` → `createAngleVariantJob` (`ImageGenerationService.ts:249-293`) | asset id, else Stage 5 lock/manual | as 5 | | Y |
| 5d | `projectAssets.ts:3298-3440` `/location-views/:viewId/generate-image` | `asset.visual_style_capsule_id` only; Stage 5 only for manual tone | as 5 + one role:'style' ref | | P: asset with null capsule id and capsule-locked Stage 5 → job throws "Visual Style Capsule or Manual Visual Tone is required" (`ImageGenerationService.ts:139-141`, jobType 'scene_asset'). |
| 5e | `projectAssets.ts:1979-1997` clone-from-global `regenerateImage` | Stage 5 lock or global asset's | as 5 + global image as referenceImageUrl | | Y (only when capsule exists; manual-tone projects skip regen and localize instead) |
| 5f | `sceneAssets.ts:350-405` scene asset generate-image → `createSceneAssetImageJob` (`ImageGenerationService.ts:193-243`); `sceneAssets.ts:408-505` edit-image; `sceneAssets.ts:1944-2030` transformation post image | Stage 5 lock (`stage5Content.locked_visual_style_capsule_id`) or manual | as 5 + master image ref | | Y |
| 5g | Frame generation: `frames.ts:259-275` generate-frames, `:382-402` regenerate, `:446-463` inpaint, `:764-780` regenerate-with-correction, `:842-858` regenerate-with-prompt → `frameGenerationService.generateFrames/regenerateFrame/inpaintFrame/startFrameGeneration` (`frameGenerationService.ts:311-497, 845-930, 982+, 1250+`) | `stage_states.select('state_data').eq('project_id',…).eq('stage_number',3)` | as 5 | | **N (broken)**: `stage_states` has no `project_id` or `state_data` columns (`001_initial_schema.sql:51-76`; no later ADD COLUMN), so the query errors, `stageState` is null, `visualStyleCapsuleId` is always undefined. Frames get no capsule text or images at the image-model call. |
| 5h | `routes/images.ts:9-58` POST `/api/images/generate` (V5) | `visualStyleCapsuleId` from body | as 5 | | ORPHANED caller: only frontend `src/lib/services/imageService.ts:42` which itself has no importers. |
| 6 | `ImageGenerationService.executeGlobalAssetJobInBackground()` `ImageGenerationService.ts:800-927` ← `assets.ts:410-458` POST `/api/assets/:id/generate-image` | body `visualStyleCapsuleId || asset.visual_style_capsule_id` (no ownership check of capsule) | `getVisualStyleContext()` text + images; no identity refs | Gemini image | Y |
| 7 | `NanoBananaClient.generateImage()` prompt wrapping `NanoBananaClient.ts:69-103` | context from 5/6 | Prompt variants (verbatim excerpts below). Capsule images carry no `role`, so: (a) only capsule images, count 1 → "matches the visual style…shown in the provided reference image"; (b) only capsule images, count ≥2 → legacy branch "Generate an image of the subject shown in the FIRST reference image…" (first style image treated as subject); (c) identity refs + capsule images → "identity only" branch counting only identity images; capsule images are attached unlabeled. Text-only → "following visual style applied strongly throughout". | | Y (behavioral contradiction for b/c) |
| 8 | `promptGenerationService.buildStyleContext()` `promptGenerationService.ts:761-786` → `generateFramePrompt` (`:1128-1160` via `generatePromptSet` `:912,946`), `generateEndFramePrompt` (`:1291,1331`), `generateContinuityFramePrompt` (`:1371,1416`) | `project.visual_style_capsule_id` (`projects.ts:3738-3749` Stage 9 bulk; `frames.ts:567-576` end-frame prompt; `frames.ts:2214-2223` continuity prompt); or Stage-3 `state_data` id (`frameGenerationService.ts:775-800` camera-change path) | "VISUAL STYLE:\nDesign pillars: k: v, …\nStyle: …\nLabels: …\nAvoid: …" appended to the system prompt; else literal "No visual style capsule applied." | Gemini `llmClient.generate` (`promptGenerationService.ts:1470`) | **N in practice**: both sources are always null (3.1 and 5g), so Stage 9 frame/end-frame/continuity prompts always receive "No visual style capsule applied.". Video prompt (`generateVideoPrompt`, `:949`) never receives style. |
| 9 | `ContextManager.formatForInjection / prepareStageContext / formatTreatmentContext / formatBeatSheetContext / formatScriptContext` `contextManager.ts:288-318,381-408,608-664` | W | "WRITING STYLE GUIDANCE:" etc. | — | `formatForInjection` used only by streamline backfill (#3) and tests; `prepareStageContext`, `assembleFullContext`, `formatPromptGenerationContext` have no production callers (only `tests/contextManagerAuteurResolutions.test.ts`). DEAD in production. |
| 10 | Video generation | — | none | — | No capsule reference in `services/video-generation/*` or `videoGenerationService.ts` (grep). |

Verbatim formatter (`styleCapsuleService.ts:338-360`):
```
Example excerpts:
"<excerpt>"            (one per excerpt)
Style characteristics: <labels joined ', '>
Avoid: <negative constraints joined ', '>
Additional notes: <freeform_notes>
(sections joined with '\n\n'; empty sections omitted)
```
Seeded template slot (`seed.ts:42-43`, `seed-templates.ts:39-40`): `WRITTEN STYLE CONTEXT:\n{writing_style_context}` in the system prompt of all three templates.

NanoBanana wrappers (`NanoBananaClient.ts:78-102`), excerpts:
- `Apply these style guidelines: ${visualStyleContext}. ` prefix inside each image branch.
- Legacy: `Generate an image of the subject shown in the FIRST reference image. Maintain the subject's identity… Apply the visual style, color palette, mood, and aesthetic from the remaining reference images. …Subject: ${prompt}`.
- Text-only: `Generate an image with the following visual style applied strongly throughout: ${ctx}\n\nSubject: ${prompt}\n\nIMPORTANT: The visual style described above must be clearly evident in the generated image.`
Images are sent as `inlineData` parts before the text part (`:122-130`); failed downloads are skipped (`:51-56`). Retries: `executeWithRetry` maxRetries 3, base delay 1000ms (`NanoBananaClient.ts:17-18`, ~`:241-266`).

### 4.6 Application audit log
- Backend returns `styleCapsuleMetadata {styleCapsuleId, injectionContext:{stage, templateName, formattedContextLength, timestamp, traceId}}` (`llm.ts:290-314`). Stage 2/3/4 components stash it as `content._styleCapsuleMetadata` (`Stage2Treatment.tsx:204,377`, `Stage3BeatSheet.tsx:354`, `Stage4MasterScript.tsx:337`); `stageStateService.saveStageState` strips it and sends `styleCapsuleMetadata` (`stageStateService.ts:104-116`); backend inserts `style_capsule_applications` after the new stage_states row (`stageStates.ts:259-280`). No code reads this table. Capsule content is not snapshotted (only length), so editing a capsule later changes future generations with no record of what was injected before.

### 4.7 Broken frontend capsule code
- `beatService.regenerateBeats()` calls `styleCapsuleService.formatWritingStyleInjection(capsule)` (`beatService.ts:119-126`), a method that does not exist on the frontend service → TypeError caught → `writing_style_context=''`; backend overrides it anyway via path #1 because metadata has projectId+`branchId:'main'`.
- `src/lib/services/imageService.ts` (ORPHANED: no importers) calls nonexistent `styleCapsuleService.recordApplication` (`:74-87`) with a fake `stage_state_id` string.

### 4.8 Note on the LLM metadata
`llm.ts:225` stores the full `globalContext` (including capsule rows) into `validatedRequest.metadata.globalContext`, which is spread into `llmClient.generate({metadata})` (`:278-285`); whether this reaches LangSmith traces is V-LLM's slice (UNKNOWN here).

---

## 5. Style change downstream (read-only coordination with V1/V5)

- "Change Style" button (Stage 5, visible when style locked and stage not locked/outdated) opens `StyleChangeWarningDialog` (`Stage5Assets.tsx:843-855, 1464-1477`; dialog `StyleChangeWarningDialog.tsx:30-70`): text "Changing the visual style from <name> will affect N generated image(s)" (N = active assets with images). `currentStyleName` is the literal "Style Capsule" for capsule mode (`Stage5Assets.tsx:1467-1472`), not the capsule's name.
- **Mark Images as Outdated** → `projectAssetService.markStyleOutdated` → `POST /api/projects/:id/assets/mark-style-outdated` → `UPDATE project_assets SET style_outdated=true WHERE branch_id=active AND image_key_url IS NOT NULL` (`projectAssets.ts:1587-1625`); then clears Stage 5 style keys in content (`Stage5Assets.tsx:262-289`). UI badge "Style Outdated" (`:1153-1155`).
- **Clear All Images** → `POST …/clear-all-images` → `UPDATE project_assets SET image_key_url=null, style_outdated=false` on branch (`projectAssets.ts:1631-1665`). Does not touch `project_asset_generation_attempts`, `scene_asset_instances`, angle variants, location views, frames (by code inspection of the update).
- `style_outdated=false` is reset only in the master_asset success path of `executeJobInBackground` (`ImageGenerationService.ts:406-410`); upload, attempt-select, and the fallback path (`:414-425`) do not reset it. `style_outdated` does not gate Stage 5 completion (`Stage5Assets.tsx:218`).
- **Stale capsule after change (CONTRADICTED intent)**: neither action updates `project_assets.visual_style_capsule_id`. `generate-image` uses `asset.visual_style_capsule_id` when set (`projectAssets.ts:1244-1269`), as do edit-image (`:1471`), angle variants (`:2565`), and location views (`:3403-3429`). So after picking a new capsule, regenerating an existing asset still uses the previously snapshotted capsule; switching to manual tone does not apply to assets that already have a capsule id. Scene-asset/transformation routes (Stage 8) read the current Stage 5 lock instead (`sceneAssets.ts:375,459,1999`), so Stage 5 and Stage 8 images can use different capsules.
- No other stage is invalidated by a visual or writing style change in this slice's code. Writing-capsule edits in the library have no invalidation at all.

---

## 6. Seeding

| Item | Trigger | Creates | Status |
|---|---|---|---|
| `POST /api/seed/prompt-templates` (`seed.ts:15-212`) | Any authenticated user (router mounted with only `authenticateUser`, `server.ts:77-78`); no frontend/e2e caller | 3 `prompt_templates` rows v1.0.0: `treatment_expansion` (stage 2), `beat_extraction` (3), `master_script_generation` (4, includes SUB-LOCATION PRECISION and SPATIALLY EXPLICIT ACTION rules). `created_by` null. | REACHABLE (HTTP only), no tests |
| `backend/scripts/seed-templates.ts` | operator `tsx` (no package.json script; `backend/package.json:15` lists only `setup:bucket`) | same 3 names v1.0.0, but treatment/beat system prompts add explicit "Return the response as JSON in this exact format" blocks; master script lacks the sub-location/spatial rules | operator-only |
| `backend/scripts/seed-style-capsules.ts` | operator `tsx` | 1 library "System Presets" (`user_id null, is_preset true`) + 4 writing presets (Hemingway Minimalist, Victorian Ornate, Hard-Boiled Noir, Whimsical Fantasy) + 4 visual presets (Neo-Noir, Pixar Animation, Cinéma Vérité, Cyberpunk Neon) with `reference_image_urls: []` (`:37-134`). Not idempotent: re-run inserts a second library; capsule inserts then may hit `(library_id,name)` uniqueness only within the same library, so duplicates across libraries are possible. | operator-only |
| `backend/scripts/update-templates-style-capsule.ts` | operator | Rewrites `{rag_retrieved_style_examples}` → `{writing_style_context}` in all templates (`:28-50`) | LEGACY migration helper |
| `backend/scripts/test-style-capsule-influence.ts` | operator, real provider + DB | Inserts temp `global_assets` row with the capsule, calls `createGlobalAssetImageJob`, polls `getJobStatus`, deletes asset unless `--keep-asset`, writes `scripts/test-results-<ts>.json` (`:128-301`). "Test 2" text-only is a no-op (`:251-260`). Falls back to first user from `users` table or `auth.admin.listUsers()` when capsule has no owner (presets) (`:99-123`). | operator-only, live |

Collision: both seeders insert the same `(name, version)` pairs; `prompt_templates UNIQUE(name, version)` (`002_add_langsmith_fields.sql:28`). Whichever runs first wins; the other's inserts fail and are logged/swallowed (`seed.ts:191-199`, `seed-templates.ts:206-214`). Which content is live is UNKNOWN (settle: query `prompt_templates`). Lookup: `listTemplates({name, activeOnly, limit:1})` orders by stage, name, created_at desc (`prompt-template.ts:152-157`).

Seeded templates contain no `{regeneration_guidance}` or `{beat_sheet_reference}` placeholders, while callers send `regeneration_guidance` (treatment/beat/script regen) and llm.ts adds `beat_sheet_reference` for stage≥4 (`llm.ts:218-222`). `interpolateTemplate` only replaces placeholders present (`prompt-template.ts:~267-275`), so with seeded templates the regeneration guidance text never reaches the model (cross-slice V1; live template content UNKNOWN).

---

## 7. Global Asset Library (`/assets`)

Route `src/App.tsx:121-129`; sidebar `GlobalSidebar.tsx:26`. Backend router `assets.ts` at `/api/assets` (`server.ts:86-87`). Table `global_assets` (`008:10-33`; type CHECK extended to `extra_archetype` in `024:10-12`).

| Capability | Chain | Notes |
|---|---|---|
| List | `AssetLibrary.loadAssets()` → `assetService.listAssets()` (no filters) → `GET /api/assets` `.eq('user_id')` order created desc (`assets.ts:27-65`) | Server supports `type, search (ilike name), has_image`; UI filters client-side by name + tabs All/Character/Prop/Location (`AssetLibrary.tsx:56-78,178-236`). No extra_archetype tab; extra_archetype assets appear in "All" only. |
| Card | `AssetGallery` → `AssetCard` shows image, type badge, version `v{n}` (`AssetCard.tsx:41-121`) | `assetTypeConfig` has no `extra_archetype` (`AssetCard.tsx:22-39`); `config.icon` on undefined → render TypeError for any extra_archetype global asset (reachable via promote, Section 8). |
| Create | `AssetDialog.handleSubmit` → `POST /api/assets {name, assetType, description, imagePrompt, visualStyleCapsuleId}` (`AssetDialog.tsx:279-345`, `assets.ts:92-168`) | Server validates name/type/description ≥10 chars; types limited to character/prop/location (`assets.ts:113`). `voiceProfileId`, `promotedFromProjectId` accepted but not sent by UI. |
| Edit | `PUT /api/assets/:id` (`assets.ts:171-270`) | Always `version = version+1` even if nothing changed (`:236-238`). extra_archetype type rejected on PUT if sent (`:198-205`); the dialog sends the current `assetType`, so editing a promoted extra_archetype asset fails 400 (inferred). |
| Upload image | after save, `POST /:id/upload-image` multer 10MB → bucket `asset-images` path `global/${userId}/${assetId}/…` → `image_key_url`, `version+1` (`assets.ts:341-407`) | Old storage objects not removed. |
| Remove image | `removeImage:true` on PUT → `image_key_url=null` (`assets.ts:248-250`) | |
| Generate image | `handleGenerateImage` (≥20 chars) → if new, `POST /api/assets` first → `POST /:id/generate-image {prompt, visualStyleCapsuleId}` → `createGlobalAssetImageJob` → background `executeGlobalAssetJobInBackground` → poll `GET /api/images/jobs/:id` every 2s, 2-min timeout (`AssetDialog.tsx:129-277`, `assets.ts:410-458`, `ImageGenerationService.ts:736-927`, `images.ts:71-137`) | Aspect by type (`ImageGenerationService.ts:58-63`); white-background suffix for character/prop/extra (`:78-89,749`). Success: upload `global/${userId}/${assetId}/${ts}_${rand}.png`, `image_key_url`, `version+1`. Failure: job `failed` with stage. No attempt history; idempotency key is timestamped and never checked for global jobs. Poll interval keeps running if dialog closes. |
| Delete | `DeleteAssetDialog` → `DELETE /api/assets/:id` → 409 with project titles if any `project_assets.global_asset_id = id` (`assets.ts:273-338`; UI `DeleteAssetDialog.tsx:41-60`) | Storage not cleaned. |

Visibility: every `/api/assets` query filters `.eq('user_id', userId)`; no sharing/public assets. RLS (`008:89-100`) mirrors that but backend uses service-role key (`config/supabase.ts:10-22`), so RLS is not the enforcement mechanism; code-level filters are.

---

## 8. Project ↔ global asset flows (routes owned by V5; recorded here)

| Flow | UI | Route | Behavior |
|---|---|---|---|
| Clone | Stage 5 "Browse Global Library" → `AssetDrawer` (also Stage 8, `Stage8VisualDefinition.tsx:846`) → `projectAssetService.cloneFromGlobal` (`AssetDrawer.tsx:269,287`) | `POST /api/projects/:id/assets/clone-from-global` (`projectAssets.ts:1756-2045`) | Global asset must be owned by caller. New `project_assets` row with `global_asset_id, source_version=global.version`, `visual_style_capsule_id = Stage5 lock || global's`, `image_key_url` then localized (copied into project storage) via `localizeAssetImage`, or regenerated if `regenerateImage && image && capsuleId`. |
| Match (clone onto extracted asset) | `AssetMatchModal` (`AssetMatchModal.tsx:125,148`) | same route with `matchWithAssetId, descriptionStrategy ('global'|'project'|'merge'), nameStrategy` | Updates the extracted row; `merge` → LLM `mergeWithLLM` (`assetDescriptionMerger.ts:44-91`, fallback concatenation). Name strategies produce "Global (Project)" forms (`projectAssets.ts:1866-1884`). |
| Sync status | `AssetVersionSync` in Stage 5 header (`Stage5Assets.tsx:1039-1042`) | `GET …/assets/version-sync-status` (`projectAssets.ts:431-509`) | Outdated when `source_version < global.version`. Because PUT/upload/generate all bump version, any save marks clones outdated. |
| Sync from global | `AssetVersionSync.tsx:68,99` | `POST …/assets/:assetId/sync-from-global` (`projectAssets.ts:2047-2280`) | Rejects locked assets. Force-syncs name, description, image_prompt, image_key_url (localized), visual_style_capsule_id (global's or keeps project's) **regardless of `overridden_fields`**, then removes those from `overridden_fields`; sets `source_version`, `last_synced_at`. Overwrites user-edited project description. |
| Promote | Stage 5 asset menu → confirm → `projectAssetService.promoteToGlobal` (`Stage5Assets.tsx:580-608`) | `POST …/assets/:assetId/promote` (`projectAssets.ts:2286-2350`) | Requires `image_key_url`. Inserts `global_assets` copying fields incl. `asset_type` (may be `extra_archetype`), `image_key_url` (project-storage URL, not copied), `visual_style_capsule_id`, `promoted_from_project_id`. Does not link back (`project_assets.global_asset_id` untouched); repeated promotes create duplicates. |

---

## 9. Who can see what

| Object | Read | Write | Mechanism |
|---|---|---|---|
| style_capsules | own + all presets (`.or('user_id.eq.X,is_preset.eq.true')`, `styleCapsules.ts:45,71,273`) | own non-preset (route checks); favorites flag writable on presets by anyone | Backend service-role client; RLS in 004:93-138 not exercised by backend. Note RLS INSERT policy requires a library owned by the user (`004:110-118`) which route-created capsules lack; irrelevant under service role. |
| Capsule use in generation | `getVisualStyleContext` (`ImageGenerationService.ts:639-644`) and `assetExtractionService.getStyleContext` (`:657-662`) read any capsule id without ownership check; `/api/assets/:id/generate-image` and `/api/images/generate` accept arbitrary `visualStyleCapsuleId` from the body. | — | Any authenticated user who knows another user's capsule UUID can generate with it. |
| Capsule images | public bucket URLs | uploads only via backend | `Storage-RLS-policies.sql:29-30` |
| style_capsule_libraries | own + preset | own (insert via routes) | |
| global_assets | owner only | owner only | `.eq('user_id')` on all routes |
| prompt_templates | (llm routes) | any authenticated user can seed via `/api/seed/prompt-templates` | |
| `/api/images/debug-style-capsule/:id` (V5) | owner or preset | — | `images.ts:140-185` returns full capsule analysis; no frontend caller. |

---

## 10. Tests

- No tests for `styleCapsules.ts`, `assets.ts`, `seed.ts`, StyleCapsuleLibrary, AssetLibrary, assetService, styleCapsuleService (frontend or backend), clone/sync/promote, style-outdated (grep of `backend/src/tests`, `src/**/__tests__`, `e2e/`).
- `backend/src/tests/image-generation.test.ts` is a live-DB/provider integration test; `createImageJob({jobType:'master_asset'})` without capsule/manual tone (`:112-129`) contradicts the enforcement at `ImageGenerationService.ts:139-141` (would throw). Stale.
- `backend/src/tests/referenceContinuity.test.ts:36-37` mocks `StyleCapsuleService`.
- `backend/src/tests/contextManagerAuteurResolutions.test.ts` covers `formatForInjection/prepareStageContext` without a writing capsule.
- `e2e/enhanced-upload-modal.spec.ts:95,198` references "Global Assets & Style Lock" text and "Apply Style" button (V5 slice).

---

## Cross-slice references

- V1 `src/components/pipeline/Stage1InputMode.tsx:873-889, 267-281`: writing capsule selection persisted only in Stage 1 stage_states content; streamline path handling UNKNOWN.
- V1 `src/lib/services/{treatmentService,beatService,scriptService}.ts`: send `writing_style_context:''` + `writing_style_capsule_id`, `branchId:'main'`; `regeneration_guidance` sent but not a seeded placeholder.
- V1/LLM `backend/src/routes/llm.ts:176-215,225,290-314`: validate-then-inject order; globalContext put in LLM metadata; styleCapsuleMetadata returned.
- V1 `backend/src/routes/stageStates.ts:259-280`: style_capsule_applications insert.
- V1/streamline `backend/src/services/streamlineBackfillService.ts:61-71`: style + Ask-Auteur facts only injected when a writing capsule exists.
- V5 `src/components/pipeline/Stage5Assets.tsx:99-107,220-310,843-896,1039-1049,1153-1155,1464-1477`: style lock, manual tone, change-style dialog, version sync, promote.
- V5 `backend/src/routes/projectAssets.ts:78-126,305-350,1163-1186,1210-1279,1436-1520,1587-1665,1756-2350,2520-2630,3298-3440`: capsule snapshotting, stale-capsule generation, clone/sync/promote.
- V5 `backend/src/routes/sceneAssets.ts:350-505,1944-2030`: Stage 8 images use current Stage 5 lock.
- V5/V-frames `backend/src/routes/frames.ts:259-267,382-390,446-454,764-772,842-850`: `stage_states.state_data`/`project_id` query (nonexistent columns) → frames never get a capsule.
- V-frames `backend/src/services/frameGenerationService.ts:775-800`: camera-change path fetches capsule only if id given (never).
- V-prompts `backend/src/routes/projects.ts:3738-3749`, `frames.ts:567-576,2214-2223`, `promptGenerationService.ts:761-786`: style context sourced from never-written `projects.visual_style_capsule_id`.
- V5 `backend/src/services/image-generation/NanoBananaClient.ts:69-103`: role-less capsule images change which prompt branch fires.
- V5 `backend/src/routes/images.ts:140-185` debug endpoint; `:9-58` /generate only used by orphaned frontend imageService.
- V5 `src/components/pipeline/AssetDrawer.tsx:180,269,287`, `AssetMatchModal.tsx:125,148`, `AssetVersionSync.tsx:68,99`: global library consumers.
- LLM `backend/src/services/llm-client.ts:76,106`: default model env `GEMINI_MODEL` or 'gemini-2.5-flash-lite' / 'gemini-1.5-flash'.

## Contradictions / unknowns

1. `projects.writing_style_capsule_id/visual_style_capsule_id` exist and are read in 5 places but never written → Stage 9 / end-frame / continuity prompts always "No visual style capsule applied." (CONTRADICTED with apparent intent).
2. frames.ts reads `stage_states.state_data` filtered by `project_id`, neither column exists → frame image generation never receives the visual capsule (text or images).
3. Project asset regeneration uses the asset's snapshotted capsule id, not the current Stage 5 lock; Stage 8 uses the current lock. Style change does not update snapshots.
4. NanoBanana: capsule images without role; ≥2 capsule images and no identity ref → first style image treated as subject.
5. Favorites are a shared column; toggling a preset favorite affects all users.
6. Migration 005 Step 4 invalid SQL; applied state UNKNOWN.
7. Seed route vs seed script produce different prompt text under the same (name, version); live content UNKNOWN.
8. Libraries: auto-created per user but never used; backend service methods requiring libraries contradict routes.
9. List endpoint omits content fields while card/selector UIs render them.
10. Capsule delete likely blocked by FKs once used (UNKNOWN at runtime).
11. `AssetCard` crashes on `extra_archetype` (reachable via promote); global PUT rejects that type.
12. Sync-from-global ignores `overridden_fields` despite the column's purpose (009 comment).
13. `image-generation.test.ts` stale vs style enforcement.
14. Frontend `beatService.regenerateBeats` and orphaned `imageService` call nonexistent frontend methods.
