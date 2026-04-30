---
name: arch-utils
description: "Required for any work in src/utils/ — import rules, file catalog, utils-vs-infrastructures guide, pure function and wrapper conventions."
paths:
  - 'src/utils/**/*.ts'
---

## Role

Pure functions and library wrappers — no I/O to external resources (stdout/stderr output helpers are an intentional carve-out). Every export is stateless computation or a thin wrapper keeping third-party libraries from leaking into domain code. All layers may import from here; in return, `utils` must not import from any `src/` layer except `types`.

## Files

| File | Role |
|------|------|
| `date.ts` | dayjs wrapper — `now()`, `toISO()`, `toLocaleString()`, `toTimestamp()`; hides `dayjs` |
| `formatInputSummary.ts` | Formats a tool-input record into a short display string (used by tool history) |
| `output.ts` | Output helpers — `stdout.print()`, `stderr.print()`, `debug.print()`; log level via `setLogLevel(LogLevel)` |
| `path.ts` | Path helpers — re-exports Node `path` builtins + `cwdPath(...parts)` for CWD-relative paths |
| `testStrategyHelpers.ts` | Pure computation helpers for the MCP test strategist — complexity scoring, strategy building |
| `token.ts` | Token count formatting — `formatKilo(n)` formats a number as a `k`-unit string (e.g. `56337 → "56.3k"`) |
| `url.ts` | URL built-in re-export — re-exports `fileURLToPath` from Node's `url` module |
| `uuid.ts` | ID generation — wraps `crypto.randomUUID()`; treated as pure |
| `yaml.ts` | YAML wrapper — `parseYaml<T>(text)` and `stringifyYaml(data)`; hides the `yaml` library |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| External libraries (e.g. `dayjs`) | Any `src/` layer except `types` (`cli`, `validators`, `services`, `domains`, `repositories`, `infrastructures`, `errors`, `constants`, `core/di`, …) |
| Node.js non-I/O built-ins (e.g. `crypto`, `path`) | — |
| `src/types/` | — |

`utils` is a dependency **sink** — it sits below every layer precisely because it has no internal dependencies.

## `utils` vs `infrastructures` — Decision Guide

```
Does the function perform I/O on an external resource?
  (file, child process, network socket, env reads at runtime…)
  │
  ├─ YES → infrastructures/   (fs, child_process, os.homedir(), etc.)
  │
  └─ NO  → utils/             (pure computation, no teardown needed)
```

**Gray-area rules**:
- `crypto.randomUUID()` reads OS entropy but has no side effect — treat as pure → `utils`
- `process.cwd()` reads CWD at call time — acceptable in `utils` path helpers (no external resource, no cleanup)
- `stdout`/`stderr` writes are an intentional carve-out: all layers need print access; an infrastructure port just for console output would be over-engineering

## Patterns

**Library wrapper** — callers import from `utils/date`, never from `dayjs` directly:
```ts
import dayjs from 'dayjs'
export function now(): dayjs.Dayjs { return dayjs() }
export function toISO(d: dayjs.Dayjs = now()): string { return d.toISOString() }
```

**Output** — use module-level objects; there is no logger class or singleton:
```ts
import { stdout, stderr, debug, setLogLevel, LogLevel } from '@src/utils/output'
stdout.print('result')           // always prints to stdout
debug.print('trace', { key })    // only when LogLevel.DEBUG is active
setLogLevel(LogLevel.DEBUG)      // call once at startup
```

## Prohibitions

- Never import from any `src/` layer — not even `constants` (exception: `src/types/` is allowed)
- Never perform file I/O, spawn processes, or make network calls — those belong in `infrastructures/`
- Never import `zod` — confined to `src/validators/rules/` only
- Never add domain-specific logic — keep functions generic and reusable across all layers
