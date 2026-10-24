# Tasks

## 1. Scroll-triggered presentation

- [x] 1.1 Replace the animation-frame batch chain with a proximity trigger: keep the first 50-row batch, place an observation element after the table's horizontal scroll region, and append the next 250 rows through `IntersectionObserver` with a one-viewport bottom margin and a post-append recheck. Verify with the component tests in group 2 and the browser test in group 3.
- [x] 1.2 Keep the generation guard and reset the presented count to the first batch on every view change: initial load, category filter, period filter, applied search, and sort. Verify a component test that changes the view after a batch and asserts the table restarts at 50 rows.
- [x] 1.3 Keep assignment refreshes non-resetting: preserve the presented rows, reconcile identities as today, and re-arm the proximity check instead of appending automatically. Verify a component test that refreshes a larger response while the reader is away from the end and asserts the row count stays at the presented prefix.
- [x] 1.4 Fall back to presenting the remaining rows when `IntersectionObserver` is unavailable, and remove the hidden-document timer fill. Update the page's header comment to describe the scroll trigger. Verify no `scheduleBatch`, `runBatch`, or hidden-visibility timer path remains, and the page still renders for a small view.

## 2. Component tests

- [x] 2.1 Add a controllable `IntersectionObserver` stub to `tests/components/transactions.test.ts` and helpers that fire an intersection and wait for a row count. Verify the stub is installed in `beforeEach` and removed in `afterEach`.
- [x] 2.2 Rewrite the progressive-presentation tests: first batch only without a trigger, next batch after a trigger, every row after repeated triggers, summary and count covering the whole view from the first batch, and no rows beyond the view's end. Verify with `npm run test:components`.
- [x] 2.3 Cover a view change while a batch is pending: the previous view's rows are discarded, the table restarts at its first batch, and repeated triggers reach exactly the new view. Verify with `npm run test:components`.
- [x] 2.4 Confirm select-all, bulk count, filter option counts, and the existing assignment tests still pass against the presented prefix. Verify with `npm run test:components`.

## 3. Browser tests

- [x] 3.1 Rewrite `tests/browser/transaction-table-responsiveness.spec.ts`: a 1,000-row view shows a partial table after load, the row count stays stable without scrolling, and repeated scrolling to the bottom appends batches until exactly 1,000 rows are present. Verify with `npm run test:browser`.
- [x] 3.2 Replace the hidden-document completion test with a no-fill-without-scroll check, and keep the select-all-covers-the-whole-view test working while only the first batch is presented. Verify with `npm run test:browser`.
- [x] 3.3 Record the row counts observed during a full scroll so the 250-row batch can be tuned without changing the approach. Verify the observations are noted in the change or its test comments.

## 4. Verification

- [x] 4.1 Run `npm test` and confirm unit, component, and integration suites pass. Verify with the command's exit status.
- [x] 4.2 Run `openspec validate lazy-load-transaction-rows` and confirm the change and its delta spec validate. Verify with the command's output.
