# Proposal

## Why

On the Yearly matrix, the hover highlight of a populated month cell stops short of the cell's edges. The `Total` column's vertical padding makes every row taller than the 44px month links, leaving an unhovered strip inside each populated month cell. The table therefore looks misaligned and the hover affordance no longer marks the whole interactive target.

## What Changes

- Normalize the Yearly matrix row geometry so a populated month cell's link occupies the full cell, including the area that the `Total` column currently adds to the row height.
- Keep the 44px minimum interactive target for month and total links.
- Leave blank (unlinked) month cells inert: no hover affordance and no link.
- Add browser coverage that asserts a populated month link matches its cell's hover area, alongside the existing link and component checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monthly-category-totals-table`: Sharpen the existing hover-affordance scenario so a populated month cell's hover and interactive area covers the entire cell, with no unpainted strip left by the row layout.

## Impact

- `app/pages/yearly.vue` (month cell, total cell, and link classes)
- `tests/browser/yearly.spec.ts` (hover-area regression coverage)
- No API, data model, dependency, or stored-data changes.
