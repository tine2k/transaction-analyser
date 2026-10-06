# Tasks

## 1. Add and validate the publishing workflow

- [ ] 1.1 Add the GitHub Actions workflow for pull-request image builds and verify a pull-request run builds the production image without authenticating to GHCR or publishing an image.
- [ ] 1.2 Configure branch/tag publication, image metadata, and the `GITHUB_TOKEN` permissions; verify a default-branch push publishes branch, `latest`, and commit-SHA tags, and a `v*` tag push publishes version and commit-SHA tags.

## 2. Document the published image

- [x] 2.1 Update the container-image documentation with workflow triggers, GHCR image naming, tags, and token permissions; verify the documented behavior matches the workflow configuration.
