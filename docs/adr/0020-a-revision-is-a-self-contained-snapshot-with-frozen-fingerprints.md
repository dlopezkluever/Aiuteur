# A Revision is a self-contained snapshot with frozen fingerprints

Status: accepted (Wayfinder #72)

Nothing inside a project may be lost, and a committed Revision may never be rewritten (Constitution §16 principle 3; LINEAGE-AND-STALENESS §1). History must restore, export, duplicate and purge reliably, and lineage compares content fingerprints, not Revision ids, so restoring makes drift disappear.

Decision: every Revision stores the **full body** of its object, valid against its kind's schema at a recorded `schema_version`, with a body hash and a map of **slice fingerprints** computed at write time. The `(object, sequence)` primary key is the compare-and-append, so a lost race is a `StaleBase`, not a lost write. A slice's fingerprint function is **frozen once any capture references it**; changing what a slice covers defines a new slice. Old bodies are read through pure upcasters and never rewritten. Hand editing writes a mutable **working copy**; a Revision is committed on idle pause, leaving, explicit save, and by forced capture before any operation that replaces or captures the content. There is **no compaction in V2**.

## Considered options

- **Delta chain.** Rejected: one corrupt link damages every later Revision, and reliability outranks storage.
- **Block-level structural sharing.** Rejected for now: it adds a table whose rows must never be collected. Kept as a storage detail behind `history.read`, adoptable if a project's Revision bodies exceed about 1 GB.
- **Operation log replay.** Rejected: replay bugs and no self-contained restore.
- **Recompute fingerprints on read.** Rejected: a code change would silently mark every old capture as drifted.

## Consequences

- A 199 KB document with 300 full snapshots measured 67 MB with pessimistic random text (about 0.22 MB each); a heavily edited project is a few hundred MB of history, cents per month.
- Autosave rewrites one working-copy cell; the worst loss after a tab crash is the debounce interval of unsent keystrokes, and no durable state lives in the browser.
- A forced capture ties a Generation's captured inputs to real Revisions in the same transaction.
- Storing fingerprints with each Revision makes `unit_head` a rebuildable index, and a new slice is backfilled into it without touching a Revision.

Detail: `docs/architecture/PERSISTENCE-AND-MEDIA.md` §4.
