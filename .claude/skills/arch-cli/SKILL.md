---
name: arch-cli
description: "Required for any work in src/cli/. Covers command registration, DI wiring, display output, and commander v12 patterns."
paths:
  - 'src/cli/**/*.ts'
---

When creating, editing, or reviewing any file in `src/cli/`:

- **Layer responsibility**: `index.ts` registers all `commander` v12 commands, calls `setupContainer()` once, then `program.parse()`. Command handlers resolve services via the DI container, delegate validation to `src/validators/cli/`, and forward business logic to `src/services/`. `display.ts` owns all terminal output (`printResponse`, `printStreamEvent`).
- **Import allowlist**: `validators`, `services`, `types`, `errors`, `utils`, `constants`, `core/di` — never `repositories` or `infrastructures`.

See [`references/commands.md`](./references/commands.md) for the full command-to-file map (21 commands + PipelineRunner components).

## Command handler — resolve → validate → call → output → catch

```ts
// Good
export async function startCommand(task: string, options: RawStartOptions): Promise<void> {
  try {
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)
    const input = parseStartSession({ task, ...options })          // validate first
    const { sessionId, response } = await agentService.start(...)
    stdout.print(`Session created: ${sessionId}`)
    printResponse(response, input, config.display, { sessionId })
  } catch (error) {
    if (error instanceof ValidationError) stderr.print(`Invalid arguments: ${error.message}`)
    else if (error instanceof RateLimitError) stderr.print(`Rate limit reached`)
    else stderr.print('Failed to start session', error as Error)
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

## `--output-only` implies all three `--silent-*` flags

```ts
// Good
const silentThoughts = opts.outputOnly || opts.silentThoughts
// Bad — treats outputOnly as a fourth independent flag
if (opts.outputOnly) { /* only hides one thing */ }
```

## `commander` v12 — kebab-case options → camelCase in handler

```ts
// Good
.option('--allowed-tools <tools...>', '...')   // handler receives: options.allowedTools
.option('--output-only', '...')                // handler receives: options.outputOnly
// Bad
.option('--allowedTools <tools...>', '...')    // commander won't auto-camelCase this
```

## Prohibitions

- Never `console.log` / `console.error` — use `stdout.print()` / `stderr.print()` from `@src/utils/output`
- Never import from `repositories/` or `infrastructures/` — route through a service
- Never pass raw `options.*` to services — always run through `parseXxx()` first
- Never call `setupContainer()` inside command handlers — it belongs only in `index.ts`
- Never instantiate services directly — use `container.resolve<T>(TOKENS.Xxx)`

## References

- [`references/commands.md`](./references/commands.md) — full command list and file roles
- [`references/split-component.md`](./references/split-component.md) — splitting `src/cli/components/` files into a `parts/` subdirectory
