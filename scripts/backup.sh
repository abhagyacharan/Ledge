#!/bin/sh
# Nightly database backup (CLAUDE.md §12). Runs inside the `backup` container of docker-compose.yml
# (postgres:18-alpine, so pg_dump always matches the database version), or by hand:
#
#   docker compose run --rm --entrypoint "sh /backup.sh once" backup
#
#   sh backup.sh once   take one backup now, then prune old ones
#   sh backup.sh loop   take a backup every day at BACKUP_AT (UTC, default 21:00 = 02:30 India time)
#
# Files: /backups/daily/ledge-YYYY-MM-DD-HHMM.sql.gz (newest 14 kept, weekly on Sundays:
# /backups/weekly/ledge-YYYY-Www.sql.gz, newest 8 kept). A backup on the same disk is NOT enough:
# copy ./backups somewhere else (docs/deploy-guide.md, "Copy backups off the machine").
#
# Connection settings come from the standard PGHOST, PGUSER, PGPASSWORD and PGDATABASE variables.
set -eu

BACKUP_DIR=${BACKUP_DIR:-/backups}
KEEP_DAILY=${KEEP_DAILY:-14}
KEEP_WEEKLY=${KEEP_WEEKLY:-8}
BACKUP_AT=${BACKUP_AT:-21:00}
DAILY="$BACKUP_DIR/daily"
WEEKLY="$BACKUP_DIR/weekly"

log() { echo "$(date -u '+%Y-%m-%d %H:%M:%SZ') backup: $*"; }

prune() { # prune <dir> <how many to keep>
  # shellcheck disable=SC2012  # file names are ours: no spaces or odd characters
  ls -1t "$1"/ledge-*.sql.gz 2>/dev/null | tail -n +"$(($2 + 1))" | xargs -r rm -f
}

run_backup() {
  mkdir -p "$DAILY" "$WEEKLY"
  stamp=$(date -u +%Y-%m-%d-%H%M)
  sql="$DAILY/.ledge-$stamp.sql.part"
  out="$DAILY/ledge-$stamp.sql.gz"

  # Two steps (not a pipe) so a pg_dump failure cannot be hidden by gzip succeeding.
  if ! pg_dump --no-owner --no-privileges --file="$sql"; then
    rm -f "$sql"
    log "FAILED: pg_dump returned an error"
    return 1
  fi
  gzip -9 "$sql"
  mv "$sql.gz" "$out"
  if ! gzip -t "$out" || [ "$(wc -c <"$out")" -lt 500 ]; then
    rm -f "$out"
    log "FAILED: the dump is empty or damaged"
    return 1
  fi
  log "wrote $out ($(wc -c <"$out") bytes)"

  # Sundays also feed the weekly set.
  if [ "$(date -u +%u)" = "7" ]; then
    cp "$out" "$WEEKLY/ledge-$(date -u +%G-W%V).sql.gz"
    log "copied to the weekly set"
  fi

  prune "$DAILY" "$KEEP_DAILY"
  prune "$WEEKLY" "$KEEP_WEEKLY"
}

seconds_until() { # seconds from now until the next HH:MM UTC
  hour=${1%:*}
  minute=${1#*:}
  hour=$(echo "$hour" | sed 's/^0*//')
  minute=$(echo "$minute" | sed 's/^0*//')
  target=$((${hour:-0} * 3600 + ${minute:-0} * 60))
  now=$(($(date -u +%s) % 86400))
  wait=$(((target - now + 86400) % 86400))
  [ "$wait" -eq 0 ] && wait=86400
  echo "$wait"
}

case "${1:-once}" in
  once)
    run_backup
    ;;
  loop)
    log "started: a backup every day at $BACKUP_AT UTC; keeping $KEEP_DAILY daily and $KEEP_WEEKLY weekly"
    # A fresh install, or a server that was off overnight, should not wait a whole day.
    mkdir -p "$DAILY"
    if [ -z "$(find "$DAILY" -name 'ledge-*.sql.gz' -mmin -1440 2>/dev/null)" ]; then
      run_backup || log "will try again at the next scheduled time"
    fi
    while true; do
      wait=$(seconds_until "$BACKUP_AT")
      log "next backup in $wait seconds"
      sleep "$wait"
      run_backup || log "will try again tomorrow"
    done
    ;;
  *)
    echo "usage: sh backup.sh once|loop" >&2
    exit 2
    ;;
esac
