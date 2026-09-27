# Proposal

## Why

Users reviewing transactions need to focus first on transactions that still need categorisation. The existing filter supports this view, but opens on all transactions, requiring an extra selection every time the page is loaded.

## What Changes

- Select the uncategorised-only view by default when the transactions page loads.
- Keep the all-transactions option available, with existing counts, filtering behavior, and empty states unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: change the initial filter selection from all transactions to uncategorised-only.

## Impact

- Affects the default filter state in `app/pages/index.vue` and its transaction-table behavior contract.
- No API, database, or dependency changes. The default applies on each page load; this change does not add saved filter preferences.
