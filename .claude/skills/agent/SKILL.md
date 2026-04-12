---
name: agent
description: Use this skill when working with agent execution, claude CLI invocation, stream-json parsing, model selection, or anything in src/lib/agent/. Covers ClaudeCLI, AgentExecutor, types, and the allowed-tools / permission-prompt flow.
paths:
  - src/lib/agent/**
---

# Agent Layer

## Files
- `src/lib/agent/claude-cli.ts` — `ClaudeCLI`: spawns `claude -p --output-format stream-json --verbose`, parses output
- `src/lib/agent/executor.ts` — `AgentExecutor`: orchestrates session load → prompt build → CLI call → turn save
- `src/lib/agent/claude.ts` — `ClaudeClient`: direct Anthropic SDK client (not used in current CLI flow)
- `src/lib/agent/types.ts` — `AgentConfig`, `AgentRequest`, `AgentResponse`, `ThinkingBlock`, `ToolUseRecord`, `Message`

## Execution Flow

```
AgentExecutor.execute(sessionId)
  → SessionManager.get()           // load session
  → ProcedureLoader.load()         // optional system prompt
  → ClaudeCLI.call(request)        // spawn claude process
      → runClaude(args, prompt)
      → parseStreamJson(stdout)     // extract content / thoughts / tool_history / usage
  → SessionManager.addTurn()       // save assistant turn
```

## CLI Args Built by ClaudeCLI

```
claude -p --output-format stream-json --verbose
  [--model <model>]
  [--allowedTools <tool1> <tool2> ...]
  --mcp-config <tmpfile>
  --permission-prompt-tool mcp__perclst__ask_permission
```

## Model Aliases
Resolved by the `claude` CLI itself: `sonnet`, `opus`, `haiku` expand to full model IDs.

## Notes
- `--verbose` is required when combining `--print` and `--output-format=stream-json`
- stderr is inherited (not piped) so permission prompts appear on the user's terminal
- MCP config is written to a temp file and deleted after the call
