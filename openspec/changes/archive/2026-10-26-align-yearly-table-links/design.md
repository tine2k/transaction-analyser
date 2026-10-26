# Design

## Context

The Yearly matrix (`app/pages/yearly.vue`) renders month cells as `p-0` table cells whose links are `block min-h-11 px-2 py-2`. A block link with top padding puts its text near the top of the 44 px link box. The Total cell instead pads the cell (`px-3 py-2`) and centers the text inside an `inline-flex min-h-11 items-center` link. The different box models and vertical paddings place the month text and Total text on different centers, and the Total cell makes populated rows taller than the month links require.

The category table already solved the same class of problem by declaring `align-middle` on every cell (`openspec/specs/category-management-screen/spec.md`). See `proposal.md` for motivation and the delta spec for the required behavior.

## Goals / Non-Goals

**Goals:**

- Make every row's category label, populated month links, blank month placeholders, and Total link share one vertical center.
- Keep link hit areas at least 44 CSS pixels high and keep month links full-width within their cell.
- Keep row height consistent whether or not a row has a populated Total cell.

**Non-Goals:**

- Changing table columns, values, row ordering, tints, link destinations, filters, or horizontal scrolling.
- Changing the Monthly table, the category table, or shared table styles.
- Introducing a reusable table component.

## Decisions

### D1: Declare vertical alignment on every header and body cell

Add `align-middle` to every `th` and `td` in the matrix. This makes the centering explicit instead of relying on the browser's default cell alignment, matches the category table's established pattern, and gives component tests a stable class to assert.

Alternative considered: centering only the link elements while leaving cells at their default alignment. That leaves the result dependent on default table-cell alignment and does not center the category label against taller links.

### D2: Center month link text inside its 44 px box

Replace the month link's `block min-h-11 px-2 py-2` with `flex min-h-11 items-center justify-end px-2`. The flex box keeps the link block-level and full-width, `items-center` centers the text vertically, and `justify-end` preserves right alignment because `text-right` does not position flex items. Give the non-link placeholder the same box (`flex min-h-11 items-center justify-end px-2`) so blank and future-month cells keep the row height.

Alternative considered: keep the block link and add line-height equal to the box height. That is harder to keep correct with the table's font sizing and creates a different centering mechanism from the Total link.

### D3: Remove the Total cell's vertical padding and center its link

Remove `py-2` from the Total cell so its 44 px link determines the row height, and make the Total link a block-level `flex min-h-11 items-center justify-end px-2` box. Keep the cell's horizontal padding (`px-3 sm:px-5`) so the number's right inset is unchanged. The Total text then shares the month links' center, and populated rows shrink from the accidental 60 px height to the 44 px touch height already used by month links.

Alternative considered: retain the cell padding and only center the month text. That aligns the text but leaves every populated row 16 px taller than its controls require.

### D4: Verify at component and browser level

- Component tests assert every matrix `th`/`td` carries `align-middle`, every month link and placeholder carries the centering classes, and the Total link keeps its touch height.
- A headless-Chromium test measures the vertical center of a row's category label, populated month link text, blank placeholder, and Total link text and asserts they differ by at most one CSS pixel. It also keeps the existing touch-height and horizontal-scroll checks.

## Risks / Trade-offs

- **Row height decreases from 60 px to 44 px on populated rows** → Intended: the 60 px height came from stacked cell and link padding. The 44 px height matches the month links, the category table's touch-sized rows, and the responsive touch-target rule.
- **The Total link becomes full-width within its cell** → Makes the whole cell a consistent hit area; the underline hover affordance and destination are unchanged, and the link remains at least 44 px high.
- **Focus outline at the scroll region's right edge** → The Total cell keeps `px-3 sm:px-5`, so the existing `outline-offset-2` still has room inside the cell.
