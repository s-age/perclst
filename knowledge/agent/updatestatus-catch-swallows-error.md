# updateStatus in catch Can Swallow the Original Error

**Type:** Problem

## Context

When `AgentService` catches a run failure and calls `sessionDomain.updateStatus(id, 'failed')`
before re-throwing, a secondary failure inside `updateStatus` (e.g. a disk write error)
replaces the original error, making the real failure invisible in logs and stack traces.

## What happened / What is true

```ts
// Bad — updateStatus throw overwrites the original run error
} catch (error) {
  await this.sessionDomain.updateStatus(id, 'failed')  // could throw → original lost
  throw error
}

// Good — suppress updateStatus errors so the original propagates cleanly
} catch (error) {
  await this.sessionDomain.updateStatus(id, 'failed').catch(() => {})
  throw error
}
```

The same pattern applies anywhere a secondary async operation runs inside a catch
block before a re-throw. The secondary operation must not be allowed to produce a
new rejection that masks the original.

## Do

- Append `.catch(() => {})` to any `await` inside a catch block that exists only
  for side-effects (status update, metric flush, cleanup)
- Re-throw the original `error`, not a new one

## Don't

- Don't let `updateStatus` (or any cleanup call) surface its own errors when
  the intent is to propagate the original failure
- Don't silently swallow errors in the *happy path* — `.catch(() => {})` is only
  appropriate for side-effect calls inside error handlers

---

**Keywords:** catch, swallow error, updateStatus, error masking, secondary failure, re-throw, AgentService, session status
