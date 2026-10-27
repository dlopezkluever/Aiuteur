SET LOCAL ROLE owner;

-- Classification: auth (pre-Account), outside tenant RLS, reachable only by identity.
-- Recovery keeps the SHA-256 of the emailed token, never the token. A creator's
-- purge deletes their rows through the cascade.
CREATE TABLE auth.recovery (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX ON auth.recovery (user_id);

-- Fixed-window attempt counters. The key is a hash of the counter's name and
-- subject (an address or an email), so no vocabulary or identifier is persisted.
CREATE TABLE auth.rate_limit (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (key, window_start)
);
CREATE INDEX ON auth.rate_limit (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON auth.recovery, auth.rate_limit TO identity;
GRANT SELECT ON auth.recovery, auth.rate_limit TO backup;
