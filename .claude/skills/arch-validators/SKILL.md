---
name: arch-validators
description: "Required for any work in src/validators/. Load before creating, editing, reviewing, or investigating files in this layer. Covers Zod schema construction, rule functions, cli/ validator structure, and safeParse patterns."
paths:
  - 'src/validators/**/*.ts'
---

## Role

Owns all input validation for every entry point (CLI, MCP, etc.). Zod is confined entirely to this layer — no other layer may import it. Exposes typed `parseXxx()` functions that throw `ValidationError` on bad input, so callers never touch raw Zod types.

`validators/mcp/` files export Zod shape objects (`{ field: z.string() }`) consumed directly by `server.ts` for `server.tool()` registration. Unlike `cli/` validators, they do not use `safeParse()` or expose `parseXxx()` functions — the MCP SDK handles validation internally.

## Files

| File | Role |
|------|------|
| `schema.ts` | `schema()` builder + `safeParse()` — the only file that catches `ZodError` and converts to `ValidationError` |
| `rules/string.ts` | `stringRule(opts)` — `z.string()` with optional `required`/`min`/`max` |
| `rules/int.ts` | `intRule(opts)` — `z.coerce.number().int()` with optional `min`/`max` |
| `rules/stringArray.ts` | `stringArrayRule()` — `z.array(z.string())` |
| `rules/boolean.ts` | `booleanRule()` — `z.boolean()` |
| `rules/format.ts` | `formatRule()` — `z.enum(['text', 'json']).default('text')` |
| `cli/startSession.ts` | Validates `start` command options → `StartSessionInput` |
| `cli/resumeSession.ts` | Validates `resume` command options → `ResumeSessionInput` |
| `cli/showSession.ts` | Validates `show` command options → `ShowSessionInput` |
| `cli/deleteSession.ts` | Validates `delete` command options → `DeleteSessionInput` |
| `cli/renameSession.ts` | Validates `rename` command options → `RenameSessionInput` |
| `cli/analyzeSession.ts` | Validates `analyze` command options → `AnalyzeSessionInput` |
| `cli/importSession.ts` | Validates `import` command options → `ImportSessionInput` |
| `mcp/askPermission.ts` | Zod shape for `ask_permission` tool params |
| `mcp/tsAnalyze.ts` | Zod shape for `ts_analyze` tool params |
| `mcp/tsGetReferences.ts` | Zod shape for `ts_get_references` tool params |
| `mcp/tsGetTypes.ts` | Zod shape for `ts_get_types` tool params |
| `mcp/tsTestStrategist.ts` | Zod shape for `ts_test_strategist` tool params |
| `mcp/knowledgeSearch.ts` | Zod shape for `knowledge_search` tool params |
| `mcp/tsChecker.ts` | Zod shape for `ts_checker` tool params |

## Import Rules

| Sublayer | May import | Must NOT import |
|----------|-----------|----------------|
| `rules/*.ts` | `zod` only | all `src/` layers |
| `schema.ts` | `zod`, `errors` | all other `src/` layers |
| `cli/*.ts` | `../schema`, `../rules/*`, `types`, `errors`, `constants` | `cli`, `services`, `domains`, `repositories`, `infrastructures` |
| `mcp/*.ts` | `zod` only | all `src/` layers |

## Patterns

**Rule function** — return a Zod schema, never `z.ZodType`-annotate the return

```ts
// Good
import { z } from 'zod'

export function stringRule(opts: { required?: boolean; min?: number; max?: number } = {}) {
  let s = z.string()
  if (opts.required) s = s.min(1)
  if (opts.min !== undefined) s = s.min(opts.min)
  if (opts.max !== undefined) s = s.max(opts.max)
  return s
}

// Bad — annotating return type breaks inference and forces callers to cast
export function stringRule(): z.ZodString { ... }
```

**CLI validator** — `schema()` + named rules + `safeParse()` + export type from `._output`

```ts
// Good
import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { booleanRule } from '../rules/boolean'

const startSchema = schema({
  task: stringRule({ required: true }),
  model: stringRule().optional(),
  outputOnly: booleanRule().optional(),
})

export type StartSessionInput = typeof startSchema._output

export function parseStartSession(raw: unknown): StartSessionInput {
  return safeParse(startSchema, raw)
}

// Bad — constructing z.object() directly, using ZodError.errors (removed in Zod v4)
import { z } from 'zod'   // zod must not appear in cli/ files
const startSchema = z.object({ task: z.string() })
try { startSchema.parse(raw) } catch (e) { e.errors[0].message }  // .errors removed in v4
```

**`safeParse` error handling** — use `ZodError.issues`, not `.errors`

```ts
// Good  (in schema.ts)
if (error instanceof z.ZodError) {
  const message = error.issues
    .map((e) => `${e.path.join('.') || 'input'}: ${e.message}`)
    .join('; ')
  throw new ValidationError(message)
}

// Bad — .errors was removed in Zod v4; accessing it returns undefined silently
error.errors.map(...)
```

## Prohibitions

- Never import `zod` outside of `rules/`, `schema.ts`, and `mcp/*.ts` — not in `cli/`, not in other layers
- Never expose raw Zod types (`ZodSchema`, `ZodObject`, etc.) across the layer boundary — only the inferred `Input` type and the `parseXxx()` function are public
- Never catch `ZodError` in `cli/` files — that is `schema.ts`'s exclusive responsibility
- Never use `ZodError.errors` — it was removed in Zod v4; always use `ZodError.issues`
- Never add a new entry-point's validators directly into `cli/` — use a sibling subdirectory (e.g., `validators/mcp/`) to keep entry points separated
- Never import from `services`, `domains`, `repositories`, or `infrastructures` — the validators layer sits above all business logic
