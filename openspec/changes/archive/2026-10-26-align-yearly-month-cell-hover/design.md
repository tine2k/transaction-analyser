# Design

## Context

See `proposal.md` for the motivation and `specs/monthly-category-totals-table/spec.md` for the required behavior.

The Yearly matrix in `app/pages/yearly.vue` renders each month as a `p-0` table cell containing a `min-h-11` link (`44px`). The `Total` cell instead carries `py-2` padding around its own `min-h-11` link, making that cell `60px` tall. Table rows stretch to the tallest cell, so every month cell is `60px` while its link remains `44px`; the bottom `16px` of the cell never receives the link's hover background. Template classes, not custom CSS, cause the mismatch.

## Goals / Non-Goals

**Goals:**

- Make a populated month cell's link exactly cover the cell, so hover and click target match the full cell.
- Preserve the existing 44px minimum interactive size and the existing tint and hover colors.
- Keep blank (unlinked) month cells inert.
- Add regression coverage for the geometry and hover behavior.

**Non-Goals:**

- Changing the matrix data, filters, links, colors, or tint algorithm.
- Changing the `Total` column's link semantics or its underline affordance.
- Restyling the table beyond the vertical row geometry.

## Decisions

### Decision: Remove the `Total` cell's vertical padding so the row matches the 44px link

Change the `Total` `<td>` from `px-3 py-2 … sm:px-5` to horizontal padding only (`px-3 … sm:px-5`). Its `min-h-11` link already supplies the 44px body, so the row height becomes 44px and every month link, which is also 44px, covers its cell exactly. The table's vertical padding for the Total content comes from the link's own `items-center` and `min-h-11`; no spacing is lost inside the link.

This is preferred over stretching the month links because it:

- makes the cell and link height identical by construction, with no percentage-height resolution inside a table cell;
- keeps the link's existing block layout, text placement, and `hover:bg-paper` utility (and therefore the existing component assertion);
- gives the whole row one consistent height without coupling a hard-coded pixel value to the Total cell.

Alternative considered: add `h-full` (or `flex h-full`) to the month link and leave the 60px row. Rejected because percentage heights inside auto-sized table cells are browser-sensitive, and the vertical placement of the amount would need separate alignment work.

Alternative considered: put hover styling on the `<td>` via `group-hover`. Rejected because it would highlight a 60px cell while only 44px is clickable, creating a hover affordance over a dead strip.

### Decision: Keep blank month cells unchanged

A zero month cell renders a plain `<span>` with no link. It remains inert and keeps its neutral background; only populated cells gain the full-cell hover. The row height change applies to all rows, so blank cells simply share the 44px row.

### Decision: Test the cell/link geometry in the browser

Add a Playwright check in `tests/browser/yearly.spec.ts` that, for a populated month cell, compares the cell's bounding box with its link's bounding box and hovers near the cell's lower edge to confirm the link's background changes. Component tests continue to assert the link URL, `hover:bg-paper`, and blank-cell inertness; they do not need to encode the padding value.

## Risks / Trade-offs

- [Rows become 16px shorter (60px to 44px), changing the table's density] → The 44px row still meets the project's minimum interactive target, and the change is limited to the Yearly matrix; confirm the density during review.
- [A future style adds padding to a different cell and stretches the row again] → The new browser assertion compares the populated month link's height with its cell, so the regression is caught even if the offending cell changes.
- [Hover color assertions can be brittle against token changes] → Assert the geometry unconditionally and treat the color change as a secondary check against the theme's paper token rather than a hard-coded RGB value.

## Migration Plan

Frontend-only class change. Deploy with the normal build; roll back by reverting the change. No data migration, API change, or compatibility concern.
