# Design

## Context

The application is a Nuxt 4 / Vue 3 client with one layout (`app/layouts/default.vue`), one Tailwind 4 stylesheet carrying the theme tokens (`app/assets/css/main.css`), and one icon package. The Transactions screen (`app/pages/index.vue`) already implements every behaviour the new mock touches: person, category, and period filters; submitted search; sortable headers; progressive batch loading; row selection and bulk assignment; per-row category assignment; and the text-selection pattern shortcut.

The new mock (`design/Transactions – Desktop.pdf`) is a 1720-wide desktop frame. It shows a dark gradient top bar, a `Transactions` title with a summary line, a white rounded filter sheet, and a white rounded table sheet with uppercase headers, pastel category pills, and the amount as the last column.

Constraints that shape this design:

- The existing palette/type/surface requirements are in `openspec/specs/frontend-shell/spec.md`; the table's behaviour is in `openspec/specs/transaction-table/spec.md`.
- One stylesheet, no component library, one icon family, fonts served from the application's own origin.
- All seven routes remain; no route is added or removed.
- Every screen must still work from 320 CSS pixels up (`responsive-frontend`).
- The mock's pagination, extra destinations, reduced columns, and income/spending subtotal are not adopted.

See `proposal.md` for motivation and the two spec deltas for the changed contracts.

## Goals / Non-Goals

**Goals:**

- Adopt the mock's visual language on the shared top bar and the Transactions screen while keeping every existing control and behaviour.
- Express the new palette, radius, and type roles as theme tokens so no screen uses per-screen colours.
- Keep the Transactions screen's table, filters, action bars, and progressive loading accessible and responsive.
- Replace the existing visual tests' assumptions with checks for the new presentation.

**Non-Goals:**

- No pagination, Year/Month split, income/spending totals, `Accounts`/`Settings` routes, or reduced column set.
- No new font family, icon family, component library, or chart change.
- No layout redesign of the other six screens beyond the theme values they inherit.
- No API, database, schema, or configuration change.

## Decisions

### D1. Theme tokens carry the new visual system

Replace the token values in `app/assets/css/main.css` with the mock's palette, adding explicit brand and gradient roles:

| Token | Value | Role |
| --- | --- | --- |
| `--color-paper` | `#f5f4fa` | Page ground |
| `--color-surface` | `#ffffff` | Filter/table sheets, fields |
| `--color-ink` | `#201e3e` | Titles, values, primary text |
| `--color-muted` | `#5f5c78` | Labels, secondary text |
| `--color-rule` | `#e6e4ef` | Row and sheet rules |
| `--color-rule-strong` | `#d5d2e3` | Input and sheet borders |
| `--color-failure` | `#a63a2e` | Failures and destructive actions (unchanged) |
| `--color-brand` | `#2e3fc1` | Primary actions, selection controls |
| `--color-brand-strong` | `#1b2a8a` | Primary hover |
| `--color-brand-soft` | `#e9e8ff` | Current-link tint and soft highlights |
| `--color-brand-bar-from` | `#101b5d` | Top-bar gradient start |
| `--color-brand-bar-via` | `#2531ab` | Top-bar gradient middle |
| `--color-brand-bar-to` | `#1f76b1` | Top-bar gradient end |
| `--radius-sheet` | `14px` | Sheets, fields, action buttons |
| `--radius-pill` | `9999px` | Navigation and category pills |

The mock's title and interface text are sans-serif. Keep the `font-display` utility and token name that every page already uses, but point it at IBM Plex Sans Variable with a heavy weight, so page templates need no change. Remove the Source Serif 4 `@font-face` blocks and the `@fontsource-variable/source-serif-4` dependency. Keep IBM Plex Mono for machine strings.

Alternative considered: keep the serif titles and only reskin the Transactions screen. Rejected because the mock has no serif role, and a mixed type system would make the top bar and page titles fight.

### D2. The shared top bar becomes a brand bar with text pills

`app/layouts/default.vue` keeps one `<header>` and the same seven `screens` entries. The header uses a fixed diagonal gradient (`linear-gradient(100deg, from, via, to)`) with the brand name in white and a `<nav>` of rounded pills.

- Active pill: white ground, `--color-brand-bar-from` text, `aria-current="page"` (shape and ground make it distinguishable without hue alone).
- Other pills: translucent white ground and white text; hover raises the translucency.
- Links become text-only; the decorative route icons are removed from the bar. `AppIcon` stays for the mobile toggle and other screens.
- At `md` the pills sit beside the brand; below `md` the existing disclosure button shows the same pills stacked in the same bar. `md` keeps all seven destinations directly visible at the tablet width the responsive suite treats as wide. The existing `data-testid="mobile-navigation-toggle"`, `aria-controls`, `aria-expanded`, and `aria-label` contract is preserved.
- Focus rings use a white ring on the gradient and a brand ring inside white pills.

Alternative considered: keep the current light header and restyle only the page. Rejected because the mock makes the bar the strongest identity element, and the proposal's scope includes it.

### D3. The Transactions page is a header, a filter sheet, and a table sheet

`app/pages/index.vue` keeps its script behaviour and its state/test ids. The template is restructured:

1. `<h1>Transactions</h1>` in the display role.
2. The summary line (`data-testid="visible-total"`) directly beneath the title and above the filters. It renders the existing `visible-count` span, a `·` separator, and the existing sum text (`Sum of displayed transactions: …`) on one line. Count is ink, sum is muted, both at `text-sm`; the line wraps on narrow screens. The test ids stay so existing interaction tests keep their hooks.
3. The filter sheet: the existing search form (search field, Search button, conditional Clear) plus Person, Period, and Category selects. Labels stay visible. On desktop the search form takes the wide first track and the three selects follow; on phones everything stacks. The Search button becomes the brand primary action; Clear and the selects stay neutral.
4. The table sheet with the existing scroll region, sortable header buttons, selection column, rows, and batch sentinel.

The mock's Year/Month pair is not adopted. The existing single grouped Period filter already expresses both a year and a month, carries the `year`/`month` query values, and is covered by the defaulting and person-scoping requirements. Splitting it would be a separate behavioural change with new invalid-combination states.

The mock's income/spending subtitle is not adopted: `frontend-shell` allows only the existing visible count and visible sum, and the read endpoint does not return an income or spending aggregate.

### D4. Table presentation keeps every column and reorders them for scanning

The column order becomes: selection, booking date, value date, purpose, counterparty name, counterparty account, person, category, amount. The mock's five visible columns appear in the same relative order, with the required extra columns inserted before category; the amount closes the row and stays right-aligned and tabular.

Dates render in the mock's day-month-year form (`28 Oct 2026`) through a fixed `Intl.DateTimeFormat` with UTC, while `<time datetime>` keeps the raw `YYYY-MM-DD` value. The requirement only fixes the calendar day, not the rendered pattern.

Headers are uppercase and letter-spaced through classes, not content changes, so their accessible names and `data-testid="sort-*"` hooks stay intact.

### D5. Category cells are palette-coloured pill selects

The category cell keeps the native `<select>` that performs manual assignment. It is styled as a pill: `appearance-none`, pill radius, a computed pastel ground/border/text derived from the category's existing palette colour, and a decorative chevron. The category colour comes from `createCategoryColorMap` using the same `category:<id>` / `uncategorised` keys as the analytics views, over the categories represented in the current scope, so a category keeps a stable colour while the Transactions screen is used.

- Categorised pill: `background: color-mix(in srgb, <category> 16%, white)`, border at 32% mix, text at 72% mix with ink for contrast.
- Uncategorised pill: neutral surface, rule border, ink text.
- Manual-assignment pin and update marker remain outside the pill, in muted ink.
- The options list stays native, so keyboard, screen-reader, and touch behaviour are unchanged.
- Hidden categories keep the existing `(hidden)` suffix.

Alternative considered: render a static coloured pill and hide the select behind it. Rejected because it complicates focus order and obscures the real assignment control.

### D6. Brand colour is narrow; category and amount colour rules stay

The brand role is limited to the top bar, active navigation pill, primary actions (Search, Apply), and selection controls. Table content, secondary buttons, filters, and empty states stay ink/muted/rule. Amounts remain ink with their sign and never take a category or brand colour. Category colour appears only in the category pill and its existing chart/list indicators.

The existing `CATEGORY_COLOR_PALETTE` is unchanged. Pill backgrounds are deliberately lightened mixes rather than raw palette colours so the labels keep readable contrast; the colour dot/ground still identifies the category.

### D7. Responsive behaviour is preserved, not redesigned

- Top bar: brand plus disclosure at narrow widths; horizontal pills at `md` and above; the nav wraps rather than forcing page overflow.
- Filter sheet: one column on phones, search form first, then Person, Period, Category; all controls keep 44px minimum hit areas.
- Summary line: wraps between count and sum; count stays first.
- Table: keeps its own horizontal scroll region with the existing accessible name; the page itself never scrolls horizontally. The category pill keeps the 44px minimum height on phones.
- The fixed bulk and shortcut bars keep their bottom stack and elevation.

### D8. Tests follow the new contract

- `tests/components/layout.test.ts`: brand text, seven labels, no per-link icons, active pill distinction through `aria-current` and class, mobile disclosure preserved.
- `tests/browser/transaction-summary-emphasis.spec.ts`: summary position beneath the title, count-before-sum order, equal `text-sm` sizes, ink/muted colours, zero state.
- `tests/components/transactions.test.ts`: new column positions, date pattern, pill markup/style hooks, preserved behaviour.
- `tests/browser/transaction-pattern-shortcut.spec.ts`: cell indices for purpose and counterparty after the reorder.
- New `tests/browser/redesign-transactions-screen.spec.ts`: top-bar gradient and active pill, sheet radii, pill presentation, amount-last order, no pagination controls, no page overflow at phone and desktop widths, 44px phone targets.
- Run the existing responsive and sorting suites unchanged where possible; update only assertions tied to the old visual order/colours.
- Verify in headless Chromium (the project's Playwright setup), with a temporary screenshot compared against the mock's structure rather than committed pixel diffs.

## Risks / Trade-offs

- **Theme tokens change every screen** → The six other screens inherit colours, radius, and sans titles. Verify all seven routes with the existing responsive suite and a visual pass; keep their layout untouched.
- **Brand hue conflicts with the old "no accent controls" rule** → The `frontend-shell` delta narrows the rule to content/secondary controls and names the brand roles. Review the final screen for any accidental brand use.
- **Contrast on the gradient and pastel pills** → Use white text only on the dark gradient, keep the active pill white with dark text, and derive pill text from a dark mix; check with Chromium's computed styles and a contrast calculation in review.
- **Native select styled as a pill** → `appearance-none` plus a decorative chevron must not hide the focus ring or the native option list. Keep the select visible, focusable, and at least 44px high on phones.
- **Column reorder breaks position-based tests** → Update the known `td:nth-child` and amount-index assertions in the same change; sort tests use `data-testid`, so they should not move.
- **Removing Source Serif** → Grep for the family and token, remove the package and `@font-face` blocks, and confirm the build ships only IBM Plex Sans/Mono.
- **Summary test depends on the old block layout** → The summary test is rewritten to the single-line contract; keep the `visible-total` and `visible-count` test ids so unrelated tests keep working.

## Migration Plan

No stored data or API changes. Deploy the rebuilt client; the new tokens and templates ship together. Roll back by reverting the commit; no database or configuration rollback is needed.

## Open Questions

None.
