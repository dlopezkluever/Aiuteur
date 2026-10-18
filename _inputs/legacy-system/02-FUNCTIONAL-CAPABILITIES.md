# 02 Functional capabilities

Canonical inventory of 287 user-visible capabilities (`WD-IMPL-CAP-*`) established from current code. Generated mechanically from the unified ledger (`17-IMPLEMENTATION-LEDGER.md`); each entry was written by the reporter owning that slice and checked in later waves. Status flags: P=PRESENT, R=REACHABLE, F=FUNCTIONAL, S=PERSISTED, T=TESTED; values Y (yes), N (no), P (partial), U (unknown). Entries carrying a `correction` were contradicted or refined by a later reporter; the correction wins. Related product-intent ids (`WD-IDEA-*`) come only from the late coverage check and never imply that the code implements the idea.

Reading notes: workflow narratives are in 03-USER-WORKFLOWS.md; the AI calls referenced here are in 09-AI-AND-PROMPT-SYSTEM.md; state rules in 10-VERSIONING-LOCKING-AND-INVALIDATION.md; unreachable code in 14-DEAD-PARTIAL-AND-DUPLICATED.md.

## Status summary

| flag | Y | P | N | U | ? |
|---|---|---|---|---|---|
| reachable | 274 | 2 | 2 | 2 | 0 |
| functional | 160 | 87 | 10 | 15 | 0 |
| persisted | 206 | 9 | 65 | 0 | 0 |
| tested | 28 | 24 | 218 | 0 | 0 |

## Index by area

- Application shell, projects, stage state: 52 (WD-IMPL-CAP-0001 to WD-IMPL-CAP-0052)
- Style capsules and global asset library: 35 (WD-IMPL-CAP-0053 to WD-IMPL-CAP-0087)
- Writing: input, treatment, beats, script, scenes: 22 (WD-IMPL-CAP-0088 to WD-IMPL-CAP-0109)
- Streamline intake: 26 (WD-IMPL-CAP-0110 to WD-IMPL-CAP-0135)
- Project assets (Stage 5): 26 (WD-IMPL-CAP-0136 to WD-IMPL-CAP-0161)
- Scene assets, Stage 8, transformations: 31 (WD-IMPL-CAP-0162 to WD-IMPL-CAP-0192)
- Continuity and locations: 29 (WD-IMPL-CAP-0193 to WD-IMPL-CAP-0221)
- Shots (Stage 7) and shot-asset assignments: 18 (WD-IMPL-CAP-0222 to WD-IMPL-CAP-0239)
- Prompts and frames (Stages 9, 10): 26 (WD-IMPL-CAP-0240 to WD-IMPL-CAP-0265)
- Confirmation, video, credits (Stages 11, 12): 22 (WD-IMPL-CAP-0266 to WD-IMPL-CAP-0287)

## Application shell, projects, stage state

### WD-IMPL-CAP-0001 Sign up with email and password
- Behavior: Auth page signup mode creates a Supabase auth user; on success the zustand store sets user and session and the page redirects to /dashboard.
- Trigger / entrypoint: /auth signup toggle
- Preconditions: Valid email, password min 6 chars, form not submitting
- Code path: AuthForm.onSubmit -> useAuthStore.signUp -> supabase.auth.signUp
- Data touched: Supabase auth.users (external); localStorage auth-storage
- Downstream effects: Auth.tsx Navigate to /dashboard; all services read session access_token
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/auth/AuthForm.tsx:40-55; src/lib/stores/auth-store.ts:28-49; src/pages/Auth.tsx:14-17
- Notes: If Supabase returns no session (email confirmation enabled, UNKNOWN), store still sets user, redirect happens, and every API call then fails with User not authenticated.
- Related: WD-IMPL-STATE-0021, WD-IMPL-FACT-0015
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-157,WD-IDEA-UX-158,WD-IDEA-UX-159

### WD-IMPL-CAP-0002 Sign in with email and password
- Behavior: Login mode of the auth page calls signInWithPassword; success sets user and session and redirects to /dashboard, failure shows the Supabase error message in an alert.
- Trigger / entrypoint: /auth login mode (default)
- Preconditions: Valid email and password min 6
- Code path: AuthForm.onSubmit -> useAuthStore.signIn -> supabase.auth.signInWithPassword
- Data touched: Supabase auth (external); localStorage auth-storage (user, session)
- Downstream effects: ProtectedRoute and services now see user and token
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/auth/AuthForm.tsx:44-55,122-126; src/lib/stores/auth-store.ts:51-72
- Notes: No password reset, magic link, OAuth or email verification UI exists in slice.
- Related: WD-IMPL-CAP-0005
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-157,WD-IDEA-UX-158,WD-IDEA-UX-159

### WD-IMPL-CAP-0003 Toggle login and signup mode
- Behavior: Link button on the auth form switches between Sign In and Create Account and clears any error.
- Trigger / entrypoint: /auth Don't have an account? link
- Preconditions: Form not submitting
- Code path: AuthForm.toggleMode -> onModeChange -> Auth.setMode
- Data touched: none (React state)
- Downstream effects: Chooses signIn or signUp on submit
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/auth/AuthForm.tsx:57-61,137-150
- Notes: Mode is React state in Auth.tsx, lost on reload.
- Related: WD-IMPL-CAP-0001, WD-IMPL-CAP-0002
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-157,WD-IDEA-UX-158,WD-IDEA-UX-159

### WD-IMPL-CAP-0004 Sign out
- Behavior: Sign Out in the global sidebar (shown only when a user exists) calls supabase signOut, clears store user and session, and navigates to /auth.
- Trigger / entrypoint: GlobalSidebar Sign Out button
- Preconditions: user is set
- Code path: GlobalSidebar.handleSignOut -> useAuthStore.signOut -> supabase.auth.signOut -> navigate /auth
- Data touched: Supabase session; localStorage auth-storage
- Downstream effects: ProtectedRoute redirects to /auth on protected pages
- Status: P=Y R=Y F=P P=Y T=N | labels: PARTIAL
- Evidence: src/components/layout/GlobalSidebar.tsx:39-42,106-112; src/lib/stores/auth-store.ts:74-82
- Notes: React Query cache and project_* localStorage keys (stage, sceneId, reachedPhaseB) are not cleared on sign out.
- Related: WD-IMPL-FACT-0014
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-149,WD-IDEA-UX-150,WD-IDEA-UX-151

### WD-IMPL-CAP-0005 Auto-redirect logged-in users from root and auth
- Behavior: Visiting / or /auth while authenticated redirects to /dashboard; unauthenticated visitors see the landing page at /.
- Trigger / entrypoint: GET /
- Preconditions: auth store initialized
- Code path: LandingOrDashboard / Auth -> Navigate
- Data touched: auth store
- Downstream effects: /dashboard
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/App.tsx:33-49,136; src/pages/Auth.tsx:14-17
- Notes: /landing always renders the landing page regardless of auth.
- Related: WD-IMPL-STATE-0022
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-157,WD-IDEA-UX-158,WD-IDEA-UX-159

### WD-IMPL-CAP-0006 Route protection for authenticated pages
- Behavior: ProtectedRoute wraps /dashboard, /projects/:projectId, /style-capsules and /assets; unauthenticated users are redirected to /auth without a usable return path.
- Trigger / entrypoint: Any protected URL
- Preconditions: initialized and no user
- Code path: ProtectedRoute -> Navigate /auth state.from
- Data touched: none
- Downstream effects: Auth page
- Status: P=Y R=Y F=P P=N T=N | labels: PARTIAL
- Evidence: src/components/auth/ProtectedRoute.tsx:9-33; src/App.tsx:93-130
- Notes: Redirect state.from is set but nothing reads location.state, so post-login always goes to /dashboard. Protection is client-side only; backend enforces auth separately.
- Related: WD-IMPL-FACT-0009
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-157,WD-IDEA-UX-158,WD-IDEA-UX-159

### WD-IMPL-CAP-0007 Public landing page
- Behavior: Static marketing page at / (when logged out) and /landing listing a 12-stage pipeline, capabilities, workflow and a $6.66/month pricing block.
- Trigger / entrypoint: / logged out, /landing
- Preconditions: none
- Code path: Landing component (static)
- Data touched: none
- Downstream effects: CTAs navigate to /auth
- Status: P=Y R=Y F=Y P=N T=N | labels: MOCK-ONLY
- Evidence: src/pages/Landing.tsx:13-43,93-536; src/components/landing/MediaSlot.tsx:35-90
- Notes: All media slots are placeholders (no src). Pricing, trial, multi-provider and git-branching claims have no backing in code or dependencies.
- Related: WD-IMPL-FACT-0013
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-157,WD-IDEA-UX-158,WD-IDEA-UX-159 || NOT_IMPLEMENTED: WD-IDEA-PHIL-042

### WD-IMPL-CAP-0008 Landing theme toggle and smooth scroll
- Behavior: Landing has its own dark/light palette toggle persisted in localStorage landing-theme and scroll-to-section buttons for Process and Pricing.
- Trigger / entrypoint: Landing nav theme dot
- Preconditions: none
- Code path: Landing.toggleTheme -> localStorage.setItem
- Data touched: localStorage landing-theme
- Downstream effects: palette CSS variables
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/pages/Landing.tsx:96-114,150-160
- Notes: Separate from the app-wide next-themes provider.
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-357

### WD-IMPL-CAP-0009 List projects on dashboard
- Behavior: Dashboard loads the user's projects via GET /api/projects and renders a card grid ordered by most recent update.
- Trigger / entrypoint: /dashboard
- Preconditions: authenticated
- Code path: Dashboard.loadProjects -> projectService.listProjects -> GET /api/projects -> projectsRouter.get('/')
- Data touched: projects, branches (embed), stage_states, scenes
- Downstream effects: ProjectCard grid
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/pages/Dashboard.tsx:27-49,104-139; src/lib/services/projectService.ts:103-124; backend/src/routes/projects.ts:259-467
- Notes: Each card shows branch chip from the embed; list code also computes stage and scene summaries.
- Related: WD-IMPL-ROUTE-0001, WD-IMPL-STATE-0022
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-327,WD-IDEA-UX-328,WD-IDEA-UX-329,WD-IDEA-UX-330,WD-IDEA-UX-331,WD-IDEA-UX-332,WD-IDEA-UX-334,WD-IDEA-UX-335,WD-IDEA-UX-336,WD-IDEA-UX-338,WD-IDEA-UX-339,WD-IDEA-UX-340,+2 || PARTIAL_MATCH: WD-IDEA-INPUT-001,WD-IDEA-INPUT-002,WD-IDEA-INPUT-003

### WD-IMPL-CAP-0010 Search projects on dashboard
- Behavior: Search box filters loaded projects client-side by title or description substring, case-insensitive.
- Trigger / entrypoint: /dashboard search input
- Preconditions: projects loaded
- Code path: Dashboard.filteredProjects
- Data touched: none
- Downstream effects: project grid
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/pages/Dashboard.tsx:58-61,86-91
- Notes: Search is not sent to the server.
- Related product intent: NOT_IMPLEMENTED: WD-IDEA-UX-312,WD-IDEA-UX-313,WD-IDEA-UX-314,WD-IDEA-UX-318,WD-IDEA-UX-324,WD-IDEA-UX-325 || PARTIAL_MATCH: WD-IDEA-UX-327,WD-IDEA-UX-328,WD-IDEA-UX-329,WD-IDEA-UX-330,WD-IDEA-UX-331,WD-IDEA-UX-332,WD-IDEA-UX-334,WD-IDEA-UX-335,WD-IDEA-UX-336,WD-IDEA-UX-338,WD-IDEA-UX-339,WD-IDEA-UX-340,+2 || PARTIAL_MATCH: WD-IDEA-INPUT-001,WD-IDEA-INPUT-002,WD-IDEA-INPUT-003

### WD-IMPL-CAP-0011 Inert dashboard Filter and Sort buttons
- Behavior: Filter and Sort icon buttons on the dashboard render but have no click handler.
- Trigger / entrypoint: /dashboard header buttons
- Preconditions: none
- Code path: none (no onClick)
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=N P=N T=N | labels: MOCK-ONLY
- Evidence: src/pages/Dashboard.tsx:93-98
- Notes: No sort or filter behavior exists; list order is server updated_at desc.
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-327,WD-IDEA-UX-328,WD-IDEA-UX-329,WD-IDEA-UX-330,WD-IDEA-UX-331,WD-IDEA-UX-332,WD-IDEA-UX-334,WD-IDEA-UX-335,WD-IDEA-UX-336,WD-IDEA-UX-338,WD-IDEA-UX-339,WD-IDEA-UX-340,+2 || PARTIAL_MATCH: WD-IDEA-INPUT-001,WD-IDEA-INPUT-002,WD-IDEA-INPUT-003

### WD-IMPL-CAP-0012 Dashboard load error and retry
- Behavior: If the project list fails, the dashboard shows the error text, a Try Again button and a destructive toast.
- Trigger / entrypoint: /dashboard load failure
- Preconditions: GET /api/projects non-2xx or throws
- Code path: Dashboard.loadProjects catch -> setError
- Data touched: none
- Downstream effects: Try Again re-runs loadProjects
- Status: P=Y R=U F=Y P=N T=N
- Evidence: src/pages/Dashboard.tsx:32-49,111-117
- Notes: Reachable only under API failure; runtime not exercised.

### WD-IMPL-CAP-0013 Create project from dashboard (title only)
- Behavior: NewProjectCard opens a dialog asking only for a title; submit POSTs /api/projects, shows a success toast and navigates to /projects/:id.
- Trigger / entrypoint: /dashboard New Project card
- Preconditions: Trimmed title non-empty; authenticated
- Code path: NewProjectDialog.handleSubmit -> projectService.createProject -> POST /api/projects -> projectsRouter.post('/') -> insert projects (DB trigger creates Main branch)
- Data touched: projects, branches (trigger)
- Downstream effects: ProjectView stage 1 for new id
- Status: P=Y R=Y F=Y P=Y T=Y
- Evidence: src/components/dashboard/NewProjectCard.tsx:8-37; src/components/dashboard/NewProjectDialog.tsx:17-58; src/pages/Dashboard.tsx:51-56,120-147; src/lib/services/projectService.ts:23-45; backend/src/routes/projects.ts:553-637; backend/migrations/001_initial_schema.sql:162-180; src/lib/services/__tests__/projectService.test.ts
- Notes: Only the service call shape is tested (projectService.test.ts createProject cases); the route is untested. Backend defaults project_type narrative, content_rating PG, target 180-300 s. The App.tsx handleNewProject TODO is not on this path.
- Related: WD-IMPL-STATE-0012, WD-IMPL-FACT-0003, WD-IMPL-FACT-0010
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-327,WD-IDEA-UX-328,WD-IDEA-UX-329,WD-IDEA-UX-330,WD-IDEA-UX-331,WD-IDEA-UX-332,WD-IDEA-UX-334,WD-IDEA-UX-335,WD-IDEA-UX-336,WD-IDEA-UX-338,WD-IDEA-UX-339,WD-IDEA-UX-340,+2 || PARTIAL_MATCH: WD-IDEA-INPUT-001,WD-IDEA-INPUT-002,WD-IDEA-INPUT-003

### WD-IMPL-CAP-0014 Open project from dashboard card
- Behavior: Clicking a project card navigates to /projects/:id, unless a delete dialog is open.
- Trigger / entrypoint: ProjectCard click
- Preconditions: no delete dialog open
- Code path: ProjectCard onClick -> Dashboard onProjectSelect -> navigate
- Data touched: none
- Downstream effects: ProjectView
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/dashboard/ProjectCard.tsx:62-70; src/App.tsx:55-57
- Related: WD-IMPL-CAP-0022

### WD-IMPL-CAP-0015 Delete project from dashboard card
- Behavior: Hover trash icon opens a confirm dialog; confirm calls DELETE /api/projects/:id, toasts success and reloads the list.
- Trigger / entrypoint: ProjectCard trash icon -> Delete Project
- Preconditions: owner of project
- Code path: ProjectCard.handleDelete -> projectService.deleteProject -> DELETE /api/projects/:id -> projects.delete()
- Data touched: projects and cascaded children
- Downstream effects: Dashboard reload
- Status: P=Y R=Y F=Y P=Y T=Y
- Evidence: src/components/dashboard/ProjectCard.tsx:40-60,74-92,181-210; backend/src/routes/projects.ts:3961-4004; src/lib/services/__tests__/projectService.test.ts
- Notes: Dialog text warns scripts and generated content are removed. Storage object cleanup is not in route (UNKNOWN). Route untested.
- Related: WD-IMPL-STATE-0014
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-327,WD-IDEA-UX-328,WD-IDEA-UX-329,WD-IDEA-UX-330,WD-IDEA-UX-331,WD-IDEA-UX-332,WD-IDEA-UX-334,WD-IDEA-UX-335,WD-IDEA-UX-336,WD-IDEA-UX-338,WD-IDEA-UX-339,WD-IDEA-UX-340,+2

### WD-IMPL-CAP-0016 Project card progress summary
- Behavior: Card shows Stage N of 5 dots before production, or Narrative and Style Set with scene count and current scene status once scenes exist.
- Trigger / entrypoint: Dashboard card body
- Preconditions: project in list
- Code path: ProjectCard render from listProjects payload
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=P P=N T=N | labels: PARTIAL
- Evidence: src/components/dashboard/ProjectCard.tsx:37-38,121-164; backend/src/routes/projects.ts:369-430
- Notes: Card shows 'Stage N of stages.length' where stages length is 5 from the API. Skipped stages render as pending on the server, so dots disagree with the ProjectView derivation.
- Related: WD-IMPL-FACT-0007, WD-IMPL-DEAD-0006
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-UX-333,WD-IDEA-UX-337 || PARTIAL_MATCH: WD-IDEA-UX-327,WD-IDEA-UX-328,WD-IDEA-UX-329,WD-IDEA-UX-330,WD-IDEA-UX-331,WD-IDEA-UX-332,WD-IDEA-UX-334,WD-IDEA-UX-335,WD-IDEA-UX-336,WD-IDEA-UX-338,WD-IDEA-UX-339,WD-IDEA-UX-340,+2 || PARTIAL_MATCH: WD-IDEA-INPUT-001,WD-IDEA-INPUT-002,WD-IDEA-INPUT-003

### WD-IMPL-CAP-0017 Sidebar navigation between top-level pages
- Behavior: Global sidebar buttons go to /dashboard (Projects), /style-capsules and /assets with active highlighting by pathname.
- Trigger / entrypoint: Sidebar nav buttons
- Preconditions: authenticated shell
- Code path: GlobalSidebar.navigate(href)
- Data touched: none
- Downstream effects: route element
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/layout/GlobalSidebar.tsx:23-27,76-102
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-149,WD-IDEA-UX-150,WD-IDEA-UX-151

### WD-IMPL-CAP-0018 Collapse and expand sidebar
- Behavior: Collapse button toggles the sidebar between 280px labelled and 72px icon-only; state is local and not persisted.
- Trigger / entrypoint: Sidebar Collapse button
- Preconditions: none
- Code path: setCollapsed
- Data touched: React state
- Downstream effects: layout width
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/layout/GlobalSidebar.tsx:34,47,128-140
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-149,WD-IDEA-UX-150,WD-IDEA-UX-151

### WD-IMPL-CAP-0019 Project header back button
- Behavior: Back arrow in the project header calls onBack if supplied, otherwise window.history.back(); in Phase B scene view it exits to the Script Hub.
- Trigger / entrypoint: Project header arrow
- Preconditions: project view mounted
- Code path: ProjectHeader onBack -> history.back or handleExitScene
- Data touched: none
- Downstream effects: previous route or Script Hub
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/pages/ProjectView.tsx:772,856,878; src/components/pipeline/ProjectHeader.tsx:31-39
- Notes: ProjectView is always rendered without onBack via App.tsx route, so history.back is the active path.
- Related: WD-IMPL-CAP-0030
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-137,WD-IDEA-UX-140,WD-IDEA-UX-141,WD-IDEA-UX-142,WD-IDEA-UX-143 || PARTIAL_MATCH: WD-IDEA-UX-149,WD-IDEA-UX-150,WD-IDEA-UX-151

### WD-IMPL-CAP-0020 Artifact Vault, Story Timelines and New Branch buttons
- Behavior: Three header buttons show toast info Coming soon; they do no work.
- Trigger / entrypoint: Project header buttons
- Preconditions: project view
- Code path: toast.info stub
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=N P=N T=N | labels: MOCK-ONLY
- Evidence: src/pages/ProjectView.tsx:773-775,857-859,879-881; src/components/pipeline/ProjectHeader.tsx:58-88
- Notes: Branch creation is absent in the backend; only the trigger-made Main branch exists.
- Related: WD-IMPL-FACT-0016
- Related product intent: NOT_IMPLEMENTED: WD-IDEA-UX-077,WD-IDEA-UX-078,WD-IDEA-UX-082,WD-IDEA-UX-083,WD-IDEA-UX-085,WD-IDEA-UX-086,WD-IDEA-UX-087,WD-IDEA-UX-088,WD-IDEA-UX-089,WD-IDEA-UX-090,WD-IDEA-UX-091 || PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096 || NOT_IMPLEMENTED: WD-IDEA-CONT-240,WD-IDEA-CONT-241,WD-IDEA-CONT-242 || NOT_IMPLEMENTED: WD-IDEA-CONT-243,WD-IDEA-CONT-244 || PARTIAL_MATCH: WD-IDEA-FLOW-011,WD-IDEA-FLOW-012,WD-IDEA-FLOW-013,WD-IDEA-FLOW-014 || PARTIAL_MATCH: WD-IDEA-FLOW-027,WD-IDEA-FLOW-028 || NOT_IMPLEMENTED: WD-IDEA-FLOW-067,WD-IDEA-FLOW-068,WD-IDEA-FLOW-069,WD-IDEA-FLOW-070

### WD-IMPL-CAP-0021 Phase A timeline navigation
- Behavior: Clicking a Phase A stage node navigates to it if its status is not pending (stages 1 to 5); stage clicks above 5 are allowed when already in Phase B.
- Trigger / entrypoint: PhaseTimeline stage node click
- Preconditions: status not pending
- Code path: PhaseTimeline onClick -> ProjectView.handleNavigate -> setCurrentStageWithPersistence
- Data touched: localStorage project_<id>_stage; URL stage param
- Downstream effects: Phase A stage component
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/PhaseTimeline.tsx:40-55; src/pages/ProjectView.tsx:505-513,884-890
- Notes: Connector colours follow position index, not status.
- Related: WD-IMPL-STATE-0018
- Related product intent: PARTIAL_MATCH: WD-IDEA-PHIL-001,WD-IDEA-PHIL-009 || EXACT_MATCH: WD-IDEA-FLOW-001,WD-IDEA-FLOW-002,WD-IDEA-FLOW-004,WD-IDEA-FLOW-006

### WD-IMPL-CAP-0022 Restore last stage on reload
- Behavior: Reloading a project returns to the stage in the URL query, else the stage in localStorage, then validated against stage_states hydration.
- Trigger / entrypoint: /projects/:id with or without ?stage
- Preconditions: projectId not new
- Code path: ProjectView restore effect -> hydrate effect -> navigation guard
- Data touched: localStorage project_<id>_stage and _sceneId; URL params
- Downstream effects: stage component render
- Status: P=Y R=Y F=P P=Y T=N | labels: PARTIAL
- Evidence: src/pages/ProjectView.tsx:152-175,236-308,311-363
- Notes: Restore validation does not run when a project has zero stage_states rows, and URL Phase B stages are not validated. restoreStage() helper is unused (DEAD).
- Related: WD-IMPL-STATE-0017, WD-IMPL-STATE-0018, WD-IMPL-INVALIDATE-0009

### WD-IMPL-CAP-0023 Project configuration saved from Stage 1
- Behavior: Stage 1 Proceed saves project type, rating, genres, tonal precision, length and aspect ratio via PUT /api/projects/:id, then saves a draft stage 1 row and completes stage 1.
- Trigger / entrypoint: Stage 1 Proceed button
- Preconditions: canProceed (mode, type, tonal >=10 chars, input)
- Code path: Stage1InputMode.handleComplete -> projectService.updateProject -> PUT /api/projects/:id; stageStateService.saveStageState(1, draft) -> PUT stages/1
- Data touched: projects config columns; stage_states v+1 draft
- Downstream effects: onComplete -> handleStageComplete(1)
- Status: P=Y R=Y F=P P=Y T=N | labels: PARTIAL
- Evidence: src/components/pipeline/Stage1InputMode.tsx:180-298; src/lib/services/projectService.ts:50-72; backend/src/routes/projects.ts:640-807
- Notes: Selecting Video for Audio sends audio-visual, rejected by backend (audio_visual only), and the error is only logged. Config is the only way a project's rating, genre, length or aspect ratio changes; there is no rename or settings UI.
- Related: WD-IMPL-FACT-0006, WD-IMPL-STATE-0013
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-005,WD-IDEA-INPUT-006,WD-IDEA-INPUT-007,WD-IDEA-INPUT-010 || PARTIAL_MATCH: WD-IDEA-INPUT-011,WD-IDEA-INPUT-012,WD-IDEA-INPUT-013,WD-IDEA-INPUT-014,WD-IDEA-INPUT-015

### WD-IMPL-CAP-0024 Lock and advance a Phase A stage
- Behavior: A Phase A stage's lock action calls POST /stages/:n/lock, marks it locked, activates n+1 and navigates there; stage 5 navigates to Script Hub (6).
- Trigger / entrypoint: Stage component lock action -> onComplete
- Preconditions: previous stage locked or skipped (backend enforced)
- Code path: stage onComplete -> ProjectView.handleStageComplete -> stageStateService.lockStage -> POST /api/projects/:id/stages/:n/lock -> stageStates lock route -> insert stage_states
- Data touched: stage_states
- Downstream effects: derivePhaseAStages on next hydrate
- Status: P=Y R=Y F=Y P=Y T=P | labels: DUPLICATED
- Evidence: src/pages/ProjectView.tsx:446-476; backend/src/routes/stageStates.ts:297-412; src/components/pipeline/Stage4MasterScript.tsx:616-621; src/components/pipeline/Stage5Assets.tsx:778-782; backend/src/tests/streamlineSkip.test.ts:119-150
- Notes: Stages 4 and 5 lock themselves before calling onComplete, so two locked versions are written. Backend lock route tested only for the predecessor check (streamlineSkip.test.ts).
- Related: WD-IMPL-STATE-0002, WD-IMPL-FACT-0004
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-002,WD-IDEA-UX-003,WD-IDEA-UX-018,WD-IDEA-UX-019,WD-IDEA-UX-020,WD-IDEA-UX-021,WD-IDEA-UX-022,WD-IDEA-UX-025 || PARTIAL_MATCH: WD-IDEA-PHIL-001,WD-IDEA-PHIL-009 || PARTIAL_MATCH: WD-IDEA-FLOW-015,WD-IDEA-FLOW-017,WD-IDEA-FLOW-018,WD-IDEA-FLOW-019

### WD-IMPL-CAP-0025 Next button on a locked Phase A stage
- Behavior: Locked or outdated Phase A stages show a Next button that moves forward without locking.
- Trigger / entrypoint: LockedStageHeader Next
- Preconditions: status locked or outdated
- Code path: handlePhaseANext -> setCurrentStageWithPersistence
- Data touched: URL and localStorage stage
- Downstream effects: next stage view
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/pages/ProjectView.tsx:750-756; src/components/pipeline/LockedStageHeader.tsx:90-95,124-129
- Notes: Stage 5 Next leads to stage 6.
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-002,WD-IDEA-UX-003,WD-IDEA-UX-018,WD-IDEA-UX-019,WD-IDEA-UX-020,WD-IDEA-UX-021,WD-IDEA-UX-022,WD-IDEA-UX-025 || PARTIAL_MATCH: WD-IDEA-UX-137,WD-IDEA-UX-140,WD-IDEA-UX-141,WD-IDEA-UX-142,WD-IDEA-UX-143

### WD-IMPL-CAP-0026 Edit or Unlock and Edit a locked Phase A stage
- Behavior: Unlock action on a locked stage calls unlockStage(confirm=false); because the 409 body is read at the wrong key the dialog never opens, and the code immediately confirms, setting the stage active and cascading locked downstream stages to outdated.
- Trigger / entrypoint: LockedStageHeader Unlock and Edit or Edit button on Phase A stages 1 to 5
- Preconditions: stage status locked (outdated rejected by backend)
- Code path: LockedStageHeader.onUnlockAndEdit -> ProjectView.handlePhaseAUnlock -> stageStateService.unlockStage(false) -> then handleConfirmPhaseAUnlock -> unlockStage(true) -> stage_states draft version and outdated versions
- Data touched: stage_states (draft and outdated rows)
- Downstream effects: stage set active; downstream outdated in local state
- Status: P=Y R=Y F=P P=Y T=N | labels: CONTRADICTED, DEAD
- Evidence: src/pages/ProjectView.tsx:691-747; src/lib/services/stageStateService.ts:172-199; backend/src/routes/stageStates.ts:523-607
- Notes: Frontend tests result.downstreamStages (top level) but backend nests it under details. Outdated Phase A stage Edit returns 400 'Stage is not locked or skipped' and shows Failed to unlock stage. Confirmed by code reading only.
- Related: WD-IMPL-STATE-0004, WD-IMPL-STATE-0005, WD-IMPL-INVALIDATE-0005, WD-IMPL-FACT-0005
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-002,WD-IDEA-UX-003,WD-IDEA-UX-018,WD-IDEA-UX-019,WD-IDEA-UX-020,WD-IDEA-UX-021,WD-IDEA-UX-022,WD-IDEA-UX-025 || CONTRADICTED_BY_CODE: WD-IDEA-UX-037 || PARTIAL_MATCH: WD-IDEA-UX-026,WD-IDEA-UX-027,WD-IDEA-UX-028,WD-IDEA-UX-029,WD-IDEA-UX-035,WD-IDEA-UX-038,WD-IDEA-UX-040 || PARTIAL_MATCH: WD-IDEA-FLOW-060,WD-IDEA-FLOW-062,WD-IDEA-FLOW-063

### WD-IMPL-CAP-0027 Write this myself on a skipped stage
- Behavior: Skipped stage 2, 3 or 4 offers Write this myself, which unlocks it to draft via unlock(confirm=true), activating the stage with no content.
- Trigger / entrypoint: SkippedStagePlaceholder Write this myself
- Preconditions: stage status skipped
- Code path: handleWriteMyself -> stageStateService.unlockStage(confirm=true) -> POST unlock route
- Data touched: stage_states draft version and downstream outdated versions
- Downstream effects: stage active, editable
- Status: P=Y R=Y F=P P=Y T=Y | labels: PARTIAL
- Evidence: src/pages/ProjectView.tsx:649-669,924-931; src/components/pipeline/SkippedStagePlaceholder.tsx:22-70; src/components/pipeline/__tests__/SkippedStagePlaceholder.test.tsx; backend/src/routes/stageStates.ts:523-667
- Notes: Backend unlock also cascades locked downstream stages to outdated, which the UI comment does not mention and local state does not reflect until reload. Placeholder component tested; the handler is not.
- Related: WD-IMPL-STATE-0005, WD-IMPL-INVALIDATE-0005

### WD-IMPL-CAP-0028 Generate this now from script on a skipped stage
- Behavior: For skipped stages 2 and 3 a Generate this now button backfills the stage from the locked script via the streamline backfill endpoint and marks it locked with origin ai-generated.
- Trigger / entrypoint: Skipped stage 2 or 3 Generate this now
- Preconditions: stage skipped, locked script exists
- Code path: handleGenerateFromScript -> streamlineService.backfillStage -> POST /api/projects/:id/streamline/backfill/:n (cross-slice)
- Data touched: stage_states (cross-slice)
- Downstream effects: stage locked with origin ai-generated
- Status: P=Y R=Y F=U P=Y T=N | labels: UNKNOWN
- Evidence: src/pages/ProjectView.tsx:671-688; src/components/pipeline/SkippedStagePlaceholder.tsx:55-60; src/pages/ProjectView.tsx:925-928
- Notes: Backfill route and service are cross-slice (streamline). Local state is set without re-fetching; whether the server write succeeded is only known via the response.
- Related: WD-IMPL-FACT-0017
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-086,WD-IDEA-FLOW-088,WD-IDEA-FLOW-089

### WD-IMPL-CAP-0029 Streamline commit refresh of the pipeline
- Behavior: After a Streamline commit, the shell re-fetches stage_states, re-derives Phase A and navigates to the target stage with a success toast.
- Trigger / entrypoint: Stage 1 Streamline commit completion
- Preconditions: Streamline commit succeeded
- Code path: handleStreamlineComplete -> stageStateService.getStageStates -> derivePhaseAStages
- Data touched: none written by shell
- Downstream effects: stage render
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/pages/ProjectView.tsx:487-503; src/components/pipeline/Stage1InputMode.tsx:1-30 (onStreamlineComplete prop)
- Notes: Streamline commit itself is cross-slice.
- Related: WD-IMPL-STATE-0017
- Related product intent: EXACT_MATCH: WD-IDEA-PHIL-067 || PARTIAL_MATCH: WD-IDEA-FLOW-011,WD-IDEA-FLOW-012,WD-IDEA-FLOW-013,WD-IDEA-FLOW-014

### WD-IMPL-CAP-0030 Return to Script Hub from Phase A
- Behavior: A Script Hub button appears on the timeline once the user has ever reached Phase B, and returns to stage 6.
- Trigger / entrypoint: Script Hub button in PhaseTimeline
- Preconditions: localStorage project_<id>_reachedPhaseB true or currentStage > 5
- Code path: PhaseTimeline onReturnToPhaseB -> setCurrentStageWithPersistence(6)
- Data touched: localStorage
- Downstream effects: Stage6ScriptHub render
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/PhaseTimeline.tsx:105-116; src/pages/ProjectView.tsx:202-221,884-890
- Notes: hasReachedPhaseB is localStorage-backed per project.
- Related: WD-IMPL-STATE-0019
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-137,WD-IDEA-UX-140,WD-IDEA-UX-141,WD-IDEA-UX-142,WD-IDEA-UX-143

### WD-IMPL-CAP-0031 Enter Script Hub after Stage 5
- Behavior: Completing Stage 5 (lock) moves the project to the Script Hub with a success toast; Script Hub lists the project's scenes.
- Trigger / entrypoint: Stage 5 lock or Next
- Preconditions: stage 5 locked
- Code path: handleStageComplete(5) -> setCurrentStageWithPersistence(6) -> Stage6ScriptHub
- Data touched: URL, localStorage
- Downstream effects: scene pipeline entry
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/pages/ProjectView.tsx:462-464,849-869; src/components/pipeline/Stage6ScriptHub.tsx:55-130
- Notes: Phase B is not gated: any user can reach stage 6 by URL.
- Related: WD-IMPL-CAP-0024
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-137,WD-IDEA-UX-140,WD-IDEA-UX-141,WD-IDEA-UX-142,WD-IDEA-UX-143 || PARTIAL_MATCH: WD-IDEA-UX-168,WD-IDEA-UX-169,WD-IDEA-UX-170 || EXACT_MATCH: WD-IDEA-FLOW-021,WD-IDEA-FLOW-022 || PARTIAL_MATCH: WD-IDEA-FLOW-032,WD-IDEA-FLOW-033,WD-IDEA-FLOW-034,WD-IDEA-FLOW-035,WD-IDEA-FLOW-036,WD-IDEA-FLOW-037

### WD-IMPL-CAP-0032 Enter a scene pipeline from the Script Hub
- Behavior: Enter Scene Pipeline opens the scene at its first unlocked stage (7 to 12), reading scene stage_locks.
- Trigger / entrypoint: Script Hub Enter Scene Pipeline
- Preconditions: scene not deferred
- Code path: Stage6ScriptHub.handleEnterPipeline -> ProjectView.handleEnterScene -> sceneStageLockService.getStageLocks -> GET stage-locks
- Data touched: scenes.stage_locks read; localStorage sceneId
- Downstream effects: scene stage component
- Status: P=Y R=Y F=Y P=Y T=Y
- Evidence: src/pages/ProjectView.tsx:515-551; src/components/pipeline/Stage6ScriptHub.tsx:147-151,432-438; backend/src/routes/sceneStageLocks.ts:18-52
- Notes: Button disabled for deferred scenes in UI only. Lock GET route is not in the test list; only continuity routes are tested for scenes.
- Related: WD-IMPL-STATE-0020
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-168,WD-IDEA-UX-169,WD-IDEA-UX-170 || EXACT_MATCH: WD-IDEA-FLOW-001,WD-IDEA-FLOW-002,WD-IDEA-FLOW-004,WD-IDEA-FLOW-006 || PARTIAL_MATCH: WD-IDEA-FLOW-032,WD-IDEA-FLOW-033,WD-IDEA-FLOW-034,WD-IDEA-FLOW-035,WD-IDEA-FLOW-036,WD-IDEA-FLOW-037 || PARTIAL_MATCH: WD-IDEA-FLOW-038,WD-IDEA-FLOW-039

### WD-IMPL-CAP-0033 Review rendered video from Script Hub
- Behavior: Review Video appears only when a scene's render status is complete and opens scene stage 12 directly.
- Trigger / entrypoint: Script Hub Review Video
- Preconditions: renderStatuses[scene] === complete
- Code path: handleReviewVideo -> handleEnterSceneAtStage(id,12)
- Data touched: scene stage locks read
- Downstream effects: Stage12VideoGeneration
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage6ScriptHub.tsx:132-138,422-431; src/pages/ProjectView.tsx:553-581
- Notes: Render status comes from cross-slice polling.
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-032,WD-IDEA-FLOW-033,WD-IDEA-FLOW-034,WD-IDEA-FLOW-035,WD-IDEA-FLOW-036,WD-IDEA-FLOW-037

### WD-IMPL-CAP-0034 Defer and restore a scene
- Behavior: Script Hub button toggles a scene's is_deferred flag; deferred scenes are dimmed and cannot be entered from the UI.
- Trigger / entrypoint: Script Hub Defer Scene or Restore Scene
- Preconditions: scene exists in active branch
- Code path: handleDeferScene -> sceneService.deferScene -> PUT /api/projects/:id/scenes/:sceneId/defer
- Data touched: scenes.is_deferred
- Downstream effects: scene list filter display
- Status: P=Y R=Y F=P P=Y T=N | labels: PARTIAL
- Evidence: src/components/pipeline/Stage6ScriptHub.tsx:154-181,402-437; backend/src/routes/projects.ts:1135-1214
- Notes: No backend route checks is_deferred; deferred scenes remain reachable by URL and by other scene routes. Routes untested.
- Related: WD-IMPL-STATE-0015, WD-IMPL-INVALIDATE-0012

### WD-IMPL-CAP-0035 Outdated scene warning on Script Hub
- Behavior: Clicking an outdated scene in the Script Hub opens a warning before entering.
- Trigger / entrypoint: Script Hub scene click
- Preconditions: scene.status === outdated
- Code path: handleSceneClick -> setShowOutdatedWarning
- Data touched: none
- Downstream effects: Enter Pipeline
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage6ScriptHub.tsx:140-152
- Notes: Keyed on scene.status outdated (a scene column), not on stage locks.
- Related: WD-IMPL-STATE-0016

### WD-IMPL-CAP-0036 Scene workflow sidebar navigation
- Behavior: Right-hand sidebar lists scene stages 7 to 12 (Shot List, Visuals, Prompts, Frames, Review, Video) with lock-state icons; reachable stages are enabled by sequential gating in UI.
- Trigger / entrypoint: Scene pipeline sidebar
- Preconditions: activeSceneId set and currentStage > 5
- Code path: SceneWorkflowSidebar.onStageSelect -> setSceneStage
- Data touched: none (local), URL not updated by sidebar
- Downstream effects: scene stage component
- Status: P=Y R=Y F=P P=N T=N | labels: PARTIAL
- Evidence: src/components/pipeline/SceneWorkflowSidebar.tsx:27-124; src/pages/ProjectView.tsx:836-842,634-641
- Notes: Gating is UI only; URL can open any scene stage. Missing lock key defaults to draft.
- Related: WD-IMPL-INVALIDATE-0013
- Related product intent: EXACT_MATCH: WD-IDEA-UX-138,WD-IDEA-UX-145 || NOT_IMPLEMENTED: WD-IDEA-UX-153 || EXACT_MATCH: WD-IDEA-FLOW-001,WD-IDEA-FLOW-002,WD-IDEA-FLOW-004,WD-IDEA-FLOW-006 || PARTIAL_MATCH: WD-IDEA-FLOW-038,WD-IDEA-FLOW-039

### WD-IMPL-CAP-0037 Scene stage complete and advance
- Behavior: Scene stage completion calls the scene lock endpoint best-effort, marks the stage completed locally, and advances to the next scene stage; at stage 12 it toasts Scene completed and exits.
- Trigger / entrypoint: Stage component complete action for stages 7 to 12
- Preconditions: none enforced by shell
- Code path: stage onComplete -> ProjectView.handleSceneStageComplete -> sceneStageLockService.lockStage -> POST stage-locks/:n/lock
- Data touched: scenes.stage_locks, scenes.updated_at, scenes.shot_list_locked_at for stage 7
- Downstream effects: persistStage next scene stage
- Status: P=Y R=Y F=P P=Y T=N | labels: DUPLICATED
- Evidence: src/pages/ProjectView.tsx:589-615; backend/src/routes/sceneStageLocks.ts:56-141; src/components/pipeline/Stage8VisualDefinition.tsx:171-172; src/components/pipeline/Stage9PromptSegmentation.tsx:962-963; src/components/pipeline/Stage10FrameGeneration.tsx:1695-1696
- Notes: Stage components already lock before calling onComplete, so the shell lock call re-stamps locked_at. A failed lock (predecessor not locked) is only logged and the UI still advances.
- Related: WD-IMPL-STATE-0006, WD-IMPL-INVALIDATE-0006
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-002,WD-IDEA-UX-003,WD-IDEA-UX-018,WD-IDEA-UX-019,WD-IDEA-UX-020,WD-IDEA-UX-021,WD-IDEA-UX-022,WD-IDEA-UX-025 || PARTIAL_MATCH: WD-IDEA-FLOW-038,WD-IDEA-FLOW-039

### WD-IMPL-CAP-0038 Scene stage Back and Next
- Behavior: Scene stage Back goes to the previous scene stage or exits to Script Hub from stage 7; Next advances a stage.
- Trigger / entrypoint: Stage component Back and Next props
- Preconditions: none
- Code path: handleSceneStageBack / handleSceneStageNext
- Data touched: Next persists URL and localStorage; Back does not
- Downstream effects: stage component
- Status: P=Y R=Y F=Y P=P T=N | labels: PARTIAL
- Evidence: src/pages/ProjectView.tsx:617-631
- Notes: Back does not persist the new stage to URL or localStorage, so reload returns to the previously saved stage.
- Related: WD-IMPL-STATE-0018
- Related product intent: UNKNOWN: WD-IDEA-PHIL-037

### WD-IMPL-CAP-0039 Exit scene back to Script Hub
- Behavior: Back to Scripts in the scene sidebar or the header back arrow clears the active scene and sets stage 6.
- Trigger / entrypoint: SceneWorkflowSidebar Scripts button
- Preconditions: active scene
- Code path: handleExitScene -> setCurrentStageWithPersistence(6)
- Data touched: URL, localStorage stage
- Downstream effects: Script Hub
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/pages/ProjectView.tsx:583-587,765-773,840
- Notes: Clears sceneId from URL but not from localStorage.
- Related: WD-IMPL-CAP-0019
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-137,WD-IDEA-UX-140,WD-IDEA-UX-141,WD-IDEA-UX-142,WD-IDEA-UX-143

### WD-IMPL-CAP-0040 Phase B unlock with downstream impact warning (scene stages)
- Behavior: Unlocking a locked scene stage 7 to 11 shows UnlockWarningDialog with counts of frames and videos and estimated cost, then confirms the unlock.
- Trigger / entrypoint: LockedStageHeader Unlock and Edit on scene stage
- Preconditions: scene stage locked
- Code path: stage onUnlockAndEdit -> useSceneStageLock.unlockStage(409 impact) -> confirmUnlock -> POST stage-locks/:n/unlock confirm true
- Data touched: scenes.stage_locks, scenes.shot_list_locked_at for stage 7
- Downstream effects: downstream locked stages become outdated
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/UnlockWarningDialog.tsx:37-116; src/lib/services/sceneStageLockService.ts:86-115; src/components/pipeline/Stage8VisualDefinition.tsx:152-165; backend/src/routes/sceneStageLocks.ts:145-286
- Notes: Dialog is wired in scene stage components (Stage 7 to 11), not in the shell. Cost figures are heuristic constants in the route (0.05 per frame, 2.50 per video). Stage 12 has no unlock.
- Related: WD-IMPL-STATE-0007, WD-IMPL-STATE-0008, WD-IMPL-INVALIDATE-0005
- Related product intent: EXACT_MATCH: WD-IDEA-UX-030,WD-IDEA-UX-032 || PARTIAL_MATCH: WD-IDEA-UX-026,WD-IDEA-UX-027,WD-IDEA-UX-028,WD-IDEA-UX-029,WD-IDEA-UX-035,WD-IDEA-UX-038,WD-IDEA-UX-040

### WD-IMPL-CAP-0041 Re-lock an outdated scene stage
- Behavior: Outdated scene stages 7 to 11 show a Re-lock button that locks them again without changes when the previous stage is locked.
- Trigger / entrypoint: LockedStageHeader Re-lock on scene stage
- Preconditions: stage status outdated; previous scene stage locked
- Code path: onRelock -> sceneStageLockService.relockStage -> POST stage-locks/:n/relock
- Data touched: scenes.stage_locks
- Downstream effects: stage status locked
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/LockedStageHeader.tsx:110-115; src/components/pipeline/Stage8VisualDefinition.tsx:768; backend/src/routes/sceneStageLocks.ts:290-375
- Notes: Phase A has no Re-lock control even though backend stage_states has no relock route.
- Related: WD-IMPL-INVALIDATE-0007
- Related product intent: EXACT_MATCH: WD-IDEA-UX-030,WD-IDEA-UX-032

### WD-IMPL-CAP-0042 Status badges on Phase A timeline
- Behavior: Timeline nodes show OUTDATED (with origin subtext), SKIPPED, IMPORTED and AUTO-FILLED badges derived from status and origin.
- Trigger / entrypoint: PhaseTimeline render
- Preconditions: origin set by Streamline paths
- Code path: getStageBadge(status, origin)
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=Y P=Y T=Y
- Evidence: src/lib/utils/stageBadge.ts:29-70; src/components/pipeline/PhaseTimeline.tsx:76-86; src/lib/utils/__tests__/stageBadge.test.ts
- Notes: Outdated rows created by unlock cascade have origin NULL, so subtext is usually absent. Badge test asserts precedence table.
- Related: WD-IMPL-ENTITY-0002
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-107,WD-IDEA-UX-108,WD-IDEA-UX-109,WD-IDEA-UX-110,WD-IDEA-UX-111

### WD-IMPL-CAP-0043 Stage info popover
- Behavior: Floating info button at bottom-right (appears after 400 ms) opens a popover with three tips for the current stage or the dashboard.
- Trigger / entrypoint: Floating info icon
- Preconditions: infoKey present in stageInfoContent
- Code path: StageInfoButton -> stageInfoContent[infoKey]
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/StageInfoButton.tsx:11-65; src/config/stageInfoContent.ts:1-111
- Notes: Some tip copy (branches, input modes) describes features not in this slice.
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-315,WD-IDEA-UX-317,WD-IDEA-UX-319,WD-IDEA-UX-320,WD-IDEA-UX-326

### WD-IMPL-CAP-0044 Phase A stage read-only locked view
- Behavior: Locked Phase A stages render a LOCKED-IN badge with Next and Unlock and Edit; outdated stages render OUTDATED with Edit and Next (no Re-lock in Phase A).
- Trigger / entrypoint: Phase A stage 1 to 5 header when locked or outdated
- Preconditions: stageStatus locked or outdated
- Code path: LockedStageHeader render
- Data touched: none
- Downstream effects: unlock or next
- Status: P=Y R=Y F=P P=N T=N | labels: PARTIAL
- Evidence: src/components/pipeline/LockedStageHeader.tsx:72-131; src/components/pipeline/Stage2Treatment.tsx:437-446
- Notes: Outdated Edit in Phase A always fails with 400 from backend (see CAP-26).
- Related: WD-IMPL-CAP-0026
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-002,WD-IDEA-UX-003,WD-IDEA-UX-018,WD-IDEA-UX-019,WD-IDEA-UX-020,WD-IDEA-UX-021,WD-IDEA-UX-022,WD-IDEA-UX-025 || PARTIAL_MATCH: WD-IDEA-UX-137,WD-IDEA-UX-140,WD-IDEA-UX-141,WD-IDEA-UX-142,WD-IDEA-UX-143 || UNKNOWN: WD-IDEA-UX-023,WD-IDEA-UX-024,WD-IDEA-UX-161,WD-IDEA-UX-163,WD-IDEA-UX-171,WD-IDEA-UX-172,WD-IDEA-UX-174,WD-IDEA-UX-177,WD-IDEA-UX-289 || PARTIAL_MATCH: WD-IDEA-UX-026,WD-IDEA-UX-027,WD-IDEA-UX-028,WD-IDEA-UX-029,WD-IDEA-UX-035,WD-IDEA-UX-038,WD-IDEA-UX-040 || PARTIAL_MATCH: WD-IDEA-INPUT-005,WD-IDEA-INPUT-006,WD-IDEA-INPUT-007,WD-IDEA-INPUT-010

### WD-IMPL-CAP-0045 Continuity mode read and write (API)
- Behavior: GET and PUT /api/projects/:id/continuity-mode read or set basic or advanced continuity mode stored on the project.
- Trigger / entrypoint: Stage 8 LocationCoveragePanel mode control
- Preconditions: authenticated owner
- Code path: locationContinuityService -> GET or PUT continuity-mode -> projects table
- Data touched: projects.continuity_mode
- Downstream effects: continuity metrics strictness
- Status: P=Y R=Y F=Y P=Y T=Y
- Evidence: backend/src/routes/projects.ts:809-860; src/lib/services/locationContinuityService.ts:111-145; src/components/pipeline/Stage8/LocationCoveragePanel.tsx:134-151; backend/src/tests/continuityBaseAndModeRoutes.test.ts:199-260
- Notes: Only Stage 8 location coverage panel invokes it (cross-slice). Route is tested.
- Related: WD-IMPL-STATE-0016, WD-IMPL-ROUTE-0002
- Related product intent: NOT_IMPLEMENTED: WD-IDEA-UX-265,WD-IDEA-UX-275 || PARTIAL_MATCH: WD-IDEA-LOC-018,WD-IDEA-LOC-019,WD-IDEA-LOC-022,WD-IDEA-LOC-023,WD-IDEA-LOC-025 || PARTIAL_MATCH: WD-IDEA-LOC-220,WD-IDEA-LOC-221,WD-IDEA-LOC-222,WD-IDEA-LOC-223,WD-IDEA-LOC-224,WD-IDEA-LOC-225,WD-IDEA-LOC-226,WD-IDEA-LOC-227,WD-IDEA-LOC-228,WD-IDEA-LOC-229

### WD-IMPL-CAP-0046 Continuity metrics summary (API)
- Behavior: GET /api/projects/:id/continuity-metrics returns counts of unresolved locations, direction gaps, fallback references and reuse rate, plus strict-mode issues, optionally filtered by scene.
- Trigger / entrypoint: Stage 8 and Stage 10 metrics panels
- Preconditions: authenticated owner
- Code path: locationContinuityService -> GET continuity-metrics -> shots and frames reads
- Data touched: scenes, shots, frames (read)
- Downstream effects: Stage 8 and Stage 10 UI
- Status: P=Y R=Y F=Y P=N T=Y
- Evidence: backend/src/routes/projects.ts:862-1010; src/lib/services/locationContinuityService.ts:160-170; backend/src/tests/continuityBaseAndModeRoutes.test.ts:261-345
- Notes: Read-only. Suggestions are three fixed strings.
- Related: WD-IMPL-ROUTE-0002
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-220,WD-IDEA-LOC-221,WD-IDEA-LOC-222,WD-IDEA-LOC-223,WD-IDEA-LOC-224,WD-IDEA-LOC-225,WD-IDEA-LOC-226,WD-IDEA-LOC-227,WD-IDEA-LOC-228,WD-IDEA-LOC-229 || PARTIAL_MATCH: WD-IDEA-CONT-229

### WD-IMPL-CAP-0047 Style capsule library page
- Behavior: Page at /style-capsules lists writing and visual style capsules with search, type and preset filters, favorite toggle, duplicate (presets), view or edit, delete (custom), and create dialogs.
- Trigger / entrypoint: /style-capsules
- Preconditions: authenticated
- Code path: StyleCapsuleLibrary -> styleCapsuleService (cross-slice)
- Data touched: style_capsules (cross-slice)
- Downstream effects: Stage 1 writingStyleCapsuleId
- Status: P=Y R=Y F=Y P=Y T=N | labels: PARTIAL
- Evidence: src/pages/StyleCapsuleLibrary.tsx:30-651; src/App.tsx:111-120
- Notes: Data path is cross-slice (/api/style-capsules). Favorite filter has no UI. After reset to all, empty-state copy wrongly says try filters and hides create.
- Related: WD-IMPL-CAP-0037

### WD-IMPL-CAP-0048 Asset library page
- Behavior: Page at /assets lists global assets with search, type tabs with counts, grid or list toggle, create, edit and delete.
- Trigger / entrypoint: /assets
- Preconditions: authenticated
- Code path: AssetLibrary -> assetService.listAssets (cross-slice)
- Data touched: global assets (cross-slice)
- Downstream effects: Stage 5 asset reuse (cross-slice)
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/pages/AssetLibrary.tsx:17-259; src/App.tsx:121-130
- Notes: Data path cross-slice (/api/assets). Assets are global, not project scoped.

### WD-IMPL-CAP-0049 Create project through Stage 1 at /projects/new
- Behavior: Typing /projects/new renders Stage 1 with projectId new; Proceed creates a project titled from the chosen mode, saves config and draft stage 1, then the stage 1 lock call fails with 404 because it targets the literal new id.
- Trigger / entrypoint: /projects/new (typed URL only)
- Preconditions: none
- Code path: Stage1InputMode.handleComplete -> projectService.createProject -> updateProject -> saveStageState -> onComplete -> ProjectView.handleStageComplete(1) -> lockStage('new') 404
- Data touched: projects (created), stage_states draft
- Downstream effects: none
- Status: P=Y R=U F=N P=P T=N | labels: PARTIAL, CONTRADICTED
- Evidence: src/pages/ProjectView.tsx:194-199,380-389,449,491-496; src/components/pipeline/Stage1InputMode.tsx:207-222,278-298,894-897; backend/src/routes/stageStates.ts:297-325
- Notes: Code-level finding: handleStageComplete calls stageStateService.lockStage(projectId,1) with projectId new, backend returns 404 Project not found, error toast shows. The created project remains with draft stage 1 and URL stays on /projects/new. No link to this path exists in UI.
- Related: WD-IMPL-FACT-0008

### WD-IMPL-CAP-0050 Landing Explore Stage buttons
- Behavior: Hover Explore Stage buttons on the landing pipeline list are visual only and not focusable.
- Trigger / entrypoint: Landing pipeline row hover
- Preconditions: none
- Code path: no onClick
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=N P=N T=N | labels: MOCK-ONLY
- Evidence: src/pages/Landing.tsx:337-343
- Related: WD-IMPL-CAP-0007

### WD-IMPL-CAP-0051 Not-found page
- Behavior: Any unmatched path shows a 404 page with a Return to Home link and logs the path to console.
- Trigger / entrypoint: Unknown path
- Preconditions: none
- Code path: route * -> NotFound
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/pages/NotFound.tsx:1-24; src/App.tsx:139
- Notes: Index.tsx NotFound-like fallback is not used.

### WD-IMPL-CAP-0052 Project header aspect ratio chip
- Behavior: Header shows the project aspect ratio read-only (set in Stage 1).
- Trigger / entrypoint: Project header
- Preconditions: project loaded
- Code path: ProjectView -> ProjectHeader aspectRatio
- Data touched: projects.aspect_ratio read
- Downstream effects: none
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/pages/ProjectView.tsx:106,185,771; src/components/pipeline/ProjectHeader.tsx:49-53
- Notes: Default 16:9 when absent. Branch chip shows fallback main text.
- Related: WD-IMPL-CAP-0023
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-011,WD-IDEA-INPUT-012,WD-IDEA-INPUT-013,WD-IDEA-INPUT-014,WD-IDEA-INPUT-015

## Style capsules and global asset library

### WD-IMPL-CAP-0053 Browse Style Capsule Library page
- Behavior: Logged-in user opens /style-capsules and sees all capsules they own plus all presets as cards split into Writing and Visual tabs. Load calls GET /api/style-capsules and GET /api/style-capsules/libraries/all in parallel. Card bodies render fields the list endpoint does not return, so they show only name and badges.
- Trigger / entrypoint: src/App.tsx:111-119 route /style-capsules; src/components/layout/GlobalSidebar.tsx:25
- Preconditions: authenticated session
- Code path: src/pages/StyleCapsuleLibrary.tsx:52-71 loadData -> src/lib/services/styleCapsuleService.ts getCapsules/getLibraries -> backend/src/routes/styleCapsules.ts:26-59 GET / and :484-551 GET /libraries/all
- Data touched: style_capsules, style_capsule_libraries
- Downstream effects: CAP-02, CAP-03
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/pages/StyleCapsuleLibrary.tsx:52-71; backend/src/routes/styleCapsules.ts:30-47; backend/src/routes/styleCapsules.ts:489-518
- Notes: List select omits style_labels, example_text_excerpts, design_pillars, reference_image_urls, descriptor_strings, free-form notes, so those card sections never render with data.
- Related: WD-IMPL-FACT-0022, WD-IMPL-FACT-0023
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-018

### WD-IMPL-CAP-0054 Search, type/preset filter, and sort capsules
- Behavior: Client-side name search plus Type (writing/visual) and Preset/Custom selects. Sort is favorites first, then custom, then presets, then name. Grid/list toggle changes column count only.
- Trigger / entrypoint: StyleCapsuleLibrary search input and selects
- Preconditions: CAP-01 loaded
- Code path: src/pages/StyleCapsuleLibrary.tsx:74-110,405-449
- Data touched: none (React state)
- Downstream effects: none
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/pages/StyleCapsuleLibrary.tsx:74-110
- Notes: isFavorite filter exists in state but has no control.
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-018

### WD-IMPL-CAP-0055 Open capsule detail or edit dialog
- Behavior: Clicking a card fetches the full capsule and opens an editor dialog. Presets open read-only with a Duplicate button. User capsules open editable with Save, Delete, and Cancel.
- Trigger / entrypoint: capsule card click, dropdown View Details or Edit
- Preconditions: none
- Code path: src/pages/StyleCapsuleLibrary.tsx:193-206,572-628 -> styleCapsuleService.getCapsule -> backend/src/routes/styleCapsules.ts:62-87 GET /:id (select * with user_id or is_preset filter)
- Data touched: style_capsules (read)
- Downstream effects: CAP-06, CAP-07, CAP-09
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: backend/src/routes/styleCapsules.ts:62-87; src/pages/StyleCapsuleLibrary.tsx:193-206
- Notes: Writing editor shows only name, excerpts, advanced toggle, labels, constraints, notes. Visual editor shows pillar dropdowns, images, descriptor.
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-017,WD-IDEA-ASSET-019

### WD-IMPL-CAP-0056 Create writing style capsule
- Behavior: User creates a Writing capsule with name, one or more example excerpts, optional labels, negative constraints, and notes. Backend inserts a row with user_id set, library_id null, and is_preset false.
- Trigger / entrypoint: Create Capsule dropdown then Writing Style, then Create Style Capsule button
- Preconditions: name required, excerpts non-empty after trimming
- Code path: src/components/styleCapsules/WritingStyleCapsuleEditor.tsx:128-169 -> styleCapsuleService.createCapsule -> backend/src/routes/styleCapsules.ts:90-158 POST /
- Data touched: style_capsules insert
- Downstream effects: CAP-13 selectable in Stage 1
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/styleCapsules.ts:90-158; src/components/styleCapsules/WritingStyleCapsuleEditor.tsx:128-169
- Notes: Backend requires only name and type, so an empty excerpts list is accepted by the API even though the UI blocks it.
- Related: WD-IMPL-ROUTE-0009
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-008,WD-IDEA-ASSET-009,WD-IDEA-ASSET-010

### WD-IMPL-CAP-0057 Create visual style capsule with pending reference images
- Behavior: User creates a Visual capsule with name, five design pillars (dropdowns), descriptor text, and up to 5 reference images. Images selected before save are held in memory and uploaded one by one after the capsule row is created.
- Trigger / entrypoint: Create Capsule then Visual Style, Create Visual Style Capsule button
- Preconditions: name required
- Code path: src/components/styleCapsules/VisualStyleCapsuleEditor.tsx:188-256 -> createCapsule -> POST / ; then per file styleCapsuleService.uploadImage -> backend/src/routes/styleCapsules.ts:355-426 POST /:id/upload-image
- Data touched: style_capsules insert and update, Supabase bucket style-capsule-images
- Downstream effects: CAP-19, CAP-20
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/styleCapsules/VisualStyleCapsuleEditor.tsx:218-242; backend/src/routes/styleCapsules.ts:355-426
- Notes: If an upload fails the capsule is still saved and the user gets a warning. Pillar values are not validated server-side. Preset-style pillar values can fall outside the dropdown option lists.
- Related: WD-IMPL-FACT-0024
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-008,WD-IDEA-ASSET-009,WD-IDEA-ASSET-010

### WD-IMPL-CAP-0058 Edit user style capsule
- Behavior: Owner edits name, excerpts, labels, constraints, notes (writing) or name, pillars, descriptor, and image list (visual). Backend rejects presets (403) and non-owners (403).
- Trigger / entrypoint: capsule card then edit dialog then Update Style Capsule
- Preconditions: capsule is not preset and user owns it
- Code path: src/components/styleCapsules/WritingStyleCapsuleEditor.tsx:146-150 and VisualStyleCapsuleEditor.tsx:207-209 -> styleCapsuleService.updateCapsule -> backend/src/routes/styleCapsules.ts:161-217 PUT /:id
- Data touched: style_capsules update
- Downstream effects: Changes future injections into LLM and image prompts with no versioning or invalidation (see V2-STATE-02)
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/styleCapsules.ts:161-217; src/components/styleCapsules/VisualStyleCapsuleEditor.tsx:198-209
- Notes: Visual edit PUTs referenceImageUrls from local state, overwriting the server array. Writing edit also sends freeformNotes undefined when blank, which the backend ignores.
- Related: WD-IMPL-STATE-0024
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-017,WD-IDEA-ASSET-019

### WD-IMPL-CAP-0059 Delete user style capsule
- Behavior: Owner deletes a custom capsule after an AlertDialog confirmation. Presets cannot be deleted. Storage files are not removed.
- Trigger / entrypoint: card dropdown Delete, or Delete Capsule in editor, then confirm
- Preconditions: non-preset and owned
- Code path: src/pages/StyleCapsuleLibrary.tsx:264-277,170-191 -> styleCapsuleService.deleteCapsule -> backend/src/routes/styleCapsules.ts:220-260 DELETE /:id
- Data touched: style_capsules delete
- Downstream effects: none
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: backend/src/routes/styleCapsules.ts:220-260; src/pages/StyleCapsuleLibrary.tsx:170-191
- Notes: Functional P because FK constraints from projects, image_generation_jobs, and style_capsule_applications have no ON DELETE action, so a used capsule likely fails with 500 at runtime (inferred from schema, runtime U).
- Related: WD-IMPL-FACT-0021
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-017,WD-IDEA-ASSET-019

### WD-IMPL-CAP-0060 Toggle favorite on a capsule
- Behavior: Heart button flips is_favorite on the capsule row. It works on presets too, and the flag is shared by every user because it is one column.
- Trigger / entrypoint: heart icon on capsule card (hover)
- Preconditions: capsule owned by user or preset
- Code path: src/pages/StyleCapsuleLibrary.tsx:130-146 -> styleCapsuleService.toggleFavorite -> backend/src/routes/styleCapsules.ts:263-299 POST /:id/favorite
- Data touched: style_capsules.is_favorite
- Downstream effects: Favorites group at top of StyleCapsuleSelector (CAP-13, CAP-15)
- Status: P=Y R=Y F=Y P=Y T=N | labels: DUPLICATED
- Evidence: backend/src/routes/styleCapsules.ts:263-299; src/components/styleCapsules/StyleCapsuleSelector.tsx:65-71
- Notes: Toggling a preset favorite changes it for all users. Backend StyleCapsuleService.toggleFavorite duplicates the route logic and is not called.
- Related: WD-IMPL-FACT-0025
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-017,WD-IDEA-ASSET-019

### WD-IMPL-CAP-0061 Duplicate a preset to customize
- Behavior: Duplicate creates a user-owned copy of a preset, named '<name> (Copy)' by default, with the same content and reference-image URLs. Only presets can be duplicated; user capsules are rejected with 404.
- Trigger / entrypoint: preset card dropdown Duplicate, or Duplicate to Customize in preset dialog
- Preconditions: capsule is_preset true
- Code path: src/pages/StyleCapsuleLibrary.tsx:148-168 -> styleCapsuleService.duplicateCapsule -> backend/src/routes/styleCapsules.ts:302-352 POST /:id/duplicate
- Data touched: style_capsules insert
- Downstream effects: CAP-03, CAP-04 style editing
- Status: P=Y R=Y F=Y P=Y T=N | labels: DUPLICATED
- Evidence: backend/src/routes/styleCapsules.ts:302-352; src/pages/StyleCapsuleLibrary.tsx:148-168
- Notes: Reference-image URLs are copied as strings, so the copy shares the preset's image files.
- Related: WD-IMPL-ENTITY-0006
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-017,WD-IDEA-ASSET-019

### WD-IMPL-CAP-0062 Upload reference image to existing visual capsule
- Behavior: In edit mode, selecting an image uploads it immediately to the capsule. The server stores it in bucket style-capsule-images and appends the public URL to reference_image_urls.
- Trigger / entrypoint: visual capsule edit dialog, ImageUploader
- Preconditions: visual type, owner, PNG/JPEG/WebP, 5MB, up to 5 per batch
- Code path: src/components/styleCapsules/ImageUploader.tsx:107-162 -> styleCapsuleService.uploadImage -> backend/src/routes/styleCapsules.ts:355-426
- Data touched: style_capsules.reference_image_urls, storage style-capsule-images
- Downstream effects: CAP-19, CAP-20
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/styleCapsules.ts:355-426; src/components/styleCapsules/ImageUploader.tsx:107-162
- Notes: No server-side cap on total images per capsule. Upload to a preset is refused by the type and owner checks, not by is_preset.
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-020

### WD-IMPL-CAP-0063 Remove reference image from visual capsule
- Behavior: Removing an image in edit mode deletes its URL from the array by index. The file in storage is kept.
- Trigger / entrypoint: hover X on uploaded image in visual editor
- Preconditions: capsule saved (has id)
- Code path: src/components/styleCapsules/VisualStyleCapsuleEditor.tsx:151-173 -> styleCapsuleService.removeImage -> backend/src/routes/styleCapsules.ts:429-482 DELETE /:id/images/:imageIndex
- Data touched: style_capsules.reference_image_urls
- Downstream effects: CAP-19, CAP-20
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: backend/src/routes/styleCapsules.ts:429-482
- Notes: Storage object is not deleted (TODO in code, styleCapsules.ts:474-475). Functional P for that reason.

### WD-IMPL-CAP-0064 Preview injection text in writing editor
- Behavior: Toggle in writing editor builds a client-side preview of the text the AI will see. The preview format differs from the backend formatter, so the preview is not an exact copy.
- Trigger / entrypoint: Show Preview button in writing editor
- Preconditions: none
- Code path: src/components/styleCapsules/WritingStyleCapsuleEditor.tsx:171-207
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=P P=N T=N
- Evidence: src/components/styleCapsules/WritingStyleCapsuleEditor.tsx:171-207; backend/src/services/styleCapsuleService.ts:330-361
- Notes: Preview always prints a Style characteristics line even when empty. Backend omits empty sections. Preview is not shown for visual capsules.
- Related: WD-IMPL-AI-0001
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-086,WD-IDEA-STORY-087,WD-IDEA-STORY-088,WD-IDEA-STORY-089,WD-IDEA-STORY-090,WD-IDEA-STORY-091,WD-IDEA-STORY-092

### WD-IMPL-CAP-0065 Select writing capsule in Stage 1
- Behavior: Stage 1 has an optional Writing Style selector. The chosen id is saved into Stage 1 stage state (content.writingStyleCapsuleId and processedInput.projectParams.writingStyleCapsuleId) when the user proceeds.
- Trigger / entrypoint: Stage 1 Writing Style (Optional) selector, then proceed button
- Preconditions: project exists or is being created
- Code path: src/components/pipeline/Stage1InputMode.tsx:873-889,183-281 -> inputProcessingService.processInput (inputProcessingService.ts:88-101) -> stageStateService.saveStageState(projectId,1)
- Data touched: stage_states(stage_number=1).content
- Downstream effects: CAP-14
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage1InputMode.tsx:873-889; src/components/pipeline/Stage1InputMode.tsx:267-281; src/lib/services/inputProcessingService.ts:88-101
- Notes: Stage 1 autosave is off, so the selection persists only on proceed. Behavior in the streamline intake path is UNKNOWN and belongs to V1.
- Related: V1 slice for Stage1 streamline path
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-006,WD-IDEA-ASSET-007 || PARTIAL_MATCH: WD-IDEA-INPUT-016,WD-IDEA-INPUT-017,WD-IDEA-INPUT-018 || PARTIAL_MATCH: WD-IDEA-STORY-086,WD-IDEA-STORY-087,WD-IDEA-STORY-088,WD-IDEA-STORY-089,WD-IDEA-STORY-090,WD-IDEA-STORY-091,WD-IDEA-STORY-092

### WD-IMPL-CAP-0066 Writing capsule text injected into Stage 2, 3, 4 LLM generation (automatic)
- Behavior: When Stage 2, 3, or 4 generates text, the backend resolves the Stage 1 writing capsule id and inserts its formatted text into the template placeholder writing_style_context. Injection happens in llm.ts after template validation.
- Trigger / entrypoint: Generate button in Stage 2 treatment, Stage 3 beats, Stage 4 script (and regenerate)
- Preconditions: Stage 1 content has writingStyleCapsuleId
- Code path: src/lib/services/treatmentService.ts:55-165, beatService.ts:55-150, scriptService.ts:79-167 -> POST /api/llm/generate-from-template -> backend/src/routes/llm.ts:139-263 -> ContextManager.assembleGlobalContext (contextManager.ts:102-202) -> styleCapsuleService.formatWritingStyleInjection (styleCapsuleService.ts:330-361) -> llmClient.generate
- Data touched: style_capsules (read), stage_states (read Stage 1), style_capsule_applications (via stageStates.ts later)
- Downstream effects: AI-01, metadata styleCapsuleMetadata to stage save (V2-FACT-10)
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/llm.ts:194-215; backend/src/services/contextManager.ts:127-141,465-489; backend/src/services/styleCapsuleService.ts:330-361
- Notes: Frontend sends an empty writing_style_context placeholder; the backend overwrites it. If project metadata is missing, llm.ts falls back to writing_style_capsule_id in variables (llm.ts:232-262).
- Related: WD-IMPL-AI-0001, WD-IMPL-AI-0002, WD-IMPL-AI-0003
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-008,WD-IDEA-ASSET-009,WD-IDEA-ASSET-010 || EXACT_MATCH: WD-IDEA-ASSET-006,WD-IDEA-ASSET-007 || PARTIAL_MATCH: WD-IDEA-INPUT-016,WD-IDEA-INPUT-017,WD-IDEA-INPUT-018 || PARTIAL_MATCH: WD-IDEA-STORY-086,WD-IDEA-STORY-087,WD-IDEA-STORY-088,WD-IDEA-STORY-089,WD-IDEA-STORY-090,WD-IDEA-STORY-091,WD-IDEA-STORY-092

### WD-IMPL-CAP-0067 Lock visual style capsule in Stage 5
- Behavior: In Stage 5 the user picks a visual capsule from the Style Capsule selector. Selecting it immediately locks the style into Stage 5 content and disables further changes until Change Style is used.
- Trigger / entrypoint: Stage 5 Select Visual Style, Style Capsule mode
- Preconditions: stage not locked or outdated
- Code path: src/components/pipeline/Stage5Assets.tsx:220-233,866-896 -> setContent locked_visual_style_capsule_id -> stage_states(stage_number=5).content (autoSave)
- Data touched: stage_states(stage_number=5).content
- Downstream effects: CAP-19, CAP-20, CAP-35 (V5 snapshot paths)
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage5Assets.tsx:220-233,866-896
- Notes: No confirmation step. Stage 5 canProceed requires isStyleLocked and images on all gate assets (Stage5Assets.tsx:218).
- Related: WD-IMPL-STATE-0023
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-011,WD-IDEA-ASSET-012 || PARTIAL_MATCH: WD-IDEA-ASSET-026,WD-IDEA-ASSET-029 || PARTIAL_MATCH: WD-IDEA-INPUT-016,WD-IDEA-INPUT-017,WD-IDEA-INPUT-018

### WD-IMPL-CAP-0068 Use manual visual tone instead of capsule (Stage 5)
- Behavior: Alternative to capsule: user picks a tone preset and optional custom text. Text is stored in Stage 5 content as manual_visual_tone and used in place of capsule text at image generation.
- Trigger / entrypoint: Stage 5 Manual Tone toggle, then Lock Visual Tone
- Preconditions: none
- Code path: src/components/pipeline/Stage5Assets.tsx:236-259,899-960 -> stage_states(stage_number=5).content.manual_visual_tone; backend reads it in projectAssets.ts, sceneAssets.ts, ImageGenerationService.ts:311-318
- Data touched: stage_states(stage_number=5).content
- Downstream effects: CAP-19
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage5Assets.tsx:236-259; backend/src/services/image-generation/ImageGenerationService.ts:311-318
- Notes: Manual tone and capsule are mutually exclusive in the Stage 5 lock. Assets that already hold a capsule id keep using it (see V2-STATE-01).
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-024 || PARTIAL_MATCH: WD-IDEA-INPUT-016,WD-IDEA-INPUT-017,WD-IDEA-INPUT-018

### WD-IMPL-CAP-0069 Change style: mark images as outdated
- Behavior: Change Style opens a warning. Choosing Mark Images as Outdated sets style_outdated=true on all branch assets that have images, unlocks Stage 5 style, and clears the stored style. Images remain.
- Trigger / entrypoint: Stage 5 Change Style button, then Mark Images as Outdated
- Preconditions: style locked and stage not locked or outdated
- Code path: src/components/pipeline/Stage5Assets.tsx:843-855,262-289,1464-1477 -> src/components/pipeline/StyleChangeWarningDialog.tsx:30-70 -> projectAssetService.markStyleOutdated -> backend/src/routes/projectAssets.ts:1587-1625 POST /:projectId/assets/mark-style-outdated
- Data touched: project_assets.style_outdated, stage_states(stage_number=5).content
- Downstream effects: Style Outdated badge (Stage5Assets.tsx:1153-1155); V2-STATE-01
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/projectAssets.ts:1587-1625; src/components/pipeline/Stage5Assets.tsx:262-289
- Notes: Dialog shows literal 'Style Capsule' as the current style name for capsule mode. Style outdated does not block Stage 5 completion. style_outdated is reset only on successful master-asset generation.
- Related: WD-IMPL-STATE-0023

### WD-IMPL-CAP-0070 Change style: clear all images
- Behavior: Clear All Images removes image_key_url from every branch asset that has one, resets style_outdated, and unlocks the Stage 5 style.
- Trigger / entrypoint: Change Style then Clear All Images
- Preconditions: same as CAP-17
- Code path: src/components/pipeline/Stage5Assets.tsx:291-312 -> projectAssetService.clearAllImages -> backend/src/routes/projectAssets.ts:1631-1665 POST /:projectId/assets/clear-all-images
- Data touched: project_assets.image_key_url, style_outdated; stage_states stage 5 content
- Downstream effects: Assets need regeneration
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/projectAssets.ts:1631-1665; src/components/pipeline/Stage5Assets.tsx:291-312
- Notes: Does not touch generation attempts, scene asset instances, angle variants, or location views by code inspection.
- Related: WD-IMPL-STATE-0023

### WD-IMPL-CAP-0071 Visual capsule text injected into image generation (automatic)
- Behavior: For image jobs with a capsule id, the backend loads descriptor_strings and design_pillars and joins them into one text string sent to the image model. Manual tone replaces capsule text when no capsule id is present.
- Trigger / entrypoint: any image job: Stage 5 generate, Stage 8 scene asset, transformation post, frame generation, global asset generate
- Preconditions: capsule id or manual tone on job
- Code path: backend/src/services/image-generation/ImageGenerationService.ts:307-317 -> getVisualStyleContext :639-689 -> NanoBananaClient.ts:69-103
- Data touched: style_capsules read, image_generation_jobs.visual_style_capsule_id
- Downstream effects: AI-10
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/services/image-generation/ImageGenerationService.ts:639-689; backend/src/services/image-generation/NanoBananaClient.ts:69-103
- Notes: Frame jobs do not receive the capsule because the caller query is broken (V2-FACT-02). Global asset jobs do receive it.
- Related: WD-IMPL-FACT-0026, WD-IMPL-FACT-0027
- Related product intent: PARTIAL_MATCH: WD-IDEA-GEN-047,WD-IDEA-GEN-048,WD-IDEA-GEN-049,WD-IDEA-GEN-050,WD-IDEA-GEN-051 || EXACT_MATCH: WD-IDEA-ASSET-006,WD-IDEA-ASSET-007 || PARTIAL_MATCH: WD-IDEA-ASSET-030,WD-IDEA-ASSET-031,WD-IDEA-ASSET-032 || PARTIAL_MATCH: WD-IDEA-ASSET-071 || PARTIAL_MATCH: WD-IDEA-ASSET-213

### WD-IMPL-CAP-0072 Visual capsule reference images sent to image model
- Behavior: Capsule reference image URLs are downloaded and sent to Gemini as inline image parts, after any identity reference images. Failed downloads are skipped with a log entry.
- Trigger / entrypoint: same as CAP-19
- Preconditions: capsule has reference_image_urls
- Code path: ImageGenerationService.ts:675-683 -> ImageGenerationService.ts:319-345 identity prepend -> NanoBananaClient.ts:37-56,122-130
- Data touched: style_capsules.reference_image_urls read
- Downstream effects: AI-10
- Status: P=Y R=Y F=P P=N T=N
- Evidence: backend/src/services/image-generation/ImageGenerationService.ts:675-683; backend/src/services/image-generation/NanoBananaClient.ts:37-56
- Notes: Capsule images are sent with no role field, which changes the prompt branch chosen by NanoBananaClient (V2-FACT-09). Functional P.
- Related: WD-IMPL-FACT-0027
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-006,WD-IDEA-ASSET-007 || PARTIAL_MATCH: WD-IDEA-ASSET-030,WD-IDEA-ASSET-031,WD-IDEA-ASSET-032

### WD-IMPL-CAP-0073 Visual capsule text into Stage 9 frame, end-frame, and continuity prompts (non-functional)
- Behavior: Code builds a VISUAL STYLE block from the capsule for the Stage 9 frame, end-frame, and continuity prompts. The capsule is never found because the project column is never set, so every prompt reads 'No visual style capsule applied.'
- Trigger / entrypoint: Stage 9 generate prompts, end-frame prompt, continuity prompt
- Preconditions: projects.visual_style_capsule_id non-null (never set)
- Code path: backend/src/routes/projects.ts:3738-3749 and frames.ts:567-576,2214-2223 -> promptGenerationService.buildStyleContext (promptGenerationService.ts:761-786) -> AI-06, AI-07, AI-08
- Data touched: projects.visual_style_capsule_id (read, always null)
- Downstream effects: Prompt text for frames
- Status: P=Y R=Y F=N P=Y T=N | labels: CONTRADICTED
- Evidence: backend/src/routes/projects.ts:640-653; backend/src/services/promptGenerationService.ts:761-786
- Notes: The PUT /api/projects/:id handler does not accept capsule fields, and no other code writes them.
- Related: WD-IMPL-FACT-0019, WD-IMPL-AI-0006, WD-IMPL-AI-0007, WD-IMPL-AI-0008
- Related product intent: PARTIAL_MATCH: WD-IDEA-GEN-047,WD-IDEA-GEN-048,WD-IDEA-GEN-049,WD-IDEA-GEN-050,WD-IDEA-GEN-051 || PARTIAL_MATCH: WD-IDEA-ASSET-011,WD-IDEA-ASSET-012

### WD-IMPL-CAP-0074 Optional visual capsule on a global asset
- Behavior: In the global asset dialog the user can pick a visual capsule. The id is stored on global_assets and used as the default for global asset image generation. Clearing the selector does not clear the stored id.
- Trigger / entrypoint: Asset Library then New Asset or Edit, Visual Style Capsule (Optional)
- Preconditions: none
- Code path: src/components/assets/AssetDialog.tsx:463-479,279-345 -> assetService.createAsset/updateAsset -> backend/src/routes/assets.ts:92-270
- Data touched: global_assets.visual_style_capsule_id
- Downstream effects: CAP-28, V5 clone-from-global (projectAssets.ts:1835)
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/assets/AssetDialog.tsx:463-479; backend/src/routes/assets.ts:244
- Notes: Clearing sends undefined which the PUT handler ignores, so the stored id remains.
- Related: WD-IMPL-FACT-0036

### WD-IMPL-CAP-0075 Browse global Asset Library
- Behavior: Logged-in user sees all their global assets as cards. Tabs filter by character, prop, or location. Sort is newest first; search is by name.
- Trigger / entrypoint: sidebar Asset Library, route /assets (App.tsx:121-129)
- Preconditions: authenticated
- Code path: src/pages/AssetLibrary.tsx:36-53 -> src/lib/services/assetService.ts:37-69 -> backend/src/routes/assets.ts:27-65 GET /
- Data touched: global_assets read
- Downstream effects: CAP-24 to CAP-29
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/assets.ts:27-65; src/pages/AssetLibrary.tsx:56-78
- Notes: Extra_archetype assets appear only in All. Card rendering crashes for that type (V2-FACT-12).
- Related: WD-IMPL-FACT-0030
- Related product intent: NOT_IMPLEMENTED: WD-IDEA-ALT-007,WD-IDEA-ALT-008 || EXACT_MATCH: WD-IDEA-ASSET-140,WD-IDEA-ASSET-141 || NOT_IMPLEMENTED: WD-IDEA-ASSET-142

### WD-IMPL-CAP-0076 Create global asset
- Behavior: User creates a reusable character, prop, or location with name, description (min 10 chars), optional image prompt, and optional visual capsule. Stored with user_id set and version 1.
- Trigger / entrypoint: Asset Library New Asset, Create Asset
- Preconditions: name, assetType in character/prop/location, description at least 10 chars
- Code path: src/components/assets/AssetDialog.tsx:279-345 -> assetService.createAsset -> backend/src/routes/assets.ts:92-168 POST /
- Data touched: global_assets insert
- Downstream effects: CAP-25 to CAP-29; project clone CAP-31
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/assets.ts:92-168
- Notes: Server accepts promotedFromProjectId and voiceProfileId but the UI never sends them.
- Related: WD-IMPL-ROUTE-0015
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-140,WD-IDEA-ASSET-141

### WD-IMPL-CAP-0077 Edit global asset
- Behavior: Owner edits name, type, description, image prompt, capsule, and voice profile. Each successful PUT increments version even if nothing changed.
- Trigger / entrypoint: Asset card menu Edit then Update Asset
- Preconditions: owner
- Code path: src/components/assets/AssetDialog.tsx:279-345 -> assetService.updateAsset -> backend/src/routes/assets.ts:171-270 PUT /:id
- Data touched: global_assets update, version
- Downstream effects: Version sync status for project clones (CAP-33)
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: backend/src/routes/assets.ts:236-238
- Notes: Editing a promoted extra_archetype asset is rejected with 400 because the PUT type list omits that type.
- Related: WD-IMPL-FACT-0036
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-140,WD-IDEA-ASSET-141

### WD-IMPL-CAP-0078 Upload image for global asset
- Behavior: User selects a PNG, JPEG, or WebP file of up to 10MB. The server stores it in bucket asset-images under global/<user>/<asset>/ and sets image_key_url and version+1.
- Trigger / entrypoint: AssetDialog image drop zone, saved on Create or Update
- Preconditions: owner
- Code path: src/components/assets/AssetDialog.tsx:85-118,348-367 -> assetService.uploadImage -> backend/src/routes/assets.ts:341-407 POST /:id/upload-image
- Data touched: storage asset-images, global_assets.image_key_url, version
- Downstream effects: CAP-31 clone localization
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/assets.ts:341-407
- Notes: Previous storage object is not removed.

### WD-IMPL-CAP-0079 Remove image from global asset
- Behavior: Removing the image sends removeImage=true with the PUT, which sets image_key_url to null. Storage object is kept.
- Trigger / entrypoint: AssetDialog hover X on image then Update
- Preconditions: owner
- Code path: src/components/assets/AssetDialog.tsx:120-127,317-333 -> backend/src/routes/assets.ts:248-250
- Data touched: global_assets.image_key_url
- Downstream effects: none
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/assets.ts:248-250
- Notes: Version is also incremented.

### WD-IMPL-CAP-0080 Generate global asset image with AI
- Behavior: User generates an image from the prompt (image prompt or description, min 20 chars). If the asset is new it is saved first. The job runs in the background and the dialog polls every 2s for up to 2 minutes.
- Trigger / entrypoint: AssetDialog Generate Image with AI button
- Preconditions: prompt at least 20 chars, GOOGLE_AI_API_KEY set
- Code path: src/components/assets/AssetDialog.tsx:129-277 -> assetService.generateImageKey -> backend/src/routes/assets.ts:410-458 POST /:id/generate-image -> ImageGenerationService.createGlobalAssetImageJob (:736-795) -> executeGlobalAssetJobInBackground (:800-927) -> AI-10; poll GET /api/images/jobs/:jobId (images.ts:71-137)
- Data touched: image_generation_jobs (project_id null), storage asset-images, global_assets.image_key_url, version
- Downstream effects: CAP-31, CAP-33
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/assets.ts:410-458; backend/src/services/image-generation/ImageGenerationService.ts:736-927
- Notes: Idempotency key is timestamped and not checked. Poll keeps running after the dialog is closed. Route accepts visualStyleCapsuleId from body without owner check (V2-FACT-08).
- Related: WD-IMPL-AI-0010, WD-IMPL-FACT-0026

### WD-IMPL-CAP-0081 Delete global asset
- Behavior: Owner deletes a global asset after confirmation. Deletion is refused with 409 and project titles if any project asset still references it.
- Trigger / entrypoint: asset card menu Delete then confirm
- Preconditions: no project_assets row references it
- Code path: src/components/assets/DeleteAssetDialog.tsx:41-60 -> assetService.deleteAsset -> backend/src/routes/assets.ts:273-338 DELETE /:id
- Data touched: global_assets delete; project_assets read
- Downstream effects: none
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/assets.ts:273-338
- Notes: Storage files are not removed.

### WD-IMPL-CAP-0082 Promote a project asset to global library
- Behavior: From Stage 5 an asset with a generated image can be promoted. A new global_assets row is created with the same fields and the project image URL. No link is written back to the project asset, so repeated promotes create duplicates.
- Trigger / entrypoint: Stage 5 asset menu Promote to Global, confirm
- Preconditions: project asset has image_key_url
- Code path: src/components/pipeline/Stage5Assets.tsx:580-608 -> projectAssetService.promoteToGlobal (projectAssetService.ts:485) -> backend/src/routes/projectAssets.ts:2286-2350 POST /:projectId/assets/:assetId/promote
- Data touched: global_assets insert, project_assets read
- Downstream effects: CAP-31 clone
- Status: P=Y R=Y F=Y P=Y T=N | labels: DUPLICATED
- Evidence: backend/src/routes/projectAssets.ts:2286-2350
- Notes: V5 owns this route. Recorded here because it creates global assets. Can produce extra_archetype global assets (V2-FACT-12).
- Related: WD-IMPL-ENTITY-0005

### WD-IMPL-CAP-0083 Clone a global asset into a project (cross-slice, V5)
- Behavior: From Stage 5 or Stage 8 browse drawer, user clones a global asset into the branch. The new project asset gets the Stage 5 locked capsule or the global asset's capsule, and its image is localized or regenerated.
- Trigger / entrypoint: Stage 5 Browse Global Library, then Add, in AssetDrawer
- Preconditions: global asset owned by user
- Code path: src/components/pipeline/AssetDrawer.tsx:269,287 -> projectAssetService.cloneFromGlobal (projectAssetService.ts:511) -> backend/src/routes/projectAssets.ts:1756-2045 POST /:projectId/assets/clone-from-global
- Data touched: project_assets insert, stage_states stage 5 read, storage, image_generation_jobs when regenerating
- Downstream effects: CAP-33 version sync
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/projectAssets.ts:1756-2045
- Notes: V5 owns the route. Functional Y at end-to-end level, runtime not verified. Regeneration applies only when a capsule id exists.
- Related: WD-IMPL-CAP-0067
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-143,WD-IDEA-ASSET-144

### WD-IMPL-CAP-0084 Match a global asset onto an extracted asset (cross-slice, V5)
- Behavior: User matches a global asset to an extracted project asset. The extracted row is updated with the global link and a merged description, chosen by a description strategy and a name strategy.
- Trigger / entrypoint: AssetMatchModal from AssetDrawer
- Preconditions: extracted asset has no global link
- Code path: src/components/pipeline/AssetMatchModal.tsx:125 -> projectAssetService.cloneFromGlobal with matchWithAssetId -> backend/src/routes/projectAssets.ts:1756-2045 -> assetDescriptionMerger.ts:17-91 (merge uses AI-05)
- Data touched: project_assets update
- Downstream effects: none
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: backend/src/services/assetDescriptionMerger.ts:17-91
- Notes: Merge fallback is string concatenation if the LLM call throws.
- Related: WD-IMPL-AI-0005
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-145

### WD-IMPL-CAP-0085 Show and apply version sync from global (cross-slice, V5)
- Behavior: Stage 5 header lists project assets whose source_version is older than the global asset version. User can sync one or all, which overwrites name, description, image prompt, image, and capsule unless the sync path overrides them.
- Trigger / entrypoint: Stage 5 AssetVersionSync control
- Preconditions: project assets linked to global assets
- Code path: src/components/pipeline/AssetVersionSync.tsx:49-112 -> projectAssetService.checkVersionSync / syncFromGlobal -> backend/src/routes/projectAssets.ts:431-509 GET version-sync-status and :2047-2280 POST sync-from-global
- Data touched: project_assets update, global_assets read
- Downstream effects: none
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: backend/src/routes/projectAssets.ts:2047-2280
- Notes: Sync overwrites user-edited fields even when overridden_fields lists them (V2-FACT-13).
- Related: WD-IMPL-FACT-0031
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-143,WD-IDEA-ASSET-144

### WD-IMPL-CAP-0086 Seed prompt templates over HTTP (no UI caller)
- Behavior: Any authenticated user can POST to /api/seed/prompt-templates to insert three v1.0.0 prompt templates for stages 2, 3, and 4. There is no frontend or e2e caller.
- Trigger / entrypoint: HTTP POST /api/seed/prompt-templates only
- Preconditions: authenticated
- Code path: backend/src/routes/seed.ts:15-212 -> promptTemplateService.createTemplate (prompt-template.ts:62-80)
- Data touched: prompt_templates insert
- Downstream effects: AI-01 template lookup
- Status: P=Y R=Y F=P P=Y T=N | labels: DUPLICATED
- Evidence: backend/src/routes/seed.ts:15-212; backend/src/server.ts:77-78
- Notes: Inserts fail silently on duplicate name and version. Functional P.
- Related: WD-IMPL-FACT-0033, WD-IMPL-FACT-0034
- Related product intent: PARTIAL_MATCH: WD-IDEA-PHIL-054,WD-IDEA-PHIL-055,WD-IDEA-PHIL-056

### WD-IMPL-CAP-0087 Scene asset and Stage 8 image generation uses Stage 5 style lock (cross-slice, V5)
- Behavior: Stage 8 scene asset generation, edit, and transformation post image read the current Stage 5 locked capsule or manual tone, not the asset's stored capsule id.
- Trigger / entrypoint: Stage 8 scene asset generate, edit, transformation post
- Preconditions: Stage 5 locked style
- Code path: backend/src/routes/sceneAssets.ts:350-405,408-505,1944-2030 -> ImageGenerationService.createSceneAssetImageJob (:193-243) -> CAP-19
- Data touched: stage_states stage 5 read, image_generation_jobs, scene_asset_instances
- Downstream effects: CAP-19, CAP-20
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/sceneAssets.ts:350-405
- Notes: Stage 5 and Stage 8 can use different capsules for the same asset (V2-STATE-01).
- Related: WD-IMPL-STATE-0023
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-011,WD-IDEA-ASSET-012

## Writing: input, treatment, beats, script, scenes

### WD-IMPL-CAP-0088 Stage 1 Continue (manual input modes) persists project config and processed input
- Behavior: Continue on Stage 1 updates projects columns via PUT /api/projects/:id, saves stage_states(1) with processedInput as draft, cancels autosave and calls onComplete which locks Stage 1. Gate requires mode, project type, tonal >=10 chars and files or idea >=20 chars. Validation failures only console.error.
- Trigger / entrypoint: Stage1InputMode Continue button (Stage1InputMode.tsx:912)
- Preconditions: projectId not 'new'; canProceed true; stage not locked/outdated
- Code path: Stage1InputMode.handleComplete -> projectService.updateProject -> PUT /api/projects/:id -> inputProcessingService.processInput -> stageStateService.saveStageState -> PUT /api/projects/:id/stages/1 -> ProjectView.handleStageComplete(1) -> POST /stages/1/lock
- Data touched: projects columns; stage_states(stage 1)
- Downstream effects: Stage 2 treatment generation reads stage_states(1).content.processedInput
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage1InputMode.tsx:175-298; src/lib/services/inputProcessingService.ts:39-158; backend/src/routes/projects.ts:640-730; backend/src/routes/stageStates.ts:120-294; backend/src/routes/stageStates.ts:297-412
- Notes: Audio-visual project type sends 'audio-visual' which backend rejects (expects audio_visual) so Continue fails with console-only error. Script-skip is identical to other modes.
- Related: WD-IMPL-CAP-0089, WD-IMPL-STATE-0025
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-UX-323 || PARTIAL_MATCH: WD-IDEA-INPUT-034,WD-IDEA-INPUT-035 || PARTIAL_MATCH: WD-IDEA-STORY-001,WD-IDEA-STORY-002,WD-IDEA-STORY-003,WD-IDEA-STORY-004

### WD-IMPL-CAP-0089 Stage 1 file staging reads uploaded text into memory
- Behavior: FileStagingArea reads uploads with FileReader readAsText (max 10 files, 10MB, txt/md/doc/docx/rtf). PDF resolves empty string so a PDF primary file fails validation. Full file text is embedded in stage_states(1).content.uploadedFiles and processedInput.
- Trigger / entrypoint: FileStagingArea file input or drop
- Preconditions: file type in ACCEPTED_TYPES, size <= 10MB
- Code path: FileStagingArea.processFiles -> readFileContent -> onFilesChange -> Stage1InputMode updateField(uploadedFiles)
- Data touched: React state until Continue then stage_states(1)
- Downstream effects: inputProcessingService.processInput
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/FileStagingArea.tsx:36-113; src/components/pipeline/Stage1InputMode.tsx:653-715
- Notes: Binary .doc/.docx are read as text (garbage). Primary-file designation defaults to first file.
- Related: WD-IMPL-CAP-0088
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-021 || PARTIAL_MATCH: WD-IDEA-INPUT-030,WD-IDEA-INPUT-031,WD-IDEA-INPUT-032,WD-IDEA-INPUT-033

### WD-IMPL-CAP-0090 Stage 2 auto-generates 3 treatment variations on first mount
- Behavior: When stage 2 has no variations, the component fetches stage 1 processedInput and calls the treatment_expansion template via /api/llm/generate-from-template. Response parsed client-side into variations, then autosaved.
- Trigger / entrypoint: Stage2Treatment useEffect on mount
- Preconditions: variations empty, stage 1 processedInput exists
- Code path: Stage2Treatment.generateInitialTreatments -> stageStateService.getStageState(1) -> treatmentService.generateTreatments -> POST /api/llm/generate-from-template -> llmClient.generate -> parseTreatmentResponse -> setStageContent -> autosave PUT /stages/2
- Data touched: prompt_templates (read); stage_states(2); style_capsule_applications when capsule set
- Downstream effects: Stage 3 beat generation reads active variation
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage2Treatment.tsx:121-230; src/lib/services/treatmentService.ts:38-120; backend/src/routes/llm.ts:139-315; backend/scripts/seed-templates.ts:17-86
- Notes: Live prompt_templates content UNKNOWN; seed text used. Output truncation at default 4096 tokens plausible.
- Related: WD-IMPL-AI-0068, WD-IMPL-STATE-0026
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096 || UNKNOWN: WD-IDEA-PHIL-024 || PARTIAL_MATCH: WD-IDEA-STORY-005,WD-IDEA-STORY-006,WD-IDEA-STORY-007,WD-IDEA-STORY-008,WD-IDEA-STORY-009,WD-IDEA-STORY-010,WD-IDEA-STORY-011,WD-IDEA-STORY-012,WD-IDEA-STORY-013,WD-IDEA-STORY-014

### WD-IMPL-CAP-0091 Stage 2 Edit Mode with explicit Save Changes
- Behavior: Edit Mode exposes a textarea; edits are kept in local state and only written to variations[active].content on Save Changes. Approve & Continue does not save and discards unsaved edits.
- Trigger / entrypoint: Edit Mode toggle, Save Changes button
- Preconditions: variations non-empty
- Code path: handleContentChange -> handleSaveChanges -> setStageContent -> autosave PUT /stages/2
- Data touched: stage_states(2)
- Downstream effects: Stage 3
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage2Treatment.tsx:253-256; src/components/pipeline/Stage2Treatment.tsx:400-416; src/components/pipeline/Stage2Treatment.tsx:504-512
- Notes: Variation switch confirms only if hasUnsavedChanges.
- Related: WD-IMPL-INVALIDATE-0017
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-005,WD-IDEA-STORY-006,WD-IDEA-STORY-007,WD-IDEA-STORY-008,WD-IDEA-STORY-009,WD-IDEA-STORY-010,WD-IDEA-STORY-011,WD-IDEA-STORY-012,WD-IDEA-STORY-013,WD-IDEA-STORY-014

### WD-IMPL-CAP-0092 Stage 2 Edit Selection: AI rewrite of highlighted span (1 or 3 alternatives)
- Behavior: Selecting text in Edit Mode opens a dialog. Count 1 calls /api/llm/generate and splices the reply by character offsets. Count 3 returns three alternatives for the user to pick. Nothing persists until Save Changes.
- Trigger / entrypoint: Edit Selection button (appears when selection non-empty)
- Preconditions: Edit Mode with text selected
- Code path: handleGenerateSectionAlternatives -> treatmentService.regenerateSection or regenerateSectionAlternatives -> POST /api/llm/generate -> setEditableContent
- Data touched: none directly (local state)
- Downstream effects: Save Changes persists
- Status: P=Y R=Y F=P P=N T=N
- Evidence: src/components/pipeline/Stage2Treatment.tsx:280-346; src/lib/services/treatmentService.ts:192-307
- Notes: Offsets captured at selection time; edits to text between select and apply would misplace splice (not guarded).
- Related: WD-IMPL-AI-0014, WD-IMPL-AI-0015, WD-IMPL-CAP-0091
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-005,WD-IDEA-STORY-006,WD-IDEA-STORY-007,WD-IDEA-STORY-008,WD-IDEA-STORY-009,WD-IDEA-STORY-010,WD-IDEA-STORY-011,WD-IDEA-STORY-012,WD-IDEA-STORY-013,WD-IDEA-STORY-014 || PARTIAL_MATCH: WD-IDEA-STORY-069,WD-IDEA-STORY-070,WD-IDEA-STORY-071,WD-IDEA-STORY-072,WD-IDEA-STORY-073,WD-IDEA-STORY-074,WD-IDEA-STORY-075,WD-IDEA-STORY-076,WD-IDEA-STORY-077,WD-IDEA-STORY-078

### WD-IMPL-CAP-0093 Stage 2 Full Regenerate with guidance (replaces all variations)
- Behavior: Guidance dialog (min 10 chars) regenerates all three variations from Stage 2's stored processedInput copy and resets activeVariation to 0. Guidance is sent as regeneration_guidance but the seeded template has no such placeholder, and it is not stored on the stage row.
- Trigger / entrypoint: Full Regenerate button
- Preconditions: guidance >= 10 chars; stage 2 processedInput exists
- Code path: handleFullRegenerate -> treatmentService.regenerateTreatments -> POST /api/llm/generate-from-template -> setStageContent -> autosave
- Data touched: stage_states(2)
- Downstream effects: Stage 3 uses active variation
- Status: P=Y R=Y F=P P=Y T=N | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage2Treatment.tsx:348-398; src/lib/services/treatmentService.ts:125-187; backend/scripts/seed-templates.ts:17-86; backend/src/routes/stageStates.ts:232
- Notes: Dialog text claims guidance is saved as commit message; not true.
- Related: WD-IMPL-FACT-0040, WD-IMPL-AI-0068
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-005,WD-IDEA-STORY-006,WD-IDEA-STORY-007,WD-IDEA-STORY-008,WD-IDEA-STORY-009,WD-IDEA-STORY-010,WD-IDEA-STORY-011,WD-IDEA-STORY-012,WD-IDEA-STORY-013,WD-IDEA-STORY-014 || PARTIAL_MATCH: WD-IDEA-STORY-069,WD-IDEA-STORY-070,WD-IDEA-STORY-071,WD-IDEA-STORY-072,WD-IDEA-STORY-073,WD-IDEA-STORY-074,WD-IDEA-STORY-075,WD-IDEA-STORY-076,WD-IDEA-STORY-077,WD-IDEA-STORY-078

### WD-IMPL-CAP-0094 Stage 2 Generate New Variation (replaces all variations, no confirm)
- Behavior: Re-runs initial generation, which re-reads the current Stage 1 processedInput and replaces every variation. Works even when the stage is locked.
- Trigger / entrypoint: Generate New Variation button
- Preconditions: not generating/regenerating
- Code path: generateInitialTreatments -> treatmentService.generateTreatments -> POST /api/llm/generate-from-template
- Data touched: stage_states(2)
- Downstream effects: Stage 3
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage2Treatment.tsx:534-547; src/components/pipeline/Stage2Treatment.tsx:151-230
- Notes: Only Stage 2 action that picks up later Stage 1 edits.
- Related: WD-IMPL-INVALIDATE-0017, WD-IMPL-FACT-0043
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-005,WD-IDEA-STORY-006,WD-IDEA-STORY-007,WD-IDEA-STORY-008,WD-IDEA-STORY-009,WD-IDEA-STORY-010,WD-IDEA-STORY-011,WD-IDEA-STORY-012,WD-IDEA-STORY-013,WD-IDEA-STORY-014 || PARTIAL_MATCH: WD-IDEA-STORY-069,WD-IDEA-STORY-070,WD-IDEA-STORY-071,WD-IDEA-STORY-072,WD-IDEA-STORY-073,WD-IDEA-STORY-074,WD-IDEA-STORY-075,WD-IDEA-STORY-076,WD-IDEA-STORY-077,WD-IDEA-STORY-078

### WD-IMPL-CAP-0095 Stage 2 Approve & Continue locks stage 2
- Behavior: Approve calls onComplete which locks stage 2 from the last saved row. Unsaved editor text is silently discarded.
- Trigger / entrypoint: Approve & Continue button
- Preconditions: stage 2 not locked
- Code path: onComplete -> ProjectView.handleStageComplete(2) -> stageStateService.lockStage -> POST /stages/2/lock
- Data touched: stage_states(2) new locked row
- Downstream effects: Stage 3 unlock
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage2Treatment.tsx:504-512; src/pages/ProjectView.tsx:446-476; backend/src/routes/stageStates.ts:297-412
- Notes: Sync with Beat Sheet button is DEAD (isOutdated never set true).
- Related: WD-IMPL-STATE-0027, WD-IMPL-INVALIDATE-0017
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-005,WD-IDEA-STORY-006,WD-IDEA-STORY-007,WD-IDEA-STORY-008,WD-IDEA-STORY-009,WD-IDEA-STORY-010,WD-IDEA-STORY-011,WD-IDEA-STORY-012,WD-IDEA-STORY-013,WD-IDEA-STORY-014

### WD-IMPL-CAP-0096 Stage 3 auto-generates beat sheet from active treatment
- Behavior: On mount with no beats, reads stage 2 active variation and calls beat_extraction template. Beats parsed from JSON with fallbacks to numbered lines or one whole-text beat.
- Trigger / entrypoint: Stage3BeatSheet useEffect
- Preconditions: beats empty; stage 2 has variations
- Code path: generateInitialBeats -> stageStateService.getStageState(2) -> beatService.generateBeats -> POST /api/llm/generate-from-template -> parseBeatsResponse -> setStageContent -> autosave PUT /stages/3
- Data touched: stage_states(2) read; stage_states(3) written
- Downstream effects: Stage 4 script generation
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage3BeatSheet.tsx:273-364; src/lib/services/beatService.ts:44-101; src/lib/services/beatService.ts:303-441
- Notes: Falls back to hardcoded params 180/300, Drama, 'Emotional and contemplative' when stage 2 processedInput missing.
- Related: WD-IMPL-AI-0069
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-015,WD-IDEA-STORY-016,WD-IDEA-STORY-017,WD-IDEA-STORY-018,WD-IDEA-STORY-019,WD-IDEA-STORY-020,WD-IDEA-STORY-021,WD-IDEA-STORY-026

### WD-IMPL-CAP-0097 Stage 3 inline beat editing, drag reorder, add and delete
- Behavior: Click-to-edit textarea per beat, dnd-kit reorder that renumbers order, add after (placeholder text), delete blocked below 3 beats. All changes flow to autosave.
- Trigger / entrypoint: beat text click, drag handle, + and trash icons
- Preconditions: not generating or regenerating
- Code path: handleBeatContentChange or handleDragEnd or addBeatAfter or deleteBeat -> setStageContent -> useStageState autosave -> PUT /stages/3
- Data touched: stage_states(3)
- Downstream effects: Stage 4 beat panel
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage3BeatSheet.tsx:72-227; src/components/pipeline/Stage3BeatSheet.tsx:366-446
- Notes: Editing is allowed while stage is locked; originalTreatmentExcerpt never populated.
- Related: WD-IMPL-INVALIDATE-0017
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-015,WD-IDEA-STORY-016,WD-IDEA-STORY-017,WD-IDEA-STORY-018,WD-IDEA-STORY-019,WD-IDEA-STORY-020,WD-IDEA-STORY-021,WD-IDEA-STORY-026 || PARTIAL_MATCH: WD-IDEA-STORY-022,WD-IDEA-STORY-023,WD-IDEA-STORY-024,WD-IDEA-STORY-025,WD-IDEA-STORY-027,WD-IDEA-STORY-028,WD-IDEA-STORY-029,WD-IDEA-STORY-030

### WD-IMPL-CAP-0098 Stage 3 brainstorm alternatives for one beat
- Behavior: Sparkles icon opens dialog; /api/llm/generate returns three alternatives; picking one replaces only that beat text.
- Trigger / entrypoint: beat Sparkles button
- Preconditions: beat exists
- Code path: handleGenerateAlternatives -> beatService.brainstormBeatAlternatives -> POST /api/llm/generate -> handleSelectAlternative -> setStageContent -> autosave
- Data touched: stage_states(3)
- Downstream effects: none
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage3BeatSheet.tsx:448-500; src/lib/services/beatService.ts:183-241
- Notes: Prompt includes all beats as context.
- Related: WD-IMPL-AI-0017
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-015,WD-IDEA-STORY-016,WD-IDEA-STORY-017,WD-IDEA-STORY-018,WD-IDEA-STORY-019,WD-IDEA-STORY-020,WD-IDEA-STORY-021,WD-IDEA-STORY-026 || PARTIAL_MATCH: WD-IDEA-STORY-022,WD-IDEA-STORY-023,WD-IDEA-STORY-024,WD-IDEA-STORY-025,WD-IDEA-STORY-027,WD-IDEA-STORY-028,WD-IDEA-STORY-029,WD-IDEA-STORY-030

### WD-IMPL-CAP-0099 Stage 3 Regenerate All (replaces all beats)
- Behavior: Guidance dialog regenerates the full beat sheet from the treatmentSource snapshot captured at first generation, using hardcoded project params. Guidance sent as regeneration_guidance with no template placeholder.
- Trigger / entrypoint: Regenerate All button
- Preconditions: guidance >= 10 chars; treatmentSource present
- Code path: handleFullRegenerate -> beatService.regenerateBeats -> POST /api/llm/generate-from-template -> setStageContent
- Data touched: stage_states(3)
- Downstream effects: Stage 4
- Status: P=Y R=Y F=P P=Y T=N | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage3BeatSheet.tsx:517-573; src/lib/services/beatService.ts:106-178
- Notes: Uses stale snapshot, not current Stage 2. Hardcoded params marked TODO in code.
- Related: WD-IMPL-FACT-0040, WD-IMPL-FACT-0042
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-099,WD-IDEA-UX-102 || PARTIAL_MATCH: WD-IDEA-STORY-022,WD-IDEA-STORY-023,WD-IDEA-STORY-024,WD-IDEA-STORY-025,WD-IDEA-STORY-027,WD-IDEA-STORY-028,WD-IDEA-STORY-029,WD-IDEA-STORY-030

### WD-IMPL-CAP-0100 Stage 3 Confirm & Lock with min-length checks
- Behavior: Requires all beats >=10 chars and >=3 beats, shows success toast then calls onComplete which locks stage 3. Toast fires before lock result is known.
- Trigger / entrypoint: Confirm & Lock button
- Preconditions: beats valid
- Code path: handleConfirmAndLock -> onComplete -> ProjectView.handleStageComplete(3) -> POST /stages/3/lock
- Data touched: stage_states(3) new locked row
- Downstream effects: Stage 4 mount reads latest stage 3
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage3BeatSheet.tsx:502-515; src/pages/ProjectView.tsx:446-476
- Notes: Lock failure after success toast is not surfaced.
- Related: WD-IMPL-STATE-0027

### WD-IMPL-CAP-0101 Stage 4 auto-generates master script from beat sheet
- Behavior: On first visit with no script, loads Stage 3 beats, Stage 2 processedInput and project config, then calls master_script_generation template. Response normalized through parseScriptToTiptapJson and stored.
- Trigger / entrypoint: Stage4MasterScript mount effects
- Preconditions: no formattedScript or tiptapDoc; beatSheetSource loaded
- Code path: handleGenerateScript -> scriptService.generateScript -> POST /api/llm/generate-from-template -> parseScriptResponse -> parseScriptToTiptapJson -> setStageContent -> editor setContent -> onUpdate -> debounced save
- Data touched: stage_states(3,2,4) read; prompt_templates read; stage_states(4) written
- Downstream effects: Stage 4 editor and approve
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage4MasterScript.tsx:228-373; src/lib/services/scriptService.ts:65-129; src/lib/services/scriptService.ts:474-548
- Notes: Auto-generation guarded by autoGenAttempted ref per mount.
- Related: WD-IMPL-AI-0070, WD-IMPL-FACT-0039
- Related product intent: UNKNOWN: WD-IDEA-PHIL-024 || EXACT_MATCH: WD-IDEA-STORY-034,WD-IDEA-STORY-035,WD-IDEA-STORY-036,WD-IDEA-STORY-037,WD-IDEA-STORY-038,WD-IDEA-STORY-040,WD-IDEA-STORY-041 || PARTIAL_MATCH: WD-IDEA-STORY-046,WD-IDEA-STORY-047,WD-IDEA-STORY-048,WD-IDEA-STORY-049,WD-IDEA-STORY-050,WD-IDEA-STORY-051,WD-IDEA-STORY-052

### WD-IMPL-CAP-0102 Stage 4 TipTap editor with 2s debounced autosave
- Behavior: Every editor update recomputes formattedScript (plain text, normalized), tiptapDoc and scenes in memory, then saves after 2s as a draft stage_states version. Editor hydration also emits update, so opening the stage creates a version.
- Trigger / entrypoint: EditorContent typing
- Preconditions: stage not locked/outdated at editor creation
- Code path: editor onUpdate -> setStageContent -> setTimeout save -> useStageState.save -> stageStateService.forceSave -> PUT /stages/4
- Data touched: stage_states(4)
- Downstream effects: Approve reads editor JSON
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage4MasterScript.tsx:120-216; src/lib/utils/screenplay-converter.ts:66-232; src/lib/tiptap-extensions/index.ts:1-5
- Notes: Editable flag set at editor creation only. Pending debounce cancelled on unmount so last edits within 2s are lost. Plain-text round trip is lossy (dialogue merged).
- Related: WD-IMPL-STATE-0029, WD-IMPL-FACT-0038
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-307,WD-IDEA-UX-308 || PARTIAL_MATCH: WD-IDEA-STORY-046,WD-IDEA-STORY-047,WD-IDEA-STORY-048,WD-IDEA-STORY-049,WD-IDEA-STORY-050,WD-IDEA-STORY-051,WD-IDEA-STORY-052

### WD-IMPL-CAP-0103 Stage 4 full script Regenerate (replaces script)
- Behavior: Guidance dialog regenerates the entire script with regeneration_guidance (no template placeholder). Replaces formattedScript and tiptapDoc; manual edits are gone from current row.
- Trigger / entrypoint: Regenerate button
- Preconditions: guidance >= 10 chars
- Code path: handleRegenerateScript -> scriptService.regenerateScript -> POST /api/llm/generate-from-template -> setStageContent
- Data touched: stage_states(4)
- Downstream effects: Approve
- Status: P=Y R=Y F=P P=Y T=N | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage4MasterScript.tsx:376-423; src/lib/services/scriptService.ts:134-197
- Notes: Prior manual edits remain only in earlier stage_states rows; no UI exposes them.
- Related: WD-IMPL-FACT-0040, WD-IMPL-AI-0070

### WD-IMPL-CAP-0104 Stage 4 Edit Selection: AI rewrite of highlighted script span
- Behavior: Selected text plus 500 chars before and after is sent to /api/llm/generate. Count 1 replaces selection via insertContent; count 3 offers three alternatives.
- Trigger / entrypoint: Edit Selection button when hasSelection
- Preconditions: text selected, guidance >= 10 chars
- Code path: handleRegenerateSection -> scriptService.regenerateSection or regenerateSectionAlternatives -> POST /api/llm/generate -> editor.chain().deleteRange().insertContent() -> onUpdate save
- Data touched: stage_states(4) via autosave
- Downstream effects: none
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage4MasterScript.tsx:426-489; src/lib/services/scriptService.ts:202-334
- Notes: Structure of inserted multi-line text in a block node is UNKNOWN.
- Related: WD-IMPL-AI-0021, WD-IMPL-AI-0022
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-069,WD-IDEA-STORY-070,WD-IDEA-STORY-071,WD-IDEA-STORY-072,WD-IDEA-STORY-073,WD-IDEA-STORY-074,WD-IDEA-STORY-075,WD-IDEA-STORY-076,WD-IDEA-STORY-077,WD-IDEA-STORY-078

### WD-IMPL-CAP-0105 Stage 4 Preview Scenes (in-memory only)
- Behavior: Runs extractScenes over plain text and shows a dialog. Also writes preview list into local content.scenes, persisted by next editor-triggered save.
- Trigger / entrypoint: Preview Scenes button
- Preconditions: non-empty script
- Code path: handlePreviewScenes -> sceneService.previewScenes -> scriptService.extractScenes
- Data touched: React state; stage_states(4) via next save
- Downstream effects: none
- Status: P=Y R=Y F=Y P=P T=Y
- Evidence: src/components/pipeline/Stage4MasterScript.tsx:493-538; src/lib/services/sceneService.ts:143-176; src/lib/services/scriptService.ts:401-469
- Notes: Preview scene count can differ from manifest count used for deps.
- Related: WD-IMPL-FACT-0041, WD-IMPL-TEST-0010
- Related product intent: PARTIAL_MATCH: WD-IDEA-STORY-046,WD-IDEA-STORY-047,WD-IDEA-STORY-048,WD-IDEA-STORY-049,WD-IDEA-STORY-050,WD-IDEA-STORY-051,WD-IDEA-STORY-052

### WD-IMPL-CAP-0106 Stage 4 Approve Script: persist scenes and lock stage 4
- Behavior: Approve extracts scenes from plain text, rejects empty, then PUT /api/projects/:id/scenes with tiptapDoc, then lockStage(4). Re-approval rewrites scenes by number and hard-deletes unmatched scenes.
- Trigger / entrypoint: Approve Script button
- Preconditions: editor present; non-empty; scenes >0; scenes content non-empty; stage 3 locked or skipped for lock to succeed
- Code path: handleApproveScript -> scriptService.extractScenes -> proceedWithApproval -> scriptService.persistScenes -> PUT /api/projects/:id/scenes -> stageStateService.lockStage(4) -> onComplete -> ProjectView.handleStageComplete(4) -> POST /stages/4/lock
- Data touched: scenes (insert/update/delete); stage_states(4) locked row
- Downstream effects: Stage 5 assets, Stage 6 scene hub
- Status: P=Y R=Y F=P P=Y T=N | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage4MasterScript.tsx:606-687; src/lib/services/scriptService.ts:623-660; backend/src/routes/projects.ts:1216-1529; backend/src/utils/scriptManifest.ts:280-363
- Notes: Non-atomic. Stage 4 warning dialog text claims continuity_broken marking which is contradicted by hard delete. Lock called twice per approve (proceedWithApproval and handleStageComplete).
- Related: WD-IMPL-STATE-0028, WD-IMPL-INVALIDATE-0018, WD-IMPL-INVALIDATE-0019, WD-IMPL-FACT-0041
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-015,WD-IDEA-FLOW-017,WD-IDEA-FLOW-018,WD-IDEA-FLOW-019 || EXACT_MATCH: WD-IDEA-FLOW-021,WD-IDEA-FLOW-022 || PARTIAL_MATCH: WD-IDEA-STORY-046,WD-IDEA-STORY-047,WD-IDEA-STORY-048,WD-IDEA-STORY-049,WD-IDEA-STORY-050,WD-IDEA-STORY-051,WD-IDEA-STORY-052

### WD-IMPL-CAP-0107 Stage 6 Script Hub lists scenes and defers or restores them
- Behavior: Loads scenes via GET /api/projects/:id/scenes, filters dependency names to existing project assets, shows continuity risk, and toggles is_deferred via PUT defer/restore. Enter Scene Pipeline is disabled for deferred scenes.
- Trigger / entrypoint: Stage 6 mount; Defer Scene and Restore Scene buttons
- Preconditions: project has active branch
- Code path: Stage6ScriptHub.loadScenes -> sceneService.fetchScenes -> GET /api/projects/:id/scenes; defer -> sceneService.deferScene -> PUT /scenes/:sceneId/defer
- Data touched: scenes (read; is_deferred write); stage_states(1-4) read; projects read
- Downstream effects: Scene pipeline Stage 7+
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage6ScriptHub.tsx:56-182; src/components/pipeline/Stage6ScriptHub.tsx:402-440; backend/src/routes/projects.ts:1013-1214
- Notes: Deferral keyed by row id, which positional re-parse can re-point. Load-time stage_states autosaves can flip continuity risk to broken.
- Related: WD-IMPL-ROUTE-0020, WD-IMPL-ROUTE-0021, WD-IMPL-FACT-0044

### WD-IMPL-CAP-0108 ContentAccessCarousel read-only tabbed panel (Script, Stills, Clips, Shots)
- Behavior: Bottom resizable panel with Script excerpt of all scenes, stills and clips from other scenes, and shots from stage 8 onward. Read-only fetch-only; module-level session state for height and tab.
- Trigger / entrypoint: Stage6ScriptHub scene detail (and stages 7-12)
- Preconditions: projectId and sceneId
- Code path: useQuery scenes -> sceneService.fetchScenes; stills -> frameService.fetchFrames; clips -> checkoutService.getVideoJobs; shots -> shotService.fetchShots
- Data touched: scenes, frames, video jobs, shots (read only)
- Downstream effects: none
- Status: P=Y R=Y F=P P=N T=N
- Evidence: src/components/pipeline/ContentAccessCarousel.tsx:1-10; src/components/pipeline/ContentAccessCarousel.tsx:204-259; src/components/pipeline/ContentAccessCarousel.tsx:988-1145; src/components/pipeline/Stage6ScriptHub.tsx:526-534
- Notes: Rendered by Stages 6, 7, 8, 9, 10, 11, 12 (import and JSX grep). Stage 6 render verified in code. Own parseScriptLines classifier differs from converter.
- Related: WD-IMPL-CAP-0107
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-160,WD-IDEA-UX-162,WD-IDEA-UX-164,WD-IDEA-UX-166,WD-IDEA-UX-182,WD-IDEA-UX-183,WD-IDEA-UX-184 || UNKNOWN: WD-IDEA-UX-023,WD-IDEA-UX-024,WD-IDEA-UX-161,WD-IDEA-UX-163,WD-IDEA-UX-171,WD-IDEA-UX-172,WD-IDEA-UX-174,WD-IDEA-UX-177,WD-IDEA-UX-289 || NOT_IMPLEMENTED: WD-IDEA-CONT-215 || PARTIAL_MATCH: WD-IDEA-CONT-214,WD-IDEA-CONT-216 || NOT_IMPLEMENTED: WD-IDEA-CONT-217 || NOT_IMPLEMENTED: WD-IDEA-SHOT-061,WD-IDEA-SHOT-062

### WD-IMPL-CAP-0109 Stage 6 Outdated scene warning modal
- Behavior: Modal shown when a scene status is outdated, offering Proceed Anyway. No code path writes scenes.status outdated for Phase A changes.
- Trigger / entrypoint: handleSceneClick on outdated scene
- Preconditions: scene.status === outdated
- Code path: handleSceneClick -> setShowOutdatedWarning
- Data touched: none
- Downstream effects: none
- Status: P=Y R=N F=N P=N T=N | labels: DEAD
- Evidence: src/components/pipeline/Stage6ScriptHub.tsx:142-145; src/components/pipeline/Stage6ScriptHub.tsx:580-641; backend/src/routes/projects.ts:3148; backend/src/routes/sceneStageLocks.ts:248
- Notes: Writers that exist set stage_locks outdated, not scenes.status.
- Related: WD-IMPL-FACT-0044
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-045,WD-IDEA-UX-046,WD-IDEA-UX-056,WD-IDEA-UX-057,WD-IDEA-UX-060

## Streamline intake

### WD-IMPL-CAP-0110 Select Streamline input mode in Stage 1
- Behavior: Fifth Stage 1 mode card 'streamline' always rendered; selecting swaps the file area for StreamlineDropZone + image grid + review screen and hides the normal Continue button. No feature flag.
- Trigger / entrypoint: Stage 1 mode grid button 'Streamline'
- Preconditions: ProjectView currentStage===1
- Code path: Stage1InputMode updateField('selectedMode','streamline')
- Data touched: React content state
- Downstream effects: StreamlineDropZone, StreamlineImageReviewGrid, StreamlineReviewScreen
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage1InputMode.tsx:L80-L86; src/components/pipeline/Stage1InputMode.tsx:L573; src/components/pipeline/Stage1InputMode.tsx:L659-L709; src/components/pipeline/Stage1InputMode.tsx:L891-L892
- Notes: Mode selection is not persisted until commit (useStageState autoSave:false). Mode buttons stay clickable even when Stage 1 is locked.
- Related: WD-IMPL-FACT-0062
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-037,WD-IDEA-INPUT-038,WD-IDEA-INPUT-039,WD-IDEA-INPUT-040,WD-IDEA-INPUT-041,WD-IDEA-INPUT-042,WD-IDEA-INPUT-043,WD-IDEA-INPUT-044,WD-IDEA-INPUT-045,WD-IDEA-INPUT-046,WD-IDEA-INPUT-047,WD-IDEA-INPUT-048,+4

### WD-IMPL-CAP-0111 Drop/choose documents: server extraction + classification per file
- Behavior: Each accepted file (.txt/.md/.pdf/.docx/.rtf, <=20MB, <=10 files) is POSTed individually to /streamline/extract-file, which extracts text (pdf-parse/mammoth/rtf-to-text/utf8) and classifies it (deterministic script detection, else LLM). Failures are isolated per file.
- Trigger / entrypoint: StreamlineDropZone drop/select
- Preconditions: projectId owned by the user (route 404 otherwise; 'new' 404s)
- Code path: processFiles -> extractOne -> streamlineService.extractFile -> POST extract-file -> extractText -> classifyFile -> (extractStandaloneAssetDraft)
- Data touched: none persisted; React streamlineFiles
- Downstream effects: onBatchSettled -> Ask Auteur; computeStreamlineRouting
- Status: P=Y R=Y F=Y P=N T=Y
- Evidence: src/components/pipeline/streamline/StreamlineDropZone.tsx:L121-L189; src/lib/services/streamlineService.ts:L153-L176; backend/src/routes/streamline.ts:L196-L245; backend/src/services/streamlineExtractionService.ts:L52-L81; backend/src/services/streamlineClassificationService.ts:L67-L75; StreamlineDropZone.test.tsx; streamlineExtractFile.test.ts; streamlineExtraction.test.ts
- Notes: Legacy .doc rejected client-side and server-side. Response held only in React state.
- Related: WD-IMPL-AI-0027, WD-IMPL-ROUTE-0025, WD-IMPL-FACT-0049
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-114,WD-IDEA-PHIL-012 || PARTIAL_MATCH: WD-IDEA-PHIL-019 || PARTIAL_MATCH: WD-IDEA-PHIL-066 || PARTIAL_MATCH: WD-IDEA-INPUT-037,WD-IDEA-INPUT-038,WD-IDEA-INPUT-039,WD-IDEA-INPUT-040,WD-IDEA-INPUT-041,WD-IDEA-INPUT-042,WD-IDEA-INPUT-043,WD-IDEA-INPUT-044,WD-IDEA-INPUT-045,WD-IDEA-INPUT-046,WD-IDEA-INPUT-047,WD-IDEA-INPUT-048,+4 || PARTIAL_MATCH: WD-IDEA-INPUT-053,WD-IDEA-INPUT-054,WD-IDEA-INPUT-055,WD-IDEA-INPUT-056,WD-IDEA-INPUT-057,WD-IDEA-INPUT-058,WD-IDEA-INPUT-059 || PARTIAL_MATCH: WD-IDEA-INPUT-060,WD-IDEA-INPUT-061,WD-IDEA-INPUT-062,WD-IDEA-INPUT-063,WD-IDEA-INPUT-064,WD-IDEA-INPUT-065,WD-IDEA-INPUT-066,WD-IDEA-INPUT-067 || PARTIAL_MATCH: WD-IDEA-INPUT-070

### WD-IMPL-CAP-0112 Paste text as a file
- Behavior: Pasted text becomes a StreamlineFile with status success and classification unclassified/0. It is never sent to the server for classification and never triggers Ask Auteur on its own.
- Trigger / entrypoint: 'Or paste text instead' -> 'Add as file'
- Preconditions: non-empty text
- Code path: addPastedText
- Data touched: React streamlineFiles
- Downstream effects: routing only
- Status: P=Y R=Y F=P P=N T=N
- Evidence: src/components/pipeline/streamline/StreamlineDropZone.tsx:L253-L269; src/components/pipeline/streamline/StreamlineDropZone.tsx:L105-L116
- Notes: The user must override the type for it to route; the routing blocks with 'couldn't identify anything usable' otherwise.
- Related: WD-IMPL-FACT-0058
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-053,WD-IDEA-INPUT-054,WD-IDEA-INPUT-055,WD-IDEA-INPUT-056,WD-IDEA-INPUT-057,WD-IDEA-INPUT-058,WD-IDEA-INPUT-059 || PARTIAL_MATCH: WD-IDEA-INPUT-070

### WD-IMPL-CAP-0113 Override a file's type
- Behavior: A per-file select sets typeOverride (script/treatment/beat_sheet/character_notes/unclassified), which wins over the server classification in effectiveType(). An explicit 'script' override bypasses the client confidence check in routing.
- Trigger / entrypoint: Type <select> in file row
- Preconditions: file status success
- Code path: setTypeOverride
- Data touched: React
- Downstream effects: computeStreamlineRouting
- Status: P=Y R=Y F=P P=N T=Y
- Evidence: src/components/pipeline/streamline/StreamlineDropZone.tsx:L221-L223; src/components/pipeline/streamline/StreamlineDropZone.tsx:L389-L397; src/lib/utils/streamlineRouting.ts:L31-L42; streamlineRouting.test.ts 'honors an explicit screenplay override'
- Notes: Overriding to character_notes yields no asset draft (drafts are produced only server-side at extract time). Overriding to script on a low-confidence file locks Stage 4 but skips scene persistence.
- Related: WD-IMPL-FACT-0056, WD-IMPL-FACT-0060
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-053,WD-IDEA-INPUT-054,WD-IDEA-INPUT-055,WD-IDEA-INPUT-056,WD-IDEA-INPUT-057,WD-IDEA-INPUT-058,WD-IDEA-INPUT-059 || PARTIAL_MATCH: WD-IDEA-INPUT-080,WD-IDEA-INPUT-081,WD-IDEA-INPUT-082,WD-IDEA-INPUT-083,WD-IDEA-INPUT-084,WD-IDEA-INPUT-085,WD-IDEA-INPUT-086,WD-IDEA-INPUT-087

### WD-IMPL-CAP-0114 Set primary file / remove file
- Behavior: The star button sets isPrimary (the first file defaults to primary; removing the primary re-assigns it to the first remaining file). isPrimary only adds a '(PRIMARY)' tag in the Ask Auteur prompt; routing ignores it.
- Trigger / entrypoint: Star / X buttons
- Preconditions: none
- Code path: setPrimary/removeFile
- Data touched: React
- Downstream effects: analyze prompt
- Status: P=Y R=Y F=P P=N T=Y
- Evidence: src/components/pipeline/streamline/StreamlineDropZone.tsx:L207-L219; backend/src/services/streamlineQuestionService.ts:L73-L77; StreamlineDropZone.test.tsx 'primary-file selection persists in session state'
- Notes: The four-tier authority util (resolveConflict) that would use isPrimary is orphaned.
- Related: WD-IMPL-DEAD-0008

### WD-IMPL-CAP-0115 Retry failed file extraction
- Behavior: The Retry button on an errored file shows only the toast 'Re-select the file to retry'. No request is made.
- Trigger / entrypoint: RefreshCw icon on an errored row
- Preconditions: file status error
- Code path: retryFile
- Data touched: none
- Downstream effects: none
- Status: P=P R=Y F=N P=N T=N | labels: PARTIAL
- Evidence: src/components/pipeline/streamline/StreamlineDropZone.tsx:L191-L194; src/components/pipeline/streamline/StreamlineDropZone.tsx:L370-L374
- Notes: The original File bytes are not retained.
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-060,WD-IDEA-INPUT-061,WD-IDEA-INPUT-062,WD-IDEA-INPUT-063,WD-IDEA-INPUT-064,WD-IDEA-INPUT-065,WD-IDEA-INPUT-066,WD-IDEA-INPUT-067

### WD-IMPL-CAP-0116 Per-file As-is / AI-format choice
- Behavior: For treatment/beat_sheet files, clicking AI-format calls /streamline/format-file once and stores formattedText/formattedBeats. The default formatChoice is 'ai-format' when confidence < 0.75, but formatting is not auto-run. Routing ignores formatChoice and always prefers the formatted output if any.
- Trigger / entrypoint: As-is / AI-format buttons
- Preconditions: effective type treatment or beat_sheet; file has text
- Code path: setFormatChoice -> runAiFormat -> streamlineService.formatFile -> POST format-file -> formatAsTreatment\|formatAsBeatSheet
- Data touched: React formattedText/formattedBeats
- Downstream effects: buildTreatmentContent/buildBeatSheetContent -> commit
- Status: P=Y R=Y F=P P=P T=P | labels: CONTRADICTED
- Evidence: src/components/pipeline/streamline/StreamlineDropZone.tsx:L128; src/components/pipeline/streamline/StreamlineDropZone.tsx:L225-L251; src/lib/utils/streamlineRouting.ts:L167-L190; backend/src/routes/streamline.ts:L318-L353; streamlineFormatFile.test.ts; streamlineRouting.test.ts 'uses the AI-formatted text over the raw text when present'
- Notes: Persisted only as the committed Stage 2/3 content. Choosing As-is after formatting still commits the formatted text.
- Related: WD-IMPL-AI-0029, WD-IMPL-AI-0030, WD-IMPL-FACT-0053
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-INPUT-088,WD-IDEA-INPUT-089,WD-IDEA-INPUT-090,WD-IDEA-INPUT-091,WD-IDEA-INPUT-092

### WD-IMPL-CAP-0117 Standalone Stage 5 asset draft from character/location notes
- Behavior: When the server classifies a file as character_notes, extract-file makes one more LLM call to prefill {name,type,description}. The draft shows as a badge and is committed as a project_assets row with source 'extracted'.
- Trigger / entrypoint: automatic on extract
- Preconditions: server classification character_notes
- Code path: extract-file -> extractStandaloneAssetDraft -> routing.assetDrafts -> commit assets[]
- Data touched: project_assets
- Downstream effects: Stage 5 asset list
- Status: P=Y R=Y F=P P=Y T=Y
- Evidence: backend/src/routes/streamline.ts:L219-L237; backend/src/services/streamlineStandaloneAssetService.ts:L19-L45; src/lib/utils/streamlineRouting.ts:L87-L92; src/components/pipeline/Stage1InputMode.tsx:L466-L472; streamlineExtractFile.test.ts 'enriches character_notes'
- Notes: Not re-derived after reconciliation. Not produced for user-overridden character_notes. Draft fields are not editable in the UI before commit. The review line counts all notes files even when some lack drafts.
- Related: WD-IMPL-AI-0028, WD-IMPL-TABLE-0014
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-093,WD-IDEA-INPUT-094,WD-IDEA-INPUT-095,WD-IDEA-INPUT-096,WD-IDEA-INPUT-097,WD-IDEA-INPUT-098,WD-IDEA-INPUT-099,WD-IDEA-INPUT-100,WD-IDEA-INPUT-101,WD-IDEA-INPUT-102

### WD-IMPL-CAP-0118 Batch reference image upload + AI classification
- Behavior: Images (PNG/JPEG/WebP <=10MB, max 20) are each uploaded to the storage bucket asset-images at project/{id}/streamline-staging/ and classified by Gemini Vision into {name,type,description}. The guessed name is fuzzy-matched to known note-draft names. Cards default to accepted.
- Trigger / entrypoint: Reference images drop zone
- Preconditions: owned project
- Code path: processFiles -> streamlineService.classifyImage -> POST classify-image -> storage.upload -> ImageAnalysisService.classifyUploadedImage
- Data touched: Supabase storage asset-images/project/{id}/streamline-staging/*
- Downstream effects: routing.assetDrafts -> project_assets.image_key_url
- Status: P=Y R=Y F=Y P=P T=Y
- Evidence: src/components/pipeline/streamline/StreamlineImageReviewGrid.tsx:L25-L107; src/lib/services/streamlineService.ts:L202-L225; backend/src/routes/streamline.ts:L256-L308; backend/src/services/imageAnalysisService.ts:L165-L201; StreamlineImageReviewGrid.test.tsx; streamlineClassifyImage.test.ts
- Notes: Storage object persisted immediately and never deleted, even if the card is removed or the commit never happens. A classification failure returns the fallback 'Unnamed subject'/character/conf 0.
- Related: WD-IMPL-AI-0033, WD-IMPL-STATE-0032
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-114,WD-IDEA-PHIL-012 || EXACT_MATCH: WD-IDEA-ASSET-138 || NOT_IMPLEMENTED: WD-IDEA-ASSET-139 || PARTIAL_MATCH: WD-IDEA-PHIL-019 || PARTIAL_MATCH: WD-IDEA-INPUT-071,WD-IDEA-INPUT-072,WD-IDEA-INPUT-073 || PARTIAL_MATCH: WD-IDEA-INPUT-103,WD-IDEA-INPUT-104,WD-IDEA-INPUT-105,WD-IDEA-INPUT-106,WD-IDEA-INPUT-107,WD-IDEA-INPUT-108,WD-IDEA-INPUT-109

### WD-IMPL-CAP-0119 Edit/accept/skip/remove image cards
- Behavior: Name, type and description are freely editable per card; the accept toggle controls inclusion in routing; X removes the card (but not the stored file).
- Trigger / entrypoint: card inputs/buttons
- Preconditions: card exists
- Code path: updateCard/removeCard
- Data touched: React
- Downstream effects: commit assets[]
- Status: P=Y R=Y F=Y P=N T=Y
- Evidence: src/components/pipeline/streamline/StreamlineImageReviewGrid.tsx:L119-L125; src/components/pipeline/streamline/StreamlineImageReviewGrid.tsx:L175-L208; src/lib/utils/streamlineRouting.ts:L59; StreamlineImageReviewGrid.test.tsx 'toggling accept/skip'
- Notes: Heavyweight image actions (edit/style/bg) are intentionally absent; they exist only in EnhancedUploadModal after the asset exists.
- Related: WD-IMPL-CAP-0118
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-071,WD-IDEA-INPUT-072,WD-IDEA-INPUT-073 || PARTIAL_MATCH: WD-IDEA-INPUT-103,WD-IDEA-INPUT-104,WD-IDEA-INPUT-105,WD-IDEA-INPUT-106,WD-IDEA-INPUT-107,WD-IDEA-INPUT-108,WD-IDEA-INPUT-109

### WD-IMPL-CAP-0120 Ask Auteur automatic clarification analysis
- Behavior: When every in-flight file extraction settles, Stage 1 calls /streamline/analyze once per component mount with all successful files' text. The returned multiple-choice questions replace the review screen until they are answered or declined.
- Trigger / entrypoint: automatic (onBatchSettled)
- Preconditions: projectId!=='new'; >=1 success file with text; ref not yet set
- Code path: onBatchSettled -> runAskAuteurAnalysis -> streamlineService.analyze -> POST analyze -> analyzeBatch
- Data touched: React askAuteurQuestions
- Downstream effects: AskAuteurQuestionUI
- Status: P=Y R=Y F=P P=N T=Y
- Evidence: src/components/pipeline/streamline/StreamlineDropZone.tsx:L105-L116; src/components/pipeline/Stage1InputMode.tsx:L310; src/components/pipeline/Stage1InputMode.tsx:L319-L337; src/components/pipeline/Stage1InputMode.tsx:L682-L697; backend/src/routes/streamline.ts:L363-L390; streamlineAnalyzeReconcileRoutes.test.ts; streamlineQuestion.test.ts
- Notes: Runs only once (askAuteurRequestedRef). Not triggered for paste-only batches. Analysis errors are silent. Commit is not blocked while analysis is in flight.
- Related: WD-IMPL-AI-0031, WD-IMPL-STATE-0035, WD-IMPL-FACT-0058
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-114,WD-IDEA-UX-115,WD-IDEA-UX-116,WD-IDEA-UX-117,WD-IDEA-UX-118,WD-IDEA-UX-119 || EXACT_MATCH: WD-IDEA-CONT-037 || UNKNOWN: WD-IDEA-PHIL-024 || PARTIAL_MATCH: WD-IDEA-PHIL-066 || PARTIAL_MATCH: WD-IDEA-INPUT-053,WD-IDEA-INPUT-054,WD-IDEA-INPUT-055,WD-IDEA-INPUT-056,WD-IDEA-INPUT-057,WD-IDEA-INPUT-058,WD-IDEA-INPUT-059 || PARTIAL_MATCH: WD-IDEA-INPUT-111,WD-IDEA-INPUT-112,WD-IDEA-INPUT-113,WD-IDEA-INPUT-114,WD-IDEA-INPUT-115,WD-IDEA-INPUT-116,WD-IDEA-INPUT-117,WD-IDEA-INPUT-118,WD-IDEA-INPUT-119,WD-IDEA-INPUT-120,WD-IDEA-INPUT-121,WD-IDEA-INPUT-122,+1

### WD-IMPL-CAP-0121 Answer Ask Auteur questions and reconcile documents
- Behavior: The user picks an option or types a freetext answer for every question. Submit builds resolutions (client_id r{i}) and calls /streamline/reconcile, which returns full revised document texts with editScope. Non-cascade edits are applied to in-memory file text immediately; structural_cascade edits wait for the confirmation dialog.
- Trigger / entrypoint: 'Submit N answers'
- Preconditions: all questions answered
- Code path: handleSubmit -> handleAskAuteurSubmit -> streamlineService.reconcile -> POST reconcile -> reconcileDocuments
- Data touched: React file.text, resolutionsForCommit, resolutionEditsForCommit
- Downstream effects: commit resolutions/resolution_edits; stage content
- Status: P=Y R=Y F=P P=P T=P
- Evidence: src/components/pipeline/streamline/AskAuteurQuestionUI.tsx:L39-L126; src/components/pipeline/Stage1InputMode.tsx:L347-L406; backend/src/routes/streamline.ts:L400-L430; backend/src/services/streamlineReconciliationService.ts:L74-L105; AskAuteurQuestionUI.test.tsx; streamlineReconciliation.test.ts
- Notes: Resolutions and edits persist only at commit. All edits are attributed to r0. Stale formattedText defeats the reconciled edits. Stage1 handler untested.
- Related: WD-IMPL-AI-0032, WD-IMPL-CAP-0123, WD-IMPL-FACT-0054, WD-IMPL-FACT-0055
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-037 || PARTIAL_MATCH: WD-IDEA-INPUT-111,WD-IDEA-INPUT-112,WD-IDEA-INPUT-113,WD-IDEA-INPUT-114,WD-IDEA-INPUT-115,WD-IDEA-INPUT-116,WD-IDEA-INPUT-117,WD-IDEA-INPUT-118,WD-IDEA-INPUT-119,WD-IDEA-INPUT-120,WD-IDEA-INPUT-121,WD-IDEA-INPUT-122,+1 || PARTIAL_MATCH: WD-IDEA-STORY-082,WD-IDEA-STORY-083,WD-IDEA-STORY-084,WD-IDEA-STORY-085

### WD-IMPL-CAP-0122 Decline Ask Auteur questions
- Behavior: 'Skip these questions' records every question as a resolution with selected_answer null and answer_source ai_inferred, with no reconcile call.
- Trigger / entrypoint: 'Skip these questions'
- Preconditions: questions shown
- Code path: handleAskAuteurDecline
- Data touched: intake_resolutions (on commit)
- Downstream effects: ContextManager facts
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/components/pipeline/Stage1InputMode.tsx:L408-L424; AskAuteurQuestionUI.test.tsx 'decline calls onDecline'
- Notes: Declined rows later inject question_text as an 'ESTABLISHED FACT' wherever facts are injected.
- Related: WD-IMPL-TABLE-0015, WD-IMPL-FACT-0057
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-037 || EXACT_MATCH: WD-IDEA-FLOW-127 || PARTIAL_MATCH: WD-IDEA-INPUT-111,WD-IDEA-INPUT-112,WD-IDEA-INPUT-113,WD-IDEA-INPUT-114,WD-IDEA-INPUT-115,WD-IDEA-INPUT-116,WD-IDEA-INPUT-117,WD-IDEA-INPUT-118,WD-IDEA-INPUT-119,WD-IDEA-INPUT-120,WD-IDEA-INPUT-121,WD-IDEA-INPUT-122,+1

### WD-IMPL-CAP-0123 Structural cascade confirmation dialog
- Behavior: Reconciled documents classified structural_cascade by the LLM are shown in a dialog listing file plus diffSummary. Apply writes the LLM full-text rewrite into in-memory file text; Cancel keeps the original text and drops those files' resolution_edits. Commit is blocked while it is pending.
- Trigger / entrypoint: auto-open when pendingCascade set
- Preconditions: reconcile returned >=1 structural_cascade doc
- Code path: setPendingCascade -> dialog -> handleCascadeConfirm\|handleCascadeCancel
- Data touched: React file.text, resolutionEditsForCommit
- Downstream effects: committed stage content, intake_resolution_edits
- Status: P=Y R=Y F=Y P=P T=P
- Evidence: src/components/pipeline/streamline/StructuralCascadeConfirmDialog.tsx:L22-L50; src/components/pipeline/Stage1InputMode.tsx:L379-L397; src/components/pipeline/Stage1InputMode.tsx:L426-L442; src/components/pipeline/Stage1InputMode.tsx:L451; StructuralCascadeConfirmDialog.test.tsx
- Notes: Only scope-gated: word_patch/paragraph_rewrite also replace full text but silently. The scope label is the LLM's self-assessment.
- Related: WD-IMPL-INVALIDATE-0027
- Related product intent: PARTIAL_MATCH: WD-IDEA-PHIL-066 || NOT_IMPLEMENTED: WD-IDEA-FLOW-067,WD-IDEA-FLOW-068,WD-IDEA-FLOW-069,WD-IDEA-FLOW-070 || PARTIAL_MATCH: WD-IDEA-INPUT-111,WD-IDEA-INPUT-112,WD-IDEA-INPUT-113,WD-IDEA-INPUT-114,WD-IDEA-INPUT-115,WD-IDEA-INPUT-116,WD-IDEA-INPUT-117,WD-IDEA-INPUT-118,WD-IDEA-INPUT-119,WD-IDEA-INPUT-120,WD-IDEA-INPUT-121,WD-IDEA-INPUT-122,+1 || PARTIAL_MATCH: WD-IDEA-STORY-082,WD-IDEA-STORY-083,WD-IDEA-STORY-084,WD-IDEA-STORY-085

### WD-IMPL-CAP-0124 Pre-commit review screen with routing preview
- Behavior: Shows successful files with confidence, a failed-file notice, 'What happens next' lines from computeStreamlineRouting, a fixed-text credit estimate, the Ask Auteur edit summaries, and the blocked reason. The button is 'Confirm & Skip Ahead'.
- Trigger / entrypoint: rendered when files/images exist and no open questions
- Preconditions: none
- Code path: computeStreamlineRouting
- Data touched: none
- Downstream effects: handleStreamlineCommit
- Status: P=Y R=Y F=Y P=N T=Y
- Evidence: src/components/pipeline/streamline/StreamlineReviewScreen.tsx:L37-L116; src/lib/utils/streamlineRouting.ts:L53-L155; StreamlineReviewScreen.test.tsx; streamlineRouting.test.ts
- Notes: Credit estimate is a static string; no computed cost.
- Related: WD-IMPL-FACT-0051
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-114,WD-IDEA-UX-115,WD-IDEA-UX-116,WD-IDEA-UX-117,WD-IDEA-UX-118,WD-IDEA-UX-119 || UNKNOWN: WD-IDEA-UX-004,WD-IDEA-UX-005,WD-IDEA-UX-009,WD-IDEA-UX-011,WD-IDEA-UX-012,WD-IDEA-UX-013,WD-IDEA-UX-014,WD-IDEA-UX-042,WD-IDEA-UX-043,WD-IDEA-UX-101,WD-IDEA-UX-144,WD-IDEA-UX-152,+2 || EXACT_MATCH: WD-IDEA-FLOW-127 || PARTIAL_MATCH: WD-IDEA-INPUT-037,WD-IDEA-INPUT-038,WD-IDEA-INPUT-039,WD-IDEA-INPUT-040,WD-IDEA-INPUT-041,WD-IDEA-INPUT-042,WD-IDEA-INPUT-043,WD-IDEA-INPUT-044,WD-IDEA-INPUT-045,WD-IDEA-INPUT-046,WD-IDEA-INPUT-047,WD-IDEA-INPUT-048,+4 || PARTIAL_MATCH: WD-IDEA-INPUT-053,WD-IDEA-INPUT-054,WD-IDEA-INPUT-055,WD-IDEA-INPUT-056,WD-IDEA-INPUT-057,WD-IDEA-INPUT-058,WD-IDEA-INPUT-059 || PARTIAL_MATCH: WD-IDEA-INPUT-124,WD-IDEA-INPUT-125,WD-IDEA-INPUT-126,WD-IDEA-INPUT-127,WD-IDEA-INPUT-128

### WD-IMPL-CAP-0125 Confirm & Skip Ahead atomic commit
- Behavior: Sends stageTransitions + projectConfig + stage1Draft + assets + resolutions + resolutionEdits to /streamline/commit, which calls the RPC streamline_commit_atomic. One transaction updates projects config, inserts a Stage 1 draft, applies the lock/skip transitions for stages 1-4, and inserts project_assets, intake_resolutions and intake_resolution_edits.
- Trigger / entrypoint: 'Confirm & Skip Ahead' button
- Preconditions: canConfirm; projectId!=='new'; no open questions; no pending cascade
- Code path: handleStreamlineCommit -> streamlineService.commit -> POST commit -> rpc streamline_commit_atomic -> streamline_commit
- Data touched: projects, stage_states (1-4), project_assets, intake_resolutions, intake_resolution_edits
- Downstream effects: scene persistence, ProjectView refresh
- Status: P=Y R=Y F=U P=Y T=P
- Evidence: src/components/pipeline/Stage1InputMode.tsx:L450-L481; src/lib/services/streamlineService.ts:L111-L126; backend/src/routes/streamline.ts:L45-L89; backend/migrations/044_streamline_atomic_intake_fix.sql:L38-L100; backend/migrations/043_intake_resolutions.sql:L137-L460; streamlineCommit.test.ts
- Notes: FUNCTIONAL=U: SQL never tested and live migration state unknown. Route tests mock the RPC.
- Related: WD-IMPL-ROUTE-0023, WD-IMPL-STATE-0030, WD-IMPL-STATE-0031, WD-IMPL-INVALIDATE-0021, WD-IMPL-INVALIDATE-0022, WD-IMPL-INVALIDATE-0026
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-114,WD-IDEA-UX-115,WD-IDEA-UX-116,WD-IDEA-UX-117,WD-IDEA-UX-118,WD-IDEA-UX-119 || EXACT_MATCH: WD-IDEA-FLOW-072,WD-IDEA-FLOW-079 || CONTRADICTED_BY_CODE: WD-IDEA-FLOW-074,WD-IDEA-FLOW-075 || EXACT_MATCH: WD-IDEA-FLOW-127 || PARTIAL_MATCH: WD-IDEA-INPUT-037,WD-IDEA-INPUT-038,WD-IDEA-INPUT-039,WD-IDEA-INPUT-040,WD-IDEA-INPUT-041,WD-IDEA-INPUT-042,WD-IDEA-INPUT-043,WD-IDEA-INPUT-044,WD-IDEA-INPUT-045,WD-IDEA-INPUT-046,WD-IDEA-INPUT-047,WD-IDEA-INPUT-048,+4 || PARTIAL_MATCH: WD-IDEA-INPUT-053,WD-IDEA-INPUT-054,WD-IDEA-INPUT-055,WD-IDEA-INPUT-056,WD-IDEA-INPUT-057,WD-IDEA-INPUT-058,WD-IDEA-INPUT-059 || PARTIAL_MATCH: WD-IDEA-INPUT-060,WD-IDEA-INPUT-061,WD-IDEA-INPUT-062,WD-IDEA-INPUT-063,WD-IDEA-INPUT-064,WD-IDEA-INPUT-065,WD-IDEA-INPUT-066,WD-IDEA-INPUT-067 || PARTIAL_MATCH: WD-IDEA-INPUT-124,WD-IDEA-INPUT-125,WD-IDEA-INPUT-126,WD-IDEA-INPUT-127,WD-IDEA-INPUT-128

### WD-IMPL-CAP-0126 Post-commit scene persistence from imported script
- Behavior: After the RPC succeeds, if a script file passes FE confidence (!='low'), the frontend extracts scenes and calls PUT /api/projects/:id/scenes with the tiptapDoc for deterministic dependency extraction. Zero scenes throws an error after the commit has already landed.
- Trigger / entrypoint: automatic after commit
- Preconditions: script file with FE confidence != low
- Code path: scriptService.extractScenes -> scriptService.persistScenes -> PUT /scenes -> extractManifest
- Data touched: scenes
- Downstream effects: Stage 5 asset extraction, Phase B
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage1InputMode.tsx:L483-L498; src/lib/services/scriptService.ts:L623-L659; backend/src/routes/projects.ts:L1217-L1336
- Notes: Not atomic with the RPC. Not executed for override-to-script low-confidence files. PUT /scenes hard-deletes scenes absent from the new extraction.
- Related: WD-IMPL-INVALIDATE-0026, WD-IMPL-FACT-0056
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-114,WD-IDEA-UX-115,WD-IDEA-UX-116,WD-IDEA-UX-117,WD-IDEA-UX-118,WD-IDEA-UX-119 || PARTIAL_MATCH: WD-IDEA-INPUT-060,WD-IDEA-INPUT-061,WD-IDEA-INPUT-062,WD-IDEA-INPUT-063,WD-IDEA-INPUT-064,WD-IDEA-INPUT-065,WD-IDEA-INPUT-066,WD-IDEA-INPUT-067 || PARTIAL_MATCH: WD-IDEA-INPUT-093,WD-IDEA-INPUT-094,WD-IDEA-INPUT-095,WD-IDEA-INPUT-096,WD-IDEA-INPUT-097,WD-IDEA-INPUT-098,WD-IDEA-INPUT-099,WD-IDEA-INPUT-100,WD-IDEA-INPUT-101,WD-IDEA-INPUT-102 || PARTIAL_MATCH: WD-IDEA-STORY-096,WD-IDEA-STORY-097,WD-IDEA-STORY-098,WD-IDEA-STORY-100

### WD-IMPL-CAP-0127 Land on first unfilled stage after commit
- Behavior: targetStage = 5 if transitions exist for stages 1-4, else the first of 2,3,4 without a transition. ProjectView re-fetches stage_states, re-derives statuses (skipped counts as passed), sets the target active, and navigates.
- Trigger / entrypoint: onStreamlineComplete
- Preconditions: commit + scene persistence succeeded
- Code path: handleStreamlineComplete
- Data touched: React stages; localStorage stage key
- Downstream effects: Stage 2/3/4/5 render
- Status: P=Y R=Y F=Y P=P T=P
- Evidence: src/components/pipeline/Stage1InputMode.tsx:L500-L505; src/pages/ProjectView.tsx:L487-L503; src/pages/ProjectView.tsx:L44-L76; derivePhaseAStages.test.ts
- Notes: The current stage is persisted via setCurrentStageWithPersistence (localStorage key, cross-slice).
- Related: WD-IMPL-CAP-0125
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-114,WD-IDEA-UX-115,WD-IDEA-UX-116,WD-IDEA-UX-117,WD-IDEA-UX-118,WD-IDEA-UX-119 || EXACT_MATCH: WD-IDEA-FLOW-072,WD-IDEA-FLOW-079 || CONTRADICTED_BY_CODE: WD-IDEA-FLOW-074,WD-IDEA-FLOW-075 || PARTIAL_MATCH: WD-IDEA-INPUT-093,WD-IDEA-INPUT-094,WD-IDEA-INPUT-095,WD-IDEA-INPUT-096,WD-IDEA-INPUT-097,WD-IDEA-INPUT-098,WD-IDEA-INPUT-099,WD-IDEA-INPUT-100,WD-IDEA-INPUT-101,WD-IDEA-INPUT-102

### WD-IMPL-CAP-0128 Skipped stage placeholder
- Behavior: When a Phase-A stage's latest status is skipped, ProjectView renders SkippedStagePlaceholder (SKIPPED badge, 'Generate this now' for stages 2/3, 'Write this myself' for all) instead of the stage editor.
- Trigger / entrypoint: navigate to a skipped stage
- Preconditions: stage status skipped
- Code path: ProjectView render switch
- Data touched: none
- Downstream effects: backfill/unskip
- Status: P=Y R=Y F=Y P=N T=Y
- Evidence: src/components/pipeline/SkippedStagePlaceholder.tsx:L22-L70; src/pages/ProjectView.tsx:L902-L965; SkippedStagePlaceholder.test.tsx
- Notes: The stage 4 variant is reachable only if a stage-4 skipped row exists (routing never emits it).
- Related: WD-IMPL-CAP-0129, WD-IMPL-CAP-0130, WD-IMPL-DEAD-0011
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-107,WD-IDEA-UX-108,WD-IDEA-UX-109,WD-IDEA-UX-110,WD-IDEA-UX-111 || PARTIAL_MATCH: WD-IDEA-FLOW-082,WD-IDEA-FLOW-083,WD-IDEA-FLOW-084,WD-IDEA-FLOW-085,WD-IDEA-FLOW-087

### WD-IMPL-CAP-0129 Generate skipped Stage 2/3 from locked script (backfill)
- Behavior: 'Generate this now' POSTs /streamline/backfill/:n. The route requires the latest row to be skipped and Stage 4 locked with formattedScript, generates a treatment or beats via LLM, and inserts a new stage_states row status locked, origin ai-generated.
- Trigger / entrypoint: 'Generate this now'
- Preconditions: stage 2 or 3 skipped; stage 4 locked with non-empty formattedScript
- Code path: handleGenerateFromScript -> backfillStage -> POST backfill -> backfillTreatment\|backfillBeatSheet -> insert stage_states
- Data touched: stage_states, projects.updated_at
- Downstream effects: AUTO-FILLED badge
- Status: P=Y R=Y F=U P=Y T=P
- Evidence: src/pages/ProjectView.tsx:L673-L688; src/lib/services/streamlineService.ts:L132-L146; backend/src/routes/streamline.ts:L99-L184; backend/src/services/streamlineBackfillService.ts:L29-L148; streamlineCommit.test.ts backfill describe
- Notes: Locks directly without a draft review. Fails with SCRIPT_NOT_LOCKED for beat-sheet-only imports. Tests cover only validation paths.
- Related: WD-IMPL-AI-0002, WD-IMPL-AI-0003, WD-IMPL-STATE-0033
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-086,WD-IDEA-FLOW-088,WD-IDEA-FLOW-089 || PARTIAL_MATCH: WD-IDEA-INPUT-093,WD-IDEA-INPUT-094,WD-IDEA-INPUT-095,WD-IDEA-INPUT-096,WD-IDEA-INPUT-097,WD-IDEA-INPUT-098,WD-IDEA-INPUT-099,WD-IDEA-INPUT-100,WD-IDEA-INPUT-101,WD-IDEA-INPUT-102

### WD-IMPL-CAP-0130 Write skipped stage myself (unskip)
- Behavior: 'Write this myself' calls the generic unlock route with confirm=true, which inserts a draft with content {} and marks downstream locked/outdated Phase-A stages outdated. The UI updates only the unskipped stage locally.
- Trigger / entrypoint: 'Write this myself'
- Preconditions: stage skipped
- Code path: handleWriteMyself -> stageStateService.unlockStage(n,true) -> POST /stages/:n/unlock
- Data touched: stage_states
- Downstream effects: normal stage editor
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/pages/ProjectView.tsx:L654-L669; backend/src/routes/stageStates.ts:L523-L672
- Notes: Unskipping Stage 2 after a script import marks the imported Stage 4 outdated server-side, but the timeline still shows it locked until reload.
- Related: WD-IMPL-STATE-0034, WD-IMPL-INVALIDATE-0024
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-082,WD-IDEA-FLOW-083,WD-IDEA-FLOW-084,WD-IDEA-FLOW-085,WD-IDEA-FLOW-087

### WD-IMPL-CAP-0131 Stage provenance badges (SKIPPED / IMPORTED / AUTO-FILLED)
- Behavior: PhaseTimeline shows badges from getStageBadge(status, origin): skipped -> SKIPPED; locked+imported -> IMPORTED; locked+ai-generated -> AUTO-FILLED with a 'won't update automatically' tooltip; outdated -> OUTDATED.
- Trigger / entrypoint: Phase timeline
- Preconditions: stage_states.origin populated
- Code path: derivePhaseAStages -> getStageBadge
- Data touched: reads stage_states.status/origin
- Downstream effects: none
- Status: P=Y R=Y F=P P=Y T=Y
- Evidence: src/lib/utils/stageBadge.ts:L29-L69; src/components/pipeline/PhaseTimeline.tsx:L29; src/pages/ProjectView.tsx:L57-L68; stageBadge.test.ts
- Notes: The origin subtext on OUTDATED is unreachable because no writer sets origin on outdated rows.
- Related: WD-IMPL-INVALIDATE-0025, WD-IMPL-DEAD-0012
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-107,WD-IDEA-UX-108,WD-IDEA-UX-109,WD-IDEA-UX-110,WD-IDEA-UX-111 || PARTIAL_MATCH: WD-IDEA-FLOW-082,WD-IDEA-FLOW-083,WD-IDEA-FLOW-084,WD-IDEA-FLOW-085,WD-IDEA-FLOW-087

### WD-IMPL-CAP-0132 Ask Auteur 'ESTABLISHED FACTS' injection into later prompts
- Behavior: ContextManager.assembleGlobalContext loads intake_resolutions per branch; formatAuteurResolutions renders 'ESTABLISHED FACTS (do not contradict)'. In production only backfillTreatment injects it, and only when a writing style capsule is present; the Stage 2/3/4 context formatters that include it have no production caller.
- Trigger / entrypoint: backfill treatment
- Preconditions: intake_resolutions rows on the branch; writing style capsule resolved
- Code path: assembleGlobalContext -> fetchAuteurResolutions -> formatForInjection
- Data touched: reads intake_resolutions
- Downstream effects: AI-07 prompt
- Status: P=Y R=P F=P P=Y T=Y | labels: PARTIAL, ORPHANED
- Evidence: backend/src/services/contextManager.ts:L181-L192; backend/src/services/contextManager.ts:L381-L421; backend/src/services/contextManager.ts:L512-L529; backend/src/services/contextManager.ts:L608-L664; backend/src/services/streamlineBackfillService.ts:L61-L63; backend/src/routes/llm.ts:L191-L225; contextManagerAuteurResolutions.test.ts
- Notes: generate-from-template (used by forward Stage 2-4 generation) does not inject resolutions.
- Related: WD-IMPL-TABLE-0015, WD-IMPL-FACT-0057, WD-IMPL-DEAD-0010
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-038

### WD-IMPL-CAP-0133 Skip a Phase-A stage via REST
- Behavior: POST /api/projects/:id/stages/:n/skip inserts a skipped row (content {}, origin skipped) for n in {2,3,4} if the previous stage is locked or skipped and the current stage is not locked. The frontend method stageStateService.skipStage has no caller.
- Trigger / entrypoint: none in UI
- Preconditions: see summary
- Code path: POST /stages/:n/skip
- Data touched: stage_states
- Downstream effects: SkippedStagePlaceholder
- Status: P=Y R=P F=Y P=Y T=Y | labels: ORPHANED
- Evidence: backend/src/routes/stageStates.ts:L414-L519; src/lib/services/stageStateService.ts:L204-L221; streamlineSkip.test.ts
- Notes: Reachable only by raw HTTP.
- Related: WD-IMPL-DEAD-0009
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-082,WD-IDEA-FLOW-083,WD-IDEA-FLOW-084,WD-IDEA-FLOW-085,WD-IDEA-FLOW-087

### WD-IMPL-CAP-0134 EnhancedUploadModal image reconciliation (Stage 5 & Stage 8)
- Behavior: After a manual asset image upload plus analyze-image, a dialog shows current/extracted/final descriptions with a confidence badge and offers Edit Image, Apply Style, Remove BG (not for location) and Regenerate (optional ref) via startEditImageJob plus 2s polling (max 90). It keeps an in-memory image history carousel. Accept saves the final description and selects the matching attempt.
- Trigger / entrypoint: asset image upload in Stage 5 or Stage 8
- Preconditions: upload + analyze succeeded
- Code path: handleUploadImage -> analyzeImage -> setImageAnalysisModal -> EnhancedUploadModal callbacks
- Data touched: project_assets/scene asset instances & attempts (other slices)
- Downstream effects: asset description/image
- Status: P=Y R=Y F=U P=P T=Y
- Evidence: src/components/pipeline/shared/EnhancedUploadModal.tsx:L80-L522; src/components/pipeline/Stage5Assets.tsx:L416-L452; src/components/pipeline/Stage5Assets.tsx:L616-L642; src/components/pipeline/Stage5Assets.tsx:L1479-L1520; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:L810-L851; EnhancedUploadModal.test.tsx; e2e/enhanced-upload-modal.spec.ts
- Notes: Presentational; job/persistence logic belongs to the Stage 5/8 slices. Cancel stops polling but not the server job. Not used by Streamline.
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-112,WD-IDEA-ASSET-113,WD-IDEA-ASSET-115,WD-IDEA-ASSET-116,WD-IDEA-ASSET-117 || EXACT_MATCH: WD-IDEA-ASSET-128 || PARTIAL_MATCH: WD-IDEA-PHIL-040

### WD-IMPL-CAP-0135 FileStagingArea client-side file staging (non-streamline modes)
- Behavior: Expansion (optional), Condensation, Transformation and Script Skip modes stage files with FileReader.readAsText; PDF content is stored as ''; primary file and tag selection; stored in Stage 1 content.uploadedFiles.
- Trigger / entrypoint: file area in non-streamline modes
- Preconditions: mode != streamline
- Code path: processFiles -> readFileContent
- Data touched: stage_states stage 1 content.uploadedFiles (on handleComplete)
- Downstream effects: inputProcessingService.processInput
- Status: P=Y R=Y F=P P=Y T=N | labels: DUPLICATED
- Evidence: src/components/pipeline/FileStagingArea.tsx:L37-L159; src/components/pipeline/Stage1InputMode.tsx:L652-L655; src/components/pipeline/Stage1InputMode.tsx:L711-L714
- Notes: No server extraction, unlike Streamline. .doc/.docx read as text (binary garbage) and PDF yields empty content. V3 owns downstream use.
- Related: WD-IMPL-PRESSURE-0003
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-015,WD-IDEA-FLOW-017,WD-IDEA-FLOW-018,WD-IDEA-FLOW-019 || EXACT_MATCH: WD-IDEA-FLOW-127 || PARTIAL_MATCH: WD-IDEA-INPUT-030,WD-IDEA-INPUT-031,WD-IDEA-INPUT-032,WD-IDEA-INPUT-033

## Project assets (Stage 5)

### WD-IMPL-CAP-0136 Scan Script for Assets (instant preview, no LLM)
- Behavior: User clicks Scan Script for Assets after choosing a style. Server aggregates characters, props and locations from scenes.expected_* per branch, falling back to Stage 4 tiptapDoc manifest. Nothing is persisted; opens AssetFilterModal.
- Trigger / entrypoint: Stage5Assets.tsx handleExtractAssets button (line 976-995)
- Preconditions: isStyleLocked true; hasExtracted false (button hidden once any asset exists)
- Code path: Stage5Assets.tsx:319-351 -> projectAssetService.extractPreview (projectAssetService.ts:47-68) -> POST /api/projects/:projectId/assets/extract-preview (projectAssets.ts:165-267) -> AssetExtractionService.aggregatePreview -> aggregateSceneDependencies (assetExtractionService.ts:140-274); fallback extractManifest (utils/scriptManifest.ts:280)
- Data touched: READ scenes(scene_number,script_excerpt,expected_characters,expected_location,expected_props); READ projects; READ stage_states stage 4 (fallback only)
- Downstream effects: AssetFilterModal entities -> CAP-02
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: 
- Notes: Dedupe is case-insensitive name only, type-agnostic (assetExtractionService.ts:174,210,244). Button hidden after first asset exists so re-scan is not offered in UI.
- Related: WD-IMPL-CAP-0137, WD-IMPL-ENTITY-0011
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-040,WD-IDEA-ASSET-042 || EXACT_MATCH: WD-IDEA-ASSET-051

### WD-IMPL-CAP-0137 Confirm extraction selection (LLM distillation, insert project_assets)
- Behavior: User marks each entity keep/defer/delete and confirms. Server runs one sequential Gemini distillation call per kept or deferred entity and inserts one project_assets row each. No idempotency: repeated confirms insert duplicates.
- Trigger / entrypoint: AssetFilterModal Confirm Selection button (AssetFilterModal.tsx:220-232)
- Preconditions: Stage 5 locked_visual_style_capsule_id or manual_visual_tone present (projectAssets.ts:304-311); at least one keep/defer decision
- Code path: AssetFilterModal.tsx:98-107 -> Stage5Assets.handleConfirmSelection (:354-377) -> projectAssetService.extractConfirm (projectAssetService.ts:73-98) -> POST extract-confirm (projectAssets.ts:273-377) -> AssetExtractionService.extractSelectedAssets (assetExtractionService.ts:63-97) -> distillVisualSummary per entity (:521-652) -> insert project_assets
- Data touched: READ scenes, stage_states(5), style_capsules(name,descriptor_strings,design_pillars); WRITE project_assets (source extracted, deferred, scene_numbers)
- Downstream effects: Stage5 assets state replaced with returned rows (Stage5Assets.tsx:364)
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: 
- Notes: Decision state in AssetFilterModal is initialised from empty entities on mount (AssetFilterModal.tsx:48-55) so counts start at 0 and Confirm is disabled until a decision click. Confidence, priority and conflict outputs are discarded at insert. Failure of a single distillation falls back to joined placeholder mention text (assetExtractionService.ts:637-651). Status P because runtime confirmation of the disabled-button behaviour is UNKNOWN without running the UI.
- Related: WD-IMPL-AI-0004, WD-IMPL-CAP-0136, WD-IMPL-STATE-0037
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-051 || EXACT_MATCH: WD-IDEA-ASSET-052,WD-IDEA-ASSET-053

### WD-IMPL-CAP-0138 Add Asset manually / Add Extra Archetype
- Behavior: User creates a project asset with name, type, description. Scene numbers field is parsed client-side but not sent.
- Trigger / entrypoint: Stage5Assets Add Asset / Add Extra Archetype buttons (Stage5Assets.tsx:1051-1068)
- Preconditions: Stage not locked or outdated
- Code path: AddAssetModal.tsx:72-76 -> projectAssetService.createAsset (projectAssetService.ts:298-320) -> POST /api/projects/:projectId/assets (projectAssets.ts:1130-1204) -> insert project_assets source manual locked false
- Data touched: WRITE project_assets; READ stage_states(5) for capsule fallback
- Downstream effects: Stage5 loadAssets refresh (AddAssetModal onAssetCreated)
- Status: P=Y R=Y F=Y P=Y T=N | labels: PARTIAL
- Evidence: 
- Notes: Route accepts scene_numbers (projectAssets.ts:1134,1189) but AddAssetModal does not send it (AddAssetModal.tsx:67-76 computes and discards). Route requires name, asset_type, description.
- Related: WD-IMPL-ROUTE-0042

### WD-IMPL-CAP-0139 Edit visual description (debounced autosave)
- Behavior: Expanded card textarea saves to project_assets.description after a 1 second debounce; empty strings are not saved.
- Trigger / entrypoint: Stage5Assets Edit Details menu then Textarea (Stage5Assets.tsx:1258-1281)
- Preconditions: Stage not locked or outdated; for locked assets PUT returns 400 (text fields frozen)
- Code path: Stage5Assets.handleDescriptionChange (:502-523) -> handleUpdateDescription -> projectAssetService.updateAsset (:189-215) -> PUT /api/projects/:projectId/assets/:assetId (projectAssets.ts:553-667)
- Data touched: WRITE project_assets.description; WRITE overridden_fields when global_asset_id set
- Downstream effects: Description feeds generate-image prompt (projectAssets.ts:1240) and angle prompts
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Locked assets reject description edits with 400 Cannot modify locked asset (projectAssets.ts:585-590).
- Related: WD-IMPL-STATE-0036, WD-IMPL-STATE-0040
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-307,WD-IDEA-UX-308

### WD-IMPL-CAP-0140 Defer / Restore asset
- Behavior: Moves an asset between active and deferred sections. Deferred assets are excluded from the gate but remain in Stage 8 inheritance.
- Trigger / entrypoint: Card menu Defer Asset and Deferred section Restore button (Stage5Assets.tsx:1171-1176,1402-1411)
- Preconditions: Stage not locked or outdated (menu); restore available only when not locked/outdated
- Code path: Stage5Assets.handleDeferAsset/handleRestoreAsset (:545-569) -> projectAssetService.deferAsset/restoreAsset -> updateAsset(deferred) -> PUT (projectAssets.ts:596-598)
- Data touched: WRITE project_assets.deferred
- Downstream effects: lock-all excludes deferred (projectAssets.ts:1703-1704); assetInheritanceService includes deferred (assetInheritanceService.ts:188)
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Deferred toggle is allowed on locked assets (projectAssets.ts:583-585).
- Related: WD-IMPL-STATE-0037
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-054,WD-IDEA-ASSET-055,WD-IDEA-ASSET-056 || PARTIAL_MATCH: WD-IDEA-ASSET-066 || PARTIAL_MATCH: WD-IDEA-ASSET-065,WD-IDEA-ASSET-067,WD-IDEA-ASSET-068 || EXACT_MATCH: WD-IDEA-ASSET-098,WD-IDEA-ASSET-104

### WD-IMPL-CAP-0141 Change asset type (single and bulk)
- Behavior: Changes asset_type among character, prop, location, extra_archetype.
- Trigger / entrypoint: Card menu Change Type submenu (Stage5Assets.tsx:1177-1196) and selection toolbar Change Type (:1697-1719)
- Preconditions: Stage not locked or outdated
- Code path: Stage5Assets.handleChangeType (:571-579) / handleBulkChangeType (:706-718) -> updateAsset(asset_type) -> PUT (projectAssets.ts:618-627)
- Data touched: WRITE project_assets.asset_type; overridden_fields when linked
- Downstream effects: Card grouping and type-specific buttons (Manage Angles, Camera Directions)
- Status: P=Y R=Y F=P P=Y T=Y
- Evidence: 
- Notes: Allowed on locked assets (test assetTypeAndMerge.test.ts:105). Status P because AssetDrawer and AssetMatchModal crash on extra_archetype assets (config.icon undefined) per V5 notes C9.
- Related: WD-IMPL-TEST-0014
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-072,WD-IDEA-ASSET-073,WD-IDEA-ASSET-074,WD-IDEA-ASSET-075 || CONTRADICTED_BY_CODE: WD-IDEA-ASSET-076 || EXACT_MATCH: WD-IDEA-ASSET-098,WD-IDEA-ASSET-104 || EXACT_MATCH: WD-IDEA-ASSET-102 || PARTIAL_MATCH: WD-IDEA-ASSET-106,WD-IDEA-ASSET-107

### WD-IMPL-CAP-0142 Remove asset (single and bulk)
- Behavior: Deletes project_assets rows, cascading attempts, angle variants, location views and scene instances via FK.
- Trigger / entrypoint: Card menu Remove Asset, Deferred section trash, selection toolbar Delete (Stage5Assets.tsx:1226-1233,1412-1419,1721-1730)
- Preconditions: Not locked (server returns 400 Cannot delete locked asset, projectAssets.ts:702-706); browser confirm dialog
- Code path: Stage5Assets.handleDeleteAsset/handleBulkDelete (:532-543,681-692) -> projectAssetService.deleteAsset (:220-239) -> DELETE /assets/:assetId (projectAssets.ts:673-724)
- Data touched: DELETE project_assets; CASCADE project_asset_generation_attempts, asset_angle_variants, location_views, scene_asset_instances; storage objects NOT removed
- Downstream effects: Stage 8 instances lost
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Storage files of deleted assets are not cleaned up by this route.
- Related: WD-IMPL-INVALIDATE-0030
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-054,WD-IDEA-ASSET-055,WD-IDEA-ASSET-056 || EXACT_MATCH: WD-IDEA-ASSET-098,WD-IDEA-ASSET-104 || PARTIAL_MATCH: WD-IDEA-ASSET-105

### WD-IMPL-CAP-0143 Generate or Regenerate master image
- Behavior: Creates a master_asset image job for one asset, polls until done, then reloads the asset. Result becomes selected attempt and image_key_url; style_outdated cleared.
- Trigger / entrypoint: Card Generate or Regenerate button (Stage5Assets.tsx:1337-1352)
- Preconditions: Asset capsule or Stage 5 manual tone present (else createImageJob throws, ImageGenerationService.ts:139-141). Locked assets NOT blocked.
- Code path: Stage5Assets.handleGenerateImage (:379-414) -> projectAssetService.generateImage (:354-380) -> POST /assets/:id/generate-image (projectAssets.ts:1210-1282) -> ImageGenerationService.createImageJob (:109-187) -> executeJobInBackground (:298-582) -> NanoBananaClient.generateImage -> Storage asset-images -> ProjectAssetAttemptsService.createAttempt -> project_assets.image_key_url
- Data touched: WRITE image_generation_jobs; WRITE project_asset_generation_attempts; WRITE project_assets.image_key_url, style_outdated; READ project_assets; READ stage_states(5); READ style_capsules; STORAGE asset-images
- Downstream effects: Carousel refresh via query invalidation; Stage 5 gate
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: 
- Notes: Client poll is 60 x 1s; a timeout toast can appear while the job still completes server-side. Idempotency key is Date.now-based so never deduplicates.
- Related: WD-IMPL-AI-0037, WD-IMPL-PROV-0002, WD-IMPL-STATE-0038, WD-IMPL-STATE-0039, WD-IMPL-ROUTE-0043
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-084

### WD-IMPL-CAP-0144 Upload image for asset, then auto-analyze
- Behavior: User uploads png/jpeg/webp (max 10MB). Stored as a selected attempt, then Gemini Vision analysis runs and opens the enhanced upload modal.
- Trigger / entrypoint: Card Upload button, hidden file input (Stage5Assets.tsx:1311-1335)
- Preconditions: Stage not locked or outdated; file type png/jpeg/webp
- Code path: Stage5Assets.handleUploadImage (:416-467) -> projectAssetService.uploadImage (:325-349) -> POST upload-image (projectAssets.ts:1288-1374) -> Storage asset-images project/{p}/{a}/ -> ProjectAssetAttemptsService.enforceAttemptCap + createAttempt(source uploaded) -> then analyzeImage (projectAssetService.ts:589-614) -> POST analyze-image (projectAssets.ts:1380-1429)
- Data touched: STORAGE asset-images; WRITE project_asset_generation_attempts; WRITE project_assets.image_key_url; READ project_assets
- Downstream effects: EnhancedUploadModal opened (CAP-10)
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: 
- Notes: Upload does not clear style_outdated. Locked assets are not blocked by the server.
- Related: WD-IMPL-AI-0035, WD-IMPL-STATE-0038
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-112,WD-IDEA-ASSET-113,WD-IDEA-ASSET-115,WD-IDEA-ASSET-116,WD-IDEA-ASSET-117 || PARTIAL_MATCH: WD-IDEA-ASSET-114,WD-IDEA-PHIL-012 || EXACT_MATCH: WD-IDEA-ASSET-135 || PARTIAL_MATCH: WD-IDEA-PHIL-040

### WD-IMPL-CAP-0145 Enhanced upload modal: Edit, Apply Style, Remove Background, Regenerate, Accept, Cancel
- Behavior: Post-upload modal offers four image-generation actions, each creating a master_asset job and polling, plus description finalisation. Generated results are persisted immediately as selected attempts; Cancel does not revert them.
- Trigger / entrypoint: EnhancedUploadModal rendered when imageAnalysisModal set (Stage5Assets.tsx:1480-1520)
- Preconditions: Analysis succeeded after upload; Remove Background hidden for location (EnhancedUploadModal.tsx:95 showBackgroundButton)
- Code path: EnhancedUploadModal.handleAction (shared/EnhancedUploadModal.tsx:131-215) -> Stage5Assets onEditImage/onApplyStyle/onRemoveBackground/onRegenerate -> projectAssetService.startEditImageJob (projectAssetService.ts:851-882) -> POST edit-image (projectAssets.ts:1436-1521) -> ImageGenerationService.createImageJob (master_asset) -> poll getImageJobStatus 90 x 2s -> Accept: handleEnhancedUploadAccept (Stage5Assets.tsx:616-642) PUT description + selectAttempt
- Data touched: WRITE image_generation_jobs, project_asset_generation_attempts, project_assets.image_key_url (via attempt), project_assets.description on Accept; READ stage_states(5)
- Downstream effects: Stage 5 gate state
- Status: P=Y R=Y F=P P=Y T=P
- Evidence: 
- Notes: Status P because the reference-image role handling and Accept behaviour are only statically traced; runtime UNKNOWN. e2e/enhanced-upload-modal.spec.ts covers button presence and accept/cancel but is not run here.
- Related: WD-IMPL-AI-0038, WD-IMPL-INVALIDATE-0032, WD-IMPL-ROUTE-0046
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-084 || PARTIAL_MATCH: WD-IDEA-ASSET-091 || EXACT_MATCH: WD-IDEA-ASSET-118,WD-IDEA-ASSET-119,WD-IDEA-ASSET-120,WD-IDEA-ASSET-121,WD-IDEA-ASSET-122,WD-IDEA-ASSET-126,WD-IDEA-ASSET-127 || EXACT_MATCH: WD-IDEA-ASSET-123,WD-IDEA-ASSET-125 || PARTIAL_MATCH: WD-IDEA-INPUT-021

### WD-IMPL-CAP-0146 Browse and select or delete image attempts (carousel)
- Behavior: Carousel lists all attempts for an asset, newest first. Select makes an attempt the active image; delete removes non-selected attempts and their storage object.
- Trigger / entrypoint: ProjectAssetCarousel rendered on every card (Stage5Assets.tsx:1251-1255)
- Preconditions: Stage not locked or outdated for select/delete actions
- Code path: ProjectAssetCarousel.tsx:55-82 (useQuery listAttempts; mutations selectAttempt/deleteAttempt) -> GET attempts (projectAssets.ts:2360-2398, lazy backfill) / POST select (:2404-2428) / DELETE attempt (:2434-2458) -> ProjectAssetAttemptsService (projectAssetAttemptsService.ts:25-245)
- Data touched: READ/WRITE project_asset_generation_attempts; WRITE project_assets.image_key_url on select; STORAGE delete on attempt delete
- Downstream effects: Stage5 card image and gate; invalidates project-assets query which Stage5 does not read
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Stage5 holds assets in local useState, so image_key_url displayed in gate and labels is stale after select until reload (ProjectAssetCarousel.tsx:64 invalidates a query Stage5 does not use).
- Related: WD-IMPL-STATE-0038, WD-IMPL-INVALIDATE-0034
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096 || PARTIAL_MATCH: WD-IDEA-ASSET-124

### WD-IMPL-CAP-0147 Merge assets
- Behavior: Selects 2 or more assets, chooses survivor, optional rename and description, then re-points scene instances and assignments, unions scene_numbers and deletes absorbed assets.
- Trigger / entrypoint: Selection toolbar Merge button (Stage5Assets.tsx:1647-1660) -> MergeDialog
- Preconditions: 2 or more selected active assets; none locked
- Code path: MergeDialog.handleConfirm (MergeDialog.tsx:109-118) -> Stage5Assets.handleMergeConfirm (:720-737) -> projectAssetService.mergeAssets (:244-266) -> POST merge (projectAssets.ts:731-931)
- Data touched: READ/WRITE scene_asset_instances, shot_asset_assignments; WRITE project_assets (survivor scene_numbers, name, description); DELETE absorbed project_assets (CASCADE attempts, angle variants, location views)
- Downstream effects: Stage 8 scene instances; shots.location_asset_id SET NULL on absorbed
- Status: P=Y R=Y F=P P=Y T=P
- Evidence: 
- Notes: Non-transactional sequential writes. Absorbed storage objects are not moved or deleted. Survivor does not inherit absorbed image or location_aliases.
- Related: WD-IMPL-INVALIDATE-0030, WD-IMPL-TEST-0014
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-099,WD-IDEA-ASSET-100,WD-IDEA-ASSET-101

### WD-IMPL-CAP-0148 Merge descriptions with AI (MergeDialog)
- Behavior: Button sends survivor and absorbed descriptions to LLM merge and fills the survivor textarea. Nothing persisted until Confirm Merge.
- Trigger / entrypoint: MergeDialog AI Merge button (MergeDialog.tsx:205-223)
- Preconditions: At least 2 non-empty descriptions
- Code path: MergeDialog.handleAIMerge (:88-107) -> projectAssetService.mergeDescriptions (:785-808) -> POST merge-descriptions (projectAssets.ts:937-975) -> assetDescriptionMerger.mergeDescriptions strategy merge
- Data touched: none persisted
- Downstream effects: Confirm Merge sends updatedDescription only if changed from original
- Status: P=Y R=Y F=Y P=N T=Y
- Evidence: 
- Notes: Survivor description is passed as base and the rest concatenated as additions.
- Related: WD-IMPL-AI-0005, WD-IMPL-TEST-0016

### WD-IMPL-CAP-0149 Split asset variant (scene reassignment)
- Behavior: Three-step wizard creates a manual variant asset with a subset of scenes, reduces the original's scene_numbers, and re-points scene instances in those scenes.
- Trigger / entrypoint: Card menu Split Variant (Stage5Assets.tsx:1197-1206) or toolbar Split Variant (:1670-1677) -> SplitWizard
- Preconditions: Exactly one selected asset with 2 or more scene_numbers; not locked
- Code path: SplitWizard.handleConfirm (SplitWizard.tsx:65-76) -> Stage5Assets.handleSplitConfirm (:739-756) -> projectAssetService.splitAsset (:271-293) -> POST /assets/:assetId/split (projectAssets.ts:981-1124)
- Data touched: WRITE project_assets (insert variant source manual image_key_url null; update original scene_numbers); WRITE scene_asset_instances.project_asset_id
- Downstream effects: Variant has no image; Stage 8 instances follow scenes
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: 
- Notes: Instance re-point errors are logged only (projectAssets.ts:1104-1108). Variant does not inherit image or description if left blank (description falls back to original).
- Related: WD-IMPL-STATE-0042
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-099,WD-IDEA-ASSET-100,WD-IDEA-ASSET-101

### WD-IMPL-CAP-0150 Browse Global Library and clone or match-and-clone asset into project
- Behavior: Drawer lists project or global assets. Cloning a global asset either creates a project asset or matches it with an existing extracted asset, merging descriptions and optionally regenerating an image from the global reference.
- Trigger / entrypoint: Stage5 Browse Global Library button (Stage5Assets.tsx:1043-1050) -> AssetDrawer Clone to Project (AssetDrawer.tsx:629-647)
- Preconditions: Global assets owned by user; target branch belongs to project
- Code path: AssetDrawer.handleCloneAsset (:252-306) -> if extracted assets exist open AssetMatchModal (AssetMatchModal.tsx:111-160) -> projectAssetService.cloneFromGlobal (:511-556) -> POST clone-from-global (projectAssets.ts:1756-2041) -> localizeAssetImage (assetImageLocalizer.ts:33-108) or ImageGenerationService master_asset with referenceImageUrl
- Data touched: READ global_assets; READ stage_states(5); WRITE project_assets (insert or update matched row with global_asset_id, source_version, overridden_fields); STORAGE asset-images copy; WRITE image_generation_jobs if regenerate
- Downstream effects: Stage5 loadAssets; Stage 8 AssetDrawer scene add
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Match path has no lock check. Match overwrites image_key_url via localize without an attempt row. AssetDrawer and AssetMatchModal have no extra_archetype config (crash risk, see V5-DEAD-05).
- Related: WD-IMPL-AI-0039, WD-IMPL-AI-0005, WD-IMPL-STATE-0040, WD-IMPL-INVALIDATE-0033

### WD-IMPL-CAP-0151 Sync available: update linked assets to newer global version
- Behavior: Badge shows count of linked assets whose source_version is below the global version. Update or Update All overwrites fields from global, including overridden ones, and re-localises the image.
- Trigger / entrypoint: AssetVersionSync Sync Available button (AssetVersionSync.tsx:131-145), hidden when zero outdated
- Preconditions: Asset has global_asset_id; asset not locked (server 400)
- Code path: AssetVersionSync.checkVersionSync (:49-63; polled every 30s :38-47) -> GET version-sync-status (projectAssets.ts:431-508); handleSyncAsset/handleSyncAll (:65-120) -> projectAssetService.syncFromGlobal (:759-780) -> POST sync-from-global (projectAssets.ts:2047-2280) -> localizeAssetImage
- Data touched: READ project_assets, global_assets; WRITE project_assets(name, description, image_prompt, image_key_url, visual_style_capsule_id, source_version, last_synced_at, overridden_fields); STORAGE copy
- Downstream effects: Stage5 loadAssets
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Sync force-overwrites overridden fields. Update All is sequential and stops on first error. Global version increments only on global edit or global image generation.
- Related: WD-IMPL-INVALIDATE-0033, WD-IMPL-STATE-0040

### WD-IMPL-CAP-0152 Promote asset to global library
- Behavior: Copies a project asset with image into a new global_assets row owned by user. Does not link back to the project asset and is not deduplicated.
- Trigger / entrypoint: Card menu Promote to Global Library (visible only when image_key_url set), confirm dialog (Stage5Assets.tsx:1219-1224,1522-1542)
- Preconditions: image_key_url non-null; not checked against lock or stage
- Code path: Stage5Assets.handlePromoteToGlobal (:581-584) -> confirmPromotion (:586-609) -> projectAssetService.promoteToGlobal (:485-506) -> POST promote (projectAssets.ts:2286-2350) -> INSERT global_assets
- Data touched: READ project_assets; WRITE global_assets (image_key_url shared URL, promoted_from_project_id)
- Downstream effects: Global library listing
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Each click creates another global asset; no duplicate check. Global image URL is the same object as project image (no copy).
- Related: WD-IMPL-ENTITY-0015

### WD-IMPL-CAP-0153 Lock visual style (capsule or manual tone)
- Behavior: Selects a visual style capsule or a manual tone preset with optional text. Stored only in Stage 5 stage_states content; project_assets not touched.
- Trigger / entrypoint: StyleCapsuleSelector (capsule) or Lock Visual Tone button (manual) (Stage5Assets.tsx:886-943)
- Preconditions: None beyond stage access
- Code path: Stage5Assets.handleStyleLock (:220-234) / handleManualToneLock (:236-259) -> setContent (useStageState autosave) -> stage_states(stage 5).content
- Data touched: WRITE stage_states content (locked_visual_style_capsule_id, manual_visual_tone, manual_tone_preset, style_locked_at)
- Downstream effects: Gate for extraction and generation; read by project asset routes via stage_states latest version
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Locking a new style does not update existing project_assets.visual_style_capsule_id.
- Related: WD-IMPL-STATE-0041, WD-IMPL-INVALIDATE-0028

### WD-IMPL-CAP-0154 Change style: Mark images as outdated or Clear all images
- Behavior: Warning dialog offers two bulk actions. Mark sets style_outdated on all imaged assets; Clear removes all image_key_url and resets style_outdated. Both unlock the Stage 5 style.
- Trigger / entrypoint: Change Style button (Stage5Assets.tsx:846-855) -> StyleChangeWarningDialog (StyleChangeWarningDialog.tsx:44-66)
- Preconditions: Style currently locked and stage not locked or outdated
- Code path: Stage5Assets.handleStyleChangeMarkOutdated (:262-288) -> projectAssetService.markStyleOutdated (:619-640) -> POST mark-style-outdated (projectAssets.ts:1587-1625); handleStyleChangeClearImages (:290-316) -> clearAllImages (:645-666) -> POST clear-all-images (projectAssets.ts:1631-1669); both setContent to clear style
- Data touched: WRITE project_assets.style_outdated or image_key_url/style_outdated; WRITE stage_states content
- Downstream effects: Images must be regenerated; gate fails until images exist
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Clear leaves attempt rows with is_selected true, so carousel still shows the old selected image.
- Related: WD-IMPL-INVALIDATE-0028, WD-IMPL-INVALIDATE-0029, WD-IMPL-STATE-0039
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-034

### WD-IMPL-CAP-0155 Generate All Images (batch)
- Behavior: Sequentially runs generate for every active non-extra asset without image_key_url.
- Trigger / entrypoint: Generate All Images button (Stage5Assets.tsx:1069-1093)
- Preconditions: At least one gate asset without image
- Code path: Stage5Assets loop -> handleGenerateImage (CAP-08) per asset
- Data touched: same as CAP-08 per asset
- Downstream effects: same as CAP-08
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Loop catches errors per asset but handleGenerateImage already toasts; no batch endpoint.
- Related: WD-IMPL-CAP-0143
- Related product intent: PARTIAL_MATCH: WD-IDEA-INPUT-001,WD-IDEA-INPUT-002,WD-IDEA-INPUT-003

### WD-IMPL-CAP-0156 Finalize Assets (lock-all gate, Stage 5 completion)
- Behavior: Server locks all non-deferred assets on active branch after validating that at least one non-extra active asset exists and all gate assets have image_key_url. Then marks Stage 5 locked.
- Trigger / entrypoint: Floating bar Finalize Assets button (Stage5Assets.tsx:1566-1590), shown when hasExtracted and not locked/outdated
- Preconditions: Client gate canProceed (style locked, all gate assets with image, at least one gate asset)
- Code path: Stage5Assets.handleLockAllAssets (:758-789) -> projectAssetService.lockAllAssets (:459-480) -> POST lock-all (projectAssets.ts:1675-1750); then stageStateService.lockStage(projectId,5) (cross-slice) then onComplete
- Data touched: READ project_assets(branch); WRITE project_assets.locked true; WRITE stage_states stage 5 status (cross-slice)
- Downstream effects: Stage 6 gate; Stage 8 inheritance uses locked rows (assetInheritanceService.ts:183-188)
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Server does not check style lock, style_outdated or stage state. Extra archetypes are locked but not required to have images.
- Related: WD-IMPL-STATE-0036, WD-IMPL-ROUTE-0050
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-UX-036 || EXACT_MATCH: WD-IDEA-ASSET-084 || EXACT_MATCH: WD-IDEA-ASSET-108,WD-IDEA-ASSET-110 || EXACT_MATCH: WD-IDEA-FLOW-023,WD-IDEA-FLOW-024,WD-IDEA-FLOW-026 || CONTRADICTED_BY_CODE: WD-IDEA-FLOW-025

### WD-IMPL-CAP-0157 Manage angle variants for a character (generate, redo, delete)
- Behavior: Dialog generates up to four angle views for a character asset, each as an angle_variant job without a reference image, polls status and allows delete.
- Trigger / entrypoint: Card menu Manage Angles on character cards (Stage5Assets.tsx:1207-1212) -> AngleVariantsDialog (AngleVariantsDialog.tsx:34-312)
- Preconditions: asset_type character; style from asset capsule, Stage 5 capsule or manual tone (else 400)
- Code path: AngleVariantsDialog.handleGenerateSingle/All (:109-161) -> projectAssetService.generateAngleVariants (:943-969) -> POST angle-variants/generate (projectAssets.ts:2520-2637) -> upsert asset_angle_variants -> ImageGenerationService.createAngleVariantJob (:249-293) -> executeJobInBackground angle_variant branch (:497-514,575-580)
- Data touched: WRITE asset_angle_variants (upsert, status, image_url, storage_path, image_generation_job_id, prompt_snapshot); WRITE image_generation_jobs; STORAGE asset-images angles/
- Downstream effects: Consumed by frame prompts and reference selection (routes/projects.ts:3665-3690, frames.ts:1729-1741)
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: 
- Notes: Not blocked by lock; not invalidated when master changes. Client polls every 2s while generating. Delete uses variant storage_path.
- Related: WD-IMPL-AI-0040, WD-IMPL-ENTITY-0012, WD-IMPL-STATE-0043
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-097 || PARTIAL_MATCH: WD-IDEA-ASSET-213

### WD-IMPL-CAP-0158 Camera Directions for a location: suggest defaults, add, edit, primary star, upload image, delete
- Behavior: Location cards open a dialog for location_views. Suggest Defaults creates establishing plus two direction views with INT or EXT heuristic. Users can edit alias and description, set primary, upload a reference image, and delete.
- Trigger / entrypoint: Card menu Camera Directions on location cards (Stage5Assets.tsx:1213-1218) -> LocationViewsDialog (LocationViewsDialog.tsx:50-474)
- Preconditions: asset_type location; no restriction on lock state
- Code path: LocationViewsDialog -> projectAssetService.listLocationViews/suggestDefaultViews/createLocationView/updateLocationView/uploadLocationViewImage/deleteLocationView (projectAssetService.ts:1000-1287) -> routes projectAssets.ts:2705-3181
- Data touched: READ/WRITE location_views; READ scenes(script_excerpt) for INT/EXT; STORAGE project/{p}/location-views/
- Downstream effects: Stage 7 and 10 direction selection; locationResolverService; promptGenerationService
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: UI creates direction_N by count+1, so deleting a lower-numbered direction then adding can collide with 409 (projectAssets.ts:2836-2838). No generate-image action in Stage 5 dialog.
- Related: WD-IMPL-AI-0082, WD-IMPL-STATE-0044, WD-IMPL-INVALIDATE-0031, WD-IMPL-ENTITY-0013
- Related product intent: EXACT_MATCH: WD-IDEA-LOC-026,WD-IDEA-LOC-027 || PARTIAL_MATCH: WD-IDEA-LOC-077,WD-IDEA-LOC-078,WD-IDEA-LOC-079,WD-IDEA-LOC-080,WD-IDEA-LOC-081 || EXACT_MATCH: WD-IDEA-LOC-104,WD-IDEA-LOC-105,WD-IDEA-LOC-106 || PARTIAL_MATCH: WD-IDEA-LOC-119,WD-IDEA-LOC-120,WD-IDEA-LOC-121,WD-IDEA-LOC-122,WD-IDEA-LOC-123,WD-IDEA-LOC-124 || PARTIAL_MATCH: WD-IDEA-PHIL-073,WD-IDEA-PHIL-078 || UNKNOWN: WD-IDEA-PHIL-081 || NOT_IMPLEMENTED: WD-IDEA-INPUT-138,WD-IDEA-INPUT-139,WD-IDEA-INPUT-140,WD-IDEA-INPUT-141,WD-IDEA-INPUT-142,WD-IDEA-INPUT-143

### WD-IMPL-CAP-0159 Generate location view image (AI, style from establishing or primary view)
- Behavior: Generates an image for one direction using the establishing or primary view image as style reference, then the client writes the result back to the view.
- Trigger / entrypoint: projectAssetService.generateLocationViewImage, only caller LocationCoveragePanel.tsx:234 (Stage 8)
- Preconditions: Asset capsule or Stage 5 manual tone present; at least one reference image (establishing, primary or master)
- Code path: LocationCoveragePanel -> projectAssetService.generateLocationViewImage (projectAssetService.ts:1216-1264) -> POST location-views/:viewId/generate-image (projectAssets.ts:3298-3448) -> ImageGenerationService.createImageJob (scene_asset, no assetId) -> poll -> PUT location-views/:viewId image_key_url (client write-back)
- Data touched: READ location_views, project_assets, stage_states(5); WRITE image_generation_jobs; STORAGE misc path; WRITE location_views.image_key_url (client)
- Downstream effects: Stage 8/10 coverage
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: 
- Notes: Persistence depends on client completing the poll. If the tab closes or the 60s poll times out, the generated image is never attached to the view.
- Related: WD-IMPL-AI-0082, WD-IMPL-STATE-0044
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-107,WD-IDEA-LOC-108,WD-IDEA-LOC-109,WD-IDEA-LOC-110,WD-IDEA-LOC-111,WD-IDEA-LOC-112,WD-IDEA-LOC-113,WD-IDEA-LOC-114,WD-IDEA-LOC-118 || EXACT_MATCH: WD-IDEA-LOC-115,WD-IDEA-LOC-116,WD-IDEA-LOC-117 || NOT_IMPLEMENTED: WD-IDEA-INPUT-138,WD-IDEA-INPUT-139,WD-IDEA-INPUT-140,WD-IDEA-INPUT-141,WD-IDEA-INPUT-142,WD-IDEA-INPUT-143

### WD-IMPL-CAP-0160 Lock frame as established view (Stage 10 and Stage 8)
- Behavior: Sets a location direction image to a generated frame, marks source established, records provenance and inherits shot camera settings. Replace confirmation shown if direction already has image.
- Trigger / entrypoint: EstablishViewPrompt rendered in Stage10FrameGeneration.tsx (~line 1274) and LocationCoveragePanel.tsx:331
- Preconditions: Frame status generated or approved; frame image present; direction view present
- Code path: EstablishViewPrompt.establishMutation (EstablishViewPrompt.tsx:77-108) -> projectAssetService.establishViewFromFrame (projectAssetService.ts:1171-1206) -> POST location-views/:viewId/establish-from-frame (projectAssets.ts:3193-3287) -> UPDATE location_views; UPDATE frames.promoted_to_view_id
- Data touched: WRITE location_views (image_key_url, source, established_from_scene, established_from_shot_id, promoted_from_frame_id, camera_distance, camera_height); WRITE frames.promoted_to_view_id; READ shots, scenes
- Downstream effects: Future shots using this direction reference the new image
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Route does not verify shot or scene ownership against the project (projectAssets.ts:3227-3239).
- Related: WD-IMPL-INVALIDATE-0031, WD-IMPL-ENTITY-0013
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-232,WD-IDEA-UX-235,WD-IDEA-UX-236,WD-IDEA-UX-238,WD-IDEA-UX-239,WD-IDEA-UX-242,WD-IDEA-UX-245 || PARTIAL_MATCH: WD-IDEA-LOC-230,WD-IDEA-LOC-231,WD-IDEA-LOC-232,WD-IDEA-LOC-233,WD-IDEA-LOC-234,WD-IDEA-LOC-235,WD-IDEA-LOC-236,WD-IDEA-LOC-237,WD-IDEA-LOC-238,WD-IDEA-LOC-239,WD-IDEA-LOC-240,WD-IDEA-LOC-241,+1 || EXACT_MATCH: WD-IDEA-FLOW-064,WD-IDEA-FLOW-065

### WD-IMPL-CAP-0161 Add to Scene from Asset Drawer (shot checklist) - cross-slice entry to asset
- Behavior: Stage 8 drawer adds a project asset to a scene via scene_asset_instance and optional shot assignments. Listed here because the drawer and matching modal are owned by this slice.
- Trigger / entrypoint: AssetDrawer Add to Scene button (AssetDrawer.tsx:620-628), rendered by Stage8VisualDefinition
- Preconditions: sceneId provided by caller
- Code path: AssetDrawer.handleSelectProjectAsset (:203-227) / confirmShotChecklist (:138-170) -> sceneAssetService.createSceneAsset (cross-slice) and shotAssetAssignmentService.createAssignments
- Data touched: WRITE scene_asset_instances, shot_asset_assignments (cross-slice tables)
- Downstream effects: Stage 8/9 prompts
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: 
- Notes: Shot checklist pre-check uses shotAssetMatcher heuristic (AssetDrawer.tsx:124-132).
- Related: WD-IMPL-ROUTE-0042

## Scene assets, Stage 8, transformations

### WD-IMPL-CAP-0162 Stage 8 auto-populate on first entry (inherit then populate, or populate only for scene 1)
- Behavior: On entering Stage 8 with zero instances and stage not locked/outdated, the client calls inherit (scene index>0) then populate-from-dependencies, or populate only for the first scene. Errors are swallowed; the user can still add manually.
- Trigger / entrypoint: Stage8VisualDefinition mount useEffect
- Preconditions: sceneAssets empty, not isLoading, scenes loaded, stage8 not locked or outdated, autoPopulateAttempted false
- Code path: Stage8VisualDefinition.tsx:240-272 -> sceneAssetService.inheritAssets -> R4 -> AssetInheritanceService.inheritAssetsFromPriorScene; populateFromDependencies -> R14
- Data touched: scene_asset_instances insert; project_assets read; scenes read
- Downstream effects: SceneAssetListPanel list; Stage 9/10 read instances
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:240-272; backend/src/routes/sceneAssets.ts:288-344; backend/src/routes/sceneAssets.ts:990-1125
- Notes: If inherit throws, populate is skipped in the same try block. Inherit route returns 400 when instances exist, so reruns depend on the empty-list check.
- Related: WD-IMPL-CAP-0163, WD-IMPL-CAP-0164, WD-IMPL-INVALIDATE-0036
- Related product intent: EXACT_MATCH: WD-IDEA-UX-273,WD-IDEA-UX-277,WD-IDEA-UX-279 || EXACT_MATCH: WD-IDEA-ASSET-149,WD-IDEA-ASSET-150,WD-IDEA-ASSET-151 || EXACT_MATCH: WD-IDEA-FLOW-050,WD-IDEA-FLOW-051,WD-IDEA-FLOW-052

### WD-IMPL-CAP-0163 Inherit button (manual re-run of inheritance)
- Behavior: Button in the scene asset list calls inherit. Backend refuses if the scene already has any instance, so it only works on an empty scene.
- Trigger / entrypoint: Inherit button onClick -> inheritMutation
- Preconditions: scene has zero scene_asset_instances
- Code path: SceneAssetListPanel onInherit -> sceneAssetService.inheritAssets -> POST .../assets/inherit -> AssetInheritanceService
- Data touched: scene_asset_instances insert
- Downstream effects: instance list
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage8/SceneAssetListPanel.tsx:453-472; src/components/pipeline/Stage8VisualDefinition.tsx:428-435; backend/src/routes/sceneAssets.ts:315-325
- Notes: Error toast shows the backend 400 text.
- Related: WD-IMPL-CAP-0162, WD-IMPL-INVALIDATE-0036
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-149,WD-IDEA-ASSET-150,WD-IDEA-ASSET-151

### WD-IMPL-CAP-0164 Deterministic populate from scene expected_characters/location/props
- Behavior: Name-matches scenes.expected_* (case-insensitive) against all project_assets on the active branch and inserts instances with carry_forward=true, status_tags=[], effective_description=asset.description, no image. No LLM.
- Trigger / entrypoint: POST /api/projects/:p/scenes/:s/assets/populate-from-dependencies
- Preconditions: scene exists on active branch
- Code path: sceneAssets.ts:1008-1117 (scene read, project_assets read, existing instance scan, insert)
- Data touched: scenes, project_assets, scene_asset_instances
- Downstream effects: instances used by all Stage 8 panels
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/routes/sceneAssets.ts:990-1125; src/lib/services/sceneAssetService.ts:49-75
- Notes: Does not filter project_assets by locked (unlike bootstrap and relevance). Only called from auto-populate; handleDetectAndPopulateAssets which also calls it is dead.
- Related: WD-IMPL-CAP-0162, WD-IMPL-INVALIDATE-0037
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-007,WD-IDEA-CONT-008 || PARTIAL_MATCH: WD-IDEA-CONT-060,WD-IDEA-CONT-063 || PARTIAL_MATCH: WD-IDEA-CONT-062 || EXACT_MATCH: WD-IDEA-ASSET-149,WD-IDEA-ASSET-150,WD-IDEA-ASSET-151 || PARTIAL_MATCH: WD-IDEA-ASSET-154 || PARTIAL_MATCH: WD-IDEA-ASSET-162 || PARTIAL_MATCH: WD-IDEA-ASSET-160,WD-IDEA-ASSET-161

### WD-IMPL-CAP-0165 Detect with AI: relevance agent creates instances and persists suggestions
- Behavior: Detect with AI calls relevance (LLM) then creates one instance per relevant asset with starting_description as override and status_tags_inherited, and saves new_assets_required as suggestions. Any 409 in Promise.all rejects the whole batch.
- Trigger / entrypoint: Detect with AI button (SceneAssetListPanel onDetectAssets)
- Preconditions: scene on active branch; locked branch project_assets exist
- Code path: handleAIDetectAssets -> detectRelevantAssets -> llmClient -> createSceneAsset xN -> saveSuggestions
- Data touched: scene_asset_instances, scene_asset_suggestions, project_assets.scene_numbers
- Downstream effects: instances start without image so Proceed gatekeeper blocks
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:505-540; backend/src/routes/sceneAssets.ts:122-163; backend/src/routes/sceneAssets.ts:169-282; backend/src/services/sceneAssetRelevanceService.ts:109-157
- Notes: Re-running after an asset is present yields 409 for that asset, so the batch rejects and suggestions are skipped. Instances are created without image.
- Related: WD-IMPL-AI-0075, WD-IMPL-CAP-0187
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-007,WD-IDEA-CONT-008 || EXACT_MATCH: WD-IDEA-CONT-095 || NOT_IMPLEMENTED: WD-IDEA-CONT-096 || PARTIAL_MATCH: WD-IDEA-CONT-062 || PARTIAL_MATCH: WD-IDEA-ASSET-162 || PARTIAL_MATCH: WD-IDEA-ASSET-159,WD-IDEA-ASSET-166

### WD-IMPL-CAP-0166 Add existing project asset to scene from AssetDrawer (with optional shot checklist)
- Behavior: Drawer lists project or global assets; selecting one creates the instance (no description, no image) and, if shots exist, shot_asset_assignments with presenceType throughout for chosen shots.
- Trigger / entrypoint: Add from existing assets button -> AssetDrawer
- Preconditions: scene context provided
- Code path: AssetDrawer -> sceneAssetService.createSceneAsset -> POST .../assets -> insert; shotAssetAssignmentService.createAssignments
- Data touched: scene_asset_instances, shot_asset_assignments, project_assets.scene_numbers
- Downstream effects: Stage 8 list
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/AssetDrawer.tsx:120-260; src/components/pipeline/Stage8VisualDefinition.tsx:846-852; backend/src/routes/sceneAssets.ts:169-282
- Notes: Global-asset path clones into project assets first (handleCloneAsset, not read in detail).
- Related: WD-IMPL-CAP-0165
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-178 || PARTIAL_MATCH: WD-IDEA-ASSET-065,WD-IDEA-ASSET-067,WD-IDEA-ASSET-068 || PARTIAL_MATCH: WD-IDEA-ASSET-159,WD-IDEA-ASSET-166 || PARTIAL_MATCH: WD-IDEA-ASSET-164,WD-IDEA-ASSET-165 || PARTIAL_MATCH: WD-IDEA-ASSET-160,WD-IDEA-ASSET-161

### WD-IMPL-CAP-0167 Create new project asset inline and attach to scene
- Behavior: Inline form creates a locked:true, source:manual project_asset with scene_numbers=[n] and an instance with description_override=effective_description=typed text; compensating delete of the asset if the instance insert fails.
- Trigger / entrypoint: Create new asset button -> inline form -> Create
- Preconditions: name non-empty
- Code path: SceneAssetListPanel handleCreateSubmit -> onSubmitCreate -> createWithProjectAssetMutation -> POST create-with-project-asset
- Data touched: project_assets insert; scene_asset_instances insert
- Downstream effects: project asset library
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8/SceneAssetListPanel.tsx:523-575; backend/src/routes/sceneAssets.ts:885-979
- Notes: Created assets are branch project_assets, so they appear in other scenes' populate and relevance candidates.
- Related: WD-IMPL-FACT-0070
- Related product intent: NOT_IMPLEMENTED: WD-IDEA-INPUT-129,WD-IDEA-INPUT-130,WD-IDEA-INPUT-131,WD-IDEA-INPUT-132,WD-IDEA-INPUT-133,WD-IDEA-INPUT-134,WD-IDEA-INPUT-135,WD-IDEA-INPUT-136,WD-IDEA-INPUT-137

### WD-IMPL-CAP-0168 Remove asset from scene (scene association only)
- Behavior: Context menu or editor Remove opens a confirm dialog, then deletes the instance row; cascades attempts, transformation events and shot assignments. Global project asset stays.
- Trigger / entrypoint: Remove from scene menu item / Remove button
- Preconditions: instance id in scene
- Code path: handleRemoveFromScene -> AlertDialog -> deleteMutation -> sceneAssetService.deleteSceneAsset -> DELETE instance
- Data touched: scene_asset_instances (cascade to attempts, transformation_events, shot_asset_assignments)
- Downstream effects: Stage 8 list refetch
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:679-700,886-904; backend/src/routes/sceneAssets.ts:674-706; backend/migrations/030_transformation_events.sql:14
- Notes: Removing an instance also deletes its transformation events.
- Related: WD-IMPL-INVALIDATE-0042
- Related product intent: NOT_IMPLEMENTED: WD-IDEA-CONT-223 || EXACT_MATCH: WD-IDEA-ASSET-167 || PARTIAL_MATCH: WD-IDEA-ASSET-160,WD-IDEA-ASSET-161

### WD-IMPL-CAP-0169 Edit visual state description with versioning (Save creates version and writes override)
- Behavior: Textarea shows description_override, else effective_description, else project description. Edits stay local until Save, which creates a text_field_versions row (selected) that writes description_override, then PUT updates effective_description.
- Trigger / entrypoint: VersionedTextarea Save button
- Preconditions: value differs from selected version; asset not locked; not use_master_as_is
- Code path: VersionedTextarea handleSave -> textFieldVersionService.createAssetFieldVersion -> POST field-versions -> createVersion (cap, deselect, insert, writeBackToSource) -> onVersionChange -> sceneAssetService.updateSceneAsset -> PUT
- Data touched: text_field_versions; scene_asset_instances.description_override, effective_description
- Downstream effects: prompt gen, frames, relevance context read effective_description
- Status: P=Y R=Y F=P P=Y T=N | labels: DUPLICATED
- Evidence: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:136,561-582,571-577; src/components/pipeline/VersionedTextarea.tsx:136-153; backend/src/routes/sceneAssets.ts:2155-2188,582-668; backend/src/services/textFieldVersionService.ts:62-104,226-241
- Notes: Two requests per save; if the PUT fails effective_description is stale. handleSaveDescription (direct PUT path) is dead.
- Related: WD-IMPL-STATE-0045, WD-IMPL-INVALIDATE-0040

### WD-IMPL-CAP-0170 Browse and restore prior description versions (prev/next arrows)
- Behavior: Arrows call select on an adjacent version (max 8 kept), which writes that content back to description_override, then PUT recomputes effective_description.
- Trigger / entrypoint: VersionedTextarea prev/next buttons
- Preconditions: at least 2 versions
- Code path: handleNavigate -> selectAssetFieldVersion -> POST .../select -> selectVersion -> writeBackToSource; onVersionChange -> PUT
- Data touched: text_field_versions.is_selected; scene_asset_instances.description_override/effective_description
- Downstream effects: same as V6-CAP-08
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/VersionedTextarea.tsx:111-133; backend/src/routes/sceneAssets.ts:2194-2216; backend/src/services/textFieldVersionService.ts:109-140
- Notes: Version list is also backfilled as ai_generation source for legacy overrides.
- Related: WD-IMPL-CAP-0169, WD-IMPL-INVALIDATE-0040

### WD-IMPL-CAP-0171 Add or remove status tags on an instance
- Behavior: Tag editor adds lowercase tags from free text or autocomplete (COMMON_STATUS_TAGS) and removes via x; each change PUTs the full status_tags array with a modification reason.
- Trigger / entrypoint: StatusTagsEditor input / remove button
- Preconditions: instance not locked
- Code path: StatusTagsEditor handleAddTag -> handleStatusTagsChange -> onUpdateAsset -> updateMutation -> PUT statusTags
- Data touched: scene_asset_instances.status_tags, modification_reason
- Downstream effects: image prompt Visual modifiers; prompt gen tag lists; carry-forward
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8/StatusTagsEditor.tsx:47-70; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:287-297; src/lib/constants/statusTags.ts:21-47; backend/src/routes/sceneAssets.ts:636-638
- Notes: projectTags prop never passed, so autocomplete never prioritizes branch tags.
- Related: WD-IMPL-AI-0048, WD-IMPL-STATE-0049
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-047,WD-IDEA-CONT-048 || EXACT_MATCH: WD-IDEA-CONT-049 || EXACT_MATCH: WD-IDEA-CONT-052

### WD-IMPL-CAP-0172 Carry-forward toggle per instance
- Behavior: Switch sets carry_forward. It affects only the next scene inheritance: false resets next scene to master description, no image override, no tags.
- Trigger / entrypoint: Carry forward switch
- Preconditions: none (disabled when locked)
- Code path: handleCarryForwardChange -> PUT carryForward
- Data touched: scene_asset_instances.carry_forward
- Downstream effects: next scene inherit
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8/StatusTagsEditor.tsx:213-233; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:299-309; backend/src/services/assetInheritanceService.ts:114-125
- Notes: Toggling does not change any data in the current scene.
- Related: WD-IMPL-INVALIDATE-0036
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-065 || PARTIAL_MATCH: WD-IDEA-ASSET-081,WD-IDEA-ASSET-083 || EXACT_MATCH: WD-IDEA-ASSET-174,WD-IDEA-ASSET-176,WD-IDEA-ASSET-178 || NOT_IMPLEMENTED: WD-IDEA-ASSET-192,WD-IDEA-ASSET-193,WD-IDEA-ASSET-194,WD-IDEA-ASSET-195,WD-IDEA-ASSET-197,WD-IDEA-ASSET-198,WD-IDEA-ASSET-199 || PARTIAL_MATCH: WD-IDEA-ASSET-196

### WD-IMPL-CAP-0173 Tag carry-forward prompt on entering a scene with inherited tags
- Behavior: If the scene has instances with inherited_from set and non-empty tags, and localStorage key tag-prompt-<scene> is unset, a dialog lets the user keep all, none or a subset; confirm PUTs statusTags per instance.
- Trigger / entrypoint: Stage 8 mount effect
- Preconditions: priorSceneNumber set; inherited instances with tags; localStorage unset
- Code path: useEffect -> TagCarryForwardPrompt -> handleTagCarryForwardConfirm -> sceneAssetService.updateSceneAsset xN
- Data touched: scene_asset_instances.status_tags, modification_reason; browser localStorage
- Downstream effects: tags shown in list and prompts
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:366-410,863-873; src/components/pipeline/Stage8/TagCarryForwardPrompt.tsx:58-140
- Notes: Prompt shows tags already copied by inherit; the dialog only trims them. Dismissing also marks localStorage, so it never reappears in that browser.
- Related: WD-IMPL-STATE-0053, WD-IMPL-CAP-0171
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-047,WD-IDEA-CONT-048 || PARTIAL_MATCH: WD-IDEA-CONT-066 || PARTIAL_MATCH: WD-IDEA-ASSET-081,WD-IDEA-ASSET-083 || EXACT_MATCH: WD-IDEA-ASSET-174,WD-IDEA-ASSET-176,WD-IDEA-ASSET-178 || NOT_IMPLEMENTED: WD-IDEA-ASSET-192,WD-IDEA-ASSET-193,WD-IDEA-ASSET-194,WD-IDEA-ASSET-195,WD-IDEA-ASSET-197,WD-IDEA-ASSET-198,WD-IDEA-ASSET-199

### WD-IMPL-CAP-0174 Lock Asset appends literal 'locked' status tag
- Behavior: Lock Asset button adds the string 'locked' to status_tags. The editor then disables the description, infer, add-transformation and tag editing controls. There is no unlock control in the UI.
- Trigger / entrypoint: Lock Asset button
- Preconditions: tag not already present
- Code path: handleLock -> onUpdateAsset -> PUT statusTags with locked appended
- Data touched: scene_asset_instances.status_tags
- Downstream effects: image prompt, carry-forward, list badges
- Status: P=Y R=Y F=P P=Y T=N | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:311-324,433,469-479,581,590,724,774; src/components/pipeline/Stage8/StatusTagsEditor.tsx:136,150,230; src/components/pipeline/Stage8VisualDefinition.tsx:69-74
- Notes: Generate image, upload, master reference, bulk apply and remove are not blocked. 'locked' persists into image prompts and carries forward. Stage-level lock is a separate concept.
- Related: WD-IMPL-STATE-0049, WD-IMPL-FACT-0073

### WD-IMPL-CAP-0175 Generate single scene asset image (async job, polled)
- Behavior: Generate Image enqueues a scene_asset image job built from effective_description, status-tag modifiers and isolation text. The client polls the job every 2s for up to 120s, then refetches attempts and instances. On completion the backend creates a selected generated attempt and sets image_key_url.
- Trigger / entrypoint: Generate Image button
- Preconditions: Stage 5 visual style or manual tone present; instance not use_master_as_is
- Code path: handleGenerateImage -> sceneAssetService.generateSceneAssetImage -> POST generate-image -> ImageGenerationService.createSceneAssetImageJob -> createImageJob -> executeJobInBackground -> NanoBanana -> storage -> attempts + instance
- Data touched: image_generation_jobs, storage asset-images, scene_asset_generation_attempts, scene_asset_instances
- Downstream effects: reference chain, prompt gen, frames
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:508-525; src/components/pipeline/Stage8VisualDefinition.tsx:638-654,438-454; backend/src/routes/sceneAssets.ts:350-402; backend/src/services/image-generation/ImageGenerationService.ts:193-243,298-495
- Notes: Reference image is the client's image_key_url only when Use as ref is on; otherwise selected_master_reference_url, then project image. Idempotency key includes Date.now so there is no dedupe. Job may complete after the 120s client timeout.
- Related: WD-IMPL-AI-0048, WD-IMPL-STATE-0046, WD-IMPL-INVALIDATE-0039
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-280,WD-IDEA-UX-281,WD-IDEA-UX-283,WD-IDEA-UX-284,WD-IDEA-UX-296,WD-IDEA-UX-297,WD-IDEA-UX-298 || PARTIAL_MATCH: WD-IDEA-UX-175 || PARTIAL_MATCH: WD-IDEA-CONT-045 || EXACT_MATCH: WD-IDEA-CONT-050 || EXACT_MATCH: WD-IDEA-CONT-093 || EXACT_MATCH: WD-IDEA-ASSET-170,WD-IDEA-ASSET-171,WD-IDEA-ASSET-177 || PARTIAL_MATCH: WD-IDEA-ASSET-172

### WD-IMPL-CAP-0176 Bulk generate images for selected instances
- Behavior: Generate (n) opens a cost modal with a hardcoded 1 credit per image, then fires one generate-image request per selected instance and polls all jobs.
- Trigger / entrypoint: Generate button in list (after selection)
- Preconditions: at least one selected
- Code path: handleBulkGenerateClick -> cost modal -> handleBulkGenerateConfirmed -> bulkGenerateImages (Promise.allSettled of R5) -> pollBulkImageJobs
- Data touched: image_generation_jobs, attempts, instances
- Downstream effects: list badges
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:126,591-629,854-861; src/lib/services/sceneAssetService.ts:331-361; src/components/pipeline/Stage8/SceneAssetListPanel.tsx:661-679
- Notes: Does not skip use_master_as_is instances, so a generated attempt becomes selected while the master flag stays true. Failed generate requests are reported as failed statuses with empty jobId.
- Related: WD-IMPL-CAP-0175
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-210,WD-IDEA-GEN-214 || PARTIAL_MATCH: WD-IDEA-PHIL-054,WD-IDEA-PHIL-055,WD-IDEA-PHIL-056

### WD-IMPL-CAP-0177 Attempt carousel: browse, select, delete image attempts
- Behavior: Carousel lists all attempts (backfilling one if none exist). Select sets is_selected and copies its url to image_key_url. Delete is allowed only for non-selected attempts and removes storage when storage_path exists.
- Trigger / entrypoint: Scene instance image carousel
- Preconditions: instance selected
- Code path: GenerationAttemptCarousel -> sceneAssetService.listAttempts/selectAttempt/deleteAttempt -> R15/R16/R17 -> SceneAssetAttemptsService
- Data touched: scene_asset_generation_attempts, scene_asset_instances.image_key_url, storage
- Downstream effects: reference chain reads selected attempt url
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8/GenerationAttemptCarousel.tsx:55-170; backend/src/routes/sceneAssets.ts:1135-1254; backend/src/services/sceneAssetAttemptsService.ts:28-115,121-156,212-236
- Notes: Backfilled attempt is labelled generated even when the URL came from inherit or master.
- Related: WD-IMPL-STATE-0046, WD-IMPL-INVALIDATE-0039
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096 || EXACT_MATCH: WD-IDEA-ASSET-174,WD-IDEA-ASSET-176,WD-IDEA-ASSET-178

### WD-IMPL-CAP-0178 Use master as-is (single and bulk)
- Behavior: Use as Scene Instance Image (or bulk footer) sets use_master_as_is=true, inserts a master_copy attempt selected, sets image_key_url to master url and disables generation, upload and description edits.
- Trigger / entrypoint: Use as Scene Instance Image button / Use Master As-Is footer button
- Preconditions: master url available
- Code path: useMasterAsIsMutation -> setUseMasterAsIs -> POST use-master-as-is; bulkMasterMutation -> POST bulk-use-master-as-is
- Data touched: scene_asset_generation_attempts (master_copy), scene_asset_instances.use_master_as_is, image_key_url
- Downstream effects: prompt gen and frames read use_master_as_is
- Status: P=Y R=Y F=P P=Y T=N | labels: ORPHANED
- Evidence: src/components/pipeline/Stage8/MasterReferenceCarousel.tsx:214-217; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:407-420,515,549,581; src/components/pipeline/Stage8/SceneAssetListPanel.tsx:358-373,779-791; backend/src/routes/sceneAssets.ts:1264-1448
- Notes: Toggle-off path has no UI: UseMasterAsIsCheckbox is never rendered. Only select-master-reference resets the flag.
- Related: WD-IMPL-STATE-0047, WD-IMPL-FACT-0072
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-170,WD-IDEA-ASSET-171,WD-IDEA-ASSET-177

### WD-IMPL-CAP-0179 Select master reference from reference chain
- Behavior: Master Reference carousel lists Stage 5 master, prior-scene selected images and confirmed transformation post images. Select as Reference stores url, source and instance id, and resets use_master_as_is.
- Trigger / entrypoint: Select as Reference button
- Preconditions: chain non-empty
- Code path: selectMutation -> selectMasterReference -> POST select-master-reference -> UPDATE scene_asset_instances
- Data touched: scene_asset_instances.selected_master_reference_*, use_master_as_is
- Downstream effects: generate-image default reference; use-master source
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage8/MasterReferenceCarousel.tsx:53-124,195-216; backend/src/routes/sceneAssets.ts:1458-1661
- Notes: Backend does not verify the url belongs to the chain or that the instance is in this scene. The chain is dedupe by url keeping first.
- Related: WD-IMPL-STATE-0048, WD-IMPL-CAP-0178
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-286,WD-IDEA-UX-287,WD-IDEA-UX-288,WD-IDEA-UX-290,WD-IDEA-UX-291,WD-IDEA-UX-292,WD-IDEA-UX-293,WD-IDEA-UX-294 || EXACT_MATCH: WD-IDEA-CONT-050 || EXACT_MATCH: WD-IDEA-CONT-078 || PARTIAL_MATCH: WD-IDEA-CONT-079 || EXACT_MATCH: WD-IDEA-GEN-114,WD-IDEA-GEN-115,WD-IDEA-GEN-119,WD-IDEA-GEN-138,WD-IDEA-GEN-139 || EXACT_MATCH: WD-IDEA-ASSET-170,WD-IDEA-ASSET-171,WD-IDEA-ASSET-177 || EXACT_MATCH: WD-IDEA-ASSET-174,WD-IDEA-ASSET-176,WD-IDEA-ASSET-178

### WD-IMPL-CAP-0180 Reference chain builder (Stage 5 master, prior-scene images, transformation images)
- Behavior: GET reference-chain assembles a list: Stage 5 master, then for each lower-numbered scene on the branch the same asset's selected attempt url or image_key_url, then confirmed transformation post images with scene number <= current. Deduped by url.
- Trigger / entrypoint: GET reference-chain (MasterReferenceCarousel query)
- Preconditions: instance exists in scene
- Code path: sceneAssets.ts reference-chain handler reads project_assets, scenes, scene_asset_instances, scene_asset_generation_attempts, transformation_events
- Data touched: same tables (read only)
- Downstream effects: carousel display
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: backend/src/routes/sceneAssets.ts:1458-1601
- Notes: Read-only. Scene lookup loops over all prior scenes with one query each. Transformation images from later scenes are excluded.
- Related: WD-IMPL-CAP-0179, WD-IMPL-INVALIDATE-0044
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096 || PARTIAL_MATCH: WD-IDEA-CONT-058 || EXACT_MATCH: WD-IDEA-CONT-078 || PARTIAL_MATCH: WD-IDEA-CONT-079 || EXACT_MATCH: WD-IDEA-GEN-114,WD-IDEA-GEN-115,WD-IDEA-GEN-119,WD-IDEA-GEN-138,WD-IDEA-GEN-139 || PARTIAL_MATCH: WD-IDEA-ASSET-172 || EXACT_MATCH: WD-IDEA-ASSET-174,WD-IDEA-ASSET-176,WD-IDEA-ASSET-178 || NOT_IMPLEMENTED: WD-IDEA-ASSET-187,WD-IDEA-ASSET-188,WD-IDEA-ASSET-189

### WD-IMPL-CAP-0181 Upload custom scene image (PNG/JPEG/WebP, 5MB), then analyze and optional edit
- Behavior: Upload stores the file, creates a selected uploaded attempt, sets image_key_url and clears use_master_as_is. Success triggers vision analysis and an EnhancedUploadModal offering accept or edit actions.
- Trigger / entrypoint: Drop image or click upload zone
- Preconditions: instance not use_master_as_is
- Code path: uploadMutation -> uploadSceneAssetImage -> POST upload-image -> storage asset-images + attempts + instance; onUploadComplete -> analyzeSceneAssetImage -> POST analyze-image
- Data touched: storage asset-images, scene_asset_generation_attempts, scene_asset_instances
- Downstream effects: reference chain, prompt gen
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage8/SceneAssetImageUpload.tsx:14-134; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:327-362,811-851; backend/src/routes/sceneAssets.ts:1671-1777,524-575
- Notes: Analysis failure is non-blocking. Accept saves the final description via PUT descriptionOverride, not through versioning, so no version is recorded.
- Related: WD-IMPL-AI-0035, WD-IMPL-AI-0036, WD-IMPL-CAP-0182
- Related product intent: EXACT_MATCH: WD-IDEA-ASSET-170,WD-IDEA-ASSET-171,WD-IDEA-ASSET-177 || PARTIAL_MATCH: WD-IDEA-INPUT-021

### WD-IMPL-CAP-0182 Edit, regenerate, apply style or remove background via upload modal
- Behavior: Modal actions call edit-image, which builds a scene_asset job from client description and instructions, then polls. Completion creates a generated attempt and updates image_key_url, same as generate.
- Trigger / entrypoint: EnhancedUploadModal onEditImage / onApplyStyle / onRemoveBackground / onRegenerate
- Preconditions: Stage 5 style present
- Code path: startEditImageJob -> POST edit-image -> ImageGenerationService.createImageJob(jobType scene_asset) -> executeJobInBackground
- Data touched: image_generation_jobs, storage, attempts, instances
- Downstream effects: list badges
- Status: P=Y R=Y F=P P=Y T=N | labels: DUPLICATED
- Evidence: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:822-849; backend/src/routes/sceneAssets.ts:408-518; backend/src/services/image-generation/ImageGenerationService.ts:443-495; src/lib/services/__tests__/sceneAssetService.editImage.test.ts:35-160
- Notes: Edit route re-implements isolation suffix and dimensions from ImageGenerationService. Modal polling is client-side. Test covers client fetch shape only.
- Related: WD-IMPL-AI-0035, WD-IMPL-CAP-0181
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-210,WD-IDEA-GEN-214 || EXACT_MATCH: WD-IDEA-ASSET-118,WD-IDEA-ASSET-119,WD-IDEA-ASSET-120,WD-IDEA-ASSET-121,WD-IDEA-ASSET-122,WD-IDEA-ASSET-126,WD-IDEA-ASSET-127 || EXACT_MATCH: WD-IDEA-ASSET-128

### WD-IMPL-CAP-0183 Infer description and tags from story context (single asset, reviewed before applying)
- Behavior: Infer from Story calls infer-context (LLM over scene script, beats, treatment, shots), shows suggested description and tags, and Accept buttons PUT the choice. Nothing is written until accepted.
- Trigger / entrypoint: Infer from Story button
- Preconditions: instance not locked and not use_master_as_is
- Code path: handleInferFromStory -> inferContext -> POST infer-context -> StoryContextService.inferAssetContext -> llmClient.generate; accept -> updateSceneAsset -> PUT
- Data touched: reads stage_states, shots, scenes; writes scene_asset_instances on accept
- Downstream effects: effective_description and status_tags
- Status: P=Y R=Y F=P P=Y T=Y | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:365-405,584-696; backend/src/routes/sceneAssets.ts:2226-2268; backend/src/services/storyContextService.ts:52-146,151-173,247-277; src/lib/services/__tests__/sceneAssetService.inferContext.test.ts:35-116
- Notes: Treatment context is likely always empty because stored stage 2 and 3 keys differ from lookup keys. Unverified against stored rows.
- Related: WD-IMPL-AI-0024, WD-IMPL-FACT-0075
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-084,WD-IDEA-CONT-085,WD-IDEA-CONT-086,WD-IDEA-CONT-087 || EXACT_MATCH: WD-IDEA-CONT-089,WD-IDEA-CONT-090,WD-IDEA-CONT-091 || EXACT_MATCH: WD-IDEA-CONT-093 || PARTIAL_MATCH: WD-IDEA-CONT-094 || EXACT_MATCH: WD-IDEA-CONT-095

### WD-IMPL-CAP-0184 Bulk update from story context for selected instances (review modal then apply)
- Behavior: Update from Context (n) sends selected ids to bulk-infer-context (one batched LLM call for up to 4 assets, else parallel). Modal pre-selects changed rows; Apply PUTs descriptionOverride (may be empty) and union of tags for each row.
- Trigger / entrypoint: Update from Context button (appears when selection non-empty)
- Preconditions: at least one selected instance
- Code path: handleBulkInferContext -> bulkInferContext -> POST bulk-infer-context -> StoryContextService.bulkInferAssetContext; handleApplyBulkContext -> updateSceneAsset xN
- Data touched: scene_asset_instances.description_override, effective_description, status_tags
- Downstream effects: prompt gen, frames
- Status: P=Y R=Y F=P P=Y T=Y
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:543-583; src/components/pipeline/Stage8/BulkContextUpdateModal.tsx:55-101; backend/src/routes/sceneAssets.ts:2274-2330; backend/src/services/storyContextService.ts:179-242,282-364; src/lib/services/__tests__/sceneAssetService.inferContext.test.ts:118-240
- Notes: Apply overwrites description_override and bypasses version history; ignores the locked tag. BulkContextUpdateModal reads r.id (not in type); falls back to instanceId.
- Related: WD-IMPL-AI-0025, WD-IMPL-CAP-0183
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-012 || PARTIAL_MATCH: WD-IDEA-CONT-084,WD-IDEA-CONT-085,WD-IDEA-CONT-086,WD-IDEA-CONT-087 || PARTIAL_MATCH: WD-IDEA-CONT-088 || EXACT_MATCH: WD-IDEA-CONT-089,WD-IDEA-CONT-090,WD-IDEA-CONT-091 || PARTIAL_MATCH: WD-IDEA-CONT-092 || EXACT_MATCH: WD-IDEA-CONT-095

### WD-IMPL-CAP-0185 Add transformation event manually (with AI prefill of post description and narrative)
- Behavior: Add Transformation dialog takes trigger shot, type (instant, within_shot, gradual with completion shot), post description and narrative. Choosing a trigger or type auto-prefills via LLM unless the user already edited those fields. Creates an unconfirmed event.
- Trigger / entrypoint: Add Transformation button (Transformations collapsible)
- Preconditions: instance not locked
- Code path: AddTransformationDialog -> transformationEventService.generatePrefill -> POST generate-prefill -> generateTransformationPrefill; onAdd -> handleAddTransformation -> createEvent -> POST transformation-events -> createTransformationEvent
- Data touched: transformation_events insert (confirmed=false, detected_by=manual); shots, scene_asset_instances, scenes read
- Downstream effects: confirm step; prompt gen after confirm
- Status: P=Y R=Y F=Y P=Y T=Y
- Evidence: src/components/pipeline/Stage8/AddTransformationDialog.tsx:164-213; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:253-275,719-728; backend/src/routes/sceneAssets.ts:1828-1846,1916-1938; backend/src/services/transformationEventService.ts:237-273,380-517; backend/src/tests/transformationPrefill.test.ts:54-355
- Notes: Pre-description is sent from editor local state, and handleAddTransformation useCallback omits editedDescription from its deps, so the value may be stale. Gradual requires completion shot.
- Related: WD-IMPL-AI-0077, WD-IMPL-CAP-0187, WD-IMPL-STATE-0050
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-058 || PARTIAL_MATCH: WD-IDEA-CONT-067 || CONTRADICTED_BY_CODE: WD-IDEA-CONT-068 || EXACT_MATCH: WD-IDEA-CONT-104 || EXACT_MATCH: WD-IDEA-CONT-106,WD-IDEA-CONT-107

### WD-IMPL-CAP-0186 Convert a duplicate scene asset into a transformation of another asset
- Behavior: Context menu opens a dialog to pick a base asset. Prefill runs (trigger defaults to first shot, instant type). Then the AddTransformation dialog creates an event on the base, copies absorbed image as post image, and deletes the absorbed instance. Optional toast action defers the project asset.
- Trigger / entrypoint: Convert to Transformation menu item
- Preconditions: other assets exist in scene and shots exist
- Code path: ConvertToTransformationDialog.handleNext -> generatePrefill(absorbed_instance_id) -> AddTransformationDialog -> handleTransformationCreated -> createEvent, updateEvent, deleteSceneAsset, optional projectAssetService.updateAsset(deferred)
- Data touched: transformation_events insert, post_image_key_url; scene_asset_instances delete; project_assets.deferred
- Downstream effects: transformation card
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage8/ConvertToTransformationDialog.tsx:79-159,247-265; src/components/pipeline/Stage8/SceneAssetListPanel.tsx:191-196; backend/src/services/transformationEventService.ts:430-464
- Notes: Absorbed instance is deleted, cascading its attempts and assignments. Trigger inference from absorbed shot assignments is in the backend prefill; the dialog uses the returned trigger in place of the shots[0] fallback when provided.
- Related: WD-IMPL-CAP-0185, WD-IMPL-FACT-0073
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-078,WD-IDEA-ASSET-080,WD-IDEA-ASSET-082

### WD-IMPL-CAP-0187 Confirm, edit and delete transformation events; generate post description
- Behavior: Event cards list each event. Confirm (requires non-empty post description) sets confirmed; Dismiss or Delete removes the row. Blur saves post_description or narrative. Generate with AI overwrites post_description server-side.
- Trigger / entrypoint: Transformation card buttons and blur
- Preconditions: event belongs to selected instance
- Code path: card onConfirm -> confirmEvent -> POST confirm; onDismiss -> deleteEvent -> DELETE; onUpdate -> updateEvent -> PUT; onGeneratePostDescription -> generatePostDescription -> POST generate-post-description
- Data touched: transformation_events (post_description, narrative, confirmed, confirmed_at)
- Downstream effects: gatekeeper; prompt gen; inheritance; reference chain
- Status: P=Y R=Y F=P P=Y T=N | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage8/TransformationEventCard.tsx:49-71,91-127,255-287; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:165-201,733-744; backend/src/routes/sceneAssets.ts:1852-1910; backend/src/services/transformationEventService.ts:275-374
- Notes: Card local state is initialised once; generate-with-AI updates parent but not the card textarea, so the next blur can write old text back. Confirm is irreversible in UI. Transformation list uses local useState and does not invalidate the React Query count used by the gatekeeper.
- Related: WD-IMPL-STATE-0050, WD-IMPL-INVALIDATE-0041, WD-IMPL-AI-0076

### WD-IMPL-CAP-0188 Generate post-transformation reference image (confirmed events only) and pick existing images
- Behavior: After confirm, Generate Image enqueues a transformation_post job from post_description and post tags, with reference from client, instance image or project image. On completion the backend writes post_image_key_url and the frontend writes the same value again. Use Existing lists confirmed post images of the same project asset across scenes.
- Trigger / entrypoint: Generate Image or Use Existing in confirmed transformation card
- Preconditions: event confirmed and post_description non-empty; Stage 5 style
- Code path: handleGeneratePostImage -> generatePostImage -> POST generate-post-image -> ImageGenerationService.createImageJob(transformation_post) -> executeJobInBackground -> storage transformations/ -> transformation_events.post_image_key_url; frontend polls then PUT post_image_key_url. Use Existing -> TransformationImagePicker -> fetchTransformationImages -> GET transformation-images -> PUT
- Data touched: image_generation_jobs, storage, transformation_events.post_image_key_url
- Downstream effects: reference chain; frame prompt generation
- Status: P=Y R=Y F=P P=Y T=N | labels: DUPLICATED
- Evidence: src/components/pipeline/Stage8/TransformationEventCard.tsx:162-253; src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:203-251; backend/src/routes/sceneAssets.ts:1944-2101; backend/src/services/image-generation/ImageGenerationService.ts:428-440,618-620
- Notes: No attempt history. Frontend poll is 60x2s. No white-background isolation for transformation_post. Picker lists post images from any scene.
- Related: WD-IMPL-AI-0048, WD-IMPL-AI-0036
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-067 || EXACT_MATCH: WD-IDEA-CONT-108 || PARTIAL_MATCH: WD-IDEA-CONT-109,WD-IDEA-CONT-110

### WD-IMPL-CAP-0189 Persisted AI suggestions for assets not in library (list, ignore)
- Behavior: New-assets-required results from detect are saved to scene_asset_suggestions and shown in a Suggested section. Ignore sets dismissed. Add from library just opens the drawer and does not link the suggestion.
- Trigger / entrypoint: Suggested section in left panel
- Preconditions: detect returned new_assets_required
- Code path: detect -> saveSuggestions -> POST suggestions; listSuggestions -> GET; Ignore -> updateSuggestion -> PATCH
- Data touched: scene_asset_suggestions
- Downstream effects: none
- Status: P=Y R=Y F=P P=Y T=N | labels: ORPHANED
- Evidence: src/components/pipeline/Stage8/SceneAssetListPanel.tsx:725-774; src/components/pipeline/Stage8VisualDefinition.tsx:277-292,481-496,521-534,793-803; backend/src/routes/sceneAssets.ts:730-869
- Notes: accepted and asset_id are never written by any path. Repeated detection creates duplicates. Insert errors are swallowed.
- Related: WD-IMPL-FACT-0071, WD-IMPL-INVALIDATE-0045
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-152,WD-IDEA-ASSET-155,WD-IDEA-ASSET-157

### WD-IMPL-CAP-0190 Proceed gatekeeper for Stage 8 (images, transformations)
- Behavior: Proceed blocks if any instance has no image, any event is unconfirmed, or any confirmed event has blank post_description. Otherwise it calls onComplete, which locks stage 8 and advances.
- Trigger / entrypoint: Proceed button in left panel footer
- Preconditions: none (button always rendered when onComplete set)
- Code path: handleProceedToStage9 -> handleSceneStageComplete -> sceneStageLockService.lockStage -> sceneStageLocks route
- Data touched: scenes.stage_locks (cross-slice)
- Downstream effects: next scene stage
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:313-320,711-736; src/pages/ProjectView.tsx:589-615; src/components/pipeline/Stage8/SceneAssetListPanel.tsx:800-805
- Notes: Lock is a separate stage-lock concept (scenes.stage_locks). Unconfirmed-event count comes from React Query and may be stale after local confirm.
- Related: WD-IMPL-INVALIDATE-0043, WD-IMPL-STATE-0051
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-105 || EXACT_MATCH: WD-IDEA-ASSET-185 || PARTIAL_MATCH: WD-IDEA-ASSET-190 || NOT_IMPLEMENTED: WD-IDEA-ASSET-191 || NOT_IMPLEMENTED: WD-IDEA-ASSET-187,WD-IDEA-ASSET-188,WD-IDEA-ASSET-189 || CONTRADICTED_BY_CODE: WD-IDEA-PHIL-038 || PARTIAL_MATCH: WD-IDEA-FLOW-053,WD-IDEA-FLOW-054,WD-IDEA-FLOW-055

### WD-IMPL-CAP-0191 Transformation resolution applied to downstream shot prompts and frames in the same scene
- Behavior: Confirmed events are resolved per shot into overrides (pre, instant post, within_shot transforming, gradual completion) used by frame and prompt generation for the same scene.
- Trigger / entrypoint: frame generation and prompt generation routes
- Preconditions: confirmed events exist for the scene
- Code path: getTransformationEventsForScene -> filter confirmed -> resolveOverridesForShot -> shotOverrides -> prompt/frame builders
- Data touched: transformation_events (read), shots, scene_asset_instances (read)
- Downstream effects: frame and video prompts
- Status: P=Y R=Y F=Y P=N T=Y
- Evidence: backend/src/services/transformationEventService.ts:107-201; backend/src/routes/frames.ts:600-617; backend/src/services/promptGenerationService.ts:670-711,940,1075,1233-1300; backend/src/routes/projects.ts:3788-3800; backend/src/tests/transformationEvents.test.ts:74-460
- Notes: Computed at generation time, nothing stored. Gradual with NULL completion never reaches post. Other slices own prompt and frame wiring.
- Related: WD-IMPL-INVALIDATE-0041, WD-IMPL-FACT-0069
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-CONT-068 || PARTIAL_MATCH: WD-IDEA-CONT-100,WD-IDEA-CONT-101 || PARTIAL_MATCH: WD-IDEA-CONT-124,WD-IDEA-CONT-125

### WD-IMPL-CAP-0192 Stage 3 and 7 derived shot transformation flags (not consumed)
- Behavior: Shot extraction asks the LLM for transformation_flags and the projects route stores them as JSON on shots. No code converts them to transformation_events.
- Trigger / entrypoint: Stage 7 shot extraction save
- Preconditions: LLM returns flags
- Code path: shotExtractionService -> projects.ts shot insert transformation_flags -> no reader
- Data touched: shots.transformation_flags
- Downstream effects: none
- Status: P=Y R=Y F=N P=Y T=Y | labels: DEAD, ORPHANED, CONTRADICTED
- Evidence: backend/src/services/shotExtractionService.ts:257,282,375-376; backend/src/routes/projects.ts:1928; backend/src/tests/transformationFlagParsing.test.ts:1-172
- Notes: Test exercises a copy of the parser, not the real service.
- CORRECTION: CORRECTED by R1b: only Stage 7 shot extraction writes transformation_flags
- Related: WD-IMPL-FACT-0074

## Continuity and locations

### WD-IMPL-CAP-0193 Stage 7 manual location select or clear on a shot
- Behavior: User picks a location (or 'No linked location') in the Stage 7 shot inspector. Writes shot location as manual with confidence 1, or clears it to null with source manual. Resolver never overrides a manual choice afterwards.
- Trigger / entrypoint: Stage7ShotList.tsx Select onValueChange L1340-1351 and Clear button L1366 -> handleAssignShotLocation L626-652
- Preconditions: canEdit: scene not locked and editable; location asset exists in active branch with asset_type location
- Code path: Stage7ShotList.tsx:L626-L652 -> lib/services/shotService.ts:L173-L203 assignShotLocation -> PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/location (backend/src/routes/projects.ts:L2316-L2396)
- Data touched: shots.location_asset_id; shots.location_match_confidence; shots.location_match_source='manual'; shots.location_match_notes; shots.updated_at
- Downstream effects: Stage 8 coverage recomputed on next fetch; Stage 9 continuity preview reads location_asset_id; Stage 7 badge shows Manual
- Status: P=Y R=Y F=Y P=Y T=Y: shotLocationRoutes.test.ts 'stores explicit manual location assignments'
- Evidence: src/components/pipeline/Stage7ShotList.tsx:L626-L652; src/lib/services/shotService.ts:L173-L203; backend/src/routes/projects.ts:L2316-L2396
- Notes: Clear writes location_match_source='manual' with null location (sticky unresolved). Manual PUT does not validate that the shot's camera_direction_id belongs to the new location.
- Related: WD-IMPL-STATE-0054, WD-IMPL-INVALIDATE-0048
- Related product intent: EXACT_MATCH: WD-IDEA-LOC-042,WD-IDEA-LOC-043 || EXACT_MATCH: WD-IDEA-LOC-125,WD-IDEA-LOC-126,WD-IDEA-LOC-127,WD-IDEA-LOC-128,WD-IDEA-LOC-129,WD-IDEA-LOC-130 || PARTIAL_MATCH: WD-IDEA-LOC-145,WD-IDEA-LOC-146,WD-IDEA-LOC-147,WD-IDEA-LOC-148,WD-IDEA-LOC-149,WD-IDEA-LOC-150,WD-IDEA-LOC-151 || PARTIAL_MATCH: WD-IDEA-SHOT-076,WD-IDEA-SHOT-077,WD-IDEA-SHOT-081,WD-IDEA-SHOT-082,WD-IDEA-SHOT-083,WD-IDEA-SHOT-084,WD-IDEA-SHOT-085,WD-IDEA-SHOT-088,WD-IDEA-SHOT-090 || PARTIAL_MATCH: WD-IDEA-FLOW-005,WD-IDEA-FLOW-007,WD-IDEA-FLOW-008 || PARTIAL_MATCH: WD-IDEA-FLOW-122,WD-IDEA-FLOW-123,WD-IDEA-FLOW-124

### WD-IMPL-CAP-0194 Stage 7 accept a location candidate
- Behavior: Clicking Accept on a candidate row (ambiguous or suggested state) calls the same manual-assignment endpoint with that candidate's locationAssetId.
- Trigger / entrypoint: Stage7ShotList.tsx Accept button L1406-1431 -> handleAssignShotLocation L626-652
- Preconditions: shot state is ambiguous or suggested with candidates; canEdit
- Code path: Stage7ShotList.tsx:L1427 -> handleAssignShotLocation -> shotService.assignShotLocation -> PUT .../location (projects.ts:L2316-L2396)
- Data touched: shots location_* columns (manual)
- Downstream effects: same as V7-CAP-01
- Status: P=Y R=Y F=Y P=Y T=P: manual PUT tested, candidate UI not tested
- Evidence: src/components/pipeline/Stage7ShotList.tsx:L1406-L1431; backend/src/routes/projects.ts:L2316-L2396
- Notes: Candidates are computed live by the GET shots response (buildShotLocationState), not stored.
- Related: WD-IMPL-CAP-0193
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || PARTIAL_MATCH: WD-IDEA-LOC-145,WD-IDEA-LOC-146,WD-IDEA-LOC-147,WD-IDEA-LOC-148,WD-IDEA-LOC-149,WD-IDEA-LOC-150,WD-IDEA-LOC-151

### WD-IMPL-CAP-0195 Stage 7 Re-run Resolver (apply, preserve manual)
- Behavior: Header button re-runs the deterministic resolver over every shot in the scene, applies only where the location id changes and confidence reaches the 0.72 threshold without ambiguity, keeps manual rows, and logs an audit event per shot.
- Trigger / entrypoint: Stage7ShotList.tsx 'Re-run Resolver' button L944-955 -> handleResolveLocations L654-687
- Preconditions: canEdit; scene in active branch
- Code path: shotService.resolveShotLocations L205-248 (apply:true, preserveManual:true) -> POST /api/projects/:id/scenes/:sceneId/shots/resolve-locations (projects.ts:L2043-L2177) -> applyShotLocationResolution per shot (projects.ts:L225-L256) -> shots.update for changed rows -> locationResolverService.recordMatchEvent
- Data touched: shots location_* for changed rows; location_match_events insert per shot (write-only)
- Downstream effects: UI replaces shots list and selected shot from response
- Status: P=Y R=Y F=Y P=Y T=Y: shotLocationRoutes.test.ts 'batch-applies resolver suggestions while preserving manual assignments'
- Evidence: src/components/pipeline/Stage7ShotList.tsx:L654-L687; src/lib/services/shotService.ts:L205-L248; backend/src/routes/projects.ts:L2043-L2177; backend/src/routes/projects.ts:L225-L256
- Notes: Updates only rows whose location_asset_id changed; confidence and notes of unchanged rows are not refreshed (projects.ts:L2110-L2112). Returned shots are re-transformed with live locationState.
- Related: WD-IMPL-FACT-0079, WD-IMPL-TABLE-0020
- Related product intent: EXACT_MATCH: WD-IDEA-LOC-042,WD-IDEA-LOC-043 || PARTIAL_MATCH: WD-IDEA-LOC-145,WD-IDEA-LOC-146,WD-IDEA-LOC-147,WD-IDEA-LOC-148,WD-IDEA-LOC-149,WD-IDEA-LOC-150,WD-IDEA-LOC-151 || PARTIAL_MATCH: WD-IDEA-SHOT-076,WD-IDEA-SHOT-077,WD-IDEA-SHOT-081,WD-IDEA-SHOT-082,WD-IDEA-SHOT-083,WD-IDEA-SHOT-084,WD-IDEA-SHOT-085,WD-IDEA-SHOT-088,WD-IDEA-SHOT-090

### WD-IMPL-CAP-0196 Stage 7 shot location state, candidates and scene-mismatch display
- Behavior: Each shot shows a Resolved, Suggested, Ambiguous or Unresolved badge, source label, confidence, notes and up to 3 candidates. Recomputed on every shot-list response by re-running the resolver.
- Trigger / entrypoint: GET /api/projects/:id/scenes/:sceneId/shots (projects.ts:L1534-L1582) -> Stage7ShotList.tsx badges L1053-L1063, inspector L1316-L1386
- Preconditions: scene in active branch
- Code path: projects.ts:L1565 loadProjectLocationContext -> transformShotForClient (L190-L223) -> buildShotLocationState (L79-L139) -> summarizeShotLocationStates (L141-L158)
- Data touched: reads shots, project_assets (location), location_views (parent map)
- Downstream effects: Stage 7 validation banner; Stage 7 Accept/Clear controls
- Status: P=Y R=Y F=Y P=N: computed on each GET T=P: buildShotLocationState not unit tested directly; shotLocationRoutes covers shape
- Evidence: backend/src/routes/projects.ts:L79-L139; backend/src/routes/projects.ts:L1534-L1582; src/components/pipeline/Stage7ShotList.tsx:L1053-L1063; src/components/pipeline/Stage7ShotList.tsx:L1316-L1386
- Notes: Uses thresholds 0.72 (route) which differ from composition's 0.8 classifier. See V7-FACT-05.
- Related: WD-IMPL-STATE-0055, WD-IMPL-FACT-0083
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || PARTIAL_MATCH: WD-IDEA-UX-270,WD-IDEA-UX-278 || PARTIAL_MATCH: WD-IDEA-LOC-032,WD-IDEA-LOC-033,WD-IDEA-LOC-034,WD-IDEA-LOC-035,WD-IDEA-LOC-036,WD-IDEA-LOC-037,WD-IDEA-LOC-038 || PARTIAL_MATCH: WD-IDEA-LOC-145,WD-IDEA-LOC-146,WD-IDEA-LOC-147,WD-IDEA-LOC-148,WD-IDEA-LOC-149,WD-IDEA-LOC-150,WD-IDEA-LOC-151 || PARTIAL_MATCH: WD-IDEA-SHOT-076,WD-IDEA-SHOT-077,WD-IDEA-SHOT-081,WD-IDEA-SHOT-082,WD-IDEA-SHOT-083,WD-IDEA-SHOT-084,WD-IDEA-SHOT-085,WD-IDEA-SHOT-088,WD-IDEA-SHOT-090

### WD-IMPL-CAP-0197 Stage 8 Location Coverage panel (read-only derivation)
- Behavior: Stage 8 shows per-location strength (Strong, Fallback, Needs repair, Missing), counts of matched, fallback, missing-image, unassigned and mismatch shots, location views, notices, and a list of unresolved shots. Derived server-side on each fetch; nothing stored.
- Trigger / entrypoint: Stage8VisualDefinition.tsx:L841-L844 renders LocationCoveragePanel
- Preconditions: projectId and sceneId set
- Code path: LocationCoveragePanel.tsx:L155-L159 useQuery -> locationContinuityService.fetchCoverage L32-L55 -> GET /api/projects/:id/scenes/:sceneId/location-coverage (projects.ts:L1585-L1708) -> locationCoverageService.buildCoverage (locationCoverageService.ts:L222-L453)
- Data touched: reads shots (scene); scene_asset_instances (image_key_url); project_assets (location); location_views (sorted)
- Downstream effects: Basic/Advanced severities; Stage 8 repair actions below
- Status: P=Y R=Y F=Y P=N T=P: locationCoverageService.test.ts 3 tests; route in shotLocationRoutes.test.ts
- Evidence: src/components/pipeline/Stage8VisualDefinition.tsx:L841-L844; src/components/pipeline/Stage8/LocationCoveragePanel.tsx:L155-L159; src/lib/services/locationContinuityService.ts:L32-L55; backend/src/routes/projects.ts:L1585-L1708; backend/src/services/locationCoverageService.ts:L222-L453
- Notes: mode is taken from the query string (basic default), not from projects.continuity_mode. Panel never reads availableRepairActions from the response.
- Related: WD-IMPL-FACT-0080, WD-IMPL-INVALIDATE-0051
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || PARTIAL_MATCH: WD-IDEA-LOC-003,WD-IDEA-LOC-004,WD-IDEA-LOC-006,WD-IDEA-LOC-007,WD-IDEA-LOC-008,WD-IDEA-LOC-009,WD-IDEA-LOC-010 || EXACT_MATCH: WD-IDEA-LOC-026,WD-IDEA-LOC-027 || EXACT_MATCH: WD-IDEA-LOC-042,WD-IDEA-LOC-043 || PARTIAL_MATCH: WD-IDEA-LOC-203,WD-IDEA-LOC-204,WD-IDEA-LOC-205,WD-IDEA-LOC-206,WD-IDEA-LOC-207,WD-IDEA-LOC-208,WD-IDEA-LOC-209,WD-IDEA-LOC-210,WD-IDEA-LOC-211,WD-IDEA-LOC-212,WD-IDEA-LOC-213,WD-IDEA-LOC-214,+2

### WD-IMPL-CAP-0198 Stage 8 Basic/Advanced continuity toggle (coverage panel)
- Behavior: Toggle writes the project-level continuity_mode and changes coverage severities on the next fetch. The same column is also toggled from Stage 10.
- Trigger / entrypoint: LocationCoveragePanel.tsx:L387-L412 -> updateContinuityModeMutation L146-L153
- Preconditions: project owned by user
- Code path: locationContinuityService.updateContinuityMode -> PUT /api/projects/:id/continuity-mode (projects.ts:L832-L860)
- Data touched: projects.continuity_mode; projects.updated_at
- Downstream effects: continuity-metrics strictValidation (V1); Stage 10 lock gating (V1)
- Status: P=Y R=Y F=Y P=Y T=Y: continuityBaseAndModeRoutes.test.ts (PUT continuity-mode) | labels: CROSS-SLICE-V1
- Evidence: src/components/pipeline/Stage8/LocationCoveragePanel.tsx:L146-L153; backend/src/routes/projects.ts:L832-L860
- Notes: Route owned by V1. Coverage fetch uses local mode state, which syncs from GET continuity-mode on mount.
- Related: WD-IMPL-TABLE-0023
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || EXACT_MATCH: WD-IDEA-UX-273,WD-IDEA-UX-277,WD-IDEA-UX-279 || PARTIAL_MATCH: WD-IDEA-UX-270,WD-IDEA-UX-278 || PARTIAL_MATCH: WD-IDEA-LOC-014,WD-IDEA-LOC-015,WD-IDEA-LOC-016,WD-IDEA-LOC-017,WD-IDEA-LOC-024,WD-IDEA-LOC-049,WD-IDEA-LOC-050,WD-IDEA-LOC-051 || PARTIAL_MATCH: WD-IDEA-LOC-018,WD-IDEA-LOC-019,WD-IDEA-LOC-022,WD-IDEA-LOC-023,WD-IDEA-LOC-025

### WD-IMPL-CAP-0199 Stage 8 assign a shot's camera direction (or unassign)
- Behavior: Selecting a direction for a shot sets camera_direction_id and, if the direction belongs to another location than the shot's current one, moves the shot to the direction's parent location (source camera_direction_parent). Refused with 409 when the shot is manually linked to a different location.
- Trigger / entrypoint: LocationCoveragePanel.tsx:L765-L780 Select -> handleDirectionChange L216-L228
- Preconditions: direction view belongs to a location asset in active branch; direction view_type is direction (400 otherwise); not manual-to-other-location (409)
- Code path: locationContinuityService.assignCameraDirection L57-L87 -> PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/camera-direction (projects.ts:L2180-L2313)
- Data touched: shots.camera_direction_id; shots.location_asset_id, location_match_confidence=1, location_match_source=camera_direction_parent, location_match_notes (only when parent changes)
- Downstream effects: coverage recomputed; Stage 9 preview direction and reference manifest
- Status: P=Y R=Y F=Y P=Y T=Y: shotLocationRoutes.test.ts 'assigns camera direction through the Stage 8 repair endpoint'
- Evidence: src/components/pipeline/Stage8/LocationCoveragePanel.tsx:L216-L228; src/lib/services/locationContinuityService.ts:L57-L87; backend/src/routes/projects.ts:L2180-L2313
- Notes: Unassign with clear:true re-resolves location only if source is not manual (projects.ts:L2222-L2240); a manual location is kept.
- Related: WD-IMPL-INVALIDATE-0049, WD-IMPL-CAP-0200
- Related product intent: EXACT_MATCH: WD-IDEA-LOC-026,WD-IDEA-LOC-027 || EXACT_MATCH: WD-IDEA-LOC-042,WD-IDEA-LOC-043 || EXACT_MATCH: WD-IDEA-LOC-152,WD-IDEA-LOC-153,WD-IDEA-LOC-154,WD-IDEA-LOC-155,WD-IDEA-LOC-156,WD-IDEA-LOC-158 || PARTIAL_MATCH: WD-IDEA-LOC-166,WD-IDEA-LOC-167,WD-IDEA-LOC-168,WD-IDEA-LOC-169,WD-IDEA-LOC-174,WD-IDEA-LOC-175,WD-IDEA-LOC-177 || PARTIAL_MATCH: WD-IDEA-SHOT-076,WD-IDEA-SHOT-077,WD-IDEA-SHOT-081,WD-IDEA-SHOT-082,WD-IDEA-SHOT-083,WD-IDEA-SHOT-084,WD-IDEA-SHOT-085,WD-IDEA-SHOT-088,WD-IDEA-SHOT-090 || PARTIAL_MATCH: WD-IDEA-FLOW-005,WD-IDEA-FLOW-007,WD-IDEA-FLOW-008

### WD-IMPL-CAP-0200 Stage 8 use approved start frame as a location view image
- Behavior: For a shot with a missing direction image and an approved start frame, button promotes that frame image into the assigned direction view, setting source established and provenance fields.
- Trigger / entrypoint: LocationCoveragePanel.tsx:L745-L764 button -> handleUseApprovedFrameAsView L321-L355
- Preconditions: shot has cameraDirectionId; approved start frame image exists (frameService.fetchFrames); coverageState missing_view_image
- Code path: projectAssetService.establishViewFromFrame -> projectAssets.ts:L3190-L3285 (establish-from-frame route)
- Data touched: location_views.image_key_url, source='established', established_from_scene, established_from_shot_id, camera_distance/height from shot; frames.promoted_to_view_id only when frameId sent (panel does not send it)
- Downstream effects: coverage recomputed
- Status: P=Y R=Y F=Y P=Y T=N | labels: CROSS-SLICE-V5
- Evidence: src/components/pipeline/Stage8/LocationCoveragePanel.tsx:L321-L355; backend/src/routes/projectAssets.ts:L3190-L3285
- Notes: Panel does not pass frameId, so promoted_from_frame_id and promoted_to_view_id are not written from this path.
- Related: WD-IMPL-TABLE-0019
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-230,WD-IDEA-LOC-231,WD-IDEA-LOC-232,WD-IDEA-LOC-233,WD-IDEA-LOC-234,WD-IDEA-LOC-235,WD-IDEA-LOC-236,WD-IDEA-LOC-237,WD-IDEA-LOC-238,WD-IDEA-LOC-239,WD-IDEA-LOC-240,WD-IDEA-LOC-241,+1

### WD-IMPL-CAP-0201 Stage 8 create views, add direction, generate missing view images
- Behavior: Buttons create default establishing and direction views, add a new direction, or sequentially generate images for views lacking images. Delegated to the asset slice.
- Trigger / entrypoint: LocationCoveragePanel.tsx: Create Default Views L806-L815, Add Direction L817-L826, Generate Missing L829-L839, sparkle per view L643-L652
- Preconditions: canEdit not enforced in panel (no lock check)
- Code path: handleCreateDefaultViews L270-L288 -> projectAssetService.suggestDefaultViews; handleCreateDirection L290-L319 -> projectAssetService.createLocationView (name direction_n, source stage7_inferred); handleGenerateViewImage L230-L253 -> projectAssetService.generateLocationViewImage
- Data touched: location_views rows (new direction views use source stage7_inferred even though user-initiated)
- Downstream effects: Stage 9 and Stage 10 read the new views
- Status: P=Y R=Y F=U: runtime-dependent generation P=Y T=N | labels: CROSS-SLICE-V5
- Evidence: src/components/pipeline/Stage8/LocationCoveragePanel.tsx:L230-L319; src/components/pipeline/Stage8/LocationCoveragePanel.tsx:L786-L843
- Notes: Add Direction labels user-created views as stage7_inferred, so the Inferred badge is shown for user-created directions.
- Related: WD-IMPL-FACT-0084
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-119,WD-IDEA-LOC-120,WD-IDEA-LOC-121,WD-IDEA-LOC-122,WD-IDEA-LOC-123,WD-IDEA-LOC-124 || PARTIAL_MATCH: WD-IDEA-FLOW-005,WD-IDEA-FLOW-007,WD-IDEA-FLOW-008

### WD-IMPL-CAP-0202 Stage 9 per-shot continuity preview (transparency panel)
- Behavior: Each Stage 9 prompt card shows the continuity strength, generation mode, location, selected or suggested base, generation reference thumbnails with role labels, fallback chain, adaptation notes and risk notices. Computed on the fly; no mutations.
- Trigger / entrypoint: Stage9PromptSegmentation.tsx:L174-L194 loadContinuityPreview, render L716-L723 ContinuityPreviewPanel
- Preconditions: promptSet.shotUuid present
- Code path: locationContinuityService.fetchContinuityPreview L89-L110 -> GET /api/projects/:id/scenes/:sceneId/continuity-preview (projects.ts:L3283-L3456) -> continuityCompositionService.buildGenerationPackages -> ContinuityPreviewPanel.tsx:L71-L221
- Data touched: reads shots, scene_asset_instances, project_assets, location_views, asset_angle_variants, shot_asset_assignments, frames (start, branch-wide)
- Downstream effects: Repair in Stage 8 button
- Status: P=Y R=Y F=Y P=N T=N: no test for ContinuityPreviewPanel or the continuity-preview route
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:L174-L194; src/components/pipeline/Stage9PromptSegmentation.tsx:L716-L723; src/components/pipeline/Stage9/ContinuityPreviewPanel.tsx:L71-L221; backend/src/routes/projects.ts:L3283-L3456
- Notes: Preview manifest is not the manifest sent at generation (see V7-FACT-07). Refreshed on mount, assignmentsVersion change and after generate-prompts or single regenerate; not after start-continuity change.
- Related: WD-IMPL-PRESSURE-0005, WD-IMPL-FACT-0085
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || PARTIAL_MATCH: WD-IDEA-UX-217,WD-IDEA-UX-221,WD-IDEA-UX-222,WD-IDEA-UX-224,WD-IDEA-UX-227,WD-IDEA-UX-228,WD-IDEA-UX-229 || PARTIAL_MATCH: WD-IDEA-UX-232,WD-IDEA-UX-235,WD-IDEA-UX-236,WD-IDEA-UX-238,WD-IDEA-UX-239,WD-IDEA-UX-242,WD-IDEA-UX-245 || PARTIAL_MATCH: WD-IDEA-UX-270,WD-IDEA-UX-278 || UNKNOWN: WD-IDEA-UX-004,WD-IDEA-UX-005,WD-IDEA-UX-009,WD-IDEA-UX-011,WD-IDEA-UX-012,WD-IDEA-UX-013,WD-IDEA-UX-014,WD-IDEA-UX-042,WD-IDEA-UX-043,WD-IDEA-UX-101,WD-IDEA-UX-144,WD-IDEA-UX-152,+2 || PARTIAL_MATCH: WD-IDEA-LOC-166,WD-IDEA-LOC-167,WD-IDEA-LOC-168,WD-IDEA-LOC-169,WD-IDEA-LOC-174,WD-IDEA-LOC-175,WD-IDEA-LOC-177 || PARTIAL_MATCH: WD-IDEA-CONT-210 || PARTIAL_MATCH: WD-IDEA-CONT-212 || EXACT_MATCH: WD-IDEA-CONT-233 || EXACT_MATCH: WD-IDEA-FLOW-064,WD-IDEA-FLOW-065

### WD-IMPL-CAP-0203 Stage 9 Repair in Stage 8 navigation
- Behavior: Preview shows a Repair in Stage 8 button when strength is weak or missing, or any risk notice exists. It only calls the parent onBack.
- Trigger / entrypoint: ContinuityPreviewPanel.tsx:L134-L139 -> onRepairInStage8 = Stage9 onBack (Stage9PromptSegmentation.tsx:L721)
- Preconditions: onBack provided
- Code path: callback chain only, no backend call
- Data touched: 
- Downstream effects: Stage 8 navigation
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage9/ContinuityPreviewPanel.tsx:L134-L139; src/components/pipeline/Stage9PromptSegmentation.tsx:L721
- Notes: Label says Stage 8 but handler is the generic back navigation.
- Related: WD-IMPL-CAP-0202
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-166,WD-IDEA-LOC-167,WD-IDEA-LOC-168,WD-IDEA-LOC-169,WD-IDEA-LOC-174,WD-IDEA-LOC-175,WD-IDEA-LOC-177 || PARTIAL_MATCH: WD-IDEA-FLOW-060,WD-IDEA-FLOW-062,WD-IDEA-FLOW-063

### WD-IMPL-CAP-0204 Stage 9 per-shot start-continuity selector (None, Match, Angle Change)
- Behavior: Dropdown on shots at index greater than 0 writes shots.start_continuity immediately. Setting none also clears continuity_frame_prompt. No validation that the previous shot exists in the same setting.
- Trigger / entrypoint: Stage9PromptSegmentation.tsx:L752-L796 Select onValueChange
- Preconditions: index greater than 0
- Code path: promptService.updatePrompt -> PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts (projects.ts:L3459-L3570) startContinuity branch L3526-L3535
- Data touched: shots.start_continuity; shots.continuity_frame_prompt (null when none); shots.updated_at
- Downstream effects: Stage 10 sidebar glyph and summary; Stage 10 generation source selection
- Status: P=Y R=Y F=Y P=Y T=N | labels: CROSS-SLICE-V9
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:L752-L796; backend/src/routes/projects.ts:L3459-L3570
- Notes: Optimistic local update; on error shows toast but does not revert local state.
- Related: WD-IMPL-STATE-0056
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-UX-218 || EXACT_MATCH: WD-IDEA-GEN-154,WD-IDEA-GEN-157

### WD-IMPL-CAP-0205 Regenerate continuity recomposition prompt (camera-change shots)
- Behavior: Regenerates the recomposition prompt for a camera_change shot from the previous shot's camera and assets, via an LLM, and stores it on the shot. Available from Stage 9 and Stage 10.
- Trigger / entrypoint: Stage9PromptSegmentation.tsx:L850-L881 button; Stage10FrameGeneration.tsx:L1476 and L1495
- Preconditions: shot index greater than 0 (400 otherwise); shot is camera_change for Stage 9 display
- Code path: promptService.generateContinuityPrompt (promptService.ts:L154-L170) -> POST generate-continuity-prompt (frames.ts:L2148-L2247) -> promptGenerationService.generateContinuityFramePrompt (promptGenerationService.ts:L1360-L1432) -> llmClient
- Data touched: shots.continuity_frame_prompt
- Downstream effects: Stage 9 textarea read-only display
- Status: P=Y R=Y F=U: depends on Gemini API availability P=Y T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:L850-L881; backend/src/routes/frames.ts:L2148-L2247; backend/src/services/promptGenerationService.ts:L1360-L1432
- Notes: Route does not check that the scene is in the active branch (service-role client). Generation never reads this stored text (V7-DEAD-02).
- Related: WD-IMPL-AI-0008, WD-IMPL-STATE-0061, WD-IMPL-DEAD-0024
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-141,WD-IDEA-CONT-143

### WD-IMPL-CAP-0206 Stage 10 select continuity base (reuse/edit base)
- Behavior: Use button on a candidate sets shots.selected_continuity_base_frame_id and prepends a continuity_base_frame entry to reference_image_order. The next start-frame generation uses that frame as the first image reference with a reuse/edit prompt.
- Trigger / entrypoint: Stage10FrameGeneration.tsx:L1156-L1166 ContinuityBaseChooser -> ChooserUse onSelect -> updateContinuityBaseMutation L439-L451
- Preconditions: frame must be among top 8 candidates for this shot (400 otherwise); scene in active branch
- Code path: frameService.updateContinuityBase (frameService.ts:L513-L538) -> PUT /api/projects/:projectId/scenes/:sceneId/shots/:shotId/continuity-base (frames.ts:L1574-L1682) -> continuityBaseService.listCandidates L83-L97 -> pickCandidateById -> shots.update
- Data touched: shots.selected_continuity_base_frame_id; shots.reference_image_order (prepend, renumber)
- Downstream effects: frameGenerationService fetchShotReferenceImageContext L626-L709 at generation; Stage 9 and 10 continuity previews
- Status: P=Y R=Y F=Y P=Y T=Y: ContinuityBaseChooser.test.tsx 'lists ranked candidates and calls onSelect'; continuityBaseAndModeRoutes.test.ts select
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:L69-L182; src/components/pipeline/Stage10FrameGeneration.tsx:L439-L451; backend/src/routes/frames.ts:L1574-L1682; backend/src/services/continuityBaseService.ts:L83-L97
- Notes: Does not change start_continuity. Toast reads Stage 10 will use the selected frame as the edit base.
- Related: WD-IMPL-STATE-0057, WD-IMPL-INVALIDATE-0047
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || PARTIAL_MATCH: WD-IDEA-UX-217,WD-IDEA-UX-221,WD-IDEA-UX-222,WD-IDEA-UX-224,WD-IDEA-UX-227,WD-IDEA-UX-228,WD-IDEA-UX-229 || PARTIAL_MATCH: WD-IDEA-UX-232,WD-IDEA-UX-235,WD-IDEA-UX-236,WD-IDEA-UX-238,WD-IDEA-UX-239,WD-IDEA-UX-242,WD-IDEA-UX-245 || EXACT_MATCH: WD-IDEA-LOC-028,WD-IDEA-LOC-029,WD-IDEA-LOC-030,WD-IDEA-LOC-031 || EXACT_MATCH: WD-IDEA-CONT-175 || PARTIAL_MATCH: WD-IDEA-CONT-197,WD-IDEA-CONT-198,WD-IDEA-CONT-205 || EXACT_MATCH: WD-IDEA-CONT-199 || EXACT_MATCH: WD-IDEA-CONT-200 || PARTIAL_MATCH: WD-IDEA-CONT-210 || EXACT_MATCH: WD-IDEA-GEN-154,WD-IDEA-GEN-157 || EXACT_MATCH: WD-IDEA-FLOW-064,WD-IDEA-FLOW-065

### WD-IMPL-CAP-0207 Stage 10 Fresh (clear continuity base)
- Behavior: Fresh button clears selected_continuity_base_frame_id and strips continuity_base_frame entries from reference_image_order, renumbering labels.
- Trigger / entrypoint: ContinuityBaseChooser in Stage10FrameGeneration.tsx:L108-L119 Fresh -> onClear L1163-L1165
- Preconditions: a base is currently selected
- Code path: frameService.updateContinuityBase(frameId null) -> PUT continuity-base (frames.ts:L1618-L1636)
- Data touched: shots.selected_continuity_base_frame_id=null; shots.reference_image_order
- Downstream effects: next generation uses no base
- Status: P=Y R=Y F=Y P=Y T=Y: continuityBaseAndModeRoutes.test.ts 'clears the selected base and renumbers'
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:L108-L119; backend/src/routes/frames.ts:L1618-L1636
- Notes: Chooser label Fresh generation is also shown when the persisted base has dropped out of top 8 (V7-STATE-04).
- Related: WD-IMPL-CAP-0206
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-232,WD-IDEA-UX-235,WD-IDEA-UX-236,WD-IDEA-UX-238,WD-IDEA-UX-239,WD-IDEA-UX-242,WD-IDEA-UX-245 || EXACT_MATCH: WD-IDEA-LOC-028,WD-IDEA-LOC-029,WD-IDEA-LOC-030,WD-IDEA-LOC-031 || EXACT_MATCH: WD-IDEA-CONT-199 || EXACT_MATCH: WD-IDEA-GEN-154,WD-IDEA-GEN-157

### WD-IMPL-CAP-0208 Stage 10 Pull match or Pull ref from adjacent frame (copy and reference)
- Behavior: Adjacent-frame buttons either copy the neighbour's image into this frame (Pull match, zero-cost, creates match link) or add it as a reference entry (Pull ref, creates reference link). Pull ref sets start_continuity to camera_change for start frames.
- Trigger / entrypoint: FramePanel.tsx:L705-L726 and L757-L778 -> Stage10FrameGeneration.tsx onMatchFromFrame L1219-L1225 (copyFrameMutation L464-L474) and onRefFromFrame L1226-L1232 (refFromFrameMutation L477-L487)
- Preconditions: adjacent frame has imageUrl; not disabled (isDisabled)
- Code path: frameService.copyFrame L831-L857 -> POST .../shots/:shotId/copy-frame (frames.ts:L1969-L2142); frameService.addFrameAsReference L738-L763 -> POST .../shots/:shotId/add-frame-as-reference (frames.ts:L936-L1057)
- Data touched: frames (target: image_url, storage_path, status generated, prompt_snapshot, lineage, generation_count, current_job_id); image_generation_jobs zero-cost row; frame_links (match or reference); shots.reference_image_order / end_frame_reference_image_order; shots.start_continuity=camera_change (ref, start only)
- Downstream effects: start-frame generation source selection V7-CAP-24
- Status: P=Y R=Y F=Y P=Y T=Y: referenceContinuity.test.ts (add-frame-as-reference, copy-frame)
- Evidence: src/components/pipeline/FramePanel.tsx:L705-L778; src/components/pipeline/Stage10FrameGeneration.tsx:L1219-L1232; backend/src/routes/frames.ts:L1969-L2142; backend/src/routes/frames.ts:L936-L1057
- Notes: Cross-scene (prev scene end) buttons only offer Pull. copy-frame to a start frame also strips type continuity ref entries (frames.ts:L2105-L2114).
- Related: WD-IMPL-STATE-0058, WD-IMPL-INVALIDATE-0046, WD-IMPL-INVALIDATE-0052
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-232,WD-IDEA-UX-235,WD-IDEA-UX-236,WD-IDEA-UX-238,WD-IDEA-UX-239,WD-IDEA-UX-242,WD-IDEA-UX-245 || PARTIAL_MATCH: WD-IDEA-CONT-076 || EXACT_MATCH: WD-IDEA-CONT-138 || EXACT_MATCH: WD-IDEA-CONT-144,WD-IDEA-CONT-145 || EXACT_MATCH: WD-IDEA-CONT-167 || PARTIAL_MATCH: WD-IDEA-GEN-160,WD-IDEA-GEN-161,WD-IDEA-GEN-162,WD-IDEA-GEN-168,WD-IDEA-GEN-169,WD-IDEA-GEN-176,WD-IDEA-GEN-195 || EXACT_MATCH: WD-IDEA-FLOW-064,WD-IDEA-FLOW-065

### WD-IMPL-CAP-0209 Stage 10 Push match or Push ref into previous shot end frame
- Behavior: From the current start frame, pushes its image into the previous shot's end frame as a match copy or a reference link.
- Trigger / entrypoint: FramePanel.tsx:L729-L750 and L781-L802 -> Stage10FrameGeneration.tsx onPushMatchToFrame L1233-L1242 and onPushRefToFrame L1243-L1252
- Preconditions: previous shot exists in scene; current start frame has image; not cross-scene
- Code path: copyFrameMutation with shotId=previous shot, targetFrameType=end -> copy-frame; or refFromFrameMutation -> add-frame-as-reference
- Data touched: previous shot end frame and link rows
- Downstream effects: next shot's chaining view
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:L1233-L1252; src/components/pipeline/FramePanel.tsx:L729-L750
- Notes: Backward write into the previous shot's end frame, which the previous shot's generation may overwrite later.
- Related: WD-IMPL-CAP-0208
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-076 || EXACT_MATCH: WD-IDEA-CONT-144,WD-IDEA-CONT-145 || PARTIAL_MATCH: WD-IDEA-CONT-170 || PARTIAL_MATCH: WD-IDEA-GEN-160,WD-IDEA-GEN-161,WD-IDEA-GEN-162,WD-IDEA-GEN-168,WD-IDEA-GEN-169,WD-IDEA-GEN-176,WD-IDEA-GEN-195 || EXACT_MATCH: WD-IDEA-FLOW-064,WD-IDEA-FLOW-065

### WD-IMPL-CAP-0210 Stage 10 Link All (batch match-copy into every next start frame)
- Behavior: Sets start_continuity match for shots 2 to n and overwrites each start frame with the previous shot's generated or approved end frame image, creating match links. No confirmation; overwrites approved start frames.
- Trigger / entrypoint: Stage10FrameGeneration.tsx:L1015-L1028 Link All -> batchLinkMutation L507-L516
- Preconditions: shots.length greater than 1 (button shown)
- Code path: frameService.batchLinkCopy L806-L826 -> POST /api/projects/:projectId/scenes/:sceneId/batch-link-copy (frames.ts:L1814-L1963)
- Data touched: shots.start_continuity=match; frames.start (image, status generated, lineage match_copy, generation_count); image_generation_jobs zero-cost rows; frame_links match upsert on target
- Downstream effects: Stage 10 sidebar glyphs and summary
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:L1015-L1028; backend/src/routes/frames.ts:L1814-L1963
- Notes: Does not verify that the previous shot end frame is in the same scene beyond the scene query. Start frames with status approved are overwritten.
- Related: WD-IMPL-PRESSURE-0006, WD-IMPL-FACT-0088
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-138

### WD-IMPL-CAP-0211 Stage 10 Unlink (set all shots to none)
- Behavior: Sets start_continuity none on shots 2 to n by one PUT per shot. Clears continuity_frame_prompt. Does not delete frame_links.
- Trigger / entrypoint: Stage10FrameGeneration.tsx:L1029-L1044 Unlink
- Preconditions: shots.length greater than 1
- Code path: promptService.updatePrompt loop -> PUT .../shots/:shotId/prompts (projects.ts:L3459-L3570)
- Data touched: shots.start_continuity; shots.continuity_frame_prompt
- Downstream effects: frame_links remain and still drive reference or match behaviour
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:L1029-L1044; backend/src/routes/projects.ts:L3459-L3570
- Notes: Client-side loop, not atomic; errors are not caught, so a partial unlink is possible.
- Related: WD-IMPL-STATE-0058

### WD-IMPL-CAP-0212 Stage 10 break a frame link (Link badge)
- Behavior: Break button on a continuity link badge deletes the frame_links row by id.
- Trigger / entrypoint: FramePanel.tsx:L495-L520 onBreakLink -> Stage10FrameGeneration.tsx:L519-L525 breakFrameLinkMutation
- Preconditions: continuityLink present on frame
- Code path: frameService.breakFrameLink L860-L880 -> DELETE /api/projects/:projectId/scenes/:sceneId/frame-links/:linkId (frames.ts:L2253-L2284)
- Data touched: frame_links row
- Downstream effects: continuity badge disappears; start_continuity not changed
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/FramePanel.tsx:L495-L520; backend/src/routes/frames.ts:L2253-L2284
- Notes: Route checks only project ownership; the linkId is not checked to belong to the project or scene.
- Related: WD-IMPL-ROUTE-0117

### WD-IMPL-CAP-0213 Stage 10 reference thumbnail replace from available assets
- Behavior: Clicking a reference thumbnail opens a popover of alternative images for the same asset name (scene instance, master, confirmed transformation post, angle variants). Choosing one swaps only the url of that reference entry and persists the array.
- Trigger / entrypoint: FramePanel.tsx:L173-L187 query and L583-L640 popover -> handleSelectReplacement L183-L190 -> Stage10 updateRefImagesMutation L424-L437
- Preconditions: referenceImages present and onUpdateReferenceImages set
- Code path: frameService.fetchAvailableReferences L547-L564 -> GET .../shots/:shotId/available-references (frames.ts:L1688-L1808); frameService.updateReferenceImages L493-L515 -> PUT .../reference-images (frames.ts:L1498-L1568)
- Data touched: shots.reference_image_order or end_frame_reference_image_order; shots.selected_continuity_base_frame_id (cleared if base entry removed)
- Downstream effects: start-frame generation references
- Status: P=Y R=Y F=P: continuity entries never match, so popover spins indefinitely for them P=Y T=N
- Evidence: src/components/pipeline/FramePanel.tsx:L173-L187; src/components/pipeline/FramePanel.tsx:L583-L640; backend/src/routes/frames.ts:L1688-L1808; backend/src/routes/frames.ts:L1498-L1568
- Notes: available-references ignores the shotId param. Option ordering is insertion order, not ranked.
- Related: WD-IMPL-FACT-0087, WD-IMPL-INVALIDATE-0047
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-117

### WD-IMPL-CAP-0214 Automatic start_continuity default from Stage 9 prompt generation
- Behavior: Generate-prompts assigns start_continuity for each shot from rule-based determineContinuityLink (first shot none, cut-like flags none, setting change none, same camera shot-type and angle match, else camera_change) and overwrites any manual choice.
- Trigger / entrypoint: Stage9 generate-prompts button -> POST /api/projects/:id/scenes/:sceneId/generate-prompts (projects.ts:L3573+) -> promptGenerationService.generateBulkPromptSets L1048-L1126
- Preconditions: shots exist in scene
- Code path: promptGenerationService.determineContinuityLink L1014-L1045 -> projects.ts:L3855-L3856 shots.update start_continuity and ai_start_continuity
- Data touched: shots.start_continuity; shots.ai_start_continuity; shots.reference_image_order and end_frame_reference_image_order (wholesale overwrite)
- Downstream effects: Stage 10 generation mode
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/services/promptGenerationService.ts:L1014-L1045; backend/src/services/promptGenerationService.ts:L1087-L1105; backend/src/routes/projects.ts:L3851-L3857
- Notes: Overwrite drops continuity_base reference entries from reference_image_order; selected_continuity_base_frame_id is kept and re-applied at generation.
- Related: WD-IMPL-STATE-0056, WD-IMPL-FACT-0086
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-139 || PARTIAL_MATCH: WD-IDEA-ASSET-203

### WD-IMPL-CAP-0215 Start-frame source selection at generation (base, match, camera change, fresh)
- Behavior: Bulk and single-frame generation choose the start frame source in fixed order: valid continuity base reuse/edit AI job; else match copy of previous end frame (zero cost); else camera_change recomposition via reference link or previous end frame (vision and LLM prompt, then job); else fresh generation from frame_prompt with persisted references.
- Trigger / entrypoint: Stage10 Generate (generateMutation L352-L368) and Regenerate (regenerateMutation L371-L377) -> frameService.generateFrames / regenerateFrame -> POST generate-frames (frames.ts:L227) / regenerate (frames.ts:L365)
- Preconditions: shot frame_prompt non-empty (else skipped or error); start frame status pending or rejected for bulk
- Code path: frameGenerationService.ts generateFrames L342-L452 (bulk) and regenerateFrame L1018-L1189 (single); fetchShotReferenceImageContext L626-L709
- Data touched: frames start (status generating, prompt_snapshot, generated_from_frame_id, continuity_base_role); image_generation_jobs; shots.continuity_frame_prompt (camera change path)
- Downstream effects: ImageGenerationService job completion updates frames
- Status: P=Y R=Y F=U: image provider runtime P=Y T=Y: referenceContinuity/continuityComposition parity tests cover reference resolution only, not decision order | labels: CROSS-SLICE-V9
- Evidence: backend/src/services/frameGenerationService.ts:L342-L452; backend/src/services/frameGenerationService.ts:L1018-L1189; backend/src/services/frameGenerationService.ts:L626-L709
- Notes: Bulk match copy only when previous shot end frame id is known in this request (previousEndFrameId from same run). Single regenerate looks up previous end frame by shot_order. Lineage is not cleared on fresh generation (frameGenerationService.ts:L876-L881).
- Related: WD-IMPL-AI-0008, WD-IMPL-AI-0054, WD-IMPL-FACT-0086, WD-IMPL-FACT-0085
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-099,WD-IDEA-UX-102 || PARTIAL_MATCH: WD-IDEA-UX-217,WD-IDEA-UX-221,WD-IDEA-UX-222,WD-IDEA-UX-224,WD-IDEA-UX-227,WD-IDEA-UX-228,WD-IDEA-UX-229 || EXACT_MATCH: WD-IDEA-LOC-028,WD-IDEA-LOC-029,WD-IDEA-LOC-030,WD-IDEA-LOC-031 || EXACT_MATCH: WD-IDEA-CONT-160,WD-IDEA-CONT-163 || PARTIAL_MATCH: WD-IDEA-CONT-197,WD-IDEA-CONT-198,WD-IDEA-CONT-205 || EXACT_MATCH: WD-IDEA-CONT-199 || EXACT_MATCH: WD-IDEA-CONT-202,WD-IDEA-CONT-203,WD-IDEA-CONT-204

### WD-IMPL-CAP-0216 Automatic match-link propagation to linked targets after source change
- Behavior: After regenerate, inpaint, upload-as-variant and select-generation on a frame, its image is copied to every frame that has a match link where it is the source. Not recursive.
- Trigger / entrypoint: frames.ts:L365-L408 (regenerate), L424-L468 (inpaint), L1063-L1215 (upload), L1315-L1372 (select-generation)
- Preconditions: frame_links rows with link_type match and source_frame_id equal to the frame
- Code path: frames.ts -> frameGenerationService.propagateFrameLinks (frameGenerationService.ts:L1545-L1596) -> frames.update per target
- Data touched: target frames image_url, storage_path, generated_at, prompt_snapshot
- Downstream effects: target frame display
- Status: P=Y R=Y F=P: likely copies stale image for async regenerate and inpaint (no runtime verification) P=Y T=N
- Evidence: backend/src/routes/frames.ts:L365-L408; backend/src/routes/frames.ts:L424-L468; backend/src/routes/frames.ts:L1214-L1215; backend/src/routes/frames.ts:L1371-L1372; backend/src/services/frameGenerationService.ts:L1545-L1596
- Notes: Errors are swallowed (catch logs only). Image-completion path in ImageGenerationService.ts:L516-L535 does not call propagation.
- Related: WD-IMPL-STATE-0058, WD-IMPL-PRESSURE-0006

### WD-IMPL-CAP-0217 Scene continuity risk badge in Stage 6 (rule-based)
- Behavior: Each scene in Stage 6 gets a safe, risky or broken badge computed from previous scene status and stage 1 to 4 timestamps.
- Trigger / entrypoint: Stage6ScriptHub.tsx:L329-L339 and L537-L558 from scene.continuityRisk (sceneService.ts:L50)
- Preconditions: scenes fetched
- Code path: GET /api/projects/:id/scenes (projects.ts:L1013-L1132) -> ContinuityRiskAnalyzer.analyzeContinuityRisk (continuityRiskAnalyzer.ts:L59-L126)
- Data touched: reads scenes, stage_states (stages 1-4)
- Downstream effects: Stage 6 warning chips
- Status: P=Y R=Y F=Y P=N T=Y: continuityRiskAnalyzer.test.ts (all rules)
- Evidence: src/components/pipeline/Stage6ScriptHub.tsx:L329-L339; backend/src/routes/projects.ts:L1092-L1121; backend/src/services/continuityRiskAnalyzer.ts:L59-L126
- Notes: Dynamic import uses extensionless path (projects.ts:L1093).
- Related: WD-IMPL-INVALIDATE-0050, WD-IMPL-FACT-0082
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-045,WD-IDEA-UX-046,WD-IDEA-UX-056,WD-IDEA-UX-057,WD-IDEA-UX-060 || PARTIAL_MATCH: WD-IDEA-UX-168,WD-IDEA-UX-169,WD-IDEA-UX-170 || PARTIAL_MATCH: WD-IDEA-UX-007,WD-IDEA-UX-008,WD-IDEA-UX-015,WD-IDEA-UX-017 || UNKNOWN: WD-IDEA-UX-004,WD-IDEA-UX-005,WD-IDEA-UX-009,WD-IDEA-UX-011,WD-IDEA-UX-012,WD-IDEA-UX-013,WD-IDEA-UX-014,WD-IDEA-UX-042,WD-IDEA-UX-043,WD-IDEA-UX-101,WD-IDEA-UX-144,WD-IDEA-UX-152,+2 || PARTIAL_MATCH: WD-IDEA-SHOT-004,WD-IDEA-SHOT-005 || PARTIAL_MATCH: WD-IDEA-FLOW-032,WD-IDEA-FLOW-033,WD-IDEA-FLOW-034,WD-IDEA-FLOW-035,WD-IDEA-FLOW-036,WD-IDEA-FLOW-037

### WD-IMPL-CAP-0218 Shot extraction resolves location and creates inferred direction views
- Behavior: Stage 7 AI extraction returns shots. The backend resolves each shot's location with the deterministic resolver and creates new stage7_inferred direction views for directions the AI proposed, mapping camera_direction by name.
- Trigger / entrypoint: Stage 7 extract shots -> POST /api/projects/:id/scenes/:sceneId/shots/extract (projects.ts:L1711-L1977)
- Preconditions: scene exists
- Code path: projects.ts:L1784-L1816 scene location resolution and existing views -> ShotExtractionService.extractShots -> L1832-L1903 location_views insert (source stage7_inferred) -> L1906-L1935 applyShotLocationResolution -> shots insert -> recordMatchEvent L1951
- Data touched: location_views insert; shots insert with location_* and camera_direction_id; location_match_events
- Downstream effects: Stage 7 display
- Status: P=Y R=Y F=U: AI extraction output P=Y T=N | labels: CROSS-SLICE-V8
- Evidence: backend/src/routes/projects.ts:L1711-L1977
- Notes: Direction name-to-id mapping uses a Map keyed by view name; duplicate-name views are skipped.
- Related: WD-IMPL-FACT-0079, WD-IMPL-TABLE-0022
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-069,WD-IDEA-LOC-070,WD-IDEA-LOC-072,WD-IDEA-LOC-073,WD-IDEA-LOC-075,WD-IDEA-LOC-076 || EXACT_MATCH: WD-IDEA-LOC-152,WD-IDEA-LOC-153,WD-IDEA-LOC-154,WD-IDEA-LOC-155,WD-IDEA-LOC-156,WD-IDEA-LOC-158 || PARTIAL_MATCH: WD-IDEA-SHOT-022,WD-IDEA-SHOT-023,WD-IDEA-SHOT-024,WD-IDEA-SHOT-025,WD-IDEA-SHOT-026,WD-IDEA-SHOT-027,WD-IDEA-SHOT-037 || PARTIAL_MATCH: WD-IDEA-SHOT-076,WD-IDEA-SHOT-077,WD-IDEA-SHOT-081,WD-IDEA-SHOT-082,WD-IDEA-SHOT-083,WD-IDEA-SHOT-084,WD-IDEA-SHOT-085,WD-IDEA-SHOT-088,WD-IDEA-SHOT-090 || EXACT_MATCH: WD-IDEA-FLOW-023,WD-IDEA-FLOW-024,WD-IDEA-FLOW-026 || PARTIAL_MATCH: WD-IDEA-FLOW-122,WD-IDEA-FLOW-123,WD-IDEA-FLOW-124

### WD-IMPL-CAP-0219 Shot edit, split and merge re-resolve location automatically
- Behavior: Editing setting or camera_direction_id on a non-manual shot re-resolves location and overwrites location fields. Split and merge create new rows and re-resolve from text; manual location and direction assignments are lost.
- Trigger / entrypoint: PUT /api/projects/:id/scenes/:sceneId/shots/:shotId (projects.ts:L2399-L2512); POST .../split (L2515-L2656); POST .../merge (L2657-L2790)
- Preconditions: shot not manual when re-resolving
- Code path: projects.ts:L2432-L2475 (PUT) -> applyShotLocationResolution L225-L256 -> shots.update; split L2578-L2620; merge L2706-L2760
- Data touched: shots location_* and camera_direction_id (split and merge omit camera_direction_id)
- Downstream effects: Stage 7 state display
- Status: P=Y R=Y F=Y P=Y T=P: shotLocationRoutes covers PUT; split and merge untested
- Evidence: backend/src/routes/projects.ts:L2399-L2512; backend/src/routes/projects.ts:L2515-L2790
- Notes: Non-manual PUT with camera_direction_id null: resolver result without text match sets location_asset_id null, which erases an earlier automatic link.
- Related: WD-IMPL-INVALIDATE-0048, WD-IMPL-FACT-0081
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-069,WD-IDEA-LOC-070,WD-IDEA-LOC-072,WD-IDEA-LOC-073,WD-IDEA-LOC-075,WD-IDEA-LOC-076 || EXACT_MATCH: WD-IDEA-LOC-125,WD-IDEA-LOC-126,WD-IDEA-LOC-127,WD-IDEA-LOC-128,WD-IDEA-LOC-129,WD-IDEA-LOC-130 || PARTIAL_MATCH: WD-IDEA-LOC-136,WD-IDEA-LOC-137,WD-IDEA-LOC-138,WD-IDEA-LOC-139 || PARTIAL_MATCH: WD-IDEA-SHOT-022,WD-IDEA-SHOT-023,WD-IDEA-SHOT-024,WD-IDEA-SHOT-025,WD-IDEA-SHOT-026,WD-IDEA-SHOT-027,WD-IDEA-SHOT-037 || PARTIAL_MATCH: WD-IDEA-SHOT-076,WD-IDEA-SHOT-077,WD-IDEA-SHOT-081,WD-IDEA-SHOT-082,WD-IDEA-SHOT-083,WD-IDEA-SHOT-084,WD-IDEA-SHOT-085,WD-IDEA-SHOT-088,WD-IDEA-SHOT-090

### WD-IMPL-CAP-0220 Shot list lock warns on location continuity issues
- Behavior: Locking the Stage 7 shot list computes unresolved, ambiguous and scene-mismatch counts and adds a warning. Warnings can be bypassed with force.
- Trigger / entrypoint: POST /api/projects/:id/scenes/:sceneId/shots/lock (projects.ts:L2845-L3018) warning at L2930-L2939; 409 with canForce at L2952-L2959
- Preconditions: shot list validation has no errors
- Code path: buildShotLocationValidationSummary L160-L171 -> buildLocationValidationWarning L173-L188
- Data touched: none (validation only)
- Downstream effects: lock or 409 response
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: backend/src/routes/projects.ts:L2930-L2959; backend/src/routes/projects.ts:L160-L188
- Notes: Location warning is a warning, not an error, so it can be forced.
- Related: WD-IMPL-FACT-0083
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || UNKNOWN: WD-IDEA-UX-004,WD-IDEA-UX-005,WD-IDEA-UX-009,WD-IDEA-UX-011,WD-IDEA-UX-012,WD-IDEA-UX-013,WD-IDEA-UX-014,WD-IDEA-UX-042,WD-IDEA-UX-043,WD-IDEA-UX-101,WD-IDEA-UX-144,WD-IDEA-UX-152,+2 || PARTIAL_MATCH: WD-IDEA-LOC-032,WD-IDEA-LOC-033,WD-IDEA-LOC-034,WD-IDEA-LOC-035,WD-IDEA-LOC-036,WD-IDEA-LOC-037,WD-IDEA-LOC-038 || PARTIAL_MATCH: WD-IDEA-LOC-145,WD-IDEA-LOC-146,WD-IDEA-LOC-147,WD-IDEA-LOC-148,WD-IDEA-LOC-149,WD-IDEA-LOC-150,WD-IDEA-LOC-151 || EXACT_MATCH: WD-IDEA-SHOT-063,WD-IDEA-SHOT-064,WD-IDEA-SHOT-065

### WD-IMPL-CAP-0221 Backfill legacy shot locations (CLI script)
- Behavior: CLI script runs the resolver over all branches and optionally applies results with source legacy_backfill (or camera_direction_parent). Not reachable from the UI.
- Trigger / entrypoint: backend/scripts/backfill-shot-locations.ts (tsx script, --apply, --project, --branch)
- Preconditions: operator runs script with service key
- Code path: parseArgs -> fetchBranches -> per scene resolver -> applyBackfill L173-L210 (skip manual, update shots, recordMatchEvent)
- Data touched: shots location_*; location_match_events
- Downstream effects: none
- Status: P=Y R=N: CLI only, no route or UI caller F=U: not executed here P=Y when run with --apply T=N
- Evidence: backend/scripts/backfill-shot-locations.ts:L150-L230
- Notes: Counts skipped manual rows. Operator invocation only; the script itself is not executed here.
- Related: WD-IMPL-STATE-0054
- Related product intent: PARTIAL_MATCH: WD-IDEA-LOC-136,WD-IDEA-LOC-137,WD-IDEA-LOC-138,WD-IDEA-LOC-139

## Shots (Stage 7) and shot-asset assignments

### WD-IMPL-CAP-0222 Auto-extract shots when Stage 7 opens an empty scene
- Behavior: On Stage 7 mount the UI fetches shots and, if none exist, calls the LLM extraction route and displays the result. An empty extraction produces an error screen with a reload button.
- Trigger / entrypoint: Stage7ShotList useEffect on projectId/sceneId change
- Preconditions: Authenticated session; project owned by user; scene on active branch; GET /shots returns zero rows
- Code path: Stage7ShotList fetchOrExtractShots -> shotService.fetchShots (GET /shots, projects.ts:1534) -> shotService.extractShots -> POST /shots/extract -> ShotExtractionService.extractShots -> locationResolverService.resolveShotLocation/shouldApplyResolution -> location_views insert (stage7_inferred) -> shots insert -> locationResolverService.recordMatchEvent per shot -> transformShotForClient
- Data touched: reads scenes, stage_states (stage 3 and 4 locked content), location_views, project_assets; writes location_views, shots, location_match_events; transformation_flags JSON stored on shots
- Downstream effects: Stage 7 table; Stage 8 and Stage 9 read shots via fetchShots; V7 location state derived from location_match_* columns
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage7ShotList.tsx:157-206; src/components/pipeline/Stage7ShotList.tsx:873-888; src/lib/services/shotService.ts:105-131; backend/src/routes/projects.ts:1711-1977
- Notes: Functional depends on LLM output quality and latency (runtime-only). Route not tested; service tested only with mocks. Re-extraction on a populated scene is not reachable from UI.
- Related: WD-IMPL-AI-0071, V8-STATE-07, WD-IMPL-FACT-0096
- Related product intent: UNKNOWN: WD-IDEA-PHIL-024 || PARTIAL_MATCH: WD-IDEA-SHOT-001,WD-IDEA-SHOT-002,WD-IDEA-SHOT-008,WD-IDEA-SHOT-009

### WD-IMPL-CAP-0223 Edit shot fields in Stage 7 inspector (debounced autosave)
- Behavior: Duration, action, dialogue, foreground and background characters, setting, and camera are editable per shot. Edits update local state immediately and persist via a PUT after an 800 ms debounce.
- Trigger / entrypoint: Stage 7 shot inspector input onChange
- Preconditions: Scene not locked (canEdit true), not saving
- Code path: handleShotUpdate -> pendingUpdates Map -> useDebounce 800 ms -> saveUpdates effect -> shotService.updateShot -> PUT /shots/:shotId -> whitelist check -> optional resolver -> shots.update -> optional location_match_events insert -> transformShotForClient
- Data touched: shots row (duration, dialogue, action, characters_*, setting, camera, plus location_* when resolver runs), location_match_events
- Downstream effects: None in code; prompts (frame_prompt, video_prompt, prompts_generated_at) and frames are not marked stale
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/components/pipeline/Stage7ShotList.tsx:289-306; src/components/pipeline/Stage7ShotList.tsx:123-125; src/components/pipeline/Stage7ShotList.tsx:253-286; src/components/pipeline/Stage7ShotList.tsx:1189-1468; src/lib/services/shotService.ts:51-67; src/lib/services/shotService.ts:137-171; backend/src/routes/projects.ts:2399-2512; backend/src/tests/shotLocationRoutes.test.ts:47-117
- Notes: Only setting edits (and camera_direction_id) re-run the location resolver, covered by shotLocationRoutes test 'resolves and persists location fields when shot setting changes'. Edits do not touch prompts or frames (no invalidation).
- Related: WD-IMPL-STATE-0067, WD-IMPL-FACT-0101
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || PARTIAL_MATCH: WD-IDEA-UX-307,WD-IDEA-UX-308 || PARTIAL_MATCH: WD-IDEA-SHOT-011,WD-IDEA-SHOT-012,WD-IDEA-SHOT-013,WD-IDEA-SHOT-014,WD-IDEA-SHOT-015,WD-IDEA-SHOT-016,WD-IDEA-SHOT-017,WD-IDEA-SHOT-018 || PARTIAL_MATCH: WD-IDEA-SHOT-051,WD-IDEA-SHOT-052,WD-IDEA-SHOT-059,WD-IDEA-SHOT-060

### WD-IMPL-CAP-0224 Split a shot into two (or three) via AI
- Behavior: Split dialog with optional guidance sends the selected shot to the split route; the original row is replaced by AI-generated sub-shots that keep the original duration each.
- Trigger / entrypoint: Stage 7 Split Shot button, then Split dialog confirm
- Preconditions: canEdit (scene not locked); shot selected
- Code path: handleSplitShot -> performSplit -> shotService.splitShot -> POST /shots/:shotId/split -> select original + assignments -> ShotSplitService.splitShot (AI) -> DELETE shot -> shift later shot_order by N-1 -> INSERT N shots (shot_id {orig}-n) -> location_match_events -> clone shot_asset_assignments -> invalidateStage9AndDownstream (fire and forget)
- Data touched: shots (delete, update shot_order, insert), shot_asset_assignments (insert), scenes.stage_locks (9-12), location_match_events; cascade deletes frames, video_generation_jobs, image_generation_jobs, transformation_events for original shot
- Downstream effects: Stage 9-12 locked stages marked outdated; frames and video jobs of the original shot are cascaded away
- Status: P=Y R=Y F=P P=Y T=P
- Evidence: src/components/pipeline/Stage7ShotList.tsx:401-450; src/components/pipeline/Stage7ShotList.tsx:1700-1764; src/lib/services/shotService.ts:258-291; backend/src/routes/projects.ts:2514-2654; backend/src/services/shotSplitService.ts:95-184; backend/src/tests/shotExtraction.test.ts:189-250
- Notes: Non-transactional: delete precedes insert. UI never passes splitCount (default 2). Assignments cloned. Stage 9 prompt cards do not refresh after split from Stage 7 (no state sync).
- Related: WD-IMPL-AI-0073, WD-IMPL-INVALIDATE-0054, WD-IMPL-INVALIDATE-0056, WD-IMPL-FACT-0092, V8-STATE-07
- Related product intent: PARTIAL_MATCH: WD-IDEA-SHOT-053,WD-IDEA-SHOT-054,WD-IDEA-SHOT-055,WD-IDEA-SHOT-056,WD-IDEA-SHOT-058

### WD-IMPL-CAP-0225 Merge selected shot with next or previous shot via AI
- Behavior: Merge button combines the selected shot with its adjacent shot (direction toggle Next or Prev) into a single AI-consolidated shot with summed duration.
- Trigger / entrypoint: Stage 7 inspector Merge button with Next/Prev toggle
- Preconditions: canEdit; selected shot has neighbour in that direction (canMerge)
- Code path: handleMergeShot -> shotService.mergeShot -> POST /shots/:shotId/merge -> neighbour lookup by shot_order -> ShotMergeService.mergeShots (AI) -> DELETE current -> DELETE neighbour -> INSERT merged row -> location_match_events -> shift later shot_order -1
- Data touched: shots (two deletes, one insert, order updates), location_match_events; cascade deletes frames, jobs, assignments of both original shots
- Downstream effects: None in code for Stage 9-12 stage locks
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage7ShotList.tsx:516-547; src/components/pipeline/Stage7ShotList.tsx:1115-1161; src/lib/services/shotService.ts:297-330; backend/src/routes/projects.ts:2657-2788
- Notes: Adjacency uses shot_order plus or minus 1, so gaps produce a 400 even if UI shows a neighbour. No invalidation of Stage 9-12. No tests.
- Related: WD-IMPL-AI-0074, WD-IMPL-FACT-0093, WD-IMPL-FACT-0095, WD-IMPL-INVALIDATE-0057
- Related product intent: PARTIAL_MATCH: WD-IDEA-SHOT-053,WD-IDEA-SHOT-054,WD-IDEA-SHOT-055,WD-IDEA-SHOT-056,WD-IDEA-SHOT-058

### WD-IMPL-CAP-0226 Delete a shot (blocked for the last shot)
- Behavior: Delete removes the selected shot with no confirmation dialog. The backend refuses to delete the last remaining shot and the UI offers to defer the scene instead.
- Trigger / entrypoint: Stage 7 inspector Delete button
- Preconditions: canEdit; shots.length greater than 1 locally (otherwise defer dialog)
- Code path: handleDeleteShot -> shotService.deleteShot -> DELETE /shots/:shotId -> count check (409 LAST_SHOT) -> DELETE shots row filtered by scene_id
- Data touched: shots (delete) and cascaded frames, video_generation_jobs, image_generation_jobs, transformation_events, shot_asset_assignments, location_match_events
- Downstream effects: None in code for Stage 9-12 stage locks (contrast with split)
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage7ShotList.tsx:452-485; src/lib/services/shotService.ts:336-361; backend/src/routes/projects.ts:2791-2840
- Notes: Route counts shots twice (first count unused). No shot_order compaction, so later merge adjacency may break. Delete cascades frames and assignments with no warning.
- Related: WD-IMPL-CAP-0227, WD-IMPL-FACT-0094, WD-IMPL-INVALIDATE-0056
- Related product intent: PARTIAL_MATCH: WD-IDEA-SHOT-051,WD-IDEA-SHOT-052,WD-IDEA-SHOT-059,WD-IDEA-SHOT-060 || PARTIAL_MATCH: WD-IDEA-FLOW-040,WD-IDEA-FLOW-041,WD-IDEA-FLOW-042

### WD-IMPL-CAP-0227 Defer scene from last-shot dialog
- Behavior: When the only shot is selected for deletion, a dialog offers to defer the whole scene (sidelines it) and return to Script Hub.
- Trigger / entrypoint: Last Shot in Scene dialog Defer Scene button
- Preconditions: Shot count 1 locally or 409 LAST_SHOT from delete
- Code path: handleDeferFromLastShot -> sceneService.deferScene -> PUT /scenes/:sceneId/defer -> onBack()
- Data touched: scenes (deferred flag)
- Downstream effects: Scene leaves active pipeline
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage7ShotList.tsx:487-506; src/components/pipeline/Stage7ShotList.tsx:1658-1698; backend/src/routes/projects.ts:1134-1174
- Notes: Defer route is owned by V6 scene slice; cited here only for the Stage 7 entry.
- Related: WD-IMPL-CAP-0226
- Related product intent: PARTIAL_MATCH: WD-IDEA-SHOT-051,WD-IDEA-SHOT-052,WD-IDEA-SHOT-059,WD-IDEA-SHOT-060 || PARTIAL_MATCH: WD-IDEA-FLOW-040,WD-IDEA-FLOW-041,WD-IDEA-FLOW-042

### WD-IMPL-CAP-0228 Lock shot list and proceed to Stage 8
- Behavior: Lock flushes pending edits, runs local then server validation (errors block, warnings need Lock Anyway), sets scene shot_list_locked_at and stage_locks 7, then navigates forward. Stage 7 lock is written by three separate calls.
- Trigger / entrypoint: Stage 7 footer Lock Shot List and Proceed button
- Preconditions: canEdit; shots non-empty; server errors empty; warnings empty or force true
- Code path: handleLockShotList -> flush PUTs -> validateShotsLocally -> lockShotList -> POST /shots/lock -> validateShots (shotValidationService) + buildShotLocationValidationSummary -> scenes update with shot_list_locked_at and stage_locks 7 -> lockStageViaHook -> POST /stage-locks/7/lock -> onComplete -> ProjectView handleSceneStageComplete -> POST /stage-locks/7/lock again
- Data touched: scenes (shot_list_locked_at, updated_at, stage_locks, status via trigger)
- Downstream effects: Stage 8 becomes reachable; stage 7 footer and edit controls disabled
- Status: P=Y R=Y F=P P=Y T=P | labels: DUPLICATED
- Evidence: src/components/pipeline/Stage7ShotList.tsx:697-791; src/components/pipeline/Stage7ShotList.tsx:1520-1645; src/lib/services/shotService.ts:403-436; backend/src/routes/projects.ts:2845-3017; backend/src/routes/sceneStageLocks.ts:56-141; src/pages/ProjectView.tsx:589-614; backend/src/tests/shotLocking4_5_task_11.test.ts:25-56
- Notes: Lock route tests are all it.skip except the 401 case. Backend shot mutation routes do not check the lock. Lock is idempotent when already locked.
- Related: WD-IMPL-STATE-0063, WD-IMPL-STATE-0066, WD-IMPL-INVALIDATE-0055, WD-IMPL-FACT-0091, WD-IMPL-ENTITY-0030
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-002,WD-IDEA-UX-003,WD-IDEA-UX-018,WD-IDEA-UX-019,WD-IDEA-UX-020,WD-IDEA-UX-021,WD-IDEA-UX-022,WD-IDEA-UX-025 || PARTIAL_MATCH: WD-IDEA-UX-007,WD-IDEA-UX-008,WD-IDEA-UX-015,WD-IDEA-UX-017 || PARTIAL_MATCH: WD-IDEA-SHOT-001,WD-IDEA-SHOT-002,WD-IDEA-SHOT-008,WD-IDEA-SHOT-009 || EXACT_MATCH: WD-IDEA-SHOT-063,WD-IDEA-SHOT-064,WD-IDEA-SHOT-065 || EXACT_MATCH: WD-IDEA-FLOW-050,WD-IDEA-FLOW-051,WD-IDEA-FLOW-052

### WD-IMPL-CAP-0229 Unlock Stage 7 with downstream impact confirmation
- Behavior: Unlock is two-phase: the first call returns frame and video counts and an estimated cost, the confirm call sets stage 7 to draft and marks locked downstream stages outdated. A second legacy unlock call always fails and is ignored.
- Trigger / entrypoint: LockedStageHeader Unlock and edit button, then UnlockWarningDialog confirm
- Preconditions: Stage 7 status locked (or outdated, which takes the same header path)
- Code path: handleUnlockAndEdit -> unlockStage (POST /stage-locks/7/unlock confirm false, 409 impact) -> UnlockWarningDialog -> handleConfirmUnlock -> confirmUnlock (POST confirm true) -> stage_locks and shot_list_locked_at update -> best-effort shotService.unlockShotList (POST /shots/unlock, 400 ignored)
- Data touched: scenes (shot_list_locked_at null, stage_locks, status via trigger); read-only counts on frames and videos (status not equal invalidated)
- Downstream effects: Stages 8-12 with locked or outdated status become outdated; prompts, frames, videos and assignments are not deleted
- Status: P=Y R=Y F=P P=Y T=P | labels: LEGACY
- Evidence: src/components/pipeline/Stage7ShotList.tsx:793-835; src/lib/services/sceneStageLockService.ts:95-120; backend/src/routes/sceneStageLocks.ts:145-286; backend/src/routes/projects.ts:3019-3185; backend/src/tests/shotLocking4_5_task_11.test.ts:80-110
- Notes: Legacy /shots/unlock returns 400 'Shot list is not locked' because the stage-locks call already cleared shot_list_locked_at; the UI swallows this. Impact counts query a videos table not created by any migration (UNKNOWN in live DB). Downstream-stage-only cascade: stage 7 is not marked outdated.
- Related: WD-IMPL-STATE-0064, WD-IMPL-DEAD-0030, WD-IMPL-INVALIDATE-0058
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-033,WD-IDEA-UX-034,WD-IDEA-UX-064,WD-IDEA-UX-065 || PARTIAL_MATCH: WD-IDEA-UX-070,WD-IDEA-UX-071,WD-IDEA-UX-072

### WD-IMPL-CAP-0230 Re-lock Stage 7 when outdated
- Behavior: Relock button exists for stage 7 in outdated state, calling the stage-locks relock route. No code path produces a stage 7 outdated state, so the control is effectively unreachable.
- Trigger / entrypoint: LockedStageHeader Re-lock button (only when isOutdated(7))
- Preconditions: stage_locks['7'].status equals outdated
- Code path: handleRelock -> relockStage -> POST /stage-locks/7/relock -> sets stage 7 locked and shot_list_locked_at
- Data touched: scenes.stage_locks, shot_list_locked_at
- Downstream effects: None further
- Status: P=Y R=N F=U P=Y T=N | labels: DEAD
- Evidence: src/components/pipeline/Stage7ShotList.tsx:837-848; src/components/pipeline/Stage7ShotList.tsx:905-918; backend/src/routes/sceneStageLocks.ts:290-375; backend/src/routes/sceneStageLocks.ts:145-286
- Notes: Unlock cascade only touches stages greater than the unlocked stage, so unlocking stage 7 never sets stage 7 itself to outdated. invalidateStage9AndDownstream only touches 9-12. Reachable only if a stage 7 outdated value is written manually.
- Related: WD-IMPL-STATE-0064, WD-IMPL-DEAD-0031

### WD-IMPL-CAP-0231 Assign or clear a camera direction for a shot
- Behavior: Stage 8 location coverage panel assigns a location_views direction to a shot (or clears it), which also sets the shot's location to the direction's parent location. Owned by the V7 UI; the shot-side endpoint is documented here.
- Trigger / entrypoint: Stage 8 LocationCoveragePanel direction select (V7 UI)
- Preconditions: Direction view type direction; direction asset is a location on active branch; not manual conflict
- Code path: assignCameraDirection -> PUT /shots/:shotId/camera-direction -> location_views select -> project_assets select -> optional applyShotLocationResolution (clear) -> shots update (camera_direction_id, location_asset_id, location_match_*)
- Data touched: shots (camera_direction_id, location_asset_id, location_match_confidence, location_match_source, location_match_notes, updated_at)
- Downstream effects: Stage 9 continuity and prompt generation read camera_direction_id and location_asset_id
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/lib/services/locationContinuityService.ts:57-87; src/components/pipeline/Stage8/LocationCoveragePanel.tsx:219; backend/src/routes/projects.ts:2179-2313; backend/src/tests/shotLocationRoutes.test.ts:304-379
- Notes: Set path returns 409 when manual location conflicts; clear path re-resolves location unless manual. No lock check. No match event recorded on this route. Test covers set path only.
- Related: WD-IMPL-ENTITY-0032, WD-IMPL-INVALIDATE-0056
- Related product intent: PARTIAL_MATCH: WD-IDEA-SHOT-076,WD-IDEA-SHOT-077,WD-IDEA-SHOT-081,WD-IDEA-SHOT-082,WD-IDEA-SHOT-083,WD-IDEA-SHOT-084,WD-IDEA-SHOT-085,WD-IDEA-SHOT-088,WD-IDEA-SHOT-090

### WD-IMPL-CAP-0232 Auto-populate shot-asset assignments on Stage 8 and Stage 9 load
- Behavior: When a scene has assets and no assignments, the first Stage 8 or Stage 9 mount creates a throughout assignment for every shot by asset pair.
- Trigger / entrypoint: useShotAssetAutoPopulate effect on Stage 8 and Stage 9 mount
- Preconditions: enabled flag (Stage 8: shots and assets loaded; Stage 9: assets and zero assignments and version 0); hasAssignments false
- Code path: hook -> shotAssetAssignmentService.hasAssignments (GET has-assignments) -> autoPopulate (POST auto-populate) -> shot_asset_assignments insert of missing pairs with presence throughout -> onPopulated toast and version bump
- Data touched: shot_asset_assignments insert
- Downstream effects: Prompt generation treats all assigned pairs as throughout until edited
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/lib/hooks/useShotAssetAutoPopulate.ts:23-63; src/components/pipeline/Stage8VisualDefinition.tsx:302-311; src/components/pipeline/Stage9PromptSegmentation.tsx:150-159; backend/src/routes/shotAssignments.ts:251-267; backend/src/services/shotAssetAssignmentService.ts:183-241; backend/src/tests/shotAssetAssignment.test.ts:231-293; src/lib/services/__tests__/shotAssetAssignmentService.test.ts:209-226
- Notes: Only runs when zero assignments exist; assets added later get no auto assignments unless added via AssetDrawer checklist. Hook itself untested.
- Related: WD-IMPL-FACT-0097, WD-IMPL-STATE-0065
- Related product intent: PARTIAL_MATCH: WD-IDEA-GEN-012,WD-IDEA-GEN-015,WD-IDEA-GEN-016,WD-IDEA-GEN-018,WD-IDEA-GEN-019,WD-IDEA-GEN-020 || PARTIAL_MATCH: WD-IDEA-GEN-100,WD-IDEA-GEN-107,WD-IDEA-GEN-108 || EXACT_MATCH: WD-IDEA-ASSET-200 || EXACT_MATCH: WD-IDEA-ASSET-204 || CONTRADICTED_BY_CODE: WD-IDEA-SHOT-092 || NOT_IMPLEMENTED: WD-IDEA-SHOT-134,WD-IDEA-SHOT-136,WD-IDEA-SHOT-137,WD-IDEA-SHOT-138,WD-IDEA-SHOT-139,WD-IDEA-SHOT-140,WD-IDEA-SHOT-141,WD-IDEA-SHOT-142,WD-IDEA-SHOT-143

### WD-IMPL-CAP-0233 Change presence type of an asset on a shot (Stage 9 panel)
- Behavior: Per-shot Assets panel lets the user change a single assignment between throughout, enters, exits and passes through.
- Trigger / entrypoint: ShotAssetPanel presence Select change
- Preconditions: Panel expanded; assignment exists
- Code path: handlePresenceChange -> shotAssetAssignmentService.updateAssignment -> PUT /shot-assignments/:assignmentId -> validate zod enum -> shotAssetAssignmentService.updateAssignment -> invalidateStage9AndDownstream (fire and forget)
- Data touched: shot_asset_assignments.presence_type, scenes.stage_locks (9-12)
- Downstream effects: Stage 9 prompt generation on next Generate; continuity preview
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/components/pipeline/Stage9/ShotAssetPanel.tsx:98-108; src/components/pipeline/Stage9/ShotAssetPanel.tsx:182-201; src/lib/services/shotAssetAssignmentService.ts:160-170; backend/src/routes/shotAssignments.ts:162-189; src/lib/services/__tests__/shotAssetAssignmentService.test.ts:155-178
- Notes: Errors only console.error. Invalidates Stage 9-12 locks on success.
- Related: WD-IMPL-STATE-0065, WD-IMPL-FACT-0098
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-006,WD-IDEA-UX-185,WD-IDEA-UX-186,WD-IDEA-UX-196,WD-IDEA-UX-199,WD-IDEA-UX-200,WD-IDEA-UX-234 || CONTRADICTED_BY_CODE: WD-IDEA-UX-218 || PARTIAL_MATCH: WD-IDEA-UX-286,WD-IDEA-UX-287,WD-IDEA-UX-288,WD-IDEA-UX-290,WD-IDEA-UX-291,WD-IDEA-UX-292,WD-IDEA-UX-293,WD-IDEA-UX-294 || PARTIAL_MATCH: WD-IDEA-ASSET-201 || EXACT_MATCH: WD-IDEA-SHOT-091,WD-IDEA-SHOT-093

### WD-IMPL-CAP-0234 Remove an asset from a shot (Stage 9 panel)
- Behavior: Trash icon opens a confirmation and deletes the single shot-asset assignment row.
- Trigger / entrypoint: ShotAssetPanel trash button then AlertDialog Remove
- Preconditions: assignment exists
- Code path: handleRemove -> shotAssetAssignmentService.deleteAssignment -> DELETE /shot-assignments/:assignmentId -> deleteAssignment -> invalidateStage9AndDownstream
- Data touched: shot_asset_assignments (delete), scenes.stage_locks
- Downstream effects: Prompt generation ignores removed asset for this shot
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/components/pipeline/Stage9/ShotAssetPanel.tsx:110-122; src/components/pipeline/Stage9/ShotAssetPanel.tsx:283-300; src/lib/services/shotAssetAssignmentService.ts:107-121; backend/src/routes/shotAssignments.ts:195-217; backend/src/tests/shotAssetAssignment.test.ts:210-229
- Notes: Route ownership check does not verify the assignment belongs to the scene (see V8-INV-06).
- Related: WD-IMPL-STATE-0065
- Related product intent: EXACT_MATCH: WD-IDEA-SHOT-091,WD-IDEA-SHOT-093

### WD-IMPL-CAP-0235 Add an asset to a shot (Stage 9 panel)
- Behavior: Add Asset popover lists scene assets not yet assigned to the shot and creates a throughout assignment on selection.
- Trigger / entrypoint: ShotAssetPanel Add Asset popover item
- Preconditions: Unassigned scene asset exists
- Code path: handleAddAsset -> createAssignments -> POST /shot-assignments -> zod parse -> bulkCreateAssignments (upsert) -> invalidateStage9AndDownstream
- Data touched: shot_asset_assignments (upsert), scenes.stage_locks
- Downstream effects: Prompt generation includes asset in start or end manifest per presence type
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/components/pipeline/Stage9/ShotAssetPanel.tsx:124-137; src/components/pipeline/Stage9/ShotAssetPanel.tsx:252-279; src/lib/services/shotAssetAssignmentService.ts:56-78; backend/src/routes/shotAssignments.ts:129-156; backend/src/services/shotAssetAssignmentService.ts:120-157
- Notes: Backend uses upsert onConflict shot_id,scene_asset_instance_id, so re-adding is idempotent. Route validates shotId and instanceId as UUIDs.
- Related: WD-IMPL-STATE-0065
- Related product intent: EXACT_MATCH: WD-IDEA-SHOT-091,WD-IDEA-SHOT-093 || NOT_IMPLEMENTED: WD-IDEA-SHOT-134,WD-IDEA-SHOT-136,WD-IDEA-SHOT-137,WD-IDEA-SHOT-138,WD-IDEA-SHOT-139,WD-IDEA-SHOT-140,WD-IDEA-SHOT-141,WD-IDEA-SHOT-142,WD-IDEA-SHOT-143

### WD-IMPL-CAP-0236 Split shot because it contains a passes-through asset
- Behavior: Amber warning appears when any assignment is passes_through, offering a Split Shot action that calls the AI split route with default count.
- Trigger / entrypoint: ShotAssetPanel Split Shot button then AlertDialog confirm
- Preconditions: At least one passes_through assignment on the shot
- Code path: handleSplitShot -> shotService.splitShot (no guidance) -> POST /shots/:shotId/split -> split pipeline (V8-CAP-03) -> onAssignmentsChanged (assignment reload)
- Data touched: shots, shot_asset_assignments (clone), frames and jobs of original cascaded, scenes.stage_locks
- Downstream effects: Stage 9 prompt set for original shot is stale
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage9/ShotAssetPanel.tsx:78; src/components/pipeline/Stage9/ShotAssetPanel.tsx:80-92; src/components/pipeline/Stage9/ShotAssetPanel.tsx:216-239; src/components/pipeline/Stage9/ShotAssetPanel.tsx:302-319; src/components/pipeline/Stage9PromptSegmentation.tsx:726-736
- Notes: Stage 9 does not pass onShotSplit, so prompt cards are not reloaded after split (only assignments reload). Shot UUID in prompt set becomes stale until page reload.
- Related: WD-IMPL-AI-0073, WD-IMPL-CAP-0224, WD-IMPL-INVALIDATE-0054

### WD-IMPL-CAP-0237 Timeline matrix: cycle shot by asset presence
- Behavior: Timeline view shows assets as rows and shots as columns; each click cycles the cell through none, throughout, enters, exits, passes through, then back to none (delete).
- Trigger / entrypoint: Stage 9 view toggle set to timeline
- Preconditions: Prompt sets with shotUuid and at least one scene asset
- Code path: handleCellClick -> create (POST) if none, else update (PUT) or delete (DELETE) per cycle -> onAssignmentsChanged -> assignmentsVersion bump -> reload
- Data touched: shot_asset_assignments, scenes.stage_locks
- Downstream effects: Stage 9 prompt generation
- Status: P=Y R=Y F=Y P=Y T=P
- Evidence: src/components/pipeline/Stage9/ShotAssetTimeline.tsx:22-96; src/components/pipeline/Stage9/ShotAssetTimeline.tsx:98-175; src/components/pipeline/Stage9PromptSegmentation.tsx:538-545; src/components/pipeline/Stage9/__tests__/ShotAssetTimeline.test.ts:153-210
- Notes: Timeline test file re-implements the cycle logic and does not import the component, so the component is untested. Column header shows ps.shotId label.
- Related: WD-IMPL-TEST-0039, WD-IMPL-STATE-0065
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-286,WD-IDEA-UX-287,WD-IDEA-UX-288,WD-IDEA-UX-290,WD-IDEA-UX-291,WD-IDEA-UX-292,WD-IDEA-UX-293,WD-IDEA-UX-294 || PARTIAL_MATCH: WD-IDEA-ASSET-201 || EXACT_MATCH: WD-IDEA-SHOT-091,WD-IDEA-SHOT-093

### WD-IMPL-CAP-0238 Bulk presence templates (replace all assignments in scene)
- Behavior: Template selector with Apply deletes every assignment in the scene and recreates them from a template. Because the bulk-delete route is shadowed by the single-assignment delete route, the first step fails and no assignments are recreated.
- Trigger / entrypoint: Stage 9 header Bulk template select then Apply then AlertDialog Apply Template
- Preconditions: scene has assets and shots
- Code path: handleApply -> deleteAllForScene -> DELETE /shot-assignments/all (matches /:assignmentId route first) -> error thrown before createAssignments
- Data touched: shot_asset_assignments (intended delete then insert; delete expected to fail)
- Downstream effects: None if failure as inferred
- Status: P=Y R=Y F=N P=N T=P | labels: CONTRADICTED
- Evidence: src/components/pipeline/Stage9/BulkPresenceTemplates.tsx:40-148; src/components/pipeline/Stage9/BulkPresenceTemplates.tsx:152-202; src/components/pipeline/Stage9PromptSegmentation.tsx:503-511; backend/src/routes/shotAssignments.ts:195-245; src/components/pipeline/Stage9/__tests__/BulkPresenceTemplates.test.ts:78-243
- Notes: Static inference (Express matches DELETE /:assignmentId before DELETE /all, so id equals all fails as invalid uuid); runtime not verified. Template pure logic tested; apply path untested.
- Related: WD-IMPL-ROUTE-0119, WD-IMPL-FACT-0097, WD-IMPL-TEST-0038
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-286,WD-IDEA-UX-287,WD-IDEA-UX-288,WD-IDEA-UX-290,WD-IDEA-UX-291,WD-IDEA-UX-292,WD-IDEA-UX-293,WD-IDEA-UX-294

### WD-IMPL-CAP-0239 Choose shots when adding an asset in AssetDrawer
- Behavior: When shots exist, adding an asset opens a checklist preselected by the heuristic matcher and creates the scene instance plus throughout assignments for the selected shots.
- Trigger / entrypoint: AssetDrawer confirm checklist
- Preconditions: shots loaded in drawer
- Code path: startShotChecklist -> matchAssetToShots -> confirmShotChecklist -> sceneAssetService.createSceneAsset -> shotAssetAssignmentService.createAssignments -> POST /shot-assignments
- Data touched: scene_asset_instances (V6), shot_asset_assignments (insert)
- Downstream effects: Prompt generation scoping for chosen shots
- Status: P=Y R=Y F=P P=Y T=P
- Evidence: src/components/pipeline/AssetDrawer.tsx:114-171; src/lib/utils/shotAssetMatcher.ts:57-70; src/lib/utils/__tests__/shotAssetMatcher.test.ts:55-353
- Notes: Instance creation is V5/V6 route; this slice owns the assignment step. Falls back to all shots selected when no heuristic match. Assignment failure after instance creation leaves instance without assignments.
- Related: WD-IMPL-FACT-0097, WD-IMPL-CAP-0232
- Related product intent: PARTIAL_MATCH: WD-IDEA-ASSET-205,WD-IDEA-ASSET-206

## Prompts and frames (Stages 9, 10)

### WD-IMPL-CAP-0240 Stage 9 Generate All / Regenerate All prompts
- Behavior: Button calls promptService.generatePrompts and replaces all shot prompt sets in the scene via LLM frame and video prompt generation.
- Trigger / entrypoint: Stage9PromptSegmentation button Generate All Prompts
- Preconditions: Scene has shots; project owned by user; scene in active branch
- Code path: handleGenerateAllPrompts -> promptService.generatePrompts -> POST /api/projects/:id/scenes/:sceneId/generate-prompts -> PromptGenerationService.generateBulkPromptSets -> UPDATE shots + textFieldVersionService.createVersion
- Data touched: shots (frame_prompt, video_prompt, requires_end_frame, ai_recommends_end_frame, compatible_models, reference_image_order, end_frame_reference_image_order, ai_start_continuity, start_continuity, prompts_generated_at), text_field_versions, reads scene_asset_instances, project_assets, asset_angle_variants, location_views, transformation_events, shot_asset_assignments, projects, style capsule
- Downstream effects: Stage 10 frame generation reads frame_prompt and reference orders
- Status: P=Y R=Y (ProjectView sceneStage 9 render) F=U (runtime LLM needed) P=Y T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:257-290; src/lib/services/promptService.ts:96-127; backend/src/routes/projects.ts:3573-3958; src/pages/ProjectView.tsx:798-806
- Notes: Errors and 429 surfaced as toast. No stage-lock check on route.
- Related: WD-IMPL-AI-0006, WD-IMPL-AI-0009, WD-IMPL-STATE-0071
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-101,WD-IDEA-GEN-102,WD-IDEA-GEN-103 || PARTIAL_MATCH: WD-IDEA-GEN-100,WD-IDEA-GEN-107,WD-IDEA-GEN-108 || NOT_IMPLEMENTED: WD-IDEA-AV-034,WD-IDEA-AV-040,WD-IDEA-AV-042 || EXACT_MATCH: WD-IDEA-SHOT-095 || EXACT_MATCH: WD-IDEA-FLOW-056

### WD-IMPL-CAP-0241 Stage 9 per-shot regenerate prompt
- Behavior: Refresh icon on one shot card regenerates only that shot via the same generate-prompts route with shotIds=[shot uuid].
- Trigger / entrypoint: Stage9 card RefreshCw button
- Preconditions: shotUuid present
- Code path: handleRegenerateShotPrompt -> regenerateSinglePrompt -> generatePrompts(shotIds=[uuid]) -> generate-prompts route
- Data touched: shots prompt columns, text_field_versions
- Downstream effects: Stage 9 card and Stage 10 frame prompts
- Status: P=Y R=Y F=U P=Y T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:292-321; src/lib/services/promptService.ts:132-150; backend/src/routes/projects.ts:3612-3620
- Notes: Single-shot request makes previousShot null so start_continuity is forced to none for that shot.
- Related: WD-IMPL-STATE-0071, WD-IMPL-INVALIDATE-0068
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-101,WD-IDEA-GEN-102,WD-IDEA-GEN-103 || EXACT_MATCH: WD-IDEA-SHOT-095

### WD-IMPL-CAP-0242 Stage 9 debounced autosave of frame and video prompt text
- Behavior: Typing updates local state, queues pending changes, debounces 500 ms, then PUTs each changed shot; no version row is created.
- Trigger / entrypoint: VersionedTextarea onChange in Stage 9 card
- Preconditions: shotUuid present
- Code path: handlePromptUpdate -> pendingUpdates Map -> useDebounce 500 ms -> saveUpdates -> promptService.updatePrompt -> PUT /api/projects/:id/scenes/:sceneId/shots/:shotId/prompts -> UPDATE shots
- Data touched: shots.frame_prompt, shots.video_prompt, shots.updated_at
- Downstream effects: invalidates ['frames'] query on success
- Status: P=Y R=Y F=Y (code path complete) P=Y T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:67-80; src/components/pipeline/Stage9PromptSegmentation.tsx:197-200; src/components/pipeline/Stage9PromptSegmentation.tsx:228-255; src/components/pipeline/Stage9PromptSegmentation.tsx:343-356; backend/src/routes/projects.ts:3459-3570
- Notes: Failed save re-queues. Lock & Proceed disabled while pendingUpdates non-empty. Route validates frame 1500 and video 1000 char max; UI limits are 1000 and 800.
- Related: WD-IMPL-CAP-0245, WD-IMPL-STATE-0070
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-286,WD-IDEA-UX-287,WD-IDEA-UX-288,WD-IDEA-UX-290,WD-IDEA-UX-291,WD-IDEA-UX-292,WD-IDEA-UX-293,WD-IDEA-UX-294 || PARTIAL_MATCH: WD-IDEA-UX-307,WD-IDEA-UX-308

### WD-IMPL-CAP-0243 Stage 9 End Frame switch per shot
- Behavior: Switch in shot header optimistically sets requiresEndFrame and PUTs it; reverts on error.
- Trigger / entrypoint: Stage9 shot header Switch
- Preconditions: shotUuid
- Code path: Switch onCheckedChange -> promptService.updatePrompt({requiresEndFrame}) -> PUT prompts
- Data touched: shots.requires_end_frame
- Downstream effects: Stage 10 generation loop and areAllFramesApproved
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:643-667; backend/src/routes/projects.ts:3512-3517
- Notes: Also available in Stage 10 (handleToggleEndFrame).
- Related: WD-IMPL-CAP-0256
- Related product intent: PARTIAL_MATCH: WD-IDEA-GEN-070,WD-IDEA-GEN-087,WD-IDEA-GEN-104 || PARTIAL_MATCH: WD-IDEA-SHOT-019,WD-IDEA-SHOT-020,WD-IDEA-SHOT-021,WD-IDEA-SHOT-029

### WD-IMPL-CAP-0244 Stage 9 continuity mode select (index > 0)
- Behavior: Select sets startContinuity to none, match or camera_change and PUTs it; none also clears continuity_frame_prompt on the server.
- Trigger / entrypoint: Continuity Select in expanded Stage 9 card
- Preconditions: index > 0
- Code path: Select onValueChange -> setPromptSets -> promptService.updatePrompt({startContinuity}) -> PUT prompts
- Data touched: shots.start_continuity, shots.continuity_frame_prompt (on none)
- Downstream effects: Stage 10 start-frame branch selection
- Status: P=Y R=Y (only for index > 0) F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:756-796; backend/src/routes/projects.ts:3526-3535
- Notes: Optimistic update is not reverted on error; only a toast shows.
- Related: WD-IMPL-STATE-0073
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-UX-218 || EXACT_MATCH: WD-IDEA-CONT-138

### WD-IMPL-CAP-0245 Prompt version save and navigate (frame, video, end frame)
- Behavior: VersionedTextarea Save creates a user_save text_field_versions row and writes it back to shots; arrows select an older or newer version and write it back.
- Trigger / entrypoint: Save button and nav arrows in VersionedTextarea
- Preconditions: shot uuid
- Code path: handleSave -> createShotFieldVersion -> POST field-versions/:fieldName -> textFieldVersionService.createVersion -> INSERT text_field_versions + UPDATE shots
- Data touched: text_field_versions, shots.frame_prompt / video_prompt / end_frame_prompt
- Downstream effects: Stage 9 and Stage 10 text; generation reads shots columns
- Status: P=Y R=Y F=Y P=Y T=P (component render and nav only; service not tested)
- Evidence: src/components/pipeline/VersionedTextarea.tsx:83-153; src/lib/services/textFieldVersionService.ts (client, not read in full); backend/src/routes/frames.ts:2296-2408; backend/src/services/textFieldVersionService.ts:44-241
- Notes: Version list staleTime 30 s. Unsaved edits are local until Save.
- Related: WD-IMPL-STATE-0072, WD-IMPL-ENTITY-0035
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-UX-080 || PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096

### WD-IMPL-CAP-0246 Load Stage 9 prompt sets on mount
- Behavior: Stage 9 fetches all shots of the scene with prompt columns and renders PromptSet cards, auto-expanding the first shot.
- Trigger / entrypoint: Stage 9 render with sceneStage 9
- Preconditions: projectId and activeSceneId
- Code path: loadPrompts -> promptService.fetchPrompts -> GET /api/projects/:id/scenes/:sceneId/prompts -> SELECT shots
- Data touched: shots (read)
- Downstream effects: Stage 9 UI
- Status: P=Y R=Y F=Y P=N (read only) T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:170-172; src/components/pipeline/Stage9PromptSegmentation.tsx:202-226; backend/src/routes/projects.ts:3190-3280
- Notes: Read happens on each mount (component unmounts on navigation).

### WD-IMPL-CAP-0247 Stage 9 Lock and Proceed
- Behavior: Calls lockStage(9), swallowing errors, then onComplete; button disabled when any shot lacks frame or video prompt, or edits pending.
- Trigger / entrypoint: Footer Lock and Proceed button
- Preconditions: hasAllPrompts && pendingUpdates.size === 0
- Code path: lockStage(9) (useSceneStageLock) then onComplete -> handleSceneStageComplete
- Data touched: stage lock state (not read in this slice)
- Downstream effects: Stage 10 becomes reachable
- Status: P=Y R=Y F=P (gate is frontend only) P=Y (via lockStage) T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:953-970; src/components/pipeline/Stage9PromptSegmentation.tsx:359
- Notes: Lock failure is ignored, so onComplete still advances.
- Related: WD-IMPL-FACT-0113
- Related product intent: EXACT_MATCH: WD-IDEA-FLOW-056

### WD-IMPL-CAP-0248 Stage 10 generate start or end frame for one shot
- Behavior: Generate button for a single shot starts a job for its start frame (control startOnly) or end frame (control, after start is ready).
- Trigger / entrypoint: FramePanel Generate start/end Frame button
- Preconditions: Stage 9 prompts exist (frame_prompt not null); end requires start status generated or approved
- Code path: handleGenerateShot -> generateMutation -> frameService.generateFrames -> POST generate-frames -> frameGenerationService.generateFrames -> startFrameGeneration -> ImageGenerationService.createImageJob -> executeJobInBackground (unawaited) -> NanoBananaClient.generateImage
- Data touched: frames, image_generation_jobs, storage bucket asset-images, projects.aspect_ratio, stage_states (broken query)
- Downstream effects: Stage 10 polling, Stage 11 checkout
- Status: P=Y R=Y F=U (needs provider) P=Y T=P (fetchShotReferenceImageContext only)
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:807-809; src/components/pipeline/Stage10FrameGeneration.tsx:1176; src/components/pipeline/Stage10FrameGeneration.tsx:1326-1328; src/lib/services/frameService.ts:125-150; backend/src/routes/frames.ts:227-291; backend/src/services/frameGenerationService.ts:311-495
- Notes: Control startOnly keeps previousEndFrameId null so match and camera_change branches do not run in this path.
- Related: WD-IMPL-AI-0010, WD-IMPL-STATE-0069, WD-IMPL-FACT-0112
- Related product intent: PARTIAL_MATCH: WD-IDEA-GEN-188,WD-IDEA-GEN-191,WD-IDEA-GEN-196

### WD-IMPL-CAP-0249 Stage 10 Quick Mode Generate All / Generate Remaining
- Behavior: Bulk generation over all shots in scene in one request, without shotIds, with startOnly false.
- Trigger / entrypoint: FrameGrid Generate All button
- Preconditions: pendingFrames > 0 and not generating
- Code path: generateMutation mode quick -> generate-frames -> frameGenerationService.generateFrames sequential loop
- Data touched: frames, image_generation_jobs
- Downstream effects: Stage 10 polling
- Status: P=Y R=Y (Quick Mode toggle) F=U P=Y T=N
- Evidence: src/components/pipeline/FrameGrid.tsx:120-161; src/components/pipeline/Stage10FrameGeneration.tsx:811-814; backend/src/services/frameGenerationService.ts:311-495
- Notes: Button enabled while pendingFrames > 0. Pending count includes rejected frames. Generations run concurrently at provider level with no cap.
- Related: WD-IMPL-FACT-0112, WD-IMPL-STATE-0076
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-186,WD-IDEA-GEN-189,WD-IDEA-GEN-190 || PARTIAL_MATCH: WD-IDEA-FLOW-099,WD-IDEA-FLOW-100,WD-IDEA-FLOW-101,WD-IDEA-FLOW-102

### WD-IMPL-CAP-0250 Stage 10 polling refresh while frames are generating
- Behavior: Frames query refetches every 2000 ms while any frame status is generating; no endpoint checks job status.
- Trigger / entrypoint: useQuery refetchInterval on ['frames',projectId,sceneId]
- Preconditions: any frame status generating
- Code path: GET /frames -> fetchFramesForScene + getSceneFrameCosts + areAllFramesApproved + frame_links
- Data touched: reads frames, shots, frame_links, transformation_events
- Downstream effects: UI status badges and buttons
- Status: P=Y R=Y F=P (never terminates after failed job) P=N T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:244-259; backend/src/routes/frames.ts:71-221; src/lib/services/frameService.ts:569-631
- Notes: pollFrameStatus and pollUntilComplete have zero callers.
- Related: WD-IMPL-FACT-0108, WD-IMPL-STATE-0069
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-321,WD-IDEA-UX-322

### WD-IMPL-CAP-0251 Regenerate frame (plain re-roll)
- Behavior: Re-roll or Regenerate button calls the regenerate route, which breaks incoming frame links and regenerates the frame with persisted refs and prompt, then propagates match links immediately.
- Trigger / entrypoint: FramePanel Regenerate or Re-roll
- Preconditions: frame exists; project owned by user
- Code path: regenerateMutation -> POST frames/:id/regenerate -> DELETE frame_links (target) -> frameGenerationService.regenerateFrame -> startFrameGeneration or match copy or camera-change analysis -> propagateFrameLinks
- Data touched: frames, shots (end_frame_prompt, frame_prompt read), image_generation_jobs, frame_links
- Downstream effects: Stage 10 polling
- Status: P=Y R=Y F=U P=Y T=N
- Evidence: src/components/pipeline/FramePanel.tsx:674-698; src/components/pipeline/FramePanel.tsx:855-860; src/lib/services/frameService.ts:204-228; backend/src/routes/frames.ts:365-418; backend/src/services/frameGenerationService.ts:982-1245
- Notes: propagateFrameLinks runs before the new image exists, so targets receive the old image_url.
- Related: WD-IMPL-STATE-0074, WD-IMPL-FACT-0116
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-192,WD-IDEA-GEN-193,WD-IDEA-GEN-194,WD-IDEA-GEN-198

### WD-IMPL-CAP-0252 Regenerate with Correction
- Behavior: Natural-language correction is sent to LLM; corrected prompt replaces shots frame_prompt or end_frame_prompt without versioning, then the frame is regenerated.
- Trigger / entrypoint: FramePanel Regenerate with Correction
- Preconditions: correction non-empty; frame has prompt
- Code path: POST regenerate-with-correction -> applyFramePromptCorrection (LLM) -> UPDATE shots -> frameGenerationService.regenerateFrame
- Data touched: shots.frame_prompt or end_frame_prompt, frames, image_generation_jobs
- Downstream effects: Stage 10 frame image
- Status: P=Y R=Y F=U P=Y T=N
- Evidence: src/components/pipeline/FramePanel.tsx:843-852; src/lib/services/frameService.ts:314-340; backend/src/routes/frames.ts:708-794; backend/src/services/promptGenerationService.ts:1438-1451
- Notes: Does not delete incoming frame_links and does not propagate. Start frames in match or camera_change mode ignore the corrected text in some branches.
- Related: WD-IMPL-AI-0078, WD-IMPL-STATE-0072
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-CONT-027 || EXACT_MATCH: WD-IDEA-CONT-213 || EXACT_MATCH: WD-IDEA-GEN-192,WD-IDEA-GEN-193,WD-IDEA-GEN-194,WD-IDEA-GEN-198

### WD-IMPL-CAP-0253 Generate with Edited Prompt (manual)
- Behavior: User edits the full prompt text; route writes it into shots frame or end prompt unversioned and regenerates.
- Trigger / entrypoint: FramePanel Edit prompt manually then Generate with Edited Prompt
- Preconditions: prompt non-empty
- Code path: POST regenerate-with-prompt -> UPDATE shots -> regenerateFrame
- Data touched: shots prompt column, frames, image_generation_jobs
- Downstream effects: Stage 10
- Status: P=Y R=Y F=U P=Y T=N
- Evidence: src/components/pipeline/FramePanel.tsx:865-905; src/lib/services/frameService.ts:343-370; backend/src/routes/frames.ts:800-871
- Notes: No backend length validation. Frame or end prompt overwritten without a text_field_versions row.
- Related: WD-IMPL-STATE-0072
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-192,WD-IDEA-GEN-193,WD-IDEA-GEN-194,WD-IDEA-GEN-198

### WD-IMPL-CAP-0254 Inpaint frame with mask
- Behavior: User paints a mask and gives an instruction; the mask is stored in storage but not sent to the provider. Job uses the current frame image as the only reference.
- Trigger / entrypoint: Hover Inpaint on a frame image
- Preconditions: frame.imageUrl exists
- Code path: POST inpaint -> frameGenerationService.inpaintFrame -> storeMask (asset-images) -> createImageJob(prompt + inpainting suffix, referenceImageUrl=frame.image_url) -> generateImage
- Data touched: frames.status, inpaint_count, last_inpaint_mask_path, current_job_id; storage asset-images
- Downstream effects: Stage 10
- Status: P=Y R=Y F=P (mask not applied) P=Y T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:795-804; src/components/pipeline/InpaintingModal.tsx:24-46; src/lib/services/frameService.ts:232-258; backend/src/routes/frames.ts:424-478; backend/src/services/frameGenerationService.ts:1250-1324; backend/src/services/image-generation/NanoBananaClient.ts:171-228
- Notes: Status set to generating before job creation; no revert on error. provider.inpaintImage is never called.
- Related: WD-IMPL-PROV-0007, WD-IMPL-FACT-0111
- Related product intent: PARTIAL_MATCH: WD-IDEA-GEN-160,WD-IDEA-GEN-161,WD-IDEA-GEN-162,WD-IDEA-GEN-168,WD-IDEA-GEN-169,WD-IDEA-GEN-176,WD-IDEA-GEN-195

### WD-IMPL-CAP-0255 Upload frame image as variant or reference
- Behavior: User uploads PNG, JPEG or WebP up to 5 MB. Variant replaces the frame image with a zero-cost completed job. Reference appends to reference_image_order.
- Trigger / entrypoint: Start FramePanel upload icon or header Upload icon for end frame
- Preconditions: shot exists in scene; file type and size valid
- Code path: FrameUploadModal -> uploadFrameMutation -> POST upload-frame-image -> supabase.storage asset-images upload -> frames UPDATE or INSERT and image_generation_jobs INSERT (variant) or shots UPDATE reference order (reference)
- Data touched: frames, image_generation_jobs, shots.reference_image_order, shots.end_frame_reference_image_order, frame_links (deleted on variant)
- Downstream effects: Stage 10 and Stage 11
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/FrameUploadModal.tsx:20-195; src/lib/services/frameService.ts:766-800; backend/src/routes/frames.ts:15-29; backend/src/routes/frames.ts:1063-1244
- Notes: Upload storage uses bucket asset-images under frames/uploads path.
- Related: WD-IMPL-STATE-0074, WD-IMPL-ENTITY-0034
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-232,WD-IDEA-UX-235,WD-IDEA-UX-236,WD-IDEA-UX-238,WD-IDEA-UX-239,WD-IDEA-UX-242,WD-IDEA-UX-245 || PARTIAL_MATCH: WD-IDEA-UX-280,WD-IDEA-UX-281,WD-IDEA-UX-283,WD-IDEA-UX-284,WD-IDEA-UX-296,WD-IDEA-UX-297,WD-IDEA-UX-298 || PARTIAL_MATCH: WD-IDEA-GEN-100,WD-IDEA-GEN-107,WD-IDEA-GEN-108 || EXACT_MATCH: WD-IDEA-GEN-192,WD-IDEA-GEN-193,WD-IDEA-GEN-194,WD-IDEA-GEN-198 || NOT_IMPLEMENTED: WD-IDEA-SHOT-120,WD-IDEA-SHOT-121,WD-IDEA-SHOT-122,WD-IDEA-SHOT-123,WD-IDEA-SHOT-124,WD-IDEA-SHOT-125,WD-IDEA-SHOT-127,WD-IDEA-SHOT-128,WD-IDEA-SHOT-129,WD-IDEA-SHOT-130

### WD-IMPL-CAP-0256 Generate end frame prompt with LLM
- Behavior: Button generates end_frame_prompt from the start frame prompt, scene assets and next-shot continuity, and saves it with an ai_generation version.
- Trigger / entrypoint: End Frame Prompt Generate button
- Preconditions: shots.frame_prompt not null
- Code path: generateEndFramePromptMutation -> POST generate-end-frame-prompt -> generateEndFramePrompt (LLM) -> UPDATE shots.end_frame_prompt -> textFieldVersionService.createVersion
- Data touched: shots.end_frame_prompt, text_field_versions
- Downstream effects: End frame generation
- Status: P=Y R=Y F=U P=Y T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:1621-1678; src/lib/services/frameService.ts:260-284; backend/src/routes/frames.ts:519-658; backend/src/services/promptGenerationService.ts:1270-1353
- Notes: Uses unscoped scene assets (no assignments), overwrites any user end prompt.
- Related: WD-IMPL-AI-0007, WD-IMPL-FACT-0117
- Related product intent: EXACT_MATCH: WD-IDEA-CONT-118 || CONTRADICTED_BY_CODE: WD-IDEA-GEN-109

### WD-IMPL-CAP-0257 Edit frame, video, and end frame prompts in Stage 10
- Behavior: Stage 10 text areas edit local state and persist only via VersionedTextarea Save (field-versions); no autosave.
- Trigger / entrypoint: Stage 10 Shot Context prompt editors
- Preconditions: selected shot
- Code path: local state -> VersionedTextarea Save -> textFieldVersionService.createShotFieldVersion -> POST field-versions/:fieldName
- Data touched: text_field_versions, shots prompt column
- Downstream effects: Generation reads shots columns
- Status: P=Y R=Y F=Y P=Y (on Save only) T=P (VersionedTextarea)
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:1451-1618; src/components/pipeline/Stage10FrameGeneration.tsx:617-623; src/components/pipeline/VersionedTextarea.tsx:136-153
- Notes: Unsaved edits are lost when the selected shot changes.
- Related: WD-IMPL-CAP-0245, WD-IMPL-STATE-0072
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-CONT-027 || EXACT_MATCH: WD-IDEA-CONT-213

### WD-IMPL-CAP-0258 Select a previous generation as current frame
- Behavior: Carousel Select sets frames.current_job_id and image_url from a completed job, clears approved_at, and sets status generated.
- Trigger / entrypoint: Carousel item Select button
- Preconditions: job status completed
- Code path: selectMutation -> PUT select-generation -> UPDATE frames -> propagateFrameLinks
- Data touched: frames.current_job_id, image_url, prompt_snapshot, status, approved_at; frame_links read for propagation
- Downstream effects: Stage 10 image
- Status: P=Y R=Y (carousel shown when generation_count greater than 1) F=Y P=Y T=N
- Evidence: src/components/pipeline/FramePanel.tsx:207-229; src/components/pipeline/FramePanel.tsx:413-450; src/lib/services/frameService.ts:433-458; backend/src/routes/frames.ts:1315-1400
- Notes: Job lookup does not verify the job belongs to this frame or project. storage_path not updated.
- Related: WD-IMPL-STATE-0069, WD-IMPL-INVALIDATE-0064
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-232,WD-IDEA-UX-235,WD-IDEA-UX-236,WD-IDEA-UX-238,WD-IDEA-UX-239,WD-IDEA-UX-242,WD-IDEA-UX-245 || PARTIAL_MATCH: WD-IDEA-UX-280,WD-IDEA-UX-281,WD-IDEA-UX-283,WD-IDEA-UX-284,WD-IDEA-UX-296,WD-IDEA-UX-297,WD-IDEA-UX-298 || PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096

### WD-IMPL-CAP-0259 Delete a non-current generation
- Behavior: Carousel Delete removes a completed job row and decrements generation_count, provided the job is not current and at least two completed jobs exist.
- Trigger / entrypoint: Carousel item Delete button
- Preconditions: not current; at least 2 completed jobs
- Code path: deleteMutation -> DELETE generations/:jobId -> storage.remove(frames bucket) -> DELETE image_generation_jobs -> UPDATE frames.generation_count
- Data touched: image_generation_jobs, frames.generation_count, storage
- Downstream effects: Carousel
- Status: P=Y R=Y F=P (storage object removed from wrong bucket) P=Y T=N | labels: LEGACY
- Evidence: src/components/pipeline/FramePanel.tsx:222-229; src/components/pipeline/FramePanel.tsx:445-455; src/lib/services/frameService.ts:461-485; backend/src/routes/frames.ts:1406-1492
- Notes: Storage remove targets bucket frames, but uploads go to asset-images.
- Related: WD-IMPL-INVALIDATE-0063, WD-IMPL-FACT-0120

### WD-IMPL-CAP-0260 Load generation history carousel
- Behavior: For frames with generation_count greater than 1, fetches completed jobs for the shot and frame type, with a current flag from current_job_id.
- Trigger / entrypoint: FramePanel mount when generation_count > 1
- Preconditions: generation_count > 1
- Code path: useQuery -> GET frames/:frameId/generations -> SELECT image_generation_jobs
- Data touched: image_generation_jobs read
- Downstream effects: Carousel
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/FramePanel.tsx:202-211; src/lib/services/frameService.ts:401-428; backend/src/routes/frames.ts:1250-1309
- Notes: Lists jobs by shot_id and job_type, not by a frame FK. Source badge is never populated.
- Related: WD-IMPL-ENTITY-0034
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-052,WD-IDEA-UX-074,WD-IDEA-UX-075,WD-IDEA-UX-076,WD-IDEA-UX-079,WD-IDEA-UX-081,WD-IDEA-UX-084,WD-IDEA-UX-095,WD-IDEA-UX-096

### WD-IMPL-CAP-0261 Stage 10 Lock and Proceed
- Behavior: Disabled unless every required frame is generated or approved and strict continuity is not blocking; calls lockStage(10), then onComplete.
- Trigger / entrypoint: Footer Lock and Proceed
- Preconditions: allFramesApproved && !strictContinuityBlocked
- Code path: lockStage(10) -> onComplete
- Data touched: stage lock state
- Downstream effects: Stage 11
- Status: P=Y R=Y F=P (gate frontend only) P=Y (via lockStage) T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:1688-1702; src/components/pipeline/Stage10FrameGeneration.tsx:283-286; backend/src/services/frameGenerationService.ts:1520-1538
- Notes: Approval is never set by UI, but generated frames pass the gate.
- Related: WD-IMPL-INVALIDATE-0060, WD-IMPL-FACT-0113
- Related product intent: EXACT_MATCH: WD-IDEA-UX-273,WD-IDEA-UX-277,WD-IDEA-UX-279

### WD-IMPL-CAP-0262 Stage 10 toggle end frame on or off
- Behavior: Switch on each shot enables or disables requires_end_frame with optimistic update and revert on error.
- Trigger / entrypoint: End Frame Switch in Stage 10
- Preconditions: selected shot
- Code path: handleToggleEndFrame -> promptService.updatePrompt -> PUT prompts
- Data touched: shots.requires_end_frame
- Downstream effects: Gating and generation
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:574-607; src/components/pipeline/Stage10FrameGeneration.tsx:1299-1302; src/components/pipeline/Stage10FrameGeneration.tsx:1420-1423
- Notes: Existing end frame row is not deleted when turned off.
- Related: WD-IMPL-CAP-0243
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-186,WD-IDEA-GEN-189,WD-IDEA-GEN-190 || PARTIAL_MATCH: WD-IDEA-SHOT-019,WD-IDEA-SHOT-020,WD-IDEA-SHOT-021,WD-IDEA-SHOT-029

### WD-IMPL-CAP-0263 Stage 10 Unlink all continuity (sidebar)
- Behavior: Loops over shots except the first and PUTs startContinuity none for each, then invalidates frames.
- Trigger / entrypoint: Unlink button in sidebar
- Preconditions: shots length greater than 1
- Code path: loop promptService.updatePrompt -> PUT prompts
- Data touched: shots.start_continuity, continuity_frame_prompt
- Downstream effects: Generation branch selection
- Status: P=Y R=Y (Control mode sidebar with more than one shot) F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:1029-1044
- Notes: Sequential awaited calls; a failure aborts the loop without toast.
- Related: WD-IMPL-STATE-0073

### WD-IMPL-CAP-0264 Stage 10 slider comparison of adjacent frames
- Behavior: Compare button opens a slider between previous shot end frame (or prior scene end) and current start frame; client-only.
- Trigger / entrypoint: FramePanel Compare button
- Preconditions: start frame image and comparable previous frame image
- Code path: handleCompare -> setComparisonImages -> SliderComparison
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y (when comparable images exist) F=Y P=N T=N
- Evidence: src/components/pipeline/Stage10FrameGeneration.tsx:752-782; src/components/pipeline/Stage10FrameGeneration.tsx:1705-1717
- Notes: No server call.
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-218,WD-IDEA-CONT-219 || PARTIAL_MATCH: WD-IDEA-GEN-160,WD-IDEA-GEN-161,WD-IDEA-GEN-162,WD-IDEA-GEN-168,WD-IDEA-GEN-169,WD-IDEA-GEN-176,WD-IDEA-GEN-195

### WD-IMPL-CAP-0265 Stage 9 expanded card read-only continuity prompt display
- Behavior: For camera_change shots, shows continuity_frame_prompt read-only with Regenerate (V7 route).
- Trigger / entrypoint: Regenerate in Stage 9 camera_change block
- Preconditions: startContinuity camera_change
- Code path: promptService.generateContinuityPrompt -> POST generate-continuity-prompt (V7)
- Data touched: shots.continuity_frame_prompt
- Downstream effects: Stage 10 generation
- Status: P=Y R=Y F=U P=Y (via V7 route) T=N
- Evidence: src/components/pipeline/Stage9PromptSegmentation.tsx:849-894; src/lib/services/promptService.ts:154-181
- Notes: Generate route belongs to V7 slice (frames.ts:2148).
- Related: WD-IMPL-AI-0008

## Confirmation, video, credits (Stages 11, 12)

### WD-IMPL-CAP-0266 Stage 11 checkout view: per-shot cost cards and scene cost summary
- Behavior: Shows shot cards (start/end thumbnails with unapproved overlay, shot id, duration, start-frame status badge, prompt line, total shot cost) and sidebar totals: shots, duration, image costs, video generation, total scene cost, balance, project running total.
- Trigger / entrypoint: ProjectView sceneStage===11 -> Stage11Confirmation
- Preconditions: scene has >=1 shot (else error screen)
- Code path: Stage11Confirmation useQuery([checkout]) -> checkoutService.getCostBreakdown -> GET cost-breakdown -> getSceneCostBreakdown -> shots, frames, video_generation_jobs, user_credits
- Data touched: read shots, frames, scenes, video_generation_jobs; read/insert user_credits
- Downstream effects: Confirm & Render
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage11Confirmation.tsx:L63-73,L142-425; src/pages/ProjectView.tsx:L816-824
- Related: WD-IMPL-ROUTE-0123
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-099,WD-IDEA-UX-102 || PARTIAL_MATCH: WD-IDEA-UX-302,WD-IDEA-UX-303,WD-IDEA-UX-306 || PARTIAL_MATCH: WD-IDEA-UX-346 || EXACT_MATCH: WD-IDEA-GEN-262,WD-IDEA-GEN-264,WD-IDEA-GEN-273 || PARTIAL_MATCH: WD-IDEA-FLOW-058,WD-IDEA-FLOW-059

### WD-IMPL-CAP-0267 Select video model variant (Veo 3.1 Fast vs Standard)
- Behavior: Two toggle buttons set local modelVariant (default veo_3_1_fast), switching displayed totals and the variant sent on confirm. Not persisted.
- Trigger / entrypoint: Stage 11 sidebar Model Selection buttons
- Preconditions: checkout data loaded
- Code path: setModelVariant (React state) -> totalCost recompute; sent in confirmRender body
- Data touched: none until confirm (then video_generation_jobs.model_variant)
- Downstream effects: Veo model id mapping
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage11Confirmation.tsx:L61,L100-105,L268-309
- Related product intent: EXACT_MATCH: WD-IDEA-GEN-238,WD-IDEA-GEN-247

### WD-IMPL-CAP-0268 Expand Stage 11 shot card for details
- Behavior: Click toggles expanded view showing image cost, video cost for selected variant, frame prompt, video prompt, start/end frame status badges. Read-only.
- Trigger / entrypoint: click shot card header
- Preconditions: none
- Code path: toggleExpanded -> expandedShots state
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage11Confirmation.tsx:L88-94,L541-594
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-302,WD-IDEA-UX-303,WD-IDEA-UX-306

### WD-IMPL-CAP-0269 Stage 11 dependency warnings (unapproved frames, prior scene not rendered)
- Behavior: Amber banner when any existing start frame (or required end frame) is not approved, or when prior scene has no/incomplete jobs. Non-blocking. Prior-scene branch never fires because the query selects nonexistent column end_frame_thumbnail.
- Trigger / entrypoint: automatic on Stage 11 load
- Preconditions: frames with status != approved; scene_number > 1 for prior check
- Code path: getSceneCostBreakdown L186-192; getDependencyWarnings L274-313
- Data touched: read frames, scenes, video_generation_jobs
- Downstream effects: none (does not gate confirm)
- Status: P=Y R=Y F=P P=N T=N | labels: PARTIAL
- Evidence: backend/src/services/videoGenerationService.ts:L186-192,L285-310; backend/migrations/013_add_end_frame_thumbnail.sql:L6-7; src/components/pipeline/Stage11Confirmation.tsx:L192-217
- Notes: Missing frames are not counted as unapproved.
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-302,WD-IDEA-UX-303,WD-IDEA-UX-306 || NOT_IMPLEMENTED: WD-IDEA-UX-304,WD-IDEA-UX-305 || PARTIAL_MATCH: WD-IDEA-PHIL-006 || PARTIAL_MATCH: WD-IDEA-PHIL-058,WD-IDEA-PHIL-060 || PARTIAL_MATCH: WD-IDEA-FLOW-058,WD-IDEA-FLOW-059

### WD-IMPL-CAP-0270 Credit balance display, low-balance badge, insufficient-credit gating
- Behavior: Shows balance ($ formatted), Low Balance badge when balance < threshold (default 10), "Insufficient credits" text and disables Confirm when balance < selected total. Backend re-checks.
- Trigger / entrypoint: Stage 11 sidebar
- Preconditions: none; first visit auto-creates 100.00 balance
- Code path: CheckoutData.userBalance/isLowCredit from userCreditsService.getBalance
- Data touched: user_credits
- Downstream effects: Confirm disabled state
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage11Confirmation.tsx:L325-350,L377; backend/src/services/userCreditsService.ts:L78-86
- Related: WD-IMPL-TABLE-0025
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-302,WD-IDEA-UX-303,WD-IDEA-UX-306 || NOT_IMPLEMENTED: WD-IDEA-UX-304,WD-IDEA-UX-305 || PARTIAL_MATCH: WD-IDEA-ALT-017 || EXACT_MATCH: WD-IDEA-GEN-262,WD-IDEA-GEN-264,WD-IDEA-GEN-273

### WD-IMPL-CAP-0271 Confirm & Render: queue per-shot video jobs and charge credits
- Behavior: Inserts one queued video_generation_jobs row per shot with a start-frame image URL, deducts the full scene total (all shots video cost + frame image costs) from user_credits, fires the executor, toasts, locks stage 11 (best-effort) and advances to stage 12.
- Trigger / entrypoint: Stage 11 "Confirm & Render" button
- Preconditions: balance >= total; >=1 shot with start frame image_url
- Code path: Stage11 confirmMutation -> checkoutService.confirmRender -> POST confirm-render -> confirmAndQueueRender -> insert video_generation_jobs -> userCreditsService.deductCredits -> triggerJobProcessing -> VideoJobExecutor.processQueuedJobs; onSuccess -> ProjectView.handleSceneStageComplete -> sceneStageLockService.lockStage(11) -> setSceneStage(12)
- Data touched: video_generation_jobs insert; user_credits update; scenes.stage_locks
- Downstream effects: executor, Stage 12, Script Hub badges
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage11Confirmation.tsx:L75-98,L373-390; backend/src/services/videoGenerationService.ts:L318-408; src/pages/ProjectView.tsx:L589-615
- Notes: functional P: re-confirm duplicates and recharges; skipped shots still charged; insert-then-deduct not atomic.
- Related: WD-IMPL-ROUTE-0125, WD-IMPL-TABLE-0026, WD-IMPL-TABLE-0025
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-302,WD-IDEA-UX-303,WD-IDEA-UX-306 || PARTIAL_MATCH: WD-IDEA-ALT-017 || PARTIAL_MATCH: WD-IDEA-PHIL-054,WD-IDEA-PHIL-055,WD-IDEA-PHIL-056 || PARTIAL_MATCH: WD-IDEA-FLOW-005,WD-IDEA-FLOW-007,WD-IDEA-FLOW-008 || PARTIAL_MATCH: WD-IDEA-FLOW-058,WD-IDEA-FLOW-059

### WD-IMPL-CAP-0272 Project running total of video spend
- Behavior: Stage 11 shows "Project total so far" = sum over all project jobs of actual_cost (completed) else estimated_cost (incl. failed). Hidden when 0.
- Trigger / entrypoint: Stage 11 sidebar
- Preconditions: any prior job in project
- Code path: getProjectRunningTotal
- Data touched: read video_generation_jobs
- Downstream effects: none
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/services/videoGenerationService.ts:L252-269; src/components/pipeline/Stage11Confirmation.tsx:L352-358
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-346

### WD-IMPL-CAP-0273 Stage 12 job progress with 3s polling and ETA
- Behavior: Header shows progress %, completed/total, active count and ETA (~avg gen time x active). React Query refetches every 3s while any job is queued/processing/generating/uploading; stops otherwise. Completion toast once per mount.
- Trigger / entrypoint: ProjectView sceneStage===12 -> Stage12VideoGeneration
- Preconditions: jobs exist (else "No Video Jobs" empty state)
- Code path: useQuery([video-jobs]) refetchInterval -> checkoutService.getVideoJobs -> GET video-jobs
- Data touched: read video_generation_jobs
- Downstream effects: player, timeline, shot list
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage12VideoGeneration.tsx:L56-88,L249-279; src/components/pipeline/Stage12/utils.ts:L89-105
- Related: WD-IMPL-ROUTE-0126
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-321,WD-IDEA-UX-322 || EXACT_MATCH: WD-IDEA-AV-045,WD-IDEA-AV-046,WD-IDEA-AV-047,WD-IDEA-AV-051

### WD-IMPL-CAP-0274 Sequential scene playback of per-shot clips (dual video preload)
- Behavior: Plays completed job video_url clips back to back using two <video> elements (active + preloaded next playable), auto-advances on ended, pauses at end. Overlays for paused/failed/rendering states. No server-side stitching.
- Trigger / entrypoint: Stage 12 Play Scene / big play button
- Preconditions: >=1 completed job with videoUrl
- Code path: Stage12 handlePlayPause/handleShotEnded -> VideoPlayer effects
- Data touched: none (React state only)
- Downstream effects: timeline playhead
- Status: P=Y R=Y F=U P=N T=N
- Evidence: src/components/pipeline/Stage12/VideoPlayer.tsx:L39-236; src/components/pipeline/Stage12VideoGeneration.tsx:L92-137
- Notes: functional U: browser behavior only verifiable at runtime. With mock provider every clip is the same sample MP4.
- Related product intent: PARTIAL_MATCH: WD-IDEA-AV-043,WD-IDEA-AV-044

### WD-IMPL-CAP-0275 Timeline scrub/seek across shots
- Behavior: Segment bar sized by job durationSeconds and colored by status; click/drag maps x to global time -> (shotIndex, localOffset) -> seek. Playhead from timeupdate.
- Trigger / entrypoint: Stage 12 TimelineBar mouse down/drag
- Preconditions: jobs loaded
- Code path: TimelineBar.computeSeekFromX -> resolveGlobalTime -> Stage12.handleSeek -> VideoPlayer seekTarget effect
- Data touched: none
- Downstream effects: player position
- Status: P=Y R=Y F=U P=N T=N
- Evidence: src/components/pipeline/Stage12/TimelineBar.tsx:L18-117; src/components/pipeline/Stage12/utils.ts:L43-86
- Notes: Segment widths use DB duration, not real media length (Veo clamps to 4/6/8; mock sample length differs).
- Related product intent: PARTIAL_MATCH: WD-IDEA-AV-043,WD-IDEA-AV-044

### WD-IMPL-CAP-0276 Player controls: skip back/forward, mute, fullscreen
- Behavior: Skip changes job index by 1 (including non-playable), mute toggles both video elements, fullscreen requests on container.
- Trigger / entrypoint: Stage 12 controls bar
- Preconditions: none
- Code path: Stage12 handleSkipBack/Forward/ToggleMute/Fullscreen
- Data touched: none
- Downstream effects: none
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage12VideoGeneration.tsx:L139-156; src/components/pipeline/Stage12/VideoPlayer.tsx:L351-383

### WD-IMPL-CAP-0277 Manual retry of a failed video job
- Behavior: Retry buttons on failed overlay and failed shot card call retry route; job reset to queued and executor triggered; toast and refetch. Only one further attempt because attempt_count is not reset. No credit charge.
- Trigger / entrypoint: Stage 12 "Retry Job" (VideoPlayer) / "Retry" (ShotListPanel card)
- Preconditions: job.status === failed
- Code path: Stage12.handleRetryJob -> checkoutService.retryVideoJob -> POST retry -> retryJob -> triggerJobProcessing
- Data touched: video_generation_jobs update
- Downstream effects: executor
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: src/components/pipeline/Stage12VideoGeneration.tsx:L158-166; src/components/pipeline/Stage12/VideoPlayer.tsx:L295-317; src/components/pipeline/Stage12/ShotListPanel.tsx:L128-143; backend/src/services/videoGenerationService.ts:L563-597
- Related: WD-IMPL-ROUTE-0130
- Related product intent: EXACT_MATCH: WD-IDEA-AV-045,WD-IDEA-AV-046,WD-IDEA-AV-047,WD-IDEA-AV-051

### WD-IMPL-CAP-0278 Automatic background video generation with auto-retry
- Behavior: In-process global serial executor processes queued jobs oldest-first through processing->generating->provider->uploading->completed, or re-queues on error until 3 total attempts then failed.
- Trigger / entrypoint: triggered by confirm-render or retry (fire-and-forget)
- Preconditions: queued rows exist; executor not already running in this process
- Code path: VideoGenerationService.triggerJobProcessing -> VideoJobExecutor.processQueuedJobs -> processJob -> provider.generateVideo -> updateJobStatus -> checkAndUpdateSceneStatus
- Data touched: video_generation_jobs, projects.aspect_ratio read, scenes.status, storage bucket videos (veo3)
- Downstream effects: Stage 12 polling, Script Hub badges
- Status: P=Y R=Y F=P P=Y T=N
- Evidence: backend/src/services/video-generation/VideoJobExecutor.ts:L27-172
- Notes: No startup recovery; stuck jobs after restart stay forever.
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-302,WD-IDEA-UX-303,WD-IDEA-UX-306 || PARTIAL_MATCH: WD-IDEA-AV-052,WD-IDEA-AV-053

### WD-IMPL-CAP-0279 Complete Scene (lock stage 12, return to Script Hub)
- Behavior: Enabled when every job is completed or failed; calls onComplete -> lock stage 12 (needs stage 11 locked) -> toast "Scene completed!" -> exit to Script Hub.
- Trigger / entrypoint: Stage 12 ShotListPanel "Complete Scene" or LockedStageHeader
- Preconditions: allComplete
- Code path: ShotListPanel onComplete -> Stage12.handleComplete -> ProjectView.handleSceneStageComplete -> sceneStageLockService.lockStage(12) -> handleExitScene
- Data touched: scenes.stage_locks, localStorage stage
- Downstream effects: Script Hub
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage12/ShotListPanel.tsx:L207-221; src/components/pipeline/Stage12VideoGeneration.tsx:L168-176,L229-241; src/pages/ProjectView.tsx:L589-615
- Related product intent: EXACT_MATCH: WD-IDEA-AV-045,WD-IDEA-AV-046,WD-IDEA-AV-047,WD-IDEA-AV-051 || PARTIAL_MATCH: WD-IDEA-FLOW-005,WD-IDEA-FLOW-007,WD-IDEA-FLOW-008 || PARTIAL_MATCH: WD-IDEA-FLOW-058,WD-IDEA-FLOW-059

### WD-IMPL-CAP-0280 "Unsatisfied with results?" return-to-stage
- Behavior: Popover issue types -> confirm modal with optional description -> setSceneStage(7|8|9). Description discarded; no unlock, invalidation, or persistence.
- Trigger / entrypoint: Stage 12 ShotListPanel (only when allComplete)
- Preconditions: allComplete
- Code path: UnsatisfiedDropdown.handleConfirm -> onReturnToStage -> ProjectView.handleReturnToStage -> setSceneStage
- Data touched: React state only
- Downstream effects: target stage shows locked header if locked
- Status: P=Y R=Y F=P P=N T=N | labels: PARTIAL
- Evidence: src/components/pipeline/Stage12/UnsatisfiedDropdown.tsx:L16-48; src/pages/ProjectView.tsx:L758-762
- Notes: Mapping visual-continuity->8, timing->7, dialogue-audio->9, narrative-structure->7.
- Related product intent: CONTRADICTED_BY_CODE: WD-IDEA-UX-044,WD-IDEA-UX-047,WD-IDEA-UX-049,WD-IDEA-UX-050,WD-IDEA-UX-051,WD-IDEA-UX-053,WD-IDEA-UX-054 || CONTRADICTED_BY_CODE: WD-IDEA-AV-048,WD-IDEA-AV-049

### WD-IMPL-CAP-0281 Export (Download MP4, YouTube, Google Drive, CapCut)
- Behavior: Four permanently disabled buttons with "Soon" badge; no handlers, no service, no route. Nothing is exported.
- Trigger / entrypoint: Stage 12 ShotListPanel when allComplete
- Preconditions: n/a
- Code path: ExportSection (static)
- Data touched: none
- Downstream effects: none
- Status: P=P R=Y F=N P=N T=N | labels: MOCK-ONLY
- Evidence: src/components/pipeline/Stage12/ExportSection.tsx:L10-44; src/components/pipeline/Stage12/ShotListPanel.tsx:L199-205
- Related product intent: NOT_IMPLEMENTED: WD-IDEA-UX-348,WD-IDEA-UX-349,WD-IDEA-UX-350,WD-IDEA-UX-351,WD-IDEA-UX-352,WD-IDEA-UX-353,WD-IDEA-UX-354,WD-IDEA-UX-355 || NOT_IMPLEMENTED: WD-IDEA-AV-055,WD-IDEA-AV-056,WD-IDEA-AV-057,WD-IDEA-AV-059,WD-IDEA-AV-060,WD-IDEA-AV-061,WD-IDEA-AV-062 || NOT_IMPLEMENTED: WD-IDEA-AV-077,WD-IDEA-AV-078,WD-IDEA-AV-079,WD-IDEA-AV-080,WD-IDEA-AV-081 || NOT_IMPLEMENTED: WD-IDEA-PHIL-095,WD-IDEA-PHIL-097 || NOT_IMPLEMENTED: WD-IDEA-SHOT-187,WD-IDEA-SHOT-188,WD-IDEA-SHOT-189,WD-IDEA-SHOT-190,WD-IDEA-SHOT-191,WD-IDEA-SHOT-192,WD-IDEA-SHOT-193,WD-IDEA-SHOT-194,WD-IDEA-SHOT-195,WD-IDEA-SHOT-196,WD-IDEA-SHOT-197,WD-IDEA-SHOT-198,+6 || PARTIAL_MATCH: WD-IDEA-FLOW-011,WD-IDEA-FLOW-012,WD-IDEA-FLOW-013,WD-IDEA-FLOW-014

### WD-IMPL-CAP-0282 Script Hub render badges and Review Video entry
- Behavior: Polls batch-render-status every 10s; shows "Review Ready" when scene status complete, "Rendering" when rendering; Review Video button enters scene at stage 12. partial/failed show nothing.
- Trigger / entrypoint: Stage6ScriptHub mount
- Preconditions: scenes loaded
- Code path: Stage6ScriptHub effect -> checkoutService.getBatchRenderStatus -> GET batch-render-status -> getBatchRenderStatus
- Data touched: read video_generation_jobs
- Downstream effects: onEnterSceneAtStage(sceneId,12)
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/Stage6ScriptHub.tsx:L114-138,L311-330,L423-432
- Related: WD-IMPL-ROUTE-0129
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-300 || PARTIAL_MATCH: WD-IDEA-AV-052,WD-IDEA-AV-053 || PARTIAL_MATCH: WD-IDEA-FLOW-032,WD-IDEA-FLOW-033,WD-IDEA-FLOW-034,WD-IDEA-FLOW-035,WD-IDEA-FLOW-036,WD-IDEA-FLOW-037

### WD-IMPL-CAP-0283 Stage 10 frame cost/progress bar (CostDisplay)
- Behavior: Presentational bar showing totalCredits (2dp "credits"), ready/generating/total frames progress and status badge. Rendered only in Stage 10.
- Trigger / entrypoint: Stage10FrameGeneration render
- Preconditions: none
- Code path: Stage10 framesData.costSummary -> CostDisplay props
- Data touched: none (props from frameGenerationService.getSceneFrameCosts)
- Downstream effects: none
- Status: P=Y R=Y F=Y P=N T=N
- Evidence: src/components/pipeline/CostDisplay.tsx:L13-98; src/components/pipeline/Stage10FrameGeneration.tsx:L281,L898-903
- Related product intent: PARTIAL_MATCH: WD-IDEA-UX-346 || CONTRADICTED_BY_CODE: WD-IDEA-UX-347 || PARTIAL_MATCH: WD-IDEA-GEN-263,WD-IDEA-GEN-267,WD-IDEA-GEN-281

### WD-IMPL-CAP-0284 Auto-provision 100.00 starting credits
- Behavior: Any balance read (Stage 11 load, credit-balance, confirm) creates a user_credits row with balance 100.00 and threshold 10.00 if missing.
- Trigger / entrypoint: automatic on first Stage 11 load
- Preconditions: no user_credits row
- Code path: userCreditsService.ensureUserCredits
- Data touched: user_credits insert
- Downstream effects: all credit checks
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: backend/src/services/userCreditsService.ts:L20-73
- Related: WD-IMPL-TABLE-0025
- Related product intent: PARTIAL_MATCH: WD-IDEA-ALT-017

### WD-IMPL-CAP-0285 Unlock / relock Stage 11 from locked header
- Behavior: When stage 11 locked/outdated, LockedStageHeader offers Unlock & Edit (impact dialog, confirmUnlock) and Relock if outdated, via shared scene stage lock hook. Does not touch video jobs or credits.
- Trigger / entrypoint: Stage 11 LockedStageHeader
- Preconditions: stage_locks[11] locked/outdated
- Code path: useSceneStageLock.unlockStage/confirmUnlock/relockStage -> sceneStageLocks routes
- Data touched: scenes.stage_locks
- Downstream effects: stage 12 marked outdated
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/components/pipeline/Stage11Confirmation.tsx:L144-161,L405-420; backend/src/routes/sceneStageLocks.ts:L145-286
- Notes: lockAndProceedLabel passed without onLockAndProceed -> no lock button.
- Related product intent: PARTIAL_MATCH: WD-IDEA-FLOW-038,WD-IDEA-FLOW-039

### WD-IMPL-CAP-0286 Resume at Stage 12 on scene re-entry
- Behavior: Entering a scene picks first non-locked stage among 7-12; after successful confirm (11 locked) user lands on Stage 12 and sees persisted job state.
- Trigger / entrypoint: Script Hub scene click
- Preconditions: stage_locks 7-11 locked
- Code path: ProjectView.handleEnterScene
- Data touched: read scenes.stage_locks
- Downstream effects: Stage 12
- Status: P=Y R=Y F=Y P=Y T=N
- Evidence: src/pages/ProjectView.tsx:L515-551
- Related product intent: PARTIAL_MATCH: WD-IDEA-AV-052,WD-IDEA-AV-053

### WD-IMPL-CAP-0287 Other-scene completed clips in ContentAccessCarousel at stages 11/12
- Behavior: Carousel fetches video-jobs for every other scene and lists completed clips (url, start frame, duration).
- Trigger / entrypoint: ContentAccessCarousel rendered in Stage 11/12
- Preconditions: other scenes have completed jobs
- Code path: fetchAllCompletedClips -> checkoutService.getVideoJobs per scene
- Data touched: read video_generation_jobs
- Downstream effects: none
- Status: P=Y R=Y F=U P=N T=N
- Evidence: src/components/pipeline/ContentAccessCarousel.tsx:L160-190
- Notes: Owned by another slice; consumer only.
- Related product intent: PARTIAL_MATCH: WD-IDEA-CONT-214,WD-IDEA-CONT-216
