# Aiuteur V2: The Generation Package and Context Compiler

Resolution of Wayfinder ticket #65. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). Objects, ownership and Generation/Job semantics come from the [domain model](DOMAIN-MODEL.md) and [ADR 0001](../adr/0001-revisions-attempts-generations-jobs.md); what a Generation must capture is [`LINEAGE-AND-STALENESS.md`](LINEAGE-AND-STALENESS.md) §3.3; the run lifecycle is [`JOB-LIFECYCLE.md`](JOB-LIFECYCLE.md); shot slices, frame roles and Segments are [`SHOT-MODEL.md`](SHOT-MODEL.md); identity, Looks, Views and style are [`ENTITIES-AND-LOOKS.md`](ENTITIES-AND-LOOKS.md); the guards and the "compile is deterministic" rule are [`AI-RESPONSIBILITY-MAP.md`](../ai/AI-RESPONSIBILITY-MAP.md). The trade-off decided here is [ADR 0014](../adr/0014-a-generation-is-compiled-into-one-layered-package-that-is-recorded-shown-and-sent.md). No schemas, prompts, model names, endpoints or code are chosen. Provider facts are dated examples (research #5, #6, #9 of 2026-10-18, re-checked where marked); no rule depends on any one of them staying true.

## 0. The decision in one page

A generation request is built by **one pure function** from a snapshot of owned creative truth and a model's capability profile. It produces one **Package**: an ordered list of typed **Layers** (each owned by one domain, each remembering which captured inputs it was made from), an ordered list of **carried references** with roles, and typed **parameters**. A **Fit** step maps the Package onto the model's limits by *demotion and reported omission only, never by cutting inside a layer*. A **Render** step (the provider **dialect**) turns the fitted Package into a **Rendered request**. The Rendered request is the only thing an adapter may send; it is recorded on the Generation before the provider is called; the inspector shows that same stored object. What the creator sees is therefore the thing that was sent, by construction, not by a promise.

```diagram
 owned truth (Revisions, Attempts, Looks, Views, Frames, settings, Facts, overrides)
        │  RESOLVE   (reads modules; records every (unit, Revision, fingerprint) it uses)
        ▼
 ┌───────────────┐  COMPOSE   ┌────────────┐   FIT    ┌──────────────┐  RENDER  ┌──────────────────┐
 │ ResolvedInputs│ ─────────▶ │  Package   │ ───────▶ │ fitted       │ ───────▶ │ Rendered request │
 │ (immutable)   │  pure, D   │ layers +   │ capability│ Package +    │ dialect  │ text parts, media│
 └───────────────┘            │ candidate  │ profile   │ Fit report   │ (data +  │ parts, params,   │
                              │ references │ (#66)     │              │ pure fn) │ declared rewrites│
                              └────────────┘           └──────────────┘          └────────┬─────────┘
                                                                                          │ RECORD (before any provider call)
                                                                                          ▼
                              inspector / estimate / duplicate guard read this ◀── Generation record ──▶ adapter (serialises only)
```

## 1. V1 failures and the rule that answers each

| V1 failure (legacy 09 §§1.6–1.8; 08 §6; DEAD-0025) | Rule here |
|---|---|
| Visual style never reached frame or video prompts (the column was never written, 09 §1.6) | Style is a layer, resolved by reference to a Style Revision, and recorded on the Generation (§4). A compile with no Visual Style resolves the visible AI-made default style (ENTITIES §7 rule 4); it never silently omits. |
| Prompts silently truncated at 500 or 1,200 characters (`cleanPromptOutput`, 08 §6.5) | Fit never cuts inside a layer. An over-limit request is not sent (§7). |
| A prompt claimed an image the request did not carry (reference-download failures skipped, 09 §1.7) | The carried list is read back from the Rendered request, not from the Package (guard P2). Reference labels in scaffold text are generated from the carried order (§6.4). |
| Aspect ratio stored but never sent (09 §1.7, C12) | Every typed parameter is either present in the Rendered request or reported as not honored (guard P5). |
| Preview differed from what was sent: the package preview fields had no consumer, generation read the persisted manifest (DEAD-0025, FACT-0086) | There is one compile function. Preview, estimate, duplicate guard, inspector and dispatch all read the output of that function; the record is that output (§3, §13). |
| `frame_prompt` and `video_prompt` columns overwritten on regenerate, user edits and reference orders lost (08 §6.7) | No stored prompt is source of truth. Creative text lives in owned truth; the only stored prompt-shaped data is the creator's **Override**, which regeneration never rewrites (§8). |
| Hidden LLM prompt-wrapping steps and provider-side wrappers (09 §1.7, §2.5) | Scaffold wording is versioned data shown in the inspector (§8.3); provider-side rewriting is declared, switched off where possible, and recorded (§10.3). |
| Inputs to a later frame lost because the "previous shot" was an array neighbour (08 §6.3) | Continuity is resolved by the Shot model's one rule (SHOT-MODEL §6.4); the resolved source Attempt is a captured input. |

## 2. Designs compared

The ticket asks for competing intermediate representations judged against the critical invariant: *the generation context shown or recorded must faithfully describe what was actually sent; no silent truncation; no claimed reference the request does not carry.*

| | **D1. Text-first**: compile straight to one prompt string and a reference list per provider (V1's shape, fixed) | **D2. Typed layered Package, deterministic Fit and Render (chosen)** | **D3. Inputs-only**: record the captured inputs and recompile the prompt whenever it is viewed | **D4. LLM prompt author**: a model writes the final request from the context at send time |
|---|---|---|---|---|
| Shown equals sent | Yes if the string is stored; but nothing structured to audit | Yes: the stored Rendered request is what is shown, and the audit reads it back | **No.** Viewing recompiles with today's compiler and scaffold; V1's preview-versus-send failure by design | Only if the authored text is stored; the model's choices are not explainable |
| Truncation and omission visible | Only as a diff of strings; omitted text cannot be attributed to a source | Fit report names every layer and reference that was demoted or omitted, and why | n/a | Model may drop content silently; code cannot tell |
| Claimed versus carried references | Labels live inside prose; a mismatch is invisible | Labels are generated from the carried list; carried list is audited from the request | Same as D1 | Model may mention images it was not given |
| Precedence (identity over style, composition owns framing) | Encoded as string order inside templates; cannot be tested or varied by model | Layers have an owner and a scope of say; omission order is data (§5) | Same as D1 | Prompt-dependent, untestable |
| Override that survives upstream change | Whole-text only; becomes silently frozen | Layer-addressed; base fingerprint shows "base changed" (§8) | Overrides would have to be re-applied to recompiled text | Overrides fight the model's rewrite |
| Lineage: what was read | Cannot tell which unit is in which sentence; every upstream change marks everything or nothing | Each layer lists its units; carried content drives drift (§12) | Exact for inputs, but the reproducibility of the prompt is lost | Whole context captured; the output is not derivable |
| Reproducible record | Yes (string stored) | Yes, and recompile is deterministic so it can be self-checked (§13) | **No** after any compiler change | No |
| Provider independence (§17.2) | Dialect knowledge leaks into every template | Dialect confined to a data-plus-pure-function layer | Same as D1 | Model-dependent |
| Cost, latency | Free | Free (code) | Free | A paid L call on every generation, including every batch member |
| Failure mode | Honest strings that are hard to reason about | More concepts to build | Silent divergence between what was sent and what is shown | Hidden transformation; contradicts AI map rule 4 and V1's hidden wrappers |

**D3 fails the invariant outright and D4 fails the AI map's rule that compilation is deterministic** (§6.1 flow table, hand-off row #65: an LLM-authored shot prompt is admitted only as a creator-visible, editable stored Revision, never a hidden send-time transformation). D1 is the cheapest design that meets *shown equals sent* but cannot meet the omission, precedence, override and lineage requirements, because text with no structure cannot say which sentence came from which unit. **D2 is chosen.** D4's good part survives as a creator-invoked, stored Override (§8.5): "AI, describe this frame" writes a Revision a person can read, edit and retire.

## 3. The pipeline and the single-object rule

1. **Resolve** (reads, no writes). Modules supply the resolved truth for the target: the Shot slices, Presences with Looks resolved by position, the Direction's View by the ladder, Frames and continuity source, Visual Style, pinned Facts, project settings, the Override, the effective model. Each read produces a captured input `(unit, Revision, content fingerprint)` or a captured Attempt/Media id with the Slot choice that put it there. The result is an immutable **ResolvedInputs** value. The compiler never reads storage or the clock; the same ResolvedInputs and profile always give the same output.
2. **Compose** builds the Package from ResolvedInputs: layers (§4), candidate references (§6), typed parameters. Pure.
3. **Fit** (§7) applies the capability profile: chooses the input mode, selects and orders references, demotes or omits by the declared ladders, checks prompt limits, honors or reports parameters. It yields the fitted Package and the **Fit report**. If a Tier 0 element cannot fit, the result is a **blocked fit**, not a request.
4. **Render** (§10) applies the dialect and yields the **Rendered request**: ordered text parts, each tagged with its layer key and the digest of the layer text it carries; ordered media parts with Media id, content hash, role and position; parameters; and the list of rewrites the provider is known to apply.
5. **Record** stores Package, Fit report, Rendered request and versions on the Generation, then the Job runs (JOB-LIFECYCLE §1 rule 3).
6. **Dispatch**: the adapter receives the Rendered request only. It may serialise it; it may add nothing (guard P1).

**Preview, estimate, duplicate guard and inspector call steps 1–4 and write nothing** (Constitution §16 principle 11). The input fingerprint of JOB-LIFECYCLE §4 is `hash(target Slot, Rendered request digest)`. The estimate (BUSINESS-AND-OPERATIONS §3) is computed from the same Rendered request (reference counts and duration are billed quantities for some providers), so the price the creator saw and the request that ran cannot describe different things. When the creator acts from an open inspector, the action carries the digest that was shown; if recompiling now gives a different digest, the dispatch is refused with "inputs changed since you looked" and the inspector refreshes. A plain Generate with no inspector open carries no expected digest.

A batch member whose input is another member's output (JOB-LIFECYCLE §8) has an **estimate-grade Package** from the start (the pending reference is typed and sized but unbound) and is compiled **once more, and frozen**, at the moment its dependency binds. The frozen compile is what is recorded and sent.

## 4. The Package

### 4.1 Parts

- **Layers**: ordered. Each layer has a stable **key** (for example `identity:<presence id>`, `place`, `composition`, `action`, `dialogue`, `style`), an owning domain, an optional **scope of say** (§5), a **tier** (§7), **parts** and **sources**. A part of text carries one of four provenance kinds: `verbatim` (a Dialogue line or other protected text, with its line id; never altered), `composed` (assembled by code from owned truth, such as base description plus Look delta), `authored` (creator-written or Override text), `scaffold` (Aiuteur wording from versioned templates, §8.3). Sources list the captured inputs the layer was made from. A layer's **status** after Fit is `carried`, `demoted` (to a lighter form, see §7.2) or `omitted`.
- **References**: candidate and, after Fit, carried. Each has a role (§6.1), the subject it serves (a Presence, the Place, the Shot, the Style), the Attempt or Media id, the Slot choice that put it there, and its capacity cost.
- **Parameters**: typed and protected: aspect, resolution, duration (requested), count, audio on or off, seed if the model exposes one, avoid list. Parameters are values, never prose, and the renderer must send them or report them (guard P5).
- **Versions**: compiler version, scaffold version(s), dialect id and version, capability profile snapshot id. These are history, not drift reasons (LINEAGE §3.1 "model default changed" is not a reason).

### 4.2 Layer catalog

Layers are named for **who owns the truth**, not for V1's stages. A layer that has nothing to say is absent.

| Layer key | Owner of the truth | May contribute | May not contribute | Tier |
|---|---|---|---|---|
| `scaffold:operation` | Aiuteur (versioned wording) | What the request is (a still, a clip, an edit), how the carried references are to be used, the time projection (§9) | Story, appearance, style words | follows what it describes |
| `binding` | Settings and pinned Facts | Typed settings as parameters; **pinned Established Facts** in the creator's words | Anything not pinned | 0 |
| `composition` | the Shot (camera slice, Composition references) | Framing: size, angle, movement, screen direction, placement, rough pose; the delivery of Composition references | Appearance of subjects, place identity | 0 |
| `place` | the Location (identity, Direction, View) | Environment: what the place is and looks like from this Direction, with a delta statement when the View's direction differs from the shot's | Camera framing | 1 |
| `identity:<presence>` (one per on-screen Presence, in prominence order) | the Entity and its Look | The effective description (base plus Look delta, composed at use time) and the identity reference; for a Presence only a **handle** (name plus Look name) when its appearance is carried elsewhere (§9.2) | Style, framing, place | 0 (text) / 1 (image) |
| `moment` or `action` | the Shot (action slice, per frame role or per Segment) | What is visible at one instant (frames) or what happens over time (video) | Appearance not in the slice | 0 |
| `dialogue` | the Shot (Dialogue lines) | Verbatim lines with speaker handle and the shot-owned delivery | Paraphrase, additions | 0, each line atomic |
| `continuity` | the Shot's Continuity link | The base or source Attempt and what it is for ("recompose from this still") | Appearance beyond the base | 1 |
| `style` | the Visual Style Revision | Rendering terms (medium, palette, lighting, mood) and style references | Subject descriptions | 1 |
| `notes` | the Shot (visual notes) | Free creator text | Nothing is policed | 2 |
| `sound` | the Shot (sound notes, audio flag) | Ambience and effects | | 2 |
| `guidance` | the creator, for this Generation only | "What should change" (Constitution §10.2 step 7), optional | | 0 |
| `avoid` | scaffold defaults plus creator additions | Things to keep out (for example burned-in subtitles when dialogue is present) | | 2 |

Writing Style is **not** a media layer. It shapes written outputs only (§14).

### 4.3 Operation by layer

| Operation | Time projection | Layers carried |
|---|---|---|
| Entity identity image, Look image | still, neutral setting so the image carries identity and not a place | `scaffold`, `binding`, `identity:<self>` (the Look image is made with the base identity image as a reference), `style`, `guidance`, `avoid` |
| Location View (Direction by Look) | still | `scaffold`, `binding`, `place` (with the base View as a geometry reference for a Look), `style`, `guidance`, `avoid` |
| Frame (generated) | one instant at the role: opening, ending, or keyframe time | `scaffold`, `binding`, `composition` (movement excluded in the text, §9.1), `place`, `identity:*`, `moment`, `continuity`, `style`, `notes`, `guidance`, `avoid` |
| Frame edit | an instruction against a base Frame | `scaffold` (edit), the base as `edit.base`, `guidance` as the instruction, plus `identity:*`, `style` unless the creator switches them off |
| Video Segment (first or only) | action over the Segment's time range | all video layers (§9.2); `dialogue` for the lines partitioned into the Segment |
| Video Segment (continuation) | the next time range | the same layers, the previous Segment's extension source or its extracted last still, and the identity references again |
| Reference-driven video | as above | plus the footage Composition reference with its `uses` and subject mapping |
| Audio (Performance, voice) | the line | `dialogue` (verbatim), voice reference, delivery; owned by #69 (§14) |

Choosing which Presences are on screen, which Direction and which Look is not the compiler's job: those are already resolved by ENTITIES §§4–6 and SHOT-MODEL §4 and arrive in ResolvedInputs.

## 5. Precedence rules

Precedence in a compiler can mean only what the compiler controls: **what is included, in what order, under what label, which source is allowed to state which attribute, and what is dropped first when space runs out.** It cannot make a generator obey. The rules below are those four things, and the doc says so rather than implying obedience.

1. **Ownership before rank.** Each attribute class has exactly one owner layer, and a non-owner layer is composed so it does not state that attribute. Appearance of a subject: its Entity and Look. Environment: the Location. Framing: the Shot's composition. Rendering look: the Visual Style. Words that the creator wrote into a free-text field are included as written (nothing parses or edits them), so this rule bounds what *code* contributes. (Constitution §6.1, §8.2.)
2. **Binding first.** Pinned Facts and typed settings come before everything else and are never outranked by a compiled layer. A *creator Override* may contradict a Fact: Facts bind AI, not the author.
3. **Identity before style.** Identity layers are placed before the style layer in the text; identity references are placed before style references; the scaffold states that style applies to rendering and that identity features come from the identity references; under budget, style is demoted or omitted before any identity text or image is. (§6.1: identity outranks style.)
4. **Composition owns framing.** The `composition` layer precedes the scene layers. A View, a continuity base or a footage reference is labelled by the scaffold as environment, base or staging only, with a **delta statement** when its angle differs from the shot ("the reference shows the kitchen at eye level; frame this from above; keep the layout"). Footage references never supply identity (ENTITIES §9), so only the mapped Presences' identity layers appear.
5. **A creator's explicit text wins over compiled text at its layer.** An Override replaces that layer's compiled content exactly (§8).
6. **Established order and omission order are data.** The canonical order is: `scaffold:operation`, `binding`, `composition`, `place`, `identity:*` (by prominence), `moment` or `action`, `dialogue`, `continuity`, `style`, `notes`, `sound`, `guidance`, `avoid`. Omission goes lowest tier first and, inside a tier, from the end of that order (§7).
7. **Prominence** (which Presence's identity is placed first and keeps its image when image slots are scarce) is a deterministic tuple: speaks in this package's dialogue; mapped in a Composition reference; then order of first Mention in the shot's anchor. The creator may reorder (§8.2). No model decides it.
8. **Conflicts between free-text layers are not detected.** The accepted limit of R3 stands: a free-text prompt override cannot be checked against upstream meaning. Structured paths (Presence overrides, camera facets, Look overrides) use write-back or deviation (LINEAGE §5); free text is only marked "prompt overridden".

## 6. References

### 6.1 Roles (replaces V1's list, which was shaped by its stages)

| Role | Source | Subject | Degrades to |
|---|---|---|---|
| `frame.first`, `frame.last`, `frame.key@t` | approved Frame of a Frame plan role, a pinned or derived continuity source, or an extracted still | the Shot | `reference` use of the same image, then text (SHOT-MODEL §6.1) |
| `identity` | the Look image, else the base identity image of a Presence | one Presence | text description only |
| `environment` | the active View by the ladder (ENTITIES §5.3) | the Place | its rung's lighter form, down to text |
| `composition` | a Composition reference's media (`layout` or `footage`) with its `uses` | the Shot or one Frame role | omitted with a report, plus the offer to use the frame path (SHOT-MODEL §8.4) |
| `style` | the Visual Style's reference images | the Style | folded into style text when the style has text; else fewer images |
| `edit.base` | the Frame being edited | the edit | none: without it the operation is not an edit |
| `extend.source` | the Segment being extended | the Segment | the extracted last still as `frame.first` (SHOT-MODEL §7.2) |
| `audio.performance`, `audio.voice` | supplied Performance, Voice definition | a line, a character | none |
| `added` | a creator-added reference (§8.4) | named by the creator | none |

### 6.2 Selecting and ordering

1. **Build candidates** from ResolvedInputs; give each a role, subject and a priority class: pinned frames first, then identity (by prominence), environment, composition, style, added.
2. **Choose the input mode** from the profile's declared mode sets (§10.4): pinned-frame mode when the plan has approved frames for roles; otherwise reference mode if the model has one; a hybrid when the profile declares frames and references combinable; text-only otherwise. If the shot needs both and the model's modes are exclusive (documented for Wan 3.0 on 2026-10-21: first/last frame and reference inputs "are mutually exclusive"), pinned-frame mode wins, because the approved frame already carries identity, location and style; the identity references are reported as `carried-by` the frame, not claimed (§7.1).
3. **Fit to capacity** (§7.2): total and per-role maxima, and the soft "works best up to N" figures the profile declares, in priority order.
4. **Order**: pinned frames, then identity (by prominence), environment, composition, style, added. A dialect that requires a different order or typed slots maps from this canonical order; the canonical order is recorded as well as the sent one.

### 6.3 What a reference may contribute

Reference Media and footage contribute composition, staging, motion or style as `uses` says, never identity (ENTITIES §9). The Package lists two disjoint sets: **identity sources** (the mapped Presences' own images) and **reference contributions** (composition media and what each is used for). SHOT-MODEL invariant 11 is checked on this set.

### 6.4 Labels are computed, not written

Some models bind text to media by position ("Image 1", "Video 1" refer to the order of the `media` array; Wan 3.0, 2026-10-21). Only **scaffold** parts may contain positional labels, and they are generated from the final carried order at Render. Creator-editable layers are written without positional labels. Reordering or removing a reference re-renders the labels. If a creator edits a scaffold part by hand it becomes `authored` and frozen; then a deterministic lint (guard P8) quietly notes any `Image N` token whose N exceeds the carried count. The carried-reference panel in the inspector is always built from the Rendered request, so the panel cannot disagree with the request even when a creator's own sentence does.

## 7. Fit: how the Package meets the model's limits

### 7.1 Outcomes (closed vocabulary)

Every layer and reference ends Fit with exactly one outcome, recorded with a reason code and, for creator display, one quiet sentence.

| Outcome | Meaning |
|---|---|
| `carried` | In the request as composed. |
| `carried-as-reference` | A frame role the model cannot pin, used as a reference instead ("this model can't pin a middle frame"). |
| `carried-by` | Another carried input already provides it (for example the approved opening frame carries Marcus's appearance, so only his handle is in the text). The provider is not told something the request does not hold. |
| `demoted` | Lighter form: image to text, View to a lower ladder rung, appearance text to handle. |
| `omitted-optional` | A Tier 2 layer or an optional reference left out for space. |
| `param-honored`, `param-adjusted`, `param-in-text`, `param-unsupported` | For a typed parameter: sent as a parameter; sent after normalisation to a supported value (requested and sent values both recorded, for example 7 s sent as 8 s, [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md) §5); requested only in prose (not guaranteed, said so); not available on this model. |
| `blocked` | A Tier 0 element does not fit. The Generation is not dispatched. |

### 7.2 Tiers and the order of loss

- **Tier 0, never omitted or cut**: `binding`, `composition` text, `identity` text of an on-screen Presence, `moment` or `action`, every Dialogue line (atomic: a line is wholly in or the Fit is blocked), `guidance`, and the scaffold wording that explains a reference that is carried.
- **Tier 1, demoted before omitted**: identity images, `place`, `continuity`, `style`, and the references behind them.
- **Tier 2, omitted first**: `notes`, `sound`, `avoid` extras.

Loss order: Tier 2 from the end of the canonical order, then Tier 1 demotions along each role's ladder (§6.1), lowest priority first; never Tier 0. Style goes before place, place before identity images (rule 3 of §5).

### 7.3 No silent truncation

1. **Fit never shortens text inside a layer.** Text is in, in whole, or the layer is demoted or omitted whole and reported.
2. **Limits are measured with the profile's declared counter** (unit: characters or tokens; counter; safety margin). An approximate counter is made conservative by the margin.
3. **Over-limit means not sent.** If Tier 0 alone exceeds the limit, the result is a **blocked fit**: "this request needs about 1,340 tokens; this model takes 1,024". The creator is offered: another model, editing the long layer (an Override), or turning off an optional layer. "Send anyway" is not offered, because the provider may truncate or reject and Aiuteur could not then say what was received. This is a physical limit with exits, not a gate. Provider behaviour confirms why: Wan 3.0 documents that content over 20,000 characters "will be automatically truncated" (fetched 2026-10-21).
4. A provider rejection for input size that slips past a conservative counter is a Job failure (`input_rejected`, never auto-retried with a shortened prompt), and the counter is corrected in the profile.

## 8. Stored creative text, compiled output, scaffold and Overrides

### 8.1 What is stored where

| Thing | Where it lives | Mutable |
|---|---|---|
| Action, dialogue, notes, camera, composition | the Shot's slices (SHOT-MODEL §2.1) | by Revision |
| Entity and Look descriptions, images, Views | the Entity (ENTITIES) | by Revision / Attempt |
| Visual Style text and references | the Visual Style | by Revision |
| Pinned Facts | the Ledger | by Revision |
| **Compiled prompt** | nowhere as truth. A derived value. | n/a |
| **As sent** (Package, Fit report, Rendered request) | the Generation (Record) | never |
| **Override** (creator's persistent layer and reference edits for a Shot) | the Shot's `prompt override` slice (SHOT-MODEL §2.1 reserved it; shaped here) | by Revision |
| One-off edits and guidance for a single send | the Generation that used them | never |

There is no `frame_prompt` or `video_prompt` field. "Regenerate the prompt" is not an operation: changing the shot or the entity changes what compiles. Where an LLM can make text better than code (describing a frame's end state, shortening a layer), it does so only by the creator invoking it, and the result is an Override Revision with AI provenance (§8.5).

### 8.2 Override items

An Override is a set of items, each addressed by a **target** (the Shot's video, or one Frame role) and a **key**:

| Item | Effect |
|---|---|
| `replace(layer key, text)` | The layer's text is exactly this text. |
| `add(note)` | A creator layer, placed with `notes`. |
| `disable(layer key)` | The layer is not composed. |
| `ref.exclude(source)`, `ref.include(media, role)`, `ref.prefer(subject, rank)` | Edits to candidates by **source and subject**, never by index, so they survive a change of model. |
| `param(tunable, value)` | Only for parameters the profile declares as tunable (for example duration target, seed). |

Overrides apply to the **Package, before translation**, so they are portable across models. The creator edits layers in the inspector, which shows the segmented prompt, the carried references with roles and reasons, the Fit notes and the digest. Opening it, and never opening it, are both fine: the inspector is an escape hatch (§10.3, §13.5), not a step.

### 8.3 Scaffold versus creator-editable layers

The scaffold is Aiuteur's own wording that explains a request to a model: what is being made, what each carried reference is for, the frozen-instant or over-time directive, the delta statements, default avoid items. It is selected by `(operation, carried roles, dialect)`, **versioned**, and carries no story, appearance or style. It is **shown in the inspector like every other layer** and **editable like every other layer** (Constitution §13.5 says the exact prompt is editable, so a hidden, uneditable scaffold, V1's "system scaffold prompts never editable", is rejected). Editing a scaffold part turns it into frozen `authored` text, recorded as an Override, and the P8 lint applies. Recorded history of scaffold wording is by version id, because a wording change is a compiler change, not an upstream change.

### 8.4 Reference overrides and identity

A creator can add any Media or Attempt as a reference with a role. Roles other than `identity` contribute what the role says. An added reference that the creator wants to act as a character's identity is **not** a reference: it is a Deliberate local deviation on that Presence for this shot (LINEAGE §5.4), so "identity is defined once" holds and the usual write-back offer appears. Reference Media never contributes identity.

### 8.5 AI-written Override text

Workflow operations such as "describe this frame" or "shorten this layer" are creator-invoked, run as Generations (their own call logs), and write an Override Revision with AI provenance. Nothing writes an Override on the model's initiative (G10).

### 8.6 What happens when upstream truth later changes

Each `replace` or `add` item records the **base**: the fingerprint of the compiled layer text it replaced and the fingerprints of that layer's source units, at the time of the edit.

| Situation | Behaviour |
|---|---|
| Upstream unchanged | Item is in effect, nothing shown. |
| Upstream units of the layer changed after the edit | The item **stays in effect** (the creator's text wins, rule 5). It carries a quiet **base changed** note, shown beside the layer and as a row in the to-reconcile list (the R3 list). Exits: **Keep mine** (an Acknowledgement `kept` at the current base fingerprint), **Use the new text** (a new Override Revision without the item), **Edit** (re-stamps the base), or the optional creator-invoked AI assist "update my edit for the new text" (§8.5). |
| The layer no longer exists (Presence removed, role retired) | The item is **inert** and listed in the review tray. It is never deleted (retire, not delete); it applies again if the layer returns, and exits are Keep, Retire and Re-target. |
| Model changed | Layer items persist. Reference items keyed to roles or subjects persist. Fit is recomputed and any difference is in the new Fit report. |
| Locks | An Override is a shot-owned slice; the write gate and locks apply to it (LINEAGE §6). A one-off edit made for a single send is not a Revision and never blocks Generation. |

### 8.7 Override lineage rules

1. The Override items **applied** to a Generation are captured inputs `(shot, item key, Revision, fingerprint)`. A change, removal or addition of an applicable item drifts the work as `prompt-override-changed` (the existing reason, LINEAGE §3.1).
2. The upstream units of an **overridden layer were not read** for that layer's text, so they are not captured for it, and a change to them does not mark work made with the override. The signal lives on the Override item (§8.6), which is where the creator can act on it. Other units of the same Presence (its image, for example) are captured and mark normally.
3. A Take made with an override is shown "prompt overridden", never flagged because of it.
4. A Basis re-stamp or a redraft never touches an Override (SHOT-MODEL §5.4: creator settings are never changed by redraft).
5. Regenerating, duplicating a project and restoring a Shot Revision carry Override items with remapped ids like any slice (LINEAGE §7).

### 8.8 Guidance

"What should change" (Constitution §10.2.7) is optional text entered at Generate or Regenerate. It becomes the `guidance` layer for that Generation only, recorded on it. "Keep for this shot" turns it into an Override item. It is never required (V1's mandatory Why box is rejected, Constitution §17.2).

## 9. Frame versus video compilation

There is **one Package type and one compiler**. Frame and video differ in two ways the compiler derives, not in two prompt taxonomies.

### 9.1 Time projection

- **Frame**: a *moment*. The `moment` layer is the Shot's action slice presented with a scaffold directive chosen by the role: opening ("depict the first instant of the action below, before it unfolds"), ending ("depict the instant after it completes"), keyframe at t ("depict the state at t"). The camera layer carries size, angle and notes; movement is not directed in a still. Dialogue, sound and duration are absent.
- **Video Segment**: *action over time*. The `action` layer is the Shot's action text (partitioned for a Segment); `dialogue` carries the Segment's lines verbatim; camera movement, sound notes, and the duration parameter are present.
- A role-level text that says exactly what the frame shows (for example the end state of the action) is an **Override `replace` on that role's `moment` layer**. It is optional, and may be written by the creator or drafted on request by "describe this frame". No new Shot field is needed.

### 9.2 What the image already carries

The video compile asks of every layer: *is its job already done by an input the model will condition on?* If the approved opening frame is pinned as `frame.first`, appearance of the Presences, the place and the style are already in that pixel truth. The compiler then marks those layers `carried-by` the frame and renders **Presence handles only** (name plus Look name, so a speaker is attributable to a visible person), no appearance text. When the Shot has no frames (direct-to-video, SHOT-MODEL §6.1), or the model cannot take a first frame, the same layers are carried in full with identity references. The difference between the framed and direct paths is thus an outcome of inputs and capability, not a second set of rules. Restating appearance next to a pinned frame risks contradicting it; leaving it out when no frame exists leaves the model guessing.

### 9.3 Segments

For an over-length Shot (SHOT-MODEL §7) the realization plan comes out of Fit (profile durations, extension, first and last frame support) and is recorded on each Segment Generation. Each Segment has its own Package: the same identity, place and style layers; `action` and `dialogue` as the verified partition (an L proposal checked by G2, G3, G9; the proposal and its verdict are in that Generation's call log); and `extend.source` or the extracted still as `frame.first`. Per-segment text edits are one-off by default, recorded on that Segment's Generation, because the plan is a function of the model and would otherwise attach edits to a segmentation that changes with it. Layer items that belong to the whole Shot (identity, style, notes) are Overrides as usual.

### 9.4 Reference-driven shots and composition

A footage Composition reference becomes a `composition` role reference with a scaffold clause "use for framing and motion; replace its subjects with the identity references; ignore its background unless `uses` includes it". The compiler delivers it best-effort (SHOT-MODEL §8.4) and reports the delivery quality quietly: the research does not document faithful whole-frame composition adherence for any reviewed model.

## 10. Provider-specific translation

### 10.1 Dialects are data plus one pure function

A **dialect** turns a fitted Package into a Rendered request. It declares: how layers join (one string with section markers, several fields, structured JSON); how references are encoded (positional list, typed slots, role-capped groups); how parameters map; how the avoid list is delivered (a negative-prompt parameter, or prose where there is none, recorded as such); the counter for the prompt limit; and the rewrites the provider applies. Product concepts (layers, roles, tiers) never mention a vendor (Constitution §17.2, §16 principle 13). A new provider is a new dialect and a profile (#66), and no change to layers or to the Package.

### 10.2 Translation is last and cannot add content

Render may arrange, wrap and encode. It may not add story, appearance, style or reference. The wrappers it adds are declared in the dialect, and each text part in the request carries its layer key and layer-text digest so a test can strip the wrappers and recover the layers exactly (guard P4).

### 10.3 Provider-side rewrites

Some providers transform the prompt after receiving it: Wan 3.0 documents `prompt_extend`, default true, where a language model rewrites the prompt (fetched 2026-10-21). Rule: the profile declares each rewrite as `controllable` or `always`. A controllable rewrite is **turned off** in the request so the model reads what the creator can see. An `always` rewrite is recorded as `provider_rewrite: always` on the Generation and shown ("this provider may rephrase your prompt"). When the provider echoes the rewritten text, it is stored with the output as `provider_echo`. The record never claims the provider read exactly the sent text when a rewrite applied.

### 10.4 What the compiler needs from the capability profile (hand-off to #66, resolved in [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md) §4)

Input modes and which input roles each mode allows together; maximum references in total, per role, and soft "best up to N" figures; whether first, last and keyframes are pinned (count, positions); extension (same-model, input constraints, resolution); duration set, minimum and maximum, step; aspect and resolution sets; audio on or off; negative-prompt support; seed support and its documented guarantee; prompt limit, unit, counter and margin; per-reference constraints (aspect ratio range, size, face policy); declared tunables; declared provider rewrites; whether the provider echoes the effective prompt; how references are bound to prose (positional labels, typed roles, none). Everything the Fit report reasons about must come from here; the compiler holds no per-vendor rule.

## 11. The recorded package (what a Generation stores)

Meeting LINEAGE §3.3, written before any provider call:

| LINEAGE §3.3 clause | Recorded as |
|---|---|
| 1 Target | target Slot or object, output kind (Attempt, Option, AI-made Revision), Segment index and time range if any |
| 2 Captured inputs | the union of every layer's sources and the Override items applied, as `(unit, Revision, fingerprint)`; adjacent shot or scene context if read; upstream document Revisions for text |
| 3 Attempts and media | every carried reference by Attempt id, Media id and content hash, role, subject, the Slot choice that put it there, canonical and sent position; derived inputs (an extracted still) as Media with `derived_from` and method |
| 4 Resolved payload as sent | the Rendered request in full: text parts in order with layer keys, media parts, parameters, avoid list, declared provider rewrites; its digest |
| 5 Model | provider-neutral model id, capability profile snapshot id, dialect id and version, compiler version, scaffold versions |
| 6 Initiator and authority | creator action id, action group, the estimate shown, expected digest if the creator acted from an inspector, actual cost later |
| 7 Outcome | outputs, failure, Jobs, provider echo, any adoption of a late result |

Plus: the **Package** (layers with provenance kinds and statuses), the **Fit report**, and the **call log**.

**Call log** (the shape the AI map left to #65). A Generation holds an ordered list of **calls**. For a media operation one call is the provider request. For an L operation each draft, repair, check and partition call is a record `{role, rendered request, model, response (raw kept), validator verdicts, cost}`. Text calls use the same Package and Rendered request types (§14), so one inspector shows both.

Inputs are fixed at dispatch and never re-read at completion; omitted-but-considered units are listed in the Fit report as `considered, not sent` but are **not** captured for drift, because they did not reach the provider and a change to them cannot make the output out of date (LINEAGE §3.3 (b)).

## 12. How layers map to lineage

- A layer's sources are exactly what drift is computed from. A Take made with `identity:marcus` (full) captured Marcus's description slice and Look image; one made with a handle only captured the name and Look name, and the approved frame instead.
- `carried-by` is a lineage relationship: the video captured the frame Attempt, and a change of that frame is `frame-changed`; a change of Marcus's description marks the **frame** (`identity-changed`) and the video through `upstream-pending`, which is already the specified chain.
- `prompt-override-changed` is §8.7 rule 1. `settings-changed` covers aspect, format and rating. `style-changed` covers the Style Revision. A pinned Fact added, edited, withdrawn or un-pinned is `fact-changed`: the set of carried Facts is a captured input.
- Not reasons: a compiler, scaffold, dialect or profile change; a model default change; Fit outcomes (they depend on the model, which is recorded history).

## 13. The reproducibility contract

What Aiuteur promises, and what it does not.

1. **Exact record.** The Rendered request, with media by id and content hash, parameters and declared rewrites, is stored immutably before dispatch. What the inspector shows is read from it. If the provider's wire encoding differs only in serialisation, the digest is of the Rendered request, and adapters are tested to prove no content difference (§15, P1).
2. **Deterministic compile.** Compile is a pure function: no clock, no randomness, no ambient configuration; text is normalised the same way every time; stable ordering. Same ResolvedInputs, profile snapshot, compiler and scaffold versions give a byte-identical Rendered request. A compiler or scaffold change that alters output for an unchanged input must bump the version (golden digest tests, #76).
3. **Two ways to re-run.** *Re-run exactly* re-sends the recorded Rendered request (the media are immutable and retained), as a **new Generation** with `rerun_of`, under the usual spend rules. *Re-run with today's compiler* recompiles against the captured Revisions. The creator can see the difference as a digest comparison and a layer diff.
4. **No promise of identical output.** Providers document seeds as non-reproducible (Veo "doesn't guarantee determinism"; Wan "same seed may still produce results that are not identical", research #5 A6, re-read 2026-10-21). Aiuteur records the seed it requested and any effective seed the provider returns, and never presents a re-run as a repeat. "Same inputs, similar result" is the most it says.
5. **Dispatch-time freeze.** Inputs are captured once at dispatch, and for a dependent batch member once at binding. A failed or cancelled Generation is still fully inspectable, and a result that lands after upstream changed arrives already flagged (LINEAGE §3.4).
6. **Reading writes nothing.** Preview, estimate and inspector compile and discard.

## 14. Text and audio packages

The same contract applies to the two other families the AI map names.

- **Text operations** (documents, descriptions, shot drafting, the fact check, partitioning) use the same Package, Fit and Rendered request types, with text layers: `scaffold:operation`, `binding` (**all** Established Facts, as AI map §4.3 requires for drafting), `base` (the document or selection, read-only context, with verbatim handles per AI map §4.1), `instruction` (the creator's words), `writing style`, and operation-specific inputs (the AI map §8 "Inputs" column). Precedence: Facts, then protected spans and verbatim handles, then the creator's instruction, then Writing Style. **Writing Style** (Constitution §6.2, IMPORTANT) may shape voice, diction and format of new text only; it cannot add or change events, facts or dialogue content, and it carries no weight against a Fact or a protected span. It is a captured input of text Generations (`writing-style-changed`, which marks text work only, LINEAGE §3.1). Context that does not fit is not truncated: the operation's pipeline decomposes (AI map §6.1) and each Generation lists which context it carried.
- **Audio operations** (a Performance, voice transformation, speech): `dialogue` is a Verbatim part (the line is the supplied text, never rephrased), the voice reference and delivery are layers, and the authorisation check is a precondition (AI map §9, #69). Details belong to #69; the Package, Fit report, Rendered request and call log are unchanged.

## 15. Guards on the Package (testable without a model)

| Id | Guard | Enforces |
|---|---|---|
| **P1 One object** | The adapter accepts only a Rendered request identified by its stored digest; the wire body captured by a provider fake decodes to the same content as the recorded request. | Shown equals sent. |
| **P2 Carried set** | The list of media parts parsed from the Rendered request equals the Package's carried list, in order; any mismatch is an internal fault and nothing is sent. | No claimed reference the request lacks, and no carried reference unlisted. |
| **P3 Verbatim** | Every `verbatim` part occurs in the Rendered request exactly, once, in order. | Dialogue and protected text are unaltered. |
| **P4 No truncation** | Each text part carries its layer key and layer-text digest; stripping dialect wrappers recovers every non-omitted layer in whole. | No text is cut. |
| **P5 Parameters** | Every protected parameter appears in the request or has a `param-unsupported` or `param-in-text` entry. | Aspect ratio and duration cannot be lost again. |
| **P6 Capability honesty** | A reference or frame role the model cannot carry has an outcome in the Fit report and is absent from the request. | No overclaim. |
| **P7 Record first** | The Generation holds Package, Fit report and Rendered request before the first provider call. | LINEAGE §3.3. |
| **P8 Claims lint** | A creator-edited text part naming `Image N` (or the dialect's binding token) with N above the carried count yields a quiet note. | A hand-written claim cannot go stale unnoticed. It never blocks. |
| **P9 Override fidelity** | An overridden layer's text in the request equals the Override text exactly. | Creator text is not rewritten. |
| **P10 Rewrite disclosure** | A provider rewrite is either disabled in the request or recorded as `always`. | Honest about what the provider read. |
| **P11 Read-only preview** | Compile calls for preview and estimate create no record. | Reading writes nothing. |

P2 is computed from the request, not from the Package, deliberately: a guard that trusted the object it checks would reproduce V1's bug.

## 16. Hand-offs

| Ticket | Receives |
|---|---|
| **Providers and models** (#66) | §10.4 as the profile's required content; dialect as data plus a pure function; rewrites declared `controllable` or `always`; counters and margins; tunables; how each adapter proves P1 (wire capture). Mode sets and role compatibility are inputs to Fit, so no profile may be hard-coded into the Shot or the Package. |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)) | The compiler is a pure module with no IO: ResolvedInputs and a profile in, Package and Rendered request out. Resolve is separate and reads through the owning modules' interfaces. No other module builds prompt text; prompt text exists only as Layer parts. The Generation module owns the record and the single code path that dispatches a Rendered request. Overrides are shot slices through the write gate. |
| **Verification architecture** (#76) | §15 guards and §17 fixtures; golden digests for compiler and scaffold versions; wire-capture parity for every adapter and fake; a property test that carried-set equality holds under random reference counts and capacities; a no-truncation property over random layer sizes and limits. |
| **Scene and shot workspace** (#60), **Candidate review and playback** (#62), **Shot planning inputs** (#61) | The inspector content model (segmented layers with provenance, carried references with roles, Fit notes, digest, price) as an on-demand surface that no flow requires; "prompt overridden" and "base changed" as quiet marks on the existing to-reconcile list; Frame role `moment` text is an Override item, with an optional "describe this frame"; reorder, include and exclude of references by subject; the blocked-fit message and its exits. Presence of a Take's recorded request in compare views. |
| **Lineage and staleness** (#54) | §11–§12: layers map to captured units; `carried-by`; the Override rules; the carried set of pinned Facts as a captured input. No new reason code. |
| **Job lifecycle** (#67) | Fingerprint is `hash(target Slot, Rendered request digest)`; estimate-grade Package until a dependency binds, then one frozen compile; `input_rejected` as a non-retried failure for a size rejection. |
| **Business and operations** (#68) | The estimate reads billed quantities from the Rendered request (duration, count, references where priced), so it cannot diverge from what is sent. |
| **Interview and Ledger** (#57) | A Fact has a quiet "carry into visual generation" mark (pinned). Visual and audio style Facts default to pinned as an AI-made choice, the creator toggles it. Other Facts bind upstream: description compilation, shot drafting and the like are fact-checked (G6) before media is made from them, and media steps do not re-judge Facts (AI map §4.3.5). |
| **Entities and Looks** (#53), **Shot model** (#55) | Compose reads Presences, Looks, View ladder results, camera slice, Composition references with mappings, Frame roles, Continuity link; nothing new is required of them. The Shot's `prompt override` and `model override` slices take the shapes in §8.2. |
| **Voice and performance** (#69) | §14 audio packages; dialogue as a Verbatim part; Performance and voice references as roles. |
| **Persistence** (#72) | Package, Fit report, Rendered request and call log are Record data on the Generation (append-only, never pruned with Jobs); media by id and hash; derived stills are Media with lineage; the Override is an ordinary slice. |

## 17. Invariants and fixtures the spec should test

1. The Rendered request recorded equals the request a provider fake received, for every adapter (P1).
2. For random reference counts and capacities, the media parts of the request are exactly the Fit's carried list (P2); a candidate beyond capacity is demoted or omitted with a report, never listed.
3. For random layer sizes and limits, either every non-omitted layer appears whole or the Fit is blocked (P4). A blocked Fit produces no Job.
4. Every Dialogue line appears once, in order, byte-identical (P3), including a line near the limit (atomicity) and a line containing quotes.
5. Aspect ratio, duration, resolution and audio flag are in the request or reported (P5), on a model that lacks the aspect.
6. Compile is deterministic: the same ResolvedInputs give the same digest in repeated runs and across processes; changing a scaffold string without bumping the version fails a golden test.
7. An Override `replace` survives a model change; a reference `exclude` keyed to a source survives a change of model; a change to the overridden layer's source marks "base changed" on the item and does not mark the Take; a change to the Presence's image marks the Take.
8. A creator who opens the inspector, edits a layer and presses Generate sends exactly the digest shown; if upstream changed meanwhile the send is refused and the view refreshes.
9. Opening, previewing and estimating write nothing (P11).
10. A shot with an approved opening frame on an exclusive-mode model carries the frame only and reports the identity references as `carried-by`; the same shot with frames skipped carries identity references in a reference-mode model and full appearance text.
11. Reference Media never appears as an identity source (SHOT-MODEL invariant 11); an added identity reference is a deviation, not a reference.
12. A provider rewrite is off in the request or recorded as `always`.

Golden fixtures: a three-character shot on a model that takes two identity images (the third is demoted to text and reported); a 22 s shot as three Segments with a dialogue line at a boundary; a Look change at a scene boundary (the resolved Look is in the Presence layer and the Take drifts `look-changed` only when its fingerprint differs); a project with no Visual Style (the AI-made default is carried and recorded); a footage reference with two subjects, one mapped, one removed; a prompt 5 tokens over a 1,024-token limit (blocked, exits offered); an Override authored on model A and a Take generated on model B; a late result after timeout (lands flagged because its recorded Override item was since changed).

## 18. Constitution check

§10.3 and §13.5 are met without a required step: the exact request is stored, shown on demand, and editable per shot at the layer level; the creator who never opens the inspector loses nothing. §16 principles 10 and 11: the record is the request and reading writes nothing. Principle 13 and §17.2: provider formats are confined to dialects; layers, roles and tiers are provider-neutral. §6.1: identity precedes style in order, scope and loss order. §8.2 and §6.6: owned scope of say and the identity-source/reference-contribution split. §14.2: pinned Facts bind media packages and all Facts bind drafting; the honest limit stands that no code can force a generator to obey, and that free-text overrides are not checkable (R3). §3 (4), intent survives translation: translation can neither add nor cut content, and what the model cannot carry is reported. §6.2: Writing Style is a text layer (§14). §16 principle 9: a blocked fit stops one impossible request and always has exits; it is not a gate on the workflow. **No CORE or IMPORTANT requirement was found unworkable. No `CONSTITUTION AMENDMENT REQUIRED` is raised.**
