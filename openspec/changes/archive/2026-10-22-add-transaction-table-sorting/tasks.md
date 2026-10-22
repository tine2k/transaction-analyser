# Tasks

## 1. Sort model and row ordering

- [x] 1.1 In `app/pages/index.vue`, define the seven sortable column keys (`bookingDate`, `valueDate`, `amount`, `purpose`, `counterpartyName`, `counterpartyAccount`, `category`) and read the active sort from the route query as `sort` plus `direction`. Treat an unrecognized column as no sort, and a recognized column with a missing or invalid direction as ascending. Verify with a component test that loads `/?sort=amount&direction=desc` and one that loads `/?sort=unknown`.
- [x] 1.2 Add a comparator per sortable column: compare dates as `YYYY-MM-DD`, amounts with the existing `compareDecimalStrings` helper, text with `localeCompare(..., { sensitivity: 'base' })`, and sort rows with no account or no category after rows that have a value in both directions. Break ties with the row's index in the endpoint response so the order is stable. Verify with component tests covering negative amounts, mixed-case text, missing values, and equal values.
- [x] 1.3 Derive the displayed rows by filtering first and sorting second, while leaving the filtered-but-unsorted rows as the source for the visible sum, count, select-all, and bulk selection. Verify that changing the sort changes only row order: the visible ids, total, and count stay the same, and changing a filter keeps the active sort.

## 2. Sortable column headers

- [x] 2.1 Replace the seven value-column header labels with header buttons that keep the existing table styling and provide at least a 44 CSS-pixel activation target. Leave the selection-control header unsortable. Put `aria-sort` on each sortable `<th>` (`ascending`, `descending`, or `none`) and add a visible direction indicator for the active column. Verify with component tests that assert the button structure, `aria-sort` values, and the untouched selection header.
- [x] 2.2 Wire header activation so a different column starts ascending and the active column toggles between ascending and descending. Verify with component tests that click a header twice and that switch columns.
- [x] 2.3 Confirm reordering does not break row-keyed behaviour: row selection, the bulk bar, per-row category assignment, and the pattern shortcut still target the correct transaction after a sort. Verify by running `npm run test:components` and confirming the existing transaction tests pass unchanged.

## 3. Sort reflected in the URL

- [x] 3.1 On header activation, update the index route query with `sort` and `direction` through `router.replace`, preserving the existing `category`, `month`, and `year` values. Verify with a component test that spies on `router.replace` and asserts the exact query.
- [x] 3.2 Include `sort` and `direction` in the route-query watcher so a deep link and a reload initialize the table and header state. Verify with component tests for ascending, descending, and unknown query values, plus a filter change that leaves the sort in the query.
- [x] 3.3 Add `tests/browser/transactions-sorting.spec.ts` that intercepts the transaction and category endpoints, opens the transactions route, activates headers, and asserts the rendered row order, the `aria-sort` state, and the URL. Reload the page and assert the sorted order persists, then change a filter and assert the sort survives. Verify with `npm run test:browser`.

## 4. Final verification

- [x] 4.1 Run `npm run test:components` and confirm every transaction component test passes.
- [x] 4.2 Run `npm run test:browser` and confirm the new sorting spec and the existing browser specs pass.
- [x] 4.3 Confirm the change touches no API, database schema, migration, or dependency file, and that `GET /api/transactions` still returns its existing order.
