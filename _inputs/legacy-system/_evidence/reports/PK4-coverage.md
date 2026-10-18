# PK4 coverage: product-knowledge GEN and AV ideas against code

Scope: WD-IDEA-GEN and WD-IDEA-AV ids from `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md` (used as a search checklist only). Code searched: backend/src, src, backend/migrations, backend/scripts. Evidence: merged2 WD-IMPL ids and file:line reads. Relations: see reports/PK4-relations.jsonl.

## Totals

- Ideas in scope: 280 unique ids (GEN 217, AV 63). The assignment figures (GEN 239, AV 72) do not match the ledger: grep finds 217 unique GEN ids (max number 295) and 63 unique AV ids. Every id found was clustered.
- Clusters: 84. Every idea id lands in exactly one cluster (unassigned: 0; duplicates: none, checked by build). The count is above the typical 25 to 60 range because each cluster carries exactly one relation; merging ideas with different relations (for example a CONTRADICTED claim into a PARTIAL cluster) would hide the contradiction.
- New FACT ledger entries: 14 (PK4-FACT-01 to PK4-FACT-14).
- Distinct WD-IMPL ids cited in relations: 121. Code evidence citations: 245.

## Counts per relation

| Relation | Clusters | Ideas |
|---|---:|---:|
| EXACT_MATCH | 18 | 66 |
| PARTIAL_MATCH | 24 | 67 |
| NOT_IMPLEMENTED | 29 | 120 |
| CONTRADICTED_BY_CODE | 12 | 20 |
| UNKNOWN | 1 | 7 |

## Cluster table

| # | Cluster | Ideas | Relation | Impl ids |
|---:|---|---:|---|---|
| 1 | Core model: separate frame and video prompts; frame defines look, video defines action; anchor-frame video contract; ingredients order | 11 | EXACT_MATCH | WD-IMPL-AI-0006, WD-IMPL-AI-0009, WD-IMPL-AI-0080, WD-IMPL-PROV-0027 |
| 2 | Prompt writing mechanism and context assembly for Stage 9 prompts (who writes, what it is built from, inputs) | 6 | PARTIAL_MATCH | WD-IMPL-AI-0006, WD-IMPL-AI-0009, WD-IMPL-PRESSURE-0032, WD-IMPL-CAP-0232 |
| 3 | Stage 9 prompts are template-built and structured (deterministic) rather than free-form | 1 | CONTRADICTED_BY_CODE | WD-IMPL-AI-0006, WD-IMPL-AI-0009, WD-IMPL-DEAD-0034 |
| 4 | Prompt engine: elevate rough intent, classify request type, clarify or ask, record assumptions, debug and production modes, plain-language and emotion-to-cue rules, prompt-level control | 11 | NOT_IMPLEMENTED | - |
| 5 | Frame prompt structure: five-part formula, frozen-frame rule, character anchoring to references, end frames have own prompts | 7 | EXACT_MATCH | WD-IMPL-AI-0006, WD-IMPL-AI-0007 |
| 6 | Frame prompt detail: subject appearance from scene description with status tags, body language, choreography, implied framing | 4 | PARTIAL_MATCH | WD-IMPL-AI-0006 |
| 7 | Lighting, colour and style directives in frame prompts (mood vocabulary, continuity descriptors, style capsule, non-photoreal and diegetic text) | 5 | PARTIAL_MATCH | WD-IMPL-CAP-0073, WD-IMPL-CAP-0071, WD-IMPL-AI-0008 |
| 8 | Labeled frame-prompt components, frame-prompt checklist, video self-test, checklists, visual-detail exception | 5 | NOT_IMPLEMENTED | - |
| 9 | Video prompt contract: motion and sound only, never visual truth; four-part structure; animating a supplied image | 6 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 10 | Video prompt action rules: verbs, camera and action timing, facial and blocking detail, per-shot config fields | 3 | PARTIAL_MATCH | WD-IMPL-AI-0009, WD-IMPL-FACT-0106 |
| 11 | Per-prompt model compatibility tags, length gating and start-only versus start+end display | 3 | PARTIAL_MATCH | WD-IMPL-AI-0006, WD-IMPL-CAP-0243 |
| 12 | Audio-driven prompt variants (sync-first video prompts, audio-first frames) and end-frame-aware video wording | 3 | NOT_IMPLEMENTED | WD-IMPL-FACT-0146 |
| 13 | Veo and image request controls: negative prompts, subtitle negatives, per-request audio toggle, crop planning, looping, slow motion, troubleshooting map, over-constrained prompt fallback | 8 | NOT_IMPLEMENTED | WD-IMPL-FACT-0204, WD-IMPL-FACT-0111 |
| 14 | Veo person-generation safety setting | 1 | PARTIAL_MATCH | - |
| 15 | Reproducibility: no seed sent, so regeneration varies | 1 | EXACT_MATCH | - |
| 16 | Open empirical and planning questions: model weaknesses, prompt-length quality effect, chaining rationale, drift and latency expectations, failure diagnosis, blocking re-test | 7 | UNKNOWN | - |
| 17 | Prompt length thresholds, validation before send, non-blocking warnings | 4 | PARTIAL_MATCH | WD-IMPL-FACT-0115 |
| 18 | Silent hard cap that truncates prompts (rejected) and limit-removal or limit-raising alternatives | 3 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0115 |
| 19 | Prompt redundancy with reference images, dynamic trimming, and stale video prompt flag when a frame changes | 3 | NOT_IMPLEMENTED | WD-IMPL-STATE-0070, WD-IMPL-INVALIDATE-0087 |
| 20 | Stage 9 editing and generation controls: read-only frame prompt by default with toggle, video always editable, bulk and single-shot generation with partial-failure reporting, surgical correction | 3 | EXACT_MATCH | WD-IMPL-CAP-0240, WD-IMPL-CAP-0241, WD-IMPL-AI-0078 |
| 21 | Stage 9 review affordances: prompt-role labels, frame tool with shot assets, per-shot reference uploads | 3 | PARTIAL_MATCH | WD-IMPL-CAP-0240, WD-IMPL-CAP-0232, WD-IMPL-CAP-0255 |
| 22 | No dedicated AI instructions for Stages 1, 6 and 10 to 12 | 1 | CONTRADICTED_BY_CODE | WD-IMPL-CAP-0256, WD-IMPL-AI-0007, WD-IMPL-AI-0008, WD-IMPL-AI-0078 |
| 23 | Frame workflow: approval and regeneration variants, uploads, End Frame deferral, end-frame-only deferral; Quick and Control modes; start-only path | 3 | EXACT_MATCH | WD-IMPL-CAP-0262, WD-IMPL-CAP-0249 |
| 24 | Shot-by-shot frame approval, three regeneration modes, own-image upload, end-frame generation and 'Don't show again' warning | 4 | EXACT_MATCH | WD-IMPL-CAP-0251, WD-IMPL-CAP-0252, WD-IMPL-CAP-0253, WD-IMPL-CAP-0255 |
| 25 | Frame generation scope, dependency enforcement and separate frame and video approval with regeneration counts | 3 | PARTIAL_MATCH | WD-IMPL-CAP-0248, WD-IMPL-INVALIDATE-0060, WD-IMPL-INVALIDATE-0062, WD-IMPL-STATE-0069 |
| 26 | Frame panel actions: approve, compare, inpaint with mask, edit prompts; inpaint tools; visual anchors from uploads and prior frames; frame reuse and pulled-in frame editing | 7 | PARTIAL_MATCH | WD-IMPL-CAP-0208, WD-IMPL-CAP-0209, WD-IMPL-CAP-0254, WD-IMPL-CAP-0264, WD-IMPL-FACT-0189 |
| 27 | Vision analysis of reference frame before camera change (cost and latency rationale) | 1 | PARTIAL_MATCH | WD-IMPL-AI-0012 |
| 28 | Post-generation checks: output checked against references, continuity drift detection, automated quality scoring, LLM judge, per-clip QC, smart regeneration and QA gates | 7 | NOT_IMPLEMENTED | - |
| 29 | Reference-load failures surfaced; preview and generation reference parity contract | 3 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0085, WD-IMPL-FACT-0086, WD-IMPL-FACT-0250 |
| 30 | Blocking and composition references: blocking control of framing and composition authority | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0099 |
| 31 | 3D world generation for blocking: lazy creation, quality and cost tiers, reuse of generated worlds | 3 | NOT_IMPLEMENTED | - |
| 32 | Asset images fed into frame generation; scene-instance image precedence; semantic reference roles with reason and source; persisted per-shot reference set reused at generation | 5 | EXACT_MATCH | WD-IMPL-CAP-0180, WD-IMPL-CAP-0179, WD-IMPL-STATE-0060, WD-IMPL-FACT-0164 |
| 33 | Reference budget (two to three sweet spot), reference overload, prioritisation and balance, missing-image warnings, output QC against references | 3 | NOT_IMPLEMENTED | - |
| 34 | Shot scoping and balancing of references; current image as highest priority separate style reference | 2 | PARTIAL_MATCH | WD-IMPL-FACT-0087 |
| 35 | Location delta descriptions and closest-direction fallback for imperfect angles | 2 | EXACT_MATCH | WD-IMPL-FACT-0084 |
| 36 | Start-frame continuity modes: match, camera change, reuse or edit base, fresh; same-direction base preserves framing | 2 | EXACT_MATCH | WD-IMPL-STATE-0056, WD-IMPL-STATE-0057, WD-IMPL-CAP-0204, WD-IMPL-CAP-0206, WD-IMPL-CAP-0207 |
| 37 | Use-as-reference toggle: shown only once an image exists; applies to all Stage 10 regeneration modes | 3 | EXACT_MATCH | - |
| 38 | Use-as-reference toggle coverage at regeneration points and transformation post-image default | 2 | PARTIAL_MATCH | - |
| 39 | Use-as-reference default state: ON in upload review and OFF elsewhere, or one consistent default | 2 | CONTRADICTED_BY_CODE | - |
| 40 | Settings and UI not implemented: session-wide reference default toggle; custom system prompts sidebar tab | 2 | NOT_IMPLEMENTED | WD-IMPL-DEAD-0049 |
| 41 | Asset image editing (image-to-image with instructions) and bulk generation with cost confirmation and partial-failure handling | 2 | EXACT_MATCH | WD-IMPL-AI-0051, WD-IMPL-CAP-0182, WD-IMPL-CAP-0176 |
| 42 | Automatic background-removal toggle and dedicated segmentation-based background removal | 3 | NOT_IMPLEMENTED | WD-IMPL-AI-0081 |
| 43 | Queued render is not edited in place; upstream changes invalidate affected work | 1 | CONTRADICTED_BY_CODE | WD-IMPL-INVALIDATE-0069, WD-IMPL-INVALIDATE-0072, WD-IMPL-INVALIDATE-0099 |
| 44 | Multiple video attempts per shot kept as versions; per-shot caps on variations and retries | 2 | PARTIAL_MATCH | WD-IMPL-STATE-0110, WD-IMPL-FACT-0131 |
| 45 | Video render statuses, error messages, and tracked async job lifecycle with failure step recorded; image job kinds | 3 | EXACT_MATCH | WD-IMPL-STATE-0075, WD-IMPL-STATE-0077, WD-IMPL-STATE-0109 |
| 46 | Long-render completion window of 30 to 45 minutes and provider timeout windows per modality | 2 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0140, WD-IMPL-FACT-0186 |
| 47 | Normalised completion event with notification and push-style reporting; audio render jobs | 3 | NOT_IMPLEMENTED | WD-IMPL-FACT-0307, WD-IMPL-PROV-0029 |
| 48 | Background handling of long generations: status, retry, cancellation, prioritisation, batching | 1 | PARTIAL_MATCH | WD-IMPL-PRESSURE-0009, WD-IMPL-FACT-0201 |
| 49 | Provider limit enforcement: shot duration only 4, 6 or 8 seconds, other values fail | 1 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0127 |
| 50 | Video editing and quality variants: object-level editing, draft and final resolution tiers, animatic preview | 3 | NOT_IMPLEMENTED | - |
| 51 | Model tier choice (fast versus standard) and single named video provider (Veo) for frame-to-video | 2 | EXACT_MATCH | WD-IMPL-CAP-0267, WD-IMPL-PROV-0027, WD-IMPL-PROV-0028 |
| 52 | Idempotent generation requests: duplicate submission never creates or charges a second job | 1 | CONTRADICTED_BY_CODE | WD-IMPL-STATE-0115, WD-IMPL-FACT-0126, WD-IMPL-FACT-0351 |
| 53 | Automatic retries counted separately from user retries, with error classification | 1 | PARTIAL_MATCH | WD-IMPL-FACT-0131, WD-IMPL-STATE-0103, WD-IMPL-FACT-0183 |
| 54 | One primary output selected from several provider variants | 1 | NOT_IMPLEMENTED | - |
| 55 | Multiple LLM providers with cost-aware routing and fallback; multi-model routing and capability matrix; enterprise custom model registration | 3 | NOT_IMPLEMENTED | WD-IMPL-PROV-0016, WD-IMPL-PROV-0021 |
| 56 | External automation layer and durable workflow engine for orchestration | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0065, WD-IMPL-FACT-0307, WD-IMPL-FACT-0308 |
| 57 | Provider-neutral generation interfaces and user-selectable video providers (Sora and Runway later) | 2 | PARTIAL_MATCH | WD-IMPL-PROV-0015, WD-IMPL-PROV-0012 |
| 58 | Provider-specific prompt formatting and prompt serialisation formats (YAML, JSON, XML-tagged, labelled text) | 5 | NOT_IMPLEMENTED | - |
| 59 | Cost recording and gating: estimated and actual cost stored per job; estimate on review screen before commit; block when credits insufficient | 3 | EXACT_MATCH | WD-IMPL-FACT-0120, WD-IMPL-CAP-0266, WD-IMPL-CAP-0270 |
| 60 | Cost rules: per-second video, per-image and per-token pricing, rules separated from outcomes | 2 | PARTIAL_MATCH | WD-IMPL-FACT-0123, WD-IMPL-FACT-0124, WD-IMPL-FACT-0181 |
| 61 | Cost awareness everywhere, credit deduction per generation, permanent cost record | 3 | PARTIAL_MATCH | WD-IMPL-CAP-0283, WD-IMPL-STATE-0114, WD-IMPL-STATE-0079 |
| 62 | Confirmation threshold before spend, gateway before every generation action, cost analytics, budget alerts | 2 | NOT_IMPLEMENTED | WD-IMPL-FACT-0184 |
| 63 | Render plan and spend caps: plan with variations and retries, reserve-then-settle holds, provider-call and wall-clock ceilings, loop breaker, default rate limits, kill switches | 6 | NOT_IMPLEMENTED | WD-IMPL-PRESSURE-0010, WD-IMPL-PRESSURE-0038 |
| 64 | No paid render starts without reservation, budget and ceiling; failed or aborted render costs nothing | 2 | CONTRADICTED_BY_CODE | WD-IMPL-STATE-0108, WD-IMPL-INVALIDATE-0105, WD-IMPL-FACT-0125 |
| 65 | Provenance and evaluation: exact prompt and template version per output; runtime-editable writing templates; replay with modified prompt; per-stage golden tests | 4 | PARTIAL_MATCH | WD-IMPL-DEAD-0103, WD-IMPL-AI-0068, WD-IMPL-AI-0069, WD-IMPL-AI-0070, WD-IMPL-TEST-0040 |
| 66 | End-to-end traces and prompt optimisation (A/B tests, prompt library, effectiveness scores) | 2 | NOT_IMPLEMENTED | WD-IMPL-DEAD-0046, WD-IMPL-DEAD-0047 |
| 67 | Dialogue in video prompt: exact words, speaker identity, delivery and voice direction; script-verbatim dialogue (implicit dialogue is an unused alternative) | 3 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 68 | Speaker-attributed dialogue format and emotional-arc performance direction | 2 | PARTIAL_MATCH | WD-IMPL-AI-0009 |
| 69 | Narration or voiceover as a separate dialogue type | 1 | NOT_IMPLEMENTED | - |
| 70 | Every video prompt carries an audio part; explicit silence when a beat should be quiet | 2 | EXACT_MATCH | WD-IMPL-AI-0009 |
| 71 | Sound design inferred from scene context when unspecified; layered SFX, ambience and music | 2 | PARTIAL_MATCH | WD-IMPL-AI-0009 |
| 72 | Native audio post-treatment (keep, refine, replace), lip-sync alignment in post, recorded performance and voice-acting workflows, recorded ad-lib override, voice-print transfer | 8 | NOT_IMPLEMENTED | WD-IMPL-FACT-0204, WD-IMPL-PROV-0029 |
| 73 | Character voice profiles, voice seeds, voice samples and dialogue-derived voice profiles | 4 | NOT_IMPLEMENTED | - |
| 74 | Audio-first projects, clip-extension workflow, and audio stage in the stage map | 3 | NOT_IMPLEMENTED | WD-IMPL-FACT-0146, WD-IMPL-FACT-0147, WD-IMPL-CAP-0240 |
| 75 | Clip length cap of about 8 seconds with sequencing of longer narratives | 1 | CONTRADICTED_BY_CODE | WD-IMPL-FACT-0127 |
| 76 | Scene review player: whole-scene playback with timeline and start-frame thumbnail shot list | 2 | PARTIAL_MATCH | WD-IMPL-CAP-0274, WD-IMPL-CAP-0275 |
| 77 | Review controls and status: play, pause, seek, skip, mute, fullscreen; retry failed jobs; empty and error states; completing a scene with warning | 4 | EXACT_MATCH | WD-IMPL-CAP-0273, WD-IMPL-CAP-0277, WD-IMPL-CAP-0279 |
| 78 | Issue categories, failure attribution and three resolution paths from review | 2 | CONTRADICTED_BY_CODE | WD-IMPL-CAP-0280, WD-IMPL-DEAD-0056 |
| 79 | Background rendering with sidebar progress, completion toast and email; render re-entry from notification or hub | 2 | PARTIAL_MATCH | WD-IMPL-CAP-0278, WD-IMPL-CAP-0282, WD-IMPL-CAP-0286 |
| 80 | Quality bar for assembled output (duration, audible dialogue, continuous motion, supportive sound) | 1 | NOT_IMPLEMENTED | - |
| 81 | Scene and project video export: MP4 at resolutions, settings dialog, export history, full-project concatenation; professional clip exports, EDL or XML timeline, bulk zip, asset package | 7 | NOT_IMPLEMENTED | WD-IMPL-CAP-0281 |
| 82 | Clip naming convention; Project Wrap folder layout, eligibility rules, take and role metadata, master timeline, import ordering | 7 | NOT_IMPLEMENTED | - |
| 83 | Project Wrap editorial package: deterministic layout, manifest and README, success and non-goal criteria, exclusions | 7 | NOT_IMPLEMENTED | - |
| 84 | Optional audio stems, project archival, professional formats and finishing, third-party integrations | 5 | NOT_IMPLEMENTED | WD-IMPL-CAP-0281 |

## Concepts the archaeology had missed or stated incorrectly

Each item is a code behaviour or absence that the merged ledger does not state, or states differently. PK4-FACT ids are in PK4.ledger.jsonl.

1. Silent LLM output truncation with a trailing ellipsis at 1200 and 500 characters, which can drop the video audio section (PK4-FACT-02). Wave-1 FACT-0115 records the limits only.
2. Veo request has no negative prompt, seed, resolution or audio toggle; the image provider interface declares negative prompt and seed that no caller sets (PK4-FACT-01).
3. Runway Gen-3 and Kling compatibility tags are computed and persisted with no integration and no reader (PK4-FACT-03).
4. Reference-load failures fall back to text-only generation with no record or message (PK4-FACT-09); reference count is uncapped (PK4-FACT-08).
5. Video-prompt call has no setting or scene-script input (PK4-FACT-11).
6. Stage 12 issue routing has no route to Stage 10 frames (PK4-FACT-04, relevant to AV-049).
7. Inpaint tools are brush and eraser only (PK4-FACT-05).
8. voice_profile_id column exists with no reader (PK4-FACT-06).
9. Shot-duration validator accepts up to 30 seconds while provider clamps to 8 (PK4-FACT-07).
10. Use-as-reference default differs between Stage 8 (ON) and Stage 10 (OFF) (PK4-FACT-10).
11. Warn-only prompt length in the UI (PK4-FACT-12), localStorage-only continuity-break suppression (PK4-FACT-13), and toast-only completion notice with no email (PK4-FACT-14).
12. Idempotency: the dedupe mechanism exists but frame and scene keys include Date.now(), and video confirm has no key at all (cluster GEN-243, wave-1 STATE-0115 confirmed).
13. Style capsule text reaches the frame prompt only if projects.visual_style_capsule_id is set, and no code writes that column (wave-1 CAP-0073 re-checked: confirmed).

## Wave-1 claims re-checked in this pass

- WD-IMPL-CAP-0073 (capsule never populated): confirmed.
- WD-IMPL-FACT-0085 and FACT-0250 (preview versus generation references): confirmed; preview is built at projects.ts:3410, generation reads persisted order written at projects.ts:3853.
- WD-IMPL-FACT-0189 (inpaint mask not transmitted): confirmed.
- WD-IMPL-FACT-0140 (Veo 5-minute poll): confirmed.
- WD-IMPL-FACT-0115 (limits differ): confirmed and extended (PK4-FACT-02, PK4-FACT-12).

## Ideas not clustered

None. Every GEN and AV idea id found in the ledger is in exactly one cluster.

## Limits of this pass

- Static reading only. Runtime behaviour, provider output quality, and whether LLM instructions are obeyed are UNKNOWN and are marked as such.
- Tests were checked by name and content only; no test was run. backend/src/tests/image-generation.test.ts needs a live database.
- The brief's expected counts (GEN 239, AV 72) differ from the ledger (217, 63); the clustering uses the ledger.
