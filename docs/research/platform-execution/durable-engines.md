# Durable execution engines (managed and service-style): research for ticket #73

Researched 2026-10-21. Only primary sources are used: vendor docs, pricing pages, changelogs and GitHub. Every source has access date 2026-10-21. **Q** means a quoted or paraphrased vendor fact. **I** means my inference. This file is research only and makes no recommendation. Ticket #74 decides.

Cost scenario from the brief: about 3,000 Jobs/month and about 2M poll/step executions/month. Storage and egress costs do not apply to these engines. Every cost below is **I**, built from the verified unit prices. The main variable is how many billable units one "poll" costs on each engine. Most engines bill a sleep plus a step as 2 units. All cost figures use 2M polls in total, which is the brief's number. A webhook-first design (wait-for-event) cuts the poll count by 10-100x.

## 1. Comparison table

| Option | Model | Max run / max sleep | Pricing (unit, free tier) | Scenario cost/mo (I) | Per-key concurrency, fairness, rate | Wait-for-event + timeout | Cancel | Idempotent start | Local dev / CI | Langs (TS/Py) | Compute runs where | Payload limit / encryption | Lock-in / exit | 2026 changes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Temporal Cloud / self-host** | Code-first, deterministic workflow plus activities | No run cap documented. Limit is history: 51,200 events / 50 MB [3] | $50/M actions, down to $25/M. $0.042/GB-h active storage. No base fee. $150 credit for 90 days [1] | about 2-4M actions → **$100-200** | Fairness keys and weights, per-fairness-key RPS limit, priority 1-5 [4]. No per-key *concurrency* cap seen | Signals/updates plus timer race. Workflow ID is the address | Cancel (cooperative) and terminate | Workflow ID uniqueness | `temporal server start-dev` (SQLite, UI) [5] | Yes / Yes | Your workers. Temporal stores history | 2 MB/payload, 4 MB/txn [3]. Client-side codec. External Storage (S3) is *preview* [6] | MIT server, self-host is real. Workflow code is SDK-shaped | $550M Series E (Sep). No base fee. GCP new-namespace restriction from Oct 2026 [7][8] |
| **Inngest Cloud / self-host** | Code-first `step.run` over HTTP (serve) or connect | Free 30 d, Pro 90 d, Business 366 d. Sleep up to 1 yr [10] | Execution = run + each step. Free 50k. Pro $99 (1M), overage $0.00005 → $0.000015 [9] | about 2M executions → **Pro about $149** | Up to 2 concurrency keys per fn (per-account plus shared "provider" key, scope fn/env/account), throttling, rate limit, priority [11]. Free = 5 concurrent steps | `step.waitForEvent` with CEL match plus timeout [12] | `cancelOn` event, timeout, REST/bulk. A running step finishes first [13] | Event ID / idempotency (not re-read here) | `inngest` dev server, single binary/Docker (SQLite → PG + Redis) [14] | Yes / Yes | Your servers (HTTP endpoint) | 4 MiB step return, 32 MiB run state, event 256 KiB free / 3 MiB paid [10]. E2E encryption middleware [15] | SSPL (Apache in future) [16]. Self-host possible | none found |
| **Trigger.dev v4 Cloud / self-host** | Code-first long-running task with checkpoint/restore | No max duration. Queued TTL max 14 d. No max on `delay` [18] | $0.000025/run plus per-second compute (small-1x $0.0000338/s). Free $5 credit. Hobby $10. Pro $50 [17] | Polling in-task: 2M × about 1 s compute ≈ $68 plus runs → **about $60-80 + plan** | `concurrency: {perKey,total}`, `concurrencyKey` per tenant, shared named limits (for example a provider limit), per-key overrides [19] | Waitpoint token with **callback URL** for provider webhooks, timeout, idempotency key [20] | Cancel run (API/UI) (not re-read) | `idempotencyKey`, default TTL 30 d, scoped per task+env [21] | CLI dev mode against cloud. Self-host Docker | Yes / No (Python scripts only via extension) [22] | **Their machines** (Cloud) | 3 MB trigger payload, 10 MB output, offloaded to object storage [18] | Apache-2.0, self-host v4 | Steady v4.4-4.5 releases. AI agents GA (Jul) [23] |
| **Restate Cloud / self-host** | Code-first journaled handlers, virtual objects (single writer per key) | Durable timers "seconds or years" [27] | Action-based. Free 100k actions. Starter $75 (5M). Business $300 (20M). Overage $25/M [24] | about 4M actions → **Starter $75** | Concurrency limits per scope / hierarchical key (v1.7). Rate limits and priority **planned** [25] | Awakeables, signals (buffered before wait), workflow promises plus timer race [26] | Cancel (cooperative, compensation) and kill [28] | Idempotency-key header. Virtual-object key | Single binary/Docker. UI | Yes / Yes | Your services. Restate stores journal | Client-side encryption on all tiers [24] | **BSL 1.1** (Apache after 4 yr) [29]. Self-host allowed | $20M Series A (site banner). BYOC launched [24] |
| **Vercel Workflows (Workflow SDK)** | Code-first `"use workflow"` / `"use step"` directives | No run or sleep limit. 10k steps/run, 25k events/run [31] | Events $0.02/1k. Data written $0.50/GB. Retained $0.50/GB-mo. Hobby 50k events [31] | about 2M polls × about 3 events (I) ≈ 6M events → **about $120 + Vercel Pro** | **None built-in.** Concurrency control is an open issue/discussion [32] | `createHook` / `createWebhook` plus `sleep` race. Token is not auth [33] | Run cancel (`run.cancel()`) [34] | Hook-token conflict as run idempotency. `stepId` for provider keys [34] | Local World `.workflow-data/`. Postgres World [35] | Yes / Yes (Python GA Oct 2026) [36] | Vercel Functions (theirs) | 50 MB payload, 2 GB/run. E2E encrypted payloads, metadata not encrypted [31][37] | Apache-2.0 SDK. Worlds are pluggable (PG) | GA 2026-04-16 [38]. Multi-region needs v5 |
| **Cloudflare Workflows (+Queues, DO alarms)** | Code-first `step.do` on Workers | Sleep and waitForEvent up to 365 d. Wall-clock per step unlimited, CPU 30 s–5 min [39] | Workers Paid $5 minimum. Steps 500k included + $0.80/100k. Storage 1 GB + $0.20/GB-mo. **Step billing from 2026-08-10** [40][41] | about 4M steps (poll + sleep) → **about $33** | None per key. Account concurrency 50k running (waiting excluded) [39]. DIY with Durable Objects | `step.waitForEvent` (type, 1 s–365 d), **events buffered before wait** [42] | terminate/pause instance (not re-read) | Instance ID (≤100 chars) [39] | `wrangler dev` (local, not re-verified) | Yes / Yes [43] | Cloudflare (theirs) | 1 MiB step result / event. Instance state 1 GB [39] | Proprietary runtime API. Retention 30 d | Per-step billing added (Jul announcement) [41] |
| **AWS Step Functions Standard** | JSON/YAML state machine (ASL) | 1 yr execution / idle. 25k history events [44] | $0.000025/transition. 4,000 free/mo forever [45] | 2M polls × about 3 transitions ≈ 6M → **about $150 + Lambda** | No per-tenant; DIY | Task token callback (`.waitForTaskToken`) with heartbeat/timeout | StopExecution | Execution name unique (90 d) | Step Functions Local (not re-verified) | Language-agnostic DSL | Your Lambdas/containers | 256 KiB I/O [44] | High lock-in (ASL) | none found |
| **AWS Lambda durable functions** | Code-first checkpoint/replay inside Lambda | Up to 1 yr [46] | Ops $8/M, data written $0.25/GB, retained $0.15/GB-mo (pricing example, us-east) plus normal Lambda compute incl. replays [47] | 4M ops ≈ $32 + compute → **about $40-60** | Lambda reserved concurrency only. Tenant isolation mode exists [47] | `waitForCallback` / callback via Lambda API. `waitForCondition` polling op [48] | not verified | Idempotency doc exists [48] (not read) | Testing library / SAM (not verified) | Yes / Yes (+Java, Go, .NET) [46] | Your AWS account | Encrypted at rest. Context results >256 KB not stored [48] | AWS-only SDK | New Lambda primitives (MicroVMs, Web Functions) in 2026 [49] |
| **Google Cloud Workflows + Cloud Tasks** | YAML/JSON DSL | 1 yr execution. Retention 90 d [50] | Internal $0.01/1k (5k free). External/callback $0.025/1k (2k free) [51]. Tasks $0.40/M after 1M [52] | about 2M external + 2M sleep (I) → **about $70** | None per tenant. 10k concurrent executions, backlog 100k [50] | Callback endpoints (`events.await_callback`) | Cancel execution API | Event-trigger dedup 24 h only [50] | No local emulator found | DSL (any lang for steps) | Your Cloud Run/Functions | 512 KB vars/args total [50] | High (DSL) | none found |
| **Hatchet Cloud / self-host** | Code-first tasks/DAGs plus durable tasks (sleep/wait/spawn) [54] | not verified | **Pay-as-you-go from 2026-09-29**: 1M runs + 1M events free (card needed), then $30/M runs, $5/M events. 7-day retention [53][55] | 2M poll runs → **about $30**. Durable-sleep design → **about $0** | Per-key `GROUP_ROUND_ROBIN` (fairness), multiple keys, shared across workflows, **CEL per-key max_runs**, cancel strategies, rate limits [56] | Durable event waits OR sleep. Built-in webhook ingestion with HMAC/Stripe/GitHub verification [57] | Cancel strategies plus API | not verified | `hatchet-lite` Docker (PG only) [58] | Yes / Yes (+Go, Ruby) | Your workers | 10 GB/day active storage free [53] | MIT [16] | Pricing overhaul (Sep). Shared/dynamic concurrency (Sep). Dedicated shards, SSO (Jul) [55][59] |
| **Upstash Workflow / QStash** | Code-first over HTTP. Each step is a QStash callback to your URL | Max delay 1 yr. waitForEvent default 7 d (Free max 7 d) [60][61] | $1/100k steps (retries count). Free 1k steps/day [60] | 2-4M steps → **$20-40 (+Prod Pack)** | `flowControl` key: rate/period plus parallelism, per run (not per step) [62] | `waitForEvent` + `notify`. **Lost unless `workflowRunId` lookback** [63] | Cancel run (not re-read) | not verified | Local QStash dev server (not re-verified) | Yes / partial (Python snippets in docs) | Your endpoint. `context.call` proxies through QStash | 10 MB PAYG. **Encryption at rest needs Prod Pack add-on** [60] | Moderate | Notify lookback (2026 changelog) [64] |

## 2. Per-option notes

### Lifecycle fit, common to all engines (I, applies to every row)
- **Leases/CAS.** No engine replaces our DB compare-and-set for spend caps or Job state. Engines give *run-start exclusivity*: Temporal workflow ID, CF instance ID, Step Functions execution name, Restate idempotency key or virtual-object key, Trigger `idempotencyKey`, Vercel hook token. With Job ID as the run ID, this prevents two orchestrations of the same Job. It does not make the provider call at-most-once. Restate virtual objects (single writer per key) are the closest thing to a lease. They could serialize per-account admission, but the spend cap is a money invariant and still belongs in the DB transaction. The engine is **additional** to the DB, not a replacement.
- **Transactional outbox.** No engine joins a Postgres transaction. Documented patterns:
  1. Commit the Job row and an outbox row together, then have a relay start the run idempotently (run ID = Job ID). A duplicate start is a no-op.
  2. Commit the Job row, then start the run with run ID = Job ID. A periodic reconciler re-starts any Job in `queued` without a run. Start idempotency makes this safe.

  Both still need either an outbox table or a sweeper. Progress events for the browser should come from our DB (state change plus event row in one commit), not from engine history.
- **Crash window between "provider accepted" and "operation reference stored".** Every engine checkpoints a step only *after* it returns. A crash after the provider HTTP 2xx but before the checkpoint makes the step retry, which can double-submit. Inngest, Trigger and the Workflow SDK document this explicitly: pass a stable key to the provider (`stepId`, `ctx.run.id`) [21][34]. Where the provider has no idempotency key:
  - (a) Before the call, write `submitting` plus a client request ID (or tag the provider job with metadata).
  - (b) On retry, look up or list the provider job by that tag before re-submitting.
  - (c) Otherwise fail visibly into `failed:uncertain` for review.

  No engine closes this window for us. It is a per-provider adapter concern.
- **Durable timers and polling.** All engines have durable sleep, so poll/backoff loops, `not_before` and deadlines are native. The ~30 min Job waits fit easily in every option. 1-hour vendor URL expiry means the download step must run right after completion. Retry budgets need to stay well under 1 h.
- **Circuit breaker shared across workers.** None of the engines provides one. Hatchet, Trigger and Inngest shared concurrency keys can cap per-provider concurrency. Breaker state ("open, stop submitting") still lives in the DB/KV. **I**
- **Multi-tenant isolation.** All engines are single-operator accounts. Tenancy is an app-level key (concurrency key or fairness key). Exceptions: Hatchet "tenants" (10 included) and Inngest environments are per operator, not per creator. Cross-tenant leakage risk comes from payloads in a shared dashboard/history. Mitigations:
  - Keep payloads to IDs only. Fetch data and decrypt BYOK keys inside the step from our DB/KMS.
  - Use client-side encryption where available (Temporal codec, Inngest middleware, Restate, Vercel).

  Bulk purge of a project or account in engine history is weak everywhere: retention TTLs only (Vercel cannot delete finished runs [37]). This is acceptable only if payloads hold no creator content. **I**

### Temporal
- Pricing: $50/M actions, down to $25/M self-serve. Active storage $0.042/GB-h, retained $0.00105/GB-h. No minimums. $150 credit for 90 days [1]. "No monthly base fee" is a 2026 change [7].
- Limits: 2 MB/payload, 4 MB/txn, 51,200 events or 50 MB history (warning at 10,240). 500 APS default. Retention 1-90 d, default 30 [3]. A long poll loop needs Continue-As-New or a heartbeating poll activity (I).
- Priority 1-5 plus fairness keys and weights, and per-fairness-key RPS limits on Cloud. Fairness is per partition and approximate [4].
- Regions: 14 AWS and 6 GCP, including eu-central-1. **From Oct 2026, new GCP namespaces require an approved exception** [8].
- Funding: $550M Series E at $12.55B (2026-09-14) [7].
- Fit: strongest semantics and portability (MIT server, self-host). Heaviest programming model (determinism, workers you must keep running). No scale-to-zero for workers (I).

### Inngest
- Pro $99 includes 1M executions. Overage runs from $0.000050 down to $0.000015. Free tier pauses at quota [9].
- Free plan limits: 5 concurrent steps, 24 h traces. Free is likely too tight for production (I).
- Flow control is the most complete of the code-first engines: 2 concurrency constraints per function (per-account plus account-scoped provider key), throttle, rate limit, priority. Cross-key fairness is best-effort. "Key-queue scheduling" is Enterprise only [11].
- Limits: 1,000 steps/function and 32 MiB state [10]. A long poll loop must batch or fan out.
- Cancellation: cooperative between steps. Emits an `inngest/function.cancelled` event for cleanup [13].
- License: SSPL server [16].
- `waitForEvent` race: whether an event sent *before* the wait is matched is **not verified** here. My training says it is not matched (I).

### Trigger.dev v4
- Tasks run on **Trigger's managed machines**. Provider/BYOK keys would be Trigger env vars, or fetched at runtime from our DB, so they are decrypted on vendor compute.
- Waits checkpoint the process and don't count toward concurrency [17].
- Concurrency per environment: Free 20, Hobby 50, Pro 200+ [18].
- Webhook ingest limits per endpoint: 100/300/1000 per 10 s [18].
- Waitpoint `token.url` can be handed to a provider as its webhook (Replicate example). The callback has no signature verification of its own (I: verify in a wrapper route instead) [20].
- Language: TypeScript only (Python via subprocess extension) [22].

### Restate
- Pricing from the pricing page JS bundle [24]:
  - Free: 100k actions, 10/s (burst 100), 1-day retention, best-effort SLA.
  - Starter: $75, 5M actions, 50/s, 3 d.
  - Business: $300, 20M, 7 d.
  - Premium: $1,000, 50M, 30 d.
  - Overage $25/M ($15/M Premium).
  - An invocation counts as 2 actions plus its intermediate actions.
  - Client-side encryption on all tiers.

  Third-party sites list 50k free or $300 Starter. Those are contradicted by the live bundle.
- Flow control v1.7: concurrency per scope. Rate limits and priorities are "planned" [25][30].
- Signals persist even if they arrive before the wait [26].
- License: BSL 1.1, which bars offering it as a public managed service. Fine for us (I) [29].
- Cloud regions: **not verified**.

### Vercel Workflows
- GA 2026-04-16 [38]. Pricing is per event, data written and data retained [31].
- How many events one step creates is **not verified**. The 3 events/step estimate is I.
- Retention [37]:
  - Payloads are readable 1/7/30 d (Hobby/Pro/Ent) and fully deleted within 66/96/126 d.
  - Metadata is kept up to 1 yr and is **not encrypted**.
  - Finished runs **cannot be deleted**. `experimental_retention: 0` is available per run.
  - Runs are pinned to one region. Hook records live in iad1.
- No flow control or concurrency keys [32]. Per-account/per-provider caps would have to be DB-side admission. Webhook tokens are not authentication [33].
- Exit path: Postgres World / self-host [35].

### Cloudflare Workflows (+ Queues, Durable Objects alarms)
- Waiting instances don't count toward concurrency [39].
- Step and storage billing started no earlier than 2026-08-10. Sleep and wait each count as a step for billing [41].
- Retention: completed instances 30 d [39].
- Ingredients for DIY per-key caps and a breaker [65][66]:
  - Durable Objects: $0.15/M requests. Alarms count as requests, and `setAlarm` is a row write.
  - Queues: $0.40/M ops after 1M.
- Compute runs on Cloudflare. The DB would be external (Hyperdrive) or D1, which makes the DB-transaction outbox harder (I).

### AWS Step Functions / Lambda durable functions
- Step Functions Standard: $0.000025/transition, 4k free forever. Retries count as transitions. 256 KiB I/O. 25k events [44][45]. The DSL is high lock-in.
- Lambda durable [46][47][48]:
  - Up to 1 yr. TS/Py/Java/Go/.NET.
  - Retention 1-90 d (default 14).
  - **Replays re-run the handler and are billed as compute.**
  - `waitForCallback` costs 3 ops.
  - Quota page not read: max operations and payload limits are **not verified**.

### Google Cloud Workflows + Cloud Tasks
- Cheap per step [51]. Limits [50]:
  - 512 KB total variable memory.
  - 10k concurrent executions *including sleeping ones*, so a poll loop occupies a slot (I).
  - Retention 90 d.
- YAML DSL, no local emulator found. Cloud Tasks $0.40/M after 1M free [52]. Cloud Tasks max schedule-ahead is **not verified**.

### Hatchet
- Sep 2026 pricing: Developer plans moved to pay-as-you-go. Team/Starter/Growth retired [55].
- The free tier needs a card. It includes 100 workers, 10 tenants, 7-day retention and SOC 2 [53].
- Concurrency features [56]:
  - Dynamic per-key limits via CEL (`input.tier == 'premium' ? 10 : 1`), engine ≥0.106.
  - Shared across workflows.
  - Round-robin fairness.
- Built-in webhook ingestion with signature verification is the only native verified-ingress among these options. Trigger and Vercel give callback URLs without signature checks [57].
- Self-host: Hatchet Lite needs only Postgres [58]. Workflow pause shipped Aug 2026 [59].
- Max durable sleep/run length: **not verified**.

### Upstash Workflow / QStash
- Each step is an HTTP callback into your endpoint. Retries are billed as steps [60].
- Encryption at rest, SOC 2 and SLA require the paid **Prod Pack** add-on (price not verified) [60].
- Max HTTP response duration on pay-as-you-go: 2 h [60].
- Flow control is set per run (all steps inherit it). Changing limits has a transition period [62].
- `notify` without `workflowRunId` is "unsafe": events are lost if nobody is waiting [63].

## 3. Deciding facts (for #74)
1. **Where compute runs.** Your own servers: Temporal, Inngest, Restate, Hatchet, Upstash, Step Functions/Lambda/GCP in your own cloud. Vendor compute: Trigger.dev Cloud, Vercel, Cloudflare. This decides where BYOK keys get decrypted.
2. **Native per-account plus per-provider concurrency keys.** Present: Hatchet (dynamic CEL limits), Trigger.dev (perKey + shared named limits), Inngest (2 keys, account scope). Restate is partial (no rate limits yet). Temporal has fairness plus RPS limits, not concurrency caps. Vercel, Cloudflare, AWS and GCP have nothing per key.
3. **Event-before-wait safety.** Buffered: Cloudflare, Restate signals, Upstash with runId. Hook-not-found and retry: Vercel. Inngest is unverified. This matters for fast provider webhooks.
4. **Scenario cost spread** (I): Hatchet $0-30 ≈ Upstash $20-40 ≈ Cloudflare about $33 ≈ Lambda durable about $50 < Restate $75 < Inngest about $149 ≈ Step Functions about $150 < Temporal $100-200 ≈ Vercel about $120+. A webhook-first design shrinks all of these.
5. **Per-run state limits for long poll loops:** Inngest 1,000 steps / 32 MiB, Temporal 51,200 events, Step Functions 25k events, Vercel 10k steps, Cloudflare 10k-25k steps. Design for one run per Job attempt with batched polls.
6. **Purge and retention controllability.** Vercel cannot delete finished runs. Others are TTL-based. Payloads must carry IDs only to keep project/account purge DB-only.
7. **Self-host / exit licence:** MIT for Temporal and Hatchet. Apache for Trigger and the Workflow SDK. SSPL for Inngest. BSL for Restate. Lambda durable and Step Functions are proprietary.
8. **Local/CI without the cloud:** good for Temporal dev server, Inngest dev server, Hatchet Lite, Restate binary and the Vercel Local World. Weaker for Trigger (dev mode uses cloud) and GCP Workflows.
9. **None of them removes the DB CAS, the outbox/sweeper, or the provider-idempotency adapter.** The engine adds timers, retries and orchestration on top of a DB-as-truth design.

## 4. Limitations and fallbacks
- **No Constitution amendment needed** (I). Every option can satisfy "failures always visible, no state stuck forever". Use per-state deadlines as durable timers, plus a DB-side sweeper as a backstop for runs the engine lost or that never started.
- **Limitation: crash window at provider submit.** Fallback: provider idempotency keys where supported. Otherwise use a pre-call intent row plus tag-based lookup, and route uncertain cases to a visible failed state.
- **Limitation: no transactional enqueue.** Fallback: outbox relay or reconciler, with run ID = Job ID.
- **Limitation: engine fairness is approximate** (Temporal per partition, Inngest best-effort). Fallback: DB-side admission (per-account and per-provider caps checked atomically) is the source of truth. Engine keys only smooth the load.
- **Limitation: vendor history holds payloads.** Fallback: IDs-only payloads plus client-side encryption. Choose short retention.
- **Limitation: free tiers too tight for production** (Inngest 5 concurrent steps, Restate 10 actions/s, Upstash 1k steps/day). Budget for the first paid tier.

## 5. Not verified / open
- Restate Cloud regions and data residency. Restate "$20M Series A" was seen only as a site banner (no date read).
- Inngest: whether `waitForEvent` matches events sent before the wait. Inngest idempotency-key TTL.
- Vercel: events emitted per step (needed for exact cost). Vercel Pro base fee. Data residency for EU.
- Lambda durable: quotas page (max ops, checkpoint size). Local testing tool. Cancellation API. Non-us-east prices.
- Step Functions: exact per-region prices beyond the us-east example. Step Functions Local status.
- Hatchet: max durable sleep / run duration. Idempotency keys.
- Upstash: Prod Pack price. Python SDK parity. Cancellation API. Local dev server.
- Cloudflare: `wrangler dev` local Workflows fidelity. Terminate semantics.
- Google: Cloud Tasks max schedule-ahead time.
- Temporal: whether any per-key concurrency cap exists (only fairness plus RPS limits found).
- Trigger.dev cancel API semantics were not re-read.

## Sources (all accessed 2026-10-21)
[1] https://temporal.io/pricing
[2] (reserved)
[3] https://docs.temporal.io/cloud/limits
[4] https://docs.temporal.io/develop/task-queue-priority-fairness
[5] https://docs.temporal.io/cli/server
[6] https://docs.temporal.io/external-storage
[7] https://temporal.io/blog/durable-digest-september-2026 ; https://temporal.io/blog/temporal-raises-usd550m-series-e-at-usd12-55b-valuation-ai
[8] https://docs.temporal.io/evaluate/cloud/regions ; https://docs.temporal.io/evaluate/cloud
[9] https://www.inngest.com/pricing
[10] https://www.inngest.com/docs/usage-limits/inngest
[11] https://www.inngest.com/docs/guides/concurrency
[12] https://www.inngest.com/docs/reference/functions/step-wait-for-event
[13] https://www.inngest.com/docs/features/inngest-functions/cancellation
[14] https://www.inngest.com/docs/self-hosting
[15] https://www.inngest.com/docs/features/middleware/encryption-middleware
[16] GitHub license API / LICENSE files: github.com/inngest/inngest (SSPL + Apache future), triggerdotdev/trigger.dev (Apache-2.0), hatchet-dev/hatchet (MIT), temporalio/temporal (MIT), vercel/workflow (Apache-2.0)
[17] https://trigger.dev/pricing
[18] https://trigger.dev/docs/limits
[19] https://trigger.dev/docs/queue-concurrency
[20] https://trigger.dev/docs/wait-for-token
[21] https://trigger.dev/docs/idempotency
[22] https://www.trigger.dev/docs/config/extensions/pythonExtension ; https://trigger.dev/vs/temporal
[23] https://trigger.dev/changelog/v4-5-0 ; https://trigger.dev/changelog/v4-5-12
[24] https://restate.dev/pricing (HTML plus page JS bundle /_next/static/chunks/app/pricing/page-*.js)
[25] https://docs.restate.dev/services/flow-control ; https://docs.restate.dev/guides/rate-limiting
[26] https://docs.restate.dev/develop/ts/awakeables
[27] https://restate.dev/
[28] https://docs.restate.dev/services/invocation/managing-invocations
[29] https://github.com/restatedev/restate/blob/main/LICENSE
[30] https://github.com/restatedev/restate/blob/main/release-notes/v1.7.0.md
[31] https://vercel.com/docs/workflows/pricing
[32] https://github.com/vercel/workflow/issues/1206 ; https://github.com/vercel/workflow/discussions/301 ; https://workflow-sdk.dev/docs/comparisons/workflow-sdk-vs-inngest
[33] https://workflow-sdk.dev/docs/foundations/hooks
[34] https://workflow-sdk.dev/docs/foundations/idempotency
[35] https://workflow-sdk.dev/docs/deploying ; https://workflow-sdk.dev/worlds/local
[36] https://vercel.com/changelog/python-on-vercel-is-now-generally-available ; https://vercel.com/docs/workflow
[37] https://vercel.com/docs/workflows/retention
[38] https://vercel.com/blog/a-new-programming-model-for-durable-execution
[39] https://developers.cloudflare.com/workflows/reference/limits/
[40] https://developers.cloudflare.com/workflows/reference/pricing/
[41] https://developers.cloudflare.com/changelog/post/2026-07-07-workflows-billing-updates/
[42] https://developers.cloudflare.com/workflows/build/events-and-parameters/
[43] https://developers.cloudflare.com/workflows/python
[44] https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
[45] https://aws.amazon.com/step-functions/pricing/
[46] https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html
[47] https://aws.amazon.com/lambda/pricing/ (durable functions section and pricing example)
[48] https://docs.aws.amazon.com/lambda/latest/dg/durable-execution-sdk.html
[49] https://docs.aws.amazon.com/lambda/latest/dg/durable-execution-quotas.html (redirected to the Lambda overview: MicroVMs / Web Functions)
[50] https://cloud.google.com/workflows/quotas
[51] https://cloud.google.com/workflows/pricing
[52] https://cloud.google.com/tasks/pricing
[53] https://hatchet.run/pricing
[54] https://docs.hatchet.run/v1/durable-execution
[55] https://hatchet.run/announcement/pay-as-you-go-pricing
[56] https://docs.hatchet.run/v1/concurrency ; https://hatchet.run/announcement/new-concurrency-features
[57] https://docs.hatchet.run/v1/webhooks
[58] https://docs.hatchet.run/self-hosting/hatchet-lite
[59] https://hatchet.run/announcement/workflow-pause-and-viewer-roles ; https://hatchet.run/announcement/enterprise-readiness
[60] https://upstash.com/pricing/workflow
[61] https://upstash.com/docs/workflow/basics/context/waitForEvent
[62] https://upstash.com/docs/workflow/features/flow-control
[63] https://upstash.com/docs/workflow/features/wait-for-event ; https://upstash.com/docs/workflow/api-reference/notify/notify-event.md
[64] https://upstash.com/docs/workflow/changelog
[65] https://developers.cloudflare.com/durable-objects/platform/pricing/
[66] https://developers.cloudflare.com/queues/platform/pricing/
