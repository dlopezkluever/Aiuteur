# PK2 coverage: product-knowledge LOC and ALT ideas vs code

Scope: `WD-IDEA-LOC-*` and `WD-IDEA-ALT-*` from `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md` (used as a checklist only). Code searched: `backend/src`, `src`, `backend/migrations`, `backend/scripts`, `backend/quickies-sql`. Evidence cited from `merged2/merged.jsonl` (WD-IMPL ids) and from direct reads in this pass.

## Count discrepancy with the assignment

The assignment said WD-IDEA-LOC (305) and WD-IDEA-ALT (32). The ledger contains **259 LOC ids** (range 001-271, with 12 numbers absent: 041, 055, 060, 071, 074, 157, 195, 196, 198, 199, 244, 247) and **24 ALT ids** (001-024). Total **283**. All 283 are assigned to exactly one cluster; no id was invented or dropped. The brief counts may refer to an earlier ledger version.

## Relation counts

| Relation | Clusters | Ideas |
|---|---:|---:|
| EXACT_MATCH | 11 | 41 |
| PARTIAL_MATCH | 32 | 186 |
| NOT_IMPLEMENTED | 13 | 41 |
| CONTRADICTED_BY_CODE | 4 | 7 |
| UNKNOWN | 2 | 8 |
| **Total** | **62** | **283** |

## Cluster table

| # | Prefix | Cluster | Ideas | Relation | Id range |
|---:|---|---|---:|---|---|
| 1 | LOC | Locations use their own camera-direction model | 2 | EXACT_MATCH | LOC-001 .. LOC-002 |
| 2 | LOC | Single-image insufficiency and frame-time failure modes | 7 | PARTIAL_MATCH | LOC-003 .. LOC-010 |
| 3 | LOC | Location asset output format and carry-forward | 3 | PARTIAL_MATCH | LOC-011 .. LOC-013 |
| 4 | LOC | Location model options and layered architecture | 8 | PARTIAL_MATCH | LOC-014 .. LOC-051 |
| 5 | LOC | Default vs advanced tier and modes of location care | 5 | PARTIAL_MATCH | LOC-018 .. LOC-025 |
| 6 | LOC | Default location representation and AI view synthesis | 2 | PARTIAL_MATCH | LOC-020 .. LOC-021 |
| 7 | LOC | Never trap users; continuity controls not buried in Stage 5 | 2 | EXACT_MATCH | LOC-026 .. LOC-027 |
| 8 | LOC | Frame reuse and edit-from-existing as the main loop | 4 | EXACT_MATCH | LOC-028 .. LOC-031 |
| 9 | LOC | Location identity vs control and principles | 7 | PARTIAL_MATCH | LOC-032 .. LOC-038 |
| 10 | LOC | Success criteria and build sequencing (plan statements) | 7 | UNKNOWN | LOC-039 .. LOC-048 |
| 11 | LOC | Stage ownership split (shot list vs visual definition) | 2 | EXACT_MATCH | LOC-042 .. LOC-043 |
| 12 | LOC | Room-level sub-location precision in headings and views | 7 | PARTIAL_MATCH | LOC-005 .. LOC-059 |
| 13 | LOC | Heading display split (location and time of day) | 1 | EXACT_MATCH | LOC-056 |
| 14 | LOC | Sub-location burden and modeling options | 4 | PARTIAL_MATCH | LOC-061 .. LOC-064 |
| 15 | LOC | View organization: flat list per location | 4 | EXACT_MATCH | LOC-065 .. LOC-068 |
| 16 | LOC | Sub-location inference, per-shot movement, continuation scenes | 6 | PARTIAL_MATCH | LOC-069 .. LOC-076 |
| 17 | LOC | Named shots (earliest location view model) | 5 | PARTIAL_MATCH | LOC-077 .. LOC-081 |
| 18 | LOC | Camera-direction model and angle paradigm | 8 | EXACT_MATCH | LOC-082 .. LOC-094 |
| 19 | LOC | View taxonomy, metadata and naming | 5 | PARTIAL_MATCH | LOC-088 .. LOC-092 |
| 20 | LOC | Default view sets and INT/EXT proposal | 6 | PARTIAL_MATCH | LOC-095 .. LOC-100 |
| 21 | LOC | All-or-nothing vs additive view suggestion | 2 | CONTRADICTED_BY_CODE | LOC-101 .. LOC-102 |
| 22 | LOC | Open question: required view count | 1 | UNKNOWN | LOC-103 |
| 23 | LOC | Asset-stage view management | 3 | EXACT_MATCH | LOC-104 .. LOC-106 |
| 24 | LOC | View image creation: who, when, and workflow | 9 | PARTIAL_MATCH | LOC-107 .. LOC-118 |
| 25 | LOC | Style-reference cascade and no-overwrite on generate | 3 | EXACT_MATCH | LOC-115 .. LOC-117 |
| 26 | LOC | Batch generation and gap-filling options | 6 | PARTIAL_MATCH | LOC-119 .. LOC-124 |
| 27 | LOC | Canonical shot-level location identity | 6 | EXACT_MATCH | LOC-125 .. LOC-130 |
| 28 | LOC | Aliases, normalization, resolution cascade, ambiguity | 5 | PARTIAL_MATCH | LOC-131 .. LOC-144 |
| 29 | LOC | Single shared resolver as sole matching source | 1 | CONTRADICTED_BY_CODE | LOC-135 |
| 30 | LOC | Resolution triggers, manual locks, batch apply, backfill | 4 | PARTIAL_MATCH | LOC-136 .. LOC-139 |
| 31 | LOC | Degradation, risk, quality targets, telemetry | 4 | PARTIAL_MATCH | LOC-140 .. LOC-143 |
| 32 | LOC | Shot-list link UI and lock validation | 7 | PARTIAL_MATCH | LOC-145 .. LOC-151 |
| 33 | LOC | Shot-to-direction assignment core and shot-list production of directions | 6 | EXACT_MATCH | LOC-152 .. LOC-158 |
| 34 | LOC | Direction matching methods and heuristic | 7 | PARTIAL_MATCH | LOC-159 .. LOC-165 |
| 35 | LOC | Assignment visibility, editing, and prompt-review transparency | 7 | PARTIAL_MATCH | LOC-166 .. LOC-177 |
| 36 | LOC | Shot-list direction UI variants and auto-assign | 5 | NOT_IMPLEMENTED | LOC-170 .. LOC-176 |
| 37 | LOC | Per-shot reference selection and fallback chain | 12 | PARTIAL_MATCH | LOC-178 .. LOC-189 |
| 38 | LOC | Reference budget, role semantics, prompt support | 6 | PARTIAL_MATCH | LOC-190 .. LOC-197 |
| 39 | LOC | Continuity generation package as single source of truth | 3 | CONTRADICTED_BY_CODE | LOC-200 .. LOC-202 |
| 40 | LOC | Coverage advisory panel | 14 | PARTIAL_MATCH | LOC-203 .. LOC-216 |
| 41 | LOC | Coverage discoverability and navigation | 3 | NOT_IMPLEMENTED | LOC-217 .. LOC-219 |
| 42 | LOC | Continuity modes, metrics, suggestions, strict validation | 10 | PARTIAL_MATCH | LOC-220 .. LOC-229 |
| 43 | LOC | Established views: lock, replace, provenance, prompts | 13 | PARTIAL_MATCH | LOC-230 .. LOC-242 |
| 44 | LOC | Continuity anchors, project-level views, scene overrides, time/weather variants | 11 | PARTIAL_MATCH | LOC-243 .. LOC-271 |
| 45 | LOC | 3D worlds per location (film studio) | 16 | NOT_IMPLEMENTED | LOC-255 .. LOC-270 |
| 46 | ALT | Remix: fan fiction over existing movies | 1 | NOT_IMPLEMENTED | ALT-001 |
| 47 | ALT | Live-action green-screen hybrid | 1 | NOT_IMPLEMENTED | ALT-002 |
| 48 | ALT | Non-narrative content domains | 1 | PARTIAL_MATCH | ALT-003 |
| 49 | ALT | Cross-platform apps, mobile, localization, currency | 2 | NOT_IMPLEMENTED | ALT-004 .. ALT-005 |
| 50 | ALT | Public programmatic API | 1 | NOT_IMPLEMENTED | ALT-006 |
| 51 | ALT | Template marketplace and public gallery | 2 | NOT_IMPLEMENTED | ALT-007 .. ALT-008 |
| 52 | ALT | Community learning, challenges, education library | 3 | NOT_IMPLEMENTED | ALT-009 .. ALT-011 |
| 53 | ALT | Landing-page hero | 1 | PARTIAL_MATCH | ALT-012 |
| 54 | ALT | Private, time-limited, authenticated media access | 1 | CONTRADICTED_BY_CODE | ALT-013 |
| 55 | ALT | Content IP protection | 1 | NOT_IMPLEMENTED | ALT-014 |
| 56 | ALT | Safety and compliance | 1 | PARTIAL_MATCH | ALT-015 |
| 57 | ALT | Enterprise controls | 1 | NOT_IMPLEMENTED | ALT-016 |
| 58 | ALT | Admin and business tools | 1 | PARTIAL_MATCH | ALT-017 |
| 59 | ALT | Product observability | 1 | PARTIAL_MATCH | ALT-018 |
| 60 | ALT | Scale to thousands of users and large projects | 1 | PARTIAL_MATCH | ALT-019 |
| 61 | ALT | AI-assisted development method, specs, prompt library | 3 | NOT_IMPLEMENTED | ALT-020 .. ALT-022 |
| 62 | ALT | Documentation confidence rating and background doc updater | 2 | NOT_IMPLEMENTED | ALT-023 .. ALT-024 |

Ranges show first and last id; some clusters skip ids that another cluster owns (see the relations file for exact membership).

## Concepts the archaeology ledger does not record

Checked against `merged2/merged.jsonl` titles and summaries (no entry found unless stated):

1. **No sub-location model.** No entry mentions sub-locations, parent/child locations or zones; the scene heading keeps compound names such as "X - KITCHEN" (cluster 12, 14, 16).
2. **No 3D world, studio, panorama or angle-library feature** (cluster 45).
3. **No named-shot model and no auto-assign of shots to directions** (clusters 17, 36).
4. **No alias editing UI.** Aliases are written only through the asset PUT route (ROUTE-0037, which lists location_aliases) and read by the resolver; no entry states that no UI exists (cluster 28).
5. **Stage 7 shot list has no camera-direction control** (PK2-FACT-04).
6. **Continuity-metrics ambiguous count is always zero** (PK2-FACT-01).
7. **Establish-view prompt appears for any shot with an assigned direction** and switches between gap-fill and replace copy (PK2-FACT-03).
8. **Metrics suggestion rules** (repeated-location at four or more shots, fallback references, base reuse) (PK2-FACT-02).
9. **MAIN REFERENCE / FALLBACK DIRECTION prompt labels** in the generation reference list (PK2-FACT-05).
10. **Private-media requirement contradicted.** Storage bucket asset-images is created public and user media is served through getPublicUrl. FACT-0172 records the public bucket, but no entry links it to the privacy requirement (cluster for ALT-013).
11. **Absence of product features with no ledger entry:** moderation and age verification, GDPR export or erasure, watermarking or licensing, enterprise controls (SSO, audit log, 2FA), analytics and feedback, marketplace, public gallery, PWA or native apps, i18n, public API keys, admin impersonation or feature flags (ALT clusters 4-16). The ledger records what exists, so these absences are not stated anywhere.

## Ideas not clustered

None. Every one of the 283 ids is in exactly one cluster (validated by script; no duplicates, no unknown ids).

## Method and limits

- Each cluster searched code with several keywords; NOT_IMPLEMENTED and UNKNOWN clusters list the terms searched in `searched`.
- Evidence citations come from direct reads in this pass, and otherwise from wave-1 V5 and V7 narratives that were spot-checked (for example the constants, resolver rules, coverage states, route paths and migrations 038-040). Wave-1 claims that were not re-read are not marked separately; treat line numbers from those reports as approximate.
- Runtime behavior (whether the image model honours a dimension, whether frames propagate after async jobs) was not tested. Those items are marked PARTIAL or UNKNOWN.
- Product-development-method ideas (ALT-020 to ALT-024) describe the creator workflow and are outside product code; they are recorded as NOT_IMPLEMENTED with that note.
- 62 clusters: above the "typically 25-60" guide, because the location ideas span distinct concepts (failure modes, view taxonomy, identity, shot-list UI, prompt review) whose relations differ.

## Ledger

`PK2.ledger.jsonl` holds 5 new FACT entries (PK2-FACT-01 to 05). Each was read directly in this pass. Related ids point to existing WD-IMPL entries, not to PK2 lids.
