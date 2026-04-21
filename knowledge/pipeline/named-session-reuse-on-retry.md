# Named Agent Sessions Were Not Reused on Retry Loops

**Type:** Problem

## Context

In review-fix pipeline loops, a reviewer task runs after each fix attempt. If the reviewer task is named (so it can be resumed), the pipeline should reuse the same reviewer session across retries to keep feedback consistent. This applies to any named task that appears inside a retry loop.

## What happened / What is true

`PipelineDomain.runAgentTask` guarded `resumeNamedSession` with `if (task.name && rejected)`. The `rejected` flag is set only on the task being retried (e.g., `implement-fix`), not on downstream tasks such as the reviewer. As a result, the reviewer always fell through to session creation on every retry, producing inconsistent feedback — issues flagged on attempt N could differ entirely from attempt N-1, causing previously-passing fixes to fail.

## Do

- Guard `resumeNamedSession` with `if (task.name)` alone — any named task reuses its session on every execution after the first
- Rely on the fact that the session does not exist yet on first execution, so the first run always creates a new one naturally

## Don't

- Gate session reuse on the `rejected` flag — that flag only reflects whether the *current* task was the one rejected, not whether the pipeline is in a retry loop
- Worry about cross-run session contamination: completed pipelines are moved to `done/`, so a prior run's session cannot leak into a new run under normal operation

---

**Keywords:** pipeline, named session, retry, reviewer, resume, session reuse, runAgentTask, rejected flag
