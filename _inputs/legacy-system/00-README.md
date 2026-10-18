# 00 README: WizardDirector code archaeology of legacy system

Forensic reconstruction of what the WizardDirector (Aiuteur) codebase actually is and does at HEAD of `main` (single squashed commit; git history was not used). It exists so a reader can understand the legacy application without rereading ~100,000 lines of implementation. It is a read-only factual model. It contains no redesign, no architecture proposal, and no tickets.

## What this corpus is and is not

- Source of truth: reachable code, then DB schema and migrations, backend/API/provider wiring, frontend wiring, tests, configuration. Old planning docs, READMEs and code comments were treated as claims, not evidence.
- `._docs/product-knowledge/` (legacy product intent, 1,885 `WD-IDEA-*` ideas) was used only after the code model was built, as a search checklist for concepts the archaeology might have missed. Its `impl` tags were ignored. The only place it appears is `18-PRODUCT-INTENT-CROSSWALK.md` and the last column of the ledger.
- Everything is static analysis plus a small amount of executed test and script output (see `13`). No live database, no provider credentials, no browser runtime. Claims that only a running system could settle are labeled UNKNOWN and collected in `16`.

## Identifier namespaces

| Namespace | Meaning |
|---|---|
| `WD-IMPL-CAP-nnnn` | user-visible capability (287) |
| `WD-IMPL-AI-nnnn` | distinct model call or prompt-building path (61 canonical; duplicate ids folded, see `retired-ids.json` in `_evidence/merged/` and the retired list at the top of `17`) |
| `WD-IMPL-STATE-nnnn`, `WD-IMPL-INVALIDATE-nnnn` | state transitions and invalidation/cascade rules (120, 108; overlapping views from different reporters are both kept, cite both) |
| `WD-IMPL-ENTITY`, `-TABLE`, `-ROUTE`, `-PROV`, `-DEAD`, `-PRESSURE`, `-TEST`, `-FACT` | entities, tables, routes, providers, dead/duplicate code, structural pressure, tests, other verified facts |
| `WD-IDEA-*` | product intent from the legacy corpus. Never evidence. Never renumbered. Never merged with an implementation id. |

A ledger id is stable across all documents. Ids were assigned mechanically from reporter ledgers (`_evidence/merge-ledger.mjs`). Gaps in AI numbering are duplicates folded into a canonical id. Where a later reporter contradicted or corrected an earlier entry, the entry carries a `correction` field (ledger JSONL) and the correction is stated in the prose documents.

## Status vocabulary

IMPLEMENTED (code exists), REACHABLE (a user or live path can invoke it), FUNCTIONAL (end-to-end path coherent; UNKNOWN when only runtime could tell), PERSISTED, TESTED (a test asserts it), PARTIAL, MOCK-ONLY, DEAD, ORPHANED, LEGACY, DUPLICATED, CONTRADICTED, UNKNOWN. Capability flags use Y/N/P/U per P(resent), R(eachable), F(unctional), S(persisted), T(ested). These are separate on purpose: a feature can be implemented, unreachable, and untested at once.

Product-intent relations (crosswalk only): EXACT_MATCH, PARTIAL_MATCH, NOT_IMPLEMENTED, CONTRADICTED_BY_CODE, UNKNOWN.

## Document map and reading order

| Order | File | Content | Lines |
|---|---|---|---|
| 1 | `01-SYSTEM-OVERVIEW.md` | orientation: topology, repo map, stages, providers, key facts | 364 |
| 2 | `03-USER-WORKFLOWS.md` | reachable end-to-end workflows with call chains and dead ends | 796 |
| 3 | `02-FUNCTIONAL-CAPABILITIES.md` | all 287 capabilities (generated from the ledger) | 3677 |
| 4 | `04-DOMAIN-AND-STATE-MODEL.md` | entities, relations, duplicated representations, client state | 789 |
| 5 | `05-DATA-MODEL.md` | effective schema, migrations reality, storage, RLS, code-vs-schema mismatches | 890 |
| 6 | `06-WRITING-AND-STORY-IMPLEMENTATION.md` | intake, treatment, beats, script, scene parsing, user-text overwrite paths | 769 |
| 7 | `07-VISUAL-ASSETS-AND-CONTINUITY.md` | assets, style capsules, scene instances, transformations, locations, continuity | 899 |
| 8 | `08-SHOTS-FRAMES-AND-GENERATION.md` | shots, prompts, frames, images, checkout, video | 832 |
| 9 | `09-AI-AND-PROMPT-SYSTEM.md` | all 61 canonical AI calls, prompt assembly, provider matrix | 1,176 |
| 10 | `10-VERSIONING-LOCKING-AND-INVALIDATION.md` | state machines, locks, stale marking, cascades, dependency matrix | 844 |
| 11 | `11-APPLICATION-ARCHITECTURE.md` | actual runtime architecture, env vars, request lifecycles | 699 |
| 12 | `12-ASYNC-RELIABILITY-AND-PROVIDERS.md` | jobs, polling, retries, failure and refresh behavior, provider completeness | 630 |
| 13 | `13-TEST-AND-EVIDENCE-MAP.md` | what tests prove, test results observed, weak coverage | 632 |
| 14 | `14-DEAD-PARTIAL-AND-DUPLICATED.md` | orphaned, partial, duplicated, legacy code | 715 |
| 15 | `15-STRUCTURAL-PRESSURE.md` | descriptive coupling and pressure observations | 700 |
| 16 | `16-COVERAGE-AND-UNKNOWNS.md` | coverage audit, contradictions, unknowns, runtime checks needed | 634 |
| 17 | `17-IMPLEMENTATION-LEDGER.md` / `.jsonl` | flat inventory of all 1,590 entries (markdown lines; lossless JSONL) | 1635 |
| 18 | `18-PRODUCT-INTENT-CROSSWALK.md` | 1,885 `WD-IDEA-*` ids clustered with their relation to the code | 685 |
| - | `_evidence/` | reporter reports, per-reporter ledgers, merged ledger, briefs, generation scripts | scratch |

Suggested paths. Orientation: 01, 03, 10. Rebuild planning inputs: 04, 05, 07, 08, 09, 10, then 14 to 16. Lookup: grep ids in 17. `02` and `17` are generated from `_evidence/merged/merged.jsonl` by `_evidence/render-docs.mjs`; edit the ledger sources, not the rendered files.

## How the corpus was produced

1. Repository map and subsystem partition by the lead.
2. Wave 1 (12 read-only reporters): V1 shell and stage state, V2 style capsules and library, V3 narrative, V4 streamline intake, V5 project assets, V6 scene assets and transformations, V7 continuity and locations, V8 shots, V9 prompts and frames, V10 video and checkout, C database, E AI registry.
3. Wave 2 (8 agents): H state machines and invalidation, I infrastructure and async, J tests (ran the suites that need no network), K dead and duplicated code, L structural pressure, R1a and R1b (verification of 22 contradictions and weak claims from wave 1), R2 (AI registry canonicalization).
4. Merge: 1,659 reporter entries to 1,590 after folding duplicate AI entries; lead corrections applied (see `16`).
5. Late coverage check (PK1 to PK7): all 1,885 `WD-IDEA-*` ids clustered and checked against code, adding 72 new facts for behaviors the archaeology had not recorded.
6. Synthesis: documents 01, 03 to 16 written by document-writer agents from the reports and the ledger, each spot-checking claims against code and recording corrections made; 02, 17, 18 generated mechanically.
7. Lead checks: every `WD-IMPL-*` id cited in documents 01 and 03 to 14 exists in the ledger; the Stage 7 `outdated` dispute between reporters K and V8 was settled by reading `sceneStageLocks.ts:151-153` and `:189-193` (K was wrong); the corpus was grepped for recommendation language.

Model note: wave 1 reporters ran on a larger model; wave 2, the coverage checks and all document writers ran on Haiku.

## Known quality limits (read before trusting a document)

- Reporter-level overlap is preserved in the ledger. Several STATE, INV, DEAD and FACT entries describe the same fact from two reporters. The prose documents resolve most of this; the ledger does not.
- `04` was written from section reads of V5 to V10, H and the table inventory, and did not read V2, V4, E, I, J, K or R2 directly; its style-capsule, intake and credit records rest on ledger ids. `12` keyword-scanned V5, V6 and H. `07` cites few ledger ids (mostly `path:line`). Each document ends with a "Corrections made while synthesizing" list and names its weakest areas.
- Where reporters disagreed and the lead did not re-read the code, both readings are kept and marked (for example the Stage 4 approve-timer race, V3 vs H).
- Line numbers were taken from reporters; most were re-read by later passes, some were not. Treat `path:line` as a pointer to the right region, and verify before relying on an exact number.
- Counts from regex scans (L, K) are approximate.
- No runtime verification of any finding. See `16` for the ordered list of runtime and live-database checks that would settle the UNKNOWN items.
