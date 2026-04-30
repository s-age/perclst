export type ChoiceRequest = {
  question: string
  choices: string[]
  session_id?: string
}

export type ChoiceResult =
  | { type: 'choice'; selected: string; index: number }
  | { type: 'other'; message: string }
  | { type: 'chat_needed'; session_id: string }
