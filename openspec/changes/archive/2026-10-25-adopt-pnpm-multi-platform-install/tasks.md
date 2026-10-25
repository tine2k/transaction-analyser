# Tasks

## 1. Declare pnpm and the supported architectures

- [x] 1.1 Add `pnpm-workspace.yaml` with `supportedArchitectures` (`os: [darwin, linux, current]`, `cpu: [arm64]`), `nodeLinker: hoisted`, and `storeDir: .pnpm-store`; verify `pnpm config get supportedArchitectures` prints the declared lists
- [x] 1.2 Add `"packageManager": "pnpm@10.34.8"` to `package.json`; verify `corepack pnpm --version` reports `10.34.8`
- [x] 1.3 Add `.pnpm-store/` to `.gitignore`; verify `git check-ignore -v .pnpm-store/probe` reports the new rule
- [x] 1.4 Enable corepack on both machines (`corepack enable`) and confirm `pnpm --version` reports the pinned version on the Linux VM and on the Mac (Linux: shims installed in `~/.local/bin`, reports 10.34.8; Mac: confirmed by the user)

## 2. Migrate the lockfile and produce a dual-platform install

- [x] 2.1 Run `pnpm import` to convert `package-lock.json` into `pnpm-lock.yaml`; verify the new lockfile exists and `git diff --stat package-lock.json` shows it unchanged
- [x] 2.2 Remove the Linux-only npm tree with `rm -rf node_modules`, then run `pnpm install`; verify the install exits 0 and report any blocked build scripts so they can be approved per design D7
- [x] 2.3 Verify both platforms' native packages are installed: `node_modules/@rolldown/binding-darwin-arm64`, `node_modules/@rolldown/binding-linux-arm64-gnu`, `node_modules/@tailwindcss/oxide-darwin-arm64`, `node_modules/@tailwindcss/oxide-linux-arm64-gnu`, `node_modules/lightningcss-darwin-arm64`, `node_modules/lightningcss-linux-arm64-gnu`, `node_modules/@rollup/rollup-darwin-arm64`, and `node_modules/@rollup/rollup-linux-arm64-gnu` must all exist
- [x] 2.4 Run `pnpm install` a second time on Linux; verify the darwin arm64 packages from task 2.3 still exist afterwards (the install is idempotent across platforms)
- [x] 2.5 Delete `package-lock.json`; verify `git ls-files | grep -E '(package-lock\.json|pnpm-lock\.yaml)$'` lists only `pnpm-lock.yaml`

## 3. Verify the Linux machine builds and tests from the migrated tree

- [x] 3.1 Run `pnpm run build`; verify it exits 0 and `.output/server/index.mjs` exists
- [x] 3.2 Run `pnpm run test:unit`; verify the suite passes
- [x] 3.3 Run `pnpm run test:components`; verify the suite passes
- [x] 3.4 Run `pnpm run test:integration`; verify the suite passes against a disposable database, or record the exact prerequisite that prevented running it (recorded: no reachable PostgreSQL server, and `initdb` is not installed, so the launcher cannot create a disposable cluster)

## 4. Build the container image from the pnpm lockfile

- [x] 4.1 Change the `Dockerfile` build stage to copy `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`, run `corepack enable`, and install with `pnpm install --frozen-lockfile`; leave the runtime-dependencies stage on npm; verify `docker build --tag transaction-analyser:local .` succeeds, or record that Docker is unavailable
- [x] 4.2 Update `docs/container-image.md` to name `pnpm-lock.yaml` instead of `package-lock.json`; verify the build description matches the `Dockerfile` commands
- [x] 4.3 Verify a stale lockfile is rejected without building the image: add an undeclared entry to `package.json` (for example `"left-pad": "^1.3.0"` under `dependencies`), confirm `pnpm install --frozen-lockfile --ignore-scripts` fails with an out-of-date-lockfile error, then restore `package.json` with `git checkout -- package.json` and confirm the lockfile check passes again (restored by removing the probe entry instead, because `package.json` holds uncommitted changes)

## 5. Update developer documentation and scripts

- [x] 5.1 Replace nested `npm run …` calls in the `test` and `test:integration` scripts with `pnpm run …`; verify `pnpm run test:unit` still runs through the new script chain
- [x] 5.2 Update `README.md`: prerequisite names pnpm via corepack, and `npm ci` / `npm run …` become `pnpm install` / `pnpm run …`; verify every command shown exists in `package.json` and no `npm install`, `npm ci`, or `npm run` remains in the file
- [x] 5.3 Update `tests/README.md` the same way; verify every documented command exists in `package.json`
- [x] 5.4 Add a short note to `AGENTS.md` that the project uses pnpm with darwin and linux arm64 supported architectures; verify it matches `pnpm-workspace.yaml`

## 6. Verify the shared tree on the Mac

- [x] 6.1 On the macOS arm64 machine, run `pnpm install`; verify the darwin and linux arm64 packages from task 2.3 are both still present (confirmed by the user; verified from Linux afterwards)
- [x] 6.2 On the Mac, run `pnpm run build` and `pnpm dev`; verify the build succeeds and the page that previously failed with `Cannot find module '@rolldown/binding-wasm32-wasi'` loads (confirmed by the user)
- [x] 6.3 Back on the Linux machine, run `pnpm run build` without reinstalling; verify it still succeeds, proving the Mac install kept the Linux packages

## 7. Integration checks

- [x] 7.1 Run `git status --short` and verify the change touches only `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `package-lock.json`, `.gitignore`, `Dockerfile`, `README.md`, `tests/README.md`, `docs/container-image.md`, `AGENTS.md`, and this change's artifacts (an untracked `.DS_Store` predates this change and is not part of it)
- [ ] 7.2 Run `pnpm test`; verify the unit, component, and integration suites pass from one installation

## Workflow follow-up

- Archive the change after the Mac verification in group 6 is confirmed, because that check cannot be completed from the Linux VM alone.
- Commit and push after archiving, per `AGENTS.md`.
