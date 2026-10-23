# Locks are server-enforced domain state, with impact-confirmed edit-through

Status: accepted (Wayfinder #54)

A lock is an append-only stream of lock and unlock Decisions on a scope, enforced by one write gate in the domain operation layer, so it holds for every path (UI, bulk, AI-applied, import, restore, write-back). The server computes the impact (chosen downstream work reached through lineage, plus money at risk) and a locked edit proceeds only with a confirmation carrying the impact it was shown; zero dependants needs no step. Unlock and edit-through are always available and cascade nothing. Details: `docs/domain/LINEAGE-AND-STALENESS.md` §6.

## Considered options

- **UI-only or trigger-only locks.** Rejected: V1's locks held in one screen or only changed a status; no route checked them (legacy 10 B10), and the unlock-impact dialog never opened (B4).
- **Hard blocking locks.** Rejected: contradicts Constitution §13.4 and principle 9.
- **Locks that mark dependants on unlock.** Rejected: V1's cascade (R1–R3) marked work for a non-change; markers come only from content drift.

## Consequences

- Module architecture (#71) must route every mutation through the gate; persistence (#72) must keep lock state and the write in one transaction.
- AI results landing on a locked scope are held as Options.
- Which scopes get locks and the UX are #63's, now resolved (Record 1 #63, `docs/ux/TRUST-SIGNALS-AND-LOCKS.md`): Master Narrative acceptance locks by default; identity approval, a set world/Visual Style, and a shot plan at frame generation offer a lock; Mark final is a voluntary lock on a take Slot. Choosing a Take is a reversible selection, not a lock or a commitment.
