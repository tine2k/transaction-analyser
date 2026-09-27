# Design

## Context

See proposal.md — Why for motivation. The state that shapes this design:

- The repository contains only OpenSpec scaffolding, one SQL migration, and no application source, package manifest, ORM, or chosen language. There is no code to change, so the whole of this design is about the shape two specifications and one migration must take.
- Two capabilities exist and both are directly contradicted by a category: `transaction-domain-model` says the aggregate carries six data elements, that a transaction needs no other entity to be well-formed, and that the system "SHALL NOT treat the purpose line as a categorisation"; `transaction-postgres-schema` says the schema is one table of seven columns that "SHALL NOT require reading, joining, or referencing any other table", and that it consists of "the table, its seven columns, and its primary key, and contains no additional table, column, trigger, function, or derived value". Neither can be extended by addition alone — four requirements have to be amended, and that is the main structural fact about this change.
- `db/migrations/0001_transactions.sql` creates `transactions` with `id bigint GENERATED ALWAYS AS IDENTITY` as the primary key, five `NOT NULL` columns, a nullable `counterparty_account`, and one `CHECK (amount <> 0)`. Its header records a one-line rollback. The file is a plain numbered SQL file, unadopted by any tool.
- The prior change's design (D8, O1) deliberately left all secondary indexes out because the analyser's query patterns were unknown, and its design (D4) deliberately rejected a natural-key unique constraint over the transaction's content. Both precedents are load-bearing here and are either extended or deliberately not (D4, D8 below).
- Three user decisions shape the work: the category is defined by a regular expression over the purpose line, the shape is a `categories` table plus a nullable reference from `transactions`, and the semantics of applying those expressions are deferred to a later change.

## Goals / Non-Goals

**Goals:**

- Land the shape of categorisation in both specs without deciding how categorisation behaves, so that the later change that applies the patterns has a contract to conform to rather than an absence of one.
- Amend exactly the requirements that a category contradicts, and nothing else, so that the diff between the old and new specs is a reviewable statement of what changed rather than a rewrite of the domain model.
- Keep the storage extension purely additive, so a database already carrying `0001` moves forward without a rewrite and can move back with a single statement.
- Make "all transactions are uncategorised" a structural consequence of the migration rather than something a backfill has to achieve.

**Non-Goals:**

- Applying a single regular expression, anywhere, by anything. There is no code; the expression is stored, and the spec states that storing it categorises nothing.
- Deciding evaluation order, precedence, case sensitivity, or whole-string versus partial matching. Recorded as O1 and, in the schema, as the deliberate absence of any column that could express an order.
- Validating a regular expression at write time. See D6 and R2.
- Aggregating, reporting, or exporting anything by category. Nothing in the repository reads the reference.
- A user-facing way to create or edit categories. Whether categories are user-editable is O3.
- Any change to the six existing transaction columns, to the `amount <> 0` check, or to `0001_transactions.sql` itself. See D7.

## Decisions

### D1 — A `categories` table referenced by a nullable foreign key, not a category name column on `transactions`

`categories` holds one row per category; `transactions.category_id bigint` references `categories.id` and is nullable.

*Rationale:* the domain model now says a category is a named rule, and a rule is something with a lifecycle — it gets configured, renamed, and referred to. Storing only a name string on the transaction row would make the regex have nowhere to live: either it is duplicated onto every transaction row, which makes a rule edit a mass update and lets two rows disagree about the same category, or it lives outside the schema entirely, which is what the "no other table" requirement was avoiding and which leaves the analyser unable to answer "what does this category mean?" from the database. A reference makes the category a first-class thing the data model can point at.

*Alternative considered:* `category text` on `transactions`, with the rules configured in application config. Rejected — it satisfies the storage shape but leaves the domain model's "a category is a name and a regular expression" true only in application memory, so the stored data could name a category that no longer exists or never existed. *Alternative considered:* a `transaction_categories` join table. Rejected — it implies a transaction can be in several categories, which nothing in the request supports and which would force the reporting change to decide how to total a double-counted transaction. D9 below records that at-most-one is now a domain guarantee instead.

### D2 — The reference, not a copy: name and pattern stay on `categories`

The `transactions` row carries no category name and no pattern.

*Rationale:* one fact, one place. Once the category is renamed, every transaction follows the rename; there is no window in which a report could show a stale name for some transactions and the new name for others. It also keeps `transactions` at one row per transaction in the sense the original spec meant, so the storage side of the "a transaction is a whole unit" guarantee is only relaxed by a lookup, not by duplication.

*Alternative considered:* denormalise `category_name` onto `transactions` for reporting convenience. Rejected — it buys a join-free report at the cost of a consistency invariant that nothing in the schema can hold, and the prior change's D1 reasoning about not splitting the counterparty out cuts the same way. *Alternative considered:* a SQL view exposing transaction plus category name. Rejected as unnecessary now and cheap to add later; if the join proves hot, an index on `category_id` (O4) is the first lever, not a copied column.

### D3 — Uncategorised is a null reference, not a sentinel category row

*Rationale:* the domain requirement that uncategorised is a state of its own and is not a category is only enforceable if the stored form has exactly one representation of it, and null is that representation. A sentinel row ("Uncategorised", pattern `a^`) would be a category that exists in the data, is referable by id, and would quietly start competing with real patterns the moment the applying change runs. Null also makes the migration's effect on existing rows fall out for free (D7) instead of requiring a backfill.

*Alternative considered:* a sentinel row plus a `CHECK` forbidding it from being referenced. Rejected — a constraint whose only purpose is to forbid a value the design never needs to write is a rule waiting to be worked around. *Alternative considered:* a `NOT NULL DEFAULT` empty string, which is exactly the "presence is not emptiness" confusion the existing schema spec already rules out for the purpose column.

### D4 — `name` is unique; `pattern` is not, and neither is part of any key

`categories.name text NOT NULL UNIQUE`, `categories.pattern text NOT NULL`, `id` identity primary key.

*Rationale:* the name is the category's identity in every user-facing sense — it is what a report prints and what a person configures — so two categories sharing one would produce reports that cannot be told apart and a configuration UI with two identical entries. This is the one natural-key unique constraint in the schema, and it is not a contradiction of the prior design: that requirement scoped its prohibition to "the six domain elements" of a *transaction*, and the reasoning there (free-text content makes a bad key) does not apply to a name that exists to be a label. The pattern is deliberately *not* unique — two categories with equivalent expressions may legitimately be named differently (a user's "Groceries" and a built-in "Food & Drink"), and preventing that would be arbitrary.

*Alternative considered:* no unique constraint on `name`, matching the prior change's blanket aversion. Rejected — the prior aversion was about transaction content, and duplicating labels here is a data-quality problem with no use case behind it. *Alternative considered:* a unique constraint on `pattern` as well. Rejected as above. *Alternative considered:* making `name` the primary key and dropping the surrogate. Rejected — it reintroduces a free-text key and would need the transactions foreign key to carry a long string, for no benefit now that a transaction may later want a stable category id that is not a mutable label.

### D5 — Referential integrity is NO ACTION: a referenced category cannot be deleted, and deletion never cascades

The foreign key is declared with no `ON DELETE` clause, which in PostgreSQL means `NO ACTION`.

*Rationale:* a transaction's category must never change without an explicit reassignment. `ON DELETE CASCADE` would delete transactions to satisfy a category deletion, which is obviously wrong. `ON DELETE SET NULL` is more dangerous and more tempting: it is a single keyword that would silently turn every transaction of a deleted category into an uncategorised one, destroying the analyser's history without anyone deciding to. Blocking the delete forces the decision to be made by whoever made it — reassign the transactions, or do not delete the category — and the spec makes that guarantee testable. Renaming or re-pattening a referenced category stays allowed, since neither participates in any key.

*Alternative considered:* soft-delete via a `deleted_at` column on `categories`. Rejected — it adds a lifecycle concept (D1's rule-with-a-lifecycle is enough for now) and an extra state to reason about, and a category is trivially re-creatable under the same name if deletion is genuinely wanted. *Alternative considered:* `ON DELETE RESTRICT` explicitly. Rejected — same behaviour as `NO ACTION`, one fewer word to keep in sync; noted here so the absence is not mistaken for an oversight.

### D6 — No `CHECK` on the pattern, and no column that expresses evaluation order

*Rationale:* the schema's structural-only boundary (the prior design's D5) is worth more than the convenience of catching a bad expression at write time, and a `CHECK` cannot actually do it anyway: PostgreSQL has no built-in regular-expression type, so validating a pattern means choosing a dialect, and PostgreSQL's own `~` operator is POSIX, not the PCRE-ish syntax most people write. Validating with the wrong dialect would reject expressions the applying code would accept, which is worse than accepting an expression nothing can use. The same reasoning excludes an `ordinal`/`priority` column: with order deliberately undecided (O1), a column for it would either sit unused or, worse, get read as the order by code that has no right to assume one. The spec's "No evaluation order is stored" and "An unusable regular expression is accepted" scenarios make both absences explicit so they read as decisions rather than omissions.

*Alternative considered:* validating the pattern in a `CHECK` using `~`. Rejected — dialect mismatch, and it would be the first content constraint on text in this schema. *Alternative considered:* a trigger that validates with the same engine the applying code will use. Rejected as premature: the engine does not exist yet, and a trigger would encode a language decision the project has not made.

### D7 — The extension is a new additive `0002_*.sql`; `0001_transactions.sql` is not modified

`db/migrations/0002_transaction_categories.sql` contains a `CREATE TABLE categories` and an `ALTER TABLE transactions ADD COLUMN category_id bigint REFERENCES categories(id)`, with a header comment naming the capabilities it implements and a rollback line, matching the `0001` file's conventions. The `0001` file is left byte-for-byte unchanged.

*Rationale:* the file-per-change convention the prior design set up (D7 there) only works if files are not edited after they are written. Modifying `0001` would mean the file no longer describes the schema a database that already applied it has, which is precisely the divergence that convention exists to prevent. Additive is also what makes the existing-rows behaviour free: `ADD COLUMN` with no default leaves every existing row null, and null is uncategorised (D3), so "all transactions are uncategorised" is a structural consequence rather than a `UPDATE` the migration has to perform and get right. Keeping the file order (`0001` then `0002`) also means a fresh database built by running both files in order reaches the same schema as an existing one that ran `0001` earlier.

*Alternative considered:* folding both statements into `0001` and treating the change as a correction. Rejected — it silently changes the meaning of a shipped file, and the `GENERATED ALWAYS` identity column and existing check constraint make `0001` a statement about the past, not a template. *Alternative considered:* a down-migration file. Rejected as in the prior design (D7 there) — no tool consumes one, and the rollback here is two statements (below).

### D8 — No secondary index on `category_id`, consistent with the prior design's D8

*Rationale:* the prior design deferred all secondary indexes because the analyser's real query patterns were unspecified (O1 there, O4 here). The honest position has not changed: categorisation is not yet applied, so no query filters or groups by `category_id`, and an index now is a guess. It is also cheap to be wrong here in the right direction — `CREATE INDEX` is additive and can be added in `0003_*.sql` at any time, whereas an unnecessary index is a permanent write cost on every import.

*Trade-off accepted:* the foreign key's referential check on `categories` delete does a sequential scan of `transactions`, and the first "spend per category" report will too. Both are correct at the scale a personal statement analyser works at, and both are fixed by one statement later (O4). A secondary index on a foreign key column is the conventional default in most schema guides, and departing from it is a deliberate, recorded choice rather than an oversight.

### D9 — At most one category per transaction, recorded in the domain model rather than left to the storage shape

*Rationale:* D1's rejection of a join table rests on a transaction having a single category, so that guarantee belongs in the domain model where it is observable behaviour, not only in the fact that `category_id` is a scalar column. Stating it there also settles the shape of the reporting question later: a transaction's spend lands in exactly one bucket, so totals by category sum to total spend without a dedup rule. The assignment rule is correspondingly a replacement, not an addition.

*Alternative considered:* leave cardinality implied by the schema. Rejected — the domain spec is the contract the applying code and the reports are written against, and "a transaction holds at most one category" is a statement about the domain, not about one table's column count.

### D10 — Amend the four contradicted requirements in place; introduce no new capability

`transaction-domain-model` and `transaction-postgres-schema` are both modified rather than extended or replaced, and no `transaction-categorisation` capability is created.

*Rationale:* the categories are not separable from what they are a category *of*. A `transaction-categorisation` capability would have to restate the purpose line, the category, and the reference in order to say anything useful, and the moment two capabilities define the same field, they drift — which is exactly what the prior design's D9 argued against when it separated storage from domain rather than merging them. A `MODIFIED` block also forces the old text to be read and rewritten deliberately: the delta carries the full prior requirement, so a reviewer sees the specific sentences being overturned ("SHALL NOT treat the purpose line as a categorisation", "SHALL NOT require reading, joining, or referencing any other table") instead of a silently narrower spec.

*Consequence to state plainly:* this change narrows two guarantees the project previously relied on. Any consumer of `transaction-domain-model` that assumed no category can ever be derived from a purpose line, or of `transaction-postgres-schema` that assumed a transaction reads without touching another table, is affected. The proposal's Impact section says so in the same words.

## Risks / Trade-offs

- **R1 — The delta overturns four existing requirements, and a consumer may not notice.** The domain model previously forbade categorising the purpose line outright and the schema previously forbade referencing a second table; both sentences are now the opposite. → Mitigation: each reversal is confined to a `MODIFIED` block carrying the full prior text, the proposal names all four in its Impact section, and the apply tasks include a task that greps the main specs for the old forbidding sentences and confirms each one is gone rather than left beside its replacement.
- **R2 — An empty or `.*` pattern is storable and would match every purpose line.** D6 declines to reject it, so a misconfigured category can silently swallow all transactions once the applying change lands. → Mitigation: recorded as a spec scenario ("An unusable regular expression is accepted") so it is a chosen behaviour with a stated cost, not a gap; the real fix is a write-time check in the applying code, where the regex dialect is known, and that is where the task belongs. Left as O5.
- **R3 — Precedence is undefined while overlapping patterns are storable.** Nothing stops two categories from matching the same purpose line, and nothing says which wins. → Mitigation: the domain spec states at most one category and explicitly states that no outcome is defined, so no consumer can infer one; the applying change is blocked on settling O1 first, because a report computed under an unstated precedence rule is wrong in a way nobody can detect. This is the single most important constraint on the follow-up work.
- **R4 — A transaction's category can contradict its own category's pattern.** Nothing ties a transaction's `category_id` to whether its purpose actually matches that category's expression. → Mitigation: deliberate. The pattern is a rule for the applying code, not a stored invariant — a check constraint cannot evaluate it (D6), and a stale assignment after a pattern is tightened is a legitimate state that a re-run of the applying code is expected to fix. Stated in the design rather than left implicit so a later reviewer does not read it as an oversight.
- **R5 — `UNIQUE` on `name` is the schema's only natural-key unique constraint, against the grain of the prior change.** A reviewer may see D4 as contradicting the prior D4. → Mitigation: the distinction is scope — the existing requirement forbids a unique constraint over *a transaction's* six content elements, and its stated reason is that free-text content makes a bad key; a category's name is a label by design. If a reviewer disagrees, the fix is dropping one `UNIQUE` clause from one file; nothing else in this design depends on it.
- **R6 — Grouping by category is a sequential scan until an index exists.** See D8. → Mitigation: purely additive to fix, recorded as O4 so it is revisited when the first report is written rather than treated as forgotten.
- **R7 — Nothing in the repository executes this migration.** The prior change had the same exposure (R6 there) and the same mitigation: apply tasks require running `0001` + `0002` against a scratch database, including a pre-populated `transactions` table so the "existing rows become uncategorised" behaviour is actually observed rather than assumed on an empty table.
- **R8 — The aggregate is no longer self-contained.** The domain model has always described a `Transaction` as the single main aggregate, and a reference out of it is the first step toward a normalised object graph. → Mitigation: bounded and stated — exactly one reference exists, it is optional, and nothing requires a `categories` row to exist for a transaction to be stored or read. If a second reference is ever added (an account, a statement, a budget), that is the change where the aggregate question must be reopened properly rather than incrementally.

## Migration Plan

Forward: apply `db/migrations/0002_transaction_categories.sql` after `0001_transactions.sql` — `CREATE TABLE categories` with its identity primary key and `UNIQUE` name, then `ALTER TABLE transactions ADD COLUMN category_id bigint REFERENCES categories(id)`. A database that has already applied `0001` gains the table and the nullable column; because the column is added with no default, every existing row holds null and reads as uncategorised, and no `UPDATE` runs and no purpose line is examined. A fresh database reaches the same schema by running `0001` then `0002` in order; `0001` is unchanged, so the file sequence remains the source of truth. The `ADD COLUMN` takes an `ACCESS EXCLUSIVE` lock only briefly, since it stores null in existing rows and rewrites no data.

Rollback: `ALTER TABLE transactions DROP COLUMN category_id;` followed by `DROP TABLE categories;`, in that order — the column must go first because it references the table. This returns the database to exactly the `0001` schema, since no other column's name, type, or nullability was touched. The only data lost is category assignments, of which there are none at rollout because nothing applies patterns yet. No down script is written, for the reason given in the prior design (D7 there): no tool consumes one.

Future schema changes stay additive in `0003_*.sql` and later, same format. Widening the category with any further element (a human-readable description, say) is an additive `ADD COLUMN`; changing `name` to be mutable-but-not-unique, or changing the delete behaviour, is a breaking change to `transaction-postgres-schema` and needs its own change.

## Open Questions

Each of these can be answered later without changing the specs written here, the approach, or the task breakdown. None of them blocks the migration; O1 blocks the *applying* change rather than this one.

- **O1 — Evaluation semantics.** Whether patterns are whole-string or partial, case-sensitive or not, evaluated in a declared order, and what happens when several match. Deliberately undecided in the domain model, and the schema stores no column that could imply an order. This must be settled before any categorisation is applied or reported, because the totals depend on it (R3).
- **O2 — When categorisation runs.** Whether the applying code is a one-off pass over existing rows, part of every import, on demand, or a combination — and therefore whether a transaction's category is expected to be kept current or is a snapshot as of some moment.
- **O3 — Who configures categories.** Whether the set is a fixed built-in list shipped with the project or user-editable, which decides whether the name-unique rule (D4) needs to tolerate a user renaming a built-in category and what happens to the rows that referenced it.
- **O4 — Indexes.** Whether a secondary index on `category_id` is warranted once a real category query exists, and whether a partial index over `WHERE category_id IS NOT NULL` would be the better first step (D8).
- **O5 — Pattern validation.** Which regex dialect applies, and therefore whether and where a pattern is checked before it is stored. The schema cannot answer this (D6) and the storage type stays dialect-agnostic `text` regardless.
- **O6 — Reporting shape for uncategorised spend.** Whether the absence of a category is surfaced as its own line in reports, given that it is explicitly not a category in the domain model (D3) — a reporting concern, not a data-modelling one.
- **O7 — More than one category per transaction.** Whether any future need justifies a many-to-many shape, which would overturn D1 and D9 and is the one deferred question that would reopen this design rather than extend it.
