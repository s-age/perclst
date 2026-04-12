---
name: procedure
description: Use this skill when working with procedures, system prompts, or anything in src/lib/procedure/ or the procedures/ directory. Covers ProcedureLoader and how to add new procedure files.
paths:
  - src/lib/procedure/**
  - procedures/**
---

# Procedure System

## Files
- `src/lib/procedure/loader.ts` — `ProcedureLoader`: loads `.md` files from the `procedures/` directory
- `procedures/*.md` — system prompt definitions (default, conductor, analyzer)

## How It Works

`ProcedureLoader` resolves the `procedures/` directory relative to the compiled output:
```
dist/lib/procedure/loader.js → ../../../procedures/
```

`load(name)` reads `procedures/<name>.md` and returns its content as a string, which is passed to `ClaudeCLI` as the system prompt.

## Adding a New Procedure

1. Create `procedures/<name>.md` with the desired system prompt content
2. Use it via `perclst start "task" --procedure <name>`

## Built-in Procedures
- `default` — general-purpose assistant
- `conductor` — complex task orchestration
- `analyzer` — code analysis (expects access to ts_* MCP tools)
