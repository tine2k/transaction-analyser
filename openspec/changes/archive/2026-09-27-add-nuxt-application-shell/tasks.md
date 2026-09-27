# Tasks

## 1. Manifest, configuration, and ignore rules

- [x] 1.1 Add `nuxt` (4.5.2), `tailwindcss`, and `@tailwindcss/vite` as dev dependencies and the `dev`, `build`, `preview`, and `postinstall` (running the framework's type preparation) scripts to `package.json`, leaving `import`, `csv-parse`, `pg`, `type: module`, and `engines` untouched; verify with `npm install` that it completes and that `npm run` lists all five commands
- [x] 1.2 Replace the root `tsconfig.json` with the project-references file pointing at the four generated configurations under `.nuxt/`, and verify that the generated directory now exists and that the editor resolves the app aliases (see design.md D2 and R1 for what stops covering `tools/`)
- [x] 1.3 Create `nuxt.config.ts` with the Tailwind Vite plugin registered and `app/assets/css/main.css` registered in the `css` array, and verify that `npm run dev` starts and that the stylesheet is served; if the `~`-relative path does not resolve to `app/assets/css/main.css`, switch that one entry to a root-relative path and record what was needed (R6)
- [x] 1.4 Extend `.gitignore` with `.nuxt/`, `.output/`, `.env`, and `.env.*` plus a `!.env.example` negation, keeping `*.csv` and `node_modules/`, and verify with `git status --porcelain` and `git check-ignore -v` that the generated directory and a real `.env` are ignored while `.env.example` is not
- [x] 1.5 Create `.env.example` naming `DATABASE_URL` with an empty value and no other content, and verify that a grep of the tracked files for a `postgres://` or `postgresql://` value with credentials returns nothing
- [x] 1.6 Create `app/app.vue`, `app/layouts/default.vue`, `app/pages/index.vue`, and `app/error.vue` as the framework's own scaffold requires, leaving each to be filled by groups 2 and 3, and verify that `npm run dev` starts with no error about a missing application root

## 2. Browser application shell

- [x] 2.1 Fill `app/layouts/default.vue` as the single frame — shared head metadata, page container, and heading area — and verify in `dev` and in the built output that its content appears on every route served (design.md D6)
- [x] 2.2 Make `app/app.vue` render the layout around the page outlet, and verify that requesting the index route returns a document whose content sits inside that frame
- [x] 2.3 Fill `app/pages/index.vue` with placeholder text identifying the application and nothing else — no transaction, category, amount, date, or counterparty, and no control that reads or changes anything — and verify by loading the page against a database that holds rows and confirming no stored value appears
- [x] 2.4 Confirm the delivered document for the index route already contains the placeholder text, without any browser-side step, and record the observation
- [x] 2.5 Fill `app/error.vue` so it renders inside the same named layout, names the status so a missing route reads as missing, and offers a way back to the index route, and verify by requesting a path that does not exist that the failure page is delivered with a not-found status inside the same frame
- [x] 2.6 Confirm the failure page is styled by the same stylesheet as every other route with no styling of its own, and that the project's dependencies still contain no component library, design system, or icon set

## 3. Server shell and database wiring

- [x] 3.1 Add `server/api/health.get.ts` as a read-only endpoint returning a small machine-readable body stating the server is up, and verify that requesting it answers with a success status and a body naming that state
- [x] 3.2 Add `server/utils/db.ts` exposing one function that hands out a single `pg` pool built from the address in the process environment, created on first use, and add `server/plugins/database.ts` registering it once per process together with a shutdown hook that ends it, reading the address in server code rather than in `nuxt.config.ts` (design.md D3, D4)
- [x] 3.3 Verify with no `DATABASE_URL` set that the server starts and the health endpoint still answers, and that the missing address is reported only when something asks the database for data
- [x] 3.4 Verify that starting the server and requesting both the index route and the health endpoint establish no connection to the database, and that stopping the server with the pool created exits cleanly rather than hanging
- [x] 3.5 Verify that no path under `/api` other than the health endpoint is answered, that a request using a method that creates, alters, or deletes reaches no endpoint, and that a page path answers the same document whatever method is used, with no row read or written
- [x] 3.6 Set the development server's default host to the loopback address, and verify it is reported as listening locally and is not reachable from another address on the network

## 4. Whole-application checks

- [x] 4.1 Run `npm run build` and then serve the built output, and verify that the index route, the failure page, and the health endpoint all behave as they do in development, with the same document, the same frame, and the same endpoint body
- [x] 4.2 Inspect the delivered document and the built client assets for a database address, a user name, a password, or any part of a connection string, and verify none is present; confirm the page's only requests are same-origin requests to the API
- [x] 4.3 Confirm the application writes no cookie, no local storage entry, and no session storage entry, presents no sign-in control, and that two browsers see the same page with nothing identifying either
- [x] 4.4 Run the import command with a statement path in its non-writing mode and confirm it reports exactly as it did before this change, then confirm the command is still listed unchanged in the manifest and that `tools/import-transactions.ts` and both files in `db/migrations/` are unmodified in the diff
- [x] 4.5 Review the full diff to confirm no query, statement, or migration was added anywhere, that `shared/` is still empty, and that neither `transactions` nor `categories` was read or written; report any check that cannot be performed in this environment as a blocker rather than marking it complete (R8)
