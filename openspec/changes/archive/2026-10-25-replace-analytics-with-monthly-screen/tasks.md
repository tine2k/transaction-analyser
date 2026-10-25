# Tasks

## 1. Month selection and aggregation utilities

- [x] 1.1 Add pure helpers in `app/utils/category-spending.ts` for the twelve months of a calendar year, resolving `month=YYYY-MM` with the current/newest/current fallback, filtering transactions to one calendar month, building absolute category totals with transaction counts, splitting the top eight from `Other N`, and computing share-of-largest percentages; keep every amount as an exact decimal string. Verify the new unit tests in `tests/unit/category-spending.test.ts` pass.
- [x] 1.2 Add unit tests covering the default-month order, a supplied month across years, year options, twelve months per year, empty months, both amount signs, uncategorised and hidden exclusion, zero amounts, ordering and name tie-breaks, top-eight aggregation, and share percentages. Verify `pnpm run test:unit` passes.
- [x] 1.3 Confirm the helpers used by the transactions screen, Monthly totals, and Monthly average still behave unchanged by running their existing unit and component tests. Verify `pnpm run test:unit` and `pnpm run test:components` pass before the page rewrite.

## 2. Monthly screen

- [x] 2.1 Create `app/pages/monthly.vue` with the single `GET /api/transactions` fetch, year control, twelve month pills, `Total moved` and `Transactions` figures, top-eight stacked bar with legend, category table, loading/failure/empty-month states, and the retained person, expense-type, and hide-uncategorised controls. Verify the page renders all sections from a mocked transaction response in a component test.
- [x] 2.2 Wire the selected month to `month=YYYY-MM` in the route query, preserve `person`, recompute on month/year/filter changes without another request, and keep the year control in step with the selected month. Verify component tests assert the query, the default month, and that `useFetch` is called once.
- [x] 2.3 Add the category table rows as links to `/` with `month`, `category`, and `person` (omitted for all people), and verify named, uncategorised, and all-people links in component tests.
- [x] 2.4 Verify the table's semantics and the control's accessibility: a caption, column headers, an accessible scroll region, month buttons with `aria-pressed` in a labelled group, a labelled year control, and a legend that carries every segment's name and amount. Verify with component assertions.
- [x] 2.5 Replace `tests/components/analytics.test.ts` with Monthly component tests covering one fetch, the default and linked month, both amount signs, exact locale amounts, ordering, top-eight plus Other, zero amounts, hidden categories, uncategorised visibility, person and expense-type scoping, failure/loading/empty states, and no chart component. Verify `pnpm run test:components` passes.

## 3. Route, navigation, and redirect

- [x] 3.1 Replace the `Analytics` entry in `app/layouts/default.vue` with `Monthly` at `/monthly`, keeping seven links and the existing order, and update the title mapping so `/monthly` reads `Monthly · Expenses`. Verify the layout and document-title tests assert the new label and title and no `Analytics` link or title remains.
- [x] 3.2 Add the `/analytics` redirect to `/monthly` and remove the old Analytics page. Verify a browser test requests `/analytics` and lands on `/monthly` with the Monthly heading.
- [x] 3.3 Update the navigation focus/current-state test indexes and every hard-coded `Analytics` expectation, including `tests/components/layout.test.ts` and the menu-label assertion in `tests/browser/redesign-transactions-screen.spec.ts`. Verify `pnpm run test:components` passes and the redesigned-menu browser test expects `Monthly`.
- [x] 3.4 Replace the README's Analytics screen entry with the Monthly screen's actual behaviour: one selected month, year and month controls, `Total moved` and `Transactions`, the top-eight bar, the category table, and the retained person and expense-type filters. Verify the screen list no longer describes pie charts or a years view.

## 4. Remove the pie chart and charting dependencies

- [x] 4.1 Delete `app/components/CategoryPieChart.vue` and `tests/components/category-pie-chart.test.ts`, remove the `vue-echarts/style.css` import, and remove `echarts` and `vue-echarts` from `package.json`. Verify `rg "CategoryPieChart|vue-echarts|from 'echarts'|from \"echarts\"" app tests package.json` reports no remaining consumer.
- [x] 4.2 Remove the analytics-only helpers that no remaining screen imports, such as rolling chart datasets, pie data, and yearly grouping, while keeping the shared filters, decimal sums, formatting, colour map, and monthly-totals/average helpers; update comments in `app/pages/index.vue` and `app/utils/category-spending.ts` that still call the Monthly screen "analytics". Verify `pnpm run build` succeeds and `pnpm run test:unit` and `pnpm run test:components` pass.
- [x] 4.3 Run `pnpm install` and confirm the darwin and linux arm64 native packages are still present in `node_modules`, then verify `pnpm run build` succeeds.

## 5. Browser and responsive verification

- [x] 5.1 Update `tests/browser/expense-type-filter.spec.ts` to open `/monthly` and assert the expense-type selection changes the summary figures, bar legend, and table rows without another transaction request. Verify the targeted test passes in the browser suite.
- [x] 5.2 Update `tests/browser/responsive.spec.ts` with `/monthly` and the `Monthly` heading, assert the summary figures, month controls, bar, and table at 320px and desktop widths, and add the monthly category table's own-scroll assertion while keeping page overflow absent. Verify the responsive tests pass.
- [x] 5.3 Add browser coverage for the selected month URL: opening `/monthly?month=YYYY-MM` selects that month, and changing month or year updates the query and keeps `person` intact. Verify the targeted tests pass.
- [x] 5.4 Run the full browser suite through the disposable test database launcher, with the inherited `DATABASE_URL` unset, and verify every browser test passes. Use `pnpm run test:browser`.

## 6. Final integration checks

- [x] 6.1 Run `openspec validate "replace-analytics-with-monthly-screen" --strict` and verify the change reports no issues.
- [x] 6.2 Run `pnpm run test` and verify the unit, component, and integration suites pass against the disposable PostgreSQL database.
- [x] 6.3 Run `pnpm run build` and verify the production build completes with the Analytics page removed and the Monthly page present.
- [x] 6.4 Inspect `git diff` for the route, layout, page, utility, dependency, and test changes, and verify no unrelated screen or generated output is included.

## Workflow follow-up

- Archive the change after review, then commit and push the archived result as the project's archive rule requires.
