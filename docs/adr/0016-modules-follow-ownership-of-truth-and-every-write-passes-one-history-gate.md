# Modules follow ownership of truth, and every write passes one history gate

Status: accepted (Wayfinder #71)

V1 had route files of thousands of lines with about 800 direct persistence calls, one service-role database client so that per-handler `user_id` filters were the only tenant boundary, the shot in seven shapes, prompt and context construction copied across services, locks written to three places by three client calls, and workflow state, including locks, held by screens (legacy 11 §3.11, 15 SP-01 to SP-09, SP-24 to SP-26, SP-46, SP-78 to SP-80). The Constitution rejects UI-owned workflow state and requires that a protection shown on screen holds everywhere (§17.2, §16 principle 11).

Decision: V2 is a **modular monolith** (one codebase, one transactional store, two process roles, `web` and `worker`) whose modules are cut by **who owns which truth**, not by screen, phase or technical layer.

- **Workflow truth lives in one server module, `history`.** It stores every Revision, Attempt and Decision, owns the **write gate** (lock check, compare-and-append, provenance, atomic multi-append, edit sessions, scope check) and **derives** possibly-out-of-date markers, impact summaries and the to-reconcile list from lineage. The client holds layout, selection and unsaved keystrokes only, and imports nothing but the shared `contract`.
- **Domain modules are pure planners.** `story`, `world`, `production` and `project` declare their kinds (slices, narrative-bearing tags, invariants, declared indexes) and return a **Change** from current state and an intent. They never write. `history.commit` is the only writer, so no path can skip a lock, an account boundary or a lineage edge.
- **Generation is a pipeline with one record and one send path.** `compiler` is pure, `generation` records the Rendered request before dispatch and owns the single code path that sends it, `jobs` runs durable work (provider runs and local work such as export builds), `spend` admits atomically in the creating transaction, and `providers` has a pure catalogue face and an IO adapter face. A workflow operation is a record of pure parts (`scope`, `resolve`, `operation class`, `validate`, `attach`). Completion is one transaction: bytes stored, Attempts attached through `history`, cost set, event written.
- **Every call carries a `Scope`** (Account, project, creator), including background work, which rebuilds it from the Account recorded on the Job or event. Reading and writing are distinguished by type (`ReadTx`, `WriteTx`).
- **A type has one owner.** Vocabularies and ids and wire shapes are defined once in `contract` and generated or inferred for both sides; domain types belong to the owning module; rows never leave their Store adapter.

Details: `docs/architecture/MODULE-ARCHITECTURE.md`.

## Considered options

- **Layered tiers (V1's shape, tidied).** Rejected: any service with a database handle can write, so the gate, the lock and the account filter remain conventions, which is what failed.
- **Phase slices (a module per creative phase).** Rejected: a phase is a stage of work, not an object that holds content, and truth cuts across phases (a character edit marks frames and takes). Locks, markers and the account boundary would be repeated per slice or reached by a library any slice can skip, which is V1's stage coupling again.
- **Event-sourced core with projections.** Rejected as the architecture: projections are eventually consistent, so "what you see is true" and the lock check need synchronous projections that give up the benefit, and permanent event-schema evolution is the kind of cleverness principle 12 warns against. Its useful parts survive: history is append-only and events go through an outbox.
- **Separately deployed services.** Rejected: the gate, the lock check, the capture edges and the completion transaction must be one atomic commit; a network seam makes each a distributed transaction. The interfaces are narrow enough to extract a module later.
- **A gate library called by domain modules that write their own tables.** Rejected: the gate becomes advisory, and lock state and write cannot be proven to share a transaction.
- **Job machinery fused into the generation module.** Rejected: provider runs and local work (export build, Segment assembly, still extraction) both need leases and deadlines, which is a real second adapter at the seam.

## Consequences

- `history` is the critical module. It stays generic and kind-registered and contains no creative rule. Revisit if kinds need exceptions to the gate, if keeping derived state in the committing transaction cannot meet the 250-shot budget (then use a rebuildable table updated in the transaction, not an asynchronous projection), or if `workflows` starts to hold domain rules instead of composing planners.
- The rules R1 to R13 (one writer, `Scope` on every call, client imports only `contract`, pure compiler and guards, one caller of the adapter `submit`, `Initiation` minted only in `api`, no stored marker, prompt text only in layers, vendor names only in the Catalogue and adapters, `ReadTx`/`WriteTx`, injected time and ids, one public entry per module, outbox in the causing transaction) are checked by import-graph tests and types, not by review.
- The edit-session grant of a confirmed lock edit is server state, so a stale or hostile client cannot weaken a protection.
- Persistence (#72), the runtime platform (#74) and verification (#76) inherit the Store port, the process roles and the seam list; the language, database, queue and hosting are not fixed here.
