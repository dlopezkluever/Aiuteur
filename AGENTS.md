## Agent skills

### Issue tracker

GitHub Issues in `dlopezkluever/aiuteur`, driven by the `gh` CLI; PRs are not a request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. `GLOSSARY.md` and `docs/adr/` exist (created lazily by `/domain-modeling`, now populated); `_inputs/` holds two reference corpora that are evidence, not V2 requirements. See `docs/agents/domain.md`.

### Prototypes

Prototypes are throwaway UX evidence, never authority. Before opening any prototype, branch, screenshot or prototype README, read `docs/product/PROTOTYPE-RECONCILIATION.md` (status of every prototype, delta register, rules for `/to-spec` and implementation agents). Never use an ARCHIVED prototype. On-disk index: `prototypes/README.md`.
