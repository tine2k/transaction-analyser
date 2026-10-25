# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Wide tables scroll within their own region on narrow screens`
- TO: `### Requirement: Wide tables and the Yearly matrix scroll within their own region`

## ADDED Requirements

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

## MODIFIED Requirements

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
