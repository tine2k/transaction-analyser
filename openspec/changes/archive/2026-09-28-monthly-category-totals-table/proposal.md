# Proposal

## Why

The existing analytics screen shows category totals as separate monthly pie charts, which makes it difficult to compare several categories across months at once. A category-by-month table will provide a compact, directly comparable view of the same recent transaction data.

## What Changes

- Add a menu-accessible “Monthly totals” screen with categories as columns and every booking month represented in the returned transaction history as a row, newest first.
- Show each nonzero cell's exact absolute euro sum for transactions booked in that month and category, with uncategorised transactions represented separately; keep zero-total cells blank and aligned in the table.
- Keep the existing pie-chart analytics screen and its behavior unchanged.

## Capabilities

### New Capabilities
- `monthly-category-totals-table`: A read-only table of absolute transaction totals by category and month.

### Modified Capabilities
- `category-management-screen`: Extend the shared menu to include the monthly totals screen.
- `frontend-shell`: Add the table route and allow its scoped monthly category aggregation.

## Impact

- Add a browser route and menu link; the table will use the existing same-origin `GET /api/transactions` endpoint and require no API or database changes.
- Extend monthly aggregation and frontend component tests; no new dependency is expected.
