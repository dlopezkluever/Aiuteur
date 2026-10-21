# Aiuteur Wayfinder V2: Creator Ratification Record

Date: 2026-10-21. Source: creator grilling session (Daniel Lopez-Kluever, creator and owner), run against map #49.
Status: **authoritative creator-decision source.** Where a later clarification conflicts with an earlier answer or with an agent recommendation, the **later clarification controls**. This is a resolved-meaning record, not a transcript.

Authority order unchanged: Product Constitution, then this record and creator-ratified ADRs, then agent-drafted unratified decisions, then historical material.

Nothing outside this file was edited in the session. Every correction listed below is for the parent agent to apply.

---

## 1. Phase A: closed tickets #50, #53, #54, #64, #67

The closed tickets were agent-drafted. The creator reviewed their consequential behavior and ratified or modified it as follows.

### 1.1 Ratified unchanged

| # | Decision | Tickets |
|---|---|---|
| R1 | **Retire, never delete, inside a project.** Regeneration and editing add Attempts or Revisions; removal "retires". All ids are permanent. (Project/account purge is a separate, later carve-out: see M7.) | #50, ADR 0001 |
| R2 | **Staleness is flag-only.** "Possibly out of date" is derived from captured inputs. It never auto-regenerates, never spends, never blocks, never touches unchosen takes. Exits: regenerate, reconcile, keep, restore, and bulk forms. Keep is remembered for that exact content. Applies to character/entity edits and to upstream story edits alike. After Master Narrative acceptance, Treatment and Beat Sheet are never flagged. | #54, ADR 0004 |
| R3 | **Write-back vs deviation.** A structured edit below the owning level raises an inline three-way choice: update upstream (write-back, with an impact preview), keep as a deviation for this shot, or decide later. "Decide later" leaves a quiet marker in a to-reconcile list. Accepted limit: free-text prompt overrides cannot be semantically checked; they are only marked "prompt overridden". | #54 |
| R4 | **Looks follow the story.** Looks are derived from narrative position over stored change points, with bounded assignments for flashbacks. Reordering or inserting scenes changes derived Looks immediately, and affected frames are flagged. Any exception is a visible local override on a shot. | #53, ADR 0002 |
| R5 | **Location coverage.** Directions are per location. Shots point to a direction slot, not an image. The AI's pick is a visible AI-made choice, overridable. Missing views fall down a fallback ladder, reported quietly, never blocking. Readiness explains and never gates. Every generated view is a draft the creator reviews. | #53, ADR 0003 |
| R6 | **Established Facts.** A contradiction gets one automatic repair attempt, then the result is **held** (use anyway, change the Fact, regenerate, or discard). If the check is unavailable, the result commits with a visible "not checked against Established Facts" marker and a check-now action. Altered dialogue or a damaged splice is **rejected** with no "use anyway". | #64, ADR 0007 |
| R7 | **AI-made choices** are marked quietly inline ("AI chose this"), overridable in one click, with an on-demand project-wide list. They never interrupt. | #64 |
| R8 | **No automatic retry when money may be involved.** Auto-retry only when known-unbilled or trivially cheap (below the trivial-spend threshold, R14). Timeouts and unknown errors show a "may have been charged" note and a Retry button with the price; clicking is the approval. Safety refusals never auto-retry. | #67, ADR 0006 |
| R9 | **Duplicate-generation guard** ("this is already generating"; proceed only via "generate another"). Batches are approved as a sum, partial results survive individual failures, and a take counts as successful only once media is safely stored in Aiuteur's own storage. | #67 |
| R10 | **Treatment ↔ Beat Sheet sync is explicit-only (option A).** The creator presses Sync. Creator-written spans are protected; a protected-span change is held; sync is recoverable via revisions. Before Master Narrative drafting or acceptance, if the two documents disagree, Aiuteur shows the disagreement and asks which to follow; it never guesses. After acceptance, neither is synchronized again (development history). Optionality (auto or per-project sync) is a possible future addition, not V2. | #51 |

### 1.2 Modified by the creator (later wording controls)

| # | Modification | Tickets |
|---|---|---|
| M1 | **Flags must be subtle.** Quiet, low-contrast marks. Never banners, modals or alarm styling. | #54, carried into #63 |
| M2 | **Late result after cancel notifies quietly.** The paid take is attached unselected, labelled "arrived after cancel", and the creator gets a quiet notice. (Previously: no notification. A late result after timeout already notified.) | #67 |
| M3 | **AI action model (replaces the Q7 wording).** Aiuteur has **defined workflow operations** (Generate Master Narrative, Draft all scene plans, Regenerate flagged shots, Auto-block all, Generate missing location views, Rewrite this selection). They are buttons, auto-triggers, targeted instruction fields, or scope-then-invoke batch actions. There is **no universal chat agent in V2**, and a project-aware assistant remains LATER. The application defines the operation and its scope; the model makes creative choices **inside** that operation. A creator-triggered targeted or batch action is carried through end-to-end without repeated permission prompts. The model must not invent workflow steps, broaden scope, or start unrelated changes. Mechanical failures get the bounded repair (one attempt) without interruption; only unresolved consequential conflicts reach the creator. Spend rules still apply to batches. | #64, ADR 0007 |
| M4 | **Operating model: multi-creator, not personal-first.** Architected from day one for multiple independent creator accounts, each with an isolated studio (projects, assets, settings, usage). **No** collaboration, teams, shared editing or permission hierarchy. The creator is the first user, and others are onboarded quickly afterward without re-architecture. Real user/account ownership and tenant isolation are in V2. | #68 (and #72, #75, #73) |
| M5 | **Who pays.** The operator pays provider bills for now, using operator provider keys held server-side. **BYO provider keys are a high-priority follow-on** with an easy setup flow right after the core build. This is not "later, maybe". When BYOK ships, the operator-side cost exposure controls (M6 hidden ceiling) are removed. | #68 |
| M6 | **Signup and caps.** Signup is **invite-only** until billing exists. Creators **set their own spend caps**. A **small hidden operator ceiling per account** exists only for the pre-BYOK window, and is to be removed when BYOK arrives. Default cap numbers are parked (see section 5). | #68 |
| M7 | **Deletion.** Project-level and account-level permanent delete is accepted as a **requirement, scheduled later and not vital for V2 core**. Retire-only (R1) stays inside projects. Standing design constraint for #72: each project's data and media must be separable and purge-able so the feature can be added without a rewrite. | #50, ADR 0001, #72 |

---

## 2. Phase B: decisions on the open creator tickets

### #51 Treatment ↔ Beat Sheet sync
Creator decision: **R10** (explicit-only, with the disagreement check). The document-representation questions of #51 (document model, span provenance, revisions, targeted-rewrite contract) remain for the ticket's own design work. The creator did not decide them.

### #56 Information architecture / navigation: **resolved by creator**
- **Primary model: C, outline tree plus production board.** The creator especially likes the persistent left overall sidebar. Treatment and other phases live in the same tree, and Cmd-K fast navigation is welcome (not contested).
- **Correction to the prototype:** in the production board, selecting a shot must **not** merely open a cramped right-hand side drawer. When working inside a scene, **prepping and making shots is the MAIN center workspace.** A side peek/drawer is allowed only as a lightweight preview.
- **Nothing from B is required.** A "suggested next" card is a stretch goal, not part of the main design.
- **No first-run chooser.** The creator rejected the "What are you bringing?" screen outright. A new creator is dropped into the normal start-a-project flow (the Input phase), adds what they have, and proceeds like any other project. Input must be designed clearly enough that no router screen is needed. This is consistent with the Constitution (Input phase; Aiuteur shows how it understood each item and proposes entry). The routing happens inside Input, not on a gate screen. No tour or tutorial video.
- Superseded recommendation: "C skeleton + B suggested-next home card + guided first-run chooser". Only the C skeleton and Cmd-K survive as a main design; the other two parts are dropped or demoted as above.

### #57 Intake and Interview: **resolved by creator**
- **Presentation:** A-led conversation, one question at a time, each with **suggested answers (chips)** and a free-text reply. A **ledger** at the side shows what is being decided (Established Facts and AI-made choices), editable, grouped by topic.
- **Topic-based questioning (creator addition):** e.g. story/plot details; characters and locations; visual and audio style. The creator can design some topics personally and tell the AI to decide others. Skipped topics become visible AI-made choices. The creator treats the topic list as guiding lore that **later decisions may supersede**.
- **Scope guard (agent-proposed, creator accepted via Q24):** the Interview captures intent and non-negotiables as Established Facts, not finished entity sheets or visual designs. Detailed design stays in World Definition (#59), so the work is not done twice.
- **Ending:** the AI judges "I think I understand enough" and names the gaps, and it is **advisory only**. The creator can continue, or tell the AI to take it from there (this is the same mechanism as "stop here, you choose the rest"). Code computes "sufficiently informed" from the open-question list (AI map §7). It never advances the project by itself. A coverage-meter-only approach is not chosen.

### #63 Trust signals / staleness / locks UX: **resolved by creator**
1. **Visual direction:** **Whisper by default** (subtle indicators near affected work) **plus an on-demand "review all" tray** from the Ledger. **Trace is skipped for V2.**
2. **What a lock does:** blocks edits to the locked thing (new Revisions, retiring, moving the chosen Slot) from every path, including AI-applied edits (held as Options). A locked edit goes through only with a confirmation showing the server-computed downstream impact. It does **not** stop viewing or generating new Attempts, never cascade-deletes, and never marks anything on unlock. Unlock is always available.
3. **Lock offer points (approved):** Master Narrative acceptance locks by default; entity identity approval offers a lock; Visual Style / World Definition offers a lock when the creator says the world is set; a scene's shot plan offers a lock when frame generation begins; anything else is voluntary.
4. **Take selection:** **choosing a Take is a reversible selection**; changing the choice flags what was built from the previous pick (R2). Optional **Mark final** adds a stronger voluntary lock for organization. A final Take can always be returned to and changed (unlock; nothing cascades).
5. **Confirmation friction (approved as proposed):** no dependants means a normal edit; modest consequence means a small inline warning; heavy downstream work or spend means the affected items and money at risk are shown first; one confirmation covers the editing session on that scope; **never** typed phrases such as CONFIRM.
6. Flags are subtle (M1).

### #68 Business and operations: **creator decisions given; ticket needs a rewrite pass**
- **Operating model:** M4, M5, M6, M7.
- **Spend behavior (approved as proposed):**
  - Trivial: under **$0.05 per Generation**. No confirmation, and auto-retry when otherwise safe.
  - Meaningful: everything else plus **all video**. The initiating action shows its estimated price.
  - A **separate confirmation step** when the total estimated cost is **$2.00 or more**, the batch has **10 or more Generations**, it is a bulk regenerate by filter, the price is unknown, or the action would hit a cap.
  - A **single video generation under $2.00** is one click with a visible price and **no second dialog** (the alternative of a dialog on every video was declined).
  - A Retry after failure shows the price, and the click is the approval.
- The creator described these thresholds as acceptable and adjustable. They are tunable defaults, not architecture.
- **Caps:** M6. Defaults for creator caps are undecided and parked. The creator said not to worry about them for now.
- **Still undecided in #68:** the spend tracker's record and attribution model, price-lookup source, and the full safeguard list (runaway-retry guards, per-batch caps). These remain the ticket's agent-designed content, now to be built for per-account isolation.

### #70 CapCut Constitution wording
Research finding (not a constitutional failure): Resolve and Premiere can import a pre-assembled timeline; CapCut Desktop cannot, and receives ordered, uniquely named clips. Constitution lines that only say editing happens in these tools (51, 105, 125, 560, 895) stay as they are. The creator approved a **narrow factual correction** to two lines. Apply exactly:

- Line 574, current: `**NLE timeline export** (a sequence file for Resolve/Premiere/CapCut that arrives pre-assembled) is **IMPORTANT**.`
  Replace with: `**NLE timeline export** (a pre-assembled sequence file for Resolve and Premiere; CapCut Desktop cannot import one, so it receives ordered, uniquely named clips) is **IMPORTANT**.`
- Line 706, table cell, current: `NLE timeline export (Resolve / Premiere / CapCut sequence)`
  Replace with: `NLE timeline export (Resolve / Premiere sequence; CapCut: ordered clips)`

Change nothing else in the Constitution. Verify line numbers and exact surrounding text before editing. If the cell on line 706 contains more than the quoted text, change only that phrase.

---

## 3. Artifacts that need updating

| Artifact | Update |
|---|---|
| **ADR 0007** and AI map `docs/ai/AI-RESPONSIBILITY-MAP.md` §5/§6 | Add M3. "No agentic loops" means no model-chosen steps or scope. It does not forbid code-defined end-to-end batch operations, or creative choices inside a requested operation. State that V2 has no universal chat agent and that a project-aware assistant is LATER. |
| **ADR 0001**, `DOMAIN-MODEL.md`, `GLOSSARY.md` | Add the M7 carve-out: "never destroyed" applies inside a project. Project and account purge is a deliberate, later operation. Add the project/media-separability constraint. |
| `docs/domain/LINEAGE-AND-STALENESS.md` | Add a note on adoption of a late result after timeout (arrives already flagged if inputs changed). Currently it does not mention adoption though `DOMAIN-MODEL.md` §5 and `JOB-LIFECYCLE.md` do. Add the M1 subtle-flag rule. Reference R10's disagreement check where relevant. |
| `docs/domain/JOB-LIFECYCLE.md` (late output after cancel, about line 156; event table, about line 241) and ADR 0006 | Change "No notification is sent" to a quiet notice (M2). Update the `generation.late_result` row accordingly. Fill the trivial-spend value ($0.05) from #68 and replace the "value owned by #68" wording. |
| **Issue #68 body** | Rewrite for M4–M7 and the spend rules. Replace "personal-use spend tracker" framing with per-account spend records, caps and an operator ceiling. The deferral list now reads: commercial billing, subscriptions, credits, invoicing and teams stay deferred; **BYOK is a priority follow-on, not a deferral**. |
| **Map #49 Notes** | The scope-discipline line "no collaboration or multi-user assumptions" must say: multi-**creator** isolated accounts are in scope; collaboration, teams and shared editing remain OUT. Update the Out-of-scope text, which lists multi-user cost allocation. Add the new decision lines for #51, #56, #57, #63, #68 after their tickets close. |
| **Issues #72, #75, #73, #74** | Inherit account/tenant isolation, invite-only auth, per-account spend records and caps, server-held operator keys with a BYOK-ready seam, and project-separable storage for purge. #73's platform shortlist must be evaluated against multi-tenant isolation. |
| `docs/product/PRODUCT-CONSTITUTION.md` | Only the two-line #70 correction above. |
| `docs/agents/domain.md`, `GLOSSARY.md` | Add terms as needed: workflow operation, Mark final, Ledger/Whisper/review-all tray, account/studio, invite-only. |

## 4. Tickets to amend, reopen or close

- **#56:** creator decision recorded. **Resolve and close** from section 2, with the center-workspace correction and the dropped chooser. Rebuild the "Decisions so far" index line.
- **#57:** creator decisions recorded (presentation, topics, ending). Close after the parent captures the resolution comment. Its remaining mechanics belong to #64 §7, which is unchanged.
- **#63:** creator decisions recorded. Close after the resolution comment. It inherits M1.
- **#51:** creator sync decision recorded (R10). Do **not** close. The document-representation design is still agent work.
- **#68:** creator decisions recorded. Rewrite the body, then complete the agent-designed spend-record and safeguard sections. Close afterward.
- **#64:** amend (M3), not reopen. The ADR 0007 clarification is an amendment, and the substantive guard design stands.
- **#67:** amend (M2 and the trivial-spend value). Not reopened.
- **#50 / #54 / #53:** amend (M7 note, adoption note, M1). Not reopened.
- **#70:** stays closed. Apply the Constitution correction and add a comment.
- No closed ticket needs a full reopening.

## 5. Cross-ticket inconsistencies to reconcile

1. **Late result after timeout notifies; after cancel did not.** Resolved by M2. The job lifecycle docs and event table still say otherwise.
2. **Domain model says a Generation can gain outputs by adoption; the lineage doc is silent.** Compatible, but the doc needs the note.
3. **ADR 0007 "no agentic loops" versus the creator's workflow-operation model.** Resolved by M3. ADR text only.
4. **Single-owner/"personal" language** in the map, #68, #72, #75 versus M4. Reconcile everywhere "owner", "personal deployment" or "personal-use spend tracker" appears. The domain objects should carry account ownership (they already planned an owner identity).
5. **"Never destroyed" (R1) versus account isolation and later purge (M7).** Resolved by the carve-out.
6. **Cap authority:** earlier discussion said only the operator raises caps. The creator's later ruling (M6) controls: creators set their own, and the operator holds only a small hidden ceiling until BYOK.
7. **Pending defaults the creator parked:** cap defaults and the hidden ceiling's size. Do not invent them silently; ask the creator when #68 is finalized, or list as spec-level configuration.
8. **Constitution scope check for multi-creator.** The Constitution marks "Collaboration / multi-user editing" OUT (around line 740). A grep found no other account, tenant or single-user statements, so in this session's judgment M4 needs **no** `CONSTITUTION AMENDMENT REQUIRED`. The parent should do a full read for any implicit single-user assumption (§2.4 ownership of spend, §15.5) before relying on that. If one is found, raise a proposal; do not design around it.
9. **The #56 prototype shows a right-hand shot drawer.** It predates the creator's correction (center workspace). Downstream UX tickets (#58–#62) must be briefed on the corrected shell.

## 6. Constitution amendment status

**`CONSTITUTION AMENDMENT REQUIRED`: none raised.** The only Constitution change is the creator-approved factual correction of lines 574 and 706 (section 2, #70). The multi-creator decision is subject to inconsistency 8.

## 7. Newly unblocked Wayfinder frontier (verify against native blocked-by edges)

- With #68's creator decisions in hand and #67 closed: **#59 World Definition**, **#62 Candidate review and playback**, **#72 Persistence and media storage**, **#73 Platform and execution research**, **#75 Operational baseline**. These are the tickets that listed #68 as a blocker. They are only unblocked after #68 is formally closed.
- With #56 closed: the UX tickets that place their surface inside the shell (**#58, #59, #60, #61, #62, #63**, as the tickets' own blocked-by edges require).
- With #57 and #63 closed: dependents of those tickets.
- Open and not touched by creator input: **#52, #55, #65, #66, #69, #71, #74, #76, #77, #78**. #51 stays open.
- #79 (final audit) remains last.
- The parent agent must read the blocked-by edges directly and not trust this list.

---

## 8. Instructions to the parent agent

1. Treat this Ratification Record as the authoritative creator-decision source. Where it conflicts with a child agent's recommendation, a ticket body, an ADR or a prototype, this record controls.
2. Reconcile every affected open and closed Wayfinder ticket against it (sections 3 to 5).
3. Reconcile existing child and orb outputs against it. Do **not** assume those agents received these decisions: they did not.
4. Update, reopen or close the relevant tickets and authoritative artifacts as section 4 specifies. Apply the Constitution correction exactly as written in section 2 (#70) and nothing more.
5. Propagate the corrected decision context to any child or orb work that continues or is restarted. In particular brief the #58–#62 agents on the corrected navigation shell (M3, #56 center workspace), the quiet-flag rule, and multi-creator isolation.
6. Only after that reconciliation, resume downstream Wayfinder orchestration. Do not run `/to-spec`, `/to-tickets` or implementation as part of this reconciliation.
7. Do not turn parked items (cap defaults, hidden-ceiling size, spend-record design) into decisions without asking the creator.
