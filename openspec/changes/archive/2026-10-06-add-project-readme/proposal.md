# Proposal

## Why

Self-hosting is the main purpose of this project, but the repository has no root README. A first-time self-hoster must piece the path together from `docs/container-image.md` and `tests/README.md`: create and prepare PostgreSQL, run the published image, import a bank-export CSV, and keep the database backed up. A concise root README that leads with the self-hosting path removes that friction.

## What Changes

- Add a root `README.md` focused on self-hosting the published container, kept short (roughly 80 lines) with depth left in the existing docs.
- Provide a self-contained quick start that creates the PostgreSQL 18 container (named `transaction-analyser-postgres`, data volume mounted at `/var/lib/postgresql`), applies the repository migrations, runs `ghcr.io/tine2k/transaction-analyser`, imports a CSV from a repository checkout, and verifies `/api/health`.
- Document the import path as it exists today: the importer is not in the image and runs from a checkout with Node 24.
- Document upgrading and backups: pin `vX.Y.Z` or `sha-<commit>` rather than a moving tag, apply only new migration files in order, and use `tools/backup-postgres.sh` with the documented container name.
- Add a brief "What it does" list of the five screens and a Development section linking to `tests/README.md` and `docs/container-image.md`.

No breaking changes.

## Capabilities

### New Capabilities

- None. This is a documentation-only change: it adds no behavior, so `.openspec.yaml` sets `skip_specs: true`. The behavior the README describes is already specified by the `container-image`, `transaction-csv-import`, and related capabilities.

### Modified Capabilities

- None.

## Impact

- Adds `/README.md`. No code, API, container, schema, or runtime behavior changes.
- References existing `docs/container-image.md` and `tests/README.md`; neither is modified by this change.
- Documents the image produced by the `publish-container-to-ghcr` workflow (`ghcr.io/tine2k/transaction-analyser`).
