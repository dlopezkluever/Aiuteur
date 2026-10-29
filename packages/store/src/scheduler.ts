import { Pool } from "pg";
import { accountIdSchema, JOB_STATES, type JobId } from "@aiuteur/contract";
import { z } from "zod";
import { assertRuntimeRole } from "./postgres.ts";
import type { Clock, Ids, JobRow, Leased, Scheduler, WriteTx } from "./index.ts";

/**
 * FC5 Draft: the Postgres `Scheduler` adapter (RUNTIME §4.2, ADR 0017). It connects as the `scheduler` role, which can only
 * execute the claim, extend, release and wake functions; they return ids, states and lease tokens, never tenant content
 * (RUNTIME §5). The work itself runs later in an `app` transaction under the Scope rebuilt from the returned Account.
 */
export async function createPostgresScheduler(connectionString: string, options: { clock: Clock; ids: Ids; leaseMs: number }): Promise<Scheduler & { close(): Promise<void> }> {
  const pool = new Pool({ connectionString });
  try { await assertRuntimeRole(pool, "scheduler"); } catch (error) { await pool.end(); throw error; }
  const at = () => new Date(options.clock.now()).toISOString();
  return {
    // The row is the queue (RT1): enqueue is the insert, in the creating transaction, due now.
    enqueue: (wtx: WriteTx, job: JobRow) => wtx.insertJob(job),
    async claim(max: number, only?: JobId) {
      const { rows } = await pool.query<{ job_id: string; account_id: string; state: string; lease_token: string }>(
        "SELECT * FROM accounts.job_claim($1, $2, $3, $4, $5)", [max, at(), options.leaseMs, options.ids.uuid(), only ?? null]);
      return rows.map((row): Leased => ({ jobId: row.job_id as JobId, accountId: accountIdSchema.parse(row.account_id), work: "step", stateSeen: z.enum(JOB_STATES).parse(row.state), leaseToken: row.lease_token }));
    },
    async extend(lease: Leased) {
      const { rows } = await pool.query<{ ok: boolean }>("SELECT accounts.job_extend($1, $2, $3, $4) AS ok", [lease.jobId, lease.leaseToken, at(), options.leaseMs]);
      return rows[0]?.ok === true;
    },
    async release(lease: Leased, dueAt?: number) {
      await pool.query("SELECT accounts.job_release($1, $2, $3)", [lease.jobId, lease.leaseToken, new Date(dueAt ?? options.clock.now()).toISOString()]);
    },
    async wake(jobId: JobId) {
      await pool.query("SELECT accounts.job_wake($1, $2)", [jobId, at()]);
    },
    close: () => pool.end(),
  };
}
