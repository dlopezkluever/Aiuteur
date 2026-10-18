# WizardDirector Code Archaeology: shared reporter brief

You are one READ-ONLY reporter in a coverage swarm reconstructing WHAT THE CURRENT CODEBASE ACTUALLY IS AND DOES (repo root: `/home/user/workspace/repo`, branch `main`, HEAD only; git history is a single squashed commit, do not use it).
The output feeds a later greenfield rebuild, but YOU do not redesign, refactor, recommend, or propose anything. Facts only.

## Hard rules
- Read-only on the repo. The ONLY files you may create are your own report files under `/home/user/workspace/repo/.amp/in/archaeology/reports/` (names given in your assignment). Never edit source. Never run `npm run migrate`, any supabase CLI, or anything touching a database/network/provider. Do not run servers. Do not start long processes. You may run `grep`/`rg`/`wc`/`find`/`jq`/`node -e` for static analysis.
- Do NOT read or cite: `._docs/**` (old product docs), `README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.agents/**`, `ui-images/`, `tmp*/`, `test-results/`, `.playwright-mcp/`. They are not evidence. Code comments, JSDoc headers, and variable names are CLAIMS: verify against what code actually does. A comment saying "Stage 8 does X" proves nothing.
- Evidence hierarchy: reachable code > DB schema/migrations > backend/API/provider wiring > frontend runtime wiring > tests > config/env. Tests are evidence but may be stale.
- Do not equate "a function exists" with "a user can reach it". Trace imports and render sites. Trace button handlers into the service call, then the HTTP route, then the backend service, then the table. Record each hop.
- Do not write "implemented" as a catch-all. Use the status flags below.
- If you cannot determine something, say UNKNOWN and say what would settle it. Never fill gaps with plausible guesses.
- Prefer exhaustive over eloquent. Dense tables and bullets with `path:line-range` evidence. No filler prose, no recommendations, no "should".

## Repo map (preliminary, verify)
- Frontend: Vite + React 18 + TS in `src/` (~58k LOC). Entry `src/main.tsx`, `src/App.tsx` (react-router: `/`, `/auth`, `/dashboard`, `/projects/:projectId`, `/style-capsules`, asset library, NotFound). `src/pages/*` (ProjectView.tsx ~1000 LOC is the stage host), `src/components/pipeline/` (89 files, 33k LOC: Stage1InputMode, Stage2Treatment, Stage3BeatSheet, Stage4MasterScript, Stage5Assets, Stage6ScriptHub, Stage7ShotList, Stage8VisualDefinition(+Stage8/), Stage9PromptSegmentation(+Stage9/), Stage10FrameGeneration, Stage11Confirmation, Stage12VideoGeneration(+Stage12/), streamline/, shared/), `src/components/{assets,auth,dashboard,landing,layout,styleCapsules,ui}`, `src/lib/services/*` (23 service files, frontend HTTP clients + some direct supabase), `src/lib/stores/auth-store.ts` (only zustand store?), `src/lib/hooks`, `src/lib/utils`, `src/lib/tiptap-extensions`, `src/types/*`, `src/lib/supabase.ts`.
- Backend: Express + TS in `backend/src/` (~43k LOC incl. 9k tests). `server.ts` mounts routers; `routes/` (15 files; projects.ts 4006, projectAssets.ts 3451, frames.ts 2410, sceneAssets.ts 2332 LOC), `services/` (45 files incl. `image-generation/`, `video-generation/`), `middleware/`, `config/`, `utils/`, `transformers/`, `tests/` (43 files, jest). Deps include @google/generative-ai, @langchain/google-genai, langsmith, google-auth-library (Vertex?), supabase-js, multer, mammoth, pdf-parse.
- DB: `backend/migrations/001..044_*.sql` (note two files numbered 022 and 024), `backend/quickies-sql/*.sql`, `backend/scripts/*.ts` (seed/setup/backfill).
- Tests: backend jest `backend/src/tests/*` + `backend/src/utils/__tests__`; frontend vitest `src/**/__tests__/*`; Playwright `e2e/*.spec.ts`.
- Per-file LOC inventory: `/home/user/workspace/repo/.amp/in/archaeology/file-inventory.txt`.
- The stage numbering (1-12) is a hypothesis from file names. Discover what each stage is from code.

## Status flags (use exactly; per finding)
IMPLEMENTED (code exists) / REACHABLE (a user or a live code path can invoke it: route mounted, component rendered, handler wired) / FUNCTIONAL (end-to-end path appears complete and coherent, no obvious break; say UNKNOWN if only runtime would tell) / PERSISTED (result stored in DB/storage) / TESTED (a test asserts it; name the test) / PARTIAL / MOCK-ONLY / DEAD / ORPHANED / LEGACY / DUPLICATED / CONTRADICTED / UNKNOWN.
For capabilities give per-flag values Y / N / P(artial) / U(nknown), plus a one-line reason where not Y.

## Deliverables (two files per reporter, written to the reports dir)
1. `<ID>.md`: dense narrative report using the sections your assignment names. Include a "Cross-slice references" section listing things you saw that belong to other slices (file:line + one-line fact) and a "Contradictions / unknowns" section. Include verbatim excerpts (short) for prompts, state-transition rules, and invalidation rules when they are the evidence.
2. `<ID>.ledger.jsonl`: one JSON object per line, one per verified finding. Schema:
   `{"lid":"<ID>-<KIND>-<NN>","kind":"CAP|AI|STATE|INV|FACT|PROV|TABLE|DEAD|PRESSURE|TEST|ROUTE|ENTITY","title":"...","summary":"1-3 dense sentences","flags":{"present":"Y|N|P|U","reachable":"...","functional":"...","persisted":"...","tested":"..."},"labels":["DUPLICATED","LEGACY",...],"evidence":["path:Lstart-Lend","FunctionName()","table_name","test name"],"related":["<other lid>"],"notes":"caveats"}`
   Rules: `kind:"AI"` entries MUST also include `"callsite":"<file>:<function>"` (the dedupe key) and fields `provider`, `model`, `system_prompt_src`, `user_prompt_src`, `context_inputs`, `output_parse`, `retry_fallback`, `persistence`, `trigger`. `kind:"STATE"`/`"INV"` entries MUST include `trigger`, `precondition`, `side_effects`, `invalidates`, `preserves`, `persistence`, `ui_signal`. `kind:"CAP"` entries include `entrypoint`, `preconditions`, `code_path`, `data_touched`, `downstream`. Keep each line valid single-line JSON (escape quotes/newlines). Validate with `jq -c . <file> > /dev/null` before finishing.
   Use YOUR local `lid`s only; the lead renumbers globally into `WD-IMPL-*` ids.
   Granularity: a CAP is a meaningful user-visible capability (button/action/automatic behavior a user can trigger or observe), not a function. Expect dozens per big slice. An AI entry is one distinct model call OR one materially distinct prompt-building path (do not collapse different prompts that share a provider).

## What a great report answers for its slice
What exists; what is reachable; the exact call chain per user action (UI handler -> service -> route -> backend service -> table/provider); data read/written; what is persisted vs transient (React state, localStorage, in-memory); what is versioned; what becomes stale/invalidated/locked on edit; failure/retry/refresh behavior; where the same concept is represented in multiple places; dead/duplicate/half-wired code; tests that cover it. When you find user-authored content, state whether any path can overwrite/regenerate/normalize it.

## Final message
Reply with <=150 words: files written, counts of ledger entries per kind, top 3 surprises, and the list of slice files you did NOT manage to inspect (be honest). Put nothing else in the reply; the content lives in the files.
