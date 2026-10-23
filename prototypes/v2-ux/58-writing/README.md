# #58 Writing experience: throwaway prototype (Treatment, Beat Sheet, Master Narrative)

Structural sketch of the **final ratified behavior** (D58, X1/X2/X4/X7, Record 3 CR-1). Visuals are not approved (Record 2 §3.1; V1 WizardDirector is the visual reference). Fixture story "Salt Line"; all AI output is canned. Not built from the old prototype branches.

## View
```
cd prototypes/v2-ux && python3 -m http.server 8058
open http://localhost:8058/58-writing/index.html            # ?s=<state>&v=<options>,<regen>,<sync>
```
Bottom-left "Prototype controls" jump to states (first entry, exceptional spend, options ready, compare, single option, upload-designated, edited+protected, held approval, drift, Master Narrative, acceptance sheet, history, after acceptance, Treatment skipped, Beat Sheet bypassed) and switch the three direction variants. "Settings n" toggles the account count 3/1. Screenshots: `screens/`.
Live behaviours: choose option, New alternative (guidance), whole-doc regenerate (Keep my edits / Replace everything / Use my notes), select text then Rewrite or Several alternatives (protected spans become a held item), Undo toasts, Notes, Versions preview + Restore (adds a new version) + Bring this passage back, beat edit/reorder/add/retire/alternatives, per-beat and whole sync actions, Keep both, AI-added Keep/Remove/Keep all, acceptance sheet, Unlock.

## Core task and minimum on screen
Make writing feel like writing. Default view is one document column and a one-line phase purpose. Nothing about cost, counts or workflow appears unless an exceptional condition exists. Entering Treatment (no Treatment, no options, no designated upload) shows a skeleton and then options, with no Draft button, price label or count chrome. The $2.40 / 12-generation case shows the inline ticket (state "exceptional spend"). Flags are whispers (dot plus a short line). Panels (Notes, Versions, Regenerate) are opt-in.

## Explored directions
**Options (Treatment choosing)**
- *pager* (default): one option in the full column, "Option 2 of 3" switcher, summary + attribute chips (tone, structural emphasis, ending, est. runtime), "Compare side by side" as an optional action. Best for reading and low noise; slower to compare.
- *strip*: three summary cards on top, document below. Fast scan and scale; adds persistent chrome and implies a count.
- *compare*: columns of excerpts, each with Choose. Best at the choosing moment; poor for reading whole documents and breaks with 4+.

**Regeneration box, history and notes**
- *dock* (default): one box docked under the document (New alternative | Whole document | Selected passage, optional guidance, Keep/Replace, Use my notes). Discoverable and fast; always-visible chrome in the writing column (it hides after acceptance).
- *margin*: the same box lives in the right slot behind a "Regenerate" button, with Notes and Versions sharing that one slot. Calmest page, one extra click.

**Sync / reference sidebar**
- *bar* (default): one quiet line "N places differ" plus Update Treatment to match Beat Sheet (prominent), Update Beat Sheet from Treatment, Keep both. Per-beat actions open from the whisper dot. Clear and low interruption.
- *inline*: per-beat actions always expanded under each drifting beat. More control and legibility at scale; noisier.
Both keep Treatment in a collapsible read-only right sidebar highlighting the linked passage on focus (Master Narrative uses the Beat Sheet sidebar the same way).

## Evaluation (speed, clarity, control, low interruption, state legibility, recoverability, scale, consistency)
pager+dock+bar scores best on interruption, clarity and consistency (same right-slot, same box, same whisper everywhere). strip wins on speed and scale. compare wins on choosing. margin wins on calm but loses speed. inline wins on control and state legibility but loses on interruption.

## Recommendation
**pager + compare-on-request, dock regeneration box (collapsing into the right slot on narrow widths), bar sync with per-beat actions behind the whisper dot.** Single acceptance sheet with Lock checked; AI additions optional, never gating. Treatment/Beat Sheet shown as development history after acceptance (no dots, no sync, quiet note plus "Regenerate from the Master Narrative").

## Unresolved creator choices
1. Is "Draft treatment options" on a *skipped-by-you* Treatment acceptable? It is a deliberate creator request, not stage entry, but it is a Draft button; alternative is "Write it myself" only.
2. Option count above 3: pager scales, compare does not. Is a cap on side-by-side acceptable?
3. Should New alternative while a chosen Treatment exists land in "Other options" (prototype) or ask to replace?
4. Should the regeneration dock show always (prototype) or only after selection/click?
5. Attribute set per option (tone, emphasis, ending, runtime are my guess from V1).
6. Which "Update first" path from the acceptance sheet returns to the sheet afterwards.

## Doc contradictions / gaps noticed
- WRITING-EXPERIENCE §2.1 says "New alternative appears in place of the one currently open", but after a choice there is no open option; I put it under "Other options". Unspecified.
- §2.4 says Undo after direct apply is offered, and §7.2 restore adds a version; Undo as "restore of prior head" duplicates versions, so repeated Undo grows history (as designed, but surprising).
- §4.3 lists Update Beat Sheet from Treatment as "secondary here" but §2.5 puts it on the Treatment page; both shown. Held changes from the Beat Sheet page surface on the Treatment page (a different page), which the doc does not state.
- §5 says AI additions "never gate", but Master Narrative drift ask and acceptance sheet ask duplicate the same decision (page vs sheet); recorded once, shown in both.
- Settings count 1: "Use this treatment" wording vs "Choose this one" both specified; prototype follows §2.1.
- Prototype limitation: partial-selection rewrite of protected text is held as a whole-selection item; real splice rules (STORY-DOCUMENTS §3) not modelled. Scene-boundary rewrite and "AI added" for notes across scenes not modelled.
