# arch-repositories: Pattern Examples

## Dual export style

Class wraps standalone functions; callers can use either form.

```ts
// Good — sessions.ts: class delegates to standalone functions; port imported from ports/
import type { ISessionRepository } from '@src/repositories/ports/session'

export class SessionRepository implements ISessionRepository {
  constructor(private sessionsDir: string) {}
  save(session: Session): void { saveSession(this.sessionsDir, session) }
  load(sessionId: string): Session { return loadSession(this.sessionsDir, sessionId) }
}

export function saveSession(sessionsDir: string, session: Session): void {
  ensureDir(sessionsDir)
  writeJson(getSessionPath(sessionsDir, session.id), session)  // infrastructure adapter
}

// Bad — repository calling raw Node.js fs directly
import { writeFileSync } from 'fs'  // NG: raw I/O belongs in infrastructures/
export function saveSession(sessionsDir: string, session: Session): void {
  writeFileSync(path, JSON.stringify(session))
}
```

## Functions-only repositories

No class required when there is no injected state.

```ts
// Good — config.ts: pure functions, no class
export function loadConfig(): Config {
  const localConfig = loadFromPath(join(`./${CONFIG_DIR_NAME}`, 'config.json'))
  const globalConfig = loadFromPath(join(homedir(), CONFIG_DIR_NAME, 'config.json'))
  return { ...DEFAULT_CONFIG, ...globalConfig, ...localConfig }
}

// Bad — wrapping stateless functions in a class for no reason
export class ConfigRepository {
  load(): Config { return loadConfig() }  // NG: unnecessary class overhead
}
```

## Port type placement

`IXxx` types belong in `src/repositories/ports/`, never in the implementation file.

```ts
// Good — ISessionRepository is defined in src/repositories/ports/session.ts; import it
import type { ISessionRepository } from '@src/repositories/ports/session'
export class SessionRepository implements ISessionRepository { ... }

// Bad — defining the port type in the repository implementation file
export type ISessionRepository = { ... }  // NG: belongs in src/repositories/ports/session.ts
export class SessionRepository implements ISessionRepository { ... }
```

## Incremental stream parse

Process `AsyncGenerator` lines incrementally; never buffer all lines.

```ts
// Good — agentRepository.ts: incremental parse state, no line buffer
import { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import { createParseState, processLine, finalizeParseState, emitStreamEvents }
  from '@src/repositories/parsers/claudeCodeParser'

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  private infra = new ClaudeCodeInfra()

  async dispatch(
    action: ClaudeAction,
    onStreamEvent?: (event: AgentStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<RawOutput> {
    const state = createParseState()
    const toolNameMap = new Map<string, string>()
    for await (const line of this.infra.runClaude(args, action.prompt, action.workingDir, action.sessionFilePath, signal)) {
      processLine(state, line)
      if (onStreamEvent) emitStreamEvents(line, toolNameMap, onStreamEvent)
    }
    return finalizeParseState(state, jsonlBaseline)
  }
}

// Bad — buffering all lines before parsing; unbounded memory growth
const lines: string[] = []
for await (const line of this.infra.runClaude(...)) {
  lines.push(line)  // NG: holds entire stdout in memory until stream ends
}
return parseStreamEvents(lines, jsonlBaseline)
```

## Extend `fs.ts` before bypassing it

`infrastructures/fs.ts` exposes JSON/text helpers. Add any missing operations there first.

```ts
// Good — add readText() to fs.ts, then call it from the repository
import { readText } from '@src/infrastructures/fs'
export function loadProcedure(name: string): string {
  return readText(join(PROCEDURES_DIR, `${name}.md`))
}

// Bad — importing readFileSync directly in a repository file
import { readFileSync } from 'fs'  // NG: bypasses the infrastructure adapter
```
