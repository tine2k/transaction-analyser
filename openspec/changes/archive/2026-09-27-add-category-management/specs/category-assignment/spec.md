# Spec Delta

## Purpose

Defines when a transaction's category is derived by matching category expressions against its
purpose line, how a purpose line is matched, how overlaps are resolved, and how transactions are
reconciled when the category set changes. It settles the matching decisions the
`transaction-domain-model` capability previously left open.

## ADDED Requirements

### Requirement: Assignment runs whenever the stored categories change

When the set of stored categories changes, by a create, an edit, or a delete, the system SHALL
re-evaluate every stored transaction: the transaction's category SHALL be set to the category
that wins the matching among the categories as they now stand, or the transaction SHALL be left
uncategorised when no category matches. The evaluation SHALL be part of the same operation that
changed the categories, so that once the operation has succeeded every stored reference agrees
with the current expressions. The system SHALL NOT leave a transaction categorised by an
expression that no longer matches it. A transaction stored after the last change to the category
set SHALL stay uncategorised until the next such change, so an imported transaction is
uncategorised until a category is created, edited, or deleted.

#### Scenario: Creating a category assigns it to matching transactions

- **WHEN** a category is created whose expression matches the purpose line of a previously uncategorised transaction
- **THEN** that transaction holds the new category once the create has succeeded

#### Scenario: Editing a category re-evaluates every transaction

- **WHEN** a category's expression is changed so that it matches purpose lines it did not match before, and stops matching others
- **THEN** transactions are reassigned to or away from it to agree with the new expression

#### Scenario: A deleted category is not left on any transaction

- **WHEN** a category is deleted
- **THEN** no transaction holds it afterwards

#### Scenario: A newly stored transaction waits for the next change

- **WHEN** a transaction is imported while categories already exist, and no category is created, edited, or deleted afterwards
- **THEN** the transaction stays uncategorised until the next change to the category set

### Requirement: A category matches a purpose line as a case-insensitive substring

Matching SHALL ignore case and SHALL succeed when the category's expression matches any part of
the purpose line. The system SHALL NOT require the whole purpose line to match. Matching SHALL
NOT alter, reformat, or replace the purpose line, and SHALL NOT require the purpose line to
conform to any shape. An expression that matches the empty string SHALL match every transaction.

#### Scenario: A match inside the line is enough

- **WHEN** a category's expression matches a part of a purpose line but not the whole line
- **THEN** the category matches that transaction

#### Scenario: Matching ignores case

- **WHEN** a category's expression is `rewe` and a purpose line reads `REWE Markt`
- **THEN** the category matches that transaction

#### Scenario: The whole line need not match

- **WHEN** a purpose line reads `Card payment REWE 1234` and a category's expression is `rewe`
- **THEN** the category matches, because matching is not anchored to the whole line

#### Scenario: Matching leaves the purpose line unchanged

- **WHEN** a category is matched against a purpose line and assigned
- **THEN** the stored and reported purpose line is exactly the text it was before the match

### Requirement: Among matching categories the smallest identity wins

When more than one category's expression matches a single purpose line, the system SHALL assign
the matching category whose storage identity is smallest. The winning category SHALL be the same
on every evaluation of the same stored data, so the outcome does not depend on the order in
which categories are read.

#### Scenario: The smallest identity wins an overlap

- **WHEN** two categories both match one purpose line and one has a smaller identity
- **THEN** the transaction holds the category with the smaller identity

#### Scenario: The outcome is stable

- **WHEN** the same overlapping categories and purpose line are evaluated again
- **THEN** the same category wins

### Requirement: A transaction holds at most one category and re-evaluation replaces it

Re-evaluation SHALL set the transaction's single category and SHALL NOT add a second. A
transaction that matched one category and then matches a different one SHALL hold only the new
one. A transaction that matches no category SHALL be uncategorised, and uncategorised SHALL NOT
be represented as a category.

#### Scenario: Re-evaluation replaces rather than accumulates

- **WHEN** a transaction held category A and, after a change, matches category B instead
- **THEN** the transaction holds only B

#### Scenario: A transaction that matches nothing becomes uncategorised

- **WHEN** a transaction's purpose line is matched by no category after an evaluation
- **THEN** its category reads as absent, and no catch-all category is invented for it
