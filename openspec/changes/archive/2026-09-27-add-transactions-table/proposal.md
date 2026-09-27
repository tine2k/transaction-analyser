# Proposal

## Why

Transactions can be imported and, once `add-transactions-read-endpoint` lands, read back over `GET /api/transactions`, but the browser still shows nothing: the index route is placeholder text and the frontend shell forbids rendering stored data. The user needs to see what has been imported. This change makes the index route a table of every stored transaction.

## What Changes

- Replace the index route's placeholder text with a table that lists every transaction returned by `GET /api/transactions`.
- Render one row per transaction with a column for each piece of the transaction: booking date, value date, amount, purpose, counterparty name, counterparty account, and category. An absent counterparty account and an uncategorised transaction each read as an explicit gap rather than as an empty string or a made-up value.
- Present the amount as returned by the API — a decimal string carrying its sign — without reformatting it into a number that could lose precision. A negative amount and a positive amount are distinguishable from the rendered value alone.
- Read the transactions once when the page is loaded and render them as delivered by the API's order. The table does not reorder the rows.
- Show an empty state when the API returns no transactions, and an error state when the request fails, instead of an empty table that looks like "no data".
- Add no filtering, sorting, searching, or pagination controls, and no control that writes, alters, or deletes anything. The user asked for the table only.
- **BREAKING (spec-level)**: amend the `frontend-shell` requirements `The only route is the index route, and it holds placeholder text` and `The shell performs no domain work`. The index route becomes a real page that reads and presents stored data through the API; the prohibition on computing, deriving, aggregating, evaluating patterns, or writing stays exactly as it is.
- Add no new endpoint, no schema change, no migration, and no server-side change. The browser reads the existing read-only endpoint.

## Capabilities

### New Capabilities

- `transaction-table`: the frontend surface that lists every transaction from `GET /api/transactions` — its columns, how each value is presented (dates, signed amount, uncategorised category, absent account), the order it preserves, and its empty and error states; and its explicit exclusion of filtering and sorting.

### Modified Capabilities

- `frontend-shell`: the requirement `The only route is the index route, and it holds placeholder text` changes, because the index route now renders the transactions table rather than placeholder text. The requirement `The shell performs no domain work` changes, because the shell now reads stored data through the API; its prohibitions on deriving values, evaluating category patterns, and writing are restated unchanged.

## Impact

- **Changed file**: `app/pages/index.vue`, which stops being placeholder text and becomes the table.
- **New dependency relationship**: the browser calls `GET /api/transactions`, planned by `add-transactions-read-endpoint`. That change must be implemented first; this change adds only the frontend surface and assumes the endpoint's response shape (a JSON list of transactions with a decimal-string amount and an optional category object).
- **No new dependency installed**: the table is plain markup styled by the one existing stylesheet; no component library, grid, or datatable package is added.
- **No new route, layout, endpoint, schema, or migration.**
- **Compatibility**: the index route previously carried placeholder text and issued no data request. A consumer relying on "the index route shows no stored data" is affected, which is why the `frontend-shell` requirements are amended in place rather than left beside a contradicting page.
- **Deferred to later changes**: filtering, sorting, pagination, row selection, totals or other aggregation, category assignment, and design tokens or a component convention for reusable table pieces. Recorded in design.md.
