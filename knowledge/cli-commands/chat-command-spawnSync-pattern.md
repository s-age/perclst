# chat command: spawnSync directly in CLI layer

**Type:** Discovery

## Context

When a CLI command's sole job is to hand off the terminal to another process with no domain logic, the question arises whether to wrap the OS call in an infrastructure class or call it directly.

## What happened / What is true

The `chat` command calls `spawnSync('claude', ['--resume', id], { stdio: 'inherit' })` directly in `src/cli/commands/chat.ts` with no infrastructure wrapper.

This is acceptable because:
- It is a pure OS hand-off — one line, no branching, no domain logic
- There is no testable behavior to isolate (the process replaces the terminal)
- A `ChatInfra` wrapper would add indirection with zero benefit

## Do

- Call `spawnSync` directly in the CLI command file when the call is a one-liner with no testable logic
- Use `{ stdio: 'inherit' }` to fully pass the terminal to the child process

## Don't

- Don't create an infrastructure wrapper for trivial OS hand-offs
- Don't wrap in an async function unnecessarily; `spawnSync` is synchronous by design here

---

**Keywords:** spawnSync, chat, cli, infrastructure, terminal, hand-off, child_process
