import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { afterAll, beforeAll, expect, it } from "vitest";
import { characterReadSchema, entityOutcomeSchema, mediaLinkSchema, referenceOutcomeSchema, shotReadSchema, uploadSchema } from "@aiuteur/contract";
import { syntheticImage } from "@aiuteur/testing";
import { freshDatabase } from "../../api/test/database.ts";
import { composeWeb, composeWorker, type Running } from "../src/index.ts";

// The REAL staging composition (the one the release image runs), not a test root: it must still contain what current main
// contains. Real Postgres under the three runtime roles, the real R2 adapter over a loopback S3 gateway, the built client.
const DIGEST = `sha256:${"d".repeat(64)}`;
const ORIGIN = "https://staging.example.test";
const PASSWORD = "synthetic-Paper-crane-lighthouse-98!";
const run = promisify(execFile);
const freePort = () => new Promise<number>((resolve) => { const s = createServer().listen(0, "127.0.0.1", () => { const port = (s.address() as { port: number }).port; s.close(() => resolve(port)); }); });

let database: Awaited<ReturnType<typeof freshDatabase>>;
let web: Running;
let worker: Running | undefined;
let gateway: ChildProcess;
let base: string;
const scratch: string[] = [];
type Creator = { accountId: string; cookie: string; project: string; studio: string };

const call = (method: string, path: string, cookie: string, body?: unknown) =>
  fetch(`${base}${path}`, { method, headers: { origin: ORIGIN, "content-type": "application/json", "x-aiuteur-command": "1", "idempotency-key": crypto.randomUUID(), cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

async function creator(email: string): Promise<Creator> {
  const created = await run("node", [join(import.meta.dirname, "../scripts/smoke-account.ts")], { env: { PATH: process.env["PATH"] ?? "", DATABASE_URL_IDENTITY: database.url("identity"), AUTH_SECRET: "synthetic-auth-secret-0123456789abcdef-ZZ", PUBLIC_ORIGIN: ORIGIN, SMOKE_EMAIL: email, SMOKE_PASSWORD: PASSWORD } });
  const accountId = created.stdout.trim().split("=")[1]!;
  const signIn = await call("POST", "/api/auth/sign-in/email", "", { email, password: PASSWORD });
  const cookie = signIn.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const studio = `/api/studios/${accountId}/projects`;
  const project = ((await (await call("POST", studio, cookie)).json()) as { projectId: string }).projectId;
  return { accountId, cookie, project, studio: `${studio}/${project}` };
}

beforeAll(async () => {
  const bin = process.env["S3_GATEWAY_BIN"];
  if (!bin) throw new Error("S3_GATEWAY_BIN required: the S3-protocol gateway the R2 adapter runs against (see change-records/T0-12.md)");
  const data = mkdtempSync(join(tmpdir(), "staging-s3-")); scratch.push(data);
  mkdirSync(join(data, "staging-media"));
  const port = await freePort();
  const [accessKeyId, secretAccessKey] = [randomBytes(8).toString("hex"), randomBytes(24).toString("hex")];
  gateway = spawn(bin, ["--port", `127.0.0.1:${port}`, "--access", accessKeyId, "--secret", secretAccessKey, "--region", "auto", "posix", data], { stdio: "ignore" });
  const endpoint = `http://127.0.0.1:${port}`;
  for (let i = 0; !(await fetch(endpoint).then(() => true, () => false)); i++) { if (i > 100) throw new Error("the S3 gateway did not start"); await sleep(100); }

  // The built client, by the same build the browser suites run.
  const client = mkdtempSync(join(tmpdir(), "staging-client-")); scratch.push(client);
  await run("pnpm", ["--filter", "@aiuteur/client", "exec", "vite", "build", "--outDir", client, "--emptyOutDir", "--logLevel", "error"]);

  database = await freshDatabase();
  const env = {
    AIUTEUR_ENVIRONMENT: "staging", RELEASE_DIGEST: DIGEST, PORT: "0", PUBLIC_ORIGIN: ORIGIN, AUTH_SECRET: "synthetic-auth-secret-0123456789abcdef-ZZ",
    DATABASE_URL_APP: database.url("app"), DATABASE_URL_IDENTITY: database.url("identity"), DATABASE_URL_SCHEDULER: database.url("scheduler"),
    SMTP_HOST: "127.0.0.1", SMTP_SECURITY: "none", SMTP_FROM: "studio@example.test",
    R2_ACCOUNT_ID: "0".repeat(32), R2_BUCKET: "staging-media", R2_ENDPOINT: endpoint, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey,
    ERROR_SINK_DSN: "https://synthetickeyabcdef0123@tracker.invalid/7", WORKER_STALE_AFTER_MS: "30000", OVERDUE_AFTER_MS: "60000",
  };
  web = await composeWeb(env, () => {}, client);
  base = `http://127.0.0.1:${web.port}`;
  worker = await composeWorker({ AIUTEUR_ENVIRONMENT: "staging", RELEASE_DIGEST: DIGEST, DATABASE_URL_SCHEDULER: database.url("scheduler"), ERROR_SINK_DSN: env.ERROR_SINK_DSN, HEARTBEAT_PING_URL: "https://heartbeat.invalid/ping/x" }, () => {}, 200);
}, 120_000);
afterAll(async () => { await worker?.stop(); await web?.stop(); gateway?.kill(); await database?.close(); for (const dir of scratch) rmSync(dir, { recursive: true, force: true }); });

it("serves the built client at / and at any screen address, while /api, /healthz and /healthz/deep keep their own answers", async () => {
  const root = await fetch(`${base}/`);
  expect([root.status, root.headers.get("content-type")]).toEqual([200, "text/html; charset=utf-8"]);
  const html = await root.text();
  expect(html).toContain('<div id="root">');
  // A reload of a screen address reaches the same entry page; a built asset is served as itself.
  expect(await (await fetch(`${base}/projects/some-project/world`)).text()).toBe(html);
  const asset = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
  expect(asset).toBeDefined();
  expect((await fetch(`${base}${asset}`)).headers.get("content-type")).toBe("text/javascript; charset=utf-8");
  expect(await (await fetch(`${base}/api/studios/00000000-0000-4000-8000-000000000000/projects`)).json()).toEqual({ code: "unauthenticated" });
  expect(await (await fetch(`${base}/healthz`)).json()).toEqual({ ok: true });
  const deep = await fetch(`${base}/healthz/deep`);
  expect(deep.status).toBe(200);
  expect(await deep.json()).toMatchObject({ ok: true, release: DIGEST, worker: "fresh", database: "ok" });
  expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
});

it("registers Character and Shot, wires media over the R2 adapter, and keeps Accounts apart, through the staging composition", async () => {
  const a = await creator("staging-a@example.test");
  const b = await creator("staging-b@example.test");

  const made = entityOutcomeSchema.parse(await (await call("POST", `${a.studio}/characters`, a.cookie, { name: "Mara" })).json());
  if (made.result !== "Applied") throw new Error("Character refused");
  const mara = made.objectId;

  // A valid image is probed by the real ffprobe, promoted, and viewed through a signed link whose bytes are the ones sent.
  const bytes = syntheticImage({ width: 64, height: 48, format: "png" });
  const ticket = uploadSchema.parse(await (await call("POST", `${a.studio}/uploads`, a.cookie, {})).json());
  expect((await fetch(ticket.link.url, { method: "PUT", body: new Uint8Array(bytes), headers: { "content-type": "image/png" } })).status).toBe(200);
  const attached = referenceOutcomeSchema.parse(await (await call("POST", `${a.studio}/characters/${mara}/reference`, a.cookie, { uploadId: ticket.uploadId })).json());
  if (attached.result !== "Applied") throw new Error("reference refused");
  expect(attached.reference.media).toEqual({ hash: createHash("sha256").update(bytes).digest("hex"), size: bytes.byteLength, contentType: "image/png", width: 64, height: 48 });
  expect(characterReadSchema.parse(await (await call("GET", `${a.studio}/characters/${mara}`, a.cookie)).json())).toMatchObject({ name: "Mara", reference: attached.reference });
  const link = mediaLinkSchema.parse(await (await call("GET", `${a.studio}/characters/${mara}/reference/view`, a.cookie)).json());
  const image = new Uint8Array(await (await fetch(link.url)).arrayBuffer());
  expect(createHash("sha256").update(image).digest("hex")).toBe(createHash("sha256").update(bytes).digest("hex"));

  // The hand-made Shot with that Character's Presence.
  const shot = entityOutcomeSchema.parse(await (await call("POST", `${a.studio}/shots`, a.cookie, { action: "Mara at the rail.", presence: [{ entity: mara, look: "base" }] })).json());
  if (shot.result !== "Applied") throw new Error("Shot refused");
  expect(shotReadSchema.parse(await (await call("GET", `${a.studio}/shots/${shot.objectId}`, a.cookie)).json()).presence).toMatchObject([{ entity: mara, look: "base" }]);

  // Account isolation: B sees none of it, exactly as for an absent id.
  const foreign = `/api/studios/${b.accountId}/projects/${b.project}`;
  expect((await call("GET", `${foreign}/characters/${mara}/reference/view`, b.cookie)).status).toBe(404);
  expect((await call("GET", `${a.studio}/characters/${mara}`, b.cookie)).status).toBe(404);
  expect((await call("POST", `${foreign}/shots`, b.cookie, { action: "x", presence: [{ entity: mara, look: "base" }] })).status).toBe(404);
}, 60_000);
