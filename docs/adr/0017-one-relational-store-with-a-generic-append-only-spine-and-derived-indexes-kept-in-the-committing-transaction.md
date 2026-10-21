# One relational store with a generic append-only spine, and derived indexes kept in the committing transaction

Status: accepted (Wayfinder #72)

V1 mirrored its screens in tables, referenced tables it never created, cascaded deletes through creative work, and recomputed or stored "outdated" state where it could drift (legacy 05, 10, 15). V2 needs one atomic commit that checks the lock, appends history, writes lineage edges and emits an event, plus cheap whole-project reads at 250 shots, plus a project that can be copied or purged as a unit.

Decision: persist in **one PostgreSQL database** as a **generic append-only spine**: identity, Revisions, Attempts, Decisions, Records and capture edges are shared tables; a kind (owned by its module, registered with `history`) is a validated JSON payload plus declared extracted index columns. History tables have no update or delete path for runtime roles and a blocking trigger. A closed list of mutable cells (working copy, edit session, Job and lease state, project state, current settings) is the only mutable tenant state. Everything derived (unit heads, Slot and lock state) is rebuildable, written only inside the committing transaction, and checked by a verifier. Possibly-out-of-date, impact and the Board are indexed queries over capture edges; no marker is stored and no summary table is created until a measured budget fails.

## Considered options

- **Document store per object or project.** Rejected: atomic multi-object commit with a lock check and lineage needs a transaction layer we would write; indexes become hand-built; append-only and isolation would be per-collection conventions.
- **Event-sourced log with projections.** Rejected again as a storage form (ADR 0016): projections lag or become synchronous, and event-schema evolution is permanent.
- **Database or schema per Account or project.** Rejected for V2: its gains (trivial purge and duplicate) cost a multi-database scheduler claim, spend admission, outbox and migration chain; the same operations on the spine measured seconds. Kept as an escape hatch along the `(account, project)` key.
- **Table per kind.** Rejected: the kind-registered gate would have to know every table, and append-only, isolation, remap and purge would repeat per table.

## Consequences

- Adding a kind needs a payload schema and declared columns, not a new table; a field becomes queryable only by being declared.
- Validation of payloads is the kind schema at commit, not a database constraint, so round-trip and upcaster tests are required.
- A spike (Postgres 16, 250 shots, 150,000 capture edges) measured the Board query at about 22 ms, duplicate at 2.1 s and purge at 4.1 s; the pre-agreed fallback for a missed budget is a rebuildable summary table written in the commit, not an asynchronous projection.
- The per-project gate (shared for ordinary commits, exclusive for lock-changing ones) and the global lock order make the lock check and the write one serialised decision.

Detail: `docs/architecture/PERSISTENCE-AND-MEDIA.md` §§2–5.
