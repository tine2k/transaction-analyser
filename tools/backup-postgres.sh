#!/usr/bin/env bash
set -euo pipefail
umask 077

container_name='transaction-analyser-postgres'
repository_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
backup_dir=${1:-"$repository_root/backups"}

if (($# > 1)); then
  echo "Usage: $0 [backup-directory]" >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker is required to create this backup.' >&2
  exit 1
fi

if ! docker inspect "$container_name" >/dev/null 2>&1; then
  echo "Container '$container_name' was not found." >&2
  exit 1
fi

container_state=$(docker inspect --format '{{.State.Status}}' "$container_name")
if [[ "$container_state" != 'running' ]]; then
  echo "Container '$container_name' is not running (state: $container_state)." >&2
  exit 1
fi

if ! docker exec "$container_name" pg_isready >/dev/null 2>&1; then
  echo "PostgreSQL in '$container_name' is not ready." >&2
  exit 1
fi

mkdir -p "$backup_dir"
backup_dir=$(cd -- "$backup_dir" && pwd -P)
backup_file="$backup_dir/${container_name}-$(date '+%Y%m%dT%H%M%S')-$$.sql.gz"
temporary_file=$(mktemp "$backup_dir/.${container_name}.backup.XXXXXX")

cleanup() {
  exit_code=$?
  trap - EXIT INT TERM
  rm -f "$temporary_file"
  exit "$exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Dump every database and cluster-wide role while PostgreSQL remains online.
# The official PostgreSQL image exposes these initialization settings in its
# container environment; local socket authentication is used inside the
# container, so credentials are not passed through the host command line.
docker exec "$container_name" sh -c '
  if [ -n "${POSTGRES_PASSWORD:-}" ]; then
    export PGPASSWORD="$POSTGRES_PASSWORD"
  fi
  exec pg_dumpall --username="${POSTGRES_USER:-postgres}"
' | gzip -c > "$temporary_file"

gzip -t "$temporary_file"
mv "$temporary_file" "$backup_file"

echo "Backup created: $backup_file"
