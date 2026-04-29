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
| `LogLevel` | `enum` | `DEBUG = 0`, `INFO = 1` |
| `setLogLevel` | `(level: LogLevel) => void` | Sets current log level |
| `stdout` | `{ print(message: string): void }` | Normal output to process.stdout |
| `stderr` | `{ print(message: string, cause?: unknown): void }` | Error output to process.stderr |
| `debug` | `{ print(message: string, meta?: Record<string, unknown>): void }` | Debug output (suppressed unless log level is DEBUG) |

> Note: `ts_analyze` only detects `setLogLevel` in exports — `stdout`, `stderr`, `debug`, and `LogLevel` are `export const`/`export enum` and confirmed by reading the source directly.

---

## `src/utils/path.ts` — path re-exports

| Export | Signature | Returns |
|---|---|---|
| `resolve` | (re-export) | Node `path.resolve` |
| `dirname` | (re-export) | Node `path.dirname` |
| `basename` | (re-export) | Node `path.basename` |
| `extname` | (re-export) | Node `path.extname` |
| `join` | (re-export) | Node `path.join` |
| `cwdPath` | `(...parts: string[])` | `string` — joins parts relative to `process.cwd()` |

Use this instead of importing `path` directly in `src/`.

---

## `src/utils/testStrategyHelpers.ts` — test strategy pure helpers

| Function | Signature | Returns |
|---|---|---|
| `calcComplexity` | `(fn: RawFunctionInfo)` | `number` — cyclomatic complexity |
| `calcSuggestedTestCaseCount` | `(complexity: number)` | `number` — recommended test case count |
| `isCustomHook` | `(name: string)` | `boolean` — true if name starts with `use` |
| `isComponent` | `(name: string)` | `boolean` — true if name starts with uppercase |
| `findMatchingTest` | `(targetFilePath, testFilePath?)` | `string \| null` — resolved test file path |
| `buildStrategy` | `(fn: RawFunctionInfo, framework: TestFramework, missing: MissingCoverage)` | `FunctionStrategy` |
| `buildRecommendation` | `(strategy: FunctionStrategy)` | `string` — human-readable recommendation |

Pure helpers extracted from `TestStrategyDomain`. Consumed by `src/domains/testStrategy.ts`.

---

## `src/utils/token.ts`

| Function | Signature | Returns |
|---|---|---|
| `formatKilo` | `(n: number)` | `string` — formats token count as k-unit string with one decimal place (e.g. 56337 → "56.3k") |

Used for token count display in output formatting.

---

## `src/utils/url.ts` — url re-exports

Re-exports `fileURLToPath` from Node `url`. Use this instead of importing `url` directly in `src/`.

---

## `src/utils/uuid.ts`

| Function | Signature | Returns |
|---|---|---|
| `generateId` | `()` | `string` — UUID v4 via `crypto.randomUUID` |

Used for session ID generation in `SessionDomain.create`.

---

## `src/utils/yaml.ts` — yaml wrapper

| Function | Signature | Returns |
|---|---|---|
| `parseYaml<T>` | `(text: string)` | `T` — parses YAML text into typed value |
| `stringifyYaml` | `(data: unknown)` | `string` — serialises value to YAML text |

Wraps the `yaml` library. Used for pipeline file loading (`.yaml`/`.yml`).
