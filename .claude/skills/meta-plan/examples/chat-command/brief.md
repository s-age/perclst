# Goal

`perclst chat <session>` looks up a session by name or ID and hands the terminal off to
`claude --resume <sessionId>`. Users no longer need to remember the UUID to resume an
interactive Claude Code session.

# Key Design Decisions

- **`spawnSync` directly in CLI layer** — pure OS hand-off with no domain logic; a service wrapper would be over-engineering.
- **perclst UUID == Claude Code session ID** — `ClaudeCodeInfra.buildArgs` already sets `--session-id <perclst-uuid>` on start, so `claude --resume <perclst-uuid>` works directly. No extra mapping needed.
- **`stdio: 'inherit'`** — terminal must be fully passed to the child process.
- **`ValidationError` on not found** — `SessionService.resolveId` throws `ValidationError`; caught in CLI with `process.exit(1)`.
