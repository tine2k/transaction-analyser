# Tasks

## 1. Aggregation Foundation

- [x] 1.1 Add `CategoryMonthlyAverageRow` and `CategoryMonthlyAverageData` types plus `createCategoryMonthlyAverageData` in `app/utils/category-spending.ts`, returning oldest-first window months and per-category exact cells, total, rounded average, and row maximum; verify with unit tests covering chronological months, cells, totals, averages, row maximum, zero months, hidden exclusion, uncategorised, stable order, and window edge cases.
- [x] 1.2 Add `getWindowAbsoluteTotal` and a month-range formatter for the subtitle; verify unit tests cover exact absolute totals, out-of-window and hidden exclusion, a one-month range, a twelve-month range, and a range crossing a year boundary.
- [x] 1.3 Remove `getCategoryMonthlyAverages` and migrate its unit cases to the new builder; verify `pnpm exec vitest run tests/unit/category-spending.test.ts` passes and no source or test references the old helper.

## 2. Page Redesign

- [x] 2.1 Wire `app/pages/monthly-average.vue` to the new builder, deriving the selected transactions, rows, window total, current-selection figure, recurring figure, and one-time figure while keeping the existing list markup temporarily; verify the component test still makes one `/api/transactions` request and shows the expected averages.
- [x] 2.2 Replace the scattered controls with one filter panel and five stacked-label controls: person, a new expense-type select, months, sort column, and sort direction; derive the subtitle count and month range from the applied window; verify component tests cover the select-based type filter, the dynamic subtitle, and the last-valid-window rule.
- [x] 2.3 Add the three neutral summary cards on surface sheets with ink values and exact monthly figures; verify component tests cover the default figures, expense-type effect on the current-selection card only, person effect on all cards, typed-category exclusion, hidden-category exclusion, and zero figures on empty data.
- [x] 2.4 Replace the list with the semantic comparison table: caption, labelled scroll region, category row header with palette mark, per-month trend bars, relative average bar on a white rule track, exact window total, exact average per month, and `aria-sort` with a visible direction mark; verify component tests cover every column, one bar per window month, row-relative bar counts, exact totals, default and changed sort state, and the scroll hint.
- [x] 2.5 Complete the loading, failure, and empty states and the accessibility treatment: decorative trend and bar cells, touch-sized controls, no page overflow, and the existing no-data message with zero cards; verify component tests cover the three distinct states and `pnpm exec vitest run tests/components/monthly-average.test.ts` passes.
- [x] 2.6 Update the page's header comment to reference this change's `specs/monthly-category-average/spec.md` and `design.md` decisions D1-D10; verify the referenced files and sections exist.

## 3. Browser and Responsive Coverage

- [x] 3.1 Update `tests/browser/expense-type-filter.spec.ts` for the new expense-type select using `selectOption`; verify `pnpm run test:browser -- tests/browser/expense-type-filter.spec.ts` passes with the existing three-category fixture.
- [x] 3.2 Extend `tests/browser/responsive.spec.ts` for `/monthly-average`: summary cards, filter panel, row count, trend bars, and the table's own horizontal scroll at 320, 390, 768, and 1280 CSS pixels; verify `pnpm run test:browser -- tests/browser/responsive.spec.ts` passes at every viewport with no page-level overflow and 44-pixel controls.
- [x] 3.3 Update the `/monthly-average` surface mapping in `tests/browser/surface-elevation.spec.ts` to the new table panel; verify `pnpm run test:browser -- tests/browser/surface-elevation.spec.ts` passes.
- [x] 3.4 Add computed-style contrast assertions for the sparkline bars and the filled average bars using `tests/browser/contrast.ts`, asserting at least 3:1 against their actual ground; verify the browser spec passes and the solid fills are used rather than the mockup's reduced opacity.
- [x] 3.5 Run the complete browser suite with `pnpm run test:browser` and headless Chromium; verify every spec passes and the Monthly average findings are reported alongside the rest.

## 4. Integration Verification

- [x] 4.1 Run `pnpm run test:unit` and `pnpm run test:components`; verify both suites pass with no references to the removed helper or radio-based expense-type controls.
- [x] 4.2 Run `pnpm run test:integration` with a uniquely named disposable PostgreSQL database and `DATABASE_URL` unset; verify the build and integration suite pass and the disposable database is dropped.
- [x] 4.3 Inspect `/monthly-average` headlessly at desktop and phone widths against `design/Averages.dc.html`; verify the title, filter panel, three summary cards, five table columns, sparkline, exact totals, and scroll hint are present with no page-level overflow or clipped content.

## Workflow follow-up

- Archive the change after review; the archive workflow commits and pushes per `AGENTS.md`.
