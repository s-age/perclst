# execSync Prints stderr Before Throwing

**Type:** Problem

## Context

Applies whenever `execSync` is used to run shell commands that may fail. The caller wraps it in `try/catch` expecting to silently handle failures, but stderr leaks to the terminal regardless.

## What happened / What is true

Node.js `execSync` writes the child process's stderr directly to the terminal **before** it throws the `Error` on non-zero exit. `try/catch` can swallow the exception, but it cannot suppress the stderr output — it has already been flushed.

```typescript
// "error: pathspec '...' did not match any file(s)" still appears in the terminal
try {
  execSync('git add -u ".claude/tmp/"')
} catch {
  // exception suppressed, stderr is not
}
```

Surfaced in `gitRepository.ts` → `stageUpdated('.claude/tmp/')`: running `commitMove` in an environment where `.claude/tmp/` had no tracked files caused the git error to print even though the caller handled the exception.

## Do

- Check preconditions **before** calling `execSync` so the command only runs when it can succeed
- Use `spawnSync` when you need to capture or fully suppress stderr — it does not throw; check `result.status` instead

```typescript
if (this.gitRepo.hasTrackedFiles('.claude/tmp/')) {
  this.gitRepo.stageUpdated('.claude/tmp/')
}
```

## Don't

- Don't rely on `try/catch` alone to achieve silent failure with `execSync`
- Don't use `execSync` when stderr suppression is a hard requirement

---

**Keywords:** execSync, spawnSync, stderr, try/catch, Node.js, shell, git, silent failure, error suppression
