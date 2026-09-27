# Proposal

## Why

The transactions table currently requires showing every row and provides no filter, so users cannot focus on transactions that still need categorisation. A clear uncategorised filter with counts for all transactions and the uncategorised subset makes the review workload visible while preserving access to the full list.

## What Changes

- Add a transactions-page filter that switches between all transactions and only transactions without a category.
- Label both choices with their transaction counts: the full total and the uncategorised subset.
- Update the table and frontend-shell behavior contracts to allow this read-only filtering and count display without changing the API or stored data.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-table`: replace the no-filter requirement with behavior for selecting all or uncategorised transactions and showing counts for both choices.
- `frontend-shell`: permit the transaction page to derive these two counts from the one transactions response while retaining its read-only, same-origin data access.

## Impact

- Affects the transactions index page in `app/pages/index.vue`.
- Uses the existing `GET /api/transactions` response; no API or database changes are expected.
- Adds no dependencies and does not change transaction or category data.
