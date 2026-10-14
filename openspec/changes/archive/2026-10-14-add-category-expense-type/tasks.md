# Tasks

## 1. Database column

- [x] 1.1 Add `db/migrations/0008_category_expense_type.sql`: an additive nullable `text` column
      `expense_type` with a check limiting it to `recurring` or `one-time`, and a rollback note in
      the header. Verify by applying the migrations to the disposable database through the
      integration wrapper and asserting, with a direct statement, that existing fixture categories
      read `NULL` and that an unknown label is rejected; run `npm run test:integration`.
- [x] 1.2 Update the README's migration line to name `0008_category_expense_type.sql` as the
      latest; verify the named file is the newest in `db/migrations/`.

## 2. Category management API

- [x] 2.1 Extend `server/utils/categories.ts`: carry `expense_type` through the category read,
      insert, and update statements; read `expenseType` from the body (absent means `null`;
      `recurring`, `one-time`, and `null` are accepted; any other present value is a client error);
      return it as `expenseType`; leave it unchanged on an append.
- [x] 2.2 Extend `tests/integration/category-patterns-api.test.ts` with the round-trip: create with
      `recurring`, edit to `one-time`, clear with `null`, an absent value reads `null`, an unknown
      label is a client error with no change, and an append preserves the type. Verify with
      `npm run test:integration`.

## 3. Transactions read API

- [x] 3.1 Extend `server/api/transactions.get.ts` to read the category's `expense_type` and embed
      it as `expenseType` in the returned category object, `null` when unset.
- [x] 3.2 Extend `tests/integration/api.test.ts` to assert the embedded `expenseType` including
      `null`, and that it follows a category edit; verify with `npm run test:integration`.

## 4. Shared selection helper

- [x] 4.1 Add `expenseType` to `CategorySpendingTransaction['category']` and export
      `filterTransactionsByExpenseType(transactions, choice)` from `app/utils/category-spending.ts`;
      `all` returns the input unchanged, and a typed choice keeps only transactions whose category
      type equals it, so unset categories and uncategorised transactions drop.
- [x] 4.2 Extend `tests/unit/category-spending.test.ts` with the selection matrix: `all` unchanged,
      `recurring` and `one-time` keep only their rows, unset and uncategorised rows drop under a
      typed choice, and the input array is not mutated. Verify with
      `npx vitest run tests/unit/category-spending.test.ts`.

## 5. Category management screen

- [x] 5.1 Add the expense-type radio fieldset (Unset, Recurring, One-time; Unset default) to the
      create and edit form in `app/pages/categories.vue`, populate it from the stored category when
      editing, always send `expenseType` (string or `null`), and add a Type column to the table
      reading `Recurring`, `One-time`, or `Unset` from the returned value.
- [x] 5.2 Extend `tests/components/categories.test.ts`: a create sends the chosen type and `null`
      when unset, an edit populates and sends the changed type, and the table shows each state.
      Verify with `npm run test:components`.

## 6. Analysis page filters

- [x] 6.1 On `/analytics` (`app/pages/analytics.vue`) add the page-wide expense-type fieldset
      (All default), derive the selected transactions with the shared helper, and pass them to the
      monthly and yearly grouping so both views reflect the choice without another request.
      Extend `tests/components/analytics.test.ts`: default All unchanged, a typed choice drops
      unset and uncategorised rows in both views, no additional fetch, and the existing empty state
      when nothing matches. Verify with `npm run test:components`.
- [x] 6.2 On `/monthly-totals` (`app/pages/monthly-totals.vue`) add the same fieldset and apply the
      helper before building the matrix. Extend `tests/components/monthly-totals.test.ts` with the
      same semantics (typed choice drops columns/cells for unset, uncategorised, and the other
      type) and the empty state. Verify with `npm run test:components`.
- [x] 6.3 On `/monthly-average` (`app/pages/monthly-average.vue`) add the same fieldset and apply
      the helper before averaging, independent of the month-count window. Extend
      `tests/components/monthly-average.test.ts`: typed choices list only the selected type, unset
      and uncategorised appear only under All, changing the type keeps the window, and no
      additional fetch. Verify with `npm run test:components`.
- [x] 6.4 Update the README's feature list: categories carry an optional recurring or one-time
      mark and the analysis screens filter by it; verify the named screens and control match the
      implementation.

## 7. Browser verification

- [x] 7.1 Add browser checks with the API intercepted: the category form's type control is sent
      and shown in the table (`tests/browser/categories.spec.ts`), and the filter on each analysis
      page defaults to All and filters the rendered output when a typed choice is selected. Verify
      with `npm run test:browser`.

## 8. Integration verification

- [x] 8.1 Run `npm test` and confirm the full suite passes, including the existing hidden,
      windows, and analytics tests, with no change to their outcomes.
