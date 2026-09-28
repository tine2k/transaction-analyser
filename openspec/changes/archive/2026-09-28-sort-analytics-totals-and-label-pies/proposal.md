# Proposal

## Why

Monthly category totals currently appear in transaction encounter order, and the pie slices have no visible labels. Amounts also omit locale-specific grouping, making larger values harder to scan and compare. Sorting, readable localized amounts, and labels on every slice make the existing analytics easier to interpret without changing its data or monthly scope.

## What Changes

- Sort each month's visible category totals from largest amount to smallest; use that same ordering for the corresponding pie slices.
- Format displayed euro amounts using the browser's locale and include locale-appropriate thousands grouping while preserving exact totals.
- Show a visible label on every pie slice containing its category name and formatted amount.
- Preserve the existing twelve-month layout, category colors, uncategorised filter, and read-only data source.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-spending-chart`: Specify descending per-month total and slice ordering, browser-locale euro formatting with grouping, and visible category-and-amount labels on every pie slice.

## Impact

- Affects `app/pages/analytics.vue` and `app/utils/category-spending.ts`, with corresponding updates to analytics component and utility tests.
- No API, database, or dependency changes are expected.
