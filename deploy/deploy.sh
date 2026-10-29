#!/usr/bin/env bash
# Deploy or roll back the staging VPS by image digest (OPERATIONAL-BASELINE §4.2; issue #107).
#   deploy.sh deploy <sha256:digest>     migrate, previous-image compatibility smoke, swap, smoke; restore the prior digest if the swap fails
#   deploy.sh rollback [<sha256:digest>] redeploy a prior digest (default: the recorded previous one); no build, no migration
# Only a digest is accepted: a tag, `latest` or a bare commit is refused. Nothing is built or retagged here.
set -euo pipefail

DOCKER=${DOCKER:-docker}
HOME_DIR=${AIUTEUR_HOME:-/srv/aiuteur}
REPO=${IMAGE_REPOSITORY:?IMAGE_REPOSITORY is required}
ENV_FILE=${ENV_FILE:-/etc/aiuteur/staging.env}
OWNER_ENV_FILE=${OWNER_ENV_FILE:-/etc/aiuteur/staging.owner.env}
COMPOSE_FILE=${COMPOSE_FILE:-$HOME_DIR/release/compose.staging.yml}
PROJECT=aiuteur-staging
STATE=$HOME_DIR/state
DIGEST_RE='^sha256:[0-9a-f]{64}$'

die() { echo "deploy: $*" >&2; exit 1; }
valid() { [[ $1 =~ $DIGEST_RE ]] || die "'$1' is not an image digest (sha256: and 64 hex digits); tags are refused"; }
read_state() { [[ -s $STATE/$1 ]] && cat "$STATE/$1" || true; }
write_state() { printf '%s\n' "$2" > "$STATE/$1"; }

mkdir -p "$STATE"
exec 9>"$STATE/lock"
flock -n 9 || die "another deploy or rollback is running"

# Evidence: one JSON line per event, in the host history and in the pipeline log. Every value is a validated digest or a fixed word.
event() { # action result deployed restored replaced
  local line
  line=$(printf '{"time":"%s","environment":"staging","action":"%s","result":"%s","deployed":"%s","restored":"%s","replaced":"%s"}' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "$3" "$4" "$5")
  echo "$line" >> "$STATE/history.jsonl"
  echo "EVIDENCE $line"
}

compose() { # digest args...
  local digest=$1; shift
  IMAGE_REF="$REPO@$digest" RELEASE_DIGEST=$digest ENV_FILE=$ENV_FILE "$DOCKER" compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# Pull by digest (the registry verifies the content against it), then require that the local image carries exactly that digest.
fetch() {
  local ref="$REPO@$1"
  "$DOCKER" pull "$ref" > /dev/null || return 1
  "$DOCKER" image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$ref" | grep -Fxq "$ref"
}

migrate() { # forward-only, expand/contract, under the owner identity that exists only here
  compose "$1" up -d --wait postgres || return 1
  "$DOCKER" run --rm --network "${PROJECT}_default" --env-file "$OWNER_ENV_FILE" "$REPO@$1" node packages/store/scripts/migrate.ts
}

SMOKE=(node packages/platform/scripts/smoke.ts http://127.0.0.1:8080)

# The previous image's own web and smoke, against the schema the new image just migrated (expand/contract proof; VERIFICATION §6).
compat() { # previous digest
  local previous=$1 ok=1 name=aiuteur-compat
  "$DOCKER" rm -f "$name" > /dev/null 2>&1 || true
  "$DOCKER" run -d --name "$name" --network "${PROJECT}_default" --env-file "$ENV_FILE" \
    -e AIUTEUR_ENVIRONMENT=staging -e "RELEASE_DIGEST=$previous" -e PORT=8080 \
    "$REPO@$previous" node packages/platform/scripts/web.ts > /dev/null || ok=0
  if [[ $ok == 1 ]]; then
    ok=0
    for _ in $(seq 1 ${COMPAT_ATTEMPTS:-30}); do
      if "$DOCKER" exec "$name" "${SMOKE[@]}"; then ok=1; break; fi
      sleep 1
    done
  fi
  "$DOCKER" rm -f "$name" > /dev/null 2>&1 || true
  [[ $ok == 1 ]]
}

activate() { # digest: web and worker run this digest and pass the smoke
  compose "$1" up -d --wait --remove-orphans || return 1
  local ok=0
  for _ in $(seq 1 ${SMOKE_ATTEMPTS:-30}); do
    if compose "$1" exec -T web "${SMOKE[@]}"; then ok=1; break; fi
    sleep 1
  done
  [[ $ok == 1 ]] || return 1
  local web
  web=$(compose "$1" ps -q web 2> /dev/null || true)
  echo "running web image: $("$DOCKER" inspect --format '{{.Config.Image}}' "$web" 2> /dev/null || echo unknown)"
}

deploy() {
  local new=$1 current
  valid "$new"
  current=$(read_state current)
  fetch "$new" || die "could not pull $REPO@$new at that digest"
  migrate "$new" || { event deploy migration-failed "$new" "" "$current"; die "migration failed; nothing was swapped"; }
  if [[ -n $current && $current != "$new" ]]; then
    compat "$current" || { event deploy compatibility-failed "$new" "" "$current"; die "previous image $current failed its smoke on the new schema; nothing was swapped"; }
    echo "previous-image compatibility smoke passed: $current on the schema of $new"
  fi
  if ! activate "$new"; then
    if [[ -n $current && $current != "$new" ]]; then
      echo "deploy: $new failed its smoke; restoring $current" >&2
      if fetch "$current" && activate "$current"; then event auto-rollback restored "" "$current" "$new"; else event auto-rollback restore-failed "" "$current" "$new"; fi
    fi
    event deploy smoke-failed "$new" "" "$current"
    die "$new failed its smoke after the swap"
  fi
  [[ -n $current && $current != "$new" ]] && write_state previous "$current"
  write_state current "$new"
  event deploy succeeded "$new" "" "$current"
}

rollback() {
  local current target=${1:-}
  current=$(read_state current)
  [[ -n $target ]] || target=$(read_state previous)
  [[ -n $target ]] || die "no previous digest is recorded; pass the digest to restore"
  valid "$target"
  fetch "$target" || die "could not pull $REPO@$target at that digest"
  activate "$target" || { event rollback smoke-failed "" "$target" "$current"; die "$target failed its smoke after the rollback"; }
  [[ -n $current && $current != "$target" ]] && write_state previous "$current"
  write_state current "$target"
  event rollback succeeded "" "$target" "$current"
}

case "${1:-}" in
  deploy) [[ $# -eq 2 ]] || die "usage: deploy.sh deploy <sha256:digest>"; deploy "$2" ;;
  rollback) [[ $# -le 2 ]] || die "usage: deploy.sh rollback [<sha256:digest>]"; rollback "${2:-}" ;;
  *) die "usage: deploy.sh deploy <sha256:digest> | rollback [<sha256:digest>]" ;;
esac
