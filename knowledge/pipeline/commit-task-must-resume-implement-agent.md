# Commit Task Must Resume the Implement Agent

**Type:** Discovery

## Context

In a pipeline that has implement → review → commit steps, the commit task must not be a fresh
agent — it must reuse (resume) the same session as the implement agent.

## What happened / What is true

- The implement agent accumulates context about what was built and writes `knowledge/draft/` entries
  as a post-commit behavior.
- A separate commit agent has no knowledge of what was implemented or reviewed, so it cannot
  produce meaningful knowledge entries.
- The commit task achieves session reuse by using the **same `name`** field as the implement task —
  the pipeline runner resumes the existing session rather than starting a new one.

## Do

- Give the commit task the same `name` as the implement task so the pipeline resumes that session.

## Don't

- Don't create a separate, independent commit agent in a pipeline.
- Don't rely on a fresh agent to write post-commit knowledge entries — it has no context.

---

**Keywords:** pipeline, commit task, implement agent, session resume, knowledge draft, post-commit, task name reuse
