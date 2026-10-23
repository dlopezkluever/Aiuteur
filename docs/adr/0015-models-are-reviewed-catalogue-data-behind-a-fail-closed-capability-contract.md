# Models are reviewed catalogue data behind a fail-closed capability contract

Status: accepted (Wayfinder #66)

The model market churns (the Sora 2 API ended 2026-09-24; the Veo 3.1 preview endpoints of the Gemini API shut down 2026-10-22), and V1 scattered model ids across about ten files and let a mock provider become the default. The Constitution requires a sensible default with an optional per-project and per-shot override, and a product that depends on no specific provider (§10.3, §15.1, §16 principle 13).

Decision: a **Model** (what overrides and defaults store) is reached through **Offerings** (that model on one provider surface, with an adapter, price entries, lifecycle status and a **capability profile**). The profile, the **Catalogue** of all Offerings, rankings and tiers are reviewed, versioned data with evidence per field; an unknown field means the conservative reading, so an undocumented capability does not exist for dispatch. Provider rules are conditional constraints in one declarative form evaluated by one pure function, so Fit, the realization plan, estimate and selection cannot disagree. **Adapters only transport**: they serialise the one recorded Rendered request, submit, observe, cancel, fetch and map errors into a closed vocabulary; they never choose a model, build text, retry, hold a key or write a record. **Selection** (shot override, project choice, Automatic under an operator policy of eligibility, hard filter on unmet-blocking needs, bias and editorial quality rank) happens before the action, is shown and is recorded; after a Generation exists nothing substitutes its Offering, and a failed model is never replaced behind the creator's back. Unmet needs are computed before spend with a closed set of verdicts; a blocking need creates no Generation and has exits, never "send anyway". Profiles are immutable content-addressed snapshots kept forever. Over-length shots are planned from the profile by a deterministic function (extension, else stitch from the last still, else blocked). Details: `docs/domain/PROVIDERS-AND-MODELS.md`.

## Considered options

- **Adapter-resident knowledge** (each adapter class holds its models' limits in code). Rejected: the compiler would call vendor-aware code, against #65's rule that no per-vendor rule lives in the compiler, and "unknown" would be a forgotten default.
- **One aggregator as the abstraction.** Rejected as the abstraction: a single vendor's schema and catalogue would become the product's dependency (§15.1). Aggregators remain ordinary Offerings.
- **Runtime capability discovery.** Rejected as a source of truth: providers rarely publish limits machine-readably, and an unreviewed claim would become a silent promise. Kept only as a drift check that can suspend an Offering or alert, never edit a profile.
- **Silent runtime fallback to another model or route on failure.** Rejected: it changes price, limits and rewrites without the creator, and is V1's silent mock default in another form. Substitution is a visible selection before the action or the creator's own act.
- **Computing "quality" automatically.** Rejected: no measure of a better film exists. The ranking is editorial, with evidence and review dates.

## Consequences

- Adding, repricing or retiring a model is a data change with evidence and golden fixtures; layers, the Shot, the plan code and the lifecycle do not change.
- A search for vendor names or model ids outside the Catalogue and adapters must find nothing.
- Changing a default, a project choice or a shot override never marks work out of date.
- Operations must run a deprecation watch, review ages and conformance probes; probes can suspend or alert only.
- A fake Offering can exist only in test deployments and can never be a default.

## Amendment (Creator Ratification Record 2, D66 and D61.4)

Automatic biases are ratified: video balanced (the best-ranked model whose typical take stays under the $2.00 one-click line), images, entity images and writing quality, fact-check and utility calls economy, audio quality; the creator may pick a specific model per project or per shot. CineBlock's world model is the `world.generate` operation class, an ordinary Catalogue provider under the same rules: operator-paid until BYOK, BYOK-capable afterwards, price on the initiating button, normal spend rules. Its output is a blocking stage, never a frame or a video input.
