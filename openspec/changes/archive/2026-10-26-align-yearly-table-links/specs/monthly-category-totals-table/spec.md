# Spec Delta

## ADDED Requirements

### Requirement: The Yearly matrix centers every row's content vertically

The Yearly matrix SHALL vertically center each row's content so that the category label, month links, blank month placeholders, and Total link share one vertical center. It SHALL keep every populated link at least 44 CSS pixels high and SHALL NOT change the matrix's columns, values, row order, cell tints, link destinations, hover affordances, horizontal scrolling, or filters.

#### Scenario: Month links and the Total link share one vertical center

- **WHEN** a Yearly row shows one or more populated month cells and a populated Total cell
- **THEN** the text of every month link and the Total link is vertically centered in the row and shares the same vertical center

#### Scenario: Blank cells and the category label share the center

- **WHEN** a Yearly row shows blank month cells, a populated month cell, and its category label
- **THEN** each blank placeholder and the category label share the same vertical center as the row's links

#### Scenario: Alignment preserves content and interaction

- **WHEN** the Yearly matrix is shown after the alignment change
- **THEN** every column, value, row, tint, link destination, hover affordance, minimum touch height, horizontal scrolling behavior, and filter remains unchanged
