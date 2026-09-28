# Proposal

## Why

The existing Analytics and Monthly totals screens show category spending month by month, so comparing categories at a glance requires reading across many cells or charts. A single per-category monthly average gives a compact, directly comparable summary of recent spending and makes it easy to see which categories cost the most on a typical month.

## What Changes

- Add a menu-accessible "Monthly average" screen that lists every category represented in recent transactions with its average monthly absolute spend over a rolling window, newest month last.
- Make the averaging window configurable on the page, defaulting to 12 months, and let the user change the number of months without a new data request.
- Divide the window's absolute totals by the configured number of months, so a month with no transactions counts as zero, and show exact locale-formatted EUR values rounded to the cent.
- Keep the existing Analytics, Monthly totals, Transactions, and Categories screens unchanged.

## Capabilities

### New Capabilities
- `monthly-category-average`: A read-only page listing each category's average monthly absolute spend over a configurable recent window.

### Modified Capabilities
- `category-management-screen`: Extend the shared menu bar to include the monthly average screen.
- `frontend-shell`: Add the monthly average route and allow its scoped per-category averaging of returned transactions.

## Impact

- Add a browser route, menu link, and page; the page uses the existing same-origin `GET /api/transactions` endpoint and requires no API, database, or dependency changes.
- Extend the monthly aggregation utility and its unit tests, plus component and layout tests.
