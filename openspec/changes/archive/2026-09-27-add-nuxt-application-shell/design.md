# Design

## Context

See proposal.md — Why for motivation. The state that shapes this design:

- The repository is a Node 26.10 project with `"type": "module"`, `engines.node: ">=24"`, two runtime dependencies (`csv-parse`, `pg`), one TypeScript file run directly by Node's native type stripping, and two SQL migrations. There is no framework, no bundler, no build step, no linter, and no test runner. This change is the one that introduces all of that, and every later change inherits it — which is the main structural fact here.
- The root `tsconfig.json` is not enforced by anything. It exists for the editor, it sets `strict`, and its `include` is `tools/**/*.ts` alone. There is no `typescript` dev dependency and no `typecheck` script, so the annotations in the importer are documentation rather than a checked contract (the prior change's R1, deliberately accepted).
- Three capabilities exist and all three are constraints to conform to rather than to change. `transaction-csv-import` fixes a run that takes a file path, takes its database address from `--dsn` or `$DATABASE_URL`, and offers a mode that writes nothing and contacts no database. `transaction-postgres-schema` fixes two tables and states that the schema carries no business validation. `transaction-domain-model` fixes a `Transaction` as seven elements with a signed EUR amount and free-text purpose. None of them mentions a web application, and nothing in this change contradicts any of them.
- `pg` is already a dependency and already the only way this project reaches PostgreSQL. `DATABASE_URL` is already the project's name for the address: it is what the importer's usage text and its fallback read.
- No PostgreSQL server is running in this environment, and `psql` 17 is present. That is why "the shell must serve with no database" is a testable requirement here rather than a theoretical one: it is the only state that can be observed.
- The available versions at the time of writing are `nuxt` 4.5.2, whose `engines.node` is `^22.19.0 || ^24.11.0 || >=26.0.0`, `tailwindcss` 4.3.3, and `@tailwindcss/vite` 4.3.3. The machine runs Node 26.10.0, which satisfies Nuxt and is stricter than the repository's declared floor.
- Six decisions came from the user rather than from argument, and each one removes a fork this design would otherwise have to argue: Nuxt at the repository root rather than a subdirectory, the database wired but not queried, a layout, a home page, and an error page and nothing else, Tailwind rather than plain CSS, the importer left untouched, and no tooling beyond Nuxt's own defaults.
- Nuxt 4's own documentation fixes several facts this design leans on and does not re-argue: the application lives in `app/` and the server in `server/`; the `~` and `@` aliases resolve to `app/`, not to the repository root; the recommended root `tsconfig.json` is a project-references file pointing at four generated configs under `.nuxt/`; `.nuxt/` is generated output that belongs in `.gitignore`; and `error.vue` is not a route, is not automatically wrapped in a layout, and can still opt into one by naming it.

## Goals / Non-Goals

**Goals:**

- Give the project one application with two halves that later changes fill without re-litigating how the halves meet: a page and its data always travel the same origin, and the browser is never handed a credential.
- Make the empty application cheap to verify. Every requirement in `backend-shell` and `frontend-shell` is checkable in this environment with one command and one request, because the only missing piece is a running PostgreSQL and the shell does not need one.
- Fix the one decision every later feature inherits first — how the server reaches the database — while the cost of getting it wrong is still two files.
- Keep the existing terminal workflows exactly as they are. A person who only ever runs the importer should notice nothing about this change except that `npm install` takes longer.

**Non-Goals:**

- Any domain behaviour. No endpoint reads a row, no page shows one, no category pattern is evaluated, and the pool is left unused. That is the user's explicit instruction and it is what the specs require, not a placeholder for something half-built.
- Any authentication, session, or user. It is recorded as absent on purpose (D8), not overlooked.
- Any test runner, linter, formatter, or continuous integration. Nuxt's defaults only, per the user's choice; the absence is deliberate and R8 states what it costs.
- Any ORM, query builder, migration tool, or schema codegen. The schema is two tables of plain SQL and stays that way (D7).
- Any deployment story. No container, no reverse proxy, no process manager, no hosting target. The application is run locally and that is the whole story for now.
- Any change to `tools/import-transactions.ts`, to `db/migrations/`, or to the three existing capabilities. The application does not reach the importer, and the importer does not reach the application.
- Prerendering. The application is served, not generated, because it has a server that answers at run time.

## Decisions

### D1 — Nuxt 4 at the repository root, with the manifest shared with the CLI

`nuxt`, `nuxt.config.ts`, `app/`, and `server/` at the repository root; the existing root `package.json` becomes the Nuxt manifest and keeps its `import` script, its two runtime dependencies, and its `engines` field.

*Rationale:* one manifest, one `node_modules`, one `npm install`, one place to bump a version. The alternative the user rejected — a Nuxt app in a subdirectory with its own manifest — buys isolation that this repository does not need: there are two pieces of code in it, one file long. Isolation would cost a second dependency tree, a second lockfile, a second `tsconfig`, and a decision about which of the two `pg` instances is in play.

*Alternative considered:* keep the CLI in `tools/` as its own package and add a workspace root with two members. Rejected — a workspace root is more machinery than a two-package repository deserves, and it would move `package-lock.json` and the `import` script, which the CSV import's users have today.

### D2 — The root `tsconfig.json` becomes Nuxt's project-references file, and `tools/` drops out of it

The root `tsconfig.json` is replaced by the file Nuxt documents: `files: []` and four references to `.nuxt/tsconfig.app.json`, `.nuxt/tsconfig.server.json`, `.nuxt/tsconfig.shared.json`, and `.nuxt/tsconfig.node.json`.

*Rationale:* Nuxt generates the four configurations and puts the path aliases in them; a root file that both referenced them and carried its own `include` would either duplicate Nuxt's options or fight them. The cost is real and is R1: `tools/import-transactions.ts` is no longer inside any `tsconfig`'s `include`, because Nuxt's generated configs do not reach outside `app/`, `server/`, and `shared/`.

*Alternative considered:* leave the root `tsconfig.json` exactly as it is and let Nuxt's four generated files stand alone. Rejected — the documented root file is what makes an editor resolve the app's aliases and auto-imported types for `app/**` and `server/**`, and those are the files every later change adds. Trading editor support for the new code to keep editor support for a file nothing typechecks is the wrong direction. *Alternative considered:* give `tools/` its own `tsconfig.json` extending the root. Rejected as machinery for an unenforced annotation; it becomes worth doing in the same change that adds `typescript` and a `typecheck` script (O6).

### D3 — The database address is read in server code at run time, not in `nuxt.config.ts`

`server/` reads `process.env.DATABASE_URL` where the pool is created. Nothing in `nuxt.config.ts` touches it, and no `runtimeConfig` key carries the value.

*Rationale:* `nuxt.config.ts` is evaluated when the application is built, so `process.env.DATABASE_URL` written there would be captured into the server bundle at build time and the same build could not be pointed at a different database without rebuilding — which is precisely what `backend-shell` forbids. Reading it in server code resolves it when the process starts. The second reason is the name: `DATABASE_URL` is already what `tools/import-transactions.ts` reads and what its usage text tells the user to set, so one variable configures the whole project. A `runtimeConfig` key would be overridden through a different, prefixed variable name, and the user would have to set two names for one database.

*Trade-off accepted:* the address is not declared in the manifest's configuration section, so it is discoverable only from the server source. That is one line of code to read and it is in the same file that uses it.

*Alternative considered:* declare `runtimeConfig: { databaseUrl: '' }` and let the framework map `NUXT_DATABASE_URL` onto it. Rejected for the naming reason above; it is the framework-idiomatic answer and becomes the better one the moment there is a second environment-specific value, at which point a config key per value is the right shape. *Alternative considered:* commit a `.env` with the address. Rejected — that is the credential-in-the-repository failure the CSV import spec already forbids for the tool, and the same rule now applies to the application. *Alternative considered:* read a committed config file with a path to the address. Rejected — a second place to look, and a file to keep in sync for one value.

### D4 — One shared `pg` pool, created on first use, closed on shutdown, and left unqueried

`server/plugins/database.ts` registers a lazily created `pg.Pool` on the server's shared context; `server/utils/db.ts` exposes the single function that hands it out; a shutdown hook ends it. No statement is written.

*Rationale:* this is the whole of the "backend setup" the user asked for, and it is deliberately the smallest thing that answers the question the first feature will ask — *where does a query get its connection from?* The properties the spec requires are free properties of `pg.Pool` rather than added logic: a pool opens no connection until a statement runs on it, so "starting opens no connection" needs no guard; and one pool per process is what makes "two consumers get the same pool" true without a registry. The plugin exists so the pool is constructed once per process and so the shutdown hook has somewhere to live, not so that anything can reach it yet.

*Trade-off accepted:* the pool is dead code until the first feature. That is the price of answering the question now rather than when it is first asked, and it is two files to delete if the answer turns out to be different.

*Alternative considered:* run a `SELECT 1` at startup to fail fast on a bad address. Rejected — it contradicts the requirement that the shell serve with no database, and it is the behaviour a developer's first `npm run dev` should not depend on. *Alternative considered:* a query builder or an ORM. Rejected in D7. *Alternative considered:* one `pg.Client` instead of a pool. Rejected — a client is a single connection with manual checkout, which is the wrong primitive for a server that will hold concurrent requests, and "shared pool" is the property worth having now.

### D5 — Tailwind 4 through its Vite plugin, and no module

`tailwindcss` and `@tailwindcss/vite` as dev dependencies, the plugin added to `vite.plugins` in `nuxt.config.ts`, and `app/assets/css/main.css` containing `@import "tailwindcss";` and registered in the config's `css` array as `~/assets/css/main.css`. There is no `tailwind.config.js` and no PostCSS entry.

*Rationale:* this is the path Tailwind's own Nuxt guide documents for version 4, and it is the smallest one: a plugin entry, one stylesheet, one line in `css`. Tailwind 4 detects the files to scan on its own, so a content configuration is not merely unnecessary but absent from the design.

*Alternative considered:* the `@nuxtjs/tailwindcss` module. Rejected — it is built around Tailwind 3, brings a configuration file and a PostCSS path that version 4 no longer needs, and adds a module to a project whose only other module would be none. *Alternative considered:* `@nuxt/ui`, which handles Tailwind 4 automatically. Rejected — the user chose Tailwind without a component library, and this is the change that decides the design system arrives with the first real screen. *Alternative considered:* plain scoped CSS. Rejected by the user in favour of Tailwind; recorded here because the trade-off is real — utility classes are more verbose in the template, and the classes in the shell are nearly all of the styling that exists today.

### D6 — One layout, named explicitly by both the application root and the failure page

`app/layouts/default.vue` is the single layout. `app/app.vue` renders `<NuxtLayout><NuxtPage /></NuxtLayout>`, and `app/error.vue` renders `<NuxtLayout name="default">` around its own content.

*Rationale:* `frontend-shell` requires one frame on every route *and* on the failure page, and Nuxt does not give the second one for free: `error.vue` is not a route and is not wrapped automatically. Naming the layout in both places is the smallest way to make the requirement true, and it has a useful property — the failure page and a route cannot drift apart in their frame, because both ask for the same one. The alternative of a shared component imported into both files duplicates that guarantee in code.

*Trade-off accepted:* the layout name appears in two files rather than once, which is a rename hazard. It is a rename of one string in two places, and it is bought against the alternative of a failure page that silently renders without the application's styling.

*Alternative considered:* put the frame directly in `app.vue` and give `error.vue` its own copy of it, which is what Nuxt recommends when there is only one layout. Rejected — two copies of the frame is exactly the drift the requirement forbids. *Alternative considered:* no `error.vue` at all, so the framework's default page is used. Rejected — the default page is unstyled and generic, and `frontend-shell` requires a defined page.

### D7 — No ORM, no migration tool, and the first statement will be parameterised SQL

Nothing in this change introduces a data-access layer beyond `pg` itself, and the schema stays two SQL files applied with `psql`.

*Rationale:* `transaction-postgres-schema` fixes the columns exactly, down to which types preserve which domain guarantee, and states that the schema carries no business validation. An ORM would add a second description of that schema that can disagree with the first, plus a codegen step between editing a migration and running it, in a project whose schema is two tables and will stay small. When the first query arrives it will be `SELECT` or `INSERT` with bound parameters against a column list the spec already fixes — which is also the shape `tools/import-transactions.ts` already uses, so the project has one way of reaching a row.

*Alternative considered:* Drizzle or Prisma, both of which are TypeScript-first and would type the row shape. Rejected — the type of a row is not the hard part of this project; `numeric` and day-precision dates reaching the browser as exact values is, and neither tool solves that on its own.

### D8 — No authentication, and the shell is local until a change says otherwise

There is no login, no session, no token, and no middleware. The application is run on a local address by the person who owns the data.

*Rationale:* the user asked for no features, and a login is a feature with its own storage, its own spec requirements, and its own failure modes. Adding one now would be a screen that protects nothing, since the application exposes no data. The requirement that every requester is admitted is written into `backend-shell` precisely so that its absence is a recorded decision with a stated trigger for revisiting, rather than an oversight: the moment the application is served anywhere other than the machine of the person running it, that requirement is the first one to change.

*Trade-off accepted:* a development server that is reachable from the network serves an application with no protection. R4 states the condition.

*Alternative considered:* bind the server to the loopback address explicitly and treat that as the protection. Not rejected on merit — it is a one-line default and worth setting — but it is not a control, since it constrains the default rather than refusing an unauthorised request, and it is not something a spec can require of a proxy that may sit in front.

### D9 — Four manifest commands, and the import command beside them

`dev`, `build`, `preview`, and `postinstall` (which prepares the generated types) are added; `import` is untouched; `generate` is not added.

*Rationale:* these are the commands needed to install, develop, produce, and serve the application, and nothing else. `postinstall` is Nuxt's own convention rather than extra tooling: without it, `.nuxt/` is not generated at install time and the editor loses the aliases and auto-import types that D2 depends on. `generate` is deliberately absent because the application has a server; adding it would offer a mode that cannot work and would invite a later change to build a static artefact for an app that needs a database.

*Trade-off accepted:* `postinstall` runs a Nuxt command on every install, including a production one where the editor is not present. It is fast and it is what keeps the generated directory in step with the source.

### D10 — Two new capabilities and no delta to the existing three

`backend-shell` and `frontend-shell` are new capabilities. None of `transaction-domain-model`, `transaction-postgres-schema`, or `transaction-csv-import` receives a delta.

*Rationale:* the split follows the repository's own grain, which is one capability per independently evolving concern — the domain model, the stored shape, the file import. The server and the client are exactly that: the client will evolve with the design and the first screen, the server with the first endpoint, and neither needs the other's requirements in order to be understood. A single `application-shell` capability would have been defensible and smaller, and it is the shape to merge into if the two halves turn out to change together for years.

Nothing requires a delta. The application writes no row, so it contradicts no schema requirement; it never materialises a domain value, so it contradicts no domain requirement; and it does not run, wrap, or reach the importer, so the CSV import's contract — a path at run time, a non-writing mode that contacts no database, an address from arguments or the environment — is satisfied exactly as before. The one place the new code touches that capability's subject matter is the name `DATABASE_URL` and the `.gitignore` rule for environment files, both of which make the application's behaviour conform to what that spec already requires of the tool.

*Alternative considered:* amend `transaction-csv-import` to record that an application now exists. Rejected — the capability is about a file and a run, and "something else in the repository is a web server" is not a requirement about either. *Alternative considered:* a `project-structure` capability covering the manifest and the ignore rules. Rejected as too thin to carry requirements, and the parts of it a reader would want — what the commands are, what is generated — are implementation recorded in D9 and D11 rather than behaviour anyone depends on.

### D11 — Generated and secret-bearing files are excluded, and one example file names the variable

`.gitignore` gains `.nuxt/`, `.output/`, `.env`, and `.env.*` with `!.env.example`. A committed `.env.example` names `DATABASE_URL` with an empty value. `*.csv` and `node_modules/` stay.

*Rationale:* `.nuxt/` is generated and `.output/` is build output, and both are regenerated by the commands from D9; committing them would create merge conflicts on every change to a route. The environment files are the credential question, and this repository has already answered it once for the importer — the user's financial data and its connection string stay out of version control. The example file is the counterpart that makes the rule usable: the variable's name is discoverable in the repository, its value is not.

*Alternative considered:* ignore every dotfile at the root. Rejected as broader than needed and prone to hiding a file that should be tracked. *Alternative considered:* no example file. Rejected — a variable that can only be discovered by reading `server/utils/db.ts` is a variable nobody sets.

### D12 — A write method is safe because no endpoint exists, not because a request is refused

The `backend-shell` scenario originally required that a request using a method that creates, alters, or deletes be *refused* on any served path. Applying it showed that Nuxt answers `POST`, `PUT`, `PATCH`, and `DELETE` on a page path with the same document it renders for a read, and the requirement did not describe the system that exists. The user chose to narrow the contract rather than add code. The scenario is now scoped to paths under `/api`, where no endpoint answers such a request at all, and a second scenario records that a page path answers the same document whatever method is used.

*Rationale:* the guarantee the requirement was reaching for — nothing in this change can alter the user's financial data — holds without a guard, because the shell contains no statement that writes and registers no endpoint that could act on a request. A 405 guard would refuse a method that has nothing to refuse, in exchange for a global handler that every later endpoint is checked against for no gain; that is machinery a change that first introduces a write should decide on, when there is a row to protect.

*Alternative considered:* a `server/middleware/` guard returning 405 with an `Allow` header for every method that creates, alters, or deletes. Not rejected on merit — it is a small, correct piece of code — but it is a control against a hazard that does not exist yet, and the requirement it would satisfy was the requirement the user narrowed. If a later change adds an endpoint that writes, that change should pair the endpoint with the guard and strengthen the scenario to cover every path.

## Risks / Trade-offs

- **R1 — `tools/import-transactions.ts` is no longer covered by any `tsconfig.json`.** D2 replaces the root file with Nuxt's project-references form, whose generated configs do not reach `tools/`, and nothing typechecks that file in any case (there is no `typescript` dependency and no `typecheck` script). → Mitigation: this is the same accepted state the importer already had — the prior change's R1 — and it is not made worse by this change, only made differently shaped. The apply tasks require that the importer still runs unchanged after the manifest is edited, which is the check that actually matters for a file whose types are unenforced. Restoring coverage is a two-line change in the change that adds typechecking (O6), not a reason to keep a root config that fights Nuxt's.
- **R2 — The repository's declared Node floor is broader than Nuxt's.** `engines.node` says `>=24`, while `nuxt` 4.5.2 declares `^22.19.0 || ^24.11.0 || >=26.0.0`, which excludes 24.0 through 24.10. → Mitigation: the machine runs 26.10.0, which both accept, and `engines` is not enforced on install for this project. Narrowing the field to `^24.11.0 || >=26.0.0` is a one-line accuracy fix that this change does not need; it is recorded as O1 rather than made silently, because a manifest that contradicts its own dependency is a small thing to decide rather than assume.
- **R3 — An unused pool is dead code with a shutdown obligation.** D4 introduces a resource that nothing uses, and a pool that is never ended is a process that hangs on shutdown. → Mitigation: the plugin registers a shutdown hook that ends the pool, so the obligation has a home from the first commit rather than being remembered by whoever writes the first query. The apply tasks require that stopping the server with a pool created exits cleanly.
- **R4 — The application has no authentication and a development server can be reachable from the network.** D8. → Mitigation: the absence is a stated requirement with a stated trigger rather than an oversight, the server is run locally, and the task list includes binding the development server to the loopback address as the default. Neither is a control against a proxy in front of the application, which is why O5 stays open rather than being answered here.
- **R5 — One manifest now carries two unrelated things.** The application and a one-file CLI share a `package.json`, so a dependency added for the application and a script for the importer live in the same file. → Mitigation: this is the user's explicit choice, the file is small, and it is the arrangement that gives one lockfile and one install. The failure mode to watch is an application dependency being added to `dependencies` when the built server bundles it anyway, which is a per-dependency decision rather than a structural one.
- **R6 — The Tailwind path is newer than the widely documented one.** D5 follows the version 4 Vite-plugin path from Tailwind's own Nuxt guide, while most existing Nuxt examples use the `@nuxtjs/tailwindcss` module and a `tailwind.config.js`. → Mitigation: the apply tasks require that a utility class is actually styled in both `dev` and the built output, which is the check that distinguishes the two setups. If the plugin path misbehaves, the fallback is the module and its version 3 configuration, which is a manifest and one stylesheet change and affects no requirement. The one detail to confirm during implementation is the `css` entry: Nuxt 4 resolves `~` to `app/`, so `~/assets/css/main.css` names `app/assets/css/main.css`, and community reports exist of the root-relative form being needed instead.
- **R7 — `postinstall` can fail an otherwise good install.** D9's `postinstall` runs on every install, so a Nuxt preparation error surfaces as a failed install rather than as a broken editor. → Mitigation: preparation is deterministic from the source tree and the commit is expected to leave it passing; the apply tasks run a clean install to confirm. This is a deliberate trade for keeping the generated types in step with the source, and it is the framework's own convention.
- **R8 — Nothing verifies the shell automatically.** No test runner, per the user's choice, so the only checks are that the build succeeds and that a request answers as the specs describe. → Mitigation: every requirement in both capabilities is written to be checkable by hand in one command and one request, and the apply tasks require each of them to be exercised — the health endpoint answered, an unknown path refused, a write method reaching no endpoint, a stopped database still serving, the delivered document inspected for a credential, and the import command still working. A check that cannot be performed in this environment — a build or a request that fails — is to be reported as a blocker rather than marked complete, which is the rule the prior change set for its own migration work.
- **R9 — The application is developed in a mode that differs from the one it is served in.** Development and the built output are different runtimes, and a shell that works in one can fail in the other. → Mitigation: `backend-shell` and `frontend-shell` both require the built output to behave as development does, and the apply tasks exercise the built output through the preview command rather than treating a successful development server as sufficient.
- **R10 — The first feature inherits these decisions without having argued them.** One origin, an environment-read address, a shared lazy pool, raw SQL, an unauthenticated local application, and a Tailwind stylesheet are all fixed here, and the change that adds a transaction list will build on every one of them. → Mitigation: each is recorded above with the alternative that was rejected and the condition under which it should change, so a later change amends this capability's decisions with a reason rather than working around them silently. The two that are most likely to be wrong are the unauthenticated local assumption (R4) and the possibility that the browser needs a second origin at all, which would be true if a static export were ever chosen.
- **R11 — The two halves share no type, so a change to a row shape is made twice.** `shared/` exists for code both sides use, and this change puts nothing in it. → Mitigation: correct for now, because there is no row shape to share — the application has no endpoint and no page that shows a transaction. The first feature that returns a row decides what belongs in `shared/`, and D7's raw-SQL answer means the decision is about a plain object shape rather than about an ORM's model.

## Migration Plan

Not applicable in the database sense: this change adds no migration, edits neither existing one, and writes no row. The deployment is the source tree and its manifest, and the rollback is deleting `app/`, `server/`, `nuxt.config.ts`, and `.env.example`, and restoring `package.json`, `tsconfig.json`, and `.gitignore` to their current contents. `tools/`, `db/`, and all three existing specs are untouched by the rollback because nothing in this change touches them.

Adoption, in this order: install the dependencies, which prepares the generated types; start the application with the development command and open the local address to see the shell; request the health endpoint and confirm it answers without a database running; stop the database, or never start one, and confirm the shell and the endpoint still answer; run the import command with a statement path in its non-writing mode and confirm it reports as it did before, then run it for real against the same address the application is configured with. The order matters in one place only: the importer is checked after the manifest is edited, because that is the only pre-existing behaviour this change can disturb.

There is no data to reconcile and no state to migrate, because no state was created.

## Open Questions

Each of these can be answered later without changing the specs written here, the approach, or the task breakdown.

- **O1 — The `engines` floor and the version pin.** Whether `engines.node` should be narrowed to the range `nuxt` actually accepts (R2), and whether the Nuxt version is pinned exactly or tracked with a caret. Answerable from the first `npm install` that warns.
- **O2 — What the health endpoint reports once a database check is meaningful.** It reports on the server alone, deliberately, so that a stopped database is never presented as a broken application. When there is a first endpoint that actually needs the database, whether the health endpoint grows a separate readiness path or stays as it is is a question for that change.
- **O3 — Whether an import is ever triggerable from the browser.** Out of scope and unreachable now. If it is ever wanted, it is a change to `transaction-csv-import` as much as to this one, because the source file's location, its absence from the repository, and the all-or-nothing rule are all that capability's requirements.
- **O4 — What belongs in `shared/`.** Nothing yet (R11). The first feature that returns a row to a page answers it.
- **O5 — What protects the application if it is ever hosted.** No authentication (D8), a development server that can be reachable from the network (R4), and no deployment story at all. Whether the answer is a reverse proxy with TLS, a real login, or simply never hosting it are all live possibilities, and choosing among them is a change with its own requirements.
- **O6 — Whether and when typechecking arrives.** Nothing enforces the annotations in either the importer or the new code (R1), and the user chose Nuxt's defaults. Adding `typescript`, `vue-tsc`, and a `typecheck` script is the natural companion to the first feature rather than to an empty shell, and it is the change that would restore coverage for `tools/`.
- **O7 — The design tokens.** Tailwind's defaults style the shell, and no theme, palette, or component convention has been chosen (D5). The first screen with real content is the moment those decisions have something to be decided against.
