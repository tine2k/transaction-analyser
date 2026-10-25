# Design

## Context

See `proposal.md` for motivation. The relevant current state:

- `public/icon.svg` is a three-wedge pie chart on a `#f6f6f3` paper field, hand-drawn at 180×180. Its comment declares it the only place the geometry lives.
- `tools/render-app-icon.mjs` screenshots that SVG in Chromium and applies a `disc` scale before writing `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, and the maskable 512 at 72%.
- `app/layouts/default.vue` draws the masthead as a single `<p>Expenses</p>`; no logo component exists.
- `nuxt.config.ts` links `/icon.svg`, the 192 PNG, the touch icon, and the manifest; `public/site.webmanifest` lists the three PNGs. Names, sizes, theme colours, and display mode are unchanged by this change.
- `design/Logo.dc.html` is the new artwork's source of truth. It shows the mark at a 32-unit viewBox with four wedges and four radial seam cuts, and shows a gradient tile for the icon.

## Goals / Non-Goals

**Goals:**

- One visible logo mark, identical in the menu bar and in the favicon / installed icon.
- A full-bleed brand-gradient app icon that reproduces the design's gradient tile.
- Keep the existing icon file names, sizes, opacity requirement, maskable entry, manifest shape, and document links.
- Keep the masthead's accessible name exactly `Expenses`.

**Non-Goals:**

- No theme-colour, paper colour, brand-bar token, route, title, manifest name, or API change.
- No new image dependency or build step: PNGs stay committed and the render script stays optional.
- No edit to archived OpenSpec records that describe the old pie-chart icon.

## Decisions

### D1 — Copy the mark geometry verbatim from the design

The mark is a 32×32 viewBox containing:

- four wedge paths on a 14-unit radius centre, filled `#FF8A3D` (orange), `#9B7BFF` (violet), `#2DD4BF` (teal), and `#FF5FA8` (pink);
- a mask that cuts four 1.8-unit seams from the centre to beyond the artwork's edge, so the seams show whatever is behind the mark (gradient bar, gradient tile, or page) rather than painting a colour;
- the pink wedge's existing `translate(-0.74 -1.42)` offset, reproduced exactly. It is part of the designed pinwheel silhouette, not a mistake to normalise.

Only the bright colour set is needed: both presentation surfaces — the brand bar and the gradient icon tile — are dark. The design's darker violet/teal/pink set for a white surface is not introduced, because no screen puts the mark on white.

The mask and gradient IDs must be prefixed (`logo-…`) rather than the mock's `pm`, so an inline component and an inline SVG asset cannot collide if both ever appear in one document.

**Alternative considered:** normalise the offset and seams for a symmetrical mark. Rejected: the mock is the approved artwork, and "replace with the new logo" means matching what is in `design/Logo.dc.html`.

### D2 — `AppLogo.vue` is the canonical on-screen geometry; `icon.svg` mirrors it

`app/components/AppLogo.vue` renders the mark inline with `aria-hidden="true"`, `focusable="false"`, no `<title>`, and a `size` prop defaulting to 30px. It replaces no existing component; it sits beside `AppIcon.vue` and follows the same "decorative, named by its surroundings" rule.

`public/icon.svg` cannot import a Vue component, so its mark is a copy. To keep the copy honest, a unit test reads both files and asserts that the four wedge `d` values, their fills, and the pink wedge's transform are identical. This replaces the README's old claim that `icon.svg` is the only place the geometry lives.

**Alternatives considered:**

- Render `AppLogo.vue` to an SVG at build time — needs a server/browser at build and breaks the favour of a plain committed asset.
- Have the nav use `<img src="/icon.svg">` — that is the gradient tile, not the mark the design's bar shows.
- Keep `icon.svg` canonical and use `?raw` in the component — Vite string injection of SVG into the DOM is more machinery than one small component and makes sizing/ARIA harder to test.

### D3 — The icon is a full-bleed gradient tile with the mark at 62.5%

`public/icon.svg` becomes a 180×180 square with no rounded corners and no paper field:

- background layer 1: linear gradient `105deg`, `#0F1B5C` 0%, `#1E2A9E` 40%, `#2F3FC2` 70%, `#1D6FA8` 100%;
- background layer 2: upper-right sheen `rgba(34,150,200,.55)` fading by 65%;
- background layer 3: lower teal sheen `rgba(18,140,150,.4)` fading by 70%;
- the mark centred at 62.5% of the field, matching the mock's 60px mark in a 96px tile.

The two radial sheens are translated to SVG gradients as closely as the format allows; exact stop colours and opacities are copied, while the elliptical radii may be approximated with a `gradientTransform`. SVG chosen over an HTML/CSS wrapper so the asset is self-contained for favicons, manifests, and the rasteriser.

The field is square and full bleed, not rounded. iOS and Android apply their own mask; the design's 24px corner radius is presentation chrome, and baking it in would either make the corners transparent (forbidden for the touch icon) or paper-coloured (a visible frame).

**Alternative considered:** keep the paper field and put the new mark on it. Rejected by the user in favour of the gradient tile shown in the design.

### D4 — No per-target scale in the rasteriser; the maskable copy reuses the same composition

The mark's visible diameter is about 29 units in a 32-unit viewBox, so at 62.5% scale it occupies roughly 57% of the square. Android's maskable safe zone is a centred circle 80% wide; the mark is comfortably inside it. Therefore `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png` all render the same self-contained SVG at their own pixel size.

`tools/render-app-icon.mjs` loses the `paper` constant, the `disc` values, and the `transform: scale(...)`, and simply screenshots `public/icon.svg` at each target size. The three-layer gradient is opaque edge to edge, so the touch icon keeps colour type 2. The maskable file stays in the manifest because its purpose differs, not because its pixels do.

**Alternative considered:** keep shrinking the maskable artwork. Rejected: the old 88%-disc artwork needed it, the new mark starts far inside the safe zone, and a second composition would add a scale path that nothing else needs.

### D5 — Masthead layout

The wordmark group becomes logo plus text:

```
<div class="flex items-center gap-2.5">
  <AppLogo :size="30" />
  <p class="font-display text-xl font-extrabold …">Expenses</p>
</div>
```

The group replaces the bare `<p>` inside the existing mobile row, so the toggle stays at the far right on narrow viewports and the navigation still wraps below it on desktop. `AppLogo` is `shrink-0` so the 30px mark survives a tight row.

Sizing follows the mock's ratio of 1.5× the wordmark (20px type → 30px mark); the 10px gap scales the mock's 16px gap at 40–56px type down to the masthead's 20px. The mark uses the bright palette because the bar is the dark gradient in both breakpoints.

**Alternative considered:** put the mark inside a rounded gradient badge in the bar. Rejected: the bar is already the gradient, and the mock's bar lockup shows a bare mark.

### D6 — Verification

- Component test: mark precedes the wordmark, is 30px, has `aria-hidden="true"`, contributes no link or accessible name, and contains the four wedge fills.
- Unit test: `AppLogo.vue` and `public/icon.svg` carry the same four wedge paths and fills.
- Integration test: `/icon.svg` answers as SVG containing the four fills and a gradient; existing 180×180 opaque PNG and manifest checks stay as they are.
- Browser check: masthead shows the mark beside `Expenses` at desktop and phone widths with no overflow; favicon and PNGs inspected at 16, 32, and 180px.
- Existing browser and component suites run unchanged except for a selector that assumed the wordmark was the header's only visual element.

## Risks / Trade-offs

- **Thin seams blur at favicon sizes** → Seams are 5.6% of the field (≈0.9px at 16px) and reveal the tab background, so they remain a deliberate cut; verify at 16px before committing.
- **Geometry duplicated in `AppLogo.vue` and `icon.svg`** → A unit test compares the wedge data, so silent drift fails tests even though the files remain separate.
- **SVG radial sheen approximates the CSS ellipse** → The base linear gradient and both sheen centres/colours are exact; the elliptical falloff is the only approximated part. It is background texture, not identity geometry.
- **Existing installed shortcuts keep the old icon** → Unfixable from the application; the README already documents that a shortcut must be removed and re-added.
- **Maskable crop** → The mark starts well inside the 80% safe circle; verify with a circular mask preview rather than adding a second scale path.

## Migration Plan

1. Replace the artwork and regenerate the four PNGs with `node tools/render-app-icon.mjs`.
2. Commit the SVG and regenerated PNGs together so the served icon set never mixes old and new artwork.
3. Roll back by reverting the commit; no data or API migration is involved.
