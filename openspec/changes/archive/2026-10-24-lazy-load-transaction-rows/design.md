# Design

## Context

See `proposal.md` — Why. The index route currently renders `sortedVisibleTransactions.slice(0, presented)` and advances `presented` on consecutive animation frames until the whole view is built (`app/pages/index.vue`, the `scheduleBatch`/`runBatch`/`restartPresentation` block). Batches are 50 rows first, then 250. Sum, count, select-all, and selection already derive from `visibleTransactions`, not from the presented prefix.

The archived `improve-transaction-table-responsiveness` design measured the cost this change moves: at 1,000 rows and 30 categories the full table is 48,081 DOM nodes and about 0.5 s to present; at 4,000 rows it is 191,786 nodes and about 2.2 s. A sort re-presentation costs 300–470 ms at 1,000 rows. Cost tracks DOM nodes, which is rows x (categories + 18), because every row carries a category select with one option per stored category.

Constraints that shape the approach:

- `transaction-table` forbids paging and grouping controls, so the trigger cannot be a "load more" button.
- `manual-category-assignment` requires the per-row category select and its full option list, so rows cannot be simplified to make each batch cheaper.
- The page is client-rendered, so there is no server-render path.
- Vertical scrolling belongs to the page; the table region scrolls horizontally only. Any proximity measurement must use the viewport.

## Goals / Non-Goals

**Goals:**

- A view change builds only its first batch, no matter how many rows match.
- Further batches are built only when the reader approaches them.
- The reader can still reach every matching row, and the summary, count, select-all, and selection keep describing the whole view.
- Assignment-driven refreshes never blank or rebuild an already presented table.

**Non-Goals:**

- Reducing the total cost of scrolling through an entire view.
- Windowing, fixed row heights, pagination, or a server-side read API change.
- Changing columns, filters, search, sorting, route query, or category controls.
- Adding a visible "more rows" indicator or a load-more control; that is a separate change.

## Decisions

### D1 — Trigger on reader proximity, not on a frame chain

Keep the growing prefix and replace the automatic frame chain with a trigger. An observation element sits directly after the table. When it comes within one viewport height of the visible area, append the next batch. After appending, re-check once on the next frame, because an intersection observer reports threshold crossings rather than continuous state: a batch shorter than the remaining viewport would otherwise leave the sentinel visible without another callback.

Use `IntersectionObserver` with a bottom `rootMargin` when it is available. When the browser does not provide it, present the remaining rows eagerly, which preserves the current behavior rather than risking an unreachable tail.

Alternatives rejected:

- **Window scroll listener plus `getBoundingClientRect`** — workable, but duplicates what the observer does and needs extra handling for resize and layout shifts caused by appended rows.
- **A load-more button** — `transaction-table` forbids paging controls.
- **Keeping the frame chain but pausing it** — still needs a resume signal, and a paused chain is harder to reason about than a trigger.

### D2 — Batch sizes stay at 50 first, 250 later

The first batch is sized to exceed a viewport at the project's 44 CSS-pixel minimum row height, so the table is scrollable as soon as it appears. The archived measurement puts a row at roughly 0.2 ms at 1,000 rows and 30 categories, so a 250-row batch is about 50 ms of construction. That is a visible but bounded hitch while scrolling, and larger batches keep the number of layout passes down. These constants remain tuning values; the browser test can measure them.

### D3 — Every view change resets to its own first batch

The category filter, period filter, applied search, active sort, and the first successful load all reset the presented count to the first batch. The existing generation counter stays: an append scheduled for a superseded view is discarded, and a reset also cancels the pending proximity check. This is unchanged in principle from the previous design; only the thing that advances the count changes.

### D4 — A data refresh extends only on proximity

A post-assignment refresh replaces the transaction data but does not reset the presented count and does not automatically append rows the response introduced. It re-arms the proximity check instead, so a reader already at the end sees the new rows and a reader at the start keeps the current DOM. This preserves the in-place refresh guarantee of `manual-category-assignment`.

### D5 — The observation element is not part of the table

Place the observation element after the table's horizontal scroll region, outside the semantic table. It is not a row, column, control, or value, so the table's structure contract is untouched, and it cannot be counted as a transaction row or announced to assistive technology.

### D6 — Whole-view derivations stay whole-view

`visibleTransactions` remains the source for the sum, count, select-all state, and selection, exactly as before. Only the rendered slice changes.

### D7 — No new visible affordance

The change adds no status text, button, or route value. The sum and count already describe the whole view from the first batch, which `transaction-table` requires, and the browser scrollbar grows as batches append. A "showing X of Y / scroll for more" line would improve discoverability of the remaining rows, but it is new observable behavior and is left to a separate change.

## Risks / Trade-offs

- **A partial table can look complete** → The scrollbar grows as batches append, and the count and sum state the whole view. Explicit "more rows" wording is deliberately out of scope (D7).
- **Find-in-page and screen-reader browsing see only presented rows** → This follows from not building the tail. `transaction-table` now scopes completeness to scrolling to the end. It is the price of not windowing and not eagerly building the tail.
- **A view change while the page is scrolled deep leaves the viewport below the new first batch** → The page scroll height shrinks and the browser clamps it; the next proximity check then appends until the viewport is filled. Filter, search, and sort controls sit above the table, so ordinary use changes the view from the top.
- **One batch is a visible hitch while scrolling** → Batches are 250 rows by measurement; the browser test records row counts across a full scroll so the value can be tuned.
- **A browser without `IntersectionObserver` falls back to building the whole view** → Correct but not faster. Mainstream browsers targeted by `responsive-frontend` support the API.
- **The observation element is vendor-specific test surface** → Component tests replace the observer with a controllable stub, since happy-dom's implementation is a no-op.

## Migration Plan

No data, schema, or API change. Deploy the page and test changes together; rollback restores the frame-driven fill with no stored state involved.

## Open Questions

- Whether the 250-row scroll batch needs reducing for the target hardware. This is a constant, so it can be settled from the browser test without changing the approach.
