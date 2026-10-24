# Design

## Context

See `proposal.md` — Why. The state that shapes the approach:

- Nuxt 4 with `ssr: false`: Nitro serves an application shell, then the client builds the page.
  `useHead` in `app/layouts/default.vue` only runs once the client application boots; `app.head` in
  `nuxt.config.ts` is rendered into the shell HTML before that.
- No `public/` directory exists, so the application currently answers every icon request with the
  SPA fallback. Nothing pins the document title, favicon, manifest, or the name in any test.
- The theme is one stylesheet with Tailwind 4 `@theme` tokens: paper `#F6F6F3`, ink `#20242B`,
  surface `#FFFFFF`, rule `#DAD9D2`, rule-strong `#C4C4BB`. Category inks live in
  `app/utils/category-spending.ts` as `CATEGORY_COLOR_PALETTE`; the first three are `#2F5FA8`,
  `#D97A2B`, `#3E8E5A`, each already checked for 3:1 against white.
- The layout already holds the navigation list (`screens`: `to`, `label`, `icon`) for the six routes,
  which is the natural single source for both the menu and the tab title.
- `Dockerfile` copies `.output` only; `public/` reaches `.output/public` through `nuxt build`, and
  `.dockerignore` does not exclude it. No image change is needed.
- No SVG rasteriser (ImageMagick, rsvg, Inkscape, sharp) is installed. Playwright's Chromium is
  installed in `node_modules` (`PLAYWRIGHT_BROWSERS_PATH=0`), per `AGENTS.md`.

## Goals / Non-Goals

**Goals:**

- One artwork source that produces every committed icon asset, reproducibly, without adding a runtime
  or build dependency.
- Metadata that reaches the delivered shell, not only the booted application.
- A tab title that cannot drift from the navigation labels.
- The user-facing name and the project name each stated once, in places that suit them.

**Non-Goals:**

- Dark, clear, or tinted icon variants (a web app supplies one bitmap; the system derives the rest).
- Service worker, offline support, install prompt, splash screens.
- Full-screen launch (`apple-mobile-web-app-capable` / `display: standalone`).
- Renaming the repository, image, containers, database, or package.
- Any change to the pie chart, its data, or its screen.

## Decisions

### D1: The mark — an 88% pie on the paper ground

```
  field 180x180, paper #F6F6F3
  disc  diameter 158px (88%), centred, no outline
  seams 3.5% of diameter, paper, so tinting keeps the geometry
  wedges, clockwise from 12 o'clock:
    #2F5FA8  54%   dominant, cool
    #D97A2B  28%   warmest and most chromatic
    #3E8E5A  18%   closes the triad
```

Uneven proportions starting at 12 o'clock are what make it read as a chart rather than a colour
wheel; 3:4:2-ish sizes also avoid the equal-thirds "peace sign" read. Three wedges, because a fourth
seam mushes at 40px and the palette's adjacency rule forbids the only sensible fourth hue next to
the blue. The disc is inset to 88% so the circular silhouette survives the iOS mask, which cuts only
the corners of the field. A small paper disc (r = 3.6) caps where the three seams meet, so
no wedge tip pokes into the hub.

Alternatives considered: ink ground — `#2F5FA8` falls to roughly 2.5:1 against ink and would have to
be lightened, breaking the tie to the chart palette; full bleed — loses the circle into the mask;
a chroma-boosted palette — the icon would stop being the analytics screen's chart.

### D2: Assets and why each exists

| File | Size | Consumer |
| --- | --- | --- |
| `public/icon.svg` | vector | browser tab icon, artwork source |
| `public/apple-touch-icon.png` | 180×180, opaque | iOS home screen |
| `public/icon-192.png` | 192×192 | manifest, Android and desktop |
| `public/icon-512.png` | 512×512 | manifest, install surfaces |
| `public/icon-maskable-512.png` | 512×512, disc at 72% | Android adaptive mask |
| `public/site.webmanifest` | — | Android and desktop install metadata |

The maskable variant is separate because Android's mask may crop to a circle of 80% of the width;
the 88% disc would lose its arc. Same artwork, smaller disc, same paper field. iOS never reads the
manifest for the home-screen icon — it reads `apple-touch-icon` — so the manifest exists for Android
and desktop, and is harmless on iOS.

### D3: Rendering — SVG source, Chromium rasterised once, PNGs committed

`public/icon.svg` is the source of truth. `tools/render-app-icon.mjs` screenshots it with Playwright's
Chromium at each size and writes the PNGs; the results are committed and the script is not part of
`nuxt build` or the image. This keeps the build deterministic and the image free of a browser, and
regeneration is one command instead of a manual export.

Alternatives considered: adding `sharp` — a native dependency and binary for a one-off render;
ImageMagick/rsvg/Inkscape — not installed and not a project dependency; rasterising at build time —
ties every build to a browser and makes the artwork's output vary by environment.

The touch icon is composited on the paper ground, not transparent: iOS renders transparency as
black on some surfaces and the icon is required to be opaque anyway.

### D4: Metadata belongs in `app.head`, not `useHead`

`nuxt.config.ts` carries the links and metas, so they are present in the shell before the client
application runs:

```ts
app: {
  head: {
    link: [
      { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
    meta: [
      { name: 'apple-mobile-web-app-title', content: 'Expenses' },
      { name: 'theme-color', content: '#F6F6F3' },
    ],
  },
}
```

`useHead` in the layout stays responsible for the human-visible metadata it already owns (`lang`,
title, description). The icon link could arguably live there, but with `ssr: false` it would appear
only after the application booted, and iOS reads the icon from the page it is asked to add.

The manifest omits `display`, which the specification defines as `browser`: an added shortcut opens
in Safari with its normal chrome. `theme_color` and `background_color` are the paper ground so the
Android task switcher and splash do not flash a colour the application never uses.

### D5: The tab title derives from the navigation list

`app/layouts/default.vue` already owns `screens` and `route`. It derives the title from them:

```ts
const screenLabel = computed(() => screens.find(({ to }) => to === route.path)?.label);
useHead({
  title: computed(() =>
    screenLabel.value === undefined ? 'Expenses' : `${screenLabel.value} · Expenses`),
});
```

This makes the menu label the tab label by construction — adding a route to `screens` names its tab —
and the fallback covers both the unknown path and any future route added without a label.

Alternatives considered: a `titleTemplate` plus per-page titles — unhead applies the template to every
title including the fallback, so the layout's `Expenses` becomes `Expenses · Expenses`, and a
functional template risks an untitled failure page; explicit full titles on six pages — works, but
duplicates the separator and lets the menu and the tab drift.

`app/error.vue` additionally pins `title: 'Expenses'`, because on a missing path the layout may still
observe the last matched route; pinning removes the ambiguity. It is one line and keeps the failure
page's title within the spec.

### D6: Two names, two jobs

`Expenses` is what a person reads: masthead, document title, manifest `name`/`short_name`,
`apple-mobile-web-app-title`, and the fixed Pushover test message in
`shared/import-notification.ts`. `Transaction Analyser` stays where it is an address rather than a
name: repository, `ghcr.io/tine2k/transaction-analyser`, container and volume names, the
`transaction_analyser` database, and `package.json`. No Dockerfile, Compose, or workflow change.

### D7: Tests that pin the observable parts

- Integration (built server): `/apple-touch-icon.png` answers an image; its IHDR is read directly for
  180×180 and colour type 2 (RGB, no alpha); `/site.webmanifest` parses and names the application with
  resolving icon entries; the delivered shell carries the icon link, the manifest link, and the
  `apple-mobile-web-app-title` meta.
- Browser (Playwright): each route's document title equals the expected string, navigating between two
  screens updates it without a reload, and the failure page shows `Expenses`.
- No image library is added: the PNG header is 26 bytes and parsing it is arithmetic on a Buffer.

## Risks / Trade-offs

- **iOS caches the touch icon aggressively** → re-adding the home-screen shortcut is the only reliable
  refresh; note it in the README or the change summary rather than pretending a redeploy updates it.
- **A near-white field separates poorly from a light wallpaper** → the disc covers ~77% of the tile,
  so the icon is dominated by pigment; if it still reads pale, deepen the paper to `#E9E6DD` without
  touching the wedges.
- **Chromium antialiasing differs from a design tool** → the PNGs are committed, so every environment
  serves the same bytes; verify by eye at 180, 80, and 40px before committing.
- **Added-at-source mismatch between drawing and code** → the SVG is the only place the geometry is
  edited; the script derives every PNG from it, and the task list regenerates all sizes together.
- **A new route added without a `screens` entry** → the title silently falls back to `Expenses`; the
  browser test covers the six routes, and D5's derivation means adding a nav entry names the tab too.

## Migration Plan

No data or API change. Deploy as usual; existing sentences and behaviour are unchanged apart from
copy and metadata. A home-screen shortcut added before this change keeps its old appearance until it
is removed and added again.
