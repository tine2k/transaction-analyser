# person-management-screen Specification

## Purpose

Defines the browser screen for managing the named owners of transactions: listing each person with a transaction count, creating a person, renaming one, and offering no deletion.

## Requirements

### Requirement: The people screen is reached at /people through the manage hub

The system SHALL provide the people screen at `/people`. The manage hub SHALL carry an entry to it, and the shared menu bar SHALL mark the Manage destination as the current one when the people screen is shown. Loading the screen SHALL request `GET /api/people` from the same origin and SHALL use that response as the only source of people and counts.

#### Scenario: The route shows the people screen

- **WHEN** the `/people` route is loaded
- **THEN** the people screen is shown and the screen requests `GET /api/people` from the same origin

#### Scenario: The manage hub links to the screen

- **WHEN** the manage hub is shown
- **THEN** its People entry reaches the people screen through in-application navigation on the same origin

#### Scenario: The current section is distinguished

- **WHEN** the people screen is shown
- **THEN** the menu bar's Manage destination is distinguishable as the current one

### Requirement: The screen lists every person with their transaction count

The screen SHALL show one row for each person the endpoint returns, carrying the person's name and the returned transaction count. It SHALL show every returned person, including one whose count is zero, and SHALL order the rows by name ascending, ignoring letter case, with the person identity ascending as the tie-breaker. It SHALL show a defined state when no person is returned and a distinct state when the request fails, and SHALL NOT invent a person or a count.

#### Scenario: Every returned person gets a row

- **WHEN** the endpoint returns several people
- **THEN** the screen shows one row for each, carrying its name and transaction count

#### Scenario: A person with no transactions is shown

- **WHEN** the endpoint returns a person whose transaction count is zero
- **THEN** that person's row is shown with a count of zero

#### Scenario: Rows are ordered by name

- **WHEN** the endpoint returns people in an order different from their names
- **THEN** the screen orders them case-insensitively by name, with equal names ordered by ascending identity

#### Scenario: An empty list is explained

- **WHEN** the endpoint returns no person
- **THEN** the screen states that there are no people, and no row is invented

#### Scenario: A failure is not an empty list

- **WHEN** the request for people fails
- **THEN** the screen states that the people could not be loaded and does not read as an empty list

#### Scenario: No transaction request is made

- **WHEN** the people screen loads or is used
- **THEN** it requests only `GET /api/people`, and reads no transaction list to build its rows or counts

### Requirement: The screen creates a person

The screen SHALL offer a form with one name field and a control that submits it. Submitting SHALL send the entered name to `POST /api/people`. The screen SHALL add a row only when the server confirms the creation, and SHALL report a refused or failed creation in the form without adding a row. The form SHALL NOT offer a transaction, a count, or any field other than the name.

#### Scenario: A valid name creates a row

- **WHEN** the user submits a non-empty name and the server creates the person
- **THEN** the new person appears in the list with a transaction count of zero

#### Scenario: An empty name is not accepted

- **WHEN** the user submits an empty or whitespace-only name
- **THEN** the screen reports that a name is required and no person is added

#### Scenario: A duplicate name is reported

- **WHEN** the server refuses the creation because another person already uses that name ignoring case
- **THEN** the screen reports the conflict and adds no row

#### Scenario: A failed creation adds no row

- **WHEN** the creation fails for any reason
- **THEN** no person is added to the list, and the failure is reported in the form

### Requirement: The screen renames a person

The screen SHALL offer a control on each person's row that starts renaming that person. Starting a rename SHALL load the person's current name into the name form. Saving SHALL send the new name to `PUT /api/people/<id>` and SHALL update the row only when the server confirms the change. Cancelling SHALL leave the stored name and the list unchanged. A failed rename SHALL keep the previous name and report the failure.

#### Scenario: A rename updates the row

- **WHEN** the user changes a person's name and the server confirms the rename
- **THEN** the row shows the new name and the same transaction count

#### Scenario: Cancelling changes nothing

- **WHEN** the user starts a rename and cancels
- **THEN** the stored name is unchanged and the row still shows the previous name

#### Scenario: A duplicate rename is reported

- **WHEN** the server refuses the rename because another person uses that name ignoring case
- **THEN** the screen reports the conflict and the row keeps its previous name

#### Scenario: A failed rename keeps the previous name

- **WHEN** the rename fails for any reason
- **THEN** the row keeps its previous name, and the failure is reported in the form

#### Scenario: Renaming changes no count

- **WHEN** a person is renamed
- **THEN** the person's transaction count is unchanged and no transaction is read or written by the screen

### Requirement: The screen offers no deletion

The screen SHALL offer no control that deletes a person, and SHALL send no request that removes a person, whether or not the person has transactions.

#### Scenario: No delete control is shown

- **WHEN** the people screen is rendered
- **THEN** no row offers a deletion control

#### Scenario: The screen sends no delete request

- **WHEN** the people screen is used
- **THEN** it sends no request that deletes a person, and every person remains in the list

### Requirement: The screen does not invent people or counts

The screen SHALL show only the people and counts the endpoint returned. It SHALL NOT show an example person, a placeholder count, or a person or count derived from any other source. A failure SHALL NOT be presented as zero people.

#### Scenario: Nothing is invented

- **WHEN** the people screen is shown
- **THEN** every row and count comes from the endpoint response, and no example or placeholder is shown

#### Scenario: A failure does not read as zero people

- **WHEN** the request for people fails
- **THEN** the screen reports the failure rather than a list of zero people
