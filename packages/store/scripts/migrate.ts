import { migrateDatabase } from "@aiuteur/store";

if (!process.env["MIGRATION_DATABASE_URL"]) throw new Error("MIGRATION_DATABASE_URL required (migration tooling only)");
await migrateDatabase(process.env["MIGRATION_DATABASE_URL"]);
process.stdout.write("Migration chain applied and checksums verified\n");
