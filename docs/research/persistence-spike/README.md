# Persistence spike for Wayfinder #72 (throwaway, never merged)

Evidence for `docs/architecture/PERSISTENCE-AND-MEDIA.md` §12 on `main`. Not an implementation and not a product benchmark.

- `schema.sql`: minimal spine (identity, revision, attempt, capture, unit_head, slot_state, ack, job) with forced row-level security, composite foreign keys, an append-only trigger with a purge flag, and a definer `claim_job()` that returns ids only.
- `run.py`: seeds two Accounts, runs the isolation refusals as a non-owner role, times the Board and impact queries at 250 shots (and a 5x history project), demonstrates the shared/exclusive project gate ordering, then duplicates and purges a project set-based.
- `size.py`: table sizes and the full-snapshot document experiment.

Run (paths are hard-coded to `/tmp/pgspike`): `uv venv .venv && uv pip install pgserver psycopg2-binary`, put the files in `/tmp/pgspike`, then `.venv/bin/python -I run.py`. `pgserver` ships a real PostgreSQL 16.2.

Limits: one machine, local socket, warm cache, synthetic uniform data, 200-byte payloads, a simplified Board query. Measured 2026-10-21.
