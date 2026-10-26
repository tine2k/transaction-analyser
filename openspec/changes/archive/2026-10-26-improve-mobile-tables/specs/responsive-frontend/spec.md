# Spec Delta

## MODIFIED Requirements

### Requirement: The Monthly average screen reflows its figures and table

On the Monthly average screen at narrow widths, the summary figures SHALL stack or share a row according to the available width and the filter controls SHALL reflow within the page. Below the `sm` breakpoint the category comparison SHALL be presented as cards; from `sm` up it SHALL be a semantic comparison table that scrolls within its own region. Every category name, monthly trend, average bar, window total, and average per month SHALL remain present and reachable at every width, and the page SHALL NOT overflow horizontally.

#### Scenario: The Monthly average screen reflows on a phone

- **WHEN** the `/monthly-average` route is shown at a 320 CSS-pixel viewport width
- **THEN** the summary figures fit the page, every filter control remains reachable, categories are presented as cards, every category, trend, average, total, and monthly average remains available, and the page has no horizontal overflow

#### Scenario: The filter controls remain reachable

- **WHEN** the person, expense-type, window, sort, and direction controls do not fit on one line
- **THEN** they wrap or stack within the filter panel without widening the page or hiding a control

#### Scenario: The phone cards keep every value

- **WHEN** the comparison is shown below the `sm` breakpoint
- **THEN** each category card shows its name, monthly trend, average bar, exact window total, and exact average per month, and no value is available only through horizontal scrolling

#### Scenario: The table keeps every row and column

- **WHEN** the comparison table is shown from the `sm` breakpoint up and is wider than its containing region
- **THEN** every category row, trend, average, window total, and average per month remains present in the semantic table and can be reached by scrolling its containing region

#### Scenario: The trend stays inside its row

- **WHEN** a category's monthly trend is shown at a narrow width
- **THEN** its bars stay within the category's row or card and do not widen the page or overlap another column

#### Scenario: The scroll region is operable without a precision pointer

- **WHEN** the comparison table overflows its region from the `sm` breakpoint up
- **THEN** the region can be scrolled by touch and reached by keyboard without changing the sort, filters, row order, or displayed values

### Requirement: Wide tables and the Yearly matrix scroll within their own region

The system SHALL preserve the semantic table structure and all columns, rows, and cell values for categories, people, the Yearly matrix, and the Monthly category table. The transactions table SHALL remain a semantic table from the `sm` breakpoint up and SHALL preserve its columns and values there. Below `sm`, transactions SHALL be presented as the card list defined by `transaction-table`, the Monthly average comparison SHALL be presented as the card list defined by `monthly-category-average`, and the import log SHALL present priority columns with in-row detail as defined by `import-log`; every value SHALL remain present in those presentations. When a table is wider than the viewport, its containing region SHALL provide horizontal scrolling without making the page itself wider. The scrollable region SHALL be reachable and operable by touch and keyboard, and it SHALL NOT change sorting, filtering, row order, or displayed values.

#### Scenario: The transactions table is browsable on a phone

- **WHEN** the transactions route is rendered below the `sm` breakpoint
- **THEN** the page presents transaction cards instead of a table region, every transaction value is available in its card, and the page viewport remains within the screen width

#### Scenario: The transactions table is browsable from `sm` up

- **WHEN** the transactions table is wider than its containing region at a width from `sm` up
- **THEN** the user can scroll the table region horizontally to read every column, including the person column, while the page viewport remains within the screen width

#### Scenario: The monthly comparison table retains its data

- **WHEN** the former monthly totals table is reached through `/monthly-totals`
- **THEN** it redirects to `/yearly`, where the Yearly matrix retains its data

#### Scenario: The Yearly matrix retains its data

- **WHEN** the Yearly matrix has more month columns than fit in the viewport
- **THEN** every category, month heading, month cell, and total remains present in the semantic table and can be reached by scrolling its containing region

#### Scenario: The Monthly category table retains its data

- **WHEN** the Monthly category table is wider than the viewport
- **THEN** every category, share, transaction count, and amount remains present in the semantic table and can be reached by scrolling its containing region, without page-level horizontal overflow

#### Scenario: The Monthly average comparison is a card list on a phone

- **WHEN** the Monthly average comparison is shown below the `sm` breakpoint
- **THEN** it presents cards rather than a horizontally scrolling table, every category value remains present in its card, and the page viewport remains within the screen width

#### Scenario: The import log reveals every field on a phone

- **WHEN** the import log is shown below the `sm` breakpoint
- **THEN** each run's row presents its priority values and an expander that reveals the remaining values in place, and no run or field is omitted

#### Scenario: The category table and actions remain available

- **WHEN** the category list is wider than a phone viewport
- **THEN** all category columns and row actions remain present and reachable in the table's own scroll region without page-level horizontal overflow

#### Scenario: The people table and actions remain available

- **WHEN** the people list is wider than a phone viewport
- **THEN** every person's name, transaction count, and rename control remains present and reachable in the table's own scroll region without page-level horizontal overflow

#### Scenario: Table scrolling preserves the existing table contract

- **WHEN** a user scrolls a table region horizontally or vertically
- **THEN** headers remain associated with their columns, all row content remains unchanged, and the existing route-specific order and interactions are preserved

## ADDED Requirements

### Requirement: Phone table scrolling keeps the row label visible

When a wide table keeps horizontal scrolling below the `sm` breakpoint, the scroll region SHALL keep the row's identifying cell visible while the remaining columns scroll. The pinned cell SHALL use an opaque background, SHALL NOT cover the region's scrollbar, and SHALL NOT change the association between a header and its column. Scrolling SHALL NOT change any cell value, the row order, sorting, or filtering.

#### Scenario: The row label stays visible while scrolling

- **WHEN** a phone reader scrolls the Monthly category table, the Yearly matrix, or the category list horizontally
- **THEN** the row's Category or Name cell remains visible at the leading edge, with an opaque background, while the other columns move

#### Scenario: The headers stay associated with their columns

- **WHEN** a pinned table region is scrolled horizontally
- **THEN** each visible header remains associated with the column it labels, and the pinned cell does not obscure the region's scrollbar

#### Scenario: Scrolling changes no data or order

- **WHEN** a phone reader scrolls a table region in either direction
- **THEN** every displayed value, the row order, the active sort, and the active filters are unchanged

### Requirement: Phone table scrolling advertises itself and stays in its region

When a wide table keeps horizontal scrolling below the `sm` breakpoint, the region SHALL show a visible edge affordance whenever content lies beyond the visible edge, and SHALL contain horizontal overscroll so a sideways gesture inside the region does not scroll the page. The affordance SHALL NOT rely on colour alone, and keyboard focus within the region SHALL remain visible.

#### Scenario: The edge affordance appears while more content remains

- **WHEN** a phone reader scrolls a table region and more columns lie beyond the visible edge
- **THEN** the region shows a visible affordance at that edge, and the affordance disappears or changes when the region reaches its end

#### Scenario: A sideways gesture does not scroll the page

- **WHEN** a phone reader drags horizontally inside a table region
- **THEN** the region scrolls and the page's horizontal position stays at zero

#### Scenario: The region remains keyboard operable

- **WHEN** a keyboard user focuses a table region and uses the arrow keys or the scrollbar
- **THEN** the region scrolls, focus stays visible, and no sorting, filtering, row order, or value changes
