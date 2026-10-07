# Tasks

## 1. Counterparty-aware matching rule

- [x] 1.1 Extend `matchingCategorySql()` in `shared/category-assignment.ts` so the expression tier tests `t.counterparty_name ~* expression` as well as `t.purpose ~* expression`, leaving the date-window tier and the ordering untouched, so the global recompute, the delete reassignment, and the import assignment all follow one rule; verified by the integration cases in 1.3
- [x] 1.2 Add the counterparty test to `COUNT_MATCHING_TRANSACTIONS` and to the window-claim exclusion in `COUNT_CLAIMED_TRANSACTIONS` in `server/utils/categories.ts`, so the expression preview, the literal preview, and the window-claim preview mirror the assignment rule; verified by the preview cases in 1.3
- [x] 1.3 Add integration cases where a transaction's purpose line does not match but its counterparty name does: a category create and edit assign it, an import assigns the row it writes, the expression and literal previews count it, and the window-claim preview excludes it; add these to `tests/integration/category-patterns-api.test.ts` and `tests/integration/transactions-import.test.ts` and verify with `npm run test:integration`

## 2. Re-categorisation operation and endpoint

- [x] 2.1 Implement `recategoriseTransactions()` in `server/utils/categories.ts`: one transaction that takes the category-mutation advisory lock and runs a single `UPDATE transactions AS t SET category_id = <matchingCategorySql()> WHERE t.category_id IS DISTINCT FROM (<matchingCategorySql()>) RETURNING 1`, returning the changed count from the driver's row count; verified by the endpoint cases in 2.3
- [x] 2.2 Add `server/api/categories/recategorise.post.ts`, following the existing route style: call `recategoriseTransactions()`, answer `{ changed: <integer> }`, and map failures through `throwCategoryHttpError`; verified by an integration test that calls the endpoint through the built server
- [x] 2.3 Add `tests/integration/category-recategorisation-api.test.ts` covering: an uncategorised transaction the categories match becomes categorised, a categorised transaction whose match has gone becomes uncategorised, a transaction moves between categories, an already-correct assignment is not counted, a repeat reports zero, no `import_runs` row is written, every other transaction value is unchanged, a failed database is an error rather than a count, and a concurrent category change is serialized; verify with `npm run test:integration`

## 3. Imports screen control

- [x] 3.1 Add the `recategorising` ref, the `recategoriseMessage` ref, and the `recategorise()` function to `app/pages/imports.vue` and render the control beside "Sync now", disabled while the request is in flight, with the transient count in a `role="status"` element and no import-log refresh; verified by the component cases in 3.2
- [x] 3.2 Extend `tests/components/imports.test.ts` for the control: it posts to `/api/categories/recategorise`, is disabled while the request is pending, shows the returned changed count, shows a distinct failure message rather than zero when the request fails, and requests no import-log refresh; verify with `npm run test:components`
- [x] 3.3 Update the README so the Categories bullet states that patterns match the purpose line and the counterparty name, and the imports text mentions the re-categorise control and its transient count; verified by reading the changed sections against the shipped behavior

## 4. Browser check

- [x] 4.1 Extend `tests/browser/imports-sync.spec.ts` with an intercepted `POST /api/categories/recategorise`: the control disables while the request is pending and then shows the changed count, and a failed request shows a failure rather than a zero count; verify with `npm run test:browser` in headless Chromium

## 5. Integration verification

- [x] 5.1 Run `npm test` and `npm run test:browser` against the built application and confirm every suite passes, including the modified previews and the new endpoint; fix any regressions

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- The `/opsx-archive` command commits and pushes the archived change.
