# Writing experience: Treatment, Beat Sheet, Master Narrative, acceptance and version recovery

Resolution of Wayfinder ticket #58. Authority: the Product Constitution, then [`CREATOR-RATIFICATION-RECORD.md`](../product/CREATOR-RATIFICATION-RECORD.md) (Record 1: R2, R10, M1, M3, #63) and [`CREATOR-RATIFICATION-RECORD-2.md`](../product/CREATOR-RATIFICATION-RECORD-2.md) (Record 2: **D58**, X1, X4, X10, §3.1), which controls where they differ. Vocabulary is in [`GLOSSARY.md`](../../GLOSSARY.md). Semantics come from [`STORY-DOCUMENTS.md`](../domain/STORY-DOCUMENTS.md) (#51, ADRs 0008 and 0009) and [`SCENE-IDENTITY.md`](../domain/SCENE-IDENTITY.md) (#52); the shell is [`NAVIGATION.md`](NAVIGATION.md) (#56); flags and locks are [`TRUST-SIGNALS-AND-LOCKS.md`](TRUST-SIGNALS-AND-LOCKS.md) (#63). This document names surfaces and behaviour, never components, routes or pixel layout.

Constitutional anchors: §4.2 Phases 3–5, §4.4 (4, 5), §5.4, §5.6, §13.2–13.4, §17.2, Appendix A Q28 and Q29. **No `CONSTITUTION AMENDMENT REQUIRED`.** Multiple options by default, "just one" allowed, direct-apply edits, optional guidance and acceptance as a commitment point are all kept.

## 1. Selected direction

Three throwaway structural prototypes were compared (A Page, B Spread, C Margin; never merged, branch `prototype/58-writing-experience`). The creator chose **Page A as the interaction structure**: one document per centre page, opened from the persistent Outline, with the changes below.

**Prototypes are structural sketches only (Record 2 §3.1).** Their beige styling, spacing, typography and components are not approved. The visual and interaction reference for the real UI is the **V1 WizardDirector** (its Treatment workspace with per-option summaries and attributes, its regeneration controls and notes, its beat-alignment panel, its dark cinematic feel), modernised. Nothing in this document approves a visual design.

| From the prototypes | Verdict |
|---|---|
| A: one document column; options read one at a time; quiet drift mark; sheet-style acceptance; version panel | **Base** |
| A/B: "how many options" chips (1 / 2 / 3 / 4), "+ one more", count chrome of any kind | **Rejected**: the count is an account setting (§2.2) |
| B: Treatment and Beat Sheet as one aligned spread of equal editing surfaces | **Rejected**: Beat Sheet is the workspace, Treatment is a reference sidebar (§4) |
| B: side-by-side option columns | Not adopted as chrome. Comparison stays available at the choosing moment (X1, §2.5) |
| C: stepwise accept wizard | **Rejected**: one concise sheet (§6) |
| C: per-passage "bring this version back" | **Adopted** (§7.3) |
| All three: lock unchecked at acceptance | **Wrong**: lock is on by default (§6) |
| Provenance toggle; beat reorder, add, alternatives; "skipped by you"; development-history status | Kept |

## 2. Treatment workspace

The Treatment opens in the centre from the Outline. Its phase page begins with one line saying what it is for and that it can be skipped or bypassed (NAVIGATION §7).

### 2.1 Choosing among options

- On first entry, if no Treatment exists, Aiuteur drafts the configured number of options (an M3 auto-trigger on entry to an empty phase; text only, so ordinarily under the trivial-spend threshold and priced like any operation). It never redrafts an existing Treatment on entry.
- One option is open at a time, in the full document column. A quiet switcher ("Option 2 of 3", previous and next, or a short list of option names) moves between them. It shows where the creator is, not how many to make.
- Each option carries a **V1-style summary and attributes**: a short summary, plus a few attributes the creator can grasp at a glance (for example tone, structural emphasis, how it ends, estimated runtime). Attributes are generated with the option, are labelled AI-made, and are read-only labels, never document text. Runtime is an estimate and says so.
- **Choose this one** is the primary action on an option. Choosing is one action: the Option's blocks become the Treatment as one Revision labelled `chosen from <option>`; the others stay recoverable (STORY-DOCUMENTS §2.3, R1). Unchosen options are editable while unchosen and are never synchronized.
- Comparison is available at the choosing moment (X1): the switcher can show options side by side as an optional action, never mandatory chrome.
- With the account setting at 1, the page opens one option and the action reads "Use this treatment". That is the "just give me one" path.

### 2.2 Option count is an account setting

- The number of options generated at a time is an **account-level setting, default 3** (Appendix A Q28). The workspace generates that many and shows **no count chrome**: no chips, no "just one", no "up to N".
- Setting it to 1 satisfies Constitution Phase 3 "just give me one". The allowed range is spec-level; the default is a design default, not law (§17.2).
- Changing the setting affects future generations only. It never rewrites or removes existing options.

### 2.3 New alternative treatment

- An obvious **New alternative** action opens the regeneration box (§2.4). The creator may optionally say what to change or what earlier options misunderstood. Empty guidance is allowed.
- The new Option appears **in place of the one currently open**. Every earlier option remains available in the switcher. Nothing is discarded (R1).
- It adds one Option per press; it never replaces the set.

### 2.4 Regeneration

One **regeneration box** serves every regeneration, with optional guidance (V1 required at least 10 characters; V2 requires none).

| Scope | Behaviour |
|---|---|
| **Whole document** | Regenerates the entire Treatment. **Keep my edits is the default.** Runs with provenance `creator`, `imported` and `ai_edited` passed to the model as handles and restored by code (protected spans, STORY-DOCUMENTS §3). **Replace everything** is an explicit alternative; the replaced text stays in history. Unrevised working-copy changes are captured first (pre-operation capture). |
| **Selected passage** | Highlight text, optionally give an instruction, choose **Rewrite**. The result applies directly with no preview or diff gate (§13.3). The creator can ask for **several alternatives** instead of one; alternatives are held as Options on that Generation and choosing one applies it as the splice. The selection is the only thing that changes. |
| **New alternative** | §2.3. |

Every regeneration is one Generation and one Revision; the previous text is in history and a quiet **Undo** (restore of the prior head, adding a new head) is offered after a direct apply. A held result (protected-span conflict, base changed meanwhile, fact conflict after repair, R6) is shown as a quiet "held" item with one-click **Use it**, **Adjust by hand**, or **Discard**. An altered-dialogue or damaged-splice result is rejected with no "use anyway", and the selection is preserved on any failure.

### 2.5 Hand editing, provenance and the rest of the page

- Hand editing is continuous; autosave writes the working copy only. Nothing the creator does to browse creates a Revision (STORY-DOCUMENTS §4).
- **Highlight AI vs mine** is a project-wide toggle, off by default (§13.2). Reading it changes nothing.
- A quiet drift mark and an **Update Beat Sheet from Treatment** action sit on the Treatment page when a Beat Sheet exists and drift is present (§4.2).
- A version-history panel opens in the page (§7). The drawer prohibition in NAVIGATION §1.3 applies to shot work only.

### 2.6 Notes

- **Notes** (writing) are the creator's annotations on a passage or beat. They are **not part of the document text** (no runs, no provenance, no export) and are **never sent to the AI**.
- Exception: a regeneration request has a **"use my notes"** checkbox, **unticked by default**. When ticked, the notes in scope (the document, or the selection) are sent with that request only, and the request shows exactly which notes went. Ticking is per request and is never remembered.
- Notes survive Revisions, restores and regeneration. A note whose anchored text was retired stays attached to its block's history rather than disappearing (R1). Removing a note retires it; it does not destroy it.
- Notes stay on Treatment and Beat Sheet pages after acceptance, as development history.

## 3. Interview-skipped, bypassed and imported states

These show on the phase page and in the Outline status, never as a modal (NAVIGATION §3). A bypassed Treatment shows "covered by your screenplay" and offers "fill it from the Master Narrative" on request only (reverse generation, X4). An imported Treatment opens as the creator's own text (`imported` runs).

## 4. Beat Sheet workspace

### 4.1 Layout

- The **Beat Sheet is the primary centre workspace**: one beat per row, numbered, each directly editable.
- The chosen **Treatment appears in a collapsible right-hand sidebar**, read-only, for reference while working through beats. Hiding it gives full writing space; the choice is remembered per creator as non-creative UI state. When a beat is focused, its linked passage(s) are highlighted in the sidebar. The sidebar is a reference, never a second editing surface; editing the Treatment happens on the Treatment page.
- Only one right-hand slot exists: opening version history (§7) replaces the Treatment sidebar until it is closed.
- With no Beat Sheet yet, the page offers **Derive beats from the Treatment** (and "add your own"). With no Treatment, it offers drafting from the Input and Interview as per Constitution Phase 4.

### 4.2 Editing, reordering, alternatives

- Edit text in place; reorder by drag or with move up and move down; add a beat after any beat; remove a beat (retire; recoverable). V1's minimum-beat and minimum-length refusals are not carried over: a short or small Beat Sheet is the creator's choice.
- **Alternatives** for a beat are on-request suggestions shown beside it. They are transient proposals, not document content, until the creator uses one, which applies directly as an `ai_edited` replacement. The previous beat text stays in history.
- A beat with no passage and a passage with no beat are shown quietly (STORY-DOCUMENTS §6.2).

### 4.3 Explicit sync between Beat Sheet and Treatment (X4)

R10 stands: Aiuteur detects and shows drift automatically, quietly, and changes nothing unless the creator presses an action. This is the general principle (X4): later creative work may refine earlier development documents, but the creator explicitly invokes it.

| Action | Where | Meaning |
|---|---|---|
| **Update Treatment to match Beat Sheet** | Prominent on the Beat Sheet page; per beat and for the whole pair | Revises the Treatment passages that correspond to the changed beats so they reflect the Beat Sheet's newer decisions, **preserving unrelated Treatment detail**. This is the primary direction. |
| **Update Beat Sheet from Treatment** | Available on both pages (secondary here, on the Treatment page when the creator has gone back to edit it) | The reverse. |
| **Keep both as they are** | Same place | Resets the base to current; no text changes. |
| **Add the missing beat / passage** | On uncovered items | Insertion only; never touches existing blocks. |

- Each action is one Generation and one `sync` Revision per target document, undoable. Whole-pair update is a batch of per-link Generations so completed items survive a later failure.
- Creator-written Treatment spans are protected. If the change would alter one, the result is **held** and shown for **one-click approval** (R10); a damaged splice is rejected.
- When both sides changed since they last agreed, nothing is chosen for the creator. The affected item offers the three explicit choices (update Treatment, update Beat Sheet, keep both).
- Drift is a whisper (M1): a low-contrast dot beside the affected beat and a quiet line near the top ("N places differ from the Treatment") with the reason on tap. Never a banner, modal, fade or alarm styling. Pressing nothing never changes a document.
- If the pair was never aligned (for example both imported) Aiuteur says it cannot compare and offers **Align**; it does not claim agreement it cannot know.

## 5. Master Narrative workspace

- The Master Narrative opens in the centre with the same pattern: a **collapsible right-hand Beat Sheet sidebar** for alignment, read-only (V1's beat-alignment panel), highlighting the beats behind the scene being read. Version history shares the same right-hand slot.
- Scenes are `scene` container blocks with a heading label and an approximate duration shown as an AI estimate or the creator's own value ([`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) §2.1). The sum against the intended runtime is shown in the top strip, never blocking.
- **Drafting** first runs the **disagreement check** if the Treatment and Beat Sheet differ (R10, STORY-DOCUMENTS §6.5): a quiet inline ask on the page "Treatment and Beat Sheet differ in N places. Which should the Master Narrative follow?" with **Follow the Treatment**, **Follow the Beat Sheet**, **Update first** (opens the sync actions), never a modal and never guessed. The drafting Generation records the exact Revisions it used.
- **Editing and targeted rewrite** behave as §2.4: highlight, optional instruction, direct apply; a selection crossing a scene boundary is applied per scene and cannot move a boundary (SCENE-IDENTITY §2.3). Hand edits of structure (insert, delete, split, merge, reorder scenes) are ordinary edits.
- **Screenplay conversion additions.** AI additions made while converting a screenplay (descriptive detail between existing blocks, `ai_generated`) are marked inline with a quiet "AI added" tag. Each has **Keep** and **Remove** (Remove retires the block; recoverable). A quiet line offers **Keep all**. The creator's own words are never changed by conversion. Reviewing additions is **optional and never gates** anything, including acceptance. Untouched additions stay marked "AI added" until the creator keeps or edits them; keeping does not launder provenance.
- Once production exists, edits to the Master Narrative show the small inline note of what will be marked possibly out of date (TRUST-SIGNALS §5) and follow the lock rules.

## 6. Acceptance: one concise sheet

Accepting is the commitment point (§13.4, §5.6). It is one **concise sheet** opened by **Accept Master Narrative**, not a stepwise flow. It contains only:

1. **The disagreement ask**, only if the Treatment and Beat Sheet still disagree and no choice was recorded: Follow the Treatment, Follow the Beat Sheet, or Update first. The choice is recorded as a creator Decision. Following a document does not rewrite the Master Narrative; the creator can redraft or edit. If both documents are skipped or only one exists, nothing is asked.
2. **A one-line AI-additions status** ("4 AI additions not reviewed"), with a link to review. **Never gates.** Absent when there are none.
3. **A "Lock" checkbox, checked by default** (Record 1 #63 item 3; this corrects the prototypes). Accept and lock stay separately addressable (LINEAGE §6.4).
4. **Accept** and **Not yet**.

Behaviour:

- Acceptance proceeds only by the creator's explicit click. Nothing is generated or spent. Zero scenes cannot be accepted (SCENE-IDENTITY §2.1).
- The sheet shows what accepting does in one sentence: production is built from this, and Treatment and Beat Sheet become development history.
- After acceptance the Outline shows the Master Narrative as **accepted** (and locked if so), and an **Unlock** action is one click, always available. Editing a locked Master Narrative goes through the lock edit-through confirmation with server-computed impact (TRUST-SIGNALS §3–5).
- **Treatment and Beat Sheet become development history.** Drift is no longer computed or shown, nothing is flagged (R2), they are never synchronized again, and they stay viewable and editable. Each page carries a quiet note saying so, with **Regenerate from the Master Narrative** (reverse generation) on request. That is an explicit `ai_generation` that adds a Revision after pre-operation capture, offers the same Keep my edits default, and creates no standing link.
- A later Master Narrative edit never touches either document.

## 7. Version history and recovery

### 7.1 Browsing

- Each story document has a **Versions** panel in its page. It lists the document's Revisions, newest first, linear and uncapped, each with its cause in plain words (edit, AI draft, AI rewrite, sync, import, restore, accepted, chosen from option) and any label. Opening, browsing and previewing create nothing.
- Selecting a version **previews it in place** in the document column with a quiet banner: "Previewing version N", **Restore this version**, **Back to current**. The preview is read-only.

### 7.2 Restore

- **Restore adds a new current version** with cause `restore`; history is never rewound and later versions are never destroyed. Unrevised working-copy changes are captured first so nothing is lost. Surviving text keeps its provenance.
- Restore is itself undoable by restoring the version before it.
- The quiet **Undo** after a direct AI apply is the same operation, one click away.

### 7.3 Bringing back one passage

Whole-version restore is too coarse when only one passage was lost. While previewing, any block that differs from the current text carries a quiet **Bring this passage back** action. It replaces only that block's content with the old version's content as one `restore` Revision, leaving everything else byte-identical, with the old provenance. If the block no longer exists, the action says so and offers to restore it as a new block after its former neighbour. Both forms are ordinary edits subject to lock rules.

## 8. Things that apply everywhere here

- **Flags are subtle (M1).** No banners, modals, dimming or alarm styling. Every dot has an accessible name and reason text.
- **Spend.** Text operations here are ordinarily trivial (under $0.05 each, ratified spend rules, R-spend); the price is shown on any control whose estimate is not trivial, and a confirm rule fires inline at that control, never as a centred modal (X2). Opening, browsing, previewing and sync detection spend nothing.
- **Locks.** If the document is locked, AI-applied results are held as Options and hand edits go through the edit-through confirmation; browsing and history never need an unlock.
- **Failures** are visible and quiet, with nothing applied, no Revision, a retry control, and the selection preserved (X7).
- **Cmd-K** reaches any phase, and within a document any beat or scene, from anywhere.

## 9. Hand-offs

| Receiver | Receives |
|---|---|
| **Persistence (#72), module architecture (#71)** | Option count is an Account setting. Notes are an owned, retire-only record anchored to block ids, outside document Revisions and outside AI context unless a request includes them (and the request records which). Option summary and attributes are stored with the Option, not in blocks. Right-sidebar visibility is per-creator UI state. |
| **AI responsibility map (#64)** | Option generation returns summary and attributes with each Option. "Update Treatment to match Beat Sheet" is a sync operation with protected-span handles; alternatives for a selection are Options on one Generation. |
| **Verification (#76)** | The invariants in STORY-DOCUMENTS §7, plus: pressing nothing never changes either document; restore adds a head; passage bring-back leaves every other block byte-identical; Notes never appear in a prompt unless "use my notes" was ticked, and then only the notes in scope; acceptance never requires reviewing AI additions; lock is on by default in the sheet. |
| **Scene hub (#60 redo)** | After acceptance the active scenes are the production list; the Master Narrative's excerpt text is the source of scene excerpts in the overview. |
| **Trust signals (#63)** | The whisper pattern and review-all tray cover drift and "AI added" tags; no new alert style. |

## 10. Decided here, stated plainly

- Default option count: **3, an account setting, no on-screen count chrome**.
- Acceptance flow: **one concise sheet, lock on by default, AI-addition review optional and never gating, disagreement ask only when the documents differ**.
- Version recovery: **in-page Versions panel, in-place preview, restore adds a new head, per-passage bring-back**.
- Left to spec: the option-count range, idle thresholds for revision capture, panel and sidebar sizing, notes anchoring offsets, and all visual design (V1 reference).
