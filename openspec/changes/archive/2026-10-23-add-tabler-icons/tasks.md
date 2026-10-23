# Tasks

## 1. Icon dependency and display defaults

- [x] 1.1 Add `@tabler/icons-vue` (^3.49) to `dependencies` in `package.json` and run `npm install`; verify with `npm ls @tabler/icons-vue` that the package resolves to a single 3.x version.
- [x] 1.2 Create `app/components/AppIcon.vue` taking the icon component as a prop and applying 16px size, 1.5 stroke width, `shrink-0`, and `aria-hidden="true"`.
- [x] 1.3 Add `tests/components/app-icon.test.ts` mounting `AppIcon` with a Tabler icon and asserting the rendered `svg` carries width/height 16, `stroke-width="1.5"`, and `aria-hidden="true"`; run `npx vitest run tests/components/app-icon.test.ts`.

## 2. Navigation

- [x] 2.1 Put each navigation link's Tabler icon beside its label in `app/layouts/default.vue`, with `gap-2` and `currentColor` so the current screen's icon and label share the ink color; verify no label text changed by running `npx vitest run tests/components/layout.test.ts`.
- [x] 2.2 Replace the mobile disclosure's "Menu"/"Close" words with `IconMenu2`/`IconX` while keeping the 44px box, `aria-controls`, `aria-expanded`, and the existing `aria-label` that now names it; extend `tests/components/layout.test.ts` to assert the toggle contains one decorative `svg` and still toggles `aria-expanded`.
- [x] 2.3 Add a navigation assertion to `tests/components/layout.test.ts` that every nav link contains exactly one `svg[aria-hidden="true"]` and that the link text still equals its screen label; run `npx vitest run tests/components/layout.test.ts`.

## 3. Imports actions

- [x] 3.1 Add `IconRefresh`, `IconSparkles`, and `IconSend` before the labels of the sync, re-categorise, and test-notification buttons in `app/pages/imports.vue`, with `gap-2` on each button; run `npx vitest run tests/components/imports.test.ts` and confirm the existing `button.text()` assertions still pass.
- [x] 3.2 Add an assertion to `tests/components/imports.test.ts` that each of the three action buttons contains one decorative `svg`; rerun the same file.

## 4. Category and assignment actions

- [x] 4.1 Add `IconPlus` to the "Add expression", "Add window", and "Add category"/"Save changes" submit, `IconX` to "Remove" (pattern and window) and "Cancel", `IconPencil` to "Edit", and `IconTrash` to "Delete" in `app/pages/categories.vue`, keeping every word label and the delete button's failure color; run `npx vitest run tests/components/categories.test.ts`.
- [x] 4.2 Add `IconCheck` to "Apply" and `IconX` to "Clear selection" in `app/components/BulkAssignmentBar.vue`; run `npx vitest run tests/components/bulk-assignment-bar.test.ts`.
- [x] 4.3 Add `IconPlus` to the pattern shortcut button in `app/components/PatternShortcutBar.vue`; run `npx vitest run tests/components/pattern-shortcut-bar.test.ts`.

## 5. Replace the hand-drawn marker

- [x] 5.1 Replace the inline map-pin `svg` in `app/pages/index.vue` with `IconMapPin` at 14px inside the existing `data-testid="manual-assignment-marker"` span, keeping its `sr-only` text; run `npx vitest run tests/components/transactions.test.ts`.
- [x] 5.2 Confirm no hand-written icon path remains in `app/` (`grep -rn "<path" app`) and that no other icon package appears in `package.json`; run `npm ls --depth=0` and compare the dependency list.

## 6. Integration and evidence

- [x] 6.1 Run `npm run test:unit` and `npm run test:components`; all suites pass.
- [x] 6.2 Run `npm run build` and inspect the client output for icon assets: confirm no icon-font file and no external icon URL is referenced.
- [x] 6.3 Run `npm run test:browser`; the navigation, imports, categories, pattern-shortcut, sorting, and manual-assignment specs pass in headless Chromium.
- [x] 6.4 Capture headless Chromium screenshots of the transactions screen at 320px, 640px, and 1280px widths; confirm the six nav items wrap without overlap, action buttons align their icons and labels, and the manual-assignment pin sits on the row's text baseline.
- [x] 6.5 Run `npx --yes @fission-ai/openspec@1.14.3 validate add-tabler-icons --strict`; the change validates, including the modified `frontend-shell` requirement.

## Workflow follow-up

- Archive the change after review.
- On archive, commit all changes and push to the remote, per `AGENTS.md`.
