# Proposal

## Why

The all-transactions search currently filters on every keystroke. Each key press walks the entire returned transaction set and normalises its descriptive text, so the field becomes sluggish as the dataset grows. Applying a search only when the user asks for it moves that work to one deliberate action and makes its cost predictable.

## What Changes

- Add a Search button beside the search field. Activating it, or pressing Enter in the field, applies the trimmed text. Typing alone changes no rows, summary, empty state, selection, paused-filter state, or route query.
- Keep the applied search in the index route's query as `q`. The field holds a draft that is not written to the route until the search is applied; Clear empties the draft and removes the applied search immediately.
- Pause the category and period filters only while an applied search is non-empty. A draft being edited over an empty or previous search does not disable them.
- Clear the row selection when a search is applied or cleared, not while the user is still typing.
- Precompute each transaction's normalised descriptive text once per loaded response and parse the applied query's terms once, instead of normalising every row and re-parsing the query on every keystroke.
- **BREAKING** (spec-level): change the search requirements so the field's text takes effect only through the explicit search action, and so the route query and selection follow applied searches rather than typed text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: replaces live search with an explicit Search action, keeps the applied query in the route, and makes the paused filters, summary, empty state, and selection follow only applied searches.

## Impact

- `app/pages/index.vue`: draft versus applied search state, submit and clear handling, form markup, route synchronisation without the debounce machinery, filter and selection dependencies.
- `app/utils/transaction-search.ts`: reusable normalised-text and term matching helpers so the page can build an index once per response.
- `tests/components/transactions.test.ts`, `tests/browser/transactions-search.spec.ts`, and `tests/unit/transaction-search.test.ts`: rewrite the as-you-type expectations to submit semantics and cover typing remaining inert.
- No API, database schema, migration, or dependency changes. `GET /api/transactions` continues to return the whole set and is still read once.
