# Tasks

## 1. Default filter derivation

- [x] 1.1 Replace the fixed `selectedCategory`/`selectedPeriod` initial values and the query-fallback functions in `app/pages/index.vue` with a derivation that computes the default period from the returned transactions and the browser's current date: current calendar year when represented, otherwise newest represented year, otherwise all periods. Verify with a component mount against fixtures spanning the current year, only older years, and no rows.
- [x] 1.2 Derive the default category from the effective period: an offered query month or year when present, otherwise the default period; select uncategorised only when that period holds at least one uncategorised returned transaction, otherwise all categories. Verify the derivation returns uncategorised when such a transaction exists and all categories when every transaction in the period is categorised.
- [x] 1.3 Keep supplied query values authoritative and refresh the derived defaults when `GET /api/transactions` resolves, without altering the existing `watch` behavior for category, month, year, sort, and direction. Verify a route with `category` and `month`/`year` still initializes those controls and rows.
- [x] 1.4 Confirm no additional request, stored-data write, or filter-count change results from the new defaults. Verify `useFetch` is still called once for transactions, filter option counts continue to reflect the complete response, and no assignment request is made on load.

## 2. Component tests

- [x] 2.1 Update the existing default-selection and unknown-query tests in `tests/components/transactions.test.ts` to expect the current year for the period filter and the period-aware category default, using a controlled current date rather than a year that expires. Run `npm run test:components` and verify the transaction filter suite passes.
- [x] 2.2 Add cases for: current year represented; current year absent with older data selecting the newest represented year; no transactions selecting all periods and all categories; current-year transactions all categorised selecting all categories; current-year uncategorised transactions selecting uncategorised; and an offered query period controlling the category default. Run `npm run test:components` and verify every new case passes.

## 3. Browser verification

- [x] 3.1 Add or extend a headless Chromium Playwright check under `tests/browser/` that loads the transactions page with intercepted data and asserts the period filter shows the current year and the category filter follows uncategorised presence. Run `npm run test:browser` and verify the check passes.
- [x] 3.2 Run `npm run test:browser` to verify the existing sorting, assignment, shortcut, and responsive browser checks still pass with the new initial filters.

## Workflow follow-up

- Archive the change after review and verification pass.
