# Media is private, project-owned, and copied, never shared across projects

Status: accepted (Wayfinder #72)

User media must be private (Constitution §18.4). V1 used public buckets with permanent URLs, orphaned objects when rows were deleted, deleted from the wrong bucket, and referenced buckets it never created (legacy 05 §5; FACT-0172, FACT-0174, FACT-0236). Nothing inside a project may be lost, yet a project must be duplicable and later purge-able as a unit (ratification Record 1 M7), and a provider's own copy of an output expires within about an hour.

Decision: **Committed Media** is immutable, content-hashed, belongs to exactly one project, and lives in a private bucket under `a/<account>/p/<project>/m/<hash>`, with probe facts frozen at ingest. A provider output is fetched to a staging key derived from the Job id, verified (decode, type, size, hash, probe), promoted, and only then is the Media row inserted in the same transaction as its Attempt and the Job's success. Access is `media.access`: a signed URL for one key, short-lived, never public, never a provider URL; clips that cannot scrub get a **playback rendition**, not altered bytes. Staging, renditions and export builds are the only things ever collected; committed Media is deleted by nothing but project or Account purge. **Duplicating a project copies its blobs under the new prefix**, so no object or row spans two projects. Provider-held resources (a cloned voice) are not Media: they are Account-owned handles scoped to one project and one Voice, created lazily, never shared or copied, and released on retire, revoke and purge ([ADR 0025](0025-a-dialogue-line-has-one-chosen-line-audio-and-voice-work-passes-an-authorisation-gate.md)).

## Considered options

- **Share blobs across projects with reference counting.** Rejected: a counting bug or a race between purge and duplicate destroys another project's media, which no-loss forbids, and a key outside the prefix is reachable from two projects.
- **An Account-wide content-addressed store with per-project links.** Rejected for the same reasons; saves storage worth cents.
- **Public bucket with unguessable URLs.** Rejected: permanent bearer URLs are what §18.4 forbids.
- **A managed video service.** Not needed for 4 to 12 second clips (#73); range reads from signed URLs suffice, with a rendition as the escalation.

## Consequences

- Purge is a row delete plus a prefix delete with a verification listing; duplicate is a resumable background copy followed by one database transaction, so a project appears whole or not at all.
- Storage cost of a duplicate is the copy, about thirty cents a month for a 20 GB project at R2-class prices.
- `BlobStore.delete` is confined to staging, rendition and export prefixes; committed-media deletion has one caller.
- Backups (Record 2 P12.1: daily dumps and WAL archive, off the machine), the B2 media copy and Bucket-Locked primary media (Record 6 §4) cannot delete one project at once, so purged data stays in them until it ages out within the retention window stated at purge time (Record 2 P8-purge; the window is deferred, Record 2 P12.3); every restore replays the purge log (#75).
- The duplicate into a new version of a major import (Record 2 D52.2) copies only the Media referenced by its carried upstream closure; the rule is otherwise the same.
- Copy-on-use for the LATER library is the same copy with a closure of Media and no live link.

Detail: `docs/architecture/PERSISTENCE-AND-MEDIA.md` §§7–9.
