# V6: Scene-level asset instances, Stage 8 Visual Definition, transformation events, visual state

Reporter V6. Read-only static analysis of HEAD. Facts only. Every claim has `path:line` evidence. "UI" means the Stage 8 React tree rendered by `src/pages/ProjectView.tsx:789-796` when `sceneStage === 8`.

## 0. Files inspected

Fully read: `backend/src/routes/sceneAssets.ts` (all 2332 LOC), `backend/src/services/{assetInheritanceService,sceneAssetRelevanceService,sceneAssetAttemptsService,transformationEventService,storyContextService,textFieldVersionService}.ts`, `backend/src/services/image-generation/ImageGenerationService.ts:60-640`, `backend/src/services/imageAnalysisService.ts:20-156`, migrations `015,016,017,022,024,026,030,032,036,037`, `src/components/pipeline/Stage8VisualDefinition.tsx`, `src/components/pipeline/Stage8/*` (all except `LocationCoveragePanel.tsx`), `src/lib/services/{sceneAssetService,transformationEventService}.ts`, `src/lib/constants/statusTags.ts`, `src/types/scene.ts:27-215`, `src/components/pipeline/VersionedTextarea.tsx:68-155`, test files listed in section 16.
Sampled for cross-slice wiring: `AssetDrawer.tsx:120-260`, `ProjectView.tsx:585-630,770-815`, `backend/src/routes/projects.ts` (scene reconcile ~1330-1480, shot insert ~1915-1945, prompt gen ~3600-3800), `projectAssets.ts:725-880,1070-1115,3405-3440`, `frames.ts:548-625,1700-1730`, `frameGenerationService.ts:225-250`, `contextManager.ts:215-250`, `promptGenerationService.ts` (grep only), `sceneStageLocks.ts` (grep only), `config/supabase.ts`.

## 1. Data model (what state exists, where)

### 1.1 `scene_asset_instances` (migration 015 + 017 + 022 + 037)
One row per (scene, project_asset): `UNIQUE(scene_id, project_asset_id)` `backend/migrations/015_scene_asset_instances.sql:41`. FKs: `scene_id -> scenes ON DELETE CASCADE`, `project_asset_id -> project_assets ON DELETE CASCADE` (015:15-16).

| Column | Origin | Meaning in code (verified) |
|---|---|---|
| `description_override TEXT` | 015:19 | Scene-specific description. Written by: PUT route (`sceneAssets.ts:630-632`), create route (`:230`), create-with-project-asset (`:952`, = the new asset's description), inherit (copy from prior, `assetInheritanceService.ts:267`), text-field-version write-back (`textFieldVersionService.ts:37,226-240`). Never written by populate-from-dependencies or bootstrap (stays NULL). |
| `effective_description TEXT` | 015:34 | STORED snapshot, not computed by DB. Set on insert by every creation path, and on PUT only when body contains `descriptionOverride` (`sceneAssets.ts:622-625`: `updates.descriptionOverride ?? projectAsset.description`). Not touched by the version write-back. This is the field every downstream consumer reads (prompt gen, frames, relevance, image gen). |
| `image_key_url TEXT` | 015:20 | Currently active scene image. Written by: inherit/bootstrap (copy), PUT (`imageKeyUrl`, unused by UI), select-attempt (`sceneAssetAttemptsService.ts:105-108`), use-master-as-is (`sceneAssets.ts:1326-1332`), upload (`:1748-1758`), image job completion for `scene_asset` jobs (`ImageGenerationService.ts:484-488`). |
| `status_tags TEXT[]` | 015:23 | Free-form lowercase strings (`StatusTagsEditor.tsx:48`). Includes the literal `'locked'` when "Lock Asset" is pressed (section 6.3). |
| `carry_forward BOOLEAN DEFAULT TRUE` | 015:24 | Read only by `getInheritableAssetStates` (`assetInheritanceService.ts:114`) and UI filters/badges. |
| `inherited_from_instance_id UUID -> scene_asset_instances ON DELETE SET NULL` | 015:27 | Set only by inherit (`assetInheritanceService.ts:271`) or create-route body `inheritedFromInstanceId` (no UI caller sends it). UI source badge "Prior Scene" vs "Master" is derived from it (`SceneAssetListPanel.tsx:55-58`). |
| `modification_count INT DEFAULT 0`, `last_modified_field TEXT`, `modification_reason TEXT` | 017:9-12 | Trigger `track_scene_asset_modifications` (017:22-47) increments count on EVERY UPDATE (any column, including image-job completion and attempt selection) and sets `last_modified_field` only for description_override/status_tags/image_key_url/carry_forward (first match wins). `modification_reason` written only via PUT. |
| `use_master_as_is BOOLEAN DEFAULT FALSE` | 022:56-57 | Set true by use-master-as-is routes; set false by toggle-off, select-master-reference (`sceneAssets.ts:1632`), upload (`:1751-1753`). |
| `selected_master_reference_url`, `selected_master_reference_source` (CHECK `stage5_master`,`prior_scene_instance`,`transformation`), `selected_master_reference_instance_id -> scene_asset_instances ON DELETE SET NULL` | 022:59-68, 037:5-10 | Written only by select-master-reference route (`sceneAssets.ts:1628-1638`). Read by image gen as the default reference image (`ImageGenerationService.ts:241`), by use-master-as-is (`sceneAssets.ts:1299`), and by downstream `contextManager.ts:248`, `continuityCompositionService.ts:530`. |
| `created_at`, `updated_at` | 015:37-38 | `updated_at` trigger 015:106-117. |

RLS policies exist (015:54-99) but the backend uses the service-role client (`backend/src/config/supabase.ts:10,17`), so RLS is bypassed for all routes; ownership is enforced only by route code (section 15).

### 1.2 `scene_asset_generation_attempts` (migration 022)
`022:9-40`. Per-instance image history. `source IN ('generated','uploaded','master_copy')`; `is_selected` with partial unique index (one selected per instance) `022:43-45`; `attempt_number`; generation metadata (`image_generation_job_id`, `prompt_snapshot`, `cost_credits`), upload metadata, `copied_from_url`. Cap `MAX_ATTEMPTS = 8` (`sceneAssetAttemptsService.ts:8`): when count >= 8, the oldest non-selected attempt is deleted, plus its storage object (`:161-188`). Lazy backfill on list: if no attempts and instance has `image_key_url`, insert one `source='generated', is_selected=true` (`:212-236`) (note: inherited/master-copied URLs get labeled "generated").

### 1.3 `scene_asset_suggestions` (migration 024)
`024:4-17`: `scene_id`, `asset_id` (never written by code), `name`, `asset_type CHECK IN ('character','location','prop')`, `description`, `justification`, `suggested_by DEFAULT 'ai_relevance'`, `accepted`, `dismissed`. Written only from AI relevance `new_assets_required` (section 10).

### 1.4 `transformation_events` (migration 030 + 032)
`030:10-53`: `scene_asset_instance_id -> scene_asset_instances ON DELETE CASCADE`, `scene_id -> scenes CASCADE`, `trigger_shot_id -> shots ON DELETE CASCADE`, `transformation_type IN ('instant','gradual','within_shot')`, `completion_shot_id -> shots ON DELETE SET NULL`, `pre_description NOT NULL`, `post_description NOT NULL`, `transformation_narrative`, `pre_image_key_url` (never written by any UI path), `post_image_key_url`, `pre_status_tags`, `post_status_tags` (never written by any UI path; default `{}`), `detected_by IN ('stage7_extraction','stage8_relevance','manual')`, `confirmed DEFAULT FALSE`, `confirmed_at`. Also adds `shots.transformation_flags JSONB` (030:135). `image_generation_jobs.job_type` gains `scene_asset` (016), `transformation_post` (032).

### 1.5 `text_field_versions` (migration 036), subset used here
`036:5-15`: `entity_type IN ('shot','scene_asset_instance')`, `field_name` includes `description_override`, `content`, `is_selected`, `source IN ('user_save','ai_generation')`, `version_number`. RLS `USING (true)` (036:30-34). Cap 8 (`textFieldVersionService.ts:9,181-202`).

### 1.6 Storage
Bucket `asset-images`. Paths: generated scene asset `project_{p}/branch_{b}/scene_{s}/scene-assets/{projectAssetId}_{ts}_{rand}.png` (`ImageGenerationService.ts:615-617`); upload `.../scene_{s}/scene-assets/uploads/{instanceId}_{ts}_{rand}{ext}` (`sceneAssets.ts:1711`); transformation post image `.../scene_{s}/transformations/{eventId}_{ts}_{rand}.png` (`ImageGenerationService.ts:618-620`). Public URLs (`getPublicUrl`).

## 2. Route inventory (`backend/src/routes/sceneAssets.ts`, mounted at `/api/projects` behind `authenticateUser`, `backend/src/server.ts:54`)

| # | Method + path (prefix `/api/projects/:projectId`) | Lines | Backend effect | Frontend caller |
|---|---|---|---|---|
| R1 | GET `/scenes/:sceneId/assets` | 67-116 | select instances + joined project_asset, order created_at | `sceneAssetService.listSceneAssets` (Stage 8 `:230`, Stage 9 `:137`, Stage 10 `:301`) |
| R2 | POST `/scenes/:sceneId/assets/detect-relevance` | 122-163 | LLM relevance (AI-1), returns JSON, no DB writes | `detectRelevantAssets` (Stage8 `:469` dead path, `:508`) |
| R3 | POST `/scenes/:sceneId/assets` | 169-282 | insert instance; 409 on dup; append scene_number to `project_assets.scene_numbers` | AI detect (`Stage8:510`), AssetDrawer (`AssetDrawer.tsx:143,214,237`) |
| R4 | POST `/scenes/:sceneId/assets/inherit` | 288-344 | 400 if scene has any instance; else `inheritAssetsFromPriorScene` | auto-populate (`Stage8:255`), "Inherit" button (`Stage8:429`) |
| R5 | POST `/scenes/:sceneId/assets/:instanceId/generate-image` | 350-402 | Stage-5 style check; `createSceneAssetImageJob` | `generateSceneAssetImage` (single `Stage8:642`, bulk loop `sceneAssetService.ts:331-361`) |
| R6 | POST `.../:instanceId/edit-image` | 408-518 | builds prompt from client `description`/`editInstructions`; `scene_asset` job | `startEditImageJob` (EnhancedUploadModal callbacks `VisualStateEditorPanel.tsx:822-847`) |
| R7 | POST `.../:instanceId/analyze-image` | 524-575 | Gemini vision (AI-7/AI-8) on `image_key_url`; no DB write | `analyzeSceneAssetImage` (`VisualStateEditorPanel.tsx:334`) |
| R8 | PUT `.../:instanceId` | 582-668 | update override/tags/carry/reason/imageKeyUrl; recompute effective_description | many (section 12) |
| R9 | DELETE `.../:instanceId` | 674-706 | delete row (cascades attempts, transformation events, shot_asset_assignments) | remove dialog (`Stage8:681`), convert-to-transformation (`ConvertToTransformationDialog.tsx:136`) |
| R10 | GET `/scenes/:sceneId/suggestions` | 730-763 | non-dismissed rows | `Stage8:277` |
| R11 | POST `/scenes/:sceneId/suggestions` | 769-817 | bulk insert, `suggested_by='ai_relevance'` | `Stage8:486,524` |
| R12 | PATCH `/scenes/:sceneId/suggestions/:suggestionId` | 823-869 | set accepted/dismissed | `Stage8:797` (dismissed only) |
| R13 | POST `/scenes/:sceneId/assets/create-with-project-asset` | 885-979 | insert project_asset (`locked:true, source:'manual'`) + instance; compensating delete on failure | inline create form (`Stage8:662`) |
| R14 | POST `/scenes/:sceneId/assets/populate-from-dependencies` | 990-1125 | name-match `scenes.expected_*` to branch project_assets; bulk insert | auto-populate (`Stage8:256,259`), dead `handleDetectAndPopulateAssets` (`:460`) |
| R15 | GET `.../:instanceId/attempts` | 1135-1172 | backfill then list | `GenerationAttemptCarousel.tsx:67` |
| R16 | POST `.../:instanceId/attempts/:attemptId/select` | 1178-1213 | deselect all, select one, copy url into instance | `GenerationAttemptCarousel.tsx:73` |
| R17 | DELETE `.../:instanceId/attempts/:attemptId` | 1219-1254 | reject if selected; delete row + storage | `GenerationAttemptCarousel.tsx:86` |
| R18 | POST `.../:instanceId/use-master-as-is` | 1264-1358 | enabled: cap, deselect, insert `master_copy` attempt, set flag + image; disabled: flag only | `VisualStateEditorPanel.tsx:410` (enable only); `UseMasterAsIsCheckbox` ORPHANED |
| R19 | POST `/scenes/:sceneId/assets/bulk-use-master-as-is` | 1364-1448 | per-instance loop of R18 logic | `SceneAssetListPanel.tsx:361` (enable only) |
| R20 | GET `.../:instanceId/reference-chain` | 1458-1601 | builds chain (section 8.3) | `MasterReferenceCarousel.tsx:55` |
| R21 | POST `.../:instanceId/select-master-reference` | 1607-1661 | set selected_master_reference_*; `use_master_as_is=false` | `MasterReferenceCarousel.tsx:61` |
| R22 | POST `.../:instanceId/upload-image` (multer memory, 5MB, png/jpeg/webp) | 1671-1777 | storage upload, `uploaded` attempt selected, set image, clear master flag | `SceneAssetImageUpload.tsx:37` |
| R23 | GET `/scenes/:sceneId/transformation-events` | 1813-1822 | list with shot joins | `transformationEventService.fetchEvents` (`Stage8:316`, `VisualStateEditorPanel.tsx:151`) |
| R24 | POST `/scenes/:sceneId/transformation-events` | 1828-1846 | create (unconfirmed) | `VisualStateEditorPanel.tsx:262`, `ConvertToTransformationDialog.tsx:118` |
| R25 | PUT `/scenes/:sceneId/transformation-events/:eventId` | 1852-1865 | partial update | card blur edits, post image write, picker, convert |
| R26 | POST `.../transformation-events/:eventId/confirm` | 1871-1880 | `confirmed=true, confirmed_at=now` | `VisualStateEditorPanel.tsx:167` |
| R27 | DELETE `.../transformation-events/:eventId` | 1886-1895 | delete | "Dismiss"/"Delete" (`VisualStateEditorPanel.tsx:175`) |
| R28 | POST `.../transformation-events/:eventId/generate-post-description` | 1901-1910 | LLM (AI-4), persists post_description | card "Generate with AI" (`VisualStateEditorPanel.tsx:194`) |
| R29 | POST `/scenes/:sceneId/transformation-events/generate-prefill` | 1916-1938 | LLM (AI-5), no DB write | `AddTransformationDialog.tsx:174`, `ConvertToTransformationDialog.tsx:93` |
| R30 | POST `.../transformation-events/:eventId/generate-post-image` | 1944-2040 | `transformation_post` image job | `VisualStateEditorPanel.tsx:206` |
| R31 | GET `/assets/:projectAssetId/transformation-images` | 2050-2101 | confirmed events with post image, any scene | `TransformationImagePicker.tsx:46` |
| R32 | GET `.../:instanceId/field-versions/description_override` | 2111-2149 | backfill v1 (source `ai_generation`) then list | `VersionedTextarea` via `textFieldVersionService.listAssetFieldVersions` |
| R33 | POST `.../:instanceId/field-versions/description_override` | 2155-2188 | create selected version + write back `description_override` | VersionedTextarea Save |
| R34 | POST `.../field-versions/description_override/:versionId/select` | 2194-2216 | select + write back | VersionedTextarea prev/next arrows |
| R35 | POST `.../:instanceId/infer-context` | 2226-2268 | LLM (AI-2), no DB write | `VisualStateEditorPanel.tsx:370` |
| R36 | POST `/scenes/:sceneId/bulk-infer-context` (1-50 ids) | 2274-2330 | LLM (AI-3 or AI-2 xN), no DB write | `Stage8:547` |

No path collisions with other routers on `/api/projects` were found (grep of `projects.ts`, `projectAssets.ts`).

## 3. How an instance is created (all paths)

| Path | Trigger | Rows written | description_override | effective_description | image_key_url | status_tags / carry_forward | inherited_from | scene_numbers |
|---|---|---|---|---|---|---|---|---|
| Auto-populate, scene index > 0 | `useEffect` on Stage 8 mount when list empty and stage 8 not locked/outdated (`Stage8VisualDefinition.tsx:240-272`); calls R4 then R14 in one try (if R4 throws, R14 is skipped) | via R4 + R14 | see inherit / populate rows | | | | | |
| Auto-populate, first scene in list | same effect, `priorSceneIndex < 0` -> R14 only (`:257-260`) | R14 | | | | | | |
| Inherit (R4), scene_number > 1, prior scene N-1 exists | auto-populate or "Inherit" button (`SceneAssetListPanel.tsx:455-472`) | one row per instance of scene N-1 only (`assetInheritanceService.ts:66-71,93-96`) | prior override, or last confirmed transformation `post_description` (`:128-142`); NULL if prior `carry_forward=false` | `override ?? project_asset.description ?? ''` (`:272`) | prior `image_key_url ?? project image`, or transformation `post_image_key_url ?? ...`; if prior carry_forward=false: project image (`:118,137,147`) | copied (or transformation `post_status_tags`, which is always `[]` from UI-created events), `[]` if prior carry_forward=false; carry_forward copied | prior instance id (always, even when resetting) | not updated |
| Inherit (R4), scene_number = 1 | same | bootstrap: every branch project_asset with `locked=true OR deferred=true` (`assetInheritanceService.ts:184-188`) | NULL | `project_asset.description ?? ''` | project image; NULL for deferred (`:203`) | `[]` / true | NULL | not updated |
| Inherit (R4), scene_number > 1 but scene N-1 row missing | | `getPriorScene` returns null -> bootstrap -> throws "Bootstrap only allowed for Scene 1" (`:73-76,179-181`) -> 500 | | | | | | |
| Populate from dependencies (R14) | auto-populate | for each name in `scenes.expected_characters`, `expected_location`, `expected_props`: exact case-insensitive match against ALL branch project_assets (no `locked` filter) (`sceneAssets.ts:1029-1103`), skipping existing | NULL (not set) | `asset.description ?? ''` | NOT SET (NULL) | `[]` / true | NULL | not updated |
| AI detect (R2 then R3 per asset) | "Detect with AI" button -> `handleAIDetectAssets` (`Stage8VisualDefinition.tsx:505-540`) | R3 per `relevant_assets[]` (filtered to locked branch asset ids, `sceneAssetRelevanceService.ts:152-155`) | LLM `starting_description` (if non-empty) | same, else project description (`sceneAssets.ts:223`) | NOT SET | LLM `status_tags_inherited` / true | NULL | appended |
| Manual add from library | AssetDrawer "Add" (`AssetDrawer.tsx:139-170,197-221`); with shots present, shot checklist then also `shotAssetAssignmentService.createAssignments` | R3 | not sent (NULL) | project description | NOT SET | `[]` / true | NULL | appended |
| Create new asset inline | "Create new asset" form (`SceneAssetListPanel.tsx:523-575`) -> R13 | new `project_assets` row (`locked:true, source:'manual', scene_numbers:[n]`) + instance (`sceneAssets.ts:925-962`) | = typed description | = typed description | NOT SET | `[]` / true | NULL | set on new asset |

Consequences (verified by code above):
- Only R4 (inherit/bootstrap) copies an image. Every other path yields `image_key_url = NULL`, and the Stage 8 "Proceed" gatekeeper blocks until each instance has an image (`Stage8VisualDefinition.tsx:713-720`).
- AI detect with any asset already in scene: R3 returns 409 for that asset, `Promise.all` rejects, user sees "AI detection failed" toast even though others were created, and `new_assets_required` suggestions are not saved (`:509-537`).
- Inheritance is strictly N-1 by `scene_number` (`assetInheritanceService.ts:66-71`). An asset absent in N-1 is not inherited from N-2. The relevance prompt alone uses a "last appearance anywhere earlier" lookup (`sceneAssetRelevanceService.ts:45-103`).
- `handleDetectAndPopulateAssets` (R14 then fallback R2) is defined but never referenced (`Stage8VisualDefinition.tsx:456-502`): DEAD.

## 4. What inherits from the previous scene vs project asset vs nothing

Inherited from N-1 instance (one-time copy at creation, never re-synced): `description_override`, `image_key_url`, `status_tags`, `carry_forward` (only when prior `carry_forward=true`), `inherited_from_instance_id` link. If the prior instance has >= 1 confirmed transformation event, the LAST one by trigger `shot_order` supplies `description_override`, `status_tags` and (if set) `image_key_url` (`transformationEventService.ts:528-557`, `assetInheritanceService.ts:127-142`).
NOT inherited (new row defaults): generation attempts (new instance starts with none; first GET attempts backfills one `generated` attempt from the copied URL), `use_master_as_is` (false), `selected_master_reference_*` (NULL), `modification_*` (0/NULL), transformation events, shot_asset_assignments, text_field_versions, suggestions.
From project asset at creation: `effective_description` fallback and (bootstrap/carry_forward=false) `image_key_url`. After creation, project-asset edits do not propagate (section 14).
Live (read-time) uses of earlier scenes: reference chain (R20) and relevance prompt context; neither writes the instance.

## 5. Description fields and versions

- Three representations of "the scene description": `description_override` (column), `effective_description` (column, what downstream reads), `text_field_versions` rows for `description_override` (history, max 8). They are synchronized only partially:
  - PUT R8 updates `effective_description` only when the body has `descriptionOverride` (`sceneAssets.ts:622-625`). Empty string is kept as empty (`??` does not coalesce `''`), so `effective_description=''` is possible (e.g., bulk-apply of an empty suggestion, section 11).
  - Version create/select R33/R34 write back ONLY `description_override` (`textFieldVersionService.ts:226-240`). The UI then calls R8 via `onVersionChange` (`VersionedTextarea.tsx:121-122,140-141` -> `VisualStateEditorPanel.tsx:571-577`), which recomputes `effective_description`. Two requests per save; if the second fails, `effective_description` is stale.
  - Writes that bypass versions: inherit, AI-detect create, create-with-project-asset, accept story-context (single and bulk), upload-modal accept (`VisualStateEditorPanel.tsx:351-362`), tag-only updates. Version backfill (R32) labels the pre-existing override `source='ai_generation'` regardless of origin (`textFieldVersionService.ts:163-173`).
- The editor textarea is `VersionedTextarea`; typing updates only local state (`VisualStateEditorPanel.tsx:568-570`). Persisting requires the "Save" button (shown when value differs from selected version content). `handleSaveDescription` (`:277-285`) is never referenced: DEAD.
- Initial textarea value: `description_override ?? effective_description ?? project_asset.description` (`:136`).

## 6. Status tags, carry-forward, tag prompt, "locked"

### 6.1 Tags
- Editor: `StatusTagsEditor.tsx:47-70` lowercases/trims, de-dupes, autocomplete from `COMMON_STATUS_TAGS` (18 tags, 4 categories) `statusTags.ts:21-47`; `projectTags` prop exists but `VisualStateEditorPanel` never passes it (`VisualStateEditorPanel.tsx:769-775`). Each add/remove issues PUT R8 immediately with `modificationReason` (`:287-297`).
- Color: `getTagColors` category lookup, unknown -> `custom` (`statusTags.ts:88-99`).
- Tags enter prompts: scene asset image prompt `"<effective_description>. Visual modifiers: <tags>."` (`ImageGenerationService.ts:219-223`); downstream prompt generation renders `[tag1, tag2]` per asset (`promptGenerationService.ts:693`); context manager / continuity composition read them (`contextManager.ts:246`, `continuityCompositionService.ts:528`).

### 6.2 Carry-forward and the tag prompt
- `carry_forward` toggle: Switch in StatusTagsEditor -> R8 `carryForward` (`VisualStateEditorPanel.tsx:299-309`). It only matters when the NEXT scene is created by inherit (R4).
- Tag carry-forward prompt (`TagCarryForwardPrompt.tsx`, wired `Stage8VisualDefinition.tsx:366-410,863-873`): on Stage 8 load, if the CURRENT scene has inherited instances (`inherited_from_instance_id` set) with non-empty `status_tags`, and `localStorage['tag-prompt-<sceneId>']` is unset, a dialog lists those tags (already copied) and lets the user keep all / none / a subset. Confirm sends R8 `statusTags=<subset>` per instance with reasons "Carried forward all/selected tags..." or "Removed all tags..." and sets the localStorage key; closing also sets it. State is per browser (localStorage), not persisted server-side.

### 6.3 Meanings of "locked" / "confirmed" in this slice (five distinct concepts)
1. Scene stage lock (stage 8): `scenes.stage_locks['8']` via `useSceneStageLock` / `sceneStageLockService` (`Stage8VisualDefinition.tsx:137-151`). "Proceed" = gatekeeper (images present, no unconfirmed events, no confirmed events with empty post_description) then `onComplete` -> `ProjectView.handleSceneStageComplete` -> `sceneStageLockService.lockStage(project, scene, 8)` (`ProjectView.tsx:589-600`). Effect inside Stage 8: only suppresses auto-populate (`Stage8VisualDefinition.tsx:243`) and shows `LockedStageHeader`; no lock prop reaches `SceneAssetListPanel` or `VisualStateEditorPanel` (`:780-838`), and no backend route checks stage locks. `handleLockAndProceed` is unreachable (header renders only when locked/outdated, and then `onLockAndProceed` is undefined) (`:759-771`).
2. "Lock Asset" button: appends literal tag `'locked'` to `status_tags` (`VisualStateEditorPanel.tsx:311-324`). UI then disables the description textarea, Infer from Story, Add Transformation, and the tag editor (incl. tag removal and carry-forward switch) (`:433,581,590,724,774`; `StatusTagsEditor.tsx:136,150,230`). There is no unlock control; tags can only be removed via the next scene's tag prompt or bulk paths. Not blocked while locked: Generate Image, Upload, master reference select, use-master, Remove, bulk "Update from Context" apply (overwrites override). The `'locked'` string flows into image prompts and prompt-gen tag lists (6.1) and carries forward to the next scene.
3. List badge "locked" (`SceneAssetListPanel.tsx:60-64`): computed = has `image_key_url` AND `modification_count` is 0/null. Unrelated to 1 or 2. Since the modification trigger counts every UPDATE (image job completion, select-attempt), it effectively shows "locked" only for instances whose image came from inherit/bootstrap insert and were never updated. A different, unused `reviewStatus()` in `Stage8VisualDefinition.tsx:69-74` keys off the `'locked'` tag (DEAD, CONTRADICTED).
4. `project_assets.locked` (Stage 5 domain): filters relevance candidate assets (`sceneAssetRelevanceService.ts:131-135`) and bootstrap (`assetInheritanceService.ts:188`). R13 creates assets with `locked:true`.
5. `transformation_events.confirmed`: only confirmed events are used by resolution, inheritance, reference chain, Stage 10 (sections 9, 14). No un-confirm route.

## 7. Image lifecycle for scene asset instances

### 7.1 Generate (single/bulk)
UI "Generate Image" (`VisualStateEditorPanel.tsx:508-525`; disabled when `use_master_as_is`) -> `handleGenerateImage` (`Stage8VisualDefinition.tsx:638-654`) -> R5 -> requires Stage 5 latest `stage_states.content.locked_visual_style_capsule_id` or `manual_visual_tone` (`sceneAssets.ts:366-381`; latest version regardless of status) -> `createSceneAssetImageJob` (`ImageGenerationService.ts:193-243`): prompt = effective_description + "Visual modifiers" tags + white-background isolation for character/prop/extra_archetype (`:78-89`); dims by asset type (`:57-63`); reference image priority: request `referenceImageUrl` (UI sends current `image_key_url` only when "Use as ref" switch on, `VisualStateEditorPanel.tsx:511-514,528`) > `selected_master_reference_url` > `project_assets.image_key_url`; idempotency key includes `Date.now()` (no dedupe). `createImageJob` inserts `image_generation_jobs` (status `queued`) and runs `executeJobInBackground` un-awaited (`:143-186`): `processing` -> `generating` -> provider `NanoBananaClient` (`gemini-2.5-flash-image`, `NanoBananaClient.ts:117-119`) -> `uploading` -> storage upload -> for `scene_asset`: look up instance by (scene_id, project_asset_id), enforce cap, deselect, insert `generated` attempt (selected, prompt_snapshot, cost) and update `image_key_url` (`:442-495`) -> job `completed` with `public_url`. On error: job `failed` with `failure_stage` (`:549-572`); instance untouched.
Polling: frontend polls `GET /api/images/jobs/:jobId` every 2s, 60 tries (120s) (`Stage8VisualDefinition.tsx:438-454`; `sceneAssetService.ts:366-433`). Timeout toasts an error but the background job may still complete and write later.
Bulk: "Generate (n)" -> cost modal with hardcoded `COST_PER_IMAGE = 1` (`Stage8VisualDefinition.tsx:126,854-861`) -> parallel R5 per selected id (`sceneAssetService.ts:331-361`) -> `pollBulkImageJobs`. Bulk does not skip `use_master_as_is` instances; a generated attempt then becomes selected while `use_master_as_is` stays true.

### 7.2 Attempts carousel
`GenerationAttemptCarousel.tsx`: list (R15, with backfill), Select (R16 -> instance `image_key_url` = attempt url; does not change `use_master_as_is`), Delete non-selected (R17, removes storage file only if `storage_path` set, i.e., not for master_copy/backfilled rows).

### 7.3 Master reference chain and "use master as-is"
R20 builds, in order: (a) Stage 5 `project_assets.image_key_url`; (b) for each scene on the active branch with lower `scene_number` (ascending), that scene's instance of the same project asset: its selected attempt url else `image_key_url`; (c) confirmed transformation events of the same project asset with `post_image_key_url`, scene_number <= current (includes current scene); then de-dupe by URL keeping first (`sceneAssets.ts:1505-1594`). Carousel opens at the last item but does not auto-select (`MasterReferenceCarousel.tsx:121-124`). "Select as Reference" -> R21 writes `selected_master_reference_{url,source,instance_id}` and forces `use_master_as_is=false` (`sceneAssets.ts:1628-1638`); R21 does not verify the URL belongs to the chain, nor that the instance belongs to the scene. On the active item, "Use as Scene Instance Image" -> R18 enabled=true: master url = `selected_master_reference_url || project image`; cap; deselect; insert `master_copy` attempt selected; set `use_master_as_is=true`, `image_key_url=url` (`:1296-1332`). Bulk variant R19 from the list footer. The only UI way to set `use_master_as_is=false` is R21 (selecting a different reference); `UseMasterAsIsCheckbox.tsx` is never rendered (ORPHANED). While true, Generate/Upload/description/infer are disabled in the editor (`VisualStateEditorPanel.tsx:515,549,581,590`).

### 7.4 Upload, analyze, edit
Upload zone (R22) -> stored, `uploaded` attempt selected, `image_key_url` set, `use_master_as_is` cleared. On success `handleUploadComplete` calls R7 (Gemini vision extract + merge, AI-7/AI-8) and opens `EnhancedUploadModal` (`VisualStateEditorPanel.tsx:327-349,811-851`). Modal actions Edit/Apply style/Remove BG/Regenerate call R6 (job type `scene_asset`; prompt = `"<editInstructions>. Context: <description>"` + isolation suffix; reference from client) and poll; completion handler creates a `generated` attempt and sets `image_key_url` like 7.1. Accept writes `descriptionOverride=finalDescription` via R8 (`:351-362`).

## 8. Transformation events

### 8.1 Model and semantics
A transformation is a within-scene change of one scene asset instance, anchored to shots of that scene: `instant` (switch at trigger shot), `within_shot` (at trigger shot the asset is still pre but flagged `is_transforming` with narrative and post data; post from the next shot), `gradual` (pre until completion shot; post at/after completion; nothing intermediate). Exact rule: `resolveOverridesForShot` (`transformationEventService.ts:107-201`), considering only `confirmed` events, sorted by trigger `shot_order`, cumulative (stacking). Gradual with `completion_shot_id` NULL (e.g., completion shot deleted -> SET NULL) never reaches post. Override emitted only when description or image differs from instance defaults, or `is_transforming`.

### 8.2 Creation paths
- Manual: "Add Transformation" (`AddTransformationDialog.tsx`, rendered at `VisualStateEditorPanel.tsx:719-728`, disabled when asset has `'locked'` tag). Picking a trigger shot or changing type auto-calls R29 prefill (AI-5) unless both fields were user-edited (`AddTransformationDialog.tsx:164-189`). Submit requires trigger + post_description (+ completion for gradual) (`:199-213`). `handleAddTransformation` sends `pre_description = editedDescription` (`VisualStateEditorPanel.tsx:253-275`); its `useCallback` deps omit `editedDescription`, so the value captured may be stale relative to the textarea. Backend: if `pre_description` empty, uses instance `effective_description` or project description (`transformationEventService.ts:239-248`); inserts `confirmed=false`, `detected_by='manual'`. `post_status_tags`/`pre_status_tags`/`pre_image_key_url` are never sent by UI.
- Convert-to-transformation: list item menu (`SceneAssetListPanel.tsx:191-196`) -> `ConvertToTransformationDialog`: pick base asset; R29 with `absorbed_instance_id` (backend infers trigger/type/completion from the absorbed instance's `shot_asset_assignments` order: 1 shot -> instant, more -> gradual first->last) (`transformationEventService.ts:430-464`); prefilled AddTransformationDialog; on submit: R24 on base asset, R25 `post_image_key_url = absorbed image_key_url` if any, R9 delete the absorbed instance (cascades its attempts/events/assignments), toast action "Defer from project" -> `projectAssetService.updateAsset(... {deferred:true})` (`ConvertToTransformationDialog.tsx:79-159`).
- Automatic detection: NONE. Stage 7 shot extraction writes `shots.transformation_flags` (`projects.ts:1928`, value is `JSON.stringify(...)` into a JSONB column) but no code reads `transformation_flags` to create events; `detected_by` values `stage7_extraction`/`stage8_relevance` are never produced. The card's "AI Detected" label (`TransformationEventCard.tsx:91-92`) is unreachable.

### 8.3 Confirm, edit, post description/image
- Card (`TransformationEventCard.tsx`): local `postDesc`/`narrative` state initialized once from props (`:49-50`, no sync effect); blur writes R25 if changed (`:62-71`). "Generate with AI" (unconfirmed only) -> R28 (AI-4) which overwrites and persists `post_description` (`transformationEventService.ts:327-374`); the parent updates the event object but the card's textarea keeps the old local value, the Confirm button still keys off the stale local value, and the next blur can write the old text back over the AI result.
- Confirm (R26) requires non-empty local postDesc (`:255-262`); sets `confirmed=true`, `confirmed_at`. Irreversible from UI; editing post_description remains possible after confirm. Dismiss/Delete = R27.
- Post image (only after confirm, `:162-253`): "Generate Image" -> R30: requires `post_description`; Stage 5 style; reference = client ref (current post image when "Use as ref") > instance `image_key_url` > project image; prompt = `post_description` + `"Visual modifiers: <post_status_tags>"` (no white-background isolation is injected for `transformation_post`, because `createImageJob` injects only for master_asset/angle_variant and R30 does not call `injectBackgroundContext`) (`sceneAssets.ts:2005-2032`, `ImageGenerationService.ts:124-135`). Completion writes `transformation_events.post_image_key_url` (`ImageGenerationService.ts:428-440`); the frontend also writes the same URL via R25 after polling (`VisualStateEditorPanel.tsx:211-219`) (DUPLICATED write). No attempts history for transformation images. "Use Existing" -> R31 picker of confirmed post images of the same project asset across scenes -> R25.
- Stage 8 gatekeeper blocks "Proceed" if any event is unconfirmed or any confirmed event has blank post_description (`Stage8VisualDefinition.tsx:313-320,721-734`); events are fetched separately via React Query key `['transformation-events', projectId, sceneId]`, which the editor panel's local list (plain `useState`, `VisualStateEditorPanel.tsx:114,143-163`) does not invalidate on confirm/add/delete, so the gatekeeper count can be stale until refetch (only post-image and convert paths invalidate that key).

### 8.4 Effects on later shots and scenes
- Same scene, downstream shots: frame/video prompt generation fetches confirmed events and applies `resolveOverridesForShot` per shot (`routes/frames.ts:600-617`; `promptGenerationService.ts:1075`; `routes/projects.ts:3788-3800`; within-shot handling `promptGenerationService.ts:711,940,1233-1300`). Stage 10 also reads confirmed events for reference images (`frames.ts:1719-1727`, `frameGenerationService.ts:231-240,586`).
- Later scenes: only through inheritance at instance creation (section 4) and through reference chain / transformation picker (live reads). If an asset is already instantiated in scene N+1, confirming an event in scene N changes nothing there.
- Inheriting from a transformed asset sets tags to the event's `post_status_tags`, which UI never populates, so inherited tags become `[]` (prior tags dropped).

## 9. Suggestions
Source: AI relevance `new_assets_required` (advisory, no IDs). Written by R11 after AI detect (`Stage8VisualDefinition.tsx:521-533`) with failures swallowed (e.g., LLM `asset_type` outside the CHECK list). Shown in the "Suggested - not in library" block (`SceneAssetListPanel.tsx:725-774`) from R10 (falls back to in-memory `newAssetsRequired` when none persisted). "Add from library" only opens AssetDrawer (no link to the suggestion; `accepted` and `asset_id` never written anywhere in Stage 8). "Ignore" -> R12 `dismissed:true`. Repeated detection inserts duplicate suggestions (no de-dupe).

## 10. Relevance detection (AI-1) details
`detectRelevantAssets` (`sceneAssetRelevanceService.ts:109-157`): inputs `scenes.script_excerpt`, shots (`shot_id, characters_foreground, setting, action`; `characters_background` selected but not printed), last known state per asset from any earlier scene (with transformation post-state override), locked branch assets. System prompt: "You are an asset continuity manager. Respond with valid JSON only, no markdown or extra text." User prompt `:191-239` (rules: only listed IDs; use last known state else master). temperature 0.3, maxTokens 4096. Parse: first `{...}` regex + JSON.parse (`:242-252`); throws on failure (500). Filter to valid IDs. Output not persisted except via the client creating instances (R3) and suggestions (R11).

## 11. Story-context inference (single AI-2, bulk AI-3)
`StoryContextService` (`storyContextService.ts`): context = `scenes.script_excerpt`, ALL beats of latest `stage_states` stage 3 with `status='locked'` (`Beat n: text`), "treatment" (`content.treatmentProse` of stage 3, else stage 2 `content.treatments[selectedTreatmentId].content`), shot lines (action/dialogue/setting/characters) (`:52-146`). The treatment lookup keys do not match what Stage 2/3 frontends save (`Stage3BeatSheet.tsx:47-53` stores `treatmentSource.content`; `Stage2Treatment.tsx:26-29` stores `variations`/`activeVariation`), so treatment text appears to be always `'(not available)'` (CONTRADICTED; confirm by inspecting stored `stage_states.content`).
Single (R35): one call, prompt `:374-414`, temp 0.3, maxTokens 2048; result shown in the editor with Accept Description / Accept Tags (union) / Accept Both -> R8 (`VisualStateEditorPanel.tsx:365-405`). Bulk (R36): <=4 instances -> one batched call (`:282-364`, maxTokens 4096) mapped back by `instanceId`; >4 -> parallel single calls with per-asset error captured into `reasoning` (`:203-241`). Modal pre-selects rows whose suggestion differs (`BulkContextUpdateModal.tsx:55-63`); "Select All" also selects empty/error rows. Apply -> sequential R8 `descriptionOverride=suggested_description` (may be `''`), `statusTags = existing ∪ suggested` (`Stage8VisualDefinition.tsx:556-583`). Bulk apply ignores the `'locked'` tag.

## 12. UI action -> call chain (Stage 8)

| UI action | Handler | Service | Route | Backend | Tables/providers |
|---|---|---|---|---|---|
| Enter Stage 8 (empty scene) | `autoPopulate` `Stage8:248-272` | `inheritAssets`, `populateFromDependencies` | R4, R14 | `AssetInheritanceService.inheritAssetsFromPriorScene`; inline | scenes, scene_asset_instances, project_assets, transformation_events |
| Inherit button | `inheritMutation` `:428-435` | `inheritAssets` | R4 | same | same |
| Detect with AI | `handleAIDetectAssets` `:505-540` | `detectRelevantAssets`, `createSceneAsset` xN, `saveSuggestions` | R2, R3, R11 | relevance LLM | Gemini via llmClient; instances; suggestions; project_assets.scene_numbers |
| Add from existing | AssetDrawer `:139-221` | `createSceneAsset` (+ shot assignments) | R3 | | instances, shot_asset_assignments |
| Create new asset | `createWithProjectAssetMutation` `:660-669` | `createSceneAssetWithProjectAsset` | R13 | | project_assets, instances |
| Remove from scene | `deleteMutation` `:679-700` | `deleteSceneAsset` | R9 | | instances (+cascade) |
| Select asset | `setSelectedAsset` | | | | React state only |
| Edit description + Save | VersionedTextarea `handleSave` | `createAssetFieldVersion` then R8 via `onVersionChange` | R33, R8 | `TextFieldVersionService.createVersion` | text_field_versions, instances |
| Version prev/next | `handleNavigate` | `selectAssetFieldVersion`, then R8 | R34, R8 | | same |
| Add/remove tag | `handleStatusTagsChange` `VSE:287-297` | `updateSceneAsset` | R8 | | instances |
| Carry-forward switch | `handleCarryForwardChange` `:299-309` | same | R8 | | instances |
| Lock Asset | `handleLock` `:311-324` | same (`'locked'` tag) | R8 | | instances |
| Generate Image | `handleGenerateImage` `Stage8:638-654` | `generateSceneAssetImage`, poll | R5, `/api/images/jobs/:id` | `ImageGenerationService` | image_generation_jobs, storage, attempts, instances; Gemini image |
| Bulk Generate | `handleBulkGenerateConfirmed` `:596-629` | `bulkGenerateImages`, `pollBulkImageJobs` | R5 xN | same | same |
| Bulk Use Master As-Is | `bulkMasterMutation` `SALP:358-373` | `bulkUseMasterAsIs` | R19 | `SceneAssetAttemptsService` | attempts, instances |
| Select attempt / delete attempt | carousel | `selectAttempt` / `deleteAttempt` | R16 / R17 | attempts service | attempts, instances, storage |
| Select master reference | carousel | `selectMasterReference` | R21 | inline | instances |
| Use as Scene Instance Image | `useMasterAsIsMutation` `VSE:407-420` | `setUseMasterAsIs(true)` | R18 | | attempts, instances |
| Upload | `SceneAssetImageUpload` | `uploadSceneAssetImage`, then `analyzeSceneAssetImage` | R22, R7 | storage; `ImageAnalysisService` | storage, attempts, instances; Gemini vision |
| Upload modal edit/regenerate/remove-bg/apply style | `EnhancedUploadModal` callbacks | `startEditImageJob`, poll | R6 | image service | jobs, storage, attempts, instances |
| Infer from Story / accept | `handleInferFromStory` `VSE:365-405` | `inferContext`, `updateSceneAsset` | R35, R8 | `StoryContextService` | stage_states, shots, scenes (read); instances |
| Update from Context (bulk) | `handleBulkInferContext`/`handleApplyBulkContext` `Stage8:543-583` | `bulkInferContext`, `updateSceneAsset` xN | R36, R8 | same | same |
| Tag carry-forward dialog | `handleTagCarryForwardConfirm` `:389-410` | `updateSceneAsset` xN | R8 | | instances; localStorage |
| Add Transformation | `handleAddTransformation` `VSE:253-275` (+prefill) | `generatePrefill`, `createEvent` | R29, R24 | `TransformationEventService` | shots, instances, scenes (read); transformation_events |
| Confirm / Dismiss / edit fields | card handlers `VSE:165-189` | `confirmEvent`/`deleteEvent`/`updateEvent` | R26/R27/R25 | | transformation_events |
| Generate post-description | `VSE:191-201` | `generatePostDescription` | R28 | LLM | transformation_events |
| Generate post image | `VSE:203-238` | `generatePostImage`, poll, `updateEvent` | R30, R25 | image service | jobs, storage, transformation_events |
| Use Existing transformation image | picker | `fetchTransformationImages`, `updateEvent` | R31, R25 | | transformation_events |
| Convert to Transformation | `ConvertToTransformationDialog` | `generatePrefill`, `createEvent`, `updateEvent`, `deleteSceneAsset`, optional `projectAssetService.updateAsset` | R29, R24, R25, R9 | | events, instances, project_assets.deferred |
| Ignore suggestion | `Stage8:793-803` | `updateSuggestion({dismissed:true})` | R12 | | suggestions |
| Proceed | `handleProceedToStage9` `:713-736` -> `ProjectView.handleSceneStageComplete` | `sceneStageLockService.lockStage` | sceneStageLocks route | | scenes.stage_locks |

Also mounted inside Stage 8 (other slices): `useShotAssetAutoPopulate` (`Stage8:302-311`), `LocationCoveragePanel` (`:841-844`), `ContentAccessCarousel` (`:773-777`), `AssetDrawer`.

## 13. AI calls in this slice
| ID | Callsite | Provider/model | Prompt source | Output/persist |
|---|---|---|---|---|
| AI-1 | `sceneAssetRelevanceService.ts:detectRelevantAssets` | `llmClient.generate` (Gemini via LangChain; `GEMINI_MODEL` or default) | inline `:144-149,191-239` | JSON -> client creates instances + suggestions |
| AI-2 | `storyContextService.ts:callInferenceLLM` | llmClient | `:268-274,374-414` | JSON -> UI review -> R8 |
| AI-3 | `storyContextService.ts:callBulkInferenceLLM` | llmClient | `:286-344` | JSON -> modal -> R8 |
| AI-4 | `transformationEventService.ts:generatePostDescription` | llmClient | `:353-363` | text (truncated 500) persisted to post_description |
| AI-5 | `transformationEventService.ts:generateTransformationPrefill` | llmClient | `:472-491` | JSON (fence-stripped; fallback raw text) -> dialog fields |
| AI-6 | `ImageGenerationService.ts:createSceneAssetImageJob` (R5) | NanoBanana `gemini-2.5-flash-image` | description + tags + isolation | image -> storage, attempt, instance |
| AI-6b | R6 edit-image prompt (`sceneAssets.ts:468-481`) | same | instructions + client description | same |
| AI-6c | R30 transformation_post (`sceneAssets.ts:2012-2032`) | same | post_description + post tags | storage, event post_image_key_url |
| AI-7 | `imageAnalysisService.ts:analyzeAssetImage` (R7) | `@google/generative-ai` `gemini-2.5-flash` vision | `:48-52` | extracted description (not persisted) |
| AI-8 | `imageAnalysisService.ts:mergeDescriptions` | `gemini-2.5-flash` | `:96-104` | merged text -> modal -> R8 on accept |
`llmClient` default model: constructor `gemini-2.5-flash-lite`, `generate()` fallback `gemini-1.5-flash` when `GEMINI_MODEL` unset (`llm-client.ts:76,106`) (cross-slice).

## 14. Invalidation / propagation matrix
| Change | What happens to scene instances / events | Evidence |
|---|---|---|
| Project asset description edited (Stage 5) | Nothing. `effective_description` snapshots remain; recomputed from the new base only on a later PUT that includes `descriptionOverride` (incl. null). No staleness flag. | `sceneAssets.ts:619-625`; no other writer (grep) |
| Project asset image regenerated | Instance `image_key_url` unchanged. Live effects: reference chain item (a) shows new image; generate-image default reference uses new image if no `selected_master_reference_url`; use-master uses it. `style_outdated` exists only on project_assets. | `sceneAssets.ts:1506-1518`, `ImageGenerationService.ts:241,406-410` |
| Project asset deleted | CASCADE deletes instances -> attempts, transformation events, shot_asset_assignments. | `015:16`, `022:11`, `030:14`, `033:12` |
| Project assets merged / split | Instances re-pointed to survivor/variant; survivor-duplicate instances deleted (assignments migrated). Instance descriptions/images kept. | `projectAssets.ts:777-873,1077-1110` (cross-slice) |
| Scene script re-extracted (Stage 4) | Matched scenes keep their ID (instances untouched, `script_excerpt` and `expected_*` updated); unmatched old scenes deleted -> cascade instances, attempts, events, suggestions. | `projects.ts:~1378-1470` (cross-slice) |
| Prior scene instance edited after next scene inherited | Nothing propagates. Next scene keeps copied values; link `inherited_from_instance_id` unchanged. Reference chain is live. | `sceneAssets.ts:315-325` (inherit only when empty) |
| Prior scene instance deleted | `inherited_from_instance_id` and `selected_master_reference_instance_id` SET NULL (badge flips to "Master"). | `015:27`, `022:67-68` |
| Shot deleted | Events with that trigger deleted (CASCADE); completion -> NULL (gradual stuck at pre). | `030:20,26` |
| Transformation confirmed/edited | Affects prompt/frame generation of the same scene at read time; later scenes only if inherited afterwards. No re-generation is triggered. | section 8.4 |
| Stage 8 unlocked | Scene stage-lock route marks downstream locked stages outdated (cross-slice); nothing in Stage 8 data changes. | `sceneStageLocks.ts:187-252` |
| Re-inherit | Not possible unless all scene instances are deleted first (400). | `sceneAssets.ts:321-325` |

## 15. Ownership / validation facts (route-level only; service role bypasses RLS)
- Transformation event routes R23-R29 perform NO project ownership or scene-membership check; they act on `sceneId`/`eventId` from the URL (`sceneAssets.ts:1813-1938`). R30 checks project ownership and event-in-scene.
- R5 checks project only; `createSceneAssetImageJob` loads the instance by id without scene/project check (`ImageGenerationService.ts:201-208`).
- R21 updates by `instanceId` only (no scene check) (`sceneAssets.ts:1635-1638`). R32-R34 check project only; version rows are keyed by `entity_id` alone.
- R8, R9, R15-R19, R22 check project ownership and `instance.scene_id = :sceneId` but not that `:sceneId` belongs to `:projectId`. R10-R12 check project only.
- R1-R4, R13, R14, R35, R36 check scene belongs to the project's active branch.

## 16. Tests
- `backend/src/tests/transformationEvents.test.ts`: real `resolveOverridesForShot` (instant, within_shot, gradual, stacking, unconfirmed ignored, multi-asset, shot-order fallback). TESTED.
- `backend/src/tests/transformationPrefill.test.ts`: real `generateTransformationPrefill` with mocked supabase/llm (no absorbed, absorbed 1 assignment -> instant, multiple -> gradual, none, fenced JSON). TESTED.
- `backend/src/tests/transformationFlagParsing.test.ts`: tests a re-implemented copy of the Stage 7 flag parser ("Simulates ... logic", `:33-36`), not the real service.
- `backend/src/tests/storyContextService.test.ts`: tests replicated copies of private parse functions and shot formatting (`:10-16`), not the class.
- `backend/src/tests/textFieldVersionService.test.ts`: asserts locally defined constants/mappings ("contract", `:1-8`), not the service.
- `src/lib/services/__tests__/sceneAssetService.inferContext.test.ts`, `...editImage.test.ts`: real frontend client fetch shape/auth/error handling for `inferContext`, `bulkInferContext`, `startEditImageJob`, `analyzeSceneAssetImage`.
- Playwright `e2e/story-context-update.spec.ts`, `e2e/enhanced-upload-modal.spec.ts` (UI flows; require running stack; status UNKNOWN).
- No tests for: sceneAssets routes, AssetInheritanceService, SceneAssetRelevanceService, SceneAssetAttemptsService, reference chain, use-master, upload, suggestions, Stage 8 components, statusTags.ts, `getLastAssetStateForInheritance`.

## 17. Dead / orphaned / duplicated
- DEAD: `handleDetectAndPopulateAssets` (`Stage8VisualDefinition.tsx:456-502`); `handleSaveDescription` (`VisualStateEditorPanel.tsx:277-285`); `typeIcons`, `AssetTypeKey`, `sourceBadge`, `reviewStatus`, `statusColors` in `Stage8VisualDefinition.tsx:56-80`; `assetFilters` state set but unread (`:194,806`); `CostConfirmModal` labeled "stub" but functional with fixed cost; `AssetInheritanceService.getInheritanceChain` (no caller found); `sceneAssetService` `pre_image_key_url`/`pre_status_tags`/`post_status_tags` fields never set by UI.
- ORPHANED: `src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx` (no render site); R18 `enabled:false` branch (only reachable via orphan); R8 `imageKeyUrl`; R3 `inheritedFromInstanceId`; R12 `accepted`; `scene_asset_suggestions.asset_id`; `transformation_events.detected_by` non-manual values; `shots.transformation_flags` (write-only).
- DUPLICATED: post image URL written by backend job completion and again by frontend R25 (section 8.3); description persisted via R33 write-back and R8; three "review status/locked" computations (section 6.3); master-as-is logic duplicated between R18 and R19; edit-image route re-implements background isolation and aspect ratios already in `ImageGenerationService` (`sceneAssets.ts:477-490` vs `ImageGenerationService.ts:57-89`).

## Cross-slice references
- `src/pages/ProjectView.tsx:589-615` `handleSceneStageComplete` locks the scene stage then advances; Stage 8 "Proceed" relies on it.
- `backend/src/routes/sceneStageLocks.ts:187-252` unlock marks downstream stages `outdated`; no data invalidation.
- `src/components/pipeline/AssetDrawer.tsx:139-170` creates instances + `shot_asset_assignments` with `presenceType:'throughout'`.
- `src/lib/hooks/useShotAssetAutoPopulate` is mounted in Stage 8 (`Stage8VisualDefinition.tsx:302-311`) once shots and instances exist.
- `backend/src/routes/projects.ts:1928` writes `shots.transformation_flags` as a JSON string; consumer absent.
- `backend/src/services/shotExtractionService.ts:257,282,375-376` LLM prompt asks for `transformation_flags`.
- `backend/src/services/promptGenerationService.ts:670-711,1061-1075,1233-1300` consumes `effective_description`, `status_tags`, transformation overrides.
- `backend/src/routes/projects.ts:3624-3660,3788-3800` prompt-gen route reads instances (incl. `use_master_as_is`, `selected_master_reference_url`) and confirmed events.
- `backend/src/routes/frames.ts:553-617,1706-1727`; `backend/src/services/frameGenerationService.ts:231-240,586-590` consume instances and confirmed events.
- `backend/src/services/contextManager.ts:225-248`, `continuityCompositionService.ts:492-530` read instance fields (master image = `selected_master_reference_url ?? project image`).
- `backend/src/routes/projectAssets.ts:3424-3429` uses `jobType:'scene_asset'` without `sceneId`/`assetId` for location views so the scene-asset completion handler is skipped.
- `backend/src/routes/projectAssets.ts:777-873,1077-1110` merge/split re-point instances.
- `backend/src/routes/projects.ts:~1378-1470` scene reconcile preserves IDs by slug+number, deletes unmatched scenes.
- `backend/src/services/llm-client.ts:76,106` default model mismatch (`gemini-2.5-flash-lite` vs `gemini-1.5-flash`).
- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx` rendered at `Stage8VisualDefinition.tsx:841` (V7).
- Stage 9 and Stage 10 call `sceneAssetService.listSceneAssets` (`Stage9PromptSegmentation.tsx:137`, `Stage10FrameGeneration.tsx:301`).

## Contradictions / unknowns
- CONTRADICTED: comment in `assetInheritanceService.ts:41-44` "Scene N can only inherit from Scene N-1" holds, but `sceneAssetRelevanceService.ts:3-4` claims "non-linear inheritance" for the system; only the relevance prompt is non-linear.
- CONTRADICTED: editor text "Edits here create a new scene instance and are saved to the asset history" (`VisualStateEditorPanel.tsx:790-793`); edits update the existing row in place.
- CONTRADICTED: card text "applies from Shot <trigger> onward" for `within_shot` (`TransformationEventCard.tsx:284-285`) vs resolver (trigger shot still pre + transforming).
- CONTRADICTED: story-context treatment keys vs stored Stage 2/3 content (section 11). Settle by reading actual `stage_states.content` rows.
- CONTRADICTED: three different "locked" status notions in the list/editor (section 6.3).
- UNKNOWN: whether `project_assets.source='manual'` satisfies any CHECK constraint (V5 owns project_assets schema).
- UNKNOWN: whether Stage 7 re-extraction deletes and re-inserts shots (would cascade-delete transformation events); not traced (Stage 7 slice).
- UNKNOWN: runtime behavior of Supabase nested filter `.eq('scene_asset_instance.project_asset_id', ...)` with `!inner` in R20/R31; appears correct syntax but only runtime would confirm.
- UNKNOWN: whether `BulkContextUpdateModal.tsx:60` `r.id` compiles under the project's TS settings (type lacks `id`); runtime falls back to `instanceId`.
- UNKNOWN: whether the Playwright specs pass.
