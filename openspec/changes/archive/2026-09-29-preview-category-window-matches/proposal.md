# Proposal

## Why

The category form already previews how many transactions an entered regular
expression matches, but a date window — which claims a period's transactions only
when no expression explains them — has no preview. A user entering an `Urlaub`
window cannot see how many transactions it would actually claim before saving, so a
mistyped range or an empty window is discovered only after the category is written.

## What Changes

- Add a read-only preview of a category's date windows to the category management
  surface: given a non-empty list of candidate windows, return how many stored
  transactions the windows would claim.
- Define a claimed transaction as one whose booking date falls inclusively in at
  least one entered window **and** whose purpose line matches no stored category's
  regular expression, mirroring the window-fallback assignment rule. Transactions
  already explained by an expression are excluded.
- Count each transaction once across all entered windows, even if it falls in
  several, and return the count as a single combined number.
- Show that count in the category create/edit form in its own preview, separate
  from the existing expression-match preview; neither preview includes the other.
- Keep the existing expression-match preview, the assignment rules, and stored data
  unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-management-api`: Add a read-only preview operation that returns the number of transactions a candidate window set would claim, with window validation and no stored change.
- `category-management-screen`: Add a window-claim preview to the create/edit form, kept separate from the expression-match preview.

## Impact

- Server: a new read-only category endpoint (alongside the existing expression
  `match-count`), and a counting query in `server/utils/categories.ts` reusing the
  existing window reading and expression-matching rules.
- Browser: `app/pages/categories.vue` gains a second preview state and request,
  driven by the entered windows.
- Tests: extend `tests/integration/api.test.ts` and
  `tests/components/categories.test.ts`; no database migration, no stored data
  change, and no change to the assignment recompute.
