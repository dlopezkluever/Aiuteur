# 09. AI calls and prompt system

## Scope

This document describes the model and prompt layer of the WizardDirector (Aiuteur) backend and frontend at HEAD of `main`. Part 1 is the narrative: provider and model matrix, client behavior, LangSmith wiring, the `prompt_templates` mechanism, JSON parsing, per-stage context assembly, image and video prompt wrapping, the path of user-authored text into prompts, and authorization of template routes. Part 2 is the complete inventory of canonical AI and model calls (61 live ledger entries, grouped by feature area). Part 3 summarizes calls by provider and lists model-adjacent facts, including the absence of an audio model and of embeddings. Nothing was executed. No provider, database, or network was contacted. Database contents (live `prompt_templates` rows, key values, deployed environment) are UNKNOWN.

Sources: ledger kinds AI (61 live entries, read in full from `_evidence/merged/merged.jsonl`, with 27 retired duplicates mapped through `_evidence/merged/retired-ids.json`), PROV, DEAD, FACT (AI-related), ROUTE, and M (lead additions). Reports: `E-ai-calls.md` and its ledger, `R2-ai-canonical.md` and `R2-ai-canonical.json`, the AI-kind entries of `V2-style-library`, `V3-narrative` (section 5 and section 8), `V4-streamline`, `V5-project-assets`, `V6-scene-assets`, `V7-continuity-locations`, `V8-shots`, `V9-prompts-frames` (sections 3, 7, 8), `V10-video-checkout` (section 6), `I-infra-async` (sections 5 and 7), `R1a-verification`, `R1b-verification`, and `R1-claims-to-verify`.

Reading notes: the document map is `00-README.md`. Topics that live elsewhere are cross-linked by filename: `01-SYSTEM-OVERVIEW.md`, `04-DOMAIN-AND-STATE-MODEL.md` (domain and state), `05-DATA-MODEL.md`, `07-VISUAL-ASSETS-AND-CONTINUITY.md`, `08-SHOTS-FRAMES-AND-GENERATION.md`, `10-VERSIONING-LOCKING-AND-INVALIDATION.md`, `11-APPLICATION-ARCHITECTURE.md`, `12-ASYNC-RELIABILITY-AND-PROVIDERS.md`, `13-TEST-AND-EVIDENCE-MAP.md`, `14-DEAD-PARTIAL-AND-DUPLICATED.md`, `17-IMPLEMENTATION-LEDGER.md`. Pressure (doc 15) and coverage and unknowns (doc 16) are referenced by number only.

Status vocabulary follows the brief. Ledger flags are written as `P/R/F/Pe/T` (present, reachable, functional, persisted, tested) with values Y, N, P (partial), or U (unknown). Where a status word is used it is one of: IMPLEMENTED, REACHABLE, FUNCTIONAL, PERSISTED, TESTED, PARTIAL, MOCK-ONLY, DEAD, ORPHANED, LEGACY, DUPLICATED, CONTRADICTED, UNKNOWN.

Count note: `_evidence/merged/merged.jsonl` holds 88 `WD-IMPL-AI-*` ids. 27 are retired duplicates (`_evidence/merged/retired-ids.json`), leaving 61 live entries. `R2-ai-canonical.md` reports 85 entries and 58 groups; that counts the earlier merge. The three additions in the current ledger are M-AI-01 (0086), M-AI-02 (0087), and M-AI-03 (0088), which R2 found after its pass.

Evidence tags: ledger ids (`WD-IMPL-AI-NNNN`, `WD-IMPL-PROV-NNNN`, `WD-IMPL-FACT-NNNN`), report lids (`E-AI-NN`, `V3-AI-NN`, and so on), and `path:line`. Paths are relative to the repository root unless absolute.

---

# Part 1. Narrative

## 1.1 Provider and model matrix

| Path | Code | SDK (version) | Auth | Model id in code | Override | Status |
|---|---|---|---|---|---|---|
| Text LLM (`LLMClient`) | `backend/src/services/llm-client.ts:66-207` | `@langchain/google-genai` 2.1.3, `@langchain/core` 1.1.8 | `GOOGLE_AI_API_KEY` | `request.model`, else `GEMINI_MODEL`, else `gemini-1.5-flash` (`:106`) | request body `model` on `/api/llm/generate` and `/api/llm/generate-from-template`; env `GEMINI_MODEL` | IMPLEMENTED, FUNCTIONAL UNKNOWN (runtime) |
| Image (`NanoBananaClient`) | `backend/src/services/image-generation/NanoBananaClient.ts:29-169` | `@google/generative-ai` 0.24.1 | API key; constructor throws when key is unset or `placeholder` (`:20-27`) | `gemini-2.5-flash-image` hardcoded (`:119`, `:180`) | none | IMPLEMENTED; width and height never sent (C12, R1b) |
| Vision (`ImageAnalysisService`) | `backend/src/services/imageAnalysisService.ts` | `@google/generative-ai` 0.24.1 | API key; throws when unset (`:24-30`) | `gemini-2.5-flash` hardcoded (`:54`, `:106`, `:136`, `:176`) | none; `GEMINI_MODEL` ignored | IMPLEMENTED |
| Video, Veo 3.1 | `backend/src/services/video-generation/Veo3Provider.ts:8-37`, `:107-116` | `fetch` to `{location}-aiplatform.googleapis.com`; `google-auth-library` ^10.5.0 | ADC via `GoogleAuth`, scope `cloud-platform` (`:35-37`) | `veo-3.1-fast-generate-001`, `veo-3.1-generate-001` (`:16-20`) | `VIDEO_PROVIDER=veo3`; `GOOGLE_CLOUD_PROJECT` required (`:41-51`); `GOOGLE_CLOUD_LOCATION` defaults to `us-central1` (`:15`) | PARTIAL (env-gated, untested) |
| Video, mock | `backend/src/services/video-generation/MockVideoProvider.ts`, `createVideoProvider.ts:18` | none | none | none | default when `VIDEO_PROVIDER` is unset or not `veo3` | MOCK-ONLY (default) |
| Tracing | `llm-client.ts:82-84`, `:154-161` | `langsmith` 0.4.4 | `LANGSMITH_API_KEY` (required by constructor, `:95-99`) | n/a | `LANGSMITH_TRACING`, `LANGSMITH_PROJECT` | PARTIAL (see 1.3) |
| Audio (speech, TTS, STT) | none | none | none | none | none | no model call (PROV-0029) |
| Embeddings | none | none | none | none | none | no call (Part 3) |
| Other LLM vendors | none | none (no SDK in `backend/package.json`) | names only | none | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_VEO3_API_KEY`, `NANO_BANANA_API_KEY` appear in `backend/env.example`; no code reads them (PROV-0021, I section 5.1) | DEAD (config names only) |

Notes on the matrix:

- Text model id has three literal fallbacks. The call path uses `gemini-1.5-flash` (`llm-client.ts:106`). The constructor default is `gemini-2.5-flash-lite` (`:76`), and `estimateCost` uses the same id (`:310`). The constructor client is used by no call path (E-DEAD-06). R2 section 4 corrects the streamline backfill ledger entries that named `gemini-2.5-flash-lite` (see the corrections list at the end).
- `backend/env.example:12-13` sets `LANGSMITH_PROJECT=wizardirector-dev` and `LANGSMITH_TRACING=true`. `backend/env.example:17` sets `GEMINI_MODEL=gemini-1.5-flash`. E and V9 report that the local `backend/.env` contains the same values. That file was not read here (environment values are not inspected by policy).
- Model selection is per environment for text and per code literal for everything else. No stage, template, or job type stores a model id. The image and vision models are hardcoded and ignore `GEMINI_MODEL` (E-FACT-20).
- The frontend holds no provider key. It sends the Supabase session bearer token to `/api/llm/*` (`treatmentService.ts:94-100`, E section 3). `authenticateUser` is mounted on `/api/llm` (`backend/src/server.ts:75`).
- Every backend Supabase call, including `prompt_templates`, uses the service-role client (`backend/src/config/supabase.ts:1-28`). RLS on `prompt_templates` therefore does not constrain the backend (E-FACT-16).
- `GOOGLE_APPLICATION_CREDENTIALS` is not read by repository code. `GoogleAuth` resolves it implicitly (`Veo3Provider.ts:30-38`, I section 5.1).

Auth modes in summary: API key (Gemini Developer API) for text, image, and vision; Vertex AI with ADC for Veo only; service-role key for all database access; Supabase bearer token between browser and backend. OAuth is not used (PROV-0031, Supabase email and password only).

## 1.2 LLM client behavior

- Entry point: `LLMClient.generate(request)` (`llm-client.ts:104-138`). Defaults are `temperature` 0.7 and `maxTokens` 4096 (`:136-137`). Each call creates a new `ChatGoogleGenerativeAI` instance in `performGeneration` (the constructor instance is not used for calls). Evidence: WD-IMPL-AI-0068, WD-IMPL-FACT-0105.
- Request schemas accept `model`, `temperature` (0 to 2), and `maxTokens` (1 to 8192) in the body of `/api/llm/generate` (`backend/src/routes/llm.ts:30-60`, schema at `:45-60`) and `/api/llm/generate-from-template`. No allowlist is applied, so an API caller can select any model string. The frontend does not send `model` (E-AI-01 note). A model id outside the four-entry pricing table throws only after the model has answered (see token and cost below).
- Retry: `executeWithRetry` makes 3 retries after the first attempt (4 attempts). Backoff is 1 s, 2 s, 4 s, capped at 10 s, multiplier 2 (`llm-client.ts:45-50`, `:209-238`). Retryable classes are RATE_LIMIT, SERVER_ERROR, and NETWORK_ERROR. `classifyError` uses substring matching, so a message containing `key` or `auth` maps to non-retryable AUTH_ERROR (`:240-300`, E-FACT-04).
- Timeouts: the client itself has no timeout and no `AbortSignal` (I section 3.2). Callers race timers. The race does not abort the underlying request, and the timer is not cleared (V9 section 3.4):
  - shot extraction, 20 s (`shotExtractionService.ts:97`, `:297-305`), returns an empty success on timeout (WD-IMPL-FACT-0202);
  - frame and video prompt generation, 30 s (`promptGenerationService.ts:143`, `:1456-1475`);
  - legacy scene dependency extraction, 15 s (`sceneDependencyExtraction.ts:60`).
  - The shot-extraction malformed-JSON retry runs after the 20 s race has resolved and has no separate timeout (WD-IMPL-AI-0072).
- Other clients: NanoBanana uses 3 retries with 1 s base for RATE_LIMIT and TEMPORARY (`NanoBananaClient.ts:17-18`, `:241-269`). Vision has no retry (`imageAnalysisService.ts`, E section 4). Veo uses executor-level retry of the whole job up to `max_retries` (default 3, `VideoJobExecutor.ts:145-165`), and the executor retries regardless of `VideoProviderError.retryable` (I section 3.2). The mock fails 5% of calls (`MockVideoProvider.ts:23-25`).
- Output: `LLMResponse` carries `traceId`, which is the request UUID (`llm-client.ts:179`), not a LangSmith run id (1.3).

Token and cost tracking (E section 6):

- Tokens are estimated, not measured. `estimateTokenCount` is `ceil(chars/4) + ceil(lines*0.5)` over system plus user text on input and over response text on output (`backend/src/utils/token-utils.ts:51-63`; `llm-client.ts:110-111`, `:182`). The API `usage_metadata` is never read.
- Cost for text calls uses `GEMINI_PRICING`, which covers four ids: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.0-pro`, `gemini-2.5-flash-lite` (`token-utils.ts:27-44`). `calculateCost` throws `Unknown model for cost calculation` for other ids (`:68-80`), which `performGeneration` reaches after the response (WD-IMPL-FACT-0182).
- Storage is `globalUsageTracker`, an in-memory array (`token-utils.ts:163-208`). It is read only by `GET /api/llm/usage-stats` (`llm.ts:389-414`), which has no frontend caller. No database table stores token or cost usage (E-FACT-02).
- Image cost is `0.01 * (w*h) / (512*512)` (`NanoBananaClient.ts:230-235`), stored as both estimate and actual because Gemini returns no billed cost (`:162-163`).
- Video cost is `clampedDuration * 0.15` (fast) or `* 0.40` (standard). The rates are duplicated in `Veo3Provider.ts:157-160` and `videoGenerationService.ts:6-7` (E-FACT-21).
- Vision calls have no cost tracking (E section 6).
- Whole-pipeline credit checks read stored image and video costs, not LLM tokens (`videoGenerationService.ts:194-196`, `:224-267`).

Metadata side effect: the template route stores the full `globalContext` in `validatedRequest.metadata.globalContext` (`llm.ts:225`). `llmClient.generate` spreads `request.metadata` into the LangChain invoke metadata (`llm-client.ts:166-173`). The context includes capsule rows. Whether that metadata reaches LangSmith traces is UNKNOWN (V2 section 4.8; I section 7).

`testConnectivity` (`llm-client.ts:337-357`) makes one real Gemini call with system `You are a test assistant.` and user `Say "Hello, test successful!" and nothing else.` (`:343-344`). Its `langsmith` flag is `!!traceId` (`:350`), which is true whenever the call succeeds (WD-IMPL-FACT-0185).

## 1.3 LangSmith wiring and why it does not attach

LangSmith is configured in three places that do not connect to each other:

1. Explicit callbacks path (`llm-client.ts:154-161`). Callbacks are requested only if `LANGSMITH_API_KEY` is set and `LANGSMITH_TRACING === 'true'`. The call `getLangchainCallbacks()` is made inside a `try`. In the installed `langsmith` 0.4.4, `getLangchainCallbacks` calls `getCurrentRunTree()` (`node_modules/langsmith/dist/langchain.js:19-22`). That function throws when no `traceable` run is active (`dist/singletons/traceable.js:25-31`). The backend contains no `traceable` wrapper (`grep -rn "traceable\|getCurrentRunTree" backend/src` returns 0 matches, R1b C16).
2. The throw is caught and logged as `LangSmith tracing not available, continuing without tracing` (`llm-client.ts:158-160`). `callbacks` stays undefined. The `invoke` call has the callbacks option commented out and spreads `callbacks` only when defined (`:163-165`).
3. Env-driven path. `@langchain/core` enables a `LangChainTracer` when `LANGSMITH_TRACING` or `LANGCHAIN_TRACING_V2` resolves to `'true'` (`node_modules/@langchain/core/dist/utils/callbacks.js:4-13`, `callbacks/manager.js:467-482`, I section 7). `backend/env.example` sets `LANGSMITH_TRACING=true`. Whether runs appear in the LangSmith project is UNKNOWN; no runtime check was made.

Consequences recorded in the reports:

- Explicit wiring never attaches callbacks (WD-IMPL-PROV-0020, verdict PARTIAL; R1b C16 CONFIRMED).
- `stage_states.langsmith_trace_id` is never written. The column exists (`backend/migrations/002_add_langsmith_fields.sql:5-9`), and the DatabaseService helpers that would write it have zero callers (`config/database.ts:69`, `:83`, `:109`; E-DEAD-05). The value shown as a trace id in stage content is `langsmithTraceId = requestId`, stored in the content JSON by the frontend (`Stage2Treatment.tsx:202`, `Stage3BeatSheet.tsx:352`, `Stage4MasterScript.tsx:335`).
- The `Client` built in the constructor (`llm-client.ts:65-66`, `:82-84`) is never used (E-DEAD-06).
- Constructor validation requires `LANGSMITH_API_KEY` even though tracing is optional (`llm-client.ts:89-99`). `LLMClient` construction fails without it (E section 3).

## 1.4 Prompt template mechanism

Storage. `prompt_templates` (`backend/migrations/002_add_langsmith_fields.sql:12-31`): `id`, `name`, `stage_number` (CHECK 1 to 12), `version`, `system_prompt`, `user_prompt_template`, `description`, `is_active` (default TRUE), `created_at`, `created_by` (references `auth.users`), and `UNIQUE(name, version)`. RLS (`:36-53`): SELECT for active rows, INSERT for any authenticated user, UPDATE and DELETE only where `created_by = auth.uid()`. These policies do not bind the backend (1.10).

Which prompts live in the table. Only three names are read from `prompt_templates` by repository code (E-AI-01 to E-AI-03, V3 section 8): `treatment_expansion` (Stage 2), `beat_extraction` (Stage 3), and `master_script_generation` (Stage 4). Every other AI prompt in the repository is an inline literal in a service, handler, or frontend service (V9 section 3.3, E section 10). The `/api/llm/templates` CRUD, `/templates/interpolate`, and `/templates/stage/:n/active` routes have no frontend caller (E-DEAD-08).

Selection (stage activation). The generate-from-template route looks up one row with `listTemplates({ name, activeOnly: true, limit: 1 })` (`backend/src/routes/llm.ts:153-157`). `listTemplates` orders by `stage_number`, then `name`, then `created_at DESC` (`backend/src/services/prompt-template.ts:144-190`, R1b). The route does not filter by stage number. The table has no stage-level active flag. The "active" state is the per-row `is_active`. `activateTemplate` sets one row active and deactivates other rows with the same `name` (`prompt-template.ts:370-390`), so the one-active-per-name rule is kept only through that route. Seeding inserts rows with `is_active` TRUE by default.

Fallback. There is no hardcoded fallback for the three template-backed prompts. A missing active template returns HTTP 404 (`llm.ts:159-164`, WD-IMPL-FACT-0194). The frontend then surfaces an error.

Interpolation (`prompt-template.ts:261-300`). `interpolateTemplate` performs one pass of `String.replace` over `system_prompt` and `user_prompt_template` with the regex `/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/g`. Each match is replaced by the variable value (objects are JSON-stringified with two-space indentation). Unknown placeholders are left as written and a `console.warn` is emitted. Replaced text is not scanned again, because the replacement is a function callback. Any brace token matching that pattern is treated as a placeholder, including a literal `{word}` in prompt prose.

Validation (`prompt-template.ts:325-345`). `extractVariables` collects every placeholder in both texts. `validateVariables` returns `valid = (missing.length === 0)`, where `missing` is placeholders absent from the request variables, and reports `extra` (request keys that are not placeholders). The route returns 400 only for `missing` (`llm.ts:176-186`). Extra keys are reported in the logs and otherwise ignored.

Backend-injected variables (`llm.ts:191-231`):

- `writing_style_context` is overwritten by the backend. When `projectId` and `branchId` are both present in metadata, it is built from `ContextManager.assembleGlobalContext` and `StyleCapsuleService.formatWritingStyleInjection` (`:194-215`). When they are absent, it is looked up from `writing_style_capsule_id` (`:236-262`). On failure it is the empty string. The frontend sends an empty placeholder (`treatmentService.ts`, `beatService.ts:58-70`, `scriptService.ts`). `beatService` sends `projectId` through as given (`beatService.ts:68`); E notes that an empty `projectId` disables the first branch.
- `beat_sheet_reference` is added when `metadata.stage >= 4` and a beat sheet exists (`llm.ts:218-221`). No seeded template contains it (WD-IMPL-FACT-0034).
- `ContextManager.assembleGlobalContext` also fetches the beat sheet, the master script summary, and Ask Auteur resolutions into `globalContext` (`contextManager.ts:102-202`). Those three values are stored in metadata only. They are not placed into template variables (WD-IMPL-FACT-0043, checked against `llm.ts:191-231`).

Dropped guidance. The frontend sends `regeneration_guidance` on regenerate: `treatmentService.ts:152`, `beatService.ts:141`, and `scriptService.ts:158`. No placeholder for it exists in either seed copy. Validation treats it as an extra key, so it reaches no model. This is WD-IMPL-FACT-0034 and WD-IMPL-FACT-0187 (silent drop), and E-FACT-08. Live database content is UNKNOWN.

Two seed copies. The same three templates exist twice, at version `1.0.0`:

- Route copy: `backend/src/routes/seed.ts:19-199`, used by `POST /api/seed/prompt-templates` (`server.ts:78`, behind `authenticateUser`).
- Script copy: `backend/scripts/seed-templates.ts:16-203`, run manually.

Differences (R1b C17, E-FACT-14, WD-IMPL-FACT-0193):

- The route copy contains `SUB-LOCATION` (2 occurrences) and `CONTINUOUS` (5 occurrences). The script copy contains neither.
- The script copy contains `Return the response as JSON` (2 occurrences). The route copy contains none. The treatment and beat parsers depend on the JSON format block that the route copy lacks (E-FACT-14).
- About 88 lines differ between the two `templates` arrays.

Both copies call `createTemplate` without a user id (`seed.ts:193`, `seed-templates.ts:208`), so `created_by` is NULL. `UNIQUE(name, version)` makes the second seed run fail for each duplicate (`002_add_langsmith_fields.sql:28-29`). Which copy is live in the deployed database is UNKNOWN. `backend/scripts/update-templates-style-capsule.ts:29-44` rewrites `{rag_retrieved_style_examples}` to `{writing_style_context}` in existing rows, which implies that older row text existed (E section 13).

Parsing of template output. Frontend services parse the template output (1.5). `treatmentService.parseTreatmentResponse` (`treatmentService.ts:351-456`) expects `treatments[].prose`. `beatService` expects `beats[]`. `scriptService.parseScriptResponse` (`scriptService.ts:487-524`) takes JSON `formatted_script` or plain text. The backend does no parsing for these three templates.

## 1.5 JSON parsing and repair

Shared helper, `backend/src/utils/llmJson.ts`. `extractJsonArray` (`:111-129`) and `extractJsonObject` (`:135-153`) run this order: strip markdown fences (`:18-30`), take the outer `[...]` or `{...}` by regex, `JSON.parse`, remove trailing commas, repair truncation by keeping the last complete object, and reassemble complete objects by regex. Failure throws `LLMJsonParseError`. Callers are the streamline classification, standalone draft, question, reconciliation, backfill, and format services (E-AI-10 to E-AI-17). `llmJson.test.ts` has 12 tests (E section 5).

Ad hoc copies, without a shared import (E section 5, E-FACT-04):

- `shotExtractionService.parseResponse` (`:461-470`): fence regex and `JSON.parse`, no repair.
- `shotSplitService` and `shotMergeService`: fence strip and `JSON.parse`.
- `sceneAssetRelevanceService` and `storyContextService`: greedy `{...}` regex and `JSON.parse`.
- `transformationEventService`: fence regex and `JSON.parse`, with a text fallback for prefill.
- `assetExtractionService`: inline three-stage repair in the deprecated Pass 1 (`:427-505`) and in the Pass 2 object repair (`:597-625`).
- `imageAnalysisService.classifyUploadedImage`: regex and `JSON.parse`, with no try block, caught by the route.
- Frontend `treatmentService`, `beatService`, `scriptService`: fence strip, then text heuristics.

Prompt-text outputs. `promptGenerationService.cleanPromptOutput` (`:1480-1508`) strips fences, JSON-unwraps the `prompt`, `framePrompt`, or `videoPrompt` key, strips wrapping quotes, and truncates with `...` at 1200 characters (frame, end frame, continuity, correction) or 500 characters (video). Shot output is checked by `validateShot` (`shotExtractionService.ts:178-188`): non-empty `action`, `setting`, and `camera`, and `duration` between 1 and 30 (WD-IMPL-AI-0071).

Validation. No zod or other schema validation is applied to model output in any AI service (WD-IMPL-FACT-0203, E-FACT-24). Zod appears only for HTTP bodies in `routes/llm.ts`. Structured-output modes (`responseMimeType`, `responseSchema`, function calling) are not used anywhere in `backend/src` (E section 5).

Failure outcomes differ by service (recorded per call in Part 2):

- empty result returned as success (shot extraction timeout, shot retry failure, Ask Auteur question failure);
- `unclassified` with confidence 0 (streamline classification);
- raw model text used as the field value (prefill fallback, prompt cleanup fallback, description fallback in distillation);
- HTTP 500 or 429 to the client (most others; `RATE_LIMIT` maps to 429).

## 1.6 Context assembly by stage

Phase A (Stages 1 to 5) uses global context. Phase B (Stages 6 to 12) uses scene-specific context (`04-DOMAIN-AND-STATE-MODEL.md`). The table lists what each prompt builder receives. Paths are in Part 2.

| Stage or feature | What the prompt receives | What it does not receive | Ledger |
|---|---|---|---|
| Stage 1 streamline intake (classification) | file name and first 6000 characters of text (`streamlineClassificationService.ts:L31-L39`) | project params, capsules | WD-IMPL-AI-0027 |
| Stage 2 treatment | Stage 1 `processedInput` (mode, primary content, context files, length, genres, rating, tonal precision); writing style text from `ContextManager` | Ask Auteur facts (fetched, not injected); prior regeneration guidance (dropped) | WD-IMPL-AI-0068 |
| Stage 3 beats | active Stage 2 variation prose and variant id; Stage 2 `processedInput` params or hardcoded defaults when missing (V3-AI-04); writing style text | the Stage 4 script (not used at Stage 3) | WD-IMPL-AI-0069 |
| Stage 4 master script | locked Stage 3 beat sheet content (`scriptService.formatBeatSheetForPrompt`, `scriptService.ts:553-562`); params; writing style text | the Stage 2 treatment; `beat_sheet_reference` (no placeholder) | WD-IMPL-AI-0070 |
| Stage 5 asset extraction (distillation) | entity name and type; placeholder mention text and scene numbers (`assetExtractionService.ts:546-565`); style: capsule name, `descriptor_strings`, `design_pillars`, or manual tone | script text (C11, R1a: the script excerpt is computed but never read) | WD-IMPL-AI-0004 |
| Stage 5 asset description merge | two description strings | style, script | WD-IMPL-AI-0005 |
| Stage 5 asset images | asset `image_prompt` or description; style from the asset's capsule id, else the Stage 5 locked capsule, else manual tone; reference images with role `identity` or `style` | the Stage 8 scene context | WD-IMPL-AI-0037, 0038, 0039 |
| Stage 7 shot extraction | scene `script_excerpt`, scene number, prior scene `end_state_summary`, locked Stage 3 beats, locked Stage 4 summary, `location_views` for the scene's location, expected location name (route builds these at `projects.ts:1716-1830`, global context at `:1741-1788`) | Stage 2 treatment; writing style | WD-IMPL-AI-0071 |
| Stage 8 relevance | scene number and excerpt; shot list (`shot_id`, characters, setting, action); last known state per asset from earlier scenes (transformation-aware); locked project assets (id, name, type, description) | scene script beyond excerpt | WD-IMPL-AI-0075 |
| Stage 8 story-context inference (single and bulk) | asset name, type, master and current description, tags; scene excerpt; all locked Stage 3 beats; treatment text (always empty, C10); shot actions | the treatment (empty by key mismatch) | WD-IMPL-AI-0024, 0025 |
| Stage 8 transformation post description and prefill | asset name and appearance before; transformation narrative; scene excerpt (500 characters for post, 800 for prefill); trigger shot fields; absorbed instance shot assignments | the post image | WD-IMPL-AI-0076, 0077 |
| Stage 9 start frame prompt | shot fields (id, duration, action, setting, camera, characters, continuity flags); asset context in CHARACTERS, LOCATIONS, PROPS blocks; style context (always "No visual style capsule applied.", see below); image manifest; continuity mode and previous camera | script text; beats; writing style; previous prompts (V9 section 3.1) | WD-IMPL-AI-0006 |
| Stage 9 video prompt | shot action, camera movement, dialogue, characters, transforming assets, presence notes; the frame prompt argument is accepted but not interpolated | the frame prompt text itself | WD-IMPL-AI-0009 |
| Stage 10 end frame prompt | start frame prompt; asset descriptions; transformation rule; next-shot continuity note | style (from a column that is never written) | WD-IMPL-AI-0007 |
| Stage 10 continuity recomposition | previous and current shot camera, action, setting, characters; all scene asset descriptions (not shot-scoped); optional vision analysis of the reference frame | the reference image itself (no image part in this call) | WD-IMPL-AI-0008 |
| Stage 10 frame correction | current prompt text (`shot.end_frame_prompt` or `frame_prompt`) and correction text | everything else | WD-IMPL-AI-0078 |
| Stage 10 frame image jobs | frame prompt; reference images in `reference_image_order` (base frame, continuity references); prompt suffixes (1.7) | visual style (capsule id never reaches frame jobs) | WD-IMPL-AI-0054, 0083, 0087 |
| Streamline Ask Auteur questions and reconciliation | all successful file texts (first 4000 characters per file in questions; full text in reconciliation); names; primary flag; Q&A transcript | project style | WD-IMPL-AI-0031, 0032 |

Style context, in detail. The visual style capsule is referenced in several places, but the column that every path reads is never set:

- `projects.visual_style_capsule_id` and `projects.writing_style_capsule_id` are read at five conditional sites and three select lists. No code path writes either column (C02 CONFIRMED, R1a; WD-IMPL-FACT-0019). Stage 9 therefore uses `styleCapsule = null` and the string `No visual style capsule applied.` (`promptGenerationService.ts:762`, V9 section 3.1 step 7).
- Stage 5 stores its locked capsule id in `stage_states.content.locked_visual_style_capsule_id` (`Stage5Assets.tsx:227`), and asset-level image jobs read the asset's own `visual_style_capsule_id` (V2 section 5).
- Frame routes read `state_data.visualStyleCapsuleId` from `stage_states` filtered by `project_id`, but `stage_states` has no `project_id` or `state_data` column. The error is discarded and the id is undefined (C01 CONFIRMED, R1a; `frames.ts:262-267`, `:385-390`).
- Writing style reaches the Stage 2 to 4 templates through the `ContextManager` branch (1.4). That branch is active when `projectId` and `branchId` reach the route.

## 1.7 Image prompt wrapping (`NanoBananaClient`)

Handlers build the job prompt. `NanoBananaClient.generateImage` then rewrites it only when a style context string or reference images are present (`backend/src/services/image-generation/NanoBananaClient.ts:68-104`). Branches, by reference role counts:

- identity and style images both present, more than one image: `Maintain the characters/subjects from the FIRST {n} identity reference image(s) - preserve their exact appearance, features, clothing, and distinguishing details. Apply the visual style, color palette, mood, and aesthetic from the remaining {m} style reference image(s). {style guidance}Subject: {prompt}`;
- identity only: `Maintain the characters/subjects from the {n} reference image(s) - preserve their exact appearance ... Subject: {prompt}`;
- no roles, more than one image: `Generate an image of the subject shown in the FIRST reference image ... Subject: {prompt}`;
- one image: `Generate an image that matches the visual style, color palette, mood, and aesthetic shown in the provided reference image. {style guidance}Subject: {prompt}`;
- no loaded images, style context present: `Generate an image with the following visual style applied strongly throughout: {style}` followed by `Subject: {prompt}` and an `IMPORTANT` sentence;
- otherwise the job prompt is sent unchanged.

Style guidance text is `Apply these style guidelines: {visualStyleContext}. ` when present. E section 10 quotes the identity wrapper (`NanoBananaClient.ts:81`).

Parts sent: reference images first, then one text part (`NanoBananaClient.ts:118-130`). Reference download failures are skipped (`:60-66`). The request has no `generationConfig`, so width, height, and aspect ratio are never sent (C12 CONFIRMED, R1b; WD-IMPL-FACT-0189, 0027). `width` and `height` are echoed in returned metadata only (`:159-160`).

Upstream prompt additions that the wrapper does not own:

- isolation sentence `. Isolated on a plain white background, no environment, no other characters or objects.` (`ImageGenerationService.ts:86`), applied by `injectBackgroundContext` (see Part 2.4);
- frame inpaint marker `\n\n[Inpainting: Apply changes only to masked regions]` (`frameGenerationService.ts:1291`, WD-IMPL-AI-0083);
- end-frame fallback suffix ` [End of shot - showing action completion]` when no `end_frame_prompt` exists (`frameGenerationService.ts:466-468`, `:1195-1197`, E-AI-47);
- angle phrases such as `front-facing view, looking directly at the camera` (`ImageGenerationService.ts:258-263`, E section 10).

`injectBackgroundContext` (`ImageGenerationService.ts:78-89`) has an allow-list of job types that includes `transformation_post` (`:83`), but its three call sites pass only `master_asset` (`:131`, under `createImageJob`, only for `master_asset` and `angle_variant`), `scene_asset` (`:226`), and `master_asset` for global assets (`:749`). No caller passes `transformation_post`, so the entry is inert (WD-IMPL-AI-0084 correction, see Part 2.4).

Dimensions and duplication. Job width and height come from `ASPECT_RATIOS` (`ImageGenerationService.ts:58-63`) for assets and from `FRAME_DIMENSIONS` for frames (`frameGenerationService.ts:126-127`). They are stored on `image_generation_jobs` and never reach the model (C12). The project-asset `edit-image` handler appends the isolation sentence inline when `removeBackground` is set (`projectAssets.ts:1494-1496`) and then calls `createImageJob` with `master_asset`, which appends it again for isolatable types (`ImageGenerationService.ts:131`). The duplication is recorded in WD-IMPL-AI-0038 (WD-IMPL-FACT-0078).

## 1.8 Video provider prompt

- Veo 3.1 (`Veo3Provider.generateVideo`, `backend/src/services/video-generation/Veo3Provider.ts:70-104`). There is no system prompt and no wrapper. `instances[0].prompt` is `job.video_prompt_snapshot` (`VideoJobExecutor.ts:121-128`), which was copied from `shots.video_prompt` at render confirm (`videoGenerationService.ts:~365`). An empty snapshot omits the `prompt` field (WD-IMPL-AI-0080, V10-AI-01). The start frame goes in `instances[0].image` and the end frame in `lastFrame` (base64, MIME guessed from URL substring).
- `parameters` are `durationSeconds` (clamped to 4, 6, or 8), `sampleCount` 1, `generateAudio` true, `aspectRatio` from the project (default `16:9`), `personGeneration` `allow_adult`, `resizeMode` `pad` (`Veo3Provider.ts:70-104`, V10 section 6.1).
- The video prompt itself is the Stage 9 call WD-IMPL-AI-0009, with this system text (E-AI-32 excerpt, `promptGenerationService.ts:1207-1225`): `THE STARTING FRAME ALREADY ENCODES ALL VISUAL TRUTH. Do NOT describe what anyone looks like` and a four-part formula (camera movement, action, dialogue, sound design), with a 500-character cap. The frame prompt is passed in but not interpolated into either the system or the user text (V9-AI-02, V9 section 3.2).
- Mock (`MockVideoProvider`) ignores the prompt except for the first 100 characters stored in `providerMetadata.inputPrompt` (V10-AI-02, `MockVideoProvider.ts:31-40`).

## 1.9 Where user-authored content enters prompts and whether it can be rewritten

Each row names the user input, the prompt(s) it enters, whether an AI call rewrites it, and what overwrites it. The row labels follow V3 section 5 (U1 to U28), which records the overwrite behavior. No path performs a three-way merge or a diff before AI replacement, except the Stage 2 `confirm()` on variation switch with unsaved edits (V3 section 5).

| Input | Enters prompt | AI rewrites it | Overwrite and loss (V3 section 5) |
|---|---|---|---|
| Stage 1 idea, tonal precision, uploaded files | treatment template variables `input_mode`, `primary_content`, `context_files` (WD-IMPL-AI-0068, V3-AI-01) | no; verbatim | PDF upload yields empty text (U2); edits while Stage 1 is locked are discarded (U3) |
| Stage 2 treatment text selected for "Edit Selection" | section rewrite user prompt (`FULL TREATMENT CONTEXT`, `SELECTED TEXT`, `USER GUIDANCE`), WD-IMPL-AI-0014, 0015 | yes; replaces the selected span by offset | local until Save Changes (U6) |
| Stage 2 user guidance for section rewrite | same prompt; default `Rewrite this section` when empty (WD-IMPL-AI-0014) | not applicable | none |
| Stage 2 "Full Regenerate" guidance | sent as `regeneration_guidance`; no placeholder in template (WD-IMPL-FACT-0034) | yes, but guidance does not reach the model | dropped (U8) |
| Stage 3 beat text, all beats as context | brainstorm prompt (WD-IMPL-AI-0017); Regenerate All uses a stale `treatmentSource` snapshot (U13) | brainstorm rewrites one beat; Regenerate All replaces all | locked Stage 3 edits overwrite locked content (U14) |
| Stage 4 selected script text, 500 characters before and after | section rewrite (WD-IMPL-AI-0021, 0022); replaced selection | yes | debounce-lost edits (U22); Regenerate replaces the whole script (U19) |
| Stage 4 script on approve | `scenes.script_excerpt` overwritten (U23); scenes re-pointed by slug and number; unmatched rows hard-deleted (U24, C15 partially confirmed by R1b) | not AI | deletion cascades (`05-DATA-MODEL.md`) |
| Stage 5 asset description and edit instructions | `editInstructions. Context: {description}` (`projectAssets.ts:1490-1493`) becomes the image prompt (WD-IMPL-AI-0038) | image model reads it; description is not rewritten | attempt row selected before Accept |
| Stage 5 uploaded image | vision description (WD-IMPL-AI-0035); merge follow-up (WD-IMPL-AI-0036) | yes, from the image | written only on Accept |
| Stage 8 existing asset description and tags | inference prompt (WD-IMPL-AI-0024, 0025) | yes, as a suggestion | written only on UI PUT |
| Stage 8 transformation pre description and narrative | post description (WD-IMPL-AI-0076) and prefill (WD-IMPL-AI-0077) | yes; post description persisted | prefill is saved only on confirm (UNKNOWN exact path) |
| Stage 9 shot prompts edited by user | `frame_prompt`, `video_prompt` overwritten on regenerate; `start_continuity` and `requires_end_frame` replaced (V9 section 3.6) | yes (regenerate) | prior text survives only as a `text_field_versions` row when versioned (`10-VERSIONING-LOCKING-AND-INVALIDATION.md`) |
| Stage 10 frame correction text | correction prompt (WD-IMPL-AI-0078); the result overwrites `shots.frame_prompt` or `end_frame_prompt` with no version row | yes, surgical per system text | prior prompt is not versioned in this handler (ledger label NO-VERSION-RECORD) |
| Streamline Ask Auteur answers | reconciliation prompt (WD-IMPL-AI-0032) with Q&A transcript | yes; rewrites whole documents for changed files only | committed as stage content; `formatChoice` never leaves the browser (C19 CONFIRMED) |

Whether user text can be rewritten: yes, on every row marked yes, by an AI call that replaces the stored or displayed text, usually on a click. No call is bounded by a user-visible diff. The `text_field_versions` table (`10-VERSIONING-LOCKING-AND-INVALIDATION.md`) records some writes; this document does not evaluate that table beyond the rows above.

Sanitization. No sanitization, delimiting, or escaping of user text before interpolation was found in the reports (R1a, V3 section 5, E section 6). Treat that as a verified absence within the paths the reports read, not as a proof for every path.

## 1.10 Authorization of template edit routes

Mounting. `app.use('/api/llm', authenticateUser, llmRouter)` (`backend/src/server.ts:75`) and `app.use('/api/seed', authenticateUser, seedRouter)` (`:78`) apply authentication only. The images and assets routers use the same pattern (`:84`, `:87`).

Routes that mutate templates (`backend/src/routes/llm.ts`): `POST /templates` (`:483`), `PUT /templates/:id` (`:566`), `DELETE /templates/:id` (`:613`), and `POST /templates/:id/activate` (`:647`). Read routes: `GET /templates` (`:443`), `GET /templates/:id` (`:527`), `POST /templates/interpolate` (`:681`), `GET /templates/stage/:stageNumber/active` (`:731`). No role, admin, or ownership check exists in `routes/llm.ts` (R1b C17; grep for `role`, `isAdmin` returns nothing). `POST /api/seed/prompt-templates` has no role check in `routes/seed.ts` (grep returns nothing).

Ownership checks in the service (`backend/src/services/prompt-template.ts`): `updateTemplate` (`:207`), `deleteTemplate` (`:240`), and `activateTemplate` (`:375`) each use the same guard, `if (userId && existing.created_by && existing.created_by !== userId) throw PERMISSION_DENIED`. The guard is skipped when `created_by` is NULL. Both seed copies create rows with `created_by` NULL (1.4). The route passes `req.user?.id` to delete and activate (`llm.ts:617`, `:651`) and passes it to update through the service call (`:571`).

Effect (R1b C17 CONFIRMED, WD-IMPL-FACT-0195): any authenticated API user can change the system prompt, user prompt, `description`, or `is_active` of a seeded template (update schema at `llm.ts:39-44`), and activation deactivates the other rows with the same name for every caller. The live Stage 2 to 4 prompt therefore changes for all users when one user activates a row. The backend's service-role client bypasses RLS (`backend/src/config/database.ts:1-4`, `config/supabase.ts:10`).

The frontend never calls `/api/llm/templates` (R1b, `grep -rn "api/llm/templates" src` returns nothing).

Security surface summary: FACT-0195 is labeled SECURITY-SURFACE and SHARED-MUTABLE in the ledger. Its rule-level status is PERSISTED (rows persist) and FUNCTIONAL (guard logic runs as written). Whether any deployed database has rows with non-NULL `created_by` for these names is UNKNOWN.

---

# Part 2. Canonical AI and model call inventory

Each entry lists the live merged ledger id (`WD-IMPL-AI-NNNN`), its reporter lids, and its flags as `P/R/F/Pe/T` (present, reachable, functional, persisted, tested) with Y, N, P, or U. When the merged entry has no flags (null), the flags come from the reporter entry or from R2, and the entry says so. Retired duplicate ids are listed under their canonical id (`_evidence/merged/retired-ids.json`). The label `CONTRADICTED` or any other label is copied from the ledger and explained in the entry or in the corrections list. Prompt excerpts are fixed text from `E-ai-calls.md` section 10 or from the cited source lines. Dynamic context lists what varies per call.

Group totals: narrative 12, streamline 9, project assets and location views 10, scene assets and transformations 8, shots 4, prompts 5, frames and images 7, video 2, global library 1, misc and orphaned 3. Total 61.

## 2.1 Narrative (Stages 1 to 4, Stage 4 legacy, generic pass-through)
### 2.1.1 WD-IMPL-AI-0001: Writing-style template route (Stages 2 to 4)
- Purpose: Dispatch a named template for Stage 2 to 4 generation, with writing-style context injected.
- Ledger: V2-AI-01. Flags Y/Y/Y/Y/N. Related CAP-0066, FACT-0034.
- Trigger and call site: user generate or regenerate in Stage 2, 3, or 4. `POST /api/llm/generate-from-template` (`backend/src/routes/llm.ts:139`). Frontend callers: `treatmentService.ts:94,164`, `beatService.ts:76,153`, `scriptService.ts:102,172` (R2 entry 1).
- Provider and model: Gemini text via `LLMClient`. Model is per template (2.1.2 to 2.1.4).
- System and user prompt: DB row in `prompt_templates` selected by `templateName` with `is_active` TRUE (1.4). No code fallback.
- Dynamic context: frontend variables; backend overwrites `writing_style_context` (`llm.ts:194-215`, `:236-262`) and adds `beat_sheet_reference` at stage 4 and later (`:218-221`).
- Output and parse: returns raw model text; parsing is in the frontend per template (2.1.2 to 2.1.4). Route returns `styleCapsuleMetadata` for the frontend to store.
- Retry and fallback: `llmClient` 4 attempts. No active template: HTTP 404 (`:159-164`). Missing variable: HTTP 400 (`:176-186`). Context failure: writing style becomes empty (`:227-231`).
- Persistence and consumers: frontend saves to `stage_states` and `style_capsule_applications` (`stageStates.ts:259-280`). Consumers are Stage 2, 3, and 4 content.
- Risks and notes: live template text UNKNOWN. Route accepts a client `model` string (`:45-60`). Any authenticated user can edit the template rows (1.10).
- Evidence: WD-IMPL-AI-0001; V2-AI-01; `routes/llm.ts:139-342`.
### 2.1.2 WD-IMPL-AI-0068: Stage 2 treatment generation (`treatment_expansion`)
- Purpose: Generate three Stage 2 treatment variations from Stage 1 input.
- Ledger: E-AI-01, V3-AI-01. Retired ids 0013 (mapped here). Flags Y/Y/U/P/P. Labels DUPLICATED. Related FACT-0182, 0187, 0193, 0194, PROV-0016.
- Trigger and call site: `Stage2Treatment.tsx:193` (generate) and `:365` (regenerate with guidance). `treatmentService.ts:38-120` (`generateTreatments`) and `:125-187` (`regenerateTreatments`), then `POST /api/llm/generate-from-template`.
- Provider and model: Gemini via `ChatGoogleGenerativeAI`. Model `request.model || GEMINI_MODEL || gemini-1.5-flash` (`llm-client.ts:106`). Frontend sends no model. Defaults temperature 0.7, max 4096.
- System prompt source: DB row `treatment_expansion`. Seed text (`scripts/seed-templates.ts:22-24`): `You are a narrative expansion specialist. Your role is to transform brief story ideas into fully-realized 3-act treatments.` The route copy (`routes/seed.ts:22-28`) has the same opening but no JSON format block.
- User prompt source: DB `user_prompt_template`. Seed begins `INPUT MODE: {input_mode} ... PRIMARY CONTENT: {primary_content}` (`seed-templates.ts:68-83`).
- Dynamic context: `input_mode`, `primary_content`, `context_files`, `target_length_min`, `target_length_max`, `project_type`, `content_rating`, `genres`, `tonal_precision`, `writing_style_context` (backend overwrites), `writing_style_capsule_id`. `regeneration_guidance` is sent and dropped (no placeholder).
- Output and parse: frontend `treatmentService.parseTreatmentResponse` (`:351-456`): strip fences, `JSON.parse`, read `treatments[].prose`. Fallbacks: split on `TREATMENT|VARIATION [123]`, else one variation. No backend parse.
- Retry and fallback: `llmClient` 4 attempts on RATE_LIMIT, SERVER_ERROR, NETWORK_ERROR. No timeout. No hardcoded fallback.
- Persistence and consumers: returned to frontend; Stage 2 autosave writes `stage_states(2).content` with `langsmithTraceId` (the request UUID) and `promptTemplateVersion` (`Stage2Treatment.tsx:202-204`). `stage_states.langsmith_trace_id` is not written. Consumers: Stage 2 variations and Stage 3 input (`treatment_prose`).
- Risks and notes: live template UNKNOWN. Route copy lacks the JSON format block that the parser depends on (FACT-0193, E-FACT-14). Full Regenerate guidance dropped (U8). Storage-context treatment lookup reads keys this content never has (C10).
- Evidence: WD-IMPL-AI-0068; E-AI-01; `routes/llm.ts:139-342`; `treatmentService.ts:38-456`.
### 2.1.3 WD-IMPL-AI-0069: Stage 3 beat extraction (`beat_extraction`)
- Purpose: Extract Stage 3 beats from the active treatment.
- Ledger: E-AI-02, V3-AI-04, V3-AI-06. Retired ids 0016, 0018. Flags Y/Y/U/P/N. Labels DUPLICATED, CONTRADICTED. Related 0068, FACT-0187, 0193, 0194.
- Trigger and call site: `Stage3BeatSheet.tsx:329` (generate) and `:534` (regenerate). `beatService.ts:44,106` (`generateBeats`, `regenerateBeats`), then `generate-from-template`.
- Provider and model: Gemini via LangChain. Model `GEMINI_MODEL` else `gemini-1.5-flash`. Local `.env` value reported as `gemini-1.5-flash` (E); `backend/env.example:17` sets the same.
- System prompt source: DB `beat_extraction`. Script seed (`seed-templates.ts:93-131`) has the JSON beats format; route seed does not (E-AI-02 note).
- User prompt source: DB row. Script seed (`seed-templates.ts:132-142`): `TREATMENT TO ANALYZE: {treatment_prose} SELECTED VARIANT: {selected_variant_id} ...`.
- Dynamic context: `treatment_prose`, `selected_variant_id`, `target_length_min`, `target_length_max`, `genres`, `tonal_precision`, `writing_style_context` (overwritten), `writing_style_capsule_id`. `regeneration_guidance` sent by `beatService.ts:141`, no placeholder. Regenerate uses a stale `treatmentSource` snapshot (U13). Hardcoded parameter defaults apply when Stage 2 `processedInput` is missing (V3-AI-04).
- Output and parse: `beatService.parseBeatsResponse`: fence strip, `JSON.parse`, `beats[]` with `text`, `content`, or `description`. Fallbacks: line-regex extraction (`beatService.ts:426-440`), then the whole text as one beat (`:334-369`).
- Retry and fallback: `llmClient` 4 attempts. Text fallbacks above. No timeout.
- Persistence and consumers: beats saved in `stage_states(3).content` by Stage 3 autosave (`Stage3BeatSheet.tsx:352-354`, `:560-561`). Trace and version stored in content JSON. Consumers: Stage 3 locked beats, Stage 4 `beatSheetSource`, Stage 7 global context, Stage 8 inference.
- Risks and notes: no test found for `beatService.generateBeats` (ledger tested N). Guidance dropped.
- Evidence: WD-IMPL-AI-0069; E-AI-02; V3-AI-04, V3-AI-06; `beatService.ts:44-441`.
### 2.1.4 WD-IMPL-AI-0070: Stage 4 master screenplay (`master_script_generation`)
- Purpose: Convert the Stage 3 beat sheet into the Stage 4 screenplay.
- Ledger: E-AI-03, V3-AI-07, V3-AI-08. Retired ids 0019, 0020. Flags Y/Y/U/P/P. Labels CONTRADICTED. Related 0068, FACT-0187, 0193, 0194, 0021, 0022.
- Trigger and call site: `Stage4MasterScript.tsx:320` (generate, also auto on first visit) and `:393` (regenerate). `scriptService.ts:65,134`, then `generate-from-template`.
- Provider and model: Gemini via LangChain. Model `GEMINI_MODEL` else `gemini-1.5-flash`.
- System prompt source: DB row. Script seed (`seed-templates.ts:152-182`): `You are a screenplay formatting specialist.` The route seed adds a `SUB-LOCATION PRECISION (CRITICAL)` block (`routes/seed.ts:108-128`). The script seed text includes `Return ONLY the formatted screenplay text. Do NOT wrap it in JSON or markdown code blocks.` (E section 10, AI-03).
- User prompt source: DB row. Script seed (`seed-templates.ts:183-199`): `BEAT SHEET TO CONVERT: {beat_sheet_content} ...`.
- Dynamic context: `beat_sheet_content` (from `scriptService.formatBeatSheetForPrompt`, `scriptService.ts:553-562`), target lengths, `content_rating`, `genres`, `tonal_precision`, `writing_style_context`, `writing_style_capsule_id`. `regeneration_guidance` sent (`scriptService.ts:158`), no placeholder. Server adds `beat_sheet_reference` (no placeholder).
- Output and parse: `scriptService.parseScriptResponse`: tries JSON (`formatted_script`), otherwise plain text, then `stripHtmlTags`, then `extractScenes` heuristic on `INT.` and `EXT.` headings (`scriptService.ts:401-469`, `:487-524`).
- Retry and fallback: `llmClient` 4 attempts. No timeout. Non-JSON output accepted as the script.
- Persistence and consumers: `formattedScript`, trace id, and version in Stage 4 content. Scenes persisted through `PUT /api/projects/:id/scenes` (`routes/projects.ts:1217`; identity and deletion rules in `05-DATA-MODEL.md`). Consumers: Stage 4 screenplay, scenes, Stage 7 master-script summary, Stage 8 excerpts.
- Risks and notes: scene split depends on the frontend heuristic. Seed copies differ (FACT-0193). `tested` P: `scriptService.test.ts` covers slug logic only.
- Evidence: WD-IMPL-AI-0070; E-AI-03; V3-AI-07, V3-AI-08; `scriptService.ts:65-524`.
### 2.1.5 WD-IMPL-AI-0014: Stage 2 section rewrite, single selection
- Purpose: Rewrite one selected treatment span.
- Ledger: E-AI-04, V3-AI-02. Flags Y/Y/P/N/N. Related CAP-0092.
- Trigger and call site: Edit Selection with count 1 in Stage 2. `treatmentService.ts:192` (`regenerateSection`), then `POST /api/llm/generate` (`routes/llm.ts:64`).
- Provider and model: Gemini via LangChain. Default model (`GEMINI_MODEL` or `gemini-1.5-flash`).
- System prompt source: frontend literal beginning `You are a narrative editor` (V3 section 8, AI-02).
- User prompt source: frontend literal with sections `FULL TREATMENT CONTEXT`, `SELECTED TEXT`, `USER GUIDANCE`. Guidance defaults to `Rewrite this section` when empty (V3-AI-02).
- Dynamic context: full editable treatment text, selected text, guidance.
- Output and parse: raw `result.data.content`. No parse. Replacement is an offset splice in the editor.
- Retry and fallback: `executeWithRetry` (4 attempts). Errors to toast.
- Persistence and consumers: none until Save Changes writes Stage 2 content (U5, U6).
- Risks and notes: the backend sees only `metadata.operation` for this route (R2 section 7). Multi-paragraph insertion structure not tested.
- Evidence: WD-IMPL-AI-0014; E-AI-04; V3-AI-02; `treatmentService.ts:192-307`.
### 2.1.6 WD-IMPL-AI-0015: Stage 2 section alternatives, three
- Purpose: Offer three rewrites of a selected treatment span.
- Ledger: E-AI-05, V3-AI-03. Flags Y/Y/P/N/N. Related CAP-0092, 0014.
- Trigger and call site: Edit Selection with count 3. `treatmentService.ts:250` (`regenerateSectionAlternatives`), then `/api/llm/generate`.
- Provider and model: Gemini via LangChain, default model.
- System prompt source: frontend literal asking for `exactly 3 alternative rewrites` as a JSON array (V3 section 8, AI-03).
- User prompt source: frontend literal with full treatment, selected text, optional guidance.
- Dynamic context: as 2.1.5.
- Output and parse: `treatmentService.parseAlternatives`: JSON array, `alternatives` key, numbered split, or single item; capped at three.
- Retry and fallback: as 2.1.5.
- Persistence and consumers: none until a pick and Save Changes.
- Risks and notes: alternatives are applied only on click (V3-AI-03).
- Evidence: WD-IMPL-AI-0015; E-AI-05; `treatmentService.ts:250-307`.
### 2.1.7 WD-IMPL-AI-0021: Stage 4 section rewrite, single selection
- Purpose: Rewrite one selected screenplay span.
- Ledger: E-AI-06, V3-AI-09. Flags Y/Y/P/Y/N. Related CAP-0104.
- Trigger and call site: Edit Selection with count 1 in Stage 4. `scriptService.ts:202` (`regenerateSection`), then `/api/llm/generate`.
- Provider and model: Gemini via LangChain, default model.
- System prompt source: frontend literal `screenplay editor`, rewrite only the highlighted section, return only the rewritten section (V3 section 8, AI-09).
- User prompt source: frontend literal. Context is 500 characters before and after the selection, the selection, and the request (V3-AI-09).
- Dynamic context: `beforeText`, `highlightedText`, `afterText`, `editRequest`.
- Output and parse: fence strip, then trim. Inserted with editor `insertContent`. Multi-line structure UNKNOWN.
- Retry and fallback: error toast.
- Persistence and consumers: Stage 4 content through the debounced save (2 s). Edits made less than 2 s before unmount can be lost (U22).
- Risks and notes: none beyond the above.
- Evidence: WD-IMPL-AI-0021; E-AI-06; `scriptService.ts:202-334`.
### 2.1.8 WD-IMPL-AI-0022: Stage 4 section alternatives, three
- Purpose: Offer three rewrites of a selected screenplay span.
- Ledger: E-AI-07, V3-AI-10. Flags Y/Y/P/N/Y. Related CAP-0104, 0021.
- Trigger and call site: Edit Selection with count 3. `scriptService.ts:275` (`regenerateSectionAlternatives`), then `/api/llm/generate`.
- Provider and model: Gemini via LangChain, default model.
- System prompt source: frontend literal `exactly 3 alternative rewrites ... JSON array`.
- User prompt source: frontend literal with before, highlighted, and after text plus request.
- Dynamic context: as 2.1.7.
- Output and parse: `scriptService.parseAlternatives`: JSON array or numbered split, single-item fallback.
- Retry and fallback: as 2.1.7.
- Persistence and consumers: none until a pick, then debounced save.
- Risks and notes: ledger tested Y, but V3-AI-10 states that the existing test covers slug logic only, not this call. Treat as untested for this call.
- Evidence: WD-IMPL-AI-0022; E-AI-07; V3-AI-10.
### 2.1.9 WD-IMPL-AI-0017: Stage 3 brainstorm, three alternatives for one beat
- Purpose: Offer three alternative texts for one beat.
- Ledger: E-AI-08, V3-AI-05. Flags Y/Y/P/Y/N. Related CAP-0098.
- Trigger and call site: Sparkles on a beat, then Generate Alternatives. `beatService.ts:183` (`brainstormBeatAlternatives`), then `/api/llm/generate`.
- Provider and model: Gemini via LangChain, default model.
- System prompt source: frontend literal `brainstorm alternative versions of a specific story beat ... exactly 3 ... JSON array of {text}` (V3 section 8, AI-05).
- User prompt source: frontend literal. Context includes the target beat, all beats as `SURROUNDING CONTEXT`, and optional guidance.
- Dynamic context: target beat, all beats, guidance.
- Output and parse: `beatService.parseAlternativesResponse`: JSON, header split, or original beat.
- Retry and fallback: returns the original beat unchanged on failure (silent).
- Persistence and consumers: replaces beat text on pick; Stage 3 autosave.
- Risks and notes: silent fallback (V3-AI-05).
- Evidence: WD-IMPL-AI-0017; E-AI-08; `beatService.ts:183-298`.
### 2.1.10 WD-IMPL-AI-0026: Stage 3 beat split (no caller)
- Purpose: Split one beat into several (no caller).
- Ledger: E-AI-09, V3-AI-16. Flags N/N/N/N/N. Labels DEAD. Related DEAD-0015 (not this entry).
- Trigger and call site: none. `beatService.ts:246-298` (`splitBeat`) has no caller in `src/components` or `src/pages` (E-DEAD-03, R2 entry 10).
- Provider and model: Gemini via LangChain, default model (would apply if called).
- System and user prompt source: frontend literals with the beat and guidance (V3-AI-16).
- Output and parse: line split (`parseSplitBeatsResponse`).
- Retry and fallback: returns the original beat.
- Persistence and consumers: none.
- Risks and notes: DEAD. Included because it is a registered prompt builder.
- Evidence: WD-IMPL-AI-0026; E-DEAD-03.
### 2.1.11 WD-IMPL-AI-0023: Legacy LLM scene dependency extraction (PUT scenes fallback)
- Purpose: Infer characters, location, and props for a scene on the legacy PUT path.
- Ledger: E-AI-22, V3-AI-11. Flags Y/N/U/Y/N. Labels DEAD, LEGACY. Related FACT-0041.
- Trigger and call site: `PUT /api/projects/:id/scenes` (`routes/projects.ts:1217`), fallback at `:1346` when `dependenciesMap` is empty. R2 section 5: this happens only when no `tiptapDoc` is sent or manifest extraction throws. Stage 1 always sends `tiptapDoc` (`scriptConfidence.ts:10`). Stage 4 sends `editor?.getJSON()` (`Stage4MasterScript.tsx:610`). V3-AI-11 says both in-repo callers send `tiptapDoc`. Evidence favors R2's finer reading, confidence medium.
- Provider and model: Gemini via LangChain, default model.
- System prompt source: literal in `extractWithLLM` (`sceneDependencyExtraction.ts`), `script analysis assistant ... characters/location/props JSON` (V3 section 8, AI-11).
- User prompt source: literal with scene heading and first 20 lines of `script_excerpt`.
- Dynamic context: scene heading, first 20 lines.
- Output and parse: fence strip, `JSON.parse`; throws on parse failure.
- Retry and fallback: 15 s race (`sceneDependencyExtraction.ts:60`); rate limit returns empty; other errors return empty dependencies.
- Persistence and consumers: `scenes.expected_characters`, `expected_location`, `expected_props` (overwrite rules in `05-DATA-MODEL.md`; U27).
- Risks and notes: effectively unreachable under normal flows. Race timeout does not abort.
- Evidence: WD-IMPL-AI-0023; E-AI-22; R2 entry 26 and section 5; `projects.ts:1217-1400`.
### 2.1.12 WD-IMPL-AI-0088: Generic LLM pass-through, `POST /api/llm/generate`
- Purpose: Send client-built system and user prompts to the model.
- Ledger: M-AI-03 (lead addition, found by R2). Flags Y/Y/Y/N/U. Related none.
- Trigger and call site: frontend section-rewrite actions for treatment, script, and beats (2.1.5 to 2.1.9). `backend/src/routes/llm.ts:64-70`, schema `generateRequestSchema` (`:45-60`).
- Provider and model: Gemini via LangChain. Model from body `model` or `GEMINI_MODEL`.
- System and user prompt source: client supplied as `systemPrompt` and `userPrompt` (min length 1).
- Dynamic context: whatever the client sends. The backend sees only `metadata.operation`.
- Output and parse: raw text returned.
- Retry and fallback: `llmClient` retries (2.1.1 notes).
- Persistence and consumers: none in the route. Consumers are the frontend services.
- Risks and notes: any authenticated caller can supply arbitrary system and user prompts and any model string, with no allowlist. Each call uses the server's Gemini key. Tested U.
- Evidence: M-AI-03; R2 section 6 item 3; `routes/llm.ts:45-70`.

## 2.2 Streamline intake (Stage 1 and Ask Auteur)
### 2.2.1 WD-IMPL-AI-0002: Backfill treatment from locked script (Stage 2 skipped)
- Purpose: Write a Stage 2 treatment from a locked Stage 4 script.
- Ledger: V2-AI-02, V3-AI-14, V4-AI-07, E-AI-16. Flags Y/P/U/Y/N. Related CAP-0066. Retired none.
- Trigger and call site: `Generate this now` on a skipped Stage 2 (`ProjectView.tsx:677`), then `streamlineService.ts:135` and `POST /api/projects/:id/streamline/backfill/:stageNumber` (`routes/streamline.ts:99`). `streamlineBackfillService.ts:backfillTreatment` (`:57`).
- Provider and model: Gemini via `llmClient`. Model is the call-path default `gemini-1.5-flash` (`llm-client.ts:106`). V2-AI-02 and the ledger model field say `gemini-2.5-flash-lite`; that is the constructor default, not this path (R2 section 4, corrected).
- System prompt source: literal `script analyst` prompt in `backfillTreatment` (V3 section 8, AI-14): single cohesive prose treatment, 2 to 4 paragraphs.
- User prompt source: literal with genre, rating, length, style, and locked Stage 4 `formattedScript` as `SCREENPLAY`.
- Dynamic context: locked Stage 4 script, project params, writing capsule text and ESTABLISHED FACTS only when a writing capsule exists (V4-AI-07).
- Output and parse: trim to one variation; `structuralEmphasis` balanced; runtime midpoint.
- Retry and fallback: `StreamlineBackfillError` to HTTP 400; `llmClient` 4 attempts; other errors HTTP 500. Temperature 0.5, max 2048.
- Persistence and consumers: locked `stage_states` row for stage 2 with origin `ai-generated` (V4-AI-07).
- Risks and notes: no test exercises the LLM path (V4-AI-07). Writing style branch depends on capsule presence. Locked output (`10-VERSIONING-LOCKING-AND-INVALIDATION.md`).
- Evidence: WD-IMPL-AI-0002; E-AI-16; V2-AI-02; V4-AI-07; `streamlineBackfillService.ts:57-100`.
### 2.2.2 WD-IMPL-AI-0003: Backfill beat sheet from locked script (Stage 3 skipped)
- Purpose: Extract a Stage 3 beat sheet from a locked Stage 4 script.
- Ledger: V2-AI-03, V3-AI-15, V4-AI-08, E-AI-17. Flags Y/P/U/Y/N. Related none.
- Trigger and call site: `Generate this now` on skipped Stage 3, same route with `stageNumber` 3. `streamlineBackfillService.ts:backfillBeatSheet` (`:106`).
- Provider and model: Gemini via `llmClient`, call-path default (as 2.2.1).
- System prompt source: literal in `backfillBeatSheet`. No style or facts injected (V4-AI-08).
- User prompt source: literal with target length and locked script.
- Dynamic context: locked Stage 4 script, target length.
- Output and parse: `extractJsonArray` (repair chain), UUID ids, `narrativeStructure` `derived_from_script`.
- Retry and fallback: `llmClient` 4 attempts; parse failure throws. Temperature 0.4, max 4096.
- Persistence and consumers: locked `stage_states` row for stage 3, origin `ai-generated`.
- Risks and notes: ledger tested N (the `llmJson` helper has tests; this call does not, V3-AI-15).
- Evidence: WD-IMPL-AI-0003; E-AI-17; `streamlineBackfillService.ts:106-150`.
### 2.2.3 WD-IMPL-AI-0027: Prose document classification (intake)
- Purpose: Classify an uploaded non-script document.
- Ledger: V4-AI-01, E-AI-10. Flags Y/Y/Y/N/Y. Related CAP-0111.
- Trigger and call site: `POST /api/projects/:id/streamline/extract-file` (`routes/streamline.ts:196`), from `StreamlineDropZone.tsx:123` via `streamlineService.extractFile`. Only when the regex script detector (`utils/scriptConfidence.ts:27-64`) does not return high or ambiguous (`streamlineClassificationService.ts:20-28`, `:70-72`).
- Provider and model: Gemini via `llmClient`. `GEMINI_MODEL` else `gemini-1.5-flash`.
- System prompt source: inline at `streamlineClassificationService.ts:L31-L37`. Text is not quoted in the reports.
- User prompt source: inline. `FILENAME` plus the first 6000 characters (`:L39`).
- Dynamic context: extracted text, file name.
- Output and parse: `extractJsonObject`; invalid type becomes `unclassified`; confidence clamped; default 0.5.
- Retry and fallback: `llmClient` retries; any error becomes `{unclassified, 0}` (silent).
- Persistence and consumers: none (returned). Result selects 2.2.4 for `character_notes`.
- Risks and notes: tested Y with mocked `llmClient` (E section 8); parsing and fallback only.
- Evidence: WD-IMPL-AI-0027; E-AI-10; V4-AI-01; `streamlineClassificationService.ts:20-72`.
### 2.2.4 WD-IMPL-AI-0028: Standalone asset draft from character notes
- Purpose: Draft one Stage 5 character asset from a character-notes file.
- Ledger: V4-AI-02, E-AI-11. Flags Y/Y/Y/P/Y. Related CAP-0117.
- Trigger and call site: `extract-file` when classification type is `character_notes` (`routes/streamline.ts:222-230`). `streamlineStandaloneAssetService.ts:extractStandaloneAssetDraft` (`:19`).
- Provider and model: Gemini via `llmClient`, `GEMINI_MODEL` else `gemini-1.5-flash`. Temperature 0.3, max 500.
- System and user prompt source: inline (`:L20-L23`). `FILENAME` plus the first 4000 characters of the note file.
- Dynamic context: note text, file name.
- Output and parse: `extractJsonObject`; invalid type becomes `character`; missing name becomes file name without extension.
- Retry and fallback: `llmClient` retries; the route catches any error as non-fatal and omits the draft.
- Persistence and consumers: `project_assets` row (source `extracted`) only on commit (P).
- Risks and notes: R2 section 4 notes that V4's cited range `:164-190` is past end of file (45 lines); corrected to L19.
- Evidence: WD-IMPL-AI-0028; E-AI-11; V4-AI-02.
### 2.2.5 WD-IMPL-AI-0029: AI-format document as treatment
- Purpose: Reformat an uploaded document as a Stage 2 treatment.
- Ledger: V4-AI-03, E-AI-12. Flags Y/Y/Y/P/Y. Related CAP-0116, 0002.
- Trigger and call site: user clicks AI-format on a treatment target. `setFormatChoice` (`StreamlineDropZone.tsx:231`), then `POST /api/projects/:id/streamline/format-file` with `targetType: treatment` (`routes/streamline.ts:318-353`). `streamlineFormattingService.ts:formatAsTreatment` (`:25`).
- Provider and model: Gemini via `llmClient`, `GEMINI_MODEL` else `gemini-1.5-flash`. Temperature 0.5, max 2048.
- System and user prompt source: inline (`:L26`). Instruction reformats loose text into a two to four paragraph prose treatment and forbids invented content (V4-AI-03). Full document text, untruncated.
- Dynamic context: document text only.
- Output and parse: trim.
- Retry and fallback: `llmClient` retries; error becomes HTTP 500 and a frontend toast.
- Persistence and consumers: `file.formattedText` in React state until commit; then Stage 2 `variations[0].content` (P).
- Risks and notes: the commit route ignores `formatChoice`, so the AI text is committed when present (C19 CONFIRMED, R1b).
- Evidence: WD-IMPL-AI-0029; E-AI-12; V4-AI-03; `streamlineFormattingService.ts:25-70`.
### 2.2.6 WD-IMPL-AI-0030: AI-format document as beat sheet
- Purpose: Reformat an uploaded document as a Stage 3 beat sheet.
- Ledger: V4-AI-04, E-AI-13. Flags Y/Y/Y/P/Y. Related CAP-0116, 0003.
- Trigger and call site: AI-format with `beat_sheet` target. `POST .../streamline/format-file` (`routes/streamline.ts:318`). `streamlineFormattingService.ts:formatAsBeatSheet` (`:42`).
- Provider and model: Gemini via `llmClient`. Temperature 0.4, max 4096.
- System and user prompt source: inline (`:L43-L46`). Reformat into a JSON beat array grounded in the source.
- Dynamic context: document text only.
- Output and parse: `extractJsonArray` (fence strip, trailing comma, truncation, object repair); UUID ids; runtime summed.
- Retry and fallback: `llmClient` retries; parse or LLM error becomes HTTP 500.
- Persistence and consumers: Stage 3 beats with `narrativeStructure` `derived_from_streamline_intake` on commit (P).
- Risks and notes: as 2.2.5 (commit ignores `formatChoice`).
- Evidence: WD-IMPL-AI-0030; E-AI-13; V4-AI-04.
### 2.2.7 WD-IMPL-AI-0031: Ask Auteur question generation
- Purpose: Generate Ask Auteur questions about contradictions and gaps.
- Ledger: V4-AI-05, E-AI-14. Flags Y/Y/Y/P/Y. Related CAP-0120.
- Trigger and call site: `POST .../streamline/analyze` (`routes/streamline.ts:363`) after the batch settles. UI at `Stage1InputMode.tsx:327`. `streamlineQuestionService.ts:analyzeBatch`.
- Provider and model: Gemini via `llmClient`. Temperature 0.3, max 2048.
- System prompt source: `buildSystemPrompt()` (`streamlineQuestionService.ts:L49-L71`). Asks for contradictions, vague traits, ambiguous structure, and missing information, returned as two to four multiple-choice questions with optional subject entity and conflicting sources.
- User prompt source: `buildUserPrompt()` (`:L73-L77`): per-file header with `(PRIMARY)` when applicable, first 4000 characters of each file.
- Dynamic context: all successful file texts, names, primary flag.
- Output and parse: `extractJsonArray`; filter valid categories; ids `q-{i}-{Date.now()}`; options normalized.
- Retry and fallback: any error returns `[]` (no session started, silent).
- Persistence and consumers: `intake_resolutions` on commit (P). Consumers: Stage 1 Ask Auteur UI, reconciliation (2.2.8).
- Risks and notes: silent empty result on failure.
- Evidence: WD-IMPL-AI-0031; E-AI-14; V4-AI-05.
### 2.2.8 WD-IMPL-AI-0032: Ask Auteur reconciliation (rewrite documents from answers)
- Purpose: Rewrite uploaded documents from Ask Auteur answers.
- Ledger: V4-AI-06, E-AI-15. Flags Y/Y/P/P/Y. Related CAP-0121, CAP-0123.
- Trigger and call site: answer submit. `POST .../streamline/reconcile` (`routes/streamline.ts:400`), UI `Stage1InputMode.tsx:373`. `streamlineReconciliationService.ts:reconcileDocuments` (`:74`).
- Provider and model: Gemini via `llmClient`. Temperature 0.2, max 8192.
- System prompt source: `buildSystemPrompt()` (`:L45-L60`). Rewrite only changed documents; return `editScope` (`word_patch`, `paragraph_rewrite`, `structural_cascade`) and one-line `diffSummary`.
- User prompt source: `buildUserPrompt()` (`:L62-L72`): `files[{id,name,text}]` and `qaPairs[{questionText, selectedAnswer, subjectEntityName}]`. Documents untruncated.
- Dynamic context: all documents, Q&A transcript.
- Output and parse: `extractJsonArray`; match by file name; invalid scope becomes `paragraph_rewrite`; default summary.
- Retry and fallback: empty inputs short-circuit; `llmClient` retries; errors propagate as HTTP 500.
- Persistence and consumers: rewritten text into committed stage content; `intake_resolution_edits` rows (P).
- Risks and notes: large batches may exceed the output budget (UNKNOWN). Commit route not read in detail (E section 15).
- Evidence: WD-IMPL-AI-0032; E-AI-15; V4-AI-06; `streamlineReconciliationService.ts:45-105` (R2 section 4 corrected range).
### 2.2.9 WD-IMPL-AI-0033: Streamline reference image classification (vision)
- Purpose: Describe and classify an uploaded reference image.
- Ledger: V4-AI-09, V5-AI-07, E-AI-39. Flags Y/Y/Y/P/P. Related CAP-0118.
- Trigger and call site: `POST .../streamline/classify-image` (`routes/streamline.ts:256-308`), one request per image from `StreamlineImageReviewGrid.tsx:66-107` (`Promise.allSettled`). `imageAnalysisService.ts:classifyUploadedImage`.
- Provider and model: `@google/generative-ai`, `gemini-2.5-flash` hardcoded (`imageAnalysisService.ts:176`). Bypasses `llmClient` (no retry, no LangSmith).
- System prompt source: none (single user turn).
- User prompt source: JSON-only cataloguing prompt at `imageAnalysisService.ts:171-174` (V5-AI-07). Text not quoted in the reports.
- Dynamic context: image buffer and MIME type.
- Output and parse: first `{...}` by regex and `JSON.parse`; type coerced to `character`, `prop`, or `location`; confidence clamped, default 0.5.
- Retry and fallback: none in the service. The route maps any error to `Unnamed subject`, `character`, confidence 0 (`streamline.ts:290-297`).
- Persistence and consumers: image stored in `asset-images` under `project/{projectId}/streamline-staging/...` immediately, never cleaned up (V4 section 8). Name fuzzy-matched to known character-note names (`:25-48`, `:87`).
- Risks and notes: rejected uploads leave storage objects. Tested P (vision mocked in `streamlineClassifyImage.test.ts`).
- Evidence: WD-IMPL-AI-0033; E-AI-39; V4-AI-09; V5-AI-07; `imageAnalysisService.ts:170-200`.

## 2.3 Project assets (Stage 5, asset-level image prompts, location views)
### 2.3.1 WD-IMPL-AI-0004: Visual distillation of an extracted asset (Stage 5)
- Purpose: Distill an extracted entity into a Stage 5 visual description.
- Ledger: V2-AI-04, V5-AI-01, E-AI-23. Flags Y/Y/Y/Y/N. Related FACT-0026.
- Trigger and call site: Stage 5 extract-confirm, once per selected entity, sequentially. `projectAssets.ts:325` (`extractSelectedAssets`) and `assetExtractionService.ts:521-652`, `distillVisualSummary` (called at `:568-574`). Also called by the deprecated `extractAssets` (`:107-131`), reached from `POST /api/projects/:projectId/assets/extract` (`projectAssets.ts:44`, `:113`). The frontend has no caller of `projectAssetService.extractAssets` (grep), so that path is reachable over HTTP only.
- Provider and model: Gemini via `llmClient`. `GEMINI_MODEL` else `gemini-1.5-flash`. Temperature 0.4, max 2048.
- System prompt source: literal in `distillVisualSummary` (`:531-540`). Interpolates the style name in its rule text (V5-AI-01).
- User prompt source: literal (`:546-565`): `Asset: ${entity.name} (${entity.type})`, style context, scene mentions as placeholder text, JSON schema request. No script text (C11 CONFIRMED, R1a).
- Dynamic context: entity name and type; mention placeholder text and scene numbers; style: capsule `descriptor_strings` and `design_pillars`, else manual tone. `getStyleContext` at `:657-683`.
- Output and parse: fence strip, first brace-delimited object, `JSON.parse`, retry after trailing-comma removal. Reads `description`, `confidenceScore`, `isPriority`, `hasVisualConflicts`, `conflictDetails`.
- Retry and fallback: `llmClient` retries. Final failure: description is the mention texts joined by spaces, confidence 0.5 (V5-AI-01).
- Persistence and consumers: `project_assets.description` (`projectAssets.ts:126-135`). Confidence, priority, and conflicts are discarded.
- Risks and notes: style is baked into the saved text and not re-distilled on style change (V2-AI-04). Deprecated path reachable over HTTP.
- Evidence: WD-IMPL-AI-0004; E-AI-23; V5-AI-01; C11 (R1a); `assetExtractionService.ts:107-131`, `:521-652`.
### 2.3.2 WD-IMPL-AI-0005: Asset description merge (text)
- Purpose: Merge a global asset description with a project description (text).
- Ledger: V2-AI-05, V5-AI-02, E-AI-25. Flags Y/Y/Y/Y/N. Related CAP-0084.
- Trigger and call site: `POST /api/projects/:projectId/assets/merge-descriptions` (`projectAssets.ts:937`; MergeDialog AI Merge via `projectAssetService.ts:792`). Clone-from-global with `descriptionStrategy` merge (`projectAssets.ts:1891`). `assetDescriptionMerger.ts:mergeWithLLM` (`:43-87`).
- Provider and model: Gemini via `llmClient`, default model. Temperature and max not set in the ledger (defaults apply).
- System prompt source: literal in `mergeWithLLM` (`:48-59`).
- User prompt source: literal: global description as base, then project description additions (`:61-67`).
- Dynamic context: two description strings. No style, no script.
- Output and parse: trimmed text; no parse.
- Retry and fallback: `llmClient` retries. On error returns global text plus `Additional details:` plus project text (silent concatenation, V2-AI-05).
- Persistence and consumers: returned to client (merge-descriptions) or written to `project_assets.description` (clone path).
- Risks and notes: name collision with `ImageAnalysisService.mergeDescriptions` (2.3.5; E section 14 item 12).
- Evidence: WD-IMPL-AI-0005; E-AI-25; V5-AI-02; `assetDescriptionMerger.ts:43-88`.
### 2.3.3 WD-IMPL-AI-0034: Full-script entity extraction, pass 1 (DEAD)
- Purpose: Extract entity mentions from the full screenplay (no caller).
- Ledger: V5-AI-03, E-AI-24. Flags not recorded in merged entry (null). Reachable N, functional N (E-DEAD-01, R2 entry 15). Labels DEAD, LEGACY. Related DEAD-0015.
- Trigger and call site: none. Private `extractEntityMentions` (`assetExtractionService.ts:366-516`). Definition only (`grep -n "extractEntityMentions("` returns no caller, R1a C11).
- Provider and model: Gemini via `llmClient`. Temperature 0.3, max 16384 (`:395-396`).
- System prompt source: literal (`:367-377`), dedupe rules and JSON array of entities.
- User prompt source: literal (`:379-389`): `Analyze this screenplay ...` with the full master script.
- Dynamic context: full master script text (the only pass that sends script text).
- Output and parse: JSON array repair chain.
- Retry and fallback: throws `Failed to extract entities`.
- Persistence and consumers: none.
- Risks and notes: if revived, sends a full screenplay with 16384 max output tokens (E-AI-24 note). JSDoc marks it deprecated.
- Evidence: WD-IMPL-AI-0034; E-AI-24; V5-AI-03; `assetExtractionService.ts:366-516`.
### 2.3.4 WD-IMPL-AI-0035: Vision analysis of an uploaded asset image
- Purpose: Describe an uploaded asset image.
- Ledger: V5-AI-04, E-AI-36, V6-AI-07. Flags not recorded in merged entry (null). From V6-AI-07: present Y, reachable Y, functional Y, persisted N, tested N. Related CAP-0144, PROV-0002.
- Trigger and call site: `POST /api/projects/:projectId/assets/:assetId/analyze-image` (`projectAssets.ts:1380`), after upload (`Stage5Assets.tsx:438`). Stage 8 variant `POST .../instances/:instanceId/analyze-image` (`sceneAssets.ts:524-575`) uses the same service method for scene assets (V6 R7).
- Provider and model: `@google/generative-ai`, `gemini-2.5-flash` hardcoded (`imageAnalysisService.ts:54`). Constructor throws without `GOOGLE_AI_API_KEY` (`:24-30`).
- System prompt source: none (single user turn).
- User prompt source: `imageAnalysisService.ts:48-52` (E section 10, AI-36): `You are a visual description expert for film production. Analyze this image of a {assetType} named "{assetName}" and write a detailed visual description suitable for AI image generation.` Type focus from `TYPE_PROMPTS` (`:14-19`).
- Dynamic context: image bytes downloaded from URL, asset type, asset name.
- Output and parse: trimmed text. Confidence from length heuristic: 0.9, 0.7, or 0.5 (V5-AI-04).
- Retry and fallback: none. Route returns 500, UI shows a degraded toast.
- Persistence and consumers: none. Returned to the UI; the user decides in the modal.
- Risks and notes: image re-downloaded from its URL; no cost tracking.
- Evidence: WD-IMPL-AI-0035; E-AI-36; V5-AI-04; V6-AI-07; `imageAnalysisService.ts:14-60`.
### 2.3.5 WD-IMPL-AI-0036: Merge of extracted and existing description (vision follow-up)
- Purpose: Merge an existing asset description with a newly extracted one.
- Ledger: V5-AI-05, E-AI-37, V6-AI-08. Flags not recorded in merged entry (null). From V6-AI-08: present Y, reachable Y, functional Y, persisted N, tested N. Retired ids 0050 (mapped here). Related CAP-0144, 0145.
- Trigger and call site: analyze-image when an existing description is non-empty. `imageAnalysisService.ts:mergeDescriptions` (`:90`), prompt at `:96-104`.
- Provider and model: `gemini-2.5-flash` SDK, hardcoded. Second model call for the same request.
- System prompt source: none.
- User prompt source: `mergePrompt` quoting existing and extracted text (`:96-104`).
- Dynamic context: existing description, extracted description, asset type and name.
- Output and parse: trimmed text returned as `suggestedMerge`.
- Retry and fallback: none. Error propagates to the analyze route.
- Persistence and consumers: prefilled in the upload modal; written only on Accept.
- Risks and notes: name collision with 2.3.2 (different behavior).
- Evidence: WD-IMPL-AI-0036; E-AI-37; V5-AI-05; V6-AI-08; `imageAnalysisService.ts:90-110`.
### 2.3.6 WD-IMPL-AI-0037: Master asset image generation (generate, regenerate, clone base)
- Purpose: Generate a master asset image (generate, regenerate, clone base).
- Ledger: V5-AI-08. Flags not recorded in merged entry (null). Status from E-AI-41 and R2 entry 43: reachable, functional UNKNOWN (runtime), persisted, not directly tested (integration only). Related CAP-0143, PROV-0003.
- Trigger and call site: `generate-image` (`projectAssets.ts:1210`, `Stage5Assets.tsx:386`, `projectAssetService.ts:363`); clone-from-global regenerate (`projectAssets.ts:1756`, `AssetDrawer.tsx:269,287`, `AssetMatchModal.tsx:125,148`); Generate All. Job runs in `ImageGenerationService.executeJobInBackground` (`:298`). Prompt is built in the route and executed in the service (two locations, R2 section 4).
- Provider and model: NanoBananaClient, `gemini-2.5-flash-image` (`NanoBananaClient.ts:118-120`).
- System prompt source: none. Wrapper per 1.7 (`NanoBananaClient.ts:68-104`).
- User prompt source: `generate-image`: `asset.image_prompt` or `description` (`projectAssets.ts:1240`) plus isolation for character, prop, extra_archetype (`ImageGenerationService.ts:78-89`). Clone regenerate: `finalDescription` (`projectAssets.ts:1989`).
- Dynamic context: width and height from asset type (never sent to the model), style capsule text (`descriptor_strings`, `design_pillars`) or manual tone, capsule reference images with role `style`, global image as identity reference in clone path.
- Output and parse: artifact to buffer (base64, URL, or buffer).
- Retry and fallback: NanoBanana 3 retries for retryable classes; failure marks the job failed with `error_code`.
- Persistence and consumers: storage bucket `asset-images`; attempt row selected; `project_assets.image_key_url` updated; `style_outdated` set false on the master success path (`ImageGenerationService.ts:406-410`); job row completed.
- Risks and notes: idempotency key uses `Date.now()`. Style outdated flag not reset on upload or fallback path (V2 section 5).
- Evidence: WD-IMPL-AI-0037; V5-AI-08; E-AI-41; R2 entry 43; `projectAssets.ts:1210-1240`.
### 2.3.7 WD-IMPL-AI-0038: Asset edit, style, background, or regenerate prompt
- Purpose: Edit, restyle, or re-background an asset image.
- Ledger: V5-AI-09. Flags not recorded in merged entry (null). Status: reachable (`projectAssets.ts:1436`, EnhancedUploadModal), functional UNKNOWN, persisted, not tested. Related CAP-0145, INVALIDATE-0032.
- Trigger and call site: `POST /api/projects/:projectId/assets/:assetId/edit-image` (`projectAssets.ts:1436`). UI: Edit, Apply Style, Remove Background, Regenerate in the upload modal.
- Provider and model: NanoBanana, `gemini-2.5-flash-image`.
- System prompt source: none. Role wording from `NanoBananaClient.ts:88-101`.
- User prompt source: `projectAssets.ts:1490-1497`: `${editInstructions}. Context: ${description}` when instructions are given, otherwise the description. When `removeBackground` is set, the inline isolation sentence is appended (`:1494-1496`). `createImageJob` then runs with `jobType: master_asset` and `assetId` (`:1500-1510`), which appends the same sentence again for isolatable types (`ImageGenerationService.ts:131`).
- Dynamic context: single reference image (no role), style from asset, then Stage 5 capsule, then manual tone; description.
- Output and parse: artifact to buffer.
- Retry and fallback: as 2.3.6.
- Persistence and consumers: attempt row selected and `image_key_url` updated before the user accepts.
- Risks and notes: double isolation sentence when `removeBackground` is set on a character, prop, or extra_archetype (WD-IMPL-FACT-0078). No lock check on this route (C20 CONFIRMED, R1b).
- Evidence: WD-IMPL-AI-0038; V5-AI-09; `projectAssets.ts:1436-1510`; `ImageGenerationService.ts:124-131`.
### 2.3.8 WD-IMPL-AI-0039: Clone-from-global regeneration with global reference
- Purpose: Regenerate a project asset image from a global asset reference.
- Ledger: V5-AI-10. Flags not recorded in merged entry (null). From V5-AI-10: present Y, reachable Y, functional U, persisted P, tested N. Related CAP-0150.
- Trigger and call site: `POST /api/projects/:projectId/assets/clone-from-global` with `regenerateImage` true when the global asset has an image and a capsule (`projectAssets.ts:1756`). `createImageJob` (`ImageGenerationService.ts:124`).
- Provider and model: NanoBanana, `gemini-2.5-flash-image`.
- System prompt source: none.
- User prompt source: `projectAssets.ts:1984-1992`: the prompt equals `finalDescription` (merged, override, or global description) with no extra wording.
- Dynamic context: global image URL as identity reference; global style capsule ids.
- Output and parse: as 2.3.6.
- Retry and fallback: as 2.3.6. Route queues the job without awaiting the result and swallows errors (V5-AI-10).
- Persistence and consumers: job row; `project_assets.image_key_url` updated by job completion fallback; no attempt row guaranteed.
- Risks and notes: no idempotency key; no client poll (V5-AI-10).
- Evidence: WD-IMPL-AI-0039; V5-AI-10; `projectAssets.ts:1756-1992`.
### 2.3.9 WD-IMPL-AI-0040: Angle variant image prompt
- Purpose: Generate an angle variant image for a character asset.
- Ledger: V5-AI-11, E-AI-45. Flags not recorded in merged entry (null). From V5-AI-11: present Y, reachable Y, functional U, persisted Y, tested N. Related CAP-0157.
- Trigger and call site: `POST /api/projects/:projectId/assets/:assetId/angle-variants/generate` (`projectAssets.ts:2520`; `AngleVariantsDialog.tsx:114,151`). `ImageGenerationService.createAngleVariantJob` (`:259-272`).
- Provider and model: NanoBanana, `gemini-2.5-flash-image`. Dimensions 512x768 for character (V5-AI-11).
- System prompt source: none.
- User prompt source: `ImageGenerationService.ts:270-272`: `${angleInstruction} of ${asset.description}`, then isolation sentence (`:124-131`, `angle_variant` branch). Angle phrases (`:258-263`): `front-facing view, looking directly at the camera`; `side profile view, facing left, showing full silhouette`; `three-quarter angle view, slightly turned from the camera`; `rear view from behind, showing the back of the character`.
- Dynamic context: description, angle, capsule style or manual tone. No reference image.
- Output and parse: artifact; `asset_angle_variants.image_url`, `storage_path`, `status` completed, `prompt_snapshot` (V5-AI-11).
- Retry and fallback: as 2.3.6; failure sets the variant status to failed.
- Persistence and consumers: `asset_angle_variants` row; angle matching for Stage 9 prompts (`enrichAssetsWithAngleMatch`, V9 section 3.2).
- Risks and notes: `ANGLE_PROMPTS` is local to the function. Test coverage not recorded.
- Evidence: WD-IMPL-AI-0040; E-AI-45; V5-AI-11; `ImageGenerationService.ts:254-300`.
### 2.3.10 WD-IMPL-AI-0082: Location-view direction image prompt (deterministic)
- Purpose: Generate a location view image for a camera direction.
- Ledger: E-AI-46, V5-AI-12 (retired id 0041 mapped here). Flags Y/Y/Y/P/N. Labels NO-ASSET-ID-BY-DESIGN. Related CAP-0157 family, 0010, 0081.
- Trigger and call site: Stage 8 location coverage `generate-image`: `POST /api/projects/:projectId/assets/:assetId/location-views/:viewId/generate-image` (`projectAssets.ts:3298`), from `LocationCoveragePanel.tsx:234` via `projectAssetService.ts:1228`. Ledger callsite name `location-view-generate-image` does not exist as a symbol (R2 section 4).
- Provider and model: NanoBanana, `gemini-2.5-flash-image`. Job type `scene_asset`, no `assetId`, by design: the code comment says a master-job completion would otherwise overwrite `project_assets.image_key_url`.
- System prompt source: none.
- User prompt source: template in code (`projectAssets.ts:3393-3402`, R2 cites `3380-3405`): `${viewDesc}`, `Same {asset.name} seen from{alias} perspective,`, `{heightLabel} camera height, {distanceLabel} shot.`, `Maintain the same color palette, architectural details, materials, and lighting conditions as the reference.`, `Location description: {description}`.
- Dynamic context: `location_views` row (description, alias, camera height, camera distance), asset name and description, style reference (establishing view, primary view, or master image), capsule or manual tone.
- Output and parse: artifact. Dimensions 1024x576 (E-AI-46 note).
- Retry and fallback: as 2.3.6. Client poll timeout 60 s (V5-AI-12).
- Persistence and consumers: `image_generation_jobs.prompt`; `location_views.image_key_url` set by frontend poll (writer UNKNOWN exactly, ledger).
- Risks and notes: isolation not applied (job type `scene_asset`). Tested N.
- Evidence: WD-IMPL-AI-0082; E-AI-46; V5-AI-12; `projectAssets.ts:3298-3405`.

## 2.4 Scene assets and transformations (Stage 8)
### 2.4.1 WD-IMPL-AI-0024: Stage 8 infer from story (single asset)
- Purpose: Suggest an asset description and tags from story context.
- Ledger: V3-AI-12, E-AI-27, V6-AI-02 (retired ids 0044 mapped here). Flags Y/Y/P/N/P. Labels CONTRADICTED. Related FACT-0042, FACT-0043.
- Trigger and call site: `Infer from Story` (`VisualStateEditorPanel.tsx:370`, `sceneAssetService.inferContext`). `POST /api/projects/:projectId/scenes/:sceneId/assets/:instanceId/infer-context` (`sceneAssets.ts:2226`). Bulk path calls this per asset when more than four (`storyContextService.ts:209-211`). `storyContextService.ts:callInferenceLLM` (`:269-270`).
- Provider and model: Gemini via `llmClient`. Temperature 0.3, max 2048 (V3 section 8).
- System prompt source: literal in `callInferenceLLM`, beginning `visual continuity specialist` (V3 section 8, AI-12).
- User prompt source: `buildInferencePrompt` (`storyContextService.ts:374-415`): asset name, type, master description, effective description, tags; scene `script_excerpt`; all locked Stage 3 beats; treatment (first 2000 characters, always empty, C10); shot actions, dialogue, setting, characters.
- Dynamic context: asset fields, script excerpt, beats, shot list.
- Output and parse: regex object, then `JSON.parse`. Fields `suggested_description`, `suggested_tags`, `reasoning`. Throws on parse failure.
- Retry and fallback: `llmClient` 4 attempts. Error goes to HTTP 500 and a toast.
- Persistence and consumers: none. Suggestion only; UI PUT on accept (V6-AI-02).
- Risks and notes: treatment section is always empty because the lookup keys do not exist (C10 CONFIRMED, R1a; FACT-0042). The parser test copies the logic locally and does not import the service (V3-AI-12).
- Evidence: WD-IMPL-AI-0024; E-AI-27; V3-AI-12; V6-AI-02; `storyContextService.ts:269-415`.
### 2.4.2 WD-IMPL-AI-0025: Stage 8 bulk context update (up to four assets in one call)
- Purpose: Suggest context updates for up to four scene assets in one call.
- Ledger: V3-AI-13, E-AI-28, V6-AI-03 (retired ids 0045 mapped here). Flags Y/Y/P/N/N. Related 0024.
- Trigger and call site: `Bulk Update from Context`. `POST /api/projects/:projectId/scenes/:sceneId/bulk-infer-context` (`sceneAssets.ts:2274`) for four or fewer assets (`Stage8VisualDefinition.tsx:547`). `storyContextService.ts:callBulkInferenceLLM` (`:282`, prompt `:296-336`).
- Provider and model: Gemini via `llmClient`. Temperature 0.3, max 4096.
- System prompt source: literal in `callBulkInferenceLLM` (`:296-336`).
- User prompt source: literal batch template over up to 50 instance ids (V6-AI-03).
- Dynamic context: script excerpt, beats, treatment (empty), shot actions, and per asset: name, type, instance id, master description, current description, tags.
- Output and parse: regex JSON with a `results` array keyed by `instanceId`. Throws if not an array. Missing ids yield an empty suggestion.
- Retry and fallback: batched path has no fallback. The parallel path (more than four) records per-asset errors in `reasoning`.
- Persistence and consumers: none. UI PUT on apply.
- Risks and notes: batched mapping depends on the model echoing `instanceId` (V6-AI-03). Treatment section empty (C10).
- Evidence: WD-IMPL-AI-0025; E-AI-28; V3-AI-13; V6-AI-03; `storyContextService.ts:282-336`.
### 2.4.3 WD-IMPL-AI-0075: Stage 8 AI relevance detection
- Purpose: Detect which locked master assets appear in a scene.
- Ledger: E-AI-26, V6-AI-01 (retired id 0043 mapped here). Flags Y/Y/Y/N/N. Related 0024 and WD-IMPL-FACT-0195 (the ledger related field names FACT-0195, which concerns prompt-template writability; the link looks wrong and is not used).
- Trigger and call site: Stage 8 `detect assets` when deterministic population matched zero (`Stage8VisualDefinition.tsx:469`, `:508`). `POST /api/projects/:projectId/scenes/:sceneId/assets/detect-relevance` (`sceneAssets.ts:122`). `sceneAssetRelevanceService.ts:detectRelevantAssets`.
- Provider and model: Gemini via `llmClient`. Temperature 0.3, max 4096.
- System prompt source: literal at `sceneAssetRelevanceService.ts:144-146`: `You are an asset continuity manager. Respond with valid JSON only, no markdown or extra text.`
- User prompt source: `buildRelevancePrompt` (`:159-230`): `You are an asset continuity manager. Determine which existing Master Assets ...`, `CRITICAL: You may ONLY reference project_asset_id values ...`, then current scene, shot list, last known state per asset, available project assets, relevance rules, JSON-only output.
- Dynamic context: scene number, script excerpt, shots (id, characters, setting, action), last known state per asset from earlier scenes (transformation-aware), locked project assets (id, name, type, description).
- Output and parse: greedy object regex, then `JSON.parse`. `relevant_assets` filtered to locked ids. `new_assets_required` is advisory and not persisted.
- Retry and fallback: `llmClient` 4 attempts. Parse failure throws and the route returns HTTP 500.
- Persistence and consumers: none in the service. UI calls `createSceneAssetInstance` for each relevant asset (`Stage8VisualDefinition.tsx:508-515`).
- Risks and notes: no test (ledger tested N). Only locked branch assets are offered (`eq locked true`).
- Evidence: WD-IMPL-AI-0075; E-AI-26; V6-AI-01; `sceneAssetRelevanceService.ts:144-230`.
### 2.4.4 WD-IMPL-AI-0076: Transformation post description
- Purpose: Write a post-transformation visual description.
- Ledger: E-AI-29, V6-AI-04 (retired id 0046 mapped here). Flags Y/Y/Y/Y/N. Related 0077.
- Trigger and call site: `Generate with AI` on an unconfirmed transformation card (`VisualStateEditorPanel.tsx:194`). `POST .../transformation-events/:eventId/generate-post-description` (`sceneAssets.ts:1901`). `transformationEventService.ts:generatePostDescription` (`:124`).
- Provider and model: Gemini via `llmClient`, default model and temperature.
- System prompt source: literal at `transformationEventService.ts:354`: `You are a visual description writer for an AI film pipeline. Given a character/asset's appearance BEFORE a transformation and what happens during the transformation, write a concise post-transformation visual description. Output ONLY the description text (one paragraph, max 500 chars). No JSON, no headers.`
- User prompt source: literal (`:355-359`): `Asset: {name} Before: {pre} Transformation: {narrative} Scene context: {script_excerpt} Write the post-transformation visual description ...`
- Dynamic context: asset name, pre description, transformation narrative, scene `script_excerpt` (not truncated in this function).
- Output and parse: trim, then substring to 500 characters. No JSON.
- Retry and fallback: `llmClient` 4 attempts. Error goes to HTTP 500.
- Persistence and consumers: `transformation_events.post_description` (`transformationEventService.ts:~370-375`). Consumers: post-image prompt (2.4.8).
- Risks and notes: the card textarea is not synced to the persisted value (V6-AI-04). Output is cut at 500 characters.
- Evidence: WD-IMPL-AI-0076; E-AI-29; V6-AI-04; `transformationEventService.ts:124-180`, `:354-360`.
### 2.4.5 WD-IMPL-AI-0077: Transformation prefill (post description, narrative, inferred trigger and type)
- Purpose: Prefill a transformation's post description, narrative, and trigger.
- Ledger: E-AI-30, V6-AI-05 (retired id 0047 mapped here). Flags Y/Y/Y/N/Y. Related 0076, WD-IMPL-FACT-0183.
- Trigger and call site: trigger shot or type change in `AddTransformationDialog.tsx:174`, and in `ConvertToTransformationDialog.tsx:93`. `POST .../transformation-events/generate-prefill` (`sceneAssets.ts:1916`). `transformationEventService.ts:generateTransformationPrefill` (`:150`).
- Provider and model: Gemini via `llmClient`, default.
- System prompt source: literal at `transformationEventService.ts:473-477`: `... infer and write: 1. ... 2. ... Output ONLY valid JSON: { "post_description": "...", "transformation_narrative": "..." } No extra text, no markdown fences.`
- User prompt source: literal (`:480-488`): asset name, current appearance (before), transformation type label, trigger shot action, dialogue, setting, camera, characters, scene excerpt (800 characters), absorbed asset description when present, `Based on this context ...`.
- Dynamic context: trigger shot fields, asset effective description, scene excerpt, absorbed instance description. The trigger is inferred deterministically: the first assigned shot of the absorbed instance (E-AI-30 note).
- Output and parse: fence strip, `JSON.parse`. On failure the whole raw text becomes `post_description` with an empty narrative. Each field capped at 500 characters.
- Retry and fallback: `llmClient` 4 attempts. No parse retry.
- Persistence and consumers: none in the service. The dialog saves the event only on confirm (exact path UNKNOWN).
- Risks and notes: raw-text fallback can fill `post_description` with non-JSON text. Test `transformationPrefill.test.ts` has 5 tests including fenced JSON.
- Evidence: WD-IMPL-AI-0077; E-AI-30; V6-AI-05; `transformationEventService.ts:150-200`, `:473-488`.
### 2.4.6 WD-IMPL-AI-0048: Scene asset and transformation image generation (image model)
- Purpose: Generate an image for a scene asset instance or transformation.
- Ledger: V6-AI-06. No retired ids. Flags Y/Y/Y/Y/N. Labels DUPLICATED. Related CAP-0175, CAP-0188.
- Trigger and call site: Generate Image (single and bulk) for a scene asset instance. `POST .../assets/:instanceId/generate-image` (`sceneAssets.ts:350`), then `createSceneAssetImageJob` (`sceneAssets.ts:385`, `ImageGenerationService.ts:193-240`). Bulk: `Stage8VisualDefinition.tsx:601`, `:642`.
- Provider and model: NanoBanana, `gemini-2.5-flash-image`.
- System prompt source: none.
- User prompt source: `ImageGenerationService.ts:219-226`: `${effective_description}. Visual modifiers: ${tags}.` when `status_tags` are present, else `effective_description`. Then `injectBackgroundContext(…, 'scene_asset')` (`:226`) for character, prop, extra_archetype.
- Dynamic context: effective description, status tags, asset type, reference image priority (client, selected master reference, project image), capsule or manual tone.
- Output and parse: artifact to buffer, storage upload, public URL.
- Retry and fallback: job failed state with `failure_stage`. No job-level retry (NanoBanana-level retry only).
- Persistence and consumers: `asset-images`; generation attempts; `scene_asset_instances.image_key_url`. Transformation jobs write `transformation_events.post_image_key_url` instead.
- Risks and notes: `postProcessBackground` is a no-op (`ImageGenerationService.ts:96-103`). Transformation post jobs do not use this path (2.4.8).
- Evidence: WD-IMPL-AI-0048; V6-AI-06; `ImageGenerationService.ts:193-240`.
### 2.4.7 WD-IMPL-AI-0051: Scene asset edit-image prompt
- Purpose: Edit a scene asset image (upload modal actions).
- Ledger: V6-AI-09. Flags Y/Y/Y/Y/Y. Labels DUPLICATED. Related CAP-0182, FACT-0078.
- Trigger and call site: `POST .../assets/:instanceId/edit-image` (`sceneAssets.ts:408`). Upload modal actions in `VisualStateEditorPanel.tsx:823-836`.
- Provider and model: NanoBanana, `gemini-2.5-flash-image`.
- System prompt source: none.
- User prompt source: `sceneAssets.ts:468-481`: `${editInstructions}. Context: ${description}` (or the description alone). Isolation sentence appended when `removeBackground` is set (`:474`), or when the asset type is character, prop, or extra_archetype and `removeBackground` is not set (`:477-481`). The job uses `jobType: scene_asset` (`:483-496`), so `createImageJob` adds no second sentence.
- Dynamic context: client description, edit instructions, reference image URL, `removeBackground`, asset type from the database, Stage 5 style.
- Output and parse: artifact to storage through the job.
- Retry and fallback: job failed state, no retry.
- Persistence and consumers: `asset-images`; attempt row with status generated; instance `image_key_url`.
- Risks and notes: isolation and dimension logic duplicate `ImageGenerationService` (FACT-0078). Test checks the client request body only (V6-AI-09), ledger T=Y.
- Evidence: WD-IMPL-AI-0051; V6-AI-09; `sceneAssets.ts:408-500`.
### 2.4.8 WD-IMPL-AI-0084: Transformation post-image prompt (correction applied)
- Purpose: Generate the post-transformation image.
- Ledger: E-AI-48, V6-AI-10 (retired id 0052 mapped here; the retired alternate view says no isolation is applied, which the correction confirms). Flags Y/Y/Y/Y/N. Labels CONTRADICTED. Correction: CONTRADICTED by R2.
- Trigger and call site: `Generate Image` on a confirmed transformation card (`VisualStateEditorPanel.tsx:206`). `POST .../transformation-events/:eventId/generate-post-image` (`sceneAssets.ts:1944-2046`), prompt built at `:2014-2016`, job created through `createImageJob` with `jobType: transformation_post` and `transformationEventId` (`transformationEventService.ts:165`).
- Provider and model: NanoBanana, `gemini-2.5-flash-image`.
- System prompt source: none.
- User prompt source: `${post_description}. Visual modifiers: ${post_status_tags.join(', ')}.` (`sceneAssets.ts:2014-2016`). No isolation sentence is added. Evidence: `createImageJob` injects only for `master_asset` and `angle_variant` (`ImageGenerationService.ts:124-131`). `injectBackgroundContext` (`:78-89`) lists `transformation_post` in its allow-list (`:83`), but none of its three callers passes that job type (`:131`, `:226`, `:749`). The ledger's claim that createImageJob adds the sentence (citing `:L226-L227`) is incorrect: `:226` belongs to `createSceneAssetImageJob` and injects only for `scene_asset` (R2 section 5).
- Dynamic context: `post_description` (LLM-authored in 2.4.4 or user-edited), `post_status_tags` (not populated by the UI, V6-AI-10), asset type, reference image (user supplied, else instance image, else project image). Dimensions: location 1024x576, prop 512x512, otherwise 512x768 (E-AI-48 note).
- Output and parse: artifact to storage.
- Retry and fallback: as 2.4.6.
- Persistence and consumers: `image_generation_jobs.prompt`; on completion `transformation_events.post_image_key_url` (`ImageGenerationService.ts:429-440`).
- Risks and notes: tested N. Modifiers are normally absent because tags are never set.
- Evidence: WD-IMPL-AI-0084; E-AI-48; V6-AI-10; R2 section 5; `ImageGenerationService.ts:78-89`, `:124-131`, `:429-440`.

## 2.5 Shots (Stage 7)
### 2.5.1 WD-IMPL-AI-0071: Stage 7 shot extraction from scene script (primary prompt)
- Purpose: Extract the shot list for a scene.
- Ledger: E-AI-18, V8-AI-01. Retired id 0055 mapped here. V8-AI-02 (retry prompt) is still listed in this entry sources, see 2.5.2 and corrections. Flags Y/Y/Y/Y/Y. Labels DUPLICATED. Related 0072, 0073, 0074, FACT-0202, PROV-0016.
- Trigger and call site: `POST /api/projects/:id/scenes/:sceneId/shots/extract` (`routes/projects.ts:1711`). Auto-triggered by `Stage7ShotList.tsx:178` when no shots exist for the scene. `shotExtractionService.ts:extractShots` (`:208-330`).
- Provider and model: Gemini via `llmClient`. `request.model || GEMINI_MODEL || gemini-1.5-flash`. Temperature 0.3, max 4096 (V8-AI-01).
- System prompt source: inline template at `shotExtractionService.ts:208-286`. Opens: `You are a technical shot breakdown specialist for an AI video generation pipeline.` (E section 10, AI-18). Contains global context (`buildGlobalContextSection`, `:116-127`), current scene, previous scene end state (`buildPreviousSceneSection`, `:154-159`), camera direction sections (`buildCameraDirectionsSection`, `:129-145`, or `buildNoDirectionsSection`, `:147-152`), breakdown rules, and at `:262`: `OUTPUT: Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):`.
- User prompt source: `shotExtractionService.ts:288-293`: `Extract the shot list ...` with scene content and shot-count instruction.
- Dynamic context: scene `script_excerpt`, `scene_number`, `sceneId`, prior scene `end_state_summary`, locked Stage 3 beat summary, locked Stage 4 summary (INT and EXT lines), `location_views` for the expected location (route at `projects.ts:1716-1830`; global context at `:1741-1788`).
- Output and parse: `parseResponse` (`:461-470`): fence regex, `JSON.parse`. Per shot `validateShot` (`:178-188`). Camera fallback `parseCameraMetadata` (`promptGenerationService.ts:169`). Shot ids regenerated by `generateShotId` (`:105-114`). Transformation flags filtered. New directions taken from `new_directions` and from camera names not already present.
- Retry and fallback: malformed JSON triggers one retry (2.5.2). A 20 s race (`:97`, `:297-305`) returns an empty success (HTTP 200, zero shots, FACT-0202). `RATE_LIMIT` is rethrown and the route returns 429 (`projects.ts:~1966`). `llmClient` retries inside the race.
- Persistence and consumers: `shots` insert (`projects.ts:~1870-1890`); `location_views` rows for new directions (`source` `stage7_inferred`); `location_match_events` per shot (`projects.ts:1832-1969`). `transformation_flags` is written but not read (C18 partly confirmed, R1b). Consumers: Stage 7 list, Stage 8 and 9 prompts, Stage 10 frames.
- Risks and notes: silent empty success on timeout. No schema library validation (FACT-0203). Shot rows are not versioned.
- Evidence: WD-IMPL-AI-0071; E-AI-18; V8-AI-01; R1b C18; `shotExtractionService.ts:97-330`, `:461-470`, `routes/projects.ts:1711-1969`.
### 2.5.2 WD-IMPL-AI-0072: Stage 7 shot extraction, malformed-JSON retry prompt
- Purpose: Retry shot extraction once after malformed JSON.
- Ledger: E-AI-19 (V8-AI-02 is listed under 0071 in the merged ledger; R2 judgment (e) assigns it here, see corrections). Flags Y/Y/Y/Y/N. Related 0071.
- Trigger and call site: parse failure of the primary response only (`shotExtractionService.ts:313-328`, `extractShots#retry`). `extractWithLLM` (`:449-459`).
- Provider and model: Gemini via `llmClient`. Temperature 0.3, max 4096 (inherited).
- System prompt source: literal at `shotExtractionService.ts:320`: `You extract a shot list from screenplay text. Return ONLY valid JSON: {"new_directions":[],"shots":[...]}. Each shot needs non-empty action, setting, camera.` (E section 10, AI-19).
- User prompt source: same user prompt as 2.5.1 (`:288-293`, `:321`).
- Dynamic context: scene content and scene number only. No global context, no directions, no prior-scene context.
- Output and parse: `parseResponse` again. On failure returns `{shots: [], newDirections: []}` with a console error. The UI then throws `Shot extraction returned no shots` (V8-AI-02).
- Retry and fallback: no further retry. Runs after the 20 s race has resolved, so no separate timeout.
- Persistence and consumers: through 2.5.1's insert when parsing succeeds.
- Risks and notes: reachable only on parse failure (V8-AI-02, reachable P). Ledger tested N: no retry-path test in `shotExtraction.test.ts`.
- Evidence: WD-IMPL-AI-0072; E-AI-19; V8-AI-02; `shotExtractionService.ts:313-328`, `:449-459`.
### 2.5.3 WD-IMPL-AI-0073: Stage 7 and Stage 9 shot split into two or three
- Purpose: Split one shot into two or three shots.
- Ledger: E-AI-20, V8-AI-03 (retired id 0056 mapped here). Flags Y/Y/Y/Y/Y. Related 0071, 0074.
- Trigger and call site: `POST /api/projects/:id/scenes/:sceneId/shots/:shotId/split` (`routes/projects.ts:2515`). Stage 7 Split dialog (`Stage7ShotList.tsx:416`). Stage 9 ShotAssetPanel split confirm (`Stage9/ShotAssetPanel.tsx:83`, no guidance, count 2). `shotService.ts:272`. `shotSplitService.ts:splitShot`.
- Provider and model: Gemini via `llmClient`, defaults.
- System prompt source: template at `shotSplitService.ts:127-140`: `You are a shot segmentation specialist. Your role is to divide a single shot into N new shots ... ORIGINAL SHOT CONTEXT: {originalJson} SPLIT REQUIREMENTS ... OUTPUT: Return ONLY a valid JSON object ...` (E-AI-20 excerpt).
- User prompt source: `shotSplitService.ts:146-150`: `Split the shot into N parts according to this guidance: {userGuidance}` when guidance is given, otherwise `... at natural action or dialogue breaks ...`.
- Dynamic context: original shot fields (`shot_id`, `duration`, `dialogue`, `action`, `characters`, `setting`, `camera`, `continuity_flags`), split count (route coerces any value other than 3 to 2), optional guidance.
- Output and parse: fence strip, `JSON.parse`. Requires `new_shots` with at least N entries (slice to N). `toShotForInsert` maps characters to foreground and background. Duration overwritten with the original. Ids `{orig}-1..N`. `beat_reference` null. Errors: `Failed to parse shot split response`, `Shot split response must contain exactly N shots`. Route maps messages containing `parse` or `split` to HTTP 422.
- Retry and fallback: `llmClient` retries only. No parse retry. No timeout race.
- Persistence and consumers: route deletes the original shot, shifts `shot_order`, inserts N shots, clones `shot_asset_assignments` to each, and runs `invalidateStage9AndDownstream` (`projects.ts:2544-2640`, `10-VERSIONING-LOCKING-AND-INVALIDATION.md`).
- Risks and notes: the original row is deleted before insert, so an insert failure loses the shot (V8-AI-03). Duration stretch semantics (`shotSplitService.ts` ~165-170). Ledger tested Y (split test at `shotExtraction.test.ts:189-250`).
- Evidence: WD-IMPL-AI-0073; E-AI-20; V8-AI-03; `shotSplitService.ts:127-170`; `routes/projects.ts:2515-2655`.
### 2.5.4 WD-IMPL-AI-0074: Stage 7 shot merge of two consecutive shots
- Purpose: Merge two consecutive shots into one.
- Ledger: E-AI-21, V8-AI-04 (retired id 0057 mapped here). Flags Y/Y/Y/Y/N. Related 0073.
- Trigger and call site: `POST /api/projects/:id/scenes/:sceneId/shots/:shotId/merge` (`routes/projects.ts:2657`). Stage 7 Merge button (`Stage7ShotList.tsx:524`). `shotService.ts:310`. `shotMergeService.ts:mergeShots`.
- Provider and model: Gemini via `llmClient`, defaults.
- System prompt source: template at `shotMergeService.ts:109-131`: `You are a shot consolidation specialist. Your role is to merge two consecutive shots into one coherent shot without inventing new narrative content. TWO SHOTS TO MERGE: {shotsJson} ... OUTPUT: Return ONLY a valid JSON object (no markdown) ...`
- User prompt source: `shotMergeService.ts:132-135`: `Merge the two shots according to this guidance ...` or `Merge the two shots into one coherent shot. Return ONLY the JSON object.`
- Dynamic context: both shots as JSON in shot order, computed duration sum, optional guidance. The UI sends only a direction, not guidance (V8-AI-04).
- Output and parse: fence strip, `JSON.parse`. `action`, `setting`, `camera` required (throws `Shot merge response missing required fields`). Characters mapped. Duration is the sum. Id `{first}-M`. `beat_reference` copied from the first shot. Route maps parse and merge errors to HTTP 422.
- Retry and fallback: `llmClient` retries only.
- Persistence and consumers: deletes both shots, inserts the merged row at the lower `shot_order`, shifts later shots by minus one, records a location match event (`projects.ts:2704-2780`).
- Risks and notes: ledger tested N (no `ShotMergeService` test). Merged shot does not carry `camera_*` fields or assignments (V8-AI-04).
- Evidence: WD-IMPL-AI-0074; E-AI-21; V8-AI-04; `shotMergeService.ts:109-135`.

## 2.6 Prompts (Stage 9 and Stage 10 text generation)

All five calls in this group go through `PromptGenerationService.callLLM` (`promptGenerationService.ts:1456-1475`): `llmClient.generate` with temperature 0.7, max tokens 1024, metadata `{operation, stage: 9}`, raced against `PROMPT_GENERATION_TIMEOUT_MS` = 30000 (`:143`). The race does not abort the request and the timer is not cleared (V9 section 3.4). Operation keys: `frame_prompt`, `video_prompt`, `end_frame_prompt`, `continuity_frame_prompt`, `frame_prompt_correction`. Output goes through `cleanPromptOutput` (`:1480-1508`, 1.5). Retries inherit `llmClient` (3 retries, 1 s base, 10 s cap).
### 2.6.1 WD-IMPL-AI-0006: Stage 9 start frame prompt
- Purpose: Write the start frame prompt for a shot.
- Ledger: V2-AI-06, E-AI-31, V9-AI-01 (retired id 0058 mapped here). Flags Y/Y/P/Y/N. Labels CONTRADICTED (style context is always the no-capsule text, see 1.6). Related CAP-0073, FACT-0019, FACT-0027.
- Trigger and call site: Stage 9 generate-prompts: `POST /api/projects/:id/scenes/:sceneId/generate-prompts` (`projects.ts:3573`); `Stage9PromptSegmentation.tsx`; `promptService.ts:107`. Sequential per shot in `generateBulkPromptSets` (`promptGenerationService.ts:1048-1121`), then `generatePromptSet` (`:883-966`) calls this first (`generateFramePrompt`, `:1128-1190`).
- Provider and model: Gemini via `llmClient`. Settings per 2.6 intro.
- System prompt source: inline at `promptGenerationService.ts:1135-1171`. Opens: `You are a visual prompt engineer for AI image generation (starting frames for Veo 3.1 video pipeline). YOUR TASK: Generate a single dense paragraph describing a FROZEN VISUAL SNAPSHOT - the starting frame of a shot. This is a PHOTOGRAPH, not a video.` Five-part formula: camera position and framing, subject appearance, spatial placement and pose, environment and props, lighting, color, and style. Rule: `max 1200 characters`. Appends `ASSET DESCRIPTIONS:` plus asset context and style context, then an optional image manifest and continuity context (`match`: pixel-identical copy of previous end frame; `camera_change`: a separate recomposition prompt follows).
- User prompt source: `promptGenerationService.ts:1174-1186`: `Generate a STARTING FRAME prompt for this shot:`, then shot id and duration, `Action context (for understanding the moment, NOT for inclusion):`, setting, camera (`extract STATIC position`), foreground and background characters, continuity notes, camera split guidance, `Output ONLY the prompt text.`
- Dynamic context: shot fields, asset context (CHARACTERS, LOCATIONS, PROPS), style context (always `No visual style capsule applied.`, `promptGenerationService.ts:762`), image manifest (`buildFrameReferenceManifests` or `buildNumberedImageManifest`), continuity mode from `determineContinuityLink` (`:1014-1041`).
- Output and parse: `cleanPromptOutput` (1200 limit).
- Retry and fallback: `llmClient` 3 retries; 30 s race. Per-shot failure is recorded in results; other shots continue.
- Persistence and consumers: `shots.frame_prompt` UPDATE (`projects.ts:3840-3891`). `text_field_versions` row with source `ai_generation` (`textFieldVersionService.createVersion`, V9 section 3.5). Consumers: Stage 10 start frame jobs.
- Risks and notes: prompt text is inline, not in `prompt_templates` (V9 section 3.3). Ledger tested N.
- Evidence: WD-IMPL-AI-0006; E-AI-31; V9-AI-01; V9 sections 3.1 to 3.5; `promptGenerationService.ts:762`, `:1128-1190`.
### 2.6.2 WD-IMPL-AI-0007: End frame prompt
- Purpose: Write the end frame prompt for a shot.
- Ledger: V2-AI-07, E-AI-33, V9-AI-03 (retired id 0060 mapped here). Flags Y/Y/P/Y/N. Labels CONTRADICTED (style context always no-capsule text). Related CAP-0073, 0083.
- Trigger and call site: `POST /api/projects/:projectId/scenes/:sceneId/shots/:shotId/generate-end-frame-prompt` (`routes/frames.ts:519`; `frameService.ts:268`; `Stage10FrameGeneration.tsx`). `promptGenerationService.ts:generateEndFramePrompt` (`:1291-1349`).
- Provider and model: Gemini via `llmClient`, same settings as 2.6.1.
- System prompt source: inline at `promptGenerationService.ts:1307-1331`. Describes the END frame: `Same camera position, same characters - only their poses, expressions, and positions have changed ...`. Transformation rule default `- Same characters, same clothing, same environment`. For a transforming asset: `TRANSFORMATION: X has TRANSFORMED ... END frame must show: <post>`.
- User prompt source: inline at `:1333-1349`: `START FRAME (the "before" state):` followed by the start frame prompt, and an optional continuity note when the next shot's `start_continuity` is `match`.
- Dynamic context: shot fields, start frame prompt, enriched assets (unscoped, V9-AI-03), transformation overrides, next-shot continuity. Style context is taken from `projects.visual_style_capsule_id`, which is never written (V9-AI-03).
- Output and parse: `cleanPromptOutput` (1200 limit).
- Retry and fallback: as 2.6.1.
- Persistence and consumers: `shots.end_frame_prompt` plus `text_field_versions` (`ai_generation`, V9-AI-03). Consumers: end frame image job (2.7.6 fallback applies only when this is empty).
- Risks and notes: ledger tested N. Route-level style read at `frames.ts:567-576` (always null, V2-AI-07).
- Evidence: WD-IMPL-AI-0007; E-AI-33; V9-AI-03; `promptGenerationService.ts:1291-1349`; `routes/frames.ts:519-590`.
### 2.6.3 WD-IMPL-AI-0008: Continuity recomposition prompt (with or without vision analysis)
- Purpose: Write a camera-recomposition continuity prompt for a shot.
- Ledger: V2-AI-08, V7-AI-01, V7-AI-02, E-AI-34, V9-AI-04 (retired ids 0053 and 0061 mapped here; 0053 is the camera-change variant with vision analysis, V7-AI-02). Flags Y/Y/P/Y/N. Labels CONTRADICTED (style text always null). Related 0054, 0012.
- Trigger and call site: `POST .../shots/:shotId/generate-continuity-prompt` (`routes/frames.ts:2148`; `promptService.ts:165`; Stage 9 and 10). Camera-change path: `frameGenerationService.ts:generateWithCameraChangeAnalysis` (`:720-800`, call at `:796`), reached from `generateFrames` (`:431`) and `regenerateFrame` (`:1176`) when the start continuity is `camera_change` and a reference frame exists.
- Provider and model: Gemini via `llmClient`, same settings as 2.6.1.
- System prompt source: inline at `promptGenerationService.ts:1376-1416`. Includes `WHAT MUST BE PRESERVED FROM THE REFERENCE`, an optional `REFERENCE FRAME ANALYSIS (from vision analysis of the reference image ...)` block (`:1389-1395`), and `Camera position: from {prev.shotType} {prev.angle} to {curr.shotType} {curr.angle}` (V9 section 3.3).
- User prompt source: inline at `:1418-1428`: shot and previous shot data, enriched scene assets (`loadSceneAssetsForContinuity`), style text.
- Dynamic context: shot camera, action, setting, characters; previous shot; all scene asset descriptions; style (null on the route path); vision analysis text when on the camera-change path (2.7.3).
- Output and parse: `cleanPromptOutput` (1200 limit).
- Retry and fallback: the route rejects shot index 0 with HTTP 400 (V7-AI-01). On the camera-change path, a failure of 2.7.3 throws out of `generateWithCameraChangeAnalysis` with no fallback (V7-AI-02).
- Persistence and consumers: `shots.continuity_frame_prompt` (`frames.ts:2225-2240`; `frameGenerationService.ts:821-827`). On the camera-change path the reference URL inside the continuity entry is overwritten (`:829-839`), and the prompt is copied to `frames.prompt_snapshot` by `startFrameGeneration`.
- Risks and notes: the prompt text says the reference is the previous shot end frame, but this call sends no image (V7-AI-01). A single-shot regenerate sets `previousShot` null and forces `start_continuity` to `none` (V9 section 3.6). Ledger tested N.
- Evidence: WD-IMPL-AI-0008; E-AI-34; V7-AI-01; V7-AI-02; V9-AI-04; `promptGenerationService.ts:1376-1428`; `frameGenerationService.ts:720-840`.
### 2.6.4 WD-IMPL-AI-0009: Video prompt
- Purpose: Write the video prompt for a shot.
- Ledger: V2-AI-09, E-AI-32, V9-AI-02 (retired id 0059 mapped here). Flags Y/Y/Y/Y/N (V9-AI-02 records functional U, needs a live LLM call). Related 0006.
- Trigger and call site: Stage 9 generate-prompts, after the frame prompt for each shot (`generatePromptSet`, `promptGenerationService.ts:1200-1260`, `generateVideoPrompt` at `:1200`).
- Provider and model: Gemini via `llmClient`, same settings as 2.6.1. `cleanPromptOutput` limit 500.
- System prompt source: inline at `promptGenerationService.ts:1207-1225`. Opens: `You are a video prompt engineer for Veo 3.1 frame-to-video generation. THE STARTING FRAME ALREADY ENCODES ALL VISUAL TRUTH. Do NOT describe what anyone looks like ...` (E section 10, AI-32). Four-part formula: camera movement, action or performance, dialogue, sound design. `Keep it lean - max 500 characters`.
- User prompt source: inline at `:1245-1256`: shot id and duration, action, camera (movement only), dialogue, characters, plus `TRANSFORMATION EVENT:` blocks with `OVERRIDE: Describe this visual transformation as it happens.` and `TEMPORAL PRESENCE NOTES:` from `buildPresenceVideoContext` (`:971-998`).
- Dynamic context: shot action, camera movement, dialogue, characters, transforming assets, presence context. The `framePrompt` argument is accepted but not interpolated (V9-AI-02).
- Output and parse: `cleanPromptOutput` (500 limit).
- Retry and fallback: as 2.6.1.
- Persistence and consumers: `shots.video_prompt` (`projects.ts:3840-3891`). Copied into `video_generation_jobs.video_prompt_snapshot` at render confirm; consumed by Veo (2.8.1) and mock (2.8.2).
- Risks and notes: the video prompt is generated without the frame prompt text. Ledger tested N.
- Evidence: WD-IMPL-AI-0009; E-AI-32; V9-AI-02; `promptGenerationService.ts:1200-1260`.
### 2.6.5 WD-IMPL-AI-0078: Frame prompt surgical correction
- Purpose: Apply a user correction to an existing frame prompt.
- Ledger: E-AI-35, V9-AI-05 (retired id 0062 mapped here). Flags Y/Y/Y/Y/Y per ledger, with a note that no test covers this handler (`tested` UNKNOWN for this handler). Labels NO-VERSION-RECORD. Related 0006, 0007, FACT-0183.
- Trigger and call site: Stage 10 `regenerate-with-correction`: `POST /api/projects/:projectId/scenes/:sceneId/frames/:frameId/regenerate-with-correction` (`routes/frames.ts:708`; `frameService.ts:324`; `Stage10FrameGeneration.tsx:408`). `promptGenerationService.ts:applyFramePromptCorrection` (`:1440-1450`).
- Provider and model: Gemini via `llmClient`. Temperature 0.7 (no override for a surgical edit, E-AI-35), max 1024.
- System prompt source: inline at `promptGenerationService.ts:1445`: `You are editing an image generation prompt. Apply the user's correction surgically - change only what they asked for, keep everything else identical. Return ONLY the revised prompt, no explanation.`
- User prompt source: inline at `:1447`: `Current prompt:\n{currentPrompt}\n\nCorrection:\n{correction}`.
- Dynamic context: current prompt (`shot.end_frame_prompt` or `frame_prompt`), correction text.
- Output and parse: `cleanPromptOutput` (1200 limit).
- Retry and fallback: `llmClient` retries; route catch returns HTTP 500.
- Persistence and consumers: `shots.frame_prompt` or `end_frame_prompt` overwritten (`frames.ts:~760-770`). No `text_field_versions` record in this handler (ledger NO-VERSION-RECORD, V9-AI-05). The new frame starts via `startFrameGeneration` with `prompt_snapshot`.
- Risks and notes: the previous prompt is overwritten without a snapshot, unlike 2.6.1 and 2.6.2 (E-AI-35). Correction text is not stored.
- Evidence: WD-IMPL-AI-0078; E-AI-35; V9-AI-05; `promptGenerationService.ts:1440-1508`; `routes/frames.ts:708-800`.

## 2.7 Frames and images (Stage 10 and image sink)
### 2.7.1 WD-IMPL-AI-0010: Gemini image generation sink (`NanoBananaClient.generateImage`)
- Purpose: Generate an image with the Gemini image model (sink for image jobs).
- Ledger: V2-AI-10, E-AI-41, V9-AI-06 (retired id 0063 mapped here). Flags Y/Y/Y/Y/N. Related 0011, 0081, PROV-0003. Integration test: `image-generation.test.ts` calls the real service and provider without mocks (E section 8), so T is recorded as N here and the integration test is noted below.
- Trigger and call site: any image job. `ImageGenerationService.executeJobInBackground` (`ImageGenerationService.ts:298`), provider call at `:353`; global asset job at `:824`. `NanoBananaClient.generateImage` (`backend/src/services/image-generation/NanoBananaClient.ts:29-169`).
- Provider and model: `@google/generative-ai` 0.24.1. Model `gemini-2.5-flash-image` (`NanoBananaClient.ts:118-120`). Constructed in the `ImageGenerationService` constructor (`ImageGenerationService.ts:68-70`), so the key is required at construction (I section 5.1).
- System prompt source: none.
- User prompt source: none of its own. The wrapper at `NanoBananaClient.ts:68-104` rewrites the job prompt by role counts (1.7).
- Dynamic context: job prompt; `visualStyleContext` from `ImageGenerationService.getVisualStyleContext` (capsule text) or manual tone; reference images (capsule images with role `style`, identity images) downloaded as base64; failed downloads skipped. Width and height are not sent.
- Output and parse: first `inlineData` part of `candidates`. A missing image throws a PERMANENT `ImageProviderError` (V9-AI-06).
- Retry and fallback: `executeWithRetry` up to 3 retries for RATE_LIMIT, TEMPORARY, and network errors, with backoff 1 s, 2 s, 4 s (`NanoBananaClient.ts:17-18`, `:241-269`). No request timeout.
- Persistence and consumers: artifact to `asset-images`. `image_generation_jobs` updated. Per job type the completion step writes `project_assets`, `scene_asset` attempts, `frames`, `global_assets`, or `transformation_events` (`ImageGenerationService.ts:370-440`).
- Risks and notes: aspect ratio never reaches the model (C12 CONFIRMED). Visual style context for frame jobs is never set (V9 section 8). `postProcessBackground` is a no-op (`ImageGenerationService.ts:96-103`, MOCKED). Cost estimate is a static formula and actual copies it (`NanoBananaClient.ts:230-235`).
- Evidence: WD-IMPL-AI-0010; E-AI-41; V9-AI-06; V2-AI-10; `NanoBananaClient.ts:29-169`, `ImageGenerationService.ts:298-440`.
### 2.7.2 WD-IMPL-AI-0011: Text-only `inpaintImage` (DEAD, no caller)
- Purpose: Inpaint with text only (no caller).
- Ledger: V2-AI-11, E-AI-42, V9-AI-07 (retired id 0064 mapped here). Flags N/N/N/N/N. Labels DEAD. Related 0010, 0042.
- Trigger and call site: none. `NanoBananaClient.inpaintImage` (`NanoBananaClient.ts:171-228`). The TODO is at `:185` (`// TODO: Implement proper image upload for inpainting`), and the request sends text-only parts at `:186-191`. `grep -rn "inpaintImage(" backend/src` returns only the interface declaration (`ImageProviderInterface.ts:52`) and the definition (R1b C12).
- Provider and model: `gemini-2.5-flash-image` (`NanoBananaClient.ts:179-180`).
- System prompt source: none.
- User prompt source: inline template at `NanoBananaClient.ts:176` (`prompt`, `maskDescription`).
- Dynamic context: prompt and mask description only. No source image.
- Output and parse: first `inlineData` part. Retry: `executeWithRetry`.
- Persistence and consumers: none.
- Risks and notes: frame inpaint (2.7.6) uses `generateImage` with a text marker, not this method. The only mask-aware method in the repo has no caller (C12).
- Evidence: WD-IMPL-AI-0011; E-AI-42; R1b C12; `NanoBananaClient.ts:171-228`.
### 2.7.3 WD-IMPL-AI-0012: Reference frame vision analysis for camera change
- Purpose: Describe a reference frame for camera-change generation.
- Ledger: V2-AI-12, V5-AI-06, V7-AI-03, E-AI-38, V9-AI-08 (retired id 0065 mapped here). Flags Y/P/U/N/N. Labels none. Related 0008.
- Trigger and call site: `generateWithCameraChangeAnalysis` (`frameGenerationService.ts:720`, analysis call at `:736`), from `generateFrames` (`:431`) and `regenerateFrame` (`:1176`) when the start continuity is `camera_change` with a reference frame.
- Provider and model: `@google/generative-ai`, `gemini-2.5-flash` (`imageAnalysisService.ts:136`). Not `llmClient` (no retry, no LangSmith).
- System prompt source: none (single user turn).
- User prompt source: continuity analyst instruction at `imageAnalysisService.ts:127-134`, a text part (V7-AI-03). Asks for characters, environment, lighting, and atmosphere in 300 to 500 characters. Exact text is not quoted in the reports.
- Dynamic context: reference frame image, downloaded to base64.
- Output and parse: `result.response.text().trim()`. No structured parse.
- Retry and fallback: none in this method. Errors propagate to 2.6.3 and the generation call fails with no non-camera fallback (V7-AI-02).
- Persistence and consumers: not persisted. Text passed only to 2.6.3.
- Risks and notes: reachable only on the camera-change branch (R2 entry 19). Functional UNKNOWN (needs a live provider). Two provider stacks are in use for one generation (V7-AI-03).
- Evidence: WD-IMPL-AI-0012; V7-AI-03; V9-AI-08; R2 section 5; `imageAnalysisService.ts:127-155`, `frameGenerationService.ts:720-740`.
### 2.7.4 WD-IMPL-AI-0054: Reuse or edit continuity-base image prompt (`buildReuseEditPrompt`)
- Purpose: Build a start frame prompt that reuses or edits a selected continuity base.
- Ledger: V7-AI-04 (no retired ids). Flags Y/Y/U/Y/P. Labels none. Related CAP-0206, CAP-0215, 0083, 0008.
- Trigger and call site: bulk generate and single regenerate of start frames with a valid selected continuity base. `frameGenerationService.ts:363` (bulk) and `:1027` (regenerate). Selection at `:350-372` and `:1018-1044`. `buildReuseEditPrompt` at `:542-554`.
- Provider and model: none for the prompt. Image job through `createImageJob` to NanoBanana (2.7.1).
- System prompt source: none (single prompt string).
- User prompt source: `frameGenerationService.ts:542-554`. Appends a `REUSE/EDIT CONTINUITY BASE` block to `shot.frame_prompt`, with a direction rule (`reuse_match` or `reuse_edit`), the base shot label, and the base reason.
- Dynamic context: `shot.frame_prompt`; `ShotReferenceImageContext` (base frame id, shot label, reason, role). The base frame URL is prepended to persisted references.
- Output and parse: image bytes. `ImageGenerationService.ts:516-531` updates frames by shot and `frame_type`.
- Retry and fallback: job failure marks the job failed (`ImageGenerationService`, UNKNOWN in this slice).
- Persistence and consumers: `frames.prompt_snapshot`, `image_url`, `generated_from_frame_id`, `continuity_base_role`.
- Risks and notes: base takes precedence over `start_continuity` match and `camera_change` modes (V7-AI-04). Tested P: `continuityComposition` parity tests check reference order, not prompt text.
- Evidence: WD-IMPL-AI-0054; V7-AI-04; `frameGenerationService.ts:350-372`, `:542-554`, `:1018-1044`.
### 2.7.5 WD-IMPL-AI-0081: Deterministic image prompt construction and isolation suffix
- Purpose: Append the isolation suffix to asset and scene image prompts.
- Ledger: E-AI-44 (no retired ids). Flags Y/Y/Y/Y/P. Labels DUPLICATE-SUFFIX-RISK. Related 0010, 0040, 0082, 0084.
- Trigger and call site: image generate and edit actions in Stage 5 and Stage 8. `ImageGenerationService.injectBackgroundContext` (`:78-89`). Called from `createImageJob` (`:131`, for `master_asset` and `angle_variant` with `assetId`), `createSceneAssetImageJob` (`:226`, `scene_asset`), and `createGlobalAssetImageJob` (`:749`, `master_asset`). Inline copies in `projectAssets.ts:1496` and `sceneAssets.ts:474`, `:480`.
- Provider and model: none (prompt helper). Jobs go to 2.7.1.
- System prompt source: none.
- User prompt source: suffix at `ImageGenerationService.ts:86`: `. Isolated on a plain white background, no environment, no other characters or objects.` (E section 10, AI-44). Isolatable types are character, prop, and extra_archetype (`:66`).
- Dynamic context: asset description or `image_prompt`, asset type, `status_tags`, edit instructions, `removeBackground`, manual tone.
- Output and parse: none.
- Retry and fallback: none.
- Persistence and consumers: `image_generation_jobs.prompt`; scene attempts `prompt_snapshot` (`ImageGenerationService.ts:472`).
- Risks and notes: double sentence on project-asset edit with `removeBackground` on isolatable types (`projectAssets.ts:1494-1496` plus `:131`; 2.3.7). Allow-list includes `transformation_post` but no caller passes it (2.4.8). Aspect table `ASPECT_RATIOS` (`:58-63`) sets dimensions the model never receives (C12). Tested P (integration only, no unit test for the suffix).
- Evidence: WD-IMPL-AI-0081; E-AI-44; `ImageGenerationService.ts:58-136`, `:226`, `:749`.
### 2.7.6 WD-IMPL-AI-0083: Frame prompt suffixes (inpaint marker and end-frame fallback)
- Purpose: Build the inpaint marker and end-frame fallback prompt strings.
- Ledger: E-AI-47 (no retired ids). Flags Y/Y/Y/Y/N. Labels MASK-NOT-SENT. Related 0010, 0007, FACT-0189.
- Trigger and call site: Stage 10 inpaint `POST .../frames/:frameId/inpaint` (`routes/frames.ts:424`; `frameService.ts:241`; `InpaintingModal`), then `frameGenerationService.inpaintFrame` (`:1258-1310`, marker at `:1291`). End-frame fallback when `end_frame_prompt` is empty (`frameGenerationService.ts:466-468`, `:1195-1197`).
- Provider and model: none for the string. Inpaint sends the current frame image as a reference (`referenceImageUrl: frame.image_url`, `:1304`), prepended in `ImageGenerationService.ts:335-345`.
- System prompt source: none.
- User prompt source: inpaint `${request.prompt}\n\n[Inpainting: Apply changes only to masked regions]` (`:1291`). End-frame fallback ` [End of shot - showing action completion]` appended to the frame prompt (E-AI-47).
- Dynamic context: user inpaint prompt, existing frame image URL. Mask data is stored only.
- Output and parse: none.
- Retry and fallback: as 2.7.1.
- Persistence and consumers: mask stored via `storeMask` (`:1329-1358`) to `asset-images` for history only. `frames` row: status `generating`, `current_job_id`, `last_inpaint_mask_path` (`:1312`). `image_generation_jobs.prompt`.
- Risks and notes: the mask is not sent to the model (C12, FACT-0189, PARTIAL). A failed job can leave the frame in `generating` (C13 CONFIRMED, R1b). Tested N.
- Evidence: WD-IMPL-AI-0083; E-AI-47; R1b C12, C13; `frameGenerationService.ts:1258-1358`, `:466-468`, `:1195-1197`.
### 2.7.7 WD-IMPL-AI-0087: Frame start and end image job creation (caller path)
- Purpose: Create start and end frame image jobs from stored frame prompts.
- Ledger: M-AI-02 (lead addition, R2 entry 4). Flags Y/Y/P/Y/P. Related none.
- Trigger and call site: generate-frames and regenerate routes. `frameGenerationService.startFrameGeneration` (`:845-896`) calls `createImageJob` with `jobType` `start_frame` or `end_frame` and the stored frame prompt (`:896`).
- Provider and model: NanoBanana through 2.7.1, `gemini-2.5-flash-image`.
- System prompt source: none.
- User prompt source: stored `shot.frame_prompt` or `end_frame_prompt`.
- Dynamic context: frame prompt, reference images, capsule context (capsule id never supplied for frames, C01 and V9 section 8).
- Output and parse: image bytes.
- Retry and fallback: per 2.7.1 and the frame lifecycle (`08-SHOTS-FRAMES-AND-GENERATION.md`).
- Persistence and consumers: `image_generation_jobs`, `frames`, `frames.prompt_snapshot`.
- Risks and notes: this is the caller-level description missing from the sink entries (R2 section 6 item 4). Partial coverage.
- Evidence: WD-IMPL-AI-0087; M-AI-02; `frameGenerationService.ts:845-896`.

## 2.8 Video (Stage 12)
### 2.8.1 WD-IMPL-AI-0080: Veo 3.1 image-to-video via Vertex AI
- Purpose: Generate video with Veo 3.1 on Vertex AI.
- Ledger: E-AI-43, V10-AI-01 (retired id 0066 mapped here). Flags Y/P/U/Y/N. Labels DIVERGENT-STORAGE-PATH, ENV-DEPENDENT. Related PROV-0018, 0009, FACT-0190, FACT-0201.
- Trigger and call site: Stage 12 render confirm. `POST /api/projects/:id/scenes/:sceneId/confirm-render` (`routes/checkout.ts:91`), then `videoGenerationService.triggerJobProcessing` (`:409-422`), then `VideoJobExecutor` when `VIDEO_PROVIDER=veo3` (`createVideoProvider.ts:18`). `Veo3Provider.generateVideo` (`Veo3Provider.ts:70-104`).
- Provider and model: Vertex AI REST, `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predictLongRunning` (`Veo3Provider.ts:107-116`). Poll `:fetchPredictOperation` (`:231-232`). Auth ADC with cloud-platform scope (`:35-37`). Model map `veo_3_1_fast` to `veo-3.1-fast-generate-001`, `veo_3_1_standard` to `veo-3.1-generate-001` (`:16-20`).
- System prompt source: none.
- User prompt source: `instances[0].prompt` = `video_prompt_snapshot` (2.6.4). No wrapper. Empty snapshot: field omitted (V10-AI-01).
- Dynamic context: start frame bytes; optional end frame (`lastFrame`); duration clamped to 4, 6, or 8; `generateAudio: true`; `aspectRatio` from the project (default `16:9`); `personGeneration: allow_adult`; `resizeMode: pad`; `sampleCount: 1` (`:70-104`).
- Output and parse: operation name from submit. Poll reads `done`, `error`, `response.videos[]`. `raiMediaFilteredCount > 0` is PERMANENT. Output `bytesBase64Encoded` or `gcsUri` (downloaded from the storage JSON API, `:370`).
- Retry and fallback: submit 429 is RATE_LIMIT; 401 and 403 are AUTH_ERROR; other submit errors TEMPORARY. Poll 5xx continues. Poll 4xx TEMPORARY. Poll cap 5 minutes (`POLL_TIMEOUT_MS`, `:26-28`), interval 10 s. The executor retries the whole job up to `max_retries` (default 3, `VideoJobExecutor.ts:145-165`). No fetch timeout on submit or download.
- Persistence and consumers: bytes uploaded to Supabase bucket `videos` at `{GCP project}/{ts}.mp4` (`:335-357`). `storagePath` returned as `videos/{projectId}/...` (`:145`), which does not match the upload key (FACT-0190, E-FACT-11). `providerJobId` = operation name. `actual_cost` = clamped duration × rate. Consumers: Stage 12 player, retry (`checkout.ts:301-324`).
- Risks and notes: PARTIAL. Bucket `videos` is not created by repo scripts (`setup-storage-buckets.ts:38` creates other buckets, V10 section 6). `VIDEO_PROVIDER` and `GOOGLE_CLOUD_*` are absent from the env templates (I section 5.3). Only `backend/src/tests/veo3-test.ts` exercises it, as a manual script outside jest testMatch. Cost rates duplicated (E-FACT-21).
- Evidence: WD-IMPL-AI-0080; E-AI-43; V10-AI-01; V10 section 6.1; `Veo3Provider.ts:8-37`, `:70-145`, `:224-358`; `VideoJobExecutor.ts:145-165`.
### 2.8.2 WD-IMPL-AI-0067: Mock video generation (default provider)
- Purpose: Stand-in video generation (default provider).
- Ledger: V10-AI-02 (no retired ids). Flags Y/Y/Y/P/N. Labels MOCK-ONLY. Related none.
- Trigger and call site: `VideoJobExecutor.processJob` when `VIDEO_PROVIDER` is unset or not `veo3` (default, `createVideoProvider.ts:18`). `MockVideoProvider.generateVideo` (`backend/src/services/video-generation/MockVideoProvider.ts`).
- Provider and model: none.
- System prompt source: none.
- User prompt source: none. The prompt is stored, truncated to 100 characters, in `providerMetadata.inputPrompt` (`MockVideoProvider.ts:31`).
- Dynamic context: `durationSeconds` and `modelVariant` used only for cost.
- Output and parse: returns the same public sample URL for every job: `https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4` (`:10`, `:31`). `storagePath` `mock/<id>.mp4` (nothing stored).
- Retry and fallback: sleeps `3000 + Math.random()*5000` ms (`:19`). Throws `Mock generation failure: simulated provider error` when `Math.random() < 0.05` (`:23-25`). Executor retries up to 3 attempts.
- Persistence and consumers: job `video_url` set. No storage write (P). Stage 12 plays the sample clip.
- Risks and notes: ignores frames and aspect ratio. The output looks like a generated video in the UI but is a fixed sample file. Whether production sets `VIDEO_PROVIDER` is UNKNOWN.
- Evidence: WD-IMPL-AI-0067; V10-AI-02; V10 section 6; `createVideoProvider.ts:15-33`, `MockVideoProvider.ts:10-40`.

## 2.9 Global library
### 2.9.1 WD-IMPL-AI-0086: Global asset library image generation
- Purpose: Generate a global library asset image.
- Ledger: M-AI-01 (lead addition, R2 section 6 item 1). Flags Y/Y/U/Y/P. Related none.
- Trigger and call site: `/assets` (`src/App.tsx:122-126`) renders `AssetLibrary` (`src/pages/AssetLibrary.tsx:240`) and `AssetDialog`. `handleGenerateImage` (`src/components/assets/AssetDialog.tsx:129`), button `Generate Image with AI` (`:561`). `assetService.generateImageKey` (`src/lib/services/assetService.ts:185-196`). `POST /api/assets/:id/generate-image` (`backend/src/routes/assets.ts:410`), calls `imageService.createGlobalAssetImageJob` (`:442`). Also used by `backend/scripts/test-style-capsule-influence.ts:148`.
- Provider and model: NanoBanana, `gemini-2.5-flash-image` (deployed value not verifiable statically).
- System prompt source: none (single prompt).
- User prompt source: `prompt || image_prompt || description` (`ImageGenerationService.ts:createGlobalAssetImageJob`, `:736`). Isolation via `injectBackgroundContext(…, 'master_asset')` (`:749`) for character, prop, and extra_archetype.
- Dynamic context: asset description; style capsule context passed; no reference image.
- Output and parse: image bytes uploaded to storage.
- Retry and fallback: none observed (M-AI-01).
- Persistence and consumers: `image_generation_jobs` row with `project_id` and `branch_id` NULL (`:762-763`); global asset image fields updated by `executeGlobalAssetJobInBackground` (`:800`), which calls `this.provider.generateImage` (`:824`).
- Risks and notes: not in any wave-1 entry (found by R2). Functional UNKNOWN. Integration-only coverage.
- Evidence: WD-IMPL-AI-0086; M-AI-01; R2 section 6 item 1; `ImageGenerationService.ts:736-824`; `routes/assets.ts:410-442`.

## 2.10 Misc (diagnostic and orphaned)
### 2.10.1 WD-IMPL-AI-0079: Connectivity probe (`GET /api/llm/test-connectivity`)
- Purpose: Probe Gemini connectivity.
- Ledger: E-AI-40 (no retired ids). Flags Y/Y/Y/N/N. Labels DIAGNOSTIC, MISLEADING-FLAG. Related FACT-0185, DEAD-0049.
- Trigger and call site: `GET /api/llm/test-connectivity` (`routes/llm.ts:420`). HTTP only; no UI caller (R2 section 1).
- Provider and model: Gemini via `llmClient`, default model, `maxTokens` 50, metadata `{test: true}`.
- System prompt source: literal `You are a test assistant.` (`llm-client.ts:343`).
- User prompt source: literal `Say "Hello, test successful!" and nothing else.` (`llm-client.ts:344`).
- Dynamic context: none.
- Output and parse: `gemini` = response contains `Hello`. `langsmith` = `!!traceId` (`llm-client.ts:350`), which is true whenever the call succeeds because `traceId` is always the request UUID (`:179`). `error` string on failure.
- Retry and fallback: `llmClient` retries.
- Persistence and consumers: none (usage in memory only).
- Risks and notes: `langsmith` flag misleading (FACT-0185). Each request is a real, billed Gemini call. Test file `src/tests/connectivity-test.ts` is a tsx script outside jest testMatch (`backend/jest.config.js:34-37`).
- Evidence: WD-IMPL-AI-0079; E-AI-40; `llm-client.ts:337-357`; `routes/llm.ts:420`.
### 2.10.2 WD-IMPL-AI-0042: Frontend `imageService.inpaintImage` stub (ORPHANED)
- Purpose: Frontend inpaint wrapper (orphaned).
- Ledger: V5-AI-13 (retired ids none). Flags null in merged ledger; R2 entry 55 records no importer, unreachable from UI. Labels ORPHANED, DUPLICATED (DEAD-0016).
- Trigger and call site: none. `src/lib/services/imageService.ts:213-240` (`inpaintImage`; V5 cites a TODO at `:223`). Delegates to `generateImage`. The module has no importer.
- Provider and model: `gemini-2.5-flash-image` through `POST /api/images/generate` (`routes/images.ts:9-48`), HTTP reachable only.
- System prompt source: none.
- User prompt source: caller-provided.
- Dynamic context: none in practice.
- Output and parse: none in practice.
- Retry and fallback: none.
- Persistence and consumers: none.
- Risks and notes: the frame inpaint path is 2.7.6, not this stub. Lines 213 and 223 are both cited by reporters; the method starts at 213.
- Evidence: WD-IMPL-AI-0042; V5-AI-13; R2 entry 55; `src/lib/services/imageService.ts:213-240`.
### 2.10.3 WD-IMPL-AI-0085: Frontend `imageService.generateImage` (ORPHANED)
- Purpose: Frontend image generation wrapper (orphaned).
- Ledger: E-AI-49 (retired ids none). Flags Y/N/N/N/N. Labels ORPHANED, DEAD. Related 0042, DEAD-0045.
- Trigger and call site: none in the UI. `src/lib/services/imageService.ts:generateImage` (R2 section 6 item 2 also records `generateAssetImageKey` at `:163` and `generateFrameAnchor` at `:183`, which call it and are not covered by any ledger entry). Endpoint `POST /api/images/generate` (`routes/images.ts:9`) is HTTP reachable only.
- Provider and model: `gemini-2.5-flash-image` through the backend (unreachable from UI).
- System prompt source: none.
- User prompt source: caller-provided prompt. `generateFrameAnchor` appends an 8-second start and end sentence (R2 section 6, not in the ledger).
- Dynamic context: prompt, project id, stage number, capsule id, width, height, asset id.
- Output and parse: expects the response JSON of `/api/images/generate`.
- Retry and fallback: none.
- Persistence and consumers: via backend if called.
- Risks and notes: the production frontend uses `projectAssetService.generateImage` (`projectAssetService.ts:363`) instead (E-AI-49 note). The two wrappers R2 found are not separate ledger entries.
- Evidence: WD-IMPL-AI-0085; E-AI-49; R2 section 6 item 2; `src/lib/services/imageService.ts:163-207`.

---

# Part 3. Summary and model-adjacent facts

## 3.1 Calls by provider

Counts are over the 61 live ledger entries. "Own model call" means the entry itself issues a request to a model. "Prompt or wrapper" means the entry builds prompt text or a suffix that is sent through another entry's client.

| Provider path | SDK (version) | Entries | Own model call | Prompt or wrapper entries | Dead, orphaned, conditional, or HTTP-only | Status |
|---|---|---|---|---|---|---|
| Gemini text via `LLMClient` (`ChatGoogleGenerativeAI`) | `@langchain/google-genai` 2.1.3 | 38 | 38 | 0 | DEAD: 0026, 0034. LEGACY conditional: 0023. HTTP-only diagnostic: 0079. Route umbrella: 0001. Generic pass-through: 0088 | IMPLEMENTED; runtime FUNCTIONAL UNKNOWN |
| Gemini vision via `@google/generative-ai`, `gemini-2.5-flash` | `@google/generative-ai` 0.24.1 | 4 | 4 | 0 | Conditional: 0012 (camera-change branch only) | IMPLEMENTED; no retry; FUNCTIONAL UNKNOWN |
| Gemini image via NanoBananaClient, `gemini-2.5-flash-image` | `@google/generative-ai` 0.24.1 | 17 | 2 (0010 live, 0011 DEAD) | 13 (10 handler or caller paths, 3 deterministic helpers) | ORPHANED wrappers: 0042, 0085. DEAD: 0011 | IMPLEMENTED; aspect ratio and mask never sent (C12) |
| Veo 3.1 via Vertex AI REST | `fetch`, `google-auth-library` 10.5.0 | 1 | 1 | 0 | Env-gated (`VIDEO_PROVIDER=veo3`) | PARTIAL |
| Mock video | none | 1 | 0 | 0 | Default when `VIDEO_PROVIDER` is unset | MOCK-ONLY |
| Audio (speech, TTS, STT) | none | 0 | 0 | 0 | none | no model call (3.2) |
| Embeddings or vector retrieval | none | 0 | 0 | 0 | none | no call (3.2) |
| Other LLM vendors (OpenAI, Anthropic, others) | none | 0 | 0 | 0 | Names in env templates only (PROV-0021) | DEAD (config only) |

Totals: 38 + 4 + 2 + 13 + 2 + 1 + 1 = 61. The image row counts 2 model-call entries, 13 prompt or wrapper entries, and 2 orphaned wrappers (17 entries touch the image model).

Feature area totals (Part 2 groups): narrative 12, streamline 9, project assets and location views 10, scene assets and transformations 8, shots 4, prompts 5, frames and images 7, video 2, global library 1, misc 3. Sum 61.

Status counts from the ledger labels and flags:

- DEAD or ORPHANED with no caller: 0011, 0026, 0034, 0042, 0085 (5 entries).
- Conditional or reachable only on a narrow path: 0012 (camera change), 0023 (legacy PUT fallback), 0072 (parse failure only). Default-path mock: 0067 (see 3.2).
- HTTP-only with no UI caller: 0079 (connectivity probe) and the `/api/llm/templates` routes (1.10). The generic pass-through (0088) is used by frontend rewrite actions. The deprecated `extractAssets` path reaches 0004 over HTTP only (correction 10).
- Ledger tested flag Y or P: 0022 (overstated, correction 9), 0024, 0027 to 0033 (mocked `llmClient` or vision in tests), 0051, 0054, 0071, 0073, 0077, 0078 (overstated), 0081, 0086, 0087. Ledger tested N: 0002, 0003, 0005, 0069, 0075, 0080, 0082, 0083, 0084, 0085 and the rest not listed. See the Part 2 entry for each.

## 3.2 Model-adjacent facts
### Audio model: none
- Verdict: no audio model is called. No text-to-speech, speech-to-text, or voice model call exists in `backend` or `src`. No audio SDK appears in either `package.json` (PROV-0029, V10 section 8). Grep for `elevenlabs`, `text-to-speech`, `texttospeech`, `speechConfig`, `whisper`, `tts`, `ffmpeg`, `stitch`, `voiceover`, and `lip.sync` returns no runtime code.
- The only audio-related input is `generateAudio: true` in the Veo request body (`Veo3Provider.ts:99`). Audio is produced inside the Veo output. The repository does not inspect it (V10 section 8).
- A stored text column named `voice_profile_id` exists on `global_assets`. Its comment says `ElevenLabs ID or similar` (`backend/migrations/008_global_assets.sql:25`). Routes read and write the string (`backend/src/routes/assets.ts:152`, `:245`). No call uses it.
### Embeddings: none
- Verdict: no embedding call and no vector retrieval. `embedContent`, `embeddings`, and `streamGenerateContent` have no runtime hits (R2 section 6). No vector column or pgvector use appears in `backend/migrations` or `backend/quickies-sql`.
- Retrieval-augmented fields were removed. `written_style_rag_id` and `visual_style_rag_id` are dropped by `backend/migrations/004_style_capsule_system.sql:7-8` (they were added in `001_initial_schema.sql:19-20` with the comment "FK to be added later when RAG tables exist").
- The `{rag_retrieved_style_examples}` placeholder was replaced by `{writing_style_context}` in existing rows (`backend/scripts/update-templates-style-capsule.ts:29-44`). No retrieval step remains in the template path.
### Other model facts
- No structured-output mode: `responseMimeType`, `responseSchema`, and function calling are not used anywhere in `backend/src` (E section 5). Output is plain text parsed by JSON repair code (1.5).
- Token counts are estimated (`ceil(chars/4) + ceil(lines*0.5)`). Provider `usage_metadata` is never read (1.2).
- Cost tables cover four Gemini ids. Veo rates are fixed at 0.15 (fast) and 0.40 (standard) per second. Image cost is `0.01 * (w*h)/(512*512)`.
- Model ids in code: `gemini-1.5-flash` (text fallback), `gemini-2.5-flash-lite` (constructor and estimate), `gemini-2.5-flash` (vision, four sites), `gemini-2.5-flash-image` (image, two sites), `veo-3.1-fast-generate-001`, `veo-3.1-generate-001`. Text model can be overridden by `GEMINI_MODEL` or by a request body field. Vision and image models cannot.
- No per-stage or per-template model selection exists. The frontend sends no model id (E-AI-01 note). The API accepts one (1.2).
- Image output: the first `inlineData` part of the first candidate is used. Text parts are ignored (V9-AI-06).
- Veo returns video only through the operation result. Safety-filtered output (`raiMediaFilteredCount > 0`) is PERMANENT (V10 section 6.1). No other safety settings were recorded in the reports.
- Marketing copy claims OpenAI and Anthropic text providers (`src/pages/Landing.tsx:32`). No code path, dependency, or environment read supports this (PROV-0021, WD-IMPL-FACT-0013, DEAD-0052).
### Sampling parameters by call
Values are from the ledger and code. Blank means the reporter did not record one, so the client default applies (temperature 0.7 and max output 4096 in `LLMClient.generate`, `llm-client.ts:136-137`).

| Ledger entries | Temperature | Max output tokens | Source |
|---|---|---|---|
| 0002 (treatment backfill) | 0.5 | 2048 | V4-AI-07 |
| 0003 (beat backfill) | 0.4 | 4096 | V4-AI-08 |
| 0004 (visual distillation) | 0.4 | 2048 | E-AI-23, V5-AI-01 |
| 0005 (text merge) | default | default | V2-AI-05 |
| 0006 to 0009, 0078 (Stage 9 and 10 text) | 0.7 | 1024 | `callLLM` (`promptGenerationService.ts:1456-1475`) |
| 0014, 0015, 0017, 0021, 0022 (rewrites and brainstorm) | default | default | V3 section 8 |
| 0023 (legacy dependency) | default | default | V3-AI-11 |
| 0024, 0025 (story context) | 0.3 | 2048, 4096 | V3 section 8 |
| 0027 (classification) | default | default | V4-AI-01 |
| 0028 (standalone draft) | 0.3 | 500 | V4-AI-02 |
| 0029 (format as treatment) | 0.5 | 2048 | V4-AI-03 |
| 0030 (format as beats) | 0.4 | 4096 | V4-AI-04 |
| 0031 (questions) | 0.3 | 2048 | V4-AI-05 |
| 0032 (reconciliation) | 0.2 | 8192 | V4-AI-06 |
| 0034 (dead pass 1) | 0.3 | 16384 | E-AI-24 |
| 0068 to 0070 (template calls) | default (from template route) | default | E-AI-01 to E-AI-03 |
| 0071, 0072 (shot extraction) | 0.3 | 4096 | V8-AI-01 |
| 0073, 0074 (split and merge) | default | default | V8-AI-03, V8-AI-04 |
| 0075 (relevance) | 0.3 | 4096 | E-AI-26 |
| 0079 (connectivity) | default | 50 | `llm-client.ts:343-344` |

Vision calls (0012, 0033, 0035, 0036) and image calls set no temperature or token limit in the code the reports read.

## 3.3 Unknowns that bound this document

- Live `prompt_templates` rows: which seed copy is active, `is_active` per name, and whether any row has a non-NULL `created_by`. Settle by a read-only query on the table (E section 15).
- Deployed `GEMINI_MODEL`, `LANGSMITH_TRACING`, `VIDEO_PROVIDER`, `GOOGLE_CLOUD_PROJECT`. Settle by listing secret names in the deployment, not values (I section 10.2).
- Whether LangChain's env tracer creates runs in the LangSmith project, and whether `metadata.globalContext` (which includes capsule rows) reaches those runs (V2 section 4.8, I section 7).
- Whether `projects.visual_style_capsule_id` is set outside the application. No repository code writes it (C02), so a live value would change the Stage 9 and frame style text.
- Whether the Supabase `videos` bucket exists (V10 section 6).
- Model output quality, JSON success rate, and whether the parsers succeed on live output. Runtime only (E section 15).
- Token usage against the estimates (E section 15).
- Persistence of streamline AI output through the commit route (`routes/streamline.ts:45-90`), which no reporter read in detail (E section 16).

## Corrections made while synthesizing

1. WD-IMPL-AI-0002 and WD-IMPL-AI-0003 model field. The ledger and V2 list the model as `gemini-2.5-flash-lite` (the constructor default). The call path resolves to `gemini-1.5-flash` through `llm-client.ts:106`. Corrected in 2.2.1 and 2.2.2 (R2 section 4 reached the same conclusion).
2. WD-IMPL-AI-0084 (ledger correction, CONTRADICTED by R2). The E-side text says an isolation sentence is added by `createImageJob` (citing `ImageGenerationService.ts:L226-L227`). Code shows no isolation for `transformation_post`. `injectBackgroundContext` has three callers (`:131` for `master_asset` and `angle_variant` with `assetId`, `:226` for `scene_asset`, `:749` for global `master_asset`). `transformation_post` is in its allow-list (`:83`) but no caller passes it. Corrected in 2.4.8. Ledger label kept.
3. WD-IMPL-AI-0081 summary. "Master, edit, and scene asset prompts" is partly accurate. The double isolation sentence occurs only on the project-asset `edit-image` path with `removeBackground` on isolatable types (`projectAssets.ts:1494-1496` plus `ImageGenerationService.ts:131`). The scene `edit-image` path does not double (`sceneAssets.ts:474-481`, job type `scene_asset`). Corrected in 2.3.7, 2.7.5.
4. WD-IMPL-AI-0071 sources. The merged ledger lists V8-AI-02 (the malformed-JSON retry) under 0071. R2 judgment (e) assigns it to 0072, and the code matches that (`shotExtractionService.ts:313-328`). Part 2 treats the retry as 2.5.2 and notes the merged listing in 2.5.1.
5. WD-IMPL-AI-0082 callsite. The ledger callsite symbol `location-view-generate-image` does not exist (R2 section 4). The entry cites the route path (`projectAssets.ts:3298`).
6. WD-IMPL-AI-0037 callsite. The prompt is built in the `generate-image` handler and executed in `ImageGenerationService.executeJobInBackground`. Recorded as two locations (R2 section 4).
7. WD-IMPL-AI-0023 reachability. The ledger shows reachable P. V3-AI-11 says both in-repo callers send `tiptapDoc`. R2 section 5 finds one path where the fallback runs (an editor that is null on Stage 4). Recorded as conditional with medium confidence, leaning to R2.
8. WD-IMPL-AI-0075 related id. The ledger links `WD-IMPL-FACT-0195`, which concerns prompt-template writability. The link appears unrelated and is not used.
9. Ledger tested flags that overstate coverage. WD-IMPL-AI-0022 is tested Y in the ledger, but V3-AI-10 says the test covers slug logic only. WD-IMPL-AI-0078 is tested Y, but its note says no test covers this handler. Both are recorded as not covered for these calls.
10. Admin reachability of `extractAssets`. R1a could not find a caller of the deprecated `extractAssets` and said the route-level grep was not exhaustive. Resolved: `routes/projectAssets.ts:113` calls it from `POST /api/projects/:projectId/assets/extract` (`:44`). No frontend caller of `projectAssetService.extractAssets` exists. The path is reachable over HTTP only.
11. R2 counts. R2 reports 85 entries and 58 canonical calls. The current merged ledger has 88 ids, 27 retired, and 61 live. Part 2 uses 61. R2's category split differs (it treats 0054 and 0083 as suffix groups and 0081 as a singleton); Part 2 keeps each live entry separate.
12. E-AI-01 note, "frontend never sends model". True for the frontend, but both `/api/llm/generate` and `/api/llm/generate-from-template` accept `model`, `temperature`, and `maxTokens` (`routes/llm.ts:30-60`). Recorded in 1.2.
13. Ledger labels CONTRADICTED on WD-IMPL-FACT-0019 and WD-IMPL-FACT-0034. The ledger gives no reason. R1a (C02) and a grep for `regeneration_guidance` placeholders in both seed copies confirm the stated facts. Treated as confirmed facts with an unexplained label.
14. V5-AI-13 cites `src/lib/services/imageService.ts:223` for the TODO. The `inpaintImage` method starts at `:213`. Part 2 uses `:213`.
15. V2-AI-06 to V2-AI-08 and V3-AI-06, V3-AI-08, V3-AI-12, and the CONTRADICTED labels on those entries. The labeled claims are confirmed: the style text reaching the prompt is always the no-capsule text (C02, R1a), and the treatment context section is always empty because the keys do not exist (C10, R1a). The CONTRADICTED label refers to the wave-1 claim that the style or treatment reaches the prompt.

## Spot checks against the repository

Source checks made during synthesis, beyond the ledger and reports: defaults and retry constants in `llm-client.ts` (`:45-50`, `:76`, `:106`, `:136-137`); the LangSmith gate and callback path (`:154-165`); template validation and ownership guards (`prompt-template.ts:207`, `:240`, `:325-345`, `:375`); isolation callers and the `transformation_post` allow-list (`ImageGenerationService.ts:78-89`, `:124-131`, `:226`, `:749`); the inpaint marker (`frameGenerationService.ts:1291`); timeout constants (`promptGenerationService.ts:143`, `shotExtractionService.ts:97`, `sceneDependencyExtraction.ts:60`); video model map, poll constants, and default provider (`Veo3Provider.ts:16-28`, `createVideoProvider.ts:18`); the NanoBanana wrapper branches and request shape (`NanoBananaClient.ts:68-130`); route mounts and template mutation calls (`server.ts:75`, `:78`, `llm.ts:571`, `:617`, `:651`); the deprecated `extractAssets` caller (`projectAssets.ts:113`, `:44`); `state_data` reads (`frames.ts:262-267`); context fetched but not injected (`contextManager.ts:102-202`, `llm.ts:191-231`); seed phrase counts; the `calculateCost` throw (`token-utils.ts:68-80`); and grep sweeps for audio, embedding, vector, and vendor names across `backend` and `src`. All matched the cited reports except where the corrections list says otherwise.
