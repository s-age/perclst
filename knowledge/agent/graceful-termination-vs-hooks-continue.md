# GRACEFUL_TERMINATION_PROMPT and hooks `continue: false` Solve Different Problems

**Type:** Discovery

## Context

Both `GRACEFUL_TERMINATION_PROMPT` and MCP hooks with `continue: false` can stop an
agent's execution, but they target different failure modes and should not be confused or
treated as interchangeable.

## What happened / What is true

- **`GRACEFUL_TERMINATION_PROMPT`**: handles the case where a *child* agent hits
  `max_messages` or `max_context_tokens`. It signals the child to wrap up gracefully before it is
  cut off by the runtime limit.
- **hooks `continue: false`**: stops the *parent* agent after an MCP tool call returns.
  This is the mechanism for `invoke_serial_children`-style orchestration, where the parent
  should halt and let the tool's side-effects drive the next step.
- `perclst run` is itself the orchestrator, so there is no "parent agent to stop" — the
  `hooks continue: false` pattern is not needed in pipeline execution.
- `hooks continue: false` becomes relevant only if `invoke_serial_children` is implemented
  as an MCP tool exposed to an outer agent.

## Do

- Use `GRACEFUL_TERMINATION_PROMPT` to handle child agents approaching their turn/context
  limits.
- Use `hooks continue: false` only when an MCP tool needs to halt an outer (parent) agent
  after execution.

## Don't

- Don't treat `hooks continue: false` as a replacement for graceful shutdown of a child
  agent at its own limits.
- Don't introduce `hooks continue: false` into the pipeline runner — `perclst` is already
  the orchestrator.

---

**Keywords:** GRACEFUL_TERMINATION_PROMPT, hooks continue false, max_messages, max_context_tokens, graceful shutdown, invoke_serial_children, MCP tool, orchestrator
