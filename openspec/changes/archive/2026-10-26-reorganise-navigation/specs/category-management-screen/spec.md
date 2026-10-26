# Spec Delta

## ADDED Requirements

### Requirement: The category screen is reached from the transactions screen and the manage hub

The system SHALL provide the category management screen at `/categories`. The transactions screen SHALL carry an in-application link to it beside the Category filter, and the manage hub SHALL carry an entry to it. The shared menu bar SHALL mark the Manage destination as the current one when the category screen is shown. The screen SHALL remain reachable by its own path.

#### Scenario: The transactions screen links to the category screen

- **WHEN** the transactions screen is shown
- **THEN** a link beside its Category filter reaches the category management screen through in-application navigation on the same origin

#### Scenario: The manage hub links to the category screen

- **WHEN** the manage hub is shown
- **THEN** its Categories entry reaches the category management screen through in-application navigation on the same origin

#### Scenario: The current section is distinguished

- **WHEN** the category management screen is shown
- **THEN** the menu bar's Manage destination is distinguishable as the current one

#### Scenario: The direct route still opens the screen

- **WHEN** the `/categories` route is loaded
- **THEN** the category management screen is shown

## REMOVED Requirements

### Requirement: The layout carries a menu bar linking the screens

**Reason**: The category screen is no longer a menu-bar destination. The generic menu-bar contract belongs to `frontend-shell`, and this requirement still named the retired analytics and monthly-totals screens.

**Migration**: Reach the category screen from the Transactions screen's category-management link or from the Manage hub, as `The category screen is reached from the transactions screen and the manage hub` defines.
