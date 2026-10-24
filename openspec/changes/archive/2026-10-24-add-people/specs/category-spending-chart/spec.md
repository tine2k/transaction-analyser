# Spec Delta

## MODIFIED Requirements

### Requirement: Monthly chart headings and pie slices link to matching transactions

Each monthly chart heading SHALL be a link to the transaction list with that month selected, all
categories selected, and the page's selected person selected. Each pie slice SHALL be an interactive
link to the transaction list with that slice's month, category, and the page's selected person
selected. A named category link SHALL identify the category by its returned identity; the
uncategorised slice SHALL link to the uncategorised filter. When all people are selected, the link
SHALL carry no person value. The month SHALL be the same calendar month represented by the panel,
based on booking date. Opening either link SHALL show the transaction list with its filters
initialized from the link, without changing stored data or making the chart require another
transaction data source.

#### Scenario: A month heading opens all transactions from that month

- **WHEN** the user activates a monthly chart heading
- **THEN** the transaction list opens with that month, all categories, and the selected person selected

#### Scenario: A named category slice opens matching monthly transactions

- **WHEN** the user activates a named category slice in a month's chart
- **THEN** the transaction list opens filtered to that month, the slice's category, and the selected person

#### Scenario: An uncategorised slice opens matching monthly transactions

- **WHEN** the user activates an uncategorised slice in a month's chart
- **THEN** the transaction list opens filtered to that month, uncategorised transactions, and the selected person

#### Scenario: All people omits the person value

- **WHEN** the page has all people selected and a month or slice link is followed
- **THEN** the transaction list opens with no person filter, showing every person's matching transactions

#### Scenario: Chart navigation remains read-only

- **WHEN** the user follows a month or slice link
- **THEN** navigation only reads the existing transaction data and does not create, alter, or delete stored data

### Requirement: Year chart headings link to all transactions from that year

Each year chart heading SHALL be a link to the transaction list with that calendar year selected, all
categories selected, and the page's selected person selected. When all people are selected, the link
SHALL carry no person value. The year SHALL be the calendar year represented by the panel, based on
booking date. Opening the link SHALL show the transaction list with its filters initialized from the
link, without changing stored data or making the chart require another transaction data source.

#### Scenario: A year heading opens all transactions from that year

- **WHEN** the user activates a year chart heading
- **THEN** the transaction list opens with that year, all categories, and the selected person selected

#### Scenario: Year heading navigation remains read-only

- **WHEN** the user follows a year heading link
- **THEN** navigation only reads the existing transaction data and does not create, alter, or delete stored data

### Requirement: Year pie slices link to matching transactions

Each pie slice SHALL be an interactive link to the transaction list with that slice's calendar year,
category, and the page's selected person selected. A named category link SHALL identify the category
by its returned identity; the uncategorised slice SHALL link to the uncategorised filter. When all
people are selected, the link SHALL carry no person value. Opening the link SHALL show the
transaction list with its filters initialized from the link, without changing stored data or making
the chart require another transaction data source.

#### Scenario: A named category slice opens matching yearly transactions

- **WHEN** the user activates a named category slice in a year's chart
- **THEN** the transaction list opens filtered to that year, the slice's category, and the selected person

#### Scenario: An uncategorised slice opens matching yearly transactions

- **WHEN** the user activates an uncategorised slice in a year's chart
- **THEN** the transaction list opens filtered to that year, uncategorised transactions, and the selected person

#### Scenario: All people omits the person value

- **WHEN** the page has all people selected and a year slice link is followed
- **THEN** the transaction list opens with no person filter, showing every person's matching transactions

## ADDED Requirements

### Requirement: The analytics page offers a page-wide person filter

The analytics page SHALL offer a page-wide person filter selecting `All people` or one person
represented in the returned transactions. It SHALL default to `All people`, apply to both views, and
be independent of the expense-type and hide-uncategorised controls. Changing it SHALL recompute every
panel from the already-fetched transactions without another request. The selection SHALL be carried
in the route query as `person=<id>`; an absent or unknown person SHALL mean all people.

#### Scenario: All people is the default

- **WHEN** the analytics page loads without a person in its query
- **THEN** the person control reads `All people` and every returned transaction is eligible

#### Scenario: A named person scopes every panel

- **WHEN** a person is selected
- **THEN** only the returned transactions that reference that person contribute to any panel, slice, or visible total

#### Scenario: The filter applies to both views

- **WHEN** the view is switched between months and years
- **THEN** the selected person stays in effect for the presented panels

#### Scenario: The filter is independent of expense type

- **WHEN** the expense type is changed
- **THEN** the selected person stays in effect, and changing the person leaves the expense type unchanged

#### Scenario: Selecting does not re-fetch

- **WHEN** the person selection changes
- **THEN** every panel is recomputed from the already-fetched transactions and no additional data request is made

#### Scenario: The selection is linkable

- **WHEN** the analytics route is opened with `person=<id>` naming a represented person
- **THEN** the person control selects that person and the panels show only that person's transactions

#### Scenario: An unknown person falls back to all

- **WHEN** the route carries a person that no returned transaction represents
- **THEN** the person control selects all people

#### Scenario: The person choices come from the response

- **WHEN** the person control is inspected
- **THEN** it offers all people and each person represented in the returned transactions, and it makes no request other than the existing transaction read

#### Scenario: A person with no data in a panel is explained

- **WHEN** the selected person has no eligible transaction in a month or year
- **THEN** that panel remains present and explains that there is no category data, without inventing a slice or total

#### Scenario: Hiding uncategorised applies within the person

- **WHEN** a person is selected and `Uncategorised` is hidden
- **THEN** only that person's uncategorised amounts are omitted, and other people's transactions do not reappear
