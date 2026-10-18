# L: Objective structural pressure (wave 2, reporter L)

Descriptive only. Every item is OBSERVATION / EVIDENCE / CURRENT CONSEQUENCE / CONFIDENCE. No solutions, no recommendations.

Ledger: `reports/L-pressure.ledger.jsonl` (PRESSURE ids `L-PRESSURE-NN`, FACT ids `L-FACT-NN`).

## 0. Method and caveats

- All counts are static: `grep -rn` / `grep -c` / small `node` regex scanners (scripts in `/tmp`, not in repo). Scope: `backend/src` and `src`, non-test unless labelled. Test dirs: `backend/src/tests`, `backend/src/**/__tests__`, `src/**/__tests__`, `*.test.*`.
- "Table-literal call" = `.from('<lowercase_table>')` with a string literal (regex, multi-line chains included). `Array.from` / `Buffer.from` excluded by the literal requirement. Storage bucket calls subtracted (routes: 3 same-line; services: 2 multi-line `supabase.storage` + `.from('videos')` in `Veo3Provider.ts:337-338,353-354`). Counts are regex-based, expect about +/-2 percent.
- Handler counts are `router.(get|post|put|patch|delete)(` registrations. Ownership and error-handling classification are per handler body (from registration line to the next registration).
- Not read: `._docs/**`, README, AGENTS, CLAUDE, `.claude/**`, `.agents/**`, `tmp*`, `test-results`, `ui-images`. Wave-1 PRESSURE/FACT entries were used only as leads and are cited by provisional id (`WD-IMPL-*`) with my own re-check noted.
- Git history is one squashed commit; not used.

## 1. Module size

### 1.1 Top 30 production files by LOC (non-test)

| # | LOC | File |
|---|---:|---|
| 1 | 4006 | backend/src/routes/projects.ts |
| 2 | 3451 | backend/src/routes/projectAssets.ts |
| 3 | 2410 | backend/src/routes/frames.ts |
| 4 | 2332 | backend/src/routes/sceneAssets.ts |
| 5 | 1769 | src/components/pipeline/Stage7ShotList.tsx |
| 6 | 1754 | src/components/pipeline/Stage10FrameGeneration.tsx |
| 7 | 1749 | src/components/pipeline/Stage5Assets.tsx |
| 8 | 1600 | backend/src/services/frameGenerationService.ts |
| 9 | 1521 | backend/src/services/promptGenerationService.ts |
| 10 | 1335 | src/components/pipeline/ContentAccessCarousel.tsx |
| 11 | 1291 | src/lib/services/projectAssetService.ts |
| 12 | 1265 | src/components/pipeline/Stage4MasterScript.tsx |
| 13 | 994 | src/pages/ProjectView.tsx |
| 14 | 994 | src/components/pipeline/Stage9PromptSegmentation.tsx |
| 15 | 982 | src/components/pipeline/FramePanel.tsx |
| 16 | 962 | src/lib/services/sceneAssetService.ts |
| 17 | 958 | backend/src/services/image-generation/ImageGenerationService.ts |
| 18 | 939 | src/components/pipeline/Stage8VisualDefinition.tsx |
| 19 | 933 | src/components/pipeline/Stage3BeatSheet.tsx |
| 20 | 925 | src/components/pipeline/Stage1InputMode.tsx |
| 21 | 888 | src/components/pipeline/Stage2Treatment.tsx |
| 22 | 884 | src/lib/services/frameService.ts |
| 23 | 854 | src/components/pipeline/Stage8/VisualStateEditorPanel.tsx |
| 24 | 843 | src/components/pipeline/Stage8/LocationCoveragePanel.tsx |
| 25 | 811 | src/components/pipeline/Stage8/SceneAssetListPanel.tsx |
| 26 | 777 | backend/src/routes/llm.ts |
| 27 | 703 | backend/src/services/continuityCompositionService.ts |
| 28 | 683 | backend/src/services/assetExtractionService.ts |
| 29 | 681 | src/components/pipeline/AssetDrawer.tsx |
| 30 | 675 | backend/src/services/videoGenerationService.ts |

Totals: frontend production 53,362 LOC (`src`, excl. tests); backend production 33,639 LOC (`backend/src`, excl. tests); backend tests 9,422; frontend tests 4,879. `src/components/pipeline/` = 89 files.

### 1.2 Giant route files

| File | LOC | Route handlers | Top-level functions (regex) | Direct table calls | Mixed concerns (observed from route paths and handler bodies) |
|---|---:|---:|---:|---:|---|
| backend/src/routes/projects.ts | 4006 | 29 | 11 top-level helpers (L47-L225); 33 fn/arrow declarations incl. nested (regex) | 129 | Project CRUD (259-640); continuity mode and metrics (810-863); scene list/defer/restore/save-script (1013-1217, 1135-1176); shot CRUD, reorder, split, merge, delete (1534-2791); location resolution and location-coverage (1585, 2043); shot lock/unlock with frame/video invalidation (2845-3020); prompt generation and continuity preview for Stage 9 (3190-3573); project delete (3961). |
| backend/src/routes/projectAssets.ts | 3451 | 37 | 7 | 132 | Asset extraction preview/confirm (44-273); asset CRUD and merge/split (383-981); image generate/upload/analyze/edit (1210-1436); lock, lock-all, clear, style-outdated (1527-1675); global-asset clone/sync/promote (1756-2286); attempts and selection (2360-2434); angle variants (2468-2643); location views and establish-from-frame (2705-3298). |
| backend/src/routes/frames.ts | 2410 | 27 | 9 | 115 | Frame generate, approve, reject, regenerate, inpaint (227-484); end-frame prompt (519-664); regenerate with correction/prompt (708-800); chain-from-end-frame, add-as-reference, upload (877-1063); generations and selection (1250-1406); continuity-base and reference images (1498-1688); batch-link-copy and copy-frame (1814-1969); continuity prompt (2148); shot field-versions (2296-2382). |
| backend/src/routes/sceneAssets.ts | 2332 | 36 | 4 | 88 | Scene asset instances CRUD (67-674); suggestions (730-823); create-with-project-asset and populate-from-dependencies (885-990); generate/edit/analyze (350-524); attempts (1135-1219); use-master-as-is (1264-1364); reference chain and master selection (1458-1607); upload (1671); transformation events (1813-1944); transformation images (2050); description-override field-versions (2111-2194); infer-context (2226-2274). |
| backend/src/routes/llm.ts | 777 | 13 | - | 0 | Generic LLM generate, template-generate, cost estimate, usage stats, connectivity, prompt template CRUD and activation, interpolation. |

Route files are mounted in `backend/src/server.ts:47-84`; all except `/api/health` sit behind `authenticateUser`.

### 1.3 Giant UI and state-host files

Counts: `useState`, `useEffect`, `useQuery|useMutation|useInfiniteQuery`, `useCallback|useMemo`, `useRef` are literal-token counts. Function count is a regex over `function X` and `const X = (async)? (`.

| File | LOC | useState | useEffect | useQuery/Mutation | useCallback/useMemo | useRef | fn (regex) | service/HTTP call sites | Mixed concerns (observed) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| components/pipeline/Stage7ShotList.tsx | 1769 | 31 | 6 | 0 | 4 | 0 | 27 | 14 | Auto-extract on mount (L163-171); shot edit with 800 ms debounced autosave (L122-125, L252-286); split and merge dialogs; defer-last-shot (L453); location resolution (L208); lock via `shotService` and via `lockStageViaHook(7)` (L697-701); unlock via `confirmUnlockViaHook(7)` then `shotService.unlockShotList` (L812-817, comment "Also unlock via old system for backward compat"); validation modal. |
| components/pipeline/Stage10FrameGeneration.tsx | 1754 | 16 | 2 | 24 | 17 | 0 | 5 | 42 | Frame grid, continuity-base chooser (sub-component `ContinuityBaseChooser`), generation polling (L252-260), inpaint/regenerate, field-versions (`textFieldVersionService`), location-continuity (`locationContinuityService`), scene stage lock, invalidation of 30 query call sites. |
| components/pipeline/Stage5Assets.tsx | 1749 | 33 | 3 | 2 | 4 | 2 | 28 | 29 | Visual style lock (L220-236); manual tone; style-change dialogs (mark outdated L262, clear images L290); asset extraction; merge/split wizard; bulk select; lock-all (L778); stage 5 lock (L779). |
| components/pipeline/ContentAccessCarousel.tsx | 1335 | 17 | 14 | 5 | 14 | 9 | 24 | 4 | Shared carousel rendered by 7 stage components (Stage6 L528, Stage7 L921, Stage8 L773, Stage9 L443, Stage10 L891, Stage11 L164, Stage12 L243); inner components for script text (`FullScriptContent`), stills, clips, shot list, lightbox, resize handle. |
| components/pipeline/Stage4MasterScript.tsx | 1265 | 18 | 5 | 0 | 12 | 4 | 3 | 19 | Editor (tiptap); scene extraction; approve (L613-616: `persistScenes` then `lockStage(4)`); downstream-warning dialog; hydrate and derive lock state. |
| pages/ProjectView.tsx | 994 | 17 | 8 | 0 | 0 | 3 | 31 | 11 | Stage host: Phase A/B stage progression (L30-34 hard-coded stage list; L446-470 `handleStageComplete`); URL search-param sync; scene-stage lock fetch and `handleSceneStageComplete` (L589-600); unlock warning; streamline completion; derives stage progress (`derivePhaseAStages`). |
| components/pipeline/Stage9PromptSegmentation.tsx | 994 | 22 | 5 | 2 | 3 | 0 | 10 | 17 | Prompt generation per shot, prompt review, shot-asset auto-populate (L150), scene info, carousel. |
| components/pipeline/FramePanel.tsx | 982 | 13 | 0 | 6 | 0 | 0 | 8 | 4 | Per-frame panel: generation, upload, adjacent frame info, inpaint, approve/reject. |
| components/pipeline/Stage8VisualDefinition.tsx | 939 | 23 | 4 | 12 | 20 | 2 | 8 | 31 | Scene asset list, location coverage, visual state editor, auto-populate (L240-272), inherit + populate, image job polling (L449), transformation conversion dialog, tag carry-forward, 19 invalidation call sites. |
| components/pipeline/Stage1InputMode.tsx | 925 | 14 | 0 | 0 | 0 | 2 | 10 | 15 | Input modes (text, file, streamline); file staging; streamline routing; persists scenes for streamline import (L486-497, comment "replicate it here"). |

Stage 3 (933 LOC, 12 useState) and Stage 2 (888 LOC, 15 useState) have the same pattern (one component per stage, all state inline).

### 1.4 Service giants (for context)

`frameGenerationService.ts` (1600), `promptGenerationService.ts` (1521), `ImageGenerationService.ts` (958), `continuityCompositionService.ts` (703), `assetExtractionService.ts` (683), `videoGenerationService.ts` (675) are the largest backend services; each contains both DB access and prompt/context assembly (see sections 2 and 5).

## 2. Direct DB access

### 2.1 Backend layer split

| Layer | Table-literal `.from('x')` calls (non-test) | Files | Distinct tables | `.rpc(` calls |
|---|---:|---:|---:|---:|
| routes (`backend/src/routes`) | 561 (564 minus 3 storage) | 12 | 22 | 1 (`routes/streamline.ts:77` `streamline_commit_atomic`) |
| services (`backend/src/services`) | 237 (239 minus 2 storage) | 22 | 27 | 0 |
| other (`config/database.ts`, `utils/`, `middleware/`, `transformers/`) | 4 | 3 | - | 1 (`config/database.ts:48` `exec`, the migration runner path; wave-1 C08) |

Per-route-file table-call counts: projectAssets 132, projects 129, frames 115, sceneAssets 88, stageStates 25, styleCapsules 19, sceneStageLocks 14, assets 13, checkout 11, streamline 10, images 5, shotAssignments 3. Route files with no table-literal call: `llm.ts`, `health.ts`, `seed.ts`.

Route files importing the shared client `config/supabase`: 12 of 15. Services importing it: 21.

Wave-1 V-slices already document the table inventory (wave-1 `C-table-inventory.md`); this slice only counts call sites.

### 2.2 Frontend layer split

| Location | Direct table reads | Direct table writes | Storage calls | `supabase.auth.*` lines |
|---|---:|---:|---:|---:|
| `src/lib/services/*` (23 files) | 1 (`imageService.ts:147-151`, `projects` select `active_branch_id`) | 0 | 0 | 138 |
| `src/components/**` | 0 | 0 | 0 | 2 (`Stage4MasterScript.tsx:248,544`, `getSession`) |
| `src/hooks/useSceneInfo.ts` | 1 (`useSceneInfo.ts:25-29`, `scenes` select `scene_number, slug`) | 0 | 0 | 0 |
| `src/lib/stores/auth-store.ts` | 0 | 0 | 0 | 6 |
| `src/lib/supabase.ts` (client construction) | 0 | 0 | 0 | 3 |

Across `src` (non-test) the only supabase table access is the two reads above. `supabase.auth.getSession` is used 157 times, `signInWithPassword` 1, `signUp` 1, `signOut` 1, `onAuthStateChange` 1. Persistence writes go over HTTP to the backend (0 `insert|update|upsert|delete` calls on supabase in `src`).

## 3. Duplicated domain types

Field lists come from `node` extraction of the interface body (top-level property keys). `FE` = `src/`, `BE` = `backend/src/`.

### 3.1 Scene

| Definition | Field count | Casing | Notes |
|---|---:|---|---|
| FE `src/types/scene.ts:76` `Scene` | 17 | camelCase | `sceneNumber, slug, status, scriptExcerpt, header, ..., shots, continuityRisk, shotListLockedAt, isDeferred, assetInstances`. |
| FE `src/lib/services/scriptService.ts:7` `Scene` | 5 | camelCase | `id, sceneNumber, slug, heading, content`. Different `Scene` in same frontend. |
| BE `backend/src/services/continuityRiskAnalyzer.ts:18` `SceneData` | 5 | snake_case | `id, scene_number, slug, status, updated_at`. |
| BE `backend/src/utils/scriptManifest.ts:39` `ScriptManifestScene` | 9 | camelCase | `sceneNumber, heading, intExt, location, timeOfDay, characters, speakingCharacters, props, actionText`. |
| BE `backend/src/utils/scriptManifest.ts:19` `ParsedScene` | - | - | parser output (second scene shape in same file). |

Scene status union: FE `src/types/scene.ts:5-12` (6 values) equals DB `scenes_status_check` (`014_add_shot_list_locking_with_trigger.sql:19-27`, 6 values). Equal, no drift.

### 3.2 Shot

| Definition | Fields | Casing |
|---|---:|---|
| FE `src/types/scene.ts:50` `Shot` | 22 | mixed: `shotId, sceneId` camel but `camera_distance, camera_height, camera_movement, camera_direction_id, location_asset_id, location_match_confidence, location_match_source, location_match_notes, continuityFlags?`; the interface itself mixes both conventions. |
| BE `backend/src/services/promptGenerationService.ts:13` `ShotData` | 21 | snake_case (`shot_id, shot_order, characters_foreground, ...`) |
| BE `backend/src/services/shotMergeService.ts:12` `ShotRowForMerge` | 13 | snake_case |
| BE `backend/src/services/shotSplitService.ts:25` `OriginalShotRow` | 10 | snake_case |
| BE `backend/src/services/shotSplitService.ts:11` `ShotForInsert` | - | snake_case insert payload |
| BE `backend/src/services/shotValidationService.ts:28` `Shot` (local) | 9 | camelCase (`shotId, charactersForeground, ...`) |
| BE `backend/src/routes/projects.ts:32` `LocationResolvableShotRow` | 3 | partial shape |
| BE `backend/src/services/transformationEventService.ts:82` `ShotRef` | - | local |
| BE `backend/src/services/shotExtractionService.ts:20,40,53` `ExtractedShot`, `LLMShotCharacter`, `LLMShotRaw` | - | LLM output shapes |

Seven-plus shot shapes across two languages and at least three casings. `transformShotForClient` (`backend/src/routes/projects.ts:190`) and `toShotForInsert` (`shotSplitService.ts:71`) are hand-written mappers. FE `toBackendShotUpdate` (`src/lib/services/shotService.ts:51`) is a third.

### 3.3 Asset family

| Definition | Fields | Casing | Notes |
|---|---:|---|---|
| FE `src/types/asset.ts:3` `GlobalAsset` | 13 | snake_case | `id, user_id, name, asset_type, description, image_prompt, image_key_url, visual_style_capsule_id, voice_profile_id, version, created_at, updated_at, promoted_from_project_id` |
| FE `src/types/asset.ts:19` `ProjectAsset` | 22 | snake_case | includes `overridden_fields, last_synced_at, style_outdated, locked, deferred, scene_numbers` |
| FE `src/types/scene.ts:100` `SceneAsset` | 9 | camelCase | `sceneId, name, type, source, reviewStatus, description, imageKey, masterAssetId`. Different entity from `SceneAssetInstance`. |
| FE `src/types/scene.ts:113` `SceneAssetInstance` | 19 | snake_case | `scene_id, project_asset_id, description_override, image_key_url, status_tags, carry_forward, inherited_from_instance_id, project_asset, effective_description, modification_count, last_modified_field, modification_reason, use_master_as_is, selected_master_reference_url, selected_master_reference_source, selected_master_reference_instance_id, created_at, updated_at` |
| BE `backend/src/services/promptGenerationService.ts:57` `SceneAssetInstanceData` | 16 | snake_case | Shares 8 fields with FE (`id, project_asset, description_override, effective_description, status_tags, image_key_url, carry_forward, inherited_from_instance_id`). FE-only 11 (`scene_id, project_asset_id, modification_count, last_modified_field, modification_reason, use_master_as_is, selected_master_reference_url, selected_master_reference_source, selected_master_reference_instance_id, created_at, updated_at`). BE-only 8 (`master_image_url, angle_variants, matched_angle_url, location_views, matched_direction_view, establishing_view, location_delta_description, location_reference_strategy`). |
| BE `backend/src/services/storyContextService.ts:35` `InstanceWithAsset` | 4 | snake_case | partial projection |
| BE `backend/src/services/contextManager.ts:51` `LocalContextSceneAsset` | - | - | another projection |
| BE (no `ProjectAsset` / `GlobalAsset` type) | - | - | `project_assets` and `global_assets` rows are handled with `any`: `as any` appears 33 times in `backend/src/routes` and 17 times in `backend/src/services`; `: any` 102 times in routes (section 11). |

### 3.4 Frame

| Definition | Fields | Casing |
|---|---:|---|
| FE `src/types/scene.ts:327` `Frame` | 20 | camelCase |
| BE `backend/src/services/frameGenerationService.ts:11` `Frame` | 20 | camelCase, identical field list to FE |
| FE `src/lib/services/frameService.ts:67` `FrameGeneration` | 7 | camelCase |
| BE `backend/src/services/frameGenerationService.ts:86` `SelectedContinuityBaseFrameRow` | 4 | snake_case |
| BE `backend/src/services/continuityBaseService.ts:46` `ApprovedFrameRow` | 7 | snake_case |
| FE `src/types/scene.ts:314` `FramePair`, `:381` `FrameLink`, `:389` `FrameCostSummary`, `:394` `FrameJobStatus` | - | - |

`FrameStatus` union is defined in FE `src/types/scene.ts:323` and BE `backend/src/services/frameGenerationService.ts:7`, both `'pending'|'generating'|'generated'|'approved'|'rejected'`; DB CHECK `019_frames_table.sql:12-18` has the same five values.

### 3.5 StageState

| Definition | Fields | Notes |
|---|---:|---|
| FE `src/lib/services/stageStateService.ts:6` `StageState` | 10 | `id, branch_id, stage_number, version, status, origin, content, regeneration_guidance, created_at, created_by` |
| FE `src/lib/services/stageStateService.ts:3` `BackendStageStatus` | 5 | `'draft'|'locked'|'invalidated'|'outdated'|'skipped'` (equals DB) |
| FE `src/types/project.ts:7` `StageStatus` | 5 | `'locked'|'active'|'pending'|'outdated'|'skipped'` (differs; section 6) |
| FE `src/lib/services/sceneStageLockService.ts:3` `StageLockStatus` | 3 | `'draft'|'locked'|'outdated'` |
| BE `backend/src/services/continuityRiskAnalyzer.ts:29` `StageStateData` | 6 | `id, branch_id, stage_number, version, status, created_at` |
| BE `backend/src/services/continuityRiskAnalyzer.ts:34` status union | - | `'draft'|'locked'|'invalidated'|'outdated'` (no `skipped`) |
| BE `backend/src/routes/projects.ts:335` `StageStateRow` | 2 | inline `{ status: string; stage_number: number }` |
| BE `backend/src/routes/sceneStageLocks.ts:7` `StageLockStatus` | 3 | duplicate of FE definition |

### 3.6 StyleCapsule

| Definition | Fields | Casing |
|---|---:|---|
| FE `src/types/styleCapsule.ts:41` `WritingStyleCapsule` | 5 | camelCase `type, exampleTextExcerpts, styleLabels, negativeConstraints, freeformNotes` |
| FE `src/types/styleCapsule.ts:49` `VisualStyleCapsule` | 4 | camelCase `type, designPillars, referenceImageUrls, descriptorStrings` |
| FE `src/types/styleCapsule.ts:56` `StyleCapsule` = union | - | - |
| FE `src/types/styleCapsule.ts:76` `StyleCapsuleCreate`, `:96` `StyleCapsuleUpdate`, `:103` `StyleCapsuleResponse` | - | - |
| BE `backend/src/services/styleCapsuleService.ts:8` `StyleCapsule` | 16 | flat snake_case with `type` discriminator: `id, library_id, user_id, name, type, example_text_excerpts, style_labels, negative_constraints, freeform_notes, design_pillars, reference_image_urls, descriptor_strings, is_preset, is_favorite, created_at, updated_at` |
| BE `backend/src/transformers/styleCapsule.ts:6` `capsuleToApi(c: any)` | - | the only file in `backend/src/transformers/`; `c` is typed `any` |

The FE union is camelCase per variant; the BE row is flat snake_case; the single transformer module converts between them (`backend/src/transformers/styleCapsule.ts`, 57 lines, four functions taking `any`).

### 3.7 Other duplicated type definitions observed

- `ModelVariant` defined in FE `src/types/scene.ts:418` and BE `backend/src/services/videoGenerationService.ts:9`, plus an inline union in `backend/src/services/video-generation/VideoProviderInterface.ts:11`.
- `VideoJobStatus` union defined in FE `src/types/scene.ts:473` and BE `backend/src/services/videoGenerationService.ts:10`, both six values equal to DB `021_video_generation_jobs.sql:20-27`.
- Stream-line draft shape: `StreamlineAssetDraft` in FE `src/lib/services/streamlineService.ts:33` and `src/lib/utils/streamlineRouting.ts:14`; `StandaloneAssetDraft` in BE `backend/src/services/streamlineStandaloneAssetService.ts:13`.
- Question shape: FE `StreamlineQuestion` (`streamlineService.ts`) vs `AskAuteurQuestion` (`src/components/pipeline/streamline/AskAuteurQuestionUI.tsx:7`).
- Consistent with wave-1 PRESSURE-0004 (`WD-IMPL-PRESSURE-0004`); names re-checked by grep only, field lists not extracted.

## 4. Provider and model branching

### 4.1 Provider SDK paths (Google)

| Path | Import | Used by |
|---|---|---|
| LangChain Gemini | `@langchain/google-genai` (`backend/src/services/llm-client.ts:6`) | `LLMClient.generate` and `estimateCost` (general text generation; callers are `routes/llm.ts` and 16 service files, found by grep for `llmClient`) |
| `@google/generative-ai` | `backend/src/services/imageAnalysisService.ts:6`, `backend/src/services/image-generation/NanoBananaClient.ts:1` | image analysis (4 `getGenerativeModel` calls, all `gemini-2.5-flash`) and image generation (2 calls, `gemini-2.5-flash-image`) |
| REST via `google-auth-library` to `aiplatform.googleapis.com` | `backend/src/services/video-generation/Veo3Provider.ts:11`, `:107` | Veo video generation (long-running predict + poll) |

Three different SDK or transport paths for Google models in one backend.

### 4.2 Model identifiers and fallbacks

Hard-coded model id literal occurrences (non-test backend): `veo_3_1_fast` 11 (variant key), `veo_3_1_standard` 5, `gemini-2.5-flash` 4, `veo3` 3 (provider name), `gemini-2.5-flash-lite` 3, `gemini-2.5-flash-image` 2, `gemini-1.5-flash` 2, `veo-3.1-generate-001` 1, `veo-3.1-fast-generate-001` 1, `nano-banana` 1 (provider name), `gemini-1.5-pro` 1, `gemini-1.0-pro` 1, `gemini` 1 (tag). Files with model-id literals: 10.

Same env var, three different default values inside one file:

| Location | Expression |
|---|---|
| `backend/src/services/llm-client.ts:76` (constructor) | `process.env.GEMINI_MODEL \|\| 'gemini-2.5-flash-lite'` |
| `backend/src/services/llm-client.ts:106` (`generate`) | `request.model \|\| process.env.GEMINI_MODEL \|\| 'gemini-1.5-flash'` |
| `backend/src/services/llm-client.ts:310` (`estimateCost`) | `request.model \|\| process.env.GEMINI_MODEL \|\| 'gemini-2.5-flash-lite'` |

`generate` constructs a fresh `ChatGoogleGenerativeAI` for each request with the request-level model (`llm-client.ts:130-137`), so the constructor-level default at `:76` is not the one used on that path. `GEMINI_MODEL` is read 3 times in total (`llm-client.ts` only).

Pricing and token table keys: `backend/src/utils/token-utils.ts:28,32,36,40` (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.0-pro`, `gemini-2.5-flash-lite`). Not the same set as the models used at `imageAnalysisService.ts` (`gemini-2.5-flash`) or `NanoBananaClient.ts` (`gemini-2.5-flash-image`).

### 4.3 Video provider selection

- `backend/src/services/video-generation/createVideoProvider.ts:18` `process.env.VIDEO_PROVIDER || 'mock'`; `switch` at `:20-27` with `case 'veo3'` and `default` (mock). Module-level singleton cache (`:14`).
- Veo requires `GOOGLE_CLOUD_PROJECT` (`Veo3Provider.ts:41-46`); missing env throws at call time, not at startup.
- `process.env` reads in backend non-test: 27 (`NODE_ENV` 7, `GOOGLE_AI_API_KEY` 6, `LANGSMITH_API_KEY` 4, `SUPABASE_URL` 3, `GEMINI_MODEL` 3, `VIDEO_PROVIDER` 2, `GOOGLE_CLOUD_PROJECT` 2, `GOOGLE_CLOUD_LOCATION` 2, plus 6 singletons).
- `GOOGLE_AI_API_KEY` is checked in 4 places with 4 different behaviours: `llm-client.ts:91` (`validateEnvironment` throws), `imageAnalysisService.ts:25-27` (throws `'GOOGLE_AI_API_KEY not configured'`), `NanoBananaClient.ts:21-23` (same message), `llm.ts:143` (`hasGoogleAIKey` reported in a status endpoint).

### 4.4 Veo variant branching and pricing duplication

- `'veo_3_1_fast'` literal: 12 sites in backend non-test, 10 in frontend non-test.
- Per-second rate constants `0.15` (fast) and `0.40` (standard) appear in: `backend/src/services/videoGenerationService.ts:6-7` (exported `VEO_31_FAST_RATE`, `VEO_31_STANDARD_RATE`), `backend/src/services/video-generation/Veo3Provider.ts:158` (literal ternary), `backend/src/services/video-generation/MockVideoProvider.ts:44` (literal ternary), `src/lib/services/checkoutService.ts:243` (literal ternary). Frontend `checkoutService.ts:250` also maps variant to display name.
- Cost calc is repeated in `videoGenerationService.ts:95`, `:197-198`, `:329`, `:350`.
- Checkout validation list `['veo_3_1_fast','veo_3_1_standard']` at `backend/src/routes/checkout.ts:98` and default `'veo_3_1_fast'` at `:94`.

## 5. Duplicated prompt and context construction

### 5.1 Style capsule resolution (same logic copied)

`StyleCapsuleService.getCapsuleById` is called from 7 sites:

| Site | Source of capsule id | Catch behaviour |
|---|---|---|
| `backend/src/services/contextManager.ts:130` | `globalContext`/project param | (not re-checked) |
| `backend/src/services/contextManager.ts:146` | same | (not re-checked) |
| `backend/src/routes/frames.ts:572` (generate-frames path; block at `:568-574`) | `project.visual_style_capsule_id` | empty `catch {}` at `:573` |
| `backend/src/routes/frames.ts:2219` (block at `:2215-2222`) | `project.visual_style_capsule_id` | empty `catch {}` at `:2220` |
| `backend/src/services/frameGenerationService.ts:784` (block at `:776-786`) | function param, then `projects.user_id` re-fetched | empty `catch {}` at `:786` |
| `backend/src/routes/projects.ts:3743` (block at `:3739-3749`) | `project.visual_style_capsule_id` | `console.warn` at `:3747` |
| `backend/src/routes/llm.ts:244` | `validatedRequest.variables.writing_style_capsule_id` | logs (`llm.ts:227,256` see section 9) |

Four copies of the same "load capsule for project, swallow failure" block (`frames.ts` twice, `frameGenerationService.ts`, `projects.ts`), each with a different catch policy.

### 5.2 Style-injection formatting

- `formatWritingStyleInjection` (`styleCapsuleService.ts:330`) has 7 call sites: `contextManager.ts:386,612,631,650`, `llm.ts:208,250`, plus its definition.
- `formatVisualStyleInjection` (`styleCapsuleService.ts:366`) has zero call sites in `backend/src` (definition only; no test references).
- `buildStyleContext` (`promptGenerationService.ts:761`) plus three callers (`:912`, `:1291`, `:1371`).
- Visual-style context getters: `assetExtractionService.ts:657` `getStyleContext(styleId)` (2 lines) and `image-generation/ImageGenerationService.ts:639` `getVisualStyleContext(capsuleId)` (3 lines). Two independent implementations of "visual style for an asset".

### 5.3 Global context and story context

- `ContextManager.assembleGlobalContext` (`contextManager.ts:102`) has 3 callers: `routes/llm.ts:198`, `services/streamlineBackfillService.ts:59` and `:108`.
- `ContextManager.assembleLocalContext` (`contextManager.ts:208`) has zero callers (definition only).
- `StoryContextService.assembleSceneStoryContext` (`storyContextService.ts:52`) is called from `:170` and `:200` only (inside the same service).
- Beat-sheet and master-script loads are duplicated: `contextManager.ts:534` `fetchBeatSheet` (reads `stage_states.content.beats`, stage 3) and `contextManager.ts` `fetchMasterScriptSummary` (stage 4), plus `storyContextService.ts` reads. Code comment at `contextManager.ts:509-511`: "Same query shape as fetchBeatSheet/fetchMasterScriptSummary".
- Stage-content reads by stage number literal (`stage_number', 2|3|4|5)` in `.eq(` chains): 27 sites: `routes/projectAssets.ts` 10, `routes/frames.ts` 5, `routes/sceneAssets.ts` 3, `routes/projects.ts` 2, `routes/stageStates.ts` 1, `services/storyContextService.ts` 2, `services/contextManager.ts` 2, `services/streamlineBackfillService.ts` 1, `services/assetExtractionService.ts` 1.

### 5.4 Location context

- `locationResolverService.loadProjectLocationContext` (`locationResolverService.ts:309`) is called from 12 call sites in `routes/projects.ts` (lines 1565, 1784, 2028, 2077, 2224, 2302, 2385, 2452, 2501, 2554, 2706, 2930) plus the definition.
- Shot list GET (`projects.ts:1566-1570`) maps `transformShotForClient` over all shots. `transformShotForClient` (`projects.ts:190`) calls `buildShotLocationState` (`:79`), which calls `locationResolverService.resolveShotLocation` (`:93`). So each shot is resolved in the request, against one loaded context.

### 5.5 Asset-description and prompt helpers

- `buildAssetContext` (`promptGenerationService.ts:673`) plus three callers (`:911`, `:1290`, `:1370`).
- Asset-description composition references (`image_prompt|description_override|effective_description`): `routes/sceneAssets.ts` 29, `routes/projectAssets.ts` 25, `services/assetInheritanceService.ts` 14, `routes/assets.ts` 8, `services/storyContextService.ts` 4, `services/shotAssetAssignmentService.ts` 3, `services/continuityCompositionService.ts` 3, `routes/projects.ts` 3, `services/textFieldVersionService.ts` 2, `services/promptGenerationService.ts` 1, `routes/frames.ts` 1. No single composer function (`grep` for `buildAssetDescription|assembleDescription|composeDescription` returned none).
- Inline system prompts (`"You are "` text): 19 backend files, most frequent `promptGenerationService.ts` (5), `imageAnalysisService.ts` (4), `storyContextService.ts` (3), `routes/seed.ts` (3).
- `buildSystemPrompt` and `buildUserPrompt` are each defined in two services with the same names: `streamlineReconciliationService.ts:45,62` and `streamlineQuestionService.ts:49,73`.
- `buildRelevancePrompt` (`sceneAssetRelevanceService.ts:159`), `buildReuseEditPrompt` (`frameGenerationService.ts:542`), `buildInferencePrompt` (`storyContextService.ts:366`): private, one each.

### 5.6 Two scene parsers (front and back)

- FE `scriptService.extractScenes` (`src/lib/services/scriptService.ts`): 9 call sites (`Stage1InputMode.tsx`, `sceneService.ts`, `scriptService.ts`, `Stage4MasterScript.tsx`).
- BE `extractManifest(tiptapDoc)` (`backend/src/utils/scriptManifest.ts`): 8 call sites (`routes/projects.ts:1305`, `routes/projectAssets.ts:200`, `services/assetExtractionService.ts:295`, `services/sceneDependencyExtraction.ts` x4).
- Stage 4 approve persists the FE-parsed scene list (`Stage4MasterScript.tsx:613`) and BE uses the TipTap-derived manifest for dependencies (`projects.ts:1301-1305`). Stage 1 streamline import repeats the same extraction and persistence in-line: `Stage1InputMode.tsx:486-497` with comment "replicate it here".
- Header regex for scene headings appears in FE `scriptService.ts` (4 occurrences), `Stage4MasterScript.tsx` (2), `ContentAccessCarousel.tsx` (1), `src/lib/utils/screenplay-converter.ts` (1), and BE `scriptManifest.ts` (2), `sceneDependencyExtraction.ts` (2), `routes/projectAssets.ts` (2), `routes/seed.ts` (9).

### 5.7 Token budgets and temperatures

- `maxTokens: <literal>` 22 sites and `temperature: <literal>` 22 sites in backend non-test (examples: `streamlineFormattingService.ts:32` 2048, `:52` 4096; `shotSplitService.ts:154` 3072/2048; `streamlineClassificationService.ts:46` 200; `shotExtractionService.ts:454` 4096).
- Route-level cap `maxTokens: z.number().max(8192)` (`routes/llm.ts:25,56`). Default when unset: `llm-client.ts:137` `request.maxTokens ?? 4096`.
- Frontend `maxTokens` references: 0.
- Treatment template asks for "3 complete treatments ... 800-1200 words" (`backend/scripts/seed-templates.ts:43`). Wave-1 PRESSURE-0001 (truncation vs 4096) re-checked: the 4096 default applies on the `llm.ts` generate path only if the request omits `maxTokens`; frontend never sends `maxTokens`, so the default applies. Confidence M (I did not trace every template route).

## 6. Same concept, different representation

### 6.1 Stage numbers and names

| Surface | Stage 1..12 labels observed |
|---|---|
| `pages/ProjectView.tsx:30-34` (Phase A list) | 1 `Input`, 2 `Treatment`, 3 `Beat Sheet`, 4 `Script`, 5 `Assets` |
| `components/pipeline/UnlockWarningDialog.tsx:23-35` `STAGE_NAMES` | 1 `Input`, 2 `Treatment`, 3 `Beat Sheet`, 4 `Master Script`, 5 `Assets`, **no 6**, 7 `Shot List`, 8 `Visual Definition`, 9 `Prompt Segmentation`, 10 `Frame Generation`, 11 `Confirmation`, 12 `Video Generation` |
| `components/pipeline/SceneWorkflowSidebar.tsx:26-33` | 7 `Shot List`, 8 `Visuals`, 9 `Prompts`, 10 `Frames`, 11 `Review`, 12 `Video` |
| `config/stageInfoContent.ts:40-104` (titles) | 4 `Master Script`, 6 `Script Hub`, 7 `Shot List`, 8 `Visual Definition`, 9 `Prompt Segmentation`, 10 `Frame Generation`, 11 `Confirmation`, 12 `Video Generation` |
| `pages/Landing.tsx:19` (`06 Script Hub`) | 6 `Script Hub` |

Stage 6 is a navigation hub in the UI (ProjectView branches on `stage === 6`, `ProjectView.tsx:431-435`) but there is no `stage_number = 6` write or read in backend (grep for `stage_number: 6|stageNumber: 6|stage_number', 6` returned 0).

Literal stage-number comparisons: 13 in frontend non-test, 31 in backend non-test.

Per-endpoint stage range rules for the same `stage_states` resource:

| Endpoint | Accepted range | Location |
|---|---|---|
| `GET /:projectId/stages/:n` | 1..12 | `routes/stageStates.ts:68` |
| `PUT /:projectId/stages/:n` | 1..12 | `:138` |
| `POST .../lock` | 1..12 | `:310` |
| `POST .../skip` | `[2,3,4]` only | `:422` |
| `POST .../unlock` | 1..5 | `:530` |
| `/scenes/:sceneId/stage-locks/:n/*` (separate table JSON) | 7..12 | `routes/sceneStageLocks.ts:62,152,296` |

### 6.2 Status vocabularies

| Concept | DB CHECK | BE TS | FE TS | Observation |
|---|---|---|---|---|
| stage_states.status | `001:58` 4 values, widened to 5 by `041_stage_states_skip_and_commit.sql:29-32` (`draft,locked,invalidated,outdated,skipped`) | `stageStates.ts:150` same 5 | `stageStateService.ts:3` `BackendStageStatus` same 5 | `types/project.ts:7` `StageStatus` = `locked,active,pending,outdated,skipped`: two values not in DB (`active,pending`), and `draft,invalidated` missing. `ProjectView.tsx:61-69` maps DB `draft` to UI `active`; default `pending` (`:31-34`). |
| scene lock JSON (`scenes.stage_locks`) | column only in `backend/quickies-sql/add_stage_locks.sql:1` (no migration) | `sceneStageLocks.ts:7` `draft,locked,outdated` | `sceneStageLockService.ts:3` same | No `invalidated`. Unlock writes `outdated` for downstream (`projects.ts:3146-3148`) where stage_states would use `invalidated`. |
| scenes.status | `003:17-23`, `014:19-27` (6) | - | `src/types/scene.ts:5-12` (6) | equal |
| frames.status | `019_frames_table.sql:12-18` (5) | `frameGenerationService.ts:7` (5) | `scene.ts:323` (5) | equal, but unlock writes `'invalidated'` (`projects.ts:3108`), not in CHECK (section 7.5) |
| video job status | `021:20-27` (6) | `videoGenerationService.ts:10` (6) | `scene.ts:473` (6) | equal |
| project type | `001:13` `narrative,commercial,audio_visual` | `projects.ts:684` `audio_visual`; `contextManager.ts:15` `audio_visual` | `types/project.ts:31` `'audio-visual'`; `Stage1InputMode.tsx:92` option id `'audio-visual'` | mismatch on hyphen vs underscore (wave-1 C09 re-checked) |
| project status | no `status` column in `001` `projects` table (`001:5-22`); no ALTER found | - | `types/project.ts:1-5` `ProjectStatus` = `draft,in-progress,complete,archived` | type with no column; `in-progress` appears 1 time in `src` non-test |
| scene invalidation / lock | `014` trigger changes `scenes.status` on `shot_list_locked_at` change (`:31-58`) | `projects.ts:2975-2977` sets `shot_list_locked_at` and `stage_locks` (key `'7'`, `:2971`) | `Stage7ShotList.tsx:700-701` also writes stage-lock | three representations of shot-list lock (section 7.2) |

### 6.3 Case conventions and transformers

| Metric | Count (regex) |
|---|---:|
| Backend `camelKey: x.snake_prop` object-literal lines (routes + services) | 385 |
| Backend `snake_key: x.camelProp` lines (routes + services) | 138 |
| Frontend `camelKey: x.snake_prop` lines (`src/lib`, `src/components`, `src/hooks`, `src/pages`) | 39 |
| Frontend snake-keyed request-body lines (`src/lib`) | 40 |
| Dedicated transformer modules | 1 (`backend/src/transformers/styleCapsule.ts`, 57 lines) |
| Hand-written mappers | `routes/projects.ts:190` `transformShotForClient`; `services/shotSplitService.ts:71` `toShotForInsert`; FE `lib/services/shotService.ts:51` `toBackendShotUpdate`. A regex for `(map|to|from|transform)\w*(Row|Shot|Scene|Asset|Frame|Client|Db|Api)\(` also matched 10 lines in each of `services/frameGenerationService.ts` and `routes/projects.ts`; those lines were not individually classified. |

### 6.4 Visual style capsule identifier

Five identifier spellings for the same concept:

| Identifier | Backend occurrences | Frontend occurrences | Where it lives |
|---|---:|---:|---|
| `visualStyleCapsuleId` | 72 | 21 | request bodies, stage-state content, locals |
| `visual_style_capsule_id` | 55 | 13 | `projects`, `project_assets`, `global_assets` columns (`004:63`, `008:22,64`, `007:54`) |
| `locked_visual_style_capsule_id` | 9 | 7 | `stage_states.content` for stage 5 (`Stage5Assets.tsx:227`) |
| `writingStyleCapsuleId` | 4 | 25 | request bodies, project params |
| `writing_style_capsule_id` | 5 | 5 | `projects` column (`004:62`) and LLM template variables (`routes/llm.ts:236-245`) |

Read paths (`frames.ts`, `projects.ts`, `frameGenerationService.ts`, `contextManager.ts`) use `projects.visual_style_capsule_id` or `stage_states.state_data.visualStyleCapsuleId`; the Stage 5 write path uses `stage_states.content.locked_visual_style_capsule_id`. See section 7.4 and PRESSURE-19.

### 6.5 Scene asset and project asset "description" fields

Five fields carry description-like text: `description` (`project_assets`), `image_prompt` (`project_assets`, `global_assets`), `description_override` and `effective_description` (`scene_asset_instances`), and `field_versions` rows keyed by `description_override` (`routes/sceneAssets.ts:2111-2194`). Wave-1 V5/V6 cover the semantics.

## 7. Mutation fan-out

Each row lists the frontend trigger, the route, and every table write or service call in the handler body (regex-verified; `.from` plus write verb).

### 7.1 Script approve (Stage 4 and Stage 1 streamline import)

| Step | Location | Effect |
|---|---|---|
| UI approve | `Stage4MasterScript.tsx:613` `scriptService.persistScenes` | PUT `/api/projects/:id/scenes` |
| BE save | `backend/src/routes/projects.ts:1217` | reads scenes `:1249`; computes match by slug+number (`:1262-1290` region) with number-only fallback; deletes unmatched scenes `:1430-1434` (`.in('id', deletedIds)`; on error it logs and continues, `:1436-1438`); updates matched scenes; inserts new scenes |
| Dependency extraction | `projects.ts:1301-1305` `extractManifest(tiptapDoc)`; fallback `:1338-1346` `sceneDependencyExtractionService.extractDependencies` (LLM) when `dependenciesMap.size === 0` | see PRESSURE-30 |
| UI lock | `Stage4MasterScript.tsx:616` `stageStateService.lockStage(projectId, 4)` | POST `/stages/4/lock` |
| BE lock | `routes/stageStates.ts:297` | reads project, reads stage_states `:331-341`; sequential check `:344-370`; INSERT new `stage_states` version `:382` |
| Shell lock | `Stage4MasterScript.tsx:621` `onComplete()` (after `lockStage`); `ProjectView.tsx:958` passes `onComplete={() => handleStageComplete(4)}`; `handleStageComplete` calls `stageStateService.lockStage` at `ProjectView.tsx:449` | second POST, second stage_states version row (no already-locked guard in `stageStates.ts:297-330`) |
| Cascade (DB) | `ON DELETE CASCADE` from `scenes`: `shots` (`006:7`), `scene_asset_instances` (`015:15`), `video_generation_jobs` (`021:10`), `scene_asset_suggestions` (`024:6`), `transformation_events` (`030:17`), `image_generation_jobs` (`007:13`) | deleted scenes remove dependent rows; wave-1 C15 |

Consequence in code: a single Stage 4 approve produces two `stage_states` version rows for stage 4 and may delete scenes with their dependent rows.

### 7.2 Shot-list lock (Stage 7)

| Step | Location | Effect |
|---|---|---|
| UI | `Stage7ShotList.tsx:697-699` `shotService.lockShotList(projectId, sceneId, force)` | POST `/scenes/:sceneId/shots/lock` |
| BE | `routes/projects.ts:2845` | reads scene `:2873`; reads shots after the scene fetch (`:2906` region); validates (`shotValidationService`, `loadProjectLocationContext`); UPDATE scenes `:2975-2991` sets `shot_list_locked_at`, `updated_at`, `stage_locks` (`'7': {status:'locked'}`); `.is('shot_list_locked_at', null)` guard |
| DB trigger | `014_add_shot_list_locking_with_trigger.sql:31-58` `BEFORE UPDATE ON scenes` | sets `scenes.status = 'shot_list_ready'` on lock; no RAISE |
| UI second write | `Stage7ShotList.tsx:700-701` `lockStageViaHook(7)` (`useSceneStageLock`) | POST `/scenes/:sceneId/stage-locks/7/lock` (`sceneStageLocks.ts:56`), writes `scenes.stage_locks` JSON |
| UI third write | `ProjectView.tsx:589-600` `handleSceneStageComplete` (called as Stage 7 `onComplete`, `ProjectView.tsx:784-790`) | `sceneStageLockService.lockStage(projectId, activeSceneId, sceneStage)` again |

### 7.3 Shot-list unlock (Stage 7)

| Step | Location | Effect |
|---|---|---|
| UI | `Stage7ShotList.tsx:812` `confirmUnlockViaHook(7)`, then `:814-817` `shotService.unlockShotList(...)` in a try whose catch is empty (best-effort) | two calls, two systems |
| BE | `routes/projects.ts:3020` | reads scene `:3041-3050`; when downstream work exists, counts frames `:3076-3083` and videos `:3078,3115` (see 7.5); on confirm: UPDATE frames `:3106-3109` `status='invalidated'` (unchecked); UPDATE videos `:3114-3117` (unchecked); INSERT invalidation_logs `:3123` (in try/catch, comment "if invalidation_logs table exists"); UPDATE scenes `:3153-3157` sets `shot_list_locked_at = null` and `stage_locks` (`'7': draft`; downstream lock `outdated` at `:3146-3148`) |
| DB trigger | `014:31-58` | reverts `scenes.status` to `draft` only if it was `shot_list_ready` |

### 7.4 Style change (Stage 5 visual style)

| Step | Location | Effect |
|---|---|---|
| Lock style | `Stage5Assets.tsx:220-236` `handleStyleLock` | local state and `setContent({locked_visual_style_capsule_id, ...})`; persisted by `useStageState` autosave (`Stage5Assets.tsx:106` `autoSave: true`) |
| Autosave | `stageStates.ts:120` PUT `/stages/5` | INSERT stage_states version `:247`; INSERT `style_capsule_applications` only if `styleCapsuleMetadata.styleCapsuleId` supplied (`:259-275`) |
| Mark outdated | `Stage5Assets.tsx:262` `handleStyleChangeMarkOutdated` to `projectAssets.ts:1587` | UPDATE `project_assets SET style_outdated = true` for branch assets with `image_key_url` (`:1604-1618`) |
| Clear images | `Stage5Assets.tsx:290` `handleStyleChangeClearImages` to `projectAssets.ts:1631` | UPDATE `project_assets SET image_key_url = null, style_outdated = false` (`:1651`) |
| Clear flag | `ImageGenerationService.ts:406-409` | clears `style_outdated` on successful regeneration |
| Readers of stage-5 capsule id | `projectAssets.ts:78,305,1174,1484,2578`; `sceneAssets.ts:375,459,1999`; `projectAssets.ts:1835` | 9 backend reads of `locked_visual_style_capsule_id` |
| Readers of project capsule id | `frames.ts:527,569,2156,2216`; `projects.ts:3584,3740`; `contextManager.ts:499` | reads of a column with no writer (PRESSURE-19) |
| Readers of frame capsule id | `frames.ts:261-267,384-390,448-454,766-772,844-850` | reads `stage_states.state_data` (no such column) and `project_id` on stage_states (no such column) |

### 7.5 Asset lock

| Step | Location | Effect |
|---|---|---|
| Lock one | `projectAssets.ts:1527` `POST /assets/:assetId/lock` | UPDATE `project_assets SET locked = true` (`:1565`) |
| Lock all | `projectAssets.ts:1675` | UPDATE `locked = true` `.in('id', ...)` (`:1729`) |
| Unlock | none | `locked: false` appears only in create/clone paths (`projectAssets.ts:127,351,1052,1187`); no UPDATE sets `locked` to false |
| Enforcement | PUT `:574-588` (with `isAllowedWhenLocked` carve-out), DELETE `:690-704`, merge `:767-771`, split `:1017`, sync `:2084` | generation, upload, analyze and edit handlers (`:1210`, `:1288`, `:1380`, `:1436`) contain no `locked` check |

### 7.6 Scene defer

| Step | Location | Effect |
|---|---|---|
| UI | `Stage6ScriptHub.tsx:158-159` `sceneService.deferScene` then local `setScenes(... isDeferred: true)` (no query invalidation); `Stage7ShotList.tsx:490` (defer last shot) | local patch |
| BE | `routes/projects.ts:1135` PUT `/scenes/:sceneId/defer`; `:1163` UPDATE `scenes SET is_deferred = true` | single column write |
| Readers | `projects.ts:1042` select and `:1119` mapping; `Stage6ScriptHub.tsx` (11 references) | no service-layer reader in `backend/src/services` |
| Restore | `projects.ts:1176`; `:1204` UPDATE `is_deferred = false` | |

### 7.7 Shot mutations and the shot-list lock

Shot-mutating handlers that do not reference `shot_list_locked_at` (grep across `projects.ts`): PUT shot `:2399`, reorder `:1980`, camera-direction `:2180`, location `:2316`, split `:2515`, merge `:2657`, DELETE shot `:2791`. Shot-list lock state is referenced only in the list GET (`:1042,:1085`) and the lock/unlock handlers (`:2873-3155`). Stage 7 autosave writes shots through PUT `:2399` (debounce, `Stage7ShotList.tsx:125,252-286`).

## 8. Temporal coupling, ordering, polling

- Stage lock requires a pre-existing `stage_states` row: `routes/stageStates.ts:331-341` returns 404 `'Stage state not found'` when no row exists for `(branch_id, stage_number)`. Rows are created only by the PUT handler (INSERT at `:247`, after an existing-row check at `:188-198`). Project creation writes no stage rows: `routes/projects.ts:553-640` inserts into `projects` only; the `create_initial_branch` trigger (`001_initial_schema.sql:166-186`) inserts a branch only.
- Sequential lock rule: `stageStates.ts:344-370` checks previous stage locked or skipped; wave-1 notes three enforcement layers (`WD-IMPL-PRESSURE-0002`), re-verified only the Node layer here.
- Skip restricted to stages 2-4 at `stageStates.ts:422`.
- Stage 8 auto-populate ordering: `Stage8VisualDefinition.tsx:240-272`: for scene 2+ `inheritAssets` then `populateFromDependencies`, for scene 1 only `populateFromDependencies`; guarded by `autoPopulateAttempted` ref (`:208,:241`), so it runs at most once per scene mount. Catch at `:262-265` logs and the comment at `:265` reads "Silently fail".
- Shot-asset auto-populate is a separate hook used by two stages: `Stage8VisualDefinition.tsx:302` and `Stage9PromptSegmentation.tsx:150` both call `shotAssetAssignmentService.autoPopulate` (POST `auto-populate`, `shotAssignments.ts:251`).
- Background execution is in-process and fire-and-forget: `ImageGenerationService.ts:178-180` (`executeJobInBackground`, not awaited); `videoGenerationService.ts:416-418` (`triggerJobProcessing` dynamic import, not awaited); `VideoJobExecutor.ts:15,28-33,54` concurrency guard is a module-level boolean. `VideoJobExecutor` loops `fetchNextQueuedJob` until empty with 500 ms spacer (`:39-49`). No recovery or re-queue for stuck `processing` jobs was found (grep `stuck|recover|orphan|requeue` in services and routes: 0 relevant hits).
- Polling-as-orchestration (frontend): `Stage10FrameGeneration.tsx:252-260` `refetchInterval` 2000 ms while any frame is generating; `Stage12VideoGeneration.tsx:59-69` 3000 ms while any job is in `queued|processing|generating|uploading`; `Stage6ScriptHub.tsx:128` `setInterval` 10000 ms `loadRenderStatuses`; `AssetVersionSync.tsx:42`; `AngleVariantsDialog.tsx:63`; `AssetDialog.tsx:205`. `setTimeout` poll loops: `sceneAssetService.ts:430` (`pollIntervalMs`, until every item completed or failed), `Stage8VisualDefinition.tsx:449` (60 x 2000 ms image job poll), `Stage8/VisualStateEditorPanel.tsx:230`.
- Polling-as-orchestration (backend): `video-generation/Veo3Provider.ts:224-232` polls the Veo long-running operation (`POLL_INTERVAL_MS`); `VideoJobExecutor.ts:39-49` polls the queue.
- Duplicate lock paths (component plus shell), summarised: Stage 4 (2 stage-4 locks, section 7.1); Stage 7 (3 scene-lock writes, 7.2); Stage 12 (`Stage12VideoGeneration.tsx:237` `try { await lockStage(12) } catch {}` (best-effort), plus `ProjectView.tsx:589-600` for the same scene stage).

## 9. Swallowed errors and silent fallbacks

### 9.1 Backend routes (`backend/src/routes`, 12 files, catch blocks by body classification)

| Class | Count | Examples |
|---|---:|---|
| Responds to client (`res.status`/`res.json`) | 197 | typical handler |
| Log only (`console.*`, no response, no rethrow) | 13 | `projectAssets.ts:1997,2024,2116`; `projects.ts:1332,1354,3132,3383,3747,3827`; `sceneAssets.ts:269`; `seed.ts:196`; `stageStates.ts:277`; `streamline.ts:227` |
| Log plus fallback value | 3 | `llm.ts:227` (global context failure sets `writing_style_context = ''`), `llm.ts:256`, `streamline.ts:294` (classification defaults to `Unnamed subject`) |
| Empty | 2 | `frames.ts:573` and `frames.ts:2220` (style capsule load; comment only) |
| Fallback without log | 2 | `projectAssets.ts:2132` (JSON.parse, `[]`), `sceneAssets.ts:1438` (per-item result push) |

Fire-and-forget `.catch` on non-awaited promises: 6 sites (`routes/shotAssignments.ts:147,180,208,236` `invalidateStage9AndDownstream(...).catch(warn)`; `routes/projects.ts:2637`; `routes/frames.ts:649`) plus one awaited `Promise.all(versionPromises).catch(warn)` at `projects.ts:3889`. `invalidateStage9AndDownstream` is not awaited before the response (`shotAssignments.ts:147` etc.).

### 9.2 Backend services (`backend/src/services`)

| Class | Count | Examples |
|---|---:|---|
| Rethrow or throw | 33 | - |
| Log plus fallback | 12 | `shotExtractionService.ts:316,324`; `frameGenerationService.ts:1356`; `ImageGenerationService.ts:412,549`; `NanoBananaClient.ts:51` |
| Log only | 12 | `contextManager.ts:138,154,166,177,190` (five log-only catches in one file); `videoGenerationService.ts:420,534`; `frameGenerationService.ts:1592`; `llm-client.ts:159`; `VideoJobExecutor.ts:51`; `ImageGenerationService.ts:903` |
| Empty | 2 | `promptGenerationService.ts:1493` (JSON parse, intentional), `frameGenerationService.ts:786` (style capsule) |
| Fallback without log | 4 | `transformationEventService.ts:507`, `locationResolverService.ts:154`, `storyContextService.ts:224`, `llm-client.ts:352` |

### 9.3 Unchecked Supabase results (routes and services)

- Single-line destructures `const { data... } = await supabase` with no `error` on the same line: 136 in `backend/src/routes` (regex; error may be checked on a following line, so this is an upper bound on unchecked reads).
- Bare statements `await supabase...` (result discarded): 53 in `backend/src/routes`, 32 in `backend/src/services`.
- Concrete instances in the unlock path: `projects.ts:3106-3109` (frames UPDATE), `:3114-3117` (videos UPDATE), both with no error check; `projects.ts:3076-3083` (video and frame counts, error not destructured, so `videosAffected` becomes 0 on any error); `sceneStageLocks.ts:211-219` (same pattern for frames and videos).
- `frames.ts:261-267` (and four siblings): `.select('state_data')` with `.single()`; only `data` is destructured. Because `state_data` does not exist (section 6.4), the value silently becomes `undefined`.

### 9.4 Frontend

Non-test `src/**` catch blocks: 19 empty, 102 console-only, 81 other.

Empty catches include `Stage7ShotList.tsx:701` and `:816` (best-effort lock/unlock), `Stage12VideoGeneration.tsx:237` (best-effort lock), `Stage8VisualDefinition.tsx:493` and `:531`, `Landing.tsx:107`, `beatService.ts:475`.

## 10. Auth and ownership

### 10.1 Global auth

`authenticateUser` (`backend/src/middleware/auth.ts`) verifies the bearer token with `supabase.auth.getUser(token)` and sets `req.user`. Applied per mount in `server.ts:49-84`. `req.user` referenced 187 times in route files.

### 10.2 Ownership checks

- Routes with a project path parameter: 176 of 198 handler registrations.
- Of those, 168 reference `user_id`, `req.user`, `userId`, or `verifyProjectOwnership`. Eight project-parameterised handlers reference none (section 10.3).
- Inline project lookups `from('projects')` in routes: 158 (per-file: `projectAssets.ts` 37, `frames.ts` 28, `sceneAssets.ts` 29, `projects.ts` 31, `streamline.ts` 8, `checkout.ts` 8, `stageStates.ts` 9, `sceneStageLocks.ts` 4, `assets.ts` 1, `images.ts` 2, `shotAssignments.ts` 1).
- Literal 404 `'Project not found'` returned inline: 150 times in routes.
- `.eq('user_id', userId)` inline in routes: 167 times.
- Shared helper `verifyProjectOwnership(userId, projectId, sceneId)` defined once at `routes/shotAssignments.ts:36`, used 8 times, all inside `shotAssignments.ts`. No other route imports it.

### 10.3 Ownership gaps (handlers with project param and no user reference)

| Handler | Location | Notes |
|---|---|---|
| GET `/:projectId/scenes/:sceneId/transformation-events` | `routes/sceneAssets.ts:1813` | calls `transformationEventService.getTransformationEventsForScene(sceneId)` (signature has no user param, `transformationEventService.ts:217`) |
| POST `/:projectId/scenes/:sceneId/transformation-events` | `sceneAssets.ts:1828` | `createTransformationEvent` |
| PUT `.../transformation-events/:eventId` | `sceneAssets.ts:1852` | `updateTransformationEvent` |
| POST `.../:eventId/confirm` | `sceneAssets.ts:1871` | `confirmTransformationEvent` |
| DELETE `.../:eventId` | `sceneAssets.ts:1886` | `deleteTransformationEvent` |
| POST `.../:eventId/generate-post-description` | `sceneAssets.ts:1901` | `generatePostDescription` |
| POST `.../transformation-events/generate-prefill` | `sceneAssets.ts:1916` | `generateTransformationPrefill` |

By contrast, `sceneAssets.ts:1944` (`generate-post-image` on the same resource) does begin with `req.user!.id` and a `projects` ownership query. Within the same file the transformation-event family is inconsistent.

Template read: `routes/llm.ts:527` `GET /templates/:id` has no owner check; `services/prompt-template.ts:94-96` `getTemplate` selects by id only. Update and delete (`prompt-template.ts:207,240,375`) check `created_by` only when `userId` is provided.

The service-role client (section 10.4) applies to all of the above.

### 10.4 Service-role client

`backend/src/config/supabase.ts:10` reads `SUPABASE_SERVICE_ROLE_KEY` and `:14-17` constructs one client with `createClient(supabaseUrl, supabaseServiceKey, ...)`. This one client is imported by 12 route files and 21 services. Every backend table query therefore runs without row-level-security evaluation; the ownership `.eq('user_id', ...)` checks above are the only per-request isolation for backend-mediated reads and writes. (RLS policy text itself is wave-1 slice C.)

## 11. Test coupling

- Backend tests: 45 files (`backend/src/tests` + `__tests__`). 16 files `jest.mock('../config/supabase.js', ...)` with inline mock objects (for example `continuityBaseService.test.ts:5-9`, which defines a `Proxy`-based `mockChain` at `:13-29`).
- Shared helper `backend/src/tests/helpers/supabaseMock.ts` (90 lines). Header comment (lines 1-15): each `.from(table)` "consumes the next queued result for that call site - tests queue results in the exact order the route under test makes its Supabase calls." Used by 6 test files.
- `mockResolvedValueOnce|mockReturnValueOnce` occurrences: 193 across 6 files (`assetTypeAndMerge.test.ts` 55, `shotLocationRoutes.test.ts` 36, `shotAssetAssignment.test.ts` 35, `continuityBaseAndModeRoutes.test.ts` 32, `transformationPrefill.test.ts` 21, `continuityBaseService.test.ts` 14).
- Assertions on the mocked `from` call: 148 lines reference `mockFrom` call arguments.
- Route-level supertest files: 12 (`shotLocking4_5_task_11.test.ts` 10 uses, `streamlineSkip.test.ts` 9, `referenceContinuity.test.ts` 9, `streamlineCommit.test.ts` 9, etc.). `transformationEvents.test.ts` (24 `it`s) does not import supertest and exercises pure resolution functions (`:74-100`); none of the seven transformation-event routes in section 10.3 has a route-level test.
- Shot lock route test (`shotLocking4_5_task_11.test.ts`): asserts 401, 400 (`errors`, `canForce: false`), 409 (`warnings`, `canForce: true`), 200, and `scene.status === 'shot_list_ready'` (`:44`) against mocked supabase. Unlock test (`:80-107`) asserts 401, 200 (`:96`), and 409 with `details.framesAffected > 0` and `requiresConfirmation === true` (`:105-107`). The unlock 409 shape with nested `details` is what the test pins; wave-1 C03 concerns the frontend read path.
- Frontend tests: 33 files under `src/**` (`__tests__` and `*.test.*`), 12 use `vi.mock(`, 7 import `msw`. 2 Playwright spec files under `e2e/`.

## 12. Structural pressure items

Each item: OBSERVATION, EVIDENCE, CURRENT CONSEQUENCE, CONFIDENCE (H = direct code read plus grep count; M = regex count or partial trace; L = inference). Ledger ids in parentheses.

**PRESSURE-01 (L-PRESSURE-01) Persistence logic lives in route handlers.** OBS: 561 table-literal calls in 12 route files, 237 in 22 services. EVID: section 2.1. CONSEQ: query and ownership logic is replicated in handler bodies (e.g., 150 inline "Project not found" responses); route files are 2,000 to 4,000 LOC. CONF H.

**PRESSURE-02 (L-PRESSURE-02) One service-role client for all backend reads and writes.** OBS: `config/supabase.ts:10` service key; imported by 12 routes and 21 services. CONSEQ: RLS is not evaluated for backend-mediated queries; isolation depends on `.eq('user_id')` in each handler (section 10). CONF H.

**PRESSURE-03 (L-PRESSURE-03) Frontend reads persistence directly in two places; writes always go through HTTP.** OBS: `useSceneInfo.ts:25-29` (`scenes`), `imageService.ts:147-151` (`projects`); 0 direct writes, 0 storage calls in `src`. CONSEQ: two read paths depend on RLS with the anon key, outside the backend ownership checks. CONF H.

**PRESSURE-04 (L-PRESSURE-04) Auth-token boilerplate repeated across the frontend.** OBS: 149 `Bearer` occurrences in 22 files; `supabase.auth.getSession` in 23 files; no shared fetch helper (`grep` for `fetchWithAuth|authFetch|apiFetch|request(` in `src/lib` returns none). CONSEQ: each service method builds its own header and session check. CONF H.

**PRESSURE-05 (L-PRESSURE-05) Four backend route files each mix 6 to 10 unrelated domains.** OBS: `projects.ts` 4006 LOC/29 handlers (project CRUD, continuity, scenes, shots, locks, prompts); `projectAssets.ts` 3451/37 (extraction, assets, image jobs, locks, global sync, attempts, angle variants, location views); `frames.ts` 2410/27; `sceneAssets.ts` 2332/36 (section 1.2). CONSEQ: handler-level changes share one file; helpers (`buildShotLocationState` etc.) are file-local. CONF H.

**PRESSURE-06 (L-PRESSURE-06) Stage components hold most state and orchestration inline.** OBS: `Stage7ShotList.tsx` 1769 LOC, 31 useState, 6 useEffect, dual lock calls; `Stage5Assets.tsx` 1749, 33 useState; `Stage10FrameGeneration.tsx` 1754, 24 useQuery; `ProjectView.tsx` 994 host with stage-progression logic (section 1.3). CONSEQ: lock, autosave, polling and dialog logic are interleaved in single components. CONF H.

**PRESSURE-07 (L-PRESSURE-07) Frame shape and status union duplicated FE and BE by hand.** OBS: identical 20-field `Frame` at `src/types/scene.ts:327` and `backend/src/services/frameGenerationService.ts:11`; `FrameStatus` at `scene.ts:323` and `frameGenerationService.ts:7`. CONSEQ: no shared source for the DB-to-client shape. CONF H.

**PRESSURE-08 (L-PRESSURE-08) At least seven shot shapes in two languages and three casings.** OBS: section 3.2 (`scene.ts:50` 22 fields mixed; `promptGenerationService.ts:13` 21 snake; `shotMergeService.ts:12` 13; `shotSplitService.ts:25` 10; `shotValidationService.ts:28` 9 camel; `projects.ts:32` 3). CONSEQ: field additions must be propagated to each. CONF H.

**PRESSURE-09 (L-PRESSURE-09) Four different `Scene` shapes.** OBS: `scene.ts:76` (17, camel), `scriptService.ts:7` (5, camel), `continuityRiskAnalyzer.ts:18` (5, snake), `scriptManifest.ts:39` (9, camel). CONSEQ: same name, different fields in FE and BE. CONF H.

**PRESSURE-10 (L-PRESSURE-10) Scene-asset representations diverge between FE and BE.** OBS: FE `SceneAssetInstance` (`scene.ts:113`, 19 fields) vs BE `SceneAssetInstanceData` (`promptGenerationService.ts:57`, 16); 11 FE-only and 8 BE-only fields; FE `SceneAsset` (`scene.ts:100`) is a separate camel entity; BE has no `ProjectAsset` type (`as any` 33 in routes, 17 in services). CONSEQ: field-level drift is possible without a type error. CONF H.

**PRESSURE-11 (L-PRESSURE-11) Stage status has three vocabularies.** OBS: DB CHECK 5 values (`041:29-32`); BE and `BackendStageStatus` 5 equal; UI `StageStatus` (`types/project.ts:7`) has `active,pending` (not in DB) and lacks `draft,invalidated`; `ProjectView.tsx:61-69` maps `draft`->`active`. CONSEQ: UI derives progression from a mapping, not the stored value. CONF H.

**PRESSURE-12 (L-PRESSURE-12) Stage numbers map to four label sets; stage 6 has none in the state model.** OBS: section 6.1 (`ProjectView.tsx:30-34`, `UnlockWarningDialog.tsx:23-35` with no 6 and "Master Script", `SceneWorkflowSidebar.tsx:26-33`, `stageInfoContent.ts:40-104`). Stage 6 has no `stage_number=6` read or write, though ProjectView branches on it. Stage-range rules differ per endpoint (1-12, 1-5, [2,3,4], 7-12). CONSEQ: label and range rules are maintained per file. CONF H.

**PRESSURE-13 (L-PRESSURE-13) Case conversion is hand-written at ~520 backend and ~80 frontend sites.** OBS: 385 `camelKey: x.snake_prop` plus 138 `snake_key: x.camelProp` lines in backend routes and services; 39 plus 40 in frontend; one transformer module (`backend/src/transformers/styleCapsule.ts`, `any`-typed). CONSEQ: conversion is per call site, field lists repeated. CONF M (regex).

**PRESSURE-14 (L-PRESSURE-14) Project type literal differs across layers.** OBS: DB CHECK `001:13` and BE `projects.ts:684`, `contextManager.ts:15` use `audio_visual`; FE `types/project.ts:31` and `Stage1InputMode.tsx:92` use `audio-visual`. CONSEQ: a request carrying the FE value fails the BE validation and receives `400 'Invalid project type'` (`projects.ts:684-685`). CONF H on code; runtime path (whether Stage 1 sends it through PUT) M.

**PRESSURE-15 (L-PRESSURE-15) Frontend `ProjectStatus` type has no backing column.** OBS: `types/project.ts:1-5` (`draft,in-progress,complete,archived`), no `status` column on `projects` in any migration (`001:5-22`; no ALTER). CONSEQ: type is not populated from any stored value. CONF H.

**PRESSURE-16 (L-PRESSURE-16) Visual-style identifier appears under five names.** OBS: section 6.4 (`visualStyleCapsuleId` 72/21; `visual_style_capsule_id` 55/13; `locked_visual_style_capsule_id` 9/7; `writingStyleCapsuleId` 4/25; `writing_style_capsule_id` 5/5). CONSEQ: each layer uses its own name for a stage-5 value, a project column, and a request field. CONF H.

**PRESSURE-17 (L-PRESSURE-17) Frame generation reads visual style from a column that does not exist.** OBS: `frames.ts:261-267,384-390,448-454,766-772,844-850` select `state_data` and filter `project_id` on `stage_states`; neither column exists in any migration (`stage_states` columns at `001:51-75`, `041:38`). Value passed on at `frames.ts:274` (`generateFrames(..., visualStyleCapsuleId, aspectRatio)`, call at `:269-275`). CONSEQ: whenever the query errors (which the schema implies on every call), `visualStyleCapsuleId` is `undefined` in the five frame-route handlers that read it; `.single()` error is not read. CONF H (code); runtime UNKNOWN (no live DB). Wave-1 C01 confirmed.

**PRESSURE-18 (L-PRESSURE-18) Project-level visual capsule is read but never written.** OBS: reads at `frames.ts:527,569,2156,2216`, `projects.ts:3584,3740` (Stage 9 prompt path), `contextManager.ts:499`; no INSERT/UPDATE of `visual_style_capsule_id` on `projects` in backend or frontend; `PUT /:id` (`projects.ts:640-680`) accepts only title, project_type, content_rating, genre, tonal_precision, length, aspect_ratio. Only migration `004_style_capsule_system.sql:62-63` adds the column. CONSEQ: `project.visual_style_capsule_id` is `null` in all code paths; the Stage 9 capsule block (`projects.ts:3739-3750`) never loads a capsule. Wave-1 C02 confirmed. CONF H.

**PRESSURE-19 (L-PRESSURE-19) Style-capsule loading is copied four times with three different failure policies.** OBS: section 5.1 (`frames.ts:568-574`, `:2215-2222`, `frameGenerationService.ts:776-786`, `projects.ts:3739-3749`); 7 `getCapsuleById` callers. CONSEQ: two copies swallow silently, one logs warn, one re-fetches `user_id`. CONF H.

**PRESSURE-20 (L-PRESSURE-20) Context assembly is spread across seven services and four routes, with dead members.** OBS: `assembleGlobalContext` 3 callers (`contextManager.ts:102`); `assembleLocalContext` 0 callers (`contextManager.ts:208`); `formatVisualStyleInjection` 0 callers (`styleCapsuleService.ts:366`); 27 stage-content reads (section 5.3). CONSEQ: two context helpers are unreferenced; story/beat/master-script loaders exist in at least three files. CONF H.

**PRESSURE-21 (L-PRESSURE-21) Location context reloaded per request and resolved per shot.** OBS: `loadProjectLocationContext` 13 sites (12 in `projects.ts`); shot GET `projects.ts:1566-1570` maps `transformShotForClient` over every shot, each calling `resolveShotLocation` (`:93`). CONSEQ: one context load per request, one resolver call per shot, no batch path. CONF H.

**PRESSURE-22 (L-PRESSURE-22) LLM default model differs by path inside one file.** OBS: `llm-client.ts:76` `'gemini-2.5-flash-lite'`, `:106` `'gemini-1.5-flash'`, `:310` `'gemini-2.5-flash-lite'`, all reading `GEMINI_MODEL`. CONSEQ: `generate` without `GEMINI_MODEL` uses `gemini-1.5-flash`, while `estimateCost` estimates for `gemini-2.5-flash-lite`. CONF H.

**PRESSURE-23 (L-PRESSURE-23) Google model access uses three SDK or transport paths and three key-check behaviours.** OBS: section 4.1 and 4.3 (`llm-client` LangChain; `imageAnalysisService` and `NanoBananaClient` `@google/generative-ai`; `Veo3Provider` REST with `google-auth-library`); `GOOGLE_AI_API_KEY` checks at `llm-client.ts:91`, `imageAnalysisService.ts:25-27`, `NanoBananaClient.ts:21-23`, `llm.ts:143`. CONF H.

**PRESSURE-24 (L-PRESSURE-24) Model identifiers and pricing hard-coded across 10 backend files.** OBS: section 4.2 (`gemini-2.5-flash` x4 in `imageAnalysisService.ts:54,106,136,176`; `gemini-2.5-flash-image` x2 in `NanoBananaClient.ts:119,180`; Veo ids `Veo3Provider.ts:18-19`; pricing keys `token-utils.ts:28-40`). CONF H.

**PRESSURE-25 (L-PRESSURE-25) Veo variant and rate branching duplicated across backend and frontend.** OBS: section 4.4; 0.15/0.40 at 4 sites (`videoGenerationService.ts:6-7`, `Veo3Provider.ts:158`, `MockVideoProvider.ts:44`, `checkoutService.ts:243`); `'veo_3_1_fast'` 12 backend and 10 frontend literal sites; `ModelVariant` in 3 places. CONSEQ: changing a rate or variant touches four files on two sides. CONF H.

**PRESSURE-26 (L-PRESSURE-26) Video provider silently defaults to mock.** OBS: `createVideoProvider.ts:18` `process.env.VIDEO_PROVIDER || 'mock'`; `Veo3Provider.ts:41-46` throws only on first use when `GOOGLE_CLOUD_PROJECT` is missing; module singleton `:14`. CONSEQ: an unset env yields mock output with no startup error. CONF H.

**PRESSURE-27 (L-PRESSURE-27) Token budgets and temperatures are literals at call sites.** OBS: `maxTokens:` literal 22 sites; `temperature:` literal 22 sites; route cap 8192 (`llm.ts:25,56`); default 4096 (`llm-client.ts:137`); frontend sends no `maxTokens`. Treatment template asks for three 800-1200 word treatments (`seed-templates.ts:43`). CONSEQ: output-length budget is set per service; truncation path exists in treatment parsing (wave-1 PRESSURE-0001, partially re-checked). CONF M.

**PRESSURE-28 (L-PRESSURE-28) Prompt builders duplicated by name and by inline text.** OBS: `buildSystemPrompt`/`buildUserPrompt` defined in two streamline services (`streamlineReconciliationService.ts:45,62`; `streamlineQuestionService.ts:49,73`); inline "You are" system prompts in 19 backend files; visual-style context builders in `assetExtractionService.ts:657` and `ImageGenerationService.ts:639`; `buildStyleContext` and `buildAssetContext` each reused 3 times in `promptGenerationService.ts`. CONF H.

**PRESSURE-29 (L-PRESSURE-29) Two independent scene parsers; Stage 1 duplicates the Stage 4 approve path.** OBS: FE `scriptService.extractScenes` (9 callers) and BE `extractManifest` (8 callers); `Stage1InputMode.tsx:486-497` repeats extraction and `persistScenes` with comment "replicate it here". CONSEQ: scene identity for `scenes` rows comes from the FE parser; dependency manifest comes from the BE parser over TipTap JSON (`projects.ts:1301-1305`). CONF H.

**PRESSURE-30 (L-PRESSURE-30) Deprecated LLM dependency path is reachable from scene save.** OBS: `sceneDependencyExtraction.ts:4,31,35,46` marked `@deprecated` and warns "Legacy LLM path invoked"; `projects.ts:1338-1346` calls it when `dependenciesMap.size === 0`, which also covers the case where the deterministic manifest ran but matched no scenes; `projects.ts:1332` falls through to it on manifest error. CONSEQ: an LLM call can run after a successful deterministic parse with zero matches. CONF H on condition; runtime frequency UNKNOWN.

**PRESSURE-31 (L-PRESSURE-31) Script approve writes stage 4 twice and can delete scenes.** OBS: section 7.1: `persistScenes` then `lockStage(4)` in the component (`Stage4MasterScript.tsx:613-616`), then `onComplete` leading to a second `lockStage(4)` (`ProjectView.tsx:446-449,958`); `stageStates.ts:297-330` has no already-locked guard; unmatched scenes hard-deleted (`projects.ts:1430-1434`) with cascades. CONSEQ: two stage_states version rows per approve; cascade removes shots, scene_asset_instances, video jobs, image jobs, suggestions, transformation events for removed scenes. Wave-1 C15 re-checked. CONF H.

**PRESSURE-32 (L-PRESSURE-32) Shot-list lock is written to three places by three calls.** OBS: section 7.2 (`projects.ts:2975-2991` writes `shot_list_locked_at` and `stage_locks['7']`; `sceneStageLocks.ts:56` writes `stage_locks`; `ProjectView.tsx:589-600` calls the stage-lock lock again). Trigger `014:31-58` syncs `scenes.status` only. CONSEQ: the representation of "Stage 7 locked" is `shot_list_locked_at` and `stage_locks['7']` and the Stage 7 lock state from `useSceneStageLock`; no single writer. CONF H.

**PRESSURE-33 (L-PRESSURE-33) Shot-list unlock uses two systems and writes to tables with no migration.** OBS: `Stage7ShotList.tsx:812-817` (confirm via stage-lock, then old shot unlock best-effort); `projects.ts:3106-3117` updates `frames` (status `'invalidated'` not in CHECK `019:12-18`) and `videos` (no migration creates `videos`); `projects.ts:3123` inserts `invalidation_logs` (no migration creates it; comment "if invalidation_logs table exists"); `scenes.stage_locks` exists only in `quickies-sql/add_stage_locks.sql:1`. CONSEQ: in the repo's migration set, the frame UPDATE violates CHECK and its error is unread, the videos read returns an error that is unread (`videosAffected` = 0), and the invalidation log is best-effort. Runtime state of the live DB: UNKNOWN. CONF H (code), U (runtime).

**PRESSURE-34 (L-PRESSURE-34) Shot mutations do not consult the shot-list lock.** OBS: 7 shot-mutating handlers (`projects.ts:1980,2180,2316,2399,2515,2657,2791`) have no `shot_list_locked_at` reference; no RAISE in any migration touches shots or scenes locks (RAISE only in migrations 041-044). Lock state read only in `projects.ts:1042,1085,2873-3155`. CONSEQ: lock is enforced only by UI and by lock/unlock handlers. Wave-1 C05 confirmed. CONF H.

**PRESSURE-35 (L-PRESSURE-35) Asset lock is one-way and not enforced on generation.** OBS: `locked` set true at `projectAssets.ts:1565,1729`; set false only at create paths (`:127,351,1052,1187`); no unlock route; `generate-image` (`:1210`), `upload-image` (`:1288`), `analyze-image` (`:1380`), `edit-image` (`:1436`) contain no `locked` check. CONSEQ: locked assets can receive new image jobs and new images through these routes. Wave-1 C20 confirmed. CONF H.

**PRESSURE-36 (L-PRESSURE-36) Style change fans out through three mechanisms that do not share state.** OBS: section 7.4 (client content autosave to `stage_states` via `stageStates.ts:120`; `style_outdated` flag via `projectAssets.ts:1587`; image clearing via `projectAssets.ts:1631`); readers of stage-5 id (9) vs readers of project column (no writer) vs frame path (state_data). CONSEQ: the style id that frames read is not the one stage 5 writes (PRESSURE-17, -18). CONF H.

**PRESSURE-37 (L-PRESSURE-37) Scene defer is a single column with local-only UI reaction.** OBS: `scenes.is_deferred` (`027:4`) written at `projects.ts:1163,1204`; read only in `projects.ts:1042,1119` and Stage 6 UI; `Stage6ScriptHub.tsx:158-159` patches local state without query invalidation; no service-layer read. CONSEQ: deferred state is not consumed by generation or shot paths in backend code. CONF H.

**PRESSURE-38 (L-PRESSURE-38) Stage lock depends on a row that only a prior save creates.** OBS: `stageStates.ts:331-341` 404 when no row; rows inserted only by PUT (`:247`, existing-row check `:188-198`); project creation inserts no stage rows (`projects.ts:553-640`; `001:166-186`). CONSEQ: lock before any save returns 404 with no stage-1 row. Wave-1 C21 re-checked for the lock side. CONF H on code; runtime UNKNOWN for the UI ordering.

**PRESSURE-39 (L-PRESSURE-39) Stage 8 auto-populate runs once per mount, sequentially, and swallows failure.** OBS: `Stage8VisualDefinition.tsx:240-272`: `inheritAssets` then `populateFromDependencies` (scene 2+); guard refs `:208,:241`; catch `:262-265` "Silently fail". CONSEQ: a failed populate leaves the scene with no assets and no error; the ref prevents retry in the same mount. CONF H.

**PRESSURE-40 (L-PRESSURE-40) Long-running jobs run in-process without a recovery path.** OBS: `ImageGenerationService.ts:178-180` and `videoGenerationService.ts:416-418` fire and forget; `VideoJobExecutor.ts:15,28-33,54` module-level boolean; no code path re-queues `processing` rows (grep: 0 relevant hits). CONSEQ: jobs in `processing` or `generating` depend on the same process completing them; state recovery is by UI polling only. CONF H (code), U (runtime).

**PRESSURE-41 (L-PRESSURE-41) Polling is the orchestration mechanism for several generation views.** OBS: 6 refetchInterval/setInterval sites in `src` (section 8), 3 setTimeout poll loops in `src`, 2 server polls (`Veo3Provider.ts:224-232`, `VideoJobExecutor.ts:39-49`). CONSEQ: UI progress depends on refetch cadence and on terminal statuses being written by the backend. CONF H.

**PRESSURE-42 (L-PRESSURE-42) Lock writes are duplicated component plus shell.** OBS: Stage 4 (2 writes), Stage 7 (3 writes), Stage 12 best-effort plus shell (`Stage12VideoGeneration.tsx:237`, `ProjectView.tsx:589-600`). CONSEQ: lock side effects depend on call order and on best-effort try blocks. CONF H.

**PRESSURE-43 (L-PRESSURE-43) Route error handling mostly responds, but 2 empty catches sit on the frame path.** OBS: 197 responding catches; 13 log-only; 3 log-plus-fallback; 2 empty (`frames.ts:573,2220`); fire-and-forget `.catch` at 6 sites (`shotAssignments.ts:147,180,208,236`, `projects.ts:2637`, `frames.ts:649`). CONF H.

**PRESSURE-44 (L-PRESSURE-44) Supabase results are frequently unread.** OBS: 136 single-line destructures without `error`; 53 bare `await supabase` statements in routes; 32 in services; examples at `projects.ts:3076-3083,3106-3117`, `sceneStageLocks.ts:211-219`, `frames.ts:261-267` (and 4 siblings). CONSEQ: failed writes and reads become silent (e.g., `videosAffected` 0). CONF M (regex upper bound).

**PRESSURE-45 (L-PRESSURE-45) Frontend catch blocks are mostly log-only or empty.** OBS: `src` non-test: 19 empty, 102 console-only, 81 other catches (section 9.4). CONSEQ: user-visible error paths depend on the 81 other sites. CONF H.

**PRESSURE-46 (L-PRESSURE-46) Project ownership is re-implemented in each handler.** OBS: 176 project-scoped handlers; 158 inline `from('projects')` ownership lookups; 150 literal "Project not found"; 167 `.eq('user_id', userId)`; the one shared helper (`shotAssignments.ts:36`) is used only in its own file. CONSEQ: each handler carries its own copy of the same check; variants differ in the 404 messages. CONF H.

**PRESSURE-47 (L-PRESSURE-47) Seven transformation-event handlers have no ownership check.** OBS: `sceneAssets.ts:1813,1828,1852,1871,1886,1901,1916`; the service methods take no user argument (`transformationEventService.ts:217` and siblings); the backend client is service-role (PRESSURE-02). No route-level test covers these handlers (`transformationEvents.test.ts` has no supertest). CONSEQ: any authenticated user who knows a project, scene, and event id can read or mutate that scene's transformation events through these routes. CONF H (code); runtime exploitability U (no request executed).

**PRESSURE-48 (L-PRESSURE-48) Prompt template read path has no owner check; update and delete check only when a user id is present.** OBS: `routes/llm.ts:527-565` GET `/templates/:id` (no user); `services/prompt-template.ts:94-96` select by id; `:207,:240,:375` check `created_by` only if `userId` truthy. CONSEQ: unauthenticated context is not possible (router is authenticated), but ownership depends on `userId` being passed. Wave-1 C17 re-checked for the read path. CONF H.

**PRESSURE-49 (L-PRESSURE-49) Backend tests bind to supabase call order.** OBS: `tests/helpers/supabaseMock.ts:1-15` consumes queued results per `.from()` call; 193 `Once` mocks in 6 files; 148 assertions on `mockFrom` arguments; 16 files mock the supabase module. CONSEQ: a route that adds, removes, or reorders a `from()` call breaks several tests without a behaviour change. CONF H.

**PRESSURE-50 (L-PRESSURE-50) Dead and deprecated code remains in the tree.** OBS: `assembleLocalContext` (`contextManager.ts:208`), `formatVisualStyleInjection` (`styleCapsuleService.ts:366`) have zero callers; `sceneDependencyExtraction.ts` marked deprecated but reachable (PRESSURE-30); `Stage7ShotList` "old system" unlock (`:813-817`). CONF H.

**PRESSURE-51 (L-PRESSURE-51) Type safety is eroded at boundaries.** OBS: `as any` 33 in routes, 17 in services, 7 in `src`; `: any` 102 in routes; 6 `eslint-disable` in non-test code; `capsuleToApi(c: any)` (`transformers/styleCapsule.ts:6`); zod imported in 3 of 12 route files (`sceneAssets.ts`, `llm.ts`, `shotAssignments.ts`); 82 `req.body` reads in routes. CONF H.

**PRESSURE-52 (L-PRESSURE-52) Two error envelope shapes.** OBS: `{ error }` (718 `json({ error:` sites in routes) vs `{ success: false, error, code? }` (39 sites: `llm.ts` 36, `sceneAssets.ts` 3); 153 generic `'Internal server error'` 500 responses. CONF H.

**PRESSURE-53 (L-PRESSURE-53) Shot-list lock writes two JSON representations of the same state.** OBS: `scenes.shot_list_locked_at` (timestamp) and `scenes.stage_locks['7']` (`{status}`), written together by `projects.ts:2975-2991`; unlock writes `stage_locks['7'] = draft` and downstream `'outdated'` (`projects.ts:3144-3148`). Related to PRESSURE-32. CONF H. (Keep as its own item because it is a representation pressure, not a fan-out.)


## 13. Cross-slice references

- `backend/src/routes/projects.ts:1217-1534` script save and scene matching (wave-1 V3 narrative, C15).
- `backend/src/routes/stageStates.ts:297-523` stage lock, skip, unlock (wave-1 V1 shell, C03 unlock dialog shape).
- `backend/src/routes/projects.ts:2845-3020` shot lock/unlock (wave-1 V8 shots, C05, C06 route order not re-checked here).
- `backend/src/routes/frames.ts:261-267` state_data read (wave-1 V9, C01).
- `backend/src/services/contextManager.ts:534-552` beat-sheet read (wave-1 V3/V6, C10).
- `backend/src/routes/sceneAssets.ts:1813-1944` transformation events (wave-1 V6).
- `backend/src/routes/projectAssets.ts:1210-1527` asset generate/lock (wave-1 V5, C20).
- `backend/src/services/video-generation/Veo3Provider.ts`, `MockVideoProvider.ts`, `videoGenerationService.ts` (wave-1 V10 video checkout).
- `backend/src/routes/checkout.ts:91-146` confirm-render pricing (wave-1 V10, C14).
- `backend/src/routes/llm.ts:527-565` template read (wave-1 E, C17).
- `backend/migrations/004_style_capsule_system.sql:62-63`, `008_global_assets.sql:22,64` column adds (wave-1 V2, C02).
- `backend/migrations/044_streamline_atomic_intake_fix.sql` and `043` sequential lock triggers (wave-1 C-database, PRESSURE-0002).
- `src/components/pipeline/Stage12VideoGeneration.tsx:237` lock best-effort (wave-1 V10).
- `src/components/pipeline/Stage1InputMode.tsx:486-497` streamline persistence (wave-1 V4 streamline, PRESSURE-0003, PRESSURE-0004).
- `src/components/pipeline/FileStagingArea.tsx:105-111`: PDF returns empty string; other types use `readAsText` (wave-1 V1/V4, PRESSURE-0003 re-checked: confirmed).
- `backend/src/services/continuityBaseService.ts:138-173` branch-wide start-frame scan with no `.limit` (`grep -c "\.limit("` on the file = 0) (wave-1 PRESSURE-0005, re-checked: confirmed).
- `backend/scripts/seed-templates.ts:43` treatment prompt (wave-1 PRESSURE-0001, re-checked: confirmed).
- `backend/src/services/llm-client.ts:76,106,310` model defaults (wave-1 E, not previously recorded).
- `src/lib/services/checkoutService.ts:243,250` Veo rate and display name (wave-1 V10).

## 14. Contradictions and unknowns

- UNKNOWN: whether the live Supabase database has a `videos` table, an `invalidation_logs` table, or `scenes.stage_locks`. No migration or repo SQL creates `videos` or `invalidation_logs`; `stage_locks` appears only in `backend/quickies-sql/add_stage_locks.sql:1`. Settles with `\d` on the live DB (not run here).
- UNKNOWN: whether `frames.status = 'invalidated'` is rejected at runtime. Migration `019_frames_table.sql:12-18` allows five values and no later migration widens it; the write at `projects.ts:3106-3109` does not check its error. Settles by a runtime unlock on a scene with frames (not run here).
- UNKNOWN: whether `projects.visual_style_capsule_id` was set by hand or by a migration-less path. No writer in repo code. Settles with a live query.
- CONTRADICTED (code vs comment): `projects.ts:3120` comment "(if invalidation_logs table exists)" vs the table is not in migrations; the comment acknowledges the uncertainty, the code path has no guard.
- CONTRADICTED (code vs comment): `frames.ts:568-574` "Continue without style capsule" vs the failure is not logged, so a failed capsule load is indistinguishable from "no capsule".
- CONTRADICTED (code vs comment): `Stage8VisualDefinition.tsx:265` "Silently fail — user can still add assets manually" is consistent with code; listed for completeness.
- CONTRADICTED (code vs comment): `ProjectView.tsx:590` comment says Stage 7 "already locks via its own hook" as a reason for best-effort; the shell still calls `sceneStageLockService.lockStage` (`ProjectView.tsx:593`).
- CONTRADICTED (code vs comment): `Stage7ShotList.tsx:700` "Also lock via new stage_locks system" and `:813` "old system ... backward compat": two systems co-exist in the same handler (PRESSURE-32, -33).
- CONTRADICTED (type vs DB): `src/types/project.ts:31` (`audio-visual`) vs `001:13` (`audio_visual`).
- CONTRADICTED (type vs column): `src/types/project.ts:1-5` `ProjectStatus` has no backing column.
- UNKNOWN: whether a stage-1 `stage_states` row exists for projects created through the UI before any save (no insert path found except PUT and lock). Settles with a live query on a fresh project.
- UNKNOWN: runtime frequency of the legacy LLM dependency path (PRESSURE-30).
- UNKNOWN: whether `llm.ts:243-250` template variables carry `writing_style_capsule_id` from the frontend (sent by `scriptService.ts:89,157`, `beatService.ts:65`, `treatmentService.ts:68,151`); code path present, value flow not traced end to end.
- UNKNOWN: regex counts (sections 2, 6.3, 9.3) are approximate; a TypeScript AST pass would tighten them by about 2 percent.
- Mount check: all 15 route files in `backend/src/routes` are mounted in `server.ts` (`health` at line 42 without auth; the other 14 under `authenticateUser` at `:49-84`).
