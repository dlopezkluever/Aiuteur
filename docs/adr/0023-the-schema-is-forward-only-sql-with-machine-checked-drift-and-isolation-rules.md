# The schema is forward-only SQL with machine-checked drift and isolation rules

Status: accepted (Wayfinder #72)

V1's migration runner was dead as written, production was apparently built by hand, tables and buckets were referenced but never created, and enums disagreed across database, TypeScript and UI (legacy 05 §§1, 6, 8; FACT-0145, FACT-0172, FACT-0236).

Decision: the schema is **one linear, forward-only chain of SQL migrations** applied by the `migrator` role as a deploy step before new code starts, recorded with checksums, and changed by **expand then contract**. It is the only way production is built. Structure is authored in the chain, payload shapes by the owning module's versioned kind schema, vocabularies by `contract`, and row types are generated from a committed **schema snapshot** inside the Store adapter. The build and readiness fail on drift: chain-to-snapshot equality, live-catalog-to-snapshot equality, vocabulary CHECKs equal to `contract`, tenant-table isolation, append-only triggers, no marker column, per-kind round-trip and upcaster fixtures, a derived-table verifier, and the Store conformance suite on the real and in-memory adapters.

## Considered options

- **Down migrations.** Rejected: untestable at scale and unsafe with data; rollback is expand/contract plus restore.
- **Schema inferred from application models.** Rejected: that is how V1's shapes and enums drifted.
- **Vocabularies as database enum types.** Rejected: enum changes are heavyweight; text with a generated CHECK keeps one authority (`contract`) and an additive migration.

## Consequences

- A new tenant table cannot ship without isolation, because the catalog test classifies every table.
- Adding a vocabulary value is a `contract` change plus a generated expand migration, deployed before any code writes it.
- Payload evolution never rewrites history: upcasters read old bodies; fingerprints and body hashes are never recomputed.
- The migration tool is a spec-level choice; the policy is not.

Detail: `docs/architecture/PERSISTENCE-AND-MEDIA.md` §10.
