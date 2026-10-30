import type { Account, AccountId, ActionGroupId, Billed, CallRole, DecisionType, FailureClass, GenerationOutcome, IdempotentOperation, GenerationId, ActorKind, AttemptOrigin, JobClass, JobId, JobState, OperationClass, RevisionCause, CreatorId, ObjectId, Project, ProjectId, Settings, StudioEvent, WorkflowOperation } from "@aiuteur/contract";

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

// Draft FC7/FC9 rows (#102). JSON parts are the owning module's wire shapes; the Store keeps them as given.
/** The Generation record: written once, before any provider call (Package P7). */
export interface GenerationRow {
  readonly generationId: GenerationId;
  readonly projectId: ProjectId;
  readonly operation: WorkflowOperation;
  readonly operationClass: OperationClass;
  readonly initiation: unknown;
  readonly effectiveModel: unknown;
  readonly versions: unknown;
  readonly testProvider: boolean;
  readonly resolvedInputs: unknown;
  readonly captured: unknown;
  readonly package: unknown;
  readonly fitReport: unknown;
  readonly renderedRequest: unknown;
  readonly requestDigest: string;
  readonly expectedDigest: string | null;
  readonly estimate: unknown;
  readonly target: unknown;
  readonly createdAt: string;
}
/** The one mutable state machine (JOB-LIFECYCLE §2–§3). Times are ISO instants from the injected Clock. */
export interface JobRow {
  readonly jobId: JobId;
  readonly projectId: ProjectId;
  readonly generationId: GenerationId;
  readonly run: number;
  readonly class: JobClass;
  /** The provider whose in-flight cap and circuit breaker admit this Job (RUNTIME §4.3): the Offering's adapter. Null exactly for local work (§4.6). */
  readonly provider: string | null;
  readonly state: JobState;
  /** The one due time (RUNTIME §4.2); null exactly when terminal. */
  readonly dueAt: string | null;
  readonly deadlineAt: string | null;
  readonly leaseToken: string | null;
  readonly leaseExpiresAt: string | null;
  readonly operationRef: string | null;
  readonly failureClass: FailureClass | null;
  readonly billed: Billed | null;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export type JobChange = Partial<Pick<JobRow, "state" | "dueAt" | "deadlineAt" | "leaseToken" | "leaseExpiresAt" | "operationRef" | "failureClass" | "billed" | "reason">> & { readonly updatedAt: string };
/** Run history: one row per Job outcome, kept when the Job is pruned. */
export interface RunRow {
  readonly generationId: GenerationId;
  readonly jobId: JobId;
  readonly projectId: ProjectId;
  readonly run: number;
  readonly state: JobState;
  readonly operationRef: string | null;
  readonly failureClass: FailureClass | null;
  readonly billed: Billed | null;
  readonly reason: string | null;
  readonly createdAt: string;
}
/** One entry of the call log (GENERATION-PACKAGE §11). */
export interface CallRow {
  readonly generationId: GenerationId;
  readonly index: number;
  readonly projectId: ProjectId;
  readonly role: CallRole;
  readonly jobId: JobId;
  readonly requestDigest: string;
  readonly operationRef: string | null;
  readonly response: string | null;
  readonly verdict: unknown;
  readonly reportedCost: unknown;
  readonly createdAt: string;
}
export interface SettlementRow {
  readonly generationId: GenerationId;
  readonly projectId: ProjectId;
  readonly outcome: GenerationOutcome;
  readonly reason: string | null;
  readonly actual: unknown;
  readonly outputs: unknown;
  readonly settledAt: string;
}
/** A capture edge: the unit a Generation read, with its Revision and frozen fingerprint (EI1). */
export interface CaptureRow {
  readonly generationId: GenerationId;
  readonly objectId: ObjectId;
  readonly projectId: ProjectId;
  readonly slice: string;
  readonly sequence: number;
  readonly fingerprint: string;
  readonly createdAt: string;
}
export interface DecisionRow {
  readonly objectId: ObjectId;
  readonly projectId: ProjectId;
  readonly sequence: number;
  readonly type: DecisionType;
  readonly payload: unknown;
  readonly actor: string;
  readonly actionGroup: ActionGroupId;
  readonly createdAt: string;
}
/** An outbox event before it is numbered: type and ids only (RT4). */
export type NewEvent = { [E in StudioEvent as E["type"]]: Omit<E, "accountId" | "sequence"> }[StudioEvent["type"]];
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
  generation(id: GenerationId): Promise<GenerationRow | null>;
  job(id: JobId): Promise<JobRow | null>;
  jobs(generation: GenerationId): Promise<JobRow[]>;
  runs(generation: GenerationId): Promise<RunRow[]>;
  calls(generation: GenerationId): Promise<CallRow[]>;
  settlement(generation: GenerationId): Promise<SettlementRow | null>;
  captures(generation: GenerationId): Promise<CaptureRow[]>;
  decisions(id: ObjectId): Promise<DecisionRow[]>;
  /** The most recent Decision of this type on any object of this kind in the project, or null. */
  latestDecision(project: ProjectId, type: DecisionType, kind: string): Promise<DecisionRow | null>;
  /** The scoped Account's outbox events after a sequence, in order. */
  events(after: number): Promise<StudioEvent[]>;
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
  /** For `history` only (R1): capture edges and Decisions. */
  insertCapture(row: CaptureRow): Promise<void>;
  appendDecision(row: DecisionRow): Promise<void>;
  insertGeneration(row: GenerationRow): Promise<void>;
  insertJob(row: JobRow): Promise<void>;
  /** Compare-and-set on (Job, expected state, lease token): true when exactly this row moved (RUNTIME §4.2). */
  updateJob(id: JobId, expected: { readonly state: JobState; readonly leaseToken: string | null }, change: JobChange): Promise<boolean>;
  insertRun(row: RunRow): Promise<void>;
  insertCall(row: CallRow): Promise<void>;
  insertSettlement(row: SettlementRow): Promise<void>;
  /** Numbers the event with the Account's next sequence, as the transaction's write (RUNTIME §6). */
  appendEvent(event: NewEvent): Promise<number>;
}
/** Writes serialize per Account; thrown callbacks roll back; reads never write. */
export interface Store {
  read<T>(scope: Scope, run: (tx: ReadTx) => Promise<T>): Promise<T>;
  write<T>(scope: Scope, run: (tx: WriteTx) => Promise<T>): Promise<T>;
}
/** What one claim leases: ids, the state seen at claim and the fencing token; never content (RUNTIME §4.2, §5). */
export interface Leased {
  readonly jobId: JobId;
  readonly accountId: AccountId;
  readonly work: "step";
  readonly stateSeen: JobState;
  readonly leaseToken: string;
}
/**
 * FC5 Draft: claim admission configuration (RUNTIME §4.3; S8). Caps are configuration with no default: a provider with no
 * configured cap admits nothing. In-flight is a provider Job that is `submitting`, `running` or `cancelling`, or `queued`
 * under a live lease (claimed, about to submit). Local work counts against neither cap.
 */
export interface Admission {
  readonly accountInFlight: number;
  readonly providerInFlight: Readonly<Record<string, number>>;
}
/**
 * FC5 Draft: the `Scheduler` port (RUNTIME §4.2). It answers "which Jobs need attention now, exclusively"; `jobs` owns
 * the state machine. The real adapter is Postgres; the fake is in-memory over the injected Clock (virtual time).
 */
export interface Scheduler {
  /** Inside the creating transaction: the new Job is durable and due now. */
  enqueue(wtx: WriteTx, job: JobRow): Promise<void>;
  /**
   * One tick: leases up to `max` due Jobs, or only the named Job (the text fast path claims its own, RUNTIME §4.6). A due
   * `queued` provider Job is claimable only while its provider's breaker is not open and both its provider's and its
   * Account's in-flight counts are below their caps; among those, least-loaded Account first, then oldest queued (§4.3).
   */
  claim(max: number, only?: JobId): Promise<Leased[]>;
  /** Heartbeat for a step longer than a lease; false when the lease was lost. */
  extend(lease: Leased): Promise<boolean>;
  /** Gives the lease back; the Job is due again at `dueAt` (default now). */
  release(lease: Leased, dueAt?: number): Promise<void>;
  /** A hint that a Job needs attention now. Never moves a state. */
  wake(jobId: JobId): Promise<void>;
}
export { createPostgresStore, assertRuntimeRole } from "./postgres.ts";
export { createPostgresScheduler } from "./scheduler.ts";
export { migrateDatabase } from "./migrations.ts";
export { schemaCatalogue } from "./catalogue.ts";
export { fakeGenerationCount } from "./derived.ts";
export { createLiveness, type Liveness } from "./liveness.ts";
export { provisionRolePasswords, PASSWORD_ROLES, type PasswordRole } from "./roles.ts";
