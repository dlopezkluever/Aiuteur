import { randomBytes, randomUUID, createHash } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { redeemedInvitationSchema, studioSchema } from "@aiuteur/contract";
import { createPostgresStore } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { FakeMailer, ManualClock } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { freshDatabase } from "./database.ts";

// G9 auth abuse, end to end through the Hono path, Better Auth, the migrated
// database and the fake Mailer. Each request carries its own client address
// unless the test sets one, so unrelated tests do not share throttle buckets.
const origin = "https://aiuteur.test";
const password = "Paper-crane-lighthouse-98!";
const replacement = "Lantern-harbour-meadow-99?";
const clock = new ManualClock(Date.now());
const ids = { uuid: randomUUID, token: () => randomBytes(32).toString("base64url") };
const fifteenMinutes = 15 * 60_000;
let database: Awaited<ReturnType<typeof freshDatabase>>;
let adapter: Awaited<ReturnType<typeof createBetterAuth>>;
let store: Awaited<ReturnType<typeof createPostgresStore>>;
let accounts: ReturnType<typeof createAccounts>;
let api: ReturnType<typeof createApi>;
let mailer: FakeMailer;

beforeAll(async () => {
  database = await freshDatabase();
  mailer = new FakeMailer();
  adapter = await createBetterAuth({ connectionString: database.url("identity"), baseURL: origin, secret: "synthetic-test-only-secret-with-more-than-32-characters", clock, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86400, mailer });
  store = await createPostgresStore(database.url("app"));
  accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: ["operator@example.test"] });
  api = createApi({ accounts, views: createViews(store), handleAuth: adapter.handle, origin, clientAddress: (request) => request.headers.get("x-test-address") ?? randomUUID() });
});
afterAll(async () => { await store?.close(); await adapter?.close(); await database?.close(); });

async function request(path: string, body?: unknown, cookie = "", address: string = randomUUID()) {
  return api.request(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "x-test-address": address, cookie },
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
async function creator(email = `${ids.uuid()}@example.test`) {
  const token = ids.token();
  await adapter.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: clock.now(), expiresAt: clock.now() + 60_000, issuedBy: null, auditId: ids.uuid() });
  const response = await request("/api/invitations/redeem", { token, email, name: "Synthetic creator", password });
  expect(response.status, await response.clone().text()).toBe(201);
  const { accountId } = redeemedInvitationSchema.parse(await response.json());
  const signIn = await request("/api/auth/sign-in/email", { email, password });
  expect(signIn.status, await signIn.clone().text()).toBe(200);
  return { email, accountId, cookie: cookies(signIn) };
}
function recoveryLinkFor(email: string): string {
  const mail = mailer.sent().filter((message) => message.to === email).at(-1);
  if (!mail) throw new Error(`no recovery mail for ${email}`);
  return mail.text;
}
function tokenFrom(text: string): string {
  const token = /reset-password\/([^?\s]+)/.exec(text)?.[1];
  if (!token) throw new Error("no recovery token in mail");
  return token;
}
const requestRecovery = (email: string, address?: string) => request("/api/auth/request-password-reset", { email }, "", address);
const signIn = (email: string, value: string, address?: string) => request("/api/auth/sign-in/email", { email, password: value }, "", address);
const studio = (account: string, cookie: string) => request(`/api/studios/${account}`, undefined, cookie);

it("an emailed recovery link, once used, signs out every existing session of that Account", async () => {
  const a = await creator();
  const other = cookies(await signIn(a.email, password));
  expect((await studio(a.accountId, other)).status).toBe(200);
  expect((await requestRecovery(a.email)).status).toBe(200);
  const token = tokenFrom(recoveryLinkFor(a.email));
  const recovered = await request("/api/auth/reset-password", { token, newPassword: replacement });
  expect(recovered.status, await recovered.clone().text()).toBe(200);
  for (const cookie of [a.cookie, other]) expect((await studio(a.accountId, cookie)).status).toBe(401);
  expect(await accounts.authenticate(new Headers({ cookie: other }))).toBeNull();
  expect((await signIn(a.email, password)).status).toBe(401);
  const renewed = await signIn(a.email, replacement);
  expect(renewed.status).toBe(200);
  expect((await studio(a.accountId, cookies(renewed))).status).toBe(200);
  const replay = await request("/api/auth/reset-password", { token, newPassword: "Another-harbour-lantern-7!" });
  expect(replay.status).toBe(400);
});

it("a recovery request gives the same response for a known and an unknown email; only the known one gets mail", async () => {
  const a = await creator();
  const unknownEmail = `${ids.uuid()}@example.test`;
  const known = await requestRecovery(a.email);
  const unknown = await requestRecovery(unknownEmail);
  expect(known.status).toBe(200);
  expect(unknown.status).toBe(200);
  expect(await unknown.text()).toBe(await known.text());
  expect([...unknown.headers]).toEqual([...known.headers]);
  expect(mailer.sent().filter((message) => message.to === a.email)).toHaveLength(1);
  expect(mailer.sent().filter((message) => message.to === unknownEmail)).toHaveLength(0);
});

it("a known email's recovery response does not wait for the mail to be handed over", async () => {
  const a = await creator();
  const release = mailer.hold();
  try {
    const answered = await Promise.race([requestRecovery(a.email).then((response) => response.status), setTimeout(5_000, "still waiting for mail")]);
    expect(answered).toBe(200);
  } finally { release(); }
});

it("sign-in is throttled per email with the same answer for a known and an unknown email", async () => {
  const a = await creator();
  // creator() signed in once; a fresh window leaves exactly five attempts for the test.
  clock.advance(fifteenMinutes);
  const unknownEmail = `${ids.uuid()}@example.test`;
  const address = randomUUID();
  const wrong = "Wrong-password-value-1";
  const knownWrong: string[] = [];
  const unknownWrong: string[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const known = await signIn(a.email, wrong, address);
    const unknown = await signIn(unknownEmail, wrong, address);
    expect(known.status).toBe(401);
    expect(unknown.status).toBe(401);
    knownWrong.push(await known.text());
    unknownWrong.push(await unknown.text());
  }
  expect(new Set(knownWrong).size).toBe(1);
  expect(unknownWrong).toEqual(knownWrong);
  for (const [email, value] of [[a.email, password], [unknownEmail, wrong]] as const) {
    const throttled = await signIn(email, value, address);
    expect(throttled.status).toBe(429);
    expect(await throttled.json()).toEqual({ code: "rate-limited" });
  }
  // The limit is a window, not a ban: after it passes the correct password works again.
  clock.advance(fifteenMinutes);
  expect((await signIn(a.email, password, address)).status).toBe(200);
});

it("sign-in is throttled per client address across different emails", async () => {
  const address = randomUUID();
  for (let attempt = 0; attempt < 20; attempt++) {
    expect((await signIn(`${ids.uuid()}@example.test`, "Wrong-password-value-1", address)).status).toBe(401);
  }
  const throttled = await signIn(`${ids.uuid()}@example.test`, "Wrong-password-value-1", address);
  expect(throttled.status).toBe(429);
  expect(await throttled.json()).toEqual({ code: "rate-limited" });
  expect((await signIn(`${ids.uuid()}@example.test`, "Wrong-password-value-1", randomUUID())).status).toBe(401);
});

it("recovery requests are throttled per email with the same answer for known and unknown emails, and a throttled request sends no mail", async () => {
  const a = await creator();
  const unknownEmail = `${ids.uuid()}@example.test`;
  for (let attempt = 0; attempt < 3; attempt++) {
    expect((await requestRecovery(a.email)).status).toBe(200);
    expect((await requestRecovery(unknownEmail)).status).toBe(200);
  }
  const knownThrottled = await requestRecovery(a.email);
  const unknownThrottled = await requestRecovery(unknownEmail);
  expect(knownThrottled.status).toBe(429);
  const knownText = await knownThrottled.text();
  expect(JSON.parse(knownText)).toEqual({ code: "rate-limited" });
  expect(await unknownThrottled.text()).toBe(knownText);
  expect(mailer.sent().filter((message) => message.to === a.email)).toHaveLength(3);
});

it("recovery requests are throttled per client address across different emails", async () => {
  const address = randomUUID();
  for (let attempt = 0; attempt < 10; attempt++) {
    expect((await requestRecovery(`${ids.uuid()}@example.test`, address)).status).toBe(200);
  }
  const throttled = await requestRecovery(`${ids.uuid()}@example.test`, address);
  expect(throttled.status).toBe(429);
  expect(await throttled.json()).toEqual({ code: "rate-limited" });
  expect((await requestRecovery(`${ids.uuid()}@example.test`, randomUUID())).status).toBe(200);
});

it("a commonly breached replacement password is refused and leaves the recovery link usable", async () => {
  const a = await creator();
  expect((await requestRecovery(a.email)).status).toBe(200);
  const token = tokenFrom(recoveryLinkFor(a.email));
  const weak = await request("/api/auth/reset-password", { token, newPassword: "passwordpassword" });
  expect(weak.status).toBe(400);
  expect(await weak.json()).toEqual({ code: "invalid-request" });
  const used = await request("/api/auth/reset-password", { token, newPassword: replacement });
  expect(used.status, await used.clone().text()).toBe(200);
});

it("an expired recovery link is refused and changes no session", async () => {
  const a = await creator();
  expect((await requestRecovery(a.email)).status).toBe(200);
  const token = tokenFrom(recoveryLinkFor(a.email));
  await database.inspect.query("UPDATE auth.verification SET \"expiresAt\" = $1 WHERE identifier = $2", [new Date(Date.now() - 1000), `reset-password:${token}`]);
  const expired = await request("/api/auth/reset-password", { token, newPassword: replacement });
  expect(expired.status).toBe(400);
  expect(await expired.json()).toMatchObject({ code: "INVALID_TOKEN" });
  expect(studioSchema.parse(await (await studio(a.accountId, a.cookie)).json()).account.accountId).toBe(a.accountId);
});
