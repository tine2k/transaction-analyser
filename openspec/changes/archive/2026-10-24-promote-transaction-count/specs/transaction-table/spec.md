# Spec Delta

## MODIFIED Requirements

### Requirement: The table shows the exact sum of visible transaction amounts

The system SHALL display a sum for the transaction rows currently shown after applying the active filters. The sum SHALL be the signed arithmetic total of those rows' returned decimal amounts, SHALL be computed with exact decimal arithmetic without floating-point rounding, and SHALL change when the visible rows change. The system SHALL present the sum using the browser's active locale's EUR currency and number conventions, including locale-appropriate thousands grouping and currency placement, while preserving the exact decimal value without rounding it. The sum SHALL be presented separately from the transaction columns and SHALL NOT alter or imply a stored transaction value. The sum SHALL be presented as secondary information beneath the displayed transaction count: its label and value SHALL use smaller type and the muted text colour, and it SHALL NOT compete with the count for visual emphasis. When no row is visible, the sum SHALL be zero, presented as a locale-formatted euro zero.

#### Scenario: The sum reflects only visible rows

- **WHEN** visible rows have amounts `-12.50` and `4.00` while another filtered-out row has amount `100.00`
- **THEN** the displayed sum is the locale-formatted euro value of `-8.50`

#### Scenario: The sum preserves exact decimal values

- **WHEN** visible rows have amounts `0.01` and `-0.02`
- **THEN** the displayed sum is the locale-formatted euro value of `-0.01`, without floating-point approximation or rounding

#### Scenario: The sum follows locale currency conventions

- **WHEN** the visible rows have a sum large enough to be grouped under the active locale
- **THEN** the displayed sum uses that locale's EUR currency and number conventions, including thousands grouping, and its sign remains readable

#### Scenario: No visible transactions have a zero sum

- **WHEN** the active filters match no transaction
- **THEN** the table's displayed sum is a locale-formatted euro zero

#### Scenario: The sum is secondary to the count

- **WHEN** the summary is rendered with at least one visible transaction
- **THEN** the sum is presented beneath the count in smaller type and the muted text colour, while the count carries the summary's primary emphasis

#### Scenario: The secondary placement survives filtering

- **WHEN** the user changes a filter and the visible rows and their sum change
- **THEN** the updated sum remains secondary to the count rather than becoming the summary's dominant figure

### Requirement: The displayed transaction count accompanies the sum

The system SHALL display, as the summary's primary figure, the number of transaction rows currently shown, with the sum of those rows presented as secondary information beneath it. The count SHALL cover the same rows as the sum, SHALL change when the visible rows change, and SHALL NOT describe the complete endpoint response while a filter is active. The count SHALL be labelled as a count of transactions, using singular wording for exactly one visible transaction and plural wording otherwise, and SHALL be zero when no row is visible. The count SHALL precede the sum in the summary's reading order and SHALL use the summary's largest type and the primary ink colour, so the number of rows is read before the money they total.

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
