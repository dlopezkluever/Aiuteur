// The only writer of the orchestrator's run state (runs.json). V1 coordination boundary: ONE logical coordinator.
// Every command of that coordinator (run-next, resume, Worker callbacks) shares this file and its lock, so read-modify-write
// is serialized and at most one launch reservation can commit a ticket or a concurrency slot. GitHub stays the authority
// for external claims (re-read inside the lock, right before reserving). This does NOT give exactly-once launches across
// independent coordinators on different machines/Orbs. The lock is held only for short transitions, never for a Worker run.
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { checkReservation, newRun, RUN_STATES, verdictProblem, type IssueNode, type PrNode, type Reservation, type TicketRun } from "./core.ts";

export type Runs = Record<number, TicketRun>;
const STALE_LOCK_MS = 5 * 60 * 1000;
const LOCK_WAIT_MS = 60 * 1000;

/** One state location for every entry point (plugin commands and the standalone dry run), so they cannot disagree. */
export const stateDir = () => process.env.AIUTEUR_STATE_DIR ?? join(homedir(), ".cache", "aiuteur-orchestrator");

export class StaleRun extends Error {
  ticket: number;
  constructor(ticket: number, expected: number, actual: number) {
    super(`run #${ticket} changed (revision ${actual}, expected ${expected}); not overwriting`);
    this.ticket = ticket;
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const optStr = (o: Record<string, unknown>, k: string) => o[k] === undefined || typeof o[k] === "string";
const optNum = (o: Record<string, unknown>, k: string) => o[k] === undefined || typeof o[k] === "number";

/** Coordination state must be exactly this shape; anything else throws so nothing infers free capacity from it. */
export function validateRuns(x: unknown): Runs {
  if (!isObj(x)) throw new Error("runs.json is not an object map of ticket -> run");
  for (const [key, r] of Object.entries(x)) {
    const bad = (why: string) => new Error(`runs.json entry "${key}" invalid: ${why}`);
    if (!isObj(r)) throw bad("not an object");
    if (!/^\d+$/.test(key) || r.ticket !== Number(key)) throw bad("key does not match ticket");
    if (!(RUN_STATES as readonly unknown[]).includes(r.state)) throw bad("unknown state");
    if (typeof r.revision !== "number" || typeof r.repairAttempt !== "number") throw bad("revision/repairAttempt must be numbers");
    if (!isObj(r.failures) || !Object.values(r.failures).every((n) => typeof n === "number")) throw bad("failures must map to numbers");
    if (!["workerThreadId", "workerModel", "verifierModel", "independence", "lastCandidateSha", "lastVerifiedSha", "repairSentForSha", "blockedReason"].every((k) => optStr(r, k))) throw bad("string field has wrong type");
    if (!optNum(r, "currentPR")) throw bad("currentPR must be a number");
    if (r.workerRunning !== undefined && typeof r.workerRunning !== "boolean") throw bad("workerRunning must be a boolean");
    if (r.verdict !== undefined) { const p = verdictProblem(r.verdict); if (p) throw bad(p); }
  }
  return x as Runs;
}

export function createStore(dir: string) {
  const file = join(dir, "runs.json");
  const lock = join(dir, "runs.lock");

  const read = (): Runs => {
    let text: string;
    try { text = readFileSync(file, "utf8"); } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw e;
    }
    return validateRuns(JSON.parse(text)); // corrupt or mis-shaped state fails closed: never treated as "no runs"
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

  /** Serialized read-modify-write on fresh state, validated before it is written atomically. If `fn` throws nothing is written. */
  async function update<R>(fn: (runs: Runs) => R | Promise<R>): Promise<R> {
    await acquire();
    try {
      const runs = read();
      const result = await fn(runs);
      validateRuns(JSON.parse(JSON.stringify(runs)));
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify(runs, null, 2));
      renameSync(tmp, file);
      return result;
    } finally {
      try { unlinkSync(lock); } catch { /* already gone */ }
    }
  }

  /**
   * The only way to change an EXISTING run. `fn` receives the run as it is on disk right now. With `expectedRevision`, the
   * write is rejected (StaleRun) if anything wrote the run since the caller read it, so a command that waited on a Worker,
   * verifier or CI can never replace a newer transition with a decision derived from its old copy.
   */
  const mutate = (ticket: number, fn: (current: TicketRun) => TicketRun, expectedRevision?: number): Promise<TicketRun> =>
    update((runs) => {
      const cur = runs[ticket];
      if (!cur) throw new Error(`no run recorded for #${ticket}`);
      if (expectedRevision !== undefined && cur.revision !== expectedRevision) throw new StaleRun(ticket, expectedRevision, cur.revision);
      const next: TicketRun = { ...fn(cur), ticket, revision: cur.revision + 1 };
      runs[ticket] = next;
      return next;
    });

  return { read, update, mutate };
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
    if (verdict.ok) runs[ticket] = { ...newRun(ticket), state: "RESERVED", workerRunning: true };
    return verdict;
  });
}
