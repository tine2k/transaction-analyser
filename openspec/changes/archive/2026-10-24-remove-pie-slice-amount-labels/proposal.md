# Proposal

## Why

Each analytics pie slice label shows the category name and its euro amount, and the "Category totals" list directly below each pie already shows the same amounts. The repeated amount on the chart adds clutter without new information.

## What Changes

- Pie slice labels on the analytics month and year charts show only the category name; the exact euro amount is no longer printed on the slice.
- The slice tooltip, the "Category totals" list, and all slice and total links are unchanged.
- **BREAKING** (spec): the existing requirement that every pie slice visibly displays its exact euro total without hover is replaced. Slice labels become name-only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-spending-chart`: the requirement that every pie slice has a visible label showing its category and exact euro total changes to a name-only slice label. Amount display in the visible category totals and tooltips is unchanged.

## Impact

- `app/pages/analytics.vue`: `sliceLabel` formatter (used by `chartOption` for both month and year panels) stops appending the formatted amount.
- `openspec/specs/category-spending-chart/spec.md`: delta spec replaces the slice-label requirement scenario.
- Browser tests covering analytics slice labels, if any, need updating. No API, data, or dependency changes.
