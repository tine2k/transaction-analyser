# Spec Delta

## MODIFIED Requirements

### Requirement: A category change re-evaluates every stored transaction

When the set of stored categories changes, by a create, an edit, or a delete, the system SHALL re-evaluate every stored transaction that is not manually assigned and set its category to the category that wins the matching among the categories as they now stand, or leave it uncategorised when no category matches. A manually assigned transaction SHALL keep the category its manual assignment names unless that assignment is cleared or its category is deleted. The evaluation SHALL be part of the same operation that changed the categories, so no transaction is left categorised by an expression that no longer matches it.

#### Scenario: Creating a category assigns it to matching transactions

- **WHEN** a category is created whose expression matches the purpose line of a previously uncategorised transaction
- **THEN** that transaction holds the new category once the create has succeeded

#### Scenario: Editing a category re-evaluates every transaction

- **WHEN** a category's expression is changed so that it matches purpose lines it did not match before, and stops matching others
- **THEN** transactions are reassigned to or away from it to agree with the new expression

#### Scenario: A deleted category is not left on any transaction

- **WHEN** a category is deleted
- **THEN** no transaction holds it afterwards

#### Scenario: A created category does not displace a manual assignment

- **WHEN** a category is created whose expression matches the purpose line or counterparty name of a manually assigned transaction
- **THEN** the transaction keeps the category its manual assignment names

#### Scenario: An edited category does not displace a manual assignment

- **WHEN** a category's expression is changed so that it matches the purpose line or counterparty name of a manually assigned transaction
- **THEN** the transaction keeps the category its manual assignment names

#### Scenario: A manual assignment does not stop the re-evaluation of other transactions

- **WHEN** a category's expression is changed so that it matches some transactions that are manually assigned and some that are not
- **THEN** the manually assigned transactions keep their categories and the others are reassigned to agree with the new expression
