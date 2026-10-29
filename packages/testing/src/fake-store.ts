import { accountIdSchema, creatorIdSchema, DEFAULT_SETTINGS, eventSchema, type Account, type AccountId, type JobId, type ObjectId, type Project, type Settings, type StudioEvent } from "@aiuteur/contract";
import type { Admission, AttemptRow, CallRow, CaptureRow, Clock, DecisionRow, GenerationRow, IdempotencyRow, Ids, JobRow, Leased, ObjectRow, ReadTx, RevisionRow, RunRow, Scheduler, Scope, SettlementRow, Store, WriteTx } from "@aiuteur/store";
import { ManualClock } from "./fake-transport.ts";
import type { StoreSubject } from "./conformance/store.ts";
import type { SchedulerSubject } from "./conformance/scheduler.ts";
import { uuidv7 } from "./uuidv7.ts";

interface AccountState {
  account: Account;
  settings: Settings;
  projects: Project[];
  objects: Map<string, ObjectRow>;
  revisions: Map<string, RevisionRow[]>;
  attempts: AttemptRow[];
  locks: Map<string, { locked: boolean; version: number }>;
  idempotency: Map<string, IdempotencyRow>;
  generations: Map<string, GenerationRow>;
  jobs: Map<string, JobRow>;
  runs: RunRow[];
  calls: CallRow[];
  settlements: Map<string, SettlementRow>;
  captures: CaptureRow[];
  decisions: DecisionRow[];
  events: StudioEvent[];
}

function readView(state: AccountState, scope: Scope): ReadTx {
  const copy = <T>(value: T) => structuredClone(value);
  return {
    account: async (id) => id === scope.accountId ? copy(state.account) : null,
    settings: async () => copy(state.settings),
    projects: async () => copy(state.projects),
    project: async (id) => copy(state.projects.find((project) => project.projectId === id) ?? null),
    object: async (id) => copy(state.objects.get(id) ?? null),
    head: async (id) => copy(state.revisions.get(id)?.at(-1) ?? null),
    revision: async (id, sequence) => copy(state.revisions.get(id)?.[sequence - 1] ?? null),
    sequences: async (id) => (state.revisions.get(id) ?? []).map((row) => row.sequence),
    attempts: async (id) => copy(state.attempts.filter((row) => row.objectId === id)),
    lockState: async (id) => copy(state.locks.get(id) ?? { locked: false, version: 0 }),
    generation: async (id) => copy(state.generations.get(id) ?? null),
    job: async (id) => copy(state.jobs.get(id) ?? null),
    jobs: async (generation) => copy([...state.jobs.values()].filter((row) => row.generationId === generation).sort((a, b) => a.run - b.run)),
    runs: async (generation) => copy(state.runs.filter((row) => row.generationId === generation).sort((a, b) => a.run - b.run)),
    calls: async (generation) => copy(state.calls.filter((row) => row.generationId === generation).sort((a, b) => a.index - b.index)),
    settlement: async (generation) => copy(state.settlements.get(generation) ?? null),
    captures: async (generation) => copy(state.captures.filter((row) => row.generationId === generation).sort((a, b) => (a.objectId + a.slice < b.objectId + b.slice ? -1 : 1))),
    decisions: async (id) => copy(state.decisions.filter((row) => row.objectId === id).sort((a, b) => a.sequence - b.sequence)),
    latestDecision: async (project, type, kind) => copy(state.decisions
      .filter((row) => row.projectId === project && row.type === type && state.objects.get(row.objectId)?.kind === kind)
      .sort((a, b) => (a.createdAt === b.createdAt ? (a.actionGroup < b.actionGroup ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1))[0] ?? null),
    spendFacts: async (since) => copy([...state.generations.values()].filter((row) => row.createdAt >= since)
      .sort((a, b) => (a.createdAt === b.createdAt ? (a.generationId < b.generationId ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1))
      .map((row) => ({ generationId: row.generationId, createdAt: row.createdAt, estimate: row.estimate, actual: state.settlements.get(row.generationId)?.actual ?? null }))),
    inProgress: async (fingerprint) => [...state.generations.values()].filter((row) => row.inputFingerprint === fingerprint && !state.settlements.has(row.generationId))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0]?.generationId ?? null,
    events: async (after) => copy(state.events.filter((event) => event.sequence > after)),
  };
}

const unique = <T>(rows: T[], row: T, key: (row: T) => string, what: string) => {
  if (rows.some((other) => key(other) === key(row))) throw new Error(`${what} already recorded`);
  rows.push(structuredClone(row));
};

export class MemoryStore implements Store {
  readonly #rows = new Map<string, AccountState>();
  readonly #locks = new Map<string, Promise<void>>();
  /** Providers whose circuit breaker is open: the operator-scoped row the claim reads (RUNTIME §5.1). */
  readonly #breakers = new Set<string>();
  /** The claim lock: shared by every Scheduler adapter over this store, so admission counts are exact across them. */
  #claiming: Promise<unknown> = Promise.resolve();

  constructor(scopes: readonly Scope[], clock: Clock) {
    for (const scope of scopes) this.#rows.set(scope.accountId, {
      account: { accountId: scope.accountId, createdAt: new Date(clock.now()).toISOString() },
      settings: structuredClone(DEFAULT_SETTINGS),
      projects: [], objects: new Map(), revisions: new Map(), attempts: [], locks: new Map(), idempotency: new Map(),
      generations: new Map(), jobs: new Map(), runs: [], calls: [], settlements: new Map(), captures: [], decisions: [], events: [],
    });
  }

  /** Runs `run` under the Account's write lock on a copy of its state; the copy replaces it only when `run` returns. */
  async #locked<T>(accountId: string, run: (state: AccountState) => Promise<T>): Promise<T> {
    const previous = this.#locks.get(accountId) ?? Promise.resolve();
    let release = () => {};
    const next = new Promise<void>((resolve) => { release = resolve; });
    this.#locks.set(accountId, next);
    await previous;
    try {
      const state = structuredClone(this.#rows.get(accountId));
      if (!state) throw new Error("Account not found");
      const result = await run(state);
      this.#rows.set(accountId, state);
      return result;
    } finally {
      release();
      if (this.#locks.get(accountId) === next) this.#locks.delete(accountId);
    }
  }

  /**
   * The in-memory Scheduler over virtual time (RUNTIME §4.2): the same claim rules as the Postgres adapter, reading
   * Job rows across Accounts as the claim function does, and taking each Account's write lock to lease, so a lease
   * and a transaction on the same Job serialise exactly as row locks make them.
   */
  scheduler(options: { clock: Clock; ids: Ids; leaseMs: number; admission: Admission }): Scheduler {
    const iso = (ms: number) => new Date(ms).toISOString();
    const dueWithin = (job: JobRow, ms: number) => iso(Math.min(ms, job.deadlineAt === null ? Infinity : Date.parse(job.deadlineAt)));
    const leaseOf = async (lease: Leased, change: (job: JobRow, now: number) => JobRow | null) =>
      this.#locked(lease.accountId, async (state) => {
        const job = state.jobs.get(lease.jobId);
        const now = options.clock.now();
        if (!job || job.leaseToken !== lease.leaseToken || job.dueAt === null) return false;
        const changed = change(job, now);
        if (changed === null) return false;
        state.jobs.set(job.jobId, changed);
        return true;
      });
    return {
      enqueue: (wtx, job) => wtx.insertJob(job),
      claim: (max, only) => {
        // Every claim on this store serialises, from any adapter, as the claim's one transaction-scoped lock makes them (RUNTIME §4.3).
        const run = this.#claiming.then(async () => {
          const now = options.clock.now();
          const all = () => [...this.#rows.values()].flatMap((state) => [...state.jobs.values()].map((job) => ({ job, accountId: state.account.accountId })));
          const due = (job: JobRow) => job.dueAt !== null && Date.parse(job.dueAt) <= now && job.state !== "waiting" && (only === undefined || job.jobId === only);
          // Admission gates a queued provider Job before its admission deadline; past it, the Job is claimed only to time out.
          const gated = (job: JobRow) => job.state === "queued" && job.class === "provider" && (job.deadlineAt === null || Date.parse(job.deadlineAt) > now);
          const inFlight = (job: JobRow) => job.class === "provider" && (job.state === "submitting" || job.state === "running" || job.state === "cancelling"
            || (job.state === "queued" && job.leaseExpiresAt !== null && Date.parse(job.leaseExpiresAt) > now));
          const leased: Leased[] = [];
          const lease = async (jobId: string, accountId: string, admitted: boolean) => {
            const token = options.ids.uuid();
            const taken = await this.#locked(accountId, async (state) => {
              const current = state.jobs.get(jobId);
              if (!current || !due(current) || gated(current) !== admitted) return null;
              const expires = now + options.leaseMs;
              state.jobs.set(jobId, { ...current, leaseToken: token, leaseExpiresAt: iso(expires), dueAt: dueWithin(current, expires), updatedAt: iso(now) });
              return current.state;
            });
            if (taken !== null) leased.push({ jobId: jobId as JobId, accountId: accountId as AccountId, work: "step", stateSeen: taken, leaseToken: token });
          };
          // Work admission does not gate: Jobs already in flight, local work and queued Jobs past their deadline; oldest due first.
          const ungated = all().filter(({ job }) => due(job) && !gated(job))
            .sort((a, b) => Date.parse(a.job.dueAt!) - Date.parse(b.job.dueAt!) || (a.job.jobId < b.job.jobId ? -1 : 1));
          for (const { job, accountId } of ungated) {
            if (leased.length >= max) break;
            await lease(job.jobId, accountId, false);
          }
          // Admission, one Job at a time over exact counts: breaker, provider cap, Account cap; least-loaded Account, then oldest queued.
          const tried = new Set<string>();
          while (leased.length < max) {
            const rows = all();
            const providerLoad = (provider: string) => rows.filter(({ job }) => inFlight(job) && job.provider === provider).length;
            const accountLoad = (accountId: string) => rows.filter(({ job, accountId: owner }) => inFlight(job) && owner === accountId).length;
            const [next] = rows
              .filter(({ job, accountId }) => due(job) && gated(job) && !tried.has(job.jobId) && !this.#breakers.has(job.provider!)
                && providerLoad(job.provider!) < (options.admission.providerInFlight[job.provider!] ?? 0) && accountLoad(accountId) < options.admission.accountInFlight)
              .sort((a, b) => accountLoad(a.accountId) - accountLoad(b.accountId) || Date.parse(a.job.createdAt) - Date.parse(b.job.createdAt) || (a.job.jobId < b.job.jobId ? -1 : 1));
            if (!next) break;
            tried.add(next.job.jobId);
            await lease(next.job.jobId, next.accountId, true);
          }
          return leased;
        });
        this.#claiming = run.catch(() => undefined);
        return run;
      },
      extend: (lease) => leaseOf(lease, (job, now) => (job.leaseExpiresAt !== null && Date.parse(job.leaseExpiresAt) > now
        ? { ...job, leaseExpiresAt: iso(now + options.leaseMs), dueAt: dueWithin(job, now + options.leaseMs), updatedAt: iso(now) } : null)),
      release: async (lease, dueAt) => { await leaseOf(lease, (job, now) => ({ ...job, leaseToken: null, leaseExpiresAt: null, dueAt: dueWithin(job, dueAt ?? now) })); },
      wake: async (jobId) => {
        const owner = [...this.#rows.values()].find((state) => state.jobs.has(jobId));
        if (!owner) return;
        await this.#locked(owner.account.accountId, async (state) => {
          const job = state.jobs.get(jobId)!;
          const now = options.clock.now();
          if (job.dueAt !== null && (job.leaseExpiresAt === null || Date.parse(job.leaseExpiresAt) <= now)) state.jobs.set(jobId, { ...job, dueAt: iso(Math.min(Date.parse(job.dueAt), now)) });
        });
      },
    };
  }

  async read<T>(scope: Scope, run: (tx: ReadTx) => Promise<T>): Promise<T> {
    const state = structuredClone(this.#rows.get(scope.accountId));
    if (!state) throw new Error("Account not found");
    return run(readView(state, scope));
  }

  async write<T>(scope: Scope, run: (tx: WriteTx) => Promise<T>): Promise<T> {
    return this.#locked(scope.accountId, (state) => run({
      ...readView(state, scope),
      putSettings: async (settings) => { state.settings = structuredClone(settings); },
      idempotency: async (operation, key) => structuredClone(state.idempotency.get(`${operation}\0${key}`) ?? null),
      recordIdempotency: async (row) => {
        const id = `${row.operation}\0${row.key}`;
        if (state.idempotency.has(id)) throw new Error("idempotency key already recorded");
        state.idempotency.set(id, structuredClone(row));
      },
      insertProject: async (project) => { state.projects.push(structuredClone(project)); },
      insertObject: async ({ createdAt: _createdAt, ...row }) => { state.objects.set(row.objectId, structuredClone(row)); state.revisions.set(row.objectId, []); },
      appendRevision: async (row) => {
        const rows = state.revisions.get(row.objectId);
        if (!rows || rows.length !== row.sequence - 1) throw new Error("revision sequence collision");
        rows.push(structuredClone(row));
      },
      insertAttempt: async (row) => { state.attempts.push(structuredClone(row)); },
      insertCapture: async (row) => {
        if (state.objects.get(row.objectId)?.projectId !== row.projectId || state.generations.get(row.generationId)?.projectId !== row.projectId) throw new Error("capture names another project");
        unique(state.captures, row, (r) => `${r.generationId}|${r.objectId}|${r.slice}`, "capture");
      },
      appendDecision: async (row) => {
        if (state.objects.get(row.objectId)?.projectId !== row.projectId) throw new Error("decision names another project");
        if (state.decisions.filter((d) => d.objectId === row.objectId).length !== row.sequence - 1) throw new Error("decision sequence collision");
        state.decisions.push(structuredClone(row));
      },
      insertGeneration: async (row) => {
        if (!state.projects.some((p) => p.projectId === row.projectId) || state.generations.has(row.generationId)) throw new Error("generation refused");
        state.generations.set(row.generationId, structuredClone(row));
      },
      insertJob: async (row) => {
        if (state.generations.get(row.generationId)?.projectId !== row.projectId || state.jobs.has(row.jobId)) throw new Error("job refused");
        if ([...state.jobs.values()].some((j) => j.generationId === row.generationId && j.run === row.run)) throw new Error("job run collision");
        state.jobs.set(row.jobId, structuredClone(row));
      },
      updateJob: async (id, expected, change) => {
        const job = state.jobs.get(id);
        if (!job || job.state !== expected.state || job.leaseToken !== expected.leaseToken) return false;
        state.jobs.set(id, { ...job, ...structuredClone(change) });
        return true;
      },
      insertRun: async (row) => unique(state.runs, row, (r) => `${r.generationId}|${r.jobId}`, "run"),
      insertCall: async (row) => unique(state.calls, row, (r) => `${r.generationId}|${r.index}`, "call"),
      insertSettlement: async (row) => {
        if (state.settlements.has(row.generationId)) throw new Error("settlement already recorded");
        state.settlements.set(row.generationId, structuredClone(row));
      },
      appendEvent: async (event) => {
        const sequence = state.events.length + 1;
        state.events.push(eventSchema.parse({ ...event, accountId: scope.accountId, sequence }));
        return sequence;
      },
    }));
  }

  /** Test seam: opens or closes a provider's breaker. Its write path (S7) is not built yet. */
  setBreaker(provider: string, open: boolean): void {
    if (open) this.#breakers.add(provider); else this.#breakers.delete(provider);
  }

  /** Test seam: appends a lock Decision. No product path writes locks at T0-03. */
  lockObject(scope: Scope, objectId: ObjectId): void {
    const state = this.#rows.get(scope.accountId);
    if (!state) throw new Error("Account not found");
    state.locks.set(objectId, { locked: true, version: (state.locks.get(objectId)?.version ?? 0) + 1 });
  }

  /** Persistent row counts across every Account, by table. */
  rowCounts(): Record<string, number> {
    const counts = { project: 0, object: 0, revision: 0, attempt: 0, lock: 0, idempotency: 0, generation: 0, job: 0, decision: 0, event: 0 };
    for (const state of this.#rows.values()) {
      counts.project += state.projects.length;
      counts.object += state.objects.size;
      counts.revision += [...state.revisions.values()].reduce((sum, rows) => sum + rows.length, 0);
      counts.attempt += state.attempts.length;
      counts.idempotency += state.idempotency.size;
      counts.lock += [...state.locks.values()].reduce((sum, lock) => sum + lock.version, 0);
      counts.generation += state.generations.size;
      counts.job += state.jobs.size;
      counts.decision += state.decisions.length;
      counts.event += state.events.length;
    }
    return counts;
  }
}

export async function fakeStoreSubject(): Promise<StoreSubject> {
  const a: Scope = { accountId: accountIdSchema.parse("11111111-1111-4111-8111-111111111111"), creatorId: creatorIdSchema.parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") };
  const b: Scope = { accountId: accountIdSchema.parse("22222222-2222-4222-8222-222222222222"), creatorId: creatorIdSchema.parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb") };
  const store = new MemoryStore([a, b], new ManualClock());
  return { store, a, b, lockObject: async (scope, objectId) => store.lockObject(scope, objectId), rowCounts: async () => store.rowCounts() };
}

/**
 * Fault injection at the Store port, for G1's negative control: a Store whose reads and writes
 * ignore the caller's Scope and run as `victim`, so a route that relies on the Store for
 * isolation leaks. Never a product adapter.
 */
export function storeIgnoringScope(real: Store, victim: Scope): Store {
  return { read: (_scope, run) => real.read(victim, run), write: (_scope, run) => real.write(victim, run) };
}

/** The in-memory virtual-time Scheduler over a MemoryStore, for the FC5 conformance suite. */
export async function fakeSchedulerSubject(setup: { readonly admission: Admission }): Promise<SchedulerSubject> {
  const a: Scope = { accountId: accountIdSchema.parse("11111111-1111-4111-8111-111111111111"), creatorId: creatorIdSchema.parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") };
  const b: Scope = { accountId: accountIdSchema.parse("22222222-2222-4222-8222-222222222222"), creatorId: creatorIdSchema.parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb") };
  const clock = new ManualClock();
  const store = new MemoryStore([a, b], clock);
  const leaseMs = 60_000;
  const make = () => store.scheduler({ clock, ids: { uuid: () => crypto.randomUUID(), ordered: uuidv7, token: () => crypto.randomUUID() }, leaseMs, admission: setup.admission });
  return { store, scheduler: make(), clock, leaseMs, a, b, setBreaker: async (provider, open) => store.setBreaker(provider, open), another: async () => make() };
}
