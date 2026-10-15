# Proposal

## Why

The transaction tab shows the sum of the displayed transactions but not how many transactions the sum covers. A user reading the sum cannot tell whether it aggregates two rows or two hundred without counting the table by hand, so the sum lacks the sample size needed to interpret it.

## What Changes

- The transaction tab's sum area also displays the number of transaction rows currently shown, so the count and the sum describe the same set of rows.
- The count follows the active category and period filters: it updates when the visible rows change and never describes the complete response while a filter is active.
- The count uses singular wording for exactly one visible transaction and plural wording otherwise, matching the existing "N stored transaction(s)" wording style used elsewhere.
- When the filters match no rows, the count shows zero alongside the existing zero sum and empty state.
- No new data request, no API change, and no change to the table's columns.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `transaction-table`: adds a requirement that the number of currently displayed transactions is presented adjacent to the sum of displayed transactions, scoped to the same filtered rows as the sum.

## Impact

- `app/pages/index.vue`: the sum presentation near `data-testid="visible-total"` gains the visible-row count derived from the existing `visibleTransactions` computed.
- `tests/components/transactions.test.ts`: assertions for the sum area are extended to cover the count and its filter behavior.
- `openspec/specs/transaction-table/spec.md`: updated on archive with the new requirement.
- No server, API, database, or dependency changes.
