# Spec Delta

## ADDED Requirements

### Requirement: The people screen is reached at /people through the manage hub

The system SHALL provide the people screen at `/people`. The manage hub SHALL carry an entry to it, and the shared menu bar SHALL mark the Manage destination as the current one when the people screen is shown. Loading the screen SHALL request `GET /api/people` from the same origin and SHALL use that response as the only source of people and counts.

#### Scenario: The route shows the people screen

- **WHEN** the `/people` route is loaded
- **THEN** the people screen is shown and the screen requests `GET /api/people` from the same origin

#### Scenario: The manage hub links to the screen

- **WHEN** the manage hub is shown
- **THEN** its People entry reaches the people screen through in-application navigation on the same origin

#### Scenario: The current section is distinguished

- **WHEN** the people screen is shown
- **THEN** the menu bar's Manage destination is distinguishable as the current one

## REMOVED Requirements

### Requirement: The people screen is reached at /people from the menu bar

**Reason**: People is no longer a dedicated menu-bar destination; it is reached through the Manage hub.

**Migration**: Reach the screen through the Manage hub, as `The people screen is reached at /people through the manage hub` defines.
