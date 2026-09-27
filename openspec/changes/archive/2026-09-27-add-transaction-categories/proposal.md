# Proposal

## Why

The domain model gives every transaction a free-text purpose line and nothing to do with it, so the analyser cannot answer the only question that makes a personal transaction statement worth analysing: "what did I spend on groceries, rent, and travel?". Categories have to exist before they can be counted or plotted, and the rule that decides which category a transaction belongs to is a regular expression over the purpose line — a decision that needs to be written down before any categorisation code, import, or report depends on it. This change puts that decision in the domain model and in the schema, and stops short of applying it: a transaction is categorised only once a later change actually runs the patterns.

## What Changes

- Add an optional category to the `Transaction` aggregate: a transaction may carry a category, and a transaction with no category is well-formed and reads as uncategorised rather than as a default or placeholder category.
- Introduce `Category` in the domain vocabulary as a named rule consisting of a name and a regular expression, where the expression is the definition of which transactions the category covers because it is applied to the purpose line.
- Amend the domain model's `Transaction aggregate` requirement: the category becomes a seventh data element, optional, alongside the six existing required-and-optional elements.
- Amend the domain model's `Purpose line is free text` requirement, which today explicitly forbids treating the purpose line as a categorisation. The purpose line remains unstructured and unparsed, but it is now permitted to be *matched* by a category's expression — the first and only thing derived from it.
- Deliberately defer how patterns are evaluated: ordering between categories, case sensitivity, what happens when several patterns match, and whether matching is whole-string or partial. This change fixes *that* a category is defined by a regular expression over the purpose line, not the algorithm.
- Add a `categories` table to the schema holding one row per category (its name and its regular expression), and a nullable `category_id` foreign key on `transactions` referencing it.
- Amend the schema capability's `One row per transaction, held in a single table` requirement, which today forbids referencing any other table, so that exactly one reference — to `categories` — is permitted.
- Amend the schema capability's `No derived or extra data is stored` scenario, which today asserts the schema is a single table of seven columns, to account for the new table and column.
- Add `db/migrations/0002_transaction_categories.sql`, which creates `categories` and adds the nullable `category_id` column to `transactions`. Existing rows keep `category_id` as NULL, which is the state that means uncategorised.
- No application code is written by this change. The regex is stored, not applied; nothing evaluates it yet.

## Capabilities

### New Capabilities

None. Categories extend the existing domain vocabulary and the existing stored shape; they do not stand on their own.

### Modified Capabilities

- `transaction-domain-model`: the `Transaction aggregate` requirement changes, because the aggregate gains a seventh, optional data element (the category) and the list of required elements is restated with it. The `Purpose line is free text` requirement changes, because it currently forbids treating the purpose line as a categorisation and must now permit a category's regular expression to be matched against it while keeping the text unstructured and unparsed. New requirements are added for what a `Category` is (a name plus the regular expression that defines it) and for the category being optional with uncategorised as the default state.
- `transaction-postgres-schema`: the `One row per transaction, held in a single table` requirement changes, because storing and reading a transaction must now be permitted to reference exactly one other table, `categories`. The `The schema carries no business validation` requirement changes, because a foreign key is a new kind of structural guarantee the schema now carries, and its boundary needs restating. New requirements are added for the `categories` table's own shape and for the nullable reference from `transactions` to it.

## Impact

- **Spec deltas**: `specs/transaction-domain-model/spec.md` and `specs/transaction-postgres-schema/spec.md` in this change, both with `MODIFIED` and `ADDED` requirement sections.
- **New file**: `db/migrations/0002_transaction_categories.sql`, a plain SQL migration in the same numbered, tool-agnostic format as `0001_transactions.sql`, so the same runner or `psql -f` adopts it unchanged.
- **Schema**: a database that has applied `0001_transactions.sql` gains a `categories` table and one nullable column on `transactions`. `0001_transactions.sql` itself is not modified, so the forward path stays additive and re-applying `0001` to a fresh database still produces a schema equivalent to `0001` + `0002`.
- **Code**: none. The repository still has no application source, package manifest, ORM, or chosen language, and the categorisation rule is deliberately not executed by this change.
- **Existing data**: none is affected. Every row written by `0001` reads as uncategorised after the migration, which is the correct pre-existing state rather than a backfill.
- **Compatibility**: the change is additive at the storage level and is a deliberate, stated widening at the spec level. The two amended requirements above currently say the opposite of what this change needs them to say, so a consumer relying on "a transaction needs no other table" or "no category is derived from the purpose line" is affected and should be read against the amended text.
- **Downstream**: the future change that applies the patterns, the import that writes categories, and any aggregation or reporting over categories all bind to the shape fixed here. Whether matching is deterministic, and how overlapping patterns are resolved, must be settled by that later change before any report can be trusted.
- **Open questions deferred**: pattern evaluation order and precedence, case sensitivity, whole-string versus partial matching, whether a category may be renamed or deleted while transactions reference it, whether a category is user-editable or a fixed built-in set, and whether a second index on `category_id` is warranted. These are recorded in design.md.
