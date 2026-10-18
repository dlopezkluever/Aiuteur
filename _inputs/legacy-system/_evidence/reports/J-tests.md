# J: Tests, fixtures, verification infrastructure

Reporter J. Slice: backend/src/tests/** (incl. helpers, fixtures), backend/src/utils/__tests__, frontend tests (src/**/__tests__, src/test), e2e/*.spec.ts, playwright.config.ts, vite.config.ts test block, backend/jest.config.js, backend/jest.setup.ts, backend/test-connection.js, backend/scripts/test-style-capsule-influence.ts. Ledger: `J-tests.ledger.jsonl` (74 TEST, 20 FACT). All paths relative to `/home/user/workspace/repo`.

Method: static reads of each test file and its production targets (per-file reads done by analyst subagents, spot-checked by lead against source); grep-based reachability and coverage; two runs (section 1). No e2e run. No network, DB, migrations, supabase CLI, or provider calls. No `.env` value read (backend/.env key names only). Wave-1 claims used as leads and re-checked where cited.

---

## 1. Run results (what was actually executed)

| Suite | Command | Result | Notes |
|---|---|---|---|
| Frontend vitest, default env | `npx vitest run --reporter=dot` (root) | exit 1. 26 files: 22 pass, 4 fail at collection. Tests: 271 pass, 0 fail (tests in the 4 failing files were not collected). 33.98 s. | Failure: `Error: Missing Supabase environment variables` thrown by `src/lib/supabase.ts:8` at import. No root `.env` exists. |
| Frontend vitest, 4 failing files re-run with dummy `VITE_SUPABASE_URL=http://127.0.0.1:9` and `VITE_SUPABASE_ANON_KEY=dummy-anon` | same, file list | 4 files, 39 tests, all pass | Dummy values supplied only for this run. Full frontend under dummy env: 26/26 files, 310 tests, 0 fail. |
| Backend jest, subset | `npx jest --testPathIgnorePatterns 'image-generation\.test' 'llm-integration\.test' '/node_modules/' '/dist/'` (backend) | exit 0. Suites 39/39 pass. Tests 406 pass, 7 skipped, 413 total. 25.8 s. | Excluded: image-generation.test.ts and llm-integration.test.ts (need live Supabase, Gemini, LangSmith). |
| Backend jest, full | not run | UNKNOWN for the 2 excluded suites | Static predictions in section 4. |
| Playwright e2e | not run (per brief) | n/a | |
| Manual scripts (`connectivity-test.ts`, `veo3-test.ts`, `scriptManifest.smoke.ts`, `scripts/test-style-capsule-influence.ts`, `test-connection.js`) | not run | n/a | Live or billable; see section 2. |

Total executed: 39 backend suites (all pass) and 26 frontend files (all pass once env is provided; 4 fail at collection without it). Zero failing assertions in any executed test. Failures are environmental (missing `VITE_SUPABASE_*`).

Environment facts: `backend/.env` exists (its keys include SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_AI_API_KEY, LANGSMITH_API_KEY; values not read). `backend/jest.setup.ts:10` loads it via dotenv, so any backend suite that is run with the default command gets live credentials. Root has no `.env`.

---

## 2. Inventory and per-file catalogue

Counts: backend `src/tests` 40 files (37 `*.test.ts` matched by jest; 3 manual non-matched) + `helpers/supabaseMock.ts` + 2 binary fixtures; `src/utils/__tests__` 4 files; 2 scripts outside `src`; frontend 26 vitest files (16 `.ts`, 10 `.tsx`) + `src/test/setup.ts`; e2e 2 specs. Jest matches 41 files total (testMatch at `backend/jest.config.js:34-37`).

Level key: UNIT (pure), ROUTE (supertest), SVC (service with mocks), STATIC (source text scan), LIVE (live DB or network), MANUAL (not in any runner), RTL (component), MSW (fetch via msw), E2E.

Depth key: M = meaningful, MO = mock-only (asserts echoed mock values or call counts), SM = smoke, N = none (replicate or no production code run), NR = not run.

### 2.1 Backend jest, src/tests (37 matched files)

| # | File | Level | Subject (prod) | Mocks | Key invariants (test names abbreviated) | Target reachable | Flags | Depth |
|---|---|---|---|---|---|---|---|---|
| 1 | assetTypeAndMerge.test.ts (18) | ROUTE | projectAssets PUT asset, merge, merge-descriptions (`routes/projectAssets.ts:553,731,937`) | supabase; assetDescriptionMerger | 'should change asset_type when unlocked'; 'should allow type change on locked asset'; 'should reject invalid asset_type (400)'; 'should reject merge with locked asset'; 'absorbed enters over survivor throughout'; 'survivor exits over absorbed throughout'; '3+ descriptions joined before LLM' | Y (server.ts:52) | overridden_fields write and description payload not asserted | M/MO |
| 2 | contextManagerAuteurResolutions.test.ts (7) | UNIT | ContextManager formatters (`services/contextManager.ts:381-420, 608-656`) | none; unmocked supabase chain | 'formatAuteurResolutions produces the ESTABLISHED FACTS block'; 'formatForInjection omits block when no resolutions'; 'Stage 2 context includes established facts' | P: formatForInjection via streamlineBackfillService.ts:62; prepareStageContext has NO caller | DEAD-TARGET (4 of 6 cases) | M for formatter, N for stage routing |
| 3 | continuityBaseAndModeRoutes.test.ts (14) | ROUTE | frames PUT continuity-base; projects continuity-mode and continuity-metrics | supabase positional queues; auth | 'selects a valid candidate and prepends it'; 'clears the selected base and renumbers'; 'rejects frameId not a valid candidate (400)'; 'rejects junk continuityMode (400)'; 'computes totals ... stage10ReuseRate 0.2'; 'surfaces strict issues ... canProceed false' | Y (server.ts:49, :60) | persistence tests echo mock row only | M for wiring and metrics; MO for persistence |
| 4 | continuityBaseService.test.ts (18) | SVC | continuityBaseService tiering and ranking | supabase | 'scores same location + same direction as strong (0.95)'; 'usable 0.6 for one-sided direction'; 'bonuses capped at 1'; 'requests only approved/generated frames' (DB filter); 'sorts by tier, confidence, approved, recency'; 'excludes requesting shot' | Y (frames.ts:1642, projects.ts:3387) | rankRows does not check status (filter in DB only) | M |
| 5 | continuityCompositionService.test.ts (5) | SVC + parity | buildGenerationPackage (`continuityCompositionService.ts:611-682`), fetchShotReferenceImageContext (private, via `as any`) | supabase identity stub | 'places a selected continuity base first, reuse_edit'; 'matches url+role sequence when same direction' (reuse_match); '... different direction' (reuse_edit); '... no base' ; 'preserves manual reference entries' | P: preview via projects.ts:3283/3410 (not persisted); generation via frameGenerationService.ts:350 | PARITY-BY-CONSTRUCTION; REPLICATE expected side (toRoleSequence test:116-121) | M for package; MO for parity |
| 6 | continuityRiskAnalyzer.test.ts (22) | UNIT | continuityRiskAnalyzer Rules 1-4 | none | 'risky when prior scene draft'; 'NOT risky when video_complete'; 'broken when stage 1 updated after scene'; 'ignores stages 5-12'; 'Rule 2 over Rule 3'; 'exact timestamp safe'; 'multiple versions (use latest)' | Y (projects.ts:1093-1105) | 'use latest' name vs no version logic (version field never read) | M |
| 7 | frameGenerationService.test.ts (8) | SVC | fetchShotReferenceImageContext (`frameGenerationService.ts:626-709`) | supabase table-keyed chains | 'returns persisted refs unchanged when no base'; 'degrades when base rejected'; 'prepends base when url absent (reuse_match)'; 'no duplicate when url present'; 'reuse_edit reason'; 'location mismatch reason' | Y (generateFrames :350, from frames.ts:270) | ENV: constructs NanoBananaClient at import | M |
| 8 | frameShotsEmbedRegression.test.ts (2) | STATIC | scans 3 source files for unqualified shots embeds | none; reads source text | 'every shots embed is explicitly qualified' (3 rows); 'documents shots!frames_shot_id_fkey' | Y (scanned files are prod) | scans 3 hard-coded files only | SM |
| 9 | health.route.test.ts (3) | ROUTE | health router (`routes/health.ts:5-12`) | none | 200 with status healthy; environment string; valid ISO timestamp | Y (server.ts:46) | import-time env (server.ts imports config/supabase.ts) | SM |
| 10 | image-generation.test.ts (13) | LIVE | ImageGenerationService + NanoBananaClient | none (real Supabase, real auth.admin.createUser) | 7 live: 'create job and return immediately (<2000 ms)'; 'track state transitions'; 'idempotency'; 'initial state'; 'fail gracefully'; 'different job types'; 'storage path'; 6 empty bodies | Y (routes/images.ts:48; projectAssets.ts:1263; sceneAssets.ts:495) | STATIC PREDICTION: all 7 live master_asset calls omit style, rejected at ImageGenerationService.ts:139-141; fixed sleeps 1 s, 3 s; Date.now ids | N (6 empty) / NR (7) |
| 11 | llm-integration.test.ts (22: 17 run, 5 skip) | UNIT + LIVE | token-utils; prompt-template.ts; llm-client.ts | none (live DB and network in some blocks) | Token Utils: 'calculate cost correctly'; 'throw for unknown model'; 'format cost'; Prompt Template: 'interpolate variables'; 'validate variables'; 'null for non-existent template' (live); LLM Client: 'estimate cost without API call' | P (llmClient via routes/llm.ts:70; formatCost, formatTokenUsage, isSupportedModel, getSupportedModels have NO caller) | 5 test.skip (:303,:317,:334,:339,:346); gate fn checks SUPABASE_ANON_KEY (:392) but code reads SERVICE_ROLE (config/supabase.ts:10); template rows deleted at end of body | M (token-utils, interpolate) / NR live |
| 12 | locationCoverageService.test.ts (3) | UNIT | buildCoverage (`locationCoverageService.ts:222-400`) | none | 'groups shots only by canonical location_asset_id'; 'advanced severity warning, strength weak'; 'missing_view_image flagged with generate_missing_view' | Y (projects.ts:1696) | no threshold, mismatch or strength-matrix assertions | M (thin) |
| 13 | locationResolver.test.ts (6) | UNIT | locationResolverService (`:72-74, :116-143, :308-447`) | none; unmocked supabase import | 'normalizes screenplay headings'; 'resolves exact names (resolver_exact)'; 'aliases (resolver_alias)'; 'camera_direction_parent precedence, confidence 1'; 'ambiguous not auto-applied'; 'scene expected-location fallback' | Y (projects.ts:69-93, 235-246, 1793-1798) | threshold imported, not literal; 0.84 token cutoff not asserted | M |
| 14 | promptGeneration.test.ts (42) | UNIT | pure prompt helpers (`promptGenerationService.ts:169-612, 895-930`) | none; unmocked supabase chain | 'passes_through asset in neither manifest'; 'mixed presence types'; 'sort location, character, prop'; 'alias keyword match'; 'MCU parsed close'; 'two location refs role style'; 'fallback to master image' | Y (promptGenerationService.ts:922,930; continuityCompositionService.ts:329) | weak assertion :213-214 (cut and fade cannot be prop keys); mapCameraToAngleType untested directly | M |
| 15 | referenceContinuity.test.ts (8) | ROUTE | frames add-frame-as-reference (:936-1057), copy-frame (:1969-2143) | supabase table-keyed; frameGenerationService, promptGenerationService, styleCapsuleService, transformationEventService stubbed | 'creates reference link and sets start_continuity camera_change for start frames'; 'not for end frames'; 'match upsert onConflict target_frame_id'; '400 validations'; '401 without auth' | Y (server.ts:60) | header claims batch-link-copy test (absent); conditional assert at :368-373; frames.ts filters at :995, :2110 strip continuity entries | M for wire shape; MO |
| 16 | shotAssetAssignment.test.ts (27) | SVC | shotAssetAssignmentService (`:318-343` invalidate) | supabase Proxy (records no args) | 'DB error propagated'; 'autoPopulate creates 4 rows for 2x2'; 'no duplicates'; 'deleteAllForScene count 5'; 'invalidate marks locked 9-12 outdated (call count only)' | Y (projects.ts:2637; shotAssignments.ts:147..236; server.ts:57) | payload never asserted | MO for invalidation |
| 17 | shotExtraction.test.ts (8) | SVC | shotExtractionService (`:105-114, :195, :443-446`), shotSplitService (`:95, :101, :176-183`) | llm-client (generate) | 'parse LLM response with generated IDs (2A, 2B)'; 'discard invalid shots'; 'camera metadata fallback parsing'; 'timeout returns empty'; 'split yields originalId-1 and -2'; generateShotId 1A/3A/AA | Y (projects.ts:1819, :2553) | FLAKY-RISK-TIMER: timeout simulated by 10 ms mock rejection; prod 20 s timer never cleared | M |
| 18 | shotLocationRoutes.test.ts (5) | ROUTE | projects location routes (:1585, :2043, :2180, :2316, :2399) | supabase positional queues | 'resolves and persists location fields on shot setting change'; 'stores manual assignment'; 'batch-applies preserving manual'; 'Stage 8 coverage response'; 'camera-direction repair assigns' | Y (projects.ts) | no 409 or lock interaction | M |
| 19 | shotLocking.test.ts (14) | UNIT | shotValidationService.validateShots (`:41-137`) | none | 'reject duration > 30 s'; 'reject < 1 s'; 'warn > 12 s'; 'warn total duration'; 'typo suggestion'; 'valid list'. ZERO lock assertions | Y (validateShots called at projects.ts:2926) | NAME-OVERCLAIM; typo case passes on 'not found' alone (:156-157) | M for validation |
| 20 | shotLocking4_5_task_11.test.ts (8: 2 run, 6 skip) | LIVE (401 only) | projects lock :2845, unlock :3020; auth.ts:16-30 | none; live supabase.auth.getUser | run: 'return 401 when not authenticated' (lock and unlock). skip: 'lock with valid shots'; '400 on validation errors'; '409 on warnings'; 'idempotent'; 'unlock without confirmation'; 'require confirmation if frames exist' | Y | 6 it.skip at :36, :47, :57, :67, :90, :99 | SM |
| 21 | shotValidation.test.ts (6) | UNIT | shotValidationService | none | 'empty list error'; 'missing required fields'; 'duration out of bounds'; 'unusual duration warning'; 'duplicate ids error'; 'Did you mean' for name mismatch | Y (projects.ts:2926) | none | M |
| 22 | storyContextService.test.ts (15) | REPLICATE | storyContextService parsers and formatter (`:70-123, :417-436`) | none; imports nothing | 'parse JSON in markdown block'; 'throw on non-JSON'; 'missing suggested_tags'; 'results not array throws'; 'format shot actions'; 'minimal shot fields'. All on local copies | P (sceneAssets.ts:2254, :2316) | REPLICATE; header claims service tested; treatment-key mismatch (J-FACT-07) | N |
| 23 | streamlineAnalyzeReconcileRoutes.test.ts (6) | ROUTE | streamline analyze (:363), reconcile (:400) | analyzeBatch and reconcileDocuments mocked; supabase | 'returns questions'; 'empty questions not error'; '400 missing files'; '404 not owned'; 'reconciled documents returned'; '400 missing qaPairs' | Y (server.ts:69) | success bodies echo mock; 500 branches untested | MO (success), M (validation) |
| 24 | streamlineClassification.test.ts (5) | SVC | classifyFile (`streamlineClassificationService.ts:67`) with real scriptConfidence and llmJson | llm-client | 'high-confidence script without LLM'; 'prose via LLM (0.82)'; 'strip markdown fences'; 'invalid type to unclassified'; 'LLM failure yields unclassified 0' | Y (streamline.ts:217) | none | M |
| 25 | streamlineClassifyImage.test.ts (4) | ROUTE | classify-image (`streamline.ts:256-305`) | ImageAnalysisService constructor mocked; storage mocked | 'uploads and returns classification'; 'rejects non-image'; 'fallback guess with confidence 0'; '404 not owned' | Y | real Gemini classify (imageAnalysisService.ts:165-176) never exercised | MO |
| 26 | streamlineCommit.test.ts (6) | ROUTE | commit (`streamline.ts:45-99`, RPC at :77), backfill (:99) | supabase rpc mocked | 'rejects missing stageTransitions'; 'calls streamline_commit_atomic with payload'; 'forwards project_config and stage_1_draft'; 'RPC exception to 400'; 'rejects stage not 2 or 3'; 'backfill rejects not-skipped' | Y (server.ts:69) | RPC SQL (migration 044:38) not executed; header claims otherwise; formatChoice absent everywhere in backend | M (validation), MO (RPC) |
| 27 | streamlineExtractFile.test.ts (6) | ROUTE | extract-file (`streamline.ts:196-226`) with REAL extractText | classifyFile and extractStandaloneAssetDraft mocked | '.txt extraction'; 'character_notes gets assetDraft'; 'drafting failure does not fail'; 'legacy .doc 400'; 'missing file 400'; 'oversize 21 MB rejected' | Y | no PDF case | M |
| 28 | streamlineFormatFile.test.ts (4) | ROUTE | format-file (`streamline.ts:318-347`) | formatters mocked | 'format as treatment'; 'as beat sheet'; 'invalid targetType 400'; '404 not owned' | Y | outputs test-supplied | MO |
| 29 | streamlineFormatting.test.ts (3) | SVC | formatAsTreatment, formatAsBeatSheet | llm-client | 'returns trimmed prose'; 'parses beat JSON, total runtime 50'; 'defaults missing order and seconds' | Y | none | M |
| 30 | streamlineQuestion.test.ts (5) | SVC | analyzeBatch (`streamlineQuestionService.ts:79-96`) | llm-client | 'empty batch no LLM call'; 'parses questions'; 'drops invalid category'; "'[]' yields empty"; 'LLM failure yields empty' | Y (streamline.ts:384) | 'assigns stable ids' checks truthy only; prod id uses Date.now (:96) | M |
| 31 | streamlineReconciliation.test.ts (6) | SVC | reconcileDocuments (`:74-102`) | llm-client | 'short-circuit with no Q and A'; 'short-circuit no files'; 'maps result to source fileId'; 'unknown filename dropped'; 'invalid editScope defaults'; 'unchanged docs omitted' | Y (streamline.ts:424) | default diffSummary untested | M |
| 32 | streamlineSkip.test.ts (6) | ROUTE | stage skip (`stageStates.ts:416-491`) and lock (`:297-362`) | supabase queues | 'rejects stage 1 skip'; 'rejects out-of-order skip'; 'rejects skipping over locked stage'; 'skip allowed after locked predecessor'; 'lock N rejected when N-1 draft'; 'lock N allowed when N-1 skipped' | Y (server.ts:66) | success status echoes queued result; inserted payload not asserted | M (errors), MO (success) |
| 33 | streamlineStandaloneAsset.test.ts (3) | SVC | extractStandaloneAssetDraft (`:19-41`) | llm-client | 'parses well-formed draft'; 'invalid type falls back to character'; 'missing name falls back to filename' | Y (streamline.ts:226) | no LLM-failure case | M |
| 34 | textFieldVersionService.test.ts (18) | REPLICATE | backend textFieldVersionService (`:9, :33-38, :191-221`) | none; imports nothing | 'exactly 4 field names'; 'FIELD_WRITEBACK_MAP'; 'cap at 8 versions'; 'delete oldest non-selected'; 'first version number 1' (all on local copies) | P (projects.ts:3872, 3880; frames.ts:12) | REPLICATE; header claims singleton tested | N |
| 35 | transformationEvents.test.ts (24) | UNIT | resolveOverridesForShot (`transformationEventService.ts:107-211`) | none | 'within_shot keeps pre and sets transforming'; 'shot after trigger takes post'; 'mid-transition no override'; 'event B transforms to ethereal'; 'unconfirmed ignored'; 'allShots fallback' | Y (frames.ts:602-614; promptGenerationService.ts:1075) | Math.random id unasserted | M |
| 36 | transformationFlagParsing.test.ts (12) | UNIT + REPLICATE | generateShotId (real, 3 cases); parseTransformationFlags (local copy, 9 cases) | none | 'generates correct IDs first 26'; 'double-letter IDs'; 'uses scene prefix' (real). Replica: 'parses within_shot'; 'gradual with trigger/completion'; 'filters invalid type'; 'filters missing character_name'; 'defaults description' | Y for generateShotId; NOT for replica | REPLICATE; stale line comment (:36 says line 247; prod at shotExtractionService.ts:375-390) | M (3), N (9) |
| 37 | transformationPrefill.test.ts (5) | SVC | generateTransformationPrefill (`transformationEventService.ts:380-505`) | supabase; llm-client | 'no absorbed_id returns post only'; 'single assignment yields instant'; 'multiple yields gradual (first trigger, last completion)'; 'no assignments keeps description'; 'fenced JSON parsed' | Y (sceneAssets.ts:1925) | assignment ordering (`.order('shots(shot_order)')` :452) not asserted | M |

### 2.2 Backend manual and non-jest files

| # | File | Level | What it does at runtime | Flags | Depth |
|---|---|---|---|---|---|
| 38 | backend/src/tests/connectivity-test.ts | MANUAL/LIVE | Live Supabase SELECT; checks 5 env vars (incl. LANGSMITH_PROJECT, read by no src file, :44); live Gemini call; inserts and deletes a prompt_templates row; second Gemini call; exits 1 only on fatal error. Run via backend `test:connectivity` (package.json:13). | NOT-IN-JEST; writes DB row | SM |
| 39 | backend/src/tests/veo3-test.ts | MANUAL/LIVE/BILLABLE | Real Vertex predictLongRunning via Veo3Provider, polls, uploads to storage bucket 'videos'. Printed storagePath (:145) differs from uploaded path (Veo3Provider.ts:335-339). Checks GOOGLE_APPLICATION_CREDENTIALS, which Veo3Provider does not read directly (:35-37). | NOT-IN-JEST; billable | SM |
| 40 | backend/src/tests/scriptManifest.smoke.ts | MANUAL (no DB) | Calls extractManifest on a fixed script; 8 checks (2 scenes, ALICE and BOB, KITCHEN, EXT); process.exit(1) on failure. Static trace passes; not executed. | NOT-IN-JEST; duplicates utils test | SM |
| 45 | backend/scripts/test-style-capsule-influence.ts | MANUAL/LIVE | Reads style_capsules; creates global_assets and image_generation_jobs (via createGlobalAssetImageJob, no style check); Gemini in background; polls 60 x 2 s; deletes global asset unless --keep-asset; writes JSON under backend/scripts/. | NOT-IN-JEST; WRITES | SM |
| 46 | backend/test-connection.js | MANUAL/LIVE | DatabaseService.testConnection (SELECT projects limit 1). No package.json script references it. Its comment (:1) says env loaded first; ESM imports hoist, so config/supabase.ts loads before dotenv (:3). | NOT-IN-JEST; no caller | SM |

### 2.3 Backend utils/__tests__ (jest-matched)

| # | File | Level | Subject | Mocks | Key invariants | Reachable | Flags | Depth |
|---|---|---|---|---|---|---|---|---|
| 41 | llmJson.test.ts (12) | UNIT | extractJsonArray, extractJsonObject, LLMJsonParseError (`utils/llmJson.ts:11, :111-135`) | none | 'repairs trailing commas'; 'repairs truncation (last complete object)'; 'extracts array surrounded by prose'; 'throws on unsalvageable'; 'throws for array as object'; 'strips fences' | Y (called by 5 streamline services) | analyst read: truncation case is served by regex fallback (llmJson.ts:84-90), not the bracket strategy (:48-82); not lead-verified | M |
| 42 | resolveConflict.test.ts (8) | UNIT | resolveConflict (`utils/resolveConflict.ts:34`) | none | 'empty list returns null'; 'explicit beats primary'; 'explicit beats ai_inferred'; 'primary beats supporting'; 'supporting beats ai_inferred'; 'tier-4 fall-through'; 'last candidate wins within tier'; 'four tiers resolve to tier 1' | N (no caller) | DEAD-TARGET: only importer is this test; doc comment resolveConflict.ts:4-5 names non-existent callers | M for dead unit |
| 43 | scriptManifest.test.ts (25) | UNIT | extractManifest and helpers (`utils/scriptManifest.ts`) | none | 'extract scenes from TipTap doc'; 'compound location headings'; 'MOMENTS LATER time-of-day'; 'dedupe compound locations'; 'characters in action nodes'; 'speaking characters per scene'; 'CAPS props'; 'screenplay terms filtered' | Y (assetExtractionService.ts:295, projects.ts:1305, projectAssets.ts:200) | weak assertion :213-214 | M |
| 44 | streamlineExtraction.test.ts (8: 7 run, 1 skip) | UNIT | streamlineExtractionService.extractText (`:23, :52`) with real fixtures | none | 'txt exact'; 'md exact'; 'RTF to plain'; 'DOCX fixture text'; 'legacy .doc rejected'; 'unsupported type rejected'; 'corrupted PDF rejects' (toBeTruthy); PDF happy path it.skip (:35) | Y (streamline.ts:216) | SKIPPED; skip rationale (pdfjs worker under Jest, comment :27-34) not run; __dirname use (:6) | M except PDF |

### 2.4 Frontend vitest (26 files)

| # | File | Level | Subject | Mocks | Key invariants | Reachable | Flags | Depth |
|---|---|---|---|---|---|---|---|---|
| 47 | components/pipeline/Stage9/__tests__/BulkPresenceTemplates.test.ts (17) | UNIT | buildTemplateAssignments (`BulkPresenceTemplates.tsx:56-113`) | none; transitive supabase import | '4 assets x 2 shots = 8 throughout rows'; 'unmatched character none'; 'locations-throughout excludes characters and props'; 'unique keys' | Y (Stage9PromptSegmentation.tsx:504) | FAILS at collection without VITE env (import chain :26 to shotAssetAssignmentService.ts:6 to supabase.ts:8) | M |
| 48 | Stage9/__tests__/ShotAssetTimeline.test.ts (22) | REPLICATE | ShotAssetTimeline.tsx NOT imported | none | 'cycle null to throughout to enters to exits to passes_through'; 'labels'; 'create on empty cell' (tautology) | Y component; test does not exercise it | REPLICATE; tautology | N |
| 49 | components/pipeline/__tests__/ContinuityBaseChooser.test.tsx (5) | RTL | ContinuityBaseChooser (`Stage10FrameGeneration.tsx:77-175`) | none | 'loading state'; 'ranked list, Use calls onSelect'; 'Using and Fresh calls onClear'; 'controls disabled during update' | Y (Stage10FrameGeneration.tsx:1156) | FAILS at collection without VITE env (Stage10FrameGeneration.tsx:40, frameService.ts:7) | M |
| 50 | __tests__/MergeDialog.test.tsx (13) | RTL | MergeDialog | projectAssetService; sonner | 'amber warning on different types'; 'no warning same type'; 'scene badges'; 'renders nothing under 2 assets' | Y (Stage5Assets.tsx:1617) | AI merge handler not exercised | SM |
| 51 | __tests__/SkippedStagePlaceholder.test.tsx (3) | RTL | SkippedStagePlaceholder | none | 'both CTAs wired'; 'generate hidden when allowGenerate false'; 'disabled while in flight' | Y (ProjectView.tsx:904, 925, 946) | none | M |
| 52 | __tests__/VersionedTextarea.test.tsx (19) | RTL | VersionedTextarea | use-toast; fetch/create/select injected | 'version counter (v2 of 2)'; 'nav arrows at 2+'; 'Save hidden when locked'; 'createVersion with user_save' | Y (Stage9PromptSegmentation.tsx:816; Stage10FrameGeneration.tsx:1509; VisualStateEditorPanel.tsx:562) | service layer injected, not real | M |
| 53 | shared/__tests__/EnhancedUploadModal.test.tsx (33) | RTL | EnhancedUploadModal | sonner; actions injected | 'onAccept payload'; 'onRegenerate without referenceImageUrl'; 'onEditImage payload'; 'carousel 2 / 2'; 'no Remove BG for location' | Y (Stage5Assets.tsx:1481; VisualStateEditorPanel.tsx:812) | none | M |
| 54 | streamline/__tests__/AskAuteurQuestionUI.test.tsx (4) | RTL | AskAuteurQuestionUI | none | 'option answer answerSource option'; 'freetext answerSource freetext'; 'freetext submit disabled until typed'; 'decline calls onDecline' | Y (Stage1InputMode.tsx:683) | none | M |
| 55 | streamline/__tests__/StreamlineDropZone.test.tsx (5) | RTL | StreamlineDropZone | streamlineService.extractFile; sonner | '.doc rejected with save-as'; 'png rejected client-side'; 'one failing file leaves others'; 'onBatchSettled once'; 'first file primary' | Y (Stage1InputMode.tsx:661) | name claims session persistence; no storage used | M |
| 56 | streamline/__tests__/StreamlineImageReviewGrid.test.tsx (4) | RTL | StreamlineImageReviewGrid | streamlineService.classifyImage; sonner | 'classify dropped image, defaults accepted'; 'fuzzy-match to entity'; 'toggle title flips'; 'one failure does not block' | Y (Stage1InputMode.tsx:670) | routing not asserted | M |
| 57 | streamline/__tests__/StreamlineReviewScreen.test.tsx (5) | RTL | StreamlineReviewScreen | none | 'lists files, confirm calls onConfirm'; 'disabled with blocked reason'; 'partial failure notice'; 'edit summaries shown'; 'omitted when none' | Y (Stage1InputMode.tsx:690) | none | M |
| 58 | streamline/__tests__/StructuralCascadeConfirmDialog.test.tsx (4) | RTL | StructuralCascadeConfirmDialog | none | 'closed renders nothing'; 'lists files with diff'; 'apply calls onConfirm'; 'cancel calls onCancel' | Y (Stage1InputMode.tsx:699) | none | SM |
| 59 | services/__tests__/projectAssetService.editImage.test.ts (5) | MSW | startEditImageJob, getImageJobStatus | supabase token; MSW | 'POST body edit instructions'; 'removeBackground'; 'API error thrown'; 'failed status error'; 'HTTP 404 as network error' (name mismatch) | Y (Stage5Assets.tsx:1492-1517) | name overclaim | M |
| 60 | services/__tests__/projectAssetService.test.ts (5) | MSW | mergeDescriptions, updateAsset, mergeAssets | supabase token; MSW | 'POST descriptions returns merged'; 'Bearer header'; 'not authenticated throws'; 'PUT asset_type'; 'updatedDescription forwarded' | Y (MergeDialog.tsx:100; Stage5Assets.tsx:486,573,710,723) | expect() inside MSW handlers | M |
| 61 | services/__tests__/projectService.test.ts (4) | MSW | createProject, getProject, listProjects, deleteProject | supabase; MSW | 'POST echoes id/title'; 'DELETE 204 resolves'; 'delete failure Forbidden'; 'no session throws' | Y (Stage1InputMode.tsx:209; Dashboard.tsx:36; ProjectView.tsx:182; ProjectCard.tsx:43) | updateProject untested | M |
| 62 | services/__tests__/sceneAssetService.editImage.test.ts (4) | MSW | startEditImageJob, analyzeSceneAssetImage | supabase; MSW | 'POST body with reference'; 'regeneration without reference'; 'analysis returned'; 'API error surfaced' | Y (VisualStateEditorPanel.tsx:823-843, :334) | none | M |
| 63 | services/__tests__/sceneAssetService.inferContext.test.ts (5) | MSW | inferContext, bulkInferContext | supabase; MSW | 'single suggestion'; 'bulk instanceIds body'; '500 surfaced'; 'no-change echo'; 'empty results echo' | Y (VisualStateEditorPanel.tsx:370; Stage8VisualDefinition.tsx:547) | 2 cases echo mock (:206-248) | M / MO |
| 64 | services/__tests__/scriptService.test.ts (11) | UNIT | extractScenes slug, generateSlugFromParsedHeading | none; unmocked supabase import | 'int-kitchen-day-1'; 'sanitize apostrophes'; 'duplicate suffixes'; 'sequential numbering' | Y (Stage1InputMode.tsx:490; Stage4MasterScript.tsx:154) | FAILS at collection without VITE env (scriptService.ts:1); header says vitest must be installed (stale) | M |
| 65 | services/__tests__/shotAssetAssignmentService.test.ts (13) | MSW | shotAssetAssignmentService | supabase; MSW | 'PUT presence_type'; 'POST assignments'; 'GET per-shot list'; 'hasAssignments false'; 'no session throws' | P (listForShot has no caller, shotAssetAssignmentService.ts:39) | tests dead method | M |
| 66 | services/__tests__/textFieldVersionService.test.ts (11) | MSW | frontend textFieldVersionService list, create, select | supabase; MSW | 'snake_case mapped'; 'default source user_save'; 'error surfaced'; 'select endpoint'; 'description_override mapping' | Y (Stage9PromptSegmentation.tsx:818-904; Stage10FrameGeneration.tsx:1510) | none | M |
| 67 | lib/utils/__tests__/screenplay-converter.test.ts (23) | UNIT | parseScriptToTiptapJson, tiptapJsonToPlainText, stripHtmlTags | none | 'scene headings uppercase'; 'null doc gracefully'; 'residual HTML stripped'; 'round trip' (substring only) | Y (Stage4MasterScript.tsx:26) | tiptapToPlainText and plainTextToTiptap uncovered; round trip is one-way | M |
| 68 | lib/utils/__tests__/scriptConfidence.test.ts (4) | UNIT | detectScriptConfidence (thresholds streamlineConfig.ts:6-7) | none | 'formatted screenplay high'; 'single heading ambiguous'; 'prose low'; 'doc returned' | Y (Stage1InputMode.tsx:488, 497) | none | M |
| 69 | lib/utils/__tests__/shotAssetMatcher.test.ts (34) | UNIT | matchAssetToShots | none | 'foreground character 1.0'; 'dialogue character'; 'location by setting name >= 0.9'; 'prop in action' | Y (BulkPresenceTemplates.tsx:83; AssetDrawer.tsx:124) | one case passes via || 0 fallback; ordering name overclaims | M |
| 70 | lib/utils/__tests__/stageBadge.test.ts (7) | UNIT | getStageBadge | none | 'skipped yields SKIPPED'; 'AUTO-FILLED with tooltip'; 'authored or absent no badge'; 'outdated outranks origin' | Y (PhaseTimeline.tsx:29) | none | M |
| 71 | lib/utils/__tests__/streamlineRouting.test.ts (15) | UNIT | computeStreamlineRouting | none | 'script-only skips 2,3 locks 4'; 'beat-sheet-only skips 2 locks 3'; 'low confidence not routed'; 'screenplay override honored'; 'character_notes asset-only' | Y (Stage1InputMode.tsx:445) | none | M |
| 72 | src/pages/__tests__/derivePhaseAStages.test.ts (6) | UNIT | derivePhaseAStages (ProjectView.tsx:44-80) | none; imports page | 'skipped counts as passed'; 'skip 2,3 land on 4'; 'draft precedence'; 'outdated carries origin'; 'no rows pending' | Y (ProjectView.tsx:324, 491; App.tsx:104-106) | FAILS at collection without VITE env (ProjectView.tsx:21-22 chain); name 'active' overclaims | M |

### 2.5 E2E (Playwright, not run)

| # | File | Level | Routes and selectors | Skips | Flags |
|---|---|---|---|---|---|
| 73 | e2e/enhanced-upload-modal.spec.ts (23 test-level cases) | E2E | /auth login; /projects/{id}?stage=5 (Global Assets and Style Lock, Upload button, input accept png); ?stage=7 Script Hub; ?stage=8&sceneId. Selectors match components (Stage5Assets.tsx:808, 821, 1313, 1332; EnhancedUploadModal.tsx strings). | 11 test.skip (167-379): env absent or no Upload button | modal assertions inside if(appeared) (:333, :359) pass silently; waitForTimeout (:90, 129, 136, 319, 350); fallback credentials literals test@example.com and testpassword123 (:30-31); writes a PNG into repo tmp path at runtime |
| 74 | e2e/story-context-update.spec.ts (12 test-level cases) | E2E | /auth; dashboard; Stage 8 'Infer from Story', 'Story Context Suggestion', 'Accept Description', 'Accept Both'; bulk 'Update from Context', 'Bulk Story Context Update', 'Apply Selected' (all match components) | 3 test.skip (98, 109, 178) | 45 s, 60 s, 90 s waits; waitForTimeout (:61, :68); real LLM inference when run; negative assertion at :196 has no list-loaded check |

Config and helpers (not counted in the 74):
- `backend/jest.config.js`: ts-jest ESM preset; `.js` import mapping; testMatch `**/src/tests/**/*.test.ts` and `**/src/**/__tests__/**/*.test.ts` (:34-37); testTimeout 30 s from setup.
- `backend/jest.setup.ts`: dotenv load of backend/.env (:10); NODE_ENV default test (:13); 30 s timeout (:16); console suppression lines all commented (:19-26).
- `vite.config.ts` test block (:26-32): jsdom, globals, setupFiles src/test/setup.ts, include src/**/*.{test,spec}.{ts,tsx}, css false.
- `src/test/setup.ts`: one line, imports @testing-library/jest-dom.
- `playwright.config.ts`: testDir ./e2e; baseURL http://localhost:8080; single chromium project; workers 1; retries 1 only in CI; no webServer (comment at :27 says dev server assumed); reads root .env if present (not read).
- `backend/src/tests/helpers/supabaseMock.ts`: exports mockSupabaseTarget, configureSupabaseMock, configureSupabaseStorageMock, MockResult; uses global jest without import; imported by 6 streamline tests.
- `backend/src/tests/fixtures/`: sample.docx (12,773 bytes), sample.pdf (590 bytes, 1 page); read only by utils/__tests__/streamlineExtraction.test.ts.

---

## 3. Coverage matrix by subsystem

Depth per subsystem. Tests by number from section 2. "P" means partial.

| Subsystem | Tests (section 2 #) | Depth | What is covered | What is not covered |
|---|---|---|---|---|
| Narrative (Stages 1-4: treatment, beats, master script) | 22, 2, 43 (backend); 67, 68, 64, 72 (frontend) | M for manifest and frontend converters; N for LLM generation routes | scriptManifest extraction (43, 40); screenplay-converter; scriptConfidence; extractScenes slugs | treatment and beat and script generation routes have no tests (wave-1 TEST-0050); storyContextService REPLICATE; Stage2/3/4 component logic untested |
| Streamline intake (Stage 1 pre-flight) | 23-33, 41, 44, 54-58, 71 | M for validation, parsing, routing; MO for RPC and success bodies | extract-file, classify-image, format-file, analyze, reconcile, commit validation, backfill validation, skip and lock predecessor rules, routing | PDF happy path skipped (44); RPC SQL not run (26); Stage1InputMode itself untested; streamlineService.ts untested; formatChoice not in any test or backend |
| Project assets (Stage 5) | 1, 59, 60, 61, 50, 53 | M for type, merge, client merge, edit-image client, upload modal; N for most of projectAssets.ts | PUT type, merge rules, mergeDescriptions client | extraction, attempts, clone, match, sync, promote, localizer, lock-all, mark-outdated, clear-all, split, upload routes (wave-1 TEST-0017) |
| Scene assets (Stage 8) | 37, 63, 62, 52, 66 | M for client, transformation prefill; N for backend scene asset routes | sceneAssets.ts:1925 prefill route; frontend inferContext, editImage, text version client | sceneAssets.ts other routes, relevance, attempts, inheritance, use-master, upload, suggestions; Stage8 components mostly untested |
| Transformations | 35, 36, 37 (backend); 35 pure resolver | M for resolver and prefill; N (replica) for flag parser | within_shot, gradual, unconfirmed, multi-asset, shot-order fallback; prefill instant, gradual, fenced JSON | transformation_flags column is never read (wave-1 DEAD-0029); flag parser replica only |
| Continuity (base, mode, metrics, risk, reference link) | 3, 4, 5, 6, 8, 15, 49 | M for base service, risk rules, route wiring; MO for parity and persistence | tier and rank; base route; mode and metrics arithmetic; risk Rules 1-4; reference link and copy-frame wiring | parity across production paths (J-FACT-06); remove-continuity-base clear of selected_continuity_base_frame_id not asserted; batch link copy absent |
| Locations | 12, 13, 18 | M | resolver (exact, alias, camera parent, ambiguity), coverage severity, shot location routes | strength matrix, mismatch, 0.84 cutoff; 0.8 threshold in continuityCompositionService.ts:233 has no test |
| Shots (Stage 7 shot list, shot assignments) | 16, 17, 21, 19 (validation) | M for extraction, split, validation; MO for assignment invalidation | shot extraction with LLM mock, split IDs and duration, validation rules | shot reorder, merge, delete routes; shotAssignments routes; per-shot list (dead) |
| Shot and scene locking | 19, 20, 32, 1 (merge) | N for lock gate; SM for lock 401 | 401 only; predecessor stage rules (mock) | shot-list lock gate on mutations (J-FACT-08); scene stage-lock routes (sceneStageLocks.ts:56,145,290) have zero tests; 6 lock cases skipped |
| Prompts (frame, video, manifest) | 14, 35 | M for pure helpers | manifest builders, sort, alias match, camera parse | LLM prompt generation (frame, video, end, continuity, correction) untested (wave-1 TEST-0050); promptService.ts untested |
| Frames (Stage 10 generation) | 7, 8, 15, 49 (chooser), 52 | M for reference context and wiring; N for generation route and status | fetchShotReferenceImageContext; add-frame-as-reference; copy-frame | frames generate route, status and polling, FramePanel, FrameGrid, FrameUploadModal, frameService.ts untested |
| Image generation | 10 (live, not run), 25 (vision mock), 40 (manifest helpers) | N executed; static predicts failure for 7 | createImageJob reject path (static), classify route fallback | ImageGenerationService and NanoBananaClient not executed; inpaintImage has no caller (DEAD-0043) |
| Video generation | 39 (manual), 38 (none) | N | none automatic | videoGenerationService, VideoJobExecutor, Veo3 provider only via manual billable script |
| Checkout and credits | none | N | none | checkout routes (zero endpoint hits), userCreditsService, checkoutService, credits (wave-1 TEST-0046) |
| Style capsules | 45 (manual) | N | none automatic | style-capsules routes (zero hits), styleCapsuleService.ts |
| Stage states (skip, lock, status, origin) | 32, 51, 70, 72 | M for predecessor errors; MO for success | skip and lock predecessor rules; SkippedStagePlaceholder; stageBadge; derivePhaseAStages | stage-state GET and PUT routes beyond skip and lock; langsmith; backfill of stage 4 |
| Auth middleware | 20 (401), 15 (401), 3 (mock getUser) | SM | 401 without token (live supabase.auth.getUser in #20) | token-format branches, error path in auth.ts beyond 401 |
| Health and config | 9, 46, 38 | SM | health route | none |
| Frontend components (broad) | 47-58, 65, 66, 69, 70 | M for leaf components; N for pages and stage containers | Streamline components, upload modal, merge dialog, versioned textarea, continuity chooser, placeholder | Stage 1 InputMode, 2, 3, 4, 5 (container), 6, 7, 8 containers, 9 container, 10 container, 11, 12, ProjectView (except derivePhaseAStages), Dashboard, Landing, FramePanel, FrameGrid, AssetDrawer (except shotAssetMatcher import) |

Coverage by target: 21 backend services and 14 frontend services have no test importing them (J-FACT-15, J-FACT-16). Backend services with zero name references include assetExtractionService, sceneAssetRelevanceService, shotMergeService, streamlineBackfillService, userCreditsService, videoGenerationService.

---

## 4. Stale, replicate, mismatched, skipped, flaky, failing

### 4.1 Replicate tests (assert copies, cannot fail on production regression)
- storyContextService.test.ts (15 cases; no import; header says it tests service) (#22).
- textFieldVersionService.test.ts (18 cases; no import; header says singleton tested) (#34).
- transformationFlagParsing.test.ts, 9 of 12 cases on a local copy of parseTransformationFlags (#36).
- Stage9/__tests__/ShotAssetTimeline.test.ts, component not imported; cycle, labels, colors re-declared (#48).
- Partial: continuityCompositionService.test.ts toRoleSequence (expected side, #5).
Full evidence in J-FACT-13.

### 4.2 Stale or wrong against production
- image-generation.test.ts master_asset cases (7) omit style, which ImageGenerationService.ts:139-141 rejects (J-FACT-10). Static only.
- continuityCompositionService.test.ts parity block (4 cases): equality is round-trip, not two production paths; toRoleSequence ignores providerRole, production honors it (frameGenerationService.ts:535-539) (J-FACT-06).
- continuityRiskAnalyzer.test.ts 'use latest' case: the version field is never read; production takes max created_at (J-TEST-06).
- referenceContinuity.test.ts header claims a batch-link-copy test; no such test exists (#15).
- llm-integration.test.ts isEnvironmentConfigured checks SUPABASE_ANON_KEY (:392) while config reads SUPABASE_SERVICE_ROLE_KEY (config/supabase.ts:10) (#11).
- Several headers and comments reference lines or behaviors that moved: transformationFlagParsing (:36 says line 247; logic at 375-390), storyContextService header, scriptService header (vitest "must be installed").

### 4.3 Dead-target tests (test code whose production target has no caller)
- resolveConflict.test.ts (8 cases) on resolveConflict.ts (#42). Wave-1 DEAD-0008.
- contextManagerAuteurResolutions 4 of 6 cases on prepareStageContext (#2). Wave-1 DEAD-0010.
- llm-integration Token Utils block on formatCost, formatTokenUsage, isSupportedModel, getSupportedModels (token-utils.ts:132-156 have no non-test caller) (#11). Wave-1 DEAD-0050.
- shotAssetAssignmentService.test.ts listForShot (#65). Wave-1 DEAD-0028.
- Untested AND uncalled (wave-1 DEAD, zero test references): inpaintImage (NanoBananaClient.ts:171), extractEntityMentions, splitBeat, getInheritanceChain, addCredits, langsmithClient, mockTreatments, IssueResolutionSection, frontend imageService.ts (J-FACT-09).

### 4.4 Skipped (static counts)
- Jest: shotLocking4_5_task_11.test.ts 6 it.skip (:36, :47, :57, :67, :90, :99); llm-integration.test.ts 5 test.skip (:303, :317, :334, :339, :346); streamlineExtraction.test.ts 1 it.skip (:35). 12 static; 7 skipped in the executed subset.
- Vitest: none.
- Playwright: 14 conditional test.skip (11 in enhanced-upload-modal, 3 in story-context-update), gated on env or missing UI.
- No .only, .todo, xit, xdescribe found anywhere in slice.

### 4.5 Flaky or time-dependent
- image-generation.test.ts: fixed sleeps 1000 ms (:140) and 3000 ms (:206); latency assertion under 2000 ms (:122-128); Date.now in ids (:17, :150). Live dependence.
- shotExtraction.test.ts timeout case (:180): 10 ms mock rejection; production 20 s timer (shotExtractionService.ts:445) is never cleared.
- transformationEvents.test.ts fixture id via Math.random (:40), unasserted; not observed to flake.
- e2e: waitForTimeout (enhanced-upload-modal :90, 129, 136, 319, 350; story-context-update :61, 68); waits 45 s, 60 s, 90 s; first-match class selectors (story-context-update :117, 133, 150).
- Vitest unit files: no fake timers, no Date.now assertions. continuityRiskAnalyzer uses fixed ISO dates (deterministic).

### 4.6 Would fail at HEAD
- Executed and failing at HEAD: none in assertions. 4 vitest files fail at collection without VITE_SUPABASE_* env (#47, #49, #64, #72). Passing with dummy env.
- Static prediction only (not executed): image-generation.test.ts 7 live master_asset cases (#10, J-FACT-10). llm-integration live blocks depend on live DB and keys (#11).
- Shot lock: no live assertion would fail, because 6 of 8 cases are skipped.

### 4.7 Weak or conditional assertions (cannot fail, or assert less than their name)
Catalogue in J-FACT-12. Most consequential: referenceContinuity :368-373 (inside if); promptGeneration :213-214 (cut and fade cannot be prop keys); shotLocking :156-157 (accepts 'not found' alone); e2e modal assertions inside if(appeared); derivePhaseAStages 'active' name; streamlineQuestion 'stable ids' name.

---

## 5. Parity verification (wave-1 claim WD-IMPL-TEST-0025)

Claim: continuityCompositionService and referenceContinuity tests assert preview vs generation parity by construction.

Result: partially confirmed.
- The four parity cases (continuityCompositionService.test.ts:218-219, 251-252, 271-272, 315-316) compare toRoleSequence(pkg.persistedStartFrameManifest) against fetchShotReferenceImageContext(...).references. The expected side is the same object returned by buildGenerationPackage (test:192, 224, 256, 276), passed back through an identity DB stub (test:146-147), then read by the real reader (frameGenerationService.ts:626-709).
- So the test is one production write output round-tripped and compared with a test-local projection. It is not a comparison of two independent production paths, and it is not a hand-built fixture.
- No test compares preview output (startFrameReferenceManifest, providerReadyReferences, preview.referenceManifest) with the generation sequence. Preview is built only at projects.ts:3283 and :3410 and is not persisted.
- Production divergence visible in code (not a test result): generation reads shots.reference_image_order, written by the promptGenerationService-based builder at projects.ts:3853 without prepending the continuity base. The base is prepended at write time in the continuity-base route (frames.ts:1650-1659) and at read time (frameGenerationService.ts:698-700). Preview prepends at continuityCompositionService.ts:638-643.
- persistedStartFrameManifest (continuityCompositionService.ts:682) is returned and has no production reader (grep).
- referenceContinuity.test.ts does not test parity; it mocks frameGenerationService entirely (test:29-31).

---

## 6. Other verified claims from wave 1

| Wave-1 claim | Verdict | Evidence |
|---|---|---|
| WD-IMPL-TEST-0007 shot lock tests are auth-only | confirmed | shotLocking4_5_task_11.test.ts:27-34, 81-88 live; 6 skipped |
| WD-IMPL-TEST-0010 storyContextService and textFieldVersion replicate | confirmed | no import (storyContextService.test.ts:8; textFieldVersionService.test.ts:1-8) |
| WD-IMPL-TEST-0013 scriptManifest.smoke not in jest | confirmed | jest.config.js:34-37 testMatch |
| WD-IMPL-TEST-0015 image-generation stale | confirmed by static trace | ImageGenerationService.ts:139-141 |
| WD-IMPL-TEST-0021 replicate tests | confirmed, plus transformationFlagParsing | #34, #36, #22 |
| WD-IMPL-TEST-0025 parity by construction | partially confirmed | section 5 |
| WD-IMPL-TEST-0038 ShotAssetTimeline replicate | confirmed | ShotAssetTimeline.test.ts:67; component not imported |
| WD-IMPL-TEST-0046 no checkout, credits, video, provider, Stage 11 and 12 tests | confirmed | route grep: 0 hits for checkout; no test imports checkoutService, userCreditsService, videoGenerationService |
| WD-IMPL-TEST-0048 llm-integration not gated | confirmed for unconditional blocks | llm-integration.test.ts:387-394 gate names do not gate blocks |

---

## 7. Contradictions and unknowns

- Frontend collection failure is environmental. Without a root `.env`, four vitest files fail. With dummy VITE values they pass. Whether the intended dev environment sets VITE_SUPABASE_* is UNKNOWN from this slice; a root .env is not present in the repo snapshot.
- Full backend jest run is UNKNOWN. Running it would hit live Supabase and Gemini or LangSmith using backend/.env (values not read). Static prediction: image-generation.test.ts master_asset cases fail; llm-integration template and LLM Client blocks depend on live services.
- Test-count reconciliation: per-file it-counts in section 2 are grep counts; runner totals are authoritative (jest 413, vitest 310 with dummy env). Analyst-reported per-file counts differ from grep counts in a few files; ledger notes state which.
- Analyst-read claims not re-read by lead: llmJson truncation strategy (#41), resolveConflict fallback (#42 note contradicted by the tier-4 test at :41; lines :49-50 not read), Stage 2 variation keys (J-FACT-07), ShotAssetTimeline cycle (lead spot-checked :22, :67), StreamlineDropZone session claim (grep-checked analyst-side), MergeDialog and VersionedTextarea details, e2e selector matches (analyst-side, lead spot-checked by grep only for Stage5Assets.tsx:1332 region not re-read).
- backend/src/tests/veo3-test.ts reachability: Veo3Provider reachability traced by analyst through createVideoProvider.ts:15 and VideoJobExecutor.ts:20; not lead-verified.
- Shot-lock migration trigger (wave-1 C05, migration 014) is outside this slice; the test suite does not exercise it. UNKNOWN from tests.

---

## 8. Cross-slice references

- continuityBaseRoute and continuity writes: backend/src/routes/frames.ts:1650-1659 (base prepended with referenceRole continuity_base_frame), frames.ts:995 and :2110 (filters strip type continuity entries, which removes the base entry). Belongs to continuity slice (wave-1 V7). Tested only by #3 and #15; the test fixture (referenceContinuity.test.ts:318) lacks referenceRole so the two cannot be distinguished.
- storyContextService treatment keys: backend/src/services/storyContextService.ts:95-96, :113-123 read treatmentProse and selectedTreatmentId; no writer found (grep). Stage 3 writes treatmentSource (src/components/pipeline/Stage3BeatSheet.tsx:349, 537). Wave-1 C10.
- Shot-list lock writers: backend/src/routes/sceneStageLocks.ts:116-118, :256-258, :352 set shot_list_locked_at; projects.ts:2975-2977 and :3155-3157 set and clear in handlers. No shot mutation route reads it (J-FACT-08). Wave-1 C05.
- Image style guard: backend/src/services/image-generation/ImageGenerationService.ts:139-141 for master_asset, scene_asset, transformation_post; createGlobalAssetImageJob (per analyst, ImageGenerationService.ts:736-795) has no equivalent check. Wave-1 V2 and V9 surfaces.
- Dead symbols with test coverage: resolveConflict (utils/resolveConflict.ts:34), prepareStageContext (contextManager.ts:288), token-utils formatCost family (utils/token-utils.ts:132-156), shotAssetAssignmentService.listForShot (src/lib/services/shotAssetAssignmentService.ts:39). Wave-1 DEAD-0008, 0010, 0050, 0028.
- Frontend supabase import chain: src/lib/supabase.ts:6-8 throws without VITE env; four test files and any unmocked importer depend on it (ProjectView.tsx:21-22; Stage10FrameGeneration.tsx:40; frameService.ts:7; scriptService.ts:1; BulkPresenceTemplates.tsx:26).
- Route-shadowing claim (wave-1 C06, DELETE /shot-assignments/all after /:assignmentId): no test covers shotAssignments routes; not verified here.
- Veo3 path mismatch: backend/src/tests/veo3-test.ts:145 vs backend/src/services/video-generation/Veo3Provider.ts:335-339 (script-side only).
- Stage 9 and Stage 10 component locations: src/components/pipeline/Stage9/ShotAssetTimeline.tsx:22, 78-80 (replicated in test).

---

## 9. Not inspected

- All 74 test files were read by analyst subagents (backend 37 + 3 manual + 4 utils + 2 scripts; frontend 26; e2e 2). Lead spot-checked: vitest and jest outputs, import chains for the four failing frontend files, storyContextService keys, style guard, parity lines, shot lock writers, resolver thresholds, route-test grep, dead-symbol grep.
- Not read by lead line-by-line: most frontend per-test assertions, e2e selectors beyond grep spot-checks, llmJson strategies, ImageGenerationService.createGlobalAssetImageJob body.
- Not executed: e2e (all), backend image-generation.test.ts, llm-integration.test.ts, the 5 manual scripts, the 4 frontend files without dummy env.
- Not read by design: ._docs/**, README.md, AGENTS.md, CLAUDE.md, .claude/**, .agents/**, test-results/, .playwright-mcp/, any .env value.
- Git history not used (per brief).
