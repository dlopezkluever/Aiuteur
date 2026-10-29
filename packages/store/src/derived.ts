import { Client } from "pg";

/**
 * The nightly derived check of VERIFICATION §3.2 line 8: how many Generations in this database carry a fake snapshot.
 * Content-free (a count). Connect as `backup` or `owner`; a production database must answer 0.
 */
export async function fakeGenerationCount(connectionString: string): Promise<number> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return Number((await client.query("SELECT count(*) AS n FROM accounts.generation WHERE test_provider")).rows[0].n);
  } finally { await client.end(); }
}
