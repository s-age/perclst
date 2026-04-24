# Pipeline Task Name: `<taskName>-<role>` Convention

**Type:** Discovery

## Context

Pipeline task `name` fields follow a strict ordering and suffix format. The convention was
deliberately changed at some point, so older examples or assumptions about the ordering may be
wrong.

## What happened / What is true

- Task names follow `<taskName>-<role>`, **not** `<role>-<taskName>`.
- The role suffix must be a **noun**, not a verb.
- Examples of correct names:
  - `unit-test-foo-service-implementer`
  - `unit-test-foo-service-reviewer`
  - `unit-test-foo-service-committer`
- `implement-unit-test-foo-service` is the old (wrong) ordering — task name came after the role.

## Do

- Append the role as a noun suffix: `implementer`, `reviewer`, `committer`.
- Keep `<taskName>` first, role last.

## Don't

- Don't put the role prefix first (e.g. `implement-unit-test-foo-service`).
- Don't use verbs as the role suffix (`implement`, `review`, `commit`).

---

**Keywords:** pipeline, task name, naming convention, role suffix, noun, implementer, reviewer, committer
