import { describe, expect, it } from "vitest";
import { generationIdSchema, projectIdSchema, type JobId, type JobState } from "@aiuteur/contract";
import type { Leased, Scheduler, Scope, Store } from "@aiuteur/store";
import { uuidv7 } from "../uuidv7.ts";
import type { ManualClock } from "../fake-transport.ts";

export interface SchedulerSubject {
  readonly store: Store;
  readonly scheduler: Scheduler;
  /** The clock the Scheduler was built with; the suite moves it (virtual time on both adapters). */
  readonly clock: ManualClock;
  readonly leaseMs: number;
  readonly a: Scope;
  readonly b: Scope;
}

/**
 * FC5 Scheduler conformance (VERIFICATION §14 step 2; RUNTIME §4.2). Observable contract only: which Jobs a claim
 * leases, when they come due again, and that a stale lease token can move nothing. The same suite runs on the
 * Postgres adapter and on the in-memory adapter. Other suites may share the database, so every assertion is
 * about the Jobs this test made.
 */
export function describeSchedulerConformance(name: string, subject: () => Promise<SchedulerSubject>): void {
  describe(`Scheduler conformance: ${name}`, () => {
    async function seed(s: SchedulerSubject, scope: Scope, state: JobState = "queued", deadlineMs: number | null = null): Promise<JobId> {
      const now = s.clock.now();
      const at = new Date(now).toISOString();
      const projectId = projectIdSchema.parse(uuidv7());
      const generationId = generationIdSchema.parse(uuidv7());
      const jobId = uuidv7() as JobId;
      const terminal = state === "succeeded" || state === "failed" || state === "cancelled";
      await s.store.write(scope, async (tx) => {
        await tx.insertProject({ projectId, createdAt: at });
        await tx.insertGeneration({ generationId, projectId, operation: "treatment.draft", operationClass: "text.create", initiation: {}, effectiveModel: {}, versions: {}, testProvider: true,
          resolvedInputs: {}, captured: [], package: {}, fitReport: {}, renderedRequest: {}, requestDigest: "sha256:conformance", expectedDigest: null, estimate: {}, target: {}, createdAt: at });
        await s.scheduler.enqueue(tx, { jobId, projectId, generationId, run: 1, class: "provider", state, dueAt: terminal ? null : at,
          deadlineAt: deadlineMs === null ? null : new Date(now + deadlineMs).toISOString(), leaseToken: null, leaseExpiresAt: null,
          operationRef: null, failureClass: null, billed: null, reason: null, createdAt: at, updatedAt: at });
      });
      return jobId;
    }
    const mine = (leases: readonly Leased[], jobs: readonly JobId[]) => leases.filter((lease) => jobs.includes(lease.jobId));
    /** What a compare-and-set by this lease's holder achieves: true when the Job moved. */
    const cas = (s: SchedulerSubject, scope: Scope, lease: Leased) => s.store.write(scope, (tx) =>
      tx.updateJob(lease.jobId, { state: lease.stateSeen, leaseToken: lease.leaseToken }, { reason: "fenced", updatedAt: new Date(s.clock.now()).toISOString() }));

    it("a claim leases due Jobs across Accounts, each to exactly one of concurrent claimers, with its Account and state", async () => {
      const s = await subject();
      const jobs = [await seed(s, s.a), await seed(s, s.b), await seed(s, s.a), await seed(s, s.b)];
      const ticks = await Promise.all([s.scheduler.claim(1_000), s.scheduler.claim(1_000), s.scheduler.claim(1_000)]);
      const leased = ticks.flatMap((tick) => mine(tick, jobs));
      expect(leased.map((lease) => lease.jobId).sort()).toEqual([...jobs].sort());
      for (const lease of leased) {
        expect(lease).toMatchObject({ work: "step", stateSeen: "queued", accountId: jobs.indexOf(lease.jobId) % 2 === 0 ? s.a.accountId : s.b.accountId });
        expect(lease.leaseToken).toMatch(/^[0-9a-f-]{36}$/);
      }
      // Leased Jobs are not due again before the lease runs out.
      expect(mine(await s.scheduler.claim(1_000), jobs)).toEqual([]);
    });

    it("`only` claims just the named Job; max bounds a claim", async () => {
      const s = await subject();
      const [first, second] = [await seed(s, s.a), await seed(s, s.a)];
      expect((await s.scheduler.claim(10, second)).map((lease) => lease.jobId)).toEqual([second]);
      expect(await s.scheduler.claim(10, second)).toEqual([]);
      const one = await s.scheduler.claim(1, first);
      expect(one.map((lease) => lease.jobId)).toEqual([first]);
    });

    it("terminal and waiting Jobs are never claimed", async () => {
      const s = await subject();
      const jobs = [await seed(s, s.a, "succeeded"), await seed(s, s.a, "failed"), await seed(s, s.a, "cancelled"), await seed(s, s.a, "waiting")];
      s.clock.advance(s.leaseMs * 10);
      expect(mine(await s.scheduler.claim(1_000), jobs)).toEqual([]);
      for (const job of jobs) expect(await s.scheduler.claim(1, job)).toEqual([]);
    });

    it("an expired lease is reclaimed with a new token, and the stale token is fenced: no CAS, no extend, no release", async () => {
      const s = await subject();
      const job = await seed(s, s.a);
      const [stale] = await s.scheduler.claim(1, job);
      s.clock.advance(s.leaseMs - 1);
      expect(await s.scheduler.claim(1, job)).toEqual([]);
      s.clock.advance(1);
      const [fresh] = await s.scheduler.claim(1, job);
      expect(fresh?.leaseToken).toBeDefined();
      expect(fresh!.leaseToken).not.toBe(stale!.leaseToken);
      expect(await cas(s, s.a, stale!)).toBe(false);
      expect(await s.scheduler.extend(stale!)).toBe(false);
      await s.scheduler.release(stale!);
      expect(await s.scheduler.claim(1, job)).toEqual([]);
      expect(await cas(s, s.a, fresh!)).toBe(true);
    });

    it("extend keeps a live lease past its original expiry; a lease never outlives the state deadline", async () => {
      const s = await subject();
      const job = await seed(s, s.a);
      const [lease] = await s.scheduler.claim(1, job);
      s.clock.advance(s.leaseMs / 2);
      expect(await s.scheduler.extend(lease!)).toBe(true);
      s.clock.advance(s.leaseMs / 2);
      expect(await s.scheduler.claim(1, job)).toEqual([]);
      s.clock.advance(s.leaseMs / 2);
      expect(await s.scheduler.claim(1, job)).toHaveLength(1);

      const bounded = await seed(s, s.a, "queued", 1_000);
      expect(await s.scheduler.claim(1, bounded)).toHaveLength(1);
      s.clock.advance(1_000);
      expect(await s.scheduler.claim(1, bounded)).toHaveLength(1);
    });

    it("release makes a Job due at the given time; wake brings a released Job forward and never steals a live lease", async () => {
      const s = await subject();
      const job = await seed(s, s.a);
      const [lease] = await s.scheduler.claim(1, job);
      await s.scheduler.release(lease!, s.clock.now() + 5_000);
      s.clock.advance(4_999);
      expect(await s.scheduler.claim(1, job)).toEqual([]);
      s.clock.advance(1);
      const [again] = await s.scheduler.claim(1, job);
      expect(again).toBeDefined();
      await s.scheduler.wake(job);
      expect(await s.scheduler.claim(1, job)).toEqual([]);
      await s.scheduler.release(again!, s.clock.now() + 3_600_000);
      expect(await s.scheduler.claim(1, job)).toEqual([]);
      await s.scheduler.wake(job);
      expect(await s.scheduler.claim(1, job)).toHaveLength(1);
      // A release leaves the lease token unset: the released holder can no longer move the Job.
      expect(await cas(s, s.a, again!)).toBe(false);
    });
  });
}
