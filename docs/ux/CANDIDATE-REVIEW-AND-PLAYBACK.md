# Aiuteur V2: Candidate Review, Selection, Spend Ticket and Sequence Playback

Resolution of Wayfinder ticket #62. Authority: the Product Constitution, then [Creator Ratification Record 1](../product/CREATOR-RATIFICATION-RECORD.md) (R2, R8, R9, M1, M2, #63, #68) and [Record 2](../product/CREATOR-RATIFICATION-RECORD-2.md) (D62, D52.4, X1, X2, X5, X6, X7, X8, X10, P3), which control where they differ from the prototype or from any earlier recommendation. The document names surfaces and behaviour, never components, routes or pixel layout. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). It places its surfaces inside the shell of [`NAVIGATION.md`](NAVIGATION.md) §8, uses the job semantics of [`JOB-LIFECYCLE.md`](../domain/JOB-LIFECYCLE.md), the spend rule of [`BUSINESS-AND-OPERATIONS.md`](../domain/BUSINESS-AND-OPERATIONS.md) §3 and the take-selection rule of [`TRUST-SIGNALS-AND-LOCKS.md`](TRUST-SIGNALS-AND-LOCKS.md) §6, and the Take/Segment model of [`SHOT-MODEL.md`](../domain/SHOT-MODEL.md) §7.

Constitutional anchors: §3.1, §9.2, §10.2–10.3, §12.1, §13.4–13.6, §16 principles 7 and 10, §17.2. **No requirement was found unworkable; no `CONSTITUTION AMENDMENT REQUIRED` is raised.**

## 1. Decision

Three throwaway prototypes compared structures on one scene of six shots (A viewer plus filmstrip, B take wall plus run tray, C sequence-first). They are on the never-merged branch `prototype/62-candidate-review`. Per Record 2 §3.1 they are **structural sketches only**: their visuals are not approved, and the V1 WizardDirector UI (dark, cinematic, dense) is the visual reference for the real UI (X10).

The creator chose **C, sequence-first, with a main viewer** (D62). The agent's recommendation of A as base is replaced.

**Record 4 (W62).** In the fresh strong-model prototype round (`prototype/v2-62-review`), the creator ratified **variant A** as the base for this sequence-first model: a runtime-proportional scene timeline, the main viewer, the selected shot's Takes beneath, the **Scene / Whole film** toggle, Mark final, Fix this shot, and generating Takes while keeping timeline context. [Record 4](../product/CREATOR-RATIFICATION-RECORD-4.md) controls where it changes this document: whole-film mode is a per-scene ribbon (§2), frames move out of review into the #60 frame work (§3.2), Make another take is a wide composer, and nothing sits in a persistent right-hand sidebar.

**Record 5 (RB, GN8).** [Record 5](../product/CREATOR-RATIFICATION-RECORD-5.md) places this surface as the scene workspace's **Review** step, after **Scene Prep** and **Generate**. Generate makes one shot's Frames and Takes and shows only that shot's Takes; this surface judges Takes in sequence. Both read the same selection pointer. The take composer is one component, shown in Generate's Takes drawer and opened wide here by Make another take.

1. **One surface for review and playback: the scene timeline.** It is the scene's shots in story order, each a cell showing its selected take (or a gap slate, §4). The **main viewer** shows what is under the playhead. The same timeline and viewer serve review in the scene workspace and the scene mode of Review & Export. The Script Hub's scene ribbon is the same component at the whole-film grain (X6, Y3). Scene Prep has no runtime-proportional view: its Scale bar was removed (Record 5 SP7), and runtime against the target is a header figure.
2. **The selected shot's other takes sit under the timeline.** Each take is a thumbnail with its duration and quiet labels.
3. **Swapping a take in is selecting it.** Clicking a take under the timeline puts it in the cut, the sequence plays with it, and it is the shot's selected take. There is **no separate preview state**. Selection is reversible, creator-only and recorded (TRUST-SIGNALS §6); another click on another take changes it, and **Unselect** is available.
4. **Side-by-side compare is optional** (it replaces the viewer with panes), up to **three** takes of one shot, with a Select action on each (X1). It is never mandatory chrome.
5. **Spend is an inline ticket at the initiating control** (§5). No modal.
6. **Failures are quiet** (§6).

## 2. Layout and reachability

```diagram
┌──────────────────────────────────────────────────────────────────────┐
│ Scene header: runtime planned vs as made · N of M selected ·         │
│ N need a pick · N missing · N possibly out of date (quiet)           │
├──────────────────────────────────────────────────────────────────────┤
│                         MAIN VIEWER                                   │
│                  (plays selected takes in order)                      │
│  ⏮  ▶/❚❚  ⏭   skip gaps          scope: this scene | whole film      │
├──────────────────────────────────────────────────────────────────────┤
│ SCENE TIMELINE  [7A][7B ·][ 7C gap ][ 7D 2 of 3 parts ][7E retry][7F] │
│ width follows runtime · ● = possibly out of date · hatched = gap     │
├──────────────────────────────────────────────────────────────────────┤
│ SELECTED SHOT (7C): other takes   [T1][T2][T3 arrived after cancel]  │
│  Compare (up to 3) · Reject · Mark final · Play in context           │
│  Make another take ▸  opens the wide take composer (model, guidance, │
│  prompt and its ingredients, references, price)                      │
└──────────────────────────────────────────────────────────────────────┘
```

- **Review is the scene workspace's third step** (Record 5 A5). Scene Prep and Generate do the shot work; here the viewer, timeline and the selected shot's takes judge it in sequence. Review & Export shows the same timeline and viewer, larger, with the scene-or-film scope switch and the export package beside it.
- **Whole-film mode** (Record 4 W62.1, Y3). A **scene ribbon** spans every active scene in story order: one block per scene, width = runtime, with a quiet picked / needs-a-pick / missing bar. It is never drawn one mark per shot (D60.1). Choosing a scene opens that scene's timeline under the ribbon. **Next / previous unsettled shot** steps through the film. A filter dims scenes with no matching shot and "next match" steps through the rest. Playback walks selected takes across scenes in story order. The Script Hub uses the same ribbon.
- **Make another take** opens a **wide take composer** using nearly the full workspace width: model and price, optional guidance, the prompt with its ingredients (assets and Looks or states, references, continuity source, camera, frame role), and references. It is never a cramped row (Record 4 W62.3). It is the same take composer as Generate's Takes drawer (Record 5 GN8).
- **No persistent right-hand sidebar.** "What's unsettled" is a count in the scene header that opens its list on demand; recorded-decision lists are on demand too (W62.4).
- **Fix this shot ▾** offers **Open in Generate** and **Open in Scene Prep** on that shot, with **Back to Review** returning to the same scene, shot, playhead and Scene / Whole film state (NAVIGATION §4, §8; Record 5 RB3). Generate's **Open in Review** lands on that shot under the playhead (RB4). Previous and next shot and scene are one key or click.
- **Play in context** plays the previous shot's selected take, the take under review, then the next shot's selected take. Because a swap is a selection, "in context" is simply the normal playback started a shot earlier; the button is a convenience for starting there. No separate preview state exists.
- **The Peek** never reviews candidates and never starts spend.
- **Ad-hoc shots** (Record 2 X5) belong to no scene: they are not in the scene timeline, runtime or sequence playback, and their takes are made and picked in Generate from their own section (Record 5 §2).
- **Removed from Story** scenes (Record 2 D52.4) are not in the story order, so their shots are not in the film timeline, runtime or sequence playback; their takes stay viewable from that group (SCENE-IDENTITY §5.1).

## 3. Candidates: takes and frames

### 3.1 Takes

- **Selecting, rejecting, restoring.** Select puts one non-rejected Take of the shot in the pointer. **Reject** marks a Take rejected (it moves to a quiet "Rejected (n)" group with **Restore**); rejecting the selected Take deselects it in the same action group (SHOT-MODEL §12.9). Nothing is deleted (R1).
- **Mark final** is the optional voluntary lock of TRUST-SIGNALS §6; shown as a quiet "final" mark on the cell, with one-click unlock. Changing the pick on a final shot uses the lock's edit-through confirmation, not a forced "unlock first" (Record 4 W62.7).
- **Nothing is auto-selected** (JOB-LIFECYCLE §11, Constitution §14.3), even for the first Take of a shot. A new Take arrives unselected with a quiet "ready, not selected" notice; the notice opens the Take and never selects it.
- **Changing the pick flags** what was built from the previous one, quietly (R2): a whisper dot with the exits of TRUST-SIGNALS §2. Nothing regenerates.
- **Take labels** (quiet text, never alarm styling): the model used, "guided" when the Take was regenerated with guidance (hover shows it), **"arrived after cancel"** and **"arrived late"** for late results (M2: quiet notice, attached unselected), "prompt overridden" (R3), the delivered duration when it differs from the plan, and "from the merged shot" (SHOT-MODEL §5.3).
- **Long shots.** One Shot is one Take whatever its Segments. It is priced and started as one Take ("about 18 s · 3 parts · $x", SHOT-MODEL §7.2). While a long shot is partly realized the cell reads **"2 of 3 parts made"**; a failed part offers **Retry · $x** with that part's price and the parts after it wait (R8); no Take exists until assembly succeeds (SHOT-MODEL §7.3). **Regenerate from part k** is offered when the creator reports a problem after the first parts, and states the saving ("reuses 1–2, makes 3: $x").
- **Guidance** when regenerating is one optional text field; **model override** at the trigger is the model picker next to the button, with its price; a model with an unavailable price says "price unavailable" and asks for confirmation (§5).
- **Prompt and references** (§10.3/§13.5 escape hatch) is the take composer's video prompt, open by default, with its ingredients, frame inputs and references (Record 5 GN5, GN8): the exact prompt and reference list for the next Take, editable, with a quiet "prompt overridden" mark afterwards. It is never required, and the same view opens read-only for any existing Take.

### 3.2 Frames

**Record 4 W62.2: frames are not made or reviewed on this screen.** They are made and approved in Generate's **Frames** mode (#60, Record 4 W60 §5.7, Record 5 GN2–GN3), with neighbour-frame comparison and a scene frame gallery; Takes are made in Generate's **Takes** mode and judged in sequence here. The rules below still define frame approval wherever it happens. Frames (images for a Frame plan role) are reviewed with the role's other Frames listed beside the one under review. A Frame role is a Slot: **Approve** is the Frame's counterpart of Select, a reversible creator Decision, with the same compare (up to 3), reject/restore and quiet-label rules. Reused, edited, extracted and captured Frames show their source (SHOT-MODEL §6.3). Approving a Frame never starts video. A shot in "Framing" can generate its video anyway through "Generate without the unapproved opening frame" (SHOT-MODEL §6.2), which is one recorded skip Decision, not a gate.

## 4. Sequence playback

**Rule.** Playback plays **selected takes only**, in story order (Constitution §12.1). Nothing plays that the creator did not pick, so the cut is always the creator's.

| Shot situation | What plays | Cell and slate text | Offered action |
|---|---|---|---|
| Selected Take | The Take, at its delivered duration | the Take's thumbnail | click to play from here |
| **Takes exist, none picked** | A 2-second gap slate | **"3 takes · none picked"** | **Pick** (opens the takes under the timeline) |
| **No take yet** | A 2-second gap slate | **"No take yet"** | **Generate · $x.xx** (opens the inline ticket, §5) |
| Generating | A gap slate | "Generating" with progress; for a long shot "2 of 3 parts" | Cancel |
| Failed | A gap slate | quiet failure text (§6) | **Retry · $x.xx** |
| Selected Take that is possibly out of date | The Take, normally | a whisper dot on the cell | the dot's exits (TRUST-SIGNALS §2): Regenerate, It still fits, Keep |
| Retired shot | Not in the cut | not shown | un-retire from the scene workspace |
| Shot of a Removed from Story scene, or an ad-hoc shot | Not in the cut | not shown | Bring back or Adopt work (SCENE-IDENTITY §5.1); Move to scene (X5) |

- **Gaps are distinguished.** The slate and the cell say which kind of gap it is ("3 takes · none picked · Pick" versus "No take yet · Generate"). Scope filters on the timeline and the Outline's "needs attention" filter likewise separate **needs a pick** from **missing**.
- **Skip gaps** is a creator toggle; the default plays gaps as short slates so that holes are felt in the rhythm. Skipping changes only playback, never the plan, runtime or export.
- **Possibly out of date never changes playback.** The take plays as picked; the whisper dot is the only mark (M1). Dots on cells and a quiet scene-header count are the in-sequence signal; the review-all tray (TRUST-SIGNALS §1) remains the bulk surface.
- **Runtime** (scene header): planned (targets) beside as made (selected Takes' delivered durations, SHOT-MODEL §7.5); both can show; nothing blocks or trims.
- **Progress** (planned, framed, generated, selected, missing, possibly out of date) is the same derivation as the whole-film overview and Outline, never stored (NAVIGATION §3).
- **Nothing blocks.** Missing, unselected, failed or out-of-date shots block neither playback nor export. Their actions sit on the gap cell (Pick, Generate · $x, Retry · $x) and in the on-demand "What's unsettled · 5" list opened from the scene header (Record 4 W62.4–5).
- **Scrubbing, jumping.** Clicking any cell seeks and plays from it; previous and next buttons move by shot. A cell's Fix action opens the shot.
- **Audio** follows the selected Takes' own audio; joins between Takes are straight cuts. No in-app editing timeline (LATER); this is a viewing and fixing surface, not an editor.

## 5. The spend ticket (cost-confirmation interaction)

All thresholds are #68's ($0.05 trivial, $2.00, 10 Takes per Record 2 P3, bulk by filter, unknown price, cap). This document decides only how they appear (X2).

1. **Price on the control.** Every Generate, Regenerate, Regenerate from part k, Retry, Generate missing and batch button carries its estimate (a range is shown as a range and the confirm rules test its upper bound; "unknown" reads "price unavailable"; BUSINESS §3). A long shot reads "$2.52 · 3 parts".
2. **One click when no confirm rule fires.** A trivial or meaningful action under every threshold, including a **single video under $2.00**, starts on the click. The click is the approval. A quiet "generating" state replaces the button; the creator keeps working.
3. **The inline ticket when a confirm rule fires.** The button's own control row expands in place into a **ticket**: the count (in Takes for take batches, a long shot counting as one, P3), the total or range, the largest item, one line per reason it appeared ("Total $2.52 is $2.00 or more", "10 or more Takes", "Bulk regenerate by filter", "A price is unavailable"), what is left of the daily cap, and a primary **Start · $total** with **Not now**. It is part of the page, never a centred modal, never a popover covering the work, never typed text. It does not hide a prior view; one ticket exists at a time.
4. **Scope-then-invoke for batches.** The creator ticks shots on the timeline (or uses quick scopes: gaps, needs a pick, possibly out of date, all in scene) and the control under the timeline reads "Generate N · $total". Whole-film actions use the same ticket at their control on the whole-film overview (the Board, the Script Hub, NAVIGATION §2). **Regenerate flagged / bulk by filter always shows the ticket** with the money at risk (BUSINESS §3). Staleness itself never spends (R2, X8).
5. **Cap breach offers no Start.** When the action would pass the creator's cap, the ticket shows what is left and offers only **Raise the cap for this action** (an explicit creator act, BUSINESS §6.1), **Trim the selection** (remove items to fit), and **Not now**. There is no Start button until the action fits. The hidden operator ceiling refuses before a ticket exists, in plain studio wording (BUSINESS §6.2).
6. **Retry** shows its price (or "not charged") and the click is the approval; if the retry alone meets a confirm rule it uses the ticket.
7. **Duplicate guard.** A second click on an already-generating target shows "this is already generating" with "generate another" (JOB-LIFECYCLE §4). The action id is minted when the ticket opens.
8. **Cancel** while generating is always there; when the provider cannot stop a started run the control states beforehand "you may still be charged up to about $X" (information, not a second confirmation).

## 6. Progress and failure presentation

- **Background progress.** A generating target shows a quiet progress indicator in its timeline cell and takes area, derived from a non-terminal Job (JOB-LIFECYCLE §2.1 labels: Waiting, Generating, Finishing, Retrying, Cancelling). The top strip shows a single quiet count of running work; the Outline and whole-film overview show the same derived state. Completion produces one quiet "ready, not selected" notice per Generation, coalesced for batches ("11 of 14 ready · 2 failed · 1 cancelled").
- **Failures are visible and quiet (X7, M1).** A failed Generation is a **muted mark with plain text and a Retry**, in the shot's cell and takes area: for example "Timed out · you may have been charged · **Retry · $0.56**". No red frames, banners, modals or alarm colour; colour is never the only carrier (accessible name and text). The failure class changes the wording and the available action (JOB-LIFECYCLE §5.2):
  - transient unbilled: "Failed, not charged", automatic retries already shown as "Retrying";
  - maybe billed or unknown: "May have been charged", Retry with price (R8);
  - permanent input or safety refusal: the provider's reason as given, **Edit and retry** (opens Prompt and references or the shot), never an auto-retry;
  - platform configuration: told plainly as a studio problem, not the creator's content;
  - partial batch: "11 of 14 ready"; a failed member's Retry is on its own cell, and "Continue the batch" re-queues cancelled dependents without new approval.
- **Unread failures** are kept (a creator who was away finds them on return) as a quiet count in the top strip that opens the list of failed items with Retry on each; the same list is where "arrived after cancel" and "arrived late" Takes are announced.
- **Dismiss** hides a failure's mark for that shot and lowers the unread count, without deleting its run history.

## 7. Cancel, late results and adoption

A cancelled Generation reads "Cancelled" and nothing else. If the provider completes anyway, the Take (or Segment) is attached **unselected** and labelled **"arrived after cancel"**, with a quiet notice (M2). A timed-out run that later succeeds is adopted into the same Generation, labelled "arrived late", unselected, and flagged possibly out of date at once if its inputs changed since dispatch (Record 1 §3, LINEAGE). Neither is ever auto-selected.

## 8. Hand-offs

| Ticket | Receives |
|---|---|
| **Scene and shot workspace redo** (#60) | X6 is closed by Record 5 SP7: Scene Prep shows runtime as a header figure only, and the Script Hub ribbon and this Review timeline share one component; the takes area, spend ticket and gap slates plug into the shot work area; ad-hoc shots excluded from the timeline (their section is the redo's, X5); whatever form the redone whole-film overview takes (D60.3) uses the same derived states and the same gap vocabulary ("needs a pick" versus "missing"); the batch-draft undo is #60's. |
| **Providers and models** (#66) | The model picker at the trigger, price source and "price unavailable" case; the long-shot estimate "N parts". |
| **Generation package** (#65) | The take composer's prompt view shows the layers of ADR 0014 as recorded for the next Take and for past Takes; overriding writes the shot's prompt override. The **Package inspector** is an on-demand panel opened from either prompt view (Prompts tab or Takes drawer; NAVIGATION §4), spec-level. |
| **Trust signals** (#63) | Dots and exits on timeline cells; review-all tray as bulk surface; Mark final presentation. |
| **Module architecture** (#71), **Persistence** (#72) | The timeline needs a cheap, whole-scene and whole-film derived read (selected Take or gap kind, state, out-of-date flag, durations) without loading each shot's record; the ticket's estimate, reasons and cap check are server computed (BUSINESS §6.3), the client only displays them. |
| **Runtime** (#74) | Progress and the unread-failure list come from the per-Account SSE stream and outbox events. |
| **Export and review (later)** | Selected Takes are the only link to delivery; ad-hoc Takes export separately (X5); missing and unselected shots are listed quietly in the package and never block. |
| **Verification** (#76) | Fixtures: swap equals select and rewrites the pointer; a cap-breach ticket has no Start; "3 takes none picked" and "no take yet" render differently; failed, late and cancelled states never auto-select; opening or playing writes nothing. |

## 9. Rules and invariants

1. Playing, scrubbing and opening a shot write nothing (SHOT-MODEL §12.12).
2. The selected pointer references a non-rejected Take of its own Shot; only the creator moves it (select or swap, Unselect, or rejecting the selected Take).
3. No candidate is ever auto-selected or auto-approved.
4. No review or playback path creates a meaningful Generation without the creator's click on a control that showed the price; nothing here starts a Generation automatically (X8).
5. A cap breach never offers Start.
6. Flags and failures never fade, recolour or restyle the work, and use no banner or modal.
7. Reviewing happens in the scene workspace centre; the Peek never spends.
