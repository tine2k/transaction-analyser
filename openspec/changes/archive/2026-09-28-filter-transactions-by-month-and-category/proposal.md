# Proposal

## Why

The transaction table can currently show all rows or uncategorised rows, but it cannot narrow a month or a named category. Monthly pie charts summarize spending without a direct path to the transactions behind a total, and the table gives no sum for the rows currently in view.

## What Changes

- Add month and category filters to the transaction list, preserving the current uncategorised-only initial selection when no category filter is specified.
- Make each monthly chart heading link to the transaction list filtered to that month and all categories; make each pie slice link to the same month and its category.
- Show the exact signed arithmetic sum of the transaction amounts currently displayed in the table. The sum is based on the visible rows, uses exact decimal arithmetic, and is not a transaction column.
- Keep filtering and navigation read-only and use the existing transaction response; no API or database changes are planned.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: define composable month and category filters, filter deep links, and a sum for currently visible rows.
- `category-spending-chart`: define navigation from each month heading and category slice to the matching transaction-list filters.

## Impact

- Affects `app/pages/index.vue`, `app/pages/analytics.vue`, and the pie-chart interaction in `app/components/CategoryPieChart.vue`.
- Adds or updates component and unit tests for filter state, navigation targets, and exact totals.
- Leaves `GET /api/transactions`, its response shape, database schema, and stored data unchanged.

## Assumptions

- Month filtering uses the transaction booking date, consistent with the monthly charts.
- A table sum is signed arithmetic (incoming amounts offset outgoing amounts) over only the rows currently shown, including rows shown by a deep link. It preserves exact decimal values rather than rounding through floating-point arithmetic.
