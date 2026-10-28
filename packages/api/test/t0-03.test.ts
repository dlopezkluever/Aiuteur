import { randomBytes, randomUUID, createHash } from "node:crypto";
import fc from "fast-check";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { commitOutcomeSchema, projectListSchema, projectSchema, redeemedInvitationSchema, sourceMaterialReadSchema, sourceMaterialRevisionSchema, ROUTES } from "@aiuteur/contract";
import { createPostgresStore } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createWorkflows } from "@aiuteur/workflows";
import { FakeMailer, ManualClock } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { freshDatabase } from "./database.ts";

const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const clock = new ManualClock(Date.now());
const ids = { uuid: randomUUID, token: () => randomBytes(32).toString("base64url") };
let database: Awaited<ReturnType<typeof freshDatabase>>;
let adapter: Awaited<ReturnType<typeof createBetterAuth>>;
let store: Awaited<ReturnType<typeof createPostgresStore>>;
let api: ReturnType<typeof createApi>;

beforeAll(async () => {
  database = await freshDatabase();
  adapter = await createBetterAuth({ connectionString: database.url("identity"), baseURL: origin, secret: "synthetic-test-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86400 });
  store = await createPostgresStore(database.url("app"));
  const generous = { max: 1_000_000, windowMs: 60_000 };
  const limit = { address: generous, email: generous };
  const accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: [], mailer: new FakeMailer(), limits: { signIn: limit, recovery: limit, redemption: limit }, recoveryTtlMs: 600_000, recoveryPage: `${origin}/recover`, onMailFailure: (error) => { throw error; } });
  api = createApi({ accounts, views: createViews(store), workflows: createWorkflows({ store, clock, ids }), handleAuth: adapter.handle, origin, clientAddress: () => "203.0.113.3" });
});
afterAll(async () => { await store?.close(); await adapter?.close(); await database?.close(); });

async function call(method: "GET" | "POST", path: string, cookie: string, body?: unknown) {
  return api.request(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function creator() {
  const email = `${ids.uuid()}@example.test`;
  const token = ids.token();
  await adapter.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: clock.now(), expiresAt: clock.now() + 60_000, issuedBy: null, auditId: ids.uuid() });
  const redeemed = await call("POST", "/api/invitations/redeem", "", { token, email, name: "Synthetic creator", password });
  const { accountId } = redeemedInvitationSchema.parse(await redeemed.json());
  const signIn = await call("POST", "/api/auth/sign-in/email", "", { email, password });
  const cookie = signIn.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const base = `/api/studios/${accountId}/projects`;
  const created = await call("POST", base, cookie);
  expect(created.status).toBe(201);
  const project = projectSchema.parse(await created.json());
  return { accountId, cookie, base, project, material: `${base}/${project.projectId}/source-material` };
}
const outcome = async (response: Response) => commitOutcomeSchema.parse(await response.json());

it("demo: paste is kept as Source Material, read back byte-identical; a stale write is StaleBase and its loser is kept", async () => {
  const c = await creator();
  const listed = projectListSchema.parse(await (await call("GET", c.base, c.cookie)).json());
  expect(listed.projects).toEqual([c.project]);

  const text = "  INT. KITCHEN — NIGHT\r\n\r\nShe sets the kettle down. “Not again.” 🎬\u2028 trailing space \n";
  const pasted = await call("POST", c.material, c.cookie, { text });
  expect(pasted.status).toBe(201);
  const first = await outcome(pasted);
  if (first.result !== "Applied") throw new Error("not applied");
  const object = `${c.material}/${first.revision.objectId}`;
  expect(first.revision).toMatchObject({ sequence: 1, text, role: "primary" });

  const readBack = sourceMaterialReadSchema.parse(await (await call("GET", object, c.cookie)).json());
  expect(readBack.head.text).toBe(text);
  expect(Buffer.from(readBack.head.text)).toEqual(Buffer.from(text));
  expect(readBack).toMatchObject({ sequences: [1], sideLine: [] });
  const revision1 = sourceMaterialRevisionSchema.parse(await (await call("GET", `${object}/revisions/1`, c.cookie)).json());
  expect(revision1).toEqual(first.revision);

  // A later write is a new immutable Revision; Revision 1 is unchanged.
  const second = await outcome(await call("POST", `${object}/role`, c.cookie, { base: 1, role: "supporting" }));
  expect(second).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 2, text, role: "supporting" } });
  expect(sourceMaterialRevisionSchema.parse(await (await call("GET", `${object}/revisions/1`, c.cookie)).json())).toEqual(revision1);

  // A write from the outdated base 1 loses; the winner stays head and the loser is kept.
  const lost = await call("POST", `${object}/role`, c.cookie, { base: 1, role: "primary" });
  expect(lost.status).toBe(409);
  const stale = await outcome(lost);
  expect(stale).toMatchObject({ result: "StaleBase", head: 2 });
  const after = sourceMaterialReadSchema.parse(await (await call("GET", object, c.cookie)).json());
  expect(after.head).toEqual(second.result === "Applied" ? second.revision : null);
  expect(after.sequences).toEqual([1, 2]);
  expect(after.sideLine).toMatchObject([{ attemptId: stale.result === "StaleBase" ? stale.attemptId : "", basedOn: 1, origin: "stale-base", text, role: "primary" }]);

  // Two concurrent writes from the same base: one winner, one StaleBase, none lost.
  const race = await Promise.all((["primary", "supporting"] as const).map((role) => call("POST", `${object}/role`, c.cookie, { base: 2, role })));
  const results = await Promise.all(race.map(outcome));
  expect(results.map((result) => result.result).sort()).toEqual(["Applied", "StaleBase"]);
  expect(sourceMaterialReadSchema.parse(await (await call("GET", object, c.cookie)).json())).toMatchObject({ sequences: [1, 2, 3], sideLine: [{}, {}] });

  // Refusals are visible results, not 500s.
  expect((await call("POST", c.material, c.cookie, { text: "bad \u0000 nul" })).status).toBe(422);
  expect((await call("POST", c.material, c.cookie, { text: "" })).status).toBe(400);
  expect((await call("POST", `${object}/role`, c.cookie, { base: 9, role: "primary" })).status).toBe(409);
});

it("another Account sees the same 404 for a real project or object as for an absent one", async () => {
  const a = await creator();
  const b = await creator();
  const pasted = await outcome(await call("POST", a.material, a.cookie, { text: "private" }));
  if (pasted.result !== "Applied") throw new Error("not applied");
  const object = pasted.revision.objectId;
  const absent = ids.uuid();
  const probes: Array<["GET" | "POST", (project: string, object: string) => string, unknown?]> = [
    ["GET", (project, id) => `${a.base}/${project}/source-material/${id}`],
    ["GET", (project, id) => `${a.base}/${project}/source-material/${id}/revisions/1`],
    ["POST", (project) => `${a.base}/${project}/source-material`, { text: "intruder" }],
    ["POST", (project, id) => `${a.base}/${project}/source-material/${id}/role`, { base: 1, role: "supporting" }],
  ];
  for (const [method, path, body] of probes) {
    // Account B on Account A's path, and on its own path with A's ids, against absent ids.
    for (const target of [(p: string, o: string) => path(p, o), (p: string, o: string) => path(p, o).replace(a.accountId, b.accountId)]) {
      const real = await call(method, target(a.project.projectId, object), b.cookie, body);
      const missing = await call(method, target(absent, absent), b.cookie, body);
      expect(real.status).toBe(404);
      expect(missing.status).toBe(404);
      expect([...real.headers]).toEqual([...missing.headers]);
      expect(await real.text()).toBe(await missing.text());
    }
  }
  // B's own project cannot reach A's object either.
  const sneaky = await call("GET", `${b.material}/${object}`, b.cookie);
  expect(sneaky.status).toBe(404);
  const viaA = sourceMaterialReadSchema.parse(await (await call("GET", `${a.material}/${object}`, a.cookie)).json());
  expect(viaA.sequences).toEqual([1]);
  expect(ROUTES.filter((route) => route.path.includes("source-material")).length).toBe(4);
});

const HISTORY_TABLES = ["attempt", "lock", "object", "project", "revision"] as const;
async function snapshot(pool: Pool) {
  const tables = (await pool.query<{ name: string }>("SELECT n.nspname || '.' || c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname IN ('accounts', 'auth') ORDER BY 1")).rows;
  const counts: Record<string, number> = {};
  for (const { name } of tables) counts[name] = Number((await pool.query(`SELECT count(*) AS n FROM ${name.replace(/\.(.*)/, '."$1"')}`)).rows[0].n);
  const content = (await pool.query(HISTORY_TABLES.map((table) => `SELECT md5(coalesce(string_agg(t::text, '|' ORDER BY t::text), '')) AS ${table} FROM accounts.${table} t`).join(" UNION ALL ") .replace(/UNION ALL/g, "UNION ALL"))).rows;
  return { counts, content };
}

it("VC3: any sequence of API reads leaves every persistent row count and all history content unchanged", async () => {
  const c = await creator();
  const object = await outcome(await call("POST", c.material, c.cookie, { text: "read me" }));
  if (object.result !== "Applied") throw new Error("not applied");
  const path = `${c.material}/${object.revision.objectId}`;
  await call("POST", `${path}/role`, c.cookie, { base: 1, role: "supporting" });
  await call("POST", `${path}/role`, c.cookie, { base: 1, role: "primary" });
  const reads = [
    `/api/studios/${c.accountId}`, c.base, path, `${path}/revisions/1`, `${path}/revisions/2`, `${path}/revisions/77`,
    `${c.material}/${ids.uuid()}`, `${c.base}/${ids.uuid()}/source-material/${ids.uuid()}`,
  ];
  const before = await snapshot(database.inspect);
  expect(before.counts["accounts.lock"]).toBe(0);
  await fc.assert(fc.asyncProperty(fc.array(fc.nat(reads.length - 1), { minLength: 1, maxLength: 20 }), async (order) => {
    for (const index of order) await call("GET", reads[index] ?? "", c.cookie);
    expect(await snapshot(database.inspect)).toEqual(before);
  }), { numRuns: 8 });
});

it("D5: every tenant table except the mutable cells is append-only, by grants and by a trigger that also stops the owner", async () => {
  const c = await creator();
  const pasted = await outcome(await call("POST", c.material, c.cookie, { text: "immutable" }));
  if (pasted.result !== "Applied") throw new Error("not applied");
  // A stale write gives the attempt table a row to try to rewrite.
  expect((await call("POST", `${c.material}/${pasted.revision.objectId}/role`, c.cookie, { base: 5, role: "supporting" })).status).toBe(409);
  const mutableCells = ["accounts.settings"];
  const { rows: tables } = await database.inspect.query<{ name: string }>("SELECT n.nspname || '.' || c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname = 'accounts' ORDER BY 1");
  const appendOnly = tables.map((table) => table.name).filter((name) => !mutableCells.includes(name));
  expect(appendOnly).toEqual(["accounts.account", "accounts.attempt", "accounts.lock", "accounts.object", "accounts.project", "accounts.revision"]);
  for (const name of appendOnly) {
    const [schema, table] = name.split(".");
    const triggers = await database.inspect.query<{ tgname: string }>("SELECT tgname FROM pg_trigger WHERE tgrelid = $1::regclass AND NOT tgisinternal ORDER BY tgname", [name]);
    expect(triggers.rows.map((row) => row.tgname), name).toEqual(["append_only_rows", "append_only_truncate"]);
    for (const role of ["app", "identity", "scheduler", "operator_read", "backup"]) {
      const grants = await database.inspect.query("SELECT has_table_privilege($1, $2, 'UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege($1, $2, 'UPDATE') AS rewrites", [role, `"${schema}"."${table}"`]);
      expect(grants.rows, `${role} on ${name}`).toEqual([{ rewrites: false }]);
    }
  }
  // The trigger refuses even the owner, inside the Account that owns the rows.
  const client = await database.inspect.connect();
  try {
    for (const statement of [
      "UPDATE accounts.revision SET body = '{}'", "DELETE FROM accounts.revision", "TRUNCATE accounts.revision",
      "UPDATE accounts.attempt SET based_on = 1", "DELETE FROM accounts.object", "DELETE FROM accounts.project",
    ]) {
      await client.query("BEGIN; SET LOCAL ROLE owner");
      await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [c.accountId]);
      await expect(client.query(statement), statement).rejects.toMatchObject({ code: "23000" });
      await client.query("ROLLBACK");
    }
  } finally { client.release(); }
  // The app role cannot write the lock table at all, and the table is empty.
  const app = new Pool({ connectionString: database.url("app") });
  try {
    await expect(app.query("INSERT INTO accounts.lock VALUES ($1, 1, $2, $3, true, 'x', now())", [pasted.revision.objectId, c.accountId, c.project.projectId])).rejects.toMatchObject({ code: "42501" });
    await expect(app.query("UPDATE accounts.revision SET body = '{}'")).rejects.toMatchObject({ code: "42501" });
  } finally { await app.end(); }
  expect(Number((await database.inspect.query("SELECT count(*) AS n FROM accounts.lock")).rows[0].n)).toBe(0);
  expect((await call("GET", `${c.material}/${pasted.revision.objectId}`, c.cookie)).status).toBe(200);
});

it("D6: no tenant column is named as a marker, staleness or outdated flag", async () => {
  const marker = /(marker|outdated|out_of_date|stale|dirty|needs_(update|refresh|review|reconcile)|invalidated|is_current|up_to_date)/i;
  // The matcher recognises the forms it exists to forbid. `origin = 'stale-base'` is data, not a column.
  for (const name of ["is_outdated", "stale", "marker", "needs_review", "OutOfDate"].map((n) => n.replace("OutOfDate", "out_of_date"))) expect(marker.test(name), name).toBe(true);
  const { rows } = await database.inspect.query<{ table: string; column: string; type: string }>(`
    SELECT c.relname AS "table", a.attname AS "column", format_type(a.atttypid, a.atttypmod) AS type FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'accounts' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped ORDER BY 1, 2`);
  expect(rows.length).toBeGreaterThan(30);
  expect(rows.filter((row) => marker.test(row.column) || marker.test(row.type))).toEqual([]);
});
