import { Hono } from "hono";
import { clientAssets } from "@aiuteur/web";
import type { DeepHealth } from "./health.ts";

/** The web process: the health routes (and any platform route) beside the contract API and the built client. */
export function createWebApp(options: { api: { fetch: Hono["fetch"] }; routes?: Hono; clientDir: string; deep(): Promise<DeepHealth> }): Hono {
  const app = new Hono();
  // Liveness: the process answers. It touches nothing, so a database outage does not restart a healthy process.
  app.get("/healthz", (c) => c.json({ ok: true }));
  app.get("/healthz/deep", async (c) => {
    const health = await options.deep().catch((): null => null);
    if (health === null) return c.json({ ok: false }, 503);
    return c.json(health, health.ok ? 200 : 503);
  });
  if (options.routes) app.route("/", options.routes);
  // The API under /api; the built client (the same handler `apps/web` serves) for every other path.
  const client = clientAssets(options.clientDir);
  app.all("*", (c) => (c.req.path === "/api" || c.req.path.startsWith("/api/") ? options.api.fetch(c.req.raw) : client(c.req.raw)));
  return app;
}
