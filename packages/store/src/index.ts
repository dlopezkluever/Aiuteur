import type { Account, AccountId, ActionGroupId, IdempotentOperation, GenerationId, ActorKind, AttemptOrigin, RevisionCause, CreatorId, ObjectId, Project, ProjectId, Settings } from "@aiuteur/contract";

/** FC5 Draft: obtained by accounts.resolveScope, never from client input. */
export interface Scope {
  readonly accountId: AccountId;
  readonly creatorId: CreatorId;
}
export interface Clock { now(): number }
/** UUID v4 for Account-level ids, time-ordered ids for history, and cryptographic invitation tokens; injected at the composition root. */
export interface Ids {
  uuid(): string;
  token(): string;
  /** A 128-bit time-ordered UUID (UUIDv7) for project and history rows (PERSISTENCE §3). */
  ordered(): string;
}
export interface AuthenticatedSubject {
  readonly creatorId: CreatorId;
  readonly email: string;
  readonly secondFactor: boolean;
}
export interface Auth {
  authenticate(headers: Headers): Promise<AuthenticatedSubject | null>;
}
export interface ObjectRow { readonly objectId: ObjectId; readonly projectId: ProjectId; readonly kind: string }
/** One immutable Revision (PERSISTENCE §4.2). `body` is the owning kind's validated payload. */
export interface RevisionRow {
  readonly objectId: ObjectId;
  readonly projectId: ProjectId;
  readonly sequence: number;
  readonly parent: number;
  readonly cause: RevisionCause;
  readonly actorKind: ActorKind;
  readonly actionGroup: ActionGroupId;
  /** Set exactly when the actor is a Generation. Opaque until #102 owns the Generation record. */
  readonly generationId: GenerationId | null;
  readonly schemaVersion: number;
  readonly body: unknown;
  readonly bodyHash: string;
  /** Slice name to fingerprint, frozen at write time. */
  readonly fingerprints: Readonly<Record<string, string>>;
  readonly createdAt: string;
}
/** A loser kept on a side line: never a Revision, never discarded. */
export interface AttemptRow {
  readonly attemptId: string;
  readonly objectId: ObjectId;
  readonly projectId: ProjectId;
  readonly basedOn: number;
  readonly origin: AttemptOrigin;
  readonly generationId: GenerationId | null;
  readonly body: unknown;
  readonly createdAt: string;
}
/** Latest lock Decision of an object; `version` counts its lock Decisions. */
export interface LockState { readonly locked: boolean; readonly version: number }
export interface ReadTx {
  account(id: AccountId): Promise<Account | null>;
  settings(): Promise<Settings>;
  projects(): Promise<Project[]>;
  project(id: ProjectId): Promise<Project | null>;
  object(id: ObjectId): Promise<ObjectRow | null>;
  /** The latest Revision, or null when the object has none. */
  head(id: ObjectId): Promise<RevisionRow | null>;
  revision(id: ObjectId, sequence: number): Promise<RevisionRow | null>;
  sequences(id: ObjectId): Promise<number[]>;
  attempts(id: ObjectId): Promise<AttemptRow[]>;
  lockState(id: ObjectId): Promise<LockState>;
}
/**
 * Appends only. `appendRevision`, `insertObject` and `insertAttempt` exist for
 * `history.commit` (build rule R1); no other module calls them.
 */
/** The recorded result of one keyed write, committed in the same transaction as the write (STORY-DOCUMENTS §4). */
export interface IdempotencyRow {
  readonly operation: IdempotentOperation;
  readonly key: string;
  /** Identity of the logical request, so reuse of a key with other input is detectable. */
  readonly fingerprint: string;
  readonly result: unknown;
  readonly createdAt: string;
}
export interface WriteTx extends ReadTx {
  idempotency(operation: IdempotentOperation, key: string): Promise<IdempotencyRow | null>;
  recordIdempotency(row: IdempotencyRow): Promise<void>;
  putSettings(settings: Settings): Promise<void>;
  insertProject(project: Project): Promise<void>;
  insertObject(row: ObjectRow & { createdAt: string }): Promise<void>;
  appendRevision(row: RevisionRow): Promise<void>;
  insertAttempt(row: AttemptRow): Promise<void>;
}
/** Writes serialize per Account; thrown callbacks roll back; reads never write. */
export interface Store {
  read<T>(scope: Scope, run: (tx: ReadTx) => Promise<T>): Promise<T>;
  write<T>(scope: Scope, run: (tx: WriteTx) => Promise<T>): Promise<T>;
}
export { createPostgresStore, assertRuntimeRole } from "./postgres.ts";
export { migrateDatabase } from "./migrations.ts";
export { schemaCatalogue } from "./catalogue.ts";
