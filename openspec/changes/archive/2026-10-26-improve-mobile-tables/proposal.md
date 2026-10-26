# Proposal

## Why

Only the Transactions screen has a deliberate phone presentation. Every other wide table still relies on a horizontal scroll region: at 320–390 CSS pixels the Monthly table hides its Amount column off-screen, the Yearly matrix hides nine months and the row total, the Monthly average table hides the window total and average, the category list hides Edit and Delete, and the import log hides most of its ten columns. Scrolling itself is acceptable for a data table, but without a pinned row identity or a visible affordance the reader loses which row they are on and may not discover that more columns exist.

## What Changes

- Keep the semantic table and horizontal scroll for the Monthly, Yearly, and Category tables, but make the scrolling usable: pin the row label, pin the category row actions, move the key number next to the label, compress columns at phone widths, and add an edge affordance to the scroll region.
- **BREAKING** Present the Monthly average comparison as cards below the `sm` breakpoint and keep the semantic table from `sm` up. The cards carry each category's name, monthly trend, window total, average per month, and relative average bar, with the exact values as text.
- Present the import log below `sm` with priority columns and an expander that reveals the remaining run fields in place. The table keeps every column from `sm` up.
- Give the Yearly matrix a sticky category column and compact month headers and cells, reducing its natural width while keeping all twelve months and the total reachable by scrolling.
- Make the category list keep its Name and Actions columns visible while the middle columns scroll, with compact icon-only row actions that keep accessible names at phone widths.
- Add a shared scroll affordance and contained horizontal overscroll to the tables that still scroll, without changing rows, columns, order, sorting, filtering, or displayed values.
- Leave the Transactions cards, the People table, and the application frame unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `responsive-frontend`: the phone treatment differs by table — sticky and compact for the Monthly, Yearly, and Category tables, cards for the Monthly average comparison, and expandable detail for the import log.
- `category-management-screen`: the category list pins its Name and Actions columns and uses compact icon-only row actions at phone widths.
- `category-spending-chart`: the Monthly category table pins its Category column, puts Amount beside Category, and compacts the share column at phone widths.
- `monthly-category-totals-table`: the Yearly matrix pins its category column and compacts its month headers and cells at phone widths.
- `monthly-category-average`: the category comparison is presented as cards below `sm` and as the existing semantic table from `sm` up.
- `import-log`: the imports screen presents priority columns with an in-row expander below `sm`.

## Impact

- **Frontend**: `app/pages/categories.vue`, `app/pages/monthly.vue`, `app/pages/yearly.vue`, `app/pages/monthly-average.vue`, `app/pages/imports.vue`, and a shared scroll-affordance style or component. No change to `app/pages/index.vue`, the People screen, the layout, or the API.
- **Behaviour**: desktop presentations keep every column, value, and interaction; phone presentations change only how the same data is laid out and revealed. No new data request, stored write, or derived value.
- **Tests**: the browser suite's phone expectations for the five screens change; desktop expectations stay. Component tests gain card, expander, and sticky-column checks.
- **Specs**: six capability deltas. No API, database, schema, or dependency changes.
