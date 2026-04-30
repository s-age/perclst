# ask_choice MCP Tool Design

**Type:** Discovery

## Context

Applies when implementing or extending the `ask_choice` MCP tool, which presents
multiple-choice questions to the user from within headless agents (`claude -p`).
Relevant for IPC design, TUI layout, and session ID propagation.

## What is true

Returns three possible result shapes:
- `{ type: 'choice', selected, index }` — user selected a provided option
- `{ type: 'other', message }` — user typed free-form text (TUI inline mode only)
- `{ type: 'chat_needed', session_id }` — user wants to answer interactively; agent
  should output "Run: `claude --resume <session_id>`" and stop

Mode-specific behavior for the free-form ("その他") option:

| Context | Behavior |
|---------|----------|
| TUI (`PERCLST_PERMISSION_PIPE` set) | Switches panel to inline input; returns `{ type: 'other', message }` |
| TTY fallback (no TUI) | Returns `{ type: 'chat_needed', session_id }` immediately |
| No TTY (pure headless) | Returns `{ type: 'chat_needed', session_id: '' }` |

IPC uses `PERCLST_PERMISSION_PIPE` as the path prefix with different extensions:
- Permission: `.req` / `.res`
- Choice: `.qreq` / `.qres`

`PERCLST_SESSION_ID` is set on the claude subprocess in `ClaudeCodeInfra.runClaude()`
via `opts.sessionId`, sourced from `action.sessionId` in `ClaudeCodeRepository.dispatch()`.
The MCP tool reads this to populate `session_id` in `chat_needed` results.

`ChoicePanel` and `PermissionPanel` share the same 8-row (`PERM_PANEL_ROWS`) bottom area.
`isPrompting` is `true` when either `permRequest` or `choiceRequest` is set.

## Do

- Use `ask_choice` (not `ask_question`) — the name makes the multi-select mechanic explicit.
- Propagate `PERCLST_SESSION_ID` into the subprocess environment before the MCP tool is called.
- Gate scroll-pause and abort on `isPrompting = !!permRequest || !!choiceRequest`.

## Don't

- Don't introduce a new env var for choice IPC — reuse `PERCLST_PERMISSION_PIPE` with `.qreq`/`.qres`.
- Don't assume `session_id` is always populated in `chat_needed`; it is `''` when there is no TTY.

---

**Keywords:** ask_choice, mcp tool, IPC, permission pipe, PERCLST_PERMISSION_PIPE, choice panel, session_id, PERCLST_SESSION_ID, chat_needed, TUI, headless, ask_permission
