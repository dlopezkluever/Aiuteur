import { TERMINAL_JOB_STATES, type GenerationId, type JobId, type JobState, type ProjectId } from "@aiuteur/contract";
import type { Clock, JobChange, JobRow, Leased, Scheduler, WriteTx } from "@aiuteur/store";

// Draft FC9 (JOB-LIFECYCLE §2–§3, §11–§12; RUNTIME §4.2): the Job state machine, its deadlines and the one due time,
// `enqueue/claim/transition/settle`, over the FC5 `Scheduler` port. Every transition is a compare-and-set on
// (Job, expected state, lease token); terminal states are absorbing. `jobs` holds no creative truth.

const MINUTE = 60_000;
/** Default state deadlines (JOB-LIFECYCLE §2), for the text family; adapters may tune. Other families arrive with T0b/T0c. */
export const TEXT_DEADLINES_MS: Readonly<Partial<Record<JobState, number>>> = Object.freeze({ queued: 60 * MINUTE, submitting: 2 * MINUTE, running: 2 * MINUTE, fetching: 10 * MINUTE, cancelling: 5 * MINUTE });

/** The transitions of JOB-LIFECYCLE §3 (provider class). Anything else is refused. */
export const TRANSITIONS: Readonly<Record<JobState, readonly JobState[]>> = Object.freeze({
  waiting: ["queued", "cancelled"],
  queued: ["submitting", "cancelled", "failed"],
  // Fast path: a synchronous text result returns inside submit, so submitting → succeeded (JOB-LIFECYCLE §2).
  submitting: ["queued", "running", "fetching", "succeeded", "failed", "cancelling", "cancelled"],
  running: ["fetching", "failed", "cancelling"],
  fetching: ["succeeded", "failed", "cancelling"],
  cancelling: ["cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
});

/** The lease no longer holds: the Job moved or another holder took it. The caller discards its result (RUNTIME §4.2). */
export class LeaseLost extends Error {
  readonly jobId: JobId;
  constructor(jobId: JobId) { super(`lease lost on ${jobId}`); this.jobId = jobId; }
}

export function createJobs(options: { scheduler: Scheduler; clock: Clock }) {
  const { scheduler, clock } = options;
  const iso = (ms: number) => new Date(ms).toISOString();
  const deadline = (state: JobState, at: number) => {
    const ms = TEXT_DEADLINES_MS[state];
    return ms === undefined ? null : at + ms;
  };

  async function transition(wtx: WriteTx, lease: Leased, from: JobState, to: JobState, fields: Pick<JobChange, "operationRef" | "failureClass" | "billed" | "reason"> = {}): Promise<boolean> {
    if (!TRANSITIONS[from].includes(to)) throw new Error(`no transition ${from} → ${to}`);
    const job = await wtx.job(lease.jobId);
    if (!job || job.state !== from || job.leaseToken !== lease.leaseToken) return false;
    const at = clock.now();
    const terminal = TERMINAL_JOB_STATES.includes(to);
    const until = deadline(to, at);
    const leaseEnds = job.leaseExpiresAt === null ? Infinity : Date.parse(job.leaseExpiresAt);
    const change: JobChange = terminal
      ? { ...fields, state: to, dueAt: null, deadlineAt: null, leaseToken: null, leaseExpiresAt: null, updatedAt: iso(at) }
      // One due time: the earlier of the lease's expiry and the new state's deadline (RUNTIME §4.2).
      : { ...fields, state: to, deadlineAt: until === null ? null : iso(until), dueAt: iso(Math.min(leaseEnds, until ?? Infinity)), updatedAt: iso(at) };
    if (!await wtx.updateJob(lease.jobId, { state: from, leaseToken: lease.leaseToken }, change)) return false;
    await wtx.appendEvent({ type: "job.state_changed", jobId: lease.jobId, generationId: job.generationId, state: to, occurredAt: iso(at) });
    return true;
  }

  return {
    /** A new provider-class Job, queued and due now, with the admission deadline. */
    newJob(input: { readonly jobId: JobId; readonly generationId: GenerationId; readonly projectId: ProjectId; readonly run: number }): JobRow {
      const at = clock.now();
      return { ...input, class: "provider", state: "queued", dueAt: iso(at), deadlineAt: iso(deadline("queued", at)!), leaseToken: null, leaseExpiresAt: null, operationRef: null, failureClass: null, billed: null, reason: null, createdAt: iso(at), updatedAt: iso(at) };
    },
    /** Inside the creating transaction: the Job is durable before anything runs (JOB-LIFECYCLE §1 rule 3), with its event in the outbox. */
    async enqueue(wtx: WriteTx, job: JobRow): Promise<void> {
      await scheduler.enqueue(wtx, job);
      await wtx.appendEvent({ type: "job.state_changed", jobId: job.jobId, generationId: job.generationId, state: job.state, occurredAt: job.createdAt });
    },
    claim: (max: number, only?: JobId) => scheduler.claim(max, only),
    release: (lease: Leased, dueAt?: number) => scheduler.release(lease, dueAt),
    /** A compare-and-set: false when the lease was lost, so the caller's result is discarded. */
    transition,
    /**
     * The settler seam (`settle(job, outputs, settler)`, MODULE §3.3): in the caller's one transaction, the owner's
     * settler attaches and records, then the Job moves to its terminal state with its outbox event. A lost lease throws,
     * so the whole transaction, attachment included, rolls back and nothing settles twice.
     */
    async settle(wtx: WriteTx, lease: Leased, from: JobState, to: "succeeded" | "failed", fields: Pick<JobChange, "operationRef" | "failureClass" | "billed" | "reason">, settler: (wtx: WriteTx) => Promise<void>): Promise<void> {
      await settler(wtx);
      if (!await transition(wtx, lease, from, to, fields)) throw new LeaseLost(lease.jobId);
    },
  };
}
export type Jobs = ReturnType<typeof createJobs>;
