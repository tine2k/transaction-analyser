# Spec Delta

## MODIFIED Requirements

### Requirement: Wide tables scroll within their own region on narrow screens

The system SHALL preserve the semantic table structure and all columns, rows, and cell values for categories, people, monthly totals, and the Monthly category table. The transactions table SHALL remain a semantic table from the `sm` breakpoint up and SHALL preserve its columns and values there. Below `sm`, transactions SHALL be presented as the card list defined by `transaction-table` rather than as a horizontally scrolling table, and every transaction value SHALL remain present in its card. When a table is wider than the viewport, its containing region SHALL provide horizontal scrolling without making the page itself wider. The scrollable region SHALL be reachable and operable by touch and keyboard, and it SHALL NOT change sorting, filtering, row order, or displayed values.

#### Scenario: The transactions table is browsable on a phone

- **WHEN** the transactions route is rendered below the `sm` breakpoint
- **THEN** the page presents transaction cards instead of a table region, every transaction value is available in its card, and the page viewport remains within the screen width

#### Scenario: The transactions table is browsable from `sm` up

- **WHEN** the transactions table is wider than its containing region at a width from `sm` up
- **THEN** the user can scroll the table region horizontally to read every column, including the person column, while the page viewport remains within the screen width

#### Scenario: The monthly comparison table retains its data

- **WHEN** the monthly totals table has more category columns than fit in the viewport
- **THEN** every month, category heading, and cell remains present in the semantic table and can be reached by scrolling its containing region

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

## REMOVED Requirements

### Requirement: Screen controls and visualizations reflow for mobile use

**Reason**: The requirement and its scenario describe the retired analytics panels and charts. The Monthly screen reflows different content, so the replacement requirements below cover controls and the Monthly figures separately.

**Migration**: Use `Controls and forms reflow for mobile use` and `The Monthly screen reflows its figures and bar` below.

## ADDED Requirements

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
