# Proposal

## Why

The application still carries its first identity everywhere: a three-wedge pie-chart favicon and a masthead that is only the word `Expenses`. A new four-wedge logo has been designed in `design/Logo.dc.html`, and the interface should present the same mark in the menu bar as in the browser tab and installed shortcut.

## What Changes

- Replace the application's icon artwork with the four-wedge mark from the design: a full-bleed brand-gradient tile carrying four bright wedges separated by transparent seams.
- Regenerate every committed icon from the new source: `public/icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png`, keeping the current sizes, opacity, and safe-zone behaviour.
- Show the mark in the shared menu bar immediately left of the `Expenses` wordmark at every width, including the narrow layout where the wordmark shares a row with the menu toggle. The mark is decorative; it adds no link and no second accessible name.
- Update the icon documentation and the existing layout and integration coverage so they assert the new mark rather than the old pie chart.
- No route, navigation label, document title, manifest name, colour token, or API changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the installable identity now uses the four-wedge mark on the brand gradient instead of the pie-chart artwork, and the menu bar presents that mark beside the application name.

## Impact

- `public/icon.svg` and the four generated PNGs beside it.
- `tools/render-app-icon.mjs` — the rasteriser's treatment of the icon's field and maskable safe zone.
- `app/layouts/default.vue` and a new or changed logo component under `app/components/`.
- `tests/components/layout.test.ts`, `tests/integration/api.test.ts`, and any browser assertion that inspects the masthead.
- `README.md` — the paragraph describing where the icon geometry lives.
- `openspec/specs/frontend-shell/spec.md` after archive; archived change records stay untouched.
