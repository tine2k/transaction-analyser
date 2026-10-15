# Design

## Context

See `proposal.md` for motivation. The current state that shapes the approach:

- Six routes plus the failure page, all rendered by the browser inside one layout, styled by one stylesheet (`app/assets/css/main.css`, ten lines, no theme). Every surface is default Tailwind slate.
- The only color in content is `CATEGORY_COLOR_PALETTE` (Tableau 10) in `app/utils/category-spending.ts`, used by the analytics charts and totals indicators.
- Visual drift between screens: zebra striping on some tables but not others, three radii in use, one solid button among outline buttons, a tracked all-caps eyebrow in the header.
- Binding constraints: `frontend-shell` (one stylesheet, no component library, icon set, or headless kit), `responsive-frontend` (usable from 320px, 44px touch targets, table scroll regions), `euro-value-display` (raw amounts exactly as returned; derived values locale EUR), `transaction-table` (fixed columns, sum and count), `category-spending-chart` (color consistency across charts, visible slice labels). Tests pin semantics — `data-testid`, labels, table structure — not styling; the palette unit test compares against the exported constant.
- Exploration decisions confirmed by the user: the euro-ink + ledger blend; amounts are never color-coded by sign; dark mode is deferred.

## Goals / Non-Goals

**Goals:**

- Deliver the theme as Tailwind 4 `@theme` design tokens in the one stylesheet, so every template value resolves to a token.
- Self-host the three typefaces from the application's own origin.
- Restyle all six routes and the failure page; fix the stale failure-page copy and the imports action-row layout.
- Keep every existing spec requirement and all test suites green.
- Verify visually with headless Chromium screenshots per `AGENTS.md`, transactions screen first.

**Non-Goals:**

- Dark mode, navigation regrouping, any route, data, or behavior change, any new component library or icon set, any change to amount formatting or chart data logic.

## Decisions

### D1: Theme mechanism — Tailwind 4 `@theme` in the one stylesheet

Tokens are declared in a `@theme` block in `main.css`; templates then use generated utilities (`bg-paper`, `text-ink`, `border-rule`, `font-display`, ...). Alternatives considered: plain CSS variables used through arbitrary values (`bg-[var(--paper)]`) — noisier templates and no single name for a role; a second stylesheet for tokens — forbidden by `frontend-shell`.

### D2: Palette

| Token | Value | Role |
| --- | --- | --- |
| `paper` | `#F6F6F3` | page ground |
| `surface` | `#FFFFFF` | sheets, inputs, header |
| `ink` | `#20242B` | primary text |
| `muted` | `#5A6068` | secondary text |
| `rule` | `#DAD9D2` | hairlines, row rules |
| `rule-strong` | `#C4C4BB` | table header rules, sheet borders |
| `failure` | `#A63A2E` | failures and destructive actions only |

Category inks replace Tableau 10 in `CATEGORY_COLOR_PALETTE`, in this order (chosen so red/green and blue/purple are never adjacent in a chart): `#2F5FA8`, `#D97A2B`, `#3E8E5A`, `#7D5BA6`, `#B08A1E`, `#2E8C8C`, `#C2453C`, `#5C6672`, `#C25E7E`, `#8A6B4F`. The hues are derived from the euro banknote series — muted printed-ink character that sits on paper without shouting. Each color is checked for at least 3:1 contrast against white for indicator dots and slices; a hue is darkened slightly if it fails, without changing the intent. Alternative considered: keeping Tableau 10 — the generic default this change exists to replace.

### D3: Type

- **Source Serif 4** (600): application masthead and page titles — the book voice.
- **IBM Plex Sans** (400/500/600): interface, tables, controls; tabular figures (`tabular-nums`) wherever amounts or counts align.
- **IBM Plex Mono** (400/500): machine strings only — category patterns, counterparty accounts, import timestamps.

Self-hosted through `@fontsource` packages imported in `main.css`, following the existing node_modules CSS import pattern (`vue-echarts/style.css`); latin subsets and only the listed weights, so the added assets stay small. Alternatives rejected: Libre Franklin (ledger heritage but weaker numeral voice), the `@nuxt/fonts` module (an extra dependency and configuration for no benefit here).

### D4: Amounts

Every amount renders in `ink` with tabular figures. No sign, magnitude, or category is encoded as color; `failure` never touches an amount. Raw transaction amounts stay exactly as returned; derived totals keep `formatEuroAmount`. This satisfies both the new spec delta and `euro-value-display` unchanged.

### D5: Surfaces

The page ground is `paper`. Content sits on `surface` sheets with a 1px `rule-strong` border and a 4px radius — data tables included, which today sit directly on the page ground. Inside sheets, structure is carried by rules: a strong header rule and `rule`-colored row hairlines. Zebra striping is removed everywhere (it exists on three of five tables today) so tables read the same on every screen. No shadows anywhere except the two fixed action bars, which float and may elevate. Alternative considered: fully borderless sheets — white on `paper` is too subtle a difference to define a panel without a rule.

### D6: Header and navigation

The tracked all-caps eyebrow is replaced by a serif masthead, sentence case, on the `surface` ground above a `rule-strong` rule. Navigation links stay in sans; the current link is marked with a 2px ink rule under its label (`aria-current="page"` retained). The mobile disclosure control keeps its text label ("Menu"/"Close" — no icon set) with the ink outline treatment.

### D7: Controls

Inputs, selects, and buttons: `surface` ground, `rule` border, 4px radius, `ink` text; hover moves text from `muted` to `ink` or adds an underline; focus keeps the existing 2px offset ink outline; disabled uses reduced opacity. The one solid-ink button is the primary action of a screen (form submit, bulk Apply, Sync now); everything else is outline. This replaces the current mix where only the category form's submit is solid.

### D8: Charts

Pie structure, ordering, labels, and behavior stay exactly as specified. Slice and indicator colors come from the category palette; ECharts text (labels, tooltip) is set to the theme's ink/muted values where the option allows.

### D9: Copy and layout fixes

- `app/error.vue`: replace the stale "The application has one page so far, and this is not it." with copy that names the actual situation and offers the way back.
- `app/pages/imports.vue`: the action row currently interleaves three buttons with three status paragraphs; regroup so each control keeps its status beside it (or one shared status line), without changing labels or behavior.

### D10: Rollout order

Tokens and fonts → shell → transactions screen (representative; screenshot-verified and iterated first) → categories → analytics → monthly totals → monthly average → imports → failure page → full suites. One change, one review; the transactions-first pass is where the token values are confirmed against real content.

## Risks / Trade-offs

- [Font assets add weight and a flash of unstyled text] → latin subsets, only the needed weights, `font-display: swap` (fontsource default); verify no layout shift in the browser pass.
- [A muted ink hue (ochre, rose, grey) may fail 3:1 contrast as a small dot or slice] → contrast-check each value during implementation; darken the failing hue slightly within the same intent.
- [Palette order still puts some similar hues near each other in a pie] → every slice keeps its visible label (already spec'd), so color is never the only cue.
- [Removing zebra striping may hurt row tracking in the wide monthly totals matrix] → check that screen's screenshot in the pass; strengthen row hairlines if needed. No spec change either way.
- [Serif page titles could overflow at 320px] → h1 at 24px on narrow viewports, 28–32px on wider ones; the responsive browser suite guards page-level overflow.
- [The spec says amounts are never colored, and the row-updating marker is currently a gray dot] → gray is a neutral, not an accent; keep new colors out of it.
- [Tests could pin something visual] → they do not: tests assert test ids, labels, structure, and widths; the palette unit test compares against the constant. Run all suites; treat any failure as a genuine regression.

## Migration Plan

No data, API, or route migration. The change ships in the application image; rollback is reverting the commit, since no persisted state changes. Implementation follows the D10 order so the representative screen proves the token system before it is applied everywhere.

## Open Questions

None blocking. The exact per-screen serif sizes and the final contrast-tuned values of one or two category hues are settled during the transactions-first verification pass without changing the specs or the task breakdown.
