# Aiuteur Wayfinder V2: Creator Ratification Record 6

Date: 2026-10-25. Source: the final creator ratification grill with Daniel Lopez-Kluever, creator and owner, limited to the five creator sign-off items of the [final audit](FINAL-AUDIT-79.md) for Wayfinder map #49. [Session thread](https://ampcode.com/threads/T-01a17369-4012-72a9-8149-d634e1c3e07c).

Status: **authoritative creator-decision source.** This record controls where it changes Records [1](CREATOR-RATIFICATION-RECORD.md) to [5](CREATOR-RATIFICATION-RECORD-5.md), the final audit's provisional defaults, an ADR or a current doc. Where it is silent, earlier decisions stand. The Product Constitution remains above all records; the amendments in §3 were ratified in this session and are applied to its body and amendment log.

Identifiers: voice **V6.1–V6.7**, synthetic media **S6.1–S6.3**, location coverage **L6.1–L6.6**, media backup **B6.1–B6.5**, stage-entry spend **E6.1–E6.3**.

## 1. CR-69.1: generated speech in a Character's Voice (VOICE-AND-PERFORMANCE §11)

**Decision: Option A, extended.** The provisional default is confirmed and widened. Option B (no spoken-line action) is rejected.

- **V6.1 A Voice is a persistent, reusable voice identity**, not only a description the video model is hoped to follow. To generate speech it must be cloned, stock or **designed**. A designed Voice comes from a voice-design generation from the description: the creator picks one preview, and that saved audio becomes the Voice's fixed identity, with basis `synthetic` and no attestation needed. A description-only Voice still informs native dialogue. "Reusable" means across the whole film inside the project; a cross-project voice library stays LATER (personal library, §15.3).
- **V6.2 Three supported paths for a dialogue line**, all explicit, priced and creator-initiated:
  1. **Generate as Character Voice** (`audio.speech`, the Spoken line): the exact line text and delivery notes in the Character's Voice. No performance needed. It becomes the line's chosen Line audio.
  2. **Performance → Character Voice** (`audio.transform`): unchanged from #69.
  3. **Native → Character Voice** (new, optional, best-effort): a native Take the creator likes has its speech transformed into the Character's Voice, producing a new **revoiced Take** derived from the source Take. The picture is reused, the source Take is never altered, and the revoiced Take is not selected automatically. It is offered only when the shot has one speaking Character or the Offering declares speaker isolation; otherwise it is unavailable with the reason. Recorded limits: wrong or garbled native words carry through; a length change beyond tolerance is flagged `timing-not-preserved`; ambience and sound effects may be lost or altered by voice isolation. Native wording is not creator truth, so this path never offers write-back. It does not replace path 1 where exact words matter.
- **V6.3 Cloned human voices stay available**, behind the ratified authorisation gate, revocation and handle deletion (ADR 0025).
- **V6.4 Generate unvoiced lines**: a batch action in the shot's Dialogue section and for a whole scene, covering lines with no chosen Line audio. The control shows the line count and total price before the creator starts it. The existing exceptional checks still apply ($2.00, 10 Generations, unknown price, caps). Generated lines become the chosen Line audio, so existing Takes get the ordinary non-destructive `performance-changed` mark. Any wider (film-wide) scope falls under the existing bulk-by-filter rule and is not designed here. Per-line generation stays.
- **V6.5 Native dialogue stays the CORE default.** Nothing generates audio automatically (Record 2 X8).
- **V6.6 No Constitution amendment.** All three paths lie inside §11.1 (consistent character voices; voice transformation).
- **V6.7 Build order:** IW2, after BAR. Speech and the batch action come after transform; the revoice path comes last. Each is simply unavailable when no Offering supports it.

## 2. CR-79.1: synthetic-media legal-role review (OPERATIONAL-BASELINE §15)

**Decision: not a BAR item and not a first-invitation gate.** Provisional Option A is rejected, and so are B and C as framed.

- **S6.1** For the initial U.S.-based, invite-only product, the settled behaviour stands: preserve provider-applied marks; never strip provenance or disclosure metadata; record `synthetic` provenance per Take in Aiuteur's own export manifest; add no Aiuteur-specific marking unless a relevant legal or platform requirement later establishes it is necessary.
- **S6.2** The EU AI Act Article 50 / C2PA legal-role review is a compliance review to do **before expanding into jurisdictions where those obligations may apply, including the EU**. It is written up in [`docs/post-release/LEGAL-AND-COMPLIANCE.md`](../post-release/LEGAL-AND-COMPLIANCE.md).
- **S6.3** **No gate, hook, checklist item, checker or product mechanism** enforces it. It appears in no BAR item, invitation gate, operator checklist, CI check or runbook. The post-release doc is reference material only. Nothing here is legal advice.

## 3. Constitution amendment: location coverage (final audit C-A)

**Decision: the audit's text is revised, and §6.4 and §15.3 are amended with it.** The amendments are ratified and applied (amendment log, 2026-10-25).

- **L6.1 Appendix B, Location coverage**, now reads: "The set of visual references needed to preserve a Location's spatial and visual identity. Coverage follows the shots and their camera paths: one canonical reference first, then named production views generated as needed to cover the directions and areas the cinematography reveals, with additional views addable at any time; or, per Location, a single establishing/background image by choice (§6.4)."
- **L6.2 §6.4, "Shots know their location"**, now reads: "Every shot is associated with its location and, where coverage exists, the direction or directions needed to cover the space the shot reveals, without the creator having to manage that manually."
- **L6.3 A shot resolves one or more ordered Directions** (ADR 0003 amended). The criterion is the space the shot reveals, never a camera-movement label: a static wide shot may need several, and a small pan may need one. The AI proposes the Direction or ordered Directions from the shot's cinematography at shot planning, as an editable AI-made choice. This is the default, with **no advanced setting**. Nothing generates until the creator starts the priced coverage action. "Multi-direction by default" in the old up-front sense is not restored: only the coverage the actual production needs is generated.
- **L6.4 Fit keeps path coverage.** When an Offering accepts fewer location references than a shot resolved, Fit chooses the subset that best covers the revealed camera path, never an arbitrary one, and reports a reference-quality warning when the path cannot be fully covered. The selection method is spec-level.
- **L6.5 Single-image mode stays**, as the creator's per-Location choice. When a shot reveals more than that image covers, it gets a quiet reference-quality note and never a block.
- **L6.6 Location spatial layout is LATER** (§15.3, new row): "Directions may later participate in a Location spatial model, which may include named areas, relative relationships, orientation and optional layout references." The extensibility constraint for V2 is that it must not assume Directions are unrelated images: a Direction keeps its label, description and optional opposite, and nothing prevents relating Directions to a later spatial model. Nothing is built now, and "areas" is not fixed as the future abstraction.

## 4. Media backup (final audit C-B; Record 2 P12)

**Decision: Option B. Media joins the backup floor before the first non-owner invitation.** Option A (keep deferring) is rejected; it is superseded here.

- **B6.1 An independent media copy**: a scheduled job copies new committed media from R2 to **Backblaze B2** (the current choice, portable behind the copy tool), under a separate account and credentials that cannot delete. Content-addressed immutable keys make each run a set difference.
- **B6.2 Bucket Lock on the primary.** A retention-based Bucket Lock on the primary R2 bucket, for committed media (`m/`) only, is defence in depth against deletion inside the Cloudflare boundary. Staging, rendition and export prefixes stay deletable. The B2 copy protects a different failure domain: losing, suspending or compromising the Cloudflare account. Both are required.
- **B6.3 Restore test.** The single restore test before the first non-owner invitation (P12.2) also restores a sample of media from the B2 copy and verifies it.
- **B6.4 Scope class.** These are operations work on the path to BAR (BUILD-SEQUENCE BAR item 4), not CORE product slices. R2 is the CORE storage path from T0; the copy and the lock must exist before any creator other than the owner is invited.
- **B6.5 Still deferred (P12.3):** retention periods (including the lock's), copy frequency, drill cadence, a second vendor for the database, the full manual drill gate, and further no-delete credential design. Purge (post-BAR): purged media is unreachable at once; locked primary objects and B2 copies are removed when retention allows. The P8-purge promise ("gone from Aiuteur at once; any remaining copies expire within a stated retention window") covers both and must state the window before purge ships.

## 5. Stage-entry spend (final audit C-C; Record 3)

**Decision: Record 3 stays intentional. No Constitution amendment.**

- **E6.1** Constitution §13.4(2) is satisfied because **entering a document-creating stage can itself be the creator's explicit initiation of a specifically ratified, bounded initial-drafting operation**. There are exactly two such cases:
  - entering an empty Treatment stage initiates its configured initial Treatment drafts (about $0.18 for the default 3; Record 3 §1–2);
  - entering a scene with no Shot plan initiates the ratified initial scene-plan draft, under its stricter rule: automatic only when the estimate is below $0.05, otherwise one click on **Draft plan · $x** (Record 3 §3).
- **E6.2** The authorisation is tied to those two stage-entry behaviours. It is **not** a general permission for arbitrary auto-generation, and adding another trigger needs a creator decision. Exceptional conditions ($2.00, 10 Generations, unknown price, caps, bulk-by-filter) still stop the operation and show the inline spend ticket.
- **E6.3** **Media generation always requires a separate explicit action.**

## 6. Reconciliation applied

- Constitution: §6.4, §15.3, Appendix B, amendment log.
- Voice: `docs/domain/VOICE-AND-PERFORMANCE.md`, ADR 0025, and the voice lines of the provider, package, AI-map and build-sequence docs.
- Location coverage: ADR 0003, `docs/domain/ENTITIES-AND-LOOKS.md`, `SHOT-MODEL.md`, `GENERATION-PACKAGE.md`, and the coverage lines of the UX docs.
- Synthetic media and backup: `docs/architecture/OPERATIONAL-BASELINE.md`, ADR 0018, `PERSISTENCE-AND-MEDIA.md`, `BUILD-SEQUENCE.md`, and the new `docs/post-release/LEGAL-AND-COMPLIANCE.md`.
- `GLOSSARY.md` for changed terms, `FINAL-AUDIT-79.md` sign-off section, and issue #49.

With this record, none of the final audit's creator sign-off items remains provisional.
