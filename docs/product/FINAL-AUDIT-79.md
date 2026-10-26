# Final Wayfinder audit (#79)

> **Status: VERIFICATION / HANDOFF EVIDENCE.** Shows the corpus was audited and ready for `/to-spec`; it is not a competing source of product authority. Rulings it lists live in their owning docs, and Record 6 settled its sign-off items. Its closing hand-off reading order predates [docs/README.md](../README.md), which now owns the reading order.

Date: 2026-10-25. Method: four read-only auditors, one per slice of the #79 checklist, each reading the Constitution, Records 1 to 5, the strong-model audit and the primary docs for its items, then hunting contradictions with targeted searches. Their mechanical defects and small gaps were then fixed in three writer passes with disjoint file ownership. Link check after the fixes: no broken relative links in `docs/`, `GLOSSARY.md`, `AGENTS.md`.

Limits: the auditors read primary docs in full but covered the rest by search. The Constitution was read in full by the first auditor and in part by the others. No line-by-line re-read of the fixed corpus was done; fixes were verified by grep and section-reference checks.

## Verdicts

| # | Checklist item | Verdict | Evidence |
|---|---|---|---|
| 1 | Constitution not contradicted | PASS | No decision contradicts a hard rule. §17.5 (no mock default) is structural (PROVIDERS F2, isolation gate G11, VERIFICATION §3.2, ADR 0026). §11 authorised voices only is a dispatch-gate clause (ADR 0025). Every §18 deferred question is answered, ruled spec-level, or creator-deferred (billing, M6). One stale line in Constitution Appendix B: see C-A. |
| 2 | Glossary and domain consistency | PASS (after fixes) | No drifting synonym of a core object. Missing terms added; duplicate entries merged. ID collisions (R, G, P, L) are resolved by a namespace table and qualified cites, not renames. |
| 3 | CORE fully designed | PASS | Every §15.1 family maps to a design doc and a build slice (BUILD-SEQUENCE §2.2). |
| 4 | IMPORTANT architecturally supported | PASS | Every §15.2 item has a wave (IW1 to IW3, BYOK lane) and early interfaces EI1 to EI13. |
| 5 | LATER, EXPERIMENTAL, OUT not overdesigned | PASS (after fixes) | Voice performance-transfer path cut to "reserved, not designed"; LATER library constraint reconciled to one statement. |
| 6 | UX consistent with domain | PASS (after fixes) | Record 5 applied consistently; stale "collapsed prompt", "drawer", X6, lock-offer placement and Rearview Mirror wording fixed. |
| 7 | Provider and generation design consistent with product | PASS (after fixes) | Audio additions propagated to PROVIDERS, GENERATION-PACKAGE, AI map; lip-sync intermediate clip decided (second Attempt in the Segment slot). |
| 8 | Cost and business scope explicit | PASS | Meaningful spend, per-Account spend records, caps, and deferral of billing and credits are explicit and consistent. |
| 9 | Async architecture consistent with job lifecycle | PASS (after fixes) | Added reconciliation after a terminal state (JOB §6.1), local-work Jobs (JOB §2.2), and operator-scoped state (RUNTIME §5.1, PERSISTENCE §6.5). |
| 10 | Persistence consistent with versions, provenance, staleness | PASS (after fixes) | Voice kinds and `authorisation-revoked` wired into LINEAGE and DOMAIN-MODEL; stale shared-handle wording removed; Option classing unified. |
| 11 | Architecture responsibilities unambiguous | PASS (after fixes) | `generation.read`, ports `Mailer`/`ErrorSink`/`OperatorState`, settler owners and process roles stated once. |
| 12 | Tracer bullet and build order aligned | PASS (after fixes) | NLE hands-on check moved before T0 exit; `project`, ad-hoc, Removed from Story, `planDuplicate` placed; IW2 order matches the voice doc. |
| 13 | Verification can prove the bar | PASS (after fixes) | Export evidence qualified to what exists at BAR; the per-release human NLE import and the own-screenplay bar run are explicit gate rows. |
| 14 | Nothing in "Not yet specified" that /to-spec needs | PASS (after fixes) | Synthetic-media disclosure now ruled (OPERATIONAL-BASELINE §15); legacy prompt salvage and performance budgets were absorbed by #76; no amendment proposal is outstanding. |

## Rulings made during the audit (no creator input needed)

Post-terminal reconciliation, local-work Jobs, operator-scoped cross-Account state, the lip-sync Segment-slot model, reference-library build scope, ad-hoc and Removed-from-Story placement, Writing Style and Settings homes, Package inspector placement, export folder layout, NLE check timing, and the synthetic-media rule (never strip provider marks; add none; record `synthetic` provenance per Take). Each is written in its owning doc.

## Creator sign-off list: resolved by Record 6

All five items were settled on 2026-10-25 in [Creator Ratification Record 6](CREATOR-RATIFICATION-RECORD-6.md). No provisional default remains.

- **CR-69.1**: A, extended. Generate as Character Voice (exact line in a cloned, stock or designed Voice), Performance → Character Voice, and an optional best-effort Native → Character Voice revoiced Take; a priced Generate unvoiced lines batch (Record 6 §1).
- **CR-79.1**: not a BAR or invitation gate. The Art. 50 / C2PA legal-role review happens before expanding to jurisdictions such as the EU, and is written up only as reference in `docs/post-release/LEGAL-AND-COMPLIANCE.md`, with no hook or checker (Record 6 §2).
- **C-A**: Constitution amended (§6.4, §15.3, Appendix B). A shot resolves one or more Directions for the space it reveals; Fit keeps path coverage; Location spatial layout is LATER (Record 6 §3).
- **C-B**: media joins the floor before the first non-owner invitation: an independent B2 copy, a primary R2 Bucket Lock and a media sample in the restore test (Record 6 §4).
- **C-C**: Record 3 confirmed. Stage entry initiates only the two ratified, bounded initial-drafting operations; media always needs a separate action (Record 6 §5).

## Intentional deferrals (verified as stated)

Creator cap defaults and the hidden operator ceiling (set before the first invitation); backup policy beyond the floor (retention values, copy frequency, a database second vendor, drill cadence; Record 6 §4); commercial billing and credits (creator-ruled); BYOK setup flow (seam built now); purge and Account data export (post-BAR, unscheduled); synthetic-media legal-role analysis (before expansion to jurisdictions such as the EU; Record 6 §2); spec-level numeric values (timing constants, tolerances, retention windows, performance numbers); cross-project voice library (LATER); evidence limits in the voice doc (ElevenLabs consent API, non-humanoid lip-sync vendor claims, US state law); unverified facts (R2 prefix-scoped presigned URLs, VPS price, the NLE hands-on check).

## Hand-off note for /to-spec

Read in this order: Constitution; Records 1 to 6 (later controls); this report; `GLOSSARY.md` (including the identifier-namespace table); `docs/domain/`, `docs/ux/`, `docs/ai/`, `docs/architecture/` with `BUILD-SEQUENCE.md` (tracer T0, slices VS1 to VS9, BAR, IW1 to IW3) and `SWARM-READINESS.md` (frozen contracts FC1 to FC11 and lanes) as the delivery spine; ADRs 0001 to 0026. Spec-level values are listed per doc under their "not decided here" sections. Every creator sign-off item is resolved (Record 6); there are no provisional defaults.
