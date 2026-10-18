# I: Runtime architecture, async work, reliability, auth, environment, deployment (reporter I, wave 2)

Read-only static reconstruction of the whole repo as a running system. Nothing was executed: no server, no database, no provider, no migration, no supabase CLI. Environment files were read by variable name only (`grep -o` on the key prefix); no value from `.env.local`, `backend/.env`, or any secret was printed. `._docs/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, and `.agents/` were not used as evidence. Wave-1 reports (E, V10, C, V1, R1 claim list, merged ledger) were used as leads; each restated claim carries its provisional `WD-IMPL-*` id and the code I checked. Ledger: `I-infra-async.ledger.jsonl` (59 lines: 21 FACT, 10 PROV, 11 ROUTE, 12 STATE, 5 PRESSURE). Lids are `H-<KIND>-NN`.

Flag legend used below: Y, N, P (partial, reason given), U (unknown, what would settle it), MOCK, DEAD, ORPHANED, CONTRADICTED.

---

## 1. Runtime topology as it exists

### 1.1 Processes and external systems

| Component | Where it runs | Evidence |
|---|---|---|
| Browser SPA (React 18, Vite) | Built by `vite build`; dev server on port 8080 | `vite.config.ts:9` (`port: 8080`), `package.json` scripts (root) |
| Express API (Node, ESM) | `backend/src/server.ts`, port `PORT` default 3001 | `backend/src/server.ts:28`, `:96` |
| Supabase Auth | Called from the browser (sign-up, sign-in, session) and from the API (`auth.getUser` for every request) | `src/lib/stores/auth-store.ts:28-124`, `backend/src/middleware/auth.ts:27` |
| Supabase Postgres | Browser: one `scenes` read. API: everything, via service-role PostgREST | `src/hooks/useSceneInfo.ts:25-29`, `backend/src/config/supabase.ts:17-22` |
| Supabase Storage | API only (buckets below) | section 1.4 |
| Gemini API (Google AI) | API: text via LangChain, image and vision via `@google/generative-ai` | `backend/src/services/llm-client.ts:66-100`, `backend/src/services/image-generation/NanoBananaClient.ts:118-120` |
| Vertex AI (Veo 3.1) | API, only when `VIDEO_PROVIDER=veo3`, ADC auth | `backend/src/services/video-generation/Veo3Provider.ts:8-10`, `:107-116` |
| Google Cloud Storage | API downloads Veo `gcsUri` results over HTTPS | `backend/src/services/video-generation/Veo3Provider.ts:370` |
| LangSmith | API, via `langsmith` client and `@langchain/core` env tracer | `llm-client.ts:82-84`, `:154-161`; see section 7 |
| Fly.io | Hosts the API only (config in repo) | `backend/fly.toml` |

No WebSocket, SSE, Supabase Realtime (`channel`, `subscribe`, `postgres_changes`), Web Worker, service worker, webhook, cron, or pg_cron was found in `src`, `backend/src`, or migrations (grep, zero matches).

### 1.2 Express middleware and mount order (`backend/src/server.ts`)

| Order | Line | Element | Effect |
|---|---|---|---|
| 1 | 31 | `helmet()` (helmet 7.2.0) | default security headers |
| 2 | 34-39 | `cors({ origin, credentials: true })` | prod origin list `['https://your-frontend-domain.com']`; otherwise `['http://localhost:5173','http://localhost:3000']` |
| 3 | 42-43 | `express.json({limit:'10mb'})`, `express.urlencoded({limit:'10mb'})` | body limit |
| 4 | 46 | `/api/health` (no auth) | static 200 JSON |
| 5 | 49-72 | `/api/projects` mounted 9 times, each with `authenticateUser`: projects, projectAssets, sceneAssets, shotAssignments, frames, checkout, stageStates, streamline, sceneStageLocks | see 2.2 on repeated auth |
| 6 | 75-87 | `/api/llm`, `/api/seed`, `/api/style-capsules`, `/api/images`, `/api/assets`, each with `authenticateUser` | |
| 7 | 90 | `errorHandler` (4-argument) | only reached through Express error propagation |
| 8 | 95-99 | `app.listen(PORT)` unless `NODE_ENV === 'test'` | |

No 404 handler (unmatched paths fall to Express default), no rate limiter, no compression, no request logger, no global `unhandledRejection` or `SIGTERM` handler (grep over `backend/src`, non-test, zero matches for `process.on`, `SIGTERM`, `SIGINT`, `winston`, `pino`, `morgan`). Route modules: 15 files, 198 router registrations (scan of `backend/src/routes`), all mounted. Per file: projects 29, projectAssets 37, sceneAssets 36, frames 27, checkout 8, shotAssignments 8, stageStates 6, streamline 7, sceneStageLocks 4, llm 13, images 3, assets 7, styleCapsules 11, seed 1, health 1.

### 1.3 Browser to API and browser to Supabase

- Every `fetch(` in `src` (210 matches including `refetch(`) targets a relative `/api/...` URL. No absolute API origin and no `VITE_API_URL` exists (grep). Dev traffic goes through the Vite proxy `/api` to `http://localhost:3001` (`vite.config.ts:12-18`). Production routing of `/api` is not in the repo: UNKNOWN.
- Every service attaches `Authorization: Bearer <session.access_token>` obtained from `supabase.auth.getSession()` (157 call sites; example `src/lib/services/checkoutService.ts:18-27`).

Direct browser calls to Supabase (complete list from grep of `supabase.` in `src`):

| Call | Site | Notes |
|---|---|---|
| `auth.getSession()` | 157 sites (services and components) | token source for bearer header |
| `auth.signUp`, `auth.signInWithPassword`, `auth.signOut` | `src/lib/stores/auth-store.ts:30,53,76` | email and password only |
| `auth.onAuthStateChange` | `src/lib/stores/auth-store.ts:109` | listener never unsubscribed |
| `from('scenes').select('scene_number, slug').eq('id', …).single()` | `src/hooks/useSceneInfo.ts:25-29` | used by Stages 7, 9, 10, 11, 12 (`Stage7ShotList.tsx:90`, `Stage9PromptSegmentation.tsx:90`, `Stage10FrameGeneration.tsx:191`, `Stage11Confirmation.tsx:52`, `Stage12VideoGeneration.tsx:42`); the only browser table read in the SPA; depends on RLS for `scenes` |
| `from('projects').select('active_branch_id')` | `src/lib/services/imageService.ts:146-155` | module has no importers (ORPHANED) |

No browser storage, rpc, realtime, or functions calls exist.

### 1.4 Backend to Supabase

- One runtime client: `backend/src/config/supabase.ts:17-22`, built with `SUPABASE_SERVICE_ROLE_KEY`, `autoRefreshToken:false`, `persistSession:false`. A user-scoped client is never created (grep for `createClient(` in `backend/src` and `scripts`: the only runtime call is this one). RLS therefore never applies to API traffic.
- PostgREST: all `supabase.from(...)` in non-test `backend/src` (29 distinct table names, see C-database).
- Storage buckets referenced by backend code:

| Bucket | Writers | Creator in repo | Evidence |
|---|---|---|---|
| `asset-images` | image jobs (`ImageGenerationService.ts:379-383`, `:851`), uploads in `projectAssets.ts` (`:1327`, `:3088`), `sceneAssets.ts` (`:1713`), `frames.ts` (`:1109`), `assets.ts` (`:367`), `streamline.ts` (`:279`), `assetImageLocalizer.ts` (`:75`), attempts services | `backend/scripts/setup-asset-images-bucket.ts` | about 20 sites |
| `style-capsule-images` | `styleCapsules.ts:388-402` | `backend/scripts/setup-storage-buckets.ts` | |
| `videos` | `Veo3Provider.ts:337-338` (upload), `:353-354` (public URL) | none (no script, no migration) | H-FACT-13 |
| `frames` | `frames.ts:1465` `remove` only; uploads for the same objects go to `asset-images` | none | H-FACT-13 |

- RPCs: `streamline_commit_atomic` (called `routes/streamline.ts:77`, defined `backend/migrations/044_streamline_atomic_intake_fix.sql:38`); `exec` (called `backend/src/config/database.ts:48`, defined nowhere; see section 6.4).

---

## 2. Authentication and authorization, end to end

### 2.1 Token flow

1. Sign-up or sign-in in the browser through supabase-js (`auth-store.ts:28-72`). Session persisted by supabase-js (`src/lib/supabase.ts:11-16`: `persistSession:true`, `autoRefreshToken:true`) and additionally by zustand `persist` under localStorage key `auth-storage`, whose `partialize` keeps `user` and `session` (including tokens) (`auth-store.ts:129-135`).
2. Each API call: `Authorization: Bearer <access_token>` from `getSession()`. A call with no session throws client-side `User not authenticated` (`checkoutService.ts:18-27`); there is no 401 handler anywhere in `src` (grep for `401`, `403`, `SIGNED_OUT`, `TOKEN_REFRESHED` returns nothing relevant).
3. Backend `authenticateUser` (`backend/src/middleware/auth.ts:16-44`): missing or non-Bearer header returns 401 `{error:'Authorization header missing or invalid'}`; otherwise `supabase.auth.getUser(token)` (network call to Supabase Auth, service-role client) and on error 401 `{error:'Invalid or expired token'}`; on success `req.user = {id, email}`. JWT is not verified locally; no role or claim is read.
4. Routes take identity only from `req.user.id`. Grep for `body.user_id`, `body.userId`, custom identity headers: none.

### 2.2 Repeated authentication on `/api/projects`

`app.use('/api/projects', authenticateUser, router)` is registered for nine routers (`server.ts:49-72`). Express runs the middleware of every matching layer that calls `next()`. A request handled by the Nth mount therefore passes through N `authenticateUser` calls, each a Supabase Auth round trip. Examples: frames route = 5 calls, checkout = 6, stageStates = 7, streamline = 8, sceneStageLocks = 9. Derived from mount order; not measured.

### 2.3 Ownership checks by route family

Method: static scan of all 198 registrations. For each handler body the scan looked for `user_id`/`userId` references (loose pass) and for explicit `.eq('user_id', …)`, `user_id !==`, or a named helper (strict pass). Results were then read for each flagged family.

| Family (file) | Routes | Check on path projectId | Sub-resource binding (ID in path or body to project) | Verdict |
|---|---|---|---|---|
| projects (`projects.ts`) | 29 | `.eq('user_id', userId)` (e.g. `:284`, `:496`) | scene and shot routes rely on project scoping | Y (project); sub-resource P |
| projectAssets (`projectAssets.ts`) | 37 | project lookup | sub-resource scoping not exhaustively verified | Y (project); sub-resource P |
| sceneAssets (`sceneAssets.ts`), non-transformation routes | 28 | project lookup on all but noted below | per route | Y (project) |
| sceneAssets transformation-events | 8 (lines 1813-1960) | **none on 7 of 8** (GET `:1813`, POST `:1828`, PUT `:1852`, confirm `:1871`, DELETE `:1886`, generate-post-description `:1901`, generate-prefill `:1916`); generate-post-image `:1944` checks | none; handlers pass only `sceneId`/`eventId` to the service | **N (7 routes)** |
| frames (`frames.ts`) | 27 | project lookup (`:71-83` pattern) | scene/shot scoping not exhaustively verified | Y (project) |
| checkout (`checkout.ts`) | 8 | project lookup; scene bound to `active_branch_id` on R1 and R4 (`:148-165`) | video-job by id not bound (R5 `:208-237`, R8 `:301-324`); render-status not bound (`:243-266`) | P |
| shotAssignments | 8 | `verifyProjectOwnership` (`:36-72`): project, then scene exists, then `branches` row with `project_id` | full chain | Y |
| stageStates | 6 | project lookup | stage rows by project | Y (project) |
| streamline | 7 | project lookup | project-scoped | Y (project) |
| sceneStageLocks | 4 | project lookup | scene scoping | Y (project); P |
| assets (global) | 7 | `global_assets` filtered by user | by id | Y |
| images | 3 | generate: project only (`images.ts:26-36`); jobs GET: project or global-asset ownership (`:88-115`), 400 if neither | generate passes `assetId`, `shotId`, `sceneId`, `branchId` unbound (see H-ROUTE-06) | P |
| styleCapsules | 11 | reads `.or('user_id.eq.X,is_preset.eq.true')` (`:62-75`, `:265-273`); writes compare `user_id` (`:182`, `:240`) | n/a | Y |
| llm | 13 | none; `/generate` and `/generate-from-template` pass `userId` to logging, metadata, and style lookup; template route scopes through `contextManager.assembleGlobalContext` | none | N for utility and template routes (H-ROUTE-07) |
| seed | 1 | none beyond authentication (`seed.ts:15`) | none | N |
| health | 1 | none, by design | n/a | open |

Route families with explicit checks on path projectId: all of the above except the rows marked N. Only shotAssignments binds the whole chain (project to scene to branch). The `debug-style-capsule` endpoint (`images.ts:140-175`) checks capsule owner or preset.

### 2.4 Service role and RLS

- All backend queries run with the service-role key, so RLS policies on tables (for example `prompt_templates`, `video_generation_jobs`, `user_credits`) do not apply to any API call. The per-route `user_id` checks in section 2.3 are the only tenant boundary on the API.
- The browser depends on RLS for one read (`scenes`, `useSceneInfo.ts:25-29`) and for auth.
- Backend `SUPABASE_ANON_KEY` is read and exported (`config/supabase.ts:25-28`) and never imported (H-FACT-21).

### 2.5 Cross-tenant paths (code reading, not runtime-tested)

| Path | What a second user can do | Lid |
|---|---|---|
| `GET /api/projects/:p/scenes/:s/video-jobs/:jobId` (`checkout.ts:208-237`) | read any video job by id, if caller owns any project | H-ROUTE-05 |
| `POST .../video-jobs/:jobId/retry` (`checkout.ts:301-324`) | move any failed video job to queued; runs a provider call; no credit check | H-ROUTE-05 |
| transformation-events family (`sceneAssets.ts:1813-1916`, `:1852`, `:1871`, `:1886`) | read, create, edit, confirm, delete transformation events for any scene UUID | H-ROUTE-04 |
| `POST /api/images/generate` (`images.ts:9-68`) | supply another user's `assetId` or `shotId`; executor writes project_assets attempts, frames, scene_asset_instances, global_assets by those ids | H-ROUTE-06 |
| `POST /api/seed/prompt-templates` and template PUT/DELETE/activate on `created_by IS NULL` rows | any authenticated user | H-ROUTE-07, H-ROUTE-08 |

### 2.6 Auth-store behavior

- `initialize()` guards on `initialized`, but sets it only after `await getSession()` (`auth-store.ts:84-124`), so concurrent callers (`App.tsx:23` `AuthInitializer` and each `ProtectedRoute`, `components/auth/ProtectedRoute.tsx:14-17`) can register duplicate `onAuthStateChange` listeners, which are never unsubscribed (H-STATE-12). Race described from code structure; not reproduced.
- Route gating in SPA: `ProtectedRoute` for `/dashboard`, `/projects/:projectId`, `/style-capsules`, `/assets` (`App.tsx:93-128`). Gating is client-side only; the API enforces its own checks (section 2.3).

---

## 3. Asynchronous work model

### 3.1 Job inventory

| Job type | Created by | Executed by | State table | Status read by | Attempts | Concurrency | Restart behavior |
|---|---|---|---|---|---|---|---|
| Image job, project-scoped (master_asset, scene_asset, angle_variant, transformation_post, start_frame, end_frame, location view, edit) | `POST /api/images/generate` (`images.ts:9`), `projectAssets.ts:1210` (generate-image), `projectAssets.ts:2520` (angle variants), `sceneAssets.ts:2006`, `frameGenerationService.ts:906` and `:1303`, `assets.ts:410` (global) | `ImageGenerationService.executeJobInBackground` (`ImageGenerationService.ts:298-586`), unawaited, `.catch` logs (`:176-181`) | `image_generation_jobs` (migration 007) | `GET /api/images/jobs/:jobId` (`images.ts:71`) | 1 job-level; NanoBanana client retries 3 times on RATE_LIMIT and TEMPORARY (`NanoBananaClient.ts:17-18`, `:246-265`); `attempt_count` hard-set to 1 (`ImageGenerationService.ts:303`) | none (no semaphore; grep) | stranded (no sweeper) |
| Global asset image job | `createGlobalAssetImageJob` (`ImageGenerationService.ts:736-800`) | `executeGlobalAssetJobInBackground` (`:800-935`) | `image_generation_jobs` (asset_id, project_id null) | same endpoint | 1 | none | stranded |
| Angle variant | `createAngleVariantJob` (`ImageGenerationService.ts:249-290`) sets `asset_angle_variants.status='generating'` (`:277`) | same executor | `asset_angle_variants` + image job | `AngleVariantsDialog` polls `listAngleVariants` every 2 s with cleanup (`AngleVariantsDialog.tsx:63-102`) | 1 | none | stranded; variant row stays generating |
| Video job (Stage 12) | `confirmAndQueueRender` (`videoGenerationService.ts:318-408`) inserts `queued` rows, then `triggerJobProcessing()` (`:400`, `:414-423`) | global `VideoJobExecutor` loop (`VideoJobExecutor.ts:27-57`), serial, 500 ms gap | `video_generation_jobs` (migration 021) | `GET /video-jobs` (`checkout.ts:148-202`) polled 3 s by Stage 12 | auto 3 total (`max_retries` 3); manual retry 1 | one per process, in memory | stranded; retry refuses non-failed |
| Frame generation | `POST /api/projects/:p/scenes/:s/generate-frames` (`frames.ts:227`) via `frameGenerationService.ts` (creates one image job per frame) | image executor (as above) | `frames` + `image_generation_jobs` | `GET /frames` polled 2 s by Stage 10 (`Stage10FrameGeneration.tsx:252-259`); `GET /frames/:id/status` has no UI caller | as image job | none | stranded; frame stays generating |
| Streamline, LLM, extraction, shot extraction, prompt generation | synchronous request | inline in route | various | response | LLM client 4 attempts (E); shot extraction 20 s race, prompt generation 30 s race, dependency extraction 15 s race (no abort) | none | n/a |
| Autosave | client debounce | client timers (`stageStateService.ts:32` 1000 ms; `Stage4MasterScript.tsx:163-172` 2000 ms) | `stage_states` | n/a | n/a | n/a | lost on unload (no unload handler in src) |

Explicit `setInterval`/`setTimeout` polling in `src` (all listed with cadence and budget):

| Poller | Endpoint | Cadence and budget | Cleanup | Site |
|---|---|---|---|---|
| `projectAssetService.pollImageJob` | `/api/images/jobs/:id` | 60 × 1 s (60 s) | awaited inside service call | `projectAssetService.ts:385-424`; called from `generateImage` (`:379`), `editImage` (`:845`), `generateLocationViewImage` (`:1246`); UI callers `Stage5Assets.tsx:386`, `LocationCoveragePanel.tsx:234` |
| `sceneAssetService.pollBulkImageJobs` | same | 60 × 2 s (120 s), parallel per job | awaited | `sceneAssetService.ts:390-431`; `Stage8VisualDefinition.tsx:603` |
| `Stage8VisualDefinition.pollSingleImageJob` | same | 60 × 2 s | awaited | `Stage8VisualDefinition.tsx:436-452` |
| VisualStateEditorPanel post-image poll | same | 60 × 2 s | `finally` clears state | `VisualStateEditorPanel.tsx:204-232` |
| EnhancedUploadModal `onPollJob` | same (via prop) | 90 × 2 s; cancel ref | cancel ref | `EnhancedUploadModal.tsx:112-130`; props at `Stage5Assets.tsx:1517`, `VisualStateEditorPanel.tsx:848` |
| AssetDialog `handleGenerateImage` | same | `setInterval` 2 s plus `setTimeout` 120 s | cleared on completion or timeout only; **no unmount cleanup** | `AssetDialog.tsx:129`, `:205`, `:258-266` |
| AngleVariantsDialog effect | `listAngleVariants` | `setInterval` 2 s | `clearInterval` on effect cleanup (`:102`) | `AngleVariantsDialog.tsx:63-102` |
| Stage 6 render status | `GET /batch-render-status` | `setInterval` 10 s while mounted | cleanup on unmount (`Stage6ScriptHub.tsx:126-129`) | no ceiling |
| Stage 10 frames | `GET /frames` | `refetchInterval` 2 s while any frame `generating` | React Query | `Stage10FrameGeneration.tsx:252-259`; no ceiling |
| Stage 12 video jobs | `GET /video-jobs` | `refetchInterval` 3 s while queued, processing, generating, uploading | React Query | `Stage12VideoGeneration.tsx:59-68`; no ceiling |
| AssetVersionSync | `checkVersionSync` | `setInterval` 30 s | cleanup | `AssetVersionSync.tsx:42-46` |
| `frameService.pollUntilComplete` | `GET /frames/:id/status` | 120 × 2 s; catch marks frame complete on any error | n/a | `frameService.ts:593-632`; **zero callers** |
| `imageService.ts` sleep loop | `/api/images/jobs` | ORPHANED module | n/a | `src/lib/services/imageService.ts:106`, `:130` |

### 3.2 Server-side timeouts, retries, idempotency

- Timeouts: no `AbortSignal` or fetch timeout exists in backend code. Race-only timeouts (underlying call continues): shot extraction 20 s (`shotExtractionService.ts:97`), prompt generation 30 s (`promptGenerationService.ts:143`), dependency extraction 15 s (`sceneDependencyExtraction.ts:60`). Veo: `POLL_TIMEOUT_MS = 5 min` and `POLL_INTERVAL_MS = 10 s` (`Veo3Provider.ts:26-28`); submit and GCS download have no timeout. Image job: no deadline.
- Retries: LLM client 3 retries with 1 s, 2 s, 4 s backoff on RATE_LIMIT, SERVER_ERROR, NETWORK_ERROR (E; `llm-client.ts:45-50`). NanoBanana: 3 retries, `baseDelay` 1000 (`NanoBananaClient.ts:17-18`, `:246-265`). Video: executor retries the whole job while `attempt_count + 1 < max_retries` (default 3) regardless of `VideoProviderError.retryable` (`VideoJobExecutor.ts:144-171`). Mock: 5% synthetic failure (`MockVideoProvider.ts:23-25`).
- Idempotency: image create checks `(project_id, idempotency_key)` (`ImageGenerationService.ts:111-117`) backed by a unique partial index (`007_image_generation_jobs.sql:83-84`, `010_global_asset_image_generation.sql:14-19`). Every internal caller builds the key as a prefix plus `Date.now()` (`projectAssets.ts:1271`, `:1509`, `:3437`; `frameGenerationService.ts:906`, `:1303`; `sceneAssets.ts:506`, `:2030`; `assets.ts:447`; `ImageGenerationService.ts:240`, `:291`), so the lookup never matches. The global asset path stores the key but never looks it up (`:736-800`). Confirm-render, manual video retry, and frame regenerate have no dedupe.
- Concurrency: no semaphore, queue, p-limit, or rate limiter in backend (grep). Image jobs run in parallel per request. Video loop is serial per process.

### 3.3 State machines

Image job (`image_generation_jobs`): `queued` → `processing` (`processing_started_at`, `attempt_count=1`, `last_attempt_at`) → `generating` (`generating_started_at`) → `uploading` (`uploading_started_at`) → `completed` (`storage_path`, `public_url`, `cost_credits`, `provider_metadata`, `completed_at`) or `failed` (`error_code`, `error_message`, `failure_stage`). `failure_stage` is derived from the DB status at failure: `uploading` → `uploading`; `generating` → `generating`; otherwise (including failures before `generating`) → `persisting` (mislabel). Migration CHECK allows exactly these six statuses (`007:26-34`).

Video job (`video_generation_jobs`): `queued` → `processing` → `generating` → `uploading` → `completed`; failure with `attempt_count+1 < max_retries` → `queued` (with `error_message`), else `failed`. Manual retry: `failed` → `queued` (clears error and provider fields; keeps `attempt_count`, so the retried job has one attempt). Full detail: H-STATE-02.

Frame status (`frames.status`): set to `generating` at frame generation (`frameGenerationService.ts:871-873`, `:1278`); set to `generated` by the executor on image-job success (`ImageGenerationService.ts:521-531`); on failure nothing writes it; `GET /frames/:id/status` (the only code that writes `rejected` on failure, `frameGenerationService.ts:1430-1437`, or accrues `total_cost_credits`, `:1397-1425`) has no UI caller.

Scene status: `scenes.status` set to `video_complete` when every job of the scene is `completed` (`videoGenerationService.ts:516-537`); never reset.

Credits: `user_credits.balance` created at 100.00 on first read (`userCreditsService.ts:28-73`); decreased once per confirm by the full scene total (`videoGenerationService.ts:394`); no refund, no top-up (`addCredits` has no caller).

### 3.4 Restart, refresh, and stranded state

| Event | Image job | Video job | Frame | UI effect |
|---|---|---|---|---|
| Browser refresh during job | server continues; client poll lost | server continues; Stage 12 refetches on mount | server continues; success visible on next fetch; failure stays generating | Stage 10 and 12 resume polling from DB state |
| API process restart or machine stop | row stays in processing, generating, or uploading; no recovery | row stays in processing, generating, or uploading; retry refuses it; scene never completes | frame stays generating if job was in flight | Stage 10 and 12 poll forever (no ceiling) |
| API process restart with queued video rows | rows wait | rows wait until any user's next confirm or retry triggers the loop (no startup hook) | n/a | none |
| Two API instances | no row claim | both can select the same queued row (`VideoJobExecutor.ts:62-76`; update by id only, `videoGenerationService.ts:490-500`) | n/a | duplicate provider call and cost |

Deployment instance count is not in the repo; UNKNOWN.

### 3.5 Webhook handlers

None. No route or service accepts an inbound provider or Supabase callback; Veo results are fetched by polling `fetchPredictOperation`.

---

## 4. Error handling and failure surfaces

| Layer | Pattern | Count or evidence |
|---|---|---|
| Routes | inline `try/catch` returning `res.status(500).json({error: message})` | 214 catch blocks and about 327 `res.status(500)` sites in `backend/src/routes`; 88 response lines interpolate `error.message` into JSON bodies |
| Global handler | `errorHandler` returns `{error:{message, code, stack in development}}` (`errorHandler.ts:52-73`); reached only via Express error propagation (body-parser errors such as malformed JSON or oversize body; synchronous throws) | `server.ts:90` |
| Express 4 async | async rejections are not forwarded to `errorHandler`; 197 of 198 handlers contain a `try` block (the exception is the synchronous health route); code placed outside those try blocks was not analyzed | `express` 4.22.1 installed |
| Background jobs | `.catch` on fire-and-forget promises; job row written to `failed`; failures inside the catch path are logged only | `ImageGenerationService.ts:176-181`, `:559-584`; `VideoJobExecutor.ts:51-53` |
| Backend silent catches | 290 catch blocks; 7 comment-only (`routes/frames.ts:573`, `:2220`; `services/frameGenerationService.ts:786`; `services/promptGenerationService.ts:1493`; `utils/llmJson.ts:44`, `:80`, `:100`); 22 only log | brace-matching scan |
| Frontend | 202 catch blocks in non-test `src`: 19 comment-only, 31 console-only | brace-matching scan; examples `Stage11Confirmation.tsx:156`, `:417`, `Stage12VideoGeneration.tsx:237` (`best-effort` lock), `Stage6ScriptHub.tsx:121` (non-critical) |
| Toasts | two systems: `sonner` (30 files) and shadcn `use-toast` (17 files); both Toaster components rendered (`App.tsx:85-86`) | |
| Render errors | no `ErrorBoundary`, no `componentDidCatch`; an uncaught render error unmounts the tree | grep |
| Query errors | default `new QueryClient()` (`App.tsx:19`); no global `onError` | |
| Auth errors | 401 not handled client-side; expired or rejected token surfaces only as a failed call | grep |
| Error shape | routes and auth return `{error: string}`; `errorHandler` returns `{error:{message}}`; frontend reads `error.error` (`checkoutService.ts:40-42`, `frameService.ts:579-581`), so an object body produces an object-derived message | H-FACT-10 |
| Process level | no `unhandledRejection`, `uncaughtException`, or `SIGTERM` handler; no graceful shutdown | grep |

Client-side timeouts: 60 s to 120 s budgets on image polls (section 3.1); no `AbortController` in `src` except `StreamlineDropZone.tsx`.

---

## 5. Environment variables

### 5.1 Backend (names read by code; values not inspected)

| Name | Read at | Default in code | Purpose | Required for boot |
|---|---|---|---|---|
| `PORT` | `server.ts:28` | `3001` | listen port | no |
| `NODE_ENV` | `server.ts:35`, `:95`; `middleware/errorHandler.ts:18`, `:26`; `routes/health.ts:11`; `routes/llm.ts:145` | unset | CORS branch, stack traces, listen gating (`'test'` skips listen), health and diagnostics label | no |
| `SUPABASE_URL` | `config/supabase.ts:5`, `:9`, `:12`; scripts | none; throws at import | Supabase project URL | **yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | `config/supabase.ts:10`, `:17`; scripts | none; throws at import | service-role client for all DB, storage, `auth.getUser` | **yes** |
| `SUPABASE_ANON_KEY` | `config/supabase.ts:27` | none | exported as `supabaseConfig.anonKey`, never imported | no (DEAD) |
| `GOOGLE_AI_API_KEY` | `services/llm-client.ts:75`, `:134`; `services/image-generation/NanoBananaClient.ts:21-27`; `services/imageAnalysisService.ts:25-30`; `routes/llm.ts:143` (boolean) | none; `'placeholder'` rejected by image and vision clients | Gemini API key for text, image, vision | **yes** in practice: NanoBanana is constructed at module load (H-FACT-04) |
| `GEMINI_MODEL` | `llm-client.ts:76` (ctor default `gemini-2.5-flash-lite`), `:106` (text default `gemini-1.5-flash`), `:310` (estimate default `gemini-2.5-flash-lite`) | per site | text model id | no |
| `LANGSMITH_API_KEY` | `llm-client.ts:83`, `:95-99` (required by `validateEnvironment`), `:156`; `routes/llm.ts:144` (boolean) | none | LangSmith client; LLMClient construction fails without it | for text path |
| `LANGSMITH_TRACING` | `llm-client.ts:156` (`=== 'true'`); also read by `@langchain/core` | none | gates the dead explicit callbacks path; enables env LangChain tracer | no |
| `VIDEO_PROVIDER` | `services/video-generation/createVideoProvider.ts:18` | `'mock'` | `'veo3'` selects Veo3Provider; anything else selects mock | no |
| `GOOGLE_CLOUD_PROJECT` | `Veo3Provider.ts:14` | none; throws `AUTH_ERROR` at generate time | Vertex project id and GCS path prefix | only for veo3 |
| `GOOGLE_CLOUD_LOCATION` | `Veo3Provider.ts:15` | `'us-central1'` | Vertex region | no |
| `GOOGLE_APPLICATION_CREDENTIALS` | not read by repo code | none | ADC resolved implicitly by google-auth-library | only for veo3 |
| `LANGSMITH_PROJECT` | not read by repo code | none | project for traces (library-level) | no |
| `DATABASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_VEO3_API_KEY`, `NANO_BANANA_API_KEY` | not read | none | none | DEAD (names only) |

Test-only backend reads: `TEST_AUTH_TOKEN`, `TEST_PROJECT_ID`, `TEST_SCENE_ID` (`backend/src/tests/shotLocking4_5_task_11.test.ts`); `GOOGLE_APPLICATION_CREDENTIALS` and related in `backend/src/tests/veo3-test.ts`; `CI` only in `playwright.config.ts:19-20`.

### 5.2 Frontend (`import.meta.env`)

| Name | Read at | Default | Purpose | Required |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts:4`, `:7` | none; throws at import | Supabase URL for browser client | **yes** (blank app otherwise) |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:5`, `:7` | none; throws at import | anon key | **yes** |

No other `import.meta.env` reads in `src`. No `VITE_API_URL`. Neither VITE name appears in any env file in the repo (names checked in `.env.example`, `.env.local`, `backend/env.example`, `backend/.env`). Their source at build time is UNKNOWN.

E2E only (`e2e/*.spec.ts`): `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_PROJECT_ID`.

### 5.3 Env files and config

| File | Tracked by git | Content (names only) |
|---|---|---|
| `.env.example` (root) | yes | 11 provider key names (ANTHROPIC, PERPLEXITY, OPENAI, GOOGLE_API_KEY, MISTRAL, XAI, GROQ, OPENROUTER, AZURE_OPENAI, OLLAMA, GITHUB) |
| `.env.local` (root) | no (`.gitignore:37`) | same 11 names; no VITE names; not read for values |
| `backend/env.example` | yes | PORT, NODE_ENV, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, LANGSMITH_API_KEY, LANGSMITH_PROJECT, LANGSMITH_TRACING, GOOGLE_AI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_VEO3_API_KEY, NANO_BANANA_API_KEY, DATABASE_URL. No VIDEO_PROVIDER, no GOOGLE_CLOUD_*. |
| `backend/.env` | no (`.gitignore:48`) | same names as `backend/env.example`; no VIDEO_PROVIDER, no GOOGLE_CLOUD_* (names checked) |
| root `.env` | absent in checkout | Playwright config loads it if present (`playwright.config.ts:6-14`) |

Config keys: `vite.config.ts` (dev port 8080, host `::`, `/api` proxy to 3001, alias `@`, componentTagger in development mode only, vitest jsdom with `src/test/setup.ts`); `backend/jest.config.js` (ts-jest ESM, testMatch `**/src/tests/**/*.test.ts` and `**/src/**/__tests__/**/*.test.ts`, setup `jest.setup.ts`); `backend/jest.setup.ts` (loads `backend/.env` by `path.resolve(__dirname, '.env')`, sets `NODE_ENV=test` when unset, 30 s timeout); `backend/tsconfig.json` (`outDir ./dist`, `rootDir ./src`, `include src/**/*`); `playwright.config.ts` (baseURL 8080, `workers: 1`, `retries` 1 when `CI`, no webServer).

---

## 6. Deployment assumptions evident from code

### 6.1 Fly.io (`backend/fly.toml`)

- App `wizardirector-api`; builder `paketobuildpacks/builder:base`, buildpack `paketobuildpacks/nodejs`.
- `[env] NODE_ENV = "production"`. No `PORT`, no `VIDEO_PROVIDER`, no Google or Supabase variables (secrets are set outside the repo: UNKNOWN which).
- `[http_service]` `internal_port = 3001`, `force_https = true`, `auto_stop_machines = true`, `auto_start_machines = true`, `min_machines_running = 0`. No `[[http_service.checks]]`.
- `[[vm]]` shared CPU x1, 1024 MB.
- Consistency: `server.ts:28` defaults to 3001, so the internal port matches.

### 6.2 Build and start

- Backend: `build` = `tsc` (compiles `src/**/*` including tests and `__tests__` into `dist`); `start` = `node dist/server.js`; `main` = `dist/server.js`; `type: module`. No `engines` field.
- Frontend: `build` = `vite build`; output static; no hosting config in the repo (no vercel, netlify, Dockerfile, Procfile, compose, or `.github` found; `git ls-files` shows none).
- Health: `GET /api/health` returns JSON without touching dependencies; not referenced by fly.toml.

### 6.3 Scripts (root and backend)

Root: `dev` (vite), `build`, `build:dev`, `lint` (eslint .), `preview`, `test` (vitest run), `test:watch`, `test:e2e` (playwright), `test:e2e:ui`.
Backend: `dev` (tsx watch src/server.ts), `build`, `start`, `lint` (eslint src/**/*.ts), `test` (jest), `test:connectivity` (tsx src/tests/connectivity-test.ts), `migrate` (tsx scripts/run-migrations.ts; not executed), `setup:bucket` (tsx scripts/setup-asset-images-bucket.ts).

### 6.4 Migration path (documented, not executed)

`scripts/run-migrations.ts` reads `migrations/*.sql` sorted by filename, then `DatabaseService.runMigration` (`config/database.ts:32-64`) splits each file on `;` and calls `supabase.rpc('exec', { query: statement })` (`database.ts:48`). No `exec` function is defined in `backend/migrations` or `quickies-sql` (grep: 0). On error the code throws with a message asking for the Supabase SQL editor (`database.ts:50-54`). Duplicate numbers 022 and 024 sort by full filename. Migration SQL was not executed and no database was touched.

### 6.5 Backend lint

`backend/package.json` declares ESLint ^8.55 and a `lint` script, but the backend directory has no eslint config file (checked `ls -a backend`). Repo root has `eslint.config.js` (flat config, ESLint 9 in root `devDependencies`). Whether `npm run lint` in `backend` succeeds: UNKNOWN (not executed).

### 6.6 Playwright and vitest

Playwright config reads a root `.env` file if present (absent in this checkout) and defines no `webServer`, so specs assume dev servers are already running (`playwright.config.ts:34`).

---

## 7. Provider completeness matrix

| Modality | Path (verified) | SDK and transport | Auth | Model id | Status | Evidence |
|---|---|---|---|---|---|---|
| Text LLM | `LLMClient` to `ChatGoogleGenerativeAI` | `@langchain/google-genai` 2.1.3 over Gemini API | `GOOGLE_AI_API_KEY` | env `GEMINI_MODEL`, literal fallbacks `gemini-1.5-flash` (call) and `gemini-2.5-flash-lite` (ctor, estimate) | FULLY WIRED (code); runtime U | `llm-client.ts:66-207`, `:106`, `:310`; routes `llm.ts:68`, `:150` |
| Image | `NanoBananaClient` | `@google/generative-ai` 0.24.1 | API key | literal `gemini-2.5-flash-image` | FULLY WIRED; width and height never sent (P) | `NanoBananaClient.ts:118-126`, `:159-160` |
| Vision and classify | `ImageAnalysisService` | `@google/generative-ai` | API key | literal `gemini-2.5-flash` (4 sites) | FULLY WIRED; no retry | `imageAnalysisService.ts:54,106,136,176` |
| Video, Veo 3.1 | `Veo3Provider` | `fetch` to `{location}-aiplatform.googleapis.com` `:predictLongRunning` and `:fetchPredictOperation`; GCS download `storage.googleapis.com` | `GoogleAuth` ADC, scope cloud-platform | `veo-3.1-fast-generate-001`, `veo-3.1-generate-001` | PARTIAL: env-gated, untested, bucket `videos` not created by repo | `Veo3Provider.ts:8-10`, `:17-19`, `:107-116`, `:231-232`, `:337-354`, `:370` |
| Video, mock | `MockVideoProvider` | none | none | fixed sample MP4 URL | MOCKED; default when `VIDEO_PROVIDER` unset; ignores frames | `createVideoProvider.ts:18`, `MockVideoProvider.ts:10`, `:19-31` |
| Audio | none | none | none | none | NONE (only Veo `generateAudio:true`) | `Veo3Provider.ts:99`; grep: no TTS, STT, speech SDK |
| Tracing | LangSmith client plus `@langchain/core` env tracer | `langsmith` 0.4.4 | `LANGSMITH_API_KEY` (required by ctor) | n/a | PARTIAL (see below) | `llm-client.ts:82-84`, `:154-161` |
| Auth | Supabase Auth email and password | supabase-js 2.89.0 | n/a | n/a | FULLY WIRED; no OAuth | `auth-store.ts:28-72` |
| Other LLM vendors (OpenAI, Anthropic, Perplexity, etc.) | none | none | names only | n/a | DEAD (config names; Landing copy claims them) | `Landing.tsx:32`; section 5.3 |

LangSmith verdict: PARTIAL. The explicit path (`llm-client.ts:154-161`) calls `getLangchainCallbacks()` with no run tree; langsmith's `getCurrentRunTree()` throws when none is active (`node_modules/langsmith/dist/langchain.js:19-22`, `node_modules/langsmith/dist/singletons/traceable.js:25-31`); the throw is caught and logged, and the callbacks option is commented out (`:163-165`). The env path is live when `LANGSMITH_TRACING` or `LANGCHAIN_TRACING_V2` resolves to `'true'` (`node_modules/@langchain/core/dist/utils/callbacks.js:4-13`, `callbacks/manager.js:467-482`). Its value in deployment is UNKNOWN (names read; value not read by policy; wave-1 E says `true` in `backend/.env`, not verified here). `traceId` returned to callers is the request UUID (`llm-client.ts:179`), not a LangSmith run id. `stage_states.langsmith_trace_id` has no writer call (`config/database.ts:69-72` unused). Runtime UNKNOWN.

Retry and timeout by client: section 3.2.

---

## 8. Wave-1 claims re-verified (provisional ids from the merged ledger)

| Wave-1 id | Claim | Result in this pass |
|---|---|---|
| WD-IMPL-FACT-0002, WD-IMPL-FACT-0171 | backend uses service role, RLS bypassed | VERIFIED (`config/supabase.ts:17-22`, single client) |
| WD-IMPL-INVALIDATE-0011 (V1) | ownership check on every slice route | CONTRADICTED: sceneAssets transformation-events 7 routes have none (H-ROUTE-04) |
| WD-IMPL-FACT-0014 | two toast systems | VERIFIED (`App.tsx:85-86`; 30 and 17 importers) |
| WD-IMPL-FACT-0015 | auth listeners registered without guard | VERIFIED (`auth-store.ts:84-124`, `:109`); listener never unsubscribed |
| WD-IMPL-PROV-0020, E section 7 | LangSmith explicit path dead, env path may be live, traceId is request UUID | VERIFIED with node_modules evidence (H-PROV-07) |
| E-FACT-19 / WD-IMPL-FACT-0198 | NanoBanana constructor throws; per-route 500 | REFINED: module-scope construction makes it a boot failure (H-FACT-04) |
| WD-IMPL-FACT-0188 | width and height never sent to image model | VERIFIED (`NanoBananaClient.ts:118-126`, `:159-160`) |
| WD-IMPL-FACT-0189 | frame inpaint mask stored, not sent | wave1-unverified (`frameGenerationService.ts:1258-1310` not reopened in this pass) |
| WD-IMPL-FACT-0130 | executor global, serial, in-memory, no recovery | VERIFIED (H-STATE-03) |
| WD-IMPL-FACT-0131 | auto-retry ignores retryable; manual retry one attempt | VERIFIED (`VideoJobExecutor.ts:144-171`; `videoGenerationService.ts:563-597`) |
| WD-IMPL-FACT-0135 | retry and single-job routes do not verify job ownership | VERIFIED (`checkout.ts:226`, `:318`; `videoGenerationService.ts:445-453`, `:563-569`) |
| WD-IMPL-FACT-0108 | frame polling never checks job status in the UI | VERIFIED (H-STATE-08; `pollUntilComplete` zero callers) |
| WD-IMPL-FACT-0120 | frame cost tracking | VERIFIED: only writer of `frames.total_cost_credits` in backend is `onJobCompleted` (`frameGenerationService.ts:1422`), reachable only via unused route |
| WD-IMPL-DEAD-0040 | `pollIntervalMs` unused | VERIFIED (`VideoJobExecutor.ts:16`, no other reference) |
| WD-IMPL-FACT-0139 | video env vars absent from env templates | VERIFIED (names only) |
| WD-IMPL-FACT-0172, WD-IMPL-TABLE-0027 | bucket list; `videos` and `frames` have no creator | VERIFIED (H-FACT-13) |
| WD-IMPL-FACT-0155 | frame attempt delete targets bucket never written | VERIFIED (`frames.ts:1465`, `:1109-1122`) |
| WD-IMPL-FACT-0013, WD-IMPL-DEAD-0052 | landing claims OpenAI and Anthropic; env names unused | VERIFIED (`Landing.tsx:32`; no reader) |
| WD-IMPL-FACT-0105 | model defaults inconsistent; retry in llm-client | VERIFIED (three literal fallbacks, `llm-client.ts:76`, `:106`, `:310`) |
| WD-IMPL-FACT-0186 | timeouts race-only, no abort | VERIFIED for shot extraction, prompt generation, dependency extraction |
| WD-IMPL-FACT-0202 | shot extraction timeout returns empty success | wave1-unverified (not reopened) |
| E-FACT-02 | token usage in process memory only | wave1-unverified (`utils/token-utils.ts:163-208` not reopened) |
| C08 (R1) | migration runner calls undefined `exec` RPC | VERIFIED (`database.ts:48`; zero `exec` definitions) |
| C16 (R1) | LangSmith explicit callbacks never attach; langsmith_trace_id never written | VERIFIED (H-PROV-07) |
| C14 (R1) | confirm-render charges full scene total; no refund | VERIFIED (`videoGenerationService.ts:329-331`, `:394`; `userCreditsService.ts:92-121`) |
| C13 (R1) | frame status `generating` never resolves after a failed job | VERIFIED (H-STATE-04, H-STATE-08) |
| C17 (R1) | seeded templates (created_by null) editable by any authenticated user | VERIFIED (`prompt-template.ts:207`, `:240`, `:375`; `seed.ts:193`) |
| WD-IMPL-FACT-0129 | insert-then-deduct non-atomic | VERIFIED (`videoGenerationService.ts:381-394`) |

---

## 9. Cross-slice references

- `backend/src/routes/sceneAssets.ts:1813-1916` (7 routes, no ownership) - belongs to the scene-assets / transformation slice; V1 INVALIDATE-0011 contradicted.
- `backend/src/routes/checkout.ts:208-237`, `:301-324` - video-job slice (V10): job not bound to project.
- `backend/src/routes/frames.ts:1458-1470` - frames slice: deletes job row after `remove` on bucket `frames`, error not checked.
- `backend/src/routes/frames.ts:480-510` - frames slice: GET status route with side effects.
- `backend/src/services/frameGenerationService.ts:1600` and `:129-133` - frames slice: module-scope construction chain (H-FACT-04).
- `backend/src/services/image-generation/ImageGenerationService.ts:521-531` - image-jobs slice: frames updated by executor on success only.
- `backend/src/services/image-generation/ImageGenerationService.ts:862-885` - global assets slice: non-atomic version increment.
- `backend/src/services/prompt-template.ts:207,240,375` - prompt-template and seed slice (C17).
- `backend/migrations/002_add_langsmith_fields.sql:12-45` - prompt_templates table and RLS (no unique name; SELECT open to active rows).
- `backend/migrations/020_user_credits.sql`, `021_video_generation_jobs.sql:20`, `:57-58` - credits and video tables.
- `backend/migrations/007_image_generation_jobs.sql:26-34`, `:83-84` - image job CHECK and idempotency index.
- `backend/migrations/044_streamline_atomic_intake_fix.sql:38` - streamline atomic RPC (the only RPC defined).
- `src/components/pipeline/Stage10FrameGeneration.tsx:252-259` - frames slice: 2 s unbounded poll.
- `src/components/pipeline/Stage11Confirmation.tsx:52`, `Stage12VideoGeneration.tsx:42` - scene info read via direct Supabase (H-FACT-02).
- `src/pages/Landing.tsx:32` - marketing copy claims OpenAI and Anthropic (copy slice).
- `src/lib/services/frameService.ts:593-632` - unused poll helper (frames slice).
- `src/lib/stores/auth-store.ts` - auth slice: listener and race.
- `src/App.tsx:19`, `:85-86` - shell slice: default QueryClient; two toasters.
- `backend/src/services/streamlineReconciliationService.ts`, `streamline.ts:45-90` - streamline slice: commit path synchronous with RPC.

---

## 10. Contradictions and unknowns

### 10.1 Contradictions (code versus comment, claim, or other layer)

| # | Claim source | Code evidence |
|---|---|---|
| 1 | E-FACT-19: construction failure is a 500 per route | Module-scope `new FrameGenerationService()` (`frameGenerationService.ts:1600`) and `new ImageGenerationService()` at module scope in `routes/images.ts:6`, `routes/assets.ts:8`, `routes/projectAssets.ts:20` make missing key a boot failure (H-FACT-04) |
| 2 | V1 INVALIDATE-0011: every slice route checks project ownership | transformation-events family does not (H-ROUTE-04) |
| 3 | `backend/src/config/supabase.ts:24` comment: anon key exported for client-side usage | no importer of `supabaseConfig` (H-FACT-21) |
| 4 | `VideoJobExecutor.ts` header: "Polls video_generation_jobs table" | no polling timer; `pollIntervalMs` unused (H-STATE-03) |
| 5 | Executor step 5 comment: "For real providers, we'd upload to Supabase Storage here" | Veo uploads inside the provider before `uploading` status is set (H-PROV-04) |
| 6 | Manual retry "max_retries" design | retry does not reset `attempt_count` (H-STATE-02) |
| 7 | `checkout.ts` route comment "Verify project ownership" | ownership verified, job and scene not bound (H-ROUTE-05) |
| 8 | `images.ts` POST `/generate` "Validate project ownership" | project only; body IDs unbound (H-ROUTE-06) |
| 9 | Idempotency design (keys, unique index) | keys always unique because of `Date.now()` (H-STATE-07) |
| 10 | Frame status `rejected`/`generated` reconciliation | reconciliation reachable only via route with no UI caller (H-STATE-04) |
| 11 | `backend/src/services/image-generation/NanoBananaClient.ts` aspect ratio labelled as sizing | width and height never sent to the API (H-PROV-02) |
| 12 | `Landing.tsx:32` multi-provider claim | no OpenAI or Anthropic code (H-PROV-09) |
| 13 | `backend/src/config/streamlineConfig.ts` header "keep both in sync" with frontend | values match (`MIN_SCENE_HEADINGS = 3`, `MIN_DIALOGUE_LINES = 1` on both sides); no contradiction |
| 14 | `cors` production origin | placeholder `https://your-frontend-domain.com` active under `NODE_ENV=production` set by fly.toml (H-FACT-07) |
| 15 | `frameService.pollUntilComplete` implied polling of frame jobs | zero callers (H-STATE-08) |
| 16 | `playwright.config.ts` loads root `.env` for E2E variables | root `.env` absent in checkout; E2E variables must come from the shell (H-FACT-17) |

### 10.2 Unknowns and what would settle them

| Unknown | Settle by |
|---|---|
| Production frontend host and whether `/api` is reverse-proxied to the Fly app | Deployment config outside the repo |
| Which env names are set in production (`GOOGLE_AI_API_KEY`, `LANGSMITH_TRACING`, `VIDEO_PROVIDER`, `GOOGLE_CLOUD_PROJECT`, `GEMINI_MODEL`) and their values | Fly secrets listing (names only) |
| Whether the API process boots in production (module-scope chain, H-FACT-04) | Startup log of the deployed machine |
| Whether `LANGSMITH_TRACING` is `'true'` and any runs appear in LangSmith | One authorized call with a runtime check, outside this audit |
| Whether bucket `videos` and bucket `frames` exist in the live Supabase project | Storage bucket list (read-only), outside this audit |
| Whether Veo model ids and `fetchPredictOperation` contract are accepted today | Single manual run of `backend/src/tests/veo3-test.ts` with credentials |
| Number of API machines running (duplicate video execution risk) | `fly status` or config outside repo |
| Whether Fly auto-stop stops a machine during an in-flight background job | Platform behavior, not verifiable from repo |
| Whether backend `npm run lint` runs at all (no backend eslint config) | Running it in an environment (not performed here) |
| Whether Express async escapes outside try blocks crash the process | Runtime test with a forced throw (not performed) |
| Real token usage and cost vs estimate | Compare provider usage metadata with estimate on a sample call |
| Exact CHECK and index contents for `prompt_templates` in live DB | Read-only schema query, outside this audit |
| Frontend 401 behavior in practice | Runtime test with expired token |

---

## 11. Not inspected (honest gaps)

- Frontend components beyond the cited poll and fetch sites (Stage 2 to 9 interaction code, dialogs, Stage 1 intake) were not read in full; poll inventory was produced by grep and targeted reads.
- Route bodies were classified by pattern scan and targeted reads; not every handler was read line by line. Sub-resource scoping was verified for the families named in section 2.3, not exhaustively.
- `ImageGenerationService` global asset path and angle-variant path were read in part (lines 736-935 and 249-290 partially).
- `frameGenerationService.ts:1258-1310` (inpaint) and `:1100-1240` (lifecycle) not re-read.
- `backend/src/services/videoGenerationService.ts` lines 430-660 read in part; scene render status aggregation (`:542-558`, `:602-634`) taken from V10.
- `backend/src/utils/token-utils.ts` not re-read (usage tracker claim is wave-1 E).
- `backend/src/tests/connectivity-test.ts`, `veo3-test.ts`, `llm-integration.test.ts` not opened (test claims are wave-1 E).
- `src/components/pipeline/Stage7ShotList.tsx` and `Stage9PromptSegmentation.tsx` debounce delays not read.
- `backend/migrations/020_user_credits.sql`, `021`, `007`, `010`, `002` read for specific constraints only.
- Supabase Storage bucket policies and public flags not inspected (no repo evidence beyond `getPublicUrl` use).
- No runtime execution of any kind; all behavior statements are from static reading and node_modules source.
