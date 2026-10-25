# Proposal

## Why

The design folder now carries an HTML mock for the Transactions screen, and it has moved beyond the version the current UI was built from. The screen still uses IBM Plex Sans, 14 px sheets, 14 px control corners, and no resting card elevation, while the mock specifies Plus Jakarta Sans, a larger type scale, 20 px desktop sheets, 12 px controls, tighter table cell padding, and a subtle sheet shadow. The result is a screen that is recognisably the same layout but visibly different in type, density, and depth.

## What Changes

- Replace the application's interface and display face with self-hosted Plus Jakarta Sans (400–800), and remove IBM Plex Sans. IBM Plex Mono stays for machine strings. This is a **BREAKING** visual change for every route, because the type family is a global theme token.
- Align the shared masthead and menu bar with the mock: 20 px / 800 wordmark, 14 px / 600 navigation pills on desktop, 15 px / 600 in the mobile menu, and the mock's menu-bar padding.
- Align the Transactions title and summary: 34 px / 800 / −0.02em title on desktop, 28 px / 800 on mobile, and a 15 px desktop / 14 px mobile summary line.
- Align the filter and table sheets: 20 px desktop radius, 18 px mobile radius, the mock's inner padding, and the desktop sheet shadow `0 1px 3px rgba(40, 30, 120, 0.08)`. Mobile sheets stay flat, as the mobile mock shows.
- Align controls: 12 px corners, 44 px desktop height, 48 px mobile height, and the mock's horizontal padding for search, selects, and buttons.
- Align the transaction table: 12 px / 700 uppercase headers at 0.06em tracking, 16 px × 8 px header cells, 13 px × 8 px body cells, 600-weight booking dates, 700-weight amounts, and 12 px / 700 category pills with 5 px × 12 px padding.
- Align the shared main frame: a 1280 px maximum width with 32 px / 40 px / 64 px padding on desktop and 20 px / 16 px / 32 px on mobile, with the mock's section gap.
- Amend the `frontend-shell` elevation rule so a subtle resting shadow is allowed on the Transactions sheets, while other panels remain flat and floating bars keep their stronger shadow.

The change deliberately does not adopt the mock's colour palette differences, income-green amounts, five-column table, mobile card rows in place of the table, or Previous/Next pagination. Those are outside the requested typography, size, and shadow scope and, for the table structure, conflict with existing requirements.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the interface and display typeface becomes Plus Jakarta Sans; the masthead, navigation, and main frame adopt the mock's type and size values; and the sheet-elevation rule permits the mock's subtle resting shadow on the Transactions sheets.
- `transaction-table`: the Transactions title, summary, filter labels and controls, table headers, rows, category pills, amounts, and empty state adopt the mock's type scale, weights, spacing, control heights, corner radii, and desktop sheet shadow.

## Impact

- **Frontend**: `app/assets/css/main.css`, `app/layouts/default.vue`, and `app/pages/index.vue` carry the change. The shared header and main frame change on all routes; body-level size and shadow changes are limited to the Transactions screen. The fixed action bars keep their current dimensions and stronger elevation because the mock does not show them.
- **Dependencies**: add `@fontsource-variable/plus-jakarta-sans`; remove `@fontsource-variable/ibm-plex-sans`; keep `@fontsource/ibm-plex-mono`. Both installs must retain the darwin and linux arm64 native packages required by the shared `node_modules`.
- **Tests**: browser assertions for the Transactions screen currently pin the 14 px sheet radius and the no-shadow styling, so they must be revised. New computed-style checks should cover the type family, title and table sizes, control heights and radii, sheet padding, and desktop/mobile shadow behaviour. Component tests that depend on `rounded-sheet` on the screen's sheets and controls need updated selectors or classes.
- **No API, database, schema, or configuration changes.**
