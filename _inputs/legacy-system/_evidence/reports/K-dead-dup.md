# K: dead, partial, orphaned, duplicated, legacy and compatibility code (whole repo)

Reporter K, wave 2. Read-only static analysis at HEAD of `main`. Paths are repo-relative. Line numbers were read from the file at HEAD. Tests were excluded from "live" callers. Ledger: `K-dead-dup.ledger.jsonl` (kinds DEAD and FACT only).

Working scripts were kept outside the repo in `/tmp/K/` (`fe-graph.mjs`, `fe-reach.mjs`, `fe-methods.mjs`, `be-exports.mjs`, `be-runtime.mjs`, `routes.mjs`, `match.mjs`, `join.mjs`, `jsx.mjs`, `commented2.mjs`, `fe-exports.mjs`, `be-graph.mjs`). Their JSON outputs are in the same directory.

## 0. Method and proof conventions

- Disclosure: one reference-count grep for backend scripts also named `README.md` as a search target. Only match counts were used. No README content is cited, and `README.md` is not an evidence source in this report.

- Module graph: regex import/export/dynamic-import scan of all `src/**/*.{ts,tsx}` (210 non-test files) with `@/` alias to `src/`. Reachability computed from `src/main.tsx`. Backend graph computed the same way from `backend/src/server.ts` (72 non-test files).
- Method/export liveness: for each method or exported symbol, count `.name(` or `name` textual references across non-test files, and `this.name` inside its own file. "Zero" means no textual reference outside its declaration. A grep-zero result is a proof of no static reference, not of no runtime reference (dynamic property access is not modeled).
- Route liveness: every `router.<verb>('<path>')` in `backend/src/routes/*.ts` was joined to every frontend `fetch(` call site in `src/` (method from `method:` option, default GET; path template `${...}` normalized to `:p`). The enclosing service method of each fetch call was then checked for external callers.
- Each DEAD entry carries its proof command in `notes` of the ledger. Counts are in section 2.

Representative proof commands (all run from repo root, tests excluded, result count shown):
- `grep -rn "useDebouncedCallback" src --include=*.ts --include=*.tsx` gives 1 hit (its definition, `src/lib/hooks/useDebounce.ts:27`).
- Module graph (`/tmp/K/fe-graph.mjs`) gives 0 importers of `src/pages/Index.tsx`; `grep -rn "onNewProject" src` shows `Index.tsx` only as its own user (`:21,:44`).
- `grep -rn "prepareStageContext" backend/src` gives hits only in `backend/src/services/contextManager.ts` and `backend/src/tests/contextManagerAuteurResolutions.test.ts`.
- `grep -rn "extra_archetype" src/components/pipeline/AssetDrawer.tsx src/components/pipeline/AssetMatchModal.tsx` gives 0 hits.
- `grep -rn "OPENAI_API_KEY\|ANTHROPIC_API_KEY\|GOOGLE_VEO3_API_KEY\|NANO_BANANA_API_KEY\|DATABASE_URL" backend/src backend/scripts src` gives 0 hits (keys appear only in `backend/env.example`).
- `grep -rhoE "supabase\.(from|storage|rpc|auth|channel)\b" src | sort | uniq -c` gives `161 supabase.auth` and no `from`, `storage`, `rpc` or `channel` calls. The frontend performs no direct table access.

## 1. Wave-1 DEAD ledger: verification (52 entries)

Verdict key: CONFIRMED = re-grepped and the claim holds. CORRECTED = holds with a stated correction. CONTRADICTED = code shows the opposite. Wave-1 ids are provisional `WD-IMPL-DEAD-NNNN`. Entries marked "(wave1-unverified)" are the sub-claims I did not re-check.

| WD id | Verdict | Evidence I checked |
|---|---|---|
| DEAD-0001 | CONFIRMED | `updateStageStateTraceId`, `createStageState`, `getStageStatesByTraceId` defined at `backend/src/config/database.ts:69,83,109`; 0 callers. `runMigration`/`exec` RPC not re-checked here (cross-slice, C08). |
| DEAD-0002 | CONFIRMED | `src/pages/Index.tsx` has 0 importers (module graph). Only `Index.tsx` itself passes `handleNewProject` (`Index.tsx:21,44`). |
| DEAD-0003 | CONFIRMED | `stageStateService.skipStage` at `src/lib/services/stageStateService.ts:204`; 0 callers. Route `POST /api/projects/:p/stages/:p/skip` (`backend/src/routes/stageStates.ts:416`) has no live frontend caller. |
| DEAD-0004 | CORRECTED | `useDebouncedCallback` 0 refs (`useDebounce.ts:27`); `ProjectView` `navigate` (`:89`), `restoreStage` (`:152`), `getStageState` (`:113`, destructured, unused), `isLoadingProject` (`:107`, declared, never read): all single-occurrence. `ProjectSettings` (`src/types/project.ts:80`) 0 refs. `ProjectStatus` is NOT unused: used by `Project.status` at `src/types/project.ts:61`. |
| DEAD-0005 | CONFIRMED | `Dashboard.tsx:16,19` declare and destructure `onNewProject`; body never references it. `App.tsx:59-61` handler is `console.log` plus `TODO`. |
| DEAD-0006 | CONFIRMED | `ProjectCard.tsx:18-30` styles `skipped`/`outdated`. `backend/src/routes/projects.ts` contains no `'skipped'` string (grep 0), so the dashboard list never emits it. |
| DEAD-0007 | CONFIRMED + EXTENDED | 409 impact body nests `downstreamStages` under `details` (`backend/src/routes/stageStates.ts:596-604`). `ProjectView.tsx:695` reads top-level `result.downstreamStages`, so the `if` never fires. `else` at `:708-709` sets impact to `null` and calls `handleConfirmPhaseAUnlock` (`:718-724`), which calls `unlockStage(..., true)`. Net effect: Phase A unlock proceeds with no downstream warning. Labeled CONTRADICTED in the ledger. |
| DEAD-0008 | CONFIRMED | `backend/src/utils/resolveConflict.ts:34` (`resolveConflict`). Only importer is `backend/src/utils/__tests__/resolveConflict.test.ts`. Module graph: unreachable from `server.ts`. |
| DEAD-0009 | CONFIRMED | Duplicate of DEAD-0003. |
| DEAD-0010 | CONFIRMED (sub-claim wave1-unverified) | `contextManager.ts:208` (`assembleLocalContext`), `:274` (`assembleFullContext`), `:288` (`prepareStageContext`), `:326` (`formatPromptGenerationContext`) have 0 production callers. `prepareStageContext` appears only in its own file and in the test file. The "ESTABLISHED FACTS" injection content was not re-read. |
| DEAD-0011 | CONFIRMED | `src/lib/utils/streamlineRouting.ts:97-120`: `stageTransitions['4']` is always `{status:'locked',...}` when `scriptFile` is set. `'skip'` is only assigned to stages 2 and 3 (`:100,:103,:112`). |
| DEAD-0012 | CONFIRMED | `src/lib/utils/stageBadge.ts:30-41` appends origin subtext for `outdated`. Outdated insert `backend/src/routes/stageStates.ts:644-653` does not set `origin`. Column `origin` is nullable (`backend/migrations/041_stage_states_skip_and_commit.sql:38`). |
| DEAD-0013 | CONFIRMED (sub-claim wave1-unverified) | `streamline_commit` is defined in `041_...sql:64`, `042_...sql:34`, `043_...sql:137`. Wrapper `streamline_commit_atomic` (`044_...sql:38`) calls `streamline_commit(payload - 'project_config' - 'stage_1_draft')` at `044:98`. Backend calls only `streamline_commit_atomic` (`backend/src/routes/streamline.ts:77`). The 'conflict_resolution' never-produced claim was not re-checked. |
| DEAD-0014 | CONFIRMED | `backend/src/routes/streamline.ts:277` writes `project/{id}/streamline-staging/...`. `streamline.ts` contains no `.remove(` call (grep 0). |
| DEAD-0015 | CONFIRMED | `assetExtractionService.ts:366` `extractEntityMentions` has 0 callers. No migration adds `project_assets.metadata` (grep `metadata` across `backend/migrations` returns only other tables). Insert in `backend/src/routes/projectAssets.ts:119-135` omits it; the block is commented out at `:128-135`. Frontend read at `src/components/pipeline/Stage5Assets.tsx:1241-1248` (wave1-unverified line numbers). |
| DEAD-0016 | CONFIRMED | `src/lib/services/imageService.ts` 0 importers (module graph). |
| DEAD-0017 | CONFIRMED | `ImageDescriptionModal` 0 importers, 0 JSX render sites. |
| DEAD-0018 | CONFIRMED | Frontend `projectAssetService.extractAssets` (`:104`), `lockAsset` (`:433`), `editImage` (`:814`) have 0 callers. Backend `POST /api/projects/:p/assets/extract` (`projectAssets.ts:44`) and `POST .../assets/:p/lock` (`projectAssets.ts:1527`) have no live frontend fetch. `extractAssets` is `@deprecated` in JSDoc at `projectAssetService.ts:101`. |
| DEAD-0019 | CONFIRMED | `grep -c extra_archetype` on `AssetDrawer.tsx` and `AssetMatchModal.tsx` returns 0. Type includes it (`src/types/asset.ts:1`). |
| DEAD-0020 | CONFIRMED (fallback-order sub-claim wave1-unverified) | Aspect-ratio tables: `Stage5Assets.tsx:89-94`, `backend/src/routes/sceneAssets.ts:484-489`, `backend/src/services/image-generation/ImageGenerationService.ts:56-64` (`ASPECT_RATIOS`), plus `frameGenerationService.ts:126-129` (`FRAME_DIMENSIONS`, 16:9/9:16 pixel map). `ANGLE_PROMPTS`: `src/types/asset.ts:153` (0 refs) vs inline `ImageGenerationService.ts:258` (used at `:271`). Polling loops: see section 5.4. |
| DEAD-0021 | CONFIRMED | `Stage8VisualDefinition.tsx:456` `handleDetectAndPopulateAssets` and `Stage8/VisualStateEditorPanel.tsx:277` `handleSaveDescription`: single occurrence each. |
| DEAD-0022 | CONFIRMED | `assetInheritanceService.ts:292` `getInheritanceChain` 0 callers. `Stage8VisualDefinition.tsx:64` `sourceBadge` and `:69` `reviewStatus`: definitions only. |
| DEAD-0023 | CONFIRMED | `frameService.chainFromEndFrame` (`src/lib/services/frameService.ts:372`) 0 callers; route `frames.ts:877` no live fetch. `Stage10FrameGeneration.tsx:528` `updateContinuityMutation` single occurrence. `direction_location_mismatch` branch: see DEAD-0023 ledger entry and section 5.8 (branch proven unreachable). `candidates: []` at `continuityCompositionService.ts:248` inside `locationStateFromShot` (`:218`). |
| DEAD-0024 | CORRECTED (partial) | `continuity_frame_prompt` written at `backend/src/routes/frames.ts:2237`; read back into API responses at `projects.ts:3243,3272,3913,3936`; set into Stage 10 UI state at `Stage10FrameGeneration.tsx:564`. No reference in `frameGenerationService.ts` (grep 0). So "not read by generation" holds; "dead" does not. Labeled PARTIAL. |
| DEAD-0025 | CONFIRMED | `framePromptInstructions`, `continuityPromptInstructions`, `providerReadyReferences`, `debugMetadata` are declared in `continuityCompositionService.ts:124-138` and `src/types/locationContinuity.ts:198-215` only. Frontend reads: 0 beyond the type. |
| DEAD-0026 | CONFIRMED (partial) | `location_match_events`: only operation is `.from('location_match_events')` insert at `locationResolverService.ts:485`; no select anywhere. `locationImageById` declared `continuityCompositionService.ts:147`, passed by `projects.ts:3441`, never read in service. `ContinuityBaseCandidate` missing-tier and `location_match_source` 'ambiguous' claims: wave1-unverified. |
| DEAD-0027 | CONFIRMED | `shotService.reorderShots` (`src/lib/services/shotService.ts:366`) 0 callers; route `projects.ts:1980`. |
| DEAD-0028 | CONFIRMED | `shotAssetAssignmentService.listForShot` (`:39`) 0 callers; route `shotAssignments.ts:107`. Single-create `createAssignment` tests-only claim wave1-unverified. |
| DEAD-0029 | CONFIRMED | `transformation_flags` written at `backend/src/routes/projects.ts:1928`. Reads: none in `backend/src` or `src` except the type field `src/types/scene.ts:73`. |
| DEAD-0030 | CONFIRMED | `projects.ts:3051` returns 400 'Shot list is not locked' if `shot_list_locked_at` is null. `sceneStageLocks.ts:256-258` clears it on stage-7 unlock. `Stage7ShotList.tsx:812-818` calls `confirmUnlockViaHook(7)` then `shotService.unlockShotList` inside a swallowing `try`. Invalidation writes at `projects.ts:3106-3117` set `frames.status='invalidated'`, which the CHECK in `backend/migrations/019_frames_table.sql:12-18` excludes. Branch is unreachable from UI. |
| DEAD-0031 | CONTRADICTED | `sceneStageLocks.ts:187-193` collects downstream stages (`s > stage`, status `locked` or `outdated`), and `:245-249` sets every such stage to `{status:'outdated'}`. Stage 7 is included when a stage 1-6 is unlocked. Relock route `:327` accepts `outdated`. The relock path is therefore reachable. |
| DEAD-0032 | CONFIRMED | `frameService.ts:152` approveFrame, `:178` rejectFrame, `:286` saveEndFramePrompt, `:372` chainFromEndFrame, `:569` pollFrameStatus (internal caller `:613`), `:593` pollUntilComplete, `:640` getGeneratingFrameIds: 0 external callers. Routes `frames.ts:297,331,484,664` mounted, no live fetch. |
| DEAD-0033 | CONFIRMED | `PromptSet.transformationContext` (`src/types/scene.ts:308`, read `Stage9PromptSegmentation.tsx:622`): backend has 0 emitters. `FramePanel.tsx:373,379` checks `gen.source==='copy'`/`'upload'`: backend has 0 occurrences of `'copy'` or `'upload'` as source; generations map at `backend/src/routes/frames.ts:1295-1302` has no `source` field. |
| DEAD-0034 | CONFIRMED | `promptGenerationService.ts` does not import `prompt-template.ts` (grep 0). Stage 9/10 system prompts are inline at `promptGenerationService.ts:1135,1207,1307,1376`. `prompt-template.ts` used only from `routes/llm.ts` and `routes/seed.ts`. |
| DEAD-0035 | CONFIRMED | `generateVideoPrompt(shot, framePrompt, ...)` at `promptGenerationService.ts:1200-1202`: `framePrompt` not referenced in body `:1203-1258`. `PromptSet.systemPrompt` (`src/types/scene.ts:291`): no writer (grep for backend `systemPrompt` in result objects returns only local variables). |
| DEAD-0036 | CONFIRMED | `Stage12/IssueResolutionSection.tsx:28` 0 importers. `UnsatisfiedDropdown` is live (`ShotListPanel.tsx:203`). |
| DEAD-0037 | CONFIRMED | `checkoutService.ts:51` getCreditBalance, `:116` getVideoJobStatus, `:165` getSceneRenderStatus, `:226` getActiveJobCount, `:235` formatCost, `:242` getModelRate, `:249` getModelName: 0 callers. |
| DEAD-0038 | CONFIRMED | `src/types/scene.ts:405` SceneCheckout, `:518` VideoClip, `:531` SceneReview. VideoClip referenced only by SceneReview (`:533`). |
| DEAD-0039 | CONFIRMED | `backend/src/services/userCreditsService.ts:126` addCredits: 0 callers; no route. |
| DEAD-0040 | CONFIRMED | `VideoJobExecutor.ts:16` `pollIntervalMs` single occurrence. `videoGenerationService.ts:366` writes `frame_prompt_snapshot`; `:653` maps it to `framePromptSnapshot`; `:64` and `src/types/scene.ts:488` type it. No provider or UI reader. |
| DEAD-0041 | CONFIRMED (for lock button); priorSceneEndFrameUrl single occurrence | `Stage11Confirmation.tsx:159` passes `lockAndProceedLabel` without `onLockAndProceed`. `LockedStageHeader.tsx:137-148` renders the button only when `onLockAndProceed` is defined. `priorSceneEndFrameUrl` only at `src/types/scene.ts:442`. |
| DEAD-0042 | CONFIRMED | Duplicate of DEAD-0015. `@deprecated` JSDoc at `assetExtractionService.ts:362-364`. |
| DEAD-0043 | CONFIRMED | `NanoBananaClient.ts:171` `inpaintImage`: 0 calls; interface `ImageProviderInterface.ts:52` declares it. `TODO` at `NanoBananaClient.ts:185`. |
| DEAD-0044 | CONFIRMED | `beatService.ts:246` splitBeat: 0 callers (`Stage3BeatSheet.tsx` has no reference). |
| DEAD-0045 | CONFIRMED | Duplicate of DEAD-0016. |
| DEAD-0046 | CONFIRMED | `database.ts:69,83,109` have 0 callers. `stage_states.prompt_template_version` and `final_prompt` (`backend/migrations/001_initial_schema.sql:67-68`) and `langsmith_trace_id` (`002_add_langsmith_fields.sql:5-9`): only writer is the dead `database.ts` code. |
| DEAD-0047 | CONFIRMED | `llm-client.ts:66` `langsmithClient` declared, `:82` constructed, never read. `:74` `this.client` assigned, never read (grep `this.client` returns only the assignment). `generate` builds its own client at `:133`. |
| DEAD-0048 | CONFIRMED | `Stage2Treatment.tsx:36` `mockTreatments`: single occurrence. |
| DEAD-0049 | CONFIRMED | Routes with no frontend caller: `llm.ts:348` estimate-cost, `:389` usage-stats, `:420` test-connectivity, `:443` GET templates, `:483` POST templates, `:527` GET templates/:id, `:566` PUT, `:613` DELETE, `:647` activate, `:681` interpolate, `:731` GET stage active. 11 routes total. |
| DEAD-0050 | CONFIRMED | `prompt-template.ts:346` getTemplateVersions, `token-utils.ts:119` estimateCostForPrompt, `styleCapsuleService.ts:366` formatVisualStyleInjection, `llm-client.ts:330` setRetryConfig (+ proxy `:384-385`): 0 external refs. |
| DEAD-0051 | CONFIRMED but PARTIAL | `ImageGenerationService.ts:96-103` `postProcessBackground` returns the buffer unchanged. Function IS called at `:373` and `:842`. Placeholder, not dead. |
| DEAD-0052 | CONFIRMED (backend env) | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_VEO3_API_KEY`, `NANO_BANANA_API_KEY`, `DATABASE_URL` each have 0 code references in `backend/src`, `backend/scripts`, `src`. Root `.env.example` keys: wave1-unverified. |

Summary of the 52: 45 CONFIRMED (with some sub-claims wave1-unverified), 4 CORRECTED or PARTIAL (0004, 0024, 0026 in part, 0051), 1 CONTRADICTED (0031), and 1 extended to a live behavioral bug (0007).

## 2. Mechanical hunt counts

### 2.1 Frontend module graph (`src/`)
- Files: 237 total `.ts/.tsx`; 27 test files; 210 non-test.
- Reachable from `src/main.tsx`: 179 non-test files.
- Non-test files with zero reachability: 31 (19 shadcn/ui primitives plus 12 others). The 2 entry-only items `main.tsx` and `vite-env.d.ts` are not counted as orphans.
- Non-test files with zero importers at all: 29 (includes `main.tsx` and `vite-env.d.ts`).

Unreachable non-ui files (12): `src/components/NavLink.tsx`, `src/components/pipeline/ImageDescriptionModal.tsx`, `src/components/pipeline/Stage12/IssueResolutionSection.tsx`, `src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx`, `src/hooks/use-mobile.tsx`, `src/lib/hooks/useDebounce.ts`, `src/lib/services/imageService.ts`, `src/lib/tiptap-extensions/Character.ts`, `src/lib/tiptap-extensions/Dialogue.ts`, `src/lib/tiptap-extensions/Parenthetical.ts`, `src/pages/Index.tsx`, `src/vite-env.d.ts` (ambient types, not an orphan).

Unreachable `src/components/ui/` files (19, shadcn scaffolding): `accordion`, `aspect-ratio`, `avatar`, `breadcrumb`, `calendar`, `chart`, `context-menu`, `form`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `resizable`, `sheet`, `sidebar`, `table`, `toggle-group`, `toggle`, `use-toast.ts`.

Note on `tiptap-extensions`: `grep -rn "tiptap-extensions" src` returns 0 imports. `Character.ts`, `Dialogue.ts`, `Parenthetical.ts` are unused. The live Stage 4 editor does not import them.

### 2.2 Frontend service methods (`src/lib/services/*.ts`)
- 23 service files, 250 method-level symbols (classes and object literals).
- 42 with zero external caller files; 28 with zero external and zero internal call sites.
- 28 zero-everything: `beatService.splitBeat`; `checkoutService.getCreditBalance`, `getVideoJobStatus`, `getSceneRenderStatus`, `getActiveJobCount`, `formatCost`, `getModelRate`, `getModelName`; `frameService.approveFrame`, `rejectFrame`, `saveEndFramePrompt`, `chainFromEndFrame`, `pollUntilComplete`, `getGeneratingFrameIds`; `imageService.generateAssetImageKey`, `generateFrameAnchor`, `inpaintImage`; `projectAssetService.extractAssets`, `lockAsset`, `editImage`; `sceneService.getScene`, `updateSceneStatus`; `shotAssetAssignmentService.listForShot`; `shotService.reorderShots`; `stageStateService.skipStage`, `getAutoSaveDelay`, `setAutoSaveDelay`; `styleCapsuleService.createLibrary`.
- Zero external callers but internal-only (not dead alone): `frameService.pollFrameStatus` (internal `:613`), `imageService.pollJobStatus`, `mapStageToJobType`, `getActiveBranchId`, `beatService.parseSplitBeatsResponse`, `scriptService.parseSceneHeading`, `generateSlugFromParsedHeading`, `generateSlug`, `formatBeatSheetForPrompt`, `parseScriptResponse`, `treatmentService.parseTreatmentResponse`, `beatService.parseBeatsResponse`, `parseAlternativesResponse`.

### 2.3 Frontend exports never referenced by another module
- 119 exports across non-ui `src/` modules have zero references from any other module.
- 19 of those have zero references including inside their own file (declaration-only). Listed in section 3 DEAD entries.
- Others are internal-only (e.g. `getTagCategory` used by `getTagColors`).

### 2.4 Backend module graph (`backend/src/`)
- 72 non-test `.ts` files. 71 reachable from `server.ts`. Only unreachable: `src/utils/resolveConflict.ts` (test-only importer).
- Backend `scripts/` are entrypoints run by hand. Only `run-migrations.ts` (via `migrate`) and `setup-asset-images-bucket.ts` (via `setup:bucket`) appear in `backend/package.json`. Not referenced by code: `backfill-shot-locations.ts`, `seed-style-capsules.ts`, `seed-templates.ts`, `setup-storage-buckets.ts`, `test-style-capsule-influence.ts`, `update-templates-style-capsule.ts`. `backend/quickies-sql/*.sql` (3 files) and `backend/test-connection.js` have no code or config references.

### 2.5 Backend exports and methods
- 120 runtime (non-type) exports across `backend/src`; 39 have no production caller file. Of those, 2 are declaration-only (zero refs anywhere except declaration): `config/supabase.ts:25` `supabaseConfig` and `utils/token-utils.ts:119` `estimateCostForPrompt`.
- 22 class methods with zero `.name(` references and no `this.name` in their own file: `database.ts` x3 (`updateStageStateTraceId`, `createStageState`, `getStageStatesByTraceId`); `assetExtractionService.extractEntityMentions`; `assetInheritanceService.getInheritanceChain`; `contextManager.assembleLocalContext`, `assembleFullContext`, `formatPromptGenerationContext` (`prepareStageContext` has test-only refs); `llm-client.setRetryConfig`; `prompt-template.getTemplateVersions`; `styleCapsuleService` x10 (`getUserCapsules`, `createCapsule`, `updateCapsule`, `deleteCapsule`, `toggleFavorite`, `duplicatePreset`, `formatVisualStyleInjection`, `recordApplication`, `getUserLibraries`, `createLibrary`); `token-utils.getUsageByModel`; `UsageTracker.clear`.
- Test-only (only tests reference them): `utils/resolveConflict.ts` `resolveConflict`; `utils/scriptManifest.ts` `getNodeText` (also used internally, not test-only), `parseDialogueLine` (internal use); `locationResolverService` `normalizeLocationText`, `tokenizeLocationText` (internal and test refs); `promptGenerationService` `matchShotToLocationView`, `buildLocationDeltaDescription`, `extractTraitSummary` (internal and test refs); `token-utils` `formatCost`, `formatTokenUsage`, `isSupportedModel`, `getSupportedModels`.

### 2.6 Route inventory vs frontend callers
- 15 routers in `backend/src/routes/`; all 15 mounted in `server.ts`. 198 route definitions.
- 204 `fetch(` call sites in `src/` (non-test).
- Frontend-to-backend method+path mismatches after normalization: 1 real mismatch: `src/lib/services/sceneService.ts:80` `PUT /api/scenes/:id/status`. No `/api/scenes` mount exists. Code comment at `sceneService.ts:76-77` says "This endpoint doesn't exist yet". Its only method `updateSceneStatus` (`:69`) has 0 callers. The 2nd unmatched item was a normalization artifact (`/continuity-metrics${params}`) and resolves to `projects.ts:863`.
- Backend routes with no live frontend caller (method+path keys with no fetch from a reachable component):
  - Frontend method exists but has 0 callers (route is therefore dead from UI): `PUT .../shots/reorder` (`projects.ts:1980`); `POST .../assets/extract` (`projectAssets.ts:44`); `POST .../assets/:p/lock` (`projectAssets.ts:1527`); `GET .../shot-assignments/shots/:p` (`shotAssignments.ts:107`); `PUT .../frames/:p/approve` (`frames.ts:297`); `PUT .../frames/:p/reject` (`frames.ts:331`); `GET .../frames/:p/status` (`frames.ts:484`); `PUT .../shots/:p/end-frame-prompt` (`frames.ts:664`); `POST .../shots/:p/chain-from-end-frame` (`frames.ts:877`); `GET .../credit-balance` (`checkout.ts:59`); `GET .../video-jobs/:p` (`checkout.ts:208`); `GET .../render-status` (`checkout.ts:243`); `POST .../stages/:p/skip` (`stageStates.ts:416`); `POST /api/style-capsules/libraries` (`styleCapsules.ts:554`).
  - No frontend fetch at all: `GET /api/health` (`health.ts:5`, infrastructure, expected); 11 `/api/llm` admin and template routes (listed above under DEAD-0049); `POST /api/seed/prompt-templates` (`seed.ts:15`); `GET /api/images/debug-style-capsule/:id` (`images.ts:140`).
- `GET /api/projects/:id/continuity-metrics` (`projects.ts:863`) IS live: `locationContinuityService.fetchContinuityMetrics` (`:158`) is called from `Stage10FrameGeneration.tsx:273` and `Stage8/LocationCoveragePanel.tsx:166`.
- Route-level shadowing: `router.delete('/:projectId/scenes/:sceneId/shot-assignments/:assignmentId', ...)` (`backend/src/routes/shotAssignments.ts:195`) is registered before `router.delete('.../shot-assignments/all', ...)` (`:223`). `/all` is captured by `:assignmentId`. The frontend `shotAssetAssignmentService.deleteAllForScene` (`src/lib/services/shotAssetAssignmentService.ts:143-146`) sends `DELETE .../shot-assignments/all`, whose only UI caller is `src/components/pipeline/Stage9/BulkPresenceTemplates.tsx:131`. The `:assignmentId` handler then calls `deleteAssignment('all')` (`shotAssetAssignmentService.ts:173-180`), which runs `.eq('id', 'all')` on a UUID primary key (`backend/migrations/033_shot_asset_assignments.sql:10`). Code-level expectation: error and HTTP 500. Runtime not executed (U).

### 2.7 Commented-out code
- Blocks of consecutive `//` line comments of 10 or more lines: 0.
- Non-JSDoc `/* */` blocks of 5 or more lines: 0.
- Single commented-out code lines: 5 (`src/pages/StyleCapsuleLibrary.tsx:2`, `:31`; `backend/src/routes/projects.ts:2982`; `backend/src/services/llm-client.ts:152`; plus a prose line `src/lib/utils/streamlineRouting.ts:184` that is not code).
- JSDoc/header blocks of 10 or more lines: 25 (e.g. `src/components/pipeline/ContentAccessCarousel.tsx:1-10`, `backend/src/services/assetInheritanceService.ts:26-44`). These are documentation, not dead code. Listed for completeness only.

### 2.8 Deprecation, legacy, TODO and compatibility markers
Pattern `TODO|FIXME|HACK|XXX|@deprecated|legacy|deprecated|backward compat|compat`, src + backend src + backend scripts + migrations, tests excluded. `compatibleModels`/`compatible_models` (18 hits) excluded as a data-field name.
- FIXME: 0. HACK: 0. XXX: 0.
- TODO: 9 lines. `@deprecated`: 9 lines. Legacy-word lines: 22 (8 of them are `legacy_backfill` enum values or `.doc` error text, not code legacy). Backward-compat lines: 4 (`ackward` pattern, several overlapping with the comments listed in section 4).
- Full list of the 49 raw grep lines, with non-marker lines marked: section 4.

## 3. DEAD / ORPHANED / LEGACY / PARTIAL / DUPLICATED items
Each row: label, path:line, proof. Full detail for each is in the ledger, `kind:"DEAD"`.

### 3.1 Frontend, unreachable modules and symbols
| Item | Label | Proof |
|---|---|---|
| `src/pages/Index.tsx` | ORPHANED, LEGACY | 0 importers; module graph unreachable |
| `src/lib/services/imageService.ts` (whole file) | ORPHANED, DUPLICATED | 0 importers; contains `generateAssetImageKey`, `generateFrameAnchor`, stub `inpaintImage` (`:213`), own polling `pollJobStatus` (`:99`) |
| `src/components/pipeline/ImageDescriptionModal.tsx` | ORPHANED, LEGACY | 0 importers, 0 JSX |
| `src/components/pipeline/Stage12/IssueResolutionSection.tsx` | ORPHANED, DUPLICATED | 0 importers; live `UnsatisfiedDropdown` (`Stage12/UnsatisfiedDropdown.tsx`) does similar |
| `src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx` | ORPHANED | 0 importers, 0 JSX |
| `src/components/NavLink.tsx` | ORPHANED | 0 importers (shadcn-template wrapper) |
| `src/lib/hooks/useDebounce.ts` (`useDebouncedCallback` `:27`) | ORPHANED | 0 importers |
| `src/lib/tiptap-extensions/{Character,Dialogue,Parenthetical}.ts` | ORPHANED | 0 importers; no string reference |
| `src/hooks/use-mobile.tsx` | ORPHANED | only importer is unreachable `ui/sidebar.tsx` |
| 19 `src/components/ui/*` shadcn files | ORPHANED (library scaffolding) | 0 reachable importers |
| `src/components/pipeline/Stage2Treatment.tsx:36` `mockTreatments` | DEAD, LEGACY-MOCK | 1 occurrence |
| `ProjectView.tsx:89` navigate, `:107` isLoadingProject, `:113` getStageState, `:152` restoreStage | DEAD | single occurrence each |
| `App.tsx:59-61` handleNewProject (TODO) and `Dashboard.tsx:16,19` `onNewProject` prop | DEAD, PLACEHOLDER | prop destructured, unused; handler logs only |
| Phase A `UnlockWarningDialog` open-state (`ProjectView.tsx:100-101,695-705,708-709,978-990`) | DEAD, CONTRADICTED | see DEAD-0007 |
| Stage 11 lock header button (`Stage11Confirmation.tsx:159` vs `LockedStageHeader.tsx:137-148`) | DEAD | `onLockAndProceed` never passed; button gated on it |
| `Stage8VisualDefinition.tsx:456` handleDetectAndPopulateAssets; `Stage8/VisualStateEditorPanel.tsx:277` handleSaveDescription; `Stage8VisualDefinition.tsx:64,69` sourceBadge/reviewStatus | DEAD | single occurrence |
| `Stage10FrameGeneration.tsx:528` updateContinuityMutation | DEAD | single occurrence |
| `src/lib/services/stageStateService.ts:204` skipStage, `:294` getAutoSaveDelay, `:301` setAutoSaveDelay | DEAD | 0 callers |
| `src/lib/services/sceneService.ts:59` getScene | DEAD, PLACEHOLDER | throws unconditionally (`:63`) |
| `src/lib/services/sceneService.ts:69` updateSceneStatus | ORPHANED, CONTRADICTED | calls non-existent `PUT /api/scenes/:id/status` |
| `src/lib/services/frameService.ts` `:152,:178,:286,:372,:569,:593,:640` | ORPHANED | 0 external callers; mounted routes lack UI |
| `src/lib/services/projectAssetService.ts:104,:433,:814` extractAssets/lockAsset/editImage | DEAD, DEPRECATED | 0 callers; `extractAssets` `@deprecated` `:101` |
| `src/lib/services/beatService.ts:246` splitBeat (+ `parseSplitBeatsResponse` `:297`) | ORPHANED | 0 callers |
| `src/lib/services/shotService.ts:366` reorderShots | ORPHANED | 0 callers |
| `src/lib/services/shotAssetAssignmentService.ts:39` listForShot | ORPHANED | 0 callers |
| `src/lib/services/styleCapsuleService.ts:300` createLibrary | ORPHANED | 0 callers |
| `src/lib/services/checkoutService.ts:51,116,165,226,235,242,249` (7 helpers) | ORPHANED | 0 callers |
| `src/lib/utils/screenplay-converter.ts:246` tiptapToPlainText and `:294` plainTextToTiptap | LEGACY, DEPRECATED | `@deprecated` `:244,:292`; 0 refs |
| `src/types/scene.ts:405` SceneCheckout, `:518` VideoClip, `:531` SceneReview | LEGACY | only referenced inside `scene.ts` |
| Declaration-only types/consts: `src/types/scene.ts:15` PromptType, `:100` SceneAsset (`// Legacy shape` `:99`), `:314` FramePair; `src/types/project.ts:80` ProjectSettings; `src/types/asset.ts:125` AssetMatchResult, `:153` ANGLE_PROMPTS, `:199` AssetConfirmRequest; `src/types/styleCapsule.ts:141` PRESET_CAPSULE_IDS | DEAD | 0 refs beyond declaration |
| `src/types/scene.ts:442` priorSceneEndFrameUrl | DEAD | type-only, no reader |
| `src/types/scene.ts:73` transformationFlags, `:291` PromptSet.systemPrompt, `:308` transformationContext, `:488` framePromptSnapshot | DEAD-READ | writers absent or unread |
| `ProjectCard.tsx:18-30` skipped/outdated styles | DEAD | backend never emits `skipped` |
| `src/lib/utils/stageBadge.ts:30-41` origin subtext for `outdated` | DEAD | outdated insert omits origin |
| `src/lib/utils/streamlineRouting.ts:97-120` never sets stage 4 `'skip'` | PARTIAL | see DEAD-0011 |

### 3.2 Backend, unused functions, methods and modules
| Item | Label | Proof |
|---|---|---|
| `backend/src/utils/resolveConflict.ts:34` (whole module) | ORPHANED | only importer is its test; tested |
| `backend/src/config/database.ts:69,83,109` (DatabaseService trace methods) | DEAD | 0 callers |
| `backend/src/services/contextManager.ts:208,274,288,326` (`assembleLocalContext`, `assembleFullContext`, `prepareStageContext`, `formatPromptGenerationContext`) | ORPHANED | 0 prod callers; `prepareStageContext` test-only |
| `backend/src/services/assetExtractionService.ts:366` extractEntityMentions | DEAD, DEPRECATED-IN-CODE | `@deprecated` `:362-364`; 0 callers |
| `backend/src/services/assetInheritanceService.ts:292` getInheritanceChain | DEAD | 0 callers |
| `backend/src/services/llm-client.ts:66,74,82,330,384-385` (`langsmithClient`, `client`, `setRetryConfig`) | DEAD | never read / 0 callers |
| `backend/src/services/prompt-template.ts:346` getTemplateVersions | DEAD | 0 callers |
| `backend/src/utils/token-utils.ts:119` estimateCostForPrompt; `:194` UsageTracker.getUsageByModel | DEAD | 0 callers |
| `backend/src/services/styleCapsuleService.ts:79,124,159,199,235,270,366,397,418,453` (10 methods) | ORPHANED, DUPLICATED | 0 callers; `routes/styleCapsules.ts` does not import the service and implements CRUD inline |
| `backend/src/services/userCreditsService.ts:126` addCredits | DEAD | 0 callers, no route |
| `backend/src/config/supabase.ts:25` supabaseConfig | DEAD | declaration only |
| `backend/src/services/image-generation/NanoBananaClient.ts:171` inpaintImage (+ `ImageProviderInterface.ts:52`) | DEAD, PLACEHOLDER | 0 calls; TODO `:185` |
| `backend/src/services/image-generation/ImageGenerationService.ts:96-103` postProcessBackground | PARTIAL, PLACEHOLDER | called at `:373`, `:842`; returns buffer unchanged; TODO `:100` |
| `backend/src/services/video-generation/VideoJobExecutor.ts:16` pollIntervalMs | DEAD | declared, never read |
| `backend/src/services/continuityCompositionService.ts:147` locationImageById param | DEAD | passed from `projects.ts:3441`, never read |
| `backend/src/services/locationCoverageService.ts:10,:296-304,:364` direction_location_mismatch | DEAD | branch unreachable: views are grouped by `project_asset_id` (`:226-240`) and `locationAssetId` is set from that same key (`:154`), so `assignedView.locationAssetId !== location.id` is always false |
| `backend/src/services/continuityCompositionService.ts:218,:248` locationStateFromShot candidates | PARTIAL | `candidates: []` always |
| `backend/src/services/continuityCompositionService.ts:124-138` preview-only fields | DEAD | framePromptInstructions, continuityPromptInstructions, providerReadyReferences, debugMetadata: no frontend reader |
| `backend/src/services/locationResolverService.ts:485` location_match_events insert | DEAD-READ | table has no select anywhere |
| `backend/src/services/promptGenerationService.ts:1202` framePrompt param | DEAD | not referenced in body |
| `backend/src/services/videoGenerationService.ts:366,653` frame_prompt_snapshot | DEAD-READ | mapped to typed field only |
| `backend/src/routes/shotAssignments.ts:223` DELETE `.../shot-assignments/all` | DEAD, CONTRADICTED | shadowed by `:195`; frontend caller hits the wrong handler |
| `backend/src/routes/projects.ts:3020-3185` POST `/shots/unlock` invalidation branch | DEAD, LEGACY | UI always gets 400 at `projects.ts:3051`; `frames.status='invalidated'` violates CHECK (`019_frames_table.sql:12-18`) |
| Routes listed in 2.6 (no live frontend caller) | ORPHANED-ROUTES | see 2.6 |
| `backend/src/routes/llm.ts:348-775` admin/template routes (11) | ORPHANED-ROUTES, ADMIN-SURFACE | no fetch |
| `backend/src/routes/seed.ts:15` POST /prompt-templates | ORPHANED-ROUTES | no fetch |
| `backend/src/routes/images.ts:140` GET debug-style-capsule | ORPHANED-ROUTES | no fetch |
| `backend/src/routes/streamline.ts:276-288` staged images in `streamline-staging/` | ORPHANED | no `.remove` in file |

### 3.3 Backend scripts and root/config files
| Item | Label | Proof |
|---|---|---|
| `backend/scripts/{backfill-shot-locations,seed-style-capsules,seed-templates,setup-storage-buckets,test-style-capsule-influence,update-templates-style-capsule}.ts` | ORPHANED (manual, no package.json entry, no import) | `grep -rln <name> backend/package.json backend/src`: 0 matches for each |
| `backend/quickies-sql/*.sql` (3 files), `backend/test-connection.js` | ORPHANED | 0 code or config references |
| `backend/env.example`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_VEO3_API_KEY`, `NANO_BANANA_API_KEY`, `DATABASE_URL` | DEAD-CONFIG | 0 code references |

### 3.4 Database objects (cross-check to C-table-inventory.md and C-database.md)
| Object | Status | Evidence |
|---|---|---|
| `stage_states.prompt_template_version`, `final_prompt`, `langsmith_trace_id` | DEAD (never written) | only writer code is dead (`database.ts:69-101`) |
| `projects.writing_style_capsule_id`, `visual_style_capsule_id` | DEAD-READ (no writer found) | reads at `contextManager.ts:498-499`, `frames.ts:527,569,2156,2216`, `projects.ts:3584,3740`; assignment grep finds no writer to the `projects` row |
| `shots.transformation_flags` | DEAD-READ | written `projects.ts:1928`; no reader |
| `location_match_events` | DEAD-READ | insert `locationResolverService.ts:485`; no select |
| `project_assets.metadata` (phantom) | CONTRADICTED | read `Stage5Assets.tsx:1241` (wave1), type `src/types/asset.ts:39-45`; no column in any migration; write commented out `projectAssets.ts:128-135` |
| `scenes.shot_list_locked_at` | LEGACY, PERSISTED | dual-written with `stage_locks` at `sceneStageLocks.ts:116-118,256-258,350-352`, `projects.ts:2975,3155`; migration `014_add_shot_list_locking_with_trigger.sql` |
| `videos` table | LEGACY, UNKNOWN | read/written `projects.ts:3078-3083,3115`, `sceneStageLocks.ts:212-218`; NO `CREATE TABLE videos` in `backend/migrations` or `backend/quickies-sql`. Supabase Storage bucket `videos` is separate (`Veo3Provider.ts:338,354`). |
| `invalidation_logs` table | LEGACY, UNKNOWN | insert `projects.ts:3123`; no migration creates it |
| `frames.status = 'invalidated'` | CONTRADICTED | CHECK in `019_frames_table.sql:12-18` excludes it; writes at `projects.ts:3108` (and `:3116` for videos) |
| `streamline_commit` (041, 042 bodies) | LEGACY | superseded by 043; wrapper in 044 |
| `prompt_templates` table | PARTIAL (live) | used by `prompt-template.ts` via `llm.ts`/`seed.ts`; stage 9/10 prompts do not use it |

## 4. Marker list (grep output, 49 lines, cleaned)

Excluded only the `compatibleModels` / `compatible_models` data-name hits (18). Items in parentheses are not code legacy.

Deprecated / TODO / legacy markers:
- `src/App.tsx:60-61` TODO new project flow (console.log).
- `src/types/scene.ts:99` "Legacy shape" comment on `SceneAsset`.
- `src/components/pipeline/Stage7ShotList.tsx:376` (case `'legacy_backfill'` enum value); `:813` "backward compat" old-system unlock.
- `backend/src/routes/projects.ts:1338,1340` legacy LLM extraction fallback (reachable).
- `backend/src/routes/projects.ts:3825,3828` legacy all-assets-per-shot behavior (reachable).
- `backend/src/routes/sceneStageLocks.ts:116,256,350` backward-compat stage-7 `shot_list_locked_at` writes.
- `backend/src/routes/projectAssets.ts:112` masterScript param deprecated but kept (wave1 unverified line).
- `backend/src/routes/projectAssets.ts:128` TODO add metadata column.
- `backend/src/services/streamlineExtractionService.ts:48,56` legacy `.doc` rejection (behavioral, not code legacy).
- `backend/src/services/sceneDependencyExtraction.ts:4,6,31,35,36,46` `@deprecated` LLM dependency path; legacy fallback; console warn "Legacy LLM path invoked".
- `backend/src/services/sceneDependencyExtraction.ts:85` TODO caching not implemented.
- `backend/src/services/frameGenerationService.ts:465` legacy suffix fallback.
- `backend/src/services/promptGenerationService.ts:914,929` legacy single-manifest path (reachable when no assignments).
- `backend/src/services/locationResolverService.ts:9,44` `legacy_backfill` enum value (data).
- `backend/src/services/assetExtractionService.ts:100,362` `@deprecated` (`:362` is extractEntityMentions; `:100` is an older extract method).
- `backend/src/services/image-generation/NanoBananaClient.ts:89` "Legacy (no roles)" reference-image branch (reachable).
- `backend/src/services/image-generation/NanoBananaClient.ts:185` TODO inpainting upload.
- `backend/src/services/image-generation/ImageGenerationService.ts:100` TODO Rembg (placeholder).
- `backend/src/routes/styleCapsules.ts:474` TODO delete storage file.
- `backend/src/routes/llm.ts:233` "backward compatibility" manual style capsule injection fallback.
- `backend/scripts/backfill-shot-locations.ts:190` writes `legacy_backfill` (data value).
- `src/lib/services/scriptService.ts:608` "legacy fallback" slug.
- `src/lib/services/projectAssetService.ts:14` `@deprecated` MergeAssetsRequest; `:101` `@deprecated` extract.
- `src/lib/services/imageService.ts:220` TODO inpainting (stub).
- `src/lib/utils/screenplay-converter.ts:240` "Legacy functions (kept for backward compatibility)"; `:244,:292` `@deprecated`; `:332` "legacy scripts with <center> tags".
- `src/types/locationContinuity.ts:10` `legacy_backfill` enum value (data).
- `src/components/pipeline/Stage3BeatSheet.tsx:540` TODO target length hardcoded 180.
- `src/components/pipeline/streamline/StreamlineDropZone.tsx:75` legacy .doc message.
- `src/components/NavLink.tsx:5,11` "Compat" wrapper type name (shadcn scaffold, unused).

Non-marker false positives in the same grep: `contextManager.ts:323` "compatible with" comment; `Stage4MasterScript.tsx:123` "Keep default paragraph for compatibility" (not a legacy marker).

Of the 49 raw lines, 14 are non-markers: 5 `legacy_backfill` data values (`Stage7ShotList.tsx:376`, `locationContinuity.ts:10`, `locationResolverService.ts:9,44`, `backfill-shot-locations.ts:190`), 3 `.doc` error text (`streamlineExtractionService.ts:48,56`, `StreamlineDropZone.tsx:75`), 4 `compatible`/`Compat` naming or comment hits (`contextManager.ts:323`, `promptGenerationService.ts:827,830`, `NavLink.tsx:5,11`, `Stage4MasterScript.tsx:123`), and 2 `legacy_backfill` lines counted twice. That leaves 35 real markers.

## 5. Duplicated implementations (FACT with DUPLICATED)

### 5.1 Types mirrored between frontend and backend (field names compared by script)
| Concept | Copies (path:line) | Field diff |
|---|---|---|
| Frame | `src/types/scene.ts:327` vs `backend/src/services/frameGenerationService.ts:11` | 20 vs 20, identical |
| ShotWithFrames | `src/types/scene.ts:350` vs `frameGenerationService.ts:34` | 26 vs 26, identical |
| FrameJobStatus | `src/types/scene.ts:394` vs `frameGenerationService.ts:110` | 7 vs 7, identical |
| TransformationEvent | `src/types/scene.ts:27` vs `backend/src/services/transformationEventService.ts:19` | 20 vs 20, identical |
| TransformationFlag | `src/types/scene.ts:19` vs `backend/src/services/shotExtractionService.ts:12` | 5 vs 5, identical |
| VideoGenerationJob | `src/types/scene.ts:475` vs `backend/src/services/videoGenerationService.ts:51` | 29 vs 29, identical |
| ShotCheckoutDetail / CheckoutData | `src/types/scene.ts:420,445` vs `videoGenerationService.ts:12,37` | 16 and 11 fields, identical (ConfirmRenderResult `scene.ts:465` vs `videoGenerationService.ts:83` not field-compared) |
| ContinuityBaseCandidate | `src/types/locationContinuity.ts:166`, `backend/src/services/continuityBaseService.ts:5`, `continuityCompositionService.ts:90` | 14 fields each; frontend has optional `sourceSceneId`, `status`, `approvedAt`, `generatedAt`, and `suitability: ContinuityStrength`; backend has required and `suitability: ContinuityBaseSuitability` |
| ShotLocationState | `src/types/locationContinuity.ts:64` vs `continuityCompositionService.ts:53` | 14 vs 14, identical |
| LocationCoverageSummary | `src/types/locationContinuity.ts:105` vs `backend/src/services/locationCoverageService.ts:82` | frontend 15, backend 19 (adds `id,name,assetType,imageUrl`) |
| LocationCoverageResponse | `src/types/locationContinuity.ts:128` vs `locationCoverageService.ts:110` | 14 vs 14, identical |
| PresenceType | `src/types/scene.ts:244`, `backend/src/services/promptGenerationService.ts:112`, `backend/src/services/shotAssetAssignmentService.ts:8` | same union, 3 copies |
| ShotAssetAssignment | `src/types/scene.ts:246` vs `shotAssetAssignmentService.ts:10` | frontend 7 (adds `scene_asset_instance`) vs backend 6 |
| ReferenceImageOrderEntry | `src/types/scene.ts:257` vs `promptGenerationService.ts:89` | frontend 10 (adds `providerRole`) vs backend 9 |
| StreamlineQuestion / QAPair / Classification | `src/lib/services/streamlineService.ts:62,89,28` vs backend `streamlineQuestionService.ts:20`, `streamlineReconciliationService.ts:22`, `streamlineClassificationService.ts:15` | 7/3/2 identical |
| StreamlineAssetDraft | `src/lib/services/streamlineService.ts:33` vs `src/lib/utils/streamlineRouting.ts:14` | frontend routing adds `sourceFileId` |
| TextFieldVersion | `src/lib/services/textFieldVersionService.ts:8` vs `backend/src/services/textFieldVersionService.ts:15` | camelCase vs snake_case (mapping layer) |
| StyleCapsuleLibrary | `src/types/styleCapsule.ts:17` vs `backend/src/services/styleCapsuleService.ts:27` | camelCase vs snake_case |
| Beat | `src/lib/services/beatService.ts:5` vs `backend/src/services/contextManager.ts:23` | frontend 7 (adds `originalTreatmentExcerpt`, `isExpanded`) vs backend 5 |
| ValidationError / ValidationWarning | `src/components/pipeline/Stage7ShotList.tsx:54,61` vs `backend/src/services/shotValidationService.ts:18,26` | 5 vs 5 identical |
| ScriptConfidenceResult | `src/lib/utils/scriptConfidence.ts:6` vs `backend/src/utils/scriptConfidence.ts:14` | frontend adds `tiptapDoc` |
| Scene (name collision, different shapes) | `src/types/scene.ts:76` (17 fields) vs `src/lib/services/scriptService.ts:7` (5 fields incl. `heading`, `content`) | CONTRADICTED naming: two `Scene` types with different shapes |

Also: `backend/src/services/locationResolverService.ts:13` `LocationMatchSource` is derived from `LOCATION_MATCH_SOURCES` (`:3`) while `src/types/locationContinuity.ts:4` declares the union separately.

### 5.2 Script-confidence detector: same name, divergent rule (CONTRADICTED)
- Frontend `src/lib/utils/scriptConfidence.ts:24-44` counts `sceneHeading` and `dialogueLine` nodes from `parseScriptToTiptapJson` (screenplay-converter).
- Backend `backend/src/utils/scriptConfidence.ts:1-10` header claims "Server-side mirror ... keep the regexes and thresholds in sync". It uses its own regexes (`SCENE_HEADING_RE = /^(INT\.|EXT\.)/i`, `CHARACTER_RE`) and a line scanner with `awaitingDialogue`, not the TipTap parse.
- Thresholds identical (`MIN_SCENE_HEADINGS = 3`, `MIN_DIALOGUE_LINES = 1`) in `src/lib/utils/streamlineConfig.ts` and `backend/src/config/streamlineConfig.ts`. Only the header comment differs.
- Consequence (by code): the two sides can classify the same text differently. Not executed.

### 5.3 Other duplicated logic
- Aspect ratio tables: four copies (see DEAD-0020 list). Values agree on asset types.
- ANGLE_PROMPTS: `src/types/asset.ts:153` (unused) and inline in `ImageGenerationService.ts:258` (used).
- TipTap text extraction and screenplay regexes: `src/lib/utils/screenplay-converter.ts` (`SCENE_HEADING_RE` `:19`, `CHARACTER_RE` `:21`, `tiptapJsonToPlainText` `:164`) vs `backend/src/utils/scriptManifest.ts:63-67` (`getNodeText`) vs backend `scriptConfidence.ts` (own `SCENE_HEADING_RE`, `CHARACTER_RE`).
- LLM JSON parsing: backend `backend/src/utils/llmJson.ts:111,135` (`extractJsonArray`, `extractJsonObject`), used only by streamline services. Frontend re-parses LLM responses per service: `beatService.ts:303` parseBeatsResponse, `treatmentService.ts:351` parseTreatmentResponse, `scriptService.ts` parseScriptResponse.
- Scene heading and slug: frontend `scriptService.ts:375` parseSceneHeading and `:610` generateSlug (legacy fallback per comment `:608`) vs the regex set in `screenplay-converter.ts:19-25`. Backend slug/heading logic was not re-verified (wave1-unverified).
- Polling loops: four separate implementations: `projectAssetService.ts:385` pollImageJob (live), `imageService.ts:99` pollJobStatus (dead file), `frameService.ts:569,593` pollFrameStatus and pollUntilComplete (dead), `sceneAssetService.ts` job status (live, around `:372`).
- Stage status representations: (a) `scenes.stage_locks` JSON (`sceneStageLocks.ts`), (b) `stage_states` table rows with `status` and `origin` (`stageStates.ts`), (c) `scenes.shot_list_locked_at` and `scenes.status` (migration 014 trigger), (d) frontend `useStageState` hook plus `ProjectView` `setStages`. The same stage lock is written to (a) and (c) for stage 7 (`sceneStageLocks.ts:116-118`).
- Style capsule CRUD: `backend/src/services/styleCapsuleService.ts` has 10 zero-caller methods; `backend/src/routes/styleCapsules.ts` implements the same operations inline.
- Streamline config constants: byte-identical except comments (`src/lib/utils/streamlineConfig.ts`, `backend/src/config/streamlineConfig.ts`).
- Two classifiers: `backend/src/services/streamlineClassificationService.ts:67` classifyFile (script detector, then LLM prose classifier) and frontend `src/lib/utils/streamlineRouting.ts:30-32` (uses server classification or override). Stale comment `src/lib/services/streamlineService.ts:25` says "Phase 2 always returns the 'unclassified' stub" while the route calls the real classifier (`backend/src/routes/streamline.ts:217`).
- Seed templates: system prompts for stages 2, 3, 4 exist in two copies: `backend/scripts/seed-templates.ts` (lengths 1628, 1314, 1419 chars) and `backend/src/routes/seed.ts` (lengths 969, 969, 2456 chars). Text differs. The script has no caller (see 3.3).
- Migration duplicates: two files numbered 022 (`022_add_aspect_ratio.sql`, `022_scene_asset_generation_attempts.sql`) and two numbered 024 (`024_extra_archetype_and_style_outdated.sql`, `024_scene_asset_suggestions.sql`). Cross-slice (C08).

### 5.4 Frontend data access
- `src/` performs no direct table, storage, RPC or realtime access. All 161 `supabase.` references are `supabase.auth`. All data goes through `fetch('/api/...')` to the Express backend.

## 6. Feature flags, env gates, impossible conditions

- `backend/src/services/video-generation/createVideoProvider.ts:18` `VIDEO_PROVIDER || 'mock'`. Default when unset is the mock provider. Documented mapping in same file lines 5-6.
- `backend/src/server.ts:35-37` CORS origin: production allowlist is the literal placeholder `'https://your-frontend-domain.com'`. Non-production: localhost 5173/3000.
- `backend/src/middleware/errorHandler.ts:18,26` stack traces only when `NODE_ENV === 'development'`.
- `backend/src/server.ts` end: `app.listen` only when `NODE_ENV !== 'test'`.
- `src/components/pipeline/FramePanel.tsx:424` `localStorage.getItem('skipContinuityBreakConfirm') === 'true'` (user-set bypass flag persisted in browser storage).
- `src/components/pipeline/Stage8VisualDefinition.tsx:376` localStorage prompt-once key. `src/pages/Landing.tsx:98` `landing-theme`.
- No `if (false)`, `if (true)`, `&& false`, `|| true`, `while (true)` or constant-boolean `const` gates found in `src`, `backend/src`, `backend/scripts` (non-test).
- `backend/src/services/llm-client.ts:95` required-env check uses `process.env[key]`.
- Impossible-in-practice branch: Phase A unlock dialog (DEAD-0007). Impossible branch: `direction_location_mismatch` (DEAD-0023). Unreachable stage-4 skip (DEAD-0011).

## 7. Legacy paths that are still reachable (LEGACY, reachable)
- `backend/src/routes/projects.ts:1338-1346`: when tiptap-manifest extraction yields no dependencies, `sceneDependencyExtractionService.extractDependencies` (LLM) runs. Reachable from scene extraction.
- `backend/src/routes/projects.ts:3825-3828`: Stage 9 falls back to legacy all-assets-per-shot if shot assignments are absent or fail.
- `backend/src/routes/sceneStageLocks.ts:116-118,256-258,350-352`: stage-7 writes both `stage_locks['7']` and `shot_list_locked_at`. Live.
- `backend/src/routes/llm.ts:233-237`: manual style capsule injection fallback for backward compatibility. Taken on the else branch when the request has no project or branch metadata (`llm.ts:230-231`).
- `backend/src/services/promptGenerationService.ts:914-929`: legacy single-manifest for all assets when no assignments.
- `backend/src/services/frameGenerationService.ts:465`: old suffix fallback for legacy frame data.
- `backend/src/services/image-generation/NanoBananaClient.ts:89`: legacy (no roles) reference handling.

## 8. Scratch and non-source directories (list, reference check, git tracking)

| Path | Files | Tracked in git | In .gitignore | Code references |
|---|---|---|---|---|
| `tmp/` | 1 (`test-upload.png`) | 1 | no | none |
| `tmp-pw/` | 44 (png) | 44 | no | none |
| `test-examples/` | 17 (images) | 17 | no | none |
| `ui-images/` | 82 | 82 | yes (`ui-images/`, `.gitignore:75`) | none |
| `test-results/` | 1 (`.last-run.json`) | 1 | no | none (`backend/scripts/test-style-capsule-influence.ts:298` builds a file name `test-results-${Date.now()}.json`, unrelated) |
| `.playwright-mcp/` | 1 png | 1 | yes (`.gitignore:79`) | none |

Result: all six are committed to git despite two of them being named in `.gitignore`. None are referenced by code, scripts, `playwright.config.ts` (`testDir: './e2e'`), or `package.json`. Directory contents were not opened beyond names and sizes (brief rule).

Other root-level and backend-root items: `backend/storage-rls-error-work-around.md` and `backend/test-connection.js` have no references from code or config.

## 9. UI components rendered nowhere (requested list)

| Component | Result | Evidence (`grep -rn "<Name" src --include=*.tsx`, non-test) |
|---|---|---|
| ContentAccessCarousel | LIVE, 7 render sites | `Stage6ScriptHub.tsx:528`, `Stage7ShotList.tsx:921`, `Stage8VisualDefinition.tsx:773`, `Stage9PromptSegmentation.tsx:443`, `Stage10FrameGeneration.tsx:891`, `Stage11Confirmation.tsx:164`, `Stage12VideoGeneration.tsx:243` |
| AssetFilterModal | LIVE, 1 render site | `Stage5Assets.tsx:1438` (import `:54`) |
| SceneIndicator | LIVE, 6 render sites | `Stage7ShotList.tsx:983`, `Stage9PromptSegmentation.tsx:455`, `Stage10FrameGeneration.tsx:911`, `Stage11Confirmation.tsx:179`, `Stage12VideoGeneration.tsx:258`, `Stage8/SceneAssetListPanel.tsx:445` |
| LocationViewsDialog | LIVE, 1 render site | `Stage5Assets.tsx:1607` (import `:61`) |
| ContinuityBaseChooser | LIVE, 1 render site | `Stage10FrameGeneration.tsx:1156` (defined `:77`). Other JSX hits are in `__tests__` only |
| ImageDescriptionModal | DEAD, 0 importers, 0 JSX | `src/components/pipeline/ImageDescriptionModal.tsx:28` |
| IssueResolutionSection | DEAD, 0 importers, 0 JSX | `src/components/pipeline/Stage12/IssueResolutionSection.tsx:28` |
| UseMasterAsIsCheckbox | DEAD, 0 importers, 0 JSX | `src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx:21` |
| `src/components/pipeline/` | 89 files (85 `.tsx`, 4 `.ts`) | Only the three DEAD components above have no importer. Every other pipeline component file is reachable from `main.tsx` (module graph). |

Of the 99 exported components found by the JSX scan, 4 have no JSX outside their own file: the three DEAD components and `ContinuityBaseChooser`, which renders itself in its own file only through the `Stage10` import (so it is live, see table).

## 10. Contradictions and unknowns

- CONTRADICTED (wave1 DEAD-0031): Stage 7 relock path has a producer of `outdated` (`sceneStageLocks.ts:245-249`).
- CONTRADICTED (wave1 DEAD-0004 partial): `ProjectStatus` is referenced (`project.ts:61`).
- CONTRADICTED (Phase A unlock): the backend's 409 impact shape and the frontend read differ in nesting; the frontend therefore never shows the warning (DEAD-0007).
- CONTRADICTED (scriptConfidence): backend header claims mirror; rules differ (5.2).
- CONTRADICTED (streamlineService.ts:25 comment): classify stub claim is stale.
- CONTRADICTED (DB): `frames.status='invalidated'` written but absent from CHECK (`019:12-18`); migration not found that alters it (grep `frames_status` / `ALTER TABLE frames` returns only 019 and 040 continuity constraints).
- UNKNOWN: whether `videos` and `invalidation_logs` tables exist in the live Supabase project. No migration creates them. Settle by listing live schema (not done; no DB access allowed).
- UNKNOWN: runtime result of `DELETE .../shot-assignments/all` (code predicts 500). Settle by one request against a dev DB.
- UNKNOWN: whether any runtime path calls `Object.prototype`-style dynamic method access that the grep cannot see. Static zero-refs are proofs only of static references.
- UNKNOWN: `projects.writing_style_capsule_id` writers if written by a Supabase RPC or SQL default (no RPC in `backend/migrations` assigns it; grep only).

## Cross-slice references
- `backend/src/routes/projects.ts:3099-3117` invalidation writes (status, videos, invalidation_logs): belongs to the stage-lock / shot-list slice (V8/C04).
- `backend/src/routes/shotAssignments.ts:195,223` route order and BulkPresenceTemplates call path: Stage 9 slice (V6/V8).
- `backend/migrations/044_streamline_atomic_intake_fix.sql:98` wrapper behavior and RPC body history: streamline slice (V4, C19).
- `backend/scripts/run-migrations.ts` calls `exec` RPC not defined in repo: database slice (C08).
- `backend/migrations/022_*` and `024_*` duplicate numbers: database slice (C08).
- `src/components/pipeline/Stage9/BulkPresenceTemplates.tsx:131`: Stage 9 slice.
- `src/components/pipeline/FramePanel.tsx:373-384` `copy`/`upload` source badges with no backend emitter: frames slice (V9).
- `backend/src/services/locationCoverageService.ts` direction-mismatch branch: continuity slice (V7).
- `backend/src/services/video-generation/createVideoProvider.ts:18` default mock provider: video slice (V10).
- `backend/src/server.ts:35-37` CORS placeholder: shell slice (V1).
- `backend/src/routes/llm.ts` template routes, `backend/src/routes/seed.ts` duplicate seeds: AI-calls slice (E, C17).
- `backend/src/services/image-generation/NanoBananaClient.ts:171-228` inpaint and `ImageGenerationService.ts:96-103` background no-op: image-generation slice (E, V9).

## Files written
- `/home/user/workspace/repo/.amp/in/archaeology/reports/K-dead-dup.md` (this file)
- `/home/user/workspace/repo/.amp/in/archaeology/reports/K-dead-dup.ledger.jsonl`
