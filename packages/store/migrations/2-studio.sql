SET LOCAL ROLE owner;
CREATE SCHEMA accounts AUTHORIZATION owner;
CREATE SCHEMA auth AUTHORIZATION owner;
REVOKE ALL ON SCHEMA accounts, auth FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Classification: tenant root and mutable settings. Both default-deny without
-- the transaction-local Account. No Project or creative history exists yet.
CREATE TABLE accounts.account (
  account_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL
);
CREATE TABLE accounts.settings (
  account_id uuid NOT NULL REFERENCES accounts.account(account_id),
  key text NOT NULL CHECK (key = 'studio'),
  schema_version integer NOT NULL CHECK (schema_version = 1),
  payload jsonb NOT NULL,
  PRIMARY KEY (account_id, key)
);
ALTER TABLE accounts.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts.account FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts.settings FORCE ROW LEVEL SECURITY;
CREATE POLICY account_scope ON accounts.account
  USING (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid);
CREATE POLICY account_scope ON accounts.settings
  USING (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid);
GRANT USAGE ON SCHEMA accounts TO app, identity, backup;
GRANT SELECT ON accounts.account, accounts.settings TO app;
GRANT UPDATE (payload) ON accounts.settings TO app;
GRANT SELECT ON ALL TABLES IN SCHEMA accounts TO backup;

-- Classification: auth (pre-Account), outside tenant RLS. Better Auth 1.7.14
-- owns authentication mechanics; names/fields match its core + twoFactor schema.
CREATE TABLE auth."user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL,
  image text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "twoFactorEnabled" boolean NOT NULL DEFAULT false
);
CREATE TABLE auth.session (
  id text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  "secondFactor" boolean NOT NULL DEFAULT false
);
CREATE INDEX ON auth.session ("userId");
CREATE TABLE auth.account (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX ON auth.account ("userId");
CREATE TABLE auth.verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);
CREATE INDEX ON auth.verification (identifier);
CREATE TABLE auth."twoFactor" (
  id text PRIMARY KEY,
  secret text NOT NULL,
  "backupCodes" text NOT NULL,
  "userId" text NOT NULL UNIQUE REFERENCES auth."user"(id) ON DELETE CASCADE,
  verified boolean NOT NULL DEFAULT true,
  "failedVerificationCount" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamptz
);
CREATE TABLE auth.invitation (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  redeemed_by text UNIQUE REFERENCES auth."user"(id),
  issued_by text REFERENCES auth."user"(id),
  created_at timestamptz NOT NULL
);
CREATE TABLE auth.subject_map (
  subject text PRIMARY KEY REFERENCES auth."user"(id),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts.account(account_id)
);
CREATE TABLE auth.audit_event (
  id uuid PRIMARY KEY,
  actor text NOT NULL REFERENCES auth."user"(id),
  action text NOT NULL,
  occurred_at timestamptz NOT NULL
);
GRANT USAGE ON SCHEMA auth TO identity, backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO identity;
REVOKE ALL ON auth.subject_map FROM identity;
REVOKE UPDATE, DELETE ON auth.audit_event FROM identity;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO backup;

-- Explicit identity bridge allowlist. Only identity can execute these. They
-- return one id, never tenant content; no unscoped tenant SELECT is granted.
CREATE FUNCTION accounts.map_subject(subject_id text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT m.account_id FROM auth.subject_map m
  JOIN auth."user" u ON u.id = m.subject
  WHERE m.subject = subject_id AND u."emailVerified"
$$;
CREATE FUNCTION accounts.create_studio(subject_id text, new_account uuid, at_time timestamptz, defaults jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM auth."user" WHERE id = subject_id AND "emailVerified") THEN
    RAISE EXCEPTION 'unverified subject';
  END IF;
  PERFORM set_config('aiuteur.account_id', new_account::text, true);
  INSERT INTO accounts.account VALUES (new_account, at_time);
  INSERT INTO accounts.settings VALUES (new_account, 'studio', 1, defaults);
  INSERT INTO auth.subject_map VALUES (subject_id, new_account);
  RETURN new_account;
END $$;
REVOKE ALL ON FUNCTION accounts.map_subject(text), accounts.create_studio(text, uuid, timestamptz, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accounts.map_subject(text), accounts.create_studio(text, uuid, timestamptz, jsonb) TO identity;
