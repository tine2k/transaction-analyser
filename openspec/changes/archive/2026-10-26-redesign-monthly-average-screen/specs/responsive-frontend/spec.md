# Spec Delta

## ADDED Requirements

### Requirement: The Monthly average screen reflows its figures and table

On the Monthly average screen at narrow widths, the summary figures SHALL stack or share a row according to the available width, the filter controls SHALL reflow within the page, and the category comparison table SHALL scroll within its own region. Every category name, monthly trend, average, window total, and average per month SHALL remain present and reachable, and the page SHALL NOT overflow horizontally.

#### Scenario: The Monthly average screen reflows on a phone

- **WHEN** the `/monthly-average` route is shown at a 320 CSS-pixel viewport width
- **THEN** the summary figures fit the page, every filter control remains reachable, the comparison table scrolls within its own region, every category, trend, average, total, and monthly average remains available, and the page has no horizontal overflow

#### Scenario: The filter controls remain reachable

- **WHEN** the person, expense-type, window, sort, and direction controls do not fit on one line
- **THEN** they wrap or stack within the filter panel without widening the page or hiding a control

#### Scenario: The table keeps every row and column

- **WHEN** the comparison table is wider than its containing region
- **THEN** every category row, trend, average, window total, and average per month remains present in the semantic table and can be reached by scrolling its containing region

#### Scenario: The trend stays inside its row

- **WHEN** a category's monthly trend is shown at a narrow width
- **THEN** its bars stay within the table's scroll region and do not widen the page or overlap another column

#### Scenario: The scroll region is operable without a precision pointer

- **WHEN** the comparison table overflows its region on a touch device
- **THEN** the region can be scrolled by touch and reached by keyboard without changing the sort, filters, row order, or displayed values
