# Tasks

## 1. Search matching utility

- [x] 1.1 Add `app/utils/transaction-search.ts` with helpers that normalise text (lower-case, strip combining marks), split a query into whitespace-separated terms, and match those terms against the joined purpose, counterparty name, and counterparty account of a transaction; verify `tests/unit/transaction-search.test.ts` covers case, diacritics, multi-term, blank, and non-matching input and `npm run test:unit` passes.

## 2. Page filtering and precedence

- [x] 2.1 Add a `searchText` ref and a trimmed `searchQuery` computed to `app/pages/index.vue`, and branch `visibleTransactions` so a non-empty search bypasses the category and period filters while an empty one keeps today's behaviour; verify a component test shows a matching row that the selected filters would otherwise exclude.
- [x] 2.2 Confirm the visible sum and count follow the search branch through `visibleTransactions`; verify a component test where the search matches a subset and the displayed total and count cover exactly that subset.
- [x] 2.3 Add component tests for the matched fields and term rules: purpose, counterparty name, counterparty account, case and diacritic insensitivity, all terms required, and no additional request when the query changes; verify `npm run test:components` passes.

## 3. Search field and paused filters

- [x] 3.1 Add the labelled "Search all transactions" field as the first control in the filter region, with `type="search"` and a clear control shown while text is present; verify component tests locate it, enter text, and clear it to restore the previous rows.
- [x] 3.2 Disable the category and period selects while the search is non-empty, keep their bound values, and show a visible paused note associated with the controls; verify component tests assert the disabled state, the preserved values, the note text, and restoration after clearing.
- [x] 3.3 Add a distinct empty-state branch for a search with no matches, keeping the existing empty-response and filter-empty states; verify component tests cover all three messages.
- [x] 3.4 Update the Transactions bullet in `README.md` to mention searching all transactions; verify the wording matches the implemented scope.

## 4. Route query persistence

- [x] 4.1 Initialise the field from `q`, write the trimmed value with a debounced `router.replace` that preserves category, period, and sort, and remove `q` when the search is cleared; verify component tests cover link initialisation, the debounced write, clearing, and preservation of the other query values.
- [x] 4.2 Guard the route-to-field echo so the trimmed value never overwrites raw input (including a trailing space mid-query) and cancel a pending write when the route changes externally; verify component tests cover a two-term query typed with a space and a back/forward-style route change.

## 5. Selection, sort, and refresh interactions

- [x] 5.1 Clear the row selection whenever the search text changes, extending the existing filter watcher; verify the bulk bar disappears and no stale row stays selected.
- [x] 5.2 Confirm select-all selects exactly the search matches and bulk assignment applies only to them; verify component tests for both.
- [x] 5.3 Confirm an active sort survives searching and clearing, and that searching does not change the row order rule; verify component tests.
- [x] 5.4 Confirm the coalesced background refresh after a category assignment leaves the active search and its visible rows applied; verify a component test that completes an assignment and checks the filtered result.

## 6. Browser verification

- [x] 6.1 Add `tests/browser/transactions-search.spec.ts` with an intercepted API that types a query, asserts the filtered rows and paused filters, checks `q` in the URL, reloads to confirm restoration, clears the field to restore the filtered view, and shows the no-match message; verify `npm run test:browser` passes in headless Chromium.

## 7. Full verification

- [x] 7.1 Run `npm test` and confirm unit, component, and integration suites pass.
- [x] 7.2 Run `openspec validate add-transaction-search` and confirm the change validates.

## Workflow follow-up

- Archive the change after review and the full test run are complete.
