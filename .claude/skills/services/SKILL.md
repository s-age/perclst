---
name: services
description: Use this skill when creating or editing files in src/services/. Covers service design rules, import constraints, constructor patterns, logging conventions, and how to wire a new service into the DI container.
paths:
  - src/services/**
---

# Services Layer

Services are use-case orchestrators. Each service composes **domain object calls** into a single named operation. They contain no I/O implementation, no storage logic, and no business logic — that belongs in `src/domains/`.

## Layer Responsibilities

```
cli → services (use-case orchestration)
              ↓ DI
           domains (business logic + repository access)
              ↓ DI
           repositories (interfaces)
              ↓
           infrastructures (implementations)
```

- **services**: Orchestrate use-cases by calling domain objects in order. No logic of their own.
- **domains**: Own business logic and are injected with repository interfaces.
- Services must never directly inject repository interfaces — that is the domain's responsibility.

## Files

- `src/services/sessionService.ts` — `SessionService`: session lifecycle orchestration
- `src/services/agentService.ts` — `AgentService`: agent execution orchestration
- `src/services/analyzeService.ts` — `AnalyzeService`: session analysis orchestration

## Import Rules

| May import                         | Must NOT import          |
| ---------------------------------- | ------------------------ |
| `@src/domains/*` (interfaces only) | `@src/repositories/*`    |
| `@src/types/*`                     | `@src/infrastructures/*` |
| `@src/errors/*`                    | `@src/cli/*`             |
| `@src/utils/*`                     | other `@src/services/*`  |
| `@src/constants/*`                 |                          |

Services never depend on concrete implementations — only on domain interfaces (`type IXxx`).
Services never import each other; cross-service orchestration belongs in the CLI command layer.

## Class Conventions

- One class per file, named `<Domain>Service` (e.g. `SessionService`, `AgentService`)
- Constructor receives only **domain interfaces** — never repository interfaces or infrastructure classes
- All constructor parameters that need to be called later are `private` fields

## Method Signatures

- Accept **domain objects** as parameters, not raw IDs, when the caller already holds the object
  - `run(session: Session, ...)` rather than `run(sessionId: string, ...)`
  - Use IDs only when the service itself is responsible for loading (e.g. `get(sessionId)`, `updateStatus(sessionId, ...)`)
- Return domain types from `@src/types/` or re-export result types from `@src/domains/*`

## Keeping Services Thin

- No business logic — methods should delegate directly to a domain call
- No input validation — validate at the CLI boundary
- No error wrapping — let domain errors propagate unchanged
- No direct calls to Node.js APIs (e.g. `process.cwd()`, `fs.*`) — that belongs in infrastructures or domains

## Adding a New Service

1. Ensure the corresponding domain object exists in `src/domains/`
2. Create `src/services/<name>Service.ts` — inject the domain interface via constructor
3. Register in `src/core/di/setup.ts`:
   ```typescript
   container.register(TOKENS.<Name>Service, new <Name>Service(nameDomain))
   ```
4. Add `<Name>Service: Symbol.for('<Name>Service')` to `src/core/di/identifiers.ts`
5. Run `ts_checker()` to verify lint, build, and tests pass
