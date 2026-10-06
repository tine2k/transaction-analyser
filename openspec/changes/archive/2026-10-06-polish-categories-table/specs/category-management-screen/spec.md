# Spec Delta

## ADDED Requirements

### Requirement: The category list is sized to its content and alternates row colors

The category table SHALL be only as wide as its columns and cell content require and SHALL NOT be stretched to fill the width of its container. Consecutive category rows SHALL alternate their background color so that adjacent rows are distinguishable. The table SHALL keep every column, row, cell value, row action, and its existing order, and SHALL remain inside its horizontally scrollable region when it is wider than that region.

#### Scenario: The table takes only the space it needs

- **WHEN** the category list is shown on a wide viewport and its content is narrower than the page
- **THEN** the table is no wider than its content requires and is not stretched across the page

#### Scenario: Adjacent rows are distinguishable

- **WHEN** several categories are listed
- **THEN** each row's background color differs from the background color of the row directly above or below it

#### Scenario: The table keeps its content and scrolling

- **WHEN** the table is wider than its scroll region
- **THEN** every column, cell value, and row action remains present and reachable by scrolling the region

### Requirement: Starting an edit brings the edit form into view

When the user starts editing a category, the screen SHALL bring the create/edit form into view with a smooth scroll so the loaded category is visible without the user scrolling manually. When the user prefers reduced motion, the form SHALL be brought into view without animated scrolling. The scroll SHALL NOT change the form's values or the edit behavior.

#### Scenario: The edit form is scrolled into view

- **WHEN** the user starts editing a category whose row is outside the viewport
- **THEN** the screen scrolls smoothly until the create/edit form is in view, showing that category's values

#### Scenario: Reduced motion is respected

- **WHEN** the user's system requests reduced motion and the user starts editing a category
- **THEN** the form is brought into view without animated scrolling
