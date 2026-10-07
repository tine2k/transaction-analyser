# Design

## Context

See `proposal.md` for motivation. The relevant current state:

- The transactions screen (`app/pages/index.vue`) reads `GET /api/transactions` once with `useFetch`
  and derives its filter categories from the returned rows. It holds no category list of its own and
  makes no write.
- Categories are stored in the `categories` table (`patterns text[]`, `hidden boolean`,
  `windows jsonb`). Every mutation in `server/utils/categories.ts` runs in one transaction that ends
  with the global `RECOMPUTE_ASSIGNMENTS` statement built by `shared/category-assignment.ts`.
- The management surface already has two read-only previews (`match-count`,
  `window-match-count`) that the category form uses, so preview endpoints are an established
  pattern.
- `frontend-shell` currently claims the sync-start request is the only request that can lead to a
  write, which the category screen already contradicts; the specs phase corrects that wording.
- Browser tests run in headless Chromium with intercepted APIs; integration tests use the disposable
  local PostgreSQL database; component tests mount pages with mocked `useFetch`.

## Goals / Non-Goals

**Goals:**

- Append one literal pattern to an existing category in place, atomically, without a client
  read-modify-write of the category.
- Keep the table interactive while appends and refreshes run, and coalesce refreshes.
- Keep all regular-expression knowledge on the server; the browser sends plain text and reads plain
  counts.
- Make concurrent tabs safe: no lost patterns, no partial category state.

**Non-Goals:**

- Creating a category from the transactions screen.
- Optimistic category display, undo, or a confirmation dialog.
- Changing the matching rule, the category JSON shape, the transaction read endpoint, or the
  existing create/edit/delete contracts.
- A general-purpose popover, toast, or component library; the project's native-control style is
  kept.

## Decisions

### New append endpoint instead of a client `PUT`

`POST /api/categories/:id/patterns` with `{ text }` performs:

```sql
UPDATE categories
SET patterns = patterns || $2
WHERE id = $1 AND NOT patterns @> ARRAY[$2]
RETURNING id, name, patterns, hidden, windows
```

`$2` is the escaped literal. The conditional update makes the append atomic and idempotent, so a
stale client cannot wipe another tab's patterns, windows, or hidden flag the way a full `PUT`
would. When the update matches a row, the same transaction runs the existing recompute; when it
matches no row, the transaction reads the category to distinguish "already stored" (`added: false`,
no recompute, no transaction touched) from "unknown identity" (404).

The response is `{ category, added }`, so the category object keeps the exact shape the management
surface defines while the flag drives the "Already in X" status. Alternative considered: adding an
`added` field to the category object itself (breaks the "exactly these fields" contract) and a
generic partial-update endpoint (larger contract change for one operation).

### Literal semantics with one shared server-side escaper

`shared/literal-pattern.ts` exports `escapeLiteralPattern(text)`, which prefixes a backslash to every
PostgreSQL ARE metacharacter (`. * + ? ^ $ { } ( ) [ ] | \`). The result is a valid expression that
matches the text literally under the existing `~*` operator; because matching is case-insensitive,
no case handling is needed. Both the append and the literal preview use this one function, so they
cannot drift. The browser never sees or builds a regular expression.

Alternative considered: treating the selection as a raw expression (selecting `(` would fail the
write and `A+B` would silently over-match) and escaping in the browser (regex knowledge in the
client, and the preview endpoint would need client-built expressions).

### Read-only literal preview mirrors the existing previews

`POST /api/categories/literal-match-count` with `{ text }` escapes the text and counts stored
transactions whose purpose line matches, reusing the existing `COUNT_MATCHING_TRANSACTIONS`
statement with a one-element candidate array. It validates the text exactly as the append does
(trimmed, string, at least three characters) and writes nothing. A separate endpoint is preferred
over a mode flag on `match-count`, whose contract is "a list of candidate regular expressions".

### Serialize category mutations with an advisory lock

Every category mutation transaction (create, edit, delete, append) takes
`pg_advisory_xact_lock(<constant key>)` before touching data. The global recompute reads the whole
category set, so two concurrent mutations could otherwise interleave recomputes under READ
COMMITTED and leave the final assignments reflecting only one of them. The lock makes the outcome
deterministic at the cost of serializing writes, which the recompute cost already makes the
dominant term. Alternative considered: `SERIALIZABLE` isolation with retries, which is a larger
behavior change for existing endpoints.

### Fixed action bar owned by the page, rendered by a small component

`app/components/PatternShortcutBar.vue` is presentational: it receives the captured text, the
category list, the preview state, and the status, and emits `choose` and `dismiss`. The page owns
the selection capture, append invocation, in-flight tracking, row markers, and refresh, because
those need the transactions ref and the table DOM.

Selection capture listens to `selectionchange`, accepts only a non-collapsed range whose start and
end share one `td` inside the transactions table, trims the text, and requires at least three
characters (code points). It records the row's transaction id from the row's `data-transaction-id`.
The bar is a fixed bottom container: an action row (captured text, a native `<select>` of stored
categories, a dismiss control) and a status line (`role="status"`, polite live region). It hides
when the selection clears unless focus is inside it, and on Escape; a failed append keeps it with
the captured text for a retry.

Alternatives considered: a floating button at the selection (selection-rect positioning, weak on
touch and keyboard) and a control in the filter row (scrolls out of view while working through a
long list).

### Overlapping writes, per-row markers, one coalesced refresh

Each append is tracked in an in-flight map keyed by request id, holding the transaction id and
chosen category. The bar closes on submit and the user can immediately select again. Rows with an
in-flight or not-yet-reflected append carry `aria-busy` plus a subtle visual marker in the category
cell and an sr-only "Updating category" text; no transaction value is altered.

When the in-flight count reaches zero, a short debounce (about 300 ms) collapses the burst into one
`$fetch('/api/transactions')`; the response is assigned to the existing `transactions` ref from
`useFetch`, leaving its `pending` flag false so the table is never replaced by the loading state.
A generation counter discards a superseded response. A failed append removes its row marker and
leaves the data alone; a failed refresh keeps the displayed rows, reports the failure, and leaves
markers in place until a later successful refresh.

The picker reads `GET /api/categories` (a second `useFetch`) and updates that list in place from
each append response; the filter's derived category list is untouched, because `transaction-table`
owns it.

## Risks / Trade-offs

- [A broad literal like "der" re-categorises many transactions and makes the recompute slow] →
  the preview count warns before choosing; the write stays server-side and the table stays
  interactive; there is no undo in v1, and the pattern can be removed on `/categories`.
- [The chosen category may not win the selected transaction: a smaller identity, or an expression
  before a window, decides] → no optimistic display is shown; the marker clears only when the
  refreshed row shows the actual winner, so the user never sees a category the server did not
  assign.
- [Concurrent appends queue on the advisory lock] → each append is short and the UI never waits for
  one before accepting the next; the status line shows how many are in flight.
- [A permanently failing refresh leaves markers and shows stale rows] → the failure is reported
  distinctly and the next successful append schedules another refresh.
- [Selection behavior differs across browsers and touch] → the single-cell rule and
  `selectionchange` capture are exercised in headless Chromium; the bar itself is a native control
  reachable by keyboard.
- [The stored escaped pattern looks unusual when edited on `/categories`] → it is a valid expression
  that matches the literal text; the category form already displays and edits expressions.
- [The preview counts matching transactions, not reassignments] → it is a warning, not a contract;
  the spec only promises the literal match count.

## Migration Plan

No schema or data migration: the change is additive. Deploy with the application; roll back by
reverting the change, leaving stored patterns (including escaped literals) valid.

## Open Questions

- Exact bar copy and the marker's visual treatment (a dot versus a short text label) can be settled
  during implementation without changing the specs or the approach.
- A keyboard shortcut that opens the bar for the current selection is a possible follow-up; it is
  not required by the specs.
