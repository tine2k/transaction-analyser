# Spec Delta

## MODIFIED Requirements

### Requirement: The category management surface re-evaluates every stored transaction on demand

The system SHALL provide an operation on the category management surface that re-evaluates every
stored transaction that is not manually assigned against the stored categories and sets each such
transaction's category to the one the `category-assignment` rule selects, or leaves it
uncategorised. A manually assigned transaction SHALL be left exactly as it is and SHALL NOT be
counted. The operation SHALL answer with the number of transactions whose category changed, and
SHALL be idempotent: repeated with no intervening change it SHALL report zero.

#### Scenario: A previously uncategorised transaction gains a category

- **WHEN** the current categories match a stored uncategorised transaction and the operation runs
- **THEN** the transaction holds the selected category and the operation reports it as changed

#### Scenario: A transaction whose match has gone becomes uncategorised

- **WHEN** a stored categorised transaction matches no current category and the operation runs
- **THEN** its category reads as absent and the operation reports it as changed

#### Scenario: A transaction moves between categories

- **WHEN** the selected category for a stored transaction differs from the one it holds and the operation runs
- **THEN** the transaction holds the selected category and is reported as changed

#### Scenario: An unchanged assignment is not counted

- **WHEN** a stored transaction already holds the category the rule selects and the operation runs
- **THEN** the operation does not count it as changed

#### Scenario: A manually assigned transaction is left untouched and uncounted

- **WHEN** a manually assigned transaction's category differs from the one the rule would select and the operation runs
- **THEN** the transaction keeps the category its manual assignment names, keeps its manual assignment, and is not counted as changed

#### Scenario: A repeat reports zero

- **WHEN** the operation runs twice with no intervening change
- **THEN** the second run reports zero changed

#### Scenario: An empty table reports zero

- **WHEN** no transaction is stored and the operation runs
- **THEN** the operation reports zero changed and does not fail
