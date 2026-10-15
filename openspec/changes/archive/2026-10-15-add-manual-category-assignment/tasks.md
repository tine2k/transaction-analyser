# Tasks

## 1. Database migration

- [x] 1.1 Add `db/migrations/0009_transactions_manual_category.sql`: `category_locked boolean NOT NULL DEFAULT false` on `transactions` plus the CHECK constraint `NOT category_locked OR category_id IS NOT NULL`, with a rollback comment in the style of the earlier migrations. Verify the existing `npm run test:integration` suite applies all migrations from a clean disposable database and passes.

## 2. Pin-aware re-evaluation and read provenance (server)

- [x] 2.1 In `server/utils/categories.ts`, exclude locked rows from `RECOMPUTE_ASSIGNMENTS`, `RECOMPUTE_APPENDED_PATTERN`, and `RECATEGORISE_TRANSACTIONS`, and set `category_locked = false` on the rows `REASSIGN_RETIRING_CATEGORY` reassigns. Verify with a new `tests/integration/manual-category-assignment.test.ts` that seeds a locked row via SQL and exercises a category create, a category edit, a pattern append, the recategorise route, and a category delete, asserting the locked row keeps its category (and the delete clears the pin).
- [x] 2.2 Add the `categoryAssignment` field (`manual` when locked, else `automatic`) to the `GET /api/transactions` response in `server/api/transactions.get.ts`. Verify with integration assertions over a locked row, an unlocked categorised row, and an uncategorised row in `tests/integration/api.test.ts`.
- [x] 2.3 Update the README sentence that says stored transactions are re-evaluated whenever the category set changes so it states the manual-assignment exception. Verify the sentence matches the implemented behavior.

## 3. Write endpoint (server)

- [x] 3.1 Add `assignTransactionCategories(transactionIds, categoryId)` to `server/utils/categories.ts`: validate a non-empty list of digit-string identities and a null or stored `categoryId`, deduplicate identities, pin with `SET category_id = $target, category_locked = true`, clear with `SET category_locked = false, category_id = <matchingCategorySql>`, all inside one transaction under `CATEGORY_MUTATION_LOCK_KEY`, reusing `throwCategoryHttpError`. Verify through the endpoint tests of 3.2.
- [x] 3.2 Add the route `server/api/transactions/category-assignments.post.ts` delegating to 3.1 and answering `{ updated }`. Verify in `tests/integration/manual-category-assignment.test.ts`: pinning one and several identities with the reported count, a duplicate identity assigned and counted once, clearing re-evaluates immediately (matched row gains the rule's category, unmatched row reads uncategorised), refusals (empty list, malformed identity, unknown transaction, unknown category) change nothing and answer client errors, no category is created/changed/deleted, and an assignment racing a delete of its target leaves no stale reference.

## 4. Bulk assignment bar (component)

- [x] 4.1 Create `app/components/BulkAssignmentBar.vue`: fixed-bar markup with the selection count, a category select offering the stored categories (hidden marked) and `Uncategorised`, an Apply control disabled until a choice is made and while disabled/in flight, a clear-selection control, 44px-minimum targets, and the project's focus-visible styling; it stays presentational and emits `assign` and `clear`. Verify with a new `tests/components/bulk-assignment-bar.test.ts` covering the count, the options and hidden marking, the disabled states, and the emits.

## 5. Transactions page

- [x] 5.1 In `app/pages/index.vue`, give every row's category cell the assignment select (stored categories with hidden marking plus `Uncategorised`, current value selected), the pin marker with assistive-technology text, and the change handler that invokes the assignment endpoint with the single identity, disables that row's control while in flight, and reuses the existing row markers and coalesced refresh; a failure reports through the shared status region and keeps the displayed value. Verify in `tests/components/transactions.test.ts`: the control renders the current value and options, choosing a category invokes the endpoint with one identity, `Uncategorised` invokes it with no category, a manual row shows the marker, and a failure leaves the value.
- [x] 5.2 Add selection state to `app/pages/index.vue`: a checkbox per row, a header select-all covering the shown rows with an indeterminate state, and clearing on either filter change; wire `BulkAssignmentBar` and `PatternShortcutBar` into one fixed bottom stack (the shortcut bar loses its own fixed positioning) with page padding for whichever bars are visible. Verify in `tests/components/transactions.test.ts`: select-all selects every shown row and clears when complete, a partial selection is reflected, a filter change clears, the bar appears with the count, apply invokes the endpoint once with every selected identity, and a failed bulk assignment keeps the selection.
- [x] 5.3 Add `tests/browser/manual-category-assignment.spec.ts`: a row select pins a transaction and the pin marker appears, `Uncategorised` on a rule-derived row snaps back to the rule's category, select-all plus bulk apply assigns every shown row, and the row's select and the bars' controls measure at least 44 CSS pixels high. Verify with `npm run build` followed by `npm run test:browser`, including the existing pattern-shortcut suite passing against the bottom-stack change.

## 6. Final verification

- [x] 6.1 Run `npm test` (unit, components, integration) and `npm run test:browser` and confirm every suite passes with the new coverage included.

## Workflow follow-up

- Archive the change with `/opsx-archive` once the implementation is verified.
- Per AGENTS.md, commit all changes and push to the remote after archiving; report an error if either fails.
