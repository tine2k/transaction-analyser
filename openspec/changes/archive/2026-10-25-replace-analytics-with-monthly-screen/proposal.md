# Proposal

## Why

The design folder contains a `Monthly – Desktop` artboard for a focused, single-month breakdown: one month at a time, a headline figure, a top-category share bar, and a category table. The current Analytics screen is the opposite shape: twelve pie-chart panels plus a years view. It shows the same information diffused across a wall of charts, cannot answer "what happened in this month" directly, and carries a charting dependency the design no longer needs.

Replacing the Analytics screen with the Monthly screen gives the product one readable month-level overview and retires the pie-chart presentation before the Yearly screen arrives.

## What Changes

- **BREAKING**: the `/analytics` route becomes `/monthly`, and `/analytics` redirects there. The menu label changes from `Analytics` to `Monthly`, and the document title becomes `Monthly · Expenses`.
- Replace the twelve monthly pie panels and the years view with a single selected month. A year selector and twelve month pills choose the month; the selection is carried in the route query as `month=YYYY-MM`.
- Default the selected month to the current calendar month when it has a returned transaction, otherwise to the newest month that does, otherwise the current month.
- Present two summary cards: `Total moved`, the exact sum of absolute amounts for the selected month, and `Transactions`, the count of included transactions.
- Present a stacked bar of the eight largest categories plus an aggregated `Other N` segment, and a table listing every category with its share of the largest category, transaction count, and exact absolute amount.
- Keep the page-wide person, expense-type, and hide-uncategorised controls, and remove the months/years view switch. The hide control scopes the whole screen.
- Exclude hidden-category transactions from every figure, and include uncategorised transactions by default.
- Keep absolute-sum arithmetic for every figure. The design's Income and Net cards are deliberately not implemented because absolute sums cannot support them honestly; the remaining labels say `Total moved` and `Category totals`, not `Spending`.
- Link each category table row to the transactions screen with the selected month, category, and person.
- Remove the pie chart component and the `echarts` / `vue-echarts` dependencies, which no screen uses after this change.
- Keep the single same-origin `GET /api/transactions` read and make no stored-data changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-spending-chart`: repurposed from twelve monthly pie charts and a years view to one selected month's category overview at `/monthly`. The pie-chart, years-view, and twelve-panel requirements are removed; the month selection, summary figures, top-eight bar, category table, row links, retained filters, and single-read behaviour are added.
- `frontend-shell`: the browser route inventory, document title, menu label, and allowed transaction-derived values change from Analytics and twelve monthly totals to Monthly and one selected month's totals, counts, and top-eight grouping.
- `responsive-frontend`: the analytics-panel and chart reflow clauses become Monthly summary, month-pill, bar, and table clauses, and the Monthly category table joins the tables that scroll within their own region.

## Impact

- **Frontend**: `app/pages/analytics.vue` becomes `app/pages/monthly.vue` with an `/analytics` redirect; `app/layouts/default.vue` changes its label, route, and title; `app/utils/category-spending.ts` gains month selection, absolute totals, transaction counts, and top-eight grouping and loses the chart-only helpers that no other screen uses.
- **Components and dependencies**: `app/components/CategoryPieChart.vue` and its test are removed, together with `echarts`, `vue-echarts`, and the `vue-echarts/style.css` import. The pnpm install must keep both darwin and linux arm64 native packages present.
- **Tests**: `tests/components/analytics.test.ts` is replaced by Monthly component tests; `tests/components/category-pie-chart.test.ts` is removed; the expense-type browser test, responsive route table and analytics assertions, document-title list, and layout navigation test are updated; unit tests cover the new-month arithmetic and grouping.
- **Specs**: `category-spending-chart`, `frontend-shell`, and `responsive-frontend` each receive a delta. `monthly-category-totals-table`, `monthly-category-average`, `transaction-table`, and `euro-value-display` keep their behaviour; the new row links use the transaction screen's existing `month`, `category`, and `person` query contract.
- **No API, database, schema, or configuration changes.**
