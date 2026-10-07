# Spec Delta

## MODIFIED Requirements

### Requirement: The category form previews how many transactions its expressions match

While a category is being created or edited, the screen SHALL show a label with the count of stored transactions whose purpose line or counterparty name matches at least one currently entered expression. The count SHALL use the same case-insensitive, substring matching semantics as category assignment, count each transaction once, and include matches even when another category wins assignment. It SHALL cover all stored transactions, not only uncategorised transactions. The browser SHALL obtain the count from the category management surface and SHALL NOT evaluate expressions itself. The preview SHALL update as the expressions change and SHALL reflect the latest entered values. When no non-empty expression has been entered, while a count is being loaded, or when a valid count cannot be obtained, the screen SHALL show an appropriate non-count state rather than a stale or invented number. The preview SHALL NOT submit or save the category, and inability to load the preview SHALL NOT prevent the normal save attempt.

#### Scenario: A new category shows a matching transaction count before saving

- **WHEN** one or more expressions are entered in the create form and the preview request succeeds
- **THEN** the form shows the count of stored transactions matching any entered expression before the category is submitted

#### Scenario: An edit previews its changed expressions

- **WHEN** the expressions in the edit form are changed and the preview request succeeds
- **THEN** the form shows the count for the current expressions, not the category's previously saved expressions

#### Scenario: A transaction matching multiple expressions is counted once

- **WHEN** a stored transaction's purpose line matches more than one entered expression
- **THEN** that transaction contributes one to the displayed count

#### Scenario: A counterparty-name match is counted

- **WHEN** a stored transaction's counterparty name matches an entered expression and its purpose line does not
- **THEN** that transaction contributes to the displayed match count

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

### Requirement: The category form previews how many transactions its date windows claim

While a category is being created or edited, the screen SHALL show a label with the count of stored transactions the currently entered date windows would claim, in its own place, separate from the expression-match preview. The count SHALL use the same semantics as the category management surface: a transaction is counted when its booking date falls inclusively in at least one entered window and no stored category's regular expression matches its purpose line or counterparty name; each transaction is counted once across all entered windows, and a transaction already claimed by an expression is excluded. The screen SHALL obtain the count from the category management surface and SHALL NOT test a date or evaluate an expression itself. The preview SHALL update as the windows change and SHALL reflect the latest entered values. When no complete window has been entered, while a count is being loaded, or when a valid count cannot be obtained, the screen SHALL show an appropriate non-count state rather than a stale or invented number. The preview SHALL NOT submit or save the category, and inability to load it SHALL NOT prevent the normal save attempt. The screen SHALL present the expression-match preview and the window-claim preview separately, and SHALL NOT fold one into the other.

#### Scenario: A new category shows the claim count of an entered window before saving

- **WHEN** a from and to date are entered in the window controls and the window-claim preview request succeeds
- **THEN** the form shows the count of stored transactions those windows would claim before the category is submitted

#### Scenario: An edit previews its changed windows

- **WHEN** the windows in the edit form are changed and the preview request succeeds
- **THEN** the form shows the count for the current windows, not the category's previously saved windows

#### Scenario: A transaction claimed by an expression is not counted

- **WHEN** a stored transaction's booking date falls in an entered window and a stored category's regular expression matches its purpose line
- **THEN** the displayed window-claim count excludes that transaction

#### Scenario: A counterparty-name match excludes a claimed transaction

- **WHEN** a stored transaction's booking date falls in an entered window and a stored category's regular expression matches its counterparty name
- **THEN** the displayed window-claim count excludes that transaction

#### Scenario: A transaction in several entered windows is counted once

- **WHEN** a stored transaction's booking date falls in more than one entered window
- **THEN** that transaction contributes one to the displayed window-claim count

#### Scenario: No complete window is ready to preview

- **WHEN** no window has both a from and a to date entered
- **THEN** the form does not display a numeric window-claim count for the incomplete input

#### Scenario: A failed or outdated window preview is not shown as current

- **WHEN** a window-claim preview request fails or a response for earlier windows arrives after the form has changed
- **THEN** the screen shows an unavailable/loading state as appropriate and does not present a stale count as the count for the current windows

#### Scenario: The two previews are shown separately

- **WHEN** a valid expression and a valid window are both entered
- **THEN** the form shows the expression-match count and the window-claim count in their own places, and the expression-match count does not include the window and the window-claim count does not include the expressions

#### Scenario: Previewing does not save or block a category

- **WHEN** the window-claim preview is unavailable and the user submits the form
- **THEN** the screen still makes the normal create or edit request and does not treat the preview as a save prerequisite
