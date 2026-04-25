# Domain Owns Subprocess Arg-Building Logic, Not the CLI Layer

**Type:** Discovery

## Context

When a CLI handler needs to construct subprocess arguments (e.g. `claude` flags) based
on domain state, the conditional logic belongs in the **domain**, not the CLI handler.
The CLI layer is a presentation layer; it must not contain business rules.

## What is true

Layering responsibilities:

| Layer          | Owns                                                        |
|----------------|-------------------------------------------------------------|
| CLI            | Input validation, DI resolution, error catching, output     |
| Domain         | Business rules, conditional logic based on domain state     |
| Infrastructure | Raw I/O (exec, fs, network)                                 |
| Repository     | Semantic wrappers around infrastructure                     |

**Example:** The decision "should we fork or resume?" is driven by
`session.rewind_source_claude_session_id` — a domain field. The domain owns the
semantics of that field, so it owns the decision.

```ts
// WRONG — conditional domain logic in CLI handler
const claudeArgs = session.rewind_source_claude_session_id
  ? ['--resume', sourceId, '--fork-session', '--session-id', sessionId]
  : ['--resume', sessionId]

// RIGHT — domain method
class AgentDomain {
  buildChatArgs(session: Session): string[] {
    if (session.rewind_source_claude_session_id) {
      return ['--resume', sourceId, '--fork-session', '--session-id', sessionId]
    }
    return ['--resume', sessionId]
  }
}

// CLI handler stays thin
await agentService.chat(resolvedId)
```

## Do

- Put arg-building methods (`buildChatArgs`, etc.) in the relevant domain class.
- Keep CLI handlers as: validate → resolve ID → call service → display output.
- Test arg-building logic in domain unit tests, not CLI tests.

## Don't

- Don't write `if (session.someField)` in a CLI handler to decide how to invoke a
  subprocess.
- Don't test domain logic through CLI handler tests.

---

**Keywords:** domain, CLI, command-args, layering, business-logic, chat, AgentDomain, subprocess, thin-handler
