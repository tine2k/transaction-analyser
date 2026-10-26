# Spec Delta

## MODIFIED Requirements

### Requirement: The table offers a read-only category-presence filter

The system SHALL offer a person filter with choices for all people and each person represented in the returned transaction data. It SHALL offer a category filter with choices for all categories, uncategorised transactions, and each category represented in the selected person's returned transaction data. It SHALL offer a single period filter with choices for all periods, each calendar month represented by at least one of the selected person's returned transactions that is not a future month, and each calendar year represented by at least one of the selected person's returned transactions that is not a future year. A future month SHALL have no month choice and a future year SHALL have no year choice. The period choices SHALL be presented in two labelled groups: a `Years` group listing each offered calendar year newest first, and a `Months` group listing each offered calendar month newest first, with the months group after the years group. The all-periods choice SHALL appear before both groups. A month choice SHALL be labelled with its calendar month and year, and a year choice SHALL be labelled with its calendar year alone.

The person filter SHALL default to all people. The period filter SHALL default to the browser's current calendar year when the selected person's returned transactions include it, otherwise to the newest calendar year offered by the period choices, and to all periods when the period choices offer no year. The category filter SHALL default to uncategorised when no category is specified and at least one of the selected person's returned transactions in the effective default period has no category; otherwise it SHALL default to all categories. The effective default period is the period named by a supplied query value that the period choices offer, otherwise the period selected by the period default above.

A supplied person SHALL initialize the person control when the choices offer it; an absent, unknown, or unoffered person SHALL select all people. A supplied category and period filter SHALL initialize their controls and matching items when the choices offer them. The selected filters SHALL be represented in the index route's query so a filtered list can be linked to directly: a person as `person=<id>`, a calendar month as `month=YYYY-MM`, and a calendar year as `year=YYYY`. The period filter SHALL match a transaction whose booking date falls in the selected calendar month or calendar year. When a person and a category and/or period are selected and the search is empty, a transaction SHALL be shown only if it matches the person and the other selected filters. A non-empty search SHALL override the category and period filters as the search requirements define, and SHALL NOT override the person filter.

Changing any filter SHALL change which returned items are shown without changing the active sort, making another data request, or creating, altering, or deleting stored data, people, or categories. Changing the person filter SHALL clear the item selection. The list SHALL NOT offer controls for grouping transactions or for Previous/Next pagination. Sorting SHALL be offered through the table headers at desktop widths and through the card-list sort control at phone widths. The Load more control defined by this capability is a batch control, not paging. The category-assignment controls defined by `manual-category-assignment` are not filter controls and remain permitted, and the filter controls themselves SHALL NOT create, alter, or delete stored data.

#### Scenario: The current year is the initial period

- **WHEN** transaction data has loaded, the selected person's returned transactions include the browser's current calendar year, the route has no period filter, and the search is empty
- **THEN** the period filter selects that current year and only that person's transactions whose booking date falls in that year are shown, subject to the category filter

#### Scenario: The newest represented year is the fallback period

- **WHEN** transaction data has loaded, the selected person's returned transactions do not include the browser's current calendar year, a future year is represented, the route has no period filter, and the search is empty
- **THEN** the period filter selects the newest offered calendar year at or before the current year, and the future year is not offered

#### Scenario: No transactions fall back to all periods

- **WHEN** the endpoint returns no transactions, the route has no period filter, and the search is empty
- **THEN** the period filter selects all periods and all categories

#### Scenario: The existing uncategorised default is retained

- **WHEN** transaction data has loaded, the search is empty, and at least one of the selected person's returned transactions in the effective default period has no category
- **THEN** uncategorised is selected and only that person's transactions without a category in that period are shown

#### Scenario: All categories are the initial category when the default period has none uncategorised

- **WHEN** transaction data has loaded, the search is empty, the effective default period holds the selected person's returned transactions, and every one of them has a category
- **THEN** all categories is selected and every one of that person's transactions in that period is shown

#### Scenario: A supplied period determines the uncategorised default

- **WHEN** the route names an offered month or year, no category is specified, the search is empty, and that period holds one of the selected person's uncategorised transactions
- **THEN** the period filter selects that period, uncategorised is selected, and the items are that person's uncategorised transactions in that period

#### Scenario: A supplied category overrides the category default

- **WHEN** the route names an offered category and period and the search is empty
- **THEN** both controls reflect those values and the list shows only the selected person's items matching both, regardless of whether the default period holds an uncategorised transaction

#### Scenario: All categories are selected

- **WHEN** the user selects all categories and the search is empty
- **THEN** the selected person's transactions with and without a category are eligible to be shown, subject to the period filter

#### Scenario: A named category is selected

- **WHEN** the user selects a category and the search is empty
- **THEN** only the selected person's transactions whose category identity matches that selection are eligible to be shown, subject to the period filter

#### Scenario: Uncategorised is selected

- **WHEN** the user selects uncategorised and the search is empty
- **THEN** only the selected person's transactions whose category is null are eligible to be shown, subject to the period filter

#### Scenario: A month is selected

- **WHEN** the user selects a calendar month and the search is empty
- **THEN** only the selected person's transactions whose booking date falls in that month are eligible to be shown, subject to the category filter

#### Scenario: A year is selected

- **WHEN** the user selects a calendar year and the search is empty
- **THEN** only the selected person's transactions whose booking date falls in that year are eligible to be shown, subject to the category filter

#### Scenario: A person is selected

- **WHEN** the user selects a person and the search is empty
- **THEN** only the returned transactions that reference that person are eligible to be shown, subject to the category and period filters

#### Scenario: All people are selected

- **WHEN** the user selects all people and the search is empty
- **THEN** transactions from every person are eligible to be shown, subject to the category and period filters

#### Scenario: The person filter scopes the period choices

- **WHEN** a person is selected whose transactions represent fewer years or months than the complete response
- **THEN** the period choices offer only the years and months represented in that person's transactions

#### Scenario: The person filter scopes the category choices and counts

- **WHEN** a person is selected
- **THEN** the category choices and their counts describe that person's returned transactions, not the complete response

#### Scenario: Changing the person clears the selection

- **WHEN** the user selects a different person after selecting items
- **THEN** no item remains selected and the bulk assignment bar is no longer shown

#### Scenario: Period choices are grouped and labelled

- **WHEN** transaction data has loaded and the period filter is inspected
- **THEN** its choices present a `Years` group and a `Months` group with the all-periods choice outside both groups

#### Scenario: Period choices list only represented periods in newest-first order

- **WHEN** the selected person's returned transactions span more than one calendar year and only some of those years' months
- **THEN** the period choices include all periods, each represented month, and each represented year, with the years group listing the represented years newest first, the months group listing the represented months newest first after the years group, and months with no returned transaction for that person excluded

#### Scenario: Filter links initialize the person filter

- **WHEN** the index route is opened with a person in its query and the choices offer that person
- **THEN** the person control reflects that person and the list shows only that person's items

#### Scenario: An unknown person falls back to all people

- **WHEN** the query carries a person that no choice offers
- **THEN** the person filter selects all people

#### Scenario: Filter links initialize both filters

- **WHEN** the index route is opened with a category and a month in its query and the search is empty
- **THEN** both controls reflect those values and the list shows only items matching both within the selected person

#### Scenario: A year link initializes the period filter

- **WHEN** the index route is opened with a category and a year in its query and the search is empty
- **THEN** the period control reflects that year and the list shows only items in that year matching the category within the selected person

#### Scenario: Future months have no period choice

- **WHEN** the selected person has returned transactions in the current month and in a later month of the current year
- **THEN** the months group offers the current month and does not offer the later month

#### Scenario: Future years have no period choice

- **WHEN** the selected person has returned transactions in a future calendar year
- **THEN** the years group does not offer that year, the months group offers none of its months, and its transactions remain visible only when the selected view includes them

#### Scenario: A future period link falls back

- **WHEN** the query carries a month or year after the current month or year and the search is empty
- **THEN** that value is unoffered, so the period filter falls back to the period default or to all periods as an unknown period does

#### Scenario: Future-dated rows remain in an all-periods view

- **WHEN** all periods is selected and the selected person has a transaction dated after the current month
- **THEN** that transaction remains eligible to be shown

#### Scenario: Future-dated rows remain in search results

- **WHEN** a non-empty search matches a transaction dated after the current month
- **THEN** that transaction is shown while the search is applied

#### Scenario: An unknown period value falls back to all periods

- **WHEN** the query carries a month or year that no period choice offers and no transaction is returned
- **THEN** the period filter selects all periods

#### Scenario: An unknown period value falls back to the period default

- **WHEN** the query carries a month or year that no period choice offers and at least one transaction is returned
- **THEN** the period filter selects the default period for the selected person's returned transactions

#### Scenario: Returning to all categories clears the category restriction

- **WHEN** the user selects all categories after selecting a named category or uncategorised while the search is empty
- **THEN** the selected person's transactions from every category are eligible to be shown, subject to the period filter

#### Scenario: Filtering preserves endpoint order and stored data

- **WHEN** any filter is changed while no sort is active and the search is empty
- **THEN** matching items remain in the order returned by the endpoint, no additional data request is made, and no stored data changes

#### Scenario: Filtering preserves the active sort

- **WHEN** any filter is changed while a sort is active and the search is empty
- **THEN** matching items remain in the active sort order, the sort stays in the route query, no additional data request is made, and no stored data changes

#### Scenario: No unrelated table controls are added

- **WHEN** the list is rendered
- **THEN** it presents no control for grouping the transactions and no Previous/Next pagination, the search field defined by this capability is the only searching control, sorting is offered only by the table headers or the card-list sort control, Load more only appends a batch, and the only controls that change stored data are the category-assignment controls, which change no category

