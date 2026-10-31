import { Pool } from "pg";
import { assertRuntimeRole } from "./postgres.ts";

/**
 * The durable liveness signal of OPERATIONAL-BASELINE §7.2, through the `scheduler` identity (migration 8). The worker
 * writes `tick`; `web` reads ages for `/healthz/deep`. Numbers only: no Account, no Job, no content.
 */
export interface Liveness {
  /** The worker's proof of life, stamped by the database clock. */
  tick(): Promise<void>;
  /** Milliseconds since the last tick (null: the worker has never ticked) and since the oldest overdue due time (null: nothing overdue). */
  read(): Promise<{ readonly workerAgeMs: number | null; readonly oldestOverdueMs: number | null }>;
  close(): Promise<void>;
}

export async function createLiveness(connectionString: string): Promise<Liveness> {
  const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 3_000 });
  pool.on("error", () => undefined);
  try { await assertRuntimeRole(pool, "scheduler"); } catch (error) { await pool.end(); throw error; }
  const number = (value: string | null) => (value === null ? null : Number(value));
  return {
    async tick() { await pool.query("SELECT operator.worker_tick()"); },
    async read() {
      const { rows } = await pool.query<{ worker_age_ms: string | null; oldest_overdue_ms: string | null }>("SELECT * FROM operator.liveness()");
      return { workerAgeMs: number(rows[0]?.worker_age_ms ?? null), oldestOverdueMs: number(rows[0]?.oldest_overdue_ms ?? null) };
    },
    close: () => pool.end(),
  };
}
