# Design

## Context

See `proposal.md` for motivation and `specs/` for the observable contract. The category form in
`app/pages/categories.vue` already previews expressions: a debounced watcher posts the entered
expressions to `POST /api/categories/match-count`, which calls `countCategoryMatches` in
`server/utils/categories.ts` and counts transactions whose `purpose ~*` any candidate expression,
ignoring stored assignments. Category date windows (added by `add-category-date-windows`) are read
by `readWindows` and stored in `categories.windows` as a `jsonb` array of `{from,to}` day pairs;
two-tier assignment lives in `RECOMPUTE_ASSIGNMENTS`. The new preview answers a different question
from the expression preview: how many transactions a window would actually claim once expressions
have had first refusal.

## Goals / Non-Goals

**Goals:**
- Add a read-only preview that returns one combined count for a candidate window set, counting a
  transaction only when it falls in a window and no stored expression matches it.
- Reuse the existing window validation and the existing expression-matching semantics, so the
  preview agrees with `category-assignment`.
- Show the count in the form as a second, independent preview that never mixes with the expression
  preview.
- Add no database migration and change no stored data.

**Non-Goals:**
- No change to the expression preview, to assignment/recompute, or to the window non-overlap rule.
- No per-window counts, no listing of which transactions match, and no filtering of the main table.
- No composed preview that counts windows and expressions together.

## Decisions

1. **Add a dedicated read-only endpoint, `POST /api/categories/window-match-count`, beside the
   existing `match-count`.** The two previews answer different questions and must not be folded
   together, so a separate route keeps each request and response unambiguous and lets the form
   load and fail them independently. Extending `match-count` to accept an optional `windows` field
   was rejected: it would blur the two previews the request explicitly wants kept apart, and it
   would make the existing endpoint's meaning depend on which field is present.

2. **Count with one query: in a window, and no stored expression matches.** The count is the
   transactions satisfying both
   `EXISTS (jsonb_array_elements($1) AS w WHERE t.booking_date BETWEEN (w->>'from')::date AND (w->>'to')::date)`
   and
   `NOT EXISTS (SELECT 1 FROM categories c, unnest(c.patterns) AS p WHERE t.purpose ~* p)`.
   The `EXISTS` makes the window test inclusive and tests the booking date alone; the `NOT EXISTS`
   mirrors the first tier of `RECOMPUTE_ASSIGNMENTS`, so a transaction any stored expression
   matches is excluded whatever its identity. `count(*)` counts each transaction once even when
   several windows cover it. The query reads only; it does not run the recompute. The window
   branch is unindexed and scans transactions per change, which is acceptable for a preview that
   runs on typed input and is debounced, matching the existing expression preview.

3. **Validate with the existing `readWindows`, then require a non-empty list.** `readWindows`
   already enforces the create/edit window shape: a list of objects holding exactly `from` and
   `to`, each a real `YYYY-MM-DD` date, with `from <= to`. The preview calls it and rejects an
   empty result with a client error, so a malformed or reversed window is refused exactly as on
   save. The stored non-overlap check is deliberately skipped: overlap is a save-time rule about
   stored windows, and a read-only preview that counts each transaction once should not reject
   overlapping input.

4. **Define "claimed" against stored categories' expressions, not the form's unsaved
   expressions.** The preview answers what the windows would claim against the categories as they
   are stored, which is what the next recompute will use for every category except the one being
   edited. Using the form's in-progress expressions was rejected: it would make the preview's
   meaning depend on unsaved edits and couple it to the expression preview the request wants kept
   separate. The consequence — an edit that also changes its own expressions previews against the
   stored expressions — is acceptable and is stated in the spec as "no stored category's regular
   expression matches".

5. **Mirror the expression preview's UI pattern with a second, independent state machine.** The
   form gains its own `windowMatchCount` value, state, generation counter, and debounced `watch`
   on `windows`, separate from the expression preview's. Only windows with both dates entered are
   sent; with none, the state is the empty state and no request is made. The count is rendered in
   its own element (with its own `data-testid`) so the two previews are visibly separate, and a
   failed or outdated window response falls back to an unavailable state rather than a stale
   number. The browser tests no date and evaluates no expression; it only displays the server's
   count.

## Risks / Trade-offs

- [A preview against stored expressions can differ from the count after an edit that also changes
  the category's own expressions] → The difference is confined to the edited category's own
  transactions and is re-evaluated on save; the spec names the stored-expression basis so the
  behavior is defined rather than accidental.
- [The window branch scans all transactions on each debounced keystroke] → The request is
  debounced and only fires when windows are complete; the existing expression preview already
  scans on the same cadence, so the added load is proportional.
- [Skipping the non-overlap check means a preview can succeed where the save is later refused] →
  This is intended: the preview is read-only and the save keeps its own validation, so the user
  still sees the overlap error when submitting.
- [A second endpoint and a second watcher add surface area] → The endpoint is small and reuses
  existing helpers, and the watcher mirrors the existing one, keeping the change local to the
  category form.

## Migration Plan

No database migration and no stored-data change. Deploy the server endpoint and the form change
together; rollback consists of removing the route and the form's window preview, with nothing to
restore in the database.

## Open Questions

None.
