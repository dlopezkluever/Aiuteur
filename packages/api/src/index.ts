import { Hono } from "hono";
import { AccountRefusal, type Accounts } from "@aiuteur/accounts";
import { accountIdSchema, errorSchema, issueInvitationSchema, redeemInvitationSchema, redeemedInvitationSchema, ROUTES, type ErrorCode } from "@aiuteur/contract";
import type { Views } from "@aiuteur/views";

function refusalStatus(code: ErrorCode): 400 | 401 | 403 | 429 {
  if (code === "unauthenticated") return 401;
  if (code === "rate-limited") return 429;
  return code === "invalid-request" ? 400 : 403;
}

/** `clientAddress` is supplied by the composition root (the address the network reports), used only for abuse limits. */
export function createApi(options: { accounts: Accounts; views: Views; handleAuth(request: Request): Promise<Response>; origin: string; clientAddress(request: Request): string }) {
  const api = new Hono();
  api.notFound((c) => c.json(errorSchema.parse({ code: "not-found" }), 404));
  api.onError((error, c) => {
    if (error instanceof AccountRefusal) return c.json(errorSchema.parse({ code: error.code }), refusalStatus(error.code));
    return c.json(errorSchema.parse({ code: "internal-error" }), 500);
  });
  for (const route of ROUTES) api.on(route.method, route.path, async (c) => {
    if (route.method === "POST" && (c.req.header("origin") !== options.origin || c.req.header("x-aiuteur-command") !== "1")) {
      return c.json(errorSchema.parse({ code: "forbidden" }), 403);
    }
    if (route.access === "auth") {
      // Better Auth reads the original stream, so admission parses a clone.
      const authBody: unknown = await c.req.raw.clone().json().catch(() => null);
      await options.accounts.admitAuthRequest(route.path, authBody, options.clientAddress(c.req.raw));
      return options.handleAuth(c.req.raw);
    }
    const body: unknown = route.method === "POST" ? await c.req.json().catch(() => null) : null;
    if (route.access === "invitation") {
      const parsed = redeemInvitationSchema.safeParse(body);
      if (!parsed.success) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
      const scope = await options.accounts.redeemInvitation(parsed.data);
      return c.json(redeemedInvitationSchema.parse({ accountId: scope.accountId }), 201);
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
