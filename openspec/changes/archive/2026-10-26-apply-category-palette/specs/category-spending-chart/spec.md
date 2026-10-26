# Spec Delta

## ADDED Requirements

### Requirement: Similar-sized top-eight segments are separated

When two stored categories in the Monthly top eight share a home colour and their amounts differ by no more than 10% of the larger amount, the page SHALL keep the lower category identity on the home colour and SHALL give the other a distinct palette colour that no other top-eight segment uses. The resolved colours SHALL apply to the bar, legend, and matching table rows. The result SHALL be deterministic.

#### Scenario: Similar-sized shared colours are separated

- **WHEN** two top-eight categories have the same home colour and amounts within 10% of the larger
- **THEN** the lower category identity keeps the home colour and the other is shown in a distinct unused palette colour

#### Scenario: Clearly different widths may share a colour

- **WHEN** two top-eight categories have the same home colour and amounts more than 10% apart
- **THEN** both may keep the same home colour because their bar widths distinguish them

#### Scenario: More than two shared colours are all separated

- **WHEN** three or more top-eight categories share a home colour and their amounts are within the threshold
- **THEN** the lower identity keeps the home colour and every other affected segment is given its own distinct unused palette colour

#### Scenario: The legend and table follow the resolved colour

- **WHEN** a top-eight segment is moved from its home colour
- **THEN** its legend swatch and its table row use the resolved colour, while rows outside the top eight keep their home colours

#### Scenario: Separation is deterministic

- **WHEN** the same month, person, expense type, and uncategorised visibility are shown again
- **THEN** the same categories receive the same resolved colours

## MODIFIED Requirements

### Requirement: Category colours are consistent within the Monthly page

The page SHALL assign each stored category its stable home colour from the application category palette and SHALL use the same colour for that category in the stacked bar, its legend entry, and its table row, except where the top-eight separation requirement applies. A category SHALL keep its home colour when the selected month, person, expense type, or uncategorised visibility changes, except where separation requires another colour. The `Uncategorised` entry SHALL use the neutral treatment, distinct from the `Other` aggregate. The `Other` segment SHALL use a neutral grey that is not a category colour and SHALL have at least 3:1 contrast against the surface; its legend swatch SHALL use the same neutral grey.

#### Scenario: The bar and table agree

- **WHEN** a category appears in the stacked bar and the table
- **THEN** its segment, legend swatch, and table row use the same colour

#### Scenario: A category keeps its colour across months

- **WHEN** the same category has amounts in two selected months and separation is not required in either
- **THEN** it uses the same home colour in both months

#### Scenario: Filters do not change a category's colour

- **WHEN** the person, expense type, or uncategorised visibility changes and separation is not required
- **THEN** every visible category keeps the home colour it had before

#### Scenario: Other is neutral

- **WHEN** the bar shows an `Other N` segment
- **THEN** that segment does not use a category colour

#### Scenario: Uncategorised has its own neutral

- **WHEN** the bar or table shows an `Uncategorised` entry and the bar also shows an `Other N` segment
- **THEN** both use neutral colours, the two neutral colours differ, and neither uses a category palette family

#### Scenario: Other remains visible

- **WHEN** the bar shows an `Other N` segment and its legend swatch
- **THEN** both use the same neutral grey with at least 3:1 contrast against the surface
