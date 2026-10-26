# Spec Delta

## MODIFIED Requirements

### Requirement: Category colours are consistent within the Monthly page

The page SHALL assign each category a colour from the application category palette and SHALL use the same colour for that category in the stacked bar and its table row. A category SHALL keep its colour when the selected month, person, expense type, or uncategorised visibility changes. The `Other` segment SHALL use a neutral grey that is not a category colour and SHALL have at least 3:1 contrast against the surface; its legend swatch SHALL use the same neutral grey.

#### Scenario: The bar and table agree

- **WHEN** a category appears in both the stacked bar and the table
- **THEN** both uses the same colour

#### Scenario: A category keeps its colour across months

- **WHEN** the same category has amounts in two selected months
- **THEN** it uses the same colour in both months

#### Scenario: Filters do not change a category's colour

- **WHEN** the person, expense type, or uncategorised visibility changes
- **THEN** every visible category keeps the colour it had before

#### Scenario: Other is neutral

- **WHEN** the bar shows an `Other N` segment
- **THEN** that segment does not use a category colour

#### Scenario: Other remains visible

- **WHEN** the bar shows an `Other N` segment and its legend swatch
- **THEN** both use the same neutral grey with at least 3:1 contrast against the surface
