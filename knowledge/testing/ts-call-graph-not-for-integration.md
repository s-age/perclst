# ts_call_graph Should Not Be Used for Integration Tests

**Type:** Discovery

## Context

`ts_call_graph` is designed to discover what a function calls, helping decide what to
mock. For integration tests, the mock boundary is fixed and already known before writing
a single line of code, so the tool adds no value.

## What is true

Integration test mock boundary is fixed:
- **Only** `claudeCodeInfra` (the `claude -p` subprocess) is stubbed.
- Everything else — `SessionService`, `AgentService`, file system, DI resolution —
  runs on real implementations.

This boundary is established by architecture, not discovered by analysis. Calling
`ts_call_graph` returns call paths that look like candidates for mocking, which
contradicts the integration test design.

The "pure vs. agent-wrapping" classification step (present in the integration test
procedure) is what determines the stub boundary — `ts_call_graph` does not improve that
decision.

## Do

- Determine the stub boundary from the command's classification: pure (no agent call)
  or agent-wrapping (calls `agentService.start/resume`).
- Refer to the integration test procedure for the authoritative stub pattern.

## Don't

- Call `ts_call_graph` when planning or writing integration tests.
- Treat its output as a list of things to mock.

---

**Keywords:** ts_call_graph, integration test, mock boundary, claudeCodeInfra, stub strategy
