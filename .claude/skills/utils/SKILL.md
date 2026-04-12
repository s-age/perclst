---
name: utils
description: Use this skill when working with error types, logging, or anything in src/lib/utils/. Covers the custom error classes and the Logger singleton.
paths:
  - src/lib/utils/**
---

# Utilities

## Files
- `src/lib/utils/errors.ts` — Custom error classes
- `src/lib/utils/logger.ts` — `Logger` class and `logger` singleton

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
