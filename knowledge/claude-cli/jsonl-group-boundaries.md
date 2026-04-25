# Claude Code JSONL: Group Boundary Rules

**Type:** External

## Context

When parsing Claude Code JSONL to build a turn-based view (e.g. for display or analysis),
consecutive assistant entries must be grouped into a single logical turn. Knowing precisely
what triggers a group flush and what entries to skip is essential for correct rendering.

## What happened / What is true

Group boundary rules:

- A **`user` entry** is the separator between groups. Any `user` entry flushes the current
  assistant group and starts a new one.
- A `user` entry that contains `tool_result` blocks is **excluded from display** but still
  acts as a group flush trigger — don't skip it entirely in the loop.
- Entries with roles/types other than `assistant` or `user` (e.g. `permission-mode`,
  `last-prompt`, `attachment`, `system`) are **ignored** — they neither flush nor join a
  group.

Typical logical turn in the JSONL stream:

```
assistant  [thinking]    ─┐
assistant  [text]         ├─ one logical turn (one group)
assistant  [tool_use]    ─┘
user       [tool_result] ← flushes group; excluded from display
```

## Do

- Flush the current assistant group on every `user` entry, whether or not it contains
  `tool_result`
- Filter `tool_result`-only user entries out of the rendered turn list after grouping
- Ignore non-`assistant`/`user` entry types during grouping

## Don't

- Don't skip `tool_result` user entries before they can trigger a group flush
- Don't treat non-assistant/user entry types as group boundaries

---

**Keywords:** jsonl, group boundaries, user entry, tool_result, flush, turn counting, permission-mode, last-prompt, attachment, buildTurns, consecutive assistant
