# Proposal

## Why

An import writes its rows uncategorised: the matching rules run only when the category set changes. So after importing a statement, the new rows sit uncategorised until someone happens to create, edit, or delete a category — even though the categories that should claim them already exist. An import should check each row it writes against the categories as they stand, so a run lands in the state the next category change would produce, with no manual nudge.

## What Changes

- When an import writes new transactions, each newly written row SHALL be evaluated against the stored categories by the existing assignment rules — expressions first, then date windows, smallest identity wins — and stored with the winning category, or left uncategorised when nothing matches.
- The check SHALL cover only the rows that import writes: rows already stored are not re-evaluated and their categories are unchanged.
- The check SHALL be part of the import's single write unit, so a failure leaves neither the rows nor any assignment behind.
- The CSV file's own `Category` column SHALL stay discarded; the bank's classification is not the input to the check.
- The non-writing (dry-run) mode SHALL still write nothing and assign nothing.
- The run SHALL report how many newly written rows received a category, and the import log record and the imports screen SHALL carry that count.
- Both the manual CSV import and the Easybank sync gain the behaviour, because they share the same import path.
- **BREAKING** (spec-level): the guarantees that "every imported transaction is uncategorised" and that a newly stored transaction waits for the next category change no longer hold for imported rows. No stored data is rewritten: rows imported before this change stay uncategorised until the next category change, which already re-evaluates every transaction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-assignment`: Assignment gains a second trigger — an import writes rows — scoped to the newly written rows and using the same expression-then-window rule; the rule that a newly stored transaction waits for the next category-set change is removed for imported rows.
- `transaction-csv-import`: The "every imported transaction is uncategorised" requirement is replaced by assignment on write; the write unit includes the assignment; the run reports the categorised count.
- `easybank-sync`: Rows the sync imports are categorised by the same import path, so a sync lands in the same state as a CSV import.
- `import-log`: The record and the imports screen gain the number of newly written rows that received a category.

## Impact

- **Spec deltas**: `specs/category-assignment/spec.md`, `specs/transaction-csv-import/spec.md`, `specs/easybank-sync/spec.md`, and `specs/import-log/spec.md`.
- **Schema**: one additive migration adding a categorised count to `import_runs`; `transactions` and `categories` are unchanged, and no stored transaction is rewritten.
- **Shared import core**: `shared/transactions-import.ts` inserts each new row with `RETURNING id`, assigns within the same transaction, and returns the categorised count in `ImportPlan`; the matching SQL is shared with `server/utils/categories.ts` so both paths apply one rule.
- **Tooling and server**: `tools/import-transactions.ts` and `shared/easybank-sync.ts` report and record the new count; `server/api/imports.get.ts` returns it; `app/pages/imports.vue` shows it.
- **Tests**: unit coverage for the plan and report shape, integration coverage for assignment on a CSV import and a sync import, and component coverage for the log column.
