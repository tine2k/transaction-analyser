# Proposal

## Why

The Monthly average screen is the last analysis screen still presented as a plain two-column list. The Averages design (`design/Averages.dc.html`) turns the same data into a comparison table with a per-category monthly trend, the window total, and page-wide summary figures, so categories can be read by amount, shape, and total at a glance. The current page computes the average but throws away the monthly breakdown the design needs.

## What Changes

- Replace the two-column category list with a semantic comparison table: category (colour mark and name), the per-month trend for the configured window, average monthly spend with a share bar, exact window total, and exact average per month.
- Add a row-relative sparkline showing one bar per month in the configured window, scaled to that category's largest month, including months with no spend.
- Add three summary figures above the table: average per month for the current person and expense-type selection, recurring per month, and one-time per month.
- Restyle the controls into one filter panel with stacked labels, following the Transactions filter pattern: person, expense type, window length, sort column, and sort direction.
- Keep the averaging window configurable with a default of 12 months (the design's fixed "last 12 months" behaviour is the default, not a replacement), and make the table and subtitle labels reflect the applied window (`Last N months`, `N-month total`).
- Keep the summary figures on neutral surface cards with ink values; the design's coloured card grounds are not adopted, matching the established palette and amount-colour rules.
- Keep category colours from the single application palette, keep `Uncategorised` as a listed entry, keep sorting by average amount or category in either direction, and keep the single transaction read with all filtering client-side.
- Add a richer pure aggregation helper that returns the window months and, per category, the exact monthly totals, window total, rounded average, and row maximum, replacing the average-only helper.
- Add responsive and accessibility treatment: the table scrolls within its own labelled region, controls reflow on phones, the sparkline is a decorative summary, and the sorted column reports its sort state.

### Assumptions

- The screen keeps the name `Monthly average` and the `/monthly-average` route; the design's `Averages` navigation label belongs to the separate navigation reorganisation.
- The configurable window is retained rather than removed, because it is an existing specified capability.
- The recurring and one-time summary figures describe typed categories only and ignore the expense-type selection; they are context for the selected person and are not a partition of the all-types average.
- The mockup's category links, hide-uncategorised control, and fixed-height table scroll region are out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monthly-category-average`: adds the window trend, exact window total, summary figures, and the comparison-table presentation while retaining the existing window, person, expense-type, sort, hidden-category, and empty-state behaviour.
- `frontend-shell`: extends the permitted derived values for the Monthly average page to its per-month category totals, window totals, page-wide average, and recurring and one-time monthly averages.
- `responsive-frontend`: adds the Monthly average screen's phone reflow and its table's own scroll region.

## Impact

- `app/pages/monthly-average.vue` — full template restructure and the new derived values.
- `app/utils/category-spending.ts` — new window aggregation helper and window-total helper; removal or replacement of the average-only helper.
- `tests/unit/category-spending.test.ts`, `tests/components/monthly-average.test.ts`, `tests/browser/expense-type-filter.spec.ts`, `tests/browser/responsive.spec.ts`, `tests/browser/surface-elevation.spec.ts` — new aggregation cases, table and summary assertions, and the select-based expense-type flow.
- No API, database, route, navigation, dependency, or stored-data changes. The page still makes one `GET /api/transactions` request.
