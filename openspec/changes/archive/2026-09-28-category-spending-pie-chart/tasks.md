# Tasks

## 1. Chart dependency setup

- [x] 1.1 Add ECharts and `vue-echarts` with lockfile entries; verify installation succeeds and the maintained documentation confirms the wrapper's Vue 3 pie-series integration.
- [x] 1.2 Add the smallest Nuxt-compatible chart adapter or client-only boundary required by the package; verify it mounts in a focused component test without changing the existing global stylesheet or adding a general component library.

## 2. Category aggregation

- [x] 2.1 Update the booking-date utility to create buckets for the current calendar month and eleven preceding months; verify unit tests cover all twelve months, the oldest-month boundary, today, and excluded dates.
- [x] 2.2 Calculate exact absolute category totals separately for each month; verify unit tests cover mixed signs, precision, uncategorised amounts, and separation of the same category across months.
- [x] 2.3 Produce exactly twelve monthly chart datasets, including empty months without invented slices; verify unit tests cover the twelve slots and each empty dataset.

## 3. Analytics page and chart

- [x] 3.1 Add the `/analytics` page and load transaction data once through `GET /api/transactions`; verify component tests confirm the endpoint is the sole page data request.
- [x] 3.2 Render one ECharts pie per month with its month label and exact monthly euro legend; verify component tests find exactly twelve charts and confirm each chart uses only its month's category data.
- [x] 3.3 Preserve all twelve panels for empty months and implement loading and failed-request states without stale or fabricated totals; verify component tests cover empty, loading, and error cases.

## 4. Navigation and integration

- [x] 4.1 Add an Analytics link for `/analytics` to the shared menu and mark it current on that route; verify component tests confirm all menu destinations and active-link behavior.
- [x] 4.2 Run the unit and component suites and build the Nuxt application; verify `npm run test:unit`, `npm run test:components`, and `npm run build` all pass with the monthly charts.
