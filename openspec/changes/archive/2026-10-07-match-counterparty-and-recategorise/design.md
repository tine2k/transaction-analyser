# Design

## Context

See `proposal.md` for motivation. The relevant current state:

- The matching rule lives in `shared/category-assignment.ts` as SQL text, exported by
  `matchingCategorySql()`. Its first tier tests `t.purpose ~* expression`; its second tier tests
  date windows. It is framework-free and shared by `server/utils/categories.ts` (the global
  recompute after a category mutation and the reassignment before a delete) and
  `shared/transactions-import.ts` (the scoped assignment of the rows one import wrote).
- `server/utils/categories.ts` also holds two preview statements that mirror the matching rule
  without writing: `COUNT_MATCHING_TRANSACTIONS` (used by both the expression preview and the
  literal preview) and `COUNT_CLAIMED_TRANSACTIONS` (the window-claim preview, which excludes a
  transaction already explained by a stored expression).
- Category mutations serialize on a transaction-scoped advisory lock
  (`CATEGORY_MUTATION_LOCK_KEY = 20261007`); imports take `LOCK TABLE categories IN SHARE MODE`
  and assign their own rows inside their write transaction.
- The imports screen (`app/pages/imports.vue`) already carries the "Sync now" control: a
  `syncing` ref that disables the button, a `syncMessage` ref rendered in a `role="status"`
  element, and a `$fetch` call. `transactions.counterparty_name` is `NOT NULL`.
- No endpoint changes transaction categories on demand; category mutations do so as a side
  effect, and `transaction-read-api` keeps `/api/transactions` read-only.

## Goals / Non-Goals

**Goals:**

- One matching rule for the whole system: a category's expressions test the purpose line or the
  counterparty name, and every consumer follows the same SQL.
- An on-demand re-categorisation that is accurate about what it changed, safe under concurrency,
  and persists nothing.
- An imports-screen control that fits the existing button pattern and reports the server's count.

**Non-Goals:**

- Manual per-transaction assignment, an undo, or a preview of what a re-categorisation would
  change before it runs.
- Matching against the counterparty account, the amount, or any field other than the purpose line
  and the counterparty name.
- Changing the category JSON shape, the transactions read endpoint, the import run record, or the
  database schema.

## Decisions

### Extend the shared matching SQL rather than add a second rule

`matchingCategorySql()` changes its expression EXISTS to:

```sql
WHERE t.purpose ~* expression OR t.counterparty_name ~* expression
```

Every consumer then follows without its own change: the global recompute, the delete
reassignment, and the scoped import assignment. `counterparty_name` is `NOT NULL`, so no null
guard is needed. Alternatives considered: a per-call flag (two rules to keep in sync) and a
separate counterparty-matching function (drift between assignment and previews).

### Preview statements mirror the same predicate

`COUNT_MATCHING_TRANSACTIONS` gains the same `OR t.counterparty_name ~* candidate.pattern` test,
and the window-claim exclusion in `COUNT_CLAIMED_TRANSACTIONS` gains
`OR t.counterparty_name ~* expression.pattern`. The previews exist to tell the user how many
transactions an expression or window would match, so leaving them purpose-only would make them
disagree with the assignment they preview. Alternative considered: leave the previews unchanged
and document the divergence, which would mislead the category form and the pattern shortcut.

### One UPDATE returns exactly the changed rows

`recategoriseTransactions()` runs a single statement built from the shared rule:

```sql
UPDATE transactions AS t
SET category_id = <matchingCategorySql()>
WHERE t.category_id IS DISTINCT FROM (<matchingCategorySql()>)
RETURNING 1
```

The `IS DISTINCT FROM` predicate skips every row whose assignment is already correct, so the
driver's `rowCount` is the number of changed transactions and the answer needs no second query.
Both the SET and the WHERE use the same rule text and the statement is one snapshot, so the count
always agrees with what was written. Alternative considered: a separate `SELECT count(*)` before
the update, which can see a different snapshot under a concurrent import and report a count that
does not match the write; a CTE that materialises the chosen categories is also correct but adds
machinery for the same result. Evaluating the `COALESCE` rule twice per row is acceptable because
the operation is manual and the existing category mutation already runs the same rule over the
whole table.

### Serialize with the existing category-mutation lock, and nothing else

The operation runs in one transaction, takes `pg_advisory_xact_lock(CATEGORY_MUTATION_LOCK_KEY)`
first, then runs the UPDATE. Sharing the key with create, edit, delete, and append means a
re-categorisation can never interleave with a category change: the category set it reads is the
set the write transaction holds. An import may run concurrently, which is safe: it takes
`LOCK TABLE categories IN SHARE MODE` and evaluates its own new rows with the same rule, so no
row is left unassigned and no category set changes under it. Taking the categories table lock as
well was considered and rejected: it would block imports for no consistency gain.

### New endpoint on the category management surface

`server/api/categories/recategorise.post.ts` follows the existing route style (call the utility,
map failures with `throwCategoryHttpError`) and answers `{ changed: <integer> }`. The path is on
the category management surface because assignment is category-driven, and it mirrors the flat
preview routes (`/api/categories/match-count`). Alternatives considered: a route under
`/api/transactions`, which `transaction-read-api` specifies as read-only, and a flag on an
existing route, which would blur two contracts. No import run is recorded, so the response is the
only place the count exists.

### The imports screen control reuses the existing button pattern

`app/pages/imports.vue` gains a `recategorising` ref, a `recategoriseMessage` ref, and a
`recategorise()` function beside `startSync()`: it returns early when a request is in flight,
disables the button while it runs, posts to `/api/categories/recategorise`, and sets the message
to the returned count on success or a distinct failure message on error. Because the message is a
plain ref and the page never stores it, the report disappears on reload; because the operation
records no run, the function does not refresh the import log. Alternative considered: a shared
component for both controls, which the project's native-control style does not need for two
buttons.

## Risks / Trade-offs

- [The counterparty test widens matches and can move transactions to another category] → it is
  the requested behavior; the now counterparty-aware previews show the effect before a category is
  saved, and the re-categorisation report shows the effect after the rule change. There is no
  undo.
- [A re-categorisation over a large table holds the advisory lock and row locks for its duration]
  → the UPDATE touches only changed rows and the operation is manual and rare; the control is
  disabled while it runs.
- [A second click or a second tab could start another run] → the button disables in the browser,
  and the advisory lock serializes a second request server-side; the second then reports zero.
- [A failed request could be mistaken for a count of zero] → the endpoint answers an error status
  and the screen reports the failure distinctly, never as zero.
- [Existing transactions categorised under the old rule keep their category until something runs]
  → the control exists for exactly this; the count tells the user how many moved.
- [The `IS DISTINCT FROM` predicate evaluates the matching rule twice per row] → the same rule
  already runs over the whole table on every category mutation, and the operation is manual.

## Migration Plan

No schema or data migration. Deploy the application; existing transactions keep their categories
until a category change or the re-categorisation control runs. Roll back by reverting the change:
stored assignments and categories remain valid, and the previews and matching revert to the
purpose-only rule.

## Open Questions

- The exact control label and message copy ("Re-categorise all" / "N transactions changed") can be
  settled during implementation without changing the specs or the approach.
