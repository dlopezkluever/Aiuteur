# Aiuteur Wayfinder V2: Creator Ratification Record 3

Date: 2026-10-23. Source: creator grilling with Daniel Lopez-Kluever, creator and owner, limited to CR-1 and CR-2 in the [strong-model audit §6](STRONG-MODEL-WAYFINDER-AUDIT.md#6-creator-review-queue-input-to-grill-with-docs) for Wayfinder map #49. [Session thread](https://ampcode.com/threads/T-01a16951-f63b-76a3-8934-ffe8a1938a50).

Status: **authoritative creator-decision source**. The creator explicitly settled both items and authorized reconciliation without another confirmation round. This record controls where it changes [Record 1](CREATOR-RATIFICATION-RECORD.md), [Record 2](CREATOR-RATIFICATION-RECORD-2.md), the audit recommendations, ADRs or current docs. Where it is silent, earlier decisions stand. The Product Constitution remains above all three records.

## 1. CR-1: initial Treatment options generate automatically

Entering Treatment automatically generates the number of options configured in the creator's account-level **Settings** when all three conditions hold:

- No Treatment exists, including one written by the creator.
- No previously generated Treatment options exist, even if none has been chosen.
- No uploaded file was explicitly designated in **Input** to serve as the Treatment.

The default count is **3**. The creator can set fewer or more in Settings. There is no count control in the workspace. Changing the setting affects future drafting, not existing options.

An upload only takes the Treatment's place when the creator explicitly designates that role in Input. Merely uploading a file, or the AI classifying it as treatment-like, does not suppress initial drafting. A designated Treatment opens as imported creator content without generating competing options. Existing work is never regenerated merely because the creator returns to the stage. Existing duplicate-generation guards still apply.

The regeneration box remains available for uploaded and generated Treatments. It can replace a selected section, regenerate the whole Treatment with optional new suggestions, or create a new alternative. Keep my edits remains the whole-document default, Replace everything is explicit, and previous versions remain recoverable. Before Master Narrative acceptance, the creator may explicitly **Update Treatment to match Beat Sheet** from the Beat Sheet stage. That update never happens automatically. Existing skipped and bypassed phases remain intentional and are not automatically backfilled.

**Rejected:** the audit's recommendation of an initial Draft treatment options button. Initial drafting is a stage-entry behavior, not another button press.

## 2. Stage entry authorizes ordinary low-cost initial generation

The creator's general principle:

> When a workflow stage is intentionally designed to auto-generate its initial content, entering that empty stage is sufficient authorization for ordinary low-cost generation.

For Treatment, three initial drafts costing about **$0.18 in total** generate normally. There is no extra Draft button, popup, small-cost confirmation, or `Treatment · ~$0.18` navigation label. Crossing $0.05 alone does not add a priced entry control or another approval to this operation. Cost protection catches material or surprising spend, not pennies in ordinary workflow actions.

Existing exceptional confirmation rules still override automatic initiation:

| Condition | Result |
|---|---|
| Total estimate **$2.00 or more**, including exactly $2.00 | Stop and show the existing inline spend ticket before generation |
| **10 or more Generations**, even if each is trivial | Same. Take batches still count Takes, not Segments |
| Any unknown price | Same |
| Reaching an Account cap or operator ceiling | Apply existing cap rules. A cap breach offers no Start until resolved |
| Bulk regeneration by filter or another specifically defined exceptional condition | Apply its existing confirmation rule |

Known ranges use their upper bound, as before. Estimates, actual costs and the initiating creator action remain recorded. Stage-entry authorization does not authorize duplicate runs, broader scope, automatic media generation or additional billable retries. Existing retry rules and model-selection policy stand. Do not silently choose a cheaper model to avoid a spend check.

This refines Record 1's universal $0.05 priced-control rule for ratified automatic initial-content operations. It does not create a universal permission to auto-generate on every stage. The ratified triggers are Treatment as above and the initial scene plan under the stricter rule below. No other stage gains an auto-trigger from this record.

## 3. CR-2: the initial scene plan keeps its stricter boundary

For a scene with **no Shot plan**, entry automatically drafts the initial plan only when the estimate is **trivial, below $0.05**, and no exceptional confirmation condition applies. At **$0.05 or more**, show the one-click **Draft plan · $x** action instead. The click approves ordinary non-trivial drafting; an exceptional condition still uses the inline spend ticket.

This explicit scene-plan ruling remains despite the general principle in §2. It never redrafts an existing plan. A plan emptied by retiring all its shots is still an existing plan. It never drafts other scenes or triggers frames, images, worlds, Takes or audio. Draft all remains a separate creator action for shot plans only.

The creator mentioned a possible future preference to reduce spend gates. It is **deferred, not approved or designed**. No setting or default for it is introduced here.

## 4. Consistency and reconciliation

No Constitution amendment is made or required. Creator entry into an eligible stage is initiation of its ratified initial-content operation, not independent AI initiative. Ordinary Treatment initialization is not material spend merely because it crosses the old $0.05 boundary. Exceptional costs retain their approval, all media stays explicitly initiated, and accepted or supplied work stays protected. CR-2 deliberately retains the tighter scene-plan policy.

Applied in this session:

- `docs/ux/WRITING-EXPERIENCE.md` and `INTAKE-AND-INTERVIEW.md`: initial Treatment eligibility, explicit upload designation, Settings count and retained editing paths.
- `docs/domain/BUSINESS-AND-OPERATIONS.md`, `GLOSSARY.md` and ADR 0010: stage-entry authorization, no penny-level Treatment gate, exceptional spend checks and the separate scene-plan boundary.
- `docs/ai/AI-RESPONSIBILITY-MAP.md`, ADR 0007, `docs/architecture/MODULE-ARCHITECTURE.md` and `docs/domain/JOB-LIFECYCLE.md`: both ratified triggers, recorded initiation and server-side enforcement.
- `docs/domain/SHOT-MODEL.md` and `docs/ux/NAVIGATION.md`: CR-2, including the #60 redo hand-off.
- `docs/product/STRONG-MODEL-WAYFINDER-AUDIT.md`: follow-up resolution pointers. Its original audit findings remain historical evidence.

For the master agent: use this record for CR-1/CR-2 and for any later #58 or #60 work. The live GitHub map and issue comments were not edited in this session. Their pending-review wording is superseded by this record, but no issue state, dependency or frontier changed. No prototypes were created, run or inspected. No `/to-spec`, frontier advance, or launch of #69/#76–#79 occurred.
