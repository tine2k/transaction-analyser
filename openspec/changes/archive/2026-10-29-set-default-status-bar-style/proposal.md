# Proposal

## Why

The installed iOS app declares `apple-mobile-web-app-status-bar-style` as `black-translucent`, which lets the page extend under the status bar and relies on the dark brand gradient behind it for legibility. The requested behaviour is the platform's standard status bar instead, so the status area is rendered by iOS rather than by the page.

This reverses a deliberate part of `remove-mobile-top-white-band`: with `default`, iOS draws its own status-bar band above the brand bar again. That consequence is accepted for this change; the install identity, theme colour, and safe-area layout stay otherwise unchanged.

## What Changes

- Set the delivered document's `apple-mobile-web-app-status-bar-style` metadata to `default` in `nuxt.config.ts`.
- Update the `frontend-shell` installable-identity requirement so it requires the default Apple status bar rather than a translucent one.
- Update the integration assertion for the delivered document metadata, and the surrounding comments that explain why the value is set.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the installable identity declares the default Apple status bar instead of a translucent one.

## Impact

- `nuxt.config.ts`: the status-bar metadata value and its comment.
- `tests/integration/api.test.ts`: the delivered-document status-bar assertion.
- `openspec/specs/frontend-shell/spec.md`: the installable-identity requirement and its scenario after the delta is applied.
- No change to the manifest, theme colour, viewport metadata, safe-area CSS, layout, routes, API, or data.
