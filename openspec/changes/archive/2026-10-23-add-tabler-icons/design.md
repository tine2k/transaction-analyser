# Design

## Context

See `proposal.md` for motivation. The state that shapes the approach:

- Nuxt 4 with `ssr: false`, Vue 3, Tailwind 4 through the Vite plugin. One stylesheet carries the theme tokens (`paper`, `surface`, `ink`, `muted`, `rule`, `rule-strong`, `failure`) and the three self-hosted typefaces.
- No component library, no icon package, no headless kit. One hand-written inline SVG exists: the map pin marking a manually assigned category (`app/pages/index.vue:973`), drawn filled with `currentColor` at 14px.
- Sort direction in the transactions table uses the typographic glyphs `↑` and `↓` inside a `th`. An in-flight row is marked with a 2px muted dot. Neither is an icon.
- Binding constraints: the `frontend-shell` icon permission this change amends, the same-origin rule (no request leaves the application), the ledger identity of the restyle (stroke, ink and muted only, no accent color), `responsive-frontend` (320px usability, 44px hit areas for standalone controls), and tests that pin `data-testid`, labels, and table structure.

## Goals / Non-Goals

**Goals:**

- One maintained stroke icon source for navigation and action controls, bundled with the application.
- Icons that read as an extension of the ledger type: thin stroke, ink or muted, no fill, no accent color.
- Keep every visible label and `data-testid` exactly as it is, so behavior and existing assertions do not move.
- Replace the hand-drawn pin rather than run two icon vocabularies side by side.

**Non-Goals:**

- Icon-only navigation, icon-only destructive controls, or removing labels.
- Changing the mobile menu's reachability, hit area, or disclosure behavior.
- Turning the sort glyphs into icons, adding chart or table-iconography, or animating icons.
- A second icon family, an icon font, or a runtime icon service.

## Decisions

### D1: Package — `@tabler/icons-vue` 3.x

Tabler has the widest coverage of the open stroke sets (~6,100 icons, 24px grid, MIT), an official Vue package, and every glyph this change needs. Alternatives considered: Lucide (~1,600, same shape, smaller dependency surface — the runner-up), Heroicons (~300, too thin for the action vocabulary), Phosphor (weight variants are redundant when the app uses one stroke weight), Font Awesome (paid breadth, mixed styles, wrong fit).

### D2: Delivery — named imports, tree-shaken, never fetched

Icons are imported as individual components (`import { IconRefresh } from '@tabler/icons-vue'`) and bundled by Vite. The alternative — `@nuxt/icon` with an Iconify collection — adds a module and config and risks a runtime request to the Iconify API, which the same-origin requirement forbids. A CDN, an icon font, or unpkg `<use>` references are excluded for the same reason. Only the icons actually imported reach the client bundle.

### D3: Display defaults live in one small wrapper

A new `app/components/AppIcon.vue` accepts the icon component as a prop and applies the shared defaults: 16px size, 1.5 stroke width, `shrink-0`, `aria-hidden="true"`. It carries no artwork and no icon list of its own. Alternatives considered: repeating three props at each of ~16 call sites (noisy, easy to drift), and a Nuxt plugin providing global icon config (more machinery than the problem needs). The wrapper is the least code that keeps every icon identical.

### D4: Icon map

Navigation, 16px beside the label:

| Screen | Tabler icon |
| --- | --- |
| Transactions | `IconList` |
| Categories | `IconTags` |
| Analytics | `IconChartPie` |
| Monthly totals | `IconCalendarStats` |
| Monthly average | `IconChartHistogram` |
| Imports | `IconDownload` |

Actions, 16px before the label:

| Control | Tabler icon | File |
| --- | --- | --- |
| Sync now | `IconRefresh` | `imports.vue` |
| Re-categorise all | `IconSparkles` | `imports.vue` |
| Send test notification | `IconSend` | `imports.vue` |
| Add expression / Add window / Add category | `IconPlus` | `categories.vue` |
| Remove pattern / Remove window / Clear selection / Cancel | `IconX` | `categories.vue`, `BulkAssignmentBar.vue` |
| Edit | `IconPencil` | `categories.vue` |
| Delete | `IconTrash` | `categories.vue` |
| Save changes / Apply | `IconCheck` | `categories.vue`, `BulkAssignmentBar.vue` |
| Mobile menu / close | `IconMenu2` / `IconX` | `default.vue` |
| Manual-assignment marker | `IconMapPin` (14px) | `index.vue` |

Reusing one glyph across same-meaning controls (`IconX` for every dismissal, `IconPlus` for every addition) is deliberate: the vocabulary stays small and consistent.

### D5: Size, stroke, color

16px for navigation and action controls, 14px for the inline row marker that replaces the pin. Stroke 1.5 matches the weight of IBM Plex Sans at interface sizes; Tabler's default 2 would read heavier than the labels. Color is always `currentColor`, so a nav icon is muted on an inactive link and ink on the current one without any icon-specific class. No new theme tokens.

### D6: Layout and labels

Nav links become `inline-flex items-center gap-2`; action buttons add `gap-2` to their existing inline-flex. Labels are untouched, including the "Sync now" → "Syncing…" swap, so component tests that assert `button.text()` still pass — Tabler SVGs contain only paths and add no text nodes. The mobile disclosure keeps its 44px `size-11` box and its existing `aria-label`; with a visible label gone, that label is now what names it, and the `sr-only` alternative is not needed because the attribute already exists.

### D7: No animation

The sync and re-categorise buttons already communicate progress by changing their label and disabling. A spinning icon would add motion without adding information, and would need `prefers-reduced-motion` handling. Icons stay static.

### D8: The sort glyphs stay typographic

`↑` and `↓` sit in a compact table header and scale with its type. Substituting 16px SVG arrows would change the header's metrics and add two more imports for no gain.

## Risks / Trade-offs

- **Large package barrel (~6,000 exported components)** → editor autocomplete and dev-server cold start get heavier; runtime cost is unaffected because only imported icons are bundled. Measure dev startup after adding it; if it regresses noticeably, import from the package's per-icon module paths.
- **A new dependency contradicts the current spec until the delta lands** → the `frontend-shell` delta is part of this change, not a follow-up; `openspec validate` must pass before apply.
- **Icons could crowd the 6-item nav on narrow viewports** → each item grows by ~24px; the nav already wraps at `sm`, and the mobile menu is a vertical list. Verify at 320px and 640px in headless Chromium.
- **Icon semantics are weak for Monthly totals vs Monthly average** → the glyphs differ (calendar vs histogram) but the words carry the distinction; labels remain mandatory.
- **Destructive controls could become icon-only later and lose clarity** → the spec delta requires an accessible name and the visible label for actions; keep "Delete" and "Remove" as words.
- **Licence** → Tabler is MIT; no attribution is required, and no notice file is added.

## Migration Plan

Single deploy. If reverted, remove the dependency, the wrapper, and the icon elements; the spec delta is reverted with the change. No data, API, or configuration migration exists.

## Open Questions

None.
