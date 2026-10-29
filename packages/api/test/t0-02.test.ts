import { randomBytes, randomUUID, createHash } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { TOTP, Secret } from "otpauth";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { createPostgresStore } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createHistory } from "@aiuteur/history";
import { sourceMaterialKind } from "@aiuteur/story";
import { createWorkflows } from "@aiuteur/workflows";
import { FakeMailer, ManualClock, uuidv7, syntheticCatalogue, TEST_PRICE_POLICY } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { redeemedInvitationSchema, ROUTES } from "@aiuteur/contract";
import { freshDatabase, testExecution } from "./database.ts";

const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const newPassword = "Copper-heron-meadow-41?";
const WINDOW = 60_000;
// Aligned so a fixed window never rolls over mid-test unless a test advances the clock.
const clock = new ManualClock(Math.ceil(Date.now() / WINDOW) * WINDOW + 1);
const ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomBytes(32).toString("base64url") };
const mailer = new FakeMailer();
const limits = {
  signIn: { address: { max: 6, windowMs: WINDOW }, email: { max: 3, windowMs: WINDOW } },
  recovery: { address: { max: 4, windowMs: WINDOW }, email: { max: 2, windowMs: WINDOW } },
  redemption: { address: { max: 1000, windowMs: WINDOW }, email: { max: 2, windowMs: WINDOW } },
};
const mailFailures: unknown[] = [];
let database: Awaited<ReturnType<typeof freshDatabase>>;
let adapter: Awaited<ReturnType<typeof createBetterAuth>>;
let store: Awaited<ReturnType<typeof createPostgresStore>>;
let run: Awaited<ReturnType<typeof testExecution>>;
let accounts: ReturnType<typeof createAccounts>;
let api: ReturnType<typeof createApi>;
let counter = 0;
const freshAddress = () => `198.51.100.${++counter}`;

beforeAll(async () => {
  database = await freshDatabase();
  run = await testExecution(database, clock, ids);
  adapter = await createBetterAuth({ connectionString: database.url("identity"), baseURL: origin, secret: "synthetic-test-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86400 });
  store = await createPostgresStore(database.url("app"));
  accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: [], mailer, limits, recoveryTtlMs: 600_000, recoveryPage: `${origin}/recover`, onMailFailure: (error) => mailFailures.push(error) });
  api = createApi({ accounts, views: createViews(store), workflows: createWorkflows({ store, history: createHistory([sourceMaterialKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution }), handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: (request) => request.headers.get("x-test-address") ?? "203.0.113.250" });
});
afterAll(async () => { await run?.close(); await store?.close(); await adapter?.close(); await database?.close(); });

async function request(path: string, body?: unknown, cookie = "", address = freshAddress()) {
  return api.request(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", cookie, "x-test-address": address },
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
async function creator() {
  const email = `${randomUUID()}@example.test`;
  const token = ids.token();
  await adapter.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: clock.now(), expiresAt: clock.now() + 60_000, issuedBy: null, auditId: ids.uuid() });
  const redeemed = await request("/api/invitations/redeem", { token, email, name: "Synthetic creator", password });
  expect(redeemed.status, await redeemed.clone().text()).toBe(201);
  const { accountId } = redeemedInvitationSchema.parse(await redeemed.json());
  return { email, accountId, signIn: () => signIn(email, password) };
}
async function signIn(email: string, pass: string, address = freshAddress()) {
  return request("/api/auth/sign-in/email", { email, password: pass }, "", address);
}
async function session(email: string) {
  const response = await signIn(email, password);
  expect(response.status, await response.clone().text()).toBe(200);
  return cookies(response);
}
async function studioStatus(cookie: string, accountId: string) {
  return (await request(`/api/studios/${accountId}`, undefined, cookie)).status;
}
async function requestLink(email: string, address = freshAddress()) {
  const response = await request("/api/recovery/request", { email }, "", address);
  await accounts.mailSettled();
  return response;
}
const linkToken = (email: string) => {
  const text = mailer.lastTo(email)?.text ?? "";
  const match = /#token=(\S+)/.exec(text);
  if (!match?.[1]) throw new Error("no recovery link was mailed");
  return match[1];
};

it("recovery by emailed link signs out every existing session, and the link works once", async () => {
  const a = await creator();
  const other = await creator();
  const phone = await session(a.email);
  const laptop = await session(a.email);
  const bystander = await session(other.email);
  expect(await studioStatus(phone, a.accountId)).toBe(200);
  expect(await studioStatus(laptop, a.accountId)).toBe(200);

  const requested = await requestLink(a.email);
  expect(requested.status).toBe(202);
  const mail = mailer.lastTo(a.email);
  expect(mail).toMatchObject({ kind: "recovery", to: a.email });
  expect(mail?.text).toContain(`${origin}/recover#token=`);
  const token = linkToken(a.email);
  // The database holds only a hash of the emailed bearer secret.
  const stored = await database.inspect.query("SELECT token_hash FROM auth.recovery");
  expect(JSON.stringify(stored.rows)).not.toContain(token);
  // Requesting the link did not itself end any session or change the password.
  expect(await studioStatus(phone, a.accountId)).toBe(200);

  const complete = await request("/api/recovery/complete", { token, password: newPassword });
  expect(complete.status, await complete.clone().text()).toBe(200);
  expect(await complete.json()).toEqual({ status: "recovered" });
  expect(await studioStatus(phone, a.accountId)).toBe(401);
  expect(await studioStatus(laptop, a.accountId)).toBe(401);
  expect(await studioStatus(bystander, other.accountId)).toBe(200);
  expect((await database.inspect.query('SELECT count(*) FROM auth.session s JOIN auth."user" u ON u.id = s."userId" WHERE u.email = $1', [a.email])).rows).toEqual([{ count: "0" }]);

  clock.advance(WINDOW); // the earlier sign-ins used this email's counter
  expect((await signIn(a.email, password)).status).toBe(401);
  const fresh = await signIn(a.email, newPassword);
  expect(fresh.status).toBe(200);
  expect(await studioStatus(cookies(fresh), a.accountId)).toBe(200);

  const replay = await request("/api/recovery/complete", { token, password: "Another-long-secret-77!" });
  expect(replay.status).toBe(403);
  expect(await replay.json()).toEqual({ code: "recovery-refused" });
  clock.advance(WINDOW);
  expect((await signIn(a.email, newPassword)).status).toBe(200);
});

it("refuses an unknown, expired, superseded or weak-password recovery without changing anything", async () => {
  const a = await creator();
  const cookie = await session(a.email);
  const refused = { code: "recovery-refused" };
  const unknown = await request("/api/recovery/complete", { token: ids.token(), password: newPassword });
  expect(unknown.status).toBe(403);
  expect(await unknown.json()).toEqual(refused);

  await requestLink(a.email);
  const first = linkToken(a.email);
  clock.advance(WINDOW);
  await requestLink(a.email);
  const second = linkToken(a.email);
  expect(second).not.toBe(first);
  expect((await request("/api/recovery/complete", { token: first, password: newPassword })).status).toBe(403);

  for (const weak of ["passwordpassword"]) {
    const response = await request("/api/recovery/complete", { token: second, password: weak });
    expect(response.status).toBe(403);
  }
  expect((await request("/api/recovery/complete", { token: second, password: "short" })).status).toBe(400);
  expect(await studioStatus(cookie, a.accountId)).toBe(200);

  clock.advance(600_000);
  const expired = await request("/api/recovery/complete", { token: second, password: newPassword });
  expect(expired.status).toBe(403);
  expect(await expired.json()).toEqual(refused);
  expect(await studioStatus(cookie, a.accountId)).toBe(200);
  expect((await signIn(a.email, password)).status).toBe(200);
});

it("refuses a recovery link that expires while its completion waits for the row lock, changing nothing", async () => {
  const a = await creator();
  const cookie = await session(a.email);
  await requestLink(a.email);
  const token = linkToken(a.email);
  const hash = createHash("sha256").update(token).digest("hex");
  // Expires 30 s from now; valid when the request starts.
  await database.inspect.query("UPDATE auth.recovery SET expires_at = $1 WHERE token_hash = $2", [new Date(clock.now() + 30_000), hash]);
  const lock = await database.inspect.connect();
  let response: Promise<Response> | undefined;
  try {
    await lock.query("BEGIN");
    await lock.query("SELECT FROM auth.recovery WHERE token_hash = $1 FOR UPDATE", [hash]);
    response = request("/api/recovery/complete", { token, password: newPassword });
    let waiting = false;
    for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
      waiting = (await database.inspect.query("SELECT FROM pg_stat_activity WHERE datname = current_database() AND usename = 'identity' AND wait_event_type = 'Lock'")).rowCount === 1;
      if (!waiting) await setTimeout(10);
    }
    expect(waiting).toBe(true);
    clock.advance(30_000);
  } finally { await lock.query("ROLLBACK"); lock.release(); }
  if (!response) throw new Error("completion not started");
  const refused = await response;
  expect(refused.status).toBe(403);
  expect(await refused.json()).toEqual({ code: "recovery-refused" });
  expect(await studioStatus(cookie, a.accountId)).toBe(200);
  clock.advance(WINDOW);
  expect((await signIn(a.email, newPassword)).status).toBe(401);
  expect((await signIn(a.email, password)).status).toBe(200);
});

it("a sign-in with the old password that overlaps recovery cannot leave a session behind", async () => {
  clock.advance(WINDOW);
  const a = await creator();
  const b = await creator();
  const older = [await session(a.email), await session(a.email)];
  const bystander = await session(b.email);
  await requestLink(a.email);
  const token = linkToken(a.email);
  // Recovery pauses on a test-held lock at its final statement: password changed, sessions deleted, not committed.
  await database.inspect.query(`CREATE FUNCTION auth.test_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(424242); RETURN OLD; END $$;
    CREATE TRIGGER test_pause BEFORE DELETE ON auth.recovery FOR EACH ROW EXECUTE FUNCTION auth.test_pause()`);
  const hold = await database.inspect.connect();
  let recovery: Promise<Response> | undefined;
  let overlapping: Promise<Response> | undefined;
  try {
    await hold.query("SELECT pg_advisory_lock(424242)");
    recovery = request("/api/recovery/complete", { token, password: newPassword });
    const waiting = async (count: number) => {
      for (let attempt = 0; attempt < 200; attempt++) {
        const result = await database.inspect.query("SELECT FROM pg_stat_activity WHERE datname = current_database() AND usename = 'identity' AND wait_event_type = 'Lock'");
        if (result.rowCount === count) return true;
        await setTimeout(10);
      }
      return false;
    };
    expect(await waiting(1)).toBe(true);
    overlapping = signIn(a.email, password);
    // Recovery is paused mid-transaction and the sign-in is parked behind it, not racing past it.
    expect(await waiting(2)).toBe(true);
  } finally { await hold.query("SELECT pg_advisory_unlock(424242)"); hold.release(); }
  try {
    if (!recovery || !overlapping) throw new Error("not started");
    expect((await recovery).status).toBe(200);
    const concurrent = await overlapping;
    expect(concurrent.status).toBe(401);
    expect(concurrent.headers.getSetCookie()).toEqual([]);
  } finally { await database.inspect.query("DROP TRIGGER test_pause ON auth.recovery; DROP FUNCTION auth.test_pause()"); }
  for (const cookie of older) expect(await studioStatus(cookie, a.accountId)).toBe(401);
  expect(await studioStatus(bystander, b.accountId)).toBe(200);
  expect((await database.inspect.query('SELECT count(*) FROM auth.session s JOIN auth."user" u ON u.id = s."userId" WHERE u.email = $1', [a.email])).rows).toEqual([{ count: "0" }]);
  clock.advance(WINDOW);
  expect((await signIn(a.email, password)).status).toBe(401);
  expect((await signIn(a.email, newPassword)).status).toBe(200);
});

it("a pending second-factor challenge from before recovery cannot produce a session; without recovery it can", async () => {
  clock.advance(WINDOW);
  const a = await creator();
  const enrolled = await session(a.email);
  const enable = await request("/api/auth/two-factor/enable", { password }, enrolled);
  const enrollment: unknown = await enable.json();
  if (!enrollment || typeof enrollment !== "object" || !("totpURI" in enrollment) || typeof enrollment.totpURI !== "string") throw new Error("missing TOTP URI");
  const totp = new TOTP({ secret: Secret.fromBase32(new URL(enrollment.totpURI).searchParams.get("secret") ?? ""), algorithm: "SHA1", digits: 6, period: 30 });
  expect((await request("/api/auth/two-factor/verify-totp", { code: totp.generate() }, enrolled)).status).toBe(200);
  const challenge = async () => {
    const response = await signIn(a.email, password);
    expect(await response.json()).toMatchObject({ twoFactorRedirect: true });
    return cookies(response);
  };
  const control = await challenge();
  const stale = await challenge();
  const completed = await request("/api/auth/two-factor/verify-totp", { code: totp.generate() }, control);
  expect(completed.status).toBe(200);
  expect(await studioStatus(cookies(completed), a.accountId)).toBe(200);

  clock.advance(WINDOW);
  await requestLink(a.email);
  expect((await request("/api/recovery/complete", { token: linkToken(a.email), password: newPassword })).status).toBe(200);
  const late = await request("/api/auth/two-factor/verify-totp", { code: totp.generate() }, stale);
  expect(late.status).toBe(401);
  expect(late.headers.getSetCookie().some((value) => value.includes("session_token=") && !value.includes("Max-Age=0"))).toBe(false);
  expect((await database.inspect.query('SELECT count(*) FROM auth.session s JOIN auth."user" u ON u.id = s."userId" WHERE u.email = $1', [a.email])).rows).toEqual([{ count: "0" }]);
  clock.advance(WINDOW);
  expect((await signIn(a.email, password)).status).toBe(401);
  expect(await (await signIn(a.email, newPassword)).json()).toMatchObject({ twoFactorRedirect: true });
});

it("simultaneous sign-ins beyond the connection pool size all complete", async () => {
  clock.advance(WINDOW);
  const people = await Promise.all(Array.from({ length: 12 }, () => creator()));
  const responses = await Promise.all(people.map((person) => signIn(person.email, password)));
  expect(responses.map((response) => response.status)).toEqual(people.map(() => 200));
});

it("concurrent use of one recovery link succeeds exactly once", async () => {
  const a = await creator();
  await requestLink(a.email);
  const token = linkToken(a.email);
  const responses = await Promise.all(["Aaa-bbb-ccc-111-xyz!", "Ddd-eee-fff-222-uvw!", "Ggg-hhh-iii-333-rst!"].map((pass) => request("/api/recovery/complete", { token, password: pass })));
  expect(responses.map((response) => response.status).sort()).toEqual([200, 403, 403]);
});

it("a recovery request answers identically for a known and an unknown email, and mails only the known one", async () => {
  const a = await creator();
  const unknown = `nobody-${randomUUID()}@example.test`;
  const before = mailer.outbox.length;
  const known = await requestLink(a.email);
  const missing = await requestLink(unknown);
  expect(known.status).toBe(202);
  expect(missing.status).toBe(known.status);
  expect([...missing.headers]).toEqual([...known.headers]);
  expect(await missing.text()).toBe(await known.text());
  expect(mailer.outbox.slice(before).map((message) => message.to)).toEqual([a.email]);

  // A provider outage cannot tell the caller either: the answer is the same and the failure is reported out of band.
  clock.advance(WINDOW);
  mailer.failNext();
  const failed = await requestLink(a.email);
  expect(failed.status).toBe(known.status);
  expect(mailFailures).toHaveLength(1);
  expect(JSON.stringify(mailFailures)).not.toContain(a.email);
  // Malformed requests are rejected the same way whichever email they carry.
  expect((await request("/api/recovery/request", { email: "not-an-email" })).status).toBe(400);
});

it("recovery requests are throttled per email and per address, identically for known and unknown emails", async () => {
  clock.advance(WINDOW);
  const a = await creator();
  const unknown = `nobody-${randomUUID()}@example.test`;
  for (const email of [a.email, unknown]) {
    const statuses: number[] = [];
    // Different addresses each time: only the per-email counter can trip.
    for (let attempt = 0; attempt < 4; attempt++) statuses.push((await requestLink(email)).status);
    expect(statuses).toEqual([202, 202, 429, 429]);
  }
  const throttled = await requestLink(a.email);
  expect(await throttled.json()).toEqual({ code: "rate-limited" });
  expect(Number(throttled.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(Number(throttled.headers.get("retry-after"))).toBeLessThanOrEqual(60);

  // One address rotating through emails trips the per-address counter.
  clock.advance(WINDOW);
  const address = "192.0.2.77";
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 6; attempt++) statuses.push((await requestLink(`rotating-${attempt}@example.test`, address)).status);
  expect(statuses).toEqual([202, 202, 202, 202, 429, 429]);

  // A new window resets the count.
  clock.advance(WINDOW);
  expect((await requestLink(a.email)).status).toBe(202);
});

it("sign-in is throttled per email and per address, the right password included, until the window passes", async () => {
  clock.advance(WINDOW);
  const a = await creator();
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 3; attempt++) statuses.push((await signIn(a.email, "wrong-password-entirely")).status);
  expect(statuses).toEqual([401, 401, 401]);
  const locked = await signIn(a.email, password);
  expect(locked.status).toBe(429);
  expect(await locked.json()).toEqual({ code: "rate-limited" });
  expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(locked.headers.getSetCookie()).toEqual([]);
  // Case and padding of the submitted email do not escape the counter.
  expect((await signIn(a.email.toUpperCase(), password)).status).toBe(429);
  clock.advance(WINDOW);
  expect((await signIn(a.email, password)).status).toBe(200);

  const address = "192.0.2.88";
  const rotating: number[] = [];
  for (let attempt = 0; attempt < 8; attempt++) rotating.push((await signIn(`guess-${attempt}@example.test`, "wrong-password-entirely", address)).status);
  expect(rotating).toEqual([401, 401, 401, 401, 401, 401, 429, 429]);
});

it("sign-in accepts JSON only, so a form-encoded request cannot skip the per-email limit", async () => {
  clock.advance(WINDOW);
  const a = await creator();
  const form = (email: string, pass: string) => api.request(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded", "x-aiuteur-command": "1", "x-test-address": freshAddress() },
    body: new URLSearchParams({ email, password: pass }),
  });
  for (let attempt = 0; attempt < 3; attempt++) expect((await signIn(a.email, "wrong-password-entirely")).status).toBe(401);
  // The email is at its limit: neither encoding, with the right password, gets through.
  expect((await signIn(a.email, password)).status).toBe(429);
  const refused = await form(a.email, password);
  expect(refused.status).toBe(400);
  expect(await refused.json()).toEqual({ code: "invalid-request" });
  expect(refused.headers.getSetCookie()).toEqual([]);
  // In a fresh window the form encoding never authenticates and consumes no attempts: three more
  // rejected forms leave the whole per-email allowance for JSON.
  clock.advance(WINDOW);
  for (let attempt = 0; attempt < 3; attempt++) expect((await form(a.email, password)).status).toBe(400);
  expect((await database.inspect.query("SELECT count(*) FROM auth.session s JOIN auth.\"user\" u ON u.id = s.\"userId\" WHERE u.email = $1", [a.email])).rows).toEqual([{ count: "0" }]);
  expect((await signIn(a.email, password)).status).toBe(200);
});

it("invitation redemption is throttled per submitted email", async () => {
  clock.advance(WINDOW);
  const email = `${randomUUID()}@example.test`;
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 3; attempt++) statuses.push((await request("/api/invitations/redeem", { token: ids.token(), email, name: "Guess", password })).status);
  expect(statuses).toEqual([403, 403, 429]);
});

it("G9: the signup route is absent and the recovery routes are in the short public inventory", async () => {
  expect(api.routes.map(({ method, path }) => ({ method, path }))).toEqual(ROUTES.map(({ method, path }) => ({ method, path })));
  expect(ROUTES.filter((route) => route.access === "recovery").map((route) => route.path)).toEqual(["/api/recovery/request", "/api/recovery/complete"]);
  for (const path of ["/api/auth/sign-up/email", "/api/auth/request-password-reset", "/api/auth/reset-password"]) {
    expect((await request(path, { email: "stranger@example.test", password })).status).toBe(404);
  }
  const blocked = await adapter.handle(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email: "stranger@example.test", name: "No invitation", password }) }));
  expect(blocked.status).toBe(400);
  for (const route of ROUTES.filter((route) => route.access === "recovery")) {
    for (const headers of [{ origin: "https://other.test", "x-aiuteur-command": "1" }, { origin }]) {
      expect((await api.request(`${origin}${route.path}`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: "{}" })).status).toBe(403);
    }
  }
});

it("the migrated chain gives recovery and counter tables to identity only", async () => {
  for (const table of ["auth.recovery", "auth.rate_limit"]) {
    const grants = await database.inspect.query("SELECT has_table_privilege('app', $1, 'SELECT') AS app, has_table_privilege('scheduler', $1, 'SELECT') AS scheduler, has_table_privilege('operator_read', $1, 'SELECT') AS operator, has_table_privilege('identity', $1, 'INSERT,UPDATE,DELETE') AS identity, has_table_privilege('backup', $1, 'INSERT,UPDATE,DELETE') AS backup_writes", [table]);
    expect(grants.rows).toEqual([{ app: false, scheduler: false, operator: false, identity: true, backup_writes: false }]);
  }
  const persisted = JSON.stringify((await database.inspect.query("SELECT * FROM auth.rate_limit")).rows);
  expect(persisted).not.toMatch(/example\.test|198\.51\.100|recovery/);
});
