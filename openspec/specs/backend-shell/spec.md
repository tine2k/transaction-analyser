# Backend Shell Specification

## Purpose

Defines the server half of the application: that the browser application and its API are one server on one origin, that the API surface is a health endpoint and one read-only transactions endpoint which is the only path that reaches stored data, that the database address and its credentials come from the environment and are never disclosed, that a shared connection pool exists but is opened only when it is used, and that the existing command-line importer and the SQL migrations keep working unchanged alongside it.

## Requirements

### Requirement: One origin serves the browser application and the API

The system SHALL serve the browser application and every API endpoint from a single address on a single port, answered by one running process. A request for a page and a request for an API endpoint SHALL be answered by the same server. The system SHALL NOT require a second service, a second port, a separately hosted frontend, or a cross-origin request from the page. The system SHALL NOT be delivered as a pre-rendered static export alone, because a server answers at run time.

#### Scenario: A page and an API endpoint are answered by the same server

- **WHEN** a browser loads the application and the page then requests an API endpoint
- **THEN** both are answered by the same server on the same address and port, and the page issues no request to any other origin

#### Scenario: One process serves both halves

- **WHEN** the application is started
- **THEN** a single process answers both the pages and the API endpoints, and starting a second service is not required for either

#### Scenario: The application is not a static export

- **WHEN** the application is built and its output is served
- **THEN** the server answers requests at run time, and the output is not a set of files that were rendered once at build time

### Requirement: The API is a health endpoint, a read-only transactions endpoint, and a category management surface

The system SHALL expose a health endpoint at `/api/health`, which reports that the server is
running; a read-only transactions endpoint at `/api/transactions`, which returns stored
transactions as the `transaction-read-api` capability defines; a category management surface
at `/api/categories`, which lists, creates, changes, and deletes categories as the
`category-management-api` capability defines and re-evaluates stored transactions as the
`category-recategorisation` capability defines; a read-only import log at `/api/imports`,
which returns recent import runs as the `import-log` capability defines; and a sync-start
endpoint at `POST /api/easybank/sync`, which starts the Easybank sync as the `easybank-sync`
capability defines; and a notification-test endpoint at `POST /api/imports/test-notification`,
which sends one test notification as the `import-notification` capability defines without
starting an import or changing stored data. The health endpoint
SHALL report on the server alone and SHALL NOT report on the database, so that a database which
is unreachable is never presented as the application being down. The system SHALL NOT expose any
further endpoint, SHALL NOT expose any endpoint other than the sync-start endpoint and the
category management surface's re-categorisation operation that can lead
to a transaction being created, changed, or deleted, SHALL start an import only through the
sync-start endpoint, and SHALL allow a category to be written
only through the category management surface. A request for a path under `/api` that no endpoint
matches SHALL be answered by the browser application rather than by an endpoint, SHALL NOT read
or write a row in the database, and SHALL NOT be reported as a missing resource.

#### Scenario: The health endpoint answers

- **WHEN** a request is made for the health endpoint
- **THEN** the server answers with a success status and a small body in a machine-readable form stating that the server is up

#### Scenario: Only the named endpoints exist

- **WHEN** a request is made for a path under `/api` other than the health endpoint, the transactions endpoint, the category management surface and its re-categorisation operation, the import log, the sync-start endpoint, and the notification-test endpoint
- **THEN** no API endpoint answers it and no row is read or written, and the request is answered by the browser application shell rather than reported as a missing resource

#### Scenario: The transactions endpoint reads stored data

- **WHEN** a `GET` request is made for the transactions endpoint
- **THEN** the server answers from the stored transactions as the `transaction-read-api` capability defines

#### Scenario: The import log endpoint reads the recorded runs

- **WHEN** a `GET` request is made for the import log endpoint
- **THEN** the server answers from the recorded import runs as the `import-log` capability defines, and reads no transaction

#### Scenario: The category surface writes a category

- **WHEN** a request that creates, changes, or deletes a category is made to the category management surface
- **THEN** the server applies it as the `category-management-api` capability defines, and this is the only API path that can write a category

#### Scenario: The re-categorisation operation re-evaluates transactions

- **WHEN** the re-categorisation operation is requested
- **THEN** the server re-evaluates the stored transactions as the `category-recategorisation` capability defines

#### Scenario: The sync endpoint starts the sync

- **WHEN** a `POST` request is made for the sync-start endpoint
- **THEN** the server starts the Easybank sync as the `easybank-sync` capability defines, through the same task and import path the scheduled sync uses

#### Scenario: The notification-test endpoint sends the test

- **WHEN** a `POST` request is made for the notification-test endpoint
- **THEN** the server sends one test notification as the `import-notification` capability defines, starts no import, and writes no row in the database

#### Scenario: No request can alter stored data

- **WHEN** a request using a method that creates, alters, or deletes is made to the transactions endpoint, the import log, or a page path
- **THEN** no endpoint acts on it, and no transaction row is created, altered, or deleted

#### Scenario: No request starts an import

- **WHEN** a request other than a `POST` to the sync-start endpoint is made to any path the application serves
- **THEN** no import is started by it

#### Scenario: A page path answers with the same document whatever method is used

- **WHEN** a request using a method that creates, alters, or deletes is made to a path that renders a page
- **THEN** the server answers with the same document it renders for a read, because no endpoint on a page path acts on the request, and so no row is created, altered, or deleted

#### Scenario: The health endpoint says nothing about the database

- **WHEN** the health endpoint is requested while the database is unreachable
- **THEN** the response is the same as when the database is reachable, because the endpoint reports on the server alone

### Requirement: One shared connection pool serves every consumer, opened only when it is used

The system SHALL hold one shared database connection pool per server process, built from the configured address, and every consumer of the database SHALL obtain that same pool rather than opening a connection of its own. The system SHALL NOT open a connection while the server starts, while a page is rendered, or while a request is answered; a connection SHALL be established only when a statement is run through the pool. The system SHALL release the pool's connections when the server shuts down. The pages and the health endpoint SHALL run no statement, so the pool is opened only when a statement is run through it, which the transactions read endpoint, the category management surface, the import log endpoint, and the scheduled sync task do. The startup migration run SHALL use its own connection, established and released for that run, and SHALL NOT obtain it from the shared pool.

#### Scenario: Starting opens no connection

- **WHEN** the server starts with the address configured
- **THEN** no connection is opened through the shared pool while starting, and the startup migration run uses a connection of its own for the run's duration

#### Scenario: The migration connection is released

- **WHEN** the startup migration run finishes
- **THEN** its connection is closed, and no connection opened for the run is held afterward

#### Scenario: Serving opens no connection

- **WHEN** a page is rendered and the health endpoint is requested
- **THEN** neither establishes a connection to the database

#### Scenario: The pool is shared rather than duplicated

- **WHEN** two consumers ask the server for the database
- **THEN** both are given the same pool, and neither opens a connection of its own

#### Scenario: A statement is what opens a connection

- **WHEN** a statement is run through the pool
- **THEN** a connection is established at that point and at no earlier one

#### Scenario: Shutdown releases the pool

- **WHEN** the server is stopped
- **THEN** the pool's connections are closed rather than left open

#### Scenario: The shell runs no statement

- **WHEN** the application runs with the shell alone, without any endpoint or the scheduled sync being active
- **THEN** no statement is sent to the database by a page or by the health endpoint

#### Scenario: The read endpoints and the category surface run through the same pool

- **WHEN** the transactions endpoint, the import log endpoint, or the category management surface is requested
- **THEN** each runs its statements through the shared pool, and no page or the health endpoint runs a statement of its own

#### Scenario: The sync task runs its statements through the same pool

- **WHEN** the scheduled sync runs
- **THEN** it reads and writes through the same shared pool, and opens no connection of its own

### Requirement: The application recognises no user and admits every requester

The system SHALL serve every request it receives without asking for a credential, and SHALL recognise no user, no account, and no session. The system SHALL NOT define a login, a registration, a token, or a session cookie, and SHALL NOT make any response depend on who is asking. This is a property of a shell with nothing to protect; the moment the application is served anywhere other than the machine of the person running it, this is the first requirement that must be revisited.

#### Scenario: No credential is required

- **WHEN** a request is made for any path the application serves
- **THEN** it is answered without any credential being presented

#### Scenario: No user is recognised

- **WHEN** two different browsers load the application
- **THEN** both see the same application, neither is identified, and nothing in the response distinguishes one from the other

#### Scenario: No session is created

- **WHEN** any request is answered
- **THEN** the server sets no session cookie and issues no token

### Requirement: The command-line importer, the sync command, and the scheduled sync share one import path

The system SHALL keep the command-line import tool runnable as a command, taking the path to the statement as its argument, taking the database address from its arguments or the environment, and offering its non-writing mode, and SHALL keep it in the manifest. The tool SHALL share its parsing, validation, deduplication, and write path with the scheduled sync, the sync command, and the sync started from the imports screen, so that all four import the same way, as `transaction-csv-import` defines. The system SHALL offer a sync command that runs the same sync by hand, as `easybank-sync` defines. The application SHALL offer the sync from the imports screen through the sync-start endpoint, as `easybank-sync` defines, and SHALL offer no other way to start an import from the browser. The system SHALL keep the database migrations as plain SQL files in the repository and SHALL apply every pending migration automatically while the application starts, before it serves any request, as the `database-migrations` capability defines; the system SHALL NOT edit a migration that has already been applied, and a new table SHALL arrive as a new migration file applied at the next start.

#### Scenario: The import command keeps its interface

- **WHEN** the import command is run with a statement path
- **THEN** it takes that path and the database address as before, offers its non-writing mode, and is run by the same manifest entry

#### Scenario: The sync command runs by hand

- **WHEN** the sync command is run
- **THEN** it runs the same sync the schedule runs, as `easybank-sync` defines

#### Scenario: The three import paths skip the same rows

- **WHEN** a row already stored is offered by the manual import, the scheduled sync, the sync command, or the sync started from the screen
- **THEN** none of them writes a second copy of it

#### Scenario: The import is not reachable from the browser

- **WHEN** a browser request other than the sync-start request is made
- **THEN** no import is started by it, and the application offers no other control that starts one

#### Scenario: The migrations stay plain SQL files

- **WHEN** a database is prepared for use
- **THEN** its schema comes from the plain SQL files in the repository, applied automatically while the application starts, and the application generates or edits no migration file of its own

#### Scenario: The migrations are applied at startup

- **WHEN** the application starts against a database with pending migration files in the repository
- **THEN** they are applied before any request is served, and no person applies them by hand

#### Scenario: A recorded migration is not re-run

- **WHEN** the application restarts against a database whose history records a migration
- **THEN** that migration's SQL is not executed again

#### Scenario: Starting the application changes no schema and no data

- **WHEN** the server starts and serves requests against a database whose migrations are all recorded
- **THEN** no table, column, or row is created, altered, or removed by starting it

### Requirement: Starting requires a configured, reachable database

The system SHALL fail startup with a non-zero exit and serve no request when the database cannot be used: the address is missing or empty, the database cannot be reached, or a pending migration cannot be applied. The failure message SHALL name the missing configuration or the failing condition without including an address or a credential.

#### Scenario: Startup without an address

- **WHEN** the server is started with no address in the environment
- **THEN** startup fails with a non-zero exit before any request is served, and the message names the missing variable without including any credential

#### Scenario: Startup with an empty address

- **WHEN** the server is started with the address set to an empty value
- **THEN** startup fails with a non-zero exit and no request is served

#### Scenario: A stopped database is a start-up failure

- **WHEN** the application is started with no database running
- **THEN** it exits non-zero without serving the shell or the health endpoint

#### Scenario: A failed migration is a start-up failure

- **WHEN** a pending migration cannot be applied
- **THEN** the application exits non-zero without serving the shell or the health endpoint

### Requirement: The database address comes from the environment at run time

The system SHALL read the database address from the process environment at run time, and SHALL NOT require a configuration file in the repository to hold it. The system SHALL NOT ship a default address, and SHALL NOT resolve the address while the application is built, so that one build can be pointed at any database by changing only the environment.

#### Scenario: The address comes from the environment

- **WHEN** the server is started with the address present in the environment
- **THEN** the server reads that address and holds it for later use

#### Scenario: The address is resolved at run time rather than at build time

- **WHEN** one build of the application is run twice against two different addresses
- **THEN** each run reaches the database its own environment names, with no rebuild in between

### Requirement: No credential is committed and none is disclosed

No file committed to the repository SHALL hold a real database address, a user name, or a password; an example file MAY name the variables the application expects with no value for any of them. The system SHALL NOT include the address, a user name, a password, or any part of a connection string in a response body, in an error message shown to a browser, or in a log line.

#### Scenario: No credential is committed

- **WHEN** the repository is inspected
- **THEN** no file in it holds a real database address, user name, or password, and the example file holds variable names with empty values

#### Scenario: The address is never disclosed

- **WHEN** any response is returned or any log line is written
- **THEN** neither the response nor the log line contains the address, a user name, a password, or any part of a connection string

### Requirement: The application is installed, started, built, and served with no separate migration process

The system SHALL be installed, started, built, and served by commands declared in the project's package manifest, and SHALL NOT require a container runtime, a separate migration process or tool, or an external tool beyond a Node package installation. Someone who has installed the dependencies and configured a reachable database SHALL be able to start the application with one command and see the shell in a browser.

#### Scenario: One command starts the application

- **WHEN** the dependencies are installed, a reachable database is configured, and the start command is run
- **THEN** the application is served on a local address and the shell loads in a browser

#### Scenario: No orchestration is required

- **WHEN** the application is started
- **THEN** no container runtime and no separate migration process or tool is needed, because migrations run inside the application process against the externally provided database

#### Scenario: The built output serves the same shell

- **WHEN** the application is built and the built output is served
- **THEN** the shell and the health endpoint behave as they do when the application is started for development

### Requirement: The import command remains in the same manifest

The manifest SHALL keep the existing import command alongside the application commands, so that the tool and the application are run from one place.

#### Scenario: The import command remains in the same manifest

- **WHEN** the manifest's commands are listed
- **THEN** the import command is present and unchanged alongside the application's own commands
