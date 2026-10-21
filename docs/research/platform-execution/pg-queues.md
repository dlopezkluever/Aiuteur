# Postgres-backed queues / durable-execution libraries — research for ticket #73 (Aiuteur V2)

Accessed 2026-10-21 unless stated. Facts carry [n] citations to the Sources list. Text marked **(inf)** is my inference, not a quoted fact. Activity numbers come from the GitHub API on 2026-10-21 [52]. "Commits 90d" counts commits on the default branch since 2026-07-21, capped at 100 per query.

Scope: libraries where job rows live in the **same Postgres as app data**, so an enqueue can commit in the same transaction as the domain write. That gives a transactional outbox with no extra machinery. Hatchet is included as a Postgres-based self-host engine, but it is a separate service (see below).

---

## 1. Comparison table

| Option | Lang(s) | Latest release / activity (bus factor) | Delayed / sleep | Dedup / singleton | Per-group concurrency (account / provider) | Cancel | Retries / backoff | Lease, heartbeat, crash recovery | LISTEN/NOTIFY vs poll | PgBouncer txn mode / Supabase / Neon pooler | Scale-to-zero DB | Dashboard | Local dev | Lock-in | Tenant isolation hooks | Cost, scenario (lib only) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **DBOS Transact** (+Conductor) | TS, Py, Go, Java | TS v5.3 2026-10-15; Py 3.3.0; Go 1.7.0; 86 commits 90d; top committer ~55% (kraftp) but a company team [52][4] | `delaySeconds`, durable `DBOS.sleep`, `recv` with timeout [2][11][10] | workflow ID = idempotency key; `deduplicationID` per queue; `return-existing` singleton [11][2] | **Partitioned queues**: `partitionConcurrency`, `partitionRateLimit` per key + global/worker limits + rate limit; runtime-reconfigurable [2] | `cancel`; durable timeouts cancel the workflow and its children; cooperative step preemption (v5.1) [2][4][11] | step retries (configurable) [11] | ownership token + zombie detection [14]. **Cross-executor recovery needs Conductor** or manual executor-ID mgmt [12][13] | LISTEN/NOTIFY for recv/events/streams (configurable); queues are polled [7] (inf on queue polling) | **Session mode only, not txn mode** [5][6]; Neon: disable pooling [web search excerpt, 6] | always-on process needed (min-instances=1) [8] | Conductor (paid, proprietary) [3][15]; OSS has no UI | yes, Postgres or SQLite [web search excerpt] | MIT core; Conductor client moved to proprietary `@dbos-inc/dbos-enterprise` in v5.3 [4][15] | partition key = account_id; system tables in `dbos` schema; app role can be least-privilege [5][9] | $0 OSS. Conductor Pro $99/mo includes 1M checkpoints, +$50/M → ~**$149/mo** if 2M polls are steps (inf) [3] |
| **pg-boss** | Node/Bun (SQL fns for others) | 12.38.0 2026-10-13; ≥100 commits 90d; **timgit ~85% of commits** [52][22] | `startAfter`; no in-process durable sleep (chain delayed jobs) [17] | `singletonKey` + queue policies (`singleton`, `stately`, `exclusive`, `key_strict_fifo`), throttle/debounce [17][19] | **`groupConcurrency` global per group with tiers** (DB-enforced, "may briefly exceed"); `localGroupConcurrency` [18] | `cancel`/`resume` pending or active [17] | retryLimit/Delay, exponential `retryBackoff`, `retryDelayMax`, DLQ + redrive [17] | `expireInSeconds` (default 15 min) + optional `heartbeatSeconds`; attempt-scoped settle (fencing by retryCount) [19][17] | polling (default 2 s) + optional NOTIFY wake; NOTIFY not via txn-mode PgBouncer, falls back to polling [20][18] | core works without LISTEN (inf: txn-scoped advisory locks only [21]); `transactional` workers hold a tx for the handler [18] | polling keeps the DB awake (inf) | `@pg-boss/dashboard` MIT [16][15] | yes; also PGlite in-process [21] | MIT, plain tables | `group.id` = account; no RLS on job tables (inf) | $0 |
| **Graphile Worker** | Node (SQL `add_job`) | v0.18.0 2026-09-08; 50 commits 90d; **benjie ~85%** [52][26] | `run_at` [25] | `job_key` replace / `preserve_run_at` / `unsafe_dedupe` (debounce/throttle) [24] | only named `queue_name` = **serial (concurrency 1)**; no N-per-group (inf from docs) [25] | `remove_job`, `permanently_fail_jobs`; a locked job cannot be removed mid-run [24][25] | fixed `exp(least(10,attempt))` s [25] | **crashed worker's jobs stay locked 4 h** in OSS; Pro ($25+/mo sponsor) adds crash recovery [25][23] | LISTEN on by default; future/retry jobs polled [25] | FAQ: PgBouncer "might" be an issue unless session mode [25] | polling (inf) | none in OSS (inf; not verified) | yes | MIT; Pro proprietary [23] | none built-in (inf) | $0 / Pro $25+/mo |
| **River** | Go; **full JS/TS client 0.2.0 (2026-10-07, Node 24/26)**; Rust; Ruby/Py insert-only [33][52] | Go v0.49.0 2026-10-05; ≥100 commits 90d; brandur + bgentry (2 core) [34][52] | `ScheduledAt`, `JobSnooze` [30][32] | unique jobs (OSS) [27] | **Pro**: concurrency limits partitioned by args (e.g. per customer) [27] | `JobCancel`, including running jobs via NOTIFY [32] | yes (retry policy) [52 tree] | rescuer after `RescueStuckJobsAfter` (default 1 h + timeout); Pro v0.26 "active job rescue" via heartbeats (2026-07-28) [30][31] | NOTIFY (Go/Rust/TS), poll-only option [29] | insert-only client OK in txn mode; running client needs direct/session [29] | polling (inf) | River UI (OSS) [27] | yes (Postgres or SQLite) [28] | MPL-2.0; Pro proprietary [27] | Pro partitions by tenant | $0 / Pro $125/mo [27] |
| **Absurd** (Ronacher, Earendil) | TS, Py, Go (experimental) [41] | 0.5.1 2026-10-20; **10 commits 90d; mitsuhiko ~95%**; pre-1.0 [52] | `sleepFor`/`sleepUntil`, `awaitEvent` with timeout [42] | spawn `idempotencyKey` [42] | **none**: flow control deliberately out of scope [42] | cancel API/CLI; `maxDuration`, `maxDelay` policies [42] | fixed/exponential/none [42] | time-limited claim (lease), `ctx.heartbeat()` extends it [42] | **poll only** (default 0.25 s) [42] | (inf) plain SQL functions, no LISTEN → likely txn-mode OK; not verified | polling every 0.25 s keeps DB awake (inf) | Habitat (Go web UI) [41] | yes | Apache-2.0; single `absurd.sql` [41] | queue-per-tenant possible (inf) | $0 |
| **pgmq** / Supabase Queues | SQL ext.; many clients [38] | v1.13.1 2026-10-20; 25 commits 90d; ChuckHend ~55%; repo moved from tembo-io → pgmq org [39][52] | `delay` on send, `set_vt` [38][39] | none (inf) | FIFO **message groups** (ordering, not N limits) [38] | delete/archive (inf) | none built-in; `read_ct` only (inf) | visibility timeout = lease [38] | poll (`read_with_poll`); insert notifications exist [39] | pure SQL (inf: txn-mode OK) | polling (inf) | Supabase dashboard [40] | yes (extension) | PostgreSQL license; SQS-like [38] | Supabase: RLS + API permissions on queues [40] | $0 (included with DB; not verified) |
| **Hatchet** (self-host / Cloud) | Go, TS, Py, Ruby | v0.110.8 2026-10-13; ≥100 commits 90d; 3+ core devs, VC-backed [52] | scheduled runs, durable sleep / wait-for-event (not verified this pass) | (not verified) | **concurrency keys (CEL) with GROUP_ROUND_ROBIN, dynamic per-key `max_runs`, multiple keys (account + provider)**, rate limits [45] | yes, plus cancel strategies [45] | yes (not verified) | engine-managed (not verified) | gRPC to engine; RabbitMQ optional [44] | engine owns its DB (inf) | engine always on | yes, bundled [44] | Hatchet Lite single image [44] | MIT [43] | engine "tenants"; Cloud 10 tenants on free tier [43] | Cloud: 1M runs/mo free, then $30/M [43] → **$0** if one long durable task per job (inf) |
| **Roll our own** | TS | n/a (bus factor = us) | `next_run_at` column | unique partial index | counters/`COUNT` under lock | flag + CAS | our code | `lease_until` + fencing token | poll 1–2 s + optional NOTIFY | yes if no LISTEN | polling (inf) | build it | yes | none | full control incl. RLS | $0 + eng time |
| *Refs:* Oban (Elixir, Py), Procrastinate (Py), Solid Queue (Rails) | — | Oban v2.24.0 2026-08-25; Procrastinate 3.10.0 2026-09-23 ("looking for additional maintainers"); Solid Queue v1.7.0 2026-08-21 [52][36] | yes | yes | Oban Pro (partitioning, global limits, $150/mo) [35]; Solid Queue `limits_concurrency` [37] | yes | yes | Procrastinate added worker heartbeat + stalled-job retry (3.x) [36] | Solid Queue polls [37] | — | — | Oban Web | yes | — | — | not our stack |

Other Postgres "Temporal-lite" engines seen in 2026: **OpenWorkflow** (TS, Postgres/SQLite, 0.11.0 2026-10-12, one main maintainer) [50]. **pgflow** (Supabase-centric, pgmq + edge worker, 0.17.2, 311 stars) [49]. **Vercel Workflow `world-postgres`**: its own README calls it a "reference implementation", it ships **without authentication** on its queue route, and the README says to clone and adapt it for production [51]. Temporal itself can run on Postgres, but it is a cluster, not "lite". Not evaluated further.

---

## 2. Per-option notes

### DBOS Transact (TS/Py/Go/Java) + Conductor / DBOS Cloud
- **Model:** a durable workflow made of checkpointed steps. A Job maps to one workflow whose ID = Job id, so starts are idempotent [11]. A `dataSource.runTransaction` step commits the user's domain changes **and** the DBOS checkpoint in one Postgres transaction ("exactly once") [9][11]. That covers the "state change + event in one commit" requirement for steps. Enqueue can also happen inside our own SQL via `dbos.enqueue_workflow(...)` from PL/pgSQL or a trigger [2], which gives a domain-write+enqueue outbox in one tx.
- **Timers:** `delaySeconds` / `setWorkflowDelay` (not_before) [2]. `DBOS.sleep` is durable and the wakeup time is stored [11]. `timeoutMS` is durable, start-to-completion, and cancels children (per-state deadline sweeper) [2][11]. `recv(topic, timeout)` lets a workflow wait for a webhook. `send(..., idempotencyKey)` gives exactly-once delivery from the webhook handler, which handles duplicate webhooks [10].
- **Fairness:** partitioned queues with partition key = account_id. Per-partition concurrency and rate limits combine with global/worker limits. Queue config lives in the DB and can be changed at runtime: `setGlobalConcurrency`, `setRateLimit` [2]. Only one partition key per queue. Per-provider × per-account needs one queue per provider, partitioned by account (inf).
- **Progress:** `setEvent`/`getEvent` and append-only **streams** (`readStream` with per-value timeout) can feed a server SSE endpoint [10].
- **Crash recovery:** a single server recovers all PENDING workflows on restart. Distributed self-hosting without Conductor requires executor IDs and manual recovery management [12]. Conductor declares an executor DEAD after a 60 s default timeout and re-assigns its workflows [13]. Ownership tokens stop zombie executors from double-writing outcomes, but steps stay at-least-once [14].
- **Poolers:** "Do not use a connection pooler in transaction mode" (LISTEN/NOTIFY) [5][6]. Use direct or session mode: Supabase session pooler port 5432 or direct [48], Neon direct (non-pooled) [6][47]. `useListenNotify:false` exists [7]. Whether that alone makes txn mode safe: **not verified**.
- **Hosting:** background services (scheduler, queue runner, recovery) need CPU at all times, so the docs say `--min-instances=1` with instance-based billing [8]. That means no app scale-to-zero.
- **2026 changes:** v5.0 (2026-09-16) split inputs/outputs into separate tables, removed in-memory queues/scheduler and the admin server, and changed retention [4]. v5.1 added workflow-ID reuse policies, cooperative step preemption on cancel, improved timeouts and dedup on partitioned queues [4]. v5.3 (2026-10-15) **moved the Conductor client into `@dbos-inc/dbos-enterprise`** under the "DBOS Conductor Software License" [4][15].
- **Pricing [3]:** Pro $99/mo (2 seats, 3 apps, 1M checkpoints, +$50/M). Teams $499/mo. Conductor self-host is Enterprise only. DBOS Cloud hosting is "contact sales" [3]. Pricing is not verified per-unit.
- **Tenancy:** checkpoints store workflow inputs and step outputs in `dbos` tables. Every tenant's data sits in one schema readable by the DBOS role, so keep payloads to IDs (inf). The DBOS role can be limited to the DBOS tables [5]. Domain RLS stays our job: e.g. `SET LOCAL` inside the datasource tx (inf, not verified).

### pg-boss (v12)
- Enqueue in an existing tx via `db` adapters (Drizzle, Knex, Kysely, Prisma) [16]. `transactional: true` workers run the handler and the job completion in one tx [18]. Long handlers should use `complete(..., {db})` instead, because long txns block vacuum [18].
- Delays: `startAfter` (absolute, relative or string) [17]. Polling with backoff fits the "re-enqueue next poll with `startAfter` in the same tx as the state update" pattern (inf). There is no durable in-process sleep.
- Exclusivity: queue policies. `exclusive` allows 1 queued or active per `singletonKey`; `stately` allows 1 per state; `key_strict_fifo` gives per-key FIFO [19]. Settling is attempt-scoped: a worker that lost its claim cannot complete the retry, which is effectively a fencing token [19][17]. `upsert` with `singletonKey` is concurrency-safe [17].
- Fairness: `groupConcurrency` is global and DB-enforced, with per-tier limits (`{default:1, tiers:{pro:2}}`). It "may be slightly exceeded" under races [18]. One group per job (inf), so treat it as a soft cap. A hard per-account spend cap must stay in our own atomic SQL.
- Leases: `expireInSeconds` (default 15 min) plus optional `heartbeatSeconds`. A dead worker is detected within one heartbeat [19].
- Poolers: polling by default (2 s). `useListenNotify` is optional, does not work through txn-mode PgBouncer, and falls back to polling with a warning [20][18]. Advisory locks are `pg_advisory_xact_lock` (transaction-scoped) [21], so txn-mode compatibility for the core is plausible (inf; **not verified**). The `@pg-boss/proxy` HTTP proxy exists for pooling and serverless use [16].
- 2026: v12 line with groupConcurrency tiers, `key_strict_fifo`, transactional workers, dashboard 1.12.1 and proxy 1.13.0 (2026-10-15), OpenTelemetry, PGlite backend [16][21][22]. Specific dates for each feature are not verified.
- Bus factor: one maintainer writes ~85% of commits [52].

### Graphile Worker
- `add_job` is a SQL function, so enqueue from SQL or triggers works in-tx (inf from [25]). `job_key` handles debounce and throttle. Updating a key while the job is locked schedules a **second** job and both run [24].
- Concurrency per group is limited to `queue_name` serialisation (1 at a time). There is no N-per-account limit [25].
- Crash: jobs stay locked **4 h** in OSS. Worker Pro ($25+/mo via sponsorship, proprietary) adds crashed-worker recovery [25][23]. That is a poor fit for ~30 min provider jobs unless we pay for Pro.
- Fixed backoff formula, no per-job custom backoff in the docs [25]. Its FAQ is vague on PgBouncer [25].
- 2026: v0.18.0 (2026-09-08) is ESM-only and drops cosmiconfig [26].

### River (Go, now JS/TS)
- Strong OSS core: `InsertTx` transactional enqueue, unique jobs, snooze, cancel (running jobs via NOTIFY), River UI [28][32][27].
- **Per-account concurrency limits, workflows and DLQ are Pro ($125/mo)** [27]. Whether River Pro features work from the new JS client: **not verified**.
- Rescue: the OSS rescuer waits `JobTimeout + RescueStuckJobsAfter` (default 1 h). A 30 min job is rescued after 1 h 30 m. Pro v0.26 (2026-07-28) adds heartbeat-based active rescue [31][30].
- PgBouncer: an insert-only client can use txn pooling. A running client needs direct or session [29].
- **2026 change:** full JS/TS client 0.2.0 on 2026-10-07. It needs Node 24+ (polyfill) or 26 [33]. That is very new for a TS shop.

### Absurd (Earendil / Armin Ronacher)
- Exists and is maintained. Pre-1.0 (0.5.1, 2026-10-20) and effectively one-person (~95% of commits; 10 commits in 90d) [52][41].
- Primitives: tasks, steps (checkpoints), retries, sleep, events (first emit wins, race-free), leases with heartbeat, cancellation including `maxDuration` and `maxDelay` (no checkpoint for N s) policies, spawn idempotency keys [42].
- Spawn can run on a caller-supplied connection inside a transaction [42], so a transactional enqueue is possible.
- **No concurrency limits, rate limits or fairness, by design** [42]. Admission caps would be bespoke.
- Pull-only polling (default 0.25 s) [42]. Web UI: Habitat [41].

### pgmq / Supabase Queues
- An SQS-like primitive: visibility-timeout lease, delay, archive, FIFO groups, topics [38][39]. **No** retries/backoff policy, dedup keys, per-group N-limits, timers beyond delay/`set_vt`, or dashboard beyond Supabase's [38][40] (inf for the absent items).
- It is a message transport, not a job engine. Everything in the lifecycle except "lease" is bespoke (inf).
- Supabase Queues adds RLS and API permissions for client-side consumers [40]. That only helps if browsers consume queues, which we do not want (inf).
- 2026: topic routing (v1.11, Feb), grouped reads with poll (v1.12, Jul), partition fixes (v1.13, Sep), lowercase-name notify fix (v1.13.1, Oct) [39].

### Hatchet
- The strongest built-in fairness model: multiple CEL concurrency keys per task (`input.account` and `input.provider` at once), per-key dynamic `max_runs` by tier, a tenant-scoped shared limit across workflows, and rate limits [45].
- **But** it is a separate engine (API + gRPC engine + its own Postgres, optional RabbitMQ) [44]. Enqueue is an RPC, **not in our DB transaction** (inf). We would still need our own outbox to trigger runs reliably, which loses the main premise of this category.
- Cloud: first 1M runs and 1M events free each month, then $30/M runs and $5/M events [43]. Exceeding free limits **drops tasks** [43]. The plan columns (backlog 10k tasks, 1-day retention on one tier) are ambiguous on the page.

### Roll our own (baseline)
The Job row is already a domain table with the state machine from the brief, so we need it regardless. What a library would otherwise provide, with my **estimate (inf)**:

| Piece | Mechanism | Rough size |
|---|---|---|
| Claim / lease / CAS | `UPDATE jobs SET state, lease_owner, lease_until, version=version+1 WHERE id=$1 AND version=$2` / `FOR UPDATE SKIP LOCKED LIMIT n`; fencing on `version` | ~100 LOC |
| Timers (poll backoff, not_before) | `next_run_at` + partial index; scheduler loop polls `next_run_at<=now()` every 1–2 s; optional NOTIFY | ~100 LOC |
| Deadline sweeper | per-state `deadline_at`; same loop moves expired rows to failed/retry, emitting an event | ~80 LOC |
| Retries/backoff + jitter | attempt counter, error class → retryable or not | ~60 LOC |
| Admission (per-account, per-provider) | `SELECT … FOR UPDATE` on `admission_counters(account_id/provider)` or `COUNT(*)` under `pg_advisory_xact_lock(hash)` in the claim tx | ~120 LOC, tricky to make fair |
| Outbox → SSE | `job_events` insert in the same tx; relay via NOTIFY/poll → SSE with `Last-Event-ID` | ~150 LOC |
| Circuit breaker | `provider_health` row (state, opened_until, failure window) updated in tx | ~80 LOC |
| Cancellation | `cancel_requested_at` checked at every CAS transition | ~30 LOC |
| Webhook dedup | `webhook_receipts(provider, delivery_id) UNIQUE` | ~40 LOC |
| Ops UI | SQL views + admin page | ~200 LOC |
Total is roughly 1–1.5k LOC plus a crash-window test suite. This is exactly the "bespoke machinery" the brief wants to avoid. Its advantage: full RLS / tenant control and PgBouncer txn-mode safety (no LISTEN needed).

---

## 3. Judgement against the brief's lifecycle (inf, based on cited features)

| Need | DBOS | pg-boss | Absurd | River (TS) | Graphile | Hatchet |
|---|---|---|---|---|---|---|
| Poll with backoff over ~30 min | loop of `sleep` + step; each poll = checkpoint | chain of `startAfter` jobs (re-enqueue in tx) | `sleepFor` loop | `JobSnooze` | re-`add_job` with `run_at` | durable sleep (not verified) |
| not_before | `delaySeconds` | `startAfter` | `sleepUntil` | `ScheduledAt` | `run_at` | scheduled runs |
| Per-state deadlines | durable `timeoutMS` (whole workflow) + `recv` timeouts; per-state = our code | `expireInSeconds` per attempt; per-state = our sweeper job | `maxDuration`/`maxDelay` | `JobTimeout` | our code | timeouts (not verified) |
| CAS / no double-submission | workflow ID idempotency + ownership token; steps still at-least-once | `exclusive` policy + attempt-scoped settle | idempotency key; at-least-once steps | unique jobs | `job_key` (locked → 2nd job!) | concurrency key max 1 |
| Outbox (state+event one commit) | yes, datasource txn step; PL/pgSQL enqueue | yes, `db` adapter / transactional worker | spawn in caller tx | `InsertTx` | SQL `add_job` | **no** (RPC) |
| Crash window "provider accepted, ref not stored" | **none solve it.** All re-run the step. Need a provider idempotency key or a pre-generated client ref stored *before* the call + a reconcile-by-ref step, else mark visible "unknown → failed" | same | same | same | same | same |
| Shared circuit breaker | none built in; runtime `setGlobalConcurrency`/`setRateLimit` can throttle a provider queue | none; our table | none | queue pause (inf) | none | rate limits only |
| Per-account / per-provider fairness | partitioned queue per provider, key=account | `groupConcurrency` (soft) per provider queue | **none** | Pro only | none | best |
| Crash recovery for ~30 min jobs | single node: on restart; multi-node: Conductor | heartbeat → seconds | lease + heartbeat | OSS 1 h+ / Pro fast | 4 h OSS | engine |

Constitution check: nothing here needs an amendment. "No state stuck forever" requires per-state deadlines in **every** option. Libraries give per-attempt or whole-workflow timeouts, not per-domain-state deadlines, so a small sweeper or deadline step remains (inf). That is a limitation with a fallback, not an amendment.

---

## 4. Deciding facts (for #74)
1. **Pooler mode:** DBOS requires direct or session-mode connections, not txn-mode [5][6]. pg-boss runs polling-only and degrades gracefully without LISTEN [20]. River's running client needs direct or session [29]. This decides whether workers can sit behind Supabase's txn pooler (6543) or Neon's pooled endpoint [48][47].
2. **Multi-instance crash recovery:** DBOS OSS has no automatic cross-executor recovery without Conductor (proprietary, $99+/mo; client moved to an enterprise package in v5.3) [12][13][3][15]. pg-boss heartbeats recover in seconds with no paid tier [19]. With 1 worker instance, DBOS restart recovery is enough.
3. **Built-in per-account fairness:** DBOS partitioned queues (hard, global, runtime-tunable) [2] vs pg-boss `groupConcurrency` ("may slightly exceed") [18]. Absurd and Graphile have none. River needs Pro [27].
4. **Outbox fit:** DBOS datasource transactions commit domain changes and the checkpoint atomically [9]. pg-boss enqueues and completes jobs inside our tx [16][18]. Hatchet cannot (RPC) [44].
5. **Long waits:** DBOS (`sleep`, `recv` + idempotent `send`) [10][11] and Absurd (`sleepFor`, `awaitEvent`) [42] model webhook-or-poll natively. Queue libs model it as chained delayed jobs.
6. **Always-on worker needed:** every option polls (DBOS docs say `min-instances=1` [8]). A polling worker keeps Neon from suspending (Neon suspends after 5 min idle [46]), so true DB scale-to-zero is out with any of them. Budget an always-on small worker plus DB.
7. **Bus factor:** pg-boss (~85% one person), Graphile (~85% one person), Absurd (~95% one person, pre-1.0) vs DBOS (company team, weekly releases) and River (2 core devs, company) [52].
8. **Checkpoint volume:** ~2M poll steps/month as DBOS steps means ~2M checkpoint rows/month. That needs retention/GC (v5.0 improved it [4]) and costs ~$149/mo if Conductor Pro counts them (inf) [3]. Polling as long sleeps between few steps cuts this.

**Dated shortlist (2026-10-21), not a recommendation:** DBOS Transact TS (± Conductor) and pg-boss v12 are the two in-DB TS options that cover the lifecycle with the least bespoke code. Absurd is a watch-item (fits durable waits; no fairness, pre-1.0, one maintainer). Roll-our-own is the baseline and fallback (~1–1.5k LOC). Hatchet only if the in-tx outbox is given up.

---

## 5. Limitations and fallbacks
- **Provider-accepted/ref-not-stored window:** no library closes it. Fallback: persist `submit_attempt_id` before the call; pass it as the provider idempotency key or metadata where supported; on recovery, reconcile by listing or looking up by that key. If the provider supports neither, mark the job `failed: submission_unknown` (visible) and do not resubmit automatically.
- **Per-state deadlines:** libraries offer whole-run or per-attempt timeouts. Fallback: a `deadline_at` column checked by a scheduled sweeper job or workflow (DBOS scheduled workflows, pg-boss cron).
- **Circuit breaker:** none built in. Fallback: a `provider_health` table read in the admission step. DBOS can also lower a provider queue's concurrency at runtime [2].
- **Spend caps:** keep them in our atomic SQL. `groupConcurrency`-style limits are soft [18].
- **Pooler:** if the platform only offers txn-mode pooling, give the worker a direct or session connection (Supabase session 5432 / direct, Neon non-pooled) [48][47]. The web tier can still use txn mode for enqueue-only paths (River insert-only [29]; pg-boss send (inf)).
- **RLS:** no option puts RLS on its own job tables. Fallback: job rows carry only `account_id` and the job id. The worker uses a dedicated role with rights on the queue schema plus `SET LOCAL app.account_id` for domain writes under RLS. Never use a BYPASSRLS/service-role identity for ordinary requests (inf).
- **Purge by account:** job and checkpoint payloads should hold IDs, not content. Then account purge = delete domain rows + `DELETE … WHERE account_id` on our tables + library retention for queue rows (inf).

## 6. Not verified / open
- DBOS with `useListenNotify:false` behind txn-mode PgBouncer/Supavisor. Exact DBOS queue polling interval.
- pg-boss core under Supavisor or PgBouncer txn mode (prepared statements, maintenance). Docs only cover LISTEN.
- Whether River Pro (concurrency limits) supports the JS client. River JS maturity (0.2.0, two weeks old).
- Graphile Worker dashboard availability. Absurd behaviour under txn-mode poolers.
- Hatchet durable sleep / wait-for-event / retry specifics and the exact Cloud free-tier column values (the page is ambiguous).
- Whether Conductor checkpoint metering counts every step of self-hosted apps. Supabase Queues pricing (assumed included).
- Neon docs now say "Lakebase Postgres computes" [46]. Rebrand implications (Databricks) are out of scope here.

## Sources (all accessed 2026-10-21)
1. https://github.com/dbos-inc (repo metadata via GitHub API)
2. https://docs.dbos.dev/typescript/tutorials/queue-tutorial
3. https://www.dbos.dev/pricing
4. https://github.com/dbos-inc/dbos-transact-ts/releases
5. https://docs.dbos.dev/production/checklist
6. https://docs.dbos.dev/faq ; https://docs.dbos.dev/integrations/neon
7. https://docs.dbos.dev/typescript/reference/configuration
8. https://docs.dbos.dev/production/hosting-with-cloud-run
9. https://docs.dbos.dev/typescript/tutorials/transaction-tutorial
10. https://docs.dbos.dev/typescript/tutorials/workflow-communication
11. https://docs.dbos.dev/typescript/tutorials/workflow-tutorial
12. https://docs.dbos.dev/production/workflow-recovery
13. https://docs.dbos.dev/conductor/distributed-recovery
14. https://docs.dbos.dev/explanations/concurrent-executions
15. https://www.npmjs.com/package/@dbos-inc/dbos-enterprise (license field) ; https://www.npmjs.com/package/@pg-boss/dashboard
16. https://github.com/timgit/pg-boss (README)
17. https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md
18. https://github.com/timgit/pg-boss/blob/master/docs/api/workers.md
19. https://github.com/timgit/pg-boss/blob/master/docs/api/queues.md
20. https://github.com/timgit/pg-boss/blob/master/docs/api/constructor.md
21. https://github.com/timgit/pg-boss/blob/master/docs/database-backends.md
22. https://github.com/timgit/pg-boss/releases
23. https://worker.graphile.org/docs/pro
24. https://worker.graphile.org/docs/job-key
25. https://github.com/graphile/worker/tree/main/website/docs (faq.md, error-handling.md, exponential-backoff.md, admin-functions.md, recovery.md)
26. https://github.com/graphile/worker/releases/tag/v0.18.0
27. https://riverqueue.com/pro
28. https://riverqueue.com/docs
29. https://riverqueue.com/docs/pgbouncer
30. https://riverqueue.com/docs/maintenance-services
31. https://riverqueue.com/blog/active-job-rescue
32. https://riverqueue.com/docs/cancelling-jobs ; https://riverqueue.com/docs/snoozing-jobs
33. https://github.com/riverqueue/river/tree/master/js (README, CHANGELOG) ; https://www.npmjs.com/package/riverqueue
34. https://github.com/riverqueue/river/blob/master/CHANGELOG.md
35. https://oban.pro/pricing
36. https://github.com/procrastinate-org/procrastinate (README; docs/howto/production/retry_stalled_jobs.md)
37. https://github.com/rails/solid_queue (README)
38. https://github.com/pgmq/pgmq (README)
39. https://github.com/pgmq/pgmq/releases
40. https://supabase.com/docs/guides/queues
41. https://github.com/earendil-works/absurd (README)
42. https://github.com/earendil-works/absurd/tree/main/docs (concepts.md, comparison.md, sdks/typescript.md)
43. https://hatchet.run/pricing
44. https://docs.hatchet.run/self-hosting
45. https://docs.hatchet.run/v1/concurrency
46. https://neon.com/docs/introduction/scale-to-zero
47. https://neon.com/faqs/postgres-services-built-in-connection-pooling
48. https://supabase.com/docs/guides/database/connecting-to-postgres
49. https://github.com/pgflow-dev/pgflow
50. https://github.com/openworkflowdev/openworkflow
51. https://github.com/vercel/workflow/tree/main/packages/world-postgres (README)
52. GitHub REST API: /repos/{r}, /releases, /contributors, /commits?since=2026-07-21 for all repos above
