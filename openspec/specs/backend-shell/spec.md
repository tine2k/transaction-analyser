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
`category-management-api` capability defines; and a read-only import log at `/api/imports`,
which returns recent import runs as the `import-log` capability defines. The health endpoint
SHALL report on the server alone and SHALL NOT report on the database, so that a database which
is unreachable is never presented as the application being down. The system SHALL NOT expose any
further endpoint, SHALL NOT expose any endpoint that creates, changes, or deletes a transaction,
SHALL NOT expose any endpoint that starts an import, and SHALL allow a category to be written
only through the category management surface. A request for a path under `/api` that no endpoint
matches SHALL be answered by the browser application rather than by an endpoint, SHALL NOT read
or write a row in the database, and SHALL NOT be reported as a missing resource.

#### Scenario: The health endpoint answers

- **WHEN** a request is made for the health endpoint
- **THEN** the server answers with a success status and a small body in a machine-readable form stating that the server is up

#### Scenario: Only the named endpoints exist

- **WHEN** a request is made for a path under `/api` other than the health endpoint, the transactions endpoint, the category management surface, and the import log
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

#### Scenario: No request can alter stored data

- **WHEN** a request using a method that creates, alters, or deletes is made to the transactions endpoint, the import log, or a page path
- **THEN** no endpoint acts on it, and no transaction row is created, altered, or deleted

#### Scenario: No request starts an import

- **WHEN** a request is made to any path the application serves
- **THEN** no import is started by it, and the browser offers no control that starts one

#### Scenario: A page path answers with the same document whatever method is used

- **WHEN** a request using a method that creates, alters, or deletes is made to a path that renders a page
- **THEN** the server answers with the same document it renders for a read, because no endpoint on a page path acts on the request, and so no row is created, altered, or deleted

#### Scenario: The health endpoint says nothing about the database

- **WHEN** the health endpoint is requested while the database is unreachable
- **THEN** the response is the same as when the database is reachable, because the endpoint reports on the server alone

### Requirement: The database address and its credentials come from the environment and are never disclosed

The system SHALL read the database address from the process environment at run time, and SHALL NOT require a configuration file in the repository to hold it. The system SHALL NOT ship a default address, and SHALL NOT resolve the address while the application is built, so that one build can be pointed at any database by changing only the environment. No file committed to the repository SHALL hold a real database address, a user name, or a password; an example file MAY name the variables the application expects with no value for any of them. The system SHALL NOT include the address, a user name, a password, or any part of a connection string in a response body, in an error message shown to a browser, or in a log line.

#### Scenario: The address comes from the environment

- **WHEN** the server is started with the address present in the environment
- **THEN** the server reads that address and holds it for later use

#### Scenario: The address is not needed to start

- **WHEN** the server is started with no address in the environment
- **THEN** it starts and serves the health endpoint, and the missing address is reported only when something asks the database for data

#### Scenario: The address is resolved at run time rather than at build time

- **WHEN** one build of the application is run twice against two different addresses
- **THEN** each run reaches the database its own environment names, with no rebuild in between

#### Scenario: No credential is committed

- **WHEN** the repository is inspected
- **THEN** no file in it holds a real database address, user name, or password, and the example file holds variable names with empty values

#### Scenario: The address is never disclosed

- **WHEN** any response is returned or any log line is written
- **THEN** neither the response nor the log line contains the address, a user name, a password, or any part of a connection string

### Requirement: One shared connection pool serves every consumer, opened only when it is used

The system SHALL hold one shared database connection pool per server process, built from the configured address, and every consumer of the database SHALL obtain that same pool rather than opening a connection of its own. The system SHALL NOT open a connection while the server starts, while a page is rendered, or while a request is answered; a connection SHALL be established only when a statement is run through the pool. The system SHALL release the pool's connections when the server shuts down. The pages and the health endpoint SHALL run no statement, so the pool is opened only when a statement is run through it, which the transactions read endpoint, the category management surface, the import log endpoint, and the scheduled sync task do.

#### Scenario: Starting opens no connection

- **WHEN** the server starts with no database reachable
- **THEN** it starts, opens no connection, and reports no database failure

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

The system SHALL keep the command-line import tool runnable as a command, taking the path to the statement as its argument, taking the database address from its arguments or the environment, and offering its non-writing mode, and SHALL keep it in the manifest. The tool SHALL share its parsing, validation, deduplication, and write path with the scheduled sync and the sync command, so that all three import the same way, as `transaction-csv-import` defines. The system SHALL offer a sync command that runs the same sync by hand, as `easybank-sync` defines. The application SHALL NOT offer any way to start an import from the browser. The system SHALL leave the database migrations as plain SQL files applied by the person running them, SHALL NOT edit a migration that has already been applied, and SHALL NOT apply, generate, or require any migration when the application starts or serves a request; a new table SHALL arrive as a new migration file applied the same way.

#### Scenario: The import command keeps its interface

- **WHEN** the import command is run with a statement path
- **THEN** it takes that path and the database address as before, offers its non-writing mode, and is run by the same manifest entry

#### Scenario: The sync command runs by hand

- **WHEN** the sync command is run
- **THEN** it runs the same sync the schedule runs, as `easybank-sync` defines

#### Scenario: The three import paths skip the same rows

- **WHEN** a row already stored is offered by the manual import, the scheduled sync, or the sync command
- **THEN** none of them writes a second copy of it

#### Scenario: The import is not reachable from the browser

- **WHEN** a request is made for any path under `/api`
- **THEN** no import is started, and the application offers no control that starts one

#### Scenario: The migrations stay plain SQL files

- **WHEN** a database is prepared for use
- **THEN** it is prepared by applying the SQL files with a database client, and the application performs no schema step of its own

#### Scenario: Starting the application changes no schema and no data

- **WHEN** the server starts and serves requests against a database holding the migrated schema and its rows
- **THEN** no table, column, or row is created, altered, or removed by starting it

### Requirement: The application is installed, started, built, and served with no other service

The system SHALL be installed, started, built, and served by commands declared in the project's package manifest, and SHALL NOT require a container runtime, a separate process, or an external tool beyond a Node package installation. Someone who has installed the dependencies SHALL be able to start the application with one command and see the shell in a browser. Being unable to reach the database SHALL NOT be reported as a failure to start or to serve. The manifest SHALL keep the existing import command alongside the application commands, so that the tool and the application are run from one place.

#### Scenario: One command starts the application

- **WHEN** the dependencies are installed and the start command is run
- **THEN** the application is served on a local address and the shell loads in a browser

#### Scenario: No other service is required

- **WHEN** the application is started
- **THEN** no database, no container runtime, and no process other than the application itself is needed for the shell to be served

#### Scenario: A stopped database is not a start-up failure

- **WHEN** the application is started with no database running
- **THEN** it starts and serves the shell and the health endpoint, and the absence of the database is not reported as a failure

#### Scenario: The built output serves the same shell

- **WHEN** the application is built and the built output is served
- **THEN** the shell and the health endpoint behave as they do when the application is started for development

#### Scenario: The import command remains in the same manifest

- **WHEN** the manifest's commands are listed
- **THEN** the import command is present and unchanged alongside the application's own commands
