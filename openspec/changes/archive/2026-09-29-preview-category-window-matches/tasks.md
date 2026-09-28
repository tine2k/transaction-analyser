# Tasks

## 1. Window-claim preview endpoint

- [x] 1.1 Add `countWindowClaims` to `server/utils/categories.ts`: read the candidate windows with the existing `readWindows` (rejecting an empty list with a client error), then run one read-only count query returning the transactions whose booking date falls inclusively in at least one candidate window and whose purpose line matches no stored category's expression, counting each transaction once; add `server/api/categories/window-match-count.post.ts` mapping failures through `throwCategoryHttpError`. Extend `tests/integration/api.test.ts` to cover a returned combined count, exclusion of a transaction a stored expression matches, inclusive `from`/`to` endpoints, the value date not deciding, a transaction in several windows counted once, overlapping candidate windows counted once, rejection of a missing/non-array/malformed/impossible/reversed/empty window list, unchanged stored data, and a database-free or unreachable failure not returned as a count; verify with `npm run test:integration`.

## 2. Form window-claim preview

- [x] 2.1 Add the window-claim preview to `app/pages/categories.vue`, separate from the expression-match preview: its own count value, state, generation guard, and debounced watcher on the entered complete windows, a request to `POST /api/categories/window-match-count`, empty/loading/unavailable states, and its own labelled element distinct from the expression preview; extend `tests/components/categories.test.ts` to cover showing the count after a window is entered, updating the request as windows change, sending neither partial nor no windows as a count, showing an unavailable state without blocking submit, and rendering the two previews separately; verify with `npm run test:components`.

## 3. Integration verification

- [x] 3.1 Run `npm test` to confirm the new endpoint, the form preview, and the existing unit, component, and integration suites all pass together.
