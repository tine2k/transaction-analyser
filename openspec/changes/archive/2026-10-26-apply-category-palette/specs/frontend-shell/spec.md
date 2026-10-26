# Spec Delta

## ADDED Requirements

### Requirement: Category colours have a stable identity

The system SHALL assign every stored category one home colour derived from its persistent identity. The home colour SHALL NOT depend on the other categories present, the screen, filters, sort order, or the category's name.

#### Scenario: A category keeps its home colour across screens

- **WHEN** the same category is shown on the Transactions, Monthly, Yearly, or Monthly average screen
- **THEN** its category mark uses the same home colour family on every screen

#### Scenario: Changing the category set keeps existing home colours

- **WHEN** a category is added, removed, or renamed while another category keeps its identity
- **THEN** the unchanged category keeps the home colour it had before

#### Scenario: Filters keep home colours

- **WHEN** the selected month, year, person, expense type, or uncategorised visibility changes
- **THEN** every visible category keeps its home colour

#### Scenario: Uncategorised is not a stored category

- **WHEN** an uncategorised entry is shown on the Transactions screen
- **THEN** its pill remains neutral and is not presented as a stored category with a home colour

### Requirement: The category palette defines three roles

The system SHALL define the category palette as twenty colour families, each with a main role for category marks, a tint role for pill grounds, and an ink role for pill text.

#### Scenario: A category mark uses the main role

- **WHEN** a category dot, bar segment, legend swatch, or share bar is rendered
- **THEN** its fill uses the main role of the category's home colour family

#### Scenario: A category pill uses the tint and ink roles

- **WHEN** a categorised category pill is rendered
- **THEN** its ground uses the tint role and its text uses the ink role of the category's home colour family

## MODIFIED Requirements

### Requirement: Category marks meet a contrast floor

The system SHALL draw every category mark — dot, bar segment, legend swatch, or share bar — from the single application category palette and SHALL give it at least 3:1 contrast against the surface it is drawn on. A category pill SHALL use a palette tint ground and palette ink text, and its text SHALL have at least 4.5:1 contrast against its ground. The pill's ground is background and is not required to meet 3:1 because the visible label carries the category identity.

#### Scenario: A category indicator has non-text contrast

- **WHEN** a category dot, bar segment, legend swatch, or share bar is rendered
- **THEN** its colour has at least 3:1 contrast against the surface behind it

#### Scenario: A category pill's text is legible

- **WHEN** a category pill carrying a palette colour is rendered
- **THEN** its text has at least 4.5:1 contrast against the pill's ground and the category name remains present

#### Scenario: The pastel pill ground is not the only identifier

- **WHEN** a category pill's tint ground is lighter than 3:1 against the surface
- **THEN** the visible category name and ink text still identify the category, and no category is conveyed by colour alone
