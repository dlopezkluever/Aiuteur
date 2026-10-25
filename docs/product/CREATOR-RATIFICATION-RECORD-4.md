# Aiuteur Wayfinder V2: Creator Ratification Record 4

Date: 2026-10-24. Source: the creator prototype grill with Daniel Lopez-Kluever, creator and owner, after the fresh strong-model prototype round for #58, #59, #60 and #62 (branches `prototype/v2-58-writing`, `prototype/v2-59-world`, `prototype/v2-60-scene-hub`, `prototype/v2-62-review`, shared kit and handoff on `prototype/ux-v2-shared-kit`). The creator reviewed every prototype personally and supplied V1 WizardDirector screenshots of Script Hub, Shot List, Scene Assets, Prompt Prep and Frame Generation as capability evidence. [Session thread](https://ampcode.com/threads/T-01a16bdb-e896-72bd-9677-5051a87233a3).

Status: **authoritative creator-decision source.** This record controls where it changes [Record 1](CREATOR-RATIFICATION-RECORD.md), [Record 2](CREATOR-RATIFICATION-RECORD-2.md), [Record 3](CREATOR-RATIFICATION-RECORD-3.md), an ADR, a domain/UX doc, the prototype handoff or a prototype. Where it is silent, earlier decisions stand. The Product Constitution remains above all records. **No Constitution amendment is made or required** (§9).

Identifiers: surface decisions are **W58, W59, W60, W62, W61**; cross-surface rules are **Y1–Y8**.

## 1. Standing rule on prototypes

Prototypes remain structural decision support. The creator's direction for this round: use the prototypes to discover the right product, not to ratify a prototype because it exists. Visual polish in all four is still not approved (Record 2 §3.1). V1 is a **capability** reference, not a layout to copy. "Consolidating V1 stages must not drop functionality."

## 2. W58 Writing: direction ratified

`prototype/v2-58-writing` is **kept as the starting point and implementation guidance** (minor polish later).

1. Treatment options are shown **one at a time in a pager** ("Option N of M") with the **brief summary and attribute tags at the top** of the document. Side-by-side compare is on request (X1).
2. **One regeneration box** below the document; **one quiet sync bar** with per-beat actions behind the whisper mark; the acceptance sheet with **Lock checked** (D58.9).
3. **New alternative after a choice** lands as a new unchosen option opened in the pager. The chosen Treatment is untouched until the creator presses Choose; the earlier Treatment stays in history.
4. After **Update first** in the acceptance sheet, the creator returns to the sheet.
5. **A skipped Treatment** shows **Draft treatment options · $x** beside **Write it myself**, before Master Narrative acceptance. It is an explicit priced action under the normal spend rules; Record 3's stage-entry authorization does not extend to un-skipping. After acceptance the existing **Regenerate from the Master Narrative** applies.
6. **No persistent "AI added" or "AI generated" tags in prose** (Y1).

## 3. W59 World Definition: direction ratified

`prototype/v2-59-world` is **kept as the starting point** (some visual decisions will change).

1. Home **tiles grouped by entity type**; per-entity **Identity / Looks / Coverage** tabs; the project-wide coverage wall as an optional second view; **Complete coverage** one disclosure away (D59.5).
2. One **needs line per entity naming the shots** that need it ("Identity ✓ · 3 views needed for 7C, 7E, 9A"), with the per-shot checklist on expand.
3. A **lightweight** entity reads as an intentional "Lightweight" state, neither ✓ nor missing. A "new view needed" mark is derived and persists until a View exists or the creator chooses a fallback or Skip.
4. **Looks may be description-only.** A Look needs no image to be used: generation composes the base identity image with the Look's description of what differs, and the creator can edit that description at any time. An alternate Look's image, when wanted, is generated from the identity image plus the Look description, or uploaded.
5. **"The world is set"** stays as the ratified lock-offer point (Record 1 #63 item 3). It gates nothing.
6. Provenance follows Y1 and Y2.

## 4. W62 Candidate review and playback: direction A ratified

`prototype/v2-62-review` **variant A** is the base: runtime-proportional scene timeline, main viewer, the selected shot's Takes beneath, **Scene / Whole film toggle**, swap = select, **Mark final**, **Fix this shot** with return to the same playhead, and generating Takes while keeping timeline context.

1. **Whole-film mode is A's scene ribbon**: one block per scene, width = runtime, with a quiet picked / needs-a-pick / missing bar. Add **next / previous unsettled shot** stepping. C's per-shot minimap is **not** adopted (D60.1). Filtering dims scenes with no match and "next match" steps through the rest.
2. **Frames leave the review screen.** Frame generation and approval happen in the #60 frame work (W60); review is for Takes. CANDIDATE-REVIEW §3.2 moves accordingly.
3. **Make another take** opens a **wide take composer** (model, guidance, prompt and its ingredients, references, price) with near-full workspace width, not a cramped row.
4. **No persistent right-hand sidebar.** "What's unsettled" becomes a count in the scene header that opens the list on demand; recorded-decision lists are on demand too.
5. **Gap actions on the gap cell**: Pick, Generate · $x, Retry · $x sit on the cell (B), and the on-demand unsettled list offers the same.
6. Compare (up to 3) replaces the viewer with panes, each with Select.
7. Changing the pick on a **Mark final** shot uses the lock's edit-through confirmation (Record 1 #63 item 2); no forced "unlock first".
8. A "ready, not selected" notice opens the Take; it never selects it. Dismissing a failure lowers the unread count. Skip gaps stays off by default; Play in context stays.

## 5. W60 Scene Hub and scene workspace

### 5.1 Status

> **Superseded in part by [Record 5](CREATOR-RATIFICATION-RECORD-5.md) (2026-10-25).** The interaction model and layout below were pending at the time of this record; Record 5 ratifies them (Script Hub → Scene Prep → Generate → Review). §§5.2–5.8 stand unchanged.

**Capability and behaviour requirements are ratified (§5.2–§5.8). The scene workspace's interaction model and layout are NOT ratified.** They are pending a targeted prototype comparison of two variants (§5.9). None of the `prototype/v2-60-scene-hub` directions A, B or C is ratified as the workspace. Creator findings: C gives the script so much room that shot preparation is cramped; B is the strongest base for the hub; A's card-per-scene excerpts are overwhelming and uninformative; all three lack the planning, asset, frame and CineBlock capabilities below.

### 5.2 Script Hub (whole-film overview)

1. **Base: prototype B's hub.** A compact scene list with the **scene ribbon** above it (per scene, never per shot, D60.1; the same ribbon as W62.1). B's per-shot ticks are dropped.
2. **One click selects a scene** and fills a **large summary panel** at the top: the scene's **Master Narrative portion** (scrollable), its assets, planned vs as-made runtime, progress, a **carousel of the scene's key frames** (V1's carousel), and **Open scene**. Rows carry no per-row excerpts. A card view is an optional toggle.
3. **Scene image** (replaces "last approved end frame", which assumed frames): the scene's **ending image**, derived as the last active shot's approved ending Frame, else a still from its selected Take, else the main location's identity image (quietly marked as a world image), else none.
4. **On-screen wording:** a scene with no shots reads **"No shots yet"**. "Shot plan" stays a domain term; "plan emptied" is not shown.

### 5.3 Ergonomic rule

The workspace must feel spacious. Shared shot context and navigation persist across the scene's work, but **each job gets essentially the full workspace when active**: collapsible and resizable script context (never dominant by default), expandable inspector sections, drawers where appropriate, persistent shot navigation, sticky contextual controls, a **full-width frame workspace**, and near-full-width Take creation and review. Consolidation never means compressing all jobs into one physical layout.

### 5.4 Shot content (the planning requirement)

Shot drafts carry **full detail** drawn from the Master Narrative and world model, never three-to-five-word descriptions. Every shot shows and lets the creator edit:

1. **Action** (full prose from the anchored passage) and **dialogue lines with delivery**.
2. The **asset roster** (§5.5).
3. **Location and Direction**; **camera** facets and notes; **visual and sound notes**; **duration**.
4. **Frame strategy**: opening, ending, keyframes, or skip.
5. **References**, for the whole shot or one frame role, with subject mapping (§5.7).
6. **Frame and video prompts**: generated, collapsed and inspectable; editing one is an explicit override marked "prompt overridden". Beside each prompt, its **ingredients**: assets and their Looks or states, references, continuity source, camera and technical direction, frame role. Ingredients let the creator diagnose a bad generation without rewriting a whole prompt.

### 5.5 Asset roster and state plan

Every shot has an **editable asset roster**, initialised by the AI from the Master Narrative and World Definition and fully inspectable. For each relevant asset the creator can set:

- **when it is on screen**: present throughout, enters during the shot, leaves during the shot, opening frame only, ending frame only;
- its **Look or state at opening** and **at ending**;
- an **action or blocking note** involving it;
- a **transformation** during the shot (§5.6);
- **manual add** of an asset the AI missed, and **remove** of a wrongly inferred one.

The opening, ending and keyframe asset sets **derive from the roster**. The frame work can still override composition-specific details per frame.

### 5.6 Persistent and transient changes

1. **Persistent (Look) change.** An asset that goes from Look A to Look B during a shot: the opening frame uses A, the ending frame uses B, the video prompt describes the change, and **B carries forward to later shots until changed again**. It is a story-state change (a Look change point at that shot), so it follows the normal write-back or deviation choice.
2. **Transient (shot-only) state.** A change that affects only this shot (glass shatters, smoke clears, a soaking that is gone by the next scene) is a shot-only state note. It shapes this shot's frames and prompts and **does not carry forward**. It is the default for an ending state unless the creator picks a Look.
3. The creator can **switch an asset to a different Look for a later shot**, including a change that happens off screen, from the roster ("from here on: Look Y") and from World Definition.
4. A Look need not have an image (W59.4); its description can be edited to account for new changes.

### 5.7 Frame work, continuity and match cuts

1. Frame work is a **serious creative workspace**, not a subpanel (W62.2).
2. **Neighbour comparison**: previous shot's ending │ this opening │ this ending │ next shot's opening, as a row or carousel, so ends can be matched against the next start.
3. **All of the scene's frames** can be seen together (scene frame gallery), so a frame can be matched against one several shots away (shot / reverse-shot, cutaways).
4. **Reference shot.** Any Frame from any shot can be attached as a reference for another frame, with a description of how to recompose it (shot 1 is Bob over the shoulder; shot 4 uses it as a reference for a clean medium shot of Bob).
5. **Match and other compositional cut methods.** The continuity intent gains **match** (kinds such as graphic, action, eyeline; final list at spec), feeding the previous ending as a framing reference rather than a base image. Free-text cut notes are allowed.
6. Prompts and ingredients appear per frame role (§5.4.6).

### 5.8 CineBlock entry (W61)

**#61 is not reopened.** D61 and ADR 0024 stand. The requirement exposed by #60: CineBlock entry must be **explicit and visible** in the frame work: **Block scene in CineBlock** (opens with all the scene's shots, D61.2) and **Block this shot** (opens the same scene state focused on that shot). Returned captures appear on the matching frame role as **references** for frame generation; they still need a full description and the right assets to produce the frame (D61.3).

### 5.9 The pending comparison

> **Resolved by [Record 5](CREATOR-RATIFICATION-RECORD-5.md).** The v3 prototype (`prototype/v2-60-scene-production-v3`) went beyond both variants; the creator ratified a staged model of **Scene Prep** (V1 stages 7+8) and **Generate** (V1 stages 9–12, including Take creation) followed by **Review** (W62-A), with no separate Takes tab. The text below is kept as the brief that was given.

Build two variants with the **same dense, realistic scene and shot data** and **full feature parity**; neither may be simplified to favour the other:

- **Variant U (unified):** one Scene Workspace with **Plan · Frames · Takes** modes, a persistent shot strip and selected-shot context.
- **Variant S (staged):** **Shots & Assets** (V1 stages 7+8) → **Frames & Prompts** (V1 stages 9+10) → **Takes** (W62-A), with shared shot navigation.

Both must demonstrate §5.2–§5.8 and the transition into W62-A Takes. The creator then ratifies the workspace. Even "7 and 8 in one workspace, 9 and 10 in another" is acceptable as an outcome.

## 6. Y: cross-surface rules

- **Y1 Accepted content reads clean.** Accepted or canonical prose carries no persistent "AI added" or "AI generated" annotations. Provenance is shown through the explicit **AI vs Mine** toggle (highlight colours) and on demand, everywhere. The Master Narrative's optional AI-additions review opens with the toggle on; it never gates.
- **Y2 AI-made choice marks (refines R7).** Quiet "AI chose" marks show **until the creator accepts or approves the thing that contains them** (plan accepted, identity approved, Master Narrative accepted). After that they are visible only through the AI vs Mine toggle and the on-demand project-wide list. They remain recorded and overridable.
- **Y3 Scene-grain overviews.** Above a single scene, the whole film is drawn per scene (hub ribbon, review ribbon); individual shots appear only inside a scene. One timeline component at both grains (X6).
- **Y4 Entering a scene.** Any arrival at a scene's workspace counts as entering it for the initial-plan auto-draft (Record 3 CR-2): Outline, previous/next, Cmd-K, Fix this shot, links from World. Peek, hub selection, hover and whole-film playback crossing scenes do not.
- **Y5 Locks.** A hand edit to a locked plan, or a pick change on a Mark-final shot, uses the lock's edit-through confirmation (Record 1 #63 item 2). One lock glyph and unlock gesture everywhere.
- **Y6 One compare component** with Select on each pane, across treatment options, Takes and Look/View attempts. **One undo idiom**: a toast for the immediate step, version history for later recovery.
- **Y7 The 10+ rule** is unchanged: "10 or more Generations; take batches count Takes, a long shot is one". Draft all is one Generation per scene. A part Retry counts its own price toward the cap. A cap breach on any auto-trigger means no auto-draft and a ticket with no Start.
- **Y8 Moving an ad-hoc shot into a scene with no shots** is allowed and creates that scene's plan, so the scene then has an existing plan and auto-draft never fires there.

## 7. Prototype recommendations changed or rejected

| Ticket | Agent recommendation | Creator decision |
|---|---|---|
| #60 | Ratify A (cards → workspace) + B strip and drag-reorder | **Workspace not ratified**; hub = B list + summary panel; capability requirements ratified; two-variant comparison (§5) |
| #60 | Per-shot ticks only removed from B | Hub ribbon per scene, key-frame carousel, ending image |
| #62 | A + C minimap + B gap actions; frames reviewed in the same area | A + scene ribbon + next-unsettled; **frames move to #60 frame work**; wide take composer; no persistent sidebar |
| #58 | Pager, dock, bar | Ratified; plus no persistent AI tags, Draft treatment options on skipped |
| #59 | Tiles, tabs, one needs line | Ratified; description-only Looks |
| #61 | No change | No reopening; explicit CineBlock entry in frame work |

## 8. Recorded in this session

Applied: this record; `docs/ux/NAVIGATION.md`, `CANDIDATE-REVIEW-AND-PLAYBACK.md`, `WRITING-EXPERIENCE.md`, `WORLD-DEFINITION.md`, `TRUST-SIGNALS-AND-LOCKS.md`; `docs/domain/SHOT-MODEL.md`, `ENTITIES-AND-LOOKS.md`; `docs/ai/AI-RESPONSIBILITY-MAP.md`; `docs/architecture/PERSISTENCE-AND-MEDIA.md`; `GLOSSARY.md`. Not done: live GitHub issue and map edits, orchestration of #69/#76–#79, `/to-spec`, `/to-tickets`, implementation. The #60 prototype comparison is next (done: [Record 5](CREATOR-RATIFICATION-RECORD-5.md)).

## 9. Constitution check

No amendment. §13.2 (AI-made choices visible and overridable; provenance highlight toggle) is met by Y1 and Y2: choices stay recorded, listed on demand and highlighted by the toggle. §7.3 and §8.1–8.3 are strengthened by §5. §6.4 (shot-driven coverage) and §12.1 (selected takes only) are unchanged.

## 10. Still deferred

Everything deferred in Records 1–3 stays deferred. New spec-level items: the exact list of match kinds; roster field names; the scene frame gallery's ordering; take-composer layout details.
