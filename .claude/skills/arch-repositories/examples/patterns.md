# arch-repositories: Pattern Examples

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
