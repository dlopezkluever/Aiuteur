import { randomUUID } from "node:crypto";
import { scrubError, type ErrorContext, type ErrorSink, type ScrubbedEvent } from "../error-sink.ts";
import type { Deployment } from "../fields.ts";
import type { SecretRegistry } from "../secrets.ts";

export interface HostedErrorSinkOptions extends Deployment {
  /** The tracker's project DSN: `https://<public key>@<host>/<project id>`. A host secret; it never appears in a line or an event. */
  dsn: string;
  secrets: SecretRegistry;
  /** Delivery failures are reported here as a closed code, so the sink never logs by itself. */
  onFailure?(code: "delivery-failed"): void;
  fetch?: typeof fetch;
}

function parseDsn(dsn: string): { endpoint: string; key: string } {
  const url = new URL(dsn);
  const project = url.pathname.replace(/^\/+/, "");
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (!url.username || !/^[0-9A-Za-z_-]+$/.test(project) || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) {
    throw new Error("error sink DSN must be https://<key>@<host>/<project id>");
  }
  return { endpoint: `${url.protocol}//${url.host}/api/${project}/envelope/`, key: url.username };
}

function toEvent(event: ScrubbedEvent, now: number) {
  return {
    event_id: randomUUID().replaceAll("-", ""),
    timestamp: now / 1000,
    platform: "node",
    level: "error",
    release: event.release,
    environment: event.environment,
    // The process role is a tag; `server_name` is left unset so the host name is not sent.
    tags: { role: event.role, ...(event.code === null ? {} : { code: event.code }), ...event.tags },
    exception: { values: [{ type: event.errorClass, stacktrace: { frames: event.frames.map((f) => ({ function: f.function ?? "?", filename: f.file, lineno: f.line, colno: f.column })).reverse() } }] },
    // No user, request, breadcrumbs, contexts or extra: deny by default.
  };
}

/** The hosted tracker behind the `ErrorSink` port. It speaks the tracker's HTTP envelope directly, so no vendor SDK enters the build. */
export function createHostedErrorSink(options: HostedErrorSinkOptions): ErrorSink {
  const { endpoint, key } = parseDsn(options.dsn);
  options.secrets.add(options.dsn);
  options.secrets.add(key);
  const send = options.fetch ?? fetch;
  const pending = new Set<Promise<void>>();
  return {
    capture(error, context?: ErrorContext) {
      try {
        const now = Date.now();
        const event = toEvent(scrubError(error, context, options, options.secrets), now);
        const body = [JSON.stringify({ event_id: event.event_id, sent_at: new Date(now).toISOString() }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
        const delivery: Promise<void> = send(endpoint, {
          method: "POST",
          headers: { "content-type": "application/x-sentry-envelope", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=aiuteur/1` },
          body, signal: AbortSignal.timeout(5_000),
        }).then((response) => { if (!response.ok) throw new Error("rejected"); }).catch(() => options.onFailure?.("delivery-failed")).finally(() => pending.delete(delivery));
        pending.add(delivery);
      } catch { options.onFailure?.("delivery-failed"); }
    },
    async flush(timeoutMs) {
      await Promise.race([Promise.allSettled([...pending]), new Promise((resolve) => setTimeout(resolve, timeoutMs).unref())]);
    },
  };
}
