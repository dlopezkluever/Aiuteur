# Prototype coverage gaps

Companion to [PROTOTYPE-RECONCILIATION.md](PROTOTYPE-RECONCILIATION.md). The canonical prototype (`prototypes/v2-ux/60-scene-production-canonical/`) is the primary reference for the Outline shell, Script Hub, Storyboard, Scene Prep, Generate (Frames and Takes) and Review. It does **not** draw everything the real product needs in those sections. This appendix lists, per workflow section, what is missing or shown wrongly, the authority for it, and where else prototype evidence exists (a branch and file) or "docs only".

**How to use it.** `/to-spec` and `/to-tickets` must specify every row here from the authority named, not from the prototype. A row marked "docs only" has no prototype at all. A row naming a branch is gap evidence only: consult that file for the single behaviour named, subject to the reconciliation document's rules and the deltas it cites. `RD-nn` ids refer to the REQUIRED DELTA register; "shown wrong" rows point to the delta. Absence from the prototype never means absence from V2. Nothing here promotes a LATER item (see reconciliation §5).

Sections G1 to G11 cover the shell through cross-cutting Scene Prep; G12 to G20 cover Generate and Review.

"Elsewhere" = other prototype evidence or "docs only". Each gap cites authority. "Shown wrong" gaps point to the delta above.

### G1. Global shell: Outline, top strip, status, resume

| gap | authority | prototype evidence elsewhere |
|---|---|---|
| Top strip lacks runtime vs target, whole-film progress bar, quiet "N possibly out of date" footer line with Review all tray entry; shows only a daily spend meter | NAVIGATION §2 diagram, §3 (Progress, Effect of editing upstream); TRUST-SIGNALS §1–§2 (bulk line) | 63-trust-signals `index.html:200` (footer line), `:105` (reasons). v2-60-scene-hub for film header |
| Outline phase status vocabulary missing (not started / in progress / done / skipped by you / bypassed / optional); Story rows are all identical stubs | NAVIGATION §3 row 1, §7 item 3 | v2-58-writing, intake-interview-57 (other slices) |
| Outline per-scene progress only a dot (done/prog/none); no needs-attention filter (failed, needs a pick, possibly out of date) | NAVIGATION §5 bullet 1; §3 progress | docs only |
| Outline "Overview" entry named "Script Hub"; Overview must be first centre view of a project with shots, then Resume | NAVIGATION §2 (Overview), §3 (Resume) | docs only |
| Resume: last centre view per creator, non-creative UI state, never versioned. Prototype has no persistence or URL state (`grep`: no `pushState`) | NAVIGATION §3 Resume; §4 | docs only |
| Cmd/Ctrl-K jump to phase, scene, shot, entity; Cmd-K arrival counts as scene entry (auto-draft eligible) | NAVIGATION §1.4, §2 "Entering"; Record 4 Y4; Record 5 SP2 | none |
| Peek: read-only preview (thumbnail, status, one-line plan, open-in-workspace); never spends; never counts as entry | NAVIGATION §1.3, §2 Peek; GLOSSARY Peek | `v2-60-scene-hub/…/parts.js:138` |
| One key or click for previous/next scene (prototype has click only; `[ ]` for shots, app.js:130–134) | NAVIGATION §2; Record 5 §2 | docs only |
| Outline collapsed state has per-scene number only; no status in collapsed mode | NAVIGATION §1.1 "always visible" | docs only |
| Settings (account and project) reachable from anywhere; spend caps and usage; Package inspector entry | NAVIGATION §4 rulings (#79) | docs only |
| Accessible names / non-colour carriers on ribbon bars, dots and strip states | TRUST-SIGNALS §1 ("colour is never the only carrier") | docs only; prototype uses `title` only |
| Failed / possibly-out-of-date / needs-a-pick counts in scene header | CANDIDATE-REVIEW §2 header; NAVIGATION §2 progress | review.js (partial) |

### G2. Script Hub

| gap | authority | elsewhere |
|---|---|---|
| Draft all: scope-then-invoke (select scenes, a filter, or whole film), count and total on the control, inline ticket, results as Options on scenes with plans, applied plans undoable as one group, "omitted shots listed, never retired" | NAVIGATION §2 Board, §5; Record 2 D60.4, D60.6; BUSINESS §3 (count rule); SHOT-MODEL §5.4; AI-map line 141 | `v2-60-scene-hub/…/parts.js:143–152`, `film.js:151–185` |
| Multi-select / scope selection of scenes and filter chips on the Hub | NAVIGATION §5 bullet 3 | `v2-60-scene-hub` (scope bar) |
| Needs-attention filter that narrows the scene list | NAVIGATION §5 bullet 1 | docs only |
| Hub status: plan accepted vs AI-drafted-untouched; unanchored / uncovered indicators; narrative choice as one quiet line | SHOT-MODEL §11 (#60 row), §3.1, §3.2 | docs only |
| Possibly-out-of-date and failed marks on ribbon and rows (whisper) | NAVIGATION §3, TRUST-SIGNALS §2; Record 4 Y3 | 63-trust-signals dot |
| Lock glyph on a locked plan with the one-gesture unlock | Record 4 Y5; TRUST-SIGNALS §3–§6 | chip exists (hub.js:30) |
| Removed from Story and Ad-hoc as Hub-reachable groups (counts, scenes with work, "Scene removed. 12 shots of work kept") | NAVIGATION §2; SCENE-IDENTITY §5.1 | `v2-60-scene-hub` `parts.js:113–135` |
| Ad-hoc shots excluded from runtime and scene counts | SHOT-MODEL Record 2 amendments; Record 2 X5 | `v2-60-scene-hub` |
| Hub at 150–250 shots and ~22 scenes: whole-project cheap derived read; virtualisation | NAVIGATION §5, §8 last row | prototype shows 162 shots, no virtualisation |
| Summary "Assets in the scene": Looks used and needed entities / views needing a decision | WORLD-DEFINITION line 85; ENTITIES §7 | docs only |
| Master Narrative portion: scrollable (done, `.mnp` max-height), provenance clean (Y1) | Record 4 §5.2.2, Y1 | done |
| Key-frame carousel and ending image of a scene with an Ad-hoc / retired last shot | Record 4 §5.2.3 | docs only |
| Scene arrival from Hub selection must not count as entering | Record 4 Y4; NAVIGATION §2 | correct in prototype (S.sel only) |
| Whole-film runtime vs project intended runtime | SHOT-MODEL §7.5 | docs only |

### G3. Scene entry and stage-entry auto-draft

| gap | authority | elsewhere |
|---|---|---|
| Entry arrivals: Outline, prev/next, Cmd-K, Fix this shot, link from World all enter; Peek, hub select, hover, whole-film playback do not | NAVIGATION §2; Record 4 Y4 | prototype correct for the arrivals it has |
| Auto-draft only below $0.05 and no exceptional condition (unknown price, $2.00, 10 count, cap); else Draft plan · $x; cap breach no Start | Record 3 §2–§3; Record 6 E6.1–E6.3; SHOT-MODEL §3.1, §12 inv. 13 | `v2-60-scene-hub/…/film.js:123–131` (`enterKind` uses `spendKind`) |
| Cap-breach auto-draft skipped, ticket without Start, Raise the cap for this action | BUSINESS §3, §6 | prototype shows (ui.js ticket) |
| Concurrent-tab duplicate guard; initiation recorded | MODULE-ARCHITECTURE line 260; JOB-LIFECYCLE §4 | docs only |
| Auto-draft never triggers frames, images, worlds, Takes, audio | Record 2 X8; Record 3 §3 | correct |
| Emptied plan reads "No shots yet", drafts nothing, offers redraft as Options | Record 3 §3; SHOT-MODEL §3.1 | RD-71, RD-21 |
| Locked empty scene: draft held as an Option | TRUST-SIGNALS §4 | `v2-60-scene-hub` `F.lock` (film.js:148), `UI.options` |
| Failure state: draft fails → quiet "Retry · $x", no partial plan | Record 2 X7; JOB-LIFECYCLE §5 | docs only |
| Hub/Outline status while a draft is generating | JOB-LIFECYCLE §1 | docs only |
| Detailed drafts: full action prose, roster, camera, frame strategy; "terse drafts are a defect" | Record 4 §5.4; SHOT-MODEL Record 4 amendments | data fixture; no real draft |
| Ad-hoc / unanchored shot gets no auto-draft | Record 2 X5 | docs only |

### G4. Storyboard and Accept plan

| gap | authority | elsewhere |
|---|---|---|
| Card shows opening Frame only if approved, else blank | Record 5 SP1 | RD-70 |
| Accept plan reads "Plan accepted"; gates nothing; recorded only on Accept plan; a field edit makes only that field "yours" (settled, issue #80) | Record 5 SP8; SHOT-MODEL §3.1; Record 4 Y2 | prototype: button only |
| "Accept plan" absent in Shot editor, so a creator who edits then cannot accept without returning | Record 5 SP1/SP8 (lives on Storyboard) | prototype matches; spec question |
| AI-made marks remain visible per item until acceptance; on-demand project-wide list | TRUST-SIGNALS §2; Record 1 R7; Record 4 Y2 | no list |
| Shot-plan lock offer when first Frame generation for the scene begins, independent of Accept plan | TRUST-SIGNALS §4 point 4; Record 5 SP8 | `v2-60-scene-hub` lock only (film.js:148); no offer drawn anywhere |
| Redraft returns Options; per-slice apply; omitted shots listed | SHOT-MODEL §5.4 | `v2-60-scene-hub` `UI.options` (parts.js:67–110) |
| Per-card state vocabulary from SHOT-MODEL §6.2 (Planned / Framing / Frames skipped / Ready / Generating / Has takes / Needs a pick / Selected / Final) and attention overlays (failed, possibly out of date, unresolved write-back) | SHOT-MODEL §6.2 table | `U.shotState` (ui.js:51) covers most; no failed/stale/write-back overlay on Storyboard |
| Storyboard imported panels vs the plan's opening Frames: not the same thing | SHOT-MODEL Record 5 amendments bullet 1 | correct |
| Retired shots excluded from Storyboard, shown in a recoverable group | SHOT-MODEL §3.1, §5.1 | none |
| Empty states and error states (draft failed, no shots) | NAVIGATION §7 item 6 | partial |
| Uncovered Master Narrative blocks listed; unanchored shots flagged | SHOT-MODEL §3.2, §11, inv. 6 | script drawer highlights anchored blocks only (ui.js:111) |

### G5. Shot editor

| gap | authority | elsewhere |
|---|---|---|
| Retire (not delete), un-retire, last shot retirable; retired group per plan | SHOT-MODEL §3.1, §5.1 | none |
| Duplicate shot (new id, `duplicated_from`, planning slices copied) | SHOT-MODEL §5.1 | none |
| Move to another scene (re-homing Decision); Ad-hoc "Move to scene…" | SHOT-MODEL §5.1; Record 2 X5 | `v2-60-scene-hub` `F.moveAdhoc` (film.js:188) |
| Split: creator-picked boundary or AI-proposed; ids; duration partition marked estimate; offer "reuse ending frame" | SHOT-MODEL §5.2, §6.3 | RD-13 |
| Merge: survivor's camera; retired camera as quoted note (done, prep.js:134); shows "from the merged shot" Takes | SHOT-MODEL §5.3 | partly |
| Split / merge whisper "2 shots now; 1 follows its text" and undo as one action group | SHOT-MODEL §11 (#60 row), §5.1 | toast only |
| Write-back/deviation note under any narrative-bearing field; delivery shot-owned with Copy to narrative; Directions shot-owned; ad-hoc never raises | TRUST-SIGNALS §2; SHOT-MODEL §2.1; Record 2 P1, P2, X5 | RD-19 |
| Narrative-bearing edit marks (e.g. changing action drifts frames); "possibly out of date" on own Frames/Takes | LINEAGE §2–§3; SHOT-MODEL §9 | RD-04 |
| Duration provenance (AI estimate vs creator) and Take delivered duration replacing target | SHOT-MODEL §2.1, §7.5 | partial (`ai.dur`) |
| Per-role Frame plan: skip one role, keyframe label and position; "this model can't pin a middle frame" quiet note | SHOT-MODEL §6.1 | `fp` has four presets only |
| Camera facets from a closed list plus free notes, never parsed | SHOT-MODEL §2.1 | done |
| Match kinds: list is spec-level; free-text cut note | Record 4 §5.7.5; Record 5 §13 | done |
| Continuity: derived source ladder; first shot cross-scene | RD-72 | none |
| Anchor editing: change which passage a shot covers; shot with no anchor | SHOT-MODEL §3.2 | none |
| Script drawer: highlights anchor; collapsible, resizable, default closed | Record 4 §5.3; Record 5 SP | done |
| Locked plan: hand edit goes through edit-through (tier 0/1/2 inline) | Record 4 Y5; TRUST-SIGNALS §5 | `63-trust-signals/index.html:133, 182` (Edit anyway strip) |
| Frame asset sets derive from the roster; Frame role may override | Record 4 §5.5; SHOT-MODEL §4a | done (`frameAssets`) |
| Prompt override badge "prompt overridden" in Prep | Record 1 R3 | in Generate only |
| 🎙 quiet mark when Line audio is attached; no recording controls in Prep | Record 5 VP4 | done (prep.js:38) |
| Error states for a shot with no roster / no action / no location | NAVIGATION §3 (readiness explains) | none |
| Keyboard: prev/next shot done (`[`/`]`) | NAVIGATION §2 | done |

### G6. Cast & Looks matrix

| gap | authority | elsewhere |
|---|---|---|
| Rows: Extra types with quantity/density | ENTITIES §3; SHOT-MODEL §4 item 3 | `v2-59-world/…/world.js:9, 20` (Extra entity type in World) |
| Shot-only state and "from here on" markers | RD-75 | none |
| AI-made presence marks until accepted | Record 4 Y2 | none in matrix |
| Deferred / lightweight / needs-a-decision entity state in rows | ENTITIES §7 readiness table; Record 4 W59.3 | `v2-59-world` |
| Collapsed by default; opened at will (done); resets on scene entry (done) | Record 5 SP5 | done |
| Scroll alignment | RD-75 | defect |
| Scale >12 shots, compact cards | Record 5 §13 | none |

### G7. Asset drawer, entities, Looks, World Definition links

| gap | authority | elsewhere |
|---|---|---|
| Add asset: Extra types in the library tabs | Record 5 SP6; ENTITIES §3; GLOSSARY Extra type | `v2-59-world` |
| Extra type in a roster: no Looks section; quantity or density as shot context | ENTITIES line 46; Record 2 §4 item 3 | none |
| Deferred / `proposed` entity in drawer reads "needs a decision": define, make lightweight, or generate from the AI description (one action, bulk) | ENTITIES §7 | `v2-59-world` |
| Character View gallery must go (Locations only) | RD-15; Record 5 SP6 | n/a |
| Create Look: priced and gated; writes to World Definition; usable everywhere; edit later in World Definition; undo | Record 5 SP6; BUSINESS §3; Record 4 W59.4 | RD-01 |
| Look created in a persistent-change path raises write-back choice once ("write-back natural answer") | SHOT-MODEL §4a (persistent change) | selector exists but only after the change (assets.js:154) |
| Look change point semantics: "Ends as" different Look carries forward; later shots show "story look here" | SHOT-MODEL §4a; Record 4 §5.6 | done (`carried`) |
| Add Look from roster when target Look does not exist; description-only allowed | SHOT-MODEL §4a; ENTITIES §3 | done |
| Look-needing-no-image: `description only` state | Record 4 W59.4 | done |
| Link to World Definition (entity, Looks, Coverage) from any missing View or Look | WORLD-DEFINITION line 85; NAVIGATION §8 | RD-76 |
| Identity edit in shot (e.g. "scar here") raises create-or-edit-Look (write-back) or local deviation | ENTITIES §6; SHOT-MODEL §4 item 6 | none |
| Entity approval / identity lock offers | TRUST-SIGNALS §4 points 2–3 | none |
| Presence override provenance and prominence (featured, supporting, background) | Record 2 §4 item 4 | none |
| Look change marking downstream (`look-changed`) and effect strip "these will be marked possibly out of date" | NAVIGATION §3; LINEAGE §3 | `markDownstream` flags only; no inline note |
| Shot-only state note default for an ending state | Record 4 §5.6.2 | done (`trans`) |
| Per-asset references in the drawer carry subject mapping | RL3; SHOT-MODEL §8.1 | N/A (upload / previous-ending only) |

### G8. Location Directions and coverage

| gap | authority | elsewhere |
|---|---|---|
| Direction record: label, description, optional opposite; propose a new named Direction at shot planning | ENTITIES §5.1; Record 6 L6.3, L6.6 | `v2-59-world` (flat views only, archived concept) |
| Coverage need per (Direction × resolved Look); sparse matrix | ENTITIES §5.1, §7; ADR 0003 | `v2-59-world/world.js:179` ("views needed") |
| Needs line names shots ("3 views needed for 7C, 7E, 9A") with per-shot checklist | Record 6 L6.3; Record 4 W59.2; WORLD-DEFINITION §4.1 | `v2-59-world` (origin per need only) |
| Contact sheet, Accept all N as one reversible action; every View a draft Attempt | ENTITIES §5.1 Bulk acceptance | none |
| View ladder with the rung reported quietly (Direction × Look → base+delta → establishing → identity → text only) | ENTITIES §5.3 step 2; ADR 0003 | partial (identity only) |
| Fit picks the subset covering the revealed camera path; reference-quality warning | Record 6 L6.4; GENERATION-PACKAGE §7 | none |
| Single-image mode per Location and quiet note | Record 6 L6.5 | none |
| Directions order is shot-owned; reorder raises no write-back | Record 2 P2; SHOT-MODEL §2.1 | done |
| Shot's Direction Slots, never View Attempts; Directions in prompt and package | SHOT-MODEL §4a last paragraph; Record 6 L6.3 | RD-02 |
| Promote an approved Frame to a View | ENTITIES §5.1; WORLD-DEFINITION §4.1(5) | none |
| Sub-location parent link; shot never borrows parent's Views | ENTITIES §5.1 Sub-location | none |
| Needs marker reappears when the plan reveals a new need; "Skip" / fallback choices | Record 4 W59.3; RD-42 | none |
| Missing Views priced action: Look-aware count and cap states | BUSINESS §3 | gate present (assets.js:38), Look-blind |

### G9. Composition references and CineBlock

| gap | authority | elsewhere |
|---|---|---|
| Reference object: kind (layout / footage), uses (framing, staging, motion, lighting), subject mapping, notes | SHOT-MODEL §8.1; RL3; SHOT-PLANNING-INPUTS §3 | none (only recompose text on shot refs, prep.js:91) |
| Reference never contributes identity; `r1` seed identity image listed as a reference | SHOT-MODEL §8.2; IO-1 | data.js:70 |
| Unmapped subjects default to generic extra as AI-made choice | ENTITIES line 245; SHOT-MODEL §8.1 | none |
| Retire (detach) a reference rather than delete | SHOT-MODEL §8.3 | prep.js:95 deletes |
| Adding/removing/replacing a reference marks Frames and Takes `shot-changed` (composition) | SHOT-MODEL §8.3 | none |
| Reference from any Frame in the project including other scenes; "this scene first" with scope and search | RL2; Record 4 §5.7.4 | `refLibrary` (gen.js:159) shows this scene; `shotIn` supports `srcScene` |
| Storyboard panels matched to this scene first, then import tray; unmatched stay visible | RL2; SHOT-PLANNING-INPUTS §6; Record 5 §6 | mock panels only |
| CineBlock entry explicit and visible: Block scene (all shots) and Block this shot (focused) | Record 4 §5.8; NAVIGATION §2 | done in Frames References tab only (gen.js:129, 258) |
| CineBlock opens in its own Aiuteur tab, same session; Send back returns | D61.1; ADR 0024; NAVIGATION §8 | in-page overlay (mock) |
| Captures as layout reference to a role; Frame plan gains the role as a suggestion if absent | SHOT-PLANNING-INPUTS §3 row 1 | `put` drops captures for a role the shot does not plan (gen.js:273) |
| Placeholders → subject mapping suggested "AI chose" | SHOT-PLANNING-INPUTS §3 row 2 | none |
| Camera facets fill only empty facets, shown `imported`; never overwrites | SHOT-PLANNING-INPUTS §3 row 3 | none |
| Capture needs full description and right assets: no confirmation gate | Record 4 §5.8 | RD-22 |
| Capture never carried by a video request; frames skipped → Fit report offers to make the frame | SHOT-PLANNING-INPUTS §3 cross-cutting | none |
| Unknown package version fails closed; leftovers review list; re-open with saved scene state | SHOT-PLANNING-INPUTS §4–§5 | none |
| CineBlock spend: world generation billed (~$1.20, range) as a Job through the Catalogue; operator-held key | SHOT-PLANNING-INPUTS §4 | none |

### G10. Ad-hoc shots and Removed from Story

| gap | authority | elsewhere |
|---|---|---|
| Ad-hoc section: create, strip lists section shots, Looks explicit (default base), no write-back or deviation, Scene Prep + Generate only, Takes picked in Generate, no Review step | Record 2 X5; Record 5 §2; SHOT-MODEL Record 2 amendments | `v2-60-scene-hub/…/parts.js:113–125`; v3 none |
| Excluded from runtime, sequence playback, scene counts; exported in a separate "Ad-hoc" folder | X5 | hub round shows chips |
| Move to scene…: becomes unanchored shot; creator's Look picks kept as visible local overrides | SHOT-MODEL Record 2 amendments | `F.moveAdhoc` film.js:188 |
| Continuity link has no derived source for an ad-hoc shot; pin allowed | SHOT-MODEL Record 2 amendments | none |
| Removed from Story: collapsed, low-contrast group; Bring back (same id, creator picks position); Adopt work (re-home shots, anchors kept, `input-retired`) | NAVIGATION §2; SCENE-IDENTITY §5.1 | `parts.js:127–135` |
| Retired scenes excluded from batch scopes, coverage needs and Outline numbering | SCENE-IDENTITY "Navigation and Board"; ENTITIES §7 | none |

### G11. Cross-cutting

| gap | authority | elsewhere |
|---|---|---|
| Possibly out of date derived from lineage; reasons vocabulary; Regenerate / It still fits / Keep as is; footer line; tray | ADR 0004; LINEAGE §3; TRUST-SIGNALS §2 | `63-trust-signals/index.html:105–134, 200` |
| Locks: edit-through with server-computed impact; tiers 0/1/2; one session confirmation; Unlock one click | TRUST-SIGNALS §3, §5, §6; Record 4 Y5 | `63-trust-signals/index.html:132–133` |
| Retire / restore adds a new Revision; Undo is a restore of prior head; action groups | SHOT-MODEL §5.1; ADR 0019, 0020 | none |
| Spend: derived class; $0.05 / $2.00 / 10 are tunable; inline ticket; unknown price; cap breach no Start; daily, monthly, per-action caps | BUSINESS §3, §6.1; Record 3 §2 | ticket drawn (ui.js:19) |
| Derived state everywhere (progress, runtime, status); Board needs a cheap summary read | NAVIGATION §3, §8 last row | docs only |
| Provider failures, job states, late arrivals in Prep (draft failure) | JOB-LIFECYCLE §5, §11 | none |
| Multi-tab / concurrency; tenant isolation | ADR 0016, 0023 | none |
| Reading writes nothing; opening a shot never writes | SHOT-MODEL §12 inv. 12 | `frame()` mutates on read (core.js:20); mock |

---




"Elsewhere" = other prototype branches under  or `git show origin/prototype/…`. "docs only" = no prototype shows it.

### G12. Generate: Frames mode

| gap | authority | prototype evidence elsewhere |
|---|---|---|
| Frame sources and provenance: generated / uploaded / reused (as-is, $0) / edited (base Frame) / extracted from a Take; "Reuse previous ending" as a one-click, no-spend action for `continues` | SHOT-MODEL §6.3, §6.4 | docs only (CP only generates) |
| Per-Frame Reject/Restore and compare up to 3 attempts with Select per pane | CRP §3.2; Record 4 Y6 | docs only for Frames (Compare of Takes: `review.js:162`) |
| Approving a different Frame marks Takes/Frames made from the old one `frame-changed` with exits | SHOT-MODEL §6.3 bullet 4; LINEAGE §3.1 | docs only (CP clears the flag, `gen.js:61-62`) |
| Shot-plan lock offered once at first Frame generation (lock / not now) | TSL §4 pt 4; Record 5 SP8 | docs only (`63-trust-signals` shows lock offers for narrative) |
| "Generate without the unapproved opening frame" recorded as a skip Decision | SHOT-MODEL §6.2, §6.5; CRP §3.2 | docs only |
| First shot continuity across the scene boundary; next scene's opening in the neighbour row | SHOT-MODEL §6.4; Constitution §9.2 | docs only (RD-72) |
| Frame `moment` text as a layer-addressed Override with "base changed" note | GENERATION-PACKAGE §8.2, §8.6 | docs only (`gen.js:98-109` whole text) |
| Frame generation price from the price entry (range upper bound, as-of date) | BUSINESS §3–4 | docs only |
| Frames skipped path: derived still input chain, readiness text for it | SHOT-MODEL §6.4 | partial: `gen.js:221`, `gen.js:357` |
| Reference quality notes (single-image Location revealing more than covered; ladder rung used) | Record 6 L6.4–L6.5; ENTITIES §5 | docs only |
| Fit report per reference (carried / demoted / omitted, reason sentence) and Package inspector from the Prompts tab | GENERATION-PACKAGE §7, §11; NAVIGATION §4 ruling | docs only (IO-1) |
| `blocked` fit with exits (another model, edit the layer, turn off an optional layer) | GENERATION-PACKAGE §7.3 | docs only |

### G13. Generate: Takes mode, player, takes row, composer

| gap | authority | elsewhere |
|---|---|---|
| Segment plan on the control: "about 18 s · 3 parts · $x", plan from the model profile | SHOT-MODEL §7.2; CRP §3.1 | partial: `gen.js:427` ("3 parts, one Take"), price is `dur×rate` |
| A Take exists only on assembly success; "2 of 3 parts made" is a Shot state, never a Take | SHOT-MODEL §7.3; ADR 0013 | docs only. `v2-62-review` also drew it wrongly (RD-06) |
| Regenerate from part k with the saving ("reuses 1–2, makes 3: $x") | SHOT-MODEL §7.3; CRP §3.1 | docs only (`review.js:147` inert) |
| "Continue the batch" re-queues dependent Segments with no new approval | JOB-LIFECYCLE §8; RD-06 | docs only |
| Upload a Take (origin `uploaded`, no Segments) | SHOT-MODEL §7.3 | docs only |
| "From the merged shot" Takes: visible, playable, labelled, not selectable | SHOT-MODEL §5.3; ADR 0012; CRP §3.1, §9.2 | `v2-62-review` `review.js:23,68` (drew them selectable: wrong) |
| Model: precedence override > project > Automatic, effective model and price stated, unavailable override resolves visibly | PROVIDERS-AND-MODELS §8; Record 5 GN5 | docs only |
| Package inspector read-only from the Takes drawer | NAVIGATION §4; GENERATION-PACKAGE §8.2 | docs only |
| Layered Override with `disable`, `ref.exclude`, `param` | GENERATION-PACKAGE §8.2 | docs only |
| Guidance: "Keep for this shot" turning guidance into an Override | GENERATION-PACKAGE §8.8 | docs only |
| Target duration longer than the shot for Line audio, price on the sent value | VOICE §3.2; RD-10 | docs only |
| Revoiced Take limits `timing-not-preserved`, `revoice-ambience-altered` as labels on the Take | VOICE §4.1, §8 | docs only |
| Take thumbnails after assembly: delivered duration, probe facts | SHOT-MODEL §7.2; BUILD-SEQUENCE T0c | docs only |

### G14. Dialogue and voice paths

| gap | authority | elsewhere |
|---|---|---|
| Authorisation: per-subject versioned statement, Performance basis for Speak-as, per-Voice check at the batch, `licensed`, revoke from the Dialogue section | VOICE §2.1–2.4; ADR 0025; Constitution §11.2 | docs only (RD-11) |
| `performance-changed` only on Takes that followed the line; `authorisation-revoked` reason | VOICE §1.3, §2.4; LINEAGE §3.1 | docs only (CP marks every Take: `gen.js:287`) |
| No eligible audio Offering: Speak-as, Speak line, Generate unvoiced lines, voice design, Revoice read "unavailable: reason"; recording and playing still work | VOICE §4.1 last row | docs only |
| Ad-lib transcript check and `differs-from-narrative`; "Copy to narrative" on delivery override | VOICE §3.3; TSL §2; Record 2 P1 | docs only |
| Lip-sync path (`audio.lipsync`) "Take $a + lip-sync $b = $c", Segment slots, `lipsync-humanoid-only` | VOICE §4, §6.5; SHOT-MODEL §7.3 | docs only |
| Voice/Voice area states in World Definition and their effect: Voice change marks Takes `identity-changed` | VOICE §6.2; LINEAGE §3.1 | `v2-59-world` has no Voice area (RD-40) |
| Spoken-line price by characters/seconds, not flat | VOICE §6.5 | docs only (`VPRICE`, `gen.js:280`) |
| Unvoiced batch "left out" count for lines with no Voice | VOICE §1.4 | partly drawn (`gen.js:326-329`) |

### G15. Spend, model, price, tickets

| gap | authority | elsewhere |
|---|---|---|
| Ticket content: count in Takes, largest item, one line per reason (including "Bulk regenerate by filter", "10 or more Takes", upper bound) | CRP §5.3; BUSINESS §3 | `v2-62-review` `review.js:75,234` (bulk reason, Trim) |
| Cap breach: Raise / **Trim the selection** / Not now; hidden operator ceiling refuses before a ticket in studio wording | CRP §5.5; BUSINESS §6.1–6.2 | `v2-62-review` Trim; ceiling docs only |
| Daily + monthly + per-action caps, defaults parked | BUSINESS §6.1, §9 | docs only |
| Committed-spend accounting: maybe-billed runs counted until reconciled; estimate replaced by actual | BUSINESS §6.3 | docs only (CP debits on click, never settles: `core.js:120`) |
| "price unavailable" model needs confirmation | CRP §3.1, §5 | drawn (`gen.js:426`, `data.js:3` `exp`) |
| Estimate as a range, upper bound tested | BUSINESS §3–4 | docs only |
| Look/View image creation on the same gate | BUSINESS §3; RD-01 | docs only |

### G16. Job lifecycle: failures, retries, partial, late, cancel, duplicate

| gap | authority | elsewhere |
|---|---|---|
| Failure classes with wording and action each | JOB-LIFECYCLE §5.2; CRP §6 | partial in `v2-62-review` (`06-A-failed-partial-retry.png`) |
| Automatic retries shown as "Retrying" with count; cap of 3; a cap-exhausted sequence ends Failed | JOB-LIFECYCLE §5.3 | docs only |
| Unread failures: quiet count in the top strip opening a list with Retry on each, and the place where late Takes are announced; Dismiss | CRP §6 | docs only |
| Running-work count in the top strip; Waiting/Generating/Finishing labels | CRP §6; JOB-LIFECYCLE §2.1 | docs only |
| Late results adopted into the same Generation, "arrived late"/"after cancel", already flagged if inputs drifted | JOB-LIFECYCLE §6; LINEAGE §3.4 | `v2-62-review` `review.js:243` (label only; `07-A-late-arrival.png`) |
| Cancel semantics by adapter capability (reliable / best effort / none) | JOB-LIFECYCLE §6 | docs only |
| Duplicate guard by input fingerprint + "generate another" | JOB-LIFECYCLE §4; CRP §5.7 | docs only (RD-82) |
| Completion notice coalesced for batches: "11 of 14 ready · 2 failed · 1 cancelled" | CRP §6; JOB-LIFECYCLE §8 | docs only |
| Maybe-billed failure: Retry with price and "you may have been charged" | JOB-LIFECYCLE §5.2; Record 1 R8 | partial (`data.js:96`, `gen.js:401`) |

### G17. Reference library

| gap | authority | elsewhere |
|---|---|---|
| Paging and search at project scale; "whole project" toggle | Record 5 RL2, §13 | partial (`gen.js:178`) |
| Upload adds Reference Media, and the Reference Media record | Record 5 RL3; DOMAIN-MODEL | mocked (`gen.js:175`) |
| Subject mapping per reference shown on the card and carried into the Package | Record 5 RL3; SHOT-MODEL §8.1 | stored (`gen.js:163`), not shown |
| A reference never supplies identity; an identity image shown as a reference is not a reference | SHOT-MODEL §8.2; GENERATION-PACKAGE §8.4 | wrong in CP (`core.js:73`, `gen.js:420`) |
| Storyboard import-tray panels assignable | SHOT-PLANNING-INPUTS §6 | mocked (`gen.js:148`) |
| CineBlock captures must have description and right assets, without a confirm gate | Record 4 §5.8; RD-22 | drawn with a gate-like checkbox |

### G18. Review

| gap | authority | elsewhere |
|---|---|---|
| Header counts: N need a pick · N missing · N possibly out of date (quiet) beside runtime | CRP §2 diagram | partial: chips (`review.js:192`) |
| Cell "Fix" action opens the shot | CRP §4 Scrubbing | docs only |
| Top-strip count of running work and unread failures | CRP §6 | docs only |
| Ad-hoc shots, Removed-from-Story and retired shots excluded from timeline, runtime, playback (with un-retire from the workspace) | CRP §2, §4; Record 2 X5, D52.4 | docs only (CP has inert Outline rows) |
| Retired shot row in plan; un-retire | SHOT-MODEL §5.3 | docs only |
| Playback walks selected Takes across scenes in story order | CRP §2 | drawn (`review.js:63-72`) but no playhead on the ribbon past the scene |
| Audio follows each Take's own audio; joins are straight cuts | CRP §4 | docs only |
| Recorded-decision lists on demand | Record 4 W62.4; CRP §2 | docs only |
| Review-all tray and footer line | TSL §1–2 | `63-trust-signals/…/index.html` (footer line "N items may be out of date · it all fits…", Ledger tray) |
| Possibly-out-of-date reason sentence and exits on a timeline cell (reason from vocabulary, "via" variant, "Kept despite") | TSL §2; LINEAGE §3.1 | `63-trust-signals` (dot + exits) |
| Edit-through strip with server impact tiers 0/1/2, one confirmation per session | TSL §5; ADR 0005 | `63-trust-signals` (presentation; its mechanics are wrong) |
| Mark final as a lock Decision, Unlock event only | TSL §6; LINEAGE §6.1 | docs only |
| Reject/Restore with "Rejected (n)" group: drawn, but lock-unsafe (RD-80) | CRP §3.1 | drawn |
| Selecting a Take from another shot is impossible, merged Takes labelled | SHOT-MODEL §5.3 | `v2-62-review` (wrong) |
| Scope-then-invoke ticking, quick scopes: gaps / needs a pick / possibly out of date / all in scene | CRP §5.4 | archived `62-candidate-review` variant C (`ACT.tog`, `ACT.quick`) |
| Whole-film actions with ticket at the ribbon | CRP §5.4 | `v2-62-review` `04b-A-film-generate-missing-ticket.png` |
| Make another take: guidance, model price, wide layout, Dialogue | Record 4 W62.3; GN8 | drawn |
| Generating while keeping timeline context (progress in the cell) | Record 4 §4 | docs only (RD-82) |
| Next/prev shot and scene by key; scene-level arrows | CRP §2 | drawn |
| Key/ARIA names: every dot has an accessible name and reason text | TSL §1 | partial (`title`s only) |

### G19. Review & Export hand-off (what Review must give export)

| gap | authority | elsewhere |
|---|---|---|
| Selected Take pointer is the only link to delivery; Segment structure invisible | SHOT-MODEL §10 "Export and review"; ADR 0013 | docs only |
| Export package manifest: ordered Takes, frames, prompts, document Revisions; deterministic; identical manifest → identical contents | DOMAIN-MODEL; GLOSSARY Export package / Manifest | docs only |
| Unselected, missing, failed, possibly-out-of-date shots listed quietly, never blocking | CRP §4, §8; TSL §6 | one sentence (`review.js:159`) |
| Ad-hoc shots in a separate "Ad-hoc" folder; retired and Removed-from-Story excluded | Record 2 X5, D52.4; SHOT-MODEL §3.1 | docs only |
| `synthetic` provenance per Take in the manifest; provider marks never stripped; no Aiuteur marking | Record 6 S6.1; OPERATIONAL-BASELINE §15 | docs only |
| Quiet count of Takes carrying `authorisation-revoked` at the export control | VOICE §2.4 | docs only |
| Frozen probe facts (fps, CFR, frame count, audio layout), delivered duration, unique clip names, timeline fps 24 | BUILD-SEQUENCE §2.6, VS9; PERSISTENCE-AND-MEDIA | docs only |
| Export build as a local-work Job (30 min deadline, no billing); export folder or portable zip | JOB-LIFECYCLE §2.2; BUILD-SEQUENCE §2.6 | docs only |
| Written documents (Master Narrative, screenplay export) included | Constitution Phase 12 | docs only |
| Original Performance export; prompts exportable (Q2) | VOICE §1.2; VERIFICATION §3 tier B | docs only |
| Test-provider Takes' `TEST-` filename prefix | VERIFICATION-AND-OBSERVABILITY §2 row 6 | docs only |
| NLE import check per release | VERIFICATION §5.3 step 7 | docs only |

### G20. Cross-cutting

| gap | authority | elsewhere |
|---|---|---|
| Server-held edit session and impact version on every lock-gated pick change | LINEAGE §6.3; ADR 0005; TSL §5 | docs only |
| One selection pointer for Generate and Review, one write gate, from every surface | Record 5 RB2; LINEAGE §6.3 | CP has one function but two silent behaviours (RD-81) |
| Movement is free: browsing/playing writes nothing | CRP §9.1; SHOT-MODEL §12.12 | respected in CP |
| Staleness never spends | CRP §5; Record 2 X8 | respected (no auto-generation in CP) |
| Cmd-K, Peek (never spends) | NAVIGATION §1–2 | docs only |
| Autosave/Resume: last centre view restored | NAVIGATION §3 | docs only |

---
