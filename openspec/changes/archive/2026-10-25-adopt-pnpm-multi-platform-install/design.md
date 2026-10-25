# Design

## Context

See `proposal.md` for motivation. Constraints discovered in the repository:

- The working copy is a single directory on the Mac, mounted into an arm64 Linux VM over `virtiofs`
  (`df -T .` reports `virtiofs`). `node_modules` is therefore one physical tree shared by both
  machines, not two installations.
- Both machines are arm64: the Linux VM reports `aarch64`, and the Mac is Apple Silicon.
- The tree currently installed came from npm on Linux. It contains
  `@rolldown/binding-linux-arm64-{gnu,musl}`, `@tailwindcss/oxide-linux-arm64-{gnu,musl}`,
  `lightningcss-linux-arm64-{gnu,musl}`, and `@rollup/rollup-linux-arm64-{gnu,musl}`, and no darwin
  variants. Rolldown 1.2.11 has no `@rolldown/binding-wasm32-wasi` in its optional dependencies, so
  the macOS loader falls through every native binding into a missing WASI fallback.
- npm cannot produce a tree for two platforms: `os`, `cpu`, and `libc` are single-valued, every
  install prunes packages for the other platform, and npm maintainers state multi-architecture trees
  are not supported.
- The project is a single package (no workspaces), uses `npm` scripts, and builds its container image
  on `node:24-bookworm-slim` with `npm ci`. The lockfile is `package-lock.json` (lockfile v3) and
  already records every platform's optional package, including `darwin-arm64` and `linux-arm64`.
- `engines` requires Node `>=24`; the Linux VM currently runs Node 22.22.1 with npm 9.2.0. pnpm does
  not enforce `engines` by default, so this does not block the migration.

## Goals / Non-Goals

**Goals:**

- One `node_modules` in the shared working copy that contains the native packages for both
  `darwin-arm64` and `linux-arm64`, so both machines can build, run, and test in parallel.
- Install on either machine preserves both platforms' packages.
- One committed lockfile, a pinned package manager version, and a container build that installs from
  it without rewriting it.
- Documentation and scripts that name the package manager, so no one reintroduces npm.

**Non-Goals:**

- Per-platform Nuxt build directories. `.nuxt`, `.output`, and `node_modules/.cache` stay shared;
  simultaneous builds on both machines can still race and are left as an operational caveat.
- Supporting Windows, Intel Macs, or Linux x64. The supported architecture list can be extended
  later by editing one file.
- Aligning the Linux VM's Node version with `engines`.
- Rewriting archived OpenSpec changes that mention `npm run …`.
- Changing container image behavior; only its build stage changes.

## Decisions

### D1: pnpm with `supportedArchitectures` as the package manager

pnpm installs optional dependencies for the listed target platforms even when they do not match the
host, and keeps them across subsequent installs. This is the only npm-compatible-ecosystem
mechanism that satisfies the "one tree, two platforms" requirement.

*Alternatives considered:*

- **npm**: `--os`/`--cpu`/`--libc` target one platform per install and each install prunes the
  other. Rejected: cannot meet the requirement.
- **Custom `postinstall` injector** that downloads the other platform's gated tarballs from
  `package-lock.json` and extracts them into `node_modules`. Rejected: bespoke, must be maintained
  per ecosystem change, and leaves extraneous packages npm reports as errors.
- **Separate checkouts or bind-mounted `node_modules` per platform**: rejected by the user's
  requirement to use the same working copy simultaneously, and not controllable from the repo.

### D2: Declare the platforms in `pnpm-workspace.yaml`

```yaml
supportedArchitectures:
  os: [darwin, linux, current]
  cpu: [arm64]

nodeLinker: hoisted
storeDir: .pnpm-store
```

- Mapping form (`os`/`cpu`) rather than the newer platform-list form, for readability.
- `current` is included so the file remains correct if a machine's own platform is not listed.
- **No `libc` key.** The first implementation attempt declared `libc: [glibc, musl]`; pnpm then
  dropped every macOS package from resolution, because it applies the declared libc to all platforms
  and the darwin packages declare none. Verified by `pnpm config get supportedArchitectures`
  omitting `darwin` with `libc` present and listing it after removal. The Linux host's own libc is
  used for the Linux packages, which is what the Debian-based image and VM need; musl-only
  environments are not supported by this change.
- `nodeLinker: hoisted` produces an npm-like flat tree. Rationale: the existing tooling (Nuxt, Nitro,
  Playwright config paths) is only proven against a hoisted tree, and a flat tree avoids depending on
  pnpm's symlink layout working across `virtiofs`. *Alternative rejected:* pnpm's default isolated
  layout; it is stricter and smaller, but adds a resolution risk this change does not need to take.
- `storeDir: .pnpm-store` keeps the content-addressable store on the same `virtiofs` volume as
  `node_modules`, so pnpm can hardlink (or copy, if the filesystem refuses hardlinks) without
  crossing filesystems. The directory is gitignored. *Alternative rejected:* the default per-user
  store on the Linux VM, which would copy every package across the mount and duplicate storage
  per machine.

### D3: Pin pnpm 10.34.8 through `packageManager` and corepack

`package.json` gains `"packageManager": "pnpm@10.34.8"`. Both machines run `corepack enable` once;
corepack then runs the pinned version, so both machines and the container use the same pnpm.

The version is 10.34.8 rather than the current 12.x because Corepack 0.24, which ships with the
Linux VM's Node 22, cannot launch pnpm 11 or newer: it resolves `bin/pnpm.cjs`, while those versions
publish `bin/pnpm.mjs` and, in 12, a bare `pnpm` file. Verified: `corepack prepare pnpm@11.28.8`
followed by `corepack pnpm --version` fails with `MODULE_NOT_FOUND`, while 10.34.8 reports its
version. pnpm 10 supports everything this change needs: settings in `pnpm-workspace.yaml`,
`supportedArchitectures`, and the `hoisted` linker.

*Alternatives rejected:* a newer pnpm installed with `npm install -g` on every machine, which
replaces corepack's pin with whatever each machine installed and fails differently when the global
prefix is not writable; pinning 12.x and requiring a newer Corepack, which the VM cannot provide
without upgrading Node.

### D4: Migrate the lockfile with `pnpm import`, then remove the npm artifacts

Order matters: `pnpm import` reads the existing `package-lock.json` so the resolved versions carry
over instead of being re-resolved to newer ones. Then remove `node_modules` (it contains a
Linux-only npm tree, and mixing it with pnpm's layout is unsupported), run `pnpm install`, verify
both platforms are present, and only then delete `package-lock.json`. Rollback is `git checkout`
of `package.json`, `package-lock.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `Dockerfile`,
`.gitignore` plus a fresh `npm ci`.

### D5: Container build uses pnpm, runtime stage keeps npm

The build stage copies `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`, runs
`corepack enable`, and installs with `pnpm install --frozen-lockfile` (`--frozen-lockfile` is
pnpm's `npm ci` equivalent and fails when the lockfile is out of date). The pnpm workspace file is
copied so the install uses the same settings as a developer tree.

The runtime-dependencies stage is unchanged: Nitro emits a self-contained `.output/server/package.json`,
and `npm install --omit=dev` there does not read the repository lockfile. Leaving it on npm avoids
carrying a package manager into the runtime image for one install step.

*Alternative considered:* `pnpm deploy` for the runtime dependencies. Rejected: it changes the
output layout the Dockerfile currently relies on, for no behavioral gain.

### D6: Scripts and documentation switch to pnpm

- `package.json` scripts stay npm-agnostic, except the nested `npm run …` calls in `test` and
  `test:integration`, which become `pnpm run …` so a pnpm-run script does not invoke npm.
- `README.md`, `tests/README.md`, and `docs/container-image.md` change `npm ci` / `npm install` /
  `npm run …` to `pnpm install` / `pnpm run …`, and the prerequisite line names pnpm via corepack.
- `AGENTS.md` gains a short note that the project uses pnpm with darwin/linux arm64 as supported
  architectures, so future work does not reintroduce npm commands.
- Historical `openspec/changes/archive/**` files are left untouched.

### D7: Approve dependency build scripts only if pnpm reports them

pnpm 10 blocks unapproved dependency lifecycle scripts by default and reports them as ignored build
scripts, listing the packages with `ignoredBuiltDependencies`/`onlyBuiltDependencies` in
`pnpm-workspace.yaml`. All native dependencies here ship prebuilt binaries
(`napi-rs`/`oxide`/`rolldown`/`rollup`/`lightningcss`), so no dependency build script is expected.
During implementation, read the install output and add only the specific packages pnpm actually
blocks and the project needs; do not blanket allow all scripts.

## Risks / Trade-offs

- **`virtiofs` refuses hardlinks or is slow under pnpm's linking** → pnpm falls back to copying when
  hardlinks fail, which still works but increases install time and disk usage. If install fails on
  linking, set `packageImportMethod: copy` and re-run.
- **`hoisted` layout behaves differently from the previously validated npm tree** → the first
  install is verified with `pnpm run build` and the unit and component suites before the change is
  considered done; if resolution breaks, switch `nodeLinker` to `isolated` and re-verify.
- **A stale `node_modules` mixes npm and pnpm artifacts and produces confusing native errors** →
  implementation deletes `node_modules` before the first pnpm install, and verification asserts both
  platform binding directories exist, not just that a command ran.
- **pnpm 12 blocks a needed install script and the app fails at runtime** → D7's check of install
  output, plus the build and test suites, catches it; add the specific `allowBuilds` entry.
- **PNPM downloads for the non-host platform are not truly optional** → the first install grows by
  the darwin/linux binding set (tens of MB). Accepted as the cost of a single usable tree.
- **Simultaneous installs on both machines corrupt the shared tree** → documented: run an install
  when the other machine is idle; day-to-day edits need no install.
- **`packageManager` pins pnpm, but corepack is deprecated in newer Node releases** → both machines
  enable the bundled Corepack and the pin is 10.34.8, which Corepack 0.24 can still launch; if
  Corepack is removed, the fallback is a machine-level pnpm matching the pin, and the image stays on
  `node:24`.

## Migration Plan

1. Add `pnpm-workspace.yaml`, the `packageManager` pin, and the `.pnpm-store/` ignore entry.
2. `pnpm import` to produce `pnpm-lock.yaml` from `package-lock.json`.
3. Remove `node_modules`, run `pnpm install`, verify both platforms' packages and run the build and
   fast test suites.
4. Delete `package-lock.json`; update the Dockerfile and documentation.
5. On the Mac, run `pnpm install`, then `pnpm dev` and `pnpm run build` to confirm the original
   failure is gone and the Linux-installed tree is still usable afterwards.

## Open Questions

None that affect the specs or the task breakdown. Whether to give each platform its own Nuxt build
directory is deferred to an operational follow-up if simultaneous builds prove disruptive.
