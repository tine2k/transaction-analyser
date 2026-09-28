# Design

## Context

See proposal.md for motivation and specs/category-spending-chart/spec.md for the behavior contract. The `/analytics` page derives monthly aggregates in `app/utils/category-spending.ts`, then uses each month's totals to render both the visible totals list and ECharts pie data. Amounts are exact decimal strings; the existing formatter simply prefixes `€`, and chart slice labels are disabled. The page already uses ECharts and `vue-echarts`, and the component tests inspect the resulting chart options.

## Goals / Non-Goals

**Goals:**

- Keep exact decimal totals as strings for display and compare them numerically without converting large values to imprecise JavaScript numbers.
- Have the visible category totals and chart data derive from the same descending order after the uncategorised filter is applied.
- Use one locale-aware EUR formatter consistently for totals, slice labels, and tooltips.
- Make every non-empty pie slice's label visible and include its category and formatted amount.

**Non-Goals:**

- Changing transaction aggregation, monthly bucketing, category colors, filtering behavior, the API, or persisted data.
- Adding charting or number-formatting dependencies.

## Decisions

1. **Sort exact decimal strings before building chart data.** Compare totals by aligning their decimal scales and comparing integer coefficients (or an equivalent exact-decimal comparison), not by lexicographic order or conversion to `Number`. Sort each month's totals once, descending, with category name ascending as the deterministic tie-breaker. The existing displayed totals and pie-data generation should consume that same ordered collection, including after `Uncategorised` is hidden. Sorting only the rendered list was rejected because it would leave slice order inconsistent; converting totals to floating point was rejected because large or precise values could compare incorrectly.

2. **Centralize locale-aware euro formatting while preserving decimal precision.** Use the browser's default locale with `Intl.NumberFormat` EUR currency conventions and grouping. The exact decimal-string representation remains authoritative; formatting must not round it through a floating-point conversion or silently truncate fractional digits. Use locale formatting parts and exact integer/fraction handling as needed to retain the exact digits while applying the locale's grouping, decimal separator, and currency placement. Hard-coded `€` prefixing was rejected because it does not localize separators or currency placement; direct `Number` formatting was rejected because it can lose precision.

3. **Reuse the shared formatter in all amount presentation paths.** The totals list, ECharts slice-label formatter, and tooltip formatter should call the same locale-formatting function so the amount cannot differ by presentation surface. Keep category names and exact amount strings in the pie datum; only the label text is formatted for display. Relying on hover tooltips or the separate totals list instead of slice labels was rejected because the requirement is for every slice to be labeled visibly without interaction.

4. **Keep labels on and preserve the existing chart integration.** Enable a label for every slice and render category name plus formatted EUR amount. Retain existing ECharts/Vue integration and colors; do not add another legend or a dependency. Add component-level assertions against the generated series options and utility-level tests for exact sorting and locale formatting.

## Risks / Trade-offs

- [Long labels can crowd or overlap on charts with many small slices] → Keep every label enabled as required, use a concise category-and-amount format, and verify chart options and representative dense data at narrow and wide layouts; do not silently suppress labels.
- [Locale currency formatting can introduce rounding if an exact decimal is passed through `Number`] → Keep aggregate and comparison values as decimal strings and format their integer/fraction parts without a lossy numeric conversion.
- [Sorting totals changes their prior encounter-order presentation] → Apply the same explicit descending order to the chart and visible totals, with a deterministic name-based tie-breaker.

## Migration Plan

No data or API migration is required. The change is limited to client-side presentation and aggregation ordering, so rollback consists of reverting the application change.
