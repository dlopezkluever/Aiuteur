# Aiuteur V2: Providers, Models and the Capability Contract

Resolution of Wayfinder ticket #66. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). Generation, Job and Slot semantics come from the [domain model](DOMAIN-MODEL.md) and [ADR 0001](../adr/0001-revisions-attempts-generations-jobs.md). What the compiler asks of a profile is [`GENERATION-PACKAGE.md`](GENERATION-PACKAGE.md) §10.4; the run lifecycle and the adapter declarations it consumes are [`JOB-LIFECYCLE.md`](JOB-LIFECYCLE.md) §§5, 9; the price registry, the credential seam and the spend rule are [`BUSINESS-AND-OPERATIONS.md`](BUSINESS-AND-OPERATIONS.md) §§3, 4, 7; the provider-side half of long shots is the realization plan of [`SHOT-MODEL.md`](SHOT-MODEL.md) §7. The trade-off decided here is [ADR 0015](../adr/0015-models-are-reviewed-catalogue-data-behind-a-fail-closed-capability-contract.md). No schemas, endpoints, vendor SDKs or code are chosen. **Provider facts below are dated examples** (research #5, #6, #7, #9 of 2026-10-18; refreshed on 2026-10-21 where marked). No rule depends on any one of them staying true; that is the point of the design.

## 0. The decision in one page

A **Model** is what the creator and the product talk about ("a video model"). It is reached through one or more **Offerings**: this model, on this provider surface, through this **adapter**, under this **capability profile**. The set of all Offerings is the **Catalogue**: reviewed, versioned, validated data. Everything the product needs to know about what a model can do is a field in a profile, with its evidence. Nothing else in the system knows a vendor, a model id or a limit.

```diagram
 Creator action ──► Operation class ──► SELECT ──► Effective model + Offering (recorded, shown)
 (button, batch)    (video.take, …)    │ shot override > project choice > Automatic (policy)
                                       │ hard filter: status, credential, unmet-blocking needs
                                       ▼
   owned truth ──► COMPILE (#65) ◄── Capability profile snapshot (immutable, content-addressed)
                    │ Fit uses the profile: modes, constraints, limits, normalisation, plan
                    ▼
              Rendered request ──► RECORD ──► DISPATCH ──► Adapter ──► provider surface
                                                            │ serialise · submit · poll · cancel
                                                            │ fetch · map errors · declare prices
                                                            ▼
                                       Provider events (status, billed, output refs, echo)
                                       ──► Job lifecycle (#67) ──► media persisted ──► Attempt
```

Five rules carry the design:

1. **Capabilities are data with evidence; unknown means unsupported.** A capability the profile does not declare, or declares without evidence, does not exist as far as dispatch is concerned (§4.3, §9).
2. **Unmet needs are computed before spend and shown, never swallowed.** The shot's needs are checked against the profile by a pure function; each need ends met, met by a declared fallback, unmet-and-reported, or unmet-and-blocking. A blocking need has exits and no "send anyway" (§6).
3. **Adapters transport; they do not decide.** An adapter serialises the one recorded Rendered request, talks to the provider, and reports what happened in a closed vocabulary. It never picks a model, builds text, retries, holds a key, or writes a record (§7).
4. **Selection happens before the action, is visible, and is recorded; substitution after dispatch does not exist.** The default is a policy over the Catalogue, evaluated per shot. A failed model is never replaced by another one behind the creator's back (§8, §9).
5. **Models come and go; history stays.** Offerings have a lifecycle. A retired Offering stops being selectable; every Generation keeps the immutable profile snapshot it used (§10).

## 1. V1 failures and the rule that answers each

| V1 failure (legacy 09 §1.1; 12; 15 §4; FACT-0139) | Rule here |
|---|---|
| Model ids written in about ten files; a new model meant a code change in each | Model ids exist only in the Catalogue and in adapters' private wire encodings (§3, invariant 9). |
| A mock provider silently became the default when a key was missing | There is no implicit fallback. A fake Offering carries `kind: fake`, cannot be loaded in a production deployment, and can never be a default (§9 F2). |
| Capabilities assumed from one model (fixed 8 s, 4/6/8 clamp, one aspect) | Duration sets, aspect sets, reference caps and mode compatibility are profile fields; the realization plan and Fit compute from them (§4, §5, §11). |
| Aspect ratio stored but never sent; durations clamped upward but summed unclamped for cost | Normalisation returns the value sent and its relation to the request; Fit and the estimate read that result (§5). |
| Every provider error retried, including permanent refusals | The adapter owns a closed error mapping; retry eligibility is a property of the class (§7.3, JOB-LIFECYCLE §5). |
| Retired or renamed models failed at first use, as generic errors | Retirement is a lifecycle state, detected by status, by error mapping and by watch, and told to the creator as a platform problem (§10). |
| Prices, credits and dollars mixed in six places | One price registry; the profile only names the billed-quantity rule (§4.1, BUSINESS §4). |

## 2. Designs compared

The ticket asks for the adapter boundary and the capability contract. Four designs were judged against the invariants that matter: *no product concept names a vendor (§15.1, §17.2); unknown capability fails closed; a model can be added, repriced or retired without touching product logic; what was sent can be proved; the default plus optional override stays true when the market churns.*

| | **A. Adapter-resident**: each adapter class knows its models' limits in code and exposes a few feature flags (V1's shape, tidied) | **B. Catalogue of profiles plus thin adapters (chosen)** | **C. One aggregator as the abstraction**: route everything through a single multi-vendor API and use its schemas | **D. Runtime discovery**: probe the provider for its capabilities |
|---|---|---|---|---|
| Vendor knowledge location | Spread across adapter code; Fit and plan must ask adapters | Profiles are data; adapters only transport and map errors | The aggregator's schema leaks into the product; its limits become ours | Whatever the provider volunteers |
| Fail-closed for unknown | Defaults live in code; "unknown" is easy to forget | `unknown` is a first-class value with conservative semantics (§4.3) | Inherits the aggregator's gaps | Providers rarely expose limits machine-readably (research #9); absence of a field is not absence of a limit |
| New or retired model | Code change and release | A reviewed data change; status flips without release (§10) | Depends on the aggregator's catalogue and timing | Fast but unreviewed: the unreviewed claim is what the product then promises |
| Testability without a network | Needs the adapter to answer questions | Pure functions over profiles; golden fixtures (§16) | Needs the aggregator | Needs the provider |
| Provider independence (§15.1) | Holds | Holds; an aggregator is simply one more adapter and several Offerings | **Fails**: one vendor becomes the product's dependency | Holds |
| Compile and Fit | Compiler calls vendor-aware code, against #65's "no per-vendor rule in the compiler" | Compiler reads one profile type | Same as A | Unstable inputs make the compile non-deterministic |
| Cost of an error | A wrong flag is invisible | A wrong field is a reviewed, versioned, evidenced diff | Same as A | A wrong probe is a silent promise |

**B is chosen.** A fails #65's rule that the compiler holds no per-vendor knowledge. C is rejected as the *abstraction* (not as a *route*): aggregators and vendor-direct surfaces are both just Offerings, and the platform ranking (§8.3) can prefer either. D's good part survives as a *drift check*, not as a source of truth: where a provider publishes a machine-readable schema (fal publishes per-endpoint schemas, research #9), a scheduled comparison against the profile alerts the operator; it never edits the profile.

## 3. Vocabulary and objects

| Term | Meaning |
|---|---|
| **Operation class** | A closed, vendor-free set naming what is being asked of a model: `video.take`, `image.frame`, `image.entity` (entity and Look images, Views, style references), `text.create` (creative drafting and rewriting), `text.check` (fact check, classification, extraction, partition proposals), `audio.speech`, `audio.transform`, `audio.lipsync`, `audio.voice` (create or release a provider voice handle), `audio.transcribe`, `audio.music-sfx`, and `world.generate` (CineBlock's world model: generates a navigable world from a scene's inputs, Ratification Record 2 D61.4). `audio.music-sfx` is LATER; the others are resolved in VOICE-AND-PERFORMANCE §5. The AI responsibility map's operations each name one class and the capabilities they need (AI map §3), never a vendor. |
| **Model** | A product-level identity such as "Model X Fast". Has a family (text, image, video, audio), an editorial name and tier, and 1..* Offerings. It is what overrides and defaults store. A Model is not a vendor endpoint. |
| **Offering** | One Model on one **provider surface** (vendor-direct API, enterprise platform variant, or aggregator), with its adapter, its endpoint identity (opaque to the product), credential kind, price entries, lifecycle status and **capability profile**. The same Model on two surfaces is two Offerings, because limits, rewrites, prices and retirement dates differ by surface (on 2026-10-21 Google retired the Veo 3.1 preview endpoints of the Gemini API, shutdown 2026-10-22, while directing users to GA models on its enterprise platform). |
| **Capability profile** | The declared, evidenced description of an Offering (§4). Immutable per **snapshot**; a snapshot id is the content hash. |
| **Catalogue** | All Offerings, their snapshots, the operator's curated ranking and tiers, and the operational overlay (status, enablement). Reviewed data: changes are diffs with evidence. |
| **Adapter** | Per provider surface: dialect(s), wire serialiser, transport, error mapper and declarations (§7). |
| **Need** | One requirement the Shot (or any operation) places on the model, derived by code from owned truth (§6.1). |
| **Effective model** | What selection resolved for an action: Model, Offering, snapshot, source (shot override, project choice, Automatic) and reason codes. Recorded on the Generation. |

## 4. The capability contract (the profile)

### 4.1 Content

Every field has a value, an evidence record and, where it matters to Fit, a conservative meaning when `unknown`. Section names are the contract; encodings are the spec's.

| Section | Declares | Consumed by |
|---|---|---|
| **Identity and lifecycle** | Model id, family, Offering id, adapter id, tier, status (§10), announced shutdown date, successor model, provider's own stability label (stable, preview), `kind` (real, fake) | Selection, §10 |
| **Operations** | Which operation kinds this Offering performs: generate, edit, reference-edit, extend, continue-from-clip, transform, speech, and so on | Selection, Fit |
| **Input modes** | A list of named modes. Each states the **roles it accepts** with counts (first frame, last frame, pinned keyframes with positions and maxima, reference images by typed role if the API types them, reference video, reference audio, driving audio, base clip for extension) and the **constraints between inputs** (§4.2). Includes "soft" figures: *works best up to N* | Package §6.2 input-mode choice, Fit |
| **Reference constraints** | Per reference: aspect-ratio range, size and format limits, face or people policy, minimum and maximum resolution | Fit (demote, omit with report), Package §6.2 |
| **Reference binding** | How references are bound to prose: positional labels, typed slots, role-capped groups, none | Dialect (Package §6.4) |
| **Duration** | Set, or range with step; minimum; maximum per call; whether `auto` exists; billed-duration rule (requested, generated, or the set member rounded up) | Normalisation, plan, estimate |
| **Extension** | Same-model only or not; fixed or ranged increment; maximum total; accepted input (resolution, aspect, origin, maximum length); whether output is the **combined** clip or the increment only; how it is billed | Plan (§11) |
| **Output** | Aspect ratios (set, or `follows input`), resolutions, frame rate (fixed or set), container and codec expectations, fixed or free | Normalisation, ingest expectations (#70) |
| **Audio** | `none`, `optional` or `always`; whether dialogue is generated from prompt text; lip-sync documented; languages; whether driving audio is accepted (role `audio.line`, length rule, `lip-sync subjects`); voice references accepted; for the `audio.*` classes: voice sources, transform and lip-sync limits, timing outputs, voice-data rules, `voice source requirements` and mandatory `delete voice` for cloning. Full field list: [`VOICE-AND-PERFORMANCE.md`](VOICE-AND-PERFORMANCE.md) §5 (#69) | Package §14, Normalisation, the authorisation gate (F3) |
| **Controls** | Seed (and its guarantee: none, best-effort), negative prompt (and limit), declared **tunables** (those an Override `param` may set), prompt rewrites (`controllable` or `always`) and whether the provider echoes the effective prompt | Package §10.3, Fit |
| **Limits** | Prompt limit: unit, counter, safety margin; per-request total size; people and content policy notes | Package §7.3 |
| **Cost** | Price-entry references and the **billed-quantity rule** (the quantity the provider will actually bill, as a function of the Rendered request); whether per-run actual cost is reported | BUSINESS §4 |
| **Run behaviour** | The JOB-LIFECYCLE §9 declarations: idempotent submission, completion signal and poll minimum, cancellation, output retention and URL lifetime, billing on failure and on cancel | Job lifecycle |
| **Known limitations** | Closed codes with one plain sentence each (§12), attached to the Offering and surfaced when they bite | Fit report, inspector |
| **Evidence** | Per field or group: `documented` (source, fetch date), `verified` (conformance run, date) or `assumed` (conservative, reviewer, reason) | Review, selection eligibility, §9 |

### 4.2 Constraints between inputs are declarative

Provider rules are conditional: Veo's reference images require 8 s; Luma's 10 s clips exclude start and end frames; Wan 3.0 treats frame inputs and reference inputs as mutually exclusive (documented 2026-10-21); some models restrict extension to 720p. A mode therefore carries **constraints** as data in one small predicate form over typed request fields:

- `requires(field-or-role, condition)` and `excludes(role-set)`;
- `when(condition) → effect`, where conditions are equality, set membership or range over duration, resolution, aspect and role counts, and effects are `requires`, `excludes`, `caps(role, n)` or `forces(parameter, value)`.

There is no vendor code path: the same evaluator checks every profile (invariant 3). Because the evaluator is a pure function, Fit, the realization plan, preview, estimate and selection all ask it the same question and cannot disagree.

### 4.3 Unknown, evidence and the conservative reading

Each field is one of `declared(value)`, `declared-none`, or `unknown`. `unknown` means **the conservative reading**: a capability is absent; a maximum is the smallest value any evidence supports, or absent; a minimum is the largest; a rewrite is assumed `always`; billing on failure is *maybe*; cancel is none; retention is the shortest. An Offering with an `unknown` in any **identity-critical** field (the prompt limit and counter, duration, aspect, billed-quantity rule, and the people policy where references include people) is **not default-eligible** (§8.3); it can still be offered as an explicit override with a visible "limits not fully documented" note, and Fit applies the conservative reading. Evidence ages: a `documented` field past the operator's review age, or on a `preview` Offering, raises a review alert (§10.4); it does not change behaviour by itself.

## 5. Parameter normalisation

The product speaks in **neutral typed parameters with units**: duration in seconds, aspect as a ratio from a closed product set, resolution as a short-side height class on an ordered ladder, native audio as `wanted`, `off` or `indifferent`, seed, an avoid list, and declared tunables. **Normalisation** is one pure function `normalise(parameter, profile)` that returns the value to send and its **relation** to what was asked. The relation is recorded in the Fit report (extending #65 §7.1 outcomes `param-honored`, `param-in-text`, `param-unsupported` with one more, `param-adjusted`) and is read by the estimate and the inspector, so none of them can invent a second answer.

| Parameter | Rule | Relation and what the creator sees |
|---|---|---|
| **Duration** | Within a supported set: use the smallest member **at or above** the target (never below: a shorter clip would drop action). Above the per-call maximum: the realization plan (§11). Below the minimum: send the minimum. | `param-adjusted` with requested and sent values. The estimate bills the **sent** value (BUSINESS §4.2). The delivered duration is recorded on the Segment and never trimmed; "8 s billed for 7 s" is one quiet sentence. |
| **Aspect ratio** | Exact member, or `follows input` when a first frame is carried and the profile says output follows input (then verified at ingest). No nearest-match, no crop, no pad. | If the project's ratio is not supported: `unmet-blocking` for *this model* (§6): it is excluded from Automatic and, if chosen explicitly, blocked with exits. Aspect is a project-wide property and a letterboxed clip would silently damage the edit. |
| **Resolution** | Highest supported class at or below the project's target, subject to input-mode constraints (for example "1080p not supported in reference mode"). | Lower than target: `param-adjusted`, soft; quiet "made at 720p". Upscaling is not applied by default (LATER). |
| **Native audio** | `wanted` → use `optional`/`always` as declared. `off` → `optional` honoured; `always` is **not** honoured. | `always` with `off` requested (for example a supplied Performance follows, #69): the provider's audio is produced and discarded by deterministic ingest; recorded as the limitation `audio-cannot-be-disabled`; the price is unchanged. |
| **Seed** | Sent where the profile declares seed; recorded either way, with the effective seed if echoed. | Never promised to reproduce (Package §13.4). Unsupported: `param-unsupported`, not shown unless asked. |
| **Avoid list** | Negative-prompt parameter if declared (within its limit), else prose. | `param-honored` or `param-in-text` (not guaranteed, said so). |
| **Tunables** | Only what the profile declares tunable; clamped to the declared range only by *rejecting* the Override item with a message, never silently clamped. | Override edit is refused with the declared range. |
| **Output format** | The adapter returns whatever the provider emits. Ingest probes and freezes per Take (#70); variable frame rate is converted to constant at export build where the exporter requires it, the only default transcoding; originals are untouched. | A mismatch with the profile's output declaration is recorded and flagged to the operator, and does not fail the Job. |

Normalisation is monotone (a larger target never yields a smaller sent value), idempotent, and total: every input yields either a sent value with a relation, or `unsupported`.

## 6. Unmet needs and unsupported combinations

### 6.1 Needs

Resolve (Package §3) derives a **need set** with code, from the Shot and its owned truth: target duration, aspect and resolution targets, frame roles required (first, last, keyframe at t) and whether each is approved or planned, count and kind of identity subjects and their reference images, composition references, continuity source, dialogue present and its audio source (native, or a chosen Line audio), extension-source need for a Segment k > 1, prompt size at Tier 0, and the language of dialogue. A need carries a **strength**:

- **Hard**: the operation is not the operation without it (a Frame edit needs `edit.base`; a Segment k > 1 needs a way to continue; the project's aspect; Tier 0 text fitting; every dialogue line whole).
- **Soft**: the product has a declared degradation for it (identity image → text; a middle frame → a reference → text; style image → style text; resolution lower; audio on/off).

### 6.2 Verdicts and the resolution of combinations

For a profile and a need set, a pure function chooses the input mode (Package §6.2), the realization plan (§11), and gives each need one verdict (a reuse of the Fit outcome vocabulary, plus two):

| Verdict | Meaning | Effect |
|---|---|---|
| `met` | The profile provides it as asked. | None. |
| `met-by-fallback` | Provided through a declared degradation (`carried-as-reference`, `carried-by`, `demoted`, `param-adjusted`, `param-in-text`). | Reported quietly; proceeds. |
| `limited` | Provided, with a **known limitation** that matters here (§12): audio continuity of a stitched shot, dialogue lip-sync undocumented for this model, positional labels, seed not reproducible. | Reported quietly with the limitation sentence; proceeds. |
| `unmet-soft` | Cannot be provided and has no degradation (a requested but unsupported tunable; a ranked reference beyond capacity). | Omitted with a Fit entry and reason; proceeds. |
| `unmet-blocking` | A hard need cannot be provided. | The Generation is **not created**. The control reads as unavailable with the reason and exits (§6.4). |

An **unsupported combination** is not a special case; it is a need pair that no mode satisfies. For "first frame plus identity references" on an exclusive-mode model, Package §6.2 rule 2 already applies: the pinned-frame mode wins and the identity references are `carried-by` the frame, not claimed. For a combination where the hard need is itself excluded (a Frame role the mode forbids together with a role that must also be pinned), the verdict is `unmet-blocking` for that model and the *selection* step (§8) skips the model in Automatic. **Nothing is ever silently dropped: a need is either in the request, visibly demoted, visibly omitted, or the request is not made.**

### 6.3 Where unmet needs are shown

The verdicts are the Fit report of a read-only compile (Package §3: preview and estimate write nothing), so one object feeds every surface:

- **On the Generate control**, before any click: price (BUSINESS §3), the effective model, and **one quiet line** only if any verdict is not `met` ("Made at 720p; the middle frame is used as a reference"). Never a banner, never a modal (Record 1 M1).
- **In the inspector**: every verdict with its reason, the carried references, the limitations in plain sentences, the digest.
- **For `unmet-blocking`**: the control is replaced by the reason in one sentence and the exits of §6.4.
- **For a batch**: a count of shots with notes, expandable; blocked shots are listed and **excluded from the approved sum**; the rest proceed only under the batch's normal confirmation. Partial results are a first-class outcome (JOB-LIFECYCLE §8).
- **After the fact**: the verdicts are on the Generation record, so a Take made `at 720p` or `middle frame as reference` can say so on demand in review.

### 6.4 Exits for a blocked need

Always computed, never invented: (1) **models that satisfy the need set** (selection run without the override), each with price and its own notes; (2) the **edit that would remove the need** when one exists (turn off an optional layer, shorten the shot, remove a reference, choose another aspect for the project); (3) for a long shot with no way to continue, the creator's own option to split the shot in the plan (never offered as automatic). "Send anyway" is not offered when the request cannot be made as described, for the reason given in Package §7.3: Aiuteur could not then say what was received.

## 7. The adapter boundary

### 7.1 What an adapter is

One adapter per provider surface. It has four parts, and only the last two touch the network:

1. **Declarations**: the profile's *Run behaviour*, *Cost* (billed-quantity function and price-entry source kinds) and credential kind. Static data.
2. **Dialect(s)**: data plus one pure function from a fitted Package to a Rendered request (Package §10). Content-affecting translation lives here, so it is testable without a network.
3. **Wire serialiser**: Rendered request → provider body, and provider response → neutral events. Adds no content (guard Package P1, proven by wire capture).
4. **Transport**: authenticated calls using the credential it is handed.

### 7.2 The operations

| Operation | Input | Output |
|---|---|---|
| `submit` | Rendered request (by stored digest), credential handle, idempotency key (the Job id; JOB-LIFECYCLE §4) | `accepted(operation reference)`, or `refused(class, billed, provider reason as given)`, or `unconfirmed` |
| `observe` | Operation reference (poll) or a verified inbound callback | Status in the neutral set: `pending`, `running`, `succeeded(output refs, echoed prompt, effective seed, reported cost)`, `failed(class, billed, reason)`; unrecognised → `unknown` |
| `cancel` | Operation reference | `cancelled`, `cannot-cancel`, `unknown`, with the billing consequence declared by the profile |
| `lookup` | Correlation id (optional capability) | Operation reference or `not-found` |
| `fetch` | Output ref | Byte stream, with the authentication and expiry the profile declares |
| `billed-quantity` | Rendered request | `{unit, amount, bounds}`: what the provider will bill (BUSINESS §4.2) |
| `wire-capture` (test hook) | Rendered request | The body that would be sent, for Package P1 |

### 7.3 What an adapter owns and may not do

**Owns:** the error mapping into the JOB-LIFECYCLE §5 classes and its `billed` declaration (unknown error → *Unknown, maybe billed*, never retry); verification of inbound callbacks; the neutral status vocabulary; the provider-correlation field.

**May not:** read a global key or environment (it receives a credential resolved by (Account, provider surface), BUSINESS §7); choose or change a model or an Offering; add, cut or reword content; decide a retry, a fallback or a deadline (the Job lifecycle does); read or write any creative record, Generation or spend table; hold state between calls (the Job store holds operation references; JOB-LIFECYCLE §7); log a credential, a request body containing private creative text outside the Generation record, or an unredacted provider error containing either.

### 7.4 Output handling

The adapter hands back **references**, not bytes into creative storage. The Generation module's fetch step downloads, verifies (probe of container, duration, frame rate, audio layout; zero-length and wrong-type files are failures, never success) and persists to Aiuteur's own storage; only then does the Job succeed (JOB-LIFECYCLE §10). A provider "success" with no usable output is `failed`, class *Unknown*.

### 7.5 One synchronous shape and one asynchronous shape, one interface

Synchronous providers (inline-returning image or text calls) implement the same operations with `submit` returning a terminal status. The Job lifecycle treats it as an operation that completes at once; no second code path exists above the adapter.

## 8. Selection

### 8.1 Three layers, one resolution

For each action, **selection** resolves an **effective model** for each Generation it will create. The order is fixed:

1. **Shot override** (a shot-owned slice, addressed by target: the Shot's video, or one Frame role; Package §8.2 shape). Stores a **Model**, never an Offering.
2. **Project choice** (a Project setting, per creator-facing operation family: video, image, writing). Either a specific Model or **Automatic with a bias** (`quality`, `balanced`, `economy`).
3. **Automatic** under the operator's default policy (§8.3), the policy bias default for the class.

Creator-facing families are video, image (frames and entity images), writing (`text.create`) and, with #69, audio. `text.check` and other utility classes are operator policy: the creator cannot choose them, and the model used is recorded on every call (the call log, Package §11).

### 8.2 Resolution of a chosen Model to an Offering

A Model may have several Offerings. The Offering is not a creator choice. Order: (1) Offerings whose surface the Account has a usable credential for: the Account's own key where BYOK is configured for that surface (BUSINESS §7), otherwise operator keys; (2) status `active`, then `deprecated` before its date, then `preview` if allowed (§10.1); (3) the operator's route ranking for the Model; (4) price entry known and fresh. `paid by` is recorded.

### 8.3 The default policy (Automatic)

Computed per action and per shot, in code, from the Catalogue, so a long shot that only some models can realise is not given a default that cannot:

1. **Eligible set**: Offerings of the class with status that allows dispatch, a credential for the Account, not suspended, and not blocked by an `unknown` identity-critical field (§4.3).
2. **Hard filter**: drop Models for which the shot's need set has any `unmet-blocking` (aspect unsupported, a continuation need with no continuation path, Tier 0 text over the limit).
3. **Order** by the bias:
   - `quality`: the operator's curated **quality rank** within the class, best first.
   - `balanced`: the best-ranked Model whose **reference-request price** is within the class's balanced budget. For `video.take` the budget is the one-click line of the spend rule (BUSINESS §3, currently $2.00 on the upper-bound estimate), so that the default take is one click; the reference request is a typical take whose duration and resolution the catalogue sets per class.
   - `economy`: the cheapest Model at or above the class's **quality floor** (a curated rank cut-off), best-ranked among equals.
4. **Tie-breaks**: fewer non-`met` verdicts for this shot, then lower estimated price, then stable Model id.
5. **Rank and price are data.** Quality rank is **editorial** (operator-curated with evidence notes and a review date), because no automatic measure of "better film" exists and the product must not pretend to one. Price comes from the registry; a Model without a usable price entry is not eligible under `balanced` or `economy`.
6. **Result**: the effective model and **reason codes** (`default-by-policy`, `skipped:<model>:<reason>`) are recorded on the Generation and shown on demand as a quiet line ("Automatic · chose X for this 22 s shot because Y cannot continue a clip").

**Default bias values** (operator configuration, tunable without architecture): `video.take` **balanced**; `image.frame` and `image.entity` **quality**; `text.create` **quality**; `text.check` and `audio.transcribe` **economy** (utility classes), `text.check` with a preference for a Model different from the one that drafted (AI-map G6); creator-facing audio classes **quality**; `world.generate` **quality** (an operator default outside Record 2 D66, which does not name the class; the operator's catalogue ranks it; its price still shows on the button and follows the spend rule, about $1.20 per world at the current estimate). Ratified by the creator (Record 2, Record 2 D66): video balanced, images and writing quality, fact-check and utility calls economy, audio quality. These are the policy defaults for the *Automatic* setting only; the creator sees the setting as "Automatic · Best quality / Balanced / Lowest cost" per family and can pick a specific Model.

### 8.4 Overrides: rules

- An override stores the Model id and persists (retire-never-delete). It is shown with its tier and price band, the limitations that apply to this shot, and a deprecation note when applicable.
- **An unavailable override is not an error.** If the overridden Model is retired, suspended or lacks a credential, selection records `override-unavailable:<reason>` and resolves as Automatic **for this action**, visibly (the control states the model it will use and the price, so the click is informed); the stored override stays and a quiet mark appears in the Ledger's to-reconcile list. If the Automatic result cannot meet the shot's needs, the verdicts of §6 say so.
- Changing a default, a project choice or a shot override **never marks any work out of date** (LINEAGE §3.1 "not a reason"; Package §12): model choice is a recorded fact on the Generation, not creative content. The wording of SHOT-MODEL §9 that lists the model override among captured slices means provenance, not drift.
- Batches resolve per shot; the confirm step shows the sum and the mix ("14 shots with Model A, 3 with Model B"). Whether that step fires is BUSINESS §3: the 10+ rule counts Takes, so a multi-Segment shot counts once, while the $2.00 line sums every Segment's cost (Record 2 P3).
- **Choosing a different model after a failure is the creator's act.** The product offers it (exits, §6.4) and shows price differences; it never performs it.

## 9. Fail-closed rules

| # | Rule |
|---|---|
| **F1** | **Unknown is unsupported** (§4.3). Absence of evidence never widens a capability. |
| **F2** | **No implicit fallback and no fake in production.** An Offering with `kind: fake` is loadable only when the deployment is marked as test; the loader refuses a production boot that contains one, or that resolves any default chain to one. (Seven further lines back this one: type, location, send gate, record marking, watermarked bytes, UI mark and detection; [`VERIFICATION-AND-OBSERVABILITY.md`](../architecture/VERIFICATION-AND-OBSERVABILITY.md) §3.2.) If selection finds no eligible Offering for a class, the action is unavailable with the reason; it does not pick something else (V1's mock default). |
| **F3** | **Dispatch gate.** A Generation dispatches only if: the Offering's status allows it; the recorded profile snapshot is a snapshot of that Offering; credentials resolve; Fit is not blocked and no need is `unmet-blocking`; the expected digest matches when the creator acted from an inspector; the estimate is known or confirmed (BUSINESS §3); the injected environment is not `production` unless the Offering's kind is `real` (added by #76); for voice work (`audio.transform`, `audio.speech` with a cloned Voice, `audio.voice`, reference audio of a Voice) every subject has a current Voice authorisation the Offering's requirement accepts (VOICE-AND-PERFORMANCE §2.3, added by #69). The gate is one function, called by the single dispatch path (Package §3 step 6). |
| **F4** | **Unexpected responses fail.** An unrecognised status, an unparseable body or a success without a usable output is `failed`, class *Unknown, maybe billed*, never success and never auto-retry beyond the trivial-spend rule (JOB-LIFECYCLE §5.3). |
| **F5** | **Drift suspends.** Evidence of drift (a conformance probe failing; a rejection mapped to "parameter or model not accepted"; repeated unmapped errors; observed price drift beyond tolerance, BUSINESS §4.3) moves the Offering to `suspended` automatically through the circuit breaker (BUSINESS S7) and alerts the operator. Suspension is reversible by the operator and never deletes anything. A failure that belongs to one Account's own credential (a BYOK key invalid, revoked or out of funds) makes that credential unusable for that Account only; it never suspends the Offering or affects another Account (Record 1 M4). |
| **F6** | **Retirement is detected three ways**: lifecycle data (a shutdown date reached), error mapping (a "model not found", "retired" or "no longer available" response maps to *Platform configuration*, which also suspends the Offering), and the operator's deprecation watch (§10.4). The creator is told it is a platform problem (JOB-LIFECYCLE §5.2), in the wording the paying party warrants. |
| **F7** | **No substitution after dispatch, no silent substitution before.** Selection is visible and recorded (§8); once a Generation exists its Offering and snapshot never change. A retry is a new Job of the **same** Offering; a creator's switch of model is a new Generation. |
| **F8** | **Unhonoured parameters are reported or the request is not made** (guard Package P5). |
| **F9** | **Content-policy refusals are the provider's words** and are never retried or reworded (JOB-LIFECYCLE §5.2). |
| **F10** | **Invalid catalogue data fails at load.** A profile that fails schema or cross-field validation (a default duration outside its own set; an extension without a base duration; evidence missing on an identity-critical field) prevents the Catalogue from loading in that deployment; it does not fail at first use. |
| **F11** | **Every claim traces to evidence.** A profile change that alters any compile-relevant field produces a new snapshot id and requires an evidence record in the same change. |
| **F12** | **Credentials never appear** in a profile, a Generation, a log or an error shown to a creator. |

## 10. Evolution and deprecation

### 10.1 Lifecycle of an Offering

| Status | Meaning | Selectable | Default-eligible |
|---|---|---|---|
| `candidate` | Listed for evaluation or conformance work | No | No |
| `preview` | The provider labels it preview or experimental | Yes, as an explicit choice with a quiet "preview" note | Only when the operator marks it default-eligible with a written reason **and** an `active` standby for the same class exists in the ranking (so retirement is a data change) |
| `active` | Stable | Yes | Yes |
| `deprecated` | Shutdown announced, with a date and successor | Yes until the date | Not for new defaults once an eligible alternative exists; remains for existing explicit choices |
| `suspended` | Operator or breaker has stopped dispatch | No | No |
| `retired` | Gone | No | No |

The 2026-10-18 research listed the Veo 3.1 preview endpoints of the Gemini API as current; on 2026-10-21 Google's deprecations page shows them shutting down on 2026-10-22, with Gemini Omni Flash and the GA models on its enterprise platform named as replacements. Sora 2's API ended 2026-09-24; LTX v1 stops 2026-10-26. The lifecycle exists because this is the normal rate of change, and none of the three needed a product change under this design: each is a status and a ranking edit.

### 10.2 What retirement does and does not do

- **Does**: the Offering stops being selected; a project choice or shot override pointing at its Model resolves as in §8.4 and shows a quiet "ends on <date>" note from the day `deprecated` is set, so the creator can choose before it happens.
- **Does not**: touch any existing Take, Segment, Frame or Generation. Media is Aiuteur's own; the Generation's recorded request and snapshot stay readable and re-runnable *as a new request* only if an eligible Offering exists. "Re-run exactly" on a retired model is therefore unavailable with the reason; "re-run with today's compiler" offers the effective model.
- **Never marks** work out of date (§8.4).

### 10.3 Snapshots are forever

A snapshot is content-addressed and immutable. It is stored as Record data the first time a Generation, preview or estimate uses it, so any Generation's snapshot id resolves after the code and the Catalogue move on (invariant 6). A profile edit makes a new snapshot; the Offering points at the latest. Compile determinism (Package §13.2) is "same ResolvedInputs and snapshot give the same bytes".

### 10.4 Keeping the Catalogue true

The Catalogue is not allowed to rot unobserved, so operations must provide (spec-level; owners in §15):

- a **deprecation watch**: a recurring checklist or automated read of each provider's deprecation and changelog pages, per Offering, with the operator alerted on any announced shutdown (the Gemini API publishes earliest-shutdown dates and per-model replacements; others publish notices on changelog pages);
- **review ages**: evidence older than a configured age, or any `preview` Offering, raises a review alert (BUSINESS S10 category);
- **conformance probes** (#76, defined in [`VERIFICATION-AND-OBSERVABILITY.md`](../architecture/VERIFICATION-AND-OBSERVABILITY.md) §3.4: nightly, with a weekly live smoke whose content-free result is the `verified` evidence record; production enablement of an Offering is refused without one inside its review age): a small, cheap, recurring check per Offering that its wire behaviour still matches its declarations (accepts the declared parameters; rejects an undeclared one in the documented way), where a provider-published schema exists a **schema-diff** against the snapshot;
- **price review**, already in BUSINESS §4.3.

The probes can only suspend (F5) or alert; they never edit a profile.

### 10.5 Adding a model

A new model is: a profile (with evidence), a dialect if its wire differs, an adapter if its surface is new, price entries, a ranking and tier, golden fixtures, and the review evidence of VERIFICATION-AND-OBSERVABILITY §7.1 (conformance run and live smoke on the snapshot; an eval sheet reviewed by the owner before a default swap or default-eligibility for identity-critical classes). **No change** to layers, roles, tiers, the Shot, the realization plan code or the lifecycle. This is the acceptance test for the abstraction (invariant 9).

## 11. Over-length shots: the provider-side half of the Shot model

The Shot model (SHOT-MODEL §7, ADR 0013) decided that a Take is an assembly of Segments and that the **realization plan** is computed from the profile. This is that computation.

### 11.1 Inputs and outputs

`plan(target duration, profile snapshot, shot inputs)` is a pure function returning a **realization plan**: an ordered list of **slots**, each with the **allowed durations** for that call, its **input mode** (`fresh`, `first-frame from previous last still`, `extend previous`), the roles it accepts, and the **delivered duration** the plan yields, or the verdict `unmet-blocking` with the reason. The creative half (SHOT-MODEL §7.2 and AI map): an L call proposes where to cut the action and dialogue *within the slots' allowed durations*, and code verifies it (AI-map G2, AI-map G3, AI-map G9). The plan never creates or changes a Shot.

### 11.2 Algorithm (deterministic, ordered preferences)

1. **Normalise** the target (§5). If a single call satisfies it (a supported duration at or above the target, at or under the per-call maximum), the plan is **one slot**. Below the minimum: the minimum, delivered duration noted.
2. Otherwise enumerate **candidate plans** from the profile: **extension** (a first call, then increments, honouring the extension constraints: same-model, accepted resolution and aspect, increment set, maximum total, input length cap, combined or increment-only output) and **stitch** (calls chained by the previous Segment's last still as `frame.first`, requiring the mode with a pinned first frame, with that mode's own constraints applied to every slot after the first). Keyframe-capable profiles may reduce the call count; they use the same slot form.
3. Reject plans that violate a hard need (aspect, a slot's mode constraints, a person or likeness policy on the chained still).
4. **Choose** by lexicographic order: (a) honours resolution and aspect; (b) fewest non-`met` verdicts; (c) smallest overshoot (delivered − target ≥ 0); (d) extension before stitch, because it better preserves audio and look (SHOT-MODEL §7.4); (e) lowest estimated price; (f) fewest calls.
5. If there is neither extension nor a pinned-first-frame mode, a longer-than-one-call shot **cannot be one continuous clip** on this model: `unmet-blocking` with the exits of §6.4 (other models; shorten; the creator splitting the shot is their own act). Generating independent unlinked clips and joining them is a hidden degrade and is not done.
6. A single dialogue line longer than the largest slot cannot be kept whole: recorded limitation `line-exceeds-single-call` (SHOT-MODEL §7.4).

The plan is recorded on every Segment Generation (SHOT-MODEL §7.2), and the estimate for the Take is the sum of the slots' billed quantities (BUSINESS §4.2), so "about 18 s · 3 parts · $X" is computed from the same plan that runs.

### 11.3 Worked fixtures (illustrative profiles, not current facts)

| Profile (shaped after research A3, 2026-10-18) | Target | Plan | Delivered |
|---|---|---|---|
| **Set {4, 6, 8}, extension +7 s fixed, combined output** (Veo-shaped) | 22 s | 8 + 7 + 7 (3 calls) | 22 s |
| Same | 20 s | 6 + 7 + 7 (3 calls; chosen over 8 + 7 + 7 = 22 for zero overshoot) | 20 s |
| **Range 2–30 s integer** (Wan 3.0-shaped) | 22 s | 1 call | 22 s |
| **Set {5, 10}; 10 s excludes start and end frames; no native extension, a first-frame mode** (Luma-shaped) | 22 s, no pinned first frame | 10 fresh + 5 + 5 + 5, because every continuation call needs a start frame and so cannot be 10 s (4 calls) | 25 s |
| Same, shot with a pinned first frame | 22 s | 5 × 5 (5 calls) | 25 s |
| **Set {4, 6, 8}, no extension, no first-frame mode** | 12 s | `unmet-blocking`: no continuation path | none |

## 12. Recorded capability limitations and their fallbacks

No CORE or IMPORTANT requirement is made impossible by the research. The following limitations are real, carried as `known limitations` codes in the profiles that have them, and each has a designed fallback. None is a Constitution failure.

| # | Limitation (evidence, dated) | Fallback and where it is decided |
|---|---|---|
| L1 | **Frame inputs and reference inputs are mutually exclusive** on some models (Wan 3.0, documented, re-read 2026-10-21); not stated for others (Veo 3.1 references, MiniMax H3, Seedance 2.0, Luma) | Pinned-frame mode wins; identity is `carried-by` the frame (Package §6.2). Selection prefers a model whose modes combine when the shot has both needs (tie-break b). |
| L2 | **Middle frames are pinned by few models** (Luma keyframes, Grok 1.5 mid-video keyframes per excerpt); most pin first and last only | Frame role degrades to a reference, then text (SHOT-MODEL §6.1); verdict `met-by-fallback`. |
| L3 | **Duration sets and minima differ**; billing basis not always documented | Ceil-to-member, delivered duration recorded, estimate on the sent value (§5); unknown billing basis widens the estimate to a range (BUSINESS §4.2). |
| L4 | **Extension is vendor-specific and constrained** (Veo: Veo-made clips, 720p, 16:9 or 9:16, +7 s; Kling: older-model clips; many models: none) | Plan prefers extension where constraints hold, else stitch from the last still; neither available means blocked (§11). Audio continuity across a stitch is not guaranteed (SHOT-MODEL §7.4). |
| L5 | **Native audio**: always on for Veo, optional elsewhere; dialogue generation and lip-sync documented for a few models; no model can be made to speak a given line verbatim | Dialogue goes in the prompt as a Verbatim part, best effort and said so. For guaranteed delivery the IMPORTANT path is a supplied Performance (#69), where the profile's audio fields and `audio-cannot-be-disabled` decide stripping. The creator inspects the take (AI map: no automated media judgement). |
| L6 | **Seeds are not deterministic** (Veo, Wan) | Seed recorded, never a promise (Package §13.4). |
| L7 | **Negative prompts** unsupported on several models | Avoid list in prose, `param-in-text`. |
| L8 | **Provider prompt rewriting** (Wan `prompt_extend`, default on) | Turn off where controllable, else disclose (Package P10). |
| L9 | **People and face policies on input images** (Sora 2 rejected input images with human faces before its shutdown; Seedance 2.x disallowed real-face references in its direct upload; Veo restricts `personGeneration` by mode and region) | Per-reference `face policy` in the profile; Fit demotes or omits the reference with a report; a runtime refusal is the provider's words (F9). Likeness consent for real persons is #69. |
| L10 | **Output retention is short** (1 h Luma/OpenAI URLs, 24 h Wan, 2 days Veo) | Fetch step with deadlines and free re-fetch (JOB-LIFECYCLE §10). |
| L11 | **No documented whole-frame composition adherence** for footage or layout references | Best-effort delivery reported quietly (Package §9.4, SHOT-MODEL §8.4). |
| L12 | **Aspect coverage varies** (9:16 documented for some, not enumerated for others) | Aspect unsupported is `unmet-blocking` for that model (§5); selection skips it; no crop or pad. |
| L13 | **Reference counts and fidelity vary**: totals from 3 to 16, typed or untyped roles, "works best up to N" | Fit capacity (Package §7.2); the soft figure is a profile field. |
| L14 | **Multi-shot-in-one-clip modes** (Kling custom multi-shot) | Recorded as a capability and **not used** to implement a Shot: a Shot is one camera moment (SHOT-MODEL §7.1). |
| L15 | **Actual cost not always reported; units are credits or per-token** | BUSINESS §4: one registry, computed actuals marked as such. |
| L16 | **Preview status and rapid retirement** (Veo 3.1 preview endpoints: shutdown 2026-10-22; Sora 2: 2026-09-24; Imagen 4: 2026-08-17; LTX v1: 2026-10-26) | The lifecycle of §10 and the standby rule for preview defaults. |
| L17 | **Research conflicts on a model's shutdown** (the 2026-10-18 image research recorded `gemini-2.5-flash-image` as both shut down 2026-10-02 and "not deprecated") | Refreshed 2026-10-21: Google's deprecations page lists it with shutdown 2027-03-15 and a successor. The Catalogue records the date and the source fetch, and conflicting evidence is a review item, not a guess. |
| L18 | **Text models**: structured-output modes, context windows and counters differ; the "different checker than drafter" preference needs at least two eligible Models | §13. With one eligible Model, the check still runs and records that it was the same Model. |

## 13. Text and audio families

**Text (L).** The profile adds: structured output mode (`schema-constrained`, `json-mode`, `none`; AI-map G1 validates regardless), context window and counter, image input, tool-free guarantee (V2 gives models no tools, so the profile never needs a tool-use field), and refusal behaviour. Context that does not fit is decomposed by the operation pipeline (AI map §6.1), never truncated (Package §14); the profile's counter and margin decide "fit". Selection uses `text.create` and `text.check` classes. A call is a Generation with a call log entry carrying the effective model.

**Audio (resolved by #69 in [`VOICE-AND-PERFORMANCE.md`](VOICE-AND-PERFORMANCE.md) §5).** Operation classes `audio.speech`, `audio.transform` (voice conversion), `audio.lipsync`, `audio.voice` (create or release a provider voice handle) and `audio.transcribe` (utility, operator policy) use the same adapter operations and the same fail-closed rules; `video.take` gains `driving audio` and voice-reference fields. The profile adds: voice sources (stock, designed, cloned), a closed **voice source requirement** (`attestation`, `speaker-verification`, `own-voice-only`, `allowlist`, `unknown` = cloning unsupported), a **mandatory `delete voice` operation for any cloning Offering** (so revocation can be honoured), languages, per-request length limits (for example 5,000 or 10,000 characters per ElevenLabs model, research #7), timing outputs (`none`, `word`, `character`), lip-sync subjects (`human`, `stylized-humanoid`, `any`, `unknown`) and clip ranges, transform length behaviour, style controls (inline tags, instruction prompts) and voice-data retention. Consent mechanics are provider-specific and unresolved for at least one API (research #7 finding 2, still unresolved 2026-10-25), so the authorisation check is a clause of the dispatch gate F3 in front of `submit`, not a profile detail. Audio-specific recorded limitations are VOICE-AND-PERFORMANCE §8.

**World model (`world.generate`).** A world model is a provider in the Catalogue like any other: it has Offerings, a capability profile, an adapter, price entries and a lifecycle, and the same fail-closed, selection and no-substitution rules apply. Its profile adds the world-specific fields it needs (input kinds it accepts, output form and retention, and bounds on world size or duration), under the same rule that unknown means unsupported. The payer is the operator until BYOK ships (Record 1 M5) and the Offering is BYOK-capable afterwards through the same (Account, provider surface) credential seam (§14). A world generation is creator-initiated only (Record 2 X8); the price is shown on the initiating button; under $2.00 it is one click. Its output is a world: a stage for blocking in the CineBlock tab, never a frame, an image reference or a video input, so it does not enter the Take or realization-plan logic of §11. Captures the creator takes on that stage reach generation only as composition references of an `image.frame` request (Record 2 D61.3; Package §4.3).

## 14. Credentials, payer and price

- Credential resolution is by (Account, provider surface) and is outside the adapter (BUSINESS §7). Selection uses availability of a credential as an eligibility input (§8.2).
- When BYOK ships, a creator's own key makes the Offerings of that surface available to that Account; Models reachable only through a surface the Account lacks are `override-unavailable` with a plain reason; the profile and price registry are unchanged (BUSINESS §7 "Price registry").
- The adapter **declares** price kind and billed-quantity; the registry holds the numbers (BUSINESS §4.1). The profile never holds a price.
- A failure wording difference by payer (BUSINESS §7) is a mapping from the failure class and `paid by`; the adapter only reports the class.

## 15. Hand-offs

| Ticket | Receives |
|---|---|
| **Generation package** (#65, closed) | §4 satisfies §10.4 field by field; §4.2 supplies the mode and constraint evaluator that Package §6.2 and §7 call; §5 supplies the `param-adjusted` outcome (amends Package §7.1 by one entry); dialect is data plus a pure function inside the adapter package (§7.1); the profile snapshot id is already in Package §11 clause 5. |
| **Shot model** (#55, closed) | §11 is the realization plan; SHOT-MODEL §7.6's provider facts live in profiles, not the Shot; slot allowed durations feed the L partition (AI-map G9). |
| **Job lifecycle** (#67, closed) | §7 is the adapter contract: JOB-LIFECYCLE §9 declarations are the profile's *Run behaviour*; §7.3 and §9 F4–F6 are the error and unknown-response rules the lifecycle consumes; no lifecycle change. |
| **Business and operations** (#68, closed) | The profile names the billed-quantity rule; price entries and as-of dates stay in the registry; the balanced bias budget reads the one-click line from BUSINESS §3 and is a tunable; the circuit breaker S7 is F5's trigger; the Account-level credential seam is §8.2. |
| **Voice and performance seams** (#69, resolved in [`VOICE-AND-PERFORMANCE.md`](VOICE-AND-PERFORMANCE.md)) | §13 audio family and §5 of that document; the authorisation precondition as a clause of F3 before `submit`; `audio-cannot-be-disabled` and stripping; Line audio as the Package role `audio.performance`; lip-sync steps as dependent batch members of a Take. |
| **Verification architecture** (#76, resolved in [`VERIFICATION-AND-OBSERVABILITY.md`](../architecture/VERIFICATION-AND-OBSERVABILITY.md), ADR 0026: fakes are contract-verified, parameterised by an evidenced profile, and marked in type, snapshot, record and bytes) | §16 invariants and fixtures; adapter conformance and wire-capture (Package P1); error-mapping table tests; `kind: fake` Offerings for tests with price entries, stale and unknown prices, funds exhausted, key revoked, retired, drift; the rule that a fake can never be a default; profile validation as a CI gate (F10). |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)) | Modules: Catalogue (read-only to the rest, snapshots), Selection (pure), Capability evaluator (pure: constraints, normalise, plan), Adapters (transport behind one interface), and the dispatch gate; no module outside adapters and the Catalogue may contain a vendor name or model id. Dialect is data plus function in the adapter package. |
| **Persistence** (#72) | Snapshots as immutable Record data keyed by content hash and retained as long as any Generation references them; Catalogue operational overlay (status, enablement, route ranking, default bias) with audit; Model, Offering and snapshot ids on the Generation; effective-model reason codes on the Generation; project choice as a Project setting; shot model override as a shot-owned slice. |
| **Runtime platform** (#74), **Operational baseline** (#75) | The deprecation watch, review ages, conformance probes and alerts of §10.4; suspension state shared across workers (F5); per-Offering admission limits and rate-limit deferrals (JOB-LIFECYCLE §5.1). |
| **Platform and execution research** (#73) | Which surfaces to implement first is a platform choice; this contract is indifferent to it. Aggregators are Offerings. |
| **Scene and shot workspace** (#60), **Candidate review** (#62), **World Definition** (#59), settings surfaces | Content model, not layout: the effective-model line with price; the "Automatic · bias" setting and the Model list (name, tier, price band, applicable limitations, deprecation note); the one quiet verdict line; the blocked state with exits; "made at 720p" and similar notes on a Take; batch mix line; `override-unavailable` in the to-reconcile list. All quiet (Record 1 M1). |
| **Lineage and staleness** (#54, closed) | Model choice, default change, snapshot change and Fit outcomes never mark work (confirmed); no new reason code. |
| **Final audit** (#79) | Every vendor-name search outside the Catalogue and adapters returns nothing (invariant 9). |

## 16. Invariants and fixtures the spec should test

1. **Unknown is conservative.** For every `unknown` field of a fixture profile, the evaluator returns the conservative reading, and an Offering with an unknown identity-critical field is absent from Automatic (F1).
2. **Normalisation is monotone, idempotent and total**, for random targets against random duration sets and ranges; the sent value is never below the target while the target is within range; the estimate uses the sent value.
3. **One constraint evaluator, no vendor branches**: the same evaluator code runs for every fixture profile; a search for vendor identifiers outside the Catalogue and adapters returns nothing.
4. **Verdicts are total**: every need ends in exactly one verdict; `unmet-blocking` creates no Generation and no Job; a batch excludes blocked shots from the approved sum.
5. **Selection is deterministic and visible**: same Catalogue snapshot, bias, credentials and need set give the same effective model and reason codes; the result is on the Generation; a stored override pointing at a retired Model resolves as Automatic with `override-unavailable` and the override remains stored.
6. **Snapshots resolve forever**: after a profile edit, a Generation made earlier still resolves its snapshot byte-identically, and its compile is reproducible from ResolvedInputs and that snapshot.
7. **No substitution**: once a Generation exists, no code path changes its Offering or snapshot; a Platform configuration failure does not cause another Offering to run.
8. **Fake can never be default**: a production-marked deployment fails to boot with a fake Offering loaded, or with a default chain resolving to one (F2).
9. **Add a model without touching product logic**: adding a fixture Offering (profile, dialect data, price entries, ranking) passes all invariants with no change to layers, Shot, plan code or lifecycle.
10. **Wire parity** (Package P1) and **error mapping**: every adapter's wire capture decodes to the recorded Rendered request; every documented provider error maps to a class; an unmapped error maps to *Unknown, maybe billed* and is not retried.
11. **Drift suspends**: a rejection fixture mapped to "parameter not accepted" suspends the Offering and refuses the next dispatch with *Platform configuration*.
12. **Model change does not mark**: changing the project choice, a shot override or the default bias flags nothing (LINEAGE).
13. **Realization plan fixtures** (§11.3), including: the Veo-shaped 20 s and 22 s targets; the Luma-shaped conditional constraint (10 s excluded once a start frame is required); a profile with neither extension nor first-frame mode (blocked); a plan whose chosen model is overridden to one that cannot realise it (blocked with exits, never a silent re-plan on another model).
14. **Balanced budget**: a fixture Catalogue where the best model's reference request exceeds the one-click line selects the next ranked one under `balanced`, and selects the best one under `quality`.
15. **BYOK**: an Account with only its own key for surface S sees only Offerings of S's Models as available; the operator ceiling does not apply to it; prices are identical.

Golden fixtures: a three-subject shot on a model that takes two identity references; a 9:16 project against a model that lists 16:9 only; a profile with exclusive frame/reference modes; an Offering moved `deprecated` then `retired` while a project override points at it.

## 17. Constitution check

§10.3 and Q24: Automatic gives a sensible default and the per-project and per-shot override is stored as a Model, with the quality–cost–capability trade-off exposed as the bias and as the Model list; the product depends on no vendor, since every vendor fact lives in the Catalogue and adapters. §7.3: the creator never splits a shot for a generator, because the plan absorbs the limit below the Shot; the only time it asks is when no model can realise the shot as one clip, and that is surfaced with exits. §15.1 provider independence: B's structure, with aggregators and direct surfaces as equal Offerings. §16 principle 13: capabilities are assumed to vary and change; they are data with evidence and a lifecycle. §16 principle 9: nothing here is a gate on the workflow; a blocked need is one impossible request with exits. §13.4 and §14.3: the creator initiates and sees the price; model resolution is shown on the control. Record 1 M1: every surface is a quiet mark. Record 1 M4 and Record 1 M5: credential resolution by (Account, surface) is the BYOK-ready seam. **No CORE or IMPORTANT requirement was found unworkable or contradictory; no `CONSTITUTION AMENDMENT REQUIRED` is raised.** The honest limits of §12 (verbatim spoken dialogue cannot be forced on a generator; middle frames and composition adherence are best effort; extension and audio continuity vary) are recorded, with fallbacks, and none contradicts the Constitution.
