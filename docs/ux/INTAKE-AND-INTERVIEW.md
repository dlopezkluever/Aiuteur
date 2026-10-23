# Intake and Interview: UX decision (Wayfinder #57)

Status: resolved. Creator decision: `docs/product/CREATOR-RATIFICATION-RECORD.md` §2 (#57), which controls over any earlier recommendation. Constitution: §4.2 Phases 1–2, §4.3, §13.2, §14.2, §16 principle 2. The AI-side mechanism is `docs/ai/AI-RESPONSIBILITY-MAP.md` §7, unchanged.

Throwaway prototype (A conversation, B question cards, C living brief) is on branch `prototype/intake-interview-57`, never merged.

## 1. Selected direction

Input and Interview are two consecutive phases in the normal start-a-project flow. There is no first-run chooser or router screen (#56): a new creator lands in Input, adds what they have, and routing happens inside Input.

### Input (Phase 1)

- **One staging area** takes typed text and uploaded files together. Originals are kept exactly as supplied; extraction never rewrites them.
- **Roles.** Each item is *primary* (may enter the workflow at its maturity level) or *supporting* (informs only). The first item defaults to primary; the creator can change any role.
- **Aiuteur's reading, per item.** What it read the item as (type), confidence, a one-line summary, and where it proposes the item enters. The creator can override the type. A "why / what was done" disclosure shows signals and states that the original is kept and nothing was rewritten. Aiuteur never acts on material invisibly; a proposed change to the creator's material is asked first.
- **Route strip, inside Input.** One line of phases showing each as Imported, Converted, Skipped on purpose, Recommended, or Aiuteur drafts, per Constitution §4.3. A screenplay shows Treatment and Beat Sheet as intentionally skipped and the Master Narrative as converted (never bypassed). Nothing is generated or spent at this step.
- **Project settings** (runtime, format, tone, rating, genre) are optional on the same screen. Each carries a source tag: set by the creator, suggested from the material, or left to Aiuteur (becomes an AI-made choice).
- The creator proceeds to the Interview or skips it. Skipping is one action and is always offered.

### Interview (Phase 2)

- **A-led conversation.** Aiuteur asks one question at a time. Each question shows why it is being asked (evidence from the material), suggested answers as chips, and a free-text reply. Every question can be skipped ("you decide") and every answer can be undone.
- **Topic-based.** Questions are grouped by topic, for example story and plot, characters and locations, visual and audio style, format. The creator can work through a topic personally or tell Aiuteur to decide it. A topic left to Aiuteur becomes visible AI-made choices. The topic list is guiding lore: later decisions may supersede it, and it is not a fixed schema.
- **Ledger beside the conversation.** It lists Established Facts and AI-made choices, grouped by topic, each editable in place. Provenance is shown quietly: the creator's own, edited, from settings, or AI chose (distinct, subtle marking per Constitution §13.2; no alarm styling). Editing a Fact is a Revision. Facts are development knowledge from inputs, Interview answers and creator edits; they bind AI drafting only and are never injected into media prompts, so the Ledger has no pin or "carry into generation" toggle (Record 2 P10). A creator's own edit that contradicts a Fact wins and quietly marks the Fact superseded, with Undo. Overriding an AI-made choice makes it the creator's Fact.
- **Scope guard.** The Interview captures intent and non-negotiables as Established Facts. It does not produce finished entity sheets or visual designs; detailed design stays in World Definition (#59), so work is not done twice.

### Ending: advisory only

- Code computes "sufficiently informed" from the open-question list (AI map §7). Aiuteur then says it thinks it understands enough and names any remaining gaps.
- The creator chooses: keep going, or hand the rest over ("take it from here"). Handing over shows what Aiuteur would choose for each remaining question, records them as AI-made choices, and moves on. The creator can end earlier at any time with the same step.
- Reaching the status never advances the project. There is no coverage-meter-only mode.

### Later conflict with an Established Fact (R6)

New Source Material or later creator input that conflicts with a Fact is not applied. The conversation resumes with a distinct message naming the Fact and the new content, with three outcomes: keep the Fact (flag the new content), update the Fact, or record a deliberate exception. Neither side is overwritten silently. Generated output that contradicts a Fact follows R6 (one repair attempt, then held with its choices; altered dialogue or a damaged splice rejected).

## 2. Trade-offs considered

| Presentation | Strength | Weakness |
|---|---|---|
| A conversation | Matches "a conversation, not a form" | Serial, weak overview |
| B question cards | Skimmable, random access | Reads as a form; intake bureaucracy |
| C living brief | Facts and AI-made choices are the document | Least conversational; follow-ups awkward |

A was chosen by the creator, with B's suggested-answer chips and C's provenance marking absorbed into the ledger.

## 3. Handoff criteria for the AI responsibility map (#64 §7)

The mechanism in §7 stands. This ticket adds these requirements on the open-question list it returns:

1. Each open question carries a `topic` (free label from the guiding topic list, not an enum), so the ledger can group by topic and a topic can be delegated as a whole.
2. Suggested answers are expected on every question, not optional, because the chips are the primary reply path. The AI-made choice that would be recorded on skip is one of them.
3. Delegating a topic or ending the Interview records AI-made choices through the normal drafting path (G8), not by an extra model call.
4. Questions stay at intent and non-negotiables (scope guard); entity and visual detail questions belong to World Definition.
5. A conflict raises a contradictory open question (§7.6) that the conversation presents with the three outcomes above.
6. Per-turn question caps and any "enough" thresholds remain spec-level tuning defaults.

## 4. Constraints for downstream tickets

- #59 World Definition owns detailed entities and visual design; it may read Interview Facts and AI-made choices as inputs.
- #63 owns exact subtle styling of provenance and the on-demand AI-made list; the ledger must reuse it.
- #56 shell: Input and Interview live in the persistent sidebar tree as the first two phases; no gate screen.
