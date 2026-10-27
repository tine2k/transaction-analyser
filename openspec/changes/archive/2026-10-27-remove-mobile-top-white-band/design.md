# Design

## Context

See `proposal.md` for motivation and `specs/frontend-shell/spec.md` for the required behaviour.

The application is a Nuxt app with `ssr: false`. Its install metadata lives in `nuxt.config.ts` and `public/site.webmanifest`; the shared frame is one layout, `app/layouts/default.vue`, and the only stylesheet is `app/assets/css/main.css`. The manifest currently omits `display`, so an iPhone home-screen shortcut launches inside Safari. Safari's top glass is therefore the fixed pale band above the dark `.brand-bar`, not a page element. No CSS in this repository can remove Safari's own chrome.

The layout already owns three surfaces that need the phone's safe areas: the brand bar at the top, the `main` frame with its responsive horizontal and bottom padding, and the two fixed transaction action bars. The current frame metrics are pinned by browser tests: 14px top / 12px bottom header content padding at phone width, 16px phone and 40px desktop horizontal frame padding, and 32px / 64px bottom frame padding.

## Goals / Non-Goals

**Goals:**

- Launch the installed app without Safari's browser chrome so the dark brand header is the topmost app surface.
- Paint the brand gradient through the top safe area and keep the header's controls below the status bar and notch.
- Keep the page frame and fixed bars clear of the side and bottom safe areas without changing their zero-inset metrics.
- Keep the normal browser-tab and desktop experience unchanged.

**Non-Goals:**

- Removing Safari chrome from a normal browser tab; that surface belongs to the browser.
- Redesigning the header, navigation, action bars, icons, or page ground.
- Adding orientation locking, a service worker, offline support, or a new route.
- Building a separate native shell.

## Decisions

### D1: Make the installed app standalone on both platforms

Set `"display": "standalone"` in the manifest, and add the iOS `apple-mobile-web-app-capable` and `mobile-web-app-capable` meta tags. iOS reads its own legacy meta tags for the home-screen launch, while Android and other Chromium browsers read the manifest. Declaring both keeps one install path working across the supported phones.

Alternative considered: keep the browser launch and change only `theme-color`. Rejected because Safari's top glass is browser chrome; on the reported iPhone home-screen case it would remain above the header.

### D2: Use a translucent iOS status bar and cover the whole viewport

Add `apple-mobile-web-app-status-bar-style` with `black-translucent`, and set the Nuxt `app.head.viewport` shortcut to `width=device-width, initial-scale=1, viewport-fit=cover`. `viewport-fit=cover` is what makes the safe-area inset values describe the actual device edges; without it the layout stays inset and cannot paint through the status bar.

Alternative considered: `black` or the default status bar style. Rejected because either leaves a separate status-bar band rather than continuing the brand bar to the top edge.

### D3: Keep one dark theme colour as the platform fallback

Set the document `theme-color` and the manifest `theme_color` to `#101B5D`, the brand bar's start colour. Keep the manifest `background_color` on `#E9E7F5` for the launch splash. On a platform that ignores the translucent-status-bar setting, the theme colour still makes the top surface dark; the splash still matches the paper ground.

A solid theme colour cannot reproduce the header's `100deg` gradient. The start colour is the closest match to the header's top edge and keeps the seam at the top-left as small as possible. Alternative considered: the gradient's middle colour, rejected because it matches neither edge as well.

### D4: Apply safe-area padding to the surfaces that own the edge

- `.brand-bar` takes `padding-top` from the top inset, so its gradient fills the status-bar area while the inner content starts below it.
- The header's inner content and `main` take horizontal `max()` padding, preserving the existing 16px / 40px values at zero inset and growing only for a landscape notch.
- `main` takes bottom `max()` padding, preserving 32px / 64px at zero inset.
- Each fixed action bar takes `calc(12px + bottom inset)` bottom padding, so its white surface fills the home-indicator area and its controls rest above it.
- The Transactions page root's existing 112px / 224px bottom clearance gains the same bottom inset, so the bars' added height does not reduce the scroll clearance the page already provides.

Alternative considered: one full-page safe-area wrapper. Rejected because the brand gradient must reach the screen edges while the page content stays inset, and because the fixed bars are outside the page flow.

### D5: Let tests simulate insets with custom properties

Each safe-area expression is written as `var(--safe-area-<edge>, env(safe-area-inset-<edge>, 0px))`. Production never sets the custom properties, so the platform value applies. Headless Chromium has no notched-device emulation, so browser tests set the properties on `:root` and read the resulting layout. This keeps the tests on the real CSS path rather than duplicating the values in a test-only stylesheet.

Alternative considered: DevTools Protocol safe-area overrides. Rejected as less portable across the project's Chromium versions and harder to read; UI tests already use `addStyleTag` for controlled setup.

### D6: Preserve the browser-tab frame metrics

The horizontal and bottom padding rules use `max()` with the existing values, and the header's block padding stays on its inner element. A zero inset therefore leaves every pinned metric unchanged. Existing browser tests continue to assert the 14px / 12px header content padding, the 16px / 40px frame padding, and the 32px / 64px bottom padding.

## Risks / Trade-offs

- **An installed shortcut may keep the old browser launch** → iOS and Android cache install metadata. Document that the shortcut must be removed and added again after the update; the manifest and meta tags are already correct for a new install.
- **The new standalone launch is a visible behaviour change** → This is the requested outcome. It is marked breaking in the proposal; the web app remains available at its URL in a normal tab.
- **`viewport-fit=cover` exposes the notch and home indicator to the layout** → The safe-area padding on the brand bar, frame, and fixed bars covers them. The browser test exercises a top inset, side insets, and a bottom inset.
- **The fixed bars grow by the bottom inset** → The Transactions page root adds the inset to its existing 112px / 224px clearance, so the scroll clearance is no smaller than it is today. The stacked pattern bar can already exceed that fixed clearance; this change does not redesign that dynamic clearance.
- **The status-bar icons may be hard to read** → `black-translucent` makes iOS use light status-bar content; the surface behind it is the dark brand gradient. The theme colour is also the brand's darkest end. Check contrast during verification.
- **A theme colour cannot match a gradient** → The brand start colour is the nearest solid match; the header remains the gradient and the top-left seam is the only possible mismatch.
- **Older iOS versions may ignore `display: standalone`** → They still honour the Apple capability meta; older Android browsers that ignore standalone keep the browser launch and the dark theme colour, so the pale band is still removed where `theme-color` is honoured.

## Migration Plan

1. Update the head metadata, manifest, layout classes, stylesheet, and bar components together.
2. Build and run the integration and browser suites; confirm the delivered document has one viewport tag with `viewport-fit=cover`.
3. On the iPhone, remove the existing home-screen shortcut and add it again so the new standalone launch and status-bar style are read.
4. Rollback is a revert of the metadata, layout, stylesheet, and bar changes. No data or database migration is involved.
