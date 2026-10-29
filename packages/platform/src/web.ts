import { Hono } from "hono";

/** `GET /healthz/deep` answers counts and booleans only, never content (OPERATIONAL-BASELINE §7.2). */
export interface DeepHealth {
  readonly ok: boolean;
  readonly environment: string;
  readonly release: string;
  readonly database: "ok" | "unreachable";
  readonly fakeOfferings: number;
}

/** The web process: the two health routes beside the contract API. Everything else is the API's. */
export function createWebApp(options: { api: Hono; deep(): Promise<DeepHealth> }): Hono {
  const app = new Hono();
  // Liveness: the process answers. It touches nothing, so a database outage does not restart a healthy process.
  app.get("/healthz", (c) => c.json({ ok: true }));
  app.get("/healthz/deep", async (c) => {
    const health = await options.deep().catch((): null => null);
    if (health === null) return c.json({ ok: false }, 503);
    return c.json(health, health.ok ? 200 : 503);
  });
  app.route("/", options.api);
  return app;
}
