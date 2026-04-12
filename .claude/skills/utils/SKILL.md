---
name: utils
description: Use this skill when working with error types, logging, or anything in src/utils/. Covers the custom error classes and the Logger singleton.
paths:
  - src/utils/**
---

# Utilities

## Files
- `src/utils/errors.ts` — Custom error classes
- `src/utils/logger.ts` — `Logger` class and `logger` singleton

## Error Classes

| Class | When thrown |
|---|---|
| `SessionNotFoundError` | Session file does not exist |
| `SessionAlreadyExistsError` | Session ID collision (currently unused) |
| `APIError` | Claude CLI exits non-zero or returns empty response |
| `ConfigError` | Configuration issue |
| `ProcedureNotFoundError` | Procedure `.md` file not found |

## Logger

```typescript
logger.debug(message, meta?)   // LogLevel.DEBUG (0)
logger.info(message, meta?)    // LogLevel.INFO  (1) — default level
logger.warn(message, meta?)    // LogLevel.WARN  (2)
logger.error(message, error?)  // LogLevel.ERROR (3)
```

`logger.setLevel(LogLevel.DEBUG)` to enable debug output. The `logger` export is a module-level singleton shared across all imports.
