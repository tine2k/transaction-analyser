# Spec Delta

## MODIFIED Requirements

### Requirement: A category carries exactly an identity, a name, and a regular expression

A category returned by the management surface SHALL be a JSON object holding exactly `id`,
`name`, `patterns`, and `hidden`. The `id` SHALL be the storage identity rendered as a string, and
is storage metadata rather than a domain element. The `name` SHALL be the stored text. `patterns`
SHALL be a JSON array of strings holding every regular expression the category stores, in the
order the expressions were stored. `hidden` SHALL be the stored boolean flag, rendered as a JSON
boolean. The surface SHALL return the regular expressions, which the transactions read endpoint
does not, because managing a category requires reading and editing its expressions. The listing
SHALL be ordered by identity from smallest to largest, so the order is total and stable.

#### Scenario: A returned category holds its name and expression

- **WHEN** a category stored with the name "Groceries", the expressions `rewe` and `edeka`, and hidden `true` is returned
- **THEN** its object holds `id`, `name` "Groceries", `patterns` `["rewe","edeka"]`, and `hidden` `true`, and no other field

#### Scenario: The expression is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries every one of its expressions in `patterns`, so each expression can be displayed and edited

#### Scenario: The hidden flag is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries its `hidden` boolean, so a category's visibility can be displayed and edited

#### Scenario: The listing has a stable order

- **WHEN** the listing is returned twice against the same stored categories
- **THEN** the categories appear in the same order, sorted by identity from smallest to largest

## ADDED Requirements

### Requirement: The hidden flag is accepted on create and edit and defaults to visible

A create and an edit SHALL accept a `hidden` value in their JSON body. When `hidden` is present it
SHALL be a JSON boolean, and a request whose `hidden` is present and not a boolean SHALL be
rejected with a client error status and no stored change. When `hidden` is absent from the body,
the surface SHALL treat the category as not hidden, because create and edit replace the stored
category. The value SHALL be stored as given, and the returned category SHALL carry it. Setting
`hidden` SHALL NOT create, change, or delete any transaction, and SHALL NOT change which
transactions a category matches.

#### Scenario: A category is created with the hidden flag set

- **WHEN** a create request carries a name, one or more regular expressions, and `hidden` `true`
- **THEN** the category is stored and returned with `hidden` `true`

#### Scenario: An omitted hidden flag means visible

- **WHEN** a create or edit request carries no `hidden` value
- **THEN** the stored and returned category has `hidden` `false`

#### Scenario: The hidden flag can be toggled by an edit

- **WHEN** an edit request carries `hidden` `true` for a category that was visible
- **THEN** the category is stored and returned with `hidden` `true`

#### Scenario: A non-boolean hidden flag is rejected

- **WHEN** a create or edit request carries a `hidden` value that is not a JSON boolean
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: Hiding a category changes no transaction

- **WHEN** a category is edited to be hidden
- **THEN** no transaction is created, changed, assigned, or deleted, and the transactions the category covers are unchanged
