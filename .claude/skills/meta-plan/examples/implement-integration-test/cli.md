# CLI Layer

## `src/cli/commands/__tests__/e2e/helpers.ts` (new)
**Template**: `src/cli/commands/__tests__/helpers.ts`

Shared factory functions for E2E tests.

**Exports**:
```ts
export function makeResultLines(text: string): string[]
export function buildClaudeCodeStub(lines: string[]): ClaudeCodeInfra
export function makeTmpDir(): { dir: string; cleanup: () => void }
export function buildTestConfig(sessionsDir: string, overrides?: Partial<Config>): Config
```

**Implementation sketch**:
```ts
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { vi } from 'vitest'
import type { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import type { Config } from '@src/types/config'

export function makeResultLines(text: string): string[] {
  return [
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }], usage: { input_tokens: 10, output_tokens: 5 } } }),
    JSON.stringify({ type: 'result', result: text, usage: { input_tokens: 10, output_tokens: 5 } })
  ]
}

export function buildClaudeCodeStub(lines: string[]): ClaudeCodeInfra {
  const runClaude = vi.fn(async function* (): AsyncGenerator<string> {
    for (const line of lines) yield line
  })
  return {
    resolveJsonlPath: vi.fn(() => '/dev/null'),
    readJsonlContent: vi.fn(() => ''),
    buildArgs: vi.fn(() => ['-p']),
    runClaude,
    spawnInteractive: vi.fn(),
    writeStderr: vi.fn()
  } as unknown as ClaudeCodeInfra
}

export function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'perclst-e2e-'))
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

export function buildTestConfig(sessionsDir: string, overrides?: Partial<Config>): Config {
  return { model: 'claude-sonnet-4-6', sessions_dir: sessionsDir, ...overrides }
}
```

## `src/cli/commands/__tests__/e2e/start.e2e.test.ts` (new)
**Template**: `src/cli/commands/__tests__/resume.integration.test.ts`

**Test structure**:
```ts
vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('startCommand (E2E)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    ({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  describe('happy path', () => {
    it('creates a session JSON file in tmpdir', async () => { ... })
    it('sets session.metadata.status to active', async () => { ... })
    it('passes the task as prompt to runClaude', async () => { ... })
    it('stores the procedure option in the session', async () => { ... })
  })

  describe('error path', () => {
    it('calls process.exit(1) when runClaude throws', async () => { ... })
  })
})
```

**Notes**:
- `runClaude` signature: `(args, prompt, workingDir, sessionFilePath?, signal?): AsyncGenerator<string>`
- Argument validation edge cases are covered by unit tests (`start.test.ts`); E2E only tests the happy data-flow path

## `src/cli/commands/__tests__/e2e/resume.e2e.test.ts` (new)
**Template**: `src/cli/commands/__tests__/e2e/start.e2e.test.ts`

**Test structure**:
```ts
describe('resumeCommand (E2E)', () => {
  let dir: string
  let sessionId: string

  beforeEach(async () => {
    // 1. makeTmpDir
    // 2. startCommand to create a real session
    // 3. extract sessionId from the created JSON filename
  })

  describe('happy path', () => {
    it('session file still exists after resume', async () => { ... })
    it('passes action.type === "resume" to buildArgs', async () => { ... })
    it('passes the instruction as prompt to runClaude', async () => { ... })
  })

  describe('error path', () => {
    it('calls process.exit(1) for a nonexistent sessionId', async () => { ... })
  })
})
```

**Notes**:
- `buildArgs` stub returns `['-p']` fixed; verify resume action via `buildArgs.mock.calls[0][0].type === 'resume'`, not via `runClaude`'s first arg
- Re-call `setupContainer` in each test case to swap the stub between start and resume phases
