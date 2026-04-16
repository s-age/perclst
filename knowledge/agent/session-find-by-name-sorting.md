# findByName Returns the Most Recently Active Session

**Type:** Discovery

## Context

When resuming a session by name, `findByName` must choose one session when multiple
sessions share the same name. The sort order used to break ties determines which session
the user gets back.

## What happened / What is true

- `listSessions()` sorts results by `updated_at` descending, **not** `created_at`.
- `findByName` takes the first match from that sorted list.
- This means "the session with that name that was most recently active" is returned —
  not the oldest or newest session by creation time.

## Do

- Rely on `updated_at` ordering when reasoning about which session `findByName` will pick.
- Prefer this behavior for `resume` use cases — returning to the last-touched session is
  the intuitive expectation.

## Don't

- Don't assume `findByName` returns the first-created session of a given name.
- Don't use `created_at` as the tie-breaking field for resume-oriented lookups.

---

**Keywords:** findByName, listSessions, updated_at, session sorting, resume, session name
