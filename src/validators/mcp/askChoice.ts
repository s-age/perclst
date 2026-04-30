import { z } from 'zod'

export const askChoiceParams = {
  question: z.string().min(1).describe('The question to present to the user'),
  choices: z.array(z.string().min(1)).min(2).describe('The available choices (minimum 2)')
}
