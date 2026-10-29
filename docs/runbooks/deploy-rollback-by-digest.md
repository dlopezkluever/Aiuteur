# Runbook: deploy and roll back staging by image digest

Owner: platform. Authority: OPERATIONAL-BASELINE §4.2 and §9, issue #107. Applies to the staging VPS (`/srv/aiuteur`). Production is a later ticket.

## What is deployed

One image, built once by the `release-staging` workflow after the required `verify` check passed on `main`. It is named only by its digest (`ghcr.io/<owner>/<repo>@sha256:<64 hex>`). The host never builds, never retags, and refuses a tag, `latest` or a commit id.

## Deploy

The `release-staging` workflow does this on every green push to `main`. By hand: `IMAGE_REPOSITORY=... /srv/aiuteur/release/deploy.sh deploy sha256:...`.

1. Pull the digest and check the local image carries it.
2. Start Postgres and run the migration chain under the owner identity (`/etc/aiuteur/staging.owner.env`, present in no running container). Migrations are forward-only and expand/contract.
3. **Previous-image compatibility smoke.** Start the previous digest's `web` on the migrated schema and run its own smoke. A failure stops the deploy before anything is swapped.
4. Swap `web` and `worker` to the new digest, wait for health, run the smoke.
5. If the smoke fails after the swap, the script redeploys the previous digest and exits non-zero.
6. Record `current` and `previous` in `/srv/aiuteur/state`, and append one JSON line to `history.jsonl` and to the pipeline log (`EVIDENCE {...}`: `deployed`, `restored`, `replaced`).

## Roll back

Run the `rollback-staging` workflow (empty `digest` restores the recorded previous one), or `deploy.sh rollback [sha256:...]` on the host. It pulls that digest, swaps, runs the smoke and records `restored` and `replaced`. It runs no migration: the schema works with the previous image (step 3 proves it for the last release).

## Read the state

- `cat /srv/aiuteur/state/current /srv/aiuteur/state/previous`
- `tail /srv/aiuteur/state/history.jsonl`
- `curl https://<staging host>/healthz/deep` reports `release` (the running digest), `database` and `fakeOfferings`.

## If the host is gone

Rebuild a VPS from the owner checklist in `change-records/T0-10.md`, restore the database from off-machine backups (OPERATIONAL-BASELINE §8, another ticket), and run `deploy.sh deploy <digest>` with the digest from the last `history.jsonl` or pipeline log.
