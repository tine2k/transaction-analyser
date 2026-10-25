# Proposal

## Why

The Transactions screen and the shared menu bar still use the original quiet paper-and-rule styling, while the new desktop mock in `design/Transactions – Desktop.pdf` sets a clearer visual direction: a branded top bar, a prominent page header, grouped filter and table sheets, colour-coded category pills, and roomier rows. Adopting it now makes the busiest screen easier to scan and gives the application one deliberate visual identity before more screens are redesigned.

## What Changes

- Replace the light, underlined menu bar with the mock's dark gradient top bar: the `Expenses` wordmark, text-only navigation pills for the existing seven screens, and a solid active pill. All current routes and labels stay; no route is added, renamed, or removed.
- Introduce the mock's palette, surface, radius, and type roles through the existing theme tokens: a tinted paper ground, white grouped sheets, an indigo brand colour for the top bar and primary actions, sans-serif page titles, and pastel category pills.
- Restructure the Transactions page: the title and its summary sit at the top, followed by a filter sheet and a table sheet. The summary becomes a single subtitle line carrying the visible transaction count and the sum of displayed transactions.
- Keep every existing Transactions capability: person, category, and period filters; the search and clear controls; all eight value columns and the selection column; row and bulk category assignment; the pattern shortcut; progressive batch loading; sorting; and the empty, loading, and failure states. The mock's Previous/Next pagination, `Accounts` and `Settings` destinations, income/spending subtitles, and reduced column set are not adopted.
- Present the category cell as a padded pill carrying the category's palette colour while keeping the existing category assignment control. Move the amount column to the end, as the mock shows, and keep amounts in ink with their sign.
- Update the shared theme and navigation tests, and add browser checks for the new toolbar, sheet, pill, and summary presentation at desktop and phone widths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the palette gains a brand role for the shared top bar and primary actions; titles move from the serif display face to the sans face; grouped content may sit on rounded surface sheets without decorative shadows; navigation links become text-only pills while all existing routes and the mobile disclosure remain.
- `transaction-table`: the visible count and sum are presented together as a subtitle beneath the page title rather than as a separate count-over-sum block; the category cell presents the category as a palette-coloured pill while remaining the assignment control; the amount is the final value column.

## Impact

- **Frontend**: `app/layouts/default.vue`, `app/assets/css/main.css`, and `app/pages/index.vue` carry most of the change; the fixed action bars adopt the shared radius and brand tokens. The other screens inherit the new theme values without layout changes.
- **Dependencies**: the Source Serif 4 font package and its `@font-face` declarations become unused and are removed; IBM Plex Sans and IBM Plex Mono stay self-hosted.
- **Tests**: component tests for the layout, transactions table, and action bars need new colour/selector expectations; browser tests for the summary, responsive layout, sorting, and pattern shortcut need updated coordinates or assertions, plus new checks for the top bar and category pills.
- **No API, database, schema, or configuration changes.** No data is derived beyond the existing visible count and visible sum.
