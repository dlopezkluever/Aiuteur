# #73 research: Hosting (API + long-running workers) and Realtime/progress channels

Accessed 2026-10-21 unless noted. **Q** = quoted or near-verbatim from a primary source. **I** = my inference or arithmetic. "NV" = not verified this session.
Scenario for costs: 5 creators, ~3,000 jobs/month, ~2M poll/step executions/month, 1 small API + 1 small always-on worker, ~100 GB/month video egress. Note: video egress should go from object storage via signed URLs, not through the API host (I). Host egress is still listed in case media is proxied.

## 1. Hosting: comparison table

| Option | Max request duration | Always-on worker, 1 small instance/mo | Scale-to-zero / cold start | Graceful shutdown on deploy | Private net to DB | SSE/WS | ffmpeg (container) | Previews | Scenario $/mo (API+worker, I) | Status flag |
|---|---|---|---|---|---|---|---|---|---|---|
| Fly.io Machines | No platform HTTP cap found; `idle_timeout` configurable [2] (I: no hard cap NV) | shared-1x 256MB $2.19; 512MB $3.69 [1] | autostop `stop`/`suspend`, `min_machines_running` (primary region only) [3] | `kill_signal` (default SIGINT) + `kill_timeout` default 5s, **max 300s** [2] | 6PN WireGuard mesh per org, `.internal` DNS [4]; MPG from $38/mo [1] | Yes (I) | Yes, any Dockerfile | No built-in (NV; GH Action pattern) | ~$7.4 compute (+$2 if 100 GB proxied at $0.02/GB) [1] | No free tier for new orgs [1] |
| Railway | Public HTTP: **15 min** while data flows, 5 min idle; WebSockets exempt [6] | Usage: $20/vCPU-mo, $10/GB-RAM-mo; Hobby $5 includes $5 usage [5] | "Serverless" sleep after 5 min no *outbound* traffic; first request may 502 [8] | SIGTERM, **default 0s** drain; `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` [7] (max NV) | `*.railway.internal`, WireGuard, per-environment isolation [10] | WS yes; SSE subject to 15-min cap [6] | Yes (Docker) | PR environments, auto-deleted on merge [9] | ~$5–10 compute (I: utilisation-based) + $0.05/GB egress [5] | Community reports of a 5-min cut in Aug 2026 [6b] |
| Render | Web: up to **100 min** (Render's own articles) [12] | Background worker $7 (0.5 CPU/512MB) [11] | Free tier only spins down (15 min idle, ~1 min wake) [12b]; paid always-on | SIGTERM 60s after cutover; default 30s, **max 300s** (`maxShutdownDelaySeconds`); not customisable with persistent disk [13] | Automatic private networking [11] | WebSockets yes [11] | Yes (Docker) | Single-service previews (Hobby); full-stack previews (Pro $25) [11] | $14 compute; bandwidth 5 GB incl (Hobby) then $0.15/GB → ~$14 if 100 GB proxied [11] | Also sells Workflows (task runtime) [11] |
| Google Cloud Run | Services: default 300s, **max 3600s** [15]; Jobs: separate task timeout | Instance-billed: $0.000018/vCPU-s, $0.000002/GiB-s; **worker pools** $0.000011244/vCPU-s, $0.000001235/GiB-s [14] | Request-billed scale-to-zero; min instances billed at idle rate [14] | SIGTERM then **10s** to SIGKILL (services, jobs, worker pools) [16] | VPC (Direct VPC egress NV) | WS/SSE are requests, **capped at 60 min**; reconnect required [17] | Yes (container); FS is in-memory [16] | Revision tags (NV) | API ≈$0–5 (free tier); worker pool 1 vCPU/0.5 GiB ≈ $30.7 minus free tier ≈ $25.5 (I) [14] | 10s shutdown is short |
| AWS App Runner | — | — | — | — | — | — | — | — | — | **Closed to new customers from 2026-04-30**; maintenance mode; AWS points to ECS Express Mode [18] |
| AWS ECS Fargate (Express Mode) | ALB idle timeout (NV) | x86 $0.000011244/vCPU-s, $0.000001235/GB-s → 0.25 vCPU/0.5 GB ≈ $9.0 (I) [19] | Express Mode sets up autoscaling + ALB [20] | `stopTimeout` default 30s, **max 120s** [21] | VPC (native) | Yes via ALB (I) | Yes | DIY | ~$18 tasks + ALB (shared across Express services [20]; price NV, ~$16+) + IPv4 (NV) ≈ $40+ (I) | Most ops surface |
| Vercel | Functions: 300s default; Pro **800s**, 1800s beta [22] | **Daemons** (public beta, 2026-10-15): containers, fixed instance count, prod-only; $0.128/CPU-h active + $0.0212/GB-h [25][24] | Functions scale to zero; Daemons don't | Daemons: SIGTERM + `terminationGracePeriodSeconds` (docs show 10s and 30s defaults) [25] | No VPC; static IPs $100/project [24] | WebSockets public beta; streaming counts toward max duration [23] | Container images in Functions (new), 250 MB bundle / 5 GB beta [23][26] | Best in class (per-branch preview deploys) | Pro $20/seat + Workflow steps (see realtime section) | Daemons don't run in previews; beta [25] |
| Cloudflare Workers + Containers + DOs | Workers HTTP: **no wall limit while client connected**; CPU max 5 min; cron/queue/alarm 15 min [28] | Container `basic` (¼ vCPU, 1 GiB, 4 GB): mem $0.0000025/GiB-s, CPU $0.00002/vCPU-s (active only), disk $0.00000007/GB-s; Workers Paid $5 [27] | `sleepAfter` → scale to zero; cold start "often 1–3 s" [29] | SIGTERM then SIGKILL after **15 min** [29] | No VPC to external Postgres (I; Hyperdrive NV) | WS natively via DOs (hibernation) [30] | Yes (linux/amd64 image) [29] | Preview URLs (NV) | ~$5 + ≈$7 container always-on (I) [27] | All disk ephemeral; instance placement is global [29] |
| Koyeb | NV | micro (0.5 vCPU/512MB) $5.36; Pro plan $29 incl. $10 compute [31] | Scale-to-zero in **public preview**; WS wake lives "a few minutes" [31b] | NV | NV | NV | Yes (Docker) | NV | ~$29.7 (Pro + 2×micro) (I) | Joining **Mistral AI** (announced 2026-02-17) [32]; reports of restricted signups (secondary, NV) |
| Hetzner VPS + Docker/Coolify | None (your proxy) | CX23 (2 vCPU/4 GB) **€5.49** + €0.50 IPv4 (new orders since 2026-06-15) [33] | None (always on) | Whatever you configure (docker stop timeout) | Same host/LAN | Yes | Yes | Coolify has preview deploys (NV); Coolify self-host free, Cloud $5/mo [34] | ~€6 total, runs API+worker+Postgres (I) | You own patching, backups, uptime; CX stock "sold out" reports (secondary) |

Secrets: all PaaS options have encrypted env/secret stores (Fly secrets, Railway variables, Render env + secret files [11], GCP Secret Manager, AWS Secrets Manager/SSM, Vercel env, Cloudflare secrets). Vendor-specific details were not checked individually (NV). On a VPS, secrets live in Coolify/docker env (I).

Regions (I, general knowledge, NV in detail): Fly ~30+ regions; Railway 4 regions (secondary source [6c]); Render several US/EU/SG; Cloud Run and Fargate are global; Vercel functions default `iad1`, set per project [23]; Cloudflare places containers automatically [29]; Hetzner EU, plus US/SG with much higher US prices and 1 TB traffic in the US vs 20 TB in the EU (secondary [33b]).

## 2. Hosting: per-option notes

**Fly.io.** Machines bill per second. 512MB is $3.69/mo; a stopped Machine bills only its rootfs at $0.15/GB [1]. Q: autostop's stop loop "runs every few minutes and stops at most one Machine per region per pass" [3]. Workers should run as a separate process group with autostop `off`. Q: `kill_timeout` "default is 5 seconds… up to a maximum of 300 seconds", and after the timeout Fly sends SIGTERM unconditionally [2]. A 30-min Job cannot finish inside the deploy window, so Jobs must survive restarts through leases and durable state; that is already required (I). Q: 6PN means "applications from other organizations can't" reach you; `.internal` DNS returns only *started* Machines [4]. Managed Postgres starts at $38 [1]. Local dev uses the same Docker image (I). V1 ran on Fly. That is no reason to choose it, and it is also no reason to reject it: V1's failures were about isolation and in-process jobs, not the host (I).

**Railway.** Q: "HTTP requests can run for up to 15 minutes if data keeps transferring… Websocket connections are exempt… can stay open indefinitely" [6]. An August 2026 community thread reports requests being cut at exactly 5 min [6b]. Q: on redeploy, the old deployment gets SIGTERM "given 0 seconds" by default [7]. You must set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`; the maximum was not verified. App sleeping needs 5 min with no *outbound* traffic, so a worker that holds a DB connection will not sleep [8]. PR environments are automatic [9]. The pricing page also lists "VM pricing" at $50/GB-RAM, a separate product that was not investigated [5].

**Render.** Background worker and web service both start at $7. Cron jobs bill per minute ($0.00016/min at 512MB) [11]. Q: zero-downtime deploys are lost if a persistent disk is attached, and the shutdown delay can't be customised then [13]. Hobby includes only 5 GB of bandwidth, then $0.15/GB [11], so don't proxy media through it (I). Render also sells "Workflows" (durable tasks, 20 concurrent runs on Hobby) [11]. That belongs to the job-engine ticket.

**Cloud Run.** Three shapes:
- services: request-billed with scale-to-zero, or instance-billed;
- jobs: run to completion;
- **worker pools**: always-on, no HTTP, cheaper per-second rates [14].

Q: SIGTERM "indicating the start of a 10 second period" before SIGKILL [16]. This is the shortest graceful window of the PaaS options; the Job model must tolerate kills mid-step (I). The container FS is in-memory [16], so ffmpeg probing must stream or use small temp files (I). WebSockets and SSE are capped by the request timeout (max 60 min) [17].

**AWS.** App Runner: Q "no longer open to new customers… we do not plan to introduce new features" [18]. Exclude it. ECS Express Mode creates a Fargate service, ALB, autoscaling and networking, and shares an ALB across Express services [20]. Fargate's `stopTimeout` maximum is 120s [21]. Most knobs and most cost at this scale (I).

**Vercel.** Fluid compute bills active CPU at $0.128/h and provisioned memory at $0.0106/GB-h [24]. Max duration is 800s GA and 1800s beta on Pro [22], so a function cannot hold a 30-min Job; Workflow, Queues or Daemons must carry it. **Daemons** (public beta since 2026-10-15) run always-on containers that pull work. Q: "Only production deployments start Daemons. Preview deployments don't run them" [25b]. Daemon docs show both a 10s and a 30s default SIGTERM grace, configurable via `terminationGracePeriodSeconds` [25]. There is no private network to an external Postgres; static egress IPs cost $100/project/mo [24]. The 4.5 MB request body limit [23] means uploads must go direct to storage (I).

**Cloudflare.** Workers on a $5 plan: HTTP has no wall limit while the client is connected; CPU per request is at most 5 min; cron, queue and DO-alarm invocations get 15 min [28]. Containers are addressed through a DO-backed `Container` class, each instance runs in its own VM, and Q: "SIGTERM… then a SIGKILL signal after 15 minutes" [29]. Disk is ephemeral [29]. Q: some instances "may be started in locations that are farther away from the end-user" [29]. Latency to a single-region Postgres is uncontrolled unless placement hints are used (I, NV). Running a Node/Postgres API here means adopting Workers semantics: 128 MB memory per isolate [28] and connection pooling via Hyperdrive (NV). **PartyKit hosted shuts down 2026-10-23** [36]; see realtime.

**Koyeb.** Q: "Koyeb has entered into a definitive agreement to join Mistral AI" (2026-02-17); "can I sign up today? Yes" at that time [32]. Pro is $29 with $10 of compute included [31]. Scale-to-zero is in preview [31b]. Platform-direction risk is high (I).

**Hetzner + Docker/Coolify.** Official price-adjustment doc: CX23 €5.49/mo, CAX11 €5.99/mo, excluding IPv4 and VAT, for new orders and rescales since 2026-06-15 [33]. EU servers include 20 TB of traffic (secondary [33b]). Coolify self-hosted is free; Coolify Cloud is $5/mo for 2 servers [34]. This is the cheapest baseline and has no platform limits on duration, signals or ffmpeg. You own OS patching, Postgres backups/PITR, TLS, monitoring and single-host failure. That is ops, not "distributed-systems theatre", but it is not "managed" either (I).

### Per-account isolation on any shared-process host (applies to all rows; I unless cited)
- Every option runs all tenants in shared processes. Isolation must come from the data layer, not the host.
- Postgres facts (Q): "Superusers and roles with the `BYPASSRLS` attribute always bypass the row security system… Table owners normally bypass row security as well" unless `FORCE ROW LEVEL SECURITY` [37]. This is the V1 failure mode: a service-role key is a BYPASSRLS role.
- Pattern: the app connects as a login role that does **not** own the tables and has no BYPASSRLS. Each request opens a transaction, runs `SET LOCAL ROLE app_user` and `set_config('app.account_id', $id, true)` (transaction-local), and policies key on `current_setting('app.account_id')`. Owner-only migrations use a separate role. Add `FORCE ROW LEVEL SECURITY`.
- Pooler caveat (Q): PgBouncer transaction mode does not support `SET/RESET` or `LISTEN` [38]. Session-level `SET` leaks across pooled clients, so only `SET LOCAL` / `set_config(..., true)` inside a transaction is safe (I).
- Workers acting for an account should take the same path: they read `job.account_id` and set the same local context. Only lease/claim queries (cross-tenant scans) use a narrowly granted role or a SECURITY DEFINER function exposing just "claim next job", not table-wide access.
- Leakage failure modes: a forgotten transaction wrapper (the setting is unset, so the policy must default-deny via `current_setting(..., true)` IS NULL → false), connection reuse with a session `SET`, a cache keyed without account_id, a realtime channel name guessable without server-side authorisation (see §3), and logs/metrics carrying payloads.

## 3. Realtime / progress channels: comparison table

| Option | Extra vendor? | Per-account authorisation | Replay after disconnect | Limits at 5–50 users | Cost at scenario | Local dev / CI | Lock-in |
|---|---|---|---|---|---|---|---|
| **SSE from own API + `job_events` table** | No (falls out of API + Postgres) | Our session cookie; query filtered by RLS context (`EventSource` sends cookies with `withCredentials`, no custom headers) [39] | **Yes, exact**: browser resends `Last-Event-ID` on reconnect [39]; server replays `id > last` from events table (the outbox rows) | Host limits: Railway 15-min HTTP cap [6], Cloud Run 60 min [17], Vercel 300–800s [22]: reconnect handles all of these | $0 marginal | Full (Postgres + app) | None |
| Postgres LISTEN/NOTIFY fan-out | No | N/A (server-internal); NOTIFY "visible to all users" [40] | **None**: delivered only to sessions listening at commit [40] | Payload < 8000 bytes; queue 8 GB; requires a session connection, not a transaction pooler [40][38] | $0 | Full | None |
| Supabase Realtime (Broadcast from DB) | Yes unless DB is Supabase | Private channels: RLS on `realtime.messages` with `realtime.topic()` + Supabase Auth JWT; cached per connection [42] | Broadcast **Replay**: private channels, DB-sent msgs only, ≤**25 msgs per request**, retained 72h–4 days [43][41] | Pro: 500 conns, 500 msg/s [41] | Inside Pro $25: 500 peak conns + 5M msgs, then $10/1k conns, $2.50/M msgs [44] | Supabase CLI local stack (NV) | Medium (Supabase Auth JWT, `realtime.*` schema) |
| Supabase Realtime (Postgres Changes) | same | RLS checked per subscriber per event [45] | None documented (I) | Q: "processed on a single thread… larger compute add-ons don't meaningfully increase throughput" [45] | same | same | same |
| Ably | Yes | JWT/token capabilities per channel pattern, e.g. `account:{id}:*` subscribe only; `clientId` bound [47] | Auto-resume within **~2 min**; after that use history (`untilAttach`) [46]; storage 1 day free / 30 days Standard [48] | Free: 200 conns, 6M msgs/mo, 500 msg/s [48] | $0 (Free) or $29 Standard + usage [48] | Cloud only (no emulator found, NV) | Medium (SDK + channel model; but backend only publishes) |
| Pusher Channels | Yes | `private-` channels authorised by our auth endpoint [50] | No message history found in docs (NV, I) | Sandbox: 100 conns, 200k msgs/day [49] | $0 Sandbox, $49 Startup [49] | Cloud only (NV) | Low–medium |
| Cloudflare DO / PartyServer websockets | Yes unless hosting on CF | DIY in Worker before routing to a per-account DO (I) | DIY (DO SQLite can store events) (I) | Hibernation: duration not billed while idle; 1M requests incl., WS incoming msgs 20:1 [30] | ~$5 Workers Paid [30] | `wrangler dev` (workerd) (NV) | Medium–high (DO API) |
| PartyKit (hosted) | — | — | — | — | — | — | **Hosted platform shuts down 2026-10-23**; use PartyServer on own CF account [36] |
| Inngest Realtime | Falls out **only if Inngest is the job engine** | Server mints token for one channel + listed topics [51] | **None server-side**: Q "delivers each message to the clients connected when it's published"; hook buffers client-side only [52][53] | Free 50 conns / 250k msgs/day; Pro 1,000 / 1M/day [53] | Included in Inngest plan [53] | Inngest dev server (NV for realtime) | High (tied to engine) |
| Trigger.dev Realtime | Falls out **only if Trigger.dev is the job engine** | Public Access Token scoped to run IDs, tasks, **tags** (e.g. `account:{id}`), batch; default 15-min expiry, max 30 days [55] | Run *state* sync via Electric (HTTP Postgres sync): on reconnect you get current status/metadata (I: state, not event log) [54] | Free 10 concurrent conns; Hobby $10 → 150; Pro $50 → 1,000+ [56] | Inside plan [56] | Dev CLI (NV) | High (tied to engine) |
| Liveblocks | Yes | Room-level auth (NV) | Room storage (not a job log) | 10 connections per room (Free/Pro) [57] | Free/$30 Pro [57] | Cloud | High; **overkill**: built for collaborative state |
| Polling (`GET /jobs?since=`) | No | Same as API (RLS) | Inherent: always reads state | None meaningful (I: 50 users × 1 req/3s ≈ 17 req/s) | $0 | Full | None |
| Vercel Workflow streams | Falls out only if Vercel Workflow is the job engine | NV | "Streams… with managed persistence" [26] | "Real-time connections: No limit" [26b] | Workflow pricing (below) | NV | High |

Vercel Workflow pricing is **inconsistent across Vercel's own pages**. Pricing page: $20 per 1M events, 50K events included on Hobby [24]. Workflow pricing doc: "$2.50 per 100,000 Steps" and Q "a normal step… produces three events" [26b]. At 2M steps/month that is ≈$50 (steps basis) or ≈$120 (6M events at $20/M), plus Queues and function compute (I).

## 4. Realtime: per-option notes
- **SSE + events table** reuses the transactional outbox. The state change and the `job_events` insert happen in one commit (the brief requires this). The SSE handler sends `id: <event_id>`. On reconnect the browser sends `Last-Event-ID` [39], and the handler replays from the table under the request's RLS context. To learn about new rows without polling, use either a short DB poll (e.g. every 1–2 s per open stream) or one LISTEN connection per API process that wakes streams. NOTIFY is a hint only; the table is the truth (I). The spec makes the server-sent `retry:` field control reconnect delay, and HTTP 204 stops reconnection [39]. With 1–5 concurrent creators, connection count is trivial on any host (I).
- **LISTEN/NOTIFY** alone is not reconnect-safe. Q: delivered only to sessions that "previously executed LISTEN"; NOTIFY from an aborted transaction is never sent; payload < 8000 bytes [40]. It needs a dedicated session-mode connection [38]. Use it as a wake-up signal only (I).
- **Supabase Realtime.** Broadcast from DB uses `realtime.send()` / `realtime.broadcast_changes()` inside our transaction [43], which makes it outbox-compatible (I). Q: "the Realtime service connects to your database as the authenticated Supabase Admin role" [43]. The authorisation boundary is therefore the `realtime.messages` RLS policy plus private channels with "Allow public access" disabled [42]. A misconfigured public flag is a leakage path (I). Replay holds ≤25 msgs per request with a 72h minimum [41][43]: enough to resume a progress view, not a full audit (I). Postgres Changes authorises per subscriber and runs single-threaded [45]. Fine at 5–50 users, but Supabase's own docs steer high fan-out to Broadcast [45]. Not available if the DB is not Supabase.
- **Ably.** The strongest managed delivery semantics. Q: continuity if reconnected "within a limited interval (typically around two minutes)"; afterwards use history [46]. Capabilities restrict wildcard channel segments [47], so the server issues `{"account:<id>:*":["subscribe","history"]}`. Free tier covers the scenario [48]. Still needs our events table for gaps longer than the storage period (I).
- **Pusher.** Private channels are authorised by our endpoint [50]. No replay was found, so after a reconnect the client must refetch state from our API (I). Messages count both received and delivered [49].
- **DO / PartyServer.** Cheap with hibernation [30], but authorisation, replay and persistence are all DIY. Only sensible if the API itself lives on Cloudflare (I). Hosted PartyKit is gone in 2 days [36].
- **Inngest / Trigger.dev Realtime.** Engine-native and zero extra vendors *if* that engine is chosen. Inngest has no server-side replay [52][53]. Trigger.dev syncs run state, so reconnect-safety holds for "current status", but per-account scoping depends on tagging every run with the account [55]. Neither covers events that do not originate in a run, e.g. a spend-cap rejection before enqueue (I).
- **Liveblocks.** Collaboration rooms with per-room connection caps [57]. Wrong abstraction for a job log (I).
- **Polling.** Always correct, simplest, and survives every host limit. 2–5 s latency (I). A valid fallback for every option above.

## 5. Deciding facts (for #74)
1. **Graceful-shutdown window vs 30-min Jobs**: Cloud Run 10s [16], Railway 0s default [7], Render 30s/max 300s [13], Fly 5s/max 300s [2], Fargate max 120s [21], Cloudflare Containers 15 min [29]. None covers a 30-min in-process wait, so Jobs must be resumable from DB state (lease + poll timers), not held in process memory. The PaaS choice then matters little for correctness.
2. **Always-on worker supported natively?** Fly (process group), Render (background worker), Railway, Cloud Run worker pools, Fargate, Hetzner: yes. Vercel only via Daemons (beta, prod-only) [25]. Cloudflare only via Containers behind DOs [29]. Koyeb is in platform transition [32].
3. **Private network to Postgres**: Fly 6PN [4], Railway private net [10], Render private net [11], GCP/AWS VPC. Vercel and Cloudflare reach external Postgres over the public internet (Vercel static IPs $100/project) [24].
4. **Long-lived SSE caps**: Railway 15 min HTTP [6], Cloud Run 60 min [17], Vercel 300–800s function duration [22], Workers unlimited while connected [28]. Every channel needs `Last-Event-ID` replay anyway, so caps only change reconnect frequency.
5. **Realtime replay depth**: own SSE+events table = unlimited (our retention). Ably 2-min resume + 1–30 day history [46][48]. Supabase Broadcast replay 25 msgs / ≥72h [41]. Inngest none [53]. Pusher none found. Trigger.dev = current run state [54].
6. **Per-account channel authorisation is server-issued in every viable option.** Own cookie+RLS, Ably capability JWT [47], Pusher auth endpoint [50], Supabase RLS on `realtime.messages` [42], Inngest/Trigger scoped tokens [51][55]. No option makes "subscribe by guessing a channel name" safe without server checks.
7. **Extra vendor count**: SSE/polling/LISTEN add zero. Supabase Realtime adds zero only if the DB is Supabase. Inngest/Trigger.dev realtime add zero only if that engine is chosen. Ably/Pusher/Liveblocks always add one.
8. **Vendor status changes in 2026**: App Runner closed to new customers (2026-04-30) [18]. Koyeb → Mistral [32]. PartyKit hosted shutdown 2026-10-23 [36]. Vercel Daemons beta since 2026-10-15 [25]. Hetzner +30–40% on CX/CAX [33].
9. **Cost floor at scenario (compute only, I)**: Hetzner ≈€6 < Fly ≈$7.4 ≈ Railway ≈$5–10 < Cloudflare ≈$12 < Render $14 < Vercel $20+ < Cloud Run ≈$26 < Koyeb ≈$30 < Fargate ≈$40+.

### Dated shortlist (2026-10-21; not a recommendation)
- **Hosting, API + always-on worker:** Fly.io; Render; Railway; Hetzner+Coolify as the cost/no-limits baseline. Cloud Run (worker pools) if GCP is otherwise chosen. Excluded or flagged: App Runner (closed), Koyeb (transition), Vercel/Cloudflare (worker story beta/Container-DO-coupled; no private DB network).
- **Realtime:** (a) SSE from own API with `Last-Event-ID` replay from the outbox/events table, optionally woken by LISTEN/NOTIFY; (b) polling as the universal fallback; (c) engine-native realtime (Trigger.dev/Inngest) or Supabase Broadcast *only if* those platforms are chosen for other reasons; (d) Ably as the managed option if a vendor is acceptable.

## 6. Limitations and fallbacks
- **Deploy kills an in-flight step.** Fallback: lease expiry + idempotent resubmit guard (provider idempotency key or `submitting` CAS) + re-poll. Nothing needs a Constitution amendment; "no state stuck forever" holds via per-state deadlines (I).
- **SSE connection capped (Railway 15 min, Cloud Run 60 min, Vercel ≤800s).** Fallback: client reconnects with `Last-Event-ID`; send a keep-alive comment every ~15–30 s so idle proxies don't drop the stream (Railway closes after 5 min without data [6]).
- **LISTEN needs a session connection.** Fallback: a dedicated non-pooled connection per API process, or plain DB polling of `job_events` [38].
- **Supabase Broadcast replay caps at 25 msgs.** Fallback: on reconnect, fetch `GET /jobs/:id/events?after=` from our API, then subscribe (I).
- **Ably resume window is 2 min.** Fallback: history API, or refetch from our API [46].
- **Cloud Run in-memory FS** for ffmpeg probes: use `ffprobe` on an HTTP range URL (signed URL) instead of downloading full files (I; ffprobe-over-HTTP NV in this session).
- **Vercel 4.5 MB body limit:** direct-to-storage signed uploads (I) [23].
- **Single VPS failure:** restore from off-host Postgres backups plus object storage. RTO is manual (I).

## 7. Not verified / open
- Railway maximum for `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`; whether the 15-min HTTP cap is reliably active (Aug 2026 report of 5 min) [6b].
- Fly: absence of a hard HTTP request duration cap (only `idle_timeout` found); built-in preview environments.
- Cloud Run egress price; whether worker pools allow <1 vCPU; Direct VPC egress pricing.
- AWS ALB and public IPv4 monthly prices; data-transfer-out rates.
- Vercel Daemons: default grace (docs show 10s and 30s), limits page; the Workflow price unit conflict ($2.50/100k steps vs $20/1M events) [24][26b].
- Cloudflare: Hyperdrive pricing/limits for external Postgres; container placement pinning.
- Koyeb: current signup restrictions (secondary source only), shutdown signal, and request timeout.
- Hetzner: live price page didn't render (JS). Prices come from the official price-adjustment doc [33]; US/SG prices and traffic from secondary sources [33b]. CX23 availability ("sold out" per secondary).
- Pusher: confirmed absence of history/replay. Ably/Pusher local emulators.
- Supabase: CLI local Realtime parity; use of third-party (non-Supabase-Auth) JWTs for private channels.
- Inngest/Trigger.dev realtime local-dev behaviour.

## Sources (all accessed 2026-10-21)
[1] https://fly.io/docs/about/pricing/
[2] https://fly.io/docs/reference/configuration/
[3] https://fly.io/docs/launch/autostop-autostart/
[4] https://fly.io/docs/networking/private-networking/
[5] https://docs.railway.com/reference/pricing/plans
[6] https://docs.railway.com/networking/public-networking/specs-and-limits (via search excerpt)
[6b] https://station.railway.com/community/requests-cut-at-exactly-5-minutes-with-h-88503c0c (community, 2026-08-15)
[6c] https://www.helm7.com/blog/vercel-vs-railway (secondary)
[7] https://docs.railway.com/reference/deployments
[8] https://docs.railway.com/reference/app-sleeping
[9] https://docs.railway.com/reference/environments
[10] https://docs.railway.com/networking/private-networking
[11] https://render.com/pricing
[12] https://render.com/docs/render-vs-vercel-comparison and https://render.com/articles/render-vs-railway (vendor articles; "up to 100 minutes")
[12b] https://render.com/docs/free
[13] https://render.com/docs/deploys
[14] https://cloud.google.com/run/pricing
[15] https://cloud.google.com/run/docs/configuring/request-timeout
[16] https://cloud.google.com/run/docs/container-contract
[17] https://cloud.google.com/run/docs/triggering/websockets
[18] https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html ; https://aws.amazon.com/apprunner
[19] https://aws.amazon.com/fargate/pricing/
[20] https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html
[21] https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html
[22] https://vercel.com/docs/functions/configuring-functions/duration
[23] https://vercel.com/docs/functions/limitations
[24] https://vercel.com/pricing
[25] https://vercel.com/docs/daemons ; https://vercel.com/changelog/vercel-daemons-is-now-in-public-beta (2026-10-15)
[25b] https://vercel.com/kb/guide/vercel-functions-containers-daemons
[26] https://vercel.com/docs/workflow
[26b] https://vercel.com/docs/workflow/pricing
[27] https://developers.cloudflare.com/containers/pricing/
[28] https://developers.cloudflare.com/workers/platform/limits/
[29] https://developers.cloudflare.com/containers/platform-details/
[30] https://developers.cloudflare.com/durable-objects/platform/pricing/
[31] https://www.koyeb.com/docs/faqs/pricing ; https://www.koyeb.com/docs/reference/instances
[31b] https://www.koyeb.com/docs/run-and-scale/scale-to-zero
[32] https://www.koyeb.com/blog/koyeb-is-joining-mistral-ai-to-build-the-future-of-ai-infrastructure
[33] https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment
[33b] https://bex.co/blog/2026/10/14/hetzner-2026-price-hikes-traffic-trap (secondary)
[34] https://coolify.io/pricing/
[36] https://blog.partykit.io/posts/hosted-platform-shutdown
[37] https://www.postgresql.org/docs/current/ddl-rowsecurity.html
[38] https://www.pgbouncer.org/features.html
[39] https://html.spec.whatwg.org/multipage/server-sent-events.html
[40] https://www.postgresql.org/docs/current/sql-notify.html
[41] https://supabase.com/docs/guides/realtime/limits
[42] https://supabase.com/docs/guides/realtime/authorization
[43] https://supabase.com/docs/guides/realtime/broadcast
[44] https://supabase.com/pricing
[45] https://supabase.com/docs/guides/realtime/postgres-changes
[46] https://ably.com/docs/connect/states
[47] https://ably.com/docs/auth/capabilities
[48] https://ably.com/pricing
[49] https://pusher.com/channels/pricing/
[50] https://pusher.com/docs/channels/using_channels/private-channels/
[51] https://www.inngest.com/docs/features/realtime
[52] https://www.inngest.com/docs/realtime/overview (search excerpt)
[53] https://www.inngest.com/docs/realtime/limits
[54] https://trigger.dev/docs/realtime/overview
[55] https://trigger.dev/docs/realtime/auth
[56] https://trigger.dev/pricing
[57] https://liveblocks.io/pricing
