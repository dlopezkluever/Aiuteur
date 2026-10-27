import { Hono } from "hono";
import { AccountRefusal, type Accounts } from "@aiuteur/accounts";
import { accountIdSchema, errorSchema, issueInvitationSchema, recoveryCompleteSchema, recoveryCompletedSchema, recoveryRequestSchema, recoveryRequestedSchema, redeemInvitationSchema, redeemedInvitationSchema, ROUTES } from "@aiuteur/contract";
import type { Views } from "@aiuteur/views";

export function createApi(options: { accounts: Accounts; views: Views; handleAuth(request: Request): Promise<Response>; origin: string;
  /** The caller's network address as the deployment's trusted edge reports it; never read from client-controlled headers here. */
  clientAddress(request: Request): string }) {
  const api = new Hono();
  api.notFound((c) => c.json(errorSchema.parse({ code: "not-found" }), 404));
  api.onError((error, c) => {
    if (error instanceof AccountRefusal) {
      if (error.code === "rate-limited") return c.json(errorSchema.parse({ code: error.code }), 429, { "retry-after": String(error.retryAfterSeconds ?? 1) });
      return c.json(errorSchema.parse({ code: error.code }), error.code === "unauthenticated" ? 401 : 403);
    }
    return c.json(errorSchema.parse({ code: "internal-error" }), 500);
  });
  for (const route of ROUTES) api.on(route.method, route.path, async (c) => {
    if (route.method === "POST" && (c.req.header("origin") !== options.origin || c.req.header("x-aiuteur-command") !== "1")) {
      return c.json(errorSchema.parse({ code: "forbidden" }), 403);
    }
    const address = options.clientAddress(c.req.raw);
    if (route.access === "auth") {
      if (route.path === "/api/auth/sign-in/email") {
        const body: unknown = await c.req.raw.clone().json().catch(() => null);
        const email = body && typeof body === "object" && "email" in body && typeof body.email === "string" ? body.email : null;
        await options.accounts.attempt("signIn", address, email);
      }
      return options.handleAuth(c.req.raw);
    }
    const body: unknown = route.method === "POST" ? await c.req.json().catch(() => null) : null;
    if (route.access === "invitation") {
      const parsed = redeemInvitationSchema.safeParse(body);
      if (!parsed.success) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
      await options.accounts.attempt("redemption", address, parsed.data.email);
      const scope = await options.accounts.redeemInvitation(parsed.data);
      return c.json(redeemedInvitationSchema.parse({ accountId: scope.accountId }), 201);
    }
    if (route.access === "recovery") {
      if (route.path === "/api/recovery/request") {
        const parsed = recoveryRequestSchema.safeParse(body);
        if (!parsed.success) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
        await options.accounts.attempt("recovery", address, parsed.data.email);
        await options.accounts.requestRecovery(parsed.data.email);
        return c.json(recoveryRequestedSchema.parse({ status: "accepted" }), 202);
      }
      const parsed = recoveryCompleteSchema.safeParse(body);
      if (!parsed.success) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
      await options.accounts.attempt("recovery", address, null);
      await options.accounts.completeRecovery(parsed.data);
      return c.json(recoveryCompletedSchema.parse({ status: "recovered" }), 200);
    }
    const subject = await options.accounts.authenticate(c.req.raw.headers);
    if (!subject) throw new AccountRefusal("unauthenticated");
    const scope = await options.accounts.resolveScope(subject);
    if (!scope) throw new AccountRefusal("unauthenticated");
    if (route.access === "operator") {
      const parsed = issueInvitationSchema.safeParse(body);
      if (!parsed.success) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
      return c.json(await options.accounts.issueInvitation(subject, parsed.data.email), 201);
    }
    const id = accountIdSchema.safeParse(c.req.param("accountId"));
    if (!id.success) return c.json(errorSchema.parse({ code: "not-found" }), 404);
    const read = {
      "/api/studios/:accountId": options.views.studio,
      "/api/studios/:accountId/projects": options.views.projects,
    }[route.path];
    const result = await read(scope, id.data);
    return result ? c.json(result) : c.json(errorSchema.parse({ code: "not-found" }), 404);
  });
  return api;
}
