# CLI index.ts Split Pattern

**Type:** Discovery

## Context

Applies when adding new CLI commands to perclst or reviewing the CLI entry-point
structure. Relevant for understanding how `src/cli/index.ts` is organized and why.

## What is true

`src/cli/index.ts` was split into three files to prevent unbounded growth:

- `src/cli/index.ts` — entry point only: `setupContainer`, create `program`, call
  register functions, `program.parse`
- `src/cli/agentCommands.ts` — commands that spawn Claude (start, resume, chat, fork,
  inspect, curate, survey, retrieve, run, forge, review)
- `src/cli/sessionCommands.ts` — local session management commands (list, show, analyze,
  summarize, rename, tag, delete, sweep, import, rewind)

Each register file uses private per-group sub-functions (e.g. `registerStartCommand`,
`registerInteractiveCommands`, `registerKnowledgeCommands`) to stay under the ESLint
`max-lines-per-function` limit.

The ESLint rule is `{ max: 50, skipBlankLines: true, skipComments: true }`. Blank lines
do **not** count against the limit. A single long commander chain (start or resume)
takes ~22–28 non-blank lines, so a function can hold 1–2 long registrations before
hitting the limit.

## Do

- Add new agent-spawning commands to `agentCommands.ts`.
- Add new session-management commands to `sessionCommands.ts`.
- Extract each logical group of registrations into its own `register*` sub-function.

## Don't

- Don't add new commands directly to `index.ts` — it is an entry point only.
- Don't count blank lines when estimating whether a function will exceed the 50-line limit.

---

**Keywords:** cli, index.ts, agentCommands, sessionCommands, commander, max-lines-per-function, ESLint, register pattern, code split, entry point
