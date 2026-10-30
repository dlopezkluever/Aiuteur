#!/usr/bin/env bash
# Deploy or roll back the staging VPS by image digest (OPERATIONAL-BASELINE §4.2; issue #107).
#   deploy.sh deploy <sha256:digest>     migrate, previous-image compatibility smoke, swap, smoke; restore the prior digest if the swap fails
#   deploy.sh smoke-account <sha256:digest>  one-time: migrate and create the smoke Account; prints SMOKE_ACCOUNT_ID for smoke.env
#   deploy.sh rollback [<sha256:digest>] redeploy a digest this host has already deployed (default: the recorded previous one); no build, no migration
# Only a digest is accepted: a tag, `latest` or a bare commit is refused. Nothing is built or retagged here.
#
# State (in $AIUTEUR_HOME/state) records what is CONFIRMED running, never what was intended:
#   current    the digest whose web and worker were verified running and passed the smoke, or the word `unknown`
#   previous   the digest that `current` replaced
#   deployed   every digest that was ever confirmed running here; the only digests a rollback may restore
#   attempted  the digest being swapped in when `current` became unknown
#   history.jsonl, and one EVIDENCE line per event on stdout
set -euo pipefail

DOCKER=${DOCKER:-docker}
HOME_DIR=${AIUTEUR_HOME:-/srv/aiuteur}
REPO=${IMAGE_REPOSITORY:?IMAGE_REPOSITORY is required}
ENV_DIR=${ENV_DIR:-/etc/aiuteur}
COMPOSE_FILE=${COMPOSE_FILE:-$HOME_DIR/release/compose.staging.yml}
PROJECT=aiuteur-staging
STATE=$HOME_DIR/state
DIGEST_RE='^sha256:[0-9a-f]{64}$'

die() { echo "deploy: $*" >&2; exit 1; }
valid() { [[ $1 =~ $DIGEST_RE ]] || die "'$1' is not an image digest (sha256: and 64 hex digits); tags are refused"; }
read_state() { if [[ -s $STATE/$1 ]]; then cat "$STATE/$1"; fi; }
write_state() { printf '%s\n' "$2" > "$STATE/$1"; }
is_deployed() { [[ -f $STATE/deployed ]] && grep -Fxq "$1" "$STATE/deployed"; }
mark_deployed() { is_deployed "$1" || printf '%s\n' "$1" >> "$STATE/deployed"; }
# The swap may have changed what runs and could not be undone: say so, and block deploys until a rollback confirms a digest.
mark_unknown() { write_state current unknown; write_state attempted "$1"; }

mkdir -p "$STATE"
exec 9>"$STATE/lock"
flock -n 9 || die "another deploy or rollback is running"

# Evidence: one JSON line per event. `attempted` is what the event tried; `deployed` and `restored` are set only when that
# digest was verified running; `running` is the digest known to be running afterwards, or `unknown`.
event() { # action result attempted deployed restored replaced running
  local line
  line=$(printf '{"time":"%s","environment":"staging","action":"%s","result":"%s","attempted":"%s","deployed":"%s","restored":"%s","replaced":"%s","running":"%s"}' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "$3" "$4" "$5" "$6" "$7")
  echo "$line" >> "$STATE/history.jsonl"
  echo "EVIDENCE $line"
}

compose() { # digest args...
  local digest=$1; shift
  IMAGE_REF="$REPO@$digest" RELEASE_DIGEST=$digest \
    WEB_ENV_FILE=$ENV_DIR/web.env WORKER_ENV_FILE=$ENV_DIR/worker.env POSTGRES_ENV_FILE=$ENV_DIR/postgres.env \
    "$DOCKER" compose -p "$PROJECT" --env-file "$ENV_DIR/compose.env" -f "$COMPOSE_FILE" "$@"
}

# Pull by digest (the registry verifies the content against it), then require that the local image carries exactly that digest.
fetch() {
  local ref="$REPO@$1"
  "$DOCKER" pull "$ref" > /dev/null || return 1
  "$DOCKER" image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$ref" | grep -Fxq "$ref"
}

# Forward-only, expand/contract migrations and the runtime role passwords, under the bootstrap identity that exists only in
# owner.env and only for this one container.
migrate() {
  compose "$1" up -d --wait postgres || return 1
  "$DOCKER" run --rm --network "${PROJECT}_default" --env-file "$ENV_DIR/owner.env" "$REPO@$1" node packages/store/scripts/migrate.ts
}

SMOKE=(node packages/platform/scripts/smoke.ts http://127.0.0.1:8080)

# Runs the image's own smoke inside the container, with the smoke login given to that one command. Exit 3 is "not ready yet".
smoke_in() { # container
  local rc
  for _ in $(seq 1 "${SMOKE_ATTEMPTS:-30}"); do
    rc=0
    "$DOCKER" exec --env-file "$ENV_DIR/smoke.env" "$1" "${SMOKE[@]}" || rc=$?
    [[ $rc == 0 ]] && return 0
    [[ $rc == 3 ]] || return 1
    sleep 1
  done
  return 1
}

# The previous image's own web and smoke, against the schema the new image just migrated (expand/contract proof; VERIFICATION §6).
compat() { # previous digest
  local previous=$1 ok=1 name=aiuteur-compat
  "$DOCKER" rm -f "$name" > /dev/null 2>&1 || true
  "$DOCKER" run -d --name "$name" --network "${PROJECT}_default" --env-file "$ENV_DIR/web.env" \
    -e AIUTEUR_ENVIRONMENT=staging -e "RELEASE_DIGEST=$previous" -e PORT=8080 \
    "$REPO@$previous" node packages/platform/scripts/web.ts > /dev/null || ok=0
  if [[ $ok == 1 ]]; then smoke_in "$name" || ok=0; fi
  "$DOCKER" rm -f "$name" > /dev/null 2>&1 || true
  [[ $ok == 1 ]]
}

# Succeeds only when web and worker are running exactly this digest and web passes the smoke. Nothing is recorded here.
activate() { # digest
  compose "$1" up -d --wait --remove-orphans || return 1
  local web svc id
  web=$(compose "$1" ps -q web 2> /dev/null || true)
  [[ -n $web ]] || return 1
  smoke_in "$web" || return 1
  for svc in web worker; do
    id=$(compose "$1" ps -q "$svc" 2> /dev/null || true)
    [[ -n $id && $("$DOCKER" inspect --format '{{.Config.Image}}' "$id" 2> /dev/null) == "$REPO@$1" ]] || { echo "deploy: $svc is not running $REPO@$1" >&2; return 1; }
  done
  echo "running web and worker image: $REPO@$1"
}

deploy() {
  local new=$1 current
  valid "$new"
  current=$(read_state current)
  [[ $current != unknown ]] || die "the running digest is unknown after a failed swap; run 'rollback <digest>' with a digest from $STATE/deployed first"
  fetch "$new" || die "could not pull $REPO@$new at that digest"
  migrate "$new" || { event deploy migration-failed "$new" "" "" "$current" "${current:-none}"; die "migration failed; nothing was swapped"; }
  if [[ -n $current && $current != "$new" ]]; then
    compat "$current" || { event deploy compatibility-failed "$new" "" "" "$current" "$current"; die "previous image $current failed its smoke on the new schema; nothing was swapped"; }
    echo "previous-image compatibility smoke passed: $current on the schema of $new"
  fi
  if ! activate "$new"; then
    if [[ -n $current && $current != "$new" ]]; then
      echo "deploy: $new failed after the swap; restoring $current" >&2
      if fetch "$current" && activate "$current"; then
        # Confirmed: the prior digest is running again, so the recorded state stays exactly as it was.
        event auto-rollback restored "$current" "" "$current" "$new" "$current"
        event deploy smoke-failed "$new" "" "" "$current" "$current"
      else
        mark_unknown "$new"
        event auto-rollback restore-failed "$current" "" "" "$new" unknown
        event deploy smoke-failed "$new" "" "" "$current" unknown
      fi
    else
      mark_unknown "$new"
      event deploy smoke-failed "$new" "" "" "$current" unknown
    fi
    die "$new failed its smoke after the swap"
  fi
  if [[ -n $current && $current != "$new" ]]; then write_state previous "$current"; fi
  write_state current "$new"
  rm -f "$STATE/attempted"
  mark_deployed "$new"
  event deploy succeeded "$new" "$new" "" "$current" "$new"
}

rollback() {
  local current target=${1:-}
  current=$(read_state current)
  [[ -n $target ]] || target=$(read_state previous)
  [[ -n $target ]] || die "no previous digest is recorded; pass a digest from $STATE/deployed"
  valid "$target"
  is_deployed "$target" || die "$target was never deployed by this host; a rollback restores only a release that has run here"
  fetch "$target" || die "could not pull $REPO@$target at that digest"
  if ! activate "$target"; then
    mark_unknown "$target"
    event rollback activation-failed "$target" "" "" "${current:-none}" unknown
    die "$target did not come up after the rollback"
  fi
  if [[ -n $current && $current != unknown && $current != "$target" ]]; then write_state previous "$current"; fi
  write_state current "$target"
  rm -f "$STATE/attempted"
  event rollback succeeded "$target" "" "$target" "${current:-none}" "$target"
}

smoke_account() { # digest
  valid "$1"
  fetch "$1" || die "could not pull $REPO@$1 at that digest"
  migrate "$1" || die "migration failed"
  "$DOCKER" run --rm --network "${PROJECT}_default" --env-file "$ENV_DIR/web.env" --env-file "$ENV_DIR/smoke.env" "$REPO@$1" node packages/platform/scripts/smoke-account.ts
}

case "${1:-}" in
  smoke-account) [[ $# -eq 2 ]] || die "usage: deploy.sh smoke-account <sha256:digest>"; smoke_account "$2" ;;
  deploy) [[ $# -eq 2 ]] || die "usage: deploy.sh deploy <sha256:digest>"; deploy "$2" ;;
  rollback) [[ $# -le 2 ]] || die "usage: deploy.sh rollback [<sha256:digest>]"; rollback "${2:-}" ;;
  *) die "usage: deploy.sh deploy <sha256:digest> | rollback [<sha256:digest>]" ;;
esac
