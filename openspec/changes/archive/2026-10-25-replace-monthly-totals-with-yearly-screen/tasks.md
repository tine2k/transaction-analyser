# Tasks

## 1. Yearly derivation helpers

- [x] 1.1 Add year options and year resolution helpers to `app/utils/category-spending.ts`: represented years plus the current year plus a well-formed queried year, ordered oldest to newest, with the current-if-represented → newest-represented → current default; verify with unit tests for each branch.
- [x] 1.2 Add an elapsed-calendar-month helper for a selected year (current year uses the current month number, past years use 12, future years use 0) and use `averageDecimalString` for the euro-cent average; verify with unit tests for current, past, future, zero, and half-cent rounding.
- [x] 1.3 Add a yearly matrix builder that returns category rows, twelve month cells, and a year total from the filtered transactions, using exact decimal strings and including `uncategorised`; verify with unit tests for absolute sums, zero cells, and hidden-category exclusion.
- [x] 1.4 Add row ordering to the matrix builder: year total descending, then name ignoring case, then category identity, with `Uncategorised` participating; verify with unit tests for descending order, equal totals, and a high `Uncategorised` total.
- [x] 1.5 Add a row-relative intensity helper for the heatmap (cell ÷ row maximum, zero row untinted, clamped to the 6%–56% brand range); verify with unit tests for the row maximum, a zero row, and a value above the maximum.
- [x] 1.6 Run `pnpm run test:unit` and confirm the existing category-spending tests still pass.

## 2. Yearly page

- [x] 2.1 Add `app/pages/yearly.vue` with one `GET /api/transactions` read, year pills, URL-backed `year`, the two summary cards, person/expense-type/hide controls, the category-by-month matrix, and loading/failure/empty states; verify by mounting the page and observing one fetch and the default year.
- [x] 2.2 Render the twelve month columns and `Total` column with exact EUR values, blank zero cells, `–` for not-yet-elapsed months, and the `Total moved {year}` / `Avg per month` cards; verify with component tests for values, zero handling, and the average divisor.
- [x] 2.3 Render the row-relative heatmap using `color-mix` with the brand token while keeping every amount in ink, leaving the `Total` column untinted, and using neutral backgrounds for future and zero cells; verify with component tests for tint presence, untinted totals, and ink amount text.
- [x] 2.4 Link populated month cells with `month=YYYY-MM&category=…&person=…` and populated total cells with `year=YYYY&category=…&person=…`, leaving blank and `–` cells inert; verify with component tests for named, `uncategorised`, person-carrying, and blank cells.
- [x] 2.5 Apply the person, expense-type, and hide-uncategorised selections to rows, cells, totals, cards, and the average without a second request; verify with component tests for each control and for a filtered empty year.
- [x] 2.6 Replace `tests/components/monthly-totals.test.ts` with `tests/components/yearly.test.ts` covering the default year, a URL year, pill selection, filters, hide scope, cards, matrix, links, tint, and loading/failure/empty states; verify with `pnpm run test:components`.
- [x] 2.7 Add browser coverage for `/yearly` at desktop and phone widths: year pills, cards, matrix, cell links, filters, and states; verify with `pnpm run test:browser`.

## 3. Route, layout, and documentation

- [x] 3.1 Replace `app/pages/monthly-totals.vue` with a `definePageMeta` redirect that returns `/yearly` and copies the current query; verify with a browser test that `/monthly-totals?person=<id>` reaches `/yearly` with the same `person`.
- [x] 3.2 Replace `Monthly totals` with `Yearly` in `app/layouts/default.vue`, keeping the same slot and seven links, and confirm the title becomes `Yearly · Expenses`; verify with the layout and document-title tests.
- [x] 3.3 Update the README screen list from Monthly totals to Yearly, describing the year pills, summary cards, category-by-month matrix, total column, filters, and cell links; verify the description matches the delivered page.
- [x] 3.4 Update `tests/components/layout.test.ts`, `tests/browser/document-title.spec.ts`, `tests/browser/expense-type-filter.spec.ts`, and `tests/browser/responsive.spec.ts` for the Yearly route, label, title, filter flow, and narrow-width scroll region; verify those tests pass.

## 4. Integration checks

- [x] 4.1 Run `openspec validate "replace-monthly-totals-with-yearly-screen" --strict` and confirm the change is valid.
- [x] 4.2 Run `pnpm run test:unit`, `pnpm run test:components`, `pnpm run test:integration`, and `pnpm run test:browser`; confirm every suite passes.
- [x] 4.3 Run `pnpm run build` and confirm the production build succeeds with no new dependency.
- [x] 4.4 Confirm the final page keeps one transaction read, makes no stored-data change, and leaves `/monthly-average`, `/monthly`, the transactions screen, and the API untouched.
