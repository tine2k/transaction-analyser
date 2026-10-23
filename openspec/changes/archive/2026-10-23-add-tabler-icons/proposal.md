# Proposal

## Why

Navigation and action controls are text-only, so the six-item menu and the import and category action groups must be read word by word to be scanned. A maintained stroke icon set gives each control a consistent visual anchor without hand-drawing SVGs one at a time, and the single hand-written SVG already in the transactions table shows the gap the project keeps working around.

## What Changes

- Add `@tabler/icons-vue` as the application's only icon source, imported as tree-shaken Vue components and bundled into the application's own assets at build time.
- Put a decorative icon beside the label of each navigation link; the current screen's icon and label share the ink color.
- Put a decorative icon beside the label of each action control: sync, re-categorise, send test notification, add/remove pattern, add/remove date window, add/save, cancel, edit, delete, apply, clear selection, and the mobile menu disclosure.
- Replace the one hand-written inline SVG — the manual-assignment map pin in the transactions table — with its Tabler equivalent.
- **BREAKING (policy):** amend the `frontend-shell` styling requirement, which currently forbids an icon set, so that exactly one locally bundled, tree-shaken icon package is permitted, used beside visible text.
- Explicitly out of scope: icon fonts, CDN or runtime icon services, a second icon family, icon-only navigation, and replacing the typographic sort arrows.

## Capabilities

### New Capabilities

None. Icons are part of the existing shell and do not introduce a capability of their own.

### Modified Capabilities

- `frontend-shell`: the requirement "Styling arrives through one stylesheet, with no component library" changes from banning any icon set to permitting one bundled stroke icon package, with limits on how icons are used and how they are delivered.

## Impact

- `package.json`: one new dependency, `@tabler/icons-vue`.
- `app/layouts/default.vue`: navigation icons and the mobile disclosure control.
- `app/pages/index.vue`: the manual-assignment marker.
- `app/pages/imports.vue`, `app/pages/categories.vue`, `app/components/BulkAssignmentBar.vue`, `app/components/PatternShortcutBar.vue`: action icons.
- `app/components/AppIcon.vue`: a small display wrapper that applies the shared size, stroke, and decorative defaults.
- Tests: visible labels and `data-testid` values are unchanged, so existing component and browser assertions continue to hold.
- No server, API, database, or data-model changes.
