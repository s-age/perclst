---
name: arch-errors
description: "Required for any work in src/errors/. Load before creating, editing, reviewing, or investigating files in this layer. Covers one-class-per-file rule, naming conventions, constructor patterns, and the prohibition on importing other layers."
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

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| Nothing — zero dependencies | All `src/` layers (`cli`, `validators`, `services`, `domains`, `repositories`, `infrastructures`, `types`, `utils`, `constants`) |

## Patterns

**Minimal constructor — single contextual param injected into `super()`**

```ts
// Good — one param, message built inline, this.name set to class name
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`)
    this.name = 'SessionNotFoundError'
  }
}

// Bad — omitting this.name (name stays 'Error', making catch-site inspection useless)
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`)
    // NG: missing this.name = 'SessionNotFoundError'
  }
}
```

**Public readonly field for machine-readable context**

Use a `public readonly` constructor field only when callers need to branch on the value (not just for display).

```ts
// Good — statusCode is used by callers to decide retry logic
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Bad — embedding the value only in the message string, forcing callers to parse it
export class APIError extends Error {
  constructor(message: string, statusCode?: number) {
    super(`${message} (status: ${statusCode})`)  // NG: statusCode is unreadable programmatically
    this.name = 'APIError'
  }
}
```

**File and class naming**

```ts
// Good — file: sessionNotFoundError.ts  class: SessionNotFoundError
export class SessionNotFoundError extends Error { ... }

// Bad — kebab-case file name or missing "Error" suffix
// session-not-found.ts         ← NG: kebab-case
// export class SessionNotFound  ← NG: no Error suffix
```

## Prohibitions

- Never import from any other `src/` layer — this is a zero-dependency leaf
- Never put two classes in one file — one class per file, always
- Never add logic beyond `super()`, `this.name`, and public field initialization
- Never use `interface` or `type` — pure class declarations only
- Never omit `this.name` — it must match the class name exactly so `instanceof` and logging work correctly
- Never use kebab-case for filenames — camelCase only (e.g., `rateLimitError.ts`)
