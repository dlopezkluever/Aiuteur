# Aiuteur V2: Runtime Platform

Resolution of Wayfinder ticket #74. The trade-offs are recorded in [ADR 0017](../adr/0017-the-job-row-is-the-queue-on-plain-postgres-with-own-sse-progress.md). Inputs: the [job lifecycle](../domain/JOB-LIFECYCLE.md) (settled; this substrate implements it), the [module architecture](MODULE-ARCHITECTURE.md) (the ports and process roles this fills), the [business contract](../domain/BUSINESS-AND-OPERATIONS.md) (multi-creator isolation, server-held keys, BYOK-ready), the [Creator Ratification Record](../product/CREATOR-RATIFICATION-RECORD.md) (Record 1 M4 to M7), [Record 2](../product/CREATOR-RATIFICATION-RECORD-2.md) (P11, which moved the hosting default; see the last section) and the #73 research (note `docs/research/platform-and-execution-options.md` and five area reports on the throwaway branch `research/platform-execution`; facts dated 2026-10-21; items that research marked *not verified* stay unverified here).

Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). This document fixes **which platform, which execution substrate, which progress channel, and the rules that make restarts and duplicates safe**. It does not fix table or column shapes, the schema authority, row-level rules, media key layout or retention (Persistence, #72); the authentication product, secrets custody, error tracking, backups and CI (Operational baseline, #75); or numeric tuning (spec).

## 0. The decision on one page

| Need | Choice | Rejected (see §2) |
|---|---|---|
| Database | **Plain Postgres**, no vendor-specific feature (RT5); direct (non-pooled) connections for the worker, the event stream and migrations. **Current deploy choice (Record 2 P11):** run by the operator on the same VPS as the processes | Supabase as the platform. Managed Postgres (Neon, the original #74 choice with scale-to-zero off; PlanetScale, Railway or Fly Postgres) stays a valid later move with no code change |
| Object storage | **Cloudflare R2**, private bucket, per-Account and per-project key prefixes, signed URLs minted by `media.access` | Supabase Storage; S3 + CloudFront, Backblaze B2, Tigris as fallbacks; any managed video service |
| Hosting | **One plain Docker image, two process roles (`web`, `worker`), the worker long-running and stateless.** **Current deploy choice (Record 2 P11):** one VPS (for example Hetzner) running `web`, `worker` and Postgres as containers. This is a deploy choice, not architecture | Fly.io (the original #74 choice), Render or Railway stay valid later moves with no code change; Vercel, Cloudflare, Cloud Run, App Runner rejected |
| Durable execution | **The Job row is the queue.** An own scheduler on Postgres (`FOR UPDATE SKIP LOCKED`, leases, one due time per Job), behind the `Scheduler` port. No separate engine | DBOS Transact, pg-boss, Hatchet, Inngest, Temporal, Restate, Trigger.dev, Vercel, Cloudflare and AWS workflow products |
| Progress to the client | **Server-sent events from the `web` process, replayed from the Account's event table by `Last-Event-ID`**; the same query answers a bounded poll as fallback | WebSockets, Ably, Supabase Realtime, engine-native realtime, LISTEN/NOTIFY as the transport |
| Not decided here | The authentication product (#75). Better Auth, Clerk or WorkOS all fit; Supabase Auth is out with Supabase | |

Estimated hosting cost on the current default: **about $10 to $25 a month before provider bills** (Record 2 P11; an estimate, see the last section for a dated price check). The original Fly + Neon stack was estimated at the research scenario (5 creators, about 3,000 jobs a month) at Fly about $8 to $15, Neon about $21, R2 about $3, so roughly $35 to $40 a month, from the #73 price sheets.

**What is architecture and what is a deploy choice.** The execution substrate, the progress channel, the isolation rules and RT1 to RT6 are architecture and hold on any host. The host and the database operator are deploy choices: the VPS is the current one, and the portability rules (plain Docker image, stateless worker, plain Postgres, vendor SDKs only behind `BlobStore` and host configuration, RT5) keep Fly, Render, Railway and managed Postgres valid later moves without code changes. Where §§2 and 3 below name Fly or Neon, they record the comparison as #74 made it.

## 1. What the platform must satisfy

| Source | Requirement |
|---|---|
| Constitution §10.3, §16 principle 12, §17.5 | Generation runs in the background; the creator is told when it is ready or failed; failures are visible and retryable; reliable beats clever; nothing is "generating" forever |
| JOB-LIFECYCLE §1, §3, §7, §12 | Job durable before any provider call; compare-and-set transitions; leases; a deadline on every non-terminal state; scheduled, backed-off polling; recovery as a rule; a transactional outbox, at-least-once |
| JOB-LIFECYCLE §14, MODULE-ARCHITECTURE §14 | Durable timers, leases, webhook ingress with signature checks, an outbox, safe under restart and scale-to-zero, admission caps and fairness per Account and provider, inline claim for the text fast path, `Stream` delivery with replay, no workflow state in any process |
| BUSINESS-AND-OPERATIONS §6.3, S7, S8 | Atomic per-Account cap check in the creating transaction; a circuit breaker whose state every worker shares; per-Account and per-provider concurrency |
| Ratification Record 1 M4, Record 1 M5, Record 1 M7 | Isolation on every path including background work, events and storage; operator and creator keys decrypted only by us; each project separable and purgeable |
| #73 §1 | No engine replaces the lifecycle's own database guarantees or closes the accepted-but-unrecorded crash window |

## 2. Designs compared

Four complete stacks were worked through against the lifecycle's rules, multi-creator isolation, the crash window, cost and what a restart does. The comparison was made with Fly + Neon as the host for A, C and D; the choice of A does not depend on that host, and its hosting row and cost are superseded by Record 2 P11 (§0).

| | **A. Lean Postgres (chosen)** | **B. Supabase bundle** | **C. Postgres library** (DBOS Transact; pg-boss is its lighter variant) | **D. Managed engine on our compute** (Hatchet; Inngest, Temporal and Restate are the same shape) |
|---|---|---|---|---|
| Stack | Fly + Neon + R2; own scheduler in Postgres; own SSE | Supabase for database, auth, storage and Realtime; a worker on Fly or Render; pgmq or pg-boss | Fly + Neon + R2; DBOS workflows over a Job row; own SSE | Fly + Neon + R2; engine plus its own Postgres; own SSE |
| Where the state machine lives | **One place:** the Job row. The scheduler only finds due rows | Job row plus queue rows | **Two places:** the Job row and the workflow's checkpoints | **Two places:** the Job row and the engine's run state |
| Enqueue in the commit that creates the Job | Yes | Yes | Yes | **No.** An RPC, so an outbox relay and a start-if-missing sweeper are needed |
| Crash between "provider accepted" and "reference stored" | Lifecycle §7: write-ahead intent, Job-id key, lookup, else `submission_unconfirmed` | Same | **Unchanged.** Steps are at-least-once, so the same rule is still needed | **Unchanged** |
| Per-Account and per-provider fairness | In the claim transaction, exact (§4.3) | pg-boss `groupConcurrency` is soft; pgmq has none | Partitioned queues, hard, one key per queue | Strongest (several keys, round-robin) |
| Atomic cap check, circuit breaker, per-state deadlines | In the database, as in every option | Same | Not provided; a small table and a sweeper | Not provided; same |
| Multi-instance crash recovery | Any worker recovers any lease; no paid tier | Same | One node recovers on restart; **several nodes need Conductor** ($99 a month and up, proprietary client since v5.3) | Engine-managed |
| Isolation | Our row-level rules on our tables; worker acts under the Job's Account (§5) | The server credential bypasses row rules (V1's failure); bundled pieces invite the shared identity Record 1 M4 forbids | Checkpoint tables are one schema readable by one role; payloads must be ids only | Run payloads outside our database; ids only; per-tenant purge uneven |
| BYOK keys decrypted only on our servers | Yes | Yes | Yes | Yes (engines run our code) |
| Purge by Account or project | Delete our rows and keys | Same | Plus checkpoint retention | Plus engine retention |
| Extra vendors beyond host, database, storage | 0 | 0, but Supabase carries four roles | 0 (Conductor optional) | 1 |
| Cost | About $35 to $40 a month | About $27, plus $100 for point-in-time recovery | A, plus up to $99 to $149 | A, plus $0 to $200 |
| What we write | The scheduler, roughly 300 lines beyond lifecycle logic that every option needs, plus crash tests | Fewer lines; more bypass discipline | The same lifecycle logic, in workflow shape | The same, plus the relay |
| Verdict | **Chosen** | Rejected | Rejected; the named fallback if A's scheduler proves a burden | Rejected |

Also excluded without a full pass: **vendor-compute engines** (Trigger.dev Cloud, Vercel Workflows, Cloudflare Workflows), because prompts and BYOK keys would run on vendor machines (§3 fact 4) and Vercel, Cloudflare, AWS and Google offer no per-key fairness; **Cloud Run, App Runner and ECS**, for operational weight or closure (App Runner is closed to new customers); **Hetzner + Coolify** as the default, because we would own database backups and restore drills, which #75 should not inherit as a platform chore. *Superseded by Record 2 P11:* the creator chose a self-operated VPS as the default and accepted owning OS patching, Postgres upgrades, backups and uptime; the backup floor is OPERATIONAL-BASELINE §8.

### 2.1 Why not the shapes that look smaller

- **A library or engine does not shrink the hard work.** The #73 finding is that no engine owns compare-and-set, the outbox, per-state deadlines, the atomic cap check or the crash window. That is Job-row logic we write in every option. What an engine removes is only *finding what is due*: a claim query, a due-time index, a tick loop and an admission count. That is what A writes.
- **pg-boss under our Job row.** The Job row already carries its own due time, lease and state. A queue library adds a second row per Job to create, keep in step and purge, and its retry and expiry rules would fight the lifecycle's class-based retry. Its heartbeat recovery and its soft group limit are what A provides in a form we can test. pg-boss stays the fallback behind the same `Scheduler` port.
- **DBOS.** Durable sleep and wait-for-message are what A's due time and webhook receipt rows do. DBOS would make the workflow a second state machine and charge for multi-node recovery. Reconsider if distinct long workflows multiply well beyond the lifecycle's one.
- **Supabase.** Its default server credential bypasses row rules, which is V1's failure; its invite call creates the user when the invite is sent, not redeemed; Realtime replay is 25 messages per request; point-in-time recovery is $100 a month extra.

## 3. The deciding facts from #73, answered

| # | Question | Answer |
|---|---|---|
| 1 | Is a second state store acceptable beside Postgres? | **No.** Principle 12 and the lifecycle's atomic completion favour one transactional store. A second store needs a relay, a reconciliation sweeper and its own purge, and removes nothing the lifecycle needs |
| 2 | Native per-Account and per-provider fairness? | **Not needed natively.** With 1 to 50 invite-only creators it is a count inside the claim transaction (§4.3). The cap check must be a database transaction in any option |
| 3 | Direct or session connections for workers? | **Yes.** The worker, the event tail and migrations use direct connections. The web request path may use a pooler, because no code depends on session state (RT2) |
| 4 | Where may BYOK keys be decrypted? | **Only in our `web` and `worker` processes.** This excludes vendor-compute engines |
| 5 | Is Conductor-class recovery needed? | **No.** Any worker recovers any expired lease, so one always-on worker suffices and a second is safe |
| 6 | Supabase as the database? | **No.** Plain Postgres (#74 chose Neon; the current default is Postgres on the VPS, Record 2 P11), storage on R2, own SSE; authentication is #75's |
| 7 | Custom domain for private media? | **No.** Signed URLs on the storage host suffice for V2; signing on a custom domain needs a Worker or WAF rule on R2, deferred |
| 8 | VPS or PaaS? | #74 answered **PaaS (Fly)**, because self-operated backups are the cost of a VPS. **Superseded by Record 2 P11: one VPS is the current default**, the operator owns backups (floor in OPERATIONAL-BASELINE §8), and a PaaS stays a valid later move |
| 9 | Appetite for roughly 300 new lines of scheduler? | **Yes**, since the Job row's state machine must be written regardless |

## 4. The execution substrate

### 4.1 Process roles

One image and one module graph (ADR 0016), two process roles, each wired by its own composition root. Neither holds workflow state in memory.

| Role | Runs | Scale |
|---|---|---|
| **web** | `api` (commands, queries), the event stream, **webhook ingress**, the text fast path's inline claim, `views`; it also serves the CineBlock tab (Record 2 D61), which is a tab of the same application under the same session and Account, not a second app | 2 or more instances for zero-downtime deploys (on the VPS, two `web` containers) |
| **worker** | The scheduler tick (claim, then act); provider adapters (`submit`, `observe`, `cancel`, `lookup`, `fetch`); `media.put` (hash, probe with ffmpeg); local-work executors (export build, Segment assembly, still extraction); the outbox maintenance; reconciliation and release checks; breaker, price-refresh and alert upkeep, written through the `scheduler` functions of §5.1 | 1 long-running process in its own container (on any host, never scaled to zero for idleness); 2 or more is safe (§4.4) |

Nothing here relies on a platform's always-on machine feature: on the VPS the worker is an ordinary container restarted by the container runtime, and RT6 means a stopped worker costs only liveness. CPU-heavy local work may later move to a third process role of the same image with no other change.

### 4.2 The `Scheduler` port and the one due time

`jobs` owns the state machine; the `Scheduler` port only answers "which Jobs need attention now, exclusively". Every non-terminal Job carries one stored **due time**, recomputed in the same compare-and-set that moves it:

| State | Due time is the earliest of |
|---|---|
| waiting | none (woken by its dependency) |
| queued | `not_before` (backoff, deferral), the admission deadline |
| submitting, fetching, cancelling | lease expiry, the state deadline |
| running | next poll time (provider Jobs) or lease expiry (local-work Jobs), the state deadline |
| terminal, reconciliation open | next reconcile check, the reconcile deadline (JOB-LIFECYCLE §6.1) |
| `external_resource` in `releasing` | `release_due_at` (JOB-LIFECYCLE §6.1) |

A **lease** carries a fencing token and sets the due time to its own expiry, so an abandoned lease simply becomes due again.

**After a terminal state (decision, final audit #79 G-1).** The terminal state of a Job is absorbing and the claim never moves it. Reconciliation and handle release are not extra machines: they are the same due-time-and-lease mechanism applied to two more row shapes, a terminal Job whose `reconcile_due_at` is set and an `external_resource` whose `release_due_at` is set. The claim finds them like any due row, takes a lease with a fencing token, and returns a `work` tag (`step`, `reconcile` or `release`). Reconciliation and release submit no run, so they count against no admission cap. The rules (what is fetched, deadline, failed fetch, orphaned voice handles, retry of a failed provider-side delete) are JOB-LIFECYCLE §6.1; liveness is covered by the oldest-overdue signal of §7, because these are due times too.

```ts
interface Scheduler {
  // Inside the creating WriteTx: the Job is due now. (The fast path may then claim its own Job.)
  enqueue(wtx: WriteTx, job: JobRef): void
  // One tick. Returns leased work as ids only; payloads are read later under the Job's Scope.
  claim(max: number): Leased[]          // { subjectId (Job or external_resource), accountId, work: step | reconcile | release, stateSeen, leaseToken }
  extend(lease: Lease): boolean         // heartbeat for steps longer than a lease (fetch)
  release(lease: Lease, dueAt?: Instant): void
  wake(jobId: JobId): void              // webhook, cancel, "check now"
}
```

Real adapter: Postgres. Fake: in-memory over the injected `Clock` (virtual time), so deadlines, backoff and recovery run without sleeping. Two adapters make this a real seam, and both pass one conformance suite (#76).

**One tick.** Claim due Jobs, then act on the state *read at claim*: past the state deadline, fail with the deadline's reason; a `submitting` Job whose lease expired with no reference runs the lifecycle §7 recovery rule; otherwise do the step (submit, observe, fetch, cancel). Every effect is a compare-and-set on `(Job, expected state, lease token)`; zero rows affected means the lease was lost and the worker discards its result. The sweeper is not a second mechanism: a Job past its deadline is due, so the same claim finds it.

**Wake hints.** The creating transaction may `NOTIFY`; a worker on a direct connection may `LISTEN`. This only shortens latency. The floor is a 1 to 2 second tick, so correctness never depends on a notification (RT1).

### 4.3 Admission and fairness

Claim runs in one transaction under a single transaction-scoped advisory lock, so the counts it reads are exact and two claimers cannot both take the last slot. Inside it, a due `queued` Job is claimable only if the provider's circuit breaker is not open (S7, a shared row), the provider's in-flight count (submitting, running, cancelling) is below its cap, and the Account's in-flight count is below its cap. Among claimable Jobs the order is **least-loaded Account first, then oldest queued**: round-robin across Accounts and the stable reading order of JOB-LIFECYCLE §8 within one. Caps are configuration (S8, spec). The lock is held for milliseconds and serialises claiming, never running.

The spend cap is *not* here. It stays in the creating transaction (`spend.admit`, serialised per Account), where it must be.

### 4.4 Restarts and duplicate execution

The lifecycle fixes the rules; the platform's job is to make them hold when machines stop. Exclusivity is a **row lease with a fencing token, never a database session**, so a dropped connection, a Postgres restart (or a managed host's compute restart), a deploy or a crashed process costs only the lease interval.

| Failure | What prevents the harm |
|---|---|
| Two workers claim the same Job | `FOR UPDATE SKIP LOCKED` inside the serialised claim; the lease token fences every later write |
| A worker stalls, its lease expires, another takes over, the first wakes | The first's writes affect zero rows and are dropped. If it already called the provider, the Job-id idempotency key (where declared), lookup or reconciliation (lifecycle §6, §7) covers it |
| Crash after the provider accepts, before the reference is stored | The lifecycle's rule, unchanged by any platform: write-ahead intent committed first, Job-id key, lookup, else `submission_unconfirmed` and a visible one-click retry |
| Deploy sends SIGTERM | The worker stops claiming and releases or lets expire what it holds. The host's stop grace period (the container stop timeout on the VPS; `kill_timeout`, at most 300 seconds, on Fly) is set generously but **no correctness depends on it**, since every host's grace window is shorter than a 30-minute job |
| Fetch interrupted | The Job stays `fetching`; the re-run is idempotent (storage key from Job id, content hash checked) |
| The provider finishes after a timeout or cancel | The terminal Job's reconcile due time (JOB-LIFECYCLE §6.1) fetches and attaches the output as an unselected Attempt; nothing moves the Job |
| Webhook arrives twice, late, or after a terminal state | A receipt row unique on (provider, delivery id) drops the duplicate; the terminal compare-and-set drops the late one |
| Settlement runs twice | Attachment is unique per Job; actual cost is set, never added |
| Event delivered twice | Consumers are idempotent by event id (build rule R13 (MODULE)) |
| Postgres restart, failover or compute restart | Connections drop; no state was held in a session; the next tick resumes |
| The `worker` role is down | Nothing is lost and no state is wrong; progress stalls until it returns. The alert is the oldest overdue due time (§7) |

A `web` instance that dies during an inline fast-path claim is the same case as a stalled worker.

### 4.5 Webhook ingress

Hosted in `web`, authenticated by the adapter's signature check (and an unguessable per-Job callback parameter where the provider supports one), not by session. The handler verifies the signature, inserts the receipt, finds the Job by operation reference or the echoed Job id, and calls `wake(jobId)`. **It never settles.** The worker's normal `observe` step does, so there is one path to a terminal state, and a lost or spoofed webhook can at worst cause an early poll. The handler rebuilds the Scope from the Job's Account (§5) and returns 2xx quickly.

### 4.6 Cancellation, the text fast path, local work

- **Cancel** is a compare-and-set to `cancelled` (not yet submitted) or `cancelling`, plus `wake`; the worker sends the provider cancel. The creator sees *Cancelled* at once.
- **Fast path.** `web` calls the same `claim` for its own Job by id. If it dies mid-call the lease expires and a worker finishes; a trivial text rerun is allowed by lifecycle §5.3.
- **Local work** (export build, Segment assembly, still extraction, voice-over mux, duplicate copy, purge) is the second executor family: Jobs of class `local` (JOB-LIFECYCLE §2.2, decision #79 G-2), the same leases and deadlines, run by `worker` over `media` operations with no provider contact. They never pass the provider circuit breaker or the provider and Account in-flight caps of §4.3; a separate local-work cap (spec value) bounds CPU.

## 5. Account isolation in the runtime

The data-layer enforcement (forced row-level rules on every table, a non-owner application role) is #72's. The runtime guarantees the following, and #72's mechanism must support it.

| Rule | Detail |
|---|---|
| **Three database identities** | `owner`, for migrations only, never present in a running process. `app`: non-owner, no bypass, every transaction opened by setting the Account for that transaction only. `scheduler`: can execute only the narrow claim, wake and outbox functions, which return **ids and Account ids, never tenant content**. There is no superuser or service-role identity on any request, worker or webhook path |
| **Background work acts as its Account** | A tick turns a `Leased` item into a Scope and opens an `app` transaction for it. Webhook handlers and the outbox maintenance do the same |
| **Cross-Account state** is limited to what must be shared: the provider circuit breaker, the operational overlay, price entries and operator alerts, held in operator-scoped tables with a named owner and write path (§5.1). In-flight counts are not stored: the claim function counts job rows inside its transaction. None carries creative content |
| **Events** carry ids, types and states, never prompts, media or keys, and are read only by the owning Account's stream |
| **Operator** reads content-free views through a separate read-only role (#75) |
| **Keys** (operator and BYOK) are decrypted only inside `web` and `worker` (§3 fact 4); the custody mechanism is #75's |

### 5.1 Operator-scoped state (decision, final audit #79 G-3a)

**Decision.** State shared across Accounts lives in a closed set of **operator-scoped tables** with no `account_id` and no creative content, read by `app` and the claim, and written only through definer functions that take codes, ids and numbers. *Rejected:* letting `app` write them under a special Account (breaks forced row rules and the cross-Account refusal test) and an Account-less service role (a bypass identity, forbidden by ADR 0021).

| State | Owner module | Write path |
|---|---|---|
| Provider circuit breaker (state, opened at, probe) | `providers` | After a Job's settling commit, the worker calls the `scheduler` function `breaker_record(provider, outcome code)`. It is rebuilt by the next outcomes if a write is lost. The operator's "clear breaker" is `breaker_clear`, run as `operator_act` |
| Operational overlay (Offering status, enablement, ranking) with its append-only change stream | `providers` | Operator actions: `operator_act` functions. Drift detection: the `scheduler` function `overlay_suspend`, which can only suspend (F5) |
| Price entries | `spend` | Insert-only, dated: refresh through the `scheduler` function `price_insert`. Published entries are reviewed data by migration |
| Operator alerts and their acknowledgement | `accounts` | The worker's checks call `alert_raise` (`scheduler`, de-duplicated while open); an operator acknowledgement appends an `alert_ack` row through `operator_act`, which also writes the content-free audit event |
| Per-Account event counter | `history` (the outbox) | A tenant cell under forced row rules, written by `app` as the last write before commit (§6) |
| In-flight and claim counts | none | Derived by counting job rows inside the claim transaction; never stored |

`operator_act` is a sixth narrow identity beside those of ADR 0021: execute-only on the operator-action functions, reachable only from operator endpoints that already require the operator capability and second factor (OPERATIONAL-BASELINE §2.3). Every function validates its inputs against closed vocabularies and writes no content. The closed list of writable cells and these tables are in PERSISTENCE-AND-MEDIA §3 and §6.5; the rest of `app` stays read-only on them.

## 6. Progress delivery

```diagram
 history.commit / jobs.transition ──(same tx)──▶ events(account, seq, type, ids, state)
                                                          │ NOTIFY (hint only)
   browser ◀── SSE: id:<seq>, event, data ◀── web: tail events where account = session's and seq > cursor
      │  EventSource reconnects with Last-Event-ID = last seq ──────────────┘
      └─ fallback: GET /events?after=<seq> (bounded poll), same query
```

- **Source.** The outbox of MODULE-ARCHITECTURE R13 *is* the stream: one per-Account event table written in the transaction that causes the event (`job.state_changed`, `generation.*`, `batch.settled`, history and notice events). There is no second pipeline.
- **Ordering.** Each event takes the next number of its **Account's own counter**, assigned as the last write before commit under the Account row lock. Numbers are gap-free and commit-ordered per Account, so `Last-Event-ID` replay can never skip an event that committed late (a plain global sequence can). The cost is that one Account's event-emitting commits serialise briefly, acceptable for isolated invite-only Accounts and the first thing to revisit (§9).
- **Delivery.** `web` authenticates the session, resolves the Scope, streams `seq > Last-Event-ID` for that Account only, then tails new rows (optional hint, floor a 2 second poll). A keep-alive comment every 15 to 25 seconds and a server-chosen close before host caps (Railway 15 minutes, Cloud Run 60 minutes) make reconnects routine; `retry:` sets the delay.
- **Replay and resync.** Events are kept long enough to cover ordinary offline gaps (spec value). A client whose cursor is older than retention drops its state and refetches the read models. The stream carries **hints and statuses; read models are truth** (MODULE-ARCHITECTURE §4), so a missed or duplicate event cannot make the UI wrong.
- **Fallback.** `GET /events?after=` returns the same rows. The client polls it only when SSE cannot connect, pauses while the tab is hidden, backs off to a ceiling and resyncs on focus. This replaces V1's unbounded 2 to 3 second polling.
- **Notifications.** "Ready" and "failed" (Constitution §10.3) are creator-facing consumers of the same events, coalesced for batches per lifecycle §12; the unread-failure inbox is a read model over durable Generation outcomes plus a per-creator read pointer; events are only hints to refresh it, because settled outbox events are pruned (PERSISTENCE-AND-MEDIA §9.1).
- **Why not WebSockets or a vendor.** Traffic is server to client and commands are ordinary requests. SSE gives reconnect and `Last-Event-ID` natively, adds no vendor and works under every host cap. Ably would still need our event table for gaps beyond its resume window; Supabase Broadcast replays 25 messages per request.

## 7. Observability the platform must provide

Tools (error tracker, log sink, dashboards) are #75's. The runtime guarantees that the **signals exist and carry no content**:

1. **Truth is queryable.** Job states, due times, leases and the event table are the audit. "What is running for whom" is a query, and the operator view is content-free.
2. **Correlation.** Every log line, provider call (as metadata or idempotency key where accepted) and event carries the Job id, Generation id and Account id; never a prompt, a key, a signed URL or another Account's content.
3. **The liveness signal is the oldest overdue due time.** If a due Job stays unclaimed past a threshold, the scheduler or the whole worker role is not working: alert. It also catches a stuck deadline, because deadlines are due times.
4. **Per-state counts and ages** (queued age, running count per provider, `fetching` time to expiry, unreconciled maybe-billed runs) feed the S10 alerts.
5. **Lag figures:** poll lateness, outbox-to-stream delay, claim duration.

## 8. Rules the build enforces

| # | Rule | Enforced by |
|---|---|---|
| RT1 | The Job row is the only queue. No second queue or engine; all exclusivity is a row lease with a fencing token; notifications are hints | Import check (no queue or engine dependency outside the `Scheduler` adapter); a virtual-time test that kills a worker mid-step with notifications disabled and expects recovery |
| RT2 | No code depends on session state: tenant context is transaction-local, no session advisory locks, no `SET` without `LOCAL`, no reliance on prepared statements, `LISTEN` only in the wake adapter on a direct connection | Lint on `pg_advisory_lock(`, bare `SET`, `LISTEN` |
| RT3 | Background work rebuilds Scope from the Account on the Job or event; the `scheduler` identity reads ids only; no superuser or service-role identity at runtime | Role grants checked in CI; the two-Account harness (#76) run through the worker and webhook paths |
| RT4 | Events carry ids and statuses, not content | Schema test on the event type |
| RT5 | No vendor-specific database or host feature (branching, pg_cron, pgmq, platform queues, platform private networking or machine APIs; on a managed host such as Neon, its Data API and roles created through its console, API or CLI, which Neon gives BYPASSRLS; on every host roles are created only by SQL migration, see PERSISTENCE-AND-MEDIA.md) at runtime; vendor SDKs live only in platform adapters (`BlobStore`, host configuration) | Import-boundary check |
| RT6 | A commit's correctness never depends on the worker being up; only liveness does | Conformance test: stop the worker, run commands, restart, assert state |

## 9. Reversal triggers

| If | Then |
|---|---|
| The scheduler grows beyond the claim, due-time and admission logic (many distinct long workflows, not the one lifecycle) | Adopt DBOS Transact behind the `Scheduler` port, or pg-boss for the claim primitive; the Job row stays |
| One Account's event-emitting commits contend on its counter | Move to commit-horizon cursors (a transaction-id safe read position) without changing the stream protocol |
| Operating Postgres on the VPS (upgrades, backups, uptime) outgrows the operator, or the machine's capacity is reached | Move the database to managed Postgres (Neon, PlanetScale, Railway or Fly Postgres) by dump and restore; nothing at runtime depends on a host feature (RT5) |
| The VPS or its provider proves unreliable | Another VPS provider, or Fly, Render or Railway; the image is plain Docker and the worker is stateless |
| Hundreds of concurrent streams strain the event tail | One shared tail per `web` instance with fan-out; then a managed channel for fan-out only (the events table stays the replay source) |
| Projects reach low terabytes, or ZIP exports dominate egress | Re-price storage (Backblaze B2, Tigris, S3); the `BlobStore` port is S3-shaped |

## 10. Not decided here

Schema and migrations, the row-level rule mechanism, media key layout, content addressing against purge, retention and garbage collection (#72); the authentication product, secrets custody, error tracking, backups and restore drills, CI and environments (#75); lease length, tick interval, caps, deadline tuning, event retention and plan sizes (spec).

## 11. Hand-offs

| Ticket | Receives |
|---|---|
| **Persistence and media storage** (#72) | The runtime needs a relational transactional store with `FOR UPDATE SKIP LOCKED`; forced row-level rules for the `app` role and the `scheduler` identity of §5; a per-Account event counter and event table; receipts unique on (provider, delivery id); a Jobs store with one due time and lease token per Job; direct connections for the worker; R2 as the object store behind an S3-shaped `BlobStore` port with project-separable prefixes. Vendor and plan are recorded here; schema, key layout, content addressing against purge, retention and garbage collection remain #72's |
| **Operational baseline** (#75, resolved in [`OPERATIONAL-BASELINE.md`](OPERATIONAL-BASELINE.md)) | Authentication candidates narrowed (Supabase Auth out; Better Auth, Clerk, WorkOS remain; the invite flow is the `accounts` seam); the three database identities; keys decrypted only in `web` and `worker`; the §7 signals and the oldest-overdue alert; the operator-owned backups the VPS default implies (Record 2 P11, P12); the §9 exit paths |
| **Build sequence** (#77) | The platform to stand up first (one VPS running `web`, `worker` and Postgres as containers, R2, and the backup floor of OPERATIONAL-BASELINE §8); the scheduler and the event tail as early tracer-bullet pieces, since the first Job end to end exercises both |
| **Verification** (#76, resolved in [`VERIFICATION-AND-OBSERVABILITY.md`](VERIFICATION-AND-OBSERVABILITY.md); the signals of §7 are tier A, and the AI trace is the Generation record) | RT1 to RT6; the `Scheduler` fake and shared conformance suite; kill-a-worker-mid-step tests on virtual time; duplicate, late and out-of-order webhooks; stream replay after reconnect; two-Account runs through worker, webhook and stream |
| **Providers** (#66) | Webhook signature verification is an adapter capability; adapters receive credential handles and never read global keys |

## 12. Constitution check

No requirement was found unworkable or contradictory; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** The job lifecycle is implemented unchanged: durable Job first, a deadline on every state (as due times), compare-and-set with fencing, scheduled backed-off polling, recovery as a rule, atomic completion and the outbox. §10.3 and §17.5 hold because every failure produces an event and no state can strand when a machine stops. Principle 12 is met by one store, one queue, one stream and no engine. §18.4 is met by private storage behind `media.access`. Record 1 M4 to M7 are met by §5 and by choosing no platform whose ordinary credential bypasses isolation.

## Record 2 amendment (Record 2 P11): hosting default

The creator reopened the hosting choice. **Default target: one VPS** (for example Hetzner) running the web process, the worker and Postgres, with **Cloudflare R2** kept for private media; estimated about $10 to $25 a month before provider bills (unverified). This replaces Fly.io + Neon, #74's original choice (about $35 to $40 a month), as the default; Fly, Render, Railway and managed Postgres remain valid later moves without code changes. **Portability is a requirement:** plain Docker images, a stateless worker, plain Postgres with no vendor-specific database or host feature (RT5 stays in force), and vendor SDKs only behind platform adapters (`BlobStore`, host configuration). The operator accepts owning OS patching, Postgres upgrades, backups and uptime. The body above states the VPS as the current deploy choice; Fly and Neon appear where they record #74's comparison or a later alternative.

*Price check, 2026-10-23 (audit research, not re-verified here):* the estimate is plausible against Hetzner's EU list prices that day (CX33, 4 vCPU and 8 GB, €8.99 a month; CX43, 8 vCPU and 16 GB, €16.49 a month; both including IPv4, excluding VAT) plus R2 at $0.015 per GB-month with free egress. US locations cost several times more, and Hetzner listed shared types as currently unavailable that day. It remains an estimate; re-check at build time.
