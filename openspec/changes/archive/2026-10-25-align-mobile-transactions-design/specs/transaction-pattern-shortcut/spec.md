# Spec Delta

## MODIFIED Requirements

### Requirement: The transactions screen offers an action bar for a valid selection

The system SHALL present a fixed action bar when the user selects at least three characters, after trimming, inside a single field of a transaction table row or a single field of a phone transaction card. The bar SHALL show the captured text and the stored categories. It SHALL NOT appear when the trimmed selection is shorter than three characters, spans more than one field or item, or lies outside the transaction list. It SHALL hide when the selection is cleared, unless its category control holds focus, in which case it SHALL remain.

#### Scenario: A valid selection shows the bar

- **WHEN** the user selects at least three characters inside one cell of the transactions table or one field of a phone transaction card
- **THEN** the action bar appears showing the captured text and the stored categories

#### Scenario: A short selection shows no bar

- **WHEN** the trimmed selection is shorter than three characters
- **THEN** no action bar appears

#### Scenario: A multi-cell selection shows no bar

- **WHEN** the selection spans more than one table cell or more than one field of a card
- **THEN** no action bar appears

#### Scenario: A selection outside the table shows no bar

- **WHEN** the user selects text outside the transactions table or card list
- **THEN** no action bar appears

#### Scenario: A valid card-field selection captures the card

- **WHEN** the user selects at least three characters inside one field of a phone transaction card
- **THEN** the action bar appears with the captured text and the transaction that card represents

#### Scenario: The bar remains while its control has focus

- **WHEN** the user focuses the bar's category control and the document selection collapses
- **THEN** the bar still shows the captured text and offers the categories

#### Scenario: The bar hides when the selection is cleared

- **WHEN** the selection is cleared while the bar's category control does not hold focus
- **THEN** the action bar is hidden
