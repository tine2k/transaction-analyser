# Spec Delta

## MODIFIED Requirements

### Requirement: The displayed transaction count accompanies the sum

The system SHALL display, as the summary's primary figure, the number of transaction rows currently shown, with the sum of those rows presented as secondary information beneath it. The count SHALL cover the same rows as the sum, SHALL change when the visible rows change, and SHALL NOT describe the complete endpoint response while a filter is active. The count SHALL be labelled as a count of transactions, using singular wording for exactly one visible transaction and plural wording otherwise, and SHALL be zero when no row is visible. The count SHALL precede the sum in the summary's reading order and SHALL use the summary's largest type and the primary ink colour, capped at the interface type scale's `text-xl` step (1.25rem) so it stays at that size at every viewport width rather than growing to page-title scale.

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

#### Scenario: The count is the summary's most prominent figure

- **WHEN** the summary is rendered with at least one visible transaction
- **THEN** the count uses a larger type size and the primary ink colour, and the sum uses smaller muted type

#### Scenario: The count precedes the sum

- **WHEN** the summary is read in document order
- **THEN** the transaction count comes before the sum of displayed transactions

#### Scenario: The count keeps its prominence for every visible row count

- **WHEN** the visible rows change so the count is one, many, or zero
- **THEN** the count remains the summary's primary figure with the appropriate singular or plural wording, and the sum remains secondary

#### Scenario: The count stays compact at every viewport

- **WHEN** the summary is rendered on a narrow or a wide viewport
- **THEN** the count renders at the `text-xl` step of 20px in both cases, without scaling up at the wider viewport, while the sum remains smaller and muted
