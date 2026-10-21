# Aiuteur V2: Object Classes, Lineage, Staleness, Write-back, Locks, Duplication

Resolution of Wayfinder ticket #54. It builds on [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md) (#50: Revision, Attempt, Slot, Generation, Job, one owner per truth, retire not delete) and [`GLOSSARY.md`](../../GLOSSARY.md). The two hard-to-reverse choices are recorded in [ADR 0004](../adr/0004-possibly-out-of-date-is-derived-from-lineage.md) and [ADR 0005](../adr/0005-locks-are-server-enforced-domain-state.md). The document is conceptual: it names what must be recorded and what must hold, never tables, fields or screens.

Constitutional anchors: §4.4 (all eight clauses), §6.5, §9.2, §10.3, §13.2–13.6, §16 principles 3, 4, 9, 10, 11, and §17.5. No constitutional requirement was found unworkable; **no `CONSTITUTION AMENDMENT REQUIRED` is raised.** One honest limit is stated in §5.5 (free-text overrides), and it is a design limit, not an amendment.

## 0. The model in one paragraph

Everything the creator owns changes only by **appending**: a Revision to an editable object, an Attempt to a Slot, or a **Decision** (choose, approve, accept, lock, keep, deviate). Nothing is overwritten, so any earlier state can be restored by appending again. Every AI request records, at dispatch, the exact input Revisions it read (**captured inputs**). Whether a piece of work is **possibly out of date** is never stored: it is *derived* by comparing what the work captured with what is current now, minus the creator's recorded **Keep / Reconcile** decisions. Because the marker is a pure function of recorded history, reading cannot write it, restoring clears it correctly, duplicating reproduces it, and no write can leave it half-applied.

## 1. Object classes

Seven classes. The four in #50 §2 are refined; derived representations, selection/commitment state and lock state are added.

| # | Class | Mutability | Revision | Provenance | Restore | Retire | Members |
|---|---|---|---|---|---|---|---|
| 1 | **Editable creative truth** | Changes only by appending a Revision; history is append-only | Yes: every change is a Revision, with a pointer to its parent. A no-op save adds nothing. A Revision that any record captured or that was AI-made is never compacted or merged. | On each Revision: creator-written, creator-imported, AI-generated, AI-edited at request; plus the Generation if any, an action-group id, and `restored-from` / `written-back-from` when applicable | Append a new Revision copying an earlier one. Later Revisions stay. | Yes (a decision, reversible) | Project settings, Established Fact, Treatment, Beat Sheet, Master Narrative, Entity canonical identity (description), Look, Location coverage definition, Visual Style, Writing Style, Voice definition, Shot, Dialogue line, Composition reference attachment, Presence overrides, prompt override, Source Material / Reference Media **descriptor** (role, notes) |
| 2 | **Creator-supplied source** | Content immutable; only its descriptor (class 1) changes | None on content | Creator-imported (or creator-recorded) | Descriptor restored like class 1; content cannot change | Yes | Source Material content, Reference Media content, Performance (recording) |
| 3 | **Generated or uploaded artifact (Attempt)** | Immutable forever; media is immutable and shareable | None. "Editing" an artifact makes a new Attempt that names its source | AI-generated (with Generation) or creator-uploaded; edits carry their own | Nothing to restore: choose it again (class 4) | A rejected or unused Attempt stays reachable; it is never deleted | Frame, Take, entity image, coverage View, Option, transformed Performance |
| 4 | **Decision** (append-only event; current state = latest event) | Never edited or removed; superseded by a later event | n/a | Always creator, except the recorded AI-made choice defaults | Append the reversing event | n/a | **Slot choice** (selected take, approved frame, active image, active View, chosen Option, chosen Performance), Approve, Accept, Phase disposition, Retire / un-retire, **Acknowledgement** (Keep / Reconcile), Deviation decision, Write-back decision, Lock / unlock, Meaningful-spend initiation |
| 5 | **Record** (immutable statement of what happened) | Immutable once it ends; Jobs are operational and prunable | n/a | n/a | n/a | n/a | Generation (with captured inputs), Job, AI-made choice, Deliberate local deviation (its resolution is a class 4 event), Interview turn, Export package manifest, duplicated-from map |
| 6 | **Derived or compiled representation** | Never edited; rebuilt on demand; may be cached but the cache is never authority | None | Inherits "derived from X Revision" | Rebuild | n/a | Screenplay export, compiled (not yet sent) prompts, progress and readiness views, **the set of possibly-out-of-date markers**, dependants-of lists, impact summaries, conflict/divergence lists, lock-impact counts, search indexes |
| 7 | **Commitment and lock state** | A Decision stream (class 4) read as state: *Accepted* (Master Narrative), *Locked* (a scope), *Spend initiated* | n/a | Always creator | Unlock / un-accept is an appended event; always available | n/a | Master Narrative acceptance, locks on any lockable scope |

Rules that apply to every class:

1. **Server-side truth.** Classes 1–5 and 7 live on the server. The browser holds only a view and unsaved typing, never state the product relies on (V1: `stage_locks` and an unlock dialog that lived in the UI, legacy 10 §1.5, B4, B10).
2. **Reading never writes.** No class is created, appended or modified by opening, browsing, refreshing, scrolling past, or loading a screen. Class 6 is computed; "last viewed" is non-creative UI state and is never versioned (V1 autosave on open, §17.5).
3. **A pointer is not a flag in the thing pointed at.** "Selected" lives on the Slot (class 4), not inside the Take. Switching changes nothing about any Attempt, and the switch itself is history.
4. **Markers are not owned.** No object has an "outdated" column. Only class 6 produces the marker.
5. **Concurrency.** Appending a Revision names the Revision it was based on. If that is no longer the latest (a background AI result, another tab), the write is not applied over it: the newer content stays and the loser is kept as a recoverable Option or draft Revision on a side line, never discarded (V1 debounced save overwriting a lock, B23).
6. **Compaction.** A creator's in-progress typing is a buffer, not a Revision. How often a buffer commits to a Revision is #72's, but a committed Revision may never be rewritten.

## 2. Lineage

### 2.1 What lineage is

Lineage is the set of recorded facts "this was made from those". It has exactly two sources, both immutable records:

```diagram
 ┌───────────────────────────────┐          ┌─────────────────────────────────┐
 │ Generation (class 5)          │          │ Basis (on an editable object)   │
 │  captured inputs, at dispatch │          │  the upstream slices it was     │
 │  ──► produces Attempt /       │          │  drafted or last reconciled     │
 │      Option / AI-made Revision│          │  against (e.g. Shot ◄ narrative │
 └───────────────┬───────────────┘          │  passage)                       │
                 │                          └───────────────┬─────────────────┘
                 ▼                                          ▼
          edges:  dependant ──captured──► (unit, Revision, content fingerprint)
```

- A **captured input** is `(unit, Revision, content fingerprint)`. A **unit** is the smallest owned slice that the consumer actually read (the Shot's action slice, a Look, an entity's description slice versus its active image, the narrative passage the shot is anchored to, the Visual Style). The owning module names the slices (#53, #55, #51). Comparison is by **content fingerprint**, not Revision id: restoring an earlier Revision makes the content equal again and the drift disappears. The Revision id is kept for the human-readable "what changed".
- A **Basis** is the captured-inputs record for an *editable* object drafted from upstream truth (a Shot from its anchored passage, a derived Presence). It is stamped when the object is drafted by AI and re-stamped only when the creator reconciles. A creator's own edit of the Shot does **not** re-stamp it; editing is not reconciling.
- Uploaded Attempts, Supplied sources and creator-written Revisions with no AI draft have no inputs and can never drift. Creator-typed work has no upstream to be out of date from.
- The dependency graph is acyclic by construction: a record can capture only what existed when it was made.
- Lineage edges are only ever added. They survive retiring, restoring, and duplicating (remapped, §7).

### 2.2 Derived versus stored markers: designed twice

| Criterion | **A. Derived from lineage + acknowledgements** (chosen) | **B. Stored markers** (flag or row written when upstream changes) |
|---|---|---|
| Correctness under restore/undo | Automatic: content equality clears it | Needs an inverse fan-out on every restore; V1's flags stuck forever ("outdated with no exit", legacy 10 §9) |
| Reading never writes | Pure query; trivially true | A repair or lazy-mark on read is tempting (V1 recomputed on GET, R9) |
| Atomicity | One append (the upstream Revision); no fan-out to be partial (V1 B22 non-transactional cascade) | Upstream edit + N marker writes must be one transaction or the picture is wrong |
| Reasons | Exact: the first differing captured input names kind, subject, old and new Revision | Reason must be stored and kept consistent with later edits; the second change overwrites the first reason |
| Duplicate project | Remap ids; markers reproduce by themselves | Copy and remap the flags, and hope they agree with the content |
| Bulk keep / reconcile | A set of Acknowledgements in one action group; undo by appending | Mass flag writes; undo is another mass write |
| Export/records | Immutable records never need a flag | Must be excluded from marker writes by convention |
| Cost | A query joins the dependant's captured inputs to current content: needs an inverse index from unit to dependants. A rebuildable cache is allowed (class 6) | Cheap read, expensive and risky write |
| Noise | A change marks every consumer of that slice; mitigated by slicing and content fingerprints, never by a judgement call | Same, plus mismatches |
| Failure mode | Slow to answer on big projects (150–250 shots); fixable with a cache without changing meaning | Silently wrong (the V1 failure mode) |

**Decision: A.** Marker state is a function `markers = drift(captured, current) − acknowledgements`; only the creator's Acknowledgements are stored. This is ADR 0004. A cache or materialized view of markers is legal as an optimisation if it is rebuildable and every write path updates it in the same transaction as the append that caused it, but it is never the source of truth (#71/#72 decide whether it is needed).

### 2.3 The marker, precisely

A chosen piece of work **W** is *possibly out of date* for input **i** iff:

1. W has a captured input or Basis entry for unit *u*, and
2. the current content fingerprint of *u* differs from the captured one, or *u* has been retired (or its Slot choice moved), and
3. no Acknowledgement by the creator covers *(W, u, current fingerprint)*, and
4. W is **chosen/current** in its Slot, or is an editable object (a marker is not shown on unchosen Attempts; their drift is still derivable on request).

Consequences:

- **Direct reasons** come from (2). A **via reason** (`upstream-pending`) is added when a captured input is itself a marked chosen piece of work that the creator has neither kept nor reconciled, so "the shot is possibly out of date, so the frames made from it are too" is visible but quiet, and clears when the shot is resolved.
- **Never marked:** Records (Generation, Job, Export package: an export is a dated snapshot, and a view "export differs from current selections" is derivable but is not a marker), the Treatment and Beat Sheet once the Master Narrative is accepted (they are development history and no longer promised in sync; regeneration is the creator's explicit action, §4.4 clause 5), and anything driven by a model-default change (model choice is a recorded fact on the Generation, not content).
- **Marker is quiet and non-blocking by definition**: it has no authority to prevent any operation, and nothing downstream reads the marker to refuse work (V1: stages blocked by status, legacy 10).
- **Subtle-flag rule (creator ratification M1).** Flags must be subtle: quiet, low-contrast marks near the affected work. A marker is never a banner, a modal, an alarm colour or a count that demands attention. The review surface for all markers is on demand (the "review all" tray from the Ledger), not pushed at the creator. This binds every surface that renders a marker, a "kept despite change" form, or a to-reconcile entry (§5.2). Locks and heavy-impact confirmations (§6) are a different mechanism and are not governed by this rule.
- **Late results arrive already flagged.** A result adopted after a timeout (§3.4) is compared against the current inputs at the moment it attaches, exactly like any other work. Nothing special is stored.

### 2.4 Clearing and keeping (the exits)

Every marked item has at least three exits and no dead end (V1: outdated states with no exit).

| Creator choice | What is written | Marker afterward |
|---|---|---|
| **Regenerate** (new Attempt, or an AI redraft of an editable object) | A new Generation capturing the *current* inputs; its output is added, nothing replaced. Meaningful spend follows the spend rule (#68). | Gone for the new work. The older Attempt is untouched and no longer chosen unless the creator chooses it. |
| **Reconcile** | The creator edits the dependant to fit (a Shot revised to the new narrative) and says "this fits now", or uses an AI "update from narrative" redraft. Records an Acknowledgement `reconciled` at the current fingerprint (the redraft stamps the Basis itself). | Gone until the unit changes again |
| **Keep** | Acknowledgement `kept` at the current fingerprint | Gone, but the item is still marked in a quiet "kept despite change" form when inspected; a *later* change of the unit raises it again |
| **Restore upstream** | A new Revision of the upstream copying the older content | Gone automatically for everything whose captured fingerprint matches again; others drift as usual |
| **Bulk** | One Acknowledgement per (item, unit) in a single action group, selected by filter (everything affected by this change; a Scene; a reason). Bulk regenerate is a spend decision (#68) | As above; the whole group can be reversed by appending |

Acknowledgements are scoped to the exact content they were given against, never to "the unit" forever.

## 3. Staleness: per change kind

The reason is a structured value `(reason code, subject, change summary, via?)`. The UI renders it as a sentence ("Marcus's description changed after this frame was made"); the vocabulary below is closed and extensible only by a decision.

### 3.1 Reason vocabulary

| Code | Meaning | Subject names |
|---|---|---|
| `narrative-changed` | The Master Narrative passage this work was made from changed | Scene, passage |
| `fact-changed` | An Established Fact in force when it was made changed or was withdrawn | the fact |
| `identity-changed` | A Character, Location, Prop or Extra type's description or active image changed | entity, slice (description / image) |
| `look-changed` | A Look's content changed, or the Look in the Presence changed | entity, Look |
| `coverage-changed` | The active View a shot used, or the coverage definition, changed | Location, View |
| `style-changed` | Visual Style changed (§6.5) | the Visual Style |
| `writing-style-changed` | Writing Style changed (text work only) | the Writing Style |
| `shot-changed` | The Shot slice a Frame or Take was made from changed (action, camera, duration, dialogue, continuity context) | slice names |
| `frame-changed` | The approved Frame, or a source Frame used as a video or edit input, differs | Frame, role |
| `prompt-override-changed` | The shot-level prompt or reference override differs from the one sent | override |
| `performance-changed` | The Performance followed, or the Dialogue line it was linked to, changed | line, Performance |
| `settings-changed` | A Project settings value that the work read (aspect, format, rating, runtime) changed | the setting |
| `input-retired` | A captured input has been retired (or restored from retirement) | the object |
| `upstream-pending` | (via) A captured input is itself possibly out of date and unresolved | the intermediate item |
| `differs-from-narrative` / `differs-from-identity` | (divergence, §5) A downstream narrative- or identity-bearing field differs from its upstream truth and the creator has not yet chosen write-back or deviation | field, upstream anchor |
| `deviation-upstream-changed` | (§5) A recorded deviation's upstream anchor has changed since the deviation was declared | deviation |

Not reasons: "model default changed", "locked/unlocked", "restored" (restore is just a content change), "time passed", "viewed".

### 3.2 Per-change-kind table

"Captured by" says which lineage edge produces the drift.

| Upstream change | Marks (chosen/current work that captured it) | Reason | What is not touched | Exits |
|---|---|---|---|---|
| **Narrative**: a passage of the Master Narrative gets a Revision | Shots whose Basis includes that passage; Presences derived from it; Looks/Dialogue lines anchored to it; Frames/Takes that captured the passage text or a Shot slice drafted from it only through `upstream-pending` | `narrative-changed` (direct on the Shot); `upstream-pending` on Frames/Takes | The Shot's text, Frames, Takes, Scenes, entities | Regenerate or redraft the Shot from the new passage; reconcile; keep; restore the narrative |
| **Established Fact** changes or is withdrawn | Generations that listed the fact (text and image work) | `fact-changed` | Everything else | Regenerate, keep |
| **Entity** canonical description or active image changes | Frames, Takes, Views, Looks that captured that slice; any text work that captured the description | `identity-changed` | Attempts of other entities; unchosen Attempts; the entity's earlier Revisions | Regenerate with the entity, keep, restore the Revision; write-back/deviation if the change originated downstream (§5) |
| **Look** changes, or a different Look is assigned in a Presence | Shots/Frames/Takes that captured that Look in that Presence | `look-changed` | Other Looks of the entity; the base identity | As above |
| **Location coverage / active View** changes | Frames and Takes that used the View or the direction | `coverage-changed` | Frames of other directions | As above |
| **Visual Style** changes (§6.5) | All chosen Frames, entity images, Views and Takes whose Generation captured the style; none deleted or cleared (V1's `clear-all`, R6, is gone) | `style-changed` | Identity (identity outranks style); Takes' media | Bulk regenerate (spend), keep, restore the style |
| **Writing Style** changes | Chosen AI-written text Revisions that captured it | `writing-style-changed` | Creator-written text | Redraft, keep |
| **Shot** changes (action, camera, duration, dialogue, continuity, retired/reordered) | Frames/Takes that captured the changed slice; a changed order changes only continuity context if it was captured | `shot-changed` (+ slice names) | Slices not read (a duration edit does not mark a Frame that never read duration) | Regenerate, keep, restore the Shot Revision |
| **Frame**: a different Frame becomes approved for a role, or the source Frame of a reuse/edit | Takes that used the previously approved Frame as input; Frames derived from it | `frame-changed` | The prior Frame (it is an immutable Attempt) | Regenerate the Take, keep |
| **Prompt override** is edited, added or removed | The Take/Frame made with the earlier override | `prompt-override-changed` | The Shot | Regenerate, keep |
| **Performance**: a different Performance is chosen, or the linked Dialogue line changes | Takes that followed the old Performance or old line; transformed Performances derived from it | `performance-changed` | The Performance recordings (immutable) | Regenerate/redo transform, keep |
| **Project settings** the work read | Work that captured the setting (e.g. a Frame generated for 16:9 after the aspect changes) | `settings-changed` | Work that did not read it | Regenerate, keep |
| **Retire / un-retire** of an input | Work that captured it | `input-retired` | The retired object and all its attachments | Keep, regenerate with a replacement, un-retire |
| **Scene** retired, reordered, split, merged | Only what captured scene structure; nothing is deleted (V1 B8 hard delete) | `input-retired` or `narrative-changed` as applicable | The Scene's Shots, Frames, Takes stay attached and reachable | Reconcile, keep; mapping and re-homing rules in [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md) |
| **Lock / unlock, Accept** | Nothing: locking and unlocking change no content (V1's unlock cascade marked everything, R1–R3) | none | n/a | n/a |

### 3.2.1 Treatment and Beat Sheet disagreement (R10)

Treatment and Beat Sheet are related by explicit Sync only (creator ratification R10, ticket #51). Lineage records no automatic sync edge between them and raises no marker for their drift. Before the Master Narrative is drafted or accepted, if the two documents disagree, Aiuteur shows the disagreement and asks which to follow; it never guesses, and the choice is a recorded creator Decision. That disagreement check is a derived comparison like a marker (it writes nothing by being shown) but it is not a staleness marker and does not use the reason vocabulary. After acceptance neither document is synchronized again (development history, §2.3 "Never marked"). The sync mechanics are #51's.

### 3.3 Requirement on every Generation (to #65)

A Generation must record, **at dispatch, before any provider call**, so that a failed or cancelled Generation is still inspectable and a result that lands after upstream changed shows the drift immediately:

1. **Target**: the Slot (or object) the output is for, and the kind of output (Attempt, Option, AI-made Revision).
2. **Captured inputs**: for every editable unit it read, `(unit, Revision, content fingerprint)`: the Shot slices used (including dialogue lines and continuity context), the anchored narrative passage if its text was read, each Presence's entity identity slice and Look, the location and the View/direction, Visual Style (and its reference images), Writing Style, the set of Established Facts in force, the Project settings read, Composition references, the prompt override, adjacent shot/scene context that was read, upstream document Revisions (for text generation: Treatment, Beat Sheet, Master Narrative, Source Material, Interview turns).
3. **Captured Attempts and media**: the id of every Attempt/Media used as an input (active entity image, source Frame, previous Take frame, Performance), with which Slot choice put it there, and reference order.
4. **Resolved payload as sent**: the exact compiled prompt(s), negative prompts, references and order, parameters (duration, aspect, seed, count), because compilation is derived and must be reproducible and inspectable without recompiling today's inputs (§13.5).
5. **Model**: provider-neutral model identifier plus the capability profile it was dispatched under; template/prompt-template identity and version as history (#50).
6. **Initiator and authority**: creator action id, action group, the spend estimate shown and the actual cost, provenance class of the output.
7. **Outcome**: outputs (ids), failure, and the Job runs that executed it.

It must also (a) never re-read inputs at completion, (b) not capture what it did not read, (c) be able to be **re-run with the same captured inputs** because all Revisions are retained, and (d) be remappable on project duplication (§7).

### 3.4 Adoption of a late result after timeout

The domain model (§5) and the job lifecycle (#67) allow one exception to "a Generation is immutable once ended": a Generation whose Job `timed_out` and whose provider operation later **succeeds** is *adopted*. The request never changes; only its outcome may gain outputs, once. For lineage this means:

- The adopted outputs attach as new **unselected Attempts** under the Generation's recorded target Slot. Adoption never changes a Slot choice and never replaces the chosen Attempt, so it can never mark anything on its own.
- The Generation's **captured inputs were fixed at dispatch** (§3.3 clause 2) and are not re-read at adoption. The new Attempts therefore carry the original fingerprints. If any captured unit has changed since dispatch, the adopted Attempt **arrives already flagged** possibly out of date, with the usual reason (the drift is derived, not stored; nothing is written to flag it). If the creator later chooses it, the marker then shows under the rule in §2.3 clause 4.
- A late result after **cancel** (creator ratification M2) follows the same lineage rule: it attaches unselected, labelled "arrived after cancel", with the quiet notice owned by #67/#68.
- Notice and labelling follow the subtle-flag rule (§2.3). Adoption is a Record amendment, not a Decision, and does not clear or create an Acknowledgement.


## 4. State of a piece of work

```diagram
                    upstream slice changes
   ┌─────────┐  ─────────────────────────────►  ┌────────────────────────┐
   │ Current │                                  │ Possibly out of date   │
   │ (no     │  ◄──── regenerate / reconcile ── │ (direct reason(s),     │
   │ marker) │  ◄──── keep (ack @ fingerprint)  │  via reason optional)  │
   │         │  ◄──── upstream restored         │  quiet, never blocks   │
   └────┬────┘                                  └──────────┬─────────────┘
        ▲        later change to same unit                 │
        └────── Kept (muted note) ◄────── keep ────────────┘
                 ──── upstream changes again ───► back to "Possibly out of date"
```

All arrows are caused by appends (a Revision, an Acknowledgement, a Generation). The boxes are never stored.

## 5. Write-back and deliberate local deviation

### 5.1 What counts

A change **made below the owning level** to something that is narrative truth (a line, an action, who is present or where) or identity truth (what an entity or Look is or looks like). "Below" means at Shot, Frame, Take, Dialogue line, Performance, or shot-level prompt-override level. Fields that the Shot owns outright (camera, framing, duration, composition, continuity context) are not narrative truth and never raise the choice.

### 5.2 The three states of a narrative- or identity-bearing field

| State | Meaning | Marker |
|---|---|---|
| **Aligned** | Content equals its Basis (or the upstream) | none |
| **Divergent, undecided** | Content differs from the Basis and neither outcome has been chosen | quiet `differs-from-narrative` / `differs-from-identity`; non-blocking |
| **Deviation** | The creator recorded that it differs on purpose | none (the deviation record is the explanation) |

"Divergent, undecided" is a derived interval, not a third outcome: the two outcomes remain **write-back** and **deviation**. The interval exists because the choice must never block work (§4.4, principle 9) and the difference must never be silent (§4.4 clauses 6–7). It is a queue the creator can clear item by item or in bulk. The system raises the choice inline at the moment of the edit ("Update the Master Narrative / Keep as a deviation for this shot / Decide later"); "Decide later" simply leaves the interval open.

```diagram
 shot-level edit of a narrative/identity-bearing field
                │  (structured path: line text, action, Presence/Look, location)
                ▼
        differs from Basis? ──no──► nothing (also no Revision for a no-op save)
                │yes
                ▼
        Divergent, undecided  ◄──────────────── later edits stay here
         │            │              │
   write-back     deviation     decide later
         │            │              │
         ▼            ▼              ▼
  new Revision   Deviation        marker stays,
  of upstream    record (scoped   quiet; appears in the
  (+ Basis       to field(s) vs   "to reconcile" list
  re-stamp)      anchor)
         │            │
         └─ others who captured the upstream slice drift (§3), shown in the impact
            summary before the write-back is confirmed
```

### 5.3 Write-back

- A write-back is an ordinary **new Revision of the upstream object** (a Master Narrative passage, an entity's canonical identity, a Look) with provenance creator-written, or "AI-edited at the creator's request" if the creator asked the AI to phrase the upstream text; it records `written-back-from` (the downstream Revision or Attempt). It is never automatic and never a side effect of saving downstream work (clause 3).
- The originating Shot's Basis is re-stamped (it is aligned by construction).
- **Other work that captured the upstream slice drifts** and shows `narrative-changed` / `identity-changed`. The confirm step shows that impact before the write (the same impact summary used by locks, §6), so a write-back is never a surprise cascade.
- If the upstream object is locked, the write is an edit-through with the lock's impact confirmation (§6). Write-back is not exempt from locks.
- A write-back is reversible by restoring the earlier upstream Revision.

### 5.4 Deviation

- A Deviation record names: the downstream object and field group, the upstream anchor and its Revision at the time, the downstream Revision judged, an optional reason, the creator decision and action group.
- A Deviation covers *the relation between the field(s) and the anchor*, so further edits to the same field stay deviant; a different narrative-bearing field that now diverges is a new undecided divergence (this avoids nagging on every keystroke).
- **Resolution:** the Deviation ends when the creator realigns (restores the field to the Basis content, or writes it back) or declares it ended. The record remains as history.
- **Upstream moves later:** if the anchor's content changes after the deviation was declared, a quiet `deviation-upstream-changed` appears, because the justification may no longer hold. It has the same exits as any marker (keep the deviation, realign, write back).
- For identity truth, a deviation ("in this shot Marcus has a scar") may also be resolved by creating a Look; that routing is #53's.

### 5.5 Frames, takes, performances and the free-text limit

- **Structured paths** (a Dialogue line edit, a Shot action field, a different Presence/Look, a different Location View, a chosen Performance that differs from the line) are detected by comparison with the Basis and always raise the choice.
- **Frame or Take edits that change identity** (an in-app edit that recolours a jacket, an approved Frame showing a different costume): the Frame is an Attempt; the edit produces a new Attempt whose Generation records its source. The system offers "Make this part of Marcus (new Revision or new Look) / Keep for this shot only (deviation) / Decide later" when the creator selects or approves such a Frame through the edit tools that declare identity intent, and the creator can declare it at any time from the frame.
- **Shot-level prompt and reference overrides** (§13.5) are first-class, visible, recorded on the Generation, and shot-scoped: they are not claimed to be truth. When the override edit is made through the structured identity or narrative paths, §5.2 applies; when it is free text, **Aiuteur cannot know semantically whether the text contradicts the narrative or an identity**. The guarantee is therefore: nothing is silently divergent *in structured truth*, and every free-text divergence is a visible, recorded override (marker `prompt-override-changed` on dependants; "overridden" badge on the Shot). An optional cheap AI check that suggests "this looks like an identity change" is a possible assist (#64), never a prerequisite and never an automatic write.
- **Performances** that depart from the line (an ad-lib): the Performance is Supplied; the Dialogue line is the owner of the text. The choice is the same: write the line back (new Revision of the Master Narrative passage, with the Basis re-stamped) or record a deviation on the Dialogue line.

## 6. Commitment and lock domain semantics

### 6.1 Definitions

- **Commitment point** (Decision, class 4): *Accept* the Master Narrative; *Initiate meaningful spend* (attached to the Generation(s) and the estimate shown); and, if #63 decides so, *Select a take*. A commitment is a recorded creator action; it is not a lock and not a marker source.
- **Lock** (class 7): protection on a **scope** (an editable object, a Slot, or a subtree such as a Scene's shot list). It is a Decision stream: `lock` / `unlock` events with creator, time, optional reason, and the Revision/choice it protected. Lock state is the latest event. Locking does not approve, accept or select anything. Which scopes receive locks, and the default of locking when accepting, is #63's; the domain supports any scope without change.

### 6.2 What a lock protects

A lock on a scope guards *the appending of Revisions to it, retiring it, and moving a Slot choice inside it* ("editing the thing"). It does not guard reading, generating **new Attempts**, or work downstream of it (those are not edits of the locked truth).

### 6.3 Enforcement: one write gate

All writes to editable objects and Slot choices pass a single domain-level gate that checks lock state. The gate is the operation layer, not a route or a screen, so it holds for the UI, bulk actions, AI-applied edits, imports, restores, write-backs, duplicate-then-edit flows, and any future automation (Constitution: "a lock the interface shows must hold everywhere"; V1: DB trigger only changed status; no route checked `shot_list_locked_at`, legacy 10 B10). Consequences:

- **The impact is computed server-side** from lineage: the chosen work whose captured inputs include the unit being edited (transitively), grouped by kind, with the money at risk (actual cost of the Generations behind them). The client cannot be the only party computing "what depends on this" (V1 B4: the unlock-impact dialog never opened).
- **Friction is proportional** to that impact: zero dependants means the edit proceeds with no step; any dependants means the write needs an **edit-through confirmation** that carries the impact summary it was shown. The server refuses a confirmation whose impact version is stale, so what the creator saw is what happened. The presentation, thresholds and when one confirmation covers a whole editing session are #63's; the domain provides the impact summary and the confirmed edit-through.
- **Non-blocking, always unlockable:** *unlock* is always available and only appends an event; *edit-through* applies one edit (or one action group) without unlocking. Neither cascades: unlocking marks nothing (the V1 cascade, R1–R3, is deliberately gone), and edit-through marks only what actually drifts.
- **No bureaucracy:** a no-op save is not a write; browsing and moving through locked work never requires unlock; a lock is never required to be re-applied.
- **Background completion:** an AI result that would append a Revision to a locked scope is not applied; it is held as an Option (recoverable). Jobs that only add Attempts are not gated.
- **Backend robustness:** the gate and lock history are part of the same transaction as the write; a write that cannot take effect must fail loudly, never silently succeed (V1 B1–B3).
- **Lock state is copied by duplication** and is not reset by restore or by an unlock/lock round trip.

### 6.4 Accept versus lock

Accepting the Master Narrative is one Decision. By default the accept action also locks it (a second event in the same action group), which makes the later-edit friction scale with the work already produced. Accept and Lock remain separately addressable so unlocking never "un-accepts" and re-accepting never needs re-locking.

## 7. Restore and project duplication

### 7.1 Restore

| Restoring… | How | Never |
|---|---|---|
| An editable object to an earlier Revision | Append a Revision copying the older content (`restored-from`) | Delete or reorder Revisions |
| A Slot to an earlier choice | Append a Slot-choice Decision pointing at that Attempt | Mutate any Attempt |
| A retired object | Append an un-retire Decision | Re-create it with a new identity |
| A whole creator action (a bulk keep, an AI rewrite, a write-back) | Reverse every event in its **action group** by appending reversing Revisions/Decisions, one action | Touch Attempts or Generations |
| A locked scope | Same as any edit: through the write gate | Bypass the lock |

Markers need no restore logic: they re-derive. An earlier project state can be viewed read-only by evaluating the append-only history at a time (a derivable read; not designed here, LATER).

### 7.2 Duplicate project

A duplicate is a **new project, born complete and independent**. The original is only read (reading never writes), and the duplicate appears whole or not at all.

| Aspect | Rule |
|---|---|
| Identity | Every object, Revision, Attempt, Decision and Generation gets a **new id**; a `duplicated-from` map (old id → new id, plus source project id) is kept as informational history. No shared mutable state, no live link. |
| Content | All Revisions (full history), all Attempts (including unchosen and rejected), Source Material, Reference Media, Performances, retired objects (still retired), Interview turns, Established Facts. |
| Media | Immutable blobs shared by reference; purge semantics (when the last reference goes) are #72's. Provider-held resources (e.g. a cloned voice) need a copy-or-share rule from #69/#72. |
| Lineage | Captured inputs, Basis stamps, Acknowledgements and Deviation records are remapped to the copied ids, so every marker, deviation and "kept" status reproduces exactly. Because markers are derived, nothing needs repair. |
| Decisions | Slot choices, approvals, Accept, locks, Phase dispositions are copied as events with the same state; always unlockable in the copy. |
| Generations | Copied as immutable records with provenance intact. Cost is flagged **inherited** and excluded from the new project's new-spend total (#68). Generations still in flight are **not** copied and their results land only in the original; Jobs are not copied. |
| Export packages | Not copied (derived deliverables; the duplicate can build its own). |
| Provenance | Preserved; a copy is not "creator-imported". |
| Label | Title gets a distinguishing label; the label is not identity. |
| Partial duplication (a scene, an entity) | LATER (library copy-on-use, §6.7); the same rules apply with a smaller closure. |

## 8. How the model answers V1's failures

| V1 failure (legacy 10 / Constitution §17.5) | Answer here |
|---|---|
| Invalidation marked lock records, not artifacts (§5, R1–R3) | The marker is derived from captured inputs on the work itself; locks never mark anything |
| Deletion on structural edits (B8, §5.3 cascades) | Retire, never delete; Attempts immutable; no foreign key deletes creative work |
| Content edits ignored (R5: Stage 2/3 saves invalidate nothing) | Every content change is a Revision whose slice drift is derived; nothing depends on someone remembering to call "invalidate" |
| Writes that could not take effect (B1–B3) | Markers are not writes; the write gate is atomic and fails loudly |
| "Outdated" with no exit (B7, R10) | Every marker has Regenerate / Reconcile / Keep / Restore exits |
| Unlock dialog never opened, cascade ran silently (B4) | Impact computed and enforced server-side; unlock cascades nothing |
| UI-only and trigger-only locks (B10) | One domain write gate for every path |
| Autosave on open rewrote locked content (§17.5, B23) | Reading never writes; compare-and-append on Revisions; no-op saves add nothing |
| Non-transactional cascades (B22) | No cascade exists |

## 9. Hand-offs

| Ticket | Receives |
|---|---|
| **Generation package** (#65) | §3.3 in full: what every Generation must capture at dispatch (units and slices, Revision + fingerprint, Attempts/media, resolved payload as sent, model and template identity, initiator, cost, outcome); the "captured at dispatch, not at completion" and "re-run from captured inputs" rules. #65 owns the package's shape and how references and prompts compile. |
| **Module architecture** (#71) | Single owner for lineage and derivation (the lineage module owns captured-input edges, Basis, Acknowledgements, marker derivation and impact summaries); the write gate as the only mutation path for editable objects and Slot choices, enforcing locks, compare-and-append, and provenance; the rule that no other module stores a marker or an "outdated" status; Attempts and Revisions are append-only from every module's view; reading never writes at the module boundary. |
| **Persistence and media storage** (#72) | Append-only storage for classes 1–5 and 7; retire-not-delete with no cascading deletes of creative work; the inverse index from unit to dependants (or a rebuildable cache) for marker and impact queries at 150–250 shots; Revision granularity and buffer-to-Revision commit; atomic duplication with id remapping; media sharing and purge semantics; the lock gate inside the write transaction. |
| **Trust signals and locks** (#63) | §6 semantics: which scopes may be locked; the impact summary and money-at-risk as inputs for friction; edit-through versus unlock; default accept+lock; whether selecting a take is formal commitment; marker presentation (reason sentences from §3.1, kept/muted forms, via reasons, "to reconcile" queue, bulk actions); no-bureaucracy rules. |
| **Shot model** (#55, resolved in [`SHOT-MODEL.md`](SHOT-MODEL.md): slices tagged in §2.1, Basis in §2.3, split/merge/redraft in §5, frame-reuse lineage in §6.3) | Tag each Shot slice as narrative-bearing (action, dialogue, presence/Look, location/View) or shot-owned (camera, framing, duration, composition, continuity); name the slices Generations capture; Basis stamping when a Shot is drafted or redrafted; split/merge as retire + create with Basis carried; frame-reuse lineage; the structured paths that raise the write-back/deviation choice. |
| **Entities and Looks** (#53) | Name the identity slices (description versus each active image, Look content, Look assignment); the Presence derivation that is captured; routing a deviation to a new Look; sub-location and merge as retire/redirect with lineage preserved. |
| **Story documents** (#51) | Passage as the narrative unit that Basis and captured inputs reference (smallest stable unit, fingerprinted); the rule that Treatment/Beat Sheet get no markers after accept and may sync before; span-level provenance. |
| **Scene identity** (#52) | A retired or remapped Scene yields `input-retired` / `narrative-changed` through lineage, never deletion; mapping rules for ambiguous matches produce Basis re-stamps only by creator reconcile (resolved: [`SCENE-IDENTITY.md`](SCENE-IDENTITY.md); no new reason, re-homing is a Decision). |
| **Job lifecycle** (#67) | A result for a locked scope is held as an Option; Jobs carry no markers; duplicates do not copy in-flight work. |
| **Spend and cost** (#68) | Bulk regenerate is spend; inherited cost on duplicates is excluded from new spend; money-at-risk reads Generation cost. |
| **AI responsibility map** (#64) | Optional AI assist to suggest "this edit looks like an identity or narrative change"; AI redraft "from current narrative" re-stamps Basis; AI results never write over creator work. |
| **Voice and performance** (#69) | `performance-changed` reasons; ad-lib handling by write-back or deviation of the Dialogue line. |
| **Review and export** (later tickets) | Export is a snapshot, never marked; "differs from current selections" is derivable. |
