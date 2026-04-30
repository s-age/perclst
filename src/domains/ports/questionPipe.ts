import type { ChoiceRequest, ChoiceResult } from '@src/types/questionPipe'

export type IQuestionPipeDomain = {
  pollRequest(): ChoiceRequest | null
  respond(result: ChoiceResult): void
  askChoice(args: ChoiceRequest): Promise<ChoiceResult>
  consumeChatSignal(sessionId: string): boolean
}
