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
| `agent.ts` | `AgentDomain` + `IAgentDomain` — runs a Claude CLI sub-agent via injected `IClaudeCodeRepository`; loads procedure system prompt from `repositories/procedures` |
| `session.ts` | `SessionDomain` + `ISessionDomain` — full CRUD for perclst sessions; calls repository functions in `repositories/sessions` directly |
| `import.ts` | `ImportDomain` + `IImportDomain` — resolves and validates Claude Code session paths; calls repository functions in `repositories/claudeSessions` directly |
| `analyze.ts` | `AnalyzeDomain` + `IAnalyzeDomain` — reads a Claude Code jsonl session; composes with `ISessionDomain` via constructor injection |
| `__tests__/agentDomain.test.ts` | Unit tests for `AgentDomain` — mocks `repositories/procedures`, injects a mock `IClaudeCodeRepository` |
| `__tests__/sessionDomain.test.ts` | Unit tests for `SessionDomain` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `repositories`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `infrastructures` |

Intra-domain imports are permitted: a domain class may accept another domain's port type (`IXxxDomain`) via constructor injection (see `AnalyzeDomain`).

## Patterns

**Style A — interface injection** (use when the repository is class-based with `IXxx`)

Port type placement rule: define in the same file as the implementing class. Move to `src/types/` only when multiple external layers must both import the type (see rule in `arch/SKILL.md`).

```ts
// Good — IClaudeCodeRepository is in src/types/claudeCode.ts because it bridges
// domains (caller) and infrastructures (implementor)
import type { IClaudeCodeRepository } from '@src/types/claudeCode'

export type IAgentDomain = {
  run(session: Session, instruction: string, isResume: boolean, options?: ExecuteOptions): Promise<AgentResponse>
}

export class AgentDomain implements IAgentDomain {
  constructor(
    private model: string,
    private claudeCodeRepo: IClaudeCodeRepository   // injected interface, not concrete class
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

**Port type placement** — always `src/types/`

All port types (`IXxx`) live in `src/types/`, co-located with related data types. Never define them in domain files.

```ts
// Good — ISessionDomain is defined in src/types/session.ts; import it here
import type { ISessionDomain, ISessionRepository } from '@src/types/session'
export class SessionDomain implements ISessionDomain { ... }

// Bad — defining the port type in the domain file
export type ISessionDomain = { ... }  // NG: belongs in src/types/session.ts
export class SessionDomain implements ISessionDomain { ... }
```

**Intra-domain composition** — inject another domain's port type, not the concrete class

```ts
// Good
import type { ISessionDomain } from '@src/domains/session'

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
- Never define a port type (`IXxx`) in a domain file — all port types belong in `src/types/`
- Never import a concrete repository class — inject the interface or call exported functions; never `new XxxRepository()` inside a domain
- Never call `services` — domains sit below services in the dependency chain
