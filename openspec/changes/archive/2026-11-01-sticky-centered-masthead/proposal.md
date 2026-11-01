# Proposal

## Why

The masthead scrolls away with the page, so on long screens — the transactions ledger, the category tables, the yearly matrix — the only way back to another destination is to scroll to the top. On a phone the brand group also sits off-centre behind the menu control, which reads as an accident rather than a deliberate masthead. Pinning the bar keeps navigation available while reading, and centring the identity gives the narrow layout a clear focal point.

## What Changes

- The shared masthead becomes sticky at the top of the viewport at every supported width, so the identity and the five destinations remain reachable while the page scrolls beneath it.
- The sticky bar keeps the brand gradient and the phone's top safe-area padding, so it still paints through an installed app's status-bar area.
- On narrow viewports the logo mark and `Expenses` wordmark are centred against the full masthead width, while the menu disclosure control stays at the leading (left) edge.
- The disclosure control is optically excluded from the centring: its presence does not shift the brand group off the viewport's centre line.
- The bar sits above page content and the transactions screen's fixed bottom bars, without covering the focused control or clipping the expanded navigation panel.
- The wide-viewport masthead keeps its current leading-aligned identity and directly visible five links.
- **BREAKING** (planning): this change supersedes the unstarted `move-mobile-menu-button-right` change. The burger remains on the left; the trailing-edge placement in that change is abandoned.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: new requirements add a persistent (sticky) masthead at every width and a narrow-viewport masthead whose brand group is centred against the full width while the disclosure control remains the leading item.

## Impact

- `app/layouts/default.vue`: masthead positioning and the narrow-viewport row layout.
- `app/assets/css/main.css`: sticky positioning, stacking order, and any helper needed for safe-area-aware offsets.
- `tests/components/layout.test.ts`: markup and class assertions for the masthead row.
- `tests/browser/responsive.spec.ts`: phone geometry checks for the burger at the leading edge and the brand group centred, plus wide-viewport checks.
- `openspec/changes/move-mobile-menu-button-right`: left unmodified here; it conflicts and should be discarded rather than implemented.
- No API, data, or dependency changes.
