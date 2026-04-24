# Infrastructure Layer — Code Patterns

## Stateless function adapter (`fs.ts` style)

One export per Node.js call; no class, no state.

```ts
// Good — one Node.js call per function; generic enough to serve any repository
import { existsSync, readFileSync } from 'fs'
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

## Async generator for streaming (`claudeCode.ts` style)

Yield raw stdout lines; never collect-then-parse. Side effects (temp files, process teardown) stay inside the generator's `finally`.

```ts
// Good — yields raw stdout lines; no parsing; temp-file lifecycle self-contained
export async function* runClaude(
  args: string[],
  prompt: string,
  workingDir: string
): AsyncGenerator<string> {
  const mcpConfigPath = join(tmpdir(), `${APP_NAME}-mcp-${process.pid}.json`)
  writeFileSync(mcpConfigPath, mcpConfig, 'utf-8')
  const fullArgs = [...args, '--mcp-config', mcpConfigPath]
  const child = spawn('claude', fullArgs, { cwd: workingDir, stdio: ['pipe', 'pipe', 'pipe'] })
  child.stdin.write(prompt, 'utf-8')
  child.stdin.end()
  let buffer = ''
  try {
    for await (const chunk of child.stdout) {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) yield line
      }
    }
    if (buffer.trim()) yield buffer
  } finally {
    if (child.exitCode === null && !child.killed) child.kill()
    try { unlinkSync(mcpConfigPath) } catch { /* ignore */ }
  }
}

// Bad — collecting all stdout and parsing inside the adapter
export async function runClaude(...): Promise<RawOutput> {
  // collects all stdout, then calls parseStreamJson() here — NG: shaping belongs in repos
}

// Bad — exposing infrastructure details (temp file path) to the caller
// agentRepository.ts
writeFileSync(mcpConfigPath, buildMcpConfig(), 'utf-8')  // NG: raw fs in repository
args.push('--mcp-config', mcpConfigPath)                 // NG: infrastructure detail leaking up
```

## Singleton class for stateful handles (`tsAnalyzer.ts` style)

Use a class only when a resource handle must persist. Expose the raw handle; all extraction goes in `repositories/parsers/`.

```ts
// Good — manages Project singleton; exposes raw SourceFile handle
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
