# AGENTS.md

## Current state

Greenfield. This repo has **no source code, no package manifest, and no git repo** — only OpenSpec scaffolding. There is no build, lint, typecheck, or test command to run; do not invent one.

## OpenSpec is the workflow

All work goes through the spec-driven OpenSpec workflow (CLI 1.13.2, schema `spec-driven`: proposal → specs → design → tasks). Slash commands live in `.opencode/commands/`:

- `/opsx-explore` — think through an idea, writes no artifacts
- `/opsx-propose` — create a change and all planning artifacts
- `/opsx-apply` — implement a proposed change
- `/opsx-update` — revise existing planning artifacts
- `/opsx-sync` — merge delta specs into `openspec/specs/` without archiving
- `/opsx-archive` — archive a finished change and update main specs

**Planning boundary (hard rule):** `/opsx-propose` authorizes planning only. Do not edit code or begin implementing in the same response, even when the original request said to build or fix something. Present the artifacts, stop, and wait for a separate request to `/opsx-apply`.

## Layout

- `openspec/config.yaml` — schema plus the `context` field injected into every proposal
- `openspec/specs/` — main specs, one directory per capability (currently empty)
- `openspec/changes/` — in-flight changes; `openspec/changes/archive/` — completed ones
- `.opencode/` — generated commands and skills. Its `.gitignore` excludes `node_modules`, `package.json`, `package-lock.json`, `bun.lock`: the CLI is installed locally, so don't commit those

## Commands

```bash
openspec list --json                             # read .root to confirm the root resolves
openspec context                                 # resolved root + declared references
openspec status --change <name> --json           # artifact completion and requires edges
openspec instructions <artifact> --change <name> --json
openspec validate --all --strict
openspec archive <name>                          # --skip-specs for infra/tooling/doc-only
```

- `openspec list --json` exits non-zero when there is no OpenSpec root. That is the answer, not a broken CLI — read the JSON instead of retrying or working around it.
- Build the required artifact set from the `requires` edges in `status --json`, not from `status` values. `status` is file-existence only, so `tasks` can read `done` while `specs` was never written.
- `design.md` is conditional and may be skipped. `specs` may only be skipped when `status` reports `skipped` (via `skip_specs`), never by your own judgment.
- Re-read dependency artifacts from disk before writing a dependent one; the user may have edited them mid-session.

## Project context

`openspec/config.yaml` sets `schema: spec-driven`, and its `context:` field is commented out and empty. OpenSpec injects that field into every artifact, so while it is empty, proposals are generated with no project background. Record the stack and domain conventions there as they get decided.

## Not yet recorded

- **Stack:** none chosen yet. Confirm before assuming a language or build system, and record the decision in `context` above.
- **Domain:** what transaction-analyser consumes and produces is undefined. Ask rather than inferring it from the repo name.
