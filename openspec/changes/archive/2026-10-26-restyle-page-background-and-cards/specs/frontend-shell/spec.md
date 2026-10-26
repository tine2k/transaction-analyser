# Spec Delta

## ADDED Requirements

### Requirement: The page ground is the lavender paper colour

The system SHALL render the page ground in `#e9e7f5` on every route, including the failure page, using the theme's paper role rather than a per-screen colour. The document's theme colour and the web app manifest's theme and background colours SHALL carry the same value.

#### Scenario: Every route uses the lavender ground

- **WHEN** any route, including the failure page, is rendered
- **THEN** the page ground computes to `#e9e7f5`

#### Scenario: The install surface matches the ground

- **WHEN** the delivered document and the web app manifest are inspected
- **THEN** the document's theme colour and the manifest's theme and background colours are `#e9e7f5`

#### Scenario: Text on the ground stays legible

- **WHEN** body or muted text is rendered directly on the page ground
- **THEN** its contrast against the ground is at least 4.5:1

### Requirement: Content surfaces carry the card border

The system SHALL draw every content surface region as a white card with a 1px `#d3cfea` border in addition to its resting shadow. This covers filter groups, chart panels, table regions, summary figures, list panels, form panels, and the phone transaction cards. Floating action bars SHALL NOT be card surfaces.

#### Scenario: Every content surface is a bordered card

- **WHEN** any content surface region is rendered at a phone, tablet, or desktop width
- **THEN** its computed background is `#ffffff`, its border is 1px solid `#d3cfea`, and it still carries the resting shadow

#### Scenario: The border does not replace elevation

- **WHEN** a content surface card is inspected
- **THEN** its computed box shadow remains the theme's resting shadow

#### Scenario: Floating action bars are not cards

- **WHEN** a fixed action bar is shown
- **THEN** it carries no card border and keeps its stronger upward shadow

### Requirement: Content surfaces use the panel corner radius

The system SHALL round every content surface card to the theme's panel corner radius of 20px. A surface that already defines an 18px phone radius SHALL keep that radius at phone widths.

#### Scenario: Cards use the panel radius

- **WHEN** a content surface card is rendered at a tablet or desktop width
- **THEN** its corner radius is 20px

#### Scenario: Phone-only surfaces keep their phone radius

- **WHEN** a phone transaction card, or a Transactions sheet at a phone width, is rendered
- **THEN** its corner radius is 18px
