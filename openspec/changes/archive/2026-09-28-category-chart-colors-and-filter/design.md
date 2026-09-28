# Design

## Context

See `proposal.md` for motivation and scope. The `/analytics` page requests transactions once, computes twelve monthly totals in `app/utils/category-spending.ts`, and builds each ECharts pie option in `app/pages/analytics.vue`. The page currently leaves pie colors to ECharts' per-chart defaults and renders a text-only totals list. The chart requirement is an existing capability; this change updates its delta while retaining the route, data source, and twelve-month layout.

## Goals / Non-Goals

**Goals:**
- Keep each category's color stable across all monthly pie charts and identify the same color beside its total.
- Let one page-wide control show or hide uncategorised totals across every month, without changing data or issuing another request.
- Preserve the current visible-by-default behavior and monthly totals when the control is not selected.

**Non-Goals:**
- Persisting the hide/show preference across page loads.
- Changing transaction aggregation, the API, stored data, or chart types.
- Adding a color picker or per-month filtering controls.

## Decisions

1. **Derive an explicit color from category identity, not from each pie's item order.** ECharts' implicit palette is applied separately to each chart, so a category can receive a different color when other categories are absent or ordered differently in a month. Assign colors from a deterministic mapping keyed by the existing category key (including a separate key for uncategorised), and pass the resulting color explicitly with each pie datum. Reuse that mapping for a small color indicator in the visible monthly totals list. This keeps color independent of month ordering and the hide/show state. A position-based palette shared only by index was considered and rejected because category positions differ by month.

2. **Use one local page-level visibility state, applied to both pie data and totals.** Default the control to showing uncategorised to preserve the current experience. Derive displayed totals for each month from the existing aggregates, excluding the uncategorised key only while hidden; build both pie data and the visible totals list from this same displayed set so they cannot disagree. Keep the twelve panels, including months with no remaining visible totals, and retain the existing empty-state treatment. A request parameter or endpoint filter was considered and rejected because the full transaction set is already loaded once and this is a presentation-only choice.

3. **Keep this preference ephemeral.** Do not write it to storage or a URL because persistence was not requested; resetting the page restores the default visible state. This avoids introducing a new persistence contract.

4. **Extend the existing utility and component tests.** Test category-key color stability when month/category ordering differs, matching indicators and slices, control default and toggling, unchanged named totals, and empty visible months. Retain existing tests for the single request and exact monthly totals.

## Risks / Trade-offs

- [A finite categorical palette or derived colors can be difficult to distinguish for a large number of categories] → Keep the color mapping deterministic and verify stability; avoid coupling colors to monthly ordering.
- [Hiding the only category in a month leaves no visible totals] → Preserve the month panel and use the existing no-category-data message when no categories remain visible.
- [The totals list and pie options could diverge if filtering is applied in only one presentation] → Build both from the same filtered per-month totals.

## Migration Plan

No API, database, or dependency migration is needed. Deploy the presentation change with the existing application; rollback by reverting the chart color and control changes. The stored transactions are unaffected.
