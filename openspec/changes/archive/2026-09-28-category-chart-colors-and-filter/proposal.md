# Proposal

## Why

The twelve monthly category pie charts are harder to compare when a category's color changes from month to month. Uncategorized spending can also dominate the comparison when a user wants to focus on assigned categories, but there is currently no way to hide it.

## What Changes

- Use a consistent color for each category across all monthly charts.
- Add a page-wide control to hide or show the `Uncategorised` category across the monthly charts.
- Keep uncategorised visible by default, preserving the current display unless the user changes the control.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-spending-chart`: define stable category colors and page-wide visibility control for uncategorised totals.

## Impact

- Affects `app/pages/analytics.vue`, `app/utils/category-spending.ts`, and the analytics component tests.
- No API, database, or dependency changes are expected; the existing monthly chart and transaction data flow remain in use.
