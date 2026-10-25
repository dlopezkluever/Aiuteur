# Aiuteur V2: Build Sequence

Resolution of Wayfinder ticket #77. No ADR: every choice here is an ordering and is reversible; the hard-to-reverse choices it relies on are already in ADRs 0016 to 0026. Inputs: the [Constitution](../product/PRODUCT-CONSTITUTION.md) (§3.1 bar, §8.3 CineBlock after the core loop, §15 scope classes, §17.5 V1 lessons, §18.8), the [module architecture](MODULE-ARCHITECTURE.md), [persistence](PERSISTENCE-AND-MEDIA.md), [runtime platform](RUNTIME-PLATFORM.md), [operational baseline](OPERATIONAL-BASELINE.md), [verification](VERIFICATION-AND-OBSERVABILITY.md) (its §14 build order is adopted unchanged, §3), the [job lifecycle](../domain/JOB-LIFECYCLE.md), [generation package](../domain/GENERATION-PACKAGE.md), [providers and models](../domain/PROVIDERS-AND-MODELS.md), [shot model](../domain/SHOT-MODEL.md), [navigation](../ux/NAVIGATION.md), and Ratification Records 2 to 5 (Record 2 P11 VPS, Record 2 P12 restore test, Record 1 M5 BYOK, Record 2 D61 CineBlock, Record 5 VP voice placement).

Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). This document fixes **what is built first to prove the architecture, in what order the product grows to the "Aiuteur works" bar, and in what order the IMPORTANT capabilities land after it**, with the interfaces that must exist before each. It contains no estimates, sprint plans or tickets, and it does not change a scope class, the bar or §8.3.

## 0. The decision on one page

| # | Item | Decision |
|---|---|---|
| 1 | **Tracer bullet T0** | One real, kept (not throwaway) path through **every layer**: invited creator → a pasted paragraph → a real-LLM **Treatment Option** (text leg) → one Character with a reference image and one hand-made Shot → a real-provider **Frame** (frame leg) → a real-provider **Take** from that Frame (take leg), priced, run by the worker, stored, streamed to the UI, inspectable, recoverable and tested on the contract-verified fake. It proves the architecture; it is not a phase of the product (§1) |
| 2 | **Foundations** | No foundation phase. T0 builds only the foundation its legs touch, in the order its legs touch it. Nothing is built ahead of a leg (§1.3) |
| 3 | **Slice order** | After T0, **workflow order, thin end to end, then deepen**: VS1 to VS9 follow the Constitution's phase order, each replacing a *seeded* step of the golden workflow with the real one, until the whole of CORE passes the bar (§2) |
| 4 | **Bar** | Milestone **BAR** is not a slice. It is the exit test of VS9: both golden workflows live, the restore test, the parked values set, the bar run L3. **No creator other than the owner is invited before it** (§2.3) |
| 5 | **IMPORTANT order** | After BAR, three waves derived from dependency and risk: **IW1** documents and delivery (provenance highlight, Writing style, Screenplay export, NLE timeline export); **IW2** voice and performance; **IW3** directed shots (composition references, then storyboard, shot-list and previs-package import, then CineBlock, then reference-driven shots). **BYOK** runs as a parallel lane from BAR (§4) |
| 6 | **Early interfaces** | Thirteen (EI1 to EI13), each landing in T0 or a named CORE slice so no IMPORTANT capability needs redesign (§5) |
| 7 | **Creator Review** | None open. Record 6 settled the last items: CR-79.1 is not a BAR or invitation gate (the legal-role review is post-release reference, `docs/post-release/LEGAL-AND-COMPLIANCE.md`), and the media floor joins BAR item 4. The IMPORTANT order raises none: it is derived (§4.2) and every ordering inside it is reversible at no architectural cost |

## 1. The tracer bullet

### 1.1 Shapes compared

| | **A. Text-only spine** (paragraph → Treatment) | **B. Media-only spine** (seeded shot → Frame) | **C. Whole workflow, every phase thin** | **D. Hello-world skeleton** (one endpoint, a fake provider) | **E. Two-leg creative thread with a Take (chosen)** |
|---|---|---|---|---|---|
| Exercises the AI call boundary | The L half only (propose, guard, splice) | The media half only (compile, Fit, one send path) | Both, shallowly | No real call | **Both** |
| Background generation, SSE, artifact storage | No (fast path only) | Yes, but the long-run states are hit only by video | Yes | No | **Yes, including `submitting`, `running` and `fetching` of a video run** |
| Real provider integration | One LLM | One image model | All, none deep | **None**: V1's "mock by default" (§17.5) | **LLM, image and video** |
| Domain boundaries (build rules R1 to R13), write gate, captures | Partly | Partly | Yes | No | **Yes: provenance runs from the text leg, captures from the media legs** |
| Risk if it passes | Media and recovery untested | Documents, provenance, guards untested | **Builds every phase before any is proven**; the schedule risk V1 died of | Proves nothing | Low: each remaining risk is a slice's, not the architecture's |
| Verdict | Rejected | Rejected | Rejected: it is the product, not a proof | Rejected | **Chosen** |

T0 is **kept**. A throwaway spike was rejected: the first Job, the first Generation and the first Revision are the ones every later contract is written against (§5). The tracer is slice zero, and its code is production code behind the same gates.

### 1.2 The path and its exit evidence

| Leg | Path | What it proves | Exit evidence |
|---|---|---|---|
| **T0a Text** | Invitation → Account → `Scope` → New project → paste a paragraph (Input, Source Material as a Revision) → "Draft Treatment" as a `workflows` operation: Initiation, `resolve`, compile (text Package, Fit, Rendered request), `generation.preview` price, `spend.admit`, Generation, Job on the **text fast path**, real LLM through its adapter, `validate` (AI-map G3 and the splice/provenance guard set), `attach` as a Treatment **Option** with provenance runs, call log stored; creator chooses it (a Decision) | Stack; Postgres spine, `history.commit`, `unit_head`; kind declaration; the AI call boundary (models propose, code commits); one send path; provenance computed by the commit path; Auth → Scope; forced row rules | The operation harness (VC5) passes it on a recorded proposal with an adversarial case; the same path runs once live on staging; the Rendered request in the inspector equals the wire capture (Package P1); a second Account cannot see or call any id of the first (isolation gate G1) |
| **T0b Frame** | The creator uploads a reference image for one Character (`media.put`: fetch, verify, hash, probe) and adds one Shot by hand with that Character's Presence; "Make frame": `image.frame` compiled with the identity reference carried, price shown, Job claimed by the **worker**, real image Offering, bytes fetched to the object store, **one settling transaction** (Attempt attached through `history`, cost set, outbox event) → **SSE** → the Frame appears in the UI with no reload | Background generation; artifact storage and private access (`media.access`); the UI update path with `Last-Event-ID` replay; Package carries every on-screen Presence; the Generation is the trace (build rule R22); success only after media persisted | Kill-the-worker at each Job state on virtual time (VC4) and once for real on staging: the Job completes after restart with no duplicate Attempt; a dropped stream replays the event on reconnect; the Frame is unreachable by a signed link of another Account; the cap check refuses a run past the creator cap before any Generation exists |
| **T0c Take** | "Make take" from the approved Frame: `video.take` with first frame, the shortest duration and lowest resolution the Catalogue allows, real video Offering, long-run states, webhook or scheduled observe, fetch, probe facts frozen at ingest; one Segment | The longest-running, most expensive and least certain provider path; billed-quantity and late-result handling; frozen probe facts (fps, CFR/VFR, frame count, audio layout) for the exporter | Live smoke (VC13) on the video Offering: accepted, fetched, verified, billed quantity within tolerance of the estimate, one known-bad request mapped to its class; a scenario-script replay of "late result after cancel" on the fake; the Take plays in the browser |
| **T0d Recovery and ops** | The platform as deployed: one VPS running `web`, `worker` and Postgres as containers, R2, the backup floor of OPERATIONAL-BASELINE §8, the pipeline promoting one digest to staging, the typed logger and scrubber, Sentry behind its port, the heartbeat | Hosting, delivery, restore | A restore of the tracer's database from off-machine backups into a fresh Postgres, the app started against it, a project opened (a **rehearsal**; the gating restore test of §2.3 is separate); the secret canary (isolation gate G8) green; a deploy by digest and a rollback by digest |

**NLE hands-on check (before T0 exit).** The 15-minute hands-on import check of #70 §5.6 (Resolve and CapCut; ordered unique-named clips and an xmeml file on a hand-made timeline) runs before T0 exits, because its findings feed the probe-fact list and the VFR→CFR rule in `media.put` and FC5. Its record is BAR evidence (§2.3 item 3); the check repeats per release (VERIFICATION-AND-OBSERVABILITY §5.3 step 7, VC16).

All of T0 runs in CI on replay (the fake transport, recorded proposals, real Postgres, virtual time); only T0a to T0c's live runs touch real providers, under the staging smoke Account's cap.

### 1.3 What T0 builds, and what it deliberately does not

**Builds (only what a leg touches; for the modules the legs touch only thinly, the minimal kinds and entries):** `story` (Source Material and Treatment Option kinds), `world` (the Character kind with its reference image), `production` (the Shot, Frame, Segment and Take kinds), `workflows` (the registry with the T0a to T0c operations only), `api` (the commands, reads and stream those legs call), `views` (project list, Treatment page, Character, Shot, Frame and Take reads), `client` (the plain, final-shaped screens of the legs). Plus: the repository and the module graph with build rules R1 to R24 enforced from the first commit; `contract` and its generator; the Store port with the spine, `unit_head`, capture edges, forced row rules and the three DB identities; `history.commit/read/derive` (all of `Applied`, `NeedsConfirmation`, `HeldAsOption`, `StaleBase`, `Refused` exist as types and paths, with an empty lock table); `jobs` and the Scheduler with leases, deadlines and the outbox; `Stream`; `generation`, `compiler`, `providers` (Catalogue face with the closed operation-class vocabulary, adapter face for three Offerings); `spend` with the mechanical rule; `media`; `accounts` with the credential seam; `testing/` with `FakeTransport` and the `ProviderTransport` suite; GP-S's first commands; the E1 skeleton (§3).

**Does not build, on purpose:** Interview, Beat Sheet, Master Narrative, scenes, World Definition screens, Looks, locks and their offers, possibly-out-of-date markers in the UI, the Board, the Outline beyond a project list, Cmd-K, playback of more than one Take, export, dialogue and audio handling beyond the provider's native track, Segments beyond one, BYOK setup, the operator console, purge, duplicate, and every IMPORTANT capability. Tracer screens are the plain, final-shaped ones of the owning slice, not a separate prototype UI.

**Accepted gap.** T0 hand-makes the Character and Shot that VS5 and VS6 later make by workflow. The seam is the same kinds and the same commands, so VS5 and VS6 replace the hand step; they do not migrate it.

## 2. The vertical slices

### 2.1 Orderings compared

| | **A. Workflow order, thin end to end, then deepen (chosen after T0)** | **B. Risk-first spine all the way** (media, video, export first; writing last) | **C. Per-phase completion** (finish Input, then Interview, ...) | **D. Horizontal layers** (all tables, then all APIs, then all UI) |
|---|---|---|---|---|
| Follows the Constitution's workflow | **Yes** | No | Yes, but each phase to its end | No |
| First whole-bar run | At the end of VS9, with every earlier slice already live | Late for the writing half, which every Package is compiled from | Last | Last |
| Surfaces the V1 failure early (nothing delivered, §17.5) | **A deliverable exists from T0c; export in VS9, with the NLE hands-on check run before T0 exit** | Yes for media; the writing guards (AI-map G3, G7) arrive when 80 % of the code assumes them | No | No |
| Contract churn | Low: T0 fixed the contracts every slice calls | Medium: documents change what Packages need | **High:** a deep phase is built before its consumers exist | Highest |
| Parallel work (#78) | Lanes after T0 (§2.4) | Good | Poor | Poor |
| Verdict | **Chosen** | **Used for T0 only**: the media legs are the riskiest layer and are proven first | Rejected | Rejected, except the narrow foundation T0 pulls in |

Rule inside A: **each slice ships its phase's primary path (the creator-ratified UX doc) end to end, thin, and moves the golden workflow's seed boundary.** Secondary affordances (Cmd-K, the review-all tray, the coverage wall B, comparing up to three Takes, duplicate project) are broadening: they land when their owner slice exists and are required before BAR only where a CORE family of §15.1 needs them.

### 2.2 The slices

| # | Slice (workflow step) | Purpose and what it proves | CORE carried (Constitution §15.1) | Exit evidence | Gates newly live |
|---|---|---|---|---|---|
| **T0** | Tracer (§1) | The architecture | Version history (the spine), cost estimates before spend, model default with override seam, provider independence (Catalogue, no vendor outside it) | §1.2 | VC1, VC2, VC3, VC4, VC5, VC6, VC7 (isolation gates G1 to G11), VC8 (drift checks D1 to D9), VC9 short path, VC10 (all eight lines), VC13 (first live smoke) |
| **VS1** | **Input → Interview** | The L-operation family on real prose: Source Material import with roles, route strip, Established Facts, advisory ending, fact check (AI-map G6), HELD results. Proves the guards on adversarial proposals | Project setup and intake (typed text; txt, docx, pdf, md; roles); Interview producing binding Facts | E1 steps 1 on replay and once live; Facts survive into a later Package as `binding`; a planted contradiction is caught and shown HELD; Source Material is never rewritten (V1 lesson) | VC14 (eval set seeded), VC17 nightly (compiler Fit, guards, `history.derive`), LLM live smoke for each new operation |
| **VS2** | **Treatment → Beat Sheet** | Block documents under human editing: Options, manual edit with autosave rules, targeted rewrite by splice (AI-map G4), regenerate with Keep my edits, explicit Sync (build rule R10), restore as a new head | Treatment and Beat Sheet (options, edit, targeted rewrite, regeneration, import of a designated Treatment upload); version history and recovery | Round trip is identity; a rewrite leaves bytes outside the selection unchanged; opening a document writes nothing; restore adds a head and deletes nothing | — |
| **VS3** | **Master Narrative → scenes** | Scene identity as the container block id (ADR 0011), acceptance as the first commitment point, the first lock end to end (offer, server enforcement, edit-through) | Master Narrative generation, editing, targeted rewrite, acceptance; non-blocking locks at commitment points (acceptance) | E1 steps 1 to 2 complete on replay; a locked scene refuses a write from a second path and from the worker (the server, not the screen, enforces it); dialogue appears exactly once (AI-map G3); the disagreement check runs before drafting | — |
| **VS4** | **Own screenplay → Master Narrative** | The second entry of the bar: conversion, deterministic-first mapping with creator confirmation, dialogue byte-identical | Screenplay import → conversion | **E2 live in CI**; the mapping adversarial corpus (SCENE-IDENTITY) passes; a revised import never deletes work of an unmatched scene (Removed from Story) | VC9 gains E2 |
| **VS5** | **World** | Entities as closed units with identity-first definition; Looks derived from narrative position (ADR 0002); the first `image.entity` Generations at scale; Voice stored on the Character | World definition (characters, locations with a canonical reference, props, extras, Looks, generate or upload with multiple Attempts, defer); Visual style; lock at identity approval | E1 steps 3 on replay and live; Look carry-forward matches the flashback golden; no automatic spend (readiness never gates); an entity edit now yields captures the later slices derive from | VC13 and VC14 for the entity-image Offering |
| **VS6** | **One Scene → one Shot (Scene Prep)** | Shot model in use: AI plan draft under the $0.05 rule, split, merge, redraft by Options, Presence derived, write-back and Deviation, runtime awareness, composition-reference slot; the Script Hub and the **Board** at 250 shots | Scene and shot planning (batch across scenes, runtime awareness, composition-reference support in the shot concept); lock at plan acceptance | E1 step 4; every Dialogue line covered once; **GP-L generated; shape budget green** | **VC11**, **VC12** (nightly) |
| **VS7** | **Frame** | The compiler at full width: frame roles, continuity link, reuse and edit of a prior Frame, location Views from actual shots (coverage), Overrides, the inspector, Batch with dependency edges, quiet possibly-out-of-date markers and Keep or Reconcile | Frames (generation, approval, reuse, continuity); possibly-out-of-date marking; coverage | Identity carried for one, two and three characters on a model that takes two identity images (Fit demotes by layer, nothing truncated); an entity edit marks the dependent Frame and unlock marks nothing; the inspector equals the wire capture | VC14 for identity-critical frames |
| **VS8** | **Take** | The expensive path at full width: Segments for long shots, native dialogue verbatim (Package P3), failure and priced Retry, late results, cancel, a Batch of Takes, compare, select, reject, Mark final, the per-shot model override | Takes (background, creator-initiated, cost shown, compare, select, reject, regenerate; native dialogue and sound); model default with override | E1 step 5 on replay; each Dialogue line byte-identical in the request; a kill-a-worker run mid-Batch loses nothing; the spend confirmation fires at $2.00, at 10 Generations, for bulk-by-filter, unknown price and cap | VC13 for each default-eligible video Offering; VC14 |
| **VS9** | **Review → Export** | The deliverable: playback of selected Takes only, the gap slate, the manifest, ordered unique-named clips, the written documents, frozen probe facts | Review (scene and whole-film playback, progress views); Export package (ordered named takes, frames, prompts, documents) | E1 steps 6 to 7 and E2 to the end on replay; the manifest equals the selection; frozen probe facts equal the files; the #70 §5.6 hands-on NLE check (15 minutes) has passed in Resolve and CapCut (run before T0 exit, §1.2) | VC15 (GP-Mini live) |

### 2.3 Milestone BAR (the exit of CORE)

Not a slice: no capability is added. It is complete when **all** hold, each recorded as an evidence record:

1. VC1 to VC11 green on `main`; D10 green (the previous release's GP-S snapshot upgrades; the first release after T0 is the first to have one).
2. VC12 within its window, VC13 green for every Offering in a default chain, VC15 green.
3. **VC16 the bar run**: a rough paragraph to a 2 to 3 minute piece to an NLE import in a day (§3.1), **and** the same from the owner's own screenplay; the record of the pre-T0-exit NLE hands-on check (§1.2) is part of this evidence.
4. The media floor of OPERATIONAL-BASELINE §8.1 in place (the independent B2 copy of committed media and the retention Bucket Lock on the primary bucket, Record 6 §4); the restore test of OPERATIONAL-BASELINE §9 passed and recorded, including a restored media sample (date, duration, recovery point); and the parked values it names (cap defaults, the hidden operator ceiling, provider-side limits) set.
5. Production environment stood up from the same digest as staging.

Only then is a creator other than the owner invited (Record 2 P12.2).

### 2.4 Dependency and lanes (for #78)

```diagram
 T0 ─▶ VS1 ─▶ VS2 ─▶ VS3 ─┬─▶ VS4
                           └─▶ VS5 ─▶ VS6 ─┬─▶ VS7
                                           └─▶ VS8 ──▶ VS9 ──▶ BAR
 (VS8 consumes VS7 Frames when a shot has them; a direct-to-video shot needs only VS6)
```

Slice order is **integration order, not a ban on parallel groundwork.** After T0 closes and its contracts freeze (§7), independent lanes may run ahead of their slice: story (VS1 to VS4), world (VS5), shot and generation breadth (VS6 to VS8: more Offerings, the compiler layers, the realization planner), delivery (VS9 exporters), platform (operator console, BYOK-ready checks). A lane merges only through the gates of its slice.

### 2.5 Placement rulings (#79)

| Item | Placement |
|---|---|
| **Reference library** (Record 5 RL1–RL4) | Frame-as-reference and image upload land in **VS7**; the library sections for storyboard panels and CineBlock captures land in **IW3** with their sources (EI5) |
| **Ad-hoc shots** (Record 2 X5) | **VS6**: the Ad-hoc shots section, Scene Prep and Generate for a shot with no Scene |
| **Removed from Story** | **VS4**: retired scenes keep their work; Bring back and Adopt work |
| **`project`: Project settings, Outline phase status** | **VS1** |
| **`project`: phase disposition, skip, bypass** | **VS2** (Treatment and Beat Sheet are the first skippable phases) |
| **`project.planDuplicate`** | The planner lands in **VS4** (a revised-screenplay import carries work forward by it, Record 2 D52.2). The creator-facing Duplicate project control is a secondary affordance (§2.1) |
| **Purge and Account data export** | Post-BAR, unscheduled. Preconditions: the backup retention window and the purge log (OPERATIONAL-BASELINE §12) |

### 2.6 Export layout (ruling, #79)

The #70 decisions were recorded on a ticket comment and an unmerged research branch; the needed text is copied here. The exact scheme is **spec-level**, with the research branch `research/nle-import-interchange` as input.

- **Package:** `timeline/` (xml, otio, edl), `takes/S01_<scene>/S01_SH010_T03.mp4` (globally unique, ASCII, zero-padded names), frames, prompts and documents, and `manifest.json`. Ad-hoc shots take their own folder under `takes/` under the same naming rule (folder name spec-level).
- **Two modes:** export-to-folder (absolute paths, zero import prompts) and a portable zip (one folder pick).
- **Normalisation:** no transcoding by default; the provider file is the master. Variable-frame-rate files are normalised to CFR at export build (recorded). Mixed frame rates stay native; each clip is quantised as `round(frames × timeline_fps / source_fps)` from frame counts. **Default timeline fps is 24.**
- The exporter is purpose-built and driven by the probed metadata frozen at ingest, not a generic library (an OTIO FCP7 adapter mishandled a mixed-fps timeline).

## 3. Verification and operations carried through the build

VERIFICATION §14's order stands and is placed here: (1) `testing/` with `FakeTransport` and the `ProviderTransport` suite, (2) Store and Scheduler suites with virtual time, (3) GP-S as replayed commands, (4) the operation harness over the first operation, (5) trace fields and build rule R22 from the first Generation, (6) VC1, VC2, VC6 and VC10 in the first pipeline, (7) the E1 skeleton, (8) the staging smoke Account and first live smoke with the first real adapter. All eight are T0 work, in that order; GP-L and VC11 and VC12 arrive with the Board (VS6); the bar run is the exit test.

- **The seed boundary.** E1 and E2 begin by replaying the commands of GP-S for every step not yet built, then run the real UI for the rest. Each slice moves the boundary one phase earlier. At BAR nothing is seeded. This keeps one golden workflow alive from T0, so no slice can break the end-to-end path unnoticed.
- **GP-S grows with each slice** by the cases of VERIFICATION §5.1 that the slice makes reachable; a slice is not done until its cases are in GP-S and its operations are in the harness.
- **A new operation is a registry entry** in `workflows`; the harness, isolation gate G1 and AI-map G10 cover it without new test code (EI2). A new provider kind arrives with its fake and its conformance run, never without (build rule R19).
- **Required before the first real adapter**: the staging smoke Account and its caps. **Required before any production traffic**: the isolation gates, the fake-in-production guards and the heartbeat.
- **Legacy**: nothing from V1 is migrated or imported (map Out of scope); legacy prompts follow VERIFICATION §10.

## 4. The IMPORTANT landing order

### 4.1 Rules

1. **IMPORTANT never lands before BAR** (§3.1, §8.3). What it needs *architecturally* lands earlier, as early interfaces (§5), and only as interfaces.
2. **Order inside the post-BAR period** is by: (a) hard dependency, (b) CineBlock after the core loop and after what it reuses (§8.3, ADR 0024), (c) risk-first: learn early whether a capability is infeasible, because that route ends in a `CONSTITUTION AMENDMENT REQUIRED` proposal, (d) cost of the first useful increment.
3. Each wave ends with its own exit evidence under the same gates; no wave is a prerequisite for the next unless stated.

### 4.2 The order and why

| Wave | Capabilities (§15.2) in landing order | Why here | Depends on | Exit evidence |
|---|---|---|---|---|
| **IW1 Documents and delivery** | Provenance highlight toggle → Writing style → Screenplay export → NLE timeline export (xmeml first, then OTIO) | No new provider and no new modality; each reads data that already exists (provenance runs, the Writing Style kind, dialogue blocks, frozen probe facts); the NLE export improves the bar's last step the moment it lands | EI4, EI8, EI11 | The highlight changes no stored byte; Screenplay export is dialogue-identical (AI-map G3) and a text Generation; the xmeml and OTIO files validate against their schemas and import in Resolve; CapCut still receives ordered unique-named clips behind its descriptor |
| **IW2 Voice and performance** | Recorded or uploaded Performances and the Line audio Slot → consistent character voices (Voice, authorisation) → voice transformation preserving delivery → lip-sync and audio-driven paths → Generate as Character Voice (`audio.speech`, designed voices) and the Generate unvoiced lines batch → Native → Character Voice (revoiced Take) last (Record 6 §1) | The hardest feasibility question left (lip-sync, non-humanoid characters, consent and authorisation): finding an infeasible case early is worth more than any ordering benefit of the others. Order inside follows VOICE-AND-PERFORMANCE §12: the Line audio Slot with Performance record, upload and play first (no provider audio; still post-BAR, §4.1 rule 1), then Voice definition, the authorisation record and gate, `audio.transform`, then lip-sync and audio-driven paths, then `audio.speech` with designed voices and the unvoiced-lines batch, then the revoiced Take | EI3, EI7, EI13; #69's voice and performance document | A line's chosen Performance is byte-identical in the audio request (Package P3); the authorisation gate (validate and PROVIDERS F3) refuses before `submit` and creates no Generation; revoking sets `authorisation-revoked` and deletes no Take; the default path still needs none of it (Record 5 VP5); audio fakes pass the shared conformance suite |
| **IW3 Directed shots** | Composition references (image: upload, delivery in the Package, authority division §8.2) → storyboard, shot-list and previs-package import (one matching engine, deterministic first) → **CineBlock** (stage, scene state, Send back, `world.generate`, capture to Frame through `image.frame`) → reference-driven shots (footage-kind reference, subject replacement) | Imports reuse the CORE composition-reference slot and the SCENE-IDENTITY mapping pattern, with no new modality; CineBlock reuses the same package contract and matching and is the largest client build; reference-driven shots depend on the least certain provider capability and sit last | EI5, EI6, EI10, EI12 | A capture goes through image generation and is never the Frame (ADR 0024); a many-to-one import flags both rows; no CORE module imports `previs`; the Two-Account harness covers the stage endpoints; a reference-driven shot's unsupported need yields a Fit verdict, not a guess |
| **Lane B BYOK** | Setup flow, key validation, per-Account revocation, `paid by = account` | A priority follow-on "right after the core build" (Record 1 M5, BUSINESS §7), independent of the waves; the seam exists from T0 | EI9 | A revoked key isolates one Account only; spend attribution by relation; the hidden operator ceiling stops applying to account-paid runs |

**Why the IMPORTANT order raises no Creator Review item.** The Constitution fixes only CineBlock's position. Dependency and risk fix the rest: IW1 has no uncertainty and serves the bar's own last step; IW2 is the feasibility risk; IW3 contains CineBlock and what it reuses. The two orderings the documents leave open (IW2 before IW3, and BYOK parallel rather than serial) change no interface and no module boundary, so a different creator preference is a reorder of waves, never a redesign. If the creator prefers IW3 before IW2 it costs nothing but the earlier discovery of voice infeasibility.

### 4.3 Rejected orderings

| Alternative | Why rejected |
|---|---|
| **Interleave IMPORTANT slices inside CORE** | Breaks the bar and §8.3; delays the first complete loop, V1's failure |
| **The Constitution's table order** (§15.2 is a classification table, not a priority list) | Puts the three voice items before composition work by accident of listing and leaves CineBlock's dependencies unordered |
| **Value-first (CineBlock first, the creator's own tool)** | Contradicts §8.3 and builds the biggest client surface before the loop it plugs into exists |
| **One IMPORTANT capability at a time in table order** | Ignores shared engines (matching, descriptors) and builds them twice |

## 5. Early interfaces

Derived from the hooks the documents already reserve; none is new design. "Lands" is the slice that must contain it; the IMPORTANT capability lands later with **no change to the interface**.

| # | Early interface | Lands | Source | Serves |
|---|---|---|---|---|
| **EI1** | **Trace fields and capture edges on every Generation** (build rule R22): Package, Fit, Rendered request, captured input slices with fingerprints frozen once captured | T0 | VERIFICATION §2.1; PERSISTENCE (frozen slices); LINEAGE | Locks, staleness, impact, eval, every IMPORTANT operation |
| **EI2** | **The operation record in the `workflows` registry** (`scope`, `resolve`, `propose`, `validate`, `attach`) and the Initiation requirement (build rule R6) | T0 | MODULE §3.1 | Screenplay export condensation, voice operations, import mapping, `world.generate`: each is a registry entry the harness, isolation gate G1 and AI-map G10 pick up |
| **EI3** | **The closed operation-class vocabulary and the capability-profile schema, including the audio fields** (voice source, authorisation precondition, driving-audio acceptance) with unpopulated classes `audio.speech`, `audio.transform`, `audio.lipsync`, `audio.voice`, `audio.transcribe`, `world.generate`, and the closed authorisation-precondition kinds (`attestation`, `speaker-verification`, `own-voice-only`, `allowlist`, `unknown`) | T0 | PROVIDERS §§3, 13 | Voice waves, CineBlock |
| **EI4** | **Block documents with inline provenance runs and dialogue as its own block**; provenance computed by the commit path | T0 (text leg) | STORY-DOCUMENTS; AI-map G3, G7 | Provenance highlight, Screenplay export, screenplay import, dialogue-identical checks |
| **EI5** | **Composition reference as a kind with a Shot slot**, optional opaque versioned capture metadata, subject mapping, layout and footage kinds; Package delivery of a composition reference | slot VS6; delivery VS7; reference library: Frame-as-reference and image upload VS7, storyboard-panel and CineBlock-capture sections IW3 (§2.5) | SHOT-MODEL §§8, 10; GENERATION-PACKAGE §8.4 | Composition references, storyboard, CineBlock, reference-driven shots |
| **EI6** | **Stable ids**: Dialogue line id and Shot id surviving split, merge and redraft; an external label that is a label, never identity; `imported` provenance | VS6 | SHOT-MODEL §10; ADR 0012 | Performances, shot-list import and round-trip export |
| **EI7** | **Voice 0..1 on the Character; the Performance link** (Supplied media linked to a line, one chosen, a Decision) with the closed reason `performance-changed`; Performance as a Package role; the Line audio Slot (one chosen candidate per Dialogue line; none chosen is native dialogue); the lineage reasons `performance-changed` and `authorisation-revoked`; the authorisation check `authorised()` as a precondition inside the operation's `validate` and as a clause of the PROVIDERS F3 dispatch gate, before `submit` | Voice VS5; link and reason VS6; role VS8 | ENTITIES-AND-LOOKS; SHOT-MODEL §10; PROVIDERS §13; Record 5 VP1 to VP5 | IW2 |
| **EI8** | **Exporter capability descriptor**, the Manifest as a history Record, and probe facts frozen at ingest | probe T0c; descriptor and Manifest VS9 | MODULE §3.4; #70 | NLE timeline export, Screenplay export as a descriptor, any later exporter |
| **EI9** | **The credential seam**: `CredentialHandle`, `accounts.credential(scope, provider)`, write-only envelope custody, `paid by` on the Generation, adapters that take a handle and never a global key | T0 | BUSINESS §7; OPERATIONAL-BASELINE | BYOK |
| **EI10** | **Deterministic-first mapping with a Decision that records its evidence, many-to-one flagging both rows, and creator confirmation of ambiguity** | VS4 | SCENE-IDENTITY; SHOT-PLANNING-INPUTS | Storyboard, shot-list and previs-package import, CineBlock Send back |
| **EI11** | **A `Writing Style` kind (absent by default) and a reserved style layer in the text Package** | T0 (layer), VS2 (kind) | ENTITIES-AND-LOOKS; GENERATION-PACKAGE §14 | Writing style |
| **EI12** | **The `previs` seam**: no CORE module imports it; the stage endpoints are ordinary `api` calls under a Scope; client surfaces are separate tabs of one application | rule T0 | MODULE §3.6; ADR 0024 | CineBlock |
| **EI13** | **A fake and a conformance run per provider kind**, in the same change as the kind (build rule R19) | each kind | VERIFICATION §3 | Audio, world model, footage references |

CORE carries two further foundations that IMPORTANT work leans on and that are therefore built in full, not reserved: **locks and staleness** (the write gate with its impact path and empty lock table in T0, the first lock offers in VS3, VS5 and VS6, markers and Reconcile in VS7) and **Looks and location coverage** (the Look assignment and carry-forward derivation in VS5, the view-resolution ladder and shot-driven coverage in VS7).

## 6. Not decided here

Slice sizes, durations, staffing, the order of tickets inside a slice, the exact secondary affordances that count as broadening, numeric thresholds, which Offerings seed the Catalogue, and the screens' detail. These are `/to-spec`, `/to-tickets` and the UX docs.

**Revisit if:** the NLE hands-on check fails (the probe-fact and export rules are replanned, VS9 is replanned around the ordered-clips path, a recorded limitation); a default video Offering fails its smoke at T0c (the tracer is not exited until a second Offering passes); #69 finds a capability infeasible (a `CONSTITUTION AMENDMENT REQUIRED` proposal, and IW2 shrinks to what is feasible); the creator prefers IW3 before IW2 (reorder, no redesign).

## 7. Hand-offs

| Ticket | Receives |
|---|---|
| **Contract freeze** (#78) | **T0 exit is the freeze point**: T0 writes version 1 of the contracts MODULE §14 and VERIFICATION §14 list (the `contract` vocabularies and ids, `history.commit/read/derive`, the kind declaration shape, the operation record, `ProviderTransport`, the Store port, the executor and settler seam, the trace fields, `FakeTransport` and the conformance interface, the `testProvider` flag, the evidence-record and scenario-script shapes, the `Environment` type), and #78 freezes them from the real code, not before. The swarm starts at T0 exit with the lanes of §2.4; **T0 itself is built by one thread or a pair** because every leg changes the contracts. Done evidence per slice is its exit evidence (§2.2) plus the gates it makes live, plus its GP-S cases and harness entries; BAR is the swarm's top-level done |
| **Final audit** (#79) | Build rules R1 to R24 in force from T0; the eight lines of VERIFICATION §3.2 before any real adapter; every §15.1 CORE family has a slice (§2.2) and every §15.2 IMPORTANT item has a wave (§4.2) and its early interfaces (§5); the bar run and restore test gate the first invitation; nothing here changes a scope class |
| **Operational baseline** (#75), **Runtime platform** (#74) | The platform is stood up inside T0 (T0d); the production environment before BAR; the restore test is a BAR condition |
| **Verification** (#76) | Its build order is T0 work; each gate's first slice is in §2.2; the seed boundary of §3 |
| **Voice and performance** (#69) | EI3, EI7, EI13 and IW2 |

## 8. Constitution check

No requirement was found unworkable or contradictory; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** §3.1: the bar is the exit of VS9 and BAR, both entry paths included. §8.3: no CORE module imports `previs`; CineBlock lands inside IW3, after the core loop and after what it reuses. §15: every CORE family has a slice, every IMPORTANT item a wave and an early interface, and no scope class changed. §17.5: a finished piece (Take, playback, export) exists end to end from T0c and VS9, not at the end of the schedule, and no mock provider is ever a default. §18.8: build order and real end-to-end runs (replay in CI, live smoke, GP-Mini, bar run) are fixed here and in VERIFICATION.
