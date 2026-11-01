# Proposal

## Why

Installed web apps on iOS 27 no longer read `theme-color` or `apple-mobile-web-app-status-bar-style` when painting the status bar. Instead the system samples the background colour of a fixed element near the top edge and, when it finds none, draws a progressive blur over the top of the page. The application has no such element: its masthead is an in-flow gradient, so an installed shortcut on iOS 27 washes out the top of the brand bar behind a blurred status area.

The community fix, independently reproduced by the Reddit and Modern Web Weekly write-ups, is a `position: fixed` element at the very top edge, at least 6px high and at least 80% wide, carrying a solid `background-color`. iOS samples that colour and paints a solid status bar with no blur.

## What Changes

- Add a fixed, full-width cap at the viewport's top edge in the shared layout, painted with the brand bar's start colour (`#101b5d`) and exactly as tall as the top safe-area inset.
- Leave the cap with zero height when no top inset is present, so a browser tab and desktop rendering are unchanged.
- Keep the masthead's existing top safe-area padding, gradient, and content placement: the cap overlays the inset the gradient paints, so the header's content stays below it.
- Keep `apple-mobile-web-app-status-bar-style` at `default` and the theme colour at `#101b5d`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: adds a requirement that a fixed cap at the viewport's top edge supplies the status bar's colour and draws nothing without a top safe-area inset; the existing installed-app and theme-colour requirements are unchanged.

## Impact

- `app/layouts/default.vue`: the cap element at the start of the layout root.
- `app/assets/css/main.css`: the cap's fixed placement, inset-driven height, and brand start colour.
- `tests/components/layout.test.ts`: the cap's presence, aria-hidden state, and position in the layout.
- `tests/browser/mobile-safe-areas.spec.ts`: cap metrics with a simulated top inset and its absence without one.
- No API, data, dependency, manifest, or metadata changes.
