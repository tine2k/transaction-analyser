# Proposal

## Why

The database has a schema and an empty `transactions` table, and the bank export that holds the actual statements sits on the filesystem as a CSV nobody has read. Nothing can be analysed, counted, or reported until those rows exist, and the shape of that file is not the shape of the `Transaction` aggregate: it is semicolon-delimited, it names a day as `25.09.2026`, it writes money as `-33,61`, it puts the merchant inside a purpose line rather than in a field of its own, and one of its nine columns has no counterpart in the domain model at all. This change writes the one-shot importer that closes that gap, and defines the mapping as a contract so that the categorisation change and every report built on top of it can rely on the same answer about what a row in `transactions` came from.

## What Changes

- Add a single-file command-line importer that reads a semicolon-delimited CSV from a path given as a parameter and writes its rows into `transactions`, leaving the file itself outside the repository.
- Fix the column mapping between the export and the domain model as a spec-level contract: `Date` and `Value date` become the booking date and value date, `Amount` becomes the signed EUR amount, `Purpose` becomes the purpose line verbatim, `Name` becomes the counterparty name verbatim, and `Account` becomes the counterparty account.
- Read and discard the `Category` and `Bank` columns. Every imported row is written with a null `category_id`, which is the state that reads as uncategorised. The bank's own category text is not this project's `Category` aggregate, and importing it would apply a rule the domain model deliberately has not decided.
- Parse the file's German number and date formats exactly, and pass the amount to PostgreSQL as text so the value is cast to `numeric` by the database and never passes through a binary floating-point value.
- Validate every row before writing anything: all rows are parsed and checked, every offending line is reported with its reason, and if any row fails then zero rows are written. A run either imports the whole file or leaves the table untouched.
- Implement the importer in TypeScript run by Node, with `pg` for the database and a real CSV reader for the file, so quoted fields, embedded delimiters, and CRLF line endings are handled by the parser rather than by a hand-rolled split.
- Add a `.gitignore` covering CSV files, so a statement that lands inside the working tree by accident is not committed. The imported data is the user's own financial data and is not project source.
- Deliberately not included: any application, package manifest, or ORM beyond what this one script needs; any re-run protection, since the schema has no natural key; any categorisation; and any incremental or scheduled import. The importer runs once, by hand, on a file the user names.

## Capabilities

### New Capabilities

- `transaction-csv-import`: the import of transactions from the bank export's semicolon-delimited CSV into the `transactions` table — the file's shape, the column-to-domain-element mapping, the number and date formats, the all-or-nothing validation rule, and the guarantee that the source file stays outside the repository.

### Modified Capabilities

None. `transaction-domain-model` and `transaction-postgres-schema` are read and conformed to, not changed: this change adds no domain element, amends no requirement, and touches no migration. The mapping deliberately lands inside a row shape that already permits every value it writes — including the null `category_id` that means uncategorised, and the absent `counterparty_account`.

## Impact

- **Spec deltas**: `specs/transaction-csv-import/spec.md` in this change, a new capability with no `MODIFIED` sections.
- **New files**: `package.json`, `tsconfig.json`, and the importer itself under `tools/`, plus a `.gitignore`. These are the repository's first package manifest, first TypeScript source, and first dependency declaration; nothing that exists today depends on them, and both SQL migrations remain applicable with `psql -f` exactly as before.
- **Dependencies**: `pg`, and a CSV reader. The importer is expected to run on Node's native TypeScript support, so no build step, no bundler, and no transpiler is introduced; if that turns out not to work on the target Node version, adding a runner is a local change that does not affect any requirement.
- **Schema**: none. The importer writes to the tables `0001_transactions.sql` and `0002_transaction_categories.sql` already create and adds no migration, no column, and no constraint.
- **Existing data**: none. This change writes no row to any database and reads no existing row; a user who runs the importer twice gets two copies of the same statement, which is a stated consequence of the schema carrying no natural key rather than a defect fixed here.
- **Downstream**: the change that applies category patterns reads rows this importer writes, and every aggregation, report, and export binds to the mapping fixed here. If a later change decides to parse the merchant out of the purpose line, or to populate the counterparty account from the purpose instead of from a column, it amends this capability's mapping requirements rather than working around them.
- **Open questions deferred**: whether a re-run should be detected, whether the file must be recognised as an encoding other than UTF-8, whether the bank's own `Category` column should ever be mapped, and whether the importer should read from stdin instead of a path. These are recorded in design.md.
