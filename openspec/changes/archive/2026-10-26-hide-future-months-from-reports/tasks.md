# Tasks

## 1. Shared elapsed-period helpers

- [x] 1.1 Add `isFutureMonthKey`, `isFutureYear`, and `getElapsedCalendarYearMonths` to `app/utils/category-spending.ts`, with unit cases for the current month boundary, the first future month, past years, and future years; verify with `pnpm exec vitest run tests/unit/category-spending.test.ts`.
- [x] 1.2 Filter future years out of `getAvailableYears` and make `resolveSelectedMonth` reject future month values and ignore future months when finding the newest represented fallback; verify the new and updated unit cases in `tests/unit/category-spending.test.ts`.
- [x] 1.3 Filter future years out of `getYearlyYearOptions` and make `resolveSelectedYear` reject future year values and ignore future years when finding the newest represented fallback; verify the new and updated unit cases in `tests/unit/category-spending.test.ts`.

## 2. Monthly controls

- [x] 2.1 In `app/pages/monthly.vue`, build the month controls with `getElapsedCalendarYearMonths` and clamp the month when a year change would land after the current month; verify past years still show twelve pills and the current year stops at the current month.
- [x] 2.2 Update `tests/components/monthly.test.ts` for the current-year pill count, a past year's twelve pills, the year-switch clamp, and a future `month` link falling back to the default month; verify with `pnpm run test:components`.

## 3. Yearly matrix

- [x] 3.1 Extend `createYearlyCategoryMatrixData` with today's date so it emits only elapsed month cells, totals every transaction in the selected year including hidden future months, keeps future-only categories as rows, and scales the tint from shown cells only; verify with unit cases in `tests/unit/category-spending.test.ts`.
- [x] 3.2 Update `app/pages/yearly.vue` to pass today to the matrix builder and remove the not-yet-elapsed dash branch; verify a zero shown cell renders blank and populated cells keep their links and amounts.
- [x] 3.3 Update `tests/components/yearly.test.ts` for current-year column counts, a past year's twelve columns, a future-only category with a nonzero total, a year total larger than the visible cells, and a future `year` link falling back; verify with `pnpm run test:components`.

## 4. Transactions period filter

- [x] 4.1 In `app/pages/index.vue`, skip future months and future years when building the period choices while leaving row matching for `All periods` and search unchanged; verify component cases that a future month/year is absent from the options and a future-dated row still appears under all periods and search.
- [x] 4.2 Update `tests/components/transactions.test.ts` for the hidden period options, future query fallback through the existing unknown-period behavior, and future-dated rows remaining in all-period and search views; verify with `pnpm run test:components`.

## 5. Documentation and browser verification

- [x] 5.1 Update the Monthly and Yearly descriptions in `README.md` so they no longer claim twelve month pills or twelve columns for the current year; verify the wording matches elapsed months and hidden future totals.
- [x] 5.2 Update `tests/browser/monthly.spec.ts`, `tests/browser/yearly.spec.ts`, `tests/browser/responsive.spec.ts`, and any affected Transactions period-filter browser test for the new pill and column counts; verify with `pnpm run build` followed by `pnpm run test:browser` using headless Chromium and the local PostgreSQL prerequisites in `tests/README.md`.
- [x] 5.3 Run `pnpm run test:unit`, `pnpm run test:components`, and `openspec validate --strict hide-future-months-from-reports` as the combined integration check.

## Workflow follow-up

- Archive the change after review and a successful implementation run.
