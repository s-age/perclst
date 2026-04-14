---
name: arch-types
description: "Required for any work in src/types/. Load before creating, editing, reviewing, or investigating files in this layer. Covers shared type placement rules, intra-layer imports, port type bridging, and the prohibition on importing other layers."
paths:
  - 'src/types/**/*.ts'
---

## Role

Holds data types and port interfaces that are referenced by two or more layers. Acts as a shared vocabulary layer — no logic, no I/O, no layer-specific concerns. Every type here must be genuinely cross-layer; single-layer types stay in the file that owns them.

## Files

| File | Role |
|------|------|
| `common.ts` | `ThinkingBlock`, `ToolUseRecord` — low-level primitives shared across agent, infrastructure, and display logic |
| `session.ts` | `Session`, `CreateSessionParams`, `ResumeSessionParams` — core session data shapes used by domains, repositories, services, and CLI |
| `claudeCode.ts` | `StartAction`, `ResumeAction`, `ClaudeAction`, `RawOutput`, `IClaudeCodeRepository` — the port type bridging `domains/` (caller) and `infrastructures/` (implementor) |
| `agent.ts` | `AgentResponse` — shaped output returned from the agent layer; used by services and CLI |
| `config.ts` | `DisplayConfig`, `AgentLimitsConfig`, `Config` — configuration shape used across CLI, services, and repositories |
| `display.ts` | `DisplayOptions` — display flag set shared between CLI commands and display helpers |
| `analysis.ts` | `AnalyzeResult`, `ToolCall`, `ClaudeCodeTurn`, `AnalysisSummary` — analysis output types used by domains, services, and CLI |

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

**Port type for bridging two layers** — define in `src/types/` when caller and implementor are in different layers

```ts
// Good — IClaudeCodeRepository: domains/ calls it, infrastructures/ implements it
// → lives in src/types/claudeCode.ts alongside the related data types
export type IClaudeCodeRepository = {
  dispatch(action: ClaudeAction): Promise<RawOutput>
}

// Bad — defining a port type here when only one layer ever uses it
// src/types/sessionDomain.ts  ← NG: ISessionDomain is only used within domains/
//                                   define it in src/domains/session.ts instead
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
- Never add a type that is only used by a single layer — it belongs in that layer's own file
- Never use `interface` — always use `type`
- Never add logic, helper functions, or constants — pure type declarations only
- Never define a port type (`IXxx`) here when both the caller and the implementor are in the same layer — place it in the same file as the implementing class
