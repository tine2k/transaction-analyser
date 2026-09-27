# Design

## Context

See proposal.md — Why. The relevant current state:

- `app/pages/index.vue` is placeholder text; `app/layouts/default.vue` supplies the frame; `nuxt.config.ts` loads the single stylesheet (`app/assets/css/main.css`, Tailwind 4).
- `app/pages/index.vue` is server-rendered (`ssr: true` in `nuxt.config.ts`), and `frontend-shell` previously guaranteed the delivered document already contained the route's content.
- The data source is the read-only `GET /api/transactions` endpoint planned by `add-transactions-read-endpoint`, which is not yet implemented. Its intended response is a JSON list of transactions, each with the seven domain elements, an amount as a decimal string, and category as an object (id, name) or absent.
- No component library, design system, or datatable package exists, and `frontend-shell` forbids adding one.

## Goals / Non-Goals

**Goals:**
- Render every transaction the endpoint returns as a table on the index route.
- Show each value faithfully: signed amount as a string, day-precise dates, and explicit gaps for absent account and uncategorised.
- Keep the rows in the delivered document, preserving the shell's server-rendered behavior.
- Handle the empty list and the failed request as distinct, explained states.

**Non-Goals:**
- Adding the read endpoint (owned by `add-transactions-read-endpoint`).
- Filtering, searching, sorting, grouping, or pagination.
- Totals, balances, or any aggregation.
- Category assignment or any write.
- Design tokens, theming, or a reusable component convention.

## Decisions

### Fetch and render on the server with `useFetch`

Use Nuxt's `useFetch('/api/transactions')` in `app/pages/index.vue` so the request runs during server rendering and the rows are present in the delivered document. Alternatives considered: a client-only `$fetch` in `onMounted` (rejected — leaves the first paint an empty/flashing table and breaks the shell's established "delivered document is already rendered" behavior) and a Nitro server-side query in the page (rejected — duplicates the endpoint and bypasses the read API the project just defined).

The request is same-origin by construction; the browser also gets the hydration payload, so no separate browser-side fetch is needed.

### One page component, plain semantic table, existing stylesheet

Build the table as a semantic `<table>` directly in `app/pages/index.vue` using the existing Tailwind utility classes and the layout's container. No new component, package, or stylesheet. Alternative: add a datatable/grid dependency — rejected, it violates the no-component-library constraint and would pull in filtering/sorting affordances the request excludes.

### Present the amount string verbatim

Render the amount exactly as the endpoint returned it — a signed decimal string — and never coerce it with `Number()` or `parseFloat()`, never round it, and never drop the minus. A minus sign is the direction. Alternative: format with `Intl.NumberFormat` — rejected, it reforms the value (locale separators, possible rounding) and can hide precision the read API deliberately preserved.

### Show dates as strings, not `Date` objects

Render the booking and value dates as the strings the endpoint returned. Do not construct JavaScript `Date` objects, which can shift the calendar day across a time-zone boundary. Each date gets its own column, so equal dates still read as two values.

### Represent absent values with an explicit gap

When `counterparty_account` is absent, render a visible dash in that cell. When there is no category, render a visible dash in the category cell. Do not leave the cell empty, do not print an empty string, and do not invent a category for the absence. This keeps "absent" distinguishable from "present but empty", matching the domain model, which holds absence and emptiness as different states.

### Preserve the endpoint's order and add no client-side ordering

Render rows in the order received and keep no sorting or filtering logic anywhere in the page. Alternatives: default sort by booking date, or a sortable header — both rejected; the user explicitly asked to skip filter and sort, and the endpoint already defines a stable order.

### Three distinct render states from `useFetch`

Use the fetch's `data`, `error`, and `pending`/`status`:
- data present and non-empty → table;
- data present and empty → an explicit "no transactions" message (no empty table shell that reads as data);
- error (including a 404 while the endpoint is not yet implemented) → an explicit "could not be loaded" message.

This keeps a failed request from masquerading as an empty database.

## Risks / Trade-offs

- **Depends on an unimplemented endpoint** → The task list names `add-transactions-read-endpoint` as a prerequisite; until it lands, the page renders the error state rather than crashing. No endpoint code is written here.
- **Server render now touches the database** → If the database is unreachable, rendering the route reports the failure through the error state instead of failing the whole page; the shell's health endpoint is unaffected.
- **No pagination on a large table** → Accepted: the request explicitly excluded filter/sort, and an ordered full list is what the endpoint provides. Large-data pagination is deferred.
- **String amount rendering is easy to accidentally coerce** → Guarded by making "no numeric coercion" an explicit decision and a task-level check.

## Migration Plan

- Change is confined to `app/pages/index.vue`. No data, schema, or API change, so there is nothing to migrate.
- Rollback: restore the previous placeholder page; nothing else depends on the table.
- Deploy order: `add-transactions-read-endpoint` first, then this change, so the endpoint answers before the table calls it.

## Open Questions

- Whether a later change should add pagination or a virtualized list for large transaction sets.
- Whether the amount should carry a visible `EUR` label; deferred because the endpoint returns a bare decimal and the domain already fixes the currency.
- Whether design tokens or a shared table component convention are warranted; not needed for a single table.
