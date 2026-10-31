import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, expect, it } from "vitest";
import { characterListSchema, entityOutcomeSchema, mediaLinkSchema, projectSchema, redeemedInvitationSchema, shotListSchema, uploadSchema } from "@aiuteur/contract";
import { syntheticImage } from "@aiuteur/testing";
import { freshDatabase } from "../../../packages/api/test/database.ts";
import { composeCi } from "../src/composition/ci.ts";
import { serveWeb } from "../src/server.ts";

// VC9, the E1 hand step of T0b (T0-12): a Character with an uploaded reference viewed through a signed link, and a
// hand-made Shot with that Character's Presence, in a real browser against the built client, the real API on real
// Postgres and the in-memory BlobStore over loopback. Seed boundary: an invited creator, signed in, with a new project
// (E1's earlier steps are the T0-08 suite). Then reload, a stale client, and another Account's link refused.
const password = "Paper-crane-lighthouse-98!";
const artifacts = process.env["E1_ARTIFACTS"];
let database: Awaited<ReturnType<typeof freshDatabase>>;
let ci: Awaited<ReturnType<typeof composeCi>>;
let web: Awaited<ReturnType<typeof serveWeb>>;
let browser: Browser;
let build: string;
let origin: string;

const freePort = () => new Promise<number>((resolve) => { const s = createServer().listen(0, "localhost", () => { const port = (s.address() as { port: number }).port; s.close(() => resolve(port)); }); });

beforeAll(async () => {
  build = mkdtempSync(join(tmpdir(), "web-build-"));
  execFileSync("pnpm", ["--filter", "@aiuteur/client", "exec", "vite", "build", "--outDir", build, "--emptyOutDir", "--logLevel", "error"], { stdio: "pipe" });
  const port = await freePort();
  origin = `http://localhost:${port}`;
  database = await freshDatabase();
  ci = await composeCi({ databaseUrl: database.url, origin });
  web = await serveWeb({ api: ci.fetch, staticDir: build, port });
  browser = await chromium.launch();
}, 120_000);
afterAll(async () => { await browser?.close(); await web?.close(); await ci?.close(); await database?.close(); if (build) rmSync(build, { recursive: true, force: true }); });

async function shot(page: Page, name: string) { if (artifacts) await page.screenshot({ path: join(artifacts, `${name}.png`), fullPage: true }); }
const command = { origin: "", "content-type": "application/json", "x-aiuteur-command": "1" };

/** The seed: an invited creator signed in inside this browser context, with one new project. */
async function seed(context: BrowserContext) {
  const email = `${randomUUID()}@example.test`;
  const token = ci.ids.token();
  await ci.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: ci.clock.now(), expiresAt: ci.clock.now() + 600_000, issuedBy: null, auditId: ci.ids.uuid() });
  const headers = { ...command, origin };
  const redeemed = await context.request.post(`${origin}/api/invitations/redeem`, { headers, data: { token, email, name: "Synthetic creator", password } });
  const { accountId } = redeemedInvitationSchema.parse(await redeemed.json());
  expect((await context.request.post(`${origin}/api/auth/sign-in/email`, { headers, data: { email, password } })).status()).toBe(200);
  const project = projectSchema.parse(await (await context.request.post(`${origin}/api/studios/${accountId}/projects`, { headers: { ...headers, "idempotency-key": randomUUID() }, data: {} })).json()).projectId;
  return { accountId, project, base: `${origin}/api/studios/${accountId}/projects/${project}`, headers };
}
type Seeded = Awaited<ReturnType<typeof seed>>;
/** The read models the World and Shots screens display, fetched with the browser's own session. */
const characters = async (context: BrowserContext, s: Seeded) => characterListSchema.parse(await (await context.request.get(`${s.base}/characters`)).json()).characters;
const shots = async (context: BrowserContext, s: Seeded) => shotListSchema.parse(await (await context.request.get(`${s.base}/shots`)).json()).shots;

it("E1 T0b hand step: upload a Character's reference and view it, make a Shot with its Presence; reload, stale client, and another Account's link refused", async () => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 820 } });
  const a = await seed(context);
  const page = await context.newPage();

  // World: add a Character by hand.
  await page.goto(`${origin}/projects/${a.project}/world`);
  await page.getByRole("heading", { name: "World", exact: true }).waitFor();
  await page.getByText("No characters yet.").waitFor();
  await shot(page, "1-world-empty");
  await page.getByLabel("Character name").fill("Mara");
  await page.getByRole("button", { name: "Add character" }).click();
  await page.getByTestId("no-reference").waitFor();

  // Upload a reference image through the signed PUT, then the server verifies, hashes and probes it.
  const image = syntheticImage({ width: 320, height: 240, format: "png", colour: "teal" });
  await page.getByLabel("Upload reference image").setInputFiles({ name: "mara.png", mimeType: "image/png", buffer: Buffer.from(image) });
  const img = page.getByTestId("reference");
  await img.waitFor();
  await page.waitForFunction(() => { const el = document.querySelector<HTMLImageElement>("[data-testid=reference]"); return el !== null && el.complete && el.naturalWidth > 0; });

  // The screen shows what the read model says, and the browser decoded the very bytes uploaded.
  const [mara] = await characters(context, a);
  expect(mara?.reference?.media).toEqual({ hash: createHash("sha256").update(image).digest("hex"), size: image.byteLength, contentType: "image/png", width: 320, height: 240 });
  expect(await img.evaluate((el) => [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight])).toEqual([320, 240]);
  expect(await page.getByTestId("reference-facts").textContent()).toBe("PNG · 320×240");
  const src = await img.getAttribute("src");
  expect(src).toContain(`a/${a.accountId}/p/${a.project}/m/${mara!.reference!.media.hash}`);
  const fetched = await context.request.get(src!);
  expect(createHash("sha256").update(await fetched.body()).digest("hex")).toBe(mara!.reference!.media.hash);
  const row = await database.inspect.query("SELECT key, width, height FROM accounts.media WHERE hash = $1", [mara!.reference!.media.hash]);
  expect(row.rows).toEqual([{ key: `a/${a.accountId}/p/${a.project}/m/${mara!.reference!.media.hash}`, width: 320, height: 240 }]);
  await shot(page, "2-world-reference-uploaded");

  // Reload: the same Character and the same image, with a freshly minted link.
  await page.reload();
  await page.waitForFunction(() => { const el = document.querySelector<HTMLImageElement>("[data-testid=reference]"); return el !== null && el.complete && el.naturalWidth === 320; });
  expect(await characters(context, a)).toEqual([mara]);
  expect(await page.getByTestId("character-name").textContent()).toBe("Mara");
  await shot(page, "3-world-after-reload");

  // A second Character (by API: the same command the screen sends), so Presence has a choice.
  const passenger = entityOutcomeSchema.parse(await (await context.request.post(`${a.base}/characters`, { headers: { ...a.headers, "idempotency-key": randomUUID() }, data: { name: "Passenger" } })).json());
  if (passenger.result !== "Applied") throw new Error("not applied");

  // Shots: a hand-made Shot with Mara present.
  await page.getByRole("navigation", { name: "Project" }).getByRole("link", { name: "Shots" }).click();
  await page.getByRole("heading", { name: "Shots", exact: true }).waitFor();
  await page.getByLabel("What happens").fill("Mara holds the letter up to the storm lamp.");
  await page.locator("form").getByLabel("Mara", { exact: true }).check();
  await page.getByRole("button", { name: "Add shot" }).click();
  await page.getByTestId("shot").waitFor();
  const [made] = await shots(context, a);
  expect(made).toMatchObject({ sequence: 1, action: "Mara holds the letter up to the storm lamp.", presence: [{ entity: mara!.objectId, look: "base", name: "Mara" }] });
  expect(await page.getByTestId("presence").textContent()).toBe(made!.presence.map((p) => p.name).join(", "));
  expect(await page.getByTestId("sequence").textContent()).toBe(String(made!.sequence));
  await shot(page, "4-shot-made");
  await page.reload();
  await page.getByTestId("shot").waitFor();
  expect(await shots(context, a)).toEqual([made]);
  expect(await page.getByTestId("presence").textContent()).toBe("Mara");
  await shot(page, "5-shot-after-reload");

  // Stale client: a second tab adds the Passenger; the first tab, still at revision 1, removes Mara.
  const other = await context.newPage();
  await other.goto(`${origin}/projects/${a.project}/shots`);
  await other.getByTestId("shot").getByLabel("Passenger", { exact: true }).check();
  await other.getByTestId("shot").getByRole("button", { name: "Save presence" }).click();
  await other.getByTestId("presence").filter({ hasText: "Mara, Passenger" }).waitFor();
  await other.close();
  expect(await page.getByTestId("sequence").textContent()).toBe("1"); // the first tab has not heard
  await page.getByTestId("shot").getByLabel("Mara", { exact: true }).uncheck();
  await page.getByTestId("shot").getByRole("button", { name: "Save presence" }).click();
  await page.getByRole("status").filter({ hasText: "changed somewhere else" }).waitFor();
  await page.getByTestId("kept-aside").waitFor();
  const [after] = await shots(context, a);
  expect(after).toMatchObject({ sequence: 2, presence: [{ name: "Mara" }, { name: "Passenger" }], sideLine: [{ basedOn: 1, presence: [] }] });
  // Re-rendered from the server's state, not left at the optimistic one.
  expect(await page.getByTestId("sequence").textContent()).toBe("2");
  expect(await page.getByTestId("presence").textContent()).toBe("Mara, Passenger");
  expect(await page.getByTestId("shot").getByLabel("Mara", { exact: true }).isChecked()).toBe(true);
  await shot(page, "6-stale-client-refused");

  // Another Account, in its own browser context, with the same image in its own project.
  const intruder = await browser.newContext({ viewport: { width: 1000, height: 820 } });
  const b = await seed(intruder);
  const bChar = entityOutcomeSchema.parse(await (await intruder.request.post(`${b.base}/characters`, { headers: { ...b.headers, "idempotency-key": randomUUID() }, data: { name: "Stranger" } })).json());
  if (bChar.result !== "Applied") throw new Error("not applied");
  const ticket = uploadSchema.parse(await (await intruder.request.post(`${b.base}/uploads`, { headers: { ...b.headers, "idempotency-key": randomUUID() }, data: {} })).json());
  expect((await intruder.request.put(ticket.link.url, { headers: { "content-type": "image/png" }, data: Buffer.from(image) })).status()).toBe(200);
  expect((await intruder.request.post(`${b.base}/characters/${bChar.objectId}/reference`, { headers: { ...b.headers, "idempotency-key": randomUUID() }, data: { uploadId: ticket.uploadId } })).status()).toBe(201);
  const bLink = mediaLinkSchema.parse(await (await intruder.request.get(`${b.base}/characters/${bChar.objectId}/reference/view`)).json());
  const bPage = await intruder.newPage();
  // B's own link opens; B asking the server for A's link answers not found; A's World address shows B nothing of A's.
  expect((await bPage.goto(bLink.url))?.status()).toBe(200);
  expect((await intruder.request.get(`${a.base}/characters/${mara!.objectId}/reference/view`)).status()).toBe(404);
  expect((await intruder.request.get(`${origin}/api/studios/${b.accountId}/projects/${a.project}/characters/${mara!.objectId}/reference/view`)).status()).toBe(404);
  await bPage.goto(`${origin}/projects/${a.project}/world`);
  await bPage.getByRole("heading", { name: "Projects" }).waitFor();
  expect(await bPage.getByTestId("reference").count()).toBe(0);
  // B's signed link re-pointed at A's object (same hash; A's Account and project) is refused by the store.
  const aKey = `a/${a.accountId}/p/${a.project}/m/${mara!.reference!.media.hash}`;
  const forged = bLink.url.replace(`a/${b.accountId}/p/${b.project}/m/`, `a/${a.accountId}/p/${a.project}/m/`);
  expect(forged).toContain(aKey);
  expect((await bPage.goto(forged))?.status()).toBe(403);
  expect(await bPage.locator("body").textContent()).toContain("AccessDenied");
  await shot(bPage, "7-other-account-link-refused");
  // A's own view keeps working.
  await page.goto(`${origin}/projects/${a.project}/world`);
  await page.waitForFunction(() => { const el = document.querySelector<HTMLImageElement>("[data-testid=reference]"); return el !== null && el.complete && el.naturalWidth === 320; });
  await intruder.close();
  await context.close();
});
