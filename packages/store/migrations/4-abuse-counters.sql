-- Fixed-window attempt counters for sign-in and recovery (OPERATIONAL-BASELINE §2.3).
-- Buckets are hashes of the limited dimension, so no address or email is stored.
SET LOCAL ROLE owner;
CREATE TABLE auth.abuse_counter (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits > 0)
);
GRANT SELECT, INSERT, UPDATE ON auth.abuse_counter TO identity;
GRANT SELECT ON auth.abuse_counter TO backup;
