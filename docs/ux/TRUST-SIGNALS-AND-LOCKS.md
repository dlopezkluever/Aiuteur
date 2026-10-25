# Aiuteur V2: Trust Signals, Lock Points and Friction

Resolution of Wayfinder ticket #63. It makes the semantics of [`LINEAGE-AND-STALENESS.md`](../domain/LINEAGE-AND-STALENESS.md) (#54, ADRs [0004](../adr/0004-possibly-out-of-date-is-derived-from-lineage.md) and [0005](../adr/0005-locks-are-server-enforced-domain-state.md)) legible. The creator's decisions are in [`CREATOR-RATIFICATION-RECORD.md`](../product/CREATOR-RATIFICATION-RECORD.md) §2 (#63) and M1; they are final. [`CREATOR-RATIFICATION-RECORD-2.md`](../product/CREATOR-RATIFICATION-RECORD-2.md) confirms them (§7: "#63 all hold") and adds the consequences cited below (D58.9, D60.5–6, D62.3, P1, P2, X2, X5, X7). This document is conceptual: it states what the creator sees and when, not components or layouts.

Constitutional anchors: §4.4, §13.2, §13.4, §13.6, §16 principles 4, 9, 10, 11, Appendix A Q26. **No `CONSTITUTION AMENDMENT REQUIRED`:** every settled item (quiet non-blocking markers with reasons, non-blocking always-unlockable locks, no forced unlock/re-lock, Master Narrative acceptance as a lock point, no preview/diff ceremony) is workable as designed.

## 1. Selected direction: Whisper, plus an on-demand review-all tray

A throwaway prototype compared three treatments on one scene (a narrative passage and four shots with frames, takes and AI-chosen tags). It lives on branch `prototype/63-trust-signals`, not on main.

| | **A. Whisper** (selected default) | **B. Ledger** (selected only as the on-demand tray) | **C. Trace** (skipped for V2) |
|---|---|---|---|
| Out-of-date marker | One small low-contrast dot beside the item; the reason and exits appear on tap | Faint edge accent and a short reason on every item | Item fades, dashed border, reason line |
| Change impact | Slim inline strip under the edited text | Side sheet listing dependants | Dependants glow on hover; weight glyph |
| Bulk | Quiet footer line when more than one item is affected | Permanent tray grouped by reason | Footer line |
| Verdict | Quietest; the decision stays where the work is | Best for bulk, but a permanent panel is dashboard-like | Fading reads as disabled, nearest to Q26's "large, annoying" visual |

**Rule.** Whisper is the default everywhere. The Ledger survives only as the **review-all tray**: a panel the creator opens on demand from the footer line, never shown by default. Trace is not built. **Flags never fade, dim, recolour or restyle the work itself, and never use banners, modals or alarm styling (M1).** Colour is never the only carrier: every dot has an accessible name and the reason text.

## 2. The signals

| Signal | What the creator sees | Notes |
|---|---|---|
| **Provenance** (§13.2, IMPORTANT) | A project-wide toggle, "Highlight AI vs mine", off by default. When on, text spans and items made by AI are tinted differently from creator-written or imported ones. | Span-level for text (#51). Reading the toggle changes nothing. Four classes: creator-written, creator-imported, AI-generated, AI-edited at the creator's request. **Accepted content reads clean** (Record 4 Y1): no persistent "AI added" or "AI generated" tags in prose anywhere; the toggle is how provenance is seen. |
| **AI-made choice** | A small dotted-underline tag inline ("AI chose: 35mm"); one click overrides it, after which it reads "yours". | No interruption. An on-demand project-wide list collects them (R7). **Record 4 Y2:** the inline mark shows until the creator accepts or approves the thing that contains it (plan accepted, identity approved, the world is set, Master Narrative accepted); after that it is visible only through the AI vs mine toggle and the list. It stays recorded and overridable. |
| **Possibly out of date** | A Whisper dot (§1). Tapping shows one sentence from the closed reason vocabulary (LINEAGE §3.1) and the exits: **Regenerate**, **It still fits** (reconcile), **Keep as is**. Restoring the upstream from its version history also clears the dot where content matches again (LINEAGE §2.4). | Never blocks. A *via* reason ("made from a shot that may be out of date") is a quieter variant of the same dot. Kept items show a muted "Kept despite: …" note only when inspected. |
| **Bulk reconcile** | When two or more items are marked, a single quiet footer line: "N items may be out of date · it all fits · keep all · regenerate all…". "Review all" opens the tray, grouped by reason, with the same actions per group or per item. | Bulk keep and bulk fits are one action group and reversible in one step. Bulk regenerate is a spend decision and shows its total estimate first (#68), as the inline ticket at the control, never a centred modal (Record 2 X2). |
| **Write-back vs deviation** | The moment a structured edit below the owning level diverges from narrative or identity truth, an inline note under the edited field: **Update the Master Narrative** (or **Update the entity**, for identity truth, Constitution §4.4 (7)) · **Keep for this shot only** · **Decide later**. | The write-back option previews its impact (the same summary locks use). Decide later leaves a quiet "differs from narrative" mark and a row in the tray's to-reconcile group. Free-text prompt overrides cannot be checked and show only a "prompt overridden" badge (R3). Shot-owned fields never raise the note: a shot's dialogue delivery (shown as an override with a quiet "Copy to narrative" action, Record 2 P1) and its location Direction (P2). Ad-hoc shots never raise it while ad-hoc (X5). |

All marker text is derived (ADR 0004); this document only decides presentation.

## 3. Lock semantics (as ratified)

A lock blocks edits to the locked thing (new Revisions, retiring, moving the chosen Slot) from **every** path, including AI-applied edits, which are held as Options. A locked edit proceeds only after a confirmation showing the server-computed downstream impact. A lock does **not** stop viewing, browsing, or generating new Attempts, never cascade-deletes, and never marks anything on unlock. **Unlock is always available** and is one click. Nothing requires an unlock/re-lock cycle to browse or move through completed work, and a no-op save is never an edit.

## 4. Lock points

| # | Point | Behaviour |
|---|---|---|
| 1 | **Master Narrative acceptance** | Locks by default, in the same action group as the Accept (accept and lock stay separately addressable, LINEAGE §6.4). In the one concise acceptance sheet this is a **Lock** checkbox **checked by default**, which the creator may untick (Record 2 D58.9; [`WRITING-EXPERIENCE.md`](WRITING-EXPERIENCE.md) §6). |
| 2 | **Entity identity approval** (Character, Location, Prop, Extra type) | Approval *offers* a lock for that entity. |
| 3 | **Visual Style / World Definition** | Offered when the creator says the world is set. |
| 4 | **A scene's shot plan** | Offered when frame generation for that scene begins (first Frame generation in Generate; the offer is independent of Accept plan, Record 5 SP8). |
| 5 | **Anything else** | Voluntary only; any scope can be locked by the creator, none by default. |

An offer is a single quiet inline choice (lock / not now), never repeated and never required. Not locking is a normal state, not a missing one.

**Shot-plan locks and AI drafting.** The automatic first draft runs only when a scene has **no** shot plan and its estimate is below $0.05 (Record 2 D60.5, Record 3 CR-2; otherwise the creator clicks **Draft plan · $x**), so it never meets the point-4 offer, which comes later at frame generation. Any AI result that would change a locked shot plan (a redraft, "Draft all" across scenes, or a first draft for a scene the creator voluntarily locked while empty) is **held as an Option**, never applied (§3; D60.6). None of these ever generates frames, images, worlds or takes (X8).

## 5. Friction scales with downstream work

The server computes the impact (chosen downstream work reached through lineage, grouped by kind, plus money already spent on it). The presentation tier follows from that impact:

| Tier | Downstream impact | What the creator sees |
|---|---|---|
| 0 | None | A normal edit. No step, no dialog. |
| 1 | Modest (few items, little spend, or text only) | A small inline warning with an "Edit anyway" action, naming what depends on the item. |
| 2 | Heavy (many items or substantial spend) | The affected items and money at risk are listed first; one click confirms. |

- **One confirmation covers the editing session on that scope.** Leaving the scope or unlocking ends the session; the server rejects a confirmation whose impact is stale.
- **Never** a typed phrase such as CONFIRM, never a warning loop, never a preview/diff ceremony.
- Tier boundaries are tuning values, not architecture. The prototype used under $10 / no dependants as illustrative numbers only; the spec chooses defaults, in line with #68's spend thresholds.
- Edit-through marks only what actually drifts (LINEAGE §6.3); the strip says so ("Nothing is deleted or regenerated; these will be marked possibly out of date").

## 6. Take selection is not a commitment point

Resolves Constitution §13.4 (3). **Choosing a Take is a reversible Slot choice**, creator-only (§13.6), recorded as history. It is not a commitment point and carries no lock. Changing the choice flags what was built from the previous pick as possibly out of date (R2), exactly like any other upstream change. In review, **swapping a take into the sequence is selecting it**; there is no separate preview state (Record 2 D62.3, [`CANDIDATE-REVIEW-AND-PLAYBACK.md`](CANDIDATE-REVIEW-AND-PLAYBACK.md) §1).

**Mark final** is an optional, per-shot, stronger *voluntary lock* on the chosen Take, for organization. It is a normal lock under §3: the creator can always return to a final Take and change it by unlocking (or by edit-through, §5), and nothing cascades. Changing the pick on a final shot, like hand-editing a locked shot plan, goes through edit-through; no surface forces "unlock first". One lock glyph and one unlock gesture are used everywhere (Record 4 Y5). Export and assembly quietly list shots with no chosen Take; the absence blocks nothing.

## 7. Hand-offs

| Ticket | Receives |
|---|---|
| **Candidate review and playback** (#62) | The take model above: selection reversible, Mark final voluntary; where the Whisper dot, "arrived after cancel" labels and AI-made tags sit on candidates; the review-all tray as the bulk surface. |
| **Shot model** (#55), **Entities and Looks** (#53), **Story documents** (#51) | The structured paths that raise the write-back note; the narrative-bearing slices; span-level provenance for the toggle. |
| **Module architecture** (#71, resolved in [`MODULE-ARCHITECTURE.md`](../architecture/MODULE-ARCHITECTURE.md)) / **Persistence** (#72) | The impact summary and edit-session confirmation must be server operations (ADR 0005); the confirmation token carries the impact version. |
| **Spend and cost** (#68) | Money-at-risk reads Generation cost; tier 2 and bulk regenerate use the same estimate display. |
| **Scene and shot workspace redo** (#60, Record 2 D60) | The shot-plan lock offer at frame generation (§4 point 4) and the held-as-Option rule for AI results on a locked plan (§4). |
| **Downstream UX tickets** | Flags are subtle (M1); failures are visible and quiet, a muted mark with "Retry · $x" (Record 2 X7); no typed confirmation anywhere; any new surface that shows state uses the Whisper pattern first. |
