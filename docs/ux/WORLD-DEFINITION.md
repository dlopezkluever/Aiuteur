# Aiuteur V2: World Definition

Resolution of Wayfinder ticket #59. Authority: the Product Constitution (§4.2 Phase 6, §6, §13.4, with the §6.4 and §15.1 amendment of [Creator Ratification Record 2](../product/CREATOR-RATIFICATION-RECORD-2.md) §8), then Record 2 **D59, X2, X8, X9, X10** and [Record 1](../product/CREATOR-RATIFICATION-RECORD.md), which control wherever this document or the prototype differs. The domain model is [`ENTITIES-AND-LOOKS.md`](../domain/ENTITIES-AND-LOOKS.md) and [ADR 0003](../adr/0003-location-coverage-is-directions-by-looks-resolved-by-one-rule.md); spend rules are [`BUSINESS-AND-OPERATIONS.md`](../domain/BUSINESS-AND-OPERATIONS.md); the shell is [`NAVIGATION.md`](NAVIGATION.md). Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). This document names surfaces and behaviour, never components, routes or pixel layout. No `CONSTITUTION AMENDMENT REQUIRED` is raised; the approved §6.4 amendment is applied by the parent.

## 1. Decision

**Record 4 W59.** The fresh prototype `prototype/v2-59-world` is ratified as the starting point (some visual decisions will change): home tiles grouped by entity type, per-entity Identity / Looks / Coverage tabs, one needs line per entity naming the shots that need it, the coverage wall as an optional second view, and Complete coverage one disclosure away. [Record 4](../product/CREATOR-RATIFICATION-RECORD-4.md) controls where it refines this document.

**Identity first; production coverage later, driven by the actual shots.**

```diagram
Master Narrative accepted
  └─► extract proposed entities (Mentions, pre-filled descriptions)
        └─► creator reviews: Keep · Defer · Keep lightweight · Merge · change Type · Add missing
              └─► each non-deferred visual entity gets its IDENTITY (description + approved image) = its base Look
                    └─► shot planning (#60)
                          └─► coverage needs derived from the actual shots
                                └─► creator generates the missing production views, accepts in bulk
                                      └─► production
```

- The surface is **one centre workspace opened from the Outline under World**. No gate stands in front of production (R5, X9). Deferral never blocks unrelated work. No Peek, no drawer, no first-run chooser.
- **Visual design is not approved by the prototype.** The three throwaway prototypes (A Dossier, B World board, C Scene-led; branch `prototype/59-world-definition`, never merged) are structural sketches only. **V1's Stage 5 asset-definition and angle-generation interfaces are the visual and interaction reference**, modernized (Record 2 §3.1, X10). Approval here covers functional and interaction models only.
- **Rejected by the creator:** the agent's recommendation to infer "needed-first" coverage before shots exist (prototype C's default scope). Also rejected: B's top table/list as the entity surface. Kept as optional: B's project-wide coverage wall as a second view.

## 2. Entity model the surface exposes

Per visual entity (Character, Location, Prop):

| Layer | Meaning | In the surface |
|---|---|---|
| **Identity** | Canonical description plus the main approved reference image(s). What the entity is. | Identity area: description (pre-filled, editable), attempts, one active approved image. |
| **Base Look** | The default appearance. **Equals the canonical identity**, not a separate object. | Never shown as its own thing; "no Look assignment" means base. |
| **Alternate Looks** | Optional, only when the story or creator needs one (funeral clothes, injured; a place fire-damaged, decorated, abandoned). | Looks area with an **Add Look** action. AI-proposed Looks (from Mentions, with change points) appear here to accept, edit or dismiss. Never forced. |
| **Coverage** (Locations) | Additional named production Views, mostly needed once a shot plan exists. | Coverage area; see §4. |

Extra types have a description (optional image) and no Looks. A lightweight entity is generated from its text; depth is changeable either way at any time. In the surface a lightweight entity reads as an intentional **"Lightweight"** state, neither Identity ✓ nor missing (Record 4 W59.3).

**Looks may be description-only** (Record 4 W59.4). A Look needs no image to be used: generation composes the base identity image with the Look's description of what differs, and the creator can edit that description at any time. When an image is wanted it is generated from the identity image plus the Look description, or uploaded. A Look can also be added or switched from a shot's asset roster (SHOT-MODEL §4a).

**Voice** (Record 5 VP1). A Character's persistent **Voice** is defined here, beside its Looks: the creator uploads a short sample or as much material as they have, and the Voice applies to that character across the whole film. It is optional and deferrable (ENTITIES-AND-LOOKS §7), and its domain seam, consent record and realization are in [`VOICE-AND-PERFORMANCE.md`](../domain/VOICE-AND-PERFORMANCE.md) (#69): samples are Supplied project media, and a quiet authorisation line appears only once samples exist. Recording or uploading a performance of a specific line happens in Generate (Record 5 VP2), not here.

**Baseline requirement.** A non-deferred Location needs **one approved reference image** (generated or uploaded). It need not be an "establishing shot": a broad view, one wall, a photo or a concept image all work, because its job is "this is what the place looks like". One approved identity image is enough to start a Character or Prop. More references can always be added.

## 3. Extraction review and the entity workspace

Preserved from V1's Stage 5, adapted (Constitution Phase 6 design reference, X10):

1. **Review what Aiuteur found.** One list of proposed entities grouped by type, each with a pre-filled description compiled from every Mention (`ENTITIES-AND-LOOKS.md` §2.2), the scenes it appears in, and per-entity actions: **Keep**, **Defer**, **Keep lightweight**, **Merge** (with a duplicate suggestion, e.g. "Mr. Hale" and "Marcus Hale"), and **change Type**. **Keep all** is one action. Nothing is a gate; unreviewed entities simply read "not reviewed".
2. **Add anything missing.** A persistent **Add** action creates any entity type by hand, whether extraction missed it, it appears later, or the creator wants to define it directly. Extraction accelerates; it never constrains (D59.7).
3. **Entity workspace (A's structure).** Selecting an entity opens its workspace in the centre with **Identity / Looks / Coverage** areas. Identity shows **multiple generated or uploaded attempts with one active approved image**, an Approve identity action (which offers, once and quietly, to lock it: Record 1 #63 item 2), and the entity actions above.
4. **Merge, change type** behave exactly per `ENTITIES-AND-LOOKS.md` §§2.3–2.4: nothing is destroyed, merge is reversible with Undo, a retired entity keeps a redirect.
5. **Visual Style** is one area of the same surface: a **preset**, **plain English**, **reference images** or a reusable style (library is LATER). If the creator sets none, the AI chooses one as a visible **AI-made choice** ("AI chose: …", one click to replace) so a project is never blocked on style. Changing it later only marks visual work possibly out of date (R2).
6. **"The world is set"** is a quiet, optional moment (V1's "finalize"), summarising kept, lightweight, deferred and unreviewed counts. It offers the lock on Visual Style / World Definition (Record 1 #63 item 3), never requires it, and gates nothing.

## 4. Location coverage: shot-driven, bulk-accepted

### 4.1 Flow

1. **Identity first.** The Location has its canonical reference image (§2). That is the only thing World Definition requires of it.
2. **After shot planning**, the shots' resolved Directions (the one rule in `ENTITIES-AND-LOOKS.md` §5.3) name the views production needs: "toward the window", its reverse, "from the doorway", "table close". These are **named production views called for by the shots**, not fixed front/side/back counts.
3. **Production coverage readiness** shows quietly per Location as one needs line **naming the shots** that need it: `Hale Kitchen: Identity ✓ · 3 views needed for 7C, 7E, 9A`, with the per-shot checklist on expand (Record 4 W59.2). A needed view stays marked until a View exists or the creator chooses a fallback or Skip. When the shot plan changes and reveals a new need, the marker reappears (`1 new view needed`). The marker explains and offers the fix; it never blocks and never spends (X8, X9).
4. **Generate the missing views**: one control at the Location (and the same action offered project-wide from the second view, §5). Views are generated **from the approved canonical reference** to hold identity. The V1 angle-generation interface is the model to keep, adapted to named, shot-driven views.
5. **Bulk acceptance.** The generated views arrive as a **contact sheet reviewed together** with one **"Accept all N"** action, reversible (Undo), then **per-tile fixes afterwards**: Redo, Upload, Skip, or promote an approved Frame. Every view is a draft Attempt the creator reviews (R5); a missing or weak view falls down the fallback ladder, reported quietly.
6. **Optional, any time, including before any shots exist.** "Generate more views" / "Complete coverage", or setting up as many Directions and Views by hand as the creator likes. This is the opt-in path, not the default, and nothing blocks it.
7. **Per-location single-image option** stays: a Location may use one image everywhere (coverage with one Direction).

Coverage is a sparse matrix of Direction × Look (ADR 0003), so Looks multiply coverage cost. That is why §6 matters.

### 4.2 Cost disclosure

- The **estimated price is on the initiating button** ("Generate 4 views · est $0.32"). A batch under 10 Generations and under $2.00 total is **one click, no second step**.
- When a confirm rule fires (total ≥ $2.00, ≥ 10 Generations, bulk by filter, unknown price, would reach a cap), an **inline ticket at that control**, never a centred modal (X2), shows the sum, the count and the largest item. A cap breach offers **no Start** (X2).
- **No automatic media spend** (X8): a new coverage need, a changed shot plan or a staleness flag never generates anything. The creator's click approves the shown sum.
- Prices in the prototype ($0.08 per image) were illustrative; real estimates are code-computed (`BUSINESS-AND-OPERATIONS.md` §4).

## 5. Layout (functional only)

- **Entity workspace** (§3.3): the per-entity surface, with Identity / Looks / Coverage areas and the extraction review, from prototype A. This is the main surface.
- **World Definition home** (when not inside one entity): **tiles**, one image per entity grouped by type, with a **carousel** through that entity's generated or set images, and the quiet Identity / Production-coverage readiness per tile. Unreviewed, deferred and lightweight entities read as such, quietly.
- **Project-wide coverage view**: a scrollable second view in the manner of the lower half of prototype B (every Location by its production Views), acceptable as an alternative overview and the place for project-wide "generate the missing views" and "Accept all N". B's top table/list is not adopted.
- The coverage wall and the per-entity workspace are **two views over the same canonical World Definition data**; a change in one is the other.
- A scene or shot needing a missing entity or view shows it quietly in the scene workspace and links here; it never blocks (NAVIGATION §8).

## 6. Location variants

A night or other variant of a place may be **either** an alternate Look of the same Location **or** a separate Location entity. The creator chooses; both work and neither is privileged. Guidance shown at the choice, not enforced: time of day and lighting normally come from the scene and shot (compiled from the narrative), so Looks are for changes to the place itself (burned, flooded, redecorated), because each Look needs its own Views per Direction. A separate Location carries its own identity and coverage.

## 7. Trust signals in this surface

Per [`TRUST-SIGNALS-AND-LOCKS.md`](TRUST-SIGNALS-AND-LOCKS.md): AI-made choices (style default, Directions the AI picked or proposed at shot planning, merge suggestions) are quiet inline tags, overridable in one click, until the creator approves the containing thing (identity approved, the world is set); after that they show only through the AI vs mine toggle and the on-demand list (Record 4 Y2). Accepted descriptions carry no persistent "AI generated" badges (Y1). Possibly-out-of-date marks on images after a style or description change are whispers, never fading the work. Readiness is explanation, not a gate. Nothing in World Definition uses banners, modals or alarm styling.

## 8. Constitutional check

No requirement is unworkable. §4.2 Phase 6 (V1 Stage 5 reference, deferral, lightweight, merge, change type, extra types, a clear "finalize" moment), §6.3–6.5 and §6.4's design requirement (shot-driven coverage as the default outcome, AI-produced, cheap to accept in bulk, never a mandatory ritual) and §13.4 (2) (creator-initiated spend with a shown estimate) are all met. The single-image option, AI-generated views, deferral never blocking and lightweight entities are preserved. The §6.4/§15.1 wording is amended by the creator (Record 2 §8). Capability honesty (research #6: AI view-from-reference is undocumented as of 2026-10-18): every View is a draft Attempt with Redo / Upload / Skip / promote-Frame, so quality variance never breaks shot resolution.

## 9. Hand-offs

| Ticket | Receives |
|---|---|
| **Scene hub and shot planning** (#60) | For each shot, planning picks an existing named Direction or proposes a new named one; a new Direction's empty View becomes a production coverage need (D59.11). The creator may also add Directions and Views by hand at any time (§4.1). Directions the AI chooses are persisted AI-made choices; a shot's Direction is shot-owned (P2). Planning never waits on World Definition (R5). |
| **Entities and Looks** (#53) | Updated §§2.2a, 3, 5, 7 and ADR 0003 (this pass). |
| **Trust signals** (#63) | Lock offers at identity approval and "world is set". |
| **Spend** (#68) | Contact-sheet generation is one creator action with one estimate; inline ticket per X2. |
| **AI responsibility map** (#64) and **Generation package** (#65) | Generations: extraction and Mention derivation, description compile, Look proposal, Direction derivation from the shot plan, View generation from the canonical reference. Identity before style; the package reads canonical state, never Established Facts (X3). |
| **Voice and performance seams** (#69) | The Voice area on the Character (Record 5 VP1): sample upload, the authorisation and consent record it needs, and how the Voice reaches Takes. |
| **Module architecture** (#71) / **Persistence** (#72) | Production coverage readiness is a derived read of shot Directions against Views; the project-wide coverage view needs a cheap whole-project summary. |
