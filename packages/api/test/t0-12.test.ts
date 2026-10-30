import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAccounts, createBetterAuth } from "@aiuteur/accounts";
import { characterListSchema, characterReadSchema, entityOutcomeSchema, mediaLinkSchema, projectSchema, redeemedInvitationSchema, referenceOutcomeSchema, shotListSchema, shotReadSchema, uploadSchema } from "@aiuteur/contract";
import { createPostgresStore } from "@aiuteur/store";
import { createViews } from "@aiuteur/views";
import { createHistory } from "@aiuteur/history";
import { sourceMaterialKind } from "@aiuteur/story";
import { characterKind } from "@aiuteur/world";
import { shotKind } from "@aiuteur/production";
import { createWorkflows } from "@aiuteur/workflows";
import { FakeMailer, ManualClock, syntheticCatalogue, syntheticImage, TEST_PRICE_POLICY, uuidv7 } from "@aiuteur/testing";
import { createApi } from "@aiuteur/api";
import { contracted, freshDatabase, snapshot, testExecution } from "./database.ts";

// T0-12 (#109): a Character with an uploaded reference and a hand-made Shot, on real PostgreSQL through the real API, with
// the in-memory BlobStore whose signed URLs are fetched over HTTP. G5 (OPERATIONAL-BASELINE §5): Account B cannot obtain
// or use a signed URL or key for Account A's media, including by guessing hash-named keys; signed URLs are short-lived
// and never stored.

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
  accounts = createAccounts({ ...adapter, clock, ids, invitationTtlMs: 60_000, operatorEmails: [], mailer: new FakeMailer(), limits: { signIn: limit, recovery: limit, redemption: limit }, recoveryTtlMs: 600_000, recoveryPage: `${origin}/recover`, onMailFailure: (error) => { throw error; } });
  const workflows = createWorkflows({ store, history: createHistory([sourceMaterialKind, characterKind, shotKind]), clock, ids, catalogue: syntheticCatalogue(), pricePolicy: TEST_PRICE_POLICY, execution: run.execution, media: run.media });
  api = contracted(createApi({ accounts, views: createViews(store), workflows, handleAuth: adapter.handle, origin, requestId: ids.uuid, now: () => clock.now(), clientAddress: () => "203.0.113.12" }));
});
afterAll(async () => { await run?.close(); await store?.close(); await adapter?.close(); await database?.close(); });

const call = (method: "GET" | "POST", path: string, cookie: string, body?: unknown, key: string = ids.uuid()) =>
  api.request(`${origin}${path}`, { method, headers: { origin, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": key, cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

/** An invited creator with one project, signed in through the real path. */
async function creator() {
  const email = `${ids.uuid()}@example.test`;
  const token = ids.token();
  await adapter.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: clock.now(), expiresAt: clock.now() + 60_000, issuedBy: null, auditId: ids.uuid() });
  const { accountId } = redeemedInvitationSchema.parse(await (await call("POST", "/api/invitations/redeem", "", { token, email, name: "Synthetic creator", password })).json());
  const cookie = (await call("POST", "/api/auth/sign-in/email", "", { email, password })).headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  const project = projectSchema.parse(await (await call("POST", `/api/studios/${accountId}/projects`, cookie)).json()).projectId;
  return { accountId, cookie, project, base: `/api/studios/${accountId}/projects/${project}` };
}
type Creator = Awaited<ReturnType<typeof creator>>;
async function character(c: Creator, name = "Mara") {
  const made = entityOutcomeSchema.parse(await (await call("POST", `${c.base}/characters`, c.cookie, { name })).json());
  if (made.result !== "Applied") throw new Error("character refused");
  return made.objectId;
}
/** The browser's path: ask for an upload, PUT the bytes to the signed URL, attach. */
async function attach(c: Creator, object: string, bytes: Uint8Array, contentType = "image/png", key?: string) {
  const ticket = await call("POST", `${c.base}/uploads`, c.cookie, {});
  expect(ticket.status).toBe(201);
  const upload = uploadSchema.parse(await ticket.json());
  expect((await fetch(upload.link.url, { method: "PUT", body: new Uint8Array(bytes), headers: { "content-type": contentType } })).status).toBe(200);
  const response = await call("POST", `${c.base}/characters/${object}/reference`, c.cookie, { uploadId: upload.uploadId }, key);
  return { status: response.status, body: referenceOutcomeSchema.parse(await response.json()), upload };
}
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

it("demo: upload a Character's reference, read it back, view it through a signed link; a reload reads the same", async () => {
  const c = await creator();
  const object = await character(c);
  const bytes = syntheticImage({ width: 64, height: 48, format: "png" });
  const attached = await attach(c, object, bytes);
  expect(attached.status).toBe(201);
  if (attached.body.result !== "Applied") throw new Error("not applied");
  // Facts come from an independent oracle: the size and hash of the bytes sent, and the dimensions asked of ffmpeg.
  expect(attached.body.reference.media).toEqual({ hash: sha256(bytes), size: bytes.byteLength, contentType: "image/png", width: 64, height: 48 });
  const read = characterReadSchema.parse(await (await call("GET", `${c.base}/characters/${object}`, c.cookie)).json());
  expect(read).toMatchObject({ objectId: object, sequence: 1, name: "Mara", reference: attached.body.reference });
  expect(characterListSchema.parse(await (await call("GET", `${c.base}/characters`, c.cookie)).json()).characters).toEqual([read]);
  const view = await call("GET", `${c.base}/characters/${object}/reference/view`, c.cookie);
  expect(view.headers.get("cache-control")).toBe("no-store");
  const link = mediaLinkSchema.parse(await view.json());
  expect(link).toMatchObject({ purpose: "view", expiresAt: new Date(clock.now() + 3_600_000).toISOString() });
  const image = await fetch(link.url);
  expect([image.status, image.headers.get("content-type"), image.headers.get("cache-control")]).toEqual([200, "image/png", "private"]);
  expect(sha256(new Uint8Array(await image.arrayBuffer()))).toBe(sha256(bytes));
  // A second, different upload becomes the reference shown; the first stays as an Attempt.
  const second = await attach(c, object, syntheticImage({ width: 32, height: 32, format: "mjpeg" }), "image/jpeg");
  if (second.body.result !== "Applied") throw new Error("not applied");
  expect(characterReadSchema.parse(await (await call("GET", `${c.base}/characters/${object}`, c.cookie)).json()).reference).toEqual(second.body.reference);
  const attempts = await database.inspect.query("SELECT origin, media_hash FROM accounts.attempt WHERE object_id = $1 ORDER BY position", [object]);
  expect(attempts.rows).toEqual([{ origin: "upload", media_hash: sha256(bytes) }, { origin: "upload", media_hash: second.body.reference.media.hash }]);
  // The upload was promoted: the staging object is gone (lifecycle covers the rest).
  expect(await run.blob.head({ accountId: c.accountId as never, creatorId: ids.uuid() as never }, `a/${c.accountId}/p/${c.project}/t/${attached.upload.uploadId}/0`)).toBeNull();
});

it("G5: another Account's signed link, key or Media is refused, including a guessed hash-named key", async () => {
  const a = await creator();
  const b = await creator();
  const bytes = syntheticImage({ width: 20, height: 20, format: "png", colour: "red" });
  const aCharacter = await character(a);
  const aRef = await attach(a, aCharacter, bytes);
  if (aRef.body.result !== "Applied") throw new Error("not applied");
  // B holds the same bytes in its own project, so the hash is known to B; only the Account and project differ.
  const bCharacter = await character(b);
  const bRef = await attach(b, bCharacter, bytes);
  if (bRef.body.result !== "Applied") throw new Error("not applied");
  expect(bRef.body.reference.media.hash).toBe(aRef.body.reference.media.hash);

  // 1. Through the API: B naming A's ids answers exactly as an absent id does (G1's rule, for the media routes).
  const absent = { account: ids.uuid(), project: ids.ordered(), object: ids.ordered() };
  for (const [path, body] of [["characters/:o/reference/view", undefined], ["characters/:o", undefined], ["characters", undefined], ["uploads", {}], ["characters/:o/reference", { uploadId: aRef.upload.uploadId }]] as const) {
    const method = body === undefined ? "GET" : "POST";
    const control = await call(method, `/api/studios/${absent.account}/projects/${absent.project}/${path.replace(":o", absent.object)}`, b.cookie, body);
    for (const target of [`/api/studios/${a.accountId}/projects/${a.project}`, `/api/studios/${b.accountId}/projects/${a.project}`]) {
      const response = await call(method, `${target}/${path.replace(":o", aCharacter)}`, b.cookie, body);
      expect([response.status, await response.text()], `${method} ${path}`).toEqual([404, await control.clone().text()]);
    }
  }
  // 2. A's ids inside B's own project: no Character, no Media, no link.
  expect((await call("GET", `${b.base}/characters/${aCharacter}/reference/view`, b.cookie)).status).toBe(404);
  // 3. A signed link: B's own, valid link re-pointed at A's key (same hash, A's Account and project) is refused by the store.
  const bLink = mediaLinkSchema.parse(await (await call("GET", `${b.base}/characters/${bCharacter}/reference/view`, b.cookie)).json());
  expect((await fetch(bLink.url)).status).toBe(200);
  const aKey = `a/${a.accountId}/p/${a.project}/m/${aRef.body.reference.media.hash}`;
  const bKey = `a/${b.accountId}/p/${b.project}/m/${bRef.body.reference.media.hash}`;
  expect(bLink.url).toContain(bKey);
  const forged = await fetch(bLink.url.replace(bKey, aKey));
  expect(forged.status).toBe(403);
  // The guessed key unsigned, and A's link once expired, are refused too.
  expect((await fetch(bLink.url.replace(bKey, aKey).split("?")[0]!)).status).toBe(403);
  const aLink = mediaLinkSchema.parse(await (await call("GET", `${a.base}/characters/${aCharacter}/reference/view`, a.cookie)).json());
  // 4. A's upload id is useless to B: B's staging prefix is B's, so it finds nothing and records nothing.
  const media = Number((await database.inspect.query("SELECT count(*) AS n FROM accounts.media")).rows[0].n);
  const stolen = await call("POST", `${b.base}/characters/${bCharacter}/reference`, b.cookie, { uploadId: (await attach(a, aCharacter, syntheticImage({ width: 9, height: 9, format: "png" }))).upload.uploadId });
  expect([stolen.status, referenceOutcomeSchema.parse(await stolen.json())]).toEqual([422, { result: "Refused", reason: "upload-missing" }]);
  expect(Number((await database.inspect.query("SELECT count(*) AS n FROM accounts.media")).rows[0].n)).toBe(media + 1); // A's own upload only
  // 5. Signed URLs are short-lived and never stored: no row anywhere holds a signature or a link.
  const everything = await database.inspect.query("SELECT string_agg(t::text, '|') AS all FROM (SELECT * FROM accounts.media) t UNION ALL SELECT string_agg(t::text, '|') FROM accounts.attempt t UNION ALL SELECT string_agg(t::text, '|') FROM accounts.idempotency t UNION ALL SELECT string_agg(t::text, '|') FROM accounts.revision t");
  const text = everything.rows.map((row) => row.all).join("|");
  for (const url of [aLink.url, bLink.url]) expect(text).not.toContain(new URL(url).searchParams.get("sig")!);
  expect(text).not.toContain("sig=");
  clock.advance(3_600_001);
  expect((await fetch(aLink.url)).status).toBe(403);
});

it("a refused upload records nothing: no Media row, no Attempt, and the Character still shows none", async () => {
  const c = await creator();
  const object = await character(c);
  const before = await snapshot(database.inspect);
  for (const [bytes, type, reason] of [[Uint8Array.from({ length: 200 }, (_, i) => i), "image/png", "undecodable"], [syntheticImage({ width: 8, height: 8, format: "webp" }), "image/png", "type-mismatch"], [new Uint8Array(), "image/png", "empty"]] as const) {
    const refused = await attach(c, object, bytes, type);
    expect([refused.status, refused.body], reason).toEqual([422, { result: "Refused", reason }]);
  }
  const after = await snapshot(database.inspect);
  // Only the idempotency records of the three refused commands were added.
  expect({ ...after.counts, "accounts.idempotency": 0 }).toEqual({ ...before.counts, "accounts.idempotency": 0 });
  expect(after.counts["accounts.idempotency"]).toBe(before.counts["accounts.idempotency"]! + 3);
  expect(characterReadSchema.parse(await (await call("GET", `${c.base}/characters/${object}`, c.cookie)).json()).reference).toBeNull();
  expect((await call("GET", `${c.base}/characters/${object}/reference/view`, c.cookie)).status).toBe(404);
});

it("a replayed reference attach returns the first result and adds no second Attempt", async () => {
  const c = await creator();
  const object = await character(c);
  const ticket = uploadSchema.parse(await (await call("POST", `${c.base}/uploads`, c.cookie, {})).json());
  await fetch(ticket.link.url, { method: "PUT", body: new Uint8Array(syntheticImage({ width: 10, height: 10, format: "png" })), headers: { "content-type": "image/png" } });
  const key = ids.uuid();
  const first = await (await call("POST", `${c.base}/characters/${object}/reference`, c.cookie, { uploadId: ticket.uploadId }, key)).json();
  const again = await (await call("POST", `${c.base}/characters/${object}/reference`, c.cookie, { uploadId: ticket.uploadId }, key)).json();
  expect(again).toEqual(first);
  expect((await database.inspect.query("SELECT count(*) AS n FROM accounts.attempt WHERE object_id = $1", [object])).rows[0].n).toBe("1");
});

it("a hand-made Shot carries the Character's Presence; a Presence naming anything else is refused; a stale Presence change is kept aside", async () => {
  const a = await creator();
  const b = await creator();
  const mara = await character(a, "Mara");
  const passenger = await character(a, "Passenger");
  const made = entityOutcomeSchema.parse(await (await call("POST", `${a.base}/shots`, a.cookie, { action: "Mara at the rail.", presence: [{ entity: mara, look: "base" }] })).json());
  if (made.result !== "Applied") throw new Error("not applied");
  const shot = shotReadSchema.parse(await (await call("GET", `${a.base}/shots/${made.objectId}`, a.cookie)).json());
  expect(shot).toMatchObject({ sequence: 1, action: "Mara at the rail.", presence: [{ entity: mara, look: "base", name: "Mara" }], sideLine: [] });
  expect(shotListSchema.parse(await (await call("GET", `${a.base}/shots`, a.cookie)).json()).shots).toEqual([shot]);

  // Sub-resource ids are never trusted: another Account's Character, an absent id, or a non-Character object.
  const theirs = await character(b, "Stranger");
  const counts = (await snapshot(database.inspect)).counts;
  for (const entity of [theirs, ids.ordered()]) {
    expect((await call("POST", `${a.base}/shots`, a.cookie, { action: "x", presence: [{ entity, look: "base" }] })).status).toBe(404);
    expect((await call("POST", `${a.base}/shots/${made.objectId}/presence`, a.cookie, { base: 1, presence: [{ entity, look: "base" }] })).status).toBe(404);
  }
  expect((await call("POST", `${a.base}/shots`, a.cookie, { action: "x", presence: [{ entity: made.objectId, look: "base" }] })).status).toBe(404);
  expect((await call("POST", `${a.base}/shots`, a.cookie, { action: "x", presence: [{ entity: mara, look: "base" }, { entity: mara, look: "base" }] })).status).toBe(400);
  expect({ ...(await snapshot(database.inspect)).counts, "accounts.idempotency": 0 }).toEqual({ ...counts, "accounts.idempotency": 0 });

  // Two clients on revision 1: the first adds the Passenger; the second, stale, removes Mara and is kept aside.
  const added = await call("POST", `${a.base}/shots/${made.objectId}/presence`, a.cookie, { base: 1, presence: [{ entity: mara, look: "base" }, { entity: passenger, look: "base" }] });
  expect([added.status, entityOutcomeSchema.parse(await added.json())]).toEqual([200, { result: "Applied", appended: true, objectId: made.objectId, sequence: 2 }]);
  const stale = await call("POST", `${a.base}/shots/${made.objectId}/presence`, a.cookie, { base: 1, presence: [] });
  expect(stale.status).toBe(409);
  expect(entityOutcomeSchema.parse(await stale.json())).toMatchObject({ result: "StaleBase", head: 2 });
  const after = shotReadSchema.parse(await (await call("GET", `${a.base}/shots/${made.objectId}`, a.cookie)).json());
  expect(after.presence.map((p) => p.name)).toEqual(["Mara", "Passenger"]);
  expect(after.sideLine).toMatchObject([{ basedOn: 1, presence: [] }]);
  // The Shot stores references only, never a copy of the Character (ENTITIES §6).
  expect((await database.inspect.query("SELECT body FROM accounts.revision WHERE object_id = $1 ORDER BY sequence DESC LIMIT 1", [made.objectId])).rows[0].body)
    .toEqual({ action: "Mara at the rail.", presence: [{ entity: mara, look: "base" }, { entity: passenger, look: "base" }] });
});

it("D4/R17 at the database: a Media key names its own Account and project, and an upload Attempt holds a Media of its own project", async () => {
  const c = await creator();
  const other = projectSchema.parse(await (await call("POST", `/api/studios/${c.accountId}/projects`, c.cookie)).json()).projectId;
  const object = await character(c);
  const client = await database.inspect.connect();
  const attempt = async (sql: string, params: unknown[]) => {
    await client.query("BEGIN; SET LOCAL ROLE owner");
    await client.query("SELECT set_config('aiuteur.account_id', $1, true)", [c.accountId]);
    const outcome = await client.query(sql, params).then(() => "ok", (error: { code?: string }) => error.code);
    await client.query("ROLLBACK");
    return outcome;
  };
  const hash = "c".repeat(64);
  const insert = "INSERT INTO accounts.media VALUES ($1::uuid, $2::uuid, $3, 1, 'image/png', 1, 1, $4, 'upload', now())";
  try {
    expect(await attempt(insert, [c.accountId, c.project, hash, `a/${c.accountId}/p/${c.project}/m/${hash}`])).toBe("ok");
    // A key naming another project of the same Account, another Account, or another hash: the CHECK refuses it.
    for (const key of [`a/${c.accountId}/p/${other}/m/${hash}`, `a/${ids.uuid()}/p/${c.project}/m/${hash}`, `a/${c.accountId}/p/${c.project}/m/${"d".repeat(64)}`]) {
      expect(await attempt(insert, [c.accountId, c.project, hash, key]), key).toBe("23514");
    }
    // An Attempt in this project cannot hold a Media of the other project: the composite foreign key refuses it.
    expect(await attempt(`WITH m AS (${insert} RETURNING hash)
      INSERT INTO accounts.attempt (attempt_id, object_id, account_id, project_id, based_on, origin, media_hash, body, created_at) SELECT $5, $6, $1::uuid, $7::uuid, 0, 'upload', hash, '{}', now() FROM m`,
      [c.accountId, other, hash, `a/${c.accountId}/p/${other}/m/${hash}`, uuidv7(), object, c.project])).toBe("23503");
    // And an upload Attempt without Media, or another origin with Media, is refused.
    expect(await attempt("INSERT INTO accounts.attempt (attempt_id, object_id, account_id, project_id, based_on, origin, body, created_at) VALUES ($1, $2, $3, $4, 0, 'upload', '{}', now())", [uuidv7(), object, c.accountId, c.project])).toBe("23514");
  } finally { client.release(); }
  // The app role cannot rewrite Media (D5): no UPDATE or DELETE grant.
  const grants = await database.inspect.query("SELECT has_table_privilege('app', 'accounts.media', 'UPDATE,DELETE,TRUNCATE') AS rewrites, has_table_privilege('app', 'accounts.media', 'SELECT,INSERT') AS writes");
  expect(grants.rows).toEqual([{ rewrites: false, writes: true }]);
});
