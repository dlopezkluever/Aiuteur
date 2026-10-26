# Decision index

A routing table, not a specification. It answers one question: "I am working on X. Which documents and ADRs do I read?" It restates no behaviour. The sources it names govern. Entry point and authority rules: [`README.md`](README.md).

How to read a row:

- **Read first** is the current implementation-facing doc. Start there.
- **ADRs** are the hard-to-reverse choices behind it ([`adr/`](adr/), files named `NNNN-*.md`).
- **Records** names the Creator Ratification Record items that govern or amend it. Open a Record only for provenance, an override, or an ambiguity. A later Record controls an earlier one, so when two Records are listed for one topic, the later one wins where they differ. Record paths: [`product/CREATOR-RATIFICATION-RECORD.md`](product/CREATOR-RATIFICATION-RECORD.md) (1) and `-2` to `-6`.
- Record ids (R, M, P, D, X, W, Y, A5, SP, GN, RL, RB, VP, V6, L6, B6, E6, CR) are explained in each Record's "Identifiers" line and in the GLOSSARY namespace table. Section numbers are `§`.
- Every row also uses [`GLOSSARY.md`](../GLOSSARY.md) and the [Constitution](product/PRODUCT-CONSTITUTION.md) sections the read-first doc cites.

## Domain

| Topic | Read first | ADRs | Records (later controls) |
|---|---|---|---|
| Core domain model: objects, ownership, Revision/Attempt/Generation/Job, retire not delete | [DOMAIN-MODEL](domain/DOMAIN-MODEL.md) | [0001](adr/0001-revisions-attempts-generations-jobs.md) | 1: R1 (and M7 for the later Purge carve-out) |
| Story documents: Treatment, Beat Sheet, Master Narrative representation, provenance, sync | [STORY-DOCUMENTS](domain/STORY-DOCUMENTS.md) | [0008](adr/0008-story-documents-are-block-documents-with-provenance-runs.md), [0009](adr/0009-treatment-beat-sheet-sync-is-explicit-and-never-guesses.md) | 1: R10; 2: P4, D58 |
| Scene identity, mapping, split/merge, revised-screenplay import | [SCENE-IDENTITY](domain/SCENE-IDENTITY.md) | [0011](adr/0011-scene-identity-is-the-container-block-id-and-mapping-precedes-id-assignment.md) | 1: R3, M1, M3; 2: D52, P7, P9, X5 |
| Entities, Looks, locations, Directions and coverage, style, Reference Media | [ENTITIES-AND-LOOKS](domain/ENTITIES-AND-LOOKS.md) | [0002](adr/0002-looks-and-carry-forward-derived-from-narrative-position.md), [0003](adr/0003-location-coverage-is-directions-by-looks-resolved-by-one-rule.md) | 2: D59, §8 (Constitution amendment); 4: W59; 6: §3 (L6.1 to L6.6) |
| Shot model: identity, realization pipeline, Frames, Takes as Segments, long shots | [SHOT-MODEL](domain/SHOT-MODEL.md) | [0012](adr/0012-shot-identity-survives-split-merge-and-redraft-by-keep-first-and-options.md), [0013](adr/0013-a-take-is-an-assembly-of-segments-so-long-shots-stay-one-clip.md) | 2: P5, D60.6; 4: §5.4, §5.7; 5: SP, GN |
| Shot planning inputs: CineBlock, previs, storyboards, shot lists | [SHOT-PLANNING-INPUTS](domain/SHOT-PLANNING-INPUTS.md) | [0024](adr/0024-cineblock-is-an-aiuteur-module-and-captures-always-go-through-image-generation.md) | 2: D61, X2, X8, X10; 4: §5.8; 5: §6 |
| Generation package and context compiler | [GENERATION-PACKAGE](domain/GENERATION-PACKAGE.md) | [0014](adr/0014-a-generation-is-compiled-into-one-layered-package-that-is-recorded-shown-and-sent.md) | 5: GN (Generate surface) |
| Providers, models, Catalogue, capability contract | [PROVIDERS-AND-MODELS](domain/PROVIDERS-AND-MODELS.md) | [0015](adr/0015-models-are-reviewed-catalogue-data-behind-a-fail-closed-capability-contract.md) | 1: M5 (BYOK seam); 2: D66 |
| Job lifecycle: runs, retries, cancel, Batches, recovery | [JOB-LIFECYCLE](domain/JOB-LIFECYCLE.md) | [0006](adr/0006-job-lifecycle-durable-runs-and-bounded-spend.md), [0017](adr/0017-the-job-row-is-the-queue-on-plain-postgres-with-own-sse-progress.md) (substrate) | 1: §1 (R8, R9 and the other #67 items) |
| Business and spend rules: Accounts, caps, price shown, confirm thresholds, stage-entry spend | [BUSINESS-AND-OPERATIONS](domain/BUSINESS-AND-OPERATIONS.md) | [0010](adr/0010-multi-creator-accounts-operator-paid-bounded-spend.md) | 1: M4 to M7, §2 #68; 2: P3, X2, X8; 3: §2 (stage entry); 6: §5 (E6.1 to E6.3) |
| Lineage, staleness ("possibly out of date"), write-back, locks, duplication | [LINEAGE-AND-STALENESS](domain/LINEAGE-AND-STALENESS.md) | [0004](adr/0004-possibly-out-of-date-is-derived-from-lineage.md), [0005](adr/0005-locks-are-server-enforced-domain-state.md) | 1: R2, M1, §2 #63 |
| Voice, performance, voice transformation, authorisation | [VOICE-AND-PERFORMANCE](domain/VOICE-AND-PERFORMANCE.md) | [0025](adr/0025-a-dialogue-line-has-one-chosen-line-audio-and-voice-work-passes-an-authorisation-gate.md) | 5: VP1 to VP5; 6: §1 (V6.1 to V6.7), §2 (synthetic media) |

## UX

| Topic | Read first | ADRs | Records (later controls) |
|---|---|---|---|
| Intake and Interview | [INTAKE-AND-INTERVIEW](ux/INTAKE-AND-INTERVIEW.md); AI side: [AI-RESPONSIBILITY-MAP](ai/AI-RESPONSIBILITY-MAP.md) | [0007](adr/0007-models-propose-code-commits.md) | 1: §2 #57; 2: P10, X3, §2.1 |
| Writing experience (Treatment, Beat Sheet, acceptance, recovery) | [WRITING-EXPERIENCE](ux/WRITING-EXPERIENCE.md) | [0008](adr/0008-story-documents-are-block-documents-with-provenance-runs.md), [0009](adr/0009-treatment-beat-sheet-sync-is-explicit-and-never-guesses.md) | 2: D58; 3: CR-1; 4: §2 (W58) |
| Navigation, Outline, Board, Cmd-K, shell | [NAVIGATION](ux/NAVIGATION.md) | none specific | 1: §2 #56; 2: D58 to D62; 4: §5.2; 5: §2 (A5) |
| World Definition | [WORLD-DEFINITION](ux/WORLD-DEFINITION.md) | [0003](adr/0003-location-coverage-is-directions-by-looks-resolved-by-one-rule.md) | 2: D59, X8 to X10; 4: §3 (W59); 6: §3 |
| Scene production: Script Hub, Scene Prep, Generate | [NAVIGATION](ux/NAVIGATION.md) §2 and §8, [SHOT-MODEL](domain/SHOT-MODEL.md); prototype via [§6 of the README](README.md#6-prototypes) | [0012](adr/0012-shot-identity-survives-split-merge-and-redraft-by-keep-first-and-options.md), [0014](adr/0014-a-generation-is-compiled-into-one-layered-package-that-is-recorded-shown-and-sent.md) | 4: §5 (W60); 5: whole record (A5, SP, GN, RL, RB); 3: §3 (scene plan boundary) |
| Candidate review and playback | [CANDIDATE-REVIEW-AND-PLAYBACK](ux/CANDIDATE-REVIEW-AND-PLAYBACK.md) | [0013](adr/0013-a-take-is-an-assembly-of-segments-so-long-shots-stay-one-clip.md) | 1: R8, R9; 2: D62; 4: §4 (W62); 5: §7 (RB1 to RB4) |
| Trust signals, locks, friction | [TRUST-SIGNALS-AND-LOCKS](ux/TRUST-SIGNALS-AND-LOCKS.md) | [0004](adr/0004-possibly-out-of-date-is-derived-from-lineage.md), [0005](adr/0005-locks-are-server-enforced-domain-state.md) | 1: §2 #63; 2: §7; 4: §6 (Y1 to Y8) |

## AI and architecture

| Topic | Read first | ADRs | Records (later controls) |
|---|---|---|---|
| AI responsibility: deterministic vs LLM vs generative; guards | [AI-RESPONSIBILITY-MAP](ai/AI-RESPONSIBILITY-MAP.md) | [0007](adr/0007-models-propose-code-commits.md) | 1: §1 (#64 ratified items) |
| Module architecture and build rules | [MODULE-ARCHITECTURE](architecture/MODULE-ARCHITECTURE.md) | [0016](adr/0016-modules-follow-ownership-of-truth-and-every-write-passes-one-history-gate.md) | none specific |
| Runtime platform: process roles, queue, progress delivery, hosting | [RUNTIME-PLATFORM](architecture/RUNTIME-PLATFORM.md) | [0017](adr/0017-the-job-row-is-the-queue-on-plain-postgres-with-own-sse-progress.md) | 2: P11 (hosting default moved) |
| Persistence, version history, private media, isolation, migrations | [PERSISTENCE-AND-MEDIA](architecture/PERSISTENCE-AND-MEDIA.md) | [0019](adr/0019-one-relational-store-with-a-generic-append-only-spine-and-derived-indexes-kept-in-the-committing-transaction.md), [0020](adr/0020-a-revision-is-a-self-contained-snapshot-with-frozen-fingerprints.md), [0021](adr/0021-tenant-isolation-is-enforced-by-the-database-and-the-object-store-not-by-handlers.md), [0022](adr/0022-media-is-private-project-owned-and-copied-never-shared-across-projects.md), [0023](adr/0023-the-schema-is-forward-only-sql-with-machine-checked-drift-and-isolation-rules.md) | 6: §4 (B6, media floor) |
| Operational baseline: auth, secrets, environments, CI, backups, restore, synthetic media | [OPERATIONAL-BASELINE](architecture/OPERATIONAL-BASELINE.md) | [0018](adr/0018-own-auth-in-our-database-envelope-held-credentials-and-an-independent-backup-copy.md) | 2: P11, P12; 6: §2, §4 |
| Verification and observability: trace, fakes, golden projects, gates VC1 to VC17 | [VERIFICATION-AND-OBSERVABILITY](architecture/VERIFICATION-AND-OBSERVABILITY.md) | [0026](adr/0026-the-generation-record-is-the-trace-and-test-providers-are-contract-verified-and-marked.md) | none specific |
| Build sequence: T0, VS1 to VS9, BAR, IW1 to IW3, early interfaces | [BUILD-SEQUENCE](architecture/BUILD-SEQUENCE.md) | relies on 0016 to 0026 | 2: P11, P12; 5: VP; 6: whole record |
| Swarm readiness: frozen contracts, lanes, definition of done | [SWARM-READINESS](architecture/SWARM-READINESS.md) | relies on 0016 to 0026 | none specific |

## Product frame, evidence and process

| Topic | Read first | ADRs | Records (later controls) |
|---|---|---|---|
| Product frame, scope classes (CORE, IMPORTANT, LATER), principles | [PRODUCT-CONSTITUTION](product/PRODUCT-CONSTITUTION.md) (Amendment log at the end) | none | Amendments: 1: §6; 2: §8; 6: §3 |
| Synthetic-media policy, post-release legal review | [OPERATIONAL-BASELINE](architecture/OPERATIONAL-BASELINE.md) §15; reference only: [LEGAL-AND-COMPLIANCE](post-release/LEGAL-AND-COMPLIANCE.md) | none | 6: §2 |
| Prototype reconciliation and coverage gaps | [PROTOTYPE-RECONCILIATION](product/PROTOTYPE-RECONCILIATION.md), [PROTOTYPE-COVERAGE-GAPS](product/PROTOTYPE-COVERAGE-GAPS.md), [prototypes/README](../prototypes/README.md) | none | 4: §1, §7; 5: §10 |
| Known tidy-ups and spec-level ambiguities | [PROTOTYPE-RECONCILIATION](product/PROTOTYPE-RECONCILIATION.md) §7; each doc's "Not decided here" | none | n/a |
| Handoff evidence that the corpus was audited | [FINAL-AUDIT-79](product/FINAL-AUDIT-79.md) | none | 6 settled its sign-off items |
| Legacy V1 evidence (selective) | [`_inputs/README.md`](../_inputs/README.md) | none | n/a |
