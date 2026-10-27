import { accountIdSchema, creatorIdSchema, DEFAULT_SETTINGS, type Account, type Settings } from "@aiuteur/contract";
import type { Clock, ReadTx, Scope, Store, WriteTx } from "@aiuteur/store";
import { ManualClock } from "./fake-transport.ts";
import type { StoreSubject } from "./conformance/store.ts";

export class MemoryStore implements Store {
  readonly #rows = new Map<string, { account: Account; settings: Settings }>();
  readonly #locks = new Map<string, Promise<void>>();

  constructor(scopes: readonly Scope[], clock: Clock) {
    for (const scope of scopes) this.#rows.set(scope.accountId, {
      account: { accountId: scope.accountId, createdAt: new Date(clock.now()).toISOString() },
      settings: structuredClone(DEFAULT_SETTINGS),
    });
  }

  async read<T>(scope: Scope, run: (tx: ReadTx) => Promise<T>): Promise<T> {
    const row = structuredClone(this.#rows.get(scope.accountId));
    return run({
      account: async (id) => id === scope.accountId && row ? structuredClone(row.account) : null,
      settings: async () => {
        if (!row) throw new Error("Account not found");
        return structuredClone(row.settings);
      },
    });
  }

  async write<T>(scope: Scope, run: (tx: WriteTx) => Promise<T>): Promise<T> {
    const previous = this.#locks.get(scope.accountId) ?? Promise.resolve();
    let release = () => {};
    const next = new Promise<void>((resolve) => { release = resolve; });
    this.#locks.set(scope.accountId, next);
    await previous;
    try {
      const row = structuredClone(this.#rows.get(scope.accountId));
      if (!row) throw new Error("Account not found");
      const result = await run({
        account: async (id) => id === scope.accountId ? structuredClone(row.account) : null,
        settings: async () => structuredClone(row.settings),
        putSettings: async (settings) => { row.settings = structuredClone(settings); },
      });
      this.#rows.set(scope.accountId, row);
      return result;
    } finally {
      release();
      if (this.#locks.get(scope.accountId) === next) this.#locks.delete(scope.accountId);
    }
  }
}

export async function fakeStoreSubject(): Promise<StoreSubject> {
  const a: Scope = { accountId: accountIdSchema.parse("11111111-1111-4111-8111-111111111111"), creatorId: creatorIdSchema.parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") };
  const b: Scope = { accountId: accountIdSchema.parse("22222222-2222-4222-8222-222222222222"), creatorId: creatorIdSchema.parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb") };
  return { store: new MemoryStore([a, b], new ManualClock()), a, b };
}
