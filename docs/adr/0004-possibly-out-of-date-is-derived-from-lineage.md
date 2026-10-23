# "Possibly out of date" is derived from recorded lineage, never stored as a flag

Status: accepted (Wayfinder #54)

Every Generation records, at dispatch, the exact input slices it read (unit, Revision, content fingerprint); editable objects drafted from upstream record a Basis the same way. Whether work is possibly out of date is computed by comparing what it captured with what is current now, minus the creator's recorded Keep and Reconcile decisions (Acknowledgements). The reason is the first differing captured input. Only the Acknowledgements are stored. Details: `docs/domain/LINEAGE-AND-STALENESS.md` §2.

## Considered options

- **Stored markers** (a flag or row written when upstream changes). Rejected: V1's failure mode (legacy 10 §§5, 9): flags on lock records, writes that could not take effect, non-transactional fan-out, and "outdated" with no exit. Restore, undo, duplication and bulk resolution each need a matching mass write that can drift from the content, and a second upstream change overwrites the first reason.
- **Derived from lineage** (chosen). Reading cannot write a marker; restoring clears it by content equality; duplication reproduces it by id remapping; no cascade exists to be partial.
- **Derived markers with a materialized cache.** Allowed as an optimisation only: rebuildable, updated in the same transaction as the causing append, never the source of truth.

## Consequences

- Needs an inverse index from input unit to dependants for 150–250 shot projects (#72), and owners must name input slices (#53, #55, #51) so a change marks only real consumers.
- Every Generation must capture inputs at dispatch (#65). Media Generations never capture Established Facts, so a Fact change never marks media directly (Record 2 X3).
- No module may store an "outdated" status.
