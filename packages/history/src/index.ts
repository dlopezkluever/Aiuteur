import { createHash } from "node:crypto";
import type { ObjectId, ProjectId } from "@aiuteur/contract";
import type { AttemptRow, Ids, ReadTx, RevisionRow, Scope, WriteTx } from "@aiuteur/store";

// Draft FC3 (the write gate) and FC4 (kind declaration). Neither is frozen at T0-03.

/** FC4 Draft: what a module declares about a kind (MODULE §5.5). `history` runs `parse` and `invariants` on every Revision. */
export interface KindDeclaration<Body = unknown> {
  readonly kind: string;
  readonly schemaVersion: number;
  /** The body as the kind's schema reads it, or null when it is not valid. */
  parse(body: unknown): Body | null;
  /** Registered invariants, checked on every commit. */
  readonly invariants: readonly ((body: Body) => boolean)[];
  /** The units lineage names; fingerprints and `unit_head` arrive with the first lineage consumer. */
  readonly slices: readonly string[];
  readonly narrativeBearing: readonly string[];
  readonly declaredIndexes: readonly string[];
  readonly extractedColumns: readonly string[];
  readonly remap: "new-ids";
  readonly closure: "object";
  readonly separability: "project";
}

export type ActorKind = "creator" | "generation" | "import";
/** FC3 Draft: server state in the real grant (MODULE §5.2); only its shape exists at T0-03. */
export interface EditSessionGrant { readonly objectId: ObjectId; readonly creatorId: Scope["creatorId"]; readonly impactVersion: number }
export type GrantEditSession = (wtx: WriteTx, scope: Scope, request: { objectId: ObjectId; impactVersion: number }) => Promise<EditSessionGrant | NeedsConfirmation>;

export interface Change<Body = unknown> {
  readonly kind: KindDeclaration<Body>;
  readonly projectId: ProjectId;
  readonly objectId: ObjectId;
  /** The sequence of the Revision this write was based on; 0 creates the object. */
  readonly base: number;
  readonly body: unknown;
}
export interface CommitContext {
  readonly actor: ActorKind;
  readonly cause: string;
  /** From the injected Clock. */
  readonly at: number;
  readonly ids: Ids;
  readonly editSession?: EditSessionGrant;
}
export interface Impact { readonly version: number; readonly reached: readonly ObjectId[] }
export type RefusalReason = "not-found" | "kind-mismatch" | "invalid-body" | "invariant-violated";
export interface NeedsConfirmation { readonly result: "NeedsConfirmation"; readonly impact: Impact }
export type CommitResult =
  | { readonly result: "Applied"; readonly appended: boolean; readonly revision: RevisionRow }
  | NeedsConfirmation
  | { readonly result: "HeldAsOption"; readonly attemptId: string }
  | { readonly result: "StaleBase"; readonly head: number; readonly attemptId: string }
  | { readonly result: "Refused"; readonly reason: RefusalReason };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
/** Over the body exactly as stored, independent of key order. */
export const bodyHash = (body: unknown) => createHash("sha256").update(canonical(body)).digest("hex");

/**
 * The single write gate. Callers pass a `WriteTx`, which the Store hands out only
 * after taking its per-Account lock, so the head, lock state and base are read
 * under that lock and the append that follows cannot be overtaken. Inside one
 * transaction a Revision is appended (`Applied`) or nothing is, except the loser
 * kept on a side line (`StaleBase`, `HeldAsOption`).
 */
export async function commit<Body>(wtx: WriteTx, scope: Scope, change: Change<Body>, ctx: CommitContext): Promise<CommitResult> {
  const refuse = (reason: RefusalReason): CommitResult => ({ result: "Refused", reason });
  if (!await wtx.project(change.projectId)) return refuse("not-found");
  const object = await wtx.object(change.objectId);
  if (object && object.projectId !== change.projectId) return refuse("not-found");
  if (object && object.kind !== change.kind.kind) return refuse("kind-mismatch");
  if (!object && change.base !== 0) return refuse("not-found");
  const body = change.kind.parse(change.body);
  if (body === null) return refuse("invalid-body");
  if (!change.kind.invariants.every((invariant) => invariant(body))) return refuse("invariant-violated");

  const at = new Date(ctx.at).toISOString();
  const keep = async (origin: AttemptRow["origin"]) => {
    const attemptId = ctx.ids.uuid();
    await wtx.insertAttempt({ attemptId, objectId: change.objectId, projectId: change.projectId, basedOn: change.base, origin, body, createdAt: at });
    return attemptId;
  };

  const lock = object ? await wtx.lockState(change.objectId) : { locked: false, version: 0 };
  const grant = ctx.editSession;
  const through = grant !== undefined && grant.objectId === change.objectId && grant.creatorId === scope.creatorId && grant.impactVersion === lock.version;
  if (lock.locked && !through) {
    if (ctx.actor === "generation") return { result: "HeldAsOption", attemptId: await keep("held") };
    return { result: "NeedsConfirmation", impact: { version: lock.version, reached: [] } };
  }

  const head = await wtx.head(change.objectId);
  const headSequence = head?.sequence ?? 0;
  if (change.base !== headSequence) return { result: "StaleBase", head: headSequence, attemptId: await keep("stale-base") };

  const hash = bodyHash(body);
  if (head && head.bodyHash === hash) return { result: "Applied", appended: false, revision: head };
  if (!object) await wtx.insertObject({ objectId: change.objectId, projectId: change.projectId, kind: change.kind.kind, createdAt: at });
  const revision: RevisionRow = {
    objectId: change.objectId, projectId: change.projectId, sequence: headSequence + 1, parent: headSequence,
    cause: ctx.cause, actorKind: ctx.actor, schemaVersion: change.kind.schemaVersion, body, bodyHash: hash, createdAt: at,
  };
  await wtx.appendRevision(revision);
  return { result: "Applied", appended: true, revision };
}

export interface ObjectRead {
  readonly kind: string;
  readonly projectId: ProjectId;
  readonly head: RevisionRow;
  /** The requested Revision, or the head when none was requested; null when the sequence does not exist. */
  readonly revision: RevisionRow | null;
  readonly sequences: readonly number[];
  readonly sideLine: readonly AttemptRow[];
}
/** Takes a `ReadTx`: reading cannot write (build rule R10). */
export async function read(rtx: ReadTx, _scope: Scope, objectId: ObjectId, sequence?: number): Promise<ObjectRead | null> {
  const object = await rtx.object(objectId);
  const head = object ? await rtx.head(objectId) : null;
  if (!object || !head) return null;
  return {
    kind: object.kind, projectId: object.projectId, head,
    revision: sequence === undefined ? head : await rtx.revision(objectId, sequence),
    sequences: await rtx.sequences(objectId),
    sideLine: await rtx.attempts(objectId),
  };
}

/** Pure over recorded history. No capture edges exist yet, so nothing is reached and no marker is derived. */
export async function derive(rtx: ReadTx, _scope: Scope, objectId: ObjectId): Promise<{ markers: readonly never[]; impact: Impact }> {
  return { markers: [], impact: { version: (await rtx.lockState(objectId)).version, reached: [] } };
}
