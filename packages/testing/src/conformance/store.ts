import { describe, expect, it } from "vitest";
import { accountIdSchema, type Settings } from "@aiuteur/contract";
import type { Scope, Store } from "@aiuteur/store";

export interface StoreSubject {
  readonly store: Store;
  readonly a: Scope;
  readonly b: Scope;
}

/** D9. Shared observable contract, not adapter calls or implementation details. */
export function describeStoreConformance(name: string, subject: () => Promise<StoreSubject>): void {
  describe(`Store conformance: ${name}`, () => {
    it("reads only the scoped Account; another Account and a missing id are identical", async () => {
      const { store, a, b } = await subject();
      expect(await store.read(a, (tx) => tx.account(a.accountId))).toMatchObject({ accountId: a.accountId });
      expect(await store.read(b, (tx) => tx.account(a.accountId))).toBeNull();
      expect(await store.read(b, (tx) => tx.account(accountIdSchema.parse("99999999-9999-4999-8999-999999999999")))).toBeNull();
    });

    it("round trips settings without loss, rolls back a throw, and isolates writes", async () => {
      const { store, a, b } = await subject();
      const payload: Settings = { treatmentOptionCount: 7 };
      await store.write(a, (tx) => tx.putSettings(payload));
      expect(await store.read(a, (tx) => tx.settings())).toEqual(payload);
      expect(await store.read(b, (tx) => tx.settings())).toEqual({ treatmentOptionCount: 3 });
      await expect(store.write(a, async (tx) => {
        await tx.putSettings({ treatmentOptionCount: 9 });
        throw new Error("abort");
      })).rejects.toThrow("abort");
      expect(await store.read(a, (tx) => tx.settings())).toEqual(payload);
    });

    it("serializes concurrent read-modify-write transactions for one Account", async () => {
      const { store, a } = await subject();
      await Promise.all(Array.from({ length: 5 }, () => store.write(a, async (tx) => {
        const current = await tx.settings();
        await Promise.resolve();
        await tx.putSettings({ treatmentOptionCount: current.treatmentOptionCount + 1 });
      })));
      expect(await store.read(a, (tx) => tx.settings())).toEqual({ treatmentOptionCount: 8 });
    });

    it("does not serialize different Accounts behind one global lock", async () => {
      const { store, a, b } = await subject();
      await store.write(a, async () => {
        await store.write(b, (tx) => tx.putSettings({ treatmentOptionCount: 5 }));
      });
      expect(await store.read(b, (tx) => tx.settings())).toEqual({ treatmentOptionCount: 5 });
    });

    it("reads one consistent snapshot without writing or leaking mutable references", async () => {
      const { store, a } = await subject();
      await store.read(a, async (tx) => {
        const before = await tx.settings();
        before.treatmentOptionCount = 10;
        await store.write(a, (writer) => writer.putSettings({ treatmentOptionCount: 6 }));
        expect(await tx.settings()).toEqual({ treatmentOptionCount: 3 });
      });
      expect(await store.read(a, (tx) => tx.settings())).toEqual({ treatmentOptionCount: 6 });
    });
  });
}
