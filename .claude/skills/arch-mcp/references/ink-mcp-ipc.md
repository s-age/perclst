When an Ink TUI wraps a `claude` subprocess that spawns an MCP server, permission prompts cannot go to the terminal directly — Ink owns stdin in raw mode and overwrites anything that bypasses its render cycle. Use the file-based IPC protocol below.

## Protocol overview

```
perclst (TUI) ──env var──▶ claude ──env var──▶ MCP server
     ▲                                               ▼
     │ poll .req (100 ms)          write .req file   │
     │ write .res file                               │
     └────── /tmp/perclst-perm-{pid}.req / .res ─────┘
```

## Setup steps

1. **Set the env var before TUI start** — in `run.ts`, set `process.env.PERCLST_PERMISSION_PIPE` to the temp file prefix (e.g. `/tmp/perclst-perm-<pid>`).

2. **Spawn `claude` with inherited env** — pass `{ env: { ...process.env } }` so the variable propagates automatically through `claude` to the MCP server without explicit forwarding.

3. **MCP server: write `.req`, poll for `.res`** — in `askPermission()`, detect `PERCLST_PERMISSION_PIPE`; write the prompt JSON to `<prefix>.req`; poll for `<prefix>.res` every 100 ms with a 60 s timeout; auto-deny on timeout.

4. **TUI: poll for `.req`, surface prompt, write `.res`** — in `PipelineRunner`, poll for `<prefix>.req` at 100 ms. When found, render the prompt in a fixed 8-row bottom panel via Ink's `useInput`. Write `y` or `N` to `<prefix>.res`.

5. **Clean up** — delete both temp files after the pipeline finishes.

## Ink layout

Reserve a fixed bottom panel so the prompt is never overwritten by workflow output:

```
┌──────────────────────────────────┐
│ Workflow (40%) │  Output (60%)   │  ← termRows − 8 rows
├──────────────────────────────────┤
│ Permission prompt (8 rows)       │  ← PERM_PANEL_ROWS = 8
└──────────────────────────────────┘
```

## Rules

- Poll from the **TUI side**, not the MCP side — all terminal I/O must stay inside Ink's render loop.
- Keep `/dev/tty` direct-write as a fallback when `PERCLST_PERMISSION_PIPE` is absent (non-TUI invocations must still work).
- Do not use in-memory or signal-based IPC — MCP server and TUI run in separate processes.
- Delete both temp files after the pipeline finishes; stale `.req` files trigger spurious prompts on the next run.
