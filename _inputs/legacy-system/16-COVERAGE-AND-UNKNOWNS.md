# 16 Coverage and unknowns

Final audit of the code archaeology corpus at HEAD of `main` (repository `/home/user/workspace/repo`). This document records how the investigation was run; which directories, routes, tables, AI calls and tests the ledger covers; where reporters disagreed and how each disagreement was settled; what remains UNKNOWN and what would settle it; which areas need manual or runtime verification, ordered by impact; and how far the product-knowledge check reached. It states no product recommendations. Counts come from `_evidence/merged/merged.jsonl` (1,590 lines), `file-inventory.txt` (418 files, 107,883 LOC), the report sections named in each subsection, and the repository. Where a count came from a script, the rule is stated.

Sources: `_evidence/merged/merged.jsonl` (all 12 ledger kinds), `_evidence/merged/retired-ids.json`, `file-inventory.txt`, `reports/*.md` (inspected, not-inspected, contradiction and unknown sections of V1 to V10, C, E, H, I, J, K, L, R1a, R1b, R2), `reports/R1a-verification.md` and `R1b-verification.md` (verdict tables), `reports/M-lead.ledger.jsonl`, `reports/PK1` to `PK7` relation and coverage files (coverage metadata only, never evidence of implementation), canonical docs `01` to `14` (grep only), and repository source at HEAD for the spot checks in section 9.3.

Reading notes: `00-README.md` is not present in the corpus. `15` (pressure) was not present when this file was written. Sibling docs cited: `01-SYSTEM-OVERVIEW`, `02-FUNCTIONAL-CAPABILITIES`, `03-USER-WORKFLOWS`, `04-DOMAIN-AND-STATE-MODEL`, `05-DATA-MODEL`, `06-WRITING-AND-STORY-IMPLEMENTATION`, `07-VISUAL-ASSETS-AND-CONTINUITY`, `08-SHOTS-FRAMES-AND-GENERATION`, `09-AI-AND-PROMPT-SYSTEM`, `10-VERSIONING-LOCKING-AND-INVALIDATION`, `11-APPLICATION-ARCHITECTURE`, `12-ASYNC-RELIABILITY-AND-PROVIDERS`, `13-TEST-AND-EVIDENCE-MAP`, `14-DEAD-PARTIAL-AND-DUPLICATED`, `17-IMPLEMENTATION-LEDGER`, `18-PRODUCT-INTENT-CROSSWALK`.

---

## 1. Method and swarm composition

### 1.1 Pipeline

1. **Wave 1 (12 reporters).** Each read one vertical slice and wrote a narrative and a ledger. Briefs: `.amp/in/archaeology/BRIEF.md`, `WAVE2.md`. Every wave-1 claim was a lead until verified.
2. **Wave 2 (8 agents).** Cross-slice verification, dead and duplicate analysis, pressure scans, test analysis, AI canonicalization (R2), and verdicts on 22 contradiction claims C01 to C22 (`R1-claims-to-verify.md`, split between R1a and R1b).
3. **Merge.** `merge-ledger.mjs` assigned global `WD-IMPL-*` ids and carried `correction` fields. `_evidence/merged/` added PK and lead entries. `retired-ids.json` maps 27 duplicate AI ids to canonical ids.
4. **Lead additions.** Lead entries M-AI-01 to M-AI-03 became `WD-IMPL-AI-0086` to `0088` (section 5.2).
5. **Product-knowledge check (PK1 to PK7).** Seven checkers used the product ideas as a search checklist only, related each cluster to code, and wrote 72 new FACT entries.
6. **Canonical docs.** Fourteen writers produced `01` to `14`. `17` and `18` are generated artifacts.
7. **This document** is the final audit over steps 1 to 6.

### 1.2 Reporters

| ID | Slice (per report scope) | Merged ledger rows | Notes |
|---|---|---|---|
| V1 | Shell, auth, project lifecycle, Phase A stage states | 138 | `ProjectView`, `stageStates.ts`, `projects.ts` |
| V2 | Style capsules, global asset library, seeding | 86 | Migration 005 applied state UNKNOWN |
| V3 | Narrative: Stages 1 to 4 and 6 (Script Hub) | 63 | `storyContextService`, TipTap extensions |
| V4 | Streamline intake | 88 | `streamline*.ts`, commit RPC |
| V5 | Stage 5 project assets, asset images, location views | 114 | `projectAssets.ts` read in full |
| V6 | Stage 8 scene asset instances, transformation events | 110 | `sceneAssets.ts` read in full |
| V7 | Continuity frame chain, locations | 101 | Location classifiers, base selection |
| V8 | Stage 7 shot list, shot locks, shot assignments | 65 | `shotAssignments.ts`, `sceneStageLocks.ts` |
| V9 | Stage 9 prompt segmentation, Stage 10 frames, image provider layer | 86 | `promptGenerationService.ts`, `frameGenerationService.ts` |
| V10 | Stage 11 confirmation, Stage 12 video, credits, video providers | 75 | `videoGenerationService.ts`, `checkout.ts` |
| C | Database schema, RLS, table usage | 71 | 748-line table inventory |
| E | AI and model-call registry | 72 | 49 AI entries in its own ledger |
| H | State transitions, invalidation | 80 | Wave 2 |
| I | Runtime, async, reliability, auth, environment | 59 | Wave 2; names-only env policy |
| J | Tests (74 test files) | 94 | Wave 2; executed local suites |
| K | Dead, partial, duplicate, legacy code | 92 | Wave 2; module-graph reachability |
| L | Pressure (regex and grep scans) | 99 | Wave 2 |
| R1a | Verdicts C01 to C11 | 11 | Wave 2 |
| R1b | Verdicts C12 to C22 | 11 | Wave 2 |
| R2 | AI canonical grouping (85 raw to 58 canonical) | 0 ledger rows | Writes `R2-ai-canonical.md` and `.json` |
| M | Lead additions | 3 | AI-0086 to AI-0088 |
| PK1 to PK7 | Product-knowledge coverage (section 1.3) | 72 | Coverage metadata and new FACT entries |

Merged ledger rows total 1,590: wave 1 1,069, wave 2 446, lead 3, product-knowledge 72.

### 1.3 Product-knowledge checkers

| Checker | Idea domain prefixes | Clusters | Ideas | New FACT rows |
|---|---|---|---|---|
| PK1 | UX | 67 | 249 | 7 |
| PK2 | ALT, LOC | 62 | 283 | 5 |
| PK3 | CONT | 154 | 235 | 10 |
| PK4 | AV, GEN | 84 | 280 | 14 |
| PK5 | ASSET, PHIL | 153 | 274 | 13 |
| PK6 | FLOW, SHOT | 66 | 305 | 9 |
| PK7 | INPUT, STORY | 49 | 259 | 14 |
| Total | 12 prefixes | 635 | 1,885 | 72 |

### 1.4 Canonical doc writers

| Doc | Lines | Primary sources (from each doc's own header) |
|---|---|---|
| 01 System overview | 364 | I, V1, E; all ledger kinds |
| 02 Functional capabilities | 3,677 | CAP ledger (287 entries) |
| 03 User workflows | 796 | CAP (primary), AI, STATE, ROUTE, INV, FACT, ENTITY, DEAD; V1 to V8 |
| 04 Domain and state model | 789 | ENTITY (38), TABLE (63), FACT (359); C, V1, V3, V5 to V10 |
| 05 Data model | 890 | TABLE and FACT from C; INV and STATE from H; R1a, R1b |
| 06 Writing and story | 769 | V3, V4 (primary); E, H, V1, R1a, R1b |
| 07 Visual assets and continuity | 899 | V2, V5, V6, V7, V8 (location and camera), V9 (references), H, R1a, R1b |
| 08 Shots, frames and generation | 832 | V7, V8, V9, V10, E, I, H, K |
| 09 AI and prompt system | 1,176 | E (primary), R2, AI entries, retired-id map, M |
| 10 Versioning, locking, invalidation | 844 | H (primary); R1a, R1b; K; C; V1 |
| 11 Application architecture | 699 | I (primary); V1, E, C, L, V10, R1a, R1b, R2 |
| 12 Async, reliability, providers | 630 | I (primary); V9, V10, E |
| 13 Test and evidence map | 632 | J (primary); V7, V8, V9, R1a, R1b, R2 |
| 14 Dead, partial, duplicated | 593 | K (primary); R1 claims; DEAD ledger (117) |

Fourteen writers, one per document from `01` to `14`. `15` was not present at the time of writing.

---

## 2. Directories and modules inspected

### 2.1 Directory coverage

Method: every file in `file-inventory.txt` was mapped to a directory row. "Named in reports" means a report contains that repository path (any reporter, any section). A path mention is weaker than a read. The reporter's own inspected and not-inspected statements (section 2.4) are the stronger evidence. "Cited in ledger evidence" means the path appears in a ledger `evidence`, `evidence_note`, `evidence_run`, `code_path`, `callsite` or `entrypoint` field.

| Directory | Files | LOC | Named in reports | Reporters naming a file | Cited in ledger | Not cited |
|---|---|---|---|---|---|---|
| src/components/pipeline | 89 | 32,825 | 36 | C H I J K L R1a R1b V1 V2 V3 V4 V5 V6 V7 V8 V9 V10 | 78 | 11 |
| backend/src/routes | 15 | 16,539 | 14 | C E H I J K L R1a R1b R2 V1 V2 V3 V4 V5 V6 V8 V10 | 15 | 0 |
| backend/src/services | 37 | 13,769 | 31 | C E H I J K L R1a R1b V1 V2 V3 V4 V5 V6 V8 | 37 | 0 |
| src/lib | 58 | 13,174 | 50 | C E H I J K L R1a R1b R2 V1 V2 V3 V4 V5 V6 V7 V8 V9 V10 | 52 | 6 |
| backend/src/tests | 43 | 8,965 | 24 | C E I J K L R1a R1b R2 V1 V2 V3 V5 V6 V7 V8 V10 | 41 | 2 |
| src/components (other) | 68 | 7,609 | 4 | K R1b R2 V2 | 20 | 48 |
| backend/migrations | 46 | 3,962 | 16 | E H I K L R1a R1b R2 V2 V3 V4 V6 | 46 | 0 |
| src/pages | 9 | 2,793 | 7 | E I J K L R1a R1b R2 V1 V2 V3 V4 V5 V6 V8 V9 V10 | 9 | 0 |
| backend/src/services/image-generation | 3 | 1,402 | 2 | C E I J K L R1b V2 V5 V6 | 3 | 0 |
| backend/scripts | 8 | 1,396 | 8 | C E I J K L R1a R1b R2 V1 V2 V3 V7 V8 | 8 | 0 |
| backend/src/utils | 9 | 1,365 | 7 | E I K L V3 V4 | 9 | 0 |
| src/types | 5 | 1,321 | 5 | C K L R1a R1b V1 V2 V3 V5 V6 V7 V8 V9 V10 | 5 | 0 |
| src (root files) | 8 | 723 | 6 | I J K R1b R2 V1 V2 V3 V4 V10 | 4 | 4 |
| backend/src/services/video-generation | 5 | 705 | 5 | C H I J K L R1a | 5 | 0 |
| e2e | 2 | 639 | 2 | J V1 V2 V3 V4 V5 V6 | 2 | 0 |
| backend/src/middleware, config, transformers | 6 | 285 | 6 | C I K L R1a R1b V1 V2 V4 V6 V7 | 6 | 0 |
| src/hooks | 3 | 254 | 2 | C I K L | 2 | 1 |
| backend/src (root files) | 1 | 100 | 1 | I K L R1a R1b R2 V1 V5 V6 V9 | 1 | 0 |
| backend/quickies-sql | 3 | 57 | 2 | C H L R1a V1 V2 V8 | 2 | 1 |
| Total | 418 | 107,883 | | | 345 | 73 |

Directory rows are assigned by path prefix. `src/components (other)` covers `assets`, `auth`, `dashboard`, `landing`, `layout`, `styleCapsules` and `ui`.

### 2.2 Files no ledger evidence cites

- 345 of 418 inventory files (82.5%) are cited by path in ledger evidence. The rest are listed here. Symbols cited without paths, such as `FunctionName()`, are not counted, so the 73 figure overstates the gap.
- 73 files are not cited: 45 are shadcn/ui primitives under `src/components/ui/`, and 28 are other files.
- `src/`: 70 uncited (45 ui primitives plus 25 others). `backend/src/`: 2 uncited (`backend/src/tests/fixtures/sample.docx` and `sample.pdf`, binary fixtures). `backend/quickies-sql/asset-images-RLS-polices.sql` is the remaining uncited file.
- The 25 other `src/` files: `src/App.css`, `src/index.css`, `src/styles/screenplay.css`, `src/vite-env.d.ts`, `src/hooks/use-toast.ts`, `src/lib/utils.ts`, `src/lib/tiptap-extensions/{Action,DialogueLine,DialogueLineDecorations,SceneHeading,Transition}.ts`, `src/components/assets/AssetGallery.tsx`, `src/components/landing/ScrollReveal.tsx`, `src/components/layout/MainLayout.tsx`, `src/components/pipeline/{AddAssetModal,AssetFilterModal,LocationViewsDialog,ProjectAssetCarousel,ReferenceImageThumbnail,SceneIndicator,ScreenplayToolbar,SliderComparison,SplitWizard}.tsx`, `src/components/pipeline/Stage12/types.ts`, `src/components/pipeline/Stage8/TransformationImagePicker.tsx`.
- 11 uncited primitives are named in no report: `alert-dialog`, `checkbox`, `drawer`, `dropdown-menu`, `hover-card`, `radio-group`, `scroll-area`, `separator`, `skeleton`, `slider`, `theme-toggle`. Their use was not verified by any reporter.

### 2.3 Uncited files by depth of reporter coverage

- **Named in a reporter's scope or narrative, not path-cited in the ledger.** `src/lib/tiptap-extensions/*` (V3 lists "all" as read). `AssetFilterModal` (V5 section 3.3), `ProjectAssetCarousel` (V5 section 4.5), `SplitWizard` (V5 split section), `AddAssetModal` (V5, `AddAssetModal.tsx:67-76`), `ScreenplayToolbar` (V3 line 229), `TransformationImagePicker` (V6 table row R31, `TransformationImagePicker.tsx:46`).
- **Named only as a render site or in a scope list.** `LocationViewsDialog.tsx` (474 LOC, the largest uncited non-primitive file). K lists it as "LIVE, 1 render site" (`Stage5Assets.tsx:1607`). V5 names it in its scope list (line 7). No narrative section describes its behavior, and no ledger entry cites its path. Treat its behavior as not described in the corpus.
- **Named by no report.** Only the 11 primitives listed in section 2.2.

### 2.4 Reporter not-inspected statements

Compiled from each reporter's own section. These are the reporter's own admissions, not this audit's findings.

| Reporter | Not inspected, sampled or grep-only (reporter's own words) |
|---|---|
| V1 | `projects.ts` read only at L1-1012 and L3961-4006 plus spot ranges; other `projects.ts` ranges sampled. Migrations 001, 014, 022, 027, 040, 041 (head), 044 only. |
| V3 | `ContentAccessCarousel.tsx` lines 421 to 984 and 1146 to 1335 grep-only. |
| V4 | `scriptManifest.test.ts` not read in depth (V4 line 161). Cost accounting in `llmClient` not inspected. |
| V6 | Cross-slice regions sampled only (`projects.ts` ~1330-1480, ~1915-1945, ~3600-3800; `frames.ts` 548-625). Stage 7 re-extraction not traced. |
| V7 | No inspected-files section located. Scope is stated in the header and covers five services and the listed route ranges. |
| V8 | `src/components/pipeline/Stage12/ShotListPanel.tsx` not inspected (V8 line 227). |
| V9 | `frameService.ts` partial (route map and L565-735). `idx_text_field_versions_selected` WHERE clause not read (V9 line 221). |
| V10 | `connectivity-test.ts` lines 1-40 plus grep. `projects.ts` 3050-3130 partial. Env names only. |
| C | Services beyond named ones grep-level. `projects.ts`, `frames.ts`, `sceneAssets.ts`, `projectAssets.ts` sampled. Seed scripts grep-level. Live DB and storage not accessible by design. |
| E | Streamline commit route (`streamline.ts:45-90`). Ten services grep-level or unread. `image-generation.test.ts` grep-only. |
| H | Streamline backfill route (`streamline.ts:99-176`), location-view delete storage cleanup, shot merge neighbour logic, `promptGenerationService.ts` 1048-1121. Labelled wave1-unverified. |
| I | Frontend interaction code beyond poll and fetch sites. `frameGenerationService.ts` 1258-1310 and 1100-1240. `videoGenerationService.ts` 430-660 partly. `token-utils.ts` not re-read. Test files `connectivity-test.ts`, `veo3-test.ts`, `llm-integration.test.ts` not opened. |
| J | Most frontend per-test assertions. e2e selectors beyond grep spot checks. `createGlobalAssetImageJob` body. Not executed: e2e, `image-generation.test.ts`, `llm-integration.test.ts`, five manual scripts. |
| K | Dynamic dispatch invisible to grep (K section 10). Module graph is regex-based (K section 0). |
| L | Regex counts approximate (about 2%, L section 14). |
| R1a | Live DB and runtime error text. Stage 1 to 5 locked-state components not traced (C03). |
| R1b | `.env` values not read. Live `prompt_templates` content. `text_field_versions` grants. Stage 10 rendering at runtime. |
| R2 | Runtime model responses. Deployed `GEMINI_MODEL` (R2 section 8). |

---
## 3. Routes covered

### 3.1 Counts

- 15 route modules exist in `backend/src/routes/`. All 15 are mounted in `backend/src/server.ts`: `/api/health` (`:46`, no auth), nine routers on `/api/projects` behind `authenticateUser` (`:49` to `:72`), `/api/llm` (`:75`), `/api/seed` (`:78`), `/api/style-capsules` (`:81`), `/api/images` (`:84`), `/api/assets` (`:87`). Also WD-IMPL-ROUTE-0134.
- 198 handler registrations match `router.(get|post|put|patch|delete)('<path>')` in those files.
- 143 ROUTE ledger entries exist. They are family-level and carry line ranges.
- 195 of 198 registrations fall inside a line range cited by a ROUTE entry. Method: parse `backend/src/routes/<file>.ts:<ranges>` from ROUTE evidence, including comma-separated ranges such as `projects.ts:259-637,640-807`.
- All 198 fall inside a range cited by some ledger kind (AI, CAP, DEAD, INV and others included).

### 3.2 Per-file coverage

Format: file, registrations, covered by ROUTE ranges, covered by any kind.

| Route file | Reg. / ROUTE / any | Route file | Reg. / ROUTE / any |
|---|---|---|---|
| assets.ts | 7 / 7 / 7 | sceneAssets.ts | 36 / 36 / 36 |
| checkout.ts | 8 / 8 / 8 | sceneStageLocks.ts | 4 / 4 / 4 |
| frames.ts | 27 / 27 / 27 | seed.ts | 1 / 1 / 1 |
| health.ts | 1 / 1 / 1 | shotAssignments.ts | 8 / 8 / 8 |
| images.ts | 3 / 3 / 3 | stageStates.ts | 6 / 6 / 6 |
| llm.ts | 13 / 11 / 13 | streamline.ts | 7 / 7 / 7 |
| projectAssets.ts | 37 / 37 / 37 | styleCapsules.ts | 11 / 11 / 11 |
| projects.ts | 29 / 28 / 29 | Total | 198 / 195 / 198 |

### 3.3 Registrations without a ROUTE range

| Registration | Cited by |
|---|---|
| `llm.ts:348` POST /api/llm/estimate-cost | WD-IMPL-DEAD-0104 (no frontend caller) |
| `llm.ts:389` GET /api/llm/usage-stats | WD-IMPL-DEAD-0104 |
| `projects.ts:2515` POST /:id/scenes/:sceneId/shots/:shotId/split | WD-IMPL-CAP-0224, WD-IMPL-AI-0073, WD-IMPL-INVALIDATE-0055 |

### 3.4 Routes without a frontend caller

Source: K section 2.6 (K's route-liveness join of `router.<verb>` to `fetch(` in `src/`). Not re-derived here.

- Eleven `/api/llm` admin and template routes have no frontend caller (WD-IMPL-DEAD-0104).
- `POST /api/seed/prompt-templates` (`seed.ts:15`) has no fetch (K section 2.6).
- `POST /api/projects/:p/stages/:p/skip` (`stageStates.ts:416`) has no live caller. Its service method `stageStateService.skipStage` has zero callers (K DEAD-0003, report line 32).
- `GET /api/projects/:projectId/frames/:id/status` is not called by the UI. Its only reconciliation to `rejected` is therefore unreachable from the UI (WD-IMPL-FACT-0219, R1b C13).
- `GET /api/health` has no frontend fetch (expected for an infrastructure route).

---

## 4. DB entities covered

### 4.1 Counts

- 46 migration files under `backend/migrations/` (numbers 001 to 044; `022` and `024` each appear twice). Runner order is `readdirSync().sort()` (C-table-inventory, header line 3).
- 28 tables are created by `CREATE TABLE` across migrations and quickies. Verified by grep in this audit.
- TABLE ledger: 63 entries. Exact-title duplicates: `projects`, `global_assets`, `user_credits`, `video_generation_jobs` (two entries each).
- Every created table is named by at least one TABLE entry. Thirty-three distinct names are named in total (28 created plus 5 referenced-but-uncreated or column-only names).
- ENTITY ledger: 38 entries (vocabularies and logical entities; not one per table).

### 4.2 Table coverage

| Table (TABLE / ENTITY entries) | Table (TABLE / ENTITY entries) |
|---|---|
| projects (16 / 5; 2 exact-title duplicates) | shots (4 / 6) |
| branches (3 / 0) | frames (9 / 5) |
| stage_states (6 / 1) | frame_links (2 / 1) |
| prompt_templates (2 / 1) | image_generation_jobs (4 / 2) |
| style_capsule_libraries (2 / 0) | video_generation_jobs (3 / 0; 2 duplicates) |
| style_capsules (2 / 1) | scene_asset_instances (1 / 3) |
| style_capsule_applications (4 / 0) | scene_asset_generation_attempts (2 / 1) |
| global_assets (2 / 2; 2 duplicates) | scene_asset_suggestions (1 / 1) |
| project_assets (5 / 2) | transformation_events (1 / 1) |
| project_asset_generation_attempts (1 / 1) | shot_asset_assignments (1 / 1) |
| asset_angle_variants (1 / 1) | text_field_versions (2 / 2) |
| location_views (3 / 3) | user_credits (2 / 0; 2 duplicates) |
| location_match_events (2 / 0) | intake_resolutions (3 / 0) |
| scenes (3 / 3) | intake_resolution_edits (2 / 0) |

Counts are word-match counts over TABLE entry titles, summaries, evidence and notes (script `tables.mjs`). They are coverage indicators, not proof that each entry is accurate.

### 4.3 Referenced but not created

| Name | Referenced by | Repository DDL | Status |
|---|---|---|---|
| `videos` (table) | `projects.ts:3076-3079`, `:3113-3118`; `sceneStageLocks.ts:209-219` (WD-IMPL-TABLE-0005, 0028, 0057) | None in migrations or quickies (grep) | UNKNOWN in live DB. `videos` is a storage bucket name in `Veo3Provider` (WD-IMPL-TABLE-0027), a different object. |
| `invalidation_logs` | Insert at `projects.ts:3120-3131`, error unchecked (WD-IMPL-TABLE-0006, 0058) | None (grep) | UNKNOWN in live DB. |
| `users` | Scripts only (WD-IMPL-TABLE-0059) | None. `auth.users` is Supabase-managed and not a repo table. | Not a repo table. |
| `hello` | Test only (WD-IMPL-TABLE-0060) | None | Test artifact. |
| `scenes.stage_locks` (column) | Six handlers select it: `projects.ts` shots lock and unlock, `sceneStageLocks.ts` GET, lock, unlock, relock (WD-IMPL-FACT-0413) | Only `backend/quickies-sql/add_stage_locks.sql`. No numbered migration adds it (grep). | Live presence UNKNOWN. Fresh DB built from migrations lacks it (V8 C3, C-DB). |

### 4.4 Functions, RPCs and storage names

- `streamline_commit` and `streamline_commit_atomic` are defined in migrations 043 and 044 (WD-IMPL-TABLE-0017).
- `exec` RPC is called by `backend/scripts/run-migrations.ts` through `DatabaseService.runMigration`. No repository file defines it (grep, WD-IMPL-FACT-0417).
- Storage names referenced: `asset-images` (uploads), `frames` (frame delete path, contradicted by V9 14), `videos` (Veo3 upload, WD-IMPL-TABLE-0027), `streamline-staging/` (key prefix). Bucket existence and public flags are UNKNOWN.

### 4.5 Migration-level defects

- Migration 005 Step 4 uses `ADD CONSTRAINT ... UNIQUE ... WHERE`, which is not valid PostgreSQL grammar (R1a C08, WD-IMPL-FACT-0417).
- The frames `status` CHECK in `019_frames_table.sql:12-18` allows five values and excludes `invalidated`, which `projects.ts:3106-3109` writes (WD-IMPL-FACT-0207, WD-IMPL-FACT-0225). The write's error is unchecked.
- `text_field_versions` policy `FOR ALL USING (true) WITH CHECK (true)` with no `TO` clause (`036_text_field_versions.sql:29-33`, WD-IMPL-FACT-0431). Migration comment at line 29 says "authenticated users", which the SQL does not enforce.
- `prompt_templates` rows seeded with `created_by` NULL are writable by any authenticated user through the service-role path (WD-IMPL-FACT-0195; R1b C17 at WD-IMPL-FACT-0426).

---

## 5. Model and provider calls covered

### 5.1 Counts

- 61 canonical AI entries in the merged ledger (`WD-IMPL-AI-0001` to `0088`, with 27 ids retired).
- R2 reduced 85 raw entries to 58 canonical calls. Breakdown: text LLM via `llmClient.generate` 36 (one HTTP-only probe, two dead paths, one conditional); vision 4; image sink 2; image prompt paths feeding the sink 10; orphaned frontend image prompt paths 2; deterministic prompt helper 1; route umbrella 1; Veo video 1; mock video 1. The sum is 58.
- The lead added three entries from R2's uncovered list, giving 61 (section 5.2).
- Canonical calls with no UI or HTTP caller (R2 section 1): `WD-IMPL-AI-0026` (`beatService.splitBeat`), `0034` (`extractEntityMentions`, private with no call site), `0011` and `0064` (`NanoBananaClient.inpaintImage`), `0042` and `0085` (`src/lib/services/imageService.ts` has no importers).
- HTTP-only with no UI caller: `WD-IMPL-AI-0079` (`GET /api/llm/test-connectivity`, `llm.ts:420`).
- Conditional: `WD-IMPL-AI-0023` (legacy scene-dependency LLM, reached from `projects.ts:1346` only when `tiptapDoc` is absent or the manifest throws).

### 5.2 Uncovered paths found by R2 and disposition

| R2 item | Path | Disposition |
|---|---|---|
| 1. Global asset image generation | `src/pages/AssetLibrary.tsx:240`, `AssetDialog.tsx` `handleGenerateImage` (`:129`), `assetService.generateImageKey` (`assetService.ts:185-196`), `ImageGenerationService.createGlobalAssetImageJob` | Added as WD-IMPL-AI-0086 (M-AI-01) |
| 2. Orphaned frontend wrappers | `src/lib/services/imageService.ts:163` `generateAssetImageKey`, `:183` `generateFrameAnchor`. Module has no importers. | Not added. The underlying endpoint is covered by WD-IMPL-AI-0085. Registry gap remains. |
| 3. Frame start and end image jobs (caller level) | `frameGenerationService.ts:896` inside `startFrameGeneration` (`:845`) | Added as WD-IMPL-AI-0087 (M-AI-02) |
| 4. Generic LLM pass-through | `backend/src/routes/llm.ts:64-70` `POST /api/llm/generate`, client-supplied `systemPrompt` and `userPrompt` | Added as WD-IMPL-AI-0088 (M-AI-03). ROUTE entry WD-IMPL-ROUTE-0131 names it. |
| 5. Test and script invocations | `llm-integration.test.ts:304,325,367` (inside `test.skip`), `connectivity-test.ts:68,127` (not picked up by jest), `scripts/test-style-capsule-influence.ts:148` | Not added. Not runtime paths. |

### 5.3 Model and provider facts re-checked in code

- Text model fallbacks, three literal sites: `llm-client.ts:76` constructor default `gemini-2.5-flash-lite`; `:106` `generate()` fallback `gemini-1.5-flash`; `:310` `estimateCost()` fallback `gemini-2.5-flash-lite`. `generate()` passes the resolved model to `performGeneration` (`:115`). The site at `:310` is recorded in doc 09 line 1112 but not in the V9 or E ledgers. Deployed `GEMINI_MODEL` is UNKNOWN.
- Isolation sentence branch: `ImageGenerationService.ts:124-131` injects background context only for `master_asset` and `angle_variant`. This confirms R2 and contradicts E's claim for `WD-IMPL-AI-0084` (section 7).
- `VIDEO_PROVIDER` falls back to `mock` (`createVideoProvider.ts:18`), so an unset variable produces mock video (WD-IMPL-AI-0067).
- `LLMClient.validateEnvironment` requires `GOOGLE_AI_API_KEY` and `LANGSMITH_API_KEY` (`llm-client.ts:93-100`).

### 5.4 Judgment calls affecting counts (R2 section 2)

- The route umbrella `POST /api/llm/generate-from-template` (WD-IMPL-AI-0001) is kept as a canonical call because it chooses a DB template by name and has no prompt of its own.
- `0053` (camera-change analysis) is merged into `0008` because it calls the same prompt function with a vision argument.
- Regeneration guidance is passed as a variable that no seed template contains. The prompt text is therefore identical for regenerate and generate, and those entries are merged.

---

## 6. Tests covered

### 6.1 Inventory

- J counts 74 test files: 37 backend suites under `backend/src/tests`, three manual scripts, four backend utils under `__tests__`, two backend scripts, 26 frontend files, and two e2e specs.
- This audit's path pattern matches 75 inventory paths. They include the two binary fixtures and the test helper `backend/src/tests/helpers/supabaseMock.ts`. 73 of the 75 are cited by path in ledger evidence. The two uncited are the binary fixtures.
- TEST ledger: 124 entries (50 from wave 1 and 74 from J, per doc 13 and checked by count).
- Frontend Vitest config: `vite.config.ts` (`include: src/**/*.{test,spec}.{ts,tsx}`, jsdom). Backend Jest config: `backend/jest.config.js` (`**/src/tests/**/*.test.ts`, `**/src/**/__tests__/**/*.test.ts`).

### 6.2 Executed results (reported by J; not repeated here)

| Suite | Result per J |
|---|---|
| Frontend Vitest, default env | 22 of 26 files pass; four fail at collection with `Missing Supabase environment variables` from `src/lib/supabase.ts:8`. 271 tests pass. |
| Frontend Vitest, four failing files with dummy `VITE_SUPABASE_*` | 39 tests, all pass. Full frontend under dummy env: 26 of 26 files, 310 tests, 0 failing. |
| Backend Jest subset (excludes `image-generation.test.ts` and `llm-integration.test.ts`) | 39 of 39 suites pass; 406 pass, 7 skipped, 413 total. |
| Backend Jest full | Not run. UNKNOWN for the two excluded suites. |
| Playwright e2e (two specs) | Not run. |
| Manual and live scripts | Not run. |

J reports zero failing assertions in any executed test. Failures were environmental.

### 6.3 Gaps

- Scene stage-lock routes (`sceneStageLocks.ts:56` lock, `:145` unlock, `:290` relock) have no test. Checked here: no test file under `backend/src`, `src` or `e2e` contains the route path `stage-locks`. `backend/src/tests/shotAssetAssignment.test.ts` mocks a `stage_locks` column response (lines 342, 360, 377) and does not call those routes. Doc 13 cites WD-IMPL-FACT-0186 for this claim. That id resolves to a timeouts entry (section 7.3).
- The shot-list lock DB trigger in migration 014 is not exercised by any test (J section 7).
- `image-generation.test.ts` calls `master_asset` jobs without a style, which current enforcement rejects (V5 C7, V2 item 13). J predicts failures. Not executed.
- Schema coverage was not assessed by any test-focused reporter (C section 13).
- No test in executed suites reaches a live provider, a live database, or a browser.

---
## 7. Cross-wave contradictions and resolutions

### 7.1 Verdicts on wave-1 claims (R1a and R1b, C01 to C22)

Evidence A is the claim source. Evidence B is the verdict ledger entry, plus any check made by this audit. Confidence describes the static verdict. Runtime behavior is always listed separately under section 8.

| # | Claim (source) | Evidence A | Evidence B | Resolution | Confidence |
|---|---|---|---|---|---|
| C01 | Frame routes read `stage_states.state_data` by `project_id`, so the visual capsule never reaches frame jobs (V2, V9, H) | V2-FACT-02, V9 | R1a-FACT-01 (WD-IMPL-FACT-0410) | CONFIRMED. Five frame routes; the error is discarded, so the id is always undefined. | High |
| C02 | `projects.writing_style_capsule_id` and `visual_style_capsule_id` are read but never written (V2) | WD-IMPL-FACT-0019 (V2) read sites | R1a-FACT-02 (WD-IMPL-FACT-0411) | CONFIRMED. Only migration 004 adds them. Five conditional read sites. | High |
| C03 | Phase A unlock warning dialog never opens (V1, H, K DEAD-0007) | WD-IMPL-DEAD-0007 (ProjectView reads `downstreamStages` top-level) | R1a-FACT-03 (WD-IMPL-FACT-0412); `stageStates.ts:595-607` nests it under `details` | CONFIRMED. Else branch auto-confirms the cascade with no prompt. | High (static). UI runtime UNKNOWN. |
| C04 | `scenes.stage_locks`, `videos`, `invalidation_logs` queried but created by no migration (V1, C, V8, H, L) | V1 wording "nonexistent" (WD-IMPL-TABLE-0005) | R1a-FACT-04 (WD-IMPL-FACT-0413); grep in this audit | CONFIRMED for repo DDL. "Nonexistent" overstates it. Live DB state UNKNOWN. | High (repo). UNKNOWN (live). |
| C05 | Stage 7 shot-list lock is not enforced by shot mutation routes (V8, L) | WD-IMPL-INVALIDATE-0083, WD-IMPL-PRESSURE-0046 | R1a-FACT-05 (WD-IMPL-FACT-0414); `trg_sync_scene_lock_status` copies lock transitions into `scenes.status` and raises nothing | CONFIRMED. Trigger raises nothing. | High |
| C06 | `DELETE /shot-assignments/all` is shadowed by `/:assignmentId` (V8) | V8 C1 | R1a-FACT-06 (WD-IMPL-FACT-0415); `shotAssignments.ts:195` precedes `:223` (checked here) | CONFIRMED. Bulk route unreachable. 500 predicted, not run. | High (static) |
| C07 | Two location-state classifiers at 0.72 and 0.8 (V7) | V7 section 3.4 | R1a-FACT-07 (WD-IMPL-FACT-0416); `projects.ts:102-112`, `continuityCompositionService.ts:233` | CONFIRMED. Both live; they disagree for confidence in [0.72, 0.8). | High |
| C08 | Migration runner calls an `exec` RPC no migration defines; migration 005 invalid; duplicate 022 and 024 (C) | C-DB migration findings | R1a-FACT-08 (WD-IMPL-FACT-0417); no `exec` definition found (checked here) | CONFIRMED (static). Live runner behavior UNKNOWN. | High (static) |
| C09 | UI offers `audio-visual`; backend and DB accept `audio_visual` (C, V1, V3, L) | `src/types/project.ts:31`, Stage 1 UI | R1a-FACT-09 (WD-IMPL-FACT-0418); `projects.ts:684` and `001:13` (checked here) | CONFIRMED. Save fails for that value. | High |
| C10 | `storyContextService` treatment keys never match stored content, so treatment context is empty (V3, V6) | V6-FACT-07 (WD-IMPL-FACT-0075) says treatment and beat keys both mismatch | R1a-FACT-10 (WD-IMPL-FACT-0419) | CONFIRMED for treatment only. Beat keys match. The V6 beat claim is CONTRADICTED. Correction is misattached (section 7.3). | High |
| C11 | Asset-extraction distillation sends no script text (V5) | V5 C11 | R1a-FACT-11 (WD-IMPL-FACT-0420); prompt built from generated labels | CONFIRMED. `extractAssets` caller not exhaustively grepped (R1a). | High |
| C12 | Aspect ratio and inpaint mask stored but not sent to `gemini-2.5-flash-image` (V9) | E-FACT-09, E-FACT-10 (WD-IMPL-FACT-0188, 0261) | R1b-FACT-12 (WD-IMPL-FACT-0421); `inpaintImage` has zero callers | CONFIRMED. Output dimensions UNKNOWN. | High (static) |
| C13 | Frame stays `generating` after failed job; UI polls GET frames and never calls status (V9, H) | H-FACT-14 (WD-IMPL-FACT-0219) | R1b-FACT-13 (WD-IMPL-FACT-0422) | CONFIRMED. Only `GET .../frames/:id/status` sets `rejected`; no UI caller. | High (static) |
| C14 | Render confirm charges all shots incl. skipped; re-confirm duplicates; no refunds (V10) | WD-IMPL-FACT-0126 (V10-FACT-04) | R1b-FACT-14 (WD-IMPL-FACT-0423); `addCredits` has zero callers | CONFIRMED. Billing amounts and runtime UNKNOWN. | High (static) |
| C15 | Re-approving the script hard-deletes unmatched scenes with cascade (V3) | V3 section 15 ("deleted scenes become continuity_broken") | R1b-FACT-15 (WD-IMPL-FACT-0424); `projects.ts:1379-1387`, `:1420` | PARTIALLY CONFIRMED. Delete needs a miss on both slug:number and the number fallback. The `continuity_broken` promise is not implemented. Uses R1b's condition. | High |
| C16 | LangSmith explicit callbacks never attach; `langsmith_trace_id` never written (E, I) | E-PROV-05 (WD-IMPL-PROV-0020); I "PARTIAL" verdict | R1b-FACT-16 (WD-IMPL-FACT-0425); `llm-client.ts:157-160` | CONFIRMED for the explicit path. Env-driven tracer depends on `LANGSMITH_TRACING` (UNKNOWN). | High (explicit). Low (env tracer). |
| C17 | Two diverging seed copies; `created_by` NULL rows editable by any user (E) | E-FACT-14 (WD-IMPL-FACT-0193), E-FACT-16 (WD-IMPL-FACT-0195) | R1b-FACT-17 (WD-IMPL-FACT-0426); about 88 lines differ | CONFIRMED. Live content UNKNOWN. | High (static) |
| C18 | `shots.transformation_flags` written but unread; no automatic detection wired (V6) | WD-IMPL-CAP-0192 (V6) | R1b-FACT-18 (WD-IMPL-FACT-0427) | PARTIALLY CONFIRMED. Only Stage 7 extraction writes flags, so "Stage 3" in CAP-0192 is wrong (CORRECTED). LLM detection is automatic. Conversion to `transformation_events` is not wired. | High |
| C19 | Streamline commit ignores `formatChoice`; not idempotent on retry (V4) | V4 section 14 | R1b-FACT-19 (WD-IMPL-FACT-0428) | CONFIRMED. Duplicate rows on retry after success. | High (static) |
| C20 | `project_assets.locked` has no unlock path; image mutation routes ignore lock (V5) | V5 C1, C20 | R1b-FACT-20 (WD-IMPL-FACT-0429); H-FACT-09 (WD-IMPL-FACT-0214) | CONFIRMED. Three writers (lock-all, per-asset with no UI caller, Stage 8 create). H-FACT-09 supersedes the wave-1 claim that only lock-all and POST set it. | High |
| C21 | `/projects/new` creates a project, then the Stage 1 lock returns 404 (V1) | V1 TODO in App-level `handleNewProject` | R1b-FACT-21 (WD-IMPL-FACT-0430) | CONFIRMED. Reachable only by typed URL. | High |
| C22 | `text_field_versions` RLS is open to the anon role (C) | C-DB RLS finding | R1b-FACT-22 (WD-IMPL-FACT-0431); `036_text_field_versions.sql:29-33` (checked here) | CONFIRMED. Policy has no `TO` clause; the comment says authenticated. | High |

### 7.2 Cross-wave and cross-reporter contradictions

| # | Claim and conflicting statements | Evidence this audit checked | Resolution | Confidence |
|---|---|---|---|---|
| X1 | **Boot failure vs per-route 500** for missing `GOOGLE_AI_API_KEY`. E-FACT-19 (WD-IMPL-FACT-0198): each route that instantiates the image service returns 500. I, via H-FACT-04 (WD-IMPL-FACT-0209, and I's copy WD-IMPL-FACT-0227): module-scope construction is a boot failure. | Module-scope sites: `frameGenerationService.ts:1600` (`new FrameGenerationService()`), which constructs `ImageGenerationService` at `:131`; `routes/images.ts:6`, `routes/assets.ts:8`, `routes/projectAssets.ts:20`. Per-request sites: `projectAssets.ts:1413`, `:1977`, `:3420`; `frameGenerationService.ts:735`. `NanoBananaClient.ts:21-27` throws. | Both are right for different sites. Module-scope construction fails at module evaluation, before `app.listen` (inferred from evaluation order; not run). Per-request construction fails one request. I's correction is the more specific claim and docs 08 and 12 adopt it. Doc 14 still lists it as a conflict. | High (construction sites). Medium (boot consequence). |
| X2 | **Stage 7 `outdated` producer.** K's correction to WD-IMPL-DEAD-0031 says the unlock cascade at `sceneStageLocks.ts:245-249` sets Stage 7 to outdated. V8 (WD-IMPL-DEAD-0031) says no reachable path does. | Gate `sceneStageLocks.ts:152-153` rejects a stage outside 7 to 12. Loops start at `stage + 1` (`:189-193`, `:245-249`), so Stage 7 is never in the downstream set. Every other `'outdated'` writer targets Stages 8 to 12: `projects.ts:3147-3148`, `shotAssetAssignmentService.ts:333` (Stages 9 to 12). Phase A cascade at `stageStates.ts:578-650` runs only for Phase A stages 1 to 5 (`stageStates.ts:530`). Grep of `'outdated'` in non-test backend finds no Stage 7 writer. | K's correction is refuted. WD-IMPL-DEAD-0031 stands. Caveat: project-level `stage_states` rows with `stage_number` 7 would be affected by `stageStates.ts:578-650`. No writer of such rows was found. See section 7.3 for the docs that carry this open. | High (scene-level). Medium-High (with the project-level caveat). |
| X3 | **Gemini text model.** V9 says the constructor default (`gemini-2.5-flash-lite`) and the `generate()` fallback (`gemini-1.5-flash`) conflict. V8 C7 and E report similar. | `llm-client.ts:76`, `:106`, `:310`. `generate()` passes the resolved model at `:115`. `:310` is a third site, recorded in doc 09 line 1112 only. | Executed model is `request.model \|\| GEMINI_MODEL \|\| 'gemini-1.5-flash'` at `:106`. The `:76` default applies only to the constructor. The `:310` default applies only to cost estimates. Deployed `GEMINI_MODEL` UNKNOWN. | High (code). UNKNOWN (deployed). |
| X4 | **Legacy scene-dependency LLM (AI-0023).** V3 calls it "effectively unreachable". R2 section 5 and PK7 say it is reachable under a condition. | `projects.ts:1338-1364` (PK7); `projects.ts:1346` (R2) | Conditionally reachable. R2 and PK7 agree. The V3 wording is not adopted. | High |
| X5 | **Isolation sentence on transformation post-image prompt (AI-0084).** E says isolation is added via `createImageJob`. V6 and R2 say no isolation is applied. | `ImageGenerationService.ts:124-131` (checked here): only `master_asset` and `angle_variant`. | No isolation applied. E's claim is CONTRADICTED (correction on AI-0084). | High |
| X6 | **Duplicate isolation sentence (AI-0081).** E contradiction 11 says a duplicate is possible for edit-image with `removeBackground`. R2 says the helper runs in two functions. | R2 section 5 row 0081 | Possible on the project-asset edit path with `removeBackground`, as R2 states. Not run. | Medium |
| X7 | **AbortController.** I (section 4), E-PROV-10 and H-PROV-10 say `StreamlineDropZone.tsx` has the only `AbortController` in `src`. Doc 11 line 110 repeats it, citing WD-IMPL-FACT-0171. Doc 12 says none exists. | Case-insensitive grep of non-test `src` and `backend/src` for `AbortController` or `AbortSignal`: zero matches (checked here). WD-IMPL-FACT-0171 is the service-role RLS entry, not an abort entry. | None exists. The I and E claim is wrong. Doc 11 line 110 is stale. | High |
| X8 | **Values in local `backend/.env`.** E (sections 2 and 7) says `backend/.env` sets `LANGSMITH_TRACING=true`. V9 and R2 section 8 state `GEMINI_MODEL` values. I (section 5.1), J, R1b and docs 01 and 09 say `.env` values were not read. | Policy in I section 0 is names only. | Not used as evidence in this document. Deployed values UNKNOWN. | Low |
| X9 | **Regeneration guidance.** E-FACT-08 (WD-IMPL-FACT-0187): frontend sends guidance but no seed template contains a placeholder, so it is dropped. V3: the dialog says guidance will be saved as the commit message; code does not save it. | Both checked by the owning reporters; no template placeholder found by grep | Consistent. Guidance is not persisted and not injected by the seed templates. Live `prompt_templates` UNKNOWN. | Medium |
| X10 | **ProjectStatus.** K DEAD-0004 says the type is referenced (`project.ts:61`). L says `src/types/project.ts:1-5` has no backing column. | Both reporters' checks | Both true. The type is referenced; no DB column backs it. | Medium-High |
| X11 | **Phase A unlock dialog.** K DEAD-0007 and R1a C03. | WD-IMPL-DEAD-0007 | Same finding as C03. | High |
| X12 | **I corrections (I section 10.1, 16 rows).** Examples: transformation-events family lacks ownership check (H-ROUTE-04); "polls" claim in `VideoJobExecutor` (H-STATE-03); Veo storage path (H-PROV-04); retry does not reset `attempt_count` (H-STATE-02); checkout ownership not bound to job or scene (H-ROUTE-05); idempotency keys use `Date.now()` (H-STATE-07, WD-IMPL-STATE-0115); CORS placeholder origin (H-FACT-07); `pollUntilComplete` has zero callers (H-STATE-08); Playwright loads absent root `.env` (H-FACT-17). Row 13 (streamline config values match) is "no contradiction". | Recorded as contradictions in H and I entries. Only the boot row (X1) and the idempotency row were re-checked here (`Date.now()` in keys, source of WD-IMPL-STATE-0115 per PK4). | Accepted as the I reporter's findings. Not all 16 rows were re-verified. | Medium |
| X13 | **K corrections (K section 10).** Also: `scriptConfidence` header says mirror, rules differ (K 5.2); `streamlineService.ts:25` classify stub comment is stale; `frames.status = 'invalidated'` written but absent from CHECK (K agrees with H-FACT-02). | K section 10; H-FACT-02 | Accepted. Consistent with R1a and H. The `scriptConfidence` rule difference is recorded as K's finding. | Medium-High |
| X14 | **Shot-list lock: two systems.** L (PRESSURE-32, -33) says Stage 7 writes both the new stage-lock path and the old shot-unlock path in the same handler. | `Stage7ShotList.tsx:700`, `:813`, `projects.ts:3106-3117` (L) | Both systems co-exist in the same handler; the old one is best-effort. Code citations in L were not re-checked here. | Medium-High |

### 7.3 Ledger and citation defects (found by the lead during final checks)

Id stability. Final ids are the ones in `17-IMPLEMENTATION-LEDGER.*` (assigned mechanically by `_evidence/merge-ledger.mjs`, wave-1 and wave-2 entries first, product-knowledge coverage facts last). Two merge-script defects were found and fixed during the final pass: (a) the file-order key mis-parsed `R1a`/`R1b`/`PK*` filenames and shifted every FACT id by 22 or 72 in intermediate merges; (b) the correction table had been keyed by intermediate ids and attached corrections to the wrong entries. Both are fixed. Documents 14 and 16 were drafted against an intermediate numbering and were remapped to the final ids by `(reporter, local id)`; documents 01 to 13 and 15 were drafted against the final numbering. A residual risk remains for a small number of ids cited in prose near a changed line; the title-overlap check showed 92 to 100 percent agreement between cited ids and the surrounding text for documents 01, 03, 04, 06, 08, 10, 12, 13, 14, 15, lower for 09, 11 and 16 where ids appear in lists or tables without descriptive text.

Corrections now attached (by local id, so they follow the entry): V6-FACT-07 (WD-IMPL-FACT-0097, treatment keys mismatch stands; beat keys do match per R1a), V8-DEAD-05 (WD-IMPL-DEAD-0031, K's contradiction refuted by the lead), K-FACT-01 (WD-IMPL-FACT-0287, K's verdict on DEAD-0031 is wrong), V6-CAP-31 (WD-IMPL-CAP-0192, only Stage 7 writes transformation flags), E-FACT-19 (WD-IMPL-FACT-0220, construction-time boot failure), E-AI-48 (WD-IMPL-AI-0084, no isolation sentence on transformation post-image).

Remaining defects (not corrected in the ledger):

- Ledger evidence strings that cite a path that does not exist at that location (the file exists elsewhere): `backend/src/services/{beat,script,treatment}Service.ts` (WD-IMPL-TABLE-0032; real path `src/lib/services/*.ts`), `backend/src/services/continuityCompositionService.test.ts` (WD-IMPL-FACT-0085; real `backend/src/tests/`), `src/components/pipeline/Stage8/Stage8VisualDefinition.tsx` (WD-IMPL-FACT-0162, 0163; real `src/components/pipeline/Stage8VisualDefinition.tsx`), `src/config/streamlineConfig.ts` (WD-IMPL-TEST-0118; real `backend/src/config/streamlineConfig.ts` or `src/lib/utils/streamlineConfig.ts`), `src/lib/hooks/useSceneInfo.ts` (WD-IMPL-FACT-0143; real `src/hooks/useSceneInfo.ts`), `src/lib/services/streamlineQuestionService.ts` (WD-IMPL-TABLE-0055; real `backend/src/services/`). A scan of 5,358 path-shaped evidence strings found 41 distinct paths that do not resolve verbatim; most are bare test or migration file names (for example `streamlineCommit.test.ts`, `migrations/014_*.sql`) used as short references.
- Reporter I wrote its local ids with an `H-` prefix, so local ids collide with reporter H. The merge namespaces by file, so final ids are unaffected, but the `lid` field of I entries reads `H-*`.
- Some TABLE titles appear twice (`projects`, `global_assets`, `user_credits`, `video_generation_jobs`): overlapping views from different reporters.
- The K report's local DEAD-0049 label does not match ledger local id K-DEAD-49; use the ledger ids.
- `src/commands/setContent.ts` in three entries is the tail of `node_modules/@tiptap/core/src/commands/setContent.ts`, not a repo file.

### 7.4 Open disagreements between canonical docs 01 to 14

Found by grep of the docs for conflicting statements. Each entry names what the docs say and what the evidence favors. Nothing here was edited.

| # | Topic | Doc statements | Evidence favors | Status |
|---|---|---|---|---|
| D1 | Stage 7 `outdated` | Doc 03 line 483 (Q9): "No code sets stage 7 to outdated." Doc 10 lines 193 to 196: "the stage 7 outdated value has a code-level writer (the generic loop), but no reachable path writes it." Doc 13 lines 537, 574, 595: "CONTRADICTED between V8 and K; the correction is honored here." | X2: no writer sets Stage 7. Doc 03 matches. Doc 10's "code-level writer" is imprecise, because the loop cannot reach Stage 7 for any accepted input. Doc 13 keeps the disagreement open. | Open in doc 13. Doc 10 wording imprecise. |
| D2 | AbortController | Doc 11 line 110: "no AbortController except `StreamlineDropZone.tsx`" (cites WD-IMPL-FACT-0171). Doc 12 lines 257, 348, 568, 617: none exists. Doc 09 line 51: no `AbortSignal`. | X7: none exists. Doc 12 and doc 09 match. | Open in doc 11. |
| D3 | Boot failure | Doc 08 line 827 adopts I's boot-failure correction. Doc 12 lines 575 to 576 and 624 adopt it. Doc 14 lines 401 and 512 list it as a conflict. | X1: both claims are right for different sites. Docs 08 and 12 match the site-level evidence. | Open in doc 14. |
| D4 | LangSmith env value | Doc 09 line 38: E and V9 report local `backend/.env` values, not read here. Doc 01 line 331: E section 2 and 7 state `LANGSMITH_TRACING=true`; I did not read values. | X8: unresolved and not used. Both docs flag it. | Open (UNKNOWN). Consistent caveat. |
| D5 | Ledger entry count | Doc 01 header: "1,518 entries". Doc 17 header: "1590 entries". | 1,518 is the total before the 72 PK FACT rows. 1,590 is the merged total. Doc 01 header is stale. | Resolved: doc 01 count predates PK rows. |
| D6 | Route and model facts | Docs 01, 07, 08, 09 agree on three Gemini literals, nine routers on `/api/projects`, 61 AI entries, 287 CAP entries, 124 TEST entries. | Matches section 3, 5 and 6 counts. | No disagreement found. |
| D7 | Doc 14 header | "FACT (WD-IMPL-FACT-0265 to 0291)" (reversed range). | Typographic. | Noted. |

No disagreement was found on the Gemini model literals, on route counts, or on the outdated-cascade range outside D1.

---
## 8. UNKNOWN items and what would settle each

Built from every reporter's unknowns section and from the `U` flags in the merged ledger (155 `functional`, 104 `tested`, 63 `persisted`, 6 `reachable`, 3 `present` flags are `U`; 258 entries carry at least one `U`). Items are grouped by area. "Needs" names the access required. Nothing in this list was run by this audit.

| # | Area | UNKNOWN | Raised by | What would settle it | Needs |
|---|---|---|---|---|---|
| 1 | Schema | Live schema matches the migration chain: `scenes.stage_locks`, `videos`, `invalidation_logs`, the `exec` RPC, the 005 unique constraint, and which of the duplicate 022 and 024 files ran | C; R1a C04, C08; V1 items 5, 6, 11; V2 item 6 | Catalog dump of the live project (`information_schema.columns`, `pg_constraint`, `pg_proc`) and the operator's migration log | Read-only DB access |
| 2 | Schema | Whether a fresh database built from numbered migrations is usable by the lock routes | V8 C3; C-DB | Build a disposable DB from `backend/migrations` and call the lock routes | Disposable DB |
| 3 | Data | Live `prompt_templates` content: which seed copy is live, rows with `created_by` NULL, presence of `regeneration_guidance` placeholders | E section 15; R1b; V3 | Read-only query of `prompt_templates` (name, version, `is_active`, `created_by`) | Read-only DB access |
| 4 | Security | Grants and policies: `text_field_versions` for `anon`, EXECUTE on `streamline_commit` and `streamline_commit_atomic` | R1b; V4 | `information_schema.role_table_grants`, `pg_policies`, routine privileges | Read-only DB access |
| 5 | Storage | Bucket existence and public flags for `videos`, `frames`, `asset-images`; storage policies; storage cleanup on project delete | C; E; I; V1 item 10 | `storage.buckets` listing and policy review | Supabase read access |
| 6 | Storage | Whether deleting a location view removes a frame image shared through `asset-images` | V5 C10; H | Storage listing before and after a delete on a test project | Test project |
| 7 | Deployment | Production env names and values: `GOOGLE_AI_API_KEY`, `LANGSMITH_TRACING`, `VIDEO_PROVIDER`, `GOOGLE_CLOUD_PROJECT`, `GEMINI_MODEL`; number of API machines | E section 15; I 10.2; V10; R1b | Fly secrets listing (names only), `fly status`, `fly.toml` | Deployment access. Values must not be printed. |
| 8 | Deployment | Whether the API process boots when `GOOGLE_AI_API_KEY` is absent (X1) | I; E; H | Startup log of a deployed machine, or a boot test with the key removed | Runtime, not run |
| 9 | Deployment | Production frontend host and whether `/api` is reverse-proxied; CORS production origin (placeholder active under `NODE_ENV=production`, H-FACT-07) | I 10.2; I item 14 | Deployed response headers; deployment config | Network request to deployment |
| 10 | Deployment | Whether Fly auto-stop stops a machine during an in-flight background job | I 10.2 | Platform behavior test | Deployment |
| 11 | Observability | Whether `LANGSMITH_TRACING` is `'true'` and whether runs appear in LangSmith; whether LangChain's env-driven tracer is live | E section 15; I; R1b | One authorized model call with a runtime check | Credentials; billable call |
| 12 | Providers | Veo 3: whether `veo-3.1-*-generate-001` and the `fetchPredictOperation` contract are accepted; whether the storage path mismatch affects playback | V10 section 12; J section 7; I 10.2; E | One run of `backend/src/tests/veo3-test.ts` | GCP credentials; billable |
| 13 | Providers | Gemini deployed model; output dimensions for 16:9 and 9:16 frames | V9; R1b | Inspect stored images; deployed env | Storage and env access |
| 14 | Cost | Actual token usage and cost versus estimate; whether streamline and other calls are charged | E section 15; V4; I 10.2 | Compare provider usage metadata with the estimator on a sample call | Billable call |
| 15 | Tests | Full backend Jest run: `image-generation.test.ts` master_asset cases and `llm-integration.test.ts` | J section 7; R2 section 8 | `npx jest` with `backend/.env` and live services | Live Supabase, Gemini, LangSmith |
| 16 | Tests | Frontend collection without `VITE_SUPABASE_*`: whether the intended dev environment sets them | J section 7 | Developer environment configuration | Environment |
| 17 | Tests | Playwright e2e (two specs): pass or fail; selectors | J section 9; V6 | Run against a running stack | Running app and DB |
| 18 | UI | Phase A unlock dialog never opens; auto-confirm applies the downstream cascade (C03) | R1a | Browser run of unlock on a locked Phase A stage | Running app |
| 19 | UI | Whether a stuck `generating` frame renders as expected in Stage 10 (C13) | R1b; V9 | Browser run with an injected provider failure | Provider failure injection |
| 20 | UI | Auto-save on mount rewriting locked or outdated rows (V1 item 7); Stage 4 open writes a version (H-FACT-08); Stage 2 and 3 hydration autosave (V3) | V1; H; V3 | Network trace of a mount | Browser run |
| 21 | Frames | Whether `frames.status = 'invalidated'` is rejected at runtime (CHECK), and what the unlock returns | H-FACT-02; L section 14; C F-04 | Runtime unlock on a scene with frames | DB and app |
| 22 | Billing | Duplicate jobs and charges on re-confirm; refund absence in practice (C14) | R1b; V10 | Two confirms on a test project with credits | DB and app |
| 23 | Security | Whether a user can mutate another user's rows through service-role routes (chain-from-end-frame, batch-link-copy, shot assignments, scene stage locks, checkout binding) | V7 item 8; V8 C8; I 10.1 items 2, 7, 8 | Two-account authorization test | Two accounts; dev DB |
| 24 | Concurrency | `stage_locks` read-modify-write lost update (INV-16); streamline first-commit collisions; `text_field_versions` concurrent `createVersion` with the selected index; streamline double commit | H section 12; V4; V9; R1b C19 | Concurrent request tests | Dev DB |
| 25 | Process | Whether Express async errors outside `try` blocks crash the process | I 10.2 | Forced-throw test | Runtime |
| 26 | Lifecycle | Whether Stage 7 re-extraction deletes and re-inserts shots (cascade-deleting transformation events) | V6 UNKNOWN | Trace or test | Runtime test |
| 27 | Lifecycle | How branches are created (DB trigger or code); multi-branch behavior | V5 U2; V1 (WD-IMPL-FACT-0003 V1 claim "Main branch created only by DB trigger") | Live trigger listing; a branch-creating request | DB read |
| 28 | Data | Live `scenes.status` values `outdated`, `frames_locked`, `continuity_broken` in existing rows; `projects.visual_style_capsule_id` non-null in real data | V1 item 13; V9; H section 12; K | Live queries | DB read |
| 29 | Data | Whether any `stage_states` row has `stage_number` 7 or above (affects X2 caveat) | X2 | `select ... where stage_number between 7 and 12` on live DB | DB read |
| 30 | Data | Whether a stage 1 `stage_states` row exists for projects created in the UI before any save | L section 14 | Live query on a fresh project | DB and app |
| 31 | Persistence | Persistence of streamline AI outputs (AI-10 to AI-15) through commit; `streamline.ts:45-90` not read in detail | E section 15 | Read `routes/streamline.ts:45-90`; run a commit | Code read (not done here) or runtime |
| 32 | Persistence | Stage 4 re-approve hard-deletes existing shots and frames in practice (C15) | R1b C15 | Runtime script edit on a dev DB | Dev DB |
| 33 | Errors | Exact PostgREST error text for unknown column (`end_frame_thumbnail`, `stage_states.state_data`), UUID `'all'`, CHECK on `audio-visual`, and `.eq('id','new')` | V10 UNKNOWN; V9; R1a; R1b | Executed request against a disposable DB | DB |
| 34 | Prompts | Whether `POST /api/llm/generate-from-template` variables carry `writing_style_capsule_id` end to end | L section 14 | Trace across the frontend services and runtime | Runtime |
| 35 | Prompts | Prompt output quality and JSON parse success in practice | E section 15 | Runtime sampling | Runtime; billable |
| 36 | Versioning | Whether `idx_text_field_versions_selected` (WHERE clause) makes concurrent `createVersion` calls fail | V9 UNKNOWN | Read the index definition in `036` (not read by V9) | Code read (cheap) |
| 37 | Product | 101 product ideas have relation UNKNOWN, 43 of them in the PHIL domain (section 10.1) | PK1 to PK7 | Product judgment or runtime; not settled statically | Product owner and runtime |

---

## 9. Areas needing manual or runtime verification

### 9.1 Ordered by impact

1. **Live schema, grants and existence of named tables** (items 1 to 4, 21, 28, 29). Every Phase B lock path reads `scenes.stage_locks`. Unlock flows reference `videos` and `invalidation_logs`. A live database that differs from the repository changes the verdict on the lock, unlock and relock routes. Needs read-only introspection.
2. **Authorization on service-role routes** (item 23). The backend uses the service-role client for every query (`backend/src/config/supabase.ts`, C), so RLS is bypassed on these paths. V7 and V8 name the unchecked routes. A cross-account test settles whether a user can mutate another user's scene or shot rows.
3. **Production boot and environment** (items 7, 8, 9). Whether the API starts at all depends on module-scope construction (X1). Deployed env names decide which provider paths are live.
4. **Billing and credits** (items 14, 22). Render confirm charges the scene total, duplicates jobs on re-confirm, and never refunds (C14). Costs are hard-coded constants (H-FACT-17, V10). This is a direct money path.
5. **Video provider path** (item 12). Veo 3 model ids, the storage path mismatch, and the `uploading` status ordering (I item 5, V10) have not been exercised.
6. **Frame lifecycle** (items 19, 21). Frames can stay `generating` after failure (C13). The `invalidated` write is outside the CHECK constraint.
7. **Phase A unlock dialog and cascade** (item 18). The dialog never opens (C03), so the cascade runs without a prompt. A browser run settles the observed behavior.
8. **Autosave and version writes on mount** (item 20). Opening Stage 4 writes a version (H-FACT-08). Mount-time saves can rewrite locked or outdated rows (V1 item 7).
9. **Concurrency** (item 24). `stage_locks` read-modify-write, streamline first-commit collisions, and double-commit duplicates (C19).
10. **Stage 4 re-approve deletion** (item 32). Hard delete with cascade, conditional on two lookup misses (C15).
11. **Observability and secrets** (items 11, 13). Whether LangSmith records runs. Gemini deployed model.
12. **Test suites** (items 15 to 17). The full backend Jest run and Playwright e2e have not been executed. Frontend tests need dummy env.
13. **Storage bucket and deletion behavior** (items 5, 6).
14. **Prompt quality and parsing** (items 34, 35). Output correctness is outside static review.

### 9.2 Ordering rule

Ordered by consequence if the static verdict is wrong: data loss or money first, then access control, then whether a path runs at all, then cosmetic UI.

### 9.3 Spot checks performed for this document

Each check was run against the repository at HEAD. None executed code except where stated.

| # | Claim | Check | Result |
|---|---|---|---|
| 1 | Module-scope construction of image services | `frameGenerationService.ts:1600`, `routes/images.ts:6`, `routes/assets.ts:8`, `routes/projectAssets.ts:20` | Confirmed |
| 2 | Per-request construction | `projectAssets.ts:1413`, `:1977`, `:3420`; `frameGenerationService.ts:735` | Confirmed |
| 3 | `NanoBananaClient` throws on missing or placeholder key | `NanoBananaClient.ts:21-27` | Confirmed |
| 4 | Unlock gate and cascade range | `sceneStageLocks.ts:152-153`, `:189-193`, `:245-249` | Confirmed |
| 5 | No writer sets Stage 7 `outdated` | Grep of `'outdated'` in non-test backend; four writers listed in X2 | Confirmed |
| 6 | Shadowed bulk delete | `shotAssignments.ts:195` before `:223` | Confirmed |
| 7 | Project type validator | `projects.ts:684` accepts `narrative`, `commercial`, `audio_visual` only | Confirmed |
| 8 | Frames status CHECK | `019_frames_table.sql:12-18` lists five values, no `invalidated` | Confirmed |
| 9 | Missing DDL | Grep for `CREATE TABLE` of `videos` and `invalidation_logs` in migrations and quickies: none. `stage_locks` only in `backend/quickies-sql/add_stage_locks.sql` | Confirmed |
| 10 | `exec` RPC | No `function exec` in migrations or quickies | Confirmed |
| 11 | Model fallbacks | `llm-client.ts:76`, `:106`, `:310`; `:115` passes model to `performGeneration` | Confirmed; third site new to the ledger |
| 12 | Isolation branch | `ImageGenerationService.ts:124-131` | Confirmed |
| 13 | Video provider default | `createVideoProvider.ts:18` | Confirmed |
| 14 | `text_field_versions` policy | `036_text_field_versions.sql:29-33`, no `TO` clause | Confirmed |
| 15 | No abort primitives | Grep for `AbortController` and `AbortSignal` in non-test `src` and `backend/src` | Confirmed (zero) |
| 16 | Route totals | 198 registrations and 15 mounts counted by script and grep | Confirmed |
| 17 | Wrong-location citations | Existence check on the nine paths in section 7.3 | Confirmed |
| 18 | Required env list | `llm-client.ts:93-100` requires `GOOGLE_AI_API_KEY` and `LANGSMITH_API_KEY` | Confirmed |
| 19 | Shot-unlock cascade | `projects.ts:3143-3148` marks stages 8 to 12 | Confirmed |
| 20 | Stage-lock unlock registration and bounds | `sceneStageLocks.ts:145` (`router.post` unlock path) and the stage bound check at `:152-153` (read in full) | Confirmed |

---
## 10. Product-knowledge coverage summary

### 10.1 Relation counts by WD-IDEA domain prefix

Computed from `reports/PK*-relations.jsonl`: for each relation row, `idea_ids` count, grouped by the domain segment of the first id. 1,885 unique idea ids, each in exactly one cluster (no duplicates). Totals match `18-PRODUCT-INTENT-CROSSWALK.md` (section "Totals (ideas)").

| Domain | Ideas | EXACT_MATCH | PARTIAL_MATCH | NOT_IMPLEMENTED | CONTRADICTED_BY_CODE | UNKNOWN | Checker |
|---|---|---|---|---|---|---|---|
| ALT | 24 | 0 | 6 | 17 | 1 | 0 | PK2 |
| ASSET | 193 | 66 | 83 | 38 | 4 | 2 | PK5 |
| AV | 63 | 9 | 8 | 43 | 3 | 0 | PK4 |
| CONT | 235 | 52 | 102 | 69 | 6 | 6 | PK3 |
| FLOW | 125 | 18 | 56 | 33 | 9 | 9 | PK6 |
| GEN | 217 | 57 | 59 | 77 | 17 | 7 | PK4 |
| INPUT | 143 | 2 | 100 | 25 | 13 | 3 | PK7 |
| LOC | 259 | 41 | 180 | 24 | 6 | 8 | PK2 |
| PHIL | 81 | 1 | 27 | 8 | 2 | 43 | PK5 |
| SHOT | 180 | 8 | 58 | 113 | 1 | 0 | PK6 |
| STORY | 116 | 7 | 90 | 16 | 3 | 0 | PK7 |
| UX | 249 | 8 | 146 | 54 | 18 | 23 | PK1 |
| **Total** | **1,885** | **269** | **915** | **517** | **83** | **101** | |

Reading the table: `PARTIAL_MATCH` and `NOT_IMPLEMENTED` dominate. `EXACT_MATCH` is 14% of ideas. `CONTRADICTED_BY_CODE` (83) is recorded per cluster in the PK relation files. UNKNOWN (101) requires product judgment or runtime.

Clusters: 635 across seven checkers. Ideas per checker and FACT counts are in section 1.3.

### 10.2 Concepts the archaeology had originally missed or stated incorrectly

Deduplicated from the "missed concepts" sections of PK1 to PK7 coverage files. Each item is a code fact or absence. PK ids refer to `reports/PK*.ledger.jsonl`, whose FACT rows are merged as WD-IMPL-FACT entries.

**Frames, generation and billing**
- Frame generation is not credit-gated. Credits gate only the Stage 11 render (PK1-FACT-01).
- Idempotency keys append `Date.now()` for internal callers, so dedupe does not work. Video confirm has no key (PK4 item 12; WD-IMPL-STATE-0115).
- Reference-load failures fall back to text-only generation with no record. Reference count is uncapped (PK4-FACT-08, -09).
- Use-current-image toggles exist at four regeneration points (PK3 item 11).
- Veo request has no negative prompt, seed, resolution or audio toggle. The image provider interface declares negative prompt and seed that no caller sets (PK4-FACT-01).
- Runway Gen-3 and Kling tags are computed and stored with no reader (PK4-FACT-03). `voice_profile_id` has no reader (PK4-FACT-06; PK5-FACT-06).
- Silent LLM output truncation at 1200 and 500 characters with a trailing ellipsis (PK4-FACT-02).
- Shot-duration validator accepts up to 30 seconds while the provider clamps to 8 (PK4-FACT-07). Extraction prompt demands exactly 8 seconds while code keeps 1 to 30 (PK6-FACT-06).
- Stage 12 issue routing has no route back to Stage 10 frames (PK4-FACT-04). All Stage 12 export buttons are disabled placeholders (PK5-FACT-05; WD-IMPL-CAP-0281 lists them as a capability).

**Continuity, references and shots**
- Scene end-state columns have no writer (PK3-FACT-01). Continuity risk uses status and timestamp rules only (PK3-FACT-08).
- Reference links are stored twice, as a URL snapshot and a `frame_links` row (PK3-FACT-05). They vanish silently when the source frame is deleted (PK3-FACT-09).
- `continuity_flags` is free text consumed by one regex (PK3-FACT-10). Shot continuity flags feed Stage 9 but are not shown in Stage 7 (PK6-FACT-05).
- Shot extraction sees every scene only in summary form, truncated to 100 characters (PK3-FACT-07). Off-screen characters are stored in a background list (PK6-FACT-04).
- Blocking reference roles exist only as type unions and a label map. Nothing assigns them (PK6-FACT-07).
- Stage 7 has no camera-direction control (PK2-FACT-04). Continuity-metrics ambiguous count is always zero (PK2-FACT-01).
- No sub-location model, no named-shot model, no alias editing UI, no 3D world or angle-library feature (PK2 section "Concepts the archaeology ledger does not record").
- Character identity has no alias merge. Scene presence uses a raw substring match (PK5-FACT-01, -02). Shot-asset auto-population assigns every asset to every shot (PK5-FACT-04).
- Angle variants apply to characters only (PK5-FACT-07). `use_master_as_is` defaults to FALSE (PK5-FACT-10).
- Stage 8 Proceed and Stage 5 lock-all both require images (PK5 coverage; contradicts PHIL-038 and ASSET-094 and -095). Stage 9 generation overwrites shot prompts in place (`projects.ts:3840-3863`; PHIL-047).
- Stage 6 skip is refused only when the latest stage row is locked (PK6-FACT-03). Stage 4 generation checks Stage 3 beat content, not the Stage 3 lock (PK6-FACT-08).

**Intake, writing and stages**
- Stage 1 option sets are fixed (10 genres, four ratings, three project types, 1 to 15 minute slider) (PK7-FACT-06). Stage 1 autosave is disabled (PK7-FACT-02).
- Manual staging accepts `.doc` and reads it as text (PK7-FACT-01). Streamline raw uploads are never stored; only routed text enters content (PK7-FACT-08). Unclassified intake files drop out at routing (PK7-FACT-09).
- Writing style capsule text is injected only into three templates (PK7-FACT-10). Ask Auteur facts are not injected by the live template route (PK3-FACT-03).
- Ask Auteur allows four categories and two to four options (PK7-FACT-12). New beats default to 20 seconds; fallback beats to 60 (PK7-FACT-13). `narrative_structure` is parsed and never rendered (PK7-FACT-14). Beat treatment-excerpt view is never populated (PK7-FACT-04).
- Aspect ratio has two values and can be changed at any stage (PK7-FACT-05).
- A usable script import locks Stage 4 in the atomic commit and lands on Stage 5 (PK6-FACT-01). Location continuity warnings force at lock with a 409, though the Stage 7 copy says advisory (PK6-FACT-02).
- Stage 2 "Retroactive revise" is unreachable or toast-only (PK1-FACT-06, PK3 item 6, PK7-FACT-03).
- Stage 4 says removed scenes become `continuity_broken`; code hard-deletes them and no writer of that status exists (PK3-FACT-04; R1b C15).
- Dashboard "Stage N of 5" text is shown instead of the stage title (PK1 coverage).

**Product absences recorded as negative searches (no ledger feature entry)**
- Story rules, scene-count inference, audio and transcript intake, CineBlock 3D world input, storyboard routing, multi-person photo intake, Ask Auteur re-ask across sessions, a "Master Document" stage, director or shot-style capsules, complexity modes (PK7, PK2).
- Moderation and age verification, GDPR export or erasure, watermarking or licensing, SSO, audit log, 2FA, analytics, marketplace, public gallery, cost budgets, alerts, onboarding, error monitoring (PK2 item 11, PK5 coverage).
- Private-media requirement contradicted: the asset-images bucket is created public and user media is served through `getPublicUrl` (PK2 item 10).

**Archaeology claims that did not hold on re-check (PK7, PK5)**
- `WD-IMPL-CAP-0132` says Ask Auteur facts are injected into later prompts. Only `streamlineBackfillService.ts:62` calls `formatForInjection`.
- `WD-IMPL-AI-0023` is called "effectively unreachable" by V3. It is a live fallback (section 7.2, X4).
- `WD-IMPL-AI-0032` cites a range past the end of its file. `WD-IMPL-FACT-0026` flags `resolveConflict` as unused; PK7 agrees and notes the unit test.

### 10.3 Product-intent crosswalk

`18-PRODUCT-INTENT-CROSSWALK.md` (685 lines) assigns each of the 1,885 ideas to one concept cluster, with the relation the code has to it, and lists 635 clusters. It is the cluster-level companion to section 10.1. Its totals match section 10.1. Idea ids there are product intent. They are never evidence.

### 10.4 Unclustered ideas

None. Every one of the 1,885 idea ids appears in exactly one cluster.

---

## 11. Coverage confidence by subsystem

Overall limit: no reporter and no step of this audit ran the application, queried a database, called a network service, or called a provider. The only executed code is J's local Jest and Vitest runs, with a dummy frontend env for four files. Confidence below means confidence in the static verdict, not in runtime behavior.

| Subsystem | Confidence | Reason |
|---|---|---|
| Shell, routing, project lifecycle, Phase A stage states (V1) | High (static) | Named files read; C03 and related contradictions verified; auto-save and dialog behavior UNKNOWN at runtime |
| Style capsules and global library (V2) | Medium | Read sites verified; seed script and route prompts diverge; live content and migration 005 status UNKNOWN |
| Narrative Stages 1 to 4 and 6 (V3) | Medium | Large frontend files partly grep-only (`ContentAccessCarousel`); C10 and C15 verified; prompt templates live state UNKNOWN |
| Streamline intake (V4) | Medium | Commit idempotency and `formatChoice` verified (C19); commit route partly read; `scriptManifest.test.ts` not read |
| Project assets, Stage 5 (V5) | High (backend), Medium (UI) | `projectAssets.ts` read in full; `LocationViewsDialog.tsx` named only in scope lists |
| Scene asset instances, Stage 8 (V6) | Medium | Cross-slice regions sampled; Stage 7 re-extraction effect not traced; CAP-0192 corrected |
| Continuity and locations (V7) | Medium | Classifier conflict verified (C07); propagation UNKNOWN at runtime; several authorization gaps from static reading |
| Shot list, Stage 7 (V8) | High (routes), Medium (UI) | C05 and C06 verified; `Stage12/ShotListPanel.tsx` not inspected |
| Prompt segmentation and frames, Stages 9 and 10 (V9) | Medium | `frameService.ts` partial; C12 and C13 verified; output dimensions UNKNOWN |
| Confirmation, checkout, video, Stages 11 and 12 (V10) | Medium | C14 verified; billing amounts and Veo runtime UNKNOWN; `.env` names only |
| Database schema (C) | High (repo DDL), Low (live DB) | 28 created tables and four uncreated names verified by grep; live state unavailable by design |
| AI and model calls (E, R2, M) | High (registry), Medium (prompt content), Low (deployed models) | 61 entries; route umbrella and uncovered paths checked; prompt text not executed; deployed models UNKNOWN |
| State and invalidation (H) | Medium-High | Core facts cross-checked by R1a and R1b; concurrency UNKNOWN |
| Runtime, async, reliability, environment (I) | Medium | Boot consequence not run (X1); env names only; Fly and provider behavior UNKNOWN |
| Tests (J) | High (inventory and reported results), Medium (assertions) | Per-test assertions not read line by line; live tests not run |
| Dead, duplicate, legacy code (K) | Medium-High | Static reachability from `main.tsx` and `server.ts`; dynamic dispatch invisible; K's Stage 7 correction refuted (X2) |
| Pressure (L) | Medium | Regex counts approximate (about 2%) |
| Contradiction verification (R1a, R1b) | High | All 22 claims checked against code; several wave-1 ids mis-cited (section 7.3) |
| Product-knowledge coverage (PK1 to PK7) | Medium | Relations are reviewer judgments from keyword searches; ideas used as a checklist only; 101 UNKNOWN |
| Canonical docs 01 to 14 | Medium | Four open disagreements (section 7.4); doc 15 absent |

---

## 12. Corrections to inputs and sibling docs (found, not applied)

Nothing below was applied to `_evidence/merged/`, to `reports/`, or to the canonical docs. Each item is listed for the lead.

1. Three merged `correction` fields are on the wrong entries. The intended targets are WD-IMPL-FACT-0075 (carried by 0075), WD-IMPL-FACT-0198 (carried by 0198) and WD-IMPL-DEAD-0031 (carried by 0265). Section 7.3.
2. Nine ledger evidence paths point to the wrong directory or a non-existent file. Section 7.3.
3. Wrong provisional ids in reporter and doc text: WD-IMPL-FACT-0079 (R1a), 0243 (doc 11), 0258 (doc 13), 0172 (PK2), 0075 (R1a, V6 reference). Section 7.3.
4. Doc 11 line 110 states StreamlineDropZone holds the only AbortController. None exists (X7).
5. Doc 10 lines 193 to 196 call the generic unlock loop a "code-level writer" of Stage 7 `outdated`. The loop cannot reach Stage 7 for any accepted input (X2, D1).
6. Doc 13 lines 537, 574, 595 keep the V8 versus K Stage 7 contradiction open. The evidence in X2 settles it in favor of WD-IMPL-DEAD-0031.
7. Doc 14 lines 401 and 512 list the boot-failure difference as an open conflict. X1 shows both claims hold for different construction sites.
8. Doc 01 header "1,518 entries" predates the 72 PK FACT rows. The merged total is 1,590 (D5).
9. E, V9 and R2 state values from local `backend/.env` (for example `LANGSMITH_TRACING=true`). I-infra's policy is names only. These values are not used here (X8).
10. V3's "effectively unreachable" for WD-IMPL-AI-0023 conflicts with R2 and PK7, which say conditionally reachable (X4).
11. The `reporter` field of 72 PK ledger rows holds filenames rather than checker ids (section 7.3).
12. Two R2-identified orphan frontend wrappers (`imageService.ts` `generateAssetImageKey` and `generateFrameAnchor`) have no AI entry. The lead added three of R2's four uncovered items (section 5.2).
