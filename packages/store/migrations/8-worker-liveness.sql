SET LOCAL ROLE owner;

-- The liveness signal behind `/healthz/deep` (OPERATIONAL-BASELINE §7.2; RUNTIME-PLATFORM §7). Operator-scoped, content-free
-- and additive: the previous image neither reads nor writes it, so a rollback is safe.
--   * `operator.worker_tick`: one row, the time of the worker's last healthy tick, written by the worker through the
--     `scheduler` identity and read back by `web` through the same identity.
--   * `operator.liveness()`: the age of that tick and the age of the oldest overdue Job, as numbers only.
CREATE TABLE operator.worker_tick (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  last_tick_at timestamptz NOT NULL
);
GRANT SELECT ON operator.worker_tick TO backup;

CREATE FUNCTION operator.worker_tick() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $$
  INSERT INTO operator.worker_tick (singleton, last_tick_at) VALUES (true, clock_timestamp())
  ON CONFLICT (singleton) DO UPDATE SET last_tick_at = EXCLUDED.last_tick_at
$$;

-- Ages in milliseconds by the database's own clock, so web and worker cannot disagree about time. `oldest_overdue_ms` is
-- measured over the work the claim takes unconditionally (in flight, local, past its admission deadline); a provider Job
-- queued behind an admission cap is waiting by design and is not overdue. Tenant rows are visible only inside this
-- function, through the claim flag, and only counts of time leave it.
CREATE FUNCTION operator.liveness() RETURNS TABLE (worker_age_ms bigint, oldest_overdue_ms bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  now_at timestamptz := clock_timestamp();
BEGIN
  PERFORM set_config('aiuteur.claim', 'on', true);
  RETURN QUERY SELECT
    (SELECT floor(extract(epoch FROM now_at - t.last_tick_at) * 1000)::bigint FROM operator.worker_tick t),
    (SELECT floor(extract(epoch FROM now_at - min(j.due_at)) * 1000)::bigint FROM accounts.job j
      WHERE j.due_at <= now_at AND j.state NOT IN ('waiting', 'succeeded', 'failed', 'cancelled')
        AND (j.lease_expires_at IS NULL OR j.lease_expires_at <= now_at)
        AND (j.state <> 'queued' OR j.class = 'local' OR j.deadline_at <= now_at));
  PERFORM set_config('aiuteur.claim', '', true);
END $$;

REVOKE ALL ON FUNCTION operator.worker_tick(), operator.liveness() FROM PUBLIC;
GRANT USAGE ON SCHEMA operator TO scheduler;
GRANT EXECUTE ON FUNCTION operator.worker_tick(), operator.liveness() TO scheduler;
