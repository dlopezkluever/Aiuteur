# Aiuteur V2: Voice, Performance and Voice Transformation

Resolution of Wayfinder ticket #69. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). Placement is fixed by [Record 5 §8](../product/CREATOR-RATIFICATION-RECORD-5.md#8-vp-voice-and-performance-placement) (VP1–VP5) and is not reopened. The scope split is Constitution §11 (settled). Machinery reused, not replaced: the object classes of [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md) and [`LINEAGE-AND-STALENESS.md`](LINEAGE-AND-STALENESS.md), the Package of [`GENERATION-PACKAGE.md`](GENERATION-PACKAGE.md), the Catalogue and verdicts of [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md), the Take-as-Segments model of [`SHOT-MODEL.md`](SHOT-MODEL.md) §7, the spend rule of [`BUSINESS-AND-OPERATIONS.md`](BUSINESS-AND-OPERATIONS.md) §3. The one hard-to-reverse choice is [ADR 0025](../adr/0025-a-dialogue-line-has-one-chosen-line-audio-and-voice-work-passes-an-authorisation-gate.md). No schemas, endpoints or vendor SDKs are chosen. Provider facts are dated and are evidence, not requirements (§9).

**No `CONSTITUTION AMENDMENT REQUIRED`.** Every IMPORTANT capability has a realization and a designed fallback (§5). Honest limits are recorded as codes (§8): no model guarantees a voice or a verbatim line, speech-to-speech timing is not guaranteed, lip-sync excludes some non-humanoid characters. None contradicts §11. One **Creator Review** item (§11) concerns a fallback preference; the document proceeds on a marked provisional default.

## 0. The decision in one page

```diagram
 WORLD DEFINITION (VP1)                         GENERATE → Takes drawer → Dialogue (VP2, VP3)
 Character ── Voice 0..1 (Editable, Revisions)  Dialogue line ── Line audio Slot (one chosen, a Decision)
               ├ Voice sample 0..* (Supplied)                        ├ Performance        (Supplied: recorded / uploaded)
               ├ description (text)                                  ├ Transformed        (Attempt: "Speak as <voice> · $x")
               └ Voice authorisation (Decisions)                     └ Spoken line        (Attempt: "Speak line as <voice> · $x", §11)
                         │                                                       │ none chosen → native dialogue (CORE, VP5)
                         ▼                                                       ▼
        Package: layer voice:<presence> + role audio.voice      Package: role audio.line (+ Dialogue track, offsets)
                         └──────────────► compile ◄──────────────┘
                                   Fit/plan picks a path (§5): native · audio-driven · lip-synced · laid-on (voice-over)
                                   authorisation gate in the dispatch gate (F3) for clone / transform
```

1. **Voice is a Character-owned definition**, not a provider object. It is text plus creator-supplied samples. A provider-side clone is a rebuildable, per-project handle created on first use, never the Voice itself (§1.1, §6.4).
2. **A Performance is Supplied creator material** (class 2): immutable, retired never deleted, copied with the project. It is never an Attempt. Everything derived from it (a voice-transformed version, a transcript) is a separate Attempt or rebuildable annotation (§1.2).
3. **The seam is the Line audio Slot**: one per Dialogue line, candidates from three sources, one chosen. With none chosen the line is native dialogue and nothing here is involved (§1.3).
4. **Authorisation is an append-only Decision stream** attached to a Performance or a Voice, checked by one deterministic gate in front of `submit`. Revocation stops new use, deletes provider-side handles, marks dependants, and never deletes a Take (§2).
5. **Timing follows the audio.** A chosen Line audio is never trimmed, stretched or regenerated for length. The Take is made long enough (reported against the Shot's own approximate duration, which is not changed), and short audio is reported, not padded (§3).
6. **Four realization paths with a deterministic preference and fallbacks**; none requires a Constitution change (§4–5).
7. **Everything is a Generation under the existing rules**: priced on the control, creator-initiated, one click under the line, recorded Package, fail-closed Catalogue, content-free logs (§7).

## 1. The seam

### 1.1 Voice

| Aspect | Rule |
|---|---|
| Owner, class | The Character (ENTITIES §1, Voice 0..1). **Editable**: Revisions with provenance. Travels in the entity closure. Dormant when the Character becomes a Prop or Extra type (ENTITIES §3), recoverable. |
| Content | A **name** (optional), a **description** in plain words (accent, pitch, pace, age, manner; the only thing the native path can use on models without reference audio), a **kind**, and the **samples**. Kinds: `described` (text only; CORE-compatible; the default when only a description exists), `reference` (samples carried as reference audio to models that take it, §5), `cloned` (samples used to create a provider voice handle), `stock` (a provider preset chosen by the creator; no human voice involved). Kind is derived from what the Voice holds and which Offering uses it; the creator never has to name a kind. |
| **Voice sample** | **Supplied** (class 2) audio (or video with audio) Media in the project; immutable; attached to the Voice with a role (`reference`) and an order. Many are allowed. Samples carry the project's private Media rules ([ADR 0022](../adr/0022-media-is-private-project-owned-and-copied-never-shared-across-projects.md)): they live **at project level**, are copied on duplicate, and are purged with the project. A sample is never shared across projects or accounts. |
| Selection of samples | The profile states how much reference audio a use accepts (count, per-clip and total seconds, formats). Fit carries **whole samples** in the creator's order that fit; a sample that does not fit is **omitted with a report**, never cut (nothing silently trimmed). The creator can make a shorter sample themselves by upload. |
| Applies to the film | The Voice resolves per Presence at compile time like a Look (ENTITIES §6): the Presence's Character's current Voice Revision. No per-shot Voice. A shot-level override of the Voice is **not** a feature; the nearest equivalent is choosing a different Line audio. |
| Identity | Own id per Voice, stable across Revisions. A Voice is not a Look and does not change with Looks. |

### 1.2 Performance (protected creator material)

| Aspect | Rule |
|---|---|
| Class | **Supplied** (DOMAIN-MODEL; LINEAGE class 2): content immutable; only its descriptor (class 1) is editable. Provenance: creator-recorded (in-app Record) or creator-imported (Upload). |
| Media | Audio, or video whose audio track is the performance. The **audio** is the performance; a performer video is kept as Media and used for nothing else (performance transfer is reserved, §10). |
| Link | 0..* per Dialogue line (VP2). Linking is a descriptor, not a copy. A Performance may be unlinked and relinked. |
| Protection | Same as other creator work (Constitution §11.2, §13): never overwritten, never auto-edited (no denoise, trim or normalisation of the stored original), retired never deleted, kept in duplicate, destroyed only by Purge. Playable in the app at any time; Export of the original is available. Derived renditions (waveform, playback copy, loudness-matched playback) are non-creative and rebuildable. |
| Descriptor | Duration (probed at ingest), a **performer basis** (§2.2) when the creator has stated one, the Dialogue line it is linked to. |
| **Transcript** | A rebuildable annotation of the Performance (a text-perception call, AI map class L), produced when the creator links the Performance to a line, used **only** to detect an ad-lib (§3.3). It is private creative text: never in logs, never a creative truth, never injected into a media request. Failure to transcribe leaves the line "not checked" (quiet) and blocks nothing. |

### 1.3 Line audio (the one seam)

The Dialogue line already has its own id and the Performance link (SHOT-MODEL §10). This ticket generalises the **chosen Performance** to the **Line audio Slot**:

| Candidate | Class | Made by | Where (Record 5) |
|---|---|---|---|
| **Performance** | Supplied | Record / Upload | VP2 |
| **Transformed performance** | Attempt (artifact), `derived_from` the Performance | `audio.transform` Generation ("Speak as <character>'s voice · $x") | VP3 |
| **Spoken line** | Attempt, from the line's text and delivery, no Performance | `audio.speech` Generation ("Speak line as <character>'s voice · $x") | **Provisional**, §11 |

- Exactly one candidate is **chosen** per line (a Decision; LINEAGE class 4; Select semantics, reversible). None chosen means native dialogue.
- Changing the chosen candidate, or the line, marks Takes that followed it `performance-changed` (existing code; subject "line, audio"). Choosing is never a commitment point and never a lock event.
- A **Dialogue track** is the deterministic, rebuildable Record that places the chosen Line audio of a shot in order with offsets (§3.1). It holds no creative truth and is not a media the creator edits.
- A split keeps the Line audio on the id-keeping part and marks it (SHOT-MODEL §10, unchanged). A merge concatenates lines and keeps each line's Slot.

## 2. Authorisation and the consent record

Constitution §11.2: only voices the creator is authorised to use are transformed (their own, or ones they have rights to). Aiuteur cannot verify a person; it can **record a specific, versioned statement by the creator, require it before the work, require what the provider additionally demands, and honour its withdrawal.** That is what "authorised" means in the product, and the UI says so plainly.

### 2.1 The record

A **Voice authorisation** is an append-only Decision stream (LINEAGE class 4: `attest` and `revoke` events; current state is the latest event) attached to a **subject**: a Performance (as source), or a Voice (as the target of a clone or reference). Each `attest` event holds:

| Field | Content |
|---|---|
| Subject | Performance id or Voice id (with the sample set it covered, as content hashes) |
| **Basis** | `own-voice`; `permitted` (another person gave permission; the creator may name them and attach evidence); `synthetic` (a designed or stock voice with no human voice behind it: needs no attestation to use, recorded as the basis for clarity); `licensed` (rights obtained otherwise). Free text is optional detail, never parsed |
| Statement | The id and version of the exact sentence shown and clicked (stored text is versioned so a later wording change does not rewrite history) |
| Evidence | Optional Supplied attachment (a release, an email) |
| Provider verification | Where a clone-capable Offering demands it (§5.3): a Supplied consent recording of the speaker reciting the provider's fixed phrase, made through the provider's own flow, referenced here |
| Who and when | The creator, time, action group |

No identity check is claimed. The record is the creator's own attestation plus whatever a provider independently requires. It is personal data about third parties: it lives in the project records, is **content-free in logs** (ids and basis codes only, never a name, a statement body or a transcript) and follows the project's isolation, duplication and purge.

### 2.2 Where it is asked (proportionate friction)

Asked **only at the moment a use needs it**, once per subject, remembered, one line, never a modal (Record 1 M1):

| Action | Needs |
|---|---|
| Record in the app | Nothing. The act is recorded as basis `own-voice` for that Performance unless the creator changes it |
| Upload a Performance | Nothing at upload |
| **Speak as** (transform) | The Performance has a basis (`own-voice`, `permitted`, `licensed`); the target Voice is authorised for the Offering's requirement or is `synthetic`/`stock` |
| **Speak line as** (spoken line) | The Voice is authorised for the Offering's requirement, or is `synthetic`/`stock` |
| Reference audio into a native Take | A `cloned`-equivalent use of a person's voice: the Voice's samples have a basis. A `described` Voice needs nothing |
| Native dialogue, no Voice | Nothing (CORE) |

The first use shows the statement beside the control ("I own this voice, or I have the right to use it") with the basis choice; later uses show nothing. In World Definition (VP1) the Voice area shows the basis only after samples exist, as a quiet line the creator can open and change.

### 2.3 The gate

One deterministic function, `authorised(subjects, offering, operation)`, runs (a) in the operation's validate step and (b) as a clause of the **dispatch gate F3** (PROVIDERS §9): a Generation with `audio.transform`, `audio.speech` (cloned Voice), `audio.voice` (handle creation) or reference-audio use of a Voice's samples dispatches only if every subject has a current `attest` event whose basis the Offering's declared requirement accepts. Failure is `unmet-blocking` for the need with the exits (attest, choose a `synthetic` voice, choose another Offering). It is **not** an Aiuteur-only courtesy: it is fail-closed, and "unknown requirement" means cloning is unsupported (F1).

### 2.4 Revocation and deletion

The creator may `revoke` an authorisation at any time (Voice area or the Dialogue section). The effects are fixed:

| Effect | Rule |
|---|---|
| New use | The gate refuses any new Generation that uses the subject. Immediate. |
| Provider-side handle | Released: the adapter deletes the voice at the provider (§6.4). An Offering that cannot delete a voice is **not eligible to clone** (revocation could not be honoured). |
| Existing media | **Nothing is deleted.** Performances, samples, transformed and spoken Attempts and Takes are the creator's immutable records (retire-never-delete; Purge is the only destruction, and it is whole-project, later). |
| Dependants | Takes and Attempts whose Generation captured the subject are marked possibly out of date with the new reason `authorisation-revoked` (LINEAGE §3.1). It is not destructive and exits are the normal ones: regenerate with another voice or Line audio, keep, retire. |
| Export | Not blocked (principle 9, no workflow gates). The Export manifest lists the Takes carrying the reason, and the export control shows a quiet count. |
| Copies | A duplicate holds a copy of the history including the revoke. A revoke in one project does not reach another project's copy (projects are isolated, ADR 0022); the Voice area shows each project's own state. A cross-project voice library is LATER. |
| Third-party legal withdrawal | A request from a third party to remove their voice is an operator and legal process, not a product feature. The creator can Retire the samples and Performances (recoverable) and revoke; destruction beyond that is Purge. Recorded as a residual, not designed here. |

## 3. Timing

### 3.1 The Dialogue track

For a shot, code derives the **Dialogue track** from the chosen Line audio of its lines, in line order: the first starts after a short lead-in, each next line after the previous ends plus a short gap. Lead-in, gap and tail are operator configuration (suggested 0.3 s, 0.4 s, 0.3 s). Creator offsets, overlap, trimming and mixing are **not** V2: they are the LATER audio suite. The track's length is `required duration` = lead-in + sum of audio + gaps + tail.

### 3.2 Relation to the Shot's duration and the Take

SHOT-MODEL §10 says a Performance's length can suggest the Shot's duration as a quiet note. Resolved:

| Case | Rule |
|---|---|
| `required ≤ Shot duration` | The Take's target is the Shot's duration. The audio sits at its offsets; the rest is picture with no dialogue. Reported only if the Take is shorter than the Shot (audio-driven models set the length from the audio). |
| `required > Shot duration` | **The audio is never cut or sped up.** The Generation's target duration becomes `required` (normalised by PROVIDERS §5, planned by §11, estimate on the sent value). The Shot's own duration field is **not changed**: one quiet line on the control, "Performance runs 9.2 s · this Take is made at 10 s · shot says 6 s · Set shot to 10 s". The offer is the creator's act (a Shot Revision, `shot-changed`). |
| Beyond every available plan | `unmet-blocking`, with exits (a model with longer range or extension, shorten the performance by re-recording, split the shot as the creator's own act). |
| Dialogue straddles a Segment join | Segments slice the Dialogue track at **pauses** (silence detection in code, or the provider's alignment where the profile returns it), never mid-word when a pause exists inside the allowed window. No pause: cut at the lowest-energy point with a short crossfade and record `line-split-mid-speech` on the Take. The audio itself is never regenerated, so delivery stays continuous (SHOT-MODEL §7.4). |
| Delivered vs required | Recorded on the Take: delivered duration, audio length, whether the audio is wholly present. A Take that dropped part of a chosen Line audio is a failed Generation, never a success (AI-map G9 media check: audio duration probed). |

### 3.3 Ad-lib (deviation or write-back)

Uses the existing three states (LINEAGE §5.2, §5.5) with no new mechanism:

1. Linking or choosing a Performance runs the transcript (a trivial, creator-initiated step of that action).
2. Code compares the normalised transcript with the line text (case, punctuation and filler words normalised; a threshold is data). A material difference makes the line **Divergent, undecided** (`differs-from-narrative`), quiet, never blocking.
3. The inline choice is the standing one: **write back** (a new Revision of the Master Narrative dialogue block, proposing the transcript text for the creator to confirm or edit; provenance creator-recorded, from the Performance; the Basis re-stamped; the impact summary shown; locks respected by edit-through) or **Keep as a deviation for this shot** (the Deviation record names the line and the Performance), or decide later.
4. The Dialogue line text stays what the narrative says until the creator decides. The Package carries a line by its Line audio when one is chosen (§6.1), so a Take follows the performance whichever way the choice goes.
5. A delivery difference alone (louder, slower, different emotion with the same words) is shot-owned and raises nothing (Record 2 P1).

A chosen **Transformed performance** or **Spoken line** has transcript equal to its source by construction; the check runs on the source Performance only.

## 4. Realization paths

The Package states the need; Fit and the plan choose the path from the effective model's profile. **A path is never chosen by switching the video model behind the creator's back** (PROVIDERS §8.4): with Automatic selection the existing tie-break "fewer non-`met` verdicts" already favours a model that meets the audio need; with an explicit model, the path degrades visibly.

| Path | When | How it runs | Take audio |
|---|---|---|---|
| **N. Native** (CORE) | No Line audio chosen on any line | Dialogue goes in the prompt as Verbatim parts with the shot-owned delivery. If a Voice exists: `voice:<presence>` text, and `audio.voice` reference audio where the profile accepts it. Best effort, said so (limitation L5, `voice-not-guaranteed`) | The provider's own |
| **A. Audio-driven** | Line audio chosen; the effective video model accepts driving audio | One call per Segment with the sliced Dialogue track as `audio.line`. The model generates picture performing the audio; lip-sync is the model's | The provider's output, which is the supplied audio |
| **L. Lip-synced** | Line audio chosen; the model has no driving audio; `lip-sync` wanted; an eligible `audio.lipsync` Offering exists | Two dependent Generations per Segment in one batch: the picture, then `audio.lipsync` on that Segment's clip with its slice of the track (JOB-LIFECYCLE §8 dependency). The lip-sync step yields a second Attempt in the same Segment slot, derived from the plain video Attempt; the chosen candidate (default the lip-synced one) feeds assembly (SHOT-MODEL §7.3) | The supplied audio |
| **V. Laid-on (voice-over)** | Line audio chosen; neither A nor L applies, or `lip-sync` is `off`, or the speaker cannot be lip-synced | The picture is generated with audio off (or provider audio discarded by deterministic ingest, `audio-cannot-be-disabled`); the Dialogue track slices are muxed by the deterministic assembly. No lip movement is claimed | The supplied audio only |

Preference order after hard needs: **A, then L, then V**. `lip-sync` is a neutral parameter like native audio: `wanted` (the default when a Line audio is chosen), `off` (the creator says "voice-over"), `indifferent`. It is a per-Generation control in the Dialogue section, not a Shot field and not a Look.

### 4.1 Fallbacks

| Situation | Behaviour |
|---|---|
| **Non-humanoid or stylized speaker.** Lip-sync services document human and some stylized faces and exclude animals and non-humanoids (§9). Code cannot tell which speaker is which | Profile field `lip-sync subjects` states `human`, `stylized-humanoid`, `any` (evidenced) or is `unknown` (= unsupported). Path **A** on a model whose profile says `any` is preferred. Otherwise path **L** is `limited` with `lipsync-humanoid-only` shown in plain words, and a provider refusal or no-face failure is the provider's words (F9) with exits: voice-over (path V), another model, native. The creator never has to declare a species. **Voice-over is always reachable** |
| **More than one speaker in a clip** | If the profile is single-speaker, Segments are partitioned by speaker where the shot allows; lines of a speaker that cannot be lip-synced are laid on, and `lipsync-single-speaker` is shown. Never a silent cut |
| **Audio shorter than the shot** | Reported quietly (§3.2); no padding or stretch |
| **Audio longer than the shot** | The Take is made longer (§3.2); never trimmed |
| **Provider changes the length** (an audio-driven or lip-sync model returns a different duration) | Probed at ingest. Beyond the tolerance (data, suggested 150 ms or 3%) the Segment is stored as a normal Attempt flagged `timing-not-preserved`, not auto-retried; the assembly keeps the **supplied** audio and the picture is never stretched. The creator may regenerate or accept |
| **Speech-to-speech changes length** | The transformed Attempt records its own measured duration and source duration; it is a different Line audio candidate with its own length, and the Dialogue track and §3.2 use the chosen candidate's real length. Timing fidelity is therefore not a precondition of any path; only `timing-not-preserved` is shown on the candidate |
| **Provider cannot be disabled from producing audio** | Stripped by deterministic ingest, price unchanged, `audio-cannot-be-disabled` (PROVIDERS §5) |
| **No eligible audio Offering** | The controls "Speak as" and "Speak line as" read as unavailable with the reason; recording, uploading and playing still work; paths N and V remain. CORE is untouched |
| **Language** | A `languages` mismatch (line language vs profile) is `unmet-soft` for TTS and transform, with the Offering's language list as the exit |

## 5. Provider capability contract: audio additions

These extend PROVIDERS §4.1's **Audio** row and §13. Every field is `declared(value)`, `declared-none` or `unknown`; **unknown means absent** (F1). Evidence per group (`documented`, `verified`, `assumed`).

### 5.1 Operations and classes

| Class | Operation | Input → output |
|---|---|---|
| `video.take` (existing) | generate | with `audio` mode and, new, `driving audio` accepted |
| `audio.speech` | text-to-speech (spoken line) | line text, delivery, voice → audio |
| `audio.transform` | voice conversion (speech-to-speech) | Performance audio, target voice → audio |
| `audio.lipsync` | lip-sync | video clip, audio → video clip |
| `audio.voice` | create or release a provider voice handle | samples → handle; handle → released |
| `audio.transcribe` | transcript (utility, operator policy, economy) | audio → text |

Creator-facing selection is the single **audio** family (Automatic bias `quality`, ratified in Record 2 D66), resolved per Generation like any class (PROVIDERS §8); `audio.transcribe` is operator policy and its model is recorded in the call log.

### 5.2 Fields

| Group | Declares |
|---|---|
| **Native dialogue** (on `video.take`) | Dialogue generated from prompt text; languages; `audio` `none`/`optional`/`always`; whether it follows quoted lines verbatim (always `best-effort`: no model can be made to speak a line verbatim, limitation L5); whether it accepts **voice references** (count, per-clip seconds, total seconds, formats) and `lip-sync documented` |
| **Driving audio** (on `video.take`) | Accepts driving audio as an input role `audio.line`; length rule (`follows audio`, `fixed set`, range); per-clip and total limits; what it does with its own audio (`replaced`, `mixed`, `unknown`); `lip-sync subjects` |
| **Speech** | Voice sources (`stock`, `designed`, `cloned`); languages; per-request length (units: characters or seconds, counter); delivery controls (`inline-tags`, `instruction`, `none`); `timing output` (`none`, `word`, `character`) with units; seed guarantee |
| **Transform** | Input length limit and formats; whether output length equals input length (`documented`, `not-stated`, `varies`); delivery preservation claim (`documented-claim`, `none`); languages; background-noise isolation; plan gating |
| **Lip-sync** | Input video: duration range, resolution and size limits, formats; input audio range; `lip-sync subjects` (`human`, `stylized-humanoid`, `any`, `unknown`); speakers per clip and the selection mechanism; whether non-speaking mouths are left alone; billed unit |
| **Voice data** | `voice source requirements` (§5.3); `delete voice` supported (**mandatory for any cloning Offering**, §2.4); retention of voice data at the provider; zero-retention compatibility; provenance marks the provider adds to audio (watermark, content credentials) |
| **Timing outputs** | `alignment` returned by speech/transform; used only for slicing (§3.2); absent means code finds pauses |

### 5.3 Authorisation precondition kinds (closed)

Declared per cloning-capable Offering; read by the gate (§2.3). Closed list; adding one is a decision.

| Kind | Meaning | Gate accepts |
|---|---|---|
| `attestation` | The provider asks the account to confirm rights (a dashboard or API assertion) | Our `attest` event of any accepted basis, passed through as the provider's attestation field if the API has one |
| `speaker-verification` | The speaker must record a fixed phrase through the provider's flow | An `attest` with provider verification attached (§2.1) |
| `own-voice-only` | The provider allows cloning only the account holder's own voice, verified live | Basis `own-voice` with verification; `permitted` is refused |
| `allowlist` | The provider enables the feature per customer | Operator enablement of the Offering; the Account's credential seam |
| `unknown` | Not documented | Cloning unsupported |

## 6. Package, lineage, regeneration, cost

### 6.1 Reaching the Package

- **Voice** adds one layer: **`voice:<presence>`**, owner the Character's Voice, may contribute the Voice **description** (composed), Tier 1, placed after `identity:*`; and the existing role **`audio.voice`** (the samples chosen by Fit). It degrades to the description alone, then to nothing, with verdicts `met-by-fallback` / `unmet-soft`. It is a layer, not text smuggled into `dialogue`.
- **Line audio** is the existing role **`audio.performance`** generalised: it carries any chosen Line audio, by Media id, line id and slice range. A line with a chosen Line audio is carried **by that reference instead of as spoken text**: the "every Dialogue line appears once, in order" guard (Package P3, AI-map G3) is satisfied by the reference, and the Fit report lists it. Lines with none are carried as Verbatim parts only on a native path; on audio-led paths they are reported `line-unvoiced` and the mouth is left still (the one exception to GENERATION-PACKAGE's every-line-once guard, Package P3).
- `audio.speech` and `audio.transform` use the same Package type with text layers and the Voice reference (GENERATION-PACKAGE §14), no new compiler.

### 6.2 What a Voice change does to existing work

Changing a Voice (a new Revision: description or sample set; or a different handle after revoke) marks Takes and Attempts whose Generation captured that Voice Revision, **non-destructively**: reason `identity-changed`, slice `voice` (no new code). Transformed performances and Spoken lines made in the old Voice are marked the same way. Exits are the ordinary ones: **Redo** (a new Attempt; the old stays), keep, restore the Voice Revision. Nothing spends automatically (Record 1 R2).

### 6.3 Regeneration and provenance

Every `audio.*` Generation records Package, Fit report, Rendered request, profile snapshot, effective model and `paid by` like any other. Re-running makes a **new Attempt** and never replaces the old. Provenance on the artifact: `synthetic` (AI-generated) with the Generation; a Transformed performance also names its source Performance and the target Voice Revision. Provider-side provenance marks (watermarks, content credentials) are recorded from the profile and **never intentionally removed** by Aiuteur's ingest or assembly; whether re-encoding preserves them is a #70 export fact, not decided here.

### 6.4 Provider handles, duplication, purge

Resolving PERSISTENCE §7.5's invitation: a provider-side voice is an `external_resource` **owned by the Account and scoped to one project and one Voice**, created **lazily on first use** (a dependency step in the first Generation that needs it, its cost shown in the estimate) and **never shared across projects**. Duplicate copies the Voice, samples and authorisation history, **not the handle**; the new project creates its own on first use. Retire of the Voice, revoke, project purge and Account purge each release the handle (the adapter deletes it). This removes the one reference-counted resource PERSISTENCE had. Cost: one extra creation per project that uses a cloned Voice, shown as a batch step.

Orphaned handles after a timeout or `submission_unconfirmed`, and retry after a failed provider-side delete, are reconciled by JOB-LIFECYCLE 6.1; purge waits for confirmed deletion.

### 6.5 Cost visibility and the spend rule

- All `audio.*` Generations are **creator-initiated, priced on the control** (VP3: "Speak as … · $x"), never automatic (Record 2 X8 stands; Treatment and the initial scene plan stay the only auto-triggers). Estimates come from the billed-quantity rule (characters, seconds of audio, seconds of output video).
- A lip-synced Take is **one Take**: its video and lip-sync steps show as one price ("Take $a + lip-sync $b = $c"), count once toward the 10-Generation confirm rule like Segments (Record 2 P3), and sum into the $2.00 line. Clone-handle creation is part of that sum.
- The transcript step is a creator-initiated, usually trivial (<$0.05) part of linking a Performance; the price is recorded, no extra approval UI.
- Failure, cancel and billed-on-failure follow JOB-LIFECYCLE §5 with no change. A partial batch (video done, lip-sync failed) leaves the plain video Attempt chosen in the Segment slot and offers a lip-sync retry.

## 7. Authority and placement check (Record 5)

| Item | Honoured |
|---|---|
| VP1 | Voice defined in World Definition on the Character, beside its Looks; samples uploaded there; applies across the film (§1.1). Authorisation is a quiet line in that area. |
| VP2 | Record, Upload, Play and the chosen audio per line in Generate → Takes drawer → Dialogue (§1.3). |
| VP3 | "Speak as <character>'s voice · $x" per Performance, a priced, creator-initiated Generation (§1.3, §6.5). |
| VP4 | Scene Prep shows only the quiet 🎙 mark when a Line audio is chosen; no recording controls. |
| VP5 | No Line audio: native dialogue, no gate, no Voice required (path N). |

## 8. Recorded limitation codes

Carried in profiles and on Generations (PROVIDERS §12 pattern). One plain sentence each is the spec's.

| Code | Meaning |
|---|---|
| `voice-not-guaranteed` | Native dialogue cannot be made to keep one voice across shots, even with references. Fallback: Spoken line or Transformed performance, then paths A/L/V |
| `line-not-verbatim` | A native model may not speak the line exactly (PROVIDERS limitation L5). Fallback: Line audio |
| `timing-not-preserved` | A transform, audio-driven or lip-sync output differs in length beyond tolerance |
| `lipsync-humanoid-only` | The service documents human or stylized-humanoid faces only |
| `lipsync-single-speaker` | One speaker per clip |
| `lipsync-clip-range` | The service accepts clips of a bounded length; the plan keeps every lip-sync step inside it |
| `line-unvoiced` | A line without Line audio on an audio-led path is silent |
| `line-split-mid-speech` | No pause existed within the slicing window |
| `audio-cannot-be-disabled` | Existing (PROVIDERS §5) |
| `authorisation-required-by-provider` | The Offering demands a verification or an allowlist (§5.3) |

## 9. Evidence (refreshed 2026-10-25)

Baseline: [research #7](https://github.com/dlopezkluever/aiuteur/blob/research/voice-audio-lipsync/docs/research/voice-audio-lipsync.md) (2026-10-18), #5 and #8 (audio and performance-transfer facts). Refreshed here by web search and page reads on **2026-10-25**; **evidence** is quoted from a provider or official page, **inference** is mine. Provider facts churn weekly (Sora 2 API ended 2026-09-24); the profile's evidence record, not this section, is the authority at build.

| Topic | Evidence | Inference and effect |
|---|---|---|
| Speech-to-speech timing | ElevenLabs' Voice Changer (renamed from speech-to-speech; endpoint now `/v1/voice-changer/:voice_id`, model `eleven_multilingual_sts_v2`) says it converts voice "while preserving the tone and delivery of the original" and claims "full control over emotion, timing and delivery" (product guide and API page, 2026-10-25). A reseller states output length equals input length (**secondary**). No numeric guarantee or tolerance is documented; the API still says determinism is not guaranteed (#7) | A marketing claim, not a contract. The design **measures** duration at ingest and never depends on it (§4.1). `transform.output length equals input` is `not-stated` until a conformance run verifies it |
| Voice-clone consent | PVC: own voice only, live verification, "even with their consent you cannot clone someone else's voice" (2026-10-25). IVC: the dashboard asks the creator to confirm "the right and consent to clone the voice"; ElevenLabs' blog says its API "requires a consent attestation for every clone" (**vendor marketing**); the API reference seen in #7 lists no consent field (unresolved, not re-read in full). OpenAI and Google: fixed consent phrase by the same speaker; Google Chirp 3 allowlisted (#7, not re-checked) | The conflict stays unresolved at provider level, so **Aiuteur's own attestation is the gate regardless** and `speaker-verification`, `own-voice-only` and `allowlist` are separate declared kinds (§5.3). A PVC-class Offering can serve only `own-voice` |
| Lip-sync services | Kling's lip-sync API: video 2–10 s, 720p or 1080p, ≤100 MB; audio 2–60 s, ≤5 MB; the product page says it "works with realistic, 3D, and 2D human characters". Sync (#7): "animals or non-humanoid characters" unsupported. Kling Motion Control: "stylized characters or humanoids with acceptable limb proportions **may** also be supported" | Human and stylized-humanoid are the documented ceiling. `lipsync-humanoid-only` and `lipsync-clip-range` are real; the plan keeps each lip-sync step within the declared clip range |
| Audio-driven video | LTX-2.5 (Runware guide): "the audio carries the words and the timing, and the clip inherits its exact length" (2–20 s); a "stylized character, a mascot, or an illustrated avatar drives the same way". Wan 2.7: driving audio drives lip-sync (#5). Kling 4.0 early access advertises up to 15 mixed references including voices | Audio-driven is the only documented route for non-humanoids and the only one where audio sets length. Path A is preferred when a profile says so; claims are one aggregator's and a vendor's, to be `verified` by a conformance run before default eligibility |
| Performance transfer | Runway Act-Two exists (#8) with undocumented input limits | Stays `unknown`; reserved, not designed (§10) |
| EU AI Act Art. 50 | Applies from 2026-08-02; the Commission published its Art. 50 guidelines on **2026-07-20** and assessed the Code of Practice on 2026-07-08/09 (resolves #7's "unresolved"); systems placed on the market before 2026-08-02 have until 2026-12-02 for the Art. 50(2) marking duty; new prohibitions on non-consensual intimate material apply from 2026-12-02 | Synthetic-audio marking is chiefly a **provider** duty and disclosure of deepfakes a **deployer** duty with an artistic carve-out. Inference: Aiuteur must not strip provider marks (§6.3) and the Export should not deny disclosure; whether Aiuteur is itself a provider or deployer is a legal review item (residual), **not legal advice** |
| US and state law | Tennessee ELVIS Act in force; California AB 2602, AB 1836; NO FAKES Act not enacted as of #7 (2026-10-18). **Not re-verified on 2026-10-25** | The product's posture (authorisation record, revocation, handle deletion) is consistent with these norms and depends on none of them |

## 10. Alternatives rejected

| Option | Why not |
|---|---|
| Voice as a provider object (a `voice_profile_id` string) | V1's write-only field (`voice_profile_id` had no reader, legacy 09 §1103; FACT-0046 and FACT-0147 are unrelated project-type facts) shows the failure: an id without samples, consent or lineage cannot be re-created, audited or revoked |
| Performance as an Attempt | An Attempt is machine output accumulating per Slot. A performance is the creator's own work: immutable, protected, never regenerated (Constitution §11.2) |
| Authorisation as a profile flag or UI checkbox only | Cannot be audited, versioned or revoked, and would live outside the dispatch gate |
| Verifying identity or a voice match ourselves | Not feasible or honest; providers that verify do so in their flow (§5.3) |
| Sharing the provider handle across duplicated projects (PERSISTENCE §7.5 as written) | Revocation and purge need reference counting across projects and an inconsistent legal state; per-project lazy creation is simpler (§6.4) |
| A new lineage reason for a Voice change | `identity-changed` with slice `voice` already says it |
| Trimming, time-stretching or padding performance audio to fit the shot | Alters creator material and breaks "keep the delivery"; the Take is made long enough instead (§3.2) |
| Auto-using TTS + lip-sync whenever a Voice exists | Spends without the creator's click (Record 2 X8, §13.4) and changes the Take without being asked |
| A mixer, offsets, stems | LATER (Constitution §11.1) |
| Performance transfer (a performer's video drives generation) | Reserved, not designed: experimental, no Offering declares it, and it would reuse the same Slot and gate if one ever does |
| A Constitution amendment | Nothing is infeasible; limits are recorded with fallbacks |

## 11. Creator Review (provisional default in force)

**CR-69.1 · Can a line without a performance be spoken in the character's voice?**

Why it arises: no native video model documents holding one voice across shots, so the IMPORTANT "consistent character voices" cannot be delivered by native dialogue alone (`voice-not-guaranteed`). Record 5 places only Record, Upload, Play and **Speak as** (transform) on a Performance.

| Option | Effect |
|---|---|
| **A (recommended; in force provisionally)** | In the Dialogue section a line with no performance also offers **Speak line as <character>'s voice · $x** (text-to-speech in the Voice, then it is Line audio like any other). Explicit, per line, priced, creator-initiated. Native stays the default |
| B | No spoken-line action. The Voice only informs native dialogue (description and reference audio, best effort); consistent voices are a best-effort claim. Transformation still needs a performance |
| C | Use text-to-speech automatically for every line whenever a Voice exists. Rejected on the merits: spends without a click (Record 2 X8) |

Depends on: the Dialogue section of the Takes drawer (one extra control), the `audio.speech` class, how strong the "consistent voices" promise reads. If B is chosen, delete the **Spoken line** row of §1.3 and the `audio.speech` class; everything else stands.

## 12. Hand-offs

| Ticket | Receives |
|---|---|
| **Persistence** (#72 closed) | `external_resource` becomes project- and Voice-scoped, lazy, released on retire, revoke and purge (PERSISTENCE §7.5 amended). Tables: Voice (Revisions), Voice sample (Supplied), Voice authorisation (Decision stream), Line audio Slot (choice stream), Dialogue track (derived Record), transcript (rebuildable annotation). The authorisation read is a dispatch-gate clause (F3) |
| **Verification** (#76) | Fixtures in §13; fake `audio.*` Offerings (clone required, clone refused, transform varies length, lip-sync refuses a face, handle delete fails); conformance probes can check transform length and clip ranges |
| **Spec and slices** (#77, #78, #79) | Slice order: (1) the Line audio Slot, Performance Record/Upload/Play and the Dialogue track with path V (laid-on) and no provider audio at all, which needs no provider audio, touches no CORE path, is the first step of IW2 and lands after BAR (BUILD-SEQUENCE §4.1 rule 1); (2) Voice definition and samples; (3) authorisation record and gate; (4) `audio.transform`; (5) `audio.lipsync` path L; (6) audio-driven path A; (7) `audio.speech` if CR-69.1 is A. Profiles for any of 4–7 may be `unknown`/absent and the product still works. Residuals for the spec: tolerance and gap constants; sample excerpt tool; hypothesised legal review of Art. 50 roles; cross-project voice library; third-party removal process |
| **Providers** (#66) | §5 is the audio vocabulary; PROVIDERS §4.1, §9 F3, §12, §13, §15 amended |
| **Package** (#65) | `voice:<presence>`, generalised `audio.performance`, Package P3 satisfied by reference |
| **Lineage** (#54) | `authorisation-revoked`; `identity-changed` slice `voice` |
| **Trust signals** (#63) | Marks stay quiet: 🎙 in Scene Prep; the authorisation line in the Voice area; the one-line statement at first use; `authorisation-revoked` as an ordinary marker |

## 13. Invariants and fixtures the spec should test

1. A shot with no Line audio compiles and runs with no `audio.*` operation, no gate and no Voice (VP5), on a catalogue with zero audio Offerings.
2. A chosen Line audio is carried exactly once, whole, in order; a line with Line audio is not also carried as spoken text on an audio-led path.
3. A Performance is byte-identical after any sequence of operations; no operation writes to it; retire and unretire restore it.
4. `authorised()` is total and pure: no attestation, a revoked attestation, a basis the Offering refuses, and an `unknown` requirement each give `unmet-blocking` and create no Generation and no Job.
5. Revoke: gate refuses new use; handle released; zero rows deleted; dependants carry `authorisation-revoked`; Export proceeds with a count.
6. An Offering with cloning but no `delete voice` is absent from selection for clone use.
7. Duplicate copies Voice, samples and authorisation history and no handle; the first cloned use in the copy creates its own.
8. Audio longer than the shot makes the Take longer and leaves the Shot duration unchanged; audio shorter than the shot is reported; no code path trims, stretches or pads audio.
9. A transform that changes length is stored, flagged `timing-not-preserved`, and the Dialogue track uses its measured length.
10. A change of Voice Revision marks captured Takes `identity-changed` (voice) and nothing else; a changed model or price marks nothing.
11. Lip-synced Take: video Attempt succeeded and lip-sync failed leaves the plain Attempt chosen in the Segment slot with a retry offer, and shows the partial result; price is the sum; counts once toward the confirm rule.
12. Ad-lib: a transcript differing from the line makes it Divergent; write-back and deviation both end the divergence; neither blocks generation.
13. Logs for any audio Generation contain ids and codes only: no transcript, no statement text, no person's name, no sample bytes.
14. A non-humanoid fixture on a `human`-only lip-sync Offering: path V reachable, `lipsync-humanoid-only` shown.

Golden fixtures: a 22 s shot with two lines and a Performance straddling the Segment join; a Performance 9.2 s on a 6 s shot; a Voice sample 3 minutes long against a 30 s reference cap (omitted with a report); a transform returning +400 ms.

## 14. Constitution check

§3.1 and §11: IMPORTANT is architected from day one by the Line audio Slot, the Voice entity, the authorisation gate and the profile fields, while CORE stays untouched and unblocked. §6.2: Voice is an entity (owned by the Character). §4.4(6): ad-lib uses write-back or deviation unchanged. §11.2: performances get creator-work protection; only authorised voices are transformed, and the gate is fail-closed. §13.4/§14.3: every spend is creator-initiated and priced. §16 principle 9: nothing here is a workflow gate; a blocked need is one impossible request with exits. Principle 13: capabilities are data with evidence; unknown is unsupported. No amendment is required.
