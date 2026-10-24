# Spec Delta

## ADDED Requirements

### Requirement: The monthly average page offers a page-wide person filter

The monthly average page SHALL offer a page-wide person filter selecting `All people` or one person
represented in the returned transactions. It SHALL default to `All people` and be independent of the
month-count window and expense-type controls. Changing it SHALL recompute every average from the
already-fetched transactions without another request. The selection SHALL be carried in the route
query as `person=<id>`; an absent or unknown person SHALL mean all people.

#### Scenario: All people is the default

- **WHEN** the monthly average page loads without a person in its query
- **THEN** the person control reads `All people` and every returned transaction is eligible

#### Scenario: A named person scopes every average

- **WHEN** a person is selected
- **THEN** only the returned transactions that reference that person contribute to any category's sum or average

#### Scenario: The filter is independent of the window

- **WHEN** the month-count window changes
- **THEN** the selected person stays in effect, and changing the person leaves the window unchanged

#### Scenario: The filter is independent of expense type

- **WHEN** the expense type is changed
- **THEN** the selected person stays in effect, and changing the person leaves the expense type unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the person selection changes
- **THEN** every average is recomputed from the already-fetched transactions and no additional data request is made

#### Scenario: The selection is linkable

- **WHEN** the monthly average route is opened with `person=<id>` naming a represented person
- **THEN** the person control selects that person and the list shows only that person's averages

#### Scenario: An unknown person falls back to all

- **WHEN** the route carries a person that no returned transaction represents
- **THEN** the person control selects all people

#### Scenario: The person choices come from the response

- **WHEN** the person control is inspected
- **THEN** it offers all people and each person represented in the returned transactions, and it makes no request other than the existing transaction read

#### Scenario: A person with no data is explained

- **WHEN** the selected person has no eligible transaction within the window
- **THEN** the page shows no category entries and states that there is no category data
