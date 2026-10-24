# Spec Delta

## MODIFIED Requirements

### Requirement: Populated monthly totals cells link to their transactions

The system SHALL render each monthly totals cell that displays an amount as a link to the
transactions screen at `/`. The link SHALL carry the cell's calendar month as `month=YYYY-MM`, the
cell's category as a `category` query value — the category identity for a named category column, or
`uncategorised` for the `Uncategorised` column — and the page's selected person as `person=<id>` when
a person is selected. When all people are selected, the link SHALL carry no person value. The query
values SHALL match the transaction screen's existing filter query contract, so opening the link
initializes that screen's month, category, and person filters to the cell's month, category, and
person and shows only the matching transactions. A cell whose exact sum is zero SHALL continue to
display no amount and SHALL NOT be a link. The system SHALL NOT change the cell's displayed total,
the table's month or category order, the single read request, or any stored data.

#### Scenario: A populated named-category cell links to its month and category

- **WHEN** a cell for category identity `1` and month `2026-09` displays a nonzero amount
- **THEN** the cell is a link to the transactions screen for month `2026-09`, category `1`, and the selected person when one is selected

#### Scenario: The uncategorised cell links with the uncategorised value

- **WHEN** an `Uncategorised` column cell displays a nonzero amount
- **THEN** the cell is a link to the transactions screen for the cell's month, the uncategorised category value, and the selected person when one is selected

#### Scenario: Opening a cell link initializes both filters

- **WHEN** a populated cell's link is opened
- **THEN** the transactions screen shows its month, category, and person filters set to the cell's month, category, and person, and lists only the transactions matching all of them

#### Scenario: All people omits the person value

- **WHEN** the page has all people selected and a populated cell's link is opened
- **THEN** the transactions screen opens with no person filter, showing every person's matching transactions

#### Scenario: A blank cell is not a link

- **WHEN** a category-month cell has an exact sum of zero and displays no amount
- **THEN** the cell is not a link and offers no interactive affordance

#### Scenario: Linked cells have a hover affordance

- **WHEN** the pointer is over a linked monthly totals cell
- **THEN** the cell presents a hover affordance that marks it as interactive, and blank cells present no such affordance

#### Scenario: Links add no data access or stored-data change

- **WHEN** the monthly totals page renders its links or a link is activated
- **THEN** the page still makes only its one existing transaction read request, and no stored data or category is created, altered, or deleted

## ADDED Requirements

### Requirement: The monthly totals page offers a page-wide person filter

The monthly totals page SHALL offer a page-wide person filter selecting `All people` or one person
represented in the returned transactions. It SHALL default to `All people` and be independent of the
expense-type control. Changing it SHALL rebuild the table from the already-fetched transactions
without another request. The selection SHALL be carried in the route query as `person=<id>`; an
absent or unknown person SHALL mean all people.

#### Scenario: All people is the default

- **WHEN** the monthly totals page loads without a person in its query
- **THEN** the person control reads `All people` and every returned transaction is eligible

#### Scenario: A named person scopes the table

- **WHEN** a person is selected
- **THEN** only the returned transactions that reference that person contribute to any cell or category column

#### Scenario: The filter is independent of expense type

- **WHEN** the expense type is changed
- **THEN** the selected person stays in effect, and changing the person leaves the expense type unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the person selection changes
- **THEN** the table is rebuilt from the already-fetched transactions and no additional data request is made

#### Scenario: The selection is linkable

- **WHEN** the monthly totals route is opened with `person=<id>` naming a represented person
- **THEN** the person control selects that person and the table shows only that person's transactions

#### Scenario: An unknown person falls back to all

- **WHEN** the route carries a person that no returned transaction represents
- **THEN** the person control selects all people

#### Scenario: The person choices come from the response

- **WHEN** the person control is inspected
- **THEN** it offers all people and each person represented in the returned transactions, and it makes no request other than the existing transaction read

#### Scenario: A person with no data is explained

- **WHEN** the selected person has no eligible transaction
- **THEN** the table shows no month rows or category columns and explains that there is no category data
