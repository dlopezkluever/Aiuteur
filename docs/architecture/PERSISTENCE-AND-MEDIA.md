# Aiuteur V2: Persistence, Version History and Private Media

Resolution of Wayfinder ticket #72. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). The hard-to-reverse choices are recorded in ADRs [0019](../adr/0019-one-relational-store-with-a-generic-append-only-spine-and-derived-indexes-kept-in-the-committing-transaction.md) (persistence approach), [0018](../adr/0020-a-revision-is-a-self-contained-snapshot-with-frozen-fingerprints.md) (versioning), [0019](../adr/0021-tenant-isolation-is-enforced-by-the-database-and-the-object-store-not-by-handlers.md) (isolation), [0020](../adr/0022-media-is-private-project-owned-and-copied-never-shared-across-projects.md) (media, access, retention, purge) and [0021](../adr/0023-the-schema-is-forward-only-sql-with-machine-checked-drift-and-isolation-rules.md) (migrations and drift). Creator decisions come from the [Creator Ratification Record](../product/CREATOR-RATIFICATION-RECORD.md) (M4 to M7), which controls.

This document turns the `Store` and `BlobStore` ports of [`MODULE-ARCHITECTURE.md`](MODULE-ARCHITECTURE.md) into decisions: what is stored and how, how history is versioned, how one Account is kept out of another's data, how media is stored and delivered privately, how a project is duplicated and later purged, and how the schema is kept honest. It names a database *engine* and an object-store *contract*, not a hosting vendor (that is #74, with the checklist in §13). It gives table families and the columns that matter, not DDL: exact column lists belong to the spec. No implementation is started here. One throwaway spike (§12) was run to check the numbers the design leans on.

No requirement was found unworkable: **no `CONSTITUTION AMENDMENT REQUIRED` is raised** (§15). No creator decision is needed: retention keeps everything inside a project, and its measured cost is cents per project per month (§12).

## 0. The design in one page

```diagram
 ┌──────────────────────────── PostgreSQL (one transactional store) ───────────────────────────┐
 │ TENANT TABLES (every row: account_id; project rows also project_id; FORCE row-level security) │
 │                                                                                               │
 │  IDENTITY     object ── one row per id, kind, project  (target of every composite FK)         │
 │  HISTORY      revision · attempt · decision · record(generation, run, choice, manifest…)      │
 │  (append-only: no UPDATE/DELETE grant, blocking trigger; compare-and-append by primary key)   │
 │  LINEAGE      capture edges (dependant → unit, fingerprint) · acknowledgements (decisions)    │
 │  DERIVED      unit_head · slot_state · lock_state · (rebuildable, written IN the commit)      │
 │  MUTABLE      working_copy · edit_session · job/lease/batch · project.state · settings        │
 │  MEDIA        media (immutable, per project, content-hashed) · rendition · external_resource  │
 │  OPERATIONAL  event (outbox, per-Account sequence) · action_receipt · pending_duplication     │
 │ GLOBAL REFERENCE (no account_id, read-only to the app): catalogue snapshots, price registry   │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘
          ▲ only the Store adapter touches it, as a non-owner role, scope set per transaction
          │
 ┌────────┴──────────────── private object store (S3-compatible contract) ─────────────────────┐
 │ a/<account>/p/<project>/m/<hash>     committed Media (never deleted except by project purge) │
 │ a/<account>/p/<project>/t/<job|upload>/…  staging (expires)   …/r/…  renditions (rebuildable)│
 │ a/<account>/p/<project>/x/…          export builds (rebuildable from the manifest)           │
 │ Browser sees only short-lived signed URLs minted by `media.access` for one key it just read   │
 └──────────────────────────────────────────────────────────────────────────────────────────────┘
```

Five rules carry it:

1. **One spine, many kinds.** Creative truth is stored in a small set of generic append-only tables; a kind's own shape is a validated JSON payload plus extracted index columns. Adding a kind is data, not a table.
2. **Everything derived is rebuildable and written in the committing transaction.** Markers, impact and the Board are queries over indexed lineage; no stored "outdated" flag exists.
3. **Isolation is enforced twice, below the code.** Row-level security keyed by Account, composite foreign keys that make a cross-project reference unrepresentable, and an object key that names Account and project.
4. **A project owns its bytes.** Nothing is shared across projects: duplication copies, purge deletes a prefix and a set of rows. Inside a project nothing is ever collected.
5. **The schema is code.** One forward-only chain of SQL, and checks that fail the build when the live schema, the contract vocabularies or the isolation rules drift.

## 1. What the design has to satisfy

| Source | Requirement |
|---|---|
| Constitution §18.4, §16 principle 11 | User media is private; what is on screen is true (reads are derived or maintained in the writing transaction) |
| §16 principle 3, §4.4 (8), §13.3; R1 | Every document version, entity version, frame and take recoverable; regenerate never destroys; duplicate a project |
| §6.7 (copy-on-use), DOMAIN-MODEL §9 | A copy never shares mutable state; an entity is self-contained so a LATER library can copy it |
| §15.5 (collaboration OUT); M4 | Several independent Accounts, each isolated; nothing shared between Accounts |
| M7; DOMAIN-MODEL §1 rule 4 | Each project's rows and media separable and purge-able as a unit, and the Account enumerable, so purge is an addition |
| ADR 0016, MODULE-ARCHITECTURE §3, §5, §7, §11 | The Store port: transaction with `Scope`, append-only history, indexes maintained in `commit`, the working copy as the one mutable cell, serialisation per Account for spend admission, outbox in the same transaction; a conformance suite run on a real and an in-memory Store |
| LINEAGE §1 rule 6, §2.2; ADR 0004, 0005 | A Revision is never rewritten; markers derived; an inverse index from unit to dependants at 150–250 shots; lock state and the write in one transaction |
| JOB-LIFECYCLE §7, §10, §11, §12 | Success only after media is persisted and verified; storage keys derived from the Job id; Job, Batch and outbox transactional with Attempt creation; Jobs prunable provided the Generation keeps its run history |
| STORY-DOCUMENTS §4 | Working copy written continuously; Revisions have named causes; history uncapped; every write idempotent |
| NAVIGATION §8 | The Board needs a whole-project, shot-level summary read that is cheap at 250 shots |
| #70 | Probe facts (fps, CFR/VFR, frame count, audio layout) frozen on the Media at ingest |
| #73 | Isolation is our discipline on every platform; no option may need an unrestricted shared identity for ordinary requests; engine payloads carry ids only; R2-class storage first |

**What V1 did (evidence, not a model).** A service-role client bypassed row-level security, so per-handler filters were the only tenant boundary; buckets were public with permanent URLs; deleting a row cascaded and left the storage object behind, and one delete path targeted the wrong bucket; `videos` and `frames` buckets and several tables were referenced but never created; the migration runner was dead as written and production was built by hand; enums and CHECK sets disagreed across database, TypeScript and UI (legacy 05 §§1, 4–5, 6, 8; FACT-0145, FACT-0172, FACT-0174, FACT-0236). Each section below says which of these it answers.

## 2. The persistence approach, compared

Four coherent approaches were worked through to "where does the lock check, the marker query, the completion transaction and a project purge live".

| | **A. Relational store, generic append-only spine, JSON payloads, derived indexes in the commit (chosen)** | **B. Document store (a JSON document per object or per project)** | **C. Event-sourced log with projections** | **D. Database (or schema) per Account or per project** |
|---|---|---|---|---|
| Atomic multi-object commit with lock check, captures, Slot choice and outbox | One transaction | Per-document atomicity only, or a transaction layer we write | Natural for the log; projections lag | One transaction *inside* a database; cross-database work (operator totals, spend admission across projects, scheduler claim) needs a second mechanism |
| Marker and impact queries at 250 shots | Indexed join over capture edges; measured ~22 ms (§12) | Application-side scan or hand-built index | Projection; lags unless made synchronous | As A inside the tenant |
| "What you see is true" | Derived reads computed or maintained in the writing transaction | Same, with more hand-maintained indexes | Weak by default (ADR 0016) | As A |
| Append-only enforcement | Privileges plus a blocking trigger, once, for all kinds | Per collection, by convention | By construction | As A |
| Tenant isolation | Row-level security plus composite keys (§6) | Per-collection rules | One stream key and scoped projections | Strongest *structural* separation |
| Purge and duplicate of a project | Set-based delete or copy over indexed `project_id` (4 s and 2 s measured) | Delete or copy documents | Rebuild or filter the log | Drop or copy a database: easiest |
| Operating cost and complexity | One database, one migration chain | New engine skills, weak joins | Highest: schema evolution of events forever, replay bugs | N databases to migrate, back up, pool and monitor; drift between tenants; the scheduler must find work across all of them |
| Fit with a kind-registered gate (ADR 0016) | Good: one commit path, one policy set | Poor: each kind has its own storage rules | Good | Good |
| Verdict | **Chosen** | Rejected | Rejected again as a storage form (same reasons as ADR 0016) | Rejected for V2; kept as an escape hatch (below) |

**Why not D, which wins on separability.** Its two advantages, a trivial purge and a trivial duplicate, are bought by making every cross-cutting need (the Job claim, the spend cap check serialised per Account, operator totals, the outbox, migrations) a multi-database problem. The spike (§12) shows the same two operations on A cost seconds, using the project and Account keys the design carries anyway, so the advantage does not pay for the cost. If a tenant ever needs physical separation (a regulated customer), the spine's key `(account, project)` lets that Account move to its own database without a schema change: that is the escape hatch, not the default.

### 2.1 How kinds map to tables (the question ADR 0016 left open)

| Option | For | Against |
|---|---|---|
| **Table per kind**, fully typed | Natural SQL for each kind | `history` must know every table, so the kind-registered gate becomes per-kind code; append-only, isolation and duplicate-remap are repeated per table; every new kind is a migration |
| **Generic spine plus JSON payload plus extracted index columns (chosen)** | One commit path, one set of policies, triggers and grants, one remap and purge mechanism; the kind owner supplies a payload schema and declares extracted columns | JSON payloads are not constrained by the database, so validation is the kind schema at commit; ad-hoc SQL over payload fields is discouraged, and a field that needs a query becomes a declared extracted column |

**Rule.** A payload field is read in SQL only if its kind declares it as an extracted column (a declared index, §5.5 of the module architecture): Shot parent, anchor block ids, `derived_from`, unit → dependants, a Decision's subject and type. Everything else is read by loading the payload and parsing it with the owner's schema.

## 3. What is stored: the table families

Names are conceptual. Every tenant table carries `account_id`; every project-scoped table also carries `project_id`. Identifiers are 128-bit, time-ordered (UUIDv7-class for index locality), minted by the injected `Ids` port (rule R11) and never used as authorisation.

| Family | Rows | Mutability | Notes |
|---|---|---|---|
| **object** | One row per identity: id, kind, project | Insert only | The target of every composite foreign key (§6.2). "This id belongs to this project" is one lookup. Retired is *not* a column (it is a Decision, derived). |
| **revision** | (object, sequence): parent, cause, actor kind, Generation, action group, labels, `restored-from`, `schema_version`, body, body hash, fingerprints per slice, time | Append-only | The primary key `(object, sequence)` is the compare-and-append (§4.3) |
| **attempt** | Slot, kind, Media reference or inline payload (an Option of text), origin (Generation, upload, derivation), `derived_from`, time | Append-only | Option text and media Attempts share one table; Takes carry the ordered Segment references in the payload |
| **decision** | Subject, per-subject sequence, type (Slot choice, approve, accept, retire, disposition, Acknowledgement, deviation, write-back, lock, unlock, spend initiation), payload, actor, action group | Append-only | Declared columns extracted (subject, type, and for Acknowledgements the dependant, unit, slice, fingerprint) |
| **record** | Generation, generation run, AI-made choice, Deviation, Interview turn, Export manifest, duplicated-from map | Append-only once ended (a Generation gains outputs once, by adoption, as appended rows) | Generation holds Package, Fit report, Rendered request, ResolvedInputs, call log, estimate, actual, Effective model and snapshot ids; large JSON, never pruned with Jobs |
| **capture** | (dependant, unit, slice, fingerprint) | Append-only | Index on `(unit, slice)` gives dependants; index on dependant gives reasons |
| **unit_head** | (unit, slice) → current fingerprint, head sequence | Derived, rebuildable | Written in the commit; also holds Slot-choice units (the chosen Attempt's content hash) |
| **slot_state**, **lock_state** | Latest Slot choice per Slot; latest lock per scope | Derived, rebuildable | Latest-per-subject of the Decision stream |
| **working_copy** | One cell per document: base sequence, version, content | **Mutable cell** | Compare-and-set on `version` |
| **edit_session** | (scope, creator, impact version, expiry) | **Mutable cell** | ADR 0005 grant; server state |
| **job**, **batch**, **batch_edge**, **lease** | Job state machine, dependency edges | **Mutable by design** (state machine with compare-and-set), prunable once settled | JOB-LIFECYCLE §2–§3; carries Account and project ids; no creative content |
| **event** | Outbox: per-Account sequence, type, ids only | Append-only, expiring | §5.3 |
| **action_receipt** | (Account, action id) → result summary | Append-only, expiring | Idempotency window; the Generation duplicate guard is separate (JOB-LIFECYCLE §4) |
| **project** | State: `ready`, `building` (a duplicate in progress), `purging`; kind (`project`, LATER `library`) | Mutable cell | A `building` or `purging` project accepts no creator commit |
| **media**, **rendition**, **external_resource** | §7 | Media immutable | |
| **account**, **invitation**, **identity link**, **setting** (+ **setting_event**), **credential**, **audit_event** | Account-level data | Settings are a current value over an append-only event stream; credentials are write-only | §6.5 |
| **Global reference** | Catalogue Offerings and capability snapshots (content-addressed), price registry, `schema_migration` | Insert only (by migration or operator tooling) | The one exception to "every row has an Account": no creator content, read-only to the app role |

**The closed list of mutable cells** is: `working_copy`, `edit_session`, `job`/`batch`/`lease`, `project.state`, the current value of settings, and the derived tables. Every other tenant table is append-only. A catalog test (§10) fails if a table outside that list lacks the blocking trigger, so the claim "nothing is rewritten" cannot silently rot.

## 4. Versioning implementation

### 4.1 Compared

| Criterion | **A. Full snapshot per Revision (chosen)** | B. Delta chain (patch from the parent) | C. Block-level structural sharing (a Revision lists content-addressed blocks) | D. Operation log (replay edits) |
|---|---|---|---|---|
| Restore, export, duplicate, purge of one Revision | Read one row | Replay a chain; one bad link damages every later Revision | Join a Revision to its blocks | Replay |
| Reliability (precedence 2) | Highest: self-contained | Corruption propagates | One more table whose rows must never be collected | Replay bugs |
| Storage | Largest | Smallest | Small | Smallest |
| Fingerprints for lineage | Stored per slice at write | Must reconstruct | Block hashes come free | Must reconstruct |
| Cost of getting it wrong | Low: bounded (below) | High | Medium | High |

Measured (§12): a 199 KB Master Narrative stored as 300 full JSON snapshots takes 67 MB with random-word text (pessimistic: prose compresses better), about 0.22 MB per Revision. A heavily edited project is a few hundred MB of history, which is cents a month, and a duplicate copies it in about two seconds. **Decision: full snapshots.** Block-level sharing (C) is a storage detail behind `history.read`, so it can be adopted without touching any caller if a measured project ever exceeds the trigger in §14.

### 4.2 What a Revision holds

| Part | Rule |
|---|---|
| **Body** | The owner's payload, valid against that kind's schema at `schema_version`. A story document is the ordered block tree with provenance runs (STORY-DOCUMENTS §2.2). Never edited, never recompressed into another form. |
| **Body hash** | Over the body exactly as stored. Equal hash to the head means a no-op save and appends nothing. |
| **Fingerprints** | A map of slice name → content fingerprint, computed at write time by the kind's slice functions (the units lineage names). These are what captures store and what `unit_head` serves. |
| **Cause, actor kind, Generation, action group, labels, parent, `restored-from`, `written-back-from`** | As LINEAGE §1 and STORY-DOCUMENTS §4. |

**Frozen slices.** A slice's fingerprint function is frozen once any capture references it. Changing what a slice covers defines a *new* slice name; the old one keeps being computed while captures still reference it. Without this rule a code change would make every old capture look different and mark the whole project possibly out of date. A new slice added to an existing kind is backfilled into `unit_head` only (derived, rebuildable) by recomputing from stored bodies; no Revision is rewritten.

**Schema evolution without rewriting history.** A kind's payload carries `schema_version`. The owner supplies pure *upcasters* that read an old body as the current shape. Stored bodies, body hashes and fingerprints are never recomputed, so evolution cannot cause false drift.

### 4.3 Concurrency by primary key

A Revision is inserted at `base + 1`. Two writers on the same base collide on the primary key `(object, sequence)`; the loser receives `StaleBase`, and `history` keeps the loser's content as a side Option or draft Revision (LINEAGE §1 rule 5). The same holds for a Decision stream per subject (the Slot choice carries the choice it saw). No separate head row is needed for correctness; `unit_head` is a derived speed-up.

### 4.4 The working copy and Revision granularity

The working copy is the **one mutable cell** of a document. The client sends autosaves (a short debounce; the value is spec-level) with the cell's `version`; a stale version is refused and the second tab's text is kept as a side draft, never dropped. The worst-case loss after a tab crash is the debounce interval of unsent keystrokes; no durable state lives in the browser (§4 of the module architecture).

A **Revision** is committed from the working copy when any of these happens, and at most once per settled session:

1. an idle pause (value spec-level, default order of a minute) or leaving the document;
2. an explicit "save version";
3. **a forced capture before anything that replaces or captures the content**: an AI apply, a sync, a restore, an import over existing content, and **any `resolve` that will become a captured input**. A Generation can only capture a Revision, so the working copy is committed first, in the same transaction as the capture.

Reading, opening, refreshing and a save whose body hash equals the head append nothing. **No compaction in V2.** History is uncapped; the only permitted future compaction merges `creator_edit` Revisions inside one session and never touches an AI-caused, import, sync, labelled, accepted or captured Revision, which is what STORY-DOCUMENTS §4 already allows.

### 4.5 Other objects

Entities, Looks, Shots, Visual Style and settings are small payloads: a full snapshot per change is trivial. Frames, Takes, entity images, Views and Options are never versioned: they are immutable Attempts, and "which one" is the Slot's Decision stream. Restoring appends a Revision; choosing appends a Decision; neither changes any earlier row.

## 5. Derived state, concurrency and the lock gate

### 5.1 Markers, impact and the Board

`markers = drift(captured, current) − acknowledgements` is one indexed join: each chosen piece of work's capture edges against `unit_head`, minus matching Acknowledgements. The `unit_head` and `slot_state` tables are the "rebuildable cache updated in the committing transaction" that ADR 0004 and MODULE-ARCHITECTURE §5.4 allow. Their rule:

- written only inside `history.commit`, in the same transaction as the append that changes them;
- every derived table has a `rebuild(project)` and a verifier that rebuilds into a scratch area and compares; the verifier runs in CI on the golden project and nightly in production, and a mismatch is an alert, never a silent repair;
- no module may write them (rule R1), and none stores a marker (rule R7).

The **Board** is a single query: one row per shot with its realization state, selected-Take pointer, lock flag, "generating" (from non-terminal Jobs) and a marker flag (the join above). **No materialised summary table is created in V2.** Measured at 250 shots with 150,000 capture edges: 22 ms (§12). The pre-agreed fallback, if the working budget below is missed in the spec's real data, is a rebuildable `shot_summary` table written in the commit, as MODULE-ARCHITECTURE §13 already allows; it is not an asynchronous projection.

**Impact** (`derive.impact`) is a recursive walk over capture edges from a changed unit to chosen dependants, grouped by kind, with money at risk read from Generation cost. The graph is acyclic by construction and its depth is bounded by the pipeline (narrative → shot → frame → take), so recursion is capped at a small fixed depth; the measured direct-dependant lookup is 1–3 ms.

**Working performance budgets** (proposals for the spec's "large-project budgets", consistent with the measurements, not Constitution law): Board and Outline status ≤ 100 ms server time and impact summary ≤ 200 ms at 250 shots; a small `commit` ≤ 50 ms. Measured headroom is 5× or more on the synthetic data.

### 5.2 Concurrency control and lock order

| Need | Mechanism |
|---|---|
| Two writers on one object | Compare-and-append by primary key (§4.3) |
| A lock change must not be overtaken by an edit that already read "unlocked" | A **per-project gate** held as a transaction-scoped advisory lock: every ordinary `commit` takes it **shared**, every commit that changes lock state, accepts, or grants or ends an edit session takes it **exclusive**. The mode is decided from the Change before the lock is taken (an upgrade would deadlock). The spike shows an exclusive request waits for an in-flight shared holder, so an edit already inside the gate completes before the lock lands, and an edit starting after sees the lock. |
| Cap check cannot be exceeded by concurrent actions | A per-Account exclusive advisory lock held for the creating transaction of a Generation or Batch (BUSINESS §6.3) |
| Job claim | `FOR UPDATE SKIP LOCKED` with lease and compare-and-set transitions (JOB-LIFECYCLE) |
| Event order | A per-Account sequence row updated by the committing transaction, so sequence order is commit order within an Account (an auto-increment id can commit out of order and make a replaying reader skip an event) |

**One global lock order, to rule out deadlocks:** (1) Account spend lock, (2) project gate, (3) row writes and primary-key inserts, (4) the Account event-sequence row, last and briefly. Only transaction-scoped locks and transaction-local settings are used, so a transaction-mode connection pooler is safe (§13).

## 6. Isolation

### 6.1 Compared

| | A. Handler filters over a privileged client (V1) | **B. Row-level security plus composite keys plus role split, below the code (chosen)** | C. Schema or database per Account | D. Database per project (a file per project) |
|---|---|---|---|---|
| A forgotten filter leaks | Yes (the V1 failure) | No: the database returns nothing | No | No |
| Compromised or buggy request code | Full access | Limited to the Account named in the transaction | Limited if each tenant has its own credentials; with one shared role it is only a `search_path` convention | Limited |
| Cross-project reference by mistake | Possible | Unrepresentable (composite foreign keys, §6.2) | Possible across projects | Impossible |
| Operator totals, Job claim, outbox relay, scheduler | Trivial | Narrow definer functions returning ids only | N databases to query | N files to query |
| Migrations | One | One | N, with drift between tenants | N |
| Cost | None | Moderate discipline, enforced by catalog tests | High | High |
| Verdict | Rejected | **Chosen** | Rejected (see §2) | Rejected |

### 6.2 The mechanism

1. **Row-level security on every tenant table**, `FORCE`d so even the owner is subject to it, with a policy `account_id = current account`. The current Account is a transaction-local setting written by the Store adapter when it opens a transaction from a `Scope`; an unset value matches no rows.
2. **Composite keys.** The identity table has a unique key `(account, project, id)`; every project-scoped table references it with a composite foreign key. A row cannot name another Account's or another project's object, whatever the application sends.
3. **Roles.** The identities are the set fixed by [RUNTIME-PLATFORM §5](RUNTIME-PLATFORM.md) and [OPERATIONAL-BASELINE §5](OPERATIONAL-BASELINE.md) (#74, #75), here with their data-layer meaning. Nothing on a request, worker or webhook path has DDL or `BYPASSRLS`. **Creating them:** roles are created by SQL `CREATE ROLE` in a migration, **never through the hosting console, API or CLI**: on Neon a role made that way is silently a member of `neon_superuser` and has `BYPASSRLS`, which would make every policy inert (checked against Neon's role documentation, 2026-10-21). The role-posture test (D4) reads `rolbypassrls`, `rolsuper` and membership from the catalogue in every environment, and the app refuses to boot if its own role fails the same check.

   | Role | May | May not |
   |---|---|---|
   | `owner` | Own the schema and run migrations (the pipeline's migration step only) | Be present in any running process |
   | `app` (request and worker transactions) | Read and insert tenant tables under RLS; update only the closed list of mutable cells | Update or delete history; read another Account |
   | `scheduler` (claim, wake, outbox relay) | Call the narrow definer functions (`claim`, `wake`, event relay) that return **ids and times only**; then the worker opens a normal scoped transaction from the returned Account | Select any tenant table |
   | `operator_read` | Select from a fixed set of **content-free views** (Accounts, usage, spend totals, Job states and ages, alerts) | Select from any table or any view not on the list; the list is reviewed and tested |
   | `identity` | Own the auth schema (Better Auth users, sessions, invitations); call `accounts.map_subject`; redeem an invitation, which creates the Account in one transaction | Touch tenant tables |
   | `purge` (an `app`-side grant used only by the purge job) | Run the purge function (§9), which sets the one flag the append-only trigger honours | Be used outside the purge job |
   | `backup` | Read everything for a logical dump, **past row rules** (the single deliberate bypass, OPERATIONAL-BASELINE §5) | Exist on any request, worker or webhook path, or write to production; its DSN lives only in the separate backup app |

   The platform's own admin or "service" credential (for example a hosted database's service key that bypasses RLS) may exist only in the `owner` step and operator tooling. **A design that needs it for an ordinary request is rejected**; this is V1's failure.
4. **Sub-resource ids are never trusted.** A command naming a shot is resolved through the identity table under the Scope; the composite key makes a mismatch impossible even if `history` forgot to check.
5. **Background work.** A Job, webhook handler, sweeper pass and outbox consumer rebuild the Scope from the Account on the Job or event. The `scheduler` role sees only ids; no process ever runs "as the system" over creative rows.
6. **Auth tables** (Better Auth, in our database per #75) live in their own schema behind the `identity` role, outside tenant row rules because they precede an Account. They are nonetheless **Account data for purge and for backup**: a sign-in maps to exactly one Account, and Account purge deletes the auth user, sessions and invitations by that mapping (§9.2). The mapping is read only inside `accounts.map_subject`, so no request-path role can enumerate Accounts. An invitation is a token hash with expiry, single use and a bound email; redemption creates the auth user and the Account in one transaction.
7. **Credentials (BYOK seam), as fixed by #75.** **Operator provider keys are Fly secrets and are never in the database.** Creator-supplied keys are **envelope ciphertext rows**: a random data key per credential encrypts the key, and the key-wrapping key (versioned, held as a Fly secret of `web` and `worker` plus an offline copy) wraps the data key. Account id, provider surface and credential id are authenticated associated data, so a ciphertext copied to another Account or provider fails to open. Write-only: no read path returns plaintext to a browser, log, Generation or error; it opens only in `web` and `worker`. Because backups hold ciphertext but not the wrapping key, a database dump alone exposes no key. Purging an Account deletes its ciphertext rows; the wrapping key is platform-wide, not per Account, so there is no per-Account key to destroy.

### 6.3 Object-store isolation

The key names the Account and the project (§7.1). The bucket is private; the browser never receives a key it did not just read from a row it may see: `media.access` reads the row under the Scope and signs the stored key, never a key supplied by the client. Upload credentials, if used, are scoped to one staging key. Deletion rights are narrow (§7.6). Per-Account prefixes mean Account purge is a single prefix delete and Account storage is enumerable.

### 6.4 What makes it hold: checks, not review

A catalog test fails the build if any tenant table lacks `account_id`, RLS, `FORCE`, the policy, the composite foreign key to the identity table, or the correct grants, or if any table is unclassified (tenant, global reference, or auth). The two-Account harness generated from the contract's operation list (MODULE-ARCHITECTURE §11) proves for every operation that Account B on Account A's ids is refused. Rules R14 to R18 (§10.4) are the standing checks. The spike confirmed the primitives (§12).

## 7. Media

### 7.1 Model

**Committed Media** is an immutable, content-hashed object that belongs to exactly one project. A `media` row records Account, project, content hash, size, content type, **probe facts frozen at ingest** (fps, CFR or VFR, frame count, audio layout, dimensions, duration), the storage key, and origin (upload, Generation output with Job id and output index, or derivation with `derived_from`). `(project, content hash)` is unique: identical bytes inside a project are one Media row with many referrers (Segments shared between Takes, a View promoted from a Frame). The meaning lives on the referrer (Attempt, Supplied item, Reference Media, Performance); the bytes live on the Media. A committed Media row is inserted in the same transaction as its first referrer, so **committed Media always has at least one referrer** (a query-checkable invariant).

Object keys under one private bucket per environment:

| Prefix | Holds | Lifetime |
|---|---|---|
| `a/<account>/p/<project>/m/<hash>` | Committed Media | Never deleted except by project or Account purge |
| `a/<account>/p/<project>/t/<job-or-upload>/<n>` | Staging: a provider output being fetched, an upload in progress | Expires by a bucket lifecycle rule (value spec-level); the only garbage collector under this prefix |
| `a/<account>/p/<project>/r/…` | **Renditions**: thumbnails, posters, playback copies, waveforms | Rebuildable from the original; may be evicted |
| `a/<account>/p/<project>/x/…` | Export builds | Rebuildable from the manifest (same manifest, identical contents); expire after a window |
| `a/<account>/l/…` | LATER library items | Reserved |

### 7.2 Ingest: success only after persistence (JOB-LIFECYCLE §7, §10)

```diagram
 provider output ─fetch─▶ t/<job>/<n> ─verify─▶ hash · decode · probe · size cap ─▶ m/<hash>
                                                                                      │
        ONE database transaction:  media row (if new) · Attempt · actual cost · Job succeeded · event
```

1. The fetch writes to a staging key **derived from the Job id and output index**, so a re-run overwrites the same object and is idempotent.
2. Verification before success: non-empty, content type and container decode, duration and dimensions probed, content hash computed; an upload is checked against a size cap and, where the store offers it, the store's checksum header, otherwise by a server read. Failure leaves nothing but expiring staging.
3. Promotion to `m/<hash>` is a server-side copy; if the hash already exists in the project the Media row is reused and the staged object is deleted.
4. Only then does the settling transaction insert the Media row and the Attempt. A crash between steps leaves expiring staging and a Job that re-runs the fetch; **no database row ever points at an object that is not there**, and the reverse (an object with no row) is confined to the expiring prefixes. A scheduled reconciliation lists `m/` against the table and alerts on any object without a row; it never deletes under `m/`.

Uploads use a signed upload to a staging key; the server verifies before the Media row exists. A signed `PUT` cannot cap size, so the cap is enforced by verification (and by a signed form policy where the store supports one).

### 7.3 Private access

`media.access(scope, ref, purpose) → short-lived signed URL` for exactly one key, purposes `view`, `download`, `upload`. Rules:

- The bucket is never public; no URL is permanent; a provider URL is never handed to the browser.
- The URL lifetime is a tuning default (order of an hour for `view`, minutes for `download`). Playback of a 4–12 s clip uses range requests; expiry is checked per request, so the client re-mints on a 403 and seeking after expiry works.
- Clips need their index at the front (`+faststart`) to scrub. The original bytes are never altered (export and the content hash depend on them). If an original lacks it, ingest creates a **playback rendition**, not a new Media. Transcoding stays as #70 decided: none by default, except VFR to CFR where the exporter requires it.
- Signed URLs given to a provider (to fetch a reference) are minted at dispatch with a short life and are not recorded; the Generation records Media ids and hashes (GENERATION-PACKAGE).
- Headers: `Cache-Control: private`, a download disposition for `download`, and a response content type taken from the Media row.

### 7.4 Ownership of generated and uploaded artifacts

| Artifact | Owner of meaning | Owner of bytes |
|---|---|---|
| Generated Frame, Take, entity image, View | The Attempt, created by `history` through the settler, tied to its Generation | The Media in the Generation's project |
| Uploaded Source Material, Reference Media, Performance, uploaded Frame | The Supplied item or uploaded Attempt (origin: upload, uploader) | The Media in that project |
| Still extracted from a Take (a Frame source) | An Attempt with `derived_from` the Take | A new Media with `derived_from` lineage |
| Thumbnail, poster, playback copy, waveform | None (not creative) | A rendition, rebuildable |

### 7.5 Provider-held resources

A cloned voice or similar provider-side object is **not Media**. It is an `external_resource` row owned by the **Account** (handle, provider, owning project, immutable once created), referenced by projects. Duplication shares the handle (voice identity is immutable, so nothing can diverge); purge of a project releases its reference; the provider-side resource is deleted when its last reference goes or on Account purge. This is the one place reference counting exists, because we do not control those bytes. If #69 or #66 finds a provider that can cheaply re-clone from the stored sample, re-creating per project replaces sharing without any other change.

### 7.6 Deletion rights

`BlobStore.delete` exists only for the `t/`, `r/` and `x/` prefixes. Deleting under `m/` has exactly one caller, `media.purgeProject`, enforced by an import-boundary rule (R16). Where the storage vendor lets a credential be denied delete on a prefix, or lock objects against deletion, use it as defence in depth; correctness does not depend on it, because some vendors may bundle delete into object write permission (not verified for the #73 first pick; #74 confirms).

### 7.7 Storage accounting

Bytes per project and per Account are derived from `media` rows. There is **no storage quota in V2** (the hidden operator ceiling bounds spend, not storage); the operator gets an alert on unusual per-Account growth. Whether to add a quota is a spec or operations decision, noted in §14.

## 8. Project duplication and copy-on-use

### 8.1 Duplication compared (the media half)

| | A. Share blobs, reference-count | B. Physical copy per project (chosen) | C. Account-wide content-addressed store with per-project links |
|---|---|---|---|
| Purge a project | Decrement; delete when last reference goes; a race with a concurrent duplicate; a counting bug destroys another project's media | Delete a prefix | As A |
| "Nothing is lost" under a bug | A bug can destroy shared media | A bug is confined to one project | As A |
| Isolation | A key outside the project's prefix is reachable from two projects | Prefix names exactly one project | As A |
| Storage cost | Lowest | One copy per duplicate: about $0.015 per GB-month at R2-class prices (#73), so a 20 GB project costs about thirty cents a month to duplicate | Lowest |
| Duplicate latency | Instant | Proportional to server-side copy throughput (a background Job with progress) | Instant |
| Verdict | Rejected | **Chosen** | Rejected |

The precedence list (no loss > reliability > cost) decides it. The domain documents allowed sharing ("Media is immutable, so a copy may share the stored object"); this ADR closes that option for *cross-project* sharing and keeps it for *within* a project.

### 8.2 The procedure ("appears whole or not at all")

1. Allocate the new project id and write a durable `pending_duplication` record; the project is `building` and invisible to the creator.
2. Copy the source project's `m/` objects to the new prefix by server-side copy, keyed by content hash so a retry is a no-op. This is a local-work Job (JOB-LIFECYCLE), resumable by the sweeper.
3. **One database transaction** builds the new project's rows from the source with a set-based id remap: every object, Revision, Attempt, Decision and Generation gets a new id; captures and Acknowledgements are remapped so markers reproduce by derivation; a `duplicated-from` map is recorded; Generations are copied as immutable records flagged cost-`inherited`; Slot choices, locks and dispositions are copied as events with the same state. The project becomes `ready` in the same transaction.
4. In-flight Generations, all Jobs and Export builds are not copied (BUSINESS, LINEAGE §7). A failure or abandonment before step 3 leaves only the unreferenced new prefix, which the sweeper deletes when the pending record expires; the source is only ever read.

Remap is generic: each kind declares which payload paths hold ids (`remap` rule, MODULE-ARCHITECTURE §5.5), and `project.planDuplicate` returns a remap plan that the Store executes set-based. The spike duplicated a project with 150,000 capture edges and 17,730 Revisions in one transaction in 2.1 s (database part only).

### 8.3 Copy-on-use for the LATER library (Constitution §6.7)

Persistence supplies three constraints so the library needs no redesign: (1) an Entity or Visual Style is **self-contained**: its Looks, Views, images and Revisions are reachable from it by kind-declared closure rules, and nothing in its rows names project truth (usage lives on Presence and shot links); (2) a **library is another project-shaped container** under the Account (`project.kind = library`, key prefix `a/<account>/l/`), so every table, policy, remap and purge rule applies unchanged; (3) copy-on-use is the same machinery as duplication restricted to a closure: new ids, a "copied from" note that is informational only, and a **physical copy of the closure's Media**. No live link between containers exists, so editing one can never change another.

## 9. Retention, garbage collection and purge

### 9.1 Retention classes

| Class | Examples | Rule |
|---|---|---|
| **Creative truth** | Revisions, Attempts, Decisions, Records, Generations with run history, committed Media, captures, Acknowledgements | Kept for the life of the project. Never collected, compacted or pruned. Retire only |
| **Operational** | Jobs, leases, Batches, settled outbox events, action receipts | Pruned after a window once settled (values spec-level; the Generation keeps the run history, so pruning loses no answer) |
| **Derived** | `unit_head`, `slot_state`, `lock_state`, search index, spend summaries, notice lists | Rebuildable; never authority |
| **Rebuildable media** | Renditions, export builds | Evictable; regenerated on demand from the original or the manifest |
| **Staging** | `t/` objects | Expire by lifecycle rule |
| **Global reference** | Catalogue snapshots, price registry | Kept as long as any Generation references them (effectively permanent; tiny) |
| **Provider output** | The provider's copy of a result | Not ours to retain: the Job copies it into committed Media before success; if retention expires first the Job fails visibly as `output_lost` (JOB-LIFECYCLE §10) |

Outbox events carry ids only; a client that has missed more than the replay window refetches its read models rather than replaying (the stream says so explicitly).

### 9.2 Purge (M7): decided now, built later

Purge is an addition, not a rewrite, because every row has `(account_id, project_id)` and every key has the same prefix. The designed operation, so the feature needs only code:

**Project purge**

1. Mark the project `purging`: invisible, rejects every commit and every Job claim; cancel in-flight Jobs.
2. Release `external_resource` references.
3. If the operator keeps anonymised spend totals (open, decided with the feature; BUSINESS §1.7), write content-free per-period, per-provider, per-model rollups to an Account-level table first. The design supports either answer.
4. Delete the project's rows in dependency order through the `purge` function, which sets the one flag the append-only trigger honours for that project id.
5. Delete the prefix `a/<account>/p/<project>/` and list it to confirm it is empty; remove the same prefix from the independent replica or let it age out (§13).
6. Write a content-free `purge_record` (ids, time, counts, byte totals) to the **purge log** that #75 requires, held outside the database being restored (OPERATIONAL-BASELINE §8.2), so a restore can replay it.

**Account purge** is every project purge, then the Account-level rows, the credential ciphertext rows, the auth user, sessions and invitations mapped to the Account, then the prefix `a/<account>/`, then a catalog-driven verification: for every tenant table, a count by `account_id` is zero.

**Completeness is testable:** the verification above runs in tests on the golden project, and the same catalog that enforces isolation is the list of tables to purge, so a new table cannot be forgotten. **Backups** retain purged data until they age out, and a restore must replay the purge log; #75 states the dump retention window and the replay rule, which this design makes executable because every row and key carries the project id. The spike purged a 150,000-edge project's rows in 4.1 s.

## 10. Schema authority, migrations, drift and types

### 10.1 Authority

| What | Authority |
|---|---|
| **Structure** (tables, columns, keys, indexes, policies, grants, triggers, definer functions) | The migration chain in the repository |
| **Payload shapes** | The owning module's kind schema (versioned by `schema_version`) |
| **Vocabularies** (reason codes, job states, failure classes, spend classes, lock scopes, provenance kinds…) | `contract` (ADR 0016); the database stores text |
| **Row types** | The committed schema snapshot; generated inside the Store adapter, never exported (MODULE-ARCHITECTURE §8: persistence shapes belong to the Store adapter) |

### 10.2 Migration policy

One linear, forward-only chain of SQL files, applied under the `owner` identity by the pipeline's migration step (OPERATIONAL-BASELINE §4.2) **before new code starts**, recorded with checksums. Changes follow **expand, then contract**: add (nullable column, new table, new vocabulary value) in one release, switch code, remove in a later release. A running old version must work against the expanded schema. Rollback is expand/contract plus restore from backup, never a down migration. A migration that touches a tenant table must state, in the file, its isolation (the catalog test enforces the result). The migration tool is spec-level; the policy is not. V1's dead runner and by-hand production setup (legacy 05 §1) are the counter-example: the chain must be the *only* way production is built.

### 10.3 Drift checks (all fail the build or readiness)

| # | Check | Catches |
|---|---|---|
| D1 | Apply the whole chain to an empty database; the introspected schema must equal the committed **schema snapshot** | A migration that doesn't produce what the code assumes |
| D2 | At deploy and in readiness, the live catalog equals the snapshot; mismatch fails readiness | A table referenced but never created, a hand edit in production (V1) |
| D3 | Every vocabulary CHECK in the database equals the generated set from `contract`; adding a value is a `contract` change plus a generated expand migration | Enums that disagree across database, TypeScript and UI (V1) |
| D4 | Tenant-table catalog test: `account_id`, RLS, `FORCE`, policy, composite FK, grants, classification (§6.4) | A table without isolation |
| D5 | Append-only test: every table not in the mutable-cell list has the blocking trigger and no `UPDATE`/`DELETE` grant | History becoming rewritable |
| D6 | No column named or typed as a marker, "outdated" or equivalent (R7) | A stored staleness flag |
| D7 | Round trip per kind: payload → row → payload equals the input; every upcaster applies to recorded old fixtures | Lossy persistence and evolution bugs |
| D8 | Derived-table verifier (§5.1) on the golden project | A cache that no longer matches its inputs |
| D9 | Store conformance suite passes on the real database and the in-memory fake (MODULE-ARCHITECTURE §11) | A fake that lies |

### 10.4 Added architecture rules (extend R1 to R13 of ADR 0016)

| # | Rule | Enforced by |
|---|---|---|
| R14 | Every tenant table has `account_id`, forced RLS and the composite key; every table is classified | D4 |
| R15 | Runtime roles cannot `UPDATE` or `DELETE` history; only the closed mutable-cell list is writable | D5 |
| R16 | `BlobStore.delete` is available only for staging, rendition and export prefixes; committed-media deletion has one caller, `media.purgeProject` | Import-boundary check |
| R17 | No row or object key references or contains two projects; keys are built only by `media`, from a Scope | D4 + a key-builder property test |
| R18 | The database holds storage invariants only (tenancy, append-only, keys, uniqueness). No creative rule lives in a trigger or function; the three definer functions return ids and times only | Review rule + D4 function allowlist |

## 11. Generation, Job and spend records

- A **Generation** is an append-only Record: Package, Fit report, Rendered request, ResolvedInputs, call log, estimate, actual and the run history (one appended row per Job outcome). It is never pruned with Jobs. Provider-signed URLs and credentials are never stored in it; media appear as Media ids and hashes.
- The **Job** row is the one mutable state machine: compare-and-set transitions, lease, deadline, operation reference. It carries Account and project ids and no creative content. Pruned after a window once settled.
- **Spend** lives on the Generation (BUSINESS §5.2). Summaries are queries over indexed Account/period/state columns; the only cached figure is the cap check's, rebuildable. Admission is the per-Account lock plus the committed-spend query (§5.2).
- **Settling** is one transaction: the Media row, the Attempt (through `history.commit`), actual cost, Job state, the Slot-choice or Option decision, and the outbox event (JOB-LIFECYCLE §11).
- **Catalogue snapshots** are global reference rows keyed by content hash; the Generation stores the Model, Offering and snapshot ids, so a snapshot is retained while referenced.

## 12. Evidence: what was run, and its limits

A throwaway Postgres 16.2 spike (schema plus a Python harness; branch [`research/persistence-spike`](https://github.com/dlopezkluever/aiuteur/tree/research/persistence-spike), never merged) built the spine's essentials and ran them as a non-owner role under forced row-level security. It is not an implementation and not a benchmark of the product.

| Check | Result |
|---|---|
| Account A sees B's rows (objects, revisions) | 0 rows |
| A inserts a row claiming Account B | refused by the RLS `WITH CHECK` |
| A inserts an object into B's project under A's Account; A captures a B unit | refused by composite foreign keys |
| A updates a revision; A deletes an attempt | refused by missing privilege; the blocking trigger also stops a superuser, except under the purge flag |
| Transaction with no Account set | sees 0 rows |
| `dispatch` role (the `scheduler` identity of #74) reads the job table; calls `claim_job()` | refused; the function returns `(job id, account id)` only |
| Gate: an exclusive request arriving while an edit holds the shared gate | waits, then proceeds after the edit commits |
| Board, 250 shots, 3,000 attempts, 30,000 capture edges | 8–20 ms |
| Board, 250 shots, 15,000 attempts, 150,000 capture edges, 17,730 Revisions, all marked | 22 ms |
| Dependants of one entity (1,110 of them) | 3 ms |
| Duplicate that project in one set-based transaction (150,000 edges, 17,730 Revisions) | 2.1 s |
| Purge that project's rows | 4.1 s |
| Capture row size | about 0.27 KB each (49 MB for 183,600 rows) |
| 300 full snapshots of a 199 KB document | 67 MB (about 0.22 MB each) |

**Limits.** One machine, a local socket (no network round trip), a warm cache, synthetic uniform data with 200-byte payloads, one reader, a simplified Board (no phase, lock or Job joins, no transitive "via" reasons). The numbers show headroom of an order of magnitude, not a promise. The design does not depend on them being exact: §5.1 names the fallback, and the spec's golden project re-measures. Object-store behaviour (copy throughput, lifecycle rules, checksum headers, delete permissions) was not run; those items are on the #74 checklist.

## 13. The chosen platform checked against this design

#74 chose Neon (Postgres), Cloudflare R2 and Fly.io; #75 chose Better Auth in our database, Fly secrets for keys and a second-vendor backup. This section checks them against what this design needs and records the changes the check forced. Facts are dated 2026-10-21; unverified items are marked.

| # | Need | Chosen platform | Result |
|---|---|---|---|
| P1 | Custom roles, `FORCE ROW LEVEL SECURITY`, definer functions, advisory locks, `SKIP LOCKED`, non-superuser app connection | Neon | Standard Postgres features. **Forced change:** roles made through Neon's console, API or CLI get `neon_superuser` and `BYPASSRLS` (Neon's role documentation and an open Neon issue), so every role is created with SQL in a migration, and the role-posture test and a boot check assert no bypass (§6.2). The project's default owner role is `owner`, used only by the migration step |
| P2 | Only transaction-scoped settings and locks | RUNTIME-PLATFORM RT2 | Matches; `web` may use a pooler, `worker`, stream tail and migrations use direct connections |
| P3 | No runtime RLS-bypassing credential or HTTP data API | Neon without its Data API; no Supabase | Holds. The Neon Data API must stay unused (it requires its own RLS and an auth function we do not use); add to RT5's list. The one bypass is `backup`, in its own app |
| P4 | Point-in-time recovery, encrypted backups | Neon history window plus #75's independent copy | Holds; purge replays the purge log on restore, and dumps age out within the stated retention window |
| P5 | Private bucket, signed GET and PUT, server-side copy, prefix list and batch delete, lifecycle expiry by prefix, checksums, range reads, CORS | R2 | Presigned GET and PUT, range reads, CORS, prefix listing and batch delete (free), per-prefix lifecycle expiry (at most 1,000 rules), conditional writes and server-side copy are in the #73 report. **No object versioning or object lock** (inferred), so a deletion by our own code is permanent: this is why committed-media deletion has one caller (R16) and why #75 keeps a copy-only-new replica. Presigned URLs work only on the storage host, not a custom domain (accepted in #74). A signed PUT cannot cap size on R2: verification and HEAD after upload, as §7.2 already says. Prefix-scoped temporary credentials exist; whether presigned URLs can be built from them is **not verified**, so `media.access` signs with the app credential and the key is built only by `media` from a Scope (R17) |
| P6 | Egress not cost-sensitive | R2 (free egress) | Holds |
| P7 | Master key outside the database | Fly secrets plus an offline copy (#75) | Holds; see §6.2 item 7 |

**Backup replica and purge.** #75 copies new objects to a second vendor without deleting. The replica and the dumps are therefore the places a purged project can linger. The design supplies: replica keys that use the **same project-separable prefix** as the primary (`a/<account>/p/<project>/…`), so the replica job can remove a purged project's prefix with the same project id; dumps stay bounded by their retention window; and the purge log (§9.2) is what every restore replays. The replica's credentials cannot delete (#75), so removal on purge is a separate, narrowly credentialed purge step (the backup app's delete capability is used only by that step), or, if the vendor cannot scope delete, the replica prefix simply ages out with a lifecycle rule: either way the promise is stated as "a purged project leaves the primary immediately and every backup within the dump retention window".

**Runtime tables this design now lists.** To implement #74 without a second store: `job` carries one `due_at`, a lease token and holder, state, state deadline and attempt counts; `event` has a per-Account counter row assigned as the last write before commit; `webhook_receipt` is unique on (provider, delivery id) and stores Account and Job ids only; the circuit-breaker and price rows are global reference data with no creator content. None of them holds prompts, media or keys.

## 14. Not decided here, and when to revisit

**Spec-level values:** autosave debounce and idle-settle time, signed-URL lifetimes, staging and export expiry, operational retention windows (Jobs, events, receipts), edit-session idle expiry, exact column lists, the migration tool, the id format variant, the schema language for `contract`, the allowlist of operator columns.

**Open, owned elsewhere:** whether purge keeps anonymised spend totals (decided with the deletion feature, M7); whether to add a storage quota (operations); the provider-resource copy-or-re-create rule per provider (#69, #66); whether R2 presigned URLs can be built from prefix-scoped temporary credentials (unverified); whether the replica vendor can scope delete for purge (#75's backup vendor check). The backup window and purge-log replay are settled in #75 §§8–9.

**Revisit if:** the Board or impact query misses its budget on the spec's golden project (use the rebuildable `shot_summary`); a measured project's Revision bodies exceed about 1 GB (adopt block-level sharing behind `history.read`); duplication copy time becomes a product problem (then, and only then, consider the account-wide content-addressed option C of §8.1 with its purge risk, as a new ADR); an Account needs physical separation (move it to its own database along the `(account, project)` key); the per-Account event-sequence row becomes a contention point (move to a commit-order-safe allocation per Account).

## 15. Hand-offs

| Ticket | Receives |
|---|---|
| **Runtime platform** (#74, closed) | Reconciled in §13: the `scheduler` identity's definer functions, the lock order of §5.2 (the claim's admission lock sits with the Account spend lock at the top of the order), the job, event and receipt rows, and Neon's role caveat. Amendment for #74: add the Neon Data API and console-created roles to the RT5 list of unused vendor features |
| **Operational baseline** (#75, closed) | Reconciled in §§6.2, 9.2, 13: its six identities with their data-layer meaning, auth schema inside Account purge, envelope credentials, the purge log replayed on restore, project-separable replica keys, and D1 to D9 and R14 to R18 as additional CI gates beside its G1 to G11 |
| **Verification** (#76) | The Store conformance suite on real and in-memory adapters; the two-Account harness; the derived-table verifier; a golden project with 250 shots for the budgets; fault injection between fetch, promote and settle; purge and duplicate completeness tests |
| **Build sequence** (#77) | Build order for persistence: the spine, the gate and `unit_head` first (every slice depends on them); media ingest with the first generated take; duplication and purge last |
| **Contract freeze** (#78) | Freeze: the `Store` and `BlobStore` interfaces, the kind-declaration shape (slices, extracted columns, remap paths, closure rule, separability rule), `media.access`, the vocabulary-to-CHECK generation, the event envelope. Table and column names are not frozen |
| **Voice and performance** (#69) | `external_resource` and its share-on-duplicate, release-on-purge rule |
| **Providers and models** (#66, closed) | Snapshots as global reference rows keyed by content hash; Model, Offering and snapshot ids on the Generation; effective-model reason codes on the Generation |

## 16. V1 failures answered

| V1 failure (legacy 05, 15) | Answer |
|---|---|
| Service-role client; RLS bypassed; per-handler filters the only boundary | Forced RLS, composite keys, role split; a service credential is a rejected design (§6) |
| Public buckets, permanent URLs | Private bucket; short-lived signed URLs for one key (§7.3) |
| Storage objects orphaned on delete; a remove targeting the wrong bucket | One bucket, deterministic keys, one deletion path, purge by prefix with verification (§7.6, §9) |
| `videos` and `frames` buckets and tables referenced but never created | D1 to D3: the chain is the only way production is built, and readiness fails on drift (§10) |
| Dead migration runner; production built by hand | Forward-only chain applied as a deploy step with checksums (§10.2) |
| Enums disagreeing across database, TypeScript and UI | Vocabularies owned by `contract`, generated into CHECKs, checked (D3) |
| Cascading deletes of scenes, shots, frames | No cascade from history; no delete grant; retire only (§3) |
| Version rows from every PUT; capped history | Named causes, no-op detection, uncapped history, no compaction (§4.4) |
| Non-transactional mutation fan-out | One `commit`, derived state written in it (§5) |

## 17. Constitution check

No requirement was found unworkable or contradictory; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** §18.4 (user media private): private bucket, server-signed single-key URLs minted from rows read under the Scope. §16 principle 3 and R1: append-only history, no delete path, retire only; the creator-ratified purge carve-out (M7) is a deliberate whole-project or Account operation, designed in §9 and never partial. §4.4 (8): duplication is a complete, atomic, independent project (§8). §6.7: copy-on-use is a copy with physical media and no live link (§8.3). §15.5: nothing is shared between Accounts; an Account has one creator. M4: isolation below the code on every path including background work. M5/M6: the credential seam and the operator allowlist. §16 principle 11: derived state is computed or written in the committing transaction. Principle 12: one database, one chain, one commit path; the clever options (event sourcing, database per tenant, shared blobs with counting, delta chains) were rejected on reliability.
