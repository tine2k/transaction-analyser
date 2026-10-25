# Tasks

## 1. Mark artwork and shared source

- [x] 1.1 Create `app/components/AppLogo.vue` with the four-wedge mark copied verbatim from `design/Logo.dc.html` (bright fills, masked 1.8-unit seams, pink wedge's `translate(-0.74 -1.42)` offset) and a `size` prop defaulting to 30; render it `aria-hidden="true"` and `focusable="false"` with prefixed gradient/mask IDs. Verify with a new `tests/components/app-logo.test.ts` asserting the four fills, the hidden/undecorated accessible state, and the default and overridden dimensions, run through `pnpm run test:components`.
- [x] 1.2 Replace `public/icon.svg` with the full-bleed gradient tile: the design's 105deg `#0F1B5C → #1E2A9E → #2F3FC2 → #1D6FA8` ground, both tinted sheens, and the mark at 62.5% of the field with transparent seams. Verify the file parses as SVG and renders the four wedges over the gradient at 180px in headless Chromium, with no paper field and no rounded transparent corners.
- [x] 1.3 Add a unit test that extracts the wedge `d` values, fills, and the pink transform from both `app/components/AppLogo.vue` and `public/icon.svg` and asserts they match, so the mirrored geometry cannot drift. Verify the test passes and fails when either copy is changed alone.

## 2. Application icon pipeline

- [x] 2.1 Simplify `tools/render-app-icon.mjs` to screenshot the self-contained `public/icon.svg` at 180, 192, 512, and 512 without the paper background or `disc` scale, and update its comments. Regenerate the four PNGs, then verify each IHDR reports its expected size and that `apple-touch-icon.png` remains colour type 2 (no alpha) under `pnpm run test:integration`.
- [x] 2.2 Extend `tests/integration/api.test.ts` so `/icon.svg` answers as SVG containing the four wedge fills and the gradient ground, while the existing 180×180 opaque touch-icon and manifest icon-resolution assertions remain unchanged. Verify with `pnpm run test:integration`.
- [x] 2.3 Update the icon paragraph in `README.md` to name `app/components/AppLogo.vue` as the on-screen mark and `public/icon.svg` as the installable copy guarded by the geometry test, keeping the documented `node tools/render-app-icon.mjs` regeneration command accurate. Verify every referenced path exists and the command runs as written.

## 3. Masthead logo

- [x] 3.1 Add `AppLogo` immediately left of the `Expenses` wordmark in `app/layouts/default.vue`, keeping the wordmark's 20px/800 styling, the mobile toggle at the far right, and the navigation wrapping below the row on desktop. Verify the header still exposes exactly one `Expenses` text node and no new link, control, or accessible name.
- [x] 3.2 Extend `tests/components/layout.test.ts` to assert the logo precedes the wordmark, renders at 30px, is `aria-hidden`, adds no link, and leaves the seven navigation links and the mobile disclosure unchanged. Verify with `pnpm run test:components`.
- [x] 3.3 Add a headless-Chromium assertion at desktop and phone widths that the logo is visible beside `Expenses` and introduces no horizontal overflow, then inspect screenshots of both widths. Verify with `pnpm run test:browser`.

## 4. Integration verification

- [x] 4.1 Run `pnpm run test:unit`, `pnpm run test:components`, `pnpm run test:integration`, and `pnpm run test:browser`; confirm the new mark appears in the masthead, favicon, touch icon, and manifest icons, and that no pre-existing suite regresses.
- [x] 4.2 Search `app/`, `public/`, `tools/`, and `README.md` for the old pie-chart fills (`#2f5fa8`, `#d97a2b`, `#3e8e5a`) and the old "pie-chart"/paper-field wording; confirm none remain outside `openspec/changes/archive/`, and that the paper theme colour and manifest metadata are unchanged.

## Workflow follow-up

- Archive the change after implementation and review are complete.
