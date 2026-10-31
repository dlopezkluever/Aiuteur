# Runbook: deploy and roll back staging by image digest

Owner: platform. Authority: OPERATIONAL-BASELINE §4.2 and §9, issue #107. Applies to the staging VPS (`/srv/aiuteur`). Production is a later ticket.

## What is deployed

One image, built once by the `release-staging` workflow after the required `verify` check passed on `main`. It is named only by its digest (`ghcr.io/<owner>/<repo>@sha256:<64 hex>`). The host never builds, never retags, and refuses a tag, `latest` or a commit id.

## Host files (root, mode 0600, never in the repository)

| File in `/etc/aiuteur` | Read by | Holds |
|---|---|---|
| `postgres.env` | the `postgres` container | the bootstrap password |
| `owner.env` | the migration container, for one run | the bootstrap URL and the three runtime role passwords |
| `web.env` | `web` (and the compatibility `web`) | `app`, `identity` and `scheduler` URLs, auth secret, SMTP, R2, error tracker DSN, health thresholds |
| `worker.env` | `worker` | `scheduler` URL, error tracker DSN, heartbeat URL |
| `smoke.env` | the smoke command only | the smoke Account's login and id |
| `compose.env` | compose interpolation | the public host name, no secret |

Examples: `deploy/env/*.example`. A process refuses to start when it finds a variable that belongs to another role, an owner or smoke value, or a database URL that does not name its own least-privilege role. Postgres accepts no connection without a password.

## One-time: the smoke Account

With the files above in place: `deploy.sh smoke-account <digest>` migrates, sets the role passwords and creates the smoke Account, and prints `SMOKE_ACCOUNT_ID=...`. Put that line in `smoke.env`. The smoke signs in as this Account.

## Deploy

The `release-staging` workflow does this on every green push to `main`. By hand: `IMAGE_REPOSITORY=... /srv/aiuteur/release/deploy.sh deploy sha256:...`.

1. Pull the digest and check the local image carries it.
2. Start Postgres and run the migration chain and the role passwords under the bootstrap identity (`owner.env`). Migrations are forward-only and expand/contract.
3. **Previous-image compatibility smoke.** Start the previous digest's `web` on the migrated schema and run its own smoke. A failure stops the deploy before anything is swapped.
4. Swap `web` and `worker` to the new digest, wait for health, run the smoke, and check both containers run exactly that digest.
5. The smoke is: deep health green, unauthenticated refusal, sign-in as the smoke Account, a project and pasted Source Material, a Treatment draft run by the fake provider to a settled Generation and its Option, then the event stream read from the start, reconnected with `Last-Event-ID` (exactly the later events) and reconnected at the head (none).
6. If step 4 fails, the script redeploys the previous digest and records it only after it is verified running. If that also fails, `state/current` becomes `unknown`, `state/attempted` names the digest being swapped in, and `deploy` refuses until a rollback succeeds.
7. Every event prints `EVIDENCE {...}` and appends it to `state/history.jsonl`: `attempted`, `deployed`, `restored`, `replaced` and `running` (a digest, or `unknown`). `deployed` and `restored` are set only for a digest verified running.

## Roll back

Run the `rollback-staging` workflow (empty `digest` restores the recorded previous one), or `deploy.sh rollback [sha256:...]` on the host. Only a digest listed in `state/deployed` (one that has run here) is accepted; any other is refused before Docker is touched. It pulls that digest, swaps, runs the smoke and records `restored` and `replaced`. It runs no migration: the schema works with the previous image (step 3 proves it for the last release).

## Read the state

- `cat /srv/aiuteur/state/current /srv/aiuteur/state/previous /srv/aiuteur/state/deployed`
- `tail /srv/aiuteur/state/history.jsonl`
- `curl https://<staging host>/healthz/deep` reports `release`, `database`, `fakeOfferings`, the worker's age (`worker`: fresh, stale, never) and the oldest overdue work (`overdue`). It is red when the worker has not ticked within `WORKER_STALE_AFTER_MS` or work is overdue past `OVERDUE_AFTER_MS`.

## If the host is gone

Rebuild a VPS from the owner checklist in `change-records/T0-10.md`, restore the database from off-machine backups (OPERATIONAL-BASELINE §8, another ticket), and run `deploy.sh smoke-account` then `deploy.sh deploy <digest>` with the digest from the last `history.jsonl` or pipeline log.
