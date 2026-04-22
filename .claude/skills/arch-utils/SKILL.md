---
name: arch-utils
description: "Required for any work in src/utils/. Load before creating, editing, reviewing, or investigating files in this layer. Covers pure-function utilities, library wrappers, what belongs here vs. infrastructures, and import constraints."
paths:
  - 'src/utils/**/*.ts'
---

## Role

Pure functions and library wrappers — no I/O to external resources. Every export is either a stateless computation or a thin wrapper that keeps an external library from leaking into domain code. All layers may import from here; in return, `utils` must not import from any `src/` layer except `types`.

## Files

| File | Role |
|------|------|
| `date.ts` | dayjs wrapper — `now()`, `toISO()`, `toLocaleString()`, `toTimestamp()`; hides `dayjs` from the rest of the codebase |
| `uuid.ts` | ID generation — wraps `crypto.randomUUID()`; treated as pure (no I/O side effects) |
| `logger.ts` | Leveled logger (`debug`, `info`, `warn`, `error`) + `print()` with optional ANSI color; cross-cutting concern used by all layers |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| External libraries (e.g. `dayjs`) | Any `src/` layer except `types` (`cli`, `validators`, `services`, `domains`, `repositories`, `infrastructures`, `errors`, `constants`, `core/di`, …) |
| Node.js non-I/O built-ins (e.g. `crypto`) | — |
| `src/types/` | — |

`utils` is a dependency **sink** — it sits below every layer precisely because it has no internal dependencies.

## `utils` vs `infrastructures` — Decision Guide

```
Does the function perform I/O on an external resource?
  (file, child process, network socket, environment variable reads at runtime…)
  │
  ├─ YES → infrastructures/
  │         (fs, child_process, os.homedir() at runtime, etc.)
  │
  └─ NO  → utils/
            (pure computation, deterministic result, no teardown needed)
            Examples: dayjs formatting, crypto.randomUUID(), ANSI color helpers
```

**Gray-area rule**: `crypto.randomUUID()` reads from the OS entropy pool but has no visible side effect and needs no cleanup — treat it as pure and put it in `utils`. When in doubt, ask: *"does a caller need to mock this to test deterministically?"* If no → `utils`.

## Patterns

**Library wrapper — hide the dependency**

```ts
// Good — callers import from utils/date, never from dayjs directly
import dayjs from 'dayjs'
export function now(): dayjs.Dayjs { return dayjs() }
export function toISO(d: dayjs.Dayjs = now()): string { return d.toISOString() }

// Bad — leaking dayjs into domain code
// domains/sessionDomain.ts
import dayjs from 'dayjs'   // NG: third-party library should be wrapped in utils
const ts = dayjs().toISOString()
```

**Pure function — no side effects**

```ts
// Good — randomUUID() has no observable side effect beyond returning a string
import { randomUUID } from 'crypto'
export function generateId(): string { return randomUUID() }

// Bad — non-deterministic logic that touches external state goes to infrastructures
export function readEnvId(): string { return process.env.SESSION_ID ?? '' }  // NG
```

**Cross-cutting singleton — logger**

`Logger` is a class but is exported as a module-level singleton (`export const logger`). All layers import the same instance. Configuration (log level, color) is set at startup via `logger.setLevel()` — never re-instantiated per request.

## Prohibitions

- Never import from any `src/` layer — not even `constants` (exception: `src/types/` is allowed)
- Never perform file I/O, spawn processes, or make network calls — those belong in `infrastructures/`
- Never import `zod` — Zod is confined to `src/validators/rules/` only
- Never add domain-specific logic (session validation, business rules) — keep functions generic and reusable across all layers
