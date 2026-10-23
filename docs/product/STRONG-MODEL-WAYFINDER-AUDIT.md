# Strong-Model Wayfinder Audit (map #49)

Date: 2026-10-23. Thread: https://ampcode.com/threads/T-01a1691f-0e6f-7664-b75d-9da34e4f75b0.
Status: audit record for the next creator grilling session. It records findings and corrections. It does **not** decide anything that belongs to the creator.

**Creator follow-up, 2026-10-23:** CR-1 and CR-2 are settled in [Creator Ratification Record 3](CREATOR-RATIFICATION-RECORD-3.md), which controls their current behavior. The audit findings, counts and original recommendations below describe the pre-grilling state. Reconciliation changed docs only; no prototypes, frontier advance, `/to-spec` or launch of #69/#76–#79 followed.

## 1. Scope

- **Audited state:** `main` at `a23a31b`, including the Record 2 reconciliation commits `704b74b`, `3ba01ae`, `0628410`, `c5a9774`, `7f908d8`, `c707a25`, `31cadce`, `7867738`, `74168f4` and `a23a31b`.
- **Tickets audited (25), all those with substantive work:** #50–#68, #70–#75. #60 is open by design and its recorded brief was audited. #69 and #76–#79 have no work and were not audited.
- **Authority:** Product Constitution, then Record 1, then Record 2 (Record 2 controls where the two differ), then creator comments on issues, then the current docs.
- **Approach:**
  - Phase 0 verified the subagent model as `claude-opus-5-5`, by a probe and by `CLAUDE_CODE_SUBAGENT_MODEL` with the force flag set. No Haiku was used.
  - Tickets were audited in dependency order across four waves:
    1. #50/#54, #51/#52, #53, #67/#68, #64/#57, #56/#63, and research #70/#73;
    2. #55, #65/#66, #58/#59;
    3. #71/#61, #62/#60;
    4. #72, #74/#75.
  - Each auditor owned specific files, reasoned through each decision independently, fixed only what higher authority settles, and forwarded any edits to files it did not own. The orchestrator applied those forwarded edits and did the cross-ticket synthesis.
- **Not done:** no prototypes were created, modified, run or screenshotted, and the Wayfinder frontier did not move.

## 2. Executive result

| Classification | Count |
|---|---|
| PASS | 0 |
| PASS WITH CLARIFICATION | 11 |
| CORRECTED | 14 (one, #72, also needed a downstream recheck; done) |
| CREATOR REVIEW REQUIRED | **2 items** (raised from #58 and #68; their tickets are counted above) |

**The foundation is broadly sound.** No core design had to be reworked: identity rules, lineage derived from captured inputs, server-side locks, the one history gate, the layered compiler, the fail-closed catalogue, the job lifecycle and isolation in the database.

The defects were of three kinds:
- **Incomplete Record 2 propagation.** DOMAIN-MODEL was never reconciled. Several bodies stated superseded truth and carried a Record 2 note appended at the end (ADR 0003, NAVIGATION, RUNTIME-PLATFORM, OPERATIONAL-BASELINE, ADR 0017, ADR 0018).
- **Leftover Fact-to-media wording** in GENERATION-PACKAGE and the AI map.
- **A few agent-invented behaviours:**
  - an automatic Treatment draft;
  - a per-Segment "Make part N" spend control;
  - a capture used as a Frame source, and a capture passed to video.

## 3. Ticket-by-ticket

| # | Class | Reasoning / correction | Docs | Downstream rechecked |
|---|---|---|---|---|
| 50 Domain model | CORRECTED | Record 2 had never been applied. Added: ad-hoc Shot with no Scene; Removed from Story; D52.2 duplicate with the "made from" link; Facts as development knowledge with supersession; P1/P2 shot-owned fields; P3; CineBlock scene state; Views `0..*` shot-driven; P8-purge; late result after cancel. | DOMAIN-MODEL, ADR 0001 | 52, 55, 72 |
| 54 Lineage | CORRECTED | Direction/View had wrongly raised write-back (P2). Added: delivery shot-owned (P1); a take re-pick flags what was built from it (D62.3); Fact supersession acknowledged in the same action group; take selection is not a commitment; ad-hoc exemption; D52.2 duplicate edges are not remapped. | LINEAGE, ADR 0004, ADR 0005 | 55, 63, 72 |
| 51 Story documents | PASS W/ CLAR. | The symmetric "Sync" became D58.7's directional actions. Added Notes as a record outside Revisions, the Keep-my-edits default, and creator-edit supersession. | STORY-DOCUMENTS, ADR 0009 | 58 |
| 52 Scene identity | PASS W/ CLAR. | Duplicate offer placed before in-place mapping. Adopt work keeps anchors, marked `input-retired`. Added the duplicate-without-production form and the rule that Look assignments are not carried. | SCENE-IDENTITY, ADR 0011 | 55, 72 |
| 53 Entities/Looks/coverage | CORRECTED | ADR 0003 now states shot-driven coverage as current truth (D59.11). Removed an up-front coverage proposal on type change. Defined resolution when a Location has no Direction. Look vs separate Location is not privileged (D59.6). Looks for ad-hoc and Removed-from-Story shots. Readiness counts Direction × Look slots. | ENTITIES-AND-LOOKS, ADR 0002, ADR 0003 | 55, 59 |
| 67 Job lifecycle | PASS W/ CLAR. | Segment chaining; frame roles may be "approved or skipped"; late result after cancel; "arrived late" label. | JOB-LIFECYCLE, ADR 0006 | 55, 62 |
| 68 Business & ops | CORRECTED | The confirm rule now applies to any action and counts Takes (P3), using an inline ticket with no Start on a cap breach (X2). Added world-model spend (D61.4); the VPS cost marked unverified and portable (P11); Draft all = plans only; a BYOK failure scoped to its Account (S7). | BUSINESS-AND-OPERATIONS, ADR 0010 | 62, 64 |
| 64 AI responsibility | CORRECTED | Finished the #57 hand-off in §7 (topics and suggested answers required; delegation feeds G8). Facts removed from the media context row. Auto-triggers limited to D60.5. Creator edit supersedes a Fact without asking. Added the placeholder-mapping row (D61.5). | AI-RESPONSIBILITY-MAP, ADR 0007 | 58, 60, 65 |
| 57 Intake & Interview | PASS W/ CLAR. | X3.5 supersession, full list of Fact sources, R6 "not checked" path. | INTAKE-AND-INTERVIEW | — |
| 56 Navigation | CORRECTED | The body had presented the rejected #60 Board as decided; it is now concept-only pending the redo. Outline gains Ad-hoc shots and Removed from Story. The #58/#59/#61/#62 hand-offs now match Record 2. | NAVIGATION | 60, 62 |
| 63 Trust & locks | PASS W/ CLAR. | Fixed a broken Record 1 link. Added D58.9, D62.3, P1/P2/X5 exemptions, X7, and how a locked plan interacts with the auto-draft. | TRUST-SIGNALS-AND-LOCKS | — |
| 70 NLE research | PASS W/ CLAR. | Core facts re-verified. "Premiere OTIO since 26.3" is wrong (it is 26.0-era). That claim is on the research branch only, so no decision depends on it. | none on main | — |
| 73 Platform research | PASS W/ CLAR. | Over-claimed R2 prefix-scoped signing. "R2 has no object lock" is wrong: bucket locks exist. Both corrected where they reached main docs. | PERSISTENCE-AND-MEDIA, OPERATIONAL-BASELINE | 72, 75 |
| 55 Shot model | CORRECTED | Removed the "captured" Frame source (contradicted D61.3); captures go to image models only. Added D60.5/D60.6 in place ("an emptied plan is an existing plan"). Ad-hoc rules placed in the sections they affect. After Move to scene, explicit Look picks become visible overrides. Fixed stale Board wording and broken references. | SHOT-MODEL, ADR 0012, ADR 0013 | 60, 61, 65 |
| 65 Generation package | CORRECTED | Removed the remaining "pinned Facts" in Resolve and in the §14.2 reading (X3/P10); text packages are the only ones that carry Facts. Added compile rules for ad-hoc shots, Removed from Story, captures and worlds. | GENERATION-PACKAGE, ADR 0014 | 61, 71 |
| 66 Providers | PASS W/ CLAR. | World output is a blocking stage only. Added P3. A BYOK failure no longer suspends an Offering for other Accounts. World bias marked as an operator default, not D66. | PROVIDERS-AND-MODELS, ADR 0015 | 68 |
| 58 Writing UX | CORRECTED | Removed the unratified automatic Treatment draft on entry; it is now a "Draft treatment options" action (→ CR-1). Spend no longer assumed trivial. Completed the R6 exits. | WRITING-EXPERIENCE (+ AI map, BUSINESS) | 64, 68 |
| 59 World Definition UX | PASS W/ CLAR. | D59.11 pick-or-propose wording in the hand-off and in trust signals. | WORLD-DEFINITION | — |
| 71 Modules | CORRECTED | World generation now goes through the recorded send path. `production` plans Composition references and `workflows` composes Send back. The 3D stage is a client surface. `previs` is not a CORE prerequisite (§8.3). The auto-draft is decided server-side in `workflows`. Ad-hoc and Adopt work given owners. | MODULE-ARCHITECTURE | 61 |
| 61 CineBlock / inputs | PASS W/ CLAR. | Removed the skip-path sentence that let a capture reach video (D61.3). Scene state is not carried by a D52.2 duplicate. ADR 0024 passes. | SHOT-PLANNING-INPUTS | 72 |
| 62 Review & playback | CORRECTED | Removed the invented per-part "Make part N" spend: one price per Take (D62.7). Fixed the Unselect invariant. Removed-from-Story and ad-hoc shots are out of the cut. X6 stated as intent. Board wording fixed. | CANDIDATE-REVIEW-AND-PLAYBACK | 60 |
| 60 Scene hub (open) | PASS W/ CLAR. | The creator comment records the rejection correctly. Missing items were added in a redo-brief supplement comment (D60.2 concept, cards or list, emptied plan, presentation left to the redo, CR-2 pending, D60.8, §3.1). | issue #60 comment | — |
| 72 Persistence | CORRECTED | Neon/Fly restated as plain Postgres (P11, RT5). Purge and backup wording set to P12/P8-purge. Full D52.2 form: CineBlock data and Look assignments are not carried, and "made from" is informational. CineBlock data is project media. R2 facts fixed. | PERSISTENCE-AND-MEDIA, ADR 0021, ADR 0022 | 52 (applied) |
| 74 Runtime | CORRECTED | The body had read Fly + Neon as current. Now: the architecture is plain Docker, a stateless worker and plain Postgres, and one VPS is the current deploy choice. Host mechanisms made neutral. CineBlock is served by `web` under the same session. Price note dated. | RUNTIME-PLATFORM, ADR 0017 | 75 |
| 75 Ops baseline | CORRECTED | The body had mandated a second vendor and a full drill, and listed WAL archiving as *deferred*, contradicting P12. Now: the P12 floor is current (daily dump plus WAL off-machine, one restore test before inviting others) and the P12.3 items are deferred. ADR 0018 H1 renamed. | OPERATIONAL-BASELINE, ADR 0018 | 72 |

## 4. Problems discovered (substantive; wording-only fixes are in §3)

| Problem | Why it mattered | Authority | Fix | Commit |
|---|---|---|---|---|
| DOMAIN-MODEL had never received Record 2 | The root model contradicted X5, D52, X3, P1–P3, D61 | Record 2 | Rows, diagram, scenarios | `b02498a` |
| Direction/View raised write-back | Contradicted a creator ruling | P2 | Narrowed to Location | `b02498a` |
| Pinned Facts still in media Resolve and in the §14.2 reading; Facts in the AI map's media context | Reintroduced the rejected pin | X3/P10 | Removed; text-only | `33ae98b`, `02cea04` |
| A capture could become a Frame, or be passed to video on the skip path | Contradicted D61.3 | D61.3 | Removed in SHOT-MODEL and SPI | `4cd6b75`, `df1acfa` |
| Automatic Treatment draft on entry | Behaviour the creator never ratified; §14.1/§14.3 | Constitution, M3 | Explicit action; CR-1 | `67d1f47` |
| Per-Segment "Make part N" priced trigger | Contradicted one-Take pricing | D62.7, SHOT-MODEL §7.2 | Removed | `5dcb1be` |
| Trivial batches excluded from the 10+ rule; confirm described as a modal | Draft all would skip the ticket; modal contradicts X2 | Record 1 #68, X2, P3 | Applies to any action; inline | `6e03165` |
| World generation bypassed record-before-dispatch | Broke the one send path (P7, F3) | GENERATION-PACKAGE P7 | Routed through §6 | `df1acfa` |
| `previs` planned another module's kind and owned client assets | Ownership blur | ADR 0016 §2.1 | Reassigned | `df1acfa` |
| Auto-trigger list open-ended; G10 forbade the ratified draft | Over-broad and contradictory | D60.5, X8 | Allow-list of one | `02cea04` |
| Creator edit contradicting a Fact raised a question | Contradicted X3.5 | X3.5 | Superseded with Undo | `02cea04` |
| NAVIGATION presented the rejected Board | Would steer the #60 redo | D60.1/D60.3 | Concept only | `a76f8d3` |
| ADR 0003 and ENTITIES still proposed Directions up front | Contradicted amended §6.4 | D59.11 | Current truth rewritten | `c02de90` |
| Runtime and ops bodies read Fly/Neon, second vendor and full drill as current; WAL archiving listed as deferred | Contradicted P11/P12 | P11, P12 | Restated | `7ce869c`, `8a0f321` |
| R2 "no object lock" and "free listing" | False vendor facts | Cloudflare docs, 2026-10-23 | Corrected | `8a0f321`, `7ce869c` |
| One BYOK key failure could stop a provider for every Account | M4 leak | M4 | Scoped per Account | `33ae98b`, `67d1f47` |
| GLOSSARY lagged the docs (Fact, Board, Sync, coverage, Frame, spend, Independent copy) | Vocabulary contradicting the docs | above | Updated | `2a2261f` |

## 5. Contradictions

- **Corrected using existing authority:** every row in §4. Each was an agent document contradicting a Record or the Constitution.
- **Reconciled through existing creator authority:** the D60.5 auto-draft against Constitution §13.1/§14.1/§14.3. It is consistent: M3 ratified auto-triggers as a kind of operation, the draft runs only in the scene the creator opened and only when it has no plan, Phase 7 allows a plan to be "AI-drafted and simply accepted", and Record 2 §7 found no contradiction. The reading is recorded in AI map §11.
- **Raised for the creator at audit time:** CR-1 and CR-2. Both are now resolved by Record 3 (§6).
- **No contradiction between Record 1, Record 2 and the Constitution was found.** No Record transcription error was found.

## 6. Creator-review queue (input to `/grill-with-docs`)

**Resolved by Record 3.** CR-1 generates the Settings count, default 3, on eligible Treatment entry when there is no Treatment, existing options or upload explicitly designated in Input as the Treatment. Ordinary initial cost such as $0.18 total needs no priced navigation label, extra Draft button or small-cost confirmation. CR-2 auto-drafts only a scene with no plan at an estimate below $0.05; otherwise it offers **Draft plan · $x**. Exceptional confirmation conditions override both triggers. A future preference to reduce spend gates remains deferred.

The questions and recommendations below are preserved as the original audit input, not current product rules. The creator rejected the CR-1 button recommendation and ratified CR-2 option (b).

**CR-1. Should entering an empty Treatment phase draft the treatment options automatically?**
- **Why it matters:** D58.2 ("the workspace simply generates the configured number") can be read as setting *how many* options or *when* they are drafted. The agent doc had assumed automatic drafting. The Constitution defaults to drafting on explicit request.
- **Options:**
  - (a) Explicit "Draft treatment options" button. This is the current text.
  - (b) Automatic on first entry when nothing is imported, written or skipped, limited like D60.5. This may spend more than trivially (3 quality drafts) and may pre-empt a creator who meant to import or skip.
- **Recommendation:** (a).
- **Affected:** WRITING-EXPERIENCE §2.1, AI map §6.0, BUSINESS §3, ADR 0007.

**CR-2. May the automatic initial shot-plan draft (D60.5) run when its estimate is meaningful (≥ $0.05)?**
- **Why it matters:** the spend rule (Record 1 #68, §13.4) puts a price on an initiating click for meaningful spend. A long scene drafted with a quality writing model could cross $0.05.
- **Options:**
  - (a) Entering the scene counts as the initiation; the draft runs and the cost is recorded.
  - (b) Above trivial, show a one-click "Draft plan · $x" instead of drafting automatically.
  - (c) Always use an economy model for automatic drafts so they stay trivial.
- **Recommendation:** (b).
- **Affected:** BUSINESS §3 and §9 (marked awaiting review), AI map §6.0 and §11, SHOT-MODEL §3.1, the #60 redo.

These were the only two creator-review items. Neither remains open.

## 7. Deferred decisions (confirmed not decided by the audit)

- Creator cap defaults and the hidden operator ceiling size; both must be set before the first invitation.
- The major-import duplication trigger threshold.
- Friction thresholds and quiet-notice wording.
- Backup count, retention window (must be set before purge ships), second vendor or media replica, restore-drill cadence, the no-delete credential design (now including R2 bucket locks as an option) and the full-drill gate.
- The project-level "always include" constraint.
- Cross-project adoption of production work.
- Mapping and option-count ranges.

**Spec-level gaps the audit noticed and left undecided:**
- whether ad-hoc shots count toward coverage readiness;
- whether creators may choose the world model per project (`world.generate` currently resolves by operator policy);
- edit-session end conditions (TRUST §5 vs GLOSSARY).

No deferred item is needed for the architecture to be coherent.

**Limit noted for the deferred backup policy:** under the floor, media has no second copy. A deletion bug, or loss of the R2 account, could therefore not be recovered for media.

## 8. Remaining unverified research assumptions

- R2 presigned URLs built from temporary or prefix-scoped credentials. The workaround (sign with the app credential) stands.
- The VPS estimate of about $10–25 a month. It is plausible for the EU on 2026-10-23 (CX33 €8.99, CX43 €16.49); US locations cost several times more, and Hetzner listed its shared types as unavailable that day. It remains an estimate.
- About $1.20 per world, Marble model names and credit prices.
- The 15-minute hands-on NLE check (#70 §5.6), which has not been run.
- Better Auth invitation support.
- Provider facts dated 2026-10-18/21 (Veo extension limits, shutdown dates, Wan limits, absence of composition-adherence documentation).
- Neon, Fly and other unchosen-platform items in #73, which are no longer material after P11.

## 9. Changes made

- **Commits:** `b02498a`, `6034096`, `c02de90`, `6e03165`, `02cea04`, `a76f8d3`, `4cd6b75`, `33ae98b`, `67d1f47`, `df1acfa`, `5dcb1be`, `8a0f321`, `7ce869c`, `2a2261f`, plus the commit adding this report. All are on `main`.
- **Files:** GLOSSARY; DOMAIN-MODEL, LINEAGE, STORY-DOCUMENTS, SCENE-IDENTITY, ENTITIES-AND-LOOKS, SHOT-MODEL, SHOT-PLANNING-INPUTS, GENERATION-PACKAGE, PROVIDERS-AND-MODELS, JOB-LIFECYCLE, BUSINESS-AND-OPERATIONS; AI-RESPONSIBILITY-MAP; MODULE-ARCHITECTURE, PERSISTENCE-AND-MEDIA, RUNTIME-PLATFORM, OPERATIONAL-BASELINE; all six UX docs.
- **ADRs amended (wording, no decision reversed):** 0001–0007, 0009–0015, 0017, 0018 (H1 renamed, filename kept), 0021, 0022. ADRs 0008, 0016, 0019, 0020, 0023 and 0024 passed unchanged.
- **Untouched:** the Constitution, both Ratification Records and Handoff 2.
- **Issues:** no issue was reopened or closed. #60 received a redo-brief supplement comment. Map #49 Notes gained a pointer to this audit; Decisions-so-far and the frontier are unchanged.

## 10. Dependency consequences

- No closed ticket needs reopening. No foundational decision changed; corrections restored the ratified meaning.
- **Work to revisit later:**
  - the #60 redo (apply Record 3 CR-2, the emptied-plan rule, Board form, X5/X6);
  - #76 fixtures surfaced by this audit, updated by Record 3: a G10 allow-list of two triggers; eligible Treatment entry generates the configured count without a penny-level price gate, while existing work or an explicitly designated Treatment upload suppresses it; exceptional conditions still stop drafting; scene-plan $0.04 vs $0.05 initiation; a capture with skipped frames sends no capture to video; ad-hoc compile; a BYOK revocation isolated per Account; the D52.2 duplicate's closure; no per-part make action; Removed-from-Story shots out of the cut;
  - #77: VPS plus the P12 floor plus one restore test;
  - #79: recheck against the settled CR-1 and CR-2 in Record 3.

## 11. Prototype implications (no design here)

| Ticket | Fresh strong-model prototype pass? |
|---|---|
| #60 | **Yes, required** (D60). The redo starts from the V1 Script Hub and applies the CR-2 ruling in Record 3 rather than re-deciding it. |
| #58 | **Yes, recommended.** The written behaviour is creator-derived, but prototype visuals were rejected (§3.1), and CR-1 changes the empty-Treatment state. |
| #59 | **Yes, recommended.** Visuals rejected; the identity-first and shot-driven coverage flow has never been sketched at good quality. |
| #62 | **Yes, recommended.** The sequence-first layout chosen by the creator (C) was a Haiku-era sketch, and its timeline should match #60 (X6). |
| #61 | **Optional.** Few creator-facing screens (the Send back review list); the CineBlock tab follows the existing MVP. |

## 12. Recommended next step

**Creator grilling of §6 is complete.** Record 3 controls the #58 empty-Treatment state and the #60 initial-plan spend boundary. The affected docs are reconciled. Prototype work and Wayfinder orchestration were not started, and the frontier is unchanged. The live #49 and #60 pending-review pointers still need the master agent's update when authorized; this doc-only session made no GitHub writes.
