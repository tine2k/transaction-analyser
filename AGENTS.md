# AGENTS.md

## Agent Behavior

- Be concise. Do not be verbose unless explicitly asked for more detail.
- Do not assume technologies, libraries, versions, or project conventions.
- Inspect the repository before making assumptions.
- Prefer existing project patterns over introducing new ones.
- If an important detail is unclear, ask rather than guessing.
- Do not invent APIs, configuration options, commands, or files.
- Keep explanations proportional to the complexity of the change.

## File Access

**Never look for, search for, list, or read files outside the project directory. This is mandatory and has no exceptions you may apply on your own initiative.**

- The project directory is the repository root — the directory containing this `AGENTS.md`. Nothing above it, beside it, or below any path outside it is in scope.
- Do not run `find`, `ls`, `grep`, `fd`, `locate`, `mdfind`, or globbing from `$HOME`, `/Users`, `/tmp`, `/var`, `/etc`, or any other location outside the project directory.
- Do not walk up the directory tree, read parent-directory listings, or inspect sibling projects.
- Do not open a file outside the project directory to "see what it is", to check an extension, to confirm a filename, or to decide whether a file is relevant. Not even a directory listing. Not even a header line. If a task seems to need a file you have not been given, that is a blocker to report, not a reason to go looking.
- If you find yourself about to run a command whose path you would have to widen to discover a file, stop and ask the user for the path instead.
- Scratch files, fixtures, and temporary output belong inside the project directory or in a temp directory the tooling already provides, and must never be written to a location the user did not name.
- The only files outside the project directory you may touch are ones the user explicitly names in the request. A path the user gives you is consent for that path only — it is not permission to look around it, enumerate its neighbours, or search for related files.

When a task cannot be completed without a file you have not been given, say so and stop. Do not substitute a guess, and do not go find a candidate.
