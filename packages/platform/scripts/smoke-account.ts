import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createBetterAuth } from "@aiuteur/accounts";

// The owner's one-time step before the first deploy: create the staging smoke Account straight in the identity schema, so the
// smoke has someone to sign in as before any web process exists. It issues one invitation and redeems it. It prints the Account id
// for SMOKE_ACCOUNT_ID, and nothing else. Run by `deploy.sh smoke-account`, with web.env and smoke.env.
const { DATABASE_URL_IDENTITY: connectionString, AUTH_SECRET: secret, PUBLIC_ORIGIN: baseURL, SMOKE_EMAIL: email, SMOKE_PASSWORD: password } = process.env;
if (!connectionString || !secret || !baseURL || !email || !password) throw new Error("DATABASE_URL_IDENTITY, AUTH_SECRET, PUBLIC_ORIGIN, SMOKE_EMAIL and SMOKE_PASSWORD are required");
const ids = { uuid: randomUUID, ordered: randomUUID, token: () => randomBytes(32).toString("base64url") };
const adapter = await createBetterAuth({ connectionString, baseURL, secret, clock: { now: () => Date.now() }, ids, idleSessionSeconds: 3600, absoluteSessionSeconds: 86_400 });
try {
  const token = ids.token();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const at = Date.now();
  await adapter.identity.issue({ tokenHash, email, issuedBy: null, at, expiresAt: at + 60_000, auditId: ids.uuid() });
  const accountId = ids.uuid() as Parameters<typeof adapter.identity.redeem>[0]["accountId"];
  const creator = await adapter.identity.redeem({ token, email, name: "Staging smoke", password, tokenHash, accountId });
  if (creator === null) throw new Error("the smoke Account could not be created (it may already exist)");
  process.stdout.write(`SMOKE_ACCOUNT_ID=${accountId}\n`);
} finally { await adapter.close(); }
