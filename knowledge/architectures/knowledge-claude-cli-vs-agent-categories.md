# knowledge/claude-cli vs knowledge/agent Category Distinction

**Type:** Discovery

## Context

The `knowledge/` directory has two categories that both relate to Claude: `claude-cli/` and `agent/`. When filing a new entry, it is not always obvious which one to use.

## What happened / What is true

- `knowledge/claude-cli/` holds facts about the **Claude Code CLI binary itself** — its flags, output formats, and quirks (e.g. `--at` flag, fork invocation, jsonl output format, sanitize-path logic, rate-limit stderr routing).
- `knowledge/agent/` holds facts about **perclst agent behavior** — session semantics, tool usage patterns, pipeline coordination, retrieve-vs-survey boundaries.
- The categories were split because entries about the `claude` binary kept landing in `agent/`, which describes the perclst orchestration layer, not the underlying CLI.

## Do

- File an entry in `claude-cli/` if the fact would still be true even if perclst were replaced by a completely different wrapper.
- File an entry in `agent/` if the fact is about how perclst instructs, coordinates, or manages its sub-agents.

## Don't

- Don't conflate "claude" (the binary) with "agent" (the perclst abstraction over it).
- Don't put CLI flag behavior or output-format quirks in `agent/`.

---

**Keywords:** knowledge taxonomy, claude-cli, agent, category, classification, knowledge organization
