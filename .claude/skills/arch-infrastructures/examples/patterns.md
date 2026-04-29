# Infrastructure Layer — Code Patterns

## DI class adapter (`fs.ts` style)

Each adapter is a class with methods wrapping Node.js calls. Registered in `setupInfrastructures.ts` for DI. No bare function exports.

```ts
// Good — class adapter; each method wraps one Node.js call; generic enough to serve any repository
import { existsSync, readFileSync } from 'fs'
import { unlink } from 'fs/promises'

export class FsInfra {
  readJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  }

  fileExists(path: string): boolean {
    return existsSync(path)
  }

  removeFile(path: string): Promise<void> {
    return unlink(path)
  }
}

// Bad — bare function export; can't be injected/mocked via DI container
export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

// Bad — embedding domain knowledge (session structure) inside the adapter
export class SessionFs {
  readSession(path: string): Session {
    const s = JSON.parse(readFileSync(path, 'utf-8')) as Session
    if (!s.id) throw new SessionNotFoundError(s.id)  // NG: validation belongs in repositories/
    return s
  }
}
```

## Async generator for streaming (`claudeCode.ts` style)

Yield raw stdout lines; never collect-then-parse. Side effects (temp files, process teardown) stay inside the generator's `finally`.

```ts
// Good — yields raw stdout lines; no parsing; temp-file lifecycle self-contained
export class ClaudeCodeInfra {
  async *runClaude(
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
}

// Bad — collecting all stdout and parsing inside the adapter
export class ClaudeCodeInfra {
  async runClaude(...): Promise<RawOutput> {
    // collects all stdout, then calls parseStreamJson() here — NG: shaping belongs in repos
  }
}
```

## Stateful handle (`tsAnalyzer.ts` style)

Use a private field when a resource handle must persist. Expose the raw handle; all extraction goes in `repositories/parsers/`.

```ts
// Good — manages Project singleton; exposes raw SourceFile handle
export class TsAnalyzer {
  private project = new Project({ tsConfigFilePath: 'tsconfig.json' })

  getSourceFile(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath)  // I/O boundary
  }
}

// Bad — calling extraction helpers inside the infrastructure adapter
export class TsAnalyzer {
  analyzeFile(filePath: string): TypeScriptAnalysis {
    const sf = this.project.addSourceFileAtPath(filePath)
    return { symbols: extractSymbols(sf), ... }  // NG: shaping here
  }
}
```
