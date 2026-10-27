import type { Account, AccountId, CreatorId, Settings } from "@aiuteur/contract";

/** FC5 Draft: obtained by accounts.resolveScope, never from client input. */
export interface Scope {
  readonly accountId: AccountId;
  readonly creatorId: CreatorId;
}
export interface Clock { now(): number }
/** UUID v4 and cryptographic invitation tokens; injected at the composition root. */
export interface Ids { uuid(): string; token(): string }
export interface AuthenticatedSubject {
  readonly creatorId: CreatorId;
  readonly email: string;
  readonly secondFactor: boolean;
}
export interface Auth {
  authenticate(headers: Headers): Promise<AuthenticatedSubject | null>;
}
export interface ReadTx {
  account(id: AccountId): Promise<Account | null>;
  settings(): Promise<Settings>;
}
export interface WriteTx extends ReadTx {
  putSettings(settings: Settings): Promise<void>;
}
/** Writes serialize per Account; thrown callbacks roll back; reads never write. */
export interface Store {
  read<T>(scope: Scope, run: (tx: ReadTx) => Promise<T>): Promise<T>;
  write<T>(scope: Scope, run: (tx: WriteTx) => Promise<T>): Promise<T>;
}
export { createPostgresStore, assertRuntimeRole } from "./postgres.ts";
export { migrateDatabase } from "./migrations.ts";
export { schemaCatalogue } from "./catalogue.ts";
