import { createHash } from "node:crypto";
import { AI_CAUSES, type ActionGroupId, type ActorKind, type GenerationId, type ObjectId, type ProjectId, type RefusalReason, type RevisionCause } from "@aiuteur/contract";
import type { AttemptRow, Ids, ReadTx, RevisionRow, Scope, WriteTx } from "@aiuteur/store";

// Draft FC3 (the write gate) and FC4 (kind declaration). Neither is frozen at T0-03.

/** FC4 Draft: what a module declares about a kind (MODULE §5.5). `history` runs `parse` and `invariants` on every Revision. */
export interface KindDeclaration<Body = unknown> {
  readonly kind: string;
  readonly schemaVersion: number;
  /** The body as the kind's schema reads it, or null when it is not valid. */
  parse(body: unknown): Body | null;
  /**
   * Registered invariants, checked on every commit with the new body and the head
   * body it continues (null for an object's first Revision).
   */
  readonly invariants: readonly ((body: Body, previous: Body | null) => boolean)[];
  /**
   * The units lineage names: slice name to the part of the body the slice covers.
   * `history` fingerprints each at write time and stores the result on the Revision
   * (ADR 0020). Once a capture references a slice its function is frozen.
   */
  readonly slices: Readonly<Record<string, (body: Body) => unknown>>;
  readonly narrativeBearing: readonly string[];
  readonly declaredIndexes: readonly string[];
  readonly extractedColumns: readonly string[];
  readonly remap: "new-ids";
  readonly closure: "object";
  readonly separability: "project";
}

/** FC3 Draft: server state in the real grant (MODULE §5.2); only its shape exists at T0-03. */
export interface EditSessionGrant { readonly objectId: ObjectId; readonly creatorId: Scope["creatorId"]; readonly impactVersion: number }
export type GrantEditSession = (wtx: WriteTx, scope: Scope, request: { objectId: ObjectId; impactVersion: number }) => Promise<EditSessionGrant | NeedsConfirmation>;

export interface Change {
  /** The name of a kind registered with `createHistory`; the rules come from that registration, never from the caller. */
  readonly kind: string;
  readonly projectId: ProjectId;
  readonly objectId: ObjectId;
  /** The sequence of the Revision this write was based on; 0 creates the object. */
  readonly base: number;
  /** The new body, or a function of the head body, so a caller never reads history itself (R1). Called under the write lock; the head is null for a new object. */
  readonly body: unknown | ((current: unknown) => unknown);
}
export interface CommitContext {
  readonly actor: ActorKind;
  readonly cause: RevisionCause;
  /** Ties this commit to the creator action it belongs to; minted by the use case in `workflows` (MODULE §5.1). */
  readonly actionGroup: ActionGroupId;
  /** The Generation that made the content. Required when the actor is a Generation or the cause is AI-made, and refused otherwise (MODULE §5.1, AI-map G7). Opaque until #102. */
  readonly generationId?: GenerationId;
  /** From the injected Clock. */
  readonly at: number;
  readonly ids: Ids;
  readonly editSession?: EditSessionGrant;
}
export interface Impact { readonly version: number; readonly reached: readonly ObjectId[] }
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
const sha256 = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
/** Over the body exactly as stored, independent of key order. */
export const bodyHash = sha256;
/** Slice name to content fingerprint, computed once at write time and never recomputed on read. */
function fingerprints(kind: KindDeclaration, body: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(kind.slices).map(([slice, project]) => [slice, sha256(project(body))]));
}

/**
 * The single write gate. Callers pass a `WriteTx`, which the Store hands out only
 * after taking its per-Account lock, so the head, lock state and base are read
 * under that lock and the append that follows cannot be overtaken. Inside one
 * transaction a Revision is appended (`Applied`) or nothing is, except the loser
 * kept on a side line (`StaleBase`, `HeldAsOption`).
 */
async function commit(kinds: ReadonlyMap<string, KindDeclaration>, wtx: WriteTx, scope: Scope, change: Change, ctx: CommitContext): Promise<CommitResult> {
  const refuse = (reason: RefusalReason): CommitResult => ({ result: "Refused", reason });
  const declaration = typeof change.kind === "string" ? kinds.get(change.kind) : undefined;
  if (!declaration) return refuse("unknown-kind");
  // AI-made content needs its Generation; nothing else may claim one. Refused before anything is stored.
  const aiMade = ctx.actor === "generation" || AI_CAUSES.includes(ctx.cause);
  if (aiMade !== (ctx.generationId !== undefined) || (aiMade && ctx.actor !== "generation")) return refuse("missing-provenance");
  if (!await wtx.project(change.projectId)) return refuse("not-found");
  const object = await wtx.object(change.objectId);
  if (object && object.projectId !== change.projectId) return refuse("not-found");
  if (object && object.kind !== declaration.kind) return refuse("kind-mismatch");
  if (!object && change.base !== 0) return refuse("not-found");
  const head = await wtx.head(change.objectId);
  const current = head ? declaration.parse(head.body) : null;
  const proposed = typeof change.body === "function" ? (change.body as (current: unknown) => unknown)(current) : change.body;
  const body = declaration.parse(proposed);
  if (body === null) return refuse("invalid-body");
  // A base of 0 continues nothing; any other base continues what the head holds.
  const previous = change.base === 0 ? null : current;
  if (!declaration.invariants.every((invariant) => invariant(body, previous))) return refuse("invariant-violated");

  const at = new Date(ctx.at).toISOString();
  const keep = async (origin: AttemptRow["origin"]) => {
    const attemptId = ctx.ids.ordered();
    await wtx.insertAttempt({ attemptId, objectId: change.objectId, projectId: change.projectId, basedOn: change.base, origin, generationId: ctx.generationId ?? null, body, createdAt: at });
    return attemptId;
  };

  const lock = object ? await wtx.lockState(change.objectId) : { locked: false, version: 0 };
  const grant = ctx.editSession;
  const through = grant !== undefined && grant.objectId === change.objectId && grant.creatorId === scope.creatorId && grant.impactVersion === lock.version;
  if (lock.locked && !through) {
    if (ctx.actor === "generation") return { result: "HeldAsOption", attemptId: await keep("held") };
    return { result: "NeedsConfirmation", impact: { version: lock.version, reached: [] } };
  }

  const headSequence = head?.sequence ?? 0;
  if (change.base !== headSequence) return { result: "StaleBase", head: headSequence, attemptId: await keep("stale-base") };

  const hash = bodyHash(body);
  if (head && head.bodyHash === hash) return { result: "Applied", appended: false, revision: head };
  if (!object) await wtx.insertObject({ objectId: change.objectId, projectId: change.projectId, kind: declaration.kind, createdAt: at });
  const revision: RevisionRow = {
    objectId: change.objectId, projectId: change.projectId, sequence: headSequence + 1, parent: headSequence,
    cause: ctx.cause, actorKind: ctx.actor, actionGroup: ctx.actionGroup, generationId: ctx.generationId ?? null, schemaVersion: declaration.schemaVersion, body, bodyHash: hash, fingerprints: fingerprints(declaration, body), createdAt: at,
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

/**
 * Composition registers the owning modules' FC4 declarations once. `commit` resolves a Change's
 * kind name to the registered declaration, so no caller supplies the parser, invariants, slices or
 * schema version it is judged by. `history` imports no domain module.
 */
export function createHistory(declarations: readonly KindDeclaration<any>[]) {
  const kinds = new Map<string, KindDeclaration>();
  for (const declaration of declarations) {
    if (kinds.has(declaration.kind)) throw new Error(`kind registered twice: ${declaration.kind}`);
    kinds.set(declaration.kind, declaration);
  }
  return {
    commit: (wtx: WriteTx, scope: Scope, change: Change, ctx: CommitContext) => commit(kinds, wtx, scope, change, ctx),
    read,
    derive,
  };
}
export type History = ReturnType<typeof createHistory>;
