# Spec Delta

## ADDED Requirements

### Requirement: The displayed transaction count accompanies the sum

The system SHALL display, adjacent to the sum of visible transactions, the number of transaction rows currently shown. The count SHALL cover the same rows as the sum, SHALL change when the visible rows change, and SHALL NOT describe the complete endpoint response while a filter is active. The count SHALL be labelled as a count of transactions, using singular wording for exactly one visible transaction and plural wording otherwise, and SHALL be zero when no row is visible.

#### Scenario: The count matches the visible rows the sum covers

- **WHEN** the endpoint returns four transactions and the active filters show two rows while the other two are filtered out
- **THEN** the displayed transaction count is 2, describing the same rows as the sum

#### Scenario: The count follows the active filters

- **WHEN** the user changes a filter so the visible rows change
- **THEN** the displayed transaction count changes to the new number of visible rows together with the sum

#### Scenario: One visible transaction uses singular wording

- **WHEN** exactly one transaction row is visible
- **THEN** the count is presented with singular transaction wording, such as `1 transaction`

#### Scenario: No visible transactions show a zero count

- **WHEN** the active filters match no transaction
- **THEN** the displayed transaction count is 0, the sum remains a locale-formatted euro zero, and the empty state is shown
