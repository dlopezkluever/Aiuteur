# Multi-creator isolated Accounts, operator-paid with a BYOK seam, and a mechanical spend rule

Status: accepted (Wayfinder #68; creator decisions from the [Ratification Record](../product/CREATOR-RATIFICATION-RECORD.md) M4 to M7). Full contract in [`docs/domain/BUSINESS-AND-OPERATIONS.md`](../domain/BUSINESS-AND-OPERATIONS.md).

V1 had a per-user credit balance that was read, checked and overwritten without a ledger, rates in six places, a tenant check on one column, and no reconciliation of estimate against actual (legacy 08 §10). V2 decides:

- **Multi-creator, not collaborative.** Independent Accounts, each an isolated studio, invite-only until billing exists. No teams, sharing or shared editing. Isolation is a domain rule on every path, not a UI concern.
- **The operator pays** with server-held operator keys, behind a **BYOK-ready seam** (credentials resolved per Account and provider; spend records say who paid). BYOK is a priority follow-on, not a deferral; when it ships, the hidden operator ceiling stops applying.
- **Spend authorization follows the operation and stored estimate.** The default is trivial under $0.05 per Generation; other spend and all video show the price on the initiating control. [Record 3](../product/CREATOR-RATIFICATION-RECORD-3.md) refines this for ratified initial-content operations: eligible stage entry authorizes ordinary initial Treatment drafting, such as three options costing $0.18 total, without a priced navigation label, extra Draft button or popup. The initial scene plan keeps the stricter boundary: automatic below $0.05, otherwise **Draft plan · $x**. Exceptional conditions always override automation: an inline spend ticket, never a centred modal (Record 2 X2), at $2.00 or more in total (summing every Segment), 10 or more Generations (a take batch counts Takes, not Segments; Record 2 P3), bulk regenerate by filter, unknown price, or reaching a cap, where a cap breach offers no Start. A single video under $2.00 is one click. World generation for CineBlock follows the default rule and is operator-paid until BYOK (Record 2 D61.4). Nothing automatically creates a media Generation (Record 2 X8). Retry policy is unchanged, and a future preference to reduce spend gates is deferred.
- **The spend record is part of the Generation**, attributed by relation through its target; no second ledger and no balance. Actual cost is set once; estimate-versus-actual drift keeps price data honest. Prices are dated data in one registry, never constants.
- **Caps** are set by the creator; a small hidden operator ceiling per Account exists only until BYOK. The cap check is derived (settled plus maybe-billed plus unsettled approved estimates), evaluated atomically per Account at creation. Defaults and ceiling size are parked as spec-level configuration.

## Considered options

- **Personal-first single-owner deployment.** Rejected by the creator: others are to be onboarded quickly without re-architecture.
- **Creator-supplied keys from the start.** Rejected for the core build to keep onboarding simple; the seam keeps it a follow-on, not a rewrite.
- **A reservation ledger and balances.** Rejected: approval already covers one run, so a derived committed-spend figure is sufficient, and balances imply billing, which is deferred.
- **A confirm dialog on every video.** Declined by the creator: one click with a visible price when under $2.00.
- **Creator caps as silent hard stops.** Rejected: reaching one is a confirm-step condition the creator can resolve, which keeps spend the creator's.

## Consequences

- Every owned record carries Account ownership; Persistence (#72), the Operational baseline (#75) and the platform shortlist (#73) must provide and be judged on multi-tenant isolation.
- Provider adapters (#66) declare prices, billed quantity and actual-cost availability and receive per-Account credentials.
- ADR 0006's trivial-spend threshold is $0.05.
- Commercial billing, subscriptions, credits, invoicing, shared budgets and public signup remain deferred.
