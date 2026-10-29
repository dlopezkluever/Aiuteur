import { describe, expect, it } from "vitest";
import { generationIdSchema, projectIdSchema, type JobId, type JobState } from "@aiuteur/contract";
import type { Admission, Leased, Scheduler, Scope, Store } from "@aiuteur/store";
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
  /** Test seam: opens or closes a provider's circuit breaker (the shared operator row; its S7 write path is not built yet). */
  setBreaker(provider: string, open: boolean): Promise<void>;
}
/** Each test gets its own provider name, so counts in a shared database see only its own Jobs. */
export type SchedulerSubjectFactory = (setup: { readonly admission: Admission }) => Promise<SchedulerSubject>;

/**
 * FC5 Scheduler conformance (VERIFICATION §14 step 2; RUNTIME §4.2). Observable contract only: which Jobs a claim
 * leases, when they come due again, and that a stale lease token can move nothing. The same suite runs on the
 * Postgres adapter and on the in-memory adapter. Other suites may share the database, so every assertion is
 * about the Jobs this test made.
 */
export function describeSchedulerConformance(name: string, factory: SchedulerSubjectFactory): void {
  describe(`Scheduler conformance: ${name}`, () => {
    let provider = "";
    /** A fresh subject whose provider is this test's own; caps generous unless the test sets them. */
    async function subject(caps: { account?: number; provider?: number; others?: Record<string, number> } = {}) {
      provider = `conformance-${uuidv7()}`;
      return factory({ admission: { accountInFlight: caps.account ?? 1_000, providerInFlight: { ...caps.others, [provider]: caps.provider ?? 1_000 } } });
    }
    interface Seed { readonly state?: JobState; readonly deadlineMs?: number | null; readonly dueInMs?: number; readonly provider?: string | null }
    async function seed(s: SchedulerSubject, scope: Scope, state: JobState | Seed = "queued", deadlineMs: number | null = null): Promise<JobId> {
      const options: Seed = typeof state === "string" ? { state, deadlineMs } : state;
      const jobState = options.state ?? "queued";
      const jobProvider = options.provider === undefined ? provider : options.provider;
      // Distinct creation times, so "oldest queued" has one answer.
      s.clock.advance(1);
      const now = s.clock.now();
      const at = new Date(now).toISOString();
      const projectId = projectIdSchema.parse(uuidv7());
      const generationId = generationIdSchema.parse(uuidv7());
      const jobId = uuidv7() as JobId;
      const terminal = jobState === "succeeded" || jobState === "failed" || jobState === "cancelled";
      await s.store.write(scope, async (tx) => {
        await tx.insertProject({ projectId, createdAt: at });
        await tx.insertGeneration({ generationId, projectId, operation: "treatment.draft", operationClass: "text.create", initiation: {}, effectiveModel: {}, versions: {}, testProvider: true,
          resolvedInputs: {}, captured: [], package: {}, fitReport: {}, renderedRequest: {}, requestDigest: "sha256:conformance", expectedDigest: null, estimate: {}, target: {}, createdAt: at });
        await s.scheduler.enqueue(tx, { jobId, projectId, generationId, run: 1, class: jobProvider === null ? "local" : "provider", provider: jobProvider, state: jobState,
          dueAt: terminal ? null : new Date(now + (options.dueInMs ?? 0)).toISOString(),
          deadlineAt: (options.deadlineMs ?? null) === null ? null : new Date(now + options.deadlineMs!).toISOString(), leaseToken: null, leaseExpiresAt: null,
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

    // RUNTIME §4.3: admission and fairness.
    const finish = (s: SchedulerSubject, scope: Scope, lease: Leased) => s.store.write(scope, (tx) => tx.updateJob(lease.jobId, { state: lease.stateSeen, leaseToken: lease.leaseToken },
      { state: "failed", dueAt: null, leaseToken: null, leaseExpiresAt: null, updatedAt: new Date(s.clock.now()).toISOString() }));

    it("§4.3 provider cap: claims never take a provider past its in-flight cap, also across concurrent claimers; a freed slot admits the next Job", async () => {
      const s = await subject({ provider: 2 });
      const jobs = [await seed(s, s.a), await seed(s, s.b), await seed(s, s.a), await seed(s, s.b)];
      const ticks = await Promise.all([s.scheduler.claim(10), s.scheduler.claim(10), s.scheduler.claim(10)]);
      const first = ticks.flatMap((tick) => mine(tick, jobs));
      expect(first).toHaveLength(2);
      // A claimed, still queued Job is in flight: the next claim finds no free slot.
      expect(mine(await s.scheduler.claim(10), jobs)).toEqual([]);
      // A submitting Job counts too; a terminal one frees its slot.
      expect(await s.store.write(first[0]!.accountId === s.a.accountId ? s.a : s.b, (tx) => tx.updateJob(first[0]!.jobId, { state: "queued", leaseToken: first[0]!.leaseToken }, { state: "submitting", updatedAt: new Date(s.clock.now()).toISOString() }))).toBe(true);
      expect(mine(await s.scheduler.claim(10), jobs)).toEqual([]);
      expect(await finish(s, first[1]!.accountId === s.a.accountId ? s.a : s.b, first[1]!)).toBe(true);
      expect(mine(await s.scheduler.claim(10), jobs)).toHaveLength(1);
      // A provider with no configured cap admits nothing: caps are configuration, with no default.
      const uncapped = await seed(s, s.a, { provider: `uncapped-${uuidv7()}` });
      expect(await s.scheduler.claim(10, uncapped)).toEqual([]);
    });

    it("§4.3 Account cap: one Account cannot take more than its in-flight cap however many Jobs it has due; other Accounts still run", async () => {
      const s = await subject({ account: 2 });
      const many = [await seed(s, s.a), await seed(s, s.a), await seed(s, s.a), await seed(s, s.a)];
      const other = await seed(s, s.b);
      const leased = mine(await s.scheduler.claim(10), [...many, other]);
      expect(leased.filter((lease) => lease.accountId === s.a.accountId)).toHaveLength(2);
      expect(leased.filter((lease) => lease.accountId === s.b.accountId).map((lease) => lease.jobId)).toEqual([other]);
      // The fast path is the same claim: a named Job over the cap is not admitted.
      const rest = many.filter((job) => !leased.some((lease) => lease.jobId === job));
      expect(await s.scheduler.claim(1, rest[0]!)).toEqual([]);
      await finish(s, s.a, leased.find((lease) => lease.accountId === s.a.accountId)!);
      expect(await s.scheduler.claim(1, rest[0]!)).toHaveLength(1);
    });

    it("§4.3 breaker: while a provider's breaker is open its queued Jobs are not admitted; other providers and work already in flight are", async () => {
      const elsewhere = `conformance-other-${uuidv7()}`;
      const s = await subject({ others: { [elsewhere]: 1_000 } });
      const queued = await seed(s, s.a);
      const inFlight = await seed(s, s.a, "submitting");
      const other = await seed(s, s.b, { provider: elsewhere });
      await s.setBreaker(provider, true);
      expect(mine(await s.scheduler.claim(10), [queued, inFlight, other]).map((lease) => lease.jobId).sort()).toEqual([inFlight, other].sort());
      expect(await s.scheduler.claim(1, queued)).toEqual([]);
      await s.setBreaker(provider, false);
      expect((await s.scheduler.claim(1, queued)).map((lease) => lease.jobId)).toEqual([queued]);
    });

    it("§4.3 fairness: the least-loaded Account first, then the oldest queued Job; successive picks go round-robin across Accounts", async () => {
      const s = await subject();
      // A already has one Job in flight (running, polled much later), so B's newer Job goes before A's older one.
      await seed(s, s.a, { state: "running", dueInMs: 3_600_000 });
      const olderA = await seed(s, s.a);
      const newerB = await seed(s, s.b);
      expect(mine(await s.scheduler.claim(1), [olderA, newerB]).map((lease) => lease.jobId)).toEqual([newerB]);

      const t = await subject();
      const a1 = await seed(t, t.a), a2 = await seed(t, t.a), a3 = await seed(t, t.a);
      const b1 = await seed(t, t.b), b2 = await seed(t, t.b);
      expect(mine(await t.scheduler.claim(4), [a1, a2, a3, b1, b2]).map((lease) => lease.jobId)).toEqual([a1, b1, a2, b2]);
    });

    it("§4.3/§4.6 local work is not gated by provider or Account caps", async () => {
      const s = await subject({ account: 0, provider: 0 });
      const local = await seed(s, s.a, { provider: null });
      const queued = await seed(s, s.a);
      expect(mine(await s.scheduler.claim(10), [local, queued]).map((lease) => lease.jobId)).toEqual([local]);
    });
  });
}
