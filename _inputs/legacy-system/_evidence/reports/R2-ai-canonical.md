# R2: canonical AI and model-call registry

Scope: the 85 `kind=AI` entries in `merged/merged.jsonl` (WD-IMPL-AI-0001 to 0085), checked against the repo at HEAD. Every entry's `callsite` and `evidence` path was checked by script (file exists, line range within file length, named symbol present). Grep sweep covered `backend/`, `src/`, `e2e/` and root files, excluding `._docs`, `node_modules`, `*.md`.

Machine output: `reports/R2-ai-canonical.json` (58 groups; each id appears in exactly one group's `members`; `primary` is always a member and prefers an E-sourced entry where one exists; `distinct_from` ids are not members of their own group). Ids in the table below are the last four digits of `WD-IMPL-AI-NNNN`.

## 1. Counts

- 85 merged AI entries become **58 canonical calls**. 27 entries are folded into another group. 34 canonical calls are singletons.
- By kind: text LLM calls via `llmClient.generate` 36 (includes one HTTP-only probe, two dead and one conditional path); vision (`@google/generative-ai` generateContent with an image) 4; image-model sink 2; image prompt paths feeding the sink 10; orphaned frontend image prompt paths 2; deterministic prompt helper 1; route umbrella 1; Veo video 1; mock video 1.
- Unreachable (no caller in UI or HTTP route): 0026 (`beatService.splitBeat`), 0034 (`extractEntityMentions`, private, no call site), 0011 (`NanoBananaClient.inpaintImage`, no call site), 0042 and 0085 (`src/lib/services/imageService.ts` has no importers).
- Reachable only over raw HTTP, with no UI caller: 0079 (`GET /api/llm/test-connectivity`, `routes/llm.ts:420`).
- Conditional: 0023 (legacy scene-dependency LLM), reached only from `PUT /api/projects/:id/scenes` (`routes/projects.ts:1346`) when `tiptapDoc` is absent or `extractManifest` throws.

## 2. How the groups were decided

Rule applied: one group = same prompt-building function AND same model-client function. Different prompt text through the same client stays separate.

Merges made (the merged registry had the same function under two callsite strings, so the lead's `merge-ledger.mjs` did not collapse them):
- NanoBanana sink: 0010 with 0063 (`NanoBananaClient.generateImage`); 0011 with 0064 (`inpaintImage`).
- Prompt builders, `promptGenerationService`: 0006+0058 (`generateFramePrompt`), 0007+0060 (`generateEndFramePrompt`), 0008+0061 (`generateContinuityFramePrompt`), 0009+0059 (`generateVideoPrompt`), 0062+0078 (`applyFramePromptCorrection`).
- Vision, `imageAnalysisService`: 0035+0049 (`analyzeAssetImage`), 0036+0050 (`mergeDescriptions`), 0012+0065 (`analyzeReferenceFrame`).
- Stage 8 story and relevance: 0024+0044 (`callInferenceLLM`), 0025+0045 (`callBulkInferenceLLM`), 0043+0075 (`detectRelevantAssets`), 0046+0076 and 0047+0077 (transformation post-description and prefill).
- Stage 7 shots: 0055+0071 (`extractShots` primary), 0056+0073 (split), 0057+0074 (merge).
- Stage 2-4 template calls: 0013+0068 (`treatment_expansion`), 0016+0018+0069 (`beat_extraction`, including `regenerateBeats`), 0019+0020+0070 (`master_script_generation`, including `regenerateScript`). Regeneration guidance is passed as a variable with no placeholder in these templates, so the prompt text is identical.
- Image handlers: 0041+0082 (location-view prompt, E-46 and V5 describe the same handler at `projectAssets.ts:3298`, template at 3380-3405); 0052+0084 (generate-post-image handler, `sceneAssets.ts:1944`); 0066+0080 (`Veo3Provider.generateVideo`).
- Camera-change: 0053 (`generateWithCameraChangeAnalysis`) is merged into 0008. It calls the same `generateContinuityFramePrompt` function with a vision-analysis argument (`frameGenerationService.ts:796`). See judgment call (b) below.

Judgment calls (flagged so the lead can override):
- (a) Group 1 (0001, route umbrella). `POST /api/llm/generate-from-template` dispatches to a DB template chosen by name. It has no prompt of its own, so it is kept as its own group and not folded into treatment_expansion (68). It is counted as a canonical call.
- (b) Group 38 includes 0053. If an argument-driven analysis block is treated as a different prompt, split 0053 out. Its vision call is a separate group (19).
- (c) Groups 41 and 42 (NanoBanana sink) hold only the client function. All caller prompt paths (43-53) are separate groups, because they have different handlers and different prompt text, even though all reach the same sink.
- (d) Group 51 (0081, `injectBackgroundContext`) is a suffix helper, not a standalone prompt. It is kept as a singleton. Its callers are listed in its `distinct_from`.
- (e) Merge artifact: merged id 0055 includes `V8-AI-02`, which is the malformed-JSON retry prompt (`shotExtractionService.ts:320`). It belongs with 0072 (group 33). Both callsites were the string `ShotExtractionService.extractShots`, so the merge script collapsed them. This report keeps the retry as its own group (33) and keeps 0055 as the primary-prompt group (32); the lead should drop `V8-AI-02` from 0055's sources.

## 3. Canonical calls (58)

Model column: "Gemini text, llmClient.generate" resolves the model at `llm-client.ts:106` as `request.model || GEMINI_MODEL || gemini-1.5-flash`. The image sink hardcodes `gemini-2.5-flash-image` (`NanoBananaClient.ts:119,180`). Vision hardcodes `gemini-2.5-flash` (`imageAnalysisService.ts:54,106,136,176`). Veo model id is per job variant (`Veo3Provider.ts:16-20`: `veo-3.1-fast-generate-001` or `veo-3.1-generate-001`).

| # | Canonical call | Primary | Members (WD-IMPL-AI-NNNN, last 4) | Model / client | Reachability and caller chain | Near-miss (distinct_from) |
|---|---|---|---|---|---|---|
| 1 | Generic template route POST /api/llm/generate-from-template (umbrella over templates) | 0001 | 0001 | Per template (see 68-70) | routes/llm.ts:139 generate-from-template; callers treatmentService.ts:94,164, beatService.ts:76,153, scriptService.ts:102,172 | 0068, 0069, 0070 |
| 2 | Stage 2 treatment generation, template treatment_expansion | 0068 | 0068, 0013 | Gemini text, llmClient.generate | Stage2Treatment.tsx:193,365 -> treatmentService.ts:38,125 -> POST /api/llm/generate-from-template | 0002, 0029, 0014 |
| 3 | Stage 3 beat extraction, template beat_extraction | 0069 | 0069, 0016, 0018 | Gemini text, llmClient.generate | Stage3BeatSheet.tsx:329,534 -> beatService.ts:44,106 -> generate-from-template | 0003, 0030, 0017 |
| 4 | Stage 4 master screenplay, template master_script_generation | 0070 | 0070, 0019, 0020 | Gemini text, llmClient.generate | Stage4MasterScript.tsx:320,393 -> scriptService.ts:65,134 -> generate-from-template | 0003, 0030, 0022 |
| 5 | Treatment section rewrite, single (frontend-built prompt via /api/llm/generate) | 0014 | 0014 | Gemini text, llmClient.generate | Stage 2 section edit (count 1) -> treatmentService.ts:192 -> POST /api/llm/generate (llm.ts:64) | 0015, 0021 |
| 6 | Treatment section rewrite, three alternatives (frontend-built prompt) | 0015 | 0015 | Gemini text, llmClient.generate | Stage 2 section edit (count 3) -> treatmentService.ts:250 -> /api/llm/generate | 0014, 0022 |
| 7 | Master script section rewrite, single (frontend-built prompt) | 0021 | 0021 | Gemini text, llmClient.generate | Stage 4 section edit (count 1) -> scriptService.ts:202 -> /api/llm/generate | 0014, 0022 |
| 8 | Master script section rewrite, three alternatives (frontend-built prompt) | 0022 | 0022 | Gemini text, llmClient.generate | Stage 4 section edit (count 3) -> scriptService.ts:275 -> /api/llm/generate | 0015, 0021 |
| 9 | Beat brainstorm, three alternatives for one beat | 0017 | 0017 | Gemini text, llmClient.generate | Stage3BeatSheet brainstorm -> beatService.ts:183 -> /api/llm/generate | 0026, 0015 |
| 10 | Beat split (no caller) | 0026 | 0026 | Gemini text, llmClient.generate | NONE: beatService.ts:246 splitBeat has no call site in src/components or src/pages | 0017 |
| 11 | Streamline backfill: treatment from locked script | 0002 | 0002 | Gemini text, llmClient.generate | ProjectView.tsx:677 backfillStage -> streamlineService.ts:135 -> streamline.ts:99 backfill | 0068, 0029 |
| 12 | Streamline backfill: beat sheet from locked script | 0003 | 0003 | Gemini text, llmClient.generate | Same route as the treatment backfill (stage 3 variant), ProjectView.tsx:677 | 0069, 0030 |
| 13 | Stage 5 extract: visual distillation of extracted asset description | 0004 | 0004 | Gemini text, llmClient.generate | Asset extract flow: projectAssets.ts:113 (extractAssets) and :325 (extractSelectedAssets) -> assetExtractionService.ts:521 (private) | 0005, 0024 |
| 14 | Asset description merge via LLM (strategy merge, global + project) | 0005 | 0005 | Gemini text, llmClient.generate | projectAssets.ts:937 merge-descriptions (MergeDialog.tsx via projectAssetService.ts:792) and :1891 clone-from-global | 0036, 0004 |
| 15 | Full-script entity mention extraction, pass 1 (dead) | 0034 | 0034 | Gemini text, llmClient.generate | NONE: private extractEntityMentions (assetExtractionService.ts:366) has no call site | 0004 |
| 16 | Uploaded asset image vision description (analyzeAssetImage) | 0035 | 0035, 0049 | Gemini 2.5 Flash vision, generateContent (SDK) | projectAssets.ts:1380 analyze-image (Stage5Assets.tsx:438); sceneAssets.ts:524 analyze-image (VisualStateEditorPanel via sceneAssetService.ts analyzeSceneAssetImage) | 0033, 0012 |
| 17 | Vision description merge of existing and extracted text (mergeDescriptions) | 0036 | 0036, 0050 | Gemini 2.5 Flash text, generateContent (SDK) | Analyze-image route when an existing description is non-empty; private ImageAnalysisService.mergeDescriptions (imageAnalysisService.ts:90) | 0005 |
| 18 | Streamline uploaded image classification (vision) | 0033 | 0033 | Gemini 2.5 Flash vision, generateContent (SDK) | streamline.ts:256 classify-image -> StreamlineImageReviewGrid.tsx:80 -> streamlineService.classifyImage | 0035, 0012 |
| 19 | Reference-frame vision analysis for camera-change generation (analyzeReferenceFrame) | 0012 | 0012, 0065 | Gemini 2.5 Flash vision, generateContent (SDK) | frameGenerationService.ts:720 generateWithCameraChangeAnalysis, called from generateFrames (:431) and regenerateFrame (:1176) when start continuity is camera_change with a reference frame | 0035, 0033 |
| 20 | Streamline prose document classification | 0027 | 0027 | Gemini text, llmClient.generate | streamline.ts:196 extract-file -> StreamlineDropZone.tsx:123 -> streamlineService.extractFile (classification step) | 0028, 0031 |
| 21 | Streamline standalone asset draft from note file | 0028 | 0028 | Gemini text, llmClient.generate | streamline.ts:196 extract-file when classification type is character_notes (streamline.ts:222-230) | 0027 |
| 22 | Streamline format document as treatment | 0029 | 0029 | Gemini text, llmClient.generate | streamline.ts:318 format-file targetType treatment -> StreamlineDropZone.tsx:231 | 0002, 0068 |
| 23 | Streamline format document as beat sheet | 0030 | 0030 | Gemini text, llmClient.generate | streamline.ts:318 format-file targetType beat_sheet -> StreamlineDropZone.tsx:231 | 0003, 0069 |
| 24 | Ask Auteur question generation (analyzeBatch) | 0031 | 0031 | Gemini text, llmClient.generate | streamline.ts:363 analyze -> Stage1InputMode.tsx:327 | 0032, 0027 |
| 25 | Ask Auteur reconciliation (rewrite documents from answers) | 0032 | 0032 | Gemini text, llmClient.generate | streamline.ts:400 reconcile -> Stage1InputMode.tsx:373 | 0031 |
| 26 | Legacy LLM scene dependency extraction (PUT scenes fallback) | 0023 | 0023 | Gemini text, llmClient.generate | CONDITIONAL: projects.ts:1217 PUT scenes, fallback at projects.ts:1346 when tiptapDoc is absent or extractManifest throws | 0043 |
| 27 | Stage 8 infer-from-story, single asset (also used per asset when bulk > 4) | 0024 | 0024, 0044 | Gemini text, llmClient.generate | sceneAssets.ts:2226 infer-context (VisualStateEditorPanel.tsx:370 via sceneAssetService inferContext); bulk path calls it per asset when more than 4 (storyContextService.ts:209-211) | 0025 |
| 28 | Stage 8 bulk story-context update, batched (4 or fewer assets) | 0025 | 0025, 0045 | Gemini text, llmClient.generate | sceneAssets.ts:2274 bulk-infer-context when 4 or fewer assets (Stage8VisualDefinition.tsx:547) | 0024 |
| 29 | Stage 8 AI relevance detection (which master assets appear in a scene) | 0075 | 0075, 0043 | Gemini text, llmClient.generate | sceneAssets.ts:122 detect-relevance (Stage8VisualDefinition.tsx:469, 508 via sceneAssetService.detectRelevantAssets) | 0024 |
| 30 | Transformation post-description generation | 0076 | 0076, 0046 | Gemini text, llmClient.generate | sceneAssets.ts:1901 generate-post-description (transformationEventService.ts:124; VisualStateEditorPanel.tsx:194) | 0077 |
| 31 | Transformation prefill (post description, narrative, inferred trigger and type) | 0077 | 0077, 0047 | Gemini text, llmClient.generate | sceneAssets.ts:1916 generate-prefill (transformationEventService.ts:150; AddTransformationDialog.tsx, ConvertToTransformationDialog.tsx) | 0076 |
| 32 | Stage 7 shot extraction, primary prompt | 0071 | 0071, 0055 | Gemini text, llmClient.generate | projects.ts:1711 shots/extract (shotService.ts:113; Stage7ShotList.tsx:178) | 0072, 0073 |
| 33 | Stage 7 shot extraction, malformed-JSON retry system prompt | 0072 | 0072 | Gemini text, llmClient.generate | Same route as 71 (projects.ts:1711), second system prompt used only after a JSON.parse failure | 0071, 0073 |
| 34 | Stage 7 and Stage 9 shot split into 2 or 3 shots | 0073 | 0073, 0056 | Gemini text, llmClient.generate | projects.ts:2515 shots/:shotId/split (Stage7ShotList.tsx:416; Stage9/ShotAssetPanel.tsx:83) | 0074 |
| 35 | Stage 7 shot merge of two consecutive shots | 0074 | 0074, 0057 | Gemini text, llmClient.generate | projects.ts:2657 shots/:shotId/merge (shotService.ts:310 mergeShot; Stage7ShotList) | 0073 |
| 36 | Stage 9 start-frame prompt generation (generateFramePrompt) | 0006 | 0006, 0058 | Gemini text, llmClient.generate | projects.ts:3573 generate-prompts (promptService.ts:107; Stage9PromptSegmentation.tsx) -> generatePromptSet | 0007, 0009 |
| 37 | End-frame prompt generation (generateEndFramePrompt) | 0007 | 0007, 0060 | Gemini text, llmClient.generate | frames.ts:519 generate-end-frame-prompt (frameService.ts:268; Stage10FrameGeneration.tsx) | 0006, 0083 |
| 38 | Continuity recomposition prompt (generateContinuityFramePrompt, with or without vision analysis) | 0008 | 0008, 0061, 0053 | Gemini text, llmClient.generate | frames.ts:2148 generate-continuity-prompt (promptService.ts:165; Stage9/Stage10); also frameGenerationService.ts:796 camera-change path | 0054, 0012 |
| 39 | Video prompt generation (generateVideoPrompt) | 0009 | 0009, 0059 | Gemini text, llmClient.generate | projects.ts:3573 generate-prompts (generatePromptSet, after the frame prompt) | 0006 |
| 40 | Frame prompt surgical correction (applyFramePromptCorrection) | 0078 | 0078, 0062 | Gemini text, llmClient.generate | frames.ts:708 regenerate-with-correction (frameService.ts:324; Stage10FrameGeneration.tsx:408) | 0006 |
| 41 | Gemini image generation, NanoBananaClient.generateImage (gemini-2.5-flash-image) | 0010 | 0010, 0063 | Gemini 2.5 Flash Image, generateContent (NanoBananaClient) | Every image job through ImageGenerationService.executeJobInBackground (ImageGenerationService.ts:298, provider call :353); global asset job at :824 | 0011, 0081 |
| 42 | Gemini inpaintImage, text-only (never called) | 0011 | 0011, 0064 | Gemini 2.5 Flash Image, generateContent (NanoBananaClient) | NONE: NanoBananaClient.inpaintImage (L171) has no call site; frame inpaint runs through generateImage | 0010, 0042 |
| 43 | Master asset image prompt, generate-image handler | 0037 | 0037 | Gemini 2.5 Flash Image (via sink) | projectAssets.ts:1210 generate-image (projectAssetService.ts:363; Stage5Assets.tsx:386) | 0038, 0039 |
| 44 | Master asset image prompt, edit-image handler (projectAssets) | 0038 | 0038 | Gemini 2.5 Flash Image (via sink) | projectAssets.ts:1436 edit-image (projectAssetService.ts startEditImageJob; Stage5Assets.tsx:1492-1512) | 0051, 0037 |
| 45 | Master asset regeneration from global asset (clone-from-global) | 0039 | 0039 | Gemini 2.5 Flash Image (via sink) | projectAssets.ts:1756 clone-from-global (projectAssetService.ts:541; AssetDrawer.tsx:269,287; AssetMatchModal.tsx:125,148) | 0037, 0005 |
| 46 | Angle-variant image prompt (createAngleVariantJob) | 0040 | 0040 | Gemini 2.5 Flash Image (via sink) | projectAssets.ts:2520 angle-variants/generate (projectAssetService.ts:954; AngleVariantsDialog.tsx:114,151) | 0037 |
| 47 | Location-view direction image prompt (deterministic template) | 0082 | 0082, 0041 | Gemini 2.5 Flash Image (via sink) | projectAssets.ts:3298 location-views/:viewId/generate-image (projectAssetService.ts:1228; LocationCoveragePanel.tsx:234) | 0037, 0040 |
| 48 | Scene asset image prompt, createSceneAssetImageJob | 0048 | 0048 | Gemini 2.5 Flash Image (via sink) | sceneAssets.ts:350 scene generate-image -> createSceneAssetImageJob (sceneAssets.ts:385); sceneAssetService generateSceneAssetImage / bulkGenerateImages (Stage8VisualDefinition.tsx:601, 642) | 0051, 0081 |
| 49 | Scene asset edit-image prompt (sceneAssets handler) | 0051 | 0051 | Gemini 2.5 Flash Image (via sink) | sceneAssets.ts:408 scene edit-image (sceneAssetService startEditImageJob; VisualStateEditorPanel.tsx:823-836) | 0038, 0048 |
| 50 | Transformation post-image prompt (generate-post-image) | 0084 | 0084, 0052 | Gemini 2.5 Flash Image (via sink) | sceneAssets.ts:1944 generate-post-image (transformationEventService.ts:165; VisualStateEditorPanel.tsx:206) | 0048 |
| 51 | Isolation suffix helper (injectBackgroundContext) | 0081 | 0081 | None (prompt helper) | Internal to createImageJob (ImageGenerationService.ts:124-131) and createSceneAssetImageJob (:226) | 0037, 0048 |
| 52 | Frame inpaint marker and end-frame fallback suffixes | 0083 | 0083 | None (prompt suffix) | frames.ts:424 inpaint (frameService.ts:241; InpaintingModal via Stage10); generateFrames end-frame fallback (frameGenerationService.ts:466-468); regenerateFrame (:1195-1197) | 0007, 0054 |
| 53 | Reuse/edit continuity-base prompt (buildReuseEditPrompt) | 0054 | 0054 | None (prompt builder) | generateFrames (frameGenerationService.ts:363) and regenerateFrame (:1027) for start frames with a valid continuity base | 0083, 0008 |
| 54 | Frontend imageService.generateImage (POST /api/images/generate), orphaned module | 0085 | 0085 | Gemini 2.5 Flash Image via orphan endpoint | NONE in UI: src/lib/services/imageService.ts has no importers; POST /api/images/generate (images.ts:9, mounted at /api/images) is HTTP-reachable only | 0042 |
| 55 | Frontend imageService.inpaintImage stub (orphaned module) | 0042 | 0042 | Gemini 2.5 Flash Image via orphan endpoint | NONE: imageService.ts inpaintImage (L213) has no importer; delegates to generateImage | 0085 |
| 56 | Connectivity probe (GET /api/llm/test-connectivity) | 0079 | 0079 | Gemini text, llmClient.generate | HTTP only: GET /api/llm/test-connectivity (llm.ts:420) under /api/llm; no UI caller | - |
| 57 | Veo 3.1 image-to-video via Vertex AI predictLongRunning | 0080 | 0080, 0066 | Veo 3.1 via Vertex AI REST (predictLongRunning) | checkout.ts:91 confirm-render (checkoutService.ts:78; Stage11Confirmation) -> videoGenerationService triggerJobProcessing -> VideoJobExecutor when VIDEO_PROVIDER=veo3 | 0067 |
| 58 | Mock video provider (default when VIDEO_PROVIDER is unset) | 0067 | 0067 | None (mock, no model) | Same path when VIDEO_PROVIDER is unset (createVideoProvider.ts:18 defaults to mock) | 0066 |

## 4. Evidence that points to code not found or wrong lines

Checked by script: every `path:Lx-Ly` range (against file length) and every named symbol (substring match) in `callsite` and `evidence`. Listed below are the failures; all other files and symbols matched.

| Entry | Bad citation | What is actually there |
|---|---|---|
| 0002 (V2, V3, V4, E) | `streamlineBackfillService.ts:L275-L318`, `:fetchLockedScript:L247-L268` | File is 150 lines. `backfillTreatment` is at L57; `fetchLockedScript` at L29. |
| 0003 | `streamlineBackfillService.ts:L324-L365` | File is 150 lines. `backfillBeatSheet` is at L106. |
| 0005 | `assetDescriptionMerger.ts:44-91` | File is 88 lines. `mergeWithLLM` starts at L43 (range is off by one). |
| 0025 | `storyContextService.ts:436-470` | File is 465 lines. L436 is `parseBulkInferenceResponse`. `callBulkInferenceLLM` is at L282 (prompt at 296-336). |
| 0028 | `streamlineStandaloneAssetService.ts:164-190`; test `:15-40` | File is 45 lines. `extractStandaloneAssetDraft` at L19. Test file is 39 lines. |
| 0029 | `streamlineFormattingService.ts:100-112` | File is 70 lines. `formatAsTreatment` at L25. |
| 0030 | `streamlineFormattingService.ts:117-145`; test `:26-55` | File is 70 lines. `formatAsBeatSheet` at L42. Test file is 51 lines. |
| 0032 | `streamlineReconciliationService.ts:158-218` (and 158-173, 175-185, 187-218) | File is 105 lines. `buildSystemPrompt` L45, `buildUserPrompt` L62, `reconcileDocuments` L74. |
| 0083 | `frameGenerationService.ts` "storeMask (L1300 region)" | `storeMask` is at L1329. |
| 0042, 0085 | `imageService.ts:inpaintImage:L210-L232` | `inpaintImage` is at L213-240. Range overlaps but is not exact. |
| 0082 | callsite `projectAssets.ts:location-view-generate-image` | No such symbol. The route is `router.post('/:projectId/assets/:assetId/location-views/:viewId/generate-image')` at L3298. |
| 0037 | callsite joins two locations | Prompt is built in the `generate-image` handler (`projectAssets.ts:1210`), job executed in `executeJobInBackground` (`ImageGenerationService.ts:298`). Not one code location. |

Pattern: the Streamline line numbers (V2, V4 evidence for 0002, 0003, 0028-0030, 0032) do not match the current files, and cite ranges past end of file.

Model-default claim corrected: 0002 and 0003 say "llm-client default (GEMINI_MODEL or gemini-2.5-flash-lite)". That is not the call path. `backfillTreatment`/`backfillBeatSheet` call `llmClient.generate`, whose default is `gemini-1.5-flash` (`llm-client.ts:106`). `gemini-2.5-flash-lite` appears only in the unused constructor client (`:76`) and `estimateCost` (`:310`).

## 5. Entries claiming reachable that are not reachable, and contradictions

Route-mount check: `backend/src/server.ts:46-87` mounts `/api/projects` (projects, projectAssets, sceneAssets, shotAssignments, frames, checkout, stageStates, streamline, sceneStageLock), `/api/llm`, `/api/images`, `/api/assets`, `/api/seed`, `/api/style-capsules`. Every route that hosts an AI call above is under a mounted router. Reachability problems are therefore about the absence of callers.

| Entry | Claim | Finding |
|---|---|---|
| 0026 (E-09, V3-16) | Split beat | Unreachable. No caller in `src/components` or `src/pages`; `beatService.ts:246` is never called. Agrees with E flag N. |
| 0034 (E-24, V5-03) | Pass 1 entity extraction | Unreachable. `extractEntityMentions` (`assetExtractionService.ts:366`) has no call site. Agrees. |
| 0011, 0064 (E-42, V2-11, V9-07) | inpaintImage | Unreachable. No call site anywhere. Frame inpaint instead calls `generateImage` with a text marker (`frameGenerationService.ts:1291-1293`). Agrees. |
| 0042 (V5-13), 0085 (E-49) | Frontend imageService | Unreachable from UI. `src/lib/services/imageService.ts` has no importer. Endpoint `POST /api/images/generate` (`routes/images.ts:9`) is HTTP-reachable only. Agrees with E flag N. |
| 0023 (E-22, V3-11) | Legacy LLM dependency extraction | Partially reachable (E flag P). Reached from `projects.ts:1346` only when `dependenciesMap` is empty, i.e. no `tiptapDoc` or manifest throws. Stage 1 always passes a `tiptapDoc` (`scriptConfidence.ts:10` types it as non-optional). Stage 4 passes `editor?.getJSON()` (`Stage4MasterScript.tsx:610`), which is undefined only if the editor is null. V3's "both callers send tiptapDoc" is correct for normal flows. |
| 0079 (E-40) | Connectivity probe | HTTP-only. Route mounted (`llm.ts:420`), no UI caller. Agrees with E. |
| 0084 (E-48) | "then isolation sentence via createImageJob (ImageGenerationService.ts:L226-L227 analog)" | **Contradicted.** `createImageJob` injects isolation only for `master_asset` and `angle_variant` (`ImageGenerationService.ts:124-131`). `transformation_post` is not in that branch. L226 is in `createSceneAssetImageJob` and injects only for `scene_asset`. V6-0052's "no isolation applied" is correct. |
| 0081 (E-44) | Helper covers "master/edit/scene asset prompts" | **Partly.** The helper runs only inside `createImageJob` (master_asset, angle_variant) and `createSceneAssetImageJob` (scene_asset). The projectAssets edit-image path calls `createImageJob` with `master_asset` and `assetId`, so the helper runs there too, and when `removeBackground` is set the isolation sentence is appended twice (`projectAssets.ts:1494-1496` inline, then `ImageGenerationService.ts:124-131`). The sceneAssets edit path appends inline only and uses `scene_asset`. |
| 0006, 0008 (V2, V9, V7) | Style context always "No visual style capsule applied" | Confirmed by code: no backend or frontend write to `projects.visual_style_capsule_id`. The column exists (`backend/migrations/004_style_capsule_system.sql:63`). Reads at `promptGenerationService.ts:762` and `projects.ts:3584`. |
| 0012 (V2, V7, V9) | Vision analysis, camera change | Confirmed reachable only in the camera-change branch: `frameGenerationService.ts:431` (generateFrames) and `:1176` (regenerateFrame), both gated on a camera_change continuity base with a reference frame. |
| 0072 (E-19, V8-02) | Retry prompt | Confirmed reachable: used only after `JSON.parse` of the primary response fails (`shotExtractionService.ts:313-328`). |
| 0067 (V10-02) | Mock video | Confirmed default: `createVideoProvider.ts:18` falls back to `'mock'` when `VIDEO_PROVIDER` is unset. |

## 6. Model invocations in the repo not covered by any of the 85 entries

Grep sweep: `generateContent` (imageAnalysisService.ts:56,108,138,178; NanoBananaClient.ts:125,186); `getGenerativeModel` (same lines); `ChatGoogleGenerativeAI` (llm-client.ts:6,74,133, invoke at :163); `llmClient.` (every caller listed in section 3, plus `routes/llm.ts:70,272,354,401,422` and `promptGenerationService.ts:1470`; `:354` is estimateCost and `:401` getUsageStats, which are not model calls); `generateImages`, `generateVideos`, `embedContent`, `streamGenerateContent`, `startChat`, `sendMessage`: no hits in runtime code; `predict`: only `predictLongRunning` in `Veo3Provider.ts:107-109`; `googleapis`: `Veo3Provider.ts:36` (auth scope), `:107` (aiplatform), `:370` (storage download); `fetch(` to Google endpoints: `Veo3Provider.ts:109,234` (submit, poll), `:184` (input image download, inside 0066), `:371` (GCS result download, inside 0066). Vendor names openai, anthropic, whisper, embedding, elevenlabs, replicate, stability, runway, imagen: no runtime code hits (`backend/env.example` declares keys only). Root `backend/test-connection.js` is Supabase only.

Not covered:

1. **Global asset image generation. REACHABLE. Not in any entry.** Chain: `src/App.tsx:122-126` (`/assets`) renders `AssetLibrary` (`src/pages/AssetLibrary.tsx:240`) which renders `AssetDialog` (`src/components/assets/AssetDialog.tsx`). `handleGenerateImage` at `:129`, button "Generate Image with AI" at `:561`, calls `assetService.generateImageKey` (`src/lib/services/assetService.ts:185-196`) with `POST /api/assets/:id/generate-image`. Backend: `server.ts:87` mounts `/api/assets`; `backend/src/routes/assets.ts:410` calls `imageService.createGlobalAssetImageJob` (`:442`). `ImageGenerationService.createGlobalAssetImageJob` (`:736`) inserts into `image_generation_jobs` with `project_id` and `branch_id` NULL (`:762-763`), applies `injectBackgroundContext(..., 'master_asset')` (`:749`), then `executeGlobalAssetJobInBackground` (`:800`), which calls `this.provider.generateImage` (`:824`, NanoBanana). Prompt is `prompt || image_prompt || description` with isolation for character/prop/extra_archetype. Style capsule context is passed; no reference image. Also used by the dev script `backend/scripts/test-style-capsule-influence.ts:148`.
2. **Orphaned frontend wrappers over the same endpoint.** `src/lib/services/imageService.ts:163` `generateAssetImageKey` (calls `generateImage` at `:177`, `stageNumber` 5) and `:183` `generateFrameAnchor` (calls `generateImage` at `:207`, appends an 8-second start/end sentence). The module has no importers. Entry 0085 covers `generateImage`; entry 0042 covers `inpaintImage`. These two methods are not covered.
3. **Generic LLM pass-through.** `backend/src/routes/llm.ts:64-70`: `POST /api/llm/generate` takes client-supplied `systemPrompt` and `userPrompt` (zod `generateRequestSchema`) and calls `llmClient.generate`. The frontend calls it from entries 5-10 (treatment, script and beat section rewrites), which are covered, but no entry cites `llm.ts:64` as its callsite. ROUTE-0131 in the merged ledger names this route; it is not an AI entry.
4. **Frame start/end image jobs as a caller-level path.** `frameGenerationService.ts:896` (in `startFrameGeneration`, L845) calls `createImageJob` with `jobType` `start_frame` or `end_frame` and the frame prompt. The model call is covered only at the sink (groups 41 and 42). No entry describes this caller. Partial coverage.
5. **Test and script-only invocations** (not runtime; not AI entries):
   - `backend/src/tests/llm-integration.test.ts:304`, `:325`, `:367`, inside `test.skip` blocks at `:303`, `:317`, `:346`. These are never executed. The `isEnvironmentConfigured()` helper at `:387-394` only feeds a log line. E's FACT-0205 ("not environment-gated") is accurate for the helper but the live calls are skipped unconditionally.
   - `backend/src/tests/connectivity-test.ts:68,127`: standalone `tsx` script. Jest `testMatch` (`backend/jest.config.js:34-37`) is `**/src/tests/**/*.test.ts`, so this file is not picked up by jest.
   - `backend/scripts/test-style-capsule-influence.ts:148`: manual script creating a real global image job (see item 1).

Covered but noted: `POST /api/images/generate` (`routes/images.ts:9-48`) calls `createImageJob` with caller-supplied `jobType` and `prompt`. It is covered by 0085's evidence, but it is HTTP-reachable with no UI caller.

## 7. Other observations for the lead

- Duplicate pairs in the merged ledger that are not collapsed by `merge-ledger.mjs` (same function, different callsite string): 0010/0063, 0011/0064, 0006/0058, 0007/0060, 0008/0061, 0009/0059, 0062/0078, 0035/0049, 0036/0050, 0043/0075, 0024/0044, 0025/0045, 0046/0076, 0047/0077, 0052/0084, 0041/0082, 0066/0080, 0013/0068, 0016/0018/0069, 0019/0020/0070, 0055/0071, 0056/0073, 0057/0074. Groups in section 3 fold them.
- Image prompts are built by handlers, not by the sink. `NanoBananaClient.generateImage` rewrites the prompt by role counts (`NanoBananaClient.ts:68-104`) and adds style context. When a style context or reference images are present, every caller prompt reaches the model with this wrapper text added (`NanoBananaClient.ts:68-104` branches).
- `PromptGenerationService.callLLM` (`promptGenerationService.ts:1456-1475`) is the single client call for all 6 prompt builders (temperature 0.7, maxTokens 1024, timeout race). Its `llmClient.generate` at `:1470` is the only `llmClient.generate` in that file.
- Frontend-built prompts (groups 5-10) are sent to `/api/llm/generate`, so the backend does not see the template name or stage; `metadata.operation` is the only discriminator.
- No schema validation on AI output (FACT-0203 per E): parsing is `JSON.parse` plus regex/fallback in each service; not re-checked here.

## 8. Unknowns

- Whether the frame start/end image path (uncovered item 4) and the global asset path (item 1) are intended to be in the AI registry is a scope decision for the lead; both are real model calls.
- Runtime behaviour (actual model responses, which default model `GEMINI_MODEL` resolves to in deployed `.env`) is not verifiable statically. `backend/.env` sets `GEMINI_MODEL=gemini-1.5-flash` but was not used as evidence.
