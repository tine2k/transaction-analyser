# Proposal

## Why

The application has useful transaction, category, and analytics screens, but its shared navigation, dense tables, forms, and charts are not yet specified or verified for narrow viewports. A deliberate responsive baseline will make the existing workflows usable on phones without sacrificing the data or behavior available on larger screens.

## What Changes

- Define responsive behavior for the shared application frame and all five existing screens, with phone-sized viewports as a first-class target.
- Keep navigation reachable on narrow screens, prevent page-level horizontal overflow, and make forms and chart panels adapt to available width.
- Preserve complete table content and semantics using contained horizontal scrolling where a table cannot sensibly reflow.
- Set viewport-based verification expectations for mobile, tablet, and desktop layouts, with headless Chromium verification on a supported GitHub-hosted Linux runner.

## Capabilities

### New Capabilities
- `responsive-frontend`: Cross-screen responsive behavior for the shared shell and all existing frontend routes.

### Modified Capabilities
- None. The new capability defines a cross-cutting viewport presentation contract while existing route capabilities retain their data and interaction contracts.

## Impact

- Affects `app/layouts/default.vue`, the five page components under `app/pages/`, chart presentation in `app/components/CategoryPieChart.vue`, and the existing Tailwind stylesheet/utilities.
- Adds dev-only browser test tooling and a browser-test workflow on GitHub Actions; the production image, APIs, stored data, and transaction/category behavior remain unchanged.
