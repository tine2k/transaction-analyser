# Design

## Context

`app/layouts/default.vue` builds both the menu bar and the document title from one `screens` array. `isCurrent` compares exact paths, the mobile drawer renders the same list, and `screenLabel` supplies the tab title. Any route omitted from that list loses its title as well as its link.

The routes are file-based under `app/pages/` and rendered in the browser. The Transactions filter sheet lives in `app/pages/index.vue`; its Category field is a `<label>` wrapping the select, last in the filter grid. The three management screens read `GET /api/people`, `GET /api/categories`, and `GET /api/imports`; the imports endpoint returns the recent runs newest first. Theme roles and the sheet/panel language are in `app/assets/css/main.css`.

Three browser suites and one component suite currently assert seven menu links, seven tab titles, and a current link at `/categories`. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- Five bar destinations, a read-only `/manage` hub with three status rows, and a `Manage categories` link on the Transactions screen.
- Keep the existing routes, URLs, screen behavior, and visual language.
- Keep every route named in the tab and every management screen reachable.

**Non-Goals:**

- Grouping Monthly, Yearly, and Monthly average.
- New APIs, caching, polling, or a sync action on the hub.
- Redirects or route renames for `/categories`, `/people`, or `/imports`.
- Redesigning the three management screens or changing transaction filtering.

## Decisions

### D1. One route list, two views

Keep one `screens` list in `app/layouts/default.vue` containing all eight routes, each with its path, label, whether it appears in the bar, and its management section membership. The bar renders only the five entries flagged for it; `screenLabel` searches the whole list, so `/categories` keeps `Categories · Expenses` after leaving the bar.

The Manage link is current when the route is `/manage`, `/categories`, `/people`, or `/imports`. Use `aria-current="page"` when the route is the destination itself and `aria-current="true"` when the route is one of its sections, so the markup does not claim the hub is the shown page.

Alternative considered: separate navigation and title arrays. Rejected because they drift, and filtering the title list is exactly the bug this change could introduce.

### D2. The bar keeps five equal pills

The reduction from seven to five is the whole visual demotion. Manage stays last in the existing order. The pills keep their current white-on-gradient treatment, and the mobile drawer renders the same five.

Alternative considered: keep the three as a quieter text cluster. Rejected because it leaves the bar just as crowded and duplicates the hub's job.

### D3. The category link sits in the Category filter's label row

Restructure the Category field from a wrapping `<label>` to a container holding a `<label for="category-filter">`, a `NuxtLink` to `/categories` labelled `Manage categories`, and the select. This keeps the select's accessible name and avoids nesting an anchor inside a label. The link is a quiet text link, not a brand pill.

On phones the link may wrap within the Category field, but the select keeps its full width and 48px height. The link gets a hit area of at least 44px and the test id `manage-categories-link`.

Why here: the link is needed at the moment the Category filter offers no suitable choice. Alternative considered: a line below the filter sheet. Rejected because it separates the action from the control that raises the need.

### D4. The hub is one page at `/manage`

Add `app/pages/manage.vue`; no nested routes or redirects. The page makes three independent reads with `useFetch` and a `default: () => []`, and renders each row in the order pending, error, empty, value. Rendering pending first is what keeps a default empty array from flashing "none" while the request is in flight.

The rows are People, Categories, and Imports in that order. Each row is one `NuxtLink` to the existing screen, carrying the name, a description, and the status. The page has no form, sync control, or destructive action.

Alternative considered: a new `/api/manage/summary` read. Rejected because the three existing reads are small, already used by their screens, and would otherwise duplicate their contracts. Alternative considered: tabs. Rejected because two or three sections behind tabs add a second navigation layer where the chosen design is a status directory.

### D5. Hub status content and formatting

- People: the number of returned people, including people with no transactions. `1 person` / `N people`; empty `No people yet`.
- Categories: the number of returned categories. `1 category` / `N categories`; empty `No categories yet`.
- Imports: the first returned run (the endpoint is newest first). `Last run: <outcome> · <startedAt>`; empty `No import has run yet`; `In progress` for an unfinished run.
- Loading: `Loading…`. Failed read: `Status unavailable`.
- A failed outcome uses the failure role and carries the word `Failed`, so colour is not the only signal.

Move the imports screen's timestamp and outcome formatting into `app/utils/import-format.ts` and use it from both `app/pages/imports.vue` and the hub, so the two renderings of the same machine string cannot drift. This is the only edit to the imports screen.

Alternative considered: duplicate the two small formatters. Rejected because the duplicate would silently diverge.

### D6. Hub presentation

The page uses the existing display heading and one muted intro line. The three entries sit in one surface sheet with rules between them, using the existing panel and sheet elevation. Each row shows the name in ink, the description in muted small text, the status in muted small text, and a decorative chevron.

At phone widths the row stacks its text and status, the whole row stays the link target at 44px or more, and the status wraps inside the row. A failed run's status uses the failure colour. Hover uses a paper tint and focus uses the brand ring, both from existing tokens; no new token is introduced.

### D7. Titles and current marking

`/manage` joins the title list as `Manage · Expenses`; `/categories`, `/people`, and `/imports` keep their existing titles. Manage takes the existing white active pill on all four routes; the exact screen is named by its heading and tab title.

### D8. Tests follow the new contract

- `tests/components/layout.test.ts`: five links and labels, no Categories/People/Imports links, Manage current on `/manage`, `/categories`, `/people`, and `/imports`, mobile toggle count of five.
- `tests/browser/redesign-transactions-screen.spec.ts`: five labels, active and inactive pill checks, no page overflow.
- `tests/browser/responsive.spec.ts`: five links at phone and wide widths; the `/categories` current assertion becomes Manage; `/manage` joins the route matrix; `manage-categories-link` joins the phone touch-size check; the mobile navigation test follows the hub to a management screen.
- `tests/browser/document-title.spec.ts`: add `/manage` and keep the other seven titles.
- New `tests/components/manage.test.ts`: rows and links, counts, loading, empty, failed read, failed run, and the absence of write controls.
- New `tests/browser/manage.spec.ts`: mocked endpoints, per-row status, link navigation, 320px overflow and touch targets, desktop layout.
- Existing category, people, and imports browser tests load their routes directly and should need no navigation change. Add one browser assertion that the Transactions link reaches `/categories`.

## Risks / Trade-offs

- **Title map drifts from the bar** → Keep one list, flag bar membership, and test all eight titles.
- **The link inside a label breaks the select's name** → Split the Category field into label, link, and select; assert the select keeps its accessible name.
- **The phone filter grid breaks** → Keep the link inside the Category field, allow it to wrap, and run the existing filter-sheet and 320px checks.
- **The hub flashes an empty state while loading** → Render pending before empty and test the loading state.
- **One failed hub read hides the others** → Independent reads and per-row error rendering; test one failure at a time.
- **The hub assumes the newest run is first** → The import-log contract fixes that order; test with two runs.
- **Seven-link assertions are spread across suites** → Update every count, label list, and current-link query in one pass.
- **Failure colour leaks into normal status text** → Apply it only to a failed outcome and keep the word `Failed` in the text.

## Migration Plan

No data, API, or configuration migration. The five existing routes keep their URLs and `/manage` is new. Deploy the client; roll back by reverting the commit, with no database rollback.

## Open Questions

None.
