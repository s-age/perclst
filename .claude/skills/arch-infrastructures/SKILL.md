---
name: arch-infrastructures
description: "Required for any work in src/infrastructures/. Load before creating, editing, reviewing, or investigating files in this layer. Covers raw I/O adapter patterns, stateless function vs. class form, process/stream yielding, and the no-shaping rule."
paths:
  - 'src/infrastructures/**/*.ts'
---

## Role

The lowest layer — the only place that may import Node.js I/O built-ins (`fs`, `fs/promises`, `child_process`, `os`, `path`). Provides raw adapters that repositories compose into atomic operations. Contains no business logic and **no data shaping**: every adapter yields or returns raw output exactly as it arrives from the underlying system; all conversion into typed domain values happens in `repositories/parsers/`.

> **`utils` vs `infrastructures`**: Non-I/O built-ins used as pure-function equivalents (e.g. `crypto.randomUUID`) belong in `utils`, not here. Only built-ins that perform file, process, or network I/O go in `infrastructures`.

## Files

| File | Role |
|------|------|
| `fs.ts` | Filesystem adapter — wraps Node.js `fs`/`fs/promises` and `os` into typed helpers: `readJson`, `writeJson`, `fileExists`, `removeFile`, `listJsonFiles`, `ensureDir`, `homeDir` |
| `claudeCode.ts` | Claude CLI adapter — spawns `claude -p` via `child_process.spawn`, builds CLI args from a `ClaudeAction` discriminated union, yields raw stdout lines as `AsyncGenerator<string>`; no parsing |
| `tsAnalyzer.ts` | ts-morph adapter — manages the `Project` singleton; exposes `getSourceFile(filePath): SourceFile` (the I/O boundary); extraction logic lives entirely in `repositories/parsers/` |

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

**Yield raw output, never parse** — `claudeCode.ts` style: yield raw lines for the repository to convert

The infrastructure adapter's only job is I/O. Parsing and shaping belong in `repositories/parsers/`.

```ts
// Good — runClaude yields raw stdout lines; no parsing here
export async function* runClaude(
  args: string[],
  prompt: string,
  workingDir: string
): AsyncGenerator<string> {
  const child = spawn('claude', args, { cwd: workingDir, stdio: ['pipe', 'pipe', 'pipe'] })
  child.stdin.write(prompt, 'utf-8')
  child.stdin.end()
  let buffer = ''
  for await (const chunk of child.stdout) {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) yield line
    }
  }
  if (buffer.trim()) yield buffer
}

// Bad — parsing inside the infrastructure adapter
export async function runClaude(...): Promise<RawOutput> {
  // collects all stdout, then calls parseStreamJson() here — NG: shaping belongs in repos
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

**ts-morph adapter** — expose `SourceFile` handles; let the repository do the extraction

`TsAnalyzer` manages the `Project` singleton (the I/O boundary) and exposes raw `SourceFile` handles. All symbol extraction happens in `repositories/parsers/tsAnalysisParser.ts`.

```ts
// Good — tsAnalyzer.ts just loads and exposes the SourceFile
export class TsAnalyzer {
  private project = new Project({ tsConfigFilePath: 'tsconfig.json' })

  getSourceFile(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath)  // I/O boundary
  }
}

// Bad — calling extraction helpers inside the infrastructure adapter
import { extractSymbols } from './parsers/tsSymbolExtractor'  // NG: extraction belongs in repositories/parsers/
analyzeFile(filePath: string): TypeScriptAnalysis {
  const sf = this.project.addSourceFileAtPath(filePath)
  return { symbols: extractSymbols(sf), ... }  // NG: shaping here
}
```

## Prohibitions

- Never import from `cli`, `services`, `domains`, or `repositories` — this layer has no upward dependencies
- Never add business logic (session validation, domain branching, cross-entity rules) — every function is a mechanical translation between application types and system calls
- Never shape output data — converting raw output (stdout lines, `SourceFile` nodes, file bytes) into typed domain values belongs in `repositories/parsers/`
- Never define a port type (`IXxx`) — port types consumed by `domains/` belong in `repositories/ports/`; shared data types belong in `src/types/`
- Never call raw Node.js I/O (`fs`, `child_process`, etc.) from any layer above this one — extend this layer's adapters instead
- Never add a domain-specific method to a general adapter (`readSession()` on `fs.ts`, `startSession()` on `claudeCode.ts`) — keep adapters generic; atomic operations belong in `repositories/`
- Never create a `parsers/` subdirectory inside `infrastructures/` — all parsing helpers live in `repositories/parsers/`
