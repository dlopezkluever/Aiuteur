# The Job row is the queue: plain Postgres, an own scheduler and server-sent progress

Status: accepted (Wayfinder #74). Full design in [`docs/architecture/RUNTIME-PLATFORM.md`](../architecture/RUNTIME-PLATFORM.md); the research behind it is #73 (`research/platform-execution`, facts dated 2026-10-21).

V1 ran generation in the API process: an in-memory serial loop, no restart recovery, client polling every 2 to 3 seconds with no ceiling, no webhooks, no realtime (legacy 12 §§1, 6, 13). The job lifecycle (ADR 0006) already decides the semantics: durable Jobs, compare-and-set, leases, deadlines, write-ahead intent, an outbox. The #73 research found that **no durable-execution engine, managed or library, replaces those database guarantees or closes the crash window between "provider accepted" and "reference stored"**; every option still needs the Job row, the outbox, the atomic cap check and per-state deadlines. The choice is therefore how much *scheduling* to buy.

Decision, for an invite-only, multi-creator deployment of 1 to 50 Accounts:

- **Execution: the Job row is the queue.** An own scheduler on Postgres behind the `Scheduler` port: `FOR UPDATE SKIP LOCKED`, a lease with a fencing token, and one stored **due time** per non-terminal Job (backoff, next poll, lease expiry and state deadline all fold into it, so the deadline sweeper is the same claim). Admission and fairness are counted inside the claim transaction. No separate engine, no second state store.
- **Restart and duplicate safety is the lifecycle's rule made structural:** exclusivity is a row lease, never a database session; every transition is a compare-and-set on the lease token; the provider key derives from the Job id; webhooks only `wake` a Job and never settle it; receipts are unique on (provider, delivery id); completion is unique per Job. A stopped worker costs the lease interval. Correctness never depends on a notification or on the worker being up.
- **Platform:** Postgres on **Neon** (scale-to-zero off; direct connections for the worker, event tail and migrations), objects on **Cloudflare R2** (private, per-Account and per-project prefixes, signed URLs), and **Fly.io** running one image as two process groups, `web` and an always-on `worker`. About $35 to $40 a month at the research scenario.
- **Progress: server-sent events from `web`**, replayed from a per-Account event table (the transactional outbox itself) by `Last-Event-ID`. Events take a per-Account gap-free sequence in the committing transaction. They carry ids and statuses, not content; read models stay the truth. The same query serves a bounded poll as fallback.
- **Isolation in the runtime:** three database identities (`owner` for migrations only, a non-owner `app` that sets the Account per transaction, and a narrow `scheduler` that returns only ids). Background work, webhooks and the stream all rebuild Scope from the Account on the Job or event. Operator and BYOK keys are decrypted only in our processes.
- **Rules RT1 to RT6** are enforced by import checks, lint, role-grant checks and conformance tests, not review.

## Considered options

- **Supabase as the platform** (database, auth, storage, Realtime). Rejected: its default server credential bypasses row rules, which is V1's failure; invites create the user at send time; Realtime replay is 25 messages per request; point-in-time recovery costs $100 a month more; its bundled roles would be unused or would invite the shared identity the Ratification Record (M4) forbids.
- **A Postgres durable-workflow library (DBOS Transact; pg-boss as its lighter variant).** Rejected for now: the workflow becomes a second state machine beside the Job row, steps stay at-least-once so the crash window rule is still needed, several nodes need paid Conductor, and checkpoint tables hold inputs. Fallback behind the same port if the scheduler outgrows its small scope.
- **A managed engine on our compute (Hatchet, Inngest, Temporal, Restate).** Rejected: a second state store whose start is not in our transaction (so a relay and a start-if-missing sweeper are needed), its own retention to purge, per-run step caps shaping long polling loops, and $0 to $200 a month, for a benefit (native fairness) that a count in the claim transaction provides at this scale.
- **Vendor-compute engines and workflow products (Trigger.dev Cloud, Vercel, Cloudflare, AWS, Google).** Rejected: prompts and BYOK keys would run on vendor machines, and most offer no per-key fairness.
- **Hetzner plus Coolify (self-operated).** Rejected as the default: cheapest, but database backups and restore drills become our platform chore. It remains the named exit path.
- **WebSockets, Ably, Supabase Realtime, LISTEN/NOTIFY as transport.** Rejected: traffic is server to client, a vendor would still need our event table beyond its resume window, and NOTIFY has no replay. NOTIFY survives only as a latency hint.

## Consequences

- We write the scheduler (about 300 lines beyond lifecycle logic every option needs) and its crash tests. The `Scheduler` fake on virtual time makes deadlines, backoff and recovery testable without sleeping (#76).
- One Account's event-emitting commits serialise briefly on its counter; revisit with commit-horizon cursors if that contends.
- Nothing at runtime may use vendor-specific features (RT5), so Neon, Fly and R2 each have a plain-Postgres, plain-Docker or S3-shaped exit.
- Persistence (#72) owns schema, row-level mechanism, key layout and retention within these constraints; the Operational baseline (#75) owns authentication (Supabase Auth is out), secrets custody, backups and alerts, receiving the three identities and the oldest-overdue-due-time liveness signal.
- Vendor facts are dated 2026-10-21; re-check Neon, Fly and R2 pricing and limits at build time.
