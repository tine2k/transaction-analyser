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

3. Create the schema by applying every migration in order.

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

Dates are `DD.MM.YYYY`, amounts use a comma decimal separator (`-1.234,56`), the currency must be `EUR`, and zero amounts are rejected. `--dry-run` validates the whole file and contacts no database. Imported transactions start uncategorised; the stored transactions are re-evaluated whenever the category set changes. Without `--dsn` the importer uses `$DATABASE_URL`.

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
