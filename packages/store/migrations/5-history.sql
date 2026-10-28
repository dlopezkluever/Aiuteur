SET LOCAL ROLE owner;

-- Classification: tenant tables (account_id, forced RLS, composite tenant keys).
-- Every table here is append-only (PERSISTENCE §3, D5): no UPDATE/DELETE grant to
-- any role and a blocking trigger that also stops the owner. Nothing in this file
-- stores a marker or "outdated" status (D6); the lock table is a decision stream.
CREATE FUNCTION accounts.reject_rewrite() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog
AS $$ BEGIN RAISE EXCEPTION 'append-only: % on % is not allowed', TG_OP, TG_TABLE_NAME USING ERRCODE = '23000'; END $$;

CREATE TABLE accounts.project (
  project_id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts.account(account_id),
  created_at timestamptz NOT NULL,
  UNIQUE (account_id, project_id)
);
CREATE TABLE accounts.object (
  object_id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (account_id, project_id) REFERENCES accounts.project(account_id, project_id),
  UNIQUE (account_id, project_id, object_id)
);
CREATE TABLE accounts.revision (
  object_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence >= 1),
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  parent integer NOT NULL CHECK (parent = sequence - 1),
  cause text NOT NULL,
  actor_kind text NOT NULL,
  schema_version integer NOT NULL,
  body jsonb NOT NULL,
  body_hash text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (object_id, sequence),
  FOREIGN KEY (account_id, project_id, object_id) REFERENCES accounts.object(account_id, project_id, object_id)
);
CREATE TABLE accounts.attempt (
  attempt_id uuid PRIMARY KEY,
  position integer GENERATED ALWAYS AS IDENTITY,
  object_id uuid NOT NULL,
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  based_on integer NOT NULL CHECK (based_on >= 0),
  origin text NOT NULL,
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (account_id, project_id, object_id) REFERENCES accounts.object(account_id, project_id, object_id)
);
-- The lock table exists empty at T0-03: no runtime role can write it yet.
CREATE TABLE accounts.lock (
  object_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence >= 1),
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  locked boolean NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (object_id, sequence),
  FOREIGN KEY (account_id, project_id, object_id) REFERENCES accounts.object(account_id, project_id, object_id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['account', 'project', 'object', 'revision', 'attempt', 'lock'] LOOP
    IF t <> 'account' THEN
      EXECUTE format('ALTER TABLE accounts.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE accounts.%I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format($p$CREATE POLICY account_scope ON accounts.%I
        USING (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid)
        WITH CHECK (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid)$p$, t);
    END IF;
    EXECUTE format('CREATE TRIGGER append_only_rows BEFORE UPDATE OR DELETE ON accounts.%I FOR EACH ROW EXECUTE FUNCTION accounts.reject_rewrite()', t);
    EXECUTE format('CREATE TRIGGER append_only_truncate BEFORE TRUNCATE ON accounts.%I FOR EACH STATEMENT EXECUTE FUNCTION accounts.reject_rewrite()', t);
  END LOOP;
END $$;

GRANT SELECT ON accounts.project, accounts.object, accounts.revision, accounts.attempt, accounts.lock TO app;
GRANT INSERT ON accounts.project, accounts.object, accounts.revision, accounts.attempt TO app;
GRANT SELECT ON ALL TABLES IN SCHEMA accounts TO backup;
