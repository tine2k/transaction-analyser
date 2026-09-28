# Spec Delta

## MODIFIED Requirements

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
