# Spec Delta

## Purpose

Defines how the shared application frame and its existing screens adapt to phone, tablet, and desktop viewports. It keeps navigation and complete screen content usable on small displays while retaining the current route and data behavior.

## ADDED Requirements

### Requirement: Every screen remains usable at narrow viewport widths

The system SHALL render the shared frame, its navigation, and each existing screen at viewport widths from 320 CSS pixels through desktop sizes without page-level horizontal overflow, clipped content, or controls that require a wider viewport. The system SHALL allow normal browser zoom and SHALL NOT disable user scaling. Any intentional horizontal scrolling SHALL be confined to the content region that needs it. At wider viewports, the system SHALL use available space without stretching narrow forms or summary content beyond readable widths.

#### Scenario: The screens fit a narrow phone viewport

- **WHEN** each of the five routes is rendered at a 320 CSS-pixel viewport width
- **THEN** the page itself has no horizontal overflow, the route content remains available, and the user can reach every control

#### Scenario: The frame and content adapt across device sizes

- **WHEN** a route is shown at phone, tablet, and desktop viewport widths
- **THEN** the shared frame and content reflow to the available width, while larger displays retain an appropriate multi-column layout where the content supports it

#### Scenario: Browser zoom remains available

- **WHEN** the user zooms the page on a phone
- **THEN** text and controls scale normally, and the application does not lock the viewport against user scaling

### Requirement: All application destinations remain reachable from mobile navigation

The shared navigation SHALL keep links to all five existing routes available on narrow and wide viewports. On narrow viewports it SHALL use a compact disclosure control rather than allowing the link row to overflow. The control SHALL expose its expanded state to assistive technology, support keyboard activation, and keep the current route distinguishable. Activating a destination SHALL navigate to the same route as the corresponding wide-screen link.

#### Scenario: The mobile navigation is initially collapsed

- **WHEN** a route is loaded at a narrow viewport
- **THEN** a labelled navigation control is available, reports that the navigation is collapsed, and the navigation links do not overflow the page

#### Scenario: The mobile navigation opens and closes accessibly

- **WHEN** the navigation control is activated by pointer or keyboard
- **THEN** it exposes all five route links, reports the expanded state, and can be activated again to collapse the links

#### Scenario: A mobile route link reaches the selected screen

- **WHEN** a user activates any route link in the expanded mobile navigation
- **THEN** the corresponding screen opens, its link is marked as current, and the navigation returns to its collapsed state

#### Scenario: Wide-screen navigation remains directly available

- **WHEN** a route is rendered at a wide viewport
- **THEN** all five route links are directly visible and the current route remains distinguishable

### Requirement: Screen controls and visualizations reflow for mobile use

The system SHALL adapt each screen's filters, category forms, action groups, summary lists, and analytics panels to narrow widths without hiding existing information or changing their behavior. Controls SHALL fit their available space, remain operable without precision pointer input, and retain readable labels. Buttons, navigation links, and form controls SHALL provide a touch hit area at least 44 CSS pixels high, and standalone icon or disclosure controls SHALL provide a hit area at least 44 CSS pixels in both dimensions. Analytics panels SHALL stack at narrow widths and their charts SHALL resize to the panel; category names and exact totals SHALL remain available in the existing textual totals list. At wider widths, panels and control groups MAY use additional columns when space permits.

#### Scenario: Transaction filters fit a phone viewport

- **WHEN** the transactions route is shown at a 320 CSS-pixel viewport width
- **THEN** its category and month filters reflow within the page, with their labels and selections available and no page-level horizontal overflow

#### Scenario: Category editing controls fit a phone viewport

- **WHEN** the category form contains expression or date-window rows at a 320 CSS-pixel viewport width
- **THEN** each field, label, add/remove action, and submit action remains visible and operable without forcing page-level horizontal scrolling

#### Scenario: Analytics panels stack and resize on a phone

- **WHEN** the analytics route is shown at a narrow viewport
- **THEN** month panels are arranged in one column, each chart fits its panel without clipping, and its category names and exact totals remain available in the text list

#### Scenario: Controls remain usable by touch and keyboard

- **WHEN** a user operates navigation, form actions, or filters on a phone
- **THEN** buttons, navigation links, and form controls have hit areas at least 44 CSS pixels high, standalone disclosure controls have hit areas at least 44 CSS pixels wide and high, keyboard focus is visible, and existing labels and behavior are retained

### Requirement: Wide tables scroll within their own region on narrow screens

The system SHALL preserve the existing semantic table structure, all columns, rows, and cell values for transactions, categories, and monthly totals. When a table is wider than the viewport, its containing region SHALL provide horizontal scrolling without making the page itself wider. The scrollable region SHALL be reachable and operable by touch and keyboard, and it SHALL NOT change sorting, filtering, row order, or displayed values.

#### Scenario: The transactions table is browsable on a phone

- **WHEN** the transactions table is wider than a phone viewport
- **THEN** the user can scroll the table region horizontally to read every column while the page viewport remains within the screen width

#### Scenario: The monthly comparison table retains its data

- **WHEN** the monthly totals table has more category columns than fit in the viewport
- **THEN** every month, category heading, and cell remains present in the semantic table and can be reached by scrolling its containing region

#### Scenario: The category table and actions remain available

- **WHEN** the category list is wider than a phone viewport
- **THEN** all category columns and row actions remain present and reachable in the table's own scroll region without page-level horizontal overflow

#### Scenario: Table scrolling preserves the existing table contract

- **WHEN** a user scrolls a table region horizontally or vertically
- **THEN** headers remain associated with their columns, all row content remains unchanged, and the existing route-specific order and interactions are preserved
