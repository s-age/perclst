# perclst UUID equals Claude Code session ID

**Type:** Discovery

## Context

When implementing any feature that needs to hand a perclst session off to `claude --resume`, it matters whether ID mapping is required.

## What happened / What is true

`ClaudeCodeInfra.buildArgs` passes `--session-id <perclst-uuid>` when launching `claude -p`. Claude Code stores that value as its own session ID. Therefore:

- The perclst session UUID and the Claude Code session ID are always identical
- `claude --resume <perclst-uuid>` works directly with no translation step

## Do

- Use the perclst session ID directly as the argument to `claude --resume`

## Don't

- Don't add an ID mapping layer or lookup — the IDs are the same by construction
- Don't assume a separate Claude Code session ID needs to be stored

---

**Keywords:** session-id, UUID, claude --resume, ClaudeCodeInfra, ID mapping, chat command
