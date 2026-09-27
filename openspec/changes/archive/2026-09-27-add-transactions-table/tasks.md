# Tasks

## 1. Confirm the data contract and prerequisite

- [x] 1.1 Confirm `add-transactions-read-endpoint` is implemented and `GET /api/transactions` answers with a JSON list; verified against `ta_read_scratch` (4 transactions): `curl http://127.0.0.1:3000/api/transactions` returned HTTP 200 with a JSON array.
- [x] 1.2 Confirm the field names and value shapes the page will bind to; verified by inspecting `server/api/transactions.get.ts` and the live response: keys are `id`, `bookingDate` (`YYYY-MM-DD` string), `valueDate` (`YYYY-MM-DD` string), `amount` (decimal string, e.g. `-33.61`), `purpose`, `counterpartyName`, `counterpartyAccount` (string or `null`), and `category` (`{ id, name }` or `null`).

## 2. Render the transactions table on the index route

- [x] 2.1 Replace the placeholder content of `app/pages/index.vue` with a `useFetch('/api/transactions')` call and a semantic `<table>`; verified the page source contains the fetch and a `<table>`, and the placeholder sentence is gone.
- [x] 2.2 Render exactly one row per returned transaction with one column for each of the seven elements (booking date, value date, amount, purpose, counterparty name, counterparty account, category); verified against four stored transactions that four rows render, each with all seven columns.
- [x] 2.3 Render the amount as the signed decimal string exactly as returned, with no `Number()`/`parseFloat()` coercion and no rounding or reformatting; verified the page shows `-33.61`, `-12.00`, `0.01`, and `250.00` verbatim, and a source search for numeric coercion found nothing.
- [x] 2.4 Render both dates as the strings returned, without constructing JavaScript `Date` objects, in separate columns; verified `2026-03-02`/`2026-03-01` render unchanged and distinctly, and a source search for `new Date` found nothing.
- [x] 2.5 Render an explicit gap (not an empty string, not a borrowed value, not an invented category) when the counterparty account is absent and when the transaction is uncategorised; verified each absent cell renders a visible dash with a screen-reader label, distinguishable from populated cells.
- [x] 2.6 Render rows in the order the endpoint returned them, with no client-side sorting or reordering; verified the rendered row order matches the endpoint's response order.
- [x] 2.7 Confirm the page offers no filter, search, sort, grouping, or pagination control and no control that writes, alters, or deletes anything; verified a source and rendered-HTML search found no `input`/`select`/`button`/`form` and no sort/filter logic.

## 3. Empty and error states

- [x] 3.1 Show a "no transactions" message when the endpoint returns an empty list, with no table rows and no invented transaction; verified against an empty table that the message renders and no row appears.
- [x] 3.2 Show a distinct "could not be loaded" message when the request fails (including a 404 while the endpoint is absent), not an empty transaction list; verified with the endpoint failing that the failure message renders instead of an empty table.

## 4. Integration verification

- [x] 4.1 Confirm the table is server-rendered: request the index route and confirm the rows are present in the delivered document without the browser running anything; verified the fetched HTML already contains the transaction rows.
- [x] 4.2 Confirm no new dependency, layout, or stylesheet was added; verified `package.json` dependencies remain `csv-parse` and `pg`, exactly one layout (`app/layouts/default.vue`) exists, and `app/assets/css/main.css` is the only stylesheet.
- [x] 4.3 Confirm the rest of the shell is unaffected; verified `/api/health` answers 200 with `{"status":"ok"}` and an unknown route returns a 404 failure page inside the default layout.
- [x] 4.4 Confirm the project still builds and the change validates; verified `npm run build` completes and `openspec validate "add-transactions-table" --strict` reports the change is valid.
