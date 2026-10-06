# Spec Delta

## Purpose

This capability makes production container images available in GitHub Container Registry from repository changes and version releases, while allowing pull requests to validate builds without publishing them.

## ADDED Requirements

### Requirement: Pull requests validate container builds without publishing
The CI workflow SHALL build the production container image for pull requests targeting the default branch. A pull-request run SHALL NOT authenticate to GitHub Container Registry or publish an image.

#### Scenario: Pull request builds without publishing
- **WHEN** a pull request targets the default branch
- **THEN** the workflow builds the production image and publishes no image to GitHub Container Registry

### Requirement: Default-branch pushes publish the production image
The CI workflow SHALL publish the production container image to `ghcr.io/<owner>/<repository>` when changes are pushed to the default branch. The published image SHALL include a default-branch tag, a `latest` tag, and a commit-SHA tag.

#### Scenario: Default-branch image is published with stable tags
- **WHEN** a commit is pushed to the default branch
- **THEN** the workflow publishes the image with the default-branch name, `latest`, and a tag identifying the commit SHA

### Requirement: Version-tag pushes publish versioned images
The CI workflow SHALL publish the production container image when a version tag beginning with `v` is pushed. The published image SHALL include the pushed version tag and a commit-SHA tag.

#### Scenario: Versioned image is published
- **WHEN** a version tag beginning with `v` is pushed
- **THEN** the workflow publishes the image with that version tag and a tag identifying the commit SHA

### Requirement: Registry publishing uses the workflow token
The CI workflow SHALL authenticate to GitHub Container Registry using the repository-provided workflow token with package write permission. Publishing SHALL NOT require a separately configured personal access token.

#### Scenario: Workflow token publishes the image
- **WHEN** a publishing event runs with the required package permission
- **THEN** the workflow authenticates with its provided token and can publish the image without a separately configured registry credential
