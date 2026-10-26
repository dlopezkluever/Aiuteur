# Aiuteur V2

**Planning, specification and implementation agents: start at [`docs/README.md`](docs/README.md) before exploring the wider corpus.** It owns the documentation hierarchy, the authority order, the reading strategy and what to skip. Do not read the whole corpus by default. The Wayfinder map (#49) is complete and ratified; do not reopen settled decisions.

## Agent skills

### Issue tracker

GitHub Issues in `dlopezkluever/aiuteur`, driven by the `gh` CLI; PRs are not a request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. `GLOSSARY.md` (terminology authority) and `docs/adr/` exist and are populated. `docs/README.md` routes to the Constitution, the current domain/UX/AI/architecture docs and the Ratification Records. `_inputs/` is legacy reference and evidence only, not V2 requirements. See `docs/agents/domain.md`.

### Prototypes

Prototypes are throwaway UX evidence, never authority. Before opening any prototype, branch, screenshot or prototype README, read `docs/product/PROTOTYPE-RECONCILIATION.md` (status of every prototype, delta register, rules for `/to-spec` and implementation agents). Never use an ARCHIVED prototype. On-disk index: `prototypes/README.md`.
