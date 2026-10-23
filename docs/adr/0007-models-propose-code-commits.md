# Models propose, code commits: creator truth is preserved by construction

Status: accepted (Wayfinder #64)

V1 asked models to keep creator truth (dialogue, user edits, established answers) and then trusted the output: model output was never schema-validated, failures returned empty success or raw text, AI calls overwrote user text on a click, and tests mocked the LLM (legacy 09 §§1.5, 1.9; legacy 13). V2 moves each creator-truth guarantee out of prompt wording and into code.

Decision: models have **no tools and no write access**; every AI result is a proposal that deterministic guards validate and one commit path writes, together with its Generation and provenance. Text that must not change **never passes through the model's output channel**: the model sees it with a handle (or source offset), emits the handle, and code inserts the original (screenplay conversion, screenplay export, shot dialogue, protected spans). A targeted rewrite returns only a replacement string that code splices into the base Revision. Established Facts, which cannot be checked by code alone, are enforced by an independent check call whose verdict is grounded (quotes must be exact substrings) and whose outcome is enforced: one repair, then the result is **held** for the creator, never applied silently. Flows are fixed pipelines chosen by code; there are no model-directed agentic loops.

**Amendment (creator ratification M3, 2026-10-21).** "No agentic loops" means no model-chosen steps and no model-chosen scope. It does not forbid a code-defined end-to-end operation. Aiuteur has **defined workflow operations** (for example Generate Master Narrative, Draft all scene plans, Regenerate flagged shots, Auto-block all, Generate missing location views, Rewrite this selection), invoked as buttons, auto-triggers, targeted instruction fields or scope-then-invoke batch actions. The application defines the operation, its steps and its scope; the model makes creative choices **inside** that operation. A creator-triggered targeted or batch operation runs end to end without repeated permission prompts. The model must not invent workflow steps, broaden scope or start unrelated changes. Auto-triggers are limited to those the creator ratified: for shots, only the initial plan of a scene the creator enters that has none; it never redrafts existing work and never starts frames, images, worlds, takes or audio (Record 2 D60.5, X8; see the AI map §6.0). Mechanical failures get the single bounded repair without interrupting the creator; only an unresolved consequential conflict reaches them. Spend rules still apply to batches (approval as a sum; see #68). V2 has **no universal chat agent**; the project-aware assistant remains LATER and, when built, must still deliver reviewable change-sets.

## Considered options

- **Prompt-only preservation with a post-hoc diff.** Rejected: V1's approach. A diff detects corruption after the model has produced it and cannot tell a legitimate edit from a violation without the construction guarantee; the model can also paraphrase dialogue plausibly.
- **Tool-calling agents that edit the project directly, or a universal chat agent in V2.** Rejected: gives the model initiative and write access, contradicting §13.1 and §14.3, and makes recoverability and testing hard. The project-aware assistant (LATER) must still deliver reviewable change-sets, which this design supports because results are proposals.
- **Block every output that fails the fact check (fail closed, no override).** Rejected: the check is probabilistic and a false positive would trap the creator (§16 principle 9). Held results with "use anyway" keep authority with the creator.
- **Fail open silently when the fact check is unavailable.** Rejected: violates "never silently". The result commits with a visible "not checked" marker.

## Consequences

- The document model must make dialogue machine-addressable (#51). Guards G1–G10 in `docs/ai/AI-RESPONSIBILITY-MAP.md` are pure functions and are the primary test surface (#76).
- Some operations need an extra L call (the check, at most one repair) and handle bookkeeping; the cost is bounded and small next to media spend.
- A model that cannot follow the handle protocol is unusable for those operations, which makes model qualification a verification question.
- Recall of the Established Fact check is statistical, not guaranteed; it is measured, not asserted.
