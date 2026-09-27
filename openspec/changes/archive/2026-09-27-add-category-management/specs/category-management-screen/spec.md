# Spec Delta

## Purpose

Defines the browser screen for managing categories and the menu bar through which it is reached:
listing categories with their names and expressions, creating one, editing one, deleting one with
confirmation, and reporting the outcome without inventing data or evaluating any expression in the
browser.

## ADDED Requirements

### Requirement: The layout carries a menu bar linking the screens

The shared layout SHALL carry a menu bar, present on every route, holding a link to the
transactions screen and a link to the category management screen. Each link SHALL be an
in-application navigation to that screen on the same origin. The menu bar SHALL distinguish the
link for the screen currently shown from the other. Adding the menu bar SHALL NOT remove the
frame's other properties, which remain as `frontend-shell` defines.

#### Scenario: The menu bar is on the transactions screen

- **WHEN** the transactions screen is shown
- **THEN** a menu bar is present holding a link to the transactions screen and a link to the category management screen

#### Scenario: The menu bar is on the category management screen

- **WHEN** the category management screen is shown
- **THEN** the same menu bar is present

#### Scenario: The current screen is distinguished

- **WHEN** a screen is shown
- **THEN** the menu bar's link for that screen is distinguishable as the current one

#### Scenario: Each link reaches its screen

- **WHEN** the link to the category management screen is followed, and the link to the transactions screen is followed
- **THEN** each navigation reaches that screen without a full page load from another origin

### Requirement: The category screen lists every category with its name and expression

When the category management screen is loaded, the browser SHALL request `GET /api/categories`
from the same origin and SHALL show a row for each returned category carrying its name and its
regular expression. It SHALL show every returned category, dropping none. It SHALL show a
defined state when no category is returned, stating that there are no categories rather than an
empty list. It SHALL show a distinct state when the request fails, stating that the categories
could not be loaded. It SHALL NOT invent a category, and SHALL NOT show a category that the
endpoint did not return.

#### Scenario: Every category gets a row

- **WHEN** the endpoint returns several categories
- **THEN** the screen shows one row for each, carrying its name and expression

#### Scenario: The name and expression are both shown

- **WHEN** a returned category carries a name and a regular expression
- **THEN** its row shows both

#### Scenario: An empty list is explained

- **WHEN** the endpoint returns no category
- **THEN** the screen states that there are no categories, and no row is invented

#### Scenario: A failure is not an empty result

- **WHEN** the request for categories fails
- **THEN** the screen states that the categories could not be loaded, and does not read as an empty list

### Requirement: The screen creates a category

The screen SHALL offer a form with one field for the name and one field for the regular
expression, and a control that submits them. Submitting SHALL send `POST /api/categories` with
the values as entered. On success the new category SHALL appear in the list, and on failure the
screen SHALL report the failure rather than showing the category as created.

#### Scenario: A category is created from the form

- **WHEN** a name and an expression are entered and the form is submitted
- **THEN** `POST /api/categories` is sent with those values and, on success, the category appears in the list

#### Scenario: The expression is sent as entered

- **WHEN** a regular expression containing punctuation is entered
- **THEN** the expression is sent exactly as entered, with no rewriting

#### Scenario: A rejected create is reported

- **WHEN** the create request is rejected, for example for a duplicate name or an uncompilable expression
- **THEN** the screen states that the category was not created, and no category is added to the list

### Requirement: The screen edits a category

The screen SHALL offer a way to change an existing category's name and regular expression.
Submitting an edit SHALL send `PUT /api/categories/:id` with the changed values. On success the
list SHALL reflect the new name and expression, and on failure the screen SHALL report the
failure rather than showing the change as applied.

#### Scenario: A category is edited from the screen

- **WHEN** a category's name or expression is changed and the change is submitted
- **THEN** `PUT /api/categories/:id` is sent and, on success, the row shows the new values

#### Scenario: A rejected edit is reported

- **WHEN** the edit request is rejected
- **THEN** the screen states that the category was not changed, and the row is left as it was

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
