import { Hono } from "hono";
import { AccountRefusal, type Accounts } from "@aiuteur/accounts";
import { accountIdSchema, changeRoleSchema, commitOutcomeSchema, idempotencyKeySchema, errorSchema, objectIdSchema, pasteSchema, projectIdSchema, projectSchema, type CommitOutcome, issueInvitationSchema, recoveryCompleteSchema, recoveryCompletedSchema, recoveryRequestSchema, recoveryRequestedSchema, redeemInvitationSchema, redeemedInvitationSchema, ROUTES } from "@aiuteur/contract";
import type { Views } from "@aiuteur/views";
import { IdempotencyKeyReused, type Workflows } from "@aiuteur/workflows";

type Context = import("hono").Context;
const respond = (c: Context, result: object | null) => result ? c.json(result) : c.json(errorSchema.parse({ code: "not-found" }), 404);
/** One of the five write-gate results as an HTTP answer. Anything but Applied changed no Revision. */
function outcome(c: Context, result: CommitOutcome) {
  if (result.result === "Applied") return c.json(commitOutcomeSchema.parse(result), result.appended ? 201 : 200);
  // An unknown project or object answers exactly as every other absent id does (G1).
  if (result.result === "Refused") return result.reason === "not-found" ? c.json(errorSchema.parse({ code: "not-found" }), 404) : c.json(commitOutcomeSchema.parse(result), 422);
  return c.json(commitOutcomeSchema.parse(result), 409);
}

export function createApi(options: { accounts: Accounts; views: Views; workflows: Workflows; handleAuth(request: Request): Promise<Response>; origin: string;
  /** The caller's network address as the deployment's trusted edge reports it; never read from client-controlled headers here. */
  clientAddress(request: Request): string }) {
  const api = new Hono();
  api.notFound((c) => c.json(errorSchema.parse({ code: "not-found" }), 404));
  api.onError((error, c) => {
    if (error instanceof IdempotencyKeyReused) return c.json(errorSchema.parse({ code: "idempotency-key-reused" }), 422);
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
        // The API contract is JSON. Sign-in is forwarded only when its email was read and counted,
        // so no other encoding Better Auth might parse can skip the per-email limit.
        const json = c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase() === "application/json";
        const body: unknown = json ? await c.req.raw.clone().json().catch(() => null) : null;
        const email = body && typeof body === "object" && "email" in body && typeof body.email === "string" ? body.email : null;
        if (email === null) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
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
    // Every scoped path answers the same 404 for another Account's ids and for absent ones.
    const notFound = () => c.json(errorSchema.parse({ code: "not-found" }), 404);
    const id = accountIdSchema.safeParse(c.req.param("accountId"));
    if (!id.success || id.data !== scope.accountId) return notFound();
    const project = projectIdSchema.safeParse(c.req.param("projectId") ?? "");
    const object = objectIdSchema.safeParse(c.req.param("objectId") ?? "");
    const sequence = Number(c.req.param("sequence"));
    const key = `${route.method} ${route.path}`;
    if (key === "GET /api/studios/:accountId") return respond(c, await options.views.studio(scope, id.data));
    if (key === "GET /api/studios/:accountId/projects") return respond(c, await options.views.projects(scope, id.data));
    if (key === "POST /api/studios/:accountId/projects") return c.json(projectSchema.parse(await options.workflows.createProject(scope)), 201);
    if (!project.success) return notFound();
    if (key === "POST /api/studios/:accountId/projects/:projectId/source-material") {
      const parsed = pasteSchema.safeParse(body);
      const idem = idempotencyKeySchema.safeParse(c.req.header("idempotency-key"));
      if (!parsed.success || !idem.success) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
      return outcome(c, await options.workflows.paste(scope, project.data, idem.data, parsed.data.text));
    }
    if (!object.success) return notFound();
    if (key === "GET /api/studios/:accountId/projects/:projectId/source-material/:objectId") return respond(c, await options.views.sourceMaterial(scope, project.data, object.data));
    if (key === "GET /api/studios/:accountId/projects/:projectId/source-material/:objectId/revisions/:sequence") {
      return Number.isInteger(sequence) && sequence >= 1 ? respond(c, await options.views.sourceMaterialRevision(scope, project.data, object.data, sequence)) : notFound();
    }
    const parsed = changeRoleSchema.safeParse(body);
    const idem = idempotencyKeySchema.safeParse(c.req.header("idempotency-key"));
    if (!parsed.success || !idem.success) return c.json(errorSchema.parse({ code: "invalid-request" }), 400);
    return outcome(c, await options.workflows.changeRole(scope, project.data, object.data, idem.data, parsed.data.base, parsed.data.role));
  });
  return api;
}
