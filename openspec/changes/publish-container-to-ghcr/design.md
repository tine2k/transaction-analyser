# Design

## Context

See `proposal.md` for motivation. The repository already has a root `Dockerfile` that builds the Nuxt/Nitro production image, and its build does not require database credentials. The new publishing behavior is contained in GitHub Actions; the existing runtime image and external PostgreSQL arrangement remain unchanged. See `specs/container-image-publishing/spec.md` for required event and tagging behavior.

## Goals / Non-Goals

**Goals:**
- Reuse the existing Docker build context and Dockerfile for CI and publication.
- Keep pull-request validation separate from registry authentication and publication.
- Use event metadata to give published images useful branch, version, and commit tags.
- Use the repository-provided token and grant only the permissions required by the workflow.

**Non-Goals:**
- Publishing multiple CPU architectures or signing/scanning images.
- Deploying the published image to an environment.
- Building or publishing a database service or changing application runtime configuration.

## Decisions

- **Build the existing Dockerfile with Docker Buildx.** This keeps CI aligned with the documented local `docker build` process. A separate CI-only Docker build definition would risk divergence; rebuilding the application outside the container build would not validate the image itself.
- **Run on pull requests to the default branch, pushes to the default branch, and `v*` tag pushes.** Pull requests build with push disabled. Default-branch pushes receive branch, `latest`, and commit-SHA tags; version-tag pushes receive the version and commit-SHA tags. This maps tags directly to the source event and avoids publishing PR-derived images.
- **Use the repository-scoped `GITHUB_TOKEN` for GHCR authentication.** Grant `contents: read` and `packages: write` to the workflow. This avoids managing a long-lived personal access token; the alternative would add a manually rotated secret and its associated access scope.
- **Use Docker metadata and Buildx GitHub Actions cache.** Metadata derives the image reference and tags from the event, and the Actions cache avoids repeatedly downloading unchanged build layers. A manually maintained tag-generation script would duplicate GitHub event handling.

## Risks / Trade-offs

- [A push can fail if the workflow token lacks package write access or the package is governed by restrictive organization settings] → Keep the permission explicit and verify package access on the first publishing run.
- [The `latest` and branch tags move as new commits are published] → Preserve the immutable commit-SHA tag for deployments that need to pin an exact build.
- [A failed Docker build prevents publishing for the triggering commit] → Treat that run as a failed delivery and correct the source or build before retrying.

## Migration Plan

No data migration is required. Once the workflow is merged, the next matching push builds and publishes an image. To roll back automation, remove or disable the workflow; already published GHCR images and tags remain and can be managed independently.
