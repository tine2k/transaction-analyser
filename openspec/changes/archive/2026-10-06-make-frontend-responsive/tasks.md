# Tasks

## 1. Shared shell and navigation

- [x] 1.1 Adapt the shared frame spacing and navigation for phone and desktop widths; add the labelled mobile disclosure with `aria-expanded`, keep the active route marked, and close the menu after navigation. Update `tests/components/layout.test.ts` for menu state and route links, then run `npm run test:components`.

## 2. Responsive forms, controls, and data tables

- [x] 2.1 Make the transaction filters, category form fields/date-window rows/action buttons, monthly-average controls, and category-average rows reflow within narrow widths; meet the specified minimum touch hit areas. Extend the relevant component tests and run `npm run test:components`.
- [x] 2.2 Ensure the transaction, category, and monthly-total tables are contained in labelled, keyboard-reachable horizontal scroll regions, preserving semantic headers, all cells, and existing interactions. Extend the relevant component tests and run `npm run test:components`.

## 3. Responsive analytics

- [x] 3.1 Stack monthly chart panels on narrow screens, retain multi-column panels when space permits, and resize each chart to its panel without clipping its textual totals. Extend `tests/components/analytics.test.ts` and `tests/components/category-pie-chart.test.ts`, then run `npm run test:components`.

## 4. Headless viewport verification

- [x] 4.1 Add a dev-only Playwright dependency, browser configuration with an optional system-Chromium executable path, and a browser test command using intercepted API fixtures for all routes at the required viewport sizes. Verify page overflow, navigation, touch hit areas, and table scrolling; execute the suite in headless Chromium.
- [x] 4.2 Add a GitHub Actions workflow on pull requests and pushes to `main` that installs Node 24 and the Playwright-matched Chromium on `ubuntu-latest`, builds the app, and runs the browser suite without Docker or PostgreSQL. Document the equivalent setup for Alpine-derived OpenCode images using `apk add chromium` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
- [x] 4.3 Run `npm run build` and verify the generated `.output/server/package.json` does not include Playwright as a production dependency, keeping the production runtime browser-free.
