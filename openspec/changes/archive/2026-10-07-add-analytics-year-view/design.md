# Design

## Context

See `proposal.md` for motivation. The analytics page (`app/pages/analytics.vue`) computes twelve monthly category charts with helpers in `app/utils/category-spending.ts`; the transactions page (`app/pages/index.vue`) filters returned transactions with a category select and a month select whose options combine data months with the last twelve calendar months. Both pages read `GET /api/transactions` once and filter in the browser. There is no year-level aggregation or year filter anywhere today.

The requested year panels link into the transactions screen, which cannot filter by year, so this change also replaces the transactions month select with a single combined period select, as confirmed with the user.

## Goals / Non-Goals

**Goals:**

- Add a months/years switch to the analytics page without changing the existing months view.
- Present one year panel per calendar year with eligible data, summing absolute category totals across the year.
- Link year panels to matching transactions through a combined period filter on the transactions screen.
- Keep the single read-only `GET /api/transactions` request and exact decimal arithmetic for every view.

**Non-Goals:**

- No server-side or API changes; filtering and aggregation stay client-side.
- No year-by-category table, year averages, or year column in existing monthly views.
- No persistence of the analytics view selection in the URL or storage.
- No month/year range pickers, custom periods, or date-range filters.

## Decisions

### Analytics view switch is local state with a two-option control

Add a control (radio group labelled `Months` / `Years`) above the charts; `Months` is the default. The selection lives in component state, not the route query, because no requirement needs the view to be deep-linked and adding a query parameter would expand the analytics route contract. `hideUncategorised` stays shared across views, and the page description text reflects the selected view.

Alternative considered: a `view=years` query parameter. Rejected as unnecessary scope; the analytics route currently has no query contract.

### Year aggregation is derived from eligible transactions, not a fixed window

Add a `groupTransactionsByAvailableYear` helper that mirrors `groupTransactionsByAvailableMonth`: it filters out hidden-category transactions first, buckets the rest by `bookingDate` year, and returns year groups ordered newest to oldest with `key`/`label` of the year and calendar-year bounds (`YYYY-01-01` to `YYYY-12-31`). A `getYearlyCategorySpendingTotals` / `createYearlyCategoryChartData` pair reuses the existing `getCategorySpendingTotals` and `createCategoryPieData` internals so the year panels share the months view's sorting, labels, locale formatting, and pie construction. No rolling limit and no empty years are included.

Alternative considered: reuse the monthly helpers by renaming them to period-neutral names. Rejected to avoid churn in the monthly views and their tests; the year helpers are thin and keep the existing monthly names meaningful.

### Color map covers both views

The analytics page computes one category color map from the union of category keys in the monthly and yearly charts, so a category keeps its color within each view and when switching views. `createCategoryColorMap` already sorts keys deterministically, so the map is stable for a given data set.

Alternative considered: one map per view. Rejected because switching views could recolor categories.

### Transactions filter becomes a single period select

Replace the month select with a period select labelled `Period` (`data-testid="period-filter"`). Options are built from the returned transactions:

1. `All periods` (default).
2. For each calendar year represented by at least one returned transaction, newest first: that year's represented months, newest first (`May 2026`), then the year choice (`2026 (year)`).

The option value is `all`, `YYYY-MM`, or `YYYY`. This drops the current last-twelve-months padding: only months with returned transactions are offered. The change is deliberate and recorded in the proposal as breaking for the option list.

Filtering applies the existing category restriction plus the period restriction: `all` matches everything, a month matches `bookingDate.slice(0, 7)`, a year matches `bookingDate.slice(0, 4)`. Row order, counts, the default uncategorised category, and the single fetch are unchanged.

Alternative considered: separate Year and Month selects. Rejected by the user in favour of one combined control, which also removes contradictory year/month states.

### Period query contract keeps `month` and adds `year`

The setter writes exactly one of `month=YYYY-MM` or `year=YYYY`, deleting the other; `All periods` deletes both. On load, a valid `month` that is an offered option wins; otherwise a valid `year` that is an offered option; otherwise `all`. This preserves existing month links (monthly analytics panels, monthly totals cells) and lets year panels link with `year=YYYY`. Unknown values fall back to `all periods`, matching the current fallback behaviour.

Alternative considered: a single `period=YYYY-MM|YYYY` parameter. Rejected because it would break existing month links and the monthly totals table's query contract.

## Risks / Trade-offs

- [Existing month options lose empty months] → The specs make the data-driven option list explicit, and component tests are updated to assert it; users can still reach empty periods only when data exists.
- [Year panels with many categories can crowd pie labels] → The months view already uses `labelLayout: { hideOverlap: false }` and visible labels; year panels reuse the same chart component and layout.
- [Union color map can change month-view colors for existing users] → Colors are arbitrary and the spec only requires consistency; tests assert consistency, not specific palette entries.
- [Period filter query values can contradict each other if hand-crafted] → The month wins when both are present, and invalid values fall back to all periods; both rules are specified and tested.

## Migration Plan

No data or API migration. Deploy the updated front end; existing `?month=YYYY-MM` links keep working, and the analytics months view remains the default. Rollback is redeploying the previous front end.

## Open Questions

None.
