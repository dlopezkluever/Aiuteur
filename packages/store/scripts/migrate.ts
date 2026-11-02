import { migrateDatabase, provisionRolePasswords } from "@aiuteur/store";

if (!process.env["MIGRATION_DATABASE_URL"]) throw new Error("MIGRATION_DATABASE_URL required (migration tooling only)");
await migrateDatabase(process.env["MIGRATION_DATABASE_URL"]);
process.stdout.write("Migration chain applied and checksums verified\n");

// On a host the three runtime roles also get their passwords here, in the one step that holds the bootstrap identity.
// All three or none: CI and local runs use passwordless roles on a disposable cluster.
const { ROLE_PASSWORD_APP: app, ROLE_PASSWORD_IDENTITY: identity, ROLE_PASSWORD_SCHEDULER: scheduler } = process.env;
if (app || identity || scheduler) {
  if (!app || !identity || !scheduler) throw new Error("ROLE_PASSWORD_APP, ROLE_PASSWORD_IDENTITY and ROLE_PASSWORD_SCHEDULER are set together");
  await provisionRolePasswords(process.env["MIGRATION_DATABASE_URL"], { app, identity, scheduler });
  process.stdout.write("Runtime role passwords set\n");
}
