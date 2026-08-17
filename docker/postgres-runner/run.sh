#!/bin/bash
set -e

# Initialize temporary postgres cluster
export PGDATA="/tmp/pgcluster"
export PGHOST="/tmp"
export PGPORT="5432"
export PGUSER="postgres"
export PGDATABASE="vpl_db"

if [ ! -d "$PGDATA" ]; then
    initdb -D "$PGDATA" --no-sync -U "$PGUSER" --auth=trust > /dev/null 2>&1
fi

# Start postgres in background
pg_ctl -D "$PGDATA" -l /tmp/postgres.log -o "-k /tmp" start > /dev/null 2>&1

# Wait for postgres to be ready
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" > /dev/null 2>&1; do
    sleep 0.1
done

# Create test database
createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE" > /dev/null 2>&1 || true

# Execute SQL Runner
TARGET_SQL="${SQL_FILE:-query.sql}"
if [ ! -f "$TARGET_SQL" ]; then
    # find first .sql file
    TARGET_SQL=$(find . -maxdepth 1 -name "*.sql" ! -name "schema.sql" | head -n 1)
fi

SCHEMA_SQL="${SCHEMA_FILE:-schema.sql}"

python3 /usr/local/bin/sql-runner.py "$TARGET_SQL" "$SCHEMA_SQL"
EXIT_CODE=$?

# Stop postgres gracefully
pg_ctl -D "$PGDATA" stop -m fast > /dev/null 2>&1 || true

exit $EXIT_CODE
