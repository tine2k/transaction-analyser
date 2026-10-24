# Proposal

## Why

The transactions table opens on all periods, so it mixes several years of transactions and dilutes the view users care about most: the current year. It also always opens on the uncategorised filter even when nothing is uncategorised, which yields an empty table and hides the year's categorised activity. The initial view should reflect the current year and only narrow to uncategorised when that narrowing is useful.

## What Changes

- Default the period filter to the current calendar year when the returned transactions include it.
- When the current calendar year has no returned transactions, default the period filter to the newest calendar year represented in the returned transactions; when no transaction is returned, keep All periods.
- Default the category filter to Uncategorised when at least one transaction in the default period has no category; otherwise default it to All categories so the default period's transactions are visible.
- **BREAKING** (spec-level): replace the existing unconditional uncategorised default and all-periods default in the `transaction-table` capability with the period-aware defaults above.
- Keep explicit query values authoritative: a supplied `category`, `month`, or `year` still initializes the controls and rows as before; defaults apply only when the query does not specify a usable value.
- Keep filter counts, option ordering, filtering, sorting, sum, and count behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: changes the initial category and period selections of the read-only filter, and adds the period-aware uncategorised default and the newest-represented-year fallback.

## Impact

- `app/pages/index.vue`: default filter derivation from the loaded transactions and the current date; the existing query watcher and filter option source remain the basis.
- `tests/components/transactions.test.ts`: default-selection cases for current-year data, uncategorised presence and absence, data without the current year, and empty responses.
- No API, database schema, migration, or dependency changes; `GET /api/transactions` is unchanged.
