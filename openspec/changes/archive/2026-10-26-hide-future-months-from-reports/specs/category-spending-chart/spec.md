# Spec Delta

## REMOVED Requirements

### Requirement: A year and month control selects the displayed month

**Reason**: Future months and future years are no longer offered, so the control no longer shows twelve month controls for every selected year.

**Migration**: Use the added requirement "The Monthly controls offer only elapsed months". Existing links to past and current months keep working through the unchanged selected-month requirement.

## ADDED Requirements

### Requirement: The Monthly year control ends at the current year

The page SHALL offer a year control for choosing the displayed calendar year. It SHALL offer every calendar year represented by a returned transaction up to the current calendar year, plus the current calendar year, newest first, and SHALL NOT offer a future year.

#### Scenario: The year control offers represented past years and the current year

- **WHEN** returned transactions have booking dates in 2024, 2025, and a future year, and the current year is 2026
- **THEN** the year control offers 2026, 2025, and 2024, newest first, and does not offer the future year

### Requirement: The Monthly month controls cover only elapsed months

For the current calendar year the month controls SHALL cover January through the calendar month containing today; for a past calendar year they SHALL cover all twelve calendar months. The month controls SHALL be present for every month in that range, including months with no transaction, and no control SHALL be offered for a future month.

#### Scenario: The current year stops at the current month

- **WHEN** the page presents the current calendar year and the current month is October
- **THEN** month controls are shown for January through October and no month control is shown for November or December

#### Scenario: A past year keeps all twelve month controls

- **WHEN** the page presents a calendar year before the current year
- **THEN** twelve month controls are shown, one for each calendar month of that year

#### Scenario: An empty elapsed month can be selected

- **WHEN** the selected year has no transaction in an offered month
- **THEN** that month's control remains available and selecting it shows the empty-month state rather than removing the control

## MODIFIED Requirements

### Requirement: The selected month is linkable and defaults to the current or newest month

The selected month SHALL be carried in the route query as `month=YYYY-MM`. A supplied well-formed month that is not a future month SHALL be selected on load and its year SHALL be available in the year control. A supplied future month SHALL be treated as an unavailable value and SHALL NOT be selected or added to the year control. An absent, malformed, or future month SHALL select the current calendar month when a returned transaction falls in it, otherwise the newest calendar month represented by a returned transaction that is not a future month, otherwise the current calendar month. Selecting a month SHALL NOT make another data request.

#### Scenario: A month link initializes the page

- **WHEN** `/monthly` is opened with `month=2025-03`
- **THEN** March 2025 is selected and its figures and table are shown

#### Scenario: The current month is the default when it has data

- **WHEN** the route carries no month and a returned transaction falls in the current calendar month
- **THEN** the current month is selected

#### Scenario: The newest represented month is the fallback

- **WHEN** the route carries no month, no returned transaction falls in the current calendar month, and returned transactions include both an elapsed month and a future month
- **THEN** the newest elapsed calendar month represented by a returned transaction is selected

#### Scenario: A future month link falls back

- **WHEN** `/monthly` is opened with a well-formed month after the current calendar month
- **THEN** the page selects the same month its current-or-newest rule would select without that value, and the year control does not offer the future month's year

#### Scenario: No transactions select the current month

- **WHEN** the endpoint returns no transaction and the route carries no month
- **THEN** the current calendar month is selected and the empty-month state is shown

#### Scenario: Selecting a month does not re-fetch

- **WHEN** the user selects another month or year
- **THEN** the page recomputes from the already-fetched transactions and makes no additional data request
