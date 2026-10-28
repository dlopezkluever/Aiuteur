import { Pool } from "pg";
import { Kysely, PostgresDialect, sql } from "kysely";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { accountIdSchema, creatorIdSchema, DEFAULT_SETTINGS } from "@aiuteur/contract";
import { assertRuntimeRole, type Auth, type Clock, type Ids } from "@aiuteur/store";
import type { Identity } from "./index.ts";

export interface BetterAuthOptions {
  connectionString: string;
  baseURL: string;
  secret: string;
  clock: Clock;
  ids: Ids;
  idleSessionSeconds: number;
  absoluteSessionSeconds: number;
}

export async function createBetterAuth(options: BetterAuthOptions): Promise<{
  auth: Auth; identity: Identity; handle(request: Request): Promise<Response>; close(): Promise<void>;
}> {
  const pool = new Pool({ connectionString: options.connectionString });
  try { await assertRuntimeRole(pool, "identity"); } catch (error) { await pool.end(); throw error; }
  const db = new Kysely<Record<string, never>>({ dialect: new PostgresDialect({ pool }) });
  // A transaction-bound instance uses exactly the caller's Kysely transaction.
  // Better Auth still owns hashing, users and credentials; signup stays disabled.
  function library(connection: typeof db, inTransaction = false) {
    return betterAuth({
      appName: "Aiuteur",
      baseURL: options.baseURL,
      basePath: "/api/auth",
      secret: options.secret,
      database: { db: connection, type: "postgres", schemaName: "auth", transaction: !inTransaction },
      emailAndPassword: { enabled: true, disableSignUp: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 128 },
      session: {
        expiresIn: options.idleSessionSeconds,
        updateAge: 0,
        cookieCache: { enabled: false },
        additionalFields: { secondFactor: { type: "boolean", defaultValue: false, input: false } },
      },
      // The library's live schema check needs a pooled connection; the pooled instance still runs it, and D1 owns the schema.
      advanced: { useSecureCookies: true, database: { generateId: () => options.ids.uuid(), validateSchema: !inTransaction }, defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax" } },
      plugins: [twoFactor()],
      hooks: { after: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/two-factor/verify-totp" && ctx.context.newSession) {
          await ctx.context.internalAdapter.updateSession(ctx.context.newSession.session.token, { secondFactor: true });
        }
      }) },
      rateLimit: { enabled: false }, // T0-02 owns application abuse limits.
      telemetry: { enabled: false },
      logger: { disabled: true },
    });
  }
  const authentication = library(db);
  return {
    auth: {
      async authenticate(headers) {
        const session = await authentication.api.getSession({ headers, query: { disableCookieCache: true } });
        if (!session || !session.user.emailVerified || options.clock.now() - session.session.createdAt.getTime() >= options.absoluteSessionSeconds * 1000) return null;
        return { creatorId: creatorIdSchema.parse(session.user.id), email: session.user.email, secondFactor: session.session.secondFactor === true };
      },
    },
    identity: {
      async mapSubject(subject) {
        const result = await sql<{ account_id: string | null }>`SELECT accounts.map_subject(${subject}) AS account_id`.execute(db);
        const id = result.rows[0]?.account_id;
        return id ? accountIdSchema.parse(id) : null;
      },
      async issue(input) {
        await db.transaction().execute(async (tx) => {
          await sql`INSERT INTO auth.invitation (token_hash, email, expires_at, issued_by, created_at)
            VALUES (${input.tokenHash}, ${input.email}, ${new Date(input.expiresAt)}, ${input.issuedBy}, ${new Date(input.at)})`.execute(tx);
          if (input.issuedBy) await sql`INSERT INTO auth.audit_event (id, actor, action, occurred_at)
            VALUES (${input.auditId}, ${input.issuedBy}, 'invitation.issued', ${new Date(input.at)})`.execute(tx);
        });
      },
      async attempt(input) {
        const result = await sql<{ attempts: number }>`INSERT INTO auth.rate_limit (key, window_start, expires_at, attempts)
          VALUES (${input.key}, ${new Date(input.windowStart)}, ${new Date(input.expiresAt)}, 1)
          ON CONFLICT (key, window_start) DO UPDATE SET attempts = auth.rate_limit.attempts + 1
          RETURNING attempts`.execute(db);
        // Expired windows are dead rows; sweeping them here keeps the table bounded without a worker.
        await sql`DELETE FROM auth.rate_limit WHERE expires_at < ${new Date(input.at)}`.execute(db);
        return Number(result.rows[0]?.attempts);
      },
      async issueRecovery(input) {
        return db.transaction().execute(async (tx) => {
          const user = await sql<{ id: string; email: string }>`SELECT id, email FROM auth."user"
            WHERE email = ${input.email} AND "emailVerified"`.execute(tx);
          const row = user.rows[0];
          if (!row) return null;
          await sql`DELETE FROM auth.recovery WHERE user_id = ${row.id}`.execute(tx);
          await sql`INSERT INTO auth.recovery (token_hash, user_id, expires_at, created_at)
            VALUES (${input.tokenHash}, ${row.id}, ${new Date(input.expiresAt)}, ${new Date(input.at)})`.execute(tx);
          return row.email;
        });
      },
      async completeRecovery(input) {
        return db.transaction().execute(async (tx) => {
          const found = await sql<{ user_id: string; expires_at: Date }>`SELECT user_id, expires_at FROM auth.recovery
            WHERE token_hash = ${input.tokenHash} FOR UPDATE`.execute(tx);
          const row = found.rows[0];
          // Exclusive on the creator: waits for every sign-in holding the shared lock (see `handle`) to
          // commit, so its session is deleted below, and holds later ones until the new password is committed.
          if (row) await sql`SELECT id FROM auth."user" WHERE id = ${row.user_id} FOR UPDATE`.execute(tx);
          // Sampled after the row lock, so expiry while waiting for it is honoured.
          if (!row || row.expires_at.getTime() <= options.clock.now()) return false;
          const context = await library(tx, true).$context;
          const password = await context.password.hash(input.password);
          await context.internalAdapter.updatePassword(row.user_id, password);
          await sql`DELETE FROM auth.session WHERE "userId" = ${row.user_id}`.execute(tx);
          // Pending second-factor challenges (and trusted-device records) were minted from the old credential.
          await sql`DELETE FROM auth.verification WHERE value = ${row.user_id}`.execute(tx);
          await sql`DELETE FROM auth.recovery WHERE user_id = ${row.user_id}`.execute(tx);
          return true;
        });
      },
      async redeem(input) {
        try {
          return await db.transaction().execute(async (tx) => {
            const invitation = await sql<{ expires_at: Date }>`SELECT expires_at FROM auth.invitation
              WHERE token_hash = ${input.tokenHash} AND email = ${input.email}
                AND redeemed_by IS NULL FOR UPDATE`.execute(tx);
            const at = options.clock.now();
            const row = invitation.rows[0];
            if (!row || row.expires_at.getTime() <= at) return null;
            const context = await library(tx, true).$context;
            const password = await context.password.hash(input.password);
            const user = await context.internalAdapter.createUser({ email: input.email, name: input.name, emailVerified: true }, { method: "email-password" });
            await context.internalAdapter.linkAccount({ userId: user.id, accountId: user.id, providerId: "credential", password });
            await sql`SELECT accounts.create_studio(${user.id}, ${input.accountId}, ${new Date(at)}, ${JSON.stringify(DEFAULT_SETTINGS)}::jsonb)`.execute(tx);
            await sql`UPDATE auth.invitation SET redeemed_by = ${user.id} WHERE token_hash = ${input.tokenHash}`.execute(tx);
            return creatorIdSchema.parse(user.id);
          });
        } catch (error) {
          // Duplicate email/id is the same refusal as an invalid invitation;
          // unexpected database faults still surface (with the transaction undone).
          if (error instanceof Error && "code" in error && error.code === "23505") return null;
          throw error;
        }
      },
    },
    // Sign-in and second-factor completion are the only routes that turn a credential into a session.
    // Each runs wholly on one transaction-bound library instance holding a shared lock on the creator, so
    // verification, session creation and the pending challenge are ordered against recovery (RT2: the lock
    // is transaction-scoped and no second pooled client is needed).
    async handle(request) {
      const path = new URL(request.url).pathname;
      if (request.method !== "POST" || !(path.endsWith("/sign-in/email") || path.endsWith("/two-factor/verify-totp"))) return authentication.handler(request);
      return db.transaction().execute(async (tx) => {
        if (path.endsWith("/sign-in/email")) {
          const body: unknown = await request.clone().json().catch(() => null);
          const email = body && typeof body === "object" && "email" in body && typeof body.email === "string" ? body.email.toLowerCase() : null;
          if (email !== null) await sql`SELECT id FROM auth."user" WHERE email = ${email} FOR SHARE`.execute(tx);
        } else {
          // A pending challenge is named by the 2fa-… identifier in its cookie; the library verifies its signature.
          const pending = /2fa-[A-Za-z0-9]+/.exec(decodeURIComponent(request.headers.get("cookie") ?? ""))?.[0];
          if (pending) await sql`SELECT u.id FROM auth."user" u JOIN auth.verification v ON v.value = u.id WHERE v.identifier = ${pending} FOR SHARE OF u`.execute(tx);
        }
        return library(tx, true).handler(request);
      });
    },
    close: () => db.destroy(),
  };
}
