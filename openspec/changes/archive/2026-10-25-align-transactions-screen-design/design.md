# Design

## Context

The design source is `design/Finance Tracker Design.html`. Its `Transactions – Desktop` frame is 1360px wide and its `Transactions – Mobile` frame is 390px wide. Both are self-contained HTML pages with inline styles and an embedded Plus Jakarta Sans font. The current implementation was built from the earlier PDF mock and uses the shared theme in `app/assets/css/main.css`, the frame in `app/layouts/default.vue`, and the screen in `app/pages/index.vue`.

Current relevant values:

- Sans/display face: IBM Plex Sans Variable (100–700); mono face: IBM Plex Mono.
- Tokens: `--radius-sheet: 14px`, `--radius-pill: 9999px`; no sheet shadow token.
- Transaction sheets: `rounded-sheet` (14px), no shadow.
- Page title: `text-2xl` (24px) / `sm:text-3xl` (30px), weight 700.
- Controls: `min-h-11` (44px), `rounded-sheet` (14px), `px-3` (12px).
- Table cells: `px-4 py-3` (16px × 12px); header text 11px/600/0.08em; booking dates 400; amounts 500.
- Category pill: a 44px-high select with 12px/600 text and `py-1.5 pl-3 pr-8`.
- Masthead: 20px/600 wordmark; 14px/500 navigation pills.
- Main frame: full width, `px-4 py-6` / `sm:px-8 sm:py-10`.

The existing `responsive-frontend` requirement keeps semantic tables and horizontal scrolling on phones, and `transaction-table` requires no paging controls. The mobile mock's card list and its Previous/Next controls therefore cannot be adopted without changing those contracts. The new shadow also needs the explicit exception already described in the `frontend-shell` delta.

## Goals / Non-Goals

**Goals:**

- Match the mock's type family, type scale, weights, tracking, control sizes, sheet dimensions, cell metrics, and desktop sheet shadow on the Transactions screen.
- Match the shared masthead and main frame that the Transactions screen renders inside.
- Keep every existing filter, search, sort, assignment, selection, batching, and accessibility behaviour unchanged.
- Keep the change verifiable through computed-style browser checks at desktop and mobile widths.

**Non-Goals:**

- Matching the mock's colours: paper, ink, muted text, rules, brand hues, and income-green amounts stay as they are.
- Matching the mock's five-column table, removal of the person/counterparty/account columns, or removal of the selection column.
- Replacing the table with mobile cards, adding Previous/Next pagination, or replacing progressive batches with a Load more button.
- Redesigning the fixed action bars, which the mock does not show.
- Changing the body type scale of the other six screens beyond inheriting the new family, masthead, and main frame.

## Gap Register

| Area | Mock | Current | Resolution |
| --- | --- | --- | --- |
| Interface/display family | Plus Jakarta Sans 400–800 | IBM Plex Sans Variable 100–700 | Replace globally with self-hosted Plus Jakarta Sans; keep IBM Plex Mono for machine strings. |
| Base transaction text | 14px | 16px unless a utility overrides it | Set the Transactions wrapper to 14px; explicit values override it. |
| Wordmark | 20px / 800 / −0.02em desktop | 20px / 600 / tighter tracking | 20px, 800, −0.02em at desktop; normal tracking on mobile. |
| Desktop navigation | 14px / 600, 10px × 16px padding, about 40px high, 6px gap | 14px / 500, 44px minimum, 8px × 16px padding, 4px gap | 14px / 600, 40px high, 10px × 16px padding, 6px gap. |
| Mobile navigation | 15px / 600, 48px high, 12px corners | 14px / 500, 44px high, pill corners | 15px / 600, 48px high, 12px corners. |
| Menu-bar padding | 14px vertical desktop; 14px top / 12px bottom mobile; 40px sides desktop | 16px vertical desktop; 12px top/bottom mobile; 32px sides desktop | Adopt the mock's padding and a 1280px inner maximum width. |
| Main frame | max 1280px; 32px / 40px / 64px desktop; 20px / 16px / 32px mobile | full width; 24px / 32px / 40px desktop; 24px / 16px / 24px mobile | Adopt the bounded frame and padding. |
| Page title | 34px / 800 / −0.02em desktop; 28px / 800 mobile | 30px / 700 desktop; 24px / 700 mobile | Adopt 34px and 28px at 800. |
| Summary line | 15px desktop; 14px mobile | 14px at every width | 14px mobile, 15px desktop. |
| Section gap | 24px desktop; 14px mobile | 24px at every width | 14px mobile, 24px desktop. |
| Filter-sheet radius | 20px desktop; 18px mobile | 14px everywhere | Add panel radius tokens for the Transactions sheets. |
| Filter-sheet padding | 20px × 24px desktop; 14px mobile | 16px / 24px desktop; 16px mobile | Adopt the mock's padding. |
| Filter labels | 12px / 700 | 12px / 600 | 700 weight. |
| Search field | 44px desktop / 48px mobile; 14px / 15px text; 16px / 14px horizontal padding; 12px corners | 44px; 14px text; 12px padding; 14px corners | Adopt height, text, padding, and 12px corners. |
| Filter selects | 44px desktop / 48px mobile; 14px text; 14px / 12px horizontal padding; 12px corners | 44px; 14px text; 12px padding; 14px corners | Adopt height, padding, and 12px corners. |
| Primary actions | 44px desktop / 48px mobile; 14px / 700; 22px / 18px horizontal padding; 12px corners | 44px; 14px / 600; 16px padding; 14px corners | Adopt height, weight, padding, and 12px corners. |
| Table-sheet radius | 20px desktop; 18px mobile | 14px everywhere | Same panel tokens as the filter sheet. |
| Table-sheet padding | 8px top / 24px sides / 16px bottom desktop | 0 | Adopt on desktop; keep the mobile scroll region edge-to-edge. |
| Sheet elevation | `0 1px 3px rgba(40,30,120,.08)` desktop; flat mobile | No shadow | Add `--shadow-sheet`; apply at `sm` and above only. |
| Table header type | 12px / 700 / uppercase / 0.06em | 11px / 600 / uppercase / 0.08em | Adopt 12px, 700, 0.06em. |
| Table header cells | 16px × 8px padding, about 49px row | 12px × 16px plus a 44px button, about 68px row | Use 8px horizontal padding and 2px vertical padding around the 44px sort target, keeping the row about 48px. |
| Body cells | 13px × 8px padding | 12px × 16px, plus 44px controls, about 68px row | Use 13px × 8px; move the 44px hit areas into zero-padded control cells so rows stay near 46px. |
| Booking date | 600 weight | 400 weight | 600 weight. |
| Amount | 700 weight | 500 weight | 700 weight; keep the ink colour. |
| Category pill | 12px / 700; 5px × 12px; visible pill about 27px | 12px / 600; 44px visible select | Compact visible select inside a 44px label that remains the touch target. |
| Empty state | 14px, centred, 40px vertical padding | 16px, left-aligned, no vertical padding | Adopt the mock's size, centring, and padding. |
| Value-date colour | Muted | Ink | Not adopted: colour is outside this change. |
| Income amount colour | Green | Ink | Not adopted: it conflicts with the amounts-never-coloured requirement. |
| Palette values | `#F5F4FB`, `#1B1840`, `#524E7D`, `#ECEAF8`, `#BDB8E0`, `#2F3FC2` | Slightly different token values | Not adopted: colour is outside this change. |
| Table structure | 5 columns, no selection | 9 columns including selection | Not adopted: existing requirements own the columns. |
| Mobile row layout | Cards with Load more | Scrollable semantic table with progressive batches | Not adopted: the responsive and batching contracts keep the table. |
| Pagination | Previous/Next footer | No paging controls | Not adopted: `transaction-table` forbids paging. |
| Fixed action bars | Not shown | 44px controls with a stronger upward shadow | Keep as-is; only the global radius tokens change if they choose to use them. |

## Decisions

### D1: Replace the interface family globally

Use `@fontsource-variable/plus-jakarta-sans` and declare self-hosted latin and latin-ext faces for weights 200–800, mirroring the existing IBM Plex declarations. Point `--font-sans` and `--font-display` at it, then remove the IBM Plex Sans package and `@font-face` blocks. Keep IBM Plex Mono.

Rationale: the mock's type is part of the design system, not a per-screen accent; a second interface family would contradict the one-theme requirement. Alternative: scope Plus Jakarta to the Transactions route, rejected because it would create two interface families. Alternative: keep IBM Plex, rejected because its 700 maximum cannot produce the mock's 800-weight titles.

### D2: Add panel, control, and shadow tokens without repurposing `--radius-sheet`

Add:

- `--radius-panel: 20px`
- `--radius-panel-mobile: 18px`
- `--radius-control: 12px`
- `--shadow-sheet: 0 1px 3px rgba(40, 30, 120, 0.08)`

Keep `--radius-sheet: 14px` for the other screens and the fixed bars. The Transactions sheets use `rounded-panel-mobile sm:rounded-panel`; its controls use `rounded-control`; the sheets use `shadow-none sm:shadow-sheet`.

Rationale: turning `--radius-sheet` into 20px would silently change every other screen's cards and controls. Alternatives: change the shared token and accept app-wide churn, or hard-code all radius values, rejected because it breaks the token contract.

### D3: Keep body-level sizing local to the Transactions screen

Set the screen root to `text-sm`, giving the page a 14px base. Apply the 28/34px title, 14/15px summary, 12px labels, 12px headers, and other explicit values in `app/pages/index.vue`. The shared masthead and main frame in `app/layouts/default.vue` do change globally, because every route renders them; the other six screens keep their existing title sizes and body scales, but their page titles take the display role's 800 weight like every other page title.

Rationale: the request targets the Transactions screen, but the masthead and frame cannot be aligned without affecting the routes that share them. Alternative: add a screen-specific layout, rejected as unnecessary machinery.

### D4: Apply the sheet shadow only from the desktop breakpoint

Use `shadow-none sm:shadow-sheet`. The mobile mock's filter sheet is flat, so a global shadow would not match it.

Rationale: the desktop and mobile mocks differ on elevation. Alternatives: shadow at every width, rejected against the mobile mock; shadow only on hover, rejected because the mock shows resting elevation.

### D5: Reconcile the mock's dense rows with the existing touch-target rule

The mock's table header is about 49px and its rows about 46px, but the existing controls require 44px hit areas. Reconcile without shrinking targets:

- Header: keep the sort button at `min-h-11`, use `px-2 py-0.5` on `th`, and keep the 0.06em header type. The row lands near 48px.
- Body: use `px-2 py-[13px]` on ordinary cells. Use `py-0` on the selection and category cells, whose 44px labels provide the row's hit area. The row lands near 46px.
- Pill: style the select itself at 5px/12px padding and 12px/700 text; wrap it in a `min-h-11` label so the visible pill is compact while the touch target remains 44px.
- Selection: use `min-h-11` labels in zero-padded cells rather than adding 12px cell padding around a 44px checkbox.

Rationale: the mock does not show sorting controls, a selection column, or the native category select, so its exact cell metrics cannot coexist with the existing accessibility contract without this adaptation. Alternative: drop the 44px targets, rejected because `responsive-frontend` requires them.

### D6: Retain the responsive table, not the mobile cards

The desktop sheet keeps the existing semantic table inside its own horizontal scroll region. At mobile widths the table remains edge-to-edge and scrollable; the mock's card article layout and Load more button are not introduced.

Rationale: `responsive-frontend` explicitly preserves table structure and horizontal scrolling, and `transaction-table` forbids paging. Adopting cards would be a behavioural change outside typography, size, and shadow scope.

### D7: Verify with computed styles rather than screenshots

Extend the existing Playwright transaction-screen spec with `getComputedStyle` assertions for the font family, title and summary sizes, label/header weights and tracking, control heights and radii, sheet radii, padding, and shadows at desktop and mobile widths. Use `data-testid` attributes on the two sheets instead of the `.rounded-sheet` selector, which no longer describes them.

Rationale: computed values are stable and directly express the spec. Screenshot baselines would add pixel churn without proving the named values. Alternative: snapshot testing, rejected because the project has no visual-regression baseline.

## Risks / Trade-offs

- **Global typography changes every route** → Review all seven routes with the existing responsive suite; keep other screens' title and body scales untouched so only the family, masthead, and frame shift.
- **The shared main frame changes every route** → The existing responsive tests already check page-level overflow; rerun them at 320, 768, 1280, and 1720. If another screen needs a wider canvas, add a screen-level exception rather than removing the bound.
- **Plus Jakarta Sans font files may differ from the assumed Fontsource names** → After `pnpm install`, inspect the installed package's `files/` directory and update the two `@font-face` URLs; confirm the app makes no external font request.
- **800 weight can look heavier than expected at small sizes** → Restrict 800 to the masthead and page titles, and keep interface copy at 400–700.
- **Two radius tokens could drift** → Document `--radius-sheet` as the legacy 14px role, `--radius-panel`/`--radius-panel-mobile` as the Transactions sheet role, and `--radius-control` as the Transactions control role; do not use `rounded-sheet` on the Transaction sheets or controls.
- **Dense rows could hide controls** → Keep the 44px hit areas in zero-padded cells and verify with the existing short-control test at 390px.
- **The shadow may be invisible on the white sheet** → Use the mock's exact rgba value and verify it is present in `getComputedStyle`; do not strengthen it beyond the design.
- **Removing IBM Plex Sans may leave stale imports** → Search for the family name and the package after removal; keep `pnpm-workspace.yaml`'s darwin and linux arm64 native packages intact after install.

## Migration Plan

1. Add the Plus Jakarta dependency and update the font faces and theme tokens.
2. Update the shared layout, then the Transactions screen markup and classes.
3. Add `data-testid` hooks for the two sheets and update the browser assertions to the new computed values.
4. Run unit, component, and browser suites; inspect the Transactions screen headlessly at 1360×1700 and 390×1500 against the two mock frames, plus the existing 320/768/1280/1720 overflow checks.
5. Rollback is a single revert: no data, API, or configuration migration is involved.
