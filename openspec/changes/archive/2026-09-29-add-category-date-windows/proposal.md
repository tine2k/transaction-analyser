# Proposal

## Why

Categories are matched only by regular expressions against the purpose line, so a
category that should cover everything booked during a period — a holiday, a
business trip — cannot be expressed: the purpose lines of those transactions vary
and would each need their own pattern, and a broad pattern would also catch
transactions outside the period. A category that claims a date range, applied only
when no regular expression already explains a transaction, covers a bounded period
like a two-week `Urlaub` without disturbing the categories that match by purpose.

## What Changes

- Add an optional set of inclusive from/to date windows to a `Category`. A window
  has a `from` and a `to` full calendar date (no time of day), and the transaction's
  destination when it falls inside a window is that window's category.
- Decide assignment in two tiers: a regular expression match wins first; a category's
  date windows are considered only for a transaction whose purpose line matches no
  category's expression. A category may be defined by date windows alone, with no
  expression.
- Reject a create or edit whose windows overlap any stored window in the database,
  so windows partition the calendar; when a transaction is nevertheless covered by
  more than one window (for example stored data predating this rule), the smallest
  category identity wins, keeping the outcome stable.
- Expose the windows on the category management API and accept them on create and
  edit, with validation; a category must still carry at least one expression or at
  least one window.
- Extend the category management screen to add, edit, and remove a category's date
  windows, and to show each category's window count.
- Store the windows on the `categories` row additively; existing categories keep an
  empty window set and behave exactly as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-domain-model`: A `Category` gains an optional set of inclusive date windows as a fourth element, and a category may be defined by windows alone.
- `transaction-postgres-schema`: The `categories` table gains a window column (an additive, nullable-or-empty set of from/to date pairs), with no change to existing columns.
- `category-assignment`: Assignment gains the two-tier rule — expression match first, date window fallback — the window-overlap rejection, and the smallest-identity tie-break among covering windows.
- `category-management-api`: A category's JSON shape gains `windows`; create and edit accept and validate windows, and the "at least one pattern" rule becomes "at least one pattern or window".
- `category-management-screen`: The create and edit forms gain window controls, and the list gains a window count.

## Impact

- Database: a new additive migration adding a window column to `categories`.
- Server: `server/utils/categories.ts` (input reading, validation, the recompute and
  reassign queries, the overlap check) and the category API handlers pass windows
  through; `match-count` preview is unchanged (it remains about expressions only).
- Browser: `app/pages/categories.vue` gains window rows in the shared create/edit
  form and a window count column.
- Tests: extend `tests/unit/db.test.ts`, `tests/integration/api.test.ts`, and
  `tests/components/categories.test.ts`; the existing transaction read/table
  behavior is unaffected.
