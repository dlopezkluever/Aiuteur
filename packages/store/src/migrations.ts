import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { migrate } from "postgres-migrations";

export async function migrateDatabase(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try { await migrate({ client }, fileURLToPath(new URL("../migrations/", import.meta.url))); }
  finally { await client.end(); }
}
