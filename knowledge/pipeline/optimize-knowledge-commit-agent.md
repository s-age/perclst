# optimize-knowledge: Commit Agent Does Not Resume an Implementer

**Type:** Discovery

## Context

The general pipeline rule is: assign the commit task to the implement agent by giving
it the same `name`, so the runner resumes that session and the agent has full context
of what was built. `optimize-knowledge` is the only canonical pattern that intentionally
breaks this rule.

## What is true

- `optimize-knowledge` runs multiple parallel agents, each responsible for a single
  knowledge domain.
- There is no single "implementer" session to resume — each domain agent only knows
  its own domain.
- The commit agent uses a generic name (e.g., `optimize-knowledge-committer`) and
  only runs `git status` then commits everything.
- It does not need implementation context to produce a valid commit.

## Do

- Use a separate generic committer agent for `optimize-knowledge` pipelines
- Name it `optimize-knowledge-committer` (or similar generic form)

## Don't

- Don't force the commit task onto one of the parallel domain agents — it only knows
  its own domain and cannot produce a commit message covering all changes
- Don't apply the "commit resumes implement session" rule to `optimize-knowledge`

---

**Keywords:** optimize-knowledge, commit agent, session resume, parallel agents, generic committer, pipeline exception, commit task
