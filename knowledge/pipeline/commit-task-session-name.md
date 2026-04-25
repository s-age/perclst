# Commit Task Must Reuse the Implementer's Session Name

**Type:** Problem

## Context

In perclst pipelines, when a commit step follows an implement step, the commit agent
task must use the **same `name` value** as the implementer task. perclst uses `name`
as the session resume key — a different name starts a brand-new session with no
context of what was changed.

## What happened

Using a distinct name for the commit task (e.g. `*-committer`) causes perclst to
open a fresh session. The committer agent has no knowledge of the files that were
modified in the preceding implement session and cannot form a meaningful commit.

## Do

- Set the commit task `name` to the identical value used by the implementer task:
  ```json
  { "type": "agent", "name": "review-feature-abort-domains-implementer",
    "task": "Commit the changes you just made." }
  ```
- Apply this pattern to all pipeline types (test-unit, review-fix, etc.) where a
  commit step follows an implement step.

## Don't

- Don't give the commit task a distinct name such as `*-committer` or `*-committer-agent`.
- Don't assume the implementer's session is accessible under any name other than the
  exact `name` value used in that task entry.

---

**Keywords:** pipeline, commit, session, name, resume, implementer, session-key
