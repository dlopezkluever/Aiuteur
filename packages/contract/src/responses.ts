import { z } from "zod";
import { generationReadSchema, treatmentPreviewSchema, draftTreatmentResultSchema } from "./generation.ts";
import { chooseOutcomeSchema, commitOutcomeSchema, sourceMaterialReadSchema, sourceMaterialRevisionSchema, treatmentOptionReadSchema } from "./history.ts";
import {
  invitationSchema, projectListSchema, projectSchema, recoveryCompletedSchema, recoveryRequestedSchema, redeemedInvitationSchema, ROUTES, studioSchema,
} from "./studio.ts";

type Route = (typeof ROUTES)[number];
/** The routes whose bodies this contract owns; `auth` routes are Better Auth's and are forwarded as they are. */
type OwnedRoute = Exclude<Route, { access: "auth" }>;
export type RouteKey = OwnedRoute extends infer R ? (R extends { method: infer M extends string; path: infer P extends string } ? `${M} ${P}` : never) : never;

/**
 * The success answer of every route the contract owns (FC2). The server answers with these schemas, the client parses with
 * them, and the generated mock server (VC6) is derived from them, so the three cannot disagree. A route added to `ROUTES`
 * without an entry here does not compile.
 */
export const ROUTE_RESPONSES = {
  "POST /api/invitations/redeem": { status: 201, schema: redeemedInvitationSchema },
  "POST /api/recovery/request": { status: 202, schema: recoveryRequestedSchema },
  "POST /api/recovery/complete": { status: 200, schema: recoveryCompletedSchema },
  "POST /api/operator/invitations": { status: 201, schema: invitationSchema },
  "GET /api/studios/:accountId": { status: 200, schema: studioSchema },
  "GET /api/studios/:accountId/projects": { status: 200, schema: projectListSchema },
  "POST /api/studios/:accountId/projects": { status: 201, schema: projectSchema },
  "POST /api/studios/:accountId/projects/:projectId/source-material": { status: 201, schema: commitOutcomeSchema },
  "GET /api/studios/:accountId/projects/:projectId/source-material/:objectId": { status: 200, schema: sourceMaterialReadSchema },
  "GET /api/studios/:accountId/projects/:projectId/source-material/:objectId/revisions/:sequence": { status: 200, schema: sourceMaterialRevisionSchema },
  "POST /api/studios/:accountId/projects/:projectId/source-material/:objectId/role": { status: 200, schema: commitOutcomeSchema },
  "GET /api/studios/:accountId/projects/:projectId/source-material/:objectId/treatment-preview": { status: 200, schema: treatmentPreviewSchema },
  "POST /api/studios/:accountId/projects/:projectId/source-material/:objectId/treatment-drafts": { status: 201, schema: draftTreatmentResultSchema },
  "GET /api/studios/:accountId/projects/:projectId/generations/:generationId": { status: 200, schema: generationReadSchema },
  "GET /api/studios/:accountId/projects/:projectId/treatment-options/:objectId": { status: 200, schema: treatmentOptionReadSchema },
  "POST /api/studios/:accountId/projects/:projectId/treatment-options/:objectId/choose": { status: 201, schema: chooseOutcomeSchema },
} as const satisfies Record<RouteKey, { readonly status: number; readonly schema: z.ZodType }>;

/** The JSON Schema of a route's success body, derived from the response schema (the mock server's only input). */
export function responseJsonSchema(key: RouteKey): Record<string, unknown> {
  return z.toJSONSchema(ROUTE_RESPONSES[key].schema, { io: "output", unrepresentable: "any" }) as Record<string, unknown>;
}
