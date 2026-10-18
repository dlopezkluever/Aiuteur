# 00 README: Aiuteur / WizardDirector Product Knowledge Base

A lossless-on-ideas, lossy-on-bloat compression of the legacy Markdown documentation corpus (about 120 product and planning docs, roughly 2.1 MB) into 1,885 atomic product ideas. It records what was **envisioned, discussed, designed, considered, requested, or proposed**. It is NOT a statement of how the current implementation behaves; reconstruct that from the code separately.

Language convention: "was conceived to", "legacy docs describe", "one considered approach". Alternatives are kept side by side (Options blocks, `[alt]` tags); the knowledge base never picks a winner. Deferred, rejected, and post-MVP ideas stay, tagged accordingly.

## How to read it

| Need | Read |
|---|---|
| The quick picture of intent | 14, then 01 |
| Every capability at a glance (grouped, with ids) | 03 |
| One topic in depth, with framing and options | the thematic doc: 01 to 11 |
| The most inventive / easy-to-lose ideas | 12 |
| Where legacy docs disagree | 13 |
| Machine-friendly flat inventory, one idea per line | 15 |

## Documents

| # | Document | Prefix | Holds |
|---|---|---|---|
| 01 | Product Model | PHIL | purpose, users, positioning, philosophy, object model, principles, roadmap discipline |
| 02 | Creative Workflow | FLOW | 12-stage pipeline, gating, shortcuts, review/repair routing, workflow variants |
| 02B | Project Intake & Source Material | INPUT | input modes, Streamline intake, clarification, source classification, import |
| 03 | Functional Capabilities | (ids cited) | grouped catalog of every capability, option, and convenience |
| 04 | Creative State & Continuity | CONT | context inheritance, scene state, condition tags, end states, frame chaining, continuity links |
| 05 | Writing & Story | STORY | treatments, beats, scripts, dialogue, rewriting, reconciliation, lore |
| 06 | Visual Development & Assets | ASSET | characters, props, style capsules, references, scene instances, variants |
| 06B | Locations & Environments | LOC | location identity, camera directions, coverage, established views, resolvers, fallbacks |
| 07 | Shots, Cinematography & Previs | SHOT | shot lists, camera, blocking, previs/3D tool, composition control |
| 08 | Generation & Prompting | GEN | frame/video prompts, references, providers, regeneration, cost and credits |
| 09 | Performance, Audio & Editing | AV | dialogue, voices, audio, review, editing, export, post |
| 10 | UX, Control & Iteration | UX | locks, warnings, versions, branches, invalidation, navigation, convenience tooling |
| 11 | Alternative & Unbuilt Ideas | ALT | directions outside the dominant workflow |
| 12 | High-Value Gems | | curated, id-linked; not a recommendation |
| 13 | Doc Contradictions | | preserved disagreements with ids and provenance |
| 14 | Product Intent | | normalized creator intent, strong vs exploratory |
| 15 | Full Idea Ledger | all | flat catalog of all 1,885 ideas |

## Conventions

- **Ids**: `WD-IDEA-<PREFIX>-<NNN>`, stable. Gaps in numbering are ideas that were merged into a surviving id during reconciliation (the survivor carries their nuance, tags, and sources). A bullet holds one idea; sub-bullets list its specific modes.
- **Tags** (in brackets): `impl` legacy docs describe it as built · `planned` intended for the build · `alt` one option among alternatives · `future` deferred, post-MVP, or speculative · `rejected` replaced or dropped (with what replaced it) · `voice` the creator stated it directly · `idea` status unclear. No tag means a plain design statement.
- **Provenance**: `‹src: basename, basename›` gives up to a few legacy file names (without `.md`) for unusual, conflicting, single-mention, creator-voice, or nuanced ideas. Widely repeated ideas omit it.
- **Cross-references**: "(see 04)" refers to a document number; `WD-IDEA-…` ids refer to specific ideas. Domain ownership: each idea lives in one document; related ideas in other documents are linked with "Related:" clauses.
- **Statuses are legacy statements**: `impl` means the old docs call it built, not that code was verified. Verify against the code.

## Provenance of this base

Seventeen extraction passes over the corpus produced about 2,500 raw idea lines; eleven thematic syntheses merged them by domain; independent fidelity checks and four cross-domain reconciliation passes then repaired truncations, corrected status tags (deferred vs rejected, post-MVP vs planned), merged about 330 duplicate ideas, and added missing nuance; a final omission sweep over the original docs found the base substantially complete (one nuance added).
