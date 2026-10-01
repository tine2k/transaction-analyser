# Proposal

## Why

The application already builds into a Nuxt/Nitro server that serves its browser frontend and API from one process, but the repository has no deployment image for that output. A single runnable image will make the existing application easier to deploy while leaving PostgreSQL setup and credentials under the operator's control.

## What Changes

- Add a container image build that packages the production Nuxt/Nitro server and its browser assets together, with one process serving both on one port.
- Keep the image independent of any particular database: do not package or start PostgreSQL, read `DATABASE_URL` only at runtime, and leave database creation and migration application to the operator.
- Preserve the existing package-based local build and run workflow.
- Keep GitHub Actions workflows and CI automation out of scope; the image build remains usable by a later workflow.

## Capabilities

### New Capabilities
- `container-image`: defines building and running one image for the combined frontend and backend, with manually supplied runtime database configuration and no bundled database.

### Modified Capabilities

None. The existing `backend-shell` already defines the one-process, same-origin server and runtime database behavior; this change adds a container packaging capability without replacing local operation.

## Impact

- Adds container build/runtime files (expected: a `Dockerfile` and build-context exclusions) and deployment guidance.
- Uses the existing `npm` lockfile and Nuxt production output; no application API or database schema changes are expected.
- Does not add PostgreSQL, automatic migrations, or GitHub Actions workflow files.
