# Spec Delta

## MODIFIED Requirements

### Requirement: A transaction's category is returned by reference, and uncategorised reads as null

The transaction object's `category` field SHALL be JSON `null` when the transaction has no
category, and SHALL otherwise be an object holding exactly `id`, `name`, and `hidden`. The category
`id` SHALL be the referenced category's storage identity rendered as a string, `name` SHALL be the
referenced category's current name read from `categories`, and `hidden` SHALL be the referenced
category's current hidden flag read from `categories`, rendered as a JSON boolean. The endpoint
SHALL NOT return a category's regular expression, and SHALL NOT return a placeholder, default, or
sentinel category for an uncategorised transaction. A transaction SHALL carry at most one
category, so `category` SHALL never be a list.

#### Scenario: An uncategorised transaction reads as null

- **WHEN** a transaction whose `category_id` is null is returned
- **THEN** its `category` field reads as JSON `null`, and no category object is invented for it

#### Scenario: A categorised transaction reads as an id and a name

- **WHEN** a transaction whose `category_id` references a category named "Groceries" with hidden `true` is returned
- **THEN** its `category` field is an object whose `id` is that category's identity, whose `name` is `Groceries`, and whose `hidden` is `true`

#### Scenario: The category name follows the reference

- **WHEN** a category that a returned transaction references is renamed, and the endpoint is called again
- **THEN** the transaction's `category.name` reads the new name, because the name is read from the referenced category rather than copied onto the transaction

#### Scenario: The category hidden flag follows the reference

- **WHEN** a category that a returned transaction references is hidden or shown, and the endpoint is called again
- **THEN** the transaction's `category.hidden` reads the new stored value, because the flag is read from the referenced category rather than copied onto the transaction

#### Scenario: The category's expression is not returned

- **WHEN** a categorised transaction is returned
- **THEN** its `category` object holds `id`, `name`, and `hidden` only, and no regular expression
