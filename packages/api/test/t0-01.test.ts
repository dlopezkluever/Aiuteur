import { randomBytes, randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { TOTP, Secret } from "otpauth";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { accountIdSchema, creatorIdSchema, studioSchema, projectListSchema, invitationSchema, redeemedInvitationSchema, ROUTES, eventSchema, AUDIT_ACTIONS } from "@aiuteur/contract";
import { createPostgresStore, migrateDatabase, schemaCatalogue } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { describeStoreConformance, FakeMailer, ManualClock } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { freshDatabase } from "./database.ts";

const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const clock = new ManualClock(Date.now());
const ids = { uuid: randomUUID, token: () => randomBytes(32).toString("base64url") };
let database: Awaited<ReturnType<typeof freshDatabase>>;
let adapter: Awaited<ReturnType<typeof createBetterAuth>>;
let store: Awaited<ReturnType<typeof createPostgresStore>>;
let accounts: ReturnType<typeof createAccounts>;
let api: ReturnType<typeof createApi>;

beforeAll(async () => {
  database = await freshDatabase();
  adapter = await createBetterAuth({ connectionString: database.url("identity"), baseURL: origin, secret: "synthetic-test-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86400, mailer: new FakeMailer() });
  store = await createPostgresStore(database.url("app"));
  accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: ["operator@example.test"] });
  api = createApi({ accounts, views: createViews(store), handleAuth: adapter.handle, origin, clientAddress: () => randomUUID() });
});
afterAll(async () => { await store?.close(); await adapter?.close(); await database?.close(); });

async function request(path: string, body?: unknown, cookie = "") {
  return api.request(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function cookies(response: Response): string {
  const jar = new Map<string, string>();
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";")[0] ?? "";
    jar.set(pair.slice(0, pair.indexOf("=")), pair);
  }
  return [...jar.values()].join("; ");
}
async function invitation(email: string, expiresAt = clock.now() + 60_000) {
  const token = ids.token();
  await adapter.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: clock.now(), expiresAt, issuedBy: null, auditId: ids.uuid() });
  return token;
}
async function creator(email = `${ids.uuid()}@example.test`) {
  const token = await invitation(email);
  const response = await request("/api/invitations/redeem", { token, email, name: "Synthetic creator", password });
  expect(response.status, await response.clone().text()).toBe(201);
  const { accountId } = redeemedInvitationSchema.parse(await response.json());
  const signIn = await request("/api/auth/sign-in/email", { email, password });
  expect(signIn.status, await signIn.clone().text()).toBe(200);
  const cookie = cookies(signIn);
  const subject = await accounts.authenticate(new Headers({ cookie }));
  expect(subject).not.toBeNull();
  if (!subject) throw new Error("no authenticated subject");
  const scope = await accounts.resolveScope(subject);
  expect(scope).toEqual({ accountId, creatorId: creatorIdSchema.parse(subject.creatorId) });
  if (!scope) throw new Error("no Scope");
  return { email, token, accountId, cookie, scope, signIn };
}

it("two invited creators sign in and read only their own studio and empty project list", async () => {
  const a = await creator();
  const b = await creator();
  expect(a.accountId).not.toBe(b.accountId);
  for (const current of [a, b]) {
    const response = await request(`/api/studios/${current.accountId}`, undefined, current.cookie);
    expect(response.status).toBe(200);
    expect(studioSchema.parse(await response.json())).toEqual({ account: { accountId: current.accountId, createdAt: new Date(clock.now()).toISOString() }, settings: { treatmentOptionCount: 3 } });
    const projects = await request(`/api/studios/${current.accountId}/projects`, undefined, current.cookie);
    expect(projects.status).toBe(200);
    expect(projectListSchema.parse(await projects.json())).toEqual({ projects: [] });
  }
});

describeStoreConformance("Postgres, migrated database", async () => {
  const a = await creator();
  const b = await creator();
  return { store, a: a.scope, b: b.scope };
});

it("G1: all scoped routes return the identical not-found response for another Account and an absent id", async () => {
  const a = await creator();
  const b = await creator();
  for (const route of ROUTES.filter((route) => route.access === "scope")) {
    const forbidden = await request(route.path.replace(":accountId", a.accountId), undefined, b.cookie);
    const missing = await request(route.path.replace(":accountId", ids.uuid()), undefined, b.cookie);
    expect(forbidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect([...forbidden.headers]).toEqual([...missing.headers]);
    expect(await forbidden.text()).toBe(await missing.text());
  }
});

it("G2: the actual router equals the short inventory; scoped and operator reads require a mapped session", async () => {
  expect(api.routes.map(({ method, path }) => ({ method, path }))).toEqual(ROUTES.map(({ method, path }) => ({ method, path })));
  for (const route of ROUTES.filter((route) => route.access === "scope" || route.access === "operator")) {
    const response = await request(route.path.replace(":accountId", ids.uuid()), route.method === "POST" ? { email: "someone@example.test" } : undefined);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "unauthenticated" });
  }
  for (const path of ["/api/auth/sign-up/email", "/api/auth/sign-up", "/api/projects", "/api/auth/admin/create-user"]) {
    expect((await request(path, { email: "stranger@example.test", name: "No invitation", password })).status).toBe(404);
  }
  // Even the unmounted library signup remains disabled, not merely hidden.
  const response = await adapter.handle(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: "stranger@example.test", name: "No invitation", password }) }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" });
});

it("refuses replay and concurrent redemption, expiry at the boundary, and the wrong email without consuming a valid invitation", async () => {
  const a = await creator();
  const refused = { code: "invitation-refused" };
  const replay = await request("/api/invitations/redeem", { token: a.token, email: a.email, name: "Replay", password });
  expect(replay.status).toBe(403);
  expect(await replay.json()).toEqual(refused);
  const email = `${ids.uuid()}@example.test`;
  const token = await invitation(email);
  const wrong = await request("/api/invitations/redeem", { token, email: "wrong@example.test", name: "Wrong", password });
  expect(wrong.status).toBe(403);
  expect(await wrong.json()).toEqual(refused);
  const races = await Promise.all(Array.from({ length: 2 }, () => request("/api/invitations/redeem", { token, email, name: "Racer", password })));
  expect(races.map((response) => response.status).sort()).toEqual([201, 403]);
  const expiring = await invitation("expired@example.test", clock.now() + 10);
  clock.advance(10);
  const expired = await request("/api/invitations/redeem", { token: expiring, email: "expired@example.test", name: "Expired", password });
  expect(expired.status).toBe(403);
  expect(await expired.json()).toEqual(refused);
  const later = await request("/api/invitations/redeem", { token: expiring, email: "expired@example.test", name: "Expired", password });
  expect(later.status).toBe(403);
});

it("a fault at the final invitation update rolls back the auth identity, credentials, Account, settings and mapping together", async () => {
  const email = `${ids.uuid()}@example.test`;
  const token = await invitation(email);
  const counts = `SELECT (SELECT count(*) FROM auth."user") AS users, (SELECT count(*) FROM auth.account) AS credentials,
    (SELECT count(*) FROM accounts.account) AS accounts, (SELECT count(*) FROM accounts.settings) AS settings,
    (SELECT count(*) FROM auth.subject_map) AS mappings`;
  const before = await database.inspect.query(counts);
  await database.inspect.query(`CREATE FUNCTION auth.test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected final-write failure'; END $$;
    CREATE TRIGGER test_failure BEFORE UPDATE ON auth.invitation FOR EACH ROW EXECUTE FUNCTION auth.test_failure()`);
  try {
    const response = await request("/api/invitations/redeem", { token, email, name: "Rollback", password });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ code: "internal-error" });
    expect((await database.inspect.query("SELECT count(*) FROM auth.\"user\" WHERE email = $1", [email])).rows).toEqual([{ count: "0" }]);
    expect((await database.inspect.query(counts)).rows).toEqual(before.rows);
    expect((await database.inspect.query("SELECT redeemed_by FROM auth.invitation WHERE email = $1", [email])).rows).toEqual([{ redeemed_by: null }]);
  } finally { await database.inspect.query("DROP TRIGGER test_failure ON auth.invitation; DROP FUNCTION auth.test_failure()"); }
  const retry = await request("/api/invitations/redeem", { token, email, name: "Retry", password });
  expect(retry.status, await retry.clone().text()).toBe(201);
  const linked = await database.inspect.query(`SELECT u."emailVerified" AS verified, c."providerId" AS provider, i.redeemed_by = u.id AS redeemed,
    s.payload FROM auth."user" u JOIN auth.account c ON c."userId" = u.id
    JOIN auth.subject_map m ON m.subject = u.id JOIN accounts.settings s ON s.account_id = m.account_id
    JOIN auth.invitation i ON i.redeemed_by = u.id WHERE u.email = $1`, [email]);
  expect(linked.rows).toEqual([{ verified: true, provider: "credential", redeemed: true, payload: { treatmentOptionCount: 3 } }]);
});

it("rejects short and common passwords without consuming the invitation", async () => {
  const email = `${ids.uuid()}@example.test`;
  const token = await invitation(email);
  for (const [candidate, status] of [["short", 400], ["passwordpassword", 403]] as const) {
    const response = await request("/api/invitations/redeem", { token, email, name: "Password policy", password: candidate });
    expect(response.status).toBe(status);
  }
  expect((await request("/api/invitations/redeem", { token, email, name: "Valid retry", password })).status).toBe(201);
});

it("checks expiration after waiting for an invitation's redemption lock", async () => {
  const email = `${ids.uuid()}@example.test`;
  const token = await invitation(email, clock.now() + 10);
  const lock = await database.inspect.connect();
  let response: Promise<Response> | undefined;
  try {
    await lock.query("BEGIN");
    await lock.query("SELECT FROM auth.invitation WHERE email = $1 FOR UPDATE", [email]);
    response = request("/api/invitations/redeem", { token, email, name: "Queued", password });
    let waiting = false;
    for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
      const result = await database.inspect.query("SELECT FROM pg_stat_activity WHERE datname = current_database() AND usename = 'identity' AND wait_event_type = 'Lock'");
      waiting = result.rowCount === 1;
      if (!waiting) await setTimeout(10);
    }
    expect(waiting).toBe(true);
    clock.advance(10);
  } finally { await lock.query("ROLLBACK"); lock.release(); }
  if (!response) throw new Error("redemption not started");
  expect((await response).status).toBe(403);
  expect((await database.inspect.query('SELECT FROM auth."user" WHERE email = $1', [email])).rows).toEqual([]);
});

it("an operator must verify a second factor on this session before issuing an audited email-bound invitation", async () => {
  const operator = await creator("operator@example.test");
  const oldSignIn = await request("/api/auth/sign-in/email", { email: operator.email, password });
  const oldCookie = cookies(oldSignIn);
  expect((await request("/api/operator/invitations", { email: "invited@example.test" }, operator.cookie)).status).toBe(403);
  const enable = await request("/api/auth/two-factor/enable", { password }, operator.cookie);
  expect(enable.status, await enable.clone().text()).toBe(200);
  const enrollment: unknown = await enable.json();
  if (!enrollment || typeof enrollment !== "object" || !("totpURI" in enrollment) || typeof enrollment.totpURI !== "string") throw new Error("missing TOTP URI");
  const secret = new URL(enrollment.totpURI).searchParams.get("secret");
  if (!secret) throw new Error("missing TOTP secret");
  const totp = new TOTP({ secret: Secret.fromBase32(secret), algorithm: "SHA1", digits: 6, period: 30 });
  const verify = await request("/api/auth/two-factor/verify-totp", { code: totp.generate() }, operator.cookie);
  expect(verify.status, await verify.clone().text()).toBe(200);
  const verifiedCookie = cookies(verify);
  // Another pre-enrolment session must not gain operator power from a user flag.
  expect((await request("/api/operator/invitations", { email: "invited@example.test" }, oldCookie)).status).toBe(403);
  const issued = await request("/api/operator/invitations", { email: "Invited@Example.test" }, verifiedCookie);
  expect(issued.status, await issued.clone().text()).toBe(201);
  const invitation = invitationSchema.parse(await issued.json());
  expect(invitation.expiresAt).toBe(new Date(clock.now() + 60_000).toISOString());
  const row = await database.inspect.query("SELECT token_hash, email, issued_by FROM auth.invitation WHERE email = 'invited@example.test'");
  expect(row.rows).toEqual([{ token_hash: createHash("sha256").update(invitation.token).digest("hex"), email: "invited@example.test", issued_by: operator.scope.creatorId }]);
  expect((await database.inspect.query("SELECT actor, action FROM auth.audit_event WHERE actor = $1", [operator.scope.creatorId])).rows).toEqual([{ actor: operator.scope.creatorId, action: "invitation.issued" }]);
  const redemption = await request("/api/invitations/redeem", { token: invitation.token, email: "invited@example.test", name: "Invited", password });
  expect(redemption.status).toBe(201);
  // A password-only sign-in now produces a challenge, not an authenticated session.
  const challenge = await request("/api/auth/sign-in/email", { email: operator.email, password });
  expect(await challenge.json()).toMatchObject({ twoFactorRedirect: true });
  expect(await accounts.authenticate(new Headers({ cookie: cookies(challenge) }))).toBeNull();
  const completed = await request("/api/auth/two-factor/verify-totp", { code: totp.generate() }, cookies(challenge));
  expect(completed.status, await completed.clone().text()).toBe(200);
  expect((await request("/api/operator/invitations", { email: "second@example.test" }, cookies(completed))).status).toBe(201);
});

it("G1 on non-scoped routes: forged identifiers cannot select another creator's identity or revoke their session", async () => {
  const a = await creator();
  const b = await creator();
  await expect(accounts.issueInvitation({ creatorId: b.scope.creatorId, email: b.email, secondFactor: true }, "forbidden@example.test")).rejects.toMatchObject({ code: "forbidden" });
  const forged = { accountId: a.accountId, userId: a.scope.creatorId, secondFactor: true };
  const signin = await request("/api/auth/sign-in/email", { email: b.email, password, ...forged });
  const subject = await accounts.authenticate(new Headers({ cookie: cookies(signin) }));
  expect(subject).toMatchObject({ creatorId: b.scope.creatorId, secondFactor: false });
  for (const path of ["/api/invitations/redeem", "/api/operator/invitations"]) {
    const response = await request(path, { token: a.token, email: b.email, name: "Forged", password, ...forged }, b.cookie);
    expect(response.status).toBe(400);
  }
  const enabled = await request("/api/auth/two-factor/enable", { password, ...forged }, b.cookie);
  expect(enabled.status).toBe(200);
  const invalid = await request("/api/auth/two-factor/verify-totp", { code: "zzzzzz", ...forged }, b.cookie);
  expect(invalid.status).toBe(401);
  const signout = await request("/api/auth/sign-out", forged, b.cookie);
  expect(signout.status).toBe(200);
  expect(await accounts.authenticate(new Headers({ cookie: b.cookie }))).toBeNull();
  expect(await accounts.authenticate(new Headers({ cookie: a.cookie }))).toMatchObject({ creatorId: a.scope.creatorId, secondFactor: false });
  expect((await request(`/api/studios/${a.accountId}`, undefined, a.cookie)).status).toBe(200);
});

it("all state-changing routes require the same origin and custom header; sessions use protected cookies", async () => {
  for (const route of ROUTES.filter((route) => route.method === "POST")) {
    for (const headers of [{ origin: "https://other.test", "x-aiuteur-command": "1" }, { origin }]) {
      const response = await api.request(`${origin}${route.path}`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: "{}" });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ code: "forbidden" });
    }
  }
  const a = await creator();
  expect(a.signIn.headers.getSetCookie().some((value) => value.includes("HttpOnly") && value.includes("Secure") && value.includes("SameSite=Lax"))).toBe(true);
  await database.inspect.query('UPDATE auth.session SET "expiresAt" = $1 WHERE "userId" = $2', [new Date(Date.now() - 1000), a.scope.creatorId]);
  expect((await request(`/api/studios/${a.accountId}`, undefined, a.cookie)).status).toBe(401);
  const renewed = await request("/api/auth/sign-in/email", { email: a.email, password });
  await database.inspect.query('UPDATE auth.session SET "createdAt" = $1 WHERE "userId" = $2', [new Date(clock.now() - 86400 * 1000), a.scope.creatorId]);
  expect((await request(`/api/studios/${a.accountId}`, undefined, cookies(renewed))).status).toBe(401);
  const valid = { accountId: a.accountId, sequence: 1, type: "account.created", occurredAt: "2026-10-27T12:00:00.000Z" };
  expect(eventSchema.safeParse(valid).success).toBe(true);
  expect(eventSchema.safeParse({ ...valid, text: "creative content" }).success).toBe(false);
});

it("D1/D3: the fresh migration chain equals the snapshot, generated rows and vocabulary CHECKs", async () => {
  const expected: unknown = JSON.parse(readFileSync(new URL("../../store/schema.json", import.meta.url), "utf8"));
  expect(await schemaCatalogue(database.url())).toEqual(expected);
  // A second application checks immutable migration hashes and does nothing.
  const before = (await database.inspect.query("SELECT * FROM public.migrations ORDER BY id")).rows;
  await migrateDatabase(database.url());
  expect((await database.inspect.query("SELECT * FROM public.migrations ORDER BY id")).rows).toEqual(before);
  execFileSync(process.execPath, [fileURLToPath(new URL("../../store/scripts/schema.ts", import.meta.url)), "--check"], { env: { ...process.env, MIGRATION_DATABASE_URL: database.url() } });
  execFileSync(process.execPath, [fileURLToPath(new URL("../../store/scripts/vocabulary.ts", import.meta.url)), "--check"]);
  const { rows } = await database.inspect.query<{ definition: string }>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname = 'audit_action'");
  const values = [...(rows[0]?.definition ?? "").matchAll(/'([^']+)'::text/g)].map((match) => match[1]);
  expect(values).toEqual([...AUDIT_ACTIONS]);
});

it("D4/G7: catalogue classification, forced policies, composite tenant keys, role grants and definer allowlist", async () => {
  const { rows: tables } = await database.inspect.query<{ name: string; owner: string; rls: boolean; force: boolean }>(`
    SELECT n.nspname || '.' || c.relname AS name, pg_get_userbyid(c.relowner) AS owner,
      c.relrowsecurity AS rls, c.relforcerowsecurity AS force FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' ORDER BY 1`);
  expect(tables.map((table) => table.name)).toEqual(["accounts.account", "accounts.settings", "auth.abuse_counter", "auth.account", "auth.audit_event", "auth.invitation", "auth.session", "auth.subject_map", "auth.twoFactor", "auth.user", "auth.verification", "public.migrations"]);
  for (const table of tables) {
    expect(table.owner).toBe("owner");
    if (table.name.startsWith("accounts.")) expect(table).toMatchObject({ rls: true, force: true });
    for (const role of ["scheduler", "operator_read", "backup"]) {
      const privileges = await database.inspect.query(`SELECT has_table_privilege($1, $2, 'INSERT,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR has_any_column_privilege($1, $2, 'UPDATE') AS writes,
        has_table_privilege($1, $2, 'SELECT') AS reads`, [role, table.name.split(".").map((part) => `"${part}"`).join(".")]);
      expect(privileges.rows).toEqual([{ writes: false, reads: role === "backup" }]);
    }
  }
  const policies = await database.inspect.query("SELECT tablename, qual = with_check AS checked FROM pg_policies WHERE schemaname = 'accounts' ORDER BY tablename");
  expect(policies.rows).toEqual([{ tablename: "account", checked: true }, { tablename: "settings", checked: true }]);
  const constraints = await database.inspect.query<{ definition: string }>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'accounts.settings'::regclass ORDER BY conname");
  expect(constraints.rows.map((row) => row.definition)).toContain("PRIMARY KEY (account_id, key)");
  expect(constraints.rows.map((row) => row.definition)).toContain("FOREIGN KEY (account_id) REFERENCES accounts.account(account_id)");
  const roles = await database.inspect.query("SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = ANY($1) ORDER BY rolname", [["app", "scheduler", "identity", "operator_read", "backup", "owner"]]);
  expect(roles.rows).toEqual(["app", "backup", "identity", "operator_read", "owner", "scheduler"].map((role) => ({ rolname: role, rolsuper: false, rolbypassrls: role === "backup", rolcreatedb: false, rolcreaterole: false })));
  const memberships = await database.inspect.query("SELECT FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname = ANY($1))", [["app", "scheduler", "identity", "operator_read", "backup", "owner"]]);
  expect(memberships.rows).toEqual([]);
  const definers = await database.inspect.query("SELECT p.proname, p.prosecdef, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('accounts', 'auth') ORDER BY p.proname");
  expect(definers.rows).toEqual([{ proname: "create_studio", prosecdef: true, proconfig: ["search_path=pg_catalog"] }, { proname: "map_subject", prosecdef: true, proconfig: ["search_path=pg_catalog"] }]);
  expect((await database.inspect.query("SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('accounts', 'auth') AND c.relkind IN ('v', 'm')")).rows).toEqual([]);
  for (const role of ["app", "scheduler", "identity", "operator_read", "backup"]) {
    expect((await database.inspect.query("SELECT has_function_privilege($1, 'accounts.map_subject(text)', 'EXECUTE') AS map, has_function_privilege($1, 'accounts.create_studio(text,uuid,timestamptz,jsonb)', 'EXECUTE') AS create", [role])).rows).toEqual([{ map: role === "identity", create: role === "identity" }]);
  }
  await expect(createPostgresStore(database.url())).rejects.toThrow("unsafe app database role");
});

it("real SQL paths default-deny, reset transaction context and refuse cross-Account writes even without handler filters", async () => {
  const a = await creator();
  const b = await creator();
  const raw = new Pool({ connectionString: database.url("app"), max: 1 });
  const identity = new Pool({ connectionString: database.url("identity") });
  try {
    expect((await raw.query("SELECT * FROM accounts.account")).rows).toEqual([]);
    const client = await raw.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [b.accountId]);
      expect((await client.query("SELECT account_id FROM accounts.account")).rows).toEqual([{ account_id: b.accountId }]);
      expect((await client.query("UPDATE accounts.settings SET payload = '{\"treatmentOptionCount\":9}' WHERE account_id = $1 RETURNING account_id", [a.accountId])).rows).toEqual([]);
      await client.query("COMMIT");
    } finally { client.release(); }
    expect((await raw.query("SELECT * FROM accounts.settings")).rows).toEqual([]);
    await expect(raw.query('SELECT * FROM auth."user"')).rejects.toMatchObject({ code: "42501" });
    await expect(identity.query("SELECT * FROM accounts.account")).rejects.toMatchObject({ code: "42501" });
    await expect(identity.query("SELECT * FROM auth.subject_map")).rejects.toMatchObject({ code: "42501" });
    expect(await store.read(a.scope, (tx) => tx.settings())).toEqual({ treatmentOptionCount: 3 });
    // FORCE subjects the table owner too. Its INSERT exercises WITH CHECK, not
    // the app role's intentionally absent INSERT grant.
    const client2 = await database.inspect.connect();
    try {
      await client2.query("BEGIN; SET LOCAL ROLE owner");
      await client2.query("SELECT set_config('aiuteur.account_id', $1, true)", [a.accountId]);
      await expect(client2.query("INSERT INTO accounts.settings VALUES ($1, 'studio', 1, '{}')", [b.accountId])).rejects.toMatchObject({ code: "42501" });
      await client2.query("ROLLBACK");
      await client2.query("BEGIN; SET LOCAL ROLE owner");
      const absent = ids.uuid();
      await client2.query("SELECT set_config('aiuteur.account_id', $1, true)", [absent]);
      await expect(client2.query("INSERT INTO accounts.settings VALUES ($1, 'studio', 1, '{}')", [absent])).rejects.toMatchObject({ code: "23503" });
    } finally { await client2.query("ROLLBACK"); client2.release(); }
  } finally { await raw.end(); await identity.end(); }
});
