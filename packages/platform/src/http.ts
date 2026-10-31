import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

const NO_BODY = new Set(["GET", "HEAD"]);

/** Serves a fetch handler on node:http. The socket address is kept beside the Request, never in a client-controlled header. */
export async function serve(options: { fetch(request: Request): Response | Promise<Response>; port: number; host?: string; onError(error: unknown): void }): Promise<{ server: Server; port: number; socketAddress(request: Request): string; close(): Promise<void> }> {
  const addresses = new WeakMap<Request, string>();
  const server = createServer(async (incoming: IncomingMessage, outgoing) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(chunk as Buffer);
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) for (const each of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, each);
      const method = incoming.method ?? "GET";
      const request = new Request(`http://${incoming.headers.host ?? "localhost"}${incoming.url ?? "/"}`, { method, headers, ...(NO_BODY.has(method) ? {} : { body: Buffer.concat(chunks) }) });
      addresses.set(request, incoming.socket.remoteAddress ?? "unknown");
      const response = await options.fetch(request);
      const setCookies = response.headers.getSetCookie();
      const plain: Record<string, string | string[]> = {};
      response.headers.forEach((value, name) => { if (name !== "set-cookie") plain[name] = value; });
      if (setCookies.length > 0) plain["set-cookie"] = setCookies;
      outgoing.writeHead(response.status, plain);
      if (response.body && response.headers.get("content-type")?.startsWith("text/event-stream")) {
        // A progress stream is written as it is produced and ends when the client goes away.
        const reader = response.body.getReader();
        outgoing.on("close", () => { void reader.cancel().catch(() => undefined); });
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!outgoing.write(value)) await new Promise<void>((resolve) => outgoing.once("drain", resolve));
        }
        outgoing.end();
      } else outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      options.onError(error);
      if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "application/json" });
      outgoing.end('{"code":"internal-error"}');
    }
  });
  await new Promise<void>((resolve) => server.listen(options.port, options.host ?? "0.0.0.0", resolve));
  return {
    server, port: (server.address() as AddressInfo).port,
    socketAddress: (request) => addresses.get(request) ?? "unknown",
    close: () => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }),
  };
}
