# Proposal

## Why

The Monthly average page currently shows categories in fixed alphabetical order, so users cannot quickly identify the largest average amounts or compare results in the order most useful to them. Sorting by a chosen column and direction makes this comparison more direct, with the highest averages visible first by default.

## What Changes

- Add sort controls for the category and average-amount columns, each supporting ascending and descending order.
- Default the monthly average results to average amount descending.
- Reorder the already-calculated results locally without changing the averaging window or making another data request.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monthly-category-average`: Define sortable category and average-amount ordering, including the default amount-descending order.

## Impact

- Affects the `/monthly-average` page and its component tests.
- No API, stored data, or dependency changes are expected.
