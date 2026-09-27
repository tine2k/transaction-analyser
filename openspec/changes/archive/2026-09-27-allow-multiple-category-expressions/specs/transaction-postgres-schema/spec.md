# Spec Delta

## MODIFIED Requirements

### Requirement: One row per category, held in a single table

The system SHALL represent a `Category` as exactly one row in a single PostgreSQL table named
`categories`, holding one column for each of the two `Category` data elements together with a
storage identity. The category's regular expressions SHALL be held together in one column, so a
category carrying several expressions is still exactly one row and no dependent table is
introduced. The table SHALL hold no domain element other than those.

| Domain element | Column | Presence |
| --- | --- | --- |
| (storage identity) | `id` | Required |
| Name | `name` | Required |
| Regular expressions | `patterns` | Required |

The `id` column is a storage concern only; it is not a domain element, and the name and the
regular expressions remain the complete set of domain data. The system SHALL reject storing a
second category under a name that already exists, so that no two categories are indistinguishable
by name. The system SHALL allow a category's name and its regular expressions to be changed in
place while transactions reference it, since neither is part of any key.

#### Scenario: A category is stored on one row

- **WHEN** a category is stored with a name and several regular expressions
- **THEN** the name and all of the expressions are held on a single row of `categories`, and no other table is read or written to store it

#### Scenario: Category names are distinct

- **WHEN** a category is stored with a name that a category in the table already uses
- **THEN** the write is rejected, and no second row is created under that name

#### Scenario: A category's identity is generated and is not a domain element

- **WHEN** a row is inserted into `categories` without supplying an identity
- **THEN** the database assigns the identity and the row's primary key cannot be left empty, and when the stored category is mapped back to the domain model the identity is storage metadata rather than a third domain element

#### Scenario: A referenced category can be renamed or have its expression changed

- **WHEN** a category that transactions reference has its name or its regular expressions changed
- **THEN** the change is accepted, and the referencing transactions still refer to that same category
