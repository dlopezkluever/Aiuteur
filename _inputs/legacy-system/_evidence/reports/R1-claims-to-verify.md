# Contradiction / weak-claim list for reporter R1 (each must be settled with code evidence)

C01 (V2,V9) Frame code queries `stage_states.state_data` by `project_id`, columns that do not exist; so visual style capsule never reaches frame image jobs. Check backend/src/services/frameGenerationService.ts and routes/frames.ts and the stage_states migration columns.
C02 (V2) `projects.writing_style_capsule_id` / `visual_style_capsule_id` are read in ~5 places but never written by any code. Grep all writers (insert/update payloads, RPCs, SQL functions) across backend and src.
C03 (V1) Phase A unlock warning dialog never opens: backend nests impact data under `details` but ProjectView reads top-level. Verify in stageStates.ts unlock response vs src/pages/ProjectView.tsx.
C04 (V1,C,V8) `scenes.stage_locks`, tables `videos` and `invalidation_logs` are queried by code but created by no migration (only quickies SQL or nowhere). Verify existence in migrations/quickies for each; list every code reference and how errors are handled.
C05 (V8 vs C) Shot lock is frontend-only per V8 (no shot mutation route checks `shot_list_locked_at`), but migration 014 adds a DB trigger. Verify what the trigger enforces and whether routes using service-role bypass it.
C06 (V8) Express route shadowing: `DELETE /shot-assignments/all` registered after `DELETE /:assignmentId`. Verify order and match semantics in shotAssignments.ts.
C07 (V7) Two location classifiers: route uses threshold 0.72 and can return ambiguous; composition service uses 0.8 and never does. Verify both and what each feeds.
C08 (C) Migration runner `backend/scripts/run-migrations.ts` calls an `exec` RPC that no migration defines and splits on ';'. Verify; also verify migration 005 partial UNIQUE syntax claim, and the duplicate numbers 022/024 ordering.
C09 (C) Frontend sends project type `audio-visual`, DB check expects `audio_visual`. Verify both sides.
C10 (V3,V6) `storyContextService` reads treatment keys that do not exist in stored stage 2/3 content, so treatment context is always empty. Verify against what Stage2/3 actually save.
C11 (V5) Extraction sends the model no script text (names/types/scene numbers/style only). Verify the exact payload in assetExtractionService.ts.
C12 (V9) Aspect ratio stored on image job but never sent to gemini-2.5-flash-image; inpaint masks stored but never sent. Verify in NanoBananaClient/ImageGenerationService.
C13 (V9) Frame status `generating` never resolves after a failed job (UI polls GET /frames, never calls /status). Verify.
C14 (V10) Confirm-render charges full scene total incl. skipped shots, re-confirm duplicates jobs and charges; no refund on failure. Verify userCreditsService + checkout.ts.
C15 (V3) Re-approving the script hard-deletes scenes not matched by slug+number, cascading to shots/frames/videos. Verify the matching and deletes in projects.ts PUT scenes and FK cascades in migrations.
C16 (E) LangSmith explicit callbacks never attach (getCurrentRunTree throws); stage_states.langsmith_trace_id never written. Verify.
C17 (E) Seed templates exist in two diverging copies; `prompt_templates` rows with created_by null editable/deletable by any authenticated user. Verify seed-templates.ts vs routes/seed.ts, and llm.ts template routes' authorization.
C18 (V6) Nothing reads shots.transformation_flags; no automatic transformation detection wired. Grep readers/writers.
C19 (V4) Streamline commit ignores `formatChoice`, and commit is not idempotent on retry. Verify in streamlineReconciliation/commit RPC/route.
C20 (V5) project asset `locked` has no unlock path and image regeneration is not blocked by lock. Verify.
C21 (V1) `/projects/new` creates a project then stage-1 lock 404s; Dashboard onNewProject is a TODO. Verify the actual creation flow.
C22 (C) text_field_versions RLS open to anon role. Verify policy text.
