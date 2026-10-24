# Proposal

## Why

Finding a particular transaction currently means guessing which period and category it falls into and scanning the resulting rows. The table already loads every transaction, so a text field can answer "where is this payment?" directly instead of making the user narrow the view first with controls that default to the current year and uncategorised.

## What Changes

- Add a "Search all transactions" text field to the transactions tab. It matches purpose, counterparty name, and counterparty account with case- and diacritic-insensitive text; whitespace-separated terms must all match somewhere in the row's combined descriptive text.
- A non-empty search covers every transaction returned by the read endpoint. It overrides the category and period filters for row selection while leaving their stored values untouched: both selects render disabled with a visible note that filters are paused, and clearing the search restores the previous filtered view exactly.
- Results honour the active sort; the visible sum and count cover only the search matches; row selection clears whenever the query changes.
- Distinct empty states: no transactions at all, no search matches, and no rows from the filters.
- Persist the trimmed search text in the index route's query as `q`, omit it when empty, and restore it on load. Typing filters immediately; the URL write is debounced.
- **BREAKING** (spec-level): remove the existing `transaction-table` clause that forbids search controls, qualify the "selected filters limit the rows" requirement so it applies when the search is empty, and add a search requirement.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: adds an all-transactions search field with filter precedence and paused-filter presentation, and removes the prohibition on search controls.

## Impact

- `app/pages/index.vue`: search input, query state and route synchronisation, filter precedence, disabled filter controls, empty state.
- `tests/components/transactions.test.ts` and `tests/browser/`: search filtering, matching rules, precedence, clearing, URL persistence, summary and selection behaviour.
- No API, database schema, migration, or dependency changes. `GET /api/transactions` continues to return the whole set and takes no search parameter.
