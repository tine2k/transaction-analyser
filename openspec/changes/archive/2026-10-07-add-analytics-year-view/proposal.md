# Proposal

## Why

The analytics page only aggregates the last 12 calendar months, so spending patterns from earlier years are invisible. Users need a year-level view that sums every calendar year where transaction data exists, and the transactions screen must be able to filter by those years so the year panels can link to their matching transactions.

## What Changes

- Add a months/years switch to the analytics page, defaulting to the existing months view. The months view keeps its current behaviour: twelve panels for the last twelve calendar months.
- Add a years view to the analytics page: one panel per calendar year with at least one eligible transaction, ordered newest to oldest, each summing the absolute category totals of the whole year into the existing pie-chart and category-total presentation. The existing hide-uncategorised control applies to both views.
- Year panels link into the transactions screen: the year heading links with the year and all categories, and each category total and pie slice links with the year and that category.
- Replace the transactions screen's month-only filter with a single period filter: all periods, each calendar month represented in the returned data, and a year entry for each calendar year represented in the returned data, ordered newest to oldest with a year's months listed before its year entry (for example `May 2026`, `April 2026`, `2026 (year)`, `May 2025`, `2025 (year)`). **BREAKING** for the filter's option list: months with no returned transactions are no longer offered, and the filter can now select a calendar year.
- Selecting a year filters the table to transactions whose booking date falls in that calendar year. The selected period is reflected in the index route query (`year=YYYY` for a year, the existing `month=YYYY-MM` for a month) so links initialize the control. Month behaviour is unchanged.
- Add shared utilities that group transactions by available calendar year and sum their absolute category totals.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-spending-chart`: the analytics page gains a months/years view switch and a years view that sums each available calendar year, including year-based links to the transactions screen.
- `transaction-table`: the read-only month filter becomes a combined period filter that can select all periods, a calendar month, or a calendar year, with the selection represented in the route query.

## Impact

- `app/pages/analytics.vue`, `app/pages/index.vue`, `app/utils/category-spending.ts`
- Component, unit, and browser tests covering the analytics page, the transaction list filters, and the shared utilities
- No API, database, or dependency changes: `GET /api/transactions` remains the single read-only data source and no stored data changes.
