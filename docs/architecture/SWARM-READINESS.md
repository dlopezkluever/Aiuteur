# Aiuteur V2: Swarm Readiness

Resolution of Wayfinder ticket #78. No ADR: every choice here is a working rule over decisions already hard to reverse in ADRs 0016 to 0026, and each can change without touching a module boundary or a stored shape. Inputs: the [Constitution](../product/PRODUCT-CONSTITUTION.md) (§3.1 bar, §17.5 V1 lessons, §18.8 real end-to-end runs), the [module architecture](MODULE-ARCHITECTURE.md) (R1 to R13, the type-ownership rule of §8, the §14 hand-off), the [build sequence](BUILD-SEQUENCE.md) (T0, §2.4 lanes, EI1 to EI13, §7 freeze point), [verification](VERIFICATION-AND-OBSERVABILITY.md) (VC1 to VC17, R19 to R24, §14 hand-off), [persistence](PERSISTENCE-AND-MEDIA.md) (R14 to R18, §10.2 migrations), the [job lifecycle](../domain/JOB-LIFECYCLE.md), [generation package](../domain/GENERATION-PACKAGE.md), [providers and models](../domain/PROVIDERS-AND-MODELS.md), [shot model](../domain/SHOT-MODEL.md), [voice and performance](../domain/VOICE-AND-PERFORMANCE.md) (#69), and legacy 14 §9 and 15 §3 (V1's duplicated types and parallel implementations).

Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). This document fixes **which contracts coding agents may not reinvent, who may change one and how, which work may run concurrently and which may not, and what evidence makes work done**. It contains no tool configuration, tickets, estimates or sprint plans; it feeds `/to-spec` and `/to-tickets`, which are not run here.

## 0. The decision on one page

| # | Item | Decision |
|---|---|---|
| 1 | **Swarm model** | **Lanes own code behind frozen contracts; slices own acceptance.** The five lanes of BUILD-SEQUENCE §2.4 (story, world, generation, delivery, platform) own modules and paths; a vertical slice is the unit whose exit evidence closes work. Rejected as the model: slice-per-agent across all layers, contract-first stub generation, one agent at a time, review-only coordination (§6) |
| 2 | **Freeze point** | **T0 exit** freezes the cross-cutting register FC1 to FC11 at version 1, from the real code (§2). Contracts that land later (EI5 to EI8, EI10, EI11 and each domain module's public entry) freeze at the exit of the slice that completes them. Before its freeze a contract is **Draft** |
| 3 | **What "frozen" means** | Its public surface (types, signatures, vocabularies, semantics) changes only through a **Contract amendment**; a surface snapshot check fails any change that alters it without an amendment reference (R25). Frozen is not "never changes"; it is "changes on purpose, with an owner, a version and re-verification" (§3) |
| 4 | **Amendment path** | Additive changes are made in-lane by the contract's owner and need no record; breaking or meaning-changing changes need an **amendment record**, owner plus integration-thread sign-off, one change that migrates every caller, a major version, and re-verification by every consuming lane (§3) |
| 5 | **Serial surfaces** | The migration chain, the `history` write gate and the Store port, the shared `contract` package's structure and shared vocabularies, GLOSSARY and ADRs, the Catalogue's defaults and ranking, scaffold wording per operation class, golden baselines, the release path, and T0 itself (§5) |
| 6 | **Conflict protocol** | Short-lived changes, one path-owner at a time, a serialised merge queue that tests the **rebased result**, generated files regenerated never hand-merged, revert-first on a broken `main`, and a stop-the-line rule for a contract found wrong (§7) |
| 7 | **Done** | Evidence produced by the pipeline and a verifier, not by the author's report: per kind of work (§8), tied to VC1 to VC17, GP-S, the harness and the seed boundary; the top-level done is BAR |
| 8 | **Independence** | The author never alone judges a change to a contract, a gate, a golden, a baseline, an isolation rule or a slice exit. An independent verifier (fresh context) re-runs the gates from the digest (§9) |
| 9 | **Record** | Every change carries a **change record**: lane, slice, contracts touched and versions, amendment references, gates and evidence-record ids, GP-S and harness entries added, decisions taken and questions raised (§10) |
| 10 | **Creator Review** | None raised. Creator input was not required and nothing here depends on creator preference |

## 1. What this answers, and what V1 teaches

V1's parallel work diverged where nothing was frozen: the Shot in seven shapes, a frame type copied by hand, four copies of style loading, three failure policies, duplicated prompt builders (legacy 14 §9, 15 §3; MODULE §15). V2 already answers each with an owner and a rule. This document adds the missing step: **a way to keep agents from re-deciding those answers while many work at once**, and a standard for "done" that a mock cannot satisfy (§17.5, §18.8).

## 2. The frozen-contract register

A contract here is a module's published surface that another module, lane, test or the client depends on. Table and column names are **not** frozen (PERSISTENCE §14); internals behind a public entry (build rule R12) are never frozen.

### 2.1 Frozen at T0 exit (version 1)

T0 writes version 1; #78 freezes it from the code T0 built, not from the documents (BUILD §7). Names are those of the source documents.

| # | Contract | Includes | Owner (module → lane) | Source |
|---|---|---|---|---|
| **FC1** | **Identity and vocabulary** | Branded ids and the id-minting rule; the closed vocabularies (reason codes, job states, failure classes, `billed`, spend classes, phase dispositions, lock scopes, frame roles, provenance kinds, layer keys, creator-facing labels); error codes; the vocabulary-to-CHECK generation (D3) | `contract` → steward (§5) | MODULE §3.1, §8; PERSISTENCE §10.3 |
| **FC2** | **Wire schema** | Command, query, event and read-model shapes and the rule that types and parsers are generated from one schema; the event envelope; `Initiation` as an opaque type minted only in `api` (build rule R6) | `contract` → steward | MODULE §8; PERSISTENCE §14 |
| **FC3** | **The write gate** | `history.commit`, `history.read`, `history.derive`; `Change`, the commit context, the five results `Applied`, `NeedsConfirmation`, `HeldAsOption`, `StaleBase`, `Refused`; `grantEditSession` and the impact version | `history` → spine | MODULE §3.2, §5 |
| **FC4** | **Kind declaration** | The shape a module uses to declare a kind: slices, narrative-bearing tags, invariants, declared indexes, extracted columns, remap path, closure rule, separability rule | `history` → spine | MODULE §5.5; PERSISTENCE §14 |
| **FC5** | **Ports** | `Store` (transaction with `Scope`, `ReadTx`/`WriteTx`, serialisation per Account), `BlobStore`, `Scheduler`, `Vault`, `Clock+Ids`, `Stream`, `Auth`; `Scope` itself; `media.put`/`media.access` and `MediaRef`; the credential seam (`CredentialHandle`, `accounts.credential`, `resolveScope`) | Store/ports → platform; `media`, `accounts` → platform | MODULE §3.4, §3.5; PERSISTENCE §14; BUILD EI9 |
| **FC6** | **Operation record** | `scope`, `resolve`, `propose`, `validate`, `attach`; the registry; `execute(initiation, command) → Result`; the `AttachPlan`; the guard `Verdict` | `workflows`, `guards` → entry owner (§4.2) | MODULE §3.1, §6; BUILD EI2 |
| **FC7** | **Generation record and trace** | The Generation shape with its trace fields (build rule R22: Package, Fit report, Rendered request, ResolvedInputs, captured inputs with frozen fingerprints, call log, estimate, actual, run history); `generation.create/preview/cancel/retry/activity`; the `authorised()` clause position; the single dispatch path and the F3 gate as an **ordered, closed list of fail-closed clauses** | `generation` → generation | MODULE §3.3; VERIFICATION §2.1; BUILD EI1 |
| **FC8** | **Compile** | `compile(ResolvedInputs, ProfileSnapshot) → { Package, FitReport, Rendered request, digest } \| BlockedFit`; the Package shape (Layers, carried references with roles, typed parameters, the reserved style layer, the layer catalog's keys); `ResolvedInputs` | `compiler` → generation | MODULE §3.3; GENERATION-PACKAGE; BUILD EI11 |
| **FC9** | **Job contract** | The Job states and transitions (compare-and-set), leases, deadlines, `enqueue/claim/transition/settle`, the two executor families, the **settler seam** (`settle(job, outputs, settler)`), retry classes, event types | `jobs` → platform | JOB-LIFECYCLE §§2–3, 5, 11–12; MODULE §3.3 |
| **FC10** | **Provider contracts** | The capability-profile schema and the **closed operation-class vocabulary**, with the audio fields and the unpopulated classes (`audio.speech`, `audio.transform`, `audio.lipsync`, `audio.voice`, `audio.transcribe`, `world.generate`); the closed authorisation-precondition kinds (`attestation`, `speaker-verification`, `own-voice-only`, `allowlist`, `unknown`; adding one is a decision, VOICE §5.3); the catalogue-face functions (`select`, `profile`, `evaluate`, `dialect`, `priceEntry`, `gate`); the adapter face `ProviderTransport` (`submit`, `observe`, `cancel`, `lookup`, `fetch`, `billed-quantity`, `wire-capture`); error-to-class maps; `spend.estimate` and `spend.admit` | `providers`, `spend` → generation (providers), platform (spend) | MODULE §3.3; PROVIDERS §§3, 13; BUILD EI3; VOICE §5 |
| **FC11** | **Verification contracts** | `FakeTransport` and the `kind: fake` brand; the conformance-suite interface; the `testProvider` read-model flag; the evidence-record shape; the scenario-script shape; the `Environment` type; the GP-S command fixtures as shared fixtures | `testing/` → platform | VERIFICATION §14, ADR 0026 |

### 2.2 Frozen later, at the exit of the slice that completes them

| Contract | Freezes at | Owner |
|---|---|---|
| Public entry of a domain module (its kinds, planners, derivations and Resolve functions): `story` | VS3 exit | story |
| `world`, including the Look carry-forward and view-resolution derivations | VS5 exit | world |
| `production`, including the Shot slot for a Composition reference (EI5) and stable Shot and Dialogue-line ids (EI6) | VS6 exit | generation |
| Delivery of a Composition reference in the Package (EI5) | VS7 exit | generation |
| Deterministic-first mapping with its evidence Decision (EI10) | VS4 exit | story |
| `Writing Style` kind (EI11) | VS2 exit | world |
| Exporter capability descriptor and Manifest Record (EI8) | VS9 exit | delivery |
| `project`'s planners and the remap rule per kind | VS6 exit (duplicate), later for purge | platform |
| IMPORTANT kinds (Line audio Slot, Voice, authorisation Decision stream, `previs` kinds): additive kinds on frozen FC3 and FC4; they freeze at the exit of the slice that first uses them | IW2, IW3 slice exits | the owning module's lane |

**Draft.** A contract before its freeze point is Draft. Its owner may change it without an amendment, **but the change that breaks a caller migrates every caller in the same change** (no compatibility layer; the monorepo and R12 make callers mechanical). A lane may consume another lane's Draft public entry (the lanes of BUILD §2.4 run ahead of their slices), and the owner's freeze notice re-triggers the consumer's gates.

**Not frozen anywhere:** scaffold wording and layer order data (versioned data under the prompt gate, VERIFICATION §7), the Catalogue's contents and overlay (audited data under F10 and F11), UX copy, view layout, numeric tunings, the migration tool.

## 3. What frozen means, and how a frozen contract changes

### 3.1 Three classes of change

| Class | Examples | Who | Needs |
|---|---|---|---|
| **Additive** | A new closed-vocabulary value; a new optional field; a new kind, operation (registry entry), Offering, adapter, command or read model; a new F3 clause (fail-closed, with a refusal test); a new operation class that was reserved | The owner module's lane, in the change that first uses it. A shared-vocabulary value or wire shape lands as its own small **contract-first change**, merged before its users | Change record names it; VC6 and the generated-code equality; exhaustive-switch build (a missing case fails); D3 for a persisted vocabulary; no version bump |
| **Breaking** | Remove or rename a field or value; change a signature, a result type or a state machine; make an optional field required; narrow a vocabulary; reorder or drop an F3 clause | Anyone may *propose*; only the owner and the integration thread approve | An **amendment record**, a major version, the migration of every caller in one change, re-verification (§3.3) |
| **Meaning-changing** | Any change to what a stored or frozen thing means, e.g. a Frozen fingerprint's unit, a reason code's trigger, a Package role's semantics | As breaking, plus: the thing **keeps its old meaning**; a new unit or a new value is defined instead (GLOSSARY *Frozen fingerprint*; a closed-vocabulary value is retired, never reused) | As breaking, plus an upcaster or expand-then-contract migration with D10 (PERSISTENCE §10.2) |

A change that would alter a Constitution requirement, a scope class or a ratified creator decision is not an amendment; it is a `CONSTITUTION AMENDMENT REQUIRED` proposal to the creator (the ticket's own rule).

### 3.2 The amendment record

A short, content-free record kept with the change (§10): the contract (FC number and surface), the class, the old and new surface, **the failing real case** that motivates it (a gate, a replay or a live run, never a preference), the consumers (listed mechanically from the import graph), the data and wire migration, and the sign-off of the owner and the integration thread. A contract cannot be amended to make a failing check pass or to relax a gate (§9).

### 3.3 Versioning and re-verification

- **Version.** Each of FC1 to FC11 and each later-frozen contract has an integer major version in the register. Wire schemas are additive within a version and a breaking change is a new version (MODULE §8). Persisted shapes change only by expand-then-contract with upcasters. Catalogue snapshots, compiler and scaffold versions, and operation versions are **data versions** with their own evidence rules, not contract versions.
- **Execution.** One change updates the schema, the generated output, every caller, the goldens and the fixtures together, and the merge queue lands it alone (§7). There is no period in which two versions coexist in the code, only in persisted data and on the wire.
- **Who re-verifies.** The author runs the merge set (VC1 to VC11, with VC4, VC5, VC7 and VC8 on the rebased result). Then **every lane that consumes the contract** re-runs its latest slice exit evidence and its GP-S and harness entries at the current seed boundary, and the independent verifier (§9) signs the change. A change to FC7, FC8 or FC10 also needs the VC2 golden diff reviewed as text, VC13 on every default-chain Offering, and VC15 before promotion (VERIFICATION §9). A change to FC3, FC4, FC5 or FC9 also needs D10 and the fault-injection suite (VC4).
- **Enforced** by R25 and R26 (§11), not by review.

## 4. The parallelisation map

### 4.1 Lanes and the modules they own

Ownership of truth decides ownership of paths (ADR 0016); a lane is a set of modules, never a layer (D, horizontal layers, was rejected in BUILD §2.1).

| Lane (BUILD §2.4) | Modules and paths it owns | Reads (frozen or Draft) | Concurrency inside the lane |
|---|---|---|---|
| **story** (VS1 to VS4) | `story`; the L-operation entries and guards it needs; its client surfaces | `history`, `contract` | By directory: one agent per kind or planner family (Source Material and Interview; documents; scene mapping). Operations are one file each |
| **world** (VS5) | `world` (Entity, Look, coverage, Visual Style, Writing Style, Voice definition later); its client surfaces | `history`, `story` read | By kind; Look and coverage derivations are one owner (they are one rule, ADR 0002, 0003) |
| **generation** (VS6 to VS8) | `production`; `compiler`; `generation`; `providers` (catalogue data and every adapter); later `previs` | `world`, `story` read; frozen FC3 to FC10 | **Widest swarm in the plan:** one agent per adapter directory with its fake and conformance run (build rule R19, EI13); `production` planners by kind; the compiler core is one owner |
| **delivery** (VS9) | `export`; playback and the Review surfaces | `production` and `story` read, `media` | By exporter (clips, xmeml, OTIO, documents), each behind the capability descriptor |
| **platform** (T0 core, then throughout) | Store adapters and ports, `jobs`, `media`, `accounts`, `spend`, `project`, `testing/`, the pipeline, the operator console | all frozen contracts | `testing/` and pipeline work parallel to features; the Store and Scheduler adapters are single-owner (§5) |

### 4.2 Registry-shaped modules are owned per entry

`workflows`, `guards`, `views`, `api` and the `client` are not owned as modules by any lane: **each operation, guard, read model, handler and screen belongs to the lane of the module whose truth it composes** (a cross-module workflow belongs to the lane of the slice that introduces it). Their indexes (the operation registry, the route table, the read-model list) are **generated from per-entry files**, never hand-edited, so adding an entry touches no shared file (BUILD EI2: a registry entry is picked up by the harness, isolation gate G1 and AI-map G10 without new test code). The client's shell, navigation frame and shared components are one owner (§5).

### 4.3 Three tiers

| Tier | Meaning | Work |
|---|---|---|
| **Parallel** | Disjoint paths behind frozen contracts; merge independently | Adapters and their fakes; exporters; kinds and planners of one module; operations; read models; screens of one phase; `testing/` fixtures; VC13 and VC14 evidence runs; platform ops work |
| **Coordinated** | One owner holds the whole piece; other lanes consult through the contract, not by editing | A cross-module workflow (write-back, accept and lock, duplicate, import mapping); the first lock end to end (VS3); the impact path; Look carry-forward consumed by Resolve; the compiler's Resolve consumption of a new owner; IW2 (Voice in `world`, Line audio in `production`, audio adapters, the F3 authorisation clause) and IW3 across `production`, `previs`, the client; any amendment |
| **Serial** | One writer at a time by structure | §5 |

Slice order is integration order (BUILD §2.4): a lane may run ahead on groundwork but **merges only through the gates of its slice**.

## 5. What stays single-threaded

| Surface | Why it cannot be swarmed | Rule |
|---|---|---|
| **T0** | Every leg changes the contracts it is writing (BUILD §7) | One thread, or a pair. No lanes until T0 exit |
| **The migration chain** | One linear, forward-only chain with checksums and a single schema snapshot (PERSISTENCE §10.2; D1) | Authored in the lane's change, **ordered by the merge queue** (merge order is chain order); never renumbered by hand after another migration lands; the snapshot is regenerated after rebase; two open changes may not alter the same table without the queue ordering them; every migration is expand-then-contract and passes D1 to D10 |
| **The write gate and the Store** | A bypass or a second reading of the lock rule is V1's failure (build rule R1, MODULE) | `history` core (commit, derive, kind registry) and the Store adapters have one owner at a time. Kinds are *additive* and owned by their modules |
| **The `contract` package** | Everything depends on it | Its structure, generator, id rules, envelopes and the **shared vocabularies** (those used by two or more modules: reason codes, job states, failure classes, layer keys, lock scopes, frame roles) are owned by a **steward**: one owner at a time. Module-specific commands, queries and read models sit in module-named partitions owned by the module's lane. Any addition is a contract-first change landing before its users |
| **GLOSSARY and ADRs** | Shared language; ADR numbers are allocated | A **docs steward** is the only writer. Lanes put a proposed term or a hard-to-reverse decision in the change record (§10); the steward integrates it. A code change never edits GLOSSARY or an ADR itself |
| **The Catalogue** | A bad default spends real money and is judged by evidence (F10, F11) | Offering and profile files are per Offering and parallel for **adding** an Offering as `preview`. **Default chains, ranking, tier, price, default-eligibility and overlay enablement** are serial, owner-decided, each with its evidence record in the same diff |
| **Compiler scaffold wording and the layer catalog** | An eval baseline is per operation class (VERIFICATION §7) | One change at a time per operation class; one owner for the layer catalog and precedence ladders |
| **Goldens, baselines and budgets** | They are the judge | VC2 goldens, eval baselines, GP-S command sequences (append-only per slice), the GP-L seed and the budgets change only through a change reviewed as text by a verifier other than the author (§9). Re-baselining GP-L is serial |
| **The release path and operations** | Production safety | The pipeline, promotion, secrets, the restore test, the evidence-record store and VC16 are platform-owned and human-gated where VERIFICATION §9 says |
| **The shell of the client** | One navigation frame (NAVIGATION) | Frame, routing and shared components are one owner; screens inside it are parallel |

## 6. Swarm models compared

| | **A. Lanes behind frozen contracts; slices own acceptance (chosen)** | **B. Slice-per-agent, end to end** | **C. Contract-first stub generation** | **D. One agent at a time** | **E. Ticket-per-agent, review-only coordination** |
|---|---|---|---|---|---|
| What an agent owns | Modules and paths of a lane | A whole slice through client, `api`, `workflows`, module, migration, GP-S | A generated stub of every contract, filled in per module | Everything, in turn | A ticket |
| Collisions | Disjoint paths; the serial surfaces (§5) are the only shared files and are few | Every slice touches the same shared files; VS1 to VS9 are mostly a chain (BUILD §2.4), so little runs concurrently anyway | Low until the stubs are wrong, then high everywhere | None | High: the V1 pattern |
| Contract drift (legacy 14 §9) | Prevented by freeze and R25 | High: each vertical invents the types it needs | Prevented, but frozen **before any real code** | None | High |
| Fidelity of the contract | From T0's real code (BUILD §7) | From whatever each slice built | **From documents**: V1's lesson that a mock-shaped design passes while the real path does not (§17.5) | From code | From code, unchecked |
| False-confidence risk | Low: stubs are only ports' contract-verified fakes | Low | **High:** stubs and mocks fill in as green | Low | Medium |
| Uses the swarm | Yes, widest at adapters, exporters, kinds, operations | Little | Yes | **No** | Yes, badly |
| Verdict | **Chosen** | **Kept inside a lane:** a slice's owner drives it end to end through its lane's paths, and slice exit evidence is vertical; rejected as the division of work | Rejected as the model. **Kept in part:** the generated mock server (VC6), `FakeTransport` and the contract-first *change* (§3.1) | **Kept where the structure demands it:** T0 and the serial surfaces | Rejected: it is the failure the ticket exists to prevent |

## 7. Conflict and merge protocol

1. **Path ownership.** A change declares its lane and the paths it writes. An agent writing a module directory holds it; two agents in one module hold disjoint declared sub-paths (an adapter directory, an operation file, a kind file). A change touching another lane's paths is a **cross-lane change**: it is declared, small, and needs that lane's owner as co-signer. R26 checks it.
2. **Short changes, one concern.** A contract-first change, then its implementation, then its UI, in that order; none waits on an unmerged sibling beyond one step.
3. **Serialised merge, tested result.** Changes land one at a time on a rebased base; the merge set (VERIFICATION §9) runs **on the rebased result**, so two changes that pass alone and fail together are caught before `main`. A skipped required check fails (VERIFICATION §9).
4. **Generated files are regenerated, never merged by hand:** the schema snapshot, generated contract types, the registry indexes, the surface snapshot of R25.
5. **Conflict resolution.** The *later* change resolves, by rebasing. A conflict in a frozen-contract surface is not resolved; it means two agents are changing a contract, so it stops and goes through §3. A semantic conflict (the behaviours disagree) goes to the owner of the module whose truth it is; neither agent decides by editing the other's test.
6. **Revert first.** A change that breaks `main` or a gate on `main` is reverted, then fixed on a branch. Forward-fixing on a red `main` is not allowed.
7. **Stop the line.** When a frozen contract is found wrong by a failing real case, every lane that consumes it pauses merges that depend on it until the amendment lands. Lanes that do not consume it continue.
8. **No second implementation.** An agent that finds an existing implementation of what it needs uses it or amends it. Adding a parallel one, a duplicate type, a local copy of a vocabulary or a second path to a port is refused by R1 to R13 and R25 and by review (V1 lesson).
9. **When blocked by a missing decision,** an agent stops and raises it in the change record; it does not code around a document, and it does not invent a product behaviour (STRONG-MODEL audit: agent-invented behaviours). A document found contradicting the Constitution or a Record is a reconciliation item for the docs steward, not a code decision.

## 8. Definition of done

**Slice done** (BUILD §2.2, §2.3, §7): the slice's exit evidence, plus the gates it makes live, plus its GP-S cases and harness entries, plus the seed boundary moved. This document adds: its early interfaces frozen at its exit (§2.2); the contracts it touched at their recorded versions; E1 and E2 replay green at the moved boundary; every item **produced by the pipeline and a verifier** and recorded (§10). **BAR** is the swarm's top-level done (BUILD §2.3); "Aiuteur works" (§3.1) is proved by VC16, never by the sum of slices.

**Evidence must match the claim.** A test double proves only what the double is verified to do.

| Claim | Minimum evidence | Not enough |
|---|---|---|
| "This code behaves as specified" | Public-entry tests (build rule R21); properties where a rule has a shape (VC3); mutation score where the module is in VC17's scope; the expected values come from the spec, a recorded corpus or an adversarial case, never from the implementation's own output | A snapshot regenerated to match |
| "It works against the database" | Real Postgres (VC4, VC8, VC7) | An in-memory fake alone (the fake is covered by the shared conformance suite, not a substitute for it) |
| "It works with a provider" | Conformance probes and live smoke on that Offering (VC13), within the smoke Account's cap, with an evidence record | A fake, a recorded response, or "the adapter compiles" |
| "It works for the creator" | The golden workflow in a real browser against the real stack (VC9); live runs VC15 and VC16 where VERIFICATION §9 requires them | A mocked-API render, a component test |
| "Nothing leaks across Accounts" | Isolation gates G1 to G11 generated from the contract, and the Two-Account harness for new operations (VC7) | A handler-level test |
| "It survives failure" | Kill-a-worker at each state on virtual time; once for real on staging for the legs T0 names (VC4) | A happy-path run |

### 8.1 Per kind of work

| Kind of work | Done when |
|---|---|
| **Contract change** (FC1 to FC11 or a later-frozen contract) | §3: class recorded; VC6 and generated-code equality; R25 reference; consumers re-verified; D3, D10 where persisted; verifier sign-off |
| **Domain module logic** (kinds, planners, derivations, Resolve) | Public-entry tests and properties through `history.commit` with the module's real kind (VC3, VC4 derive properties); GP-S cases for the states it makes reachable; no write on read (R10); VC1, VC2 |
| **History, Store, migration** | D1 to D10 (VC8); Store conformance on **both** adapters (VC4); isolation gates G1 to G11 and build rules R14 to R18 for any new table (VC7); the upgrade snapshot added (D10); fault injection between fetch, promote and settle |
| **Workflow operation** | Registry entry; the harness (VC5) passes it including the Initiation, record-before-send, one-send-path, shown-equals-sent and `HeldAsOption` assertions; for an L or M operation an adversarial recorded proposal and the live sampling of VERIFICATION §7.1 (VC14); one live run per new operation (VC13 LLM live smoke); isolation gate G1 and AI-map G10 pick it up |
| **Provider adapter, Offering, profile** | The fake extends `FakeTransport` and the adapter passes the `ProviderTransport` conformance suite (build rule R19, EI13); live probe and smoke with the evidence record **in the same diff** (F11, R23); golden Fit fixtures rerun and diffs reviewed; the 'fake never default' lines hold (VC10) |
| **Compiler or scaffold** | Version bump; VC2 golden diff reviewed as text; P-guards; wire parity; VC14 side-by-side judged by a human; `evidence` reference (build rule R23) |
| **Job, lifecycle, spend** | VC4 at every Job state; cap races; duplicate, late and out-of-order completion; completion in one transaction |
| **UI change** | §8.2 |
| **Export and delivery** | VERIFICATION §5.3 step 7 assertions (manifest equals selection, schema validation, unique names, frozen probe facts equal the files, dialogue identical); the hands-on NLE import recorded once per release |
| **Platform and operations** | The deploy-by-digest and rollback; the secret canary (isolation gate G8); heartbeat; the restore rehearsal or test with its record (OPERATIONAL-BASELINE §9) |
| **Documentation or decision change** | Cross-reference check: every cited module, rule, gate and contract exists in its source; no contradiction of a higher authority. These are not slices |

### 8.2 How an agent proves a UI change

1. **Statically:** build rule R3 and the client rules of MODULE §4: the client imports only `contract` and computes no status, marker, lock, progress figure or price.
2. **Against the contract:** VC6 with the generated mock server, including an unknown vocabulary value rendering neutrally.
3. **On the real stack, in a real browser:** the affected step of E1 or E2 (VC9) runs through the real UI against the built `web`, real Postgres, the fake transport and recorded proposals, with the seed boundary moved to include it. The assertion reads the **read model the screen displays**, not only the DOM.
4. **Survives a reload and a stale client:** reload mid-flow shows the same state (the client holds nothing the product relies on); a stale client's write is refused by the server and the screen re-renders from the refusal.
5. **Seen:** screenshots, and a recording where timing, motion or interaction is the change, taken from step 3's run for each state that matters, attached to the change record. An agent that did not look at the rendered result has not finished a UI change.
6. **Budgets:** VC12 where the screen is on a budgeted path (the Board at 250 shots on GP-L).
7. **Judgement stays human** where VERIFICATION §5.3 marks it (whether it feels right, whether characters look right). An agent states that it did not judge it.

## 9. Verification independence

- **Verifier.** A fresh-context agent (or the integration thread) re-runs the gates from the merged digest and reads the artifacts. It receives the change, the cited spec and the gate results, not the author's explanation. The verifier is required for: a change to a frozen contract, a gate, a golden, a baseline, a budget or an isolation rule; any change on a serial surface; and every **slice exit**. Other changes rely on the pipeline.
- **Authors do not grade themselves.** Expected values for a behaviour come from the spec, a recorded corpus, or an adversarial case written before the implementation; a golden or snapshot updated in the same change as the code it judges is reviewed as a text diff by someone other than the author.
- **A gate is never weakened in the change it unblocks.** Skipping, relaxing, deleting or quarantining a check, threshold, baseline or fixture is a gate amendment: separate change, platform owner, verifier, recorded reason. A flaky check is fixed or the flake is recorded and bounded; it is not removed (V1: mock by default).
- **Humans** stay where VERIFICATION §7 and §9 put them: eval side-by-sides, identity-critical model changes, default-eligibility, VC16, the NLE import, the restore test, production approval. A model-as-judge may nominate cases but is never a gate (VERIFICATION §7.2).
- **Report discipline.** An agent's claim of done is a pointer to artifacts (digest, gate results, evidence-record ids, screenshots), never a statement. A claim without an artifact is not evidence.

## 10. How agent work is recorded

Every change carries a **change record**: one content-free note kept with the change.

| Field | Content |
|---|---|
| Lane, slice, kind of work | §4.1, BUILD §2.2, §8.1 |
| Paths owned, cross-lane touches and their co-signers | §7.1 |
| Contracts touched | FC number, class (additive / breaking / meaning-changing), versions before and after, amendment record |
| Evidence | Digest; gate results; evidence-record ids (VC13, VC15, VC16); GP-S cases and harness entries added; screenshots for a UI change; the verifier's record where §9 requires one |
| Seed boundary | Before and after, for a slice exit |
| Decisions | Each non-trivial decision: what, why, evidence, result |
| Raised | A proposed GLOSSARY term or ADR for the docs steward; a document inconsistency; a question that blocked work; a `CONSTITUTION AMENDMENT REQUIRED` proposal; what the agent could not verify |

The pipeline attaches the gate results to the digest; the evidence-record shape is FC11, so the same store serves promotion (VERIFICATION §9). The register of §2 keeps the current version of each contract and the record of its amendments. This is the trail a reviewer reads after the swarm has run unattended.

## 11. Rules the build enforces (extend build rules R1 to R24)

| # | Rule | Enforced by |
|---|---|---|
| R25 | The public surface of a frozen contract changes only in a change carrying an amendment reference (breaking or meaning-changing) or a contract-first additive entry; the surface is a committed snapshot extracted from the public entry and the schema | Surface-snapshot diff in VC1; VC6 |
| R26 | A change writes only the paths of its declared lane, or declares a cross-lane touch with the owner's co-signature; generated files and the serial surfaces of §5 accept changes only through their owner | Path-ownership check in VC1 |

## 12. Not decided here

Tool configuration for the merge queue, ownership checks and snapshot extraction; the format of the change record and of the contract register; branch naming; agent counts, scheduling and estimates; which agent plays verifier; slice contents and ticket breakdown (`/to-spec`, `/to-tickets`); numeric thresholds (mutation score, flake bounds). These are the spec's, and may change without changing a decision here.

**Revisit if:** T0 exit shows a register entry not frozen by real code (it stays Draft with a named reason); more than a few amendments in one lane's first slice (the freeze happened too early: re-freeze after that slice, never by loosening R25); the serial surfaces of §5 become the bottleneck (split the surface by kind or by file as the spec finds, never by dropping the single-writer rule); a verifier finds that a gate can be satisfied by construction (that gate is amended under §9).

## 13. Hand-offs

| Ticket | Receives |
|---|---|
| **Final audit** (#79) | FC1 to FC11 each trace to a source document and an owner; the frozen register covers MODULE §14, VERIFICATION §14, PERSISTENCE §14 and BUILD §7 lists; R25 and R26 extend R1 to R24; nothing here changes a scope class or contradicts BUILD §2.4 (lanes and slice order) or MODULE (one owner per type, `history` the only writer); VOICE §12's "shippable with CORE" for its slice 1 means it needs no provider audio and does not touch CORE; it is the first step of IW2 and lands after BAR (BUILD §4.1 rule 1; BUILD IW2 aligned) |
| **Spec and tickets** | The register as the contracts a spec may not redefine; lanes and path ownership as the division of work; §8.1 as the definition of done per kind of ticket; the serial surfaces as ordering constraints; the change record as the per-ticket report |
| **Voice and performance** (#69) | Its seams are additive on the register: the audio fields and unpopulated classes are already in FC10 (EI3); `authorised()` is a new **F3 clause** on FC7 (additive, fail-closed, with its refusal test); the Line audio Slot and the lineage reason `authorisation-revoked` (with `performance-changed`, existing) are additive FC1 vocabulary and `production` kind entries; the five authorisation kinds are a closed FC10 list; Voice is a `world` kind, Line audio a `production` kind, the Package role `audio.performance` and layer `voice:<presence>` are FC1 and FC8 additions; none is an amendment. IW2 is a Coordinated item (§4.3) |

## 14. Constitution check

No requirement was found unworkable; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** §3.1 and §18.8: the top-level done is the bar run on real providers and a real NLE import, and no claim about a provider, a database or the creator's experience is accepted from a double (§8). §17.5: no mock is accepted as evidence beyond what its conformance proves, and the gate-weakening rule (§9) answers V1's habit of making checks pass. §16 principle 11 and §17.2: the client rules are part of the UI proof (§8.2). Scope classes (§15) are untouched.
