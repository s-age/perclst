# CLI Layer

## `src/cli/commands/chat.ts` (new)
**Template**: `src/cli/commands/delete.ts`

**Interface** (exported):
```ts
export async function chatCommand(sessionId: string): Promise<void>
```

**Implementation sketch**:
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

## `src/cli/index.ts` (modify)
**Change**: add import and `.command('chat')` block after the `delete` command

```ts
import { chatCommand } from './commands/chat'

program
  .command('chat')
  .description('Resume a session interactively in Claude Code')
  .argument('<session>', 'Session ID or name')
  .action((session: string) => chatCommand(session))
```
