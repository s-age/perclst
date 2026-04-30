# PTY Buffer Leak When Spawning Interactive Claude from MCP Server

**Type:** Problem

## Context

Affects any code path where the perclst MCP server (running inside `claude -p`) tries
to spawn an interactive Claude session directly. Relevant when implementing the
`chat_needed` handoff behavior.

## What happened

When the MCP server spawned an interactive Claude session via
`script -q /dev/null claude --resume <id> </dev/tty`, leftover TTY input (typically
the Enter keypress from the user's menu selection) leaked into the new session, causing
a phantom empty prompt submission.

Draining the buffer with `O_NONBLOCK` reads before spawning did not reliably fix the
issue — the `script` PTY wrapper relays buffered input regardless.

## Do

- Handle the interactive spawn in the **CLI process** (start/resume commands), not in
  the MCP server.
- Have the MCP server write a signal file (`/tmp/perclst-chat-<sessionId>`) and return
  `chat_needed` through normal MCP response flow.
- After `claude -p` fully exits (terminal is clean), detect the signal file in the CLI
  command and spawn with `spawnSync('claude', args, { stdio: 'inherit' })`.
- Use `{ stdio: 'inherit' }` — it inherits the terminal directly without a PTY wrapper.

## Don't

- Don't spawn interactive Claude sessions from inside the MCP server subprocess.
- Don't use `script -q /dev/null ... </dev/tty` (`spawnWithTty`) for Claude resume —
  it allocates a PTY slave and causes buffered input to leak.
- Don't attempt `O_NONBLOCK` buffer draining as a workaround — unreliable with `script`.

---

**Keywords:** PTY, buffer leak, tty, script wrapper, spawnWithTty, signal file, chat_needed, interactive spawn, stdio inherit, MCP server, spawnSync
