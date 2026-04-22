import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const chatSchema = schema({
  sessionId: stringRule({ required: true })
})

export type ChatSessionInput = typeof chatSchema._output

export function parseChatSession(raw: unknown): ChatSessionInput {
  return safeParse(chatSchema, raw)
}
