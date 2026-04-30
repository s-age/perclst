# ask_choice MCP Tool — Design Decisions

## What was built

`ask_choice` MCP tool that presents multiple-choice questions to the user from within headless agents (`claude -p`).

## Return types

- `{ type: 'choice', selected, index }` — user selected one of the provided choices
- `{ type: 'other', message }` — user typed free-form text (TUI inline mode only)
- `{ type: 'chat_needed', session_id }` — user wants to answer interactively; agent should output "Run: claude --resume <session_id>" and stop

## Mode-specific behavior

| Context | "その他" behavior |
|---------|-----------------|
| TUI (PERCLST_PERMISSION_PIPE set) | Switches bottom panel to inline text input; returns `{ type: 'other', message }` |
| TTY fallback (no TUI) | Returns `{ type: 'chat_needed', session_id }` immediately |
| No TTY (pure headless) | Returns `{ type: 'chat_needed', session_id: '' }` |

## IPC: shared pipe prefix, different extensions

Both permission and choice requests share `PERCLST_PERMISSION_PIPE` as the path prefix:
- Permission: `.req` / `.res`
- Choice: `.qreq` / `.qres`

No new env var needed for pipe routing.

## Session ID propagation

`PERCLST_SESSION_ID` is now set on the claude subprocess environment in `ClaudeCodeInfra.runClaude()` via the `opts.sessionId` parameter. Source: `action.sessionId` in `ClaudeCodeRepository.dispatch()`.

The MCP tool reads `process.env.PERCLST_SESSION_ID` to populate `session_id` in the `chat_needed` result.

## TUI layout: shared bottom panel

`ChoicePanel` and `PermissionPanel` share the same 8-row (`PERM_PANEL_ROWS`) bottom area. When a choice request is pending, `ChoicePanel` is shown; otherwise `PermissionPanel`. Both abort and scroll-pause are gated on `isPrompting = !!permRequest || !!choiceRequest`.

## Naming rationale

`ask_choice` over `ask_question`: makes the multi-select mechanic explicit; contrasts cleanly with `ask_permission` (binary Y/N).
