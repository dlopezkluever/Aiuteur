# A Take is an assembly of Segments, so over-length shots stay one clip

Status: accepted (Wayfinder #55)

A Shot is one continuous camera moment and one clip. A generator can produce only a model-specific duration per call, and extension exists on some models only. The limit is absorbed **below the Shot**: a Take is an assembly of one or more **Segments**, each an immutable artifact made by one Generation. A shot that fits one call has one Segment and its media is the Take's media. A longer shot is realized as a dependency-ordered Batch of Segment Generations (provider-native extension where available, otherwise stitching from the last still of the previous Segment), and a deterministic assembly creates the Take only after every Segment succeeded. The realization plan is computed at package time from the model's capability profile and recorded on the Generations. The Shot, the plan, the edit, selection and export never see the split. A new Take can reuse earlier Segments and regenerate from part k. Details: `docs/domain/SHOT-MODEL.md` §7.

## Considered options

- **Split the long shot into several Shots.** Rejected: changes the creator's shot structure and the edit, breaks "one shot, one clip", and puts a generator's limit into creative structure (Constitution §7.3).
- **Force a maximum shot length.** Rejected: V1's mandatory 8-second shot, explicitly rejected as product law.
- **Store the realization plan on the Shot.** Rejected: it is a function of the chosen model, so it would drift when the model changes. Recording it on the Generations keeps the Shot provider-neutral.
- **One Generation with an internal multi-step job.** Rejected: hides per-part cost, failure, retry and reuse. Segment Generations reuse the existing Batch, retry and spend rules (JOB-LIFECYCLE §4, R8, R9) with no new lifecycle.
- **Segments inside a Take, one Generation per Segment (chosen).** Short and long shots share one pipeline (a Take always has 1..n Segments); partial results survive; "regenerate from part k" needs no state on the Shot.

## Consequences

- The capability profile (#66) must expose duration limits, extension rules and frame support so planning is computed, not hard-coded.
- Segment prompts must be verified partitions of the Shot's own action and dialogue (no new story).
- Audio continuity across stitched joins is not guaranteed; extension-native paths and supplied Performances do better. This is recorded as a capability limit.
- Segment Media is shared between Takes, so purge and storage accounting follow Media references (#72).
