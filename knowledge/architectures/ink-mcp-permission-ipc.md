# Ink TUI + MCP Server: File-Based IPC for Permission Prompts

**Type:** Discovery

## Context

When an Ink TUI wraps a `claude` subprocess that itself spawns an MCP server,
the MCP server cannot write permission prompts directly to the terminal.
Ink owns stdin in raw mode and re-renders every ~80 ms, which overwrites any
output that bypasses Ink's render cycle. A different IPC channel is required.

## What happened / What is true

The MCP server originally wrote permission prompts to `/dev/tty` directly.
Ink's periodic re-renders erased these prompts before the user could respond,
and the raw-mode stdin conflict caused further corruption.

The solution is a **file-based IPC** protocol using two temp files:

```
perclst (main) ──env var──▶ claude ──env var──▶ MCP server
     ▲                                                ▼
     │ poll .req (100 ms)           write .req file   │
     │ write .res file                                │
     └──────────── /tmp/perclst-perm-{pid}.req / .res ┘
```

1. Before TUI start, `run.ts` sets `process.env.PERCLST_PERMISSION_PIPE`.
2. `claude` is spawned with `{ ...process.env }`, inheriting the variable
   through to the MCP server automatically.
3. The MCP server's `askPermission` detects the env var, writes a `.req` file,
   then polls for a `.res` file (timeout: 60 s → auto-deny).
4. `PipelineRunner` polls for `.req` at 100 ms; when found, it surfaces the
   prompt in Ink's bottom panel and captures `y` / `N` via `useInput`, then
   writes `.res`.

The layout reserves a fixed bottom panel for these prompts:

```
┌──────────────────────────────────┐
│ Workflow (40%) │  Output (60%)   │  ← termRows − 8 rows
├──────────────────────────────────┤
│ Permission prompt (8 rows)       │  ← PERM_PANEL_ROWS = 8
└──────────────────────────────────┘
```

## Do

- Propagate the IPC path via an environment variable so intermediate processes
  (`claude`) pass it to grandchild processes (MCP server) for free.
- Poll for the request file from the Ink side (not the MCP side) so all
  terminal I/O stays inside Ink's render loop.
- Keep `/dev/tty` direct-write as a fallback when the env var is absent
  (non-TUI invocations still work).
- Set a timeout (e.g. 60 s) on the MCP side and auto-deny if no response
  arrives.

## Don't

- Don't let the MCP server write directly to `/dev/tty` when Ink is active —
  Ink will overwrite the output on the next render cycle.
- Don't use a shared in-memory structure or signal for cross-process
  communication between Ink and an MCP server; they run in separate processes.
- Don't forget to clean up the temp files after the pipeline finishes.

---

**Keywords:** ink, tui, mcp, permission prompt, ipc, file-based ipc, env var, raw mode, stdin, polling, subprocess, pipeline runner, /dev/tty
