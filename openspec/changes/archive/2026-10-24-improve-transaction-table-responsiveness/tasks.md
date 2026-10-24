# Tasks

## 1. Row-level updates

- [x] 1.1 Reconcile the post-assignment refresh by identity: keep the previous transaction object when every displayed field is equal and replace it only when one differs. Verify by a component test that refreshes after an assignment and asserts the untouched row's `<tr>` element node is unchanged while the written row is updated.
- [x] 1.2 Compute each picker category's displayed label once, including the hidden suffix, when the category list changes, and render that label in the row select. Verify the existing category-option component tests pass and a hidden category still shows its `(hidden)` suffix.
- [x] 1.3 Add `v-memo` to the transaction row with every value the row renders in its dependency list. Verify by component tests that an assignment re-presents only the affected row, and that a selection toggle, updating marker, or in-flight state still changes its own row.
- [x] 1.4 Extend the page's explanatory comment to cover the identity-preserving refresh and row memoisation. Verify the comment names the behaviour and the `manual-category-assignment` requirement it serves.

## 2. Progressive presentation

- [x] 2.1 Render `sortedVisibleTransactions` as a growing prefix controlled by a presented count that begins at one batch. Verify by a component test that a large fixture shows fewer than all rows immediately after the data arrives and all matching rows once the fill completes.
- [x] 2.2 Advance the presented count on `requestAnimationFrame` using the batch sizes in design.md D3, with a `setTimeout` fallback while the document is hidden. Verify by a browser test that observes a partial table before the complete one, and by a test with a hidden document that confirms the fill still completes.
- [x] 2.3 Reset the presented count and increment a generation on a change of category filter, period filter, applied search, or sort, and discard a pending callback whose generation is stale. A refresh after an assignment must not reset the count. Verify by a browser test that changes the filter while the fill is running and asserts the table settles on exactly the new view's rows.
- [x] 2.4 Keep the sum, the transaction count, the select-all state, and the selection derived from `visibleTransactions`, never from the presented prefix, and make the select-all state report all rows selected before the last batch arrives. Verify by a component test that the sum and count already cover every row at the first batch and are unchanged when later batches arrive, and by a browser test that selects all at the first batch and sees the full count in the bulk bar.
- [x] 2.5 Extend the page's explanatory comment block with the batching behaviour, the reset rule, and the whole-view derivations. Verify the comment matches the shipped behaviour.

## 3. Integration checks

- [x] 3.1 Run `npm run test:unit`, `npm run test:components`, `npm run test:browser`, and `npm run test:integration`; all pass.
- [x] 3.2 Check the table at 320 CSS pixels and at desktop width: columns, horizontal scrolling within the table region, and 44 pixel hit areas unchanged. Verify the existing responsive browser tests pass and a screenshot comparison shows no layout change.
- [x] 3.3 Measure a 1,000-row fixture before and after: time to first row, time to the complete table, and the cost of one assignment refresh. Verify the recorded numbers show the assignment refresh no longer scaling with the size of the table.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
