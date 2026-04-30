import type { IQuestionPipeDomain } from '@src/domains/ports/questionPipe'
import type { IQuestionPipeRepository } from '@src/repositories/ports/questionPipe'
import type { ChoiceRequest, ChoiceResult } from '@src/types/questionPipe'

export class QuestionPipeDomain implements IQuestionPipeDomain {
  constructor(private repo: IQuestionPipeRepository) {}

  pollRequest(): ChoiceRequest | null {
    return this.repo.pollRequest()
  }

  respond(result: ChoiceResult): void {
    this.repo.respond(result)
  }

  async askChoice(args: ChoiceRequest): Promise<ChoiceResult> {
    return this.repo.askChoice(args)
  }
}
