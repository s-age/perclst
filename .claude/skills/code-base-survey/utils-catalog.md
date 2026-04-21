# Utils Catalog

Pure functions and library wrappers. No I/O — all side-effectful operations belong in `infrastructures/`.

> **Freshness**: Generated from `src/utils/`. If a function is missing, run `ts_analyze` on the relevant file.

---

## `src/utils/date.ts` — dayjs wrapper

| Function | Signature | Returns |
|---|---|---|
| `now` | `()` | `Dayjs` — current time |
| `toISO` | `(d: Dayjs)` | `string` — ISO 8601 |
| `toLocaleString` | `(d: Dayjs)` | `string` — locale-formatted |
| `toTimestamp` | `(d: Dayjs)` | `number` — Unix ms |

Use `toISO` for session file storage; use `toLocaleString` for display output.

---

## `src/utils/formatInputSummary.ts`

| Function | Signature | Returns |
|---|---|---|
| `formatInputSummary` | `(input: unknown)` | `string` — truncated summary for display |

---

## `src/utils/output.ts` — logging

| Export | Type | Purpose |
|---|---|---|
| `setLogLevel` | `(level: LogLevel) => void` | Sets current log level |
| `stdout` | `{ print(message: string): void }` | Normal output |
| `stderr` | `{ print(message: string, cause?: unknown): void }` | Error output |
| `debug` | `{ print(message: string, meta?: Record<string, unknown>): void }` | Debug output (suppressed unless log level is debug) |

---

## `src/utils/path.ts` — path re-exports

Re-exports `resolve`, `dirname`, `basename`, `join` from Node `path`. Use this instead of importing `path` directly in `src/`.

---

## `src/utils/turns.ts` — turn display helpers

| Function | Signature | Returns |
|---|---|---|
| `flattenTurns` | `(turns: ClaudeCodeTurn[])` | `TurnRow[]` — flat list for display |
| `applyRowFilter` | `(rows: TurnRow[], filter: RowFilter)` | `TurnRow[]` — filtered/sliced |

Used by the `show` and `analyze` CLI commands.

---

## `src/utils/uuid.ts`

| Function | Signature | Returns |
|---|---|---|
| `generateId` | `()` | `string` — UUID v4 via `crypto.randomUUID` |

Used for session ID generation in `SessionDomain.create`.
