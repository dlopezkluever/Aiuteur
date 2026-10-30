import { z } from "zod";
import { Pool, type PoolClient } from "pg";
import { ACTOR_KINDS, BILLED, CALL_ROLES, DECISION_TYPES, FAILURE_CLASSES, GENERATION_OUTCOMES, IDEMPOTENT_OPERATIONS, ATTEMPT_ORIGINS, JOB_CLASSES, JOB_STATES, OPERATION_CLASSES, REVISION_CAUSES, WORKFLOW_OPERATIONS, accountSchema, actionGroupIdSchema, eventSchema, generationIdSchema, objectIdSchema, projectIdSchema, settingsSchema, type AccountId, type GenerationId, type JobId, type ObjectId, type Project, type ProjectId, type Settings } from "@aiuteur/contract";
import type { AttemptRow, CallRow, CaptureRow, DecisionRow, GenerationRow, JobRow, ReadTx, RevisionRow, RunRow, Scope, SettlementRow, Store, WriteTx } from "./index.ts";
import type { accounts_account, accounts_capture, accounts_decision, accounts_event, accounts_generation, accounts_generation_call, accounts_generation_run, accounts_generation_settlement, accounts_idempotency, accounts_attempt, accounts_job, accounts_lock, accounts_object, accounts_project, accounts_revision, accounts_settings } from "./rows.generated.ts";

/** Boot rejects a privileged login or indirect privileged role membership. */
export async function assertRuntimeRole(pool: Pool, expected: "app" | "identity" | "scheduler"): Promise<void> {
  const result = await pool.query<{ safe: boolean }>(`
    SELECT current_user = $1 AND NOT EXISTS (
      SELECT FROM pg_roles r WHERE
        (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolname = 'owner')
        AND pg_has_role(current_user, r.oid, 'MEMBER')
    ) AND NOT EXISTS (
      SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('accounts', 'auth') AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
    ) AS safe`, [expected]);
  if (result.rows[0]?.safe !== true) throw new Error(`unsafe ${expected} database role`);
}

const project = (row: Pick<accounts_project, "project_id" | "created_at">): Project => ({ projectId: projectIdSchema.parse(row.project_id), createdAt: row.created_at.toISOString() });
const revision = (row: accounts_revision): RevisionRow => ({
  objectId: objectIdSchema.parse(row.object_id), projectId: projectIdSchema.parse(row.project_id), sequence: row.sequence, parent: row.parent,
  cause: z.enum(REVISION_CAUSES).parse(row.cause), actorKind: z.enum(ACTOR_KINDS).parse(row.actor_kind), actionGroup: actionGroupIdSchema.parse(row.action_group), generationId: row.generation_id === null ? null : generationIdSchema.parse(row.generation_id), schemaVersion: row.schema_version, body: row.body, bodyHash: row.body_hash, fingerprints: z.record(z.string(), z.string()).parse(row.fingerprints), createdAt: row.created_at.toISOString(),
});

const iso = (value: Date | null) => (value === null ? null : value.toISOString());
const nullable = <T>(schema: z.ZodType<T>) => (value: unknown) => (value === null ? null : schema.parse(value));
export const jobRow = (row: accounts_job): JobRow => ({
  jobId: row.job_id as JobId, projectId: projectIdSchema.parse(row.project_id), generationId: generationIdSchema.parse(row.generation_id), run: row.run,
  class: z.enum(JOB_CLASSES).parse(row.class), provider: row.provider, state: z.enum(JOB_STATES).parse(row.state), dueAt: iso(row.due_at), deadlineAt: iso(row.deadline_at),
  leaseToken: row.lease_token, leaseExpiresAt: iso(row.lease_expires_at), operationRef: row.operation_ref,
  failureClass: nullable(z.enum(FAILURE_CLASSES))(row.failure_class), billed: nullable(z.enum(BILLED))(row.billed), reason: row.reason,
  createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
});
const decisionRow = (row: accounts_decision): DecisionRow => ({
  objectId: objectIdSchema.parse(row.object_id), projectId: projectIdSchema.parse(row.project_id), sequence: row.sequence, type: z.enum(DECISION_TYPES).parse(row.type),
  payload: row.payload, actor: row.actor, actionGroup: actionGroupIdSchema.parse(row.action_group), createdAt: row.created_at.toISOString(),
});
/** Job columns a compare-and-set may write, by JobRow field. */
const JOB_COLUMNS = { state: "state", dueAt: "due_at", deadlineAt: "deadline_at", leaseToken: "lease_token", leaseExpiresAt: "lease_expires_at", operationRef: "operation_ref", failureClass: "failure_class", billed: "billed", reason: "reason", updatedAt: "updated_at" } as const;

function readTx(client: PoolClient): ReadTx {
  return {
    async generation(id: GenerationId) {
      const { rows } = await client.query<accounts_generation>("SELECT * FROM accounts.generation WHERE generation_id = $1", [id]);
      const row = rows[0];
      return row ? {
        generationId: generationIdSchema.parse(row.generation_id), projectId: projectIdSchema.parse(row.project_id), operation: z.enum(WORKFLOW_OPERATIONS).parse(row.operation),
        operationClass: z.enum(OPERATION_CLASSES).parse(row.operation_class), initiation: row.initiation, effectiveModel: row.effective_model, versions: row.versions,
        testProvider: row.test_provider, resolvedInputs: row.resolved_inputs, captured: row.captured, package: row.package, fitReport: row.fit_report,
        renderedRequest: row.rendered_request, requestDigest: row.request_digest, expectedDigest: row.expected_digest, estimate: row.estimate, target: row.target, createdAt: row.created_at.toISOString(),
      } : null;
    },
    async job(id: JobId) {
      const { rows } = await client.query<accounts_job>("SELECT * FROM accounts.job WHERE job_id = $1", [id]);
      return rows[0] ? jobRow(rows[0]) : null;
    },
    async jobs(generation: GenerationId) {
      const { rows } = await client.query<accounts_job>("SELECT * FROM accounts.job WHERE generation_id = $1 ORDER BY run", [generation]);
      return rows.map(jobRow);
    },
    async runs(generation: GenerationId) {
      const { rows } = await client.query<accounts_generation_run>("SELECT * FROM accounts.generation_run WHERE generation_id = $1 ORDER BY run", [generation]);
      return rows.map((row): RunRow => ({
        generationId: generationIdSchema.parse(row.generation_id), jobId: row.job_id as JobId, projectId: projectIdSchema.parse(row.project_id), run: row.run, state: z.enum(JOB_STATES).parse(row.state),
        operationRef: row.operation_ref, failureClass: nullable(z.enum(FAILURE_CLASSES))(row.failure_class), billed: nullable(z.enum(BILLED))(row.billed), reason: row.reason, createdAt: row.created_at.toISOString(),
      }));
    },
    async calls(generation: GenerationId) {
      const { rows } = await client.query<accounts_generation_call>("SELECT * FROM accounts.generation_call WHERE generation_id = $1 ORDER BY index", [generation]);
      return rows.map((row): CallRow => ({
        generationId: generationIdSchema.parse(row.generation_id), index: row.index, projectId: projectIdSchema.parse(row.project_id), role: z.enum(CALL_ROLES).parse(row.role), jobId: row.job_id as JobId,
        requestDigest: row.request_digest, operationRef: row.operation_ref, response: row.response, verdict: row.verdict, reportedCost: row.reported_cost, createdAt: row.created_at.toISOString(),
      }));
    },
    async settlement(generation: GenerationId) {
      const { rows } = await client.query<accounts_generation_settlement>("SELECT * FROM accounts.generation_settlement WHERE generation_id = $1", [generation]);
      const row = rows[0];
      return row ? { generationId: generationIdSchema.parse(row.generation_id), projectId: projectIdSchema.parse(row.project_id), outcome: z.enum(GENERATION_OUTCOMES).parse(row.outcome), reason: row.reason, actual: row.actual, outputs: row.outputs, settledAt: row.settled_at.toISOString() } satisfies SettlementRow : null;
    },
    async captures(generation: GenerationId) {
      const { rows } = await client.query<accounts_capture>("SELECT * FROM accounts.capture WHERE generation_id = $1 ORDER BY object_id, slice", [generation]);
      return rows.map((row): CaptureRow => ({ generationId: generationIdSchema.parse(row.generation_id), objectId: objectIdSchema.parse(row.object_id), projectId: projectIdSchema.parse(row.project_id), slice: row.slice, sequence: row.sequence, fingerprint: row.fingerprint, createdAt: row.created_at.toISOString() }));
    },
    async decisions(id: ObjectId) {
      const { rows } = await client.query<accounts_decision>("SELECT * FROM accounts.decision WHERE object_id = $1 ORDER BY sequence", [id]);
      return rows.map(decisionRow);
    },
    async latestDecision(project, type, kind) {
      const { rows } = await client.query<accounts_decision>(
        "SELECT d.* FROM accounts.decision d JOIN accounts.object o ON o.object_id = d.object_id WHERE d.project_id = $1 AND d.type = $2 AND o.kind = $3 ORDER BY d.created_at DESC, d.action_group DESC LIMIT 1", [project, type, kind]);
      return rows[0] ? decisionRow(rows[0]) : null;
    },
    async events(after: number) {
      const { rows } = await client.query<accounts_event>("SELECT * FROM accounts.event WHERE sequence > $1 ORDER BY sequence", [after]);
      return rows.map((row) => eventSchema.parse({ ...(row.payload as object), accountId: row.account_id, sequence: row.sequence, type: row.type, occurredAt: row.occurred_at.toISOString() }));
    },
    async projects() {
      const { rows } = await client.query<accounts_project>("SELECT project_id, created_at FROM accounts.project ORDER BY created_at, project_id");
      return rows.map(project);
    },
    async project(id: ProjectId) {
      const { rows } = await client.query<accounts_project>("SELECT project_id, created_at FROM accounts.project WHERE project_id = $1", [id]);
      return rows[0] ? project(rows[0]) : null;
    },
    async object(id: ObjectId) {
      const { rows } = await client.query<accounts_object>("SELECT object_id, project_id, kind FROM accounts.object WHERE object_id = $1", [id]);
      const row = rows[0];
      return row ? { objectId: objectIdSchema.parse(row.object_id), projectId: projectIdSchema.parse(row.project_id), kind: row.kind } : null;
    },
    async objects(project: ProjectId, kind: string) {
      const { rows } = await client.query<accounts_object>("SELECT object_id, project_id, kind FROM accounts.object WHERE project_id = $1 AND kind = $2 ORDER BY created_at, object_id", [project, kind]);
      return rows.map((row) => ({ objectId: objectIdSchema.parse(row.object_id), projectId: projectIdSchema.parse(row.project_id), kind: row.kind }));
    },
    async head(id: ObjectId) {
      const { rows } = await client.query<accounts_revision>("SELECT * FROM accounts.revision WHERE object_id = $1 ORDER BY sequence DESC LIMIT 1", [id]);
      return rows[0] ? revision(rows[0]) : null;
    },
    async revision(id: ObjectId, sequence: number) {
      const { rows } = await client.query<accounts_revision>("SELECT * FROM accounts.revision WHERE object_id = $1 AND sequence = $2", [id, sequence]);
      return rows[0] ? revision(rows[0]) : null;
    },
    async sequences(id: ObjectId) {
      const { rows } = await client.query<Pick<accounts_revision, "sequence">>("SELECT sequence FROM accounts.revision WHERE object_id = $1 ORDER BY sequence", [id]);
      return rows.map((row) => row.sequence);
    },
    async attempts(id: ObjectId) {
      const { rows } = await client.query<accounts_attempt>("SELECT * FROM accounts.attempt WHERE object_id = $1 ORDER BY position", [id]);
      return rows.map((row): AttemptRow => ({
        attemptId: row.attempt_id, objectId: objectIdSchema.parse(row.object_id), projectId: projectIdSchema.parse(row.project_id),
        basedOn: row.based_on, origin: z.enum(ATTEMPT_ORIGINS).parse(row.origin), generationId: row.generation_id === null ? null : generationIdSchema.parse(row.generation_id), body: row.body, createdAt: row.created_at.toISOString(),
      }));
    },
    async lockState(id: ObjectId) {
      const { rows } = await client.query<Pick<accounts_lock, "locked"> & { sequence: number }>("SELECT locked, sequence FROM accounts.lock WHERE object_id = $1 ORDER BY sequence DESC LIMIT 1", [id]);
      return { locked: rows[0]?.locked ?? false, version: rows[0]?.sequence ?? 0 };
    },
    async account(id: AccountId) {
      const { rows } = await client.query<accounts_account>(
        "SELECT account_id, created_at FROM accounts.account WHERE account_id = $1", [id]);
      const row = rows[0];
      return row ? accountSchema.parse({ accountId: row.account_id, createdAt: row.created_at.toISOString() }) : null;
    },
    async settings() {
      const { rows } = await client.query<Pick<accounts_settings, "payload">>("SELECT payload FROM accounts.settings WHERE key = 'studio'");
      return settingsSchema.parse(rows[0]?.payload);
    },
  };
}

export async function createPostgresStore(connectionString: string): Promise<Store & { close(): Promise<void> }> {
  const pool = new Pool({ connectionString });
  try { await assertRuntimeRole(pool, "app"); } catch (error) { await pool.end(); throw error; }
  async function transaction<T, X extends ReadTx>(scope: Scope, write: boolean, tx: (client: PoolClient) => X, run: (tx: X) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query(write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [scope.accountId]);
      if (write) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [scope.accountId]);
      const result = await run(tx(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  const writeTx = (scope: Scope) => (client: PoolClient): WriteTx => ({
    ...readTx(client),
    async putSettings(settings: Settings) {
      await client.query("UPDATE accounts.settings SET payload = $1 WHERE key = 'studio'", [JSON.stringify(settings)]);
    },
    async idempotency(operation, key) {
      const { rows } = await client.query<accounts_idempotency>("SELECT * FROM accounts.idempotency WHERE operation = $1 AND key = $2", [operation, key]);
      const row = rows[0];
      return row ? { operation: z.enum(IDEMPOTENT_OPERATIONS).parse(row.operation), key: row.key, fingerprint: row.fingerprint, result: row.result, createdAt: row.created_at.toISOString() } : null;
    },
    async recordIdempotency(row) {
      await client.query("INSERT INTO accounts.idempotency (account_id, operation, key, fingerprint, result, created_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6)",
        [scope.accountId, row.operation, row.key, row.fingerprint, JSON.stringify(row.result), row.createdAt]);
    },
    async insertProject(value) {
      await client.query("INSERT INTO accounts.project (project_id, account_id, created_at) VALUES ($1, $2, $3)", [value.projectId, scope.accountId, value.createdAt]);
    },
    async insertObject(row) {
      await client.query("INSERT INTO accounts.object (object_id, account_id, project_id, kind, created_at) VALUES ($1, $2, $3, $4, $5)", [row.objectId, scope.accountId, row.projectId, row.kind, row.createdAt]);
    },
    async appendRevision(row) {
      await client.query(
        `INSERT INTO accounts.revision (object_id, sequence, account_id, project_id, parent, cause, actor_kind, action_group, generation_id, schema_version, body, body_hash, fingerprints, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13::jsonb, $14)`,
        [row.objectId, row.sequence, scope.accountId, row.projectId, row.parent, row.cause, row.actorKind, row.actionGroup, row.generationId, row.schemaVersion, JSON.stringify(row.body), row.bodyHash, JSON.stringify(row.fingerprints), row.createdAt]);
    },
    async insertCapture(row: CaptureRow) {
      await client.query("INSERT INTO accounts.capture (generation_id, object_id, slice, account_id, project_id, sequence, fingerprint, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [row.generationId, row.objectId, row.slice, scope.accountId, row.projectId, row.sequence, row.fingerprint, row.createdAt]);
    },
    async appendDecision(row: DecisionRow) {
      await client.query("INSERT INTO accounts.decision (object_id, sequence, account_id, project_id, type, payload, actor, action_group, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)",
        [row.objectId, row.sequence, scope.accountId, row.projectId, row.type, JSON.stringify(row.payload), row.actor, row.actionGroup, row.createdAt]);
    },
    async insertGeneration(row: GenerationRow) {
      await client.query(
        `INSERT INTO accounts.generation (generation_id, account_id, project_id, operation, operation_class, initiation, effective_model, versions, test_provider, resolved_inputs, captured, package, fit_report, rendered_request, request_digest, expected_digest, estimate, target, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, $17::jsonb, $18::jsonb, $19)`,
        [row.generationId, scope.accountId, row.projectId, row.operation, row.operationClass, JSON.stringify(row.initiation), JSON.stringify(row.effectiveModel), JSON.stringify(row.versions), row.testProvider,
          JSON.stringify(row.resolvedInputs), JSON.stringify(row.captured), JSON.stringify(row.package), JSON.stringify(row.fitReport), JSON.stringify(row.renderedRequest), row.requestDigest, row.expectedDigest,
          JSON.stringify(row.estimate), JSON.stringify(row.target), row.createdAt]);
    },
    async insertJob(row: JobRow) {
      await client.query(
        `INSERT INTO accounts.job (job_id, account_id, project_id, generation_id, run, class, provider, state, due_at, deadline_at, lease_token, lease_expires_at, operation_ref, failure_class, billed, reason, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [row.jobId, scope.accountId, row.projectId, row.generationId, row.run, row.class, row.provider, row.state, row.dueAt, row.deadlineAt, row.leaseToken, row.leaseExpiresAt, row.operationRef, row.failureClass, row.billed, row.reason, row.createdAt, row.updatedAt]);
    },
    async updateJob(id, expected, change) {
      const entries = Object.entries(change) as [keyof typeof JOB_COLUMNS, unknown][];
      const sets = entries.map(([field], index) => `${JOB_COLUMNS[field]} = $${index + 4}`).join(", ");
      const result = await client.query(`UPDATE accounts.job SET ${sets} WHERE job_id = $1 AND state = $2 AND lease_token IS NOT DISTINCT FROM $3::uuid`, [id, expected.state, expected.leaseToken, ...entries.map(([, value]) => value)]);
      return result.rowCount === 1;
    },
    async insertRun(row: RunRow) {
      await client.query("INSERT INTO accounts.generation_run (generation_id, job_id, account_id, project_id, run, state, operation_ref, failure_class, billed, reason, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [row.generationId, row.jobId, scope.accountId, row.projectId, row.run, row.state, row.operationRef, row.failureClass, row.billed, row.reason, row.createdAt]);
    },
    async insertCall(row: CallRow) {
      await client.query("INSERT INTO accounts.generation_call (generation_id, index, account_id, project_id, role, job_id, request_digest, operation_ref, response, verdict, reported_cost, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12)",
        [row.generationId, row.index, scope.accountId, row.projectId, row.role, row.jobId, row.requestDigest, row.operationRef, row.response, JSON.stringify(row.verdict), JSON.stringify(row.reportedCost), row.createdAt]);
    },
    async insertSettlement(row: SettlementRow) {
      await client.query("INSERT INTO accounts.generation_settlement (generation_id, account_id, project_id, outcome, reason, actual, outputs, settled_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)",
        [row.generationId, scope.accountId, row.projectId, row.outcome, row.reason, JSON.stringify(row.actual), JSON.stringify(row.outputs), row.settledAt]);
    },
    async appendEvent({ type, occurredAt, ...payload }) {
      // The Account's next number, taken under the Account's write lock: gap-free and commit-ordered (RUNTIME §6).
      const { rows } = await client.query<{ next: number }>(
        "INSERT INTO accounts.event_counter (account_id, next) VALUES ($1, 2) ON CONFLICT (account_id) DO UPDATE SET next = accounts.event_counter.next + 1 RETURNING next", [scope.accountId]);
      const sequence = rows[0]!.next - 1;
      await client.query("INSERT INTO accounts.event (account_id, sequence, type, payload, occurred_at) VALUES ($1, $2, $3, $4::jsonb, $5)", [scope.accountId, sequence, type, JSON.stringify(payload), occurredAt]);
      return sequence;
    },
    async insertAttempt(row) {
      await client.query(
        "INSERT INTO accounts.attempt (attempt_id, object_id, account_id, project_id, based_on, origin, generation_id, body, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)",
        [row.attemptId, row.objectId, scope.accountId, row.projectId, row.basedOn, row.origin, row.generationId, JSON.stringify(row.body), row.createdAt]);
    },
  });
  return {
    read: (scope, run) => transaction(scope, false, readTx, run),
    write: (scope, run) => transaction(scope, true, writeTx(scope), run),
    close: () => pool.end(),
  };
}
