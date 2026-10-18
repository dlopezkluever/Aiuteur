# V1 — Application shell, routing, project lifecycle, stage state

Reporter: V1. Static analysis of HEAD only. Status flags per BRIEF. All paths repo-relative.

## 0. Files inspected (all fully read unless noted)
Frontend: `src/main.tsx`, `src/App.tsx`, `src/pages/{AssetLibrary,Auth,Dashboard,Index,Landing,NotFound,ProjectView,StyleCapsuleLibrary}.tsx`, `src/pages/__tests__/derivePhaseAStages.test.ts` (case names only), `src/components/auth/{AuthForm,ProtectedRoute}.tsx`, `src/components/dashboard/{NewProjectCard,NewProjectDialog,ProjectCard}.tsx`, `src/components/landing/{MediaSlot,ScrollReveal}.tsx`, `src/components/layout/{GlobalSidebar,MainLayout}.tsx`, `src/components/pipeline/{ProjectHeader,PhaseTimeline,SceneWorkflowSidebar,SceneIndicator,LockedStageHeader,UnlockWarningDialog,SkippedStagePlaceholder,StageInfoButton,StyleChangeWarningDialog}.tsx`, `src/lib/supabase.ts`, `src/lib/stores/auth-store.ts`, `src/lib/hooks/{useStageState,useSceneStageLock,useDebounce}.ts`, `src/lib/utils/stageBadge.ts`, `src/lib/utils.ts`, `src/lib/services/{projectService,stageStateService,sceneStageLockService}.ts`, `src/types/project.ts`, `src/config/stageInfoContent.ts`, `vite.config.ts`.
Backend: `backend/src/server.ts`, `backend/src/middleware/{auth,errorHandler}.ts`, `backend/src/config/{database,streamlineConfig,supabase}.ts`, `backend/src/routes/{health,stageStates,sceneStageLocks}.ts`, `backend/src/routes/projects.ts` L1-1012 and L3961-4006 (plus spot reads L1135-1214 defer/restore, L2955-2985, L3120-3165), `backend/src/transformers/styleCapsule.ts`.
Supporting evidence read: `backend/migrations/001,014,022,027,040,041(head),044`, `backend/quickies-sql/add_stage_locks.sql`, `backend/scripts/run-migrations.ts`, spot greps in Stage1-12 components (wiring only).

---

## 1. Frontend route tree and reachability

Entry: `src/main.tsx:1-6` renders `<App/>` (no React.StrictMode), imports `index.css`, `styles/screenplay.css`.
Provider stack `src/App.tsx:74-145`: `ThemeProvider(next-themes, defaultTheme=dark, storageKey='aiuteur-theme')` > `QueryClientProvider(new QueryClient() defaults)` > `TooltipProvider` > `AuthInitializer` + shadcn `<Toaster/>` + `<Sonner/>` (two toast systems both mounted) > `BrowserRouter`.

| Path | Element | Guard | Layout | Evidence |
|---|---|---|---|---|
| `/` | `LandingOrDashboard`: spinner until `initialized`; `user` -> `<Navigate to=/dashboard>`; else `<Landing/>` | none | none | App.tsx:33-49,136 |
| `/landing` | `<Landing/>` (always, even when logged in) | none | none | App.tsx:133 |
| `/auth` | `<Auth/>`: spinner until initialized; `initialized && user` -> Navigate `/dashboard`; else `AuthForm` | none | none | App.tsx:90; Auth.tsx:6-44 |
| `/dashboard` | `DashboardWrapper` -> `<MainLayout><Dashboard/></MainLayout>` | ProtectedRoute | MainLayout | App.tsx:52-72,93-100 |
| `/projects/:projectId` | `<MainLayout><ProjectView/></MainLayout>` | ProtectedRoute | MainLayout | App.tsx:101-110 |
| `/style-capsules` | `<StyleCapsuleLibrary/>` | ProtectedRoute | MainLayout | App.tsx:111-120 |
| `/assets` | `<AssetLibrary/>` | ProtectedRoute | MainLayout | App.tsx:121-130 |
| `*` | `NotFound` (404 text, `<a href="/">`, console.error) | none | none | App.tsx:139; NotFound.tsx |

Query params used by ProjectView: `?stage=1..12`, `?sceneId=<uuid>` (ProjectView.tsx:141-148, 239-240, 393-394).
In-app navigation sources: GlobalSidebar items `/dashboard`, `/style-capsules`, `/assets` (GlobalSidebar.tsx:23-27); Dashboard card click -> `/projects/:id` (App.tsx:55-57); NewProjectDialog success -> `/projects/:id` (Dashboard.tsx:51-56); Landing buttons -> `/auth` (Landing.tsx:146,162,217,501,521,524); sign-out -> `/auth` (GlobalSidebar.tsx:39-42); NotFound -> `/` via full page load.
No admin/debug/settings/profile/billing route exists. `/projects/new` is NOT linked anywhere but is matched by `/projects/:projectId` and has special handling (see 4.2).
`src/pages/Index.tsx` (state-machine pseudo-router incl. `setSelectedProjectId('new')`) is not imported anywhere -> ORPHANED.
ProtectedRoute passes `state={{from: location}}` (ProtectedRoute.tsx:28) but nothing reads `location.state` (grep) -> after login the user always lands on `/dashboard`, not the original URL.

## 2. Auth end to end

Frontend:
- `src/lib/supabase.ts:4-17`: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {autoRefreshToken, persistSession, detectSessionInUrl})`; throws at import if env missing. Only env vars referenced in `src/` are these two.
- Supabase usage in all of `src/` is auth-only: `getSession` (141 call sites, every service), `signUp`, `signInWithPassword`, `signOut`, `onAuthStateChange`. Zero `supabase.from/storage/rpc/channel` calls in frontend (grep count 0). => All data goes through the Express API; frontend never depends on RLS directly.
- `src/lib/stores/auth-store.ts` (only zustand store): state `{user, session, loading(true), initialized(false)}` persisted to localStorage key `auth-storage` (partialize user+session only, :129-135). `initialize()` (:84-124) returns early if `initialized`, else `getSession()` -> sets user/session, `initialized=true`; then registers `onAuthStateChange` listener (never unsubscribed). `initialize` is invoked by `AuthInitializer` (App.tsx:22-30), `ProtectedRoute` (:13-15) and `Auth` (:10-12); the guard is `initialized` only, with no in-flight flag, so concurrent first-render calls can each register a listener (observed by code; runtime count UNKNOWN).
- `signIn` -> `supabase.auth.signInWithPassword` (:51-72); `signUp` -> `supabase.auth.signUp` (:28-49) and sets `user` even when `data.session` is null (email-confirmation projects) -> Auth page would then redirect to `/dashboard` while API calls throw 'User not authenticated' (each service checks `session?.access_token`). Whether email confirmation is enabled is UNKNOWN (Supabase project config).
- `AuthForm.tsx`: zod schema email + password min 6 (:14-17); toggles login/signup; shows `result.error.message`. No password reset, magic link, OAuth, or email-verification UI.
- Services read the token via `supabase.auth.getSession()` on every call and send `Authorization: Bearer <access_token>`; the zustand `session` value is not used by any service.
- Sign out: `GlobalSidebar.handleSignOut` -> `signOut()` -> `navigate('/auth')` (:39-42). React Query cache and `project_*` localStorage keys are not cleared.
- Vite dev proxy `/api` -> `http://localhost:3001` (vite.config.ts:12-18); dev server port 8080.

Backend:
- `backend/src/config/supabase.ts:9-22`: single client `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {autoRefreshToken:false, persistSession:false})`. This is the only `createClient` in backend/src. `supabaseConfig.anonKey` exported but unused.
- `backend/src/middleware/auth.ts:16-44` `authenticateUser`: requires `Bearer` header (401 'Authorization header missing or invalid'), calls `supabase.auth.getUser(token)` (remote Supabase Auth verification with the service-role client), 401 'Invalid or expired token' on failure, sets `req.user={id,email}`; 500 on exception.
- Mounting (`server.ts:46-87`): `/api/health` unauthenticated; nine routers mounted at `/api/projects` each as `app.use('/api/projects', authenticateUser, router)` (projects, projectAssets, sceneAssets, shotAssignments, frames, checkout, stageStates, streamline, sceneStageLock), plus `/api/llm`, `/api/seed`, `/api/style-capsules`, `/api/images`, `/api/assets` each with `authenticateUser`. Because the middleware is attached per mount, a request whose handler lives in a later router (e.g. `/api/projects/:id/scenes/:sid/stage-locks` in the 9th router) passes through `authenticateUser` once per preceding `/api/projects` mount => up to 9 `getUser` round-trips per request (Express semantics; FUNCTIONAL but redundant).
- RLS: migration 001 enables RLS + per-user policies on projects/branches/stage_states (`001_initial_schema.sql:91-160`) but all backend queries use the service-role key, which bypasses RLS. Authorization is enforced only in code via `.eq('user_id', req.user.id)` on `projects` and then scoping children by `project.active_branch_id` (e.g. stageStates.ts:13-18; sceneStageLocks.ts:24-41). No role/admin concept exists; `/api/seed/prompt-templates` and `/api/llm/templates*` are reachable by any authenticated user (cross-slice).
- CORS (`server.ts:34-39`): prod origin hard-coded placeholder `https://your-frontend-domain.com`; dev `localhost:5173`, `localhost:3000` (dev UI runs on 8080 but uses the same-origin proxy, so CORS is not exercised in dev).
- `errorHandler` (`middleware/errorHandler.ts:8-29`) responds `{error:{message,code,stack?}}`; route handlers respond `{error:'string'}`. Frontend services do `throw new Error(error.error || ...)`, so an errorHandler-shaped response would surface as '[object Object]'. Express 4 (`backend/package.json: express ^4.18.2`): async handler rejections do not reach errorHandler; all slice routes catch locally. No JSON 404 handler (unknown `/api/*` path => Express default HTML 404).
- `express.json({limit:'10mb'})`, `helmet()` defaults.

## 3. Backend shell, config, transformers
- `backend/src/config/database.ts`: `DatabaseService` with static `testConnection()` (selects `projects.count`; treats PGRST205 as OK) and `runMigration()` which splits SQL on `;` and calls `supabase.rpc('exec', {query})`, throwing 'Supabase doesn't support direct SQL execution via API...' if the RPC errors (:32-64). Used by `backend/scripts/run-migrations.ts` (`npm run migrate`). No migration in repo defines an `exec` function (grep) => `npm run migrate` is likely non-functional; UNKNOWN whether such a function exists in the live DB. Instance methods `updateStageStateTraceId`, `createStageState`, `getStageStatesByTraceId` have no callers (DEAD); `prompt-template.ts` and `contextManager.ts` only use `this.db.supabase`.
- `config/streamlineConfig.ts`: `MIN_SCENE_HEADINGS=3`, `MIN_DIALOGUE_LINES=1`; consumed by `utils/scriptConfidence.ts`, `services/streamlineClassificationService.ts`; comment says it mirrors `src/lib/utils/streamlineConfig.ts` (DUPLICATED by design).
- `transformers/styleCapsule.ts`: snake_case -> camelCase mappers `capsuleToApi`, `capsulesToApi`, `libraryToApi`, `librariesToApi`; only consumer `routes/styleCapsules.ts` (cross-slice). `libraryToApi` leaves nested `style_capsules` untransformed.
- `routes/health.ts`: `GET /api/health` -> `{status:'healthy', timestamp, service:'wizardirector-api', version:'1.0.0', environment}`; TESTED (`backend/src/tests/health.route.test.ts`).
- Env vars read in slice: backend `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`(unused), `PORT`(default 3001), `NODE_ENV`; frontend `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 4. Project lifecycle

### 4.1 Project row (columns as used)
Table `projects` (migrations 001, 004, 022, 040): `id, user_id (FK auth.users ON DELETE CASCADE), title, target_length_min (default 180 s), target_length_max (default 300 s), project_type CHECK ('narrative','commercial','audio_visual'), content_rating CHECK ('G','PG','PG-13','M'), genre TEXT[], tonal_precision, active_branch_id (FK branches), created_at, updated_at, writing_style_capsule_id, visual_style_capsule_id (004), aspect_ratio CHECK ('16:9','9:16') default '16:9' (022), continuity_mode CHECK ('basic','advanced') default 'basic' (040)`.
Columns read/written in this slice: everything except `writing_style_capsule_id`/`visual_style_capsule_id` (not selected or written by projects.ts L1-1012/3961+; cross-slice whether written elsewhere).
Branch creation: DB trigger `on_project_created` -> `create_initial_branch()` inserts `branches(project_id, name='Main', is_main=TRUE)` and sets `projects.active_branch_id` (`001_initial_schema.sql:162-180`). No application code creates branches (grep: only reads of `branches` in projectAssets.ts:1794, shotAssignments.ts:64). Branch switching/creation UI is a toast stub (see 9).

### 4.2 Where creation actually happens
`App.tsx:59-62` `DashboardWrapper.handleNewProject` is a TODO `console.log` and is passed as `onNewProject`, but `Dashboard` never calls `onNewProject` (Dashboard.tsx:19 destructures it; no use) -> DEAD prop.
Actual UI path (REACHABLE, PERSISTED):
`NewProjectCard` click (Dashboard.tsx:120) -> `setNewProjectDialogOpen(true)` -> `NewProjectDialog.handleSubmit` (NewProjectDialog.tsx:22-58; requires trimmed title) -> `projectService.createProject({title})` (projectService.ts:23-45) -> `POST /api/projects` (projects.ts:553-637: title required string <=255; inserts `{user_id,title, project_type:'narrative', content_rating:'PG', genre:[], tonal_precision:'', target_length_min:180, target_length_max:300}`; DB trigger creates Main branch) -> 201 transformed project -> toast -> `Dashboard.handleProjectCreated` -> `loadProjects()` + `onProjectSelect(id)` -> `navigate('/projects/:id')`. ProjectView then opens Stage 1 (no stage_states yet).
Stage-1 configuration is later written by `Stage1InputMode.handleComplete` -> `projectService.updateProject` -> `PUT /api/projects/:id` (Stage1InputMode.tsx:224-233), or by Streamline's atomic RPC `streamline_commit_atomic` `project_config` (044 migration:63-79; cross-slice).
Secondary path `/projects/new` (typed URL only): ProjectView skips project load and sets title 'New Project' (ProjectView.tsx:194-199); Stage 1 renders with `projectId='new'`, shows 'Create a project first to enable auto-save' (Stage1InputMode.tsx:894-897); `handleComplete` creates a project titled `${selectedMode} Project - <date>`, PUTs config, saves stage 1 draft against the real id (Stage1InputMode.tsx:207-222,278), then `onComplete()` -> `ProjectView.handleStageComplete(1)` -> `stageStateService.lockStage('new',1)` -> backend 404 ('Project not found') -> toast 'Failed to complete stage'. URL stays `/projects/new`. => PARTIAL/broken; leaves an orphan created project with a draft stage 1.

### 4.3 List / get / update / delete
- List: `Dashboard.loadProjects` (Dashboard.tsx:32-49) -> `GET /api/projects` (projects.ts:259-467). Query: projects of user ordered by `updated_at desc` with embed `branches!active_branch_id(name, commit_message)`; all `stage_states(id,branch_id,stage_number,status,version,created_at)` for active branches (dedupe latest version per stage in JS); all `scenes(id,branch_id,scene_number,status,updated_at)` for active branches. Per project computes:
  - `currentStage = highestDraftStage>0 ? highestDraftStage : min(highestLockedStage+1, 5)` (only `locked`/`draft` considered) (:399-405).
  - `stages[1..5]`: `locked`->locked, `outdated`->outdated, `draft && i<=currentStage`->active, no row && i<=currentStage -> active, else pending; `skipped` and `invalidated` -> pending (:408-430). Contrast ProjectView treats skipped as passed (CONTRADICTED representation, see 6.4).
  - `sceneProgress` (only if scenes exist): `totalScenes`, `completedScenes` (= status `video_complete`), first non-complete scene number/status, `currentSceneStage` via `{draft:7, shot_list_ready:8, frames_locked:11, video_complete:12}` fallback 7, `latestSceneUpdate` (:369-393). Deferred scenes are counted (no `is_deferred` filter).
  - `updatedAt = max(project.updated_at, latest scene.updated_at)` (:432-437) but list order stays by `projects.updated_at`.
  - Response fields: `id,title, description=tonal_precision, status:'draft' (constant), branch = project.branches?.[0]?.name || 'main', currentStage, stages, createdAt, updatedAt, projectType, contentRating, genres, tonalPrecision, aspectRatio, targetLength{min,max}, sceneProgress?`. `thumbnail` and `inputMode` are never returned.
  - `branches!active_branch_id` is a many-to-one embed, which PostgREST returns as an object, so `branches?.[0]?.name` is expected to be undefined and the UI shows the literal fallback `'main'` instead of the DB name `'Main'` (UNKNOWN until runtime; settle by logging the embed shape). Same pattern in GET/POST/PUT.
- Dashboard UI: search box filters by title/description (Dashboard.tsx:58-61); Filter and Sort icon buttons have no handlers (:93-98, MOCK-ONLY/inert); loading spinner, error text + 'Try Again', empty text 'No projects found' / 'Create your first project to get started.' (:106-139); `StageInfoButton infoKey="dashboard"` (:149). ProjectCard (ProjectCard.tsx): pre-production shows 'Stage {currentStage} of {stages.length}' + 5 dots; in-production (`sceneProgress.totalScenes>0`) shows 'Narrative & Style Set', current scene line (Outdated / Continuity Broken / Stage N) and 'X/Y Scenes Complete'; branch chip; description; 'Updated <relative time>'.
- Get: `ProjectView.loadProject` (ProjectView.tsx:178-200) -> `GET /api/projects/:id` (projects.ts:470-550). `currentStage` here is computed over ALL stage_states versions (no latest-version dedupe, :508-521), `stages: []`. ProjectView uses only `title`, `branch`, `aspectRatio`. On failure: toast 'Failed to load project'; title remains 'Loading...'; stage UI still renders (no error/empty screen). `isLoadingProject` is set but never read.
- Update: `PUT /api/projects/:id` (projects.ts:640-807) validates and writes only provided fields: title (1..255), `project_type in ['narrative','commercial','audio_visual']`, content_rating, genre array, tonal_precision string, `target_length_min>=30`, `target_length_max>=60`, aspect_ratio 16:9|9:16; always bumps `updated_at`. Only caller: Stage1InputMode (create/update). The frontend type and Stage 1 option use `'audio-visual'` (`src/types/project.ts:28-31`; Stage1InputMode.tsx:92), so choosing 'Video for Audio' yields 400 'Invalid project type' and `handleComplete` swallows it (console only; Stage1InputMode.tsx:292-294) => CONTRADICTED value set; Stage 1 manual completion blocked for that type.
- Delete: ProjectCard hover trash -> confirm Dialog -> `projectService.deleteProject` -> `DELETE /api/projects/:id` (projects.ts:3961-4004) -> ownership check -> `projects.delete()` -> 204; DB cascades (`branches ON DELETE CASCADE` -> `stage_states ON DELETE CASCADE`; scenes etc. per later migrations, cross-slice). No storage-object cleanup in this route (generated images/videos in Supabase Storage are not deleted by this code; whether DB triggers/cascades remove storage is UNKNOWN). Dashboard reloads list on success.
- Continuity mode: `GET/PUT /api/projects/:id/continuity-mode` (projects.ts:810-860) read/write `projects.continuity_mode` ('basic'|'advanced', default 'basic'). `GET /:id/continuity-metrics?sceneId=` (:863-1010) computes counts over `scenes`, `shots(location_asset_id, location_match_source, location_match_confidence, camera_direction_id, reference_image_order, selected_continuity_base_frame_id)`, `frames.generated_from_frame_id`; returns totals, up to 3 canned suggestions, and `strictValidation{enabled: mode==='advanced', canProceed, issues[]}`. Consumers: `src/lib/services/locationContinuityService.ts:115,139,165` used by `Stage8/LocationCoveragePanel.tsx:134-165` and `Stage10FrameGeneration.tsx:272,457` (cross-slice). TESTED by `backend/src/tests/continuityBaseAndModeRoutes.test.ts`.

## 5. ProjectView: the stage host (src/pages/ProjectView.tsx)

### 5.1 Local state
`currentStage` (1..12), `stages: StageProgress[5]` (init: stage1 active, 2-5 pending; :29-35), `activeSceneId`, `sceneStage (7..12)`, `completedSceneStages`, `sceneStageLocks`, Phase A unlock dialog state, `projectTitle/currentBranch/projectAspectRatio`, `hasReachedPhaseB`, refs `hasRestoredStage`, `isHydrated`, `isUnskipping`, `isBackfilling`. Stage states loaded once via `useProjectStageStates(projectId)` -> `GET /api/projects/:id/stages` (useStageState.ts:237-274); hook `refresh` never called by ProjectView.

### 5.2 Persistence (transient vs persisted)
- localStorage `project_<id>_stage` (stage number), `project_<id>_sceneId` (only written when stage>=7 and sceneId), `project_<id>_reachedPhaseB` ('true' once `currentStage>5`) (:116-126,129-149,203-221). Never cleared (including on project delete / sign-out).
- URL `?stage=&sceneId=` written with `replace:true` by `persistStage` (:141-148).
- Not persisted: `sceneStage` changes made by `handleSceneStageBack` (:625-631), sidebar `onStageSelect=setSceneStage` (:839) and `handleReturnToStage` (:758-762) — URL/localStorage keep the previous stage, so a refresh returns to the later stage.

### 5.3 Render decision (exhaustive)
```
if currentStage > 5 && activeSceneId:   ProjectHeader(onBack=handleExitScene) + one of
     sceneStage 7  -> Stage7ShotList(projectId, sceneId, onComplete, onBack, onNext)
     sceneStage 8  -> Stage8VisualDefinition(...)
     sceneStage 9  -> Stage9PromptSegmentation(...)
     sceneStage 10 -> Stage10FrameGeneration(...)
     sceneStage 11 -> Stage11Confirmation(...)
     sceneStage 12 -> Stage12VideoGeneration(..., onReturnToStage)   [no onNext]
   + SceneWorkflowSidebar                                                (:765-846)
elif currentStage > 5:                   ProjectHeader(onBack=history.back) + Stage6ScriptHub(onEnterScene, onEnterSceneAtStage, onBack=>stage 5)  (:849-869)
                                         [Stage6 gets projectId from useParams, not a prop: Stage6ScriptHub.tsx:56]
else (Phase A):                          ProjectHeader + PhaseTimeline + one of           (:872-993)
     1 -> Stage1InputMode(projectId, onComplete, stageStatus, onNext, onUnlock, onStreamlineComplete)
     2 -> status 'skipped' ? SkippedStagePlaceholder(2,'Treatment') : Stage2Treatment(...)
     3 -> status 'skipped' ? SkippedStagePlaceholder(3,'Beat Sheet') : Stage3BeatSheet(...)
     4 -> status 'skipped' ? SkippedStagePlaceholder(4,'Master Script', allowGenerate=false) : Stage4MasterScript(...)
     5 -> Stage5Assets(...)    [never placeholder]
   + UnlockWarningDialog (open only if phaseAUnlockStage!==null && phaseAUnlockImpact!==null)
```
`currentStage === 6` with an activeSceneId never occurs in practice (handleExitScene clears it). `?stage=7..12` without `sceneId` (and stage!=8) renders the Script Hub while the URL says stage N (restore effect sets currentStage=N but no activeSceneId; :264,293-301,415-438). e2e tests navigate `/projects/:id?stage=7` (e2e/enhanced-upload-modal.spec.ts:121), which therefore lands on Script Hub.

### 5.4 Restore -> hydrate -> guard pipeline
1. Restore (:236-308, deps projectId/searchParams): stage from URL (1..12) else localStorage. Stage 8 requires sceneId from URL or `project_<id>_sceneId`; if absent, falls back to stage 7 (console.warn '[Stage8] No sceneId...'). If stage>5: sets currentStage (+activeSceneId/sceneStage if sceneId & >=7). Sets `hasRestoredStage`.
2. Scene restore (:392-444, deps searchParams/projectId): if `stage>=7` and sceneId -> setActiveSceneId, setSceneStage, setCurrentStage, `fetchSceneLocks` (GET stage-locks) -> `sceneStageLocks`, `completedSceneStages` = stages whose lock status is locked|outdated. Runs again on every `persistStage` (searchParams change), so each scene-stage advance re-fetches locks from DB and overwrites local completed list.
3. Hydrate (:311-363): skipped if `projectId==='new'`, still loading, or **zero stage_states rows**; once per project (`isHydrated`). `derivePhaseAStages` (:44-76): latest row per stage -> `locked|skipped` => that status (+origin) and counts as passed; `draft` => 'active'; `outdated` => 'outdated' (+origin); anything else (incl. `invalidated`) and missing => 'pending'. `derivedStage = highestDraft>0 ? highestDraft : (highestPassed>=5 ? 6 : highestPassed+1)`. If currentStage>5: just set stages. If restored stage within `min(max(highestPassed,highestDraft)+1,5)`: keep it (mark active if pending). Else jump to `derivedStage` (so a project whose 5 Phase A stages are passed opens in the Script Hub).
4. Navigation guard (:366-389): only for currentStage<=5 and after hydration: if current stage is pending/missing, redirect to the highest non-pending stage.
Consequences (from code): (a) a project with zero stage_states never hydrates, so the guard never runs and `?stage=2..5` renders that Phase A stage directly, and `?stage=6` renders Script Hub; (b) Phase B URLs (`?stage=9&sceneId=X`) are never validated against Phase A status or scene lock status — any scene stage component can be opened directly by URL; (c) `handleNavigate` allows any `toStage>5` regardless of Phase A status (:505-513), but the only UI entry points to >5 are Stage 5 completion/Next, the 'Script Hub' button (only when `hasReachedPhaseB`), and URL.

### 5.5 Handlers (call chains)
- `handleStageComplete(n)` (:446-476): `stageStateService.lockStage(projectId,n)` -> `POST /api/projects/:id/stages/:n/lock`. Local: stage n -> locked, n+1 -> active (n<5). n==5 -> currentStage 6 + toast 'Stage 5 completed! Proceeding to Script Hub...'; n<5 -> n+1. Error toast 'Failed to complete stage. Please try again.' Stage 4 and Stage 5 components already call `stageStateService.lockStage` themselves before `onComplete()` (Stage4MasterScript.tsx:616-621; Stage5Assets.tsx:778-782) => two locked versions are inserted per approval (DUPLICATED write).
- `handlePhaseANext(n)` (:750-756): navigate n+1 (5 -> 6) without locking. `handleGoBack(n)` (:478-480).
- `handlePhaseAUnlock(n)` (:691-716): calls `unlockStage(projectId,n,false)`. Backend returns 409 `{error, details:{stage, downstreamStages, message}, requiresConfirmation:true}` (stageStates.ts:595-607); `stageStateService.unlockStage` returns the raw body on 409 (stageStateService.ts:188-191). ProjectView tests `result.downstreamStages` (top level), which is always undefined, so it always takes the 'no downstream impact' branch and calls `handleConfirmPhaseAUnlock(n)` immediately. => The Phase A `UnlockWarningDialog` never opens (DEAD at runtime); unlocking any Phase A stage immediately marks downstream locked/outdated stages outdated with no warning. No test covers this.
- `handleConfirmPhaseAUnlock(n)` (:718-747): `unlockStage(...,true)` -> local: stage n active, downstream `locked` -> `outdated`; navigate to n; toast 'Stage n unlocked for editing'.
- `handleWriteMyself(n)` (:653-669): `unlockStage(n, confirm=true)` on a skipped stage -> backend skipped -> draft and ALSO marks downstream (<=5) locked/outdated stages outdated (stageStates.ts:568-655). Local state only flips stage n to active (origin cleared); downstream outdated not reflected until reload. The code comment ('no real content to lose') does not mention the downstream cascade (comment vs behavior mismatch).
- `handleGenerateFromScript(n)` (:672-688): `streamlineService.backfillStage(projectId,n)` -> `POST /api/projects/:id/streamline/backfill/:n` (cross-slice); local stage n -> locked, origin 'ai-generated'; toast. Offered for stages 2,3 only (Stage 4 `allowGenerate={false}`).
- `handleStreamlineComplete(target)` (:487-503): refetch `GET /stages`, re-derive, set target active, navigate; toast 'Streamline processed your material — picking up where it left off.' / failure toast.
- `handleEnterScene(sceneId)` (:515-551): GET stage-locks; resume target = first stage 7..12 whose status is not locked|outdated; if all locked/outdated -> 12; error fallback stage 7 with empty completed.
- `handleEnterSceneAtStage(sceneId, stage)` (:553-581): used by Script Hub 'Review Video' (stage 12, only when render status 'complete'; Stage6ScriptHub.tsx:132-138,422-431); on lock-fetch error assumes stages before target completed.
- `handleSceneStageComplete()` (:589-615): best-effort `sceneStageLockService.lockStage(projectId, sceneId, sceneStage)` (errors only console.error), add to completed, advance+persist; at 12 -> toast 'Scene completed!' + exit to Script Hub. Stage 8-12 components already call `lockStage(n)` before `onComplete()` (e.g. Stage8VisualDefinition.tsx:171-172; Stage9:962-963; Stage10:1695-1696; Stage12:237-238) => duplicate lock call that re-stamps `locked_at`. If the lock fails (prev not locked) the UI still advances.
- `handleSceneStageNext/Back`, `handleExitScene` (-> stage 6, clears scene), `handleReturnToStage` (Stage 12 'return to stage N').
- `deriveSidebarLockStatuses()` (:634-641): missing key => 'draft'.
- ProjectHeader buttons in all three layouts: Artifact Vault / Story Timelines / New Branch -> `toast.info('... coming soon')` (:773-775,857-859,879-881) => MOCK-ONLY.

## 6. Phase A state machine: `stage_states` (backend/src/routes/stageStates.ts)

Storage: append-only versioned rows per `(branch_id, stage_number, version)` UNIQUE (001:51-78). Status CHECK `draft|locked|invalidated|outdated|skipped` (041:29-33). `origin` CHECK `NULL|skipped|imported|ai-generated|authored` (041:38-43). Every transition below INSERTs a new version; rows are never updated or deleted by these routes. "Latest" = max version per stage.

| # | Transition | Route | Preconditions | Effect |
|---|---|---|---|---|
| T1 | save content | `PUT /:pid/stages/:n` (:120-294) | n 1..12; content object; status in 5-value set; origin in set; project owned; has active branch | INSERT version+1 with `status = req.status||'draft'`, except latest `locked` + requested `draft` => stays `locked` (:211-222). `origin = req.origin||null`; `content` = request content (replaces); `regeneration_guidance`; `inherited_from_stage_id = previous latest id`. If `styleCapsuleMetadata.styleCapsuleId` -> INSERT `style_capsule_applications(stage_state_id, style_capsule_id, injection_context)` (failure ignored). Bumps `projects.updated_at`. |
| T2 | lock | `POST /:pid/stages/:n/lock` (:297-412) | latest row exists; n>1 => latest of n-1 is `locked` or `skipped` (outdated/draft rejected 400 with details) | INSERT version+1 `status:'locked'`, content + guidance copied, **origin omitted (NULL)**. No check on current status (locking locked/outdated/skipped/draft all allowed; locking a skipped row yields locked `{}`). Does NOT bump `projects.updated_at`. |
| T3 | skip | `POST /:pid/stages/:n/skip` (:416-519) | n in {2,3,4}; latest n-1 locked or skipped; latest n not `locked` | INSERT `status:'skipped', origin:'skipped', content:{}`; bumps updated_at. Frontend wrapper `stageStateService.skipStage` has no caller (DEAD); skipping happens only via Streamline commit RPC (cross-slice). TESTED: streamlineSkip.test.ts. |
| T4 | unlock (assess) | `POST /:pid/stages/:n/unlock` `{confirm:false}` (:523-607) | n 1..5; latest n is `locked` or `skipped` (**outdated or draft -> 400 'Stage is not locked or skipped'**) | 409 with `details.downstreamStages` = stages n+1..5 whose latest is locked or outdated. |
| T5 | unlock (confirm) | same, `{confirm:true}` (:609-667) | as T4 | INSERT n version+1 `draft` (content copied, origin NULL); for each downstream stage INSERT version+1 `outdated` (content copied, origin NULL); bumps updated_at. Returns `{success, stageState, outdatedStages}`. Phase B (`scenes.stage_locks`, stage_states 6..12) is NOT touched. Skipped downstream stages stay skipped. |
| T6 | DB guard | trigger `trg_streamline_stage_lock_prerequisite` BEFORE INSERT (044:4-36) | applies to every INSERT with `status='locked'` and stage>1 | raises if latest n-1 is not locked/skipped. Covers T1 (locked-preserved saves), T2, Streamline. |
| T7 | Streamline commit / backfill | `streamline_commit_atomic` RPC; `POST /:pid/streamline/backfill/:n` (streamline.ts:99-196) | cross-slice | multi-stage lock/skip with origin; backfill: latest must be `skipped` -> INSERT locked (origin per V-streamline slice). |

Statuses never produced by slice code: `invalidated` (accepted by T1 validator; only projects.ts:3108/3116 write `invalidated` to frames/videos-like tables, cross-slice).
Outdated is a dead end in the Phase A UI: Stage 1-5 components render a read-only `LockedStageHeader` with OUTDATED badge, 'Edit' (=`onUnlock` -> T4 -> 400 -> toast 'Failed to unlock stage') and 'Next'; no `onRelock` and no Lock button are passed in Phase A (Stage2Treatment.tsx:437-446 and equivalents; LockedStageHeader.tsx:99-131). The only code paths out of `outdated` are T1 with status draft (no regression guard for outdated), T2 (lock, not wired to an outdated UI control) or Streamline.

Auto-save side effect (INV, static analysis): `useStageState` (useStageState.ts:100-143) skips only the very first render; when the initial load resolves it sets `content` and `isLoading=false` in one batched render, which changes `content` and re-runs the effect, scheduling `stageStateService.autoSave` (1000 ms debounce, stageStateService.ts:230-262) -> T1 with `status` defaulting to `'draft'` and no `origin`. Stages using `autoSave:true`: 2, 3, 5 (Stage2Treatment.tsx:99, Stage3BeatSheet.tsx:249, Stage5Assets.tsx:106); Stage 1 and 4 use `autoSave:false`. Expected effect of merely opening Stage 2/3/5: a new version ~1 s later; if latest was `locked` it stays locked but `origin` becomes NULL (IMPORTED/AUTO-FILLED badge lost on next load); if latest was `outdated` it becomes `draft`. Runtime confirmation UNKNOWN (settle by watching PUT `/stages/:n` on mount). Auto-save failure shows toast 'Auto-save failed'. Every keystroke-driven content change on a locked stage also inserts a new `locked` version with the new content (T1 preserve rule).

Frontend stage status vocabulary (`src/types/project.ts:7-12`): `locked|active|pending|outdated|skipped`; backend `draft` maps to `active`; `invalidated` and missing map to `pending`.

Badges (`src/lib/utils/stageBadge.ts:29-70`, used only by PhaseTimeline): outdated -> 'OUTDATED' (+' · Imported/Auto-filled/Authored' subtext); skipped -> 'SKIPPED'; locked+imported -> 'IMPORTED'; locked+ai-generated -> 'AUTO-FILLED' (tooltip "Generated from script on lock — won't update automatically if the script changes later."); else none. Because T2/T5 write `origin NULL`, the outdated subtext only appears for rows whose origin was written by Streamline paths; outdated rows created by T5 always have NULL origin. TESTED: stageBadge.test.ts.

Two derivations of Phase A progress exist: ProjectView `derivePhaseAStages` (skipped = passed; TESTED derivePhaseAStages.test.ts) vs `GET /api/projects` list computation (skipped/invalidated = pending; locked-only highest) (projects.ts:399-430) vs `GET/PUT /api/projects/:id` (all versions, not latest). DUPLICATED / CONTRADICTED.

## 7. Phase B state machine: `scenes.stage_locks` (backend/src/routes/sceneStageLocks.ts)

Storage: `scenes.stage_locks JSONB` map `"7".."12" -> {status:'draft'|'locked'|'outdated', locked_at?}`; missing key == draft. Column is NOT created by any file in `backend/migrations/`; it is added only by `backend/quickies-sql/add_stage_locks.sql` (ALTER + backfill '7' from `shot_list_locked_at`; comment 'Ran successfully on prod.'). A DB built from migrations alone would lack it. Unversioned (overwrite in place); `scenes.updated_at` bumped on every write.

| # | Transition | Route / writer | Preconditions | Effect |
|---|---|---|---|---|
| P1 | lock | `POST /:pid/scenes/:sid/stage-locks/:n/lock` (:56-141) | n 7..12; project owned; scene in active branch; n>7 => locks[n-1].status==='locked' (outdated rejected) | locks[n]={locked, locked_at:now}; n==7 also sets `shot_list_locked_at=now` (fires `fn_sync_scene_lock_status` -> `scenes.status='shot_list_ready'` if it was NULL; 014 migration:31-49). No check of current status. This bypasses the Stage 7 shot-list validation route. |
| P2 | unlock (assess) | `.../:n/unlock {confirm:false}` (:145-242) | current locked or outdated (missing/draft -> 400 'Stage is not locked') | 409 `{details:{stage, downstreamStages(locked|outdated >n), framesAffected, videosAffected, estimatedCost=(frames*0.05+videos*2.50).toFixed(2), message}, requiresConfirmation:true}`. frames = `frames` of scene shots with status != 'invalidated'; videos from table `videos` (no migration defines `videos`; with a missing table the query errors and the count is 0; UNKNOWN in live DB). |
| P3 | unlock (confirm) | same `{confirm:true}` (:244-281) | as P2 | locks[n]={draft}; each downstream -> {outdated} (locked_at dropped); n==7 also `shot_list_locked_at=null` (trigger reverts status to draft only if it was shot_list_ready). Frames/videos/shots/prompts are NOT modified (counts are informational). |
| P4 | relock | `.../:n/relock` (:290-375) | current outdated; n>7 => prev locked | locks[n]={locked, now}; n==7 also sets `shot_list_locked_at`. |
| P5 | shot list lock | `POST /:id/scenes/:sid/shots/lock` (projects.ts:2955-2985) | cross-slice validation | sets `'7'` locked + `shot_list_locked_at`. |
| P6 | shot list unlock | `POST /:id/scenes/:sid/shots/unlock` (projects.ts:3138-3165) | cross-slice | `'7'` draft, 8..12 locked|outdated -> outdated, `shot_list_locked_at=null`; may write `invalidation_logs`. |
| P7 | assignment change | `shotAssetAssignmentService.invalidateStage9AndDownstream` (shotAssetAssignmentService.ts:318-344) | any shot-asset-assignment mutation (cross-slice) | 9..12 `locked` -> outdated (outdated untouched). |

Frontend: `sceneStageLockService` (sceneStageLockService.ts) correctly unwraps 409 `result.details` (:103-108) so the Phase B `UnlockWarningDialog` (rendered inside Stage 7-11 components) receives real impact numbers; `useSceneStageLock` hook (useSceneStageLock.ts) exposes `isLocked/isOutdated/getStatus/lockStage/unlockStage/confirmUnlock/relockStage` and is used by Stage7..Stage12. Stage 12 passes `isLocked={true}` to LockedStageHeader unconditionally (Stage12VideoGeneration.tsx:233; cross-slice).
SceneWorkflowSidebar gating (SceneWorkflowSidebar.tsx:63-83): a stage button is enabled if it is current, completed (local list) or locked/outdated, or every earlier stage 7..n-1 is locked/outdated/locally-completed; disabled stages show a lock icon. Labels: 7 Shot List, 8 Visuals, 9 Prompts, 10 Frames, 11 Review, 12 Video. Gating is UI-only; the URL bypasses it (5.4).
Scene `status` column (draft/shot_list_ready/frames_locked/video_complete/outdated/continuity_broken; 014:16-27) is a second, coarser representation of scene progress used by the dashboard and Script Hub. Writers found: trigger (draft/shot_list_ready) and `videoGenerationService.ts:528` (`video_complete`); no backend writer of `frames_locked`, `outdated` or `continuity_broken` was found by grep (UNKNOWN; settle by reading projects.ts PUT /:id/scenes 1217-1533 and Stage4 scene persistence fully). DUPLICATED representation.
Deferred scenes: `scenes.is_deferred` (027). `PUT /:id/scenes/:sid/defer|restore` (projects.ts:1135-1214) toggle the flag only. Script Hub disables 'Enter Scene Pipeline' for deferred scenes (Stage6ScriptHub.tsx:432-437) and shows 'Defer Scene'/'Restore Scene'; no backend route (stage-locks, shots, frames) checks `is_deferred`, and the URL path is not gated. Dashboard counts deferred scenes in totals.

## 8. Shell components (behavior)
- `GlobalSidebar` (GlobalSidebar.tsx): 3 nav items, active highlight by pathname, Sign Out (only when `user`), `ThemeToggle`, collapse 280px<->72px (local state, not persisted). Ignores props (empty interface).
- `MainLayout`: sidebar + scrollable main.
- `ProjectHeader`: back arrow, title, branch chip, aspect-ratio chip, 3 stub buttons.
- `PhaseTimeline`: 5 nodes (status icon/colour, badge); click allowed when status != pending; connectors coloured by position (`index < currentStage-1`) not by status; optional 'Script Hub ->' button when `hasReachedPhaseB`.
- `LockedStageHeader`: locked -> 'LOCKED-IN' + 'Unlock & Edit' + 'Next'; outdated -> 'OUTDATED' + optional 'Re-lock' + 'Edit' + 'Next'; otherwise `editingActions` + 'Lock & Proceed' (custom label, disabled/isLocking spinner). Used by Stage1-5 and Stage7-12.
- `UnlockWarningDialog`: title 'Unlock Stage N: <title>?'; downstream list with names (STAGE_NAMES 1-5, 7-12; 6 absent); frames/videos counts; cost line only if `parseFloat(estimatedCost)>0`; footer text 'Data will NOT be deleted. Downstream stages can be re-locked once you're done editing.' Used by ProjectView (Phase A, never opens) and Stage7/8/9/10/11.
- `SkippedStagePlaceholder`: 'SKIPPED' pill; copy 'Streamline determined your uploaded material already earned you a later stage...'; 'Generate this now' (gold, hidden when allowGenerate=false) and 'Write this myself'; both disabled while busy. TESTED (SkippedStagePlaceholder.test.tsx).
- `StageInfoButton`: fixed bottom-right info icon appearing after 400 ms; Popover with `stageInfoContent[infoKey]` tips (`src/config/stageInfoContent.ts`, keys dashboard, stage-1..stage-12). Used by Dashboard and Stage1-12. Tip copy contains claims not backed by the shell (e.g. dashboard 'Use branches to explore alternative creative directions', 'Create projects with different input modes' — creation dialog only takes a title).
- `SceneIndicator`: badge 'Scene N · <short slug>' using `formatSceneHeader` (`src/lib/utils.ts:37-114`, slug -> 'Ext. Location - Day'); used by Stage7,9,10,11,12 and Stage8/SceneAssetListPanel.
- `StyleChangeWarningDialog`: AlertDialog 'Change Visual Style?' with Cancel / 'Clear All Images' / 'Mark Images as Outdated'; only used by Stage5Assets (wiring cross-slice; backend `POST /:pid/assets/mark-style-outdated`, `/clear-all-images` exist in projectAssets.ts:1587,1631).
- `useDebounce` used by Stage7 and Stage9; `useDebouncedCallback` unused (DEAD).
- Landing (`src/pages/Landing.tsx`): static marketing page, own theme toggle persisted to `localStorage['landing-theme']`, smooth-scroll to #pipeline/#pricing, all CTAs -> `/auth`. All `MediaSlot`s are placeholders (no `src` passed). 'Explore Stage' buttons have no handler (`tabIndex=-1`). Copy claims not backed by code in this slice and not by deps: 'Multi-provider AI: OpenAI, Anthropic, Gemini', 'Git-style branching', '$6.66/month', '14-day free trial. Bring your own API keys', 'Real-time cost tracking' (no openai/anthropic/stripe deps in either package.json; no billing code found).
- AssetLibrary page (`src/pages/AssetLibrary.tsx`): `assetService.listAssets()` on mount; search by name, tabs all/character/prop/location with counts, grid/list toggle, 'New Asset' -> `AssetDialog`, edit, delete via `DeleteAssetDialog`; sorted newest first; error toast. Data path cross-slice (`/api/assets`).
- StyleCapsuleLibrary page (`src/pages/StyleCapsuleLibrary.tsx`): loads `getCapsules()` + `getLibraries()`; search; type and preset/custom selects (an `isFavorite` filter exists in state but has no UI); tabs Writing/Visual; sort favorites -> custom -> presets -> name; per-card favorite toggle, menu View/Edit/Duplicate (presets only)/Delete (custom only); create via dropdown -> Writing/Visual editor dialogs; view/edit dialog read-only for presets; delete AlertDialog. Note: after a select is reset to 'all', the filter key remains with `undefined`, so `Object.keys(filter).length>0` and the empty state shows 'Try adjusting your search or filters.' and hides the create button. Data path cross-slice (`/api/style-capsules`).

## 9. Loading / error / empty states (shell)
- Auth init spinner: `/`, `/auth`, every protected route until `initialized`.
- Dashboard: spinner 'Loading projects...'; error message + 'Try Again' + destructive toast; empty grid text.
- ProjectView: title 'Loading...' until project loads; no loading gate on stage states (Stage 1 renders immediately, hydration may switch stage after load); project-load failure = toast only.
- StyleCapsuleLibrary: full-page spinner 'Loading style capsules...'; empty states per tab. AssetLibrary: `AssetGallery loading` prop.
- Scene lock fetch failures: console only (restore) or fallback to stage 7 (enter scene).

## 10. Gated / hidden / unreachable / stubbed
- Unreachable: Phase A UnlockWarningDialog (5.5); `Index.tsx`; `DashboardWrapper.handleNewProject`; `stageStateService.skipStage`; `useDebouncedCallback`; `ProjectView.restoreStage()` (:152-175, never called), `getStageState` and `navigate` destructured but unused; `ProjectSettings`/`ProjectStatus` types unused; `DatabaseService` instance trace-id methods.
- Stubs (toast only): Artifact Vault, Story Timelines, New Branch. Inert: Dashboard Filter/Sort buttons; Landing 'Explore Stage'.
- Gated in UI only (bypassable by URL): Phase B scene stages (sidebar), deferred scenes (Enter button), Phase A stages on projects with no stage_states rows.
- Not gated at all: entering Phase B (stage 6) before Stage 5 is locked, via 'Script Hub' button only after `hasReachedPhaseB`, or URL.
- Admin/debug: none in shell UI. Backend debug-ish endpoints reachable by any authenticated user (cross-slice): `POST /api/seed/prompt-templates`, `GET /api/llm/test-connectivity`, `GET /api/images/debug-style-capsule/:capsuleId`, `/api/llm/templates` CRUD.
- Heavy console logging (emoji logs) in useStageState, stageStateService, stageStates route.

## 11. Tests covering the slice
- `src/pages/__tests__/derivePhaseAStages.test.ts` (6 cases: locked passed, skipped passed, skip 2&3 land on 4, draft precedence, outdated origin carry, pending when no rows).
- `src/lib/utils/__tests__/stageBadge.test.ts` (7 cases, precedence table).
- `src/lib/services/__tests__/projectService.test.ts` (create/get/list/delete/auth-missing).
- `src/components/pipeline/__tests__/SkippedStagePlaceholder.test.tsx` (3 cases).
- `backend/src/tests/health.route.test.ts` (3 cases).
- `backend/src/tests/streamlineSkip.test.ts` (skip route: rejects 1 and 5, out-of-order, already-locked; success after locked and after skipped; lock route sequential check incl. skipped predecessor).
- `backend/src/tests/continuityBaseAndModeRoutes.test.ts` (continuity-mode GET/PUT, continuity-metrics).
- `backend/src/tests/shotLocking4_5_task_11.test.ts` (401/validation only for shots/lock|unlock).
- e2e `e2e/enhanced-upload-modal.spec.ts`, `e2e/story-context-update.spec.ts`: login via `/auth`, dashboard visible, direct `?stage=` URLs.
- Not tested: ProjectView component behavior, Phase A unlock route (T4/T5), PUT stage route, scene stage-lock routes (P1-P4), auth store, ProtectedRoute, Dashboard/ProjectCard, projects list/create/update/delete routes, useStageState/useSceneStageLock hooks.

## Cross-slice references
- `src/components/pipeline/Stage1InputMode.tsx:180-298` — manual Stage 1 completion: updateProject + saveStageState(draft) + onComplete; `autoSave:false` yet UI shows 'All changes saved' (:903-905) although nothing is saved before Proceed.
- `src/components/pipeline/Stage1InputMode.tsx:92` — project type id `'audio-visual'` vs backend/DB `'audio_visual'`.
- `src/components/pipeline/Stage4MasterScript.tsx:605-621`, `Stage5Assets.tsx:775-782` — lock stage themselves then call onComplete (double lock).
- `src/components/pipeline/Stage6ScriptHub.tsx:56,132-180,402-437` — projectId via useParams; defer/restore; Review Video -> stage 12; outdated scene warning.
- `src/components/pipeline/Stage7ShotList.tsx:700-708,910-915`; `Stage8VisualDefinition.tsx:155-172,763-768`; `Stage9PromptSegmentation.tsx:427-437,962-983`; `Stage10FrameGeneration.tsx:874-884,1695-1743`; `Stage11Confirmation.tsx:148-158,414`; `Stage12VideoGeneration.tsx:233-238` — scene-stage lock/unlock/relock wiring.
- `backend/src/routes/streamline.ts:45-196` and migrations 041-044 — `streamline_commit(_atomic)` multi-stage transitions, backfill of skipped stages, `project_config` write.
- `backend/src/routes/projects.ts:2845-3190` — shot list lock/unlock also write `stage_locks` and `shot_list_locked_at`; unlock writes `invalidation_logs` and sets status `invalidated` on frames/videos (:3078-3116).
- `backend/src/services/shotAssetAssignmentService.ts:318-344` — 9..12 locked -> outdated on assignment changes.
- `backend/src/services/storyContextService.ts:70-107`, `projects.ts:1749-1762`, `streamlineBackfillService.ts:34-35`, `assetExtractionService.ts:285` — downstream readers query `stage_states` filtered by `status='locked'` (latest locked version, ignoring newer draft/outdated versions).
- `backend/src/services/videoGenerationService.ts:528` — only writer of `scenes.status='video_complete'`.
- `src/lib/services/locationContinuityService.ts:115-165` — client for continuity-mode/metrics.
- `backend/src/routes/seed.ts:15`, `llm.ts:420,443-731`, `images.ts:140` — debug/admin-like endpoints open to any authenticated user.
- `backend/src/routes/styleCapsules.ts` — sole consumer of transformers.

## Contradictions / unknowns
1. Phase A unlock warning: frontend expects top-level `downstreamStages`, backend nests it under `details` => dialog never shown (CONTRADICTED; code-certain).
2. Project type `'audio-visual'` (frontend) vs `'audio_visual'` (backend validation + DB CHECK) (CONTRADICTED).
3. Branch display: DB name 'Main' vs UI fallback 'main' via `branches?.[0]` on a to-one embed — UNKNOWN until runtime.
4. Skipped stage representation: dashboard list => pending; ProjectView => skipped/passed; PhaseTimeline/ProjectCard both have 'skipped' styles but the list API never emits 'skipped' (CONTRADICTED).
5. `scenes.stage_locks` exists only via quickies-sql, not migrations (schema drift; UNKNOWN for fresh DBs).
6. `videos` table referenced by stage-lock unlock impact but not defined in any migration/quickie (UNKNOWN; affects videosAffected/estimatedCost).
7. Auto-save-on-mount rewriting locked/outdated rows (origin loss, outdated->draft) — inferred from hook code; runtime UNKNOWN.
8. Comment in ProjectView `handleWriteMyself` implies no consequences, but backend cascades downstream outdated (comment vs behavior).
9. `GET /api/projects/:id` `currentStage` uses all versions; unused by UI but inconsistent with the list endpoint.
10. Whether project delete leaves Supabase Storage objects behind — UNKNOWN (no storage cleanup in route; check DB triggers / storage policies).
11. `npm run migrate` depends on an `exec` RPC not defined in repo migrations — UNKNOWN in live DB.
12. Email confirmation setting (affects signUp -> session null path) — UNKNOWN (Supabase dashboard).
13. Scene statuses `frames_locked`, `outdated`, `continuity_broken`: consumers exist (dashboard, Script Hub, continuityRiskAnalyzer) but no writer found in grep — UNKNOWN.
