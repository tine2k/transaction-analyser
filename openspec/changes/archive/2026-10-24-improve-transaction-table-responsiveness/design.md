# Design

## Context

See proposal.md — Why.

The current index route builds the whole table in one synchronous render: `sortedVisibleTransactions` is rendered by a single `v-for`, and every row carries the full category `<select>` with one `<option>` per stored category. Measured against the built application in headless Chromium with a 1,000-transaction fixture:

| view | DOM nodes | row appears | fully presented |
|---|---|---|---|
| 1,000 rows, 30 categories | 48,081 | 90–200 ms | ~0.5 s |
| 1,000 rows, 200 categories | 218,256 | — | ~2.1 s |
| 4,000 rows, 30 categories | 191,786 | — | ~2.2 s |

Phase split at 1,000 rows and 30 categories: script 4–40 ms, style ~105 ms, layout ~200 ms. The cost tracks DOM node count, which is `rows x (categories + 18)`.

Measured interaction costs at the same size: reordering the rows for a sort 300–470 ms; re-presenting the whole table after a selection change ~126 ms. Every assignment refresh replaces the whole transaction array, so every row receives a new object identity and is re-patched.

Constraints that shape the approach:

- `transaction-table` requires one row per matching transaction and forbids paging and grouping controls, so rows cannot be dropped from the document at rest.
- `responsive-frontend` requires the existing semantic table structure and every row and cell to be preserved, and requires 44 CSS pixel hit areas.
- `manual-category-assignment` requires the control to be a select whose choices are the stored categories, so the option list cannot be reduced or replaced.
- The page is client-rendered (`ssr: false`), so there is no server-render path to split the work across.

## Goals / Non-Goals

**Goals:**

- Make the first rows readable within the first frame or two after the transaction data arrives, instead of after the whole table is built.
- Make an assignment refresh cost proportional to the rows it changed, not to the size of the table.
- Keep every existing guarantee intact: every matching row eventually present, in the active order, with the summary, count, and selection describing the whole view at every moment.

**Non-Goals:**

- Reducing the total time to build the table. The measured cost is DOM nodes and layout; this change does not remove any.
- Any change to the columns, the per-row controls, the filters, the search, the sort, or the route query.
- Windowing, pagination, grouping, or a shared category picker.

## Decisions

### D1 — Present the view as a growing prefix, not a window

Render `sortedVisibleTransactions.slice(0, presented)` where `presented` starts small and grows. Rows already presented are never unmounted until the view itself changes.

Alternatives rejected:

- **Virtual windowing with spacer rows** — removes rows from the document, which `transaction-table` and `responsive-frontend` both forbid without a spec change, and breaks find-in-page and screen-reader completeness at rest.
- **Pagination or a load-more control** — forbidden by `transaction-table`.
- **`content-visibility: auto` on rows** — containment does not apply to internal table elements, so the browser ignores it on `<tr>`.

### D2 — Advance batches on animation frames

Each batch is built in a `requestAnimationFrame` callback, so the previous batch has been painted before the next is constructed. Alternatives rejected:

- **`setTimeout(0)`** — keeps building while the compositor is still busy, so several batches can queue behind one paint and the first rows appear no earlier.
- **`requestIdleCallback`** — not available in Safari, which the responsive requirements cover.

When `document.visibilityState` is `hidden`, animation frames stop, so the fill would stall in a background tab. A `setTimeout` fallback advances the fill while hidden; the next visible frame paints the result.

### D3 — Batches are counted in rows: first batch small, later batches larger

The first batch is 50 rows and each later batch is 250. At 1,000 rows and 30 categories the measured cost is roughly 0.2 ms per row, so the first batch lands inside a frame and the tail costs about four more frames. The asymmetry is deliberate: a small first batch is what makes the table appear quickly, and a large later batch keeps the number of yield points — and therefore the number of layout passes — down.

These are constants chosen against the measurement above, not derived values. They are expected to be tuned after a run on the target hardware.

### D4 — A view change restarts the fill; a data refresh does not

The presented count is reset by a change of **view** — the category filter, the period filter, the applied search, or the active sort — and by nothing else. A generation counter increments on each reset, and a pending frame callback whose generation no longer matches abandons its batch, so a filter change mid-fill cannot append rows from the previous view.

A post-assignment refresh does not reset the count. The table is already fully presented at that point, and resetting would blank it. If a refresh returns a longer view than the presented count, the remaining rows are presented in one further batch.

### D5 — Reconcile by identity before memoising

`v-memo` compares its dependency array by identity, and the array includes the transaction object. Today every refresh assigns a brand-new array of brand-new objects, so every row would be dirty and `v-memo` would save nothing. The refresh therefore maps the response onto the previous rows, reusing the previous object whenever every displayed field is equal, and only replacing the rows that actually differ.

Measured value: at 1,000 rows and 30 categories a full re-presentation is ~126 ms, and an assignment currently triggers exactly that. After D5 only the written rows are re-presented.

Alternative deferred: a child component per row isolates reactivity more completely than `v-memo`, because a marker or selection change currently invalidates the page's own render effect. `v-memo` is the smaller change; the component is the fallback if per-row isolation proves insufficient.

### D6 — Summaries and selection stay derived from the whole view

`visibleTransactions` remains the source for the sum, the count, the select-all state, and the selection, and only the rendered list is sliced. Nothing may be derived from the presented prefix, or the summary would grow as the fill proceeds and select-all would cover only the rows already on screen.

### D7 — Compute each category's option label once

Every option currently evaluates its hidden-name suffix inside the row's render, which is `rows x categories` template evaluations per presentation. The label is computed once per stored category when the category list changes. This changes no behaviour.

## Risks / Trade-offs

- **The table is briefly partial while filling** → At the measured speed the fill completes within a handful of frames for ordinary sizes; every row is present when it ends, and `transaction-table` only ever requires the finished table to be complete.
- **A missed `v-memo` dependency leaves a stale row** → The dependency list is enumerated from everything the row renders: the transaction object, its category identity and name, the manual marker, the in-flight state, the selection state, and the updating marker. A component test assigns a category and asserts the affected row changes, and a browser test asserts an untouched row's DOM is not replaced.
- **A view change mid-fill settles on a mixed table** → The generation counter discards superseded batches; a browser test changes the filter while the fill is running.
- **A hidden tab stalls the fill** → The `setTimeout` fallback in D2.
- **Sorting is still a full reorder** → Not addressed here; it is unchanged from today and is a separate concern from presentation.
- **Nothing gets faster in total** → Accepted deliberately. At 1,000 rows and 30 categories the table already completes in about half a second; the gain is that the screen stops being blank and that edits stop rebuilding it. If a large category count makes the fill itself slow, only reducing the node count would help, and that is out of scope.

## Migration Plan

No data, schema, or API change, so there is nothing to migrate.

- Deploy: the change is confined to the index route and its tests.
- Rollback: revert the page; no stored state depends on the presentation.

## Open Questions

- Whether the batch sizes in D3 need adjusting for the target hardware, which can be settled by the browser test's timing rather than by a design decision.
- Whether a row component per row is needed to isolate marker and selection updates, which only matters if `v-memo` proves insufficient in practice.
