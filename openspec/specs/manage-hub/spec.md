# Manage Hub Specification

## Purpose

Defines the management hub at `/manage`: a read-only directory that reports the state of the People, Categories, and Imports screens and links to them.

## Requirements

### Requirement: The manage hub is a read-only directory of the three management screens

The system SHALL provide a manage hub at `/manage` that lists the people, category, and import screens in that order. Each entry SHALL carry the screen's name, a short description, and an in-application link to `/people`, `/categories`, or `/imports`. The hub SHALL offer no control that creates, changes, or deletes stored data, starts an import, or sends a notification.

#### Scenario: The hub lists the three screens

- **WHEN** the `/manage` route is loaded
- **THEN** the hub shows an entry for People, an entry for Categories, and an entry for Imports, each linking to its screen

#### Scenario: The hub offers no write action

- **WHEN** the hub is rendered
- **THEN** it carries no form, no sync control, and no control that changes stored data

### Requirement: Each hub entry reports the state read from its screen's endpoint

The hub SHALL request `GET /api/people`, `GET /api/categories`, and `GET /api/imports` from the same origin. The People entry SHALL report the number of people returned. The Categories entry SHALL report the number of categories returned. The Imports entry SHALL report the outcome and start time of the most recent returned run. The hub SHALL NOT invent a count, an outcome, or a run.

#### Scenario: Counts come from the endpoints

- **WHEN** the people endpoint returns three people and the category endpoint returns twelve categories
- **THEN** the hub reports three people and twelve categories

#### Scenario: The latest run is reported

- **WHEN** the imports endpoint returns runs newest first
- **THEN** the Imports entry reports the outcome and start time of the first run

#### Scenario: No run is invented

- **WHEN** the imports endpoint returns no run
- **THEN** the Imports entry states that no import has run yet

### Requirement: The hub distinguishes loading, empty, unavailable, and failed-run states

Each entry SHALL show a loading state while its request is in flight, distinct from an empty result. A failed read SHALL show that its status is unavailable and SHALL NOT be presented as zero. The three reads SHALL be independent, so one failure does not remove another entry's status. A most recent run whose outcome is failed SHALL be marked as a failure.

#### Scenario: Loading is not empty

- **WHEN** a request has not completed
- **THEN** the entry shows that its status is loading, not that the list is empty

#### Scenario: An empty list is stated

- **WHEN** the people or categories endpoint returns an empty list
- **THEN** the corresponding entry states that none exist

#### Scenario: A failed read stays unknown

- **WHEN** one endpoint fails
- **THEN** that entry reports its status as unavailable, the other entries keep their statuses, and the entry's link still reaches its screen

#### Scenario: A failed run is marked

- **WHEN** the most recent run's outcome is failed
- **THEN** the Imports entry marks the run as failed in the failure role

### Requirement: The hub remains usable at every supported width

The hub SHALL keep every entry, its status, and its link available from 320 CSS pixels through desktop widths without page-level horizontal overflow. At phone widths the entries SHALL stack and each entry's link area SHALL provide a touch target at least 44 CSS pixels high. The hub SHALL keep its heading, entry labels, and status text readable when a status wraps.

#### Scenario: The hub fits a phone

- **WHEN** `/manage` is shown at a 320 CSS-pixel viewport
- **THEN** the entries stack, every status and link remains available, and the page has no horizontal overflow

#### Scenario: A status wraps without hiding the link

- **WHEN** the latest run's time or outcome is too wide for one line
- **THEN** the status wraps within the entry and the entry's link remains available
