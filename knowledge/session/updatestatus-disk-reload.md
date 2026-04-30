# SessionDomain.updateStatus Reloads Session from Disk

**Type:** Problem

## Context

Applies whenever in-memory session mutations must survive a call to
`SessionDomain.updateStatus()`. Most commonly triggered when a domain (e.g.,
`agentDomain`) mutates a session object (such as setting `session.model`) before
updating status.

## What happened

`SessionDomain.updateStatus()` calls `this.get(sessionId)` internally, which loads a
fresh copy from disk. Any in-memory mutations on the caller's session object are
invisible to `updateStatus` and are lost if not persisted first.

The bug was latent in the resume flow: `save` was called *after* `updateStatus`, which
caused the saved status to be overwritten by the stale in-memory version.

## Do

```
agentDomain.run(session, ...)            // mutates session in memory
sessionDomain.save(session)              // persist mutations to disk first
sessionDomain.updateStatus(id, 'completed')  // reloads from disk (now has mutations)
```

## Don't

```
agentDomain.run(session, ...)
sessionDomain.updateStatus(id, 'completed')  // reloads stale disk copy; mutations lost
sessionDomain.save(session)                  // overwrites with in-memory; status reverts
```

---

**Keywords:** updateStatus, SessionDomain, disk reload, in-memory mutation, save order, model persistence, session save, get, resume flow
