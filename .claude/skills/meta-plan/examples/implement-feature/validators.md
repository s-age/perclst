# Validators Layer

## `src/validators/cli/chatSession.ts` (new)
**Template**: `src/validators/cli/showSession.ts`

**Interface** (exported):
```ts
export type ChatSessionInput = { sessionId: string }
export function parseChatSession(raw: unknown): ChatSessionInput
```

**Implementation sketch**:
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
