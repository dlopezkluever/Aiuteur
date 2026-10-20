# Two kinds of change (Revision, Attempt), and Generation and Job as separate records

Status: accepted (Wayfinder #50)

V1 used "version" for six different things and gave one concept several representations (legacy 04 §5, legacy 15 §§3, 6). V2 drops "version" as a model term and splits change into two kinds: an **editable object** changes only by adding a **Revision** to its history, and a **generated or uploaded artifact** is immutable and one of several **Attempts** for a **Slot**, of which one is chosen. Editing an artifact never mutates it; it yields a new Attempt.

Every AI call that produces creator-visible content, text or media, is a **Generation**: the permanent record of what was asked, with what exact inputs, at what cost, and what came of it. It is the single basis for provenance, prompt inspectability, staleness (which input Revisions it used) and spend tracking. A **Job** is the separate, operational execution of a Generation (or of other long-running work such as an export build): it may fail, be retried or be pruned, and no creative truth lives in it. A retry re-runs the same Generation in a new Job run; a deliberate regeneration is a new Generation.

## Considered options

- **One "version" concept for both.** Rejected: it is V1's failure mode, and it forces unchosen takes into the history of the shot, where "restore" would mean something different from "select".
- **Generation and Job as one object** (V1's `*_generation_jobs`). Rejected: the creator-facing record of what was asked and produced would be lost whenever execution records are pruned or retried, and failed runs would pollute the thing provenance points at.
- **Generation only for media.** Rejected: AI text actions need the same provenance, inspectability and cost record; a second mechanism would reintroduce duplication.

## Consequences

- Provenance, inspectability and cost all hang off one record type; the Generation package (#65), lineage (#54) and the job lifecycle (#67) design against it.
- Nothing creative is ever destroyed: retiring replaces deleting, and artifacts are immutable.
