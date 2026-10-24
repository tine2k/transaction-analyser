# Tasks

## 1. Artwork and icon files

- [x] 1.1 Create `public/icon.svg` from the geometry in design.md D1 — paper field, 88% disc, wedges
  `#2F5FA8` 54% / `#D97A2B` 28% / `#3E8E5A` 18% clockwise from 12 o'clock, paper seams at 3.5%, no
  outline. Verify by screenshotting it in headless Chromium at 180px and 40px and confirming the
  disc, its seams, and the wedge order are all still legible at 40px.
- [x] 1.2 Add `tools/render-app-icon.mjs` using Playwright's Chromium to render the artwork into
  `public/apple-touch-icon.png` (180), `public/icon-192.png` (192), `public/icon-512.png` (512), and
  `public/icon-maskable-512.png` (512, artwork scaled so the disc is 72%). Verify every file exists
  and each PNG's IHDR reports the expected width and height, colour type 2 (RGB, no alpha), and 8-bit
  depth.
- [x] 1.3 Add `public/site.webmanifest` with `name` and `short_name` `Expenses`, `start_url` `/`, no
  `display` member, `theme_color` and `background_color` `#F6F6F3`, and icon entries for the 192 and
  512 PNGs plus the maskable 512. Verify it parses with `node -e "JSON.parse(...)"` and every icon
  `src` names a file that exists in `public/`.
- [x] 1.4 Add a short "Application icon" paragraph to the README's Development section naming
  `tools/render-app-icon.mjs` as the regeneration command and stating that an existing home-screen
  shortcut keeps its old icon until it is removed and added again. Verify the documented command runs
  as written from the repository root.
- [x] 1.5 Add integration coverage in `tests/integration/api.test.ts` that `/apple-touch-icon.png`
  answers `200` with a PNG whose IHDR is 180×180 and colour type 2, and that `/site.webmanifest`
  answers JSON naming `Expenses` with icon entries that answer an image. Verify with
  `npm run test:integration`.

## 2. Shell metadata

- [x] 2.1 Add the `app.head` links and metas from design.md D4 to `nuxt.config.ts` — SVG and 192 PNG
  icons, `apple-touch-icon`, `manifest`, `apple-mobile-web-app-title`, and `theme-color`. Verify with
  `npm run build` and a request for `/` that the delivered shell's `<head>` carries all four links and
  both metas. The build emits no `index.html` because `ssr` is off, so the shell is inspected through
  the server, not through a build output file.
- [x] 2.2 Extend the same integration test to assert the built shell carries the icon link, the
  manifest link, and the `apple-mobile-web-app-title` meta naming `Expenses`. Verify with
  `npm run test:integration`.
- [x] 2.3 Confirm the container still ships the assets: `docker build` the image from `Dockerfile`
  and fetch `/apple-touch-icon.png` and `/site.webmanifest` from the running container. Verify both
  answer from the image with no Dockerfile change.

## 3. User-facing name

- [x] 3.1 Replace the masthead text and the layout's fallback `title` with `Expenses` in
  `app/layouts/default.vue`, leaving the type treatment and layout untouched. Verify
  `tests/components/layout.test.ts` asserts a masthead reading `Expenses`.
- [x] 3.2 Change the fixed Pushover test message in `shared/import-notification.ts` to name
  `Expenses`. Verify `tests/unit/import-notification.test.ts` asserts the sent message names the
  application.
- [x] 3.3 Confirm nothing user-facing still says `Transaction Analyser`: grep `app/`, `shared/`, and
  `server/` and verify only project-identity files (README title, `package.json` name, container and
  database names, docs) mention it. Verify `npm run test:unit` and `npm run test:components`.

## 4. Per-route tab titles

- [x] 4.1 Derive the title in `app/layouts/default.vue` from the existing `screens` list and
  `route.path`, falling back to `Expenses`, and pin `title: 'Expenses'` in `app/error.vue` as design.md
  D5 describes. Verify the built application shows each of the six expected titles by reading
  `document.title` in headless Chromium.
- [x] 4.2 Add `tests/browser/document-title.spec.ts` covering the six routes, navigation from one
  screen to another without a reload, and a missing path. Verify with `npm run test:browser`.

## 5. Integration checks

- [x] 5.1 Run `npm test` end to end (unit, components, integration) and verify every suite passes.
- [x] 5.2 Build and serve the application, then in headless Chromium verify the shell's icon and
  manifest links resolve, the tab title matches the screen, the masthead reads `Expenses`, and no
  user-facing screen presents `Transaction Analyser`.

## Workflow follow-up

- Archive the change after review; `AGENTS.md` requires the archive step to commit and push the
  result.
