# Tasks

## 1. Shared year aggregation utilities

- [x] 1.1 Add calendar-year grouping and chart helpers to `app/utils/category-spending.ts`: `CalendarYear`, `YearlyCategoryGroups`, `YearlyCategoryTotals`, `YearlyCategoryChartData` types, `groupTransactionsByAvailableYear` (excludes hidden-category transactions, buckets by booking year, newest first, calendar-year bounds), `getYearlyCategorySpendingTotals`, and `createYearlyCategoryChartData` reusing `getCategorySpendingTotals` and `createCategoryPieData`; verify with new unit tests in `tests/unit/category-spending.test.ts` covering hidden-category exclusion, whole-year absolute sums across months, newest-first year order, empty input, and the year label
- [x] 1.2 Run `npm run test:unit` and confirm all unit tests pass

## 2. Transactions screen period filter

- [x] 2.1 In `app/pages/index.vue`, replace the month select with the combined period select (all periods, represented months newest first, each year's months before its `YYYY (year)` choice), including the `period-filter` test id, period matching (`all` / `YYYY-MM` / `YYYY`), and the query contract (`month` wins over `year`, unknown values fall back to all periods); verify with updated tests in `tests/components/transactions.test.ts` covering year selection, year-link initialization, data-driven options and order, fallback, and unchanged row order and counts
- [x] 2.2 Run `npm run test:components` and confirm the transaction filter tests pass
- [x] 2.3 Update the README bullet describing the transactions table filter to say it filters by category and period (month or year), and verify the sentence matches the shipped control

## 3. Analytics months/years view

- [x] 3.1 In `app/pages/analytics.vue`, add the months/years switch defaulting to months, render year panels from the new year helpers (year heading links with `year=YYYY&category=all`, category totals and slices link with `year=YYYY&category=...`), keep the hide-uncategorised control shared, show the per-year and no-years empty states, and compute one color map over the union of monthly and yearly category keys; verify with updated tests in `tests/components/analytics.test.ts` covering the default view, switching without another fetch, year aggregation, hidden categories, empty states, year links, and color consistency
- [x] 3.2 Run `npm run test:components` and confirm the analytics tests pass
- [x] 3.3 Update the README analytics bullet to mention the months/years switch and the years view, and verify the sentence matches the shipped page

## 4. Integration verification

- [x] 4.1 Run `npm test` (unit, components, and integration against a disposable local PostgreSQL database created per `AGENTS.md`, with `DATABASE_URL` unset and `TEST_DATABASE_URL` pointing at it, dropping the database afterwards) and confirm the suite passes
- [x] 4.2 Run `npm run build` then `npm run test:browser` with headless Chromium and confirm the browser suite passes, including the analytics page's default twelve monthly panels

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
