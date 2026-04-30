import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { QuestionPipeService } from '@src/services/questionPipeService'

export async function executeAskChoice(args: {
  question: string
  choices: string[]
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<QuestionPipeService>(TOKENS.QuestionPipeService)
  const result = await service.askChoice({
    question: args.question,
    choices: args.choices,
    session_id: process.env.PERCLST_SESSION_ID
  })
  return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
}
