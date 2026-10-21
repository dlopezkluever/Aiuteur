# Story documents are owned block documents with inline provenance runs

Status: accepted (Wayfinder #51)

The Treatment (and each treatment Option), Beat Sheet and Master Narrative are stored in one canonical form: an ordered tree of blocks with permanent opaque ids, whose prose is a list of runs, each carrying a provenance (`creator`, `imported`, `ai_generated`, `ai_edited`). Dialogue is its own block kind (speaker, delivery note, line), so it is machine-addressable as the AI map requires. Plain text, Markdown, screenplay and editor JSON are projections or import formats only; they are never stored as truth and never parsed back into it.

V1 kept the script in four forms with a non-idempotent round trip and about eight disagreeing parsers (legacy 06 §§7.5, 8). Structure, identity and provenance are therefore explicit data, never recovered from prose.

## Considered options

- **Plain text or Markdown with stand-off anchors.** Rejected: offsets drift, structure and provenance must be re-derived on every save, and block identity would be heading text. This is V1's failure.
- **Editor-native rich-text JSON as the permanent record.** Rejected as the record: it couples history to an editor library's schema and has no native stable ids. The editor is a transient, losslessly adapted view of the model.

## Consequences

- Provenance is exact to the character and survives edits by construction. The commit path computes it from the splice; models never report it.
- Hand editing writes a continuous working copy. A Revision is created only by a named cause (settled hand-edit session, AI generation, applied targeted rewrite, sync, import, restore). Opening, browsing and no-op saves create none. History is uncapped.
- A targeted rewrite replaces only the selection, applies directly, is verified byte-identical outside it (guard G4), and yields one Revision.
- Cost: we own one schema and an editor adapter whose lossless round trip must be tested.

Detail: `docs/domain/STORY-DOCUMENTS.md`.
