# Aiuteur V2: Business and Operations Contract

Resolution of Wayfinder ticket #68. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md); the trade-offs are recorded in [ADR 0010](../adr/0010-multi-creator-accounts-operator-paid-bounded-spend.md). Creator decisions come from the [Creator Ratification Record](../product/CREATOR-RATIFICATION-RECORD.md) (M4 to M7 and section 2, #68), [Record 2](../product/CREATOR-RATIFICATION-RECORD-2.md) (P3, X2, X8, D60.4, D60.5, D61.4, P11) and [Record 3](../product/CREATOR-RATIFICATION-RECORD-3.md) (CR-1, CR-2 and stage-entry authorization), with later records controlling where they differ; they are marked **[creator]**. Everything else is agent-designed and reviewable. Like the job lifecycle, this document is provider-neutral and substrate-neutral: no tables, columns or endpoints. Values the creator parked, or that are tuning, are listed in §9 as spec-level configuration; they are not invented here.

## 1. Operating model

1. **Multi-creator, isolated, not collaborative. [creator, M4]** V2 serves several independent creators. Each has an **Account** that owns an isolated **studio**: its projects, assets, media, settings, provider-credential choice and usage. There are no teams, shared projects, shared editing or permission hierarchy. The creator is the first user; others are onboarded without re-architecture.
2. **Isolation is a domain rule, not a screen rule.** Every owned object (a project and everything under it, Generation, Job, Batch, spend facts, media, settings) belongs to exactly one Account, through its project or directly for account-level objects. No operation reads or writes across Accounts. It holds on every path, including background work, events, exports and storage keys, the same way a lock must hold everywhere (Constitution §13.4). The enforcement mechanism belongs to Persistence (#72) and the Operational baseline (#75).
3. **Invite-only signup. [creator, M6]** Until billing exists, an Account is created only by redeeming an invitation issued by the operator. No public signup and no self-service plan.
4. **The operator** is the deployment role that runs the service and holds the provider accounts. It is not a collaborator: it has no editing role in creators' projects. Operator-visible data is operational (account list, usage and spend per Account, alerts, job health). Reading a creator's creative content is not a V2 operator feature.
5. **Who pays. [creator, M5]** The operator pays provider bills for now, using **operator provider keys held server-side**. Keys never reach a browser, a log, a Generation record or a creator-visible error. Creators are not asked for a provider key in the core build.
6. **BYOK is a high-priority follow-on, not a deferral. [creator, M5]** Creator-supplied provider keys, with an easy setup flow, follow right after the core build. The core build ships a **BYOK-ready seam** (§7) so BYOK is a setup flow plus configuration, not a rewrite.
7. **Deletion. [creator, M7]** Retire-only (ADR 0001) stays inside projects. Permanent project and account purge is a required later feature, so each project's data, Generations, spend facts and media must be separable and purge-able by project and by Account. Whether anonymised spend totals are kept for provider reconciliation after a purge is decided with that feature.

## 2. What money the product tracks

The product tracks provider spend per Account to show the creator the price before and after, to enforce the creator's and the operator's limits, and to let the operator reconcile provider invoices. It is **not a billing system**: no invoices, no charges to anyone, no balances (§10).

Hosting is the operator's own cost and is not part of the spend record. The current default deploy target is one VPS running the web process, the worker and Postgres, with Cloudflare R2 for media (Record 2 P11), estimated at about $10 to $25 a month before provider bills. That figure is an **unverified estimate**, and the VPS is a **current deploy choice that stays portable, not architecture** ([`RUNTIME-PLATFORM.md`](../architecture/RUNTIME-PLATFORM.md)). Provider bills, which this contract governs, are separate and scale with generation.

## 3. The meaningful-spend rule **[creator, final]**

Every Generation has a **spend class** computed by code from its estimate (§4). Exceptional confirmation conditions apply first. Otherwise the operation's ratified initiation rule applies, including the stage-entry authorization below (Record 3). The $0.05 boundary remains the default for priced actions and automatic retries, not a universal reason to interrupt ordinary workflow initialization.

| Initiation policy | Test | The creator sees | Confirmation |
|---|---|---|---|
| **Trivial** | Estimate below **$0.05** for the Generation (many text actions fall here, but the class is computed from the estimate, never assumed from the kind of work; video never) | Nothing extra | None. May auto-retry under JOB-LIFECYCLE §5.3 |
| **Ordinary automatic stage initialization** | Ratified initial-content operation with no exceptional confirmation condition. Initial Treatment options use this rule even above $0.05. The initial scene plan has the stricter boundary below | Content starts generating on eligible stage entry. No small-cost price label on navigation, extra Draft button, popup or approval | Entering the eligible empty stage is sufficient authorization |
| **Meaningful** | Non-trivial spend outside the ratified stage-entry authorization, and **all video** at any price | The **estimated price on the initiating control** before the click | The click is the approval (**one-click spend**) |
| **Meaningful, with a confirm step** | Any action that meets any of: its **total estimate is $2.00 or more**; it creates **10 or more Generations**, where the Segment Generations of one long Take count as one, so a take batch counts **Takes, not Segments** (Record 2 P3; the $2.00 total still sums every Segment's cost); it is a **bulk regenerate by filter**; **any price is unknown**; it **would hit a cap** (§6). The count applies even when every member is trivial (see below) | An **inline spend ticket at the initiating control**, never a centred modal (Record 2 X2): the estimate, the count (in Takes for take batches), the largest item, the reasons and, for a cap, what is left. **A cap breach offers no Start** (§6.1) | Required before anything is created |

Rules that complete the table:

- **The action is the unit.** A Batch is one action; its total is the sum of its members and it is judged as a whole. A single video under $2.00 is one click with a visible price and no second dialog. A dialog on every video was considered and declined by the creator.
- **The estimate shown is the one tested.** When the estimate is a range (§4.2), the control shows the range and thresholds are tested against the **upper bound**. An unknown price has no bound, so it always needs the confirm step.
- **Retry.** A creator's Retry shows the price (or "not charged"); the click is the approval. If the retry alone meets a confirm-step condition, it uses the confirm step. Automatic retries follow JOB-LIFECYCLE §5.3 and never create a billable run beyond the original approval except trivial ones.
- **Regeneration and bulk.** One regeneration is one action. A selection the creator picks is one action whose size decides the class. A bulk regenerate by filter (everything affected by a change, a scene, a reason) always uses the confirm step, with the money at risk shown. Staleness never spends (Ratification R2).
- **Single takes, bulk images, video batches.** Single takes follow the table by price. Bulk image generation (a film's frames, a location's views) is a batch and reaches the 10-Generation or $2.00 condition quickly; a batch under 10 below $2.00 in total is one click with the price shown.
- **Count applies regardless of price.** "Draft all scene plans" over a long film shows the confirm step even if each text call is trivial. The step is cheap to pass and shows the total. "Draft all" drafts shot plans only, a text operation; it never generates frames, images, worlds or takes (Record 2 D60.4).
- **Stage entry is authorization [creator, Record 3 §2].** When a stage is intentionally designed to auto-generate its initial content, entering that eligible empty stage authorizes ordinary low-cost generation. For Treatment, three drafts costing about **$0.18 in total** generate normally. No `Treatment · ~$0.18` navigation label, extra Draft button or penny-level approval is added. Exceptional conditions in the table still stop generation and show the inline ticket. Compute and record the estimate and actual cost regardless of whether approval UI is needed.
- **Treatment initialization [creator, CR-1].** Entering Treatment drafts the account's configured number of options, default **3**, only if there is no Treatment, no existing generated options and no upload explicitly designated in Input to serve as the Treatment ([`WRITING-EXPERIENCE.md`](../ux/WRITING-EXPERIENCE.md) §2.1). An unrelated upload or AI classification alone does not suppress drafting. Existing, skipped or bypassed work is never automatically regenerated or backfilled.
- **Initial scene plan [creator, CR-2].** Entry into a scene with no plan auto-drafts only when the estimate is **below $0.05** and no exceptional condition applies. At **$0.05 or more**, show **Draft plan · $x** and wait for the click. Exceptional conditions still use the inline ticket. An existing plan, including one emptied by retirement, never auto-redrafts. This stricter rule is not removed by the stage-entry principle.
- **Automatic scope stays bounded.** Treatment and the initial scene plan are the only ratified Generation auto-triggers (AI-RESPONSIBILITY-MAP §6.0, G10). Each names the stage-entry action and passes server-side eligibility and spend checks. Neither triggers frames, images, worlds, Takes or audio. Staleness, coverage needs and CineBlock return never spend (Record 2 X8). The authorization does not expand scope or the retry allowance, and model selection is never silently downgraded to avoid a spend check.
- **World generation [creator, Record 2 D61.4].** A CineBlock world (`world.generate`, PROVIDERS-AND-MODELS §13) is a meaningful Generation, always creator-initiated, under the same rule: price on the initiating control, one click under $2.00, the confirm step when a condition above fires. The operator pays until BYOK ships (M5); it is BYOK-capable afterwards through the §7 seam. About $1.20 per world is the current estimate (unverified).
- **Approval covers what it states.** One billable run per Generation; a Batch approval is the sum (ADR 0006). Actual above estimate is recorded and shown, feeds drift detection (§4.4), and never triggers another run.
- **Thresholds are tunable defaults, not architecture. [creator]** $0.05, $2.00 and 10 are configuration; changing one changes no structure.
- **Cheaper-first suggestions are information, never substitution.** No path creates a meaningful Generation without the creator's click.

## 4. Estimates and prices

### 4.1 Price entries

Adapters declare how their operations are priced (part of the adapter contract, #66). A **price entry** states provider, model, operation, the unit (per second of video, per image, per megapixel, per 1,000 characters, per million tokens, per run, per credit), the unit price in one reporting currency, the date it was last confirmed, and its **source**:

| Source | Meaning |
|---|---|
| **Looked up** | Fetched from a vendor price endpoint (for example fal's pricing lookup, research #9). Freshest. |
| **Published** | Entered by the operator from the vendor's published price page, with page and date. The default where no lookup exists. |
| **Observed** | Derived from realised cost the provider reports on completed runs (Runway Model Router and OpenRouter do, #9). Cross-checks the other two. |

Prices move fast (research #9 notes scheduled increases and units that differ between pages), so a price entry is **data with an as-of date**, never a constant in code. V1 held its rates in six places and mixed credits with dollars (legacy 08 §10.2); V2 has one price registry and one currency.

### 4.2 How an estimate is built

Code computes the estimate from the Generation's request and the matching price entry, and stores it on the Generation with the entry used and its as-of date. Three forms:

- **Point** when the request determines the cost (video by billed duration and model; an image by model and size).
- **Range** when it does not (token-priced text; runtime-priced providers). Bounds come from the adapter's declaration.
- **Unknown** when there is no usable entry, or it is stale beyond its limit (§4.3). Always needs the confirm step; shown as "price unavailable".

The estimate uses the quantity the provider will actually bill, as the adapter declares it, not the requested quantity (V1 summed unclamped durations where Veo bills 4, 6 or 8 seconds, legacy 08 §10.2).

### 4.3 Keeping prices current

- **Looked-up** entries refresh at use when older than a configured age, and on a schedule.
- **Published** entries carry a review date. Past the **staleness limit** the estimate widens to a range by a drift allowance; past a second limit it becomes unknown. The operator is alerted to review it.
- **Observed** drift (§4.4): repeated variance in the same direction marks an entry **suspect**, with the same effects and an operator alert.
- A model retired or repriced by its provider is a Platform configuration failure (JOB-LIFECYCLE §5.2), told to the creator as a platform problem, and alerted to the operator.

### 4.4 Reconciling estimate against actual

At settlement a Generation records **actual cost** once (never accumulated from repeated reads, JOB-LIFECYCLE §4) with a source: **reported** by the provider, **computed** from the billed quantity and price entry, or **unavailable** (some vendors expose cost only in a dashboard, #9). It records the variance from the approved estimate. Variance feeds §4.3. Where actual is unavailable the computed value is kept and marked computed; the operator's invoice reconciliation (S11) is the final check.

## 5. The spend record and attribution

### 5.1 The record

The **spend record is part of the Generation**, which already is the permanent record of what was asked and what it cost (domain model §4.4, ADR 0001). There is no second ledger. A Generation carries:

| Part | Content |
|---|---|
| **Owner** | The Account and the project, copied at creation and permanent |
| **Initiating action** | Action id and, for a batch, the Batch id (JOB-LIFECYCLE §4, §8); the approved estimate |
| **Estimate** | Point, range or unknown; the price entry and as-of date used; the spend class |
| **Runs** | Per Job: provider, model, `billed` (*no*, *maybe*, *yes*) and the run's cost if known. Survives Job pruning as the Generation's run history |
| **Actual** | Set once on settlement: amount, source, variance, and whether any run is still *maybe* billed. A later reconciliation (late result, cancel outcome) may update it once |
| **Paid by** | *operator* or *account* (BYOK); see §7 |
| **Inherited flag** | Set on Generations copied into a duplicate project; excluded from the new project's new-spend total (LINEAGE-AND-STALENESS §10). Inherited cost is history, not spend |

Spend facts arrive through the lifecycle's own events (`generation.succeeded`, `.failed`, `.cancelled`, `.late_result`). The spend view consumes the outbox; it does not read Job rows to guess.

### 5.2 Attribution

Attribution is **by relation, not by copying**: spend rolls up through what the Generation targets.

```diagram
Account ── project ── scene ── shot ── Slot (Frame | Take) ◀── Generation (target)
                 │
                 └── entity / Look / View / document ◀───────── Generation (target)

Generation ──► Account, project, provider, model (stored)
Generation ──► artifacts produced (Attempts / Options / Revision)
Generation ──► Job runs (billed state, cost per run)
```

- Account, project, provider and model are stored; scene and shot are derived from the target, so spend follows a shot when scenes are reordered and cannot go stale.
- Spend with no shot (entity images, location views, text on documents) rolls up to the project and its target object.
- "Money at risk" before an action is computed from estimates through the same relations (LINEAGE-AND-STALENESS §10).
- **Summaries are derived**: per Account and period, per project, scene, shot, provider, model and spend class. The only cached figures are the cap check's (§6.3); they can be rebuilt.
- **Accounts never see each other's records.** The operator sees per-Account totals and provider/model breakdowns, not content.

### 5.3 What counts as spend

| Run outcome | Counts |
|---|---|
| Succeeded | Actual cost |
| Failed, `billed: no` | Nothing |
| Failed, `billed: maybe` | The run's estimate toward caps **until reconciled**; shown as "may have been charged" |
| Failed, `billed: yes` (including `output_lost`) | Actual, or estimate if actual is unavailable |
| Cancelled | By `billing` (JOB-LIFECYCLE §6): none, maybe or yes |
| Late result after timeout or cancel | Already counted as maybe or yes; reconciliation settles it |

## 6. Caps and the reservation question

### 6.1 Creator caps **[creator, M6]**

A creator sets their own caps for their Account: a **daily** and a **monthly** limit (account-local calendar periods) and optionally a **per-action maximum**. Defaults are **parked** (§9); the creator said not to worry about them now. Only the creator changes them, in the app, at any time.

A creator cap is a guard set for themselves, so reaching it is a confirm-step condition (§3), not a silent failure: the spend ticket shows what is left and offers to raise the cap for this action, trim the action, or cancel. It offers **no Start** until the action fits (Record 2 X2). Raising a cap is an explicit creator act.

### 6.2 The hidden operator ceiling **[creator, M6]**

For the pre-BYOK window only, each Account has a **small hidden operator ceiling** on operator-paid spend, per period. It is not shown in the creator's settings and is not creator-adjustable (the operator adjusts it per Account). A request that would exceed it is refused before any Generation is created, in plain wording that this is a limit on the studio and not on their content, with an operator alert. Its size is **parked** (§9). It applies only to operator-paid spend, so **BYOK spend is not subject to it, and removing it entirely is a configuration change** (M5).

### 6.3 Reservation: only what is necessary

No balance, hold or reservation ledger. The check is one computation at Generation creation:

> **Committed spend for the period** = settled actual + estimates of *maybe*-billed runs + approved estimates of Generations created but not yet settled. An action is allowed when committed spend plus the action's upper-bound estimate stays within the creator's cap and, for operator-paid spend, the operator ceiling.

It is evaluated in the same transaction that creates the Generations and serialised per Account, so concurrent actions cannot jointly exceed a cap. Each unsettled estimate is released when its Generation settles (replaced by actual) or is cancelled without cost. Because approval already covers one billable run, the only extra exposure is *maybe*-billed runs, and they are counted until reconciled. This is all of "reservation and settlement" the product needs: a derived figure, not a store.

## 7. BYOK-ready seam

| Element | Rule |
|---|---|
| **Credential resolution** | Adapters never read a global key. They receive a credential resolved by (Account, provider): *operator key* (default) or *own key* |
| **Own keys, when built** | Entered in a setup flow, validated against the provider, stored encrypted and write-only (never displayed back, logged, or placed in a Generation). Per Account, never shared. The flow is follow-on design |
| **Spend record** | `paid by` distinguishes operator-paid from account-paid spend. Estimates, caps and the confirm rule are identical either way |
| **Ceiling** | Applies only to operator-paid spend (§6.2) |
| **Failure wording** | A Platform configuration failure (JOB-LIFECYCLE §5.2) reads as "the studio" for operator-paid and "your provider account" for account-paid; only operator-paid alerts the operator |
| **Price registry** | Unchanged: the price of an operation does not depend on who pays |

## 8. Safeguards

All are per Account unless stated. Creator-facing ones never block silently: they show the reason or ask.

| # | Safeguard | What it does |
|---|---|---|
| S1 | **Approval is the per-action cap** | One billable run per Generation; the approved estimate (or batch sum) bounds the action. Actual above estimate is recorded, never re-run |
| S2 | **Creator caps** (§6.1) | Daily, monthly and optional per-action limits; reaching one needs the confirm step |
| S3 | **Operator ceiling** (§6.2) | Hidden hard limit on operator-paid spend per Account until BYOK |
| S4 | **Spend rule** (§3) | Inline spend ticket for $2.00 or more, 10 or more Generations (Takes, not Segments, P3), bulk regenerate by filter, unknown price, cap-hit |
| S5 | **Runaway-retry guards** | Automatic retry capped at three Jobs per Generation, only for known-unbilled or trivial runs (JOB-LIFECYCLE §5.3); a creator Retry never loops; trivial automatic retries count toward committed spend and a per-Account **trivial-retry rate limit** stops a failing trivial path draining money in small pieces |
| S6 | **Duplicate guard** | Action ids and input fingerprints stop double clicks and accidental repeats (JOB-LIFECYCLE §4) |
| S7 | **Provider circuit breaker** (operator-wide, since operator keys are shared) | After a configured number of billed or maybe-billed failures in a window on one provider or model, automatic retries to it stop and new submissions show "this model is failing; you may be charged" until a success or the operator clears it. Platform configuration failures on an operator key stop submissions to that provider at once; a failure on one Account's own (BYOK) key affects only that Account (M4) |
| S8 | **Admission limits** | Per-Account and per-provider concurrency and fair scheduling across Accounts, owned by the runtime (#74); they bound how fast an Account can spend |
| S9 | **Provider-side limits** | The operator sets a prepaid balance or spend limit at each provider as the outer wall. Provider quotas and rate limits surface as deferrals (JOB-LIFECYCLE §5.1) or Platform configuration failures, never hidden |
| S10 | **Operator alerts** | Provider out of funds or key revoked; an Account near its ceiling; stale or suspect prices; drift beyond tolerance; circuit breaker open; maybe-billed runs unreconciled past their retention deadline |
| S11 | **Invoice reconciliation** | The operator compares recorded spend per provider and period with the provider's invoice. Differences are an operator task |

Provider-driven limits that change under us (quotas, rate limits, model retirement) are discovered through the adapter's error mapping, not assumed (#66, #73).

## 9. Parked and spec-level configuration

Not decided here, and not to be invented silently:

| Item | Status |
|---|---|
| **Default creator caps** (daily, monthly, per-action) | **Parked by the creator** (M6). Must be set before the first invitation; the spec lists them as configuration |
| **Size of the hidden operator ceiling** | **Parked by the creator** (M6). Same |
| Price staleness limits, drift tolerance and run count, widening margin, refresh age | Tuning values for the behaviour in §4.3 |
| Circuit-breaker threshold and window; trivial-retry rate limit | Tuning values |
| Currency of record and rounding | One reporting currency; spec-level |
| Period boundaries | Calendar day and month in the Account's timezone; spec-level |
| Spend retention after purge (M7) | Decided with the deletion feature |
| $0.05, $2.00 and 10 | Ratified defaults; configuration |
| Possible preference to reduce spend gates | **Deferred idea only** (Record 3 §3). No feature, setting or default designed |

## 10. Explicit deferral list

Not designed here, and where the Constitution excludes them not to be invented without a creator-approved amendment:

- **Commercial billing, subscriptions, purchasable credits, invoicing and productized usage-plan enforcement.** No balances, plans, payments or invoices in V2. (V1's `user_credits` balance, auto-seeded and deducted without a ledger, with no top-up path, is not carried; legacy 08 §10.4.)
- **Teams, shared budgets, multi-creator cost allocation** (spend shared or divided across Accounts), and all collaboration or shared editing (§15.5 OUT).
- **Public signup** (invite-only until billing exists).
- **Per-operation dashboards, anomaly detection and cost-optimisation recommendations** beyond the §8 alerts (WD-IDEA-PHIL-057, future).
- **Permanent project and account purge**: required, scheduled after V2 core (M7); its separability constraint applies now.

**Not a deferral:** BYOK is a priority follow-on. Only its setup flow comes after the core build; the seam (§7) is part of it.

## 11. V1 failures this contract answers

| V1 failure (legacy 08 §10) | Answer |
|---|---|
| Image "credits" and video dollars summed; rates in six places | One currency, one price registry with as-of dates (§4) |
| Skipped shots charged; a second confirm charged the full total again | Estimate and approval per Generation and action id; duplicates refused (JOB-LIFECYCLE §4) |
| Failed jobs, clamp and actual-versus-estimate never reconciled | Actual set once with variance; billed state per run; drift detection (§4.4) |
| Read-check-write balance, no transaction or ledger | No balance; caps checked atomically per Account at creation (§6.3) |
| Retries uncharged, unshown, every error retried | Retry shows price and is the approval; classes decide (JOB-LIFECYCLE §5) |
| Credits provisioned on read; no payment path | No balances; invite-only accounts; billing deferred |
| Tenant check on project owner only, service-role client | Isolation is a domain rule on every path (§1.2) |

## 12. Hand-offs

| Ticket | Receives |
|---|---|
| **Persistence and media storage** (#72) | Account and project ownership on every record; isolation on every read and write path including background work and storage keys; invitation and Account records; encrypted write-only credential storage for the BYOK seam; spend facts on the Generation with run history; per-project and per-Account separability so purge can be added without a rewrite (M7) |
| **Operational baseline** (#75) | Authentication for invite-only Accounts; the operator role and its limited visibility; secrets handling for operator keys; the S10 alert list; invoice reconciliation; logs that never carry keys or one Account's content into another's view |
| **Platform and execution research** (#73) | Evaluate each shortlisted option against multi-tenant isolation (per-Account data, secrets, queues, storage), per-Account atomic cap checks, and holding operator keys; no option may need an unrestricted shared database identity for ordinary requests |
| **Runtime platform** (#74) | Per-Account and per-provider admission limits and fairness (S8); the circuit breaker (S7) needs state shared across workers |
| **Providers and models** (#66, resolved in [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md) §§7, 14) | Adapter contract additions: price declaration (unit, source, bounds), billed-quantity rule, actual-cost reporting capability, credential interface resolved by (Account, provider), and error mapping that separates operator-funds from content failures |
| **Generation package** (#65) | The estimate derives from the exact package; its parameters set the billed quantity |
| **Writing experience** (#58), **Scene hub redo** (#60), **AI responsibility** (#64) | Record 3 stage-entry authorization: ordinary initial Treatment drafting needs no penny-level gate; initial scene plans auto-draft only below $0.05, otherwise Draft plan · $x; exceptional conditions always override automation; both triggers record initiation and cost |
| **World Definition** (#59), **Shot planning inputs / CineBlock** (#61), **Candidate review and playback** (#62) | Every generation trigger applies §3: price on the initiating control; confirm-step conditions as an inline ticket, never a modal, with no Start on a cap breach; Retry with price; the "may have been charged" wording; unknown-price and cap-hit states; money at risk from lineage |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)) | A spend module (estimate, cap check, summaries) beside generation; a credential resolver; the price registry; no vendor names in it |
| **Verification** (#76) | Provider fakes need price entries, stale and unknown prices, drift, unavailable actual cost, funds exhausted, key revoked; tests for cap races between concurrent actions and for cross-Account isolation |

## 13. Constitution check

No requirement was found unworkable or contradictory; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** Record 3 refines the meaning of material spend for ratified stage initialization: ordinary initial Treatment drafting is authorized by entering the eligible stage, not made material solely by crossing $0.05. Exceptional costs still stop for approval before generation. §2.4, §3 (5), §13.4(2) and §14.3 are met: generation remains creator-initiated, video shows its price before the click, large batches use a confirm step, and the initial scene plan retains CR-2's stricter priced-click boundary. §15.5 excludes collaboration and shared editing; isolated Accounts with no sharing are a different thing, and the Ratification Record (M4) judges that no amendment is needed. §18.7 is resolved here: billing and credits are deferred, limits and safeguards are in §6 and §8, and cost tracking is in §5.
