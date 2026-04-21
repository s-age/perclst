# Commit Task Should Reuse the Implement Agent's Session

**Type:** Discovery

## Context

In pipelines that follow an implement → review → gate → commit pattern (e.g. unit-test pipelines), the commit step needs accurate, context-rich commit messages. This matters whenever a commit agent task is added at the end of a multi-step pipeline.

## What is true

- The implement agent lives through the full cycle: initial implementation, review feedback, and fix iterations.
- Resuming that session for the commit step gives the agent first-hand context of what changed and why.
- A separate agent (e.g. a fresh haiku session) has zero context and produces shallow, generic commit messages.
- Resuming also causes commit messages to naturally capture the "why" — review feedback, failed attempts, and edge cases found during testing — which feeds the knowledge pipeline more effectively.

## Do

- Set the same `name` on the commit agent task as on the implement agent task so perclst resumes the existing session:

```json
{
  "type": "agent",
  "name": "implement-unit-test-foo-service",
  "task": "Tests written and passing. Commit the new test file with an appropriate conventional commit message.",
  "model": "haiku",
  "allowed_tools": ["Read", "Bash"]
}
```

## Don't

- Don't spawn a separate, unnamed commit agent — it will write context-free commit messages.
- Don't assume a lightweight model (haiku) compensates for the lack of session context.

---

**Keywords:** pipeline, commit, session reuse, implement agent, commit message, context, named session, unit-test pipeline
