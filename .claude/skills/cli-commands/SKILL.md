---
name: cli-commands
description: Use this skill when working with CLI command implementations, display output, or anything in src/cli/. Covers start, resume, list, show, delete commands and the printTurn display layer.
paths:
  - src/cli/**
---

# CLI Commands

## Files
- `src/cli/index.ts` — Commander.js program definition and option wiring
- `src/cli/display.ts` — `printTurn()`, `DisplayOptions`, color helpers
- `src/cli/commands/start.ts` — `startCommand`: create session → execute → print
- `src/cli/commands/resume.ts` — `resumeCommand`: add user turn → execute → print
- `src/cli/commands/list.ts` — `listCommand`: list sessions with preview
- `src/cli/commands/show.ts` — `showCommand`: full session detail (text or JSON)
- `src/cli/commands/delete.ts` — `deleteCommand`: delete session by ID

## Display Options

```typescript
DisplayOptions {
  silentThoughts?: boolean       // hide thinking blocks
  silentToolResponse?: boolean   // hide tool call details
  silentUsage?: boolean          // hide token usage
  outputOnly?: boolean           // implies all silent flags (for agent use)
}
```

`--output-only` is the recommended flag when invoking perclst from within an agent.

## Adding a New Command

1. Create `src/cli/commands/<name>.ts` and export an async function
2. Import and wire it in `src/cli/index.ts` with `program.command(...).action(...)`

## Color System
- Header color defaults to `#D97757` (Claude orange), configurable via `display.header_color`
- Respects `NO_COLOR` env var and `display.no_color` config flag
- `hexToAnsi()` converts `#RRGGBB` to ANSI truecolor escape sequences
