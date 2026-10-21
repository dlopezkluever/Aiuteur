# Ticket #73 research: Managed Postgres + invite-only Auth (as of 2026-10-21)

Scope: the DB that holds Jobs, outbox, leases, timers, spend caps, and account data, plus the identity layer for an invite-only, multi-creator, isolated-studio app. Media storage and egress are only mentioned where a DB vendor bundles them. Every non-trivial figure has an `[n]` citation; all sources were accessed 2026-10-21. Labels: **(inference)** = my reasoning; **(nv)** = not verified on a live page.

Scenario used for costs: 5 creators, ~3,000 jobs/month, ~2M poll/step executions/month (≈0.8 DB ops/s on average: trivial load). The DB itself is small (≈1–5 GB of metadata). An always-on worker polls the DB, so in practice **the DB never idles** (inference). That matters for scale-to-zero pricing.

---

## 1a. Comparison table: managed Postgres

| Option | Status Oct 2026 | Small-scale $/mo (scenario, DB only) | Backups / PITR | Pooling and LISTEN/NOTIFY | Extensions (pgmq / pg_cron / crypto / pg_partman) | Branching | Scale-to-zero | Local dev parity | Exit path |
|---|---|---|---|---|---|---|---|---|---|
| **Supabase** | Active | Pro $25 incl. Micro compute (1 GB, 60 direct / 200 pooler conns) [1]; **+$100 for 7-day PITR** [1][7] | Daily (7 d on Pro) physical; PITR via WAL-G, RPO ≤2 min [7] | Supavisor session (5432) and transaction (6543) modes, plus a dedicated PgBouncer (txn only, paid) [2]; LISTEN/SET/advisory locks fail in txn mode; use direct or session mode [2] | pgmq (Supabase Queues) [4], Vault (libsodium AEAD) [6], pg_partman [5], pg_cron (nv) | $0.01344/branch-hr [1] | Free plan pauses after 1 wk; paid never pauses [1] | `supabase start` = full local stack in Docker (Postgres, Auth, Storage…) [12] | pg_dump; auth.users with hashes is in your own DB [68]; Vault root key exportable via Mgmt API [6] |
| **Neon** (now "Lakebase Postgres… from Databricks") [14] | Active | Launch: $0.106/CU-hr; 0.25 CU always-on ≈ **$19** + storage $0.35/GB-mo + history $0.20/GB-mo [14] (inference: arithmetic) | Instant restore; history window up to 7 d (Launch) / 30 d (Scale) [14] | PgBouncer txn mode only, 10k clients; **no LISTEN/NOTIFY, SET, or session advisory locks on pooled connections**; use direct [15] | pg_cron (**needs scale-to-zero disabled**) [16], pg_partman [16], pgcrypto [16]; pgmq not seen (nv) | Core feature; 10 branches incl., $1.50/extra branch-mo [14] | Suspends after 5 min; wakes in "a few hundred ms" [17]; pg_cron does not run while suspended [16] | Plain Postgres in Docker (inference); branches for CI [14] | pg_dump; logical replication out is supported (keeps compute awake) [17] |
| **PlanetScale Postgres** | Active | Single node PS-5 $5 (1/16 vCPU, 512 MiB); PS-10 $10–13 [21]; HA = 3-node (price not captured) | Auto backup every 12 h, 2-day default retention; PITR to ≥5 min ago [24]; backup storage 2× disk incl., then $0.023/GB [25] | Local PgBouncer :6432, **txn mode only**; LISTEN/NOTIFY, session locks, and persistent SET unsupported; direct :5432 [23] | pg_cron, pg_partman (+bgw), pgcrypto, pgvector [22]; pgmq not listed (nv) | Yes (dev branches "PS-DEV" priced separately) [25] | No | Plain Postgres in Docker (inference) | pg_dump (logical replication out: nv) |
| **Railway Postgres** | Active; now offers HA (Patroni), PITR, PgBouncer [31] | Usage-metered: RAM $10/GB-mo, CPU $20/vCPU-mo, volume $0.15/GB-mo; Pro $20 includes $20 usage [30] → ≈$20 for a small single node (inference) | Volume backups daily (6 d) / weekly / monthly [32]; PITR via pgBackRest, ~4-week window, billed as bucket storage + egress [33] | PgBouncer optional: txn / session / statement modes; `DATABASE_UNPOOLED_URL` for session features [34] | Stock image; "we do not plan to add extensions"; marketplace templates for pgvector etc. [31] (pgcrypto is contrib: inference) | No (nv) | No | Same image runs locally (inference) | pg_dump; restore only into same project/env [32] |
| **Fly Managed Postgres** | Active | Basic (shared-2x, 1 GB) **$38** + $0.28/GB provisioned → ≈$41 for 10 GB [27]; HA included [27] | "Automatic backups and recovery" [27]; PITR granularity/retention not stated (nv) | PgBouncer **session mode default** (LISTEN works) or txn mode; direct URL for LISTEN/migrations; Basic = 200 client / 50 DB conns [29] | Only PG16 contrib + pgvector + PostGIS; **no pg_cron, pgmq, pg_partman** [28]; pgcrypto ✓ [28] | No | No | Plain Postgres in Docker (inference) | Import tool exists [27]; pg_dump |
| **Crunchy Bridge** (Snowflake-owned since Jun 2025) | Still sold [35]; Snowflake Postgres GA 2026-02-24 [36] | Hobby-0 $9, Hobby-2 $35, Standard-4 $70; storage $0.10/GB; backups + egress + pooling included [35] | Daily + WAL backups, PITR included [35] | Pooling included [35] (mode nv) | (nv) | (nv) | No | Plain Postgres (inference) | pg_dump (nv: logical repl) |
| **Tembo Cloud** | **Gone as managed Postgres**: tembo.io now sells an AI-agent orchestration platform [37] | n/a | n/a | n/a | pgmq originated there and lives on in Supabase/PGlite [4][67] | n/a | n/a | n/a | n/a |
| **AWS RDS / Aurora** (reference) | Active | RDS instance price not captured on page (nv); 12-month free tier for new accounts [38] | Automated backups + PITR (standard RDS) (nv) | RDS Proxy (nv) | pg_cron / pg_partman (nv) | No (Aurora clones nv) | Aurora Serverless v2 min 0 ACU: resume **~15 s, ≥30 s after 24 h idle**; **pg_cron jobs during pause are skipped** [39] | Plain Postgres (inference) | pg_dump, logical replication (nv) |
| **Google Cloud SQL / AlloyDB** (brief) | Active | db-f1-micro $0.0105/h (≈$7.7/mo, **no SLA**), db-g1-small $0.035/h (≈$25.6); SSD ≈$0.34/GB-mo [40] | (nv) | (nv) | (nv) | No | No | Plain Postgres (inference) | pg_dump (nv) |

## 1b. Comparison table: invite-only auth

| Option | Invite-only mechanism | When the account row is created | $/mo at <50 users | Session model → DB scoping | MFA / passkeys | Password-hash export | Local dev | Lock-in |
|---|---|---|---|---|---|---|---|---|
| **Supabase Auth** | Turn off "Allow new users to sign up" (then only existing users can sign in) [9]; admin `inviteUserByEmail` [10]; or a `before-user-created` hook that checks an invites table [8] | **At invite time** with `inviteUserByEmail` (PKCE unsupported) [10]; at redemption if the app calls admin `createUser` [10] (inference) | $0 (Pro includes 100k MAU) [1] | JWT; PostgREST/Storage map it to the `authenticated` role and `auth.uid()` in RLS [3]. Secret key = `service_role` = **BYPASSRLS** [3] | TOTP free; phone MFA $75/mo [1]; passkeys **experimental/beta** [13][69] | Yes: `auth.users` is in your DB (bcrypt) [68] | Runs in `supabase start` [12] | Low for data; medium for coupling to PostgREST/RLS conventions |
| **Clerk** | Access mode "Invite-only" (`restricted`), **free on all plans** [42][43]; invitations via dashboard/API | At acceptance: SignUp only works with a valid invitation link [42] | $0 Hobby; **MFA and passkeys need Pro, $25/mo ($20 annual)** [43] | Clerk session JWT verified via JWKS; Supabase third-party auth supports Clerk [11] | Pro only [43] | Yes: dashboard CSV includes hashed passwords, every plan [44] | Cloud dev instances, no offline mode (inference) | Medium (hosted UI/SDK); data exportable |
| **Better Auth** (library, own DB) | `emailAndPassword.disableSignUp` [45]; admin plugin `createUser` server-side [46]; app-owned invites table + redemption endpoint (inference) | At redemption (your code) | $0 (OSS); optional "Infrastructure" dashboard $0 / $20 [47] | DB-backed sessions in your Postgres; app-level account scoping is natural; JWT/JWKS plugin optional (nv) | 2FA plugin; passkey plugin (`@better-auth/passkey`) [46][search] | Native: scrypt hashes in your tables [45] | Fully local, any Postgres | Lowest (your schema, your code); you own security patches |
| **Neon Managed Better Auth** | Better Auth hosted by Neon; data in the `neon_auth` schema; branches with the DB [18][20] | Same as Better Auth (sign-up disabling: nv) | Included in plan MAU (60k Free / 1M paid) [14] | JWT → Data API `auth.user_id()` in RLS [19] | Better Auth features (nv which are exposed) | In your DB (inference) | Branch per CI run [18] | Coupled to Neon |
| **Auth0** | "Disable Sign Ups" toggle per DB connection [51]; invite = Mgmt API create user + password-reset ticket (nv) or Organizations (5 on Free) [50] | Admin create (inference) | $0 Free (25k MAU, passkeys incl.) [50]; Pro MFA factors need Essentials, $35/mo [50] | OIDC JWT access tokens; Supabase third-party auth supported [11] | Passkeys Free; Pro MFA Essentials+ [50] | **Support ticket, paid plans only** [52] | Cloud only (inference) | High |
| **WorkOS AuthKit** | Disable signup; an invitation code re-opens registration for that invitee: "closed-registration invitation-only system" [54] | At redemption [54] | $0 (first 1M MAU); custom domain **$99/mo** [53] | OIDC JWT; Supabase third-party auth supported [11] | Included [53][66] | Import supported [55]; export of hashes **nv** | Staging env free (cloud) [53] | Medium–high |
| **Hexclave** (= Stack Auth, renamed 2026) [57] | "Sign-up rules": default action reject + allow rules, applied to all methods [58]; invite API (nv) | (nv) | $0 Free (10k users); Team $49 [56] | (nv) JWT | Passkeys listed in the feature grid (tier nv) [56] | Self-hostable (server AGPLv3) [56] → in your DB if self-hosted | Self-host via Docker (inference) | Low if self-hosted; young vendor, just rebranded |
| **Firebase Auth / Identity Platform** | Uncheck "Enable create (sign-up)" → end-user create gets `auth/admin-restricted-operation`; admins create via Admin SDK [61]; `beforeCreate` blocking functions (**Identity Platform only**) [60] | Admin create | $0 under 50k MAU (Tier 1) [59]; SMS extra | Firebase ID-token JWT; Supabase third-party auth supported [11] | TOTP/SMS (nv details) | Yes: `auth:export` with modified-scrypt params [62] | Firebase emulator (nv) | High (GCP; modified scrypt) |
| **Auth.js / Lucia** | Auth.js now maintained by the Better Auth team, which "strongly recommend[s] new projects start with Better Auth" [48]; **Lucia deprecated March 2025** [49] | n/a | $0 | n/a | n/a | n/a | n/a | Not viable for a new build |
| **Kinde** | Turn off "Allow self-sign up"; add users via API; org-invited users can still sign up [64][65] | Admin create / invite acceptance | $0 Free (10.5k MAU; authenticator MFA incl.) [63] | OIDC JWT | MFA authenticator Free [63]; passkeys (nv) | (nv) | Cloud only (inference) | Medium–high |

---

## 2. Per-option notes

### Supabase
- Pricing: Pro $25 incl. $10 compute credit = one Micro instance (1 GB RAM, 60 direct / 200 pooler connections); disk 8 GB incl., then $0.125/GB; 250 GB egress incl. Storage: 100 GB incl., then $0.0213/GB; 250 GB cached egress incl. Spend caps are on by default [1]. **Scenario:** DB-only $25. With Supabase Storage holding 200 GB and serving 100 GB egress: ≈$25 + $2.13 = ~$27 (inference: arithmetic). **+$100 for 7-day PITR** [1][7].
- PITR replaces daily backups when enabled. Restore is in place with downtime that scales with DB size [7]. Backups exclude Storage objects [7].
- Pooling: direct connections are IPv6 unless you buy the IPv4 add-on. The shared pooler is IPv4. In transaction mode, SET, advisory locks, LISTEN/NOTIFY, and prepared statements are lost [2]. A long-lived worker should use the direct connection or session mode (inference).
- RLS pitfalls, straight from Supabase's own docs: the secret key / `service_role` has `bypassrls` [3]. Views bypass RLS by default (security definer) [3]. `security definer` functions in exposed schemas are callable with the creator's rights [3]. `auth.uid()` returns NULL when there is no token [3]. **This is the V1 failure mode.** It is avoidable only if the server never uses the secret key for ordinary requests (inference).
- Queues = pgmq with "exactly once within visibility window" [4]. Vault: per-project root key held outside the DB; restoring via pg_dump into a new project needs the key copied [6].

### Neon (Databricks)
- Pricing: Launch $0.106/CU-hr; storage $0.35/GB-mo; instant-restore history $0.20/GB-mo; 500 GB egress/project incl. [14]. **Scenario:** 0.25 CU × 730 h × $0.106 ≈ $19.3 + ~2 GB × ($0.35 + $0.20) ≈ $1.1 → **~$21/mo** (inference). Workers polling every few seconds prevent suspend, so scale-to-zero saves nothing in prod (inference).
- Scale-to-zero: suspends after 5 min, resumes in a few hundred ms [17]. pg_cron only runs while compute is active [16]. A compute restart (suspend or updates) drops connections [16], so lease holders must tolerate reconnects. Leases should be time-based in rows, not session-held (inference).
- Pooler is transaction-only. `SET` is unsupported on pooled connections [15]. The `SET LOCAL` / `set_config(..., true)` inside a transaction pattern is transaction-scoped and compatible with transaction pooling (inference, standard PgBouncer semantics). LISTEN needs a direct connection [15].
- Bundles Managed Better Auth (users in the `neon_auth` schema, per-branch auth) [18][20], a Data API with JWT → `auth.user_id()` RLS [19], plus Object Storage $0.023/GB and Functions [14].

### PlanetScale Postgres
- Cheapest: PS-5 single node $5/mo; single node "great… for workloads that do not require high availability" [26]. Price excludes extra storage, backups, egress, and dedicated PgBouncer [21]. Production branches include 100 GB egress; PS-5 includes 10 GB [25].
- PgBouncer is transaction-only. PlanetScale explicitly advises direct :5432 rather than session pooling for persistent sessions [23].
- Best extension coverage among the non-Supabase options (pg_cron, pg_partman with bgw) [22].

### Railway Postgres
- Stock template is a single node. Can be converted to HA (Patroni/etcd/HAProxy) [31]. PITR via pgBackRest to a Railway bucket, ~4 weeks retained. A restore creates a **new sibling service** and cutover is manual [33]. Daily volume backups keep 6 days; wiping a volume deletes its backups [32].
- PgBouncer modes are selectable [34]. No extension roadmap [31].

### Fly Managed Postgres
- $38 Basic + $0.28/GB. HA, backups, and pooling are included [27]. Missing: third-party extensions beyond pgvector/PostGIS, customer alerting, migration tools; "security patches and version upgrades" are listed as **under development** [27] (one of the two page fetches; the refetched summary omitted the list, so re-check).
- PgBouncer defaults to session mode (LISTEN/NOTIFY works). Connection limits per plan [29].

### Crunchy Bridge / Snowflake Postgres / Tembo
- Crunchy Bridge pricing page is live: Hobby-0 $9, Standard-4 $70, storage $0.10/GB, backups/PITR/egress/pooling included [35]. Owned by Snowflake, whose own "Snowflake Postgres" went GA 2026-02-24 [36]. Long-term product direction is uncertain (inference).
- Tembo: no longer a managed-Postgres vendor [37].

### AWS / GCP (reference)
- Aurora Serverless v2 scale-to-zero: ~15 s resume, ≥30 s after 24 h. Scheduled pg_cron jobs during a pause are **skipped** [39]. That rules it out for durable timers inside the DB unless workers keep it awake (inference).
- Cloud SQL shared-core instances are cheap ($7.7–$25.6/mo) but have no SLA [40]. Both are heavier IAM/VPC setups than the small-team preference calls for (inference).

### Tenant isolation in Postgres (applies to every DB option)
- Facts: superusers and BYPASSRLS roles always bypass RLS. **Table owners bypass unless `FORCE ROW LEVEL SECURITY`.** With RLS enabled and no policy, access is default-deny. FK/unique checks bypass RLS ("covert channel") [41].
- Pattern (inference): the app and workers connect as a non-owner, non-BYPASSRLS role. Each transaction starts with `select set_config('app.account_id', $1, true)` (transaction-local, so safe through transaction poolers). Policies use `account_id = current_setting('app.account_id', true)::uuid`, which fails closed to zero rows when unset. Migrations run under a separate owner role. Only the scheduler/claimer (cross-account `SKIP LOCKED` claims, circuit-breaker rows) uses a narrowly granted role or `security definer` functions that return job IDs, never tenant payloads.
- Pitfalls (inference): (1) a session-level `SET` through a transaction pooler leaks the account to the next client; it must be `SET LOCAL` / `set_config(..., true)` inside an explicit transaction. (2) ORMs that auto-commit each statement lose the setting. (3) Views need `security_invoker` (PG15+). (4) The owner role must never be the app role. (5) A Supabase-style secret key on the server recreates the V1 bypass.
- Schema-per-tenant (inference): workable at a few dozen accounts, and purge = `DROP SCHEMA … CASCADE`. But migrations run ×N, `search_path` is session state (same pooler hazard), and the job/outbox/admission tables are inherently cross-tenant, so you still need shared tables. Row-level + `account_id` on every row + per-account purge job is simpler.

### Auth notes
- **Supabase Auth.** With signups off, `inviteUserByEmail` pre-creates the user and sends a link; PKCE is unsupported for invites [10]. To get "account exists only after redemption", the app holds an invite token and calls admin `createUser` at redemption, or keeps signups on and gates with the `before-user-created` hook [8] (inference). Both need a server-held privileged key for the admin call; keep it in one admin-only module (inference). Whether admin APIs still work with signups disabled is widely assumed but **nv on a live page**.
- **Clerk.** Cleanest out-of-the-box invite-only (free) [42][43]. Costs $25/mo once MFA/passkeys are wanted [43]. Hash export available on all plans [44].
- **Better Auth.** Library in your DB: scrypt by default [45], `disableSignUp` [45], admin `createUser`, ban, revoke sessions, impersonate [46]. You write the invite table/redemption (~small). Auth.js is folded into it [48].
- **WorkOS.** The documented invite-only model matches the requirement exactly: signup disabled, invitation code opens registration [54]. Free to 1M MAU, but a custom domain is $99/mo [53].
- **Auth0.** Disable sign-ups per connection [51]. Hash export only via support ticket on paid plans [52]: the worst portability of the set.
- **Firebase / Identity Platform.** Sign-up disable plus Admin SDK create [61]. Hashes export with modified-scrypt parameters [62].
- **Kinde.** Disable self-sign-up; invited org users can still sign up [64][65].

---

## 3. Deciding facts (for ticket #74)

1. **Does the platform keep the app off an RLS-bypassing identity?** Supabase's default server credential (secret key / `service_role`) bypasses RLS [3]. Any option is safe only with a dedicated non-owner app role + FORCE RLS [41]. This is a discipline/architecture choice, not a vendor feature.
2. **LISTEN/NOTIFY and session features need direct or session-mode connections.** Transaction poolers drop them on Supabase, Neon, PlanetScale, and Railway-txn [2][15][23][34]. Fly defaults to session mode [29]. If progress delivery uses LISTEN, the worker/SSE process needs a direct connection; otherwise poll the outbox.
3. **Scale-to-zero is irrelevant or harmful.** Workers keep the DB awake (inference). Neon pg_cron stops while suspended [16]. Aurora skips pg_cron jobs during pause [39]. Timers should live in rows polled by workers, not in pg_cron.
4. **Extension needs are small.** The job model needs only `SELECT … FOR UPDATE SKIP LOCKED` (core Postgres). pgmq/pg_cron are nice-to-have. Fly MPG lacks both [28]; Supabase has pgmq [4]; Neon and PlanetScale have pg_cron + pg_partman [16][22].
5. **Per-account secrets:** Supabase Vault (key outside the DB, exportable) [6] vs pgcrypto + app-held KEK on any platform [16][22][28].
6. **Small-scale cost:** PlanetScale PS-5 $5 (no HA) [21]; Neon ~$21 always-on (inference from [14]); Railway ~$20 [30]; Supabase $25 (+$100 PITR) [1]; Fly $38+ with HA [27]; Crunchy $9 hobby / $70 standard [35].
7. **Invite semantics:** Clerk invite-only [42] and WorkOS invitation-gated registration [54] create the account at redemption natively. Supabase `inviteUserByEmail` creates it at invite time [10]. Better Auth = your own code [45][46].
8. **Auth portability:** in-DB hashes (Supabase Auth, Better Auth, Neon Auth) > Clerk CSV export on all plans [44] > Firebase export with special scrypt [62] > Auth0 support ticket, paid only [52].
9. **MFA/passkeys at <50 users:** free on WorkOS [53], Better Auth (plugins), Auth0 passkeys Free [50], Kinde MFA Free [63]. Clerk requires $25/mo Pro [43]. Supabase passkeys are beta [69].
10. **Local/CI parity:** Supabase CLI runs DB + Auth locally [12]; Better Auth on plain Postgres is fully local; hosted IdPs (Clerk, Auth0, WorkOS, Kinde) need the cloud in CI (inference).

**Dated shortlist (2026-10-21, input to #74, not a decision):**
- DB: **Neon**, **Supabase (DB-only usage, no secret key on request paths)**, **PlanetScale Postgres**, **Railway Postgres**. Fly MPG is a fallback if the compute lives on Fly (extension gaps).
- Auth: **Better Auth (self-hosted in own DB)**, **Clerk**, **WorkOS AuthKit**, **Supabase Auth** (if Supabase is the DB).

## 4. Limitations and fallbacks

- **Transaction pooler breaks LISTEN/SET.** Fallback: per-transaction `set_config(..., true)` for tenant context; progress via outbox polling or a single direct-connection listener process. No Constitution amendment needed.
- **Neon suspend / compute restart drops connections** [16][17]. Fallback: disable scale-to-zero on prod (Launch allows it [14]); leases as row timestamps with expiry, so a dropped connection never strands a job ("no state stuck forever" holds).
- **Fly MPG has no pg_cron/pgmq** [28]. Fallback: worker-side timers via `not_before` columns + `SKIP LOCKED` (core SQL).
- **PlanetScale PS-5 has no HA** [26]. Fallback: upgrade in place to HA [26] or accept the risk at 1–5 users with 12-hourly backups + PITR [24].
- **Supabase invite creates the user early** [10]. Fallback: app-owned invites + admin `createUser` at redemption, or the `before-user-created` hook [8].
- **Clerk MFA paywall** [43]. Fallback: Hobby for launch, then Pro at $25/mo.
- **Railway PITR restore = new service, manual cutover** [33]. Fallback: scripted cutover runbook.
- **Crunchy Bridge future under Snowflake** [35][36]. Fallback: pg_dump to any other vendor.
- No item here appears to require a Constitution amendment.

## 5. Not verified / open

- AWS RDS on-demand instance prices and Aurora ACU price (page did not render prices) [38].
- PITR minimum compute requirement on Supabase; pg_cron availability on Supabase (assumed: "Supabase Cron").
- pgmq on Neon and PlanetScale; extension lists for Crunchy Bridge, RDS, Cloud SQL.
- PlanetScale 3-node HA price for PS-5/PS-10; PlanetScale and Crunchy logical-replication-out support.
- Fly MPG backup retention / PITR window; whether "security patches and version upgrades" is still "under development" (seen on one fetch only) [27].
- Whether Supabase admin `inviteUserByEmail` / `createUser` work with signups disabled (widely used; not stated on the page read).
- Whether Neon idle (not active) connections prevent suspend.
- WorkOS password-hash **export**; Kinde hash export; Hexclave invite API and passkey tier; Auth0 invite flow specifics; Firebase emulator parity.
- Better Auth app-wide invitation plugin (only org-scoped invitations known; nv).

## Sources (all accessed 2026-10-21)
1. https://supabase.com/pricing
2. https://supabase.com/docs/guides/database/connecting-to-postgres
3. https://supabase.com/docs/guides/database/postgres/row-level-security
4. https://supabase.com/docs/guides/queues
5. https://supabase.com/docs/guides/database/extensions/pg_partman
6. https://supabase.com/docs/guides/database/vault
7. https://supabase.com/docs/guides/platform/backups
8. https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
9. https://supabase.com/docs/guides/auth/general-configuration
10. https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
11. https://supabase.com/docs/guides/auth/third-party/overview
12. https://supabase.com/docs/guides/local-development
13. https://supabase.com/docs/guides/auth/passkeys
14. https://neon.com/pricing
15. https://neon.com/docs/connect/connection-pooling
16. https://neon.com/docs/extensions/pg-extensions
17. https://neon.com/docs/introduction/scale-to-zero
18. https://neon.com/docs/auth/overview
19. https://neon.com/docs/data-api/get-started
20. https://neon.com/docs/changelog/2025-12-12
21. https://planetscale.com/pricing
22. https://planetscale.com/docs/postgres/extensions
23. https://planetscale.com/docs/postgres/connecting/pgbouncer
24. https://planetscale.com/docs/postgres/backups
25. https://planetscale.com/docs/postgres/pricing
26. https://planetscale.com/docs/postgres/cluster-configuration/single-node
27. https://fly.io/docs/mpg/
28. https://fly.io/docs/mpg/extensions/
29. https://fly.io/docs/mpg/client-configuration/
30. https://docs.railway.com/reference/pricing/plans
31. https://docs.railway.com/databases/postgresql
32. https://docs.railway.com/volumes/backups
33. https://docs.railway.com/volumes/point-in-time-recovery
34. https://docs.railway.com/databases/postgresql-pgbouncer
35. https://www.crunchydata.com/pricing
36. https://docs.snowflake.com/en/release-notes/2026/other/2026-02-24-snowflake-postgres-ga
37. https://www.tembo.io/
38. https://aws.amazon.com/rds/postgresql/pricing/
39. https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html
40. https://cloud.google.com/sql/pricing
41. https://www.postgresql.org/docs/current/ddl-rowsecurity.html
42. https://clerk.com/docs/guides/secure/restricting-access
43. https://clerk.com/pricing
44. https://clerk.com/docs/guides/development/migrating/overview
45. https://www.better-auth.com/docs/authentication/email-password
46. https://www.better-auth.com/docs/plugins/admin (passkey plugin: https://www.better-auth.com/docs/plugins/passkey)
47. https://better-auth.com/pricing
48. https://better-auth.com/blog/authjs-joins-better-auth
49. https://lucia-auth.com/
50. https://auth0.com/pricing
51. https://support.auth0.com/center/s/article/Disable-Signups-at-Connection-Level
52. https://auth0.com/docs/troubleshoot/customer-support/manage-subscriptions/export-data
53. https://workos.com/pricing
54. https://workos.com/docs/authkit/invitations
55. https://workos.com/docs/migrate/other-services
56. https://stack-auth.com/pricing (redirects to Hexclave pricing)
57. https://docs.hexclave.com/migration
58. https://docs.hexclave.com/guides/apps/authentication/sign-up-rules
59. https://cloud.google.com/identity-platform/pricing
60. https://cloud.google.com/identity-platform/docs/blocking-functions
61. https://docs.cloud.google.com/identity-platform/docs/concepts-manage-users
62. https://firebase.google.com/docs/cli/auth
63. https://kinde.com/pricing/
64. https://docs.kinde.com/authenticate/custom-configurations/disable-sign-up
65. https://docs.kinde.com/authenticate/custom-configurations/invited-user-experience/
66. https://workos.com/docs/authkit/passkeys
67. https://pglite.dev/extensions/
68. https://workos.com/docs/migrate/supabase
69. https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta
