# Tasks

## 1. Shared literal escaping

- [x] 1.1 Add `shared/literal-pattern.ts` exporting `escapeLiteralPattern(text)` that escapes every PostgreSQL ARE metacharacter (`. * + ? ^ $ { } ( ) [ ] | \`), verified by unit tests covering each metacharacter, a backslash, already-escaped input, unicode text, and ordinary text (`npm run test:unit`)

## 2. Append endpoint and mutation serialization

- [x] 2.1 Add the transaction-scoped advisory lock to every category mutation in `server/utils/categories.ts` (create, edit, delete, append), verified by an integration test that issues two concurrent appends to the same category through the built server and finds both patterns stored (`npm run test:integration`)
- [x] 2.2 Implement `appendPattern(id, input)` in `server/utils/categories.ts`: validate the text (string, trimmed, at least three code points), run the conditional atomic `patterns || $2` update with the `NOT patterns @> ARRAY[$2]` guard, return `{ category, added }`, answer 404 for an unknown identity, and run the existing recompute only when a pattern was added; verified by integration tests covering literal storage, escaping of metacharacters, preserved name/hidden/windows/other patterns, re-evaluation, the idempotent `added: false` case, and each refusal
- [x] 2.3 Add the route `server/api/categories/[id]/patterns.post.ts`, mapping refusals through `throwCategoryHttpError`, verified by an integration test that calls the endpoint through the built server

## 3. Literal match-count preview

- [x] 3.1 Implement `countLiteralMatches(input)` in `server/utils/categories.ts`, escaping the text with `escapeLiteralPattern` and reusing `COUNT_MATCHING_TRANSACTIONS` with a one-element candidate array, with the same validation as the append; verified by integration tests covering the count, case-insensitive matching, literal metacharacters, one count per transaction, each refusal, and that no stored data changes
- [x] 3.2 Add the route `server/api/categories/literal-match-count.post.ts`, verified by an integration test that calls the endpoint through the built server

## 4. Action bar and transactions page

- [x] 4.1 Add `app/components/PatternShortcutBar.vue`: fixed bottom container with the captured text, a native category select, the preview state, a polite status line, a dismiss control, and 44px touch targets; verified by component tests covering rendering, the select options (including hidden categories marked), the status states, and keyboard operability
- [x] 4.2 Add selection capture to `app/pages/index.vue`: a `selectionchange` listener accepting only a non-collapsed selection inside one `td` of the transactions table, trimmed to at least three code points, recording the row's transaction id, hiding on a cleared selection unless focus is inside the bar, and dismissing on Escape; verified by component tests stubbing `window.getSelection` for valid, short, multi-cell, and cleared selections
- [x] 4.3 Wire the literal preview request and the append invocation in `app/pages/index.vue`, including the preview states (loading, count, unavailable), the append response handling (`added` true and false), the failure state that keeps the bar with the captured text, and the category list read from `GET /api/categories`; verified by component tests with mocked `$fetch` responses, including a failed preview and a failed append
- [x] 4.4 Add in-flight tracking, the per-row marker (`aria-busy` plus a subtle visual marker and sr-only text), and the coalesced refresh in `app/pages/index.vue`: one `$fetch('/api/transactions')` after the last append settles, assigned to the existing `useFetch` data ref with its `pending` flag untouched, a generation guard for superseded responses, marker clearing on a successful refresh, and a distinct refresh-failure report; verified by component tests with fake timers covering overlapping appends, a single coalesced request, an out-of-order response, and a failed refresh
- [x] 4.5 Update the existing `tests/components/transactions.test.ts` for the page's second `useFetch` call and new behavior, verified by `npm run test:components`
- [x] 4.6 Update the README "What it does" Transactions bullet to mention assigning a pattern from selected transaction text, verified by reading the section against the shipped behavior

## 5. Browser checks

- [x] 5.1 Add a headless-Chromium Playwright spec covering: a real selection in a purpose cell shows the bar with the text and count; choosing a category sends the append and marks the row; the coalesced refresh updates the row; a short selection and a multi-cell selection show no bar; a failed append keeps the bar with the error; verified by `npm run test:browser`

## 6. Integration verification

- [x] 6.1 Run `npm test` and `npm run test:browser` against the built application and confirm every new and existing suite passes, including the modified `frontend-shell` and `category-management-api` behavior; fix any regressions

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- The `/opsx-archive` command commits and pushes the archived change.
