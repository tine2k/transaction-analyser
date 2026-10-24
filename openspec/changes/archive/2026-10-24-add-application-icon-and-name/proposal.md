# Proposal

## Why

The application has no icon, no manifest, and one name repeated on every screen and tab. Added to a
phone's home screen it appears as a screenshot-like default with a truncated `Transaction Analyser`
label, and six open browser tabs are indistinguishable. The application already has a visual
identity — ink and paper, category inks, the spending pie chart — but none of it reaches the surface
where the application is opened.

## What Changes

- Add an application icon: a pie chart in the application's own category inks on the paper ground,
  supplied as an opaque 180×180 `apple-touch-icon` for iOS plus 192/512 manifest icons and a
  maskable variant, with an SVG source that also serves as the browser tab icon.
- Add a web app manifest naming the application for installation, declaring the paper and ink theme
  colours, and referencing the icons. It declares no standalone display, so adding the application to
  a home screen keeps the normal browser launch it has today.
- Name the application `Expenses` wherever a person reads it: the header masthead, the document
  title, the manifest name and short name, the home-screen label, and the Pushover test message.
- Give every route its own browser tab title, `Transactions · Expenses`, `Imports · Expenses`, and so
  on, with `Expenses` alone as the fallback for a route that sets none.
- Keep `Transaction Analyser` as the project name for the repository, container image, container and
  volume names, database, and `package.json`; those are the application's address, not its name.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the document's shared metadata gains the application's installable identity —
  the icon files, the manifest, and the user-facing name and home-screen label — and the browser tab
  title becomes the shown screen's name rather than one constant string.

## Impact

- `public/` — new directory: `icon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`, `site.webmanifest`.
- `nuxt.config.ts` — `app.head` carries the icon, manifest, and home-screen metadata, because the
  delivered document must carry them before the browser application runs (`ssr: false`).
- `app/layouts/default.vue` — masthead text, document title, title template.
- Six route components under `app/pages/` — one page title each.
- `shared/import-notification.ts` — the fixed Pushover test message.
- Tests — the shell's icon and manifest links, the icon asset's response, and the per-route document
  title.
- `Dockerfile` — unchanged; `public/` already reaches `.output` and the image copies it.
- Repository name, image name, container names, database name, and `package.json` — unchanged.
