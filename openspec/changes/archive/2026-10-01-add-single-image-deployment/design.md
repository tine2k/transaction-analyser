# Design

## Context

See proposal.md - Why. `package.json` requires Node.js 24 or newer and provides `npm run build`; Nuxt emits the production Nitro server at `.output/server/index.mjs`. The server already serves the browser assets and API together, and `server/utils/db.ts` reads `DATABASE_URL` at runtime. Existing SQL migrations are plain operator-applied files under `db/migrations/`.

## Goals / Non-Goals

**Goals:**
- Produce one runnable production image for the existing Nuxt/Nitro output.
- Keep credentials and database preparation out of image construction and runtime startup.
- Keep the existing npm-based development and preview workflows available.

**Non-Goals:**
- Provision, include, migrate, back up, or manage PostgreSQL from the image.
- Add GitHub Actions workflows or otherwise automate CI.
- Change application endpoints, frontend behavior, or the existing SQL schema.

## Decisions

1. **Build a Node runtime image from the existing Nuxt production output.** Use Node 24, install dependencies from `package-lock.json` with `npm ci`, and build with the existing `npm run build` script. Run the resulting Nitro server with Node from `.output/server/index.mjs`, binding to `0.0.0.0` and using port 3000 by default while honoring a runtime port override. A multi-stage Dockerfile can keep build-only dependencies and source out of the final image while preserving the single-image result. This follows the repository's declared engine and tested production entry point; serving the frontend separately or introducing a different application server would duplicate existing runtime behavior.

2. **Provide database settings only when the image runs.** Pass `DATABASE_URL` through the container's runtime environment; do not use a Docker build argument or copy a local `.env` into an image layer. Keep the existing lazy database behavior so the image can start and serve its shell and health endpoint without a configured database. This matches the current server's runtime lookup and allows the same image to target separate operator-managed databases.

3. **Keep database preparation outside the image.** The operator supplies PostgreSQL and applies the existing SQL migrations before using data-backed features. Do not copy migration files into the runtime image or run migration commands at startup. This preserves the repository's existing manual schema lifecycle and makes image startup independent of database availability.

4. **Exclude local and sensitive material from the container build context.** Add build-context exclusions for environment files, PostgreSQL backups, generated build/install directories, and other non-runtime project material. The final image should contain only the production runtime output and Node runtime requirements, not local credentials or transaction backups.

5. **Do not add a GitHub Actions workflow.** Keep image build and run instructions usable as a standalone container build; a later CI change can invoke the same build without changing this image contract.

## Risks / Trade-offs

- [An incorrect runtime copy can omit a Nitro server dependency or client asset] → Build the production image and start it in verification; exercise both a browser route and `/api/health` through the published port.
- [A database URL or local backup could enter image layers through the build context] → Exclude environment files and backups from the context, avoid build arguments for secrets, and inspect the built image for those files and values.
- [A database is not ready or is prepared with the wrong schema] → Document that the operator must configure PostgreSQL and apply migrations before data-backed use; image startup remains independent of database readiness.

## Migration Plan

Build and tag the image, prepare the operator-managed PostgreSQL database by applying the existing migrations, then start the image with a runtime `DATABASE_URL` and a published application port. Roll back by stopping the container and running a previously built image against the same database; this change introduces no schema migration or data transformation to reverse.
