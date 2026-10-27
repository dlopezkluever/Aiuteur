import { createHash } from "node:crypto";
import { dictionary } from "@zxcvbn-ts/language-common";
import { accountIdSchema, invitationSchema, type AccountId, type CreatorId, type ErrorCode, type RecoveryComplete, type RedeemInvitation } from "@aiuteur/contract";
import type { Mailer } from "@aiuteur/mail";
import type { Auth, AuthenticatedSubject, Clock, Ids, Scope } from "@aiuteur/store";

export class AccountRefusal extends Error {
  readonly code: Extract<ErrorCode, "invitation-refused" | "recovery-refused" | "rate-limited" | "forbidden" | "unauthenticated">;
  /** Whole seconds until the refused counter's window ends; set only for `rate-limited`. */
  readonly retryAfterSeconds: number | undefined;
  constructor(code: AccountRefusal["code"], retryAfterSeconds?: number) { super(code); this.code = code; this.retryAfterSeconds = retryAfterSeconds; }
}
/** At most `max` attempts per fixed window. */
export interface Limit { max: number; windowMs: number }
/**
 * OPERATIONAL-BASELINE §2.3: sign-in, recovery and redemption are limited per
 * address and per submitted email. Values are named configuration with no
 * default; the composition root sets them.
 */
export interface AbuseLimits {
  signIn: { address: Limit; email: Limit };
  recovery: { address: Limit; email: Limit };
  redemption: { address: Limit; email: Limit };
}
export type AbuseKind = keyof AbuseLimits;
/** The auth-schema adapter owns the transaction spanning identity and Account. */
export interface Identity {
  mapSubject(subject: CreatorId): Promise<AccountId | null>;
  issue(input: { tokenHash: string; email: string; issuedBy: CreatorId | null; at: number; expiresAt: number; auditId: string }): Promise<void>;
  redeem(input: RedeemInvitation & { tokenHash: string; accountId: AccountId }): Promise<CreatorId | null>;
  /** Counts one attempt in its fixed window, atomically, and returns the count including this attempt. */
  attempt(input: { key: string; at: number; windowStart: number; expiresAt: number }): Promise<number>;
  /** Stores a recovery token for the creator with this email and returns the stored address, or null when none exists. */
  issueRecovery(input: { email: string; tokenHash: string; at: number; expiresAt: number }): Promise<string | null>;
  /** Sets the new password, ends every session and consumes the token in one transaction. False when the token is unknown, used or expired. */
  completeRecovery(input: { tokenHash: string; password: string; at: number }): Promise<boolean>;
}
export interface AccountsOptions {
  auth: Auth;
  identity: Identity;
  clock: Clock;
  ids: Ids;
  operatorEmails: readonly string[];
  invitationTtlMs: number;
  mailer: Mailer;
  limits: AbuseLimits;
  recoveryTtlMs: number;
  /** The creator-facing page that reads the token from the link's fragment, e.g. `https://aiuteur.example/recover`. */
  recoveryPage: string;
  /** Recovery mail is sent after the response, so a failure cannot distinguish an existing email; it is reported here. */
  onMailFailure(error: unknown): void;
}
const commonPasswords = new Set(dictionary["passwords-common"]);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const tokenHash = sha256;

export function createAccounts(options: AccountsOptions) {
  const { auth, identity, clock, ids } = options;
  async function resolveScope(subject: AuthenticatedSubject): Promise<Scope | null> {
    const accountId = await identity.mapSubject(subject.creatorId);
    return accountId ? { accountId, creatorId: subject.creatorId } : null;
  }
  const pending = new Set<Promise<void>>();
  function inBackground(work: Promise<void>) {
    const tracked: Promise<void> = work.catch(options.onMailFailure).finally(() => pending.delete(tracked));
    pending.add(tracked);
  }
  return {
    authenticate: (headers: Headers) => auth.authenticate(headers),
    /** Resolves when every recovery mail started so far has been handed to the Mailer or has failed. */
    mailSettled: async () => { await Promise.all(pending); },
    /**
     * Counts this attempt against the address and the submitted email (whether
     * or not it names an Account) and refuses once either counter is over its limit.
     */
    async attempt(kind: AbuseKind, address: string, email: string | null): Promise<void> {
      const at = clock.now();
      const counters = [["address", address, options.limits[kind].address], ...(email === null ? [] : [["email", email.trim().toLowerCase(), options.limits[kind].email] as const])] as const;
      let retryAfter = 0;
      for (const [subject, value, limit] of counters) {
        const windowStart = Math.floor(at / limit.windowMs) * limit.windowMs;
        const expiresAt = windowStart + limit.windowMs;
        const count = await identity.attempt({ key: sha256(`${kind}:${subject}:${value}`), at, windowStart, expiresAt });
        if (count > limit.max) retryAfter = Math.max(retryAfter, Math.ceil((expiresAt - at) / 1000));
      }
      if (retryAfter > 0) throw new AccountRefusal("rate-limited", retryAfter);
    },
    /** Always resolves the same way; only an existing email gets mail. */
    async requestRecovery(email: string): Promise<void> {
      const token = ids.token();
      const at = clock.now();
      const to = await identity.issueRecovery({ email, tokenHash: tokenHash(token), at, expiresAt: at + options.recoveryTtlMs });
      if (to === null) return;
      inBackground(options.mailer.send({
        kind: "recovery",
        to,
        subject: "Recover your Aiuteur studio",
        text: `Use this link to choose a new password. It works once and expires in ${Math.round(options.recoveryTtlMs / 60_000)} minutes.\n\n${options.recoveryPage}#token=${token}\n\nIf you did not ask for this, ignore this email.`,
      }));
    },
    /** Ends every session of the creator; they sign in again with the new password. */
    async completeRecovery(input: RecoveryComplete): Promise<void> {
      if (commonPasswords.has(input.password.toLowerCase())) throw new AccountRefusal("recovery-refused");
      if (!await identity.completeRecovery({ tokenHash: tokenHash(input.token), password: input.password, at: clock.now() })) throw new AccountRefusal("recovery-refused");
    },
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
