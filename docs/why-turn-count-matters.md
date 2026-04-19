# Why Turn Count Matters: The Case for Local Session History

> This document explains why local JSON session history — rather than a vendor UI — is a prerequisite for iterating on agent behavior. The examples below are drawn from real Storybook story generation work.

## The Unit of Agent Work

Every agent invocation follows this structure:

```
UserInstruction + (ToolCall + ToolResponse) × N + AssistantResponse
```

`N` — the number of tool round-trips — is the most actionable metric for agent efficiency. Fewer turns means less latency, lower cost, and a simpler execution path. When `N` is high, something is wrong with the procedure, the environment, or both.

Turn count is only meaningful if you can measure it. That requires access to the raw session history — not a summarized chat log.

## A Concrete Example: 34 Turns vs. 10 Turns

### First run (34 turns) — January 8, 2026

The task was generating a Storybook story file for a Button component. The session JSON showed 34 tool round-trips. Broken down by cause:

| Cause | Extra turns |
|---|---|
| `mkdir __stories__/` (unnecessary — directory already existed) | +2 |
| Redundant file reads (same files read multiple times) | +4 |
| `build-storybook` during validation — generated `storybook-static/` artifacts | +12 |
| Retries triggered by artifact interference | +6 |

The dominant problem: the procedure included a "Verify Storybook renders" step that ran `build-storybook`. The generated `storybook-static/` directory then appeared to the agent as unexpected output during code validation, triggering a retry loop.

### Procedure fix (same day)

Two targeted changes:

1. Removed the `build-storybook` verification step from the procedure
2. Moved `__stories__/` directory creation to the orchestration script and explicitly prohibited agents from creating it

### Second run (10 turns) — January 9, 2026

After the fix, the happy path reached the target: 8 turns of actual work plus 2 tool responses for handoff. The remaining variation in later runs (+2–4 turns) came from runtime execution errors, not procedural flaws — a meaningful distinction. Procedural errors are design problems; execution errors are expected noise.

## What Makes This Analysis Possible

The session JSON contains:

- Every tool call and its result
- Error outputs and retry traces
- Token usage per turn

Without this, the 34-turn run looks like "the agent took a while." With it, you can see exactly which step burned 12 turns and why.

Vendor LLM interfaces don't expose this. Session histories, tool invocations, and error outputs are hidden behind summarized views. You can observe that an agent is slow or expensive, but you cannot diagnose why — and you cannot verify that a procedure change actually helped.

## The Feedback Loop

```
Session JSON → measure turn count → identify worst offender → fix procedure → re-run → measure again
```

This loop is only closed if the raw session data is local and inspectable. perclst stores every session as a JSON file in `~/.perclst/sessions/`, making the full turn breakdown available at any time via `perclst show <session-id>` or direct file inspection.

The `perclst analyze` command extracts turn counts, tool usage frequency, and token stats from Claude Code's own `.jsonl` history — without requiring any changes to how Claude Code operates internally.

## Implication for Procedure Design

Turn count as a KPI forces precision in procedure writing. Every step either earns its turns or it doesn't. Steps that can be moved to orchestration scripts (directory creation, artifact cleanup) should be — they add turns without adding agent reasoning value. Verification steps that produce side effects are particularly dangerous because they can trigger retries that multiply the cost of the original mistake.

The trade-off is not always obvious. A validation step that adds 2 turns is worth keeping if it catches a class of errors that would otherwise surface as a 6-turn retry loop — but only if the data confirms that. Without turn-level visibility, the instinct is to add more checks "just in case." With it, each check has to justify its cost.

The goal is not to minimize turns at any cost. It is to ensure that every turn corresponds to a decision the agent needed to make.
