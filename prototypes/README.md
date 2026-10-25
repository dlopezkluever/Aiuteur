# Prototypes index

**Read [docs/product/PROTOTYPE-RECONCILIATION.md](../docs/product/PROTOTYPE-RECONCILIATION.md) first**, then [PROTOTYPE-COVERAGE-GAPS.md](../docs/product/PROTOTYPE-COVERAGE-GAPS.md) for what the prototypes do not show. Prototypes are throwaway UX evidence. They never override the Constitution, Ratification Records, ADRs or docs. Mock prices, models, ids, flags and data are not requirements.

Only the #60 prototypes and the shared kit live on `main`; the rest are on never-merged `prototype/*` branches (kept as historical record).

## REFERENCE
| Prototype | Where | Use for |
|---|---|---|
| **#60/#62 CANONICAL flow (primary)** | `main`: `v2-ux/60-scene-production-canonical/` | The whole scene flow: Outline, Script Hub, Storyboard, Scene Prep, Generate Frames and Takes, Review. Structure and placement only. Deltas: RD-01 to RD-22, RD-48 to RD-60, RD-70 to RD-93 (reconciliation §4.0 says which apply). |
| #58 fresh writing | branch `prototype/v2-58-writing` | Chosen writing surfaces. RD-23 to RD-28. |

## PARTIAL REFERENCE (named surfaces only)
| Prototype | Branch | Useful for |
|---|---|---|
| #59 fresh world | `prototype/v2-59-world` | Tiles, extraction review, Identity, contact sheet, Visual Style, wall, Extra type. NOT the Coverage model or Voice (RD-35 to RD-45). |
| #63 trust signals, Whisper A | `prototype/63-trust-signals` | Presentation only, not mechanics (RD-61 to RD-69). |
| #57 intake | `prototype/intake-interview-57` | Input staging, Interview A, ledger layout (RD-29 to RD-34). |
| #60 hub round (gap evidence only) | `prototype/v2-60-scene-hub` | Draft all, Options, Ad-hoc, Removed, Peek, auto-draft fixtures: things the canonical Hub does not draw. |
| #62 fresh review (gap evidence only) | `prototype/v2-62-review` | Trim to fit, whole-film bulk ticket, late-arrival and failed/partial fixtures. |

## Excluded from the implementation-reference path (ARCHIVED / DO NOT IMPLEMENT)
`60-scene-production-final` (on `main`, superseded by the canonical prototype); branches `prototype/v2-60-scene-production-v3`, `v2-60-scene-workspace`, `60-scene-hub-shot-planning`, `61-shot-planning-inputs`, `62-candidate-review`, `59-world-definition`, `58-writing-experience`, `56-navigation-models`. Do not consult them. Reasons are in the reconciliation document.

`v2-ux/shared/` is infrastructure, not a design system.
