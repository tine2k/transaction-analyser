# Proposal

## Why

On an iPhone home-screen launch the app currently opens inside Safari, because its manifest declares no standalone display. Safari's own top glass and status area therefore sit above the dark brand header as a fixed pale band, and the app never reaches the top edge of the screen.

## What Changes

- **BREAKING** Make the installed app launch standalone instead of in the browser: the manifest declares `display: standalone`, and the document declares the iOS standalone capability with a translucent status bar.
- Cover the phone viewport into its safe areas with `viewport-fit=cover`, so the installed app can paint through the status bar and home-indicator regions.
- Paint the shared brand bar's gradient through the top safe area while keeping the wordmark, navigation, and disclosure control clear of the status bar and notch.
- Inset the shared page frame horizontally for a landscape notch and at the bottom for the home indicator.
- Keep the fixed transaction action bars' controls above the home indicator, with their surface extending through the bottom safe area.
- Set the document and manifest theme colour to the brand bar's start colour `#101b5d`, while the manifest background stays on the paper ground `#e9e7f5` for the launch splash.
- Keep the page ground, routes, API, database, and normal browser-tab use unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the installed shortcut now launches standalone with a translucent status bar instead of in the browser; the document and manifest theme colour move from paper to the brand bar's start colour; and the brand bar, shared frame, and fixed action bars respect the phone's safe areas.

## Impact

- `nuxt.config.ts`: viewport, theme colour, iOS standalone and status-bar metadata, and the stale comment about the browser launch.
- `public/site.webmanifest`: `display`, `theme_color`, and the unchanged `background_color`.
- `app/layouts/default.vue`: safe-area classes on the brand bar's inner content and the main frame.
- `app/assets/css/main.css`: top-safe-area padding on the brand bar, horizontal and bottom frame insets, bottom-bar padding, and the testable inset custom properties.
- `app/pages/index.vue`: the Transactions page's fixed bottom clearance gains the bottom inset.
- `app/components/BulkAssignmentBar.vue` and `app/components/PatternShortcutBar.vue`: bottom-safe-area padding on the fixed bar surfaces.
- `tests/integration/api.test.ts`: the delivered document metadata and the manifest's launch and colour values.
- New browser coverage for simulated top, side, and bottom safe-area insets.
- `openspec/specs/frontend-shell/spec.md`: the install identity, page-ground, and safe-area requirements after the delta is applied.
- Existing installed shortcuts may need to be removed and added again before the new launch mode applies.
