# Tasks

## 1. Scoped append re-evaluation

- [x] 1.1 In `server/utils/categories.ts`, add the scoped recompute statement that sets `category_id` from `matchingCategorySql()` filtered by `WHERE t.purpose ~* $1 OR t.counterparty_name ~* $1`, and use it in `appendPattern` with the escaped pattern as the parameter instead of `RECOMPUTE_ASSIGNMENTS`; comment it with the equivalence argument (only matching rows can change) and the tie to the two matching-rule columns. Verify the existing append integration tests still pass with `npm run test:integration` (requires the local PostgreSQL server per `tests/README.md`).

## 2. Integration coverage for the scoped re-evaluation

- [x] 2.1 Extend `tests/integration/category-patterns-api.test.ts` with a test that an append re-evaluates matching transactions and leaves a non-matching transaction's category unchanged: seed a categorised transaction whose purpose and counterparty match nothing appended, plus a transaction matching the appended text, and assert the first keeps its category while the second gets the rule's winner. Verify the new test passes with `npm run test:integration`.
- [x] 2.2 Extend `tests/integration/category-patterns-api.test.ts` with a test that the scoped re-evaluation applies the full rule: a window-categorised transaction matching the appended pattern moves to the expression-matching category, and when an already-matching category with a smaller identity exists, that smaller identity still wins. Verify the new test passes with `npm run test:integration`.
- [x] 2.3 Extend `tests/integration/category-patterns-api.test.ts` with a fault-injection test that a failed re-evaluation rolls back the append: install a temporary trigger that raises when the matching transaction row is updated, call the append endpoint, assert it answers 500, the pattern is not stored, and the transaction's category is unchanged, then drop the trigger. Verify the new test passes with `npm run test:integration`.

## 3. Full verification

- [x] 3.1 Run `npm test` with the local PostgreSQL server available and confirm the unit, component, and integration suites all pass.
- [x] 3.2 On a uniquely named disposable database seeded with synthetic data (about 8,000 transactions and 400 categories each carrying one pattern, per the AGENTS.md database rules), run an append whose pattern matches a small subset, confirm with `EXPLAIN (ANALYZE, BUFFERS)` that the recompute's filter is the pattern predicate over a sequential scan, confirm the append completes in milliseconds rather than seconds, and confirm the full-table category checksum equals the one a global recompute produces.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
