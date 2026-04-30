---
name: arch-errors
description: "Required for any work in src/errors/. Covers one-class-per-file rule, naming conventions, constructor patterns, and the prohibition on importing other layers."
paths:
  - 'src/errors/**/*.ts'
---

## Role

Defines typed error classes that are thrown across all layers. Each file exports exactly one class extending the built-in `Error`. This layer has zero dependencies — it is a leaf that every other layer may import freely.

## Files

| File | Class | Thrown when |
|------|-------|-------------|
| `sessionNotFoundError.ts` | `SessionNotFoundError` | No session file exists for the given `sessionId` |
| `procedureNotFoundError.ts` | `ProcedureNotFoundError` | The named procedure markdown file cannot be found |
| `configError.ts` | `ConfigError` | Config file is malformed or a required field is missing |
| `validationError.ts` | `ValidationError` | User-supplied input fails validation rules |
| `apiError.ts` | `APIError` | Claude CLI process exits with a non-zero status or HTTP error; carries an optional `statusCode` |
| `rateLimitError.ts` | `RateLimitError` | Claude usage limit is reached; carries an optional `resetInfo` string |
| `pipelineMaxRetriesError.ts` | `PipelineMaxRetriesError` | Max retries exceeded for a pipeline task; carries `taskIndex` and `maxRetries` |
| `rawExitError.ts` | `RawExitError` | `claude` process exits unexpectedly; carries `code` (exit code) and `stderr` |
| `pipelineAbortedError.ts` | `PipelineAbortedError` | User aborts a pipeline run; no-argument constructor |
| `userCancelledError.ts` | `UserCancelledError` | User cancels an interactive prompt; no-argument constructor |

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| Nothing — zero dependencies | All `src/` layers (`cli`, `validators`, `services`, `domains`, `repositories`, `infrastructures`, `types`, `utils`, `constants`) |

## Patterns

**Standard constructor — param injected into `super()`, `this.name` required**

```ts
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`)
    this.name = 'SessionNotFoundError'  // required — omitting leaves name as 'Error'
  }
}
```

**No-argument constructor** — use when the error type itself is the full signal:

```ts
export class PipelineAbortedError extends Error {
  constructor() {
    super('Pipeline aborted by user')
    this.name = 'PipelineAbortedError'
  }
}
```

**Public readonly fields** — add only when callers need to branch on the value (not just for display). Multiple fields are allowed:

```ts
export class RawExitError extends Error {
  constructor(
    public readonly code: number | null,
    public readonly stderr: string
  ) {
    super(`claude exited with code ${code}`)
    this.name = 'RawExitError'
  }
}

// Bad — embedding the value only in the message string forces callers to parse it
export class APIError extends Error {
  constructor(message: string, statusCode?: number) {
    super(`${message} (status: ${statusCode})`)  // NG: statusCode unreadable programmatically
    this.name = 'APIError'
  }
}
```

**File and class naming**

```ts
// Good — file: sessionNotFoundError.ts  class: SessionNotFoundError
// Bad  — session-not-found.ts (kebab-case) or class SessionNotFound (no Error suffix)
```

## Prohibitions

- Never import from any other `src/` layer — this is a zero-dependency leaf
- Never put two classes in one file — one class per file, always
- Never add logic beyond `super()`, `this.name`, and public field initialization
- Never use `interface` or `type` — pure class declarations only
- Never omit `this.name` — it must match the class name exactly so `instanceof` and logging work correctly
- Never use kebab-case for filenames — camelCase only (e.g., `rateLimitError.ts`)
