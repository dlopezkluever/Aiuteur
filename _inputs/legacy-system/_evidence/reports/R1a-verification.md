# R1a verification: claims C01 to C11

## Verdict table

| Claim | Verdict | One-line corrected fact |
|---|---|---|
| C01 | CONFIRMED | Five frame routes select `state_data` by `project_id` from `stage_states`, which has neither column in any migration; the error is discarded, so `visualStyleCapsuleId` is always undefined in those five paths. |
| C02 | CONFIRMED | No code writes `projects.writing_style_capsule_id` or `projects.visual_style_capsule_id`; only migration 004 adds them. Five conditional read sites plus three select lists read them, and they are always NULL. |
| C03 | CONFIRMED | The 409 body nests `downstreamStages` under `details`; ProjectView reads it top-level, so the dialog never opens and the else branch auto-confirms the unlock (`confirm=true`), applying the downstream cascade with no prompt. |
| C04 | CONFIRMED (repo DDL) | `scenes.stage_locks` exists only in `backend/quickies-sql/add_stage_locks.sql`; no repo migration or quickie creates `videos` or `invalidation_logs`; `videos` is a storage bucket in Veo3Provider, not a table reference. Live-DB existence is UNDETERMINABLE-STATICALLY. |
| C05 | CONFIRMED | No shot mutation route checks the Stage 7 lock; the migration 014 trigger only copies `shot_list_locked_at` transitions into `scenes.status` and raises nothing; the backend uses the service-role key. |
| C06 | CONFIRMED | `DELETE .../shot-assignments/all` is registered after `DELETE .../shot-assignments/:assignmentId`, so the single-delete handler catches it with `assignmentId='all'`; the bulk route never runs and the one UI caller fails at its first step. |
| C07 | CONFIRMED | Route classifier (`projects.ts:102-112`) resolves at >= 0.72 and can return `ambiguous`; composition (`continuityCompositionService.ts:233`) uses < 0.8 for `suggested` and never returns `ambiguous`; both are live and disagree for confidence in [0.72, 0.8). |
| C08 | CONFIRMED | Runner splits every file on `;` and calls `rpc('exec')`, which no repo file defines; migration 005 Step 4 uses `ADD CONSTRAINT ... UNIQUE ... WHERE` (invalid PostgreSQL grammar, static); the 022 and 024 duplicate pairs are independent and sort deterministically. |
| C09 | CONFIRMED | UI sends `audio-visual`; PUT validator (`projects.ts:684-686`) and DB CHECK (`001:13`) accept only `audio_visual`; Stage 1 save and streamline commit both fail for that value. |
| C10 | CONFIRMED (treatment part) | `storyContextService` reads `treatmentProse`, `treatments`, `selectedTreatmentId`, none of which any writer stores, so the treatment section is always empty; the beat section does populate. Wave-1 V6 FACT-0075 is CONTRADICTED on beat keys. |
| C11 | CONFIRMED | Distillation prompt carries only generated labels ("Character appears in scene N", "Location: X") and style text; the script excerpt is computed into `mention.context` and never read; the only script-sending pass (`extractEntityMentions`) has no caller. |

Wave-1 errors found: one. `WD-IMPL-FACT-0075` (V6) title says "treatment and beat keys do not match"; beat keys match (see C10). Labelled CONTRADICTED in `R1a-FACT-10`. Other wave-1 imprecision is noted per claim (C04 "nonexistent" wording; C02 count wording).

Reporter R1a. Slice: wave-1 claims C01 through C11 from `reports/R1-claims-to-verify.md`. Read-only static verification of `/home/user/workspace/repo` (branch main). No database, network, or server access; no migration or supabase CLI run. Ignored per brief: `._docs/**`, README, AGENTS, CLAUDE, `.claude/**`, `.agents/**`. Ledger: `reports/R1a-verification.ledger.jsonl` (11 FACT entries, one per claim, field `verdict`).

---

## Method

Each claim was traced from the cited code by reading file ranges and by grep. Counts below are from the commands shown. Excerpts are verbatim; line numbers are from `sed -n` or `grep -n` on the current tree.

Repo-wide greps used (non-test, backend and src unless stated):
- `grep -rn "state_data" backend/src src --include=*.ts --include=*.tsx | grep -v tests | wc -l` -> 10 (all in `backend/src/routes/frames.ts`: 5 `.select('state_data')` lines and 5 `stageState?.state_data?.visualStyleCapsuleId` lines). `grep -rn state_data backend/migrations | wc -l` -> 0.
- `grep -rn "writing_style_capsule_id\|visual_style_capsule_id" backend/src --include=*.ts | grep -i "projects\|project_id"` -> only read or select expressions, no insert/update payload.
- `grep -rn "from('projects')" -A6 backend/src/routes` write calls: `projects.ts:573` (insert, fixed field list), `projects.ts:735` (update of `updateData`, whitelist at 642-653), `projects.ts:844` (update `continuity_mode` only). `frames.ts:2071` is an insert into `image_generation_jobs`, not `projects`.
- `grep -rn "from(\s*[a-zA-Z_\`]" backend/src | grep -v "from('"` -> 24 hits, of which one is a dynamic table write (`textFieldVersionService.ts:234`, mapping at :33-37 contains only shots and scene_asset_instances).
- `grep -rln stage_locks backend/migrations` -> 0 files. `grep -rn stage_locks backend/quickies-sql` -> 4 lines in one file. `grep -rn stage_locks backend/src src` (non-test) -> 33 lines.
- `grep -rn "RAISE" backend/migrations/014_add_shot_list_locking_with_trigger.sql` -> 0.
- `grep -rn "CREATE TRIGGER\|CREATE OR REPLACE TRIGGER" backend/migrations` -> 20 hits; none on `shots`, `frames` or `shot_asset_assignments` referencing a lock.
- `grep -rln "CREATE TABLE.*\(videos\|invalidation_logs\)" backend/migrations backend/quickies-sql` -> 0 files.
- `grep -rn "rpc('exec'" backend/src backend/scripts` -> 1 (`backend/src/config/database.ts:48`); `FUNCTION exec` in backend, src, migrations -> 0.
- `ls backend/migrations/*.sql | wc -l` -> 46; `grep -l '\$\$' backend/migrations/*.sql | wc -l` -> 21.
- `grep -n "extractEntityMentions(" backend/src/services/assetExtractionService.ts` -> 1 hit, the definition at :366.
- `grep -rn "audio-visual" backend --include=*.ts` -> 0; in `src`: `Stage1InputMode.tsx:92`, `types/project.ts:31`.

---

## C01: frame routes read nonexistent stage_states columns; capsule id always undefined for frame image jobs

Verdict: CONFIRMED. Wave-1 V2 `WD-IMPL-FACT-0020`, V9 `WD-IMPL-PROV-0009`, C `WD-IMPL-FACT-0141` are correct.

Evidence (decisive lines, `backend/src/routes/frames.ts`):
```
262            .select('state_data')
263            .eq('project_id', projectId)
264            .eq('stage_number', 3)
267        const visualStyleCapsuleId = stageState?.state_data?.visualStyleCapsuleId;
```
Same block at 385-390, 449-454, 767-772, 845-850. Enclosing routes: generate-frames (:227), regenerate (:365), inpaint (:424), regenerate-with-correction (:708), regenerate-with-prompt (:800). Destructuring takes only `data`; the `error` is never read.

Schema: `backend/migrations/001_initial_schema.sql:51-78` (`CREATE TABLE stage_states`) has columns id, branch_id, stage_number, version, status, inherited_from_stage_id, content, prompt_template_version, final_prompt, regeneration_guidance, created_at, created_by, and UNIQUE(branch_id, stage_number, version). No `project_id`, no `state_data`. Later ALTERs of stage_states: 002 (langsmith_trace_id), 004 (none on the table itself; RLS table reference only), 041 (status CHECK, origin). No migration adds `project_id` or `state_data`.

Downstream proof (code):
- `frameGenerationService.ts:896-907`: `createImageJob({ ..., visualStyleCapsuleId, ... })`; the frame path has no `manualVisualTone`.
- `image-generation/ImageGenerationService.ts:139`: capsule is required only for `master_asset`, `scene_asset`, `transformation_post`. Frame job types are exempt.
- `ImageGenerationService.ts:159`: `visual_style_capsule_id: request.visualStyleCapsuleId` (NULL for frame jobs).
- `ImageGenerationService.ts:309-310`: `if (request.visualStyleCapsuleId) { visualStyleContext = await this.getVisualStyleContext(...) }`; no fallback.
- `frameGenerationService.ts:777`: `if (visualStyleCapsuleId) {` gates the style-capsule fetch for prompt generation.

Consequence (code-proven): in those five entry paths, the frame image job is created with no capsule id, no capsule text context and no capsule reference images. Frame image-job creators: `generateFrames`, `regenerateFrame`, `inpaintFrame` are called only from the five routes (grep `\.generateFrames(\|\.regenerateFrame(\|\.inpaintFrame(` finds only frames.ts callers). Zero-cost copy rows at `frames.ts:1930`, `frames.ts:2076`, `frameGenerationService.ts:1095` do not generate images.

Static inference, not observed: supabase-js returns `{ error }` for an unknown column (PostgREST), so `stageState` is null. The discarded error is code-proven; the PostgREST response is not.

Frontend reachability: `src/components/pipeline/Stage10FrameGeneration.tsx:360` calls `frameService.generateFrames`; `src/lib/services/frameService.ts:133` posts to `/generate-frames`; `Stage10FrameGeneration` is rendered at `src/pages/ProjectView.tsx:808`; route mounted at `backend/src/server.ts:60`.

Tests: none reference `state_data` or the capsule lookup (`grep -rln "state_data\|visualStyleCapsuleId" backend/src --include=*.test.ts` returns no test files).

Wave-1 correction: none. Note on wording: V9 PROV-0009 "Frame jobs never receive a style capsule id" holds for all frame image jobs created by the five routes (the only frame-image creators).

---

## C02: projects capsule columns have no writer; read sites always see NULL

Verdict: CONFIRMED. Wave-1 V2 `WD-IMPL-FACT-0019` ("read in five backend places but no code path writes them") is correct. V9 `WD-IMPL-FACT-0117` also correct.

Writers checked (all of backend/src non-test, backend/migrations, backend/scripts, backend/quickies-sql, src):
- Migration 004 only: `backend/migrations/004_style_capsule_system.sql:60-63`:
  ```
  -- Step 5: Update projects table with new Style Capsule references
  ALTER TABLE projects
  ADD COLUMN writing_style_capsule_id UUID REFERENCES style_capsules(id),
  ADD COLUMN visual_style_capsule_id UUID REFERENCES style_capsules(id);
  ```
- Project create: `backend/src/routes/projects.ts:573-583` (insert of user_id, title, project_type, content_rating, genre, tonal_precision, target_length_min, target_length_max only).
- Project update: `backend/src/routes/projects.ts:642-653` destructures only title, project_type, content_rating, genre, tonal_precision, target_length_min, target_length_max, aspect_ratio; `:735` updates `updateData` built from those fields.
- Raw SQL in migrations 042, 043, 044 (`UPDATE projects SET project_type, content_rating, genre, tonal_precision, target_length_min, target_length_max, aspect_ratio, updated_at`; 043:198-210, 044:65-78): no capsule column.
- Dynamic-table write: `textFieldVersionService.ts:234` `.from(mapping.table)`; mapping at `:33-37` covers only `shots` and `scene_asset_instances`.
- `frontend src/`: only one direct `projects` access, a read at `src/lib/services/imageService.ts:148-151`.
- `backend/scripts/test-style-capsule-influence.ts:138` writes `visual_style_capsule_id` to `global_assets`, not `projects`.

Read sites (five conditional reads, plus three select lists):
- `backend/src/services/contextManager.ts:498-499`:
  ```
  writingStyleCapsuleId: project.writing_style_capsule_id || stage1ProjectParams.writingStyleCapsuleId,
  visualStyleCapsuleId: project.visual_style_capsule_id || stage1ProjectParams.visualStyleCapsuleId
  ```
  Consumed at `contextManager.ts:128-131` (writing) and `:144-147` (visual).
- `backend/src/routes/frames.ts:527` (select) and `:569-572` (generate-end-frame-prompt).
- `backend/src/routes/frames.ts:2156` (select) and `:2216-2219` (generate-continuity-prompt).
- `backend/src/routes/projects.ts:3584` (select) and `:3740-3743` (Stage 9 generate-prompts):
  ```
  if (project.visual_style_capsule_id) {
  ...styleCapsule = await styleCapsuleService.getCapsuleById(project.visual_style_capsule_id, userId);
  ```

Consequences (code-proven):
- The three route/service reads that use only the project column (`frames.ts:569`, `frames.ts:2216`, `projects.ts:3740`) always skip capsule loading.
- contextManager's writing capsule still resolves via the Stage 1 fallback: `inputProcessingService.ts:96-101` puts `writingStyleCapsuleId` into `processedInput.projectParams`; the visual fallback `stage1ProjectParams.visualStyleCapsuleId` is never set anywhere (`grep visualStyleCapsuleId` in `Stage1InputMode.tsx`, `Stage2Treatment.tsx`, `Stage3BeatSheet.tsx`, `inputProcessingService.ts`: 0 hits; `src/types/project.ts`: no visual field in ProjectParams), so the visual capsule is undefined in contextManager.
- The visual capsule actually used for Stage 5 assets is `stage_states` stage 5 `content.locked_visual_style_capsule_id` (`src/components/pipeline/Stage5Assets.tsx:227`; read at `backend/src/routes/sceneAssets.ts:375`, `projectAssets.ts:78`).

Count note: the ledger previously said "4 read sites"; corrected to 5 conditional reads (contextManager 498 and 499 in one block; frames 569 and 2216; projects 3740) plus 3 select lists. Wave-1 "five backend places" matches the 5 conditional reads.

---

## C03: Phase A unlock warning dialog never opens; unlock auto-confirms

Verdict: CONFIRMED. Wave-1 V1 `WD-IMPL-FACT-0005` (dialog never opens, auto-confirms) and `WD-IMPL-CAP-0026` are correct.

Backend 409 body (`backend/src/routes/stageStates.ts:596-605`):
```
596      return res.status(409).json({
597        error: 'Unlocking will affect downstream stages',
598        details: {
...
605        requiresConfirmation: true
```
`downstreamStages` and `message` are inside `details`.

Client return (`src/lib/services/stageStateService.ts:189-191`): `if (response.status === 409) { return response.json(); }` — the raw body is returned unchanged.

ProjectView (`src/pages/ProjectView.tsx`):
```
694      const result = await stageStateService.unlockStage(projectId, stageNumber, false);
695      if (result.downstreamStages) {
...
706      } else {
707        // No downstream impact, just unlock directly
708        setPhaseAUnlockStage(stageNumber);
709        setPhaseAUnlockImpact(null);
710        await handleConfirmPhaseAUnlock(stageNumber);
```
`result.downstreamStages` is undefined, so the else branch runs. `handleConfirmPhaseAUnlock` (`:718-724`) calls `stageStateService.unlockStage(projectId, stageNumber, true)`.

Dialog (`ProjectView.tsx:977-979`): `open={phaseAUnlockStage !== null && phaseAUnlockImpact !== null}`; impact is set to null on the else path, so the dialog is never open.

Confirm path side effects (`stageStates.ts:613-660`): inserts a draft version (`status: 'draft'`, version+1) and inserts `status: 'outdated'` rows for each downstream stage whose latest row is `locked` or `outdated`.

Consequence (code-proven): clicking Unlock on a Phase A stage with downstream locked stages applies the draft and the downstream `outdated` rows with no visible warning. The entry point is reachable: `ProjectView.tsx:898-973` pass `onUnlock={() => handlePhaseAUnlock(n)}` to the Stage 1-5 components.

Tests: none for the dialog or the auto-confirm (no src test references `UnlockWarningDialog` or `handlePhaseAUnlock`; `backend/src/tests/shotLocking4_5_task_11.test.ts:90` is `it.skip`).

Not checked: whether the Stage 1-5 locked-state components show their own warning before calling `onUnlock`.

---

## C04: scenes.stage_locks, videos and invalidation_logs have no repo DDL

Verdict: CONFIRMED on repo DDL. Live-DB existence UNDETERMINABLE-STATICALLY (the file in quickies says it ran on prod, which is not verifiable here).

scenes.stage_locks:
- Only DDL: `backend/quickies-sql/add_stage_locks.sql:1` `ALTER TABLE scenes ADD COLUMN stage_locks JSONB DEFAULT '{}';`. The file ends with the comment `-- Ran successfully on prod....`. No migration references `stage_locks`.
- Code selects it in 6 route handlers: `projects.ts:2873` (shots/lock, route :2845) and `:3041` (shots/unlock, route :3020); `sceneStageLocks.ts:38` (GET stage-locks, route :18), plus lock (:56), unlock (:145), relock (:290) handlers.
- Error handling: `projects.ts:2878-2883` returns 404 `SCENE_NOT_FOUND` on any select error; `projects.ts:3046-3048` returns 404; `sceneStageLocks.ts:43-44` returns 404. A DB without the column makes these handlers return 404 for every scene.

videos (DB table):
- Code: `projects.ts:3078-3079` (`from('videos').select('id').in('shot_id', shotIds)`, destructures `{ data: videos }` only); `projects.ts:3115-3116` (`from('videos').update({ status: 'invalidated' })`, result not read); `sceneStageLocks.ts:215` (select, destructures `{ data: videos }` only). Three DB references.
- `backend/src/services/video-generation/Veo3Provider.ts:338` and `:354` are `supabase.storage.from('videos')` (bucket upload and public URL). These are not table reads. Wave-1 wording that treats them as table references is not supported.
- Repo DDL: none. `grep -rln "CREATE TABLE.*\(videos\|invalidation_logs\)" backend/migrations backend/quickies-sql` -> 0. `videos` appears in no migration (`grep -rln "videos\b" backend/migrations backend/quickies-sql` -> none).
- Consequence (code-proven): videos counts are 0 whenever the query errors (no error check); the `.update` at `:3115-3116` result is ignored.

invalidation_logs:
- `projects.ts:3120-3131`:
  ```
  // Log invalidation event (if invalidation_logs table exists)
  try {
    await supabase
      .from('invalidation_logs')
      .insert({ ... })
  } catch (logError) {
    // Logging failure shouldn't block unlock
    console.warn('Failed to log invalidation:', logError);
  }
  ```
  The try/catch cannot catch a supabase-js `{ error }` response (library semantics: the promise resolves; static inference). Consequence: failed inserts are silent.

Cross-slice precision (not a C04 verdict): the frames status update at `projects.ts:3107-3108` (`.update({ status: 'invalidated' })`) targets a CHECK constraint from `backend/migrations/019_frames_table.sql:12-18` that allows only `pending, generating, generated, approved, rejected`. No later migration alters it (`grep -rn "ALTER TABLE frames" backend/migrations` shows 019 and 040; 040 touches continuity columns only). The result is not checked, so the frame invalidation write would be rejected silently if the constraint is live. Static inference from the DDL.

Tests: `backend/src/tests/shotAssetAssignment.test.ts:342-377` mocks `stage_locks` rows; no test covers the missing column, `videos`, or `invalidation_logs`.

Wording caveat: wave-1 V10 `WD-IMPL-TABLE-0028` ("Nonexistent table videos"), V1 `WD-IMPL-TABLE-0005` ("not defined"), C `WD-IMPL-FACT-0151` ("reads nonexistent videos table") state non-existence as fact. The code-proven statement is only that no repo migration or quickie creates them. The live DB is not inspectable here.

---

## C05: Stage 7 shot lock not enforced; trigger enforces nothing on shots

Verdict: CONFIRMED. Wave-1 V8 `WD-IMPL-INVALIDATE-0055` (no shot mutation route checks the lock) is correct. C `WD-IMPL-FACT-0177` (trigger changes only status) is correct; V8 `WD-IMPL-STATE-0066` is correct.

Trigger (`backend/migrations/014_add_shot_list_locking_with_trigger.sql`):
```
29  CREATE OR REPLACE FUNCTION fn_sync_scene_lock_status()
...
35      IF NEW.shot_list_locked_at IS NOT NULL AND OLD.shot_list_locked_at IS NULL THEN
36          NEW.status := 'shot_list_ready';
...
41      ELSIF NEW.shot_list_locked_at IS NULL AND OLD.shot_list_locked_at IS NOT NULL THEN
42          IF OLD.status = 'shot_list_ready' THEN
43              NEW.status := 'draft';
...
58  CREATE TRIGGER trg_sync_scene_lock_status
59  BEFORE UPDATE ON scenes
60  FOR EACH ROW
```
No `RAISE`, no reference to `shots`, `frames` or `shot_asset_assignments`. Other RAISE EXCEPTION uses in migrations (041-044) are `streamline_commit` checks on `stage_states`. No later migration redefines this trigger (`grep -rn "fn_sync_scene_lock_status\|trg_sync_scene_lock" backend/migrations` -> only 014).

Backend client: `backend/src/config/supabase.ts:10,17` uses `SUPABASE_SERVICE_ROLE_KEY`, so RLS is bypassed. RLS policies on `shots` (`006_shots_table.sql:40-...`) do not reference the lock (no `shot_list_locked_at` in any policy; grep confirms).

Backend reads of `shot_list_locked_at`: only `projects.ts:2888` (lock, already-locked guard), `:3051` (unlock guard), `:2964` comment, and sceneStageLocks writes at `:116-118`, `:256-258`, `:352`. No shot-mutation route reads it. Shot-mutation write sites (`.from('shots')` with update/insert/delete), with no lock check in the enclosing handler: `projects.ts` lines 1942, 2017, 2117, 2291, 2371, 2478, 2557, 2598, 2713, 2739, 2833, 3539, 3846; `frames.ts` lines 641, 688, 760, 838, 921, 1007, 1047, 1234, 1554, 1621, 1662, 1852, 2235; shot assignment routes `shotAssignments.ts:129, 162, 195, 223, 251`. Line numbers are the `.from('shots')` write-site lines.

Tests: `backend/src/tests/shotLocking4_5_task_11.test.ts` asserts only 401 for unauthenticated calls to shots/lock and shots/unlock (the file has 110 lines, two describe blocks). No test asserts rejection of shot mutations under a lock.

Frontend gating (only one found): `src/components/pipeline/Stage7ShotList.tsx:624` `const canEdit = !isSceneLocked && isEditable;` and `:1501` lock button disabled when `isSceneLocked`.

Consequence (code-proven): a direct API call to any listed route mutates shots of a locked scene. Not traced for every UI surface.

---

## C06: DELETE /shot-assignments/all is shadowed

Verdict: CONFIRMED. Wave-1 V8 `WD-IMPL-ROUTE-0120` is correct.

Registration order (`backend/src/routes/shotAssignments.ts`, mounted at `backend/src/server.ts:57`):
- `:195` `router.delete('/:projectId/scenes/:sceneId/shot-assignments/:assignmentId', ...)` — registered first; handler calls `shotAssetAssignmentService.deleteAssignment(assignmentId)` (`:201`).
- `:223` `router.delete('/:projectId/scenes/:sceneId/shot-assignments/all', ...)` — registered second; handler calls `deleteAllForScene(sceneId)`.

Express runs the first matching handler; the `:assignmentId` handler always responds (200 or 500), so `/all` never reaches its handler.

Single-delete service (`backend/src/services/shotAssetAssignmentService.ts:173-179`):
```
173  async deleteAssignment(assignmentId: string): Promise<void> {
174    const { error } = await supabase
175      .from('shot_asset_assignments')
176      .delete()
177      .eq('id', assignmentId);
179    if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
```
Column type: `backend/migrations/033_shot_asset_assignments.sql:10` `id UUID PRIMARY KEY`. Passing `'all'` to a UUID equality is rejected by PostgreSQL with an invalid-input error (static inference from the column type; not executed). The thrown error reaches the catch at `shotAssignments.ts:213-215`, which returns 500 with `error.message`.

Client: `src/lib/services/shotAssetAssignmentService.ts:143-146` (`deleteAllForScene` issues `DELETE .../shot-assignments/all`, throws on `!response.ok`). Caller: `src/components/pipeline/Stage9/BulkPresenceTemplates.tsx:131` (`await shotAssetAssignmentService.deleteAllForScene(projectId, sceneId);` as step 1 of `handleApply`, before creating new assignments). Rendered at `src/components/pipeline/Stage9PromptSegmentation.tsx:504` when `sceneShotsData.length > 0 && sceneAssets.length > 0`.

Consequence (code-proven): the bulk-template apply fails at step 1 with an error, and no new assignments are created. The bulk handler at `shotAssignments.ts:223-244` is unreachable for DELETE.

Tests: `backend/src/tests/shotAssetAssignment.test.ts:393-397` tests the service method `deleteAllForScene`; no route-level test covers the `/all` path ordering.

---

## C07: two location classifiers, thresholds 0.72 and 0.8

Verdict: CONFIRMED. Wave-1 V7 `WD-IMPL-STATE-0055` and `WD-IMPL-FACT-0083` are correct; `WD-IMPL-FACT-0079` constants are correct.

Route classifier (`backend/src/routes/projects.ts:102-112`, `buildShotLocationState`):
```
102  let state: LocationContinuityState;
103  if (locationAssetId) {
104    state = source === 'manual' || (confidence ?? 0) >= DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE
105      ? 'resolved'
106      : 'suggested';
107  } else if (source === 'manual') {
108    state = 'unresolved';
109  } else if (resolverResult.isAmbiguous) {
110    state = 'ambiguous';
111  } else if (resolverResult.locationAssetId) {
```
`DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE = 0.72` at `backend/src/services/locationResolverService.ts:73`. `MIN_CANDIDATE_CONFIDENCE = 0.56` at `:72`; `AMBIGUITY_CONFIDENCE_DELTA = 0.06` at `:74`; `isAmbiguous` at `:426`; `shouldApplyResolution` at `:441-445` uses the same 0.72 default. So the route's "resolved" cut equals the auto-apply cut.

Composition classifier (`backend/src/services/continuityCompositionService.ts:231-234`, `locationStateFromShot`):
```
231  let state: ShotLocationState['state'] = 'unresolved';
232  if (locationAssetId) {
233    state = confidence !== null && confidence < 0.8 ? 'suggested' : 'resolved';
234  }
```
Only `unresolved`, `suggested`, `resolved` are assignable; `candidates: []` at `:247`. No `ambiguous` assignment (grep `'ambiguous'` in the file: 0 hits in state logic).

Feeds:
- Route classifier -> shot payload `locationState` (`projects.ts:217-218`); `locationValidation` summary for GET shots (`projects.ts:1573-1576`, `:2162`); Stage 7 UI reads `locationState.state` and `candidates` (`src/components/pipeline/Stage7ShotList.tsx:313-345`).
- Composition -> `buildGenerationPackages` (`projects.ts:3410`) -> GET `continuity-preview` (`projects.ts:3283`) -> `src/lib/services/locationContinuityService.ts:95` -> Stage 10 (`src/components/pipeline/Stage10FrameGeneration.tsx:265`). In this pass no generation-path consumer of the composition `locationState` was found (grep `\.locationState\b` in backend/src: only projects.ts and the composition file).

Tests: `backend/src/tests/locationResolver.test.ts` and `backend/src/tests/continuityCompositionService.test.ts` exist; not checked for assertions on the 0.72 or 0.8 cuts.

Concrete divergence (code-proven): a shot with `location_asset_id` set, `location_match_confidence` 0.75 and source not `manual` is `resolved` in the Stage 7 payload and `suggested` in continuity-preview.

---

## C08: migration runner and exec RPC; migration 005; duplicate numbers

Verdict: CONFIRMED.

Runner: `backend/scripts/run-migrations.ts:19-30` — `readdirSync(migrationsDir).filter(.sql).sort()`, then `await DatabaseService.runMigration(migrationPath)` for each. Migrations dir = `process.cwd()/migrations`.

`backend/src/config/database.ts`:
```
41      .split(';')
42        .map(stmt => stmt.trim())
...
48          const { error } = await supabase.rpc('exec', { query: statement });
49          if (error) {
...
54            throw new Error(`Migration failed: Supabase doesn't support direct SQL execution via API. Please run the migration SQL in your Supabase SQL Editor: ${statement.substring(0, 100)}...`);
```
`exec` definition: none in backend/src, backend/scripts, src, backend/migrations (grep `FUNCTION exec|function exec` -> 0). The runner therefore throws on the first statement of the first file. `package.json:14` defines `"migrate": "tsx scripts/run-migrations.ts"` (not run).

Splitting: 21 of 46 migration files contain `$$` bodies (grep count); splitting on `;` inside them yields fragments (example: `014:29-45` plpgsql body with `;` after each assignment).

Migration 005 Step 4 (`backend/migrations/005_make_library_optional.sql:22-25`):
```
22 ALTER TABLE style_capsules
23 ADD CONSTRAINT style_capsules_user_name_unique
24 UNIQUE (user_id, name)
25 WHERE library_id IS NULL;
```
Step 3 (`:15-18`, `UNIQUE (library_id, name) DEFERRABLE INITIALLY DEFERRED;`) is valid. A table-level UNIQUE constraint does not accept a `WHERE` predicate; a partial unique needs `CREATE UNIQUE INDEX ... WHERE`. Static check against PostgreSQL grammar (no parser available offline; no database access allowed). Per-statement execution would apply 005 Steps 1 to 3 and error at Step 4; whole-file batch execution would be rejected at parse time. Live state UNKNOWN.

Duplicate numbers: 022 pair is `022_add_aspect_ratio.sql` (10 lines, ALTER projects) and `022_scene_asset_generation_attempts.sql` (152 lines). 024 pair is `024_extra_archetype_and_style_outdated.sql` (ALTERs project_assets/global_assets constraints) and `024_scene_asset_suggestions.sql` (CREATE TABLE referencing scenes and project_assets). Within each pair there is no cross-reference, so order does not affect dependencies. Sort is JS default string sort: `022_add_aspect_ratio` < `022_scene_asset...`; `024_extra...` < `024_scene...`. Deterministic.

Tests: none reference `runMigration` or `run-migrations`.

Wave-1 C `WD-IMPL-FACT-0150` correct. C-database F-02 (C reporter's narrative) agrees on 005.

---

## C09: 'audio-visual' vs 'audio_visual'

Verdict: CONFIRMED on both sides.

Frontend:
- `src/types/project.ts:29-31`: `export type ProjectType = | 'narrative' | 'commercial' | 'audio-visual';`
- `src/components/pipeline/Stage1InputMode.tsx:92`: `{ id: 'audio-visual', label: 'Video for Audio', description: 'Visual accompaniment for podcasts, audiobooks' },` rendered by `projectTypes.map` at `:725`.
- Sent as `project_type: content.selectedProjectType!` at `Stage1InputMode.tsx:214-216` and `:225-227` (PUT via `projectService.updateProject`, `src/lib/services/projectService.ts:57-70`, which throws on `!response.ok`), and in `projectConfig` for streamline at `:457`.

Backend:
- PUT validator `backend/src/routes/projects.ts:684-686`: `if (!['narrative', 'commercial', 'audio_visual'].includes(project_type)) { return res.status(400).json({ error: 'Invalid project type' }); }`
- DB CHECK `backend/migrations/001_initial_schema.sql:13`: `project_type TEXT NOT NULL DEFAULT 'narrative' CHECK (project_type IN ('narrative', 'commercial', 'audio_visual')),`
- Streamline: `backend/src/routes/streamline.ts:71` `payload.project_config = projectConfig;` -> `streamline_commit_atomic` (`backend/migrations/044_streamline_atomic_intake_fix.sql:65-66`: `UPDATE projects SET project_type = COALESCE(payload->'project_config'->>'project_type', project_type)`). `043_intake_resolutions.sql:198-199` has the same statement. No migration after 001 alters the CHECK.
- `grep -rn "audio-visual" backend --include=*.ts` -> 0.

Consequences (code-proven):
- Stage 1 save: PUT returns 400, `updateProject` throws; the try/catch at `Stage1InputMode.tsx:292-294` logs `Failed to save project configuration` and does not call `onComplete`. No user-visible message. For a new project, `createProject` has already created the row with the default `narrative` type.
- Streamline commit: the UPDATE violates the CHECK; the atomic function rolls back; `streamline.ts:77-82` returns 400 with the RPC message. Exact Postgres text not observed.

Tests: none in `backend/src` or `src` reference `audio-visual` or `audio_visual`.

Wave-1 V1 `WD-IMPL-FACT-0006`, V3 `WD-IMPL-FACT-0046` and C `WD-IMPL-FACT-0147` are accurate.

---

## C10: storyContextService treatment keys never written; treatment section always empty

Verdict: CONFIRMED for the treatment section. Wave-1 V3 `WD-IMPL-FACT-0042` and C `WD-IMPL-FACT-0148` are accurate. Wave-1 V6 `WD-IMPL-FACT-0075` is CONTRADICTED on its beat-key claim.

Reads (`backend/src/services/storyContextService.ts`):
```
82      if (content.beats && Array.isArray(content.beats)) {
...        beatEntry = beats.map((b) => `Beat ${b.order}: ${b.text}`).join('\n');
95      if (content.treatmentProse && typeof content.treatmentProse === 'string') {
96        treatmentSection = content.treatmentProse;
...
113        const treatments = content.treatments as Array<{ id: string; content?: string }> | undefined;
114        const selectedId = content.selectedTreatmentId as string | undefined;
```
Stage 3 writer (`src/components/pipeline/Stage3BeatSheet.tsx:47-53` interface, `:348-351` save):
```
348        treatmentSource: {
349          content: treatmentData.treatmentProse,
350          variantId: treatmentData.selectedVariantId
351        },
```
`treatmentProse` is a local key in `treatmentData` (`:313`), not a saved key. Stage 3 beats are saved as `beats` with `order` and `text` (`Beat` type `src/lib/services/beatService.ts:5-13`). So the beat section matches.

Stage 2 writer (`src/components/pipeline/Stage2Treatment.tsx:26-29` interface: `variations`, `activeVariation`; `:200` `variations: result.variations`). Backend writer `backend/src/services/streamlineBackfillService.ts:89-98` also uses `variations` and `activeVariation`.

Writers of `treatments` or `selectedTreatmentId`: none (grep `\btreatments\b` in backend/src and src non-test: only treatmentService parsing of LLM output and `storyContextService.ts:113`; `selectedTreatmentId`: only `storyContextService.ts:114`).

Writer persistence: `backend/src/routes/stageStates.ts:231` saves `content` as sent (no key remapping).

Consequence (code-proven): `treatmentSection` is `''`; the prompts at `storyContextService.ts:306` and `:391` render `(not available)` for the treatment on every call. Callers: `backend/src/routes/sceneAssets.ts:2226` (infer-context) and `:2274` (bulk-infer-context) via `inferAssetContext` (`storyContextService.ts:151`) and `bulkInferAssetContext` (`:179`).

Tests: `backend/src/tests/storyContextService.test.ts` replicates parsing and prompt logic and does not import the service, so `assembleSceneStoryContext` is untested.

Wave-1 CONTRADICTED correction: `WD-IMPL-FACT-0075` title "Story-context treatment and beat keys do not match stored Stage 2/3 content" is wrong for beats; its summary and evidence describe only the treatment keys. Recorded as CONTRADICTED in `R1a-FACT-10`.

---

## C11: asset extraction sends the model no script text

Verdict: CONFIRMED. Wave-1 V5 `WD-IMPL-ENTITY-0011` ("The LLM prompt receives only names, types, scene numbers and style, not script text") and `WD-IMPL-DEAD-0015` ("extractEntityMentions is never called") are correct.

Mention construction (`backend/src/services/assetExtractionService.ts`):
- Characters `:192-196`: `const context = this.extractContextFromScript(scene.script_excerpt);` ... `text: \`Character appears in scene ${scene.scene_number}\`, context: context`.
- Props `:228-232`: `text: \`Prop appears in scene ${scene.scene_number}\``.
- Locations `:262-266`: `text: \`Location: ${location}\``.
- `extractContextFromScript` `:349-357`: first 3 lines, max 200 chars, from `scenes.script_excerpt`.

Distillation prompt (`distillVisualSummary`, `:521-549`):
```
542    const mentionsText = entity.mentions
543      .map(m => `Scene ${m.sceneNumber}: ${m.text}`)
544      .join('\n\n');
546    const userPrompt = `Asset: ${entity.name} (${entity.type})
547  Style Context: ${styleContext.description}
549  All script mentions:
550  ${mentionsText}
```
LLM call `:568-574`: `llmClient.generate({ systemPrompt, userPrompt, temperature: 0.4, maxTokens: 2048, ... })`.

`mention.context` is never read: `grep -n "\.context\|mentions.*context" assetExtractionService.ts` -> `:335` (writes prop.contexts[0]) and `:388` (text of the dead prompt only). The tiptap fallback fallback description at `:645` uses `m.text` only.

Tests: none reference `assetExtractionService`.

Dead pass: `extractEntityMentions(masterScript)` (`:366`) is the only pass whose prompt includes script text (`:379` "Analyze this screenplay..."); `grep -n "extractEntityMentions(" assetExtractionService.ts` -> definition only.

Entry points: `aggregatePreview` (`projectAssets.ts:165` extract-preview; `:183`), `extractSelectedAssets` (`projectAssets.ts:273` extract-confirm; `:325`), deprecated `extractAssets` (`:107-124`, no caller found in backend/src non-test; not traced further).

Consequence (code-proven): the distilled description is derived from entity name, type, style text and generated scene labels only. Script excerpts from `scenes.script_excerpt` are not sent. The only sources of visual detail reaching the model are the style descriptor, the name and the model itself.

---

## Cross-slice references

- `frames.ts:2216-2219` and `frames.ts:569-572` read the projects capsule column that no code writes (C02). Owned by frames slice.
- `projects.ts:3107-3108` (shot-list unlock frames update to `invalidated`) violates `019_frames_table.sql:12-18` CHECK if live (C04 precision). Owned by shots/frames slice.
- `projects.ts:2878-2883` and `:3046-3048`: 404 on missing `scenes.stage_locks` column (C04). Owned by scene-locks slice.
- `shotAssetAssignmentService.ts:318-347`: `invalidateStage9AndDownstream` changes `stage_locks` 9-12 only (C05). Owned by shot-assignments slice.
- `continuityCompositionService.ts:247`: composition candidates always `[]` (C07). Owned by continuity slice.
- `Stage1InputMode.tsx:292-294`: silent catch on Stage 1 save (C09). Owned by Stage 1 slice.
- `storyContextService.ts:306,391`: treatment placeholder in inference prompts (C10). Owned by asset-context slice.
- `assetExtractionService.ts:366` dead `extractEntityMentions` (C11). Owned by asset-extraction slice.
- `migrations/005:22-25` invalid UNIQUE ... WHERE (C08). Owned by DB slice.
- `backend/src/config/supabase.ts:10,17`: backend service-role client (C05). Owned by backend shell slice.

## Contradictions / unknowns

Contradictions with wave 1:
- `WD-IMPL-FACT-0075` (V6): beat keys claim wrong; beats match. CONTRADICTED (R1a-FACT-10).
- Overstated "nonexistent" wording for `videos`, `invalidation_logs` in V1 `WD-IMPL-TABLE-0005`, V10 `WD-IMPL-TABLE-0028`, C `WD-IMPL-FACT-0151`: repo-level absence is proven; live-DB absence is not (not labelled CONTRADICTED; caveat recorded in R1a-FACT-04).
- C02 count wording: 5 conditional read sites, not 4 (ledger note corrected to match V2 `WD-IMPL-FACT-0019`).

Unknowns (not determinable statically):
- Live DB existence of `scenes.stage_locks`, `videos`, `invalidation_logs`, `style_capsules_user_name_unique`, `exec` RPC, and whether migration 005 applied. Settled by: `information_schema.columns`, `pg_proc`, `pg_constraint` dump of the live project (not run; prohibited).
- Exact PostgREST and PostgreSQL error text for: unknown `stage_states` column (C01), UUID `'all'` (C06), CHECK violation on `audio-visual` (C09). Settled by an executed request against a disposable database, not run here.
- Whether any Stage 1-5 component shows its own warning before calling `onUnlock` (C03). Settled by reading the Stage 1-5 locked-state components (not traced).
- Whether the composition `locationState` is consumed beyond the Stage 10 preview (C07). Settled by grep of frontend consumers of `continuity-preview` response field `packages[].locationState`.
- Whether the deprecated `extractAssets` (`assetExtractionService.ts:107`) has any caller (C11). Grep of `backend/src` non-test found none in this pass; route-level grep not exhaustive.
- Test coverage was checked by grep per claim (see each section); no test runs were performed.

## Files

- Report: `/home/user/workspace/repo/.amp/in/archaeology/reports/R1a-verification.md`
- Ledger: `/home/user/workspace/repo/.amp/in/archaeology/reports/R1a-verification.ledger.jsonl` (11 lines, `R1a-FACT-01` to `R1a-FACT-11`; validated with `jq -c .`)
