import { createHash } from "node:crypto";
import { dictionary } from "@zxcvbn-ts/language-common";
import { accountIdSchema, invitationSchema, type AccountId, type CreatorId, type ErrorCode, type RedeemInvitation } from "@aiuteur/contract";
import type { Auth, AuthenticatedSubject, Clock, Ids, Scope } from "@aiuteur/store";

export class AccountRefusal extends Error {
  readonly code: Extract<ErrorCode, "invitation-refused" | "forbidden" | "unauthenticated">;
  constructor(code: AccountRefusal["code"]) { super(code); this.code = code; }
}
/** The auth-schema adapter owns the transaction spanning identity and Account. */
export interface Identity {
  mapSubject(subject: CreatorId): Promise<AccountId | null>;
  issue(input: { tokenHash: string; email: string; issuedBy: CreatorId | null; at: number; expiresAt: number; auditId: string }): Promise<void>;
  redeem(input: RedeemInvitation & { tokenHash: string; accountId: AccountId }): Promise<CreatorId | null>;
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
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

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
      await identity.issue({ tokenHash: tokenHash(token), email, issuedBy: subject.creatorId, at, expiresAt, auditId: ids.uuid() });
      return invitationSchema.parse({ token, expiresAt: new Date(expiresAt).toISOString() });
    },
    async redeemInvitation(input: RedeemInvitation): Promise<Scope> {
      if (commonPasswords.has(input.password.toLowerCase())) throw new AccountRefusal("invitation-refused");
      const accountId = accountIdSchema.parse(ids.uuid());
      const creatorId = await identity.redeem({ ...input, tokenHash: tokenHash(input.token), accountId });
      if (!creatorId) throw new AccountRefusal("invitation-refused");
      const scope = await resolveScope({ creatorId, email: input.email, secondFactor: false });
      if (!scope) throw new Error("committed identity has no Account");
      return scope;
    },
  };
}
export type Accounts = ReturnType<typeof createAccounts>;
export { createBetterAuth } from "./better-auth.ts";
export type { BetterAuthOptions } from "./better-auth.ts";
