# Shot planning inputs: CineBlock blocking, previs, storyboards and shot lists

Resolution of Wayfinder ticket #61. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). The hard-to-reverse choice is recorded in [ADR 0024](../adr/0024-cineblock-is-an-aiuteur-module-and-captures-always-go-through-image-generation.md). This is a design contract, not a schema or a screen design; field names are illustrative.

Authority: Constitution §§4.3, 6.6, 8, 15.2; [`CREATOR-RATIFICATION-RECORD.md`](../product/CREATOR-RATIFICATION-RECORD.md) R1, R2, R5, M1, M3–M5, M7; [`CREATOR-RATIFICATION-RECORD-2.md`](../product/CREATOR-RATIFICATION-RECORD-2.md) **D61**, X2, X8, X10, §3.1 (which control where they differ from the earlier agent recommendation); [`SHOT-MODEL.md`](SHOT-MODEL.md) §§6.3, 8, 10, 11; [`ENTITIES-AND-LOOKS.md`](ENTITIES-AND-LOOKS.md) §9; [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) §4; [`PROVIDERS-AND-MODELS.md`](PROVIDERS-AND-MODELS.md) §13; [`../ux/NAVIGATION.md`](../ux/NAVIGATION.md) §8; [`../architecture/MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md) §3.6. Legacy evidence: `_inputs/legacy-foundational-docs/CineBlock-system-overview.md` (§§1, 6, 13, 14, 18) and legacy 08 §9 (V1 had no blocking or previs capability).

**No `CONSTITUTION AMENDMENT REQUIRED`.** Previs stays optional, the IMPORTANT classification stays, CineBlock comes after the core loop works, and composition references stay in the CORE shot concept. One honest limit is carried, not an amendment: no vendor documents faithful whole-frame composition adherence (research #6; SHOT-MODEL §8.4), so delivery is best-effort and the frame step is the check.

**What changed from the earlier draft of this ticket.** An earlier agent recommendation (file exchange now, linked app later, embedded not for V2) was rejected by the creator (D61). CineBlock is a **module of Aiuteur**, opened in its own tab under the same account. Everything below follows from that. The three-way boundary comparison survives only as the record in ADR 0024.

## 1. Decision

1. **One application, one account.** CineBlock is a module of Aiuteur, not a second app. There is no second sign-in, no launch token and no cross-app seam. For flow and ease of development, the blocking stage opens in a **separate tab or window of Aiuteur under the same session**. Its data (scene state, captures) belongs to the same Account and project, so tenant isolation (M4), retire-never-delete (R1) and project purge (M7) cover it without extra work.
2. **A capture is blocking and framing only.** It is a Composition reference, never the frame itself and never sent to video. Every capture goes through **image generation** to produce the quality Frame, with placeholders replaced by the project's real entities (Constitution §8.2).
3. **The world model is a Catalogue operation class** (`world.generate`, PROVIDERS-AND-MODELS §13). The operator pays until BYOK ships (M5); the price shows on the initiating button; a generation under $2.00 is one click (about $1.20 per world is the current estimate). A world is a stage for blocking, never a frame or a clip.
4. **The package contract is internal.** The versioned package is the handoff between the CineBlock tab and the shots. External previs packages, storyboards and shot lists are an IMPORTANT entry path (§4.3, §15.2) and use the same matching rules (§6).

## 2. The flow

```diagram
 Scene workspace (shots and assets determined)
   │  creator chooses "Block with CineBlock" at frame generation
   ▼
 New Aiuteur tab: CineBlock stage  ◄── loads ALL the scene's shots (ids, actions, presences, aspect)
   │  world: pick/generate one (world.generate, priced on the button), or none (blank stage)
   │  mannequins for characters, primitives for props, camera, optional lights
   │  capture start / end composition per shot
   │  "Send back"
   ▼
 Back in the scene workspace
   │  each capture AUTO-LINKED BY SHOT ID  →  layout Composition reference on that shot
   │        start → opening role target, end → ending role target
   │  ✕ on any capture RETIRES the reference (never deletes)
   │  leftovers → short review list (§5)
   ▼
 Creator initiates frame generation (price on the button; X8: nothing runs on its own)
   │  capture + subject mapping + identity + Direction view  →  image Generation  →  Frame attempts
   ▼
 Creator approves a Frame  →  video as usual
   "Re-open in CineBlock" at any time restores the saved scene state
```

Rules:

- **Entry.** From the scene workspace (NAVIGATION §8): previs attaches to shots there, Direction is optional and never a required step, and there is no new top-level section. Opening the tab is an explicit creator action; opening writes nothing.
- **All shots at once.** The stage receives every active Shot of the scene, so a camera, world and set stay consistent across shots. The creator may work on any subset.
- **Send back is a creator action** and is atomic: one action group attaches all auto-linked captures, so Undo removes them together.
- **Return never spends.** Attaching captures does not generate anything (X8). The Frame step is a separate creator-initiated action with its own price.
- **Closing without sending** keeps the saved scene state (§4) but attaches nothing.
- **Concurrent edits.** If a Shot was split, merged or retired while the tab was open, its captures are leftovers (§5), never guessed onto another shot.
- **Retire via ✕.** A retired reference is detached from the Shot; its capture Media and scene state stay reachable. Frames made with it are marked `shot-changed` (slice `composition`) as in SHOT-MODEL §8.3; the whisper offers the usual exits.

## 3. What each input contributes to a shot

| Input | Becomes | Shot data it touches | What it never touches |
|---|---|---|---|
| **CineBlock start / end capture** (hero) | A **layout** Composition reference, target **opening** / **ending** Frame role. Alternate captures of the same role stay as Media on that reference, selectable. | `composition` slice (link + media). The Frame plan gains the role if absent, as a suggestion. | Identity, appearance, location, story text |
| **CineBlock placeholders** (mannequins, primitives) | The reference's **subject mapping**: each placeholder → a Presence (entity and Look), *remove*, or *generic extra*. Suggested by Aiuteur from the shot's derived Presence and the placeholder's name, marked "AI chose", overridable in one click. | Subject mapping on the reference | Presence list of the Shot (mapping does not add a Presence; an unmapped-to-entity placeholder is a generic extra) |
| **CineBlock camera** (type, distance, height, movement) | Fills **only empty** camera facets, `imported` provenance, shown as such. A set facet is never overwritten. | `camera` slice (shot-owned) | Narrative slices |
| **CineBlock lens, camera pose, placements, lights, world id** | **Opaque, versioned capture metadata** on the reference; used by Re-open and offered as notes. Never required, ignored when absent. | Reference metadata | Anything else |
| **CineBlock duration, action line, shot name** | **Not imported.** Duration is a CineBlock default, not a decision; the Master Narrative owns action; names are labels. The action line may be kept as a note on the reference. | Reference notes only | `duration`, `action`, label |
| **CineBlock scene state** (world, placements, poses, lights, camera paths) | Stored **per scene** as an opaque, versioned Attempt-class record for Re-open. | None on the Shot | |
| **Uploaded composition reference** (sketch, storyboard frame, photo, layout) | A **layout** Composition reference the creator attaches to a Shot, a role or the whole shot. | `composition` | |
| **Reference-driven image or video** (inspiration, parody, recreation) | A **footage** Composition reference with subject mapping; its subjects are replaced (Constitution §6.6). | `composition` | Identity (never from the reference) |
| **External previs package** (e.g. a CineBlock export from outside) | Same as the capture rows above, through the matching of §6. | as above | |
| **Storyboard import** | Each matched panel → a **layout** Composition reference on one Shot (opening role or whole shot). | `composition` | Story text, shot structure |
| **Shot-list import** | Rows matched to Shots record an **external label** and offer camera and duration as **Options**; unmatched rows become **draft Shots** only if the creator chooses. | `camera`, `duration` (as Options), external label | `action`, `dialogue` of a matched shot |

Cross-cutting rules (ratified in D61.5, restated as the contract):

- **Composition owns framing; entities own appearance; locations own environment** (§8.2). Identity inputs to the image Generation come only from the mapped Presences; the Generation records both lists (SHOT-MODEL §8.2, invariant 11).
- **Delivery is best-effort.** The compiler delivers a capture as a layout image with replace-the-placeholders instructions, or as a conditioning input where a model supports one. The package reports delivery quality quietly and never blocks.
- **Frames are the check.** The creator approves the generated Frame before video spend. A capture is "the strongest reason to use frames" (SHOT-MODEL §8.4); the skip path remains available, but a capture is never carried by a video request (D61.3): with frames skipped, the Fit report says the capture was not carried and offers to make the frame (GENERATION-PACKAGE §4.3).
- **Camera facets and metadata may propose, never silently set.** A camera path or lens may propose camera facets as an AI-made choice.
- **Captures promote.** Approving a Frame made from a capture records `source: generated` with the capture in its inputs. The unmodified capture is never promoted to a Frame by default; "use capture as the frame" is not offered, because a mannequin render is not a quality frame.

## 4. The internal package contract and scene state

The CineBlock tab and the shots exchange a **previs package**, versioned and internal. It is a contract, not a file the creator handles.

**Outbound (Aiuteur → CineBlock tab), the shot brief** for a scene: for each active Shot its id (the **echoed key**), derived label, action text (display only), derived Presence (entity ids, names, Look), Direction name and View media if any, aspect ratio and the saved scene state, if any.

**Inbound (CineBlock tab → Aiuteur):**

```
package { format: "aiuteur-previs-package", version: n,
          source: { tool: "cineblock", version },
          scene: <scene id>,
          shots: [ { shot: <shot id echoed>,
                     placeholders: [ { id, kind: character|prop, name, shape, placement, ... } ],
                     captures: { start: { hero, alternates[] }, end: { hero, alternates[] } },
                     camera: { type, distance, height, movement },
                     meta: { lens, pose, path, lights, world: <world id> } } ],
          scene_state: <opaque, versioned> }
```

- Captures are uploaded as Media under the project (committed Media rules apply); only references travel in the package.
- **Unknown versions fail closed:** a package whose version the app cannot read attaches nothing and says so (it never half-reads).
- **Scene state** is stored as an Attempt-class record per scene (every save is kept; the latest is what Re-open loads). It is project data: it is copied on a full project duplicate (not by the new-version duplicate of a major import, which carries no scenes or shots, Record 2 D52.2) and purged with the project.
- The World Labs coordinate convention, splat formats and similar details belong to the CineBlock module, not to this contract. Re-checked 2026-10-23: the current Marble API models are `marble-1.0`, `marble-1.1`, `marble-1.1-plus` (legacy 0.1 names still accepted); a world generation is billed at 1,500 credits ($1.00 per 1,250, about $1.20), and `marble-1.1-plus` may add up to 1,500 credits for larger worlds, so its estimate is a range; Spark is published on npm (2.3.1). The legacy client-side API key does **not** carry over: the key is operator-held server-side (M5) and the call is a Job through the Catalogue.

## 5. The leftovers review list

Auto-link by shot id leaves exactly two kinds of item, shown as **one short list** after Send back (a single quiet list, never a dialog per item; nothing is created or attached by default for a row left unresolved):

1. **A capture for a shot that does not exist** (the shot was retired, merged away or never existed). Choices: attach to another Shot (with candidates by §6 evidence), keep as loose Reference Media of the project, leave out.
2. **More than one capture for the same shot and role** (two hero candidates). Choices: pick the one that stands; the others are kept as alternates on the reference (retired from view, reachable).

The list may stay unresolved: unresolved items remain in the scene's import tray, visible and quiet, and block nothing. A re-open and resend re-matches by id.

## 6. Matching rules for storyboard, shot-list and external package imports

These apply to material that arrives from **outside** (an uploaded storyboard, a shot list, an external previs package). The internal round trip never needs them, because it echoes ids. They follow the pattern of scene mapping ([`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) §4): deterministic first, AI second and only on what code left ambiguous, ambiguity to the creator, nothing decided silently.

**Evidence, in order of strength:**

1. **Echoed Aiuteur shot id** (a package made from a brief): exact. If the id is not an active shot, the item is *none*; no guess is made.
2. **External label already recorded on a Shot by an earlier import of the same source**: exact. If the media's fingerprint is unchanged the item is skipped; if changed, it becomes a new Revision of the reference and the old media stays.
3. **Scored signals:** verbatim dialogue lines in order (strongest, because dialogue is verbatim), text overlap with the shot's action and dialogue, scene heading or slug. **Label equality is weak evidence**: labels such as 1A, 1B are derived from order and drift when scenes are inserted, so a label is stored as an external label and never decides identity. **Position is a tiebreaker and a consistency check, never a source of identity.**

**Certainty classes** (thresholds are tunable spec-level values validated on the fixtures in §9): *exact*, *strong* (mutually unique best match with clear margin), *ambiguous* (tie, weak best, one-to-many, many-to-one), *none*.

**Structure rules:**

- **Many-to-one: both rows are flagged ambiguous**, never only the second. Two panels or captures pointing at one Shot are shown together, with a proposal (the first as the opening role, the last as the ending role) the creator can accept, change or reject. Neither is auto-picked.
- **One-to-many** (a panel that fits several shots, for example parts of a split Shot, [`SHOT-MODEL.md`](SHOT-MODEL.md) §5.2): ambiguous, with the related shots listed.
- **No candidate above threshold:** *none*; nothing is guessed.
- **AI assist** is one L call inside the creator-triggered import, only for ambiguous rows, receiving handles and returning a proposal with an exact-substring evidence quote that code verifies (G2). It proposes; it never decides, and "Ask AI" is optional.

**What the creator confirms**, in one list, when and only when the mapping contains something they could not already have intended: ambiguous or none rows; a target Shot that already has Frames or Takes (the composition slice changing marks them `shot-changed` with a whisper, which is information, not a gate); a row that would replace an existing reference. Exact and strong matches onto shots with no dependants are not asked. The import records one Decision (the mapping, the evidence, the choices) tied to the Generation, if any.

**Per input kind:**

| Input | Rules |
|---|---|
| **Storyboard** | A matched panel becomes a layout Composition reference (target opening role, or whole shot). Never creates, retires or restructures Shots; a panel with no match stays in the import tray. The panel's caption may be kept as a note; it never overwrites story text. Distilled, not reinterpreted (§4.3). |
| **Shot list** | A matched row records its external label (label, never identity) so an export can round-trip to a production's numbering. Camera and duration are offered as **Options** and never overwrite set values; action and dialogue of a matched Shot are never changed. An unmatched row becomes a **draft Shot** (provenance `imported`, optional anchor proposed by text) only if the creator chooses; otherwise it stays in the tray. **A Shot with no row is listed, never retired.** A row matching a Shot with Frames only adds the quiet whisper. |
| **External previs package** | Matched per shot by §6; contents handled by the rows of §3. An unreadable version fails closed (§4). |

All three apply as **one action group**; Undo retires the attachments and any shots the import created. The source file is kept as Media in the project. Nothing here writes to the Master Narrative.

## 7. Lineage and staleness

- Adding, replacing or retiring a Composition reference marks work that read it `shot-changed` (slice `composition`), subtly (M1), with the usual exits. A reference attached to a role is part of that role's Frame inputs.
- Re-sending captures for a shot whose Frames exist replaces nothing: the new reference is added (or the old one retired) and the whisper appears on the Frames. Nothing regenerates (R2, X8).
- Editing a world or scene state in the CineBlock tab changes nothing on the Shot until Send back.
- A CineBlock capture is an Attempt-class Media record; it is never edited, and every capture is kept (Constitution §9.2).

## 8. Product limits and honest edges

- **Faithfulness of layout** is the unavoidable limit above. A creator who needs exact framing uses Frames and compares; the product never promises the generator will follow the blocking.
- **CineBlock timing.** The CineBlock stage comes after the core loop works (§8.3); the core model reserves the slot, the capture metadata and the package contract so the module arrives without redesign of Shot or Frame.
- **Stand-in fidelity.** Mannequins and primitives are placeholders only. A prop primitive does not choose the prop's appearance; the mapped Prop entity does.
- **Direction.** CineBlock does not create Directions or Views. A capture may be offered as a *new view* proposal for a location only by the creator's explicit action (promotion, ENTITIES §5.1); it is never done automatically.
- **No dependency on a specific world provider.** The world model is Catalogue data; swapping it touches no module outside `providers`.

## 9. Fixtures the spec should test

1. Round trip with ids: a scene with four shots, captures for three, one capture for a shot retired during the tab session → three auto-linked, one leftover.
2. Two captures for one shot and role → leftovers list, nothing auto-picked.
3. ✕ on an attached capture → reference retired, Media kept, Frames of that shot marked `shot-changed` (composition); Undo restores.
4. Re-open restores scene state exactly; an unknown package version attaches nothing.
5. **Many-to-one:** two storyboard panels onto one shot → **both** rows ambiguous.
6. Storyboard whose labels have drifted after a scene insert → matched by content; label stored as external label only.
7. One panel covering a shot that was later split → one-to-many ambiguous.
8. Shot list with an extra row and a shot without a row → draft shot only if chosen; the shot is listed, not retired.
9. Re-import of a revised storyboard where one panel changed and one is identical → new Revision for the changed, skip for the identical.
10. A capture with placeholders never contributes identity inputs; the Generation lists only mapped Presences.
11. Camera facets imported only into empty facets; a duration or action line in the package changes nothing.
12. World generation requires the creator's click and shows its price; Send back spends nothing.

## 10. Hand-offs

| Ticket | Receives |
|---|---|
| **Scene and shot workspace** (#60 redo) | The entry action "Block with CineBlock" at frame generation, the leftovers list and import tray as quiet surfaces, the ✕ retire on a reference, reference thumbnails on shots with the composition whisper. Ad-hoc shots (X5) can carry composition references like any shot; CineBlock addresses scene shots only. |
| **Candidate review** (#62) | A Frame made from a capture shows its reference thumbnail; comparison per role is unchanged. |
| **Generation package** (#65) | The capture as a layout input with replace-the-placeholders instructions; mapped Presences as the only identity sources; delivery-quality report; no Established Fact is injected (X3). |
| **Providers and models** (#66) | The `world.generate` class (already in the Catalogue); world-size range pricing for `marble-1.1-plus`; operator-paid until BYOK. |
| **Business and spend** (#68) | A world generation is a Generation with its own spend record and caps; one click under $2.00; the estimate is a range where the provider may add cost. |
| **Module architecture** (#71) | The previs module of [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md) §3.6 and its dependency rules. |
| **Persistence and media** (#72) | Scene state and captures as project-owned append-only records and Media (duplicate copies them, purge removes them); import tray items as project data. |
| **Navigation** (#56) | CineBlock opens in its own Aiuteur tab from the scene workspace; no new top-level section. |
| **Verification** (#76) | The fixtures of §9; the Two-Account harness covers the tab's endpoints; fake world model for tests. |
| **Shot model** (#55, closed) | §10 hooks realized: CineBlock capture as a Composition reference with opaque metadata; storyboard and shot-list import as in §6; captures always through image generation (consistent with §8). SHOT-MODEL §§8, 10 are not edited here; the parent owns that file. |
