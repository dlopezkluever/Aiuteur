# V8 — Shot List (Stage 7), Shot Locking, Shot-Asset Assignments (Stage 9 timeline/panel pieces)

Reporter V8. Static read of HEAD. All paths relative to repo root `/home/user/workspace/repo`.

## 0. Files inspected

Frontend: `src/components/pipeline/Stage7ShotList.tsx` (full), `src/components/pipeline/Stage9/{ShotAssetPanel,ShotAssetTimeline,BulkPresenceTemplates}.tsx` (full), `src/lib/services/shotService.ts` (full), `src/lib/services/shotAssetAssignmentService.ts` (full), `src/lib/hooks/useShotAssetAutoPopulate.ts`, `src/lib/utils/shotAssetMatcher.ts`, `src/lib/hooks/useSceneStageLock.ts`, `src/types/scene.ts:1-130`, wiring excerpts of `src/pages/ProjectView.tsx`, `src/components/pipeline/Stage9PromptSegmentation.tsx`, `Stage8VisualDefinition.tsx`, `AssetDrawer.tsx`, `src/lib/services/locationContinuityService.ts:57-87`. Tests: `src/components/pipeline/Stage9/__tests__/*`, `src/lib/services/__tests__/shotAssetAssignmentService.test.ts`, `src/lib/utils/__tests__/shotAssetMatcher.test.ts`.

Backend: `backend/src/routes/projects.ts:1-257, 1531-2042, 2179-2313, 2398-3185` (+ excerpts 3360-3390, 3800-3860), `backend/src/routes/shotAssignments.ts` (full), `backend/src/routes/sceneStageLocks.ts` (full), `backend/src/services/{shotExtractionService,shotSplitService,shotMergeService,shotValidationService,shotAssetAssignmentService}.ts` (full), `backend/src/services/llm-client.ts:45-380`, `backend/src/services/promptGenerationService.ts:169-227, 344-363, 600-663, 885-1000`. Migrations 003, 006, 011(grep), 012, 014, 018, 019(grep), 028, 029, 030(grep), 031, 033, 038, 039, 040(head), `backend/quickies-sql/add_stage_locks.sql`. Tests: shotExtraction, shotValidation, shotLocking, shotLocking4_5_task_11, shotAssetAssignment, frameShotsEmbedRegression, shotLocationRoutes (names + relevant cases).

## 1. Shots data model (`shots` table)

Accumulated from migrations (no single CREATE has all columns):

| Column | Type/default | Source migration | Written by (this slice) | Notes |
|---|---|---|---|---|
| id | UUID PK | 006 | insert | row identity; FK target of frames, video_generation_jobs, image_generation_jobs, shot_asset_assignments, transformation_events, location_match_events |
| scene_id | UUID NOT NULL FK scenes ON DELETE CASCADE | 006 | extract/split/merge insert | |
| shot_id | TEXT NOT NULL, UNIQUE(scene_id, shot_id) | 006 | extract (`generateShotId`), split (`{orig}-{n}`), merge (`{first}-M`) | display label e.g. `1A`; the only split/merge lineage that exists |
| duration | INTEGER NOT NULL DEFAULT 8 | 006 | extract, PUT, split (=original), merge (=sum) | seconds |
| dialogue | TEXT DEFAULT '' | 006 | extract, PUT, split, merge | |
| action | TEXT NOT NULL | 006 | extract, PUT, split, merge | |
| characters_foreground / characters_background | TEXT[] DEFAULT '{}' | 006 | extract (from LLM `characters[].prominence`), PUT | `off-screen` mapped to background |
| setting | TEXT NOT NULL | 006 | extract, PUT, split, merge | drives location resolver |
| camera | TEXT NOT NULL | 006 | extract, PUT, split, merge | free text `SHOT_TYPE - ANGLE - MOVEMENT` |
| continuity_flags | TEXT[] | 006 | extract, split, merge; PUT-allowed | not shown/edited in Stage 7 UI |
| beat_reference | TEXT | 006 | extract; split sets null; merge copies first | read-only in UI |
| created_at/updated_at | trigger `shots_updated_at` | 006 | | |
| shot_order | INTEGER NOT NULL DEFAULT 0, idx (scene_id, shot_order) | 012 | extract (index), reorder, split/merge shifting | no uniqueness; gaps possible after delete |
| frame_prompt, video_prompt, requires_end_frame (DEFAULT TRUE), compatible_models (DEFAULT {Veo3}), prompts_generated_at | | 018 | V9 (generate-prompts) | not cleared by any Stage 7 edit |
| reference_image_order JSONB, end_frame_prompt TEXT | | 028 (`028_ref_image_num_end_frame.sql`; no column named ref_image_num exists) | V9/V10 | |
| ai_recommends_end_frame BOOLEAN | | 029 (backfilled from requires_end_frame where prompts_generated_at not null) | V9 `projects.ts:3851` | |
| transformation_flags JSONB | | 030 | extract only, as `JSON.stringify(...)` (`projects.ts:1928`) | never read anywhere (see FACT) |
| start_continuity ('none'/'match'/'camera_change', DEFAULT 'none'), ai_start_continuity, continuity_frame_prompt | | 031 | V9/V10 | |
| camera_distance, camera_height, camera_movement TEXT; camera_direction_id UUID FK location_views ON DELETE SET NULL | | 038 | extract; PUT-allowed; camera-direction route | no CHECK on shots columns (CHECKs only on location_views) |
| location_asset_id FK project_assets SET NULL, location_match_confidence NUMERIC(4,3) 0..1, location_match_source (CHECK manual/resolver_exact/resolver_alias/resolver_fuzzy/stage7_inferred/legacy_backfill/camera_direction_parent), location_match_notes | | 039 | every shot insert/PUT(setting or direction)/camera-direction | resolver logic is V7 |
| end_frame_reference_image_order JSONB | | 039 (compat fix) | V9/V10 | |
| selected_continuity_base_frame_id FK frames SET NULL | | 040 | V10 | creates 2nd frames<->shots FK path (see frameShotsEmbedRegression test) |

No lineage columns (`parent_shot_id`, `split_from`, etc.) exist anywhere (grep empty). No blocking/previs columns. No per-shot lock column; locking is scene-level.

Scene-level lock fields (`scenes`): `status` CHECK ('draft','shot_list_ready','frames_locked','video_complete','outdated','continuity_broken') (003/014); `shot_list_locked_at TIMESTAMPTZ` (014); `stage_locks JSONB DEFAULT '{}'` — created ONLY by `backend/quickies-sql/add_stage_locks.sql` (not a numbered migration; file says "Ran successfully on prod"). `expected_characters`, `expected_location` (011) are inputs to validation/resolution.

API shape: `transformShotForClient` (`projects.ts:190-223`) returns camelCase core fields + snake_case camera/location fields + `locationState`; it omits `shot_order`, `transformation_flags`, prompts, end-frame flags, continuity fields. Frontend `normalizeShot` (`shotService.ts:21-45`) maps to `Shot` (`src/types/scene.ts:51-74`); `Shot.transformationFlags` is declared but never populated.

## 2. How shots come to exist

### 2.1 AI extraction (only creation path for a fresh scene)
Trigger: `Stage7ShotList` mount effect (`Stage7ShotList.tsx:157-206`): `shotService.fetchShots` → if 0 rows, toast + `shotService.extractShots` → `POST /api/projects/:id/scenes/:sceneId/shots/extract` (`projects.ts:1711-1977`). If the response has 0 shots the UI throws `'Shot extraction returned no shots'` and shows an error screen whose Retry button is `window.location.reload()` (`:880-883`).

Route context assembly (`projects.ts:1716-1830`):
- scene `id, scene_number, script_excerpt, expected_location` on active branch.
- prior scene `end_state_summary` where `scene_number = n-1`.
- Stage 3 latest **locked** `stage_states.content.beats` → `"${i+1}. ${b.text || b}"` lines (beatSheetSummary).
- Stage 4 latest **locked** `content.formattedScript||formatted_script` → each `INT./EXT.` heading plus the first following non-empty line truncated to 100 chars (masterScriptSummary).
- Location: `locationResolverService.resolveShotLocation({sceneExpectedLocation})`; if applied (confidence ≥ 0.72 default), existing `location_views (name, alias, description)` for that asset ordered by sort_order become `locationDirections`.

Service `ShotExtractionService.extractShots` (`shotExtractionService.ts:195-441`). Provider: `llmClient.generate` → LangChain `ChatGoogleGenerativeAI` (Gemini) with `model = request.model || GEMINI_MODEL || 'gemini-1.5-flash'` (`llm-client.ts:106`; constructor default `gemini-2.5-flash-lite` is not what `generate` uses), temperature 0.3, maxTokens 4096, metadata `{operation:'shot_extraction', stage:7}`. llm-client retries retryable errors (RATE_LIMIT, 5xx, network) up to 3 times, backoff 1s/2s/4s capped 10s (`llm-client.ts:45-50,209-238`). The whole first call is raced against a 20 s timeout (`SHOT_EXTRACTION_TIMEOUT_MS = 20000`); timeout → returns `{shots:[], newDirections:[]}`; RATE_LIMIT rethrown → route 429.

System prompt (verbatim key rules, `:208-286`):
> "You are a technical shot breakdown specialist for an AI video generation pipeline..." / "SHOT BREAKDOWN RULES: 1. Each shot must be EXACTLY 8 seconds (or explicitly justified if different — use 4-6s for complex action). 2. Each shot must be ATOMIC (one primary action or dialogue exchange). 3. Camera specs must be technically precise with THREE components: SHOT_TYPE - ANGLE - MOVEMENT ... 4. Character prominence must be explicit: use "foreground", "background", or "off-screen""
Plus sections: GLOBAL CONTEXT (master script summary, beat sheet), CURRENT SCENE CONTEXT (scene UUID, number), PREVIOUS SCENE END-STATE, optional CAMERA DIRECTION CONTEXT (existing directions; may propose `direction_3`...) or CAMERA DIRECTION CREATION (when location known but no views), SHOT DESCRIPTION QUALITY REQUIREMENTS (blocking, body language, lighting, spatial relations), STRUCTURED CAMERA METADATA ("camera_distance": wide|medium|close derived EWS/WS/FS→wide, MS→medium, MCU/CU/ECU→close; camera_height; camera_movement; camera_direction), CONTINUITY REQUIREMENTS, TRANSFORMATION DETECTION (instant/within_shot/gradual, is_trigger/is_completion), OUTPUT JSON schema `{new_directions:[...], shots:[...]}`.
User prompt (`:288-293`): "Extract the shot list for this scene. Scene number: N. SCENE CONTENT: <script_excerpt> ... Use duration 8 unless justified."

Parse/validate (`:313-440`): strip ``` fences, `JSON.parse`. On parse failure → one retry with a different short system prompt ("You extract a shot list from screenplay text. Return ONLY valid JSON: {...}") and same user prompt, NOT under the 20 s race; second failure → empty result. Per-shot `validateShot`: `action`, `setting`, `camera` must be non-empty strings; `duration` if present must be number in [1,30]; invalid shots are silently dropped (warn log). Shot IDs regenerated server-side by index of surviving shots: `generateShotId(sceneNumber, i)` → `1A..1Z, 1AA, 1AB...` (`:105-114`); LLM `shot_order` ignored. Duration default 8. Camera structured fields: LLM value if in the enum, else regex fallback `parseCameraMetadata(camera)` (`promptGenerationService.ts:169-227`; default medium/eye_level/static). `new_directions` plus any shot `camera_direction` name not in existing directions become new directions.

Route persistence (`projects.ts:1832-1969`): if a location asset resolved and new directions exist → insert `location_views` rows `source:'stage7_inferred'`, `view_type = name.includes('establishing') ? 'establishing' : 'direction'`, `camera_distance:'wide'`, `camera_height: direction?'eye_level':'overhead'`, first direction becomes `is_primary` if none exists. Shots inserted with `shot_order = index`, `camera_direction_id` mapped by name (null if the name wasn't created/known), location identity patch via `applyShotLocationResolution`, then one `location_match_events` row per shot (`recordMatchEvent`). 0 shots → `{success:true, shotCount:0, shots:[]}` (no insert).

### 2.2 Manual add
No route creates a single shot (`grep "scenes/:sceneId/shots'"` → only GET). Stage 7 imports `Plus` icon but renders no add button. Manual add: N.

### 2.3 Re-extraction
No UI or route deletes existing shots before extraction. The extract route does not check for existing shots; a second call on a scene with shots would attempt to insert `1A,1B...` again and hit `UNIQUE(scene_id, shot_id)` → 500 "Failed to persist shots" (inferred from schema; not runtime-verified). The UI only calls extract when fetch returns 0 shots, and the last shot cannot be deleted (`projects.ts:2825-2831`, UI dialog), so for an existing scene re-extraction is effectively unreachable. Stage 4/6 scene re-persistence (`PUT /:id/scenes`, `projects.ts:1216-1529`) preserves scene IDs (matched by slug+number) and only updates `script_excerpt`/dependency fields → existing shots, prompts, frames, assignments, and locks are untouched (no staleness signal); unmatched scenes are deleted → shots cascade-deleted.

## 3. Editing a shot (Stage 7 inspector)

UI fields (`Stage7ShotList.tsx:1188-1468`): duration (number input; `parseInt(v) || 8`), action, dialogue, foreground/background characters (comma split), setting, camera; linked location select / Clear / candidate Accept (V7 routes); beat reference read-only. NOT editable in UI: continuity_flags, camera_distance/height/movement, camera_direction_id, shot_id, order.

Chain: `handleShotUpdate` (`:289-306`) updates React state + `pendingUpdates` Map → `useDebounce(800ms)` → effect (`:253-286`) → `shotService.updateShot` → `toBackendShotUpdate` snake_case whitelist (`shotService.ts:51-67`) → `PUT /:id/scenes/:sceneId/shots/:shotId` (`projects.ts:2399-2512`). Backend whitelist: `duration, dialogue, action, characters_foreground, characters_background, setting, camera, continuity_flags, beat_reference, camera_distance, camera_height, camera_movement, camera_direction_id`; other keys → 400. If `setting` or `camera_direction_id` present and current `location_match_source !== 'manual'` → re-run resolver and overwrite the 4 location fields (may null an existing resolver link), then write `location_match_events`. No validation of values (duration bounds, enums) on PUT.

Downstream: none. PUT does not touch prompts (`frame_prompt`, `video_prompt`, `prompts_generated_at`), frames, video jobs, assignments, `stage_locks`, or scene status. No code compares `shots.updated_at` with `prompts_generated_at`. Free-text `camera` edits do not re-derive `camera_distance/height/movement`. Shot text fields have no version history (`text_field_versions` covers only frame/video/end_frame prompts + description_override, migration 036).

## 4. Split / Merge / Delete / Reorder

### Split (`POST .../shots/:shotId/split`, `projects.ts:2515-2654`; service `shotSplitService.ts`)
- Body `{userGuidance?, splitCount?}`; `count = splitCount === 3 ? 3 : 2`. UI never sends splitCount (Stage 7 `performSplit` `:406-450`; Stage 9 `ShotAssetPanel` `:80-92` sends no guidance either).
- AI: system prompt "You are a shot segmentation specialist. Your role is to divide a single shot into N new shots while preserving narrative coherence. Each new shot will be given the same duration as the original (set server-side)..." with original shot JSON; rules: cover same content, natural breaks, adjust camera, preserve continuity flags, "Do not invent new narrative content". temp 0.3, maxTokens 2048 (3072 for 3), metadata `shot_split`. No timeout, no parse retry. Parse failure → Error "Failed to parse shot split response"; fewer than N shots → Error "Shot split response must contain exactly N shots" (>N accepted, sliced). Route maps errors containing 'parse'/'split' → 422.
- Result: `shot_id = {orig}-1..N`; **each** new shot `duration = original.duration` ("stretch semantics" — total scene duration grows); default 4 if missing then overwritten; `beat_reference: null`; camera_distance/height/movement/direction and transformation_flags NOT carried.
- Order of ops: read original + its assignments → LLM → DELETE original (cascades frames, video_generation_jobs, image_generation_jobs, transformation_events with trigger_shot_id, location_match_events, assignments; prompts lost with row) → shift later shots `shot_order += N-1` one-by-one → insert new rows at `orig_order + i` with location resolution → match events → clone saved assignments (same presence_type) to every new shot (insert error only warned) → fire-and-forget `invalidateStage9AndDownstream(sceneId)` (stage_locks 9-12 `locked` → `outdated`). Non-transactional: failure after delete leaves the original gone.

### Merge (`POST .../shots/:shotId/merge`, `projects.ts:2657-2788`; `shotMergeService.ts`)
- Body `{direction:'next'|'previous', userGuidance?}`; UI sends only direction (`shotService.ts:297-330`).
- Neighbour found by `shot_order === current ± 1` (`:2691-2702`); with order gaps (after delete) → 400 "No next/previous shot to merge with" even if UI shows a neighbour.
- AI: "You are a shot consolidation specialist... merge two consecutive shots into one coherent shot without inventing new narrative content." with both shots JSON; duration stated as sum; temp 0.3, maxTokens 2048, `shot_merge`. Requires non-empty action/setting/camera else Error. Result `shot_id = {first}-M`, `duration = a+b`, `beat_reference = first.beat_reference`.
- Ops: delete both rows (cascade as above), insert merged at lower order, shift later shots −1. **No assignment cloning and no `invalidateStage9AndDownstream`** (unlike split). Structured camera fields not carried.

### Delete (`DELETE .../shots/:shotId`, `projects.ts:2791-2840`)
- Counts shots (computed twice; first count unused). `count <= 1` → 409 `{code:'LAST_SHOT', suggestion:'defer_scene'}`. Otherwise delete row (cascades). No `shot_order` compaction, no stage invalidation.
- UI (`Stage7ShotList.tsx:452-485`): if local `shots.length <= 1` opens "Last Shot in Scene" dialog offering `sceneService.deferScene` → `PUT /:id/scenes/:sceneId/defer` then `onBack()`.

### Reorder (`PUT .../shots/reorder`, `projects.ts:1980-2040`)
- Validates all ids belong to scene; sets `shot_order = index` per id (parallel updates). Client `shotService.reorderShots` exists; **no caller** in `src/` → ORPHANED.

## 5. Validation rules (lock gatekeeper)

Server `ShotValidationService.validateShots` (`shotValidationService.ts:41-193`), called only by the legacy lock route:
- ERROR `shot_count`: 0 shots → "Scene must have at least one shot. Use Stage 7 to generate a shot list." (returns immediately)
- ERROR `shotId`: duplicate shot_id count>1.
- ERROR action/setting/camera empty after trim ("Action is required", etc.).
- ERROR duration `< 1` ("Minimum duration is 1 second (API limit)"), `> 30` ("Maximum duration is 30 seconds (quality threshold)").
- WARNING duration `< 4` ("...very short. Quick cuts work for action but may feel rushed for dialogue."), `> 12` ("...unusually long...").
- WARNING `charactersForeground` names (lower/trim) not in `scenes.expected_characters` (only if expected_characters non-null); suggestion if Levenshtein distance `< 3`. Background characters not checked.
- WARNING total duration `< shots*4` or `> shots*15`.
- Route adds WARNING `field:'location'` "Location continuity needs review: N unresolved, N ambiguous, N scene-location mismatch." when any (`projects.ts:173-188, 2930-2939`).
- Errors → 400 `{errors, canForce:false}`; warnings and `force !== true` → 409 `{warnings, canForce:true}`.

Client duplicate `validateShotsLocally` (`Stage7ShotList.tsx:549-622`): same thresholds and location warning, no character check, shorter messages. If local finds any error or warning the modal shows and the server is not called; "Lock Anyway" (warnings only) calls server with `force=true`. Character warnings therefore only surface via server 409 when local validation is clean.

## 6. Locking / unlocking

Two parallel lock representations for Stage 7: `scenes.shot_list_locked_at` (+ trigger-driven `status`) and `scenes.stage_locks['7']`.

DB trigger `trg_sync_scene_lock_status` BEFORE UPDATE ON scenes (`014:31-63`):
> "IF NEW.shot_list_locked_at IS NOT NULL AND OLD.shot_list_locked_at IS NULL THEN NEW.status := 'shot_list_ready'; ELSIF NEW.shot_list_locked_at IS NULL AND OLD.shot_list_locked_at IS NOT NULL THEN IF OLD.status = 'shot_list_ready' THEN NEW.status := 'draft'; END IF;"
Status `frames_locked` is never written by any code; `video_complete` is written by `videoGenerationService.ts:525-530`.

Lock (UI "Lock Shot List & Proceed", `Stage7ShotList.tsx:736-791` → `lockShotList` `:697-734`):
1. Flush `pendingUpdates` via PUTs (abort on failure), wait 150 ms, local validation.
2. `shotService.lockShotList(force)` → `POST .../shots/lock` (`projects.ts:2845-3017`): idempotent if already locked; validate; update scene `{shot_list_locked_at: now, stage_locks: {...,'7':{status:'locked',locked_at:now}}}` with `.is('shot_list_locked_at', null)` race guard; trigger sets `status='shot_list_ready'`. Forced-lock audit metadata is commented out (`:2980-2984`); `forcedLock` only in response.
3. `lockStageViaHook(7)` → `POST .../stage-locks/7/lock` (`sceneStageLocks.ts:56-141`): rewrites `stage_locks['7']` and `shot_list_locked_at` (best-effort, errors swallowed).
4. `onComplete()` → `ProjectView.handleSceneStageComplete` (`ProjectView.tsx:589-614`) → `stage-locks/7/lock` a third time, then navigates to Stage 8.

What lock gates: Frontend only — `canEdit = !isSceneLocked && isEditable` disables inputs/split/merge/delete/location controls; footer hidden when `stage7Locked||stage7Outdated`. Backend: **no shot mutation route checks `shot_list_locked_at` or `stage_locks`** (PUT, split, merge, delete, reorder, camera-direction, location, assignments). `stage-locks/8/lock` requires `stage_locks['7'].status==='locked'` (`sceneStageLocks.ts:93-105`). Stage 7 "Advanced"/"Advanced Tools" buttons call `onNext` (navigate to Stage 8 without locking) (`Stage7ShotList.tsx:955-965, 1392-1403`). Stage 9 `ShotAssetPanel` split mutates shots of a locked Stage 7.

Unlock (UI "Unlock and edit" in `LockedStageHeader`):
1. `unlockStageViaHook(7)` → `POST stage-locks/7/unlock` without confirm → 409 impact `{downstreamStages, framesAffected, videosAffected, estimatedCost = frames*0.05 + videos*2.50}` → `UnlockWarningDialog`.
2. Confirm → `confirmUnlockViaHook(7)` → `stage-locks/7/unlock {confirm:true}` (`sceneStageLocks.ts:244-281`): `stage_locks['7']={status:'draft'}`, every stage 8-12 that is locked/outdated → `{status:'outdated'}`, `shot_list_locked_at=null` → trigger reverts status to `draft` if `shot_list_ready`. Nothing deleted; frames/videos/prompts/assignments untouched.
3. Then `shotService.unlockShotList({confirm:true})` → legacy `POST .../shots/unlock` (`projects.ts:3020-3185`). Because step 2 already nulled `shot_list_locked_at`, the legacy route returns 400 "Shot list is not locked"; the UI swallows it (`Stage7ShotList.tsx:814-818`). The legacy invalidation branch is therefore unreachable from the UI.
Legacy route logic (if reached): only when `status in (frames_locked, video_complete)` → count frames/videos, require confirm, `frames.status='invalidated'` and `videos.status='invalidated'`, insert `invalidation_logs`; then same stage_locks cascade. Schema conflicts: `frames.status` CHECK (019) has no 'invalidated'; no migration creates `videos` or `invalidation_logs`; supabase errors are not checked (the try/catch cannot catch PostgREST errors).

Relock: `handleRelock` → `stage-locks/7/relock` (no validation) only shown when stage 7 is `outdated`; no code path sets stage 7 to `outdated` (unlock cascade is only `stage+1..12`, min stage 7; `invalidateStage9AndDownstream` is 9-12) → effectively unreachable.

## 7. Camera metadata / direction

- Structured fields (`camera_distance`, `camera_height`, `camera_movement`, `camera_direction_id`) populated only by extraction (LLM + regex fallback). PUT accepts them but no UI sends them. Split/merge drop them (null on new rows).
- `PUT .../shots/:shotId/camera-direction` (`projects.ts:2180-2313`): body `{cameraDirectionId}` or `{clear:true}`. Set: view must exist and have `view_type==='direction'` (400 otherwise); its `project_assets` row must be a location on the active branch; if shot has a manual location for a different asset → 409; if location differs → set `location_asset_id`, confidence 1, source `camera_direction_parent`, note. Clear: re-resolve location unless manual. No lock check, no invalidation, no match event recorded. UI caller: `locationContinuityService.assignCameraDirection` from Stage 8 `LocationCoveragePanel.tsx:219` (V7). Tested: `shotLocationRoutes.test.ts` "assigns camera direction through the Stage 8 repair endpoint".
- Consumers (V9): `enrichAssetsWithAngleMatch` uses `shot.camera` (and shot metadata) for character angle variants / location views.

## 8. Shot-asset assignments

Table `shot_asset_assignments` (033): `(shot_id FK shots CASCADE, scene_asset_instance_id FK scene_asset_instances CASCADE, presence_type CHECK throughout|enters|exits|passes_through DEFAULT throughout)`, UNIQUE(shot_id, instance). RLS defined but backend uses service-role key (`config/supabase.ts`).

Routes (`shotAssignments.ts`, mounted `server.ts:57` under `/api/projects` with auth): ownership check = project owned by user + scene's branch belongs to project (no active-branch check; does not verify that assignmentId/shotId/instanceId belong to the scene).
| Method/path (prefix `/:projectId/scenes/:sceneId/shot-assignments`) | Service | Invalidates 9-12 |
|---|---|---|
| GET `` | getAssignmentsForScene (joins instance + project_asset + angle variants) | – |
| GET `/shots/:shotId` | getAssignmentsForShot | – (no frontend caller; `listForShot` orphaned) |
| POST `` (zod: shotId/instanceId uuid, presenceType default throughout, min 1) | bulkCreateAssignments = **upsert** onConflict shot_id,instance | yes |
| PUT `/:assignmentId` {presenceType} | updateAssignment | yes |
| DELETE `/:assignmentId` | deleteAssignment | yes |
| DELETE `/all` | deleteAllForScene | yes — **but shadowed**: registered after `DELETE /:assignmentId` (`:195` vs `:223`), so `/all` is captured as `assignmentId='all'` → `.eq('id','all')` on a UUID column → error → 500 |
| POST `/auto-populate` | autoPopulate | no |
| GET `/has-assignments` | hasAssignments | – |

`invalidateStage9AndDownstream` (`backend shotAssetAssignmentService.ts:318-344`): stages 9-12 with status `locked` → `{status:'outdated'}` (drops locked_at); fire-and-forget from routes.

Auto-populate (`autoPopulate`, `:183-241`): every scene shot × every scene_asset_instance not already paired → insert `throughout`. Frontend hook `useShotAssetAutoPopulate` (`useShotAssetAutoPopulate.ts:23-63`) runs once per mount (ref guard): `hasAssignments` → if false, `autoPopulate`. Callers: Stage 8 (`Stage8VisualDefinition.tsx:302-311`, enabled when shots and sceneAssets loaded) and Stage 9 (`Stage9PromptSegmentation.tsx:150-159`, enabled when sceneAssets>0, assignments==0, version==0). Because it only runs when the scene has zero assignments, instances added later get no assignments unless added through AssetDrawer's checklist.

Stage 9 UI:
- `ShotAssetPanel` (rendered per prompt card, `Stage9PromptSegmentation.tsx:726-736`): collapsible list, presence Select (update), remove with confirm (delete), "Add Asset" popover of unassigned instances (create throughout), passes-through warning with "Split Shot" (`shotService.splitShot` without guidance), info banner when `startContinuity==='match'` and any `enters`. Errors only `console.error`. `onShotSplit` not passed → after split, assignments/shots reload but prompt cards (`loadPrompts` deps `[projectId, sceneId]`) stay stale with the deleted shot UUID.
- `ShotAssetTimeline` (`viewMode==='timeline'`, `:538-545`): matrix assets × promptSets with `shotUuid`; click cycles `null → throughout → enters → exits → passes_through → null(delete)`.
- `BulkPresenceTemplates` (`:503-511`): templates `all-throughout`, `match-characters` (characters via `matchAssetToShots` matched only, locations all shots, props none), `locations-throughout`; Apply = `deleteAllForScene` then `createAssignments`. Because DELETE `/all` is shadowed (above) the first call fails and nothing is created (error only logged). `buildTemplateAssignments` pure logic is tested.
- `shotAssetMatcher.matchAssetToShots` confidences: character foreground 1.0, background 0.7, dialogue mention 0.4; location setting 0.9, description-in-setting 0.5; prop action 0.8, dialogue 0.5. Fuzzy: normalized substring either direction; multi-word needles match if all words >2 chars appear. Also used by `AssetDrawer.startShotChecklist` (`AssetDrawer.tsx:114-133`; falls back to all shots selected when no match) whose confirm creates the scene instance then assignments (`:136-171`).

How assignments feed prompts (V9, `projects.ts:3808-3838`, `promptGenerationService.ts`): if scene has any assignment, map shot→assignments; per shot `scopeAssetsForShotContinuity` keeps non-location assets that are assigned **only if that shot has ≥1 assignment** (a shot with zero assignments falls back to all non-location assets); location assets are kept only if `asset.project_asset.id === shot.location_asset_id` regardless of assignments (`:344-363`). `buildFrameReferenceManifests` (`:612-663`): location → start+end; throughout → start+end; enters → end only; exits → start only; passes_through → neither (video-only); unassigned default throughout. Video prompt gets "TEMPORAL PRESENCE NOTES" lines: "X enters the frame during this shot." / "X exits the frame during this shot." / "Briefly during this shot, X (desc) passes through the scene." (`:969-997`). Continuity preview route (`projects.ts:3367-3385`) builds the same map.

## 9. UI action → service → route → backend → table

| UI action | Frontend | Route | Backend | Tables |
|---|---|---|---|---|
| Open Stage 7 (no shots) | `Stage7ShotList.tsx:157-206` → `shotService.extractShots` | POST `/shots/extract` | `ShotExtractionService.extractShots` (Gemini) | reads scenes, stage_states(3,4), location_views; writes location_views(stage7_inferred), shots, location_match_events |
| Edit field | `handleShotUpdate` → debounce 800ms → `updateShot` | PUT `/shots/:shotId` | resolver | shots, location_match_events |
| Split (Stage 7 / Stage 9) | `performSplit` / `ShotAssetPanel.handleSplitShot` → `splitShot` | POST `/shots/:shotId/split` | `ShotSplitService` (Gemini) | shots (delete+insert+order shift), shot_asset_assignments (clone), scenes.stage_locks, location_match_events; cascades frames etc. |
| Merge | `handleMergeShot` → `mergeShot` | POST `/shots/:shotId/merge` | `ShotMergeService` (Gemini) | shots, location_match_events; cascades |
| Delete | `handleDeleteShot` → `deleteShot` | DELETE `/shots/:shotId` | – | shots; cascades |
| Defer from last shot | `sceneService.deferScene` | PUT `/scenes/:sceneId/defer` | (V6) | scenes |
| Lock | `handleLockShotList` → `lockShotList` + hook + ProjectView | POST `/shots/lock`, POST `/stage-locks/7/lock` ×2 | `shotValidationService`, trigger | scenes (shot_list_locked_at, status, stage_locks) |
| Unlock | `handleUnlockAndEdit`/`handleConfirmUnlock` | POST `/stage-locks/7/unlock` (+confirm), POST `/shots/unlock` (400, swallowed) | trigger | scenes |
| Location link/resolve (V7) | `assignShotLocation`, `resolveShotLocations` | PUT `/shots/:id/location`, POST `/shots/resolve-locations` | locationResolverService | shots, location_match_events |
| Camera direction (Stage 8) | `locationContinuityService.assignCameraDirection` | PUT `/shots/:id/camera-direction` | – | shots |
| Presence change / add / remove / timeline cycle | ShotAssetPanel / ShotAssetTimeline → frontend `shotAssetAssignmentService` | PUT/POST/DELETE `/shot-assignments...` | backend `shotAssetAssignmentService` | shot_asset_assignments, scenes.stage_locks |
| Bulk template | `BulkPresenceTemplates.handleApply` | DELETE `/shot-assignments/all` (shadowed → 500) then POST | – | – (fails) |
| Auto-populate | `useShotAssetAutoPopulate` (Stage 8, 9) | GET has-assignments, POST auto-populate | autoPopulate | shot_asset_assignments |

Persisted vs transient: shot edits are transient in `pendingUpdates` until the debounced PUT (800 ms); `selectedShot`, `mergeDirection`, split guidance, validation lists, view mode are React state only. Nothing in localStorage in this slice.

## 10. Tests

- `backend/src/tests/shotExtraction.test.ts`: generateShotId (1A.., AA); parse+validate; discard invalid; structured camera fallback; "empty array on timeout" (mock rejects with 'Extraction timeout' message rather than exercising the race); ShotSplitService 2-way ids `3B-1/3B-2` and duration=original.
- `shotValidation.test.ts`, `shotLocking.test.ts`: validation thresholds, Levenshtein suggestion, totals (service-level only).
- `shotLocking4_5_task_11.test.ts`: lock/unlock return 401 without auth; all DB-backed cases `it.skip`.
- `shotAssetAssignment.test.ts`: service CRUD, upsert, autoPopulate dedupe, hasAssignments, invalidateStage9AndDownstream (9-12 only), deleteAllForScene (service-level; the shadowed route is not tested).
- `shotLocationRoutes.test.ts`: PUT shot setting → resolver_exact persisted; camera-direction endpoint.
- `frameShotsEmbedRegression.test.ts`: static scan that frames→shots embeds use `shots!frames_shot_id_fkey` (because 040 added a 2nd FK path).
- Frontend: `BulkPresenceTemplates.test.ts` (imports real `buildTemplateAssignments`), `ShotAssetTimeline.test.ts` (does NOT import the component; re-implements cycle/colors locally), `shotAssetAssignmentService.test.ts` (no deleteAllForScene case), `shotAssetMatcher.test.ts` (all confidence values). No test for Stage7ShotList, ShotAssetPanel, useShotAssetAutoPopulate, merge service, extract/split/merge/delete/reorder routes, the trigger, or shotAssignments routes. No e2e covers shots.

## 11. Dead / orphaned / duplicated

- ORPHANED: `PUT /shots/reorder` + `shotService.reorderShots`; `GET /shot-assignments/shots/:shotId` + `listForShot`; backend `createAssignment` (tests only); split `splitCount:3` and merge `userGuidance` (never sent).
- DEAD data: `shots.transformation_flags` written (stringified JSON scalar into JSONB) never read; `Shot.transformationFlags` never populated.
- Unreachable: legacy `/shots/unlock` invalidation path; stage 7 relock; `frames_locked` status.
- DUPLICATED: validation logic client vs server; lock written 3× per lock action; two lock stores (`shot_list_locked_at` vs `stage_locks['7']`); `mapCharactersToForegroundBackground` copied in 3 services; delete-route double count.

## Cross-slice references

- `projects.ts:2042-2178` resolve-locations and `:2316-2397` PUT location (V7) — called from Stage 7 UI (`Stage7ShotList.tsx:626-683`).
- `src/components/pipeline/Stage8/LocationCoveragePanel.tsx:219` calls camera-direction route (V7 UI).
- `projects.ts:1216-1529` PUT scenes preserves scene IDs and leaves shots untouched on script change; deletes unmatched scenes (cascade shots) (V6).
- `projects.ts:3573-3960` generate-prompts consumes assignments/location_asset_id/camera; writes frame/video prompts, requires_end_frame, ai_recommends_end_frame = `r.aiRecommendsEndFrame ?? r.requiresEndFrame` (V9).
- `projects.ts:3283-3457` continuity-preview builds assignment map (V9).
- `projectAssets.ts:731-870` asset merge migrates/merges shot_asset_assignments with specificity rule (enters/exits/passes_through=3 > throughout=1) (V5/V-assets).
- `transformationEventService.ts:380-461` infers transformation trigger/completion shots from assignments (first/last by shot_order) (V8b/V-transformations).
- `sceneStageLocks.ts` generic stage 7-12 lock/unlock/relock; unlock impact queries a `videos` table not created by any migration (V-locking/V12).
- `videoGenerationService.ts:525-530` sets scene `video_complete`; `continuityRiskAnalyzer.ts:68` reads it (V12/V6).
- `ContentAccessCarousel.tsx:1027`, `Stage8VisualDefinition.tsx:297`, `Stage9PromptSegmentation.tsx:138` also call `fetchShots`.
- `backend/scripts/backfill-shot-locations.ts` writes `legacy_backfill` location identity (V7).
- `src/components/pipeline/Stage12/ShotListPanel.tsx` (Stage 12, not inspected).

## Contradictions / unknowns

- C1: Shadowed `DELETE /shot-assignments/all` (`shotAssignments.ts:195` before `:223`) makes BulkPresenceTemplates non-functional. Static inference; runtime would confirm PostgREST returns 22P02 for `id=eq.all`.
- C2: Legacy unlock writes `frames.status='invalidated'` (not in CHECK), `videos` and `invalidation_logs` (no migration). Also unreachable from UI (see §6). UNKNOWN whether `videos`/`invalidation_logs` exist in the live DB (would be settled by DB introspection).
- C3: `stage_locks` column only in `quickies-sql/add_stage_locks.sql`; fresh DB from numbered migrations would lack it → lock routes would fail. UNKNOWN which DB state is canonical.
- C4: Comments say split/stage invalidation "§6" applies to shot structure changes, but merge and delete do not invalidate Stage 9+.
- C5: Split dialog text "divide this shot into two" and prompt "same duration as the original" → total duration increases; merge sums durations (two 8 s shots → 16 s, triggers >12 s warning).
- C6: `extract` route doesn't guard existing shots; re-call would conflict on UNIQUE(scene_id, shot_id) (inferred).
- C7: `llm-client.generate` model fallback `gemini-1.5-flash` vs constructor default `gemini-2.5-flash-lite`; actual model depends on `GEMINI_MODEL` env (UNKNOWN value).
- C8: Assignment routes don't verify that the target assignment/shot/instance belongs to the path scene; with the service-role client any UUID is mutable by any authenticated user who owns some project+scene.
- C9: Merge neighbour lookup by exact `shot_order ± 1` breaks after a delete leaves a gap (delete doesn't compact; reorder orphaned).
- C10: The 20 s timeout races only the first LLM call; llm-client internal retries/backoff can exceed it, producing an empty result while the request keeps running (result discarded).
- UNKNOWN: whether location coverage / Stage 8 enforce anything on Stage 7 lock beyond `stage_locks['7']` (V7/V8 Stage 8 reporters).
