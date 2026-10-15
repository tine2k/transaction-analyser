# Tasks

## 1. Launcher fallback

- [x] 1.1 Add the guarded fallback to `tests/run-with-test-database.sh`: when `pg_isready --dbname=postgres` fails and none of `PGHOST`, `PGPORT`, `PGHOSTADDR` is set, check `initdb`/`pg_ctl`, create a per-run scratch directory under `node_modules/.cache`, run `initdb -A trust -E UTF8` with `$PGUSER` or the invoking OS user, start the cluster with `pg_ctl` on a random loopback port with retries, export `PGHOST`/`PGPORT`, and print one notice line; verify by running `bash tests/run-with-test-database.sh bash -c 'psql --no-psqlrc --tuples-only --command "select count(*) from transactions" "$TEST_DATABASE_URL"'` in this server-less environment and confirming the notice, the fixture count 4, and that migrations applied.
- [x] 1.2 Extend the cleanup trap to stop the cluster with `pg_ctl stop -m fast` and remove the scratch directory after the disposable database is dropped, and print the cluster log tail when cluster startup fails; verify a successful run and a deliberately failing wrapped command both leave no cluster process, no scratch directory, and no `transaction_analyser_test%` database behind.
- [x] 1.3 Keep explicit settings authoritative: with `PGHOST`/`PGPORT` set but unreachable, the launcher must fail with the existing readiness message and start no cluster; verify by invoking it with `PGHOST=127.0.0.1 PGPORT=59999` and checking the failure and the absence of a scratch directory.
- [x] 1.4 Update `tests/README.md` to document the fallback prerequisites (`initdb`/`pg_ctl` on `PATH`), the automatic trigger, and that explicit `PGHOST`/`PGPORT` settings take precedence; verify the documented commands match the implemented behavior.
- [x] 1.5 Update the Database Tests rules in `AGENTS.md` to allow the disposable-cluster fallback while keeping the existing guarantees (disposable database, fixtures only, `TEST_DATABASE_URL` only, inherited `DATABASE_URL` unset, cleanup on failure and interruption, no Docker requirement); verify the wording matches the implemented launcher behavior.

## 2. Suite verification

- [x] 2.1 Run `npm run test:integration` in this server-less environment and confirm the fallback cluster carries the build, migrations, fixtures, and the full integration suite to a passing result.
- [x] 2.2 Run `npm run test:browser` with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` in this server-less environment and confirm the browser suite passes against a fallback cluster.

## Workflow follow-up

- Archive the change with `/opsx-archive` once the suite verification tasks pass.
