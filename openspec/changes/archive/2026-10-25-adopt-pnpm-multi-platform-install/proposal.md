# Proposal

## Why

The repository is used simultaneously from two machines that share one working copy over a mounted
filesystem: an Apple Silicon Mac and an arm64 Linux VM. A single `node_modules` is visible to both,
but npm installs native dependencies only for the host it runs on. Whichever machine installed last
wins, and the other fails to start — currently macOS fails with `Cannot find module
'@rolldown/binding-wasm32-wasi'` because Rolldown has no native binding to load and its WASI fallback
is not installed. The same failure applies to `@tailwindcss/oxide` and `lightningcss`, so fixing
Rolldown alone would not make the shared tree usable.

npm cannot solve this: its `--os`, `--cpu`, and `--libc` options target one platform per install, and
every install prunes packages for the other platform. Running one install per machine therefore
makes parallel use impossible. pnpm supports installing optional dependencies for several platforms
side by side in `node_modules` via `supportedArchitectures`.

## What Changes

- **BREAKING (development workflow)**: replace npm with pnpm as the package manager. `package-lock.json`
  is replaced by `pnpm-lock.yaml`; `package.json` gains a pinned `packageManager`; scripts and all
  documented commands use pnpm.
- Add `pnpm-workspace.yaml` declaring darwin/linux arm64 (glibc and musl) as supported architectures
  so one install provides both platforms' native packages.
- Keep `node_modules` shared: a successful install on either machine leaves the other machine's
  packages in place, so both can run against the same working copy at the same time.
- Install from a pnpm store kept inside the workspace, so packages stay on the shared volume.
- Update the container image build to install from the committed pnpm lockfile with a frozen lockfile.
- Update developer documentation (`README.md`, `tests/README.md`, `docs/container-image.md`, `AGENTS.md`)
  to the pnpm commands.

## Capabilities

### New Capabilities

- `development-toolchain`: how project dependencies are installed for local development and for the
  container image — the package manager, the committed lockfile, the platform set a single install
  covers, and the guarantee that installing on one supported platform does not remove another
  platform's native packages.

### Modified Capabilities

None. The container image's observable behavior does not change; only how its build stage obtains
dependencies.

## Impact

- `package.json` (package manager pin, script commands), new `pnpm-workspace.yaml`, new
  `pnpm-lock.yaml`, removed `package-lock.json`, `.gitignore` (pnpm store).
- `Dockerfile` build stage; `docs/container-image.md` reference to the lockfile.
- `README.md`, `tests/README.md`, `AGENTS.md` command documentation.
- Every developer machine and the container build must run pnpm through corepack; npm-based
  workflows stop working until migrated.
- Out of scope: per-platform Nuxt build directories, Node version alignment (the Linux VM runs Node
  22 while `engines` requires 24), CI workflow changes beyond the container build, and rewriting
  archived OpenSpec tasks that mention npm.
