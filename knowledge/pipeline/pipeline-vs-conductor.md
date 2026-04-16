# Pipeline vs Conductor: When to Use Each

**Type:** Discovery

## Context

perclst offers two orchestration modes: `perclst run <pipeline.json>` and the conductor
procedure. They overlap in capability at the simple end but diverge quickly for complex
workflows. Choosing the wrong one leads to either over-engineering or hitting hard limits.

## What happened / What is true

- **`perclst run pipeline.json`** — suited for fixed, sequential, pre-defined flows:
  - Task order is known at authoring time.
  - Simple retry loops via `rejected: { to, max_retries }` are expressible.
  - Example: implement → test → run `npm test` → on failure, loop back to implement.
- **conductor procedure** — suited for dynamic flows:
  - Task selection depends on runtime output.
  - Iteration count is not known in advance.
  - Conditional branching or fan-out is required.
  - Example: read test results, then choose which agent to invoke next.

## Do

- Use pipeline for: linear flows, fixed retry loops, and sequences where all steps are
  known before the run starts.
- Use conductor for: dynamic branching, variable iteration, or any flow where the next
  step depends on what an agent just produced.

## Don't

- Don't force dynamic decision-making into a pipeline definition — it cannot express
  runtime-conditional task selection.
- Don't reach for conductor when a simple fixed loop with `rejected` already covers the
  requirement.

---

**Keywords:** pipeline, conductor, orchestration, dynamic flow, fixed flow, rejected, retry loop, perclst run
