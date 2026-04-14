---
name: arch-domains
description: "Required for any work in src/domains/. Load before creating, editing, reviewing, or investigating files in this layer. Covers business rule ownership, port type placement, two injection styles (interface vs. scalar), and intra-domain composition."
paths:
  - 'src/domains/**/*.ts'
---

## Role

Owns all business rules — session lifecycle, agent execution, import resolution, and analysis. Calls repository functions or holds injected repository interfaces; never touches raw I/O (files, processes, APIs) directly.

## Files

| File | Role |
|------|------|
| `agent.ts` | `AgentDomain` — runs a Claude CLI sub-agent via injected `IClaudeCodeRepository`; loads procedure system prompt via injected `IProcedureRepository` |
| `session.ts` | `SessionDomain` — full CRUD for perclst sessions; calls repository functions in `repositories/sessions` directly |
| `import.ts` | `ImportDomain` — resolves and validates Claude Code session paths via injected `IClaudeSessionRepository` |
| `analyze.ts` | `AnalyzeDomain` — reads a Claude Code jsonl session; composes with `ISessionDomain` via constructor injection |
| `ports/session.ts` | `ISessionDomain`, `IImportDomain` — port contracts consumed by `services/` |
| `ports/agent.ts` | `IAgentDomain` — port contract consumed by `services/` |
| `ports/analysis.ts` | `IAnalyzeDomain` — port contract consumed by `services/` |
| `__tests__/agentDomain.test.ts` | Unit tests for `AgentDomain` — mocks `repositories/ports/agent`, injects a mock `IClaudeCodeRepository` |
| `__tests__/sessionDomain.test.ts` | Unit tests for `SessionDomain` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `domains/ports` (intra), `repositories/ports`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `infrastructures` |

Intra-domain imports are permitted: a domain class may accept another domain's port type from `domains/ports/` via constructor injection (see `AnalyzeDomain`).

## Patterns

**Style A — interface injection** (use when the repository is class-based with `IXxx`)

```ts
// Good — implement own port type from domains/ports/; inject repository port from repositories/ports/
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { IProcedureRepository } from '@src/repositories/ports/agent'
import type { IClaudeCodeRepository } from '@src/types/claudeCode'

export class AgentDomain implements IAgentDomain {
  constructor(
    private model: string,
    private claudeCodeRepo: IClaudeCodeRepository,  // injected interface, not concrete class
    private procedureRepo: IProcedureRepository
  ) {}

  async run(...): Promise<AgentResponse> {
    const raw = await this.claudeCodeRepo.dispatch({ type: 'start', ... })
    ...
  }
}

// Bad — importing the concrete class directly couples domain to infrastructure
import { ClaudeCodeRepository } from '@src/repositories/claudeCodeRepository'

export class AgentDomain {
  private claudeCodeRepo = new ClaudeCodeRepository()   // NG: direct instantiation
}
```

**Style B — function-based repository calls** (use when the repository exposes plain functions)

```ts
// Good — call repository functions directly; no interface needed
import { saveSession, loadSession } from '@src/repositories/sessions'

export class SessionDomain implements ISessionDomain {
  constructor(private sessionsDir: string) {}

  async get(sessionId: string): Promise<Session> {
    return loadSession(this.sessionsDir, sessionId)
  }
}

// Bad — importing the infrastructure module directly, bypassing the repository
import { readFileSync } from 'fs'   // NG: raw I/O belongs in infrastructures/
```

**Port type placement** — `domains/ports/` for domain ports, `repositories/ports/` for repository ports

```ts
// Good — implement own port from domains/ports/; consume repository port from repositories/ports/
import type { ISessionDomain } from '@src/domains/ports/session'
import type { ISessionRepository } from '@src/repositories/ports/session'
export class SessionDomain implements ISessionDomain { ... }

// Bad — defining the port type in the domain implementation file
export type ISessionDomain = { ... }  // NG: belongs in src/domains/ports/session.ts
export class SessionDomain implements ISessionDomain { ... }
```

**Intra-domain composition** — inject another domain's port type from `domains/ports/`, not the concrete class

```ts
// Good
import type { ISessionDomain } from '@src/domains/ports/session'

export class AnalyzeDomain implements IAnalyzeDomain {
  constructor(private sessionDomain: ISessionDomain) {}   // port type, not SessionDomain
}

// Bad
import { SessionDomain } from '@src/domains/session'

export class AnalyzeDomain {
  private sessionDomain = new SessionDomain('/path')   // NG: direct instantiation
}
```

## Prohibitions

- Never import from `cli`, `services`, or `infrastructures` — `infrastructures` access must go through `repositories`
- Never import `zod` — validation is the validators layer's exclusive responsibility
- Never access the file system, spawn processes, or call external APIs directly — delegate to repository functions or injected repository interfaces
- Never define a port type (`IXxx`) in a domain implementation file — domain ports belong in `src/domains/ports/`, repository ports in `src/repositories/ports/`
- Never import a concrete repository class — inject the interface or call exported functions; never `new XxxRepository()` inside a domain
- Never call `services` — domains sit below services in the dependency chain
