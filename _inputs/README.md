# `_inputs/`: legacy reference and historical evidence

**`_inputs/` is reference and historical evidence. It is NOT current Aiuteur V2 requirements and NOT implementation authority.** Current documentation starts at [`docs/README.md`](../docs/README.md). Go there first.

Superseded legacy documentation has been removed from the active tree and remains available through Git history.

## Use it selectively

Consult `_inputs/` only when a current task needs historical evidence, and only inside an area the [Product Constitution](../docs/product/PRODUCT-CONSTITUTION.md) already defines (§17.3 and §17.4). Do not ingest it by default; it is far larger than anything a task needs.

- Cite items by id (`WD-IDEA-…`, `WD-IMPL-…`) as background. Never copy one into a spec, ticket or decision as a V2 requirement.
- A V2 requirement exists only once the creator has decided it: the Constitution, a Creator Ratification Record, or a decision recorded in the current docs and ADRs.
- Where `_inputs/` and a current decision disagree, the current decision controls. Say so explicitly instead of picking silently.
- Legacy vocabulary may be reused, renamed or dropped. The V2 glossary is [`GLOSSARY.md`](../GLOSSARY.md).

## The three corpora

| Directory | What it is | Use it for |
|---|---|---|
| [`legacy-foundational-docs/`](legacy-foundational-docs/) | The old PRD, user flow, CineBlock overview and system-prompt inventory. | A design reference: how V1 attempted an already-established V2 problem. Its stage counts, numbers, providers, storage, locks and branching are not V2 truth. |
| [`product-knowledge/`](product-knowledge/00-README.md) | 1,885 atomic `WD-IDEA-*` product ideas condensed from the legacy docs, with alternatives, deferred and rejected ideas kept side by side. | A nuance reservoir for what was envisioned. Not a record of what was built. Ideas carry no design weight unless the Constitution names them. Never ask the creator to resolve its internal contradictions. |
| [`legacy-system/`](legacy-system/00-README.md) | Code archaeology of the V1 implementation (`WD-IMPL-*` ids): what it did, including dead, partial and duplicated code. Its `_evidence/` subtree is raw material. | V1 lessons and failure evidence. V1 modules, tables and structure are not V2 architecture. Skip `_evidence/` unless tracing one claim. |

Fuller usage rules: [`docs/agents/domain.md`](../docs/agents/domain.md).
