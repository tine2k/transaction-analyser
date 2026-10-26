# Spec Delta

## ADDED Requirements

### Requirement: Category marks meet a contrast floor

The system SHALL draw every category indicator — category pill, dot, bar segment, legend swatch, or share bar — from the single application category palette. A category indicator SHALL have at least 3:1 contrast against the surface it is drawn on. Category pill text SHALL have at least 4.5:1 contrast against the pill's ground.

#### Scenario: A category indicator has non-text contrast

- **WHEN** a category dot, bar segment, legend swatch, or share bar is rendered
- **THEN** its colour has at least 3:1 contrast against the surface behind it

#### Scenario: A category pill's text is legible

- **WHEN** a category pill carrying a palette colour is rendered
- **THEN** its text has at least 4.5:1 contrast against the pill's ground
