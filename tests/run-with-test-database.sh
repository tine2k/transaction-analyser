#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repository_root"

if (($# == 0)); then
  echo "Usage: bash tests/run-with-test-database.sh <command> [args...]" >&2
  exit 2
fi

database_name="transaction_analyser_test_${PPID}_${RANDOM}_${RANDOM}"
database_created=false

cleanup() {
  exit_code=$?
  trap - EXIT INT TERM
  if [[ "$database_created" == true ]] && ! dropdb --if-exists --force --maintenance-db=postgres "$database_name"; then
    echo "Could not remove disposable PostgreSQL database '$database_name'. Remove it manually after checking no test process is using it." >&2
    if ((exit_code == 0)); then
      exit_code=1
    fi
  fi
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command_name in pg_isready createdb dropdb psql node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required local PostgreSQL tool '$command_name' was not found in PATH." >&2
    exit 127
  fi
done

if ! pg_isready --dbname=postgres >/dev/null 2>&1; then
  echo "Local PostgreSQL is not ready. Start the local PostgreSQL server and confirm 'pg_isready --dbname=postgres' succeeds, then retry." >&2
  exit 1
fi

connection_settings=$(psql --no-psqlrc --no-align --tuples-only --field-separator=$'\t' \
  --set ON_ERROR_STOP=1 \
  --dbname=postgres \
  --command="SELECT current_user, current_setting('port'), COALESCE(host(inet_server_addr()), btrim(split_part(current_setting('unix_socket_directories'), ',', 1)))")
IFS=$'\t' read -r database_user database_port database_host <<< "$connection_settings"
if [[ -z "$database_user" || -z "$database_port" || -z "$database_host" ]]; then
  echo "Could not determine the active local PostgreSQL connection settings." >&2
  exit 1
fi

if ! createdb --maintenance-db=postgres --encoding=UTF8 "$database_name"; then
  echo "Could not create disposable PostgreSQL database '$database_name'. The configured role must have permission to create databases." >&2
  exit 1
fi
database_created=true

for migration in db/migrations/*.sql; do
  psql --no-psqlrc \
    --set ON_ERROR_STOP=1 \
    --dbname="$database_name" \
    --file="$migration"
done

psql --no-psqlrc \
  --set ON_ERROR_STOP=1 \
  --dbname="$database_name" \
  --file=tests/fixtures/integration.sql

database_is_ready=$(psql --no-psqlrc --no-align --tuples-only \
  --set ON_ERROR_STOP=1 \
  --dbname="$database_name" \
  --command="SELECT
    to_regclass('public.transactions') IS NOT NULL
    AND to_regclass('public.categories') IS NOT NULL
    AND (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'transactions'
        AND column_name IN ('id', 'booking_date', 'value_date', 'amount', 'purpose', 'counterparty_name', 'counterparty_account', 'category_id')) = 8
    AND (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'categories'
        AND column_name IN ('id', 'name', 'patterns', 'hidden', 'windows')) = 5
    AND (SELECT count(*) FROM categories
      WHERE name IN ('Groceries', 'Transport', 'Internal')) = 3
    AND (SELECT count(*) FROM transactions
      WHERE purpose IN ('REWE Market', 'Rail ticket', 'Internal transfer', 'Bookshop')) = 4")
if [[ "$database_is_ready" != "t" ]]; then
  echo "Disposable PostgreSQL database '$database_name' is missing the migrated schema or integration fixture rows." >&2
  exit 1
fi

test_database_url=$(TEST_DATABASE_NAME="$database_name" \
  TEST_DATABASE_HOST="$database_host" \
  TEST_DATABASE_PORT="$database_port" \
  TEST_DATABASE_USER="$database_user" \
  TEST_DATABASE_PASSWORD="${PGPASSWORD-}" \
  node --input-type=commonjs --eval='
    const url = new URL("postgresql:///");
    url.pathname = `/${process.env.TEST_DATABASE_NAME}`;
    url.searchParams.set("host", process.env.TEST_DATABASE_HOST);
    url.searchParams.set("port", process.env.TEST_DATABASE_PORT);
    url.searchParams.set("user", process.env.TEST_DATABASE_USER);
    if (process.env.TEST_DATABASE_PASSWORD !== "") {
      url.searchParams.set("password", process.env.TEST_DATABASE_PASSWORD);
    }
    process.stdout.write(url.toString());
  ')

# Never allow application-configured credentials to leak into a test process.
unset DATABASE_URL
TEST_DATABASE_URL="$test_database_url" "$@"
