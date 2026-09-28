# Category Management Screen Specification

## Purpose

Defines the browser screen for managing categories and the menu bar through which it is reached:
listing categories with their names and expressions, creating one, editing one, deleting one with
confirmation, and reporting the outcome without inventing data or evaluating any expression in the
browser.

## Requirements

### Requirement: The layout carries a menu bar linking the screens

The shared layout SHALL carry a menu bar, present on every route, holding a link to the
transactions screen, a link to the category management screen, a link to the category spending
analytics screen, a link to the monthly totals screen, and a link to the monthly average screen.
Each link SHALL be an in-application navigation to that screen on the same origin. The menu bar
SHALL distinguish the link for the screen currently shown from the other links. Adding the menu bar
SHALL NOT remove the frame's other properties, which remain as `frontend-shell` defines.

#### Scenario: The menu bar is on the transactions screen

- **WHEN** the transactions screen is shown
- **THEN** a menu bar is present holding links to the transactions screen, the category management screen, the category spending analytics screen, the monthly totals screen, and the monthly average screen

#### Scenario: The menu bar is on the category management screen

- **WHEN** the category management screen is shown
- **THEN** the same menu bar is present

#### Scenario: The menu bar is on the analytics screen

- **WHEN** the category spending analytics screen is shown
- **THEN** the same menu bar is present

#### Scenario: The menu bar is on the monthly totals screen

- **WHEN** the monthly totals screen is shown
- **THEN** the same menu bar is present

#### Scenario: The menu bar is on the monthly average screen

- **WHEN** the monthly average screen is shown
- **THEN** the same menu bar is present

#### Scenario: The current screen is distinguished

- **WHEN** a screen is shown
- **THEN** the menu bar's link for that screen is distinguishable as the current one

#### Scenario: Each link reaches its screen

- **WHEN** any menu link is followed
- **THEN** its screen is reached through in-application navigation on the same origin

### Requirement: The category screen lists every category with its name and expression

When the category management screen is loaded, the browser SHALL request `GET /api/categories`
from the same origin and SHALL show a row for each returned category carrying its name, the
count of regular expressions in that category's `patterns` array, and whether the category is
hidden. The list SHALL NOT display the regular-expression values themselves; they remain
available in the create and edit forms. It SHALL show every returned category, dropping none,
including hidden categories. The rows SHALL be ordered by category name in ascending,
case-insensitive alphabetical order, with category identity in ascending order as a tie-breaker
for equal names. It SHALL show a defined state when no category is returned, stating that there
are no categories rather than an empty list. It SHALL show a distinct state when the request
fails, stating that the categories could not be loaded. It SHALL NOT invent a category, a count,
or a hidden state, or show a category that the endpoint did not return.

#### Scenario: Every category gets a row

- **WHEN** the endpoint returns several categories
- **THEN** the screen shows one row for each category, carrying its name and expression count

#### Scenario: The list shows expression counts but not expression values

- **WHEN** a returned category carries two regular expressions
- **THEN** its row shows the count `2` and neither regular-expression value

#### Scenario: Every row states whether the category is hidden

- **WHEN** the endpoint returns both hidden and visible categories
- **THEN** each row distinguishes a hidden category from a visible one, using the returned `hidden` value

#### Scenario: Categories are ordered by name

- **WHEN** the endpoint returns categories in an order different from their names
- **THEN** the screen shows them in ascending alphabetical order by name, ignoring case, with equal names ordered by ascending category identity

#### Scenario: An empty list is explained

- **WHEN** the endpoint returns no category
- **THEN** the screen states that there are no categories, and no row is invented

#### Scenario: A failure is not an empty result

- **WHEN** the request for categories fails
- **THEN** the screen states that the categories could not be loaded, and does not read as an empty list

### Requirement: The screen creates a category

The screen SHALL offer a form with one field for the name, one or more fields for the regular
expressions, and a control for the hidden flag, and a control that submits them. The form SHALL
let an expression field be added so that a category can be given more than one expression.
Submitting SHALL send `POST /api/categories` with the values as entered, including the hidden
flag, and SHALL send every expression that was entered. On success the new category SHALL appear
in the list, and on failure the screen SHALL report the failure rather than showing the category
as created. The screen SHALL NOT send an empty expression list.

#### Scenario: A category is created from the form

- **WHEN** a name, one or more expressions, and a hidden setting are entered and the form is submitted
- **THEN** `POST /api/categories` is sent with those values and, on success, the category appears in the list with its expression count and hidden state

#### Scenario: The hidden flag is sent as entered

- **WHEN** the hidden control is set on and the form is submitted
- **THEN** `POST /api/categories` carries `hidden` as `true`

#### Scenario: Several expressions are created together

- **WHEN** more than one expression field is filled in and the form is submitted
- **THEN** `POST /api/categories` carries every entered expression, and, on success, the row shows their count

#### Scenario: The expression is sent as entered

- **WHEN** a regular expression containing punctuation is entered
- **THEN** that expression is sent exactly as entered, with no rewriting

#### Scenario: A rejected create is reported

- **WHEN** the create request is rejected, for example for a duplicate name or an uncompilable expression
- **THEN** the screen states that the category was not created, and no category is added to the list

### Requirement: The screen edits a category

The screen SHALL offer a way to change an existing category's name, its regular expressions, and
its hidden flag. It SHALL present every expression the category carries for editing and SHALL
present the category's current hidden state, and SHALL let an expression be added or removed and
the hidden state be changed. Submitting an edit SHALL send `PUT /api/categories/:id` with the
changed values, including the hidden flag, sending the expressions that remain. On success the
list SHALL reflect the new name, expressions, and hidden state, and on failure the screen SHALL
report the failure rather than showing the change as applied. The screen SHALL NOT submit an empty
expression list.

#### Scenario: A category is edited from the screen

- **WHEN** a category's name or expressions are changed and the change is submitted
- **THEN** `PUT /api/categories/:id` is sent and, on success, the row shows the new name and expression count

#### Scenario: The hidden state is edited from the screen

- **WHEN** a category's hidden state is changed in the edit form and the change is submitted
- **THEN** `PUT /api/categories/:id` carries the changed `hidden` value and, on success, the row shows the new hidden state

#### Scenario: An expression is added to an existing category

- **WHEN** an expression is added to a category that already carries one and the change is submitted
- **THEN** `PUT /api/categories/:id` carries the old expression and the added one, and, on success, the row shows the updated expression count

#### Scenario: A rejected edit is reported

- **WHEN** the edit request is rejected
- **THEN** the screen states that the category was not changed, and the row is left as it was

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

### Requirement: The screen deletes a category only after confirmation

The screen SHALL offer a delete control for each category. Following that control SHALL ask the
user to confirm before anything is sent, and the confirmation SHALL state that transactions may
be re-categorised as a result of the delete. On confirmation the screen SHALL send
`DELETE /api/categories/:id`, and on success the category SHALL disappear from the list.
Cancelling SHALL send no request.

#### Scenario: A delete is confirmed

- **WHEN** a delete control is followed and the confirmation is accepted
- **THEN** `DELETE /api/categories/:id` is sent and, on success, the category disappears from the list

#### Scenario: The consequence is stated before deleting

- **WHEN** the confirmation for a delete is shown
- **THEN** it states that transactions matched by the category may be re-categorised

#### Scenario: A cancelled delete sends nothing

- **WHEN** a delete control is followed and the confirmation is dismissed
- **THEN** no delete request is sent and the category remains

### Requirement: The screen reports failures and never assumes success

When a request the screen makes fails, the screen SHALL present that failure and SHALL NOT show
the change as though it had succeeded. The screen SHALL NOT keep a category as deleted, edited,
or created when the server did not confirm it.

#### Scenario: A failed write is not shown as applied

- **WHEN** a create, edit, or delete fails
- **THEN** the screen shows that it failed and the list does not present the change as applied

### Requirement: The screen writes only through the category surface and evaluates no expression

The browser SHALL reach categories only through the category management surface. It SHALL NOT
evaluate any regular expression, SHALL NOT match a purpose line, SHALL NOT assign a category,
and SHALL NOT run a database statement of its own. All matching and assignment SHALL be done by
the server.

#### Scenario: No expression is evaluated in the browser

- **WHEN** the category management screen is used
- **THEN** no regular expression is evaluated in the browser and no category is assigned by it

#### Scenario: Categories are reached only through the endpoint

- **WHEN** the screen reads or writes categories
- **THEN** it does so through `/api/categories` and runs no database statement itself
