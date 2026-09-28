# Tasks

## 1. Database

- [x] 1.1 Add `db/migrations/0004_category_hidden.sql` adding `hidden boolean NOT NULL DEFAULT false` to `categories`, with a commented rollback of `ALTER TABLE categories DROP COLUMN hidden;`. Verify by applying the migrations against a disposable PostgreSQL (`bash tests/run-with-test-database.sh psql ... -c "SELECT hidden FROM categories"`) and confirming the column exists and pre-existing rows read `false`.
- [x] 1.2 Extend `tests/fixtures/integration.sql` with at least one hidden category and transactions referencing it, and confirm the fixture still loads after the new migration by running `npm run test:integration`.

## 2. Category Management API

- [x] 2.1 Extend `server/utils/categories.ts`: add `hidden: boolean` to the `Category` type, select it in `SELECT_CATEGORIES`, and return it from `INSERT_CATEGORY` and `UPDATE_CATEGORY`. Verify with an integration test that `GET /api/categories` returns `hidden` on every category and preserves it across an edit.
- [x] 2.2 Accept `hidden` in `readCategoryInput`: when present it must be a boolean (otherwise a `400` with no stored change), and when absent it defaults to `false`. Verify with integration tests that a create/edit with `hidden: true` stores and returns `true`, a body omitting `hidden` stores `false`, and a non-boolean is refused with no change.
- [x] 2.3 Extend `tests/integration/api.test.ts` with coverage for the hidden round-trip through `POST`/`PUT`/`GET`, the absent-defaults-to-visible rule, and the non-boolean rejection. Verify with `npm run test:integration`.

## 3. Transaction Read API

- [x] 3.1 Select `c.hidden` in `SELECT_TRANSACTIONS` in `server/api/transactions.get.ts` and include `hidden` in the nested `category` object (the uncategorised case stays `null`). Verify with an integration test asserting a categorised transaction returns `category.hidden` matching the stored flag and an uncategorised one still returns `category: null`.

## 4. Category Management Screen

- [x] 4.1 Add `hidden: boolean` to the `Category` type in `app/pages/categories.vue`, add a hidden-flag control to the create/edit form, send `hidden` in the `POST`/`PUT` body, populate it in `startEdit`/`cancelEdit`, and show each row's hidden state in the list. Verify with the component tests below and by loading `/categories` against a seeded database.
- [x] 4.2 Extend `tests/components/categories.test.ts` to assert the form sends the entered hidden value, the list distinguishes hidden from visible categories, and an edit pre-populates the current hidden state. Verify with `npm run test:components`.

## 5. Analysis Views

- [x] 5.1 Update `app/utils/category-spending.ts`: add `hidden` to the category type used by transactions, and exclude transactions whose category is hidden before grouping and averaging in the helpers the analysis pages use (`groupTransactionsByMonth`, `groupTransactionsByAvailableMonth`, `getCategoryMonthlyAverages`). Verify with new unit tests in `tests/unit/category-spending.test.ts` that a hidden-category transaction is absent from every month group and from the averages while a visible category is unchanged.
- [x] 5.2 Update the type usage in `app/pages/analytics.vue`, `app/pages/monthly-totals.vue`, and `app/pages/monthly-average.vue` so hidden categories are excluded through the shared helpers. Verify with the component tests in task 5.3.
- [x] 5.3 Extend `tests/components/analytics.test.ts`, `tests/components/monthly-totals.test.ts`, and `tests/components/monthly-average.test.ts` to assert a hidden category's transactions contribute no slice, column, row, or average entry, while other categories' values are unchanged. Verify with `npm run test:components`.
- [x] 5.4 Confirm the transactions view is unchanged: hidden transactions still appear in `app/pages/index.vue` and in its category filter. Verify by extending `tests/components/transactions.test.ts` to show a returned transaction whose category is hidden and asserting its row remains visible.

## 6. Integration Verification

- [x] 6.1 Run the full suite (`npm test`) and confirm the migration, API, screen, and analysis changes pass together against the disposable database.
- [x] 6.2 With a seeded database, verify end-to-end that a category toggled hidden disappears from `/analytics`, `/monthly-totals`, and `/monthly-average`, remains listed and toggleable on `/categories`, and still shows its transactions on `/` (use headless Chromium, per AGENTS.md).
