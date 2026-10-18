# V10: Confirmation/Checkout (Stage 11), Video Generation (Stage 12), Credits/Cost, Video Providers

Reporter V10. HEAD of `main`. Read-only static analysis. No runtime executed.

## 0. One-paragraph truth

Stage 11 ("Confirm & Render", sidebar label "Review") is a read-only cost-summary screen backed by one GET route that joins `shots` + `frames` + `video_generation_jobs` + `user_credits`. Its single action, **Confirm & Render**, POSTs `confirm-render`, which inserts one `video_generation_jobs` row per shot that has a start-frame image URL, deducts the **whole scene total** (video cost for every shot, including skipped ones, plus accumulated frame image costs) from `user_credits.balance` in a non-atomic read-modify-write, then fire-and-forgets an **in-process, single-threaded, global** executor loop. That loop calls a video provider picked once per process by `VIDEO_PROVIDER` (default `mock`). The **mock** provider (the active default; `VIDEO_PROVIDER` is absent from `backend/.env` and `backend/env.example`) sleeps 3-8 s, fails 5% of the time, and returns the **same public Google sample MP4 for every shot**, ignoring frames and prompt. The **Veo3** provider is a complete-looking Vertex AI `predictLongRunning` + `fetchPredictOperation` client (image-to-video with optional `lastFrame`, `generateAudio: true`) that uploads the result to a Supabase Storage bucket `videos` that no script creates. Stage 12 polls the job list every 3 s while any job is active and plays the per-shot clips back to back in a dual-`<video>` preloading player with a virtual timeline. Nothing stitches clips, exports, or generates separate audio/voice. Export buttons are disabled "Soon" placeholders. "Unsatisfied with results?" only changes a React state variable to stage 7/8/9 and discards the typed description. Credits are never refunded on failure, never topped up (no route), and a second Confirm on the same scene creates a second full set of jobs and charges again.

## 1. Files inspected (all read in full unless noted)

Frontend: `src/components/pipeline/Stage11Confirmation.tsx` (597), `Stage12VideoGeneration.tsx` (344), `CostDisplay.tsx` (99), `Stage12/{ExportSection,IssueResolutionSection,ShotListPanel,TimelineBar,UnsatisfiedDropdown,VideoPlayer,types,utils}` (all), `src/lib/services/checkoutService.ts` (254), `src/types/scene.ts:405-540`, `src/pages/ProjectView.tsx:129-139,505-631,758-833` (partial), `src/components/pipeline/Stage6ScriptHub.tsx:105-138,305-330,418-432` (partial), `ContentAccessCarousel.tsx:160-190` (partial), `SceneWorkflowSidebar.tsx:27-90` (partial), `LockedStageHeader.tsx` (grep only), `src/config/stageInfoContent.ts:95-111`.
Backend: `routes/checkout.ts` (326), `services/videoGenerationService.ts` (675), `services/userCreditsService.ts` (178), `services/video-generation/*` (all 5), `tests/veo3-test.ts` (81), `tests/connectivity-test.ts` (1-40 + grep), `server.ts` (grep), `routes/sceneStageLocks.ts:54-286`, `routes/projects.ts:3050-3130` (partial), `services/frameGenerationService.ts:1365-1515` (partial), `NanoBananaClient.ts:222-236`, `jest.config` (testMatch).
DB: `migrations/020_user_credits.sql`, `021_video_generation_jobs.sql`, `019_frames_table.sql:1-50`, `013_add_end_frame_thumbnail.sql`, `022_add_aspect_ratio.sql`, `003`/`014` (grep for `video_complete`). Env: names only (values not read) of `backend/.env` (untracked), `backend/env.example`, `.env.example`, `.env.local`.

## 2. Route inventory (`backend/src/routes/checkout.ts`, mounted `server.ts:63` as `app.use('/api/projects', authenticateUser, checkoutRouter)`)

| # | Method + path | Ownership check | Service call | Frontend caller | Status |
|---|---|---|---|---|---|
| R1 | GET `/:projectId/scenes/:sceneId/cost-breakdown` (L12-53) | project.user_id + scene in active branch | `getSceneCostBreakdown` | `checkoutService.getCostBreakdown` <- Stage11 useQuery `['checkout',projectId,sceneId]` staleTime 30 s | REACHABLE |
| R2 | GET `/:projectId/credit-balance` (L59-84) | project.user_id | `userCreditsService.getBalance` | `checkoutService.getCreditBalance` (no caller) | ORPHANED client; route reachable by API only |
| R3 | POST `/:projectId/scenes/:sceneId/confirm-render` body `{modelVariant}` default `veo_3_1_fast`, 400 if not fast/standard (L91-142) | project + scene in active branch | `confirmAndQueueRender` | `checkoutService.confirmRender` <- Stage11 `confirmMutation` | REACHABLE |
| R4 | GET `/:projectId/scenes/:sceneId/video-jobs` (L148-202) returns `{jobs, summary{total,completed,failed,active,progress}}`; progress = round(completed/total*100) | project + scene | `getVideoJobs` (all jobs for scene, `created_at` asc) | Stage12 useQuery `['video-jobs',…]`; `ContentAccessCarousel.fetchAllCompletedClips` (every other scene) | REACHABLE |
| R5 | GET `/:projectId/scenes/:sceneId/video-jobs/:jobId` (L208-237) | project only; **job not checked against project/scene** | `getVideoJob` | `getVideoJobStatus` (no caller) | ORPHANED client |
| R6 | GET `/:projectId/scenes/:sceneId/render-status` (L243-266) | project only; scene not checked | `getSceneRenderStatus` | `getSceneRenderStatus` (no caller) | ORPHANED client |
| R7 | GET `/:projectId/batch-render-status` (L272-295) returns `{projectId, sceneStatuses}` | project | `getBatchRenderStatus` | `getBatchRenderStatus` <- Stage6ScriptHub effect, polled every 10 s (`Stage6ScriptHub.tsx:114-129`) | REACHABLE |
| R8 | POST `/:projectId/scenes/:sceneId/video-jobs/:jobId/retry` (L301-324) | project only; **job not checked against project** | `retryJob` | `retryVideoJob` <- Stage12 `handleRetryJob` (VideoPlayer failed overlay + ShotListPanel card) | REACHABLE |

Backend uses `SUPABASE_SERVICE_ROLE_KEY` (`config/supabase.ts:10`), so RLS policies in migrations 020/021 are bypassed; the only authz is the per-route `projects.user_id` check. R5/R8 accept any `jobId` once the caller owns *some* project.

## 3. Stage 11: what it actually does

### 3.1 Render and data (UI -> service -> route -> tables)
`ProjectView.tsx:816-824` renders `Stage11Confirmation` when `sceneStage === 11`, props `onComplete=handleSceneStageComplete`, `onBack=handleSceneStageBack`, `onNext=handleSceneStageNext`.
Chain: `useQuery(['checkout',p,s])` -> `checkoutService.getCostBreakdown` (`checkoutService.ts:32-46`, fetch `/api/...` via Vite proxy to :3001) -> R1 -> `VideoGenerationService.getSceneCostBreakdown` (`videoGenerationService.ts:109-247`):
1. `scenes` select `id, scene_number, slug, branch_id` (L115-119).
2. `shots` select `id, shot_id, shot_order, duration, requires_end_frame, frame_prompt, video_prompt` where `scene_id`, order `shot_order` (L126-138). Zero shots -> throws `'No shots found for this scene'` -> 500 -> Stage 11 error screen with Retry.
3. `frames` `select('*')` `in shot_id` (L150-153); one start/one end per shot (UNIQUE(shot_id, frame_type), `019_frames_table.sql:49`). **Frame status is not filtered**; rejected/generating frames with a stale `image_url` are used.
4. Per shot: `unapprovedFrames` pushed when start frame exists and `status !== 'approved'`, and when `requires_end_frame && endFrame && endFrame.status !== 'approved'` (L187-192). Missing frames are NOT counted as unapproved.
5. `getProjectRunningTotal` over all `video_generation_jobs` of the project (L252-269).
6. `userCreditsService.getBalance` (creates a 100.00 row if missing).
7. `getDependencyWarnings` (L274-313).

### 3.2 Cost formula (verbatim evidence)
`videoGenerationService.ts:5-7`:
```
// Pricing constants ($/second)
export const VEO_31_FAST_RATE = 0.15;
export const VEO_31_STANDARD_RATE = 0.40;
```
`L101-104`: `calculateVideoCost(durationSeconds, modelVariant) { const rate = this.getRate(modelVariant); return parseFloat((durationSeconds * rate).toFixed(4)); }`
`L195-198`:
```
const imageCost = parseFloat(startFrame?.total_cost_credits || 0) +
    parseFloat(endFrame?.total_cost_credits || 0);
const videoCostFast = this.calculateVideoCost(shot.duration, 'veo_3_1_fast');
const videoCostStandard = this.calculateVideoCost(shot.duration, 'veo_3_1_standard');
```
`L221-222`: `sceneTotalCostFast = Σ(imageCost + videoCostFast)`; `sceneTotalCostStandard = Σ(imageCost + videoCostStandard)`; both rounded `toFixed(4)`.
So: **scene total = Σ_shots [ frames.total_cost_credits(start) + frames.total_cost_credits(end, if a row exists regardless of requires_end_frame) + shots.duration × rate ]**, rate 0.15 or 0.40.
- `shots.duration` is INTEGER default 8 (`006_shots_table.sql:13`), un-clamped. Veo3 clamps to 4/6/8 at generation time (`Veo3Provider.ts:23,208-222`) but charging uses the un-clamped value.
- `imageCost` units are "credits" accrued by image generation (`NanoBananaClient.estimateCost` = 0.01 × pixels/512²); Stage 11 sums them with dollar video cost and displays all as `$`. Stage 10 `CostDisplay` shows the same frame numbers as "credits".
- `projectRunningTotal` (L263-268): Σ over all project jobs of `actual_cost` if `status==='completed' && actual_cost` else `estimated_cost` (failed jobs count at estimated). Video-only (no image costs).
- Rates are duplicated in 6 places: `videoGenerationService.ts:6-7`, `MockVideoProvider.ts:44`, `Veo3Provider.ts:158`, `checkoutService.ts:243` (unused), Stage11 UI copy `Stage11Confirmation.tsx:288,306` (`$0.15/second - Quick preview quality`, `$0.40/second - Production quality`), migration 021 comments.

### 3.3 UI computations (client)
`Stage11Confirmation.tsx:101-109`: `totalCost` = fast or standard scene total by local `modelVariant` (useState default `'veo_3_1_fast'`, not persisted). "Video Generation" line = `totalCost − Σ imageCost` (L262). Total duration = Σ `shot.duration`. Confirm disabled when `isPending || userBalance < totalCost` (L377). Insufficient text at L345-349. Low-balance badge when `balance < low_credit_threshold` (default 10). Project running total line only when `> 0`.

### 3.4 Dependency warnings
- Unapproved frames: works as in 3.1.4; text "N frame(s) not yet approved - rendering will use current frames" (L206-207). Non-blocking.
- Prior scene mismatch (L285-310): selects `scenes.id, end_frame_thumbnail` but the column created by migration 013 is `end_frame_thumbnail_url` (`013_add_end_frame_thumbnail.sql:6-7`); no migration adds `end_frame_thumbnail`. PostgREST errors on unknown columns, `.single()` returns `data: null`, the `if (priorScene)` block is skipped, so `priorSceneMismatch` stays `false` and `priorSceneEndFrameUrl` stays `null`. **The "Prior scene has not been rendered" warning (L210-212) is effectively unreachable** (high confidence; a runtime call would confirm). `priorSceneEndFrameUrl` is not rendered by the UI anyway.

### 3.5 Confirm & Render (`confirmAndQueueRender`, `videoGenerationService.ts:318-408`)
1. Re-runs `getSceneCostBreakdown` (L326).
2. `totalCost` = scene total for the chosen variant (L329-331), **including video cost of shots that will be skipped and all frame image costs**.
3. `hasSufficientCredits(userId, totalCost)` -> else throws `Insufficient credits. Required: …, Available: …` -> 500 -> toast.
4. For each shot: **skip if `!shot.startFrameUrl`** (comment says "approved start frame" but only URL presence is checked, L344-348). Row: `project_id, branch_id, scene_id, shot_id(uuid), model_variant, status:'queued', start_frame_id, end_frame_id, start_frame_url, end_frame_url, video_prompt_snapshot: shot.videoPrompt || '', frame_prompt_snapshot, duration_seconds, estimated_cost` (L354-369). `end_frame_url` is the end frame image URL whenever an end-frame row has one, **even if `requires_end_frame` is false**.
5. Zero rows -> throws `No shots with valid frames to render`.
6. Bulk insert into `video_generation_jobs` (L379-386).
7. `userCreditsService.deductCredits(userId, totalCost)` (L394) **after** insert. If it throws (e.g. `totalCost <= 0` -> `'Deduction amount must be positive'`, or a concurrent drain), the route 500s but the queued rows remain, uncharged, and the executor is not triggered on this call.
8. `triggerJobProcessing()` (L414-423): dynamic import of `VideoJobExecutor`, `processQueuedJobs()` not awaited.
9. Returns `{success, jobsCreated, totalEstimatedCost, jobs}`.
Frontend `onSuccess` (L78-82): toast `Queued N video jobs for rendering`, invalidate `['video-jobs',p,s]`, `onComplete()` -> `ProjectView.handleSceneStageComplete` (L589-615): best-effort `sceneStageLockService.lockStage(p,s,11)` (backend requires stage 10 `locked`, `sceneStageLocks.ts:93-105`; failure only logged), push 11 to completed, `setSceneStage(12)`, `persistStage(12)` (localStorage).
Not checked by confirm-render: stage-lock state of stages 7-11, existing jobs for the scene, frame approval. The `['checkout']` query is not invalidated (balance shown stays cached until stale).

### 3.6 Locked Stage 11
When `stage_locks['11']` is locked/outdated, `LockedStageHeader` shows with unlock flow (`unlockStage(11)` -> impact dialog -> `confirmUnlock(11)`) and relock if outdated. `lockAndProceedLabel="Confirm & Render"` is passed but `onLockAndProceed` is not, so that header button never renders (`LockedStageHeader.tsx:137`). **The sidebar Confirm & Render button stays enabled while locked**; pressing it creates a second set of jobs and charges again.

## 4. Credits model

Table `user_credits` (`020_user_credits.sql`): `id, user_id UNIQUE -> auth.users ON DELETE CASCADE, balance NUMERIC(12,4) DEFAULT 100.00, low_credit_threshold NUMERIC(12,4) DEFAULT 10.00, last_topup_at, last_deduction_at, created_at, updated_at` + updated_at trigger + RLS (select/insert/update own).
Service (`userCreditsService.ts`):
- `ensureUserCredits` (L28-73): select by user_id; if absent insert `DEFAULT_STARTING_BALANCE = 100.00`, `DEFAULT_LOW_CREDIT_THRESHOLD = 10.00` (L20-21); handles 23505 race by re-select. Called lazily from every balance read: every Stage 11 load provisions credits.
- `getBalance` -> `{balance, lowCreditThreshold, isLowCredit: balance < threshold}`.
- `deductCredits(userId, amount)` (L92-121): rejects `amount <= 0`; reads balance, throws if `< amount`, writes `balance - amount` + `last_deduction_at`. Read-modify-write, no row lock, no transaction, no ledger table.
- `addCredits` (L126-150): **DEAD** (no caller anywhere in `backend/src` or scripts). No top-up/purchase route, no payment integration.
- `hasSufficientCredits` (L155-158).
When charged: once, at confirm-render, for the full scene estimate. Not charged: image generation (no `user_credits` access outside this slice), auto-retries, manual retries. Never refunded: failed jobs, skipped shots, Veo clamp differences, or `actual_cost` vs `estimated_cost` differences (`actual_cost` is stored but never reconciled). `projectRunningTotal` is display-only.

## 5. Video generation lifecycle

### 5.1 Table `video_generation_jobs` (`021_video_generation_jobs.sql`)
FKs project/branch/scene/shot (CASCADE), `start_frame_id NOT NULL -> frames`, `end_frame_id -> frames`; `model_variant CHECK IN ('veo_3_1_fast','veo_3_1_standard')`; `status CHECK IN ('queued','processing','generating','uploading','completed','failed')` default queued; URL + prompt snapshots; `duration_seconds INTEGER`; `estimated_cost NUMERIC(10,4) NOT NULL`, `actual_cost`; `video_url`, `storage_path`; `error_code`, `error_message`; `attempt_count DEFAULT 0`, `max_retries DEFAULT 3`; `provider_job_id`, `provider_metadata JSONB`; timestamps `created_at, queued_at, processing_started_at, completed_at, updated_at` (+trigger). No uniqueness on (shot_id) or (scene_id, active): duplicates allowed. Only referenced by files in this slice.

### 5.2 Executor (`VideoJobExecutor.ts`)
Singleton constructed on first dynamic import; provider fixed at construction via `createVideoProvider()` (itself cached module-wide). `isProcessing` in-memory flag (L15, L28-31): a second trigger while running is a no-op, but the running loop keeps fetching until no `queued` rows remain, so new rows are picked up. `pollIntervalMs = 5000` (L16) is **unused**: there is no periodic poll and **no startup hook** (grep: `processQueuedJobs` is only called from `triggerJobProcessing`). Global, not per user/project: oldest `queued` job across all users first (`order created_at asc limit 1`, L62-76), strictly serial, 500 ms gap.
`processJob` (L81-172), verbatim transitions:
```
1. updateJobStatus(jobId, 'processing')          // sets processing_started_at
   update attempt_count = (job.attempt_count||0)+1
2. updateJobStatus(jobId, 'generating')
2b. projects.aspect_ratio (default '16:9')
3. provider.generateVideo({ startFrameUrl: job.start_frame_url, endFrameUrl: job.end_frame_url,
     prompt: job.video_prompt_snapshot || '', durationSeconds: job.duration_seconds,
     modelVariant: job.model_variant, aspectRatio })
4. updateJobStatus(jobId, 'uploading', { providerJobId, providerMetadata })   // after provider already uploaded
6. updateJobStatus(jobId, 'completed', { videoUrl, storagePath, actualCost, providerJobId, providerMetadata })  // sets completed_at
7. checkAndUpdateSceneStatus(scene_id)
catch: attemptCount = (job.attempt_count||0)+1; maxRetries = job.max_retries||3
  if (attemptCount < maxRetries) -> status 'queued', error_message, attempt_count   // auto-retry
  else -> updateJobStatus('failed', { errorCode: error.code || 'GENERATION_FAILED', errorMessage }) ; checkAndUpdateSceneStatus
```
Effective: 3 total automatic attempts. `VideoProviderError.retryable` is ignored: PERMANENT errors (safety filter, no videos, bad model) are retried too, each a billable provider call under Veo3. `error.code` from VideoProviderError is one of `TEMPORARY|PERMANENT|RATE_LIMIT|AUTH_ERROR`.
Frames/prompts fed to provider: only `start_frame_url`, `end_frame_url`, `video_prompt_snapshot` (snapshot of `shots.video_prompt` at confirm time), `duration_seconds`, `model_variant`, live `projects.aspect_ratio`. `frame_prompt_snapshot` is stored but never sent.

### 5.3 Scene status side effect
`checkAndUpdateSceneStatus` (`videoGenerationService.ts:516-537`): if **every** job of the scene (all historical rows) is `completed` -> `scenes.status = 'video_complete'` (value allowed by `003`/`014` CHECK). Partial/failed: log only. Never resets.

### 5.4 Retry route (`retryJob`, L563-597)
Requires `status === 'failed'` else throws (500). Resets `status:'queued'`, nulls `error_code, error_message, video_url, storage_path, provider_job_id, provider_metadata, processing_started_at, completed_at`. **Does not reset `attempt_count`**, so the next failure yields `attemptCount >= 3` -> immediate `failed`: manual retry = one attempt. No credit check or charge. Triggers executor.

### 5.5 Refresh / restart behavior
- Browser refresh: all job state is in DB; Stage 12 refetches on mount and polls (`refetchInterval` 3000 ms while any job is queued/processing/generating/uploading or data undefined; `false` otherwise; `staleTime 1000`) (`Stage12VideoGeneration.tsx:56-68`). Re-entering a scene resumes at the first non-locked stage (`ProjectView.tsx:515-551`), so after a successful confirm (11 locked) it resumes at 12.
- Server restart: jobs in `processing|generating|uploading` are orphaned permanently (no reaper/timeout sweep); retry refuses non-`failed`; Stage 12 polls forever and Complete Scene stays disabled. Jobs left `queued` wait until any user's next confirm-render or retry triggers the loop.
- Veo3 in-flight operation names are stored only after the provider returns (step 4), so a restart mid-poll loses the operation.

### 5.6 Render-status aggregation (duplicated, R6 and R7)
`getSceneRenderStatus` L542-558 and `getBatchRenderStatus` L602-634 apply the same rule: all completed -> `complete`; all failed -> `failed`; any active -> `rendering`; some completed and some failed -> `partial`; else `pending`. No jobs -> `pending` (R6) / scene absent from map (R7). Script Hub only reacts to `complete` ("Review Ready" badge + "Review Video" button -> `onEnterSceneAtStage(sceneId, 12)`) and `rendering` badge (`Stage6ScriptHub.tsx:311-330,423-432`); `partial`/`failed` render nothing.

## 6. Providers: selection and completeness

`createVideoProvider.ts:15-33`: `process.env.VIDEO_PROVIDER || 'mock'`; `'veo3'` -> Veo3Provider; anything else -> Mock. Cached for process lifetime. Env names present: `backend/.env` (untracked) and `backend/env.example` contain no `VIDEO_PROVIDER`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, or `GOOGLE_APPLICATION_CREDENTIALS` (name-only grep). So in the checked environment the mock is active.

| Provider | Classification | Proof |
|---|---|---|
| MockVideoProvider (`MockVideoProvider.ts`) | MOCKED, REACHABLE by default | delay `3000 + Math.random()*5000` ms (L19-20); `Math.random() < 0.05` throws `'Mock generation failure: simulated provider error'` (L23-25); returns `videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'` for every job (L10,31); `storagePath: mock/<id>.mp4` (nothing stored); `providerMetadata {provider:'mock', simulatedDelay, inputPrompt: prompt.slice(0,100)}`. Ignores start/end frames, aspect ratio. |
| Veo3Provider (`Veo3Provider.ts`) | PARTIAL: code path complete, config-gated, never exercised by automated tests; FUNCTIONAL UNKNOWN | see 6.1. Requires `VIDEO_PROVIDER=veo3`, `GOOGLE_CLOUD_PROJECT`, ADC credentials, a public Supabase bucket `videos` (no creation script: `scripts/setup-storage-buckets.ts:38` creates `style-capsule-images`, `setup-asset-images-bucket.ts:6` creates `asset-images`). Manual script `src/tests/veo3-test.ts` exercises it directly (not a jest test: `jest.config` testMatch is `**/*.test.ts`). |
| Any other provider | N | None exists. |

### 6.1 Veo3 request/response shape
- Auth: `new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})` (L35-37), ADC; token fetched once per generation (L67, L164-180) and reused through polling; refetched for GCS download.
- Models: `veo_3_1_fast -> 'veo-3.1-fast-generate-001'`, `veo_3_1_standard -> 'veo-3.1-generate-001'` (L17-20).
- Location `GOOGLE_CLOUD_LOCATION || 'us-central1'`. URL `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predictLongRunning` (L107-116).
- Body (L70-104): `instances:[{ prompt? , image:{bytesBase64Encoded, mimeType}, lastFrame?:{bytesBase64Encoded, mimeType} }]`, `parameters:{ durationSeconds: clamp(4|6|8), sampleCount:1, generateAudio:true, aspectRatio: params.aspectRatio||'16:9', personGeneration:'allow_adult', resizeMode:'pad' }`. Frames are downloaded by `fetch(url)` and base64-encoded; MIME guessed from URL substring (`.png`, `.webp`, else jpeg).
- Submit errors: 429 -> RATE_LIMIT, 401/403 -> AUTH_ERROR, else TEMPORARY.
- Polling (L224-302): every `POLL_INTERVAL_MS = 10_000`, until `POLL_TIMEOUT_MS = 5*60*1000`; POST `:fetchPredictOperation {operationName}`; 5xx continues; other non-OK throws; `done && error` -> PERMANENT; `raiMediaFilteredCount > 0` -> PERMANENT "filtered by safety policies"; no videos -> PERMANENT; timeout -> TEMPORARY.
- Result (L308-358): `bytesBase64Encoded` or `gcsUri` (downloaded via `storage.googleapis.com/storage/v1/b/<bucket>/o/<path>?alt=media`); upload to Supabase Storage bucket `videos` at `${GOOGLE_CLOUD_PROJECT}/${Date.now()}.mp4` (`contentType video/mp4`, `upsert:false`); returns `getPublicUrl`.
- Returned `storagePath` (L145) is `videos/${projectId}/${Date.now()}.mp4` computed with a **different** `Date.now()` and a `videos/` prefix, so `video_generation_jobs.storage_path` never matches the real object key. `projectId` here is the **GCP project id**, so all app projects' videos share one folder.
- `actualCost = clampedDuration × (0.15|0.40)`.

## 7. Stage 12: what it shows (state read/write)

`ProjectView.tsx:825-833` renders it when `sceneStage === 12`. Reads: `['video-jobs']` query (R4). Writes: only retry (R8) and stage-12 lock via `onComplete`.
- Empty state: no jobs -> "No Video Jobs" + Back to Confirmation (L209-225).
- Header: progress bar = `summary.progress`, `completed/total`, ETA from `computeETA` = avg(completed_at − processing_started_at) × active count, `~Nm remaining` or `Almost done...` (`utils.ts:89-105`).
- Completion toast once per mount (`wasAllComplete` local state, L79-88).
- **VideoPlayer** (`Stage12/VideoPlayer.tsx`): two `<video>` elements A/B; active plays `currentJob.videoUrl`, other preloads next completed job (`canplaythrough`), swaps on `ended` (L68-131,198-228). Overlays: paused+playable shows start frame + play button; failed shows `errorMessage`, `errorCode`, "Retry Job"; rendering shows start frame at 20% + `getStatusLabel`. Controls: skip back/forward (index ±1, includes non-playable), Play Scene (disabled if no completed jobs), mute (both elements), fullscreen (`requestFullscreen` on container). All state is React state in `Stage12VideoGeneration` (`currentShotIndex, isPlaying, isMuted, globalTimePosition, seekTarget`); nothing persisted.
- **TimelineBar**: segments width ∝ `durationSeconds` (DB value, not actual media duration), colored by status, thumbnail at 20%, click/drag seeks via `resolveGlobalTime` -> `onSeek(shotIndex, localOffset)` (RAF-throttled). Playhead = `globalTimePosition/totalDuration`.
- **ShotListPanel**: one card per job (not per shot; label `Shot {index+1}` is job index, so re-confirmed scenes show duplicates), status badge, expand -> estimated cost, Fast/Standard, gen time, error + Retry. When `allComplete` (every job completed or failed) renders `ExportSection` + `UnsatisfiedDropdown`. "Complete Scene" disabled until `allComplete` -> `handleComplete` -> `onComplete` (only if all successful or `failed > 0`) -> `handleSceneStageComplete` -> lock 12 (requires 11 locked) -> toast "Scene completed!" -> `handleExitScene` (Script Hub, stage 6 persisted).
- **ExportSection** (`ExportSection.tsx`): four `disabled` buttons "Download MP4", "YouTube", "Google Drive", "CapCut" with "Soon" badge; no handlers, no route, no service. **Export does nothing.** The only way to obtain a file is the raw `video_url` (mock: public sample MP4).
- **UnsatisfiedDropdown** (live): popover with issue types -> confirm modal with optional description textarea -> `onReturnToStage(returnStage)`. Mapping (L21-26): `visual-continuity -> 8`, `timing -> 7`, `dialogue-audio -> 9`, `narrative-structure -> 7`. Description is local state and cleared; never sent or stored. Modal copy claims "Your current video jobs will be preserved" (true only because nothing touches them). `ProjectView.handleReturnToStage` (L758-762) only `setSceneStage(stage)`: no unlock, no invalidation, no localStorage persist.
- **IssueResolutionSection**: ORPHANED duplicate of the same behavior (not imported anywhere; identical mapping plus descriptions).
- `LockedStageHeader` appears only when stage 12 is already locked; its "Complete Scene" calls `lockStage(12)` again then `onComplete()`.

## 8. Editing / stitching / audio / voice
None. Repo-wide grep (src, backend/src, package.json files) for `ffmpeg|stitch|concat.*mp4|elevenlabs|text-to-speech|tts|voiceover|lip.sync` returns nothing. Scene "playback" is client-side sequential playback of separate MP4 URLs. The only audio is Veo's native `generateAudio: true` driven by the video prompt text; mock clips carry the sample file's own audio.

## 9. Invalidation / staleness / user-authored content
- No code path updates `video_generation_jobs` on upstream edits (frames regenerated, prompts edited, shot list unlocked). Grep: the table is referenced only by slice files.
- Unlock impact (`sceneStageLocks.ts:214-224` and `projects.ts:3076-3118`) counts/updates a table `videos` that **no migration creates**; count resolves to 0 and the `update({status:'invalidated'})` on `videos` fails silently. Impact cost formula `framesAffected*0.05 + videosAffected*2.50` (hard-coded, unrelated to the 0.15/0.40 rates).
- Prompt snapshots: `video_prompt_snapshot` / URL snapshots are frozen at confirm; later edits to `shots.video_prompt` or frames do not alter queued jobs; retries reuse the snapshot.
- User-authored content in this slice: the issue description (discarded), model choice (transient). No path overwrites user text.

## 10. Tests
None for this slice. No frontend `__tests__` reference Stage11/Stage12/checkoutService/CostDisplay; no backend jest test references checkout/videoGeneration/userCredits/VideoJob/video providers; no e2e spec (`e2e/` has `enhanced-upload-modal.spec.ts`, `story-context-update.spec.ts`). `backend/src/tests/veo3-test.ts` is a manual tsx script (live Vertex call with a hard-coded Supabase image URL), excluded by jest testMatch. `connectivity-test.ts` (`npm run test:connectivity`) tests DB/LangSmith/Gemini only; no video.

## 11. Cross-slice references
- `src/components/pipeline/Stage10FrameGeneration.tsx:898-903` renders `CostDisplay` with `framesData.costSummary.totalCredits` (from `frameGenerationService.getSceneFrameCosts`, `frameGenerationService.ts:1472-1515`).
- `frameGenerationService.ts:1365-1425`: `getFrameJobStatus` (route `frames.ts:502`, frontend `frameService.pollFrameStatus`) calls `onJobCompleted` whenever the job is completed and adds `image_generation_jobs.cost_credits` to `frames.total_cost_credits` without clearing `current_job_id`; repeated status polls after completion could re-accrue. That column is Stage 11's `imageCost`. Whether it repeats in practice is UNKNOWN (depends on poll loop in `frameService.ts:~613`).
- `ContentAccessCarousel.tsx:160-190`: at stages 11/12 fetches R4 for every other scene and shows completed clips (N requests).
- `Stage6ScriptHub.tsx:114-138,311-330,423-432`: batch render badges, 10 s polling, Review Video -> stage 12.
- `sceneStageLocks.ts:93-105`: lock requires previous stage locked; affects whether 11/12 locks stick.
- `projects.ts:3056,3108-3110`: shot-list unlock sets `frames.status='invalidated'`, but `frames.status` CHECK (`019_frames_table.sql:12-18`) lacks `'invalidated'`.
- `migrations/014`: trigger preserves `frames_locked`/`video_complete` scene statuses.
- `src/config/stageInfoContent.ts:95-111`: info-tip copy for stage-11/12 (claims only).
- `SceneWorkflowSidebar.tsx:31-32`: stage 11 labeled "Review", stage 12 "Video".

## 12. Contradictions / unknowns
- CONTRADICTED: comment "Skip shots without approved start frame" (`videoGenerationService.ts:344`) vs code checks only URL presence.
- CONTRADICTED: UI warning "No further edits are possible after confirmation" (`Stage11Confirmation.tsx:366-368`) vs no enforcement; stage 11 unlock and re-confirm are possible.
- CONTRADICTED: `VideoJobExecutor` header "Polls video_generation_jobs table" vs no polling timer (`pollIntervalMs` unused).
- CONTRADICTED: executor step 5 comment "For real providers, we'd upload to Supabase Storage here" vs Veo3 uploads inside the provider; status `uploading` is set after upload already finished.
- CONTRADICTED: `storage_path` stored for Veo3 jobs does not match the uploaded object key.
- CONTRADICTED: retry design (`max_retries`) vs manual retry not resetting `attempt_count`.
- UNKNOWN: whether bucket `videos` exists in the live Supabase project (settle: inspect storage or run `veo3-test`).
- UNKNOWN: whether Veo3 Vertex model IDs `veo-3.1-*-generate-001` and the `fetchPredictOperation` contract are accepted today (settle: run `veo3-test.ts` with credentials).
- UNKNOWN: production `VIDEO_PROVIDER` value (only local untracked `.env` inspected by name).
- UNKNOWN: whether PostgREST in this deployment errors on the missing `end_frame_thumbnail` column (standard behavior is error -> null data).
- UNKNOWN: units intent: "credits" vs "$" are treated as the same number (balance default 100.00 shown as `$100.00`).
