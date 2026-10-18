# 14. Dead, partial, orphaned, legacy and duplicated code

Scope. This document separates working functionality from debris at HEAD of `main` in the WizardDirector (Aiuteur) repository. It lists orphaned files, unused frontend and backend methods, backend routes with no frontend caller, frontend calls to routes or backing objects that do not exist, unreachable branches, features that are only partly wired, legacy and compatibility code, deprecated columns that are still written, duplicated implementations, the TODO, FIXME and deprecated marker inventory, commented-out code, feature gates and environment switches, scratch files at the repository root, dead tables and columns, and paths that run only against mocks. Every item carries a status from the document vocabulary, the proof used to establish the absence of references, and the ledger ids it relates to. Absence claims are static. A zero-reference grep proves that no static reference exists. It does not prove that nothing reaches the code at runtime, because dynamic property access and runtime configuration are not modeled.

Sources. Ledger kind DEAD (117 entries, every one cited in Appendix A and in sections 1 to 15). Ledger kind FACT from reporter K (WD-IMPL-FACT-0265 to 0363), R1a and R1b (WD-IMPL-FACT-0338 to 0431), and other FACT, CAP, STATE, TABLE, ROUTE, PROV, INV, TEST, AI, ENTITY and PRESSURE entries cited by id. Reports: K-dead-dup (primary), R1-claims-to-verify, R1a-verification, R1b-verification, V1-shell, V5-project-assets, V8-shots, V9-prompts-frames, V10-video-checkout, E-ai-calls, and _evidence/merged/retired-ids.json. V4, V6 and V7 contributed DEAD entries and were read through their ledger entries.

Reading notes. Siblings: 01-SYSTEM-OVERVIEW.md, 02-FUNCTIONAL-CAPABILITIES.md, 03-USER-WORKFLOWS.md, 05-DATA-MODEL.md, 06-WRITING-AND-STORY-IMPLEMENTATION.md, 07-VISUAL-ASSETS-AND-CONTINUITY.md, 10-VERSIONING-LOCKING-AND-INVALIDATION.md, 12-ASYNC-RELIABILITY-AND-PROVIDERS.md, 13-TEST-AND-EVIDENCE-MAP.md, 17-IMPLEMENTATION-LEDGER.md. Feature behavior that is working is described in 02 and 03, not here. This document covers only what is dead, partial, legacy, duplicated or mock.

Coverage. K-dead-dup, R1, R1a and R1b were read in full. V1, V5, V8, V9, V10 and E were read through their dead, orphaned, gated, stub and cross-slice sections and through every ledger entry they produced, not cover to cover. V3 produced no DEAD entries. Where a V-report claim is used, its ledger id is cited so the claim can be traced.

## 0. Method, vocabulary and id conventions

Status vocabulary. The labels used in ledger entries are mapped onto the document vocabulary (IMPLEMENTED, REACHABLE, FUNCTIONAL, PERSISTED, TESTED, PARTIAL, MOCK-ONLY, DEAD, ORPHANED, LEGACY, DUPLICATED, CONTRADICTED, UNKNOWN). Ledger labels DEAD-READ and DEAD-CONFIG are shown here as DEAD with a qualifier (write-only, template-only). PLACEHOLDER and MOCKED map to PARTIAL or MOCK-ONLY. DEPRECATED and DEPRECATED-IN-CODE map to LEGACY. Ledger label PARTIAL-COVERAGE and RUN-RESULT are not used as statuses here.

Id conventions. `WD-IMPL-DEAD-0001` to `0052` are the wave-1 entries from V1, V4, V5, V6, V7, V8, V9, V10 and E (7, 7, 6, 2, 4, 5, 4, 6 and 11 entries). `WD-IMPL-DEAD-0053` to `0117` are the 65 entries added by K. K re-checked the 52 wave-1 entries in its section 1 (WD-IMPL-FACT-0265). Where K and a wave-1 reporter describe the same object, both ids are cited, for example `WD-IMPL-DEAD-0002, WD-IMPL-DEAD-0053`. Appendix A gives one primary section per DEAD id and the related ids.

Corrections honored. WD-IMPL-DEAD-0031 was labelled CONTRADICTED by K. A lead re-check, recorded as a correction on WD-IMPL-FACT-0193 (which points to the DEAD-0031 correction), refutes K. The cascade never includes Stage 7, so the wave-1 verdict stands (section 6). WD-IMPL-FACT-0075 is CONTRADICTED on its beat-key claim by R1a C10 (WD-IMPL-FACT-0347). WD-IMPL-CAP-0192 is CONTRADICTED by R1b C18 (WD-IMPL-FACT-0355): only Stage 7 shot extraction writes transformation flags, Stage 3 does not. WD-IMPL-FACT-0198 is CONTRADICTED by I (see section 12). These corrections are taken from the reports. Where I re-checked the cited code, the check is listed in the corrections section at the end.

Proof convention. Each proof gives the command or the reference count. "0 importers" means a module-graph scan found no import of the file from a reachable module. "0 callers" means no textual reference outside the declaration and outside tests. Counts are from K, from R1a, R1b, V1, V5, V8, V9, V10 or E, or from the spot-checks in the corrections section at the end.

Disclosure carried from K. One reference-count grep in K also named a README file as a search target. Only match counts were used, and no README content is cited here.

Mechanical totals (K section 2). Frontend: 237 `.ts` and `.tsx` files, 27 tests, 210 non-test, 179 reachable from `src/main.tsx`, 31 non-test files unreachable per K (19 shadcn primitives and 12 others). Section 1 explains why K's own list gives 30. Backend: 72 non-test files, 71 reachable from `backend/src/server.ts`. Frontend service methods: 250 method-level symbols, 42 with zero external caller files, 28 with zero external and zero internal call sites (WD-IMPL-FACT-0266, 0267, 0269). Backend runtime exports: 120, of which 39 have no production caller file (WD-IMPL-FACT-0270). Routes: 15 routers, all mounted, 198 route definitions (WD-IMPL-FACT-0271).

## 1. Orphaned frontend files and components (zero importers)

Frontend files and components with no importer from a reachable module. Each row names its proof.

| Ids | Item (path:line) | Status | Proof | Related |
|---|---|---|---|---|
| WD-IMPL-DEAD-0002, WD-IMPL-DEAD-0053 | `src/pages/Index.tsx` (state-machine pseudo-router, sets projectId `'new'` at `:21-23`) | ORPHANED, LEGACY | Module graph 0 importers. `grep -rln "pages/Index" src` → 0. Only `Index.tsx` passes `handleNewProject` (`:21,:44`) | WD-IMPL-FACT-0011, WD-IMPL-FACT-0266, WD-IMPL-DEAD-0005 |
| WD-IMPL-DEAD-0016, WD-IMPL-DEAD-0045, WD-IMPL-DEAD-0054 | `src/lib/services/imageService.ts` (whole file: `pollJobStatus` `:99`, `inpaintImage` stub `:213`, TODO `:220`, `generateAssetImageKey`, `generateFrameAnchor`) | ORPHANED, DUPLICATED | 0 importers (module graph). Target `POST /api/images/generate` has no other frontend caller | WD-IMPL-ROUTE-0066, WD-IMPL-AI-0085 |
| WD-IMPL-DEAD-0017, WD-IMPL-DEAD-0055 | `src/components/pipeline/ImageDescriptionModal.tsx:28` | ORPHANED, LEGACY (superseded by `EnhancedUploadModal` per V5 section 12) | 0 importers, 0 JSX render sites | V5 section 12 |
| WD-IMPL-DEAD-0036, WD-IMPL-DEAD-0056 | `src/components/pipeline/Stage12/IssueResolutionSection.tsx:28` | ORPHANED, DUPLICATED (live `UnsatisfiedDropdown` at `Stage12/ShotListPanel.tsx:22` does similar work) | 0 importers, 0 JSX | WD-IMPL-DEAD-0056 |
| WD-IMPL-DEAD-0057 | `src/components/pipeline/Stage8/UseMasterAsIsCheckbox.tsx:21` | ORPHANED | 0 importers, 0 JSX | WD-IMPL-STATE-0047 (the use_master_as_is flag and its image side effect are a separate entry) |
| WD-IMPL-DEAD-0058 | `src/components/NavLink.tsx:5,11` (shadcn wrapper, "Compat" type name) | ORPHANED, LEGACY | 0 importers | Section 10 marker list |
| WD-IMPL-DEAD-0059, WD-IMPL-DEAD-0004 | `src/lib/hooks/useDebounce.ts:27` `useDebouncedCallback` | ORPHANED | `grep -rn "useDebouncedCallback" src --include=*.ts --include=*.tsx` → 1 (its definition). `useDebounce` itself is live in Stage 7 and Stage 9 | WD-IMPL-DEAD-0004 (K corrects its scope, see section 16) |
| WD-IMPL-DEAD-0060 | `src/lib/tiptap-extensions/Character.ts`, `Dialogue.ts`, `Parenthetical.ts` | ORPHANED | `grep -rn "tiptap-extensions" src` → 0 imports. The live Stage 4 editor does not import them | WD-IMPL-FACT-0266 |
| WD-IMPL-DEAD-0061 | `src/hooks/use-mobile.tsx` | ORPHANED | Only importer is `src/components/ui/sidebar.tsx`, which is itself unreachable | WD-IMPL-DEAD-0062 |
| WD-IMPL-DEAD-0062 | 19 shadcn primitives in `src/components/ui/`: accordion, aspect-ratio, avatar, breadcrumb, calendar, chart, context-menu, form, input-otp, menubar, navigation-menu, pagination, resizable, sheet, sidebar, table, toggle-group, toggle, use-toast.ts | ORPHANED (library scaffolding) | 0 reachable importers (K section 2.1) | WD-IMPL-DEAD-0061 |
| WD-IMPL-DEAD-0080 | Declaration-only frontend types and constants: `src/types/scene.ts:15` PromptType, `:100` SceneAsset (comment "Legacy shape" at `:99`), `:314` FramePair; `src/types/project.ts:80` ProjectSettings; `src/types/asset.ts:125` AssetMatchResult, `:153` ANGLE_PROMPTS, `:199` AssetConfirmRequest; `src/types/styleCapsule.ts:141` PRESET_CAPSULE_IDS | DEAD | 0 references beyond the declaration. `ProjectStatus` is not in this list because `src/types/project.ts:61` uses it (K correction) | WD-IMPL-DEAD-0020, WD-IMPL-FACT-0268 |
| WD-IMPL-DEAD-0081, WD-IMPL-DEAD-0038 | `src/types/scene.ts:405` SceneCheckout, `:518` VideoClip, `:531` SceneReview | LEGACY, DEAD | VideoClip is referenced only by SceneReview (`:533`), and SceneReview by nothing outside the file | WD-IMPL-DEAD-0038 |
| WD-IMPL-DEAD-0082 | `src/lib/utils/screenplay-converter.ts:246` tiptapToPlainText and `:294` plainTextToTiptap | LEGACY (`@deprecated` at `:244`, `:292`), DEAD | 0 references. The same file keeps "Legacy functions (kept for backward compatibility)" at `:240` | Section 10 |
| WD-IMPL-DEAD-0076 | `src/pages/ProjectView.tsx` members `navigate` (`:89`), `isLoadingProject` (`:107`, declared, never read), `getStageState` (`:113`, destructured), `restoreStage` (`:152`) | DEAD (members of a rendered file) | Single occurrence each. V1 reports `restoreStage()` is never called | WD-IMPL-CAP-0022, WD-IMPL-DEAD-0004 |
| WD-IMPL-DEAD-0048, WD-IMPL-DEAD-0075 | `src/components/pipeline/Stage2Treatment.tsx:36` `mockTreatments` | DEAD, leftover MOCK-ONLY data | 1 occurrence in the file. Listed in section 15 as well | WD-IMPL-FACT-0197 |

Count discrepancy inside K. K reports 31 unreachable non-test files as "19 shadcn/ui primitives plus 12 others", and it also says `src/vite-env.d.ts` is not an orphan. Its own list of 12 "others" includes `vite-env.d.ts`. Excluding that file, the rows above give 19 plus 11, which is 30 orphans. K's total of 31 is therefore not reproduced by its own list (WD-IMPL-FACT-0266). The 30 figure is the one this document uses.

Exports. K counts 119 exports in non-ui `src/` modules that no other module references. 19 of them have no reference inside their own file either (declaration-only, rows above). The remainder are internal-only, such as `getTagCategory`, which is used by `getTagColors` (WD-IMPL-FACT-0268).

## 2. Unused frontend service methods and orphaned wrappers

A wrapper is ORPHANED when its route is live but no component calls the wrapper. A method is DEAD when it has no callers and its route is also unused or absent.

| Ids | Item (path:line) | Status | Proof | Related route or note |
|---|---|---|---|---|
| WD-IMPL-DEAD-0003, WD-IMPL-DEAD-0009, WD-IMPL-DEAD-0063 | `stageStateService.skipStage` `src/lib/services/stageStateService.ts:204` | DEAD | 0 callers | Route `POST /api/projects/:p/stages/:p/skip` at `backend/src/routes/stageStates.ts:416` has no live frontend caller (section 3). WD-IMPL-STATE-0003 |
| WD-IMPL-DEAD-0063 | `stageStateService.getAutoSaveDelay` `:294`, `setAutoSaveDelay` `:301` | DEAD | 0 callers | None |
| WD-IMPL-DEAD-0018, WD-IMPL-DEAD-0065 | `projectAssetService.extractAssets` `:104` (`@deprecated` at `:101`), `lockAsset` `:433`, `editImage` `:814` | LEGACY, DEAD | `grep -rn "lockAsset(" src` → definition only. `extractAssets` has no caller | Routes `POST .../assets/extract` (`projectAssets.ts:44`) and `POST .../assets/:p/lock` (`projectAssets.ts:1527`). WD-IMPL-ROUTE-0031 |
| WD-IMPL-DEAD-0027, WD-IMPL-DEAD-0067 | `shotService.reorderShots` `src/lib/services/shotService.ts:366` | ORPHANED | 0 callers | Route `PUT .../shots/reorder` at `backend/src/routes/projects.ts:1980` (V8 section 4). WD-IMPL-STATE-0068 |
| WD-IMPL-DEAD-0028, WD-IMPL-DEAD-0068 | `shotAssetAssignmentService.listForShot` `:39` | ORPHANED | 0 callers | Route `GET .../shot-assignments/shots/:shotId` at `backend/src/routes/shotAssignments.ts:107`. WD-IMPL-ROUTE-0119 |
| WD-IMPL-DEAD-0032, WD-IMPL-DEAD-0064 | `frameService.ts:152` approveFrame, `:178` rejectFrame, `:286` saveEndFramePrompt, `:372` chainFromEndFrame, `:569` pollFrameStatus (called internally at `:613`), `:593` pollUntilComplete, `:640` getGeneratingFrameIds | ORPHANED | 0 external callers. `grep -rn "pollFrameStatus\|pollUntilComplete" src` → definitions and the internal call only (R1b C13) | Routes `frames.ts:297, 331, 484, 664, 877` are mounted with no UI fetch |
| WD-IMPL-DEAD-0037, WD-IMPL-DEAD-0072 | `checkoutService.ts:51` getCreditBalance, `:116` getVideoJobStatus, `:165` getSceneRenderStatus, `:226` getActiveJobCount, `:235` formatCost, `:242` getModelRate, `:249` getModelName | ORPHANED | 0 callers | Routes `GET .../credit-balance` (`checkout.ts:59`), `GET .../video-jobs/:p` (`:208`), `GET .../render-status` (`:243`) |
| WD-IMPL-DEAD-0044, WD-IMPL-DEAD-0066 | `beatService.ts:246` splitBeat (with `parseSplitBeatsResponse` `:297`) | ORPHANED | 0 callers. `Stage3BeatSheet.tsx` has no reference | WD-IMPL-AI-0026 |
| WD-IMPL-DEAD-0069 | `sceneService.ts:59` getScene | DEAD (always throws) | Throws unconditionally at `:63`. 0 callers | None |
| WD-IMPL-DEAD-0070 | `sceneService.ts:69` updateSceneStatus | ORPHANED, CONTRADICTED | 0 callers. Calls `PUT /api/scenes/:id/status`, which does not exist (section 4) | Section 4 |
| WD-IMPL-DEAD-0071 | `styleCapsuleService.ts:300` createLibrary (frontend client) and `POST /api/style-capsules/libraries` | ORPHANED | 0 callers. Route at `styleCapsules.ts:554` has no UI fetch | WD-IMPL-CAP-0047 (library page is PARTIAL), WD-IMPL-FACT-0023 |
| WD-IMPL-DEAD-0021, WD-IMPL-DEAD-0073 | `Stage8VisualDefinition.tsx:456` handleDetectAndPopulateAssets, `Stage8/VisualStateEditorPanel.tsx:277` handleSaveDescription, `Stage8VisualDefinition.tsx:64` sourceBadge, `:69` reviewStatus | DEAD | Single occurrence each (component-local, not service wrappers). WD-IMPL-DEAD-0022 covers the backend helper |  |
| WD-IMPL-DEAD-0022, WD-IMPL-DEAD-0087 | Backend `assetInheritanceService.ts:292` getInheritanceChain (listed in section 5) and the Stage 8 badge helpers above | DEAD | 0 callers | Same object as the Stage 8 rows above |
| WD-IMPL-DEAD-0074 | `Stage10FrameGeneration.tsx:528` updateContinuityMutation | DEAD | Declared, never invoked. Single occurrence | WD-IMPL-DEAD-0023 |

Zero-caller summary (K section 2.2). Of 250 method-level symbols, 42 have no external caller file and 28 have no caller of any kind. The 28 are the rows above plus `beatService.splitBeat`, `frameService.approveFrame`, `frameService.rejectFrame`, `frameService.saveEndFramePrompt`, `frameService.chainFromEndFrame`, `frameService.pollUntilComplete`, `frameService.getGeneratingFrameIds`, `imageService.generateAssetImageKey`, `imageService.generateFrameAnchor`, `imageService.inpaintImage`, `projectAssetService.extractAssets`, `projectAssetService.lockAsset`, `projectAssetService.editImage`, `sceneService.getScene`, `sceneService.updateSceneStatus`, `shotAssetAssignmentService.listForShot`, `shotService.reorderShots`, `stageStateService.skipStage`, `stageStateService.getAutoSaveDelay`, `stageStateService.setAutoSaveDelay`, `styleCapsuleService.createLibrary` and `checkoutService` helpers (WD-IMPL-FACT-0267).

Internal-only methods (zero external callers but used inside their file, so not DEAD alone): `frameService.pollFrameStatus` (called from `pollUntilComplete`), `imageService.pollJobStatus`, `imageService.mapStageToJobType`, `imageService.getActiveBranchId`, `beatService.parseSplitBeatsResponse`, `scriptService.parseSceneHeading`, `scriptService.generateSlug`, `treatmentService.parseTreatmentResponse`, `beatService.parseBeatsResponse`, `parseScriptResponse` (K section 2.2). Of these, only the `imageService` and `frameService` members belong to dead files or dead methods.

## 3. Backend routes with no frontend caller

Routes whose handler is mounted and reachable through HTTP but has no frontend fetch. Route liveness was checked by joining every `router.<verb>` to every `fetch(` site in `src/` (K section 0). K found 204 fetch call sites. Each row names the frontend wrapper where one exists.

| Ids | Route (file:line) | Status | Frontend wrapper and caller state | Related |
|---|---|---|---|---|
| WD-IMPL-DEAD-0027, WD-IMPL-DEAD-0067, WD-IMPL-DEAD-0105 | `PUT /api/projects/:p/shots/reorder` (`backend/src/routes/projects.ts:1980`) | ORPHANED | `shotService.reorderShots`, 0 callers | WD-IMPL-STATE-0068 |
| WD-IMPL-DEAD-0018, WD-IMPL-DEAD-0105 | `POST /api/projects/:p/assets/extract` (`projectAssets.ts:44`) | LEGACY, ORPHANED | `extractAssets`, 0 callers. Documented as the deprecated one-shot path (section 8) | WD-IMPL-ROUTE-0031, WD-IMPL-AI-0034 |
| WD-IMPL-DEAD-0018, WD-IMPL-DEAD-0065, WD-IMPL-DEAD-0105 | `POST /api/projects/:p/assets/:p/lock` (`projectAssets.ts:1527`) | ORPHANED | `lockAsset`, 0 callers. Per-asset lock has no UI | WD-IMPL-FACT-0357 (R1b C20) |
| WD-IMPL-DEAD-0028, WD-IMPL-DEAD-0068, WD-IMPL-DEAD-0105 | `GET .../scenes/:s/shot-assignments/shots/:shotId` (`shotAssignments.ts:107`) | ORPHANED | `listForShot`, 0 callers | WD-IMPL-ROUTE-0119 |
| WD-IMPL-DEAD-0032, WD-IMPL-DEAD-0064, WD-IMPL-DEAD-0105 | `PUT .../frames/:p/approve` (`frames.ts:297`), `PUT .../frames/:p/reject` (`:331`), `GET .../frames/:p/status` (`:484`), `PUT .../shots/:p/end-frame-prompt` (`:664`), `POST .../shots/:p/chain-from-end-frame` (`:877`) | ORPHANED | Frontend methods listed in section 2, 0 callers | The `/status` route is the only code path that moves a failed frame to `rejected` (R1b C13, WD-IMPL-FACT-0350) |
| WD-IMPL-DEAD-0037, WD-IMPL-DEAD-0072, WD-IMPL-DEAD-0105 | `GET .../credit-balance` (`backend/src/routes/checkout.ts:59`), `GET .../video-jobs/:p` (`:208`), `GET .../render-status` (`:243`) | ORPHANED | Frontend helpers in section 2, 0 callers | Stage 11 and Stage 12 read job state through other routes |
| WD-IMPL-DEAD-0003, WD-IMPL-DEAD-0009, WD-IMPL-DEAD-0105 | `POST /api/projects/:p/stages/:p/skip` (`backend/src/routes/stageStates.ts:416`) | ORPHANED | `skipStage`, 0 callers | WD-IMPL-CAP-0027 (Write this myself is PARTIAL), WD-IMPL-STATE-0003 |
| WD-IMPL-DEAD-0071 | `POST /api/style-capsules/libraries` (`backend/src/routes/styleCapsules.ts:554`) | ORPHANED | `createLibrary`, 0 callers | WD-IMPL-FACT-0023 (libraries auto-created and unused) |
| WD-IMPL-DEAD-0049, WD-IMPL-DEAD-0104 | Eleven `/api/llm` admin, cost and template routes (`backend/src/routes/llm.ts`): `estimate-cost` (`:348`), `usage-stats` (`:389`), `test-connectivity` (`:420`), `GET templates` (`:443`), `POST templates` (`:483`), `GET templates/:id` (`:527`), `PUT templates/:id` (`:566`), `DELETE templates/:id` (`:613`), `activate` (`:647`), `interpolate` (`:681`), `GET stage/:n/active` (`:731`) | ORPHANED-ROUTES, ADMIN-SURFACE. Mounted behind `authenticateUser` (`server.ts:75`) and reachable by any authenticated user | No `fetch` in `src/` for `/api/llm/templates` or the other ten (R1b C17) | WD-IMPL-ROUTE-0139, WD-IMPL-AI-0079 |
| WD-IMPL-DEAD-0049 | `POST /api/seed/prompt-templates` (`backend/src/routes/seed.ts:15`) | ORPHANED | No fetch | WD-IMPL-FACT-0280 (two seed copies) |
| WD-IMPL-DEAD-0049 | `GET /api/images/debug-style-capsule/:capsuleId` (`backend/src/routes/images.ts:140`) | ORPHANED (HTTP-reachable by any authenticated user) | No fetch | WD-IMPL-FACT-0169 (exposes capsule internals) |
| (none) | `GET /api/health` (`backend/src/routes/health.ts:5`) | Infrastructure, expected to have no UI caller | No fetch | K section 2.6 |

Live template path. `POST /api/llm/generate-from-template` (`llm.ts:153-171`) is not in the list above. R1b C17 and E section 1 show it is called by the Stage 2 to 4 services with template names `master_script_generation`, `treatment_expansion` and `beat_extraction` (`src/lib/services/scriptService.ts:80,148`, `treatmentService.ts:72,81,137`, `beatService.ts:56,132`). Its template rows come from the seeded `prompt_templates` table (section 9).

Route shadowing that makes one route unreachable is listed in section 4 with the frontend caller that hits the wrong handler.

## 4. Frontend calls to missing routes and missing backing objects

No route in shipped UI code points at a route that does not exist, with one exception below. The rows also list backing objects that code queries but the repository does not define, because a query against a missing object fails in the same way a missing route does.

| Ids | Call or query (path:line) | Status | Evidence | Runtime effect |
|---|---|---|---|---|
| WD-IMPL-DEAD-0070 | `PUT /api/scenes/:id/status` from `sceneService.updateSceneStatus` (`src/lib/services/sceneService.ts:80`) | CONTRADICTED (route absent) | No `/api/scenes` mount in `backend/src/server.ts`. The code comment at `sceneService.ts:76-77` says "This endpoint doesn't exist yet". K normalization found 1 real mismatch (WD-IMPL-FACT-0271) | No caller, so no request is sent in shipped code |
| WD-IMPL-DEAD-0106 | `DELETE /api/projects/:p/scenes/:s/shot-assignments/all` from `shotAssetAssignmentService.deleteAllForScene` (`src/lib/services/shotAssetAssignmentService.ts:143-146`), called from `Stage9/BulkPresenceTemplates.tsx:131` | DEAD (route shadowed), CONTRADICTED with the caller's intent | Route `DELETE .../shot-assignments/:assignmentId` (`backend/src/routes/shotAssignments.ts:195`) is registered before `/all` (`:223`), so `/all` is captured with `assignmentId='all'`. The handler calls `deleteAssignment('all')` (`shotAssetAssignmentService.ts:173-180`), which runs `.eq('id','all')` on a UUID primary key (`backend/migrations/033_shot_asset_assignments.sql:10`). Static prediction: error, HTTP 500 at `shotAssignments.ts:213-215` | Bulk-template apply fails at its first step, so no new assignments are created (R1a C06, WD-IMPL-FACT-0343). Runtime result UNKNOWN |
| (K 2.6) | `GET /api/projects/:id/continuity-metrics` (`projects.ts:863`) | Resolved, not missing | K's normalization artifact `/continuity-metrics${params}` matches this route. Live through `locationContinuityService.fetchContinuityMetrics` (`:158`) called from `Stage10FrameGeneration.tsx:273` and `Stage8/LocationCoveragePanel.tsx:166` | None |

Missing backing objects that routes query. Each is a query against an object the repository does not create, or a column it does not define.

| Ids | Object (path:line) | Status | Evidence | Handling in code |
|---|---|---|---|---|
| WD-IMPL-TABLE-0005, WD-IMPL-TABLE-0028, WD-IMPL-TABLE-0057 | Table `videos`: select at `projects.ts:3078-3079` and `sceneStageLocks.ts:215`, update at `projects.ts:3115-3116` | UNKNOWN in the live DB, no repo DDL | `grep -rln "CREATE TABLE.*\(videos\|invalidation_logs\)" backend/migrations backend/quickies-sql` → 0 files. Supabase Storage bucket `videos` (`Veo3Provider.ts:338,354`) is a different thing | Count reads destructure `{ data }` only, so counts are 0 on error. The update result is ignored. WD-IMPL-FACT-0283 |
| WD-IMPL-TABLE-0006, WD-IMPL-TABLE-0058 | Table `invalidation_logs`: insert at `projects.ts:3120-3131` | UNKNOWN in the live DB, no repo DDL | Same grep as above | Inside `try/catch`, but supabase-js resolves with `{ error }` rather than throwing, so failed inserts are silent (R1a C04) |
| WD-IMPL-FACT-0143, WD-IMPL-FACT-0210, WD-IMPL-FACT-0300 | Column `scenes.stage_locks`: selected by six handlers (`projects.ts:2873`, `:3041`; `sceneStageLocks.ts:38`, plus lock, unlock and relock) | LEGACY, defined only by `backend/quickies-sql/add_stage_locks.sql:1` | `grep -rln stage_locks backend/migrations` → 0 files. The quickies file ends with "Ran successfully on prod" (not verifiable here) | A missing column returns 404 `SCENE_NOT_FOUND` for every scene (`projects.ts:2878-2883`, `:3046-3048`, `sceneStageLocks.ts:43-44`) |
| WD-IMPL-FACT-0338 (R1a C01), WD-IMPL-DEAD-0023 | Columns `stage_states.project_id` and `stage_states.state_data`, selected at `backend/src/routes/frames.ts:262-264` and four other sites (`:385-390`, `:449-454`, `:767-772`, `:845-850`) | CONTRADICTED by the schema | `001_initial_schema.sql:51-78` defines neither column. `grep -rn state_data backend/migrations` → 0. The `error` is discarded | `visualStyleCapsuleId` is always undefined on the five frame routes, so frame image jobs carry no capsule (see section 7) |
| WD-IMPL-CAP-0269 | Column `end_frame_thumbnail` on the prior-scene query behind the Stage 11 dependency banner | CONTRADICTED by the schema (column absent) | WD-IMPL-CAP-0269 notes the query "selects nonexistent column end_frame_thumbnail" | The prior-scene branch never fires (section 6) |
| WD-IMPL-DEAD-0111, WD-IMPL-DEAD-0015 | Column `project_assets.metadata`, read at `src/components/pipeline/Stage5Assets.tsx:1241-1248` and typed at `src/types/asset.ts:39-45` | CONTRADICTED (no column in any migration) | `grep -rn metadata backend/migrations` returns only other tables. The write is commented out at `projectAssets.ts:128-135` (section 11) | Stage 5 conflict alert reads a field that is never persisted (WD-IMPL-DEAD-0015) |
| WD-IMPL-FACT-0284 | Status value `'invalidated'` on `frames`, written at `projects.ts:3106-3110` (shot-list unlock) | CONTRADICTED | CHECK constraint at `backend/migrations/019_frames_table.sql:12-18` allows only pending, generating, generated, approved, rejected. `grep -rn "ALTER TABLE frames" backend/migrations` shows 019 and 040 only (040 touches continuity columns) | The write result is not checked, so a live constraint would reject it silently (section 16 unknown) |
| WD-IMPL-TABLE-0059, WD-IMPL-TABLE-0060 | Table names `users` (in `backend/scripts/test-style-capsule-influence.ts:104`) and `hello` (in `backend/src/tests/streamlineExtractFile.test.ts:128`) | ORPHANED (text references, not queries) | No DDL; neither appears in a production query | None |

Frontend use of the Supabase client. The frontend performs no direct table, storage, RPC or realtime call. All 161 `supabase.` references in `src/` are `supabase.auth` (K section 0, WD-IMPL-FACT-0288). The one direct `projects` read is in `src/lib/services/imageService.ts:148-151`, which is an ORPHANED file (section 1).

## 5. Backend services and functions never called

Proof for every row is a static reference count over `backend/src` and `src`, with tests excluded unless stated. A "declaration only" row has no reference outside its definition.

| Ids | Item (path:line) | Status | Proof | Notes |
|---|---|---|---|---|
| WD-IMPL-DEAD-0001, WD-IMPL-DEAD-0083, WD-IMPL-DEAD-0046 | `DatabaseService.updateStageStateTraceId` (`backend/src/config/database.ts:69`), `createStageState` (`:83`), `getStageStatesByTraceId` (`:109`) | DEAD | `grep -rn "updateStageStateTraceId\|createStageState(\|getStageStatesByTraceId" backend/src backend/scripts src` → 3 definition lines, 0 callers | Only writer of `stage_states.langsmith_trace_id`, `prompt_template_version` and `final_prompt`. Section 14. WD-IMPL-FACT-0270 |
| WD-IMPL-DEAD-0008, WD-IMPL-DEAD-0084 | `backend/src/utils/resolveConflict.ts:34` `resolveConflict` (whole module) | ORPHANED, test-only | Only importer is `backend/src/utils/__tests__/resolveConflict.test.ts`. Unreachable from `server.ts` (WD-IMPL-FACT-0269) | Four-tier authority utility with no production path |
| WD-IMPL-DEAD-0010, WD-IMPL-DEAD-0085 | `backend/src/services/contextManager.ts:208` `assembleLocalContext`, `:274` `assembleFullContext`, `:288` `prepareStageContext`, `:326` `formatPromptGenerationContext` | ORPHANED | `grep -rn "prepareStageContext" backend/src` → `contextManager.ts` and `tests/contextManagerAuteurResolutions.test.ts` only | The "ESTABLISHED FACTS" injection is live only through `backfillTreatment` (WD-IMPL-CAP-0132, PARTIAL, ORPHANED) |
| WD-IMPL-DEAD-0015, WD-IMPL-DEAD-0042, WD-IMPL-DEAD-0086 | `backend/src/services/assetExtractionService.ts:366` `extractEntityMentions` (LLM full-script Pass 1), `@deprecated` at `:362-364` | DEAD, LEGACY | `grep -n "extractEntityMentions(" assetExtractionService.ts` → definition only (R1a C11) | It is the only extraction pass whose prompt contains script text (`:379`). WD-IMPL-FACT-0348 (R1a C11), WD-IMPL-AI-0034 |
| WD-IMPL-DEAD-0087 (and 0022, section 2) | `backend/src/services/assetInheritanceService.ts:292` `getInheritanceChain` | DEAD | 0 callers | None |
| WD-IMPL-DEAD-0047, WD-IMPL-DEAD-0088 | `backend/src/services/llm-client.ts:66` `langsmithClient` (declared, never read), `:74` `this.client` (assigned, never read), `:82` constructed, `:330` `setRetryConfig` (proxy `:384-385`) | DEAD | `grep -n "this.client" llm-client.ts` → the assignment only. `generate` builds its own client at `:133` | WD-IMPL-PROV-0016, WD-IMPL-PROV-0020 |
| WD-IMPL-DEAD-0050, WD-IMPL-DEAD-0089 | `backend/src/services/prompt-template.ts:346` `getTemplateVersions`; `backend/src/utils/token-utils.ts:119` `estimateCostForPrompt`, `:194` `UsageTracker.getUsageByModel`, `UsageTracker.clear` | DEAD | 0 external references | K section 2.5 lists `formatCost`, `formatTokenUsage`, `isSupportedModel` and `getSupportedModels` as referenced only by tests |
| WD-IMPL-DEAD-0039, WD-IMPL-DEAD-0091 | `backend/src/services/userCreditsService.ts:126` `addCredits` | DEAD | `grep -rn "addCredits(" backend/src` → definition only. No route | Consequence: no path refunds a charge (section 7, WD-IMPL-FACT-0351) |
| WD-IMPL-DEAD-0090 | `backend/src/services/styleCapsuleService.ts:79` getUserCapsules, `:124` createCapsule, `:159` updateCapsule, `:199` deleteCapsule, `:235` toggleFavorite, `:270` duplicatePreset, `:366` formatVisualStyleInjection, `:397` recordApplication, `:418` getUserLibraries, `:453` createLibrary | ORPHANED, DUPLICATED | Each name occurs once in `backend/src` (its declaration). `routes/styleCapsules.ts` has no import of the service and implements the same operations inline | Precision: the class is not dead as a whole. `getCapsuleById` has 7 call sites and `formatWritingStyleInjection` has 6 (see the corrections section at the end) |
| WD-IMPL-DEAD-0092 | `backend/src/config/supabase.ts:25` `supabaseConfig` (V1 also notes its `anonKey` is unused) | DEAD | Declaration only | None |
| WD-IMPL-DEAD-0043, WD-IMPL-DEAD-0093 | `backend/src/services/image-generation/NanoBananaClient.ts:171` `inpaintImage` (interface at `ImageProviderInterface.ts:52`); TODO at `:185` | DEAD, PARTIAL | `grep -rn "inpaintImage(" backend/src` → 2 lines (interface and definition) | The only mask-aware provider method. The frame inpaint path does not call it (section 7). WD-IMPL-AI-0011, WD-IMPL-FACT-0189 |
| WD-IMPL-DEAD-0040, WD-IMPL-DEAD-0094 | `backend/src/services/video-generation/VideoJobExecutor.ts:16` `pollIntervalMs` | DEAD | Single occurrence | Same file's `frame_prompt_snapshot` handling is section 14 |
| WD-IMPL-DEAD-0025, WD-IMPL-DEAD-0099 | `backend/src/services/continuityCompositionService.ts:124-138` `framePromptInstructions`, `continuityPromptInstructions`, `providerReadyReferences`, `debugMetadata`; also declared at `src/types/locationContinuity.ts:198-215` | DEAD | Frontend reads: 0 beyond the type | The route returns them (preview endpoint), so they are REACHABLE but have no consumer |
| WD-IMPL-DEAD-0096 | `backend/src/services/continuityCompositionService.ts:147` `locationImageById` parameter | DEAD | Passed from `projects.ts:3441`, never read in the service | WD-IMPL-DEAD-0026 |
| WD-IMPL-DEAD-0035, WD-IMPL-DEAD-0117 | `backend/src/services/promptGenerationService.ts:1200-1202` `framePrompt` parameter of `generateVideoPrompt` (not referenced in body `:1203-1258`); `PromptSet.systemPrompt` (`src/types/scene.ts:291`) has no writer | DEAD | Body grep | WD-IMPL-AI-0009 (canonical id for retired WD-IMPL-AI-0009, per `_evidence/merged/retired-ids.json`) |
| WD-IMPL-DEAD-0113 | Backend scripts and SQL files with no references (section 13) | ORPHANED | `grep -rln <name> backend/package.json backend/src` → 0 for each | WD-IMPL-FACT-0280 |

Test-referenced helpers (not classed DEAD here). K section 2.5 lists `utils/scriptManifest.ts` `parseDialogueLine`, `locationResolverService` `normalizeLocationText` and `tokenizeLocationText`, and `promptGenerationService` `matchShotToLocationView`, `buildLocationDeltaDescription` and `extractTraitSummary` as referenced by tests. The same section records internal references for several of them, so they are not classed DEAD. Whether any has a production-only path is UNKNOWN from the grep evidence alone.

## 6. Unreachable branches and impossible conditions

K section 6 reports no constant-boolean gates in `src`, `backend/src` or `backend/scripts` (no `if (false)`, `if (true)`, `&& false`, `|| true`, or `while (true)` outside tests). The unreachable branches below are reachable in source but never taken, or taken only through a value that is never produced.

| Ids | Branch (path:line) | Status | Why it cannot be taken | Effect |
|---|---|---|---|---|
| WD-IMPL-DEAD-0007, WD-IMPL-DEAD-0078, WD-IMPL-FACT-0005, WD-IMPL-FACT-0340 | Phase A unlock warning: `src/pages/ProjectView.tsx:695` `if (result.downstreamStages)` (`:695-705`), and the dialog open predicate `:977-979` `phaseAUnlockStage !== null && phaseAUnlockImpact !== null` | DEAD, CONTRADICTED | The 409 body nests `downstreamStages` under `details` (`backend/src/routes/stageStates.ts:596-604`). The else branch (`:708-709`) sets impact to null, so the dialog predicate is false | Unlock proceeds through `handleConfirmPhaseAUnlock` (`:718-724`) with `confirm=true`, applying the outdated cascade with no prompt (R1a C03). See section 7 |
| WD-IMPL-DEAD-0031 | Stage 7 relock path, `backend/src/routes/sceneStageLocks.ts:290-375`. Stage 7 is never set to `outdated` | DEAD (no producer for Stage 7) | The unlock guard admits only stages 7 to 12 (`sceneStageLocks.ts:151-153`). The cascade loop runs for `s = stage+1..12` (`:189-193`, applied at `:245-249`), so Stage 7 is never downstream of an unlock. The other writers start at stage 8 or 9 (`projects.ts:3144-3148`, `shotAssetAssignmentService.ts:330-333`). The relock check at `:327` therefore cannot pass for Stage 7 | Lead correction on WD-IMPL-FACT-0193 and WD-IMPL-DEAD-0031 (K contradiction refuted). The separate `frames_locked` status that V8 also reports as unreachable has no DEAD id |
| WD-IMPL-DEAD-0107, WD-IMPL-DEAD-0030 (section 8) | Legacy `POST /shots/unlock` invalidation branch, `backend/src/routes/projects.ts:3020-3185`, with writes at `:3106-3117` | DEAD, LEGACY | `projects.ts:3051` returns 400 `Shot list is not locked` when `shot_list_locked_at` is null. The stage-locks unlock clears that column first (`sceneStageLocks.ts:256-258`), so this call always fails from the UI | The UI swallows the 400 (`Stage7ShotList.tsx:812-818`). The `frames` status write at `:3106-3110` is also not reachable |
| WD-IMPL-DEAD-0023, WD-IMPL-DEAD-0097 | `direction_location_mismatch` branch, `backend/src/services/locationCoverageService.ts:10, :296-304, :364` | DEAD, CONTRADICTED with the branch's intent | Views are grouped by `project_asset_id` (`:226-240`), and `locationAssetId` is set from the same key (`:154`), so `assignedView.locationAssetId !== location.id` is always false | The mismatch state is never reported (V7 and K section 3.2 agree) |
| WD-IMPL-DEAD-0006, WD-IMPL-DEAD-0114 | Dashboard card styles for `skipped` and `outdated`, `src/components/dashboard/ProjectCard.tsx:18-30` | DEAD | `grep -c "'skipped'" backend/src/routes/projects.ts` → 0. The dashboard list never emits `skipped` | The dots on the card disagree with the ProjectView derivation (WD-IMPL-CAP-0016) |
| WD-IMPL-DEAD-0012, WD-IMPL-DEAD-0115 | Origin subtext for `outdated` badges, `src/lib/utils/stageBadge.ts:30-41` | DEAD | The outdated insert at `backend/src/routes/stageStates.ts:644-653` does not set `origin`, and the column is nullable (`backend/migrations/041_stage_states_skip_and_commit.sql:38`) | The subtext branch receives no value. Section 14 for the stored rows |
| WD-IMPL-DEAD-0041, WD-IMPL-DEAD-0079 | Stage 11 "Confirm & Render" lock button, `src/components/pipeline/Stage11Confirmation.tsx:159` passes `lockAndProceedLabel` without `onLockAndProceed`, and `LockedStageHeader.tsx:137-148` renders the button only when `onLockAndProceed` is defined | DEAD | Prop never passed | Button never renders. `priorSceneEndFrameUrl` (`src/types/scene.ts:442`) has no reader |
| WD-IMPL-DEAD-0033, WD-IMPL-DEAD-0116 | Stage 9 transformation context and FramePanel copy and upload source badges, `Stage9PromptSegmentation.tsx:622`, `FramePanel.tsx:373,379` | DEAD | No backend emitter: `grep -rn "'copy'\|'upload'" backend/src` → 0 source values, and the generations map at `backend/src/routes/frames.ts:1295-1302` has no `source` field | Badges never render. `PromptSet.transformationContext` (`src/types/scene.ts:308`) is never populated |
| WD-IMPL-DEAD-0005, WD-IMPL-DEAD-0077 | New-project handler `src/App.tsx:59-62` (TODO, `console.log` only), passed as `onNewProject` to `src/pages/Dashboard.tsx:16,19`, which never calls it | DEAD, PLACEHOLDER | The Dashboard's real flow is `NewProjectCard` to `NewProjectDialog` (`Dashboard.tsx:120`, `src/components/dashboard/NewProjectDialog.tsx:37-45`) | The TODO is real but unreachable from the UI (WD-IMPL-FACT-0358) |
| (no DEAD id) WD-IMPL-CAP-0192, WD-IMPL-FACT-0355 | `src/components/pipeline/Stage8/TransformationEventCard.tsx:91-93` "AI Detected" branch | DEAD branch | `detected_by` is `'manual'` for every writer. The enum at `backend/src/routes/sceneAssets.ts:1793` (`stage7_extraction`, `stage8_relevance`) has no producer | Badge cannot appear with current writers (R1b C18) |
| (no DEAD id) WD-IMPL-CAP-0269 | Prior-scene branch of the Stage 11 dependency banner | DEAD branch | Its query selects `end_frame_thumbnail`, which the schema does not define (section 4) | Only the unapproved-frame branch can show |
| WD-IMPL-DEAD-0011, WD-IMPL-DEAD-0109 | Stage 4 skip in streamline, `src/lib/utils/streamlineRouting.ts:97-120` | PARTIAL (section 7) | `'skip'` is assigned only to stages 2 and 3 (`:100,:103,:112`); stage 4 is always `locked` when a script file is present | Stage 4 can never be skipped through streamline |
| WD-IMPL-DEAD-0106 | `DELETE .../shot-assignments/all` handler, `backend/src/routes/shotAssignments.ts:223-244` | DEAD (shadowed) | Captured by `:195` (section 4) | Bulk handler unreachable for DELETE |

## 7. PARTIAL features: UI exists but a backend path is broken, or the reverse

Each row names the exact break. Status is PARTIAL unless a row says otherwise. "UI side" and "backend side" are both present in every row, so the row is not a dead feature.

| Feature | Exact break (path:line) | Ids |
|---|---|---|
| Phase A unlock warning | Backend 409 nests `details.downstreamStages` (`stageStates.ts:596-604`); `ProjectView.tsx:695` reads it top-level. The else branch unlocks without a prompt | WD-IMPL-DEAD-0007, WD-IMPL-FACT-0340 (R1a C03) |
| Stage 1 project type `audio-visual` | UI sends `audio-visual` (`Stage1InputMode.tsx:92`, `src/types/project.ts:31`). PUT validator accepts only `audio_visual` (`projects.ts:684-686`), DB CHECK `001_initial_schema.sql:13`. Stage 1 save logs and does not advance (`Stage1InputMode.tsx:292-294`). Streamline commit fails in the RPC (`044_streamline_atomic_intake_fix.sql:65-66`) | WD-IMPL-FACT-0346 (R1a C09), WD-IMPL-CAP-0023 |
| `/projects/new` creation | Project and stage 1 draft are created under a real id, then `lockStage('new', 1)` runs `.eq('id','new')` (`stageStates.ts:315-323`) and returns 404. The Dashboard path is unaffected. Status CONTRADICTED with the typed-URL reach | WD-IMPL-CAP-0049 (PARTIAL, CONTRADICTED), WD-IMPL-FACT-0358 (R1b C21) |
| Stage 7 shot-list unlock | `Stage7ShotList.tsx:812-818` calls `confirmUnlockViaHook(7)`, then `shotService.unlockShotList` inside a swallowing `try`. The second call returns 400 (`projects.ts:3051`) | WD-IMPL-CAP-0229, WD-IMPL-DEAD-0030 |
| Stage 7 shot lock on mutations | No shot mutation route reads `shot_list_locked_at`. The migration 014 trigger changes only `scenes.status` and raises nothing (`014_add_shot_list_locking_with_trigger.sql:29-61`). Direct API calls mutate shots of a locked scene | WD-IMPL-INVALIDATE-0055, WD-IMPL-FACT-0342 (R1a C05), WD-IMPL-FACT-0177 |
| Bulk clear of shot assignments | Route shadowing (section 4): the bulk-template apply fails at step 1 | WD-IMPL-DEAD-0106, WD-IMPL-FACT-0343 (R1a C06) |
| Frame generation failure | A failed start or end frame job leaves `frames.status='generating'`. The failure catch (`ImageGenerationService.ts:549-583`) writes the job row and, for angle variants, `asset_angle_variants`. It does not touch the frame. Only `GET .../frames/:id/status` moves it to `rejected` (`frameGenerationService.ts:1430-1437`), and that route has no UI caller. Stage 10 polls GET frames every 2 s while any frame is generating (`Stage10FrameGeneration.tsx:252-259`) | WD-IMPL-FACT-0350 (R1b C13), WD-IMPL-DEAD-0032 |
| Frame style capsule | Five frame routes select `stage_states.state_data` by `project_id` (`frames.ts:262-264`). Neither column exists and the error is discarded. Frame image jobs are created with no capsule id (`ImageGenerationService.ts:159,309-310`) | WD-IMPL-FACT-0338 (R1a C01) |
| Project visual and writing capsule ids | Read at five conditional sites (`contextManager.ts:498-499`, `frames.ts:569`, `frames.ts:2216`, `projects.ts:3740`) and three select lists, but written nowhere in code. Reads return NULL | WD-IMPL-FACT-0339 (R1a C02), WD-IMPL-DEAD-0102 |
| Frame inpaint | Mask stored (`frameGenerationService.ts:1284,1312`) but not transmitted. The request sends the current frame image as a reference (`:1304`, `ImageGenerationService.ts:335-345`) plus a text marker (`:1291`) | WD-IMPL-FACT-0189, WD-IMPL-DEAD-0043 |
| Aspect ratio for generated images | Stored as `width`/`height` on the job row (`ImageGenerationService.ts:160-161`), passed to the provider (`:353-357`), and not included in the Gemini request (`NanoBananaClient.ts:118-130`). No resize afterward. Runtime output size UNKNOWN | WD-IMPL-FACT-0349 (R1b C12) |
| Background isolation for characters, props and extras | `postProcessBackground` returns the buffer unchanged (`ImageGenerationService.ts:96-103`) and is called at `:373` and `:842` | WD-IMPL-DEAD-0051, WD-IMPL-PROV-0008 |
| Stage 4 skip from streamline | Only stages 2 and 3 can receive `'skip'` (`streamlineRouting.ts:100,103,112`) | WD-IMPL-DEAD-0011, WD-IMPL-DEAD-0109 |
| Stage 5 lock | `lockAllAssets` sets `locked`. Per-asset lock has no UI caller. Nothing sets `locked` back to false. Text routes check the flag (`projectAssets.ts:585-588`, `:704`, `:771`, `:1017-1018`, `:2084-2086`). Generate-image (`:1210-1287`), upload (`:1288-1379`), edit (`:1436-1526`) and clear-all (`:1631-1674`) routes do not | WD-IMPL-FACT-0357 (R1b C20), WD-IMPL-FACT-0157 |
| Stage 4 deleted-scene promise | Dialog says deleted scenes "will be marked continuity_broken" (`Stage4MasterScript.tsx:1234`). Only `continuityRiskAnalyzer.ts` reads that value. No writer. The delete is a hard delete with cascade (`projects.ts:1379-1438`), so only the warning copy is wrong | WD-IMPL-FACT-0352 (R1b C15), WD-IMPL-STATE-0028 |
| Streamline commit | `formatChoice` is client-only (`grep -rn formatChoice backend/src` → 0). Content is chosen by presence of `formattedText` (`streamlineRouting.ts:168`). The commit RPC has no idempotency key, so a retry after a server-side success duplicates Stage 1 draft, stage, asset and resolution rows | WD-IMPL-FACT-0356 (R1b C19) |
| Render confirm | Charge is the scene-wide total including shots with no start frame (`videoGenerationService.ts:221-222`). Shots without a start frame are skipped only at insert (`:345`). No existing-job check (`:381`). Deduction runs after insert (`:394`). `addCredits` has 0 callers, so nothing is refunded | WD-IMPL-FACT-0351 (R1b C14), WD-IMPL-DEAD-0039 |
| Veo 3.1 video provider | Complete submit, poll and upload client (`Veo3Provider.ts`), gated by `VIDEO_PROVIDER=veo3`, `GOOGLE_CLOUD_PROJECT` and ADC. Upload bucket `videos` has no creation script (`scripts/setup-storage-buckets.ts:38` creates other buckets). Exercised only by the manual script `src/tests/veo3-test.ts`, which jest does not match | WD-IMPL-PROV-0013, WD-IMPL-PROV-0018, WD-IMPL-PROV-0027, WD-IMPL-FACT-0139 |
| LangSmith explicit tracing | Callbacks fail inside `getLangchainCallbacks()` (`getCurrentRunTree()` throws outside a traceable scope), and the error is caught and logged at `llm-client.ts:157-160`. `stage_states.langsmith_trace_id` is never written. The stored `traceId` is a request UUID (`llm-client.ts:179`), not a LangSmith run id. Whether LangChain's env tracer records runs is UNKNOWN | WD-IMPL-FACT-0353 (R1b C16), WD-IMPL-PROV-0020, WD-IMPL-PROV-0030 |
| Stage 11 prior-scene dependency banner | Query selects `end_frame_thumbnail`, which the schema does not define. Only the unapproved-frame branch can show | WD-IMPL-CAP-0269 |
| Stage 11 "Unsatisfied with results" | Popover, modal and `setSceneStage` run, but the description is discarded and nothing is unlocked or invalidated | WD-IMPL-CAP-0280 |
| Transformation flags to events | Flags are written by Stage 7 extraction (`projects.ts:1928`) and read by nothing. Events are created only manually (`transformationEventService.ts:251-252`, `sceneAssets.ts:1832`). LLM detection is automatic, conversion is not | WD-IMPL-FACT-0355 (R1b C18), WD-IMPL-FACT-0100 |
| Location classification | Route classifier uses 0.72 and can return `ambiguous` (`projects.ts:102-112`, `locationResolverService.ts:72-74`). Composition uses 0.8 and never returns `ambiguous` (`continuityCompositionService.ts:231-234`). For confidence in [0.72, 0.8) a shot is `resolved` in Stage 7 and `suggested` in continuity preview | WD-IMPL-FACT-0344 (R1a C07) |
| Composition candidates | `candidates: []` on every call (`continuityCompositionService.ts:247-248`) | WD-IMPL-DEAD-0098 |
| Asset distillation payload | No script text reaches the model. `mention.context` is computed and not read (`assetExtractionService.ts:335,388`). The prompt is built from generated labels and style text (`:542-549`) | WD-IMPL-FACT-0348 (R1a C11) |
| Story-context treatment section | `treatmentProse`, `treatments` and `selectedTreatmentId` are read (`storyContextService.ts:95,113-114`) and never written. The section is always empty, and prompts render "(not available)" (`:306,391`). The beat section does populate | WD-IMPL-FACT-0347 (R1a C10) |
| Add-asset scene numbers | `AddAssetModal.tsx:67-76` parses scene numbers and does not send them. The route accepts `scene_numbers` (`projectAssets.ts:1134,1189`) | WD-IMPL-CAP-0138 |
| Storage cleanup | Storage objects are not deleted when rows are removed by cascade or asset delete. Stage 9 retry delete targets bucket `frames` while uploads go to `asset-images` (`CAP-0259`). Staged streamline images are never removed | WD-IMPL-FACT-0174, WD-IMPL-CAP-0259, WD-IMPL-DEAD-0014, WD-IMPL-DEAD-0110 |
| Retry of a failed file extraction | The Retry button shows a toast and makes no request | WD-IMPL-CAP-0115 |
| `extra_archetype` asset type in the asset drawer and match modal | The type union includes `extra_archetype` (`src/types/asset.ts:1`). `src/components/pipeline/AssetDrawer.tsx` and `AssetMatchModal.tsx` have no reference to it (`grep -c extra_archetype` on both → 0). CAP-0150 covers the global library clone path, which was not re-checked here | WD-IMPL-DEAD-0019 (CONTRADICTED), WD-IMPL-CAP-0150 |
| Deferred scenes | `is_deferred` is consulted only by the Script Hub UI. Stage-lock, shot, frame and generation routes do not check it | WD-IMPL-INVALIDATE-0012, WD-IMPL-CAP-0034 |
| Scene stage navigation | Sidebar gating is UI-only. A URL can open any scene stage. Back does not persist the stage | WD-IMPL-CAP-0036, WD-IMPL-CAP-0038 |
| Reload restore | `restoreStage()` is unused (`ProjectView.tsx:152`). Restore validation does not run when a project has zero `stage_states` rows | WD-IMPL-CAP-0022, WD-IMPL-DEAD-0076 |
| Skipped stage "Write this myself" | Unlocks the stage to draft with no content through `unlock(confirm=true)` | WD-IMPL-CAP-0027 |
| Sign-out and route protection | Sign-out does not clear React Query or `project_*` localStorage keys. `ProtectedRoute` sets `state.from` and nothing reads it, so login always goes to `/dashboard` | WD-IMPL-CAP-0004, WD-IMPL-CAP-0006, WD-IMPL-FACT-0009 |
| Dashboard progress dots | Card shows "Stage N of 5" from the API. Skipped stages render as pending on the server, so the dots disagree with ProjectView | WD-IMPL-CAP-0016 |
| Seeded prompt templates | Rows seeded with `created_by` NULL can be updated, deleted or activated by any authenticated user. Ownership guards skip NULL owners (`prompt-template.ts:207,240,375`) | WD-IMPL-FACT-0354 (R1b C17) |
| Text field versions | Single policy `FOR ALL USING (true) WITH CHECK (true)` with no `TO` clause (`036_text_field_versions.sql:29-34`), so PUBLIC including anon is admitted | WD-IMPL-FACT-0359 (R1b C22) |
| Migration runner | `runMigration` splits on `;` and calls `supabase.rpc('exec', ...)` (`backend/src/config/database.ts:41-54`). No repo file defines `exec`. Migration 005 Step 4 uses `UNIQUE ... WHERE` on a table constraint (`005_make_library_optional.sql:22-25`), which is not valid PostgreSQL. `npm run migrate` is not run here | WD-IMPL-FACT-0345 (R1a C08) |
| Style capsule library page | Creating a library is dead (`DEAD-0071`), and libraries are auto-created | WD-IMPL-CAP-0047, WD-IMPL-FACT-0023 |
| ESTABLISHED FACTS injection | Live only in `backfillTreatment`, and only when a writing capsule is present | WD-IMPL-CAP-0132 |

## 8. LEGACY and compatibility code, and deprecated columns still written

Legacy paths still reachable from a live request.

| Path (path:line) | Behavior | Status | Ids |
|---|---|---|---|
| Stage 7 dual lock writes: `backend/src/routes/sceneStageLocks.ts:116-118, :256-258, :350-352`; `projects.ts:2975, :3155` | Writes `scenes.shot_list_locked_at` and `scenes.stage_locks['7']` together. The trigger keeps `scenes.status` in step | LEGACY, PERSISTED | WD-IMPL-FACT-0281, WD-IMPL-FACT-0282, K section 3.4 |
| Legacy `POST /shots/unlock` (`projects.ts:3020-3185`) | Second unlock call, always fails with 400 (section 6) | LEGACY, DEAD | WD-IMPL-DEAD-0030, WD-IMPL-DEAD-0107 |
| Legacy LLM scene dependency extraction, `projects.ts:1338-1346` into `backend/src/services/sceneDependencyExtraction.ts` | Runs when the tiptap manifest yields no dependencies. Marked `@deprecated` at `:4, :31, :35`; logs "Legacy LLM path invoked" | LEGACY, reachable | WD-IMPL-AI-0023, WD-IMPL-FACT-0286, WD-IMPL-FACT-0312, WD-IMPL-PRESSURE-0042 |
| Legacy all-assets-per-shot, `projects.ts:3825-3828` and `promptGenerationService.ts:914-929` | Stage 9 uses every asset per shot when shot assignments are absent or fail | LEGACY, reachable | WD-IMPL-FACT-0286 |
| Legacy suffix for old frame data, `frameGenerationService.ts:465` | Fallback for legacy frame records | LEGACY, reachable | WD-IMPL-FACT-0286 |
| Manual style capsule injection, `backend/src/routes/llm.ts:233-237` | Backward-compatibility branch taken when the request has no project or branch metadata (`llm.ts:230-231`) | LEGACY, reachable | WD-IMPL-FACT-0286 |
| "Legacy (no roles)" reference handling, `NanoBananaClient.ts:89` | Reachable branch for reference images without roles | LEGACY, reachable | WD-IMPL-FACT-0286 |
| `POST /api/projects/:p/assets/extract` (`projectAssets.ts:44`) and `projectAssetService.extractAssets` (`:104`) | Deprecated one-shot extraction. No UI caller (section 3) | LEGACY, ORPHANED | WD-IMPL-ROUTE-0031, WD-IMPL-DEAD-0018 |
| `masterScript` parameter in the extraction route (`projectAssets.ts:112`) | Deprecated, kept (K's line number is marked unverified) | LEGACY | K section 4 |
| Streamline `.doc` rejection, `streamlineExtractionService.ts:48,56`, `StreamlineDropZone.tsx:75` | Explicit rejection message, behavioral only | LEGACY (text) | K section 4 |

Legacy code that has no live caller.

| Path (path:line) | Status | Ids |
|---|---|---|
| `streamline_commit` bodies in `041_stage_states_skip_and_commit.sql:64`, `042_streamline_asset_import_and_commit.sql:34` and the 043 body at `043_intake_resolutions.sql:137`; wrapper `streamline_commit_atomic` (`044_streamline_atomic_intake_fix.sql:38`) strips `project_config` and `stage_1_draft` before delegating (`:98`), so 043's draft insert at `:220` is not reached on the commit path | LEGACY (superseded bodies), TABLE-0017 | WD-IMPL-DEAD-0013, WD-IMPL-DEAD-0108, WD-IMPL-TABLE-0017 |
| `scenes.stage_locks`, defined only in `backend/quickies-sql/add_stage_locks.sql:1` | LEGACY, outside the migration chain, used by six handlers | WD-IMPL-FACT-0143, WD-IMPL-FACT-0210, WD-IMPL-FACT-0300 |
| Preset style capsules and style capsule tables (`004_style_capsule_system.sql`, `005_make_library_optional.sql`) | LEGACY | WD-IMPL-ENTITY-0006, WD-IMPL-TABLE-0007, WD-IMPL-FACT-0023 |
| `'legacy_backfill'` enum values (`Stage7ShotList.tsx:376`, `locationResolverService.ts:9,44`, `types/locationContinuity.ts:10`) | Data values, not code paths | K section 4 |
| `screenplay-converter.ts:240` "Legacy functions (kept for backward compatibility)", `:244`, `:292` (`@deprecated`), `:332` (legacy `<center>` tags) | LEGACY | WD-IMPL-DEAD-0082 |
| `types/scene.ts:99` "Legacy shape" comment on `SceneAsset` | LEGACY | WD-IMPL-DEAD-0080 |
| `scriptService.ts:608` "legacy fallback" slug in `generateSlug` | LEGACY | K section 3.5 |
| Migration numbering collisions: two `022_*` and two `024_*` files (`022_add_aspect_ratio.sql`, `022_scene_asset_generation_attempts.sql`, `024_extra_archetype_and_style_outdated.sql`, `024_scene_asset_suggestions.sql`) | LEGACY, deterministic order | WD-IMPL-FACT-0291 |
| Dead and deprecated code remains in the tree | LEGACY | WD-IMPL-PRESSURE-0062 |

Deprecated or legacy columns and objects that are still written (the write is present, the read is absent or the object is not defined).

| Column or object | Writer (path:line) | Reader | Status | Ids |
|---|---|---|---|---|
| `shots.transformation_flags` | `backend/src/routes/projects.ts:1928` | None. Returned by GET shots through `select('*')` (`projects.ts:1559`) | DEAD, write-only | WD-IMPL-DEAD-0029, WD-IMPL-DEAD-0101 |
| `shots.continuity_frame_prompt` | `backend/src/routes/frames.ts:2237` | Read back into API responses (`projects.ts:3243,3272,3913,3936`) and Stage 10 UI state (`Stage10FrameGeneration.tsx:564`). No generation reader | PARTIAL (read by UI, not by generation) | WD-IMPL-DEAD-0024, WD-IMPL-STATE-0061 |
| `video_generation_jobs.frame_prompt_snapshot` | `videoGenerationService.ts:366` | Mapped to the typed field at `:653`. No provider or UI reader | DEAD, write-only | WD-IMPL-DEAD-0040, WD-IMPL-DEAD-0095 |
| `location_match_events` | `backend/src/services/locationResolverService.ts:485` | None | DEAD, write-only | WD-IMPL-DEAD-0026, WD-IMPL-DEAD-0100 |
| `style_capsule_applications` | `backend/src/routes/stageStates.ts:259-281` (failure ignored) | None. Service method that would write `applied_at` is never called | DEAD, PARTIAL | WD-IMPL-TABLE-0035, WD-IMPL-TABLE-0004 |
| `intake_resolution_edits` | RPC body, `043_intake_resolutions.sql:428-447` | Never read by TypeScript | DEAD, write-only | WD-IMPL-TABLE-0056 |
| `frames.status = 'invalidated'` | `backend/src/routes/projects.ts:3106-3110` | Not applicable. CHECK at `019_frames_table.sql:12-18` excludes it | CONTRADICTED | WD-IMPL-FACT-0284 |
| `videos` (table) | `backend/src/routes/projects.ts:3115-3116` | `projects.ts:3078-3079`, `sceneStageLocks.ts:215` | UNKNOWN in live DB, LEGACY in code | WD-IMPL-TABLE-0005, WD-IMPL-TABLE-0028, WD-IMPL-TABLE-0057 |
| `invalidation_logs` (table) | `backend/src/routes/projects.ts:3123` | None | UNKNOWN in live DB, LEGACY in code | WD-IMPL-TABLE-0006, WD-IMPL-TABLE-0058 |
| `scenes.shot_list_locked_at` | `sceneStageLocks.ts:116-118, :256-258, :350-352`; `projects.ts:2975, :3155` | Guards at `projects.ts:2888` and `:3051`; trigger 014 | LEGACY, PERSISTED | K section 3.4, WD-IMPL-FACT-0281 |
| `stage_states.origin` | Several writers set it to NULL | Outdated badge subtext (section 6) | PARTIAL | WD-IMPL-FACT-0154, WD-IMPL-DEAD-0115 |

## 9. Duplicated implementations

No shared package exists between `src/` and `backend/`, so every mirrored type is a hand-maintained copy (WD-IMPL-FACT-0274). "Identical" means the field names match in K's script comparison. Divergence is by field count or by a named difference.

### 9.1 Types mirrored between frontend and backend

| Concept | Copies (path:line) | Status | Difference | Ids |
|---|---|---|---|---|
| Frame, ShotWithFrames, FrameJobStatus | `src/types/scene.ts:327, :350, :394` and `backend/src/services/frameGenerationService.ts:11, :34, :110` | DUPLICATED | 20, 26 and 7 fields, identical | WD-IMPL-FACT-0274 |
| TransformationEvent, TransformationFlag | `src/types/scene.ts:27, :19` and `backend/src/services/transformationEventService.ts:19`, `shotExtractionService.ts:12` | DUPLICATED | 20 and 5 fields, identical | WD-IMPL-FACT-0274 |
| VideoGenerationJob, ShotCheckoutDetail, CheckoutData | `src/types/scene.ts:475, :420, :445` and `backend/src/services/videoGenerationService.ts:51, :12, :37` | DUPLICATED | 29, 16 and 11 fields, identical. `ConfirmRenderResult` (`scene.ts:465` and `:83`) was not compared | WD-IMPL-FACT-0274 |
| ContinuityBaseCandidate | `src/types/locationContinuity.ts:166`, `backend/src/services/continuityBaseService.ts:5`, `continuityCompositionService.ts:90` | DUPLICATED, diverged | 14 fields each. Frontend makes `sourceSceneId`, `status`, `approvedAt`, `generatedAt` optional and types `suitability` as `ContinuityStrength`. Backend requires them and types `suitability` as `ContinuityBaseSuitability` | WD-IMPL-FACT-0274 |
| ShotLocationState, LocationCoverageResponse | `src/types/locationContinuity.ts:64, :128` and `continuityCompositionService.ts:53`, `locationCoverageService.ts:110` | DUPLICATED | 14 and 14 fields, identical | WD-IMPL-FACT-0274 |
| LocationCoverageSummary | `src/types/locationContinuity.ts:105` and `backend/src/services/locationCoverageService.ts:82` | DUPLICATED, diverged | Frontend 15 fields, backend 19 (adds `id`, `name`, `assetType`, `imageUrl`) | WD-IMPL-FACT-0274 |
| PresenceType | `src/types/scene.ts:244`, `backend/src/services/promptGenerationService.ts:112`, `backend/src/services/shotAssetAssignmentService.ts:8` | DUPLICATED | Same union in three copies | WD-IMPL-FACT-0274 |
| ShotAssetAssignment, ReferenceImageOrderEntry | `src/types/scene.ts:246, :257` and `shotAssetAssignmentService.ts:10`, `promptGenerationService.ts:89` | DUPLICATED, diverged | Frontend 7 fields (adds `scene_asset_instance`) vs backend 6. Frontend 10 (adds `providerRole`) vs backend 9 | WD-IMPL-FACT-0274 |
| StreamlineQuestion, QAPair, Classification | `src/lib/services/streamlineService.ts:62, :89, :28` and `backend/src/services/streamlineQuestionService.ts:20`, `streamlineReconciliationService.ts:22`, `streamlineClassificationService.ts:15` | DUPLICATED | 7, 3 and 2 fields, identical | WD-IMPL-FACT-0274 |
| StreamlineAssetDraft | `src/lib/services/streamlineService.ts:33` and `src/lib/utils/streamlineRouting.ts:14` | DUPLICATED, diverged | Routing copy adds `sourceFileId` | WD-IMPL-FACT-0274 |
| TextFieldVersion, StyleCapsuleLibrary | `src/lib/services/textFieldVersionService.ts:8` and `backend/src/services/textFieldVersionService.ts:15`; `src/types/styleCapsule.ts:17` and `backend/src/services/styleCapsuleService.ts:27` | DUPLICATED | camelCase on one side, snake_case on the other, bridged by a mapping layer | WD-IMPL-FACT-0274 |
| Beat | `src/lib/services/beatService.ts:5` and `backend/src/services/contextManager.ts:23` | DUPLICATED, diverged | Frontend 7 fields (adds `originalTreatmentExcerpt`, `isExpanded`) vs backend 5 | WD-IMPL-FACT-0274 |
| ValidationError, ValidationWarning | `src/components/pipeline/Stage7ShotList.tsx:54, :61` and `backend/src/services/shotValidationService.ts:18, :26` | DUPLICATED | 5 fields each, identical. Client and server validation are separate implementations (V8 section 11) | WD-IMPL-FACT-0274, WD-IMPL-FACT-0091 |
| ScriptConfidenceResult | `src/lib/utils/scriptConfidence.ts:6` and `backend/src/utils/scriptConfidence.ts:14` | DUPLICATED, diverged | Frontend adds `tiptapDoc` | WD-IMPL-FACT-0275 |
| Scene (name collision) | `src/types/scene.ts:76` (17 fields) and `src/lib/services/scriptService.ts:7` (5 fields, including `heading` and `content`) | CONTRADICTED naming | Two `Scene` types with different shapes in the same frontend | WD-IMPL-FACT-0274 |
| LocationMatchSource | `backend/src/services/locationResolverService.ts:13` derived from `LOCATION_MATCH_SOURCES` (`:3`); `src/types/locationContinuity.ts:4` declares its own union | DUPLICATED | Two sources of the same union, not compared | K section 5.1 |

### 9.2 Logic duplicated across or within the two sides

| Concept | Copies (path:line) | Status | Divergence | Ids |
|---|---|---|---|---|
| Script-confidence detector | Frontend `src/lib/utils/scriptConfidence.ts:24-44` counts `sceneHeading` and `dialogueLine` nodes from `parseScriptToTiptapJson`. Backend `backend/src/utils/scriptConfidence.ts:1-10` claims to be a "server-side mirror" but uses its own `SCENE_HEADING_RE = /^(INT\.\|EXT\.)/i`, `CHARACTER_RE` and a line scanner with `awaitingDialogue` (`:27-63`) | DUPLICATED, CONTRADICTED | Thresholds are identical (`MIN_SCENE_HEADINGS = 3`, `MIN_DIALOGUE_LINES = 1`). The two sides can classify the same text differently. Not executed (U) | WD-IMPL-FACT-0275 |
| Aspect-ratio tables | `src/components/pipeline/Stage5Assets.tsx:89-94`, `backend/src/routes/sceneAssets.ts:484-489`, `backend/src/services/image-generation/ImageGenerationService.ts:56-64` (`ASPECT_RATIOS`), `backend/src/services/frameGenerationService.ts:126-129` (`FRAME_DIMENSIONS`, pixel map) | DUPLICATED | Four copies. Values agree for asset types | WD-IMPL-FACT-0276, WD-IMPL-DEAD-0020 |
| ANGLE_PROMPTS | `src/types/asset.ts:153` (0 references) and inline in `ImageGenerationService.ts:258` (used at `:271`) | DUPLICATED, one copy dead | Only the backend copy is used | WD-IMPL-DEAD-0020, WD-IMPL-DEAD-0080 |
| Style-resolution logic | Re-implemented per route with three fallback orders (generate-image; edit-image and angle variants; location-view). The isolation suffix exists in both the edit-image route and its service | DUPLICATED | Three fallback orders | V5 section 12, WD-IMPL-DEAD-0020 |
| `mapCharactersToForegroundBackground` | Copied into three services | DUPLICATED | Not compared | V8 section 11 |
| Stage 7 validation | Client and server implement the same rules | DUPLICATED | Not compared | V8 section 11, WD-IMPL-FACT-0091 |
| Job polling | K counts four implementations: `projectAssetService.ts:385` pollImageJob (live), `imageService.ts:99` pollJobStatus (dead file), `frameService.ts:569, :593` pollFrameStatus and pollUntilComplete (dead), `sceneAssetService.ts:372` (live). V5 section 12 counts three client implementations: pollImageJob, `EnhancedUploadModal.pollForCompletion` (live), and the orphaned `imageService.pollJobStatus`. The two lists overlap but do not match | DUPLICATED, two dead | Polling intervals and terminal states are coded per copy (not compared) | WD-IMPL-FACT-0277, WD-IMPL-DEAD-0054, WD-IMPL-DEAD-0064 |
| LLM JSON parsing | Backend `backend/src/utils/llmJson.ts:111, :135` (`extractJsonArray`, `extractJsonObject`), used only by streamline services. Frontend re-parses per service: `beatService.ts:303`, `treatmentService.ts:351`, `scriptService.ts` `parseScriptResponse` | DUPLICATED | Not compared | WD-IMPL-FACT-0278 |
| TipTap text extraction and screenplay regexes | `src/lib/utils/screenplay-converter.ts:19, :21, :164`; `backend/src/utils/scriptManifest.ts:63-67` (`getNodeText`); backend `scriptConfidence.ts` (own regexes) | DUPLICATED | Three regex sets | WD-IMPL-FACT-0279 |
| Scene heading and slug | Frontend `scriptService.ts:375` parseSceneHeading and `:610` generateSlug (legacy fallback at `:608`), against the regex set at `screenplay-converter.ts:19-25`. Backend slug and heading logic not re-verified | DUPLICATED, backend side UNKNOWN | Not compared | K section 5.3 |
| Streamline config constants | `src/lib/utils/streamlineConfig.ts` and `backend/src/config/streamlineConfig.ts` are byte-identical except comments | DUPLICATED | None in values | K section 5.3 |
| Streamline classifiers | Backend `backend/src/services/streamlineClassificationService.ts:67` `classifyFile` (script detector, then LLM prose classifier). Frontend `src/lib/utils/streamlineRouting.ts:30-32` uses the server result or an override. The stale comment at `src/lib/services/streamlineService.ts:25` says Phase 2 "always returns the 'unclassified' stub", while the route calls the real classifier at `backend/src/routes/streamline.ts:217` | DUPLICATED, CONTRADICTED comment | Comment is stale | WD-IMPL-FACT-0290 |
| Location classifiers | Route `backend/src/routes/projects.ts:102-112` uses 0.72. Composition `continuityCompositionService.ts:231-234` uses 0.8 | DUPLICATED rule, divergent thresholds | See section 7 | WD-IMPL-FACT-0344 (R1a C07) |
| Render-status aggregation | Duplicated in the video path ("R6 and R7" in V10 section 5.6) | DUPLICATED | Not compared | V10 section 5.6 |
| Stage 9 and 10 system prompts | Inline in `promptGenerationService.ts:1135, :1207, :1307, :1376`. `prompt-template.ts` (the `prompt_templates` table) is used only by `routes/llm.ts` and `routes/seed.ts`. Stages 9 and 10 do not read the table | DUPLICATED-REPRESENTATION | Two representations of prompt text | WD-IMPL-DEAD-0034 |
| Seed templates for stages 2 to 4 | `backend/scripts/seed-templates.ts` (224 lines; template lengths 1628, 1314, 1419) and `backend/src/routes/seed.ts` (214 lines; 969, 969, 2456). Same keys: `treatment_expansion`, `beat_extraction`, `master_script_generation`. About 88 differing diff lines in the templates block. The script has no caller | DUPLICATED, diverged | Text differs. Which copy is live in the deployed table is UNKNOWN. `UNIQUE(name, version)` means the first seed run wins | WD-IMPL-FACT-0280, WD-IMPL-FACT-0354 (R1b C17), WD-IMPL-DEAD-0113 |
| Stage status | Four representations: `scenes.stage_locks` JSON (`sceneStageLocks.ts`), `stage_states` rows with `status` and `origin` (`stageStates.ts`), `scenes.shot_list_locked_at` and `scenes.status` (migration 014 trigger), and the frontend `useStageState` hook with `ProjectView` `setStages` | DUPLICATED, LEGACY | Stage 7 lock is written to two of these (`sceneStageLocks.ts:116-118`) | WD-IMPL-FACT-0281, WD-IMPL-FACT-0282 |
| Style capsule CRUD | `backend/src/services/styleCapsuleService.ts` (ten methods, no callers) and `backend/src/routes/styleCapsules.ts` (inline CRUD) | DUPLICATED | Route copy is the live one | WD-IMPL-DEAD-0090 |
| Attempt caps and check-then-delete | 8 for scene assets, 4 for project assets, 8 for text versions. Enforcement is check then delete | DUPLICATED, PARTIAL | Three caps for one pattern | WD-IMPL-FACT-0152 |
| Table pairs with overlapping definitions | `frame_links` (migrations `034_frame_links.sql` and `035_frame_links_reference.sql`); `project_asset_generation_attempts` (`023`, and `projectAssetAttemptsService.ts`); `scene_asset_instances` (`015`, `017`) | DUPLICATED (ledger status) | Two migrations or two services define the same object. Each pair is labelled DUPLICATED in its ledger entry | WD-IMPL-TABLE-0045, WD-IMPL-TABLE-0038, WD-IMPL-TABLE-0048 |
| Migration numbering | Two `022_*` files and two `024_*` files (section 8) | LEGACY, deterministic | Sort is plain string order (R1a C08) | WD-IMPL-FACT-0291 |

## 10. TODO, FIXME and deprecated marker inventory

Counts over `src`, `backend/src`, `backend/scripts` and `backend/migrations`, tests excluded. FIXME, HACK and XXX: 0 lines (grep, this pass). TODO: 9 lines. `@deprecated`: 9 lines. Both counts were reproduced by grep in this pass. K also reports 22 legacy-word lines (8 are data values or error text) and 4 backward-compat lines, and lists 49 raw grep lines, of which 35 are real markers (K section 4).

### 10.1 TODO (9 lines)

| Path:line | Text | Status | Ids |
|---|---|---|---|
| `src/App.tsx:60` and `:61` | "TODO: Implement new project creation modal/flow", and a `console.log` containing "TODO" | DEAD, PLACEHOLDER | WD-IMPL-DEAD-0005, WD-IMPL-DEAD-0077 |
| `src/components/pipeline/Stage3BeatSheet.tsx:540` | "TODO: Get from project config" for `targetLengthMin: 180` (hardcoded) | PARTIAL | K section 4 |
| `src/lib/services/imageService.ts:220` | "TODO: Implement inpainting functionality" | DEAD (file is orphaned) | WD-IMPL-DEAD-0016 |
| `backend/src/routes/styleCapsules.ts:474` | "TODO: Optionally delete the actual file from storage" | PARTIAL | WD-IMPL-FACT-0174 |
| `backend/src/services/sceneDependencyExtraction.ts:85` | "caching not yet implemented" | LEGACY | WD-IMPL-AI-0023 |
| `backend/src/services/image-generation/ImageGenerationService.ts:100` | "Integrate Rembg or specialized background removal API here" (buffer returned unchanged) | PARTIAL, placeholder | WD-IMPL-DEAD-0051 |
| `backend/src/services/image-generation/NanoBananaClient.ts:185` | "Implement proper image upload for inpainting" | DEAD (inpaint unused) | WD-IMPL-DEAD-0043 |
| `backend/src/routes/projectAssets.ts:128` | "Add metadata column to project_assets table in future migration" | CONTRADICTED (column still absent) | WD-IMPL-DEAD-0015, WD-IMPL-DEAD-0111 |

### 10.2 `@deprecated` (9 lines)

| Path:line | Replacement named in the comment | Status | Ids |
|---|---|---|---|
| `src/lib/services/projectAssetService.ts:14` | `MergeAssetsRequest` from `@/types/asset` | LEGACY | K section 4 |
| `src/lib/services/projectAssetService.ts:101` | `extractPreview()` and `extractConfirm()` (`extractAssets`, DEAD) | LEGACY, DEAD | WD-IMPL-DEAD-0018 |
| `src/lib/utils/screenplay-converter.ts:244` | `tiptapJsonToPlainText` (`tiptapToPlainText`, DEAD) | LEGACY, DEAD | WD-IMPL-DEAD-0082 |
| `src/lib/utils/screenplay-converter.ts:292` | `parseScriptToTiptapJson` (`plainTextToTiptap`, DEAD) | LEGACY, DEAD | WD-IMPL-DEAD-0082 |
| `backend/src/services/sceneDependencyExtraction.ts:4` | Deterministic `extractManifest()` | LEGACY | WD-IMPL-AI-0023 |
| `backend/src/services/sceneDependencyExtraction.ts:31` | `extractManifest()` in `backend/src/utils/scriptManifest.ts` | LEGACY | WD-IMPL-AI-0023 |
| `backend/src/services/sceneDependencyExtraction.ts:35` | `extractManifest()` from `tiptapDoc` | LEGACY | WD-IMPL-AI-0023 |
| `backend/src/services/assetExtractionService.ts:100` | `aggregatePreview()` and `extractSelectedAssets()` | LEGACY | WD-IMPL-ROUTE-0031 |
| `backend/src/services/assetExtractionService.ts:362` | "no longer used" (`extractEntityMentions`, DEAD) | LEGACY, DEAD | WD-IMPL-DEAD-0015, WD-IMPL-DEAD-0042 |

### 10.3 Other legacy and compatibility markers (K section 4, non-TODO)

| Path:line | Marker | Status |
|---|---|---|
| `src/types/scene.ts:99` | "Legacy shape" on `SceneAsset` | LEGACY, DEAD |
| `src/components/pipeline/Stage7ShotList.tsx:813` | "backward compat" old-system unlock | LEGACY, PARTIAL |
| `backend/src/routes/projects.ts:1338, :1340` | Legacy LLM extraction fallback | LEGACY, reachable |
| `backend/src/routes/projects.ts:3825, :3828` | Legacy all-assets-per-shot behavior | LEGACY, reachable |
| `backend/src/routes/sceneStageLocks.ts:116, :256, :350` | Backward-compat stage-7 `shot_list_locked_at` writes | LEGACY, PERSISTED |
| `backend/src/routes/projectAssets.ts:112` | `masterScript` parameter deprecated but kept | LEGACY |
| `backend/src/services/sceneDependencyExtraction.ts:6, :36, :46` | Legacy fallback, console warning "Legacy LLM path invoked" | LEGACY |
| `backend/src/services/frameGenerationService.ts:465` | Legacy suffix fallback | LEGACY, reachable |
| `backend/src/services/promptGenerationService.ts:914, :929` | Legacy single-manifest path | LEGACY, reachable |
| `backend/src/services/image-generation/NanoBananaClient.ts:89` | "Legacy (no roles)" reference branch | LEGACY, reachable |
| `backend/src/routes/styleCapsules.ts` (TODO at `:474`, section 10.1) | Storage delete not implemented | PARTIAL |
| `backend/src/routes/llm.ts:233` | "backward compatibility" manual style capsule injection | LEGACY, reachable |
| `src/lib/services/scriptService.ts:608` | "legacy fallback" slug | LEGACY |
| `src/lib/utils/screenplay-converter.ts:240` and `:332` | "Legacy functions (kept for backward compatibility)"; legacy scripts with `<center>` tags | LEGACY |
| `src/components/NavLink.tsx:5, :11` | "Compat" wrapper type name (shadcn scaffold, unused) | LEGACY, ORPHANED |
| `backend/src/services/streamlineExtractionService.ts:48, :56` and `src/components/pipeline/streamline/StreamlineDropZone.tsx:75` | Legacy `.doc` rejection message | Behavioral text, not code legacy |

Non-markers in the same grep (K section 4): `contextManager.ts:323` "compatible with", `promptGenerationService.ts:827, :830`, `Stage4MasterScript.tsx:123` "Keep default paragraph for compatibility", and five `legacy_backfill` data values.

## 11. Commented-out code

| Path:line | Content | Status | Proof |
|---|---|---|---|
| `backend/src/routes/projectAssets.ts:128-135` | Eight-line commented-out `metadata` object inside the `project_assets` insert, under a TODO (`:128`) | DEAD (commented block, below K's threshold) | Read at this pass. Related WD-IMPL-DEAD-0015, WD-IMPL-DEAD-0111 |
| `src/pages/StyleCapsuleLibrary.tsx:2` and `:31` | Single-line commented-out code | DEAD | K section 2.7 |
| `backend/src/routes/projects.ts:2982` | Single-line commented-out code | DEAD | K section 2.7 |
| `backend/src/services/llm-client.ts:152` | Single-line commented-out code | DEAD | K section 2.7 |

K counts zero `//` blocks of ten or more lines and zero non-JSDoc `/* */` blocks of five or more lines (WD-IMPL-FACT-0272). `src/lib/utils/streamlineRouting.ts:184` is prose, not code. K also counts 25 JSDoc or header blocks of ten or more lines (for example `src/components/pipeline/ContentAccessCarousel.tsx:1-10` and `backend/src/services/assetInheritanceService.ts:26-44`). These are documentation and are not dead code.

## 12. Feature flags, environment gates and browser-storage switches

| Switch | Location | Effect | Status | Ids |
|---|---|---|---|---|
| `VIDEO_PROVIDER` | `backend/src/services/video-generation/createVideoProvider.ts:18` (`process.env.VIDEO_PROVIDER \|\| 'mock'`) | `'veo3'` selects Veo3Provider. Anything else selects the mock. Cached for the process lifetime. Absent from `backend/env.example` and `backend/.env` (name-only check; `.env` is untracked and ignored, `.gitignore:48`) | MOCK-ONLY default in the repo environment | WD-IMPL-PROV-0012, WD-IMPL-PROV-0019, WD-IMPL-PROV-0028, WD-IMPL-FACT-0139 |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS` | Veo3Provider only | Required by the Veo path. Absent from env templates | PARTIAL (env-gated) | WD-IMPL-PROV-0013, WD-IMPL-FACT-0139 |
| `LANGSMITH_API_KEY` and `LANGSMITH_TRACING === 'true'` | `backend/src/services/llm-client.ts:151-161` | Requests LangChain callbacks. The LangSmith client is constructed unconditionally at `:82-84` | PARTIAL (explicit path fails, see section 7) | WD-IMPL-PROV-0011, WD-IMPL-FACT-0353 |
| `GOOGLE_AI_API_KEY` | `backend/src/services/image-generation/NanoBananaClient.ts:22-23` throws if unset or `'placeholder'`. Also `backend/src/services/imageAnalysisService.ts:24-30` | Constructed at module scope in `backend/src/routes/images.ts:6`, `backend/src/routes/assets.ts:8` and `backend/src/routes/projectAssets.ts:20`, which `server.ts:13-15` imports. See the conflict below | CONTRADICTED between reports, UNKNOWN at runtime | WD-IMPL-FACT-0198 |
| `NODE_ENV` | `backend/src/middleware/errorHandler.ts:18, :26` (stack only when `development`); `backend/src/server.ts` end (`app.listen` only when not `test`) | Stack traces and test-mode startup | LIVE gate | K section 6 |
| CORS allowlist | `backend/src/server.ts:34-39`. Production origin is the literal `https://your-frontend-domain.com`. Non-production allows `localhost:5173` and `localhost:3000` | Placeholder origin in production configuration | PARTIAL | V1 (CORS note), WD-IMPL-FACT-0285 |
| `llm-client` required-env check | `backend/src/services/llm-client.ts:95` (`process.env[key]`) | Startup or first-call check | LIVE | K section 6 |
| Unused provider keys | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_VEO3_API_KEY`, `NANO_BANANA_API_KEY`, `DATABASE_URL`: 0 code references in `backend/src`, `backend/scripts`, `src`. Root `.env.example` also lists PERPLEXITY, MISTRAL, XAI, GROQ, OPENROUTER, AZURE, OLLAMA and GITHUB, which no code reads | DEAD-CONFIG | WD-IMPL-DEAD-0052, WD-IMPL-DEAD-0112, WD-IMPL-PROV-0021 |
| Backend `SUPABASE_ANON_KEY` | Declared; unused | DEAD-CONFIG | V1 (backend shell notes) |
| `localStorage` `skipContinuityBreakConfirm` | Read at `src/components/pipeline/FramePanel.tsx:424`. Set to `'true'` at `FramePanel.tsx:967` | LIVE, user-set bypass | K section 6 (read only). The write at `:967` is added in the corrections section at the end |
| `localStorage` prompt-once key | `src/components/pipeline/Stage8VisualDefinition.tsx:376` | LIVE | K section 6 |
| `localStorage` `landing-theme` | `src/pages/Landing.tsx:98` | LIVE | K section 6 |
| `localStorage` stage keys | `project_*` stage, sceneId and `reachedPhaseB` keys | LIVE, not cleared on sign-out | WD-IMPL-STATE-0019, WD-IMPL-CAP-0004 |
| Other `localStorage` use | 22 lines outside tests | LIVE | Grep, this pass |
| Streamline feature flag | None | No flag. Behavioral gates only (`projectId !== 'new'`, `projectConfigReady`, no open questions) | Not gated | WD-IMPL-FACT-0052 |
| Constant-boolean gates | None found in non-test `src`, `backend/src`, `backend/scripts` | None | K section 6 |  |
| UI-only gates | Phase B scene stages, deferred scenes, and Phase A stages without `stage_states` rows | Gated in UI only and bypassable by URL | UI-only | WD-IMPL-CAP-0036, WD-IMPL-INVALIDATE-0012, V1 section 10 |

Conflict on `GOOGLE_AI_API_KEY`. E (WD-IMPL-FACT-0198) states that every route which instantiates the image service fails with HTTP 500 when the key is absent. I (WD-IMPL-FACT-0198, correction) states that module-scope construction turns a missing key into a boot failure. The repository supports I for the three routers named above. `routes/projectAssets.ts:20` constructs `ImageGenerationService` at module scope, and `ImageGenerationService`'s constructor constructs `NanoBananaClient` (`ImageGenerationService.ts:68-70`). `server.ts:13-15` imports the three routers, so the throw happens while `server.ts` is loaded. This is static evidence. Startup behavior is UNKNOWN until the server is started without the key.

## 13. Scratch files and directories at the repository root

Source: K section 8, with the git tracking status re-run in this pass (`git ls-files` and `.gitignore`). None of these paths is referenced by code, scripts, `package.json`, or `playwright.config.ts` (`testDir: './e2e'`).

| Path | Files | Tracked in git | Ignored by `.gitignore` | Status |
|---|---|---|---|---|
| `tmp/` | 1 (`test-upload.png`) | 1 | No | ORPHANED, tracked |
| `tmp-pw/` | 44 (png) | 44 | No | ORPHANED, tracked |
| `test-examples/` | 17 (images) | 17 | No | ORPHANED, tracked |
| `ui-images/` | 82 | 82 | Yes (`.gitignore:75`, `ui-images/`) | ORPHANED, ignored but tracked |
| `test-results/` | 1 (`.last-run.json`) | 1 | No | ORPHANED, tracked |
| `.playwright-mcp/` | 1 (png) | 1 | Yes (`.gitignore:79`) | ORPHANED, ignored but tracked |
| `backend/quickies-sql/Storage-RLS-policies.sql`, `asset-images-RLS-polices.sql` | 2 | Yes | No | ORPHANED, no references |
| `backend/quickies-sql/add_stage_locks.sql` | 1 | Yes | No | LEGACY, not orphaned: the only DDL for `scenes.stage_locks` (section 4) |
| `backend/test-connection.js` | 1 | Yes | No | ORPHANED |
| `backend/storage-rls-error-work-around.md` | 1 | Yes | No | ORPHANED. Its premise is not supported by code (WD-IMPL-FACT-0166, CONTRADICTED) |
| `backend/scripts/{backfill-shot-locations, seed-style-capsules, seed-templates, setup-storage-buckets, test-style-capsule-influence, update-templates-style-capsule}.ts` | 6 | Yes | No | ORPHANED (manual, no `package.json` entry, no import) |
| `backend/scripts/{run-migrations, setup-asset-images-bucket}.ts` | 2 | Yes | No | Wired: `package.json` `migrate` and `setup:bucket` |
| `.env.local`, `backend/.env` | 2 | No | Yes (`.gitignore:37, :48`) | Local files, not tracked |

Correction to K. K lists `backend/quickies-sql/*.sql` as ORPHANED as a group. `add_stage_locks.sql` is the only DDL for a column that six handlers query (section 4), so it is LEGACY and load-bearing, not orphaned. Only the two RLS files are orphaned.

Naming note. `backend/scripts/test-style-capsule-influence.ts:298` builds a file name `test-results-${Date.now()}.json`. It is unrelated to the root `test-results/` directory (K section 8).

## 14. Dead tables, columns and storage objects

No table is wholly dead. The items below are objects that are written and never read, read and never written, or referenced but not defined. Table and column definitions come from the migrations named in each row. Live database state is UNKNOWN for every row, because the repository has no database access in this analysis.

| Object (definition) | Writer (path:line) | Reader | Status | Ids |
|---|---|---|---|---|
| `stage_states.prompt_template_version`, `final_prompt` (`backend/migrations/001_initial_schema.sql:67-68`) | None. The only writer code is the dead `DatabaseService` method set (section 5) | None | DEAD, never written | WD-IMPL-DEAD-0046, WD-IMPL-DEAD-0103, WD-IMPL-TABLE-0062 |
| `stage_states.langsmith_trace_id` (`002_add_langsmith_fields.sql:5-9`) | None. The stage-state insert payload has no trace column (`backend/src/routes/stageStates.ts:225-236`) | None | DEAD, never written | WD-IMPL-DEAD-0046, WD-IMPL-DEAD-0103, WD-IMPL-FACT-0353 |
| `projects.writing_style_capsule_id`, `projects.visual_style_capsule_id` (`004_style_capsule_system.sql:60-63`) | No code writer (R1a C02: insert, update and raw SQL checked; migration 004 only) | Five conditional sites (`contextManager.ts:498-499`, `frames.ts:569`, `frames.ts:2216`, `projects.ts:3740`) and three select lists (`frames.ts:527`, `frames.ts:2156`, `projects.ts:3584`) | DEAD-READ. Writer UNKNOWN if set by a SQL default, RPC or manual edit | WD-IMPL-DEAD-0102, WD-IMPL-FACT-0339 |
| `shots.transformation_flags` (`030_transformation_events.sql:135`) | `backend/src/routes/projects.ts:1928` (Stage 7 extraction only) | None. Returned by GET shots through `select('*')` | DEAD, write-only | WD-IMPL-DEAD-0029, WD-IMPL-DEAD-0101, WD-IMPL-FACT-0355 |
| `location_match_events` (`039_shot_location_identity.sql:84-157`) | `backend/src/services/locationResolverService.ts:485` | None (`grep -rn location_match_events` finds no select) | DEAD, write-only | WD-IMPL-DEAD-0026, WD-IMPL-DEAD-0100, WD-IMPL-TABLE-0041 |
| `style_capsule_applications` (`004_style_capsule_system.sql:51-58`) | Stage state PUT (`stageStates.ts:259-281`), failure ignored. The service method that would set `applied_at` is never called | None | DEAD, PARTIAL | WD-IMPL-TABLE-0035, WD-IMPL-TABLE-0004 |
| `intake_resolution_edits` (`043_intake_resolutions.sql:51-111`) | RPC body (`:428-447`) | Never read by TypeScript. The frontend always sends `target_type` as stage, never a stage number | DEAD, write-only | WD-IMPL-TABLE-0056 |
| `project_assets.metadata` (no migration) | None. Write is commented out at `projectAssets.ts:128-135` | UI reads it at `Stage5Assets.tsx:1241-1248`, typed at `src/types/asset.ts:39-45` | CONTRADICTED (read of a column that does not exist) | WD-IMPL-DEAD-0111, WD-IMPL-DEAD-0015 |
| `frames.status = 'invalidated'` (CHECK at `019_frames_table.sql:12-18`) | `backend/src/routes/projects.ts:3106-3110` | Not applicable | CONTRADICTED (value outside the CHECK) | WD-IMPL-FACT-0284 |
| `scenes.stage_locks` (`backend/quickies-sql/add_stage_locks.sql:1` only) | Lock, unlock and relock handlers | Six handlers | LEGACY, outside the migration chain. Live presence UNKNOWN | WD-IMPL-FACT-0143, WD-IMPL-FACT-0300 |
| `scenes.shot_list_locked_at` (`014_add_shot_list_locking_with_trigger.sql`) | `sceneStageLocks.ts:116-118, :256-258, :350-352`; `projects.ts:2975, :3155` | `projects.ts:2888, :3051`; trigger 014 | LEGACY, PERSISTED | WD-IMPL-FACT-0281, K section 3.4 |
| `videos` (table, no DDL) | `projects.ts:3115-3116` (update, result ignored) | `projects.ts:3078-3079`, `sceneStageLocks.ts:215` | UNKNOWN in live DB, LEGACY in code. Storage bucket `videos` is a different object | WD-IMPL-TABLE-0005, WD-IMPL-TABLE-0028, WD-IMPL-TABLE-0057 |
| `invalidation_logs` (table, no DDL) | `projects.ts:3123` (in `try/catch`) | None | UNKNOWN in live DB, LEGACY in code | WD-IMPL-TABLE-0006, WD-IMPL-TABLE-0058 |
| `stage_states.project_id`, `stage_states.state_data` (not in schema) | Not written | Five select sites in `frames.ts` (`:262-264`, `:385-390`, `:449-454`, `:767-772`, `:845-850`) | CONTRADICTED. Queried, never defined | WD-IMPL-FACT-0338 |
| `end_frame_thumbnail` (not in schema) | Not written | Prior-scene query behind the Stage 11 banner | CONTRADICTED. Queried, never defined | WD-IMPL-CAP-0269 |
| `users`, `hello` (names, no DDL) | Not applicable | Text references in `backend/scripts/test-style-capsule-influence.ts:104` and a test | ORPHANED text references | WD-IMPL-TABLE-0059, WD-IMPL-TABLE-0060 |
| `prompt_templates` | Seed routes (`routes/seed.ts`, `scripts/seed-templates.ts`) and `llm.ts` template CRUD | `generate-from-template` (live for stages 2 to 4) | PARTIAL, live for stages 2 to 4 only | WD-IMPL-DEAD-0034, E section 1 (Stage 2-4 template path PARTIAL) |

Frontend type fields with no writer or no reader (declared, not persisted). These do not have their own tables but they carry data that is either dead or unpopulated.

| Field (path:line) | Status | Ids |
|---|---|---|
| `Shot.transformationFlags` (`src/types/scene.ts:73`) | DEAD, never populated | WD-IMPL-DEAD-0029 |
| `PromptSet.systemPrompt` (`scene.ts:291`) | DEAD, no writer | WD-IMPL-DEAD-0035, WD-IMPL-DEAD-0117 |
| `PromptSet.transformationContext` (`scene.ts:308`) | DEAD, no writer | WD-IMPL-DEAD-0033, WD-IMPL-DEAD-0116 |
| `framePromptSnapshot` (`scene.ts:488`) | DEAD-READ | WD-IMPL-DEAD-0040, WD-IMPL-DEAD-0095 |
| `priorSceneEndFrameUrl` (`scene.ts:442`) | DEAD, no reader | WD-IMPL-DEAD-0079 |
| `ProjectSettings` (`src/types/project.ts:80`) | DEAD, 0 references | WD-IMPL-DEAD-0080 |
| Continuity preview fields `framePromptInstructions`, `continuityPromptInstructions`, `providerReadyReferences`, `debugMetadata` (`src/types/locationContinuity.ts:198-215`) | DEAD, no frontend reader | WD-IMPL-DEAD-0025, WD-IMPL-DEAD-0099 |
| `continuity_frame_prompt` (`shots`) | PARTIAL, read by UI, not by generation | WD-IMPL-DEAD-0024, WD-IMPL-STATE-0061 |

Storage objects written and not removed or not read.

| Object | Status | Ids |
|---|---|---|
| Staged streamline images under `project/{id}/streamline-staging/` (`backend/src/routes/streamline.ts:277`) | ORPHANED, no `.remove` in the file (grep 0). Objects accumulate | WD-IMPL-DEAD-0014, WD-IMPL-DEAD-0110, WD-IMPL-STATE-0032 |
| Storage objects removed by cascade or asset delete | Not deleted when the row is removed | WD-IMPL-FACT-0174 |
| Stage 9 retry delete on bucket `frames` while uploads go to `asset-images` | Mismatched bucket; delete targets the wrong bucket | WD-IMPL-CAP-0259 |
| Veo output bucket `videos` (`Veo3Provider.ts:338, :354`) | No creation script (`scripts/setup-storage-buckets.ts` creates other buckets) | WD-IMPL-PROV-0013 |

## 15. MOCK-ONLY paths

A path is MOCK-ONLY when the code that a user or request reaches returns a fixed value, a stub, or a toast in place of the feature. Test doubles are listed separately at the end of this section.

| Path (path:line) | What it does | Where it is reached | Status | Ids |
|---|---|---|---|---|
| `backend/src/services/video-generation/MockVideoProvider.ts` (`:10, :31`) | Returns the same public sample clip (`https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`) for every job. Sleeps 3 to 8 s (`:19-20`). Throws a simulated failure on 5% of calls (`:23-25`). Ignores start and end frames and aspect ratio. `storagePath` is `mock/<id>.mp4`, and nothing is stored | Default provider when `VIDEO_PROVIDER` is unset (`createVideoProvider.ts:18`). Stage 12 output in the repo environment | MOCK-ONLY, default | WD-IMPL-AI-0067, WD-IMPL-PROV-0014, WD-IMPL-PROV-0019, WD-IMPL-PROV-0028 |
| `src/pages/Landing.tsx:13-43, :93-536` and `src/components/landing/MediaSlot.tsx:35-90` | Static marketing page. Every `MediaSlot` has no `src`. Its copy claims OpenAI and Anthropic support (`:32`), which no code implements | Public route `/` | MOCK-ONLY (placeholder media) | WD-IMPL-CAP-0007, WD-IMPL-PROV-0021 |
| `src/pages/Landing.tsx:337-343` "Explore Stage" buttons | No handler beyond navigation to `/auth` | Landing | MOCK-ONLY (inert) | WD-IMPL-CAP-0050 |
| `src/pages/ProjectView.tsx:773-775, :857-859, :879-881` and `src/components/pipeline/ProjectHeader.tsx:58-88` | "Artifact Vault", "Story Timelines" and "New Branch" buttons show "coming soon" toasts. Branch creation is absent in the backend, so only the trigger-made Main branch exists | Every project layout | MOCK-ONLY (toast stubs) | WD-IMPL-CAP-0020, WD-IMPL-FACT-0016 |
| `src/pages/Dashboard.tsx:93-98` | "Filter" and "Sort" icon buttons with no handlers | Dashboard | MOCK-ONLY (inert) | WD-IMPL-CAP-0011 |
| `src/components/pipeline/Stage12/ExportSection.tsx:L10-44`, `ShotListPanel.tsx:L199-205` | Four permanently disabled "Soon" buttons: Download MP4, YouTube, Google Drive, CapCut. No handler, service or route | Stage 12 | MOCK-ONLY (disabled) | WD-IMPL-CAP-0281 |
| `src/components/pipeline/Stage2Treatment.tsx:36` `mockTreatments` | Unused mock data | None | DEAD, leftover mock | WD-IMPL-DEAD-0048, WD-IMPL-DEAD-0075, WD-IMPL-FACT-0197 |
| `src/lib/services/imageService.ts:213` stub `inpaintImage` | Stub inside an orphaned file | None | MOCK-ONLY stub, DEAD | WD-IMPL-DEAD-0016 |
| `backend/src/services/image-generation/NanoBananaClient.ts:171` `inpaintImage` and `ImageGenerationService.ts:96-103` background step | Inpaint method has no caller. Background step returns the buffer unchanged | Background step runs on every completion for listed asset types | PARTIAL placeholder (background) and DEAD (inpaint) | WD-IMPL-PROV-0008, WD-IMPL-DEAD-0043, WD-IMPL-DEAD-0051, WD-IMPL-DEAD-0093 |
| `backend/src/services/video-generation/Veo3Provider.ts` | Full client, reached only through `VIDEO_PROVIDER=veo3` and credentials. Exercised by the manual script `src/tests/veo3-test.ts`, which jest does not match | Not reached by default | PARTIAL, not MOCK-ONLY (listed for contrast) | WD-IMPL-PROV-0013 |

Test doubles. These do not run in production, but they decide what the test suite proves.

| Test area | What is mocked | Status | Ids |
|---|---|---|---|
| Text LLM | `jest.mock('../services/llm-client.js')` in seven streamline and transformation test files. Tests check parsing and fallbacks, not model output | MOCK-ONLY-IN-TESTS | WD-IMPL-TEST-0049, E section 8 (E-TEST-03) |
| Vision | `streamlineClassifyImage.test.ts` mocks vision. Real vision is not exercised | MOCK-ONLY-IN-TESTS | WD-IMPL-TEST-0075 |
| Asset description merger | Mocked in `assetTypeAndMerge.test.ts` | MOCK-ONLY-IN-TESTS | WD-IMPL-TEST-0051 |
| Supabase | Route tests mock the client: `assetTypeAndMerge`, `continuityBaseAndModeRoutes`, `referenceContinuity`, `shotAssetAssignment`, `shotLocationRoutes`, `streamlineCommit`, `streamlineSkip` | MOCK-ONLY-PARTIAL | WD-IMPL-TEST-0037, WD-IMPL-TEST-0051, WD-IMPL-TEST-0053, WD-IMPL-TEST-0065, WD-IMPL-TEST-0066, WD-IMPL-TEST-0076, WD-IMPL-TEST-0082 |
| Stage 9 frontend | Partial coverage with mocked services | MOCK-ONLY-PARTIAL | WD-IMPL-TEST-0038 |
| Real calls not mocked | `llm-integration.test.ts` calls real Gemini, LangSmith and Supabase and is not gated by environment. `image-generation.test.ts` calls the real service with no mocks | Not MOCK-ONLY | WD-IMPL-FACT-0205, WD-IMPL-TEST-0060 (LIVE integration suite, not run), E section 8 |

## 16. Contradictions and unknowns

Genuine contradictions are preserved. Each row states which evidence the repository favors and the confidence.

| Topic | Conflict | Evidence favored | Confidence | Ids |
|---|---|---|---|---|
| Stage 7 relock path | V8 says no producer of `outdated` exists for Stage 7 and the relock path cannot be reached. K reported a contradiction on the strength of the cascade loop at `sceneStageLocks.ts:245-249`. A lead re-check shows the loop never includes Stage 7, because the unlock guard admits only stages 7 to 12 (`:151-153`) and the loop starts above the unlocked stage. Every other `outdated` writer starts at stage 8 or 9 | V8 (code re-read in this pass) | High | WD-IMPL-DEAD-0031, WD-IMPL-FACT-0193 (lead correction; K contradiction withdrawn) |
| Continuity-preview frame prompt | Ledger label for `continuity_frame_prompt` is DEAD-READ and CONTRADICTED. K labels it PARTIAL. The row is read back into API responses and Stage 10 UI state, but generation never reads it | K, and this document uses PARTIAL | High that generation does not read it. Medium on the label | WD-IMPL-DEAD-0024, WD-IMPL-STATE-0061 |
| `ProjectStatus` type | DEAD-0004 lists "unused shell members" and K labels the entry CORRECTED. The ledger entry carries no `correction` field. `ProjectStatus` is referenced at `src/types/project.ts:61` | K | High | WD-IMPL-DEAD-0004, WD-IMPL-FACT-0265 |
| Story-context beat keys | V6 says treatment and beat keys do not match. R1a says beats match and only treatment keys do | R1a (beat keys saved as `beats` with `order` and `text`, `Stage3BeatSheet.tsx:348-351`) | High | WD-IMPL-FACT-0075 (CONTRADICTED), WD-IMPL-FACT-0347 |
| Transformation flags writers | V6 says Stage 3 and Stage 7 derive flags. Stage 3 writes no flags | R1b (only Stage 7 shot extraction writes `transformation_flags`) | High | WD-IMPL-CAP-0192 (CONTRADICTED), WD-IMPL-FACT-0355 |
| Image client failure mode | E says each route that instantiates the image service returns HTTP 500 when `GOOGLE_AI_API_KEY` is absent. I says module-scope construction makes it a boot failure. The three routers construct at module scope and `server.ts` imports them | I (static reading of the import graph) | Medium. Startup behavior not executed | WD-IMPL-FACT-0198 (CONTRADICTED by I) |
| Phase A unlock and Stage 1 to 5 warning | R1a states it did not check whether Stage 1 to 5 locked components show their own warning before calling `onUnlock` | UNKNOWN (not traced) | Low | WD-IMPL-FACT-0340 (R1a C03, open point) |
| `videos` and `invalidation_logs` existence | V1, V10 and C state non-existence as fact. R1a finds no repo DDL and states that live absence is not provable here | R1a (repo DDL only) | High for repo DDL. UNKNOWN for live DB | WD-IMPL-TABLE-0028 (labelled CONTRADICTED and DEAD), WD-IMPL-TABLE-0005 (UNKNOWN), WD-IMPL-FACT-0283 |
| Dead-table verdict on `frames.status` | Write at `projects.ts:3106-3110` against the CHECK at `019_frames_table.sql:12-18` | CHECK constraint (no migration alters it) | High if the constraint is live. The write result is not checked | WD-IMPL-FACT-0284 |
| LangSmith tracing | E says PARTIAL (env tracer possibly active). R1b says the env tracer is UNKNOWN. Both agree the explicit path never attaches | Both agree on the explicit path | High on explicit path. UNKNOWN on env tracer | WD-IMPL-PROV-0020, WD-IMPL-FACT-0353 |
| Seed template copy in the live database | Two copies diverge. Which copy is live depends on which seed ran first | UNKNOWN (table contents not in repo) | Low | WD-IMPL-FACT-0280 |
| Script-confidence detector | Backend header says "server-side mirror", rules differ | Code | High that rules differ. Not executed | WD-IMPL-FACT-0275 |
| Streamline classifier comment | `streamlineService.ts:25` says the classifier is a stub. The route calls the real classifier | Code | High | WD-IMPL-FACT-0290 |
| Stage 4 deleted-scene promise | UI says deleted scenes will be marked continuity_broken. No writer exists | Code | High | WD-IMPL-FACT-0352 |
| Text field versions intent vs SQL | Migration comment says authenticated only. Policy has no `TO` clause | SQL | High | WD-IMPL-FACT-0359 |
| Location classifier thresholds | Route 0.72 with `ambiguous`. Composition 0.8 without `ambiguous` | Code (both live) | High | WD-IMPL-FACT-0344 |
| DELETE shot-assignments/all | Code predicts HTTP 500 at `shotAssignments.ts:213-215`. The result is UNKNOWN until one request runs against a dev database | Code prediction | Medium | WD-IMPL-DEAD-0106 |
| Migration 005 Step 4 | `UNIQUE ... WHERE` is not valid as a table constraint in PostgreSQL. Whether 005 applied is UNKNOWN | Grammar (static) | Medium | WD-IMPL-FACT-0345 |
| Frame pipeline unknown | Whether Gemini returns 16:9 or 9:16 output for requested dimensions | UNKNOWN (runtime) | Low | WD-IMPL-FACT-0349 |
| K count of unreachable frontend files | K's total of 31 is not reproduced by its own list (section 1) | Rows in section 1 (30) | Medium | WD-IMPL-FACT-0266 |
| Frontend 161 `supabase.` references | All `supabase.auth`. Frontend has no table access | K grep | High | WD-IMPL-FACT-0288 |

Unknowns that only runtime or a live database can settle.

- Live presence of `scenes.stage_locks`, `videos`, `invalidation_logs`, the `exec` RPC, and `style_capsules_user_name_unique`, and whether migration 005 applied. Settled by a read-only schema dump, not run here.
- PostgREST and PostgreSQL error text for an unknown `stage_states` column, for `'all'` on a UUID column, and for the `audio-visual` CHECK violation. Settled by an executed request against a disposable database.
- Whether `projects.writing_style_capsule_id` or `visual_style_capsule_id` is set by an SQL default, an RPC, or a manual edit.
- Which seed copy of the stage 2 to 4 templates is in the live `prompt_templates` table.
- Deployed grants and policies on `text_field_versions` beyond the migration.
- Whether `LANGSMITH_TRACING` is `'true'` in any deployed environment, and what LangChain's own env tracer records.
- Whether the stored stage 7 composition `locationState` is consumed beyond the Stage 10 preview (R1a open point).
- Whether dynamic property access reaches any method that the grep cannot see. Static zero-reference counts are proofs only of static references (K section 10).
- Rendering of a stuck `generating` frame in Stage 10 (runtime only).

## Appendix A. Index of the 117 DEAD ledger entries

Columns: id (full ledger id), short title (from the ledger, truncated), primary section in this document, and the related ledger ids. Entries that duplicate another entry appear under their own id and are linked to the partner in the related column.

| Ledger id | Title (ledger, truncated) | Primary section | Related ledger ids |
|---|---|---|---|
| WD-IMPL-DEAD-0001 | Unused backend DatabaseService trace methods | §5 | - |
| WD-IMPL-DEAD-0002 | src/pages/Index.tsx | §1 | WD-IMPL-FACT-0011 |
| WD-IMPL-DEAD-0003 | stageStateService.skipStage wrapper | §2 | WD-IMPL-STATE-0003 |
| WD-IMPL-DEAD-0004 | useDebouncedCallback and unused shell members | §1 | - |
| WD-IMPL-DEAD-0005 | App handleNewProject and Dashboard onNewProject prop | §6 | WD-IMPL-FACT-0010 |
| WD-IMPL-DEAD-0006 | Dashboard card legacy stage text for skipped stages | §6 | WD-IMPL-CAP-0016 |
| WD-IMPL-DEAD-0007 | Phase A UnlockWarningDialog | §6 | WD-IMPL-CAP-0026, WD-IMPL-FACT-0005 |
| WD-IMPL-DEAD-0008 | resolveConflict four-tier authority util | §5 | WD-IMPL-CAP-0114 |
| WD-IMPL-DEAD-0009 | stageStateService.skipStage frontend method | §2 | WD-IMPL-CAP-0133 |
| WD-IMPL-DEAD-0010 | ContextManager prepareStageContext / assembleFullContext / per-stage formatters | §5 | WD-IMPL-CAP-0132 |
| WD-IMPL-DEAD-0011 | Stage 4 skip path from Streamline | §7 | WD-IMPL-CAP-0128 |
| WD-IMPL-DEAD-0012 | OUTDATED badge origin subtext | §6 | WD-IMPL-INVALIDATE-0025 |
| WD-IMPL-DEAD-0013 | Superseded RPC bodies and unused enum value | §8 | WD-IMPL-TABLE-0017 |
| WD-IMPL-DEAD-0014 | Orphaned staged image storage objects | §14 | WD-IMPL-STATE-0032 |
| WD-IMPL-DEAD-0015 | Pass 1 full-script extraction and metadata column references | §5 | WD-IMPL-AI-0034 |
| WD-IMPL-DEAD-0016 | src/lib/services/imageService.ts (whole file) | §1 | WD-IMPL-AI-0042, WD-IMPL-ROUTE-0066 |
| WD-IMPL-DEAD-0017 | ImageDescriptionModal component | §1 | - |
| WD-IMPL-DEAD-0018 | Unused client methods and routes with no UI caller | §2 | WD-IMPL-ROUTE-0031, WD-IMPL-ROUTE-0047 |
| WD-IMPL-DEAD-0019 | extra_archetype unsupported in AssetDrawer and AssetMatchModal configs | §7 | WD-IMPL-CAP-0150 |
| WD-IMPL-DEAD-0020 | Duplicated definitions and resolution logic | §9 | WD-IMPL-INVALIDATE-0028 |
| WD-IMPL-DEAD-0021 | Unreferenced detect-and-populate handler and save-description handler | §2 | WD-IMPL-FACT-0071 |
| WD-IMPL-DEAD-0022 | Unused helpers: getInheritanceChain and Stage 8 reviewStatus/sourceBadge | §2 | WD-IMPL-FACT-0071 |
| WD-IMPL-DEAD-0023 | Orphaned and dead continuity code paths | §6 | WD-IMPL-INVALIDATE-0051, WD-IMPL-ROUTE-0112 |
| WD-IMPL-DEAD-0024 | continuity_frame_prompt is never read by generation | §7 | WD-IMPL-STATE-0061 |
| WD-IMPL-DEAD-0025 | Preview-only generation package outputs | §5 | WD-IMPL-FACT-0086 |
| WD-IMPL-DEAD-0026 | Write-only and unused backend fields | §14 | WD-IMPL-TABLE-0020 |
| WD-IMPL-DEAD-0027 | Shot reorder endpoint and client have no caller | §2 | WD-IMPL-STATE-0068 |
| WD-IMPL-DEAD-0028 | Per-shot assignment list has no caller | §2 | WD-IMPL-ROUTE-0119 |
| WD-IMPL-DEAD-0029 | transformation_flags column and Shot.transformationFlags are never consumed | §14 | WD-IMPL-FACT-0100 |
| WD-IMPL-DEAD-0030 | Legacy shots/unlock invalidation branch unreachable from UI | §8 | WD-IMPL-CAP-0229, WD-IMPL-INVALIDATE-0058 |
| WD-IMPL-DEAD-0031 | Stage 7 relock path has no producer of outdated status | §6 | WD-IMPL-CAP-0230, WD-IMPL-INVALIDATE-0058 |
| WD-IMPL-DEAD-0032 | Frontend service methods without callers | §2 | WD-IMPL-FACT-0108, WD-IMPL-FACT-0109 |
| WD-IMPL-DEAD-0033 | Stage 9 transformation badges and FramePanel source badges | §6 | - |
| WD-IMPL-DEAD-0034 | prompt_templates path not used by Stage 9 or Stage 10 | §9 | WD-IMPL-FACT-0107 |
| WD-IMPL-DEAD-0035 | generateVideoPrompt framePrompt parameter and PromptSet.systemPrompt | §5 | WD-IMPL-AI-0009 |
| WD-IMPL-DEAD-0036 | IssueResolutionSection component | §1 | - |
| WD-IMPL-DEAD-0037 | Unused checkoutService helpers | §2 | - |
| WD-IMPL-DEAD-0038 | Legacy types SceneCheckout, VideoClip, SceneReview | §1 | - |
| WD-IMPL-DEAD-0039 | userCreditsService.addCredits | §5 | - |
| WD-IMPL-DEAD-0040 | VideoJobExecutor.pollIntervalMs and frame_prompt_snapshot usage | §5 | - |
| WD-IMPL-DEAD-0041 | Stage 11 LockedStageHeader "Confirm & Render" label | §6 | - |
| WD-IMPL-DEAD-0042 | Unreachable: AssetExtractionService.extractEntityMentions (LLM Pass 1 over full script) | §5 | WD-IMPL-AI-0034 |
| WD-IMPL-DEAD-0043 | Unreachable: NanoBananaClient.inpaintImage | §5 | WD-IMPL-AI-0011, WD-IMPL-FACT-0189 |
| WD-IMPL-DEAD-0044 | Orphaned: beatService.splitBeat (no UI caller) | §2 | WD-IMPL-AI-0026 |
| WD-IMPL-DEAD-0045 | Orphaned frontend module: src/lib/services/imageService.ts | §1 | WD-IMPL-AI-0085 |
| WD-IMPL-DEAD-0046 | Dead DB writers/readers for stage_states.langsmith_trace_id and prompt metadata columns | §14 | WD-IMPL-PROV-0020, WD-IMPL-TABLE-0062 |
| WD-IMPL-DEAD-0047 | Unused client members: LLMClient.langsmithClient and constructor-built ChatGoogleGenerativeAI | §5 | WD-IMPL-PROV-0016, WD-IMPL-PROV-0020 |
| WD-IMPL-DEAD-0048 | Stage 2 mockTreatments constant unused | §15 | WD-IMPL-FACT-0197 |
| WD-IMPL-DEAD-0049 | Backend LLM routes with no frontend caller (admin, cost, diagnostic) | §3 | WD-IMPL-AI-0079, WD-IMPL-FACT-0195, WD-IMPL-FACT-0196 |
| WD-IMPL-DEAD-0050 | Unused helpers in AI support modules | §5 | WD-IMPL-FACT-0181, WD-IMPL-FACT-0183 |
| WD-IMPL-DEAD-0051 | Background-removal post-processing is a no-op placeholder | §15 | WD-IMPL-AI-0081 |
| WD-IMPL-DEAD-0052 | Unused LLM-related env template keys | §12 | WD-IMPL-PROV-0021 |
| WD-IMPL-DEAD-0053 | src/pages/Index.tsx is an unreachable parallel state-router page | §1 | WD-IMPL-DEAD-0002 |
| WD-IMPL-DEAD-0054 | src/lib/services/imageService.ts (whole file) is an orphan HTTP client | §1 | WD-IMPL-DEAD-0016, WD-IMPL-DEAD-0045, WD-IMPL-DEAD-0066 |
| WD-IMPL-DEAD-0055 | ImageDescriptionModal component is never rendered | §1 | WD-IMPL-DEAD-0017 |
| WD-IMPL-DEAD-0056 | IssueResolutionSection component is never rendered; live UnsatisfiedDropdown does similar work | §1 | WD-IMPL-DEAD-0036 |
| WD-IMPL-DEAD-0057 | UseMasterAsIsCheckbox component is never rendered | §1 | - |
| WD-IMPL-DEAD-0058 | src/components/NavLink.tsx unused wrapper | §1 | - |
| WD-IMPL-DEAD-0059 | useDebouncedCallback hook and file are unused | §1 | WD-IMPL-DEAD-0004 |
| WD-IMPL-DEAD-0060 | Three TipTap extensions are never imported | §1 | - |
| WD-IMPL-DEAD-0061 | src/hooks/use-mobile.tsx unreachable | §1 | WD-IMPL-DEAD-0062 |
| WD-IMPL-DEAD-0062 | 19 shadcn/ui primitives under src/components/ui are unreachable | §1 | WD-IMPL-DEAD-0061 |
| WD-IMPL-DEAD-0063 | stageStateService.skipStage and auto-save delay accessors have zero callers | §2 | WD-IMPL-DEAD-0003, WD-IMPL-DEAD-0009 |
| WD-IMPL-DEAD-0064 | frameService approve, reject, end-frame prompt save, chain-from-end-frame, poll helpers have no UI caller | §2 | WD-IMPL-DEAD-0023, WD-IMPL-DEAD-0032 |
| WD-IMPL-DEAD-0065 | projectAssetService extractAssets, lockAsset, editImage have zero callers | §2 | WD-IMPL-DEAD-0018 |
| WD-IMPL-DEAD-0066 | beatService.splitBeat has no caller | §2 | WD-IMPL-DEAD-0044 |
| WD-IMPL-DEAD-0067 | shotService.reorderShots and PUT shots/reorder route have no UI caller | §2 | WD-IMPL-DEAD-0027 |
| WD-IMPL-DEAD-0068 | shotAssetAssignmentService.listForShot and GET shot-assignments/shots/:shotId have no caller | §2 | WD-IMPL-DEAD-0028 |
| WD-IMPL-DEAD-0069 | sceneService.getScene always throws | §2 | - |
| WD-IMPL-DEAD-0070 | sceneService.updateSceneStatus calls a route that does not exist | §4 | - |
| WD-IMPL-DEAD-0071 | styleCapsule createLibrary frontend client and POST /api/style-capsules/libraries have no UI caller | §2 | - |
| WD-IMPL-DEAD-0072 | Seven checkoutService helpers have no callers | §2 | WD-IMPL-DEAD-0037 |
| WD-IMPL-DEAD-0073 | Stage 8 unused handlers and badge helpers | §2 | WD-IMPL-DEAD-0021, WD-IMPL-DEAD-0022 |
| WD-IMPL-DEAD-0074 | Stage 10 updateContinuityMutation declared but never invoked | §2 | WD-IMPL-DEAD-0023 |
| WD-IMPL-DEAD-0075 | Stage 2 mockTreatments constant is never referenced | §15 | WD-IMPL-DEAD-0048 |
| WD-IMPL-DEAD-0076 | ProjectView unused members: navigate, isLoadingProject, getStageState, restoreStage | §1 | WD-IMPL-DEAD-0004 |
| WD-IMPL-DEAD-0077 | New-project flow is a console.log TODO; Dashboard onNewProject prop is never used | §6 | WD-IMPL-DEAD-0005 |
| WD-IMPL-DEAD-0078 | Phase A unlock warning dialog can never open; unlock proceeds without the warning | §6 | WD-IMPL-DEAD-0007 |
| WD-IMPL-DEAD-0079 | Stage 11 lock button never renders; priorSceneEndFrameUrl type field has no reader | §6 | WD-IMPL-DEAD-0041 |
| WD-IMPL-DEAD-0080 | Declaration-only frontend types and constants | §1 | WD-IMPL-DEAD-0020 |
| WD-IMPL-DEAD-0081 | Legacy frontend types SceneCheckout, VideoClip, SceneReview are referenced only by each other | §1 | WD-IMPL-DEAD-0038 |
| WD-IMPL-DEAD-0082 | screenplay-converter tiptapToPlainText and plainTextToTiptap are deprecated and unused | §1 | - |
| WD-IMPL-DEAD-0083 | DatabaseService stage-state trace methods have no callers | §5 | WD-IMPL-DEAD-0001, WD-IMPL-DEAD-0046, WD-IMPL-DEAD-0091 |
| WD-IMPL-DEAD-0084 | resolveConflict utility is test-only | §5 | WD-IMPL-DEAD-0008 |
| WD-IMPL-DEAD-0085 | ContextManager stage-context assembly methods have no production callers | §5 | WD-IMPL-DEAD-0010 |
| WD-IMPL-DEAD-0086 | AssetExtractionService.extractEntityMentions (LLM full-script pass) is never called | §5 | WD-IMPL-DEAD-0015, WD-IMPL-DEAD-0042 |
| WD-IMPL-DEAD-0087 | AssetInheritanceService.getInheritanceChain has no callers | §5 | WD-IMPL-DEAD-0022 |
| WD-IMPL-DEAD-0088 | LLMClient unused members: langsmithClient, client, setRetryConfig | §5 | WD-IMPL-DEAD-0047 |
| WD-IMPL-DEAD-0089 | Unused AI-support helpers: getTemplateVersions, estimateCostForPrompt, getUsageByModel | §5 | WD-IMPL-DEAD-0050 |
| WD-IMPL-DEAD-0090 | StyleCapsuleService: ten methods with no callers; routes implement CRUD inline | §9 | WD-IMPL-DEAD-0071 |
| WD-IMPL-DEAD-0091 | userCreditsService.addCredits has no caller and no route | §5 | WD-IMPL-DEAD-0039 |
| WD-IMPL-DEAD-0092 | Backend supabaseConfig export is never used | §5 | - |
| WD-IMPL-DEAD-0093 | Image inpainting is not implemented end-to-end | §15 | WD-IMPL-DEAD-0043 |
| WD-IMPL-DEAD-0094 | VideoJobExecutor.pollIntervalMs is declared and never read | §5 | WD-IMPL-DEAD-0040 |
| WD-IMPL-DEAD-0095 | frame_prompt_snapshot is stored on video jobs but never sent to a provider or shown | §14 | WD-IMPL-DEAD-0040 |
| WD-IMPL-DEAD-0096 | continuityComposition locationImageById parameter is accepted and never read | §5 | WD-IMPL-DEAD-0026 |
| WD-IMPL-DEAD-0097 | direction_location_mismatch coverage branch is unreachable | §6 | WD-IMPL-DEAD-0023 |
| WD-IMPL-DEAD-0098 | locationStateFromShot always returns empty candidates | §7 | WD-IMPL-DEAD-0023 |
| WD-IMPL-DEAD-0099 | Preview-only generation package fields have no consumer | §5 | WD-IMPL-DEAD-0025 |
| WD-IMPL-DEAD-0100 | location_match_events table is write-only | §14 | WD-IMPL-DEAD-0026 |
| WD-IMPL-DEAD-0101 | shots.transformation_flags is written and never read | §14 | WD-IMPL-DEAD-0029 |
| WD-IMPL-DEAD-0102 | projects.writing_style_capsule_id and visual_style_capsule_id have no writer in code | §14 | WD-IMPL-DEAD-0001 |
| WD-IMPL-DEAD-0103 | stage_states prompt_template_version, final_prompt and langsmith_trace_id are never written | §14 | WD-IMPL-DEAD-0046, WD-IMPL-DEAD-0083 |
| WD-IMPL-DEAD-0104 | Eleven /api/llm admin and template routes have no frontend caller | §3 | WD-IMPL-DEAD-0049 |
| WD-IMPL-DEAD-0105 | Route group with no live frontend caller: frames approve/reject/status/end-frame/chain, checkout status, stage | §3 | WD-IMPL-DEAD-0064, WD-IMPL-DEAD-0065, WD-IMPL-DEAD-0066, WD-IMPL-DEAD-0067, WD-IMPL-DEAD-0068, WD-IMPL-DEAD-0071, WD-IMPL-DEAD-0072 |
| WD-IMPL-DEAD-0106 | DELETE shot-assignments/all is shadowed by DELETE shot-assignments/:assignmentId; UI bulk-clear hits the wrong | §4 | WD-IMPL-DEAD-0028 |
| WD-IMPL-DEAD-0107 | POST /shots/unlock invalidation branch is unreachable from the UI | §6 | WD-IMPL-DEAD-0030 |
| WD-IMPL-DEAD-0108 | streamline_commit bodies in 041 and 042 are superseded | §8 | WD-IMPL-DEAD-0013 |
| WD-IMPL-DEAD-0109 | Streamline never emits a Stage 4 skip transition | §7 | WD-IMPL-DEAD-0011 |
| WD-IMPL-DEAD-0110 | Staged streamline images in storage are never deleted | §14 | WD-IMPL-DEAD-0014 |
| WD-IMPL-DEAD-0111 | project_assets.metadata is read by the UI but is not a column | §14 | WD-IMPL-DEAD-0015 |
| WD-IMPL-DEAD-0112 | Backend env template keys never read by code | §12 | WD-IMPL-DEAD-0052 |
| WD-IMPL-DEAD-0113 | Backend manual scripts and SQL files with no references | §13 | WD-IMPL-FACT-0280 |
| WD-IMPL-DEAD-0114 | Dashboard ProjectCard skipped and outdated styling has no skipped data source | §6 | WD-IMPL-DEAD-0006 |
| WD-IMPL-DEAD-0115 | OUTDATED badge origin subtext never has origin data | §14 | WD-IMPL-DEAD-0012 |
| WD-IMPL-DEAD-0116 | Stage 9 transformation context and FramePanel copy/upload source badges have no backend producer | §6 | WD-IMPL-DEAD-0033 |
| WD-IMPL-DEAD-0117 | generateVideoPrompt framePrompt parameter is unused; PromptSet.systemPrompt has no writer | §5 | WD-IMPL-DEAD-0035 |


## Corrections made while synthesizing

Spot-checks against the repository in this pass. Each row gives the command and the result, and whether it agrees with the cited report.

| Claim checked | Command | Result | Agrees with |
|---|---|---|---|
| Single use of `useDebouncedCallback` | `grep -rn "useDebouncedCallback" src --include=*.ts --include=*.tsx` | 1 line (definition) | K section 1, WD-IMPL-DEAD-0004 |
| `src/pages/Index.tsx` has no importer | `grep -rln "pages/Index" src` | 0 | K section 1, WD-IMPL-DEAD-0002 |
| `exec` RPC has one call site and no definition | `grep -rn "rpc('exec'" backend/src backend/scripts` | 1 (in `backend/src/config/database.ts`) | R1a C08, WD-IMPL-FACT-0345 |
| Git tracking of scratch directories | `git ls-files tmp tmp-pw test-examples ui-images test-results .playwright-mcp \| awk -F/ '{print $1}' \| sort \| uniq -c` | `tmp` 1, `tmp-pw` 44, `test-examples` 17, `ui-images` 82, `test-results` 1, `.playwright-mcp` 1 | K section 8 |
| Ignore rules for `ui-images/` and `.playwright-mcp` | `sed -n '70,80p' .gitignore` | Lines 75 (`ui-images/`) and 79 (`.playwright-mcp`) | K section 8 |
| Frame status CHECK excludes `invalidated` | `sed -n '10,19p' backend/migrations/019_frames_table.sql` | Allowed values are pending, generating, generated, approved, rejected | K section 3.4, WD-IMPL-FACT-0284 |
| Shot-assignment route order | `grep -n "router\." backend/src/routes/shotAssignments.ts` | `:195` DELETE `:assignmentId` before `:223` DELETE `all` | R1a C06, K section 2.6 |
| Phase A 409 nesting and client read | `sed -n '594,606p' backend/src/routes/stageStates.ts` and `grep -n downstreamStages src/pages/ProjectView.tsx` | 409 nests `downstreamStages` under `details`. The client reads `result.downstreamStages` at `:695` | R1a C03, WD-IMPL-DEAD-0007 |
| Stage 7 lock producer | `sed -n '243,250p' backend/src/routes/sceneStageLocks.ts` | Sets `{status:'outdated'}` for each downstream stage | Lead correction on DEAD-0031: the loop never reaches Stage 7 (section 6) |
| `sceneService` route and comment | `sed -n '74,82p' src/lib/services/sceneService.ts` | Comment "This endpoint doesn't exist yet" at `:76-77`; fetch to `/api/scenes/:id/status` | K section 2.6, WD-IMPL-DEAD-0070 |
| Stage 4 never receives `skip` in streamline | `sed -n '97,120p' src/lib/utils/streamlineRouting.ts` | `'skip'` only on stages 2 and 3 | K section 1, WD-IMPL-DEAD-0011 |
| Default video provider | `sed -n '16,22p' backend/src/services/video-generation/createVideoProvider.ts` | `process.env.VIDEO_PROVIDER \|\| 'mock'` | V10 section 6, WD-IMPL-PROV-0019 |
| Migration 005 Step 4 syntax | `sed -n '20,25p' backend/migrations/005_make_library_optional.sql` | Table constraint with `WHERE` clause | R1a C08 |
| Module-scope image service construction | `grep -n "new ImageGenerationService" backend/src/routes/images.ts backend/src/routes/assets.ts backend/src/routes/projectAssets.ts` and `sed -n '63,72p' backend/src/services/image-generation/ImageGenerationService.ts` | `images.ts:6`, `assets.ts:8`, `projectAssets.ts:20` are module-scope. The constructor builds `NanoBananaClient` | Corrects WD-IMPL-FACT-0198 (see section 12) |
| Capsule service is not dead as a whole | `grep -rln styleCapsuleService backend/src` and `grep -rn "getCapsuleById" backend/src --include=*.ts \| grep -v tests \| wc -l` | Six non-test files reference the service (`frames.ts`, `projects.ts`, `llm.ts`, `contextManager.ts`, `promptGenerationService.ts`, `frameGenerationService.ts`). `getCapsuleById` has 7 call sites | K section 2.5 (method-level claim holds) |
| Ten capsule methods have no callers | Per-name count over `backend/src` for the ten names | Each name occurs once (its declaration) | K section 2.5, WD-IMPL-DEAD-0090 |
| `addCredits` has no caller | `grep -rn "addCredits(" backend/src` | Definition only | R1b C14, WD-IMPL-DEAD-0039 |
| `prepareStageContext` callers | `grep -rn "prepareStageContext" backend/src` | `contextManager.ts` and the test file | K section 2.5, WD-IMPL-DEAD-0010 |
| `inpaintImage` references | `grep -rn "inpaintImage(" backend/src` | 2 (interface and definition) | R1b C12, WD-IMPL-DEAD-0043 |
| `postProcessBackground` is called | `grep -n postProcessBackground ImageGenerationService.ts` | Definition at `:96`, calls at `:373` and `:842` | K section 1, WD-IMPL-DEAD-0051 |
| TODO and `@deprecated` counts | `grep -rn "TODO"` and `grep -rn "@deprecated"` over non-test `src`, `backend/src`, `backend/scripts`, `backend/migrations` | 9 TODO lines and 9 `@deprecated` lines, each listed in section 10 | K section 2.8 |
| FIXME, HACK and XXX | `grep -rn "FIXME\|HACK\|XXX"` over non-test `src`, `backend/src`, `backend/scripts` | 0 | K section 2.8 |
| Commented-out metadata block | `sed -n '125,136p' backend/src/routes/projectAssets.ts` | Eight-line commented object under a TODO at `:128` | Adds to K section 2.7 (see below) |
| `skipContinuityBreakConfirm` setter | `grep -n skipContinuityBreakConfirm src/components/pipeline/FramePanel.tsx` | Read at `:424`, set at `:967` | Adds to K section 6 (see below) |
| Backend package scripts | `grep -n "\"migrate\"\|setup:bucket\|\"test\"" backend/package.json` | `migrate`, `setup:bucket`, `test` | K section 2.4 |
| Env files untracked and ignored | `git ls-files .env.local backend/.env`; `git check-ignore -v .env.local backend/.env` | Not tracked; ignored at `.gitignore:37` and `:48` | Section 13 |

Corrections and additions to the reports.

1. K section 3.3 labels `backend/quickies-sql/*.sql` as ORPHANED. `add_stage_locks.sql` is the only DDL for `scenes.stage_locks`, which six handlers query, so it is LEGACY and load-bearing. Only the two RLS files are orphaned (section 13).
2. K section 2.5 and DEAD-0090 describe the ten `styleCapsuleService` methods as dead. The class is live through `getCapsuleById` and `formatWritingStyleInjection`. The correction is one of precision, not of the ten method verdicts.
3. K section 2.7 counts commented-out code only at a ten-line threshold for `//` blocks. `backend/src/routes/projectAssets.ts:128-135` is an eight-line commented `metadata` object and was missed. It is added in section 11.
4. K section 6 records only the read of `skipContinuityBreakConfirm` at `FramePanel.tsx:424`. The setter at `FramePanel.tsx:967` is added in section 12.
5. E (WD-IMPL-FACT-0198) states a per-route HTTP 500. I (correction) states a boot failure. The import graph supports I for the three module-scope routers. Recorded in sections 12 and 16.
6. K section 1 lists DEAD-0004 with a CORRECTED verdict, but the ledger entry has no `correction` field. Section 16 records the conflict.
7. The ledger entry DEAD-0024 is labelled DEAD-READ and CONTRADICTED. K labels it PARTIAL. Section 16 keeps both and uses PARTIAL.
8. K section 2.1's count of 31 unreachable frontend files does not match its own list. Section 1 records the discrepancy and uses 30.
9. The V5 job polling count (three) and the K count (four) differ. Section 9.2 keeps both lists.
10. V3 contributed no DEAD ledger entries, although the brief lists V3 among the DEAD sources. This is recorded here and not inferred.
11. CAP-0192 and FACT-0075 corrections are taken from R1a and R1b. I did not re-check the underlying files for those two claims beyond the spot-checks listed above.

Coverage. The 117 DEAD ids in Appendix A are each cited once as primary and cross-referenced where another id covers the same object. Sections 1 to 15 cite every DEAD id at least once.

