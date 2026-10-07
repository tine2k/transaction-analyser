# Proposal

## Why

In the category table, cell values are top-aligned while the row action buttons are touch-sized
(44 px) and taller than a line of text, so the buttons sit above the text baseline and the row
looks misaligned. Centering every cell's content vertically makes the values and the buttons share
one vertical center.

## What Changes

- Vertically center the content of every cell in the category table, so single-line values (name,
  expression count, window count, analysis state) line up with the Edit and Delete buttons.
- Keep the table's existing columns, values, row actions, order, content sizing, alternating row
  colors, and horizontal scrolling unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-management-screen`: the category list presentation gains vertical centering of cell
  content; listing, sorting, the form, and all write behavior stay as they are.

## Impact

- Affects only the category table markup in `app/pages/categories.vue` (cell alignment classes).
- No API, database, or dependency changes.
- Component tests for the category screen are extended to cover the vertical centering.
