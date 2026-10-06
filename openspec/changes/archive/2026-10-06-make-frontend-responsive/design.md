# Design

## Context

See `proposal.md` for motivation. The frontend is Nuxt 4 with a single shared layout and Tailwind 4 through its existing Vite plugin; no component library is installed. The five route components contain two wide data tables, a category form and table, monthly average controls, and twelve pie-chart panels. Transaction and monthly-total tables already have local overflow wrappers, while category rows and the five-link navigation do not. Existing tests are Vitest component and integration tests; there is no browser viewport test suite in the package scripts.

The current execution container is Linux ARM64 with musl, based on `ghcr.io/anomalyco/opencode`; Playwright's downloaded glibc Chromium cannot launch here. The project already uses GitHub Actions on `ubuntu-latest` for container publishing, so CI can use Playwright's managed browser. In an Alpine-derived OpenCode container, install Alpine's musl-native `chromium` package and select it through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The root `.dockerignore` continues to exclude tests from the production image.

## Goals / Non-Goals

**Goals:**
- Make the existing routes usable from a 320 CSS-pixel phone width upward without changing route or data contracts.
- Keep every navigation destination, form action, table value, and category total available.
- Establish repeatable viewport-based browser verification for narrow, intermediate, and wide layouts on GitHub-hosted Linux, without requiring a Docker daemon or changing the production image.

**Non-Goals:**
- Redesigning the visual theme or introducing a component library, CSS framework, or production UI dependency.
- Changing server APIs, data calculations, filters, table sorting, or persisted data.
- Creating separate mobile-only routes or removing features from small screens.

## Decisions

- **Use one responsive, mobile-first presentation.** Apply the existing Tailwind responsive utilities and small focused layout styles to the same routes and content. This keeps behavior and accessibility semantics shared across sizes. Separate mobile pages or duplicated templates could provide different compositions, but they would duplicate interaction logic and risk divergent data displays.

- **Use a disclosure navigation on narrow screens.** A compact button reveals the five existing links, reports its expanded state, supports keyboard input, and closes after a destination is chosen. Keeping all five labels always visible by wrapping them avoids interaction state, but would use several lines in the limited header area; horizontal navigation scrolling would hide destinations and be less discoverable. At wide widths, retain the directly visible link row.

- **Keep wide data in semantic tables with contained horizontal scrolling.** Preserve the table, headers, and every cell, and make the table wrapper itself scrollable and keyboard reachable. This is preferable for the transaction and month/category matrices, where a card conversion would either create long repeated records or require prioritizing and potentially hiding fields. The trade-off is that phone users make a horizontal gesture to inspect less prominent columns; a visible edge/scroll affordance and an accessible region label should make that discoverable. Apply the same pattern to the category list for consistent access to every row action.

- **Reflow controls and chart panels rather than shrinking them.** Stack or wrap filters, category form rows, and action groups when they cannot fit. Present analytics panels in one column on phones and use the chart component's resize behavior within each panel. Keep the current textual category totals beside the charts as the dependable exact-value view, since pie labels become crowded when many categories share a narrow chart. Broader viewports can use multiple panels per row.

- **Support both a container-native browser and a hosted CI browser.** Add Playwright as a dev dependency. GitHub Actions installs the lockfile-matched Chromium plus Linux dependencies on `ubuntu-latest`. An Alpine-derived OpenCode image installs `chromium` with `apk` and sets `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser`, avoiding the glibc binary. The browser tests intercept API calls with fixtures, so they need no PostgreSQL server or project transaction data. Exercise 320×640 and 390×844 phone profiles, 768×1024 tablet, and 1280×800 desktop across all five routes and the failure page, including empty/loaded states where layout differs. Check document overflow, navigation state and link reachability, minimum control hit areas, and local table scrolling. The existing Vitest suite remains responsible for route-specific component behavior.

## Risks / Trade-offs

- [A horizontal table may not be obvious to a phone user] → Keep the overflow local, provide a visible scroll cue and accessible label, and verify touch and keyboard scrolling in Chromium.
- [Pie-slice labels may collide when the chart narrows or many categories are present] → Resize charts with their panels, inspect dense-category states at phone width, and keep the exact textual totals list available without clipping.
- [A collapsible mobile menu adds an interaction state] → Use a native button with an explicit accessible name and expanded state, test keyboard activation, current-route marking, and closing after navigation.
- [Hosted browser tests may not run until changes reach GitHub] → Define the workflow to run for pull requests and pushes to `main`, and keep local component/unit checks available for the current musl container.

## Migration Plan

No data or API migration is needed. Ship the responsive styles and interaction alongside the existing routes. Rollback consists of reverting the frontend layout changes; route URLs and stored data remain unchanged.
