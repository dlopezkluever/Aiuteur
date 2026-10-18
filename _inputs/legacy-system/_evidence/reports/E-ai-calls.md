# E: Authoritative AI / model-call registry (reporter E)

Read-only static reconstruction of every model call (text, image, vision, video, audio), every prompt builder, every parser/repair path, retry/fallback/provider switch, and cost/token tracking, across backend/src, backend/scripts and src. Companion ledger: `E-ai-calls.ledger.jsonl` (103 lines: 49 AI, 8 PROV, 26 FACT, 11 DEAD, 2 ROUTE, 3 TABLE, 4 TEST). Nothing was executed against a provider, database or network. DB contents (prompt_templates rows, GOOGLE_AI_API_KEY value) were not inspected; those points are marked UNKNOWN.

## 1. Verdict summary (per provider path)

| Path | Status | Proof (short) |
|---|---|---|
| Text LLM: LLMClient -> ChatGoogleGenerativeAI (API key) | FULLY WIRED (code); runtime UNKNOWN | llm-client.ts:104-207; 16+ callers; routes/llm.ts:64, :272 |
| Stage 2-4 prompt_templates path (generate-from-template) | PARTIAL | DB-only prompts, seed copies diverge (E-FACT-14), regen guidance dropped (E-FACT-08), no fallback (E-FACT-15), unscoped writes (E-FACT-16) |
| Frontend-built prompts via /api/llm/generate (6 functions) | FULLY WIRED | treatmentService.ts:192-307, scriptService.ts:202-334, beatService.ts:183-298; callers Stage2/3/4 |
| Streamline AI (classify, format, questions, reconcile, backfill, standalone draft) | FULLY WIRED; test-covered with mocks | routes/streamline.ts:196-430; streamline*Service.ts; 5 mocked test files |
| Stage 7 shot extract / split / merge | FULLY WIRED | routes/projects.ts:1711, :2515, :2657; shotExtractionService.ts, shotSplitService.ts, shotMergeService.ts |
| Stage 4 legacy scene dependency extraction | PARTIAL (legacy, deprecated in code) | sceneDependencyExtraction.ts:42; reached only from projects.ts:1346 when no tiptapDoc manifest |
| Stage 5 Pass 2 asset distillation | FULLY WIRED | assetExtractionService.ts:521-652; projectAssets.ts:113, :325 |
| Asset description merge ('merge' strategy) | FULLY WIRED | assetDescriptionMerger.ts:43-87; projectAssets.ts:964, :1891 |
| Stage 8 relevance, story-context inference, transformation text | FULLY WIRED | sceneAssetRelevanceService.ts; storyContextService.ts; transformationEventService.ts |
| Stage 9/10 prompt generation (frame, video, end, continuity, correction) | FULLY WIRED | promptGenerationService.ts:1128-1451; projects.ts:3573; frames.ts:519, :708, :2148 |
| Vision (analyze, reference frame, classify upload) on gemini-2.5-flash | FULLY WIRED; hardcoded model; no retry | imageAnalysisService.ts; routes projectAssets.ts:1413, sceneAssets.ts:559, streamline.ts:293 |
| Image generation (gemini-2.5-flash-image, reference images) | FULLY WIRED (code); aspect ratio never sent | NanoBananaClient.ts:29-169 (no generationConfig at :125-130) |
| Frame inpaint | PARTIAL | frameGenerationService.ts:1258-1310: mask stored, not transmitted; provider inpaintImage unused |
| Video: Veo 3.1 via Vertex ADC | PARTIAL (env-gated; not default) | createVideoProvider.ts:18; Veo3Provider.ts; backend/.env has no VIDEO_PROVIDER |
| Video: MockVideoProvider (default) | MOCKED (default in repo env) | MockVideoProvider.ts:48-74; createVideoProvider.ts:18 default 'mock' |
| Audio model | NONE (no audio model call; only Veo generateAudio:true) | E-FACT-25 (grep: no tts or speech code) |
| LangSmith tracing | PARTIAL | explicit callbacks path dead (throws, caught); LangChain env tracer possibly active; traceId != LangSmith run id (E-PROV-05) |
| OpenAI / Anthropic / Perplexity etc. keys and marketing claim | DEAD (config only) | no SDK, no process.env reads (E-PROV-06); Landing.tsx:32 claims OpenAI/Anthropic |
| NanoBananaClient.inpaintImage | DEAD | no callers (E-DEAD-02) |
| AssetExtractionService.extractEntityMentions (Pass 1 full script) | DEAD | no callers (E-DEAD-01) |
| beatService.splitBeat | ORPHANED (DEAD in UI) | no caller in src/components or src/pages (E-DEAD-03) |
| Frontend imageService.ts | ORPHANED | no importers (E-DEAD-04) |

## 2. Provider and model matrix

| Provider path | SDK (version) | Auth | Model id | Override | Default in code |
|---|---|---|---|---|---|
| Text (LLMClient) | @langchain/google-genai 2.1.3 + @langchain/core 1.1.8 | API key GOOGLE_AI_API_KEY | request.model, else env GEMINI_MODEL | GEMINI_MODEL (backend/.env sets gemini-1.5-flash) | gemini-1.5-flash (llm-client.ts:106); gemini-2.5-flash-lite in constructor (L76) and estimateCost (L310) |
| Image gen (NanoBananaClient) | @google/generative-ai 0.24.1 | API key | gemini-2.5-flash-image | none | hardcoded (NanoBananaClient.ts:119,180) |
| Vision (ImageAnalysisService) | @google/generative-ai 0.24.1 | API key | gemini-2.5-flash | none | hardcoded at imageAnalysisService.ts:54,106,136,176 |
| Video (Veo3Provider) | fetch to aiplatform REST; google-auth-library ^10.5.0 | ADC (GoogleAuth, cloud-platform scope) | veo-3.1-fast-generate-001 / veo-3.1-generate-001 | VIDEO_PROVIDER=veo3 selects provider; GOOGLE_CLOUD_PROJECT (required), GOOGLE_CLOUD_LOCATION | us-central1; mock default when VIDEO_PROVIDER unset |
| Video (mock) | none | none | n/a | VIDEO_PROVIDER=mock or unset | default |
| Tracing | langsmith 0.4.4 (Client + langchain callbacks) | LANGSMITH_API_KEY (constructor requires it) | n/a | LANGSMITH_TRACING, LANGSMITH_PROJECT (library-level) | n/a |

Model ids written in code are inconsistent: text is env-driven with three different literal fallbacks; vision and image are hardcoded and ignore GEMINI_MODEL (E-FACT-20). The only central model table is token-utils GEMINI_PRICING (E-FACT-03). No audio model is called (E-FACT-25).

## 3. Auth modes

- API key (Gemini Developer API): text, image, vision. The text client passes `apiKey: process.env.GOOGLE_AI_API_KEY` (llm-client.ts:75, :134). Image and vision construct `new GoogleGenerativeAI(apiKey)` and throw when the key is unset or equals `placeholder` (NanoBananaClient.ts:20-27; imageAnalysisService.ts:24-30). Because ImageGenerationService constructs NanoBananaClient in its constructor (ImageGenerationService.ts:68-70), any route that instantiates it fails with 500 when the key is missing (E-FACT-19).
- LLMClient constructor requires both GOOGLE_AI_API_KEY and LANGSMITH_API_KEY (llm-client.ts:89-99), so LangSmith is effectively mandatory for the text path even though tracing is optional.
- Vertex AI via ADC: Veo only (Veo3Provider.ts:30-38). `GOOGLE_APPLICATION_CREDENTIALS` is not read by code; GoogleAuth resolves it implicitly. Requires `GOOGLE_CLOUD_PROJECT` (Veo3Provider.ts:41-51).
- Service role: all backend Supabase access, including prompt_templates, uses the service-role client (config/supabase.ts:1-28), so RLS on prompt_templates does not apply (E-FACT-16).
- Frontend: never holds provider keys. It sends the Supabase session bearer token to /api/llm/* and other routes (e.g. treatmentService.ts:94-100); authenticateUser is mounted on /api/llm (server.ts:75).

## 4. Retry, backoff and timeout per client

| Client | Retry | Backoff | Retryable classes | Timeout |
|---|---|---|---|---|
| LLMClient text (llm-client.ts:45-50, :209-238) | 3 retries (4 attempts) | 1s, 2s, 4s (cap 10s) | RATE_LIMIT, SERVER_ERROR, NETWORK_ERROR (classifyError L240-L300) | none in client; callers race timers (E-FACT-07) |
| NanoBananaClient image (NanoBananaClient.ts:17-18, :241-269) | 3 retries (4 attempts) | 1s, 2s, 4s (cap 10s) | RATE_LIMIT, TEMPORARY | none |
| ImageAnalysisService vision | none | n/a | n/a | none |
| Veo3Provider (Veo3Provider.ts:25-28, :224-302) | executor level: VideoJobExecutor retries whole job up to max_retries (default 3, VideoJobExecutor.ts:145-165) | none (fixed 10s poll) | TEMPORARY (poll timeout, 4xx on poll, 429/5xx on submit, GCS download) | 5-minute poll cap; no timeout on submit or download |
| MockVideoProvider | executor retry on 5% synthetic failure | n/a | n/a | simulated 3-8s delay |

Race-only timeouts on the text path (no abort; underlying request continues): shot extraction 20s (shotExtractionService.ts:97, :297-300, returns empty success), legacy dependency extraction 15s (sceneDependencyExtraction.ts:58-61), prompt generation 30s (promptGenerationService.ts:143, :1469-1472). The shot-extraction malformed-JSON retry runs outside the 20s race (shotExtractionService.ts:313-328). Classifier caveat: classifyError uses substring matching (`'key'` or `'auth'` maps to non-retryable AUTH_ERROR) (E-FACT-04).

## 5. JSON output parsing and repair

- Shared: `backend/src/utils/llmJson.ts` (extractJsonArray L111-L129, extractJsonObject L135-L153). Order: strip ``` fences (L18-L30), outer [..] or {..} regex, JSON.parse, trailing-comma removal, truncation repair keeping last complete object, regex reassembly of complete objects. Failure throws LLMJsonParseError. Used by streamline classification, standalone draft, question, reconciliation, backfill and formatting (E-AI-10..E-AI-17, E-AI-13). Covered by llmJson.test.ts (12 tests).
- Ad hoc copies (no shared import): shotExtractionService.parseResponse (L461-L470, fence regex then JSON.parse, no repair), shotSplitService and shotMergeService (fence strip then JSON.parse), sceneAssetRelevance and storyContext (greedy object regex then JSON.parse), transformationEventService (fence regex then JSON.parse, text fallback), assetExtractionService (inline three-stage repair, deprecated Pass 1 at L427-L505 and Pass 2 object repair at L597-L625), imageAnalysisService.classifyUploadedImage (regex then JSON.parse, no try, caught by route), frontend treatmentService/beatService/scriptService (fence strip, then text heuristics) (E-FACT-04, DUPLICATED).
- Prompt text outputs: promptGenerationService.cleanPromptOutput (L1480-L1508) strips fences, unwraps JSON with prompt|framePrompt|videoPrompt keys, strips quotes and truncates (1200/500 chars) with '...'.
- No zod or schema validation of model output in any AI service (E-FACT-24). Zod is used only for HTTP bodies in routes/llm.ts.
- Structured-output modes (responseMimeType, responseSchema, function calling) are not used anywhere in backend/src (grep).

## 6. Cost and token tracking

- Tokens are estimated, not measured: `estimateTokenCount` = ceil(chars/4) + ceil(lines*0.5) (token-utils.ts:51-63) on system+user, and the same on response text (llm-client.ts:110-111, :182). API usage_metadata is never read.
- Cost per text call: calculateCost with GEMINI_PRICING (token-utils.ts:27-44; only gemini-1.5-flash, gemini-1.5-pro, gemini-1.0-pro, gemini-2.5-flash-lite). Unknown ids throw after the model has answered (token-utils.ts:76-78 via llm-client.ts:185) (E-FACT-03).
- Storage: globalUsageTracker (token-utils.ts:163-208), an in-memory unbounded array. Read only by GET /api/llm/usage-stats (llm.ts:389-414), which has no frontend caller. Lost on restart. No DB table stores token or cost usage (grep of all migrations and quickies SQL: none) (E-FACT-02).
- Estimate endpoint: POST /api/llm/estimate-cost (llm.ts:348-383), text only, no caller.
- Image cost: NanoBanana estimateCost = 0.01 * (w*h)/(512*512) (NanoBananaClient.ts:230-235), stored as cost_credits estimate and as actual (ImageGenerationService.ts:162-166, :473-477, :542). Gemini does not return billed cost (comment at NanoBananaClient.ts:163).
- Video cost: rates 0.15 (fast) and 0.40 (standard) per second, duplicated in Veo3Provider.ts:157-160 and videoGenerationService.ts:6-7 (E-FACT-21).
- Vision: no cost tracking.
- Whole-pipeline credit checks use stored image and video costs, not LLM tokens (videoGenerationService.ts:194-196, :224-267).

## 7. LangSmith tracing (wiring)

1. Explicit path (llm-client.ts:154-161): calls `getLangchainCallbacks()` only if LANGSMITH_API_KEY and LANGSMITH_TRACING === 'true'. The langsmith implementation calls `getCurrentRunTree()` (langsmith/dist/langchain.js:19-22), which throws with no active traceable run (singletons/traceable.js:25-31). The throw is caught and logged ('LangSmith tracing not available, continuing without tracing'). Net effect: this path attaches no callbacks. Callbacks are also commented out at llm-client.ts:163-165.
2. Env-driven path: @langchain/core enables a LangChainTracer when LANGSMITH_TRACING or LANGCHAIN_TRACING_V2 is 'true' (utils/callbacks.js:4-13; callbacks/manager.js:468-482). backend/.env sets LANGSMITH_TRACING=true, so per-invoke tracing is probably active. Runtime UNKNOWN.
3. Metadata and tags: requestId, model, inputTokens, caller metadata, tags ['llm-generation','gemini',model] (llm-client.ts:166-173).
4. Trace id returned to callers: traceId = requestId UUID (llm-client.ts:179). This is not a LangSmith run id. It is saved as langsmithTraceId inside stage content JSON by the frontend (Stage2Treatment.tsx:202, Stage3BeatSheet.tsx:352, Stage4MasterScript.tsx:335). The stage_states.langsmith_trace_id column is never written (E-DEAD-05).
5. testConnectivity's langsmith flag is just !!traceId (llm-client.ts:350) (E-FACT-06).
6. A LangSmith Client instance is built in the constructor and never used (llm-client.ts:66, :82-84) (E-DEAD-06).

## 8. Mocks in tests vs production

- Production default for video is mock (createVideoProvider.ts:18), so Stage 12 produces a public sample clip from Google storage (MockVideoProvider.ts:42-43).
- Text LLM is mocked by `jest.mock('../services/llm-client.js')` in streamline and transformation tests (7 files) (E-TEST-03). These tests check parsing and fallbacks, not model output.
- Vision is mocked in streamlineClassifyImage.test.ts. Asset description merger is mocked in assetTypeAndMerge.test.ts (E-TEST-03).
- llm-integration.test.ts calls real Gemini, LangSmith and Supabase; it is not gated by environment (only logs status, L387-L400) (E-FACT-26).
- image-generation.test.ts calls the real ImageGenerationService and provider without mocks (integration) (E-AI-41, E-TABLE-03).
- veo3-test.ts is a manual tsx script against the real API; it is excluded from jest by testMatch (backend/jest.config.js).
- No test covers: /api/llm/generate-from-template, treatment/beat/script template generation, section rewrites, shot merge, legacy dependency extraction, asset Pass 2, scene relevance, post-description, prompt generation LLM functions, analyzeAssetImage, analyzeReferenceFrame, NanoBanana wrapper (beyond integration), image prompt builders (E-TEST-04).
- Frontend tests MSW-mock only infer-context, bulk-infer and edit-image routes.

## 9. AI call registry index (ledger ids)

Prompt source key: DB = prompt_templates row (seed text in code); CODE = literal in source. Every text call uses LLMClient unless noted.

| Lid | Call site (file:function) | Model/SDK | Prompt source | Trigger | Status |
|---|---|---|---|---|---|
| AI-01 | routes/llm.ts generate-from-template#treatment_expansion | text (GEMINI_MODEL) | DB | Stage 2 generate/regenerate | FULLY WIRED; prompt PARTIAL (E-FACT-14) |
| AI-02 | generate-from-template#beat_extraction | text | DB | Stage 3 generate/regenerate | same |
| AI-03 | generate-from-template#master_script_generation | text | DB | Stage 4 generate/regenerate | same |
| AI-04 | treatmentService.regenerateSection | text | CODE | Stage 2 single rewrite | FULLY WIRED |
| AI-05 | treatmentService.regenerateSectionAlternatives | text | CODE | Stage 2 alternatives | FULLY WIRED |
| AI-06 | scriptService.regenerateSection | text | CODE | Stage 4 single rewrite | FULLY WIRED |
| AI-07 | scriptService.regenerateSectionAlternatives | text | CODE | Stage 4 alternatives | FULLY WIRED |
| AI-08 | beatService.brainstormBeatAlternatives | text | CODE | Stage 3 brainstorm | FULLY WIRED |
| AI-09 | beatService.splitBeat | text | CODE | none | DEAD/ORPHANED |
| AI-10 | streamlineClassificationService.classifyProseViaLLM | text | CODE | Stage 1 upload | FULLY WIRED |
| AI-11 | streamlineStandaloneAssetService.extractStandaloneAssetDraft | text | CODE | upload classified character_notes | FULLY WIRED |
| AI-12 | streamlineFormattingService.formatAsTreatment | text | CODE | AI-format (treatment) | FULLY WIRED |
| AI-13 | streamlineFormattingService.formatAsBeatSheet | text | CODE | AI-format (beats) | FULLY WIRED |
| AI-14 | streamlineQuestionService.analyzeBatch | text | CODE | Ask Auteur analyze | FULLY WIRED |
| AI-15 | streamlineReconciliationService.reconcileDocuments | text | CODE | Ask Auteur submit | FULLY WIRED |
| AI-16 | streamlineBackfillService.backfillTreatment | text | CODE | backfill stage 2 | FULLY WIRED; persists locked row |
| AI-17 | streamlineBackfillService.backfillBeatSheet | text | CODE | backfill stage 3 | FULLY WIRED; persists locked row |
| AI-18 | shotExtractionService.extractShots | text | CODE | Stage 7 extract | FULLY WIRED |
| AI-19 | shotExtractionService.extractShots#retry | text | CODE | parse failure of AI-18 | FULLY WIRED |
| AI-20 | shotSplitService.splitShot | text | CODE | Stage 7/9 split | FULLY WIRED |
| AI-21 | shotMergeService.mergeShots | text | CODE | Stage 7 merge | FULLY WIRED; untested |
| AI-22 | sceneDependencyExtractionService.extractWithLLM | text | CODE | PUT scenes without manifest | PARTIAL (legacy) |
| AI-23 | assetExtractionService.distillVisualSummary | text | CODE | Stage 5 extract | FULLY WIRED; ctx dead (E-FACT-13) |
| AI-24 | assetExtractionService.extractEntityMentions | text | CODE | none | DEAD |
| AI-25 | assetDescriptionMerger.mergeWithLLM | text | CODE | merge / clone with merge | FULLY WIRED |
| AI-26 | sceneAssetRelevanceService.detectRelevantAssets | text | CODE | Stage 8 AI detect | FULLY WIRED |
| AI-27 | storyContextService.callInferenceLLM | text | CODE | Stage 8 infer (single; >4 bulk) | FULLY WIRED; input bug (E-FACT-12) |
| AI-28 | storyContextService.callBulkInferenceLLM | text | CODE | Stage 8 bulk infer (<=4) | FULLY WIRED |
| AI-29 | transformationEventService.generatePostDescription | text | CODE | Stage 8 transformation | FULLY WIRED; persists |
| AI-30 | transformationEventService.generateTransformationPrefill | text | CODE | Stage 8 add/convert dialog | FULLY WIRED |
| AI-31 | promptGenerationService.generateFramePrompt | text | CODE | Stage 9 generate prompts | FULLY WIRED; persists |
| AI-32 | promptGenerationService.generateVideoPrompt | text | CODE | Stage 9 generate prompts | FULLY WIRED; framePrompt unused |
| AI-33 | promptGenerationService.generateEndFramePrompt | text | CODE | Stage 10 end prompt | FULLY WIRED |
| AI-34 | promptGenerationService.generateContinuityFramePrompt | text | CODE | Stage 10 continuity / camera-change | FULLY WIRED |
| AI-35 | promptGenerationService.applyFramePromptCorrection | text | CODE | Stage 10 correction | FULLY WIRED; no version record |
| AI-36 | imageAnalysisService.analyzeAssetImage | gemini-2.5-flash (SDK) | CODE | upload then analyze | FULLY WIRED; hardcoded |
| AI-37 | imageAnalysisService.mergeDescriptions | gemini-2.5-flash (SDK) | CODE | when existing description | FULLY WIRED |
| AI-38 | imageAnalysisService.analyzeReferenceFrame | gemini-2.5-flash (SDK) | CODE | camera_change frame gen | FULLY WIRED |
| AI-39 | imageAnalysisService.classifyUploadedImage | gemini-2.5-flash (SDK) | CODE | Stage 1 image upload | FULLY WIRED |
| AI-40 | llm-client testConnectivity | text | CODE | GET test-connectivity | diagnostic (API only) |
| AI-41 | NanoBananaClient.generateImage (all image jobs) | gemini-2.5-flash-image (SDK) | CODE wrapper | any image job | FULLY WIRED; dims not sent |
| AI-42 | NanoBananaClient.inpaintImage | gemini-2.5-flash-image | CODE | none | DEAD |
| AI-43 | Veo3Provider.generateVideo | Veo 3.1 (Vertex) | prompt from AI-32 | render confirm when veo3 | PARTIAL (env-gated) |
| AI-44 | ImageGenerationService.injectBackgroundContext + master/scene/edit prompts | none (deterministic) | CODE | image jobs | DETERMINISTIC; duplicate suffix risk |
| AI-45 | ImageGenerationService.createAngleVariantJob | none | CODE | angle variants | DETERMINISTIC |
| AI-46 | projectAssets.ts location-view generate-image | none | CODE | location views | DETERMINISTIC |
| AI-47 | frameGenerationService inpaint marker and end-frame suffix | none | CODE | inpaint, legacy end frame | DETERMINISTIC; mask not sent |
| AI-48 | sceneAssets.ts transformation post-image prompt | none | CODE | transformation post image | DETERMINISTIC |
| AI-49 | src/lib/services/imageService.ts | none | CODE | none | DEAD/ORPHANED |

## 10. Verbatim prompt excerpts (short, for prompt-text evidence)

- AI-01 system (seed, scripts/seed-templates.ts:22-24): "You are a narrative expansion specialist. Your role is to transform brief story ideas into fully-realized 3-act treatments." Template variable list at L25-L40 includes "{writing_style_context}".
- AI-03 system (seed, scripts/seed-templates.ts:182): "Return ONLY the formatted screenplay text. Do NOT wrap it in JSON or markdown code blocks."
- AI-18 system (shotExtractionService.ts:208): "You are a technical shot breakdown specialist for an AI video generation pipeline."; output rule (L262): "OUTPUT: Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):"
- AI-19 retry system (shotExtractionService.ts:320): "You extract a shot list from screenplay text. Return ONLY valid JSON: ..."
- AI-31 system (promptGenerationService.ts:1137): "YOUR TASK: Generate a single dense paragraph describing a FROZEN VISUAL SNAPSHOT - the starting frame of a shot. This is a PHOTOGRAPH, not a video."
- AI-32 system (promptGenerationService.ts:1209): "THE STARTING FRAME ALREADY ENCODES ALL VISUAL TRUTH. Do NOT describe what anyone looks like..."
- AI-35 system (promptGenerationService.ts:1445): "Apply the user's correction surgically - change only what they asked for, keep everything else identical. Return ONLY the revised prompt, no explanation."
- AI-36 (imageAnalysisService.ts:48): "You are a visual description expert for film production. Analyze this image of a {assetType} named "{assetName}" and write a detailed visual description suitable for AI image generation."
- AI-41 wrapper (NanoBananaClient.ts:81): "Maintain the characters/subjects from the FIRST {n} identity reference image(s) - preserve their exact appearance, features, clothing, and distinguishing details."
- AI-44 suffix (ImageGenerationService.ts:86): ". Isolated on a plain white background, no environment, no other characters or objects."
- AI-45 phrases (ImageGenerationService.ts:259-262): "front-facing view, looking directly at the camera"

## 11. Dead and unreachable code (summary)

- E-DEAD-01 extractEntityMentions (assetExtractionService.ts:366-516).
- E-DEAD-02 NanoBananaClient.inpaintImage (NanoBananaClient.ts:171-228).
- E-DEAD-03 beatService.splitBeat (beatService.ts:246-298), no UI or route.
- E-DEAD-04 src/lib/services/imageService.ts, no importers.
- E-DEAD-05 DatabaseService.updateStageStateTraceId / createStageState / getStageStatesByTraceId (config/database.ts:68-120); stage_states.langsmith_trace_id, prompt_template_version, final_prompt never written.
- E-DEAD-06 LLMClient.langsmithClient and constructor client (llm-client.ts:65-66, :74-84).
- E-DEAD-07/E-FACT-18 mockTreatments (Stage2Treatment.tsx:36).
- E-DEAD-08 API-only routes with no frontend caller: /estimate-cost, /usage-stats, /test-connectivity, all /templates CRUD, /templates/interpolate, /templates/stage/:n/active (llm.ts:348-775).
- E-DEAD-09 unused exports: getTemplateVersions, estimateCostForPrompt, formatVisualStyleInjection, setRetryConfig.
- E-DEAD-10 postProcessBackground no-op (ImageGenerationService.ts:96-103).
- E-DEAD-11 unused provider env keys (E-PROV-06).

## 12. Route inventory (AI-relevant)

- /api/llm (authenticateUser, server.ts:75): /generate (E-ROUTE-01), /generate-from-template (E-ROUTE-02), /estimate-cost, /usage-stats, /test-connectivity, /templates (CRUD, activate, interpolate, stage lookup) (E-DEAD-08).
- /api/seed/prompt-templates (POST, server.ts:78): inserts the route copy of the three templates (E-FACT-14/15).
- /api/projects/:id/scenes/:sceneId/shots/extract, /shots/:shotId/split, /shots/merge (projects.ts:1711, :2515, :2657).
- /api/projects/:id/scenes (PUT) legacy dependency fallback (projects.ts:1217, :1346).
- /api/projects/:projectId/scenes/:sceneId/generate-prompts (projects.ts:3573).
- /api/projects/:projectId/assets/extract, extract-confirm, merge-descriptions, clone-from-global, analyze-image, edit-image, generate-image, angle-variants/generate, location-views/:viewId/generate-image (projectAssets.ts:44, :273, :937, :1756, :1380, :1436, :1210, :2520, :3298).
- /api/projects/:projectId/scenes/:sceneId/assets/detect-relevance, infer-context, bulk-infer-context, analyze-image, generate-image, edit-image, transformation-events/* (sceneAssets.ts:122, :2226, :2274, :559, :350, :408, :1901, :1916, :1944).
- /api/projects/:projectId/streamline/{extract-file, classify-image, format-file, analyze, reconcile, backfill/:stage} (routes/streamline.ts:196, :256, :318, :363, :400, :99).
- /api/projects/:projectId/scenes/:sceneId/frames/... generate-end-frame-prompt, regenerate-with-correction, generate-continuity-prompt (frames.ts:519, :708, :2148) and frame generation/inpaint routes (frames.ts:227, :424).
- /api/projects/:id/scenes/:sceneId/shots/... render path: checkout.ts:91 confirm-render (triggers video executor).
- /api/images/generate (images.ts:9), /api/assets/:id/generate-image (assets.ts:410): image job entry points without a frontend caller for the first.

## 13. Cross-slice references

- backend/src/services/contextManager.ts:102-202 - assembleGlobalContext feeds writing-style, beat sheet, master script summary and Ask Auteur facts into AI-01..AI-03 and AI-16..AI-17 (context slice).
- backend/src/services/styleCapsuleService.ts:330-361 - formatWritingStyleInjection text used in every template call (style slice).
- backend/src/routes/stageStates.ts:124-130, :260-270 - style_capsule_applications insert from AI-01..AI-03 metadata (stage-state slice).
- backend/src/routes/projects.ts:1217-1400 and backend/src/utils/scriptManifest.ts - deterministic dependency extraction that makes AI-22 a fallback (scenes/Stage 4 slice).
- backend/scripts/update-templates-style-capsule.ts:29-44 - rewrites {rag_retrieved_style_examples} to {writing_style_context} in DB template rows (scripts slice; implies older template text in DB).
- backend/migrations/002_add_langsmith_fields.sql (prompt_templates, stage_states.langsmith_trace_id) and 004 (style_capsule_applications), 007 (image_generation_jobs), 019 (frames.total_cost_credits) - table slice.
- backend/src/services/videoGenerationService.ts:365, :409-422 and video-generation/VideoJobExecutor.ts:83-165 - V10 video lifecycle (prompt snapshot, executor trigger, retries).
- backend/src/services/frameGenerationService.ts:1100-1240, :1258-1310 - frame lifecycle that consumes AI-31..AI-35 and AI-47 (frames slice).
- backend/src/services/transformationEventService.ts:528-560 - getLastAssetStateForInheritance, consumed by sceneAssetRelevance (transformation slice).
- backend/src/services/image-generation/ImageGenerationService.ts:298-582 - job lifecycle and per-type table updates (image-jobs slice).
- backend/fly.toml - NODE_ENV=production only; no VIDEO_PROVIDER (deployment slice).
- src/pages/Landing.tsx:25, :32, :428 - marketing text claims OpenAI, Anthropic and Veo3 (frontend copy slice; contradicts code).
- src/lib/services/inputProcessingService.ts:165-202 - mode instructions say AI expands/condenses; no LLM call here (input slice).

## 14. Contradictions

1. Regeneration guidance is sent by the frontend (treatmentService.ts:152, beatService.ts:141, scriptService.ts:158) but no seed template contains a regeneration_guidance placeholder, so it is silently dropped (E-FACT-08). Whether live DB rows differ: UNKNOWN.
2. Two seed copies of the same templates diverge; the route copy omits the JSON output format that treatment and beat parsers rely on (E-FACT-14).
3. storyContextService reads selectedTreatmentId; the frontend writes activeVariation and never writes selectedTreatmentId (E-FACT-12).
4. Veo returns storagePath 'videos/...' but uploads to '{project}/...' (E-FACT-11).
5. Image aspect ratios are stored and labelled as sizing, but the API never receives width or height (E-FACT-09).
6. Frame inpaint describes a masked region, but the mask is stored and never sent (E-FACT-10).
7. Landing copy claims OpenAI and Anthropic text providers; code and env have only Gemini and Veo (E-PROV-06).
8. langsmithTraceId is presented as a trace id but is the requestId UUID; LangSmith explicit callbacks are dead (E-PROV-05).
9. testConnectivity reports langsmith:true without contacting LangSmith (E-FACT-06).
10. prompt_templates RLS says only creators can update or delete, but the service-role client bypasses RLS and seeded rows have created_by null (E-FACT-16).
11. Duplicate isolation sentence possible for project-asset edit-image with removeBackground on isolatable types (E-AI-44).
12. Name collision: ImageAnalysisService.mergeDescriptions (vision text merge) vs assetDescriptionMerger.mergeDescriptions (text merge). Different behaviour; no collision at runtime.

## 15. Unknowns and what would settle them

- Live prompt_templates content: which seed copy is live, whether any row has created_by null, whether regeneration_guidance placeholders exist. Settle: read-only query on prompt_templates (name, version, is_active, created_by, presence of 'Return the response as JSON' and 'regeneration_guidance').
- Whether GOOGLE_AI_API_KEY in backend/.env is the literal 'placeholder' (would throw in image and vision constructors). Settle: check key presence in the deployed environment without printing it.
- Whether LangChain auto-tracing produces runs in the wizardirector-dev LangSmith project. Settle: one authorized test call with a runtime check, outside this read-only audit.
- Whether the videos storage bucket exists. Settle: list Supabase storage buckets.
- Whether the deployed environment sets VIDEO_PROVIDER=veo3 and GOOGLE_CLOUD_PROJECT (fly.toml and secrets not inspected).
- Actual token usage and cost versus the estimates. Settle: compare the API usage_metadata with the estimator on a sample call.
- Whether stage_states.prompt_template_version is written anywhere outside code paths I did not read (grep found no writer in backend/src or src).
- Output quality and whether the JSON-producing prompts succeed in practice. Settle: runtime sampling (out of scope for static review).
- Persistence of streamline AI outputs through commit: the commit route (routes/streamline.ts:45-90) and StreamlineCommitRequest were not read in detail; persistence for AI-10..AI-15 is therefore marked P/UNKNOWN.
- text_field_versions and style_capsule_applications column details (services and migrations not fully read).

## 16. Files and areas NOT inspected (honest gaps)

- backend/src/routes/streamline.ts:45-90 (commit route) and backend/src/routes/stageStates.ts beyond lines 120-130 and 250-270.
- backend/src/services/textFieldVersionService.ts, styleCapsuleService.ts (beyond injection formatters), userCreditsService.ts, locationResolverService.ts, continuityCompositionService.ts, continuityBaseService.ts, assetInheritanceService.ts, locationCoverageService.ts, streamlineExtractionService.ts (text extraction only grepped).
- backend/src/utils/scriptManifest.ts and scriptConfidence.ts (only referenced, not read).
- backend/scripts/seed-style-capsules.ts, test-style-capsule-influence.ts, backfill-shot-locations.ts (only grepped).
- backend/migrations 004, 007, 019 and quickies-sql (only grepped for specific columns).
- Frontend components beyond the AI call sites (e.g. Stage1InputMode.tsx commit path, Stage5Assets.tsx, Stage8 dialogs' save logic) and src/lib/services/*.ts other than AI-related functions.
- backend/src/tests/veo3-test.ts (read partly), image-generation.test.ts (grep only), frameGenerationService.test.ts and other non-AI tests (not read).
- Runtime behaviour of any call (no execution performed, by rule).
