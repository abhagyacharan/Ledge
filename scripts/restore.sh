#!/bin/sh
# Restore a Ledge backup (CLAUDE.md §12). Run from the project folder on the server, where
# docker-compose.yml and .env are. Full explanation: docs/deploy-guide.md, "Restore a backup".
#
#   sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz
#       Safe practice run: loads the backup into a scratch database called ledge_restore_test and
#       prints row counts. The live database is not touched.
#
#   sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz --live
#       The real thing. Stops the app, REPLACES the live database with the backup, starts the app.
#       Asks you to type RESTORE first. Everything saved after the backup is lost.
set -eu

file=${1:-}
mode=${2:-scratch}

if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "usage: sh scripts/restore.sh <backup.sql.gz> [--live]" >&2
  exit 2
fi
gzip -t "$file" || { echo "That file is damaged (gzip test failed). Try an older backup." >&2; exit 1; }

# Run psql inside the database container as its own user, against the database named in $1.
# Remaining arguments go to psql; SQL read from standard input is passed through.
psql_in() {
  target=$1
  shift
  docker compose exec -T -e TARGET_DB="$target" db sh -c \
    'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$TARGET_DB" "$@"' sh "$@"
}

# Commands that do not need standard input read /dev/null, so docker cannot swallow what you type.
live_db=$(docker compose exec -T db sh -c 'printf %s "$POSTGRES_DB"' </dev/null)

recreate() { # recreate <name>: an empty database, replacing any with that name
  psql_in postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$1' AND pid <> pg_backend_pid()" \
    </dev/null >/dev/null
  psql_in postgres -c "DROP DATABASE IF EXISTS \"$1\"" -c "CREATE DATABASE \"$1\"" </dev/null
}

load() { # load <name>: the backup into that (empty) database
  gunzip -c "$file" | psql_in "$1" >/dev/null
}

counts() { # counts <name>: a quick sanity check that real data came back
  psql_in "$1" -At -c "
    SELECT 'users: ' || count(*) FROM \"user\"
    UNION ALL SELECT 'lists: ' || count(*) FROM lists
    UNION ALL SELECT 'tasks: ' || count(*) FROM tasks
    UNION ALL SELECT 'money entries: ' || count(*) FROM finance_entries" </dev/null
}

case "$mode" in
  scratch)
    scratch=ledge_restore_test
    echo "Restoring $file into the scratch database '$scratch' (the live database is untouched)..."
    recreate "$scratch"
    load "$scratch"
    echo "Done. What is in the restored copy:"
    counts "$scratch"
    echo "Delete the practice copy when you are happy:"
    echo "  docker compose exec db sh -c 'psql -U \"\$POSTGRES_USER\" -d postgres -c \"DROP DATABASE $scratch\"'"
    ;;
  --live)
    echo "This REPLACES the live database '$live_db' with:"
    echo "  $file"
    echo "Everything saved after that backup was taken will be lost."
    printf "Type RESTORE to continue: "
    answer=""
    read -r answer || true
    [ "$answer" = "RESTORE" ] || { echo "Cancelled."; exit 1; }
    docker compose stop app </dev/null
    recreate "$live_db"
    load "$live_db"
    docker compose start app </dev/null
    echo "Done. The live database now matches the backup:"
    counts "$live_db"
    ;;
  *)
    echo "unknown option '$mode' (use --live or nothing)" >&2
    exit 2
    ;;
esac
