# git diff --no-index Exits 1 When Files Differ

**Type:** Problem

## Context

When calling `git diff --no-index /dev/null <file>` from Node.js (e.g. inside `getPendingDiff()`)
to produce a diff for an untracked file, the command always exits with code 1 if the file has
any content — because git treats a difference as a non-zero result by design.

## What happened / What is true

- `execSync` throws a `Error` (or silently swallows output) on any non-zero exit code.
- `git diff --no-index` exits 0 only when the two inputs are identical; exit 1 means "differs".
- For untracked files compared against `/dev/null`, exit 1 is always the success case.
- Using `execSync` here causes `getPendingDiff()` to fail silently or throw, losing all untracked-file diffs.

## Do

- Use `spawnSync` for `git diff --no-index` — it returns `stdout` regardless of exit code:
  ```ts
  const result = spawnSync('git', ['diff', '--no-index', '/dev/null', file], {
    encoding: 'utf-8',
    cwd,
  });
  // result.stdout contains the diff even when result.status === 1
  ```

## Don't

- Don't use `execSync` for any git command whose non-zero exit code is expected/normal:
  ```ts
  // Bad: throws for any new file with content
  execSync(`git diff --no-index /dev/null ${file}`, { encoding: 'utf-8', cwd })
  ```
- Don't wrap `execSync` in a try/catch that discards the error — you'll silently lose output.

---

**Keywords:** git, diff, no-index, spawnSync, execSync, exit code, untracked, getPendingDiff
