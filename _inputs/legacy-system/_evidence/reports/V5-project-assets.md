# V5: Project-level assets (Stage 5 as found in code), asset images, location views, angle variants

Reporter V5. HEAD of `main`. Read-only static analysis. Evidence is `path:line`. All backend routes below are mounted at `/api/projects` behind `authenticateUser` (`backend/src/server.ts:52`); `/api/images` at `backend/src/server.ts:84`. Stage 5 UI is rendered from `src/pages/ProjectView.tsx:967-974`.

## 1. Scope inspected

Read in full: `backend/src/routes/projectAssets.ts` (all 3451 LOC), `backend/src/routes/images.ts`, `backend/src/services/{assetExtractionService,assetDescriptionMerger,assetImageLocalizer,imageAnalysisService,projectAssetAttemptsService}.ts`, `backend/src/services/image-generation/ImageGenerationService.ts` (lifecycle owner; shared with other slices), the prompt-assembly part of `NanoBananaClient.ts:29-116`, migrations 007/008/009/023/024_extra/025/038/039/040/042 (asset-relevant parts), `src/components/pipeline/{Stage5Assets,AddAssetModal,AssetDrawer,AssetFilterModal,AssetMatchModal,AssetVersionSync,MergeDialog,SplitWizard,AngleVariantsDialog,ImageDescriptionModal,InpaintingModal,ProjectAssetCarousel,ReferenceImageThumbnail,LocationViewsDialog,EstablishViewPrompt,StyleChangeWarningDialog}.tsx`, the logic part of `shared/EnhancedUploadModal.tsx:96-215`, `src/lib/services/{projectAssetService,imageService}.ts`, `src/lib/constants/statusTags.ts`, `src/types/asset.ts`. Skimmed: `InpaintCanvas.tsx`, `SliderComparison.tsx` (UI-only), test files listed in section 13.

## 2. The project_assets model

### 2.1 Table `project_assets` (net schema after migrations)
| Column | Type / default | Origin | Writers in code |
|---|---|---|---|
| id | uuid pk | 008 | |
| project_id | uuid NOT NULL FK projects CASCADE | 008 | all inserts |
| branch_id | uuid NOT NULL FK branches CASCADE | 008 | inserts use `projects.active_branch_id` (clone may use `target_branch_id`) |
| global_asset_id | uuid FK global_assets ON DELETE SET NULL | 008 | clone-from-global only (`projectAssets.ts:1910,1953`) |
| source_version | int | 008 | clone (`:1911,1954`), sync (`:2145`) |
| name | text NOT NULL | 008 | create, extract, PUT, merge, split, clone, sync |
| asset_type | text CHECK in (character, prop, location, extra_archetype) | 008 + `024_extra_archetype_and_style_outdated.sql` | create, extract, PUT, split (copies), clone |
| description | text NOT NULL | 008 | extract (LLM), create, PUT, merge, split, clone (merge LLM), sync |
| image_prompt | text | 008 | PUT, split (copies), clone, sync. No UI writes it (`UpdateProjectAssetRequest.image_prompt` exists, no caller sets it) |
| image_key_url | text | 008 | attempts service (`projectAssetAttemptsService.ts:76-79,114-117`), job fallback (`ImageGenerationService.ts:415-418`), clone localize (`projectAssets.ts:2012-2015`), sync (`:2196,2201`), clear-all (`:1651`), split sets null (`:1053`) |
| visual_style_capsule_id | uuid FK style_capsules SET NULL | 008 | set at insert time from Stage 5 stage_state; sync can overwrite (`:2210,2215`); never updated on style change |
| locked | bool default false | 008 | `/lock` (`:1565`), `/lock-all` (`:1729`). Stage 8 "create scene asset" inserts `locked: true` (`sceneAssets.ts:933`, cross-slice). **No code path ever sets locked=false.** |
| created_at/updated_at | trigger `update_project_assets_timestamp` | 008 | |
| last_synced_at | timestamptz | 009 | sync (`:2146`) |
| overridden_fields | text[] default '{}' | 009 | PUT adds field names when `global_asset_id` set (`:642-647`); clone adds `description` when `overrideDescription` (`:1900-1903`); sync removes synced names (`:2224-2230`) |
| deferred | bool default false | 023 | extract-confirm (`:352`), PUT (`:596-598`) |
| scene_numbers | int[] default '{}' | 023 | extract-confirm from client-sent `sceneNumbers` (`:353`), create (`:1189`), merge union (`:875-885`), split (`:1050,1066`), Stage 8 add-to-scene append (`sceneAssets.ts:266`, cross-slice) |
| source | text default 'extracted' CHECK in (extracted, manual, cloned, streamline_import) | 023, 042 | extract-confirm 'extracted', create `source||'manual'`, split 'manual'. **Clone never sets source** so cloned rows get default 'extracted' (`projectAssets.ts:1948-1963`); value 'cloned' is never written by this slice. |
| style_outdated | bool default false | 024_extra | mark-style-outdated true (`:1607`), clear-all false (`:1651`), master_asset job success false (`ImageGenerationService.ts:407-410`) |
| location_aliases | jsonb NOT NULL default '[]' CHECK array | 039 | PUT only, location-type only (`:628-640`). No frontend caller sends it (only the TS type `projectAssetService.ts:28`). Read by location resolver (cross-slice). |
| metadata | — | **does not exist** | Insert code comments it out (`:119-136`); TS `ProjectAsset.metadata` (`src/types/asset.ts:39-45`) and the Stage 5 "Visual Conflict" alert (`Stage5Assets.tsx:1241-1248`) read it: DEAD. Confidence/priority/conflict LLM outputs are discarded. |

RLS: owner-of-project policies (`008:118-152`). Backend uses service-role client; every route re-checks `projects.user_id = req.user.id`.

### 2.2 Asset types / archetypes
`character | prop | location | extra_archetype` (DB CHECK 024, route validators `projectAssets.ts:619,1143`, TS `src/types/asset.ts:1`). Extraction only produces character/prop/location (`assetExtractionService.ts:25`). `extra_archetype` is created only manually ("Add Extra Archetype" button, `Stage5Assets.tsx:1061-1068`) or by type change. Type-specific behavior:
- Image aspect ratios (`ImageGenerationService.ts:58-63`): character 512x768, prop 512x512, location 1024x576, extra_archetype 512x768. Stage 5 shows the same table client-side (`Stage5Assets.tsx:89-94`).
- Background isolation suffix `". Isolated on a plain white background, no environment, no other characters or objects."` appended for character/prop/extra_archetype on master_asset/scene_asset/angle_variant/transformation_post jobs (`ImageGenerationService.ts:66,78-89`); locations excluded.
- Gate: extra_archetype is exempt from the "must have image" gate (`projectAssets.ts:1706-1721`, `Stage5Assets.tsx:216-218`) but IS locked by lock-all (`:1724`).
- Angle variants: character only (`:2560`). Location views: location only (`:2734,2795,2883,3327`).
- Vision analysis has a per-type focus prompt incl. extra_archetype (`imageAnalysisService.ts:14-19`).
- `AssetDrawer.tsx:62-78` and `AssetMatchModal.tsx:43-59` `assetTypeConfig` lack `extra_archetype`; `config.icon` on undefined throws for any extra_archetype asset rendered (`AssetDrawer.tsx:565-566`, `AssetMatchModal.tsx:162-163`). AssetMatchModal's grouping silently drops extra_archetype project assets (`:78-92`).

### 2.3 Identity
Identity = row `id`. There is no unique constraint on (branch_id, name, asset_type). Name duplicates are allowed: clone logs a warning only (`projectAssets.ts:1937-1946`); extract-confirm inserts without checking existing rows. Within one extraction, dedupe key during scene aggregation is `name.trim().toLowerCase()` **without type** (`assetExtractionService.ts:174,210,244`), so a character and a prop with the same name collapse into one entity whose type is whichever was seen first (characters are aggregated first, then props, then locations). Preview/confirm lookups key on `${type}:${name.toLowerCase()}` (`projectAssets.ts:334-343`, `assetExtractionService.ts:78-84`). Branch isolation: list/version-sync/lock-all/mark/clear filter by active branch; GET/PUT/DELETE/merge/split/generate filter only by `project_id` (an asset on a non-active branch is editable by id).

### 2.4 Lock state (what it means and what it blocks)
`locked=true` is set by "Finalize Assets" (lock-all) for all non-deferred assets on the active branch, or by `/lock` (no UI caller). Never reverted (no unlock route; Stage 5 stage unlock via `onUnlock` does not touch `project_assets`).

| Operation | Blocked when asset.locked? | Evidence |
|---|---|---|
| PUT name/description/image_prompt/location_aliases | Yes (400 'Cannot modify locked asset') | `projectAssets.ts:585-590` |
| PUT deferred / asset_type (only those keys) | No | `:583-585` |
| DELETE | Yes | `:702-706` |
| Merge (any participant) | Yes | `:767-773` |
| Split | Yes | `:1017-1019` |
| Sync from global | Yes | `:2083-2088` |
| Generate / regenerate image | **No** | `:1210-1282` (no check) |
| Upload image | **No** | `:1288-1374` |
| Edit image (edit/style/bg/regenerate) | **No** | `:1436-1521` |
| Select / delete attempt | **No** | `:2404-2458` |
| Clone-from-global matchWithAssetId (overwrites name/description/image_prompt/global link) | **No** | `:1839-1932` |
| Angle variants, location views (all ops) | **No** | `:2468-3448` |
| Promote | No | `:2286-2350` |
Downstream meaning: Stage 8 bootstrap inherits only `locked OR deferred` assets into scenes (`assetInheritanceService.ts:183-188`); scene relevance AI sees only locked assets (`sceneAssetRelevanceService.ts:131-135`). Consequence: once Stage 5 is finalized, text fields of those assets are permanently frozen through the API, while their images remain mutable.

### 2.5 Image fields and versioning/attempts
- `project_assets.image_key_url` = the single "current" master image. Truth for gating (lock-all), promotion, analyze-image, downstream frame/scene reference.
- `project_asset_generation_attempts` (023): id, project_asset_id FK CASCADE, image_url NOT NULL, storage_path, source ('generated'|'uploaded'), is_selected, original_filename, file_size_bytes, mime_type, attempt_number, timestamps. Partial unique index: at most one `is_selected=true` per asset (`023:47-49`).
- `ProjectAssetAttemptsService` (`projectAssetAttemptsService.ts`): MAX_ATTEMPTS=4 (`:9`). `createAttempt` deselects others then inserts and, if selected, writes `project_assets.image_key_url` (`:42-83`). `selectAttempt` deselect-all, select one, write image_key_url (`:88-124`); non-transactional (3 statements). `deleteAttempt` refuses the selected attempt, deletes row then storage object (`:130-165`). `enforceAttemptCap` when count >= 4 deletes the oldest non-selected attempt row + storage (`:170-197`) — can delete an uploaded original. `backfillAttemptIfNeeded` on list creates a selected 'generated' attempt from image_key_url when no attempts exist (`:221-245`), storage_path null.
- Writers that bypass attempts (image_key_url diverges from selected attempt): clone localization (`projectAssets.ts:2012-2015`), sync-from-global (`:2195-2207`), clear-all-images (`:1651`, attempts untouched), job fallback (`ImageGenerationService.ts:415-418`).
- No per-field version history for description/name exists for project assets in this slice.

### 2.6 style_outdated
Pure flag. Set for every asset with a non-null image on the active branch by "Change Style → Mark Images as Outdated" (`projectAssets.ts:1604-1610`). Cleared by any successful master_asset job for that asset (generate, edit-image, clone-regenerate) (`ImageGenerationService.ts:406-410`) and by clear-all. Not cleared by upload or attempt selection. Not consulted by lock-all, promote, or any downstream reader in this slice; UI shows a "Style Outdated" badge only (`Stage5Assets.tsx:1153-1155`).

### 2.7 Description merge logic (three distinct mechanisms)
1. `assetDescriptionMerger.mergeDescriptions(global, project, strategy)` (`assetDescriptionMerger.ts:17-37`): 'global' → global text; 'project' → project text; 'merge' → LLM (`:43-87`); unknown → global. LLM failure fallback: `` `${global}\n\nAdditional details: ${project}` `` (`:85`).
   - Used by clone-from-global match (`projectAssets.ts:1889-1897`), with global as base.
   - Used by `/assets/merge-descriptions` (`:937-975`): `descriptions[0]` (survivor) is passed as the "Global Description (base)" and `descriptions[1..]` joined by `\n\n` as "Project Description (additions/modifications)". Result is returned only (not persisted); the client puts it into the MergeDialog textarea.
2. `ImageAnalysisService.mergeDescriptions` (vision follow-up, `imageAnalysisService.ts:90-116`): merges existing script-derived description with image-extracted description, "Prioritize visual details from the image".
3. Merge route itself (`projectAssets.ts:884-891`) only writes `updatedDescription` if the client sent one; MergeDialog sends it only if the textarea differs from the survivor's original (`MergeDialog.tsx:113`).

## 3. Asset-extraction pipeline (exact)

### 3.1 Preconditions in UI
Style must be locked (`Stage5Assets.tsx:320-323`). The "Scan Script for Assets" button renders only while `hasExtracted === false` (`:976-995`); `hasExtracted` becomes true when any assets exist on load (`:196-198`), after a successful confirm, or after an empty/failed scan (`:332,347`). So re-extraction is not offered in the UI once any asset exists.

### 3.2 Pass 0 (preview, no LLM): `POST /:projectId/assets/extract-preview` (`projectAssets.ts:165-267`)
- `aggregateSceneDependencies(branchId)` (`assetExtractionService.ts:140-274`) reads `scenes(scene_number, script_excerpt, expected_characters, expected_location, expected_props)` for the branch ordered by scene_number. For each scene: characters (array), props (array), location (single string) become entities; dedupe by lowercase name (type-agnostic, see 2.3); first occurrence casing is canonical; each appearance appends a mention `{sceneNumber, text: "Character appears in scene N" | "Prop appears in scene N" | "Location: X", context: first 3 lines/200 chars of script_excerpt}`.
- Fallback when zero entities: latest Stage 4 `stage_states.content.tiptapDoc` → `extractManifest()` (`utils/scriptManifest.ts:280`) → globalCharacters/globalLocations/globalProps (route `:185-243`).
- Response `{entities:[{name,type,sceneNumbers,mentionCount}], counts}`. Nothing persisted.
- Does not require a style (server); UI does.

### 3.3 User review: `AssetFilterModal.tsx`
Per entity Keep/Defer/Delete; "Keep All"/"Defer All" per type. Deleted entities are filtered client-side (`:98-107`). Defect: decisions state is initialized once from `entities` at mount (`:48-55`; the `useState(() => setDecisions(...))` "reset" runs only at mount). The modal component is mounted by Stage5 with `previewEntities=[]` (`Stage5Assets.tsx:1438-1444`), so on first open `decisions` is empty: rows display "keep" by fallback but `counts` are all 0 and the Confirm button is disabled until at least one decision button is clicked (`:88-96,222`). Untouched rows are still sent as `keep` (`:104`).

### 3.4 Pass 2 (LLM): `POST /:projectId/assets/extract-confirm` (`projectAssets.ts:273-377`)
- Body `selectedEntities:[{name,type,decision,sceneNumbers}]`. Requires Stage 5 `locked_visual_style_capsule_id` or `manual_visual_tone` (`:304-311`).
- Re-runs aggregation server-side (plus tiptap fallback) and filters to selected keys (`assetExtractionService.ts:63-97`). Entities whose `type:name` key no longer matches (e.g. renamed, or type-collapsed per 2.3) are silently skipped.
- For each kept/deferred entity, **sequentially** (no concurrency), `distillVisualSummary` (`:521-652`).
  - Style context: capsule `name` + `descriptor_strings` + `design_pillars` "k: v; ..." (`:657-681`), or `{name:'Manual Tone', description: manual tone}`.
  - System prompt (verbatim excerpt): "You are a visual description specialist. Create a concise, vivid 3-5 sentence description suitable for AI image generation. CRITICAL RULES: 1. PHYSICAL ONLY ... 4. STYLE-ALIGNED: Consider the ${styleContext.name} visual style 5. PRIORITY ... OUTPUT FORMAT: Return ONLY valid JSON".
  - User prompt: `Asset: ${name} (${type})\nStyle Context: ${styleContext.description}\n\nAll script mentions:\n${mentionsText}` + JSON schema `{description, confidenceScore, isPriority, hasVisualConflicts, conflictDetails}`.
  - **Text actually sent about the entity**: `mentionsText = mentions.map(m => "Scene N: " + m.text)` (`:542-544`). `m.text` is the generic placeholder ("Character appears in scene 3"); `m.context` (script excerpt) is never included. So the model receives name, type, scene numbers, and style only — no script content.
  - temperature 0.4, maxTokens 2048, metadata `{stage:5, pass:2, entityName}`. Parse: strip code fences, regex first `{...}`, JSON.parse, retry after trailing-comma strip.
  - Failure fallback (any error): description = mention texts joined by space, e.g. "Character appears in scene 1 Character appears in scene 4" (`:637-651`), persisted as the description.
- Output sorted by `isPriority` (`:94-96`); confidence/priority/conflicts are then discarded at insert.
- Insert (`projectAssets.ts:341-361`): one row per distilled entity: `{project_id, branch_id: active, name, asset_type, description, visual_style_capsule_id: capsule||null, locked:false, deferred: decision==='defer', scene_numbers: client-sent sceneNumbers, source:'extracted'}`.
- Idempotency: none. No lookup of existing project_assets; each call inserts new rows. No server-side guard against a second confirm. Client then replaces its local list with only the returned rows (`Stage5Assets.tsx:364`).

### 3.5 Deprecated one-shot `POST /:projectId/assets/extract` (`projectAssets.ts:44-158`)
Requires capsule (not manual tone) and Stage 4 `formattedScript` presence; passes `''` as script; runs aggregation (no tiptap fallback) + Pass 2 for all entities; inserts without deferred/scene_numbers/source. Frontend `projectAssetService.extractAssets` (`:104-127`) has no caller. REACHABLE via HTTP only; no UI.

### 3.6 Dead Pass 1
`extractEntityMentions` (`assetExtractionService.ts:366-516`): full-script LLM entity extraction prompt, private, never called. DEAD.

## 4. Image generation lifecycle for project assets

### 4.1 Chain (Generate / Regenerate button)
`Stage5Assets.handleGenerateImage` (`Stage5Assets.tsx:379-414`) → `projectAssetService.generateImage` (`projectAssetService.ts:354-380`) → `POST /:projectId/assets/:assetId/generate-image` (`projectAssets.ts:1210-1282`) → `ImageGenerationService.createImageJob` (`ImageGenerationService.ts:109-187`) → background `executeJobInBackground` (`:298-582`) → provider `NanoBananaClient.generateImage` (Gemini `gemini-2.5-flash-image`, `NanoBananaClient.ts:117-120`) → storage `asset-images` bucket at `project_{projectId}/branch_{branchId}/master-assets/{assetId}_{ts}_{rand}.png` (`:609-611`) → `ProjectAssetAttemptsService.enforceAttemptCap` + `createAttempt(is_selected:true, source:'generated')` → `project_assets.image_key_url` + `style_outdated=false` → `image_generation_jobs.status='completed'`.
- Prompt = `asset.image_prompt || asset.description` (`projectAssets.ts:1240`) + isolation suffix for isolatable types (`ImageGenerationService.ts:124-135`), dimensions overridden from asset type.
- Style: `visualStyleCapsuleId = asset.visual_style_capsule_id`; manual tone read from Stage 5 only when the asset's capsule id is null (`projectAssets.ts:1244-1260`). No fallback to the current Stage 5 `locked_visual_style_capsule_id`. Then `createImageJob` throws if neither is present (`ImageGenerationService.ts:137-141`).
- Job row `image_generation_jobs` (007): status queued→processing→generating→uploading→completed|failed, failure_stage, error_code/message, prompt, dims, estimated_cost, cost_credits, provider_metadata, timestamps. `idempotencyKey = asset-${assetId}-${Date.now()}` (`projectAssets.ts:1271`) → never dedupes in practice.
- In-process background execution (`.catch` on an un-awaited promise, `ImageGenerationService.ts:178-180`); no queue/worker; a server restart loses in-flight jobs (they stay non-terminal).
- Provider retry: up to 3 retries, exponential from 1s capped at 10s, only for retryable classified errors (`NanoBananaClient.ts:17-18,239-262`).
- Polling: client polls `GET /api/images/jobs/:jobId` (`images.ts:71-137`) every 1s, max 60 (`projectAssetService.ts:385-424`) → "timed out" toast after 60s while the job keeps running and may still persist later. On completion the UI refetches the asset (`Stage5Assets.tsx:389-394`) and invalidates `['project-asset-attempts', projectId, assetId]`.
- "Generate All Images" loops sequentially over active non-extra assets lacking `image_key_url` (`Stage5Assets.tsx:1069-1093`).

### 4.2 Upload (`POST .../upload-image`, `projectAssets.ts:1288-1374`)
multer memory, 10MB, png/jpeg/webp (`:24-37`); storage `asset-images/project/{projectId}/{assetId}/{ts}-{rand}{ext}`; `enforceAttemptCap` + `createAttempt(source:'uploaded', is_selected:true, filename/size/mime)` → image_key_url. Does not clear style_outdated. Then the UI auto-calls analyze-image (`Stage5Assets.tsx:435-452`).

### 4.3 Analyze (`POST .../analyze-image`, `projectAssets.ts:1380-1429`)
Requires image_key_url. `ImageAnalysisService.analyzeAssetImage` downloads the image, calls `gemini-2.5-flash` with the image + type-focus prompt; if an existing description exists, a second text call merges (`imageAnalysisService.ts:35-116`). Confidence is a length heuristic (>50 chars 0.9, >20 0.7, else 0.5) (`:81`). Returns `{extractedDescription, suggestedMerge, confidence}`; nothing persisted. Constructor throws if `GOOGLE_AI_API_KEY` missing (`:24-28`); UI degrades with a toast.

### 4.4 "Editing" (no inpainting for assets)
`EnhancedUploadModal` (opened only after an upload's analysis succeeds, `Stage5Assets.tsx:1480-1520`) offers Edit (instructions), Apply Style, Remove Background (non-location), Regenerate (optional current image as reference). All four call `startEditImageJob` → `POST .../edit-image` (`projectAssets.ts:1436-1521`) and poll `getImageJobStatus` every 2s up to 90 times (`EnhancedUploadModal.tsx:111-131`).
- Prompt: `description`; if `editInstructions`: `` `${editInstructions}. Context: ${description}` ``; if `removeBackground`: + isolation suffix (`:1491-1497`); `createImageJob` then appends the isolation suffix again for isolatable types (double suffix).
- Style: asset capsule → Stage 5 locked capsule → Stage 5 manual tone (`:1470-1488`) (differs from generate-image).
- `referenceImageUrl` is prepended as the first reference image (no role) (`ImageGenerationService.ts:334-345`); NanoBanana builds "Generate an image of the subject shown in the FIRST reference image..." when >1 image, or "matches the visual style ... shown in the provided reference image" when exactly 1 (`NanoBananaClient.ts:88-101`).
- job_type is `master_asset` with assetId → **every edit result is persisted as a new selected attempt and becomes `image_key_url` immediately**, regardless of whether the user later clicks Accept or Cancel. Cap of 4 prunes the oldest non-selected attempt per edit.
- Accept (`handleEnhancedUploadAccept`, `Stage5Assets.tsx:616-642`): PUTs `finalDescription` (initialized to `suggestedMerge || extractedDescription`, `EnhancedUploadModal.tsx:97-99`) as the asset description, and if the accepted image URL differs from local `image_key_url`, selects the matching attempt. Cancel saves no description but leaves any generated edits selected.
- InpaintingModal/InpaintCanvas are frame-level (Stage 10 `frameService.inpaintFrame`, `Stage10FrameGeneration.tsx:380-389,1720`), not used for project assets.

### 4.5 Attempt carousel (`ProjectAssetCarousel.tsx`)
React Query key `['project-asset-attempts', projectId, assetId]`; list triggers lazy backfill. Select → `selectAttempt` (server writes image_key_url) and invalidates `['project-assets', projectId]` (`:59-70`), but Stage5Assets holds assets in `useState` (not that query), so Stage 5's gate/labels keep the stale image_key_url until reload. Delete of selected attempt refused client- and server-side. Disabled when stage locked/outdated.

## 5. Merge / split semantics

### Merge (`POST /:projectId/assets/merge`, `projectAssets.ts:731-931`; UI `MergeDialog.tsx`, `Stage5Assets.tsx:720-737`)
Inputs: survivorAssetId, absorbedAssetIds[], updatedName?, updatedDescription?. Cross-type allowed (UI warns; survivor keeps its type). All participants must exist in project and be unlocked. Steps (non-transactional, sequential):
1. `scene_asset_instances` of absorbed assets: if survivor has no instance in that scene → re-point `project_asset_id` to survivor; if survivor already has one → migrate that instance's `shot_asset_assignments` to the survivor instance (no conflict: re-point; conflict: keep survivor row, upgrade its `presence_type` if absorbed is more specific, where enters/exits/passes_through=3 else 1; delete absorbed row), then delete the duplicate absorbed instance.
2. Survivor `scene_numbers` = sorted union of all participants.
3. Survivor name/description updated if provided.
4. Delete absorbed project_assets → FK CASCADE deletes their attempts, angle variants, location views (and via location_views, `shots.camera_direction_id` SET NULL); `shots.location_asset_id` and `location_match_events.result_location_asset_id` referencing absorbed are SET NULL (not re-pointed). Absorbed images/storage objects are not moved or deleted (orphaned in storage). `location_aliases`, `global_asset_id`, image are not merged into survivor.
Response includes `instancesRepointed, assetsAbsorbed, assignmentsMigrated`.

### Split (`POST /:projectId/assets/:assetId/split`, `:981-1124`; UI `SplitWizard.tsx` 3 steps)
Requires unlocked, `scenesForVariant` ⊂ original.scene_numbers and leaving ≥1 scene. Inserts variant `{name, asset_type, description: variantDescription || original, image_prompt, visual_style_capsule_id, scene_numbers: scenesForVariant, source:'manual', locked:false, image_key_url:null}` (no global link, no aliases, no deferred). Original's scene_numbers reduced. `scene_asset_instances` in matching scenes (by branch + scene_number) re-pointed to variant; re-point error is only logged. Shot assignments follow their instance. UI requires ≥2 scene_numbers (`Stage5Assets.tsx:672-679,1197-1206`).

## 6. Global library relationship (clone / match / sync / promote / version sync)

| Action | Route | Effect |
|---|---|---|
| Clone (no match) | `POST /assets/clone-from-global` (`:1756-2041`) | Insert project_asset with global_asset_id, source_version=global.version, name/type/description (or overrideDescription)/image_prompt from global, capsule = Stage 5 locked capsule else global's; `source` not set (DB default 'extracted'); scene_numbers default {}. Then if `regenerateImage && global.image_key_url && capsule` → master_asset job with prompt=finalDescription and reference=global image (no idempotency key); else if global image → `localizeAssetImage` copies the file to `asset-images/project_{p}/branch_{b}/master-assets/{assetId}_{ts}_{rand}{ext}` (`assetImageLocalizer.ts:33-108`) and sets image_key_url directly (no attempt row; failures swallowed). |
| Match & Clone | same route with matchWithAssetId (`AssetMatchModal.tsx:111-143`) | Target must be same project/branch and not already linked. UPDATE target: global_asset_id, source_version, name by nameStrategy (project: target name; global: `${global} (${target})`; custom: `${custom} (${target})`), description = mergeDescriptions(global, target, strategy) (modal default 'merge' → LLM call), image_prompt = global||target, capsule. No lock check. Then same image regenerate/localize branch (localize overwrites target's image_key_url without an attempt row). |
| Version sync detect | `GET /assets/version-sync-status` (`:431-508`) | For active-branch rows with global_asset_id: outdated iff `(source_version||0) < global_assets.version`. Global version increments on global asset update (`routes/assets.ts:237`) and global image generation (`routes/assets.ts:389`, `ImageGenerationService.ts:878-884`). Polled by `AssetVersionSync` on mount and every 30s (`AssetVersionSync.tsx:38-47`); button hidden when 0. |
| Sync | `POST /assets/:assetId/sync-from-global` (`:2047-2280`) | Blocked if locked. Re-localizes the global image if global URL != project URL (always true after any prior localization, so every sync copies a new storage object). Writes name, description, image_prompt, image_key_url, visual_style_capsule_id(global||project), source_version, last_synced_at **unconditionally, including fields in overridden_fields** ("force sync" branches `:2154-2221`), then removes synced names from overridden_fields. image_key_url write bypasses attempts. Project-side user edits to those fields are overwritten. |
| Promote | `POST /assets/:assetId/promote` (`:2286-2350`) | Requires image_key_url. Inserts new global_assets row (name, type, description, image_prompt, image_key_url — same URL, not copied — capsule, promoted_from_project_id). Does not set project_asset.global_asset_id; no duplicate check (each click creates another global asset). |

`overridden_fields` is effectively informational: written by PUT/clone, cleared by sync, never prevents overwrite.

## 7. Angle variants (character only)

Table `asset_angle_variants` (025): project_asset_id FK CASCADE, angle_type CHECK (front, side, three_quarter, back), image_url, storage_path, image_generation_job_id FK jobs, prompt_snapshot, status CHECK (pending, generating, completed, failed), UNIQUE(project_asset_id, angle_type).
- Generate (`POST .../angle-variants/generate`, `projectAssets.ts:2520-2637`): validates angles, character type, style (asset capsule → Stage 5 capsule → manual tone, else 400). Per angle: upsert row reset to pending with nulls (`onConflict project_asset_id,angle_type`), then `createAngleVariantJob` (`ImageGenerationService.ts:249-293`): prompt `` `${ANGLE_PROMPTS[angle]} of ${asset.description}` `` (e.g. "side profile view, facing left, showing full silhouette of <description>"), sets status 'generating' + prompt_snapshot, job_type 'angle_variant' 512x768, isolation suffix appended. **No reference image is passed** (the master image is not used); only capsule reference images/text. Completion writes image_url/storage_path/job_id/status completed (`:497-514`); failure sets status failed (`:575-580`). Storage `.../master-assets/angles/{assetId}_{variantId}_{ts}_{rand}.png`.
- UI `AngleVariantsDialog` (from "Manage Angles" menu, `Stage5Assets.tsx:1207-1212`): 2x2 grid, per-angle Generate/Redo, "Generate Missing Angles" (missing or failed), delete; polls list every 2s while any polled angle is 'generating' (`AngleVariantsDialog.tsx:60-103`).
- Delete removes storage_path and row (`projectAssets.ts:2643-2695`).
- Consumers (cross-slice): completed variants are loaded for frame prompt/reference selection (`routes/projects.ts:3665-3690`, `routes/frames.ts:1729-1741`, `continuityCompositionService.ts:549-567`, `promptGenerationService.ts:379-382`).
- Never invalidated when the master description/image changes; `ANGLE_PROMPTS` duplicated in `src/types/asset.ts:153-158` (unused for prompting on client).

## 8. Location views (distinct concept, precise definition)

A **location view** is a row in `location_views` (038, 040) attached to one `project_assets` row of type `location`: a named camera-direction reference for that location, with its own optional reference image. Columns: `name` (system key, UNIQUE per asset: "establishing", "direction_1", ...), `alias` (user label), `description`, `view_type` ('establishing' | 'direction'), `camera_distance` ('wide'|'medium'|'close', default wide), `camera_height` ('eye_level'|'high_angle'|'low_angle'|'overhead'|'ground_level'), `image_key_url` (nullable), `is_primary` (fallback direction for unmatched shots; non-unique partial index only, app code unsets others), `source` ('user'|'established'|'stage7_inferred'), `established_from_scene` (display string "Scene N, Shot M"), `established_from_shot_id` (uuid, no FK), `promoted_from_frame_id` (FK frames SET NULL, 040), `sort_order`, timestamps (trigger reuses `update_shots_updated_at`). `shots.camera_direction_id` FK → location_views SET NULL (038:80); `frames.promoted_to_view_id` FK → location_views SET NULL (040:13-14). It is separate from the location asset's own master `image_key_url`, separate from `location_aliases` (name matching), and separate from angle variants (characters).

Writers:
| Writer | Route / code | Behavior |
|---|---|---|
| Suggest defaults | `POST .../location-views/suggest-defaults` (`projectAssets.ts:2854-2975`) | 400 if any views exist. INT/EXT heuristic: first scene whose `script_excerpt` first line contains the asset name (case-insensitive); EXT if that line starts with "EXT". Inserts 3 rows: establishing (EXT: eye_level "Full view"; INT: overhead "Overhead view"), direction_1 (primary), direction_2; source 'user'. |
| Create | `POST .../location-views` (`:2761-2848`) | name+view_type required; unsets existing primary if is_primary; sort_order = max+1; 409 on duplicate name. UI only creates 'direction' named `direction_${count+1}` (`LocationViewsDialog.tsx:93-115`) → after deleting a lower-numbered direction, adding collides with an existing name (409). |
| Update | `PUT .../location-views/:viewId` (`:2981-3045`) | alias, description, camera_distance, camera_height, is_primary (unsets others), image_key_url. |
| Upload image | `POST .../location-views/:viewId/upload-image` (`:3051-3122`) | storage `project/{projectId}/location-views/{assetId}/{viewId}-{ts}{ext}`; sets image_key_url; old object not removed; no attempts. |
| Delete | `DELETE .../location-views/:viewId` (`:3128-3181`) | Removes storage object derived from `image_key_url.split('/asset-images/')[1]`, then row. For an 'established' view whose image_key_url is a frame's URL, this deletes the frame's image file in the shared bucket. |
| Establish from frame | `POST .../:viewId/establish-from-frame` (`:3193-3287`) | Requires frameImageUrl, shotId, sceneId. Sets image_key_url=frameImageUrl, source 'established', established_from_scene, established_from_shot_id, promoted_from_frame_id (if frameId), copies shot camera_distance/height; sets `frames.promoted_to_view_id`. No check that shot/scene belong to the project. UI: `EstablishViewPrompt` in Stage 10 (gap-fill banner or "replace" confirm), also Stage 8 `LocationCoveragePanel.tsx:331` (cross-slice). |
| Generate image (AI) | `POST .../:viewId/generate-image` (`:3298-3448`) | Style reference = establishing view image → primary view image → master location image; 400 if none. Prompt (verbatim template): `` `${viewDesc}. Same ${asset.name} seen from${viewAlias} perspective, ${heightLabel} camera height, ${distanceLabel} shot. Maintain the same color palette, architectural details, materials, and lighting conditions as the reference. Location description: ${asset.description}` ``. job_type 'scene_asset' without assetId/sceneId (so no completion side-effect; storage path falls to `project_{p}/branch_{b}/misc/...`), 1024x576, `referenceImageUrls:[{url, role:'style'}]`. Style: asset capsule or Stage 5 manual tone only (no Stage 5 capsule fallback) → throws if asset capsule is null and tone absent. Persistence of the result happens **client-side**: `projectAssetService.generateLocationViewImage` polls then PUTs image_key_url (`projectAssetService.ts:1216-1264`); if the tab closes/polling times out (60s), the generated image is never attached. Only caller: Stage 8 `LocationCoveragePanel.tsx:234`; the Stage 5 `LocationViewsDialog` has no generate action. |
| Stage 7 inference | `routes/projects.ts:1832-1880` (cross-slice) | Creates `stage7_inferred` views for new directions returned by shot extraction. |

Stage 5 UI: "Camera Directions" menu item on location cards (`Stage5Assets.tsx:1213-1218`) → `LocationViewsDialog` (suggest defaults, add direction, edit alias/description, set primary star, upload/replace image, delete).

## 9. What gets invalidated when assets or style change

| Trigger | Invalidates / changes | Preserves |
|---|---|---|
| Change Style → Mark Outdated (`Stage5Assets.tsx:262-288`) | style_outdated=true for imaged assets (active branch); Stage 5 content style fields nulled (unlock) | images, attempts, asset.visual_style_capsule_id, locked flags, angle variants, location views |
| Change Style → Clear All Images (`:290-316`) | image_key_url=null, style_outdated=false (active branch); style nulled | attempts (still `is_selected`, so carousel still shows the old "Selected" image and the selected one cannot be re-selected via UI), storage objects, angle variants, location view images, locked flags |
| New style lock after change | Only Stage 5 stage_state content | `project_assets.visual_style_capsule_id` is NOT updated; generate-image keeps using the old capsule; if the old style was manual tone (asset capsule null) and new is capsule, generate-image has neither → error "Visual Style Capsule or Manual Visual Tone is required" (edit-image and angle routes do fall back to the Stage 5 capsule). |
| Successful master_asset job | new selected attempt, image_key_url, style_outdated=false | angle variants and location views not regenerated/flagged |
| Description/name edit (PUT) | overridden_fields (if linked) | image (not flagged), angle variants, scene instances (no propagation from this slice) |
| Delete / merge-absorb | cascades listed in 5 | storage objects |
| Lock-all | locked=true for non-deferred | nothing invalidated |
No route in this slice marks downstream stages (6-12) outdated on asset change; downstream readers that join `project_assets.image_key_url` live (e.g. `routes/projects.ts:3653-3659`, `frames.ts:563`) pick up changed images implicitly (cross-slice).

## 10. Persisted vs transient (Stage 5 UI)
Persisted: stage_states(stage 5).content `{locked_visual_style_capsule_id, manual_visual_tone, manual_tone_preset, style_locked_at}` via `useStageState` autosave (`Stage5Assets.tsx:99-107,226-231,251-256`); all project_assets/attempts/variants/views rows. Transient React state: asset list, `hasExtracted`, preview entities, filter decisions, editing descriptions + 1s debounce timers (`:502-523`; empty strings never saved), selection mode, EnhancedUploadModal image history (attempts are persisted server-side anyway), MergeDialog/SplitWizard drafts. Style capsule selection locks immediately on change (`handleStyleLock` is the selector's `onChange`, `:888-895`).

## 11. Gatekeeping (Stage 5 completion)
UI `canProceed = isStyleLocked && every active non-extra asset has image_key_url && ≥1 such asset` (`Stage5Assets.tsx:216-218`). "Finalize Assets" → `POST /assets/lock-all` (server repeats the gate, `projectAssets.ts:1703-1721`, locks non-deferred incl. extras) → `stageStateService.lockStage(projectId, 5)` (cross-slice) → `onComplete`. Server lock-all does not check style lock, style_outdated, or deferred-asset state. When the stage is locked/outdated, Stage 5 hides edit/generate/upload/delete/defer/type/split/select actions (`isStageLockedOrOutdated` checks) but still exposes Manage Angles, Camera Directions, Promote, Browse Library (`:1207-1224,1043-1050`), whose backends have no stage or asset lock checks.

## 12. Dead / orphaned / duplicated
- `src/lib/services/imageService.ts` (whole file): no importers. ORPHANED. Contains its own polling, `mapStageToJobType`, `generateAssetImageKey` prompt ("Generate a visual reference image for: ..."), `generateFrameAnchor`, and a stub `inpaintImage` (projectId 'unknown'). Its target `POST /api/images/generate` (`images.ts:9-68`) has no other frontend caller found; the route ignores manualVisualTone/reference images.
- `GET /api/images/debug-style-capsule/:capsuleId` (`images.ts:140-184`): no frontend caller found. REACHABLE via HTTP only.
- `ImageDescriptionModal.tsx`: no importers (superseded by `EnhancedUploadModal`). ORPHANED.
- `POST /assets/extract` + `projectAssetService.extractAssets`: DEPRECATED/no UI caller. `extractEntityMentions`: DEAD.
- `POST /assets/:assetId/lock` + `projectAssetService.lockAsset`: no UI caller.
- `projectAssetService.editImage` (polling variant): no caller (only `startEditImageJob` used).
- `ProjectAsset.metadata` + Stage 5 conflict alert: DEAD (no column).
- `AddAssetModal` parses scene numbers but does not send them (`AddAssetModal.tsx:67-76`); the route accepts `scene_numbers` (`projectAssets.ts:1134,1189`). PARTIAL.
- `src/lib/constants/statusTags.ts`: used only by Stage 8 status-tag UI (`Stage8/SceneAssetListPanel.tsx`, `StatusTagsEditor.tsx`, `TagCarryForwardPrompt.tsx`); unrelated to project assets.
- Duplications: aspect ratio table (backend `ImageGenerationService.ts:58-63` vs `Stage5Assets.tsx:89-94`); `ANGLE_PROMPTS` (backend `ImageGenerationService.ts:258-263` vs `src/types/asset.ts:153-158`); job polling (3 client implementations: `projectAssetService.pollImageJob`, `EnhancedUploadModal.pollForCompletion`, orphaned `imageService.pollJobStatus`); Stage 5 style-resolution logic re-implemented per route with three different fallback orders (generate-image; edit-image/angle; location-view); isolation suffix in both edit-image route and service.
- `ProjectAsset.source` TS union lacks 'streamline_import' (`src/types/asset.ts:36`).

## 13. Tests
| Test | Covers | Notes |
|---|---|---|
| `backend/src/tests/assetTypeAndMerge.test.ts` (supertest, supabase mocked, merger mocked) | PUT type change unlocked/locked, deferred toggle on locked, invalid type 400, overridden_fields asset_type tracking; merge cross-type, assignmentsMigrated, updatedDescription, locked rejection, missing fields; assignment specificity (enters beats throughout; survivor exits kept; tie keeps survivor); merge-descriptions (2, <2, non-array, 3+ joined) | TESTED for those paths only |
| `backend/src/tests/image-generation.test.ts` | createImageJob basic/idempotency/state/job types/storage path | Integration test against a real Supabase (creates auth users). Calls master_asset jobs without capsule or manual tone (`:116-119` etc.), which current `createImageJob` rejects (`ImageGenerationService.ts:139-141`) → appears stale/CONTRADICTED. |
| `src/lib/services/__tests__/projectAssetService.test.ts` | mergeDescriptions, updateAsset(asset_type), mergeAssets payload | client-only (fetch mocked) |
| `src/lib/services/__tests__/projectAssetService.editImage.test.ts` | startEditImageJob payloads, getImageJobStatus | client-only |
| `src/components/pipeline/__tests__/MergeDialog.test.tsx` | rendering: cross-type warning, type badges, description panels, summary | no confirm/merge-call assertion |
| `e2e/enhanced-upload-modal.spec.ts` | Stage 5 upload → enhanced modal buttons, accept/cancel; Stage 8 variant | requires live stack; not run |
Untested: extraction (preview/confirm/distill), attempts service, clone/match/sync/promote/version-sync, localizer, image analysis, angle variants, location views (all routes), lock-all, mark-outdated/clear-all, split, upload.

## 14. Cross-slice references
- `backend/src/routes/sceneAssets.ts:925-937`: Stage 8 creates project_assets with `locked: true, source:'manual'` directly (bypasses Stage 5).
- `backend/src/routes/sceneAssets.ts:259-266`: adding an asset to a scene appends to `project_assets.scene_numbers`.
- `backend/src/routes/sceneAssets.ts:559`: Stage 8 also uses `ImageAnalysisService.analyzeAssetImage`.
- `backend/src/services/assetInheritanceService.ts:183-188`: scene bootstrap inherits `locked OR deferred` project assets.
- `backend/src/services/sceneAssetRelevanceService.ts:131-135`: AI relevance only sees locked project assets.
- `backend/src/routes/projects.ts:1832-1880`: Stage 7 shot extraction creates `stage7_inferred` location_views; `:2243-2262` shot camera direction must be a 'direction' view; `:3665-3731` loads completed angle variants and location views for prompts.
- `backend/src/services/locationResolverService.ts:311-327`: reads project location assets/aliases/views.
- `backend/src/services/frameGenerationService.ts:735-736`: uses `ImageAnalysisService.analyzeReferenceFrame` (camera-change continuity).
- `backend/src/routes/streamline.ts:292-293`: uses `ImageAnalysisService.classifyUploadedImage`; migration 042/043 `streamline_commit()` inserts project_assets with source 'streamline_import'.
- `backend/src/routes/assets.ts:237,389`: global asset version increments (drives version-sync).
- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx:234,274,296,331`: only caller of location view AI generation; also suggest/create/establish.
- `src/components/pipeline/Stage10FrameGeneration.tsx:317,1274-1278,1706,1720`: lists location views, renders EstablishViewPrompt, SliderComparison, InpaintingModal (frame inpaint via `frameService.inpaintFrame`).
- `src/components/pipeline/Stage8VisualDefinition.tsx`: renders `AssetDrawer` with scene context (Add to Scene + shot checklist via `sceneAssetService.createSceneAsset`, `shotAssetAssignmentService.createAssignments`, `matchAssetToShots`).
- `src/components/pipeline/Stage6ScriptHub.tsx:80`, `Stage7ShotList.tsx:228`: list project assets.
- `src/components/pipeline/Stage8/ConvertToTransformationDialog.tsx:145`: calls `projectAssetService.updateAsset` (would 400 on locked assets for text fields).
- `ImageGenerationService` scene_asset/transformation_post/frame completion handlers and `NanoBananaClient` role logic belong to the image-provider slice.

## 15. Contradictions / unknowns
- C1 Lock is one-way: comment "Stage 5 gatekeeper" (008:184) vs no unlock path; after Stage 5 "Unlock & Edit" the assets' text fields remain uneditable (PUT 400), while images remain freely regenerable. UNKNOWN whether the Phase A unlock code (ProjectView, cross-slice) expects to unlock assets — it does not touch project_assets in any code found.
- C2 Style change does not propagate to `project_assets.visual_style_capsule_id`; generate-image uses the asset's stored capsule. "Regenerate" after a style change can use the old style (see 9).
- C3 Pass 2 "All script mentions" contains no script text (generic placeholders only); descriptions are derived from the name/type/style.
- C4 Edit-image results become the selected master image before Accept; Cancel does not revert.
- C5 `overridden_fields` documented as "should not be overwritten during global syncs" (009 comment) but sync force-overwrites all of them.
- C6 Clone never writes `source='cloned'`.
- C7 `image-generation.test.ts` calls master_asset jobs without style, contradicting current enforcement.
- C8 AssetFilterModal Confirm initially disabled (decisions empty) — inferred from state init order; runtime confirmation UNKNOWN (would need running the UI).
- C9 AssetDrawer/AssetMatchModal crash on extra_archetype assets — inferred statically (undefined `config.icon`); whether an error boundary catches it UNKNOWN.
- C10 Deleting an 'established' location view deletes the frame's image object in storage (shared `asset-images` URL); inferred from path parsing (`projectAssets.ts:3158-3162`) and frames storing in the same bucket (`ImageGenerationService.ts:378-384,621-622`).
- U1 Whether `image_generation_jobs.project_id NOT NULL` (007) was relaxed for global-asset jobs (`ImageGenerationService.ts:755-762` inserts null) — no migration found in my scan; belongs to global-library slice.
- U2 Multi-branch behavior: no code found that copies project_assets/attempts/views to a new branch; UNKNOWN how branches are created (no `branches` insert found in backend routes/services).
- U3 Gemini text model for extraction/merge = `process.env.GEMINI_MODEL || 'gemini-1.5-flash'` (`llm-client.ts:106`); actual deployed value UNKNOWN (env).
