import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type Server } from "node:http";
import { BlobKeyRefused, deletableKey, ownsKey, type BlobHead, type BlobStore, type Clock, type Scope, type SignRequest } from "@aiuteur/store";

/**
 * The in-memory BlobStore (OPERATIONAL-BASELINE §6: `local` and `ci`), held to the same conformance suite as the R2
 * adapter. Signed URLs are real HTTP: a loopback server answers GET and PUT for a URL whose HMAC covers the method, the
 * key, the expiry and the response headers, so a browser can upload and view exactly as it would against the bucket.
 */
export class FakeBlobStore implements BlobStore {
  readonly #objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  readonly #secret = randomBytes(32);
  readonly #clock: Clock;
  readonly #server: Server;
  readonly origin: string;

  private constructor(clock: Clock, server: Server, origin: string) {
    this.#clock = clock;
    this.#server = server;
    this.origin = origin;
  }

  static async start(options: { clock: Clock }): Promise<FakeBlobStore> {
    let store: FakeBlobStore | undefined;
    const server = createServer((request, response) => { void store!.#serve(request, response); });
    await new Promise<void>((resolve) => server.listen(0, "localhost", resolve));
    store = new FakeBlobStore(options.clock, server, `http://localhost:${(server.address() as { port: number }).port}`);
    return store;
  }

  close(): Promise<void> {
    return new Promise((resolve) => { this.#server.close(() => resolve()); this.#server.closeAllConnections(); });
  }

  #guard(scope: Scope, operation: string, ...keys: string[]) {
    for (const key of keys) if (!ownsKey(scope, key)) throw new BlobKeyRefused(operation);
  }
  async put(scope: Scope, key: string, bytes: Uint8Array, contentType: string) {
    this.#guard(scope, "put", key);
    this.#objects.set(key, { bytes: new Uint8Array(bytes), contentType });
  }
  async head(scope: Scope, key: string): Promise<BlobHead | null> {
    this.#guard(scope, "head", key);
    const found = this.#objects.get(key);
    return found ? { size: found.bytes.byteLength, contentType: found.contentType } : null;
  }
  async get(scope: Scope, key: string) {
    this.#guard(scope, "get", key);
    const found = this.#objects.get(key);
    return found ? new Uint8Array(found.bytes) : null;
  }
  async copy(scope: Scope, from: string, to: string) {
    this.#guard(scope, "copy", from, to);
    const found = this.#objects.get(from);
    if (!found) throw new Error("blob copy failed with status 404");
    this.#objects.set(to, { bytes: new Uint8Array(found.bytes), contentType: found.contentType });
  }
  async delete(scope: Scope, key: string) {
    this.#guard(scope, "delete", key);
    if (!deletableKey(key)) throw new BlobKeyRefused("delete");
    this.#objects.delete(key);
  }
  async sign(scope: Scope, key: string, request: SignRequest) {
    this.#guard(scope, "sign", key);
    const url = new URL(`${this.origin}/${key}`);
    url.searchParams.set("method", request.method);
    url.searchParams.set("expires", String(this.#clock.now() + request.expiresInSeconds * 1000));
    if (request.response) {
      url.searchParams.set("ct", request.response.contentType);
      url.searchParams.set("cc", request.response.cacheControl);
      if (request.response.disposition) url.searchParams.set("cd", request.response.disposition);
    }
    url.searchParams.set("sig", this.#signature(key, url.searchParams));
    return url.href;
  }
  #signature(key: string, params: URLSearchParams) {
    const signed = ["method", "expires", "ct", "cc", "cd"].map((name) => `${name}=${params.get(name) ?? ""}`).join("&");
    return createHmac("sha256", this.#secret).update(`${key}\n${signed}`).digest("hex");
  }

  async #serve(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, HEAD, PUT", "access-control-allow-headers": "content-type", "access-control-max-age": "600" };
    if (request.method === "OPTIONS") { response.writeHead(204, cors).end(); return; }
    const url = new URL(request.url ?? "/", this.origin);
    const key = decodeURIComponent(url.pathname.slice(1));
    const given = Buffer.from(url.searchParams.get("sig") ?? "", "hex");
    const expected = Buffer.from(this.#signature(key, url.searchParams), "hex");
    const method = request.method === "HEAD" ? "GET" : request.method;
    const valid = given.length === expected.length && timingSafeEqual(given, expected) && url.searchParams.get("method") === method && Number(url.searchParams.get("expires")) > this.#clock.now();
    if (!valid) { response.writeHead(403, cors).end("AccessDenied"); return; }
    if (method === "PUT") {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk as Buffer);
      this.#objects.set(key, { bytes: new Uint8Array(Buffer.concat(chunks)), contentType: String(request.headers["content-type"] ?? "application/octet-stream") });
      response.writeHead(200, cors).end();
      return;
    }
    const found = this.#objects.get(key);
    if (!found) { response.writeHead(404, cors).end("NoSuchKey"); return; }
    const headers: Record<string, string> = { ...cors, "content-type": url.searchParams.get("ct") || found.contentType, "content-length": String(found.bytes.byteLength) };
    if (url.searchParams.get("cc")) headers["cache-control"] = url.searchParams.get("cc")!;
    if (url.searchParams.get("cd")) headers["content-disposition"] = url.searchParams.get("cd")!;
    response.writeHead(200, headers).end(request.method === "HEAD" ? undefined : Buffer.from(found.bytes));
  }
}
