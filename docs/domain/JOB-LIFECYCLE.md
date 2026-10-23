# Aiuteur V2: Generation Job Lifecycle

Resolution of Wayfinder ticket #67. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md); Generation, Job, Attempt, Slot and Media come from the [domain model](DOMAIN-MODEL.md) and [ADR 0001](../adr/0001-revisions-attempts-generations-jobs.md); the trade-offs decided here are in [ADR 0006](../adr/0006-job-lifecycle-durable-runs-and-bounded-spend.md). This document is provider-neutral and substrate-neutral: it says what states exist and what must hold, not which queue, workflow engine or database carries them (Runtime platform, #74; module boundaries, #71). It contains no tables, columns or endpoints.

## 1. Rules

1. **A Job is one run.** A Generation has one or more Jobs. A **retry** is a new Job of the same Generation; a **regeneration** is a new Generation (ADR 0001). Nothing creative lives in a Job.
2. **Every Generation runs as Jobs through one state machine**, text or media, inline or long. A quick text action takes the fast path (it skips polling and fetching) but still has a Job, so its failure is visible and retryable like any other.
3. **Durable first.** A Job exists, with its state, before any provider is called. No state lives only in memory or in a browser. What the UI shows as "generating" is derived from a non-terminal Job, never stored separately on a Shot or Frame (V1's frame stuck "generating" forever, legacy 12 §12).
4. **Every non-terminal state has a deadline** and a sweeper that enforces it. Nothing can be "generating" forever (Constitution §10.3, §17.5).
5. **Terminal states are absorbing.** A transition is a compare-and-set on (Job, expected state, lease). A late, duplicate or out-of-order signal (webhook, poll result, worker that lost its lease) is recorded and ignored; it never moves a terminal Job.
6. **Provider-neutral.** The lifecycle consults an adapter's declared capabilities (§9); it never branches on a vendor name.
7. **Spend is the creator's.** Automatic action (retry, reconciliation, staleness) never creates a billable provider run the creator has not already covered (§5). The only Generations created without a click are ratified automatic text operations such as the initial shot-plan draft (Record 2 D60.5), which the spend rule classifies like any other Generation ([`BUSINESS-AND-OPERATIONS.md`](BUSINESS-AND-OPERATIONS.md) §3); nothing automatically creates a media Generation (Record 2 X8).

## 2. Job states

```diagram
                      ┌─────────┐ dependency met ┌────────┐ ◀──── deferral: provider refused
        batch member  │ waiting │───────────────▶│ queued │       before accepting (429/503),
                      └────┬────┘                └───┬────┘       not_before = backoff
                           │                         │ claim (lease)         ▲
                           │                         ▼                       │
                           │                   ┌────────────┐───────────────┘
                           │                   │ submitting │ intent committed first;
                           │                   └─────┬──────┘ idempotency key sent
                           │                         │ provider accepted; operation reference stored
                           │                         ▼
                           │                   ┌─────────┐  poll (always) / webhook (where offered)
                           │                   │ running │
                           │                   └────┬────┘
                           │                        │ provider reports done
                           │                        ▼
                           │                   ┌──────────┐  persisted + verified + attached
                           │                   │ fetching │─────────────────────────▶ ┌───────────┐
                           │                   └──────────┘                           │ succeeded │
                           │                                                          └───────────┘
   ┌───────────┐           │      creator cancels, any non-terminal state
   │ cancelled │◀──────────┴──────── (after the provider was contacted: via cancelling) ──┐
   └───────────┘◀──────────────────── ┌────────────┐ ◀────────────────────────────────────┘
                                      │ cancelling │
                                      └────────────┘
   any non-terminal ── provider failure / deadline / unrecoverable ──▶ ┌────────┐
                                                                       │ failed │  class, reason, billed
                                                                       └────────┘
```

| State | Meaning | Provider contacted? | Leaves by | Deadline (default; an adapter may tune) |
|---|---|---|---|---|
| **waiting** | A batch member whose inputs depend on another member's output (§8). Not yet runnable. | No | Dependency succeeded → queued. Dependency failed or cancelled, or creator cancels → cancelled (`upstream_failed`, no cost). | None of its own; the batch settles when no member can progress. |
| **queued** | Durable, runnable, waiting for a worker, for `not_before` (backoff, rate-limit deferral) or for capacity. | No | A worker claims it → submitting. Cancel → cancelled. | Admission deadline 60 min → failed (`queue_timeout`, unbilled, transient). |
| **submitting** | A worker holds a lease and is sending the request. A write-ahead **submission intent** (Job id, idempotency key) was committed *before* the call. | Yes | Provider accepted and the operation reference is committed → running. Provider refused before accepting (429, 503, connection refused) → queued (a *deferral*, §5.1). Fast path: result returns synchronously → fetching (media) or succeeded (inline text). | 2 min, then recovery (§7). |
| **running** | Provider accepted; the **provider operation reference** is stored. Completion is awaited by webhook where offered and by scheduled polling always. | Yes | Provider reports done → fetching. Provider reports failure → failed. Deadline → failed (`timed_out`). | By kind: text 2 min, image 5 min, audio 10 min, video 30 min, export build 30 min. |
| **fetching** | The provider has output. Aiuteur is copying it into its own private media storage and verifying it (§10). Never skipped for media. | Download only | Persisted, verified and attached (§11) → succeeded. Download failure → retried *free* (no new run) until the retention deadline, then failed (`output_lost`, billed). | min(10 min, half the adapter's declared output-retention window). |
| **cancelling** | The creator cancelled after the provider was contacted. We are asking the provider to stop, or confirming it did. | Possibly | Provider confirms, or the adapter cannot cancel → cancelled. | 5 min, then → cancelled with `billing: maybe`. |
| **succeeded** | Terminal. Media persisted and verified; outputs attached; cost recorded. | – | – | – |
| **failed** | Terminal for this run. Carries a **failure class** (§5), a **reason**, and `billed`: *no*, *maybe* or *yes*. A timeout is `failed` with reason `timed_out`. | – | A new Job may follow (§5). | – |
| **cancelled** | Terminal. Carries `billing`: *none* (never submitted, or provider confirmed no charge), *maybe*, or *yes*. | – | – | – |

There is no `retrying` Job state. "Retrying" is what the **Generation** shows while its last Job is `failed` and an automatic next Job is `queued` with a `not_before`.

### 2.1 Generation outcome and creator-facing labels

A Generation's outcome is derived from its Jobs and stored when it settles.

| Generation outcome | When | Creator sees |
|---|---|---|
| In progress | Any Job non-terminal, or an automatic retry is scheduled | *Waiting* (waiting, queued), *Generating* (submitting, running), *Finishing* (fetching), *Retrying* (next Job scheduled), *Cancelling* |
| Succeeded | A Job succeeded and ≥1 output attached | *Ready*. If fewer outputs than requested came back, the shortfall is stated ("2 of 4 frames") |
| Failed | The last Job failed and no further Job is scheduled | *Failed*, with the plain reason, whether you were charged (*no*, *possibly*, *yes*) and a **Retry** control (§5) |
| Cancelled | The creator cancelled, or a batch dependency made it unrunnable | *Cancelled* |

A Generation keeps a compact **run history** (per Job: reason, failure class, billed, timing) so that pruning Jobs (domain model §5) never loses the answer to "why did this fail twice before it worked, and what was I charged?".

## 3. Transitions in full

Every transition is a compare-and-set and emits an internal `job.state_changed` record. Workers hold a **lease** on a Job while they act; a lease that stops being renewed is recoverable by anyone (§7).

| From → To | Trigger | Guard / effect |
|---|---|---|
| (new) → waiting / queued | Generation created by a creator action (§4) | Job and Generation committed together. Waiting if it depends on a batch member. |
| waiting → queued | Every upstream dependency succeeded | Inputs bound now (§8). |
| waiting → cancelled | Upstream failed or cancelled; creator cancel | `billing: none`. |
| queued → submitting | Worker claims; `not_before` passed; capacity available | Lease taken; submission intent written. |
| submitting → queued | Provider refused *before accepting*: rate limit, overload, connection refused | Deferral: same Job, `not_before` by backoff and any `Retry-After`. Counts against the admission deadline, not the retry cap. |
| submitting → running | Provider accepted | Operation reference stored in the same commit as the state change. |
| submitting → failed | Rejected as invalid, unsafe or unauthorised; or unrecoverable (§7) | Class per §5. |
| running → fetching | Provider reports done (webhook or poll) | Only one signal wins the compare-and-set. |
| running → failed | Provider reports failure; deadline passed | `timed_out` also attempts a provider cancel and starts **reconciliation** (§6). |
| fetching → succeeded | Bytes in private storage, verified, hash and probe recorded; outputs attached | One transaction (§11). |
| fetching → failed | Retention deadline reached with no successful fetch | `output_lost`, billed *yes*. |
| any non-terminal → cancelled (via cancelling once the provider was contacted) | Creator cancels (§6) | Before submission: straight to cancelled. |
| any non-terminal → failed | Lease lost and recovery impossible (§7) | `submission_unconfirmed`, or per class. |

## 4. Idempotency and duplicate prevention

V1's keys ended in `Date.now()`, so they never matched and a double click made a second paid call (legacy 12 §9). V2 has four layers.

| Layer | Rule |
|---|---|
| **Creator action** | The client mints an **action id** when it opens the confirm/spend step for an intent and keeps it until the creator leaves that step. Creating Generations for an action id is idempotent: the same (action id, target, member index) returns the Generation that already exists. A double click, a repeated request after a lost response, or a second tab with the same open dialog cannot create a second Generation. Keys are never time-derived. |
| **Deliberate repetition** | Pressing Generate again later, even with identical inputs, is a new action id and a new Generation (ADR 0001). To catch an accident, the server compares an **input fingerprint** (target Slot plus exact inputs): if another Generation with the same fingerprint is still in progress, creation is refused with "this is already generating" and proceeds only with the creator's explicit "generate another". The decision stays with the creator; only the accident is blocked. |
| **Run submission** | The provider key is derived from stable ids: the Job id. A re-send of the *same* run after a crash reuses it; a *new* Job gets a new key. It is sent as an idempotency key or request token wherever the adapter declares support. Where none exists, the Job id also goes into whatever correlation field the provider echoes (metadata, webhook parameter) so a stray result can be matched back. |
| **Completion** | Webhook and poll results are idempotent on (operation reference, event id): the terminal compare-and-set admits one winner, duplicates are discarded. Webhook signatures are verified; webhooks are accelerators and polling always remains the fallback. Attachment is unique per Job; actual cost is **set** once on settlement, never accumulated from repeated reads (V1 added the cost again on every poll; legacy 12 §11.3). |

A Generation is never created without a Job, nor a Job without its Generation; both are committed together before any provider call.

## 5. Retry classification and spend

### 5.1 Two things that look like retry

- **Deferral** (submitting → queued): the provider refused before accepting, so nothing ran and nothing was billed. Same Job, backoff with jitter, honouring `Retry-After`. Bounded only by the admission deadline. Always automatic.
- **Retry** (a new Job): a run was accepted and then failed. Governed by the table below.

### 5.2 Classes

`billed` is what the adapter knows or declares for the failure: *no* (provider guarantees no charge), *maybe* or *yes*. Anything unknown is *maybe*.

| Class | Examples | `billed` | Automatic retry | Creator **Retry** |
|---|---|---|---|---|
| **Transient, unbilled** | Provider reports "failed, not charged"; provider 5xx after acceptance that the adapter declares unbilled | no | **Yes**, new Job, up to the cap | Offered when the cap is hit; "not charged" |
| **Transient, maybe billed** | Timeout; connection lost after acceptance; provider "internal error" after work began; unconfirmed submission (§7) | maybe | **No**, unless a further run is below the trivial threshold (§5.3) | Offered with estimate and "you may have been charged" |
| **Output retrieval** | Download or verification failed after the provider finished | n/a (run done) | Free: the same Job stays in `fetching` and retries; no new run | – |
| **Output lost** | Fetch never succeeded within the retention window | yes | No | Offered as a new run, with cost |
| **Permanent: input** | Invalid or unsupported parameters, reference rejected, unsupported duration or aspect | no / maybe | **Never** | "Edit and retry" only; an unchanged repeat is a plain regeneration the creator chooses |
| **Provider safety refusal** | Content-policy block on the prompt, a reference or the output | adapter-declared; default *maybe* | **Never** | "Edit and retry"; the provider's reason is shown as given, never reworded. The creator decides whether to alter content. |
| **Platform configuration** | Credentials invalid or revoked, provider account out of funds or quota, model retired by the provider | no | **Never** (it would fail identically) | Told plainly that it is a platform problem, not their content; Retry once fixed; the operator is alerted (#75, #68) |
| **Unknown** | Unclassifiable error | maybe | **No** | Offered with the maybe-billed wording |

The adapter owns classification: it maps provider errors to these classes and declares `billed`. A missing or unrecognised mapping falls to *Unknown*, never to "retry". V1 retried every error, including permanent safety refusals, each a billable call (legacy 12 §8); here retry eligibility is a property of the class.

### 5.3 What may run without asking

The creator's initiating action approves the Generation's **estimate** (a Batch approves the sum), once. That approval covers exactly one billable run. Therefore:

1. **Automatic retry** is allowed only for classes marked "Yes", is capped at **three Jobs per Generation** including the first (two automatic retries), with backoff of about 5 s then 30 s plus jitter, and stops at the first success, non-transient failure or creator cancel.
2. **Trivial-cost exception.** A further run whose estimate is below the **trivial spend threshold** may also run automatically for *transient, maybe billed* failures, under the same cap. The threshold is **$0.05 per Generation** (creator-ratified, tunable configuration; defined in [`BUSINESS-AND-OPERATIONS.md`](BUSINESS-AND-OPERATIONS.md) §3), low enough that Constitution §13.4's "meaningful spend" never applies to it. Many text actions fall under it, but the class is computed from each estimate, never assumed from the kind of work; video never.
3. **Everything else needs the creator.** The **Retry** control on a failed Generation is itself the initiating action: it shows the estimate (or "not charged") and creates one new Job. A creator Retry that fails again re-offers Retry; it never silently loops.
4. A cap-exhausted automatic sequence ends *Failed* with a Retry offer, never silently and never as "still generating".
5. Counts are per Generation, cumulative and visible. A creator Retry starts a new automatic budget only for the "Yes" classes.

## 6. Cancellation

The creator can cancel a Generation, a Batch, or any not-yet-started member of a Batch. Cancelling is always possible and takes effect *for the creator* immediately: the Generation reads *Cancelled* and nothing more is done to it. What differs is what the provider does.

| Adapter's declared cancellation | What happens | `billing` recorded |
|---|---|---|
| **Not yet submitted** (waiting, queued, submitting with no acceptance) | Job → cancelled; if a submission raced, a cancel is sent as soon as the operation reference appears | none |
| **Reliable** | cancelling → cancelled on provider confirmation | none (or provider-reported) |
| **Best effort** (in-progress work "may still complete") | cancelling → cancelled when the provider answers or at the cancelling deadline | maybe |
| **None** (no cancel endpoint) | Job → cancelled immediately. Aiuteur stops waiting, but the operation reference is retained for **reconciliation** | maybe, or yes once a result is seen |

Rules:

- When cancelling is not free, the control says so beforehand: "This provider cannot stop a started run; you may still be charged up to about $X". It is information, not a second confirmation; cancelling saves spend.
- **A cancelled Generation is never retried automatically.**
- **Late output after cancel.** If the provider completes anyway, the output is already paid for and Constitution §14.3 forbids silently destroying takes. Reconciliation fetches it and attaches it as an unselected Attempt labelled "arrived after cancel". The creator gets a quiet notice (ratification M2); it never interrupts.
- **Reconciliation.** Every Job that ended `timed_out` or `cancelled` with a provider operation outstanding keeps being checked, at a low backed-off rate, until the adapter's retention deadline passes or the provider reports a terminal status. Its outcome decides the final `billing`. A `timed_out` Job whose operation later *succeeds* is **adopted** into the same Generation: the Generation moves failed → succeeded, outputs attach as unselected Attempts labelled "arrived late", and the creator gets a quiet notice. Adoption after timeout and attachment after cancel (above; the Generation still reads *Cancelled*) are the only ways a settled Generation gains outputs without a new Job: the request never changes; only its outcome may gain outputs, once (domain model §5; hand-off to #54).
- Cancelling a Batch cancels waiting and queued members free and each started member by the table above. Finished members keep their results.

## 7. Provider operation reference, timeouts and restart recovery

**Operation reference.** On acceptance the Job stores the provider and model (as history), the provider's operation reference, submission time, last observed provider status, `next_poll_at` and the state deadline. It is committed in the same transaction as submitting → running and is never held only in memory (V1 lost the in-flight Veo operation on restart; legacy 12 §11.1).

**Polling.** Scheduled from stored state, never an in-memory loop. The interval starts at the adapter's declared minimum, backs off to a ceiling with jitter, and always ends at the state deadline. A webhook may pull the next check forward; its absence never delays completion beyond the poll interval.

**Recovery is a rule, not a feature.** At startup, and continuously through lease expiry, non-terminal Jobs are scanned:

| Found | Recovery |
|---|---|
| waiting, queued | Nothing to recover; runnable as they are. |
| submitting, lease expired, **no operation reference** | The crash window: we do not know whether the provider accepted. (1) If the adapter supports idempotent submission, resubmit with the same key (safe). (2) Else if it supports lookup by our correlation id, look up; found → running, not found → resubmit. (3) Else the outcome is *unconfirmed*: the Job ends `failed`, class *Transient, maybe billed*, reason `submission_unconfirmed`, and follows §5.3 (automatic only under the trivial threshold; otherwise the creator decides). A visible one-click retry is preferred to a silent double charge. |
| running (has reference) | Resume polling; a lost webhook is irrelevant. |
| fetching | Re-run the fetch; it is idempotent (storage key derived from Job id; content hash checked), prioritised by time-to-expiry. |
| cancelling | Re-send or re-check the cancel, then finish. |
| Past its state deadline | Fail it with the deadline's reason. |

A worker that merely *stops* (deploy, crash, scale-to-zero) is indistinguishable from a slow one and costs only the lease interval. No state can be stranded by a restart.

## 8. Batches

A **Batch** is the record of one creator action that created several Generations (a scene's takes, a film's frames). It is a Record, not a creative object; it holds the action id, the creator's **approved total estimate**, the member Generations, any **dependency edges**, and a derived status.

- **Members are independent Generations** with their own Jobs, retries, outcomes and costs. One member's failure never cancels a sibling. Partial success is normal and visible ("11 of 14 ready, 2 failed, 1 cancelled").
- **One approval.** The creator confirms the batch estimate once. Members run inside it; automatic behaviour follows §5.3 and never adds billable runs beyond it.
- **Ordering.** Independent members are admitted in a stable order (scene order, then shot order) so results arrive in reading order, and run in parallel up to admission caps (global, per provider, fair between creators) owned by the runtime (#74). Order is a preference, never a reason for one member to wait on another.
- **Dependencies exist only for real data flow**: a member whose input is another member's *output* (shot 4's opening frame reuses shot 3's ending frame). Such a member is **waiting** (§2).
  - The dependent Generation exists from the start, so it can be estimated, approved, shown and cancelled. Its exact inputs are **finalised at the moment its dependency is satisfied**, by binding the concrete output Attempt; after that it is immutable. This is the only time a Generation's inputs are completed after creation, and lineage (#54) records the source.
  - If an upstream member yields several outputs, the dependent binds to the one the batch definition names (for chained continuity: the first output). If the creator later approves a different upstream Attempt, lineage marks the dependent possibly out of date, as for any later change.
  - **Video members never depend on unapproved frames.** A video member is created only for shots whose required frame roles are already approved or skipped by a recorded creator Decision (SHOT-MODEL §§6.1, 6.5). Dependency chaining therefore applies to still-image batches and to the Segments of one long Take, where each Segment depends on the previous Segment's output, never on an unapproved frame (SHOT-MODEL §7.3).
  - If an upstream member fails or is cancelled, its dependents become cancelled (`upstream_failed`, cost none). Retrying the upstream and choosing "continue the batch" re-queues the same dependents as new Jobs of the same Generations with no new approval, because they never started and the approved total is unchanged.
- **Batch status** is derived: running; settled with all succeeded; settled with failures; cancelled. A batch **settles** when no member is non-terminal and none is still adoptable by reconciliation.

## 9. Adapter capability declarations

The lifecycle depends on a provider adapter declaring the following (representation and registry are #66's; the rules here consume them). Declarations are data: changing vendor changes data, not lifecycle.

| Capability | Used for |
|---|---|
| Idempotent submission: key / lookup by correlation id / neither | §4, §7 |
| Completion signal: webhook (verifiable?) and/or poll; minimum poll interval; maximum runtime | §7, deadlines |
| Cancellation: none / best effort / reliable | §6 |
| Output retention: window, authentication needed to fetch, URL lifetime | §10 |
| Billing on failure and on cancel | `billed`, `billing` |
| Error mapping to the §5 classes | §5 |
| Per-run actual cost available or not | Generation actual cost |

Undeclared means the conservative value (no key, no reliable cancel, shortest retention, billed *maybe*). The platform research (#9, 2026-10-18) shows the range these take: webhooks with retries and duplicates, one-hour output URLs on three vendors, cancel that is absent or best-effort on several, creation not idempotent on at least one. No decision here hinges on a specific vendor's current behaviour. Vendors change fast (OpenAI's Videos API shut down 2026-09-24), which is why capabilities are declared, verified by research (#73) and exercised by provider fakes (#76), not assumed.

## 10. Output retention

**Rule: a Job is not `succeeded` until its media is in Aiuteur's own private storage and verified. A provider URL is never a product reference.**

1. On the provider's done signal the Job enters `fetching` and downloads **immediately**. A provider URL is a transient field of the Job and is never copied onto any Attempt, Frame, Take or Generation.
2. The fetch deadline is `min(10 min, half the declared retention window)`. Retries are free with short backoff. Jobs in `fetching` are scheduled nearest-expiry first. An alert fires at half the window.
3. Verification before success: non-empty, content type and container decode, duration and dimensions probed, content hash recorded (Media is immutable and content-addressed, so re-fetching the same bytes is a no-op).
4. If retention expires first, the Job fails `output_lost`, `billed: yes`; the creator is told and offered Retry. This is the only retention failure, and it is visible.
5. Providers that return bytes inline (many text and some image calls) go through the same verify-and-store step; there is no second path.

## 11. Attaching results

On `fetching → succeeded` (or the fast path), one transaction does all of:

1. creates the Media records;
2. creates what the Generation produces: **Attempts** (Frame, Take, entity image, View) in their Slot, **Options**, or a **Revision** with AI provenance, each pointing to the Generation;
3. records actual cost and delivered-versus-requested outputs, and settles the Generation;
4. marks the Job `succeeded`; and
5. writes the completion event to the outbox.

All or nothing, and unique per Job. If it fails, nothing is attached and the Job stays `fetching`, so recovery retries it. A Generation is `succeeded` if at least one output attached; a shortfall is recorded and shown. **Attaching never selects, approves or accepts**: a new Take is not the selected take and a new Frame is not approved, even when the Slot is empty; those stay the creator's alone (Constitution §14.3). Whether an AI text Revision replaces creator-written text is the proposal and accept rules of the AI responsibility map (#64), not this lifecycle.

## 12. Events

Events are written to a **transactional outbox** in the same commit as the transition that produces them, delivered at least once, and consumed idempotently by event id. Notifications, progress views and the spend record are consumers; none reads Job rows to guess what happened.

| Event | When | Notify the creator? | Payload (summary) |
|---|---|---|---|
| `generation.succeeded` | Settled with outputs | Yes, "ready" (coalesced for batches) | Generation, target, outputs, delivered/requested, actual cost |
| `generation.failed` | Settled failed | **Always** (Constitution §10.3) | Generation, target, class, plain reason, billed, whether Retry is offered and its estimate |
| `generation.cancelled` | Settled cancelled | No | billing |
| `generation.retrying` | Automatic retry scheduled | No; status only | attempt number, class |
| `generation.late_result` | Adoption after timeout, or output after cancel | Yes, a quiet notice for both timeout adoption and output after cancel | Generation, new Attempts |
| `batch.settled` | Batch settles | Yes: one summary instead of one per member | counts per outcome, total cost |
| `job.state_changed` | Every transition | No; progress only | Job, from, to, at |

A failure event is emitted exactly once per settling and cannot be missed by a consumer that was offline; a creator who was away sees the unread failure on return (inbox behaviour is #62's).

## 13. V1 failures this lifecycle answers

| V1 failure (legacy 12; FACT-0110, FACT-0131) | Answer |
|---|---|
| Promises not awaited; frame stuck "generating" | Durable Job first; "generating" derived from a non-terminal Job; every state has a deadline and a sweeper |
| One global serial loop, no restart recovery, no row claim, double pickup | Leases and compare-and-set; recovery rules §7; admission caps owned by #74 |
| Unbounded polling | Scheduled, backed-off polling with a per-kind deadline |
| In-flight operation id lost on restart | Persisted at acceptance; write-ahead intent before submission |
| Retries ignored the retryable flag | Eligibility is a property of the failure class; permanent and safety failures never auto-retry |
| `Date.now()` idempotency keys; double submit pays twice | Action ids and derived keys, §4 |
| Last finisher wins; cost re-added per poll | Attempts accumulate; terminal compare-and-set; cost set once |
| Manual retry with no credit check; confirm-render double charge | Retry shows an estimate and is itself the spend initiation; one approval per action id |
| A failed historical row blocks scene completion forever | Scene progress is derived from selected takes, not from the absence of failed Jobs (#54, #62) |
| Provider URLs that expire | §10 |

## 14. Hand-offs

| Ticket | Receives |
|---|---|
| **Candidate review and playback** (#62) | Attached results are unselected Attempts, never auto-selected; labels "arrived after cancel" and "arrived late"; partial batch results ("11 of 14"); the unread-failure inbox; Retry and Edit-and-retry controls with estimate wording; the derived status vocabulary of §2.1 |
| **Business and operations** (#68) | The **trivial spend threshold** ($0.05, §5.3); approval covers one billable run per Generation and a Batch approval is the sum; `billed` and `billing` feed the spend tracker; actual cost is set once; cancel-while-billing disclosure; platform-configuration failures (provider funds, credentials) need an operator alert and different wording than content failures |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)) | Required parts: a job store, a scheduler and sweeper, a provider-adapter boundary and an outbox; no workflow state in the UI; completion attaches results through one transaction owned by generation, not by the UI or an adapter; the Batch record and dependency edges |
| **Platform and execution research** (#73) | What the substrate must provide: durable timers (polling, `not_before`, deadlines), leases or equivalent exclusivity, webhook ingress with signature verification, a transactional outbox or equivalent, safe under restart and scale-to-zero, admission caps. Check each shortlisted option satisfies §7 without bespoke machinery |
| **Runtime platform** (#74, resolved in [`RUNTIME-PLATFORM.md`](../architecture/RUNTIME-PLATFORM.md) and [ADR 0017](../adr/0017-the-job-row-is-the-queue-on-plain-postgres-with-own-sse-progress.md)) | Choose the substrate against those requirements; where admission caps and fairness live; progress delivery from `job.state_changed` and outbox events |
| **Providers and models** (#66, resolved in [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md) §7) | The capability declarations of §9 and the error-to-class mapping of §5 are the adapter contract |
| **Generation package** (#65, resolved in [`GENERATION-PACKAGE.md`](GENERATION-PACKAGE.md) §§3, 13) | Generation inputs are exact and immutable, except that a batch-dependent Generation's inputs are finalised once at dependency satisfaction (§8); the input fingerprint (§4) derives from the package |
| **Lineage and staleness** (#54) | A Generation's outcome may gain outputs once by adoption after a timeout (amends domain model §5 "Mutable? No, once it has ended" to: the request never changes, the outcome may be amended by adoption); lineage for chained dependencies and out-of-date marking when an upstream Attempt choice changes |
| **Shot model** (#55, resolved in [`SHOT-MODEL.md`](SHOT-MODEL.md) §§6.5, 7) | A long shot realised by several Segment Generations is a dependency-ordered batch whose members each follow this lifecycle and whose Take exists only after assembly; video members require every planned frame role approved or skipped |
| **AI responsibility map** (#64) | Every Generation, including inline text actions, uses this state machine; the fast path skips polling and fetching only |
| **Persistence** (#72) | Job, Batch, outbox and run history must be durable and transactional with Attempt creation; Jobs prunable once settled provided the Generation keeps its run history; media storage keys derived from Job id |
| **Verification** (#76) | Provider fakes must simulate slow, duplicate and out-of-order completion, a crash between accept and commit, expired URLs, no-cancel providers, and late results after cancel |

## 15. Constitution check

No requirement was found unworkable or contradictory; no `CONSTITUTION AMENDMENT REQUIRED` is raised. §10.3 is met by durable background Jobs, an always-notified failure event and an always-offered Retry. §13.4(2) and §14.3 are met by one approved run per Generation and the retry rules of §5.3: the only automatic billable retries are known-unbilled or below the trivial-spend threshold. §16 principle 3 is met by adopting late results rather than discarding them, and by attaching without selecting. §17.5 is met by deadlines on every state and recovery rules that leave nothing stranded.
