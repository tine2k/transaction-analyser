# Tasks

## 1. Local disposable PostgreSQL launcher

- [x] 1.1 Replace Docker startup and port discovery in `tests/run-with-test-database.sh` with a readiness check and creation of a uniquely named disposable database on the configured local PostgreSQL server; apply repository migrations and integration fixtures, and supply the database URL through `TEST_DATABASE_URL`. Verify the database contains the migrated schema and fixture rows before the wrapped command runs.
- [x] 1.2 Preserve environment isolation and guaranteed cleanup: unset inherited `DATABASE_URL`, ensure the application process uses only the disposable test database, and drop the database on success, failure, and handled interruption. Verify the database is removed after both a passing wrapped command and an intentionally failing one.
- [x] 1.3 Update `tests/README.md` and the PostgreSQL database-test instructions in `AGENTS.md` with local PostgreSQL/client-tool prerequisites, create/drop privileges, server readiness guidance, and the disposable-database lifecycle; remove Docker as a test prerequisite while retaining unrelated Docker development guidance. Verify each documented command and requirement matches the launcher.

## 2. Integration command and verification

- [x] 2.1 Update the direct-run guidance in `tests/integration/api.test.ts` to point developers to the local-PostgreSQL integration command and explain that the wrapper supplies `TEST_DATABASE_URL`. Verify direct execution without the variable fails with that actionable message.
- [x] 2.2 Run `npm run test:integration` against the local PostgreSQL installation; verify the API integration suite passes, the test-only database is dropped afterward, and Docker is not invoked.
