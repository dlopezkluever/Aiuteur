# PK5 product-knowledge coverage: WD-IDEA-ASSET and WD-IDEA-PHIL

Scope: every WD-IDEA-ASSET and WD-IDEA-PHIL id in `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md` was read as a search checklist only (not as evidence). Code was searched in `backend/src`, `src`, `backend/migrations`, `backend/scripts`. WD-IMPL ids were taken from `merged2/merged.jsonl` and spot-checked against the cited lines.

## Counts and discrepancy with the brief

- The brief stated ASSET (206) and PHIL (106). The ledger contains **192 unique ASSET ids** (max id 224, sparse numbering) and **82 unique PHIL ids** (max id 098). All 274 ids that exist were mapped; none were invented or dropped.
- Each id lands in exactly one cluster (verified: 274 unique mapped ids, 0 duplicates, 0 missing).
- Clusters: 153. The brief said "typically 25-60". The clusters were kept fine-grained so that each cluster carries one relation value. Merging to 60 would have forced mixed relations under one label.

## Relation counts (cluster level)

| Relation | Clusters | Ideas |
|---|---:|---:|
| EXACT_MATCH | 36 | 67 |
| PARTIAL_MATCH | 69 | 110 |
| NOT_IMPLEMENTED | 28 | 46 |
| CONTRADICTED_BY_CODE | 5 | 6 |
| UNKNOWN | 15 | 45 |
| **Total** | **153** | **274** |

Interpretation for rejected or alternative ideas: the relation describes what the code does against the idea statement. NOT_IMPLEMENTED means the described behavior is absent (a rejected design that is correctly gone is NOT_IMPLEMENTED). CONTRADICTED_BY_CODE means code does the opposite of the statement. For a live rejected decision this is a violation (C11: a library is still auto-created; C41: a character can still be turned into an extra). For a rejected option whose alternative is in code (D34), the label reflects that code took the other path, which matches the rejection. C76 and D14 are non-rejected statements that code violates.

## Cluster table

| Cluster | Ideas | Relation | Idea ids |
|---|---:|---|---|
| C01 Asset tiers and object model | 2 | PARTIAL_MATCH | ASSET-001, ASSET-002 |
| C02 Asset origin tracking | 1 | EXACT_MATCH | ASSET-003 |
| C03 Inheritance chain validated end to end | 1 | PARTIAL_MATCH | ASSET-005 |
| C04 Capsule kinds and writing/visual fields | 3 | PARTIAL_MATCH | ASSET-008, ASSET-009, ASSET-010 |
| C05 Deterministic capsule injection, no retrieval | 2 | EXACT_MATCH | ASSET-006, ASSET-007 |
| C06 Capsule reach into later outputs | 2 | PARTIAL_MATCH | ASSET-011, ASSET-012 |
| C07 Capsule versioning, application audit and per-asset capsule record | 3 | PARTIAL_MATCH | ASSET-013, ASSET-015, ASSET-028 |
| C08 Capsule library browse UI | 1 | EXACT_MATCH | ASSET-018 |
| C09 Capsule CRUD, preset immutability, duplicate, favorites | 2 | EXACT_MATCH | ASSET-017, ASSET-019 |
| C10 Capsule libraries as user-owned groups and sharing | 1 | PARTIAL_MATCH | ASSET-021 |
| C11 Auto-created libraries (rejected decision) | 1 | CONTRADICTED_BY_CODE | ASSET-022 |
| C12 Public-read storage for capsule images (legacy workaround) | 1 | EXACT_MATCH | ASSET-020 |
| C13 Manual visual tone presets and custom tone | 1 | EXACT_MATCH | ASSET-024 |
| C14 Promote custom visual tone to a capsule | 1 | NOT_IMPLEMENTED | ASSET-025 |
| C15 Style change after lock and per-scene style confirmation | 2 | PARTIAL_MATCH | ASSET-026, ASSET-029 |
| C16 Identity-over-style ordering and influence control | 3 | PARTIAL_MATCH | ASSET-030, ASSET-031, ASSET-032 |
| C17 Re-extraction of assets with preservation | 1 | NOT_IMPLEMENTED | ASSET-035 |
| C18 Speaker-based character identification and action-line presence | 2 | EXACT_MATCH | ASSET-040, ASSET-042 |
| C19 Dialogue counts for lead versus one-line extras | 1 | PARTIAL_MATCH | ASSET-041 |
| C20 Capitalized-word prop detection with screenplay ignore list | 1 | EXACT_MATCH | ASSET-043 |
| C21 AI prop discovery from action text | 1 | NOT_IMPLEMENTED | ASSET-044 |
| C22 Scene location from heading and name matching | 1 | PARTIAL_MATCH | ASSET-045 |
| C23 Alias and name-variant merge | 1 | NOT_IMPLEMENTED | ASSET-046 |
| C24 AI catalog, keep-everything, and prominence alternatives | 3 | NOT_IMPLEMENTED | ASSET-047, ASSET-048, ASSET-049 |
| C25 Deterministic-first identification with AI for descriptions only | 1 | EXACT_MATCH | ASSET-050 |
| C26 Two-pass extraction: preview, then describe selected | 1 | EXACT_MATCH | ASSET-051 |
| C27 Extraction selection checklist | 2 | EXACT_MATCH | ASSET-052, ASSET-053 |
| C28 Keep, defer, delete curation and bulk removal | 3 | PARTIAL_MATCH | ASSET-054, ASSET-055, ASSET-056 |
| C29 Defer and restore project assets | 1 | PARTIAL_MATCH | ASSET-066 |
| C30 Manual add and deferred-asset behavior in Stage 8 | 3 | PARTIAL_MATCH | ASSET-065, ASSET-067, ASSET-068 |
| C31 Description synthesis from script mentions | 1 | PARTIAL_MATCH | ASSET-057 |
| C32 Description rules: short, physical, conflicts, style-aligned, priority | 3 | EXACT_MATCH | ASSET-059, ASSET-060, ASSET-061 |
| C33 Description editing and targeted AI rewrite | 1 | PARTIAL_MATCH | ASSET-058 |
| C34 Hidden master descriptive document | 1 | NOT_IMPLEMENTED | ASSET-064 |
| C35 Genre-aware quality expectations for assets and capsules | 2 | UNKNOWN | ASSET-016, ASSET-062 |
| C36 Audio-driven projects: hosts, visual aids, topic-driven states | 1 | NOT_IMPLEMENTED | ASSET-063 |
| C37 Extra archetype as a user-authored class | 2 | EXACT_MATCH | ASSET-069, ASSET-070 |
| C38 Archetype reference flow into frame generation | 1 | PARTIAL_MATCH | ASSET-071 |
| C39 Archetype creation UI, grid group and scene assignment | 4 | PARTIAL_MATCH | ASSET-072, ASSET-073, ASSET-074, ASSET-075 |
| C41 Extracted character reclassified as extra (rejected option) | 1 | CONTRADICTED_BY_CODE | ASSET-076 |
| C42 Characters whose state changes: multiple states, transformation events | 3 | PARTIAL_MATCH | ASSET-078, ASSET-080, ASSET-082 |
| C43 Per-shot descriptive tags and Stage 8/9 order | 2 | PARTIAL_MATCH | ASSET-081, ASSET-083 |
| C44 Master image key from edited description and locked style, with guidance iteration | 1 | EXACT_MATCH | ASSET-084 |
| C45 Image-key prompt content for reference sheets | 2 | PARTIAL_MATCH | ASSET-085, ASSET-086 |
| C46 Isolated background for characters, props and extras | 1 | PARTIAL_MATCH | ASSET-087 |
| C47 Prompt-only isolation as the method | 1 | EXACT_MATCH | ASSET-092 |
| C48 Background-removal post-processing with A/B test | 1 | NOT_IMPLEMENTED | ASSET-093 |
| C49 Upload and multi-image carousel for master images | 3 | EXACT_MATCH | ASSET-088, ASSET-089, ASSET-090 |
| C50 Faithfulness to the upload on regeneration | 1 | PARTIAL_MATCH | ASSET-091 |
| C51 Multi-angle variants for characters and props | 1 | PARTIAL_MATCH | ASSET-097 |
| C52 Per-asset management actions | 2 | EXACT_MATCH | ASSET-098, ASSET-104 |
| C53 Stage 5 editor modal scroll and prop deletion | 1 | PARTIAL_MATCH | ASSET-105 |
| C54 Lock trap on approved or locked assets | 1 | PARTIAL_MATCH | ASSET-103 |
| C55 Merge and split of assets | 3 | PARTIAL_MATCH | ASSET-099, ASSET-100, ASSET-101 |
| C56 Type change allowed after image approval | 1 | EXACT_MATCH | ASSET-102 |
| C57 Image outcome when Change Type runs | 2 | PARTIAL_MATCH | ASSET-106, ASSET-107 |
| C58 Lock master assets and finalize | 2 | EXACT_MATCH | ASSET-108, ASSET-110 |
| C59 Voice profile linked to a character | 1 | PARTIAL_MATCH | ASSET-111 |
| C60 Upload reconciliation: analysis, review modal, confidence | 5 | EXACT_MATCH | ASSET-112, ASSET-113, ASSET-115, ASSET-116, ASSET-117 |
| C61 Imperfect inputs become pipeline assets | 2 | PARTIAL_MATCH | ASSET-114, PHIL-012 |
| C62 Image actions in the upload modal | 7 | EXACT_MATCH | ASSET-118, ASSET-119, ASSET-120, ASSET-121, ASSET-122, ASSET-126, ASSET-127 |
| C63 Accept, cancel and the canonical jumpsuit case | 2 | EXACT_MATCH | ASSET-123, ASSET-125 |
| C64 Session carousel of all attempts in the upload modal | 1 | PARTIAL_MATCH | ASSET-124 |
| C65 Shared upload modal for Stage 5 and Stage 8 | 1 | EXACT_MATCH | ASSET-128 |
| C66 Earlier and rejected reconciliation designs | 4 | NOT_IMPLEMENTED | ASSET-129, ASSET-130, ASSET-133, ASSET-134 |
| C67 Keep, replace or merge description choice; agentic merge tool | 2 | PARTIAL_MATCH | ASSET-131, ASSET-132 |
| C68 Implicit upload intent | 1 | EXACT_MATCH | ASSET-135 |
| C69 Batch intake excludes heavy per-image actions | 1 | EXACT_MATCH | ASSET-138 |
| C70 Batch grid instead of N sequential modals | 1 | NOT_IMPLEMENTED | ASSET-139 |
| C71 Global asset library: browse and CRUD | 2 | EXACT_MATCH | ASSET-140, ASSET-141 |
| C72 Dependent check before deleting a library asset | 1 | NOT_IMPLEMENTED | ASSET-142 |
| C73 Promote to global and clone into project with version tracking | 2 | EXACT_MATCH | ASSET-143, ASSET-144 |
| C74 Merge strategy when reusing a global asset | 1 | PARTIAL_MATCH | ASSET-145 |
| C75 Richer promotion: scene-instance promotion, templates, sharing (future) | 1 | NOT_IMPLEMENTED | ASSET-146 |
| C76 Images optional at Stage 5 (props and all assets) | 2 | CONTRADICTED_BY_CODE | ASSET-094, ASSET-095 |
| C77 Scene asset population from project assets (bootstrap, inherit, populate) | 3 | EXACT_MATCH | ASSET-149, ASSET-150, ASSET-151 |
| C78 Stage 8 auto-suggestions: source labels, descriptions, justification | 3 | PARTIAL_MATCH | ASSET-152, ASSET-155, ASSET-157 |
| C79 Relevance rules for scene assets | 1 | PARTIAL_MATCH | ASSET-154 |
| C80 AI relevance detection with persisted, dismissable suggestions | 2 | EXACT_MATCH | ASSET-156, ASSET-163 |
| C81 Suggestion persistence and update when dependencies change | 1 | PARTIAL_MATCH | ASSET-158 |
| C82 Extracted-map-only suggestions (no fresh AI pass) alternative | 1 | PARTIAL_MATCH | ASSET-162 |
| C83 Add-asset paths in Stage 8 and the asset drawer | 2 | PARTIAL_MATCH | ASSET-159, ASSET-166 |
| C84 Scene-only asset creation and its label | 2 | PARTIAL_MATCH | ASSET-164, ASSET-165 |
| C85 Remove from scene keeps project and global assets | 1 | EXACT_MATCH | ASSET-167 |
| C86 Use Master As-Is default and bulk application | 2 | PARTIAL_MATCH | ASSET-168, ASSET-169 |
| C87 Scene image generation beside the master; master never replaced | 3 | EXACT_MATCH | ASSET-170, ASSET-171, ASSET-177 |
| C88 Scene visual-state evolution by typed modification | 1 | PARTIAL_MATCH | ASSET-172 |
| C89 Reference-history and attempts carousels; Stage 8 flow | 3 | EXACT_MATCH | ASSET-174, ASSET-176, ASSET-178 |
| C90 Hard gate: every scene asset needs a visual reference before prompts | 1 | EXACT_MATCH | ASSET-185 |
| C91 Imageless asset raised as a visual-definition issue | 1 | PARTIAL_MATCH | ASSET-190 |
| C92 Imageless asset excluded from the reference set | 1 | NOT_IMPLEMENTED | ASSET-191 |
| C93 Fallback order, undecided-asset modal and tiered gating | 3 | NOT_IMPLEMENTED | ASSET-187, ASSET-188, ASSET-189 |
| C94 Status tag tooling: templates, history, bulk, filter, severity, conflicts, analytics (future) | 7 | NOT_IMPLEMENTED | ASSET-192, ASSET-193, ASSET-194, ASSET-195, ASSET-197, ASSET-198, ASSET-199 |
| C95 Tag-based prompt enrichment | 1 | PARTIAL_MATCH | ASSET-196 |
| C96 Stage 8 init of shot-asset assignments | 1 | EXACT_MATCH | ASSET-200 |
| C97 Shot presence badges on scene assets | 1 | PARTIAL_MATCH | ASSET-201 |
| C98 Scene-instance camera-angle metadata | 1 | PARTIAL_MATCH | ASSET-202 |
| C99 Camera-angle selection for reference images | 1 | PARTIAL_MATCH | ASSET-203 |
| C100 Default shot-asset assignment: every asset in every shot as throughout | 1 | EXACT_MATCH | ASSET-204 |
| C101 Confidence-scored preselection and rule-based defaults | 2 | PARTIAL_MATCH | ASSET-205, ASSET-206 |
| C102 CineBlock blocking stand-ins | 4 | NOT_IMPLEMENTED | ASSET-207, ASSET-208, ASSET-209, ASSET-210 |
| C103 Casting-director style subject description | 1 | PARTIAL_MATCH | ASSET-212 |
| C104 One to three consistent reference images per character | 1 | PARTIAL_MATCH | ASSET-213 |
| C105 Typed reference roles, up to three per generation | 1 | PARTIAL_MATCH | ASSET-214 |
| C106 Define once, reference many by name | 1 | PARTIAL_MATCH | ASSET-218 |
| C107 Web scouring to build a style capsule (future) | 1 | NOT_IMPLEMENTED | ASSET-219 |
| C108 Style and character model training (future) | 2 | NOT_IMPLEMENTED | ASSET-220, ASSET-221 |
| C109 Film reference deconstruction (future) | 1 | NOT_IMPLEMENTED | ASSET-222 |
| C110 Anime mode (future) | 1 | NOT_IMPLEMENTED | ASSET-223 |
| C111 Sample or pooled clip library (future) | 1 | NOT_IMPLEMENTED | ASSET-224 |
| D01 Fixed 12-stage workflow and creative-compiler structure | 2 | PARTIAL_MATCH | PHIL-001, PHIL-009 |
| D02 Inversion: plan, anchor frames, then generate video once | 1 | PARTIAL_MATCH | PHIL-006 |
| D03 Story consolidation as primary value; video as result | 1 | UNKNOWN | PHIL-007 |
| D04 Master Script as single source of truth, frozen at approval | 1 | PARTIAL_MATCH | PHIL-008 |
| D05 Target-user archetypes and goals (non-code) | 6 | UNKNOWN | PHIL-013, PHIL-014, PHIL-015, PHIL-016, PHIL-017, PHIL-018 |
| D06 Power users bring existing scripts and storyboards | 1 | PARTIAL_MATCH | PHIL-019 |
| D07 Positioning and scope exclusions (non-code) | 7 | UNKNOWN | PHIL-020, PHIL-021, PHIL-022, PHIL-023, PHIL-025, PHIL-027, PHIL-028 |
| D08 Exclusion of agent takeover and unsanctioned automatic decisions | 1 | UNKNOWN | PHIL-024 |
| D09 Fully autonomous master mode (questioned) | 1 | NOT_IMPLEMENTED | PHIL-026 |
| D10 Visual theme, desktop-first and long-term ambition (non-code) | 3 | UNKNOWN | PHIL-029, PHIL-030, PHIL-031 |
| D11 Experience principles: effort without friction, pacing, technical canvases, agentic acceleration | 4 | UNKNOWN | PHIL-032, PHIL-033, PHIL-035, PHIL-036 |
| D12 Flexible pacing with user-selected care modes | 1 | NOT_IMPLEMENTED | PHIL-034 |
| D13 Late stages self-contained; repair routes back to the owning stage | 1 | UNKNOWN | PHIL-037 |
| D14 Unimportant assets must never block progress (Stage 8 polish) | 1 | CONTRADICTED_BY_CODE | PHIL-038 |
| D15 Upload end goal: an image the user likes plus a matching description | 1 | PARTIAL_MATCH | PHIL-040 |
| D16 Within-scene changes without hand-supplied images per shot | 1 | PARTIAL_MATCH | PHIL-041 |
| D17 First-time user experience and onboarding | 1 | NOT_IMPLEMENTED | PHIL-042 |
| D18 Determinism: explicit inheritance, deterministic effects, typed context per AI step | 3 | PARTIAL_MATCH | PHIL-043, PHIL-044, PHIL-045 |
| D19 Immutable versions, lineage and branching | 3 | PARTIAL_MATCH | PHIL-047, PHIL-048, PHIL-049 |
| D20 Analytics on inheritance-contract violations | 1 | NOT_IMPLEMENTED | PHIL-053 |
| D21 Cost awareness at transitions and fewer generations | 3 | PARTIAL_MATCH | PHIL-054, PHIL-055, PHIL-056 |
| D22 Cost tracking, budgets and alerts | 1 | PARTIAL_MATCH | PHIL-057 |
| D23 Verification before expensive video generation; output success metrics | 2 | PARTIAL_MATCH | PHIL-058, PHIL-060 |
| D24 Golden test projects | 1 | NOT_IMPLEMENTED | PHIL-061 |
| D25 Private projects, branches and library; lock attribution | 1 | PARTIAL_MATCH | PHIL-062 |
| D26 Provider keys held server-side and isolated per provider | 1 | PARTIAL_MATCH | PHIL-063 |
| D27 Streamline targets non-writing users; open design questions | 2 | UNKNOWN | PHIL-065, PHIL-071 |
| D28 Streamline promise: classify, ask what is missing, scaffold the project | 1 | PARTIAL_MATCH | PHIL-066 |
| D29 Streamline is additive to the 12-stage pipeline | 1 | EXACT_MATCH | PHIL-067 |
| D30 Personal creative fingerprint and lore library (future) | 1 | NOT_IMPLEMENTED | PHIL-072 |
| D31 Two-layer location continuity: lightweight default plus structured advanced path | 2 | PARTIAL_MATCH | PHIL-073, PHIL-078 |
| D32 Location continuity success criteria (outcome) | 2 | UNKNOWN | PHIL-079, PHIL-080 |
| D33 Location system shape: rejected alternatives | 1 | UNKNOWN | PHIL-081 |
| D34 Location system shape: prompt-only rejected alternative | 1 | CONTRADICTED_BY_CODE | PHIL-082 |
| D35 North Star test and team governance (process) | 5 | UNKNOWN | PHIL-083, PHIL-084, PHIL-085, PHIL-086, PHIL-087 |
| D36 Roadmap, sequencing and quality standards (process) | 6 | UNKNOWN | PHIL-088, PHIL-089, PHIL-090, PHIL-091, PHIL-094, PHIL-096 |
| D37 Design principles: explicitness, vocabulary, one-shot references | 3 | UNKNOWN | PHIL-004, PHIL-051, PHIL-052 |
| D38 Automated checks and manual end-to-end test guides | 1 | PARTIAL_MATCH | PHIL-093 |
| D39 MP4 export and export as an MVP requirement | 2 | NOT_IMPLEMENTED | PHIL-095, PHIL-097 |
| D40 Observability and indexing | 1 | PARTIAL_MATCH | PHIL-098 |
| D41 Prompt templates as versioned creative artifacts | 1 | PARTIAL_MATCH | PHIL-003 |
| D42 Problem framing: slot-machine generation and cost | 1 | UNKNOWN | PHIL-005 |
| C112 Stage 8 deterministic population with manual correction path | 2 | PARTIAL_MATCH | ASSET-160, ASSET-161 |

## Concepts the archaeology had missed or stated without the product angle

These are behaviors visible in code that the merged ledger either lacks or states without the product comparison. Each has a PK5-FACT entry (`PK5.ledger.jsonl`) unless noted.

1. Character identity has no alias merge (PK5-FACT-01). Scene presence uses a raw substring match (PK5-FACT-02). Dialogue counts are never used for lead or extra classification (PK5-FACT-03).
2. Shot-asset auto-population sets every asset to every shot as throughout, while the drawer preselects heuristic matches with an all-shots fallback (PK5-FACT-04).
3. All Stage 12 export buttons are disabled placeholders. WD-IMPL-CAP-0281 lists them as a capability (PK5-FACT-05). This contradicts PHIL-095 (export must work).
4. voice_profile_id is stored but no generation path reads it (PK5-FACT-06).
5. Angle variants and the matched-angle priority apply to characters only; props get no angle variant (PK5-FACT-07).
6. Capsule libraries have no sharing flag, and capsule-image storage is public read (PK5-FACT-08). The library is still auto-inserted on read despite the rejected idea (C11, cited to WD-IMPL-FACT-0023).
7. Change Type keeps the approved image, and any asset can become extra_archetype, which the rejected option described (PK5-FACT-09, PK5-FACT-13).
8. use_master_as_is defaults to FALSE in the schema (PK5-FACT-10).
9. The upload modal has no session attempts carousel (PK5-FACT-11). Status tags reach AI context but have no tag tooling (PK5-FACT-12).

Not in merged2 as an explicit statement, but important against the product principles:

- **Stage 8 Proceed and Stage 5 lock-all both require images** (Stage8VisualDefinition.tsx:713-720; projectAssets.ts:1716-1720). This contradicts PHIL-038 (unimportant assets must not block) and ASSET-094/095 (images optional). Merged2 has FACT-0068 and INVALIDATE-0043 but does not frame them against the product statements.
- **Stage 9 generation overwrites shot prompts in place** (projects.ts:3840-3863). This bears on PHIL-047 (completed work never changed in place). Merged2 has STATE-0071 without this framing.
- **Style capsule text reaches Stage 9 only in the non-functional path** and not Stage 7 (CAP-0073; no capsule reference in shotExtractionService.ts). Stated in C06.
- **No cost budgets, alerts, golden fixtures, onboarding, care modes, Sentry or analytics** exist. These are absences that the product docs describe as intent.

## Ideas that could not be settled statically (UNKNOWN)

- Positioning, target-user and process statements (D03, D05, D07, D27, D35, D36, D42): these are not code behaviors.
- Experience goals needing runtime or UX review (D10, D11, D13, D32).
- Quality expectations for genre and asset completeness (C35): genre appears in some prompts; output fit needs runtime review.
- The "agent takeover" exclusion (D08): some generation runs on stage entry, and whether that counts as an unsanctioned decision is a judgment.
- Rejected location option "main experience" (D33): both layers exist in code, so the intended main path cannot be settled.
- Open questions and unverified items: C84 (ASSET-165), C88, and C42 (ASSET-082): listed in the note fields.

## Method notes and limits

- Keyword searches used the terms named in each cluster's `searched` field. Where a term was not searched, the note says "not verified".
- Stage 8 drawer features, scene-instance deferred-asset rendering, asset-editor scrolling and the Artifact Vault promotion path were not traced at runtime; they are flagged as not verified in the notes.
- WD-IMPL ids cited without a file path were taken from merged2 and checked for the cluster they support where the note says so.
