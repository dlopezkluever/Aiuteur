import { Pool, type PoolClient } from "pg";
import { accountSchema, settingsSchema, type AccountId, type Settings } from "@aiuteur/contract";
import type { ReadTx, Scope, Store, WriteTx } from "./index.ts";
import type { accounts_account, accounts_settings } from "./rows.generated.ts";

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

function readTx(client: PoolClient): ReadTx {
  return {
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
  async function transaction<T>(scope: Scope, write: boolean, run: (tx: WriteTx) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query(write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [scope.accountId]);
      if (write) await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [scope.accountId]);
      const tx = {
        ...readTx(client),
        async putSettings(settings: Settings) {
          await client.query("UPDATE accounts.settings SET payload = $1 WHERE key = 'studio'", [JSON.stringify(settings)]);
        },
      };
      const result = await run(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  return {
    read: (scope, run) => transaction(scope, false, (tx) => run({ account: tx.account, settings: tx.settings })),
    write: (scope, run) => transaction(scope, true, run),
    close: () => pool.end(),
  };
}
