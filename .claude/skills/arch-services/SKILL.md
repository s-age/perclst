---
name: arch-services
description: "Required for any work in src/services/. Pass-through service rationale, import rules, orchestration patterns, and stable API surface contract."
paths:
  - 'src/services/**/*.ts'
---

## Role

Provides a **stable, uniform API surface** for the CLI layer. Services are the single layer that CLI always calls — regardless of whether the implementation requires cross-domain orchestration or a simple delegation to one domain. This uniformity is intentional: callers (CLI commands, code generators, agents) never need to decide whether to call a service, domain, or repository.

## Why Pass-Through Services Exist

A service that delegates directly to one domain (e.g. `SessionService`) is **not a smell** — it is load-bearing architecture:

- **Eliminates a decision**: callers always import from `services/`. They never need to ask "should I call the domain directly or the service?".
- **Stable under growth**: when a session operation later requires cross-domain coordination, only the service changes. CLI commands and tests are unaffected.
- **Uniform test seam**: tests that stub service behavior have one consistent boundary, whether the real implementation is 2 lines or 50.

## Files

| File | Role |
|------|------|
| `sessionService.ts` | Session CRUD — thin pass-through to `ISessionDomain` |
| `agentService.ts` | Agent execution — orchestrates `ISessionDomain` + `IAgentDomain`; turn-limit and context-token checks, graceful termination |
| `analyzeService.ts` | Session analysis — delegates to `IAnalyzeDomain` |
| `importService.ts` | Claude Code session import — coordinates `IImportDomain` + `ISessionDomain`; assembles the `Session` record |
| `abortService.ts` | Cancellation — wraps `AbortController`; provides `signal` and `abort()` to agent/pipeline callers |
| `checkerService.ts` | Code quality — thin pass-through to `ICheckerDomain` (lint/build/test) |
| `knowledgeSearchService.ts` | Knowledge base — delegates to `IKnowledgeSearchDomain`; search and draft-entry detection |
| `permissionPipeService.ts` | Tool permission IPC — delegates to `IPermissionPipeDomain`; poll, respond, askPermission |
| `pipelineFileService.ts` | Pipeline file I/O — delegates to `IPipelineFileDomain`; load, save, git diff, move-to-done |
| `pipelineService.ts` | Pipeline execution — orchestrates `IPipelineDomain` + `IScriptDomain`; async generator; retry/rejection routing; nested/child pipelines |
| `tsAnalysisService.ts` | TypeScript analysis — delegates to `ITsAnalysisDomain`; analyze, getReferences, getTypeDefinitions |
| `testStrategistService.ts` | Test strategy — thin pass-through to `ITestStrategyDomain` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `domains`, `types`, `errors`, `utils`, `constants` | `repositories`, `infrastructures` |

Services compose domain objects; they never reach into repositories or infrastructure directly.

## Patterns

**Thin service — intentional delegation**

```ts
// Good — SessionService is a pass-through by design, not an oversight
export class SessionService {
  constructor(private domain: ISessionDomain) {}

  async create(params: CreateSessionParams): Promise<Session> {
    return this.domain.create(params)   // single domain call, no logic added
  }
}

// Bad — bypassing the service from CLI because "it's just a pass-through"
// cli/commands/list.ts
const domain = container.get<ISessionDomain>(TOKENS.SessionDomain)  // NG: CLI must always use services
const sessions = await domain.list()
```

**Service with real orchestration**

```ts
// Good — AgentService coordinates two domains and adds limit-checking logic
export class AgentService {
  constructor(private sessionDomain: ISessionDomain, private agentDomain: IAgentDomain) {}

  async start(task: string, createParams: CreateSessionParams, options: AgentRunOptions = {}): Promise<StartResult> {
    const session = await this.sessionDomain.create(createParams)
    let response = await this.agentDomain.run(session, task, false, options)

    if (this.isLimitExceeded(response, options)) {
      response = await this.agentDomain.run(session, GRACEFUL_TERMINATION_PROMPT, true, options)
    }

    await this.sessionDomain.updateStatus(session.id, 'active')
    return { sessionId: session.id, response }
  }
}
```

## Prohibitions

- Never import from `repositories` or `infrastructures` — all data access must go through domain methods
- Never instantiate a domain class — receive injected domain interfaces via the constructor
- Never add validation logic that belongs in `validators/` — services receive already-validated inputs from CLI
- Never define port types (`IXxxService`) unless another layer needs to mock the service in tests; if needed, define in the same file as the class
- Never hold business logic (conditional rules, domain-specific constants, instruction-building) in the service layer — if a service method grows beyond pure orchestration, extract the logic to a new or existing domain and delegate to it
