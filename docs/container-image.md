# Container image

The image packages the production Nuxt/Nitro server, the browser assets it serves, and the SQL migration files it applies. It runs one Node process, listens on port `3000` by default, and can be built without a database address. PostgreSQL is an external service; this image does not provision a database, but it applies the pending migrations when it starts.

## Build

From the repository root, build the image:

```sh
docker build --tag transaction-analyser:local .
```

The build uses Node 24 and the checked-in `pnpm-lock.yaml` with pnpm, enabled through the image's Corepack. Environment files, PostgreSQL backups, tests, and generated files are excluded from the build context; the migration files under `db/migrations` are included because the image applies them at startup. Do not pass database credentials as build arguments.

## Configure PostgreSQL

Provision and operate PostgreSQL separately. The image applies the pending migrations from `db/migrations` while it starts, so preparing a database means only providing a reachable database and its address. An existing database whose schema was applied by hand before the migration history existed is adopted once by starting the image with `MIGRATE_BASELINE` set to the highest applied file version (for example `0008`); the variable is ignored once the database records migrations.

Set `DATABASE_URL` and `EASYBANK_PERSON` in the environment of the container at run time, not when building the image:

```sh
docker run --rm --name transaction-analyser \
  -p 3000:3000 \
  --env DATABASE_URL \
  --env EASYBANK_PERSON \
  transaction-analyser:local
```

The database address must be reachable from the container. In particular, `localhost` inside the container refers to the container itself, not the host machine. Use the database host or network address that is reachable from the container runtime. The same image can be run with a different `DATABASE_URL` without rebuilding. `EASYBANK_PERSON` names the person the Easybank sync imports into and is required: a fresh database seeds `Default`, which can be renamed on the People screen. Starting the image without `DATABASE_URL` or `EASYBANK_PERSON`, or against a database it cannot reach or migrate, exits with a non-zero status and serves nothing.

## Verify with disposable test databases

For database-backed checks, use only disposable test databases seeded with the repository's integration fixtures, never the application's configured database. The existing test wrapper creates a uniquely named database, applies all migrations with the migration runner (which records them in `pgmigrations`) and `tests/fixtures/integration.sql`, unsets inherited `DATABASE_URL`, provides `TEST_DATABASE_URL`, and drops the database when the wrapped command exits. Follow the local PostgreSQL prerequisites in [tests/README.md](../tests/README.md).

When running Docker on Linux with local PostgreSQL available over TCP on loopback, run the image inside that wrapper using host networking and map only the disposable URL to the application's `DATABASE_URL`:

```sh
PGHOST=127.0.0.1 bash tests/run-with-test-database.sh bash -c '
  set -eu
  name=transaction-analyser-image-test
  docker run --detach --name "$name" --network host \
    --env DATABASE_URL="$TEST_DATABASE_URL" \
    --env EASYBANK_PERSON=Default \
    transaction-analyser:local
  cleanup() { docker rm --force "$name" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent http://127.0.0.1:3000/api/health >/dev/null; then break; fi
    sleep 1
  done
  node --input-type=module -e '\''
    const response = await fetch("http://127.0.0.1:3000/api/transactions");
    if (!response.ok) throw new Error(`transactions returned ${response.status}`);
    const rows = await response.json();
    if (!rows.some((row) => row.purpose === "REWE Market")) {
      throw new Error("expected integration fixture row was not returned");
    }
  '\''
'
```

Run the wrapped command a second time to exercise the same image with another newly created disposable database URL. `--network host` is specific to Linux Docker; on other runtimes, configure a network route from the container to the local test PostgreSQL server instead. The wrapper removes the disposable database after each run, including when the command fails or is interrupted.

## Publish to GitHub Container Registry

The `Publish container image` GitHub Actions workflow builds this Dockerfile on pull requests targeting `main`, without publishing. Pushes to `main` publish `ghcr.io/<owner>/<repository>:main`, `:latest`, and a commit-SHA tag. Pushing a `v*` tag publishes the matching version tag and commit-SHA tag. The workflow uses the repository's `GITHUB_TOKEN` with package write permission; no personal access token is required.
