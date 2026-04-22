# Tutorial

This tutorial walks through the core perclst workflow: starting a session, continuing it, inspecting its history, and branching from any point.

## 1. Start a session

```bash
perclst start 'say hi' --name tutorial
```

`--name tutorial` gives the session a human-readable alias so you can refer to it by name instead of its UUID in all subsequent commands.

You'll see the agent's response followed by a session ID line.

## 2. Resume the session

```bash
perclst resume tutorial 'Summarize README.md in one line'
```

`resume` continues the conversation — the agent receives the full prior history as context.

## 3. List all sessions

```bash
perclst list
```

Displays a table of all sessions with their status, name, ID, working directory, and procedure. Use this to confirm the session was created and to find IDs when you need them.

## 4. Inspect the session

### Full history

```bash
perclst show tutorial
```

Shows session metadata (ID, name, status, working directory) and a table of every turn.

### First N turns

```bash
perclst show --head 1 tutorial
```

Shows only the first turn — useful for reviewing how the session started.

### Last N turns

```bash
perclst show --tail 1 tutorial
```

Shows only the most recent turn. This is also the starting point before a `rewind` — the tail tells you which turn indices are available to rewind to.

## 5. Analyze the session

```bash
perclst analyze tutorial
```

Prints a structured summary: turn breakdown (user instructions, thinking, tool calls, assistant responses), all tool uses with pass/fail status, and token counts.

## 6. Fork the session

```bash
perclst fork tutorial 'try a different approach' --name tutorial-alt
```

Creates a new independent session that starts from the same history as `tutorial`, then immediately runs the given prompt in that new session. **The original `tutorial` session is unchanged.**

```
Session forked: a1b2c3d4-...
To resume: perclst resume tutorial-alt "Go deeper on the architecture section"
```

Use `fork` when you want to explore an alternative direction without losing your current thread.

## 7. Rewind the session

### List rewind points

```bash
perclst rewind --list tutorial
```

Lists all assistant turns with their index and a preview of the content. Only assistant (model) turns are valid rewind targets.

```
  0: Hi! How can I help you today?…
  1: This repository is a CLI tool for managing Claude Code sub-agents…
```

Index `0` is the most recent assistant turn. Index `1` is the one before it, and so on.

### Rewind to a specific turn

```bash
perclst rewind tutorial 1
```

Creates a new session containing the conversation history up to and including turn 1 — effectively discarding the most recent assistant response. **The original `tutorial` session is unchanged.**

```
Rewind session created: e5f6g7h8-...
To continue: perclst resume e5f6g7h8-... "Try a different explanation this time"
```

Use `rewind` when a response went in the wrong direction and you want to retry from just before it.

`resume` does not have a `--name` option. To give the rewind session a name after resuming, use `rename`:

```bash
perclst rename e5f6g7h8-... tutorial-rewinded
```

> **Note**: `rewind tutorial 0` branches from the latest turn without discarding anything — equivalent to `fork` without a prompt.

## 8. Chat interactively

```bash
perclst chat tutorial
```

Opens the session in Claude Code's interactive mode (`claude --resume`). Use this when you want to continue the conversation hands-on rather than through one-shot `resume` commands.

## 9. Clean up

Preview what would be deleted before committing:

```bash
perclst sweep --like 'tutorial' --dry-run
```

This matches all sessions whose name contains `tutorial` — including `tutorial-alt` from the fork and the rewind session created earlier.

Once you're satisfied with the list, delete them. `--to` is omitted here (open-ended range), so `--force` is required to confirm:

```bash
perclst sweep --like 'tutorial' --force
```
