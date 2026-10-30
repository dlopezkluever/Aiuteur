import { Hono } from "hono";
import type { Accounts } from "@aiuteur/accounts";
import { accountIdSchema } from "@aiuteur/contract";
import type { Store } from "@aiuteur/store";

const encoder = new TextEncoder();
const frame = (text: string) => encoder.encode(text);

/**
 * The progress channel (RUNTIME-PLATFORM §6): server-sent events from `web`, replayed from the scoped Account's outbox by
 * `Last-Event-ID` and then tailed. Each frame is `id: <sequence>`, `event: <type>` and the envelope as `data`; the envelope
 * holds ids and statuses only (RT4). Only this Account's events are readable, because the read runs under the session's Scope.
 */
export function createEventStream(options: { accounts: Accounts; store: Store; pollMs: number; keepAliveMs: number }): Hono {
  const app = new Hono();
  const refuse = (c: import("hono").Context, code: "unauthenticated" | "not-found" | "invalid-request", status: 401 | 404 | 400) => c.json({ code }, status);
  app.get("/api/studios/:accountId/events", async (c) => {
    const subject = await options.accounts.authenticate(c.req.raw.headers);
    if (!subject) return refuse(c, "unauthenticated", 401);
    const scope = await options.accounts.resolveScope(subject);
    const requested = accountIdSchema.safeParse(c.req.param("accountId"));
    if (!scope || !requested.success || requested.data !== scope.accountId) return refuse(c, "not-found", 404);
    const last = c.req.header("last-event-id");
    let after = 0;
    if (last !== undefined) {
      if (!/^\d{1,15}$/.test(last)) return refuse(c, "invalid-request", 400);
      after = Number(last);
    }
    let closed = false;
    let lastWrite = Date.now();
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(frame(`retry: ${options.pollMs}\n\n`)); },
      async pull(controller) {
        while (!closed) {
          const events = await options.store.read(scope, (tx) => tx.events(after));
          if (events.length > 0) {
            for (const event of events) controller.enqueue(frame(`id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
            after = events[events.length - 1]!.sequence;
            lastWrite = Date.now();
            return;
          }
          if (Date.now() - lastWrite >= options.keepAliveMs) { controller.enqueue(frame(": keep-alive\n\n")); lastWrite = Date.now(); return; }
          await new Promise((resolve) => setTimeout(resolve, options.pollMs));
        }
      },
      cancel() { closed = true; },
    });
    return new Response(body, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" } });
  });
  return app;
}
