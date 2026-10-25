# The Generation record is the trace, and test providers are contract-verified and marked

Status: accepted (Wayfinder #76)

V1 mocked the LLM in tests, kept replica and parity tests that passed by construction, had no contract tests, and its LangSmith tracing never attached (the trace id was the request id and the column was never written). Its video provider defaulted to a mock when a key was missing, so the product never delivered a finished piece (legacy 13; legacy 09 §1.3; FACT-0353; Constitution §17.5).

Decision, in two parts that stand or fall together because both decide what a record may be trusted to say:

1. **The Generation record is the only AI trace.** Its Package, Fit report, Rendered request, call log, run history and settled outputs, joined by ids written in the transactions that create them (request, action, Batch, Generation, call, Job and run, provider operation reference, Attempt), are the trace. No tracing vendor and no second store. Content has three tiers: content-free ids, codes and costs (logs, Sentry, alerts, operator views); content (Rendered request, call log, raw responses), readable only under the creator's Scope; media bytes under signed access. Nothing from the second or third tier reaches the first.
2. **Test providers are contract-verified and marked.** One conformance suite runs against every fake and, as a live probe subset, against every real adapter; fakes are parameterised by evidenced profiles and script documented provider behaviour. A fake cannot become a default: it is a distinct type that the production composition root cannot accept, it lives where only test and non-production roots import it, the loader refuses it, the send gate refuses it, its kind is part of the immutable profile snapshot (so every Generation it served is marked and the UI shows a test-provider mark), its output bytes are visibly watermarked, and readiness and a nightly check detect it. Real-provider checks gate promotion and enablement, never merge. Prompt and model changes are gated by tiered evidence: zero tolerance where code enforces, non-regression of sampled rates, and a human side-by-side for what only a person can judge.

Details: `docs/architecture/VERIFICATION-AND-OBSERVABILITY.md`.

## Considered options

- **External tracing vendor behind a port** (LangSmith, Langfuse, OpenTelemetry backend). Rejected: it exports private prompts and responses, needs its own purge and retention, and duplicates a record that already holds more than a tracer would. Content-free spans to a telemetry backend remain a deferred, tier-one-only addition.
- **Hand-written fakes.** Rejected: V1's failure; nothing keeps them honest.
- **Record and replay of provider traffic.** Rejected for providers: recordings capture content and tokens, age silently and cannot script failure modes. Kept for model outputs only, as recorded proposals from synthetic staging runs.
- **Model-as-judge as a release gate.** Rejected: a judge drifts and a gate that cannot fail is V1's replica test again. Allowed as advisory triage that nominates cases for a human.
- **Human review of every change.** Rejected: not proportionate; skipped under pressure.
- **Guarding fakes by convention or one startup check.** Rejected: one check is one defect from V1's default.

## Consequences

- Production never holds a trace outside the Generation record, so purge, retention and the operator's content-free views stay as decided; debugging production content is the creator's inspector or an out-of-product break-glass read.
- Lifecycle bugs are reproducible without content: run history exports as a scenario script the fake replays.
- Adding a provider adds an adapter, a profile with evidence and a pass of the conformance suite; adding a fake behaviour needs a cited provider behaviour.
- Promotion depends on fresh live evidence, so the operator owns capped smoke and eval Accounts on staging and a quarterly bar run.
- Reversible parts: tool choices, cadences and thresholds (spec). Hard to reverse: trace data living only in the Generation record, and the content tiers.
