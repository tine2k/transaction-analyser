# Proposal

## Why

The application's paper ground is nearly white, so white content panels separate from it only by their shadow. The new design gives the page a clearly lavender ground and outlines each panel, making filters, charts, tables, and summary figures read as distinct cards.

## What Changes

- Change the paper-ground token from `#f5f4fa` to `#e9e7f5`, and align the document theme colour and the web app manifest's theme and background colours with it.
- Add a card border token `#d3cfea` and draw a 1px border on every content surface: filter panels, chart panels, table sheets, summary figures, form panels, list panels, and the phone transaction cards.
- Standardise the content-surface corner radius on the existing 20px panel radius, keeping the existing 18px phone variant where a phone-only surface already uses it.
- Keep the existing resting shadow `0 1px 3px rgba(40, 30, 120, 0.08)` and the white surface colour.
- Keep floating action bars outside the card treatment: they retain their stronger upward shadow and are not given the card border.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shell`: the paper ground takes the new value, and content surfaces gain a bordered-card treatment alongside the existing resting elevation.

## Impact

- `app/assets/css/main.css`: theme tokens and the single stylesheet.
- `app/pages/*.vue`: content-surface classes on Transactions, Categories, People, Monthly, Yearly, Monthly average, Imports, and Manage.
- `nuxt.config.ts` and `public/site.webmanifest`: the document theme colour and the manifest's theme and background colours.
- Component and browser tests that assert surface classes or computed background, border, radius, and shadow values.
