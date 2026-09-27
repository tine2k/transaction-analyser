# Tasks

## 1. Schema Migration

- [x] 1.1 Create `db/migrations/0001_transactions.sql` containing a leading comment naming the `transaction-domain-model` capability and the `transaction-postgres-schema` capability it implements, followed by a single `CREATE TABLE transactions` statement — verify the directory and file exist at that exact path and the file contains exactly one statement besides the comment, per design.md D7
- [x] 1.2 Add the seven columns to that table: `id bigint GENERATED ALWAYS AS IDENTITY`, `booking_date date NOT NULL`, `value_date date NOT NULL`, `amount numeric NOT NULL`, `purpose text NOT NULL`, `counterparty_name text NOT NULL`, `counterparty_account text` (nullable) — verify by reading the file back and checking each column's name, type, and nullability against the table in `specs/transaction-postgres-schema/spec.md` and design.md D2, D3
- [x] 1.3 Declare `id` as the `PRIMARY KEY` and add the single table-level `CHECK (amount <> 0)` constraint, with no other check, unique, or foreign key constraint and no second table, column, trigger, or function — verify by re-reading the file and confirming the constraint list is exactly the primary key plus that one check, per design.md D4, D5, D6

## 2. Schema Behaviour Against a Live Database

- [x] 2.1 Apply the migration to a scratch database (`createdb` then `psql -f db/migrations/0001_transactions.sql`) and run `\d transactions` — verify the output lists the seven expected columns, `id` as the primary key, `amount <> 0` as the only check constraint, and no index other than the primary key's; if no PostgreSQL instance is available in the environment, report that as a blocker rather than marking this task complete, per design.md R6
- [x] 2.2 Insert one complete transaction (booking date, value date, amount `-42.75`, purpose, counterparty name, counterparty account) and read the row back — verify the amount reads as exactly `-42.75` with no floating-point drift, both dates read as bare dates, and all six domain elements plus `id` are present on the single row, per the "A complete transaction is stored on one row" and "The amount keeps its exact value" scenarios
- [x] 2.3 Insert a cash withdrawal with no counterparty account, then attempt inserts that each omit one of `value_date`, `amount`, `purpose`, and `counterparty_name`, and one with `amount` set to `0` — verify the withdrawal is accepted with the counterparty account reading as absent, and that all five invalid inserts are rejected, per the "Required elements are rejected when absent" scenarios
- [x] 2.4 Insert a row with a value date earlier than its booking date, one with a counterparty account that is not a well-formed IBAN, and one whose purpose is the empty string — verify all three are accepted, confirming the schema carries no business validation, per design.md D5 and the "The schema carries no business validation" scenarios
- [x] 2.5 Insert two transactions with identical values in all six domain elements — verify both rows are stored and each is addressable by its own distinct `id`, confirming no natural-key unique constraint was added, per the "Every stored transaction has a stable identity" scenarios

## 3. Consistency Between Artifacts

- [x] 3.1 Map each of the six `Transaction` data elements in `openspec/specs/transaction-domain-model/spec.md` to exactly one column in the migration, and confirm no seventh domain element was introduced — verify by walking the spec's data-element table row by row and finding a column for each, with `id` accounted for as storage metadata only
- [x] 3.2 Confirm the schema contains no currency column, no direction/type/flag column, and no separate counterparty or account table — verify by comparing the column list against design.md D1 and D6 and the domain spec's requirements that the amount is EUR-fixed and direction is read from the sign alone
- [x] 3.3 Confirm every decision in design.md (D1 single table, D2 column types, D3 naming, D4 surrogate key without natural key, D5 structural constraints, D6 no currency/direction, D7 file layout, D8 no indexes, D9 separate capability) is realised in the migration as written — verify each decision maps to a concrete line of `db/migrations/0001_transactions.sql` or to its recorded absence
- [x] 3.4 Confirm the deferred items in design.md Open Questions are absent from both the migration and the spec delta as normative requirements — verify none of the seven open questions (indexes, amount precision, import dedup, validation boundary, IBAN normalisation, ORM adoption, multiple accounts) has been silently decided

## 4. Validation

- [x] 4.1 Run `openspec validate add-postgres-transaction-ddl --strict` from the repository root and verify it reports no errors for this change
- [x] 4.2 Review `specs/transaction-postgres-schema/spec.md` against the delta rules in the OpenSpec schema — verify it opens with `## Purpose`, uses only `##` delta headers, and every `### Requirement` has at least one `#### Scenario` with WHEN/THEN bullets
- [x] 4.3 Confirm proposal.md Impact still matches reality — verify `db/migrations/0001_transactions.sql` is the only file this change added outside `openspec/changes/`, and that the "no application source, package manifest, or ORM" statement is still true
