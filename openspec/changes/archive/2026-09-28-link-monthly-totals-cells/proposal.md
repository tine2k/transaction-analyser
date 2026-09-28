# Proposal

## Why

The monthly totals table shows how much was spent per category and month, but a reader who wants to see the transactions behind a number has to note the month and category and rebuild the filter on the transactions screen by hand. Turning each populated cell into a link removes that manual step and makes the table a natural entry point into the underlying transactions.

## What Changes

- Make each non-blank monthly totals cell a link to the transactions screen (`/`) that carries the cell's month and category as query values.
- Reuse the existing index-route filter query contract (`month=YYYY-MM`, `category=<identity>|uncategorised`) already produced by the analytics screen, so the linked transactions screen initializes with both filters and shows exactly that month and category.
- Add a hover affordance to the linked cells so the whole cell reads as clickable.
- Leave blank zero-total cells non-interactive and without the hover affordance, since they point at an empty result.
- Change no data fetching, endpoint, or stored data; the table continues to use the single existing read request.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monthly-category-totals-table`: The category-by-month cells become links to the transactions screen for their month and category, with a hover affordance on the linked (nonzero) cells; blank cells stay non-interactive.

## Impact

- Change `app/pages/monthly-totals.vue` only.
- Reuse the query-value mapping and link target already used by `app/pages/analytics.vue`; no API, database, or dependency change.
- Extend the monthly totals component tests; run the unit and component suites.
