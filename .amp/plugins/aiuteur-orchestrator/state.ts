// The only writer of the orchestrator's run state (runs.json). V1 coordination boundary: ONE logical coordinator.
// Every command of that coordinator (run-next, resume, Worker callbacks) shares this file and its lock, so read-modify-write
// is serialized and at most one launch reservation can commit a ticket or a concurrency slot. GitHub stays the authority
// for external claims (re-read inside the lock, right before reserving). This does NOT give exactly-once launches across
// independent coordinators on different machines/Orbs. The lock is held only for short transitions, never for a Worker run.
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkReservation, newRun, type IssueNode, type PrNode, type Reservation, type TicketRun } from "./core.ts";

export type Runs = Record<number, TicketRun>;
const STALE_LOCK_MS = 5 * 60 * 1000;
const LOCK_WAIT_MS = 60 * 1000;

export function createStore(dir: string) {
  const file = join(dir, "runs.json");
  const lock = join(dir, "runs.lock");

  const read = (): Runs => {
    try { return JSON.parse(readFileSync(file, "utf8")); } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw e; // corrupt state fails closed: never treat it as "no runs"
    }
  };

  async function acquire() {
    mkdirSync(dir, { recursive: true });
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
      try { closeSync(openSync(lock, "wx")); return; } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        try { if (Date.now() - statSync(lock).mtimeMs > STALE_LOCK_MS) unlinkSync(lock); } catch { /* released meanwhile */ }
        if (Date.now() > deadline) throw new Error("timed out waiting for the orchestrator state lock");
        await new Promise((r) => setTimeout(r, 15));
      }
    }
  }

  /** Serialized read-modify-write on fresh state, written atomically. If `fn` throws nothing is written. */
  async function update<R>(fn: (runs: Runs) => R | Promise<R>): Promise<R> {
    await acquire();
    try {
      const runs = read();
      const result = await fn(runs);
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(runs, null, 2));
      renameSync(tmp, file);
      return result;
    } finally {
      try { unlinkSync(lock); } catch { /* already gone */ }
    }
  }

  const put = (run: TicketRun) => update((runs) => { runs[run.ticket] = run; });
  return { read, update, put };
}
export type Store = ReturnType<typeof createStore>;

/**
 * Commit a launch for exactly `ticket`: inside the lock, re-read live GitHub, re-validate that ticket and the cap, and only
 * then durably record RESERVED. No Worker may be started unless this returns ok. Never substitutes another ticket.
 */
export async function reserveLaunch(
  store: Store,
  snapshot: () => Promise<{ issues: IssueNode[]; branches: string[]; prs: PrNode[] }>,
  ticket: number,
  cap: number,
): Promise<Reservation> {
  return store.update(async (runs) => {
    const g = await snapshot();
    const verdict = checkReservation(ticket, g.issues, g.branches, g.prs, Object.values(runs), cap);
    if (verdict.ok) runs[ticket] = { ...newRun(ticket), state: "RESERVED" };
    return verdict;
  });
}
