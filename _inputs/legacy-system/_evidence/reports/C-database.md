# C-database: migrations, effective schema, storage, RLS, client access (slice C)

Scope read: `backend/migrations/001..044` (all 44 files, including both duplicate-number pairs 022 and 024), `backend/quickies-sql/*.sql` (3 files), `backend/scripts/run-migrations.ts`, `backend/scripts/setup-storage-buckets.ts`, `backend/scripts/setup-asset-images-bucket.ts`, `backend/scripts/backfill-shot-locations.ts`, `backend/storage-rls-error-work-around.md`, `backend/src/config/database.ts`, `backend/src/config/supabase.ts`, `src/lib/supabase.ts`. Usage cross-check by static grep over `backend/src`, `src/`, `backend/scripts` (tests excluded from usage). Per-table detail is in `C-table-inventory.md` (cited as INV §n).

Not done: no database, no migration runs, no server. Runtime behaviour is UNKNOWN unless stated. Seeds (`seed-style-capsules.ts`, `seed-templates.ts`) belong to V2 and are not analysed here except where they touch the schema.

Evidence hierarchy applied: migrations and runtime code over comments. Migration header comments are claims (several are stale, see §2.4).

---

## 1. Migration runner: order, application, failure modes

1.1 Order. `backend/scripts/run-migrations.ts:18-21` lists `migrations/` with `readdirSync().filter(.sql).sort()`. Order is lexical on the full filename, not on the numeric prefix. Effective order: 001 ... 021, 022_add_aspect_ratio, 022_scene_asset_generation_attempts, 023, 024_extra_archetype_and_style_outdated, 024_scene_asset_suggestions, 025 ... 044. Only `quickies-sql/` files are outside this chain.

1.2 Application mechanism. `backend/src/config/database.ts:32-64` (`DatabaseService.runMigration`):
- reads the file and splits on `;` (`:40-43`), with no awareness of `$$` dollar-quoted bodies or `--` comments;
- sends each fragment as `supabase.rpc('exec', { query: statement })` (`:48`);
- on error throws `Migration failed: Supabase doesn't support direct SQL execution via API. Please run the migration SQL in your Supabase SQL Editor` (`:54`).

1.3 Consequences (facts):
- No migration in `backend/migrations` or `quickies-sql` defines a function named `exec` (grep). The runner therefore works only if an `exec` RPC was created outside this repo. UNKNOWN whether the live database has one; the code's own error text (`:54`) says direct SQL via the API is not supported.
- The naive `;` split breaks every migration whose bodies contain semicolons inside `$$...$$`: 001:168-181 (create_initial_branch), 003:87-93, 006:85-91, 008:143-168, 014:31-50 (fn_sync_scene_lock_status), 017:22-41, 035:5-61 (DO blocks), 041:64-220 (streamline_commit), 042:34-226, 043:137-460, 044:4-100. Fragments would be syntactically invalid even with a working `exec`.
- `DatabaseService.testConnection` (`database.ts:5-30`) selects `count` from `projects` (`:8-11`). `projects` has no column `count` (INV §1). Only `PGRST205` (missing table) is treated as success (`:14`). Inference (not run): the connection check returns false, which makes `run-migrations.ts:13-15` exit before any file. Only `run-migrations.ts` and `tests/connectivity-test.ts` call it.
- Conclusion: the migrations in this repo are applied by a manual process outside the runner. `database.ts:54` and `quickies-sql/add_stage_locks.sql:10` ("Ran successfully on prod") are consistent with this. The exact manual process and its order are UNKNOWN. The only deterministic order is the lexical order above.

1.4 Duplicate numbers (facts):
- `022_add_aspect_ratio.sql` (adds `projects.aspect_ratio`) and `022_scene_asset_generation_attempts.sql` (new table, `scene_asset_instances` columns).
- `024_extra_archetype_and_style_outdated.sql` (CHECK widening, `project_assets.style_outdated`) and `024_scene_asset_suggestions.sql` (new table).
- Dependency check: no file in either pair references an object created by its sibling. So no skew arises under lexical order. A numeric-order or manual run that interleaves them differently is also safe for the same reason. The numeric prefix is simply not unique (F-25).

1.5 Silent-failure surfaces in the migration files (facts):
- `005_make_library_optional.sql:22-25` contains an invalid statement (see F-02). Under statement-by-statement execution, statements 1-3 succeed and statement 4 errors.
- `035_frame_links_reference.sql` drops constraints by pattern (`pg_constraint` lookup by `ILIKE '%link_type%'`, `array_length(conkey,1)=2`). Idempotent by design.
- `039_shot_location_identity.sql:75-78` adds `shots.end_frame_reference_image_order` as a "compatibility fix ... live code already reads and writes this column, but no migration in this repo created it." Evidence of past schema drift (F-27).
- `quickies-sql/add_stage_locks.sql` adds `scenes.stage_locks` outside the chain (F-03).

1.6 Header and comment staleness (facts; not evidence of behaviour): `006_shots_table.sql:1-3` header says "Migration 004" and "Must run before 006_image_generation_jobs.sql"; `007` says "Feature 3.1"; `044_streamline_atomic_intake_fix.sql:2` says it is "an upgrade for databases where migration 043 is already applied", while a fresh run applies 043 then 044 in order and converges on the same final functions.

---

## 2. Effective schema: what changed by migration (conceptual models)

Full per-table column list, constraints, indexes, triggers, RLS, usage: `C-table-inventory.md` §1-§28. This section summarises model changes and the older shape only where it explains the current state.

2.1 Chronology of conceptual models
- **Core (001)**: projects, branches (git-style, one Main branch auto-created by trigger), stage_states (versioned JSON content per stage, UNIQUE(branch, stage, version)). Projects had RAG id columns (`written_style_rag_id`, `visual_style_rag_id`), dropped in 004.
- **RAG to Style Capsules (004, 005)**: style_capsule_libraries, style_capsules (writing|visual), style_capsule_applications (audit). 005 intended per-user unique names (see F-02).
- **Scenes and shots (003, 006, 011-014, 018, 027, 028-031)**: scenes per branch (UNIQUE(branch, scene_number)); shots per scene; cached extraction fields on scenes (`expected_*`); shot-list lock as `scenes.shot_list_locked_at` with a status trigger (014); Stage 9 prompt columns on shots (018); reference-image ordering JSON (028); transformation flags (030); start-continuity fields (031).
- **Image generation (007, 010, 016, 026, 032)**: `image_generation_jobs` is the job table for all image kinds. `job_type` CHECK was re-created four times (016 added scene_asset, 026 angle_variant, 032 transformation_post). Global-asset jobs (project_id NULL, 010) with a second idempotency index.
- **Assets (008, 009, 023, 024, 039, 042)**: `global_assets` (user library) and `project_assets` (per project, per branch). project_assets gained sync tracking (009), deferral and scene numbers and generation-attempt carousel (023), the extra_archetype type (024), location aliases (039), and the streamline_import source (042). Versioning: `global_assets.version` increments in code; `project_assets.source_version` compares to it.
- **Scene-specific asset state (015, 017, 022, 030, 033, 036)**: `scene_asset_instances` (one per scene per project asset, with inheritance pointer `inherited_from_instance_id` and `effective_description`), modification audit trigger (017), master-reference selection and generation attempts with cap 8 (022), transformation events (030), per-shot assignments with presence type (033), and versioned free-text fields (036).
- **Frames and continuity (019, 034, 035, 040)**: `frames` (start/end per shot, UNIQUE(shot, frame_type)), `previous_frame_id` chaining (019). 034 added `frame_links` (match only, UNIQUE(target, link_type)). 035 widened it to match|reference and changed uniqueness to one link per target. 040 added lineage: `generated_from_frame_id`, `continuity_base_role`, `promoted_to_view_id`, `shots.selected_continuity_base_frame_id`, `location_views.promoted_from_frame_id`, `projects.continuity_mode`.
- **Location model (038, 039, 040)**: `location_views` (establishing/direction views with camera metadata), shot camera columns (038), canonical `shots.location_asset_id` plus match source/confidence/notes and audit table `location_match_events` (039). Before 039 the location link was only the `shots.setting` text and `scenes.expected_location`.
- **Video (020, 021)**: `user_credits` (balance, default 100) and `video_generation_jobs` (model_variant, frame snapshots, cost estimate and actual).
- **Stage states, Streamline (041-044)**: stage_states gains status `skipped` and `origin` (041). The atomic writer `streamline_commit(payload jsonb)` is created in 041 (stage transitions), extended in 042 (assets), 043 (project_config, stage_1_draft, resolutions, resolution_edits), and wrapped by `streamline_commit_atomic` in 044. 044 also adds a BEFORE INSERT trigger on stage_states that enforces stage-lock prerequisites for every insert.
- **Intake facts ledger (043)**: `intake_resolutions` and `intake_resolution_edits`.
- **Stage-lock JSON (quickies)**: `scenes.stage_locks` (keys are stage numbers as strings) is the mechanism used by code for stages 6-12 locking and is NOT in the migration chain (F-03). Its backfill only covers stage 7 from `shot_list_locked_at`.

2.2 Streamline commit function: current behaviour (043 body, reached via 044 wrapper)
- `streamline_commit_atomic(payload)` (044:38-100): requires project_id, reads `projects.active_branch_id`, takes `FOR UPDATE` on stage_states rows for stages 1-5 of that branch (no-op if no rows exist), applies `project_config` (UPDATE projects) and `stage_1_draft` (INSERT stage 1 draft version), then calls `streamline_commit(payload - 'project_config' - 'stage_1_draft')`.
- `streamline_commit` (043 body): stage_transitions in key order: `"skip"` only for stages 2-4 when previous stage is locked or skipped; `"locked"` for existing content, requiring prior stage locked or skipped for stage>1; object transitions `{status, content, origin, regenerationGuidance}` with status and origin validated. Then assets (source validated), resolutions (client_id mapped to real ids), resolution_edits (resolution_client_id must exist). Any RAISE rolls back the whole call.
- Route: `backend/src/routes/streamline.ts:77` calls only `streamline_commit_atomic`. The inner `streamline_commit` is therefore reached only through the wrapper.

2.3 Writers vs. triggers (facts)
- Every stage-status change inserts a new stage_states version. No code path updates `status` in place (INV §3).
- The mig-044 trigger applies to all inserts, not just the RPC. Insert sites that can violate it are listed in §3.2 (F-13).

2.4 Stale or misleading artefacts (facts, not behaviour):
- Migration header comments: 006 (see §1.6); 015 line 5 ("Optional: Remove the extra composite index ... if you want to match the plan exactly") is a planning note inside a migration.
- 014 header says the status trigger keeps "shot_list_locked_at and status always in sync"; the trigger only handles the NULL/NOT NULL transitions (§3.1).
- 013 comment says end_frame_thumbnail_url is "Populated at Stage 10 or Stage 12"; no non-test writer exists (INV §14).
- 003 comment says `scenes.end_frame_id` is a "FK to frames table (to be added in future migration)". It was never added (INV §14, UNREF).

---

## 3. Triggers, functions, and what they enforce

3.1 Functions and triggers (full list; "T" = trigger):
| Function | Trigger(s) | Table | Enforces / effect | mig |
|---|---|---|---|---|
| `create_initial_branch()` | `on_project_created` AFTER INSERT | projects | Inserts branch `Main` (is_main=TRUE) and sets `projects.active_branch_id` to it. Code never inserts branches (INV §2). The insert runs under the caller's RLS (inferred to pass because the project row is visible after the statement). | 001 |
| `update_scenes_updated_at()` | `scenes_updated_at` BEFORE UPDATE | scenes | `updated_at = NOW()`, overriding any client value | 003 |
| `update_shots_updated_at()` | `shots_updated_at` BEFORE UPDATE; also used by `location_views_updated_at` | shots, location_views | same | 006, 038 |
| `update_global_assets_updated_at()` | `update_global_assets_timestamp` | global_assets | same | 008 |
| `update_project_assets_updated_at()` | `update_project_assets_timestamp` | project_assets | same | 008 |
| `update_style_capsule_libraries_updated_at()` | `style_capsule_libraries_updated_at` | style_capsule_libraries | same | 004 |
| `update_style_capsules_updated_at()` | `style_capsules_updated_at` | style_capsules | same | 004 |
| `update_frames_updated_at()` | `frames_updated_at` | frames | same | 019 |
| `update_user_credits_updated_at()` | `user_credits_updated_at` | user_credits | same | 020 |
| `update_video_generation_jobs_updated_at()` | `video_generation_jobs_updated_at` | video_generation_jobs | same | 021 |
| `update_generation_attempts_updated_at()` | `update_generation_attempts_timestamp` | scene_asset_generation_attempts | same | 022 |
| `update_project_asset_attempts_updated_at()` | `update_project_asset_attempts_timestamp` | project_asset_generation_attempts | same | 023 |
| `update_scene_asset_instances_updated_at()` | `update_scene_asset_instances_timestamp` | scene_asset_instances | same | 015 |
| `update_updated_at_column()` | `update_angle_variants_updated_at` | asset_angle_variants | same (generic function, first defined here) | 025 |
| `update_transformation_events_updated_at()` | `update_transformation_events_timestamp` | transformation_events | same | 030 |
| `update_shot_asset_assignments_updated_at()` | `shot_asset_assignments_updated_at` | shot_asset_assignments | same | 033 |
| `fn_sync_scene_lock_status()` | `trg_sync_scene_lock_status` BEFORE UPDATE | scenes | See 3.1a | 014 |
| `track_scene_asset_modifications()` | `scene_asset_modification_tracker` BEFORE UPDATE | scene_asset_instances | See 3.1b | 017 |
| `enforce_streamline_stage_lock_prerequisite()` | `trg_streamline_stage_lock_prerequisite` BEFORE INSERT | stage_states | See 3.1c | 044 |
| `streamline_commit(jsonb)` | none (called by RPC) | — | Atomic multi-table writer (§2.2) | 041, 042, 043 |
| `streamline_commit_atomic(jsonb)` | none (called by RPC from streamline.ts:77) | — | Wrapper: project_config, stage_1_draft, then streamline_commit (§2.2) | 044 |

No DB function or trigger cascades beyond FK ON DELETE clauses. No trigger enforces the shot-list lock on shots or frames.

3.1a `fn_sync_scene_lock_status` (014:31-50), exact logic:
- If NEW.shot_list_locked_at NOT NULL and OLD NULL: `status := 'shot_list_ready'`, unconditionally. A lock therefore overwrites `frames_locked` or `video_complete` if they were set, since the branch does not check OLD.status.
- If NEW NULL and OLD NOT NULL: `status := 'draft'` only if OLD.status was `shot_list_ready`; otherwise status is unchanged.
- Effect on scene status values: `frames_locked`, `outdated`, `continuity_broken` are never written by code as scene status (INV §14). Only 'video_complete' (videoGenerationService.ts:528) and 'shot_list_ready'/'draft' (trigger) are written.

3.1b `track_scene_asset_modifications` (017:22-41): on every UPDATE of scene_asset_instances, `modification_count = OLD + 1`, regardless of whether anything changed. `last_modified_field` takes the first changed of description_override, status_tags, image_key_url, carry_forward. `modification_reason` is not touched (caller sets it). Effect: any update (including selection changes and merges) increments the count (F-22).

3.1c `enforce_streamline_stage_lock_prerequisite` (044:4-30): on INSERT of a row with stage_number > 1 and status 'locked', the latest version of stage N-1 in the same branch must be 'locked' or 'skipped', else RAISE. It does not check 'skipped' transitions and applies to all inserts (F-13).

3.2 Insert sites of stage_states and whether mig-044 can reject them (facts; INV §3):
| Site | Status written | Can the trigger reject? |
|---|---|---|
| PUT `routes/stageStates.ts:245` (autosave/normal save) | draft, or client status; forced to locked at :213-222 if latest is locked | Yes, if stage N is latest-locked while N-1 is not locked/skipped (e.g. during an unlock race). Route has no pre-check; raises 500. |
| Lock `routes/stageStates.ts:380` | locked | Route checks first (:345-370); fails only on a race |
| Skip `routes/stageStates.ts:488` | skipped | No |
| Unlock draft `routes/stageStates.ts:610` | draft | No |
| Unlock cascade `routes/stageStates.ts:642` | outdated | No (error not checked) |
| Backfill `routes/streamline.ts:150` | locked for stage 2 or 3 | **Yes.** Route checks the current stage is skipped but not that N-1 is locked/skipped. If stage 1 or 2 was later unlocked, the insert fails after the LLM call has run (F-13). |
| RPC stage_1_draft (044:84) | draft, stage 1 | No |
| RPC transitions (043:339) | per transition | Checked in SQL first; consistent |
| `DatabaseService.createStageState` (database.ts:93) | DB default draft | Never called |

---

## 4. Storage buckets and path conventions

4.1 Buckets referenced by code
| Bucket | Creator in repo | Public | Uploads (write sites) | Deletes (remove sites) | Notes |
|---|---|---|---|---|---|
| `asset-images` | `backend/scripts/setup-asset-images-bucket.ts:23-27` (createBucket, public, 10 MB, png/jpeg/webp) | yes | ImageGenerationService.ts:381, 851; sceneAssets.ts:1713; streamline.ts:281; assets.ts:367; projectAssets.ts:1326, 3088; frames.ts:1109; assetImageLocalizer.ts:75; frameGenerationService.ts:1343 (mask, upsert true); sceneAssetAttemptsService/projectAssetAttemptsService via their callers | sceneAssetAttemptsService.ts:152,182; projectAssetAttemptsService.ts:161,191; projectAssets.ts:2676, 3161 (location view, path parsed from URL); frames.ts:1465 **uses bucket `frames` (F-15)** | Policies: `quickies-sql/asset-images-RLS-polices.sql` (service_role write, public read). Not executed by any script; the setup script prints "Configure RLS policies via Supabase Dashboard" (:43-46). |
| `style-capsule-images` | `backend/scripts/setup-storage-buckets.ts:62-65` (public, 5 MB, png/jpeg/webp) | yes | styleCapsules.ts:388 | none (styleCapsules.ts:474 TODO: removal only clears the URL) | Policies: `quickies-sql/Storage-RLS-policies.sql` (authenticated, path-scoped). Script only prints the SQL (:101-133). |
| `videos` | **none** | not known (UNKNOWN) | Veo3Provider.ts:337-339 (`{projectId}/{ts}.mp4`, contentType video/mp4), public URL from getPublicUrl (:353) | none | Bucket existence UNKNOWN; not created by any repo script |
| `frames` | **none** | UNKNOWN | **none** | frames.ts:1465 (`remove([job.storage_path])`) | Path written to `asset-images` by ImageGenerationService (storage_path set at :402, :468, :540), so the remove targets the wrong bucket. Error not checked. (F-15) |

Frontend: no `storage` calls in `src/` (grep). All uploads are backend-mediated with the service-role client.

4.2 Path conventions (exact templates from writers)

asset-images:
1. master_asset: `project_{projectId}/branch_{branchId}/master-assets/{assetId}_{ts}_{rand7}.png` (ImageGenerationService.ts:609-611)
2. angle_variant: `project_{projectId}/branch_{branchId}/master-assets/angles/{assetId}_{angleVariantId}_{ts}_{rand}.png` (:612-614)
3. scene_asset (generated): `project_{projectId}/branch_{branchId}/scene_{sceneId}/scene-assets/{assetId}_{ts}_{rand}.png` (:615-617)
4. transformation_post: `project_{projectId}/branch_{branchId}/scene_{sceneId}/transformations/{transformationEventId}_{ts}_{rand}.png` (:618-620)
5. start_frame / end_frame / inpaint (shot-bound): `project_{projectId}/branch_{branchId}/scene_{sceneId}/shot_{shotId}/{jobType}_{ts}_{rand}.png` (:621-623)
6. fallback: `project_{projectId}/branch_{branchId}/misc/{ts}_{rand}.png` (:625)
7. global asset generated: `global/{userId}/{assetId}/{ts}_{rand}.png` (ImageGenerationService.ts:851-853)
8. global asset uploaded: `global/{userId}/{assetId}/{Date.now()}-{rand}{ext}` (assets.ts:366)
9. project asset uploaded: `project/{projectId}/{assetId}/{Date.now()}-{rand}{ext}` (projectAssets.ts:1326)
10. location view image: `project/{projectId}/location-views/{assetId}/{viewId}-{Date.now()}{ext}` (projectAssets.ts:3088)
11. scene asset upload attempt: `project_{projectId}/branch_{branchId}/scene_{sceneId}/scene-assets/uploads/{instanceId}_{ts}_{rand}{ext}` (sceneAssets.ts:1713-1716)
12. frame upload: `project_{projectId}/branch_{branchId}/scene_{sceneId}/frames/uploads/{shotId}_{frameType}_{ts}_{rand}{ext}` (frames.ts:1109-1112)
13. streamline staging: `project/{projectId}/streamline-staging/{ts}-{rand}{ext}` (streamline.ts:279-281)
14. master-copy localization (clone): `project_{targetProjectId}/branch_{targetBranchId}/master-assets/{assetId}_{ts}_{rand}{ext}` (assetImageLocalizer.ts:70)
15. inpaint mask: `project_{projectId}/inpaint-masks/{frameId}_{ts}.{format}` (frameGenerationService.ts:1345, upsert true)

Note: two root styles are mixed in one bucket: `project_{id}/branch_...` (underscore) and `project/{id}/...` (slash). Master_asset always writes `.png`; other writers keep the upload extension.

style-capsule-images: `{userId}/{capsuleId}/{ts}-{rand}{ext}` (styleCapsules.ts:388-390).
videos: `{projectId}/{ts}.mp4` (Veo3Provider.ts:337).

4.3 Storage object lifecycle facts
- DB stores both `storage_path` (relative, used for remove) and a full public URL (`image_key_url`, `image_url`, `public_url`). Remove uses storage_path in attempt services and frames; location-view remove derives the path by splitting the URL on `/asset-images/` (projectAssets.ts:3159).
- Deleting a project asset (projectAssets.ts:707-711) deletes rows; cascades remove attempt and angle-variant rows but not the objects (orphans).
- Deleting a scene asset instance (sceneAssets.ts:690) cascades attempts but does not remove objects.
- Removing a style-capsule reference image clears the URL only (styleCapsules.ts:474).
- Attempt cap enforcement removes the oldest non-selected object (sceneAssetAttemptsService.ts:177-184; projectAssetAttemptsService.ts:185-192).

4.4 Storage RLS: `backend/storage-rls-error-work-around.md` (verified)
- The doc gives three options for creating `storage.objects` policies for `style-capsule-images` (Dashboard policies, raw SQL, or "if above don't work ... image upload functionality will fail gracefully").
- Verified against code: the only upload path is the backend with the service-role client (`backend/src/config/supabase.ts:6-17`; styleCapsules.ts:388). The frontend makes no storage calls. The policies in `Storage-RLS-policies.sql` therefore govern only non-service-role clients, and the app never uses one for uploads. The doc's premise (that these policies are needed for uploads to work) is not supported by code. Supabase service_role bypasses RLS (platform behaviour, not verifiable in this repo) — so uploads are not gated by these policies.
- Doc vs file: Solution 2's SQL matches `quickies-sql/Storage-RLS-policies.sql` (all four policies, same predicates). Solution 1's Policy 2 (UPDATE) is truncated in the doc (`bucket_id = 'style-capsule-images' AND auth.role()`) and does not match the file.
- The doc's "Next Steps" uses `npx supabase db inspect` (a Supabase CLI command). Not run here; cited only.
- `setup-storage-buckets.ts:101` lists the bucket with `.list()` as an access test; the script prints the SQL instead of applying it.
- The `style-capsule-images` SELECT policy is redundant for public buckets (public URLs bypass storage RLS — platform behaviour, external to repo).

---

## 5. RLS and client access

5.1 Who uses which key
- Backend: one Supabase client, `backend/src/config/supabase.ts:6-17`, created with `SUPABASE_SERVICE_ROLE_KEY` and `autoRefreshToken: false`. `database.ts` imports the same client. grep finds no user-scoped (anon or JWT) client in `backend/src`. So every backend query bypasses RLS. Authorization is application code (e.g. `.eq('user_id', userId)`, assets.ts:350-355; styleCapsules.ts:380-386). Completeness of those checks is outside this slice (cross-slice, §8).
- Frontend: `src/lib/supabase.ts:11-17`, anon key (`VITE_SUPABASE_ANON_KEY`), `persistSession: true`. Direct table access (grep of `.from(` in `src/`, multi-line aware):
  - `src/hooks/useSceneInfo.ts:26-29` — `scenes` select `scene_number, slug` by id. Owner-scoped by RLS (scenes policy).
  - `src/lib/services/imageService.ts:148-152` — `projects` select `active_branch_id` by id. Owner-scoped by RLS (projects policy).
  - No `rpc`, `storage`, or realtime calls in `src/`.
  - `supabase.auth` appears 161 times across `src/lib/services` (session access; detailed use not traced in this slice). `src/lib/stores/auth-store.ts:30-109` uses signUp, signInWithPassword, signOut, onAuthStateChange.
- Frontend data access otherwise goes through the HTTP API (service files call backend routes; not traced here).

5.2 RLS coverage by table (migrations; `C-table-inventory.md` has per-table detail)
- RLS is enabled on all 28 migration-created tables (no table is left without `ENABLE ROW LEVEL SECURITY`).
- Policy predicate for nearly all tables: owner chain to `projects.user_id = auth.uid()`, via `branches` (scenes, stage_states, location_match_events via projects), `scenes`->`branches`->`projects` (shots, scene_asset_instances, transformation_events, scene_asset_generation_attempts, frames via shots, shot_asset_assignments), `project_assets`->`branches`/`projects` (location_views, asset_angle_variants, project_asset_generation_attempts).
- Tables with a special predicate: global_assets (user_id = auth.uid()); style_capsule_libraries and style_capsules (own or preset); prompt_templates (SELECT when is_active=TRUE, any role); user_credits (user_id = auth.uid()); image_generation_jobs (project-owned OR global asset owned, SELECT only).

5.3 Policy gaps and open policies (facts)
| Table | Missing ops | Note |
|---|---|---|
| text_field_versions | none (FOR ALL) | **USING (true) WITH CHECK (true), no TO clause: applies to every role, including anon. Any holder of the public anon key can read and write all rows through PostgREST.** Comment (036:29) says ownership is checked at the API layer. No frontend direct access to this table found, so the exposure is through the DB API only. (F-06) |
| prompt_templates | no UPDATE/DELETE for non-creators; SELECT is `is_active = TRUE` for every role | Active prompt text is readable by any role that can reach the table (anon included, no TO clause). |
| style_capsule_libraries, style_capsules | none | Preset rows readable by any role (no TO clause). |
| branches | DELETE | No DELETE policy |
| stage_states | DELETE | No DELETE policy |
| image_generation_jobs | INSERT, UPDATE, DELETE | Only SELECT; user JWTs cannot write. Backend bypasses RLS. |
| video_generation_jobs | DELETE | No DELETE policy |
| user_credits | DELETE | No DELETE policy |
| style_capsule_applications | UPDATE, DELETE | Only SELECT and INSERT |
| intake_resolutions | UPDATE, DELETE | Only SELECT and INSERT |
| intake_resolution_edits | UPDATE, DELETE | Only SELECT and INSERT |
| location_match_events | UPDATE, DELETE | Only SELECT and INSERT |
| scene_asset_suggestions, asset_angle_variants, frame_links | none (FOR ALL with USING only) | For FOR ALL policies without WITH CHECK, USING also applies to writes. |

5.4 Anon behaviour for `auth.uid()`-based policies: `auth.uid()` is NULL for anon, so owner predicates evaluate false; only the open predicates in 5.3 expose rows to anon.

---

## 6. Column-level cross-check summary

Detail per table and column: `C-table-inventory.md`. Summary:
- All 28 migration tables have at least one code reference, except `intake_resolution_edits` (written only by the SQL RPC; no `.from()` reference in TypeScript).
- Column references absent from code (UNREF) and write-only or read-only columns are listed in INV "Column-level usage gaps" (end of file). Largest items: `scenes.end_frame_id` (UNREF), `image_generation_jobs.retry_count` (UNREF), `intake_resolutions` (5 of 11 columns never read), `location_match_events` and `intake_resolution_edits` (entirely write-only or never read).
- Code references to names that do not exist in the schema (INV §C): `stage_states.state_data`, `stage_states.project_id` (F-01); `projects.count` (F-05); tables `videos`, `invalidation_logs` (F-11); `branches` embed read as array (F-09).
- Writes that violate a CHECK or NOT NULL: frames.status 'invalidated' (F-04); `project_type` 'audio-visual' from frontend (F-07); `project_assets.description` NULL from sceneAssets.ts:932 (F-16). Writes that can violate a CHECK from unvalidated input: `selected_master_reference_source` (sceneAssets.ts:1611/1630), `text_field_versions.source` (sceneAssets.ts:2158/2180), `scene_asset_suggestions.asset_type` (sceneAssets.ts:715, F-23), `location_views` camera fields copied from shots (projectAssets.ts:3257-3258, F-18).

---

## 7. Conceptual-model migrations: state summary (detail in §2.1 and INV)

- **Asset models**: current shape is global_assets + project_assets (per branch, `locked`, `deferred`, `source` with 4 values, `style_outdated`, `location_aliases`) + project_asset_generation_attempts (cap 4) + asset_angle_variants + location_views. Older shape: project_assets with `image_key_url` only (before 023), no attempts table.
- **Scene assets**: current shape is scene_asset_instances + scene_asset_generation_attempts (cap 8) + shot_asset_assignments + transformation_events + text_field_versions (cap 8) + scene_asset_suggestions. The inheritance chain is `inherited_from_instance_id` (015), and the master-reference selection (022, 037).
- **Scene locking**: current shape has two mechanisms in parallel: `scenes.shot_list_locked_at` with trigger (014) and `scenes.stage_locks` JSON (quickies). Code writes both for stage 7 (sceneStageLocks.ts:116-118, 252-258, 352; projects.ts:2967, 3142) for "backward compatibility". `stage_locks` is not in migrations (F-03).
- **Continuity lineage**: frames (019) with `previous_frame_id`, plus cross-shot lineage from 040. frame_links (034 match only; 035 match|reference, one link per target).
- **Frame links**: see above. Older shape allowed only 'match' and one link per (target, link_type) (034); 035 dropped that uniqueness and widened the CHECK.
- **text_field_versions (036)**: versioned free text for shot prompts and scene-asset description_override. Older shape: prompt text stored only in shots.frame_prompt/video_prompt/end_frame_prompt (018, 028); the table adds history and selection.
- **Intake and Streamline commit (041-044)**: see §2.2. `origin` (041) is a column, not JSON.

---

## 8. Compatibility shims, deprecated columns still written, data-migration statements

- `projects.written_style_rag_id`, `projects.visual_style_rag_id`: dropped in 004 (004:6-8). No code references.
- `projects.writing_style_capsule_id`, `projects.visual_style_capsule_id`: kept, read-only in code (no writer). Real visual style is `stage_states` Stage 5 content `locked_visual_style_capsule_id` (Stage5Assets.tsx:99-105; sceneAssets.ts:375). Consequence: frames.ts 5 paths read a nonexistent column (F-01), so the visual style capsule is never applied in frame generation there (INV §C).
- `scenes.shot_list_locked_at` written in parallel with `stage_locks` (sceneStageLocks.ts:116-118, 256-258, 352) "for backward compatibility"; the 014 trigger acts on the column only.
- `shots.requires_end_frame` (018) vs `shots.ai_recommends_end_frame` (029): 029 separates AI recommendation from user override and backfills `ai_recommends_end_frame = requires_end_frame` where prompts already existed (029:6-7).
- `shots.reference_image_order` (028) and `shots.end_frame_reference_image_order` (039, added as "compatibility fix"): both read by frames.ts:899-980; the second was used before any migration created it.
- `scenes.end_frame_id` (003): placeholder, no FK, never written, never read (INV §14, UNREF).
- `scenes.end_frame_thumbnail_url` (013): read in projects.ts:1042/1083; no writer found in backend (INV §14).
- `stage_states.prompt_template_version`, `final_prompt`, `langsmith_trace_id` (001, 002): runtime-unused. Trace ids and template versions live inside `content` JSON (INV §3, §J).
- `image_generation_jobs.asset_id`: no FK by design (007 comment). `retry_count`: UNREF (INV §18).
- `scene_asset_instances.selected_master_reference_source` and `_instance_id` (022): written from request bodies, not read by backend (INV §20). Frontend type only.
- `project_assets.source` value `cloned` (023) is never written by the clone path (INV §9; PA:1950-1963 leaves the default `extracted`).
- `global_assets.voice_profile_id` (008): unused placeholder.
- `intake_resolutions` / `intake_resolution_edits`: write-only from the frontend's point of view (only one read at contextManager.ts:513-517).
- `stage_states.origin` (041) is dropped to NULL by several insert paths (stageStates.ts lock :382, unlock :612, outdated :644, and PUT without origin) (F-14).

Data-migration statements (facts):
- 004:6-8 drops RAG columns; the comment says "Assumes no production data exists (clean migration strategy)".
- 012:8-13 backfills `shot_order` per scene by `created_at, id` (ROW_NUMBER).
- 029:6-7 backfills `ai_recommends_end_frame` from `requires_end_frame` where prompts were generated.
- 039:29-33 and constraint list: `legacy_backfill` is a valid `location_match_source`; the backfill script writes it (scripts/backfill-shot-locations.ts:190).
- 041:38-50: `origin` NULL for all pre-existing rows (no backfill).
- quickies/add_stage_locks.sql:1-8 adds `scenes.stage_locks` and backfills stage '7' from `shot_list_locked_at` (`{status:'locked', locked_at}` or `{status:'draft'}`). Comment says "Ran successfully on prod".
- backend/scripts/backfill-shot-locations.ts: dry-run by default; `--apply` updates non-manual shots at or above a threshold (default `DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE`, imported from locationResolverService), writes `location_match_source='legacy_backfill'` or `'camera_direction_parent'` (:190), and records a match event per applied row. Updates use the service-role client.

---

## 9. JSONB shapes
Summary only; full detail in INV §J:
- `scenes.stage_locks`: Record<string, {status, locked_at?}> keyed by stage number string.
- `stage_states.content`: per stage: Stage 1 `Stage1Content`, Stage 2 `Stage2Content` (variations[], activeVariation, processedInput, langsmithTraceId, promptTemplateVersion), Stage 3 `Stage3Content` (beats[], treatmentSource, ...), Stage 4 `Stage4Content` (formattedScript, tiptapDoc, scenes, ...), Stage 5 (locked_visual_style_capsule_id, style_locked_at, manual_visual_tone). Skipped stages: `{}`.
- `style_capsules.design_pillars`: DesignPillars (colorPalette, mood, medium, lighting, cameraLanguage, plus extra string keys).
- `style_capsule_applications.injection_context`: {stage, templateName, formattedContextLength, timestamp, traceId}.
- `shots.reference_image_order`, `shots.end_frame_reference_image_order`: JSON arrays (element shape not traced).
- `shots.transformation_flags`: LLM output list `[{character_name, type, description, is_trigger, is_completion}]` (shotExtractionService.ts:282).
- `project_assets.location_aliases`: string[] (trimmed), location assets only.
- `location_match_events.candidates`: LocationMatchCandidate[].
- `intake_resolutions.options`, `.conflicting_sources`: string[] / string[]|null.
- `image_generation_jobs.provider_metadata`, `video_generation_jobs.provider_metadata`: raw provider response (shape not traced).

---

## 10. Findings (facts; each with status and evidence)

Status flags per brief. Fields: PRESENT / REACH / FUNC / PERSIST / TESTED where relevant.

Ledger mapping: `C-database.ledger.jsonl` ids are `C-FACT-nn` for F-01..F-28 (same numbers). F-29 is `C-FACT-38` and F-30 is `C-FACT-39`. Ledger ids `C-FACT-29..37` are ledger-only facts (style_capsule_applications, prompt_templates RLS, service-role access, buckets, path templates, cascades, triggers, streamline entry point, shot-list lock scope). `C-TABLE-01..28` are the migration tables; `C-TABLE-29..32` are referenced-but-not-created names.

F-01 — `frames.ts` reads `stage_states.state_data` by `project_id` and `stage_number` (frames.ts:261-265, 384-388, 448-452, 766-770, 844-848). Neither column exists (stage_states has branch_id; no state_data). Supabase returns an error that the code does not check (only `data` is destructured), so `visualStyleCapsuleId` is undefined in all five frame generate/regenerate/inpaint paths. Status: PRESENT N for the column, REACH Y, FUNC N (style capsule not applied in these paths), TESTED U. Labels: CONTRADICTED, DEAD (read path).

F-02 — Migration 005 contains an invalid statement: `ALTER TABLE style_capsules ADD CONSTRAINT style_capsules_user_name_unique UNIQUE (user_id, name) WHERE library_id IS NULL;` (005:22-25). PostgreSQL table constraints do not accept a WHERE predicate; the intended partial unique is not created. Its comment (005:20-30) claims the uniqueness is enforced. Under statement-by-statement application, 005's first three statements (drop constraint, drop not null, add library_name_unique) succeed and this one errors. Status: CONTRADICTED (comment vs DDL), PERSIST N for this constraint. Labels: CONTRADICTED.

F-03 — `scenes.stage_locks` is used by six non-test backend and frontend files (INV §14) but is not created by any file in `backend/migrations`. It exists only in `backend/quickies-sql/add_stage_locks.sql`, a file outside the runner chain whose comment says it "Ran successfully on prod". A fresh database built from the migration chain lacks this column, and stage-7 lock/unlock routes that read it fail. Labels: LEGACY, ORPHANED (migration), UNKNOWN (whether the prod DB has it; quickies comment says yes).

F-04 — `projects.ts:3106-3109` updates `frames.status` to `'invalidated'`. frames.status CHECK is (pending, generating, generated, approved, rejected) (019). The update's error is not destructured, so the violation is silent and the frames are not invalidated. Status: CONTRADICTED. The same branch's cost estimate counts `frames` by shot (projects.ts:3073) and reports them as affected, so the response disagrees with the database.

F-05 — `DatabaseService.testConnection` selects `count` from `projects` (database.ts:8-11). `projects` has no `count` column. Error handling only accepts PGRST205, so the check returns false (inference). Only `run-migrations.ts` and `tests/connectivity-test.ts` call it. Labels: DEAD (in app paths), DEAD-CODE for the runner. Status: FUNC N (inferred from code; not run).

F-06 — `text_field_versions` RLS: single policy FOR ALL USING (true) WITH CHECK (true), no TO clause (036:30-34), so it applies to all roles including anon. The table holds prompts for shots and description overrides for scene assets. Frontend does not query it directly. Status: PRESENT Y, REACH Y (via API and DB), persistence Y. Labels: CONTRADICTED with the RLS intent in 036's comment.

F-07 — Project type value contradiction. DB CHECK (001:13) and backend validation (projects.ts:684) use `audio_visual`. Frontend type `ProjectType` (src/types/project.ts:31) and the Stage 1 option (Stage1InputMode.tsx:92) use `audio-visual`. Stage1InputMode.tsx:215,226,457 sends `content.selectedProjectType`. Streamline commit (Stage1InputMode.tsx:457 via project_config) then runs `UPDATE projects SET project_type = ...` inside the RPC (043:197-212), which violates the CHECK, so the whole commit rolls back and the route returns 400 (streamline.ts:77 maps the error). Normal PUT returns 400 "Invalid project type" (projects.ts:684). Result: "Video for Audio" cannot be saved by either route. Status: CONTRADICTED. Labels: CONTRADICTED.

F-08 — `backend/src/services/storyContextService.ts:95` reads Stage 3 `content.treatmentProse` and :113-114 reads Stage 2 `content.treatments` / `selectedTreatmentId`. No writer produces these keys (writers store Stage 2 as `{variations, activeVariation}` and Stage 3 without `treatmentProse`; INV §J). The treatment section is always empty. Status: CONTRADICTED. Labels: DEAD-READ.

F-09 — Branch name embed: `projects.ts:279,490,597,751` select `branches!active_branch_id(name, commit_message)`, then read `project.branches?.[0]?.name` (projects.ts:444,529,617). The embed returns an object (to-one relation), so `[0]` is undefined and the response always reports 'main'. Real name 'Main' (from trigger) is never shown. Status: CONTRADICTED. Labels: CONTRADICTED.

F-10 — Migration runner (see §1). `database.ts:48` depends on an `exec` RPC defined nowhere in the repo; the `;`-split breaks `$$` bodies in ~12 files. The migration chain is therefore not runnable by repo tooling as written. Status: FUNC N (for runner), PERSIST U (how prod was built). Labels: DEAD (runner path), UNKNOWN (manual process).

F-11 — Shot-list unlock path (projects.ts:3073-3124 and sceneStageLocks.ts:209-218). Queries `videos` (no such table, §INV-X) and inserts into `invalidation_logs` (no DDL). Supabase errors are not destructured in the `videos` select at :3078 and :3115 and the sceneStageLocks select at :215-218, so `videosAffected` is always 0 and the video update is a silent no-op. The invalidation_logs insert at :3123 sits in try/catch but returns an error object, not an exception, so it also fails silently. Status: CONTRADICTED. Labels: ORPHANED (table names), DEAD (paths).

F-12 — Attempt caps differ and enforcement is not atomic. scene_asset_generation_attempts: MAX 8 (sceneAssetAttemptsService.ts:8). project_asset_generation_attempts: MAX 4 (projectAssetAttemptsService.ts:9). text_field_versions: MAX 8 (textFieldVersionService.ts:9), enforced only on create. Each enforcement deletes at most one oldest non-selected row (check-then-delete, no transaction). `is_selected` uniqueness uses deselect-then-insert/select with no transaction: a window with zero selected rows exists, and concurrent inserts can violate the partial unique index (sceneAssetAttemptsService/ImageGenerationService; reported by subagent, sampled). Next attempt number is max+1 (non-atomic). Status: PERSIST Y, FUNC P. Labels: DUPLICATED (two cap constants for analogous tables).

F-13 — stage_states insert paths can be rejected by the mig-044 trigger (§3.2). Route-level: the streamline backfill (streamline.ts:150-156) inserts locked stage 2/3 with no check of N-1, so a later unlock of stage 1 or 2 makes the insert fail after the LLM call. The PUT route can likewise fail during an unlock race. Status: FUNC P (race-dependent), U for prod frequency.

F-14 — `origin` is dropped by writers that do not copy it: stageStates.ts lock (:382), unlock draft (:612), outdated (:644), and PUT without origin (:245). After one edit or re-lock, a streamline 'imported' tag becomes NULL. Status: PERSIST P. Labels: LEGACY-ish provenance loss.

F-15 — Storage: frames.ts:1465 removes a path from bucket `frames` that was uploaded to `asset-images` (ImageGenerationService storage_path writes at :402, :468, :540). Bucket `frames` is not created by any repo file and is not written to. The removal error is not checked (`await supabase.storage.from('frames').remove(...)`), so the object stays in `asset-images` (orphan). Status: CONTRADICTED. Labels: ORPHANED (bucket name).

F-16 — `project_assets.description` is NOT NULL (008:61). sceneAssets.ts:878 defaults `description` to `''`, and sceneAssets.ts:932 inserts `description: description || null`. An empty description is converted to null by the JS `||` and violates the NOT NULL constraint, so the insert fails (route returns 500, not verified at runtime). The extraction fallback (assetExtractionService.ts ~631, reported, sampled) can also pass `undefined`. Status: FUNC N for the empty-description case (inferred from code). Labels: CONTRADICTED.

F-17 — `project_assets.locked` semantics. Set TRUE at projectAssets.ts:1565 (requires image_key_url), :1729 (lock-all, extra_archetype with no image), sceneAssets.ts:933 (create with project asset, no image). Set FALSE only on insert. No code path unlocks. Gates: PUT (:586, which still allows changing deferred and asset_type), DELETE (:702), merge (:768), split (:1017), sync (:2084), and assetInheritanceService/sceneAssetRelevanceService filters. Not gated: image upload, generation, edit, clear-all (:1651 clears image_key_url on locked assets), attempts, angle variants, location views, clone match, promote. The frontend never reads `project_assets.locked` (reported; sampled). Status: PARTIAL. Labels: PARTIAL.

F-18 — Camera fields. shots.camera_distance and camera_height (038:105-106) have no CHECK. location_views.camera_distance and camera_height have CHECKs (038:37-39). The view-from-frame path copies `shot.camera_distance`/`camera_height` into location_views (projectAssets.ts:3257-3258). A shot value outside the CHECK sets the insert to fail. LLM extraction normalises these (shotExtractionService.ts:397-405), and the shot PUT accepts any string (projects.ts:2421-2426). Status: FUNC P. Labels: PARTIAL (no CHECK on source).

F-19 — Shot delete cascades. Deleting a shot (projects.ts:2713, 2715, 2833) cascades frames, video_generation_jobs, transformation_events (trigger_shot_id), shot_asset_assignments, location_match_events (039:89), image_generation_jobs (shot_id). transformation_events.completion_shot_id is SET NULL, which disables a gradual event's post state (transformationEventService.ts:174). location_views.established_from_shot_id has no FK and is left dangling. text_field_versions rows for the shot are orphaned (no FK). Status: PERSIST Y (cascade). Labels: PARTIAL (no compensating cleanup for text versions and established_from_shot_id).

F-20 — Shot extraction without guard. The route `POST /:id/scenes/:sceneId/shots/extract` (projects.ts:1711-1977) inserts all extracted shots at :1943 with no delete of existing shots and no existing-shot check in the handler. A second run with repeated shot_id values violates UNIQUE(scene_id, shot_id) and the route returns 500 'Failed to persist shots' (:1944). Whether the frontend can trigger a second run is not traced. Status: FUNC P (inferred). Labels: PARTIAL.

F-21 — `scene_asset_instances.effective_description` is stored but not kept in sync. It is computed on create/populate/inherit (sceneAssets.ts:234, 628, 951, 1071-1099; assetInheritanceService.ts:207, 272). Nothing recomputes it when project_assets.description changes (asset PUT at projectAssets.ts:553 does not touch instances; no DB trigger, 015:34 is a comment). It also goes stale on merge re-point (projectAssets.ts:889-891, 807, 1101) and on text-version write-back (textFieldVersionService.ts:226-236, which writes description_override only). Readers include ImageGenerationService.ts:220-222 (scene-asset image prompt), contextManager.ts:245, promptGenerationService.ts:557/692, transformationEventService.ts:139/247/415. Status: PERSIST Y, FUNC P. Labels: DUPLICATED (same concept in project_assets.description and effective_description).

F-22 — `scene_asset_instances.modification_count` and `last_modified_field` are maintained only by trigger (017) and increment on every UPDATE, including selection changes, use-master toggles, attempt selection, merge/split re-points and text-version write-backs. The frontend treats count > 0 as "edited" (Stage8VisualDefinition.tsx:72, SceneAssetListPanel.tsx:62). Status: FUNC P (false positives). Labels: PARTIAL.

F-23 — `scene_asset_suggestions.asset_type` is CHECK IN (character, location, prop) (024:9). The insert (sceneAssets.ts:793-810) takes the LLM-provided `asset_type` through `z.string()` (sceneAssets.ts:715) with no enum. One bad value fails the whole bulk insert; the frontend swallows the error (Stage8VisualDefinition.tsx:493, 531, reported). The prompt asks for "character | prop | location" (sceneAssetRelevanceService.ts, reported). Status: FUNC P. Labels: PARTIAL.

F-24 — `shots.reference_image_order` is read and written through a frame reorder path (frames.ts:899-922) and the end-frame variant (979-980). Shape not further traced. Status: PERSIST Y. (informational; no defect claimed.)

F-25 — Duplicate numeric prefixes: 022 (two files) and 024 (two files). Lexical sort orders them as 022_add..., 022_scene..., 024_extra..., 024_scene.... No inter-dependency found, so application order does not cause skew under the runner's order. Numeric prefix is not a unique key, so any numeric-order tool is ambiguous. Status: PRESENT Y. Labels: DUPLICATED.

F-26 — `storage-rls-error-work-around.md` (see §4.4): its premise that storage.objects policies gate uploads is not supported by code (backend uses service role, frontend makes no storage calls). Solution 1 policy 2 in the doc differs from the SQL file. Status: CONTRADICTED (premise) / UNKNOWN (runtime). Labels: LEGACY (workaround doc).

F-27 — Schema drift precedent: 039:75-78 says live code already read and wrote `shots.end_frame_reference_image_order` before any migration created it. Together with F-03 (`scenes.stage_locks`) and F-11 (missing `videos` and `invalidation_logs`), the repo's code and migration chain are known to disagree. Status: CONTRADICTED. Labels: CONTRADICTED.

F-28 — `scenes.end_frame_id` (003:28) is a placeholder that was never given an FK, never written, and never read (INV §14). Status: DEAD. Labels: DEAD.

F-29 — `global_assets` and `project_assets` `asset_type` CHECK includes `extra_archetype` (024), but `global_assets` API accepts only 3 types (assets.ts:113, 199). Promotion from project to library (projectAssets.ts:2328) copies the project's type, which may be `extra_archetype`. Status: PARTIAL.

F-30 — Clone path: clone insert omits `source` (projectAssets.ts:1950-1963), so `source` defaults to `extracted`; `'cloned'` (023 CHECK) is never written. Clone sync compares a global URL to a copied project URL, so every sync copies again (projectAssets.ts:2106, reported). Status: PERSIST P. Labels: DUPLICATED (cloned vs extracted).

---

## 11. Cross-slice references (things seen that belong to other slices)
- `backend/src/routes/projects.ts` — the shot-list unlock path (3073-3124, F-04, F-11), shot extraction (1711-1977, F-20), branch-name embeds (279, 444, F-09), scene delete on re-extraction (1426-1436; cascades), shot split/merge/delete (2547-2840, F-19), prompt generation sections (partially sampled).
- `backend/src/routes/stageStates.ts` — stage_states insert paths and origin handling (F-13, F-14); style_capsule_applications write (262-270).
- `backend/src/routes/streamline.ts:66-150` — payload build, backfill insert (F-13), storage staging (279-288).
- `backend/src/routes/frames.ts:261-850` — stage_states state_data (F-01); 1109-1121 frame uploads; 1455-1465 job delete (F-15); 2290-2402 text version writes.
- `backend/src/routes/sceneAssets.ts:876-935` — project_assets description insert (F-16), 1311-1745 attempts/master references, 746-857 suggestions (F-23), 1783-1797 transformation zod (valid enums).
- `backend/src/routes/projectAssets.ts` — locked/deferred gates (F-17), promote/clone (1756-2041, 2286-2350), location view camera copy (3257-3258, F-18), merge (798-907, F-21).
- `backend/src/services/image-generation/ImageGenerationService.ts` — storage path templates (§4.2), job state writes (`*_started_at`, `last_attempt_at` W-only), cap call (456).
- `backend/src/services/contextManager.ts:513-517` — intake_resolutions read; `:216, :266` end_state_summary read (INV §14).
- `backend/src/services/storyContextService.ts:95,113-114` — content key mismatch (F-08).
- `backend/src/services/video-generation/Veo3Provider.ts:337-353` — `videos` bucket and table references (F-11 cross-ref).
- `backend/src/routes/sceneStageLocks.ts` — stage_locks read/write and shot_list_locked_at dual-write (INV §14; F-11).
- Frontend: `src/components/pipeline/Stage1InputMode.tsx:92,215,226,386-393,450-477,457` — audio-visual value (F-07) and streamline payload.
- Frontend: `src/types/project.ts:31`, `src/types/asset.ts:36,39,73,84`, `src/types/scene.ts:135` — types for DB columns (INV §C).
- Frontend `src/components/pipeline/Stage5Assets.tsx:99-105,226-303,1153,1241` — stage 5 JSON content and style_outdated / metadata reads.

---

## 12. Contradictions and unknowns
Contradictions (code vs. DB or comments):
- F-02 (005 comment vs invalid DDL); F-03 (stage_locks absent from chain but used); F-04 (frames 'invalidated' vs CHECK); F-07 (audio-visual vs audio_visual); F-01 (state_data vs stage_states columns); F-08 (treatment keys); F-09 (branch name); F-11 (videos/invalidation_logs); F-15 (frames bucket); F-16 (description NOT NULL vs empty write); F-26 (storage doc premise).
- Migration header comments (006, 013, 014, 015, 044) disagree with the DDL in places (§1.6, §2.4).

UNKNOWN (and what would settle it):
- Whether the production DB matches the migration chain (including whether stage_locks exists, whether `exec` RPC exists, whether 005's user-name uniqueness exists, whether `videos`/`invalidation_logs` tables or buckets exist). Settled by: `information_schema` / `pg_constraint` dump from the live project (not run here; prohibited).
- How the migrations were applied in production and in what order (duplicate-number pairs). Settled by the operator's deployment log.
- Whether a `videos` bucket and a `frames` bucket exist in storage. Settled by `storage.buckets` listing.
- Whether PostgREST exposes `text_field_versions` and `prompt_templates` to the anon key in the live project (default: yes for public schema). Settled by a live anon-key request (not run).
- Runtime success of: F-01 frame paths, F-04 frame invalidation, F-11 unlock cost, F-13 backfill, F-16 empty description, F-20 re-extraction. Settled by running those routes against a DB (not done).
- Test coverage of schema: not assessed beyond noting `image-generation.test.ts:62,95` (branches) and `streamlineExtractFile.test.ts:128` (`hello`). Settled by a grep over `backend/src/tests` with table names (only partly done).

---

## 13. Files not inspected
- `backend/src/services/*` beyond those named (only grep-level for storage and table references).
- `backend/src/routes/*` beyond the excerpts cited (projects.ts, frames.ts, sceneAssets.ts, projectAssets.ts were sampled, not read in full).
- `backend/scripts/seed-*.ts`, `test-style-capsule-influence.ts`, `update-templates-style-capsule.ts` (V2 territory; only grep hits used).
- Auth middleware (how `userId` is derived for backend routes) — cross-slice.
- Tests under `backend/src/tests` and `src/**/__tests__` (not assessed for schema coverage).
- Frontend services beyond grep (`src/lib/services/*`).
- Live database and storage state (not accessible by design).
