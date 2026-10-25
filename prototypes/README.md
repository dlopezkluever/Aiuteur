# Prototypes index

**Read [docs/product/PROTOTYPE-RECONCILIATION.md](../docs/product/PROTOTYPE-RECONCILIATION.md) first.** Prototypes are throwaway UX evidence. They never override the Constitution, Ratification Records, ADRs or docs. Mock prices, models, ids, flags and data are not requirements.

Only one prototype lives on `main`; the rest are on never-merged `prototype/*` branches (kept as historical record).

## REFERENCE
| Prototype | Where | Use for |
|---|---|---|
| **#60 CANONICAL flow (active)** | `main`: `v2-ux/60-scene-production-canonical/` | The whole flow (Outline, Script Hub, Storyboard, Shot editor, Generate, Review #62-A) for structure and placement only. See deltas RD-10 to RD-22, RD-48 to RD-60. |
| #60 final synthesis (historical, superseded) | `main`: `v2-ux/60-scene-production-final/` | Do not use as the reference; kept as record. |
| #58 fresh writing | branch `prototype/v2-58-writing` | Chosen writing surfaces. See RD-23 to RD-28. |

## PARTIAL REFERENCE (named surfaces only)
| Prototype | Branch | Useful for |
|---|---|---|
| #59 fresh world | `prototype/v2-59-world` | Tiles, extraction review, Identity, contact sheet, Visual Style, wall. NOT Coverage model or Voice (RD-35 to RD-45). |
| #62 fresh review, variant A | `prototype/v2-62-review` | Timeline, gap slates, swap = select, compare (RD-48 to RD-60). |
| #63 trust signals, Whisper A | `prototype/63-trust-signals` | Presentation only, not mechanics (RD-61 to RD-69). |
| #57 intake | `prototype/intake-interview-57` | Input staging, Interview A, ledger layout (RD-29 to RD-34). |
| #60 hub round | `prototype/v2-60-scene-hub` | Draft all, Options, ad-hoc and auto-draft behaviours only (RD-46, RD-47). |
| #60 v3 | `prototype/v2-60-scene-production-v3` | Script Hub `hub.js` only. |

## Excluded from the implementation-reference path (ARCHIVED / DO NOT IMPLEMENT)
`prototype/56-navigation-models`, `58-writing-experience`, `59-world-definition`, `60-scene-hub-shot-planning`, `61-shot-planning-inputs`, `62-candidate-review`, `v2-60-scene-workspace`. Do not consult them. Reasons are in the reconciliation document.

`v2-ux/shared/` is infrastructure for the final prototype, not a design system.
