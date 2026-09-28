#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repository_root"

if (($# == 0)); then
  echo "Usage: bash tests/run-with-test-database.sh <command> [args...]" >&2
  exit 2
fi

container_name="transaction-analyser-test-${PPID}-${RANDOM}-${RANDOM}"
database_user='transaction_test'
database_password='transaction_test_only'
database_name='transaction_test'

cleanup() {
  exit_code=$?
  trap - EXIT INT TERM
  docker rm --force "$container_name" >/dev/null 2>&1 || true
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker run --detach \
  --name "$container_name" \
  --publish 127.0.0.1::5432 \
  --env "POSTGRES_USER=$database_user" \
  --env "POSTGRES_PASSWORD=$database_password" \
  --env "POSTGRES_DB=$database_name" \
  --health-cmd "pg_isready --username=$database_user --dbname=$database_name" \
  --health-interval 1s \
  --health-timeout 3s \
  --health-retries 30 \
  postgres:17-alpine >/dev/null

ready=false
for _ in {1..60}; do
  if docker exec "$container_name" pg_isready \
    --username="$database_user" \
    --dbname="$database_name" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  echo "Disposable PostgreSQL did not become ready; container logs follow:" >&2
  docker logs "$container_name" >&2 || true
  exit 1
fi

port_binding=$(docker port "$container_name" 5432/tcp | head -n 1)
if [[ "$port_binding" != 127.0.0.1:* ]]; then
  echo "Expected PostgreSQL to be published on loopback, got: $port_binding" >&2
  exit 1
fi
host_port=${port_binding##*:}

for migration in db/migrations/*.sql; do
  docker exec -i "$container_name" psql \
    --set ON_ERROR_STOP=1 \
    --username="$database_user" \
    --dbname="$database_name" < "$migration"
done

docker exec -i "$container_name" psql \
  --set ON_ERROR_STOP=1 \
  --username="$database_user" \
  --dbname="$database_name" < tests/fixtures/integration.sql

# Never allow application-configured credentials to leak into a test process.
unset DATABASE_URL
TEST_DATABASE_URL="postgresql://${database_user}:${database_password}@127.0.0.1:${host_port}/${database_name}" \
  "$@"
