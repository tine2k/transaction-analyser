# Spec Delta

## MODIFIED Requirements

### Requirement: A category is a name and a regular expression over the purpose line

The system SHALL define a `Category` as exactly three elements: a name that identifies it, one
or more regular expressions that state which transactions it covers, and a `hidden` flag that
states whether the category is out of scope for the analysis views. The expressions SHALL be
applied to the purpose line of a transaction, and SHALL be the definition of the category's
membership: a transaction falls within a category when its purpose line is matched by at least
one of that category's regular expressions. The `hidden` flag SHALL NOT take part in membership:
a hidden category matches a purpose line and categorises a transaction exactly as a visible one
does. The system SHALL NOT define a category by any other means, and SHALL NOT require a category
to carry any element beyond its name, its regular expressions, and its hidden flag. A category
SHALL carry at least one regular expression; a category with no expression is not a well-formed
category, because it would define no membership.

#### Scenario: A category is configured with a name and a regular expression

- **WHEN** a category is configured with the name "Groceries", the regular expressions `rewe` and `edeka`, and hidden `false`
- **THEN** the category holds that name, both regular expressions, and that hidden flag, and no fourth element

#### Scenario: The regular expression alone defines membership

- **WHEN** a transaction's purpose line is matched by at least one of a category's regular expressions
- **THEN** the transaction falls within that category by that match alone, and the other expressions of that category need not match for membership

#### Scenario: A category carries nothing beyond its name and expression

- **WHEN** a category is read
- **THEN** it exposes a name, one or more regular expressions, and a hidden flag, and no fourth element that defines or qualifies which transactions it covers

#### Scenario: A hidden category still defines membership

- **WHEN** a category is hidden and its regular expression matches a purpose line
- **THEN** the transaction falls within that hidden category, because hiding does not change which transactions the expressions match

#### Scenario: Any one expression defines membership

- **WHEN** a category holds several expressions and only one of them matches a purpose line
- **THEN** the transaction falls within that category, because its expressions are alternatives

#### Scenario: The expressions together define membership

- **WHEN** a purpose line is matched by none of a category's regular expressions
- **THEN** the transaction does not fall within that category, even though it may fall within another
