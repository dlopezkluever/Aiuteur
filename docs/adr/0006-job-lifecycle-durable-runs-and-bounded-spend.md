# Jobs are durable single runs; automatic retries never add unapproved spend

Status: accepted (Wayfinder #67). Full lifecycle in [`docs/domain/JOB-LIFECYCLE.md`](../domain/JOB-LIFECYCLE.md).

V1 ran generation as unawaited promises and one in-memory serial loop: no restart recovery, unbounded polling, retries that ignored the retryable flag (billable retries of permanent failures), `Date.now()` idempotency keys, last-finisher-wins, and provider URLs that expire (legacy 12; FACT-0110, FACT-0131). V2 makes these properties of the model rather than of an implementation:

- A **Job is one run** of a Generation and goes through one state machine for all AI work (text included, via a fast path). A Job is durable before any provider is called; every non-terminal state has a deadline; terminal states are absorbing and every transition is compare-and-set. "Generating" is derived from a non-terminal Job.
- **Retry = a new Job of the same Generation; regeneration = a new Generation** (confirming ADR 0001). A provider refusal *before acceptance* is a **deferral** of the same Job, not a retry.
- The creator's initiating action approves **one billable run per Generation** (a **Batch** approves the sum). Automatic retry is allowed only for failures the adapter classifies as transient and known-unbilled, capped at three Jobs, plus transient maybe-billed failures when a further run is below a trivial-spend threshold (value owned by #68). Permanent, safety-refusal, platform-configuration and unknown failures never retry automatically. A creator's **Retry** click is itself the spend initiation and shows the estimate.
- **Idempotency** is layered: a creator-action id (minted when the spend step opens) deduplicates creation; a Job-id-derived key deduplicates submission where the provider supports one; completion is deduplicated by compare-and-set. A deliberate repeat is a new Generation; an accidental duplicate in flight is refused unless the creator says "generate another".
- A **write-ahead submission intent** and the provider operation reference make restart recovery a rule; an unconfirmed submission is surfaced as a one-click retry rather than silently resubmitted when that could double-charge.
- **Cancellation** always takes effect for the creator at once; what the provider does is adapter-declared (reliable, best effort, none). A cancelled or timed-out run whose provider operation later completes is **reconciled**: the paid-for output is kept as an unselected Attempt, never destroyed.
- **A Job succeeds only after its media is in Aiuteur's private storage and verified**; provider URLs are never product references. Attachment of results, settlement and the completion event are one transaction; attaching never selects or approves.
- Completion and failure events go through a **transactional outbox**; failures are always notified.

## Considered options

- **Retry inside one Job (attempt counter on the row, as V1).** Rejected: it hides what was run and billed per attempt, and ADR 0001 already makes the run the Job.
- **Automatic retry of every transient failure within the estimate.** Rejected: after a billed failure the second run is new spend the creator did not initiate (Constitution §13.4, §14.3). Allowed only when known unbilled or trivial.
- **Resubmit after an unconfirmed submission.** Rejected for non-trivial runs: a silent double charge is worse than a visible one-click retry. Idempotency keys or lookup make resubmission safe where the provider offers them.
- **Discard late output after timeout or cancel.** Rejected: the money is spent and §14.3 forbids silently destroying takes; a late result is kept as an unselected Attempt.
- **Webhooks as the sole completion signal.** Rejected: delivery is at-least-once or absent depending on provider; polling is the floor, webhooks an accelerator.

## Consequences

- A Generation's outcome is immutable except that a timed-out Generation can later gain outputs by adoption; its request never changes. Domain model §5 is amended accordingly.
- A batch-dependent Generation's inputs are finalised once, when its dependency succeeds.
- The execution substrate (#74) must supply durable timers, leases, webhook ingress and an outbox; the provider adapter contract (#66) must declare idempotency, completion signalling, cancellation, retention, billing-on-failure and error classes.
