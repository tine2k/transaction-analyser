# Responsive Frontend Specification

## Purpose

Defines how the shared application frame and its existing screens adapt to phone, tablet, and desktop viewports. It keeps navigation and complete screen content usable on small displays while retaining the current route and data behavior.

## Requirements

### Requirement: Every screen remains usable at narrow viewport widths

The system SHALL render the shared frame, its navigation, and each existing screen at viewport widths from 320 CSS pixels through desktop sizes without page-level horizontal overflow, clipped content, or controls that require a wider viewport. The system SHALL allow normal browser zoom and SHALL NOT disable user scaling. Any intentional horizontal scrolling SHALL be confined to the content region that needs it. At wider viewports, the system SHALL use available space without stretching narrow forms or summary content beyond readable widths.

#### Scenario: The screens fit a narrow phone viewport

- **WHEN** each of the eight routes is rendered at a 320 CSS-pixel viewport width
- **THEN** the page itself has no horizontal overflow, the route content remains available, and the user can reach every control

#### Scenario: The frame and content adapt across device sizes

- **WHEN** a route is shown at phone, tablet, and desktop viewport widths
- **THEN** the shared frame and content reflow to the available width, while larger displays retain an appropriate multi-column layout where the content supports it

#### Scenario: Browser zoom remains available

- **WHEN** the user zooms the page on a phone
- **THEN** text and controls scale normally, and the application does not lock the viewport against user scaling

### Requirement: All application destinations remain reachable from mobile navigation

The shared navigation SHALL keep links to the five menu destinations available on narrow and wide viewports. On narrow viewports it SHALL use a compact disclosure control rather than allowing the link row to overflow. The control SHALL expose its expanded state to assistive technology, support keyboard activation, and keep the current destination distinguishable. Activating a destination SHALL navigate to the same route as the corresponding wide-screen link. The category, people, and import screens SHALL remain reachable on a narrow viewport through the transactions screen's category-management link and the manage hub's entries.

#### Scenario: The mobile navigation is initially collapsed

- **WHEN** a route is loaded at a narrow viewport
- **THEN** a labelled navigation control is available, reports that the navigation is collapsed, and the navigation links do not overflow the page

#### Scenario: The mobile navigation opens and closes accessibly

- **WHEN** the navigation control is activated by pointer or keyboard
- **THEN** it exposes all five menu destinations, reports the expanded state, and can be activated again to collapse the links

#### Scenario: A mobile route link reaches the selected screen

- **WHEN** a user activates any menu destination in the expanded mobile navigation
- **THEN** the corresponding screen opens, its link is marked as current, and the navigation returns to its collapsed state

#### Scenario: Wide-screen navigation remains directly available

- **WHEN** a route is rendered at a wide viewport
- **THEN** all five menu destinations are directly visible and the current destination remains distinguishable

#### Scenario: The remaining screens remain reachable on a phone

- **WHEN** the category, people, or import screen is needed at a 320 CSS-pixel viewport width
- **THEN** the transactions screen's category-management link or the manage hub's entry reaches it with no page-level horizontal overflow

### Requirement: Controls and forms reflow for mobile use

The system SHALL adapt each screen's filters, forms, action groups, and summary lists to narrow widths without hiding information or changing behavior. Controls SHALL fit their available space, remain operable without precision pointer input, and keep readable labels. Buttons, navigation links, and form controls SHALL provide a touch hit area at least 44 CSS pixels high, and standalone disclosure controls at least 44 CSS pixels in both dimensions.

#### Scenario: Transaction filters fit a phone viewport

- **WHEN** the transactions route is shown at a 320 CSS-pixel viewport width
- **THEN** its person, category, and period filters reflow within the page, with their labels and selections available and no page-level horizontal overflow

#### Scenario: People controls fit a phone viewport

- **WHEN** the people screen is shown at a 320 CSS-pixel viewport width
- **THEN** its name form, create and rename controls, and person rows remain visible and operable without page-level horizontal scrolling

#### Scenario: Category editing controls fit a phone viewport

- **WHEN** the category form contains expression or date-window rows at a 320 CSS-pixel viewport width
- **THEN** each field, label, add/remove action, and submit action remains visible and operable without forcing page-level horizontal scrolling

#### Scenario: Controls remain usable by touch and keyboard

- **WHEN** a user operates navigation, form actions, or filters on a phone
- **THEN** buttons, navigation links, and form controls have hit areas at least 44 CSS pixels high, standalone disclosure controls have hit areas at least 44 CSS pixels wide and high, keyboard focus is visible, and existing labels and behavior are retained

### Requirement: The Monthly screen reflows its figures and bar

On the Monthly screen at narrow widths, the summary figures SHALL stack or share a row according to the available width, the year and month controls SHALL remain reachable without page-level horizontal overflow, and the stacked bar SHALL fit its container. Category names and exact amounts SHALL remain present in the table's own scroll region.

#### Scenario: The Monthly screen reflows on a phone

- **WHEN** the `/monthly` route is shown at a 320 CSS-pixel viewport width
- **THEN** the summary figures fit the page, the year and month controls remain reachable, the stacked bar fits its container, the category table scrolls within its own region, every category name and exact amount remains available, and the page has no horizontal overflow

#### Scenario: The month controls remain reachable

- **WHEN** the twelve month controls do not fit on one line
- **THEN** they wrap or scroll within their own region without widening the page or hiding a month

#### Scenario: The bar fits its container

- **WHEN** the stacked bar is shown at a narrow width
- **THEN** its segments stay within the bar's width and every legend entry remains readable

### Requirement: The Yearly screen reflows its figures and matrix

On the Yearly screen at narrow widths, the summary cards SHALL stack or share a row according to the available width, the year pills SHALL remain reachable without page-level horizontal overflow, and the category-by-month matrix SHALL scroll within its own region. Category names, every month cell, and every total SHALL remain present and readable.

#### Scenario: The Yearly screen reflows on a phone

- **WHEN** the `/yearly` route is shown at a 320 CSS-pixel viewport width
- **THEN** the summary cards fit the page, the year pills remain reachable, the matrix scrolls within its own region, every category, month, and total remains available, and the page has no horizontal overflow

#### Scenario: The year pills remain reachable

- **WHEN** the year pills do not fit on one line
- **THEN** they wrap or scroll within their own region without widening the page or hiding a year

#### Scenario: The matrix keeps every value

- **WHEN** the Yearly matrix is wider than its containing region
- **THEN** every category row, month column, and total remains present in the semantic table and can be reached by scrolling its containing region

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
