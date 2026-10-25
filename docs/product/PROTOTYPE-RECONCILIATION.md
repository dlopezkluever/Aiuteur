# Prototype reconciliation

**This is the single entry point for interpreting prototype evidence.** Read it before opening any prototype, branch, screenshot or README.

Audit date: 2026-10-25, against `main` after Creator Ratification Record 6 and the final audit (#79). Wayfinder map: [#49](https://github.com/dlopezkluever/aiuteur/issues/49).

Prototypes are throwaway UX explorations. Nearly all of them were built before the final ratified decisions. Treat them as evidence of what was tried and which interaction shapes the creator accepted, never as a statement of what V2 does.

## 1. Rules for `/to-spec`, `/to-tickets` and implementation agents

1. **Authority is never a prototype.** Order: Product Constitution (as amended) → Creator Ratification Records 1–6 (later records control earlier ones) and the final audit → ADRs and `GLOSSARY.md` → `docs/domain`, `docs/ux`, `docs/architecture`, `docs/ai` → prototypes. Where a prototype differs from any of these, the prototype is wrong. Corpora in `_inputs/` are evidence, not authority.
2. **Use only REFERENCE and PARTIAL REFERENCE prototypes** (§3), and only for the surfaces listed there, always together with the delta registers (§4).
3. **Never use an ARCHIVED prototype** for behaviour, layout, copy, data shape or acceptance criteria. Do not open the branch to resolve a question. The reasons they were rejected are in §3, and the surviving ideas are already in the docs.
4. **A prototype is silent, not negative.** Absence of a capability in a prototype is not evidence the product lacks it (§6).
5. **Static data is not data.** Every price, model name, cap, threshold, count, id, label, date, timestamp and Take fixture in a prototype is mock. Thresholds are defined in `docs/domain/BUSINESS-AND-OPERATIONS.md` §3, and they are tunable defaults.
6. **Visuals are not approved** (Record 2 §3.1, Record 5 §1). Inline SVG art, colours, spacing and the shared kit are placeholders. V1 and the V1 WizardDirector remain the visual reference where the docs say so.
7. **Prototype state models are not models.** The prototypes store flags (`stale`, `final`, `ack`, `cov`), mutate arrays in place and take whole-state snapshots for Undo. The real model is derived, append-only and server-enforced (ADR 0004, 0005, 0019, 0020).
8. When a spec acceptance criterion cites a prototype, it must cite the doc rule beside it and name the prototype delta that applies (`RD-nn`).
9. If you find a prototype behaviour that is neither covered here nor in an authoritative doc, do not adopt it. Record it as a spec-level question.

## 2. Prototype inventory and status

Fifteen prototypes were found: fourteen on never-merged `prototype/*` branches and one on `main`. The branch `prototype/ux-v2-shared-kit` is the shared CSS and JS kit, which is infrastructure and not a prototype (§3.4). Branches are kept as historical record. Nothing was deleted, and no prototype code was changed.

| # | Prototype (branch → path) | Tip | Question tested | Status |
|---|---|---|---|---|
| 1 | **#60 final synthesis.** `main` → `prototypes/v2-ux/60-scene-production-final/` | main | How Records 5 and 6 look as one scene workspace | **REFERENCE** (structure only) |
| 2 | **#58 fresh.** `prototype/v2-58-writing` → `prototypes/v2-ux/58-writing/` | `573ebb5` | Ratified writing behaviours: option pager, regeneration dock, sync bar, acceptance sheet | **REFERENCE** |
| 3 | **#59 fresh.** `prototype/v2-59-world` → `prototypes/v2-ux/59-world/` | `cbee026` | Identity-first, shot-driven World Definition | **PARTIAL REFERENCE** |
| 4 | **#62 fresh.** `prototype/v2-62-review` → `prototypes/v2-ux/62-review/` | `0ca87af` | Sequence-first review and playback (A, B, C) | **PARTIAL REFERENCE** (variant A only) |
| 5 | **#63.** `prototype/63-trust-signals` → `prototypes/63-trust-signals/` | `8792144` | Whisper A / Ledger B / Trace C trust signals | **PARTIAL REFERENCE** (Whisper presentation only) |
| 6 | **#57.** `prototype/intake-interview-57` → `prototype/intake-interview/` | `010b4b1` | Input staging; Interview A conversation / B cards / C living brief | **PARTIAL REFERENCE** (Input + Interview A + ledger layout) |
| 7 | **#60 hub round.** `prototype/v2-60-scene-hub` → `prototypes/v2-ux/60-scene-hub/` | `46a8661` | Script Hub and workspace skeleton, Draft all, Options, ad-hoc shots | **PARTIAL REFERENCE** (behaviour illustrations only, no layouts) |
| 8 | **#60 v3.** `prototype/v2-60-scene-production-v3` → `prototypes/v2-ux/60-scene-production-v3/` | `64bd655` | Hub, Prep A/B/C, Generate 1/2/3, Review (the architecture creator-ratified in Record 5) | **PARTIAL REFERENCE** (Script Hub `hub.js` only; Prep, Generate and Review are ARCHIVED) |
| 9 | **#60 workspace U/S.** `prototype/v2-60-scene-workspace` → `prototypes/v2-ux/60-scene-workspace/` | `2e9d72b` | Unified tabs vs staged workspace | **ARCHIVED / DO NOT IMPLEMENT** |
| 10 | **#60 v1.** `prototype/60-scene-hub-shot-planning` → `prototype-60/` | `422667b` | Board, batch drafting (A, B, C) | **ARCHIVED / DO NOT IMPLEMENT** |
| 11 | **#61.** `prototype/61-shot-planning-inputs` → `prototype-61/` (`boundary.html`, `matching.html`) | `40d3340` | CineBlock boundary A/B/C; import matching rules | **ARCHIVED / DO NOT IMPLEMENT** |
| 12 | **#62 v1.** `prototype/62-candidate-review` → `prototypes/62-candidate-review/` | `7d8d0c4` | Review structure A/B/C | **ARCHIVED / DO NOT IMPLEMENT** |
| 13 | **#59 v1.** `prototype/59-world-definition` → `prototypes/59-world-definition/` | `67f8e39` | World Definition A/B/C | **ARCHIVED / DO NOT IMPLEMENT** |
| 14 | **#58 v1.** `prototype/58-writing-experience` → `prototypes/writing-experience-58/` | `3ec65bb` | Writing layout A/B/C | **ARCHIVED / DO NOT IMPLEMENT** |
| 15 | **#56.** `prototype/56-navigation-models` → `prototypes/navigation-models-56/` | `6a453fc` | Navigation A/B/C | **ARCHIVED / DO NOT IMPLEMENT** |

Totals: **2 REFERENCE, 6 PARTIAL REFERENCE, 7 ARCHIVED.**

Research branches (`research/*`) are not prototypes and are out of scope here.

## 3. Status rationale and what each is still useful for

### 3.1 REFERENCE

**#1 `60-scene-production-final` (main).** Use for *interaction structure, surface placement and information architecture* of the scene workspace: Storyboard arrival and Accept plan placement, horizontal shot strip, Shot editor, fold-down Cast & Looks, asset drawer, Frames | Takes toggle, Frames drawer tabs, one-panel Takes drawer, Take composer contents and order, reference library by origin, neighbour row, compare pairs, cut editor, Dialogue section placement, Generate ↔ Review boundary, inline spend ticket placement, quiet readiness line. It follows Records 5 and 6 closely, and no component of it was rejected later.
- Caveats that bind its status. Neither Record 5 nor Record 6 names this prototype. Record 5 ratified the *composition of v3's parts*, and this build is an agent synthesis made afterwards, never creator-reviewed. "Canonical" is a repository label, not a creator ratification. It is **not** a reference for behaviour, data model, prices, spend, lineage, locks, or voice authorisation. See RD-01 to RD-22.
- Its README's "two prototype-level choices not in the docs" are mis-described. *Split at the middle of the action sentences* conflicts with SHOT-MODEL §5.2 (RD-13). *Revoice offered on native Takes only* is in VOICE §4.2 and Record 6 V6.2(3), but the code is looser than the doc (RD-12).

**#2 `v2-58-writing`.** Ratified by Record 4 W58 as "the starting point and implementation guidance". Use for the chosen variant only: option pager with summary and attributes on top and compare on request; one regeneration box below the document; one quiet sync bar with per-beat actions behind the whisper mark; Beat Sheet with Treatment sidebar and Master Narrative with Beat Sheet sidebar; acceptance sheet; Versions preview, restore and bring-back; skipped, bypassed, upload-designated and development-history states; exceptional-spend inline ticket. The strip, compare-as-default, margin and inline variants it also contains were not chosen. It predates parts of Record 4's application and all of Record 6 (RD-23 to RD-28).

### 3.2 PARTIAL REFERENCE

**#3 `v2-59-world`.** Ratified by Record 4 W59 as the starting point. Use for: home tiles grouped by entity type; extraction review (Keep, Keep lightweight, Defer, Merge, type, Keep all, Add); Identity workspace (attempts, one approved image, Approve identity then quiet lock offer); the "Complete coverage" disclosure; contact sheet with *Accept all N*, Undo toast and per-tile Redo/Upload/Skip; Looks vs separate Location sheet; Visual Style page; coverage wall as optional second view; inline spend ticket. **Not** a reference for the Coverage data model (flat named views, one shot per need, no Direction × Look), shot-to-Direction resolution, single-image mode, Voice, Looks form, or needs wording. The Coverage tab must be rebuilt from ADR 0003 as amended (RD-35 to RD-45).

**#4 `v2-62-review`, variant A only.** Ratified by Record 4 W62 as the base. Use for: runtime-proportional scene timeline; gap-slate vocabulary ("3 takes · none picked · Pick", "No take yet · Generate · $x"); Take-card label set; *swap = select* with Undo toast; compare of up to 3 replacing the viewer; whole-film ribbon with filter dimming; spend ticket reason lines and the no-Start cap breach; part-retry and late-arrival presentation. Variants B and C are ARCHIVED. It carries many behaviours Records 4 and 5 and ADRs 0004 and 0005 forbid (RD-04 to RD-06, RD-48 to RD-60).

**#5 `63-trust-signals`, Whisper A presentation only.** Use for: the dot with an accessible name, on-tap sentence and three exits; inline impact strip under the edited text; footer bulk line; write-back note with three choices; *Highlight AI vs mine* toggle; dotted "AI chose" tag. Variant B's grouped-by-reason layout is useful only as the *content of the on-demand review-all tray*. Variant C (Trace) and B's permanent side column are ARCHIVED. Its mechanics (stored flags, client-side lock gating, Regenerate path, take pick ignoring Mark final) are wrong (RD-04 to RD-06, RD-61 to RD-69).

**#6 `intake-interview-57`.** Use for: the Input staging area (item cards, roles, per-item reading panel with confidence and "why", route strip, optional project settings with source tags), Interview variant A (conversation with suggested-answer chips, skip and undo on each question), the ledger layout, the "I think I understand enough" advisory with *finish anyway*, and the three-button conflict question *for new Source Material only*. Variants B (cards, meters) and C (living brief), the Handoff step, the mock classifier and the sample questions are ARCHIVED (RD-29 to RD-34).

**#7 `v2-60-scene-hub`, behaviour only.** Record 4 W60 §5.1 ratified none of its three layouts. Its A (cards with excerpts), B (per-shot ticks, drag cells as editing surface) and C (manuscript-first) layouts are ARCHIVED. Useful, as non-binding illustrations of rules the docs own: the **Draft all** scope-then-invoke flow with the inline ticket and Trim to fit / Raise cap for this action / Not now (no Start on cap breach); the **Options panel** for redraft (touched fields kept, omitted shots listed not retired, locked plans hold Options); **Ad-hoc shots** and **Removed from Story** rows with Move to scene / Bring back / Adopt work; the **auto-draft boundary fixtures** (under $0.05 auto, $0.05 and above "Draft plan · $x", unknown price and $2.00 and above use the ticket, emptied or locked plans never auto-draft). See RD-46, RD-47, RD-05.

**#8 `v2-60-scene-production-v3`, Script Hub only (`hub.js`, `screens/01-script-hub.png`).** Record 5 left the Script Hub unchanged, Record 4 §5.2 is the ratified hub, and the final prototype does not draw it. This is the only rendition of §5.2: compact scene list with per-scene ribbon (picked / needs a pick / missing, no per-shot ticks), large summary panel (scrollable Master Narrative portion, assets, planned vs as-made, progress, key-frame carousel, ending image: frame → Take still → world image tagged → none), "No shots yet", Open scene, Cards toggle. It lacks Draft-all scope controls, the Ad-hoc / Removed rows and Peek (see #7 and IO-6). **Everything else in v3 (Prep A/B/C, Generate 1/2/3, Review, `Select this Take`, Takes dock) is ARCHIVED**, and the final prototype supersedes it.

### 3.3 ARCHIVED / DO NOT IMPLEMENT

Each remains historical UX research. Why each is archived, and the hazards a downstream agent could still trip over.

| # | Why archived | Hazards if misread |
|---|---|---|
| 9 `v2-60-scene-workspace` | Superseded by Record 5 A5, which ratified v3's architecture "over" Variant U (Plan · Frames · Takes tabs) and Variant S (Shots & Assets → Frames & Prompts → Takes). GLOSSARY bans "Plan tab", "Shots & Assets", "Frames & Prompts", "Takes tab". Its hub duplicates v3's. | Tabbed or staged workspace; vertical shot rail; single `direction` string; no Character Voice; Accept plan in each header. |
| 10 `60-scene-hub-shot-planning` | Rejected wholesale by Record 2 D60.1 and D60.8. NAVIGATION §8: "All earlier #60 UX (Board renditions, batch-drafting UIs) is rejected." | Board with a mark per shot; pre-flight batch sheet; run-then-undo tray; ghost marks; "no plan yet"; "last approved end frame" as scene image; `Regenerate` for stale. |
| 11 `61-shot-planning-inputs` | `boundary.html`: all three CineBlock boundaries were rejected by Record 2 D61 (CineBlock is part of Aiuteur, same account and session; ADR 0024). `matching.html`: most rules were ratified into SHOT-PLANNING-INPUTS §6, which controls. No doc cites either file as a reference. | File-export or launch-token CineBlock; manual attach step; Retire that deletes the reference; one button that attaches *and* generates three frames; storyboard rows that create shots; "Ask AI" picking without a verified quote; the hard-coded scoring weights. |
| 12 `62-candidate-review` | Superseded: creator chose C (D62), then Record 4 W62 ratified `v2-62-review` variant A. | Popover or docked confirmation tray; cap breach that still offers Start; take wall; filmstrip; `ood` flags; hard-coded $25 cap. |
| 13 `59-world-definition` | Superseded by Record 4 W59. | Pre-seeded multi-Direction lists and "Establishing" as a fixed first Direction; "Generate all missing"; "Cover what the story needs" (rejected); a centred modal for spend; top table as the entity surface. |
| 14 `58-writing-experience` | Superseded by Record 4 W58. | Option-count chips; unchecked Lock; accept gated by the Treatment/Beat disagreement; stepwise accept wizard; spread; persistent "AI added" tags. |
| 15 `56-navigation-models` | Record 4 line 129: "Only `docs/ux/NAVIGATION.md` is authoritative." Only the idea of model C (outline tree plus board) and the status vocabulary survive, and NAVIGATION.md states both in text. | Right-hand shot drawer; first-run chooser and coach marks; Board square per shot; Frames/Takes/Audio as phases or tabs; "Generate approved shots…"; banners. |

### 3.4 Shared kit (not a prototype)

`prototypes/v2-ux/shared/` (`kit.css`, `kit.js`, identical to `prototype/ux-v2-shared-kit`) is shared styling and helpers for the `v2-ux` prototypes and is a runtime dependency of the final #60 prototype. It has **no product status**. Colours, the 232 px outline and 40 px strip are not ratified design. `spendKind()` is not the spend policy: it omits the trivial class, the all-video rule and bulk-by-filter. See RD-01. The branch also holds `docs/product/CREATOR-PROTOTYPE-GRILL-HANDOFF.md`, which is not on `main` and is historical.

## 4. REQUIRED DELTA register

Format per row: **ID** · Prototype / surface · *Prototype shows or assumes* → **Authority requires** · Sources · Consequence. "Final" = #1, "v2-62" = #4, "63" = #5, "57" = #6.

The register covers REFERENCE and PARTIAL REFERENCE prototypes. For ARCHIVED prototypes the hazard list in §3.3 is the guide, and deltas that also appear in them are in the cross-cutting section.

### 4.1 Cross-cutting (apply wherever a prototype shows the surface)

**RD-01 · All prototypes · Prices, models, caps and spend class are mock.**
*Shows:* hard-coded point prices ($0.04 frame, $0.07/s, flat voice fees of $0.05, $0.06 and $0.12); model names ("Kling 3", "Veo 4", "Wan 3", "Experimental X", "Kestrel Pro"); caps ($5, $25) and a daily-only cap; client-side `spendKind()`; Retry priced at one model's rate whatever model made the failed run; Look image creation ("Create Look · $0.04") as a plain button with no gate; the voice batch silently skipping lines.
→ **Requires:** spend class is code-computed from the estimate against its upper bound (trivial under $0.05; meaningful otherwise and always for video; confirm step at $2.00 total, 10 or more Generations counting Takes not Segments, bulk by filter, unknown price or cap hit); every priced action, including Look and View images and audio, passes the same rule; estimates come from price entries by unit with an as-of date; audio is billed by character or second, and a lip-synced Take shows "Take $a + lip-sync $b = $c"; creator caps are daily, monthly and optional per-action with defaults parked; a cap breach offers no Start; only the creator Raises the cap for this action.
Sources: BUSINESS-AND-OPERATIONS §3, §4, §6.1, §9; VOICE §6.5; Record 3 §2; Record 4 Y7; ADR 0015.
Consequence: never copy a figure or model name as data. The three authoritative numbers are $0.05, $2.00 and 10, and they are tunable. Retry is priced from the model that made the failed run.

**RD-02 · Final, v2-62, v2-59 (and every archived #60) · A shot has one free-text `direction`; Directions are not Look-aware.**
*Shows:* a single `direction` string per shot (often with compass hints "north", "south-west"), edited under "More detail" and read by the frame prompt; ordered Direction chips in Final that never reach the frame prompt, ingredients or composer; hard-coded prompt strings ("north wall view") in v2-62.
→ **Requires:** a shot resolves **one or more ordered Directions**, as many as the space it reveals needs, never a camera-movement label; the AI proposes them from the shot's cinematography as an editable AI-made choice (no advanced setting); a Direction is a named Slot, with label, description and optional opposite, and a View Slot per Look (or base); order is shot-owned and never raises write-back; the Package carries every resolved Direction; Fit picks the subset that best covers the revealed camera path and reports it.
Sources: Record 6 L6.3–L6.6; ADR 0003 (amended); ENTITIES-AND-LOOKS §5.1–5.3, §7; SHOT-MODEL §2.1; GLOSSARY Direction, View.
Consequence: model Directions as a first-class ordered list of Slot refs. Drop the free-text field (or demote it to a camera note that never asks). Do not carry compass hints, which imply the LATER spatial model (LS-1).

**RD-03 · Final, v2-62, v2-59, v2-60 hubs/v3 · Dialogue and Character Voice are absent or partial.**
*Shows:* dialogue as speaker + free text + delivery note (older #60); no Voice (v2-59, v2-62, v3); in Final only a target-Voice boolean (see RD-10 to RD-12).
→ **Requires:** Voice is a persistent identity defined in World Definition on a Character (Record 5 VP1, Record 6 V6.1) and is reusable across the film inside the project; native dialogue is the default and needs none of this (V6.5); three explicit, priced, creator-initiated paths per line: **Generate as Character Voice**, **Performance → Character Voice**, **Native → Character Voice** where supported; plus priced **Generate unvoiced lines** for a shot or scene; one chosen Line audio per line; the authorisation gate for cloned voices; `performance-changed` and `authorisation-revoked` markers; recording and upload live in the Takes drawer's Dialogue section, and Scene Prep shows only a quiet 🎙 mark. Do not reuse "Voice" as a speaker label.
Sources: Record 5 VP1–VP5; Record 6 V6.1–V6.5; ADR 0025 (amended); VOICE-AND-PERFORMANCE §1–§4; GLOSSARY Voice.
Consequence: use the Final prototype only for Dialogue placement; behaviour comes from the docs.

**RD-04 · 63, v2-62, Final (and archived v1 #62) · Possibly-out-of-date is stored or hand-set, partial, and uses free text.**
*Shows:* stored flags (`stale`, `ack`, `ood`, `f.stale`) set by hand on edit; only later shots' Frames marked; `performance-changed` set on every Take of a shot; free-text reasons ("Built from the earlier pick of 7A"); exits limited to "It still fits"; the dot reused for "ready, not selected"; Undo toasts that reset the flag.
→ **Requires:** derived on read by comparing the input fingerprints captured at dispatch, minus Acknowledgements scoped to exact content; a closed reason vocabulary rendered as one sentence (`shot-changed`, `look-changed`, `identity-changed`, `coverage-changed`, `frame-changed`, `performance-changed`, `authorisation-revoked`, `prompt-override-changed`, `upstream-pending`…); exits **Regenerate / It still fits / Keep as is**; footer bulk line and on-demand review-all tray; staleness never spends; late results arrive already flagged; marks only work that actually captured the changed input.
Sources: ADR 0004; LINEAGE-AND-STALENESS §2.3, §3.1–3.4; TRUST-SIGNALS §2; GLOSSARY Whisper, Acknowledgement.
Consequence: nothing stores an outdated status. Only Acknowledgements are written. "Ready, not selected" is a text label, not the dot.

**RD-05 · 63, v2-62, Final, v2-60-scene-hub · Locks and edit-through are wrong or bypassable.**
*Shows:* Mark final blocks a pick change with "Unlock it to change the pick" (v2-62); Reject, Unselect and 63's `pick()` bypass or ignore the lock; Mark final as a boolean on the shot; the Review-only confirm bar (Generate's "Use this Take" on a final shot is a silent no-op); lock gating and impact computed in the browser; locked plans disable structure edits behind one-click Unlock (hub); a `locked` scene suppresses the stage-entry auto-draft.
→ **Requires:** every path that moves a Slot choice inside a lock (Select, Unselect, Reject of the selected Take, Restore, compare-pane Select, Generate and Review pointers) passes one server write gate; changing the pick on a final shot is **edit-through**: server-computed impact (tier 0 nothing, tier 1 inline warning naming dependants, tier 2 affected items and money at risk first), one confirmation per editing session, no cascade; "no surface forces unlock first"; Mark final is a normal lock Decision on the Take Slot, one glyph, one unlock gesture; **a locked shot plan receives AI results as held Options, never applied and never suppressed**; a hand edit to a locked plan uses edit-through.
Sources: ADR 0005, 0012; LAS §6; TRUST-SIGNALS §3–§6; CANDIDATE-REVIEW §3.1, §9.2; Record 4 W62.7, Y5; Constitution §13.4 (a displayed lock must hold everywhere).
Consequence: one server operation reachable from every surface. Do not read `locked` as a gate on auto-drafting.

**RD-06 · 63, v2-62, Final · Take selection and creation rules.**
*Shows:* Regenerate from a trust dot creates a Take, selects it, clears the marker and spends nothing visible (63); seed fixtures that pre-select Takes; Takes "from the merged shot" selectable (v2-62); a partial run shown as a selectable Take with Use and compare (Final 7G); "Retry part 3" finishing a whole long Take and "From part 3" as an inert button (v2-62).
→ **Requires:** Takes are **never auto-selected**; a pointer references a Take of its own Shot only, so Takes from a merged shot are visible, playable and labelled "from the merged shot" but not selectable; a Take exists **only when assembly succeeds** ("2 of 3 parts made" is a shot state, never a Take); a failed Segment shows its own price on Retry; later Segments are re-queued by "Continue the batch" with no new approval; **Regenerate from part k** states the saving; the Segment plan comes from the model's capability profile.
Sources: SHOT-MODEL §5.3, §7.3; ADR 0012, 0013; JOB-LIFECYCLE §8, §11; CANDIDATE-REVIEW §3.1, §6, §9.2–9.3; Record 4 W62.8; Record 5 GN4, GN6.
Consequence: state is derived from the Batch and Segments. A new Take appears only on assembly success. Regenerate always arrives unselected and priced.

**RD-07 · Final, 63, v2-58 · Retire, never delete; Undo and restore add a new head.**
*Shows:* Merge splices the later shot out with its Frames and Takes, while the header claims they "stay reachable"; Remove shot is a splice; Undo as whole-state snapshot replacement (`S.versions=p.vl`) that truncates history.
→ **Requires:** Merge keeps the earlier id and **retires** the later with `merged_into`; both shots' Frames and Takes stay on their own shots; Remove is retire (Frames, Takes, anchors, Decisions stay attached; un-retire restores the id; excluded from runtime and default export; the last shot can be retired); restore adds a new current Revision, and history is never rewound; Undo of a sync or a held change is a restore of the prior head.
Sources: SHOT-MODEL §3.1, §5.1, §5.3, §12; ADR 0012, 0019, 0020; WRITING-EXPERIENCE §2.4, §4.3, §7.2; Constitution (retire, never delete).
Consequence: retire groups, never `DELETE`. Review totals, runtime and export exclude retired shots.

**RD-08 · 56, 57, 58 (archived v1 and fresh), 59, 63 · Provenance and AI marks are whispers that expire.**
*Shows:* full-width banners for upstream edits and skipped phases (56); loud amber provenance cards and red chips (57); persistent "AI added" tags on Master Narrative prose with Keep/Remove (v2-58); a permanent "AI-compiled" badge on every description (v2-59); two provenance classes with whole-line tint (63); AI-chose tags that flip "AI chose" ⇄ "yours" forever (63).
→ **Requires:** flags are whispers, never a banner, modal or alarm styling; **accepted content carries no persistent "AI generated" or "AI added" badge** (Y1); AI-made marks show until the creator accepts or approves the containing thing, then only via the *Highlight AI vs mine* toggle and the on-demand project-wide list (Y2); four provenance classes (creator-written, creator-imported, AI-generated, AI-edited at the creator's request), span-level in text; the screenplay-conversion review (Keep / Remove / Keep all) opens with the toggle on and never gates.
Sources: Record 4 Y1, Y2, §2 item 6; TRUST-SIGNALS §1–§2; WRITING-EXPERIENCE §5; NAVIGATION §3; Constitution §13.2; GLOSSARY Whisper, AI-made choice.
Consequence: pending proposals ("AI noticed", "AI chose" on style) may be marked. Accepted content is not.

**RD-09 · Final, 63, 57, archived #60 · Terminology.**
*Shows:* "Script ▸", "From the script", "Update the script to match"; "Aiuteur chose"; "Regenerate" for a retry and "stale/outdated" in UI; "Voice" as a speaker label; "Plan tab", "Shots & Assets"; Offering shown to the creator; "Establishing" as a default Direction.
→ **Requires:** GLOSSARY `_Avoid_` lines (Master Narrative not script; AI-made choice; Whisper; Scene Prep, Generate; Voice means the identity). *Script Hub* survives as the ratified name for the Board (Record 5, NAVIGATION).
Sources: GLOSSARY; NAVIGATION §2; Record 5.
Consequence: low severity. Copy follows the glossary. Whether "Offering" is creator-facing is unspecified.

### 4.2 #1 Final #60 synthesis

**RD-10 · Dialogue → Take · Long Line audio does not lengthen the Take or its price.**
*Shows:* "This Take will be made long enough" and "Set shot to N s", but `genTake` creates the Take at `s.dur` and `takeEst` prices `s.dur`.
→ **Requires:** when required length exceeds the shot, the Generation's target duration becomes the required value, the estimate uses the value sent, and the shot's own duration changes only if the creator accepts "Set shot to N s"; planning also governs Segment count and `unmet-blocking`.
Sources: VOICE §3.1–§3.2, §13 inv. 8; SHOT-MODEL §10. Consequence: compute required length (lead-in, audio, gaps, tail; operator config) and use it for the Take target, Segment plan and the price on Generate Take.

**RD-11 · Dialogue · Voice authorisation gate only partly drawn.**
*Shows:* Speak-as checks only the target Voice; an uploaded Performance has no basis; the batch silently omits un-attested cloned Voices; attestation offers only "My own voice" / "I have permission"; no revoke control; authorisation stored as a boolean on the Voice.
→ **Requires:** Performance → Character Voice needs the **Performance's basis** (`own-voice`, `permitted`, `licensed`) **and** an authorised, `synthetic` or `stock` target Voice; the batch checks per Voice as for one line, asked once at the action, never a modal; revocation is reachable from the Voice area **or the Dialogue section**; failure is `unmet-blocking` with exits; the statement is versioned text per subject with the sample-set hash.
Sources: VOICE §1.4, §2.1–§2.4; ADR 0025; Constitution §11.2. Consequence: store authorisation per subject, never a boolean; one deterministic function in the dispatch gate.

**RD-12 · Dialogue · Revoice availability is both stricter and looser than the doc.**
*Shows:* unavailable whenever the shot has more than one speaker name ("this Offering does not isolate speakers"), tested on the first line only; offered again on an already revoiced Take.
→ **Requires:** available only on a native (path N) Take, with one speaking Character **or an Offering that declares speaker isolation**, and only if an eligible `audio.transform` Offering exists, otherwise unavailable with the reason; result is a new Take `derived_from` the source, never auto-selected, no write-back, limits stated (`revoice-ambience-altered`, `timing-not-preserved`).
Sources: VOICE §4.1–§4.2, §8, inv. 15; Record 6 V6.2(3). Consequence: availability comes from the Offering's declared speaker-isolation field. The prototype's two-speaker rule is a simplification. The prototype does correctly show new Take, source untouched, never auto-selected and limits stated.

**RD-13 · Shot header · Split cuts at the sentence midpoint and renumbers lines.**
*Shows:* automatic midpoint cut with no boundary choice; dialogue lines on the second part get new ids; duration divided by sentence count, unmarked; no "Copy to the other part" offer; second part's Takes unmarked; README calls this "not in the docs".
→ **Requires:** code cuts at boundaries the creator picks or an AI call proposes; lines keep their ids with the part that contains them (only a line cut across the boundary gets a new id, `split_from`); duration partitioned in proportion to text and marked as estimate; composition references stay with the id-keeping part with a quiet Copy offer; Frames, Takes and selected Take stay on the first part, which is marked `shot-changed`; Line audio stays with the id-keeping part and is marked; both parts are one undoable action group.
Sources: SHOT-MODEL §5.1–§5.2, §10; ADR 0012; AI-RESPONSIBILITY-MAP (split chooses boundaries, code cuts). Consequence: needs a boundary step. Line ids are stable across split (Line audio and Performances are keyed to them).

**RD-14 · Strip, Add shot, Reorder · Shot id is the display label.**
*Shows:* "7B" as both identity and label; Reorder leaves "7C" in position 2 under "Shot 2 of 10"; Add shot invents the next letter.
→ **Requires:** a Shot has a permanent id never derived from position, label or text; "Shot 4B" is a label computed from order. Sources: SHOT-MODEL §2, §5.1, §10. Consequence: opaque ids; labels computed from plan order.

**RD-15 · Asset drawer · Characters and Props have a "View" axis.**
*Shows:* Front / Three-quarter / Profile / From behind (Characters) and Standard / Close-up (Props) galleries.
→ **Requires:** View is one image filling a Direction's Slot for a Look and applies to **Locations** only; Characters and Props have canonical identity plus Look images. Camera angle on a person is a camera facet, not an entity View. Sources: GLOSSARY View, Direction; ENTITIES-AND-LOOKS §1, §5; Record 5 SP6.

**RD-16 · Location card · Coverage is per Direction only; missing Views resolve instantly.**
*Shows:* coverage per Direction (not per Direction × Look); "Generate N missing Views" sets coverage at once with no contact sheet or Accept all; Directions are label only; the creator can only pick existing Views.
→ **Requires:** coverage need derived per (Direction, resolved Look); Views arrive as **draft Attempts** after a priced creator action and are accepted in bulk, reversibly (contact sheet, Accept all N); a Direction has label, description and optional opposite; the fallback ladder (Direction × Look → base + Look delta text → establishing View → identity image → text only) is reported quietly.
Sources: ADR 0003; ENTITIES-AND-LOOKS §5.1–5.3; WORLD-DEFINITION §4.1. Consequence: see RD-02, RD-35 to RD-39.

**RD-17 · Prompts tab · Prompt override is whole-text and "stops following the shot".**
*Shows:* editing replaces the whole prompt; a single override string.
→ **Requires:** the only stored prompt-shaped data is a **layer-addressed Override** that stays in effect when upstream changes and shows a quiet "base changed" note (Keep mine / Use the new text / Edit); a displayed prompt is a preview of the compiled Package; the ingredient strip is read from the Package and never stored on the Shot.
Sources: GENERATION-PACKAGE §2, §8; ADR 0014; Record 5 GN3; GLOSSARY Override.

**RD-18 · Composer · Generating without an approved opening frame records no skip.**
*Shows:* "You can still generate" with an unchanged button.
→ **Requires:** the control reads "Generate without the unapproved opening frame" and **records the skip for that role as a Decision**; batches offer "Include them anyway (skips their frames)". Readiness explains and never gates. Sources: SHOT-MODEL §6.2, §6.5; CANDIDATE-REVIEW §3.2.

**RD-19 · Shot editor · Write-back note appears only under a Look change.**
*Shows:* "Decide later / Update the script to match / Keep as a deviation" for a Look change only.
→ **Requires:** one quiet note under any edited narrative-bearing field (action, line text, speaker, presence, location): **Update the Master Narrative · Keep for this shot only · Decide later**; delivery and Directions are shot-owned and never ask; delivery overrides have **Copy to narrative**; a chosen Performance runs a transcript check and may raise `differs-from-narrative`, never blocking.
Sources: TRUST-SIGNALS §2; SHOT-MODEL §2.1; VOICE §3.3; Record 5 SP8. Consequence: the prototype's silence is an omission, not a rule.

**RD-20 · Takes drawer · Model choice is a hard-coded default plus local state.**
*Shows:* "Kling 3 · default · $0.07/s" with per-shot UI state.
→ **Requires:** precedence shot override > project choice > Automatic (bias `balanced`); the control states the effective model and price; an unavailable override resolves visibly as Automatic; a per-shot override is a shot-owned slice recorded on the Generation.
Sources: PROVIDERS-AND-MODELS §8.1–§8.5; Record 5 GN5.

**RD-21 · Scene entry · Empty-scene copy contradicts the emptied-plan rule.**
*Shows:* a scene with no shots says it "drafts itself the moment you enter … (under $0.05)" even if the creator removed every shot.
→ **Requires:** a plan emptied by retiring all its shots is still an existing plan; entering it drafts nothing; the scene reads **"No shots yet"**. The auto/click rule itself is correct in the prototype. Sources: SHOT-MODEL §3.1, §12 inv. 13; Record 3 §3; Record 4 W60 §5.2.4.

**RD-22 · Prep / Generate · Hand-set CineBlock and readiness gates.**
*Shows:* a "Right assets and Looks confirmed" checkbox on a CineBlock capture and a "Ready to generate from / Not ready" chip.
→ **Requires:** captures need a full description and the right assets (Record 4 §5.8) but no confirmation gate; readiness explains and never gates. The checkbox is a prototype invention. Sources: Record 4 §5.8; SHOT-PLANNING-INPUTS §3.

### 4.3 #2 `v2-58-writing`

**RD-23 · Writing · "New alternative" after a choice lands under "Other options".** → **Requires:** it lands as a new unchosen option opened in the pager; the chosen Treatment is untouched until Choose. Sources: Record 4 W58.3; WRITING-EXPERIENCE §2.3.

**RD-24 · Acceptance sheet · "Update first" does not return.** *Shows:* jumps to the Beat Sheet. → **Requires:** the creator returns to the sheet. Sources: Record 4 W58.4; WRITING-EXPERIENCE §6(1).

**RD-25 · Skipped Treatment · "Draft treatment options" has no price.** → **Requires:** **Draft treatment options · $x**, an explicit priced action under the normal spend rules; stage-entry authorisation does not extend to un-skipping. (Ordinary non-skipped entry correctly shows no price.) Sources: Record 4 W58.5; WRITING-EXPERIENCE §3; Record 3 §1–2.

**RD-26 · Writing · Unchosen variants are live.** *Shows:* option strip, compare-as-default, margin dock, inline sync, "Settings n". → **Requires:** pager with compare on request, one dock, one quiet bar; no count chrome (the option count is an Account setting, default 3). Sources: Record 4 W58.1–W58.2; WRITING-EXPERIENCE §2.1–§2.2, §4.3.

**RD-27 · Revisions, notes, protected spans · Data model simplified.** *Shows:* consecutive edits coalesce by overwrite; notes anchored to paragraph indices; versions as HTML strings; partial protected rewrite held as a whole selection. → **Requires:** block-run provenance (`creator`, `imported`, `ai_generated`, `ai_edited`); notes anchored to block ids, retire-only; protected spans passed as handles and restored by code; pre-operation capture before AI operations. Sources: WRITING-EXPERIENCE §2.4, §2.6, §10; STORY-DOCUMENTS §3–§4. Consequence: infer no data model.

**RD-28 · Accept and Unlock · Preconditions and edit-through not modelled.** *Shows:* a zero-scene Master Narrative can be accepted; Unlock is a toast. → **Requires:** a zero-scene Master Narrative cannot be accepted; the acceptance sheet's Lock checkbox is checked by default; unlocking and later edits use the lock's edit-through with server-computed impact. Sources: SCENE-IDENTITY §2.1; WRITING-EXPERIENCE §6, §8; TRUST-SIGNALS §3–§5; Record 1 #63 item 3.

### 4.4 #6 `intake-interview-57`

**RD-29 · Input · AI classification or the first-item default adopts material into the workflow.** *Shows:* first item defaults to `primary`; a treatment-like primary item "enters at Treatment"; the handoff lists "Treatment (your document is imported)". → **Requires:** an upload becomes the Treatment only by **explicit designation in Input**; uploading or classification does not adopt it or suppress initial drafting. Sources: Record 3 §1 (CR-1); INTAKE §1; NAVIGATION §2 Treatment entry.

**RD-30 · Handoff · "Nothing is generated or spent until you ask."** → **Requires:** true only at the Input step. Entering the active Treatment stage with no Treatment, options or designated upload **auto-drafts** the Settings count (default 3, about $0.18) with no Draft button, price label or confirmation; exceptional spend conditions still stop with the inline ticket. Sources: Record 3 §1–§2; BUSINESS-AND-OPERATIONS §3; Record 6 §5.

**RD-31 · Conflict question · A creator's own edit raises it.** → **Requires:** the keep / update / deliberate-exception question is for **new Source Material** only; a creator's own edit that contradicts a Fact raises no question: the edit wins, the Fact is quietly marked superseded (a Revision) with Undo. Sources: Record 2 P10, X3.5; INTAKE §1; AI-RESPONSIBILITY-MAP §4.3.

**RD-32 · Interview · Questions reach into entity and visual detail.** *Shows:* "How should Dolores look on screen?", "Does the ghost…", Look and age questions stored as Facts. → **Requires:** the Interview captures intent and non-negotiables; Look and entity detail belongs to World Definition; the questions are an AI responsibility, intent-level. Sources: INTAKE §1 scope guard, §3.4, §4; AI-RESPONSIBILITY-MAP §7. The sample questions are illustrative only.

**RD-33 · Ledger · Structure, Revisions and styling.** *Shows:* "Established Facts" vs "Aiuteur chose" split; no per-Fact Revision or Undo; amber card and red chips. → **Requires:** ledger grouped by topic, each item editable in place (an edit is a Revision), quiet provenance; AI-made marks per RD-08. Sources: INTAKE §1, §4; Record 4 Y2; GLOSSARY AI-made choice.

**RD-34 · Input settings · Writing Style missing.** → **Requires:** project settings include the project's Writing Style, set in the Input settings block. Sources: NAVIGATION §4 (Settings ruling, #79); ENTITIES-AND-LOOKS §8. Minor.

### 4.5 #3 `v2-59-world`

**RD-35 · Coverage · View conflated with Direction; no Direction × Look matrix.** *Shows:* `views:[{name,status,why}]` as a flat list; a Look view is a concatenated string; no Direction object, opposite or description. → **Requires:** Coverage is a set of Directions (own id, label, description, optional opposite), each with a View Slot per Look or base, forming a sparse matrix; a View is an Attempt filling a Slot, one active, and may be promoted from an approved Frame. Sources: ADR 0003 (+ Record 6 amendment); ENTITIES-AND-LOOKS §5.1; GLOSSARY. Consequence: Location-owned Direction records; do not copy `views[]`.

**RD-36 · Needs · A shot needs one or more ordered Directions, and the needs line names the shots.** *Shows:* each need has one origin shot ("Sc 1 Sh 3"); the line reads "4 production views needed · 1 new ●". → **Requires:** "A shot counts toward every view it needs"; one needs line per entity naming the shots (`3 views needed for 7C, 7E, 9A`) with the per-shot checklist as the default expansion. Sources: Record 6 L6.3; Record 4 §3 item 2 (W59.2); WORLD-DEFINITION §4.1.

**RD-37 · Location · No per-Location single-image mode.** → **Requires:** single-image mode stays as the creator's per-Location choice (coverage with one Direction); a shot revealing more than the image covers gets a quiet reference-quality note, never a block; no automatic "establishing" Direction. Sources: Record 6 L6.5; WORLD-DEFINITION §4.1(7).

**RD-38 · Needs · AI-proposed Directions are not shown as editable AI-made choices.** *Shows:* needs simply appear. → **Requires:** the AI proposes ordered Directions as an editable AI-made choice, persisted (not re-derived), with a quiet tag until the containing thing is approved. Sources: Record 6 L6.3; ENTITIES-AND-LOOKS §5.3; WORLD-DEFINITION §7.

**RD-39 · "Generate more views / Complete coverage" · Preselected canned wish-list.** *Shows:* all suggestions preselected into a spend total. → **Requires:** the opt-in path is allowed one disclosure away, but no Directions are proposed up front, nothing is preselected, nothing generates automatically, and "multi-direction by default" is not restored. Sources: ADR 0003; WORLD-DEFINITION §4.1(6); Record 2 D59.1, D59.11.

**RD-40 · Character workspace · No Voice area.** *Shows:* Identity / Looks / Coverage tabs only. → **Requires:** a Character's persistent Voice is defined here, beside its Looks: description; supplied samples; priced designed-voice previews (creator picks one; saved audio becomes the fixed identity; basis `synthetic`, no attestation); stock or cloned only behind the gate; optional and deferrable; quiet authorisation line only once samples exist; reusable across the film inside the project; dormant if the type changes; recording or uploading a Performance of a specific line is **not** here. Sources: WORLD-DEFINITION §2, §9; Record 5 VP1–VP2; Record 6 V6.1, V6.3; VOICE §1.1, §2; ADR 0025.

**RD-41 · Looks · Image-first.** *Shows:* a Look is `{name, hue, from}` with a placeholder image; "Edit" is a stub. → **Requires:** a Look needs no image to be used; the editor leads with name, description of what differs and change point; image optional (generated from identity image + description, or uploaded). Sources: Record 4 W59.4; WORLD-DEFINITION §2.

**RD-42 · Needs · "New view needed" lifecycle.** → **Requires:** a needed view stays marked until a View exists or the creator chooses a fallback or Skip; the marker reappears when the plan reveals a new need; derived from Slots vs Views, never stored. Sources: Record 4 W59.3; ENTITIES-AND-LOOKS §7.

**RD-43 · Contact sheet · Missing "promote an approved Frame".** → **Requires:** Redo, Upload, Skip or promote an approved Frame. Sources: WORLD-DEFINITION §4.1(5); ENTITIES-AND-LOOKS §5.1.

**RD-44 · Outline · Extra rows.** *Shows:* "Coverage wall" and "Visual Style" as Outline rows and per-shot rows ("Sc 1 Sh 3: new view needed"). → **Requires:** the single entry **World Definition**; the wall is a second view inside it; Visual Style is one area of the same surface; a missing view shows quietly in the scene workspace and links here. Sources: WORLD-DEFINITION §1, §3(5), §5; NAVIGATION §2.

**RD-45 · Entity state · "Lightweight · text only".** → **Requires:** an intentional **"Lightweight"** state, neither ✓ nor missing. Sources: Record 4 W59.3; WORLD-DEFINITION §2.

### 4.6 #7 and #8 (hub material)

**RD-46 · v2-60-scene-hub · "No plan yet", "Plan emptied".** → **Requires:** the screen reads **"No shots yet"**; behaviour is correct (emptied is an existing plan and never auto-drafts); the hub hint "no plan · drafts when opened" is not ratified copy, since the label is "Draft plan · $x" or a silent auto-draft. Sources: Record 4 W60 §5.2.4; SHOT-MODEL §3.1; NAVIGATION Board.

**RD-47 · v2-60-scene-hub · Scene image is "the last selected shot's end frame".** → **Requires:** ending image = last active shot's approved ending Frame, else a still from its selected Take, else the main location identity image (tagged as world image), else none; derived in code, never stored. Sources: Record 4 W60 §5.2.3; NAVIGATION Board. v3's `endingImage` is the closer illustration.

### 4.7 #4 `v2-62-review`, variant A

**RD-48 · Persistent right-hand "What's unsettled" column.** → **Requires:** no persistent right column; "What's unsettled" is a count in the scene header that opens its list on demand; recorded-decision lists are on demand; gap actions stay on the gap cell. Sources: Record 4 W62.4–W62.5; CANDIDATE-REVIEW §2.

**RD-49 · Frames reviewed on this screen.** → **Requires:** frames leave Review; they are made and approved in Generate → Frames. Sources: Record 4 W62.2; CANDIDATE-REVIEW §3.2; Record 5 GN2–GN3.

**RD-50 · "Make another take" is a one-row control with the prompt collapsed.** → **Requires:** a wide Take composer, the same component as Generate's Takes drawer, with model and price, guidance, the video prompt **open by default**, ingredients (assets and Looks, references, continuity source, camera, frame role, ordered Directions), references, and the Dialogue section. Sources: Record 4 W62.3; Record 5 GN5, GN8; CANDIDATE-REVIEW §2, §3.1.

**RD-51 · "Fix this shot" is one button to a stub.** → **Requires:** **Fix this shot ▾** offers Open in Generate and Open in Scene Prep; Back to Review returns to the same scene, shot, playhead and Scene / Whole film state. Sources: CANDIDATE-REVIEW §2; Record 5 RB3–RB4; NAVIGATION §4, §8.

**RD-52 · Scene header and shell.** *Shows:* no Scene Prep → Generate → Review pipeline with counts; scene review as a plain Outline row. → **Requires:** the scene header shows the three steps as a pipeline with counts (e.g. "Review · 3/10 picked"); Review & Export is the scene-or-film view with the export package beside it; both entry points exist. Sources: Record 5 A5; CANDIDATE-REVIEW §2; NAVIGATION §8.

**RD-53 · "Planned runtime" width toggle as a planning host (X6).** → **Requires:** X6 is closed by Record 5 SP7: Scene Prep has no runtime-proportional view; planned runtime is a header figure and Review shows planned beside as made. Sources: Record 5 SP7; CANDIDATE-REVIEW §1.1, §4.

**RD-54 · Whole film · "Next unsettled" only with a filter.** → **Requires:** next and previous unsettled stepping is unconditional in whole-film mode; a filter dims non-matching scenes and "next match" steps through the rest. Sources: Record 4 W62.1; CANDIDATE-REVIEW §2.

**RD-55 · Late Take · No drift flag at attach.** → **Requires:** late results arrive already flagged if captured inputs changed since dispatch, shown where the result is presented. Sources: LAS §2.3, §3.4; CANDIDATE-REVIEW §7.

**RD-56 · Batch scope is fixed buttons only.** → **Requires:** scope-then-invoke: tick shots or use quick scopes (gaps, needs a pick, possibly out of date, all in scene) with a control "Generate N · $total"; shots that merely need a pick are selected, not generated. Sources: CANDIDATE-REVIEW §5.4. (Archived v1 variant C illustrates the idea.)

**RD-57 · No duplicate-generation guard.** → **Requires:** an input-fingerprint check refuses an accidental duplicate with "this is already generating" and proceeds only on explicit "generate another". Sources: JOB-LIFECYCLE §4; CANDIDATE-REVIEW §5.7. Server-side.

**RD-58 · Cancel hint always shown.** → **Requires:** "may still be charged up to about $X" appears only when the provider cannot stop a started run, stated beforehand; derived from the Offering's cancel capability. Sources: CANDIDATE-REVIEW §5.8.

**RD-59 · Failure presentation lacks classes.** *Shows:* "Failed, not charged · the provider refused" with a plain Retry. → **Requires:** permanent refusal → provider's reason + **Edit and retry**, never auto-retry; transient unbilled → "Failed, not charged" with visible "Retrying"; maybe billed → "May have been charged"; platform configuration → plain studio-problem wording; partial batch → "11 of 14 ready" + "Continue the batch". Sources: CANDIDATE-REVIEW §6; JOB-LIFECYCLE §5.2.

**RD-60 · Spend in review · Cap shape and default.** *Shows:* one "today $3.40 · $25 left" cap. → **Requires:** daily, monthly and optional per-action caps, defaults parked; a hidden operator ceiling refuses in plain wording before a ticket. Sources: BUSINESS-AND-OPERATIONS §6.1–§6.2, §9; CANDIDATE-REVIEW §5.5. (See RD-01.)

### 4.8 #5 `63-trust-signals`, Whisper A

**RD-61 · Impact is computed in the browser and counts every take.** → **Requires:** impact is chosen downstream work reached through lineage, grouped by kind, plus money already spent; server-computed; the confirmation carries the impact version. Sources: ADR 0005; LAS §6.3; TRUST-SIGNALS §5, §7.

**RD-62 · Tier presentation not differentiated.** → **Requires:** tier 1 is a small inline warning with "Edit anyway"; tier 2 lists affected items and money at risk first; tier boundaries are configuration, not architecture. Sources: TRUST-SIGNALS §5.

**RD-63 · Every locked edit re-asks.** → **Requires:** one confirmation covers the editing session on that scope; the session ends on unlock, on leaving the scope, or when impact goes stale; held on the server. Sources: TRUST-SIGNALS §5; GLOSSARY Edit session.

**RD-64 · Unlock applies the edit.** → **Requires:** Unlock and edit-through are two actions; Unlock is always available and one click, appends an event only, marks and cascades nothing, and ends any edit session. Sources: TRUST-SIGNALS §6; LAS §6.

**RD-65 · Lock states start locked, with no offers.** → **Requires:** the Master Narrative acceptance sheet has a Lock checkbox checked by default; identity approval, "world is set" and the shot plan at first Frame generation *offer* a lock; "not locking is a normal state". Sources: TRUST-SIGNALS §4; Record 4 W59.

**RD-66 · Bulk "Regenerate all" is a toast; bulk Undo has nothing behind it.** → **Requires:** an inline ticket at the footer-line control with total, count and cap left; bulk keep and bulk "it all fits" are one reversible action group. Sources: BUSINESS-AND-OPERATIONS §3; TRUST-SIGNALS §2.

**RD-67 · Provenance classes.** *Shows:* two (`cr`, `ai`) with whole-line tint. → **Requires:** four classes, span-level for text; the toggle is the only way provenance is seen on accepted content. Sources: TRUST-SIGNALS §2; Record 4 Y1. See RD-08.

**RD-68 · Write-back note gaps.** → **Requires:** the "Update the Master Narrative" option previews its impact; "Decide later" leaves a `differs-from-narrative` mark and a tray row; "Keep for this shot only" sets up the `deviation-upstream-changed` re-raise; delivery notes never raise it. Sources: TRUST-SIGNALS §2; LAS §3.1; Record 2 P1.

**RD-69 · Ledger tray as a permanent column.** → **Requires:** the review-all tray opens on demand from the footer line; its grouped-by-reason content is the template. Sources: TRUST-SIGNALS §1–§2.

**Total: 69 REQUIRED DELTAS.**

## 5. LATER SEAM register

Do **not** promote any of these to V2 scope. Preserve only the seam.

| ID | Future capability | What the prototypes do or don't show | What V2 must preserve now | Sources |
|---|---|---|---|---|
| **LS-1** | **Location spatial layout** (named areas, relative relationships, orientation, optional layout references) | None shows a spatial model. Final's compass hints and v2-59's flat names are the shapes to avoid hardening. | A Direction is its own record (id, label, description, optional opposite), ordered per shot, and never treated as an unrelated image. Shots reference Direction Slots, never Attempts. Build nothing spatial. "Areas" is not fixed as the abstraction. | Record 6 L6.6; Constitution §15.3; ADR 0003; GLOSSARY Direction |
| **LS-2** | **Cross-project / personal voice library** | Not shown. | A Voice is owned by one Character inside one project, reusable across the film, with its own id. The provider handle is per project and Voice. Duplicate copies, never shares. | Record 6 V6.1; VOICE §1.1; Constitution §15.3; ADR 0025 |
| **LS-3** | **Film-wide "Generate unvoiced lines"** | Final stops at the scene. | Film-wide falls under the existing bulk-by-filter rule (always the ticket, money at risk). Not designed in V2. | VOICE §1.4, §6; Record 6 V6.4 |
| **LS-4** | **Audio mixer, offsets, stems; music and score** | Not shown. | The Dialogue track is a derived Record the creator does not edit. | Constitution §11.1, §15; VOICE §10 |
| **LS-5** | **Performance transfer** (a performer's video drives generation) | Not shown. | Reserved, not designed. It would use the same Line audio slot and gate. | VOICE §10 |
| **LS-6** | **In-app editing timeline** (trim, reorder, transitions) | v2-62's timeline is a viewing and fixing surface, not an editor. | A Take is a single clip with delivered duration; joins are straight cuts; selection pointers are the only link to export. | CANDIDATE-REVIEW §4; Constitution |
| **LS-7** | **BYOK / per-creator spend source** | Prototypes show one operator-paid cap and "about $1.20 per world, operator-paid". | Keep the payer as data on the Generation so a ticket can cite the paying source. | Record 1 M5; BUSINESS-AND-OPERATIONS §7; SHOT-PLANNING-INPUTS §1 |
| **LS-8** | **Reusable style library** | v2-59's Visual Style offers preset, plain English and reference images only. | Style referenced by Revision. A library is later. | WORLD-DEFINITION §3(5) |
| **LS-9** | **Audio-first project entry** | Not shown in #56 or #57 choosers (correctly). | Nothing to build in V2. | Constitution §4.3 |

Deferred, not seams: the "reduce spend gates" preference (Record 3 §3 "Deferred, not approved or designed": add no setting).

CineBlock is not LATER. SHOT-PLANNING-INPUTS §8 sequences it after the core loop. V2 must reserve the `composition` slice, capture metadata, package contract, import tray and reference-library origin sections so the module arrives without redesigning Shot or Frame.

## 6. INTENTIONAL PROTOTYPE OMISSIONS

Absence in a prototype means "not attempted". It never means "not in V2".

| ID | Not shown (any prototype unless stated) | Current authority |
|---|---|---|
| **IO-1** | **Fit and reference subset selection**, the Fit report and the Package / Rendered-request inspector. The composer says "N attached" as if every reference is sent. Final's seed `r1` is a Character identity image listed as a reference. | Fit may demote or omit and reports each choice; for locations it chooses the subset that best covers the revealed camera path (L6.4); a reference contributes composition only, never identity. GENERATION-PACKAGE §7; ADR 0014; SHOT-MODEL §8.2 |
| **IO-2** | **Per-Direction fallback ladder** and quiet reference-quality reporting (only Skip is shown). | ADR 0003; ENTITIES-AND-LOOKS §5; Record 6 L6.4–L6.5 |
| **IO-3** | **Job lifecycle:** generation is `setTimeout`; no Cancel semantics, `billed: maybe` accounting, late-arrival adoption, idempotency or outbox. | JOB-LIFECYCLE §4–§6, §11; ADR 0006, 0017 |
| **IO-4** | **Persistence, revisions, action groups, history gate, tenant isolation, authorisation.** State is in memory; Undo is a snapshot; no account switching (collaboration is out of scope, isolation is not). | ADR 0016, 0019–0023; Record M4 |
| **IO-5** | **Provider and Offering availability.** No state for "no eligible audio Offering" (recording and playing still work). | VOICE §4.1; PROVIDERS-AND-MODELS; ADR 0015 |
| **IO-6** | **Shell:** always-visible Outline, Cmd-K, Peek, film progress, runtime vs target, the "N possibly out of date" footer and review-all tray, Ad-hoc shots, Removed from Story, Script Hub Draft-all scope controls (v3 hub). | NAVIGATION §2–§5; TRUST-SIGNALS §2 |
| **IO-7** | **Voice machinery:** World Definition Voice area, voice design, `stock` and `described` kinds, Extra type, realization paths N / A / L / V, lip-sync control, `timing-not-preserved`, Dialogue-track slicing across Segments, consent revocation UI. | VOICE §1–§5; Record 5 SP6, VP1 |
| **IO-8** | **Real classification, extraction and AI calls** (#57 uses a regex classifier and a canned question bank; #58 uses canned AI). The AI open-question list and the code-computed "sufficiently informed" status are real. | AI-RESPONSIBILITY-MAP §4.3, §7; INTAKE |
| **IO-9** | **Matching and import machinery:** real CineBlock, 3D stage, Marble client, Two-Account harness, leftovers review list, unknown-version fail-closed, re-import Revision semantics, AI evidence quotes. | SHOT-PLANNING-INPUTS §2–§6, §9 |
| **IO-10** | **Accounts, Projects page, Settings, spend caps, Resume to last centre view,** per-creator non-creative UI state. | NAVIGATION §3–§4, §7 |
| **IO-11** | **Scale beyond the fixture:** matrix scrolling past about 12 shots, reference-library paging and search, compact asset cards, keyboard shortcuts, take-composer layout details. | Record 5 §13 (spec-level) |
| **IO-12** | **Test harness controls** in prototype bars ("Next generation fails", "Late result arrives", "Cap nearly reached", layout switchers). | Not product UI |
| **IO-13** | **Audio in Review:** Line audio, Dialogue section in the composer, revoiced Takes among a shot's Takes, `performance-changed` and `authorisation-revoked` reasons. | VOICE §4.2; ADR 0025; Record 5 RB; LAS §3.1 |

## 7. Authority notes (not prototype issues)

**No genuine contradiction between current authoritative documents was found that needs a creator ruling.** Every apparent conflict is resolved by "later record controls" or by a more specific document. Items to tidy or settle at spec time:

1. **Constitution §13.4(3)** still reads "(To be decided in design: whether selecting a shot's take is a formal commitment point.)". It is decided: choosing a Take is reversible and not a commitment point (Record 1 #63 item 4; TRUST-SIGNALS §6; LAS §6.1). The Constitution was not edited here.
2. **NAVIGATION §3** lists "optional (Visual Direction, Audio)" phase rows, but the §2 Outline has only Story / World / Scenes / Output. Read §2 as authoritative for entries.
3. **"Bypassed" (NAVIGATION §3, GLOSSARY) vs "Skipped on purpose" (INTAKE route strip, Constitution §4.3)** label the same screenplay case. Vocabulary drift; pick one label per surface (route strip, Outline row).
4. **NAVIGATION "Record 2 amendments" bullet** still mentions Master Narrative excerpts on scene cards. Record 4 §5.2.2 removed per-row excerpts. Record 4 controls.
5. **ENTITIES-AND-LOOKS §7** counts a lightweight text-only definition as ready and shows a needs line without shots. Record 4 W59.2–W59.3 control (lightweight is neither ✓ nor missing; the line names shots).
6. **Voice-path naming:** Record 6 V6.2 "Generate as Character Voice" vs VOICE §1.3 "Speak line as <character>'s voice". Same action; the spec picks one label.
7. **Record 4 §5.4.6 (prompts collapsed) vs Record 5 GN3/GN5 (video prompt open by default).** Record 5 controls (FINAL-AUDIT-79).
8. **GLOSSARY Segment** avoids "part" as a model term, while Record 5 GN4 ratifies the creator-facing "2 of 3 parts made / Retry part". Consistent if "part" stays UI-only.
9. **Spec-level gaps:** (a) whether a shot moved into a scene that has no plan blocks the stage-entry auto-draft is undecided by authority; (b) whether a hand edit alone ends AI-chose marks (Y2) or only Accept plan does is ambiguous; per-field "yours" after an override is consistent with the docs.
10. **`CREATOR-GRILL-HANDOFF-2.md`** (see §8) is stale on prototypes and on several recommendations that were rejected.

## 8. Where agents are directed to prototypes (curated)

- `AGENTS.md` carries a **Prototypes** pointer to this document.
- `prototypes/README.md` is the on-disk index: REFERENCE prototypes first, then PARTIAL REFERENCE with their use, then a single line stating the archived ones are excluded.
- `docs/product/CREATOR-GRILL-HANDOFF-2.md` has a superseded banner. Its prototype pointers and "Recommended" lines were mostly overtaken (§3.3).
- `docs/ux/NAVIGATION.md` (scene workspace line), `WRITING-EXPERIENCE.md` and `WORLD-DEFINITION.md` (line 7) carry a short pointer here.
- `prototypes/v2-ux/60-scene-production-final/README.md` carries the "do not implement literally" warning.
- Each non-main prototype branch has an additive notice commit (`PROTOTYPE-NOTICE.md` at the repository root of the branch). Branch history was not rewritten.
- Issue #49 (map notes) and the prototype-bearing comment threads of #56–#63 point here.
