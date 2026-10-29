import { z } from "zod";
import { GENERATION_OUTCOMES, JOB_STATES } from "./generation.ts";

// Only the server mints these ids, using injected UUID v4 generation. An id
// parsed from a request is still resolved under the authenticated Scope.
export const accountIdSchema = z.uuidv4().brand<"AccountId">();
export const creatorIdSchema = z.uuidv4().brand<"CreatorId">();
export type AccountId = z.infer<typeof accountIdSchema>;
export type CreatorId = z.infer<typeof creatorIdSchema>;
export const emailSchema = z.email().transform((value) => value.toLowerCase());
export const settingsSchema = z.strictObject({ treatmentOptionCount: z.int().min(1).max(10) });
export type Settings = z.infer<typeof settingsSchema>;
export const DEFAULT_SETTINGS: Settings = { treatmentOptionCount: 3 };
export const accountSchema = z.strictObject({ accountId: accountIdSchema, createdAt: z.iso.datetime() });
export type Account = z.infer<typeof accountSchema>;
export const studioSchema = z.strictObject({ account: accountSchema, settings: settingsSchema });
// Project and history ids are 128-bit and time-ordered (PERSISTENCE-AND-MEDIA §3), minted by `Ids.ordered`.
export const projectIdSchema = z.uuidv7().brand<"ProjectId">();
export const objectIdSchema = z.uuidv7().brand<"ObjectId">();
// An action group ties the appends of one creator action together (LINEAGE §1 class 1); `workflows` mints one per command.
export const actionGroupIdSchema = z.uuidv7().brand<"ActionGroupId">();
export type ActionGroupId = z.infer<typeof actionGroupIdSchema>;
// The id of the Generation that made AI content (VERIFICATION §2.1: the root of the trace). The Generation record is #102's;
// until it exists the gate keeps this reference opaque and cannot check that the Generation exists.
export const generationIdSchema = z.uuidv7().brand<"GenerationId">();
export type GenerationId = z.infer<typeof generationIdSchema>;
export type ProjectId = z.infer<typeof projectIdSchema>;
export type ObjectId = z.infer<typeof objectIdSchema>;
export const projectSchema = z.strictObject({ projectId: projectIdSchema, createdAt: z.iso.datetime() });
export type Project = z.infer<typeof projectSchema>;
export const projectListSchema = z.strictObject({ projects: z.array(projectSchema) });

export const ERROR_CODES = ["not-found", "unauthenticated", "forbidden", "invalid-request", "invitation-refused", "recovery-refused", "idempotency-key-reused", "rate-limited", "internal-error"] as const;
export const errorSchema = z.strictObject({ code: z.enum(ERROR_CODES) });
export type ErrorCode = z.infer<typeof errorSchema>["code"];
export const EVENT_TYPES = ["account.created", "job.state_changed", "generation.settled"] as const;
const eventBase = { accountId: accountIdSchema, sequence: z.int().positive(), occurredAt: z.iso.datetime() };
/** The outbox event envelope (RUNTIME-PLATFORM §6): per-Account sequence, type, ids and statuses only (RT4). */
export const eventSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...eventBase, type: z.literal("account.created") }),
  z.strictObject({ ...eventBase, type: z.literal("job.state_changed"), jobId: z.uuidv7(), generationId: generationIdSchema, state: z.enum(JOB_STATES) }),
  z.strictObject({ ...eventBase, type: z.literal("generation.settled"), generationId: generationIdSchema, outcome: z.enum(GENERATION_OUTCOMES) }),
]);
export type StudioEvent = z.infer<typeof eventSchema>;

export const issueInvitationSchema = z.strictObject({ email: emailSchema });
export const invitationSchema = z.strictObject({ token: z.string().min(32), expiresAt: z.iso.datetime() });
export const redeemedInvitationSchema = z.strictObject({ accountId: accountIdSchema });
export const redeemInvitationSchema = z.strictObject({
  token: z.string().min(32).max(256),
  email: emailSchema,
  name: z.string().min(1).max(200),
  password: z.string().min(12).max(128),
});
export type RedeemInvitation = z.infer<typeof redeemInvitationSchema>;

// T0-02. A request always answers the same body, whether or not the email has an Account.
export const recoveryRequestSchema = z.strictObject({ email: emailSchema });
export const recoveryRequestedSchema = z.strictObject({ status: z.literal("accepted") });
export const recoveryCompleteSchema = z.strictObject({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
});
export type RecoveryComplete = z.infer<typeof recoveryCompleteSchema>;
export const recoveryCompletedSchema = z.strictObject({ status: z.literal("recovered") });

export const AUDIT_ACTIONS = ["invitation.issued"] as const;

// FC2 route authority. The API and G1/G2 both consume this inventory; there is
// no wildcard forwarding to Better Auth (especially no signup endpoint).
export const ROUTES = [
  { method: "POST", path: "/api/invitations/redeem", access: "invitation" },
  { method: "POST", path: "/api/recovery/request", access: "recovery" },
  { method: "POST", path: "/api/recovery/complete", access: "recovery" },
  { method: "POST", path: "/api/operator/invitations", access: "operator" },
  { method: "GET", path: "/api/studios/:accountId", access: "scope" },
  { method: "GET", path: "/api/studios/:accountId/projects", access: "scope" },
  { method: "POST", path: "/api/studios/:accountId/projects", access: "scope" },
  { method: "POST", path: "/api/studios/:accountId/projects/:projectId/source-material", access: "scope" },
  { method: "GET", path: "/api/studios/:accountId/projects/:projectId/source-material/:objectId", access: "scope" },
  { method: "GET", path: "/api/studios/:accountId/projects/:projectId/source-material/:objectId/revisions/:sequence", access: "scope" },
  { method: "POST", path: "/api/studios/:accountId/projects/:projectId/source-material/:objectId/role", access: "scope" },
  { method: "GET", path: "/api/studios/:accountId/projects/:projectId/source-material/:objectId/treatment-preview", access: "scope" },
  { method: "POST", path: "/api/studios/:accountId/projects/:projectId/source-material/:objectId/treatment-drafts", access: "scope" },
  { method: "GET", path: "/api/studios/:accountId/projects/:projectId/generations/:generationId", access: "scope" },
  { method: "GET", path: "/api/studios/:accountId/projects/:projectId/treatment-options/:objectId", access: "scope" },
  { method: "POST", path: "/api/studios/:accountId/projects/:projectId/treatment-options/:objectId/choose", access: "scope" },
  { method: "POST", path: "/api/auth/sign-in/email", access: "auth" },
  { method: "POST", path: "/api/auth/sign-out", access: "auth" },
  { method: "POST", path: "/api/auth/two-factor/enable", access: "auth" },
  { method: "POST", path: "/api/auth/two-factor/verify-totp", access: "auth" },
] as const;
