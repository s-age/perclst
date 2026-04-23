# Plan: `perclst summarize` command

## Goal

`perclst summarize [--like <pattern>] [--label <value>] [--format text|json]`

Aggregate statistics across filtered sessions and print a single summary row.

Filters are the same semantics as `list`: `--like` is a case-sensitive substring match on `session.name`; `--label` filters sessions that carry that exact label. Without either flag, all sessions are included.

**Output columns (text table):**

| Sessions | Turns | Tool Calls | Tokens In | Tokens Out | Cache Read | Cache Creation |
|----------|-------|------------|-----------|------------|------------|----------------|
| 12 | 45 | 234 | 1 200 000 | 45 000 | 800 000 | 50 000 |

**JSON output** (`--format json`): a single object with the same fields as numeric values.

> Token figures are emitted as-is from the existing `claudeSessionRepo.readSession()` logic.
> Known accuracy concerns are tracked for a separate investigation session — do not fix here.

---

## Layer Ownership

| Change | Layer |
|--------|-------|
| New type `SessionSummaryStats` | `src/types/analysis.ts` |
| New port method `summarize` on `IAnalyzeDomain` | `src/domains/ports/analysis.ts` |
| Implementation `AnalyzeDomain.summarize()` | `src/domains/analyze.ts` |
| Pass-through `AnalyzeService.summarize()` | `src/services/analyzeService.ts` |
| Validator `parseSummarizeSessions` | `src/validators/cli/summarizeSessions.ts` |
| Command `summarizeCommand` | `src/cli/commands/summarize.ts` |
| Register `.command('summarize')` | `src/cli/index.ts` |

---

## Files

### 1. `src/types/analysis.ts` (modify)

Add:

```ts
export type SessionSummaryStats = {
  sessions: number
  turns: number
  toolCalls: number
  tokens: {
    totalInput: number
    totalOutput: number
    totalCacheRead: number
    totalCacheCreation: number
  }
}
```

### 2. `src/domains/ports/analysis.ts` (modify)

Add import for `SessionSummaryStats` and `ListFilter`, then add method to `IAnalyzeDomain`:

```ts
import type { ListFilter } from '@src/types/session'
import type { ..., SessionSummaryStats } from '@src/types/analysis'

export type IAnalyzeDomain = {
  analyze(sessionId: string): Promise<AnalyzeResult>
  getRewindTurns(sessionId: string): Promise<RewindTurn[]>
  formatTurns(turns: ClaudeCodeTurn[], filter: RowFilter): TurnRow[]
  summarize(filter: ListFilter): Promise<SessionSummaryStats>
}
```

### 3. `src/domains/analyze.ts` (modify)

Add `summarize` to `AnalyzeDomain`. Iterates the filtered session list, calls
`claudeSessionRepo.readSession()` for each, and accumulates.

```ts
async summarize(filter: ListFilter): Promise<SessionSummaryStats> {
  const sessions = await this.sessionDomain.list(filter)

  let turns = 0
  let toolCalls = 0
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheCreation = 0

  for (const session of sessions) {
    const effectiveId = session.rewind_source_claude_session_id ?? session.claude_session_id
    const data = this.claudeSessionRepo.readSession(effectiveId, session.working_dir, session.rewind_to_message_id)
    const { turnsBreakdown, tokens } = buildSummaryStatsFromData(data)
    turns     += turnsBreakdown.userInstructions
    toolCalls += turnsBreakdown.toolCalls
    totalInput          += tokens.totalInput
    totalOutput         += tokens.totalOutput
    totalCacheRead      += tokens.totalCacheRead
    totalCacheCreation  += tokens.totalCacheCreation
  }

  return {
    sessions: sessions.length,
    turns,
    toolCalls,
    tokens: { totalInput, totalOutput, totalCacheRead, totalCacheCreation }
  }
}
```

> Note: `buildSummaryStats` currently takes `ClaudeCodeTurn[]`; the `summarize` implementation
> can call `buildSummaryStats(data.turns)` and use its `turnsBreakdown`, plus `data.tokens`
> directly — no new helper needed.

### 4. `src/services/analyzeService.ts` (modify)

Add pass-through:

```ts
async summarize(filter: ListFilter): Promise<SessionSummaryStats> {
  return this.domain.summarize(filter)
}
```

Also add the necessary imports (`ListFilter`, `SessionSummaryStats`).

### 5. `src/validators/cli/summarizeSessions.ts` (new)

Template: `src/validators/cli/listSessions.ts`.

```ts
import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const summarizeSchema = schema({
  label:  stringRule().optional(),
  like:   stringRule().optional(),
  format: stringRule().optional()
})

export type SummarizeSessionsInput = typeof summarizeSchema._output

export function parseSummarizeSessions(raw: unknown): SummarizeSessionsInput {
  return safeParse(summarizeSchema, raw)
}
```

### 6. `src/cli/commands/summarize.ts` (new)

Template: `src/cli/commands/list.ts`.

```ts
import Table from 'cli-table3'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { parseSummarizeSessions } from '@src/validators/cli/summarizeSessions'

type RawSummarizeOptions = {
  label?:  string
  like?:   string
  format?: string
}

export async function summarizeCommand(options: RawSummarizeOptions): Promise<void> {
  try {
    const input = parseSummarizeSessions(options)
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const stats = await analyzeService.summarize({
      label: input.label,
      like:  input.like
    })

    if (input.format === 'json') {
      stdout.print(JSON.stringify(stats, null, 2))
      return
    }

    const table = new Table({
      head: ['Sessions', 'Turns', 'Tool Calls', 'Tokens In', 'Tokens Out', 'Cache Read', 'Cache Creation'],
      style: { head: [], border: [] }
    })

    table.push([
      stats.sessions,
      stats.turns,
      stats.toolCalls,
      stats.tokens.totalInput,
      stats.tokens.totalOutput,
      stats.tokens.totalCacheRead,
      stats.tokens.totalCacheCreation
    ])

    stdout.print(table.toString())
  } catch (error) {
    stderr.print('Failed to summarize sessions', error as Error)
    process.exit(1)
  }
}
```

### 7. `src/cli/index.ts` (modify)

Add import and register the command in the same style as `list`:

```ts
import { summarizeCommand } from './commands/summarize'

program
  .command('summarize')
  .description('Aggregate statistics across sessions')
  .option('--like <pattern>', 'Filter sessions by name substring')
  .option('--label <value>', 'Filter sessions by label')
  .option('--format <fmt>', 'Output format: text (default) or json', 'text')
  .action((options) => summarizeCommand(options))
```

---

## Verification (v1 — superseded)

After all files: `ts_checker()` — must return `{ ok: true }`.

Additionally, smoke-test manually:
```bash
perclst summarize
perclst summarize --like "review"
perclst summarize --label lint
perclst summarize --format json
```

---

## Supplemental Notes (added after codebase survey)

### 1. `buildSummaryStats` does NOT return `tokens` — use `data.tokens` directly

`buildSummaryStats(turns)` returns `{ turnsBreakdown, toolUses }` only.
Token totals come from `readSession()`'s return value (`ClaudeSessionData.tokens`), which is already the pre-summed `{ totalInput, totalOutput, totalCacheRead, totalCacheCreation }` object.
The plan's note in Step 3 is correct, but easy to misread.
Concrete pattern used in `analyze()` today:

```ts
const { turns, tokens } = this.claudeSessionRepo.readSession(...)
const { turnsBreakdown } = buildSummaryStats(turns)
// use tokens.totalInput etc. directly — no further summing
```

In `summarize()` the same applies per-session; accumulate `data.tokens.*` into running totals.

---

### 2. `readSession` is synchronous and throws on a missing JSONL file

`IClaudeSessionRepository.readSession` is **not async** — no `await` needed.
It throws `Error: Claude Code session file not found: <path>` when the underlying
`.jsonl` has been deleted from `~/.claude/projects/`.

If any session in the filtered list has a missing JSONL (e.g. after a Claude Code
`/clear-history`), the whole loop will abort with an unhandled error.
**Decision point for the implementer**: crash-and-report (current approach in `analyze`) vs.
skip-and-warn (preferable for a bulk aggregation that may span many sessions).
If skipping is chosen, catch the error per iteration and track a `skipped` counter to
surface in the output.

---

### 3. Use `formatRule()` in the validator — not `stringRule().optional()`

The plan's Step 5 uses:

```ts
format: stringRule().optional()
```

Every other format-bearing validator (`analyzeSession.ts`, `startSession.ts`, …) uses:

```ts
import { formatRule } from '../rules/format'
// ...
format: formatRule()   // z.enum(['text', 'json']).default('text')
```

`formatRule()` enforces the enum at parse time (invalid values throw `ValidationError`),
and provides the `'text'` default so `input.format` is always `'text' | 'json'` — never
`string | undefined`.  Using `stringRule().optional()` silently accepts `--format csv`
and makes the type wider than necessary.

Also remove the `.option('--format <fmt>', ..., 'text')` commander default when switching
to `formatRule()` — the Zod default already covers it (though leaving the commander
default is harmless).

---

### 4. `IAnalyzeDomain` port needs two new imports

Current `src/domains/ports/analysis.ts` only imports from `@src/types/analysis` and
`@src/types/display`.  Adding `summarize(filter: ListFilter)` requires:

```ts
import type { ListFilter } from '@src/types/session'        // ← new
import type { ..., SessionSummaryStats } from '@src/types/analysis'  // extend existing line
```

Both `@src/types/session` and `@src/types/analysis` are permitted imports for the
`domains/ports/` sublayer.

---

### 5. No new DI token or container wiring needed

`TOKENS.AnalyzeService` already exists in `src/core/di/identifiers.ts` (line 19).
`AnalyzeService` is already registered in the DI setup.
Adding the `summarize` method to the class and its interface is enough — no change to
`identifiers.ts` or `src/core/di/setup.ts`.

---

### 6. Token number formatting — consider `toLocaleString()`

`analyze.ts` uses `.toLocaleString()` when printing token counts (e.g. `1,200,000`).
The plan's `table.push([...stats.tokens.totalInput...])` emits raw integers.
For consistency and readability at scale, apply `.toLocaleString()` to the four token
columns in the text-table path (JSON output should stay raw numeric).

---

### 7. Empty-session edge case

When no sessions match the filter, `sessions.length === 0`.  The loop produces all-zero
stats, which is valid JSON but confusing as a text table.  Consider outputting
`'No sessions found'` (same string used in `list.ts`) instead of an all-zero row.

---

## v2 Redesign

**Motivation**: v1 aggregated all matching sessions into a single row. The intended output is
one row per session — a stats-enriched version of `list`.

### Design change

| | v1 | v2 |
|---|---|---|
| Return type | `SessionSummaryStats` (aggregate) | `SessionSummaryRow[]` (per-session) |
| `sessions` field | count of matched sessions | removed |
| `name` / `id` fields | absent | added (for display) |
| CLI table | 1 row | 1 row per session |

### New type (`src/types/analysis.ts`)

Replace `SessionSummaryStats` with `SessionSummaryRow`:

```ts
export type SessionSummaryRow = {
  name: string
  id: string
  turns: number
  toolCalls: number
  tokens: {
    totalInput: number
    totalOutput: number
    totalCacheRead: number
    totalCacheCreation: number
  }
}
```

`name` is `session.name ?? session.id`.

### Updated signatures

```ts
// IAnalyzeDomain (src/domains/ports/analysis.ts)
summarize(filter: ListFilter): Promise<SessionSummaryRow[]>

// AnalyzeDomain (src/domains/analyze.ts)
async summarize(filter: ListFilter): Promise<SessionSummaryRow[]>

// AnalyzeService (src/services/analyzeService.ts)
async summarize(filter: ListFilter): Promise<SessionSummaryRow[]>
```

### Updated domain implementation (`src/domains/analyze.ts`)

```ts
async summarize(filter: ListFilter): Promise<SessionSummaryRow[]> {
  const sessions = await this.sessionDomain.list(filter)
  const rows: SessionSummaryRow[] = []

  for (const session of sessions) {
    try {
      const effectiveId = session.rewind_source_claude_session_id ?? session.claude_session_id
      const data = this.claudeSessionRepo.readSession(effectiveId, session.working_dir, session.rewind_to_message_id)
      const { turnsBreakdown } = buildSummaryStats(data.turns)
      rows.push({
        name: session.name ?? session.id,
        id: session.id,
        turns: turnsBreakdown.userInstructions,
        toolCalls: turnsBreakdown.toolCalls,
        tokens: data.tokens
      })
    } catch {
      // skip sessions with missing JSONL files
    }
  }

  return rows
}
```

### Updated CLI (`src/cli/commands/summarize.ts`)

Table columns: `['Name', 'Turns', 'Tool Calls', 'Tokens In', 'Tokens Out', 'Cache Read', 'Cache Creation']`

One row per `SessionSummaryRow`. Token columns use `.toLocaleString()` in text path; JSON path outputs the raw array.

Empty case: `rows.length === 0` → print `'No sessions found'`.

### Files to change (v2)

| File | Change |
|------|--------|
| `src/types/analysis.ts` | Replace `SessionSummaryStats` with `SessionSummaryRow` |
| `src/domains/ports/analysis.ts` | Update import + return type |
| `src/domains/analyze.ts` | Rewrite `summarize()` to return `SessionSummaryRow[]` |
| `src/services/analyzeService.ts` | Update import + return type |
| `src/cli/commands/summarize.ts` | Redesign display: one row per session |

`src/validators/cli/summarizeSessions.ts` — no change needed.
