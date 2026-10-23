# Aiuteur V2: Module Architecture

Resolution of Wayfinder ticket #71. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). The objects and their owners come from the [domain model](../domain/DOMAIN-MODEL.md); the write gate, lineage and locks from [`LINEAGE-AND-STALENESS.md`](../domain/LINEAGE-AND-STALENESS.md) and [ADR 0004](../adr/0004-possibly-out-of-date-is-derived-from-lineage.md)/[0005](../adr/0005-locks-are-server-enforced-domain-state.md); the compiler from [`GENERATION-PACKAGE.md`](../domain/GENERATION-PACKAGE.md) and [ADR 0014](../adr/0014-a-generation-is-compiled-into-one-layered-package-that-is-recorded-shown-and-sent.md); the run lifecycle from [`JOB-LIFECYCLE.md`](../domain/JOB-LIFECYCLE.md) and [ADR 0006](../adr/0006-job-lifecycle-durable-runs-and-bounded-spend.md); the AI guards from [`AI-RESPONSIBILITY-MAP.md`](../ai/AI-RESPONSIBILITY-MAP.md); accounts and spend from [`BUSINESS-AND-OPERATIONS.md`](../domain/BUSINESS-AND-OPERATIONS.md); the Catalogue, selection, capability evaluator, adapter boundary and dispatch gate from [`PROVIDERS-AND-MODELS.md`](../domain/PROVIDERS-AND-MODELS.md) and [ADR 0015](../adr/0015-models-are-reviewed-catalogue-data-behind-a-fail-closed-capability-contract.md). The trade-off decided here is [ADR 0016](../adr/0016-modules-follow-ownership-of-truth-and-every-write-passes-one-history-gate.md).

This document says which modules exist, what state each owns, through which interface the others reach it, and which rules keep it that way. It names no language, framework, database, queue, host or vendor (those are #72, #74, #66), and it contains no tables, endpoints or code. Where it uses a module name it means a *logical* module with one public interface; how modules are packaged is a spec decision.

## 0. The decision in one page

Aiuteur is a **modular monolith**: one codebase, one transactional store, one module graph, started in several process roles (web, worker, timer) that differ only in which entry points they run. Modules are cut **by who owns which truth**, not by screen, phase or technical layer. Three rules do most of the work.

1. **Workflow truth lives in one server module, `history`, and nowhere else.** `history` stores every Revision, Attempt and Decision, owns the **write gate** (the only way creative truth changes: locks, compare-and-append, provenance, atomicity) and **derives** possibly-out-of-date markers, impact summaries and the to-reconcile list from lineage. The client holds layout, selection and unsaved keystrokes; nothing else.
2. **Domain modules are pure planners over `history`.** `story`, `world`, `production` and `project` define kinds, derivations and planners: given current state and an intent they return a **Change** (a set of appends). They never write. `history.commit` is the only writer, so a lock, an account boundary or a lineage edge cannot be skipped by a clever path.
3. **Generation is a pipeline of small modules with one record and one send path.** `compiler` is pure; `generation` records the Rendered request before dispatch and owns the single code path that sends it; `jobs` runs durable work with the lifecycle's guarantees; `spend`, `providers` and `media` sit beside them. Completion is one transaction: bytes already stored, Attempts attached through `history`, cost set, event written.

```diagram
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │ INTERFACE    client ──imports only──▶ contract ◀── api  (authn → Scope, parse, idempotency)│
 ├─────────────────────────────────────────────────────────────────────────────────────────┤
 │ USE CASES    workflows  (every creator command + the defined workflow operations)        │
 │              guards (pure G1–G10)                                                        │
 ├───────────────────────────────────────────────────────┬─────────────────────────────────┤
 │ DOMAIN       story   world   production   project      │ READ     views (Outline, Board,  │
 │ (pure rules, kinds, planners → Change)                  │ MODELS   shell status, Ledger,   │
 │                                                         │          review-all, inbox)      │
 ├───────────────────────────────────────────────────────┴─────────────────────────────────┤
 │ TRUTH        history: write gate · Revisions · Attempts · Decisions · locks · lineage ·   │
 │              derive(markers, impact, to-reconcile) · edit sessions · outbox events        │
 ├─────────────────────────────────────────────────────────────────────────────────────────┤
 │ GENERATION   compiler (pure)  generation  jobs  spend  providers (catalogue │ adapters)  │
 │ MEDIA/OUT    media   export          IDENTITY  accounts                                  │
 ├─────────────────────────────────────────────────────────────────────────────────────────┤
 │ PORTS        Store · BlobStore · Scheduler · Vault · Clock+Ids · Stream · Auth ·         │
 │ (adapters    ProviderTransport                                                           │
 │  wired only in composition roots)                                                        │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
        arrows point down: a module may import only modules below it or its listed peers (§9)
```

## 1. What the design has to satisfy

| Source | Requirement the decomposition must meet |
|---|---|
| Constitution §17.2, §16 principle 11, §18.4 | Progress, locks and staleness are not owned by, or enforced only in, screens; protections shown hold everywhere; user media is private. |
| Constitution §16 principle 12, precedence 2 (reliability) | Simple and explicit beats clever; a feature that cannot be made reliable is simplified. |
| DOMAIN-MODEL §1 rules 1, 4, 6, 8; ratification M4, M7 | One owner per truth; retire not delete; reading never writes; every object belongs to one Account and isolation holds on **every** path, including background work; each project separable for later purge. |
| LINEAGE §1 rule 1, §6.3, §9 | One write gate for editable objects and Slot choices; server-computed impact; lock state in the same transaction as the write; no other module stores a marker. |
| ADR 0005, TRUST-SIGNALS §5 | Impact summary and edit-session confirmation are server operations; the confirmation carries the impact version. |
| GENERATION-PACKAGE §3, §16 | Compiler is pure with no IO; Resolve reads through owners; no other module builds prompt text; one module owns the record and the one dispatch path. |
| JOB-LIFECYCLE §1, §11, §14 | Job exists before any provider call; completion attaches through one transaction; a job store, scheduler and sweeper, adapter boundary and outbox; "generating" is derived. |
| AI map §1, §3 | Models propose, code commits; guards are pure; every Generation names the creator action that started it (G10). |
| BUSINESS-AND-OPERATIONS §6.3, §7, §12 | Spend module beside generation; atomic per-Account cap check in the creating transaction; credential resolved by (Account, provider); price registry free of vendor names. |
| NAVIGATION §3, §5, §8 | Shell status is a cheap derived read of server truth at 250 shots; no workflow state in the UI. |
| #70 | Exporters sit behind a capability descriptor; media facts (fps, CFR, frame count, audio layout) are frozen per take at ingest. |

**What V1 did (evidence, not a model).** Four route files held six to ten unrelated domains each; about 800 table-literal persistence calls sat in routes and services; one service-role client meant per-handler `user_id` filters were the only tenant boundary, with sub-resource ids unchecked; the shot existed in seven shapes and the frame shape was hand-copied between layers; style loading was copied four times with three failure policies; one lock wrote three places through three client calls; and locks lived in screens (legacy 15 SP-01 to SP-09, SP-24 to SP-26, SP-46, SP-78 to SP-80; legacy 11 §3.11). Each design below is judged against these as well as the requirements.

## 2. Decompositions compared

Four coherent decompositions were worked through to the level of "which module holds the lock check, the marker derivation, the completion transaction and the account boundary".

| | **A. Layered tiers** (routes → services → data; V1's shape, tidied) | **B. Phase slices** (one module per creative phase: input, treatment, beats, narrative, world, shots, frames, video, review) | **C. Owner modules over one write gate (chosen)** | **D. Event-sourced core with projections** (one event log; modules are handlers and projections) |
|---|---|---|---|---|
| Where workflow truth lives | In services called by routes; the lock check is convention in each service | In each slice; locks and markers repeated or shared by library | `history` alone; screens and slices cannot hold it | The event log, read through projections |
| One gate for every write | No: any service with a database handle writes | Only if every slice calls a shared library correctly; any slice can skip it | **Yes by construction:** only `history` has write access to creative truth | Yes (handlers append events) |
| Lineage and markers | Computed where someone remembered | Each slice has its own dependants; cross-phase edges (a character edit marks frames and takes) cross every slice | One owner derives from captured inputs; domain modules declare slices | Projection; lags the log unless made synchronous |
| "What you see is true" (read your writes) | Depends on caching | Depends on each slice | Derived reads are computed or maintained **in the writing transaction** | **Weak by default:** projections are eventually consistent; making them synchronous removes the benefit |
| Fits the domain's own shape | No: V1 | **No.** A phase is "a stage of work, never an object that holds creative content" (glossary). Truth cuts across phases (an entity serves Interview-to-export) | Yes: modules follow the ownership table (DOMAIN-MODEL §6) | Partly: history is append-only already, but an event is not a Revision; Attempts and Decisions are state with identity |
| Atomic completion (media, Attempt, cost, event) | Spread over services | Spread over slices | One transaction, owned by `jobs`, writing through `history` | Natural |
| Tenant isolation | Per-handler filters (V1) | Per slice | One `Scope` argument on every port; one place to enforce | One stream key; projections must also be scoped |
| Cost, risk | Lowest; reproduces V1's failures | Medium; V1's stage coupling reappears | Medium. Risk: `history` becomes a bottleneck or god module | Highest: event schema evolution forever, projection rebuilds, replay bugs; contradicts "reliable over clever" |
| Parallel work by agents (#78) | Collisions in shared services | Good by phase, but shared concerns collide | Good: modules are ownership units with narrow interfaces | Good for handlers, poor for projections |
| Verdict | Rejected | Rejected | **Chosen** | Rejected as the architecture; its useful parts are kept (append-only histories, the outbox) |

A fifth variant, **separately deployed services** (story, media, generation as network services), was set aside without a full pass: the write gate, the lock check, the capture edges and the completion transaction must be one atomic commit (ADR 0005, JOB-LIFECYCLE §11), and a network seam would turn each into a distributed transaction. The chosen interfaces are narrow enough that a module could be extracted later.

### 2.1 Smaller choices inside C

Each of these was also designed two ways.

| Question | Chosen | Rejected, and why |
|---|---|---|
| How does the gate reach every kind of object? | **`history` is generic and kind-registered:** a kind (Shot, Entity, Master Narrative block document) is declared by its owner module as slices, narrative-bearing tags, invariants and declared indexes; `history` runs them inside `commit`. | *A gate library that each domain module calls:* a module can skip it. *Per-module stores behind a shared interface:* lock and write cannot share a transaction without cross-module tangling. |
| Who writes? | **Only `history`.** Domain modules return a `Change`. | *Domain modules write and call the gate:* the gate becomes advisory. |
| Does `jobs` fuse with `generation`? | **Separate.** `jobs` is the durable run (state machine, leases, deadlines, sweeper); `generation` is the AI request record and provider settlement. Two executor families already exist: provider runs, and local work (export build, Segment assembly, still extraction). | *One module:* export and local derivations would reimplement leases and deadlines. |
| Where does Resolve live? | **In the owners** as read functions returning typed resolved truth plus captured units; `workflows` assembles ResolvedInputs. | *Resolve inside the compiler:* the compiler would need IO. *One resolver module:* it would know every owner's internals. |
| Where do cross-module creator commands (write-back, accept and lock, duplicate) live? | **`workflows`**, composing planners from several owners into one Change committed once, one action group. | *In one domain module:* it would depend on the others. *In `api`:* use-case logic in the transport layer is V1's route-file failure. |
| Where do derived statuses (progress, Board, shell) live? | **`views`**, read-only over `history.derive` and owner derivations. | *In the client:* it would recompute workflow truth. *In `api` handlers:* untestable without transport. |
| Provider knowledge | **`providers` has two faces, as #66 specifies.** The *catalogue face* is pure: Catalogue snapshots, Selection, the capability evaluator, dialect functions, price declarations and error maps. The *adapter face* is transport only. The compiler imports the catalogue face and never the adapter face. | *One provider module with dialects inside the transport code:* the compiler would depend on IO. |

## 3. The module map

**Crosswalk from the ticket's responsibilities.**

| Responsibility to place | Module(s) |
|---|---|
| Client/UI | `client` (view state only), `contract` |
| Application/API | `api` (transport), `workflows` (use cases), `views` (read models) |
| Domain | `story`, `world`, `production`, `project` (pure rules and planners) |
| Workflow, lineage, staleness and lock truth | `history` (stored and derived), shown through `views` |
| Writing | `story` (documents, Facts, Interview, Scenes) |
| World and entities | `world` |
| Scene and shot production | `production` |
| Context compiler | `compiler` (pure), with Resolve in the owners |
| Generation orchestration | `workflows` (operations), `generation` (record, dispatch, settle), `jobs` (durable runs) |
| Provider adapters | `providers` (catalogue face and adapter face) |
| Jobs | `jobs` |
| Spend | `spend`, with caps and credentials in `accounts` |
| Media | `media` |
| Exports | `export` |
| Domain-type sharing between client and server | `contract` and the rule of §8 |

"Owns" is the state only that module holds (everything else is derived or referenced). "Interface" is what a caller must know. "Must not" is the rule that makes the module worth having.

### 3.1 Interface and use cases

| Module | Owns | Interface | Depends on | Must not |
|---|---|---|---|---|
| **contract** | Nothing at runtime. The shared definitions: branded ids, **closed vocabularies** (reason codes, job states, failure classes, `billed`, spend classes, phase dispositions, lock scopes, frame roles, provenance kinds, layer keys, creator-facing labels), command, query and event shapes, read-model shapes, error codes | Schemas; generated or inferred types and parsers for both sides (§8) | none | Contain logic, or any type that names a table, vendor or model |
| **client** | View state only: layout, panels, selection, scroll, the unsaved keystrokes between autosaves, a pending-command echo (§4) | Renders read models from `contract`; sends commands; subscribes to the event stream | `contract` only | Compute a status, a marker, a lock decision, a progress figure or a price; decide whether an action is allowed; hold anything a refresh would lose that the product relies on |
| **api** | Nothing. Transport adapters | Authenticate → resolve **Scope** (Account, project, creator) → parse with `contract` → mint the **Initiation** (below) → call `workflows` or `views` → map errors | `contract`, `accounts`, `workflows`, `views` | Contain use-case logic; touch the Store; accept an id without Scope |
| **workflows** | Nothing persistent. The registry of **use cases**: every creator command (edit a field, choose a Take, lock, keep, write back, accept, duplicate) and every defined **workflow operation** (M3) with its scope rule, steps, estimate and attach rule | `execute(initiation, command) → Result`. An operation is declared as a record of pure parts: `scope`, `resolve`, `propose` request, `validate` (guards), `attach` (§6) | domain modules, `guards`, `history`, `generation`, `compiler`, `spend`, `media`, `export`, `project` | Hold state between calls; choose a step or widen a scope on a model's say-so; call a provider directly |
| **guards** | Nothing. The G1–G10 validators of the AI map, the P1–P11 package checks, the dialogue-exactly-once verifier | Pure functions `(proposal, snapshot, state) → Verdict` | `contract` | Perform IO or call a model (the fact check is a Generation whose verdict `guards` validates) |

### 3.2 Truth and the domain

| Module | Owns | Interface | Depends on | Must not |
|---|---|---|---|---|
| **history** | All append-only creative history, in the Store: **Revisions**, **Attempts**, **Decisions** (Slot choices, approve, accept, retire, phase disposition, Acknowledgements, Deviation and write-back decisions, lock and unlock, spend initiation), the working copy of documents, **Records** of creative meaning (AI-made choice, Deviation, Interview turn), capture edges and Basis stamps, **edit sessions**, action groups, and the outbox of domain events | `commit(wtx, scope, change, context) → Applied \| NeedsConfirmation(impact) \| HeldAsOption \| StaleBase \| Refused`. `read(rtx, scope)`: head and line of an object, Slot choice, decision state. `derive(rtx, scope)`: `markers`, `impact`, `toReconcile`, `dependants`, divergence. `grantEditSession`. Kind registration (§5) | `contract`, Store port | Contain a creative rule (what a good shot is); store a marker or an "outdated" status; update or delete a row of history; expose a write that is not `commit` |
| **story** | Kinds for Source Material, Interview, Established Fact, Treatment, Beat Sheet, Master Narrative (block documents with inline provenance runs, dialogue as its own block), Scene as a projection over container blocks | Planners: splice and targeted rewrite (G4), Sync, screenplay conversion and mapping (SCENE-IDENTITY), accept; derivations: scene projection, derived text view with handles; Resolve: passages, Facts, documents | `history`(read, kinds), `contract` | Write; build prompt text; know a provider |
| **world** | Kinds for Entity, Look, Location coverage and Views, Visual Style, Writing Style, Reference Media descriptors, Voice definition | Planners: merge, type change, Look assignment, coverage and ladder; derivations: Look carry-forward by narrative position, the view-resolution ladder; Resolve: identity slices, Looks, Views, style | `history`, `story` (read mentions and positions) | Write; keep per-shot copies of identity |
| **production** | Kinds for Shot, Shot plan, Dialogue line, Presence overrides, Composition reference, Frame plan, Segment, Take (as an assembly), Continuity link, prompt and model Override slices | Planners: draft ingest, split, merge, redraft by Options, choose, approve, Mark final, Move to scene for an ad-hoc Shot (a Shot with no parent Scene, Record 2 X5), Adopt work from a scene in Removed from Story (D52.4; the scene's retirement itself is `story`'s); derivations: Presence, realization state, scene progress; Resolve: shot slices, frame sources, continuity | `history`, `world` (read), `story` (read) | Write; hold its own "status" field |
| **project** | Kind for Project settings; Phase disposition semantics; duplication and (later) purge as planners over every kind's remap rule | `planDuplicate`, `planSetDisposition`, settings planners; Resolve: settings | `history` | Know creative content beyond settings |
| **views** | Nothing authoritative. **Read models**: Outline status, the Board (the whole-film overview's per-shot status read; its presentation is the #60 redo's, Record 2 D60.1, D60.3), shell strip, Ledger, review-all tray, to-reconcile list, inbox, search index | Query functions over a `ReadTx`: `(scope, query) → model with asOf` | `history`(derive, read), domain derivations, `generation`(activity), `spend`(summaries) | Write; lag the write that affects it for anything a gate or a promised status depends on (§5.4) |

### 3.3 Generation

| Module | Owns | Interface | Depends on | Must not |
|---|---|---|---|---|
| **compiler** | Nothing. The scaffold wording (versioned data), layer catalog and precedence ladders | Pure `compile(ResolvedInputs, ProfileSnapshot) → { Package, FitReport, Rendered request, digest } \| BlockedFit`; no clock, randomness or ambient configuration | `contract`, `providers` catalogue face (capability evaluator, dialects) | Perform IO; know a vendor; cut text inside a layer |
| **providers** | **Catalogue face (pure):** the Catalogue of Offerings and their immutable content-addressed capability-profile snapshots, the operational overlay (status, enablement, ranking) as audited data, price declarations, error-to-class maps, and the dialect function of each adapter. **Adapter face (IO):** one adapter per provider surface behind one transport interface | Catalogue face: `select(operation class, overrides, project choice, policy, credential availability) → Effective model` (pure), `profile(snapshot)`, `evaluate(needs, profile)` (constraints, normalisation, realization plan), `dialect`, `priceEntry`, `gate(...)` (the F3 dispatch gate, pure). Adapter face: `submit`, `observe`, `cancel`, `lookup`, `fetch`, `billed-quantity`, `wire-capture`, each taking a Rendered request or operation reference, a credential handle and an idempotency key | `contract`; Vault only through a credential handle | Branch lifecycle logic on a vendor name; let a name or model id appear outside the Catalogue and adapters; add content when sending (P1); choose a model, retry, hold a key or write a record from an adapter; boot a production deployment with a `fake` Offering (F2) |
| **generation** | The **Generation** record: Effective model and profile snapshot id, Package, Fit report, Rendered request, ResolvedInputs, captured inputs, call log, estimate, actual and run history, Batch and dependency edges | `create(initiation, plan) → Generation ids`, `preview(plan) → compile + estimate, writes nothing`, `cancel`, `retry`, `activity(subject)` (derived "generating"), the **single** dispatch path, which calls the F3 gate immediately before `submit` | `compiler`, `providers`, `jobs`, `spend`, `history`(captures, attach), `media` | Let any other module send a request; be created without an Initiation; select, approve or accept an output |
| **jobs** | Job store, leases, deadlines, the state machine of JOB-LIFECYCLE §2–§3, the sweeper, reconciliation records | `enqueue`, `claim`, `transition(compare-and-set)`, `settle(job, outputs, settler)`; two executor families: provider run and local work; Batch scheduling and admission | Store, Scheduler ports, `generation`/`export` as registered settlers | Hold creative truth; move a terminal Job; keep state only in memory |
| **spend** | Cap-check cache (rebuildable), price registry values with as-of dates | `estimate(rendered) → point \| range \| unknown`; `admit(wtx, scope, estimate)` serialised per Account in the creating transaction; summaries; the spend rule (§3 of BUSINESS) | `providers` catalogue face, `accounts` (caps), `history`(read action) | Name a vendor; hold a second ledger (spend lives on the Generation) |

### 3.4 Media, delivery, identity

| Module | Owns | Interface | Depends on | Must not |
|---|---|---|---|---|
| **media** | Private content-addressed Media: bytes, hash, probe results frozen at ingest (fps, CFR/VFR, frame count, audio layout), derived-from lineage for extracted stills, project-separable storage keys | `put(scope, source) → MediaRef` (fetch, verify, hash, probe), `access(scope, ref, purpose) → short-lived link`, `purgeProject` (later) | BlobStore, Store ports | Hand out a provider URL; return bytes without a Scope; know what a Take is |
| **export** | Export package manifests (as history Records) and exporter descriptors (xmeml, OTIO, ordered clips; capability descriptor per #70) | `plan(scope, selection) → Manifest`; `build` runs as local-work Jobs | `production`(selection), `story`(documents), `media`, `jobs`, `history` | Build from anything but the manifest; mutate a Take |
| **accounts** | Account, invitation, creator sign-in mapping, creator caps and preferences (including the resume pointer), credential custody (write-only, encrypted), the operator role and its content-free view | `resolveScope(authn) → Scope`; `credential(scope, provider) → handle`; `caps(scope)`; operator queries return totals and alerts, never content | Auth, Vault, Store ports | Be read by `views` for anything but caps and preferences; expose a secret |

### 3.5 Ports (owned by the platform tickets)

`Store` (transactions, the `Scope` on every call, serialisation per Account), `BlobStore`, `Scheduler` (durable timers, leases), `Vault`, `Clock+Ids`, `Stream` (event delivery to clients), `Auth`, `ProviderTransport` (the adapter face of `providers`). Ports are interfaces; a **composition root** per process role is the only place an adapter is chosen and wired. Backing technologies are #72 and #74; the runtime choices are in [`RUNTIME-PLATFORM.md`](RUNTIME-PLATFORM.md) and [ADR 0017](../adr/0017-the-job-row-is-the-queue-on-plain-postgres-with-own-sse-progress.md) (two process roles, `web` and `worker`; the timer role is the worker's tick).

### 3.6 The previs module (CineBlock)

Added by Wayfinder #61 (creator decision D61; [`SHOT-PLANNING-INPUTS.md`](../domain/SHOT-PLANNING-INPUTS.md), [ADR 0024](../adr/0024-cineblock-is-an-aiuteur-module-and-captures-always-go-through-image-generation.md)). CineBlock is part of Aiuteur, not a second app.

| Module | Owns | Interface | Depends on | Must not |
|---|---|---|---|---|
| **previs** | Kinds for the per-scene CineBlock **scene state** (opaque, versioned, append-only Attempts), the **package** shape and the import tray (leftovers). Captures are Media. The 3D stage itself is a `client` surface (§3.1, R3), not part of this module. | Planners: `planSendBack(package) -> Change` (auto-link by shot id, the scene-state Attempt and the leftovers list; the Composition reference appends come from `production`'s planner, composed by `workflows`), `planRetireCapture`; Resolve: the shot brief for a scene (shot ids, derived Presence, Direction views); import matching for external packages, storyboards and shot lists (pure, deterministic first; AI proposals arrive as Generations validated by `guards`) | `history`, `production` (read), `world` (read), `media` | Write (only `history.commit` writes); create Frames or Takes; hold identity, location or story truth; call a vendor |

- **Same session, separate tab.** The stage is served by Aiuteur and reaches the server only through the normal `api` with the creator's Scope; there is no second credential, launch token or cross-origin seam. The `client` rule of §3.1 holds: the stage keeps view state only, and every attach, retire and send-back is a server command.
- **Writes** go through `workflows` and `history.commit`: Send back is one action group (the attached references, the scene-state Attempt, the leftovers list). The Composition reference remains a `production` kind, planned by `production`; `previs` supplies only the shot-id matching.
- **World model.** `world.generate` is an operation class in the `providers` catalogue face (PROVIDERS-AND-MODELS §13): an ordinary Generation and Job, creator-initiated, priced on the button, operator-paid until BYOK. It follows the path of §6 like any operation: selection, a recorded Rendered request before dispatch, the F3 gate and the one send path (GENERATION-PACKAGE §4.3, guard P7). Its output is a stage for blocking, never a frame, an image reference or a video input.
- **Capture to Frame** is the ordinary image path of §6: the capture is a layout input to an `image.frame` Generation compiled by `compiler`; `previs` contributes nothing to the package beyond the reference and its subject mapping.
- **Dependency rules.** `previs` is a planner module under R1 to R13 (no extra rule): it imports `contract`, `history`, domain read APIs and `media`, never `generation`, `jobs` or `providers` adapters; nothing imports `previs` except `workflows` and `views`.
- **Isolation, duplicate and purge.** Scene state and captures carry (Account, project); a full project duplicate copies them (ADR 0022), while the duplicate-into-new-version of a major import carries no scenes or shots and so no scene state (Record 2 D52.2); purge (M7) removes them with the project.
- **Not a prerequisite.** CineBlock is IMPORTANT and arrives after the core loop works (Constitution §8.3). No CORE module imports `previs`; without it, Composition references are uploaded and the CORE shot, frame and take paths do not change.
- **Verification seam.** A fake world model and fixtures of SHOT-PLANNING-INPUTS §9; the Two-Account harness covers the stage endpoints.

## 4. Where workflow truth lives

This is the ticket's critical constraint made concrete. Every row is state V1 kept in screens, URLs, browser storage or by convention.

| Workflow fact | Owner in V2 | How the client learns it | What the client may hold |
|---|---|---|---|
| Phase disposition (done, skipped, bypassed) | `history` Decision, planned by `project` | `views.outline` | Nothing |
| Per-scene and per-film progress, runtime vs target | Derived: `production` derivations + `views` | `views.board`, `views.outline`, shell strip (one derivation feeds all) | Nothing |
| Possibly out of date, with reason | Derived by `history.derive` from captured inputs minus Acknowledgements | Marker on the read model of each item; `views.reviewAll` | Nothing |
| Locked, accepted, Mark final | `history` Decisions | Flag on each item's read model | Nothing |
| "Generating", "Retrying", "Failed" | Derived from non-terminal Jobs by `generation.activity` | Read model + event stream | Nothing |
| Impact of an edit; confirmation | `history.derive.impact` returns a versioned summary; the confirmation is an **edit session grant** on the server | The summary, with its version | The grant's id, echoed on edits; expiry is server-side |
| Selected Take, approved Frame, active image | `history` Slot-choice Decisions | Read model | Nothing |
| Unsaved document text | Working copy, durable on the server (autosave) | Read model | Keystrokes between autosaves; flush before navigating away |
| Spend so far, caps, "this will cost" | `spend` summaries and estimates from the Rendered request | Read model; the price on the control comes from `generation.preview` | Nothing |
| Unread failures, notices | `views.inbox` over outbox events; read pointer per creator on the server | Event stream | Nothing |
| Action id for a confirm step | Minted by the client when the step opens (JOB-LIFECYCLE §4); idempotent server-side | n/a | The id, until the step closes. It carries no state: replaying it returns the same result |
| Last viewed centre view | `accounts` preference, never read by any gate | On open | Nothing |

**Client rules.** (1) The client imports `contract` and nothing else of Aiuteur. (2) Anything shown as a status, enabled or disabled, locked or marked comes from a read model; the client never derives it from other fields. (3) An optimistic echo may show a command as *pending*; it may not show it *done* until a read model at or after the command's version confirms it, and a refused or failed command rolls back to the read model. (4) A stale client cannot weaken a protection: the server refuses a write whose base, impact version or edit session no longer holds, and the client re-renders from the refusal.

## 5. `history` in detail

### 5.1 One commit

A **Change** is an ordered set of appends: Revision (object, base, content, provenance), Attempt (Slot, Media, Generation or upload), Decision, Capture (a piece of work and the `(unit, Revision, fingerprint)` inputs it read), Basis stamp, Acknowledgement, retire. `commit` takes a Change and a **context**: action id, action group, actor (a creator, a Generation, an import), the edit session if any, and the impact version the creator saw. In one transaction it:

1. checks the **Scope** (Account and project) on every object touched;
2. checks **lock state** for Revisions, retirements and Slot-choice moves (Attempt appends and new Generations are not gated);
3. checks each Revision's **base** (compare-and-append): a stale base keeps the newer head and stores the loser as an Option or draft Revision, never discarding it;
4. runs each kind's **registered invariants** (for example dialogue exactly once, a splice equal to prefix + replacement + suffix, protected spans intact) and refuses AI-made content without a Generation and provenance (G4, G7);
5. if a lock is hit and the context lacks a valid edit session carrying the **current** impact version, returns `NeedsConfirmation(impact)`, or `HeldAsOption` when the actor is a Generation (a locked scope never takes an AI Revision);
6. appends, updates the **declared indexes** and capture edges, and writes **outbox events**, all in that transaction.

Nothing partial survives: the result is `Applied` (all of it) or one of the other outcomes (none of it, except the stored loser or held Option). Reading never reaches this path (§5.4). A no-op save is detected and adds nothing.

### 5.2 Edit sessions

"One confirmation covers the editing session on that scope" (TRUST-SIGNALS §5) is **server state**, not a screen flag. After the creator confirms, `history` stores a grant `(scope, creator, impact version)`. Working-copy saves and commits in that scope carry the grant and pass the lock check; the grant ends on unlock, on an explicit end from the client, on an impact-version change, or on idle expiry, whichever comes first (the idle value is a tuning default). A client that never reports leaving the scope still cannot keep protection off. A locked scope with no grant refuses working-copy writes with the same `NeedsConfirmation`, so autosave cannot become a back door.

### 5.3 Derivation

`derive` is a pure function of recorded history: `markers = drift(captured, current) − acknowledgements`, plus `impact(change)` (chosen downstream work reached through lineage, grouped by kind, with money at risk read from Generation cost), `toReconcile` (Divergent-undecided and `deviation-upstream-changed`) and `dependants`. Kind definitions supply slices and narrative-bearing tags; `history` supplies the walk. No module stores a marker; a cache of markers or impact is legal only if rebuildable and updated in the committing transaction (ADR 0004).

### 5.4 Read-your-writes

Anything a gate or a promised status depends on is **computed on read or maintained in the committing transaction**: lock state, markers, impact, edit sessions, Slot choices, scene progress, the Board's per-shot summary, the Outline's phase status. Asynchronous (outbox-driven) projections are allowed only for things whose lag is harmless and shown honestly: spend summaries, the search index, notices, and operator totals. The Board at 250 shots is one summary read over per-shot derived state, not 250 full shot loads (NAVIGATION §8); whether that is a materialised table or an indexed query is #72's, under this rule.

### 5.5 Kinds

A kind is declared by its owning module as plain data and pure functions: its slices (the units lineage names), which slices are narrative-bearing (the structured paths that raise write-back or deviation), invariants, declared secondary indexes (Shot parent, anchor block ids, `derived_from`, unit → dependants), a remap rule for duplication, and a separability rule for purge. How the Store realises kinds (a table per kind or one table with extracted indexes) is #72's, under: append-only, indexes updated in `commit`, every row keyed by Scope.

### 5.6 Duplication and purge

Duplication is one Change built by `project.planDuplicate` from every kind's remap rule: new ids for everything, a `duplicated-from` map, captures and Acknowledgements remapped so markers reproduce, in-flight work not copied. Because every row and every Media key carries (Account, project), a later purge is a deletion of one project's rows and keys; no object, index entry or shared Media reference may span two projects without a recorded owner of last reference (#72's purge rule).

## 6. The generation path

```diagram
 creator action ─▶ api (Scope, Initiation) ─▶ workflows.<operation>
    1 scope        operation.scope(request) ─▶ targets (code fixes the set and order)
    2 resolve      owners' Resolve functions (read-only) ─▶ ResolvedInputs + captured units
                   providers.select (pure) ─▶ Effective model + Offering + profile snapshot
    3 preview      compiler.compile ─▶ Package · Fit · Rendered request · digest ─▶ spend.estimate
                   (all of 1–3 write nothing; this is what the inspector and price show)
    4 create       generation.create, ONE transaction:
                     compile again (frozen) · spend.admit (per-Account serialised) ·
                     record Package/Fit/Rendered/ResolvedInputs · Capture edges via history ·
                     Job(s) + Batch · outbox
    5 run          jobs.claim ─▶ generation.dispatch (the one send path) ─▶ ProviderTransport
    6 settle       fetch ─▶ media.put (verify, hash, probe) ─▶ ONE transaction:
                     operation.attach(...) ─▶ history.commit ─▶ actual cost set · Job succeeded · outbox
```

**The operation record.** A workflow operation is declared once, as data and pure functions:

| Part | Role |
|---|---|
| `scope` | The targets, from creator input and project state. Code, never a model, decides them and their order (M3). |
| `resolve` | Calls the owners' Resolve functions. Output: ResolvedInputs (immutable) with every `(unit, Revision, fingerprint)` read. |
| `operation class` | One of #66's closed, vendor-free classes (`video.take`, `image.frame`, `text.create`, …), which drives selection, the layers carried (the compiler's operation-by-layer table) and the needs evaluated before spend. |
| `validate` | Composition of guards G1–G9 over the model's proposal. Malformed once → one repair call inside the same Generation; then REJ or HELD. |
| `attach` | Pure: `(validated output, current state) → AttachPlan`: Attempts, Options, or a Change for an AI-made Revision, each with provenance computed by code from the splice. Never selects, approves or accepts. |

For a media operation `validate` is G9 (decode, type, size, duration) and `attach` makes Attempts. For a text operation it is the full proposal-to-Change path of the AI map. The **settler** that `jobs` runs inside its compare-and-set is `generation`'s: it calls the operation's `attach` and then `history.commit` with the Generation as actor. If `commit` returns `HeldAsOption` or `StaleBase`, the Generation still settles *succeeded* with the output stored as an Option, so paid output is never lost (§14.3).

**Initiation (G10).** A value of type `Initiation` is minted only by `api` from an authenticated creator command, and `generation.create` requires one. The two ratified stage-entry triggers use that command's Initiation (AI map §6.0, [Record 3](../product/CREATOR-RATIFICATION-RECORD-3.md)). `workflows`, never the client, checks eligibility and spend in the creating transaction, with the existing duplicate-generation guard so concurrent tabs draft once. For Treatment it checks that no Treatment, generated options or upload explicitly designated in Input as the Treatment exists, then drafts the Account's Settings count, default 3. Ordinary initial Treatment cost needs no priced navigation label or extra approval. For a Scene it checks that **no Shot plan** exists. An emptied plan counts as existing and is ineligible. An eligible initial plan auto-drafts only below $0.05; otherwise the operation returns **Draft plan · $x** without creating a Generation. Exceptional spend conditions stop either trigger for the inline ticket, with no Start on a cap breach (BUSINESS-AND-OPERATIONS §3). Neither trigger redrafts or starts media. Draft all is a creator command that drafts Shot plans only (D60.4). Timers, event handlers, sweepers and model outputs cannot obtain an Initiation. A batch member created at batch creation already holds its Initiation, so a dependent binding later (JOB-LIFECYCLE §8) needs none. Ordinary stage-entry authorization changes neither retry policy nor cost recording.

**Fast path.** A quick text operation is the same Generation and Job. The request may `claim` its own Job through the same `jobs.claim` a worker uses; there is no second path.

## 7. Account isolation on every path

`Scope = (Account, project?, creator)` is obtained only from `accounts.resolveScope`, and **every Store, BlobStore, history, generation, spend and media call takes one**. There is no function that reads a creative row without it, and no module holds a raw database handle: handles live inside Store adapters. Background work does not run "as the system": a Job, a webhook handler, a sweeper pass and an outbox consumer each rebuild the Scope from the Account recorded on the Job or event, and the Store opens the transaction under that Scope. The Store enforces it a second time at the data layer (row-level rules keyed by Account on every table, and no ordinary role able to see across Accounts; the mechanism is #72's, and no option may need an unrestricted shared identity for ordinary requests, per #73). Sub-resource ids are never trusted: a command naming a shot checks the shot belongs to the Scope's project, in `history`, once. The **operator** is a separate role with queries that return totals, alerts and provider breakdowns and structurally contain no content fields.

## 8. Type ownership across client and server

One rule: **a type has one owner, and everyone else gets a derived copy.**

| Kind of type | Owner | Who may use it | Rule |
|---|---|---|---|
| **Identity and vocabulary:** branded ids; closed vocabularies (reason codes, job states, failure classes, `billed`, spend classes, dispositions, lock scopes, frame roles, provenance kinds, layer keys, creator-facing labels) | `contract` | Everyone, including `client` | Defined once. Every `switch` over a vocabulary is exhaustive, so adding a value breaks the build wherever it is unhandled. No hand-copied union (V1's `FrameStatus` and `invalidated`). |
| **Domain types:** a Shot, a Look, a Package, ResolvedInputs, Job | The module that owns that truth | Other server modules, through the owner's published types only | One owner per truth means one owner per type. Not imported by `client`. |
| **Wire types:** commands, queries, read models, events, errors | `contract` | `api`, `workflows`, `views`, `client` | Declared once in a schema; types and parsers for both sides are **generated or inferred from it**, never re-typed. A CI check fails when generated output differs from the schema. Each owner maps domain ↔ wire in one named place; domain types are never serialised directly. |
| **Persistence shapes:** rows | The Store adapter of the owning module | Nobody else | Not exported. A column never leaks into a read model by accident. |
| **View types:** layout, selection, form drafts | `client` | `client` only | May not contain a field that is a status, lock, marker or progress value except one received verbatim in a read model. |

Both sides **parse at the boundary**: the server parses commands and the client parses responses and events with the same schema, so a payload that drifts from `contract` fails loudly at one place. A closed vocabulary may grow without a client release because the client renders an unknown value neutrally and the build flags the missing case. Contract changes are additive within a version; a breaking change is a new version. Ids are minted by the server (or the client only for action ids, §4); an id from one project is meaningless in another and is checked against the Scope.

## 9. Dependency rules the build enforces

These are the architecture; each is checkable by an import-graph test or a type, not by review.

| # | Rule | Enforced by |
|---|---|---|
| R1 | Only `history` may append to or read-for-write creative history; no module but its Store adapter holds a database handle. | Import-boundary check on the Store port |
| R2 | Every Store, Blob, history, generation, spend and media operation takes a `Scope`. | Type signature; a conformance test across Accounts for every contract operation |
| R3 | `client` imports only `contract`. | Import-boundary check |
| R4 | `compiler` and `guards` import only `contract` (and, for `compiler`, the `providers` catalogue face). No IO, clock or randomness. | Import-boundary check; determinism golden test |
| R5 | The adapter face's `submit` has exactly one caller: `generation.dispatch`, which runs the F3 gate first. | Import-boundary check |
| R6 | `generation.create` requires an `Initiation`, minted only in `api`. | Type: constructor not exported |
| R7 | No module stores a marker, "outdated" or an equivalent status; only `history.derive` produces one. | Review rule + a schema test that no column of that kind exists |
| R8 | Prompt text exists only as Layer parts in `compiler`; scaffold wording is versioned data there. | Lint: no string template naming a layer outside `compiler` |
| R9 | Vendor and model names and ids appear only in the Catalogue data and adapters (#66 invariant 9). | Lint over names |
| R10 | Read paths receive a `ReadTx`, write paths a `WriteTx`; `views`, `compiler` and `guards` cannot be given a `WriteTx`, and `commit` cannot be called with a `ReadTx`. | Types: reading never writes |
| R11 | Time and ids are injected; no module reads a clock or generates an id directly. | Lint |
| R12 | A module exposes one public entry; internals are not importable. | Import-boundary check |
| R13 | Domain events are written to the outbox in the transaction that causes them and consumed idempotently by event id. | Conformance test in `history` and `jobs` |

Allowed imports, read top to bottom: `api` → `workflows`, `views`, `accounts`, `contract`; `workflows` → every module below it; `views` → `history`, domain derivations, `generation`(activity), `spend`, `accounts`(preferences); `story`, `world`, `production`, `project` → `history`(kinds, read), each other only where §3.2 lists a read dependency (production → world, story; world → story; project → none); `generation` → `compiler`, `providers`, `jobs`, `spend`, `history`, `media`; `jobs` → Store, Scheduler; `export` → `production`, `story`, `media`, `jobs`, `history`. No cycles; domain modules never import `workflows`, `generation` or `views`.

## 10. Stress walks

| Scenario | Path | What it proves |
|---|---|---|
| Creator edits a dialogue line in a locked, accepted scene | `client` → command → `workflows.editDialogue` → `production.planEditLine` → `history.commit` finds the lock, computes impact, returns `NeedsConfirmation(impact v7)`; the strip shows it; confirm → `grantEditSession(v7)`; the edit commits with the grant and marks only what drifts | The lock holds without any screen; the confirmation is server state |
| Same edit while the creator also has a second tab and an AI rewrite landing | The AI Generation's commit finds a stale base or the lock: `HeldAsOption`; the creator's text is untouched | No silent overwrite; paid output kept |
| Generate a video Take | `workflows.generateTake` → owners resolve → `compiler` → `generation.create` (admit, record, Job) → worker `claim` → `dispatch` → `fetch` → `media.put` → settle: Take appended, cost set | Record before send; completion in one transaction; "generating" derived |
| Process dies between provider acceptance and recording | Sweeper finds `submitting` with expired lease; idempotent resubmit or `submission_unconfirmed` per JOB-LIFECYCLE §7 | Recovery is `jobs`' rule, not a feature of a worker |
| Late result after timeout, upstream changed meanwhile | Reconciliation → `jobs.settle` → settler attaches an unselected Attempt; `derive` shows it flagged because captured fingerprints differ | Adoption needs no special storage |
| Rewrite a selection that contradicts a Fact | `rewrite` operation → proposal → `guards` G4 passes, G6 reports a conflict → repair once → still conflicting → `HeldAsOption` | Models propose, code commits |
| Board at 250 shots | `views.board`: one summary read; no per-shot load; same derivation as the Outline | Cheap derived status |
| Write-back from a shot edit | `workflows.writeBack` composes `story.planPassageEdit` + `production.planRestamp` into one Change, one action group, impact shown first | Cross-module write is still one commit |
| Account B calls with an id from Account A | `api` resolves B's Scope; `history`/Store find nothing under that Scope and answer "not found" | No per-handler filters to forget |
| Duplicate a project | `project.planDuplicate` → one Change; markers reproduce by derivation | Atomic, no repair step |
| Export | `export.plan` snapshot → `build` as a local-work Job reading frozen probe facts from `media`; manifest recorded via `history` | Deterministic; exporters behind descriptors |

## 11. Seams that testing relies on

Every seam has a real adapter and at least one fake, so each is a genuine seam, and each is tested through its interface (the interface is the test surface).

| Seam | Adapters | Tests cross it to |
|---|---|---|
| **Store port** | Real database; in-memory transactional fake | Run one conformance suite on both: append-only, same-transaction indexes, serialisation per Account, cross-Account refusal |
| **`history.commit` / `derive`** | Kinds from owners; test kinds | Invariants: lock, compare-and-append, atomic multi-append, no-op; properties: restore clears markers, duplicate reproduces markers, unlock marks nothing |
| **ProviderTransport** | Real adapters; provider fakes with wire capture and failure scripting | P1 (recorded request equals wire body), slow/duplicate/out-of-order completion, crash between accept and commit, expired URLs, no-cancel provider, late result after cancel |
| **Scheduler and Clock** | Real timers; virtual time | Deadlines, leases, backoff, sweeper recovery without sleeping |
| **BlobStore** | Real; in-memory | Verify-before-success, key derivation, project separability |
| **Vault and credential handle** | Real; fake keys | Revoked key, funds exhausted, BYOK path vs operator key |
| **`compiler`** | none needed: pure | Golden digests, no-truncation and carried-set properties |
| **`guards`** | none needed: pure | Adversarial recorded proposals that alter dialogue |
| **Operation record** | Real operations; recorded model proposals | `validate` and `attach` with no network; real-model smoke tests separately. A fake model must never be a default adapter |
| **Contract** | Generated mock server; real `api` | Client against the mock; server against the same schema; unknown-vocabulary rendering |
| **Scope** | Two-Account harness generated from the contract's operation list | For every operation, Account B on Account A's ids is refused |
| **Architecture rules R1 to R13** | Import graph and type checks | Fail the build on a violation |

## 12. LATER and extensibility

| Capability | Architectural room |
|---|---|
| Project-aware assistant with reviewable change-sets (§14.4) | `Change` is a first-class value; `history.preview(change)` returns impact without applying; accepted changes commit with AI provenance. No new write path. |
| Autopilot | A workflow operation with explicit inputs, started by an Initiation that includes the spend approval. No new kind of truth. |
| Personal library, copy-on-use | A scope above Project in `Scope`; copy is a Change with new ids. |
| In-app sequence editing | Reads the selected-Take pointer and immutable Media; `export` already isolates the read side. |
| BYOK | `accounts.credential` returns a handle by (Account, provider); `spend` already tags paid-by; removing the operator ceiling is configuration. |
| Purge (M7) | Every row and key carries (Account, project); `project.planPurge` and `media.purgeProject` are additions, not rewrites. |
| Providers and models | Catalogue data plus an adapter; no module outside `providers` changes. |

## 13. Not decided here

Language, framework, database, queue or workflow engine, hosting, storage vendor, authentication provider, API protocol and endpoint shapes, table and column shapes, packaging of modules into deployables, the schema language used for `contract`, the numeric values of idle expiry, tier boundaries and admission caps. These belong to #72, #74, #75, #66, #78 and the spec; this document fixes the ownership, the interfaces and the rules they must respect.

**Revisit if:** keeping derived state in the committing transaction cannot meet the 250-shot budget (move that state to a rebuildable table updated in the transaction, not to an asynchronous projection); more than a few kinds need to bypass the registered-invariant mechanism (then the kind is not fitting the gate and the gate needs a new extension point, not an exception); or `workflows` accumulates domain rules instead of composing planners (move them to the owner).

## 14. Hand-offs

| Ticket | Receives |
|---|---|
| **Persistence and media storage** (#72) | The Store port: transaction with `Scope`, row-level isolation on every table, append-only history (no update or delete path for history rows), indexes maintained in `commit` and declared by kinds, the unit → dependants index, capture edges, the working copy as the one mutable cell, serialisation per Account for spend admission, an outbox in the same transaction, project-separable keys for rows and Media, Media keyed by content hash with probe facts frozen at ingest. How kinds map to tables, isolation, versioning, media, purge and migrations are resolved in [`PERSISTENCE-AND-MEDIA.md`](PERSISTENCE-AND-MEDIA.md) (ADRs 0019–0023). |
| **Runtime platform** (#74, resolved in [`RUNTIME-PLATFORM.md`](RUNTIME-PLATFORM.md)) | Process roles (web, worker, timer) over one module graph; composition roots; Scheduler needs (durable timers, leases, wake on `not_before`); inline claim for the text fast path; admission caps and fairness per Account and provider; `Stream` delivery driven by outbox events with replay; no workflow state in any process. |
| **Operational baseline** (#75, resolved in [`OPERATIONAL-BASELINE.md`](OPERATIONAL-BASELINE.md)) | `Scope` from Auth; operator role with content-free queries; Vault for operator keys and write-only own keys; logs and traces keyed by Account, never carrying keys or another Account's content; R1 to R13 as CI checks. |
| **Providers and models** (#66, closed) | Aligned, not changed: its Catalogue, Selection, capability evaluator and dialects are the pure *catalogue face* the compiler and `workflows` import; its adapters are the *adapter face*; its dispatch gate (F3) is the last step of `generation.dispatch`; selection runs in `resolve`, before spend, and its result is recorded on the Generation. Dialects are pure functions packaged with the adapter but importable without transport (R4). |
| **Verification architecture** (#76) | §11 as the seam list, the Two-Account harness generated from the contract, the conformance suite shared by both Store adapters, virtual time, R1 to R13 as tests, and the rule that fake models are test-only. |
| **Tracer bullet** (#77), **Contract freeze** (#78) | The contracts to freeze first: `contract` vocabularies and ids, `history.commit/read/derive`, the kind declaration shape, the operation record, `ProviderTransport`, the Store port, the executor/settler seam in `jobs`. Modules are the ownership units for parallel agents. |
| **Candidate review, scene workspace, planning, World Definition, writing, Intake UX** (#58 to #62) | The server operations they may rely on: versioned impact summary, edit session grant, `generation.preview` (inspector and price), derived read models, `activity` for "generating"; the client-rules list in §4; no workflow state in a screen. |
| **Voice and performance** (#69) | Audio is a provider kind through the same Catalogue and adapter contract (#66 §13); the authorisation check is a precondition inside the operation's `scope`/`validate`; Performance is a `production` kind. |
| **Final audit** (#79) | R1 to R13, §4's table, §8's rule. |

## 15. V1 failures answered

| V1 failure | Answer |
|---|---|
| Four route files with six to ten domains; about 800 persistence call sites in routes and services (SP-01, SP-03) | `api` holds no logic; one use case per workflow; only Store adapters touch the database (R1). |
| One service-role client; per-handler ownership filters; sub-resource ids unchecked (SP-04, SP-78 to SP-80) | `Scope` on every call, checked in `history` and again in the Store; no module holds a handle. |
| Shot in seven shapes; frame type copied by hand (SP-08, SP-09) | One owner per type; wire types generated from one schema (§8). |
| Style loading copied four times, three failure policies (SP-25) | Visual Style is one Resolve function in `world`; the compiler is the only reader. |
| Duplicated prompt and context builders (SP-24, SP-26) | One pure compiler; prompt text only in layers (R8). |
| One lock written to three places by three client calls; locks in screens (SP-46, SP-06) | One `commit`; lock state and the write in one transaction; edit session on the server. |
| Client-side multi-call persistence flows (SP-06) | A creator command is one server use case and one Change. |
| Mutation fan-out without a transaction (SP-44) | Cross-module changes are one Change in one commit. |
| Status shown by screens (V1 UI-owned workflow state) | `views` read models; client rules in §4. |

## 16. Constitution check

No requirement was found unworkable or contradictory; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** §17.2 and §16 principle 11 are met by §4, §5 and R3, R10: the UI holds no workflow truth and every protection is enforced in `history.commit`, so a lock shown holds for every path. §16 principle 12 and precedence 2: the architecture is a single transactional store and a small set of narrow interfaces; the event-sourced alternative that would add projection lag and event-schema upkeep was rejected. §18.4 (user media private) is met by `media.access` and the Scope rule. Principle 3 and ratification R1 and M7: `history` offers no update or delete of history rows, and purge is an addition keyed on (Account, project). Ratification M4: isolation is a type-level and data-level rule on every path including background work. M3: the workflow operation record fixes steps and scope in code and gives the model no tools. M5: the credential seam is in `accounts`. Principle 7 and §13.4: `spend.admit` runs in the creating transaction; no module can create a Generation without an Initiation.
