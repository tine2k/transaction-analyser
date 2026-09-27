# Spec Delta

## ADDED Requirements

### Requirement: The category form previews how many transactions its expressions match

While a category is being created or edited, the screen SHALL show a label with the count of stored transactions whose purpose line matches at least one currently entered expression. The count SHALL use the same case-insensitive, substring matching semantics as category assignment, count each transaction once, and include matches even when another category wins assignment. It SHALL cover all stored transactions, not only uncategorised transactions. The browser SHALL obtain the count from the category management surface and SHALL NOT evaluate expressions itself. The preview SHALL update as the expressions change and SHALL reflect the latest entered values. When no non-empty expression has been entered, while a count is being loaded, or when a valid count cannot be obtained, the screen SHALL show an appropriate non-count state rather than a stale or invented number. The preview SHALL NOT submit or save the category, and inability to load the preview SHALL NOT prevent the normal save attempt.

#### Scenario: A new category shows a matching transaction count before saving

- **WHEN** one or more expressions are entered in the create form and the preview request succeeds
- **THEN** the form shows the count of stored transactions matching any entered expression before the category is submitted

#### Scenario: An edit previews its changed expressions

- **WHEN** the expressions in the edit form are changed and the preview request succeeds
- **THEN** the form shows the count for the current expressions, not the category's previously saved expressions

#### Scenario: A transaction matching multiple expressions is counted once

- **WHEN** a stored transaction's purpose line matches more than one entered expression
- **THEN** that transaction contributes one to the displayed count

#### Scenario: Overlapping categories do not reduce the preview count

- **WHEN** a transaction matches the entered expressions and also matches another category with a smaller identity
- **THEN** the transaction is included in the displayed match count even though that other category wins assignment

#### Scenario: No expression is ready to preview

- **WHEN** every expression field is empty
- **THEN** the form does not display a numeric count for the empty input

#### Scenario: A failed or outdated preview is not shown as current

- **WHEN** a preview request fails or a response for earlier expressions arrives after the form has changed
- **THEN** the screen shows an unavailable/loading state as appropriate and does not present a stale count as the count for the current expressions

#### Scenario: Previewing does not save or block a category

- **WHEN** the preview is unavailable and the user submits the form
- **THEN** the screen still makes the normal create or edit request and does not treat the preview as a save prerequisite
