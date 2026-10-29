SET LOCAL ROLE owner;

-- #102 (T0-05). Classification: tenant tables (account_id, forced RLS, composite tenant keys).
-- The Generation and its call log, run history, settlement and capture edges, Decisions and the
-- outbox are append-only (PERSISTENCE §3, §11; D5). The Job row and the per-Account event counter
-- are on the closed list of mutable cells: the Job is a compare-and-set state machine (JOB-LIFECYCLE §3).

-- The permanent record of one request: everything known before any provider call (Package P7).
CREATE TABLE accounts.generation (
  generation_id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  operation text NOT NULL,
  operation_class text NOT NULL,
  -- Creator, action id, request id and time of the Initiation minted in api (AI-map G10).
  initiation jsonb NOT NULL,
  effective_model jsonb NOT NULL,
  versions jsonb NOT NULL,
  test_provider boolean NOT NULL,
  resolved_inputs jsonb NOT NULL,
  captured jsonb NOT NULL,
  package jsonb NOT NULL,
  fit_report jsonb NOT NULL,
  rendered_request jsonb NOT NULL,
  request_digest text NOT NULL,
  expected_digest text,
  estimate jsonb NOT NULL,
  target jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (account_id, project_id) REFERENCES accounts.project(account_id, project_id),
  UNIQUE (account_id, project_id, generation_id)
);

-- One run of a Generation. No creative content; prunable once settled (later).
CREATE TABLE accounts.job (
  job_id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  generation_id uuid NOT NULL,
  run integer NOT NULL CHECK (run >= 1),
  class text NOT NULL,
  state text NOT NULL,
  -- The one due time (RUNTIME §4.2); null for a terminal Job.
  due_at timestamptz,
  deadline_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  operation_ref text,
  failure_class text,
  billed text,
  reason text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  FOREIGN KEY (account_id, project_id, generation_id) REFERENCES accounts.generation(account_id, project_id, generation_id),
  UNIQUE (generation_id, run),
  CHECK ((state IN ('succeeded', 'failed', 'cancelled')) = (due_at IS NULL))
);
CREATE INDEX job_due ON accounts.job (due_at, job_id) WHERE due_at IS NOT NULL;

-- Run history: one row per Job outcome, kept when Jobs are pruned (JOB-LIFECYCLE §2.1).
CREATE TABLE accounts.generation_run (
  generation_id uuid NOT NULL,
  job_id uuid NOT NULL,
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  run integer NOT NULL CHECK (run >= 1),
  state text NOT NULL,
  operation_ref text,
  failure_class text,
  billed text,
  reason text,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (generation_id, job_id),
  FOREIGN KEY (account_id, project_id, generation_id) REFERENCES accounts.generation(account_id, project_id, generation_id)
);

-- The call log (GENERATION-PACKAGE §11): the raw response is kept, valid or not.
CREATE TABLE accounts.generation_call (
  generation_id uuid NOT NULL,
  index integer NOT NULL CHECK (index >= 1),
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  role text NOT NULL,
  job_id uuid NOT NULL,
  request_digest text NOT NULL,
  operation_ref text,
  response text,
  verdict jsonb,
  reported_cost jsonb,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (generation_id, index),
  FOREIGN KEY (account_id, project_id, generation_id) REFERENCES accounts.generation(account_id, project_id, generation_id)
);

-- Settles once: the outcome, the actual cost (set, never added) and the outputs (JOB-LIFECYCLE §4, §11).
CREATE TABLE accounts.generation_settlement (
  generation_id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  outcome text NOT NULL,
  reason text,
  actual jsonb NOT NULL,
  outputs jsonb NOT NULL,
  settled_at timestamptz NOT NULL,
  FOREIGN KEY (account_id, project_id, generation_id) REFERENCES accounts.generation(account_id, project_id, generation_id)
);

-- Capture edges (EI1; PERSISTENCE §3 `capture`): the units a Generation read, with the Revision and frozen fingerprint.
CREATE TABLE accounts.capture (
  generation_id uuid NOT NULL,
  object_id uuid NOT NULL,
  slice text NOT NULL,
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence >= 1),
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (generation_id, object_id, slice),
  FOREIGN KEY (account_id, project_id, generation_id) REFERENCES accounts.generation(account_id, project_id, generation_id),
  FOREIGN KEY (account_id, project_id, object_id) REFERENCES accounts.object(account_id, project_id, object_id)
);
CREATE INDEX capture_unit ON accounts.capture (object_id, slice);

-- Decisions: append-only creator events; current state is the latest (PERSISTENCE §3 `decision`).
CREATE TABLE accounts.decision (
  object_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence >= 1),
  account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  actor text NOT NULL,
  action_group uuid NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (object_id, sequence),
  FOREIGN KEY (account_id, project_id, object_id) REFERENCES accounts.object(account_id, project_id, object_id)
);

-- The outbox (MODULE R13; RUNTIME §6): per-Account, gap-free, commit-ordered; ids and statuses only (RT4).
CREATE TABLE accounts.event (
  account_id uuid NOT NULL REFERENCES accounts.account(account_id),
  sequence integer NOT NULL CHECK (sequence >= 1),
  type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (account_id, sequence)
);
CREATE TABLE accounts.event_counter (
  account_id uuid PRIMARY KEY REFERENCES accounts.account(account_id),
  next integer NOT NULL CHECK (next >= 1)
);

-- Closed vocabularies are text with a generated CHECK (ADR 0023, D3). This block is
-- written by scripts/vocabulary.ts from `contract`; `--check` fails if it differs.
-- BEGIN GENERATED VOCABULARY
ALTER TABLE accounts.idempotency DROP CONSTRAINT idempotency_operation;
ALTER TABLE accounts.idempotency ADD CONSTRAINT idempotency_operation CHECK (operation IN ('source-material.paste', 'source-material.change-role', 'treatment-option.choose', 'treatment.draft'));
ALTER TABLE accounts.generation ADD CONSTRAINT generation_operation CHECK (operation IN ('treatment.draft'));
ALTER TABLE accounts.generation ADD CONSTRAINT generation_operation_class CHECK (operation_class IN ('video.take', 'image.frame', 'image.entity', 'text.create', 'text.check', 'audio.speech', 'audio.transform', 'audio.lipsync', 'audio.voice', 'audio.transcribe', 'audio.music-sfx', 'world.generate'));
ALTER TABLE accounts.job ADD CONSTRAINT job_class CHECK (class IN ('provider', 'local'));
ALTER TABLE accounts.job ADD CONSTRAINT job_state CHECK (state IN ('waiting', 'queued', 'submitting', 'running', 'fetching', 'cancelling', 'succeeded', 'failed', 'cancelled'));
ALTER TABLE accounts.job ADD CONSTRAINT job_failure_class CHECK (failure_class IN ('transient-unbilled', 'transient-maybe-billed', 'output-retrieval', 'output-lost', 'permanent-input', 'provider-safety-refusal', 'platform-configuration', 'unknown'));
ALTER TABLE accounts.job ADD CONSTRAINT job_billed CHECK (billed IN ('no', 'maybe', 'yes'));
ALTER TABLE accounts.generation_run ADD CONSTRAINT generation_run_state CHECK (state IN ('waiting', 'queued', 'submitting', 'running', 'fetching', 'cancelling', 'succeeded', 'failed', 'cancelled'));
ALTER TABLE accounts.generation_run ADD CONSTRAINT generation_run_failure_class CHECK (failure_class IN ('transient-unbilled', 'transient-maybe-billed', 'output-retrieval', 'output-lost', 'permanent-input', 'provider-safety-refusal', 'platform-configuration', 'unknown'));
ALTER TABLE accounts.generation_run ADD CONSTRAINT generation_run_billed CHECK (billed IN ('no', 'maybe', 'yes'));
ALTER TABLE accounts.generation_call ADD CONSTRAINT generation_call_role CHECK (role IN ('draft', 'repair', 'check', 'partition'));
ALTER TABLE accounts.generation_settlement ADD CONSTRAINT generation_settlement_outcome CHECK (outcome IN ('succeeded', 'failed', 'cancelled'));
ALTER TABLE accounts.decision ADD CONSTRAINT decision_type CHECK (type IN ('choose'));
ALTER TABLE accounts.event ADD CONSTRAINT event_type CHECK (type IN ('account.created', 'job.state_changed', 'generation.settled'));
-- END GENERATED VOCABULARY

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['generation', 'job', 'generation_run', 'generation_call', 'generation_settlement', 'capture', 'decision', 'event', 'event_counter'] LOOP
    EXECUTE format('ALTER TABLE accounts.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE accounts.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY account_scope ON accounts.%I
      USING (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid)
      WITH CHECK (account_id = NULLIF(current_setting('aiuteur.account_id', true), '')::uuid)$p$, t);
    IF t NOT IN ('job', 'event_counter') THEN
      EXECUTE format('CREATE TRIGGER append_only_rows BEFORE UPDATE OR DELETE ON accounts.%I FOR EACH ROW EXECUTE FUNCTION accounts.reject_rewrite()', t);
      EXECUTE format('CREATE TRIGGER append_only_truncate BEFORE TRUNCATE ON accounts.%I FOR EACH STATEMENT EXECUTE FUNCTION accounts.reject_rewrite()', t);
    END IF;
  END LOOP;
END $$;

-- The claim functions (RUNTIME §4.2, §5) run as owner and see every Account's Job rows only while this
-- transaction-local flag is set by them; they return ids, states and lease tokens, never tenant content.
CREATE POLICY scheduler_claim ON accounts.job TO owner
  USING (current_setting('aiuteur.claim', true) = 'on')
  WITH CHECK (current_setting('aiuteur.claim', true) = 'on');

-- One claim: due, non-terminal, runnable Jobs (or the one named Job, for the text fast path), oldest due
-- first, exclusive by FOR UPDATE SKIP LOCKED under one transaction-scoped lock. Each gets the lease token
-- and its due time becomes the earlier of lease expiry and the state deadline.
CREATE FUNCTION accounts.job_claim(max_jobs integer, at_time timestamptz, lease_ms integer, token uuid, only_job uuid)
RETURNS TABLE (job_id uuid, account_id uuid, state text, lease_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('aiuteur.job_claim', 0));
  PERFORM set_config('aiuteur.claim', 'on', true);
  RETURN QUERY
    WITH due AS (
      SELECT j.job_id FROM accounts.job j
      WHERE j.due_at <= at_time AND j.state NOT IN ('waiting', 'succeeded', 'failed', 'cancelled')
        AND (only_job IS NULL OR j.job_id = only_job)
      ORDER BY j.due_at, j.job_id
      LIMIT max_jobs
      FOR UPDATE SKIP LOCKED
    )
    UPDATE accounts.job j SET
      lease_token = token,
      lease_expires_at = at_time + make_interval(secs => lease_ms / 1000.0),
      due_at = LEAST(at_time + make_interval(secs => lease_ms / 1000.0), COALESCE(j.deadline_at, 'infinity')),
      updated_at = at_time
    FROM due WHERE j.job_id = due.job_id
    RETURNING j.job_id, j.account_id, j.state, j.lease_token;
  PERFORM set_config('aiuteur.claim', '', true);
END $$;

-- Heartbeat: extends a lease still held by this token.
CREATE FUNCTION accounts.job_extend(job uuid, token uuid, at_time timestamptz, lease_ms integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE n integer;
BEGIN
  PERFORM set_config('aiuteur.claim', 'on', true);
  UPDATE accounts.job j SET
    lease_expires_at = at_time + make_interval(secs => lease_ms / 1000.0),
    due_at = LEAST(at_time + make_interval(secs => lease_ms / 1000.0), COALESCE(j.deadline_at, 'infinity')),
    updated_at = at_time
  WHERE j.job_id = job AND j.lease_token = token AND j.lease_expires_at > at_time AND j.due_at IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('aiuteur.claim', '', true);
  RETURN n = 1;
END $$;

-- Gives a lease back, due again at the given time (now, or later for backoff).
CREATE FUNCTION accounts.job_release(job uuid, token uuid, due timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE n integer;
BEGIN
  PERFORM set_config('aiuteur.claim', 'on', true);
  UPDATE accounts.job j SET lease_token = NULL, lease_expires_at = NULL, due_at = LEAST(due, COALESCE(j.deadline_at, 'infinity'))
  WHERE j.job_id = job AND j.lease_token = token AND j.due_at IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('aiuteur.claim', '', true);
  RETURN n = 1;
END $$;

-- A hint that a Job needs attention now (webhook, cancel, "check now"). Never moves a state.
CREATE FUNCTION accounts.job_wake(job uuid, at_time timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE n integer;
BEGIN
  PERFORM set_config('aiuteur.claim', 'on', true);
  UPDATE accounts.job j SET due_at = LEAST(j.due_at, at_time)
  WHERE j.job_id = job AND j.due_at IS NOT NULL AND (j.lease_expires_at IS NULL OR j.lease_expires_at <= at_time);
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('aiuteur.claim', '', true);
  RETURN n = 1;
END $$;

REVOKE ALL ON FUNCTION accounts.job_claim(integer, timestamptz, integer, uuid, uuid), accounts.job_extend(uuid, uuid, timestamptz, integer), accounts.job_release(uuid, uuid, timestamptz), accounts.job_wake(uuid, timestamptz) FROM PUBLIC;
GRANT USAGE ON SCHEMA accounts TO scheduler;
GRANT EXECUTE ON FUNCTION accounts.job_claim(integer, timestamptz, integer, uuid, uuid), accounts.job_extend(uuid, uuid, timestamptz, integer), accounts.job_release(uuid, uuid, timestamptz), accounts.job_wake(uuid, timestamptz) TO scheduler;

GRANT SELECT, INSERT ON accounts.generation, accounts.job, accounts.generation_run, accounts.generation_call, accounts.generation_settlement, accounts.capture, accounts.decision, accounts.event, accounts.event_counter TO app;
GRANT UPDATE (state, due_at, deadline_at, lease_token, lease_expires_at, operation_ref, failure_class, billed, reason, updated_at) ON accounts.job TO app;
GRANT UPDATE (next) ON accounts.event_counter TO app;
GRANT SELECT ON ALL TABLES IN SCHEMA accounts TO backup;
