# R1b verification: claims C12 to C22 (from R1-claims-to-verify.md)

Reporter R1b. Read-only static verification. No DB, network, provider, or server access. Ledger: `R1b-verification.ledger.jsonl` (one FACT per claim, lids `R1b-FACT-12` to `R1b-FACT-22`). Paths are relative to repo root `/home/user/workspace/repo`. Line numbers were re-checked with `sed -n` / `grep -n` after writing.

## Verdict table

| Claim | Verdict | One-line corrected fact |
|---|---|---|
| C12 aspect ratio and inpaint mask never sent to gemini-2.5-flash-image | CONFIRMED | Width/height are stored on `image_generation_jobs` and used only for returned metadata; the Gemini request has reference parts + text only; the mask is uploaded and stored in `frames.last_inpaint_mask_path` but `inpaintImage()` (the only mask-aware method) has zero callers. |
| C13 frame stays `generating` after failed job | CONFIRMED | A failed start/end-frame job leaves `frames.status='generating'`; the only code that sets `rejected` is `GET .../frames/:id/status`, which no frontend code calls; Stage 10 re-polls GET frames every 2 s while any frame is `generating`. |
| C14 confirm-render charges skipped shots; re-confirm duplicates; no refund | CONFIRMED | Charge = scene-wide sum over all shots (including shots with no start frame); jobs skip those shots only at insert; no existing-job check; `addCredits` has zero callers, so nothing is ever refunded. |
| C15 re-approve hard-deletes unmatched scenes with cascade | PARTIALLY CONFIRMED | Hard delete and cascade are real, but deletion needs a miss on BOTH slug:number and number-only fallback (`projects.ts:1379-1387`, `:1420`); the dialog promise of `continuity_broken` marking is not implemented (UI copy CONTRADICTED by code). |
| C16 LangSmith callbacks never attach; `stage_states.langsmith_trace_id` never written | CONFIRMED | `getLangchainCallbacks()` calls `getCurrentRunTree()`, which throws outside a traceable scope; the throw is caught and logged (`llm-client.ts:157-160`); no code writes `stage_states.langsmith_trace_id` (only uncalled DatabaseService helpers). |
| C17 two diverging seed copies; created_by NULL rows editable by any user | CONFIRMED | `routes/seed.ts` and `scripts/seed-templates.ts` differ in ~88 lines of template text; both insert `created_by` NULL; update/delete/activate skip the ownership check when `created_by` is NULL and the backend uses the service-role client. |
| C18 transformation_flags unread; no automatic detection wired | PARTIALLY CONFIRMED | Flags are written by automatic Stage 7 shot extraction and returned by GET shots (`select('*')`) but no logic reads them; LLM detection IS automatic; what is NOT wired is conversion into `transformation_events` (only manual creation exists). Wave-1 `WD-IMPL-CAP-0192` "Stage 3 and 7" is CONTRADICTED (Stage 3 writes no flags). |
| C19 Streamline commit ignores formatChoice; not idempotent on retry | CONFIRMED | `formatChoice` never leaves the browser; content is chosen by presence of `formattedText`/`formattedBeats`, so "as-is" after an AI-format run still commits AI text; the commit RPC has no idempotency key, so a retry after server-side success duplicates stage, asset and resolution rows. |
| C20 project asset `locked` has no unlock path; image regeneration not blocked | CONFIRMED | `locked` is set by lock-all (Stage 5 completion), by per-asset lock (no UI caller), and by Stage 8 create-with-project-asset (inserted locked at creation); nothing sets it false; generate/upload/edit/clear-all image routes have no lock check. |
| C21 `/projects/new` creates a project then stage-1 lock 404s; Dashboard onNewProject TODO | CONFIRMED | Reachable only by typed URL; project and stage-1 draft are created, then `lockStage('new',1)` runs `.eq('id','new')` and the route returns 404; the App-level `handleNewProject` TODO is never invoked (Dashboard uses NewProjectDialog). |
| C22 text_field_versions RLS open to anon | CONFIRMED | The only policy is `FOR ALL USING (true) WITH CHECK (true)` with no `TO` clause (applies to PUBLIC, including anon); the table has no owner column, so even authenticated access is not ownership-checked at the DB layer. |

Wave-1 errors found in this slice (labels CONTRADICTED on the ledger entries that carry them):
- `WD-IMPL-CAP-0192` (V6, "Stage 3 and 7 derived shot transformation flags (not consumed)"): Stage 3 is wrong. Only shot extraction (Stage 7 in the UI) writes `transformation_flags`. Corrected: "Stage 7 shot extraction derives transformation flags (not consumed)."
- All other wave-1 items checked here (`WD-IMPL-STATE-0028`, `WD-IMPL-FACT-0008`, `WD-IMPL-FACT-0010`, `WD-IMPL-DEAD-0005`, `WD-IMPL-FACT-0146`, `E-PROV-05`, `E-DEAD-05`, `E-FACT-14`, `E-FACT-16`, `WD-IMPL-CAP-0086`, `WD-IMPL-FACT-0033`, `WD-IMPL-CAP-0116`, `WD-IMPL-CAP-0125`, `WD-IMPL-ROUTE-0023`, `WD-IMPL-STATE-0031`, `WD-IMPL-STATE-0036`, `WD-IMPL-FACT-0070`, `V9` aspect/mask and frame-status items) were re-checked and are correct in substance.

Ledger labels: `CONTRADICTED` is applied to `R1b-FACT-18` (because of `WD-IMPL-CAP-0192`) and to nothing else. Where a claim is PARTIALLY CONFIRMED because the R1 paraphrase was imprecise (C15, C18), the wave-1 entry it paraphrases was already correct and is not labelled.

---

## C12. Aspect ratio stored but not sent; inpaint mask stored but not sent (V9)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-12`.

Evidence:
- Aspect ratio becomes `width/height` on the job row: `backend/src/services/image-generation/ImageGenerationService.ts:160-161` `width: request.width || 512, height: request.height || 512,`. The frame path passes them: `backend/src/services/frameGenerationService.ts:1301-1302` (inpaint) and `:904-905` (generate), via `FRAME_DIMENSIONS` (`:126-127`, 16:9 = 1280x720, 9:16 = 720x1280).
- Provider receives them: `ImageGenerationService.ts:353-357` `this.provider.generateImage({ prompt, width: request.width, height: request.height, ...})`.
- Gemini request ignores them. `backend/src/services/image-generation/NanoBananaClient.ts:118-130`: `model: 'gemini-2.5-flash-image'` then `generateContent({ contents: [{ role: 'user', parts: parts }] })`. No `generationConfig`/`imageConfig`. `width`/`height` are used only in the returned metadata at `NanoBananaClient.ts:159-160` (`width: options.width || 512`).
- Aspect text is not added to any prompt: `grep -rni "aspect\|16:9\|9:16" backend/src/services/image-generation backend/src/services/frameGenerationService.ts` returns only the constants and parameter names (no prompt text).
- No resize after generation: `grep -rn "sharp\|jimp\|resize" backend/src --include=*.ts` returns nothing in the image path (only `Veo3Provider.ts:102 resizeMode: 'pad'`, a video provider).
- Mask stored but not sent: `frameGenerationService.ts:1284` `const maskPath = await this.storeMask(projectId, frameId, request.maskDataUrl);`; `:1312` `last_inpaint_mask_path: maskPath,`; `storeMask` (`:1329-1358`) uploads to bucket `asset-images`.
- The only mask-aware method is dead: `NanoBananaClient.ts:171` `async inpaintImage(options: InpaintOptions)`; `:185` `// TODO: Implement proper image upload for inpainting`; `:186-191` sends text-only parts. `grep -rn "inpaintImage(" backend/src` returns only the interface declaration (`ImageProviderInterface.ts:52`) and the definition. `grep -rn "maskDescription\|sourceImageUrl" backend/src` returns only `ImageProviderInterface.ts:23-24` and `NanoBananaClient.ts:176`.
- What the inpaint job actually sends: `frameGenerationService.ts:1291` `const inpaintPrompt = \`${request.prompt}\n\n[Inpainting: Apply changes only to masked regions]\`;` and `:1304` `referenceImageUrl: frame.image_url, // Pass current image as reference`. `ImageGenerationService.ts:335-345` prepends that URL to `referenceImages`. So the current frame image IS sent (as a reference), the mask is NOT.
- Test: `backend/src/tests/image-generation.test.ts:171-191` ("should store job with correct initial state") asserts only the job row's `width`/`height`. No test inspects the Gemini request.

Consequence (code-proven): generated start/end frames are not constrained to the requested 16:9 or 9:16 by the request; the returned image is stored at whatever size the model returns (no post-resize). Inpaint requests reach the model as "current image + text", with no mask.

Wave-1 correction: none. Precision added: the inpaint job does send the current frame image as a reference.

---

## C13. Frame stuck in `generating` after failed job (V9)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-13`.

Evidence:
- Failure path does not touch frames: `backend/src/services/image-generation/ImageGenerationService.ts:549-583` (catch). Lines `:568-569` `await this.updateJobState(jobId, 'failed', {`; the only other table touched is `asset_angle_variants` (angle_variant jobs). Frames are updated only in the success branch `:516-535` (`status: 'generated'`).
- Frame is set to `generating` before the job: `frameGenerationService.ts:873` (`startFrameGeneration`) and `:1278` (`inpaintFrame`).
- The only failure resolver is the status endpoint: `backend/src/routes/frames.ts:484-515` (`GET .../frames/:frameId/status`) -> `frameGenerationService.ts:1365-1392` `getFrameJobStatus`, which calls `onJobFailed` only when polled (`:1381-1382`). `onJobFailed` (`:1430-1437`) sets `status: 'rejected'`.
- No frontend caller: `grep -rn "pollFrameStatus\|pollUntilComplete" src` returns `frameService.ts:569` (definition), `:593` (definition), `:613` (self-call inside pollUntilComplete). `grep -rn "/status" src` returns only `frameService.ts:577` (the same definition). Zero callers of pollUntilComplete or pollFrameStatus.
- GET frames does not reconcile: `frameGenerationService.ts:137-200` (`fetchFramesForScene`) maps DB status only.
- Only DB trigger on frames is `updated_at`: `backend/migrations/019_frames_table.sql:113-125`.
- UI keeps polling: `src/components/pipeline/Stage10FrameGeneration.tsx:252-259` `refetchInterval: (query) => { ... return progress.generatingFrames > 0 ? 2000 : false; }`; `src/lib/services/frameService.ts:686` and `:710` (`generatingFrames++`).
- No test covers `getFrameJobStatus`, `onJobFailed`, or `pollFrameStatus` (grep over `backend/src/tests` and `src/**/__tests__`).

Consequence (code-proven): after a background start/end-frame failure the frame remains `generating` in the DB and the Stage 10 query keeps polling GET frames every 2 s, with no transition to `rejected` unless another client calls `/status`. The UI copy for that state is not verified (runtime).

Wave-1 correction: none.

---

## C14. Render confirm charges skipped shots; re-confirm duplicates; no refund (V10)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-14`.

Evidence:
- Scene total includes every shot: `backend/src/services/videoGenerationService.ts:221-222`: `const sceneTotalCostStandard = shotDetails.reduce((sum, s) => sum + s.imageCost + s.videoCostStandard, 0);` (fast variant at `:221`). `shotDetails` is built for all shots of the scene (`:109-215`).
- Charge uses that total: `confirmAndQueueRender` `:326` calls `getSceneCostBreakdown`; `:334` `hasSufficientCredits(userId, totalCost)`; `:394` `await userCreditsService.deductCredits(userId, totalCost);`.
- "Skipped" = no start frame URL, applied only at job insert: `videoGenerationService.ts:345` `if (!shot.startFrameUrl) { console.warn(...); continue; }`. Shots with an unapproved but present start frame are NOT skipped (only a warning, `:188-191`).
- Duplicate guard absent: `:381` `.insert(jobsToInsert)` with no idempotency key and no existing-job lookup; `video_generation_jobs` has no UNIQUE constraint (`grep -rln video_generation_jobs backend/migrations | xargs grep -n UNIQUE` returns 0 lines). Route `backend/src/routes/checkout.ts:91-145` has no existing-job check.
- Refund path absent: `grep -rn "addCredits(" backend/src` returns only the definition `userCreditsService.ts:126`. `deductCredits` has one caller (`videoGenerationService.ts:394`). `updateJobStatus` (`:462-515`) and `retryJob` (`:563-600`, sets status to queued, no credit call) do not touch `user_credits`.
- UI: total shown = same scene-wide sum (`src/components/pipeline/Stage11Confirmation.tsx:101-104`); confirm button disabled only while pending or balance < total (`:377`); `confirmMutation` (`:76-84`) invalidates `video-jobs` only.
- Tests: `grep -rln "confirmAndQueueRender\|confirm-render\|deductCredits\|getSceneCostBreakdown" backend/src/tests src e2e` returns nothing.

Consequence (code-proven): the user is charged for the displayed scene total including shots that produce no job; a second confirm inserts a second full set of jobs and deducts again; a failed render is never credited back. Ordering note: deduction happens after job insert (`:381` before `:394`), so a deduction error leaves queued jobs uncharged (code-only observation).

Wave-1 correction: none. Precision: "skipped shots" means shots with no start frame URL.

---

## C15. Re-approving script hard-deletes unmatched scenes, cascading (V3)

**Verdict: PARTIALLY CONFIRMED.** Ledger `R1b-FACT-15`.

The hard delete and cascade are confirmed. The claim's match key is incomplete: the route first matches slug:scene_number, then falls back to scene_number alone, and deletes only rows that match neither.

Evidence:
- Primary match: `backend/src/routes/projects.ts:1379` `let existing = existingSceneMap.get(key);` (key = `slug:sceneNumber`, map built `:1259-1264`).
- Fallback match: `:1381` `// Fallback match: scene_number only (handles slug variations between extractions)`; `:1383` `existingByNumber.get(scene.sceneNumber)`.
- Delete set: `:1420-1422` `const deletedScenes = (existingScenes || []).filter(scene => !matchedExistingIds.has(scene.id));`
- Delete call: `:1430-1433` `.delete().in('id', deletedIds)`; error logged and ignored at `:1438` `// Continue anyway - this is a warning, not a blocker`.
- Service-role client (RLS bypass): `backend/src/config/supabase.ts:10` `SUPABASE_SERVICE_ROLE_KEY`.
- Cascade: all 7 `REFERENCES scenes(id)` FKs are `ON DELETE CASCADE`. `grep -rn "REFERENCES scenes" backend/migrations` = 7 hits: `006_shots_table.sql:7`, `007_image_generation_jobs.sql:13`, `015_scene_asset_instances.sql:15`, `021_video_generation_jobs.sql:10`, `024_scene_asset_suggestions.sql:6`, `030_transformation_events.sql:17`, `039_shot_location_identity.sql:88`. Shots -> frames cascade: `019_frames_table.sql:8`.
- Trigger: Stage 4 approval calls the PUT on EVERY approval, not only re-approval: `src/components/pipeline/Stage4MasterScript.tsx:607-615` (`proceedWithApproval` -> `scriptService.persistScenes`), called from `:637` (after downstream warning) and `:681` (normal path). Downstream warning only when `isStage4Locked` AND downstream data exists: `:670-676` (`setShowDownstreamWarning(true)` at `:675`).
- UI copy: `Stage4MasterScript.tsx:1234` `<li>Deleted scenes will be marked as <code ...>continuity_broken</code></li>`. Code: `grep -rn "continuity_broken" backend/src | grep -v tests` returns only `continuityRiskAnalyzer.ts:22,54,78-79` (read/classify). No writer.
- No test: no test references `persistScenes`, `PUT /:id/scenes`, or "Scene ID Stability".

Consequence (code-proven): a scene row is hard-deleted, with its shots, frames, video jobs, image jobs, asset instances and shot-location rows, only when its scene_number is absent from the new extraction. A slug change alone does not delete it. The warning dialog does not gate the delete itself. The delete is not transactional with the following updates and inserts.

Wave-1 correction: none. `WD-IMPL-STATE-0028` (V3) already states the fallback correctly and labels the `continuity_broken` copy CONTRADICTED. The C15 paraphrase is the imprecise part.

---

## C16. LangSmith callbacks never attach; `stage_states.langsmith_trace_id` never written (E)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-16`.

Evidence:
- Import and gate: `backend/src/services/llm-client.ts:8` `import { getLangchainCallbacks } from 'langsmith/langchain';`; `:151-161`: callbacks requested only if `process.env.LANGSMITH_API_KEY && process.env.LANGSMITH_TRACING === 'true'`; `:157` `callbacks = await getLangchainCallbacks();`; `:158-160` `catch (tracingError) { console.warn('[LLM] LangSmith tracing not available, continuing without tracing:', ...) }`.
- Invoke: `:163-165` `client.invoke(messages, { // callbacks, // simple implementation... ` / `...(callbacks && { callbacks }),`. Callbacks is therefore undefined whenever the explicit path throws.
- Why it throws: installed library `backend/node_modules/langsmith` version 0.4.4. `dist/langchain.js:20` `const runTree = currentRunTree ?? getCurrentRunTree();` (imports at `:9`). `dist/singletons/traceable.js:25-31`: `getCurrentRunTree(permitAbsentRunTree = false)` throws `"Could not get the current run tree..."` when the store is undefined. No `traceable` wrapper exists in backend code (`grep -rn "traceable\|getCurrentRunTree" backend/src` = 0 matches).
- Trace id: `llm-client.ts:179` `traceId = requestId;` (a UUID, not a LangSmith run id). Consequence of that: `langsmithTraceId` values in stage content are not LangSmith run ids (E-PROV-05).
- Column writer: `grep -rn "updateStageStateTraceId\|createStageState(\|getStageStatesByTraceId" backend/src backend/scripts src` returns 3 lines, all definitions in `backend/src/config/database.ts:69, 83, 109`. Zero callers.
- Stage-state insert payload has no trace column: `backend/src/routes/stageStates.ts:225-236` (`insertData` keys: branch_id, stage_number, version, status, origin, content, regeneration_guidance, created_by, inherited_from_stage_id).
- Column definition only: `backend/migrations/002_add_langsmith_fields.sql:5-9`.

Consequence (code-proven): explicit LangSmith wiring never attaches callbacks; when `LANGSMITH_TRACING=true` each generate call logs the warning. `stage_states.langsmith_trace_id` is always NULL. Whether LangChain's own env-driven tracer records runs is UNKNOWN statically (env not read).

Wave-1 correction: none. E-PROV-05 and E-DEAD-05 are correct. The mechanism is `getCurrentRunTree()` inside `getLangchainCallbacks()`, which is what C16 names.

---

## C17. Seed templates in two copies; created_by NULL rows editable by any user (E)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-17`.

Evidence:
- Two copies: `backend/src/routes/seed.ts:22-24, 69-71, 113-115` (treatment_expansion v1.0.0 stage 2; beat_extraction stage 3; master_script_generation stage 4) and `backend/scripts/seed-templates.ts:19-21, 90-92, 149-151` (same keys).
- Divergence, from `diff` of the two `const templates = [...]` blocks: about 88 differing lines (`grep -c "^[<>]"`). Distinguishing phrases: `grep -c "SUB-LOCATION"` = seed.ts 2 / seed-templates.ts 0; `grep -c "CONTINUOUS"` = 5 / 0; `grep -c "Return the response as JSON"` = 0 / 2 (`seed-templates.ts:45`, `:118`).
- NULL owner: both call `promptTemplateService.createTemplate(template)` with no user id (`seed.ts:193`, `seed-templates.ts:208`). `backend/src/services/prompt-template.ts:62-75` inserts `created_by: userId` (undefined -> NULL).
- Guard skipped on NULL owner: `prompt-template.ts:207` (updateTemplate), `:240` (deleteTemplate), `:375` (activateTemplate): `if (userId && existing.created_by && existing.created_by !== userId)`. activate then deactivates same-name rows (`:381-384`).
- Routes: `backend/src/routes/llm.ts:483` POST templates, `:566` PUT, `:613` DELETE, `:647` activate. No role check (`grep -rn "role\|isAdmin" backend/src/routes/llm.ts` returns nothing). Mounted behind auth only: `backend/src/server.ts:75` `app.use('/api/llm', authenticateUser, llmRouter);` and `:78` `app.use('/api/seed', authenticateUser, seedRouter);`.
- Update schema permits prompt text edits: `llm.ts:39-44` (`system_prompt`, `user_prompt_template`, `description`, `is_active`).
- Service-role client bypasses RLS: `backend/src/config/database.ts:1-4` (`public supabase = supabase`), `backend/src/config/supabase.ts:10`.
- RLS (for completeness, not enforced for backend): `backend/migrations/002_add_langsmith_fields.sql:43-53` (insert for auth, update/delete only `created_by = auth.uid()`).
- Live use: `llm.ts:153-171` (`generate-from-template`: `listTemplates({ name, activeOnly, limit: 1 })`); ordering `prompt-template.ts:144-190` (`stage_number`, `name`, `created_at DESC`). Frontend callers use `templateName` values `master_script_generation` (`src/lib/services/scriptService.ts:80,148`), `treatment_expansion` (`treatmentService.ts:72,81,137`), `beat_extraction` (`beatService.ts:56,132`).
- Frontend has no caller of `/api/llm/templates` (`grep -rn "api/llm/templates" src` returns nothing).
- Uniqueness: `002_add_langsmith_fields.sql:24-29` `UNIQUE(name, version)`, so the second seed run fails on duplicates and logs errors (no overwrite).
- No tests reference prompt-template ownership or the seed routes.

Consequence (code-proven): any authenticated API user can change the system prompt, user prompt, or active flag of seeded templates, and activation switches the live Stage 2-4 generation prompt for everyone. Which copy of seed text is in the deployed DB is UNKNOWN statically (whichever seed ran first).

Wave-1 correction: none. `E-FACT-14`, `E-FACT-16`, `WD-IMPL-CAP-0086`, `WD-IMPL-FACT-0033` are correct.

---

## C18. `shots.transformation_flags` unread; no automatic detection wired (V6)

**Verdict: PARTIALLY CONFIRMED.** Ledger `R1b-FACT-18` (labelled CONTRADICTED because of `WD-IMPL-CAP-0192`).

"Nothing reads it" is confirmed for logic. "No automatic transformation detection" is not accurate: detection by the LLM runs automatically during Stage 7 shot extraction. What is not wired is turning those flags into `transformation_events`.

Evidence:
- Automatic trigger: `src/components/pipeline/Stage7ShotList.tsx:170-178`: when `fetchShots` returns none, it calls `shotService.extractShots` ("No shots exist, auto-extract"). Service: `src/lib/services/shotService.ts:105-113` -> `POST .../shots/extract`. Route: `backend/src/routes/projects.ts:1711`.
- LLM prompt asks for flags: `backend/src/services/shotExtractionService.ts:257` `- Set transformation_flags on the shot where the change occurs`; `:282` JSON schema with `transformation_flags`.
- Parsed: `shotExtractionService.ts:374-389`.
- Written: `backend/src/routes/projects.ts:1928` `transformation_flags: shot.transformationFlags ? JSON.stringify(shot.transformationFlags) : null,`. Column: `backend/migrations/030_transformation_events.sql:135` (ADD COLUMN JSONB); `:150` COMMENT "Raw LLM detection output from Stage 7 shot extraction (staging data)".
- Returned but not consumed: `projects.ts:1559` GET shots uses `.select('*')`, so the column is in the JSON payload. `grep -rn "transformation_flags\|transformationFlags" backend/src src | grep -v tests` returns 11 lines: 6 backend writer/parser lines, 1 test, and `src/types/scene.ts:73` (type field only). No reader.
- Events created only manually: the only insert is `backend/src/services/transformationEventService.ts:251-252` (inside `createTransformationEvent` `:237`), called from `backend/src/routes/sceneAssets.ts:1832` (POST transformation-events). Frontend creators send `detected_by: 'manual'`: `src/components/pipeline/Stage8/VisualStateEditorPanel.tsx:270`, `ConvertToTransformationDialog.tsx:125`.
- Enum accepts but nothing writes: `sceneAssets.ts:1793` `z.enum(['stage7_extraction', 'stage8_relevance', 'manual'])`; `grep -rn "stage7_extraction\|stage8_relevance"` outside declarations returns nothing.
- Dead UI branch: `src/components/pipeline/Stage8/TransformationEventCard.tsx:91-93` `{event.detected_by !== 'manual' && !isConfirmed && (... "AI Detected" ...)}`. No writer produces a non-manual value.
- Test: `backend/src/tests/transformationFlagParsing.test.ts:5,34` simulates the parser ("Simulates the transformation_flags parsing logic"); it does not import `shotExtractionService`.

Consequence (code-proven): every Stage 7 auto-extraction persists LLM transformation flags into `shots.transformation_flags`, which the API returns and no UI or service reads; no transformation event is created from them; the "AI Detected" badge cannot appear with current writers.

Corrections:
- `WD-IMPL-CAP-0192` (V6), title "Stage 3 and 7 derived shot transformation flags (not consumed)": labelled CONTRADICTED. Stage 3 (beat/treatment code) produces no flags; `grep -rln transformation backend/src/services` shows no beat or treatment service. Corrected: "Stage 7 shot extraction derives transformation flags (not consumed)."
- The C18 phrase "no automatic transformation detection wired" is imprecise, as above.

---

## C19. Streamline commit ignores formatChoice; not idempotent on retry (V4)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-19`.

Evidence:
- `formatChoice` is client-only: `grep -rn formatChoice backend/src` = 0. In `src` it appears only in `src/components/pipeline/streamline/StreamlineDropZone.tsx` (43, 128, 138, 246-248, 403, 411) and `src/lib/utils/__tests__/streamlineRouting.test.ts:109`.
- Default: `StreamlineDropZone.tsx:128` `const defaultFormatChoice = result.classification.confidence >= 0.75 ? 'as-is' : 'ai-format';` (set at `:138`); no format call on default (`runAiFormat` runs only from `setFormatChoice`, `:246-250`: `if (formatChoice === 'ai-format' && !file.formattedText && !file.formattedBeats) { void runAiFormat(file); }`). `setFormatChoice` does NOT clear `formattedText` when switching to as-is.
- Commit payload has no formatChoice: `src/components/pipeline/Stage1InputMode.tsx:474-481` (`stageTransitions, projectConfig, stage1Draft, assets?, resolutions?, resolutionEdits?`).
- Content chosen by presence: `src/lib/utils/streamlineRouting.ts:168` `const content = file.formattedText ?? file.text ?? '';` (treatment) and `:176-180` (`if (file.formattedBeats)` for beat sheet).
- Route: `backend/src/routes/streamline.ts:45-86`; `payload` assembled `:58-66` without formatChoice; `supabase.rpc('streamline_commit_atomic', { payload })`.
- RPC chain: `backend/migrations/044_streamline_atomic_intake_fix.sql:38` `streamline_commit_atomic`: project update, Stage 1 draft `INSERT` at `:86`, delegation `RETURN streamline_commit(payload - 'project_config' - 'stage_1_draft');` at `:98`. `backend/migrations/043_intake_resolutions.sql:137` `streamline_commit` (latest definition): per-transition `INSERT INTO stage_states` at `:339`; assets `INSERT INTO project_assets` at `:370`; resolutions `INSERT INTO intake_resolutions` at `:402`. The `:220` draft insert in 043 is not reached on the commit path because 044 strips `stage_1_draft` before delegating.
- No idempotency: no key in payload; no existence check before the INSERTs. Uniqueness: `backend/migrations/008_global_assets.sql:47` `CREATE TABLE project_assets` has no UNIQUE on name (sed range over the CREATE TABLE block shows none); `intake_resolutions` (`043_intake_resolutions.sql:19`) has no UNIQUE.
- Retry trigger: `Stage1InputMode.tsx:474` commit, then `:497` `await scriptService.persistScenes(...)` after the RPC; a throw there goes to `:508` `setStreamlineError(...)`, and the Confirm button can be pressed again. (The RPC itself is one transaction, so a failed RPC rolls back fully.)
- Tests: `streamlineRouting.test.ts:101` "uses the AI-formatted text over the raw text when present" covers ai-format only. No test of as-is-after-format, of the RPC, or of commit idempotency.

Consequence (code-proven): (a) an "as-is" choice made after an AI-format run still commits the AI text (presence check), and a file whose default is "ai-format" but was never formatted commits raw text; (b) a retry after a server-side successful commit inserts a second Stage 1 draft version, new stage versions, new `project_assets` rows and new `intake_resolutions` rows.

Wave-1 correction: none. Precision added on (a) and (b).

---

## C20. project asset `locked` has no unlock path; image regeneration not blocked (V5)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-20`.

Evidence:
- Writers of `locked = true`: `backend/src/routes/projectAssets.ts:1565` (POST `/:assetId/lock`, route `:1527`), `:1729-1730` (POST `/lock-all`, route `:1675`), and `backend/src/routes/sceneAssets.ts:933` (`create-with-project-asset`, route `:885`, insert with `locked: true`).
- Writers of `locked: false`: insert payloads only: `projectAssets.ts:127`, `:351`, `:1052`, `:1187`, `:1962`. `grep -rn "locked: false\|\.update({ locked" backend/src` returns only those plus the two lock writers. No route, service, or migration sets `false` after insert.
- Stage unlock does not touch assets: `backend/src/routes/stageStates.ts:523` onward writes `projects` and `stage_states` only.
- Callers: `src/components/pipeline/Stage5Assets.tsx:778` `lockAllAssets` then `stageStateService.lockStage(projectId, 5)` (`:779`). Per-asset `lockAsset` (`src/lib/services/projectAssetService.ts:433`) has zero callers (`grep -rn "lockAsset(" src` = definition only). Stage 8 create: `src/components/pipeline/Stage8VisualDefinition.tsx:656-675` -> `sceneAssetService.createSceneAssetWithProjectAsset` (`src/lib/services/sceneAssetService.ts:80-91`); button at `src/components/pipeline/Stage8/SceneAssetListPanel.tsx:523`.
- Enforced checks (locked): PUT text fields `projectAssets.ts:585-588` (`isAllowedWhenLocked` ... `'Cannot modify locked asset'`); DELETE `:704`; merge `:771`; split `:1017-1018`; sync-from-global `:2084-2086`.
- Not enforced: generate-image `:1210-1287`, upload-image `:1288-1379`, edit-image `:1436-1526`, clear-all-images `:1631-1674`. Each has no `locked` reference (checked with `awk` over each range; the only `locked` references in `:1210-1700` are `:1484` (style id), `:1563-1576` (lock route), `:1695` (lock-all select)).
- Frontend never reads the field: `grep -rn "\.locked\b" src --include=*.ts --include=*.tsx | grep -v __tests__` returns nothing; `src/types/asset.ts:32` declares `locked: boolean`; the other `locked` hits in non-test `src` are method names (`lockAsset`, `lockAllAssets`) and stage-level `isLocked`/`stageStatus` props.
- Tests: `backend/src/tests/assetTypeAndMerge.test.ts:105` (locked type change allowed), `:133` (locked deferred allowed), `:372` ("should reject merge with locked asset"). No test for image routes or unlock.

Consequence (code-proven): once Stage 5 completes, every active asset is locked permanently in the DB; text edits, delete, merge, split and sync return 400. Image generation, upload and edit routes do not check the flag. Stage 8-created assets are locked from creation, so their text is also uneditable server-side.

Wave-1 correction: none. `WD-IMPL-STATE-0036`, `WD-IMPL-ROUTE-0050`, `WD-IMPL-FACT-0070` are correct. Addition: Stage 8 creation path produces locked assets (`sceneAssets.ts:933`).

---

## C21. `/projects/new` 404 on lock; Dashboard onNewProject TODO (V1)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-21`.

Evidence:
- Route: `src/App.tsx:101-110` `/projects/:projectId` -> `ProjectView`. No `/projects/new` route; `new` matches `:projectId`. No link navigates there. The only code that sets `'new'` is `src/pages/Index.tsx:21-23`, and `grep -rln "pages/Index" src` returns nothing (dead file; `src/main.tsx` imports `App`).
- Create path when reached: `src/components/pipeline/Stage1InputMode.tsx:180` `handleComplete`; `:207-215` `if (projectId === 'new') { project = await projectService.createProject(...) }`; `:278-281` `saveStageState(project.id, 1, { status: 'draft' })`; `:291` `onComplete()`. No navigate/redirect (`grep -n "navigate\|window.location" Stage1InputMode.tsx` returns nothing).
- Lock with stale id: `Stage1InputMode.tsx:893-895` `onComplete={() => handleStageComplete(1)}`; `src/pages/ProjectView.tsx:446-449` `await stageStateService.lockStage(projectId!, stageNumber);` where `projectId` = `'new'`. Client throws on non-OK (`src/lib/services/stageStateService.ts:153-165`). Catch shows toast (`ProjectView.tsx:472-476`, toast at `:474`).
- Server: `backend/src/routes/stageStates.ts:315-323` `.eq('id', projectId)` on uuid column; `if (projectError) return res.status(404).json({ error: 'Project not found' })`.
- Hydration skipped for `'new'` (`ProjectView.tsx:313-316`).
- Dashboard TODO: `src/App.tsx:59-62` `const handleNewProject = () => { // TODO... console.log(...) }` passed as `onNewProject` (`App.tsx:68`). `src/pages/Dashboard.tsx:16` declares, `:19` destructures, and no call site exists in the file. Real flow: `Dashboard.tsx:120` `NewProjectCard onClick` -> `setNewProjectDialogOpen(true)` -> `src/components/dashboard/NewProjectDialog.tsx:37-45` `projectService.createProject({ title })` -> `Dashboard.tsx:51-56` `handleProjectCreated` -> `onProjectSelect(projectId)` -> navigate to `/projects/:id`.

Consequence (code-proven): via typed URL `/projects/new`, the project row and stage-1 draft are created under the real id, the lock request uses `new` and fails, the toast reads "Failed to complete stage. Please try again.", and the user remains on the `new` view with no navigation to the created project. The Dashboard path is unaffected.

Wave-1 correction: none. `WD-IMPL-FACT-0008`, `WD-IMPL-FACT-0010`, `WD-IMPL-DEAD-0005` are correct. Precision: the TODO is real but unreachable from the UI.

---

## C22. text_field_versions RLS open to anon (C)

**Verdict: CONFIRMED.** Ledger `R1b-FACT-22`.

Evidence:
- `backend/migrations/036_text_field_versions.sql:5-16`: table with `entity_type` (`shot`|`scene_asset_instance`), `entity_id` UUID (no FK), `field_name`, `content`, `is_selected`, `source`, `version_number`, `created_at`. No owner or user column.
- `:27` `ALTER TABLE text_field_versions ENABLE ROW LEVEL SECURITY;`
- `:29-34`:
  ```
  -- Allow authenticated users full access (project ownership checked at API layer)
  CREATE POLICY "Users can manage text field versions"
    ON text_field_versions
    FOR ALL
    USING (true)
    WITH CHECK (true);
  ```
  No `TO` clause.
- Repo-wide: `grep -rniE "\bto (authenticated|anon|public)\b" backend/migrations backend/quickies-sql` = 0. `grep -rn "CREATE POLICY" backend/migrations | wc -l` = 87; `grep -rn "USING (true)" backend/migrations` = 1 (036:33). `grep -rn "GRANT\|REVOKE" backend/migrations backend/quickies-sql` = 0. No later migration touches the table (`grep -rln text_field_versions backend/migrations backend/quickies-sql backend/scripts` = 036 only).
- Client: `src/lib/supabase.ts:5,11` builds the browser client with `VITE_SUPABASE_ANON_KEY`. No frontend reference to `text_field_versions` (`grep -rn text_field_versions src` = 0).
- Backend users: `backend/src/services/textFieldVersionService.ts:46,75,83,112,124` via the service-role client (`backend/src/config/supabase.ts:10`), which bypasses RLS.

Consequence (code-proven, static): a PostgREST request using only the anon key can select, insert, update and delete any `text_field_versions` row, because PUBLIC policies with `USING (true)` admit anon, and nothing in the table identifies an owner. The API-layer ownership check that the comment describes does not protect direct PostgREST access. Whether the deployed database has matching grants or additional policies is UNKNOWN statically; exercising it would need a live target, which this slice did not do.

Wave-1 correction: none. `WD-IMPL-FACT-0146` (C-FACT-06) and `WD-IMPL-TABLE-0053` (C-TABLE-25) are correct on the policy. C-TABLE-25 also states "cap 8" (version cap); not checked here (out of slice).

---

## Cross-slice references (seen, not verified in depth)

- `backend/src/routes/projects.ts:1559` GET shots returns `select('*')` including `transformation_flags` (V6/V8 slice).
- `backend/src/routes/sceneAssets.ts:885,933` create-with-project-asset inserts `locked: true` (V6 `WD-IMPL-FACT-0070`, consistent).
- `backend/src/services/image-generation/ImageGenerationService.ts:335-345` prepends `referenceImageUrl` for frame inpaint (V9).
- `backend/src/routes/stageStates.ts:523-668` Phase A unlock writes only `projects` and `stage_states` (V1 slice, relevant to C20).
- `backend/src/config/database.ts:1-4` `DatabaseService.supabase` is the service-role client, which is why RLS does not apply to any backend path (V1 `WD-IMPL-FACT-0002`).
- `src/components/pipeline/Stage7ShotList.tsx:170-178` auto-extracts shots on mount when none exist (V8 slice).
- `backend/src/services/transformationEventService.ts:237-270` manual-only event creation (V6 slice).
- `src/pages/Index.tsx` is not imported (dead file). Its `handleNewProject` sets `'new'`; relevant to C21 only.

## Contradictions / unknowns

- UNKNOWN: whether `LANGSMITH_TRACING` is `'true'` in any deployed environment (env not read). Outcome for C16 is the same either way (explicit callbacks never attach). LangChain's own env-driven tracer behaviour is UNKNOWN statically.
- UNKNOWN: which seed copy is live in `prompt_templates` (the table content is not in the repo; UNIQUE(name, version) means the first run wins). Settle by reading the live table.
- UNKNOWN: deployed GRANTs and any additional policies on `text_field_versions`; settle by inspecting `information_schema.role_table_grants` and `pg_policies` on the live DB (read-only), which this slice did not do.
- UNKNOWN: the exact Stage 10 UI rendering of a stuck `generating` frame (runtime only).
- UNKNOWN: whether Gemini returns images at the requested 16:9 or 9:16 dimensions (runtime only; code proves the request does not specify it).
- UNKNOWN: the exact HTTP status Supabase returns for `.eq('id','new')` on a uuid column. Code maps any `projectError` to 404 (`stageStates.ts:322-323`), so the route answer is 404 regardless.
- Contradiction (code vs UI copy): Stage 4 dialog promises `continuity_broken` marking of deleted scenes (`Stage4MasterScript.tsx:1234`); no backend writer exists.
- Contradiction (intent vs SQL): `036_text_field_versions.sql:29` comment says authenticated only; the policy has no `TO` clause.
- Contradiction (UI vs API): `TransformationEventCard.tsx:91` has an "AI Detected" branch that no current writer can reach.
- Contradiction (wave-1 CAP-0192): "Stage 3" in the title; no Stage 3 code writes flags.

## Commands used (all read-only)

- `sed -n` / `grep -n` for every cited line range (re-checked after drafting).
- `grep -rn "getCurrentRunTree" backend/src` (0); `grep -n "getCurrentRunTree" backend/node_modules/langsmith/dist/langchain.js backend/node_modules/langsmith/dist/singletons/traceable.js`.
- `grep -rn "updateStageStateTraceId\|createStageState(\|getStageStatesByTraceId" backend/src backend/scripts src` (3 definition lines, 0 callers).
- `grep -rn "REFERENCES scenes" backend/migrations` (7, all ON DELETE CASCADE).
- `grep -rn "continuity_broken" backend/src | grep -v tests` (read/classify only).
- `diff <(sed -n '/const templates = \[/,/^  \];/p' backend/src/routes/seed.ts | sed 's/^ *//') <(sed -n '/const templates = \[/,/^  \];/p' backend/scripts/seed-templates.ts | sed 's/^ *//') | grep -c "^[<>]"` (88).
- `grep -rn "inpaintImage(" backend/src`; `grep -rn "maskDescription\|sourceImageUrl" backend/src`; `grep -rn "addCredits(" backend/src` (0 callers); `grep -rn "pollUntilComplete\|pollFrameStatus" src` (0 external callers).
- `grep -rniE "\bto (authenticated|anon|public)\b" backend/migrations backend/quickies-sql` (0); `grep -rn "CREATE POLICY" backend/migrations | wc -l` (87); `grep -rn "USING (true)" backend/migrations` (1); `grep -rn "GRANT\|REVOKE" backend/migrations backend/quickies-sql` (0).
- `grep -rn formatChoice backend/src` (0); `grep -rln formatChoice src` (2 files).
- `grep -rln "pages/Index" src` (0).
- `grep -rn "locked: false\|\.update({ locked" backend/src`; `awk` over `projectAssets.ts` ranges 1210-1700 for `locked`.

No file in the repo was edited. Only `reports/R1b-verification.md` and `reports/R1b-verification.ledger.jsonl` were written.
