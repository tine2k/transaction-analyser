# Design

## Context

The transactions page currently treats the search field's value as the live query. `searchText` drives a trimmed computed, `visibleTransactions` filters the whole loaded set on every keystroke, and a 250 ms debounced watcher writes `q` to the route with an echo guard for trailing spaces. The matching helper normalises and splits the query inside every per-row call, so one keystroke costs a full normalisation pass plus one query parse per transaction.

See `proposal.md` for motivation and `specs/transaction-table/spec.md` for the required behaviour.

## Goals / Non-Goals

**Goals:**

- Separate the editable draft from the applied search, so results, filters, selection, and the URL change only on an explicit action.
- Remove the debounce and route-echo machinery that existed only to support live filtering.
- Make one applied search cost one query parse and cheap per-row substring checks over pre-normalised text.

**Non-Goals:**

- Server-side search, pagination, or changes to the read endpoint.
- Changing which fields or matching rules the search uses.
- Debouncing the draft or adding an "unapplied changes" indicator.

## Decisions

### D1: Draft and applied search are separate values

`searchText` remains the draft bound to the input. A new `appliedSearch` computed reads `q` from the route, trimmed; it is the single source of truth for `visibleTransactions`, paused filters, the summary, the empty state, and the selection watcher. An absent or blank `q` is an empty applied search.

This is the core of the change: no result-producing computed depends on `searchText`, so typing cannot trigger a filtering pass.

*Alternative:* keep one ref and only call the filter on submit. Rejected: a computed cannot be "paused" selectively, and a manually triggered filter would duplicate the derived state that the summary and empty state already read.

### D2: One form submission path for the button and Enter

Wrap the input and its buttons in a `<form @submit.prevent="applySearch">` with the Search control as `type="submit"`. The explicit button and the Enter key then share one handler, and no key listener is needed. The Search button is always present and labelled `Search`; the Clear control is `type="button"` and calls the clear path directly.

*Alternative:* a click handler plus a keydown check for Enter. Rejected: two paths that can drift, and a keydown listener has to ignore IME composition.

### D3: Apply and clear write the route immediately; the debounce disappears

`applySearch` trims the draft, writes it back to the field so the visible text matches what was applied, and calls `router.replace` with `q` set or removed, preserving category, period, and sort through the existing query helper. `clearSearch` runs the same path with empty text. No timer, no `lastWrittenSearchQuery`, and no trim-aware echo guard remain.

The route-to-draft watcher simply adopts `appliedSearch` whenever it changes, which covers initial load and back/forward navigation. A draft that has not been submitted is intentionally local to the page and is not restored on reload.

*Alternative:* keep the debounced write and treat the debounce as "auto-submit". Rejected: it still filters during typing and retains the complexity this change exists to remove.

### D4: Only an applied search pauses filters and clears selection

`searchActive` becomes `appliedSearch !== ''`. Both selects are disabled and described by the paused note only in that state. The selection watcher becomes `watch([categoryFilter, periodFilter, appliedSearch], ...)`, so applying or clearing a search clears the selection while typing a draft leaves it untouched.

While a draft is being typed over no applied search, the filters remain fully usable. While a draft is being typed over an applied search, the previous search and its paused filters remain in effect until the draft is applied; the Search button is the only commit point.

### D5: Pre-normalise each row once and parse the query once

The utility keeps `normalizeSearchText`, `searchTerms`, and `transactionSearchText`. It gains:

- `createTransactionSearchIndex(transactions)`, returning a `Map` of transaction id to normalised descriptive text;
- `matchesTransactionSearchTerms(text, terms)`, returning whether every already-normalised term occurs in an already-normalised haystack.

The page builds the index in a computed that depends only on `transactions`, so it is rebuilt after the initial read and each background refresh, not per keystroke. `visibleTransactions` parses `appliedSearch` into terms once and checks each row against the index.

*Alternative:* keep `matchesTransactionSearch` per row. Rejected: it normalises the query per row and would remain the dominant cost even after submission.

### D6: Clear stays available while a search is applied

The Clear control is shown when the draft is non-empty **or** an applied search is active. Without the second condition, deleting the draft text after applying would hide the only visible way to restore the filters, while the applied search stayed active and the filters stayed paused. The Search button remains the other route: submitting an empty field clears the applied search.

### D7: Layout and affordance

The existing filter region keeps the search first. The label stays "Search all transactions"; the input keeps `type="search"` and the current token-based focus and sizing. The Search button uses the primary `bg-ink text-surface` treatment already used for the category form's submit action, and Clear keeps the bordered secondary treatment. Both remain at least `min-h-11`. On small screens the input stays full width and the buttons sit beside it.

## Risks / Trade-offs

- **Users may type and expect results immediately** → The visible Search button and Enter support make the commit point explicit; no additional hint text is added.
- **A draft over an applied search can look like it is filtering** → Accepted for a first version; the results and paused note continue to describe the applied search until the button is pressed. An unapplied-changes indicator would add state for little benefit.
- **Unsubmitted drafts are lost on reload** → Intentional: the URL describes the applied view, not keystrokes.
- **Index rebuild after every background refresh** → One normalisation pass per refresh, off the keystroke path; acceptable and simpler than incremental invalidation.
- **Two clear paths (Clear and empty Search)** → Both call the same helper, and tests assert identical results.

## Migration Plan

No data, schema, or API migration. The page change ships with the frontend; rollback restores the previous live-search implementation without touching stored data.

## Open Questions

None.
