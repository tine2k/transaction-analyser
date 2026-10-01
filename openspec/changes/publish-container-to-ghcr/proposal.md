# Proposal

## Why

The project can build a production container locally, but has no defined automated delivery of that image to GitHub Container Registry. Publishing images from repository and release events will make deployable builds available consistently while allowing pull requests to validate the container build without publishing artifacts.

## What Changes

- Define an automated GitHub Actions workflow that builds the repository's production Docker image and publishes it to GHCR on configured branch and version-tag pushes.
- Require pull-request runs to build the image without authenticating to or publishing to GHCR.
- Define stable image tags for branch, version, commit, and default-branch builds.

## Capabilities

### New Capabilities
- `container-image-publishing`: Build and publish the production container image to GitHub Container Registry from repository events.

### Modified Capabilities
- None.

## Impact

- Adds a GitHub Actions workflow using the existing root `Dockerfile` and GitHub Container Registry.
- Requires the workflow's `GITHUB_TOKEN` to have package write permission; no additional secret is required.
- Documents the workflow and published image tags alongside the existing container-image instructions.
