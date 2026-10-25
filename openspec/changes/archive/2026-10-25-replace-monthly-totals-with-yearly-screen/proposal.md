# Proposal

## Why

The design folder contains a `Yearly – Desktop` artboard that presents a selected year as a category-by-month matrix with a total column, year pills, and two headline figures. The current `/monthly-totals` screen shows the same data transposed, without year selection, totals, or summary figures. The archived Monthly change explicitly deferred this screen; this change delivers it and retires the older table.

The artboard's Income and Net cards and its Income vs spending chart are deliberately not implemented. The application's analysis figures are exact sums of absolute amounts, so an Income card would double-count incoming money already inside the total and a Net figure would be meaningless.

## What Changes

- **BREAKING**: `/monthly-totals` becomes `/yearly`; the old path redirects to `/yearly` and preserves its query. The menu label becomes `Yearly` and the document title becomes `Yearly · Expenses`. The application still serves seven browser routes.
- Present year pills for every represented year, the current year, and any queried year, with the selection carried as `year=YYYY`. Default to the current year when it is represented, otherwise the newest represented year, otherwise the current year.
- Present two surface summary cards: `Total moved {year}`, the exact absolute sum of included transactions in the selected year, and `Avg per month`, that total divided by elapsed calendar months in the selected year.
- Replace the month-by-category table with a category-by-month table: one row per category represented in the selected year, twelve month columns, and a `Total` column. Rows are ordered by year total descending.
- Tint each populated month cell by its magnitude relative to the row's largest month, while keeping the exact amount in ink. This is the one matrix where amount magnitude may be encoded as colour.
- Keep the page-wide person, expense-type, and hide-uncategorised controls with the same semantics as the Monthly screen. Keep the single `GET /api/transactions` read and make no stored-data changes.
- Link populated month cells to the transactions screen with `month=YYYY-MM`, the category, and the selected person; link total cells with `year=YYYY`, the category, and the selected person.
- Remove the Income and Net cards and the Income vs spending chart; do not add sign-based income, spending, or netting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monthly-category-totals-table`: repurposed from a month-by-category matrix at `/monthly-totals` into the Yearly category-by-month matrix at `/yearly`, with year selection, summary cards, a total column, row-relative cell tinting, and retained filters.
- `frontend-shell`: the route inventory, document title, menu label, and allowed transaction-derived values change from Monthly totals to Yearly; the amount-colour and palette rules gain a narrow exception for the Yearly matrix's row-relative tint.
- `responsive-frontend`: the monthly totals table reflow clause becomes a Yearly matrix clause covering the summary cards, year pills, and the table's own scroll region.

## Impact

- **Frontend**: `app/pages/yearly.vue` is added; `app/pages/monthly-totals.vue` becomes a redirect to `/yearly`; `app/layouts/default.vue` changes its label, route, and title; `app/utils/category-spending.ts` gains year-matrix, elapsed-month, and row-intensity helpers.
- **Tests**: `tests/components/monthly-totals.test.ts` becomes Yearly component tests; unit tests cover the new helpers; browser tests cover `/yearly`, the redirect, document title, responsive layout, and the expense-type flow.
- **Specs**: `monthly-category-totals-table`, `frontend-shell`, and `responsive-frontend` each receive a delta. `monthly-category-average`, `category-spending-chart`, `transaction-table`, and `euro-value-display` keep their behaviour; Yearly links reuse the transaction screen's existing `month`, `year`, `category`, and `person` query contract.
- **Docs**: the README's screen list replaces Monthly totals with Yearly.
- **No API, database, schema, dependency, or configuration changes.**
