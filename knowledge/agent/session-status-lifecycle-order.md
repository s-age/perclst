# Session Status Lifecycle Order

**Type:** Problem

## Context

`AgentService.start()` and `resume()` manage session status transitions through
`sessionDomain.updateStatus()`. Getting the call order wrong causes sessions to
never reach `'completed'` or `'failed'`, or to be falsely marked `'failed'` after
a successful run.

## What happened / What is true

`AgentService.start()` and `resume()` were calling `updateStatus(id, 'active')`
*after* the agent run completed — the wrong direction. `PipelineDomain` had the
same bug. Sessions never reached `'completed'` or `'failed'`.

Correct lifecycle:

```
create/get  →  updateStatus('active')  →  run  →  updateStatus('completed')
                                                 ↘  updateStatus('failed')  on throw
```

`save()` must come *after* `updateStatus('completed')`. If `save()` is placed
before the status update and it throws, the run falls into `catch`, marking the
session `'failed'` despite a successful run:

```ts
// Bad — save before status update; a save failure → 'failed' despite success
await this.agentDomain.resume(...)
await this.sessionDomain.save(session)           // throws → catch → 'failed' ❌
await this.sessionDomain.updateStatus(id, 'completed')

// Good — status first, then save
await this.agentDomain.resume(...)
await this.sessionDomain.updateStatus(id, 'completed')
await this.sessionDomain.save(session)
```

`sessionDomain.create()` defaults to `status: 'active'` (session.ts:40), but
`start()` must still call `updateStatus('active')` explicitly before the try
block — relying on the default is fragile and inconsistent with `resume()`.

Root cause of the original bug: the integration test (`start.integration.test.ts`)
was asserting `status === 'active'` after the run, which validated the broken
behaviour rather than catching it.

## Do

- Call `updateStatus('active')` **before** the try block in both `start()` and `resume()`
- Call `updateStatus('completed')` as the **first** thing after a successful run
- Call `updateStatus('failed')` in catch, **before** re-throwing
- Place `save()` **after** `updateStatus('completed')`

## Don't

- Don't call `updateStatus('active')` after `run()` returns
- Don't rely on `sessionDomain.create()` defaulting to `active`
- Don't place `save()` before the status update in the try block

---

**Keywords:** session status, lifecycle, updateStatus, active, completed, failed, AgentService, resume, start, save, status transition
