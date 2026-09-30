# Tests

Tests use Vitest. Server/domain unit tests run in Node and do not need PostgreSQL, Docker, or a Nuxt build. Vue component tests use Nuxt's test utilities and a simulated DOM; they do not launch a real browser.

Run the fast tests locally:

```sh
npm run test:unit
npm run test:components
npm test
```

`npm run test:unit` runs server/domain tests. `npm run test:components` mounts selected Vue components in Nuxt's simulated DOM. Neither command needs PostgreSQL, Docker, or a production build.

Run API/database integration tests with:

```sh
npm run test:integration
```

This builds the Nuxt server and uses the locally installed PostgreSQL 18.6 server. Start PostgreSQL first and confirm `pg_isready --dbname=postgres` succeeds. The local PostgreSQL client tools (`pg_isready`, `createdb`, `dropdb`, and `psql`) must be on `PATH`; the configured local role must be able to create databases and own/drop the database it creates. If local password authentication is required, configure `PGPASSWORD` along with the local PostgreSQL connection settings.

The launcher creates a uniquely named disposable database, applies the repository migrations, and loads only `tests/fixtures/integration.sql`. It passes that database as `TEST_DATABASE_URL`, removes any inherited `DATABASE_URL`, and drops the disposable database on success, failure, or handled interruption. Docker is not required. Do not invoke `test:integration:run` directly; it is the inner Vitest command and expects the disposable test database and built server to be ready.

Run the entire local suite with `npm test`; it runs the fast suites followed by the integration suite. CI configuration is not part of this setup.
