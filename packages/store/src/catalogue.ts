import { Pool } from "pg";

/** Migration tooling only. D1 snapshots structure, not creator data or secrets. */
export async function schemaCatalogue(connectionString: string) {
  const pool = new Pool({ connectionString });
  try {
    const tables = await pool.query(`
      SELECT n.nspname AS schema, c.relname AS name, pg_get_userbyid(c.relowner) AS owner,
        c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls, c.relacl::text AS grants,
        (SELECT jsonb_agg(jsonb_build_object('name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
          'nullable', NOT a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
          FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('name', con.conname, 'definition', pg_get_constraintdef(con.oid)) ORDER BY con.conname), '[]')
          FROM pg_constraint con WHERE con.conrelid = c.oid) AS constraints,
        (SELECT coalesce(jsonb_agg(indexdef ORDER BY indexname), '[]') FROM pg_indexes i WHERE i.schemaname = n.nspname AND i.tablename = c.relname) AS indexes,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('name', p.policyname, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'check', p.with_check) ORDER BY p.policyname), '[]')
          FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
      ORDER BY n.nspname, c.relname`);
    const functions = await pool.query(`
      SELECT n.nspname AS schema, p.proname AS name, pg_get_functiondef(p.oid) AS definition,
        pg_get_userbyid(p.proowner) AS owner, p.proacl::text AS grants
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' ORDER BY n.nspname, p.proname`);
    const schemas = await pool.query("SELECT nspname AS name, pg_get_userbyid(nspowner) AS owner, nspacl::text AS grants FROM pg_namespace WHERE nspname IN ('accounts', 'auth') ORDER BY nspname");
    return { tables: tables.rows, functions: functions.rows, schemas: schemas.rows };
  } finally { await pool.end(); }
}
