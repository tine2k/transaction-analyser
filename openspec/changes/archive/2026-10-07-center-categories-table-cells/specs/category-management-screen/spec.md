# Spec Delta

## ADDED Requirements

### Requirement: The category table centers every cell's content vertically

The category table SHALL vertically center the content of every cell in each row, so that
single-line values and the touch-sized row action controls share the same vertical center. This
SHALL NOT change the table's columns, values, row actions, order, content sizing, alternating row
colors, or horizontal scrolling.

#### Scenario: Values and actions share one vertical center

- **WHEN** a category row shows single-line values and its Edit and Delete controls
- **THEN** each value and each control is vertically centered in the row, sharing the same vertical center

#### Scenario: The table keeps its content and presentation

- **WHEN** the category list is shown after the alignment change
- **THEN** every column, cell value, and row action remains present in its existing order, with the content-sized table, alternating row colors, and horizontal scrolling unchanged
