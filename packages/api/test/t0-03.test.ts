import { randomBytes, randomUUID, createHash } from "node:crypto";
import fc from "fast-check";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { commitOutcomeSchema, projectListSchema, projectSchema, redeemedInvitationSchema, sourceMaterialReadSchema, sourceMaterialRevisionSchema } from "@aiuteur/contract";
import { createPostgresStore } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createHistory } from "@aiuteur/history";
import { sourceMaterialKind } from "@aiuteur/story";
import { createWorkflows } from "@aiuteur/workflows";
import { FakeMailer, ManualClock, uuidv7 } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { freshDatabase } from "./database.ts";

const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const clock = new ManualClock(Date.now());
const ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };
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
  api = createApi({ accounts, views: createViews(store), workflows: createWorkflows({ store, history: createHistory([sourceMaterialKind]), clock, ids }), handleAuth: adapter.handle, origin, clientAddress: () => "203.0.113.3" });
});
afterAll(async () => { await store?.close(); await adapter?.close(); await database?.close(); });

async function call(method: "GET" | "POST", path: string, cookie: string, body?: unknown, key: string = ids.uuid()) {
  return api.request(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": key, cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
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
  expect(after.head.fingerprints).toEqual(first.revision.fingerprints);
  expect(after.sideLine).toMatchObject([{ attemptId: stale.result === "StaleBase" ? stale.attemptId : "", basedOn: 1, origin: "stale-base", text, role: "primary" }]);

  // Restore the head to primary, then race four identical real changes from that one base.
  // Whichever request runs first wins, so the property holds in every ordering.
  expect(await outcome(await call("POST", `${object}/role`, c.cookie, { base: 2, role: "primary" }))).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 3 } });
  const race = await Promise.all(Array.from({ length: 4 }, () => call("POST", `${object}/role`, c.cookie, { base: 3, role: "supporting" })));
  const results = await Promise.all(race.map(outcome));
  expect(results.filter((result) => result.result === "Applied" && result.appended)).toHaveLength(1);
  expect(results.filter((result) => result.result === "StaleBase")).toHaveLength(3);
  const raced = sourceMaterialReadSchema.parse(await (await call("GET", object, c.cookie)).json());
  expect(raced).toMatchObject({ head: { sequence: 4, text, role: "supporting" }, sequences: [1, 2, 3, 4] });
  expect(raced.sideLine).toHaveLength(4);

  // Refusals are visible results, not 500s.
  expect((await call("POST", c.material, c.cookie, { text: "bad \u0000 nul" })).status).toBe(422);
  expect((await call("POST", c.material, c.cookie, { text: "" })).status).toBe(400);
  // The gate, not the route, protects the original: the only edit route carries no text, and a direct commit with other text is refused (history conformance).
  expect((await call("POST", `${object}/role`, c.cookie, { base: 9, role: "primary" })).status).toBe(409);
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
    `${c.material}/${ids.ordered()}`, `${c.base}/${ids.ordered()}/source-material/${ids.ordered()}`,
  ];
  const before = await snapshot(database.inspect);
  expect(before.counts["accounts.lock"]).toBe(0);
  await fc.assert(fc.asyncProperty(fc.array(fc.nat(reads.length - 1), { minLength: 1, maxLength: 20 }), async (order) => {
    for (const index of order) await call("GET", reads[index] ?? "", c.cookie);
    expect(await snapshot(database.inspect)).toEqual(before);
  }), { numRuns: 8 });
});

/**
 * D5, behaviourally: as the table owner, inside the Account that owns the rows, every
 * rewrite of every append-only table must be stopped by the blocking trigger (SQLSTATE 23000).
 * Each statement runs against a real row in a savepoint, so a missing or inert trigger fails it.
 */
async function assertRewritesBlocked(client: PoolClient, accountId: string, tables: readonly string[]) {
  await client.query("SET LOCAL ROLE owner");
  await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [accountId]);
  for (const table of tables) {
    for (const statement of [`UPDATE accounts.${table} SET account_id = account_id`, `DELETE FROM accounts.${table}`, `TRUNCATE accounts.${table} CASCADE`]) {
      await client.query("SAVEPOINT rewrite");
      const blocked = await client.query(statement).then(() => false, (error: { code?: string }) => error.code === "23000");
      await client.query("ROLLBACK TO rewrite");
      if (!blocked) throw new Error(`D5: ${statement} was not blocked by the trigger`);
    }
  }
}

it("D5: runtime roles cannot rewrite history, and the blocking trigger really stops every rewrite", async () => {
  const c = await creator();
  const pasted = await outcome(await call("POST", c.material, c.cookie, { text: "immutable" }));
  if (pasted.result !== "Applied") throw new Error("not applied");
  // A stale write gives the attempt table a row to try to rewrite.
  expect((await call("POST", `${c.material}/${pasted.revision.objectId}/role`, c.cookie, { base: 5, role: "supporting" })).status).toBe(409);
  const mutableCells = ["accounts.settings"];
  const { rows: tables } = await database.inspect.query<{ name: string }>("SELECT n.nspname || '.' || c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname = 'accounts' ORDER BY 1");
  const appendOnly = tables.map((table) => table.name).filter((name) => !mutableCells.includes(name));
  expect(appendOnly).toEqual(["accounts.account", "accounts.attempt", "accounts.idempotency", "accounts.lock", "accounts.object", "accounts.project", "accounts.revision"]);
  for (const name of appendOnly) {
    const [schema, table] = name.split(".");
    for (const role of ["app", "identity", "scheduler", "operator_read", "backup"]) {
      const grants = await database.inspect.query("SELECT has_table_privilege($1, $2, 'UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege($1, $2, 'UPDATE') AS rewrites", [role, `"${schema}"."${table}"`]);
      expect(grants.rows, `${role} on ${name}`).toEqual([{ rewrites: false }]);
    }
  }
  const names = appendOnly.map((name) => name.slice("accounts.".length));
  const client = await database.inspect.connect();
  try {
    // The lock table is empty in the product, so the check gives it one row (rolled back below).
    const arrange = async () => {
      await client.query("BEGIN; SET LOCAL ROLE owner");
      await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [c.accountId]);
      await client.query("INSERT INTO accounts.idempotency VALUES ($1, 'source-material.paste', 'k', 'f', '{}', now())", [c.accountId]);
      await client.query("INSERT INTO accounts.lock VALUES ($1, 1, $2, $3, true, 'test', now())", [pasted.revision.objectId, c.accountId, c.project.projectId]);
    };
    await arrange();
    await assertRewritesBlocked(client, c.accountId, names);
    await client.query("ROLLBACK");
    // Negative control: with one table's trigger disabled the same check must fail.
    for (const trigger of ["append_only_rows", "append_only_truncate"]) {
      await arrange();
      await client.query(`ALTER TABLE accounts.revision DISABLE TRIGGER ${trigger}`);
      await expect(assertRewritesBlocked(client, c.accountId, names)).rejects.toThrow("D5:");
      await client.query("ROLLBACK");
    }
    // A trigger that exists but does not block is just as bad.
    await arrange();
    await client.query("CREATE OR REPLACE FUNCTION accounts.reject_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$");
    await expect(assertRewritesBlocked(client, c.accountId, names)).rejects.toThrow("D5:");
    await client.query("ROLLBACK");
  } finally { await client.query("ROLLBACK").catch(() => undefined); client.release(); }
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

async function counts(accountId: string) {
  const { rows } = await database.inspect.query<Record<string, string>>(
    "SELECT (SELECT count(*) FROM accounts.object WHERE account_id = $1) AS object, (SELECT count(*) FROM accounts.revision WHERE account_id = $1) AS revision, (SELECT count(*) FROM accounts.attempt WHERE account_id = $1) AS attempt, (SELECT count(*) FROM accounts.idempotency WHERE account_id = $1) AS idempotency", [accountId]);
  return Object.fromEntries(Object.entries(rows[0] ?? {}).map(([table, n]) => [table, Number(n)]));
}

it("STORY-DOCUMENTS §4: a replayed paste and a replayed edit return the original result and create nothing", async () => {
  const c = await creator();
  const first = await call("POST", c.material, c.cookie, { text: "once" }, "paste-1");
  const original = await first.text();
  const afterPaste = await counts(c.accountId);
  const replay = await call("POST", c.material, c.cookie, { text: "once" }, "paste-1");
  expect(replay.status).toBe(first.status);
  expect(await replay.text()).toBe(original);
  expect(await counts(c.accountId)).toEqual(afterPaste);
  const pasted = commitOutcomeSchema.parse(JSON.parse(original));
  if (pasted.result !== "Applied") throw new Error("not applied");
  const object = `${c.material}/${pasted.revision.objectId}`;

  const edit = await call("POST", `${object}/role`, c.cookie, { base: 1, role: "supporting" }, "edit-1");
  const editText = await edit.text();
  const afterEdit = await counts(c.accountId);
  const again = await call("POST", `${object}/role`, c.cookie, { base: 1, role: "supporting" }, "edit-1");
  expect(again.status).toBe(edit.status);
  expect(await again.text()).toBe(editText);
  expect(JSON.parse(editText)).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 2 } });
  expect(await counts(c.accountId)).toEqual(afterEdit);
  expect(sourceMaterialReadSchema.parse(await (await call("GET", object, c.cookie)).json())).toMatchObject({ sequences: [1, 2], sideLine: [] });

  // A new action with a different key from the now-obsolete base is an ordinary stale write.
  const stale = await call("POST", `${object}/role`, c.cookie, { base: 1, role: "supporting" }, "edit-2");
  expect(stale.status).toBe(409);
  expect(await outcome(stale)).toMatchObject({ result: "StaleBase", head: 2 });
  expect((await counts(c.accountId))["attempt"]).toBe(1);

  // The key is scoped by operation: the paste key on an edit is a separate action, not the paste's result.
  const other = await outcome(await call("POST", `${object}/role`, c.cookie, { base: 2, role: "primary" }, "paste-1"));
  expect(other).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 3, role: "primary" } });
});

it("STORY-DOCUMENTS §4: reusing a key with different input is refused and executes nothing", async () => {
  const c = await creator();
  const first = await outcome(await call("POST", c.material, c.cookie, { text: "original input" }, "reuse-1"));
  if (first.result !== "Applied") throw new Error("not applied");
  const before = await counts(c.accountId);
  const reused = await call("POST", c.material, c.cookie, { text: "different input" }, "reuse-1");
  expect(reused.status).toBe(422);
  expect(await reused.json()).toEqual({ code: "idempotency-key-reused" });
  expect(await counts(c.accountId)).toEqual(before);
  const path = `${c.material}/${first.revision.objectId}/role`;
  await call("POST", path, c.cookie, { base: 1, role: "supporting" }, "reuse-2");
  const sameEditDifferentRole = await call("POST", path, c.cookie, { base: 1, role: "primary" }, "reuse-2");
  expect(sameEditDifferentRole.status).toBe(422);
  expect(await call("POST", c.material, c.cookie, { text: "x" }, "bad key!")).toMatchObject({ status: 400 });
});

it("STORY-DOCUMENTS §4: overlapping duplicates execute once on real PostgreSQL and agree", async () => {
  const c = await creator();
  const before = await counts(c.accountId);
  const responses = await Promise.all(Array.from({ length: 6 }, () => call("POST", c.material, c.cookie, { text: "racing" }, "dup-1")));
  const bodies = await Promise.all(responses.map((response) => response.text()));
  expect(new Set(responses.map((response) => response.status))).toEqual(new Set([201]));
  expect(new Set(bodies).size).toBe(1);
  const after = await counts(c.accountId);
  expect(after).toEqual({ ...before, object: (before["object"] ?? 0) + 1, revision: (before["revision"] ?? 0) + 1, idempotency: (before["idempotency"] ?? 0) + 1 });
});

it("an idempotency key is private to its Account", async () => {
  const a = await creator();
  const b = await creator();
  const fromA = await outcome(await call("POST", a.material, a.cookie, { text: "A's text" }, "shared-key"));
  const fromB = await outcome(await call("POST", b.material, b.cookie, { text: "B's text" }, "shared-key"));
  if (fromA.result !== "Applied" || fromB.result !== "Applied") throw new Error("not applied");
  expect(fromB.revision.objectId).not.toBe(fromA.revision.objectId);
  expect(fromB.revision.text).toBe("B's text");
  expect((await counts(a.accountId))["idempotency"]).toBe(1);
  expect((await counts(b.accountId))["idempotency"]).toBe(1);
});
