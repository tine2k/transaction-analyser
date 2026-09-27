# Spec Delta

## MODIFIED Requirements

### Requirement: The table offers a read-only category-presence filter

The system SHALL offer a control to select either all transactions or only transactions without a category. The uncategorised-only option SHALL be selected by default when transaction data has loaded and the user has not changed the filter. Changing the selection SHALL change which returned rows are shown without changing their relative order, making another data request, or creating, altering, or deleting any stored data or category. The table SHALL NOT offer controls for searching, sorting, grouping, or paging transactions.

#### Scenario: Uncategorised transactions is the initial selection

- **WHEN** transaction data has loaded and the user has not changed the filter
- **THEN** the uncategorised-only option is selected and only transactions without a category are shown

#### Scenario: The all-transactions filter is applied

- **WHEN** the user selects the all-transactions option
- **THEN** every returned transaction is shown

#### Scenario: The uncategorised filter is applied

- **WHEN** the user selects the option for transactions without a category
- **THEN** only transactions whose category is null are shown

#### Scenario: Filtering preserves endpoint order and stored data

- **WHEN** either filter option is selected
- **THEN** matching rows remain in the order returned by the endpoint, no additional request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the table is rendered
- **THEN** it presents no control for searching, sorting, grouping, or paging the transactions, and no control creates, alters, or deletes transaction or category data
