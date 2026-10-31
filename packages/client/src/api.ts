import { ROUTE_RESPONSES, commitOutcomeSchema, errorSchema, type RouteKey, type CommitOutcome } from "@aiuteur/contract";

/** The client reaches the server only here, and parses every answer with the schema `contract` declares for it (FC2). */
export type Answer<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly status: number; readonly code: string };

const COMMAND = { "content-type": "application/json", "x-aiuteur-command": "1" };

async function failure(response: Response): Promise<Answer<never>> {
  const body = errorSchema.safeParse(await response.json().catch(() => null));
  return { ok: false, status: response.status, code: body.success ? body.data.code : "unknown" };
}

/** Fills a route template's `:name` parts. */
const fill = (path: string, params: Record<string, string>) => path.replace(/:([A-Za-z]+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ""));

export async function call<K extends RouteKey>(key: K, params: Record<string, string> = {}, init: { body?: unknown; idempotencyKey?: string } = {}): Promise<Answer<(typeof ROUTE_RESPONSES)[K]["schema"]["_output"]>> {
  const [method, template] = key.split(" ") as [string, string];
  const response = await fetch(fill(template, params), {
    method,
    credentials: "same-origin",
    ...(method === "POST" ? { headers: { ...COMMAND, ...(init.idempotencyKey ? { "idempotency-key": init.idempotencyKey } : {}) }, body: JSON.stringify(init.body ?? {}) } : {}),
  });
  if (response.status !== ROUTE_RESPONSES[key].status) return failure(response);
  const parsed = ROUTE_RESPONSES[key].schema.safeParse(await response.json());
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, status: response.status, code: "unreadable" };
}

/** A write through the gate answers one of five results; every result but a transport failure is a body to read. */
export async function write(key: Extract<RouteKey, `POST ${string}source-material${string}`>, params: Record<string, string>, body: unknown, idempotencyKey: string): Promise<Answer<CommitOutcome>> {
  const [, template] = key.split(" ") as [string, string];
  const response = await fetch(fill(template, params), { method: "POST", credentials: "same-origin", headers: { ...COMMAND, "idempotency-key": idempotencyKey }, body: JSON.stringify(body) });
  const parsed = commitOutcomeSchema.safeParse(await response.clone().json().catch(() => null));
  return parsed.success ? { ok: true, value: parsed.data } : failure(response);
}

/**
 * A command whose every gate result is a body to read (Applied, StaleBase, Refused…), whatever its status. A transport
 * failure or an error body is a failure; the body is parsed with the route's own response schema.
 */
export async function command<K extends RouteKey>(key: K, params: Record<string, string>, body: unknown, idempotencyKey: string): Promise<Answer<(typeof ROUTE_RESPONSES)[K]["schema"]["_output"]>> {
  const [, template] = key.split(" ") as [string, string];
  const response = await fetch(fill(template, params), { method: "POST", credentials: "same-origin", headers: { ...COMMAND, "idempotency-key": idempotencyKey }, body: JSON.stringify(body) });
  const parsed = ROUTE_RESPONSES[key].schema.safeParse(await response.clone().json().catch(() => null));
  return parsed.success ? { ok: true, value: parsed.data } : failure(response);
}

/** Better Auth's own routes are forwarded as they are (not contract-owned bodies). */
export async function authPost(path: "/api/auth/sign-in/email" | "/api/auth/sign-out", body: unknown): Promise<{ ok: boolean; status: number }> {
  const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: COMMAND, body: JSON.stringify(body) });
  return { ok: response.ok, status: response.status };
}
