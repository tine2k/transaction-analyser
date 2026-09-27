# Spec Delta

## MODIFIED Requirements

### Requirement: A category is a name and a regular expression over the purpose line

The system SHALL define a `Category` as exactly two elements: a name that identifies it, and one
or more regular expressions that state which transactions it covers. The expressions SHALL be
applied to the purpose line of a transaction, and SHALL be the definition of the category's
membership: a transaction falls within a category when its purpose line is matched by at least
one of that category's regular expressions. The system SHALL NOT define a category by any other
means, and SHALL NOT require a category to carry any element beyond its name and its regular
expressions. A category SHALL carry at least one regular expression; a category with no
expression is not a well-formed category, because it would define no membership.

#### Scenario: A category is configured with a name and a regular expression

- **WHEN** a category is configured with the name "Groceries" and the regular expressions `rewe` and `edeka`
- **THEN** the category holds that name and both regular expressions, and no third element

#### Scenario: The regular expression alone defines membership

- **WHEN** a transaction's purpose line is matched by at least one of a category's regular expressions
- **THEN** the transaction falls within that category by that match alone, and the other expressions of that category need not match for membership

#### Scenario: A category carries nothing beyond its name and expression

- **WHEN** a category is read
- **THEN** it exposes a name and one or more regular expressions, and no third element that defines or qualifies which transactions it covers

#### Scenario: Any one expression defines membership

- **WHEN** a category holds several expressions and only one of them matches a purpose line
- **THEN** the transaction falls within that category, because its expressions are alternatives

#### Scenario: The expressions together define membership

- **WHEN** a purpose line is matched by none of a category's regular expressions
- **THEN** the transaction does not fall within that category, even though it may fall within another
