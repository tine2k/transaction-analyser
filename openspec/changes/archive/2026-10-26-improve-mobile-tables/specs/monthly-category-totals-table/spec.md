# Spec Delta

## ADDED Requirements

### Requirement: The Yearly matrix keeps its category visible on a phone

Below the `sm` breakpoint, the Yearly matrix SHALL pin the Category row header at the leading edge of its scroll region with an opaque background, SHALL label the twelve month columns with compact three-letter headings, and SHALL use compact cell metrics that reduce the matrix's natural width. Each compact heading SHALL expose the full month name to assistive technology. Pinning and compacting SHALL NOT change a cell's month, value, magnitude tint, link target, row order, or total.

#### Scenario: The category stays visible while the months scroll

- **WHEN** a phone reader scrolls the Yearly matrix horizontally to December
- **THEN** each visible row's Category cell remains at the leading edge with an opaque background

#### Scenario: Twelve months and the total remain present

- **WHEN** the matrix is shown below the `sm` breakpoint
- **THEN** all twelve month columns and the Total column remain in the table and every cell is reachable by scrolling

#### Scenario: A compact month heading keeps its full name

- **WHEN** a phone reader inspects a month heading
- **THEN** the visible label is a compact form such as `Jan`, and the heading exposes the full calendar month name to assistive technology

#### Scenario: Compacting changes no cell value or tint

- **WHEN** the matrix is compared between a phone width and a wider width
- **THEN** each month cell holds the same exact amount, the same row-relative tint, and the same not-yet-elapsed marker

#### Scenario: Pinned and compacted cells keep their links

- **WHEN** a populated month or total cell is activated on a phone
- **THEN** it opens the same transactions link, with the same month or year, category, and person values, as at a wider width

#### Scenario: The matrix fits a 320-pixel page

- **WHEN** the Yearly matrix is shown at a 320 CSS-pixel viewport width
- **THEN** the matrix scrolls within its own region, every category, month, and total remains reachable, and the page has no horizontal overflow

#### Scenario: The total remains reachable after the months

- **WHEN** a phone reader scrolls the matrix to its end
- **THEN** the Total column is reached after December and shows the unchanged row total
