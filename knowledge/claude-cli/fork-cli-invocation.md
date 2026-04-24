# CLI Invocation Pattern for Forking a Session

**Type:** External

## Context

Applies when calling `claude -p` to fork an existing Claude Code session. The combination
of `--resume`, `--session-id`, and `--fork-session` flags has specific requirements
enforced inside Claude Code itself.

## What happened / What is true

```bash
claude -p "<prompt>" \
  --resume <original-claude-session-id> \
  --fork-session \
  --session-id <new-uuid>
```

- `--fork-session` tells Claude **not** to reuse the original session ID; the new session
  gets its own JSONL file.
- The new JSONL is written to:
  `~/.claude/projects/<encoded-new-workdir>/<new-uuid>.jsonl`
- `--session-id` + `--resume` together **require** `--fork-session` to be present;
  Claude Code validates this combination and will error without it.

## Do

- Always include `--fork-session` when combining `--resume` with `--session-id`.
- Pass the **original** Claude session ID to `--resume` and a freshly generated UUID
  to `--session-id`.

## Don't

- Don't omit `--fork-session` when supplying both `--resume` and `--session-id`.
- Don't reuse the original session ID as `--session-id`; that defeats the fork.

---

**Keywords:** fork, claude -p, --fork-session, --resume, --session-id, JSONL, CLI flags
