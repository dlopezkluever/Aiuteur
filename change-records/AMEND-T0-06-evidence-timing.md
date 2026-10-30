# Amendment record: timing of two evidence obligations of T0-06 (#103)

Format: SWARM-READINESS §3.2. Status: **proposed; owner directive given in the #103 worker session; integration-thread sign-off pending.** Nothing here changes a frozen contract (FC1 to FC11 are Draft until T0 exit, #118), so this is a sequencing amendment of acceptance evidence, not an FC amendment. It is recorded here because #103's acceptance text and VERIFICATION §9 would otherwise be unsatisfiable.

## The failing real case

#103's acceptance names "VC2 guards over recorded adversarial proposals", and VERIFICATION §9 requires VC14 for a prompt or scaffold change (#103 adds the repair wording). Neither can exist at T0-06:

- A recorded proposal is a real model output captured from staging on synthetic input, stored with input, model snapshot and date (VERIFICATION §3.5). The first real LLM adapter and the staging smoke Account are #108 (T0-11).
- #108 is blocked by #106 (T0-09), which is blocked by #103. Producing the evidence inside #103 would put #108's work before #106.
- The VC14 eval set is seeded in VS1 (BUILD-SEQUENCE §2.2 VS1 row; issue #129, VS1-6, "The VC14 eval set is seeded and VC17 runs nightly"). Before it, no eval machinery exists.

## Classification (from the owning documents)

| Requirement | Source | Classified as |
|---|---|---|
| Deterministic G1 to G4 and G7 behaviour, REJECTED/HELD, spend admission, duplicates, G10, over authored adversarial fixtures | #103 body; AI-map §3, §5; BUSINESS §6.3 | Required and met at #103 |
| A real staging-recorded adversarial proposal replayed through the guards and the operation harness | VERIFICATION §3.5; BUILD-SEQUENCE T0a row: "VC5 passes it on a recorded proposal with an adversarial case. The same path runs once live on staging" | T0a exit evidence, which #108 owns ("New: T0a exit evidence") |
| VC14 for the Treatment scaffold and the repair wording | VERIFICATION §7.1, §9; BUILD-SEQUENCE VS1 row ("VC14 (eval set seeded)") | Eval-system requirement, first executable at #129 |
| Both of the above, before T0 or VS1 can exit | BUILD-SEQUENCE §2.2 exit evidence | Blocks #118 (T0 exit) and #130 (VS1 exit) |

Precedent: #101 (closed) merged the first Draft Treatment scaffold with `evidence: "#101 first Draft Treatment scaffold"` and no VC14 record, for the same reason; the eval set did not exist.

## The amendment

Evidence is deferred because its producing capability does not yet exist at T0-06. The requirement remains binding and moves to the first executable downstream ticket. This changes sequencing only, not the verification standard.

1. **#103** is satisfied by authored fixtures (labelled `source.kind: "synthetic"`, never called recorded proposals) and the deterministic suite. It does not claim VERIFICATION §3.5 or VC14 satisfied.
2. **#108 (T0-11)** gains a New criterion: capture a genuine adversarial proposal (altered dialogue, and the restyled-quotation case) from the real adapter on staging with synthetic input, store it with input, model snapshot and date, and replay it through the existing guards and the VC5 harness; the record cites #103.
3. **#129 (VS1-6)** gains a New criterion: VC14 is run for `treatment.draft` and the repair wording (`REPAIR_SCAFFOLD`), and the scaffold `evidence` fields are replaced with the eval report reference (currently `UNVERIFIED`). Repair rate and HELD rate are baselined for the model snapshot (VERIFICATION §7.2 tier 2).
4. **#118 (T0-21)** and **#130 (VS1-7)** may not close while item 2 or item 3 respectively is open.

No gate is waived or weakened: the standards of §3.5 and §7 are unchanged and the scaffold keeps its `UNVERIFIED` marker until the evidence exists. SWARM §3.2 forbids amending a contract to relax a gate; this moves evidence in time and keeps it blocking later milestones. The integration thread must confirm that reading.

## Consumers and migration

None in code. Issue text only: #103, #108, #129, #118, #130, plus `change-records/T0-06.md`.
