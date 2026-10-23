# Own authentication in our database, split credential custody, and an off-machine backup floor

Status: accepted (Wayfinder #75); backups and restore amended by Creator Ratification Record 2 P11, P12 and P8-purge (see the last section). The file name keeps the original title, "an independent backup copy", which is now a deferred option. Full baseline in [`docs/architecture/OPERATIONAL-BASELINE.md`](../architecture/OPERATIONAL-BASELINE.md); research is #73 (`research/platform-execution`, facts dated 2026-10-21).

V1 authenticated through a vendor call per request using a service-role client that bypassed row rules, so per-route `user_id` checks were the only tenant boundary and several async and utility routes had none; it logged with `console` only, had no working migration path, and no tested backup or restore (legacy 05 §1, 11 §§3.7 to 3.11, 12 §14). V2 is invite-only and multi-creator (Ratification Record M4 to M7), runs by default on one VPS with Postgres and R2 (ADR 0017 as amended by Record 2 P11; a portable deploy choice), and promises that nothing is lost inside a project.

Decision, for 1 to 50 invited Accounts:

- **Authentication: Better Auth, self-hosted in our Postgres database**, behind the `Auth` port that returns only an authenticated subject. The Account exists only after an invitation is redeemed. Passkey or TOTP is offered to creators and required for the operator, who is a deployment capability (configured email plus a second factor), not a role.
- **Credentials: two custody paths, one `CredentialHandle`.** Operator provider keys are server-held secrets in the host's configuration and never enter the database or a backup. Creator-supplied keys (BYOK) are wrapped-key ciphertext in the database, bound to Account and provider, opened only in `web` and `worker`.
- **Environments: local, ci, staging, production.** Staging is a separate project with synthetic data; production data never leaves production except to backups and restore tests.
- **Delivery: one image digest promoted with approval**, migrations run by the pipeline under the `owner` identity (expand/contract), and **isolation gates** (cross-Account refusal on every path, role posture, secret canary, route inventory) that block merge.
- **Observation: Sentry behind an `ErrorSink` port with deny-by-default scrubbing and no session replay; a typed content-free logger; no tracing or metrics backend**; alerts from the worker plus an external heartbeat.
- **Backups: a floor from day one (Record 2 P12):** an automated daily database dump plus continuous WAL archiving, encrypted, to storage off the machine (R2 is acceptable), and **one successful restore test before any creator other than the owner is invited.** The number of copies, retention, a second independent vendor, no-delete backup credentials, drill cadence and the full manual drill gate are **deferred**. #75's original choice (Neon history plus an independent copy at a second vendor, weekly automated verification and a full drill before the first invitation) is kept in OPERATIONAL-BASELINE §§8.2, 8.3 and 9 as an option for that decision.
- **Purge and backups (P8-purge):** when purge ships, a purged project or Account is gone from Aiuteur at once and any backup copies expire within a retention window stated to the creator at purge time; every restore replays the purge log.

## Considered options

- **Clerk or WorkOS for identity.** Rejected for now: identity would live outside the database that purge, backup and the drill cover, the login path would depend on a third party, CI would need a cloud account, and Clerk charges for second factors. Both remain the named fallbacks behind the `Auth` port.
- **Supabase Auth.** Out with Supabase (ADR 0017): invites create the user at send time and its default server credential bypasses row rules.
- **All provider keys encrypted in the database.** Rejected: it puts the operator's most valuable keys into every dump for uniformity the `Vault` port already provides. An external key service is deferred behind the same port.
- **Local plus production only.** Rejected: the scheduler, leases and rolling deploy must not first meet production.
- **Vendor history as the only backup.** Rejected by #75: one vendor or credential incident would take data and media together, and R2 has no versioning to undo our own deletion. (On the VPS default there is no vendor history; the floor replaces it.)
- **Operating our own continuous archiving.** Rejected by #75: it recreates the chore the managed database avoids. *Superseded by Record 2 P11/P12:* the creator chose a self-operated VPS, and continuous WAL archiving off the machine is now part of the floor.
- **An independent copy at a second vendor, weekly verification, a full drill gate.** #75's choice; now deferred by the creator (P12.3), not rejected.
- **GlitchTip or logs-only for errors.** GlitchTip is the fallback behind the port; logs-only was rejected because ungrouped errors are how V1's silent catches stayed invisible.

## Consequences

- We own patching of the authentication library and the small invitation flow; a critical unfixed vulnerability is the trigger to switch adapters.
- Three database identities become six (`identity`, `operator_read`, `backup` added). `backup` is the single deliberate row-rule bypass, held only by the backup job's own process and secrets.
- A restore from any backup must replay the purge log, and the backup retention window (deferred, P12.3) is the bound on how long a purged project can survive in backups; it must be set before purge ships, since it is stated to the creator.
- On a single VPS, a compromise of the host reaches everything on it, and the floor's backups share a storage account with media when R2 is used; the deferred policy decisions are where that is answered.
- The deployer's infrastructure access is not a promise-breaker for creators' privacy between each other, and the baseline says so plainly.
- Vendor facts are dated 2026-10-21; re-check Better Auth's invitation support at build time, and the backup storage's key capabilities when the deferred backup policy is decided.

## Record 2 amendment (P12, P8-purge): backups and restore

**Floor from day one** (a single VPS disk failure would otherwise lose every creator's work, violating Constitution §16.1 and R1): an automated **daily database dump plus continuous WAL archiving to storage off the machine** (R2 is acceptable). **One successful restore test before any creator other than the owner is invited.** **Deferred, not decided:** number of backups and copies, retention, a second independent vendor, restore-drill cadence, the no-delete backup credential design, and the full manual drill gate of OPERATIONAL-BASELINE §9. The decision above now states this floor as current; the second-vendor copy, weekly verification and full-drill gate are deferred options. Cap defaults and the hidden operator ceiling size remain parked and must be set before the first invitation.

**Purge promise (when purge ships, M7):** gone from Aiuteur at once; any backup copies expire within a stated retention window, which is told to the creator at purge time.
