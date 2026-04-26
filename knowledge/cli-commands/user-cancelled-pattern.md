# User Cancellation: Throw UserCancelledError, Don't Call process.exit()

**Type:** Discovery

## Context

Applies whenever a shared CLI helper function needs to signal that the user declined to proceed (e.g. answered "n" to a confirmation prompt). The question is whether the helper should exit the process directly or signal cancellation to its caller.

## What happened / What is true

Calling `process.exit()` inside a utility function works at runtime but has two costs:

1. **Testability** — `process.exit()` terminates the test runner; `throw` is easy to `expect().rejects.toThrow()`
2. **Separation of concerns** — exit-code policy belongs to the command handler, not the helper

The established pattern is to throw `UserCancelledError` from helpers and catch it in command handlers:

```typescript
// src/cli/prompt.ts
export async function handleWorkingDirMismatch(
  sessionDir: string,
  interactive = true
): Promise<void> {
  if (!sessionDir || sessionDir === process.cwd() || !interactive) return
  const confirmed = await askWorkingDirSwitch(sessionDir, process.cwd())
  if (!confirmed) throw new UserCancelledError()
  process.chdir(sessionDir)   // side-effect only when NOT cancelled
}

// src/cli/commands/chat.ts
} catch (error) {
  if (error instanceof UserCancelledError) {
    stderr.print('Cancelled.')
    process.exit(0)   // exit 0 = intentional user action, not an error
  }
  // other errors re-thrown or handled separately
}
```

## Do

- Throw `UserCancelledError` from helper/utility functions to signal user cancellation
- Catch it in the command handler and call `process.exit(0)` there
- Place side-effects (e.g. `process.chdir`) **after** the cancellation check so they only run on confirmation
- Keep `UserCancelledError` in `src/errors/` (one class per file)

## Don't

- Don't call `process.exit()` inside shared helper or prompt functions
- Don't use exit code 1 for intentional user cancellations — reserve non-zero codes for actual errors

---

**Keywords:** UserCancelledError, process.exit, cancellation, CLI helper, prompt, exit code, testability, separation of concerns
