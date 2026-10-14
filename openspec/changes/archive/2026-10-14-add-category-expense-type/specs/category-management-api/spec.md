# Spec Delta

## MODIFIED Requirements

### Requirement: A category carries exactly an identity, a name, and a regular expression

A category returned by the management surface SHALL be a JSON object holding exactly `id`,
`name`, `patterns`, `hidden`, `windows`, and `expenseType`. The `id` SHALL be the storage identity
rendered as a string, and is storage metadata rather than a domain element. The `name` SHALL be the
stored text. `patterns` SHALL be a JSON array of strings holding every regular expression the
category stores, in the order the expressions were stored; it SHALL be empty for a category defined
only by date windows. `hidden` SHALL be the stored boolean flag, rendered as a JSON boolean.
`windows` SHALL be a JSON array holding the category's date windows in the order they were stored,
each window a JSON object holding exactly `from` and `to`, each a full `YYYY-MM-DD` calendar date;
it SHALL be empty for a category defined only by expressions. `expenseType` SHALL be the stored
expense type rendered as the string `recurring`, the string `one-time`, or JSON `null` when the
category carries none. The surface SHALL return the regular expressions and the date windows,
which the transactions read endpoint does not, because managing a category requires reading and
editing them. The listing SHALL be ordered by identity from smallest to
largest, so the order is total and stable.

#### Scenario: A returned category holds its name and expression

- **WHEN** a category stored with the name "Urlaub", the expressions `rewe` and `edeka`, hidden `true`, the window 2026-07-01 to 2026-07-14, and the expense type `recurring` is returned
- **THEN** its object holds `id`, `name` "Urlaub", `patterns` `["rewe","edeka"]`, `hidden` `true`, `windows` `[{"from":"2026-07-01","to":"2026-07-14"}]`, and `expenseType` `recurring`, and no other field

#### Scenario: A category defined only by windows has no expression

- **WHEN** a date-only category is returned
- **THEN** its `patterns` is an empty array and its `windows` holds its window

#### Scenario: A category defined only by expressions has no window

- **WHEN** a category with expressions and no window is returned
- **THEN** its `windows` is an empty array

#### Scenario: The expression is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries every one of its expressions in `patterns`, so each expression can be displayed and edited

#### Scenario: The windows are visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries every one of its windows in `windows`, so each window can be displayed and edited

#### Scenario: The hidden flag is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries its `hidden` boolean, so a category's visibility can be displayed and edited

#### Scenario: The expense type is visible for management

- **WHEN** the list of categories is returned
- **THEN** each object carries its `expenseType` value, so a category's classification can be displayed and edited

#### Scenario: An unset expense type reads as null

- **WHEN** a category carrying no expense type is returned
- **THEN** its `expenseType` is JSON `null`, and no classification is invented for it

#### Scenario: The listing has a stable order

- **WHEN** the listing is returned twice against the same stored categories
- **THEN** the categories appear in the same order, sorted by identity from smallest to largest

## ADDED Requirements

### Requirement: The expense type is accepted on create and edit

A create and an edit SHALL accept an `expenseType` value in their JSON body. When `expenseType` is
present it SHALL be the string `recurring`, the string `one-time`, or JSON `null`; a present value
that is none of those SHALL be rejected with a client error status and no stored change. The value
SHALL be stored as given, and the returned category SHALL carry it.

#### Scenario: A category is created with an expense type

- **WHEN** a create request carries a name, one or more regular expressions, and `expenseType` `recurring`
- **THEN** the category is stored and returned with `expenseType` `recurring`

#### Scenario: The expense type can be changed by an edit

- **WHEN** an edit request carries `expenseType` `one-time` for a category stored as `recurring`
- **THEN** the category is stored and returned with `expenseType` `one-time`

#### Scenario: The expense type can be cleared by an edit

- **WHEN** an edit request carries `expenseType` `null` for a classified category
- **THEN** the category is stored and returned with `expenseType` `null`

#### Scenario: An unknown expense type is rejected

- **WHEN** a create or edit request carries an `expenseType` value such as `monthly` that is neither declared label
- **THEN** the request is rejected with a client error status and no category is created or changed

#### Scenario: A non-string expense type is rejected

- **WHEN** a create or edit request carries an `expenseType` value that is neither a string nor JSON `null`
- **THEN** the request is rejected with a client error status and no category is created or changed

### Requirement: An omitted expense type means unset, and setting one changes no transaction

When `expenseType` is absent from a create or edit body, the surface SHALL treat the category as
carrying no expense type, because create and edit replace the stored category. Setting
`expenseType` SHALL NOT create, change, or delete any transaction, and SHALL NOT change which
transactions a category matches.

#### Scenario: An omitted expense type means unset

- **WHEN** a create or edit request carries no `expenseType` value
- **THEN** the stored and returned category has `expenseType` `null`

#### Scenario: Classifying a category changes no transaction

- **WHEN** a category is edited to carry an expense type
- **THEN** no transaction is created, changed, assigned, or deleted, and the transactions the category covers are unchanged
