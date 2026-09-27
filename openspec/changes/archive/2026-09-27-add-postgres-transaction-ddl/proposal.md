# Proposal

## Why

The domain model now says what a `Transaction` is, but nothing says how that shape lands in a database. Without a written SQL representation, the first person to write a table — or the first ORM migration — will each pick their own column names, types, nullability, and key strategy, and the schema will drift from the spec that was agreed for it. Pinning the schema in DDL statements makes the stored form of the domain explicit, reviewable, and checkable against `transaction-domain-model` before any code depends on it.

## What Changes

- Introduce the `transaction-postgres-schema` capability: a written specification of the SQL representation of the domain, expressed as PostgreSQL DDL statements.
- Add a `db/migrations/0001_transactions.sql` migration containing the DDL for the `transactions` table.
- Map each of the six `Transaction` data elements to one column, using PostgreSQL types that preserve the spec's guarantees: `date` for the two day-precise dates, `numeric` for the signed EUR amount, `text` for the free-text purpose and counterparty name, and a nullable text column for the optional IBAN.
- Require the five mandatory elements with `NOT NULL` and leave the counterparty account nullable, so the database cannot hold a transaction that the domain model declares ill-formed.
- Store the amount sign as given, so the database never contradicts the domain rule that direction is read from the sign alone; add no separate direction column.
- Add a surrogate identity primary key (`bigint ... GENERATED ALWAYS AS IDENTITY`) to give each stored row a stable identity the domain model does not itself carry, and add no natural-key unique constraint.
- Fix the currency to EUR by omitting any currency column, matching the domain model's rule that amounts in other currencies are not representable.
- Deliberately exclude, for now: business validation in the database (IBAN checksum or shape, `value_date >= booking_date` ordering), any currency column, secondary indexes, separate counterparty or account tables, ORM-generated schema management, and any change to the existing `transaction-domain-model` capability.
- No production application code is written by this change. Its deliverables are the specification and the SQL migration.

## Capabilities

### New Capabilities

- `transaction-postgres-schema`: How the `Transaction` domain model is represented in a PostgreSQL database — table shape, column types and nullability, key strategy, and the constraint boundary. It is the storage-side contract, and it must stay faithful to `transaction-domain-model` rather than restating it.

### Modified Capabilities

None. The requirements in `transaction-domain-model` are unchanged: this change realises them in SQL and adds no domain behaviour. In line with that capability's design (R4), the stored shape may be normalised without altering observable domain behaviour, so no requirement there is affected.

## Impact

- **New spec capability**: `openspec/specs/transaction-postgres-schema/spec.md` (created on archive).
- **New file**: `db/migrations/0001_transactions.sql`, a plain SQL migration under a tool-agnostic numbered name so it can later be adopted by a migration runner or applied with `psql` unchanged.
- **Code**: none beyond the SQL file. The repository still has no application source, package manifest, or ORM, so the DDL is written for `psql` and left unadopted by any tool.
- **Database**: a new, empty database gains one table. No existing table, data, or deployed system is touched, so there is nothing to migrate from and no data to backfill.
- **Downstream**: any future import or analysis change binds its queries to this schema. Adding a column later is an additive `0002_*.sql` migration; changing a column's type is a breaking change to this capability.
- **Open questions deferred**: secondary indexes for the analyser's access patterns, the boundary and language for business validation, amount scale and precision, import idempotency/deduplication, and whether the counterparty IBAN should be normalised. These are recorded in design.md and are deliberately absent from the DDL.
