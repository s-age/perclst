# Fork: jsonlBaseline Must Come from the Original Session

**Type:** Problem

## Context

Applies when implementing `perclst fork`. A forked session inherits the full conversation
history of the original, so `message_count` must be initialised from the original session's
JSONL line count, not from zero.

## What happened / What is true

- The initial assumption was that `jsonlBaseline` could be `0` for a new forked session
  because the new JSONL file does not exist yet.
- This is wrong: `AgentService.isLimitExceeded()` uses `jsonlBaseline` to compute
  `message_count`. Starting from `0` makes the limit check behave as if the conversation
  just started, ignoring the inherited history.
- `ForkAction` must carry **both** the original session's ID and working dir (for baseline
  lookup) **and** the new session's ID and working dir (for the fork's own JSONL).
- `newSession.working_dir` is set to `process.cwd()` at fork time, which can differ from
  the original session's working dir. The original JSONL lives under the original working
  dir encoding, so both must be tracked independently.

### Correct dispatch pattern

```typescript
const baselineSessionId =
  action.type === 'fork' ? action.originalClaudeSessionId : action.sessionId
const baselineWorkingDir =
  action.type === 'fork' ? action.originalWorkingDir : action.workingDir
const jsonlBaseline = countJsonlLines(
  resolveJsonlPath(baselineSessionId, baselineWorkingDir)
)
```

## Do

- Derive `jsonlBaseline` from the **original** session's JSONL file when forking.
- Store `originalClaudeSessionId` and `originalWorkingDir` on `ForkAction` separately
  from the new session's equivalents.

## Don't

- Don't default `jsonlBaseline` to `0` for forked sessions.
- Don't assume the new session's `working_dir` matches the original's.

---

**Keywords:** fork, jsonlBaseline, message_count, isLimitExceeded, max_turns, working_dir, ForkAction
