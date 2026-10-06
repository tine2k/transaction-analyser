# Spec Delta

## REMOVED Requirements

### Requirement: Assignment runs whenever the stored categories change

**Reason**: Assignment now also runs when an import writes transactions, and a newly stored transaction no longer waits for the next change to the category set. The requirement is replaced by one requirement for each trigger.

**Migration**: No schema or data change. A category create, edit, or delete still re-evaluates every stored transaction exactly as before. A transaction imported before this change keeps the null category it holds until the next category change.

## ADDED Requirements

### Requirement: A category change re-evaluates every stored transaction

When the set of stored categories changes, by a create, an edit, or a delete, the system SHALL re-evaluate every stored transaction and set its category to the category that wins the matching among the categories as they now stand, or leave it uncategorised when no category matches. The evaluation SHALL be part of the same operation that changed the categories, so no transaction is left categorised by an expression that no longer matches it.

#### Scenario: Creating a category assigns it to matching transactions

- **WHEN** a category is created whose expression matches the purpose line of a previously uncategorised transaction
- **THEN** that transaction holds the new category once the create has succeeded

#### Scenario: Editing a category re-evaluates every transaction

- **WHEN** a category's expression is changed so that it matches purpose lines it did not match before, and stops matching others
- **THEN** transactions are reassigned to or away from it to agree with the new expression

#### Scenario: A deleted category is not left on any transaction

- **WHEN** a category is deleted
- **THEN** no transaction holds it afterwards

### Requirement: An import assigns categories to the rows it writes

When an import writes transactions, the system SHALL evaluate each newly written transaction against the stored categories: a regular expression match is considered before a date window, and among matching categories the smallest identity wins. The transaction SHALL hold the winning category, or read as uncategorised when nothing matches. The evaluation SHALL cover only the rows the import wrote and SHALL be part of the write's single unit.

#### Scenario: A new transaction matching an expression is categorised as it is imported

- **WHEN** an import writes a transaction whose purpose line matches a stored category's expression
- **THEN** the written transaction holds that category once the import has succeeded

#### Scenario: A new transaction covered by a window is categorised as it is imported

- **WHEN** an import writes a transaction that no stored expression matches but a stored category's date window covers by its booking date
- **THEN** the written transaction holds that window's category

#### Scenario: A new transaction that matches nothing is uncategorised

- **WHEN** an import writes a transaction that no stored expression matches and no stored window covers
- **THEN** the written transaction reads as uncategorised, and stays so until the next change to the category set

#### Scenario: The import does not re-evaluate a transaction it did not write

- **WHEN** the table already holds an uncategorised transaction from an earlier import and a later import writes other rows that match a stored category
- **THEN** only the later import's rows are categorised, and the earlier transaction still reads as uncategorised

#### Scenario: A failure leaves no assignment

- **WHEN** an import fails while writing or evaluating its rows
- **THEN** no transaction of that import exists and no stored transaction's category was changed
