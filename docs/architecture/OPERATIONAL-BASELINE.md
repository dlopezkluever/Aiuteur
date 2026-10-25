# Aiuteur V2: Operational Baseline

Resolution of Wayfinder ticket #75. The trade-offs are recorded in [ADR 0018](../adr/0018-own-auth-in-our-database-envelope-held-credentials-and-an-independent-backup-copy.md). Inputs: the [business contract](../domain/BUSINESS-AND-OPERATIONS.md) (invite-only Accounts, server-held operator keys, BYOK seam, alerts S10), the [runtime platform](RUNTIME-PLATFORM.md) (one VPS running `web`, `worker` and Postgres with R2 as the current, portable deploy choice; three database identities; the signals §7), the [module architecture](MODULE-ARCHITECTURE.md) (`accounts`, ports `Auth` and `Vault`, build rules R1 to R13), the [job lifecycle](../domain/JOB-LIFECYCLE.md), [providers and models](../domain/PROVIDERS-AND-MODELS.md), the [Creator Ratification Record](../product/CREATOR-RATIFICATION-RECORD.md) (Record 1 M4 to M7, which controls), [Record 2](../product/CREATOR-RATIFICATION-RECORD-2.md) (Record 2 P11, P12 and P8-purge, which changed hosting, backups and drills; see the last section) and the #73 research (`research/platform-execution`, `postgres-auth.md` and `storage-cdn.md`; facts dated 2026-10-21; items marked *nv* there stay unverified here).

Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). This document fixes **what the initial product must run with, and nothing more**: one decision per baseline item, and a deferral list. It does not fix schema, the row-level mechanism, key layout or the migration tool (Persistence, #72), nor the verification harness design (#76), nor numeric tuning (spec). Cost figures are estimates from the #73 price sheets and vendor pages read on 2026-10-21; re-check at build time.

## 0. The baseline on one page

| # | Item | Decision |
|---|---|---|
| 1 | **Authentication** | **Better Auth, self-hosted in our Postgres database**, behind the `Auth` port. Invitation link → creator sets a password; email-link recovery. The auth user is mapped to an Account by `accounts`; the Account exists only after redemption. Server sessions in the database. Passkey or TOTP offered to creators, **required for the operator** |
| 2 | **Secrets and provider credentials** | Platform secrets are host-held secrets, per environment. **Operator provider keys are server-held secrets in the host's configuration** and are never in the database. **Creator-supplied keys (BYOK) are wrapped-key (envelope) ciphertext in the database**, bound to Account and provider, unwrapped only in `web` and `worker`. Both sit behind one `Vault` port and one opaque `CredentialHandle` |
| 3 | **Environments** | `local`, `ci` (ephemeral), `staging` (persistent, synthetic data, real vendors, capped test keys), `production`. **Production data never leaves production** except to backups and restore tests |
| 4 | **CI and delivery** | GitHub Actions. One required pipeline: static and architecture rules, secret scan, tests on real Postgres, the **isolation gates**, migrations gate; one image digest promoted staging → production with a manual approval; migrations run by the pipeline under the `owner` identity, expand/contract only |
| 5 | **Error tracking** | **Sentry (hosted) behind an `ErrorSink` port**, deny-by-default scrubbing, ids only, **no session replay**. Domain failures are product events, not error-tracker items |
| 6 | **Logs and traces** | One typed structured logger (no `console`), JSON to stdout, shipped from the host to a log sink with 30-day retention. Correlation by ids; **no distributed-tracing backend** at baseline. The AI trace is the Generation record, with content tiers (VERIFICATION-AND-OBSERVABILITY §2) |
| 7 | **Alerts and liveness** | The S10 list plus the runtime's oldest-overdue signal, evaluated in the worker and delivered by email; plus an **external heartbeat** that watches the thing that cannot alert about itself |
| 8 | **Backups** | **Database floor from day one (Record 2 P12):** an automated daily database dump plus continuous WAL archiving, encrypted, to storage **off the machine** (R2 is acceptable). **Media floor before the first non-owner invitation (Record 6 §4):** an independent copy of committed media at Backblaze B2 under a separate account and no-delete credentials, plus a retention Bucket Lock on the primary R2 bucket's committed-media prefix. Retention values, copy frequency, a second vendor for the database and drill cadence are **deferred**. When purge ships, remaining copies expire within a retention window stated to the creator at purge time (P8-purge) |
| 9 | **Restore tests and recovery** | **One successful restore test before any creator other than the owner is invited** (P12), including a sample of media restored from the B2 copy (Record 6 §4). Drill cadence and the full manual drill gate are **deferred**. Runbooks are build deliverables |
| 10 | **Provider configuration** | Catalogue is reviewed data in the repository; operational overlay and prices are audited data; keys per environment; provider-side prepaid limits are the outer wall (S9) |
| 11 | **Security tests** | Cross-Account refusal on every path (HTTP, stream, webhook, worker, signed URL, operator views), role-posture and forced-row-rule coverage checks, secret-canary leak test, auth abuse limits |

Estimated added monthly cost over the hosting of RUNTIME-PLATFORM §0 (the VPS default, about $10 to $25, an unverified estimate): error tracking $0 to $26, log sink $0, backup storage on R2 a few dollars, the B2 media copy a few dollars (about $6.95 per terabyte-month when researched), heartbeat monitor $0, transactional email $0 to $20 by volume. **Roughly $12 to $80 a month in total**, and the low end holds until the error or email volume grows. (On #74's original Fly + Neon platform the total was estimated at $40 to $90.)

## 1. What the baseline answers

| V1 failure | Answer here |
|---|---|
| Service-role client on every request; per-route `user_id` checks were the only boundary; sub-resource ids unbound (legacy 11 §§3.8, 3.11; 12 §14) | No such identity exists at runtime (§5, RT3). Isolation is forced row rules plus `Scope`; **gates §11** make the V1 gap list executable |
| Authentication by a network call per request to a vendor with the service role (legacy 11 §3.7) | Sessions verified locally against our own database; identity never grants data access by itself |
| Seeded rows with a null creator editable by every user (legacy 12 §14) | No creator-mutable row without an Account; the Catalogue and prompts are repository data, not rows a creator can edit |
| Unauthenticated or project-less utility routes that spend operator money (`/api/llm/*`) | Every route resolves a `Scope` or is an explicit public route on a short allowlist (health, webhook, auth) checked by a test |
| No working migration path: duplicate numbers, an invalid step, objects outside the chain (legacy 05 §1) | Migrations gate (§4) |
| `console.*` only, 290 silent catches, 88 responses echoing `error.message` (legacy 11 §3.9) | Typed logger, banned `console`, errors reported with class and ids only (§§6, 7) |

## 2. Authentication

### 2.1 Designs compared

| | **A. Better Auth in our database (chosen)** | **B. Clerk** | **C. WorkOS AuthKit** |
|---|---|---|---|
| What it is | An open-source library running in `web`; users, sessions and hashes live in our Postgres | Hosted identity with hosted UI and SDK; JWTs verified by key set | Hosted identity; invitation code re-opens registration for one invitee |
| Invite-only | `disableSignUp` plus our own invitation table and redemption endpoint (a small piece we write; an app-wide invitation plugin is *nv*, only organisation-scoped invitations are known) | Native "invite-only" mode, free | Native, documented as closed registration |
| When the account exists | At redemption (our code) | At acceptance | At redemption |
| Where identity data lives | **In the database that purge and backup already cover** | Vendor; export is a CSV including hashes | Vendor; hash export *nv* |
| Login path depends on a third party | No | Yes | Yes |
| Second factor | Passkey and 2FA plugins, free | Pro plan, $25 a month | Included |
| Local and CI parity | Complete: any local Postgres | Cloud only | Cloud only |
| Cost at under 50 users | $0 | $0, then $25 for second factors | $0; custom domain $99 |
| What we own | Security patching, the invitation flow, email delivery, abuse limits | Almost nothing | Almost nothing |
| Isolation fit | Account scoping is ours; identity can be mapped to Account in one place | Same mapping needed | Same |
| Verdict | **Chosen** | Named fallback | Named fallback |

**Why A.** Three facts decide it. (1) Purge and backup (M7, principle 3) must cover everything about a creator; identity inside our database is covered by the same backups, the same restore test and the same per-Account deletion. (2) Local and CI parity: the two-Account isolation harness and the invitation flow run against plain Postgres with no cloud account. (3) A hosted login is one more vendor whose outage stops creators from reaching work that is otherwise safe. The cost of A is real: we own patching of a younger library and the small invitation flow. Auth.js and Lucia are not options (the first points new projects to Better Auth; the second is deprecated). Supabase Auth is out with Supabase (ADR 0017).

### 2.2 The seam keeps this reversible

`Auth` returns only an **authenticated subject** (a stable id and a verified email). `accounts.resolveScope(subject)` maps it to the Account; nothing else in the system sees the identity product. Replacing Better Auth with Clerk or WorkOS is therefore a new `Auth` adapter plus a one-time mapping of existing subjects by verified email, with no change to `Scope`, row rules or events. **Reversal trigger:** an unpatched critical vulnerability the maintainers do not fix within the operator's tolerance, or the operator's wish to stop owning authentication.

### 2.3 Rules

| Topic | Rule |
|---|---|
| **Invitation** | The operator issues an invitation for one email. Single use, expiring, the token stored only as a hash, bound to the invited email. Redeeming it creates the auth user, the Account and its default settings **in one transaction**. There is no public signup route; the library's own signup is disabled and a test asserts it |
| **Proof of email** | Redeeming the emailed link proves control of the address, so there is no separate verification step |
| **Credential** | Password with a length floor and a check against the commonly breached list (spec chooses the list); hashing by the library's current default (scrypt). A passkey or TOTP is offered at first sign-in. **Required for the operator.** Not required for creators at baseline: an Account takeover is bounded by the creator's caps and the hidden operator ceiling (BUSINESS §6). **Trigger to revisit:** BYOK ships, because stored own keys raise the stakes; require step-up for viewing or replacing a key |
| **Recovery** | A single-use emailed link, expiring, which revokes all sessions on use. No security questions |
| **Sessions** | Database-backed, opaque id in a cookie with `HttpOnly`, `Secure` and `SameSite=Lax`; rotated at sign-in; idle and absolute lifetimes (spec values); all revoked on password change; the operator can revoke an Account's sessions. A session proves identity only; **every request still resolves a `Scope`** |
| **CSRF** | `SameSite` plus an origin check and a required custom header on every state-changing request. The event stream is a same-origin `GET` |
| **Abuse limits** | Rate limits on sign-in, recovery and invitation redemption, per address and per email, kept in Postgres counters (no extra store). Generic responses so existence of an email is not revealed |
| **Operator** | A deployment capability, not a role table: the operator is the identity whose verified email is in the deployment's `OPERATOR_EMAILS` setting, **and** who has a second factor. It cannot be granted through the application, so a bug cannot escalate to it. There are no creator roles, hierarchy or permissions (§15.5) |
| **Operator actions** (the whole set) | Issue or revoke an invitation; list Accounts with usage and spend totals (content-free); set an Account's operator ceiling; suspend or reinstate an Account (sign-in and new Jobs refused; its data untouched); revoke an Account's sessions; clear a circuit breaker or Offering suspension; acknowledge an alert. Each writes a content-free audit event. A console UI is spec work; the minimum is authenticated operator endpoints and a command-line wrapper |
| **Email** | A `Mailer` port, used only for invitation, recovery and operator alerts. Any transactional-email service with SPF and DKIM for our own sending domain; the vendor is a configuration choice in the spec, since all are interchangeable behind the port. Fake mailer in tests |
| **Auth schema access** | Auth tables live in their own schema, hold identity and sessions only, and are reachable by a fourth narrow database identity (§5), not by `app` |

## 3. Secrets and provider credentials

### 3.1 Kinds and where each lives

| Kind | Examples | Lives in | Read by |
|---|---|---|---|
| **Platform secrets** | The `app`, `scheduler`, `identity` DSNs; R2 tokens; session secret; webhook signing secrets; error-tracker key; mailer key | **Host-held secrets** of the process and environment that needs them (on the VPS, secret files or environment readable only by that container and injected at start; on a PaaS, its secret store). Never in the repository, an image layer or a log | The process that needs them, by name, through the validated boot configuration |
| **Operator provider keys** | One key per provider surface | **Host-held secrets** of the production (and, separately, staging) `web` and `worker` | `web` and `worker` only, through the `Vault` operator adapter |
| **Key-wrapping key (KEK)** | `KEK_v1`, `KEK_v2` | Host-held secrets of `web` and `worker`, **plus an offline copy** held by the operator (password manager) | `web` and `worker` only; **not** the backup job |
| **Creator-supplied keys (BYOK, follow-on)** | A creator's provider key | **Database ciphertext** (§3.3) | `web` and `worker` only |
| **Database owner and migration identity** | `owner` DSN | The CI environment secret for the target environment, protected by approval for production | The migration step only; never any running process |
| **Backup credentials** | Backup-storage write key; the backup public key | The backup job's own secrets (not held by `web` or `worker`) | The backup job and Postgres's WAL archiving only |

### 3.2 Designs compared for operator keys

| | **A. Host-held secrets, resolved by the Vault adapter (chosen)** | **B. Operator keys also encrypted in the database** | **C. External secrets manager or KMS** |
|---|---|---|---|
| Single mechanism with BYOK | No: two adapters, one interface | **Yes** | Possible |
| A stolen database dump or backup contains operator keys | **No** | Yes, as ciphertext; the KEK is then the only protection | No |
| Rotation | Update the host's secret configuration; a restart | An admin operation plus re-wrap | Manager's own |
| Moving parts and vendors | 0 added | 0 added, more code | +1 vendor and an availability dependency on the credential path |
| Verdict | **Chosen** | Rejected: it puts the most valuable keys into every backup for the sake of uniformity the port already gives | Deferred; the `Vault` port is the exit |

**Why two adapters behind one interface is not duplication.** `accounts.credential(scope, provider surface)` returns an opaque **`CredentialHandle`**. The operator adapter resolves it from the boot configuration; the own-key adapter unwraps ciphertext. Adapters (`providers`) receive only the handle and never read a global key or the environment (BUSINESS §7, F12). BYOK is then the second adapter's setup flow plus configuration, as ratified (M5).

### 3.3 Creator-supplied keys (the seam built now, the flow later)

| Rule | Detail |
|---|---|
| Envelope | A random data key per credential encrypts the key with an authenticated cipher; the KEK wraps the data key. The ciphertext records the KEK version |
| Binding | Account id, provider surface and credential id are authenticated associated data, so a ciphertext copied to another Account or provider fails to open |
| Write-only | Never returned, displayed, logged or placed in a Generation; shown only as "set on [date]" and the last four characters |
| Where it opens | Only in `web` and `worker`. The `scheduler` identity, the operator views and the backup job cannot read or open it |
| Rotation | Add `KEK_v2`, deploy, re-wrap job, retire `KEK_v1`. A provider key's rotation is the creator's (own) or the operator's (host secrets) |
| Loss of KEK | Own-key ciphertext is unrecoverable without it, by design. The offline copy is checked in restore testing once own keys exist (§9) |

### 3.4 Handling rules (enforced, not advised)

| # | Rule | Enforced by |
|---|---|---|
| SC1 | A `CredentialHandle` and any secret-bearing object cannot be serialised: its string and JSON forms are redacted constants | Unit test over the type |
| SC2 | The logger and the error scrubber accept only the typed field set (§§6, 7) and additionally scrub every known secret value registered at boot | Canary test: a planted fake key must be absent from logs, error events, Generations, responses and events after running every adapter failure path |
| SC3 | No secret appears in the repository or history | Secret scan in CI on every push, and a pre-receive push protection setting |
| SC4 | Boot configuration is parsed against a schema; a missing or malformed secret stops the boot; none has a default value | Config test |
| SC5 | Production and staging share no secret: separate provider keys (staging keys carry small provider-side limits), separate database, bucket, session and KEK | Environment matrix check in CI (names must differ per environment) |
| SC6 | Webhook signatures are verified per adapter with a per-environment secret; deliveries are idempotent (RUNTIME-PLATFORM §4.5) | Adapter conformance suite (#76) |
| SC7 | Provider-side prepaid balance or spend limit set at each provider, as the outer wall (S9) | Operator checklist item recorded before the first invitation; stale-ness alert (§7) |

## 4. Environments and CI

### 4.1 Environments compared

| | **A. local + production** | **B. local + ci + staging + production (chosen)** | **C. B plus per-pull-request previews** |
|---|---|---|---|
| Where a bad migration or a scheduler change is first seen | Production | **Staging** | Preview |
| Cost beyond production | $0 | Estimated at about $10 to $15 a month on #74's Fly + Neon platform; on the VPS default, one small separate host running both roles and its own Postgres, plus an R2 bucket (not re-estimated) | Per preview |
| Risk of production data in lower environments | None | None, by rule | Higher: previews tempt branching production |
| Verdict | Rejected: the scheduler, the lease behaviour and the rolling deploy are exactly what must not first meet production | **Chosen** | Deferred |

| Environment | Database | Storage | Providers | Data |
|---|---|---|---|---|
| **local** | Docker Postgres, same major version | In-memory or local S3-compatible `BlobStore` | `kind: fake` Offerings only | Fixtures |
| **ci** | A fresh database per run (a Postgres service container), created from the schema, never from production | In-memory `BlobStore` | Fakes with wire capture | Generated |
| **staging** | Its own Postgres on its own host, never the production machine; two synthetic Accounts | Its own R2 bucket | Fakes by default; real providers only through staging keys with small provider-side limits, in scheduled smoke runs | Synthetic only |
| **production** | Postgres on the production VPS (the current deploy choice, RUNTIME-PLATFORM §0), direct connections | R2 | Real, operator keys | Creators' |

**Rules.** (1) **Production data never leaves production** except to backups (§8) and restore tests, which run under production's access rules and are deleted after. Staging is seeded with synthetic data, never restored from production, because private media and prompts are not for developers' staging. (2) A deployment declares its `environment`; the composition root refuses to boot a `kind: fake` Offering, a fake `Mailer` or a fake `BlobStore` in `production`, and refuses real provider keys in `local` and `ci` (F2). (3) Configuration differs by environment only in values, never in code paths.

### 4.2 Pipeline

```diagram
 push ─▶ static ─▶ tests ─▶ isolation gates ─▶ migrations gate ─▶ build one image
        types, lint,   pure + real     two-Account, role      empty→head,        │ digest
        build rules R1–R13, RT2,   Postgres,       posture, canary,       drift, no outside  ▼
        secret scan    conformance     auth abuse             DDL        staging deploy ─▶ smoke ─▶ approval ─▶ production
                       on virtual time                                    (owner migrations first)             (same digest)
```

| Stage | Contents | Blocks merge |
|---|---|---|
| **Static** | Types; lint; the architecture rules, build rules R1 to R13 (and R14 to R18, R19 to R24 of PERSISTENCE and VERIFICATION) as import-graph and type checks; RT2 (`pg_advisory_lock(`, bare `SET`, `LISTEN`); the `console` ban; the vendor-name search of build rule R9; secret scan; dependency audit for known vulnerabilities | Yes |
| **Tests** | Pure modules (compiler goldens, guards); the shared conformance suites over each seam's real and fake adapters (Store, Scheduler, BlobStore, Vault, `ProviderTransport`); lifecycle recovery on virtual time; the operation harness and the golden workflow on replay (VERIFICATION-AND-OBSERVABILITY §§4, 5) | Yes |
| **Isolation gates** | §11 | Yes |
| **Migrations gate** | Applying the chain from an empty database reaches the committed schema snapshot; applying it to the previous release's schema reaches the same; no number reuse; no DDL outside the chain (the `owner` DSN exists only in the pipeline, so there is no console route for DDL) | Yes |
| **Build** | One image for both process roles, tagged by digest | n/a |
| **Staging deploy** | Migrations (under `owner`), then rolling deploy of `web` and `worker`, then a smoke test: sign-in, one fake-provider Job end to end, an event stream reconnect | Fails the pipeline |
| **Production deploy** | A manual approval on the **same digest**; migrations first; rolling deploy of `web` (2 or more instances) then `worker`. Rollback is redeploying the previous digest | Approval required |

**Delivery rules.** Migrations are **forward-only and expand/contract**: a release's schema must work with the previous image still running, so the rolling deploy and a rollback are both safe. Real-provider and real-model smoke tests are a separate scheduled workflow with spend-limited keys, never a merge gate (they cost money and flake). `main` is protected; the required checks are the blocking stages above. The migration **tool** and schema authority are #72's; this section fixes the gates any tool must pass. Preview environments, dependency auto-merge and supply-chain attestations are deferred (§12).

## 5. Database identities, completed

RUNTIME-PLATFORM §5 fixed three identities. The baseline completes the set, each with the least it needs:

| Identity | Used by | Can | Cannot |
|---|---|---|---|
| `owner` | The pipeline's migration step | Run DDL | Be present in any running process |
| `app` | `web`, `worker` | Read and write tenant tables under forced row rules with the Account set per transaction | Own tables, bypass row rules, read the auth schema |
| `scheduler` | The claim, wake and outbox functions | Execute those functions, which return ids and Account ids | Read tenant content |
| `identity` (**new**) | The auth handler | Read and write the auth schema; call `accounts.map_subject` | Touch tenant tables |
| `operator_read` (**new**) | The operator endpoints | Select from a fixed set of content-free views: Accounts, usage, spend totals, Job states and ages, Generation outcome rows (ids, codes, costs, timings; no content, VERIFICATION §2.3), alerts | Select from any table, or any view not on the list |
| `backup` (**new**) | The daily dump job, run as its own process with its own secrets | Read everything for dumping, **including past row rules** | Exist anywhere on a request, worker or webhook path; its DSN is held only by the backup job; it cannot write to production |

The `backup` identity is the single deliberate exception to "no identity bypasses row rules", and it exists because a faithful dump must read every row. It is credentialed separately, held only by the backup job, and its use is logged. (WAL archiving is done by Postgres itself and needs no application identity.) The role-posture test (§11) asserts each of these properties from the catalogue.

## 6. Logs and traces

| Topic | Decision |
|---|---|
| **Logger** | One typed logger. A log call takes a static message key and a typed field set drawn from `contract`: ids (Account, project, Job, Generation, request, action), closed codes, durations, counts. There is no free-text field, so a prompt, a document, a key, a signed URL or another Account's content cannot be passed. `console.*` is a lint error |
| **Shape and shipping** | JSON to stdout; the host forwards it to a log sink (on the VPS, the container runtime's logging driver or a small shipping agent; on a PaaS, its log drain). The sink is configuration, not code: the first choice is a hosted sink with a free tier and 30-day retention (Axiom Personal was the researched option; *free-tier terms to be re-checked at build*). Logs kept on the host rotate and are lost with the machine, so shipping is part of the baseline |
| **Correlation** | `requestId` → `actionId` → Job id → Generation id, on every line, every provider call (as metadata or idempotency key where the provider accepts one) and every event. Account id on all of them |
| **Provider traffic** | Request and response bodies are never logged. The record of what was sent is the stored Rendered request under `Scope`, not the log |
| **Retention** | 30 days at baseline. Purge (M7) is satisfied because logs carry ids only |
| **Per-Account view** | The operator can filter logs by Account id; the log tells what happened, never what was written |
| **Metrics** | The platform's signals (RUNTIME-PLATFORM §7: queued age, running counts, oldest overdue, lag) are database queries and logged duration fields. **No metrics backend** at baseline |
| **Traces** | Correlation by ids is the trace, because the Job row is the audit. For AI work the trace is the **Generation record** (Generation, call, Job and run, provider operation reference, Attempt; [`VERIFICATION-AND-OBSERVABILITY.md`](VERIFICATION-AND-OBSERVABILITY.md) §2.1, ADR 0026); its content (the Rendered request, call log and raw responses) is readable only under the creator's Scope and never enters a log, error event, alert or operator view. **No distributed-tracing backend and no sampled performance tracing** at baseline (§12). Error events carry the same ids |

## 7. Error tracking and alerts

### 7.1 Error tracking

| | **A. Sentry hosted (chosen)** | **B. GlitchTip** (Sentry-compatible; hosted or self-run) | **C. Logs only, alert on log patterns** |
|---|---|---|---|
| Grouping, release health, source maps | Yes | Yes (smaller) | No |
| Cost at this scale | Free developer tier (one user), then about $26 a month | Free to 1,000 events a month, $15 for 100,000 | $0 |
| Content-leak control | Our scrubber, deny-by-default | Same | Same logger |
| Verdict | **Chosen** | Named fallback: the `ErrorSink` port is the exit | Rejected: no grouping makes recurring causes invisible, and V1's silent catches were exactly this |

**Rules.** (1) Vendor SDKs live only in the `ErrorSink` adapter (RT5). (2) **Deny-by-default scrubbing:** an event carries error class, closed code, stack frames, release, process role, and the tags Account id, Job id, Generation id, request id. Request bodies, headers, cookies, query strings, breadcrumbs from network calls, local variables and user-supplied strings are dropped. `sendDefaultPii` is off. (3) **Provider error text is never forwarded**: it may echo a prompt. The adapter's mapped class and code go to the tracker; the raw reason stays on the Job under `Scope`. (4) **No session replay or screen recording** in the browser, ever, because it would capture creative content; the browser SDK uses the same scrubber. (5) **Expected failures are not errors.** Provider refusals, deadline expiries, held results and cap-hits are product events with their own states; only violations of our own invariants and unclassified exceptions reach the tracker. (6) Each release is tagged with the image digest.

### 7.2 Alerts

Delivered to the operator by email through the `Mailer` port (any push or chat channel is a webhook away, a configuration choice). The worker evaluates the checks on its tick and writes content-free alert rows; the operator acknowledges them (§2.3).

| Alert | Source | Origin |
|---|---|---|
| Oldest overdue due time beyond threshold (the scheduler or the whole worker is not working); a stuck deadline | Database | RUNTIME-PLATFORM §7 |
| Provider out of funds, key revoked or invalid, model retired (Platform configuration failures); circuit breaker open; Offering suspended | Job outcomes | S7, S10 |
| An Account near its ceiling or a creator cap hit repeatedly | Spend | S10 |
| Stale or suspect prices; drift beyond tolerance | Price registry | S10 |
| Maybe-billed runs unreconciled past their retention deadline | Generation run history | S10 |
| Deprecation watch: a shutdown date near, a review age exceeded, a conformance probe failed | Catalogue | PROVIDERS §10.4 |
| The daily dump or WAL archiving failed, or its latest success is older than allowed (§8) | Backup job, Postgres archiver status | this document |
| Unclassified exception rate rising; a release's new error group | Error tracker | this document |
| A migration or deploy failed | Pipeline | this document |

**The external heartbeat.** A worker that is down cannot report that it is down. An external monitor (any service that polls a URL from outside the host; a free tier suffices) requests `GET /healthz/deep` on `web`, which answers failure when the oldest-overdue signal or the worker's last tick is stale, when the database is unreachable, or when the latest backup is too old. It also checks plain reachability. Its alert reaches the operator by a different channel than the application's own email, so a dead VPS is still reported. The endpoint returns counts only, never content.

## 8. Backups

### 8.1 The floor, required from day one (Record 2 P12)

On the VPS default a single disk failure would otherwise lose every creator's work (Constitution §16.1, Record 1 R1), so this floor is **non-negotiable**:

| Data | Protection now | Recovery point |
|---|---|---|
| **Database** (creative history, Jobs, spend, auth schema, ciphertext) | **Continuous WAL archiving** (with the base backups replay needs) **plus an automated daily logical dump** taken by the `backup` identity. Both are encrypted before they leave the machine, with key material the operator also holds offline, and written to **storage off the machine** (R2 is acceptable), in a bucket that `web` and `worker` hold no credentials for | Up to the WAL archiving interval, to a chosen point in time; the daily dump is the simpler second route |
| **Media** (R2, content-addressed and immutable) | Off the machine in R2. R2 has no object versioning, so deletion is guarded three ways: committed-media deletion has one caller (PERSISTENCE-AND-MEDIA R16); a **retention Bucket Lock** on the committed-media prefix (`m/`) of the primary bucket blocks deletion and overwrite inside the Cloudflare boundary (staging, rendition and export prefixes stay deletable); and an **independent copy at Backblaze B2** (Record 6 §4), made by a scheduled copy-only-new job under a separate account whose credentials cannot delete, covers loss, suspension or compromise of the Cloudflare account. Both the lock and the copy are required **before the first non-owner invitation**, not at T0 | Up to the copy interval for new objects; lock retention and copy interval are deferred values |
| **Configuration** (Catalogue, prompts, code) | The repository and its remotes | Not applicable |
| **Secrets** | Host-held secrets, plus the operator's offline copy of KEKs, the backup encryption key and provider and platform credentials | Not applicable |

The dump job and the media copy job run as their own processes with their own secrets, so `web` and `worker` hold neither backup nor B2 credentials. A compromise of the VPS host itself reaches everything on it; the B2 copy is outside that host and outside the Cloudflare account. A second vendor for the database backups remains a deferred policy decision.

**Deferred, not decided (Record 2 P12.3, narrowed by Record 6 §4):** how many database backups and copies; retention periods, including the Bucket Lock's and the B2 copy's; copy frequency; a second independent vendor for the database; restore-drill cadence; further no-delete credential design; the full manual drill gate. The media replica of #75 (§8.3, media row) is now required as stated above; the rest of the original #75 design (§§8.2, 8.3 and the deferred rows of §9) is kept as an option for those decisions, not as a current requirement.

**Purge and backups (M7, P8-purge).** When project or account purge ships, the promise is: **gone from Aiuteur at once; any backup copies expire within a stated retention window, which is told to the creator at purge time.** That window covers locked primary objects and the B2 copy as well as database backups: purged media is unreachable at once and its locked or copied bytes are removed when retention allows (Record 6 B6.5). The retention window is therefore a value the deferred backup policy must set before purge ships. Whenever a purge exists, it appends to a durable **purge log**; every restore procedure ends by replaying that log so a restore cannot resurrect a purged project or Account. The baseline requires that rule now; the purge feature supplies the log.

### 8.2 Original #75 comparison (drafted for Neon + Fly; now a deferred option)

#74's platform had a managed database with its own history window, so #75 compared the options below and chose B. Record 2 P11 moved hosting to a VPS and P12 replaced B with the floor of §8.1 and deferred the rest. Kept as history and as input to the deferred decision.

| | **A. Vendor history only** (Neon history window; R2 as is) | **B. A plus an independent copy at a second vendor (chosen)** | **C. Own continuous archiving to our own storage** |
|---|---|---|---|
| Bad migration, bug or operator slip | Recoverable inside the history window only | Same, plus older dumps | Same |
| Vendor outage, account loss, suspension or compromise of the Neon or Cloudflare account | **Everything is gone together** | **Recoverable elsewhere** | Recoverable if the archive is at another vendor |
| Our deletion bug or credential compromise erasing media in R2 (R2 has no object versioning; its prefix-scoped bucket lock rules exist but are not configured, and an indefinite lock would also block purge; Cloudflare R2 bucket-locks page and S3 API compatibility table, read 2026-10-23) | Unrecoverable | Recoverable | Recoverable |
| Added vendors and cost | 0 | 1 (object storage); about $2 to $3 a month at 200 GB | 1, and a stateful service we operate |
| Effort | None | A scheduled job and its drill | Most |
| Verdict | Rejected: "nothing is lost" would rest on one account at each of two vendors, with nothing outside them | **Chosen** | Rejected by #75: operating archiving is the chore the managed database was chosen to avoid. *Superseded by Record 2 P11/P12:* continuous WAL archiving off the machine is now part of the floor (§8.1) |

### 8.3 Original #75 copy design (deferred option)

| Data | Primary protection | Independent copy | Recovery point |
|---|---|---|---|
| **Database** (creative history, Jobs, spend, auth schema, ciphertext) | Neon point-in-time history, the longest window the chosen plan offers (7 days on Launch per the research; re-check) | A **logical dump** at least daily, taken by the `backup` identity, **encrypted on the job with a public key whose private key is offline** with the operator, written to the second vendor | Minutes inside the vendor window; up to the dump interval against a vendor-level loss |
| **Media** (R2, content-addressed and immutable) | R2 durability. No versioning, so a deletion by our own code is permanent | A **copy-only-new replica**: the job lists keys, copies those absent at the second vendor, never deletes. Immutable hash-named objects make this a set difference | Up to the replica interval for new objects |
| **Configuration** (Catalogue, prompts, code) | The repository | The repository's own remotes | Not applicable |
| **Secrets** | Fly secrets | The operator's offline copy of KEKs, the dump private key and provider and platform credentials | Not applicable |

**The backup job** runs as a scheduled machine in its **own Fly app** with its own secrets, so a compromise of `web` or `worker` cannot reach the backup credentials, and a compromise of the backup app cannot reach production keys or write to production. Its storage credentials are scoped to the backup bucket and **cannot delete or overwrite** (*the vendor's key capability set must be checked to omit delete at build; this is the one assumption the design leans on*). Expiry is by the bucket's lifecycle rule, so only the vendor's retention, not our credentials, removes backups. The second vendor is a different company and account from Cloudflare and Neon; Backblaze B2 was the researched option at about $6.95 per terabyte-month, and any S3-compatible store behind the same `BlobStore`-shaped copy tool qualifies.

## 9. Restore tests and recovery

| Drill | What it proves | When |
|---|---|---|
| **Restore test (required now)** | From what is off the machine (the WAL archive, base backup and dump in backup storage, and the operator's offline keys): restore into a fresh Postgres that is not the production machine, start the application against it, sign in and open a project, and run the role-posture check; restore a sample of media from the B2 copy and verify its hashes and playback (Record 6 §4). Record date, duration and the recovery point reached | **Once, successfully, before any creator other than the owner is invited** (Record 2 P12.2) |
| Automated verification (*deferred option*) | Restores the newest dump into a throwaway database, applies the migration check, runs the role-posture and forced-row-rule checks, the two-Account smoke, row counts against the source, and hashes a random sample of replica objects. Writes pass or fail and its age to the heartbeat | Cadence deferred (P12.3); #75 proposed weekly |
| Full manual drill (*deferred option*) | Starting from nothing but the operator's offline material: restore the database from the second vendor into a **new Postgres host**, restore a project's media from the replica, repoint a staging-shaped app, sign in, open a project, play a Take; recover own-key ciphertext with the offline KEK; replay the purge log; time the whole run | Whether and when it gates is deferred (P12.3); #75 proposed before the first invitation, after vendor or major schema changes, and quarterly |
| Point-in-time drill (*deferred option*) | Recovers the database from the WAL archive to a moment before a deliberately bad change, into a separate database, and compares | Deferred (P12.3) |

**Gate.** No creator other than the owner is invited until one restore test has passed and its result is recorded with date, duration and the recovery point reached (Record 2 P12.2). The media floor of §8.1 (B2 copy and primary Bucket Lock) is in place (Record 6 §4). Cap defaults and the hidden operator ceiling size remain parked and must be set before the first invitation (Record 2 P12.4; BUSINESS §9). Recovery targets are not set until the backup policy is decided; the restore test's measured time is the first evidence for them.

**Runbooks** are build deliverables in the repository, one page each, exercised in restore testing: worker down or stalled; deploy rollback by digest; Postgres down or restarted on the VPS; VPS loss (rebuild a host from the image and restore from off-machine backups); storage-account loss; point-in-time recovery from the WAL archive after a bad change; R2 object loss or Cloudflare account loss (recover media from the B2 copy); provider key revoked or leaked (rotate, revoke, review spend); platform secret leaked (rotate, revoke sessions); KEK rotation; Account lockout and suspension; restore after a purge.

**Recovery posture by design.** Nothing in the processes is stateful (RUNTIME-PLATFORM §4.4), so recovering means restoring the database and storage and starting two process roles. On the VPS default that means a fresh host from the same image; exit paths for each vendor are RUNTIME-PLATFORM §9.

**Residual risk stated plainly.** The deployer owns the infrastructure accounts and can technically read the database and storage. "Private media" (§18.4) is enforced between creators and in every operator surface, which are content-free, but is not a promise against the deployer's own infrastructure access; client-side encryption of media would be a different product. Break-glass reads are an operator procedure outside the product.

## 10. Provider configuration

| Topic | Decision |
|---|---|
| **Catalogue** | Offerings, capability profiles, rankings and tiers are **reviewed data in the repository**, changed by diff with evidence and golden fixtures (ADR 0015). A search for vendor names outside Catalogue and adapters must find nothing (build rule R9) |
| **Operational overlay** | Status, enablement and route ranking are audited data in the database, changed by operator actions or by drift detection, which can only suspend or alert (F5) |
| **Per environment** | Keys, enablement and ranking are environment values. Production never loads a fake (F2). Staging enables real Offerings only where a staging key exists |
| **Price entries** | Looked-up entries refresh automatically; published entries are reviewed data with a date; staleness and drift alert (BUSINESS §4.3) |
| **Webhooks** | Each webhook-capable provider is registered with the environment's callback URL and signing secret, a setup checklist item verified in each environment's smoke run |
| **Outer wall** | Prepaid balance or spend limit at every provider (S9); recorded before the first invitation and rechecked quarterly |
| **Retirement watch** | The deprecation watch, review ages and conformance probes of PROVIDERS §10.4 run as scheduled worker checks and feed §7.2 |

## 11. Security tests: the isolation gates

The baseline fixes the **gates** that must exist and block merge; the harness, the other checks and the gate matrix are in [`VERIFICATION-AND-OBSERVABILITY.md`](VERIFICATION-AND-OBSERVABILITY.md) (#76, checks VC1 to VC17; these gates are **VC7**, and the numbering of isolation gates G1 to G11 is unchanged). Each maps a V1 failure to an executable test. #76 extends two: **G8** also plants a prompt in a Rendered request and a call-log response and asserts absence from operator views, alerts, metrics and the verification status endpoint (not only logs and errors); **G11** also covers the fake-provider lines of that document's §3.2 (production root refuses a fake, the send gate refuses it, readiness reports none loaded).

| Gate | Asserts | V1 failure answered |
|---|---|---|
| **G1 Two-Account operations** | For every operation in the contract, Account B calling with Account A's ids is refused, and the refusal is **indistinguishable from not-found** (no existence leak, same shape and timing class) | Sub-resource ids unbound (`images/generate`, frame routes, video-job read and retry) |
| **G2 Route inventory** | Every route resolves a `Scope` or is on the short public allowlist (health, webhook, auth, invitation); a new route outside both fails the build | Authenticated-only utility routes with no ownership (`/api/llm/*`, seed) |
| **G3 Stream** | Account B's cursor never receives Account A's events, including after reconnect with a foreign `Last-Event-ID` | (new surface) |
| **G4 Worker and webhook** | A Job row whose Account differs from its target, a forged or replayed webhook, and a lease claimed for the wrong Account all fail closed; background work acts under its Job's Account | Async routes that bypassed ownership |
| **G5 Media** | Account B cannot obtain or use a signed URL or key for Account A's media, including by guessing hash-named keys; signed URLs are short-lived and never logged | Storage path conventions without enforcement |
| **G6 Operator surface** | `operator_read` can select only from the listed content-free views; every operator endpoint rejects a non-operator and an operator without a second factor | (new surface) |
| **G7 Role posture** | From the catalogue: `app`, `scheduler`, `identity`, `operator_read` are non-owner, non-superuser, without bypass; `backup` is the only role with bypass and cannot write; every table carrying an Account has forced row rules and a default-deny policy; no tenant view is definer-rights; no function in an exposed schema is definer-rights without an Account check | Service-role client; RLS never applied |
| **G8 Secret canary** | A planted fake key and fake prompt are absent from logs, error events, responses, events and Generations across every adapter failure path | Echoed `error.message`; keys in records |
| **G9 Auth abuse** | Signup route absent; invitation single use, expiring and email-bound; recovery revokes sessions; sign-in and recovery rate limits hold; responses do not reveal whether an email exists | (new surface) |
| **G10 Catalogue integrity** | No creator-mutable row without an Account; Catalogue and prompts cannot be edited through any creator route | Seeded null-creator rows editable by anyone |
| **G11 Environment guards** | A production boot with a fake adapter, a missing secret or a real key in a lower environment fails | Mock provider silently the default |

G1, G3 to G5 and G11 are generated from the contract and role grants, so a new operation is covered without writing a test.

## 12. Explicit deferral list

Not part of the baseline, and not to be invented without a decision:

- Per-pull-request preview environments; load and soak testing. (Large-project performance budgets are decided in #76: shape budgets on every merge, timing budgets nightly and at promotion, [`VERIFICATION-AND-OBSERVABILITY.md`](VERIFICATION-AND-OBSERVABILITY.md) §8; only load and soak stay deferred.)
- Browser session replay (excluded outright); distributed-tracing backend; a metrics and dashboard stack; a status page.
- Creator-required second factor (revisited when BYOK ships); social or enterprise single sign-on; an operator console UI beyond the minimum endpoints.
- An external key-management service or hardware security module (the `Vault` port is the exit); automatic key rotation.
- A web application firewall, DDoS service or custom domain for private media (RUNTIME-PLATFORM §3 fact 7); application rate limits and platform limits are the baseline.
- Automated failover across regions or vendors; chaos testing beyond the kill-a-worker tests. (Continuous WAL archiving is no longer deferred: it is part of the backup floor, §8.1.)
- The backup policy beyond the floor (Record 2 P12.3; the media copy and Bucket Lock joined the floor in Record 6 §4): number of database copies, retention values, copy frequency, a second independent vendor for the database, restore-drill cadence, further no-delete credential design, the full manual drill gate.
- Software bill of materials, signed builds and attestations; third-party penetration testing; compliance programmes. (Synthetic-media disclosure is ruled in §15.)
- The BYOK setup flow itself, permanent project and account purge and its purge log, anonymised spend retention after purge, an Account data export, and the default caps and ceiling values: all named elsewhere and scheduled after the core build.
- Numeric tuning (session lifetimes, rate limits, thresholds, retention values, drill intervals as defaults): spec.

## 13. Hand-offs

| Ticket | Receives |
|---|---|
| **Persistence and media storage** (#72) | The `identity`, `operator_read` and `backup` identities and their grants (§5); the auth schema kept apart; the migration gates (§4.2) for whatever tool is chosen; ciphertext rows for own keys bound to Account and provider; the purge log as a durable record that restores replay; backup retention once the deferred policy sets it (§8), and the project-separable key layout that purge and the B2 media copy rely on; content-free operator views as a named set |
| **Build sequence** (#77) | Stand up first: one VPS running `web`, `worker`, Postgres and the backup job as containers; R2 for media and backups; the backup floor (daily dump and continuous WAL archiving off the machine, §8.1); the pipeline with its gates; before BAR, the media floor (B2 copy job and primary Bucket Lock, §8.1, Record 6 §4) and **one successful restore test, including media, before any creator other than the owner is invited** (§9). Early tracer pieces: invitation → Account → `Scope`, the typed logger and scrubber, the heartbeat |
| **Verification** (#76, resolved in [`VERIFICATION-AND-OBSERVABILITY.md`](VERIFICATION-AND-OBSERVABILITY.md)) | Isolation gates G1 to G11 and their generation from the contract and grants; the secret canary (isolation gate G8, extended); the role-posture check; `Mailer`, `Vault` and `ErrorSink` fakes under the conformance suites; environment guards (isolation gate G11, extended); a verification status endpoint beside `/healthz/deep`; promotion reads live-evidence records; staging hosts capped smoke and eval Accounts |
| **Providers** (#66) | Credential handle only; per-environment keys; webhook secret per environment; the retirement watch feeding alerts |
| **Business and operations** (#68) | S10 mapped to alerts (§7.2); operator actions (§2.3); invoice reconciliation remains an operator task |

## 14. Constitution check

No requirement was found unworkable or contradictory; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** §15.5 (collaboration out) holds: the only capability that is not a creator's own is the deployment's operator, defined by configuration plus a second factor, with content-free views; there are no roles or permissions. §18.4 holds between creators and on every operator surface; §9 states the limit honestly. Principle 3 ("nothing is lost inside a project") is met at baseline by continuous WAL archiving and a daily dump off the machine, an offline route to the keys, and, before others are invited, an independent media copy, a primary Bucket Lock and a restore test that covers media (Record 2 P12, Record 6 §4); further copies and drill cadence are a deferred creator decision. Principle 12 is met: no extra state store, no queue, and every check reads the database that is already the truth. M4 to M7 are met by §2, §3 and §8.

## 15. Synthetic-media disclosure (ruling, #79; Record 6 §2)

Providers may embed marks or metadata in generated media (for example C2PA manifests or watermarks). Rulings:

1. **Aiuteur never strips provider-embedded marks or metadata.** Originals are immutable. The one default transcode, VFR→CFR at export build, is the only re-encode and is recorded; whether it preserves marks is an export fact tested in the VC16 NLE import check (VERIFICATION-AND-OBSERVABILITY §5.3 step 7 and §5.4).
2. **V2 adds no Aiuteur-specific marking** to Takes, Frames or exports, unless a relevant legal or platform requirement later establishes that it is necessary.
3. **The export manifest records `synthetic` provenance per Take**, read from the Generation record already stored. No new data is captured.
4. **No legal-role gate.** The EU AI Act Art. 50 / C2PA legal-role review is not a BAR item, invitation gate or operator task for the initial U.S.-based, invite-only product. It is a compliance review to do before expanding into jurisdictions where those obligations may apply, including the EU, written up only as reference in [`docs/post-release/LEGAL-AND-COMPLIANCE.md`](../post-release/LEGAL-AND-COMPLIANCE.md) (Record 6 §2). No hook, checklist or checker enforces it. The rulings cover audio and voice output too.

## Record 2 amendment (P12, P8-purge): backups and restore

**Floor from day one** (a single VPS disk failure would otherwise lose every creator's work, violating Constitution §16.1 and Record 1 R1): an automated **daily database dump plus continuous WAL archiving to storage off the machine** (R2 is acceptable). **One successful restore test before any creator other than the owner is invited.** **Deferred, not decided:** number of backups and copies, retention, a second independent vendor, restore-drill cadence, the no-delete backup credential design, and the full manual drill gate described above. The body (§0, §§8, 9, 12, 13) now states this floor as current; the second-vendor copy, weekly verification and full-drill gate appear there only as deferred options. Cap defaults and the hidden operator ceiling size remain parked and must be set before the first invitation.

**Purge promise (when purge ships, M7):** gone from Aiuteur at once; any backup copies expire within a stated retention window, which is told to the creator at purge time.

## Record 6 amendment (2026-10-25): media floor and synthetic media

**Media joins the floor before the first non-owner invitation** ([Record 6 §4](../product/CREATOR-RATIFICATION-RECORD-6.md#4-media-backup-final-audit-c-b-record-2-p12)). There are two parts: an independent copy of committed media at Backblaze B2, made by a copy-only-new job under a separate account with credentials that cannot delete; and a retention Bucket Lock on the primary R2 bucket's committed-media prefix. The restore test also restores and verifies a sample of media. Both parts are operations work on the path to BAR, not T0. Retention values and copy frequency stay deferred.

**Synthetic media** ([Record 6 §2](../product/CREATOR-RATIFICATION-RECORD-6.md#2-cr-791-synthetic-media-legal-role-review-operational-baseline-15)): CR-79.1's provisional pre-invitation gate is withdrawn. §15 states the current rule.
