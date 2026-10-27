import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrateDatabase } from "@aiuteur/store";

/** Only databases created here are ever destroyed. Missing Postgres is a failure. */
export async function freshDatabase() {
  const base = process.env["TEST_POSTGRES_URL"];
  if (!base) throw new Error("TEST_POSTGRES_URL required: a disposable local Postgres bootstrap connection (see change-records/T0-01.md)");
  const baseURL = new URL(base);
  const name = `t0_01_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: base });
  await admin.query(`CREATE DATABASE ${name} TEMPLATE template0`);
  function url(role?: string) {
    const value = new URL(baseURL);
    value.pathname = name;
    if (role) { value.username = role; value.password = ""; }
    return value.href;
  }
  try { await migrateDatabase(url()); }
  catch (error) { await admin.query(`DROP DATABASE ${name}`); await admin.end(); throw error; }
  const inspect = new Pool({ connectionString: url() });
  return {
    url, inspect,
    async close() { await inspect.end(); await admin.query(`DROP DATABASE ${name}`); await admin.end(); },
  };
}
