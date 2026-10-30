import { randomBytes, randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { TOTP, Secret } from "otpauth";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { entityOutcomeSchema, IDEMPOTENT_OPERATIONS, ACTOR_KINDS, ATTEMPT_ORIGINS, REVISION_CAUSES, accountIdSchema, commitOutcomeSchema, creatorIdSchema, projectSchema, sourceMaterialReadSchema, sessionSchema, inputReadSchema, type ObjectId, studioSchema, projectListSchema, invitationSchema, redeemedInvitationSchema, ROUTES, eventSchema, AUDIT_ACTIONS } from "@aiuteur/contract";
import { createPostgresStore, migrateDatabase, schemaCatalogue, type Scope } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createHistory } from "@aiuteur/history";
import { sourceMaterialKind } from "@aiuteur/story";
import { characterKind } from "@aiuteur/world";
import { shotKind } from "@aiuteur/production";
import { createWorkflows } from "@aiuteur/workflows";
import { describeHistoryConformance, describeStoreConformance, storeIgnoringScope, FakeMailer, ManualClock, uuidv7, syntheticCatalogue, TEST_PRICE_POLICY } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { freshDatabase, testExecution, contracted } from "./database.ts";

const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const clock = new ManualClock(Date.now());
const ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };
let database: Awaited<ReturnType<typeof freshDatabase>>;
let adapter: Awaited<ReturnType<typeof createBetterAuth>>;
let store: Awaited<ReturnType<typeof createPostgresStore>>;
let run: Awaited<ReturnType<typeof testExecution>>;
let accounts: ReturnType<typeof createAccounts>;
let api: ReturnType<typeof createApi>;

beforeAll(async () => {
  database = await freshDatabase();
  run = await testExecution(database, clock, ids);
  adapter = await createBetterAuth({ connectionString: database.url("identity"), baseURL: origin, secret: "synthetic-test-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86400 });
  store = await createPostgresStore(database.url("app"));
  const generous = { max: 1_000_000, windowMs: 60_000 };
  const limit = { address: generous, email: generous };
  accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: ["operator@example.test"], mailer: new FakeMailer(), limits: { signIn: limit, recovery: limit, redemption: limit }, recoveryTtlMs: 600_000, recoveryPage: `${origin}/recover`, onMailFailure: (error) => { throw error; } });
  api = contracted(createApi({ accounts, views: createViews(store), workflows: createWorkflows({ store, history: createHistory([sourceMaterialKind, characterKind, shotKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution, media: run.media }), handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: () => "203.0.113.1" }));
});
afterAll(async () => { await run?.close(); await store?.close(); await adapter?.close(); await database?.close(); });

async function request(path: string, body?: unknown, cookie = "") {
  return api.request(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": randomUUID(), cookie },
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

async function postgresSubject() {
  const a = await creator();
  const b = await creator();
  return {
    store, a: a.scope, b: b.scope,
    // Seams run as the owner: no runtime role can write the lock table yet.
    async lockObject(scope: Scope, objectId: ObjectId) {
      const client = await database.inspect.connect();
      try {
        await client.query("BEGIN; SET LOCAL ROLE owner");
        await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [scope.accountId]);
        await client.query(`INSERT INTO accounts.lock (object_id, sequence, account_id, project_id, locked, actor, created_at)
          SELECT o.object_id, (SELECT coalesce(max(sequence), 0) + 1 FROM accounts.lock WHERE object_id = o.object_id), o.account_id, o.project_id, true, 'test', now()
          FROM accounts.object o WHERE o.object_id = $1`, [objectId]);
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    },
    async rowCounts() {
      const { rows } = await database.inspect.query<Record<string, string>>("SELECT (SELECT count(*) FROM accounts.project) AS project, (SELECT count(*) FROM accounts.object) AS object, (SELECT count(*) FROM accounts.revision) AS revision, (SELECT count(*) FROM accounts.attempt) AS attempt, (SELECT count(*) FROM accounts.lock) AS lock, (SELECT count(*) FROM accounts.idempotency) AS idempotency");
      return Object.fromEntries(Object.entries(rows[0] ?? {}).map(([table, count]) => [table, Number(count)]));
    },
  };
}
describeStoreConformance("Postgres, migrated database", postgresSubject);
describeHistoryConformance("Postgres, migrated database", postgresSubject);

/**
 * G1, generated from the route inventory: for every scoped operation, with its real method and a
 * minimally valid body, Account B on Account A's identifiers must get exactly the answer it gets
 * for identifiers that do not exist. A route that needs a body and has no entry fails, so a new
 * operation cannot join the inventory without being exercised.
 */
const bodies: Record<string, unknown> = {
  "POST /api/studios/:accountId/projects/:projectId/source-material": { text: "probe" },
  "POST /api/studios/:accountId/projects/:projectId/source-material/:objectId/role": { base: 1, role: "supporting" },
  "POST /api/studios/:accountId/projects/:projectId/source-material/:objectId/treatment-drafts": {},
  "POST /api/studios/:accountId/projects/:projectId/treatment-options/:objectId/choose": {},
  "POST /api/studios/:accountId/projects/:projectId/uploads": {},
  "POST /api/studios/:accountId/projects/:projectId/characters": { name: "probe" },
  "POST /api/studios/:accountId/projects/:projectId/characters/:objectId/reference": { uploadId: "01890000-0000-7000-8000-000000000001" },
  "POST /api/studios/:accountId/projects/:projectId/shots": { action: "probe", presence: [] },
  "POST /api/studios/:accountId/projects/:projectId/shots/:objectId/presence": { base: 1, presence: [] },
};
type Owned = { accountId: string; project: string; object: string; character: string; shot: string };
async function assertG1(target: ReturnType<typeof createApi>, owner: Owned, intruder: { accountId: string; cookie: string }) {
  const send = (method: string, path: string, body: unknown) => target.request(`${origin}${path}`, {
    method, headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": randomUUID(), cookie: intruder.cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  // Each :objectId is an object of the kind the route names, so a refusal is isolation, not a kind mismatch.
  const fill = (path: string, named: Owned) =>
    path.replace(":accountId", named.accountId).replace(":projectId", named.project).replace(":sequence", "1")
      .replace(":objectId", path.includes("/characters/") ? named.character : path.includes("/shots/") ? named.shot : named.object);
  const absent = { accountId: ids.uuid(), project: ids.ordered(), object: ids.ordered(), character: ids.ordered(), shot: ids.ordered() };
  for (const route of ROUTES.filter((route) => route.access === "scope")) {
    const key = `${route.method} ${route.path}`;
    const body = route.method === "POST" ? (route.path.includes(":projectId") ? bodies[key] : {}) : undefined;
    if (route.method === "POST" && body === undefined) throw new Error(`G1: no minimal valid body for ${key}`);
    // The intruder's own Account id with the owner's project and object ids only matters where the path names them.
    const forged = route.path.includes(":projectId") ? [owner, { ...owner, accountId: intruder.accountId }] : [owner];
    const control = await send(route.method, fill(route.path, absent), body);
    expect(control.status, `G1 control ${key}`).toBe(404);
    for (const candidate of forged) {
      const response = await send(route.method, fill(route.path, candidate), body);
      expect(response.status, `G1 ${key} as ${candidate.accountId}`).toBe(404);
      expect([...response.headers], `G1 ${key}`).toEqual([...control.headers]);
      expect(await response.text(), `G1 ${key}`).toBe(await control.clone().text());
    }
  }
}

it("G1: every scoped operation, with its real method, refuses another Account exactly as it refuses an absent id", async () => {
  const a = await creator();
  const b = await creator();
  const created = await request(`/api/studios/${a.accountId}/projects`, {}, a.cookie);
  const project = projectSchema.parse(await created.json()).projectId;
  const pasted = commitOutcomeSchema.parse(await (await request(`/api/studios/${a.accountId}/projects/${project}/source-material`, { text: "private" }, a.cookie)).json());
  if (pasted.result !== "Applied") throw new Error("not applied");
  const character = entityOutcomeSchema.parse(await (await request(`/api/studios/${a.accountId}/projects/${project}/characters`, { name: "Mara" }, a.cookie)).json());
  if (character.result !== "Applied") throw new Error("not applied");
  const shot = entityOutcomeSchema.parse(await (await request(`/api/studios/${a.accountId}/projects/${project}/shots`, { action: "Mara at the rail", presence: [{ entity: character.objectId, look: "base" }] }, a.cookie)).json());
  if (shot.result !== "Applied") throw new Error("not applied");
  const owner = { accountId: a.accountId, project, object: pasted.revision.objectId, character: character.objectId, shot: shot.objectId };
  await assertG1(api, owner, { accountId: b.accountId, cookie: b.cookie });
  // Nothing of A's changed: no extra project, Revision or side-line entry.
  const projects = projectListSchema.parse(await (await request(`/api/studios/${a.accountId}/projects`, undefined, a.cookie)).json());
  expect(projects.projects).toHaveLength(1);
  const read = sourceMaterialReadSchema.parse(await (await request(`/api/studios/${a.accountId}/projects/${project}/source-material/${owner.object}`, undefined, a.cookie)).json());
  expect(read).toMatchObject({ sequences: [1], sideLine: [] });
  expect(read.head.text).toBe("private");

  // Negative control: one operation that stops enforcing isolation makes G1 fail.
  // Fault injected at the Store port (R19, R20): reads run as Account A whoever asks.
  const leaky = createApi({ accounts, views: createViews(storeIgnoringScope(store, a.scope)), workflows: createWorkflows({ store, history: createHistory([sourceMaterialKind, characterKind, shotKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution, media: run.media }),
    handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: () => "203.0.113.1" });
  await expect(assertG1(leaky, owner, { accountId: b.accountId, cookie: b.cookie })).rejects.toThrow(/G1/);

  // Negative control for the Draft Treatment preview (#101): only the preview's read ignores the Scope,
  // so every other operation stays isolated and G1 must fail on the preview route itself.
  const leakyRead: typeof store = { ...store, read: storeIgnoringScope(store, a.scope).read };
  const leakyPreview = createApi({ accounts, views: createViews(store), workflows: createWorkflows({ store: leakyRead, history: createHistory([sourceMaterialKind, characterKind, shotKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution, media: run.media }),
    handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: () => "203.0.113.1" });
  await expect(assertG1(leakyPreview, owner, { accountId: b.accountId, cookie: b.cookie })).rejects.toThrow(/G1 GET \/api\/studios\/:accountId\/projects\/:projectId\/source-material\/:objectId\/treatment-preview/);
});

it("G2: the actual router equals the short inventory; scoped and operator reads require a mapped session", async () => {
  expect(api.routes.map(({ method, path }) => ({ method, path }))).toEqual(ROUTES.map(({ method, path }) => ({ method, path })));
  for (const route of ROUTES.filter((route) => route.access === "scope" || route.access === "operator" || route.access === "session")) {
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
  // History vocabularies: each live CHECK equals its contract set, rejects others and accepts every member.
  const live = async (constraint: string) => [...((await database.inspect.query<{ definition: string }>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname = $1", [constraint])).rows[0]?.definition ?? "").matchAll(/'([^']+)'::text/g)].map((match) => match[1]);
  expect(await live("revision_cause")).toEqual([...REVISION_CAUSES]);
  expect(await live("revision_actor_kind")).toEqual([...ACTOR_KINDS]);
  expect(await live("attempt_origin")).toEqual([...ATTEMPT_ORIGINS]);
  expect(await live("idempotency_operation")).toEqual([...IDEMPOTENT_OPERATIONS]);
  const c = await creator();
  const project = projectSchema.parse(await (await request(`/api/studios/${c.accountId}/projects`, {}, c.cookie)).json());
  const owner = await database.inspect.connect();
  try {
    const attempt = async (column: "cause" | "actor_kind" | "origin", value: string) => {
      await owner.query("BEGIN; SET LOCAL ROLE owner");
      await owner.query("SELECT set_config('aiuteur.account_id', $1, true)", [c.accountId]);
      const object = uuidv7();
      await owner.query("INSERT INTO accounts.object VALUES ($1, $2, $3, 'k', now())", [object, c.accountId, project.projectId]);
      const gen = column === "origin" || value === "generation" ? uuidv7() : null;
      const result = column === "origin"
        // An upload Attempt must hold a Media of its project (7-media.sql), so that origin gets one.
        ? (value === "upload" ? owner.query("INSERT INTO accounts.media VALUES ($1::uuid, $2::uuid, repeat('b', 64), 1, 'image/png', 1, 1, 'a/' || $1::text || '/p/' || $2::text || '/m/' || repeat('b', 64), 'upload', now())", [c.accountId, project.projectId]) : Promise.resolve())
          .then(() => owner.query("INSERT INTO accounts.attempt (attempt_id, object_id, account_id, project_id, based_on, origin, generation_id, media_hash, body, created_at) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, '{}', now())", [uuidv7(), object, c.accountId, project.projectId, value, gen, value === "upload" ? "b".repeat(64) : null]))
        : owner.query("INSERT INTO accounts.revision (object_id, sequence, account_id, project_id, parent, cause, actor_kind, action_group, generation_id, schema_version, body, body_hash, fingerprints, created_at) VALUES ($1, 1, $2, $3, 0, $4, $5, $6, $7, 1, '{}', 'h', '{}', now())", [object, c.accountId, project.projectId, column === "cause" ? value : "import", column === "actor_kind" ? value : "creator", uuidv7(), gen]);
      const outcome = await result.then(() => "ok", (error: { code?: string }) => error.code);
      await owner.query("ROLLBACK");
      return outcome;
    };
    for (const [column, values] of [["cause", REVISION_CAUSES], ["actor_kind", ACTOR_KINDS], ["origin", ATTEMPT_ORIGINS]] as const) {
      for (const value of values) expect(await attempt(column, value), `${column}=${value}`).toBe("ok");
      expect(await attempt(column, "not-a-value"), column).toBe("23514");
    }
  } finally { await owner.query("ROLLBACK").catch(() => undefined); owner.release(); }
  // D3 negative evidence: the generated block differs if a CHECK is missing or allows an extra value.
  const migration = readFileSync(new URL("../../store/migrations/5-history.sql", import.meta.url), "utf8");
  for (const broken of [migration.replace(/ALTER TABLE accounts\.attempt ADD CONSTRAINT attempt_origin[^\n]*\n/, ""), migration.replace("'stale-base'", "'stale-base', 'extra'")]) {
    const dir = mkdtempSync(join(tmpdir(), "d3-"));
    try {
      writeFileSync(join(dir, "5-history.sql"), broken);
      expect(() => execFileSync(process.execPath, [fileURLToPath(new URL("../../store/scripts/vocabulary.ts", import.meta.url)), "--check"], { env: { ...process.env, MIGRATIONS_DIR: dir }, stdio: "pipe" })).toThrow();
    } finally { rmSync(dir, { recursive: true }); }
  }
});

it("D4/G7: catalogue classification, forced policies, composite tenant keys, role grants and definer allowlist", async () => {
  const { rows: tables } = await database.inspect.query<{ name: string; owner: string; rls: boolean; force: boolean }>(`
    SELECT n.nspname || '.' || c.relname AS name, pg_get_userbyid(c.relowner) AS owner,
      c.relrowsecurity AS rls, c.relforcerowsecurity AS force FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' ORDER BY 1`);
  expect(tables.map((table) => table.name)).toEqual(["accounts.account", "accounts.attempt", "accounts.capture", "accounts.decision", "accounts.event", "accounts.event_counter", "accounts.generation", "accounts.generation_call", "accounts.generation_run", "accounts.generation_settlement", "accounts.idempotency", "accounts.job", "accounts.lock", "accounts.media", "accounts.object", "accounts.project", "accounts.revision", "accounts.settings", "auth.account", "auth.audit_event", "auth.invitation", "auth.rate_limit", "auth.recovery", "auth.session", "auth.subject_map", "auth.twoFactor", "auth.user", "auth.verification", "operator.breaker", "public.migrations"]);
  for (const table of tables) {
    expect(table.owner).toBe("owner");
    if (table.name.startsWith("accounts.")) expect(table).toMatchObject({ rls: true, force: true });
    // Operator-scoped state (RUNTIME §5.1; PERSISTENCE §6.5) has no account_id and no row rule; no runtime role writes it directly.
    if (table.name.startsWith("operator.")) for (const role of ["app", "identity"]) {
      const direct = await database.inspect.query("SELECT has_table_privilege($1, $2, 'INSERT,UPDATE,DELETE,TRUNCATE') AS any", [role, table.name]);
      expect(direct.rows, `${role} on ${table.name}`).toEqual([{ any: false }]);
    }
    for (const role of ["scheduler", "operator_read", "backup"]) {
      const privileges = await database.inspect.query(`SELECT has_table_privilege($1, $2, 'INSERT,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR has_any_column_privilege($1, $2, 'UPDATE') AS writes,
        has_table_privilege($1, $2, 'SELECT') AS reads`, [role, table.name.split(".").map((part) => `"${part}"`).join(".")]);
      expect(privileges.rows).toEqual([{ writes: false, reads: role === "backup" }]);
    }
  }
  const policies = await database.inspect.query("SELECT tablename, policyname, roles::text[] AS roles, qual = with_check AS checked FROM pg_policies WHERE schemaname = 'accounts' ORDER BY tablename, policyname");
  // Every Account table has exactly the tenant policy; the Job table also has the claim policy, for the owner the
  // claim functions run as, so the Scheduler sees every Account's Jobs only inside those functions (RUNTIME §5).
  expect(policies.rows).toEqual(["account", "attempt", "capture", "decision", "event", "event_counter", "generation", "generation_call", "generation_run", "generation_settlement", "idempotency", "job", "lock", "media", "object", "project", "revision", "settings"]
    .flatMap((tablename) => [{ tablename, policyname: "account_scope", roles: ["public"], checked: true }, ...(tablename === "job" ? [{ tablename, policyname: "scheduler_claim", roles: ["owner"], checked: true }] : [])]));
  const constraints = await database.inspect.query<{ definition: string }>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'accounts.settings'::regclass ORDER BY conname");
  expect(constraints.rows.map((row) => row.definition)).toContain("PRIMARY KEY (account_id, key)");
  expect(constraints.rows.map((row) => row.definition)).toContain("FOREIGN KEY (account_id) REFERENCES accounts.account(account_id)");
  const roles = await database.inspect.query("SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = ANY($1) ORDER BY rolname", [["app", "scheduler", "identity", "operator_read", "backup", "owner"]]);
  expect(roles.rows).toEqual(["app", "backup", "identity", "operator_read", "owner", "scheduler"].map((role) => ({ rolname: role, rolsuper: false, rolbypassrls: role === "backup", rolcreatedb: false, rolcreaterole: false })));
  const memberships = await database.inspect.query("SELECT FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname = ANY($1))", [["app", "scheduler", "identity", "operator_read", "backup", "owner"]]);
  expect(memberships.rows).toEqual([]);
  const definers = await database.inspect.query("SELECT p.proname, p.prosecdef, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('accounts', 'auth') ORDER BY p.proname");
  const pinned = ["search_path=pg_catalog"];
  expect(definers.rows).toEqual([{ proname: "create_studio", prosecdef: true, proconfig: pinned }, ...["job_claim", "job_extend", "job_release", "job_wake"].map((proname) => ({ proname, prosecdef: true, proconfig: pinned })),
    { proname: "map_subject", prosecdef: true, proconfig: pinned }, { proname: "reject_rewrite", prosecdef: false, proconfig: pinned }]);
  expect((await database.inspect.query("SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('accounts', 'auth') AND c.relkind IN ('v', 'm')")).rows).toEqual([]);
  for (const role of ["app", "scheduler", "identity", "operator_read", "backup"]) {
    expect((await database.inspect.query("SELECT has_function_privilege($1, 'accounts.map_subject(text)', 'EXECUTE') AS map, has_function_privilege($1, 'accounts.create_studio(text,uuid,timestamptz,jsonb)', 'EXECUTE') AS create", [role])).rows).toEqual([{ map: role === "identity", create: role === "identity" }]);
    // The claim functions are the Scheduler port's only door: executable by the scheduler role and nobody else.
    const claim = await database.inspect.query("SELECT bool_or(has_function_privilege($1, p.oid, 'EXECUTE')) AS any, bool_and(has_function_privilege($1, p.oid, 'EXECUTE')) AS every FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'accounts' AND p.proname LIKE 'job\\_%'", [role]);
    expect(claim.rows).toEqual([{ any: role === "scheduler", every: role === "scheduler" }]);
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

it("T0-08: a session reads its own Account, and the Input read model lists a project's pasted material oldest first", async () => {
  const a = await creator();
  const b = await creator();
  expect((await request("/api/session")).status).toBe(401);
  expect(sessionSchema.parse(await (await request("/api/session", undefined, a.cookie)).json())).toEqual({ accountId: a.accountId });
  expect(sessionSchema.parse(await (await request("/api/session", undefined, b.cookie)).json())).toEqual({ accountId: b.accountId });

  const project = projectSchema.parse(await (await request(`/api/studios/${a.accountId}/projects`, {}, a.cookie)).json()).projectId;
  const path = `/api/studios/${a.accountId}/projects/${project}/source-material`;
  expect(inputReadSchema.parse(await (await request(path, undefined, a.cookie)).json())).toEqual({ items: [] });
  const first = commitOutcomeSchema.parse(await (await request(path, { text: "first" }, a.cookie)).json());
  const second = commitOutcomeSchema.parse(await (await request(path, { text: "second" }, a.cookie)).json());
  if (first.result !== "Applied" || second.result !== "Applied") throw new Error("not applied");
  const listed = inputReadSchema.parse(await (await request(path, undefined, a.cookie)).json());
  expect(listed.items.map((item) => [item.head.objectId, item.head.text, item.head.sequence])).toEqual([[first.revision.objectId, "first", 1], [second.revision.objectId, "second", 1]]);
  // The list is the per-object read model, item for item.
  for (const item of listed.items) {
    expect(sourceMaterialReadSchema.parse(await (await request(`${path}/${item.head.objectId}`, undefined, a.cookie)).json())).toEqual(item);
  }
  // Another project of the same Account lists none of it.
  const other = projectSchema.parse(await (await request(`/api/studios/${a.accountId}/projects`, {}, a.cookie)).json()).projectId;
  expect(inputReadSchema.parse(await (await request(`/api/studios/${a.accountId}/projects/${other}/source-material`, undefined, a.cookie)).json())).toEqual({ items: [] });
});
