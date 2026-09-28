# Spec Delta

## MODIFIED Requirements

### Requirement: The layout carries a menu bar linking the screens

The shared layout SHALL carry a menu bar, present on every route, holding a link to the
transactions screen, a link to the category management screen, and a link to the category
spending analytics screen. Each link SHALL be an in-application navigation to that screen on the
same origin. The menu bar SHALL distinguish the link for the screen currently shown from the
other links. Adding the menu bar SHALL NOT remove the frame's other properties, which remain as
`frontend-shell` defines.

#### Scenario: The menu bar is on the transactions screen

- **WHEN** the transactions screen is shown
- **THEN** a menu bar is present holding links to the transactions screen, the category management screen, and the category spending analytics screen

#### Scenario: The menu bar is on the category management screen

- **WHEN** the category management screen is shown
- **THEN** the same menu bar is present

#### Scenario: The menu bar is on the analytics screen

- **WHEN** the category spending analytics screen is shown
- **THEN** the same menu bar is present

#### Scenario: The current screen is distinguished

- **WHEN** a screen is shown
- **THEN** the menu bar's link for that screen is distinguishable as the current one

#### Scenario: Each link reaches its screen

- **WHEN** any menu link is followed
- **THEN** its screen is reached through in-application navigation on the same origin
