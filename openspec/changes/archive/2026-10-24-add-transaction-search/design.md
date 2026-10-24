# Design

## Context

The transactions tab (`app/pages/index.vue`) already requests the complete transaction set once from `GET /api/transactions` and derives the visible rows entirely in the browser. Category and period selections are refs synchronised with the route query through a watcher; sort is also route-backed; the visible sum and count already read from the same filtered set. Row selection is cleared by a watcher on the two filters, and the table re-reads in the background after category writes.

See `proposal.md` for motivation and `specs/transaction-table/spec.md` for the required behaviour.

## Goals / Non-Goals

**Goals:**

- Add an all-transactions text search with clear precedence over the existing filters and an explicit paused-filter state.
- Keep the route query the linkable description of the view, without making every keystroke a navigation.
- Keep the change inside the existing page component and its tests.

**Non-Goals:**

- Server-side search, pagination, or any change to the read endpoint.
- Searching categories, amounts, or dates; those keep their existing filter and sort controls.
- Match highlighting, saved searches, or a search history.

## Decisions

### D1: Filter client-side from the already-loaded set

Search is another computed layer over `transactions.value`, not a request parameter. The read endpoint returns every row and forbids search parameters, and a network round trip per keystroke would add latency without changing the result set.

*Alternative:* extend `GET /api/transactions` with a query parameter. Rejected: it breaks the read-API contract and duplicates filtering the client already owns.

### D2: One trimmed search value governs scope

Introduce a `searchText` ref holding exactly what the field shows, and a `searchQuery` computed that trims it. `visibleTransactions` branches once:

```
searchQuery === ''
  -> category and period filters apply (current behaviour)
searchQuery !== ''
  -> category and period filters are bypassed
```

Keeping the raw ref separate from the trimmed value preserves spaces the user is still typing, which matters for multi-term input.

*Alternative:* when the search becomes non-empty, set both filters to All. Rejected: it destroys the values to restore on clear and makes the URL describe a view the user did not choose.

### D3: Descriptive fields with normalized, AND-ed terms

The haystack is purpose, counterparty name, and counterparty account joined with spaces. Both haystack and query are lower-cased and stripped of combining marks (`normalize('NFD')` plus a combining-mark removal), then split on whitespace; every term must occur in the haystack. A blank query means no search.

*Alternative:* match every displayed value. Rejected: dates and amounts have dedicated controls, a category name would collide with the category filter, and a row could vanish when it is reassigned mid-search.

*Trade-off:* case folding does not map `ß` to `ss`; searching `strasse` will not find `Straße`. Acceptable for a first version.

### D4: Paused filters are disabled, not hidden

While `searchQuery` is non-empty, both selects receive the native `disabled` attribute, keep their bound values, and are described by a visible note ("Filters are paused while searching"). Native disabling removes them from the tab order and prevents value changes that would otherwise appear to have no effect.

*Alternative:* `aria-disabled` with click suppression. Rejected: more code and weaker guarantees for keyboard users. Hiding the selects was rejected because it shifts the layout and hides the values that return when the search is cleared.

### D5: Route-backed search with a debounced, guarded write

`q` carries the trimmed search text. The field is bound to `searchText` so filtering is immediate; a watcher with a short debounce (~250 ms) writes `q` through `router.replace`, preserving the existing category, period, and sort values. Empty text removes `q`.

Two guards keep typing stable:

- The route-to-field watcher only adopts `route.query.q` when it differs from `searchText.trim()`, so writing the trimmed value back never deletes the trailing space the user just typed.
- A stored `lastWrittenQuery` distinguishes the component's own write from back/forward navigation. On an external route change the pending debounce is cancelled before the field adopts the new value.

On mount the existing immediate watcher continues to initialise category, period, and sort; the search watcher initialises `searchText` from `q`, and the paused state follows from the computed value.

*Alternative:* write `q` on every keystroke. Rejected: avoidable navigations and a higher chance of cursor and history interference.

### D6: Reuse the existing filter row and derived summary

Place the search field first in the existing filter region, above the category and period controls, with a label naming the widened scope ("Search all transactions"), `type="search"`, and an explicit clear control when text is present. Styling follows the ledger tokens already used by the selects (`rounded-sheet`, `border-rule-strong`, `min-h-11`, the shared focus outline), full width on small screens.

No new summary computation is needed: `visibleTotal`, the visible count, select-all, and the bulk bar all read `visibleTransactions`, so they follow the search automatically once the branch in D2 is in place. Only the empty-state template needs a third branch: response empty, search matched nothing, filters matched nothing.

### D7: Selection clears on any query change

Extend the existing `watch([categoryFilter, periodFilter], ...)` to include the trimmed search value. This prevents a bulk assignment from acting on rows that the new search no longer shows, without adding a separate selection model.

## Risks / Trade-offs

- **Zero results look broken when the filters are narrow** → The field label states the scope, and the paused note appears as soon as typing starts, so the widened scope is visible before results are judged. No automatic hint is added because search always spans everything.
- **Trailing-space loss while typing multi-term queries** → The trim-aware route guard in D5; tests cover a two-term query typed with a space.
- **Selections surviving into a different result set** → D7 clears them on every search change.
- **Per-keystroke cost on a large dataset** → Filtering three string fields per row is proportional to the existing filter pass. If profiling later shows a problem, a normalised per-row index can be memoised; it is not needed for the current dataset size.
- **Paused selects are still readable as the active view** → The visible note plus the `aria-describedby` association make the paused state explicit; tests assert both the disabled state and the note.

## Migration Plan

No data, schema, or API migration. The page change ships with the frontend; rollback is removing the field and the `q` handling, which leaves stored data untouched.

## Open Questions

None.
