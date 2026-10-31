import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { serve } from "@hono/node-server";

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json" };

/**
 * The built client as a request handler: a file of the build, or the entry page for any other path, so a reload of any
 * screen address reaches the same screen. GET and HEAD only.
 */
export function clientAssets(staticDir: string): (request: Request) => Promise<Response> {
  const root = normalize(staticDir);
  async function asset(pathname: string): Promise<Response> {
    const file = normalize(join(root, pathname));
    const candidate = file.startsWith(root + sep) && extname(file) !== "" ? file : join(root, "index.html");
    const body = await readFile(candidate).catch(() => null);
    if (body === null) return candidate === join(root, "index.html") ? new Response("not built", { status: 503 }) : asset("/");
    return new Response(new Uint8Array(body), { headers: { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream", "cache-control": "no-cache" } });
  }
  return async (request) => (request.method === "GET" || request.method === "HEAD" ? asset(decodeURIComponent(new URL(request.url).pathname)) : new Response(null, { status: 405 }));
}

/**
 * The `web` process role's HTTP face: the API under `/api`, and the built client for every other path. Unknown
 * non-API paths answer the client's entry page, so a reload of any screen address reaches the same screen.
 */
export function serveWeb(options: { api(request: Request): Response | Promise<Response>; staticDir: string; port: number }): Promise<{ server: Server; close(): Promise<void> }> {
  const assets = clientAssets(options.staticDir);
  return new Promise((resolve) => {
    const http = serve({
      port: options.port,
      hostname: "localhost",
      fetch: (request) => {
        const { pathname } = new URL(request.url);
        return pathname === "/api" || pathname.startsWith("/api/") ? options.api(request) : assets(request);
      },
    }, () => resolve({ server: http, close: () => new Promise((done) => { http.close(() => done()); http.closeAllConnections(); }) })) as Server;
  });
}
