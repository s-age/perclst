---
name: services
description: Use this skill when creating or editing files in src/services/. Covers service design rules, import constraints, constructor patterns, logging conventions, and how to wire a new service into the DI container.
paths:
  - src/services/**
---

# Services Layer

Services are use-case orchestrators. Each service composes repository calls (and, when `src/domains/` is populated, domain logic) into a single named operation. They contain no I/O implementation and no storage logic.

## Files

- `src/services/sessionService.ts` — `SessionService`: session CRUD + status updates
- `src/services/agentService.ts` — `AgentService`: assemble `AgentRequest` from a `Session` and call the agent
- `src/services/analyzeService.ts` — `AnalyzeService`: load a session and read its Claude session file

## Import Rules

| May import | Must NOT import |
|---|---|
| `@src/repositories/*` (interfaces only) | `@src/infrastructures/*` |
| `@src/types/*` | `@src/cli/*` |
| `@src/errors/*` | other `@src/services/*` |
| `@src/utils/*` | |
| `@src/constants/*` | |

Services never depend on concrete implementations — only on repository port types (`type IXxx`).
Services never import each other; cross-service orchestration belongs in the CLI command layer.

## Class Conventions

- One class per file, named `<Domain>Service` (e.g. `SessionService`, `AgentService`)
- Constructor receives only repository interfaces and config providers — never infrastructure classes
- Config that is constant across calls (e.g. model, tokens) is read **once in the constructor** and stored as a private field; do not call `configProvider.load()` inside methods
- All constructor parameters that need to be called later are `private` fields

## Method Signatures

- Accept **domain objects** as parameters, not raw IDs, when the caller already holds the object
  - `run(session: Session, ...)` rather than `run(sessionId: string, ...)`
  - Use IDs only when the service itself is responsible for loading (e.g. `get(sessionId)`, `updateStatus(sessionId, ...)`)
- Return domain types from `@src/types/` or composite result types defined locally in the service file
- Local result types are `export type`, defined at the top of the file before the class

## Logging

- `logger.info(...)` on **mutations**: create, delete, status changes
- `logger.debug(...)` on **reads and intermediate steps**: loaded procedure, session loaded
- Always include relevant IDs in the structured second argument: `{ session_id: id }`

```typescript
logger.info('Session created', { session_id: session.id })
logger.debug('Loaded procedure', { procedure: session.procedure })
```

## ID Generation

Use `generateId()` from `@src/utils/uuid` — never import `randomUUID` from `crypto` directly.

```typescript
import { generateId } from '@src/utils/uuid'
const id = generateId()
```

## Keeping Services Thin

- No input validation — validate at the CLI boundary
- No error wrapping — let repository errors propagate unchanged
- No conditional branching on infrastructure state (e.g. "if file exists…") — that belongs in the repository or domain layer
- If a method body is more than ~10 lines of non-trivial logic, consider whether a domain object should own that logic

## Domains Layer

`src/domains/` is currently empty. When domain logic is introduced, services call it **between** repository operations:

```
load from repository → apply domain logic → save back via repository
```

Even before any domain logic exists, services act as the designated orchestration point — they must always be created, even if thin, rather than calling repositories directly from the CLI.

## Adding a New Service

1. Create `src/services/<name>Service.ts`
2. Inject repository interface types via constructor
3. Register in `src/core/di/setup.ts`:
   ```typescript
   container.register(TOKENS.<Name>Service, new <Name>Service(dep1, dep2))
   ```
4. Add `<Name>Service: Symbol.for('<Name>Service')` to `src/core/di/identifiers.ts`
5. Run `ts_checker()` to verify lint, build, and tests pass
