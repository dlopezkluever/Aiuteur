import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, expect, it } from "vitest";
import { inputReadSchema } from "@aiuteur/contract";
import { freshDatabase } from "../../../packages/api/test/database.ts";
import { composeCi } from "../src/composition/ci.ts";
import { serveWeb } from "../src/server.ts";

// VC9 short path, E1 up to Input (T0-08): redeem -> sign in -> new project -> paste -> reload, then a stale client.
// Real browser, the built client, the real API on real Postgres, the fake mailer and fake text provider.
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

/** The read model the Input screen displays, fetched with the browser's own session. */
async function displayed(context: BrowserContext, accountId: string, projectId: string) {
  const response = await context.request.get(`${origin}/api/studios/${accountId}/projects/${projectId}/source-material`);
  expect(response.status()).toBe(200);
  return inputReadSchema.parse(await response.json());
}

it("E1 to Input: an invited creator redeems, signs in, starts a project, pastes a paragraph and keeps it across a reload; a stale client is refused and re-renders", async () => {
  const email = `${randomUUID()}@example.test`;
  const token = ci.ids.token();
  await ci.identity.issue({ tokenHash: createHash("sha256").update(token).digest("hex"), email, at: ci.clock.now(), expiresAt: ci.clock.now() + 600_000, issuedBy: null, auditId: ci.ids.uuid() });

  const context = await browser.newContext({ viewport: { width: 1000, height: 760 } });
  const page = await context.newPage();

  // Redeem, as the invitation link opens it: the token is in the fragment.
  await page.goto(`${origin}/redeem#token=${token}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Name").fill("Synthetic creator");
  await page.getByLabel(/^Password/).fill(password);
  await shot(page, "1-redeem");
  await page.getByRole("button", { name: "Create my studio" }).click();
  await page.getByRole("heading", { name: "Your studio is ready" }).waitFor();

  // Sign in: no projects yet, one primary action.
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await shot(page, "2-sign-in");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Projects" }).waitFor();
  await page.getByText("You have no projects yet.").waitFor();
  await shot(page, "3-projects-empty");

  // New project opens Input directly: no chooser, tour or welcome.
  await page.getByRole("button", { name: "New project" }).click();
  await page.waitForURL(/\/projects\/[^/]+\/input$/);
  await page.getByRole("heading", { name: "Input" }).waitFor();
  expect(await page.getByRole("dialog").count()).toBe(0);
  const [, , projectId] = new URL(page.url()).pathname.split("/") as [string, string, string];
  const session = (await (await context.request.get(`${origin}/api/session`)).json()) as { accountId: string };
  await shot(page, "4-input-empty");

  // Paste.
  const paragraph = "A lighthouse keeper finds a message in a bottle.\nIt is addressed to her, in her own handwriting.";
  await page.getByLabel("Paste or type").fill(paragraph);
  await page.getByRole("button", { name: "Add to project" }).click();
  await page.getByTestId("source-text").waitFor();

  // The screen shows exactly what the server's read model says, and the store holds it.
  const model = await displayed(context, session.accountId, projectId);
  expect(model.items).toHaveLength(1);
  const head = model.items[0]!.head;
  expect(head.text).toBe(paragraph);
  expect(await page.getByTestId("source-text").evaluate((el) => (el as HTMLElement).textContent)).toBe(head.text);
  expect(await page.getByTestId("sequence").textContent()).toBe(String(head.sequence));
  expect(await page.getByTestId("role").textContent()).toBe(head.role);
  const stored = await database.inspect.query("SELECT body FROM accounts.revision WHERE object_id = $1", [head.objectId]);
  expect(JSON.stringify(stored.rows[0]?.body)).toContain("lighthouse keeper");
  await shot(page, "5-input-pasted");

  // Reload: nothing is recreated from client state.
  await page.reload();
  await page.getByTestId("source-text").waitFor();
  expect(await displayed(context, session.accountId, projectId)).toEqual(model);
  expect(await page.getByTestId("source-text").evaluate((el) => (el as HTMLElement).textContent)).toBe(paragraph);
  expect(await page.getByTestId("sequence").textContent()).toBe("1");
  await shot(page, "6-input-after-reload");

  // Stale client: a second tab (same session) changes the role; the first tab, still at revision 1, then tries too.
  const other = await context.newPage();
  await other.goto(`${origin}/projects/${projectId}/input`);
  await other.getByRole("button", { name: "Mark as supporting" }).click();
  await other.getByText("supporting", { exact: true }).waitFor();
  await other.close();
  expect(await page.getByTestId("sequence").textContent()).toBe("1"); // the first tab has not heard
  await page.getByRole("button", { name: "Mark as supporting" }).click();
  await page.getByRole("status").filter({ hasText: "changed somewhere else" }).waitFor();
  await page.getByTestId("kept-aside").waitFor();

  const after = await displayed(context, session.accountId, projectId);
  const item = after.items[0]!;
  expect(item.head.sequence).toBe(2); // the stale write added no Revision
  expect(item.sideLine).toHaveLength(1);
  expect(item.sideLine[0]).toMatchObject({ origin: "stale-base", basedOn: 1 });
  // The screen was re-rendered from the server's state, not left at the optimistic one.
  expect(await page.getByTestId("sequence").textContent()).toBe("2");
  expect(await page.getByTestId("role").textContent()).toBe(item.head.role);
  expect(await page.getByTestId("kept-aside").count()).toBe(1);
  await shot(page, "7-stale-client-refused");
  await context.close();
});
