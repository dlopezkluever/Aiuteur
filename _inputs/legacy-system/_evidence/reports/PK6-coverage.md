# PK6 coverage: WD-IDEA-SHOT and WD-IDEA-FLOW against the code

Scope: 305 ideas (WD-IDEA-SHOT 180, WD-IDEA-FLOW 125) from `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md`, used only as a checklist. Code searched: `src/`, `backend/src/`, `backend/migrations/`, `backend/scripts/`, `backend/quickies-sql/`, `package.json`, the `src/App.tsx` route list. Implementation ids are WD-IMPL entries from `merged2/merged.jsonl`. No product-knowledge statement was treated as evidence.

## Result counts

| Relation | Clusters | Ideas |
|---|---|---|
| EXACT_MATCH | 12 | 26 |
| PARTIAL_MATCH | 28 | 114 |
| NOT_IMPLEMENTED | 19 | 146 |
| CONTRADICTED_BY_CODE | 5 | 10 |
| UNKNOWN | 2 | 9 |
| Total | 66 | 305 |

Clusters by prefix: SHOT 28, FLOW 38. The count is above the typical 25-60 because two prefixes span 305 ideas; clusters were merged where a ledger section shares one concept and split where the relation differs (for example, the Streamline landing and the Stage 10 gate).

The 146 NOT_IMPLEMENTED ideas are mostly the CineBlock 3D studio and previs items (SHOT-106 through SHOT-204, with a few exceptions noted in the relations file). No 3D library, studio route, mannequin, viewfinder, capture or blocking output exists anywhere in the tree (see the searched lists in the relations file).

## Cluster table

| # | Cluster | Ideas | n | Relation | WD-IMPL n |
|---|---|---|---|---|---|
| 1 | Shot list role, auto-extraction on empty scene, extraction quality | SHOT-001, SHOT-002, SHOT-008, SHOT-009 | 4 | PARTIAL_MATCH | 5 |
| 2 | Previous-scene handoff and continuity notes in shot list | SHOT-004, SHOT-005 | 2 | PARTIAL_MATCH | 3 |
| 3 | Import of supplied shot lists or storyboard packages | SHOT-010 | 1 | NOT_IMPLEMENTED | 0 |
| 4 | Shot unit, atomic action, duration and clip-length rules | SHOT-011, SHOT-012, SHOT-013, SHOT-014, SHOT-015, SHOT-016, SHOT-017, SHOT-018 | 8 | PARTIAL_MATCH | 2 |
| 5 | Shot record fields, IDs, end-frame toggle | SHOT-019, SHOT-020, SHOT-021, SHOT-029 | 4 | PARTIAL_MATCH | 7 |
| 6 | Character placement, dialogue extensions, setting attribution | SHOT-022, SHOT-023, SHOT-024, SHOT-025, SHOT-026, SHOT-027, SHOT-037 | 7 | PARTIAL_MATCH | 3 |
| 7 | Camera language vocabulary, lens, movement meaning, structured metadata | SHOT-030, SHOT-031, SHOT-032, SHOT-033, SHOT-034, SHOT-038, SHOT-039, SHOT-041 | 8 | PARTIAL_MATCH | 2 |
| 8 | Static/moving camera split feeding frame and video prompts | SHOT-035, SHOT-036 | 2 | EXACT_MATCH | 1 |
| 9 | Descriptive directional shot text, performance style, iteration guardrails | SHOT-042, SHOT-043, SHOT-044, SHOT-046, SHOT-049, SHOT-050 | 6 | PARTIAL_MATCH | 1 |
| 10 | Shot inspector editing, field coherence, deletion and last-shot rule | SHOT-051, SHOT-052, SHOT-059, SHOT-060 | 4 | PARTIAL_MATCH | 5 |
| 11 | AI split and merge of shots | SHOT-053, SHOT-054, SHOT-055, SHOT-056, SHOT-058 | 5 | PARTIAL_MATCH | 9 |
| 12 | Dialogue routing on split and merge | SHOT-057 | 1 | PARTIAL_MATCH | 2 |
| 13 | Tempo agent and script passage sidebar | SHOT-061, SHOT-062 | 2 | NOT_IMPLEMENTED | 1 |
| 14 | Shot-list lock validation (errors, overridable warnings, force) | SHOT-063, SHOT-064, SHOT-065 | 3 | EXACT_MATCH | 5 |
| 15 | Directing style capsule, experimental techniques, film sampling | SHOT-069, SHOT-070, SHOT-071, SHOT-072, SHOT-073, SHOT-074, SHOT-075 | 7 | NOT_IMPLEMENTED | 0 |
| 16 | Shots and locations: link assignment, resolution, view counts, direction exposure | SHOT-076, SHOT-077, SHOT-081, SHOT-082, SHOT-083, SHOT-084, SHOT-085, SHOT-088, SHOT-090 | 9 | PARTIAL_MATCH | 11 |
| 17 | Shot-asset presence types and correction UI | SHOT-091, SHOT-093 | 2 | EXACT_MATCH | 5 |
| 18 | Default attachment of every scene asset to every shot | SHOT-092 | 1 | CONTRADICTED_BY_CODE | 3 |
| 19 | Frame and video prompt segmentation per shot | SHOT-095 | 1 | EXACT_MATCH | 3 |
| 20 | Extend Shot and sketch guides | SHOT-096, SHOT-097, SHOT-098 | 3 | NOT_IMPLEMENTED | 0 |
| 21 | Blocking reference model and composition-reference inputs | SHOT-099, SHOT-100, SHOT-101, SHOT-102, SHOT-103, SHOT-104, SHOT-105, SHOT-114 | 8 | NOT_IMPLEMENTED | 1 |
| 22 | CineBlock concept, previs tooling, virtual production studio | SHOT-106, SHOT-107, SHOT-108, SHOT-109, SHOT-110, SHOT-111, SHOT-112, SHOT-113, SHOT-115, SHOT-116, SHOT-117, SHOT-118 | 12 | NOT_IMPLEMENTED | 1 |
| 23 | Studio integration, placement, angle library, reference picker | SHOT-120, SHOT-121, SHOT-122, SHOT-123, SHOT-124, SHOT-125, SHOT-127, SHOT-128, SHOT-129, SHOT-130 | 10 | NOT_IMPLEMENTED | 2 |
| 24 | Studio shot model, asset pool, per-shot assignment (hackathon build) | SHOT-134, SHOT-136, SHOT-137, SHOT-138, SHOT-139, SHOT-140, SHOT-141, SHOT-142, SHOT-143 | 9 | NOT_IMPLEMENTED | 2 |
| 25 | Studio camera navigation, viewfinder, performance | SHOT-144, SHOT-145, SHOT-146, SHOT-147, SHOT-148, SHOT-149, SHOT-150, SHOT-151, SHOT-152, SHOT-153, SHOT-154, SHOT-155, SHOT-156, SHOT-157, SHOT-158, SHOT-159 | 16 | NOT_IMPLEMENTED | 0 |
| 26 | Studio shots sidebar, mannequins, props, asset visibility | SHOT-160, SHOT-161, SHOT-162, SHOT-163, SHOT-164, SHOT-165, SHOT-166, SHOT-167, SHOT-168, SHOT-169, SHOT-170, SHOT-171, SHOT-172, SHOT-178, SHOT-179 | 15 | NOT_IMPLEMENTED | 0 |
| 27 | Studio mannequin fidelity, primitives, colour consistency, lighting | SHOT-173, SHOT-174, SHOT-175, SHOT-176, SHOT-177, SHOT-180, SHOT-181, SHOT-182, SHOT-183, SHOT-184, SHOT-185, SHOT-186 | 12 | NOT_IMPLEMENTED | 0 |
| 28 | Studio capture, results, persistence, export, deferred scope | SHOT-187, SHOT-188, SHOT-189, SHOT-190, SHOT-191, SHOT-192, SHOT-193, SHOT-194, SHOT-195, SHOT-196, SHOT-197, SHOT-198, SHOT-199, SHOT-200, SHOT-201, SHOT-202, SHOT-203, SHOT-204 | 18 | NOT_IMPLEMENTED | 2 |
| 29 | Twelve-stage two-phase pipeline shape | FLOW-001, FLOW-002, FLOW-004, FLOW-006 | 4 | EXACT_MATCH | 4 |
| 30 | Stage roles, boundaries, iteration cost | FLOW-005, FLOW-007, FLOW-008 | 3 | PARTIAL_MATCH | 5 |
| 31 | Extensibility and alternate stage grouping | FLOW-009, FLOW-010 | 2 | NOT_IMPLEMENTED | 0 |
| 32 | Entry dashboard, resume, global tools, wrap and export | FLOW-011, FLOW-012, FLOW-013, FLOW-014 | 4 | PARTIAL_MATCH | 4 |
| 33 | Phase A input modes and Phase A locks | FLOW-015, FLOW-017, FLOW-018, FLOW-019 | 4 | PARTIAL_MATCH | 5 |
| 34 | Phase A to Phase B transition and scene creation | FLOW-021, FLOW-022 | 2 | EXACT_MATCH | 2 |
| 35 | Stage 5 style lock, Phase B gate, location views not gating | FLOW-023, FLOW-024, FLOW-026 | 3 | EXACT_MATCH | 3 |
| 36 | Finalize Assets soft-lock promise | FLOW-025 | 1 | CONTRADICTED_BY_CODE | 3 |
| 37 | Phase A quality gates and edit-scope invalidation | FLOW-027, FLOW-028 | 2 | PARTIAL_MATCH | 3 |
| 38 | Stage order strictness and prerequisite enforcement | FLOW-029, FLOW-030, FLOW-031 | 3 | PARTIAL_MATCH | 3 |
| 39 | Script Hub and per-scene cycle | FLOW-032, FLOW-033, FLOW-034, FLOW-035, FLOW-036, FLOW-037 | 6 | PARTIAL_MATCH | 6 |
| 40 | Scene resume and free re-entry | FLOW-038, FLOW-039 | 2 | PARTIAL_MATCH | 4 |
| 41 | Scene deferral, batch skip and runtime control | FLOW-040, FLOW-041, FLOW-042 | 3 | PARTIAL_MATCH | 3 |
| 42 | Scene progress derivation and lifecycle | FLOW-043, FLOW-044 | 2 | PARTIAL_MATCH | 3 |
| 43 | In-production signal for projects | FLOW-045, FLOW-046, FLOW-047, FLOW-048, FLOW-049 | 5 | CONTRADICTED_BY_CODE | 0 |
| 44 | Phase B scene-stage handoffs | FLOW-050, FLOW-051, FLOW-052 | 3 | EXACT_MATCH | 3 |
| 45 | Stage 8 visual-reference requirements | FLOW-053, FLOW-054, FLOW-055 | 3 | PARTIAL_MATCH | 2 |
| 46 | Stage 9 prompt review before frame generation | FLOW-056 | 1 | EXACT_MATCH | 2 |
| 47 | Stage 10 approval gate | FLOW-057 | 1 | CONTRADICTED_BY_CODE | 2 |
| 48 | Stage 11 checkpoint and Stage 12 resolutions | FLOW-058, FLOW-059 | 2 | PARTIAL_MATCH | 5 |
| 49 | Correction loops and repair routing | FLOW-060, FLOW-062, FLOW-063 | 3 | PARTIAL_MATCH | 3 |
| 50 | Downstream AI re-run after shot-list edit | FLOW-061 | 1 | NOT_IMPLEMENTED | 1 |
| 51 | Continuity ownership across production stages | FLOW-064, FLOW-065 | 2 | EXACT_MATCH | 5 |
| 52 | Script revision reconciliation and branching | FLOW-067, FLOW-068, FLOW-069, FLOW-070 | 4 | NOT_IMPLEMENTED | 2 |
| 53 | Streamline feeding the pipeline and current-stage derivation | FLOW-072, FLOW-079 | 2 | EXACT_MATCH | 3 |
| 54 | Streamline landing stage for script import | FLOW-074, FLOW-075 | 2 | CONTRADICTED_BY_CODE | 2 |
| 55 | Streamline skip-routing merge with structured document identification | FLOW-076 | 1 | UNKNOWN | 0 |
| 56 | Skippable-stage rules and skipped-state semantics | FLOW-077, FLOW-078, FLOW-080, FLOW-081 | 4 | PARTIAL_MATCH | 5 |
| 57 | Skip recording and skipped-stage presentation | FLOW-082, FLOW-083, FLOW-084, FLOW-085, FLOW-087 | 5 | PARTIAL_MATCH | 5 |
| 58 | Backfill of skipped stages from locked script | FLOW-086, FLOW-088, FLOW-089 | 3 | PARTIAL_MATCH | 3 |
| 59 | Storyboard-driven and YOLO variants | FLOW-090, FLOW-091, FLOW-092, FLOW-094, FLOW-095, FLOW-097 | 6 | NOT_IMPLEMENTED | 0 |
| 60 | Other workflow variants | FLOW-099, FLOW-100, FLOW-101, FLOW-102 | 4 | PARTIAL_MATCH | 3 |
| 61 | CineBlock studio placement, unlock and integration in the flow | FLOW-103, FLOW-104, FLOW-105, FLOW-106, FLOW-107, FLOW-108, FLOW-109, FLOW-110, FLOW-111 | 9 | NOT_IMPLEMENTED | 0 |
| 62 | Master Document proposal and stage-order restructuring options | FLOW-112, FLOW-113, FLOW-114, FLOW-115, FLOW-116, FLOW-117, FLOW-118, FLOW-119, FLOW-120, FLOW-121 | 10 | NOT_IMPLEMENTED | 1 |
| 63 | Sub-location decision stage | FLOW-122, FLOW-123, FLOW-124 | 3 | PARTIAL_MATCH | 2 |
| 64 | Streamline MVP pyramid | FLOW-127 | 1 | EXACT_MATCH | 4 |
| 65 | Streamline post-MVP candidate list | FLOW-130 | 1 | NOT_IMPLEMENTED | 0 |
| 66 | Roadmap, sequencing and build-order principles | FLOW-125, FLOW-126, FLOW-128, FLOW-129, FLOW-132, FLOW-133, FLOW-134, FLOW-135 | 8 | UNKNOWN | 0 |

## Concepts the archaeology missed, refined, or recorded only indirectly

New FACT entries (`PK6.ledger.jsonl`):
- PK6-FACT-01: a usable script import locks Stage 4 in the atomic commit and lands on Stage 5, not Stage 4 for review.
- PK6-FACT-02: location continuity warnings require force at lock (409), while the Stage 7 copy calls them advisory. Refines WD-IMPL-INVALIDATE-0053, whose title says they never block.
- PK6-FACT-03: skip is refused only when the latest stage row is locked, so a draft or outdated stage with content is superseded by an empty skipped version.
- PK6-FACT-04: shot extraction stores off-screen characters in the background list.
- PK6-FACT-05: shot continuity_flags are fed to the Stage 9 frame prompt as Continuity notes but are not shown in Stage 7.
- PK6-FACT-06: the extraction prompt demands exactly 8 seconds per shot, but the code keeps any LLM duration from 1 to 30.
- PK6-FACT-07: blocking reference roles exist only as type unions and a label map; nothing assigns them.
- PK6-FACT-08: Stage 4 generation checks for Stage 3 beat content, not Stage 3 lock.
- PK6-FACT-09: the starting-frame prompt carries camera position only, and the video prompt carries movement.

Contradictions with product-knowledge ideas found in code (relation CONTRADICTED_BY_CODE): project "in production" uses scene existence (FLOW-045 to 049 cluster); Finalize Assets locks assets against edits (FLOW-025); the Stage 10 gate accepts generated frames (FLOW-057); script import lands on Stage 5 (FLOW-074, 075); every asset is attached to every shot by default (SHOT-092).

Existing wave-1 entries confirmed by re-reading the code for this pass: WD-IMPL-DEAD-0036 (IssueResolutionSection is never imported), WD-IMPL-INVALIDATE-0060 (Stage 10 gate), WD-IMPL-INVALIDATE-0071 (Stage 12 return-to-stage does not invalidate), WD-IMPL-FACT-0104 (three-way split not reachable from the UI), WD-IMPL-FACT-0209 (frames_locked has no writer), WD-IMPL-CAP-0281 (export buttons disabled).

Capabilities the archaeology has no entry for, because they are absent (recorded here as negative searches, not as code facts): storyboard intake and panel-label matching; YOLO auto-advance; master document; director or shot-style capsule and complexity modes; experimental-technique suggestions; film-sample reference; shot extend; sketch input for shots; tempo agent; per-shot location-view count control; any 3D studio, previs or blocking tool.

## Ideas that could not be clustered

None. All 305 ideas appear in exactly one cluster (checked by script: 0 missing, 0 duplicated, 0 extra). Cluster-level UNKNOWN relations are used for two groups:
- FLOW roadmap and sequencing principles (8 ideas: FLOW-125, 126, 128, 129, 132, 133, 134, 135). These are planning statements with no observable code behaviour.
- FLOW-076 (merge of skip routing with structured document identification): a planning suggestion, not assessed.

Ledger numbering gaps (ids absent from the ledger, so not in scope): SHOT-003, 006, 007, 028, 040, 045, 047, 048, 066, 067, 068, 078, 079, 080, 086, 087, 089, 094, 119, 126, 131, 132, 133, 135; FLOW-003, 016, 020, 066, 071, 073, 093, 096, 098, 131.

## Method and limits

- Relations come from keyword greps and direct reads. Keywords and paths searched are listed per NOT_IMPLEMENTED or UNKNOWN cluster in `PK6-relations.jsonl`.
- Every WD-IMPL id cited exists in `merged2/merged.jsonl` (checked by script). Line citations in the relations file were re-read for the lines given there; lines cited only from merged2 are wave-1 evidence and were not re-read.
- Runtime behaviour was not run. Functional claims are static only. No tests were executed.
- Only `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md` was read from `._docs/`.
- The Stage 7 lock path was checked against INV-0053; the wording of that entry is superseded by PK6-FACT-02.
