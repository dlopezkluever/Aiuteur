# A generation is compiled into one layered package that is recorded, shown and sent

Status: accepted (Wayfinder #65)

V1 built prompts in several places: the preview and the request were separate builders (the preview fields had no consumer), prompts were silently cut at 500 or 1,200 characters, a prompt could claim an image the request did not carry, aspect ratio was stored and never sent, and the visual style never reached a prompt (legacy 09 §§1.6–1.8; DEAD-0025). The Constitution requires that the exact prompt and references sent are viewable and editable per shot (§10.3, §13.5) and that nothing depends on one provider (§16 principle 13).

Decision: a pure compiler turns a snapshot of owned truth and a model capability profile into one **Package** of typed **Layers** (each owned by one domain, with its source units), ordered **carried references** with roles, and typed parameters. **Fit** maps the Package onto the model's limits by demotion and reported omission, never by cutting inside a layer; an over-limit request is not sent. **Render** (a provider dialect, data plus a pure function) turns it into a **Rendered request**, the only thing an adapter may send. The Package, Fit report and Rendered request are recorded on the Generation before any provider call, and the inspector, estimate, duplicate guard and dispatch all read that same object. Carried references are audited from the Rendered request, not from the Package. No prompt is stored as truth: creative text stays in owned truth, and the only stored prompt-shaped data is the creator's layer-addressed **Override**, which stays in effect when upstream changes and shows a quiet "base changed" note. Frame and video share one compiler: they differ by time projection and by what a pinned input already carries. Details: `docs/domain/GENERATION-PACKAGE.md`.

## Considered options

- **Text-first**: compile to one string and a reference list. Rejected: it can meet "shown equals sent" but cannot say which sentence came from which unit, so omission, precedence, override and lineage have nothing to attach to.
- **Inputs-only record, recompile when viewed.** Rejected: viewing then reflects today's compiler and scaffold, not what was sent. This is V1's preview-versus-send failure by design.
- **An LLM writes the final prompt at send time.** Rejected as default: hidden, non-deterministic, paid on every batch member, unable to guarantee verbatim dialogue or the reference list; it contradicts the AI responsibility map. Its useful part survives as a creator-invoked Override Revision.
- **Whole-text override that replaces the compiled prompt.** Rejected: it freezes silently when upstream changes. Layer-addressed items keep unedited layers following upstream and mark edited ones.
- **Typed layered Package with deterministic Fit and Render (chosen).**

## Consequences

- The capability profile (#66) must expose modes, reference caps, prompt limits with a counter, parameters, tunables and provider rewrites; no vendor rule lives in layers.
- Every adapter must be provable by wire capture to send exactly the recorded request (#76).
- Over-limit requests are blocked with exits (another model, edit, turn off an optional layer); "send anyway" is not offered because the received text could not then be described.
- Provider-side rewriting is declared, disabled where controllable and otherwise disclosed.
- Reproducibility means an exact record and a deterministic compile, not identical output.

## Amendment (Creator Ratification Record 2, P10/X3)

The per-Fact "carry into visual generation" pin and pinned Facts in the `binding` layer are removed. Established Facts bind AI drafting and revision of text and World Definition (fact-checked, R6). Media generation reads canonical creative state only (passage, shot, entities and current Looks, Visual Style, references, composition, exact dialogue, provider requirements); no Fact is injected. Contextual state overrides generic state. Global visual rules belong in Visual Style; per-shot Override `add(note)` covers one-offs.
