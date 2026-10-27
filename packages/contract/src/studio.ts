import { z } from "zod";

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
// No Project kind or creation operation exists at T0-01.
export const projectListSchema = z.strictObject({ projects: z.array(z.never()) });

export const ERROR_CODES = ["not-found", "unauthenticated", "forbidden", "invalid-request", "invitation-refused", "internal-error"] as const;
export const errorSchema = z.strictObject({ code: z.enum(ERROR_CODES) });
export type ErrorCode = z.infer<typeof errorSchema>["code"];
export const EVENT_TYPES = ["account.created"] as const;
export const eventSchema = z.strictObject({
  accountId: accountIdSchema,
  sequence: z.int().positive(),
  type: z.enum(EVENT_TYPES),
  occurredAt: z.iso.datetime(),
});
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

export const AUDIT_ACTIONS = ["invitation.issued"] as const;

// FC2 route authority. The API and G1/G2 both consume this inventory; there is
// no wildcard forwarding to Better Auth (especially no signup endpoint).
export const ROUTES = [
  { method: "POST", path: "/api/invitations/redeem", access: "invitation" },
  { method: "POST", path: "/api/operator/invitations", access: "operator" },
  { method: "GET", path: "/api/studios/:accountId", access: "scope" },
  { method: "GET", path: "/api/studios/:accountId/projects", access: "scope" },
  { method: "POST", path: "/api/auth/sign-in/email", access: "auth" },
  { method: "POST", path: "/api/auth/sign-out", access: "auth" },
  { method: "POST", path: "/api/auth/two-factor/enable", access: "auth" },
  { method: "POST", path: "/api/auth/two-factor/verify-totp", access: "auth" },
] as const;
