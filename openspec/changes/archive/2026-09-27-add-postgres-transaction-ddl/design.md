# Design

## Context

See proposal.md — Why for motivation. The state that shapes this design:

- The repository contains only OpenSpec scaffolding and no application source, package manifest, ORM, or chosen language. There is no existing schema, no migration tool, and no established SQL conventions to follow.
- `openspec/specs/transaction-domain-model/spec.md` is the sole capability. It pins six data elements and deliberately excludes all validation, storage, and persistence concerns; its own design doc (R4) states that a later storage change may normalise the schema without contradicting that capability.
- PostgreSQL is chosen as the target, so the DDL can use PostgreSQL-specific types and features (`date`, exact `numeric`, identity columns) rather than a lowest-common-denominator subset.
- Four user decisions shape the work: structural constraints only, a surrogate identity primary key with no natural-key unique constraint, the file at `db/migrations/0001_transactions.sql`, and the table plus primary key with no secondary indexes.

## Goals / Non-Goals

**Goals:**

- Produce a migration that, when applied to an empty PostgreSQL database, yields a table that can hold every `Transaction` the domain model permits and cannot hold one it does not.
- Keep the DDL a faithful mechanical rendering of `transaction-domain-model`, with every departure from a literal field-by-field mapping called out and justified.
- Make the constraint boundary explicit and narrow, so a later change that adds validation does so deliberately rather than by accretion.
- Leave the schema adoptable later by a migration runner or ORM without rewriting it.

**Non-Goals:**

- Any business validation: IBAN format or checksum, value-date/booking-date ordering, non-empty free text, amount bounds. See D5 for the one narrow exception and why it is not a business rule.
- A natural key, dedup/idempotency support, or any import-related structure. See D4 and R2.
- Secondary indexes beyond the primary key's own index. See D8.
- A currency column or a direction column, which `transaction-domain-model` forbids (its D6 and D1).
- Splitting the counterparty, an account, or a bank statement into related tables.
- Down-migration tooling, seed data, roles/grants, and schema namespacing. The DDL targets the default `public` schema, which is the simplest thing that can later be moved.

## Decisions

### D1 — One `transactions` table, denormalised exactly as the aggregate is shaped

The table holds the counterparty name and IBAN directly on the row; no `counterparties` or `accounts` table is created, and the `counterparty_account` column carries no foreign key.

*Rationale:* the domain spec requires that a counterparty be read from the transaction directly and that reading it need no counterparty aggregate or registry to exist (R4 of that spec's design anticipates exactly this: a storage change "can normalise the schema without contradicting this capability"). Splitting the counterparty out would not break the letter of that requirement today, but it would build identity and reference-integrity machinery for a field the spec says is free text with no lifecycle.

*Alternative considered:* a `counterparties` table with an FK, to share names across transactions. Rejected — it introduces an identity, a deduplication question (two spellings of "ACME GmbH"), and orphan handling for data the domain treats as a verbatim string. If counterparty-based analysis later needs grouping, that is a derived view or index decision, not a schema normalisation.

### D2 — `date` for both dates, unconstrained `numeric` for the amount, `text` for free text

*Rationale:* `date` makes the day-precision requirement physically true — a time of day has nowhere to go, so the "no time component" guarantee cannot be violated by a careless writer. Unconstrained `numeric` is PostgreSQL's exact decimal type, so -42.75 reads back as exactly -42.75; it is a base type in every PostgreSQL version with no extension required. `text` imposes no length limit and no structure on the purpose, name, and IBAN, which is what the domain's "free text" requires.

*Alternative considered:* `numeric(19,2)`. Rejected for now — a fixed scale is a business decision (whether a third decimal of a minor unit can ever occur) that the domain model has not made, and choosing it early either truncates real data or rejects it. Unconstrained `numeric` accepts every decimal the domain permits and the precision question stays a later additive `CHECK`. *Alternative considered:* `money`. Rejected — locale-sensitive, fixed to a single currency in a way that would need a cast on every read, and unusable as-is outside the default locale. *Alternative considered:* `double precision`. Rejected — cannot represent decimal currency exactly, which is the whole point of the column.

### D3 — Plural table name, `snake_case` columns matching the domain vocabulary

The table is `transactions`; the columns are `id`, `booking_date`, `value_date`, `amount`, `purpose`, `counterparty_name`, `counterparty_account`.

*Rationale:* `transaction` is a SQL keyword in PostgreSQL (it opens `BEGIN TRANSACTION`), so a singular table name is legal but must be quoted in every hand-written query and is a persistent papercut. Column names use the domain's own vocabulary so a reader can map spec to schema by name; they are `snake_case` to match the surrounding file even though no other SQL exists yet to set a precedent.

*Alternative considered:* `t_transaction`, or a prefix scheme. Rejected — with one table, a prefix encodes a taxonomy that does not exist yet.

### D4 — Surrogate identity primary key, and no natural-key unique constraint

`id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, with the six domain columns carrying no uniqueness requirement of any kind.

*Rationale:* the domain has no identifier at all, so the storage layer must supply one; `GENERATED ALWAYS` is the modern PostgreSQL form (10+) and, unlike a serial column plus sequence, cannot have the identity's sequence silently diverge from the table's. A key is needed anyway for stable `UPDATE`/`DELETE` targets and for foreign keys a later change may add. The absence of a natural-key unique constraint is deliberate: the six elements include a free-text purpose, so a uniqueness rule over them would reject two genuinely distinct transactions that happen to share every field, and inventing a dedup rule is an import decision, not a storage one.

*Alternative considered:* composite primary key over the six domain columns. Rejected — a key containing a multi-hundred-character free-text field is unwieldy, gets duplicated into every index built on it, and conflates identity with content. *Alternative considered:* surrogate key plus a `UNIQUE` natural key for import idempotency. Rejected for this change and recorded as R2/O2 — the right natural key is not obvious (purpose text is unstable, two identical charges on one day are real), and a wrong unique constraint is harder to remove than to add later.

### D5 — Structural constraints only, with one narrow exception: `CHECK (amount <> 0)`

The DDL declares `NOT NULL` on the five required elements, leaves `counterparty_account` nullable, declares the primary key, and adds exactly one check constraint: the amount is not zero.

*Rationale:* `NOT NULL` is the database's rendering of "required" in the domain spec and nothing more — notably it does not imply non-empty, so an empty purpose string is still accepted, matching that spec's deliberate exclusion of required-non-empty rules. The `amount <> 0` check is the one exception and needs its reasoning stated, because the domain spec's design (R2) explicitly deferred even this rule. The distinction: the deferred rules are constraints the domain model has no opinion about, whereas a zero amount contradicts a rule the domain model *does* assert — that direction is carried by the sign, and 0 has no sign. Rejecting a zero amount is therefore making the stored form incapable of contradicting the domain model, which is the same category of guarantee as the `date` type in D2, not a business rule about which transactions are legitimate. Anything about *ordering*, *IBAN validity*, or *magnitude* is a business rule and stays out.

*Alternative considered:* no check at all, keeping the domain model's silence literally. Rejected — a zero-amount row is representable in the database but unexpressible in the domain, so the schema would be able to hold a row the model calls ill-formed. *Alternative considered:* enforcing date ordering and an IBAN regex in the database as well. Rejected — neither rule exists in any spec, so there is nothing to be faithful to; the date-ordering rule in particular may be wrong for the real data (some transfers legitimately settle before they post), and it would be far cheaper to learn that from real imports than from a rejected `INSERT`.

### D6 — No currency column and no direction column

*Rationale:* both are ruled out by the domain spec, not by preference — a currency column could only ever hold `EUR` (its D6), and a direction column would create a second source of truth that can contradict the sign (its D1). Reproducing either in the schema would introduce exactly the contradiction surface that spec was written to make unrepresentable.

### D7 — Plain SQL at `db/migrations/0001_transactions.sql`, applied by hand, with no down script

*Rationale:* the numbered, tool-agnostic name is adopted by essentially every option the project might pick later (Flyway, Liquibase, sqlx, Alembic, goose) and by `psql -f`, so no reformatting is needed when a tool is chosen. The file is written to be idempotent-free and framework-free: a single `CREATE TABLE` plus a header comment naming the capability it implements. No down script is written, because no tool consumes one and the rollback of this migration is a one-line `DROP TABLE transactions` on a table that holds nothing yet; a down script added later costs nothing, while a down script written now would be a second artifact to keep in sync with no consumer.

*Alternative considered:* `db/schema.sql` as a canonical snapshot. Rejected — a snapshot has no forward path; the second schema change would either rewrite history or start a parallel file. *Alternative considered:* an ORM migration (Alembic, Prisma, Diesel). Rejected — no language is chosen, and an ORM migration would smuggle in a language and framework decision that this project has deliberately not made.

### D8 — No secondary indexes beyond the primary key's own index

*Rationale:* the analyser's access patterns have not been specified anywhere in `openspec/specs/`, so any index chosen now is a guess about queries that do not exist yet, and every unnecessary index is a write cost on import. The date columns are the obvious candidates when the need appears, and adding them is an additive `0002_*.sql`. Recorded as O1.

### D9 — A separate capability `transaction-postgres-schema`, not a modification of `transaction-domain-model`

*Rationale:* the two are answerable independently and have different lifecycles. The domain capability states observable behaviour and would be violated by a change to what a transaction *is*; this capability states the stored shape and can be revised — precision, indexes, a natural key — without any domain question being reopened. Its own design (R4) explicitly licenses this separation. Merging them would also make every DDL tweak a modification of the domain contract.

## Risks / Trade-offs

- **R1 — Unconstrained `numeric` accepts nonsense amounts.** A value with eight decimal places, or an absurd magnitude, is storable. → Mitigation: deliberate, in exchange for never truncating or rejecting a real amount before the precision rule is known (D2). The limit is a later additive `CHECK` on scale, not a rewrite.
- **R2 — No natural key means a re-imported statement duplicates rows.** The user chose the surrogate-key-only option knowingly. → Mitigation: this is an import concern, not a storage one, and a later change can add a unique constraint or an import-ledger table in `0002_*.sql` alongside whatever dedup rule the import design settles on. The cost of being wrong is low here precisely because the constraint was not added; the cost of a wrong unique constraint being baked in would be a migration to drop it.
- **R3 — No indexes on the date columns.** Every date-range analysis query is a sequential scan until an index is added. → Mitigation: acceptable at the scale a personal statement analyser works at, and purely additive to fix. Recorded as O1 so it is not lost rather than treated as an oversight.
- **R4 — The surrogate `id` leaks out of storage.** Because the domain has no identifier, the first API or export that exposes a row will be tempted to publish `id` as if it were domain data. → Mitigation: the spec states `id` is storage metadata and not a seventh domain element, and the domain spec's "a single main aggregate" requirement means an externally visible identifier would be a change to *that* capability, not a silent convenience here.
- **R5 — `CHECK (amount <> 0)` reintroduces a rule the domain spec deferred.** A reviewer comparing the two specs may see this as a contradiction of R2. → Mitigation: D5 states the distinguishing test (does the domain model assert the rule, or is it silent?) and the spec phrases the requirement as "a zero amount carries no direction", tying it to the sign convention the domain model does assert. If the reviewer disagrees, the fix is to drop one `CHECK` clause from one file — no other decision depends on it.
- **R6 — Nothing in the repository executes this DDL.** With no CI, no container, and no local database configuration, the migration can be written wrong and stay wrong until first use. → Mitigation: the apply tasks require actually applying the file to a scratch database and recording the result, rather than a read-through review, so a syntax or type error surfaces while it is still free to fix.
- **R7 — A future ORM will generate its own schema and diverge.** If the project later picks an ORM, its default is to create tables from models, which will not match this migration. → Mitigation: D7 makes the migration file the source of truth and the ORM's job to adopt it; recorded as O3 so the decision is revisited at the point an ORM is actually chosen.

## Migration Plan

Not applicable in the usual sense — no application, no deployed system, and no existing schema are touched. Forward: apply `db/migrations/0001_transactions.sql` to an empty database (`psql -f`, or whatever runner is adopted later) and the `transactions` table exists. Rollback: `DROP TABLE transactions`, which loses nothing because the table is new and, at rollout, empty. Future schema changes are additive `0002_*.sql`, `0003_*.sql` files in the same directory and format; changing an existing column's type or dropping one is a breaking change to this capability.

## Open Questions

Each of these can be answered later without changing the specs written here, the approach, or the task breakdown, and none of them blocks the migration:

- Which secondary indexes the analyser's real query patterns justify (O1, R3).
- The scale and precision the amount column should eventually enforce (R1, D2).
- The import dedup strategy, and therefore whether a natural key or import ledger is needed (R2, D4).
- Where IBAN validation and other business rules will live — at the writing code, at import, or as a database function — and in which language (D5, O5 in `transaction-domain-model`'s design).
- Whether the counterparty IBAN should be normalised to uppercase without spaces, and whether that normalisation is a stored form or a read-time projection (open question in `transaction-domain-model`'s design).
- Whether an ORM will be adopted and, if so, how it is configured to adopt this migration rather than generate its own (R7, D7).
- Whether multiple accounts or statements will ever be in scope, which would require more than one table and would be a change to `transaction-domain-model` rather than to this capability (D1).
