---
name: test-integration
description: Patterns and conventions for writing *.integration.test.ts files for CLI commands. Load when creating or editing integration test files under src/cli/commands/__tests__/integration/. Covers DI stub strategy, file placement, mock setup, and Vitest isolation requirements. For the full agent-driven workflow use procedures/test-integration/implement.md.
paths:
  - src/cli/commands/__tests__/integration/**/*.ts
---

## File placement

Integration tests for CLI commands live at:

```
src/cli/commands/__tests__/integration/<command>.integration.test.ts
```

One file per command. Do not merge multiple commands into a single file.

## Vitest worker isolation (required)

**1 file = 1 Vitest worker process.**

`setupContainer` mutates a container singleton. If workers are shared across files (`--singleThread`, `--pool=vmThreads`), one file's `setupContainer` call contaminates another file's tests. Keep the default `isolate: true` — never add configuration that breaks per-file isolation.

## Standard mock set

Every integration test file opens with the same three module mocks:

```ts
vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
```

Add command-specific display mocks below these (e.g. `vi.mock('@src/cli/view/listDisplay')`). Do **not** mock service classes (`SessionService`, `AgentService`, etc.) — they run against the real filesystem via the tmp directory.

## beforeEach / afterEach

```ts
let dir: string
let cleanup: () => void

beforeEach(() => {
  vi.clearAllMocks()
  ;({ dir, cleanup } = makeTmpDir())
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
```

## DI wiring

Always call `setupContainer` inside each `it` (or in `beforeEach` for the shared stub case), never at module scope:

```ts
const stub = buildClaudeCodeStub(makeResultLines('done'))
setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })
```

For pure session-management commands that never call the Claude agent, omit `infras`:

```ts
setupContainer({ config: buildTestConfig(dir) })
```

## Prerequisite session (commands that take sessionId)

Commands that accept a `sessionId` argument need an existing session. Create it in `beforeEach` using a separate stub before the per-test setup:

```ts
beforeEach(async () => {
  vi.clearAllMocks()
  ;({ dir, cleanup } = makeTmpDir())
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

  const startStub = buildClaudeCodeStub(makeResultLines('started'))
  setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
  await startCommand('initial task', { outputOnly: true })

  const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
  sessionId = file.replace('.json', '')
})
```

## Error path stub

For agent-wrapping commands, use `makeThrowingStub` to simulate errors from `runClaude`:

```ts
function makeThrowingStub(err: Error): ReturnType<typeof buildClaudeCodeStub> {
  const stub = buildClaudeCodeStub([])
  ;(stub.runClaude as ReturnType<typeof vi.fn>).mockImplementation(
    async function* (): AsyncGenerator<string> {
      yield* [] as string[]
      throw err
    }
  )
  return stub
}
```

## Standard error cases

Cover only the error types the command actually catches:

| Error | exit | stderr output |
|---|---|---|
| Generic `Error` | `1` | `'Failed to <verb> session'` + error object |
| `UserCancelledError` | `0` | `'Cancelled.'` |
| `ValidationError('msg')` | `1` | `'Invalid arguments: msg'` |
| `RateLimitError('2026-12-31')` | `1` | `'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'` |
| `RateLimitError()` | `1` | `'Claude usage limit reached. Please wait and try again.'` |

Nonexistent `sessionId`: resolves to `process.exit(1)`.

## What NOT to do

- Never call `ts_test_strategist` — test cases come from `plans/cli-integration-tests.md`
- Never mock service classes — services must run through the full DI stack
- Never use `--singleThread` or share workers across files
- Never use `it.skip` or `@ts-ignore` to silence failures
- One assertion per `it` block — do not bundle multiple behaviors

## Full agent workflow

To write a new integration test file from scratch, use the procedure:

```bash
perclst start "Write integration tests for <command> command" \
  --procedure test-integration/implement \
  --output-only
```
