# Tasks

## 1. Write the README

- [x] 1.1 Add the root `README.md` with a one-paragraph description and a self-contained "Quick start": clone the repository, create a Docker network, run PostgreSQL 18 as `transaction-analyser-postgres` with a named volume mounted at `/var/lib/postgresql` and port 5432 published, apply `db/migrations/*.sql` in order with `psql`, run `ghcr.io/tine2k/transaction-analyser` with `DATABASE_URL` pointing at the postgres container, and check `curl --fail http://localhost:3000/api/health`. Verify each command against `docs/container-image.md`, the `Dockerfile` (`PORT=3000`), and the PostgreSQL 18 image's documented volume path.
- [x] 1.2 Add an "Importing transactions" section documenting the semicolon-delimited header, EUR-only rows, `--dry-run`, and that `npm run import -- <file.csv> --dsn "$DATABASE_URL"` runs from a repository checkout because the importer is not in the image. Verify the header and flags against `tools/import-transactions.ts` (`EXPECTED_HEADER`, `USAGE`) and the `import` script in `package.json`.
- [x] 1.3 Add "Upgrading & backups" (pin `vX.Y.Z` or `sha-<commit>`; apply only new migration files in order because there is no migration tracking table; run `tools/backup-postgres.sh`), a short "What it does" list of the five screens, and a "Development" section linking `tests/README.md` and `docs/container-image.md`. Verify the tag rules against `.github/workflows/publish-container.yml`, the backup container name against `tools/backup-postgres.sh`, and the screen list against `app/layouts/default.vue`.

## 2. Verify the README

- [x] 2.1 Cross-check every command, image name, tag example, container name, port, and relative link in `README.md` against the repository; confirm each link resolves to an existing file and each command matches its source.
- [x] 2.2 Where a Docker runtime and access to GHCR are available, run the quick start end to end with disposable containers and confirm `/api/health` returns `{"status":"ok"}` and the app serves; remove the containers, network, and volume afterwards and record the outcome. If unavailable, state that only static verification was performed.
- [x] 2.3 Confirm `README.md` stays concise (roughly 80 lines) and defers depth to `docs/container-image.md` and `tests/README.md` rather than duplicating it.

## Workflow follow-up

- Archive the change after review.
