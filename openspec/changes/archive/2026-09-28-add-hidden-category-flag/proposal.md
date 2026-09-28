# Proposal

## Why

Some categories produce noise in the monthly analysis — one-off, internal, or otherwise
uninteresting spending — but their transactions still matter in the raw ledger. Today a category
cannot be left out of the analysis without also deleting it, which would rewrite the transactions
it covers. A category needs a way to be marked as out of scope for the analysis while its
transactions stay in the transactions view.

## What Changes

- Add a `hidden` flag to every category. A hidden category's transactions are excluded from the
  category spending analytics, the monthly totals table, and the monthly average page.
- Keep hidden transactions fully visible in the transactions view: hiding is a category-level
  analysis filter, not a deletion or an archival of the transactions.
- Store the flag on `categories` as a non-null boolean defaulting to `false`, so existing
  categories migrate to visible without a backfill decision.
- Let the flag be set when a category is created or edited, and expose it on the category
  management surface, the category management screen, and the category reference returned by the
  transaction read endpoint.
- Leave category assignment untouched: a hidden category still matches purpose lines and still
  categorises transactions exactly as a visible one does.

## Capabilities

### New Capabilities

None. The flag extends the existing category vocabulary, its stored shape, its management surface
and screen, and the analysis views.

### Modified Capabilities

- `transaction-domain-model`: the `Category` vocabulary gains a third element beyond its name and
  its regular expressions, restating the requirement that a category carries nothing more.
- `transaction-postgres-schema`: the `categories` table gains a non-null `hidden` column with a
  `false` default, and the additive-extension requirement is restated for the new column.
- `category-management-api`: a category's returned JSON shape and the create/edit requests gain
  `hidden`, with its validation and default.
- `category-management-screen`: the create and edit form gains a control for `hidden`, and the
  list shows each category's hidden state.
- `transaction-read-api`: the category reference returned with a transaction gains `hidden`, so
  the analysis pages can exclude hidden categories from one read request.
- `category-spending-chart`: the twelve monthly charts exclude transactions belonging to hidden
  categories.
- `monthly-category-totals-table`: the table excludes transactions belonging to hidden categories.
- `monthly-category-average`: the averages exclude transactions belonging to hidden categories.

## Impact

- **Spec deltas**: eight delta files under `specs/` in this change.
- **Schema**: `db/migrations/0004_category_hidden.sql` adds the `hidden` column to `categories`
  with `DEFAULT false NOT NULL`; `0001`–`0003` are untouched and existing rows read as visible.
- **Server**: `server/utils/categories.ts` (read, insert, update, and the returned shape) and the
  transaction read projection in `server/api/transactions.get.ts`.
- **Browser**: `app/pages/categories.vue` (form and list), `app/pages/analytics.vue`,
  `app/pages/monthly-totals.vue`, `app/pages/monthly-average.vue`, and the shared helpers in
  `app/utils/category-spending.ts` that group and average transactions.
- **Unchanged**: `app/pages/index.vue` still lists every transaction, hidden categories included;
  category assignment is unaffected, so no hidden category loses its matching behaviour.
- **Tests**: the unit tests for `category-spending.ts`, the category and analytics component
  tests, and the integration fixture/assertions gain coverage for the flag.
- **Compatibility**: additive at the storage level. The transaction read response grows one nested
  field; no existing field is renamed or removed.
