# Spec Delta

## MODIFIED Requirements

### Requirement: The category cell presents the category as a coloured pill

The system SHALL present each row's category as a pill-shaped labelled control carrying the category's stable home colour from the application category palette as its identifying colour. The pill's ground SHALL use the tint role and its text the ink role of that home colour. An uncategorised row SHALL use a neutral pill naming the absence. The pill SHALL keep the category name readable and SHALL NOT convey the category by colour alone.

#### Scenario: A categorised row carries a coloured category pill

- **WHEN** a returned transaction carries a category
- **THEN** its category cell shows a pill carrying that category's palette tint ground and ink text, together with the category's name

#### Scenario: An uncategorised row carries a neutral pill

- **WHEN** a returned transaction has no category
- **THEN** its category cell shows a neutral pill naming `Uncategorised`, and no category colour or invented category is shown

#### Scenario: The pill text is legible

- **WHEN** a pill is rendered with a category colour
- **THEN** the category name remains readable against the pill's ground and is not conveyed by colour alone

#### Scenario: A category keeps its pill colour across screens

- **WHEN** the same category is shown in the Transactions pill and another category-bearing screen
- **THEN** the pill's family is the same home colour family used by that category's marks elsewhere
