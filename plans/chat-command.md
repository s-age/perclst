# Plan: `perclst chat` command

## Goal

`perclst chat <session_id or session_name>` — look up session by name or ID, then hand off the terminal to `claude --resume <sessionId>`.

Pain solved: users don't need to remember the UUID to resume a Claude Code interactive session.

## Key Design Decisions

- **`spawnSync` in CLI layer directly** — this is a pure OS hand-off with no domain logic. Creating a `ChatInfra` wrapper would be over-engineering. Survey agent confirmed this is acceptable.
- **perclst UUID == Claude Code session ID** — `ClaudeCodeInfra.buildArgs` sets `--session-id <perclst-uuid>` on start, so `claude --resume <perclst-uuid>` works directly. No extra ID mapping needed.
- **`stdio: 'inherit'`** — terminal must be fully passed to the Claude Code process.
- **Not Found = `ValidationError`** — `SessionService.resolveId` throws `ValidationError` on not found; catch block prints to stderr + `process.exit(1)`.

## Files

### 1. `src/validators/cli/chatSession.ts` (new)

Minimal validator. Template: `src/validators/cli/showSession.ts`.

```ts
import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const chatSchema = schema({
  sessionId: stringRule({ required: true })
})

export type ChatSessionInput = typeof chatSchema._output

export function parseChatSession(raw: unknown): ChatSessionInput {
  return safeParse(chatSchema, raw)
}
```

### 2. `src/cli/commands/chat.ts` (new)

Template: `src/cli/commands/delete.ts` (simple resolve → side-effect → exit pattern).

```ts
import { spawnSync } from 'child_process'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import { ValidationError } from '@src/errors/validationError'
import { stderr } from '@src/utils/output'
import { parseChatSession } from '@src/validators/cli/chatSession'

export async function chatCommand(sessionId: string): Promise<void> {
  try {
    const input = parseChatSession({ sessionId })
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    spawnSync('claude', ['--resume', resolvedId], { stdio: 'inherit' })
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else {
      stderr.print('Failed to start chat session', error as Error)
    }
    process.exit(1)
  }
}
```

### 3. `src/cli/index.ts` (modify)

Add import and `.command('chat')` block in the same style as `delete` / `show`.

```ts
import { chatCommand } from './commands/chat'

program
  .command('chat')
  .description('Resume a session interactively in Claude Code')
  .argument('<session>', 'Session ID or name')
  .action((session: string) => chatCommand(session))
```

## Verification

After each file: `npm run format --fix && npm run lint:fix && npm run build`  
After index.ts: additionally verify `perclst chat --help` shows the command.

## Pipeline

See `pipelines/implement__chat-command.json`.
