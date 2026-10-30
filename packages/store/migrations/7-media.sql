SET LOCAL ROLE owner;

-- #109 (T0-12). Classification: tenant table (account_id, forced RLS, composite tenant keys), append-only (D5).
-- Committed Media (PERSISTENCE §7.1): immutable and content-addressed inside one project, with probe facts frozen at
-- ingest. The key is a function of (Account, project, hash) and nothing else, so a row can never name another
-- Account's or another project's object (R17); `media` builds the same key from the Scope.
CREATE TABLE accounts.media (
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  hash text NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  size integer NOT NULL CHECK (size > 0),
  content_type text NOT NULL,
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  key text NOT NULL,
  origin text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (account_id, project_id, hash),
  FOREIGN KEY (account_id, project_id) REFERENCES accounts.project(account_id, project_id),
  CONSTRAINT media_key_is_derived CHECK (key = 'a/' || account_id::text || '/p/' || project_id::text || '/m/' || hash)
);

-- Expand (ADR 0023): an upload Attempt holds a Media of its own project, by composite key; no other Attempt holds one.
ALTER TABLE accounts.attempt ADD COLUMN media_hash text;
ALTER TABLE accounts.attempt ADD CONSTRAINT attempt_media FOREIGN KEY (account_id, project_id, media_hash) REFERENCES accounts.media(account_id, project_id, hash);
ALTER TABLE accounts.attempt ADD CONSTRAINT attempt_upload_holds_media CHECK ((origin = 'upload') = (media_hash IS NOT NULL));

-- Closed vocabularies are text with a generated CHECK (ADR 0023, D3). This block is
-- written by scripts/vocabulary.ts from `contract`; `--check` fails if it differs.
-- BEGIN GENERATED VOCABULARY
ALTER TABLE accounts.attempt DROP CONSTRAINT attempt_origin;
ALTER TABLE accounts.attempt ADD CONSTRAINT attempt_origin CHECK (origin IN ('stale-base', 'held', 'upload'));
ALTER TABLE accounts.idempotency DROP CONSTRAINT idempotency_operation;
ALTER TABLE accounts.idempotency ADD CONSTRAINT idempotency_operation CHECK (operation IN ('source-material.paste', 'source-material.change-role', 'treatment-option.choose', 'treatment.draft', 'character.create', 'character.reference', 'shot.create', 'shot.presence'));
ALTER TABLE accounts.media ADD CONSTRAINT media_origin CHECK (origin IN ('upload'));
ALTER TABLE accounts.media ADD CONSTRAINT media_content_type CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp'));
-- END GENERATED VOCABULARY

ALTER TABLE accounts.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts.media FORCE ROW LEVEL SECURITY;
CREATE POLICY account_scope ON accounts.media
  USING (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid);
CREATE TRIGGER append_only_rows BEFORE UPDATE OR DELETE ON accounts.media FOR EACH ROW EXECUTE FUNCTION accounts.reject_rewrite();
CREATE TRIGGER append_only_truncate BEFORE TRUNCATE ON accounts.media FOR EACH STATEMENT EXECUTE FUNCTION accounts.reject_rewrite();

GRANT SELECT, INSERT ON accounts.media TO app;
GRANT SELECT ON accounts.media TO backup;
