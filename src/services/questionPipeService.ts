import type { IQuestionPipeDomain } from '@src/domains/ports/questionPipe'
import type { ChoiceRequest, ChoiceResult } from '@src/types/questionPipe'

export class QuestionPipeService {
  constructor(private domain: IQuestionPipeDomain) {}

  pollRequest(): ChoiceRequest | null {
    return this.domain.pollRequest()
  }

  respond(result: ChoiceResult): void {
    this.domain.respond(result)
  }

  async askChoice(args: ChoiceRequest): Promise<ChoiceResult> {
    return this.domain.askChoice(args)
  }
}
