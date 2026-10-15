# Tasks

## 1. Show the displayed transaction count next to the sum

- [x] 1.1 In `app/pages/index.vue`, extend the existing `visible-total` paragraph (around line 571) so the number of currently displayed rows, derived from the existing `visibleTransactions` computed, is presented adjacent to the formatted sum, labelled as a transaction count with singular wording for exactly one row and plural otherwise (for example `Sum of displayed transactions: €-0.25 (1 transaction)`); wrap the count phrase in its own `data-testid="visible-count"` node and keep it inside the loaded-transactions branch so a failed load never shows a zero count. Verify by confirming the default uncategorised view renders `1 transaction` for its single visible row and that `npm run test:components` still passes.
- [x] 1.2 Extend `tests/components/transactions.test.ts` to assert the count next to the sum: the default uncategorised view shows `1 transaction` while the endpoint returned 5 rows, the direct filter link shows `1 transaction`, `all` + `2026-02` shows `4 transactions`, category 2 shows `1 transaction`, and a filter matching no rows shows `0 transactions` alongside the zero sum. Verify with `npm run test:components`.

## 2. Verify the change end to end

- [x] 2.1 Run the project's full suite with `npm test` (unit, components, and the build plus PostgreSQL-backed integration suites) and confirm every suite passes, proving the page edit does not break the build or existing behavior.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
