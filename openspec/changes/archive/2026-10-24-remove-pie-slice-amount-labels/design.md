# Design

## Context

The analytics page builds its pie options in `chartOption` in `app/pages/analytics.vue`. Both the months and years panels use it. Each series has a `label.formatter` (`sliceLabel`) that returns `name\namount`, and a `tooltip.formatter` (`tooltipLabel`) that returns `name: amount`. The "Category totals" list below each pie already renders the amounts. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Slice labels show the category name only, in both views.
- Euro amounts remain available on hover (tooltip) and in the visible category totals.

**Non-Goals:**
- No change to data fetching, grouping, sorting, colors, hide-uncategorised, expense-type, person filters, or links.
- No change to the tooltip or the category totals list.

## Decisions

- **Change the existing `sliceLabel` formatter to return only the category name.** It is the single source for slice labels, so both panels change together. Alternative: a new prop or per-view flag. Rejected because both views should behave the same and no caller needs the amount on the slice.
- **Keep `tooltipLabel` as is.** It already shows the exact amount on hover, so amounts stay reachable without the slice label carrying them.
- **Modify the spec requirement rather than adding a new one.** The existing requirement explicitly requires amounts on slices, so an ADDED requirement would leave a contradiction. The MODIFIED blocks replace that text in both the months requirement and the year panel presentation requirement.

## Risks / Trade-offs

- [Narrow slices lose their amount on screen] → Amounts remain in the tooltip and in the category totals directly below each pie.
- [Touch users cannot hover] → The category totals list below each pie still shows every amount without interaction.
- [Long category names are not truncated by amounts anymore] → Label layout (`labelLayout`, `hideOverlap`) is unchanged; verify in the headless browser check during apply.

## Migration Plan

Frontend-only change. Deploy with the normal build. Rollback is reverting the formatter change. No data migration.

## Open Questions

None.
