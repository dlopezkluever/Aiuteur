import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freshDatabase } from "../../api/test/database.ts";
import { composeWeb, composeWorker, ConfigInvalid, createHeartbeat, readConfig, runSmoke, runWorker, type Running } from "../src/index.ts";
import { createLogger, createSecretRegistry } from "@aiuteur/observability";

const DIGEST = `sha256:${"c".repeat(64)}`;
const SECRET = "synthetic-auth-secret-0123456789abcdef-ZZ";
const DSN_KEY = "synthetickeyabcdef0123";
let database: Awaited<ReturnType<typeof freshDatabase>>;
let env: Record<string, string>;
const lines: string[] = [];
const write = (line: string) => { lines.push(line); };

beforeAll(async () => {
  database = await freshDatabase();
  env = {
    AIUTEUR_ENVIRONMENT: "staging", RELEASE_DIGEST: DIGEST, PORT: "0",
    PUBLIC_ORIGIN: "https://staging.example.test", AUTH_SECRET: SECRET,
    DATABASE_URL_APP: database.url("app"), DATABASE_URL_IDENTITY: database.url("identity"), DATABASE_URL_SCHEDULER: database.url("scheduler"),
    SMTP_HOST: "127.0.0.1", SMTP_SECURITY: "none", SMTP_FROM: "studio@example.test",
    R2_ACCOUNT_ID: "0".repeat(32), R2_BUCKET: "staging-media", R2_ACCESS_KEY_ID: "synthetic-r2-key-id-0001", R2_SECRET_ACCESS_KEY: "synthetic-r2-secret-0002",
    ERROR_SINK_DSN: `https://${DSN_KEY}@tracker.invalid/7`, HEARTBEAT_PING_URL: "https://heartbeat.invalid/ping/synthetic-ping-token",
  };
});
afterAll(async () => { await database?.close(); });

describe("R24: configuration is parsed once at the composition root and names a problem without its value", () => {
  it("accepts the full staging set", () => {
    const config = readConfig(env, "web");
    expect(config).toMatchObject({ environment: "staging", release: DIGEST, role: "web" });
    expect(config.secretValues).toContain(SECRET);
  });
  it("refuses a missing, malformed or forbidden value, and never echoes a value", () => {
    const bad = { ...env, AIUTEUR_ENVIRONMENT: "production", RELEASE_DIGEST: "latest", AUTH_SECRET: "short-secret-value", MIGRATION_DATABASE_URL: "postgres://postgres@h/db", ERROR_SINK_DSN: "" };
    let thrown: unknown;
    try { readConfig(bad, "web"); } catch (error) { thrown = error; }
    expect(thrown).toBeInstanceOf(ConfigInvalid);
    const message = (thrown as ConfigInvalid).message;
    for (const expected of ["AIUTEUR_ENVIRONMENT", "RELEASE_DIGEST", "AUTH_SECRET", "MIGRATION_DATABASE_URL must not be present", "ERROR_SINK_DSN"]) expect(message).toContain(expected);
    for (const leaked of ["postgres://postgres@h/db", "short-secret-value"]) expect(message).not.toContain(leaked);
  });
  it("requires the heartbeat URL of the worker only", () => {
    const { HEARTBEAT_PING_URL: _removed, ...without } = env;
    expect(() => readConfig(without, "web")).not.toThrow();
    expect(() => readConfig(without, "worker")).toThrow(/HEARTBEAT_PING_URL/);
  });
});

describe("web role on a real database", () => {
  let web: Running;
  let base: string;
  beforeAll(async () => { web = await composeWeb(env, write); base = `http://127.0.0.1:${web.port}`; });
  afterAll(async () => { await web?.stop(); });

  it("serves deep health with counts only, reports the release digest, and passes the staging smoke", async () => {
    const deep = await fetch(`${base}/healthz/deep`);
    expect(deep.status).toBe(200);
    expect(await deep.json()).toEqual({ ok: true, environment: "staging", release: DIGEST, database: "ok", fakeOfferings: 0 });
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
    expect(await runSmoke(base)).toEqual([]);
  });
  it("the smoke fails against a server that is not this API", async () => {
    const other = createServer((_, response) => { response.statusCode = 200; response.end("{}"); });
    await new Promise<void>((resolve) => other.listen(0, "127.0.0.1", resolve));
    const problems = await runSmoke(`http://127.0.0.1:${(other.address() as AddressInfo).port}`);
    other.close();
    expect(problems.join(" ")).toContain("expected 401 unauthenticated");
  });
  it("every log line is JSON naming role, environment and release, and no secret value appears in any of them", () => {
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(JSON.parse(line)).toMatchObject({ environment: "staging", role: "web", release: DIGEST });
    const all = lines.join("");
    for (const secret of [SECRET, DSN_KEY, "synthetic-r2-secret-0002", "synthetic-ping-token"]) expect(all).not.toContain(secret);
  });
});

describe("worker role and the external heartbeat", () => {
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
    const healthyPings = pings.length;
    expect(healthyPings).toBeGreaterThan(1);
    healthy = false;
    await new Promise((r) => setTimeout(r, 40));
    const after = pings.length;
    await new Promise((r) => setTimeout(r, 40));
    stop.abort(); await done;
    expect(pings.length).toBe(after); // silence once unhealthy
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
    await expect(composeWorker({ ...env, DATABASE_URL_SCHEDULER: database.url("app") }, write, 1_000)).rejects.toThrow();
  });
});
