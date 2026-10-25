# Development Toolchain Specification

## Purpose

Defines how project dependencies are installed for development and for the container image, so one
shared working copy serves several supported platforms at the same time.

## Requirements

### Requirement: One install serves every supported development platform

A single dependency installation SHALL place the native packages of every supported development
platform in the shared `node_modules`: macOS arm64 and Linux arm64. Installing on one supported
machine SHALL NOT remove the native packages of the other supported platform, and SHALL restore them
if they are missing. The package manager SHALL be the same on every supported machine.

#### Scenario: Installing on the Mac leaves Linux packages usable

- **WHEN** dependencies are installed on the macOS arm64 machine and the Linux arm64 machine has no separate install
- **THEN** `node_modules` contains the darwin arm64 native packages together with the linux arm64 ones, and the application starts on the Linux machine

#### Scenario: Installing on Linux leaves Mac packages usable

- **WHEN** dependencies are installed on the Linux arm64 machine and the macOS arm64 machine has no separate install
- **THEN** `node_modules` contains the linux arm64 native packages together with the darwin arm64 ones, and the application starts on the Mac

#### Scenario: Reinstalling does not drop the other platform

- **WHEN** an install is run again on either supported machine
- **THEN** both platforms' native packages are still present afterwards, and no further install is needed on the other machine

### Requirement: Development and test commands work on every supported platform

After one install, the documented build, development, and test commands SHALL run on either
supported machine without a platform-specific install step. The documented commands SHALL name the
project's package manager so they can be followed verbatim.

#### Scenario: The Mac runs the documented commands after a Linux install

- **WHEN** a developer runs the documented build and development commands on the macOS arm64 machine against a tree last installed on Linux
- **THEN** the build completes and the development server answers requests

#### Scenario: The Linux machine runs the documented test commands after a Mac install

- **WHEN** a developer runs the documented unit and component test commands on the Linux arm64 machine against a tree last installed on the Mac
- **THEN** both suites run to completion

### Requirement: Installs are reproducible from one committed lockfile

The repository SHALL commit exactly one dependency lockfile together with a pinned package manager
version, and SHALL NOT retain a second lockfile from another package manager. Every install path,
including the container image build, SHALL install from that lockfile and SHALL fail rather than
silently rewrite it when the manifest and lockfile disagree.

#### Scenario: The container build installs from the committed lockfile

- **WHEN** the container image is built
- **THEN** its dependency installation uses the committed lockfile, and the build fails if the manifest requires packages the lockfile does not contain

#### Scenario: A clean install leaves the lockfile unchanged

- **WHEN** dependencies are installed from scratch on either supported machine
- **THEN** the committed lockfile is unchanged afterwards

#### Scenario: No competing lockfile exists

- **WHEN** the repository is inspected
- **THEN** it contains the package manager's lockfile only, and no lockfile from a previously used package manager
