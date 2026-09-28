# Design

## Context

See `proposal.md` for motivation. The relevant current state:

- `categories` holds `id`, `name`, and `patterns` (`db/migrations/0002` and `0003`).
- Category management returns `{ id, name, patterns }` and writes through `POST`/`PUT`, with the
  insert/update and a full `RECOMPUTE_ASSIGNMENTS` sweep in one transaction.
- The transaction read endpoint joins each transaction's category and returns it nested as
  `{ id, name }`.
- The three analysis views (`category-spending-chart`, `monthly-category-totals-table`,
  `monthly-category-average`) each derive everything from one `GET /api/transactions` request and
  are forbidden by their specs from making a second data request.
- The transactions view already shows every returned transaction; hidden transactions must keep
  appearing there unchanged.

The one thing this change must solve architecturally is how the three analysis pages learn which
categories are hidden without issuing a request the specs forbid.

## Goals / Non-Goals

**Goals:**

- Persist a per-category `hidden` flag, defaulting to visible, additively.
- Expose the flag wherever a category is read or written.
- Exclude hidden categories' transactions from the three analysis views only.
- Preserve each analysis page's single read request and the existing category assignment.

**Non-Goals:**

- Hiding individual transactions, or deleting/archiving them. The flag lives on the category.
- Changing category assignment, the transactions view, or the transactions page's category filter.
- A one-click toggle on the category list; the flag is edited through the existing form.
- Any server-side aggregation or a new endpoint.

## Decisions

### 1. Store `hidden` as `boolean NOT NULL DEFAULT false` on `categories`

A new additive migration `db/migrations/0004_category_hidden.sql` adds the column with a `false`
default, so every pre-existing category migrates to visible with no backfill decision and no row
rewrite. A nullable column was rejected because absence would be a second way to say "visible"; a
separate table or a status enum was rejected as disproportionate to one boolean.

### 2. Carry `hidden` on the transaction read response's category object

Add `hidden` to the nested `category` object the transaction endpoint already returns, so the
three analysis pages can filter hidden categories from the same one read request they already
make. Alternatives considered:

- Fetching `GET /api/categories` from each analysis page: rejected, because the analysis
  capabilities require exactly one transaction read request and no additional data request.
- A top-level `hidden` field on the transaction: rejected, because hiding is a category property,
  not a transaction one, and it would duplicate the flag per transaction.
- A query parameter that filters hidden transactions server-side: rejected, because the read
  endpoint defines no narrowing parameter, and the transactions view needs the hidden rows in the
  same response.

The cost is that the transaction response's `category` object is no longer `{ id, name }`; the
`transaction-read-api` delta and its consumers are updated accordingly.

### 3. Filter hidden transactions in the shared analysis helpers

`app/utils/category-spending.ts` already owns grouping and averaging. The filter is applied once,
before grouping, in the functions the analysis pages call, rather than repeated in each page. The
transactions page (`app/pages/index.vue`) does not use these helpers for its filter, so it is
untouched and continues to show hidden transactions.

### 4. `hidden` is an optional boolean input that defaults to `false`

`POST`/`PUT` accept `hidden`; absent means `false`, and a present non-boolean is rejected with a
client error and no stored change. Because `PUT` replaces the category, an edit that omits
`hidden` stores `false`; the management screen always sends the field, so this is only a rule for
direct API callers. Encoding the flag in the same request preserves the existing single
transaction per write and the post-write reassignment sweep.

### 5. Assignment, the transactions view, and the category filter are unchanged

A hidden category is only excluded from the analysis views' input. It still matches purpose lines,
still wins assignment, still appears in the transactions table, and still appears in the
transactions page's category filter (which is derived from returned transactions). This keeps the
change additive and avoids surprising the user with a category whose transactions silently
disappear from the ledger.

## Risks / Trade-offs

- **The transaction read response grows a nested field**; a consumer assuming `category` is
  exactly `{ id, name }` must adapt → update the `transaction-read-api` delta, the frontend
  `Category`/`CategorySpendingTransaction` types, and the integration assertions.
- **A hidden category still appears in the transactions page's category filter**, which may look
  inconsistent with it being absent from the analysis → acceptable and intended: hiding is an
  analysis scope, not a ledger filter; the flag is visible on the category management screen.
- **Forgetting to update one analysis page** would leave hidden amounts in one view → the shared
  helper is the single choke point; tests cover all three views and the assignment path.
- **Existing integration fixture has no `hidden` column expectation**; the migration default keeps
  the fixture valid, but new assertions are added for hidden categories.

## Migration Plan

1. Add `db/migrations/0004_category_hidden.sql`:
   `ALTER TABLE categories ADD COLUMN hidden boolean NOT NULL DEFAULT false;`
2. The existing migration runner applies `0001`–`0004` in filename order; the change is additive
   and depends on `0002`/`0003` only for the table's existence.
3. Rollback: `ALTER TABLE categories DROP COLUMN hidden;` — no other object depends on the column.
4. No data backfill and no reassignment run; existing categories and transactions are untouched.
