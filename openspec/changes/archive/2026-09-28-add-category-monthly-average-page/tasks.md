# Tasks

## 1. Average aggregation helpers

- [x] 1.1 Generalise the rolling-window month helper to `getLastCalendarMonths(today, count)` and keep `getLastTwelveCalendarMonths` as a wrapper; extend `tests/unit/category-spending.test.ts` to cover windows other than twelve and the unchanged twelve-month behavior, and verify with `npm run test:unit`.
- [x] 1.2 Add a helper that divides an exact absolute decimal-string sum by a month count and rounds to two decimals (halves away from zero), plus a helper that builds the ordered category-average entries (name case-insensitively ascending, identity tie-break, `Uncategorised` last) from in-window transactions; extend `tests/unit/category-spending.test.ts` for empty-month zeros, absolute sums, exact-cent rounding, ordering, and exclusion of out-of-window transactions, and verify with `npm run test:unit`.

## 2. Monthly average screen

- [x] 2.1 Add the `/monthly-average` page with a single read of `GET /api/transactions`, a month-count control defaulting to 12 that recomputes from the fetched data without a new request and keeps its last valid value on invalid input, a stated applied window, exact locale-formatted averages, and loading/error/empty states; add `tests/components/monthly-average.test.ts` covering the default window, recomputation, invalid input, ordering, and states, and verify with `npm run test:components`.

## 3. Navigation and integration

- [x] 3.1 Add the “Monthly average” link to the shared menu in `app/layouts/default.vue` and extend `tests/components/layout.test.ts` to verify its route and active-state behavior; verify with `npm run test:components`.
- [x] 3.2 Run `npm run test:unit && npm run test:components` to confirm the new page, its helpers, the navigation, and the existing Analytics and Monthly totals screens all pass.
