# Proposal

## Why

The index route builds its whole table in one synchronous block: with 1,000 transactions and 30 categories the page is blank for roughly half a second, and around two seconds at 200 categories, because the row count is multiplied by the category options rendered in every row. The same block is rebuilt after every category assignment, so changing one transaction's category re-presents all 1,000 rows, and a selection change re-presents the whole table too. Measurement showed the cost is dominated by node count and layout, not by the page's own script, so it cannot be reduced without removing rows or controls from the table — which this change does not do.

## What Changes

- Present the rows of the active view in consecutive batches instead of one block, so the first rows appear while the rest are still being constructed. The final table still holds every row that matches the view, in the order the active sort defines.
- Abandon pending batches when the active view changes — a filter, a search, or a sort — and present the new view in its own batches, so the table never settles on a mixture of the old and new rows.
- Keep the summary, the transaction count, the select-all behaviour, and the row selection describing the whole active view from the first batch onward, not only the rows already presented.
- Re-present only the rows a category assignment actually changed when the post-assignment refresh arrives, leaving every other row in place, so an assignment no longer rebuilds the table.
- Compute the stored categories' option labels once rather than on every row's render. This changes no behaviour.

The total time to build the whole table is unchanged. This change targets when rows become readable and how much of the table is rebuilt afterwards, not the cost of the table itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: adds requirements for presenting rows in progressive batches, and for a changed view being presented from its own first batch.
- `manual-category-assignment`: sharpens the existing refresh requirement so that a refresh re-presents only the rows whose stored category changed.

## Impact

- `app/pages/index.vue` — the table's presentation. No change to the endpoint, the database schema, the route query, the columns, the filters, the search, the sort, or the per-row category control.
- Not changed: `GET /api/transactions`, every write endpoint, the category picker controls, the touch-target rules, and the columns and controls the table offers.
- Tests: the browser and component suites gain coverage for progressive presentation and for an assignment leaving untouched rows in place; no existing test is expected to change its assertions.
- Explicitly out of scope: windowing, pagination, grouping, replacing the per-row category select, and any change that reduces the number of rows or controls the table holds.
