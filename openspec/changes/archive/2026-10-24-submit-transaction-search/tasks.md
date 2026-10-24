# Tasks

## 1. Search matching index

- [x] 1.1 Add `createTransactionSearchIndex` and `matchesTransactionSearchTerms` to `app/utils/transaction-search.ts`, leaving `normalizeSearchText`, `searchTerms`, and `transactionSearchText` reusable; verify `tests/unit/transaction-search.test.ts` covers the index contents, term matching, blank terms, and diacritic handling, and `npm run test:unit` passes.

## 2. Applied-search state and submit path

- [x] 2.1 Split the draft from the applied search in `app/pages/index.vue`: bind `searchText` to the input, derive `appliedSearch` from the route's `q`, and make `visibleTransactions`, the paused state, the summary, the count, and the empty state depend on `appliedSearch` rather than the draft; verify a component test shows that typing alone changes no rows or summary while applying the text changes them.
- [x] 2.2 Replace the debounced route write and its echo guard with `applySearch` and `clearSearch` handlers that trim the draft, write `q` immediately through `router.replace`, remove it for an empty value, and preserve category, period, and sort; verify component tests cover initialisation from `q`, clicking Search, pressing Enter, clearing, and typing leaving the route unchanged.
- [x] 2.3 Update the existing search component tests in `tests/components/transactions.test.ts` from as-you-type expectations to submit semantics, including a trailing-space draft that is trimmed only on apply; verify `npm run test:components` passes.

## 3. Search controls and paused filters

- [x] 3.1 Wrap the input and controls in a form with a labelled `Search` submit button, keep Clear as a non-submitting control, and show Clear whenever the draft is non-empty or a search is applied; verify component tests locate both controls, apply by click and Enter, and restore the prior view through either clear path.
- [x] 3.2 Pause and disable the category and period controls only while `appliedSearch` is non-empty, with the paused note and `aria-describedby`; verify component tests show the filters staying interactive while a draft is typed over no applied search and paused after applying.
- [x] 3.3 Key selection clearing to `appliedSearch`; verify component tests show that typing leaves a selection and its bulk bar intact while applying or clearing removes both.

## 4. Browser behaviour and documentation

- [x] 4.1 Update `tests/browser/transactions-search.spec.ts` to assert that typing does not change the rows, filters, or URL, that the Search button and Enter apply the search, that reload restores the applied `q`, and that Clear restores the filtered view; verify `npm run test:browser` passes in headless Chromium.
- [x] 4.2 Update the search comment at the top of `app/pages/index.vue` and the Transactions bullet in `README.md` to describe applying a search with the button or Enter; verify the wording matches the implemented behaviour.

## 5. Full verification

- [x] 5.1 Run `npm test` and confirm the unit, component, and integration suites pass.
- [x] 5.2 Run `openspec validate submit-transaction-search` and confirm the change validates.

## Workflow follow-up

- Archive the change after review and the full test run are complete.
