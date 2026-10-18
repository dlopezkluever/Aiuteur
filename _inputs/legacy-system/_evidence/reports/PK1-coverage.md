# PK1 coverage: product-knowledge UX ideas (WD-IDEA-UX) against code

Scope: all WD-IDEA-UX ids defined in `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md` (read as a search checklist only; its status tags were not treated as evidence). Code evidence: `backend/src`, `src`, `backend/migrations`, `backend/scripts`. Archaeology evidence: `merged2/merged.jsonl` (WD-IMPL ids), plus direct reads for the spot checks listed below.

## Counts

- Unique WD-IDEA-UX ids in the ledger: **249**. The brief's "310" counts occurrences of the token `WD-IDEA-UX` (including cross-references), not unique ids; the 249 unique ids are all defined on ledger lines and every cross-reference resolves to one of them.
- Ideas clustered: **249 of 249**, each exactly once (checked against the sorted id list: no missing, no duplicates, no extras).
- Clusters: **67**. The brief says "typically 25-60". The first pass produced 177 clusters with one verdict each; those were consolidated by theme and relation so that each cluster keeps a single verdict. Where a cluster mixes sub-verdicts, the note names them per idea.

| relation | clusters | ideas |
|---|---|---|
| EXACT_MATCH | 4 | 8 |
| PARTIAL_MATCH | 33 | 146 |
| NOT_IMPLEMENTED | 17 | 54 |
| CONTRADICTED_BY_CODE | 11 | 18 |
| UNKNOWN | 2 | 23 |
| total | 67 | 249 |

Cluster-level verdicts come from the union of concept clusters merged into each row. `impl_ids` are the WD-IMPL ids of the underlying archaeology entries (189 distinct ids cited, all verified to exist in `merged2/merged.jsonl`). `code_evidence` paths were checked to exist.

## Clusters

| # | cluster | relation | ideas | impl ids |
|---|---|---|---|---|
| 1 | Browsing side effects on Phase A stages | CONTRADICTED_BY_CODE | 1 | 4 |
| 2 | Lock UI: header, universal control, approval advance | PARTIAL_MATCH | 8 | 9 |
| 3 | Locking is monotonic on the same branch (rejected option) | CONTRADICTED_BY_CODE | 1 | 3 |
| 4 | Scene-stage lock system and outdated re-lock | EXACT_MATCH | 2 | 8 |
| 5 | Rejected unlock alternatives | NOT_IMPLEMENTED | 2 | 2 |
| 6 | Scene and shot-list unlock impact and invalidation | PARTIAL_MATCH | 4 | 9 |
| 7 | Stage 5 asset soft lock | CONTRADICTED_BY_CODE | 1 | 3 |
| 8 | Invalidation cascade map (layer rule and Phase A and Phase B edges) | CONTRADICTED_BY_CODE | 7 | 11 |
| 9 | Asset presence change invalidates prompt stage and downstream | EXACT_MATCH | 1 | 3 |
| 10 | Invalidation scopes, continuity break, never-delete and log | PARTIAL_MATCH | 5 | 12 |
| 11 | Cost-aware invalidation warnings and cost breakdown | PARTIAL_MATCH | 3 | 6 |
| 12 | Scene-preserving pivot on script revision | NOT_IMPLEMENTED | 2 | 0 |
| 13 | Asset re-extraction preserves kept scenes and assets | CONTRADICTED_BY_CODE | 1 | 4 |
| 14 | Version switching must fork, never overwrite | CONTRADICTED_BY_CODE | 1 | 2 |
| 15 | Provenance badges (SKIPPED, IMPORTED, AUTO-FILLED, outdated subtext) | PARTIAL_MATCH | 5 | 7 |
| 16 | Regeneration mode announcement and runtime display | PARTIAL_MATCH | 2 | 3 |
| 17 | Intake quality completeness score (not implemented) | NOT_IMPLEMENTED | 1 | 0 |
| 18 | Stage 1 validation failure feedback | CONTRADICTED_BY_CODE | 1 | 1 |
| 19 | Phase A navigation: Next, Back, Script Hub return | PARTIAL_MATCH | 5 | 6 |
| 20 | Scene rail reachability and graphical stage sidebar | EXACT_MATCH | 2 | 1 |
| 21 | Pending-action dots on stage navigation (not implemented) | NOT_IMPLEMENTED | 1 | 1 |
| 22 | Global chrome, sidebar and project header | PARTIAL_MATCH | 3 | 4 |
| 23 | Keyboard shortcuts for stage navigation and actions | PARTIAL_MATCH | 1 | 0 |
| 24 | Landing, sign-in and protected routes | PARTIAL_MATCH | 3 | 7 |
| 25 | Content Access Space panel and per-stage tabs | PARTIAL_MATCH | 7 | 1 |
| 26 | Shared components and Script Hub scene list | PARTIAL_MATCH | 3 | 4 |
| 27 | Asset and layout features not implemented (camera tags, thumbnails, prefetch, workspace) | NOT_IMPLEMENTED | 4 | 0 |
| 28 | Asset drawer rename and search | PARTIAL_MATCH | 1 | 1 |
| 29 | Stage 7 location-link surfaces and stage ownership boundaries | PARTIAL_MATCH | 7 | 10 |
| 30 | Stage 9 continuity transparency preview | PARTIAL_MATCH | 7 | 7 |
| 31 | Stage 9 read-only boundary contradicted | CONTRADICTED_BY_CODE | 1 | 3 |
| 32 | Stage 9 per-shot view override (not implemented) | NOT_IMPLEMENTED | 1 | 0 |
| 33 | Shot-asset presence and reference controls in Stages 9-10 | PARTIAL_MATCH | 8 | 6 |
| 34 | Stage 10 creative workspace and continuity-base workflow | PARTIAL_MATCH | 7 | 13 |
| 35 | Advanced-mode strict gate and Stage 8 auto-populate | EXACT_MATCH | 3 | 3 |
| 36 | Per-scene continuity overrides and strict polish (not implemented) | NOT_IMPLEMENTED | 2 | 3 |
| 37 | Confidence display and hard-gate triggers | PARTIAL_MATCH | 2 | 3 |
| 38 | Reference toggle presentation, default and visibility | PARTIAL_MATCH | 7 | 3 |
| 39 | Reference toggle label consistency | CONTRADICTED_BY_CODE | 1 | 0 |
| 40 | Batch reference toggle (not implemented) | NOT_IMPLEMENTED | 1 | 0 |
| 41 | Checkout queueing, shot detail and review | PARTIAL_MATCH | 3 | 7 |
| 42 | Checkout collaboration and continuity gate (not implemented) | NOT_IMPLEMENTED | 2 | 2 |
| 43 | Autosave and quiet saves | PARTIAL_MATCH | 2 | 6 |
| 44 | Unsaved-changes guard on leaving (not implemented) | NOT_IMPLEMENTED | 1 | 1 |
| 45 | Error messages and loading states | PARTIAL_MATCH | 2 | 2 |
| 46 | Dashboard card current-scene and title text contradicted | CONTRADICTED_BY_CODE | 2 | 1 |
| 47 | Dashboard summaries and cover images (not implemented) | NOT_IMPLEMENTED | 3 | 0 |
| 48 | Credits: running cost visibility | PARTIAL_MATCH | 1 | 3 |
| 49 | Frame generation credit gating contradicted | CONTRADICTED_BY_CODE | 1 | 1 |
| 50 | Typography and dark-first theme | PARTIAL_MATCH | 1 | 1 |
| 51 | Custom icons (not implemented) | NOT_IMPLEMENTED | 1 | 0 |
| 52 | Restrained motion and micro-interactions | PARTIAL_MATCH | 2 | 0 |
| 53 | Rich media preview | PARTIAL_MATCH | 1 | 1 |
| 54 | Virtual set studio (not implemented) | NOT_IMPLEMENTED | 2 | 0 |
| 55 | Presentation details needing a rendered check | UNKNOWN | 9 | 2 |
| 56 | Stage 8 three-panel visual definition layout | PARTIAL_MATCH | 1 | 1 |
| 57 | Invalidation tools not implemented: blast radius options, drift resolution, invalidation review | NOT_IMPLEMENTED | 6 | 2 |
| 58 | Branch and version tools not implemented or stubbed | NOT_IMPLEMENTED | 11 | 3 |
| 59 | Collaboration, analytics, reports, notifications and audit (not implemented) | NOT_IMPLEMENTED | 8 | 3 |
| 60 | Onboarding, smart suggestions and global search (not implemented) | NOT_IMPLEMENTED | 6 | 1 |
| 61 | Accessibility, contextual help and tooltip feedback | PARTIAL_MATCH | 5 | 1 |
| 62 | Status vocabulary, advisory stance and risk indicators | PARTIAL_MATCH | 4 | 4 |
| 63 | Intake commit flow: routing preview, estimate, atomicity | PARTIAL_MATCH | 6 | 8 |
| 64 | Phase A lock and unlock semantics | PARTIAL_MATCH | 7 | 15 |
| 65 | Versioning and branch data model | PARTIAL_MATCH | 9 | 20 |
| 66 | Principles, process and judgement items (not code-checkable) | UNKNOWN | 14 | 5 |
| 67 | Dashboard cards, search and current-scene display | PARTIAL_MATCH | 14 | 10 |

## Concepts the archaeology had missed or only partly covered

New FACT entries (in `PK1.ledger.jsonl`, verified in code by this pass):

- PK1-FACT-01: frame generation is not credit-gated; credits gate only the Stage 11 render (cited by UX-347).
- PK1-FACT-02: dashboard current scene is the first unfinished scene; no last-worked record exists (UX-337, UX-344, UX-345).
- PK1-FACT-03: the only app keyboard shortcut is Ctrl/Cmd+B for the sidebar (UX-156).
- PK1-FACT-04: the reference toggle has five labels across surfaces and defaults to off in FramePanel (UX-281, UX-282, UX-296).
- PK1-FACT-05: the app defaults to dark theme with system option (UX-357).
- PK1-FACT-06: the Stage 2 retroactive-revise control is unreachable (its banner is gated on a state value never set true) and only toasts (UX-068).
- PK1-FACT-07: the Phase A lock route inserts a new locked version on every call with no already-locked check (UX-026).

Gaps and corrections against the merged ledger that this pass noticed (no new FACT id needed, because the merged ledger already has the underlying entry):

- Phase A unlock dialog never opens (FACT-0005, DEAD-0007) is confirmed by reading ProjectView.tsx:691-716 and stageStateService.ts:188-191 against stageStates.ts:595-607.
- Stage 5 lock-all makes assets hard-locked with no route to unlock (STATE-0036, CAP-0156). The asset-stage idea (UX-036) therefore resolves as CONTRADICTED.
- Scene-asset edits do not call any invalidation helper; the only callers of invalidateStage9AndDownstream are shot-assignment routes and shot split (grep over backend/src). This is consistent with INVALIDATE-0082 but is recorded here as a caller check.
- Dashboard card "Stage N of 5" text is shown instead of the stage title (ProjectCard.tsx:126). No archaeology entry addresses the wording.

## Ideas that could not be settled statically

UNKNOWN clusters (23 ideas):

- Principles, process and judgement (14 ideas): UX-004, 005, 009, 011, 012, 013, 014, 042, 043, 101, 144, 152, 219, 316. These are design principles, planning decisions, creator process, usability outcomes, or iteration guidance. Settling them needs a rendered or usability check, or they are not product behaviour.
- Presentation details (9 ideas): UX-023, 024, 161, 163, 171, 172, 174, 177, 289. Locked text colour and selectability, nested shot carousel, drag-resize snap, responsive truncation and stacking, screenplay sluglines, all-assets fallback panel. These need a rendered pass (for example, a Playwright screenshot run) or a deeper CSS and component trace.

## Verification and limits

- Directly re-read by this pass (file:line checked): ProjectView.tsx Phase A unlock flow and dialog wiring (691-747, 977-991); stageStateService.ts unlockStage (172-199); stageStates.ts lock route (297-412) and unlock route (523-609); LockedStageHeader.tsx (48-131); ProjectHeader.tsx and ProjectView.tsx header stubs (773-881); 001_initial_schema.sql Main-branch trigger (167-186); Stage10FrameGeneration.tsx strict gate (283-290, 886, 955-967, candidate cap 88) and projects.ts continuity-metrics strict block (995-1006); FramePanel.tsx and VisualStateEditorPanel.tsx reference switches (170, 812-819, 533-540); Stage7ShotList.tsx and Stage11Confirmation.tsx totals (851, 909, 986; 107, 250-251); ProjectCard.tsx progress and status (18-30, 121-164); projects.ts dashboard derivation (376-390); projectAssets.ts locked-asset guards (586-590, 702-705, 1562-1568); Stage2Treatment.tsx retroactive control (107, 418-421, 467-472); App.tsx theme (76-78); sidebar.tsx shortcut (20, 76-88); Dashboard.tsx search and inert buttons (58-61, 86-98, 132); ContentAccessCarousel.tsx header (1-10); SceneWorkflowSidebar.tsx reachability (66-99); Stage5Assets.tsx selection toolbar (1637-1650); Stage6ScriptHub.tsx risk dot and overview (330-342, 362-372).
- Every other WD-IMPL citation is wave-1 evidence taken from `merged2/merged.jsonl` (wave1-unverified in this pass unless listed above). Stage 12 hard-coded locked header (FACT-0018) is one such wave-1 claim.
- Static analysis only. Runtime, rendering, and timing behaviour are not established; those verdicts are UNKNOWN or noted.
- Scratch files (candidate lists, ledger extraction) were kept in `/tmp`, outside the repo, per the brief's rule on repo files.
- No ideas were left unclustered.
