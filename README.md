# Transaction Analyser

Self-hosted web application that imports transactions from a bank export CSV into PostgreSQL and presents them as a filterable table with category analytics. One container serves the browser application and its API; PostgreSQL is an external service you operate.

## Quick start

Prerequisites: Docker, Git, and Node.js 24 with npm (Node is needed only for the CSV importer).

1. Get the repository; the CSV importer lives here, not in the image, which carries the migrations it applies.

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

3. Start the application. The image applies the pending migrations while it starts, so there is no schema step to run; open http://localhost:3000 once the health endpoint answers. A database whose schema was applied by hand before the migration history existed is adopted once with `MIGRATE_BASELINE` (see Upgrading).

   ```sh
   docker run --detach --name transaction-analyser --network transaction-analyser \
     --publish 3000:3000 \
     --env DATABASE_URL=postgres://analyser:change-me@transaction-analyser-postgres:5432/transaction_analyser \
     --env EASYBANK_PERSON=Default \
     ghcr.io/tine2k/transaction-analyser:latest
   until curl --fail --silent http://localhost:3000/api/health > /dev/null; do sleep 1; done
   curl --fail http://localhost:3000/api/health   # {"status":"ok"}
   ```

   `EASYBANK_PERSON` is required: the server refuses to start without it. `Default` exists on a fresh database; rename it on the People screen and update this value to the new name, or the sync fails.

## Importing transactions

The importer is not part of the image; run it from the repository checkout with Node 24.

```sh
npm ci
npm run import -- /path/to/statement.csv --person Anna --dry-run
npm run import -- /path/to/statement.csv --person Anna --dsn postgres://analyser:change-me@localhost:5432/transaction_analyser
```

`--person` is required and names the person the statement belongs to. The person must already exist — create it on the People screen first, or use `Default` — because an import never creates one. The name is matched ignoring letter case and surrounding whitespace.

The file must be UTF-8, semicolon-delimited, and carry exactly this header: `Date;Value date;Category;Name;Purpose;Account;Bank;Amount;Currency`.

Dates are `DD.MM.YYYY`, amounts use a comma decimal separator (`-1.234,56`), the currency must be `EUR`, and zero amounts are rejected. A row already stored for the same person is skipped rather than imported again, so re-running an import of the same statement adds nothing; a statement that legitimately contains the same transaction twice still produces two rows. The same row imported for another person is new, so two people's identical statements do not collide. `--dry-run` validates the whole file, reads the database to report which rows are new and which are already stored for that person, and writes nothing. Every run is recorded, names its person, and is shown on the Imports screen. Each newly imported transaction is categorised by the categories stored at import time; the stored transactions are re-evaluated whenever the category set changes, except transactions you have assigned by hand, which keep their category. Without `--dsn` the importer uses `$DATABASE_URL`.

## Keeping the account current

The server can read the Easybank Giro account's transaction list every night and import only what is new. It uses the login and the transaction list, which need no confirmation in the easybank app; the CSV export and the search panel are deliberately not used, because the bank protects those with app confirmation.

Set the credentials and the person in the environment or in a gitignored `.env` file:

```sh
EASYBANK_USER=...
EASYBANK_PIN=...
EASYBANK_PERSON=Anna
```

`EASYBANK_PERSON` is required: the server refuses to start without it, and the sync command exits with a failure before it opens the database. It names the person the sync imports into; the person must already exist. An unknown name fails the run and writes nothing rather than creating a person. Renaming the person on the People screen without updating this variable makes the next sync fail loudly until it is corrected. Every run — scheduled, manual, or started from the screen — imports into the same configured person.

The nightly task runs at 03:00 Europe/Vienna while the server runs. Until `EASYBANK_SYNC_WRITE=true` is set, every run is non-writing: it records what it would import and changes no transaction. The result of every run appears on the Imports screen, which also offers a control that starts the same sync on demand. Once the non-writing runs look right, set `EASYBANK_SYNC_WRITE=true` to let it write.

When a writing sync adds new transactions of which at least one received no category, it can send a Pushover notification with the run's counts — new, categorised, and without a category. Set the Pushover application token and recipient key in the environment or in a gitignored `.env` file:

```sh
PUSHOVER_TOKEN=...
PUSHOVER_USER=...
```

Without `PUSHOVER_TOKEN` and `PUSHOVER_USER`, no notification is sent and nothing else changes. A notification that fails — refused, unreachable, or silent — is logged and never fails the sync, changes its record, or changes what was imported. The manual CSV import never notifies. To point the notification at a test server instead of the real Pushover, set `PUSHOVER_BASE_URL` to that server's address; leave it unset to use the real Pushover. To check the configured credentials without waiting for a sync, use **Send test notification** on the Imports screen; it sends one fixed test message and reports whether Pushover accepted it, whether the configuration is absent, or why it failed.

The Imports screen also offers a control that re-applies the stored categories to every stored transaction that was not assigned by hand on demand and reports how many transactions changed. The report is transient: nothing is recorded, and reloading the screen clears it.

To point the sync at a test bank instead of the real Easybank site, set `EASYBANK_BASE_URL` to that server's address; leave it unset to use the real bank.

To run the same sync by hand — the way to check the login, the retrieval, and the counts before trusting the night:

```sh
npm run sync -- --dry-run --dsn postgres://analyser:change-me@localhost:5432/transaction_analyser
npm run sync -- --write   --dsn postgres://analyser:change-me@localhost:5432/transaction_analyser
```

The window defaults to the first day of the preceding calendar quarter through today, which also recovers a night the server was not running. `--from` and `--to` (both `YYYY-MM-DD`) widen it for a backfill. The sync never imports a transaction whose value date is on or before 2026-09-20, so the history already imported is left alone; a later transaction the bank posts below that floor has to come in through the CSV import. A row already stored is skipped, so a repeated run adds nothing. Above the floor the non-writing run still reports already-stored versus new before anything is written.

## Upgrading and backups

- Pin `vX.Y.Z` or `sha-<commit>`; the `latest` and `main` tags move with the default branch.
- To upgrade, pull the new image and recreate the application container with the same `DATABASE_URL`; the pending migrations are applied while it starts, and every applied migration is recorded in the database's `pgmigrations` table, so no migration is ever applied twice.
- A database whose schema was applied by hand before the migration history existed is adopted once by starting with `MIGRATE_BASELINE` set to the highest applied version (for example `0009`); the variable is ignored once the database records migrations. Migrations are forward-only: correct a bad migration with a new file or by restoring a backup.
- The version that adds people creates a person named `Default` and assigns every existing transaction to it during the first start; a fresh database also gets `Default`, with no transaction. Nothing has to be entered by hand: rename `Default` on the People screen to the first person's name, or keep the name. A rename changes what every future import must name, so update saved import commands and `EASYBANK_PERSON` to match.
- The version that makes `EASYBANK_PERSON` mandatory refuses to start without it. Read the current person's name on the People screen and set `EASYBANK_PERSON` to it before upgrading; a fresh installation can use `Default` until the person is renamed.
- Back up the database with `tools/backup-postgres.sh [directory]`; it requires the quick-start container name `transaction-analyser-postgres` and writes a timestamped `.sql.gz`, by default under `backups/`.

## What it does

- **Transactions** - a Person column and a person filter, searchable within the selected person by purpose, counterparty, or account (applied with the Search button or Enter), and filterable by person, category, and period (a calendar month or a whole calendar year), with the sum of displayed rows; select text to add it as a pattern to a category without leaving the table, and assign a category by hand to one row or to a checked selection, keeping that choice when the categories are re-applied.
- **Categories** - regular expressions matched against the purpose line or the counterparty name, and inclusive date windows, assign transactions, with match previews, a hidden flag, and an optional expense type (recurring or one-time) that classifies the category for the analysis screens.
- **People** - the named owners every transaction belongs to; the list shows each person's transaction count, and a person can be created or renamed but never deleted. Renaming keeps every transaction it owns and changes what future imports must name.
- **Analytics** - category spending pie charts for each of the last 12 months, switchable to whole-calendar-year totals for every year with data; filterable by person and expense type, with every month, year, and slice link carrying the selected person to the transactions screen.
- **Monthly totals** - a month-by-category matrix over every month with data; filterable by person and expense type, with each amount linking to the matching transactions for that person.
- **Monthly average** - average spend per category over a chosen number of months; filterable by person and expense type.

## Development

`npm install` then `npm run dev` serves the app on http://127.0.0.1:3000. The server requires a reachable database: set `DATABASE_URL` in the environment or a gitignored `.env` file, and the pending migrations are applied at startup. It also requires `EASYBANK_PERSON`, the name of an existing person; use `Default` on a fresh database. `npm test` runs the unit, component, and integration suites; see [tests/README.md](tests/README.md) for prerequisites. The full container reference is in [docs/container-image.md](docs/container-image.md).

The application icon is drawn in `public/icon.svg`, which is the only place its geometry lives. `node tools/render-app-icon.mjs` regenerates the PNGs beside it from that file, using the Playwright Chromium (`npm run test:browser:install` installs it). The PNGs are committed and no build step rasterises the artwork. A home-screen shortcut keeps the icon it was added with, so a changed icon appears only after the shortcut is removed and added again.
