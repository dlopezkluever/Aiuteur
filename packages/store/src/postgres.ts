import { z } from "zod";
import { Pool, type PoolClient } from "pg";
import { accountSchema, objectIdSchema, projectIdSchema, settingsSchema, type AccountId, type ObjectId, type Project, type ProjectId, type Settings } from "@aiuteur/contract";
import type { AttemptRow, ReadTx, RevisionRow, Scope, Store, WriteTx } from "./index.ts";
import type { accounts_account, accounts_attempt, accounts_lock, accounts_object, accounts_project, accounts_revision, accounts_settings } from "./rows.generated.ts";

/** Boot rejects a privileged login or indirect privileged role membership. */
export async function assertRuntimeRole(pool: Pool, expected: "app" | "identity"): Promise<void> {
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
  cause: row.cause, actorKind: row.actor_kind, schemaVersion: row.schema_version, body: row.body, bodyHash: row.body_hash, fingerprints: z.record(z.string(), z.string()).parse(row.fingerprints), createdAt: row.created_at.toISOString(),
});

function readTx(client: PoolClient): ReadTx {
  return {
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
        basedOn: row.based_on, origin: row.origin === "held" ? "held" : "stale-base", body: row.body, createdAt: row.created_at.toISOString(),
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
    async insertProject(value) {
      await client.query("INSERT INTO accounts.project (project_id, account_id, created_at) VALUES ($1, $2, $3)", [value.projectId, scope.accountId, value.createdAt]);
    },
    async insertObject(row) {
      await client.query("INSERT INTO accounts.object (object_id, account_id, project_id, kind, created_at) VALUES ($1, $2, $3, $4, $5)", [row.objectId, scope.accountId, row.projectId, row.kind, row.createdAt]);
    },
    async appendRevision(row) {
      await client.query(
        `INSERT INTO accounts.revision (object_id, sequence, account_id, project_id, parent, cause, actor_kind, schema_version, body, body_hash, fingerprints, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12)`,
        [row.objectId, row.sequence, scope.accountId, row.projectId, row.parent, row.cause, row.actorKind, row.schemaVersion, JSON.stringify(row.body), row.bodyHash, JSON.stringify(row.fingerprints), row.createdAt]);
    },
    async insertAttempt(row) {
      await client.query(
        "INSERT INTO accounts.attempt (attempt_id, object_id, account_id, project_id, based_on, origin, body, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)",
        [row.attemptId, row.objectId, scope.accountId, row.projectId, row.basedOn, row.origin, JSON.stringify(row.body), row.createdAt]);
    },
  });
  return {
    read: (scope, run) => transaction(scope, false, readTx, run),
    write: (scope, run) => transaction(scope, true, writeTx(scope), run),
    close: () => pool.end(),
  };
}
