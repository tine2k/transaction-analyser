# Tasks

## 1. Manage hub

- [x] 1.1 Add `app/pages/manage.vue` with the `Manage` heading, intro, and entries for People, Categories, and Imports linking to `/people`, `/categories`, and `/imports`; verify every entry's link target and that the page carries no form, sync control, or destructive action.
- [x] 1.2 Wire the three independent reads (`/api/people`, `/api/categories`, `/api/imports`) and render each row in the order pending, error, empty, value, so a default empty array never appears as "none" while loading; verify each state with mocked endpoints in task 1.4.
- [x] 1.3 Extract the imports timestamp and outcome formatters into `app/utils/import-format.ts`, use them from `app/pages/imports.vue` and `app/pages/manage.vue`, and verify the imports log renders the same started and outcome text as before.
- [x] 1.4 Add `tests/components/manage.test.ts` covering the three rows, link targets, counts, loading, empty, failed read, failed run, and absence of write controls; run `pnpm exec vitest run tests/components/manage.test.ts`.
- [x] 1.5 Add `tests/browser/manage.spec.ts` at desktop and 320 CSS pixels with mocked endpoints, covering per-row status, link navigation, 44px targets, and no page overflow; run it through `bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/manage.spec.ts`.

## 2. Navigation shell

- [x] 2.1 Restructure `app/layouts/default.vue`'s route list into the eight named routes with bar membership and management-section membership; render five bar links and mark Manage current on `/manage`, `/categories`, `/people`, and `/imports`, using `aria-current="page"` on `/manage` and `aria-current="true"` on the sections; keep the mobile drawer on the same five links.
- [x] 2.2 Update `tests/components/layout.test.ts` for five links and labels, no Categories/People/Imports bar links, Manage current on the four management routes, and five links in the mobile drawer; run `pnpm exec vitest run tests/components/layout.test.ts`.
- [x] 2.3 Add `/manage` to `tests/browser/document-title.spec.ts` and keep all eight screen titles; run `bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/document-title.spec.ts`.
- [x] 2.4 Update `tests/browser/redesign-transactions-screen.spec.ts` for five bar labels and counts while keeping the gradient, active-pill, focus, and overflow assertions; run `bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/redesign-transactions-screen.spec.ts`.
- [x] 2.5 Update `tests/browser/responsive.spec.ts` for five nav links at phone and wide widths, Manage as the current link on `/categories`, `/manage` added to the `routes` matrix, and the mobile navigation test following Manage; run `bash tests/run-with-test-database.sh pnpm exec playwright test tests/browser/responsive.spec.ts`.

## 3. Categories link on Transactions

- [x] 3.1 Restructure the Category field in `app/pages/index.vue` into a label, a `Manage categories` link (`data-testid="manage-categories-link"`), and the select, keeping the select's label association, 48px height, and full width; verify the link reaches `/categories` and the Category filter still filters.
- [x] 3.2 Style the link as a quiet text link with a hit area of at least 44px at phone widths that may wrap inside the Category field; verify at 320 CSS pixels that the search row, the Person/Period pair, the full-width Category control, and the page width are unchanged.
- [x] 3.3 Add browser coverage that the link reaches `/categories` at phone and desktop widths and that the Category filter's choices and default are unchanged; add `manage-categories-link` to the phone touch-size selector in `tests/browser/responsive.spec.ts`; run the affected browser specs.

## 4. Integration verification

- [x] 4.1 Run `pnpm run test:unit` and `pnpm run test:components`; fix failures until both pass.
- [x] 4.2 Run `pnpm run test:browser` and `pnpm run test:integration`; fix failures until both pass.
- [x] 4.3 Run `pnpm run build` and verify it succeeds.
- [x] 4.4 Do a headless Chromium pass at 320, 768, and 1440 CSS pixels across `/`, `/categories`, `/manage`, and `/imports`; verify five bar pills, Manage marked current, the three hub rows, and no page-level horizontal overflow.
- [x] 4.5 Review `README.md` for screen and navigation prose and update any reference that now points at a bar link; verify the documented flow matches the new navigation.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived specs carry the five-destination bar and the `manage-hub` capability.
