# Design

## Context

See `proposal.md` for the motivation and scope. The application is Nuxt 4 with Vue 3 and client-side rendering (`ssr: false`). Its shared layout owns the menu; transactions are read through `GET /api/transactions`, which returns every row with an ISO booking date, an exact signed decimal amount string, and either a category reference or `null`. Amounts are denominated in EUR. The current implementation already uses ECharts through `vue-echarts` and renders one year-wide pie on `/analytics`; this revision changes it to twelve month-specific pies. Component tests use Nuxt test utilities and Vitest in a simulated DOM.

## Goals / Non-Goals

**Goals:**
- Retain the existing `/analytics` route and menu entry while changing the chart presentation.
- Reuse the transaction read API and produce one set of per-category totals for each of twelve calendar months.
- Keep displayed totals exact and make the values available alongside the pie visualization.
- Keep the chart page read-only and usable in the existing client-rendered application.

**Non-Goals:**
- Add server aggregation, a new API endpoint, a database migration, or category editing behavior.
- Add date-range controls, continuous time-series charts, filtering controls, or multiple chart types.
- Add a general component library or replace the existing page styling system.

## Decisions

1. **Reuse the existing Apache ECharts and `vue-echarts` integration.** The application already renders its year-wide pie through this Vue wrapper, so the monthly charts require no new chart dependency or integration pattern. Reuse the existing pie component and provide separate monthly datasets and labels.

2. **Read through the existing transaction endpoint and aggregate into calendar-month buckets.** The endpoint already returns the full transaction set, booking dates, exact amount strings, and category names. A new endpoint or database query would expand the change without adding data the browser does not already receive. Use the current calendar month and the eleven preceding months, ordered newest first. Include booking dates from the first day of the oldest month through today, inclusive; assign each transaction to exactly one calendar-month bucket and group it by category or `Uncategorised` when category is null.

3. **Sum absolute amounts using decimal-safe arithmetic within each month.** The API intentionally returns amounts as decimal strings to retain precision. Convert each amount to its absolute decimal value and sum by category without binary floating-point arithmetic for the displayed totals. Format each month's exact totals as EUR in that chart's legend. Convert totals to the numeric representation required for pie geometry only after aggregation; the visualization must not be the source of the displayed monetary values.

4. **Keep one chart panel for each month, including empty months.** Render exactly twelve month-labelled panels and pie charts. A month with no eligible transactions keeps its chart panel with no slices and a month-specific empty-state message; do not invent zero-value slices. Render a visible category/amount legend for each non-empty month so values remain inspectable outside the slice geometry.

5. **Keep tests at the existing component level for page behavior.** Mock `useFetch` to cover the twelve month buckets, month boundaries, separate per-month aggregation, uncategorised transactions, exact totals, empty months, request errors/loading, and menu routing. Test arithmetic/date-boundary logic independently where it is factored into a utility. The project currently has no browser E2E suite, so this change does not introduce a new browser-testing framework.

## Risks / Trade-offs

- [The existing endpoint returns all transaction history, so page load cost grows with the database] → Reuse it for this change and document a bounded, read-only aggregate endpoint as a future option if real transaction volume makes client filtering costly.
- [A pie renderer may require floating-point numeric values and cannot retain the precision of arbitrary decimal totals] → Keep monetary aggregation and legend formatting decimal-safe; use converted values only for slice geometry.
- [The ECharts Vue wrapper may need client-only handling or explicit module registration] → Check its maintained package documentation, pin both dependencies in the lockfile, and cover the mounted Nuxt page in component tests.
- [Twelve pie instances may increase client rendering work] → Keep the count fixed at twelve, reuse the existing chart component and shared ECharts registration, and verify all month panels render in component tests.
- [Categories with similar or duplicate names may be difficult to distinguish in a legend] → Preserve one slice per returned category identity in aggregation and use returned category names as labels; `Uncategorised` is a distinct group.

## Migration Plan

No data migration or server rollout step is needed. Replace the year-wide aggregation and single chart with twelve monthly aggregates and chart panels, retaining the existing route, menu entry, endpoint, and chart dependencies. Rollback consists of restoring the year-wide chart presentation; stored data is unaffected.
