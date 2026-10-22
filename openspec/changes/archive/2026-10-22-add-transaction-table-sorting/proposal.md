# Proposal

## Why

The transactions table currently shows rows only in the read endpoint's fixed order (booking date descending, then identity descending). Finding the largest amount, a particular counterparty, or a category by eye means scanning the whole visible list. Letting users sort by clicking a column header, with the sort carried in the URL, makes the table directly answer those questions and lets a sorted view be bookmarked or shared.

## What Changes

- Make every value column header — booking date, value date, amount, purpose, counterparty, account, and category — an interactive sort control.
- First activation of a header sorts ascending; activating the same header again sorts descending. The active column and direction are exposed to assistive technology.
- Sort the rows that remain after the category and period filters, using the values exactly as the endpoint returned them. Sorting changes no stored data, makes no additional data request, and leaves the sum and count of visible transactions unchanged.
- Reflect the active sort in the index route's query as a column and direction, so a sorted table can be linked to directly. A supplied sort initializes the table; unknown or unsupported values fall back to the endpoint's order.
- Keep the endpoint's order when the route carries no sort, and keep filters independent of the sort: changing either filter preserves the active sort.
- **BREAKING** (spec-level): revise the existing `transaction-table` requirement that rows must always appear in the endpoint's order, and the clause that forbids sorting controls, so sorting is an allowed presentation order when selected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: adds column-header sorting with URL persistence, and changes the row-order requirement from "always endpoint order" to "endpoint order unless a sort is active"; removes sorting from the list of forbidden table controls.

## Impact

- `app/pages/index.vue`: header controls, sort state derived from the route query, sorted visible rows, query updates.
- `tests/components/transactions.test.ts`: sorting interaction, URL initialization and updates, filter interaction, null handling.
- `tests/browser/`: a browser check that sorting works in the rendered table and survives a reload via the URL.
- No API, database schema, migration, or dependency changes; `GET /api/transactions` and its ordering remain unchanged.
