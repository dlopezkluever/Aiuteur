# Tenant isolation is enforced by the database and the object store, not by handlers

Status: accepted (Wayfinder #72)

V1 used a service-role client that bypassed row-level security, so per-handler `user_id` filters were the only tenant boundary and sub-resource ids were unchecked (legacy 05 §§4, 7; legacy 15 SP-04, SP-78 to SP-80). V2 serves several isolated Accounts (ratification M4) and must hold isolation on every path, including background work, events and storage keys.

Decision: isolation is enforced **below the code**, twice. Every tenant table carries `account_id` with **forced row-level security**; the Account is a transaction-local setting written by the Store adapter from a `Scope` (unset matches no rows). Every project-scoped table references one identity table with a **composite foreign key** `(account, project, id)`, so a cross-Account or cross-project reference is unrepresentable. The runtime has **no DDL and no RLS-bypass role**: `app` for request and worker transactions, `dispatch` for claim, sweep and outbox relay through definer functions that return ids and times only, `operator_reader` for an allowlist of non-content columns, `auth` for identity, `purge` for the purge function, and `migrator` only at deploy. Object keys name Account and project; the browser gets only a short-lived signed URL for a key `media.access` just read under the Scope. Credentials are encrypted with a per-Account data key bound to Account and provider. A platform's service or admin credential may exist only in migration and operator tooling.

## Considered options

- **Handler filters over a privileged client (V1).** Rejected: one forgotten filter leaks.
- **Schema or database per Account.** Rejected: with one shared role it is only a `search_path` convention, and it multiplies migrations, claims and totals.
- **Database per project.** Rejected: strongest separation but the cross-cutting needs become multi-file problems.
- **RLS alone.** Rejected as insufficient: it does not stop a same-Account cross-project reference, which composite keys do.

## Consequences

- Catalog tests (account column, RLS, `FORCE`, policy, composite key, grants, classification) and the two-Account harness replace review. A spike confirmed the primitives: cross-Account reads return nothing, forged inserts are refused, and the dispatcher cannot read tenant tables.
- Only transaction-scoped settings and locks are used, so a transaction-mode pooler is safe; no process relies on `LISTEN/NOTIFY` or session state.
- A candidate platform that needs its service credential for ordinary requests, or fronts the database with a data API that bypasses these policies, is rejected (the #74 checklist).
- Account purge is enumerable: every table has `account_id`, so completeness is a catalog-driven count.

Detail: `docs/architecture/PERSISTENCE-AND-MEDIA.md` §6.
