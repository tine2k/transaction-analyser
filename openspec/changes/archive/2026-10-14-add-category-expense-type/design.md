# Design

## Context

See proposal.md — Why. The current state that shapes the approach:

- Categories already carry properties that reach the analysis views. The hidden flag (migration
  `0004`) and date windows (`0005`) each arrived additively and flow the same way: DB column ->
  categories API -> embedded category in `/api/transactions` -> shared client util ->
  all three analysis pages.
- All three analysis pages fetch `GET /api/transactions` once and aggregate in the browser through
  `app/utils/category-spending.ts`. `excludeHiddenCategoryTransactions` is the single shared
  point where a category-level property selects which transactions contribute.
- The category management screen (`app/pages/categories.vue`) edits hidden with a checkbox and
  shows `Hidden`/`Visible` in its table; the create/edit form submits the whole category, and the
  append operation leaves everything but patterns unchanged. Create and edit replace the stored
  category, so an absent field means "not set" (hidden absent means visible, windows absent means
  none).
- The management API's category JSON and the read API's embedded category are specified as
  "exactly" field lists, so the new field must join both deliberately.

## Goals / Non-Goals

**Goals:**

- Classify each category as recurring, one-time, or unset without touching matching, assignment,
  or stored transactions.
- Let all three analysis views filter by the classification, with `All` as the default so the
  pages are unchanged until the filter is used.
- One shared selection rule and one client-side data flow: no server aggregation, no new request,
  no new endpoint.

**Non-Goals:**

- No server-side filtering, no query parameter on `/api/transactions`, and no new endpoint.
- No effect on imports, notifications, the transactions table, or the pattern shortcut.
- No "unset" filter option on the analysis views, no URL persistence, and no backfill of existing
  categories.

## Decisions

### Nullable column with an allowed-value constraint, not a required two-value field

`categories.expense_type` is a nullable `text` column: `NULL` means unset, and the two labels are
`recurring` and `one-time`. Migration `0008` adds it additively, with a check limiting stored
values to the two labels; the app validates first, so a bad request is a client error and the
check is only a backstop. Existing rows read as unset with no rewrite and no re-evaluation.

Alternatives rejected: a `NOT NULL` column with a third `unset` value (makes "no type" a stored
choice and muddies the API contract), and two booleans, `recurring`/`one_time` (allows nonsense
states, and the hidden precedent uses one column per property).

### `expenseType` in the API, absent means unset

Create and edit accept an optional `expenseType` that is `recurring`, `one-time`, or `null`; an
absent field is treated as `null`, because create and edit replace the stored category — the same
rule hidden and windows already follow. A present value outside the set is rejected with a client
error. The returned category carries `expenseType` (string or `null`), and the read API embeds the
same value in each transaction's category object. Setting the type changes no transaction: the
save path may still re-apply the categories, but membership is unchanged, so the same winners
result.

### One shared client-side selection, applied before grouping

`CategorySpendingTransaction['category']` gains `expenseType`. A new exported helper in
`app/utils/category-spending.ts` — `filterTransactionsByExpenseType(transactions, choice)` —
returns the transactions eligible under `all`, `recurring`, or `one-time`: with `all` it returns
the input unchanged; otherwise only rows whose category's type equals the choice. Unset categories
and uncategorised rows have no matching type, so they are dropped by the helper under the two
typed choices. Hidden exclusion stays where it is, inside the grouping and averaging functions, so
it composes independently and precedes the type choice in effect.

Each page holds its choice in a local ref (like the view switcher and the hide-uncategorised
checkbox), derives the selected transactions from the already-fetched set, and passes them to the
existing grouping/averaging functions. Alternatives rejected: filtering inside the database
(needs a query parameter the read API forbids), and filtering inside each grouping function
(spreads the rule across many call sites and would change their contract for a page-level
choice).

### Radio fieldset on each page and on the management form

Each analysis page gets a page-wide fieldset with three radios — `All` (default), `Recurring`,
`One-time` — matching the months/years view switcher's shape and accessibility. The category form
gets the same three-way control, defaulting to unset, populated from the stored value when
editing. The categories table gains a Type column reading `Recurring`, `One-time`, or `Unset`.
The test hooks follow the existing `data-testid` convention.

### Spec surface follows the hidden-flag precedent

Eight capabilities change: the schema (column), the domain model (a `Category` element), the
management API (JSON shape plus validation), the read API (embed), the management screen (form and
table), and the three analysis capabilities (filter). `frontend-shell` needs no delta: selecting
which returned transactions to display is already the shell's permitted "selected view of returned
transactions", exactly as the hidden exclusion required no delta.

### Testing

- Unit (`tests/unit/category-spending.test.ts` and the categories util tests): the selection helper
  across `all`/`recurring`/`one-time` (typed rows kept, unset and uncategorised dropped only under
  typed choices, `all` unchanged), and the input validation of `expenseType` on create/edit.
- Integration (the categories API suite and a migration assertion in the existing database-backed
  tests): create/edit round-trips `recurring`, `one-time`, `null`, and absent; an unknown label is
  a client error; `/api/transactions` embeds `category.expenseType` including `null`; saving a
  type changes no transaction; the column defaults to unset for existing rows.
- Component (`tests/components/categories.test.ts` and the three page suites): the form sends the
  control's value and clears it for unset; the table shows the type; each page's filter recomputes
  without another fetch, drops unset/uncategorised under a typed choice, and shows its existing
  empty state when nothing matches.
- Browser (the existing analytics and categories specs): each filter control is present, defaults
  to All, and filters the rendered panels/table/list when a typed choice is selected.

## Risks / Trade-offs

- [Category-level granularity] → accepted by design: a recurring category may contain a one-off
  purchase. A transaction-level classification would be a different change.
- [A typed filter hides unset categories and uncategorised rows] → intended and spec'd; the
  default `All` keeps the pages unchanged, and the management screen shows which categories are
  unset.
- [The database check and the app validation could drift] → the allowed set lives in one place in
  the server util and the migration's check mirrors it; the app validates first so bad input never
  reaches the constraint.
- [Three similar controls to keep consistent] → one shared helper and one markup pattern, with
  per-page tests asserting the same semantics.
- [Existing categories are all unset after the migration] → no behavior change until the operator
  classifies categories; the migration is additive and rewrites nothing.

## Migration Plan

Add `db/migrations/0008_category_expense_type.sql` as a plain additive SQL file, applied like every
other migration; it adds the nullable column and its allowed-value check, with a rollback note in
its header (`ALTER TABLE categories DROP COLUMN expense_type;`). No data backfill, no re-evaluation,
and no application startup step. Rollback is dropping the column or reverting the image; stored
transactions are untouched either way.

## Open Questions

None.
