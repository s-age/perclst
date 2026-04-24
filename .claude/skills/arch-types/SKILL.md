---
name: arch-types
description: "Required for any work in src/types/. Covers shared type placement rules, intra-layer imports, and the prohibition on importing other layers."
paths:
  - 'src/types/**/*.ts'
---

## Role

Holds **shared data types** for the codebase. Acts as a shared vocabulary layer — no logic, no I/O, no layer-specific concerns. Port types (`IXxx`) do **not** live here; they live in `ports/` subdirectories of the layer that consumes them (see `arch/SKILL.md`).

## Files

| File | Key types |
|------|-----------|
| `common.ts` | `ThinkingBlock`, `ToolUseRecord` |
| `session.ts` | `Session`, `CreateSessionParams`, `ResumeSessionParams`, `SweepFilter`, `ListFilter` |
| `claudeCode.ts` | `ClaudeAction` (union of `StartAction`/`ResumeAction`/`ForkAction`), `RawOutput` |
| `agent.ts` | `AgentResponse`, `AgentStreamEvent`, `ExecuteOptions`, `AgentRunOptions` |
| `config.ts` | `DisplayConfig`, `AgentLimitsConfig`, `Config` |
| `display.ts` | `DisplayOptions`, `TurnRow`, `RowFilter` |
| `analysis.ts` | `AnalyzeResult`, `ToolCall`, `ClaudeCodeTurn`, `AnalysisSummary`, `ClaudeSessionData` |
| `checker.ts` | `CheckerResult`, `CheckerOptions`, `RawCommandOutput`, `CommandResult` |
| `tsAnalysis.ts` | `TypeScriptAnalysis`, `SymbolInfo`, `ImportInfo`, `ExportInfo`, `ReferenceInfo` |
| `knowledgeSearch.ts` | `KnowledgeSearchOptions`, `KnowledgeSearchResult`, `KnowledgeMatch` |
| `testStrategy.ts` | `TestStrategyResult`, `FunctionStrategy`, `RawFunctionInfo`, `TestFramework` |
| `permissionPipe.ts` | `PermissionRequest`, `PermissionResult` |
| `shell.ts` | `ShellResult` |
| `pipeline.ts` | `Pipeline`, `PipelineTask`, `PipelineRunOptions`, `AgentPipelineTask` |

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
- Never define a port type (`IXxx`) here — port types belong in `src/repositories/ports/` or `src/domains/ports/`
