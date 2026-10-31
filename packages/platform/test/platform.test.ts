import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApi } from "@aiuteur/api";
import { AccountRefusal } from "@aiuteur/accounts";
import { createLogger, createSecretRegistry } from "@aiuteur/observability";
import { createLiveness, provisionRolePasswords } from "@aiuteur/store";
import { FakeErrorSink } from "@aiuteur/testing";
import { freshDatabase } from "../../api/test/database.ts";
import { composeWeb, composeWorker, ConfigInvalid, createHeartbeat, judgeDeep, readEvents, readWebConfig, readWorkerConfig, runSmoke, runWorker, type Running, type SmokeAccount } from "../src/index.ts";

const DIGEST = `sha256:${"c".repeat(64)}`;
const SECRET = "synthetic-auth-secret-0123456789abcdef-ZZ";
const R2_SECRET = "synthetic-r2-secret-0002";
const PING = "synthetic-ping-token";
const ORIGIN = "https://staging.example.test";
let database: Awaited<ReturnType<typeof freshDatabase>>;
let webEnv: Record<string, string>;
let workerEnv: Record<string, string>;
const lines: string[] = [];
const write = (line: string) => { lines.push(line); };

beforeAll(async () => {
  database = await freshDatabase();
  webEnv = {
    AIUTEUR_ENVIRONMENT: "staging", RELEASE_DIGEST: DIGEST, PORT: "0", PUBLIC_ORIGIN: ORIGIN, AUTH_SECRET: SECRET,
    DATABASE_URL_APP: database.url("app"), DATABASE_URL_IDENTITY: database.url("identity"), DATABASE_URL_SCHEDULER: database.url("scheduler"),
    SMTP_HOST: "127.0.0.1", SMTP_SECURITY: "none", SMTP_FROM: "studio@example.test",
    R2_ACCOUNT_ID: "0".repeat(32), R2_BUCKET: "staging-media", R2_ACCESS_KEY_ID: "synthetic-r2-key-id-0001", R2_SECRET_ACCESS_KEY: R2_SECRET,
    ERROR_SINK_DSN: "https://synthetickeyabcdef0123@tracker.invalid/7", WORKER_STALE_AFTER_MS: "1500", OVERDUE_AFTER_MS: "60000",
  };
  workerEnv = {
    AIUTEUR_ENVIRONMENT: "staging", RELEASE_DIGEST: DIGEST, DATABASE_URL_SCHEDULER: database.url("scheduler"),
    ERROR_SINK_DSN: "https://synthetickeyabcdef0123@tracker.invalid/7", HEARTBEAT_PING_URL: `https://heartbeat.invalid/ping/${PING}`,
  };
});
afterAll(async () => { await database?.close(); });

const problemsOf = (read: () => unknown): string[] => { try { read(); } catch (error) { return error instanceof ConfigInvalid ? [...error.problems] : ["not a ConfigInvalid"]; } return []; };

describe("R24 and least privilege: each role parses only its own configuration", () => {
  it("accepts the full set for each role, and gives each only its own secrets", () => {
    const web = readWebConfig(webEnv);
    const worker = readWorkerConfig(workerEnv);
    expect(web).toMatchObject({ environment: "staging", release: DIGEST, role: "web" });
    expect(web.secretValues).toContain(SECRET);
    expect(web.secretValues).toContain(R2_SECRET);
    expect(worker.secretValues).not.toContain(R2_SECRET);
    expect(worker.secretValues).not.toContain(SECRET);
    expect(worker.secretValues).not.toContain(SECRET);
  });

  it("refuses a missing, malformed or wrong-environment value, and never echoes a value", () => {
    const bad = { ...webEnv, AIUTEUR_ENVIRONMENT: "production", RELEASE_DIGEST: "latest", AUTH_SECRET: "short-secret-value", ERROR_SINK_DSN: "" };
    const problems = problemsOf(() => readWebConfig(bad));
    for (const expected of ["AIUTEUR_ENVIRONMENT", "RELEASE_DIGEST", "AUTH_SECRET", "ERROR_SINK_DSN"]) expect(problems.join(";")).toContain(expected);
    expect(problems.join(";")).not.toContain("short-secret-value");
  });

  it("refuses a database URL that is not the role it is for, above all a superuser", () => {
    const asPostgres = webEnv["DATABASE_URL_APP"]!.replace(/\/\/app/, "//postgres");
    expect(problemsOf(() => readWebConfig({ ...webEnv, DATABASE_URL_APP: asPostgres }))).toEqual(["DATABASE_URL_APP must connect as the app role"]);
    expect(problemsOf(() => readWebConfig({ ...webEnv, DATABASE_URL_SCHEDULER: webEnv["DATABASE_URL_APP"]! }))).toEqual(["DATABASE_URL_SCHEDULER must connect as the scheduler role"]);
    expect(problemsOf(() => readWorkerConfig({ ...workerEnv, DATABASE_URL_SCHEDULER: asPostgres }))).toEqual(["DATABASE_URL_SCHEDULER must connect as the scheduler role"]);
  });

  it("refuses migration, owner, Postgres and smoke values, and another role's secrets, in any process", () => {
    const foreignToWeb = { HEARTBEAT_PING_URL: "https://h.invalid/x", MIGRATION_DATABASE_URL: "postgres://postgres@h/db", ROLE_PASSWORD_APP: "x", POSTGRES_PASSWORD: "x", SMOKE_PASSWORD: "x" };
    const web = problemsOf(() => readWebConfig({ ...webEnv, ...foreignToWeb }));
    expect(web).toEqual(expect.arrayContaining(Object.keys(foreignToWeb).map((name) => `${name} must not be present in the web process`)));
    const foreignToWorker = { R2_SECRET_ACCESS_KEY: "x", AUTH_SECRET: "x", SMTP_PASS: "x", DATABASE_URL_APP: "postgres://app@h/db", DATABASE_URL_IDENTITY: "postgres://identity@h/db", MIGRATION_DATABASE_URL: "postgres://postgres@h/db", ROLE_PASSWORD_SCHEDULER: "x", SMOKE_EMAIL: "x" };
    const worker = problemsOf(() => readWorkerConfig({ ...workerEnv, ...foreignToWorker }));
    expect(worker).toEqual(expect.arrayContaining(Object.keys(foreignToWorker).map((name) => `${name} must not be present in the worker process`)));
  });

  it("requires the thresholds of the operator's choosing: there is no silent default", () => {
    const { WORKER_STALE_AFTER_MS: _a, OVERDUE_AFTER_MS: _b, ...without } = webEnv;
    expect(problemsOf(() => readWebConfig(without))).toEqual(["WORKER_STALE_AFTER_MS is required", "OVERDUE_AFTER_MS is required"]);
  });
});

describe("the runtime role passwords", () => {
  it("are set for app, identity and scheduler as SCRAM verifiers, and an empty one is refused", async () => {
    const admin = new Pool({ connectionString: database.url() });
    try {
      await provisionRolePasswords(database.url(), { app: "p-app-1", identity: "p-identity-1", scheduler: "it's a 'quoted' \"password\"" });
      const { rows } = await admin.query<{ rolname: string; scram: boolean }>("SELECT rolname, rolpassword LIKE 'SCRAM-SHA-256$%' AS scram FROM pg_authid WHERE rolname IN ('app','identity','scheduler','operator_read','backup') ORDER BY 1");
      expect(Object.fromEntries(rows.map((row) => [row.rolname, row.scram]))).toEqual({ app: true, backup: null, identity: true, operator_read: null, scheduler: true });
      await expect(provisionRolePasswords(database.url(), { app: "x", identity: "", scheduler: "x" })).rejects.toThrow(/identity/);
    } finally {
      // The roles are cluster-wide; leave them as the disposable cluster expects.
      for (const role of ["app", "identity", "scheduler"]) await admin.query(`ALTER ROLE ${role} PASSWORD NULL`);
      await admin.end();
    }
  });
});

describe("deep health follows the worker and the oldest overdue work", () => {
  const base = { environment: "staging", release: DIGEST, database: "ok" as const, fakeOfferings: 0, workerStaleAfterMs: 1000, overdueAfterMs: 5000 };
  it("is green only for a fresh worker, nothing late, a reachable database and no fake", () => {
    expect(judgeDeep({ ...base, liveness: { workerAgeMs: 200, oldestOverdueMs: null } })).toMatchObject({ ok: true, worker: "fresh", overdue: "ok" });
    expect(judgeDeep({ ...base, liveness: { workerAgeMs: 200, oldestOverdueMs: 4000 } }).ok).toBe(true);
  });
  it.each([
    ["a stale worker", { workerAgeMs: 1001, oldestOverdueMs: null }, { worker: "stale" }],
    ["a worker that never ticked", { workerAgeMs: null, oldestOverdueMs: null }, { worker: "never" }],
    ["overdue work past the threshold", { workerAgeMs: 10, oldestOverdueMs: 5001 }, { overdue: "late" }],
    ["an unreadable signal", null, { worker: "unknown", overdue: "unknown" }],
  ])("is red for %s", (_name, liveness, expected) => {
    expect(judgeDeep({ ...base, liveness })).toMatchObject({ ok: false, ...expected });
  });
  it("is red for an unreachable database or a loaded fake", () => {
    expect(judgeDeep({ ...base, database: "unreachable", liveness: null }).ok).toBe(false);
    expect(judgeDeep({ ...base, fakeOfferings: 1, liveness: { workerAgeMs: 1, oldestOverdueMs: null } }).ok).toBe(false);
  });
});

describe("the database liveness signal", () => {
  it("reports the tick age and the age of overdue work as numbers, from a real database", async () => {
    const own = await freshDatabase(); // the tick is shared state: this database is not the web test's
    const liveness = await createLiveness(own.url("scheduler"));
    const admin = new Pool({ connectionString: own.url() });
    try {
      expect(await liveness.read()).toEqual({ workerAgeMs: null, oldestOverdueMs: null });
      await liveness.tick();
      const fresh = await liveness.read();
      expect(fresh.workerAgeMs).toBeGreaterThanOrEqual(0);
      expect(fresh.workerAgeMs).toBeLessThan(2000);
      // An overdue unleased in-flight Job, and a queued provider Job waiting behind admission, which is not overdue.
      const client = await admin.connect();
      await client.query("SET session_replication_role = replica"); // the rows stand alone: no Generation behind them
      for (const [state, due] of [["queued", "1 hour"], ["running", "30 seconds"]] as const) {
        await client.query(`INSERT INTO accounts.job (job_id, account_id, project_id, generation_id, run, class, provider, state, due_at, created_at, updated_at)
          VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 1, 'provider', 'p', $1, now() - $2::interval, now(), now())`, [state, due]);
      }
      client.release();
      const late = await liveness.read();
      expect(late.oldestOverdueMs).toBeGreaterThanOrEqual(30_000);
      expect(late.oldestOverdueMs).toBeLessThan(40_000); // the 1-hour-old queued Job is waiting by design, not overdue
    } finally { await liveness.close(); await admin.end(); await own.close(); }
  });
});

describe("web and worker on a real database", () => {
  let web: Running;
  let worker: (Running & { done: Promise<void> }) | undefined;
  let base: string;
  const deep = async () => { const response = await fetch(`${base}/healthz/deep`); return { status: response.status, body: await response.json() as Record<string, unknown> }; };
  const smoke: SmokeAccount = { email: "smoke@example.test", password: "synthetic-Paper-crane-lighthouse-98!", accountId: "", origin: ORIGIN };
  beforeAll(async () => { web = await composeWeb(webEnv, write); base = `http://127.0.0.1:${web.port}`; });
  afterAll(async () => { await worker?.stop(); await web?.stop(); });

  it("deep health is red with no worker, green while it ticks, red again once it stops, and exposes counts and words only", async () => {
    const before = await deep();
    expect(before.status).toBe(503);
    expect(before.body).toMatchObject({ ok: false, worker: "never", database: "ok", release: DIGEST });
    worker = await composeWorker(workerEnv, write, 200);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const up = await deep();
    expect(up.status).toBe(200);
    expect(up.body).toEqual({ ok: true, environment: "staging", release: DIGEST, database: "ok", fakeOfferings: 0, worker: "fresh", workerAgeMs: expect.any(Number), oldestOverdueMs: null, overdue: "ok" });
    await worker.stop();
    worker = undefined;
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const down = await deep();
    expect(down.status).toBe(503);
    expect(down.body).toMatchObject({ ok: false, worker: "stale" });
    const text = JSON.stringify(down.body);
    for (const secret of [SECRET, R2_SECRET, PING, "synthetickeyabcdef0123", "postgres://"]) expect(text).not.toContain(secret);
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });

  it("the smoke signs in as the smoke Account, runs a fake-provider Job end to end, and proves event replay by Last-Event-ID", async () => {
    worker = await composeWorker(workerEnv, write, 200);
    // The owner's one-time step: the same script `deploy.sh smoke-account` runs, here against this database.
    const created = spawnSync("node", [join(import.meta.dirname, "../scripts/smoke-account.ts")], { encoding: "utf8", env: { PATH: process.env["PATH"] ?? "", DATABASE_URL_IDENTITY: webEnv["DATABASE_URL_IDENTITY"]!, AUTH_SECRET: SECRET, PUBLIC_ORIGIN: ORIGIN, SMOKE_EMAIL: smoke.email, SMOKE_PASSWORD: smoke.password } });
    expect(created.stdout).toMatch(/^SMOKE_ACCOUNT_ID=[0-9a-f-]{36}\n$/);
    expect(created.stdout + created.stderr).not.toContain(smoke.password);
    const account: SmokeAccount = { ...smoke, accountId: created.stdout.trim().split("=")[1]! };

    expect(await runSmoke(base, account)).toEqual([]);
    // The Job really ran on the runtime path: its Generation settled with the staging fake and left events behind.
    const stream = await readEvents(fetch, new URL(`/api/studios/${account.accountId}/events`, base), await cookieOf(base, account), null, (frames) => frames.length >= 3, 5_000);
    expect(stream.map((frame) => frame.event.type)).toEqual(expect.arrayContaining(["job.state_changed", "generation.settled"]));
  }, 90_000);

  it("the smoke fails closed: bad login, wrong account, and a server that is not this API", async () => {
    const good: SmokeAccount = { ...smoke, accountId: "00000000-0000-4000-8000-000000000001" };
    expect((await runSmoke(base, { ...good, password: "synthetic-wrong-password-123" })).join(" ")).toContain("sign-in as the smoke Account answered");
    const other = createServer((_, response) => { response.statusCode = 200; response.end("{}"); });
    await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
    const problems = await runSmoke(`http://127.0.0.1:${(other.address() as AddressInfo).port}`, good);
    other.close();
    expect(problems.join(" ")).toContain("expected 401 unauthenticated");
  });

  it("every log line is JSON naming role, environment and release, and no secret value appears in any of them", () => {
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(JSON.parse(line)).toMatchObject({ environment: "staging", release: DIGEST });
    const all = lines.join("");
    for (const secret of [SECRET, "synthetickeyabcdef0123", R2_SECRET, PING]) expect(all).not.toContain(secret);
  });
});

async function cookieOf(base: string, account: SmokeAccount): Promise<string> {
  const response = await fetch(`${base}/api/auth/sign-in/email`, { method: "POST", headers: { origin: account.origin, "content-type": "application/json", "x-aiuteur-command": "1" }, body: JSON.stringify({ email: account.email, password: account.password }) });
  return response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}

describe("worker loop and the external heartbeat", () => {
  it("pings after a healthy check and stays silent (and reports) when the check fails", async () => {
    const pings: number[] = [];
    const out: string[] = [];
    const captured: unknown[] = [];
    const stop = new AbortController();
    let healthy = true;
    const logger = createLogger({ environment: "staging", role: "worker", release: DIGEST, write: (l) => out.push(l), clock: { now: () => 0 }, secrets: createSecretRegistry() });
    const done = runWorker({
      check: async () => { if (!healthy) throw new Error("db down"); },
      heartbeat: { ping: async () => { pings.push(1); return true; } },
      logger, sink: { capture: (e) => captured.push(e), flush: async () => {} }, intervalMs: 5, signal: stop.signal,
    });
    await new Promise((r) => setTimeout(r, 40));
    expect(pings.length).toBeGreaterThan(1);
    healthy = false;
    await new Promise((r) => setTimeout(r, 40));
    const after = pings.length;
    await new Promise((r) => setTimeout(r, 40));
    stop.abort(); await done;
    expect(pings.length).toBe(after);
    expect(captured.length).toBeGreaterThan(0);
    expect(out.some((l) => JSON.parse(l).key === "worker.tick-failed")).toBe(true);
  });
  it("the heartbeat is a plain GET to the monitor and reports a refusal or an outage as false", async () => {
    const seen: string[] = [];
    const ok = createHeartbeat({ url: "https://monitor.invalid/ping/x", fetch: async (url, init) => { seen.push(`${init?.method} ${String(url)}`); return new Response("ok"); } });
    expect(await ok.ping()).toBe(true);
    expect(seen).toEqual(["GET https://monitor.invalid/ping/x"]);
    expect(await createHeartbeat({ url: "https://m.invalid/", fetch: async () => new Response("no", { status: 500 }) }).ping()).toBe(false);
    expect(await createHeartbeat({ url: "https://m.invalid/", fetch: async () => { throw new Error("offline"); } }).ping()).toBe(false);
  });
  it("composeWorker refuses to start on a database identity other than scheduler", async () => {
    await expect(composeWorker({ ...workerEnv, DATABASE_URL_SCHEDULER: database.url("app") }, write, 1_000)).rejects.toThrow();
  });
});

describe("the API's error reporting hook never changes the answer", () => {
  const stubAccounts = { authenticate: async () => { throw new TypeError("PROMPT: a close-up of Mara"); } };
  const make = (onUnexpectedError: (error: unknown, request: { requestId: string }) => void | Promise<void>) => {
    let n = 0;
    return createApi({ accounts: stubAccounts as never, views: {} as never, workflows: {} as never, handleAuth: async () => new Response(), origin: ORIGIN, requestId: () => `req-${++n}`, now: () => 0, clientAddress: () => "203.0.113.1", onUnexpectedError });
  };
  const get = (api: ReturnType<typeof make>) => api.request(`${ORIGIN}/api/studios/00000000-0000-4000-8000-000000000000/projects`);
  const neutral = async (response: Response) => { expect(response.status).toBe(500); expect(await response.text()).toBe('{"code":"internal-error"}'); };

  it("a working reporter receives the request's correlation id and the sink tags it", async () => {
    const sink = new FakeErrorSink({ environment: "staging", role: "web", release: DIGEST }, createSecretRegistry());
    const api = make((error, { requestId }) => sink.capture(error, { code: "unexpected-error", requestId }));
    await neutral(await get(api));
    await neutral(await get(api));
    expect(sink.events.map((event) => event.tags)).toEqual([{ requestId: "req-1" }, { requestId: "req-2" }]);
    expect(JSON.stringify(sink.events)).not.toContain("Mara");
  });
  it("a reporter that throws synchronously, or rejects, cannot replace the neutral 500", async () => {
    await neutral(await get(make(() => { throw new Error("sink exploded"); })));
    await neutral(await get(make(async () => { throw new Error("sink rejected"); })));
    await new Promise((resolve) => setTimeout(resolve, 20)); // an unhandled rejection would fail the run here
  });
  it("our own refusals are not reported", async () => {
    const reported: unknown[] = [];
    const api = createApi({ accounts: { authenticate: async () => { throw new AccountRefusal("unauthenticated"); } } as never, views: {} as never, workflows: {} as never, handleAuth: async () => new Response(), origin: ORIGIN, requestId: () => "r", now: () => 0, clientAddress: () => "x", onUnexpectedError: (e) => { reported.push(e); } });
    expect((await get(api as never)).status).toBe(401);
    expect(reported).toEqual([]);
  });
});

describe("the smoke tells 'not ready yet' from a real failure", () => {
  it("reports an unreachable or unhealthy service under /healthz/deep (the deploy retries those), and nothing else that way", async () => {
    const account: SmokeAccount = { email: "a@example.test", password: "synthetic-x", accountId: "00000000-0000-4000-8000-000000000001", origin: ORIGIN };
    expect((await runSmoke("http://127.0.0.1:9", account))[0]).toMatch(/^\/healthz\/deep/);
    const red = createServer((_, response) => { response.statusCode = 503; response.end("{}"); });
    await new Promise<void>((resolve) => red.listen(0, "127.0.0.1", resolve));
    expect((await runSmoke(`http://127.0.0.1:${(red.address() as AddressInfo).port}`, account))[0]).toMatch(/^\/healthz\/deep answered 503/);
    red.close();
  });
});

describe("G3 on the Account event stream: GET /api/studios/:accountId/events", () => {
  let own: Awaited<ReturnType<typeof freshDatabase>>;
  let web: Running;
  let base: string;
  type Creator = { accountId: string; cookie: string; email: string };
  const mint = async (email: string): Promise<Creator> => {
    const created = spawnSync("node", [join(import.meta.dirname, "../scripts/smoke-account.ts")], { encoding: "utf8", env: { PATH: process.env["PATH"] ?? "", DATABASE_URL_IDENTITY: own.url("identity"), AUTH_SECRET: SECRET, PUBLIC_ORIGIN: ORIGIN, SMOKE_EMAIL: email, SMOKE_PASSWORD: "synthetic-Paper-crane-lighthouse-98!" } });
    const accountId = created.stdout.trim().split("=")[1]!;
    return { accountId, email, cookie: await cookieOf(base, { email, password: "synthetic-Paper-crane-lighthouse-98!", accountId, origin: ORIGIN }) };
  };
  let a: Creator;
  let b: Creator;
  beforeAll(async () => {
    own = await freshDatabase();
    web = await composeWeb({ ...webEnv, DATABASE_URL_APP: own.url("app"), DATABASE_URL_IDENTITY: own.url("identity"), DATABASE_URL_SCHEDULER: own.url("scheduler") }, write);
    base = `http://127.0.0.1:${web.port}`;
    worker = await composeWorker({ ...workerEnv, DATABASE_URL_SCHEDULER: own.url("scheduler") }, write, 200);
    a = await mint("account-a@example.test");
    b = await mint("account-b@example.test");
    // Both Accounts have real events (a fake-provider Job each), so a leak across Accounts would have something to leak.
    for (const creator of [a, b]) expect(await runSmoke(base, { email: creator.email, password: "synthetic-Paper-crane-lighthouse-98!", accountId: creator.accountId, origin: ORIGIN })).toEqual([]);
  }, 120_000);
  let worker: Running | undefined;
  afterAll(async () => { await worker?.stop(); await web?.stop(); await own?.close(); });

  const open = (accountId: string, cookie: string, lastEventId?: string) => fetch(`${base}/api/studios/${accountId}/events`, { headers: { ...(cookie ? { cookie } : {}), accept: "text/event-stream", ...(lastEventId === undefined ? {} : { "last-event-id": lastEventId }) }, signal: AbortSignal.timeout(5_000) });
  const refusal = async (response: Response) => { const body = await response.text(); await response.body?.cancel().catch(() => undefined); return { status: response.status, body }; };

  it("an Account reads its own stream, and every frame it receives is its own", async () => {
    expect(a.accountId).not.toBe(b.accountId);
    const mine = await readEvents(fetch, new URL(`/api/studios/${a.accountId}/events`, base), a.cookie, null, (frames) => frames.length >= 3, 5_000);
    expect(mine.length).toBeGreaterThanOrEqual(3);
    expect(mine.every((frame) => frame.event.accountId === a.accountId)).toBe(true);
    const theirs = await readEvents(fetch, new URL(`/api/studios/${b.accountId}/events`, base), b.cookie, null, (frames) => frames.length >= 3, 5_000);
    expect(theirs.length).toBeGreaterThanOrEqual(3);
    expect(theirs.every((frame) => frame.event.accountId === b.accountId)).toBe(true);
  });

  it("another Account naming this Account's id is refused exactly as an absent id is, whatever Last-Event-ID it sends", async () => {
    const absent = await refusal(await open("00000000-0000-4000-8000-000000000009", b.cookie));
    expect(absent).toEqual({ status: 404, body: '{"code":"not-found"}' });
    for (const lastEventId of [undefined, "0", "1", "999999999999999", "-1", "abc", "1; DROP", `${a.accountId}`]) {
      const refused = await refusal(await open(a.accountId, b.cookie, lastEventId));
      expect(refused, String(lastEventId)).toEqual(absent);
      expect(refused.body).not.toContain(a.accountId);
      expect(refused.body).not.toMatch(/sequence|account\.created|generation|job/);
    }
  });

  it("an unauthenticated caller is refused, with or without Last-Event-ID, and learns nothing about the Account", async () => {
    for (const lastEventId of [undefined, "0", "999999999999999"]) {
      const refused = await refusal(await open(a.accountId, "", lastEventId));
      expect(refused).toEqual({ status: 401, body: '{"code":"unauthenticated"}' });
    }
  });

  it("an Account's own cursor past its last event yields nothing, and never another Account's events", async () => {
    const frames = await readEvents(fetch, new URL(`/api/studios/${a.accountId}/events`, base), a.cookie, 999_999_999, (all) => all.length > 0, 2_500);
    expect(frames).toEqual([]);
  });
});
