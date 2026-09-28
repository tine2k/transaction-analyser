# Design

## Context

See `proposal.md` for motivation and `specs/` for the observable contract. The existing `/analytics` page already fetches `/api/transactions` once and uses `app/utils/category-spending.ts` to group data into twelve booking-date months, sum exact absolute decimal strings, and format exact locale-aware EUR values. The shared navigation is declared in `app/layouts/default.vue`; current component coverage is in `tests/components/analytics.test.ts` and `tests/components/layout.test.ts`. The table is a distinct view, not a replacement for the pie-chart page.

## Goals / Non-Goals

**Goals:**
- Reuse the existing transaction source and exact absolute-decimal aggregation for a second read-only view.
- Present every booking month represented in returned transactions in a semantic, accessible table, with categories across columns and months down rows.
- Keep category identity distinct even when two categories share a name, while presenting stable alphabetical column order.

**Non-Goals:**
- Change the existing chart, transaction API, database schema, or stored transaction/category data.
- Add a charting or table component dependency, or introduce a new category-list request.
- Add filtering, export, or transaction drill-down interactions not required by the spec.

## Decisions

1. **Add a dedicated `/monthly-totals` route and “Monthly totals” menu entry.** Keep `/analytics` unchanged so the pie charts and matrix remain independently reachable. Extend the current shared menu and route contracts rather than replacing or renaming an existing screen. An inline table below the charts was considered, but a separate route matches the request for a new menu item and keeps each view focused.

2. **Build the matrix from the same single transaction response and include all represented booking months.** The current `groupTransactionsByMonth` helper creates a rolling twelve-month window, so the table's aggregation must group the returned transactions by their booking-date calendar month without that cutoff and order represented months newest first. Do not synthesize rows for months with no returned transactions. Derive the union of category keys from these month groups, then place each monthly total into a category-keyed cell. Use the existing exact absolute-decimal summation and EUR formatter rather than converting transaction amounts to floating point. A second API endpoint or a database aggregation was considered, but neither is needed and both would duplicate domain behavior or expand the API surface.

3. **Use category identity for columns and name for presentation/order.** Named category keys already distinguish equal names. Sort names case-insensitively, break ties by identity, and place `Uncategorised` last when present. Render the values in a native semantic HTML table instead of a chart or generic grid so the row and column headers express the requested dimensions and remain accessible.

4. **Keep matrix cells aligned while leaving zero totals visually blank.** Initialize category/month cells as exact zero totals, then render a value only when the exact total is nonzero. Keep the table cell present for zero totals so category columns stay aligned. If there are no returned transactions, do not invent month rows or category columns and show the defined no-data message.

## Risks / Trade-offs

- [A wide table can exceed narrow viewport width] → Keep the table within a horizontally scrollable container while preserving semantic headers and readable amounts.
- [Full returned history can produce many month rows] → Avoid an arbitrary lookback cutoff; retain newest-first order and the existing compact table presentation.
- [A large number of categories can make comparisons visually dense] → Keep the table compact and avoid adding unrelated controls; all represented categories remain available as columns.
- [Floating-point conversion could lose exact cents or large values] → Keep sums in the existing decimal-string/bigint helpers and format their exact string results.

## Migration Plan

No data migration or API deployment is required. Deploy the new route and menu entry with the existing app; rollback consists of removing the route and menu entry, with no stored data to restore.
