# 15. Structural pressure

Scope. This document records structural pressure that is already visible in the WizardDirector (Aiuteur) code at HEAD: module size and mixed responsibility, direct persistence access, duplicated domain types, provider and model branching, duplicated prompt and context construction, one concept represented differently across layers, mutation fan-out, temporal coupling and stage order, swallowed errors and silent fallbacks, ownership checks, test coupling, and duplicate or unguarded writes. It is descriptive only. It has no recommendations, no target architecture, and no redesign. Each item cites merged ledger ids (WD-IMPL-PRESSURE-NNNN where the item is in the PRESSURE set, plus supporting ids), file:line evidence, and static counts. Regex counts can differ by about 2 percent.

Sources. Ledger kinds PRESSURE (65 entries, WD-IMPL-PRESSURE-0001 to 0065), with supporting FACT, STATE, INV, ROUTE, CAP, DEAD, TEST, PROV, ENTITY, and AI entries. Reports: L-pressure (primary), I-infra-async, K-dead-dup, V1-shell, V3-narrative, V5-project-assets, V6-scene-assets, V7-continuity-locations, V8-shots, V9-prompts-frames, V10-video-checkout, H-state-invalidation, and the R1a and R1b verdicts. Spot checks were run against the repo at HEAD. Corrections found during synthesis are in section 14.

Reading notes. 00-README.md is the document map. Topic detail lives in 01-SYSTEM-OVERVIEW.md, 02-FUNCTIONAL-CAPABILITIES.md, 03-USER-WORKFLOWS.md, 04-DOMAIN-AND-STATE-MODEL.md, 05-DATA-MODEL.md, 06-WRITING-AND-STORY-IMPLEMENTATION.md, 07-VISUAL-ASSETS-AND-CONTINUITY.md, 08-SHOTS-FRAMES-AND-GENERATION.md, 09-AI-AND-PROMPT-SYSTEM.md, 10-VERSIONING-LOCKING-AND-INVALIDATION.md, 11-APPLICATION-ARCHITECTURE.md, 12-ASYNC-RELIABILITY-AND-PROVIDERS.md, 13-TEST-AND-EVIDENCE-MAP.md, and 14-DEAD-PARTIAL-AND-DUPLICATED.md. Cross-slice references (for example the sequential lock triggers in migrations 043 and 044, or the continuity base scan) are cited inline.

Conventions. SP-nn ids are local to this document, and ledger ids are in parentheses. Status tags use the corpus vocabulary (IMPLEMENTED, REACHABLE, FUNCTIONAL, PERSISTED, TESTED, PARTIAL, MOCK-ONLY, DEAD, ORPHANED, LEGACY, DUPLICATED, CONTRADICTED, UNKNOWN) and describe the pressure, not the feature. Confidence: H means verified by grep or direct read in this synthesis, or confirmed by an R1a or R1b verdict. M means a regex count or partial trace. L means inference from static reading. Runtime behaviour is UNKNOWN throughout because no database, network, or server was used.

Overview. Four patterns recur. The backend persistence layer is one service-role client called from about 800 table-literal sites, most of them in 12 route files. The same concept (stage status, shot-list lock, visual style capsule, project type, scene shape) is represented several ways, each maintained by hand. Key mutations write several tables or stages from one request, or from a sequence of client calls, with no shared transaction. Several failure paths write nothing, log only, or return an empty success, and the UI then keeps polling or shows a complete state.

---

## 1. Module size and mixed responsibility

### 1.1 Largest production files

Non-test LOC (L section 1.1). Totals: frontend production 53,362 LOC (`src`), backend production 33,639 LOC (`backend/src`), backend tests 9,422, frontend tests 4,879. `src/components/pipeline/` holds 89 files.

| # | LOC | File | # | LOC | File | # | LOC | File |
|---:|---:|---|---:|---:|---|---:|---:|---|
| 1 | 4006 | backend/src/routes/projects.ts | 2 | 3451 | backend/src/routes/projectAssets.ts | 3 | 2410 | backend/src/routes/frames.ts |
| 4 | 2332 | backend/src/routes/sceneAssets.ts | 5 | 1769 | src/components/pipeline/Stage7ShotList.tsx | 6 | 1754 | src/components/pipeline/Stage10FrameGeneration.tsx |
| 7 | 1749 | src/components/pipeline/Stage5Assets.tsx | 8 | 1600 | backend/src/services/frameGenerationService.ts | 9 | 1521 | backend/src/services/promptGenerationService.ts |
| 10 | 1335 | src/components/pipeline/ContentAccessCarousel.tsx | 11 | 1291 | src/lib/services/projectAssetService.ts | 12 | 1265 | src/components/pipeline/Stage4MasterScript.tsx |
| 13 | 994 | src/pages/ProjectView.tsx | 14 | 994 | src/components/pipeline/Stage9PromptSegmentation.tsx | 15 | 982 | src/components/pipeline/FramePanel.tsx |
| 16 | 962 | src/lib/services/sceneAssetService.ts | 17 | 958 | backend/src/services/image-generation/ImageGenerationService.ts | 18 | 939 | src/components/pipeline/Stage8VisualDefinition.tsx |
| 19 | 933 | src/components/pipeline/Stage3BeatSheet.tsx | 20 | 925 | src/components/pipeline/Stage1InputMode.tsx | 21 | 888 | src/components/pipeline/Stage2Treatment.tsx |
| 22 | 884 | src/lib/services/frameService.ts | 23 | 854 | src/components/pipeline/Stage8/VisualStateEditorPanel.tsx | 24 | 843 | src/components/pipeline/Stage8/LocationCoveragePanel.tsx |
| 25 | 811 | src/components/pipeline/Stage8/SceneAssetListPanel.tsx | 26 | 777 | backend/src/routes/llm.ts | 27 | 703 | backend/src/services/continuityCompositionService.ts |
| 28 | 683 | backend/src/services/assetExtractionService.ts | 29 | 681 | src/components/pipeline/AssetDrawer.tsx | 30 | 675 | backend/src/services/videoGenerationService.ts |

### 1.2 Route files

Handler counts are `router.(get|post|put|patch|delete)(` registrations (198 in total, grep-confirmed). Table-literal counts exclude storage buckets (L section 1.2).

| File | LOC | Handlers | Table-literal calls | Concerns in handler paths |
|---|---:|---:|---:|---|
| routes/projects.ts | 4006 | 29 | 129 | Project CRUD, continuity metrics, scene list, defer, restore, script save, shot CRUD, split, merge, delete, location coverage, shot lock and unlock, Stage 9 prompt generation, project delete |
| routes/projectAssets.ts | 3451 | 37 | 132 | Asset extraction, asset CRUD, merge and split, image generate, upload, analyze, edit, lock and lock-all, global clone and sync, attempts, angle variants, location views |
| routes/frames.ts | 2410 | 27 | 115 | Frame generate, approve, reject, regenerate, inpaint, end-frame prompt, chain, upload, generations, continuity base, batch link copy, field versions |
| routes/sceneAssets.ts | 2332 | 36 | 88 | Scene asset instances, suggestions, populate, generate, edit, attempts, master as-is, reference chain, upload, transformation events, description overrides |
| routes/llm.ts | 777 | 13 | 0 | Generic LLM generate, template generate, cost estimate, usage, connectivity, prompt template CRUD and activation |

Per-file table-literal counts (L section 2.1): projectAssets 132, projects 129, frames 115, sceneAssets 88, stageStates 25, styleCapsules 19, sceneStageLocks 14, assets 13, checkout 11, streamline 10, images 5, shotAssignments 3.

### 1.3 UI and state host files

Hook counts are literal token counts (L section 1.3).

| File | LOC | useState | useEffect | useQuery or useMutation | Service or HTTP call sites | Concerns |
|---|---:|---:|---:|---:|---:|---|
| Stage7ShotList.tsx | 1769 | 31 | 6 | 0 | 14 | Auto-extract on mount, 800 ms autosave, split and merge dialogs, two lock systems, validation |
| Stage10FrameGeneration.tsx | 1754 | 16 | 2 | 24 | 42 | Frame grid, continuity-base chooser, generation polling, inpaint, regenerate, field versions, 30 invalidation call sites |
| Stage5Assets.tsx | 1749 | 33 | 3 | 2 | 29 | Visual style lock, style-change dialogs, extraction, merge and split wizard, lock-all, stage 5 lock |
| ContentAccessCarousel.tsx | 1335 | 17 | 14 | 5 | 4 | Shared carousel rendered by stages 6 to 12 |
| Stage4MasterScript.tsx | 1265 | 18 | 5 | 0 | 19 | Tiptap editor, scene extraction, approve, downstream-warning dialog |
| pages/ProjectView.tsx | 994 | 17 | 8 | 0 | 11 | Stage host: Phase A and B progression, URL sync, scene-stage lock fetch, unlock warning |
| Stage8VisualDefinition.tsx | 939 | 23 | 4 | 12 | 31 | Asset list, location coverage, visual state editor, auto-populate, image job polling, 19 invalidation call sites |
| Stage1InputMode.tsx | 925 | 14 | 0 | 0 | 15 | Input modes, file staging, streamline routing, scene persistence for streamline import |

### 1.4 Items

**SP-01 Route files mix unrelated domains** `IMPLEMENTED` (WD-IMPL-PRESSURE-0017; L-PRESSURE-05; V8-ROUTE-01, V1-ROUTE-01, V3 section 1, K)
- OBSERVATION: four backend route files each hold six to ten unrelated domains. Shot routes sit in projects.ts beside scene, location, and prompt routes.
- EVIDENCE: projects.ts:259-640 (project CRUD), 1711-1977 (shot extract), 2515-2654 (split), 2657-2788 (merge), 2791-2840 (delete), 2845-3017 (lock), 3020-3185 (unlock), 3573-3960 (generate-prompts). Helpers are file-local: `buildShotLocationState` at projects.ts:79, `transformShotForClient` at projects.ts:190. K also lists continuity metrics, transformation_flags writes, and the LLM fallback in the same file (projects.ts:863, 1338-1346, 1928, 3825-3828).
- CURRENT CONSEQUENCE: the shot-to-location mapping exists in route handlers and in services (WD-IMPL-PRESSURE-0006). Shot-list lock, unlock, and the scene defer and restore routes share one module.
- CONFIDENCE: H for counts and line ranges. M for the concern mapping.

**SP-02 Stage components and services hold state, orchestration, and data assembly inline** `IMPLEMENTED` (WD-IMPL-PRESSURE-0018; L-PRESSURE-06)
- OBSERVATION: stage components own query, mutation, autosave, polling, lock, and dialog logic in one file. `ContentAccessCarousel` (1335 LOC, 14 useEffect, 9 useRef) is rendered by stages 6 to 12. The backend services frameGenerationService (1600 LOC), promptGenerationService (1521), ImageGenerationService (958), and videoGenerationService (675) each contain database access and prompt or context assembly.
- EVIDENCE: Stage7ShotList.tsx:122-125 and 252-286 (800 ms autosave), 697-701 and 812-817 (lock and unlock). ContentAccessCarousel.tsx is rendered from Stage6 (L528), Stage7 (L921), Stage8 (L773), Stage9 (L443), Stage10 (L891), Stage11 (L164), Stage12 (L243). videoGenerationService.ts combines cost math (95, 197-198, 329, 350), job insert (318-408), deduction (394), scene status (516-537), and retry (563-597).
- CURRENT CONSEQUENCE: lock, autosave, polling, and dialog behaviour interleave in single components, and the lock calls are duplicated (SP-85).
- CONFIDENCE: H.

---

## 2. Direct persistence access from routes and UI

### 2.1 Backend layer split

| Layer | Table-literal `.from('x')` calls | Files | Distinct tables | `.rpc(` calls |
|---|---:|---:|---:|---:|
| routes | 561 (564 raw, 3 storage) | 12 | 22 | 1 (streamline_commit_atomic, routes/streamline.ts:77) |
| services | 237 (239 raw, 2 storage) | 22 | 27 | 0 |
| other (config, utils, middleware, transformers) | 4 | 3 | n/a | 1 (`exec`, config/database.ts:48) |

Route files importing `config/supabase`: 12 of 15. Services importing it: 21 (grep-confirmed).

**SP-03 Route handlers hold query, validation, and write logic, including writes that span tables** `PERSISTED` (WD-IMPL-PRESSURE-0013; L-PRESSURE-01; V3 section 6.2; V8-ROUTE-01; V9-ROUTE-01, V9-ROUTE-02; V6 R13, R14)
- OBSERVATION: query, ownership, validation, and write logic live in handler bodies. Scene re-parse, shot split and merge, extraction, prompt persistence, and inline asset creation all query and write from the route, and some of them write several tables in sequence.
- EVIDENCE: projects.ts:1293-1499 (scene match, delete, update, insert), 2515-2788 (split and merge), 1832-1969 (extraction inserts `location_views`, shots, `location_match_events`), 3840-3891 (prompt persistence). sceneAssets.ts:925-962 and 1029-1103 (asset plus instance with a compensating delete), 169-282 (bulk instance insert keyed on `scenes.expected_*`). frames.ts:1063-1244 (inline upload), 1315-1400 (select generation).
- CURRENT CONSEQUENCE: no transaction spans the scene re-parse steps, so a mid-sequence failure leaves partial state (V3 section 6.2, derived from code). Frame and prompt writes in routes have no stage-lock check (V9-ROUTE-01, V9-ROUTE-02).
- CONFIDENCE: H for locations. M for the consequences, which were derived from code and not run.

**SP-04 One service-role client serves every backend read and write** `PERSISTED` (WD-IMPL-PRESSURE-0014; L-PRESSURE-02; WD-IMPL-FACT-0002, WD-IMPL-FACT-0171)
- OBSERVATION: the backend constructs one client from `SUPABASE_SERVICE_ROLE_KEY`. No user-scoped client exists in the backend.
- EVIDENCE: backend/src/config/supabase.ts:10 (key) and :17 (`createClient`). Imported by 12 route files and 21 services.
- CURRENT CONSEQUENCE: row-level security is not evaluated for API traffic. Per-handler `.eq('user_id', ...)` filters are the only isolation for backend-mediated reads and writes (SP-78). The `text_field_versions` policy is `FOR ALL USING (true) WITH CHECK (true)` (R1b C22, CONFIRMED).
- CONFIDENCE: H.

**SP-05 The browser reads persistence directly in one hook and one orphaned module** `PERSISTED` (WD-IMPL-PRESSURE-0015; L-PRESSURE-03; H-FACT-02)
- OBSERVATION: the browser reads the `scenes` table through one hook, which five stage components use. A second service reads `projects` and has no importers. Frontend writes go over HTTP only.
- EVIDENCE: src/hooks/useSceneInfo.ts:26 (`.from('scenes')`), used by Stage7ShotList.tsx:90, Stage9PromptSegmentation.tsx:90, Stage10FrameGeneration.tsx:191, Stage11Confirmation.tsx:52, Stage12VideoGeneration.tsx:42. src/lib/services/imageService.ts:146-155 (`.from('projects')`), ORPHANED (K DEAD-0016, DEAD-0045).
- CURRENT CONSEQUENCE: two browser read paths depend on RLS with the anon key, outside the backend ownership checks. K says the frontend has no direct table access (section 13). The grep result contradicts that.
- CONFIDENCE: H.

**SP-06 Client-side flows persist as sequences of separate calls** `PERSISTED` (V1-CAP-22, V5-ROUTE-34, V7-CAP-19, V8-CAP-07, V9-CAP-03, V10-STATE-05, V10-CAP-22)
- OBSERVATION: several flows persist from the client as ordered calls rather than one backend operation. Stage 7 lock flushes pending PUTs, waits 150 ms, validates locally, then calls the lock route, the stage-locks route, and `onComplete`. Stage 10 Unlink runs one PUT per shot. The location-view AI image is persisted by the client after polling. Stage 11 locks after confirm as a best-effort call. The carousel fetches video jobs for every other scene at stages 11 and 12.
- EVIDENCE: Stage7ShotList.tsx:697-791; Stage10FrameGeneration.tsx:1029-1044; projectAssetService.ts:1216-1264; ProjectView.tsx:589-615; ContentAccessCarousel.tsx:160-190; Stage9PromptSegmentation.tsx:343-356 and 228-255 (two persistence paths for one field, with VersionedTextarea.tsx:136-153).
- CURRENT CONSEQUENCE: Unlink is not atomic, so a partial unlink is possible (V7-CAP-19). A tab close or the 60 s polling timeout means the location-view image is never attached (V5-ROUTE-34). The Stage 9 shot value can diverge from the selected version (V9-CAP-06).
- CONFIDENCE: H for locations. M for consequences (reported, not run).

**SP-07 Frontend auth-token boilerplate is repeated in each service method** `PERSISTED` (WD-IMPL-PRESSURE-0016; L-PRESSURE-04)
- OBSERVATION: each frontend service builds its own `Authorization: Bearer` header and session check. No shared fetch helper exists.
- EVIDENCE: L counts 149 `Bearer` occurrences in 22 files and 157 `supabase.auth.getSession` calls. grep for `fetchWithAuth|authFetch|apiFetch` in src/lib returns nothing. Example: src/lib/services/stageStateService.ts:70, 121, 153, 179, 211.
- CURRENT CONSEQUENCE: auth-header handling exists in many forms. These counts come from the L grep and were not re-run here.
- CONFIDENCE: M.

---

## 3. Duplicated domain types

Field lists come from interface bodies. FE is `src/`, BE is `backend/src/`.

**SP-08 Frame shape and status union are copied by hand** `DUPLICATED` (WD-IMPL-PRESSURE-0019; L-PRESSURE-07)
- OBSERVATION: `Frame` has 20 fields in both layers, identical in name and type. `FrameStatus` is a five-value union in both layers, and the DB CHECK has the same five values.
- EVIDENCE: src/types/scene.ts:327 and :323; backend/src/services/frameGenerationService.ts:11 and :7; backend/migrations/019_frames_table.sql:12-18.
- CURRENT CONSEQUENCE: the lists agree, but the `invalidated` value is written by the shot-list unlock path (projects.ts:3106-3109) and is not in the CHECK (WD-IMPL-FACT-0207, WD-IMPL-FACT-0284). The union does not describe what is written.
- CONFIDENCE: H.

**SP-09 Shot exists in at least seven shapes across two languages and three casings** `DUPLICATED` (WD-IMPL-PRESSURE-0020; L-PRESSURE-08; V8-ENTITY-01)
- OBSERVATION: each service declares its own shot row type, and the API response mixes casing in one object.
- EVIDENCE: src/types/scene.ts:50 `Shot` (22 fields, mixed); promptGenerationService.ts:13 `ShotData` (21, snake); shotMergeService.ts:12 (13); shotSplitService.ts:25 (10) and :11 (insert payload); shotValidationService.ts:28 (9, camel); routes/projects.ts:32 (3). Hand-written mappers: projects.ts:190, shotSplitService.ts:71, src/lib/services/shotService.ts:51.
- CURRENT CONSEQUENCE: `Shot.transformationFlags` is declared but never populated (V8-DEAD-03), and new fields must be added to each mapper.
- CONFIDENCE: H.

**SP-10 Scene exists in four shapes** `DUPLICATED` (WD-IMPL-PRESSURE-0021; L-PRESSURE-09; K DUP-TYPE)
- OBSERVATION: the name `Scene` denotes four shapes across the layers. The scene status union matches in both layers, so it is the one field that does not drift.
- EVIDENCE: src/types/scene.ts:76 (17 fields, camel); src/lib/services/scriptService.ts:7 (5, camel); backend/src/services/continuityRiskAnalyzer.ts:18 (5, snake); backend/src/utils/scriptManifest.ts:39 (9, camel). Status: src/types/scene.ts:5-12 and migration 014:19-27, six values each.
- CURRENT CONSEQUENCE: the same name carries different fields in FE and BE. K records the FE name collision as a naming conflict.
- CONFIDENCE: H.

**SP-11 Asset family shapes diverge between FE and BE** `DUPLICATED` (WD-IMPL-PRESSURE-0022; L-PRESSURE-10; V5-ENTITY-01)
- OBSERVATION: `SceneAssetInstance` has 19 fields in FE and 16 in the BE `SceneAssetInstanceData`, sharing 8. FE declares 11 fields the BE does not, and the BE declares 8 the FE does not. The BE has no `ProjectAsset` or `GlobalAsset` type, so those rows are typed `any`. FE `SceneAsset` is a separate camel-case entity.
- EVIDENCE: src/types/scene.ts:113 and :100; promptGenerationService.ts:57; src/types/asset.ts:3 (`GlobalAsset`, 13 fields) and :19 (`ProjectAsset`, 22 fields). `as any`: 33 in routes, 17 in services, 7 in src (grep).
- CURRENT CONSEQUENCE: field drift between FE and BE produces no type error. The FE `ProjectAsset.source` union omits `streamline_import`, which the DB allows (V5-ENTITY-01).
- CONFIDENCE: H.

**SP-12 Asset identity is keyed differently by layer** `DUPLICATED` (V5-CAP-02, V5-ENTITY-02; WD-IMPL-CAP-0137)
- OBSERVATION: aggregation dedupes extracted entities by name with no type, while preview and confirm look them up by `type:name`.
- EVIDENCE: assetExtractionService.ts:174, 210, 244 (name key); projectAssets.ts:334-343 (`type:name`); assetExtractionService.ts:78-84.
- CURRENT CONSEQUENCE: a same-named character and prop collapse into one entity, and mismatched keys are skipped (V5 sections 2.3 and 3.4, reported).
- CONFIDENCE: H for locations, M for the consequence.

**SP-13 Continuity and location types are copied and drift** `DUPLICATED` (K DUP-TYPE)
- OBSERVATION: `ContinuityBaseCandidate` has three copies with different suitability types. `LocationCoverageSummary` has 15 fields in one copy and 19 in the other. `ShotAssetAssignment` has 7 and 6, `ReferenceImageOrderEntry` 10 and 9, `Beat` 7 and 5. `PresenceType` is one union declared three times.
- EVIDENCE: src/types/locationContinuity.ts:166 and :105; src/types/scene.ts:244, :246, :257; continuityBaseService.ts:5; continuityCompositionService.ts:90; locationCoverageService.ts:82; shotAssetAssignmentService.ts:8 and :10; promptGenerationService.ts:89 and :112; src/lib/services/beatService.ts:5; contextManager.ts:23.
- CURRENT CONSEQUENCE: field counts differ between copies that share a name. The K report did not run a type check.
- CONFIDENCE: M (K field counts, locations spot-checked).

**SP-14 Streamline types, question types, config, and script-confidence logic exist in both layers** `DUPLICATED` (WD-IMPL-PRESSURE-0003, WD-IMPL-PRESSURE-0004; V4-PRESSURE-02, V4-PRESSURE-03; WD-IMPL-CAP-0135; K DUP-RULE, DUP-LOGIC, DUP-CONFIG)
- OBSERVATION: streamline draft and question types, configuration constants, and classifiers are duplicated. `scriptConfidence` exists in both layers with different detection methods. Stage 1 also has two document-intake paths: non-streamline modes read files in the browser (a PDF yields an empty string and a DOCX yields raw bytes as text), while streamline extracts on the server (FileStagingArea.tsx:37-113 and :105-111; StreamlineDropZone.tsx:66-90; streamlineExtractionService.ts:52-81).
- EVIDENCE: src/lib/services/streamlineService.ts:33 and src/lib/utils/streamlineRouting.ts:14 (`StreamlineAssetDraft`), backend/src/services/streamlineStandaloneAssetService.ts:13 (`StandaloneAssetDraft`), src/components/pipeline/streamline/AskAuteurQuestionUI.tsx:7 against `StreamlineQuestion`. src/lib/utils/streamlineConfig.ts and backend/src/config/streamlineConfig.ts (identical apart from comments). src/lib/utils/scriptConfidence.ts:24-44 (TipTap nodes) against backend/src/utils/scriptConfidence.ts:1-10 (regex).
- CURRENT CONSEQUENCE: the backend header says it mirrors the frontend, but the detection differs, so one text can classify differently (K, CONTRADICTED, not executed).
- CONFIDENCE: H for locations, M for behaviour.

**SP-15 Video and model types are declared in several places** `DUPLICATED` (WD-IMPL-PRESSURE-0037 in part; L section 3.7)
- OBSERVATION: `ModelVariant` is declared three times and `VideoJobStatus` twice. Both `VideoJobStatus` copies match the DB CHECK.
- EVIDENCE: src/types/scene.ts:418 and :473; videoGenerationService.ts:9 and :10; video-generation/VideoProviderInterface.ts:11 (inline union); migration 021_video_generation_jobs.sql:20-27.
- CURRENT CONSEQUENCE: no drift is observable for the status union. The variant union must be kept in step by hand.
- CONFIDENCE: H.

---

## 4. Provider and model branching

**SP-16 Google models are reached through three SDK or transport paths, with four key checks** `PERSISTED` (WD-IMPL-PRESSURE-0035; L-PRESSURE-23; H-FACT-04)
- OBSERVATION: one backend reaches Google models through LangChain, the generative-ai SDK, and direct REST. The `GOOGLE_AI_API_KEY` check appears in four places with different behaviour. Two clients are constructed at module scope.
- EVIDENCE: llm-client.ts:91 (`validateEnvironment` throws), imageAnalysisService.ts:25-27 (throws), image-generation/NanoBananaClient.ts:21-23 (throws), routes/llm.ts:143 (status endpoint). Module-scope construction: frameGenerationService.ts:1600 and :129-133, routes/images.ts:6, routes/assets.ts:8, routes/projectAssets.ts:20.
- CURRENT CONSEQUENCE: a missing key fails at import for module-scope constructions, and the LLM path reports it through `validateEnvironment`. Whether production boots is UNKNOWN.
- CONFIDENCE: H. (L's title says four key-check behaviours and its body says three. The evidence lists four checks.)

**SP-17 The Gemini text default model is set three ways in one file** `CONTRADICTED` (WD-IMPL-PRESSURE-0034; L-PRESSURE-22; WD-IMPL-FACT-0105; V9-PROV-01; V7-AI-01; V8-FACT-15)
- OBSERVATION: `GEMINI_MODEL` is read three times in `llm-client.ts` with three literal fallbacks. `generate` builds a new client per request from the request model, so the constructor default does not apply on that path.
- EVIDENCE: llm-client.ts:76 (`gemini-2.5-flash-lite`, constructor), :106 (`gemini-1.5-flash`, `generate`), :310 (`gemini-2.5-flash-lite`, `estimateCost`), :130-137 (per-request client). Pricing keys at utils/token-utils.ts:28-40 cover `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.0-pro`, `gemini-2.5-flash-lite`.
- CURRENT CONSEQUENCE: `generate` without `GEMINI_MODEL` uses `gemini-1.5-flash`, while `estimateCost` estimates for `gemini-2.5-flash-lite`. The deployed value is UNKNOWN.
- CONFIDENCE: H (lines checked in this synthesis).

**SP-18 Model ids and pricing keys are hard-coded across ten backend files** `PERSISTED` (WD-IMPL-PRESSURE-0036; L-PRESSURE-24; V5-PROV-01; V9-PROV-02; V9-AI-08; V6 AI-6 to AI-8)
- OBSERVATION: model ids are literals in files that share no config source. The pricing keys do not cover the image and vision models in use.
- EVIDENCE: imageAnalysisService.ts:54, 106, 136, 176 (`gemini-2.5-flash`); NanoBananaClient.ts:119, 180 (`gemini-2.5-flash-image`); Veo3Provider.ts:18-19 (`veo-3.1-fast-generate-001`, `veo-3.1-generate-001`); token-utils.ts:28-40. Non-test backend literal counts (L): `veo_3_1_fast` 11, `gemini-2.5-flash` 4, `veo3` 3, `gemini-2.5-flash-lite` 3, `gemini-2.5-flash-image` 2, `gemini-1.5-flash` 2.
- CURRENT CONSEQUENCE: whether the Veo ids are accepted by the provider is UNKNOWN (no live call). Cost estimates for the image and vision models have no pricing entry.
- CONFIDENCE: H for the cited lines. M for the counts.

**SP-19 Image width and height are stored but never sent to the image model** `PARTIAL` (WD-IMPL-FACT-0188; R1b C12 CONFIRMED; V9-FACT-06; H-PROV-02)
- OBSERVATION: the job row stores width and height, and the cost estimate uses them. The Gemini request carries reference parts and text only. The aspect ratio is labelled as sizing.
- EVIDENCE: NanoBananaClient.ts:118-126 and :159-160 (no size or aspect parameter); FramePanel.tsx:270 (UI sends the values).
- CURRENT CONSEQUENCE: frame dimensions have no effect on generated output. Output dimensions are UNKNOWN.
- CONFIDENCE: H.

**SP-20 Video provider defaults to a mock when the variable is unset** `MOCK-ONLY` (WD-IMPL-PRESSURE-0038; L-PRESSURE-26; V10-PROV-01; V10-AI-02; WD-IMPL-FACT-0139)
- OBSERVATION: `VIDEO_PROVIDER` defaults to `mock`, and any unrecognised value selects the mock. The provider is cached at module level. The mock ignores frames and returns one public sample for every shot.
- EVIDENCE: video-generation/createVideoProvider.ts:14 (cache), :18 (`process.env.VIDEO_PROVIDER || 'mock'`), :20-27 (switch). MockVideoProvider.ts:10, :19-31. Veo3Provider.ts:41-46 throws on first use if `GOOGLE_CLOUD_PROJECT` is missing. The video variables are absent from `backend/env.example` and `fly.toml`.
- CURRENT CONSEQUENCE: an unset variable yields mock output with no startup error. The production value is UNKNOWN.
- CONFIDENCE: H.

**SP-21 Veo variant names, rates, clamping, and checkout validation are duplicated across both layers** `DUPLICATED` (WD-IMPL-PRESSURE-0037; L-PRESSURE-25; V10-FACT-02, V10-FACT-05)
- OBSERVATION: the per-second rate is a literal in several files, and the variant string is a literal in both layers. Veo clamps duration to 4, 6, or 8 seconds, but the cost uses the unclamped `shots.duration`.
- EVIDENCE: `0.15` and `0.40` at videoGenerationService.ts:6-7 (exported constants), Veo3Provider.ts:158, MockVideoProvider.ts:44, src/lib/services/checkoutService.ts:243, and Stage11Confirmation.tsx:288 and :306 (V10 count of six sites). `'veo_3_1_fast'` appears 12 times in non-test backend and 10 in non-test frontend. checkout.ts:94 (default) and :98 (validation list). Clamp: Veo3Provider.ts:23 and :208-222; cost at videoGenerationService.ts:197-198; default duration in 006_shots_table.sql:13.
- CURRENT CONSEQUENCE: a rate or variant change touches files on both sides. Billed length can differ from the charge, and the two values are never reconciled (V10-FACT-05, reported). The unlock estimate uses separate constants: 0.05 per frame and 2.50 per video (sceneStageLocks.ts:214-224; projects.ts:3064-3070).
- CONFIDENCE: H for counts, M for the V10 site count and the clamp consequence.

**SP-22 Dead provider surface remains in the tree** `DEAD` (WD-IMPL-PRESSURE-0062; WD-IMPL-DEAD-0043; WD-IMPL-DEAD-0052; WD-IMPL-FACT-0013; WD-IMPL-DEAD-0050; V9-PROV-04)
- OBSERVATION: `inpaintImage` is declared on the provider interface and implemented, with no caller. Environment template keys for OpenAI, Anthropic, Veo, and Nano Banana have no reader. `Landing.tsx:32` claims OpenAI and Anthropic support. `setRetryConfig` has no caller. `postProcessBackground` returns its input. Other dead members are listed under SP-25, SP-26, SP-38, SP-61, and SP-79 (L-PRESSURE-50).
- EVIDENCE: NanoBananaClient.ts:171 and :185; ImageProviderInterface.ts:52; backend/env.example and .env.example (names only); Landing.tsx:32; llm-client.ts:330 and :384-385; ImageGenerationService.ts:91-103 (TODO at :100).
- CURRENT CONSEQUENCE: inpaint masks are uploaded and stored in `frames.last_inpaint_mask_path`, but the only mask-aware method is never called (R1b C12, CONFIRMED). The landing-page provider claims have no code behind them.
- CONFIDENCE: H.

**SP-23 Token budgets and temperatures are literals at call sites** `PERSISTED` (WD-IMPL-PRESSURE-0039; L-PRESSURE-27; V3 section 8; V8-AI-01)
- OBSERVATION: `maxTokens` and `temperature` are literals at 22 backend call sites each. The default output length is set in one place, and the frontend never sends `maxTokens`.
- EVIDENCE: routes/llm.ts:25 and :56 (cap 8192); llm-client.ts:137 (`request.maxTokens ?? 4096`); streamlineFormattingService.ts:32 (2048) and :52 (4096); shotSplitService.ts:154; shotExtractionService.ts:454 (4096); backend/scripts/seed-templates.ts:43 (three treatments of 800 to 1200 words).
- CURRENT CONSEQUENCE: truncated JSON falls back to a text split or a single variation (WD-IMPL-PRESSURE-0001). Whether the treatment path truncates at runtime is UNKNOWN.
- CONFIDENCE: M.

---

## 5. Duplicated prompt and context construction

**SP-24 Prompt builders are duplicated by name and by inline text** `DUPLICATED` (WD-IMPL-PRESSURE-0040; L-PRESSURE-28; K PROMPT entries; R1b C17)
- OBSERVATION: `buildSystemPrompt` and `buildUserPrompt` are defined in two streamline services. Inline "You are" system prompts appear in 19 backend files. Stage 9 and 10 system prompts are inline constants. The seed template text exists in two copies.
- EVIDENCE: streamlineReconciliationService.ts:45 and :62; streamlineQuestionService.ts:49 and :73; promptGenerationService.ts:1135, :1207, :1307, :1376 (inline). prompt-template.ts is not imported by promptGenerationService.ts (K). routes/seed.ts and backend/scripts/seed-templates.ts differ in about 88 lines of template text, and both insert `created_by` NULL (R1b C17, CONFIRMED).
- CURRENT CONSEQUENCE: the seed copies diverge, and the live template rows for each stage are UNKNOWN.
- CONFIDENCE: H.

**SP-25 Style-capsule loading is copied four times, with three failure policies, beside unused injection helpers** `DUPLICATED` (WD-IMPL-PRESSURE-0031; L-PRESSURE-19; K section 2.5; L section 5.2)
- OBSERVATION: "load the project's capsule and continue if it fails" appears four times. `getCapsuleById` has seven call sites. `formatVisualStyleInjection` has no caller, `formatWritingStyleInjection` has seven, and ten `styleCapsuleService` methods have no caller while routes/styleCapsules.ts implements the same CRUD inline.
- EVIDENCE: routes/frames.ts:568-574 (empty catch at :573, comment at :574), frames.ts:2215-2222 (empty catch at :2220), services/frameGenerationService.ts:776-786 (empty catch at :786, `user_id` re-fetched), routes/projects.ts:3739-3749 (`console.warn` at :3747). Other callers: contextManager.ts:130 and :146, routes/llm.ts:244. styleCapsuleService.ts:366 (no caller), :330, and :79, 124, 159, 199, 235, 270, 397, 418, 453.
- CURRENT CONSEQUENCE: two copies swallow the failure, so a failed load looks like "no capsule" (L section 14). The CRUD exists twice, and one copy of each method set is unreachable.
- CONFIDENCE: H.

**SP-26 Context assembly is spread across services and routes, with unreferenced members** `DEAD` (WD-IMPL-PRESSURE-0032; L-PRESSURE-20; K PROMPT-CTX)
- OBSERVATION: `assembleGlobalContext` has three callers. `assembleLocalContext` and three other contextManager functions have no production caller. `prepareStageContext` is referenced only by its test. Stage-content reads by stage-number literal appear at 27 sites.
- EVIDENCE: contextManager.ts:102 (callers routes/llm.ts:198, streamlineBackfillService.ts:59 and :108); contextManager.ts:208, :274, :288, :326 (no callers, K); backend/src/tests/contextManagerAuteurResolutions.test.ts. `.eq('stage_number', 2|3|4|5)`: projectAssets 10, frames 5, sceneAssets 3, projects 2, stageStates 1, storyContextService 2, contextManager 2, streamlineBackfillService 1, assetExtractionService 1 (L).
- CURRENT CONSEQUENCE: the contextManager header describes a Phase B local context that has no caller (V3 section 15).
- CONFIDENCE: H.

**SP-27 Downstream readers pick different stage rows, and one reader uses keys no writer stores** `CONTRADICTED` (R1a C10, CONFIRMED on the treatment part; WD-IMPL-FACT-0042; V6-FACT-07)
- OBSERVATION: four readers each select the latest locked row or the latest row of any status. `storyContextService` reads `treatmentProse`, `treatments`, and `selectedTreatmentId`, which no writer stores. The beat section does populate.
- EVIDENCE: contextManager.ts:534-567 (`fetchBeatSheet`) and :509-511 (comment "Same query shape as fetchBeatSheet/fetchMasterScriptSummary"); storyContextService.ts:66-126; projects.ts:1744-1765; streamlineBackfillService.ts:29-49; Stage2Treatment.tsx:26-33 and Stage3BeatSheet.tsx:46-57 (saved keys). R1a marks WD-IMPL-FACT-0075 CONTRADICTED on its beat-key claim.
- CURRENT CONSEQUENCE: the treatment section of story context is always empty (R1a, from code). "Current version" means different things to different readers.
- CONFIDENCE: H.

**SP-28 Location context is reloaded per request and resolved per shot** `PERSISTED` (WD-IMPL-PRESSURE-0033; L-PRESSURE-21; WD-IMPL-PRESSURE-0006; V7-PRESSURE-02)
- OBSERVATION: `loadProjectLocationContext` is called from 12 sites in projects.ts. The shot list GET maps `transformShotForClient` over every shot, and each call runs `resolveShotLocation`. Batch link copy issues sequential per-shot queries.
- EVIDENCE: locationResolverService.ts:309 (definition); projects.ts:1565-1577, 1585, 1784, 2028, 2077, 2224, 2302, 2385, 2452-2506, 2501, 2554, 2706, 2930; projects.ts:79-93 (`buildShotLocationState`); frames.ts:1845-1956 (batch link copy); frameGenerationService.ts:1577-1589.
- CURRENT CONSEQUENCE: one context load per request and one resolver call per shot, with no batch path. Timing is not measured.
- CONFIDENCE: H for counts.

**SP-29 The branch-wide start-frame scan has no row limit** `PERSISTED` (WD-IMPL-PRESSURE-0005; V7-PRESSURE-01; R1 re-check)
- OBSERVATION: the continuity-base start-frame scan has no `.limit` and runs on every continuity preview.
- EVIDENCE: backend/src/services/continuityBaseService.ts:138-173 (scan; `grep -c "\.limit("` on the file returns 0), :106-136; caller routes/projects.ts:3387-3408.
- CURRENT CONSEQUENCE: the query grows with the branch's frame history. The continuity base test batches one query (V7).
- CONFIDENCE: H.

**SP-30 Image prompt, aspect ratio, and style resolution are duplicated across routes** `DUPLICATED` (V5-FACT-01, V5-DEAD-06, V5-PROV-03; V6-FACT-10; WD-IMPL-DEAD-0020)
- OBSERVATION: the aspect-ratio table is defined in four files, and `ANGLE_PROMPTS` in both layers. The edit-image route re-implements background isolation that `ImageGenerationService` also applies, so remove-background edits get the suffix twice. Style resolution has three fallback orders across routes.
- EVIDENCE: Stage5Assets.tsx:89-94; routes/sceneAssets.ts:484-489 and :477-490; image-generation/ImageGenerationService.ts:56-64, :57-89, :124-135, :258-263; services/frameGenerationService.ts:126-129; src/types/asset.ts:153 and :199; projectAssets.ts:1244-1260 (generate), :1470-1488 (edit), :1491-1497 (suffix).
- CURRENT CONSEQUENCE: edit-image and angle routes fall back to the Stage 5 capsule while generate-image does not (V5 section 9). The aspect-ratio fallback order differs by route.
- CONFIDENCE: H for locations, M for outputs.

**SP-31 Two scene parsers exist, one in each layer, and Stage 1 repeats the Stage 4 path** `DUPLICATED` (WD-IMPL-PRESSURE-0041; L-PRESSURE-29; V3 section 6.4)
- OBSERVATION: the frontend parser (`scriptService.extractScenes`) has nine call sites, and the backend parser (`extractManifest`) has eight. Scene identity for `scenes` rows comes from the FE parser, and the dependency manifest comes from the BE parser over TipTap JSON. Stage 1 streamline import repeats extraction and persistence with the comment "replicate it here".
- EVIDENCE: src/lib/services/scriptService.ts; backend/src/utils/scriptManifest.ts (callers include projects.ts:1305 and assetExtractionService.ts:295); Stage1InputMode.tsx:486-497; projects.ts:1301-1305. Heading regex appears in 4 FE files, 2 BE files, and routes/seed.ts (9 occurrences).
- CURRENT CONSEQUENCE: V3 reports an execution in which the frontend parser found 2 scenes and the manifest found 4. The PUT joins by scene number, so dependencies attach by number.
- CONFIDENCE: H for code, executed for the V3 example.

**SP-32 Asset description extraction sends no script text to the model** `DUPLICATED` (V5-AI-01; R1a C11 CONFIRMED; WD-IMPL-ENTITY-0011; WD-IMPL-DEAD-0015)
- OBSERVATION: the description pass sends generic placeholders ("Character appears in scene N"). The script excerpt is computed into `mention.context` and never read. The one pass that sends script text has no caller.
- EVIDENCE: assetExtractionService.ts:542-544 (payload); extractEntityMentions at :362-366 (`@deprecated`, no caller); distillation failure persists the joined placeholders at :637-651.
- CURRENT CONSEQUENCE: the model receives name, type, scene numbers, and style, not script text. A failed distillation persists "Character appears in scene 1 Character appears in scene 4" as the description (V5 section 3.4).
- CONFIDENCE: H (R1a verdict).

**SP-33 Description composition and frame prompt fallbacks are duplicated without a composer** `PERSISTED` (L section 5.5; V6 section 5; V9 section 6)
- OBSERVATION: `image_prompt`, `description_override`, and `effective_description` are composed in many places with no single composer. A scene description is stored in three ways and only partly synchronised. The end-frame fallback string is written twice, and end-frame prompt generation fetches scene assets without assignment scope, while generate-prompts scopes them.
- EVIDENCE: L counts per file: sceneAssets.ts 29, projectAssets.ts 25, assetInheritanceService.ts 14, assets.ts 8, storyContextService.ts 4, shotAssetAssignmentService.ts 3, continuityCompositionService.ts 3, projects.ts 3, textFieldVersionService.ts 2, promptGenerationService.ts 1, frames.ts 1. sceneAssets.ts:622-625 (`??` keeps empty strings); textFieldVersionService.ts:226-240. frameGenerationService.ts:466-468 and :1195-1197 (fallback); frames.ts:519-658; promptGenerationService.ts manifest builders (around :469-603 and :612-663).
- CURRENT CONSEQUENCE: if the second write fails, `effective_description` is stale (V6 section 5). `effective_description` can be an empty string. The two prompt paths can reference different asset sets for one shot.
- CONFIDENCE: M.

---

## 6. The same concept represented differently across layers

**SP-34 Stage numbers, labels, and accepted ranges differ by surface** `CONTRADICTED` (WD-IMPL-PRESSURE-0024; L-PRESSURE-12; L section 6.1)
- OBSERVATION: four label sets exist for stages 1 to 12. Stage 6 is a navigation hub in the UI and has no `stage_number = 6` row in the backend. Accepted ranges differ per endpoint.
- EVIDENCE: ProjectView.tsx:30-34 (Phase A labels 1 to 5); components/pipeline/UnlockWarningDialog.tsx:23-35 (no 6, "Master Script"); SceneWorkflowSidebar.tsx:26-33; config/stageInfoContent.ts:40-104; Landing.tsx:19. Ranges: stageStates.ts:68 and :138 (1 to 12), :310 (lock, 1 to 12), :422 (skip, [2, 3, 4]), :530 (unlock, 1 to 5), sceneStageLocks.ts:62 (7 to 12). `stage_number` 6 occurs zero times in non-test code (grep).
- CURRENT CONSEQUENCE: label and range rules are kept per file. Stage 6 is reached only from ProjectView (ProjectView.tsx:431-435).
- CONFIDENCE: H.

**SP-35 Stage status has several vocabularies, and the UI maps one onto another** `CONTRADICTED` (WD-IMPL-PRESSURE-0023; L-PRESSURE-11; V1-ENTITY-01; V1-STATE-22; WD-IMPL-DEAD-0006, WD-IMPL-DEAD-0012, WD-IMPL-DEAD-0114)
- OBSERVATION: the DB CHECK allows five values (`draft`, `locked`, `invalidated`, `outdated`, `skipped`), and the backend and `BackendStageStatus` match. The UI `StageStatus` type has `locked`, `active`, `pending`, `outdated`, and `skipped`, so `active` and `pending` are never stored, and `draft` and `invalidated` are missing. ProjectView maps stored `draft` to `active`. Progress is derived three ways.
- EVIDENCE: migration 041_stage_states_skip_and_commit.sql:29-32; src/lib/services/stageStateService.ts:3; src/types/project.ts:7-12; ProjectView.tsx:31-34, 44-76, 61-69; projects.ts:399-430 (list, `skipped` mapped to `pending`) and :508-521 (get).
- CURRENT CONSEQUENCE: the dashboard shows skipped stages as pending while ProjectView treats them as passed (V1-ENTITY-01, CONTRADICTED). ProjectCard styles `skipped`, which the list never emits (WD-IMPL-DEAD-0006). The origin subtext for `outdated` has no data (WD-IMPL-DEAD-0012).
- CONFIDENCE: H.

**SP-36 Scene and shot-list lock state is stored in three forms** `PERSISTED` (WD-IMPL-PRESSURE-0044; WD-IMPL-PRESSURE-0065; V8-ENTITY-03; K STATUS)
- OBSERVATION: the shot-list lock is represented by `scenes.shot_list_locked_at` (a timestamp), `scenes.stage_locks['7']` (JSON), and `scenes.status` (set by trigger). The scene-lock JSON uses `draft`, `locked`, and `outdated`, with no `invalidated`. Unlock writes `outdated` downstream, where stage_states would write `invalidated`. Whether both writers always run is UNKNOWN.
- EVIDENCE: migration 014_add_shot_list_locking_with_trigger.sql:31-58 (trigger sets `status = 'shot_list_ready'`) and :19-27 (status values); projects.ts:2975-2991 (writes the timestamp and `stage_locks`), :3143-3148 and :3155 (unlock); sceneStageLocks.ts:7 and :116-118, 256-258, 350-352 (live backward-compatible writes); projects.ts:3146-3148 (downstream `outdated`); backend/quickies-sql/add_stage_locks.sql:1 (the only source of the `stage_locks` column).
- CURRENT CONSEQUENCE: the `stage_locks` column is created only by a quickies file, not a numbered migration. `scenes.status` values `frames_locked`, `outdated`, and `continuity_broken` have no writer (WD-IMPL-FACT-0209).
- CONFIDENCE: H for code. UNKNOWN for the live schema.

**SP-37 Project type literal differs between the database and the frontend** `CONTRADICTED` (WD-IMPL-PRESSURE-0026; L-PRESSURE-14; R1a C09 CONFIRMED; V1-FACT-06; V3 section 0.10)
- OBSERVATION: the DB CHECK and backend validation accept `audio_visual`. The frontend type and the Stage 1 option use `audio-visual`.
- EVIDENCE: migration 001_initial_schema.sql:13; routes/projects.ts:684-686 (validator); src/types/project.ts:31; src/components/pipeline/Stage1InputMode.tsx:92.
- CURRENT CONSEQUENCE: Stage 1 save and streamline commit fail with 400 for that value (R1a C09). The error is caught and logged at Stage1InputMode.tsx:292-294, so the user sees no message.
- CONFIDENCE: H.

**SP-38 The frontend ProjectStatus type has no backing column** `DEAD` (WD-IMPL-PRESSURE-0027; L-PRESSURE-15; K DEAD-0004 note)
- OBSERVATION: `ProjectStatus` (`draft`, `in-progress`, `complete`, `archived`) is declared and used in a type position (project.ts:61). No migration adds a `status` column to `projects`.
- EVIDENCE: src/types/project.ts:1-5; backend/migrations/001_initial_schema.sql:5-22.
- CURRENT CONSEQUENCE: the type is never populated from a stored value.
- CONFIDENCE: H.

**SP-39 The visual style capsule id has five names** `DUPLICATED` (WD-IMPL-PRESSURE-0028; L-PRESSURE-16; WD-IMPL-FACT-0117; WD-IMPL-PROV-0009)
- OBSERVATION: the same concept appears as `visualStyleCapsuleId`, `visual_style_capsule_id`, `locked_visual_style_capsule_id`, `writingStyleCapsuleId`, and `writing_style_capsule_id`, across request bodies, columns, and stage content.
- EVIDENCE: L counts (backend, frontend): `visualStyleCapsuleId` 72 and 21; `visual_style_capsule_id` 55 and 13; `locked_visual_style_capsule_id` 9 and 7; `writingStyleCapsuleId` 4 and 25; `writing_style_capsule_id` 5 and 5. Columns: migrations 004_style_capsule_system.sql:62-63 and 008_global_assets.sql:22. Stage 5 write: Stage5Assets.tsx:227.
- CURRENT CONSEQUENCE: frame generation reads the project column and the stage state through names the writer does not use (SP-72 and section 9).
- CONFIDENCE: M (regex counts).

**SP-40 Case conversion is written by hand at each call site** `DUPLICATED` (WD-IMPL-PRESSURE-0025; L-PRESSURE-13; K CASING)
- OBSERVATION: snake and camel conversion is written as object literals at each site. One transformer module exists, and its input is typed `any`.
- EVIDENCE: L regex counts: backend `camelKey: x.snake_prop` 385 lines and `snake_key: x.camelProp` 138 lines; frontend 39 and 40 lines. backend/src/transformers/styleCapsule.ts:1-57 (`capsuleToApi(c: any)` at :6). Hand mappers at routes/projects.ts:190-224 and shotSplitService.ts:71. K: `TextFieldVersion` and `StyleCapsuleLibrary` are bridged by hand (textFieldVersionService.ts:8 and :15; src/types/styleCapsule.ts:17 and styleCapsuleService.ts:27).
- CURRENT CONSEQUENCE: adding a field needs a manual edit at each mapping site.
- CONFIDENCE: M.

**SP-41 Error responses take two shapes, and the frontend reads one** `DUPLICATED` (WD-IMPL-PRESSURE-0064; L-PRESSURE-52; H-FACT-10; V1-ROUTE-06)
- OBSERVATION: most route errors return `{ error: <string> }`. routes/llm.ts and sceneAssets.ts return `{ success: false, error, code? }`. The shared error handler returns `{ error: { message, code } }`.
- EVIDENCE: 718 `json({ error:` sites in routes, 39 `success: false` sites, 153 `'Internal server error'` responses (grep-confirmed). middleware/errorHandler.ts:22-28 (object body). Frontend reads `error.error` at src/lib/services/checkoutService.ts:40-42 and frameService.ts:579-581.
- CURRENT CONSEQUENCE: an error that reaches the shared handler produces an object-derived message on the frontend (V1-ROUTE-06, conditional). Express 4 async rejections bypass the handler (H section 4, reported).
- CONFIDENCE: H for counts, M for the frontend effect.

**SP-42 Type safety is eroded at the boundaries** `DUPLICATED` (WD-IMPL-PRESSURE-0063; L-PRESSURE-51)
- OBSERVATION: `any` is used at request, row, and LLM-output boundaries. zod is imported in three of the twelve route files that parse input.
- EVIDENCE: `as any` 33 in routes, 17 in services, 7 in src (grep-confirmed). `: any` 102 in routes (L). Six `eslint-disable` lines in non-test code (L). `req.body` read 82 times in routes (L). zod imported in sceneAssets.ts, llm.ts, and shotAssignments.ts.
- CURRENT CONSEQUENCE: field drift between FE and BE (SP-11) produces no compile error.
- CONFIDENCE: H for `as any` counts, M for the others.

**SP-43 "Locked" carries several meanings in the UI and data** `DUPLICATED` (V6 section 6.3; V6 contradictions)
- OBSERVATION: "locked" stands for a stage lock, a `'locked'` tag on an instance, a list badge (image plus modification count), `project_assets.locked`, and a confirmed transformation event. The badge depends on whether an instance was ever updated.
- EVIDENCE: Stage8VisualDefinition.tsx:137-151; VisualStateEditorPanel.tsx:311-324 and :433; SceneAssetListPanel.tsx:60-64; sceneAssetRelevanceService.ts:131-135; migration 017 (modification-count trigger on every UPDATE, :22-47).
- CURRENT CONSEQUENCE: V6 reports that the badge effectively shows "locked" only for instances that were never updated (marked CONTRADICTED in the report). V6's own contradictions section names three meanings, which is not reconciled.
- CONFIDENCE: M.

---

## 7. Mutation fan-out for key mutations

Each entry lists the trigger, the route or service, and the writes in the handler. Writes were checked by grep and were not run.

**SP-44 Script approve writes stage 4 twice and can delete scenes with their dependents** `DUPLICATED` (WD-IMPL-PRESSURE-0043; L-PRESSURE-31; R1b C15 PARTIALLY CONFIRMED; V3 section 6.2)
- OBSERVATION: approve persists the scene list, locks stage 4, and the shell then locks stage 4 again. The scene save deletes scenes that do not match.
- EVIDENCE: Stage4MasterScript.tsx:613-616 (`persistScenes`, `lockStage(4)`) and :621 (`onComplete`); ProjectView.tsx:446-449 and :958 (second lock); stageStates.ts:297-330 (no already-locked guard) and :382 (insert); projects.ts:1217 (PUT scenes), 1379-1387 and 1420 (slug and number match, then number-only fallback), 1430-1434 (hard delete). Cascades: shots (migration 006:7), scene_asset_instances (015:15), video_generation_jobs (021:10), scene_asset_suggestions (024:6), transformation_events (030:17), image_generation_jobs (007:13).
- CURRENT CONSEQUENCE: two `stage_states` version rows per approve. A scene is deleted only when both the slug-and-number match and the number-only fallback miss (R1b C15). The "continuity_broken" marking promised by the dialog is not implemented.
- CONFIDENCE: H.

**SP-45 A deprecated LLM dependency path is reachable from scene save** `LEGACY` (WD-IMPL-PRESSURE-0042; L-PRESSURE-30; K TEMPORAL)
- OBSERVATION: the scene save calls the LLM dependency extractor when the deterministic map is empty, which also holds when the manifest ran and matched no scenes. The module is marked `@deprecated`.
- EVIDENCE: backend/src/services/sceneDependencyExtraction.ts:4, :31, :35, :46 (`@deprecated`, warning "Legacy LLM path invoked"); routes/projects.ts:1301-1305 (manifest), :1332 (manifest error falls through), :1338-1346 (LLM fallback when `dependenciesMap.size === 0`).
- CURRENT CONSEQUENCE: an LLM call can run after a successful deterministic parse with zero matches. V3 calls the path "effectively unreachable", which conflicts with the code condition (section 13). Frequency is UNKNOWN.
- CONFIDENCE: H for the condition, UNKNOWN for frequency.

**SP-46 The shot-list lock writes three places through three calls** `DUPLICATED` (WD-IMPL-PRESSURE-0044; L-PRESSURE-32; V8-STATE-01; K FANOUT; V1-STATE-10)
- OBSERVATION: one lock action writes the scene lock fields three times, through the lock route, the stage-locks hook, and the ProjectView completion handler. The trigger changes only `scenes.status`.
- EVIDENCE: projects.ts:2845-3017 (lock) and :2975-2991 (writes); sceneStageLocks.ts:56-141 (stage-lock write); Stage7ShotList.tsx:697-701; ProjectView.tsx:589-600 (`handleSceneStageComplete`); migration 014:31-58 (trigger).
- CURRENT CONSEQUENCE: the side effects depend on call order. The second and third writes are best effort (SP-74).
- CONFIDENCE: H.

**SP-47 The shot-list unlock uses two systems, and one writes to tables no migration creates** `PARTIAL` (WD-IMPL-PRESSURE-0045; L-PRESSURE-33; R1a C03 and C04 CONFIRMED; WD-IMPL-FACT-0005; WD-IMPL-DEAD-0030; WD-IMPL-DEAD-0078; WD-IMPL-FACT-0144)
- OBSERVATION: the UI confirms the stage-lock unlock, then calls the legacy shot unlock in a try whose catch is empty. The legacy unlock updates `frames`, updates `videos`, and inserts into `invalidation_logs`. The 409 impact body nests `downstreamStages` under `details`, but ProjectView reads it at the top level.
- EVIDENCE: Stage7ShotList.tsx:812-817 (stage-lock unlock; `shotService.unlockShotList` at :815; empty catch at :816); projects.ts:3076-3083 (counts, error not destructured), :3106-3109 (frames update, no error check), :3114-3117 (videos update), :3120-3126 (`invalidation_logs` insert, comment "if invalidation_logs table exists"); stageStates.ts:595-607 (nested 409 body); ProjectView.tsx:691-716 (top-level read).
- CURRENT CONSEQUENCE: the impact dialog never opens, and the else branch auto-confirms the unlock, which runs the downstream cascade with no prompt (R1a C03). The legacy branch is unreachable from the UI, because the stage-lock unlock clears `shot_list_locked_at` first and the legacy call then returns 400 (V8-DEAD-04). The frames status write violates the CHECK in the repo migrations, and its error is unread. `videos` and `invalidation_logs` have no migration (R1a C04, repo DDL). The live schema is UNKNOWN.
- CONFIDENCE: H (code and R1a verdicts). UNKNOWN for runtime and live schema.

**SP-48 Shot mutations do not consult the shot-list lock** `PARTIAL` (WD-IMPL-PRESSURE-0046; L-PRESSURE-34; R1a C05 CONFIRMED; V8-INV-02)
- OBSERVATION: seven shot-mutating handlers never read `shot_list_locked_at` or `stage_locks`. The lock is enforced by the UI and by the lock and unlock handlers only.
- EVIDENCE: projects.ts:1980 (reorder), :2180 (camera direction), :2316 (location), :2399 (PUT shot), :2515 (split), :2657 (merge), :2791 (delete). Lock state is read at projects.ts:1042, :1085, and :2873-3155. Migration 014 raises nothing.
- CURRENT CONSEQUENCE: Stage 9 `ShotAssetPanel` split can change shots of a locked Stage 7 (V8-INV-02, from code). The service-role key bypasses RLS, so the trigger does not gate these writes.
- CONFIDENCE: H.

**SP-49 Shot split, merge, delete, and edit differ in atomicity and invalidation** `PARTIAL` (V8-CAP-03, V8-CAP-04, V8-INV-04, V8-STATE-05, V7-CAP-27; WD-IMPL-INVALIDATE-0082; WD-IMPL-STATE-0098)
- OBSERVATION: split deletes the original shot, shifts order, inserts N rows, clones assignments, and fires stage 9 to 12 invalidation without awaiting it. Merge deletes two rows and inserts one, but does not clone assignments or invalidate. Delete does not compact `shot_order` and does not invalidate. Shot edit leaves prompts, frames, video jobs, and assignments unchanged. Split, merge, and edit re-resolve location fields.
- EVIDENCE: projects.ts:2515-2654 (split), with `shotAssetAssignmentService.ts:318-344` (fire-and-forget invalidation); :2657-2788 (merge); :2791-2840 (delete); :2399-2512 (PUT); re-resolution at :2432-2499, :2578-2590, :2717-2730.
- CURRENT CONSEQUENCE: a failure after the split delete loses the original shot (V8, non-transactional). Merge neighbour lookup breaks when a delete leaves a gap in `shot_order` (V8-FACT-05). Manual location and direction assignments can be lost on split or merge (V7-CAP-27). No code compares `shots.updated_at` with `prompts_generated_at`, so there is no staleness signal (V8-STATE-05).
- CONFIDENCE: H for locations, M for the consequences.

**SP-50 Asset lock is one-way, and generation ignores it** `PARTIAL` (WD-IMPL-PRESSURE-0047; L-PRESSURE-35; V5-STATE-01; R1b C20 CONFIRMED)
- OBSERVATION: `project_assets.locked` is set true by lock-all and by the per-asset lock route. Nothing sets it false. Create and clone paths insert `locked: false`. Text edits, delete, merge, split, and sync check the flag. Generate, upload, analyze, and edit do not.
- EVIDENCE: projectAssets.ts:1565 and :1729 (set true); :127, :351, :1052, :1187, :1962 (inserts with `locked: false`); :586-588 (PUT, with the `isAllowedWhenLocked` carve-out), :702-704, :767-771, :1017-1018, :2084. No lock check at :1210 (generate-image), :1288 (upload-image), :1380 (analyze-image), :1436 (edit-image).
- CURRENT CONSEQUENCE: a locked asset can receive new image jobs and images through these routes. The lock comment says "Stage 5 gatekeeper", but no unlock path exists (V5 section 15).
- CONFIDENCE: H.

**SP-51 A style change fans out through three mechanisms that share no state** `DUPLICATED` (WD-IMPL-PRESSURE-0048; L-PRESSURE-36; WD-IMPL-INVALIDATE-0098; R1a C02 CONFIRMED; V5 C2)
- OBSERVATION: a style change autosaves Stage 5 content (`locked_visual_style_capsule_id`), sets `style_outdated` on assets that have images, and separately clears images on request. Asset capsule ids are copied at insert and never updated. Style change does not regenerate images, and `style_outdated` is advisory.
- EVIDENCE: Stage5Assets.tsx:220-236 (lock style), :262-300 (mark outdated and clear images), :106 (autosave); stageStates.ts:120 (PUT), :247 (insert), :259-275 (`style_capsule_applications`); projectAssets.ts:1587-1618 (mark outdated), :1631-1655 (clear images); ImageGenerationService.ts:406-409 (clears the flag on regeneration).
- CURRENT CONSEQUENCE: the style id that frames read is not the one Stage 5 writes (SP-39, section 9). The only reader of the stale flag is a badge at Stage5Assets.tsx:1153 (H report).
- CONFIDENCE: H.

**SP-52 Image output is written by several paths and selected before the user accepts it** `PARTIAL` (V5-STATE-03, V5-INV-05, V5-INV-07, V5-CAP-04; V6 section 8.3; WD-IMPL-STATE-0038)
- OBSERVATION: `image_key_url` is written by the job fallback, clone localize, sync, clear-all, split, and outside the attempts service. Edit and regenerate results become the selected attempt before acceptance, and Cancel does not revert it. The post-image URL is written by job completion and again by the frontend after polling.
- EVIDENCE: ImageGenerationService.ts:415-418 and :428-440; projectAssets.ts:1651, :2012-2015, :2195-2207; projectAssetAttemptsService.ts:76-79; VisualStateEditorPanel.tsx:211-219 (frontend write-back); projectAssets.ts:1436-1521 (edit). Attempt select runs three statements, and the cap of four can delete an uploaded original (projectAssetAttemptsService.ts:88-124, 170-197).
- CURRENT CONSEQUENCE: `image_key_url` can diverge from the selected attempt (V5 section 2.5).
- CONFIDENCE: M (V5 and V6 reports, lines spot-checked).

**SP-53 Scene defer is one column with a local-only UI reaction** `PERSISTED` (WD-IMPL-PRESSURE-0049; L-PRESSURE-37; V1-INV-12)
- OBSERVATION: `scenes.is_deferred` is written by the defer and restore routes. Stage 6 patches local state and does not invalidate queries. No backend route checks `is_deferred` before generation or shot paths.
- EVIDENCE: migration 027_add_scene_deferral.sql:4; projects.ts:1135-1176 (defer), :1163 and :1204 (writes), :1042 and :1119 (reads); Stage6ScriptHub.tsx:158-159 (local patch), :432-437 (Enter button only); Stage7ShotList.tsx:490.
- CURRENT CONSEQUENCE: deferred scenes stay in dashboard totals (V1-INV-12).
- CONFIDENCE: H.

**SP-54 Confirm-render charges and writes in separate steps, with no refund and a read-modify-write balance** `PARTIAL` (WD-IMPL-FACT-0129; WD-IMPL-FACT-0125; WD-IMPL-FACT-0128; WD-IMPL-STATE-0079; WD-IMPL-DEAD-0091; R1b C14 CONFIRMED; V10-FACT-04, V10-FACT-06, V10-FACT-07)
- OBSERVATION: confirm-render inserts queued jobs, deducts the scene total (including shots with no start frame), and triggers the executor. The deduction is a separate read-modify-write with no transaction and no ledger. Re-confirm inserts a second job set and charges again. `addCredits` has no caller and no route, so nothing is refunded. Frame cost is also added on every status poll of a completed job.
- EVIDENCE: videoGenerationService.ts:318-408 (insert and trigger), :381-394 (deduction), :400 (trigger); userCreditsService.ts:92-121 (read-modify-write), :126-150 (`addCredits`); checkout.ts:91-142 (route); frameGenerationService.ts:1365-1427 and frames.ts:480-512 (cost on poll).
- CURRENT CONSEQUENCE: a failed deduction leaves queued rows uncharged and the executor untriggered (V10-FACT-07). A second confirm duplicates jobs and charges (R1b C14). Failed and skipped jobs are never refunded. Concurrent confirms can race on the balance (not exercised).
- CONFIDENCE: H (code). UNKNOWN (runtime).

**SP-55 Generation, commit, and seed writes are non-transactional and non-idempotent** `PARTIAL` (V5-CAP-02, V5-CAP-12; WD-IMPL-FACT-0356; R1b C19; H-STATE-07; WD-IMPL-ROUTE-0140; WD-IMPL-FACT-0351)
- OBSERVATION: extract-confirm inserts new rows on every call. The Streamline commit RPC has no idempotency key, so a retry after success duplicates stage, asset, and resolution rows. `formatChoice` never leaves the browser. Image, retry, and regenerate keys are prefix plus `Date.now()`, so a lookup never matches. Re-confirm duplicates render jobs (see SP-54). The seed endpoint inserts without idempotency for any authenticated user. Two regenerations of one frame write the same row, keyed by shot and frame type, so the last finisher wins regardless of `current_job_id`.
- EVIDENCE: projectAssets.ts:273-377 and Stage5Assets.tsx:364 (extract-confirm); streamline commit RPC in migrations 043 and 044, and streamline.ts:77; projectAssets.ts:1271, :1509, :3437; frameGenerationService.ts:906, :1303; sceneAssets.ts:506, :2030; assets.ts:447; ImageGenerationService.ts:111-117, :517-536; routes/seed.ts:15 and :193.
- CURRENT CONSEQUENCE: repeated confirms insert duplicates (V5 section 3.4). A retry after commit success duplicates rows (R1b C19). Deduplication does not run for confirm, retry, or regenerate (H-STATE-07, reported).
- CONFIDENCE: H for keys and routes, M for consequences.

**SP-56 A failed frame job leaves the frame generating, and cost is written on poll** `PARTIAL` (R1b C13 CONFIRMED; WD-IMPL-INVALIDATE-0090; WD-IMPL-FACT-0120; V9-FACT-15; V9-STATE-01)
- OBSERVATION: frame generation sets `generating` at start. The executor sets `generated` on success only, and a failure writes nothing. The only writer of `rejected` is a route with no UI caller, and that route also accrues credits. Failed job rows are not reconciled with frames by any other path.
- EVIDENCE: frameGenerationService.ts:871-873 and :1278 (generating); ImageGenerationService.ts:521-531 (success only); frameGenerationService.ts:1397-1437 and frames.ts:480-510 (status route, `rejected`, `total_cost_credits`).
- CURRENT CONSEQUENCE: the frame stays `generating` and the UI keeps polling every 2 seconds (SP-65).
- CONFIDENCE: H.

**SP-57 Continuity and prompt generation overwrite whole columns per shot** `PARTIAL` (V7-CAP-18, V7-CAP-22, V9-STATE-03, V9-INV-09, V7-STATE-06, V9-STATE-06)
- OBSERVATION: generate-prompts overwrites about ten prompt, flag, reference, and continuity columns for each successful shot, with no merge and no check for user edits. Batch link copy sets match mode on shots 2 to n and overwrites start frames. Fresh generation does not clear prior lineage. Regenerate, upload, and select delete incoming frame links, while correction, edited-prompt, and inpaint do not.
- EVIDENCE: projects.ts:3840-3891 and promptGenerationService.ts:1048-1121 (generate-prompts writes); projects.ts:3851-3857 (`start_continuity`, `ai_start_continuity`, reference arrays); frames.ts:1814-1963 (batch link copy); frameGenerationService.ts:876-881 (fresh generation); frames.ts:393 (incoming link delete); promptGenerationService.ts:1085-1091 (previous shot set to null on single-shot regeneration).
- CURRENT CONSEQUENCE: user reference replacements and continuity choices are lost when assignments are absent (V9-STATE-03). Approved start frames are overwritten without confirmation (V7-CAP-18). The reference arrays drop continuity-base entries (V7-CAP-22).
- CONFIDENCE: M (V7 and V9 reports, lines spot-checked).

**SP-58 The derived "outdated" marks are set on some changes and not others** `PARTIAL` (WD-IMPL-INVALIDATE-0082; WD-IMPL-STATE-0098; WD-IMPL-STATE-0065)
- OBSERVATION: shot assignment mutations and split mark stages 9 to 12 outdated, but merge and single delete do not, and shot edit marks nothing. A failed invalidation logs a warning.
- EVIDENCE: shotAssetAssignmentService.ts:318-344 (fire-and-forget); shotAssignments.ts:147, :180, :208, :236 (`.catch(warn)`); projects.ts:2637 (split call); projects.ts:2657-2840 (merge and delete, no call).
- CURRENT CONSEQUENCE: the outdated state for stages 9 to 12 depends on which mutation the user chose.
- CONFIDENCE: H.

---

## 8. Temporal coupling, stage order, and polling

**SP-59 A stage lock requires a row that only a prior save creates** `PERSISTED` (WD-IMPL-PRESSURE-0050; L-PRESSURE-38; R1b C21 CONFIRMED; WD-IMPL-FACT-0008; WD-IMPL-CAP-0049)
- OBSERVATION: the lock route returns 404 when no `stage_states` row exists for the branch and stage. Rows are created only by the PUT handler. Project creation writes no stage rows.
- EVIDENCE: routes/stageStates.ts:331-341 (404 "Stage state not found"), :188-198 (existing-row check in PUT), :247 (insert); routes/projects.ts:553-640 (project insert only); migration 001_initial_schema.sql:166-186 (branch trigger only).
- CURRENT CONSEQUENCE: `/projects/new` creates a project, and the stage-1 lock then returns 404, leaving an orphan project with a draft stage 1 (V1-FACT-08, PARTIAL and broken). Whether the UI ordering creates a stage-1 row first is UNKNOWN.
- CONFIDENCE: H on code. UNKNOWN for UI ordering.

**SP-60 The sequential lock rule and the skip rule are enforced in several places** `DUPLICATED` (WD-IMPL-PRESSURE-0002; V4-PRESSURE-01; WD-IMPL-INVALIDATE-0020; K DEAD-0011)
- OBSERVATION: "lock stage n requires stage n minus one locked or skipped" is enforced in the Node lock and skip routes, inside the `streamline_commit` RPC, and by a global trigger, each with different error text. Skip is restricted to stages 2 to 4, and the streamline routing never assigns a stage 4 skip when a script file is set.
- EVIDENCE: routes/stageStates.ts:344-370 and :422 (`[2,3,4]`); migration 043_intake_resolutions.sql:289-330; migration 044_streamline_atomic_intake_fix.sql:4-36 (trigger); src/lib/utils/streamlineRouting.ts:97-120 (skip at :100, :103, :112).
- CURRENT CONSEQUENCE: the rule has three copies with different messages. The stage 4 skip is unreachable from streamline (WD-IMPL-DEAD-0011, WD-IMPL-DEAD-0109).
- CONFIDENCE: H.

**SP-61 Stage 8 auto-populate runs once per mount and swallows failure** `DEAD` (WD-IMPL-PRESSURE-0051; L-PRESSURE-39; V6-CAP-01)
- OBSERVATION: auto-populate runs `inheritAssets` then `populateFromDependencies` for scenes 2 and later, and only the second for scene 1. A ref guard limits it to one run per mount. A throw from the first call skips the second, and the catch logs and then fails silently.
- EVIDENCE: Stage8VisualDefinition.tsx:208 and :241 (ref guard), :240-272 (sequence), :262-265 (catch, comment "Silently fail").
- CURRENT CONSEQUENCE: a failed populate leaves the scene without assets and with no error shown. The ref prevents a retry in the same mount.
- CONFIDENCE: H.

**SP-62 Autosaves on open and debounced saves interact with stage locks** `PARTIAL` (V3 sections 0.3, 3, and 4; V1-STATE-21; H sections 1.6 and 1.7; WD-IMPL-FACT-0045; WD-IMPL-STATE-0084)
- OBSERVATION: opening Stage 2, 3, or 5 starts a debounced autosave that inserts a new version. Locked rows stay locked but lose their origin, and an outdated row becomes draft. Stage 4 approve is two non-atomic requests, and a debounced PUT can rewrite locked content. Edits within the 2 second debounce of approve reach `scenes` but not the locked content. Locked Stage 2 and 3 bodies stay editable with no downstream invalidation.
- EVIDENCE: useStageState.ts:99-143 (autosave; `autoSave: true` at Stage5Assets.tsx:106); stageStateService.ts:230-262; Stage4MasterScript.tsx:157-171 and :219-225 (debounce cleared on unmount), :186-211 (version on open); Stage1InputMode.tsx:143 (autosave disabled to avoid a race with lock); Stage3BeatSheet.tsx:733; Stage2Treatment.tsx:534-547; stageStates.ts:211-222 (Phase A save over locked row).
- CURRENT CONSEQUENCE: opening a locked or outdated stage writes a new row (runtime UNKNOWN). Locked content changes without unlock or invalidation (V3 section 0.3).
- CONFIDENCE: M (static analysis; runtime UNKNOWN).

**SP-63 Background work runs in-process, fire-and-forget, with a single-process loop and no recovery** `PARTIAL` (WD-IMPL-PRESSURE-0052; WD-IMPL-PRESSURE-0008; WD-IMPL-PRESSURE-0009; WD-IMPL-PRESSURE-0010; WD-IMPL-FACT-0130; WD-IMPL-INVALIDATE-0104; V5-FACT-02; V9-FACT-05)
- OBSERVATION: image jobs run as an un-awaited promise, logged through `.catch`. Video jobs run through a module-level singleton that loops over queued rows, with no row claim. Veo polls the provider inside the job. No semaphore, queue, `p-limit`, or rate limiter exists in the backend. Nothing re-queues rows left in `processing`, `generating`, or `uploading`.
- EVIDENCE: ImageGenerationService.ts:176-181 (`executeJobInBackground`, not awaited); videoGenerationService.ts:400 and :414-423 (trigger, not awaited); video-generation/VideoJobExecutor.ts:15 and :28-33 (instance field `isProcessing`), :54, :62-76 (queue select by status, no claim), :176 (`export const videoJobExecutor = new VideoJobExecutor()`); videoGenerationService.ts:490-500 (update by id); Veo3Provider.ts:224-232 and :26-28 (10 s interval, 5 min limit). Grep for `stuck|recover|orphan|requeue|cron|pg_net` in services, routes, and migrations finds nothing relevant (L section 8; WD-IMPL-PRESSURE-0008 evidence).
- CURRENT CONSEQUENCE: a restart leaves rows non-terminal (V5-FACT-02, WD-IMPL-INVALIDATE-0104). The video loop starts only when a confirm or retry calls the trigger, with no startup hook (H-STATE-03, WD-IMPL-STATE-0111). Two API instances can run the same queued row, duplicating provider cost (instance count UNKNOWN).
- CONFIDENCE: H (code). UNKNOWN (runtime restart behaviour, instance count).

**SP-64 Retries cannot dedupe or limit spend** `PARTIAL` (WD-IMPL-PRESSURE-0011; WD-IMPL-FACT-0131; V10-FACT-09; V10-STATE-02)
- OBSERVATION: automatic retry ignores the provider error's `retryable` flag. Manual retry sets the job to queued without resetting `attempt_count`, so the retried job gets one attempt. Retry does not check for an active job.
- EVIDENCE: VideoJobExecutor.ts:144-171 (auto-retry); videoGenerationService.ts:563-597 (manual retry); video-generation/Veo3Provider.ts:17-24 (error classes); migration 021:57-58 (`DEFAULT 3`).
- CURRENT CONSEQUENCE: a permanent error is retried as a billable Veo call (V10-FACT-09). The manual retry contradicts the `max_retries` design (V10-STATE-02, H section 5.2).
- CONFIDENCE: H.

**SP-65 Client timeouts end before server work does, and polling loops never end on stranded states** `PARTIAL` (WD-IMPL-PRESSURE-0012; WD-IMPL-PRESSURE-0053; WD-IMPL-FACT-0066; WD-IMPL-FACT-0068; V5-FACT-03)
- OBSERVATION: the image-job client polls once per second for 60 attempts, then shows a timeout toast while the job continues. Stage 10 polls frames every 2 seconds with no ceiling while any frame is generating. Stage 12 polls every 3 seconds while a job is non-terminal. Stage 6 polls every 10 seconds. AssetDialog runs `setInterval` and `setTimeout` without unmount cleanup. `frameService.pollUntilComplete` marks a frame complete on any error and has no caller. Veo polls every 10 seconds for up to 5 minutes inside a job.
- EVIDENCE: projectAssetService.ts:385-424; Stage10FrameGeneration.tsx:252-259; Stage12VideoGeneration.tsx:59-68; Stage6ScriptHub.tsx:126-129; AssetDialog.tsx:129, :205, :258-266; frameService.ts:593-632 (dead poller); Veo3Provider.ts:224-232.
- CURRENT CONSEQUENCE: a timed-out image job can still write later (V6 section 7.1). After a restart, a stranded row never reaches a terminal state, so the UI polls without end (H section 3.4, reported).
- CONFIDENCE: H (code). UNKNOWN (runtime).

**SP-66 Race-only timeouts return empty success** `PARTIAL` (WD-IMPL-FACT-0186, verified; WD-IMPL-FACT-0202, wave-1 unverified; V8-FACT-13; V9-FACT-13)
- OBSERVATION: LLM calls race a timeout and do not abort the request. Shot extraction (20 s), prompt generation (30 s), and dependency extraction (15 s) are race-only. The shot extraction timeout returns HTTP 200 with an empty result, and the UI then throws "Shot extraction returned no shots".
- EVIDENCE: shotExtractionService.ts:97 and :195-441 (20 s race, retries); promptGenerationService.ts:143 and :1456-1475; sceneDependencyExtraction.ts:60; llm-client.ts:45-50 (retries up to 3 times); Stage7ShotList.tsx:880-883 (UI throw).
- CURRENT CONSEQUENCE: the underlying call continues and its result is discarded (V8 C10). The API cannot tell an empty success from "no shots", but the UI shows an error.
- CONFIDENCE: H for timeouts, M for the empty-success path (0202 is not verified).

**SP-67 Derived views lag mutations because caches are not invalidated** `PARTIAL` (V7-STATE-09; V6 section 8.3; V1-STATE-20; V10-FACT-04)
- OBSERVATION: Stage 10 uses a 30 second stale time and is not invalidated by frame mutations. Stage 9 reloads only on specific events. The Stage 8 gatekeeper count is not invalidated on confirm, add, or delete. The ProjectView restore effect refetches stage locks on every save and overwrites the completed list. The checkout balance is not invalidated after confirm. `TransformationEventCard` initialises its text once.
- EVIDENCE: Stage10FrameGeneration.tsx:261-269; Stage9PromptSegmentation.tsx:174-194; VisualStateEditorPanel.tsx:114 and :143-163; Stage8VisualDefinition.tsx:313-320 and :721-734; ProjectView.tsx:392-444; TransformationEventCard.tsx:49-50 and :62-71.
- CURRENT CONSEQUENCE: the candidate list and gatekeeper count can lag until refetch. AI-written text can be replaced by the old text on the next blur (V6 section 8.3).
- CONFIDENCE: M.

**SP-68 Phase B order and lock gating are enforced in the UI and the client only** `PARTIAL` (V1-INV-13, V1-STATE-17; V9-FACT-08, V9-FACT-09; V8-INV-02; V6-INV-08; H sections 2.4 and 3.5)
- OBSERVATION: Phase B order is enforced by ProjectView and the sidebar. A URL with a Phase B stage and scene id opens that stage. Stage 9 and 10 lock preconditions are checked in React only. Stage 8 locks are client-side. Route gating in the SPA is client-side (App.tsx:93-128). The Phase B gate uses a localStorage flag. Hydration is skipped when a project has no stage rows, so the guard never runs.
- EVIDENCE: ProjectView.tsx:236-308 (routing), :311-389 (hydration), :108 and :202-221 (localStorage gate); SceneWorkflowSidebar.tsx:63-83; Stage10FrameGeneration.tsx:1694-1700; Stage9PromptSegmentation.tsx:845, :923, :518 (textareas stay editable when locked); Stage8VisualDefinition.tsx:137-151 and :713-734.
- CURRENT CONSEQUENCE: the backend lock route has no frames precondition (V9-FACT-08), and no backend route checks the Stage 8 lock (V6). Server enforcement is UNKNOWN (H section 12).
- CONFIDENCE: H (code). UNKNOWN (server enforcement).

**SP-69 Stage order and dependencies use snapshots that do not propagate upstream edits** `PARTIAL` (V3 sections 5 U28 and U15; V1-CAP-27; V1-STATE-04)
- OBSERVATION: full regenerate in Stage 2 uses the stored `processedInput`, and Stage 3 regenerates only when empty. Write-this-myself on a skipped stage cascades downstream outdated marks, though its comment says nothing is at risk. Outdated has no Phase A exit: Edit calls unlock, which returns 400 for outdated, and no lock or re-lock control is passed to the header.
- EVIDENCE: Stage2Treatment.tsx:354-369 and :159; Stage3BeatSheet.tsx:273-284 and :523-538; ProjectView.tsx:653-669 and stageStates.ts:568-655 (write-this-myself); Stage2Treatment.tsx:437-446 and LockedStageHeader.tsx:99-131 (outdated has no exit).
- CURRENT CONSEQUENCE: upstream edits do not reach regenerated downstream content (V3). The write-this-myself comment and behaviour disagree (V1-CAP-27).
- CONFIDENCE: M.

---

## 9. Swallowed errors and silent fallbacks

**SP-70 Route catch blocks mostly respond, but the frame path has empty catches** `PARTIAL` (WD-IMPL-PRESSURE-0055; L-PRESSURE-43; WD-IMPL-FACT-0319)
- OBSERVATION: most route catches respond to the client. Some log only, some log and return a fallback, and two on the frame path are empty.
- EVIDENCE: L classes across 12 route files: 197 respond; 13 log only (projectAssets.ts:1997, :2024, :2116; projects.ts:1332, :1354, :3132, :3383, :3747, :3827; sceneAssets.ts:269; seed.ts:196; stageStates.ts:277; streamline.ts:227); 3 log and fall back (llm.ts:227 sets `writing_style_context = ''`; llm.ts:256; streamline.ts:294 defaults to `Unnamed subject`); 2 empty (frames.ts:573 and :2220); 2 fall back without a log (projectAssets.ts:2132; sceneAssets.ts:1438). Fire-and-forget `.catch` on 6 non-awaited promises (shotAssignments.ts:147, :180, :208, :236; projects.ts:2637; frames.ts:649).
- CURRENT CONSEQUENCE: a failed style-capsule load reaches generation with no capsule and no log (SP-25). Generation proceeds without style when llm.ts:227 fails (V3 section 10).
- CONFIDENCE: H (frames.ts:568-574 and :2215-2222 checked).

**SP-71 Supabase results are often unread** `PARTIAL` (WD-IMPL-PRESSURE-0056; L-PRESSURE-44; WD-IMPL-FACT-0155)
- OBSERVATION: single-line destructures without `error`, and bare `await supabase` statements, are common in routes and services. Several unread results feed visible counts or writes.
- EVIDENCE: 136 single-line destructures without `error` in routes (upper bound), 53 bare statements in routes, 32 in services (L). projects.ts:3076-3083 (count query; `videosAffected` becomes 0 on error), :3106-3117 (frame and video updates, no check); sceneStageLocks.ts:211-219 (same pattern); frames.ts:261-267 (`state_data` read with `.single()`, `data` only); frames.ts:1458-1470 (storage remove, not checked before the row delete).
- CURRENT CONSEQUENCE: failed writes and reads become silent. The unlock summary reports zero videos when the query fails.
- CONFIDENCE: M for the counts (upper bound), H for the named examples.

**SP-72 Frame style capsule reads a column that does not exist, and the project-level capsule is never written** `CONTRADICTED` (WD-IMPL-PRESSURE-0029, WD-IMPL-PRESSURE-0030; L-PRESSURE-17, L-PRESSURE-18; R1a C01 and C02 CONFIRMED; WD-IMPL-FACT-0141; WD-IMPL-FACT-0020)
- OBSERVATION: five frame-route handlers select `state_data` by `project_id` and `stage_number` 3 from `stage_states`. Neither `state_data` nor `project_id` exists on that table in any migration. The `.single()` error is not read. Separately, the project-level column `projects.visual_style_capsule_id` is read at frames.ts:527, :569, :2156, and :2216, projects.ts:3584 and :3740, and contextManager.ts:499, but no code writes it (the PUT route at projects.ts:640-680 accepts other fields only).
- EVIDENCE: routes/frames.ts:261-267 (`stage_number` 3 filter at :264), :384-390, :448-454, :766-772, :844-850; the value is passed at :269-275 (`generateFrames(..., visualStyleCapsuleId, aspectRatio)`); `stage_states` columns in migrations 001_initial_schema.sql:51-75 and 041:38.
- CURRENT CONSEQUENCE: `visualStyleCapsuleId` is undefined in the five handlers (R1a C01). Whether the database returns an error or an empty result is UNKNOWN (no live database).
- CONFIDENCE: H (code and R1a verdict).

**SP-73 Frontend catch blocks are log-only or empty** `PARTIAL` (WD-IMPL-PRESSURE-0057; L-PRESSURE-45; H section 1.4 scan)
- OBSERVATION: non-test `src` has 202 catch blocks. L classes 19 as empty, 102 as console-only, and 81 as other. The H-report brace scan gives 19 comment-only and 31 console-only, with the same total (section 13).
- EVIDENCE: empty catches at Stage7ShotList.tsx:701 and :816, Stage12VideoGeneration.tsx:237, Stage8VisualDefinition.tsx:493 and :531, Landing.tsx:107, beatService.ts:475 (spot-checked).
- CURRENT CONSEQUENCE: user-visible error paths depend on the "other" class. The H report finds no ErrorBoundary.
- CONFIDENCE: H for the total, M for the class split.

**SP-74 Best-effort lock writes advance the UI without a confirmed lock** `PARTIAL` (WD-IMPL-PRESSURE-0054; V1-CAP-37; V9-CAP-08; Stage7ShotList.tsx:701 and :816)
- OBSERVATION: scene-stage components call lock and then `onComplete`, and lock errors are logged or ignored. The UI advances whether or not the lock succeeded.
- EVIDENCE: Stage8VisualDefinition.tsx:171-172; Stage9PromptSegmentation.tsx:959-969 and :962-963; Stage10FrameGeneration.tsx:1694-1700 and :1695-1696; Stage12VideoGeneration.tsx:237-238 (`try { await lockStage(12) } catch {}`); ProjectView.tsx:589-615.
- CURRENT CONSEQUENCE: "Lock failure is ignored, so onComplete still advances" (V9-CAP-08). A failed lock write is not retried.
- CONFIDENCE: H.

**SP-75 Generation, extraction, and content paths substitute failures and defaults** `PARTIAL` (V7-STATE-04, V7-CAP-24, V7-FACT-12, V7-AI-02; V8-FACT-11, V8-FACT-13; V5-CAP-02, V5-CAP-14, V5-CAP-15; V3 section 3; V6 section 11)
- OBSERVATION: frame generation ignores a base frame that is not approved or generated and keeps the selection. Match propagation catches and logs. Match-event insert failure is a warning. Vision failure throws with no fallback. The regex camera fallback defaults to medium, eye level, and static. Extraction timeout or second parse failure returns empty shots, and invalid shots are dropped. Localizer failures are swallowed. Split re-point errors are only logged. Merge LLM failure falls back to string concatenation. Unparseable treatment or beat output becomes one variation or one beat holding raw text. Streamline classification defaults to `Unnamed subject`.
- EVIDENCE: frameGenerationService.ts:626-709 (ignored base), :720-840 (vision), :1545-1596 (propagation catch); locationResolverService.ts:482-506 (warn only); promptGenerationService.ts:169-227 (camera fallback); shotExtractionService.ts:313-440; assetImageLocalizer.ts:33-108; projectAssets.ts:981-1124 and :1937-1946; assetDescriptionMerger.ts:85; treatmentService.ts:351-456; beatService.ts:303-441; transformationEventService.ts:472-491; routes/streamline.ts:294.
- CURRENT CONSEQUENCE: the UI shows "Fresh generation" while the base is still used (V7 contradiction 4). Extraction failure shows a reload retry (V8-FACT-13). Merge concatenation is persisted as the description (V5 section 3.4). The "Confirm and Lock" toast can fire before the lock succeeds (V3 section 3).
- CONFIDENCE: M (partly based on functional tags in the source reports).

**SP-76 Storage and delete paths drop errors or leave objects behind** `PARTIAL` (WD-IMPL-FACT-0155; V9-PROV-06; V3 section 6.2; H section 6.4)
- OBSERVATION: deleting a frame attempt removes from bucket `frames`, which is never written to, and deletes the job row without checking the storage error. Upload writes to `asset-images`, while delete removes from `frames`. Project delete removes the project row only. Location-view delete removes the frame's storage object while frames still reference its URL. A PUT scenes error is ignored in the continue path.
- EVIDENCE: frames.ts:1458-1470 and :1465 (bucket `frames`), :1109-1122; projects.ts:3961-4004 (project delete); projectAssets.ts:3158-3162 (location-view path from `image_key_url`); ImageGenerationService.ts:378-384 and :621-622; projects.ts:1420-1442 (delete errors logged, processing continues).
- CURRENT CONSEQUENCE: stored objects are not removed (V9-PROV-06, CONTRADICTED in the report). Storage objects remain after project delete (H report). Partial scene persistence is possible when a delete error is ignored (V3 section 6.2).
- CONFIDENCE: H for locations, M for consequences.

**SP-77 Sign-up and save indicators do not reflect the actual state** `PARTIAL` (V1-CAP-01; V1-STATE-01; V3 section 3 Stage 1; WD-IMPL-FACT-0045)
- OBSERVATION: `signUp` sets the user even when Supabase returns no session. Stage 1 shows "All changes saved" while autosave is disabled. Stage save inserts `style_capsule_applications` and ignores failure.
- EVIDENCE: src/lib/stores/auth-store.ts:28-49; Stage1InputMode.tsx:143 and :903-905; stageStates.ts:259-275.
- CURRENT CONSEQUENCE: API calls throw "User not authenticated" after redirect. The email confirmation setting is UNKNOWN (V1-CAP-01).
- CONFIDENCE: M.

---

## 10. Ownership checks: duplication and gaps

**SP-78 Project ownership is re-implemented in each handler** `DUPLICATED` (WD-IMPL-PRESSURE-0058; L-PRESSURE-46; H section 10; K section 2.5)
- OBSERVATION: 176 of 198 route registrations take a project path parameter, and 168 of those reference `user_id`, `req.user`, `userId`, or the helper. Each handler does its own project lookup and its own 404 message. The one shared helper is used only in its own file. Only `shotAssignments.ts` checks the full project, scene, and branch chain.
- EVIDENCE: inline `from('projects')` lookups in routes: 158 (projectAssets 37, frames 28, sceneAssets 29, projects 31, streamline 8, checkout 8, stageStates 9, sceneStageLocks 4, assets 1, images 2, shotAssignments 1). Literal `'Project not found'` 404s: 148 single-quoted matches (L counts 150). `.eq('user_id', userId)` in routes: 167. Helper `verifyProjectOwnership` at routes/shotAssignments.ts:36-72, with 9 matches including the definition, all in that file. projects.ts:284 and :496 (project-only checks).
- CURRENT CONSEQUENCE: variants differ in 404 text and in chain depth. L counts eight project-parameterised handlers with no user reference, while its table lists seven.
- CONFIDENCE: H.

**SP-79 Transformation-event routes perform no ownership or scene check** `DEAD` (WD-IMPL-PRESSURE-0059; L-PRESSURE-47; WD-IMPL-ROUTE-0136; WD-IMPL-INVALIDATE-0011, CONTRADICTED; V6 R23 to R29)
- OBSERVATION: seven of the eight transformation-event handlers have no ownership check. The service methods take no user argument. The generate-post-image handler on the same resource does check ownership, so the family is inconsistent.
- EVIDENCE: routes/sceneAssets.ts:1813 (list), :1828 (create), :1852 (update), :1871 (confirm), :1886 (delete), :1901 (post description), :1916 (prefill). sceneAssets.ts:1944 checks `req.user!.id` and the projects table. transformationEventService.ts:217 (no user parameter). transformationEvents.test.ts does not import supertest.
- CURRENT CONSEQUENCE: any authenticated user who knows the project, scene, and event ids can read or change that scene's transformation events (from code; not exercised). WD-IMPL-INVALIDATE-0011 says every slice route checks ownership, which the code contradicts.
- CONFIDENCE: H (code). UNKNOWN (exploitability).

**SP-80 Ownership is checked on the project but not on the nested ids** `PARTIAL` (WD-IMPL-ROUTE-0137; WD-IMPL-ROUTE-0138; WD-IMPL-FACT-0135; V8-INV-06; V9-INV-04; V6 section 15)
- OBSERVATION: the checks bind the project, not the child ids in the path or body. Checkout video-job routes bind neither the job nor the scene. The image generate route passes body ids through. Frame-scoped routes check the project only. Assignment routes check project and branch, not that the assignment, shot, or instance belongs to the scene. Scene-asset routes check `instance.scene_id` but not scene-to-project membership.
- EVIDENCE: checkout.ts:208-237 (video job get, project check only), :243-266 (render status), :301-324 (retry calls `retryJob(jobId)` at :318); videoGenerationService.ts:445-453, :563-569; images.ts:26-36 (body `assetId`, `shotId`, `sceneId`, `branchId` unbound); frames.ts:1315-1400 and :1406-1492; shotAssignments.ts (mounted at server.ts:57); sceneAssets.ts:1635-1638; ImageGenerationService.ts:201-208.
- CURRENT CONSEQUENCE: the job retry runs a provider call with no credit check (WD-IMPL-FACT-0135). The image route writes attempts, frames, and instances under body ids (H section 10). Any authenticated owner of one project can reach child ids of another project (inferred, not run).
- CONFIDENCE: H (paths checked). M for exploitability.

**SP-81 Template and seed routes have no owner check when the owner id is null** `CONTRADICTED` (WD-IMPL-PRESSURE-0060; L-PRESSURE-48; R1b C17 CONFIRMED; WD-IMPL-ROUTE-0140; K DEAD-0049)
- OBSERVATION: `GET /api/llm/templates/:id` has no owner check, and `getTemplate` selects by id only. Update, delete, and activate check `created_by` only when a user id is passed. Seeded templates have `created_by` NULL, so any authenticated user can change them.
- EVIDENCE: routes/llm.ts:527-565; services/prompt-template.ts:94-96, :207, :240, :375; routes/seed.ts:15 and :193.
- CURRENT CONSEQUENCE: any authenticated user can seed, edit, delete, and activate the stage 2 to 4 templates. Eleven `/api/llm` admin and template routes have no frontend caller (K DEAD-0049).
- CONFIDENCE: H.

**SP-82 Authentication middleware is re-entered at each router mount** `IMPLEMENTED` (H section 10; V1-ROUTE-06)
- OBSERVATION: `authenticateUser` is attached to nine mounts under `/api/projects`, and to each other router mount. A request that does not match an early router passes the middleware again at each later mount.
- EVIDENCE: backend/src/server.ts:49, :52, :54, :57, :60, :63, :66, :69, :72 (nine `/api/projects` mounts), :75, :78, :81, :84, :87 (other mounts). `req.user` is referenced 187 times in route files (grep).
- CURRENT CONSEQUENCE: auth can run up to nine times for a request to a late router (derived from mount order, not measured). The behaviour is functional but redundant (V1-ROUTE-06).
- CONFIDENCE: H (mount count). M (per-request count).

---

## 11. Test coupling to implementation

**SP-83 Backend tests bind to Supabase call order, and some run on copies of logic** `DUPLICATED` (WD-IMPL-PRESSURE-0061; L-PRESSURE-49; V3 section 13; V6 section 16; V7-TEST-02; V8-TEST-06; K TEST-COUPLING)
- OBSERVATION: the shared `supabaseMock` helper queues results per `.from()` call, so a test must know the order of table calls in the route under test. Six test files use `mockResolvedValueOnce` or `mockReturnValueOnce` 193 times. Several other tests re-declare constants or re-implement logic, then assert on the copy. Continuity parity tests feed the preview output back in as persisted state, so parity holds by construction.
- EVIDENCE: backend/src/tests/helpers/supabaseMock.ts:1-15 (header comment, consumes "the next queued result for that call site"), 90 lines. `Once` counts: assetTypeAndMerge.test.ts 55, shotLocationRoutes.test.ts 36, shotAssetAssignment.test.ts 35, continuityBaseAndModeRoutes.test.ts 32, transformationPrefill.test.ts 21, continuityBaseService.test.ts 14 (total 193). 16 test files mock `config/supabase` (grep). `mockFrom` appears in 189 lines of backend tests (L counts 148 call-argument assertions). storyContextService.test.ts:10-16; textFieldVersionService.test.ts:1-8; continuityCompositionService.test.ts:186-318; ShotAssetTimeline.test.ts (does not import the component); resolveConflict.test.ts (sole importer of an unreachable module).
- CURRENT CONSEQUENCE: a route that adds, removes, or reorders a `from()` call breaks several tests with no behaviour change. The named services are not exercised by these tests (V3 section 13).
- CONFIDENCE: H for counts. M for the `mockFrom` split and the copy-logic examples.

**SP-84 Several route families have no runtime or route-level test** `PARTIAL` (WD-IMPL-TEST-0015; V8-TEST-03; V10-TEST-01; V1-TEST-08; V5-TEST-02; L section 11)
- OBSERVATION: 12 files use supertest, and none of the seven transformation-event routes is tested at route level. Shot lock and unlock DB-backed cases are `it.skip`, so only the 401 cases run. There are no automated tests for checkout, credits, jobs, providers, or Stage 11 and 12. The image-generation test calls master-asset jobs without a style, which current `createImageJob` rejects. The e2e spec navigates to `?stage=7`, which renders Script Hub.
- EVIDENCE: L section 11; transformationEvents.test.ts (24 `it`s, no supertest); shotLocking4_5_task_11.test.ts; V10 section 10 (veo3-test.ts is a manual live call); e2e/enhanced-upload-modal.spec.ts:121; image-generation.test.ts:116-119 against ImageGenerationService.ts:139-141.
- CURRENT CONSEQUENCE: the shot-lock and unlock behaviour in SP-47 has no DB-backed test that runs. The frontend count is 26 test files under `src` by this synthesis (L counts 33; section 14, item 6).
- CONFIDENCE: H for file-level claims. M for coverage, which was not measured.

---

## 12. Double locking and duplicate writes

**SP-85 Lock writes are duplicated between component and shell** `DUPLICATED` (WD-IMPL-PRESSURE-0054; L-PRESSURE-42; V1-FACT-04; V3 section 3)
- OBSERVATION: Stage 4 locks twice, once in the component and once in the `onComplete` shell. Stage 7 writes the scene lock three times (SP-46). Stage 5 completion calls `lockAllAssets` and then `lockStage(5)`, with no rollback. Stages 8 to 12 lock before `onComplete`, and the shell locks again through `handleSceneStageComplete`.
- EVIDENCE: Stage4MasterScript.tsx:616 and :621; ProjectView.tsx:446-449 and :958; Stage7ShotList.tsx:697-701; Stage5Assets.tsx:777-779; Stage12VideoGeneration.tsx:237; ProjectView.tsx:589-600.
- CURRENT CONSEQUENCE: each stage lock writes two version rows or two timestamps. Lock side effects depend on call order and on best-effort try blocks.
- CONFIDENCE: H.

**SP-86 Every save, lock, and autosave inserts a stage version row, and concurrent writers have no version guard** `PERSISTED` (WD-IMPL-FACT-0045; WD-IMPL-STATE-0084; WD-IMPL-STATE-0026; V9-STATE-04; V1-INV-10; H section 1.10)
- OBSERVATION: every `PUT /stages/:n` inserts a version row. Autosave on open and locks insert more. A save over an outdated or skipped row becomes draft. `_styleCapsuleMetadata` is re-sent on every autosave, inserting a `style_capsule_applications` row each time. Phase A version creation reads the latest row and inserts the next, and the unique constraint makes one concurrent writer fail with 500. `scenes.stage_locks` is updated by read-modify-write with no version. `createVersion` in text field versions is a sequence of separate calls.
- EVIDENCE: stageStates.ts:188-198 (existing-row check), :247 (insert), :259-281 (style application insert); stageStateService.ts:104-109; useStageState.ts:100-143; Stage4MasterScript.tsx:188-216; migration 001_initial_schema.sql:77 (unique); projects.ts:2968-2977 and :2991 (read-modify-write); textFieldVersionService.ts:181-202; migration 043:189-192 and 044:62 (`FOR UPDATE` on commit only).
- CURRENT CONSEQUENCE: versions accumulate per save, and a load alone can change the latest row's status (runtime UNKNOWN). The version race loser receives 500. A lost update on `stage_locks` is possible and not exercised. Whether the text field version WHERE clause blocks concurrent double-select is UNKNOWN (V9 section 14).
- CONFIDENCE: H (code). UNKNOWN (runtime).

**SP-87 Credit and cost accrual has no ledger, and frame cost accrues on each poll** `PARTIAL` (WD-IMPL-FACT-0129; WD-IMPL-STATE-0114; H section 4.2 F4 and 5.4)
- OBSERVATION: `userCreditsService` reads, computes, and writes the balance in one request with no transaction and no ledger row. Frame cost is added on every status poll of a completed job. Scene total cost is summed from completed jobs for display. The 100.00 starting balance and 10.00 low threshold are code constants.
- EVIDENCE: userCreditsService.ts:92-121 (deduction), :20-21 (constants); frameGenerationService.ts:1365-1427 and frames.ts:480-512 (poll accrual); videoGenerationService.ts:381-394.
- CURRENT CONSEQUENCE: concurrent confirms can race on the balance (not exercised). Frame cost accrues on every poll (H section 4.2 F4).
- CONFIDENCE: H (code). UNKNOWN (runtime).

---

## 13. Contradictions and unknowns

Contradictions (preserved, not resolved):

- Comment or UI claims that contradict behaviour (WD-IMPL-PRESSURE-0007, V10-PRESSURE-01): videoGenerationService.ts:344 says shots without an approved start frame are skipped, but the check is URL presence only. Stage11Confirmation.tsx:366-368 says no edits are possible after confirmation, but unlock and re-confirm are possible. The VideoJobExecutor header says it polls, and its step-5 comment expects an upload that Veo performs inside the provider.
- K section 5.4 says the frontend has no direct table access. `src/hooks/useSceneInfo.ts:26` contains `.from('scenes')`, and `imageService.ts:146-155` reads `projects` (SP-05). L is correct here.
- The H-report brace scan counts 31 console-only frontend catches and 19 comment-only ones. L counts 102 console-only and 19 empty. The total of 202 agrees (SP-73).
- The H-report backend catch scan (290 total, 7 comment-only, 22 log-only) was not reproduced in this synthesis.
- V3 calls the deprecated LLM dependency path "effectively unreachable". The code condition at projects.ts:1338-1346 holds whenever the map is empty, including when the manifest matched no scenes (SP-45). L and K treat the path as reachable.
- K marks WD-IMPL-DEAD-0031 (Stage 7 relock has no producer of `outdated`) as DEAD. `sceneStageLocks.ts:245-249` writes `outdated`, and K's own contradictions list says the relock path is reachable (WD-IMPL-CAP-0041, WD-IMPL-STATE-0095, WD-IMPL-INVALIDATE-0007).
- K marks the Phase A unlock dialog DEAD (WD-IMPL-DEAD-0078). R1a C03 and WD-IMPL-FACT-0005 describe the same behaviour as a contradiction. They agree that the dialog never opens (SP-47).
- WD-IMPL-INVALIDATE-0011 says every slice route checks ownership. The transformation-event routes do not (SP-79).
- R1b C15 (PARTIALLY CONFIRMED) qualifies L-PRESSURE-31: a scene is deleted only when both the slug-and-number match and the number-only fallback miss (SP-44).
- R1a notes that the frame invalidation write is rejected silently only if the CHECK constraint is live. No later migration widens it (SP-47, SP-72).
- V7 labels the two location classifiers (0.72 and 0.8) CONTRADICTED. R1a C07 CONFIRMED them as live and disagreeing in the range [0.72, 0.8) (WD-IMPL-FACT-0083, WD-IMPL-FACT-0344).
- The VideoJobExecutor header says it polls. Its loop uses a 500 ms spacer and no timer, which H-state and V10 mark CONTRADICTED. L describes the same loop as polling with a spacer. Both are kept.
- V6 gives five meanings for "locked" and names three in its own contradictions section (SP-43).

Unknowns (runtime or live-schema dependent; no database, network, or server was used):

- Whether the live database has `videos`, `invalidation_logs`, and `scenes.stage_locks`. No migration creates `videos` or `invalidation_logs`, and `stage_locks` appears only in backend/quickies-sql/add_stage_locks.sql:1 (C04: repo DDL confirmed, live state UNKNOWN). The quickies file says it ran on production, which cannot be verified here.
- Whether `frames.status = 'invalidated'` is rejected at runtime (SP-47, SP-08).
- Whether `projects.visual_style_capsule_id` is ever non-null. No writer exists in repo code, and an RPC or SQL default is not ruled out (SP-25, SP-72).
- Whether a stage-1 `stage_states` row exists for UI-created projects before any save (SP-59).
- Runtime frequency of the legacy LLM dependency path (SP-45).
- Whether `llm.ts` template variables carry `writing_style_capsule_id` end to end.
- Deployed values of `GEMINI_MODEL` and `VIDEO_PROVIDER`, and whether production boots (SP-16, SP-17, SP-20).
- Whether the Veo model ids are accepted by the provider (SP-18), and whether output dimensions for frames are fixed (SP-19).
- Runtime truncation of treatment output at 4096 tokens (SP-23).
- Whether the LangSmith trace variable is `true` in any deployment (WD-IMPL-FACT-0105 context).
- Number of API instances, and whether two instances run the same video row (SP-63).
- Whether an automatic stop of the Fly machine interrupts in-flight jobs (SP-63).
- Whether frame status polls produce repeated cost accrual in production (SP-56, SP-87).
- Whether the Stage 7 double writes always run, and whether the lock calls race (SP-46).
- Exploitability of the ownership gaps in SP-79 and SP-80 (no request was executed).
- Whether `projects.writing_style_capsule_id` is written by an RPC (K).

---

## 14. Corrections made while synthesizing

Each correction was made against repo evidence or a verified report verdict during this synthesis.

1. L-PRESSURE-23: the title says "four key-check behaviours" and the body says "three". The evidence lists four checks (llm-client.ts:91, imageAnalysisService.ts:25-27, NanoBananaClient.ts:21-23, llm.ts:143). This document uses four (SP-16).
2. L-PRESSURE-31: unmatched scenes are not simply hard-deleted. R1b C15 qualifies this: deletion needs a miss on both the slug-and-number match and the number-only fallback (projects.ts:1379-1387 and :1420). The "continuity_broken" marking promised by the dialog is not implemented (SP-44).
3. L-PRESSURE-40: `VideoJobExecutor.ts:15` is described as a "module-level boolean". It is an instance field, `private isProcessing = false`. The class is exported as a singleton at VideoJobExecutor.ts:176 (SP-63).
4. L-PRESSURE-17: the frame read is described as filtering `project_id` only. The code at frames.ts:261-267 also filters `stage_number` to 3 (SP-72).
5. L-PRESSURE-35: `locked: false` is described as appearing only in create paths. The clone insert at projectAssets.ts:1962 is part of the clone path (SP-50).
6. L section 11 counts 45 backend and 33 frontend test files. This synthesis counts 41 backend and 26 frontend files, matching `*.test.*` or `__tests__` (SP-84). The L pattern may differ.
7. L-PRESSURE-49 counts 148 `mockFrom` assertion lines. This synthesis counts 189 lines containing `mockFrom` in backend tests. The patterns differ, so both figures are kept (SP-83).
8. K section 5.4 and the H-report claim about frontend persistence are contradicted by grep. The `scenes` read is one hook used by five stage components, and the `projects` read is in an orphaned module (SP-05).
9. The H-report error handler citation (`errorHandler.ts:52-73`) is wrong. The file is 29 lines, and its `{ error: { message, code } }` body is at lines 22-28. V1's `:8-29` covers the function (SP-41).
10. L-PRESSURE-43 places the two empty catches at frames.ts:573 and :2220. Both are confirmed, and the comment for the first is at :574 (SP-70).
11. L section 10.3 says eight project-parameterised handlers reference no user. Its table lists seven (SP-78).
