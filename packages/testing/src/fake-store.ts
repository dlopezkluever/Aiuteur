import { accountIdSchema, creatorIdSchema, DEFAULT_SETTINGS, type Account, type ObjectId, type Project, type Settings } from "@aiuteur/contract";
import type { AttemptRow, Clock, ObjectRow, ReadTx, RevisionRow, Scope, Store, WriteTx } from "@aiuteur/store";
import { ManualClock } from "./fake-transport.ts";
import type { StoreSubject } from "./conformance/store.ts";

interface AccountState {
  account: Account;
  settings: Settings;
  projects: Project[];
  objects: Map<string, ObjectRow>;
  revisions: Map<string, RevisionRow[]>;
  attempts: AttemptRow[];
  locks: Map<string, { locked: boolean; version: number }>;
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
  };
}

export class MemoryStore implements Store {
  readonly #rows = new Map<string, AccountState>();
  readonly #locks = new Map<string, Promise<void>>();

  constructor(scopes: readonly Scope[], clock: Clock) {
    for (const scope of scopes) this.#rows.set(scope.accountId, {
      account: { accountId: scope.accountId, createdAt: new Date(clock.now()).toISOString() },
      settings: structuredClone(DEFAULT_SETTINGS),
      projects: [], objects: new Map(), revisions: new Map(), attempts: [], locks: new Map(),
    });
  }

  async read<T>(scope: Scope, run: (tx: ReadTx) => Promise<T>): Promise<T> {
    const state = structuredClone(this.#rows.get(scope.accountId));
    if (!state) throw new Error("Account not found");
    return run(readView(state, scope));
  }

  async write<T>(scope: Scope, run: (tx: WriteTx) => Promise<T>): Promise<T> {
    const previous = this.#locks.get(scope.accountId) ?? Promise.resolve();
    let release = () => {};
    const next = new Promise<void>((resolve) => { release = resolve; });
    this.#locks.set(scope.accountId, next);
    await previous;
    try {
      const state = structuredClone(this.#rows.get(scope.accountId));
      if (!state) throw new Error("Account not found");
      const result = await run({
        ...readView(state, scope),
        putSettings: async (settings) => { state.settings = structuredClone(settings); },
        insertProject: async (project) => { state.projects.push(structuredClone(project)); },
        insertObject: async ({ createdAt: _createdAt, ...row }) => { state.objects.set(row.objectId, structuredClone(row)); state.revisions.set(row.objectId, []); },
        appendRevision: async (row) => {
          const rows = state.revisions.get(row.objectId);
          if (!rows || rows.length !== row.sequence - 1) throw new Error("revision sequence collision");
          rows.push(structuredClone(row));
        },
        insertAttempt: async (row) => { state.attempts.push(structuredClone(row)); },
      });
      this.#rows.set(scope.accountId, state);
      return result;
    } finally {
      release();
      if (this.#locks.get(scope.accountId) === next) this.#locks.delete(scope.accountId);
    }
  }

  /** Test seam: appends a lock Decision. No product path writes locks at T0-03. */
  lockObject(scope: Scope, objectId: ObjectId): void {
    const state = this.#rows.get(scope.accountId);
    if (!state) throw new Error("Account not found");
    state.locks.set(objectId, { locked: true, version: (state.locks.get(objectId)?.version ?? 0) + 1 });
  }

  /** Persistent row counts across every Account, by table. */
  rowCounts(): Record<string, number> {
    const counts = { project: 0, object: 0, revision: 0, attempt: 0, lock: 0 };
    for (const state of this.#rows.values()) {
      counts.project += state.projects.length;
      counts.object += state.objects.size;
      counts.revision += [...state.revisions.values()].reduce((sum, rows) => sum + rows.length, 0);
      counts.attempt += state.attempts.length;
      counts.lock += [...state.locks.values()].reduce((sum, lock) => sum + lock.version, 0);
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
