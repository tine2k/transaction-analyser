# Proposal

## Why

Appending a pattern through the transactions-table shortcut currently re-evaluates **every** stored
transaction against **every** stored category pattern inside the append transaction. Only the
transactions whose purpose line or counterparty name match the appended pattern can change category,
so the rest of the work is wasted: with 8,000 transactions and 400 patterns one append takes ~20
seconds (benchmark: 19.5-27.5 s, all 8,000 rows rewritten), and concurrent appends queue behind the
advisory lock and repeat the whole recompute one after another.

## What Changes

- The append re-evaluation in `appendPattern` is scoped to the transactions the appended pattern can
  affect: the update runs only for rows whose purpose line or counterparty name matches the appended
  literal pattern, using the same escaped pattern that is stored.
- Transactions that do not match the appended pattern are not re-evaluated and keep their category.
- The resulting assignment state is unchanged. Adding a pattern only adds its category to the
  candidate set of rows that match it, so evaluating exactly those rows with the full matching rule
  is equivalent to the global recompute. Benchmark verification (8,000 transactions, 400 patterns):
  identical full-table category checksums for patterns matching 0, 20, 800, and 7,200 rows, while a
  typical append drops from ~20 s to ~6 ms and the worst case measured ~95 ms.
- No API shape, request/response, database schema, or frontend change. Create, edit, and delete keep
  their existing full re-evaluation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-management-api`: a requirement is added stating that the re-evaluation triggered by an
  append is limited to the stored transactions the appended pattern can affect, making the scoped
  evaluation the specified behavior instead of leaving the re-evaluation set implicit.

## Impact

- `server/utils/categories.ts`: `appendPattern` uses a new scoped recompute statement instead of
  `RECOMPUTE_ASSIGNMENTS`; the global statement stays in use for create, edit, and delete.
- `shared/category-assignment.ts`: unchanged; the matching rule is reused inside the scoped
  statement.
- Tests: `tests/integration/category-patterns-api.test.ts` gains coverage that an append leaves the
  category of a transaction it does not match untouched, and that a scoped append still applies the
  full matching rule (expression tier, window fallback, smallest identity).
- No migration, no dependency change, no frontend change.
