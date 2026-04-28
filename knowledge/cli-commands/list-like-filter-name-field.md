# `--like` Filter Matches session.name, Not the Task Description

**Type:** Discovery

## Context

When writing `listCommand` tests that use the `--like` filter, the natural assumption
is that it filters on the initial task string passed to `start`. It does not.

## What is true

`SessionDomain.list()` filters by `(s.name ?? '').includes(filter.like!)`.

- Filtering is against `session.name`, not the task description.
- Sessions created without an explicit `name:` option have `name = undefined`, which
  falls back to `''` — they will never match a non-empty `--like` pattern.

Reference: `src/domains/session.ts` — `SessionDomain.list()`.

## Do

- Pass a `name:` option to `startCommand` when creating sessions that will be filtered:
  ```ts
  await startCommand('task', { outputOnly: true, name: 'recognizable-name' })
  await listCommand({ like: 'recognizable' })  // matches ✓
  ```

## Don't

- Expect `--like` to match on the task description string.
- Omit `name:` and then wonder why `--like` returns no results.

---

**Keywords:** list command, like filter, session.name, task description, SessionDomain, filter
