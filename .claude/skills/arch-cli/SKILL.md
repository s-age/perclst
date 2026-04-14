---
name: arch-cli
description: "Required for any work in src/cli/. Load before creating, editing, reviewing, or investigating files in this layer. Covers command registration, display logic, DI wiring, and commander v12 patterns."
paths:
  - 'src/cli/**/*.ts'
---

## Role

Registers commands via `commander` v12, resolves services from the DI container, delegates input validation to `src/validators/cli/`, and delegates all business logic to `src/services/`. `display.ts` owns all terminal output formatting.

## Files

| File | Role |
|------|------|
| `index.ts` | Calls `setupContainer()`, registers every command, calls `program.parse()` |
| `display.ts` | `printResponse()` — renders agent response in text or JSON |
| `commands/start.ts` | `start <task>` — creates and runs a new agent session |
| `commands/resume.ts` | `resume <session-id> <instruction>` — resumes an existing session |
| `commands/list.ts` | `list` — prints all sessions |
| `commands/show.ts` | `show <session-id>` — prints session metadata or full JSON |
| `commands/delete.ts` | `delete <session-id>` — removes a session |
| `commands/rename.ts` | `rename <session-id> <name>` — sets a display name |
| `commands/analyze.ts` | `analyze <session-id>` — analyzes a Claude Code jsonl session |
| `commands/import.ts` | `import <claude-session-id>` — imports a raw Claude Code session |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di` | `repositories`, `infrastructures` |

## Patterns

**Command handler** — resolve → validate → call → output → catch

```ts
// Good
export async function startCommand(task: string, options: RawStartOptions) {
  try {
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)
    const input = parseStartSession({ task, ...options })          // validate first
    const { sessionId, response } = await agentService.start(...)
    logger.print(`Session created: ${sessionId}`)
    printResponse(response, input, config.display, { sessionId })
  } catch (error) {
    if (error instanceof ValidationError) { logger.error(`Invalid arguments: ${error.message}`) }
    else if (error instanceof RateLimitError) { logger.error(`...`) }
    else { logger.error('Failed to start session', error as Error) }
    process.exit(1)
  }
}

// Bad — raw options used directly without validation, wrong output method
export async function startCommand(task: string, options: RawStartOptions) {
  const service = new AgentService()                    // direct instantiation
  await service.start(task, options.model)              // unvalidated options
  console.log('done')                                   // console.log
}
```

**`--output-only` flag** — implies all three `--silent-*` flags

```ts
// Good
const silentThoughts = opts.outputOnly || opts.silentThoughts

// Bad — treats outputOnly as a fourth independent flag
if (opts.outputOnly) { /* only hides one thing */ }
```

**commander v12 option naming** — kebab-case in `.option()` → camelCase in handler

```ts
// Good
.option('--allowed-tools <tools...>', '...')   // handler receives: options.allowedTools
.option('--output-only', '...')                // handler receives: options.outputOnly

// Bad
.option('--allowedTools <tools...>', '...')    // commander won't camelCase this correctly
```

## Prohibitions

- Never use `console.log` / `console.error` — always `logger.print()` / `logger.error()`
- Never import from `repositories/` or `infrastructures/` — route through a service
- Never skip `parseXxx()` — always validate raw `options.*` before passing to services
- Never call `setupContainer()` inside command handlers — it belongs only in `index.ts`
- Never instantiate services directly — use `container.resolve<T>(TOKENS.Xxx)`
