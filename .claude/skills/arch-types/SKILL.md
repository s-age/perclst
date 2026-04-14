---
name: arch-types
description: "Required for any work in src/types/. Load before creating, editing, reviewing, or investigating files in this layer. Covers shared type placement rules, intra-layer imports, port type bridging, and the prohibition on importing other layers."
paths:
  - 'src/types/**/*.ts'
---

## Role

Holds **all** data types and port interfaces (`IXxx`) for the codebase. Acts as a shared vocabulary layer — no logic, no I/O, no layer-specific concerns. Port types always live here regardless of how many layers reference them; this eliminates the decision of "where does this interface go?" entirely.

## Files

| File | Role |
|------|------|
| `common.ts` | `ThinkingBlock`, `ToolUseRecord` — low-level primitives shared across agent, infrastructure, and display logic |
| `session.ts` | Session data types + port interfaces: `Session`, `CreateSessionParams`, `ResumeSessionParams`, `ISessionRepository`, `ISessionDomain`, `IImportDomain` |
| `claudeCode.ts` | Claude CLI types + port interface: `ClaudeAction`, `RawOutput`, `IClaudeCodeRepository` |
| `agent.ts` | Agent types + port interfaces: `AgentResponse`, `ExecuteOptions`, `IAgentDomain`, `IProcedureRepository` |
| `config.ts` | `DisplayConfig`, `AgentLimitsConfig`, `Config` — configuration shape used across CLI, services, and repositories |
| `display.ts` | `DisplayOptions` — display flag set shared between CLI commands and display helpers |
| `analysis.ts` | Analysis types + port interfaces: `AnalyzeResult`, `ToolCall`, `ClaudeCodeTurn`, `AnalysisSummary`, `IClaudeSessionRepository`, `IAnalyzeDomain` |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| sibling `src/types/*.ts` files (intra-layer only) | `cli`, `validators`, `services`, `domains`, `repositories`, `infrastructures`, `errors`, `utils`, `constants`, `zod`, or any npm package |

Intra-layer imports are permitted to avoid duplication (e.g., `analysis.ts` imports `Session` from `session.ts`). There is no circular-dependency risk within this leaf layer.

## Patterns

**Intra-layer import** — reuse sibling type files rather than duplicating definitions

```ts
// Good — claudeCode.ts imports primitives from common.ts (both in src/types/)
import type { ThinkingBlock, ToolUseRecord } from './common.js'

export type RawOutput = {
  content: string
  thoughts: ThinkingBlock[]
  tool_history: ToolUseRecord[]
  usage: { input_tokens: number; output_tokens: number }
  message_count: number
}

// Bad — duplicating ThinkingBlock inline instead of importing from common.ts
export type RawOutput = {
  thoughts: Array<{ type: 'thinking'; thinking: string }>  // NG: duplicates common.ts
}
```

**Port types always live here** — no placement decision required

```ts
// Good — all IXxx interfaces belong in src/types/, co-located with related data types
// types/session.ts
export type ISessionRepository = { save(session: Session): void; ... }
export type ISessionDomain = { create(params: CreateSessionParams): Promise<Session>; ... }

// types/agent.ts
export type IAgentDomain = { run(session: Session, ...): Promise<AgentResponse> }
export type IProcedureRepository = { load(name: string): string; ... }

// Bad — defining a port type inside a domain or repository file
// src/domains/session.ts
export type ISessionDomain = { ... }  // NG: port types always go in src/types/
```

**`type` not `interface`** — consistent with the project-wide rule

```ts
// Good
export type Session = {
  id: string
  created_at: string
  metadata: { status: 'active' | 'completed' | 'failed'; tags: string[] }
}

// Bad
export interface Session {   // NG: use type, not interface
  id: string
}
```

## Prohibitions

- Never import from any other `src/` layer (`cli`, `services`, `domains`, `repositories`, `infrastructures`, `errors`, `utils`, `constants`)
- Never import `zod` or any npm package — this layer has zero runtime dependencies
- Never use `interface` — always use `type`
- Never add logic, helper functions, or constants — pure type declarations only
- Never define a port type (`IXxx`) outside of `src/types/` — all interfaces belong here, co-located with their related data types
