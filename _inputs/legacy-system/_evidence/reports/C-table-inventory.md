# C-table-inventory: effective schema after all migrations (runner order) + code usage

Scope: `backend/migrations/*.sql` applied in `readdirSync().sort()` order (`backend/scripts/run-migrations.ts:19-21`), i.e. 001, 002, ..., 022_add_aspect_ratio, 022_scene_asset_generation_attempts, 023, 024_extra_archetype_and_style_outdated, 024_scene_asset_suggestions, 025, ..., 044. Final state only. "mig" = migration that introduced or last changed the item. `backend/quickies-sql/add_stage_locks.sql` is NOT in the migration chain but its column (`scenes.stage_locks`) is used by code, so it is included and marked `[quickies]`.

Usage legend (non-test code = `backend/src` excluding `tests/` and `__tests__`, `src/`, `backend/scripts`):
- `ref` = referenced by non-test code (select list, payload key, filter, or row-field read).
- `UNREF` = no non-test reference found.
- `W-only` = written by code, never read back. `R-only` = read, never written by code.
- Table usage: R/W = read and written by code; R = read only; W = written only; NONE = no code reference.
- "service-role" = every backend query uses the service-role client (`backend/src/config/supabase.ts:17`), which bypasses RLS. Frontend direct queries use the anon client with the user JWT (`src/lib/supabase.ts:11`), so RLS applies to them.

Common RLS shape "owner-chain": `EXISTS (... JOIN projects p ... WHERE p.user_id = auth.uid())` walked up from the row to `projects`.

Table index: 1 projects, 2 branches, 3 stage_states, 4 prompt_templates, 5 style_capsule_libraries, 6 style_capsules, 7 style_capsule_applications, 8 global_assets, 9 project_assets, 10 project_asset_generation_attempts, 11 asset_angle_variants, 12 location_views, 13 location_match_events, 14 scenes, 15 shots, 16 frames, 17 frame_links, 18 image_generation_jobs, 19 video_generation_jobs, 20 scene_asset_instances, 21 scene_asset_generation_attempts, 22 scene_asset_suggestions, 23 transformation_events, 24 shot_asset_assignments, 25 text_field_versions, 26 user_credits, 27 intake_resolutions, 28 intake_resolution_edits.
Referenced in code but NOT created by any migration: `videos`, `invalidation_logs`, `users` (script only), `hello` (test only). See section X at the end.

Triggers and functions are listed once in section T (end of file) and cited per table.

---

## 1. projects  [001; 004; 022; 040]
Table usage: R/W (service-role, projects.ts:266,573,735,844). Frontend direct read: `src/lib/services/imageService.ts:148` (`active_branch_id`).

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | PK | 001 | ref |
| user_id | UUID | NOT NULL | FK auth.users(id) ON DELETE CASCADE | 001 | ref |
| title | TEXT | NOT NULL | | 001 | ref |
| target_length_min | INTEGER | NOT NULL DEFAULT 180 | seconds | 001 | ref (projects.ts:581,715; frontend sends minutes*60) |
| target_length_max | INTEGER | NOT NULL DEFAULT 300 | seconds | 001 | ref |
| project_type | TEXT | NOT NULL DEFAULT 'narrative' | CHECK IN (narrative, commercial, audio_visual) (inline, auto-named) | 001 | ref. **Contradiction**: frontend sends `audio-visual` (see F-07) |
| content_rating | TEXT | NOT NULL DEFAULT 'PG' | CHECK IN (G, PG, PG-13, M) | 001 | ref |
| genre | TEXT[] | DEFAULT '{}' | | 001 | ref (projects.ts:701) |
| tonal_precision | TEXT | DEFAULT '' | | 001 | ref (projects.ts:708) |
| written_style_rag_id | UUID | | | 001 | DROPPED in 004 |
| visual_style_rag_id | UUID | | | 001 | DROPPED in 004 |
| active_branch_id | UUID | | FK branches(id) (constraint fk_active_branch, added 001) | 001 | ref (read; set by DB trigger on insert, see T) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 001 | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | no trigger on this table; written explicitly by code and by streamline_commit (042:216 etc.) | 001 | ref |
| writing_style_capsule_id | UUID | | FK style_capsules(id) | 004 | **R-only**: read at contextManager.ts:498; no writer in backend/src or src |
| visual_style_capsule_id | UUID | | FK style_capsules(id) | 004 | **R-only**: read at frames.ts:527/569/2156, projects.ts:3584/3740; no writer. Real visual style lives in Stage 5 `stage_states.content.locked_visual_style_capsule_id` |
| aspect_ratio | TEXT | NOT NULL DEFAULT '16:9' | CHECK IN ('16:9','9:16') projects_aspect_ratio_check | 022 | ref (projects.ts:729; VideoJobExecutor.ts:102) |
| continuity_mode | TEXT | NOT NULL DEFAULT 'basic' | CHECK IN (basic, advanced) chk_projects_continuity_mode | 040 | ref (projects.ts:817,838,844) |

Indexes: idx_projects_user(user_id); idx_projects_active_branch(active_branch_id).
Triggers: on_project_created AFTER INSERT -> create_initial_branch() (see T).
RLS (enabled): SELECT/INSERT/UPDATE/DELETE, all `USING/WITH CHECK (auth.uid() = user_id)` (001).
Removed via 004: written_style_rag_id, visual_style_rag_id. Not present in any later migration.
Cascade parent of: branches, global_assets(promoted_from_project_id, no action), project_assets, image_generation_jobs, video_generation_jobs, location_match_events.

## 2. branches  [001]
Table usage: R (code never INSERTs; DB trigger creates the row). Reads: contextManager.ts:466, projectAssets.ts:1794, shotAssignments.ts:64, scripts/backfill-shot-locations.ts:125.

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| project_id | UUID | NOT NULL | FK projects(id) ON DELETE CASCADE | ref |
| name | TEXT | NOT NULL | UNIQUE(project_id, name) | ref only via embed `branches!active_branch_id(name, commit_message)` (projects.ts:279,490,597,751), see F-09 |
| parent_branch_id | UUID | | FK branches(id) (no action) | UNREF |
| commit_message | TEXT | DEFAULT '' | | ref only via embed |
| is_main | BOOLEAN | DEFAULT FALSE | | ref (contextManager.ts:470) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref (backfill script:127 ordering) |

No updated_at column. Indexes: idx_branches_project, idx_branches_parent. Triggers: none on this table.
RLS: SELECT, INSERT, UPDATE (owner-chain via projects). **No DELETE policy.**
Cascade parent of: stage_states, scenes (via branch_id), project_assets, image_generation_jobs, video_generation_jobs, intake_resolutions, location_match_events.

## 3. stage_states  [001; 002; 041; 044 trigger]
Table usage: R/W (routes/stageStates.ts:33,245,380,488,610,642; streamline.ts:128,151; sceneAssets.ts:367,451,1991; contextManager.ts:479,536,557; storyContextService.ts:67,103). Only stages 1-5 are written by code (stage 6-12 gating is in `scenes.stage_locks`). Frontend: no direct access.

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 001 | ref |
| branch_id | UUID | NOT NULL | FK branches(id) ON DELETE CASCADE | 001 | ref |
| stage_number | INTEGER | NOT NULL | CHECK BETWEEN 1 AND 12 | 001 | ref |
| version | INTEGER | NOT NULL DEFAULT 1 | UNIQUE(branch_id, stage_number, version) | 001 | ref |
| status | TEXT | NOT NULL DEFAULT 'draft' | CHECK IN (draft, locked, invalidated, outdated, skipped) (stage_states_status_check, rewritten 041) | 001/041 | ref. 'invalidated' allowed but never written (see T) |
| inherited_from_stage_id | UUID | | FK stage_states(id) | 001 | W-only (stageStates.ts:234 writes; always NULL in streamline inserts) |
| content | JSONB | NOT NULL DEFAULT '{}' | | 001 | ref. shapes in section J |
| prompt_template_version | TEXT | DEFAULT '' | | 001 | UNREF at runtime (only in uncalled `DatabaseService.createStageState`, database.ts:82-104) |
| final_prompt | TEXT | DEFAULT '' | | 001 | UNREF at runtime (same) |
| regeneration_guidance | TEXT | DEFAULT '' | | 001 | ref (stageStates.ts:388 copy-forward) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 001 | ref |
| created_by | UUID | | FK auth.users(id) | 001 | W-only (stageStates.ts:233) |
| langsmith_trace_id | TEXT | | | 002 | UNREF at runtime (only uncalled database.ts:69-120). Trace ids live in `content.langsmithTraceId` |
| origin | TEXT | NULL | CHECK (origin IS NULL OR IN (skipped, imported, ai-generated, authored)) | 041 | ref (streamline + stageStates.ts:230). Lost on lock/unlock/outdated inserts, see F-14 |

Updated_at: NONE (no column, no trigger). Rows are never updated in place for status changes; every change INSERTs a new version (the only UPDATE is the uncalled langsmith_trace_id update at database.ts:72).
Indexes: idx_stage_states_branch, _stage, _status, _inherited (001); idx_stage_states_langsmith_trace (002); idx_stage_states_origin partial WHERE origin IS NOT NULL (041).
Triggers: trg_streamline_stage_lock_prerequisite BEFORE INSERT -> enforce_streamline_stage_lock_prerequisite() (044). Raises unless previous stage's latest version is locked or skipped, for NEW.status='locked' and stage>1. See F-13.
RLS: SELECT, INSERT, UPDATE (owner-chain via branches->projects). **No DELETE policy.**

## 4. prompt_templates  [002]
Table usage: R/W, used at runtime (prompt-template.ts:67,116,152,211; llm.ts:153,743; seed.ts:193; scripts/seed-templates.ts:208). Runtime path: `POST /api/llm/generate-from-template` (llm.ts:138-311) called by treatmentService.ts:94, beatService.ts:76, scriptService.ts:102.

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| name | TEXT | NOT NULL | UNIQUE(name, version) | ref |
| stage_number | INTEGER | NOT NULL | CHECK 1..12 | ref |
| version | TEXT | NOT NULL | semver text | ref (returned as promptTemplateVersion, stored only inside stage content JSON) |
| system_prompt | TEXT | NOT NULL | | ref |
| user_prompt_template | TEXT | NOT NULL | {variable} placeholders | ref |
| description | TEXT | | | ref (mapDbRowToTemplate, prompt-template.ts:405-417) |
| is_active | BOOLEAN | DEFAULT TRUE | | ref |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref |
| created_by | UUID | | FK auth.users(id) | W (prompt-template.ts:71, undefined from seeds) |

Indexes: stage_number, is_active, name. Triggers: none. RLS: SELECT where is_active = TRUE (any role, no TO clause); INSERT WITH CHECK auth.uid() IS NOT NULL; UPDATE/DELETE where created_by = auth.uid().

## 5. style_capsule_libraries  [004]
Table usage: R/W (styleCapsuleService.ts:422,457; routes/styleCapsules.ts:491,506,522,564; scripts/seed-style-capsules.ts:143). Frontend: none.
Columns: id UUID PK; user_id UUID FK auth.users ON DELETE CASCADE (NULL for presets); name TEXT NOT NULL; description TEXT; is_preset BOOLEAN DEFAULT FALSE; created_at, updated_at TIMESTAMPTZ DEFAULT NOW(). All 7 ref (updated_at R-only: styleCapsules.ts:529, set by trigger).
Indexes: user_id, is_preset. Triggers: style_capsule_libraries_updated_at -> update_style_capsule_libraries_updated_at().
RLS: SELECT (auth.uid()=user_id OR is_preset); INSERT (auth.uid()=user_id AND is_preset=FALSE); UPDATE and DELETE (same predicate).

## 6. style_capsules  [004; 005]
Table usage: R/W (routes/styleCapsules.ts:31,134,201,323,388,401,460,474; styleCapsuleService.ts:83,141,375; images.ts:148; ImageGenerationService.ts:642; assetExtractionService.ts:660). Frontend: none direct.

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 004 | ref |
| library_id | UUID | nullable (NOT NULL dropped in 005) | FK style_capsule_libraries(id) ON DELETE CASCADE | 004/005 | ref (written NULL, styleCapsules.ts:112) |
| user_id | UUID | | FK auth.users(id) ON DELETE CASCADE | 004 | ref |
| name | TEXT | NOT NULL | see constraints | 004 | ref |
| type | TEXT | NOT NULL | CHECK IN (writing, visual) | 004 | ref (validated styleCapsules.ts:102) |
| example_text_excerpts | TEXT[] | | | 004 | ref |
| style_labels | TEXT[] | | | 004 | ref |
| negative_constraints | TEXT[] | | | 004 | ref |
| freeform_notes | TEXT | | | 004 | ref |
| design_pillars | JSONB | | shape = DesignPillars, section J | 004 | ref (styleCapsules.ts:127,192; seed:197; read styleCapsuleService.ts:375) |
| reference_image_urls | TEXT[] | | | 004 | ref (styleCapsules.ts image upload/remove). Removing an image does not delete the storage object (styleCapsules.ts:474 TODO) |
| descriptor_strings | TEXT | | | 004 | ref |
| is_preset | BOOLEAN | DEFAULT FALSE | | 004 | ref |
| is_favorite | BOOLEAN | DEFAULT FALSE | | 004 | ref (styleCapsules.ts:284) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 004 | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger | 004 | ref (transformers/styleCapsule.ts:30) |

Constraints: 004 UNIQUE(library_id, name) (implicit name style_capsules_library_id_name_key), dropped in 005. 005 adds `style_capsules_library_name_unique` UNIQUE(library_id, name) DEFERRABLE INITIALLY DEFERRED (OK). **005 also adds `style_capsules_user_name_unique` as `ADD CONSTRAINT ... UNIQUE (user_id, name) WHERE library_id IS NULL`. PostgreSQL does not accept WHERE in a table-constraint UNIQUE, so this statement is a syntax error and the intended partial unique does not exist (see F-02).**
FKs from other tables: projects.writing_style_capsule_id, projects.visual_style_capsule_id, global_assets.visual_style_capsule_id (SET NULL), project_assets.visual_style_capsule_id (SET NULL), image_generation_jobs.visual_style_capsule_id (no action), style_capsule_applications.style_capsule_id (no action).
Indexes: library_id, user_id, type, is_preset, is_favorite.
Triggers: style_capsules_updated_at -> update_style_capsules_updated_at().
RLS: SELECT (owner OR is_preset OR library owned/preset); INSERT/UPDATE/DELETE require auth.uid()=user_id AND is_preset=FALSE and (for insert/update/delete) membership in an owned library via EXISTS.

## 7. style_capsule_applications  [004]
Table usage: **W-only**. Only live writer: stageStates.ts:262-270 (PUT stage-state when `styleCapsuleMetadata` is present). `StyleCapsuleService.recordApplication` (styleCapsuleService.ts:397-413) is never called. Frontend `src/lib/services/imageService.ts:76` calls `styleCapsuleService.recordApplication`, which does not exist on the frontend service (TypeError, caught and logged), so nothing is written from that path. Nothing reads the table.
Columns: id UUID PK; stage_state_id UUID FK stage_states(id) ON DELETE CASCADE; style_capsule_id UUID FK style_capsules(id) (no action); applied_at TIMESTAMPTZ DEFAULT NOW() (never set by code; DB default); injection_context JSONB (shape in section J).
Indexes: stage_state_id, style_capsule_id. Triggers: none. RLS: SELECT and INSERT only, owner via stage_states->branches->projects.

## 8. global_assets  [008; 024]
Table usage: R/W (routes/assets.ts:33-418 full CRUD; projectAssets.ts:470,1808,2092 reads; projectAssets.ts:2324 promote insert; ImageGenerationService.ts:869,879,946; routes/images.ts:103).

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 008 | ref |
| user_id | UUID | NOT NULL | FK auth.users(id) ON DELETE CASCADE | 008 | ref |
| name | TEXT | NOT NULL | | 008 | ref |
| asset_type | TEXT | NOT NULL | CHECK IN (character, prop, location) in 008; replaced by global_assets_asset_type_check IN (+extra_archetype) | 008/024 | ref. API accepts only 3 types (assets.ts:113,199) |
| description | TEXT | NOT NULL | | 008 | ref |
| image_prompt | TEXT | | | 008 | ref |
| image_key_url | TEXT | | | 008 | ref (written assets.ts:388, ImageGenerationService.ts:881) |
| visual_style_capsule_id | UUID | | FK style_capsules(id) ON DELETE SET NULL | 008 | ref |
| voice_profile_id | TEXT | | comment: ElevenLabs id | 008 | **W-only**: assets.ts:152,245; no reader; no UI sends it (type-only, src/types/asset.ts:73,84) |
| version | INTEGER | DEFAULT 1 | | 008 | ref. incremented in code (assets.ts:237,389; ImageGenerationService.ts:882), non-atomic read-then-write |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 008 | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger | 008 | UNREF in code (set only by trigger) |
| promoted_from_project_id | UUID | | FK projects(id) (no action) | 008 | **W-only** (assets.ts:153; projectAssets.ts:2333 on promote). Never read |

Indexes: user_id, asset_type, created_at DESC, (user_id, name). Triggers: update_global_assets_timestamp -> update_global_assets_updated_at().
RLS: SELECT/INSERT/UPDATE/DELETE, auth.uid() = user_id.
Delete: assets.ts:322 refuses if any project_assets row references it (assets.ts:291-319). The SET NULL on project_assets.global_asset_id is therefore not reachable via the API (backend/scripts/test-style-capsule-influence.ts:209,228 deletes directly).

## 9. project_assets  [008; 009; 023; 024; 039; 042]
Table usage: R/W, the most-used asset table (~50 call sites in projectAssets.ts; sceneAssets.ts:213-1507; projects.ts:1636,2257,2345,3355; locationResolverService.ts:311; projectAssetAttemptsService.ts:77,115,231; nested embeds e.g. sceneAssets.ts:98, shotAssetAssignmentService.ts:56). Also written by streamline_commit (042:192-209, 043:370-386). Frontend: no direct access.

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 008 | ref |
| project_id | UUID | NOT NULL | FK projects(id) ON DELETE CASCADE | 008 | ref (projectAssets.ts:535) |
| branch_id | UUID | NOT NULL | FK branches(id) ON DELETE CASCADE | 008 | ref (projectAssets.ts:404) |
| global_asset_id | UUID | | FK global_assets(id) ON DELETE SET NULL | 008 | ref (projectAssets.ts:453,1910,1952; AssetDrawer.tsx:258) |
| source_version | INTEGER | | | 008 | ref (R: projectAssets.ts:451,490; W: 1911,1954,2145) |
| name | TEXT | NOT NULL | | 008 | ref |
| asset_type | TEXT | NOT NULL | CHECK IN (character, prop, location, extra_archetype) (project_assets_asset_type_check) | 008/024 | ref (validated projectAssets.ts:619,1143) |
| description | TEXT | NOT NULL | | 008 | ref. **NULL-write risk**: see F-16 |
| image_prompt | TEXT | | | 008 | ref (R projectAssets.ts:1240; W 612,1048,1914,1958,2182) |
| image_key_url | TEXT | | | 008 | ref (heavily) |
| visual_style_capsule_id | UUID | | FK style_capsules(id) ON DELETE SET NULL | 008 | ref (projectAssets.ts:126,1246) |
| locked | BOOLEAN | DEFAULT FALSE | comment: Stage 5 gatekeeper | 008 | ref. Set TRUE at PA:1565,1729 and sceneAssets.ts:933; set FALSE only on insert; no unlock path. Gates delete/merge/split/sync/PUT-lock only; not gated for image changes (see F-17) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 008 | UNREF except via select('*') |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger | 008 | W-only (PA:1917 explicit write) |
| last_synced_at | TIMESTAMPTZ | | | 009 | **W-only** (PA:2146). Never read |
| overridden_fields | TEXT[] | DEFAULT '{}' | | 009 | ref (R 574,644,2125; W 646,1916,1961,2227) |
| deferred | BOOLEAN | DEFAULT FALSE | | 023 | ref (PA:352,597 W; PA:1704 R; assetInheritanceService.ts:188,202; Stage5Assets.tsx:205) |
| scene_numbers | INTEGER[] | DEFAULT '{}' | | 023 | ref (R PA:877,1021; sceneAssets.ts:259; W 353,885,1050,1066,1189; sceneAssets.ts:266,935; streamline RPC) |
| source | TEXT | DEFAULT 'extracted' | CHECK IN (extracted, manual, cloned, streamline_import) (project_assets_source_check) | 023/042 | ref. Literal 'cloned' is never written (clone insert omits it, PA:1950-1963) |
| style_outdated | BOOLEAN | DEFAULT FALSE | | 024 | ref (W PA:1607,1651; ImageGenerationService.ts:409; R frontend Stage5Assets.tsx:1153 only) |
| location_aliases | JSONB | NOT NULL DEFAULT '[]' | CHECK jsonb_typeof = 'array' (chk_project_assets_location_aliases_array); GIN partial on asset_type='location' | 039 | ref (R locationResolverService.ts:312; W PA:636). Shape section J |

Indexes: project_id, branch_id, global_asset_id, asset_type (008); idx_project_assets_last_synced (009, partial global_asset_id NOT NULL, desc); idx_project_assets_location_aliases_gin (039).
No UNIQUE constraint on (project_id, name); duplicates are allowed at the DB level.
Triggers: update_project_assets_timestamp -> update_project_assets_updated_at().
RLS: SELECT/INSERT/UPDATE/DELETE, owner via projects.user_id.
Cascade parent of: project_asset_generation_attempts, asset_angle_variants, location_views, scene_asset_instances, scene_asset_suggestions(SET NULL), location_match_events.result_location_asset_id (SET NULL), shots.location_asset_id (SET NULL).

## 10. project_asset_generation_attempts  [023]
Table usage: R/W, only through projectAssetAttemptsService.ts:27-223 (callers PA:1345 upload, ImageGenerationService.ts:400 generated). Frontend reads `source` only (ProjectAssetCarousel.tsx:147).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| project_asset_id | UUID | NOT NULL | FK project_assets(id) ON DELETE CASCADE | ref |
| image_url | TEXT | NOT NULL | | ref |
| storage_path | TEXT | | | ref |
| source | TEXT | NOT NULL | CHECK IN (generated, uploaded) | ref. Only 'generated' and 'uploaded' written (valid) |
| is_selected | BOOLEAN | DEFAULT FALSE | UNIQUE partial index idx_project_attempts_one_selected WHERE is_selected | ref |
| original_filename | TEXT | | | **W-only** (:62) |
| file_size_bytes | INTEGER | | | **W-only** (:63) |
| mime_type | TEXT | | | **W-only** (:64) |
| attempt_number | INTEGER | NOT NULL DEFAULT 1 | | ref |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref (order) |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger | UNREF |

Indexes: project_asset_id; (project_asset_id, created_at DESC); partial unique is_selected. Trigger: update_project_asset_attempts_timestamp.
RLS: SELECT/INSERT/UPDATE/DELETE via project_assets->projects.
Cap: MAX_ATTEMPTS = 4 (projectAssetAttemptsService.ts:9; enforceAttemptCap deletes one oldest non-selected row when count >= 4, ~:177-195). Selected attempts cannot be deleted (:148). Contrast scene_asset_generation_attempts cap = 8 (sceneAssetAttemptsService.ts:8).

## 11. asset_angle_variants  [025]
Table usage: R/W (PA:2498 read, 2594 upsert, 2662, 2681 delete; IGS:276,500,577; projects.ts:3671; frames.ts:1737; continuityCompositionService.ts:549; shotAssetAssignmentService.ts:62 nested).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| project_asset_id | UUID | NOT NULL | FK project_assets(id) ON DELETE CASCADE; UNIQUE(project_asset_id, angle_type) | ref |
| angle_type | TEXT | NOT NULL | CHECK IN (front, side, three_quarter, back) | ref (validated PA:2530) |
| image_url | TEXT | | | ref (IGS:502) |
| storage_path | TEXT | | | ref (IGS:503; PA:2663 delete) |
| image_generation_job_id | UUID | FK image_generation_jobs(id) (no action) | | **W-only** (IGS:504) |
| prompt_snapshot | TEXT | | | **W-only** (IGS:277) |
| status | TEXT | NOT NULL DEFAULT 'pending' | CHECK IN (pending, generating, completed, failed) | ref (projects.ts:3674; frames.ts:1737 and shotAssetAssignmentService.ts:62 do not filter by status) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref (PA:2501) |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger | UNREF |

Indexes: project_asset_id; status. Trigger: update_angle_variants_updated_at -> update_updated_at_column() (defined in 025). RLS: ALL, USING via project_assets->projects (no WITH CHECK, so USING applies to writes).

## 12. location_views  [038; 040]
Table usage: R/W (PA:2739-3363; projects.ts:1672,1803,1838-1873,2243,3705; continuityCompositionService.ts:580; locationResolverService.ts:327). Frontend: via HTTP only.

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 038 | ref |
| project_asset_id | UUID | NOT NULL | FK project_assets(id) ON DELETE CASCADE; UNIQUE(project_asset_id, name) | 038 | ref |
| name | TEXT | NOT NULL | "establishing", "direction_N" etc. | 038 | ref (PA:2822) |
| alias | TEXT | | | 038 | ref (PA:2823) |
| description | TEXT | | | 038 | ref (PA:2824) |
| view_type | TEXT | NOT NULL | CHECK IN (establishing, direction) | 038 | ref (R projects.ts:2252, PA:3351) |
| camera_distance | TEXT | DEFAULT 'wide' | CHECK IN (wide, medium, close) | 038 | ref (R PA:3390) |
| camera_height | TEXT | DEFAULT 'eye_level' | CHECK IN (eye_level, high_angle, low_angle, overhead, ground_level) | 038 | ref (R PA:3391) |
| image_key_url | TEXT | | | 038 | ref (W PA:3026,3107,3246; R PA:3158,3356) |
| is_primary | BOOLEAN | DEFAULT false | partial index WHERE is_primary | 038 | ref (PA:2803,3366) |
| source | TEXT | DEFAULT 'user' | CHECK IN (user, established, stage7_inferred) | 038 | ref (R projects.ts:1684) |
| established_from_scene | TEXT | | display string | 038 | **W-only** (PA:3248) |
| established_from_shot_id | UUID | | **no FK** (comment says FK to shot record) | 038 | **W-only** (PA:3249) |
| sort_order | INT | DEFAULT 0 | | 038 | ref (PA:2742,2830) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 038 | ref (PA:2743) |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger location_views_updated_at -> update_shots_updated_at() | 038 | W-only (PA:3250) |
| promoted_from_frame_id | UUID | FK frames(id) ON DELETE SET NULL | | 040 | **W-only** (PA:3253) |

Indexes: project_asset_id; partial is_primary; partial promoted_from_frame_id.
RLS: SELECT/INSERT/UPDATE/DELETE, owner via project_assets->branches->projects.
Referenced by: shots.camera_direction_id (SET NULL), frames.promoted_to_view_id (SET NULL).
Cap/validation: POST PA:2825-2829 passes view_type, camera_distance, camera_height, source through without enum checks (DB CHECK is the only guard). Shot-to-view copy (PA:3257-3258) copies shot camera fields which have no CHECK (see F-18).

## 13. location_match_events  [039]
Table usage: **W-only**. Insert at locationResolverService.ts:485-501; callers projects.ts:1951,2142,2488,2606,2746 and scripts/backfill-shot-locations.ts:203. Nothing reads it (backend, frontend, scripts).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | W |
| project_id | UUID | NOT NULL | FK projects(id) ON DELETE CASCADE | W |
| branch_id | UUID | NOT NULL | FK branches(id) ON DELETE CASCADE | W |
| scene_id | UUID | | FK scenes(id) ON DELETE CASCADE | W |
| shot_id | UUID | | FK shots(id) ON DELETE CASCADE | W |
| raw_setting | TEXT | | | W |
| scene_expected_location | TEXT | | | W |
| camera_direction_id | UUID | | no FK | W |
| result_location_asset_id | UUID | | FK project_assets(id) ON DELETE SET NULL | W (only when applied, :494) |
| result_confidence | NUMERIC(4,3) | | CHECK 0..1 | W |
| result_source | TEXT | | CHECK IN (manual, resolver_exact, resolver_alias, resolver_fuzzy, stage7_inferred, legacy_backfill, camera_direction_parent) | W (values resolver_exact/alias/fuzzy, camera_direction_parent, valid) |
| result_reason | TEXT | | | W |
| is_ambiguous | BOOLEAN | NOT NULL DEFAULT FALSE | | W |
| was_applied | BOOLEAN | NOT NULL DEFAULT FALSE | | W |
| candidates | JSONB | NOT NULL DEFAULT '[]' | CHECK jsonb_typeof = 'array' | W. Shape section J |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | W |

Indexes: (project_id, created_at DESC); (scene_id, created_at DESC) partial; (result_location_asset_id) partial. Triggers: none. RLS: SELECT and INSERT via projects.user_id; no UPDATE/DELETE policy.
Cascade-deleted when a shot is deleted (projects.ts:2713,2715,2833) — see F-19.

## 14. scenes  [003; 011; 013; 014; 027; quickies add_stage_locks]
Table usage: R/W (projects.ts:1042,1433,1481,1458,2873,2967,3041,3142; sceneAssets.ts many; sceneStageLocks.ts; shotAssignments.ts:53; checkout.ts:31,116,167; videoGenerationService.ts:528; assetExtractionService.ts:146; contextManager.ts:216). Frontend direct: `src/hooks/useSceneInfo.ts:26` selects `scene_number, slug` by id (RLS applies).

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 003 | ref |
| branch_id | UUID | NOT NULL | FK branches(id) ON DELETE CASCADE; UNIQUE(branch_id, scene_number) | 003 | ref |
| scene_number | INTEGER | NOT NULL | | 003 | ref |
| slug | TEXT | NOT NULL | | 003 | ref |
| script_excerpt | TEXT | NOT NULL | | 003 | ref |
| status | TEXT | NOT NULL DEFAULT 'draft' | CHECK IN (draft, shot_list_ready, frames_locked, video_complete, outdated, continuity_broken) (scenes_status_check, rewritten 014) | 003/014 | ref. Written values in code: 'video_complete' (videoGenerationService.ts:528), 'shot_list_ready'/'draft' via trigger. 'frames_locked', 'outdated', 'continuity_broken' never written as scene status (outdated appears only inside stage_locks JSON) |
| end_state_summary | TEXT | | | 003 | **R-only** (read at contextManager.ts:216,266; projects.ts:1042,1088,1116,1824; no backend writer) |
| end_frame_id | UUID | | **no FK** (003 comment "to be added in future migration"; never added) | 003 | **UNREF** |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 003 | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger scenes_updated_at -> update_scenes_updated_at() | 003 | ref |
| expected_characters | TEXT[] | | cache; see 011 comments | 011 | ref |
| expected_location | TEXT | | cache | 011 | ref |
| expected_props | TEXT[] | | cache | 011 | ref (projects.ts:1374,1458) |
| dependencies_extracted_at | TIMESTAMPTZ | | | 011 | ref |
| end_frame_thumbnail_url | TEXT | | comment: Stage 10/12 | 013 | ref (R projects.ts:1042,1083 ; no writer found in non-test backend/src) |
| shot_list_locked_at | TIMESTAMPTZ | | trigger source | 014 | ref. Written alongside `stage_locks` for backward compatibility (sceneStageLocks.ts:116-118,256-258,352) |
| is_deferred | BOOLEAN | NOT NULL DEFAULT FALSE | | 027 | ref (projects.ts:1119,1151-1157) |
| stage_locks | JSONB | DEFAULT '{}' | NOT in any migration; only in `quickies-sql/add_stage_locks.sql` (see F-03) | quickies | ref in 6 files (sceneStageLocks.ts, projects.ts:2873,2967,3041,3142, shotAssetAssignmentService.ts:321, frontend ProjectView.tsx:519, Stage7ShotList.tsx:700). Shape section J |

Indexes: branch_id, status, scene_number, dependencies_extracted_at, idx_scenes_shot_list_locked (partial), idx_scenes_is_deferred (partial).
Triggers: scenes_updated_at BEFORE UPDATE -> update_scenes_updated_at(); trg_sync_scene_lock_status BEFORE UPDATE -> fn_sync_scene_lock_status() (see T). A non-null -> null change of shot_list_locked_at forces status 'draft' only when old status was 'shot_list_ready'.
RLS: 4 owner-chain policies via branches->projects.
Delete: projects.ts:1433 deletes scenes removed from the script during re-extraction. Cascades to shots, scene_asset_instances, scene_asset_suggestions, transformation_events, image_generation_jobs, video_generation_jobs, frames via shots, and text rows are NOT cascaded (no FK).

## 15. shots  [006; 012; 018; 028; 029; 030; 031; 038; 039; 040]
Table usage: R/W (projects.ts: insert 1943, split 2558/2599, merge 2713/2715/2740, delete 2833, camera/prompt updates 3523-3857; frames.ts:899-922,979-980; shotExtractionService; transformationEventService.ts:452 orders by `shots(shot_order)`).

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 006 | ref |
| scene_id | UUID | NOT NULL | FK scenes(id) ON DELETE CASCADE; UNIQUE(scene_id, shot_id) | 006 | ref |
| shot_id | TEXT | NOT NULL | e.g. "1A" | 006 | ref |
| duration | INTEGER | NOT NULL DEFAULT 8 | seconds | 006 | ref |
| dialogue | TEXT | DEFAULT '' | | 006 | ref |
| action | TEXT | NOT NULL | | 006 | ref |
| characters_foreground | TEXT[] | DEFAULT '{}' | | 006 | ref |
| characters_background | TEXT[] | DEFAULT '{}' | | 006 | ref |
| setting | TEXT | NOT NULL | | 006 | ref (raw setting used by resolver) |
| camera | TEXT | NOT NULL | | 006 | ref (projects.ts:206,1919,2587) |
| continuity_flags | TEXT[] | DEFAULT '{}' | | 006 | ref |
| beat_reference | TEXT | | | 006 | ref |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 006 | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger shots_updated_at -> update_shots_updated_at() | 006 | ref (explicit writes, frames.ts:922; textFieldVersionService.ts:230) |
| shot_order | INTEGER | NOT NULL DEFAULT 0 | index (scene_id, shot_order) | 012 | ref (14 files). Backfilled by ROW_NUMBER per scene (012:8-13) |
| frame_prompt | TEXT | | | 018 | ref (projects.ts:3857 etc.) |
| video_prompt | TEXT | | | 018 | ref |
| requires_end_frame | BOOLEAN | DEFAULT TRUE | user override | 018 | ref (3 files) |
| compatible_models | TEXT[] | DEFAULT '{"Veo3"}' | | 018 | ref (projects.ts:3238,3261,3523,3559 only) |
| prompts_generated_at | TIMESTAMPTZ | | partial index | 018 | ref (projects.ts:3240,3263,3560,3857 only) |
| reference_image_order | JSONB | DEFAULT NULL | shape section J | 028 | ref (frames.ts:899-922) |
| end_frame_prompt | TEXT | DEFAULT NULL | | 028 | ref (7 files) |
| ai_recommends_end_frame | BOOLEAN | DEFAULT NULL | backfilled from requires_end_frame (029:6-7) | 029 | ref (2 files) |
| transformation_flags | JSONB | DEFAULT NULL | "raw LLM detection output" (030:150) | 030 | ref (shotExtractionService.ts:68,375) |
| start_continuity | TEXT | DEFAULT 'none' | CHECK IN (none, match, camera_change) | 031 | ref (5 files) |
| ai_start_continuity | TEXT | | CHECK IN (none, match, camera_change) | 031 | ref (2 files) |
| continuity_frame_prompt | TEXT | | | 031 | ref (4 files) |
| camera_distance | TEXT | | no CHECK | 038 | ref (14 files); extraction normalises (shotExtractionService.ts:397-405), shot PUT accepts any (projects.ts:2421-2426) |
| camera_height | TEXT | | no CHECK | 038 | ref (14 files), same |
| camera_movement | TEXT | | free text | 038 | ref (8 files) |
| camera_direction_id | UUID | | FK location_views(id) ON DELETE SET NULL; partial index | 038 | ref (10 files) |
| location_asset_id | UUID | | FK project_assets(id) ON DELETE SET NULL; partial index; (scene_id, location_asset_id) index | 039 | ref |
| location_match_confidence | NUMERIC(4,3) | | CHECK NULL or 0..1 | 039 | ref (10 files) |
| location_match_source | TEXT | | CHECK IN (manual, resolver_exact, resolver_alias, resolver_fuzzy, stage7_inferred, legacy_backfill, camera_direction_parent) | 039 | ref (10 files) |
| location_match_notes | TEXT | | | 039 | ref (8 files) |
| end_frame_reference_image_order | JSONB | | added by 039 as "compatibility fix": code already used it before any migration created it (039:75-78) | 039 | ref (frames.ts:980) |
| selected_continuity_base_frame_id | UUID | | FK frames(id) ON DELETE SET NULL; partial index | 040 | ref (3 files) |

Indexes: scene_id; shot_id; (scene_id, shot_order); prompts_generated_at partial; camera_direction_id partial; location_asset_id partial; (scene_id, location_asset_id); location_match_source partial; selected_continuity_base_frame_id partial.
Triggers: shots_updated_at -> update_shots_updated_at().
RLS: 4 owner-chain policies via scenes->branches->projects.
Delete/recreate: shot extraction route (`POST /:id/scenes/:sceneId/shots/extract`, projects.ts:1711-1977) inserts at :1943 with NO preceding delete and no existing-shot guard in the handler; a second run with the same shot_id values violates UNIQUE(scene_id, shot_id) (see F-20). Shot delete cascades frames, video_generation_jobs, transformation_events (trigger_shot_id), shot_asset_assignments, location_match_events, image_generation_jobs; SET NULL on transformation_events.completion_shot_id; frames.previous_frame_id/generated_from_frame_id are not affected by shot delete except via shot cascade. shot split deletes the original (projects.ts:2558) and re-inserts.

## 16. frames  [019; 040]
Table usage: R/W (frames.ts 1109-1201, 1465 storage, 2290-2402; frameGenerationService.ts:181,376,383,503,515,654; projects.ts:921,3073,3107; sceneStageLocks.ts:209; continuityCompositionService). No direct DELETE route found; rows removed only by cascade (shot/scene delete).

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 019 | ref |
| shot_id | UUID | NOT NULL | FK shots(id) ON DELETE CASCADE; UNIQUE(shot_id, frame_type) | 019 | ref |
| frame_type | TEXT | NOT NULL | CHECK IN (start, end) | 019 | ref |
| status | TEXT | NOT NULL DEFAULT 'pending' | CHECK IN (pending, generating, generated, approved, rejected) | 019 | ref. **Code writes 'invalidated' (projects.ts:3108), violates CHECK; error not captured (F-04)** |
| image_url | TEXT | | | 019 | ref (4 files+) |
| storage_path | TEXT | | | 019 | ref |
| current_job_id | UUID | FK image_generation_jobs(id) ON DELETE SET NULL | | 019 | ref (2 files) |
| generation_count | INTEGER | DEFAULT 0 | | 019 | ref (2 files) |
| total_cost_credits | NUMERIC(10,4) | DEFAULT 0 | | 019 | ref (3 files) |
| previous_frame_id | UUID | FK frames(id) ON DELETE SET NULL | | 019 | ref (2 files) |
| prompt_snapshot | TEXT | | | 019 | ref (8 files, shared name) |
| inpaint_count | INTEGER | DEFAULT 0 | | 019 | ref (2 files) |
| last_inpaint_mask_path | TEXT | | | 019 | ref (2 files) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 019 | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger frames_updated_at -> update_frames_updated_at() | 019 | ref |
| generated_at | TIMESTAMPTZ | | | 019 | ref (4 files) |
| approved_at | TIMESTAMPTZ | | | 019 | ref (3 files) |
| generated_from_frame_id | UUID | FK frames(id) ON DELETE SET NULL; partial index | lineage | 040 | ref (3 files) |
| continuity_base_role | TEXT | CHECK NULL or IN (reuse_match, reuse_edit, camera_change_ref, match_copy, manual) (chk_frames_continuity_base_role) | | 040 | ref (2 files) |
| promoted_to_view_id | UUID | FK location_views(id) ON DELETE SET NULL; partial index | | 040 | ref (2 files) |

Indexes: shot_id, status, current_job_id, previous_frame_id, generated_from_frame_id partial, promoted_to_view_id partial.
RLS: 4 owner-chain policies via shots->scenes->branches->projects.

## 17. frame_links  [034; 035]
Table usage: R/W (12 `.from` references across backend/src). Reactive link semantics documented in 034 header; code-level behaviour not traced in this slice.

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 034 | ref |
| source_frame_id | UUID | NOT NULL | FK frames(id) ON DELETE CASCADE; index | 034 | ref |
| target_frame_id | UUID | NOT NULL | FK frames(id) ON DELETE CASCADE; index; UNIQUE (frame_links_target_frame_id_key) | 034/035 | ref |
| link_type | TEXT | NOT NULL DEFAULT 'match' | CHECK IN (match, reference) (frame_links_link_type_check, 035) | 034/035 | ref |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | | 034 | ref |

No updated_at. No trigger. RLS: SELECT (owner via source_frame_id chain); FOR ALL with USING only (owner via source_frame_id). Original 034 UNIQUE(target_frame_id, link_type) dropped by 035 and replaced by UNIQUE(target_frame_id).

## 18. image_generation_jobs  [007; 010; 016; 026; 032]
Table usage: R/W (ImageGenerationService.ts: insert 150,761; updates; storage_path writes 402,468,503,524,540,894; frames.ts:1455; scripts none). Frontend: none direct.

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 007 | ref |
| idempotency_key | TEXT | | see indexes | 007 | ref (ImageGenerationService.ts:150,696,761) |
| project_id | UUID | FK projects(id) ON DELETE CASCADE; NULL allowed | | 007/010 | ref |
| branch_id | UUID | FK branches(id) ON DELETE CASCADE; NULL allowed | | 007/010 | ref |
| scene_id | UUID | FK scenes(id) ON DELETE CASCADE | | 007 | ref |
| shot_id | UUID | FK shots(id) ON DELETE CASCADE | | 007 | ref |
| asset_id | UUID | **no FK** (comment) | | 007 | ref (used for global-asset idempotency index and job lookups) |
| job_type | TEXT | NOT NULL | CHECK IN (master_asset, start_frame, end_frame, inpaint, scene_asset, angle_variant, transformation_post) (image_generation_jobs_job_type_check, last set 032) | 007/016/026/032 | ref. Written values: master_asset, scene_asset, angle_variant, transformation_post, start_frame, end_frame |
| status | TEXT | NOT NULL DEFAULT 'queued' | CHECK IN (queued, processing, generating, uploading, completed, failed) | 007 | ref |
| failure_stage | TEXT | | CHECK IN (generating, uploading, persisting) | 007 | ref (2 files) |
| attempt_count | INTEGER | DEFAULT 0 | | 007 | ref |
| retry_count | INTEGER | DEFAULT 0 | | 007 | **UNREF** (no non-test reference) |
| max_retries | INTEGER | DEFAULT 3 | | 007 | ref (2 files) |
| last_attempt_at | TIMESTAMPTZ | | | 007 | **W-only** (ImageGenerationService.ts:304,810) |
| error_code | TEXT | | comment: TEMPORARY/PERMANENT/RATE_LIMIT/AUTH_ERROR | 007 | ref |
| error_message | TEXT | | | 007 | ref |
| prompt | TEXT | NOT NULL | | 007 | ref |
| visual_style_capsule_id | UUID | FK style_capsules(id) (no action) | | 007 | ref |
| width | INTEGER | DEFAULT 512 | | 007 | ref |
| height | INTEGER | DEFAULT 512 | | 007 | ref |
| storage_path | TEXT | | path in asset-images bucket (see section S) | 007 | ref |
| public_url | TEXT | | | 007 | ref (4 files) |
| cost_credits | NUMERIC(10,4) | | | 007 | ref (8 files, shared name) |
| estimated_cost | NUMERIC(10,4) | | | 007 | ref (3 files) |
| provider_metadata | JSONB | | raw provider response | 007 | ref (2 files) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 007 | ref |
| processing_started_at | TIMESTAMPTZ | | | 007 | ref (2 files) |
| generating_started_at | TIMESTAMPTZ | | | 007 | **W-only** (ImageGenerationService.ts:349,820) |
| uploading_started_at | TIMESTAMPTZ | | | 007 | **W-only** (ImageGenerationService.ts:363,833) |
| completed_at | TIMESTAMPTZ | | | 007 | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | **no trigger in any migration** | 007 | ref (explicit writes) |

Indexes: project_id; status; branch_id; created_at; idx_image_jobs_idempotency UNIQUE(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND project_id IS NOT NULL (010); idx_image_jobs_global_idempotency UNIQUE(asset_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND project_id IS NULL (010).
RLS: SELECT only, "Users can view own image generation jobs": project-based (project owner) OR global (project_id NULL and global_assets.id = asset_id owned by auth.uid()). **No INSERT/UPDATE/DELETE policy for user JWTs.**
Referenced by: frames.current_job_id, scene_asset_generation_attempts.image_generation_job_id, asset_angle_variants.image_generation_job_id, scene_asset_generation_attempts (FK SET NULL).

## 19. video_generation_jobs  [021]
Table usage: R/W (videoGenerationService.ts:255-666; VideoJobExecutor.ts:102; Veo3Provider.ts; projects.ts:3078 queries `videos` instead, see X). Frontend: none direct.

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| project_id | UUID | NOT NULL | FK projects(id) ON DELETE CASCADE | ref |
| branch_id | UUID | NOT NULL | FK branches(id) ON DELETE CASCADE | ref |
| scene_id | UUID | NOT NULL | FK scenes(id) ON DELETE CASCADE | ref |
| shot_id | UUID | NOT NULL | FK shots(id) ON DELETE CASCADE | ref (videoGenerationService.ts:362 etc.) |
| model_variant | TEXT | NOT NULL DEFAULT 'veo_3_1_fast' | CHECK IN (veo_3_1_fast, veo_3_1_standard) | ref (2 files) |
| status | TEXT | NOT NULL DEFAULT 'queued' | CHECK IN (queued, processing, generating, uploading, completed, failed) | ref |
| start_frame_id | UUID | NOT NULL | FK frames(id) (no action) | ref |
| end_frame_id | UUID | FK frames(id) (no action) | | ref (videoGenerationService.ts:362,649) |
| start_frame_url | TEXT | NOT NULL | snapshot | ref (2 files) |
| end_frame_url | TEXT | | snapshot | ref (2 files) |
| video_prompt_snapshot | TEXT | NOT NULL | | ref |
| frame_prompt_snapshot | TEXT | | | ref |
| duration_seconds | INTEGER | NOT NULL | | ref (2 files) |
| estimated_cost | NUMERIC(10,4) | NOT NULL | | ref |
| actual_cost | NUMERIC(10,4) | | | ref (R 255,264; W 491) |
| video_url | TEXT | | | ref (W 489; R 657) |
| storage_path | TEXT | | | ref |
| error_code | TEXT | | | ref |
| error_message | TEXT | | | ref |
| attempt_count | INTEGER | DEFAULT 0 | | ref |
| max_retries | INTEGER | DEFAULT 3 | | ref |
| provider_job_id | TEXT | | | ref (W 494, 580 null; R 663) |
| provider_metadata | JSONB | | | ref |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref |
| queued_at | TIMESTAMPTZ | DEFAULT NOW() | | **R-only** (videoGenerationService.ts:666; default-only write) |
| processing_started_at | TIMESTAMPTZ | | | ref |
| completed_at | TIMESTAMPTZ | | | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger video_generation_jobs_updated_at | ref |

Indexes: project_id, scene_id, shot_id, status, created_at, start_frame_id.
Triggers: video_generation_jobs_updated_at -> update_video_generation_jobs_updated_at().
RLS: SELECT, INSERT, UPDATE via projects.user_id. **No DELETE policy.**

## 20. scene_asset_instances  [015; 017; 022]
Table usage: R/W (sceneAssets.ts:225 create, 582-656 PUT, 1109 populate, 1326/1427/1635/1755 updates, 690 delete; assetInheritanceService.ts:210,275; ImageGenerationService.ts:484; projectAssets.ts:805,867,1099).

| Column | Type | Null / default | Constraints | mig | Usage |
|---|---|---|---|---|---|
| id | UUID | PK | | 015 | ref |
| scene_id | UUID | NOT NULL | FK scenes(id) ON DELETE CASCADE; UNIQUE(scene_id, project_asset_id) | 015 | ref |
| project_asset_id | UUID | NOT NULL | FK project_assets(id) ON DELETE CASCADE | 015 | ref |
| description_override | TEXT | | NULL = inherited | 015 | ref (written sceneAssets.ts:631, textFieldVersionService.ts:37,233; read assetInheritanceService.ts:146) |
| image_key_url | TEXT | | | 015 | ref (written sceneAssetAttemptsService.ts:107; read ImageGenerationService.ts:247) |
| status_tags | TEXT[] | | | 015 | ref (written sceneAssets.ts:637; read ImageGenerationService.ts:220) |
| carry_forward | BOOLEAN | DEFAULT TRUE | | 015 | ref (read assetInheritanceService.ts:114, contextManager.ts:249 falls back to false, promptGenerationService.ts:698) |
| inherited_from_instance_id | UUID | FK scene_asset_instances(id) ON DELETE SET NULL | instance id of prior-scene source; NULL for bootstrap | 015 | ref (written assetInheritanceService.ts:271; read 334,contextManager.ts:250,promptGenerationService.ts:697, UI) |
| effective_description | TEXT | | computed: override ?? base ?? '' (assetInheritanceService.ts:272) | 015 | ref. **Stale-prone**: not recomputed when project_assets.description changes (F-21) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | 015 | ref (ordering sceneAssets.ts:104) |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger update_scene_asset_instances_timestamp | 015 | ref (textFieldVersionService.ts:230) |
| modification_count | INTEGER | DEFAULT 0 | incremented by trigger on every UPDATE | 017 | R-only in frontend (Stage8VisualDefinition.tsx:72, SceneAssetListPanel.tsx:62); never written by code; see F-22 |
| last_modified_field | TEXT | | set by trigger (first match) | 017 | R-only in frontend (VisualStateEditorPanel.tsx:434,781-782) |
| modification_reason | TEXT | | | 017 | ref (written sceneAssets.ts:643 from body `modificationReason`; read VisualStateEditorPanel.tsx:783) |
| use_master_as_is | BOOLEAN | DEFAULT FALSE | | 022 | ref (written sceneAssets.ts:1329,1337,1428,1434,1632,1752; read 1751) |
| selected_master_reference_url | TEXT | | | 022 | ref (written sceneAssets.ts:1629; read 1299; ImageGenerationService.ts:241) |
| selected_master_reference_source | TEXT | CHECK IN (stage5_master, prior_scene_instance, transformation) (named scene_asset_instances_selected_master_reference_source_check, rewritten 037) | | 022/037 | W-only in backend (sceneAssets.ts:1630 from unvalidated body); frontend type only (src/types/scene.ts:135) |
| selected_master_reference_instance_id | UUID | FK scene_asset_instances(id) ON DELETE SET NULL | | 022 | W-only (sceneAssets.ts:1631) |

Indexes: scene_id; project_asset_id; inherited_from_instance_id; (scene_id, project_asset_id).
Triggers: update_scene_asset_instances_timestamp (BEFORE UPDATE, updated_at); scene_asset_modification_tracker (BEFORE UPDATE -> track_scene_asset_modifications()).
RLS: 4 owner-chain policies via scenes->branches->projects.
Cascade parent of: scene_asset_generation_attempts, transformation_events, shot_asset_assignments.

## 21. scene_asset_generation_attempts  [022]
Table usage: R/W (sceneAssetAttemptsService.ts:28-236; sceneAssets.ts:1311,1413,1539,1730; ImageGenerationService.ts:456-478).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| scene_asset_instance_id | UUID | NOT NULL | FK scene_asset_instances(id) ON DELETE CASCADE | ref |
| image_url | TEXT | NOT NULL | | ref |
| storage_path | TEXT | | | ref |
| source | TEXT | NOT NULL | CHECK IN (generated, uploaded, master_copy) | ref (all three written, valid) |
| is_selected | BOOLEAN | DEFAULT FALSE | partial unique idx_attempts_one_selected | ref |
| image_generation_job_id | UUID | FK image_generation_jobs(id) ON DELETE SET NULL | | W-only |
| prompt_snapshot | TEXT | | | ref (frontend shows, GenerationAttemptCarousel.tsx:182) |
| cost_credits | NUMERIC(10,4) | | | ref (frontend) |
| original_filename | TEXT | | | ref (frontend) |
| file_size_bytes | INTEGER | | | W-only |
| mime_type | TEXT | | | W-only |
| copied_from_url | TEXT | | | W-only (master_copy path) |
| attempt_number | INTEGER | NOT NULL DEFAULT 1 | | ref |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger | UNREF |

Indexes: scene_asset_instance_id; (instance_id, created_at DESC); image_generation_job_id; partial unique is_selected.
Trigger: update_generation_attempts_timestamp. RLS: 4 owner-chain policies via scene_asset_instances->scenes->branches->projects.
Cap: MAX_ATTEMPTS = 8 (sceneAssetAttemptsService.ts:8); enforceAttemptCap deletes one oldest non-selected row per call (:161-188), before the upload in the upload path (sceneAssets.ts:1705 vs 1713).

## 22. scene_asset_suggestions  [024]
Table usage: R/W (sceneAssets.ts:746 list, 793-805 bulk insert, 847-857 patch). Frontend via HTTP only (sceneAssetService.ts:878,908,942).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | | ref |
| scene_id | UUID | NOT NULL | FK scenes(id) ON DELETE CASCADE; index | ref |
| asset_id | UUID | | FK project_assets(id) ON DELETE SET NULL | **UNREF** (insert omits it, sceneAssets.ts:793-800) |
| name | TEXT | NOT NULL | | ref |
| asset_type | TEXT | NOT NULL | CHECK IN (character, location, prop) (no extra_archetype) | ref. Value comes from LLM output unvalidated (sceneAssets.ts:715 `z.string()`); a bad value fails the whole bulk insert (F-23) |
| description | TEXT | | | ref |
| justification | TEXT | | | ref |
| suggested_by | TEXT | NOT NULL DEFAULT 'ai_relevance' | | ref (written 799) |
| accepted | BOOLEAN | NOT NULL DEFAULT FALSE | | ref (750, 848) |
| dismissed | BOOLEAN | NOT NULL DEFAULT FALSE | | ref (750, 849) |
| created_at | TIMESTAMPTZ | DEFAULT now() | | ref (751) |
| updated_at | TIMESTAMPTZ | DEFAULT now() | **no trigger**; set by hand (sceneAssets.ts:847) | ref |

RLS: one policy FOR ALL, USING via scenes->branches->projects (no WITH CHECK; USING applies to writes). No delete route found.

## 23. transformation_events  [030]
Table usage: R/W (transformationEventService.ts:217-321, 368, 452, 532; ImageGenerationService.ts:431; projects.ts:3788; frames.ts:1720; frameGenerationService.ts:232,585; sceneAssets.ts:1561,1963,2067).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| scene_asset_instance_id | UUID | NOT NULL | FK scene_asset_instances(id) ON DELETE CASCADE | ref |
| scene_id | UUID | NOT NULL | FK scenes(id) ON DELETE CASCADE (denormalised) | ref |
| trigger_shot_id | UUID | NOT NULL | FK shots(id) ON DELETE CASCADE | ref |
| transformation_type | TEXT | NOT NULL | CHECK IN (instant, gradual, within_shot) | ref (zod enum sceneAssets.ts:1786,1797) |
| completion_shot_id | UUID | FK shots(id) ON DELETE SET NULL | gradual only | ref (148) |
| pre_description | TEXT | NOT NULL | | ref (UI TransformationEventCard.tsx:106) |
| post_description | TEXT | NOT NULL | | ref |
| transformation_narrative | TEXT | | | ref |
| pre_image_key_url | TEXT | | | **W-only** effectively: never set by create (not in zod schema, sceneAssets.ts:1783-1794); update passthrough only |
| post_image_key_url | TEXT | | | ref (set by job ImageGenerationService.ts:432; read 155-170) |
| pre_status_tags | TEXT[] | DEFAULT '{}' | | **UNREF in reads** (written only) |
| post_status_tags | TEXT[] | DEFAULT '{}' | | ref (155-170) |
| detected_by | TEXT | NOT NULL | CHECK IN (stage7_extraction, stage8_relevance, manual) | ref (UI TransformationEventCard.tsx:91). Only 'manual' written by code (VisualStateEditorPanel.tsx:270, ConvertToTransformationDialog.tsx:125) |
| confirmed | BOOLEAN | DEFAULT FALSE | comment: must be true before use in prompts | ref (121) |
| confirmed_at | TIMESTAMPTZ | | | W-only (305) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger update_transformation_events_timestamp | ref |

Indexes: scene_id; scene_asset_instance_id; trigger_shot_id; (scene_id, scene_asset_instance_id). RLS: 4 owner-chain policies via scenes->branches->projects.
Gradual events: applied only if completion_shot_id is non-null (transformationEventService.ts:174); a SET NULL on completion shot delete silently disables post state.

## 24. shot_asset_assignments  [033]
Table usage: R/W (shotAssetAssignmentService.ts:42-312; routes/shotAssignments.ts; projects.ts:2547,2628; projectAssets.ts:823-859; transformationEventService.ts:448).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| shot_id | UUID | NOT NULL | FK shots(id) ON DELETE CASCADE; UNIQUE(shot_id, scene_asset_instance_id) | ref |
| scene_asset_instance_id | UUID | NOT NULL | FK scene_asset_instances(id) ON DELETE CASCADE | ref |
| presence_type | TEXT | NOT NULL DEFAULT 'throughout' | CHECK IN (throughout, enters, exits, passes_through) | ref (zod shotAssignments.ts:18) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger shot_asset_assignments_updated_at | no explicit read/write in code |

Indexes: shot_id; scene_asset_instance_id. RLS: 4 owner-chain policies via shots->scenes->branches->projects.
Bulk: `deleteAllForScene` deletes all assignments for a scene (shotAssetAssignmentService.ts:244-269, routes/shotAssignments.ts:233), then `autoPopulate` (:183-241) re-inserts instance-by-shot pairs as 'throughout'. Shot split re-clones (projects.ts:2620-2633); shot merge does not.

## 25. text_field_versions  [036]
Table usage: R/W (textFieldVersionService.ts:44-221; callers sceneAssets.ts:2135,2176,2210; frames.ts:646,2324,2364,2402; projects.ts:3872,3880). Frontend via HTTP (textFieldVersionService.ts:68,91,117,139,161,186 in src).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| entity_type | TEXT | NOT NULL | CHECK IN (shot, scene_asset_instance) | ref |
| entity_id | UUID | NOT NULL | **no FK** (polymorphic) | ref |
| field_name | TEXT | NOT NULL | CHECK IN (frame_prompt, video_prompt, end_frame_prompt, description_override) | ref. Writes use only these four (no 'continuity_frame_prompt') |
| content | TEXT | NOT NULL | | ref |
| is_selected | BOOLEAN | NOT NULL DEFAULT FALSE | UNIQUE partial idx_text_field_versions_selected ON (entity_id, field_name) WHERE is_selected | ref |
| source | TEXT | NOT NULL DEFAULT 'user_save' | CHECK IN (user_save, ai_generation) | ref. Source taken from request body unvalidated (sceneAssets.ts:2158,2180; frames.ts ~2342,2368), so an unknown value fails the CHECK (500) |
| version_number | INTEGER | NOT NULL DEFAULT 1 | | ref |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | | ref |

Indexes: partial unique (entity_id, field_name) WHERE is_selected; lookup (entity_id, field_name, created_at DESC). No updated_at, no trigger.
RLS: ONE policy "Users can manage text field versions" FOR ALL USING (true) WITH CHECK (true), **with no TO clause, so it applies to every role including anon**. Comment says ownership is checked at the API layer. See F-06.
Cap: MAX_VERSIONS = 8 (textFieldVersionService.ts:9); enforced on createVersion only (:69,181-202).

## 26. user_credits  [020]
Table usage: R/W (userCreditsService.ts:31,42,55,106,135; callers checkout.ts:77 and videoGenerationService.ts:228,334,394).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | ref |
| user_id | UUID | NOT NULL | FK auth.users(id) ON DELETE CASCADE; UNIQUE(user_id) | ref |
| balance | NUMERIC(12,4) | NOT NULL DEFAULT 100.00 | | ref (written at deduction) |
| low_credit_threshold | NUMERIC(12,4) | DEFAULT 10.00 | | ref (W at insert :46) |
| last_topup_at | TIMESTAMPTZ | | | ref but **effectively never written**: only addCredits (:126-149), which nothing calls |
| last_deduction_at | TIMESTAMPTZ | | | ref (W :109) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | ref |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | trigger user_credits_updated_at | ref |

Indexes: user_id; balance. RLS: SELECT, INSERT, UPDATE (own, user_id = auth.uid()). **No DELETE policy.**

## 27. intake_resolutions  [043]
Table usage: W by RPC `streamline_commit` (043:402-416), R-only in one place (contextManager.ts:513-517, selects question_text, selected_answer, subject_entity_type, subject_entity_name, ordered by created_at).

| Column | Type | Null / default | Constraints | Usage |
|---|---|---|---|---|
| id | UUID | PK | | never read |
| branch_id | UUID | NOT NULL | FK branches(id) ON DELETE CASCADE; index | R (filter) |
| question_text | TEXT | NOT NULL | | R |
| question_category | TEXT | NOT NULL | CHECK IN (contradiction, vague_trait, ambiguous_structure, missing_info, conflict_resolution) | never read; 'conflict_resolution' never written |
| options | JSONB | | string[] (Stage1InputMode.tsx:362) | never read |
| selected_answer | TEXT | | | R |
| answer_source | TEXT | NOT NULL | CHECK IN (option, freetext, ai_inferred) | never read |
| subject_entity_type | TEXT | | CHECK NULL or IN (character, location, prop, style, structure, other) | R |
| subject_entity_name | TEXT | | partial index | R |
| conflicting_sources | JSONB | | string[] or null | never read |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | R (ordering only) |
| created_by | UUID | FK auth.users(id) | | never read |

Indexes: branch_id; (branch_id, subject_entity_type, subject_entity_name) partial. RLS: SELECT and INSERT only (owner via branches->projects). No UPDATE/DELETE policy.

## 28. intake_resolution_edits  [043]
Table usage: W by RPC only (043:436-445). **Never read** by any TypeScript. Built in Stage1InputMode.tsx:386-393: target_type always 'stage', target_asset_name NULL, target_stage_number never sent (always NULL), resolution linked to first resolution `r0`.

| Column | Type | Null / default | Constraints |
|---|---|---|---|
| id | UUID | PK | |
| resolution_id | UUID | NOT NULL | FK intake_resolutions(id) ON DELETE CASCADE; index |
| target_type | TEXT | NOT NULL | CHECK IN (stage, asset) |
| target_stage_number | INTEGER | | |
| target_asset_name | TEXT | | |
| edit_scope | TEXT | NOT NULL | CHECK IN (word_patch, paragraph_rewrite, structural_cascade) |
| diff_summary | TEXT | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

RLS: SELECT and INSERT via resolution->branches->projects. No UPDATE/DELETE policy.

---

## X. Referenced in code but NOT created by any migration

| Name | Code references (non-test) | Effect in code | Evidence |
|---|---|---|---|
| videos (table) | projects.ts:3078 (select id), 3115 (update status 'invalidated'), sceneStageLocks.ts:215 (select id, neq status) | Query returns error (relation does not exist). Errors are destructured as `{ data }` only, so `videos` is undefined and videosAffected=0 silently. The update at 3115 is a silent no-op. | no CREATE TABLE in backend/migrations or quickies-sql |
| invalidation_logs | projects.ts:3123 (insert) | Wrapped in try/catch, but supabase-js returns {error} rather than throwing, so the failure is silent. | no DDL found |
| users | backend/scripts/test-style-capsule-influence.ts:104 | Script only. `public.users` is not defined (auth.users is). | no DDL |
| hello | backend/src/tests/streamlineExtractFile.test.ts:128 | Test only. | n/a |

Bucket names used by code but not created by any repo script: `videos`, `frames` (see section S).

---

## J. JSONB column shapes (inferred from writers)
- `scenes.stage_locks` (quickies; TS `StageLocks = Record<string, StageLockEntry>`, sceneStageLocks.ts:9-14): keys are stage numbers as strings ("7" minimum per backfill). Values `{status: 'draft'|'locked'|'outdated'|..., locked_at?: string}`. Writers: sceneStageLocks.ts:116-118,252-258,346 (stage 7 lock/unlock/cascade), projects.ts:2967-2977,3142-3157 (stage 7 draft, downstream 'outdated'), shotAssetAssignmentService.ts:321-341 (`locks[key]='outdated'`), stageStates.ts:648. Frontend type `src/lib/services/sceneStageLockService.ts:5-10`.
- `stage_states.content`: per stage number (writers and shapes):
  - Stage 1 (`Stage1Content`, src/components/pipeline/Stage1InputMode.tsx:122): selectedMode, selectedProjectType, selectedRating, selectedGenres, selectedAspectRatio, targetLength, tonalPrecision, writingStyleCapsuleId, uploadedFiles, ideaText, processedInput (`.projectParams` read at contextManager.ts:489). Writer saveStageState (Stage1InputMode.tsx:278); streamline draft via RPC stage_1_draft.
  - Stage 2 (`Stage2Content`, Stage2Treatment.tsx:26): variations[{id, content, structuralEmphasis, estimatedRuntimeSeconds, createdAt}], activeVariation, processedInput, langsmithTraceId, promptTemplateVersion. Other writers: streamlineRouting.ts:167, streamlineBackfillService.ts:57.
  - Stage 3 (`Stage3Content`, Stage3BeatSheet.tsx:46): beats[{id, order, text, rationale, estimatedScreenTimeSeconds}], totalEstimatedRuntime, narrativeStructure, treatmentSource{content, variantId}, langsmithTraceId, promptTemplateVersion. Other writers: streamlineRouting.ts:175, streamlineBackfillService.ts:106.
  - Stage 4 (`Stage4Content`, Stage4MasterScript.tsx:49): formattedScript, tiptapDoc, scenes, syncStatus, beatSheetSource, langsmithTraceId, promptTemplateVersion. Other writer: streamlineRouting.ts:157.
  - Stage 5: locked_visual_style_capsule_id, style_locked_at, manual_visual_tone (Stage5Assets.tsx:99-105, 226-303). Read sceneAssets.ts:375-376,459,1999; projectAssets.ts:78.
  - Skipped stages: `{}` (RPC 041:281).
  - `_styleCapsuleMetadata` is stripped before save (stageStateService.ts:109).
  - Consumer mismatch: storyContextService.ts:95 reads Stage 3 `treatmentProse`, and :113-114 read Stage 2 `treatments`/`selectedTreatmentId`. No writer produces these keys (F-08).
- `design_pillars` (style_capsules): `DesignPillars` (src/types/styleCapsule.ts:8): colorPalette, mood, medium, lighting, cameraLanguage plus extra string keys. Writers styleCapsules.ts:127,192; seed-style-capsules.ts:197. Reader styleCapsuleService.ts:375 (Object.entries).
- `style_capsule_applications.injection_context`: {stage, templateName, formattedContextLength, timestamp, traceId}, built llm.ts:293-299, written stageStates.ts:267.
- `shots.reference_image_order` / `end_frame_reference_image_order`: JSON array; read/write frames.ts:899-922, 979-980 (`Array.isArray` guard, reorder by frame id per frames.ts logic; element shape not further traced).
- `shots.transformation_flags`: LLM output of shotExtractionService.ts:68 `LLMTransformationFlag[]`, schema in prompt at :282: `[{character_name, type: instant|within_shot|gradual, description, is_trigger, is_completion}]`. Written at extraction.
- `project_assets.location_aliases`: string[] (trimmed) written PA:628-636 (location assets only). Read as unknown (locationResolverService.ts:19); parseAliases (:143-159) accepts array, JSON string or plain string. Frontend type string[] (src/types/asset.ts:30). Not copied by split/clone/merge/sync.
- `location_match_events.candidates`: LocationMatchCandidate[] (locationResolverService.ts:40-48): {locationAssetId, name, confidence, source, reason, matchedFrom: camera_direction|setting|scene_expected_location, matchedText?}. Written :500.
- `image_generation_jobs.provider_metadata` / `video_generation_jobs.provider_metadata`: raw provider response (007/021 comments). No typed shape traced.
- `intake_resolutions.options`: string[]; `conflicting_sources`: string[]|null (Stage1InputMode.tsx:362,367).
- `stage_states.origin` is a column, not JSON (041 comment).

## C. Columns named in code that do NOT exist in the final schema
- `stage_states.state_data` and `stage_states.project_id` (no such columns; stage_states has branch_id): frames.ts:262-267, 385-390, 449-454, 767-772, 845-850. Errors are dropped because only `data` is read, so `visualStyleCapsuleId` is always undefined in these five frame paths (F-01).
- `config/database.ts:10` `.select('count')` on projects: no `count` column (F-05).
- `projects.branches` (embedded object read as array) at projects.ts:444,529,617 (`project.branches?.[0]?.name`): embed returns object, so the fallback 'main' is always used (F-09).
- `frames.status` value 'invalidated' (projects.ts:3108) and `frame_status` enumerations: CHECK violation (F-04).
- Tables `videos`, `invalidation_logs` (section X).
- `project_assets.metadata` (frontend phantom): Stage5Assets.tsx:1241-1245 reads `asset.metadata`, type at src/types/asset.ts:39; backend write commented out at PA:128-135. Always undefined.
- `project_assets.source` frontend type union lacks 'streamline_import' (src/types/asset.ts:36).

---

## S. Storage buckets (code-level; see C-database.md section 4 for detail)
Buckets referenced in code: `asset-images` (created by scripts/setup-asset-images-bucket.ts:23), `style-capsule-images` (created by scripts/setup-storage-buckets.ts:62), `videos` (Veo3Provider.ts:338,354; no creation script), `frames` (frames.ts:1465 remove only; no creation script, no upload to it).
Path conventions per write site are listed in C-database.md section 4.

## T. Triggers and functions (effective, final)
See C-database.md section 3 for the full list with effects. Summary of table-level triggers:
- BEFORE UPDATE updated_at-only: scenes, shots, frames, user_credits, global_assets, project_assets, style_capsules, style_capsule_libraries, scene_asset_instances, scene_asset_generation_attempts, project_asset_generation_attempts, transformation_events, shot_asset_assignments, asset_angle_variants (via update_updated_at_column), location_views (via update_shots_updated_at), video_generation_jobs.
- Not present (no updated_at trigger): projects, branches, stage_states, image_generation_jobs, scene_asset_suggestions, prompt_templates, style_capsule_applications, frame_links, text_field_versions, intake_resolutions, intake_resolution_edits, location_match_events.
- Special: on_project_created (AFTER INSERT on projects); trg_sync_scene_lock_status (scenes); scene_asset_modification_tracker (scene_asset_instances); trg_streamline_stage_lock_prerequisite (stage_states BEFORE INSERT).

---

## Column-level usage gaps (summary)
- UNREF (no non-test reference): scenes.end_frame_id; branches.parent_branch_id; image_generation_jobs.retry_count; scene_asset_suggestions.asset_id; scene_asset_generation_attempts.updated_at; project_assets.created_at (select * only); global_assets.updated_at; asset_angle_variants.updated_at; project_asset_generation_attempts.updated_at; shot_asset_assignments.updated_at (no explicit access); stage_states.prompt_template_version/final_prompt/langsmith_trace_id (runtime); intake_resolutions.id, question_category, options, answer_source, conflicting_sources, created_by (never read); intake_resolution_edits (all); location_match_events (all, write-only); text_field_versions (none unread).
- W-only (never read back): global_assets.voice_profile_id, global_assets.promoted_from_project_id; project_assets.last_synced_at, updated_at; project_asset_generation_attempts.original_filename/file_size_bytes/mime_type; asset_angle_variants.image_generation_job_id, prompt_snapshot; location_views.established_from_scene, established_from_shot_id, updated_at, promoted_from_frame_id; scene_asset_generation_attempts.image_generation_job_id/file_size_bytes/mime_type/copied_from_url; scene_asset_instances.selected_master_reference_source/_instance_id; transformation_events.pre_image_key_url, confirmed_at; style_capsule_applications (all); stage_states.inherited_from_stage_id/created_by; image_generation_jobs.last_attempt_at, generating_started_at, uploading_started_at.
- R-only: scenes.end_state_summary; projects.writing_style_capsule_id, visual_style_capsule_id; video_generation_jobs.queued_at; scene_asset_instances.modification_count, last_modified_field (frontend only); style_capsules.updated_at (trigger-set).
