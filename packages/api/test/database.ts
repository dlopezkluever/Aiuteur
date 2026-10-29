import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createPostgresScheduler, migrateDatabase, type Clock, type Ids } from "@aiuteur/store";
import { FAKE_TEXT_PROFILE, FakeTransport, SpyTransport, testCredential, type RecordedProposal } from "@aiuteur/testing";
import type { SubmitInput } from "@aiuteur/providers";
import type { Execution } from "@aiuteur/workflows";

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

const HISTORY_TABLES = ["attempt", "capture", "decision", "event", "event_counter", "generation", "generation_call", "generation_run", "generation_settlement", "job", "lock", "object", "project", "revision"].map((table) => `accounts.${table}`).concat(["operator.breaker"]);
/** Row counts of every persistent table and content hashes of every history table: the #100 read-purity seam (VC3), reused by P11. */
export async function snapshot(pool: Pool) {
  const tables = (await pool.query<{ name: string }>("SELECT n.nspname || '.' || c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname IN ('accounts', 'auth', 'operator') ORDER BY 1")).rows;
  const counts: Record<string, number> = {};
  for (const { name } of tables) counts[name] = Number((await pool.query(`SELECT count(*) AS n FROM ${name.replace(/\.(.*)/, '."$1"')}`)).rows[0].n);
  const content = (await pool.query(HISTORY_TABLES.map((table) => `SELECT md5(coalesce(string_agg(t::text, '|' ORDER BY t::text), '')) FROM ${table} t`).join(" UNION ALL ") .replace(/UNION ALL/g, "UNION ALL"))).rows;
  return { counts, content };
}

/** The composition-root wiring of `execute` for tests: the Postgres Scheduler and a text fake replaying recorded proposals. */
export async function testExecution(database: { url(role?: string): string }, clock: Clock, ids: Ids, proposals: readonly RecordedProposal[] = [], beforeSubmit?: (input: SubmitInput) => Promise<void>, providerCap = 1_000) {
  // Explicit test caps (S8 values are configuration; no production default exists).
  const scheduler = await createPostgresScheduler(database.url("scheduler"), { clock, ids, leaseMs: 60_000, admission: { accountInFlight: 100, providerInFlight: { [FAKE_TEXT_PROFILE.adapterId]: providerCap } } });
  const options = { profile: FAKE_TEXT_PROFILE, clock, webhookSecret: "synthetic-webhook-secret", proposals };
  const transport = beforeSubmit ? new SpyTransport({ ...options, beforeSubmit }) : new FakeTransport(options);
  const execution: Execution = {
    scheduler,
    transportFor: (offeringId) => (offeringId === transport.profile.offeringId ? transport : undefined),
    credential: () => testCredential(),
    environment: "local",
  };
  return { execution, transport, close: () => scheduler.close() };
}
