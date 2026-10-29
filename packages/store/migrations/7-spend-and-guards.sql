SET LOCAL ROLE owner;

-- #103 (T0-06). Classification: additions to two tenant tables that are already append-only and forced-RLS.
-- `input_fingerprint` is the duplicate guard's key (JOB-LIFECYCLE §4; GENERATION-PACKAGE §3): hash(target, Rendered request
-- digest), written once with the Generation. A Generation recorded before this migration has none, so it matches nothing.
-- `rendered_request` is the exact input of a call that is not the Generation's own request (the repair call, PACKAGE §11).
ALTER TABLE accounts.generation ADD COLUMN input_fingerprint text NOT NULL DEFAULT '';
ALTER TABLE accounts.generation ALTER COLUMN input_fingerprint DROP DEFAULT;
ALTER TABLE accounts.generation_call ADD COLUMN rendered_request jsonb;

-- "Is an identical request in progress?" and "what has this Account committed this period?" both run in the creating
-- transaction (BUSINESS §6.3), so each reads one Account's rows by the key it needs.
CREATE INDEX generation_input_fingerprint ON accounts.generation (account_id, input_fingerprint);
CREATE INDEX generation_created ON accounts.generation (account_id, created_at);
