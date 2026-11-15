#!/bin/sh
# Update Ledge on the server in one go (docs/deploy-guide.md §10):
#   1. a safety backup (stops here if it fails, so nothing changes without one)
#   2. git pull (fast-forward only: never makes a merge on the server)
#   3. rebuild and restart (migrations run on their own as the `migrate` step)
#   4. wait until /api/health answers, so you know the new version is really up
#   5. remove old images to free disk space
#
# Usage, from anywhere:  sh ~/ledge/scripts/deploy.sh
# Skip the backup (only if you made one a minute ago):  sh ~/ledge/scripts/deploy.sh --skip-backup
#
# Everything runs inside main(), so the shell reads the whole file before it starts. That matters
# because step 2 can replace this very file while it is running.

set -eu

main() {
  skip_backup=false
  for arg in "$@"; do
    case "$arg" in
      --skip-backup) skip_backup=true ;;
      -h | --help)
        sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
      *)
        echo "Unknown option: $arg (try --help)" >&2
        exit 2
        ;;
    esac
  done

  # The repository folder is the one above this script, wherever it was called from.
  cd "$(dirname "$0")/.."
  step() { printf '\n==> %s\n' "$1"; }

  if [ ! -f .env ]; then
    echo "No .env in $(pwd). Run this from the server's Ledge folder." >&2
    exit 1
  fi

  # Refuse to pull over edits made on the server; they would block or be mixed in.
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "There are uncommitted changes in $(pwd):" >&2
    git status --short --untracked-files=no >&2
    echo "Undo them (git restore <file>) or ask about them first. Nothing was changed." >&2
    exit 1
  fi

  if [ "$skip_backup" = true ]; then
    step "Skipping the safety backup (--skip-backup)"
  else
    step "1/5 Safety backup"
    docker compose run --rm --entrypoint "sh /backup.sh once" backup
  fi

  step "2/5 Getting the latest code"
  before=$(git rev-parse --short HEAD)
  git pull --ff-only
  after=$(git rev-parse --short HEAD)
  if [ "$before" = "$after" ]; then
    echo "Already up to date ($after). Rebuilding anyway, in case settings changed."
  else
    echo "Updated $before -> $after:"
    git log --oneline "$before..$after"
  fi

  step "3/5 Rebuilding and restarting"
  docker compose up -d --build

  step "4/5 Waiting for the app to answer"
  port=$(grep -E '^APP_PORT=' .env 2>/dev/null | tail -n 1 | cut -d= -f2 | tr -d ' "' || true)
  url="http://127.0.0.1:${port:-3000}/api/health"
  healthy=false
  i=0
  while [ "$i" -lt 30 ]; do
    if command -v curl >/dev/null 2>&1; then
      curl -fsS -o /dev/null "$url" 2>/dev/null && healthy=true
    elif command -v wget >/dev/null 2>&1; then
      wget -q -O /dev/null "$url" 2>/dev/null && healthy=true
    else
      echo "Neither curl nor wget is installed; skipping the health check."
      healthy=skipped
    fi
    [ "$healthy" = false ] || break
    i=$((i + 1))
    sleep 2
  done
  if [ "$healthy" = false ]; then
    echo "The app did not answer at $url within a minute." >&2
    echo "Look at: docker compose ps   and   docker compose logs --tail 50 app migrate" >&2
    echo "Old images were kept, in case you need to go back." >&2
    exit 1
  fi
  [ "$healthy" = skipped ] || echo "Healthy: $url"

  step "5/5 Removing old images"
  docker image prune -f

  printf '\nDone. Ledge is running %s.\n' "$after"
}

main "$@"
