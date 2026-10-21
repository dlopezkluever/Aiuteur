# Managed platforms and durable-execution options for Aiuteur V2

Research note for Wayfinder ticket #73 (map #49). Facts accessed **2026-10-21**. Throwaway branch `research/platform-execution`; never merged. This informs **Runtime platform (#74)**, persistence (#72), operational baseline (#75) and providers (#66). It decides nothing and cannot override the Constitution. No `CONSTITUTION AMENDMENT REQUIRED` was found.

Detail, per-option notes, comparison tables and 250+ cited sources are in the five area reports (same folder, `platform-execution/`):

| Area | Report |
|---|---|
| Managed Postgres + invite-only auth | [postgres-auth.md](platform-execution/postgres-auth.md) |
| Private object storage, CDN, video delivery | [storage-cdn.md](platform-execution/storage-cdn.md) |
| Managed durable-execution engines | [durable-engines.md](platform-execution/durable-engines.md) |
| Postgres-backed queues / durable libraries | [pg-queues.md](platform-execution/pg-queues.md) |
| Hosting (API + workers) and progress channels | [hosting-realtime.md](platform-execution/hosting-realtime.md) |

Method: parallel research sub-agents read vendor docs, pricing pages, changelogs and repos. Dollar figures are for the scenario "5 creators, ~200 GB stored, ~100 GB/month video egress, ~3,000 jobs/month, ~2M poll/step executions/month"; where a figure is the agent's arithmetic from unit prices it is labelled estimate in the report. Items marked *not verified* in each report's last section remain open. The earlier generation-platforms research (#9) covers AI vendors, not infrastructure, so it was reused only for the vendor-side job behaviours (webhooks, cancel, one-hour output URLs) already folded into `JOB-LIFECYCLE.md` §9. The old platform/durable-execution tickets never completed, so there was nothing else to reuse.

## 1. The finding that frames everything

**No durable-execution engine, managed or library, replaces the lifecycle's own database guarantees.** All of them add timers, retries and orchestration on top of a database that remains the source of truth:

1. **Compare-and-set, leases, outbox** (JOB-LIFECYCLE §3, §12). No managed engine can join our DB transaction, so each still needs an outbox relay or sweeper (start run with run id = Job id so duplicate starts are no-ops). Only Postgres-backed libraries (DBOS, pg-boss, River, Graphile Worker, Absurd) give "enqueue in the same commit" for free.
2. **The crash window between "provider accepted" and "operation reference stored"** (§7). Every engine checkpoints a step after it returns, so a crash in between causes a retry and a possible double submission. No option closes it. The answer stays the lifecycle's own: write-ahead intent row, Job-id-derived provider key, lookup/reconcile, else `submission_unconfirmed`.
3. **Per-state deadlines, circuit-breaker state, per-Account atomic spend-cap check** (BUSINESS-AND-OPERATIONS §6.3, S7): no option provides them. They are small tables plus a sweeper in any design. The cap check must stay a DB transaction.
4. **Purge.** Engines retain run payloads for a retention period and mostly cannot delete per tenant (Vercel cannot delete finished runs at all). Rule for any choice: **engine payloads carry ids only**, never prompts, media or keys.

So the real choice is how much *scheduling* machinery to buy versus write, not whether the lifecycle needs a database.

## 2. Shortlist per need (dated 2026-10-21, not a recommendation)

### 2.1 Durable execution / queue

Three shapes, with the facts that decide between them.

| Shape | Candidates | What it buys | What it costs |
|---|---|---|---|
| **A. Postgres-only, own scheduler** (SKIP LOCKED + lease + `not_before` table + sweeper) | baseline; or **pg-boss v12** as the queue primitive | Full RLS and Account control; outbox for free; no extra vendor or data egress; $0 | ~1,000–1,500 lines plus crash tests (estimate in pg-queues §roll-your-own); pg-boss and Graphile each ~85% one maintainer |
| **B. Postgres-backed durable library** | **DBOS Transact (TS)**; Absurd (pre-1.0, 0.5.1, ~95% one author) | Durable sleep, wait-for-message with timeout, dedup, same-transaction checkpoint; partitioned queues for per-Account / per-provider limits | DBOS needs a direct or session-mode connection (no transaction-pooler); with several instances, auto-recovery needs Conductor ($99/mo, proprietary client since v5.3); polling keeps the DB awake |
| **C. Managed engine, our compute** | **Hatchet** (MIT; Lite needs only Postgres; strongest per-key limits and round-robin fairness; built-in webhook signature checks; $0–30/mo; pay-as-you-go from 2026-09-29), **Inngest** (~$149 Pro; two concurrency keys; SSPL), **Temporal Cloud** (MIT; $100–200/mo; fairness keys, no per-key concurrency cap found), **Restate** (BSL; ~$75; no rate limits yet) | Timers, retries, UI; code runs on our servers so BYOK keys are decrypted only there | A second state store to keep consistent with Postgres; outbox relay; per-run step caps (Inngest 1,000, Temporal 51,200 events) shape long polling loops |
| **D. Managed engine, vendor compute / platform-bound** | Trigger.dev v4 (Apache-2.0), Vercel Workflows (GA 2026-04-16; ~$120/mo estimate, pricing pages disagree), Cloudflare Workflows (~$33/mo; per-step billing from 2026-08-10), Step Functions (~$150), Lambda durable functions (~$50), Upstash Workflow ($20–40 plus add-on) | Least infrastructure to run | Prompts/keys transit or run on vendor machines (relevant to BYOK); no per-key fairness on Vercel/Cloudflare/AWS/Google; platform lock-in |

Per-Account/per-provider fairness is the clearest discriminator: Hatchet strongest; DBOS partitioned queues (hard, runtime-changeable); Trigger.dev and Inngest per-key; pg-boss `groupConcurrency` (soft, "may be slightly exceeded"); Restate and Temporal limited; Vercel/Cloudflare/AWS/Google none; River's only in Pro ($125/mo).

Crash-recovery detail: pg-boss heartbeats recover in seconds; Graphile Worker leaves a crashed worker's jobs locked ~4 h without Pro; River free waits ~1.5 h for a 30-minute job; DBOS single-node recovers on restart.

Long waits (30 min) fit every engine; run-duration limits range from 30 days to none.

### 2.2 Postgres platform

Shortlist: **Neon** (~$21/mo always-on estimate; now "Lakebase Postgres from Databricks"), **Supabase** (as plain database $25; PITR 7 days is +$100/mo), **PlanetScale Postgres** ($5 single node, no failover), **Railway Postgres** (~$20 estimate); fallback **Fly Managed Postgres** ($38+, failover, but no pg_cron/pgmq/pg_partman). Tembo no longer sells managed Postgres; Crunchy Bridge is Snowflake-owned. The lifecycle needs only core Postgres (`FOR UPDATE SKIP LOCKED`); extensions are optional.

Operational facts: **LISTEN/NOTIFY and session settings (`SET`/`set_config`) break through transaction-mode poolers** (Supabase, Neon, PlanetScale, Railway-transaction). Scale-to-zero is moot because polling workers keep the DB awake; Neon's pg_cron stops while suspended, so timers belong in rows workers poll.

### 2.3 Auth (invite-only)

Shortlist: **Better Auth** (free library, data in our own DB, recommended by the Auth.js maintainers; we write a small `invitations` table), **Clerk** (free "Invite-only" mode; MFA/passkeys need Pro $25/mo; creates the account at redemption), **WorkOS AuthKit** (free to 1M users; custom domain $99/mo), **Supabase Auth** (only with Supabase as DB; its invite call creates the user when the invite is *sent*, not redeemed). Stack Auth is now Hexclave; Lucia is deprecated. Password-hash portability: Supabase Auth, Better Auth, Neon Auth keep hashes in our DB; Clerk exports CSV with hashes on all plans; Auth0 only via paid-plan support ticket.

### 2.4 Private object storage, CDN, video

Shortlist: **Cloudflare R2** (~$2.85/mo for the scenario; free egress; temporary credentials scoped to a key prefix `acct/<id>/`; deletes free; up to 1M buckets; signed URLs only on the `r2.cloudflarestorage.com` host, so a custom domain needs a small Worker or Pro WAF HMAC), **Tigris** (~$4.55/mo, free egress, signed URLs up to 90 days), **Backblaze B2** (~$1.32/mo, free egress up to 3× stored, no IAM roles), **AWS S3 + CloudFront** (~$5.25/mo; STS session-policy scoping; GuardDuty malware scan; keep versioning off). Supabase Storage fits only if Supabase is the platform (RLS on `storage.objects`; its server bypass is the service key). Excluded: Wasabi (1 TB / 90-day minimums vs purge), GCS ($0.12/GiB egress, 7-day billed deletes). All options cost under ~$17/mo at the scenario; egress separates them only at low-TB scale and for ZIP exports.

**No managed video service is needed** for 4–12 s clips: range-request MP4 from signed URLs plays and scrubs in browsers if the index is at the front (`ffmpeg +faststart`), and NLE export needs the originals. Mux (fallback) or a low-bitrate preview copy per take is the escalation. Mint signed URLs with TTLs long enough for playback and re-mint on 403 (expiry is checked per request, so seeking after expiry fails). Signed PUT URLs cannot cap upload size; verify with HEAD after upload.

### 2.5 Hosting for API and workers

Shortlist: **Fly.io** (2×512 MB ≈ $7.4/mo), **Render** ($7 worker + $7 web), **Railway** (≈$5–10, usage-based), **Hetzner CX23 + Coolify** (cheapest, no platform limits, self-operated). Cloud Run worker pools (~$26/mo) only if GCP is chosen anyway. Flagged: AWS App Runner closed to new customers 2026-04-30 (ECS Express ≈$40+/mo); Koyeb is joining Mistral AI; Vercel Daemons (always-on workers) entered public beta 2026-10-15, production-only, no private DB network; Cloudflare Containers sit behind Durable Objects with ephemeral disk. ffmpeg (probing) needs container support, which the shortlist all have.

**Graceful-shutdown windows are shorter than a 30-minute job on every host** (Cloud Run 10 s, Railway 0 s default, Fly 5 s default/300 s max, Render 30 s/300 s, Fargate 120 s max; Cloudflare Containers 15 min). Whatever host, work must resume from DB state, which the lifecycle already requires (§7).

### 2.6 Progress channels

Shortlist: **SSE from our own API replaying from the outbox/events table via `Last-Event-ID`** (unlimited replay, no vendor, works under every connection cap: Railway HTTP ~15 min, Cloud Run 60 min, Vercel 300–800 s), with polling as universal fallback and LISTEN/NOTIFY only as a wake-up hint. Managed alternative: **Ably** (free 200 connections / 6M messages; per-Account channel scoping via issued token; auto-resume ~2 min then 1–30 days history). Come-free-with-another-choice: Supabase Broadcast-from-database (Supabase only; replay ≤25 messages/request, ≥72 h), Inngest/Trigger.dev Realtime (engine only; Inngest has no server-side replay). Excluded: hosted PartyKit shuts down 2026-10-23; Liveblocks is overkill.

## 3. Multi-tenant isolation across the shortlist

Requirement (Ratification M4; BUSINESS-AND-OPERATIONS §1.2, §12): isolation on every path including background work, events, exports and storage keys; **no option may need an unrestricted shared database identity for ordinary requests**.

| Layer | Finding |
|---|---|
| Database | Isolation is **our discipline, not a vendor feature** on every platform. Superusers, `BYPASSRLS` roles and table owners skip RLS unless `FORCE ROW LEVEL SECURITY`. Supabase's secret/service key bypasses RLS: exactly V1's failure. Safe pattern (inference): app connects as a non-owner role, forces RLS, sets account id per transaction with `set_config(..., true)`; this needs session-capable connections or per-transaction statements, which constrains pooler mode. Workers need an explicit design: either act under the Account's id per Job, or use a narrowly-scoped worker role (never a superuser) and touch only rows by Job id. |
| Job tables / queues | Library tables (pg-boss, DBOS, River, Graphile) are not RLS-aware; they carry no account column of their own. Account id must be in the Job payload/row and any cross-tenant read by a worker role is a design decision for #72/#74. Managed engines hold data outside our DB; ids-only payloads keep Account content out. |
| Fairness | Per-Account/per-provider caps: native in Hatchet, DBOS (partitions), Trigger.dev, Inngest; soft in pg-boss; DIY otherwise. |
| Secrets / BYOK | Engines running code on our servers (Temporal, Inngest, Restate, Hatchet, Upstash, libraries) decrypt keys only on our machines. Trigger.dev Cloud, Vercel and Cloudflare run steps on vendor compute. Credential resolution stays by (Account, provider) in our DB either way. |
| Storage | R2 prefix-scoped credentials, S3 STS session policies and Supabase RLS limit minting in the store itself; elsewhere app-level only. Prefix-per-Account and per-project keys make purge a delete-by-prefix (free on R2; check versioning elsewhere). |
| Realtime | Own SSE: authorise by session and filter the events table by Account. Ably: token-scoped channels. Supabase: RLS-authorised. |
| Hosting | All hosts run tenants in shared processes; isolation is the DB role + request context, not the host. |

## 4. Limitations and fallbacks

- **Provider URLs vs engine retries:** the engine alone cannot make fetching idempotent; storage keys derived from Job id + content hash (JOB-LIFECYCLE §7) remain required.
- **Pooler vs RLS/LISTEN:** if the DB is behind a transaction pooler, use per-transaction `set_config` and poll the outbox; or use direct/session connections for workers and the SSE service.
- **Scale-to-zero compute** cannot own timers; any shortlist needs an always-on worker or an external scheduler (an engine's cloud) to wake it. The lifecycle's rule that a stopped worker costs only the lease interval holds provided something wakes the sweeper.
- **Single-maintainer libraries** (pg-boss, Graphile Worker, Absurd): fallback is the DIY baseline, which uses the same patterns.
- **Vendor churn in 2026** (Neon/Databricks, Tembo pivot, Koyeb, PartyKit shutdown, App Runner closure, Temporal and Hatchet pricing changes, Vercel pricing inconsistency) argues for keeping the provider-neutral seams the lifecycle already requires and for choosing S3-compatible storage and plain Postgres as the exit paths.
- **Egress at larger scale / ZIP exports** could shift storage choice; revisit if projects reach low-TB.

## 5. Deciding facts for #74 (the questions that pick among the shapes)

1. Is a **second state store** (engine) acceptable beside Postgres, given outbox relay and consistency work? If no → shape A or B.
2. Does the team want **per-Account/per-provider fairness native** (Hatchet, DBOS, Trigger.dev, Inngest) or accept DIY/soft limits at 1–50 creators?
3. Can workers use **direct or session-mode Postgres connections** (required by DBOS, helpful for RLS `set_config`, LISTEN/NOTIFY)?
4. Where may **BYOK keys be decrypted**: only on our servers (excludes vendor-compute engines)?
5. Is **Conductor-class recovery** (DBOS multi-node, $99/mo) or a single always-on worker enough at this scale?
6. Is **Supabase** chosen as DB? If yes, Auth, Storage, Realtime come bundled but with the service-key bypass hazard; if no, they are separate decisions (Better Auth / Clerk; R2; own SSE).
7. Custom domain for private media (R2 needs Worker/WAF) vs host-native signed URLs.
8. Operating a **VPS** (cheapest, most control) vs a PaaS with short shutdown grace.
9. Engineering appetite for ~1–1.5k lines of scheduler plus crash tests vs adopting a dependency with a small maintainer base.

## 6. Open (not verified)

See "Not verified / open" in each report. Material ones: Vercel Workflow price (pages disagree: ≈$50 vs ≈$120 at 2M steps); AWS S3/RDS list prices (secondary sources); Hetzner US prices; Supabase admin invite with sign-ups disabled; DBOS and pg-boss under transaction-mode poolers; River Pro from its TypeScript client; Hatchet max sleep and free-tier values; R2 signed URLs from prefix-scoped credentials; minimum billed duration on Mux/Cloudflare Stream. Video-service cost assumes ~20 Mb/s; confirm against real provider output bitrates.
