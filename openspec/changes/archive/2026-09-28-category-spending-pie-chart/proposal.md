# Proposal

## Why

The application lets users inspect transactions and manage categories, but a single year-wide total does not show how category amounts vary from month to month. The analytics page will present a separate view for each of the last 12 calendar months.

## What Changes

- Present exactly 12 monthly pie charts on the analytics page: the current calendar month and the 11 preceding months, newest first.
- For each month, group transactions by category and sum their absolute amounts using booking date; include uncategorised transactions as their own slice.
- Use Apache ECharts through the Vue wrapper `vue-echarts` for the pie chart.
- Update the frontend-shell contract to allow the chart page's monthly category aggregation.

## Capabilities

### New Capabilities
- `category-spending-chart`: A menu-accessible set of 12 monthly pie charts of absolute transaction totals grouped by category.

### Modified Capabilities
- `frontend-shell`: Allow the chart page's scoped monthly aggregation of transaction data.
- `category-management-screen`: Extend the shared menu contract to include the chart page.

## Impact

- The existing `/analytics` route and shared menu link will present 12 monthly chart panels instead of one year-wide chart.
- The page will read the existing same-origin `GET /api/transactions` endpoint; no API response or database schema change is proposed.
- The existing ECharts and `vue-echarts` dependencies will render the monthly charts; no new dependency is proposed.
- Update monthly aggregation and chart tests; existing route and navigation behavior remains unchanged.
