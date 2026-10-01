# Tasks

## 1. Build the production image

- [x] 1.1 Add a Node 24 production image build that installs from `package-lock.json`, runs `npm run build`, and starts the Nitro output on the configured port; verify the container image builds and its server entrypoint starts.
- [x] 1.2 Exclude environment files, database backups, generated build/install files, tests, and other non-runtime material from the build context; verify the final image contains neither local database credentials nor transaction backups.

## 2. Verify and document container operation

- [x] 2.1 Run the image without `DATABASE_URL` and verify a browser route and `/api/health` answer through the published port while a database-backed request reports the missing configuration.
- [x] 2.2 Run the same image with `DATABASE_URL` values for disposable PostgreSQL test databases prepared with repository migrations and fixtures; verify database-backed requests use the runtime-configured database without rebuilding the image.
- [x] 2.3 Document image build/run instructions, port publishing, runtime `DATABASE_URL` configuration, and the operator's manual database/migration setup; verify the documented sequence works against a disposable test database and does not require a GitHub Actions workflow.
