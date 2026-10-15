# Design

## Context

See proposal.md for motivation. Current state that shapes the approach:

- `GET /api/transactions` (`server/api/transactions.get.ts`) is the single source for every
  category consumer: the transactions table, analytics, monthly totals, and monthly average.
- Every write to `transactions.category_id` lives in `server/utils/categories.ts`: the global
  recompute after a create/edit, the scoped recompute after a pattern append, the recategorise
  operation, and the delete retirement reassignment. Each mutation serializes on one
  transaction-scoped advisory lock (`CATEGORY_MUTATION_LOCK_KEY`).
- The transactions table already carries the pattern shortcut machinery: per-row markers, a
  coalesced refresh after writes settle, in-place updates, and a fixed bottom action bar. That
  machinery is reused rather than duplicated.

## Goals / Non-Goals

**Goals:**

- A manual assignment that rule-driven recomputation never overwrites, while unpinned rows keep
  behaving exactly as they do today.
- One write path shared by the per-row select and the bulk bar, so the semantics cannot drift
  between them.
- Keep `category_id` the effective category for every existing consumer, so no read path needs a
  COALESCE and the recategorise count stays "rows whose displayed category changed".
- Reuse the shortcut's refresh, marker, and status machinery.

**Non-Goals:**

- No hard unassign (a permanent exclusion from the rule), no category creation from the table,
  no preview of what a bulk assignment will change.
- No change to the matching rule or the import path; imported rows start unpinned.

## Decisions

### Storage: a pin flag on the transaction, not a second category reference

Add `transactions.category_locked boolean NOT NULL DEFAULT false`, with a CHECK that a locked row
has a category (`NOT category_locked OR category_id IS NOT NULL`). `category_id` remains the single
effective value:

- the read endpoint and every consumer keep reading it directly;
- the recategorise statement excludes locked rows, so its changed-count stays the count of visible
  changes;
- clearing a pin re-evaluates the named rows in the same write with the existing
  `matchingCategorySql`, so the fallback value is current at once.

*Alternative considered:* a separate `manual_category_id` reference with `COALESCE(manual,
derived)` in the read path. It preserves the derived value while pinned, but pushes COALESCE into
every consumer, complicates the changed-count, and makes delete juggle two references. Not worth
it, because unpinning recomputes anyway.

### One write endpoint for single and bulk assignment

`POST /api/transactions/category-assignments` with
`{ transactionIds: string[], categoryId: string | null }`, answering `{ updated: n }`. The per-row
select sends one identity; the bulk bar sends the selection. One endpoint keeps validation,
pinning, clearing, locking, and error mapping single-sourced.

*Alternative considered:* REST-style `PUT /api/transactions/:id/category` plus a separate bulk
endpoint — two code paths with identical semantics to keep in sync, and the project's existing
style already uses POST operations (`/api/categories/recategorise`).

Pin: `SET category_id = $target, category_locked = true WHERE id = ANY($ids)`.
Clear: `SET category_locked = false, category_id = <matching rule> WHERE id = ANY($ids)`.

### Validation, atomicity, and serialization

The request is refused as a client error with no stored change when the identity list is empty or
not a list of digit strings, when any named transaction does not exist, or when `categoryId` names
no stored category. Identities are deduplicated, so a repeated identity is assigned and counted
once. The whole operation runs inside one transaction under `CATEGORY_MUTATION_LOCK_KEY`, so it
serializes with every category mutation and no assignment can name a category deleted concurrently.

### Rule-driven recomputes exclude pinned rows; delete clears pins

- `RECOMPUTE_ASSIGNMENTS`, `RECOMPUTE_APPENDED_PATTERN`, and `RECATEGORISE_TRANSACTIONS` gain a
  `NOT category_locked` condition.
- `REASSIGN_RETIRING_CATEGORY` also sets `category_locked = false` on the rows it reassigns, so a
  pin cannot outlive its category (the foreign key would block the delete anyway).

### Read endpoint exposes the assignment provenance

`GET /api/transactions` maps the flag to a top-level field
`categoryAssignment: 'manual' | 'automatic'`. The `category` object keeps its exact shape. An
uncategorised row always reads `automatic`, which the CHECK makes structural.

*Alternative considered:* a boolean `assignedManually`; the string value mirrors the existing
`expenseType` style and reads explicitly.

### UI: per-row select, checkbox selection, bulk bar with an explicit Apply

- Every row's category cell hosts a native select whose value is the current category:
  `Uncategorised` plus the stored categories, hidden ones marked `(hidden)` like the pattern
  shortcut bar. A native select provides keyboard and touch behavior without custom code.
- A pinned row shows a small marker with assistive-technology text; no transaction value changes.
- Selection: a checkbox per row and a select-all checkbox in the header with an indeterminate
  state covering the currently shown rows. Changing either filter clears the selection, so every
  selection member stays visible.
- `BulkAssignmentBar` is a new presentational component with a category select, an Apply button,
  and a Clear-selection button. Apply is explicit rather than apply-on-change, because a bulk
  misfire affects many rows at once.
- Refresh and feedback reuse the shortcut machinery: per-row in-flight markers, one coalesced
  `refreshTransactions` after the last write settles, in-place updates, and the shared status
  region for failures. A failed bulk assignment keeps the selection for retry.
- Both fixed bars render inside one fixed bottom stack in `index.vue` so they can never overlap;
  the page's bottom padding follows whichever bars are visible. `PatternShortcutBar` keeps its
  markup and loses only its own fixed positioning, which the stack provides.

### Assignment logic lives in `server/utils/categories.ts`

That file already owns category mutation and assignment semantics, the advisory lock,
`inTransaction`, and `throwCategoryHttpError`. A new module would duplicate the lock and error
plumbing; a new thin endpoint (`server/api/transactions/category-assignments.post.ts`) calls the
new utility, matching how the other API routes delegate.

## Risks / Trade-offs

- [Pinned rows ignore later category edits; that can read as "recompute is broken"] → the pin
  marker makes the provenance visible in the row itself.
- ["Uncategorised" on a rule-derived row is a no-op that snaps back] → accepted semantics from
  the chosen model, recorded in the specs; the alternative (hard unassign) is a non-goal.
- [The category cell now hosts a control, so text selected there cannot start a pattern] → the
  pattern shortcut still works on the text cells; a native select is not text.
- [A bulk request naming very many rows] → one `= ANY($1::bigint[])` update; the stored table is
  the practical bound.
- [The CHECK constraint blocks any future code that locks a row without a category] → that state
  is unreachable by design; revisiting it belongs to a future hard-unassign change.

## Migration Plan

1. Add migration `0009_transactions_manual_category.sql`: `category_locked boolean NOT NULL
   DEFAULT false` plus the CHECK constraint. Existing rows default to unpinned; no backfill.
2. The migration runs at server start through the existing migration plugin, together with the
   endpoint and read-field changes in the same deployable. Rollback: drop the constraint and the
   column; only pin states are lost.
