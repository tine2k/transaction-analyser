# Tests

Tests use Vitest. Server/domain unit tests run in Node and do not need PostgreSQL, Docker, or a Nuxt build. Vue component tests use Nuxt's test utilities and a simulated DOM; they do not launch a real browser.

Run the fast tests locally:

```sh
npm run test:unit
npm run test:components
npm test
```

`npm run test:unit` runs server/domain tests. `npm run test:components` mounts selected Vue components in Nuxt's simulated DOM. Neither command needs Docker or a production build.

Run API/database integration tests with:

```sh
npm run test:integration
```

This builds the Nuxt server, starts a uniquely named PostgreSQL 17 container with no persistent volume and a loopback-only published port, applies the repository migrations, and loads only `tests/fixtures/integration.sql`. The launcher passes the disposable connection as `TEST_DATABASE_URL`, removes any inherited `DATABASE_URL`, and removes the container on success or failure. Docker must be available locally. Do not invoke `test:integration:run` directly; it is the inner Vitest command and expects the disposable test database and built server to be ready.

Run the entire local suite with `npm test`; it runs the fast suites followed by the integration suite. CI configuration is not part of this setup.
