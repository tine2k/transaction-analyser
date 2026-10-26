# Proposal

## Why

In the Yearly matrix, the month-cell links and the Total link do not share one vertical center. Month link text sits toward the top of its touch-sized link box, while the Total link centers its text after an extra cell padding, so a row's amounts visibly step up and down across the table.

## What Changes

- Vertically center the content of every cell in the Yearly matrix, including the category label, month links, blank month placeholders, and the Total link, so each row's content shares one vertical center.
- Give month links, blank month placeholders, and the Total link the same touch-sized cell height and remove the extra padding that shifts the Total link.
- Keep the matrix's columns, values, row order, cell tints, links, hover affordances, horizontal scrolling, and filters unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monthly-category-totals-table`: the Yearly matrix presentation gains consistent vertical centering of row content and aligned month and Total links.

## Impact

- Affects only the Yearly matrix markup in `app/pages/yearly.vue` (cell and link alignment classes).
- No API, database, dependency, or route changes.
- Component and headless-Chromium tests for the Yearly screen are extended to cover the alignment.
