# Proposal

## Why

Every view change currently rebuilds the whole table. A filter, search, or sort restarts the presentation and keeps adding batches until every matching row is in the document, even when the reader never scrolls past the first screen. With 1,000 rows and 30 categories that is 48,081 DOM nodes and roughly half a second; with 4,000 rows it is 191,786 nodes and roughly 2.2 seconds. The table should build the rows the reader is looking at, and build the rest only as the reader approaches them.

## What Changes

- A view change still resets the table to its first batch, but no further batch is built automatically.
- The next batch is appended when the reader scrolls near the end of the rows already presented, and again as the reader keeps scrolling, until the last matching row is present.
- The first batch and the later batch sizes remain 50 and 250 rows, matching the existing presentation tuning.
- A post-assignment refresh still never resets the presented rows; it extends them only when the reader is near the end.
- Summary, count, select-all, and selection continue to describe the whole active view, not the presented prefix.
- No new control, paging, grouping, or route-query value is introduced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: the progressive-batch requirements change from "fill automatically until complete" to "fill as the reader scrolls". Which rows a view contains, the order, the summary, the count, and the selection contract do not change.

## Impact

- `app/pages/index.vue`: replace the frame-driven batch chain with a scroll-proximity trigger, keep the reset/generation handling, add the observation point after the table, and stop automatic extension during a data refresh.
- `tests/components/transactions.test.ts`: drive batches explicitly instead of waiting for automatic completion; cover reset, append, and end-of-view.
- `tests/browser/transaction-table-responsiveness.spec.ts`: assert the partial table stays partial without scrolling, then reaches every row after scrolling; replace the hidden-document completion test.
- No API, database, migration, or dependency change.
