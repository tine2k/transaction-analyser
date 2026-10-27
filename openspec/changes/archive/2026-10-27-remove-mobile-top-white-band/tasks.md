# Tasks

## 1. Install metadata

- [x] 1.1 In `nuxt.config.ts`, set the keyed `app.head.viewport` to `width=device-width, initial-scale=1, viewport-fit=cover`; add the `mobile-web-app-capable`, `apple-mobile-web-app-capable`, and `apple-mobile-web-app-status-bar-style` (`black-translucent`) metadata; change `theme-color` to `#101B5D`; and replace the comment that says the manifest keeps the browser launch. Verify `pnpm run build` succeeds.
- [x] 1.2 In `public/site.webmanifest`, add `"display": "standalone"`, change `"theme_color"` to `#101B5D`, and keep `"background_color"` at `#E9E7F5`. Verify the file parses as JSON and carries those three values.
- [x] 1.3 Update the home-screen note in `README.md` so it says an existing shortcut must be removed and added again to pick up the standalone launch as well as a changed icon. Verify the paragraph reads coherently with the existing icon-caching sentence.
- [x] 1.4 Extend `tests/integration/api.test.ts`: assert the delivered document has exactly one viewport tag with `viewport-fit=cover`, the dark theme colour, both capability tags, and the translucent status-bar tag; assert the manifest declares `display: standalone`, `theme_color` `#101B5D`, and `background_color` `#E9E7F5`. Verify with `pnpm run test:integration`.

## 2. Safe-area layout

- [x] 2.1 In `app/assets/css/main.css`, add top safe-area padding to `.brand-bar`, horizontal `max()` padding for the shared frame, bottom `max()` padding for `main`, `calc(12px + inset)` bottom padding for the fixed bars, and one-bar/two-bar page clearance classes that add the inset to the existing 7rem/14rem values. Express each inset as `var(--safe-area-<edge>, env(safe-area-inset-<edge>, 0px))` and comment that the custom properties exist only so headless tests can simulate a device. Verify the stylesheet builds without warnings.
- [x] 2.2 In `app/layouts/default.vue`, apply the horizontal frame class to the header's inner content and to `main`, and the bottom frame class to `main`; update the layout comment to name the installed full-screen and safe-area behaviour. Verify `pnpm run test:components` still passes.
- [x] 2.3 In `app/components/BulkAssignmentBar.vue` and `app/components/PatternShortcutBar.vue`, apply the fixed-bar safe-area class to each bar's outer surface. Verify the existing bar and mobile transaction component tests pass with `pnpm run test:components`.
- [x] 2.4 In `app/pages/index.vue`, replace the `pb-28` / `pb-56` bindings on the Transactions page root with the one-bar and two-bar clearance classes from 2.1. Verify the page's bottom clearance still grows with the number of visible bars and includes the simulated bottom inset.
- [x] 2.5 Add `tests/browser/mobile-safe-areas.spec.ts`: at 390×844, simulate `--safe-area-top: 47px`, `--safe-area-left: 47px`, `--safe-area-right: 47px`, and `--safe-area-bottom: 34px`; assert the header starts at viewport top with the brand gradient, the wordmark clears the top inset, the header and main content clear the side inset, the Transactions page root's clearance includes the bottom inset, the visible bulk bar's surface reaches the viewport bottom, its controls clear the bottom inset, and the page has no horizontal overflow. Verify with `pnpm run build && pnpm run test:browser`.
- [x] 2.6 Run the existing `tests/browser/redesign-transactions-screen.spec.ts`, `tests/browser/mobile-transaction-cards.spec.ts`, and `tests/browser/responsive.spec.ts` with zero insets and confirm the 14px/12px header, 16px/40px frame, and 32px/64px bottom padding assertions still pass. Verify with `pnpm run build && pnpm run test:browser`.

## 3. Integration checks

- [x] 3.1 Run `pnpm test` and confirm the unit, component, and integration suites pass together.
- [x] 3.2 Run `pnpm run build && pnpm run test:browser` and confirm the whole headless Chromium suite passes, including the new safe-area checks and the unchanged zero-inset frame metrics.

## Workflow follow-up

- After the updated app is deployed, remove and add the iPhone home-screen shortcut again, then confirm the standalone launch has no Safari chrome, the brand header reaches the top edge, header controls sit below the status bar, and the fixed bars sit above the home indicator.
- Archive the change after review and that device check.
