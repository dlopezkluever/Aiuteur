# Aiuteur V2 documentation: START HERE

**Status.** The Aiuteur V2 Wayfinder map ([#49](https://github.com/dlopezkluever/aiuteur/issues/49)) is complete and fully ratified. The repo is moving from Wayfinder planning into specification and implementation preparation. Every decision the map needed is settled; nothing here reopens one.

**Do not read this corpus end to end.** It is roughly 400k tokens. This page is a router: it says what is authoritative, what to read for your task, and what to skip. Load the handful of documents your task needs and no more.

This page routes. It does not restate product behaviour. If a sentence here reads like a requirement, the owning document governs.

## 1. Document roles

Every file in the repo has one of these roles. The role decides how much weight it carries.

| Role | Files | How to treat it |
|---|---|---|
| **AUTHORITATIVE DECISION RECORD** | [`PRODUCT-CONSTITUTION.md`](product/PRODUCT-CONSTITUTION.md); Creator Ratification Records [1](product/CREATOR-RATIFICATION-RECORD.md), [2](product/CREATOR-RATIFICATION-RECORD-2.md), [3](product/CREATOR-RATIFICATION-RECORD-3.md), [4](product/CREATOR-RATIFICATION-RECORD-4.md), [5](product/CREATOR-RATIFICATION-RECORD-5.md), [6](product/CREATOR-RATIFICATION-RECORD-6.md) | Settled creator decisions. Binding. Read a Record section for provenance, an override, or an ambiguity, not by default. |
| **CURRENT / implementation-facing** | [`domain/`](domain/), [`ux/`](ux/), [`ai/`](ai/), [`architecture/`](architecture/), and the ADRs in [`adr/`](adr/) (0001 to 0026) | The reconciled expression of the settled decisions. Build and specify from these. |
| **CROSS-CUTTING TERMINOLOGY AUTHORITY** | [`GLOSSARY.md`](../GLOSSARY.md) (including its identifier-namespace table) | The vocabulary for every spec, ticket, test name and doc. Do not drift to a synonym it lists under _Avoid_. |
| **VERIFICATION / HANDOFF EVIDENCE** | [`product/FINAL-AUDIT-79.md`](product/FINAL-AUDIT-79.md) | Shows the corpus was checked for contradictions and readiness, and lists the audit's rulings. Evidence that the handoff is sound. Not a competing source of product authority. |
| **HISTORICAL / PROCESS RECORD** | [`product/CREATOR-GRILL-HANDOFF-2.md`](product/CREATOR-GRILL-HANDOFF-2.md), [`product/STRONG-MODEL-WAYFINDER-AUDIT.md`](product/STRONG-MODEL-WAYFINDER-AUDIT.md), [`foundational-q-and-as/`](foundational-q-and-as/), the retired predecessor map [#1](https://github.com/dlopezkluever/aiuteur/issues/1) | How the decisions were reached. Not implementation authority. Skip unless you are tracing provenance. |
| **PROTOTYPE / UX EVIDENCE ONLY** | [`../prototypes/`](../prototypes/), governed by [`product/PROTOTYPE-RECONCILIATION.md`](product/PROTOTYPE-RECONCILIATION.md) and [`product/PROTOTYPE-COVERAGE-GAPS.md`](product/PROTOTYPE-COVERAGE-GAPS.md) | Structure and placement evidence. Never authority. See §6. |
| **REFERENCE / EVIDENCE ONLY** | [`../_inputs/`](../_inputs/README.md) | Legacy V1 material. See §7. |
| Post-release reference | [`post-release/LEGAL-AND-COMPLIANCE.md`](post-release/LEGAL-AND-COMPLIANCE.md) | Not a gate, checklist or build input (Record 6 §2). |
| Agent-skill setup | [`agents/`](agents/) | How the engineering skills use the tracker, labels and domain docs. |

## 2. Authority order

1. **[Product Constitution](product/PRODUCT-CONSTITUTION.md)**, as amended. It is the highest authority. Approved amendments are applied to its body and listed in its Amendment log. Only the creator amends it. A downstream agent who finds a requirement unworkable writes a `CONSTITUTION AMENDMENT REQUIRED` proposal (section, current text, proposed text, reason) and does not design around it.
2. **Creator Ratification Records 1 to 6.** A later Record controls an earlier one where they differ. Each Record controls over any ADR, domain, UX, AI or architecture doc, and over a prototype, where they differ. Where a Record is silent, earlier decisions stand. The Constitution stays above all Records unless it has been formally amended.
3. **ADRs and the reconciled V2 docs** in `docs/domain/`, `docs/ux/`, `docs/ai/` and `docs/architecture/`. They sit at one tier. Where two differ and no Record settles it, the more specific document governs ([PROTOTYPE-RECONCILIATION.md §7](product/PROTOTYPE-RECONCILIATION.md#7-authority-notes-not-prototype-issues) applies the same test). Inside these docs, passages marked **[creator]** are ratified. The rest is agent-designed and settled for downstream use.
4. **Everything else** (verification evidence, process records, prototypes, `_inputs/`) informs and never decides.

`GLOSSARY.md` is orthogonal to this ladder: it governs wording in every layer.

Four nuances:

- **Current docs normally express the Records.** The docs were reconciled to Records 1 to 6, so use the docs as the implementation-facing form. Open a Record when you need provenance, when a doc cites an override, or when two docs disagree.
- **Records 1 and 2 state a slightly different order** (Constitution, then Records and creator-ratified ADRs, then agent-drafted unratified decisions, then prototypes and history). The two are compatible: the final audit and [PROTOTYPE-RECONCILIATION.md §7](product/PROTOTYPE-RECONCILIATION.md#7-authority-notes-not-prototype-issues) found no genuine contradiction between a Record and an ADR or doc. If you find one, the Record controls. Report it instead of choosing silently.
- **`FINAL-AUDIT-79.md` is evidence, not a source.** Its "rulings made during the audit" were written into the owning docs; read them there. Its own hand-off list orders sources by when they were audited; use the reading order in §3 instead. Where it calls a sign-off item provisional, Record 6 settled it.
- **Settled does not mean exhaustive.** Each doc ends with a "Not decided here" section (where present) and a "Hand-offs" section. Those list the spec-level choices and what each doc passes on. They are the intended places for `/to-spec` to decide details. [PROTOTYPE-RECONCILIATION.md §7](product/PROTOTYPE-RECONCILIATION.md#7-authority-notes-not-prototype-issues) lists known tidy-ups and spec-level ambiguities. Resolve them at spec time, or record them as spec-level questions. Do not pick a winner silently.

## 3. Reading order for any task

1. This page.
2. The [Constitution](product/PRODUCT-CONSTITUTION.md) as the governing product frame. It is long, so read the sections your task names (its anchors are cited by every doc).
3. [`architecture/BUILD-SEQUENCE.md`](architecture/BUILD-SEQUENCE.md) §0 and §2: the delivery spine (see §4).
4. Only the current domain, UX, AI and architecture docs your task touches. Use [`DECISION-INDEX.md`](DECISION-INDEX.md) or §5 below to find them.
5. The ADRs for those areas.
6. Record sections only for provenance, an override, or an ambiguity. Each doc's opening paragraph cites the Record items that govern it.
7. Prototypes or `_inputs/` only when specifically useful (§6, §7).

Never load all six Records, every architecture doc, every prototype or the `_inputs/` corpora for a single task.

Largest files (open by section, not whole): the Constitution, [PERSISTENCE-AND-MEDIA](architecture/PERSISTENCE-AND-MEDIA.md), [PROTOTYPE-RECONCILIATION](product/PROTOTYPE-RECONCILIATION.md), [MODULE-ARCHITECTURE](architecture/MODULE-ARCHITECTURE.md), [PROVIDERS-AND-MODELS](domain/PROVIDERS-AND-MODELS.md), [SHOT-MODEL](domain/SHOT-MODEL.md), [GENERATION-PACKAGE](domain/GENERATION-PACKAGE.md), [OPERATIONAL-BASELINE](architecture/OPERATIONAL-BASELINE.md), [LINEAGE-AND-STALENESS](domain/LINEAGE-AND-STALENESS.md), [VOICE-AND-PERFORMANCE](domain/VOICE-AND-PERFORMANCE.md), [VERIFICATION-AND-OBSERVABILITY](architecture/VERIFICATION-AND-OBSERVABILITY.md), [JOB-LIFECYCLE](domain/JOB-LIFECYCLE.md), [AI-RESPONSIBILITY-MAP](ai/AI-RESPONSIBILITY-MAP.md), [Record 2](product/CREATOR-RATIFICATION-RECORD-2.md).

## 4. Delivery spine

[`architecture/BUILD-SEQUENCE.md`](architecture/BUILD-SEQUENCE.md) is the primary order for how Aiuteur is specified and later built: tracer bullet **T0**, vertical slices **VS1 to VS9**, milestone **BAR**, then the IMPORTANT waves **IW1 to IW3**, with early interfaces EI1 to EI13. [`architecture/SWARM-READINESS.md`](architecture/SWARM-READINESS.md) adds the frozen contracts, lanes and definition of done.

The Build Sequence does not replace the canonical specification. The intended flow is:

**completed map #49 → one canonical `/to-spec` specification → `/to-tickets` → bounded tracer-bullet implementation tickets**

The specification must preserve the Build Sequence and not invent a competing order. `/to-tickets` turns the specification into slices and blocking edges.

## 5. Starting reading set per slice

A starting set, not a limit. Scope and exit evidence come from BUILD-SEQUENCE §2.2. The "Hand-offs" section of each doc names what else it touches. Always add the ADRs for the areas you touch ([`DECISION-INDEX.md`](DECISION-INDEX.md) lists them).

| Slice (BUILD-SEQUENCE) | Start with |
|---|---|
| **T0** tracer | [MODULE-ARCHITECTURE](architecture/MODULE-ARCHITECTURE.md), [RUNTIME-PLATFORM](architecture/RUNTIME-PLATFORM.md), [PERSISTENCE-AND-MEDIA](architecture/PERSISTENCE-AND-MEDIA.md), [VERIFICATION-AND-OBSERVABILITY](architecture/VERIFICATION-AND-OBSERVABILITY.md), [SWARM-READINESS](architecture/SWARM-READINESS.md), [JOB-LIFECYCLE](domain/JOB-LIFECYCLE.md), [GENERATION-PACKAGE](domain/GENERATION-PACKAGE.md), [PROVIDERS-AND-MODELS](domain/PROVIDERS-AND-MODELS.md) |
| **VS1** Input → Interview | [INTAKE-AND-INTERVIEW](ux/INTAKE-AND-INTERVIEW.md), [AI-RESPONSIBILITY-MAP](ai/AI-RESPONSIBILITY-MAP.md), [DOMAIN-MODEL](domain/DOMAIN-MODEL.md), [NAVIGATION](ux/NAVIGATION.md) |
| **VS2** Treatment → Beat Sheet | [STORY-DOCUMENTS](domain/STORY-DOCUMENTS.md), [WRITING-EXPERIENCE](ux/WRITING-EXPERIENCE.md), [AI-RESPONSIBILITY-MAP](ai/AI-RESPONSIBILITY-MAP.md), Record 3 |
| **VS3** Master Narrative → scenes | [SCENE-IDENTITY](domain/SCENE-IDENTITY.md), [STORY-DOCUMENTS](domain/STORY-DOCUMENTS.md), [LINEAGE-AND-STALENESS](domain/LINEAGE-AND-STALENESS.md), [TRUST-SIGNALS-AND-LOCKS](ux/TRUST-SIGNALS-AND-LOCKS.md) |
| **VS4** Own screenplay | [SCENE-IDENTITY](domain/SCENE-IDENTITY.md), [STORY-DOCUMENTS](domain/STORY-DOCUMENTS.md), [INTAKE-AND-INTERVIEW](ux/INTAKE-AND-INTERVIEW.md) |
| **VS5** World | [ENTITIES-AND-LOOKS](domain/ENTITIES-AND-LOOKS.md), [WORLD-DEFINITION](ux/WORLD-DEFINITION.md), [VOICE-AND-PERFORMANCE](domain/VOICE-AND-PERFORMANCE.md) (Voice on a Character), Record 6 |
| **VS6** Scene Prep | [SHOT-MODEL](domain/SHOT-MODEL.md), [NAVIGATION](ux/NAVIGATION.md), [BUSINESS-AND-OPERATIONS](domain/BUSINESS-AND-OPERATIONS.md) (spend rule), Records 4 and 5, canonical prototype ([§6](#6-prototypes)) |
| **VS7** Frame | [GENERATION-PACKAGE](domain/GENERATION-PACKAGE.md), [ENTITIES-AND-LOOKS](domain/ENTITIES-AND-LOOKS.md), [SHOT-MODEL](domain/SHOT-MODEL.md), [PROVIDERS-AND-MODELS](domain/PROVIDERS-AND-MODELS.md), [LINEAGE-AND-STALENESS](domain/LINEAGE-AND-STALENESS.md) |
| **VS8** Take | [JOB-LIFECYCLE](domain/JOB-LIFECYCLE.md), [SHOT-MODEL](domain/SHOT-MODEL.md), [GENERATION-PACKAGE](domain/GENERATION-PACKAGE.md), [PROVIDERS-AND-MODELS](domain/PROVIDERS-AND-MODELS.md), [CANDIDATE-REVIEW-AND-PLAYBACK](ux/CANDIDATE-REVIEW-AND-PLAYBACK.md), [BUSINESS-AND-OPERATIONS](domain/BUSINESS-AND-OPERATIONS.md) |
| **VS9** Review → Export | [CANDIDATE-REVIEW-AND-PLAYBACK](ux/CANDIDATE-REVIEW-AND-PLAYBACK.md), BUILD-SEQUENCE §2.6 (export layout), [PERSISTENCE-AND-MEDIA](architecture/PERSISTENCE-AND-MEDIA.md), [OPERATIONAL-BASELINE](architecture/OPERATIONAL-BASELINE.md) §15 |
| **BAR** | BUILD-SEQUENCE §2.3, [OPERATIONAL-BASELINE](architecture/OPERATIONAL-BASELINE.md), [VERIFICATION-AND-OBSERVABILITY](architecture/VERIFICATION-AND-OBSERVABILITY.md), Record 6 §4 |
| **IW1 to IW3** | BUILD-SEQUENCE §4 and §5; IW2: [VOICE-AND-PERFORMANCE](domain/VOICE-AND-PERFORMANCE.md); IW3: [SHOT-PLANNING-INPUTS](domain/SHOT-PLANNING-INPUTS.md) |

For a cross-cutting topic that is not a slice (lineage, spend, trust signals, providers, tenancy), use [`DECISION-INDEX.md`](DECISION-INDEX.md).

## 6. Prototypes

Prototypes are UX evidence, never authority. They carry mock prices, models, ids and data, and their visuals are not approved.

- Read [`product/PROTOTYPE-RECONCILIATION.md`](product/PROTOTYPE-RECONCILIATION.md) before opening any prototype, branch, screenshot or prototype README. Its §1 holds the rules; its §4 holds the delta registers (`RD-nn`) that must accompany any prototype citation.
- [`product/PROTOTYPE-COVERAGE-GAPS.md`](product/PROTOTYPE-COVERAGE-GAPS.md) lists what the prototypes do not show, so a spec takes those items from the docs.
- [`../prototypes/README.md`](../prototypes/README.md) is the on-disk index. The canonical scene-flow prototype is `prototypes/v2-ux/60-scene-production-canonical/`.
- **Do not open ARCHIVED / DO NOT IMPLEMENT prototypes.** That includes `prototypes/v2-ux/60-scene-production-final/` and the branches the index excludes.
- Load prototype material only when a task needs a surface's structure or placement. Most tasks do not.

## 7. `_inputs/`

`_inputs/` is reference and historical evidence from V1 (WizardDirector). It is **not** V2 requirements or implementation authority. Consult it selectively inside an area the Constitution already defines (Constitution §17.3 to §17.4). Rules and the three corpora are in [`../_inputs/README.md`](../_inputs/README.md) and [`agents/domain.md`](agents/domain.md).

## 8. Where agents stop

- **Do not reopen settled decisions.** Product truth is the Constitution; creator decisions are the Records. The only routes are a Constitution amendment proposal (for the creator) or a spec-level question.
- **Do not start `/to-spec`, `/to-tickets` or implementation from a cleanup or documentation task.**
- Use `GLOSSARY.md` vocabulary and respect the ADRs in the area you touch. Flag a conflict with an ADR explicitly (see [`agents/domain.md`](agents/domain.md)).
- Issue tracker, triage labels and domain-doc layout: see [`../AGENTS.md`](../AGENTS.md).
