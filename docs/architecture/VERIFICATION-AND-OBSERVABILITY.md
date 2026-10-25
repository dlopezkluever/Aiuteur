# Aiuteur V2: Verification and Observability

Resolution of Wayfinder ticket #76. The trade-offs are recorded in [ADR 0026](../adr/0026-the-generation-record-is-the-trace-and-test-providers-are-contract-verified-and-marked.md). Inputs: the [AI responsibility map](../ai/AI-RESPONSIBILITY-MAP.md) (AI-map guards G1 to G10, "Generation call log is the trace"), the [Generation package](../domain/GENERATION-PACKAGE.md) (Package checks P1 to P11, §17 fixtures, reproducibility §13), [providers and models](../domain/PROVIDERS-AND-MODELS.md) (F1 to F12, §16 fixtures, conformance probes §10.4), the [module architecture](MODULE-ARCHITECTURE.md) (test seams §11, build rules R1 to R13), the [job lifecycle](../domain/JOB-LIFECYCLE.md), the [runtime platform](RUNTIME-PLATFORM.md) (§7 signals), the [operational baseline](OPERATIONAL-BASELINE.md) (isolation gates G1 to G11, content-free logs, Sentry port, environments), [persistence](PERSISTENCE-AND-MEDIA.md) (drift checks D1 to D9, working budgets), the [business contract](../domain/BUSINESS-AND-OPERATIONS.md) (caps), the [Creator Ratification Records](../product/CREATOR-RATIFICATION-RECORD-2.md) (Record 2 P11 VPS, Record 2 P12 restore test; Record 4 W60 inspector), the [strong-model audit](../product/STRONG-MODEL-WAYFINDER-AUDIT.md) and the legacy evidence (13 test map; 09 §1.3; FACT-0353; the #9 platform research).

Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). This document fixes **what proves Aiuteur works and how a Generation is traced**: the checks, what each gates, the test-provider policy, the golden projects, and who may see what. It does not fix test code, tool configuration, numeric thresholds or the sampling counts of evaluations (spec). Tool classes are named only as candidates.

## 0. The architecture on one page

| # | Item | Decision |
|---|---|---|
| 1 | **AI tracing** | **The Generation record is the trace.** Its Package, Fit report, Rendered request, call log, run history and settled outputs, joined by stored ids, are the whole trace. No tracing vendor and no second store (§2) |
| 2 | **Who sees content** | Three tiers. **A** content-free ids, codes, counts, costs, durations: logs, Sentry, alerts, operator views. **B** content (Rendered request, call log, responses): only under the creator's Scope. **C** media bytes: signed access under Scope. Nothing from B or C ever reaches A (§2.3) |
| 3 | **Test providers** | Fakes are **contract-verified**: one conformance suite runs against every fake and, as a live probe subset, against every real adapter. A fake is marked in the type system, the Offering, every Generation it serves, its output bytes and the UI, and the production send path refuses it (§3) |
| 4 | **Live evidence** | Scheduled live smoke and conformance probes per Offering, a live mini golden run, and a human-judged **bar run**, all under spend-capped staging Accounts. Real runs are never merge gates; they gate promotion and enablement (§3.4, §5.4) |
| 5 | **Payload regression** | Compiler **golden Rendered requests** (full text, not only digests) from the golden project's ResolvedInputs × profile snapshots; a changed byte without a version bump fails; wire parity Package P1 on every adapter and fake (§4) |
| 6 | **Seams** | Contract tests at every port and module seam by shared conformance suites, an operation harness generated from the `workflows` registry, and a generated two-Account harness. **Doubles only at ports; no module mocking; tests use public entries** (§4) |
| 7 | **Golden projects** | **GP-S** (about 24 shots, authored as replayed commands, covers every kind and Slot) and **GP-L** (250 shots, generated from a seed, for budgets). Replay by default; live only on GP-Mini and the bar run (§5) |
| 8 | **Golden workflow** | The seven steps of §3.1 as two scripted browser scenarios (rough paragraph; own screenplay), each step with automated and human assertions (§5.3) |
| 9 | **Schema drift** | D1 to D9 plus D10 (previous release's golden snapshot upgrades), contract-generation equality, Catalogue validation (F10), previous-image-on-new-schema smoke (§6) |
| 10 | **Prompt and model quality gates** | Tiered: code-checkable properties auto-gate (zero tolerance where code enforces; non-regression against a recorded baseline for rates); taste and recognisability are judged by a human on a fixed **eval set**; model judges are advisory only. Cost bounded by a capped eval Account (§7) |
| 11 | **Gate matrix** | Checks VC1 to VC17 mapped to PR, merge, staging, production, prompt, Catalogue, migration and overlay changes (§9) |
| 12 | **Performance** | Verification owns it: deterministic **shape budgets** (query count and payload bytes constant in shot count) on every merge; **timing budgets** nightly and at promotion on GP-L. Numbers stay in the spec (§8) |
| 13 | **Legacy prompts** | **Not imported as fixtures or as prompt text.** V1 *inputs and failing cases* qualify, under a stated rule; any adopted wording enters as versioned scaffold through the prompt gate (§10) |

## 1. What this answers

| V1 failure | Answer |
|---|---|
| LLM mocked in tests; 723 executed tests, none reaching the shot-lock gate or image generation (legacy 13 §2 and its capability matrix) | Models enter tests only as **recorded proposals** fed to pure guards and as a contract-verified fake transport at a port; real-model smoke and an eval set exist (§§3, 7) |
| Replica and parity tests that pass by construction (legacy 13 §8, §12) | Tests import the unit's public entry (build rule R21); there is one compiler, so no parity test exists; two implementations meet only in a shared conformance suite (§4) |
| No contract tests; mock persistence (legacy 13) | Generated mock server and schema equality; conformance on every port; real Postgres in CI (§4) |
| Video defaulted to a mock provider (Constitution §17.5) | Structural: type, loader, boot, readiness, send gate, record marking, watermarked bytes, UI mark (§3.2) |
| LangSmith callbacks never attached; trace id never written; trace id was the request id (FACT-0353; legacy 09 §1.3) | The trace is stored rows written in the same transaction as the work, not a callback; a conformance check asserts the ids exist (§2.1) |
| Token and cost usage in memory only (legacy 09 §1.2) | Cost and run history are on the Generation (BUSINESS §5); outcome aggregates are queries over them (§2.5) |
| Database and live tests mixed in one runner, skipped silently (legacy 13 §§1.3, 13) | A live check is a separate named workflow with its own Accounts and caps; a skipped required check fails the pipeline (§9) |
| No end-to-end run; export, stitching and audio never existed (§17.5) | Golden workflow E1/E2 in CI on replay, and a live bar run before any invitation (§5) |

## 2. Observability

### 2.1 Trace identity

```diagram
 requestId ─▶ actionId ─▶ [Batch id] ─▶ Generation id ─▶ call index ─▶ Job id + run number ─▶ provider operation ref ─▶ Attempt / Option / Revision
 (api)        (client,     (dependency   (permanent       (call log:     (JOB-LIFECYCLE §7;        (adapter's own id,        (the settled output;
              JOB §4)      edges)        record)          draft/repair/  run history keeps         sent as metadata or       created in the settling
                                                          check/partition) the run when the Job    idempotency key where     transaction, so it cannot
                                                                           is pruned)              accepted)                 exist without the link)
```

- **Root is the Generation id**, because it outlives Jobs (ADR 0001). Every link is a stored field written by the transaction that creates the thing it names (create, claim, submit, settle), never by a callback or a side channel. The Account id is on every row and line.
- **"Attempt" here is the output artifact** (domain term); the provider call is a **run-history entry** on the Generation, which survives pruning of the Job.
- A text operation's trace is its **call log**: ordered calls with role (draft, repair, check, partition), Rendered request, model, raw response, validator verdicts and cost (PACKAGE §11). The same Package, Fit and Rendered request types make one inspector read both families.
- **Rule R22:** the trace fields are part of the Generation and run-history shapes; the dispatch path passes the Generation id and Job id to the provider as metadata or idempotency key where the provider accepts one; the adapter conformance suite fails an adapter that does not store the provider operation reference.

### 2.2 Where trace data lives (compared)

| | **A. The Generation record (chosen)** | **B. External tracing vendor behind a `TraceSink` port** (LangSmith, Langfuse, an OpenTelemetry backend) | **C. A. plus content-free spans to a telemetry backend** |
|---|---|---|---|
| Content leaves our database | **No** | Yes: prompts and responses go to a third party, against deny-by-default scrubbing and the purge promise (Record 1 M7) | No (ids, durations, codes only) |
| Second truth to keep in step | None: it is the record | Yes: a callback or export that can fail silently (V1's LangSmith, FACT-0353) | Yes, but content-free and non-authoritative |
| Written in the same transaction as the work | **Yes** | No | No |
| Survives purge, retention and backup rules already decided | **Yes, by the same rules** | Needs its own purge and retention | Ids only, so purge-neutral |
| What it adds that A lacks | n/a | Dashboards and sampling UI | Latency waterfalls and cross-process spans |
| Cost | $0 | Vendor and ingestion cost | Backend cost and an agent |
| Verdict | **Chosen** | **Rejected**: it duplicates a record that already holds more than a tracer would, and exports private creative content | **Deferred** (OPERATIONAL-BASELINE §12). The trace ids make spans derivable later; an `OpenTelemetry`-class exporter would be a `Telemetry` port adapter carrying tier A fields only |

### 2.3 Who may see what

| Tier | Contents | Lives in | Visible to | Retention |
|---|---|---|---|---|
| **A: content-free trace** | Ids (Account, project, Generation, Job, Batch, request, action), operation class, Offering id, profile snapshot id, dialect and compiler versions, Rendered request **digest**, Fit outcome **codes**, guard ids and verdict codes, state, failure class and closed code, `billed`, estimate and actual cost, timings, counts, provider kind | Logs, Sentry tags, alert rows, `operator_read` views, the verification status endpoint | Operator, developers, the log and error sinks | Logs 30 days (OPERATIONAL-BASELINE §6); rows live with the Generation |
| **B: content** | Rendered request text and parts, Package, ResolvedInputs, call log requests and **raw responses**, provider echo, Override text, provider error text | The Generation (Record data, never pruned with Jobs); raw provider reason on the Job | **The creator, under Scope, in the inspector and in exports (prompts are exportable, Constitution Q2).** Never the operator role, a log, Sentry, a metric, an alert or a trace view | The life of the project; purged with it (Record 1 M7); backups per the purge window. The Job-level raw reason follows Job pruning |
| **C: media** | Bytes of Frames, Takes, references | The object store | The creator via `media.access` | As Media (PERSISTENCE §7) |

- **Flow is one-way: B and C never become A.** A digest is tier A; the text it hashes is not. Provider error text is tier B because it may echo a prompt (OPERATIONAL-BASELINE §7.1 rule 3).
- **Wire capture is a test hook** (PROVIDERS §7.2) used only against fakes and in live smoke on synthetic data. A production adapter never logs or stores bodies; Package P1 holds there by construction (the adapter accepts only a stored Rendered request) and is proven in CI and in live smoke.
- **Nothing recorded from production reaches CI, staging or a developer.** Golden projects, recorded proposals and eval sets are authored or generated synthetic data (OPERATIONAL-BASELINE §4.1). In staging and CI, tier B is open to developers, because it is synthetic.
- **Debugging a creator's bad output without reading it.** Tier A says what ran, on which Offering and snapshot, how it ended and what the Fit decided. The creator may hand the inspector's details to the operator by choice (a copy action; spec). A break-glass database read stays outside the product (OPERATIONAL-BASELINE §9).
- **Gate:** the secret canary (isolation gate G8) is extended to plant a prompt in a Rendered request and a call-log response and assert absence from logs, Sentry events, alerts, `operator_read` views, the verification status endpoint, metrics and events; AI-map G6 asserts no tier B column in any operator view.

### 2.4 Surfaces

| Surface | Audience | Shows | Does not show |
|---|---|---|---|
| **Inspector** (on demand, never required; PACKAGE §8.2, Record 4 W60) | Creator | Segmented Rendered request with provenance kinds, carried references with roles and reasons, Fit notes, digest, model, price and actual cost, seed, provider rewrites, run history in plain words (retried, late, adopted), the call log of a text operation (draft, repair, check, with validator verdicts), "prompt overridden" and "base changed" | Internal ids by default; a quality score (see §2.7) |
| **Failure surface** (JOB-LIFECYCLE §2.1, §12) | Creator | A quiet failure event with plain class, `billed`, and a priced Retry or Edit-and-retry; provider refusals in the provider's words | Raw stack, vendor jargon |
| **Operator views** | Operator | Job states and ages, Generation outcome rows (tier A), Offering and snapshot health, last live smoke per Offering, spend totals, alerts | Any content |
| **Developer** | Developers | Logs and Sentry by ids; in staging and CI, the full record | Production content |

### 2.5 Signals that drive quality decisions

All are queries over Generation and Job rows (no new store), joined to the operator views: time to terminal per Offering; actual versus estimate per Offering (price drift); failure-class distribution; **Fit** outcome counts per operation (blocked-fit, `param-adjusted`, `param-unsupported`); repair rate, HELD rate and guard rejections per guard id for L operations; inspector "inputs changed" refusals; late-result and maybe-billed counts. A rising repair or blocked-fit rate for one Offering is the production signal that triggers a Catalogue or prompt review (§7). They carry tier A only.

### 2.6 Failure surfaces

| Failure | Creator sees | Operator sees | Developer sees |
|---|---|---|---|
| Provider failure, refusal, timeout, late result | JOB §12 events and labels | Class counts per Offering; alerts S7, S10 | Ids and codes in logs; run history |
| Guard rejection or HELD output | A held Option with the check named (AI map §5) | Guard id counts | Same, tier A |
| Blocked fit; inputs changed since you looked | The message with exits | Counts | Same |
| Invariant violation in our code | A neutral error; no work lost | Alert | Sentry group with class, ids, release digest |
| Fake in production (should be impossible) | Nothing reaches a creator: boot fails or dispatch refuses | Heartbeat and alert | Boot error |

### 2.7 Product-visible verification versus system verification

- **Product-visible:** the creator can always see what was sent and why a thing may be stale (principle 10). Aiuteur **does not show a quality or "identity match" score** on any output: no reliable automated judge exists (§7), and an unreliable score contradicts principle 12 and the quiet-markers rule (Record 1 M1).
- **System verification:** everything else in this document. It never reaches the creator except through the same quiet marks that already exist (a failure, a stale marker, a "test provider" mark outside production, §3.2).

### 2.8 Diagnostics and recovery

- **Scenario scripts.** A lifecycle bug is content-independent, so a failed Generation's **run history** (states, classes, timings, provider behaviours) exports as a **scenario script** the test provider replays, with no creator content. Reproducing "crash between accept and commit" or "late result after cancel" needs no production data.
- **Re-run exactly** (PACKAGE §13.3) is the creator-side recovery and the way to ask whether a provider changed; it is a new Generation under the usual spend rules.
- **Verification status endpoint** (operator, content-free): build digest, environment, fake Offerings loaded (must be 0 in production), latest live smoke per `active` Offering and snapshot, last bar run, last restore test, Catalogue review ages, perf budget status. `GET /healthz/deep` already reports liveness (OPERATIONAL-BASELINE §7.2); it also fails when a fake is loaded in production.

## 3. Test providers: fakes versus live

### 3.1 Designs compared

| | **A. Hand-written fakes** (V1's mocks) | **B. Record and replay of real traffic** | **C. Contract-verified fakes (chosen)** |
|---|---|---|---|
| Can drift from the real provider | **Yes, silently** | Yes: recordings age; one-off | **Bounded:** the same conformance suite must pass on the fake and, as a probe subset, on the real adapter |
| Can script crash, duplicate, late, expired, no-cancel, billed-unknown behaviours | Per test | **No**: only what was recorded | **Yes**: scripted from the Catalogue's declared run behaviour |
| Needs real keys and spend to refresh | No | Yes | Only the scheduled probes |
| Holds creative content or secrets | No | **Yes**: cassettes capture prompts and tokens | No: synthetic only |
| Verdict | Rejected: V1's failure | Rejected for providers; kept narrowly for **L and M model outputs**, as *recorded proposals* (§3.5) | **Chosen** |

### 3.2 A fake can never silently become the default

Eight independent lines, each cheap, so removing one still leaves the rule standing. VC10 tests every line.

| # | Line | Mechanism |
|---|---|---|
| 1 | **Type** | An adapter is `RealAdapter` or `FakeAdapter` (branded). The `production` composition root accepts `RealAdapter` only; a fake is not assignable. Only a fake extends `FakeTransport`, whose `kind` is `fake` |
| 2 | **Location (R19)** | Fakes live in `testing/`. Only composition roots for local, ci and staging, and tests, import it (import-boundary check); a `ProviderTransport` implementation outside the adapters or `testing/` fails the build |
| 3 | **Environment is injected (R24)** | The `environment` value is read only in composition roots and passed down; no module branches on ambient test flags |
| 4 | **Loader (F2)** | The Catalogue loader refuses a production boot that loads a fake Offering or resolves any default chain to one. Missing key means the Offering is unavailable with a reason; there is **no fallback** to anything |
| 5 | **Send gate (F3, amended)** | The dispatch gate adds: `environment = production ⇒ Offering kind = real`. This is the last step of the one send path, so a defect anywhere above it is still stopped |
| 6 | **Record** | `kind` is part of the immutable profile snapshot, so every Generation served by a fake carries it. The read model exposes `testProvider`; the client renders a persistent mark on every Frame, Take and inspector header produced by one, and `export` prefixes such filenames `TEST-` |
| 7 | **Bytes** | A fake's outputs are self-evidently fake: a burned-in "TEST PROVIDER" frame and a fixed tone, and a metadata tag. A leaked file is recognisable without any database |
| 8 | **Detection** | Readiness and the heartbeat fail when a production process reports a fake Offering; a nightly derived check alerts on any Generation with a fake snapshot in the production database |

Also kept from the baseline: real keys are refused in `local` and `ci` (F2), and staging uses fakes by default with real Offerings only through capped test keys.

### 3.3 Conformance suites

One suite per port, run against the real and the fake adapter (Store, Scheduler and Clock, BlobStore, Vault, Mailer, ErrorSink, `ProviderTransport`). The **`ProviderTransport` suite** asserts: Package P1 wire parity; error-to-class mapping for every documented provider error and *Unknown, maybe billed* for the rest; idempotent submit with the Job id; stored provider operation reference (build rule R22); webhook signature and duplicate and out-of-order delivery; expired output URLs; no-cancel and best-effort cancel; late result after cancel; maybe-billed reconciliation; honest billed quantity. The **fake is parameterised by a profile snapshot**: its Fit-visible capabilities and run behaviour come from the same evidenced profile a real Offering would carry, so capability tests run against evidence, not invention. A scripted behaviour must cite the Catalogue's declared behaviour or a #9 research fact. The real adapter runs the probe subset live (§3.4); the fake runs all.

### 3.4 Live evidence

| Check | What | Cadence and trigger | Cost bound |
|---|---|---|---|
| **Conformance probes** (VC13) | Per Offering, cheap non-generating calls where the provider offers them: declared parameter accepted, undeclared rejected in the documented way, schema-diff against the snapshot where the provider publishes one (PROVIDERS §10.4). Can only suspend (F5) or alert | Nightly | Near zero |
| **Live smoke** (VC13) | Per `active` or default-eligible Offering, the cheapest real request (shortest, lowest tier): accepted, fetched, verified, billed quantity within tolerance of the estimate, wire capture equals the Rendered request, one known-bad request maps to its class | Weekly; before an Offering is enabled; before promotion when the adapter, a profile or the generation path changed and the last green is older than a window (spec value) | The **staging smoke Account's** creator cap, enforced by the ordinary `spend.admit` |
| **LLM live smoke** (VC13) | Each L or M operation on a tiny synthetic fixture with the real model: output parses, guards run, repair rate recorded | With the weekly smoke and on any prompt or model change | Same cap |

Results are content-free **evidence records** (Offering, snapshot id, build digest, date, outcomes, cost). A `verified` capability in a profile (PROVIDERS §4.1) cites one; review ages (§10.4) alert when it ages out. The promotion step reads them; the operator action that enables an Offering in production is refused unless the profile snapshot carries a `verified` record within its review age.

### 3.5 Recorded proposals for L and M operations

The model is a proposer (ADR 0007), so most of the system is testable without one: AI-map guards G1 to G10, `validate` and `attach` take a *proposal* and need no model. A **recorded proposal** is a real model output captured **from staging on synthetic input**, stored with its input, model snapshot and date, and fed to the operation harness through the fake transport. Rules: proposals include **adversarial** ones (altered dialogue, paraphrased handles, malformed structure, contradictions, a splice that touches protected spans); refreshing a recording is a reviewed change, run by the live smoke, never automatic; a recorded proposal must still satisfy or be rejected by the guards exactly as recorded. The fake model replays by **(operation id, scenario step)**, not by request digest, so a compiler change does not invalidate every recording; a wrong operation or order fails the scenario.

## 4. The test layers

| Layer | What it checks | Doubles | Runs |
|---|---|---|---|
| **Static** (VC1) | Types, lint, build rules R1–R26, RT1–RT6 (static parts), `console` ban, vendor-name search (build rule R9), secret scan, dependency audit, generated-code equality | none | every push |
| **Pure goldens** (VC2) | `compiler`: golden **Rendered requests** (full text and parts, with digest) from GP-S ResolvedInputs × profile snapshots × operations, committed and reviewed as text diffs; a byte change without a compiler or scaffold version bump fails; `guards` against recorded adversarial proposals | none (pure) | every push |
| **Properties** (VC3) | P2 carried-set equality and P4 no-truncation under random counts and sizes; Fit totality; normalisation monotone and idempotent; derive properties (restore clears markers, duplicate reproduces markers, unlock marks nothing) | none | every push |
| **Seam conformance** (VC4) | §3.3 suites on real and fake adapters of every port; Store on real Postgres | the port's own fake | merge |
| **Operation harness** (VC5) | **Generated from the `workflows` registry**: every operation runs the real path (scope, resolve, compile, admit, create, dispatch, settle, attach) with a fake transport, virtual time, real Postgres and recorded proposals. Asserts: Initiation required (build rule R6), record before send (Package P7), one send path (build rule R5), shown equals sent (Package P1, inspector view equals wire capture), `HeldAsOption` keeps paid output, completion in one transaction, no write on preview (Package P11) | ports only | merge |
| **Lifecycle recovery** (VC4) | Kill-a-worker at every step on virtual time; duplicate, late and out-of-order completion; crash between accept and commit; expired URLs; no-cancel provider; cap races | Scheduler, Clock, transport fakes | merge |
| **Contract** (VC6) | Generated types equal the schema; client against the generated mock server; server against the same schema; unknown closed-vocabulary value renders neutrally; breaking change needs a new version | generated mock | merge |
| **Isolation** (VC7) | G1 to G11, generated from the contract and grants | none | merge |
| **Golden workflow** (VC9) | §5.3, in a real browser against the real stack with fakes and recorded proposals | ports only | merge (E1 and E2); a short path on every push |
| **Mutation** (VC17) | Mutation testing over `compiler`, `guards`, `history.derive` and the Fit evaluator: surviving mutants mean tests that cannot fail. Threshold in the spec | none | nightly |

**Rules the layers keep (R20, R21).** Doubles enter only through ports at a composition root; a lint bans module-mocking APIs on repository modules, so no test can stub an owning module's function. A test imports the unit under test through its public entry only (build rule R12); a test that re-declares production logic cannot compile against the entry. Where two implementations exist, they meet only in a conformance suite both pass; an assertion comparing a copy of the logic to production is not a test.

**Unit seams.** MODULE-ARCHITECTURE §11 stands; this document adds `Mailer`, `ErrorSink` and the model-proposal replay as seams, and the rule that the `Environment` and `Clock+Ids` are injected (build rules R11, R24).

## 5. Golden projects and the golden workflow

### 5.1 Definition

| | **GP-S** (the seed project) | **GP-L** (the large project) |
|---|---|---|
| Purpose | Behaviour: every kind, Slot and state; payload goldens; the workflow's start and end states; eval cases | Budgets: 150 to 250 shot behaviour of the Board, Outline, impact, commit, duplicate, purge, playback manifest, batch admission |
| Size | About 6 scenes, 3 characters (one with two Looks), 3 locations (one with Directions × Looks), about 24 shots | 40 scenes, **250 shots**, about 15,000 Attempts and 150,000 capture edges (the PERSISTENCE §12 shape) |
| Made by | **Authored as a sequence of commands** replayed through `workflows` and `history.commit`, so it is valid by construction and cannot hold a state the product cannot reach | **Generated from a fixed seed** by a script that scales GP-S's patterns; shape parameters are recorded with the project |
| Media | Tiny synthetic files from the fake provider (watermarked) | Same, smaller |
| Spend | None in replay | None |

**GP-S must contain** at least one of each: a Revision chain with a restore; an Attempt that is selected, one unselected, one retired, one adopted late; a locked scene; an Acknowledgement (Keep) and a Deviation; an Override with a "base changed" note; a split, a merge and a redraft with Options; a flashback scene with Look carry-forward; a scene in Removed from Story and an ad-hoc shot; a shot with frames skipped (direct-to-video) and a shot over the model's limit (Segments); a three-character shot on a model that takes two identity images; dialogue with quotes, parenthetical and V.O. cases; a Fact contradiction for the fact check; a Source Material import and a screenplay import; one export. The PACKAGE §17 and PROVIDERS §16 golden fixtures are cases in it, not separate files.

**Companions.** (a) **Upgrade snapshots**: GP-S as exported at each released schema version, kept for D10. (b) **Fixture corpora**, not projects: screenplay and mapping adversarial inputs (SCENE-IDENTITY), tricky-dialogue inputs, recorded proposals (§3.5), scenario scripts (§2.8). (c) The **eval set** (§7): a tagged subset of GP-S cases plus cases added whenever a defect is found.

### 5.2 Replay versus live

Everything in CI is **replay**: real Postgres and the real wiring, fake transport, recorded proposals, virtual time. **Live** means a real provider and real spend, and exists only as the checks of §3.4, **GP-Mini** (§5.4) and the bar run. GP-L is never live: its media is synthetic, and the budgets concern our code, not a provider.

### 5.3 The golden workflow (derived from §3.1)

Two scripted browser scenarios, **E1** from a rough paragraph and **E2** from the creator's own screenplay, run through the real UI. Each step is asserted by code where code can judge, and by a human only in the bar run.

| §3.1 step | Automated assertion (replay) | Judged by a human (bar run) |
|---|---|---|
| 1 Interviewed until understood | Interview produces Facts; advisory ending computed by code; conflicts reopen a question | Whether the interview felt like understanding |
| 2 Treatment, beat sheet, Master Narrative | Documents exist with provenance runs; explicit sync only; dialogue exactly once (AI-map G3); acceptance lock offer | Whether the writing is usable |
| 3 Cast and locations | Entities with identity reference and base Look; coverage derived from shots; no auto spend | Whether the identity images look right |
| 4 Plan the shots | Shot plan anchored to passages; every Dialogue line covered once; Presence derived | Whether the plan is sensible |
| 5 Frames and takes; identity holds; characters speak | Every on-screen Presence is carried (identity reference or handle) in the Rendered request; each Dialogue line is byte-identical in the audio and video request (Package P3); the inspector equals the wire capture (Package P1); price shown before spend; failure and retry paths | **Whether characters stay recognisably themselves and the lines are spoken** (non-deterministic; no automated judge is a gate) |
| 6 Watch in order | Playback is selected Takes only, in story order; a gap slate reads correctly | Whether the piece plays as a piece |
| 7 Export to Resolve or CapCut | (from IW1; at BAR: ordered unique-named clips plus documents) Manifest built from the selection; xmeml and OTIO validate against their schemas; unique clip names; frozen probe facts (fps, CFR, frame count, audio layout) equal the files; documents included; dialogue identical to the Master Narrative | **Importing the package into Resolve and CapCut once per release (the VC16 NLE import check; record the result, including whether provider marks survive the VFR→CFR step, OPERATIONAL-BASELINE §15)** |
| "Own screenplay works too" (E2) | Import mapping is deterministic first; ambiguous items asked; dialogue identical after conversion | Same as above |

### 5.4 Live runs

| Run | What | When | Judge | Bound |
|---|---|---|---|---|
| **L1 live smoke** | §3.4 | Scheduled | Code | Staging smoke Account cap |
| **L2 GP-Mini** (VC15) | The golden workflow on a 3-scene, 6 to 8 shot slice with the shortest clips, lowest resolution and `economy` bias, real image, video and audio Offerings, through to a validated export | Weekly; gates promotion of a release that changed the generation path, the compiler, an adapter or a default chain | Code (the §5.3 automated column, live) plus a recognisability glance by the operator | Staging mini-run Account cap, set per run (spec) |
| **L3 bar run** (VC16) | The actual §3.1 bar by the owner: a rough paragraph to a 2 to 3 minute piece to an NLE import in a day, on production-shaped staging with real providers, **and the same from the owner's own screenplay (E2)** | **Before the first invitation**; before any release that changes default bias or a default-eligible Offering; at least quarterly while in development | **Human**; recorded as an evidence record (date, build digest, durations, spend, defects, what was imported where) | Owner's judgement and the account caps |

This is Constitution §18.8's "real end-to-end runs, not only mocked tests"; L3 is also the evidence that "Aiuteur works".

## 6. Schema drift

The base is PERSISTENCE §10.3 D1 to D9 and ADR 0023. Added here:

| # | Check | Catches |
|---|---|---|
| D10 | Restore the **previous release's GP-S upgrade snapshot**, run the forward migrations, apply every upcaster, then run D3, D8, the Board equality and the golden workflow's read steps | A migration or upcaster that breaks real old data |
| **Compatibility** | Apply the new migrations to the previous schema, then run the **previous image's** staging smoke against it (expand/contract proof; OPERATIONAL-BASELINE §4.2 delivery rules) | A "forward-only" step that breaks the rolling deploy |
| **Contract** | Generated types and parsers equal the schema; vocabulary CHECKs equal `contract` (D3) | A hand-copied union; a drifted enum |
| **Catalogue** | Every profile validates at load (F10); a compile-relevant change produces a new snapshot id and carries evidence (PROVIDERS F11, build rule R23) | An unevidenced capability |

## 7. Quality gates for prompt and model changes

### 7.1 What changes, and what evidence each needs

| Change | Evidence required before merge | Judge |
|---|---|---|
| **Compiler or scaffold wording** (media prompts) | Version bump; golden Rendered-request diff reviewed as text; P-guards; wire parity; **eval run**: the affected eval-set cases generated before and after on the default Offering of the class, shown side by side; an `evidence` reference on the scaffold version entry (build rule R23) | Code for the diff and guards; **human** for the side-by-side |
| **L or M operation instruction** (drafting, rewrite, fact check, partition, mapping) | Guard results over recorded proposals; **live sampling** of the eval cases, k samples each (spec): structural validity rate, first-time pass (repair) rate, HELD rate, and **zero** guard-violating output reaching a commit; for the fact check, **recall and false-positive rate on planted contradictions** against the recorded baseline | Code for rates and invariants; **human** for a blind side-by-side of prose on a few cases |
| **Model swap or a new default** for an operation class | The class's eval cases run on the candidate; live smoke; price entry reviewed; for identity-critical classes (identity image, frame with identity references, video with first frame and audio) an eval sheet reviewed by the owner | **Human** for identity-critical classes; code for the rest |
| **Catalogue change** (profile, Offering, ranking, tier, price) | F11 evidence in the same diff; conformance run and live smoke on the snapshot; golden Fit fixtures rerun and diffs reviewed; a standby `active` Offering exists before a `preview` may become default-eligible (PROVIDERS §10.1) | Code, plus the owner for default-eligibility |
| **Overlay change** (enable, suspend, rank, in production) | The enable action refuses without a `verified` evidence record on the snapshot within its review age (§3.4); suspend is always allowed | Operator |

### 7.2 Eval approach and strictness

| | **A. Model-as-judge gate** | **B. Human review of everything** | **C. Tiered (chosen)** |
|---|---|---|---|
| Handles non-deterministic output | Noisy; the judge drifts | Yes | Yes: sample, then judge only what code cannot |
| Repeatable by an agent | Yes | No | Mostly |
| Risk | A gate that passes by construction (V1's lesson) | Slow; skipped under pressure | A small human step that cannot be automated honestly |
| Verdict | Rejected as a gate; **allowed as advisory triage** that nominates cases for a human | Rejected: not proportionate | **Chosen** |

**Tiering.** (1) Anything code enforces is **zero tolerance**: a guard-violating output must be caught by the guard on every recorded and sampled output, because the guard, not the model, is the protection (ADR 0007). (2) Rates the model controls (repair, HELD, validity, recall, false positives) **must not regress against a baseline recorded for that model snapshot**, with tolerance and k in the spec; a sampled rate is reported with its sample size, never as a bare percentage. (3) What only a person can judge (does it read well, does the character look like themselves) is a **human side-by-side on the fixed eval set**, decided by the owner and recorded; it is never automated into a gate.

**Eval set.** A versioned, synthetic set of tagged cases, each naming the risk it probes (identity with two and three characters, dialogue exactness, continuity from a base frame, composition references, over-length partition, splice boundaries and protected spans, Fact contradictions, location Directions). A defect found in use becomes a case before it is fixed.

**Cost bounds.** Every eval run states its budget in the change and executes under a dedicated **capped eval Account** (and the smoke Account of §3.4); the ordinary `spend.admit` refuses past the cap, so no bespoke limiter exists. The estimate comes from `generation.preview` for the same Rendered requests. Order is cheapest first and stop on the first hard failure. Seeds are requested where the model exposes one, and the result is read as "similar", never "identical" (PACKAGE §13.4).

## 8. Large-project performance budgets

**Verification owns a performance check on GP-L; the numbers belong to the spec.** PERSISTENCE §5.1's working budgets (Board and Outline ≤ 100 ms, impact ≤ 200 ms, small commit ≤ 50 ms at 250 shots) are the proposals it enforces.

| Check | Mechanism | Runs |
|---|---|---|
| **Shape budget** (VC11) | Read the Board, Outline, scene hub, impact and playback manifest on GP-S and on GP-L; assert the **query count is equal** and the **response bytes stay under a budget file value** regardless of shot count. Machine-independent, so it can block a merge without flaking. Catches the N+1 reads that V1's Board suffered | Every merge |
| **Timing budget** (VC12) | The same reads plus `commit`, duplicate, batch admission of N Generations and the stream's per-event cost, on GP-L, against a **budget file** (data in the repository). Absolute values are checked on a reference host of the staging class; relative regression against the last green run is checked on any host | Nightly; **blocks promotion** when exceeded |
| **Client budget** | A browser run on GP-L that scrolls and selects in the Script Hub, shot strip and timeline, asserting a long-task and render-count budget (candidate class: Playwright tracing) | Nightly |

Load and soak testing remain deferred (OPERATIONAL-BASELINE §12). If the Board misses its budget, the pre-agreed fallback is PERSISTENCE §5.1's rebuildable `shot_summary`, not a change here.

## 9. Which checks gate which changes

| # | Check | Defined in |
|---|---|---|
| **VC1** | Static and architecture rules, build rules R1–R26 and RT1–RT6 (static parts) | §4; MODULE §9 |
| **VC2** | Pure goldens (compiler Rendered requests, guards over recorded proposals) | §4 |
| **VC3** | Properties | §4 |
| **VC4** | Seam conformance suites and lifecycle recovery | §§3.3, 4 |
| **VC5** | Operation harness | §4 |
| **VC6** | Contract | §4 |
| **VC7** | Isolation gates G1 to G11 | OPERATIONAL-BASELINE §11 |
| **VC8** | Drift D1 to D10, compatibility, Catalogue validation | §6; PERSISTENCE §10.3 |
| **VC9** | Golden workflow E1 and E2 (replay) | §5.3 |
| **VC10** | Fake and environment guards (every line of §3.2) | §3.2 |
| **VC11** | Shape budget | §8 |
| **VC12** | Timing and client budgets | §8 |
| **VC13** | Conformance probes, live smoke, LLM live smoke | §3.4 |
| **VC14** | Eval run (human-judged where marked) | §7 |
| **VC15** | GP-Mini live run | §5.4 |
| **VC16** | Bar run, with the per-release human NLE import (§5.3 step 7) | §5.4 |
| **VC17** | Mutation | §4 |

| Change or stage | Required (blocks) | Evidence attached | Judge |
|---|---|---|---|
| **Every push** | VC1, VC2, VC3, VC6, VC10; a short golden path of VC9 | none | Code |
| **Merge to `main`** (the required pipeline of OPERATIONAL-BASELINE §4.2) | Everything above, plus VC4, VC5, VC7, VC8, VC9 (E1 and E2), VC11. A skipped required check fails | none | Code |
| **Promotion to staging** | The merged digest; migrations under `owner`; previous-image smoke on the new schema (compatibility, §6); the fake-provider smoke of the baseline | none | Code |
| **Promotion to production** (manual approval, same digest) | Green staging; **VC12** within its window; **VC13** green within its window for every Offering in a default chain, rerun first if the adapter, a profile or the generation path changed; **VC15** if the generation path, compiler, an adapter or a default chain changed; the first promotion also needs **VC16** and the restore test (OPERATIONAL-BASELINE §9) | The evidence records | Code, then the operator's approval |
| **Prompt or scaffold change** | Merge set, plus **VC14** and a version bump with an `evidence` reference | Eval report and diff | Code and, where §7.1 says, the owner |
| **Catalogue or model change** | Merge set, plus **VC13** on the new snapshot, **VC14** for default-eligibility or a default swap, F10 and F11 | Evidence records in the same diff | Code and the owner |
| **Migration** | Merge set, plus D10 and the compatibility check | Upgrade snapshot for the new version added | Code |
| **Overlay change in production** | The evidence-record refusal (§7.1) | Existing evidence | Operator |
| **Scheduled** | VC13 nightly and weekly, VC12 and VC17 nightly, VC15 weekly, VC16 quarterly | Posted to the operator's alert channel; failures alert | Code; human for VC16 |

A real-provider check never blocks a merge (cost and flake, OPERATIONAL-BASELINE §4.2); it blocks **promotion and enablement**.

## 10. Legacy prompt salvage

**Decision: V1 prompts are not imported as fixtures or as prompt text.** They were database templates, stage-bound, duplicated and contradictory (the inventory's own scope notes; legacy 09), and prompt text in V2 exists only as Layer parts in `compiler` (build rule R8). What qualifies is narrower and recorded here as the rule the spec applies:

1. A V1 item becomes a fixture only as an **input** or a **failing case** (a screenplay, a shot-split request, a description-merge pair, a continuity-recomposition scenario) that proves a guard or Fit property, and never as an expected **output**: V1 output quality is not truth.
2. It carries its source id (inventory section, legacy section or FACT id).
3. It is cleaned of real names and any creator content; it is synthetic or public.
4. V1 **wording** may be consulted as a design reference when the spec writes V2 scaffold and operation instructions; any wording adopted enters as versioned scaffold under the prompt gate (§7.1), with no exemption for its origin.

Candidate categories for the spec to select from: the lossy screenplay round-trip case (legacy 06 §7.5: `JOHN (V.O.)`, a parenthetical and two dialogue lines) for dialogue-exactly-once; shot extraction, split and merge examples (inventory §§17 to 19) for partition and handle checks; asset description merge (inventory §16) for merge cases; the continuity recomposition scenario (inventory §26) for continuity Fit. The spec chooses the exact cases.

## 11. Rules the build enforces (extend R1 to R18)

| # | Rule | Enforced by |
|---|---|---|
| R19 | Test doubles live in `testing/`; only composition roots of local, ci and staging, and tests, import it; a provider fake extends `FakeTransport` and carries `kind: fake` | Import-boundary check; the `RealAdapter`/`FakeAdapter` brand |
| R20 | Doubles enter only through ports; module-mocking APIs are banned on repository modules | Lint |
| R21 | A test imports the unit under test through its public entry only; two implementations are compared only in a conformance suite | Import-boundary check on test files |
| R22 | The trace fields (§2.1) are part of the Generation and run-history shapes and are propagated to the provider where accepted | Type; `ProviderTransport` conformance (VC4); operation harness (VC5) |
| R23 | A scaffold wording change and a profile change carry an `evidence` reference | Lint over the scaffold version data and the Catalogue (F11) |
| R24 | `environment` is read only in composition roots and injected; the send gate takes it as a value | Lint; VC10 |

## 12. Deployment and operational consequences

- **Environments.** CI runs replay only. **Staging** hosts the live checks, the smoke and eval Accounts with their caps, and keys with provider-side limits (OPERATIONAL-BASELINE §4.1). **Production** runs no verification traffic except the nightly derived fake check and the read-only status endpoint.
- **Operator duties added:** read the weekly smoke result, own the eval budget caps, run the quarterly bar run, and record evidence on a Catalogue change.
- **Cost.** Probes cost near zero; weekly smoke and GP-Mini are capped per run; the bar run is a deliberate, owner-run spend. Amounts are set in the spec against current price entries, not here.
- **Recovery.** The restore test already restores GP-style data into a fresh Postgres; the golden workflow's read steps and D8 run on the restored database as its "open a project" evidence (OPERATIONAL-BASELINE §9).
- **Debugging.** §2.3 and §2.8: tier A for production, scenario scripts for lifecycle bugs, the creator's own inspector for content.

## 13. Not decided here

Test framework and runner, browser driver, mutation tool, how GP-S's commands are stored, eval report format, sampling counts and tolerances, budget numbers, smoke and bar-run budgets, the window values, the "copy details" action's shape, and the exact legacy cases. **Candidate tool classes only:** a typed test runner with property testing, a browser automation driver with tracing, a mutation tester, and an OpenTelemetry-class exporter (deferred).

**Revisit if:** the creator wants an automated recognisability gate and a judge proves reliable on the eval set (then it may *nominate* more cases first); content-free spans are needed for latency diagnosis (add the `Telemetry` port, tier A only); the weekly live checks cost more than the defects they catch (reduce cadence, never remove the pre-promotion check); or a provider offers a sandbox that bills nothing (use it as a probe target).

## 14. Hand-offs

| Ticket | Receives |
|---|---|
| **Build sequence** (#77, resolved in [`BUILD-SEQUENCE.md`](BUILD-SEQUENCE.md), which adopts this order as tracer work) | Stand up first, in this order: (1) the `testing/` package with a **contract-verified fake transport** (watermarked output, scripted behaviours, wire capture) and the `ProviderTransport` conformance suite; (2) the Store and Scheduler conformance suites and virtual time; (3) **GP-S as a replayed command sequence**, starting with the slice the tracer bullet touches; (4) the **operation harness** over the first operation; (5) the trace fields and build rule R22 from the first Generation; (6) VC1, VC2, VC6, VC10 in the first pipeline; (7) the golden workflow E1 skeleton, extended per phase; (8) the staging smoke Account and first live smoke when the first real adapter lands. GP-L and VC11/VC12 arrive with the Board; the bar run is the exit test before the first invitation |
| **Contract freeze** (#78) | Freeze the trace fields of the Generation and run history, `FakeTransport` and the conformance-suite interface, the `testProvider` read-model flag, the evidence-record shape, the scenario-script shape and the `Environment` type; checks VC1 to VC17 as the swarm's definition of done; the golden-project commands as shared fixtures |
| **Final audit** (#79) | R19 to R24, the eight lines of §3.2, the three tiers of §2.3 and that no doc names a tracing vendor or a mock as a default; the gate matrix of §9 |
| **Persistence** (#72) | D10; the operator-view set gains content-free Generation outcome rows; Record data keeps tier B for the life of the project |
| **Operational baseline** (#75) | isolation gates G8 and G11 extended; the verification status endpoint beside `/healthz/deep`; the pipeline's promotion stage reads evidence records |
| **Providers** (#66) | The conformance suite as the adapter contract's proof; evidence records for `verified`; the send-gate amendment of F3; the fake parameterised by a profile |
| **AI map** (#64) | The eval set and baseline for AI-map G6 recall; recorded proposals as the model fake |
| **Voice and performance** (#69) | Audio fakes follow the same `FakeTransport` and conformance suite; a Performance line must be byte-identical in the audio request (Package P3) |

## 15. Constitution check

No requirement was found unworkable or contradictory; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** §3.1 and §18.8: the bar is exercised as a real run (L3) and as a scripted workflow (VC9), with human judgement where only a person can judge. §16 principle 10: the trace is the record the creator already inspects. §17.5: the mock-default failure is closed by eight independent lines, not by prose. §18.4: content stays under the creator's Scope in logs, errors, operator views and alerts. Principle 12: the trace is rows we already write; no tracing vendor or second store was added. Principle 7: every live check runs under ordinary spend caps.
