# Responsive Frontend Specification

## Purpose

Defines how the shared application frame and its existing screens adapt to phone, tablet, and desktop viewports. It keeps navigation and complete screen content usable on small displays while retaining the current route and data behavior.

## Requirements

### Requirement: Every screen remains usable at narrow viewport widths

The system SHALL render the shared frame, its navigation, and each existing screen at viewport widths from 320 CSS pixels through desktop sizes without page-level horizontal overflow, clipped content, or controls that require a wider viewport. The system SHALL allow normal browser zoom and SHALL NOT disable user scaling. Any intentional horizontal scrolling SHALL be confined to the content region that needs it. At wider viewports, the system SHALL use available space without stretching narrow forms or summary content beyond readable widths.

#### Scenario: The screens fit a narrow phone viewport

- **WHEN** each of the seven routes is rendered at a 320 CSS-pixel viewport width
- **THEN** the page itself has no horizontal overflow, the route content remains available, and the user can reach every control

#### Scenario: The frame and content adapt across device sizes

- **WHEN** a route is shown at phone, tablet, and desktop viewport widths
- **THEN** the shared frame and content reflow to the available width, while larger displays retain an appropriate multi-column layout where the content supports it

#### Scenario: Browser zoom remains available

- **WHEN** the user zooms the page on a phone
- **THEN** text and controls scale normally, and the application does not lock the viewport against user scaling

### Requirement: All application destinations remain reachable from mobile navigation

The shared navigation SHALL keep links to all seven existing routes available on narrow and wide viewports. On narrow viewports it SHALL use a compact disclosure control rather than allowing the link row to overflow. The control SHALL expose its expanded state to assistive technology, support keyboard activation, and keep the current route distinguishable. Activating a destination SHALL navigate to the same route as the corresponding wide-screen link.

#### Scenario: The mobile navigation is initially collapsed

- **WHEN** a route is loaded at a narrow viewport
- **THEN** a labelled navigation control is available, reports that the navigation is collapsed, and the navigation links do not overflow the page

#### Scenario: The mobile navigation opens and closes accessibly

- **WHEN** the navigation control is activated by pointer or keyboard
- **THEN** it exposes all seven route links, reports the expanded state, and can be activated again to collapse the links

#### Scenario: A mobile route link reaches the selected screen

- **WHEN** a user activates any route link in the expanded mobile navigation
- **THEN** the corresponding screen opens, its link is marked as current, and the navigation returns to its collapsed state

#### Scenario: Wide-screen navigation remains directly available

- **WHEN** a route is rendered at a wide viewport
- **THEN** all seven route links are directly visible and the current route remains distinguishable

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

### Requirement: Wide tables and the Yearly matrix scroll within their own region

The system SHALL preserve the semantic table structure and all columns, rows, and cell values for categories, people, the Yearly matrix, and the Monthly category table. The transactions table SHALL remain a semantic table from the `sm` breakpoint up and SHALL preserve its columns and values there. Below `sm`, transactions SHALL be presented as the card list defined by `transaction-table` rather than as a horizontally scrolling table, and every transaction value SHALL remain present in its card. When a table is wider than the viewport, its containing region SHALL provide horizontal scrolling without making the page itself wider. The scrollable region SHALL be reachable and operable by touch and keyboard, and it SHALL NOT change sorting, filtering, row order, or displayed values.

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

#### Scenario: The category table and actions remain available

- **WHEN** the category list is wider than a phone viewport
- **THEN** all category columns and row actions remain present and reachable in the table's own scroll region without page-level horizontal overflow

#### Scenario: The people table and actions remain available

- **WHEN** the people list is wider than a phone viewport
- **THEN** every person's name, transaction count, and rename control remains present and reachable in the table's own scroll region without page-level horizontal overflow

#### Scenario: Table scrolling preserves the existing table contract

- **WHEN** a user scrolls a table region horizontally or vertically
- **THEN** headers remain associated with their columns, all row content remains unchanged, and the existing route-specific order and interactions are preserved
