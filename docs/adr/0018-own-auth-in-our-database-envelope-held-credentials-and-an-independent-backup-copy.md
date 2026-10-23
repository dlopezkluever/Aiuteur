# Own authentication in our database, split credential custody, and an independent backup copy

Status: accepted (Wayfinder #75). Full baseline in [`docs/architecture/OPERATIONAL-BASELINE.md`](../architecture/OPERATIONAL-BASELINE.md); research is #73 (`research/platform-execution`, facts dated 2026-10-21).

V1 authenticated through a vendor call per request using a service-role client that bypassed row rules, so per-route `user_id` checks were the only tenant boundary and several async and utility routes had none; it logged with `console` only, had no working migration path, and no tested backup or restore (legacy 05 §1, 11 §§3.7 to 3.11, 12 §14). V2 is invite-only and multi-creator (Ratification Record M4 to M7), runs on Fly, Neon and R2 (ADR 0017), and promises that nothing is lost inside a project.

Decision, for 1 to 50 invited Accounts:

- **Authentication: Better Auth, self-hosted in our Neon database**, behind the `Auth` port that returns only an authenticated subject. The Account exists only after an invitation is redeemed. Passkey or TOTP is offered to creators and required for the operator, who is a deployment capability (configured email plus a second factor), not a role.
- **Credentials: two custody paths, one `CredentialHandle`.** Operator provider keys are Fly secrets and never enter the database or a backup. Creator-supplied keys (BYOK) are wrapped-key ciphertext in the database, bound to Account and provider, opened only in `web` and `worker`.
- **Environments: local, ci, staging, production.** Staging is a separate project with synthetic data; production data never leaves production except to backups and restore drills.
- **Delivery: one image digest promoted with approval**, migrations run by the pipeline under the `owner` identity (expand/contract), and **isolation gates** (cross-Account refusal on every path, role posture, secret canary, route inventory) that block merge.
- **Observation: Sentry behind an `ErrorSink` port with deny-by-default scrubbing and no session replay; a typed content-free logger; no tracing or metrics backend**; alerts from the worker plus an external heartbeat.
- **Backups: Neon history plus an independent copy at a second vendor** (encrypted dumps, a copy-only-new media replica, written with credentials that cannot delete), bounded retention, weekly automated restore verification and a full drill before the first invitation.

## Considered options

- **Clerk or WorkOS for identity.** Rejected for now: identity would live outside the database that purge, backup and the drill cover, the login path would depend on a third party, CI would need a cloud account, and Clerk charges for second factors. Both remain the named fallbacks behind the `Auth` port.
- **Supabase Auth.** Out with Supabase (ADR 0017): invites create the user at send time and its default server credential bypasses row rules.
- **All provider keys encrypted in the database.** Rejected: it puts the operator's most valuable keys into every dump for uniformity the `Vault` port already provides. An external key service is deferred behind the same port.
- **Local plus production only.** Rejected: the scheduler, leases and rolling deploy must not first meet production.
- **Vendor history as the only backup.** Rejected: one vendor or credential incident would take data and media together, and R2 has no versioning to undo our own deletion.
- **Operating our own continuous archiving.** Rejected: it recreates the chore the managed database avoids.
- **GlitchTip or logs-only for errors.** GlitchTip is the fallback behind the port; logs-only was rejected because ungrouped errors are how V1's silent catches stayed invisible.

## Consequences

- We own patching of the authentication library and the small invitation flow; a critical unfixed vulnerability is the trigger to switch adapters.
- Three database identities become six (`identity`, `operator_read`, `backup` added). `backup` is the single deliberate row-rule bypass, living only in its own app.
- A restore from any backup must replay the purge log, and dump retention is the bound on how long a purged project can survive in backups.
- The deployer's infrastructure access is not a promise-breaker for creators' privacy between each other, and the baseline says so plainly.
- Vendor facts are dated 2026-10-21; re-check Better Auth's invitation support, the backup vendor's delete-less key capability and the Neon history window at build time.

## Record 2 amendment (P12, P8-purge): backups and restore

**Floor from day one** (a single VPS disk failure would otherwise lose every creator's work, violating Constitution §16.1 and R1): an automated **daily database dump plus continuous WAL archiving to storage off the machine** (R2 is acceptable). **One successful restore test before any creator other than the owner is invited.** **Deferred, not decided:** number of backups and copies, retention, a second independent vendor, restore-drill cadence, the no-delete backup credential design, and the full manual drill gate described above. Read the second-vendor copy, weekly verification and full-drill gate in this document as deferred options. Cap defaults and the hidden operator ceiling size remain parked and must be set before the first invitation.

**Purge promise (when purge ships, M7):** gone from Aiuteur at once; any backup copies expire within a stated retention window, which is told to the creator at purge time.
