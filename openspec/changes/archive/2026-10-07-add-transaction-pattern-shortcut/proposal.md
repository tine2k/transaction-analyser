# Proposal

## Why

Assigning a pattern to a category today means leaving the transactions view, opening the category
screen, editing the category, and retyping text that is already visible in the purpose line. While
reviewing uncategorised transactions, the useful pattern is right there in front of the user, so
the work should happen in place. The table must stay responsive while the server re-evaluates
every stored transaction, because the user wants to move through many transactions without
waiting.

## What Changes

- The transactions screen offers a fixed action bar when the user selects at least three
  characters inside a single table cell. The bar names the captured text, previews how many stored
  transactions that text matches, and offers the stored categories.
- Choosing a category appends the selected text, treated as a literal, to that category's patterns.
  No category is created, and the browser evaluates no regular expression.
- Appends do not block the table. Several appends may be in flight at once; each affected row
  carries a subtle marker until one coalesced background refresh reflects the result. Failures are
  reported distinctly, and the bar stays with the captured text so the user can retry without
  re-selecting.
- A new append operation on the category management surface stores the escaped literal atomically,
  so parallel tabs cannot overwrite each other's patterns or windows.
- A new read-only preview operation counts the stored transactions a literal text matches, mirroring
  the existing expression and window previews.
- `frontend-shell` wording is corrected: the browser triggers category writes through the category
  management surface (the existing create, edit, and delete, plus the new append) while still
  evaluating no pattern and writing no row itself.

## Capabilities

### New Capabilities

- `transaction-pattern-shortcut`: the transactions screen's in-place pattern assignment — the
  selection-triggered action bar, literal preview, append invocation, non-blocking overlapping
  writes, row markers, and the coalesced background refresh.

### Modified Capabilities

- `category-management-api`: the surface gains an append operation that adds one escaped literal
  pattern to a named category atomically, and a read-only operation that counts the stored
  transactions a literal text matches; the "only way a category is written" requirement now names
  the append operation.
- `frontend-shell`: the requirement that the shell performs no domain work and that only the sync
  request can lead to a write is corrected to acknowledge browser-triggered category writes through
  the management surface.

## Impact

- `app/pages/index.vue` gains the action bar, selection capture, preview, append invocation,
  in-flight tracking, row markers, and the coalesced refresh.
- `server/utils/categories.ts` gains the append and literal-preview operations; the existing
  category mutations gain a shared serialization point.
- New endpoints under `server/api/categories/`.
- `shared/` gains the server-side literal escaping used by both the append and the preview.
- Tests: component tests for the transactions screen, browser tests for the selection flow, and
  integration tests for the new endpoints and concurrency behavior.
- Spec deltas for `transaction-pattern-shortcut`, `category-management-api`, and `frontend-shell`.
