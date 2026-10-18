# 13. Test and evidence map

Scope: the automated and manual test surface of the WizardDirector (Aiuteur) repository at HEAD. This document covers the test runners and their configuration, the environment each runner needs, what was executed and what it observed, a per-file catalogue of the 41 jest files, 26 vitest files, 2 Playwright specs and 5 manual scripts (the 74 files in J's read set), a subsystem by depth matrix, capability coverage computed from the CAP ledger `tested` flag, replica and dead-target tests, stale, skipped and flaky tests, tests whose assertions differ from production, import-time environment failures, the V7 parity tests, the shot-lock live test gap, and the manual scripts. Test quality is described only as far as the reporters' evidence shows. No test changes are proposed.

Sources: ledger kinds TEST (124 entries: 50 wave-1 from V1 to V10 and E, plus 74 from J), CAP (287 entries, `flags.tested`), FACT (J-FACT-01 to J-FACT-20 and related FACT entries cited inline). Reports: J-tests (primary), V7-continuity-locations, V8-shots, V9-prompts-frames, R1a-verification and R1b-verification (verdicts), R2-ai-canonical (AI test cross-check). Repo spot checks are listed in section 17.

Reading notes: sibling documents by filename where present: 01-SYSTEM-OVERVIEW.md, 02-FUNCTIONAL-CAPABILITIES.md, 03-USER-WORKFLOWS.md, 06-WRITING-AND-STORY-IMPLEMENTATION.md, 08-SHOTS-FRAMES-AND-GENERATION.md, 10-VERSIONING-LOCKING-AND-INVALIDATION.md, 12-ASYNC-RELIABILITY-AND-PROVIDERS.md, 17-IMPLEMENTATION-LEDGER.md. Other topics use the numbering of the document map (00-README.md): 04 domain and state, 05 data model, 07 assets and continuity, 09 AI and prompts, 11 architecture, 14 dead and duplicated, 15 pressure, 16 coverage and unknowns.

Notation. Ledger IDs are full `WD-IMPL-*` ids. Depth labels follow the brief: **meaningful** (asserts behavior of production code, mocking only I/O), **mock-only** (asserts echoed mock values or call counts), **smoke** (status or import-level check only), **none** (no test reaches the target), **replica** (asserts a copy of the logic, not the production module), **not run** (exists, not executed by the reporter). Status terms (TESTED, PARTIAL, UNKNOWN, DEAD, ORPHANED, CONTRADICTED, MOCK-ONLY, DUPLICATED, LEGACY) are used for capabilities and targets.

---

## 1. Test infrastructure

### 1.1 Runners and configuration

| Runner | Config and entry | Scope and match | Setup and notes |
|---|---|---|---|
| Backend Jest (ts-jest ESM preset) | `backend/jest.config.js:3-44`; `backend/package.json:12` (`jest`) | testMatch `**/src/tests/**/*.test.ts` and `**/src/**/__tests__/**/*.test.ts` (`backend/jest.config.js:34-37`). 41 files match: 37 in `src/tests`, 4 in `src/utils/__tests__` | `backend/jest.setup.ts:10` loads `backend/.env` with dotenv. `:13` defaults NODE_ENV to test. `:16` sets a 30 s timeout. `:19-26` console suppression is fully commented out. moduleNameMapper strips `.js` suffixes. |
| Frontend Vitest (jsdom) | `vite.config.ts:26-32`; root `package.json:12` (`vitest run`) | include `src/**/*.{test,spec}.{ts,tsx}`; 26 files match (16 `.ts`, 10 `.tsx`) | `globals: true`, `css: false`. `setupFiles: src/test/setup.ts`, which is one line importing `@testing-library/jest-dom` (`src/test/setup.ts:1`). No MSW global; each MSW file calls its own `setupServer` (WD-IMPL-TEST-0110). |
| Playwright e2e | `playwright.config.ts:17-24`; root `package.json:14` (`playwright test`) | `testDir ./e2e`; 2 specs (`e2e/enhanced-upload-modal.spec.ts`, `e2e/story-context-update.spec.ts`) | `baseURL http://localhost:8080`, one chromium project, `workers: 1`, `retries` 1 only when `CI` is set (`:20`). No `webServer`; the comment at `:27` assumes a dev server already running. `:5-14` loads a root `.env` if present (none in the snapshot). |
| Backend manual script | `backend/package.json:13` (`test:connectivity` = `tsx src/tests/connectivity-test.ts`) | Other manual files have no npm script | Run by hand with `tsx`. Not matched by any runner (section 14). |

Test counts by directory: backend `src/tests` holds 37 `*.test.ts` files, 3 manual non-matched files (`connectivity-test.ts`, `veo3-test.ts`, `scriptManifest.smoke.ts`), `helpers/supabaseMock.ts` and `fixtures/` (sample.docx 12,773 bytes, sample.pdf 590 bytes, used only by `src/utils/__tests__/streamlineExtraction.test.ts`). Two more scripts sit outside `src` (`backend/scripts/test-style-capsule-influence.ts`, `backend/test-connection.js`). Source: WD-IMPL-FACT-0248, WD-IMPL-FACT-0263.

No root `.env` exists in the snapshot (J ran `ls`). `backend/.env` exists; J read its key names only (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_AI_API_KEY, LANGSMITH_API_KEY), not its values.

### 1.2 Environment requirements

| Variable | Read by | Effect when absent | Evidence |
|---|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `backend/src/config/supabase.ts:5-10` | Module throws `Missing Supabase environment variables` at import. Every backend suite that imports this module (directly or through services or `server.ts`) fails at collection. | `backend/src/config/supabase.ts:5-13`; WD-IMPL-TEST-0059, WD-IMPL-TEST-0052 |
| `GOOGLE_AI_API_KEY` | `backend/src/services/image-generation/NanoBananaClient.ts:21-23` | Constructor throws `GOOGLE_AI_API_KEY not configured` (also when value is `placeholder`). `ImageGenerationService` constructs it (`ImageGenerationService.ts:68-70`). `frameGenerationService.ts:131` constructs `ImageGenerationService`, and `:1600` exports a module-level singleton, so importing that module fails without the key. | WD-IMPL-TEST-0057, WD-IMPL-TEST-0059 |
| `LANGSMITH_API_KEY`, `GOOGLE_AI_API_KEY` | `backend/src/services/llm-client.ts:71, 89-96` | `validateEnvironment()` runs in the `LLMClient` constructor. `llmClient` is a lazy getter (`llm-client.ts:363-366`), so this fails on first LLM use, not at import. | WD-IMPL-TEST-0061 |
| `GEMINI_MODEL` | `llm-client.ts:76` (constructor default `gemini-2.5-flash-lite`), `:106` (`generate` fallback `gemini-1.5-flash`) | Actual model depends on the env value (UNKNOWN value). Token-utils expectations are pinned to `gemini-1.5-flash` pricing (WD-IMPL-TEST-0048). | R2-ai-canonical; WD-IMPL-TEST-0048 |
| `SUPABASE_ANON_KEY` | `llm-integration.test.ts:392` (gate function only) | No effect on test blocks; see section 15, row 4. | WD-IMPL-TEST-0061 |
| `LANGSMITH_PROJECT` | `connectivity-test.ts:44` only | No `src` file reads it. | WD-IMPL-TEST-0088 |
| `TEST_PROJECT_ID`, `TEST_SCENE_ID`, `TEST_AUTH_TOKEN` | `shotLocking4_5_task_11.test.ts:21-23` | Defaults are all-zero UUIDs and an empty token. Six cases are `it.skip`; see section 13. | WD-IMPL-TEST-0070 |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:6-8` | Module throws `Missing Supabase environment variables` at import. Four vitest files fail at collection; see section 11. | WD-IMPL-FACT-0245 |
| `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_PROJECT_ID` | `e2e/enhanced-upload-modal.spec.ts:30-32`; `e2e/story-context-update.spec.ts:23-25` | Modal spec falls back to literals `test@example.com` and `testpassword123`, and an empty project id. Story spec has no fallback; its tests skip when unset (`:98`, `:109`, `:178`). | WD-IMPL-TEST-0123, WD-IMPL-TEST-0124 |

### 1.3 How to run each suite

- Frontend, all: `npx vitest run` or root `npm test`. Needs `VITE_SUPABASE_*` to avoid four collection failures.
- Backend, all: `npm test` in `backend/` runs plain `jest` (`backend/package.json:12`). With `backend/.env` present, this loads live credentials (jest.setup.ts:10) and runs the two live suites against Supabase, Gemini and LangSmith (WD-IMPL-FACT-0247).
- Backend subset used by J (not a repo script): `npx jest --testPathIgnorePatterns 'image-generation\.test' 'llm-integration\.test' '/node_modules/' '/dist/'`. Result in section 2.
- E2E: `npm run test:e2e` (root). Requires an app server on port 8080 and, for the gated tests, the `E2E_*` variables. No server is started by the config.
- Connectivity probe: `npm run test:connectivity` in `backend/`. Live (section 14).

---

## 2. Observed results

Results observed by reporter J. No suite was re-run for this document.

| Suite | Command or method | Result | Exit | Time | Source |
|---|---|---|---|---|---|
| Frontend vitest, default env | `npx vitest run --reporter=dot` at root | 26 files: 22 pass, 4 fail at collection with `Missing Supabase environment variables`. 271 tests pass, 0 fail (tests in the 4 failing files are not collected). | 1 | 33.98 s | WD-IMPL-FACT-0245, J-FACT-01 |
| Frontend vitest, the 4 failing files only, dummy `VITE_SUPABASE_URL=http://127.0.0.1:9` and `VITE_SUPABASE_ANON_KEY=dummy-anon` | same, file list | 4 files, 39 tests, all pass | | | J-FACT-01 |
| Frontend vitest, all 26 files with dummy env (derived) | same, dummy env | 26 files, 310 tests, 0 fail | | | J-FACT-01 |
| Backend jest, 39 of 41 matched suites (image-generation and llm-integration excluded) | `npx jest` with the two exclusions | 39 of 39 suites pass. 406 tests pass, 7 skipped, 413 total. | 0 | 25.8 s | WD-IMPL-FACT-0246, J-FACT-02 |
| Backend jest, image-generation and llm-integration | not run | UNKNOWN. Static predictions in section 9. | | | WD-IMPL-FACT-0247 |
| Playwright, 2 specs, 35 test-level cases | not run | UNKNOWN | | | WD-IMPL-TEST-0123, WD-IMPL-TEST-0124 |
| 5 manual scripts | not run | Not applicable (live or billable) | | | section 14 |

Totals and failures:

- Zero failing assertions in any executed test. Every observed failure is environmental (missing `VITE_SUPABASE_*`). WD-IMPL-FACT-0245, WD-IMPL-FACT-0246.
- Static it-counts (grep, `^\s*(it|test)(\.skip)?\(`) for the 39 backend suites give 410, against the runner's 413. The frontend static count (310) equals the dummy-env runner total. Runner totals are authoritative (WD-IMPL-FACT-0248).
- Executed set: 723 runner tests (413 backend, 310 frontend with dummy env).
- The J method statement says "no network". The executed backend subset includes `shotLocking4_5_task_11.test.ts`, whose two 401 cases send a request through `authenticateUser`, which calls `supabase.auth.getUser` (`backend/src/middleware/auth.ts:16-30`). Whether that call reached the network in J's run is UNKNOWN. See section 15.

---

## 3. Per-file catalogue: backend jest

Columns: ledger ID (`WD-IMPL-TEST-`), file (static it-count), level, production target (path and lines), mocks, key invariants asserted (abbreviated), depth. Counts are grep counts unless the ledger gives a runner count. Level key: UNIT (pure), ROUTE (supertest against the mounted router), SVC (service with mocks), STATIC (source text scan), LIVE (real Supabase or network), REPLICATE (no production import).

| Ledger | File (count) | Level | Production target | Mocks or inputs | Key invariants asserted | Depth |
|---|---|---|---|---|---|---|
| 0051 | `assetTypeAndMerge.test.ts` (18) | ROUTE | projectAssets PUT asset, merge, merge-descriptions (`routes/projectAssets.ts:553, 731, 937`) | supabase; assetDescriptionMerger | type change on unlocked and locked assets; invalid type 400; merge with locked asset rejected; absorbed `enters` over survivor `throughout`; 3+ descriptions joined before LLM | meaningful for type and merge rules; mock-only for overridden_fields and description payload (not asserted) |
| 0052 | `contextManagerAuteurResolutions.test.ts` (7 lines; ledger says 6 cases) | UNIT | ContextManager formatters (`services/contextManager.ts:381-420, 608-656`) | none; real import chain | ESTABLISHED FACTS block format; block omitted when empty | meaningful for formatter; 4 cases call `prepareStageContext`, which has no production caller (`contextManager.ts:288`), so DEAD target |
| 0053 | `continuityBaseAndModeRoutes.test.ts` (14) | ROUTE | frames PUT continuity-base (`routes/frames.ts:1574-1682`); projects continuity-mode and continuity-metrics (`routes/projects.ts:809-1010`) | supabase positional queues; auth | base prepended as Image #1 with `referenceRole` continuity_base_frame; clear renumbers; invalid candidate 400; junk mode 400 without DB call; metric totals (stage10ReuseRate 0.2); advanced strict issues block | meaningful for wiring and metrics; mock-only for persistence (echoes queued row) |
| 0054 | `continuityBaseService.test.ts` (18) | SVC | continuityBaseService tiers and ranking | supabase | strong 0.95 for same location and direction; usable 0.6 for one-sided direction; bonuses capped at 1; DB filter approved or generated; tier, confidence, approval sort; requesting shot excluded | meaningful; status filter exists only in the DB query (`rankRows` does not check status) |
| 0055 | `continuityCompositionService.test.ts` (5) | SVC + parity | `buildGenerationPackage` (`continuityCompositionService.ts:611-682`); private `fetchShotReferenceImageContext` via `as any` | identity supabase stub | base placed first with `reuse_edit`; `reuse_match` vs `reuse_edit` by direction; manual entries preserved; 4 parity cases | meaningful for package; parity block passes by construction (section 12) |
| 0056 | `continuityRiskAnalyzer.test.ts` (22) | UNIT | Rules 1 to 4 (`services/continuityRiskAnalyzer.ts:59-126`) | none | risky, safe and broken outcomes; strict greater-than timestamp; Rule 2 precedes Rule 3 | meaningful; "use latest" case does not exercise version selection (section 10) |
| 0057 | `frameGenerationService.test.ts` (8) | SVC | `fetchShotReferenceImageContext` (`frameGenerationService.ts:626-709`) | supabase table-keyed chains | no base returns refs unchanged; rejected base degrades; base prepended when url absent (`reuse_match`); no duplicate; `reuse_edit` reason; location-mismatch reason | meaningful for this method only; import constructs NanoBananaClient (section 11) |
| 0058 | `frameShotsEmbedRegression.test.ts` (2) | STATIC | 3 hard-coded source files (`frameGenerationService.ts`, `continuityBaseService.ts`, `routes/frames.ts`) | reads source text | every `shots` embed in those files is qualified `shots!frames_shot_id_fkey` | smoke; scans only these 3 files. WD-IMPL-TEST-0058 lists 5 other frames-query files not scanned (`videoGenerationService.ts:151`, `ImageGenerationService.ts:521`, `routes/projectAssets.ts:3274`, `routes/sceneStageLocks.ts:209`, `routes/projects.ts`) |
| 0059 | `health.route.test.ts` (3) | ROUTE | health router (`routes/health.ts:5-12`) | none | status healthy; environment string; ISO timestamp | smoke; import loads `server.ts` and so config/supabase |
| 0060 | `image-generation.test.ts` (13) | LIVE | ImageGenerationService and NanoBananaClient | none; real Supabase, real `auth.admin.createUser` | 7 live `master_asset` cases; 6 empty bodies | not run; static prediction of 7 failures (section 9) |
| 0061 | `llm-integration.test.ts` (22: 17 run, 5 skip) | UNIT + LIVE | `utils/token-utils.ts`; `prompt-template.ts`; `llm-client.ts` | none; live DB in Prompt Template block; live network in LLM Client block | token cost calculation and unknown-model throw; variable interpolation and validation; template create, get, list against live DB; cost estimate without API call | meaningful for token-utils and interpolation; not run for live blocks; 3 token-utils cases target functions with no production caller (section 8) |
| 0062 | `locationCoverageService.test.ts` (3) | UNIT | `buildCoverage` (`services/locationCoverageService.ts:222-400`) | none | grouping by canonical location id; advanced severity; `missing_view_image` with `generate_missing_view` | meaningful but thin; no mismatch, threshold or strength assertions |
| 0063 | `locationResolver.test.ts` (6) | UNIT | `locationResolverService` (`:72-74, 116-143, 308-447`) | none; unmocked supabase import | heading normalization; exact name (`resolver_exact`); alias; camera-direction parent with confidence 1; ambiguous not auto-applied; scene expected-location fallback | meaningful; fuzzy-only path and the 0.84 token cutoff are not asserted |
| 0064 | `promptGeneration.test.ts` (42) | UNIT | pure manifest helpers (`promptGenerationService.ts:169-612, 895-930`) | none; unmocked supabase chain | manifest builders; sort order location, character, prop; alias keyword match; MCU parsing; fallback to master image | meaningful for pure helpers; no LLM, `generateBulkPromptSets`, `determineContinuityLink`, `cleanPromptOutput` or route tests |
| 0065 | `referenceContinuity.test.ts` (8) | ROUTE | `add-frame-as-reference` (`frames.ts:936-1057`); `copy-frame` (`frames.ts:1969-2143`) | table-keyed supabase; frameGenerationService, promptGenerationService, styleCapsuleService, transformationEventService stubbed | reference link created; `start_continuity` set to `camera_change` for start frames only; match upsert on `target_frame_id`; 400 validations; 401 without auth | meaningful for wiring; mock-only; file header claims a batch-link-copy test that does not exist; cleanup assertion conditional (`:368-373`) |
| 0066 | `shotAssetAssignment.test.ts` (27) | SVC | `shotAssetAssignmentService` (invalidate at `:318-343`) | Proxy supabase that records no arguments | DB error propagated; autoPopulate creates 4 rows for 2 shots by 2 instances; no duplicates; `deleteAllForScene` count; invalidation updates only locked stages 9 to 12 | mock-only; payloads cannot be asserted with this mock; invalidation asserts call counts only |
| 0067 | `shotExtraction.test.ts` (8) | SVC | `ShotExtractionService` (`shotExtractionService.ts:105-114, 195, 443-446`); `ShotSplitService` (`shotSplitService.ts:95-183`) | llm-client `generate` | LLM shots parsed with generated ids 2A, 2B; invalid shots discarded; camera metadata fallback; timeout returns empty; split yields `originalId-1` and `-2` with original durations | meaningful; timeout case uses a 10 ms mock rejection (section 10) |
| 0068 | `shotLocationRoutes.test.ts` (5) | ROUTE | projects location routes (`projects.ts:1585, 2043, 2180, 2316, 2399`) | supabase positional queues | shot PUT resolves and persists (`resolver_exact`); manual assignment stored as manual; batch resolve preserves manual; coverage response; camera-direction assignment | meaningful; no 409 or lock interaction |
| 0069 | `shotLocking.test.ts` (14) | UNIT | `shotValidationService.validateShots` (`:41-137`) | none | duration above 30 s error; below 1 s error; above 12 s warning; total warning; typo suggestion; valid list | meaningful for validation; zero lock or unlock assertions; name overclaims; typo case passes on either of two messages (`shotLocking.test.ts:221`) |
| 0070 | `shotLocking4_5_task_11.test.ts` (8: 2 run, 6 skip) | ROUTE (live 401) | projects lock (`:2845`), unlock (`:3020`); `middleware/auth.ts:16-30` | none; real `supabase.auth.getUser` call | 401 for lock and unlock without a valid token | smoke; six skipped cases are the only lock behavior assertions (section 13) |
| 0071 | `shotValidation.test.ts` (6) | UNIT | `shotValidationService` | none | empty list; missing action; duration bounds; duplicate ids; `Did you mean` suggestion | meaningful |
| 0072 | `storyContextService.test.ts` (15) | REPLICATE | storyContextService parsers and formatter (`:70-123, 417-436`) | none; imports nothing from the service (`:8`) | JSON in markdown block; throw on non-JSON; missing tags; shot action formatting | replica; cannot fail on a production change (section 8) |
| 0073 | `streamlineAnalyzeReconcileRoutes.test.ts` (6) | ROUTE | streamline analyze (`routes/streamline.ts:363`), reconcile (`:400`) | analyzeBatch and reconcileDocuments mocked; supabase | questions returned; empty questions not an error; 400 missing files; 404 not owned; reconciled documents returned; 400 missing qaPairs | mock-only for success bodies (echo mock); meaningful for validation; 500 branches (`:387-388, :427-428`) untested |
| 0074 | `streamlineClassification.test.ts` (5) | SVC | `classifyFile` (`streamlineClassificationService.ts:67`) with real `scriptConfidence` and `llmJson` | llm-client `generate` | high-confidence script (0.95) without LLM call; prose via LLM (0.82); fence stripped; invalid type to unclassified; LLM failure to unclassified with confidence 0 | meaningful |
| 0075 | `streamlineClassifyImage.test.ts` (4) | ROUTE | classify-image (`routes/streamline.ts:256-305`) | ImageAnalysisService constructor mocked; storage mocked | upload returns classification; non-image rejected (status 400 or more); fallback guess with confidence 0; 404 not owned | mock-only; real Gemini classify (`imageAnalysisService.ts:165-176`) never exercised; non-image assertion is `>= 400` |
| 0076 | `streamlineCommit.test.ts` (6 named; 8 static) | ROUTE | commit (`routes/streamline.ts:45-99`, RPC at `:77`); backfill (`:99`) | supabase `rpc` mocked | commit validation; RPC name `streamline_commit_atomic`; payload forwarding; RPC error to 400; stage 2 or 3 check | meaningful for validation; mock-only for RPC; SQL in `migrations/044_streamline_atomic_intake_fix.sql:38` not executed; `assets` and `resolutions` forwarding not asserted |
| 0077 | `streamlineExtractFile.test.ts` (6) | ROUTE | extract-file (`routes/streamline.ts:196-226`) with real `extractText` | classifyFile and extractStandaloneAssetDraft mocked | `.txt` text and classification; `character_notes` gets assetDraft; drafting failure does not fail extraction; legacy `.doc` 400; 21 MB rejected | meaningful; no PDF case; oversize assertion is `>= 400` |
| 0078 | `streamlineFormatFile.test.ts` (4) | ROUTE | format-file (`routes/streamline.ts:318-347`) | formatters mocked | treatment and beat-sheet outputs passed through; invalid targetType 400; 404 not owned | mock-only (outputs are test-supplied); text-validation branch `:325-327` untested |
| 0079 | `streamlineFormatting.test.ts` (3) | SVC | `formatAsTreatment`, `formatAsBeatSheet` (`streamlineFormattingService.ts:25-63`) | llm-client | prose trimmed; beat JSON parsed with total runtime 50; defaults for missing order and seconds | meaningful; beat id asserted truthy only |
| 0080 | `streamlineQuestion.test.ts` (5) | SVC | `analyzeBatch` (`streamlineQuestionService.ts:79-96`) | llm-client | empty batch without LLM call; questions parsed; invalid category dropped; `[]` yields empty; LLM failure yields empty | meaningful; test named "stable ids" checks truthiness only; production id uses `Date.now` (`:96`) |
| 0081 | `streamlineReconciliation.test.ts` (6) | SVC | `reconcileDocuments` (`streamlineReconciliationService.ts:74-102`) | llm-client | short-circuits with no Q and A or no files; result mapped to source fileId; unknown filename dropped; invalid editScope defaults; unchanged docs omitted | meaningful; default diffSummary (`:102`) untested |
| 0082 | `streamlineSkip.test.ts` (6) | ROUTE | stage skip (`routes/stageStates.ts:416-491`) and lock (`:297-362`) | supabase queues | stage 1 skip rejected; out-of-order skip rejected; skip over locked stage rejected; lock of N rejected when N-1 is draft; lock allowed after skipped predecessor | meaningful for errors; mock-only for success (inserted payload not asserted) |
| 0083 | `streamlineStandaloneAsset.test.ts` (3) | SVC | `extractStandaloneAssetDraft` (`streamlineStandaloneAssetService.ts:19-41`) | llm-client | well-formed draft; invalid type falls back to character; missing name falls back to filename | meaningful; no LLM-failure case |
| 0084 | `textFieldVersionService.test.ts` backend (18) | REPLICATE | backend `textFieldVersionService` (`:9, 33-38, 191-221`) | none; imports nothing | field names; FIELD_WRITEBACK_MAP; cap at 8 versions; delete oldest non-selected; first version number 1 | replica; header claims the singleton is tested |
| 0085 | `transformationEvents.test.ts` (24) | UNIT | `resolveOverridesForShot` (`transformationEventService.ts:107-211`) | none | within_shot keeps pre and sets transforming; shot after trigger takes post; no override mid-transition; stacking; unconfirmed ignored; allShots fallback | meaningful; `Math.random` fixture id (`:40`) unasserted |
| 0086 | `transformationFlagParsing.test.ts` (12) | UNIT + REPLICATE | `generateShotId` (real, 3 cases); `parseTransformationFlags` (local copy, 9 cases) | none | IDs 1A, 1B, 1Z, 1AA, 1AB (real); within_shot, gradual, filters, defaults (copy) | meaningful for 3; replica for 9 (section 8) |
| 0087 | `transformationPrefill.test.ts` (5) | SVC | `generateTransformationPrefill` (`transformationEventService.ts:380-505`) | supabase; llm-client | no absorbed id returns post only; single assignment yields instant; multiple yields gradual; no assignments keeps description; fenced JSON parsed | meaningful; assignment ordering (`:452`) not asserted (mock pre-sorts) |

Utils (`backend/src/utils/__tests__`, 4 files, jest-matched):

| Ledger | File (count) | Level | Production target | Mocks or inputs | Key invariants asserted | Depth |
|---|---|---|---|---|---|---|
| 0091 | `llmJson.test.ts` (12) | UNIT | `extractJsonArray`, `extractJsonObject`, `LLMJsonParseError` (`utils/llmJson.ts:11, 111-135`) | none | fences; prose-wrapped arrays; trailing commas; truncation; unsalvageable input throws; array passed as object throws | meaningful; the truncation case is reported to pass through the regex fallback (`:84-90`), not bracket counting (`:48-82`) (analyst read, not lead-verified) |
| 0092 | `resolveConflict.test.ts` (8) | UNIT | `resolveConflict` (`utils/resolveConflict.ts:34`) | none | empty list null; tier precedence; last candidate wins in tier; four tiers resolve to tier 1 | meaningful for a DEAD target: the only importer is this test (WD-IMPL-TEST-0092) |
| 0093 | `scriptManifest.test.ts` (25) | UNIT | `extractManifest` (`utils/scriptManifest.ts`) | none | TipTap scene extraction; compound location headings; MOMENTS LATER; location dedupe; action-node characters; speaking characters; CAPS props; screenplay terms filtered | meaningful; weak assertion at `scriptManifest.test.ts:213-214` (section 9) |
| 0094 | `streamlineExtraction.test.ts` (8: 7 run, 1 skip) | UNIT | `streamlineExtractionService.extractText` (`:23, 52`) | none; real fixtures | `.txt` and `.md` exact; RTF to plain; DOCX fixture; legacy `.doc` rejected; unsupported rejected; corrupted PDF rejects (`toBeTruthy`) | meaningful except PDF happy path, which is `it.skip` at `:35` |

Manual files in `backend/src/tests` (not matched by jest): section 14 and WD-IMPL-TEST-0088 to 0090.

---

## 4. Per-file catalogue: frontend vitest, e2e

| Ledger | File (count) | Level | Production target | Mocks or inputs | Key invariants asserted | Depth |
|---|---|---|---|---|---|---|
| 0097 | `Stage9/__tests__/BulkPresenceTemplates.test.ts` (17) | UNIT | `buildTemplateAssignments` (`BulkPresenceTemplates.tsx:56-113`) | none; transitive supabase import | 4 assets by 2 shots give 8 throughout rows; unmatched character none; locations-throughout excludes characters and props; unique keys | meaningful; FAILS at collection without `VITE_*` (section 11) |
| 0098 | `Stage9/__tests__/ShotAssetTimeline.test.ts` (22) | REPLICATE | `ShotAssetTimeline.tsx` is not imported (type-only import of `types/scene`) | none | cycle null to throughout to enters to exits to passes_through; labels; colors; "create on empty cell" is a tautology | replica (section 8) |
| 0099 | `__tests__/ContinuityBaseChooser.test.tsx` (5) | RTL | `ContinuityBaseChooser` (`Stage10FrameGeneration.tsx:77-175`) | none | loading; ranked list calls onSelect; Using and Fresh call onClear; controls disabled during update | meaningful; FAILS at collection without `VITE_*` (`Stage10FrameGeneration.tsx:40`, `frameService.ts:7`) |
| 0100 | `__tests__/MergeDialog.test.tsx` (13) | RTL | `MergeDialog` | projectAssetService mocked; sonner | amber warning on cross-type merge; scene badges; renders nothing under 2 assets | meaningful; confirm and AI merge handler not exercised |
| 0101 | `__tests__/SkippedStagePlaceholder.test.tsx` (3) | RTL | `SkippedStagePlaceholder` | none | both CTAs wired; Generate hidden when not allowed; disabled while in flight | meaningful |
| 0102 | `__tests__/VersionedTextarea.test.tsx` (19) | RTL | `VersionedTextarea` | fetch, create and select injected; use-toast mocked | version counter; navigation at 2+ versions; Save hidden when locked; createVersion with `user_save` | meaningful; real `textFieldVersionService` not used |
| 0103 | `shared/__tests__/EnhancedUploadModal.test.tsx` (33) | RTL | `EnhancedUploadModal` (`:224-463`) | actions injected; sonner mocked | onAccept payload; onRegenerate without referenceImageUrl; onEditImage payload; carousel "2 / 2"; no Remove BG for location | meaningful |
| 0104 | `streamline/__tests__/AskAuteurQuestionUI.test.tsx` (4) | RTL | `AskAuteurQuestionUI` | none | option answer with `answerSource` option; freetext; submit disabled until typed; decline | meaningful |
| 0105 | `streamline/__tests__/StreamlineDropZone.test.tsx` (5) | RTL | `StreamlineDropZone` | `streamlineService.extractFile` mocked; sonner | `.doc` rejected with save-as toast; PNG rejected client-side; one failure leaves others; onBatchSettled once; first file primary | meaningful; test name claims session persistence, and the component uses no storage (grep, WD-IMPL-TEST-0105) |
| 0106 | `streamline/__tests__/StreamlineImageReviewGrid.test.tsx` (4) | RTL | `StreamlineImageReviewGrid` | `streamlineService.classifyImage` mocked | classify dropped image; fuzzy match to entity; toggle title; one failure does not block | meaningful; routing not asserted |
| 0107 | `streamline/__tests__/StreamlineReviewScreen.test.tsx` (5) | RTL | `StreamlineReviewScreen` | none | files listed; confirm calls onConfirm; disabled with reason; partial failure notice; edit summaries | meaningful |
| 0108 | `streamline/__tests__/StructuralCascadeConfirmDialog.test.tsx` (4) | RTL | `StructuralCascadeConfirmDialog` | none | closed renders nothing; lists files with diff; apply and cancel callbacks | smoke to meaningful (J grades SM) |
| 0109 | `services/__tests__/projectAssetService.editImage.test.ts` (5) | MSW | `startEditImageJob`, `getImageJobStatus` (`projectAssetService.ts:851, 887`) | supabase token; MSW | POST body with instructions; removeBackground; API error thrown; failed status error; HTTP 404 (named "network error", no network failure simulated) | meaningful; name overclaims |
| 0110 | `services/__tests__/projectAssetService.test.ts` (5) | MSW | `mergeDescriptions`, `updateAsset`, `mergeAssets` (`:189, 244, 785`) | supabase token; MSW | POST descriptions returns merged; Bearer header; unauthenticated throws; PUT asset_type; updatedDescription forwarded | meaningful; `expect()` inside handlers surfaces as 500 |
| 0111 | `services/__tests__/projectService.test.ts` (4) | MSW | create, get, list, delete (`:23, 50, 77-129`) | supabase; MSW | POST echoes id and title; DELETE 204; delete failure Forbidden; no session throws | meaningful; `updateProject` untested |
| 0112 | `services/__tests__/sceneAssetService.editImage.test.ts` (4) | MSW | `startEditImageJob`, `analyzeSceneAssetImage` (`:720, 759`) | supabase; MSW | edit body with instructions, reference, description; regeneration without reference; analysis returned; API error surfaced | meaningful |
| 0113 | `services/__tests__/sceneAssetService.inferContext.test.ts` (5) | MSW | `inferContext`, `bulkInferContext` (`:799, 831`) | supabase; MSW | single suggestion; bulk instanceIds body; 500 surfaced; two cases echo mock values (`:206-248`) | meaningful for 3; mock-only for 2 |
| 0114 | `services/__tests__/scriptService.test.ts` (11) | UNIT | `extractScenes` slug logic (`scriptService.ts`) | none; unmocked supabase import | `int-kitchen-day-1`; apostrophes sanitized; duplicate suffixes; sequential numbering | meaningful; FAILS at collection without `VITE_*`; header says vitest "must be installed" (stale) |
| 0115 | `services/__tests__/shotAssetAssignmentService.test.ts` (13) | MSW | frontend `shotAssetAssignmentService` | supabase; MSW | PUT presence_type; POST assignments; GET per-shot; hasAssignments false; no session throws | meaningful; `listForShot` has no production caller (`:39`) |
| 0116 | `services/__tests__/textFieldVersionService.test.ts` (11) | MSW | frontend `textFieldVersionService` (`:33-196`) | supabase; MSW | snake_case to camelCase; default source user_save; error surfaced; select endpoint; description_override mapping | meaningful |
| 0117 | `lib/utils/__tests__/screenplay-converter.test.ts` (23) | UNIT | `parseScriptToTiptapJson`, `tiptapJsonToPlainText`, `stripHtmlTags` | none | scene headings uppercase; null doc handled; residual HTML stripped; round trip | meaningful; round trip asserts substring containment only; `tiptapToPlainText` and `plainTextToTiptap` uncovered |
| 0118 | `lib/utils/__tests__/scriptConfidence.test.ts` (4) | UNIT | `detectScriptConfidence` (thresholds in `config/streamlineConfig.ts:6-7`) | none | formatted screenplay high; single heading ambiguous; prose low; doc returned | meaningful |
| 0119 | `lib/utils/__tests__/shotAssetMatcher.test.ts` (34) | UNIT | `matchAssetToShots` (`:57`) | none | foreground character 1.0; dialogue character; location by setting name at least 0.9; prop in action | meaningful; one case passes through a zero default (logical-or with 0 in the test) |
| 0120 | `lib/utils/__tests__/stageBadge.test.ts` (7) | UNIT | `getStageBadge` (`:29`) | none | skipped yields SKIPPED; AUTO-FILLED with tooltip; authored or absent origin no badge; outdated outranks origin | meaningful; one case passes `active` as a status |
| 0121 | `lib/utils/__tests__/streamlineRouting.test.ts` (15) | UNIT | `computeStreamlineRouting` (`:53`) | none | script-only skips 2 and 3, locks 4; beat-sheet-only skips 2, locks 3; low confidence not routed; screenplay override; character_notes asset-only | meaningful |
| 0122 | `pages/__tests__/derivePhaseAStages.test.ts` (6) | UNIT | `derivePhaseAStages` (`pages/ProjectView.tsx:44-80`) | imports the page module | skipped counts as passed; skip 2 and 3 land on 4; draft precedence; outdated carries origin; no rows pending | meaningful; test name "active" overclaims (no active status); FAILS at collection without `VITE_*` |

E2E (not run):

| Ledger | File (cases) | Level | Routes and selectors | Skips | Notes |
|---|---|---|---|---|---|
| 0123 | `e2e/enhanced-upload-modal.spec.ts` (23) | E2E | `/auth` login; `/projects/{id}?stage=5`, `?stage=7`, `?stage=8&sceneId`; Upload button and input accept png (`Stage5Assets.tsx:808, 821, 1313, 1332`) | 11 `test.skip` (`:167-379`) when env absent or no Upload button | modal assertions inside `if (appeared)` (`:333, :359`) pass silently; `waitForTimeout` at `:90, 129, 136, 319, 350`; fallback literals `:30-31`; writes a PNG into a repo tmp path at runtime |
| 0124 | `e2e/story-context-update.spec.ts` (12) | E2E | `/auth`; dashboard; Stage 8 "Infer from Story", "Story Context Suggestion", "Accept Description", "Accept Both"; bulk "Update from Context", "Apply Selected" | 3 `test.skip` (`:98, 109, 178`) | waits of 45 s, 60 s, 90 s; `waitForTimeout` at `:61, 68`; real LLM inference when run; negative assertion at `:196` has no list-loaded check; first-match class selectors (`:117, 133, 150`) |

Config and helper files are described in section 1 and in WD-IMPL-FACT-0263: `backend/jest.config.js`, `backend/jest.setup.ts`, `vite.config.ts:26-32`, `src/test/setup.ts`, `playwright.config.ts`, `backend/src/tests/helpers/supabaseMock.ts` (exports `configureSupabaseMock`, `configureSupabaseStorageMock`, `mockSupabaseTarget`, `MockResult`; uses the global `jest` without import; imported by 6 streamline route tests), and the two fixtures.

---

## 5. Wave-1 TEST entries and their status

The 50 wave-1 TEST entries (WD-IMPL-TEST-0001 to 0050) predate J's file-level pass. Most restate a J catalogue row. Duplicates, by wave-1 ID to J ledger ID: 0001 to 0122, 0002 to 0111, 0003 to 0120, 0004 to 0082, 0005 to 0059, 0006 to 0053, 0014 to 0051, 0016 to 0100, 0109, 0110, 0019 to 0085, 0020 to 0087, 0022 to 0112, 0113, 0024 to 0054, 0026 to 0056, 0028 to 0063, 0029 to 0068, 0030 to 0053, 0031 to 0065, 0033 to 0067, 0034 to 0069, 0071, 0037 to 0068, 0039 and 0043 to 0058, 0040 to 0064, 0041 to 0057, 0047 to 0091. Wave-1 entries 0008, 0018 and 0045 are partial and map to 0123, 0124, 0102 and 0099. Wave-1 entries 0009, 0011, 0012 and 0049 map to the J rows cited in sections 3 and 4.

Wave-1 claims with a verdict (J section 6 and WD-IMPL-FACT-0264):

| Ledger | Claim | Status | Where |
|---|---|---|---|
| WD-IMPL-TEST-0007 | shot lock tests are auth and validation only | CONFIRMED | section 13 |
| WD-IMPL-TEST-0010 | storyContext and textFieldVersion tests replicate | CONFIRMED (manifest test imports the real module) | section 8.1 |
| WD-IMPL-TEST-0013 | scriptManifest.smoke is not a jest test | CONFIRMED (`backend/jest.config.js:34-37`) | section 14 |
| WD-IMPL-TEST-0015, 0042 | image-generation test is stale | CONFIRMED by static trace; not run | section 9.4 |
| WD-IMPL-TEST-0017, 0023, 0050 | untested asset, Stage 8 and AI call surfaces | absence checks; stand | section 6 |
| WD-IMPL-TEST-0021 | replicated-logic tests | CONFIRMED, plus transformationFlagParsing | section 8.1 |
| WD-IMPL-TEST-0025 | continuity parity by construction | PARTIALLY CONFIRMED | section 12 |
| WD-IMPL-TEST-0032 | ContinuityBaseChooser coverage | covered by 0099; top-8 display state untested | section 10, row 11 |
| WD-IMPL-TEST-0035 | lock and unlock route tests | CONFIRMED: only 401 cases run | section 13 |
| WD-IMPL-TEST-0036 | shot-asset assignment service | service tested; shadowed `/all` route not exercised | section 10, row 6 |
| WD-IMPL-TEST-0038 | ShotAssetTimeline replicates | CONFIRMED | section 8.1 |
| WD-IMPL-TEST-0046 | no tests for checkout, credits, video, providers, Stages 11 and 12 | CONFIRMED (checkout route grep: 0 hits) | section 6, rows 18, 19, 32 |
| WD-IMPL-TEST-0048 | llm-integration is not gated | CONFIRMED for the unconditional blocks | section 15, row 4 |
| WD-IMPL-TEST-0049 | AI-consuming tests mock the LLM | stands; mock-only by design (parsing and fallback) | sections 3, 6 |

---

## 6. Subsystem by depth matrix

Depth labels as defined at the top. The matrix is a synthesis of section 3 and 4 rows, J section 3, and the V7, V8 and V9 test sections. "Not covered" lists the notable production paths with no test that reaches them.

| # | Subsystem | Depth | Tests (ledger) | Not covered |
|---|---|---|---|---|
| 1 | Narrative data helpers: manifest, screenplay converter, script confidence | meaningful | 0093, 0117, 0118, 0114 | Stage 2, 3 and 4 LLM generation routes (0050; WD-IMPL-FACT-0249) and components |
| 2 | Story context assembly (storyContextService) | replica | 0072 | real service; `assembleSceneStoryContext` (R1a verdict, WD-IMPL-TEST-0072) |
| 3 | Streamline intake: extraction, classification, formatting, reconciliation, routing, commit | meaningful for validation and parsing; mock-only for RPC and success bodies | 0073 to 0083, 0094, 0104 to 0108, 0121 | PDF happy path (0094, skipped); RPC SQL (0076); `Stage1InputMode` and `streamlineService.ts` (WD-IMPL-TEST-0012 notes); `formatChoice` (R1b, no backend reference) |
| 4 | Project assets, Stage 5 | meaningful for type, merge, client merge, edit-image client, upload modal | 0051, 0100, 0103, 0109, 0110 | extraction, attempts, clone, match, sync, promote, localizer, lock-all, mark-outdated, clear-all, split, upload routes (0017) |
| 5 | Scene assets, Stage 8 | meaningful for transformation prefill and client; none for routes | 0087, 0102, 0112, 0113, 0116 | scene asset routes, relevance, attempts, inheritance, use-master, upload, suggestions (0023); Stage 8 components |
| 6 | Transformations | meaningful for resolver and prefill; replica for flag parser | 0085, 0087, 0086 (3 real cases) | `transformation_flags` has no reader (CAP-0192 note, R1b); transformation-events routes have no route test (WD-IMPL-FACT-0323) |
| 7 | Continuity base, continuity mode, continuity metrics | meaningful for ranking, base route, mode and metrics arithmetic | 0053, 0054 | continuity-preview route; available-references; batch-link-copy; chain-from-end-frame; frame-links DELETE; generate-continuity-prompt; reference-images base guard; `propagateFrameLinks` (V7 section 12) |
| 8 | Scene continuity risk (rules 1 to 4) | meaningful | 0056 | UI is not tested (CAP-0217 flag Y reflects the unit test only) |
| 9 | Frame reference context, add-frame-as-reference, copy-frame | meaningful for these three | 0057, 0065 | frames generate route, regenerate, status and polling, select-generation, generation delete, FramePanel, FrameGrid, FrameUploadModal (V9 section 12) |
| 10 | Continuity parity (preview vs generation) | mock-only by construction | 0055 | section 12 |
| 11 | Locations: resolver, coverage, shot location routes | meaningful | 0062, 0063, 0068 | strength matrix; mismatch state; 0.84 token cutoff; the 0.8 threshold in `continuityCompositionService.ts:233` (V7 section 3.4) |
| 12 | Shot list (Stage 7): extraction, split, validation | meaningful for extraction, split and validation | 0067, 0069, 0071 | merge, delete and reorder routes; Stage 7 UI (CAP-0222 to 0230 are N or P) |
| 13 | Shot and scene locking | gate: none; lock 401: smoke; predecessor rules: mock-only success | 0070, 0082 | shot mutation gate (section 13); `sceneStageLocks.ts:56, 145, 290` (zero tests, WD-IMPL-FACT-0258); migration 014 trigger (J section 7) |
| 14 | Shot-asset assignments | service: mock-only; routes: none | 0066, 0115 | `routes/shotAssignments.ts` (no route test); shadowed DELETE /all (section 10); `listForShot` (DEAD) |
| 15 | Prompt generation for Stage 9 | meaningful for pure helpers only | 0064 | LLM prompt generation (frame, video, end, continuity, correction), `generateBulkPromptSets`, `determineContinuityLink`, `determineRequiresEndFrame`, `cleanPromptOutput`, generate-prompts route (V9 section 12) |
| 16 | Frame generation pipeline, Stage 10 | none for generation and polling; meaningful for chooser | 0099 | `generateFrames`, `regenerateFrame`, `startFrameGeneration`, polling, approve, reject, inpaint (V9 section 12) |
| 17 | Image generation (ImageGenerationService, NanoBananaClient) | none executed; vision classify mock-only | 0060 (not run), 0075 | nothing executed; style guard predicted to fail (section 9); NanoBanana `generateImage` wrapper, reached only by the live file that is not run (0050) |
| 18 | Video generation and Veo3 | none automatic | 0089 (manual, billable) | `VideoJobExecutor`, `videoGenerationService` (WD-IMPL-FACT-0259 lists zero name references) |
| 19 | Checkout and credits | none | none | checkout routes (zero endpoint hits), `userCreditsService`, `checkoutService` (0046) |
| 20 | Style capsules | none automatic | 0095 (manual) | `routes/styleCapsules.ts` (zero hits, WD-IMPL-FACT-0258), `styleCapsuleService.ts` |
| 21 | Stage states: skip, lock, status, origin | meaningful for predecessor errors; mock-only for success | 0082, 0120, 0122 | stage-state GET and PUT beyond skip and lock; stage 4 backfill |
| 22 | Auth middleware | smoke | 0070 (401 only) | token-format branches; 500 branch of `auth.ts:40-42`; section 13 explains the live call |
| 23 | Health and config | smoke | 0059 | none |
| 24 | LLM infrastructure: token-utils, prompt-template, llmClient | token-utils and interpolation meaningful; live blocks not run | 0061 | `formatCost`, `formatTokenUsage`, `isSupportedModel`, `getSupportedModels` have no caller (section 8); llmClient direct tests |
| 25 | Frontend, Stage 1 streamline leaves | meaningful | 0104 to 0108 | `Stage1InputMode` container (WD-IMPL-FACT-0260) |
| 26 | Frontend, Stage 2 to 4 containers | none (skip placeholder only) | 0101 | `Stage2Treatment`, `Stage3BeatSheet`, `Stage4MasterScript` (WD-IMPL-FACT-0249) |
| 27 | Frontend, Stage 5 leaves | meaningful | 0100, 0103 | `Stage5Assets` container (indirect only) |
| 28 | Frontend, Stage 6 and 7 | none | none | `Stage6ScriptHub`, `Stage7ShotList` (WD-IMPL-FACT-0260) |
| 29 | Frontend, Stage 8 | service clients meaningful; components none | 0102, 0112, 0113 | Stage 8 containers and most of `Stage8/` (WD-IMPL-FACT-0260) |
| 30 | Frontend, Stage 9 | pure builder meaningful; timeline is a replica; container none | 0097, 0098 | `Stage9PromptSegmentation`, `ShotAssetPanel`, `ContinuityPreviewPanel`, `useShotAssetAutoPopulate` (V8 section 10) |
| 31 | Frontend, Stage 10 | chooser meaningful | 0099, 0102 | `Stage10FrameGeneration` container, `FramePanel`, `FrameGrid`, `FrameUploadModal` (V9 section 12) |
| 32 | Stage 11 and 12 | none | none | `Stage11Confirmation`, `Stage12VideoGeneration` (WD-IMPL-TEST-0046) |
| 33 | ProjectView navigation | pure function meaningful | 0122 | page render (WD-IMPL-TEST-0001 note) |
| 34 | Auth UI and dashboard | none | none | `AuthForm`, `Dashboard` (CAP-0001 to 0014, V1 N); e2e login not run |
| 35 | Global asset library and style capsule UI | none | none | `routes/assets.ts`; `AssetLibrary`, `StyleCapsuleLibrary` (CAP-0047, 0053 to 0081, V2 N) |

Coverage by target count (J): 21 backend services and 14 frontend services have no test importing them (WD-IMPL-FACT-0259, WD-IMPL-FACT-0260). Backend services with zero name references include assetExtractionService, sceneAssetRelevanceService, shotMergeService, streamlineBackfillService, userCreditsService and videoGenerationService (WD-IMPL-FACT-0259).

---

## 7. Capability coverage from the CAP `tested` flag

Method: the CAP ledger (287 entries, WD-IMPL-CAP-0001 to 0287) carries `flags.tested` with values Y, P, N and U. The first character of each value was counted. No entry has tested U. Individual caveats are listed in 7.2.

### 7.1 Counts by flag value

| `tested` | Count | Share | Ledger meaning |
|---|---|---|---|
| Y | 37 | 12.9% | at least one test reaches the capability (reporter judgment) |
| P | 31 | 10.8% | reporter found part of the capability tested and part not |
| N | 219 | 76.3% | no test reaches the capability |
| U | 0 | 0.0% | none |
| Total | 287 | 100% | |

By reporter (Y, P, N, total):

| Reporter | Area | Y | P | N | Total |
|---|---|---|---|---|---|
| V1 | Shell, auth, dashboard, Phase A and scene navigation (0001 to 0052) | 7 | 1 | 44 | 52 |
| V2 | Style capsules, global assets, cross-slice asset surfaces (0053 to 0087) | 0 | 0 | 35 | 35 |
| V3 | Narrative Stages 1 to 4, Script Hub (0088 to 0109) | 1 | 0 | 21 | 22 |
| V4 | Streamline intake, skip and lock (0110 to 0135) | 13 | 7 | 6 | 26 |
| V5 | Project assets, Stage 5 (0136 to 0161) | 2 | 4 | 20 | 26 |
| V6 | Scene assets, Stage 8, transformations (0162 to 0192) | 5 | 0 | 26 | 31 |
| V7 | Continuity and locations (0193 to 0221) | 9 | 4 | 16 | 29 |
| V8 | Shot list, locking, shot assignments (0222 to 0239) | 0 | 12 | 6 | 18 |
| V9 | Prompts and frames, Stages 9 and 10 (0240 to 0265) | 0 | 3 | 23 | 26 |
| V10 | Video, checkout, Stages 11 and 12 (0266 to 0287) | 0 | 0 | 22 | 22 |
| Total | | 37 | 31 | 219 | 287 |

Cross-tabulation with the `functional` flag (same ledger entries):

| `tested` \ `functional` | Y | P | U | N | Total |
|---|---|---|---|---|---|
| Y | 24 | 10 | 2 | 1 | 37 |
| P | 19 | 8 | 3 | 1 | 31 |
| N | 118 | 76 | 17 | 8 | 219 |

Of the 219 untested capabilities, 118 are marked functional Y without a test, 76 functional P, 17 functional U (runtime needed) and 8 functional N. Source: CAP flags across WD-IMPL-CAP-0001 to 0287.

Labels on the 219 N entries (an entry can carry several): PARTIAL 15, CONTRADICTED 9, DUPLICATED 9, MOCK-ONLY 5, DEAD 3, ORPHANED 2, LEGACY 1, UNKNOWN 1, CROSS-SLICE 4.

### 7.2 Capabilities with tested Y (37)

| Ledger | Capability | Caveat |
|---|---|---|
| WD-IMPL-CAP-0013 | Create project from dashboard | projectService MSW test (0111) |
| WD-IMPL-CAP-0015 | Delete project from dashboard card | projectService MSW test (0111) |
| WD-IMPL-CAP-0027 | Write this myself on a skipped stage | placeholder component only (0101) |
| WD-IMPL-CAP-0032 | Enter a scene pipeline from the Script Hub | ProjectView not rendered by any test (0122 is pure) |
| WD-IMPL-CAP-0042 | Status badges on Phase A timeline | stageBadge unit (0120) |
| WD-IMPL-CAP-0045 | Continuity mode read and write (API) | mock-only persistence (0053) |
| WD-IMPL-CAP-0046 | Continuity metrics summary (API) | mock-only persistence; metrics arithmetic meaningful (0053) |
| WD-IMPL-CAP-0105 | Stage 4 Preview Scenes (in-memory) | persisted flag P; no test named for it in the ledger |
| WD-IMPL-CAP-0111 | Drop or choose documents: extraction and classification | StreamlineDropZone (0105), mocked service |
| WD-IMPL-CAP-0113 | Override a file's type | StreamlineDropZone (0105) |
| WD-IMPL-CAP-0114 | Set primary file or remove file | StreamlineDropZone (0105) |
| WD-IMPL-CAP-0117 | Standalone Stage 5 asset draft | streamlineExtractFile route (0077), mocked draft |
| WD-IMPL-CAP-0118 | Batch reference image upload and AI classification | ImageReviewGrid (0106), mocked service |
| WD-IMPL-CAP-0119 | Edit, accept, skip, remove image cards | ImageReviewGrid (0106) |
| WD-IMPL-CAP-0120 | Ask Auteur automatic clarification analysis | streamlineQuestion (0080), mocked LLM |
| WD-IMPL-CAP-0124 | Pre-commit review screen with routing preview | ReviewScreen (0107) |
| WD-IMPL-CAP-0128 | Skipped stage placeholder | 0101 |
| WD-IMPL-CAP-0131 | Stage provenance badges | stageBadge (0120) |
| WD-IMPL-CAP-0132 | Ask Auteur ESTABLISHED FACTS injection | formatter only (0052); `prepareStageContext` is DEAD; label PARTIAL and ORPHANED |
| WD-IMPL-CAP-0133 | Skip a Phase A stage via REST | success path mock-only (0082); label ORPHANED |
| WD-IMPL-CAP-0134 | EnhancedUploadModal image reconciliation | RTL (0103); functional U |
| WD-IMPL-CAP-0141 | Change asset type (single and bulk) | assetTypeAndMerge (0051) |
| WD-IMPL-CAP-0148 | Merge descriptions with AI (MergeDialog) | MergeDialog render only (0100); AI handler not exercised |
| WD-IMPL-CAP-0183 | Infer description and tags from story context | client MSW test (0113); label CONTRADICTED |
| WD-IMPL-CAP-0184 | Bulk update from story context | client MSW test (0113) |
| WD-IMPL-CAP-0185 | Add transformation event manually (AI prefill) | prefill (0087) |
| WD-IMPL-CAP-0191 | Transformation resolution applied to downstream prompts and frames | resolver (0085); pure, no DB |
| WD-IMPL-CAP-0192 | Derived shot transformation flags (not consumed) | test is a replica (0086); CAP correction (section 16); label DEAD |
| WD-IMPL-CAP-0193 | Stage 7 manual location select or clear | shotLocationRoutes (0068) |
| WD-IMPL-CAP-0195 | Stage 7 Re-run Resolver, preserve manual | shotLocationRoutes (0068) |
| WD-IMPL-CAP-0198 | Stage 8 Basic and Advanced toggle | continuity-mode route (0053); label CROSS-SLICE-V1 |
| WD-IMPL-CAP-0199 | Stage 8 assign a shot's camera direction | shotLocationRoutes (0068) |
| WD-IMPL-CAP-0206 | Stage 10 select continuity base | ContinuityBaseChooser (0099); route (0053) |
| WD-IMPL-CAP-0207 | Stage 10 Fresh (clear continuity base) | route (0053) |
| WD-IMPL-CAP-0208 | Stage 10 Pull match or Pull ref | copy-frame and add-frame-as-reference (0065) |
| WD-IMPL-CAP-0215 | Start-frame source selection at generation | parity block covers reference resolution only, not the decision order; functional U |
| WD-IMPL-CAP-0217 | Scene continuity risk badge in Stage 6 | rules unit (0056); UI not tested |

### 7.3 Capabilities with tested P (31)

WD-IMPL-CAP-0024 (V1); 0116, 0121, 0122, 0123, 0125, 0127, 0129 (V4); 0143, 0144, 0145, 0147 (V5); 0194, 0196, 0197, 0219 (V7); 0223, 0224, 0228, 0229, 0231, 0232, 0233, 0234, 0235, 0237, 0238, 0239 (V8); 0245, 0248, 0257 (V9). Each carries a partial note in the ledger. Examples: 0219 (shot edit re-resolves; split and merge untested), 0238 (bulk templates: `DELETE /all` shadowed, section 10), 0229 (legacy unlock; the UI path returns 400 and the error is swallowed, V8 section 6).

### 7.4 Capabilities with tested N (219), by reporter

Listed by ledger number (`WD-IMPL-CAP-` prefix omitted):

- V1 (44): 0001 to 0012, 0014, 0016 to 0023, 0025, 0026, 0028 to 0031, 0033 to 0041, 0043, 0044, 0047 to 0052. Covers sign-up and sign-in, sign-out, route protection, landing, dashboard search and errors, project open, sidebar, Phase A navigation and the locked-stage and unlock flows, and the project header.
- V2 (35): 0053 to 0087. Covers the style capsule library and editors, capsule routes, global asset routes and UI, promote, clone, match, version sync, the seed route, and style lock on scene assets.
- V3 (21): 0088 to 0104, 0106 to 0109. Covers Stage 1 input and file staging, Stages 2 to 4 generation and editing (treatment, beats, script), the Stage 4 approval, Script Hub outdated modal, and the content carousel.
- V4 (6): 0110, 0112, 0115, 0126, 0130, 0135. Covers the Streamline mode selection, paste as file, retry failed extraction, post-commit scene persistence, unskip, and FileStagingArea.
- V5 (20): 0136, 0137, 0138 to 0140, 0142, 0146, 0149 to 0161. Covers asset scan and extraction confirm, add asset, description edit, defer, remove, attempts carousel, split, global library clone and sync, promote, style lock, batch generation, finalize, angle variants, camera directions, location views, lock frame as view, and shot checklist add.
- V6 (26): 0162 to 0182, 0186 to 0190. Covers Stage 8 auto-populate, inherit, deterministic populate, detect with AI, asset drawer add, inline create, remove, description versioning, status tags, carry-forward, lock tag, generation, attempts, master reference, reference chain, upload, convert to transformation, post-image, suggestions, proceed gate.
- V7 (16): 0200, 0201, 0202, 0203, 0204, 0205, 0209 to 0214, 0216, 0218, 0220, 0221. Covers approved frame as view, create views and generate missing, continuity preview, repair navigation, start-continuity select, recomposition prompt, Push match and ref, Link All, Unlink, break link, reference replace, default start_continuity, match propagation, shot extraction location, lock warnings, backfill CLI.
- V8 (6): 0222, 0225, 0226, 0227, 0230, 0236. Covers auto-extract on empty scene, merge, delete, defer from last-shot dialog, Stage 7 relock, split on passes_through.
- V9 (23): 0240 to 0244, 0246, 0247, 0249 to 0256, 0258 to 0265 (V9 P entries are 0245, 0248, 0257). Covers generate all and per-shot prompts, prompt autosave, end-frame switch, continuity select, Stage 9 lock, Quick Mode, polling, regenerate, correction, edited prompt, inpaint, upload, end-frame prompt, generation selection and deletion, history, lock, end toggle, unlink, slider, read-only continuity display.
- V10 (22): 0266 to 0287. Covers Stage 11 checkout, model variant, cost cards, dependency warnings, credits, render queue, spend total, Stage 12 progress, playback, scrub, retry, auto-retry, complete scene, unsatisfied dropdown, export, render badges, frame cost bar, starting credits, relock, resume, other-scene clips.

### 7.5 Major untested subsystems

Ordered by share of N within the reporter's capabilities.

| Subsystem (reporter) | N of total | Examples (ledger) |
|---|---|---|
| Style capsules and global asset library (V2) | 35 of 35 | capsule routes 0055 to 0064; global asset routes 0075 to 0081; promote and clone 0082, 0083 |
| Video, checkout, Stages 11 and 12 (V10) | 22 of 22 | 0266 to 0287; `checkoutService`, `userCreditsService`, `videoGenerationService` have no test importer (WD-IMPL-TEST-0046) |
| Narrative Stages 1 to 4 generation (V3) | 21 of 22 | 0088 to 0104 (treatment, beats, script LLM flows and editors) |
| Prompts and frames, Stages 9 and 10 (V9) | 23 of 26 | 0240 to 0256 (generation, regenerate, correction, inpaint), 0258 to 0265 |
| Scene assets, Stage 8 (V6) | 26 of 31 | 0162 to 0182, 0186 to 0190 (routes and panels) |
| Project assets, Stage 5 (V5) | 20 of 26 | 0136 to 0140, 0142, 0146, 0149 to 0161 |
| Auth, dashboard, project shell (V1) | 44 of 52 | 0001 to 0052 (auth flows and dashboard are untested; E2E login not run) |
| Continuity and locations, routes and UI (V7) | 16 of 29 | 0200 to 0205, 0209 to 0214, 0216, 0218, 0220, 0221 |
| Shot list, Stage 7 (V8) | 6 of 18 | 0222, 0225 to 0227, 0230, 0236 (plus 12 P entries) |
| Streamline intake (V4) | 6 of 26 | 0110, 0112, 0115, 0126, 0130, 0135 |

---

## 8. Replica tests and dead-target tests

### 8.1 Replica tests (assert copies, cannot fail on a production regression)

| Ledger | File | Cases | What is copied | Production location |
|---|---|---|---|---|
| WD-IMPL-TEST-0072 | `backend/src/tests/storyContextService.test.ts` | 15 | parsers and formatter; imports nothing (`:8`) | `backend/src/services/storyContextService.ts:70-123, 417-436` |
| WD-IMPL-TEST-0084 | `backend/src/tests/textFieldVersionService.test.ts` | 18 | field names, `FIELD_WRITEBACK_MAP`, `MAX_VERSIONS = 8` | `backend/src/services/textFieldVersionService.ts:9, 33-38, 191-221` |
| WD-IMPL-TEST-0086 | `backend/src/tests/transformationFlagParsing.test.ts` | 9 of 12 | local `parseTransformationFlags` (`:38-64`) | inline logic at `backend/src/services/shotExtractionService.ts:375-390`, not exported |
| WD-IMPL-TEST-0098 | `src/components/pipeline/Stage9/__tests__/ShotAssetTimeline.test.ts` | 22 | `PRESENCE_CYCLE`, labels, colors, dot color (`:67-81, 252-256`) | `src/components/pipeline/Stage9/ShotAssetTimeline.tsx:22, 78-80` |

Total: 64 replica cases (42 backend, 22 frontend). They are part of the 723 executed runner tests and pass regardless of production behavior. Current copies match production: `ShotAssetTimeline.tsx:22` equals `ShotAssetTimeline.test.ts:67` (lead check). Drift would not be detected. One partial replica also exists: the `toRoleSequence` expected side in `continuityCompositionService.test.ts:116-121` (WD-IMPL-TEST-0055), not counted above.

### 8.2 Dead-target tests (test code whose target has no production caller)

| Ledger | Test | Target | Production callers |
|---|---|---|---|
| WD-IMPL-TEST-0092 | `backend/src/utils/__tests__/resolveConflict.test.ts` (8 cases) | `backend/src/utils/resolveConflict.ts:34` | none; the only importer is this test. The doc comment at `resolveConflict.ts:4-5` names callers that do not exist. |
| WD-IMPL-TEST-0052 | `contextManagerAuteurResolutions.test.ts` (4 cases) | `ContextManager.prepareStageContext` (`contextManager.ts:288`) | none. The other formatter cases are reached through `streamlineBackfillService.ts:62`. |
| WD-IMPL-TEST-0061 | `llm-integration.test.ts` Token Utils cases at `:63`, `:71`, `:76` (format cost, format usage, validate models) | `formatCost`, `formatTokenUsage`, `isSupportedModel`, `getSupportedModels` (`token-utils.ts:132-156`) | none outside tests |
| WD-IMPL-TEST-0115 | frontend `shotAssetAssignmentService.test.ts` (`listForShot` cases) | `src/lib/services/shotAssetAssignmentService.ts:39` | none (grep, WD-IMPL-TEST-0115) |

Untested and uncalled (wave-1 DEAD; zero test references, WD-IMPL-FACT-0253): `inpaintImage` (`NanoBananaClient.ts:171`), `extractEntityMentions`, `splitBeat`, `getInheritanceChain`, `addCredits`, `langsmithClient`, `mockTreatments`, `IssueResolutionSection`, frontend `imageService.ts`.

---

## 9. Stale, skipped, flaky and statically predicted failures

### 9.1 Skipped tests (static counts)

Twelve static skips in the jest slice, seven of which are skipped in the executed subset. No `.only`, `.todo`, `xit` or `xdescribe` in the slice. Vitest has no skips (WD-IMPL-FACT-0255).

| File | Skips | Lines | Condition as written |
|---|---|---|---|
| `backend/src/tests/shotLocking4_5_task_11.test.ts` | 6 `it.skip` | `:36, :47, :57, :67, :90, :99` | "requires DB + auth"; uses TEST_* env with placeholder defaults (section 13) |
| `backend/src/tests/llm-integration.test.ts` | 5 `test.skip` | `:303, :317, :334, :339, :346` | live Gemini, LangSmith, rate limit, retry, template-to-generation flow; static skips |
| `backend/src/utils/__tests__/streamlineExtraction.test.ts` | 1 `it.skip` | `:35` | PDF happy path; comment `:27-34` says pdfjs worker import fails under Jest (not run) |
| `e2e/enhanced-upload-modal.spec.ts` | 11 conditional `test.skip` | `:167-379` | env absent, or no Upload button |
| `e2e/story-context-update.spec.ts` | 3 conditional `test.skip` | `:98, :109, :178` | env absent, or UI absent |

### 9.2 Weak, tautological or conditional assertions

Each entry cannot fail, or asserts less than its name says.

| Ledger | Location | Issue |
|---|---|---|
| WD-IMPL-TEST-0093 | `backend/src/utils/__tests__/scriptManifest.test.ts:213-214` | `cut` and `fade` cannot be prop keys (prop keys are multi-word and lowercase), so the assertion cannot fail for those words. It passes even if `CAPS_IGNORE_SET` (`scriptManifest.ts:214-222`) lost `CUT TO` or `FADE OUT`. The ledger entry WD-IMPL-TEST-0064 cites this at `promptGeneration.test.ts:213-214` (corrected in section 16). |
| WD-IMPL-TEST-0069 | `backend/src/tests/shotLocking.test.ts:221` | typo case passes if a warning contains `Did you mean` or `not found`. The service emits both (`shotValidationService.ts:156-157`), so the assertion does not prove a suggestion. |
| WD-IMPL-TEST-0065 | `backend/src/tests/referenceContinuity.test.ts:368-373` | cleanup assertion is inside `if (shotCleanup)`; a missing write passes silently. |
| WD-IMPL-TEST-0060 | `backend/src/tests/image-generation.test.ts:211-213` | error asserted only if status is failed. Six empty tests at `:260-285`. |
| WD-IMPL-TEST-0094 | `streamlineExtraction.test.ts:64` | corrupted PDF uses `rejects.toBeTruthy`. |
| WD-IMPL-TEST-0080 | `streamlineQuestion.test.ts:29` | "assigns stable ids" checks truthiness only; the id is `q-index-Date.now()` (`streamlineQuestionService.ts:96`). |
| WD-IMPL-TEST-0105 | `StreamlineDropZone.test.tsx` | named for session persistence; the component uses no storage. |
| WD-IMPL-TEST-0122 | `derivePhaseAStages.test.ts` | named "active"; the function sets no active status. |
| WD-IMPL-TEST-0109 | `projectAssetService.editImage.test.ts` | named "network error"; the case is an HTTP 404. |
| WD-IMPL-TEST-0119 | `shotAssetMatcher.test.ts` | "higher confidence for direct name match" passes through a zero default (logical-or with 0 in the test); the ordering name asserts only the dialogue 0.4 case. |
| WD-IMPL-TEST-0123, 0124 | e2e specs | modal assertions inside `if (appeared)` (`enhanced-upload-modal.spec.ts:333, :359`); negative assertion without a list-loaded check (`story-context-update.spec.ts:196`). |

### 9.3 Stale headers and comments

- WD-IMPL-TEST-0061: `isEnvironmentConfigured` checks `SUPABASE_ANON_KEY` (`:392`) while `config/supabase.ts:10` reads the service-role key. The function only logs (`:398-400`), so it gates nothing.
- WD-IMPL-TEST-0065: header (`:7`) claims a batch-link-copy test. None exists.
- WD-IMPL-TEST-0072 and 0084: headers claim the service or singleton is tested. Neither imports it.
- WD-IMPL-TEST-0086: comment at `:36` says the logic is at about line 247; production is at `:375-390`.
- WD-IMPL-TEST-0076: header claims the RPC SQL is exercised. No test runs SQL.
- WD-IMPL-TEST-0114: header says Vitest "must be installed"; Vitest is configured (`vite.config.ts:26-32`).
- WD-IMPL-TEST-0092: doc comment `resolveConflict.ts:4-5` names non-existent callers.

### 9.4 Statically predicted failures in live suites (not executed)

- `image-generation.test.ts`: all seven live `master_asset` cases omit both `visualStyleCapsuleId` and `manualVisualTone` (`:115-119, :132-137, :152-158, :172-179, :198-203, :221-226, :240-246`). `ImageGenerationService.ts:139-141` throws before the insert at `:146`. The prediction is seven failures once `beforeEach` succeeds (WD-IMPL-FACT-0254). The lead verified the guard text and line numbers; the seven call sites are analyst-read.
- Timing: fixed sleeps of 1000 ms (`:140`) and 3000 ms (`:206`); a 2000 ms latency bound (`:128`); `Date.now` in identifiers (`:17, :150`) (WD-IMPL-FACT-0262).
- `llm-integration.test.ts`: template tests delete rows at the end of the body, not in `finally` (`:152, :192-193`); `beforeEach` cleanup swallows errors (`:90-103`); one token-utils assertion depends on locale (`:73`). Live blocks need live keys and a reachable database.
- Full backend `jest` run including the two live suites: UNKNOWN.

### 9.5 Flaky or time-dependent patterns

- `shotExtraction.test.ts:180`: the timeout case uses a 10 ms mock rejection. The production timer is 20 s (`shotExtractionService.ts:299, :443-446`) and is never cleared (WD-IMPL-TEST-0067).
- `transformationEvents.test.ts:40`: `Math.random` fixture id, never asserted; no flake observed (WD-IMPL-TEST-0085).
- `continuityRiskAnalyzer.test.ts`: fixed ISO dates; deterministic (WD-IMPL-TEST-0056).
- Vitest unit files: no fake timers and no `Date.now` assertions (WD-IMPL-FACT-0262).
- e2e: `waitForTimeout` at `enhanced-upload-modal.spec.ts:90, 129, 136, 319, 350` and `story-context-update.spec.ts:61, 68`; waits of 45 s, 60 s and 90 s; first-match class selectors at `story-context-update.spec.ts:117, 133, 150` (WD-IMPL-TEST-0123, 0124).

---

## 10. Tests whose assertions differ from production

Each item states the test, the production code, and the evidence. Items marked "verified" were checked by reading both sides in this map's spot checks (section 17).

| # | Ledger | Test assertion | Production behavior | Evidence |
|---|---|---|---|---|
| 1 | WD-IMPL-TEST-0060 | `master_asset` jobs created without style fields | guard throws for `master_asset`, `scene_asset`, `transformation_post` without style (`ImageGenerationService.ts:139-141`) | static; not run (WD-IMPL-FACT-0254) |
| 2 | WD-IMPL-TEST-0055 | expected side projects role only (`toRoleSequence`, test `:116-121`) | `manifestEntryToReferenceImage` honors `providerRole` (`frameGenerationService.ts:535-539`) | verified |
| 3 | WD-IMPL-TEST-0072 | expects no treatment keys | reads `content.treatmentProse` and `selectedTreatmentId` (`storyContextService.ts:95-96, 113-123`); no non-test writer found | WD-IMPL-FACT-0251 (grep); test is a replica, so it cannot detect the mismatch |
| 4 | WD-IMPL-TEST-0056 | "use latest" case | analyzer takes max `created_at` (`continuityRiskAnalyzer.ts:114-118`); the `version` field (`:33`) is never read; the doc comment (`:96`) expects pre-filtered input that no caller provides | verified (`:33`, `:96`) |
| 5 | WD-IMPL-TEST-0067 | timeout returns empty via a 10 ms rejection | production races the first LLM call against a 20 s timer and maps `Extraction timeout` to empty (`shotExtractionService.ts:299, :302, :443-446`) | verified (`:180` in test) |
| 6 | WD-IMPL-TEST-0097, 0036 | Apply builds assignments from the pure builder; service `deleteAllForScene` tested | Apply calls `DELETE .../shot-assignments/all`, registered after `DELETE /:assignmentId` (`shotAssignments.ts:195` before `:223`), so `/all` is captured as an assignment id. The first call fails and nothing is created. | verified (route order); static inference, runtime UNKNOWN (V8 C1) |
| 7 | WD-IMPL-TEST-0065 | continuity entry fixture (`:318`) has no `referenceRole` | filters at `frames.ts:995` and `:2110` strip every `type: continuity` entry, which also removes the base entry written at `frames.ts:1656-1659` | WD-IMPL-TEST-0065 |
| 8 | WD-IMPL-TEST-0086 | local replica of `parseTransformationFlags` | inline logic at `shotExtractionService.ts:375-390` | equivalence not checked; replica only |
| 9 | WD-IMPL-TEST-0061 | token-utils pricing pinned to `gemini-1.5-flash` | `llmClient` constructor default `gemini-2.5-flash-lite` (`llm-client.ts:76`); `generate` fallback `gemini-1.5-flash` (`:106`); actual model follows `GEMINI_MODEL` | verified; runtime model UNKNOWN |
| 10 | WD-IMPL-TEST-0080 | "assigns stable ids" | id uses `Date.now` (`streamlineQuestionService.ts:96`) | verified by grep; test checks truthiness |
| 11 | WD-IMPL-TEST-0032, 0099 | chooser shows Using or Fresh from the top-8 list | V7 CONTRADICTED: when the persisted base leaves the top 8 or changes location, the chooser shows "Fresh generation" while `shots.selected_continuity_base_frame_id` is still set and generation still uses it (V7 section 6.3) | no test covers this state |
| 12 | WD-IMPL-TEST-0053 | continuity-metrics totals | metrics count `location_match_source === 'ambiguous'` (`projects.ts:945`), a value the DB CHECK forbids (migration 039) and no code writes, so `ambiguousBaselineLocations` is always 0 (V7 cross-slice) | whether the test asserts this field is not stated in the ledger (UNKNOWN from ledger) |
| 13 | WD-IMPL-TEST-0098 | `PRESENCE_CYCLE` copy | equal to production today (`ShotAssetTimeline.tsx:22`) | no current difference; drift undetected |
| 14 | WD-IMPL-TEST-0064 | sort test: location, character, prop | matches code (`sortOrder` location 0, character 1, prop 2); the docstring at `promptGenerationService.ts:462` says characters, locations, props (CONTRADICTED per V9 section 14) | the test agrees with the code and not the docstring |

---

## 11. Tests that fail at import without environment

Frontend: four vitest files fail at collection in the default environment (WD-IMPL-FACT-0245). `src/lib/supabase.ts:6-8` throws `Missing Supabase environment variables` when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is unset. Each file imports that module through the chain below. With dummy values the four files pass (39 tests, J-FACT-01).

| File | Import chain (verified lines) | Result without `VITE_*` |
|---|---|---|
| `src/components/pipeline/Stage9/__tests__/BulkPresenceTemplates.test.ts` (WD-IMPL-TEST-0097) | `BulkPresenceTemplates.tsx:26` → `shotAssetAssignmentService.ts:6` → `src/lib/supabase.ts` | collection fails |
| `src/components/pipeline/__tests__/ContinuityBaseChooser.test.tsx` (WD-IMPL-TEST-0099) | `Stage10FrameGeneration.tsx:40` → `frameService.ts:7` → `src/lib/supabase.ts` | collection fails |
| `src/lib/services/__tests__/scriptService.test.ts` (WD-IMPL-TEST-0114) | `scriptService.ts:1` → `src/lib/supabase.ts` | collection fails |
| `src/pages/__tests__/derivePhaseAStages.test.ts` (WD-IMPL-TEST-0122) | `ProjectView.tsx:21-22` → `projectService.ts:1` and `stageStateService.ts:1` → `src/lib/supabase.ts` | collection fails |

Backend (static, from import chains; not run without env): `backend/src/config/supabase.ts:5-10` throws without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. `NanoBananaClient.ts:21-23` throws without `GOOGLE_AI_API_KEY` (or with `placeholder`), and `frameGenerationService.ts:1600` constructs the image layer at import. Examples of suites on these chains:

- `contextManagerAuteurResolutions.test.ts` (WD-IMPL-TEST-0052): `contextManager.ts:7` → `config/database.ts` → `config/supabase.ts`.
- `transformationEvents.test.ts` (WD-IMPL-TEST-0085): `transformationEventService.ts:9` loads `config/supabase.ts`.
- `promptGeneration.test.ts` (WD-IMPL-TEST-0064): `promptGenerationService.ts:11` → `transformationEventService.ts` → `config/supabase.ts`.
- `frameGenerationService.test.ts` (WD-IMPL-TEST-0057): imports the real service, which constructs `NanoBananaClient`.
- `health.route.test.ts` (WD-IMPL-TEST-0059): imports `server.ts`, which mounts the routers that import the services above.

The default backend command passes this stage in the snapshot only because `backend/jest.setup.ts:10` loads `backend/.env`, which exists. Without that file, these suites fail at import. The effect of a missing file in an actual run is UNKNOWN from this map.

---

## 12. Parity tests that pass by construction (V7)

Claim under test: `continuityCompositionService.test.ts` asserts preview and generation parity (WD-IMPL-TEST-0025, V7). Verdict from J: partially confirmed (WD-IMPL-FACT-0250, J section 5).

What the parity block does:

- Four cases (`continuityCompositionService.test.ts:218-219, 251-252, 271-272, 315-316` per J; the block spans roughly `:186-318`).
- The expected side is `pkg.persistedStartFrameManifest` from `buildGenerationPackage` (test `:192, 224, 256, 276`), converted by the test-local `toRoleSequence` (`:116-121`).
- The actual side is the private `fetchShotReferenceImageContext` (`frameGenerationService.ts:626-709`) reading `shots.reference_image_order` from an identity stub (`test :146-147`). The stub returns the same package array the expected side came from.
- Result: one production write output is round-tripped and compared with a test-local projection. It is not a comparison between two production paths, and it is not a hand-built fixture.
- The block never reaches the base-prepend branch at `frameGenerationService.ts:698-700` (WD-IMPL-TEST-0055).
- `toRoleSequence` ignores `providerRole`; production honors it (`frameGenerationService.ts:535-539`).

What no test compares:

- Preview output (`startFrameReferenceManifest`, `providerReadyReferences`, `preview.referenceManifest`), built only at `routes/projects.ts:3283` and `:3410` and not persisted, against the generation sequence.
- `referenceContinuity.test.ts` does not test parity. It mocks `frameGenerationService` entirely (`test :29-31`).

Divergence visible in code (not a test result; V7 section 5.4, J section 5):

- Generation reads `shots.reference_image_order`, last written by generate-prompts (`projects.ts:3853`) without the continuity base. The base is prepended at write time in the continuity-base route (`frames.ts:1650-1659`) and at read time (`frameGenerationService.ts:698-700`).
- The preview prepends the base in memory (`continuityCompositionService.ts:638-643`).
- Generate-prompts uses its own asset loader (`projects.ts:3622-3727`) with an unordered `location_views` query, while the preview uses `loadSceneAssetsForContinuity`. The two can pick different directions when views have no defined order.
- `persistedStartFrameManifest` (`continuityCompositionService.ts:682`) has no production reader (grep, V7 section 5.3).

Consequence for the test map: the four parity cases confirm that the composition service and the frame reader agree on one array shape. They do not confirm that the preview equals the references sent to the provider. The capability CAP-0215 has tested Y with this caveat (section 7.2) and functional U.

---

## 13. Shot-lock live test gap

- Live suite: `backend/src/tests/shotLocking4_5_task_11.test.ts`, 8 cases (WD-IMPL-TEST-0070).
- Cases that run (2): 401 for lock (`:27-34`) and unlock (`:81-88`). Each sends `Bearer invalid-or-missing`, so `authenticateUser` calls `supabase.auth.getUser` (`backend/src/middleware/auth.ts:27`). An error object or missing user gives 401 (`auth.ts:30`). A thrown error reaches the catch block and gives 500 (`auth.ts:40-42`). Both cases therefore pass when Supabase Auth returns an error object, and fail if the call throws. Whether J's run reached the network is UNKNOWN (section 2).
- Cases that are skipped (6): `it.skip` at `:36, :47, :57, :67, :90, :99`, each labeled "requires DB + auth". Intended assertions: lock with valid shots; 400 on validation errors; 409 on warnings; idempotent lock; unlock without confirmation when no downstream work; unlock requiring confirmation when frames exist.
- Inputs: `TEST_PROJECT_ID` and `TEST_SCENE_ID` default to all-zero UUIDs (`:21-22`); `TEST_AUTH_TOKEN` defaults to an empty string (`:23`). No fixture, seed or helper creates a project, scene, shots or token.
- Production under test: `POST .../shots/lock` (`routes/projects.ts:2845-3017`) and `POST .../shots/unlock` (`:3020-3185`). The lock writes `shot_list_locked_at` and `stage_locks['7']` (V8 section 6).
- Lock gate: no shot mutation route checks `shot_list_locked_at` or `stage_locks` (PUT shot, split, merge, delete, reorder, camera-direction, location, assignments). The gate is frontend-only through `canEdit = !isSceneLocked && isEditable` (V8 section 6; WD-IMPL-FACT-0252).
- No test asserts that a locked shot list rejects shot mutations (WD-IMPL-FACT-0252). `shotLocking.test.ts` (WD-IMPL-TEST-0069) has no lock or unlock assertion.
- Warning gate: lock returns a location-continuity warning that `force` bypasses (`projects.ts:2952-2959`, V7 section 3.4). No test covers `force`.
- Scene stage-lock routes `sceneStageLocks.ts:56` (lock), `:145` (unlock), `:290` (relock) have zero tests (WD-IMPL-FACT-0258). K's correction (WD-IMPL-DEAD-0031) says the generic unlock cascade at `sceneStageLocks.ts:245-249` sets stage 7 to outdated, against V8's statement that no path does. No test covers either behavior.
- Trigger: the DB trigger `trg_sync_scene_lock_status` (migration 014) is not exercised (J section 7; V8 section 6).
- Schema: `stage_locks` is created only by `backend/quickies-sql/add_stage_locks.sql` (V8 C3). No numbered migration creates it, so a database built from numbered migrations alone would lack a column that the lock routes write. Which state is canonical is UNKNOWN.

Summary of the gap: the lock tests that run check 401 only. The state transition, idempotency, unlock confirmation, downstream cascade, warning gate and mutation gate have no running assertion.

---

## 14. Manual scripts

None of these files is matched by a runner (`backend/jest.config.js:34-37`, vitest include, Playwright `testDir`). None was executed for this map. Source for each row: the cited ledger entry.

| Ledger | File | What it does | Live or billable | How it runs | Notes |
|---|---|---|---|---|---|
| WD-IMPL-TEST-0088 | `backend/src/tests/connectivity-test.ts` | Supabase SELECT; checks five env vars; Gemini calls; LangSmith trace when enabled; inserts and deletes one `prompt_templates` row; module-level call at `:172` | live DB and live Gemini; writes a row | `npm run test:connectivity` (`backend/package.json:13`) | prints checks, no assertions; exits 0 on steps 3 to 6 failures; `LANGSMITH_PROJECT` (`:44`) is read by no `src` file |
| WD-IMPL-TEST-0089 | `backend/src/tests/veo3-test.ts` | Real Vertex `predictLongRunning` through `Veo3Provider`; polls; uploads to storage bucket `videos` | billable Vertex call; writes storage | by hand with `tsx` | exits 1 unless `GOOGLE_CLOUD_PROJECT` and `GOOGLE_APPLICATION_CREDENTIALS` are set; printed path (`:145`, `videos/projectId/timestamp.mp4`) differs from uploaded path (`Veo3Provider.ts:335-339`, `projectId/timestamp.mp4`); the script checks `GOOGLE_APPLICATION_CREDENTIALS` but `Veo3Provider` uses `GoogleAuth` defaults (`:35-37`) |
| WD-IMPL-TEST-0090 | `backend/src/tests/scriptManifest.smoke.ts` | `extractManifest` on a fixed script; eight checks (two scenes; ALICE, BOB; KITCHEN; EXT); `process.exit(1)` on failure | none | `npx tsx` (WD-IMPL-TEST-0013) | duplicates the jest `scriptManifest.test.ts`; static trace passes; not executed |
| WD-IMPL-TEST-0095 | `backend/scripts/test-style-capsule-influence.ts` | reads `style_capsules`; creates `global_assets` and an `image_generation_jobs` row through `createGlobalAssetImageJob`; Gemini runs in background; polls 60 times at 2 s; deletes the asset unless `--keep-asset`; writes JSON under `backend/scripts/` | live Gemini; writes DB rows and storage | by hand | asserts nothing; timeout falls through to exit 0 (`:194-196`); the no-style-check claim for `createGlobalAssetImageJob` is analyst-read (`ImageGenerationService.ts:736-795`), not lead-verified |
| WD-IMPL-TEST-0096 | `backend/test-connection.js` | `DatabaseService.testConnection` (SELECT on projects, limit 1) | live DB | by hand | no `package.json` script or other caller; the comment at `:1` says env loads first, but ESM imports hoist, so `config/supabase.ts` loads before `dotenv.config` (`:3`) |

---

## 15. Contradictions and unknowns

Contradictions are preserved as the sources state them. Unknowns are listed with what would settle them.

| # | Item | Status | What would settle it |
|---|---|---|---|
| 1 | Frontend default run: four files fail at collection. Whether the intended dev environment sets `VITE_SUPABASE_*` is not visible; no root `.env` exists | UNKNOWN | the project's environment configuration (outside this slice) |
| 2 | Full backend `jest` run, including `image-generation.test.ts` and `llm-integration.test.ts` | UNKNOWN; static prediction in section 9.4 | running the full suite with live credentials |
| 3 | J section 1 says "no network", but the executed subset includes two `shotLocking4_5` cases that call `supabase.auth.getUser` (`auth.ts:27`; section 13) | CONTRADICTED within J's method statement; whether the network was reached is UNKNOWN | the run's network trace or logs |
| 4 | `llm-integration.test.ts` gate. J and WD-IMPL-TEST-0048 say the gate gates nothing and the Prompt Template block runs unconditionally against the live database (`:87-115` calls `promptTemplateService` in `beforeEach` and `afterAll`). R2 (item 5 of its test-invocation list) says the Gemini and LangSmith calls sit in skipped blocks (`:303, :317, :346`). Both hold: the database blocks run, the network blocks are skipped | consistent; recorded because the two reports describe different blocks | none needed |
| 5 | Static count for the 39-suite backend subset is 410; the runner reports 413 | runner total used; difference not explained | runner verbose output |
| 6 | `contextManagerAuteurResolutions.test.ts`: 7 `it` lines (grep) against "6 cases" (WD-IMPL-TEST-0052) and "(7)" (J table row 2) | UNKNOWN count; runner not recorded | runner verbose output |
| 7 | CAP-0192 carries tested Y, but its only test is a replica (WD-IMPL-TEST-0086) | Y in the raw ledger; replica in substance | none; reclassified in 7.2 |
| 8 | CAP-0215 and WD-IMPL-TEST-0025 carry tested Y for parity. J and V7 call the parity mock-only by construction | Y in the ledger; PARTIAL in J's verdict | none; section 12 |
| 9 | `DELETE /shot-assignments/all` is shadowed by `DELETE /:assignmentId` (`shotAssignments.ts:195`, `:223`). Runtime behavior (PostgREST error on `id=eq.all`) is inferred | UNKNOWN at runtime (V8 C1) | calling the route once against a database |
| 10 | Stage 7 relock. V8 says no path sets stage 7 outdated and relock is effectively unreachable. K's correction says `sceneStageLocks.ts:245-249` sets it | CONTRADICTED between V8 and K; the correction is honored here | tracing which stages the unlock cascade can receive |
| 11 | `stage_locks` column is created only by `backend/quickies-sql/add_stage_locks.sql` (V8 C3) | UNKNOWN which schema state is canonical | database introspection |
| 12 | Continuity base chooser shows "Fresh generation" when the persisted base is outside the top 8, while the column stays set and generation uses it (V7 section 6.3) | CONTRADICTED UI state; no test | a run with a persisted base outside the top 8 |
| 13 | continuity-metrics `ambiguousBaselineLocations` counts a value the DB CHECK forbids (V7 cross-slice) | always 0 in code; whether the test asserts this field is not stated | reading the continuity-metrics test assertions |
| 14 | Veo3 script printed storage path differs from the uploaded path (WD-IMPL-TEST-0089) | script-side mismatch; runtime UNKNOWN | running the billable script, which is not done here |
| 15 | llmJson truncation case passes through the regex fallback (`llmJson.ts:84-90`), not bracket counting (`:48-82`) | analyst read; not lead-verified (WD-IMPL-TEST-0091) | reading `llmJson.ts` lines 48-90 |
| 16 | resolveConflict fallback: analyst said the fallback at `:49-50` is untested; the tier-4 test at `:41` contradicts it. Lines `:49-50` were not re-read | CONTRADICTED by a test line; not re-read | reading `resolveConflict.ts:49-50` (dead code either way; section 8.2) |
| 17 | e2e selector matches and the modal assertions | analyst-side; lead spot-checked by grep only | running the Playwright suite against a dev server |
| 18 | PDF extraction happy path is skipped under Jest (`streamlineExtraction.test.ts:35`) | UNKNOWN whether PDF intake works outside Jest; no run | running the skipped case outside Jest |
| 19 | Live suite `image-generation.test.ts` fails the seven `master_asset` cases only if `beforeEach` succeeds | UNKNOWN; static prediction | running with live credentials |
| 20 | Continuity risk analyzer is imported with an extensionless path (`projects.ts:1093`); under compiled ESM this may fail | UNKNOWN (V7 section 10); no test in the ledger covers this import | running compiled `dist/server.js` against `GET /scenes` |

---

## 16. Corrections made while synthesizing

Each entry names the source claim, what the repo shows, and the evidence checked in this map.

1. **Cut and fade assertion location.** J-FACT-12 (WD-IMPL-FACT-0256) and WD-IMPL-TEST-0064 cite `promptGeneration.test.ts:213-214` for the weak "cut and fade" assertion. That file has no "cut" or "fade" text, and `:212-214` assert section order. The assertion is at `backend/src/utils/__tests__/scriptManifest.test.ts:213-214`. WD-IMPL-TEST-0093 cites the correct file. Corrected in sections 9.2 and 10.
2. **Typo-suggestion disjunction line.** J-FACT-12 and WD-IMPL-TEST-0069 cite `shotLocking.test.ts:156-157`. Those test lines are a different case. The disjunction is at `shotLocking.test.ts:221`, and the two messages it accepts are emitted at `shotValidationService.ts:156-157`. Corrected in sections 9.2 and 10.
3. **CAP-0192 tested flag and correction.** The ledger carries tested Y and a correction from R1b ("only Stage 7 shot extraction writes transformation_flags"). The repo confirms the writer is shot extraction. The Y flag rests on a replica test (WD-IMPL-TEST-0086: nine cases on a local copy of the parser). Applied in sections 7.2 and 8.1.
4. **Stage 7 relock.** V8 section 6 says no path sets stage 7 to outdated. WD-IMPL-DEAD-0031 (correction by K) says `sceneStageLocks.ts:245-249` does. The repo shows the unlock cascade at those lines. Honored in section 13.
5. **Story-context keys.** WD-IMPL-FACT-0075 is corrected by R1a-FACT-10 to say beat keys match and only treatment keys mismatch. Section 10 row 3 states only the treatment mismatch.
6. **J method statement.** J section 1 says "no network", while the executed subset includes the 401 cases that call Supabase Auth (section 2, contradiction 3). Recorded, not silently changed.
7. **Count of contextManager cases.** J's table row 2 gives 7, and WD-IMPL-TEST-0052 gives 6. The grep count is 7 `it` lines. Both are shown in section 3 and listed in section 15.
8. **Runner totals.** The static backend count (410) differs from the runner (413). The runner is used throughout.
9. **Parity Y flags.** WD-IMPL-TEST-0025 and CAP-0215 carry tested Y, while J's verdict is partial. Section 12 states the verdict used here.

---

## 17. Spot checks performed

Repo reads and greps done for this map (beyond the reporters' own checks). Each line gives the claim and the result.

1. Frontend env throw: `src/lib/supabase.ts:6-8` throws without `VITE_*`. Confirmed.
2. Four import chains: `BulkPresenceTemplates.tsx:26`, `shotAssetAssignmentService.ts:6`, `Stage10FrameGeneration.tsx:40`, `frameService.ts:7`, `scriptService.ts:1`, `ProjectView.tsx:21-22`. Confirmed.
3. Backend testMatch and dotenv load: `backend/jest.config.js:34-37`, `backend/jest.setup.ts:10`. Confirmed.
4. Vitest include and setup: `vite.config.ts:26-32`; setup is one line. Confirmed.
5. Playwright baseURL, workers, retries: `playwright.config.ts:17-24`. Confirmed.
6. Skip lines: `shotLocking4_5_task_11.test.ts` (`:36, :47, :57, :67, :90, :99`), `llm-integration.test.ts` (`:303, :317, :334, :339, :346`), `streamlineExtraction.test.ts:35`. Confirmed.
7. Gate function: `llm-integration.test.ts:387-400` only logs. Confirmed.
8. Image-generation guard: `ImageGenerationService.ts:139-141` throws for `master_asset`, `scene_asset`, `transformation_post`. `image-generation.test.ts:115-119` omits both style fields. Confirmed.
9. `resolveConflict`: only definition in non-test code (`resolveConflict.ts:34`). Confirmed by grep.
10. Continuity risk version field: `continuityRiskAnalyzer.ts:33` declared; doc comment `:96`. Confirmed.
11. Replica imports: `storyContextService.test.ts:8` and `textFieldVersionService.test.ts:10` import only jest globals; `ShotAssetTimeline.test.ts:7` imports types only. Confirmed.
12. Route shadowing: `shotAssignments.ts` `DELETE .../:assignmentId` at `:195`, `DELETE .../all` at `:223`. Confirmed.
13. Parity mapping: `continuityCompositionService.test.ts:116-121` (`toRoleSequence`) against `frameGenerationService.ts:535-539` (`manifestEntryToReferenceImage` honors `providerRole`). Confirmed.
14. Timeout: `shotExtraction.test.ts:180-181` (10 ms rejection) against `shotExtractionService.ts:299, 302, 443-446`. Confirmed.
15. Batch-link header claim: `referenceContinuity.test.ts:7` names a batch-link-copy test; `grep batch` finds no other occurrence. Confirmed.
16. Conditional assertion: `referenceContinuity.test.ts:368` (`if (shotCleanup)`). Confirmed.
17. Sleeps and timing: `image-generation.test.ts:128, 140, 206`; `transformationEvents.test.ts:40`; e2e `waitForTimeout` lines. Confirmed.
18. e2e case counts: 23 (enhanced) and 12 (story) test-level lines. Confirmed.
19. Backend constructor-time env: `NanoBananaClient.ts:21-23`; `frameGenerationService.ts:131, 1600`; `config/supabase.ts:5-10`. Confirmed.
20. Lazy llmClient: `llm-client.ts:363-366`; `validateEnvironment` at `:71, 89-96`. Confirmed.
21. Auth middleware: `auth.ts:21, 27, 30, 40-42`. Confirmed.
22. Stage-lock routes: `sceneStageLocks.ts:56, 145, 290`. Confirmed.
23. Test file counts: 26 vitest files, 37 backend `*.test.ts` in `src/tests`, 4 in `src/utils/__tests__`, 2 e2e specs. Confirmed.
24. Ledger counts recomputed from `_evidence/merged/merged.jsonl`: TEST 124 (50 wave-1, 74 J, IDs 0051 to 0124); CAP 287 with tested Y 37, P 31, N 219, U 0; J-FACT 20. Confirmed.
25. Frame generation and continuity claims used in section 12 (`projects.ts:3853`, `frames.ts:1650-1659`, `continuityCompositionService.ts:638-643`, `:682`) are taken from V7 and V9. Not separately re-read here.
