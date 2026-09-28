# Spec Delta

## ADDED Requirements

### Requirement: The category form previews how many transactions its date windows claim

While a category is being created or edited, the screen SHALL show a label with the count of
stored transactions the currently entered date windows would claim, in its own place, separate
from the expression-match preview. The count SHALL use the same semantics as the category
management surface: a transaction is counted when its booking date falls inclusively in at least
one entered window and no stored category's regular expression matches its purpose line; each
transaction is counted once across all entered windows, and a transaction already claimed by an
expression is excluded. The screen SHALL obtain the count from the category management surface
and SHALL NOT test a date or evaluate an expression itself. The preview SHALL update as the
windows change and SHALL reflect the latest entered values. When no complete window has been
entered, while a count is being loaded, or when a valid count cannot be obtained, the screen
SHALL show an appropriate non-count state rather than a stale or invented number. The preview
SHALL NOT submit or save the category, and inability to load it SHALL NOT prevent the normal save
attempt. The screen SHALL present the expression-match preview and the window-claim preview
separately, and SHALL NOT fold one into the other.

#### Scenario: A new category shows the claim count of an entered window before saving

- **WHEN** a from and to date are entered in the window controls and the window-claim preview request succeeds
- **THEN** the form shows the count of stored transactions those windows would claim before the category is submitted

#### Scenario: An edit previews its changed windows

- **WHEN** the windows in the edit form are changed and the preview request succeeds
- **THEN** the form shows the count for the current windows, not the category's previously saved windows

#### Scenario: A transaction claimed by an expression is not counted

- **WHEN** a stored transaction's booking date falls in an entered window and a stored category's regular expression matches its purpose line
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
