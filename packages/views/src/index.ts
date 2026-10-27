import { studioSchema, projectListSchema, type AccountId } from "@aiuteur/contract";
import type { Scope, Store } from "@aiuteur/store";

export function createViews(store: Store) {
  return {
    studio: (scope: Scope, id: AccountId) => store.read(scope, async (tx) => {
      const account = await tx.account(id);
      return account ? studioSchema.parse({ account, settings: await tx.settings() }) : null;
    }),
    projects: (scope: Scope, id: AccountId) => store.read(scope, async (tx) =>
      await tx.account(id) ? projectListSchema.parse({ projects: [] }) : null),
  };
}
export type Views = ReturnType<typeof createViews>;
