# Abort Signal Check Placement

**Type:** Discovery

## Context

When implementing abort functionality for pipelines and agents, signal checks can be placed at different points in the execution flow. Understanding where and why abort signals are checked affects both responsiveness and implementation complexity.

## What happened / What is true

Abort signals are checked at two key points in pipeline execution:

- **Between tasks** — in `pipelineService` while loop, before processing the next task. This check runs once per task iteration, not on every inner operation.
- **During task execution** — in infrastructure layer (`runClaude`) to kill child processes immediately when a signal is received.

The between-task check ensures clean interruption at task boundaries. The infrastructure check kills child processes immediately, providing finer-grained control during long-running operations.

## Do

- Place abort checks at strategic points where control can be cleanly transferred (task boundaries, before major operations)
- Throw `PipelineAbortedError` when abort is detected to propagate the signal cleanly through error handling
- Check signals once per task iteration rather than on every inner loop, to avoid tight polling

## Don't

- Place abort checks on every line of code — this adds overhead and complexity
- Silently continue task execution after abort is detected
- Rely solely on process termination; always check the signal between tasks

---

**Keywords:** abort, signal, interruption, task execution, pipeline, architecture, responsiveness
