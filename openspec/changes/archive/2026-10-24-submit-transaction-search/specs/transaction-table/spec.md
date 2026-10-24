# Spec Delta

## MODIFIED Requirements

### Requirement: The table offers an all-transactions search field

The system SHALL offer a labelled text field on the index route that searches every transaction returned by the read endpoint, matching its text against purpose, counterparty name, and counterparty account. It SHALL provide a control that clears its text. The field's text SHALL take effect only through the search action defined by this capability.

#### Scenario: The field is offered and named

- **WHEN** transaction data has loaded successfully
- **THEN** the page shows a text field labelled as a search of all transactions

#### Scenario: Purpose text matches

- **WHEN** the user submits `market` and a returned transaction's purpose contains `Market`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty name matches

- **WHEN** the user submits `rail` and a returned transaction's counterparty name contains `Rail`
- **THEN** that transaction's row is shown

#### Scenario: Counterparty account matches

- **WHEN** the user submits digits that occur in a returned transaction's counterparty account
- **THEN** that transaction's row is shown

#### Scenario: Letter case and diacritics are ignored

- **WHEN** the user submits `muller` and a returned transaction's counterparty name is `Müller`
- **THEN** that transaction's row is shown

#### Scenario: Every term must match the descriptive text

- **WHEN** the user submits two whitespace-separated terms and only one occurs in a returned transaction's descriptive text
- **THEN** that transaction's row is not shown

#### Scenario: Searching makes no request and changes no data

- **WHEN** the user applies or clears a search
- **THEN** no additional data request is made and no stored transaction or category is created, altered, or deleted

### Requirement: A non-empty search covers every returned transaction

While an applied search holds non-whitespace text, the system SHALL consider every transaction returned by the read endpoint and SHALL ignore the category and period filters for row selection. The filter controls SHALL remain visible with their stored values, SHALL be unavailable for interaction, and SHALL be accompanied by a visible statement that filtering is paused. Clearing the applied search SHALL restore the previously selected filters and the rows they produced. Editing the field without applying it SHALL leave the rows and the filter state unchanged.

#### Scenario: A match outside the selected filters is shown

- **WHEN** an applied search matches a returned transaction whose category or booking date does not match the selected filters
- **THEN** its row is shown while that search is applied

#### Scenario: Filters are visibly paused

- **WHEN** an applied search is non-empty
- **THEN** the category and period controls show their stored values, cannot be interacted with, and a visible statement says that filtering is paused

#### Scenario: Clearing restores the filtered view

- **WHEN** the user clears an applied search
- **THEN** the category and period controls become interactive again, keep the values they held before the search, and the table shows the rows those filters produce

#### Scenario: Whitespace-only search does not override the filters

- **WHEN** the user submits a field containing only whitespace
- **THEN** it is treated as empty and the category and period filters continue to select the rows

#### Scenario: Editing without applying leaves the filtered view

- **WHEN** the user types into the field without applying it and no search is applied
- **THEN** the category and period filters remain interactive and the table shows the same rows as before

#### Scenario: Search preserves the active sort

- **WHEN** the user applies a search while a sort is active
- **THEN** the matching rows are ordered by that sort, and clearing the search keeps the sort active

### Requirement: The search is reflected in the index route's query

The system SHALL represent the applied, trimmed search text in the index route's query as `q` and SHALL initialize the search field and its matching rows from that value. An absent or blank `q` SHALL mean no search. Applying or clearing a search SHALL update `q`; typing into the field SHALL NOT. Applying or clearing a search SHALL preserve the category, period, and sort query values.

#### Scenario: A search link initializes the field and rows

- **WHEN** the index route is opened with a `q` value
- **THEN** the search field shows that text and the table shows only the matching transactions

#### Scenario: Typing updates the query

- **WHEN** the user types search text and applies it
- **THEN** the route query carries the trimmed text as `q`

#### Scenario: Typing does not update the query

- **WHEN** the user types into the search field without applying it
- **THEN** the route query carries the previously applied `q` value, or no `q` when no search was applied

#### Scenario: Clearing removes the query value

- **WHEN** the user clears the search field
- **THEN** the route query carries no `q`

#### Scenario: A reload keeps the search

- **WHEN** the page is reloaded after a search was applied
- **THEN** the search field shows the same text and the same matching rows are shown

#### Scenario: The query keeps the other view controls

- **WHEN** the user applies or clears a search
- **THEN** the category, period, and sort values in the route query are unchanged

### Requirement: Search results drive the summary, count, empty state, and selection

The visible sum and transaction count SHALL cover exactly the rows the applied search shows. When the applied search matches no transaction, the system SHALL state that no transactions match the search, distinct from the empty-response and filter-empty states. Applying or clearing a search SHALL clear the row selection; typing into the field SHALL NOT. The category option counts SHALL continue to describe the whole endpoint response.

#### Scenario: The sum and count cover the matches only

- **WHEN** an applied search matches two of the returned transactions
- **THEN** the displayed sum and transaction count cover exactly those two rows

#### Scenario: No match is explained

- **WHEN** an applied search matches no returned transaction
- **THEN** the page states that no transactions match the search, and the sum is a locale-formatted euro zero with a zero count

#### Scenario: Changing the search clears the selection

- **WHEN** the user applies or clears a search after selecting rows
- **THEN** no row remains selected and the bulk assignment bar is no longer shown

#### Scenario: Typing does not clear the selection

- **WHEN** the user types into the search field without applying it after selecting rows
- **THEN** the selected rows and the bulk assignment bar remain unchanged

#### Scenario: Select-all covers the matches

- **WHEN** the user activates the select-all control while a search is applied
- **THEN** exactly the rows the applied search shows are selected

#### Scenario: Option counts keep describing the whole response

- **WHEN** a search is applied
- **THEN** the all-transactions and uncategorised option counts still describe the complete endpoint response rather than only the matches

## ADDED Requirements

### Requirement: The search is applied by an explicit search action

The system SHALL provide a labelled search action beside the field. Activating the action SHALL apply the field's trimmed text, and pressing Enter in the field SHALL do the same. The visible rows, paused-filter state, summary, count, empty state, route query, and selection SHALL change only when a search is applied or cleared. Applying an empty or whitespace-only field SHALL clear the applied search.

#### Scenario: The search action is offered

- **WHEN** transaction data has loaded successfully
- **THEN** the page shows a button labelled as searching beside the search field

#### Scenario: Typing alone applies nothing

- **WHEN** the user types into the field without activating the search action
- **THEN** the visible rows, sum, count, empty state, filter controls, route query, and row selection remain unchanged

#### Scenario: The button applies the draft

- **WHEN** the user activates the search button with text in the field
- **THEN** the matching rows are shown, the filters are paused when the text is non-empty, and the route query carries that text as `q`

#### Scenario: Enter applies the draft

- **WHEN** the user presses Enter in the search field with text in it
- **THEN** the same search is applied as activating the search button

#### Scenario: An empty submission clears the applied search

- **WHEN** the user applies a field that is empty or whitespace-only while a search is applied
- **THEN** the applied search is cleared, `q` is removed, and the category and period filters select the rows again
