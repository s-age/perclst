---
name: test-integration
description: Patterns and conventions for writing *.integration.test.ts files. Covers DI stub strategy (infra-layer only), file placement, mock setup, and Vitest isolation requirements. Applies to CLI commands and MCP tools. For the full agent-driven workflow use procedures/test-integration/implement.md.
paths:
  - src/**/*.integration.test.ts
---

## Stub boundary

**Stub only the infra layer.** Inject I/O stubs via `setupContainer({ infras: {...} })` so that Service → Domain → Repository real code executes end-to-end.

```ts
setupContainer({
  config: buildTestConfig(dir),
  infras: { claudeCodeInfra: stub, gitInfra: buildGitInfraStub() }
})
```

Never mock service or domain classes — doing so skips the code paths under test and creates coverage gaps. See `examples/service-level-stub-exception.md` for the narrow cases where service-level stubs are permitted.

## File placement

```
src/cli/commands/__tests__/integration/<command>.integration.test.ts
src/mcp/tools/__tests__/integration/<tool>.integration.test.ts
```

One file per command / tool. Do not merge multiple into a single file.

## Vitest worker isolation (required)

**1 file = 1 Vitest worker process.**

`setupContainer` mutates a container singleton. If workers are shared across files (`--singleThread`, `--pool=vmThreads`), one file's `setupContainer` call contaminates another file's tests. Keep the default `isolate: true` — never add configuration that breaks per-file isolation.

## Standard mock set

### CLI commands

```ts
vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
```

Add command-specific display mocks below these (e.g. `vi.mock('@src/cli/view/listDisplay')`).

### MCP tools

MCP tools do not go through the CLI output/prompt layer, so the above mocks are unnecessary. DI wiring alone is sufficient.

## beforeEach / afterEach

### CLI commands

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

### MCP tools

```ts
let dir: string
let cleanup: () => void

beforeEach(() => {
  vi.clearAllMocks()
  ;({ dir, cleanup } = makeTmpDir())
  setupContainer({ config: buildTestConfig(dir) })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
```

No `process.exit` spy needed. MCP tools either throw exceptions or return results in `content[0].text`.

## DI wiring

Always call `setupContainer` inside each `it` (or in `beforeEach` for the shared stub case), never at module scope:

```ts
const stub = buildClaudeCodeStub(makeResultLines('done'))
setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })
```

For pure session-management commands or MCP tools that never call the Claude agent, omit `infras`:

```ts
setupContainer({ config: buildTestConfig(dir) })
```

## Prerequisite session (CLI commands that take sessionId)

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

## Error path stub (CLI commands)

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

## Standard error cases (CLI commands)

Cover only the error types the command actually catches:

| Error | exit | stderr output |
|---|---|---|
| Generic `Error` | `1` | `'Failed to <verb> session'` + error object |
| `UserCancelledError` | `0` | `'Cancelled.'` |
| `ValidationError('msg')` | `1` | `'Invalid arguments: msg'` |
| `RateLimitError('2026-12-31')` | `1` | `'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'` |
| `RateLimitError()` | `1` | `'Claude usage limit reached. Please wait and try again.'` |

Nonexistent `sessionId`: resolves to `process.exit(1)`.

## MCP tool response validation

MCP tools return `{ content: [{ type: 'text', text: string }] }`. Parse `text` as JSON and assert on the result:

```ts
const result = await executeTsChecker({ project_root: dir })
const parsed = JSON.parse(result.content[0].text) as CheckerResult
expect(parsed.ok).toBe(true)
```

## What NOT to do

- Never mock service or domain classes — services must run through the full DI stack
- Never call `ts_test_strategist` — test cases come from `plans/cli-integration-tests.md`
- Never call `ts_call_graph` — the mock boundary is fixed (infra layer only) and already known
- Never use `--singleThread` or share workers across files
- Never use `it.skip` or `@ts-ignore` to silence failures
- One assertion per `it` block — do not bundle multiple behaviors; use `try/catch` to drive commands past a mocked `process.exit` throw when the assertion is about a side effect, not the exit itself

## Full agent workflow

To write a new integration test file from scratch, use the procedure:

```bash
perclst start "Write integration tests for <command> command" \
  --procedure test-integration/implement \
  --output-only
```
