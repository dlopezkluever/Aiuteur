import { Client } from "pg";

/** The runtime roles migration 1 creates without passwords. Their passwords are host-time credentials. */
export const PASSWORD_ROLES = ["app", "identity", "scheduler"] as const;
export type PasswordRole = (typeof PASSWORD_ROLES)[number];

/**
 * Gives the `app`, `identity` and `scheduler` roles the passwords the host chose, so a peer on the network cannot connect by
 * naming a role (OPERATIONAL-BASELINE §5; RUNTIME-PLATFORM §5). Run by the migration step, as the bootstrap identity; idempotent.
 * The passwords are not returned and not logged.
 */
export async function provisionRolePasswords(connectionString: string, passwords: Readonly<Record<PasswordRole, string>>): Promise<void> {
  for (const role of PASSWORD_ROLES) if (passwords[role].trim() === "") throw new Error(`a password for the ${role} role is required`);
  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const role of PASSWORD_ROLES) {
      const { rows } = await client.query<{ statement: string }>("SELECT format('ALTER ROLE %I PASSWORD %L', $1::text, $2::text) AS statement", [role, passwords[role]]);
      await client.query(rows[0]!.statement);
    }
  } finally { await client.end(); }
}
