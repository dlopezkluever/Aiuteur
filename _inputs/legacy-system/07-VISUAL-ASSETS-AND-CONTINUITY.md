# 07. Visual assets and continuity

**Scope.** How the WizardDirector (Aiuteur) code at HEAD of `main` models visual assets and continuity. Covers project assets (Stage 5), global library assets (`/assets`), scene asset instances (Stage 8), angle variants, location views, master references, style capsules and every prompt or job path that receives them, inheritance and propagation rules, status tags, transformation events, location identity and coverage, and the frame and shot continuity engine. Facts only. The evidence is static reading plus spot-checks against the code (corrections and spot-check outcomes are in section 16). Runtime behavior was not observed; questions that only runtime can settle are marked UNKNOWN.

**Sources.** Ledger kinds CAP, STATE, INV, ENTITY, FACT (reporters V2, V5, V6, V7), with ROUTE, TABLE and DEAD entries where cited. Reports V2, V5, V6, V7, V8 (location and camera sections), V9 (reference selection), H (sections 1, 3, 4, 6, 8, 9), R1a and R1b (verdicts on C01 to C22). Ledger ids are cited in short form. `CAP-0143` means `WD-IMPL-CAP-0143`. STATE, ENTITY and FACT map the same way, and `INV-0045` means `WD-IMPL-INVALIDATE-0045`. Report-internal numbers (for example "H row r7") are labeled as such.

**Reading notes.** Sibling docs: `02-FUNCTIONAL-CAPABILITIES.md`, `03-USER-WORKFLOWS.md`, `17-IMPLEMENTATION-LEDGER.md`, and the numbered docs for shots and frames (08), AI calls and prompts (09), versioning, locking and invalidation (10), data model (05), domain and state (04), dead and duplicated code (14), and coverage and unknowns (16). This document does not repeat the shot list or the generic frame lifecycle; those live in 08. Status words used: REACHABLE, FUNCTIONAL, PERSISTED, TESTED, PARTIAL, MOCK-ONLY, DEAD, ORPHANED, LEGACY, DUPLICATED, CONTRADICTED, UNKNOWN. Where a status is not obvious from the cited evidence, it is stated in prose.

---

## 1. Summary of what the code does

- Two asset libraries exist. `project_assets` is per project and branch and holds the Stage 5 cast. `global_assets` is per user. Global assets are copied into projects, not shared. Evidence: V5 2.1, V2 7, ENTITY-0005, ENTITY-0010.
- Asset identity is the row id. No uniqueness constraint exists on name or type. Extraction dedupes by lowercased name across types. Evidence: V5 2.3, `assetExtractionService.ts:174,210,244`.
- `project_assets.image_key_url` is the single current master image. Attempt rows are a history beside it, and four writers change `image_key_url` without going through attempts. Evidence: V5 2.5, STATE-0038, INV-0034.
- Lock is one-way. `project_assets.locked` is set and never cleared. It freezes text fields through the API but not images. Evidence: V5 2.4, R1b C20 (CONFIRMED), STATE-0036.
- Style capsules are snapshotted per asset in `project_assets.visual_style_capsule_id`. The snapshot is not updated on style change. `projects.visual_style_capsule_id` and `projects.writing_style_capsule_id` are never written. Frame image jobs never receive a capsule because the lookup selects nonexistent `stage_states` columns. Evidence: V2 3.1, V2 4 (rows 5g, 8), R1a C01 and C02 (CONFIRMED), FACT-0019, FACT-0020.
- Scene asset instances copy values once, at creation (inherit from scene N-1, bootstrap on scene 1, or populate from the project asset). Nothing propagates after creation. `effective_description` is a stored snapshot and no column marks it stale. Evidence: V6 3, 4, 5, 14; INV-0037, INV-0038.
- Transformation events are created by hand or by converting a duplicate instance. The `transformation_flags` that Stage 7 shot extraction writes are stored and never read. Evidence: V6 8.2, R1b C18 (PARTIALLY CONFIRMED), FACT-0074.
- Location identity is a deterministic resolver with no AI. Two location-state classifiers use thresholds 0.72 and 0.8, so they disagree for confidences in [0.72, 0.8). Evidence: V7 3.2 to 3.4, R1a C07 (CONFIRMED), STATE-0055, FACT-0083.
- Continuity is reference plumbing, not state propagation. The durable pieces are `shots.start_continuity`, `shots.selected_continuity_base_frame_id`, `frame_links`, and the persisted `reference_image_order` arrays. Composition previews are recomputed on each request and their instruction outputs are not consumed by generation. Evidence: V7 5.3, 5.4, 11; V9 11; FACT-0086.
- The only reactive continuity mechanism is `match` frame-link propagation. It runs immediately after a regenerate request, before the asynchronous job that produces the new image has finished. Evidence: V9 6 and 11, H section 9 row r7, CAP-0216.

---

## 2. Asset model

### 2.1 Project assets (`project_assets`)

| Field | Writers (path) | Notes and status |
|---|---|---|
| `id` | all inserts | Identity. No unique constraint on (branch, name, type). |
| `asset_type` | extract, create, PUT, split, clone | CHECK character, prop, location, extra_archetype (migration 024). Extraction emits only character, prop, location (`assetExtractionService.ts:25`). |
| `name`, `description` (NOT NULL) | extract (LLM distill), create, PUT (blocked when locked), merge, split, clone, sync | `description` is the only text input to master image generation, because no UI writes `image_prompt` (V5 2.1). |
| `image_prompt` | PUT, split, clone, sync | No UI caller sets it. Generation uses `image_prompt || description` (`projectAssets.ts:1240`). |
| `image_key_url` | attempt service (`projectAssetAttemptsService.ts:76-79,114-117`), job fallback (`ImageGenerationService.ts:415-418`), clone localize (`projectAssets.ts:2012-2015`), sync (`:2195-2207`), clear-all (`:1651`), split (`:1053`, sets null) | Current master. Writers that bypass attempts: job fallback, clone localize, sync, clear-all. |
| `visual_style_capsule_id` | insert from Stage 5 lock (extract-confirm `projectAssets.ts:350`, create `:1186`, clone `:1960`), split copy (`:1049`), sync overwrite (`:2209-2219`) | Never updated on style change (INV-0028, section 5.5). |
| `locked` | lock-all (`projectAssets.ts:1729`), per-asset POST `/lock` (`:1565`, no UI caller), Stage 8 create-with-project-asset insert (`sceneAssets.ts:933`) | No code sets it to false (R1b C20, CONFIRMED). Grep of `locked: *false` finds only insert payloads. |
| `deferred` | extract-confirm (`projectAssets.ts:352`), PUT (`:596-598`) | Deferred assets skip the image gate. Bootstrap includes them in scene 1 with a null image (`assetInheritanceService.ts:184-188,203`). |
| `scene_numbers int[]` | extract-confirm, create (`:1189`), merge union (`:875-885`), split (`:1050,1066`), Stage 8 add-to-scene append (`sceneAssets.ts:259-266`) | Scene membership list. |
| `source` | `extracted` (extract-confirm), `manual` (create, split, Stage 8 create), `streamline_import` (migrations 042 and 043) | `cloned` is never written. Clone rows take the default `extracted` (`projectAssets.ts:1948-1963`). |
| `style_outdated` | set (`projectAssets.ts:1607`), cleared (`:1651`), cleared on successful master job (`ImageGenerationService.ts:406-410`) | Pure flag. No backend reader. Stage 5 badge only (`Stage5Assets.tsx:1153-1155`). |
| `location_aliases jsonb` | PUT only, location type only (`projectAssets.ts:628-640`) | Read by the resolver. No frontend code writes it (grep of `location_aliases` in `src/` returns only a type and a service type). |
| `global_asset_id`, `source_version`, `last_synced_at`, `overridden_fields` | clone, sync, PUT (adds field names, `:642-647`), clone (`:1900-1903`), sync removes names (`:2224-2230`) | `overridden_fields` never blocks a sync overwrite (INV-0033, section 6.3). |
| `metadata` | does not exist | Insert code comments it out (`projectAssets.ts:119-136`). `ProjectAsset.metadata` (`src/types/asset.ts:39-45`) and the Stage 5 "Visual Conflict" alert (`Stage5Assets.tsx:1241-1248`) read it. DEAD. |

RLS policies exist (migration 008), but the backend uses the service-role client, so every route checks `projects.user_id` itself (V5 2.1).

Branch filtering is inconsistent. List, version-sync, lock-all, mark and clear filter by active branch. GET, PUT, DELETE, merge, split and generate filter only by `project_id`, so an asset on a non-active branch is editable by id (V5 2.3).

### 2.2 Asset types and type-specific behavior

- Aspect ratios: character 512x768, prop 512x512, location 1024x576, extra_archetype 512x768 (`ImageGenerationService.ts:58-63`). The same table is duplicated client-side (`Stage5Assets.tsx:89-94`). DUPLICATED. Aspect ratio is stored on the job row and not sent to the provider (section 4.1, R1b C12).
- Isolation suffix `". Isolated on a plain white background, no environment, no other characters or objects."` (`ImageGenerationService.ts:78-89`) applies to character, prop and extra_archetype. Call sites that apply it: `createImageJob` for `master_asset` and `angle_variant` jobs with an `assetId` (`:124-131`), `createSceneAssetImageJob` (`:226`), and global asset generation (`:749`). The helper's allowlist also names `transformation_post` (`:83`), but no call site passes that job type, so transformation post images get no suffix (V6 8.3; see section 16 for the V5 wording).
- `extra_archetype` is exempt from the Stage 5 image gate (`projectAssets.ts:1706-1721`) but is locked by lock-all (`:1724`). It is created only by the "Add Extra Archetype" button or by a type change (`Stage5Assets.tsx:1061-1068`). `AssetDrawer` and `AssetMatchModal` lack a config entry for it (`AssetDrawer.tsx:62-78,565-566`; `AssetMatchModal.tsx:43-59,162-163`), so `config.icon` is read from undefined. Static inference. Whether an error boundary catches it is UNKNOWN (V5 C9). Global cards have the same gap (FACT-0030).

### 2.3 Global library assets (`global_assets`, migration 008, 024)

- Owner filter `.eq('user_id')` on every `/api/assets` route. No sharing, no public assets (V2 7, 9). Service-role client, so RLS is not the enforcement mechanism.
- Fields: `name`, `asset_type` (character, prop, location on create; extra_archetype reachable through promote), `description` (10 characters minimum on create, `assets.ts:113`), `image_prompt`, `image_key_url`, `visual_style_capsule_id`, `version`, `promoted_from_project_id`.
- `version` increments on every PUT, including a PUT with no change (`assets.ts:236-238`), on upload (`:341-407`) and on successful generation (`assets.ts:389`, `ImageGenerationService.ts:878-884`). Project clones compare `source_version` against it (section 6.3).
- Generation: `POST /api/assets/:id/generate-image` (`assets.ts:410-458`) creates a job, executed by `executeGlobalAssetJobInBackground` (`ImageGenerationService.ts:800-927`). Capsule id from body or asset, with no ownership check (V2 4 row 6). No attempt history. The idempotency key is timestamped and never checked for global jobs (V2 7).
- Delete returns 409 with the titles of projects whose `project_assets.global_asset_id` points here (`assets.ts:273-338`). Storage objects are not removed.
- The capsule on a global asset cannot be cleared from the UI. The PUT updates the column only when the value is not `undefined` (`assets.ts:244`; FACT-0036).
- Ledger: ENTITY-0005; CAP-0074 to CAP-0082 (global library CRUD, upload, generate, delete, promote). FUNCTIONAL.

### 2.4 Scene asset instances (`scene_asset_instances`, migrations 015, 017, 022, 037)

- One row per (`scene_id`, `project_asset_id`), `UNIQUE` at `015:41`. Cascades on scene delete and project asset delete (`015:15-16`).
- Columns and writers are listed in section 9 (visual state). The fields that matter for propagation are `description_override`, `effective_description`, `image_key_url`, `status_tags`, `carry_forward`, `inherited_from_instance_id`, `use_master_as_is`, and the `selected_master_reference_*` triple.
- The modification trigger (`017:22-47`) increments `modification_count` on every UPDATE, including image job completion and attempt selection. `last_modified_field` is set only for four columns. The list badge "locked" depends on this count (section 7).
- Ledger: ENTITY-0017, STATE-0045, STATE-0051.

### 2.5 Generation attempts

| | Project asset | Scene asset instance |
|---|---|---|
| Table | `project_asset_generation_attempts` (023) | `scene_asset_generation_attempts` (022) |
| Sources | `generated`, `uploaded` | `generated`, `uploaded`, `master_copy` |
| Cap | 4 (`projectAssetAttemptsService.ts:9`) | 8 (`sceneAssetAttemptsService.ts:8`) |
| Eviction | Oldest non-selected row and its storage object (`:170-197`). Can delete an uploaded original. | Oldest non-selected row and its storage object (`:161-188`). `master_copy` rows have no `storage_path`, so only the row is deleted. |
| Selected | Partial unique index, at most one selected per asset (`023:47-49`) | Partial unique index, at most one selected per instance (`022:43-45`) |
| Mirror to master | Selection writes `image_key_url` in a separate, non-atomic statement | Same (STATE-0046) |
| Lazy backfill | On list, if no rows exist, creates a selected `generated` row from `image_key_url` (`:221-245`) | Same (`:212-236`). Inherited and master-copied URLs are therefore labeled "generated". |
| Selected row delete | Refused | Refused |

Ledger: STATE-0038, STATE-0046, INV-0034, INV-0039. Both attempt services are untested (V5 13, V6 16).

### 2.6 Angle variants (character only, `asset_angle_variants`, migration 025)

- Columns include `angle_type` CHECK (front, side, three_quarter, back), `status` CHECK (pending, generating, completed, failed), `image_url`, `storage_path`, `image_generation_job_id`, `prompt_snapshot`. `UNIQUE(project_asset_id, angle_type)`.
- Generate (`projectAssets.ts:2520-2637`): each requested angle resets its row to `pending`, then `createAngleVariantJob` (`ImageGenerationService.ts:249-293`) sets `generating` and a prompt of the form `` `${ANGLE_PROMPTS[angle]} of ${asset.description}` `` (for example "side profile view, facing left, showing full silhouette of ..."). Job type `angle_variant`, 512x768.
- No reference image is passed. The master image is not used. Only capsule text and capsule images reach the model (V5 7).
- Not invalidated when the master description or image changes (INV-0035). Delete removes the storage object and row (`projectAssets.ts:2643-2695`).
- Consumers: frame prompt and reference selection (`projects.ts:3665-3690`, `frames.ts:1729-1741`, `continuityCompositionService.ts:549-567`, `promptGenerationService.ts:379-382`).
- Stage 5 "Manage Angles" menu (`Stage5Assets.tsx:1207-1212`). The dialog polls every 2 seconds while an angle is generating (`AngleVariantsDialog.tsx:60-103`). No stage-lock or asset-lock check on any angle route (`projectAssets.ts:2468-3448`).
- Ledger: ENTITY-0012, STATE-0043.

### 2.7 Location views (`location_views`, migrations 038 and 040)

A location view is a named camera reference that belongs to one `project_assets` row of type `location`. It is separate from the location's master `image_key_url`, separate from `location_aliases`, and separate from angle variants.

- Columns: `name` (system key, unique per asset: "establishing", "direction_1", ...), `alias` (user label), `description`, `view_type` (`establishing` or `direction`), `camera_distance` (`wide` default; `medium`, `close`), `camera_height` (`eye_level`, `high_angle`, `low_angle`, `overhead`, `ground_level`), `image_key_url` (nullable), `is_primary` (one per asset by application convention, not by constraint), `source` (`user`, `established`, `stage7_inferred`), `established_from_scene` (display string "Scene N, Shot M"), `established_from_shot_id` (no FK), `promoted_from_frame_id` (FK frames, SET NULL), `sort_order`.
- A "camera direction" in the UI is a `location_views` row with `view_type = 'direction'`. `shots.camera_direction_id` references it with SET NULL (`038:80`). `frames.promoted_to_view_id` references it with SET NULL (`040:13-14`).

| Writer | Path | Effect and status |
|---|---|---|
| Suggest defaults | `projectAssets.ts:2854-2975` | 400 if any view exists. INT/EXT heuristic from the first scene whose excerpt line contains the asset name. Inserts establishing, direction_1 (primary), direction_2. FUNCTIONAL. |
| Create | `:2761-2848` | 409 on duplicate name. The UI names new directions `direction_${count+1}` (`LocationViewsDialog.tsx:93-115`), so deleting a lower-numbered direction and adding another can collide. |
| Update | `:2981-3045` | Alias, description, camera fields, `is_primary` (unsets others), `image_key_url`. |
| Upload image | `:3051-3122` | Storage `project/{p}/location-views/{asset}/{view}-{ts}{ext}`. Previous object not removed. |
| Delete | `:3128-3181` | Removes the storage object parsed from `image_key_url`. For an `established` view whose URL is a frame image, this deletes the frame's file in the shared bucket (C10, inferred from path parsing; runtime UNKNOWN). |
| Establish from frame | `:3193-3287` | Copies a frame URL into the view, sets `source = established`. Sets `frames.promoted_to_view_id` only when `frameId` is sent. The Stage 8 panel does not send it. Caller: `EstablishViewPrompt` (Stage 10) and `LocationCoveragePanel.tsx:331`. |
| Generate image (AI) | `:3298-3448` | Only caller is `LocationCoveragePanel.tsx:234`. The client polls the job and then PUTs `image_key_url` (`projectAssetService.ts:1216-1264`). If the tab closes or polling times out at 60 seconds, the result is never attached (V5 8). Stage 5 `LocationViewsDialog` has no generate action. |
| Stage 7 inference | `projects.ts:1832-1880` | Creates `source = stage7_inferred` views for new directions returned by shot extraction. |

Ledger: ENTITY-0013, ENTITY-0023, STATE-0044 (FUNCTIONAL, PERSISTED, partly untested).

### 2.8 Master references at scene level

- The effective master for a scene instance is `selected_master_reference_url` when set, otherwise `project_assets.image_key_url` (V6 7.3; `contextManager.ts:248`, `continuityCompositionService.ts:530`).
- The reference chain (`GET .../reference-chain`, `sceneAssets.ts:1505-1594`) lists, in order: (a) the Stage 5 image; (b) each lower-numbered scene's instance image for the same project asset, ascending, using its selected attempt or `image_key_url`; (c) confirmed transformation post images for the same project asset up to the current scene. Duplicates are removed by URL.
- Select (`POST .../select-master-reference`, `sceneAssets.ts:1607-1661`) writes the triple and sets `use_master_as_is = false`. It does not verify that the URL is in the chain or that the instance belongs to the scene (V6 15).
- Readers: default generation reference (`ImageGenerationService.ts:241`), use-master (`sceneAssets.ts:1299,1404`), prompt generation (`projects.ts:3659`), `contextManager.ts:248`, `continuityCompositionService.ts:530`.
- Ledger: STATE-0048 (FUNCTIONAL, PERSISTED, untested).

---

## 3. Asset extraction pipeline (Stage 5 scan and confirm)

### 3.1 Preconditions

- Style must be locked in the UI (`Stage5Assets.tsx:320-323`). The server's confirm route requires a locked capsule id or a manual tone (`projectAssets.ts:304-311`).
- The "Scan Script for Assets" button renders only while `hasExtracted === false` (`Stage5Assets.tsx:976-995`). `hasExtracted` becomes true when any asset exists on load, after a successful confirm, or after an empty scan (`:196-198,332,347`). Re-extraction is therefore not offered in the UI once any asset exists.

### 3.2 Pass 0: preview (no LLM, nothing persisted)

- `POST /:projectId/assets/extract-preview` (`projectAssets.ts:165-267`) calls `aggregateSceneDependencies(branchId)` (`assetExtractionService.ts:140-274`). It reads `scenes(scene_number, script_excerpt, expected_characters, expected_location, expected_props)` for the branch.
- Each scene contributes characters, props and one location string. Entities are deduped by lowercased name across types, with the first casing kept (`:174,210,244`). Each appearance adds a mention with generic text ("Character appears in scene N", "Prop appears in scene N", "Location: X") and the first three lines or 200 characters of the excerpt as `context`.
- If no entities are found, the route falls back to the latest Stage 4 `tiptapDoc` through `extractManifest()` (`utils/scriptManifest.ts:280`, `projectAssets.ts:185-243`).
- Response: `{entities: [{name, type, sceneNumbers, mentionCount}], counts}`. Status: FUNCTIONAL, not persisted (CAP-0136).

### 3.3 User review

`AssetFilterModal` offers Keep, Defer and Delete per entity, and bulk actions per type. Decision state is initialized once at mount (`AssetFilterModal.tsx:48-55`). Stage 5 mounts it with `previewEntities = []` (`Stage5Assets.tsx:1438-1444`), so on first open the decision map is empty. Rows show "keep" as a fallback, counts are zero, and Confirm is disabled until a decision button is clicked (`:88-96,222`). Untouched rows are still sent as `keep` (`:104`). Runtime confirmation UNKNOWN (V5 C8).

### 3.4 Pass 2: LLM distillation (`POST /:projectId/assets/extract-confirm`, `projectAssets.ts:273-377`)

Requests carry `selectedEntities: [{name, type, decision, sceneNumbers}]`. The server re-runs aggregation and keeps entities whose `type:name` key still matches (`assetExtractionService.ts:63-97`). Renamed entities, or entities that lost their type-collapsed key, are skipped silently.

For each kept or deferred entity, `distillVisualSummary` (`assetExtractionService.ts:521-652`) makes one LLM call, sequentially.

**What the model receives (verified by spot-check):**

| Part | Content | Source |
|---|---|---|
| System prompt | "You are a visual description specialist. Create a concise, vivid 3-5 sentence description suitable for AI image generation." Rules include PHYSICAL ONLY and STYLE-ALIGNED ("Consider the {styleContext.name} visual style"). Output is JSON. | `:521-652` |
| Style context | Capsule name, `descriptor_strings`, and `design_pillars` as "k: v; ...". For a manual tone: `{name: 'Manual Tone', description: tone}`. | `:657-681` (capsule read with no ownership check) |
| User prompt | `Asset: ${name} (${type})`, `Style Context: ...`, `All script mentions:` followed by one line per mention: `Scene N: <generic placeholder>`. | `:542-544` |
| Script text | **Not sent.** The excerpt is stored as `mention.context` and never read. | R1a C11 (CONFIRMED); V5 3.4 |
| Parameters | temperature 0.4, maxTokens 2048, metadata `{stage: 5, pass: 2, entityName}`. Model: `llmClient` default, `GEMINI_MODEL` or `gemini-1.5-flash` (`llm-client.ts:106`). Deployed value UNKNOWN. | V5 3.4 |
| Output | JSON `{description, confidenceScore, isPriority, hasVisualConflicts, conflictDetails}`. Only `description` is persisted. Priority and conflict fields are discarded at insert. | `:94-96` |
| Failure fallback | Description is the mention texts joined by spaces, for example "Character appears in scene 1 Character appears in scene 4", and it is persisted. | `:637-651` |

The model therefore sees the entity name, type, scene numbers and style only. Any description it produces comes from the name and the style, not from script content (R1a C11, FACT in V5 section 15 C3).

**Insert** (`projectAssets.ts:341-361`): one row per distilled entity with `branch_id` = active branch, `visual_style_capsule_id` = capsule or null, `locked = false`, `deferred = (decision === 'defer')`, `scene_numbers` from the client, `source = 'extracted'`.

**Duplicate behavior.** None is guarded. There is no lookup of existing `project_assets` rows, and no server-side check against a second confirm. Each call inserts a fresh set. The client then replaces its list with the returned rows (`Stage5Assets.tsx:364`). The ledger entry is CAP-0137 (functional PARTIAL, PERSISTED, untested). ENTITY-0011 records the source data.

### 3.5 Deprecated and dead paths

- `POST /:projectId/assets/extract` (`projectAssets.ts:44-158`) is a one-shot pass that passes `''` as the script and runs Pass 2 for every entity. Its frontend wrapper `projectAssetService.extractAssets` (`:104-127`) has no caller. REACHABLE over HTTP only. DEPRECATED.
- `extractEntityMentions` (`assetExtractionService.ts:366-516`) is a full-script LLM extraction prompt. It is never called. DEAD (V5 3.6; R1a C11 notes its absence).

---

## 4. Asset image generation, edit, inpaint, angle and location variants

### 4.1 Master image: generate and regenerate (project asset)

Chain: `Stage5Assets.handleGenerateImage` (`:379-414`) → `projectAssetService.generateImage` → `POST /:projectId/assets/:assetId/generate-image` (`projectAssets.ts:1210-1282`) → `ImageGenerationService.createImageJob` (`:109-187`) → background `executeJobInBackground` (`:298-582`) → `NanoBananaClient.generateImage` (model `gemini-2.5-flash-image`, `NanoBananaClient.ts:117-120`) → storage bucket `asset-images` at `project_{p}/branch_{b}/master-assets/{assetId}_{ts}_{rand}.png` (`:609-611`) → `enforceAttemptCap` and `createAttempt(is_selected: true, source: 'generated')` → `image_key_url` set, `style_outdated = false`, job `completed`.

- Prompt: `asset.image_prompt || asset.description` (`projectAssets.ts:1240`), plus the isolation suffix for isolatable types (`ImageGenerationService.ts:124-135`). Dimensions come from the asset type table.
- Style: `visualStyleCapsuleId = asset.visual_style_capsule_id`. The manual tone is read from Stage 5 only when the asset's capsule id is null (`projectAssets.ts:1244-1260`). There is no fallback to the current Stage 5 lock. `createImageJob` throws if neither is present (`ImageGenerationService.ts:137-141`, message "Visual Style Capsule or Manual Visual Tone is required"). Behavior after a style change is in section 5.5.
- Reference images: none, apart from capsule images (no master or identity reference is sent for this route).
- Gate: no lock check and no stage check on this route (`projectAssets.ts:1210-1282`).
- Idempotency key `asset-${assetId}-${Date.now()}` (`projectAssets.ts:1271`) is effectively never a duplicate.
- Failure fallback path (`ImageGenerationService.ts:414-425`) writes `image_key_url` without an attempt row.
- Client polls `GET /api/images/jobs/:jobId` once per second, up to 60 times (`projectAssetService.ts:385-424`). A timeout toast appears while the job keeps running (FUNCTIONAL with timeout caveat; FACT-0066).
- "Generate All Images" iterates sequentially over active, non-extra assets with no `image_key_url` (`Stage5Assets.tsx:1069-1093`).
- Ledger: CAP-0143 (FUNCTIONAL, PERSISTED; partly untested), CAP-0155.

Job lifecycle, status values and in-process execution are documented in 08 and 12. The relevant facts here are: no queue, no worker, a server restart leaves in-flight jobs non-terminal (FACT-0065).

### 4.2 Upload and analysis

- `POST .../upload-image` (`projectAssets.ts:1288-1374`): multer memory, 10 MB, PNG, JPEG, WebP. Storage `asset-images/project/{projectId}/{assetId}/{ts}-{rand}{ext}`. Creates an attempt with `source = 'uploaded'`, selects it, sets `image_key_url`. Does not clear `style_outdated`. No lock check.
- The UI then calls analyze automatically (`Stage5Assets.tsx:435-452`).
- `POST .../analyze-image` (`projectAssets.ts:1380-1429`): `ImageAnalysisService.analyzeAssetImage` (`imageAnalysisService.ts:35-116`) sends the image to `gemini-2.5-flash` with a type-specific focus prompt. If a description exists, a second text call merges the two (`:90-116`). Confidence is a length heuristic: over 50 characters 0.9, over 20 0.7, otherwise 0.5 (`:81`). Nothing is persisted. The constructor throws if `GOOGLE_AI_API_KEY` is missing (`:24-28`).

### 4.3 Edit, apply style, remove background, regenerate (project asset)

`EnhancedUploadModal` opens after an upload's analysis succeeds (`Stage5Assets.tsx:1480-1520`). Its four actions all call `startEditImageJob` → `POST .../edit-image` (`projectAssets.ts:1436-1521`) and poll every 2 seconds, up to 90 times (`EnhancedUploadModal.tsx:111-131`).

- Prompt: `description`. With instructions: `` `${editInstructions}. Context: ${description}` ``. With remove-background: the isolation suffix is added (`:1491-1497`). `createImageJob` then adds the suffix again for isolatable types, so the suffix can appear twice (V5 4.4).
- Style: asset capsule, else the Stage 5 locked capsule, else the Stage 5 manual tone (`:1470-1488`). This order differs from generate-image.
- Reference: `referenceImageUrl` is prepended as the first reference image with no role (`ImageGenerationService.ts:334-345`). NanoBanana then builds a "subject of the first reference" prompt when more than one image is present, or a "matches the visual style" prompt when exactly one is present (`NanoBananaClient.ts:88-101`).
- Persistence: the job type is `master_asset` with an `assetId`. **Every edit result is persisted as a new selected attempt and becomes `image_key_url` at completion, before the user clicks Accept** (INV-0032, CAP-0145). Cancel does not revert it. The cap of 4 prunes the oldest non-selected attempt for each edit.
- Accept (`Stage5Assets.tsx:616-642`) PUTs `finalDescription` as the description. The initial value is `suggestedMerge || extractedDescription` (`EnhancedUploadModal.tsx:97-99`). If the accepted URL differs from the current `image_key_url`, the matching attempt is selected.

### 4.4 Inpaint

- **Project and scene asset images have no inpaint path.** `InpaintingModal` and `InpaintCanvas` are used only for frames (Stage 10, `Stage10FrameGeneration.tsx:380-389,1720`, `frameService.inpaintFrame`). V5 4.4 and V6 section 2 list no inpaint route for assets. Grep for `inpaint` in `projectAssets.ts` and `sceneAssets.ts` returns no matches.
- Frame inpaint, for reference: the mask is uploaded and stored in `frames.last_inpaint_mask_path` but is never sent to the provider. The job sends the current frame image as a reference plus text (R1b C12, CONFIRMED). `NanoBananaClient.inpaintImage` is the only mask-aware method and has zero callers (`NanoBananaClient.ts:171`, `ImageProviderInterface.ts:52`). DEAD.
- The scene asset "edit" route (R6, `sceneAssets.ts:408-518`) is a prompt edit with a reference image, not an inpaint.

### 4.5 Angle variants

Covered in section 2.6. Generation uses no reference image. The status lifecycle is pending, generating, completed or failed (STATE-0043). Failure sets status `failed` (`ImageGenerationService.ts:575-580`).

### 4.6 Location views: image generation

`POST .../location-views/:viewId/generate-image` (`projectAssets.ts:3298-3448`):

- Style reference order: establishing view image, then primary view image, then master location image. 400 if none exists (V5 8).
- Prompt template (verbatim from code): `` `${viewDesc}. Same ${asset.name} seen from${viewAlias} perspective, ${heightLabel} camera height, ${distanceLabel} shot. Maintain the same color palette, architectural details, materials, and lighting conditions as the reference. Location description: ${asset.description}` ``.
- Job type `scene_asset` without `assetId` or `sceneId`, so the scene-asset completion handler is skipped (`projectAssets.ts:3424-3429`). Dimensions 1024x576. One reference with `role: 'style'`.
- Style: asset capsule or Stage 5 manual tone only, with no Stage 5 capsule fallback. If the asset capsule is null and a Stage 5 capsule is locked, the job throws (PARTIAL, section 5.3 row 5d).

### 4.7 Scene asset instance images (Stage 8)

**Generate (single and bulk)**

- UI: "Generate Image" (`VisualStateEditorPanel.tsx:508-525`, disabled when `use_master_as_is`) → `handleGenerateImage` (`Stage8VisualDefinition.tsx:638-654`) → `POST .../scene-assets/:instanceId/generate-image` (R5, `sceneAssets.ts:350-402`).
- R5 requires the latest Stage 5 content row to hold `locked_visual_style_capsule_id` or `manual_visual_tone`, regardless of its status (`sceneAssets.ts:366-381`).
- Prompt: `effective_description` plus `". Visual modifiers: <tags>."` (`ImageGenerationService.ts:219-223`) plus the isolation suffix for character, prop and extra_archetype (`:226`).
- Reference priority (`ImageGenerationService.ts:241`): request `referenceImageUrl` (sent by the UI only when the "Use as ref" switch is on, `VisualStateEditorPanel.tsx:511-514,528`), then `selected_master_reference_url`, then `project_assets.image_key_url`.
- Completion (`ImageGenerationService.ts:442-495`): finds the instance by (scene, project asset), enforces the cap, deselects others, inserts a selected `generated` attempt, sets `image_key_url`. On failure the instance is untouched.
- Client polls `GET /api/images/jobs/:jobId` every 2 seconds, 60 times (`Stage8VisualDefinition.tsx:438-454`). A timeout toast appears while the job may still write.
- Bulk: parallel R5 calls per selected id, behind a cost modal with a hardcoded `COST_PER_IMAGE = 1` (`Stage8VisualDefinition.tsx:126,854-861`). Bulk does **not** skip instances with `use_master_as_is = true`. A generated attempt then becomes selected while the flag stays true (V6 7.1).

**Edit (R6)**

- Prompt: `"<editInstructions>. Context: <description>"` plus the isolation suffix (`sceneAssets.ts:468-481`). The description is the client's value, not the server's `effective_description`. Reference from client. Job type `scene_asset`. Completion writes a `generated` attempt, as in generate.

**Upload (R22)**

- PNG, JPEG, WebP, 5 MB (`sceneAssets.ts:1671-1777`). Stored at `scene_{s}/scene-assets/uploads/{instanceId}_{ts}_{rand}{ext}` (`:1711`). Creates an `uploaded` attempt, selects it, sets `image_key_url`, clears `use_master_as_is`, and clears the master reference flag (`:1751-1753`).
- Then analyze (R7) and `EnhancedUploadModal` as in section 4.3, with the same persistence semantics.

**Use master as-is (R18 single, R19 bulk)**

- Enabled: master URL = `selected_master_reference_url || project image`. Cap applied, others deselected, a `master_copy` attempt inserted and selected, `use_master_as_is = true`, and `image_key_url = url` (`sceneAssets.ts:1296-1332`). Disabled branch only clears the flag. The disabled branch is ORPHANED because the UI never sends it (section 15).
- While true, the editor disables Generate, Upload, description and infer (`VisualStateEditorPanel.tsx:515,549,581,590`). Bulk generate is not blocked (above).

**Attempts (R15-R17)**: select (R16) copies the attempt URL to `image_key_url` and does not change `use_master_as_is`. Delete (R17) refuses the selected attempt and removes the storage object only when `storage_path` is set (V6 7.2).

## 5. Style capsules

### 5.1 Data model

| Object | Columns and facts | Evidence |
|---|---|---|
| `style_capsule_libraries` | `id, user_id (nullable), name, description, is_preset, timestamps` | `004:11-19`. Vestigial (below). |
| `style_capsules` | One table for both types. `type` CHECK writing or visual. Writing fields: `example_text_excerpts[], style_labels[], negative_constraints[], freeform_notes`. Visual fields: `design_pillars jsonb, reference_image_urls text[], descriptor_strings text`. Also `is_preset, is_favorite`. | `004:22-48`. Unique constraint replaced in migration 005; the partial-index statement in 005 is not valid as a table constraint, and whether 005 applied is UNKNOWN (V2 1.1). |
| `design_pillars` shape | By convention `{colorPalette, mood, medium, lighting, cameraLanguage}`. Editor restricts values to 10 options per key. Seeded values fall outside those options. | `src/types/styleCapsule.ts:8-15`, `VisualStyleCapsuleEditor.tsx:34-95` (V2 1.1) |
| `reference_image_urls` | Public URLs in bucket `style-capsule-images`, path `${userId}/${capsuleId}/${ts}-${rand}${ext}`. Bucket is public-read. | `styleCapsules.ts:384-403`, `backend/quickies-sql/Storage-RLS-policies.sql:29-30` |
| `style_capsule_applications` | Audit rows: `stage_state_id`, `style_capsule_id`, `injection_context jsonb`. Written when a stage save carries capsule metadata. No reader. | `004:51-57`, `stageStates.ts:259-280` |
| `projects.writing_style_capsule_id`, `projects.visual_style_capsule_id` | FK columns, no ON DELETE. **Never written by any code path** (grep of the backend and `src/` finds only reads and migration 004). | R1a C02 (CONFIRMED), FACT-0019 |
| `project_assets`, `global_assets` | `visual_style_capsule_id` FK, ON DELETE SET NULL. | `008:22,63` |
| `image_generation_jobs.visual_style_capsule_id` | FK, no ON DELETE. Set to the job's capsule id (null for frame jobs). | `007:54`, `ImageGenerationService.ts:159` |

**Presets and user capsules**

- Presets (`is_preset = true`, `user_id` null) come only from the operator script `seed-style-capsules.ts`: 4 writing and 4 visual presets with empty image lists. The script is not idempotent (V2 6). The API refuses to update or delete presets (403, `styleCapsules.ts:178-180,236-238`; FACT-0024). User capsules always insert with `library_id` null (`styleCapsules.ts:109-115`).
- Libraries are vestigial. `GET /libraries/all` auto-creates "My Style Capsules" (`styleCapsules.ts:489-518`), and `createLibrary` has no caller (FACT-0023). Favorites are a column on the capsule row (`004:43`), so toggling a preset's favorite changes it for every user (FACT-0025). Duplicate works only on presets (`styleCapsules.ts:309-318`).
- Delete: own non-preset only. FK references from `projects`, `image_generation_jobs` and `style_capsule_applications` without ON DELETE mean a used capsule is expected to fail to delete. Runtime UNKNOWN (FACT-0021).
- Code inventory: `StyleCapsuleService` is mostly dead. Only `getCapsuleById` and `formatWritingStyleInjection` have callers. `recordApplication`, `formatVisualStyleInjection`, `getUserCapsules` and others have none (FACT-0037). The frontend `formatWritingStyleInjection` and `recordApplication` calls go to methods that do not exist on the frontend service (V2 4.7; FACT-0029).

### 5.2 How a capsule is selected and snapshotted

**Writing capsule (Stage 1).** Selected in `Stage1InputMode.tsx:873-889`. Persisted only on "proceed", in `stage_states(stage 1).content.writingStyleCapsuleId` and `content.processedInput.projectParams.writingStyleCapsuleId` (`Stage1InputMode.tsx:267-281`). Resolved at generation by `ContextManager.fetchProject()`, which reads the latest Stage 1 row of the project's `is_main` branch, not the active branch (`contextManager.ts:465-499`). Streamline-mode behavior is UNKNOWN (V2 3.2).

**Visual capsule (Stage 5).** The "Style Capsule" or "Manual Tone" toggle is at `Stage5Assets.tsx:866-896`. Selecting a capsule locks it immediately, with no confirm (`handleStyleLock`, `:888-895`), and writes `{locked_visual_style_capsule_id, manual_visual_tone: null, manual_tone_preset: null, style_locked_at}` to `stage_states(stage 5).content` (`:99-107,220-233`). Manual tone writes `manual_visual_tone` and `manual_tone_preset` (`:236-259`). No `projects` column is involved.

**Snapshot into assets.** The Stage 5 lock id is copied into `project_assets.visual_style_capsule_id` at extract-confirm (`projectAssets.ts:305-310,350`), asset create (`:1163-1186`), clone (`:1835,1915,1960`), and split (`:1049`). Sync overwrites it with the global asset's id, or keeps the project value (`:2209-2219`). Stage 8 instances have no capsule column; they read the current Stage 5 lock at generation time (section 5.3, row 5f).

### 5.3 Every injection point

Legend. **Reaches model?** says whether the capsule text or images reach the image or text model in practice. Source for each row is the path in the table.

| # | Injection point | Capsule source | What is injected | Reaches model? |
|---|---|---|---|---|
| 1 | `backend/src/routes/llm.ts:194-215`, template route with project metadata | Writing capsule via `ContextManager.assembleGlobalContext` (`contextManager.ts:127-141`) | `writing_style_context = formatWritingStyleInjection(capsule)` interpolated into `{writing_style_context}` of the DB template (`styleCapsuleService.ts:330-361`) | **Yes** for Stage 2, 3 and 4 text generation. Frontend sends an empty placeholder, because validation runs before injection (`llm.ts:176-187` vs `:205-215`). Seeded templates contain the placeholder (`seed.ts:42-43`). Live template text UNKNOWN (two seed copies, FACT-0033). |
| 2 | `llm.ts:232-262`, same route without project metadata | Writing capsule id from request variables | Same formatter | **Yes**, only when the frontend sends an empty `projectId` (`beatService.ts:52,68`, `scriptService.ts:76,94`). |
| 3 | `services/streamlineBackfillService.ts:57-80` `backfillTreatment()` | Writing capsule via `assembleGlobalContext` | "WRITING STYLE GUIDANCE:" block appended to the user prompt. Only when a writing capsule exists. `backfillBeatSheet` does not inject style (`:106-125`). | **Yes** (Gemini text). |
| 4 | `assetExtractionService.ts:520-548,657-683` `distillVisualSummary()` | Visual capsule id from Stage 5 lock (`projectAssets.ts:78,305`) | Capsule name, descriptor strings and pillars as text ("STYLE-ALIGNED: Consider the {name} visual style") | **Yes** (text). The style is baked into `project_assets.description`, which is user-editable later. Not re-run on style change. |
| 5 | `ImageGenerationService.executeJobInBackground` for project jobs (`ImageGenerationService.ts:307-359`); helpers `getVisualStyleContext` (`:639-689`) | Visual capsule id passed by the caller, or `manualVisualTone` | `textContext = [descriptor_strings, pillars 'k: v; ...'].join('. ')`. Capsule `reference_image_urls` are added as images with no role. Identity references (with role) and `referenceImageUrl` are placed before them (`:319-345`). No ownership or type check. | Depends on the caller (rows 5a to 5h). |
| 5a | `projectAssets.ts:1210-1279` generate-image (Stage 5 master) | `asset.visual_style_capsule_id` only. Stage 5 consulted only for a manual tone when the asset has no capsule id (`:1244-1260`). | As row 5 | **Yes**, but uses the asset's snapshot, not the current Stage 5 lock (section 5.5). |
| 5b | `projectAssets.ts:1436-1520` edit-image | Asset id, else Stage 5 lock, else manual tone | As row 5, plus optional `referenceImageUrl` | **Yes** |
| 5c | `projectAssets.ts:2520-2630` angle variants, into `createAngleVariantJob` (`ImageGenerationService.ts:249-293`) | Asset id, else Stage 5 lock, else manual tone | As row 5 | **Yes** |
| 5d | `projectAssets.ts:3298-3440` location view generate-image | `asset.visual_style_capsule_id` only; Stage 5 only for manual tone | As row 5, plus one `role: 'style'` reference | **PARTIAL.** Asset with null capsule id and a locked Stage 5 capsule makes the job throw (`ImageGenerationService.ts:139-141`). |
| 5e | `projectAssets.ts:1979-1997` clone-from-global with `regenerateImage` | Stage 5 lock, else the global asset's id | As row 5, plus the global image as a reference | **Yes**, only when a capsule exists. Manual-tone projects localize instead of regenerating. |
| 5f | Stage 8: `sceneAssets.ts:350-405` generate, `:408-505` edit, `:1944-2030` transformation post, via `createSceneAssetImageJob` (`ImageGenerationService.ts:193-243`) | **Current** Stage 5 lock (`sceneAssets.ts:375,459,1999`) or manual tone | As row 5, plus master image reference | **Yes** |
| 5g | Frames: `frames.ts:259-275` generate-frames, `:382-402` regenerate, `:446-463` inpaint, `:764-780` regenerate-with-correction, `:842-858` regenerate-with-prompt; then `frameGenerationService.ts:311-497, 845-930, 982+, 1250+` | Query on `stage_states` with `select('state_data')` and `.eq('project_id')` for stage 3. Neither column exists. Error is discarded. `visualStyleCapsuleId` is always `undefined`. | None | **No.** Frame image jobs get no capsule text, no capsule images, and no capsule id. R1a C01 (CONFIRMED). FACT-0020. |
| 5h | `routes/images.ts:9-58` POST `/api/images/generate` | Body `visualStyleCapsuleId` | As row 5 | Only from `imageService.ts`, which has no importers. ORPHANED (V5 12). |
| 6 | Global asset generate: `assets.ts:410-458` → `ImageGenerationService.ts:800-927` | Body id, else asset's id. No ownership check. | `getVisualStyleContext` text and images. No identity references. | **Yes** |
| 7 | `NanoBananaClient.generateImage()` prompt wrapping (`NanoBananaClient.ts:69-103`) | Derived from rows 5 and 6 | Wording depends on counts of identity and style images. Capsule images carry no role, so with two or more capsule images and no identity image, the first style image is treated as the subject (see section 17). | **Yes**, wording only (FACT-0027). |
| 8 | `promptGenerationService.buildStyleContext()` (`promptGenerationService.ts:761-786`) → frame, end-frame and continuity prompt system prompts (`:1128-1160`, `:1291-1331`, `:1371-1416`) | `project.visual_style_capsule_id` (`projects.ts:3738-3749`, `frames.ts:567-576`, `frames.ts:2214-2223`), or a Stage 3 `state_data` id on the camera-change path (`frameGenerationService.ts:775-800`) | "VISUAL STYLE:" block (pillars, descriptor strings, labels, avoid list). Otherwise the literal `"No visual style capsule applied."` (`promptGenerationService.ts:762`). | **No, in practice.** Both sources are always null (rows 5g and section 5.1). Every Stage 9 frame, end-frame and continuity prompt receives the literal string (CAP-0073, non-functional). |
| 9 | `ContextManager` formatters (`contextManager.ts:288-318,381-408,608-664`) | Writing capsule | "WRITING STYLE GUIDANCE:" and similar | Only the streamline backfill path (row 3) uses them. `prepareStageContext`, `assembleFullContext` and `formatPromptGenerationContext` have no production callers (DEAD). |
| 10 | Video generation (`services/video-generation/*`, `videoGenerationService.ts`) | None | None | **No**. Grep finds no capsule reference. `generateVideoPrompt` never receives style (V2 4, row 10). |

**Verbatim formatter (writing capsule; `styleCapsuleService.ts:338-360`):**

```
Example excerpts:
"<excerpt>"                  (one per excerpt)
Style characteristics: <labels joined ', '>
Avoid: <negative constraints joined ', '>
Additional notes: <freeform_notes>
(sections joined with '\n\n'; empty sections omitted)
```

**Verbatim NanoBanana wrappers (`NanoBananaClient.ts:78-102`):**

- Prefix inside each image branch: `Apply these style guidelines: ${visualStyleContext}. `
- Two or more images, no identity roles: "Generate an image of the subject shown in the FIRST reference image. Maintain the subject's identity ... Apply the visual style ... from the remaining reference images. ... Subject: ${prompt}"
- One image: "Generate an image that matches the visual style, color palette, mood, and aesthetic shown in the provided reference image. ... Subject: ${prompt}"
- Text only: "Generate an image with the following visual style applied strongly throughout: ${ctx} ... IMPORTANT: The visual style described above must be clearly evident in the generated image."

**Application log.** `stageStates.ts:259-280` inserts `style_capsule_applications` after a stage save carries `styleCapsuleMetadata`. Stage 2, 3 and 4 components send it (`Stage2Treatment.tsx:204,377`, `Stage3BeatSheet.tsx:354`, `Stage4MasterScript.tsx:337`). The table has no reader. Capsule content is not snapshotted, only the injected length, so later edits to a capsule change future output with no record of the earlier text (V2 4.6).

### 5.4 Where the capsule does NOT reach

- **Frame image generation (all five frame routes).** Row 5g. This is the largest gap: Stage 10 start and end frames, regenerate, correction, edited prompt and inpaint all run with no capsule.
- **Stage 9 frame, end-frame and continuity prompt text.** Row 8. The project-level column is never written, so the literal "No visual style capsule applied." is always sent.
- **Video prompts.** Row 10.
- **Writing capsule beyond Stages 2 to 4.** Stage 9 and 10 prompt generation take no writing-capsule input. `ContextManager` paths that could carry it have no production callers (row 9).
- **Stage 5 assets after a style change**, when the asset already holds a capsule id (section 5.5).
- **Global asset capsule into project frames or scenes.** The global capsule is copied into a project asset only at clone or sync, and only through the asset's own id.
- **Capsule text in the continuity preview.** The composition preview has no style field (V7 5.3).

### 5.5 Style change behavior

Entry point: "Change Style" (`Stage5Assets.tsx:843-855,1464-1477`; dialog `StyleChangeWarningDialog.tsx:30-70`). The dialog's "current style" label is the literal "Style Capsule", not the capsule's name (`Stage5Assets.tsx:1467-1472`). The dialog counts active assets with images.

| Action | Effect on assets | Effect on style fields | Preserves |
|---|---|---|---|
| Mark Images as Outdated (`projectAssets.ts:1587-1625`) | `style_outdated = true` where `image_key_url` is set, on the active branch | Stage 5 style keys nulled, which clears the style lock (the stage row stays `locked`, H 1.8) | Images, attempts, `project_assets.visual_style_capsule_id`, locks, angle variants, location views |
| Clear All Images (`projectAssets.ts:1631-1665`) | `image_key_url = null`, `style_outdated = false` | Same | Attempts (still `is_selected`, so the carousel shows the old "Selected" image and it cannot be re-selected through the UI), storage objects, angle variants, location view images, locks |

Consequences, all from code:

- **Snapshot not updated.** Neither action writes `project_assets.visual_style_capsule_id` (INV-0028). Regenerate, edit, angle and location routes keep using the stored id (`projectAssets.ts:1244-1269,1471,2565,3403-3429`). An asset with a capsule id keeps that capsule after the Stage 5 style changes. An asset created under manual tone has a null id.
- **Null-id assets fail after a switch to capsule style.** For an asset whose id is null, generate-image reads the manual tone only. Stage 5 selecting a capsule clears the manual tone, so the job fails with "Visual Style Capsule or Manual Visual Tone is required" (`ImageGenerationService.ts:139-141`). The location-view route has the same gap (section 5.3, row 5d). Edit and angle routes fall back to the Stage 5 capsule (V2 5).
- **Stage 8 uses the current lock.** Stage 8 routes read the current Stage 5 lock (row 5f), so Stage 5 and Stage 8 images can use different capsules after a change (CAP-0087).
- **`style_outdated` is a flag only.** Cleared by a successful master job for that asset (`ImageGenerationService.ts:406-410`) and by clear-all. Not cleared by upload or attempt select. Not checked by lock-all, promote or any backend reader. Does not gate Stage 5 completion (`Stage5Assets.tsx:218`).
- **No downstream invalidation.** No other stage is marked outdated by a visual or writing style change. Writing capsule edits in the library have no invalidation (STATE-0024).

---

## 6. Inheritance and propagation

### 6.1 Project asset to scene instance (creation paths)

| Creation path | Trigger | `description_override` | `effective_description` | `image_key_url` | `status_tags` / `carry_forward` | `inherited_from` |
|---|---|---|---|---|---|---|
| Inherit, scene N > 1 | Auto-populate on Stage 8 mount (`Stage8VisualDefinition.tsx:240-272`) or "Inherit" button (`SceneAssetListPanel.tsx:455-472`) | Prior override, or the last confirmed transformation's `post_description` (`transformationEventService.ts:528-557`); null if prior `carry_forward = false` | `override ?? project_asset.description ?? ''` (`assetInheritanceService.ts:272`) | Prior `image_key_url ?? project image`, or transformation post image; project image if prior `carry_forward = false` (`:118,137,147`) | Copied, or the transformation's `post_status_tags` (always `[]` for UI-created events), `[]` if prior `carry_forward = false` | Prior instance id, always, even when resetting |
| Bootstrap, scene 1 | Same | Null | `project_asset.description ?? ''` | Project image; null for deferred (`:203`) | `[]`, `true` | Null |
| Populate from dependencies (R14) | Auto-populate | Null | `asset.description ?? ''` | **Not set** | `[]`, `true` | Null |
| AI detect (R2 then R3) | "Detect with AI" (`Stage8VisualDefinition.tsx:505-540`) | LLM `starting_description` if non-empty | Same, else project description (`sceneAssets.ts:223`) | **Not set** | LLM `status_tags_inherited`, `true` | Null |
| Manual add from library | AssetDrawer "Add" (`AssetDrawer.tsx:139-170,197-221`) | Null | Project description | **Not set** | `[]`, `true` | Null |
| Create new asset inline (R13) | "Create new asset" form (`SceneAssetListPanel.tsx:523-575`) | Typed text | Typed text | **Not set** | `[]`, `true` | Null |

Consequences (verified by reading the table's sources):

- Only inheritance and bootstrap copy an image. Every other path leaves `image_key_url` null, and the Stage 8 Proceed gate blocks until each instance has an image (`Stage8VisualDefinition.tsx:713-720`). Generation is the only other source.
- Inheritance is strictly N-1 by `scene_number` (`assetInheritanceService.ts:66-71`). An asset missing from N-1 is not inherited from N-2. The relevance prompt uses a wider "last appearance" lookup (`sceneAssetRelevanceService.ts:45-103`).
- If scene N > 1 has no prior scene row, `getPriorScene` returns null, bootstrap throws "Bootstrap only allowed for Scene 1" (`:73-76,179-181`), and the route returns 500.
- AI detect is all-or-nothing in practice. One asset already in the scene returns 409, `Promise.all` rejects, the user sees "AI detection failed" although others were created, and suggestions are not saved (`Stage8VisualDefinition.tsx:509-537`; INV-0045).

Ledger: INV-0036 (inherit N-1 only, reset when prior `carry_forward` is false), INV-0037 (copy at creation, no later propagation), CAP-0162 to CAP-0165.

### 6.2 Prior scene to next scene

Inherited once, at creation of the next scene's instance: `description_override`, `image_key_url`, `status_tags`, `carry_forward` (only when prior `carry_forward` is true), and the `inherited_from_instance_id` link (V6 4). If the prior instance has at least one confirmed transformation event, the last one by trigger `shot_order` supplies `description_override`, `status_tags` and, if set, `image_key_url` (`transformationEventService.ts:528-557`, `assetInheritanceService.ts:127-142`).

**Not inherited** (new-row defaults): attempts (a new instance starts with none; the first GET backfills one `generated` attempt from the copied URL), `use_master_as_is` (false), `selected_master_reference_*` (null), `modification_*` (0 or null), transformation events, shot-asset assignments, text versions, suggestions.

**Live reads of earlier scenes** (not stored in the instance): the reference chain (section 2.8) and the relevance prompt context. Neither writes the instance.

**Later edits to the prior instance do not propagate.** After the next scene inherits, its values stay as copied. The link `inherited_from_instance_id` is unchanged (`sceneAssets.ts:315-325`, inherit only when empty). Ledger: INV-0036, INV-0037.

**Prior instance deletion.** `inherited_from_instance_id` and `selected_master_reference_instance_id` are set null (`015:27`, `022:67-68`). The list badge flips from "Prior Scene" to "Master" (`SceneAssetListPanel.tsx:55-58`).

### 6.3 Project asset to global library (clone, match, sync, promote)

| Action | Route | Effect | Status |
|---|---|---|---|
| Clone (no match) | `POST /assets/clone-from-global` (`projectAssets.ts:1756-2041`) | Insert with `global_asset_id`, `source_version = global.version`, name, type, description (or override), image prompt from global. Capsule: Stage 5 lock, else global's. `source` not set (default `extracted`). Then either a master job with the global image as reference (if `regenerateImage` and a capsule exists), or `localizeAssetImage` copies the file into project storage and sets `image_key_url` with **no attempt row**. Localize failures are swallowed. | FUNCTIONAL, PARTIAL on source value (V5 6) |
| Match and clone | same route with `matchWithAssetId` (`AssetMatchModal.tsx:111-143`) | Updates the extracted row: `global_asset_id`, version, name by strategy (for example "Global (Project)"), description via `mergeDescriptions` (default `merge` makes an LLM call), `image_prompt = global || target`, capsule. No lock check. Localize overwrites the target's image with no attempt row. | FUNCTIONAL (merge path LLM-dependent) |
| Version status | `GET /assets/version-sync-status` (`projectAssets.ts:431-508`) | Outdated when `(source_version || 0) < global_assets.version`. Polled every 30 seconds (`AssetVersionSync.tsx:38-47`). Any PUT, upload or generation on the global asset bumps the version (`routes/assets.ts:237,389`). | FUNCTIONAL |
| Sync | `POST /assets/:assetId/sync-from-global` (`projectAssets.ts:2047-2280`) | Rejected if locked. Re-localizes the global image (always a new copy, because the URLs differ after any prior localize). Writes name, description, `image_prompt`, `image_key_url`, capsule (global's, or keeps project's), `source_version`, `last_synced_at`, **unconditionally, including fields in `overridden_fields`**. Then removes synced names from `overridden_fields`. The `image_key_url` write bypasses attempts. | FUNCTIONAL; `overridden_fields` is informational only (INV-0033) |
| Promote | `POST /assets/:assetId/promote` (`projectAssets.ts:2286-2350`) | Requires `image_key_url`. Inserts a `global_assets` row copying name, type (including extra_archetype), description, `image_prompt`, capsule, `promoted_from_project_id`. The image URL is the same project-storage URL and is not copied. The project asset is not linked back. Each click creates a duplicate (FACT-0032). | FUNCTIONAL |

`overridden_fields` is written by PUT and by clone, cleared by sync, and never prevents an overwrite (C5 in V5 15; INV-0033; FACT-0031). The 009 migration comment says the opposite.

### 6.4 What does not propagate

- Project asset description or name edits do not reach scene instances. `effective_description` is recomputed only on a later PUT of the instance that includes `descriptionOverride` (INV-0038). No staleness flag exists (section 6.5).
- Project asset image regeneration does not change instance `image_key_url`. It does change, live, the reference-chain item (a), the default generation reference when no `selected_master_reference_url` is set, and the use-master source (`sceneAssets.ts:1506-1518`, `ImageGenerationService.ts:241`). Attempts on the project asset are not read by instances.
- Project asset deletion cascades to instances, attempts, transformation events and shot assignments (`015:16`, `022:11`, `030:14`, `033:12`). Storage objects are not removed.
- Merge and split re-point instances to the survivor or variant. Instance descriptions and images are kept (`projectAssets.ts:777-873,1077-1110`).
- Stage 4 scene re-extraction keeps matched scenes and their IDs, so instances survive. Unmatched old scenes are deleted, cascading instances, attempts, events and suggestions (`projects.ts:~1378-1470`; cross-slice, H 6.3).
- Style change does not reach instances or their images (section 5.5).
- Transformation confirmation affects same-scene prompt and frame reads at read time. Later scenes see it only if they inherit afterwards (section 8.4).

### 6.5 Stale `effective_description`

- `effective_description` is a stored value (`015:34`). It is written on insert by every creation path (table in 6.1) and on PUT only when the body contains the key `descriptionOverride` (`sceneAssets.ts:622-625`: `updates.descriptionOverride !== undefined` then `updates.descriptionOverride ?? baseDescription`).
- The version write-back for `description_override` (R33, R34) writes only `description_override` (`textFieldVersionService.ts:226-240`). The UI then calls PUT via `onVersionChange` (`VersionedTextarea.tsx:121-122,140-141`, `VisualStateEditorPanel.tsx:571-577`). Two requests per save. If the second fails, `effective_description` is stale (V6 5).
- An empty string is kept as empty (`??` does not coalesce `''`), so `effective_description = ''` is possible, for example after a bulk apply of an empty suggestion (V6 5, V6 11).
- Writes that bypass versions and `effective_description`: upload-modal accept writes `description_override` (`VisualStateEditorPanel.tsx:351-362`), tag-only PUTs, and some inherit paths (table 6.1).
- Downstream readers (prompt generation `promptGenerationService.ts:670-711`, frames, relevance, image generation `ImageGenerationService.ts:219`) read the stored value. No code recomputes it when the project asset changes.
- Ledger: STATE-0045 (PERSISTED, partly), INV-0038 (FUNCTIONAL), H section 3.3.

---

## 7. Status tags, carry-forward, and the meanings of "locked"

### 7.1 Tags

- Free-form lowercase strings in `scene_asset_instances.status_tags TEXT[]` (`015:23`). Editor `StatusTagsEditor.tsx:47-70` trims, lowercases and dedupes. Autocomplete comes from `COMMON_STATUS_TAGS` (18 tags in 4 categories, `statusTags.ts:21-47`). `projectTags` prop exists but `VisualStateEditorPanel` never passes it (`:769-775`).
- Each add or remove issues a PUT immediately with a reason (`VisualStateEditorPanel.tsx:287-297`).
- Tags reach prompts in three places: scene asset image prompt `". Visual modifiers: <tags>."` (`ImageGenerationService.ts:219-223`); prompt generation renders `[tag1, tag2]` per asset (`promptGenerationService.ts:693`); context manager and continuity composition read them (`contextManager.ts:246`, `continuityCompositionService.ts:528`).
- Transformation post images also append `post_status_tags` (`sceneAssets.ts:2015`).
- `statusTags.ts` is used only by Stage 8 components (`SceneAssetListPanel.tsx`, `StatusTagsEditor.tsx`, `TagCarryForwardPrompt.tsx`).

### 7.2 Carry-forward

- `carry_forward` (default true) is a switch in the tag editor that writes PUT `carryForward` (`VisualStateEditorPanel.tsx:299-309`). It matters only when the next scene is created by inheritance (section 6.2). It does not affect the current instance.
- **Tag carry-forward prompt.** On Stage 8 load, if the current scene has inherited instances with non-empty tags, and `localStorage['tag-prompt-<sceneId>']` is unset, a dialog lists those tags (already copied) and lets the user keep all, none or a subset. Confirm sends PUT `statusTags` per instance with reasons, and sets the localStorage key. The key is per browser, not server-side (`Stage8VisualDefinition.tsx:366-410,863-873`; `TagCarryForwardPrompt.tsx`; STATE-0053, browser-only).

### 7.3 The five meanings of "locked" and "confirmed" in this slice

| # | Notion | Where | Effect |
|---|---|---|---|
| 1 | Scene stage lock for Stage 8 | `scenes.stage_locks['8']` (`Stage8VisualDefinition.tsx:137-151`, `ProjectView.tsx:589-600`) | Suppresses auto-populate (`:243`) and shows the locked header. No lock prop reaches `SceneAssetListPanel` or `VisualStateEditorPanel` (`:780-838`). No backend route checks stage locks. `handleLockAndProceed` is unreachable (`:759-771`). |
| 2 | "Lock Asset" button | Appends the literal tag `'locked'` to `status_tags` (`VisualStateEditorPanel.tsx:311-324`) | Disables description, Infer, Add Transformation, and the tag editor including carry-forward (`:433,581,590,724,774`; `StatusTagsEditor.tsx:136,150,230`). No unlock control. Not blocked: Generate, Upload, master reference select, use-master, Remove, bulk "Update from Context" (which overwrites the override and ignores the tag). The string flows into image prompts and carries forward. |
| 3 | List badge "locked" | Computed: `image_key_url` is set AND `modification_count` is 0 or null (`SceneAssetListPanel.tsx:60-64`) | Unrelated to 1 or 2. Because the trigger counts every UPDATE (image completion, attempt select), the badge effectively shows only instances whose image came from inheritance or bootstrap and were never updated. An unused `reviewStatus()` (`Stage8VisualDefinition.tsx:69-74`) keys off the `'locked'` tag (DEAD, CONTRADICTED with the badge). |
| 4 | `project_assets.locked` | Stage 5 domain | Filters relevance candidates (`sceneAssetRelevanceService.ts:131-135`) and bootstrap (`assetInheritanceService.ts:188`). Stage 8 create-with-project-asset inserts `locked: true` (`sceneAssets.ts:933`). |
| 5 | `transformation_events.confirmed` | Event row | Only confirmed events drive resolution, inheritance, the reference chain and Stage 10 (section 8). No un-confirm route (STATE-0050). |

CONTRADICTED: three different "locked" notions appear in the list and editor (V6 17). Ledger: STATE-0049 (PARTIAL, PERSISTED, untested).

---

## 8. Transformation events

### 8.1 Model and resolution rule

A transformation changes one scene asset instance within one scene, anchored to shots of that scene.

- Table `transformation_events` (migration 030): `scene_asset_instance_id` (cascade), `scene_id` (cascade), `trigger_shot_id` (cascade), `transformation_type` CHECK (`instant`, `gradual`, `within_shot`), `completion_shot_id` (SET NULL), `pre_description` and `post_description` (NOT NULL), `transformation_narrative`, `pre_image_key_url`, `post_image_key_url`, `pre_status_tags`, `post_status_tags` (default `{}`), `detected_by` CHECK (`stage7_extraction`, `stage8_relevance`, `manual`), `confirmed` (default false), `confirmed_at`.
- `shots.transformation_flags JSONB` (migration 030:135). Written by Stage 7 extraction only (section 8.3).
- Types, per `resolveOverridesForShot` (`transformationEventService.ts:107-201`), considering only confirmed events, sorted by trigger `shot_order`, cumulative:
  - `instant`: pre state until the trigger shot, post state from the trigger shot.
  - `within_shot`: at the trigger shot, the asset is still pre but flagged `is_transforming`, with narrative and post data. Post state from the next shot.
  - `gradual`: pre state until the completion shot, post at and after it, nothing intermediate. With `completion_shot_id` null (for example after the shot was deleted), it never reaches post.
- An override is emitted only when the description or image differs from instance defaults, or `is_transforming` is set (V6 8.1).
- Tested: `transformationEvents.test.ts` covers the resolver (instant, within_shot, gradual, stacking, unconfirmed ignored, multi-asset, shot-order fallback), TESTED.

### 8.2 Creation paths

| Path | Mechanism | Status |
|---|---|---|
| Manual "Add Transformation" | `AddTransformationDialog.tsx` (rendered at `VisualStateEditorPanel.tsx:719-728`, disabled when the asset has the `'locked'` tag). Changing trigger or type calls the AI prefill (R29, AI-5) unless both fields were user-edited (`AddTransformationDialog.tsx:164-189`). Submit requires trigger and post description, and completion for gradual (`:199-213`). Backend inserts `confirmed = false`, `detected_by = 'manual'` (`transformationEventService.ts:237-252`). If `pre_description` is empty, the backend uses the instance's effective description (`:239-248`). | FUNCTIONAL, PERSISTED. The handler's dependency list omits `editedDescription` (`VisualStateEditorPanel.tsx:253-275`), so the captured value can be stale (V6 8.2). |
| Convert duplicate to transformation | `ConvertToTransformationDialog`: pick base asset, prefill from the absorbed instance's shot assignments (1 shot gives `instant`, more gives `gradual` first to last; `transformationEventService.ts:430-464`), create event, set `post_image_key_url` from the absorbed image, delete the absorbed instance (cascades its attempts, events and assignments), optional "Defer from project" (`ConvertToTransformationDialog.tsx:79-159`) | FUNCTIONAL, PERSISTED. Destructive for the absorbed instance. Untested. |
| Automatic detection | **None creates events.** See 8.3. | DEAD path (no writer for `stage7_extraction` or `stage8_relevance`, grep). |

### 8.3 Confirm, edit, post description, post image

- **Confirm** (R26, `sceneAssets.ts:1871-1880`): requires non-empty local `postDesc` (`TransformationEventCard.tsx:255-262`), sets `confirmed = true, confirmed_at`. Irreversible from the UI. Post description stays editable after confirm (STATE-0050, INV-0041).
- **Card state**: `postDesc` and `narrative` are initialized once from props (`TransformationEventCard.tsx:49-50`, no sync effect). Blur writes PUT if changed (`:62-71`). "Generate with AI" (unconfirmed only) calls R28 (AI-4), which overwrites and persists `post_description` (`transformationEventService.ts:327-374`). The card keeps the old local value, and the next blur can write it back over the AI result (V6 8.3).
- **Post image** (R30, `sceneAssets.ts:1944-2040`): requires `post_description`. Reference = client reference (current post image when "Use as ref" is on), else instance `image_key_url`, else project image. Prompt = `post_description` plus `". Visual modifiers: <post_status_tags>."` (`sceneAssets.ts:2015`). Completion writes `transformation_events.post_image_key_url` (`ImageGenerationService.ts:428-440`). The frontend also PUTs the same URL after polling (`VisualStateEditorPanel.tsx:211-219`), a duplicated write. No attempt history for transformation images.
- **Use existing image** (R31, `sceneAssets.ts:2050-2101`): lists confirmed post images of the same project asset across scenes, then PUT.
- **Stage 8 gate**: blocks Proceed if any event is unconfirmed, or any confirmed event has a blank post description (`Stage8VisualDefinition.tsx:313-320,721-734`). Events are fetched under `['transformation-events', projectId, sceneId]`. The editor's local list does not invalidate that key on confirm, add or delete, so the gate count can be stale until a refetch (V6 8.3).
- **Effects on same-scene shots**: frame and video prompt generation fetch confirmed events and apply `resolveOverridesForShot` per shot (`routes/frames.ts:600-617`, `promptGenerationService.ts:1075`, `routes/projects.ts:3788-3800`). Stage 10 reads confirmed events for reference images (`frames.ts:1719-1727`, `frameGenerationService.ts:231-240,586`).
- **Effects on later scenes**: only through inheritance at instance creation (section 6.2) and live reads (reference chain, picker). If the asset is already instantiated in scene N+1, confirming an event in scene N changes nothing there.

### 8.4 Wired and not wired

| Field or behavior | Writers | Readers | Status |
|---|---|---|---|
| `shots.transformation_flags` | Stage 7 shot extraction writes JSON (`projects.ts:1928`), from LLM output (`shotExtractionService.ts:257,282,374-389`) | None. The API returns it through `select('*')` (`projects.ts:1559`). | PERSISTED, not consumed. R1b C18: "Nothing reads it" confirmed. The LLM detection itself runs automatically. |
| Conversion from flags to `transformation_events` | None | None | **Not wired** (R1b C18). Ledger FACT-0073 states "No automatic transformation detection is wired"; R1b narrows that to the conversion step (section 16). |
| `detected_by` non-manual values | None produce them (grep of `stage7_extraction` and `stage8_relevance` outside declarations finds nothing) | `TransformationEventCard.tsx:91-93` "AI Detected" label | DEAD branch. The label cannot appear. |
| `pre_image_key_url` | None in the UI (`sceneAssetService` type only) | Not read by resolver | ORPHANED field |
| `post_status_tags` | None from UI | Inheritance copies it into the next scene's tags (`assetInheritanceService.ts:127-142`) | Inherited tags become `[]` for any transformation created in the UI (V6 8.4) |
| `pre_status_tags` | None | None | ORPHANED field |
| Post image isolation suffix | `transformation_post` is not passed to `injectBackgroundContext` | n/a | Not applied (section 16) |

Ledger: ENTITY-0020 (FUNCTIONAL, PERSISTED), STATE-0050, INV-0041, CAP-0185 to CAP-0192. CAP-0192 was corrected by R1b (section 16).

---

## 9. Visual state of a scene asset instance

The "visual state" of an asset in a scene is the set of instance fields that decide what the scene shows and what prompts and references say. Each field has a single owner below.

| Field | Meaning | Set by | Read by |
|---|---|---|---|
| `description_override` | Scene-specific text | PUT (`sceneAssets.ts:630-632`), create (`:230`), create-with-asset (`:952`), inherit copy, version write-back (`textFieldVersionService.ts:226-240`) | `effective_description` on PUT |
| `effective_description` | Stored text that generation and prompts read | Insert paths (6.1); PUT only with `descriptionOverride` (`sceneAssets.ts:622-625`) | Image prompt (`ImageGenerationService.ts:219`), prompt generation (`promptGenerationService.ts:670-711`), relevance, frames |
| `image_key_url` | Current scene image | Inherit or bootstrap copy, PUT (`imageKeyUrl`, no UI caller), attempt select (`sceneAssetAttemptsService.ts:105-108`), use-master (`sceneAssets.ts:1326-1332`), upload (`:1748-1758`), job completion (`ImageGenerationService.ts:484-488`) | Gates (Proceed), frames, prompt generation, reference chain |
| `status_tags` | Modifiers and "locked" sentinel | Editor PUT, inherit copy, AI detect (`status_tags_inherited`), bulk apply | Prompts (section 7.1) |
| `carry_forward` | Whether the next scene inherits this instance's tags and override | Editor switch | Inherit (`assetInheritanceService.ts:114`) and UI |
| `use_master_as_is` | Flag: image is the master copy | Use-master (true), upload and master-reference select (false), toggle-off | Editor disables; generation not blocked |
| `selected_master_reference_*` | Chosen master for generation and prompts | Select-master (`sceneAssets.ts:1628-1638`) | Generation default reference, prompt generation, `contextManager.ts:248`, `continuityCompositionService.ts:530` |
| Attempts | Image history with one selected | Generation, upload, master copy, select, backfill | Carousel only, plus mirror to `image_key_url` |
| Transformation events (per shot) | Resolved pre and post state | Event routes | `resolveOverridesForShot`, Stage 8, Stage 10 |
| Shot assignments | Presence per shot (enters, exits, passes_through, throughout) | Stage 8 and Stage 9 panels, AssetDrawer, split and merge | Presence-aware reference manifests (section 11.8) |

---

## 10. Location identity, coverage and resolution

### 10.1 Identity fields

Stored on `shots` (migration 039 unless noted):

- `location_asset_id` (FK `project_assets`, SET NULL on delete). The canonical location.
- `location_match_confidence` NUMERIC(4,3), CHECK between 0 and 1.
- `location_match_source` CHECK: `manual`, `resolver_exact`, `resolver_alias`, `resolver_fuzzy`, `stage7_inferred`, `legacy_backfill`, `camera_direction_parent`. The value `ambiguous` is not allowed, though a metric in `projects.ts:945` reads it (section 17).
- `location_match_notes` (TEXT).
- `camera_direction_id` (FK `location_views`, SET NULL), with `camera_distance`, `camera_height`, `camera_movement` (migration 038).

Audit table `location_match_events` (039:80-150) receives one row per resolver run. It is **write-only**: the only statement is an insert in `recordMatchEvent` (`locationResolverService.ts:483-492`). Calibration use is UNKNOWN (FACT-0090).

`project_assets.location_aliases` (JSONB array, migration 039) is read by the resolver. Written only by PUT (`projectAssets.ts:628-638`). No UI writes it (section 2.1). Alias editing has no UI (V7 2.6).

### 10.2 Deterministic resolver (`locationResolverService.ts`)

Constants (verbatim, `:72-74`): `MIN_CANDIDATE_CONFIDENCE = 0.56`, `DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE = 0.72`, `AMBIGUITY_CONFIDENCE_DELTA = 0.06`. Ledger: FACT-0079 (TESTED).

- Normalization (`:116-132`): NFKD, strip diacritics, lowercase, remove "int" and "ext" forms, quotes, non-alphanumerics, and screenplay qualifiers (`int, ext, interior, exterior, day, night, dawn, dusk, morning, afternoon, evening, later, continuous, same, moments, flashback, present`). Stop words are also removed (`the, a, an, and, or, of, to, in, on, at, with, from, near, inside, outside`).
- Order (`resolveShotLocation`, `:352-439`). (1) If `cameraDirectionId` maps to a view, the parent location is used: confidence 1, source `camera_direction_parent`, never ambiguous. (2) Otherwise, for each text input (setting, then scene expected location) and each location asset (`candidateForText`, `:223-299`): exact normalized name 0.99 (`resolver_exact`); name as a whole phrase 0.93 for multi-word or 0.88 for single-word names (`resolver_exact`); alias exact 0.97 or alias phrase 0.90 or 0.84 (`resolver_alias`); fuzzy token overlap (`scoreTokenOverlap`, `:206-221`) at token similarity 0.84 or more, coverage of asset tokens at least 0.66, score `0.55 + coverage*0.26 + jaccard*0.16 - oneTokenPenalty` (0.06 for a one-token asset against a text of more than three tokens), kept at 0.56 or more (`resolver_fuzzy`). (3) Best per asset is kept, sorted descending. `isAmbiguous` is true when the top two are within 0.06.
- `shouldApplyResolution` (`:441-446`): applied only when a location exists, the result is not ambiguous, and confidence is at least 0.72.
- `toShotLocationPatch` (`:448-471`): writes `location_asset_id` only if applied, otherwise **null**. It always writes confidence, source (or `sourceOverride` when applied) and notes (reason plus top three candidates, truncated to 500 characters).

Where the resolver runs (`applyShotLocationResolution`, `projects.ts:225-256`):

| Trigger | Line | Preserves manual? | Persists |
|---|---|---|---|
| Shot extraction (Stage 7) | `projects.ts:1784-1962` (`:1931`) | n/a, new rows | Insert, event row |
| PUT shot when `setting` or `camera_direction_id` is in the body and existing source is not `manual` | `:2432-2499` | Implicitly skips manual | Update, event row |
| POST resolve-locations | `:2043-2177` | Body `preserveManual`, default true | Only changed rows, if `apply`, event rows |
| PUT camera-direction with `clear: true`, source not manual | `:2222-2240` | Implicit | Update, no event |
| Split | `:2591` | n/a | Insert, event |
| Merge | `:2732` | n/a | Insert, event |
| CLI backfill | `backend/scripts/backfill-shot-locations.ts:150-230` | Skips manual (counter `skippedManual`) | With `--apply`, `legacy_backfill` or `camera_direction_parent` |

Stage 7 extraction also resolves the scene location and passes existing direction views to the AI extractor. It then inserts new directions as `location_views` with `source = stage7_inferred`, `camera_distance = wide`, `camera_height = eye_level` for directions and `overhead` otherwise, and `is_primary` for the first direction if none exists (`projects.ts:1786-1903`). Each shot's `camera_direction_id` is mapped by direction **name** (`:1923-1925`).

### 10.3 Two location-state classifiers (CONTRADICTED, both live)

| | Classifier A: route | Classifier B: composition |
|---|---|---|
| Code | `buildShotLocationState` (`projects.ts:79-139`) | `locationStateFromShot` (`continuityCompositionService.ts:218-254`) |
| Used by | Every shot list response, Stage 7 display, lock warnings | Stage 9 and Stage 10 continuity preview |
| Logic | If `location_asset_id` is set: `resolved` when source is `manual` or confidence is at least **0.72**, else `suggested`. If unset: `unresolved` when source is `manual`; `ambiguous` when the live resolver is ambiguous; `suggested` when the resolver finds a candidate; else `unresolved`. | If `location_asset_id` is set: `suggested` when confidence is below **0.8**, else `resolved`. Never `ambiguous`. `candidates: []`. |
| Re-runs the resolver | Yes, on every GET, for candidates | No |
| Confirmed | R1a C07: CONFIRMED. Route threshold 0.72 and `ambiguous` return; composition threshold 0.8 and no `ambiguous`. | |

A shot auto-applied at confidence 0.72 to 0.799 (for example a fuzzy match) is `resolved` in Stage 7 and `suggested` in Stage 9 (V7 3.4). The scene-mismatch count in `summarizeShotLocationStates` (`:141-158`) feeds the Stage 7 lock warning "Location continuity needs review: N unresolved, N ambiguous, N scene-location mismatch" (`projects.ts:173-188,2930-2939`). The warning is returned as a 409 unless `force` is sent (V8 5; `projects.ts:2952-2959`). The ledger entry INV-0053 says location warnings never block the lock. Section 17 records the conflict.

### 10.4 Who may overwrite a location

- **Manual assign** (`PUT .../shots/:shotId/location`, `projects.ts:2316-2396`): verifies that the asset is a location on the active branch. Writes `{location_asset_id, confidence: 1, source: 'manual', notes: 'Manual assignment to "X".'}`. Clear writes `{null, null, 'manual', 'Manual location assignment cleared.'}`. Because source stays `manual`, later setting edits, resolver re-runs and camera-direction clears do not re-resolve it (INV-0048, sticky). Camera direction is not changed by a manual location assignment.
- **Non-manual shots**: a setting or direction edit re-resolves and overwrites all four location fields. If the result is not applied, `location_asset_id` becomes **null** (an earlier auto-link is erased; FACT-0081).
- **`resolve-locations` with `preserveManual: false`** can overwrite manual links. The Stage 7 UI always sends `true` (`Stage7ShotList.tsx:659-662`). Only rows whose `location_asset_id` changed are updated; confidence and notes of unchanged rows are not refreshed (`projects.ts:2110-2112`).
- **Camera direction** (`PUT .../shots/:shotId/camera-direction`, `projects.ts:2180-2313`): validates the view exists and has `view_type = 'direction'`, and that the parent location is on the active branch. Returns 409 when the shot is manual to a different location. If the parent differs from the current location, sets `{location_asset_id: parent, confidence 1, source 'camera_direction_parent'}` (INV-0049). The generic PUT accepts `camera_direction_id` without checking that it is a direction in the branch (`projects.ts:2421-2426`).
- **Split and merge** rows omit `camera_direction_id` and re-resolve from text. Manual location and direction assignments are lost (`projects.ts:2578-2590,2717-2730`).
- **Deletion**: deleting a `location_views` row nulls `shots.camera_direction_id` and leaves `location_asset_id` and source unchanged. Deleting a location asset nulls `location_asset_id` and leaves source, confidence and notes.

### 10.5 Coverage (Stage 8, `locationCoverageService.ts`)

Call chain: `Stage8VisualDefinition.tsx:841` → `LocationCoveragePanel` → `GET /api/projects/:id/scenes/:sceneId/location-coverage?mode=` (`projects.ts:1585-1708`) → `locationCoverageService.buildCoverage`. Nothing is persisted. The `mode` comes from the query string, not from `projects.continuity_mode` (`LocationCoveragePanel.tsx:126-144`).

Per-shot states (`:291-339`):

| State | Condition | Severity |
|---|---|---|
| `unassigned_direction` (unresolved shots) | No canonical location, or the location is not in the relevant set. Notice "This shot has no canonical linked location yet." | warning |
| `matched_view` | Assigned view belongs to this location and has an image | good |
| `missing_view_image` | Assigned view has no image | advisory or warning (advanced) |
| `fallback_view` | No assigned view; a fallback exists (primary direction with image, else establishing with image, else any direction with image), or a location image exists | advisory or warning (advanced) |
| `direction_location_mismatch` | Assigned view from another location | **UNREACHABLE**: views are pre-grouped by `project_asset_id`, so the assigned view is `null` and the shot falls into `fallback_view` (V7 4.2). |
| `unassigned_direction` (no reference at all) | Nothing usable | |

`locationImageUrl` = scene instance image, else the master image. Strength (`:197-212`): no shots gives `usable` when a reference exists, otherwise `missing`. All shots matched gives `strong`. No reference gives `missing`. Missing images or mismatches give `weak`. Fallbacks give `usable` in basic mode and `weak` in advanced mode. Response strength is `weak` when any shot is unresolved (`:214-220`).

`availableRepairActions` is computed by the service and never read by the panel (V7 4.3). The panel decides buttons on its own (`LocationCoveragePanel.tsx:801-840`).

Panel actions and their routes are listed in V7 4.4: direction select (`PUT camera-direction`), generate view image (sequential loop), create default views, add direction (creates a `stage7_inferred` view named `direction_{n}`, which is a user action labeled as inferred), use approved frame as view (`establishViewFromFrame` without `frameId`).

**"Use approved frame as view"** requires `shot.startFrame.status === 'approved'` (`LocationCoveragePanel.tsx:190,325`). The `approved` status is written only by `approveFrame` (`frameGenerationService.ts:939-950`), reachable through `PUT .../frames/:id/approve` (`frames.ts:315`). No frontend code calls approve (section 15). In practice the panel's action is available only to frames approved over HTTP.

### 10.6 Location reference selection for generation

`matchShotToLocationView` (`promptGenerationService.ts:239-290`): the assigned direction if it is among this location's directions, otherwise a score (height +2, distance +1, alias word of 3 or more characters in action or setting +3), otherwise the primary or first direction.

Reference strategy (`promptGenerationService.ts:370-439`):

| Value | Condition |
|---|---|
| `matched_direction` | Has assigned direction and it has an image |
| `direction_missing_image` | Has assigned direction, no image |
| `fallback_primary_direction` | No assigned direction, matched view has an image |
| `fallback_establishing` | Establishing view has an image |
| `fallback_asset` | Asset image or master exists |
| `text_only` | None |

Quirk: `hasAssigned` is `!!shot.camera_direction_id`. If that id belongs to another location, the scored view is labeled `location_direction_main` with the reason "Using assigned direction view ... as the main location reference" (mislabel; reachable after a manual location change that leaves the old direction id; V7 5.3).

---

## 11. Frame and shot continuity engine

### 11.1 Five mechanisms

| # | Mechanism | Unit | Computed where | Persisted | AI |
|---|---|---|---|---|---|
| 1 | Scene continuity risk (`safe`, `risky`, `broken`) | Scene | `continuityRiskAnalyzer.ts:59-126`, in `GET /api/projects/:id/scenes` | No | No |
| 2 | Start continuity mode (`none`, `match`, `camera_change`) | Shot | `determineContinuityLink` (`promptGenerationService.ts:1014-1045`), written at `projects.ts:3855-3856` | Yes, `shots.start_continuity` (031) | No. The name `ai_start_continuity` is misleading; the rule is deterministic. |
| 3 | Frame links (`match`, `reference`) | Frame to frame | `frames.ts` copy, batch and add-as-reference routes | Yes (034, 035) | Indirect (reference link feeds the camera-change path) |
| 4 | Continuity base (reuse or edit base) | Shot | `continuityBaseService.ts` ranking; selection PUT (`frames.ts:1574-1682`); consumption `frameGenerationService.fetchShotReferenceImageContext` (`:626-709`) | Selection yes (`shots.selected_continuity_base_frame_id`, 040). Candidates no. | Feeds the image prompt through `buildReuseEditPrompt` (`:542-554`) |
| 5 | Location identity and coverage | Shot and location | Sections 10.2 to 10.5 | Assignment yes; coverage, preview and strength no | No |

Plus `projects.continuity_mode` (`basic` or `advanced`, migration 040), which changes coverage severities only when the client passes `?mode=` and gates strict validation in continuity metrics (`projects.ts:809-1004`; V1 owns the routes).

### 11.2 Start continuity: writers and rule

- `determineContinuityLink` (`promptGenerationService.ts:1014-1045`), verbatim order: first shot gives `none`. `continuity_flags` matching `/cut|jump|transition|time.?skip|new.?scene|later/i` gives `none`. A setting string that differs (lowercase, trimmed) gives `none`. Same `shotType` and `angle` from `parseCameraField` gives `match`. Otherwise `camera_change`.
- Stage 9 generate-prompts **overwrites** `start_continuity` with the rule's value for every successfully generated shot (`projects.ts:3855-3856`), discarding any user choice. It also overwrites both reference-order arrays wholesale, which drops the continuity base and `type: 'continuity'` entries (V7 8). The selection column is kept and re-applied at generation.
- Single-shot regenerate passes a one-element array, so `previousShot` is null and the mode is forced to `none` (`promptGenerationService.ts:1085-1091`; V9 3.6).
- User writes: Stage 9 select (`PUT .../prompts`, `Stage9PromptSegmentation.tsx:755-796`). `none` clears `continuity_frame_prompt` (`projects.ts:3531-3534`). Add-as-reference (start) sets `camera_change`. Batch link sets `match`. Stage 10 Unlink sets `none` (for all shots, sequentially).
- `Stage10FrameGeneration.tsx:528-551` declares `updateContinuityMutation`, which is never mutated. DEAD (V7 8).

### 11.3 Frame links

| Type | Created by | Semantics | Propagation |
|---|---|---|---|
| `match` | Copy-frame (`frames.ts:2099-2103`), batch-link-copy (`:1949-1953`) | Target is a pixel copy of source (`image_url` and `storage_path` copied) | `propagateFrameLinks` (`frameGenerationService.ts:1545-1596`) copies the source's current URL to each match target. Called from regenerate (`frames.ts:408`), inpaint (`:468`), upload variant (`:1215`), and select-generation (`:1372`). **Not** called when an async job completes (`ImageGenerationService.ts:516-535`). For regenerate and inpaint, propagation runs right after job creation, so it copies the **old** image (H section 9 row r7; V9 6; UNKNOWN at runtime). Not recursive. |
| `reference` | Add-as-reference only (`frames.ts:1033-1043`) | One-shot. Consumed only when the target start frame's shot is `camera_change`: generation uses the source image, else the previous shot's end frame (`frameGenerationService.ts:404-428,1130-1172`). | None |

Breaking: explicit `DELETE .../frame-links/:linkId` (`frames.ts:2253-2284`, deletes by id only). Implicit delete of incoming links on regenerate (`:393`), upload (`:1140`), select-generation (`:1350`), and add-as-reference (`:1035`). Copy-frame's upsert replaces the target's link. `UNIQUE(target_frame_id)` (migration 034). Ledger: STATE-0058, INV-0046.

Route-level effects of the UI actions are listed in V7 7.3: "Pull match" and "Push match" use copy-frame; "Pull ref" and "Push ref" use add-as-reference (replacing a prior `type: 'continuity'` entry and setting `camera_change` on start); "Link All" uses batch-link-copy (overwrites existing start frames, approved ones included, with no confirmation, FACT-0088); "Unlink" sets `none` but **does not delete links**; the "break" badge deletes one link by id (no ownership check, section 17).

`chain-from-end-frame` (`frames.ts:877-930`) has no UI caller (ORPHANED).

### 11.4 Continuity base

**Candidate pool** (`continuityBaseService.ts:138-173`): start frames with status `approved` or `generated` and a non-null image, in the same branch, in any scene and shot order (including later shots). Excludes the requesting shot and any shot whose `location_asset_id` differs. A null location gives an empty list with no query. End frames are never candidates.

**Tiers** (verbatim confidences, `:205-230`):

| Tier | Condition | Confidence | Reason text (abridged) |
|---|---|---|---|
| `strong` | Both shots have the same camera direction | 0.95 | "Same canonical location and same camera direction." |
| `usable` | Neither shot has a direction | 0.7 | "Same location; neither shot has a pinned camera direction." |
| `usable` | Exactly one shot has a direction | 0.6 | "... adapt the angle in the prompt." or "... the candidate provides the angle." |
| `weak` | Both have directions and they differ | 0.4 | "Same location but the camera direction differs; treat composition as a delta." |
| (`missing`) | Declared but never produced | | |

Bonuses: +0.03 for the same scene (reason suffix "Same scene continuity."), +0.02 for approved. Capped at 1. Sort: tier, then confidence, then approved before generated, then most recent `approvedAt || generatedAt`. Truncated to `DEFAULT_CANDIDATE_LIMIT = 8`. Tests: `continuityBaseService.test.ts`, TESTED.

**Selection** (`PUT .../shots/:shotId/continuity-base`, `frames.ts:1574-1682`): ownership, scene on active branch, shot in scene. Clear (`clear` or `frameId: null`) strips `continuity_base_frame` entries, renumbers labels, and nulls the column. Select requires the frame to be among the top 8 for this shot, or returns 400 "Selected frame is not a valid continuity base for this shot" (INV-0047). It prepends the base entry (`continuityBaseReferenceEntry`, `:52-65`) and persists both the column and the array. Does not change `start_continuity`.

**Consumption** (`frameGenerationService.ts:626-709`): if the selected frame has an image and status `approved` or `generated`, role is `reuse_match` when the camera direction is the same, otherwise `reuse_edit`. The base URL is prepended if absent. If the base is missing, rejected or pending, it is silently ignored and the selection is kept (STATE-0057, PARTIAL). No location revalidation at generation (V7 6.4).

**Precedence** (bulk `:350-372`, single regenerate `:1018-1044`): the base overrides `start_continuity`, for start frames only. Bulk runs only when the start frame is `pending` or `rejected`. The prompt is `buildReuseEditPrompt` (`:542-554`), a paid image job with lineage `generated_from_frame_id = base` and role `reuse_match` or `reuse_edit`.

**UI mismatch.** The chooser shows "Fresh generation" when the persisted base has dropped out of the top 8 or no longer shares the location, although the column is still set and generation still uses the base (`Stage10FrameGeneration.tsx:77-182`; CONTRADICTED UI state, V7 6.3).

### 11.5 Start and end frame source order at generation

**Bulk** (`generateFrames`, `frameGenerationService.ts:342-495`), shot by shot in order. `previousEndFrameId` is the id of the previous shot's end frame, which is set only in the branch that runs when the shot requires an end frame and the request is not Control-start-only (`:455-491`).

1. Selected continuity base valid: reuse or edit job.
2. `start_continuity === 'match'` and `previousEndFrameId` set: copy the previous end frame's image to the start frame, status `generated`, role `match_copy`, no image job, zero cost. If the previous end has no image, fall back to a normal generation.
3. `camera_change` and `previousEndFrameId` set: take the reference link's source image, else the previous end image. Run `generateWithCameraChangeAnalysis` (vision, then LLM prompt, then image job, role `camera_change_ref`). If no image, fall back to normal generation.
4. Otherwise: normal generation with `shot.frame_prompt` and the persisted reference list. No lineage is written, so an earlier `generated_from_frame_id` remains (stale lineage; `:876-881`).

**Consequence** (V9 5 step 3, read in source): in **Control mode start-only** requests, `previousEndFrameId` is never assigned, so branches 2 and 3 do not run. Match and camera-change behavior in `generateFrames` therefore applies to Quick-mode bulk runs and to `regenerateFrame` (`frameGenerationService.ts:982-1245`, branches at `:1048-1123` for match). If a Quick-mode shot has `requires_end_frame = false`, `previousEndFrameId` keeps the earlier shot's value, so a later shot can link to a non-adjacent end frame.

**Cross-scene**: no automatic path uses the previous scene's end frame. Only manual "Pull match" or "Pull ref" buttons can target `adjacentSceneFrames.prevSceneEndFrame` (`FramePanel.tsx:705-726`).

**Regenerate** (`regenerateFrame`): order is (1) continuity base, (2) match copy from the previous shot's end frame (status `generated` or `approved`, zero-cost completed job row, `current_job_id` set), (3) throws if no `frame_prompt`, (4) camera change, (5) generic prompt with persisted refs; end frames add transformation swaps and the start image. A user-supplied `referenceImageUrl` is prepended with role `style`. Then `propagateFrameLinks(frameId)` runs immediately (`frames.ts:408`).

### 11.6 Camera-change analysis (A2)

`generateWithCameraChangeAnalysis` (`frameGenerationService.ts:720-840`): `analyzeReferenceFrame` (Gemini vision `gemini-2.5-flash`, 300 to 500 characters, `imageAnalysisService.ts:122-156`, no retry) → `loadSceneAssetsForContinuity` → `generateContinuityFramePrompt` with the analysis (LLM, temperature 0.7, 1200-character cap) → image job with references `[prev end (identity), ...shot refs]`. The prompt is written to `shots.continuity_frame_prompt` (`:820-827`) and the continuity entry's URL is refreshed in `reference_image_order` (`:829-839`). The stored `continuity_frame_prompt` is **never read by any generation path** (grep). Stage 9 and Stage 10 display it, and the UI help text says it is used instead of the frame prompt (`Stage9PromptSegmentation.tsx:884-891`). CONTRADICTED by code (V7 8; section 15).

Without `referenceFrameAnalysis`, the same LLM function is called from the Stage 9 "Regenerate" button (`Stage9PromptSegmentation.tsx:850-881`) and Stage 10 (`Stage10FrameGeneration.tsx:1476,1495`). Scene asset descriptions passed to this prompt are all scene assets, not shot-scoped (V7 9).

### 11.7 Reference lists that reach the provider

- Start frames: `shots.reference_image_order` as persisted, plus the base image if absent (`frameGenerationService.ts:698-700`). Entries carry `role` (style or identity), `label` and `type` (`continuity`, `user_upload`, or asset types).
- End frames: `shots.end_frame_reference_image_order` (non-empty means user override, `resolveEndFrameReferenceImages`, `:562-621`, which skips the within_shot transformation swap). Otherwise the transformation swap, then the start image prepended. Migration 039 adds the column (`:76-78`), with a comment that live code already read and wrote it before any migration created it (V7 2.1).
- Writers of both arrays: Stage 9 generate-prompts (wholesale overwrite), upload-frame-image (`usage = reference` appends `{label: 'User Upload', type: 'user_upload'}`, `frames.ts:1219-1236`), PUT reference-images (`frames.ts:1498-1568`, stores verbatim; for start frames returns 400 if a base entry does not match the selected id, and clears the base selection when the payload omits it), camera-change URL refresh.
- Replacement from "available references" (`frames.ts:1688-1808`) swaps only the URL and keeps the entry id and role. The popover matches options by `assetName.toUpperCase()`. Continuity entries never match, so their popover spins indefinitely (FACT-0087, CAP-0213).
- Available references returns, per scene asset instance: scene instance image, master image if different, confirmed transformation post images, and all angle variant images (no status filter). It excludes location views, frames and establishing images. `shotId` is unused (V7 7.4).

### 11.8 Composition, preview and generation package

`buildGenerationPackage` (`continuityCompositionService.ts:611-696`) produces, per shot: a scoped asset set, angle and location matches, a manifest, a continuity base entry, a generation mode, risk notices, strength, and several instruction strings.

- **Scope** (`promptGenerationService.ts:344-363`): location assets are kept only when `project_asset.id === shot.location_asset_id`. No location gives no location assets at all. Non-location assets are filtered by shot assignments when any exist.
- **Manifests**: with assignments, `buildFrameReferenceManifests` (`:605-611`) gives presence-aware start and end lists. Throughout gives both. Enters gives end only. Exits gives start only. Passes-through gives neither. Locations always get both. Without assignments, `buildNumberedImageManifest` lists location, character, prop, with roles `location_direction_main`, `location_establishing_context`, `location_asset_fallback`, and `identity` or `style` as applicable.
- **Continuity base entry**: prepended with id `continuity-base-<frameId>`, role `continuity_base_frame`, reason "... Use this approved frame or generated frame as the visual base" (`:288-320`).
- **Generation mode** (`:256-264`): base gives `reuse_edit`, `start_continuity` match gives `match_copy`, camera change gives `camera_change`, else `fresh`.
- **Risk notices** (`:439-466`): "This shot has no canonical linked location." / "The linked location is not available in this scene asset set." / "No usable location image will be attached for generation." / "No camera direction is assigned; location continuity will rely on fallback adaptation." / "Assigned direction view is missing an image."
- **Strength** (`:468-487`): with a base, strong with no risks stays strong, otherwise usable, weak stays weak. Without a base: no location gives `missing`; no matched location asset gives `missing`; no location in manifest gives `weak`; a `location_direction_main` role gives `strong` with no risks, else `usable`; a fallback role gives `usable`; otherwise `weak`.
- **Unused outputs.** `framePromptInstructions`, `continuityPromptInstructions`, `providerReadyReferences`, `persistedStartFrameManifest` and `persistedEndFrameManifest` have no consumers outside the service and its tests (grep over `src` and `backend/src`). They do not reach a prompt or provider (FACT-0086).

**Preview versus generation (CONTRADICTED).** Actual references are the persisted `reference_image_order` (plus the base). The preview recomputes from current DB state. Divergence sources (V7 5.4):

- Generate-prompts uses its own asset loader (`projects.ts:3622-3727`), duplicating `loadSceneAssetsForContinuity`. Its `location_views` query is **unordered**, which can change which view `directions[0]` picks. It also applies transformation overrides that the preview does not.
- Any view, assignment or location change after prompt generation changes the preview but not the persisted order.
- User edits in Stage 10 are not reflected in the preview.
- The "parity" tests feed `persistedStartFrameManifest` in as the database value, so parity holds by construction (`continuityCompositionService.test.ts:186-318`).

### 11.9 Scene continuity risk (Stage 6)

`continuityRiskAnalyzer.ts:50-126`, four rules in priority order:

1. Scene 1 is always `safe`.
2. A prior scene whose status is not `video_complete` makes this scene `risky`.
3. If the newest stage 1 to 4 `stage_states.created_at` is later than `scene.updated_at`, the scene is `broken`.
4. Scene status `continuity_broken` or `outdated` is `broken`.

Only `videoGenerationService.ts:525-530` sets `video_complete`, so every scene after an unfinished scene is `risky`, and rules 3 and 4 are reachable only after the prior scene's videos complete (V7 10). Computed per request (not persisted). Imported with an extensionless path (`projects.ts:1093`), which may fail under compiled Node ESM (UNKNOWN; works under `tsx`). Tested: `continuityRiskAnalyzer.test.ts`, TESTED.

### 11.10 Other continuity state

- Frame generations are the `image_generation_jobs` rows with the same `shot_id` and `job_type`, status `completed` (`frames.ts:1282-1288`). The selected one is `frames.current_job_id` (V9 4). Jobs are not linked to frames by id.
- `generated_from_frame_id` and `continuity_base_role` (migration 040) record lineage. `frames.promoted_to_view_id` links a promoted frame to a location view. Writers are listed in V7 2.2 and section 14.

## 12. Manual versus AI-derived

| Item | Manual (user action or deterministic code) | AI-derived (LLM or vision) | Notes |
|---|---|---|---|
| Asset list (Stage 5) | Manual add, create, merge, split, promote, clone | Extraction (names, types, scenes from deterministic aggregation; the LLM writes descriptions only) | Section 3 |
| Asset description | Typed, PUT, version edits | Extract distill (Pass 2), merge (`mergeDescriptions`), analyze-image extraction, upload-modal suggestion | Distill writes the initial description; the user accepts or edits |
| Asset image | Upload, select attempt, Accept | Generate, regenerate, edit, remove background, angle variants, location view generation | Edit results are selected before Accept (INV-0032) |
| Style capsule choice | Selection (Stage 1 and Stage 5), manual tone | None | Snapshot per asset (section 5.2) |
| Scene instance membership | Manual add, create, remove | AI relevance (`new_assets_required` suggestions; instances created by the client after the LLM returns) | Section 6.1 |
| Scene description | Typed, versions | Infer from story context (AI-2), bulk (AI-3), inherit copy, relevance `starting_description` | Accept required (section 4.7, 7) |
| Status tags | Manual; carry-forward switch | AI relevance `status_tags_inherited`; story context suggested tags (union on accept) | `locked` is manual only |
| Transformation events | Add (manual), convert, confirm, edit | Post description (AI-4), prefill (AI-5), post image (AI-6c) | Automatic detection does not create events (section 8.4) |
| Shot location | Manual assign, clear (sticky) | Resolver (deterministic, no AI) and Stage 7 AI extraction proposing new directions | `camera_direction_parent` is deterministic |
| Location views | Create, edit, upload, delete, primary star | Stage 7 inferred directions (AI extraction); AI image generation; suggest defaults (heuristic) | Source labels `user`, `stage7_inferred`, `established` |
| Continuity start mode | Stage 9 select, Unlink, add-as-reference, batch link | Default from deterministic rule | "AI" in column names is misleading (section 11.2) |
| Continuity base | Use, Fresh | Ranking is deterministic | Section 11.4 |
| Frame links | Copy, batch, add-as-reference, break | None | Section 11.3 |
| Continuity prompt | Regenerate button | LLM recomposition (A1, A2) with vision (A3) | Stored, not used by generation |
| Frame prompt | Typed edits, correction (LLM), edited prompt | Generate prompts (LLM) | Doc 09 (AI calls and prompts) |

---

## 13. What regenerates and what stays stable

| Operation | Regenerates or overwrites | Stays stable | Notes |
|---|---|---|---|
| Stage 5 extract-confirm (re-run) | Inserts a new set of `project_assets` (no dedupe) | Existing assets (duplicates) | Section 3.4 |
| Edit project asset description (PUT) | Description | Scene instances (no propagation), images, angle variants | Lock blocks text when locked |
| Generate or regenerate master image | `image_key_url`, selected attempt, `style_outdated = false` | Angle variants, location views, scene instances | Style is the asset snapshot |
| Edit (upload modal) | Selected attempt and `image_key_url` immediately | Description until Accept | INV-0032 |
| Change Style (mark outdated) | `style_outdated` flag and Stage 5 style keys | Images, asset capsule id | Section 5.5 |
| Change Style (clear all) | `image_key_url` null | Attempts (still selected), storage | Section 5.5 |
| Sync from global | Name, description, prompt, image, capsule, and fields in `overridden_fields` | Lock state, scene instances | Overwrites user edits |
| Scene instance generate or edit | Selected attempt, `image_key_url` | `effective_description`, tags, use-master flag | Bulk ignores use-master |
| Use master as-is | `image_key_url`, master attempt, flag | Description (blocked in editor) | Editor blocks some actions |
| Transformation confirm | Same-scene prompts and frames at read time | Later scenes already instantiated | Section 8.3 |
| Shot edit (setting or direction) | Location fields, unless manual | Prompts, frames, assignments | Section 10.4 |
| Shot split or merge | Shot rows, re-resolved location, assignments (split only) | Frames and events are cascade-deleted; manual location lost | Section 10.4 |
| Generate prompts (Stage 9) | `frame_prompt`, `video_prompt`, `requires_end_frame`, `start_continuity`, both reference arrays | `end_frame_prompt`, `continuity_frame_prompt`, base selection, frames, links, assignments | Section 11.2 |
| Frame regenerate | New job, status `generating`, incoming links deleted | Other frames, outgoing match targets (receive the old image, H section 9 row r7) | Section 11.3 |
| Frame select-generation | Frame image, `approved_at` cleared, incoming links deleted | Other generations | Propagation runs after update |
| Continuity base select | Base column, prepended reference | Start mode | Section 11.4 |
| Batch link copy | Overwrites every next start frame, including approved | Links are replaced | FACT-0088 |
| Unlink | `start_continuity = none`, `continuity_frame_prompt` cleared | `frame_links` (not deleted) | Section 11.3 |
| Camera-change generation | `continuity_frame_prompt`, continuity reference URL | Prompt generation output | Section 11.6 |

---

## 14. Continuity mechanisms that exist

Each row lists the exact state, where it lives, what changes it, what it propagates to, and its status flags. Propagation means automatic effect on another row or artifact. "None" means the effect is read live or not at all.

| Mechanism | Exact state | Location in code | Change trigger | Propagation | Status flags |
|---|---|---|---|---|---|
| Start continuity mode | `shots.start_continuity`, `ai_start_continuity`, `continuity_frame_prompt` | `projects.ts:3855-3856`, `:3526-3535`, `promptGenerationService.ts:1014-1045` | Stage 9 generate (overwrites), PUT prompts, batch link, add-as-reference, unlink | None. Read at next frame generation. | REACHABLE, PERSISTED, FUNCTIONAL |
| Continuity base | `shots.selected_continuity_base_frame_id` plus `reference_image_order` entry `continuity-base-<id>` | `frames.ts:1574-1682`, `frameGenerationService.ts:626-709` | Use or Fresh; generate-prompts drops the entry but keeps the column | None on base frame change or location change (section 15). Base selection is revalidated only by the top-8 check on select. | REACHABLE, PERSISTED, TESTED (select and clear) |
| Continuity base candidates | Not stored | `continuityBaseService.ts:83-266` | Any request for the shot | None | COMPUTED, TESTED |
| Frame link `match` | `frame_links` row, `link_type = 'match'`, unique on target | `frames.ts:2099-2103,1949-1953`, `frameGenerationService.ts:1545-1596` | Copy, batch link, or propagation source event | Copies source URL to targets on regenerate, inpaint, upload variant and select-generation, using the URL at call time | REACHABLE, PERSISTED, FUNCTIONAL, propagation timing likely stale (UNKNOWN runtime) |
| Frame link `reference` | `frame_links` row, `link_type = 'reference'` | `frames.ts:1033-1043`, `frameGenerationService.ts:404-428` | Add-as-reference | None (one-shot) | REACHABLE, PERSISTED, TESTED |
| Frame lineage | `frames.generated_from_frame_id`, `continuity_base_role` | `frames.ts:1894,1913,2037`, `frameGenerationService.ts:392,816,878,1081` | Copy, base generation, camera change, fallback | Read by continuity metrics | PERSISTED, partly read, stale on fresh regeneration (STATE-0059) |
| Reference arrays | `shots.reference_image_order`, `end_frame_reference_image_order` | Generate-prompts `projects.ts:3848`, PUT reference-images `frames.ts:1498-1568`, upload `frames.ts:1219-1236`, camera-change refresh `frameGenerationService.ts:829-839` | As listed | Frame generation reads persisted arrays only | PERSISTED, snapshot at Stage 9 time, not regenerated when assets change (STATE-0060) |
| Location identity | `shots.location_asset_id`, confidence, source, notes | `projects.ts:225-256`, `locationResolverService.ts:352-471` | Shot edit, Stage 7 extraction, resolve-locations, camera direction, split, merge, backfill | None (no cascade beyond FK SET NULL) | REACHABLE, PERSISTED, TESTED (resolver and sticky manual) |
| Location state | Computed (Classifier A, B) | `projects.ts:79-139`, `continuityCompositionService.ts:218-254` | Every GET (A), every preview (B) | None | COMPUTED, two classifiers (CONTRADICTED) |
| Camera direction | `shots.camera_direction_id`, `location_views` (direction) | `projects.ts:2180-2313`, `locationCoverageService.ts` | Camera-direction PUT, generic PUT, extraction | Moves shot to parent location (direction parent source) | REACHABLE, PERSISTED, TESTED |
| Location coverage | Computed | `locationCoverageService.ts:197-339`, `projects.ts:1585-1708` | Any location, view, instance or image change, on re-fetch | None | COMPUTED, PARTIAL tests |
| Location view image | `location_views.image_key_url` | `projectAssets.ts:3051-3287,3298-3448` | Upload, establish, generate (client PUT) | Frame prompt and reference selection read it live | REACHABLE, PERSISTED, PARTIAL |
| Scene continuity risk | Computed | `continuityRiskAnalyzer.ts:50-126` | Every scene list GET | None | COMPUTED, TESTED |
| Scene instance inherit | Instance row copy | `assetInheritanceService.ts:51-82,229-286` | Stage 8 mount or Inherit (scene > 1) | None after creation | REACHABLE, PERSISTED, untested (V6 16) |
| Transformation overrides | Confirmed events, resolved per shot | `transformationEventService.ts:107-201` | Confirm, edit, delete, shot delete | Same-scene prompts and frames at read time | FUNCTIONAL, PERSISTED, TESTED |
| Master reference | `selected_master_reference_*` on instance | `sceneAssets.ts:1505-1661` | Select | Generation default, prompt generation, continuity composition | REACHABLE, PERSISTED, untested |
| Tag carry-forward | Tags copied at inherit, plus `carry_forward` | `assetInheritanceService.ts:114,127-142` | Inherit | Next scene only, at creation | REACHABLE, PERSISTED |
| Tag carry-forward prompt | Browser `localStorage` only | `Stage8VisualDefinition.tsx:366-410` | Stage 8 load | Writes tags via PUT on confirm | Browser-only, UNTESTED |
| Version-sync | `source_version` vs `global_assets.version` | `projectAssets.ts:431-508`, `AssetVersionSync.tsx:38-47` | Global edit, upload, generation | None automatically; sync is a manual action | REACHABLE, FUNCTIONAL |

---

## 15. Continuity and asset behaviors that do NOT exist in code

Only entries with evidence of absence. "Grep" is the repository search that showed no implementation. Where a claim rests on a report rather than a grep run for this document, the report is named.

| Plausible UI or label | What the code does | Evidence of absence |
|---|---|---|
| Visual style applied to frame images | Frame image jobs get no capsule id, text or images | `stage_states` select on `state_data` with `project_id` (`frames.ts:262-267,385-390,449-454,767-772,845-850`). Neither column exists in migrations (R1a C01, CONFIRMED). |
| Project-level style capsule used by Stage 9 prompts | Literal "No visual style capsule applied." | No writer of `projects.visual_style_capsule_id` (grep of backend and `src`; R1a C02, CONFIRMED). |
| Automatic transformation events from detection | No events created from `transformation_flags` | No reader of `transformation_flags` (grep); no writer of `stage7_extraction` or `stage8_relevance` (grep). R1b C18 (PARTIAL). |
| "AI Detected" transformation badge | Branch exists, unreachable | `detected_by !== 'manual'` branch (`TransformationEventCard.tsx:91-93`) and no non-manual writer (grep). |
| Asset re-capsuling on style change | Snapshot stays | Only insert, split, clone and sync paths write `visual_style_capsule_id` (grep; section 5.2). |
| Asset unlock or edit after Stage 5 unlock | `locked` never set false | `locked: false` appears only in insert payloads (grep). Only `update({locked: true})` writes exist (`projectAssets.ts:1565,1729`). R1b C20, CONFIRMED. |
| Per-field version history for project asset description | None | `text_field_versions.entity_type` allows only `shot` and `scene_asset_instance` (migration 036, V6 1.5). V5 2.5: no per-field history for project assets. |
| Staleness marking of scene instances when project asset changes | No stale flag; `effective_description` not recomputed | No code in `sceneAssets.ts`, `projectAssets.ts` or `assetInheritanceService.ts` updates instances on project asset change. A case-insensitive grep of backend and `src` for `stale`, `needs_regeneration` and `needsRegeneration` lists no match in these three files. Also INV-0038. |
| Re-inherit or refresh scene instances from project assets | Inherit only when no instances exist | `sceneAssets.ts:321-325` (400 when any instance exists). |
| Mask-aware inpaint for frames | Mask stored, never sent | `inpaintImage` has no callers (grep `inpaintImage(` in `backend/src`). R1b C12, CONFIRMED. |
| Inpaint for project or scene assets | No route | Grep `inpaint` in `projectAssets.ts` and `sceneAssets.ts`: no matches. |
| Frame approval in the UI | Approve and reject are HTTP only | Grep `approveFrame`, `/approve`, `rejectFrame` in `src/`: only `frameService.ts` definitions (lines 152, 160, 178). Route exists at `frames.ts:315`. |
| Frame job failure resolves to rejected | Stays `generating` | `getFrameJobStatus` runs only via `GET .../frames/:id/status`, whose client wrapper has no caller (V9 5 step 8; R1b C13, CONFIRMED). |
| Aspect ratio honored in generated images | Not sent to provider | No `generationConfig` in `NanoBananaClient.generateContent` call (`NanoBananaClient.ts:118-130`). R1b C12, CONFIRMED. |
| Continuity prompt used when camera change applies | Generation builds a fresh prompt | `continuity_frame_prompt` has no reader in generation paths (grep; V7 8). Stage 9 help text says otherwise (`Stage9PromptSegmentation.tsx:884-891`). |
| Master reference must come from the reference chain | Select accepts any URL | `POST .../select-master-reference` does not check URL membership or instance-scene membership (`sceneAssets.ts:1607-1661`; V6 15). |
| Attempt history for transformation post images | One URL per event | No attempts exist for transformation images (V6 8.3). |
| Un-confirm of a transformation event | Irreversible from the UI | No un-confirm route (V6 8.3; H 3.4). |
| Automatic cross-scene continuity from the previous scene's end frame | None | Only manual "Pull" buttons target the adjacent scene (`FramePanel.tsx:705-726`). |
| Continuity base revalidated on location or base change | Base persists; generation uses it | No server-side invalidation exists (V7 11). |
| Continuity references rebuilt when location or views change | Arrays stay until Stage 9 regenerates | Arrays are written only by generate-prompts, PUT, upload and camera-change refresh (V7 11; V9 11). |
| Location alias editing | Column exists, no UI | No `location_aliases` writer in `src/` (section 2.1). |
| Calibration of resolver thresholds from match events | Rows only | `location_match_events` has only an insert statement (`locationResolverService.ts:483-492`). |
| Shot-list lock enforced by the backend | Frontend only | No shot mutation route checks `shot_list_locked_at` or `stage_locks` (V8 5, 6; R1a C05, CONFIRMED). |
| Public or shared global assets | Owner only | Every `/api/assets` query filters `.eq('user_id')` (`assets.ts`, V2 9). |
| Locked assets cannot be regenerated or re-imaged | Generation ignores lock | Generate, upload, edit and clear routes have no lock check (V5 2.4; R1b C20). |

---

## 16. Corrections made while synthesizing

1. **Isolation suffix on `transformation_post` (V5 versus V6).** V5 §2.2 and §4 say the suffix is appended to `transformation_post` jobs. The call sites of `injectBackgroundContext` are `ImageGenerationService.ts:131` (master_asset and angle_variant with assetId), `:226` (scene_asset) and `:749` (global asset). None passes `transformation_post`, and `sceneAssets.ts:2005-2032` does not add the suffix. V6 8.3 is correct. The helper's allowlist (`:83`) includes the name but is unreachable for that job type.
2. **Ledger WD-IMPL-CAP-0192 and R1b C18.** The ledger title says "Stage 3 and 7 derived shot transformation flags". R1b corrected it: only Stage 7 shot extraction writes `transformation_flags`. Stage 3 writes no flags (`grep -rln transformation backend/src/services` shows no beat or treatment service). Applied here.
3. **Ledger WD-IMPL-FACT-0075 (story-context keys).** The ledger's correction (V6) states that beat keys match and only treatment keys mismatch. R1a C10 confirmed the treatment part. Spot-check: `storyContextService.ts:95-96,114` reads `content.treatmentProse`, `content.treatments` and `content.selectedTreatmentId`. `Stage3BeatSheet.tsx:345-349` keeps the treatment in component state as `treatmentSource.content`. The `treatmentProse` identifiers at `Stage3BeatSheet.tsx:313` and `:537` are request payloads to `beatService`, not stored content. Stage 2 stores `variations` and `activeVariation` (V6 11). Applied here. Treatment context in story-context inference is therefore always empty; beats populate.
4. **Ledger FACT-0073 ("No automatic transformation detection is wired").** R1b narrows it: the LLM detection runs automatically during Stage 7 shot extraction (`Stage7ShotList.tsx:170-178` → `shotExtractionService.ts:257,282,374-389`). What is not wired is conversion into events. Applied in section 8.4.
5. **"Approved" frame gating (V7 versus V9).** V9 says the UI never sets `approved`. V7 describes the "Use approved frame" action as live. Spot-check: in `frames.ts` and `frameGenerationService.ts`, the only write of status `approved` is `approveFrame` (`frameGenerationService.ts:939-950`), reachable over HTTP at `frames.ts:315`. Other matches are reads. Applied in section 10.5.

---

## 17. Contradictions, weak evidence and UNKNOWN items

**Contradictions preserved (both sides recorded):**

1. **Two location classifiers.** Thresholds 0.72 (route, can return `ambiguous`) and 0.8 (composition, never `ambiguous`). Both live. R1a C07 CONFIRMED. Section 10.3.
2. **Lock one-way.** Comment at migration 008:184 calls it a "Stage 5 gatekeeper". No unlock path exists for `project_assets.locked` (R1a C20, R1b C20). UNKNOWN whether the Phase A unlock flow is expected to unlock assets; no code touches `project_assets` on Phase A unlock (V5 C1; H 1.4).
3. **`overridden_fields` intent.** Migration 009 comment says it should not be overwritten during global syncs. Sync force-overwrites all fields (V5 C5; INV-0033). The same tension applies to the stored `effective_description`.
4. **NanoBanana role ambiguity.** Capsule images carry no role. With two or more capsule images and no identity image, the first style image is labeled "the subject". Code-proven wording; image behavior UNKNOWN (V2 4 row 7; FACT-0027).
5. **Scene inheritance.** Comment "Scene N can only inherit from Scene N-1" (`assetInheritanceService.ts:41-44`) is accurate. The relevance service comment calls the system "non-linear inheritance" (`sceneAssetRelevanceService.ts:3-4`). Only the relevance prompt is non-linear. CONTRADICTED (V6 17).
6. **Editor text versus behavior.** "Edits here create a new scene instance and are saved to the asset history" (`VisualStateEditorPanel.tsx:790-793`). Edits update the row in place. CONTRADICTED (V6 17).
7. **within_shot card text.** "applies from Shot <trigger> onward" (`TransformationEventCard.tsx:284-285`) versus the resolver, which keeps the trigger shot in pre state with a transforming flag. CONTRADICTED (V6 17).
8. **Ambiguous location metric.** Continuity metrics count `location_match_source = 'ambiguous'` (`projects.ts:945`). Migration 039 forbids that value and no code writes it, so the count is always 0 (V7 17 cross-slice). Classifier A returns `ambiguous` as a state, not as a stored source (section 10.3).
9. **Frame link propagation timing.** Propagation runs on regenerate immediately after job creation, copying the old image (H section 9 row r7, V9 11). The alternative reading (propagation after completion) is not in code. Settled only by a runtime observation (UNKNOWN).
10. **Scene risk import path.** Extensionless dynamic import (`projects.ts:1093`) under a `"type": "module"` backend. Works under `tsx` (V7 10). UNKNOWN under compiled `node dist/server.js`.
11. **Stored deployed model.** Constructor default `gemini-2.5-flash-lite` (`llm-client.ts:76`) versus `generate()` fallback `gemini-1.5-flash` (`llm-client.ts:106`). Deployed `GEMINI_MODEL` UNKNOWN. All LLM statements in this document inherit that uncertainty.
12. **Location warning and lock.** V8 5 and V7 3.4 describe a 409 for location warnings unless `force` is sent (`projects.ts:2952-2959`). The ledger entry INV-0053 says location warnings never block the lock. The route was not re-read for this document, so the two readings stay side by side.

**Weak or single-source evidence (lowest confidence first):**

- Location view deletion removes the frame's storage object (C10). Inferred from path parsing (`projectAssets.ts:3158-3162`) and shared bucket paths. Runtime UNKNOWN.
- Frame link propagation copying stale images (section 11.3). Static reading only.
- Coverage state `direction_location_mismatch` unreachable (section 10.5). Static reading by V7; not spot-checked.
- Extraction Confirm button disabled on first open (section 3.3). Inferred from state initialization order (C8).
- `AssetDrawer` and `AssetMatchModal` crash on `extra_archetype` (section 2.2). Inferred from undefined `config.icon` (C9).
- `image-generation.test.ts` calls master jobs without a style, which current enforcement rejects. Tests are stale or the test never ran (V5 13; C7).
- `end_frame_reference_image_order`. Migration 039 adds the column, with a comment that live code used it before any migration created it (V7 2.1). Whether the live schema has it is UNKNOWN.
- Continuity-route authorization gaps (V7 17 item 8) rest on route reading. Only 401 tests exist for these routes (FACT-0089).
