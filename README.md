# Transaction Analyser

Self-hosted web application that imports transactions from a bank export CSV into PostgreSQL and presents them as a filterable table with category analytics. One container serves the browser application and its API; PostgreSQL is an external service you operate.

## Quick start

Prerequisites: Docker, Git, and Node.js 24 with npm (Node is needed only for the CSV importer).

1. Get the repository; the migrations and importer live here, not in the image.

   ```sh
   git clone https://github.com/tine2k/transaction-analyser.git
   cd transaction-analyser
   ```

2. Start PostgreSQL 18 and wait for it to accept connections.

   ```sh
   docker network create transaction-analyser
   docker volume create transaction-analyser-data
   docker run --detach --name transaction-analyser-postgres --network transaction-analyser \
     --env POSTGRES_USER=analyser --env POSTGRES_PASSWORD=change-me \
     --env POSTGRES_DB=transaction_analyser --publish 5432:5432 \
     --volume transaction-analyser-data:/var/lib/postgresql \
     postgres:18
   until docker exec transaction-analyser-postgres pg_isready --quiet; do sleep 1; done
   ```

   Replace the example password. The volume is mounted at `/var/lib/postgresql`, the PostgreSQL 18 image's data volume; do not use the older `/var/lib/postgresql/data` path with this image.

3. Create the schema by applying every migration in order (the latest, `0006_import_runs.sql`, adds the import log).

   ```sh
   for migration in db/migrations/*.sql; do
     docker exec --interactive transaction-analyser-postgres \
       psql --username analyser --dbname transaction_analyser --set ON_ERROR_STOP=1 < "$migration"
   done
   ```

4. Start the application and verify it is up, then open http://localhost:3000.

   ```sh
   docker run --detach --name transaction-analyser --network transaction-analyser \
     --publish 3000:3000 \
     --env DATABASE_URL=postgres://analyser:change-me@transaction-analyser-postgres:5432/transaction_analyser \
     ghcr.io/tine2k/transaction-analyser:latest
   curl --fail http://localhost:3000/api/health   # {"status":"ok"}
   ```

## Importing transactions

The importer is not part of the image; run it from the repository checkout with Node 24.

```sh
npm ci
npm run import -- /path/to/statement.csv --dry-run
npm run import -- /path/to/statement.csv --dsn postgres://analyser:change-me@localhost:5432/transaction_analyser
```

The file must be UTF-8, semicolon-delimited, and carry exactly this header: `Date;Value date;Category;Name;Purpose;Account;Bank;Amount;Currency`.

Dates are `DD.MM.YYYY`, amounts use a comma decimal separator (`-1.234,56`), the currency must be `EUR`, and zero amounts are rejected. A row already stored is skipped rather than imported again, so re-running an import of the same statement adds nothing; a statement that legitimately contains the same transaction twice still produces two rows. `--dry-run` validates the whole file, reads the database to report which rows are new and which are already stored, and writes nothing. Every run is recorded and shown on the Imports screen. Imported transactions start uncategorised; the stored transactions are re-evaluated whenever the category set changes. Without `--dsn` the importer uses `$DATABASE_URL`.

## Keeping the account current

The server can read the Easybank Giro account's transaction list every night and import only what is new. It uses the login and the transaction list, which need no confirmation in the easybank app; the CSV export and the search panel are deliberately not used, because the bank protects those with app confirmation.

Set the credentials in the environment or in a gitignored `.env` file:

```sh
EASYBANK_USER=...
EASYBANK_PIN=...
```

The nightly task runs at 03:00 Europe/Vienna while the server runs. Until `EASYBANK_SYNC_WRITE=true` is set, every run is non-writing: it records what it would import and changes no transaction. The result of every run appears on the Imports screen, which also offers a control that starts the same sync on demand. Once the non-writing runs look right, set `EASYBANK_SYNC_WRITE=true` to let it write.

To point the sync at a test bank instead of the real Easybank site, set `EASYBANK_BASE_URL` to that server's address; leave it unset to use the real bank.

To run the same sync by hand — the way to check the login, the retrieval, and the counts before trusting the night:

```sh
npm run sync -- --dry-run --dsn postgres://analyser:change-me@localhost:5432/transaction_analyser
npm run sync -- --write   --dsn postgres://analyser:change-me@localhost:5432/transaction_analyser
```

The window defaults to the first day of the preceding calendar quarter through today, which also recovers a night the server was not running. `--from` and `--to` (both `YYYY-MM-DD`) widen it for a backfill. The sync never imports a transaction whose value date is on or before 2026-09-20, so the history already imported is left alone; a later transaction the bank posts below that floor has to come in through the CSV import. A row already stored is skipped, so a repeated run adds nothing. Above the floor the non-writing run still reports already-stored versus new before anything is written.

## Upgrading and backups

- Pin `vX.Y.Z` or `sha-<commit>`; the `latest` and `main` tags move with the default branch.
- To upgrade, pull the new image and recreate the application container with the same `DATABASE_URL`.
- After pulling new source, apply only the migration files you have not applied yet, in filename order. There is no migration tracking table, so do not re-run migrations that have already been applied.
- Back up the database with `tools/backup-postgres.sh [directory]`; it requires the quick-start container name `transaction-analyser-postgres` and writes a timestamped `.sql.gz`, by default under `backups/`.

## What it does

- **Transactions** - filterable by category and month, with the sum of displayed rows.
- **Categories** - regular expressions and inclusive date windows assign transactions, with match previews and a hidden flag.
- **Analytics** - category spending pie charts for each of the last 12 months.
- **Monthly totals** - a month-by-category matrix over every month with data.
- **Monthly average** - average spend per category over a chosen number of months.

## Development

`npm install` then `npm run dev` serves the app on http://127.0.0.1:3000. `npm test` runs the unit, component, and integration suites; see [tests/README.md](tests/README.md) for prerequisites. The full container reference is in [docs/container-image.md](docs/container-image.md).
