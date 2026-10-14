# Proposal

## Why

Spending reads differently depending on whether it recurs. A monthly grocery bill and a one-time car
purchase both flow into the same category charts, so the steady baseline and the irregular spikes
are indistinguishable when looking at an analysis view. Letting each category declare whether it is
recurring or one-time, and filtering the analysis views by that declaration, separates the two.

## What Changes

- A category carries an optional expense type: `recurring`, `one-time`, or unset. Existing
  categories read as unset and classification is gradual; nothing is classified automatically. The
  type never takes part in matching or assignment, so marking a category changes no transaction.
- The category management screen gains an expense-type control on its form and shows the type in
  its table, beside the existing hidden state.
- The three analysis views — `/analytics`, `/monthly-totals`, `/monthly-average` — gain a
  page-wide radio filter: All (the default, today's behavior), Recurring, One-time. Unset
  categories and uncategorised transactions appear only under All; hidden categories stay excluded
  under every choice.
- The read API embeds the type in each transaction's category object, and the category management
  API accepts, validates, and returns it.
- The database change is additive: one new nullable column on `categories`, no row rewritten and no
  transaction re-evaluated. No new endpoint and no new dependency.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-postgres-schema`: the `categories` table gains the nullable expense-type column and
  the additive-extension guarantee that existing categories read as unset.
- `transaction-domain-model`: a `Category` additionally carries an expense type — recurring,
  one-time, or unset — which does not take part in membership.
- `category-management-api`: create and edit accept and validate `expenseType`, the returned
  category carries it, and the category JSON shape gains the field.
- `transaction-read-api`: the embedded category object gains `expenseType`, read from `categories`.
- `category-management-screen`: the expense-type control on the form and the type shown in the
  category table.
- `category-spending-chart`: the page-wide expense-type filter on `/analytics`, applied to both
  the months and the years view.
- `monthly-category-totals-table`: the same expense-type filter for the table.
- `monthly-category-average`: the same expense-type filter, independent of the month-count window.

## Impact

- `db/migrations/0008_category_expense_type.sql` (new, additive).
- `server/utils/categories.ts`: read, write, and validate the field; `server/api/transactions.get.ts`
  embeds it.
- `app/pages/categories.vue`: the form fieldset and the table column.
- `app/utils/category-spending.ts`: the type on the embedded category and one shared selection
  helper all three views use.
- `app/pages/analytics.vue`, `monthly-totals.vue`, `monthly-average.vue`: the filter fieldset.
- Tests: unit tests for the selection rule, integration tests for the migration and both APIs,
  component tests for the management screen and the three views, and browser checks for the
  controls.
- No new endpoint, no dependency, and no change to matching, imports, notifications, or the
  transactions table.
