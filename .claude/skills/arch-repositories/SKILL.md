---
name: arch-repositories
description: "Required for any work in src/repositories/. Load before creating, editing, reviewing, or investigating files in this layer. Covers atomic operation patterns, dual export style (class + functions), port type placement, and infrastructure adapter usage."
paths:
  - 'src/repositories/**/*.ts'
---

## Role

Wraps infrastructure adapters into atomic, domain-meaningful operations. Exposes either a class implementing a port type (`IXxxRepository`) or standalone exported functions — never raw Node.js I/O. The `ClaudeCodeRepository` in `infrastructures/claudeCode.ts` is a deliberate exception: its `dispatch()` interface is already atomic, so no separate repository wrapper exists for it.

## Files

| File | Role |
|------|------|
| `sessions.ts` | Atomic CRUD for perclst sessions — `saveSession`, `loadSession`, `existsSession`, `deleteSession`, `listSessions`, `getSessionPath`; also exports `SessionRepository` + `ISessionRepository` |
| `claudeSessions.ts` | Reads and parses Claude Code JSONL session files — `findEncodedDirBySessionId`, `decodeWorkingDir`, `validateSessionAtDir`, `readClaudeSession`; also exports `ClaudeSessionRepository` + `IClaudeSessionRepository` |
| `config.ts` | Config loading and path resolution — `loadConfig()`, `resolveSessionsDir()`, `resolveLogsDir()` (standalone functions only, no class) |
| `procedures.ts` | Procedure markdown loader — `loadProcedure()`, `procedureExists()`; also exports `ProcedureRepository` + `IProcedureRepository` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `infrastructures`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains` |

## Patterns

**Dual export style** — class wrapping standalone functions; callers can use either form

```ts
// Good — sessions.ts: class delegates to the same standalone functions
export type ISessionRepository = {
  save(session: Session): void
  load(sessionId: string): Session
  exists(sessionId: string): boolean
  delete(sessionId: string): Promise<void>
  list(): Session[]
}

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

**Functions-only repositories** — no class required when there is no injected state

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

**Port type placement** — always `src/types/`

All port types (`IXxx`) live in `src/types/`, co-located with related data types. Never define them in repository files.

```ts
// Good — ISessionRepository is defined in src/types/session.ts; import it here
import type { ISessionRepository } from '@src/types/session'
export class SessionRepository implements ISessionRepository { ... }

// Bad — defining the port type in the repository file
export type ISessionRepository = { ... }  // NG: belongs in src/types/session.ts
export class SessionRepository implements ISessionRepository { ... }
```

**Extend `fs.ts` when an operation is missing, do not bypass it**

`infrastructures/fs.ts` exposes JSON-centric helpers (`readJson`, `writeJson`, `fileExists`, `removeFile`, `listJsonFiles`, `ensureDir`). When a repository needs a text read or typed directory listing that `fs.ts` does not yet provide, add the wrapper to `fs.ts` first.

```ts
// Good — add readText() to fs.ts, then call it here
import { readText } from '@src/infrastructures/fs'
export function loadProcedure(name: string): string {
  return readText(join(PROCEDURES_DIR, `${name}.md`))
}

// Bad — importing readFileSync directly in a repository file (current state in
// procedures.ts and claudeSessions.ts — treat as technical debt, not a pattern to copy)
import { readFileSync } from 'fs'  // NG: bypasses the infrastructure adapter
```

## Prohibitions

- Never import from `cli`, `services`, or `domains` — the repository layer sits below all of them
- Never call raw Node.js `fs` functions (`readFileSync`, `writeFileSync`, `readdirSync`, etc.) when `infrastructures/fs` provides the equivalent; if `fs.ts` lacks the operation, extend it there first
- Never add business logic (validation, branching on domain rules, cross-entity orchestration) — keep every exported function atomic and mechanical
- Never instantiate a domain class — dependency flows downward only (`domains → repositories`, never the reverse)
- Never define a port type (`IXxx`) in a repository file — all port types belong in `src/types/`
- Never import from sibling repository files — each file is independent; shared utilities belong in `utils/` or `constants/`
