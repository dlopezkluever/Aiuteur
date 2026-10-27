import { createHash } from "node:crypto";
import { dictionary } from "@zxcvbn-ts/language-common";
import { accountIdSchema, emailRequestSchema, invitationSchema, passwordRecoverySchema, type AccountId, type CreatorId, type ErrorCode, type RedeemInvitation } from "@aiuteur/contract";
import type { Auth, AuthenticatedSubject, Clock, Ids, Scope } from "@aiuteur/store";

export class AccountRefusal extends Error {
  readonly code: Extract<ErrorCode, "invitation-refused" | "forbidden" | "unauthenticated" | "invalid-request" | "rate-limited">;
  constructor(code: AccountRefusal["code"]) { super(code); this.code = code; }
}
/** The auth-schema adapter owns the transaction spanning identity and Account. */
export interface Identity {
  mapSubject(subject: CreatorId): Promise<AccountId | null>;
  issue(input: { tokenHash: string; email: string; issuedBy: CreatorId | null; at: number; expiresAt: number; auditId: string }): Promise<void>;
  redeem(input: RedeemInvitation & { tokenHash: string; accountId: AccountId }): Promise<CreatorId | null>;
  /** Counts one attempt in the bucket's fixed window and returns that window's count, including this attempt. */
  attempt(input: { bucket: string; at: number; windowMs: number }): Promise<number>;
}
export interface AccountsOptions {
  auth: Auth;
  identity: Identity;
  clock: Clock;
  ids: Ids;
  operatorEmails: readonly string[];
  invitationTtlMs: number;
}
const commonPasswords = new Set(dictionary["passwords-common"]);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const SIGN_IN = "/api/auth/sign-in/email";
const RECOVERY_REQUEST = "/api/auth/request-password-reset";
const RECOVERY_RESET = "/api/auth/reset-password";
/** OPERATIONAL-BASELINE §2.3 abuse limits. The numbers are T0-02's choices; each dimension counts every attempt. */
const LIMITS = {
  [SIGN_IN]: { email: { max: 5, windowMs: 15 * 60_000 }, address: { max: 20, windowMs: 15 * 60_000 } },
  [RECOVERY_REQUEST]: { email: { max: 3, windowMs: 60 * 60_000 }, address: { max: 10, windowMs: 60 * 60_000 } },
} as const;

export function createAccounts(options: AccountsOptions) {
  const { auth, identity, clock, ids } = options;
  async function resolveScope(subject: AuthenticatedSubject): Promise<Scope | null> {
    const accountId = await identity.mapSubject(subject.creatorId);
    return accountId ? { accountId, creatorId: subject.creatorId } : null;
  }
  return {
    authenticate: (headers: Headers) => auth.authenticate(headers),
    resolveScope,
    async issueInvitation(subject: AuthenticatedSubject, email: string) {
      if (!options.operatorEmails.includes(subject.email) || !subject.secondFactor) throw new AccountRefusal("forbidden");
      const token = ids.token();
      const at = clock.now();
      const expiresAt = at + options.invitationTtlMs;
      await identity.issue({ tokenHash: digest(token), email, issuedBy: subject.creatorId, at, expiresAt, auditId: ids.uuid() });
      return invitationSchema.parse({ token, expiresAt: new Date(expiresAt).toISOString() });
    },
    async redeemInvitation(input: RedeemInvitation): Promise<Scope> {
      if (commonPasswords.has(input.password.toLowerCase())) throw new AccountRefusal("invitation-refused");
      const accountId = accountIdSchema.parse(ids.uuid());
      const creatorId = await identity.redeem({ ...input, tokenHash: digest(input.token), accountId });
      if (!creatorId) throw new AccountRefusal("invitation-refused");
      const scope = await resolveScope({ creatorId, email: input.email, secondFactor: false });
      if (!scope) throw new Error("committed identity has no Account");
      return scope;
    },
    /**
     * Runs before Better Auth sees a public auth request. Throttled sign-in and recovery
     * requests are refused the same way whether or not the email has an Account, because
     * every attempt is counted before anything is looked up.
     */
    async admitAuthRequest(path: string, body: unknown, address: string): Promise<void> {
      if (path === RECOVERY_RESET) {
        const parsed = passwordRecoverySchema.safeParse(body);
        if (parsed.success && commonPasswords.has(parsed.data.newPassword.toLowerCase())) throw new AccountRefusal("invalid-request");
        return;
      }
      if (path !== SIGN_IN && path !== RECOVERY_REQUEST) return;
      const limits = LIMITS[path];
      const email = emailRequestSchema.safeParse(body);
      const attempts = [
        { key: `${path}:address:${address}`, ...limits.address },
        ...(email.success ? [{ key: `${path}:email:${email.data.email}`, ...limits.email }] : []),
      ];
      let refused = false;
      for (const { key, max, windowMs } of attempts) {
        const hits = await identity.attempt({ bucket: digest(key), at: clock.now(), windowMs });
        refused ||= hits > max;
      }
      if (refused) throw new AccountRefusal("rate-limited");
    },
  };
}
export type Accounts = ReturnType<typeof createAccounts>;
export { createBetterAuth } from "./better-auth.ts";
export type { BetterAuthOptions } from "./better-auth.ts";
export { createSmtpMailer } from "./smtp-mailer.ts";
export type { SmtpMailerOptions } from "./smtp-mailer.ts";
