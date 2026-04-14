---
name: arch-infrastructures
description: "Required for any work in src/infrastructures/. Load before creating, editing, reviewing, or investigating files in this layer. Covers raw I/O adapter patterns, stateless function vs. class form, port type placement, and process/stream handling."
paths:
  - 'src/infrastructures/**/*.ts'
---

## Role

The lowest layer — the only place that may import Node.js I/O built-ins (`fs`, `fs/promises`, `child_process`, `os`, `path`). Provides raw adapters that repositories compose into atomic operations. Contains no business logic; every function is a mechanical translation between application types and the underlying system call.

> **`utils` vs `infrastructures`**: Non-I/O built-ins used as pure-function equivalents (e.g. `crypto.randomUUID`) belong in `utils`, not here. Only built-ins that perform file, process, or network I/O go in `infrastructures`.

## Files

| File | Role |
|------|------|
| `fs.ts` | Filesystem adapter — wraps Node.js `fs`/`fs/promises` and `os` into typed helpers: `readJson`, `writeJson`, `fileExists`, `removeFile`, `listJsonFiles`, `ensureDir`, `homeDir` |
| `claudeCode.ts` | Claude CLI adapter — spawns `claude -p` via `child_process.spawn`, builds CLI args from a `ClaudeAction` discriminated union, parses stream-json output into `RawOutput`; exports `ClaudeCodeRepository` implementing `IClaudeCodeRepository` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains`, `repositories` |

Node.js built-in modules (`fs`, `fs/promises`, `child_process`, `os`, `path`, `url`) are permitted exclusively in this layer.

## Patterns

**Stateless function adapter** — `fs.ts` style: wrap one Node.js call per export, no class, no state

```ts
// Good — one Node.js call per function; generic enough to serve any repository
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function removeFile(path: string): Promise<void> {
  return unlink(path)
}

// Bad — embedding domain knowledge (session structure) inside the adapter
export function readSession(path: string): Session {
  const s = JSON.parse(readFileSync(path, 'utf-8')) as Session
  if (!s.id) throw new SessionNotFoundError(s.id)  // NG: validation belongs in repositories/
  return s
}
```

**Class adapter implementing a port type** — `claudeCode.ts` style: one class, one port type in `src/types/`

The port type lives in `src/types/` (not in this file) because it bridges two layers: domains call it, infrastructures implement it.

```ts
// Good — IClaudeCodeRepository is in src/types/claudeCode.ts; class just implements it
import type { ClaudeAction, RawOutput, IClaudeCodeRepository } from '@src/types/claudeCode'

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  async dispatch(action: ClaudeAction): Promise<RawOutput> {
    const args = ['-p', '--output-format', 'stream-json', '--verbose']
    if (action.type === 'resume') {
      args.push('--resume', action.sessionId)
    } else {
      args.push('--session-id', action.sessionId)
      if (action.system) args.push('--system-prompt', action.system)
    }
    return runClaude(args, action.prompt, action.workingDir, ...)
  }
}

// Bad — splitting the adapter into separate start/resume methods instead of using
// a discriminated union; forces callers to know which method to call
export class ClaudeCodeRepository {
  async start(sessionId: string, prompt: string): Promise<RawOutput> { ... }
  async resume(sessionId: string, prompt: string): Promise<RawOutput> { ... }
  // NG: start/resume distinction is handled by ClaudeAction.type — the adapter
  //     chooses CLI args from it; callers always call dispatch()
}
```

**Stream output parsing** — translate raw process stdout into typed output; keep it in the infrastructure

```ts
// Good — parseStreamJson() is pure format translation: stream-json lines → RawOutput
function parseStreamJson(raw: string, jsonlBaseline: number): RawOutput {
  for (const line of raw.split('\n')) {
    const event = JSON.parse(line.trim()) as StreamEvent
    if (event.type === 'result') finalContent = event.result ?? ''
    // ...
  }
  return { content: finalContent, thoughts, tool_history, usage, message_count }
}

// Bad — interpreting the parsed content to make a business decision
function parseStreamJson(raw: string): RawOutput {
  const output = /* parse */
  if (output.content.includes('rate limit')) throw new RateLimitError()  // NG: error detection
  // belongs here only if it reads a machine-readable exit code, not free-form text
  return output
}
```

**Temp-file setup/teardown** — infrastructure-level side effects (MCP config) stay inside the adapter, invisible to callers

```ts
// Good — write temp file before spawn, delete in finally; caller sees only dispatch()
const mcpConfigPath = join(tmpdir(), `${APP_NAME}-mcp-${process.pid}.json`)
writeFileSync(mcpConfigPath, buildMcpConfig(), 'utf-8')
try {
  return await runClaude(args, prompt, workingDir, ...)
} finally {
  try { unlinkSync(mcpConfigPath) } catch { /* ignore */ }
}

// Bad — exposing temp file path or MCP setup to the caller
async dispatch(action: ClaudeAction, mcpConfigPath: string): Promise<RawOutput> { ... }
// NG: caller should never need to know about MCP config files
```

## Prohibitions

- Never import from `cli`, `services`, `domains`, or `repositories` — this layer has no upward dependencies
- Never add business logic (session validation, domain branching, cross-entity rules) — every function is a mechanical translation between application types and system calls
- Never define a port type (`IXxx`) in this file when it bridges two layers — port types that callers in `domains/` depend on belong in `src/types/`
- Never call raw Node.js I/O (`fs`, `child_process`, etc.) from any layer above this one — extend this layer's adapters instead
- Never add a domain-specific method to a general adapter (`readSession()` on `fs.ts`, `startSession()` on `claudeCode.ts`) — keep adapters generic; atomic operations belong in `repositories/`
