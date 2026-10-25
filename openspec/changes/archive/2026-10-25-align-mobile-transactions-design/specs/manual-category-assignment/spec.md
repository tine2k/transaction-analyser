# Spec Delta

## MODIFIED Requirements

### Requirement: The transactions table offers a per-row category select

The category area of every transaction row or card SHALL offer an assignment control: a select whose choices are the stored categories — each hidden category marked as hidden — and an `Uncategorised` choice. Choosing a stored category SHALL invoke the assignment operation for that transaction and that category; choosing `Uncategorised` SHALL invoke it with `null`, clearing any manual assignment. The browser SHALL NOT create a category, evaluate a regular expression, or decide an assignment itself.

#### Scenario: Choosing a category assigns the row

- **WHEN** a stored category is chosen in a row's assignment control
- **THEN** the assignment operation is invoked with that transaction and that category

#### Scenario: Choosing Uncategorised clears the manual assignment

- **WHEN** `Uncategorised` is chosen in a manually assigned row's control
- **THEN** the assignment operation is invoked with that transaction and no category, and the row falls back to the matching rule

#### Scenario: Choosing Uncategorised on a rule-derived row changes nothing

- **WHEN** `Uncategorised` is chosen in a row that is assigned by the matching rule
- **THEN** no manual assignment is invented and the row stays with the category the rule selects

#### Scenario: Hidden categories are offered and marked

- **WHEN** a stored category is hidden and a row's control is inspected
- **THEN** the hidden category is among the choices and is marked as hidden

#### Scenario: The control creates no category

- **WHEN** a category is chosen in a row's control
- **THEN** no category is created and the server performs the assignment

#### Scenario: A phone card offers the same assignment control

- **WHEN** a transaction is presented as a phone card
- **THEN** its category area offers the same stored categories, hidden markers, `Uncategorised` choice, and assignment behavior as the table row

### Requirement: The table offers row selection with a select-all control

The transaction list SHALL give each transaction row or card a selection checkbox. The desktop table SHALL carry a select-all checkbox in its header, and the phone card list SHALL carry a select-all checkbox in the toolbar above the cards. The select-all control SHALL select every item currently shown and SHALL clear the selection when every shown item is already selected, and it SHALL reflect whether all, some, or none of the shown items are selected. Changing the category or period filter SHALL clear the selection, so no item that is no longer shown remains selected.

#### Scenario: The header control selects every shown row

- **WHEN** the table header select-all control is used and not every shown row is selected
- **THEN** every row currently shown becomes selected

#### Scenario: The header control clears the selection

- **WHEN** every shown item is selected and the header or card-toolbar control is used
- **THEN** no item remains selected

#### Scenario: A partial selection is reflected

- **WHEN** some but not all shown items are selected
- **THEN** the header or card-toolbar select-all control reflects that only part of the shown items are selected

#### Scenario: A filter change clears the selection

- **WHEN** the category or period filter changes while items are selected
- **THEN** no item remains selected

#### Scenario: The phone toolbar control selects every shown card

- **WHEN** the card toolbar select-all control is used and not every shown card is selected
- **THEN** every card currently shown becomes selected
