# Models propose, code commits: creator truth is preserved by construction

Status: accepted (Wayfinder #64)

V1 asked models to keep creator truth (dialogue, user edits, established answers) and then trusted the output: model output was never schema-validated, failures returned empty success or raw text, AI calls overwrote user text on a click, and tests mocked the LLM (legacy 09 §§1.5, 1.9; legacy 13). V2 moves each creator-truth guarantee out of prompt wording and into code.

Decision: models have **no tools and no write access**; every AI result is a proposal that deterministic guards validate and one commit path writes, together with its Generation and provenance. Text that must not change **never passes through the model's output channel**: the model sees it with a handle (or source offset), emits the handle, and code inserts the original (screenplay conversion, screenplay export, shot dialogue, protected spans). A targeted rewrite returns only a replacement string that code splices into the base Revision. Established Facts, which cannot be checked by code alone, are enforced by an independent check call whose verdict is grounded (quotes must be exact substrings) and whose outcome is enforced: one repair, then the result is **held** for the creator, never applied silently. Flows are fixed pipelines chosen by code; there are no model-directed agentic loops.

## Considered options

- **Prompt-only preservation with a post-hoc diff.** Rejected: V1's approach. A diff detects corruption after the model has produced it and cannot tell a legitimate edit from a violation without the construction guarantee; the model can also paraphrase dialogue plausibly.
- **Tool-calling agents that edit the project directly.** Rejected: gives the model initiative and write access, contradicting §13.1 and §14.3, and makes recoverability and testing hard. The project-aware assistant (LATER) must still deliver reviewable change-sets, which this design supports because results are proposals.
- **Block every output that fails the fact check (fail closed, no override).** Rejected: the check is probabilistic and a false positive would trap the creator (§16 principle 9). Held results with "use anyway" keep authority with the creator.
- **Fail open silently when the fact check is unavailable.** Rejected: violates "never silently". The result commits with a visible "not checked" marker.

## Consequences

- The document model must make dialogue machine-addressable (#51). Guards G1–G10 in `docs/ai/AI-RESPONSIBILITY-MAP.md` are pure functions and are the primary test surface (#76).
- Some operations need an extra L call (the check, at most one repair) and handle bookkeeping; the cost is bounded and small next to media spend.
- A model that cannot follow the handle protocol is unusable for those operations, which makes model qualification a verification question.
- Recall of the Established Fact check is statistical, not guaranteed; it is measured, not asserted.
