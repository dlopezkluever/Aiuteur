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
      advanced: { useSecureCookies: true, database: { generateId: () => options.ids.uuid() }, defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "lax" } },
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
    handle: (request) => authentication.handler(request),
    close: () => db.destroy(),
  };
}
