import { randomUUID } from "node:crypto";
import { ROUTES, ROUTE_RESPONSES, type RouteKey } from "@aiuteur/contract";
import { Pool } from "pg";
import { createPostgresScheduler, migrateDatabase, type Clock, type Ids } from "@aiuteur/store";
import { createMedia } from "@aiuteur/media";
import { FAKE_TEXT_PROFILE, FakeBlobStore, FakeTransport, SpyTransport, testCredential, type RecordedProposal } from "@aiuteur/testing";
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

const HISTORY_TABLES = ["attempt", "capture", "decision", "event", "event_counter", "generation", "generation_call", "generation_run", "generation_settlement", "job", "lock", "media", "object", "project", "revision"].map((table) => `accounts.${table}`).concat(["operator.breaker"]);
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
  // Private media on the in-memory BlobStore (OPERATIONAL-BASELINE §6: `ci`), with the tuning values a composition root sets.
  const blob = await FakeBlobStore.start({ clock });
  const media = createMedia({ blob, clock, ids, maxBytes: 10 * 1024 * 1024, seconds: { view: 3600, download: 300, upload: 600 } });
  return { execution, transport, media, blob, close: async () => { await scheduler.close(); await blob.close(); } };
}

/**
 * VC6, server against the schema: every successful answer of the real API must parse with the response schema that
 * `ROUTE_RESPONSES` declares for its route. The declaration (which the mock server also uses) and the API are two
 * independent sides, so a wrong mapping or a drifting handler turns the suite red.
 */
export function contracted<A extends { request(input: string, init?: RequestInit): Response | Promise<Response> }>(api: A): A {
  const owned = ROUTES.filter((route) => route.access !== "auth").map((route) => ({ key: `${route.method} ${route.path}` as RouteKey, method: route.method as string, pattern: new RegExp(`^${route.path.replace(/:[A-Za-z]+/g, "[^/]+")}$`) }));
  return new Proxy(api, {
    get(target, property) {
      if (property !== "request") return Reflect.get(target, property);
      return async (input: string, init?: RequestInit) => {
        const response = await target.request(input, init);
        if (response.status < 300) {
          const method = (init?.method ?? "GET").toUpperCase();
          const path = new URL(input).pathname;
          const route = owned.find((candidate) => candidate.method === method && candidate.pattern.test(path));
          if (route) {
            const parsed = ROUTE_RESPONSES[route.key].schema.safeParse(await response.clone().json());
            if (!parsed.success) throw new Error(`${route.key} answered ${response.status} with a body its declared response schema rejects: ${JSON.stringify(parsed.error.issues.slice(0, 2))}`);
          }
        }
        return response;
      };
    },
  });
}
