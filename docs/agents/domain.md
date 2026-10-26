# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

**For Aiuteur V2, start at [`docs/README.md`](../README.md).** It is the documentation router: it sets the authority order (Constitution, then the Creator Ratification Records, then ADRs and the reconciled domain/UX/AI/architecture docs), the reading order, and what to skip. [`docs/DECISION-INDEX.md`](../DECISION-INDEX.md) maps a topic to the few documents and ADRs that govern it. Consume the glossary and ADRs inside that larger context, not on their own.

- **`GLOSSARY.md`** at the repo root, or
- **`GLOSSARY-MAP.md`** at the repo root if it exists: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.
- **`docs/product/PRODUCT-CONSTITUTION.md`** and the current docs in `docs/domain/`, `docs/ux/`, `docs/ai/` and `docs/architecture/`: these exist and matter. Read the ones your task touches, not all of them.

If any of these files don't exist in another repo, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `GLOSSARY-MAP.md` at the root):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_

## Terms that must not drift

Use the glossary's **Account (studio)**, **Invite-only**, **Purge** and **Workflow operation**. Do not say "user", "tenant" or "agent" for them, and do not write "never deleted" without "inside a project": whole-project and account Purge is a separate, later operation (ratification M7). V2 has multiple isolated creator accounts but no collaboration.

## Reference corpora (not requirements)

`_inputs/` holds three corpora of legacy (V1 WizardDirector) material. They are **reference / evidence only**. None is an authoritative statement of V2 requirements, and none substitutes for the Constitution, the Ratification Records, `GLOSSARY.md` or ADRs. Overview and per-corpus guidance: [`_inputs/README.md`](../../_inputs/README.md). Constitution §17.3 to §17.4 sets the status of each.

- **`_inputs/legacy-foundational-docs/`**: the old PRD, user flow, CineBlock overview and prompt inventory. A coherent prior product definition, used as a design reference. Its stage counts, numbers, providers, storage choices, locks and branching are not V2 truth.
- **`_inputs/product-knowledge/`**: historical WizardDirector/Aiuteur product intent: 1,885 atomic `WD-IDEA-*` ideas, including options, alternatives, deferred and rejected ideas. It records what was envisioned, not what was built or what V2 should do. Start at `00-README.md`, then `14-PRODUCT-INTENT.md` and `01-PRODUCT-MODEL.md`; use `15-FULL-IDEA-LEDGER.md` for lookup and `13-DOC-CONTRADICTIONS.md` for preserved disagreements.
- **`_inputs/legacy-system/`**: code archaeology of the legacy implementation at its last commit (`WD-IMPL-*` ids): what the old system actually did, including dead, partial and duplicated code. Start at `00-README.md`, then `01-SYSTEM-OVERVIEW.md`, `03-USER-WORKFLOWS.md`, `04-DOMAIN-AND-STATE-MODEL.md`. Its `_evidence/` subtree is raw material; don't read it unless tracing a specific claim.

Rules for using them:

- Read them for context when a task touches the relevant area; skip them otherwise.
- Cite items by id (`WD-IDEA-…`, `WD-IMPL-…`) as evidence or background. Never copy an item into a spec, ticket or decision as if it were a V2 requirement; a V2 requirement exists only once the creator has decided it (the Constitution, a Ratification Record, a closed decision ticket, or an ADR).
- Never treat a `WD-IDEA-*` as proof that something was built, or a `WD-IMPL-*` as proof that V2 should do the same.
- Where the corpora disagree with each other, or with a decision already made, say so explicitly rather than picking silently.
- Legacy vocabulary may be reused, renamed or dropped in V2. Don't treat it as the V2 glossary.
